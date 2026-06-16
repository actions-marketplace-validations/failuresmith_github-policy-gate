import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { createServer } from 'node:http';
import { URL } from 'node:url';

const rootDir = normalize(join(process.cwd(), 'site-dist'));
const host = process.env.HOST ?? '127.0.0.1';
const port = Number.parseInt(process.env.PORT ?? '4173', 10);

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function resolvePath(urlPath) {
  const cleanPath = urlPath === '/' ? '/index.html' : urlPath;
  const candidate = normalize(join(rootDir, cleanPath));
  if (!candidate.startsWith(rootDir)) {
    return null;
  }

  if (!existsSync(candidate)) {
    return null;
  }

  const stats = statSync(candidate);
  return stats.isDirectory() ? join(candidate, 'index.html') : candidate;
}

const server = createServer((request, response) => {
  const requestUrl = new URL(request.url ?? '/', `http://${host}:${port}`);
  const filePath = resolvePath(requestUrl.pathname);

  if (!filePath || !existsSync(filePath)) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  const contentType =
    mimeTypes[extname(filePath)] ?? 'application/octet-stream';
  response.writeHead(200, { 'content-type': contentType });
  createReadStream(filePath).pipe(response);
});

server.listen(port, host, () => {
  process.stdout.write(`Previewing site-dist at http://${host}:${port}\n`);
});
