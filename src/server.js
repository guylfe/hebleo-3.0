import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store, DomainError } from './store.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
export function createServer(store) {
  return http.createServer(async (req, res) => {
    const headers = { 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'", 'Referrer-Policy': 'no-referrer' };
    const json = (status, data) => { res.writeHead(status, { ...headers, 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(data)); };
    try {
      const url = new URL(req.url, 'http://127.0.0.1');
      let host; try { host = new URL('http://' + req.headers.host).hostname; } catch { throw new DomainError('Invalid host.', 403); }
      if (!['localhost', '127.0.0.1', '[::1]'].includes(host)) throw new DomainError('This demonstration is available only on localhost.', 403);
      if (req.headers.origin && req.headers.origin !== 'http://' + req.headers.host) throw new DomainError('Cross-origin requests are not allowed.', 403);
      if (url.pathname === '/api/health' && req.method === 'GET') return json(200, { ok: true, demo: true });
      if (url.pathname.startsWith('/api/')) {
        const userId = req.headers['x-demo-user'] || 'learner-demo'; store.learner(userId);
        if (req.method === 'GET') {
          if (url.pathname === '/api/bootstrap') return json(200, store.bootstrap(userId));
          if (url.pathname === '/api/studio') return json(200, { ...store.active(), preview: store.preview() });
          if (url.pathname === '/api/export') return json(200, store.backup());
          if (url.pathname === '/api/content') return json(200, store.snapshot());
        }
        if (req.method === 'POST') {
          if (!String(req.headers['content-type']).startsWith('application/json')) throw new DomainError('JSON content type required.', 415);
          const chunks = []; let bytes = 0;
          for await (const chunk of req) { bytes += chunk.length; if (bytes > 750000) throw new DomainError('Request exceeds the local import limit.', 413); chunks.push(chunk); }
          let input; try { input = JSON.parse(Buffer.concat(chunks).toString()); } catch { throw new DomainError('Malformed JSON.'); }
          if (!input || typeof input !== 'object' || Array.isArray(input)) throw new DomainError('Expected a JSON object.');
          if (url.pathname === '/api/preferences') return json(200, store.updateLearner(userId, input));
          if (url.pathname === '/api/attempt') return json(200, store.attempt(userId, input));
          if (url.pathname === '/api/review') return json(200, store.review(userId, input));
          if (url.pathname === '/api/enroll') return json(200, store.enroll(userId, input.wordId));
          if (url.pathname === '/api/studio/draft') return json(200, store.stage(input));
          if (url.pathname === '/api/studio/publish') return json(200, store.publish(input.baseRevisionId));
          if (url.pathname === '/api/studio/rollback') return json(200, store.rollback(input.revisionId, input.baseRevisionId));
          if (url.pathname === '/api/demo/event') return json(200, store.entitlement(userId, input));
          if (url.pathname === '/api/restore') return json(200, store.restore(input));
        }
        return json(404, { error: 'API endpoint not found.' });
      }
      if (req.method !== 'GET') return json(405, { error: 'Method not allowed.' });
      const allowed = { '/': 'index.html', '/app.js': 'app.js', '/content.js': 'content.js', '/styles.css': 'styles.css' };
      if (!allowed[url.pathname]) return json(404, { error: 'Page not found.' });
      const file = allowed[url.pathname]; const ext = '.' + file.split('.').pop();
      const body = await readFile(resolve(root, 'public', file));
      res.writeHead(200, { ...headers, 'Content-Type': types[ext] + '; charset=utf-8' }); res.end(body);
    } catch (e) { json(e instanceof DomainError ? e.status : 500, { error: e instanceof DomainError ? e.message : 'Local server error. See terminal for details.' }); if (!(e instanceof DomainError)) console.error(e.message); }
  });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  mkdirSync(resolve(root, 'data'), { recursive: true });
  const store = new Store(resolve(root, 'data', 'hebleo-demo.sqlite'));
  const server = createServer(store); const port = Number(process.env.PORT || 4173);
  server.listen(port, '127.0.0.1', () => console.log('Hebleo local demo: http://127.0.0.1:' + port));
  const stop = () => server.close(() => { store.close(); process.exit(0); });
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
}
