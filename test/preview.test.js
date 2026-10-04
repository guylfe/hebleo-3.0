import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {Store} from '../src/store.js';
import {seed} from '../src/seed.js';
import {lessonSteps} from '../public/ux.js';
import {mountLessonPreview} from '../public/preview/lesson-preview.js';
import {mountMediaPicker} from '../public/studio/media-picker.js';

function harness(t, overrides = {}) {
  const dom = new JSDOM('<main></main>', {url:'https://fixture.invalid'}), container = dom.window.document.querySelector('main');
  t.after(() => dom.window.close());
  const content = structuredClone(seed), lesson = content.lessons[0], calls = [], views = [];
  const response = {mode:'draft-preview',persistent:false,draftToken:'fixture-token',baseRevisionId:1,lessonId:lesson.id,content,steps:lessonSteps(lesson)};
  const renderer = {mount(body, view) {views.push(view);body.textContent = `Fixture adapter: ${view.step}`;return () => {body.replaceChildren();};}};
  const preview = mountLessonPreview(container, {
    lessonId:lesson.id,draftToken:response.draftToken,renderer,
    loadSession: async input => {calls.push(['session',input]);return response;},
    evaluate: async input => {calls.push(['evaluate',input]);return {mode:'draft-preview',persistent:false,draftToken:response.draftToken,result:{correct:false,feedback:'Fixture transport response'}};},
    ...overrides
  });
  t.after(() => preview.dispose());
  return {dom,container,content,lesson,response,calls,views,preview};
}

test('disposable rehearsal navigates, retries, looks up and changes settings without modifying three learner states or source', async t => {
  const store = new Store();t.after(() => store.close());
  const before = store.backup(), preferences = {nikkud:'curated',keyboardPinned:false};
  const h = harness(t,{preferences});await h.preview.ready;
  assert.equal(h.views.at(-1).exerciseId,null);
  for (const step of h.response.steps) h.preview.go(step);
  h.preview.go('apply');
  const item = h.content.exercises.find(x => x.id === h.views.at(-1).exerciseId);
  h.preview.setAnswer('Fixture-only supplied answer');await h.preview.submit();
  assert.equal(h.views.at(-1).result.correct,false);
  h.preview.lookup(h.content.words[0].id);
  assert.equal(h.views.at(-1).lookupId,h.content.words[0].id);
  h.preview.retry();assert.equal(h.views.at(-1).result,null);assert.equal(h.views.at(-1).answer,'');
  if (!item.allowLookup) assert.throws(() => h.preview.lookup(h.content.words[0].id),/unavailable/);
  h.preview.setPreference('nikkud','none');h.preview.setPreference('keyboardPinned',true);
  assert.equal(h.views.at(-1).preferences.nikkud,'none');assert.deepEqual(preferences,{nikkud:'curated',keyboardPinned:false});
  assert.throws(() => h.preview.setPreference('__proto__',{}),/Unsupported/);
  assert.throws(() => h.preview.go('learn',1),/question/);
  h.preview.next();h.preview.exit();
  const after = store.backup();after.exportedAt = before.exportedAt;
  assert.deepEqual(after,before);
  assert.deepEqual(h.content,seed);assert.equal(h.dom.window.localStorage.length,0);assert.equal(h.container.childElementCount,0);
  assert.ok(h.calls.every(([kind]) => ['session','evaluate'].includes(kind)));
});

test('stale draft evaluation freezes rehearsal and never retries with a different token', async t => {
  let count = 0;
  const h = harness(t,{evaluate:async() => {count++;throw Object.assign(new Error('stale'),{status:409});}});
  await h.preview.ready;h.preview.go('apply');h.preview.setAnswer('fixture');await h.preview.submit();
  assert.match(h.container.textContent,/draft changed/);assert.equal(h.container.querySelector('[data-preview-content]').childElementCount,0);
  assert.throws(() => h.preview.retry(),/unavailable/);assert.throws(() => h.preview.go('learn'),/unavailable/);assert.equal(count,1);
});

test('exit drops late loads and evaluations and disposes shared renderer events', async t => {
  let resolveLoad, resolveEvaluation, exited = 0;
  const load = harness(t,{loadSession:() => new Promise(resolve => {resolveLoad=resolve;}),onExit:()=>exited++});
  load.preview.exit();resolveLoad(load.response);await load.preview.ready;
  assert.equal(load.views.length,0);assert.equal(exited,1);
  const h = harness(t,{evaluate:() => new Promise(resolve=>{resolveEvaluation=resolve;})});
  await h.preview.ready;h.preview.go('apply');h.preview.setAnswer('fixture');const pending = h.preview.submit();
  assert.throws(() => h.preview.go('learn'),/busy/);
  h.preview.exit();const renders = h.views.length;
  resolveEvaluation({mode:'draft-preview',persistent:false,draftToken:'fixture-token',result:{correct:true}});await pending;
  assert.equal(h.views.length,renders);assert.equal(h.container.childElementCount,0);
});

test('rehearsal rejects persistent, mismatched or malformed session responses', async t => {
  for (const patch of [{persistent:true},{draftToken:'wrong'},{lessonId:'wrong'},{steps:['bogus']},{steps:['learn','learn']}]) {
    let value;
    const h = harness(t,{loadSession:async() => {await Promise.resolve();return {...value,...patch};}});value = h.response;
    await h.preview.ready;assert.match(h.container.textContent,/Invalid draft preview/);assert.equal(h.views.length,0);
  }
  const h = harness(t,{evaluate:async() => ({mode:'draft-preview',persistent:true,draftToken:'fixture-token',result:{correct:true}})});
  await h.preview.ready;h.preview.go('apply');await h.preview.submit();assert.equal(h.views.at(-1).result,null);assert.match(h.container.textContent,/Invalid draft evaluation/);
});

test('media picker preserves supplied revision/hash/source fields, labels legacy references and retains rejection recovery', async t => {
  const dom = new JSDOM('<main></main>'), container = dom.window.document.querySelector('main');t.after(()=>dom.window.close());
  const asset = {assetId:'fixture-audio',revisionId:'fixture-revision',hash:'fixture-hash',url:'/media/fixture.mp3',source:{synthetic:true},extension:{retain:true}};
  const assets = [asset,'https://example.invalid/legacy.mp3',{url:'javascript:alert(1)',title:'<img src=x>'}];
  let calls = 0, selection;
  const dispose = mountMediaPicker(container,{assets,onSelected:async selected => {calls++;selection=selected;if(calls===1)throw new Error('Fixture save rejected');}});
  t.after(dispose);
  assert.equal(container.querySelector('img'),null);assert.match(container.textContent,/Unpinned legacy/);
  const buttons = container.querySelectorAll('[data-select-media]');assert.equal(buttons[2].disabled,true);
  buttons[0].click();await new Promise(resolve=>setImmediate(resolve));assert.match(container.textContent,/Fixture save rejected/);assert.equal(buttons[0].disabled,false);
  buttons[0].click();await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(selection,asset);selection.source.synthetic=false;assert.equal(asset.source.synthetic,true);
  dispose();buttons[1].click();assert.equal(calls,2);
});
