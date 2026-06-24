const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
  const originalUrl = req.url;
  let filePath = '.' + decodeURIComponent(req.url);
  
  if (filePath === './') {
    filePath = './index.html';
  }

  const extname = path.extname(filePath);
  let contentType = 'text/html';
  switch (extname) {
    case '.js':
      contentType = 'text/javascript';
      break;
    case '.css':
      contentType = 'text/css';
      break;
    case '.json':
      contentType = 'application/json';
      break;
    case '.png':
      contentType = 'image/png';
      break;
    case '.jpg':
    case '.jpeg':
      contentType = 'image/jpeg';
      break;
    case '.svg':
      contentType = 'image/svg+xml';
      break;
    case '.ico':
      contentType = 'image/x-icon';
      break;
    case '.txt':
      contentType = 'text/plain';
      break;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if(error.code === 'ENOENT'){
        console.log(`❌ 404 Not Found: ${originalUrl}`);
        res.writeHead(404);
        res.end('File not found');
      } else {
        console.log(`❌ Server Error (${error.code}): ${originalUrl}`);
        res.writeHead(500);
        res.end('Server Error: ' + error.code);
      }
    } else {
      console.log(`✅ 200 OK: ${originalUrl}`);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

const PORT = 8080;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});