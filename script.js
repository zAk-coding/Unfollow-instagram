const API_BASE_URL = 'https://penn-eleven-casa-programs.trycloudflare.com';


// ===================================================================

// Não remova esta chave.
// O projeto depende dela para funcionar.

let API_KEY = 'zAk-aB3xK9mN2pQr5sT8vW1yZ4c';

// ====================================================================

try {
    if (typeof CONFIG !== 'undefined' && CONFIG.API_KEY) {
        API_KEY = CONFIG.API_KEY.trim();
    }
} catch (e) {}
let isApiKeyValid = false;
let isApiKeyVerified = false;
let apiKeyAttempts = 0;
const MAX_ATTEMPTS = 5;
let isKeyBlocked = false;
let blockTimer = null;
function showApiKeyRequired() {
    const existing = document.querySelector('.api-key-overlay');
    if (existing) return;
    const overlay = document.createElement('div');
    overlay.className = 'api-key-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.85);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        backdrop-filter: blur(10px);
    `;
    overlay.innerHTML = `
        <div style="
            background: var(--bg-container, #1a1a1a);
            padding: 40px;
            border-radius: 20px;
            max-width: 450px;
            width: 90%;
            text-align: center;
            border: 1px solid var(--border-color, #2a2a2a);
            box-shadow: 0 30px 80px rgba(0,0,0,0.5);
        ">
            <div style="font-size: 48px; margin-bottom: 16px;">🔐</div>
            <h2 style="color: var(--text-primary, #f0f0f0); margin-bottom: 8px;">API Key Required</h2>
            <p style="color: var(--text-secondary, #6b6b6b); margin-bottom: 20px; font-size: 14px;">
                Configure your API key in <strong>config.js</strong>
            </p>
            <div style="background: var(--bg-card, #121212); border-radius: 8px; padding: 14px; margin-bottom: 16px; border: 1px solid var(--border-color, #2a2a2a);">
                <code style="color: var(--text-primary, #f0f0f0); font-size: 12px; word-break: break-all;">
                    const CONFIG = { API_KEY: 'YOUR_KEY_HERE' };
                </code>
            </div>
            <button onclick="location.reload()" style="
                padding: 12px 32px;
                background: linear-gradient(135deg, #dc2626, #ea580c);
                color: white;
                border: none;
                border-radius: 10px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
            ">
                🔄 Try Again
            </button>
        </div>
    `;
    document.body.appendChild(overlay);
}
// ============================================
// FUNÇÃO PARA VERIFICAR API KEY (ATUALIZADA)
// ============================================
async function verifyApiKey() {
    if (isKeyBlocked) {
        // Verifica se o bloqueio expirou
        const now = Date.now();
        if (blockTimer && blockTimer > now) {
            const remaining = Math.ceil((blockTimer - now) / 1000);
            showError(`🔒 Key blocked. Please wait ${remaining} seconds.`);
            return false;
        } else {
            isKeyBlocked = false;
            blockTimer = null;
        }
    }

    if (isApiKeyVerified) return isApiKeyValid;
    
    if (!API_KEY) {
        showError('❌ API Key not configured. Edit config.js file.');
        showApiKeyRequired();
        return false;
    }
    
    if (!API_BASE_URL) {
        showError('❌ Server URL not configured.');
        return false;
    }

    if (API_KEY.length < 8) {
        showError('❌ Key too short.');
        return false;
    }

    if (!/^[a-zA-Z0-9\-_]+$/.test(API_KEY)) {
        showError('❌ Invalid characters in key.');
        return false;
    }
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const response = await fetch(`${API_BASE_URL}/api/verify_key`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY
            },
            body: JSON.stringify({ 
                api_key: API_KEY,
                timestamp: Date.now()
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        let data;
        try {
            data = await response.json();
        } catch (e) {
            throw new Error('Invalid server response');
        }
        
        isApiKeyVerified = true;
        
        // ============================================
        // TRATAMENTO DE RATE LIMIT
        // ============================================
        if (response.status === 429) {
            const errorMsg = data.error || 'Too many attempts. Please wait.';
            const remaining = data.remaining_seconds || 20;
            
            isKeyBlocked = true;
            blockTimer = Date.now() + (remaining * 1000);
            
            showError(`🔒 ${errorMsg}`);
            showBlockedOverlay(remaining);
            
            isApiKeyValid = false;
            return false;
        }
        
        if (response.status === 200 && data.success) {
            isApiKeyValid = true;
            apiKeyAttempts = 0;
            isKeyBlocked = false;
            blockTimer = null;
            return true;
        } else {
            isApiKeyValid = false;
            apiKeyAttempts++;
            
            const attemptsRemaining = data.attempts_remaining || (MAX_ATTEMPTS - apiKeyAttempts);
            
            if (attemptsRemaining <= 0) {
                // Bloqueado por 20 segundos
                isKeyBlocked = true;
                blockTimer = Date.now() + 20000;
                showError('🔒 Too many attempts. Blocked for 20 seconds.');
                return false;
            }
            
            showError(`❌ Invalid key. ${attemptsRemaining} attempts remaining.`);
            return false;
        }
    } catch (error) {
        isApiKeyValid = false;
        isApiKeyVerified = true;
        
        if (error.name === 'AbortError') {
            showError('❌ Timeout - Server not responding.');
        } else if (error.message === 'Invalid server response') {
            showError('❌ Invalid server response.');
        } else {
            showError(`❌ Error: ${error.message}`);
        }
        return false;
    }
}
function showBlockedOverlay(seconds) {
    const existing = document.querySelector('.blocked-overlay');
    if (existing) existing.remove();
    
    const overlay = document.createElement('div');
    overlay.className = 'blocked-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.9);
        backdrop-filter: blur(10px);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 99999;
    `;
    
    overlay.innerHTML = `
        <div style="
            background: var(--bg-container, #1a1a1a);
            padding: 40px;
            border-radius: 20px;
            max-width: 450px;
            width: 90%;
            text-align: center;
            border: 2px solid #ef4444;
            box-shadow: 0 30px 80px rgba(0,0,0,0.5);
        ">
            <div style="font-size: 64px; margin-bottom: 16px;">⛔</div>
            <h2 style="color: #ef4444; font-size: 24px; margin-bottom: 8px;">Rate Limit Exceeded</h2>
            <p style="color: var(--text-secondary, #6b6b6b); margin-bottom: 20px; font-size: 14px; line-height: 1.6;">
                Too many invalid attempts.<br>
                Please wait <strong id="blockCountdown" style="color: #f97316;">${seconds}</strong> seconds.
            </p>
            <div style="background: var(--bg-card, #121212); border-radius: 8px; padding: 14px; margin-bottom: 16px; border: 1px solid var(--border-color, #2a2a2a); text-align: left;">
                <code style="color: var(--text-primary, #f0f0f0); font-size: 12px; word-break: break-all;">
                    Your IP has been temporarily blocked
                </code>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Contador regressivo
    let remaining = seconds;
    const countdown = setInterval(() => {
        remaining--;
        const el = document.getElementById('blockCountdown');
        if (el) el.textContent = remaining;
        
        if (remaining <= 0) {
            clearInterval(countdown);
            if (overlay.parentNode) {
                overlay.remove();
            }
            isKeyBlocked = false;
            blockTimer = null;
        }
    }, 1000);
    
    // Auto-remove após o tempo
    setTimeout(() => {
        if (overlay.parentNode) {
            overlay.remove();
        }
        isKeyBlocked = false;
        blockTimer = null;
    }, seconds * 1000);
}
async function apiRequest(endpoint, options = {}) {
    if (!isApiKeyValid) {
        const verified = await verifyApiKey();
        if (!verified) {
            throw new Error('Invalid API Key');
        }
    }
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
        ...options.headers
    };
    const response = await fetch(url, {
        ...options,
        headers
    });
    if (response.status === 401 || response.status === 403) {
        isApiKeyValid = false;
        isApiKeyVerified = false;
        showError(' Invalid or blocked API Key.');
        throw new Error('Invalid API Key');
    }
    if (response.status === 429) {
        showError('⏳ Too many requests. Please wait.');
        throw new Error('Rate limit exceeded');
    }
    return response;
}
const themeToggle = document.getElementById('themeToggle');
const body = document.body;
const savedTheme = localStorage.getItem('theme') || 'dark';
if (savedTheme === 'light') {
    body.classList.add('light-mode');
    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
} else {
    themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
}
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        body.classList.toggle('light-mode');
        const isLight = body.classList.contains('light-mode');
        themeToggle.innerHTML = isLight ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
    });
}
const searchBtn = document.getElementById('searchBtn');
const usernameInput = document.getElementById('usernameInput');
const progressContainer = document.getElementById('progressContainer');
const resultsSection = document.getElementById('resultsSection');
const userList = document.getElementById('userList');
const statsGrid = document.getElementById('statsGrid');
const errorMessage = document.getElementById('errorMessage');
const emptyState = document.getElementById('emptyState');
const progressFill = document.getElementById('progressFill');
const statusText = document.getElementById('statusText');
const progressLabel = document.getElementById('progressLabel');
const progressPercentage = document.getElementById('progressPercentage');
const totalFollowing = document.getElementById('totalFollowing');
const totalFollowers = document.getElementById('totalFollowers');
const totalUnfollowers = document.getElementById('totalUnfollowers');
const resultCount = document.getElementById('resultCount');
const estimatedTime = document.getElementById('estimatedTime');
const timeValue = document.getElementById('timeValue');
const largeProfileWarning = document.getElementById('largeProfileWarning');
const filterWrapper = document.getElementById('filterWrapper');
const filterInput = document.getElementById('filterInput');
const clearFilterBtn = document.getElementById('clearFilterBtn');
const modeKnown = document.getElementById('modeKnown');
const modeAll = document.getElementById('modeAll');
let itemCounter = 0;
let totalUnfollowersReal = 0;
let currentUsername = '';
let isAnalyzing = false;
let abortController = null;
let totalFollowersCount = 0;
let currentTaskId = null;
let isCanceling = false;
let totalItemsCount = 0;
let extractionMode = 'known';
let timerInterval = null;
let remainingTime = 0;
let timerStarted = false;
let isTimeUp = false;
let timerEnded = false;
let currentStage = '';
function selectMode(mode) {
    extractionMode = mode;
    if (modeKnown) modeKnown.classList.remove('active');
    if (modeAll) modeAll.classList.remove('active');
    if (mode === 'known' && modeKnown) {
        modeKnown.classList.add('active');
    } else if (mode === 'all' && modeAll) {
        modeAll.classList.add('active');
    }
    console.log(`📌 Mode selected: ${mode === 'known' ? 'Known only' : 'All'}`);
}
function enableButton() {
    if (searchBtn) {
        searchBtn.disabled = false;
        searchBtn.innerHTML = '<i class="fas fa-eye"></i> View Unfollow';
        searchBtn.classList.remove('stop');
        searchBtn.style.opacity = '1';
        searchBtn.style.cursor = 'pointer';
        searchBtn.style.pointerEvents = 'auto';
    }
}
function disableButton() {
    if (searchBtn) {
        searchBtn.disabled = false;
        searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cancel';
        searchBtn.classList.add('stop');
        searchBtn.style.opacity = '1';
        searchBtn.style.cursor = 'pointer';
        searchBtn.style.pointerEvents = 'auto';
    }
}
const STATUS_MESSAGES = {
    analyzing: 'Analyzing profile...',
    checking: 'Checking who unfollowed...',
    complete: 'Analysis completed!',
    canceled: 'Aborted by user.'
};
function setStatus(text, shimmer = true) {
    if (statusText) {
        statusText.textContent = text;
        if (shimmer) {
            statusText.style.animation = 'shimmer 2.8s ease-in-out infinite';
            statusText.style.webkitTextFillColor = 'transparent';
            statusText.style.backgroundClip = 'text';
        } else {
            statusText.style.animation = 'none';
            statusText.style.background = 'none';
            statusText.style.webkitTextFillColor = 'var(--text-secondary)';
            statusText.style.backgroundClip = 'unset';
        }
    }
}
function calculateStageTime(stage, value) {
    let seconds = 0;
    let isLargeAccount = false;
    switch(stage) {
        case 'verify':
            seconds = 30;
            isLargeAccount = false;
            break;
        case 'followers':
            if (value <= 100) {
                seconds = 30;
            } else if (value <= 500) {
                seconds = 60 + (value / 10) * 0.5;
            } else if (value <= 1000) {
                seconds = 90 + ((value - 500) / 10) * 0.8;
            } else if (value <= 5000) {
                seconds = 120 + ((value - 1000) / 100) * 1.5;
            } else {
                seconds = 180 + ((value - 5000) / 100) * 0.5;
            }
            seconds = Math.min(Math.max(seconds, 25), 300);
            isLargeAccount = value > 1000;
            break;
        case 'following':
            if (value <= 100) {
                seconds = 25;
            } else if (value <= 500) {
                seconds = 50 + (value / 10) * 0.4;
            } else if (value <= 1000) {
                seconds = 70 + ((value - 500) / 10) * 0.6;
            } else if (value <= 5000) {
                seconds = 100 + ((value - 1000) / 100) * 1.2;
            } else {
                seconds = 150 + ((value - 5000) / 100) * 0.4;
            }
            seconds = Math.min(Math.max(seconds, 20), 250);
            isLargeAccount = value > 1000;
            break;
        case 'compare':
            const estimatedUnfollowers = value * 0.1;
            seconds = 15 + (estimatedUnfollowers / 10) * 1;
            seconds = Math.min(Math.max(seconds, 15), 120);
            isLargeAccount = value > 1000;
            break;
        case 'download':
            seconds = 20 + (value / 10) * 0.5;
            seconds = Math.min(Math.max(seconds, 20), 300);
            isLargeAccount = value > 1000;
            break;
        default:
            seconds = 30;
            isLargeAccount = false;
    }
    seconds = Math.ceil(seconds);
    return { seconds, isLargeAccount };
}
function startTimerForStage(stage, seconds, isLargeAccount, customMessage) {
    if (timerStarted) {
        stopSimpleTimer();
        timerStarted = false;
    }
    timerStarted = true;
    isTimeUp = false;
    timerEnded = false;
    remainingTime = seconds;
    currentStage = stage;
    if (estimatedTime) {
        estimatedTime.classList.add('active');
    }
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    let displayText = '';
    if (minutes > 0) {
        displayText = `${minutes}m ${secs}s`;
    } else {
        displayText = `${secs}s`;
    }
    if (timeValue) {
        if (customMessage) {
            timeValue.textContent = `${customMessage} ${displayText}`;
        } else {
            timeValue.textContent = displayText;
        }
    }
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        remainingTime--;
        const mins = Math.floor(remainingTime / 60);
        const secs = remainingTime % 60;
        let display = '';
        if (mins > 0) {
            display = `${mins}m ${secs}s`;
        } else {
            display = `${secs}s`;
        }
        if (remainingTime > 0) {
            if (timeValue) {
                if (customMessage) {
                    timeValue.textContent = `${customMessage} ${display}`;
                } else {
                    timeValue.textContent = display;
                }
            }
        }
        if (remainingTime <= 0) {
            isTimeUp = true;
            timerEnded = true;
            if (timeValue) {
                if (isLargeAccount) {
                    timeValue.textContent = '⏳ Larger accounts take more time...';
                } else {
                    if (estimatedTime) {
                        estimatedTime.classList.remove('active');
                    }
                }
            }
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }, 1000);
}
function stopSimpleTimer() {
    timerStarted = false;
    isTimeUp = false;
    timerEnded = false;
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}
function updateProgress(value, label) {
    const clamped = Math.min(Math.max(value, 0), 100);
    if (progressFill) {
        progressFill.style.width = clamped + '%';
    }
    if (progressPercentage) {
        progressPercentage.textContent = Math.round(clamped) + '%';
    }
    if (label && progressLabel) {
        progressLabel.textContent = label;
    }
}
function showError(msg) {
    if (errorMessage) {
        errorMessage.textContent = 'Error:' + msg;
        errorMessage.classList.add('active');
        setTimeout(() => {
            if (errorMessage) {
                errorMessage.classList.remove('active');
            }
        }, 5000);
    }
}
function resetUI() {
    if (resultsSection) resultsSection.classList.remove('active');
    if (statsGrid) statsGrid.classList.remove('active');
    if (emptyState) emptyState.classList.remove('active');
    if (errorMessage) errorMessage.classList.remove('active');
    if (userList) userList.innerHTML = '';
    if (largeProfileWarning) largeProfileWarning.classList.remove('active');
    if (estimatedTime) estimatedTime.classList.remove('active');
    if (filterWrapper) filterWrapper.style.display = 'none';
    if (filterInput) filterInput.value = '';
    if (clearFilterBtn) clearFilterBtn.style.display = 'none';
    itemCounter = 0;
    totalUnfollowersReal = 0;
    currentUsername = '';
    totalItemsCount = 0;
    if (resultCount) resultCount.textContent = '0';
    if (progressFill) progressFill.style.width = '0%';
    if (progressPercentage) progressPercentage.textContent = '0%';
    if (progressLabel) progressLabel.textContent = 'Starting...';
    totalFollowersCount = 0;
    stopSimpleTimer();
    timerStarted = false;
    setStatus(STATUS_MESSAGES.analyzing);
    const oldMsg = document.querySelector('.cancel-message');
    if (oldMsg) oldMsg.remove();
}
function updateFilterVisibility() {
    const totalItems = document.querySelectorAll('.user-item').length;
    totalItemsCount = totalItems;
    if (filterWrapper) {
        if (totalItems >= 200) {
            filterWrapper.style.display = 'flex';
        } else {
            filterWrapper.style.display = 'none';
            if (filterInput) filterInput.value = '';
            if (clearFilterBtn) clearFilterBtn.style.display = 'none';
        }
    }
}
function showNotification(message, type = 'info', username = null, userId = null, fullName = null, profileUrl = null, itemElement = null) {
    const colors = {
        success: '#22c55e',
        error: '#ef4444',
        info: '#3b82f6'
    };
    const div = document.createElement('div');
    div.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 14px 24px;
        background: var(--bg-container, #1a1a1a);
        border: 1px solid ${colors[type]};
        border-radius: 12px;
        color: ${colors[type]};
        font-size: 14px;
        font-weight: 500;
        z-index: 9999;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        animation: slideIn 0.3s ease;
        background: var(--bg-card, #121212);
        display: flex;
        align-items: center;
        gap: 16px;
        min-width: 200px;
        max-width: 400px;
    `;
    const msgSpan = document.createElement('span');
    msgSpan.textContent = message;
    div.appendChild(msgSpan);
    if (type === 'success' && username) {
        const undoBtn = document.createElement('button');
        undoBtn.style.cssText = `
            background: transparent;
            border: 1px solid ${colors[type]};
            border-radius: 6px;
            padding: 4px 14px;
            color: ${colors[type]};
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            white-space: nowrap;
        `;
        undoBtn.textContent = '↩ Undo';
        undoBtn.addEventListener('mouseenter', () => {
            undoBtn.style.background = `rgba(34, 197, 94, 0.1)`;
        });
        undoBtn.addEventListener('mouseleave', () => {
            undoBtn.style.background = 'transparent';
        });
        undoBtn.addEventListener('click', async function(e) {
            e.stopPropagation();
            if (div.parentNode) {
                div.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => {
                    if (div.parentNode) div.remove();
                }, 300);
            }
            await undoIgnoreUser(username, userId, fullName, profileUrl, itemElement);
        });
        div.appendChild(undoBtn);
    }
    document.body.appendChild(div);
    const timeoutId = setTimeout(() => {
        if (div.parentNode) {
            div.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (div.parentNode) div.remove();
            }, 300);
        }
    }, 5000);
    div.addEventListener('click', () => {
        clearTimeout(timeoutId);
        if (div.parentNode) {
            div.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (div.parentNode) div.remove();
            }, 300);
        }
    });
}
function reorderItems() {
    const items = document.querySelectorAll('.user-item:not(.hidden)');
    let visibleCount = 0;
    items.forEach((item, index) => {
        const numberSpan = item.querySelector('.user-number');
        if (numberSpan) {
            numberSpan.textContent = `#${index + 1}`;
        }
        visibleCount++;
    });
    const searchTerm = filterInput ? filterInput.value.trim() : '';
    if (resultCount) {
        if (searchTerm) {
            resultCount.textContent = `${visibleCount} (filtered)`;
        } else {
            resultCount.textContent = visibleCount;
        }
    }
    updateFilterVisibility();
}
function filterUsers() {
    if (!filterInput) return;
    const searchTerm = filterInput.value.toLowerCase().trim();
    const items = document.querySelectorAll('.user-item');
    let visibleCount = 0;
    items.forEach(item => {
        const username = item.dataset.username || '';
        const fullname = item.dataset.fullname || '';
        const searchText = (username + ' ' + fullname).toLowerCase();
        if (!searchTerm || searchText.includes(searchTerm)) {
            item.classList.remove('hidden');
            visibleCount++;
        } else {
            item.classList.add('hidden');
        }
    });
    if (resultCount) {
        if (searchTerm) {
            resultCount.textContent = `${visibleCount} (filtered)`;
        } else {
            resultCount.textContent = visibleCount;
        }
    }
    if (clearFilterBtn) {
        clearFilterBtn.style.display = searchTerm ? 'block' : 'none';
    }
    reorderItems();
}
function highlightText(text, searchTerm) {
    if (!searchTerm || !text) return text;
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
}
async function undoIgnoreUser(username, userId, fullName, profileUrl, itemElement) {
    try {
        const response = await apiRequest('/api/unignore', {
            method: 'POST',
            body: JSON.stringify({
                username: username
            })
        });
        const data = await response.json();
        if (data.success) {
            const userList = document.getElementById('userList');
            if (userList) {
                let insertIndex = -1;
                const items = document.querySelectorAll('.user-item');
                if (itemElement && itemElement.dataset && itemElement.dataset.originalIndex) {
                    insertIndex = parseInt(itemElement.dataset.originalIndex);
                }
                if (insertIndex < 0 || insertIndex > items.length) {
                    insertIndex = items.length;
                }
                const searchTerm = filterInput ? filterInput.value.trim() : '';
                const newItem = createUserItem({
                    username: username,
                    id: userId,
                    full_name: fullName,
                    profile_url: profileUrl,
                    local_image: null
                }, insertIndex, searchTerm);
                if (insertIndex < items.length) {
                    userList.insertBefore(newItem, items[insertIndex]);
                } else {
                    userList.appendChild(newItem);
                }
                reorderItems();
                updateFilterVisibility();
                const totalItems = document.querySelectorAll('.user-item:not(.hidden)').length;
                if (resultCount) {
                    const searchTerm2 = filterInput ? filterInput.value.trim() : '';
                    if (searchTerm2) {
                        resultCount.textContent = `${totalItems} (filtered)`;
                    } else {
                        resultCount.textContent = totalItems;
                    }
                }
            }
            showNotification(`↩ @${username} removed from ignored`, 'info');
        } else {
            showNotification(` Error: ${data.message || 'User not found'}`, 'error');
        }
    } catch (e) {
        console.error('Undo error:', e);
        showNotification(` Error: ${e.message}`, 'error');
    }
}
function createUserItem(user, index, searchTerm = '') {
    const item = document.createElement('div');
    item.className = 'user-item';
    item.dataset.username = user.username;
    item.dataset.userid = user.id || '';
    item.dataset.fullname = user.full_name || '';
    item.dataset.profileurl = user.profile_url || '';
    const number = document.createElement('span');
    number.className = 'user-number';
    number.textContent = `#${index + 1}`;
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    const imgSrc = user.local_image || '';
    if (imgSrc && imgSrc.startsWith('/imagesExtract/')) {
        const img = document.createElement('img');
        const imageUrl = imgSrc.startsWith('http') ? imgSrc : `${API_BASE_URL}${imgSrc}`;
        img.src = imageUrl;
        img.alt = user.username;
        img.loading = 'lazy';
        img.onerror = function() {
            this.style.display = 'none';
            const placeholder = document.createElement('div');
            placeholder.className = 'avatar-placeholder';
            placeholder.textContent = user.username.charAt(0).toUpperCase();
            avatar.appendChild(placeholder);
        };
        img.style.transition = 'opacity 0.3s ease';
        img.style.opacity = '0';
        img.onload = function() {
            this.style.opacity = '1';
        };
        avatar.appendChild(img);
    } else {
        const placeholder = document.createElement('div');
        placeholder.className = 'avatar-placeholder';
        placeholder.textContent = user.username.charAt(0).toUpperCase();
        avatar.appendChild(placeholder);
    }
    const info = document.createElement('div');
    info.className = 'user-info';
    const usernameEl = document.createElement('span');
    usernameEl.className = 'username';
    if (searchTerm) {
        usernameEl.innerHTML = highlightText('@' + user.username, searchTerm);
    } else {
        usernameEl.textContent = '@' + user.username;
    }
    const fullnameEl = document.createElement('span');
    fullnameEl.className = 'fullname';
    if (searchTerm && user.full_name) {
        fullnameEl.innerHTML = highlightText(user.full_name, searchTerm);
    } else {
        fullnameEl.textContent = user.full_name || '';
    }
    info.appendChild(usernameEl);
    info.appendChild(fullnameEl);
    const actions = document.createElement('div');
    actions.className = 'user-actions';
    const ignoreBtn = document.createElement('button');
    ignoreBtn.className = 'ignore-btn';
    ignoreBtn.dataset.username = user.username;
    ignoreBtn.dataset.userid = user.id || '';
    ignoreBtn.dataset.fullname = user.full_name || '';
    ignoreBtn.dataset.profileurl = user.profile_url || '';
    ignoreBtn.innerHTML = '<i class="fas fa-eye-slash"></i> Ignore';
    ignoreBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const username = this.dataset.username;
        const userId = this.dataset.userid;
        const fullName = this.dataset.fullname;
        const profileUrl = this.dataset.profileurl;
        ignoreUser(username, userId, fullName, profileUrl, this);
    });
    const link = document.createElement('a');
    link.className = 'profile-link';
    link.href = user.profile_url || `https://www.instagram.com/${user.username}/`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.innerHTML = '<i class="fas fa-external-link-alt"></i>';
    actions.appendChild(ignoreBtn);
    actions.appendChild(link);
    item.appendChild(number);
    item.appendChild(avatar);
    item.appendChild(info);
    item.appendChild(actions);
    const delay = itemCounter * 0.03;
    item.style.animationDelay = delay + 's';
    itemCounter++;
    return item;
}
function addItemsBatch(users) {
    const fragment = document.createDocumentFragment();
    const startIndex = document.querySelectorAll('.user-item').length;
    const searchTerm = filterInput ? filterInput.value.trim() : '';
    users.forEach((user, i) => {
        const item = createUserItem(user, startIndex + i, searchTerm);
        fragment.appendChild(item);
    });
    if (userList) {
        userList.appendChild(fragment);
        if (searchTerm) {
            filterUsers();
        }
        const totalItems = document.querySelectorAll('.user-item:not(.hidden)').length;
        if (resultCount) {
            if (searchTerm) {
                resultCount.textContent = `${totalItems} (filtered)`;
            } else {
                resultCount.textContent = totalItems;
            }
        }
        updateFilterVisibility();
    }
}
async function ignoreUser(username, userId, fullName, profileUrl, buttonElement) {
    try {
        const response = await apiRequest('/api/ignore', {
            method: 'POST',
            body: JSON.stringify({
                username: username,
                user_id: userId,
                full_name: fullName,
                profile_url: profileUrl
            })
        });
        const data = await response.json();
        if (data.success) {
            const item = buttonElement.closest('.user-item');
            if (item) {
                const items = document.querySelectorAll('.user-item:not(.hidden)');
                const originalIndex = Array.from(items).indexOf(item);
                item.dataset.originalIndex = originalIndex;
                item.style.transition = 'all 0.3s ease';
                item.style.opacity = '0';
                item.style.transform = 'translateX(20px)';
                setTimeout(() => {
                    if (item.parentNode) {
                        item.remove();
                        reorderItems();
                        updateFilterVisibility();
                        const totalItems = document.querySelectorAll('.user-item:not(.hidden)').length;
                        if (resultCount) {
                            const searchTerm = filterInput ? filterInput.value.trim() : '';
                            if (searchTerm) {
                                resultCount.textContent = `${totalItems} (filtered)`;
                            } else {
                                resultCount.textContent = totalItems;
                            }
                        }
                    }
                }, 300);
            }
            showNotification(
                `✅ @${username} ignored!`, 
                'success', 
                username, 
                userId, 
                fullName, 
                profileUrl, 
                item
            );
        } else {
            showNotification(` Error ignoring @${username}`, 'error');
        }
    } catch (e) {
        console.error('Ignore error:', e);
        showNotification(` Error ignoring @${username}`, 'error');
    }
}
function handleSSEMessage(event) {
    try {
        const data = JSON.parse(event.data);
        console.log('📨 Event received:', data.type);
        switch(data.type) {
            case 'info':
                console.log('ℹ️ Info:', data.message);
                if (data.message && data.message.includes('Iniciando extração')) {
                    const { seconds, isLargeAccount } = calculateStageTime('verify', 0);
                    startTimerForStage('verify', seconds, isLargeAccount, 'Verifying user...');
                }
                break;
            case 'stats':
                console.log('📊 Stats received!');
                if (totalFollowing) totalFollowing.textContent = data.total_following || 0;
                if (totalFollowers) totalFollowers.textContent = data.total_followers || 0;
                totalFollowersCount = data.total_followers || 0;
                if (statsGrid) statsGrid.classList.add('active');
                const followers = data.total_followers || 0;
                const { seconds: fSeconds, isLargeAccount: fLarge } = calculateStageTime('followers', followers);
                startTimerForStage('followers', fSeconds, fLarge, 'Collecting followers...');
                setStatus(STATUS_MESSAGES.checking);
                if (progressLabel) progressLabel.textContent = 'Analyzing followers...';
                updateProgress(20, 'Analyzing followers...');
                if (totalFollowersCount > 1000 && largeProfileWarning) {
                    largeProfileWarning.classList.add('active');
                }
                break;
            case 'followers_progress':
                const fProgress = 20 + (data.collected / data.total) * 30;
                updateProgress(fProgress, `Collecting followers: ${data.collected}/${data.total}`);
                break;
            case 'following_progress':
                const folProgress = 50 + (data.collected / data.total) * 20;
                updateProgress(folProgress, `Collecting following: ${data.collected}/${data.total}`);
                break;
            case 'total_unfollowers':
                if (totalUnfollowers) totalUnfollowers.textContent = data.count || 0;
                updateProgress(75, `Found ${data.count} users not following back`);
                const { seconds: cSeconds, isLargeAccount: cLarge } = calculateStageTime('compare', data.count || 0);
                startTimerForStage('compare', cSeconds, cLarge, 'Comparing lists...');
                break;
            case 'early_results':
                console.log('⚡ Partial results received:', data.users ? data.users.length : 0, 'users');
                if (data.users && data.users.length > 0) {
                    addItemsBatch(data.users);
                    if (resultsSection) resultsSection.classList.add('active');
                    const totalItems = document.querySelectorAll('.user-item:not(.hidden)').length;
                    if (resultCount) {
                        resultCount.textContent = `${totalItems} (loading...)`;
                    }
                    showNotification(`⚡ ${data.count} unfollowers found (loading more...)`, 'info');
                    updateProgress(70, `⚡ ${data.count} found, loading more...`);
                    const { seconds: dSeconds, isLargeAccount: dLarge } = calculateStageTime('download', data.count);
                    startTimerForStage('download', dSeconds, dLarge, 'wrapping up...');
                }
                break;
            case 'batch':
                console.log('📦 Batch received:', data.users ? data.users.length : 0, 'users');
                if (data.users && data.users.length > 0) {
                    addItemsBatch(data.users);
                    if (resultsSection) resultsSection.classList.add('active');
                    const totalItems = document.querySelectorAll('.user-item:not(.hidden)').length;
                    const totalToShow = data.total_unfollowers || totalItems;
                    const hasEarlyResults = document.querySelector('.user-item') !== null;
                    if (resultCount) {
                        if (hasEarlyResults && totalItems < totalToShow) {
                            resultCount.textContent = `${totalItems} / ${totalToShow} (loading...)`;
                        } else if (totalItems >= totalToShow) {
                            resultCount.textContent = totalItems;
                        } else {
                            resultCount.textContent = `${totalItems} (loading...)`;
                        }
                    }
                    const progress = 80 + (totalItems / totalToShow) * 20;
                    updateProgress(Math.min(progress, 98), `Downloading images... Batch ${data.batch_num}/${data.total_batches}`);
                    if (data.show_more && totalUnfollowers) {
                        totalUnfollowers.textContent = data.total_unfollowers || 0;
                    }
                    if (progressLabel) {
                        progressLabel.textContent = `📥 ${data.total_downloaded} images downloaded | Batch ${data.batch_num}/${data.total_batches}`;
                    }
                    const { seconds: dSeconds, isLargeAccount: dLarge } = calculateStageTime('download', totalToShow);
                    startTimerForStage('download', dSeconds, dLarge, '👤 preparing profile...');
                    if (data.batch_num === data.total_batches) {
                        showNotification(`✅ All ${data.total_downloaded} users loaded!`, 'success');
                    }
                }
                break;
            case 'complete':
                console.log('✅ Complete!');
                updateProgress(100, 'Complete!');
                if (progressLabel) {
                    progressLabel.textContent = `✅ Complete! ${data.imagens_baixadas}`;
                }
                setStatus(STATUS_MESSAGES.complete, false);
                if (estimatedTime) estimatedTime.classList.remove('active');
                if (largeProfileWarning) largeProfileWarning.classList.remove('active');
                stopSimpleTimer();
                timerStarted = false;
                enableButton();
                isAnalyzing = false;
                const totalItems = document.querySelectorAll('.user-item:not(.hidden)').length;
                if (resultCount) {
                    resultCount.textContent = totalItems;
                }
                showNotification(`✅ Analysis complete! ${data.imagens_baixadas}`, 'success');
                setTimeout(() => {
                    if (progressContainer) progressContainer.classList.remove('active');
                }, 1500);
                if (totalItems === 0) {
                    if (emptyState) emptyState.classList.add('active');
                    if (resultsSection) resultsSection.classList.remove('active');
                }
                updateFilterVisibility();
                break;
            case 'canceled':
                console.log('⏹️ Canceled by user');
                setStatus(STATUS_MESSAGES.canceled, false);
                if (progressLabel) progressLabel.textContent = 'Aborted by user.';
                stopSimpleTimer();
                timerStarted = false;
                enableButton();
                isAnalyzing = false;
                showNotification('⏹️ Analysis canceled by user', 'error');
                setTimeout(() => {
                    if (progressContainer) progressContainer.classList.remove('active');
                }, 1000);
                break;
            case 'error':
                console.log(' Error:', data.message);
                showError(data.message);
                if (progressContainer) progressContainer.classList.remove('active');
                enableButton();
                isAnalyzing = false;
                stopSimpleTimer();
                timerStarted = false;
                showNotification(` Error: ${data.message}`, 'error');
                break;
        }
    } catch (e) {
        console.error('Error processing message:', e);
    }
}
async function cancelAnalysis() {
    if (isCanceling) return;
    isCanceling = true;
    enableButton();
    if (abortController) {
        try {
            abortController.abort();
        } catch (e) {
            console.error('Abort error:', e);
        }
        abortController = null;
    }
    if (currentTaskId) {
        try {
            await apiRequest(`/api/cancel/${currentTaskId}`, {
                method: 'POST'
            });
        } catch (e) {
            console.error('Cancel error:', e);
        }
    }
    isAnalyzing = false;
    currentTaskId = null;
    if (progressContainer) progressContainer.classList.remove('active');
    stopSimpleTimer();
    timerStarted = false;
    setStatus(STATUS_MESSAGES.canceled, false);
    if (progressLabel) progressLabel.textContent = 'Aborted by user.';
    const statusDiv = document.createElement('div');
    statusDiv.className = 'cancel-message';
    statusDiv.style.cssText = `
        text-align: center;
        color: #ef4444;
        padding: 12px;
        margin-top: 10px;
        font-size: 14px;
        font-weight: 500;
        border: 1px solid #ef4444;
        border-radius: 8px;
        background: rgba(239, 68, 68, 0.08);
    `;
    statusDiv.textContent = 'Aborted by user.';
    const oldMsg = document.querySelector('.cancel-message');
    if (oldMsg) oldMsg.remove();
    if (progressContainer) {
        progressContainer.parentNode.insertBefore(statusDiv, progressContainer.nextSibling);
    }
    setTimeout(() => {
        if (statusDiv.parentNode) {
            statusDiv.remove();
        }
    }, 4000);
    isCanceling = false;
}
async function searchUser() {
    if (!usernameInput) return;
    if (!isApiKeyValid) {
        const verified = await verifyApiKey();
        if (!verified) {
            showError(' Invalid API Key. Check your configuration.');
            return;
        }
    }
    const username = usernameInput.value.trim().replace('@', '');
    if (!username) {
        showError('Please enter a valid username');
        return;
    }
    if (isAnalyzing) {
        await cancelAnalysis();
        return;
    }
    resetUI();
    currentTaskId = null;
    isCanceling = false;
    timerStarted = false;
    if (progressContainer) progressContainer.classList.add('active');
    disableButton();
    isAnalyzing = true;
    setStatus(STATUS_MESSAGES.analyzing);
    if (progressFill) progressFill.style.width = '0%';
    if (progressPercentage) progressPercentage.textContent = '0%';
    if (progressLabel) progressLabel.textContent = 'Starting...';
    if (estimatedTime) estimatedTime.classList.add('active');
    if (timeValue) timeValue.textContent = '⏳ Starting...';
    await new Promise(resolve => setTimeout(resolve, 1500));
    if (!isAnalyzing) {
        enableButton();
        return;
    }
    updateProgress(20, 'Starting extraction...');
    abortController = new AbortController();
    try {
        const response = await apiRequest('/api/extract/stream', {
            method: 'POST',
            body: JSON.stringify({ 
                username: username,
                mode: extractionMode
            }),
            signal: abortController.signal
        });
        const taskId = response.headers.get('X-Task-ID');
        if (taskId) {
            currentTaskId = taskId;
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const jsonData = line.substring(6);
                        handleSSEMessage({ data: jsonData });
                    } catch (e) {}
                }
            }
        }
    } catch (err) {
        if (err.name === 'AbortError') {
            return;
        }
        if (err.message === 'Invalid API Key') {
            showError(' Invalid API Key. Check your configuration.');
        } else {
            showError('Network error: ' + err.message);
        }
        if (progressContainer) progressContainer.classList.remove('active');
        enableButton();
        isAnalyzing = false;
        stopSimpleTimer();
        timerStarted = false;
    }
}
if (searchBtn) {
    searchBtn.addEventListener('click', function(e) {
        e.preventDefault();
        if (isAnalyzing) {
            cancelAnalysis();
            return;
        }
        searchUser();
    });
}
if (usernameInput) {
    usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            searchUser();
        }
    });
}
if (modeKnown) {
    modeKnown.addEventListener('click', function() {
        selectMode('known');
    });
}
if (modeAll) {
    modeAll.addEventListener('click', function() {
        selectMode('all');
    });
}
if (filterInput) {
    filterInput.addEventListener('input', filterUsers);
}
if (clearFilterBtn) {
    clearFilterBtn.addEventListener('click', function() {
        if (filterInput) {
            filterInput.value = '';
            filterUsers();
            filterInput.focus();
        }
    });
}
const styleSheet = document.createElement('style');
styleSheet.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100px); opacity: 0; }
    }
`;
document.head.appendChild(styleSheet);
selectMode('known');
(async function init() {
    console.log('🚀 Unfollow Tracker started!');
    console.log('📌 Click "View Unfollow" to start');
    console.log('🔍 Filter appears automatically with 200+ users');
    if (usernameInput) usernameInput.focus();
})();
