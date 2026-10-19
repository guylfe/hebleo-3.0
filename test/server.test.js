import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
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


test('NAVY13 original logo delivery preserves exact PNG bytes and only exposes the approved asset',async t=>{
 const store=new Store(),server=createServer(store);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(async()=>{await new Promise(resolve=>server.close(resolve));store.close();});const base='http://127.0.0.1:'+server.address().port;
 const response=await fetch(base+'/assets/hebleo-wide-navy.png'),bytes=Buffer.from(await response.arrayBuffer()),original=readFileSync(new URL('../public/assets/hebleo-wide-navy.png',import.meta.url));assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'image/png');assert.equal(response.headers.get('x-content-type-options'),'nosniff');assert.equal(bytes.equals(original),true);assert.equal(bytes.length,137630);assert.equal(createHash('sha256').update(bytes).digest('hex'),'d744d37a3a10f315d58372b3a8f557b2913c04f6d6065c4f15ae26fc10789971');assert.equal(bytes.readUInt32BE(16),3693);assert.equal(bytes.readUInt32BE(20),1198);assert.equal((await fetch(base+'/assets/not-approved.png')).status,404);
 const setup=await(await fetch(base+'/google-setup')).text();assert.match(setup,/aria-label="Hebleo home"/);assert.match(setup,/<img src="\/assets\/hebleo-wide-navy.png" alt="" width="3693" height="1198">/);assert.equal(setup.includes('Wide logo pending'),false);
});
