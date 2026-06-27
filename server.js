const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const PORT = 3000;
let API_KEY = '';
try {
    const configContent = fs.readFileSync('config.js', 'utf8');
    const match = configContent.match(/API_KEY:\s*['"]([^'"]+)['"]/);
    if (match) {
        API_KEY = match[1];
        console.log('✅ API Key loaded from config.js');
    } else {
        console.warn('⚠️ API Key not found in config.js');
    }
} catch (e) {
    console.error(' Error loading config.js:', e.message);
}
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp'
};
function getLocalIPs() {
    const interfaces = os.networkInterfaces();
    const ips = [];
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                ips.push(iface.address);
            }
        }
    }
    return ips;
}
const server = http.createServer((req, res) => {
    console.log(`📥 ${req.method} ${req.url}`);
    let filePath = req.url.split('?')[0];
    if (filePath === '/') {
        filePath = '/index.html';
    }
    const fullPath = path.join(__dirname, filePath);
    const extname = String(path.extname(fullPath)).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';
    fs.readFile(fullPath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 - File Not Found</h1>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end(`Server Error: ${err.code}`, 'utf-8');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});
server.listen(PORT, '0.0.0.0', () => {
    console.clear();
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║         🚀 UNFOLLOW TRACKER SERVER RUNNING 🚀          ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');
    if (API_KEY) {
        console.log('✅ API Key: ' + API_KEY.substring(0, 8) + '...' + API_KEY.substring(API_KEY.length - 4));
    } else {
        console.log('⚠️  API Key: NOT CONFIGURED');
        console.log('   → Edit config.js to add your API key\n');
    }
    console.log('📡 Server Access URLs:\n');
    console.log(`   Local:    http://localhost:${PORT}`);
    console.log(`   Local:    http://127.0.0.1:${PORT}`);
    const ips = getLocalIPs();
    if (ips.length > 0) {
        console.log('\n   Network Access (use on other devices):');
        ips.forEach(ip => {
            console.log(`   Network:  http://${ip}:${PORT}`);
        });
    }
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📌 Press CTRL+C to stop the server');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
});
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(` Port ${PORT} is already in use!`);
        console.error(`   Try closing other applications or change the PORT in server.js\n`);
    } else {
        console.error(' Server error:', err);
    }
    process.exit(1);
});
process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down server gracefully...');
    server.close(() => {
        console.log('✅ Server closed successfully\n');
        process.exit(0);
    });
});
