import http from 'http';
import { readFile, stat } from 'fs/promises';
import { extname, join, normalize, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.txt': 'text/plain'
};

const server = http.createServer(async (req, res) => {
  try {
    // strip query string + hash for cache-busted asset URLs (?v=3.1.06)
    let urlPath = decodeURIComponent((req.url || '/').split('?')[0].split('#')[0]);
    if (urlPath === '/') urlPath = '/index.html';
    const filePath = normalize(join(ROOT, urlPath));
    if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end('Forbidden'); return; }

    let s;
    try {
      s = await stat(filePath);
    } catch {
      // SPA / PWA fallback: unknown non-asset routes -> index.html
      if (!extname(urlPath)) {
        const buf = await readFile(join(ROOT, 'index.html'));
        res.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' });
        res.end(buf);
        return;
      }
      res.writeHead(404); res.end('Not found: ' + urlPath); return;
    }

    if (s.isDirectory()) {
      const buf = await readFile(join(filePath, 'index.html'));
      res.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' });
      res.end(buf);
      return;
    }

    const buf = await readFile(filePath);
    const type = MIME[extname(filePath)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type + ';charset=utf-8' });
    res.end(buf);
  } catch (e) {
    res.writeHead(500);
    res.end('Server error: ' + e.message);
  }
});

server.listen(PORT, () => console.log('Serving ' + ROOT + ' on http://localhost:' + PORT));
