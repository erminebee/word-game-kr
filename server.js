const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 3000;
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/') reqPath = '/index.html';

  const filePath = path.join(__dirname, reqPath);
  const ext = path.extname(filePath).toLowerCase();

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=UTF-8' });
        res.end('500 Server Error: ' + err.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      res.end(content);
    }
  });
});

// 로컬 IP 찾기 (핸드폰에서 접속할 수 있도록 안내)
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

server.listen(PORT, '0.0.0.0', () => {
  const localIP = getLocalIP();
  console.log(`====================================================`);
  console.log(`🎮 한글 단어 맞추기 게임 서버가 실행 중입니다!`);
  console.log(`----------------------------------------------------`);
  console.log(`📱 스마트폰 접속 주소 (핸드폰 브라우저에 입력):`);
  console.log(`   👉 http://${localIP}:${PORT}`);
  console.log(`----------------------------------------------------`);
  console.log(`💻 PC 브라우저 접속 주소:`);
  console.log(`   👉 http://localhost:${PORT}`);
  console.log(`====================================================`);
  console.log(`※ 팁: 스마트폰과 PC가 같은 Wi-Fi에 연결되어 있어야 합니다.`);
  console.log(`※ 종료하려면 이 창을 닫거나 Ctrl + C를 누르세요.`);
});
