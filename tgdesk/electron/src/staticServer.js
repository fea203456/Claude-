// Serves the built web client from a fixed local address: the client's storage belongs to its origin,
// so the port must stay the same between launches, and http://127.0.0.1 is a secure context
// (service and shared workers work there).
const http = require('http');
const fs = require('fs');
const path = require('path');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.map': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.wasm': 'application/wasm',
  '.tgs': 'application/x-tgsticker',
  '.mesh': 'model/mesh',
  '.txt': 'text/plain; charset=utf-8'
};

function startStaticServer(root, port) {
  root = path.resolve(root);
  const server = http.createServer((req, res) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch(err) {
      res.writeHead(400).end();
      return;
    }

    let filePath = path.join(root, pathname);
    if(!filePath.startsWith(root)) {
      res.writeHead(403).end();
      return;
    }

    fs.stat(filePath, (err, stat) => {
      if(!err && stat.isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      } else if(err) {
        // * the client routes on the hash, so anything unknown is the app itself
        filePath = path.join(root, 'index.html');
      }

      fs.readFile(filePath, (readErr, data) => {
        if(readErr) {
          res.writeHead(404).end();
          return;
        }

        res.writeHead(200, {
          'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
          'Cache-Control': 'no-cache',
          'Cross-Origin-Opener-Policy': 'same-origin',
          'X-Content-Type-Options': 'nosniff'
        });
        res.end(data);
      });
    });
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

module.exports = {startStaticServer};
