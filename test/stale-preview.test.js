import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {Store} from '../src/store.js';
import {createServer} from '../src/server.js';
import {pathToFileURL} from 'node:url';
const {mountLessonPreview} = await import(process.env.HEBLEO_PREVIEW_CONTROLLER ? pathToFileURL(process.env.HEBLEO_PREVIEW_CONTROLLER) : '../public/preview/lesson-preview.js');
import {createLearnerRenderer} from '../public/preview/learner-renderer.js';
import {stepExercises} from '../public/ux.js';

const profiles = ['learner-demo','learner-core','author-demo'];
const tables = store => store.db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(({name}) => [name,store.db.prepare('SELECT * FROM "'+name+'" ORDER BY rowid').all()]);
const changes = store => store.db.prepare('SELECT total_changes() AS n').get().n;
const tick = () => new Promise(resolve => setImmediate(resolve));

async function setup(t, type, conflict) {
  const store = new Store(), server = createServer(store);
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const origin = 'http://127.0.0.1:'+server.address().port, requests = [];
  const dom = new JSDOM('<main></main>',{pretendToBeVisual:true}), doc = dom.window.document, host = doc.querySelector('main');
  let preview;
  t.after(async () => {preview?.dispose();dom.window.close();await new Promise(resolve => server.close(resolve));store.close();});
  async function api(path, input) {
    const response = await fetch(origin+'/api/studio/'+path,{method:'POST',headers:{'content-type':'application/json','x-demo-user':'author-demo'},body:JSON.stringify(input)});
    const value = await response.json();requests.push({path,input:structuredClone(input),status:response.status,code:value.code});
    if (!response.ok) throw Object.assign(new Error(value.error),{status:response.status,code:value.code});
    return value;
  }
  const content = store.snapshot(), item = content.exercises.find(x => x.type === type);
  const staged = await api('draft',{baseRevisionId:1,expectedDraftToken:null,content});
  let stopCount = 0;
  preview = mountLessonPreview(host,{lessonId:item.lessonId,draftToken:staged.draftToken,
    renderer:createLearnerRenderer({keyScope:host,stopMedia(){stopCount++;}}),
    loadSession:input => api('preview/session',input),
    // Missing-target uses the real 404 route with an invalid target, rather than a
    // fabricated response. Draft changes/removals themselves correctly return 409.
    evaluate:input => api('preview/evaluate',conflict==='missing-target'?{...input,exerciseId:'missing-fixture-target'}:input)});
  await preview.ready;
  const session = store.previewSession({lessonId:item.lessonId,draftToken:staged.draftToken});
  const lesson = session.content.lessons.find(l => l.id === item.lessonId);
  const step = session.steps.find(step => ['check','apply'].includes(step) && stepExercises(lesson,step,[]).includes(item.id));
  const ids = stepExercises(lesson,step,[]);
  preview.go(step,ids.indexOf(item.id));
  const root = () => host.querySelector('.learner-preview');
  const click = selector => {const el = root().querySelector(selector);assert.ok(el,selector);el.click();};
  let expected;
  if (type==='recognition') {
    const choice = root().querySelector('[data-action="choice"]');expected = choice.dataset.value;choice.click();
  } else if (type==='matching') {
    expected = Object.fromEntries(item.wordIds.map(id => [id,content.words.find(w=>w.id===id).english]));
    for (const [id,meaning] of Object.entries(expected)) {click('[data-match-word="'+id+'"]');click('[data-match-target="'+meaning+'"]');}
  } else if (type==='ordering') {
    for (const token of ['אני','ב','בית']) {
      const el = [...root().querySelectorAll('[data-action="token"]')].find(el=>el.textContent===token&&!el.disabled);assert.ok(el,token);el.click();
    }
    expected = root().querySelector('.assembled-sentence').textContent;assert.equal(expected,'אני בבית');
  } else {
    // Preserve typed bytes including authored Nikkud and directional marks.
    expected = '\u200f'+(item.answers?.[0] || content.words.find(w=>w.id===item.wordId).pointed)+'\u200f';
    const input = root().querySelector('#answer');input.value = expected;input.dispatchEvent(new dom.window.Event('input',{bubbles:true}));
  }
  const selected = () => type==='recognition' ? [...root().querySelectorAll('.choices .selected')].map(el=>el.dataset.value)
    : type==='matching' ? {placed:[...root().querySelectorAll('[data-match-word]')].map(el=>[el.dataset.matchWord,el.querySelector('small').textContent]),targets:[...root().querySelectorAll('[data-match-target].filled')].map(el=>[el.dataset.matchTarget,el.querySelector('span').textContent])}
    : type==='ordering' ? [...root().querySelectorAll('[data-action="remove-token"]')].map(el=>[el.dataset.value,el.textContent,el.className])
    : root().querySelector('#answer').value;
  const selectionBefore = selected(), prompt = root().querySelector('.exercise-prompt').textContent;
  if (type==='recognition') assert.deepEqual(selectionBefore,[expected]);
  if (type==='ordering') assert.equal(selectionBefore.length,3,'all three selected tiles, including the prefix, are visible');
  if (type==='matching') {
    assert.equal(selectionBefore.targets.length,item.wordIds.length);
    assert.deepEqual(selectionBefore.placed,item.wordIds.map(id=>[id,'Placed: '+expected[id]]));
  }
  if (conflict==='draft') await api('draft',{baseRevisionId:1,expectedDraftToken:staged.draftToken,word:{id:'w-mi',notes:'Synthetic G5-01 other-tab metadata'}});
  else if (conflict==='publication') await api('publish',{baseRevisionId:1,draftToken:staged.draftToken});
  const baseline = tables(store), learners = profiles.map(id=>store.learner(id)), published = store.snapshot(), initialChanges = changes(store), seen = requests.length;
  const oldRoot = root(), oldCheck = oldRoot.querySelector('[data-action="check"]');
  oldCheck.focus();oldCheck.click();
  for (let i=0;i<100&&!host.querySelector('[data-preview-frozen]');i++) await new Promise(r=>setTimeout(r,5));
  assert.ok(root(),'the existing question remains visible after conflict');
  assert.ok(host.querySelector('[data-preview-frozen]'),'presentation is frozen');
  assert.deepEqual(selected(),selectionBefore,'exact displayed answer/selection is retained');
  assert.equal(root().querySelector('.exercise-prompt').textContent,prompt);
  if (type==='ordering') assert.equal(root().querySelector('.assembled-sentence').textContent,expected);
  assert.equal(root().querySelector('.feedback'),null,'no accepted grade is invented');
  assert.equal(root().hasAttribute('aria-busy'),false);
  assert.match(host.querySelector('[data-preview-status]').textContent,/read-only.*not been checked/);
  assert.ok([...host.querySelectorAll('button,input,textarea,select')].every(el=>el.hasAttribute('data-preview-exit')||el.disabled));
  assert.ok([...root().querySelectorAll('[draggable]')].every(el=>!el.draggable));
  assert.equal(doc.activeElement,host.querySelector('[data-preview-exit]'),'focus moves to the usable Exit control');
  const rejected = requests.slice(seen);assert.equal(rejected.length,1);
  assert.equal(rejected[0].input.draftToken,staged.draftToken);
  assert.deepEqual(rejected[0].input.answer,expected,'the exact answer reaches the actual HTTP rejection');
  assert.equal(rejected[0].status,conflict==='missing-target'?404:409);
  assert.equal(rejected[0].code,conflict==='missing-target'?'PREVIEW_TARGET_NOT_FOUND':'DRAFT_CONFLICT');
  for (const fn of [()=>preview.go('learn'),()=>preview.next(),()=>preview.setAnswer('changed'),()=>preview.retry(),()=>preview.lookup(null),()=>preview.setPreference('nikkud','none')]) assert.throws(fn,/unavailable/);
  await assert.rejects(preview.submit('changed'),/unavailable/);
  for (const target of [oldRoot,root(),host]) for (const key of ['1','Enter']) {
    const event = new dom.window.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true});target.dispatchEvent(event);
    assert.equal(event.defaultPrevented,false,'renderer key handlers were disposed');
  }
  oldCheck.click();assert.equal(root().querySelector('[data-action="check"]'),null);assert.ok(host.querySelector('[data-exercise-dock] [data-preview-exit]'));
  await tick();
  assert.deepEqual(selected(),selectionBefore);assert.equal(requests.length,seen+1);
  assert.equal(changes(store),initialChanges);assert.deepEqual(tables(store),baseline);
  assert.deepEqual(profiles.map(id=>store.learner(id)),learners);assert.deepEqual(store.snapshot(),published);
  assert.ok(stopCount>0);
  host.querySelector('[data-preview-exit]').click();assert.equal(host.childElementCount,0);
}

test('G5-01 actual renderer/controller and HTTP keep six answer families frozen across conflict and missing-target errors with zero writes',async t => {
  for (const conflict of ['draft','publication','missing-target']) for (const type of ['recognition','typing','cloze','transformation','matching','ordering']) {
    await t.test(conflict+' / '+type,child=>setup(child,type,conflict));
  }
});

test('G5-01 freezes the existing displayed feedback and live field values before the renderer disposer removes them',async t => {
  const dom = new JSDOM('<main></main>',{pretendToBeVisual:true}), host = dom.window.document.querySelector('main'), store = new Store();
  t.after(()=>{dom.window.close();store.close();});
  const staged = store.stage({baseRevisionId:1,expectedDraftToken:null,content:store.snapshot()});
  let disposed = 0;
  const preview = mountLessonPreview(host,{lessonId:'lesson-1',draftToken:staged.draftToken,
    loadSession:async input=>store.previewSession(input),evaluate:async()=>{throw Object.assign(new Error('gone'),{status:404,code:'PREVIEW_TARGET_NOT_FOUND'});},
    renderer:{mount(body){body.innerHTML='<input value="default"><select><option>A</option><option>B</option></select><p class="feedback">Previously displayed feedback</p>';body.querySelector('input').value='אני';body.querySelector('select').value='B';return()=>{disposed++;body.replaceChildren();};}}});
  t.after(()=>preview.dispose());await preview.ready;preview.go('apply');await preview.submit('אני');
  assert.equal(host.querySelector('input').value,'אני');assert.equal(host.querySelector('select').value,'B');
  assert.equal(host.querySelector('.feedback').textContent,'Previously displayed feedback');assert.equal(disposed,3);
  preview.exit();assert.equal(host.childElementCount,0);
});
