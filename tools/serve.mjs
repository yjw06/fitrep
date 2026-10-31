// 로컬 정적 서버 — GitHub Pages처럼 /<base>/ 하위로 서빙. 사용: node tools/serve.mjs [port] [base]
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8',
};

export function serve({ port = 8080, base = '/fitrep/' } = {}) {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/' || url.pathname === base.slice(0, -1)) { res.writeHead(302, { location: base }); return res.end(); }
    if (!url.pathname.startsWith(base)) { res.writeHead(404); return res.end('not found'); }
    let rel = decodeURIComponent(url.pathname.slice(base.length));
    if (rel === '' || rel.endsWith('/')) rel += 'index.html';
    rel = normalize(rel).replace(/^(\.\.[/\\])+/, '');
    const file = join(root, rel);
    try {
      if (!(await stat(file)).isFile()) throw new Error();
      res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-cache' });
      res.end(await readFile(file));
    } catch {
      res.writeHead(404); res.end('not found');
    }
  });
  return new Promise((ok) => server.listen(port, () => ok(server)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = +(process.argv[2] ?? 8080);
  const base = process.argv[3] ?? '/fitrep/';
  await serve({ port, base });
  console.log(`http://localhost:${port}${base}`);
}
