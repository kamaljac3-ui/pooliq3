const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = 'C:\\Users\\kamal\\OneDrive\\Documents\\GitHub\\pooliq\\noir-ivoire';
const PORT = 8939;

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
};

http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.join(ROOT, urlPath);
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.stat(filePath, (statErr, stats) => {
    if (statErr) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';

    // Support range requests for video so scrubbing/looping works properly.
    if (ext === '.mp4' && req.headers.range) {
      const range = req.headers.range;
      const bytesMatch = /bytes=(\d*)-(\d*)/.exec(range);
      const start = bytesMatch[1] ? parseInt(bytesMatch[1], 10) : 0;
      const end = bytesMatch[2] ? parseInt(bytesMatch[2], 10) : stats.size - 1;
      const chunkSize = end - start + 1;
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stats.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': type,
      });
      fs.createReadStream(filePath, { start, end }).pipe(res);
      return;
    }

    res.writeHead(200, { 'Content-Type': type, 'Content-Length': stats.size, 'Accept-Ranges': 'bytes' });
    fs.createReadStream(filePath).pipe(res);
  });
}).listen(PORT, () => {
  console.log(`noir-ivoire static server listening on http://localhost:${PORT}`);
});
