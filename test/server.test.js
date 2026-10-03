import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Store } from '../src/store.js';
import { createServer } from '../src/server.js';

test('HTTP demo serves assets, grades answers and rejects cross-origin/malformed requests', async t => {
  const store = new Store(); const server = createServer(store);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); store.close(); });
  const base = 'http://127.0.0.1:' + server.address().port;
  const get = path => fetch(base + path);
  const post = (path, body, headers = {}) => fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
  const page = await get('/'); assert.equal(page.status, 200); assert.match(await page.text(), /app.js/);
  assert.match(page.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  for (const path of ['/app.js', '/content.js', '/styles.css']) assert.equal((await get(path)).status, 200);
  assert.equal((await get('/src/store.js')).status, 404);
  const bootstrap = await (await get('/api/bootstrap')).json();
  assert.equal(bootstrap.content.exercises.some(e => 'answers' in e || 'distractors' in e), false);
  assert.equal((await post('/api/preferences', { goal: 999 })).status, 400);
  assert.equal((await post('/api/preferences', { goal: 12 }, { origin: 'https://malicious.example' })).status, 403);
  assert.equal((await fetch(base + '/api/preferences', { method: 'POST', body: '{}' })).status, 415);
  assert.equal((await fetch(base + '/api/preferences', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{broken' })).status, 400);
  assert.equal((await post('/api/preferences', null)).status, 400);
  assert.equal((await fetch(base + '/api/bootstrap', { headers: { 'x-demo-user': 'unknown' } })).status, 404);
  const result = await post('/api/attempt', { requestId: 'http-attempt', exerciseId: 'ex-1-type', revisionId: 1, answer: 'אני' });
  assert.equal(result.status, 200); assert.equal((await result.json()).correct, true);
  assert.equal(store.learner('learner-demo').attempts.length, 1);
});
