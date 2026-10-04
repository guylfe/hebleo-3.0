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
  h.preview.setAnswer({text:'Fixture-only supplied answer',matching:{},selectedTokens:[]});await h.preview.submit('Fixture-only supplied answer');
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

test('renderer wire answers for six families are sent separately from the retained response draft', async t => {
  for (const type of ['recognition','typing','cloze','transformation','ordering','matching']) {
    const h=harness(t);await h.preview.ready;
    const item=h.content.exercises.find(x=>x.type===type), lesson=h.content.lessons[0];
    // Put each synthetic exercise on the existing lesson; only transport is tested here.
    h.response.content.lessons[0].exerciseIds=[item.id];
    h.response.content.lessons[0].checkExerciseIds=[];
    h.response.steps=lessonSteps(h.response.content.lessons[0]);
    h.response.content.exercises.find(x=>x.id===item.id).lessonId=lesson.id;
    const draft={text:'Typed fixture text',matching:{'fixture-word':'Fixture meaning'},selectedTokens:[1,0]};
    const wire=type==='matching'?{'fixture-word':'Fixture meaning'}:type==='ordering'?'Composed fixture sentence':'Fixture wire text';
    h.preview.dispose();
    const renderer={mount(body,view){h.views.push(view);return ()=>body.replaceChildren();}};
    const preview=mountLessonPreview(h.container,{lessonId:lesson.id,draftToken:'fixture-token',renderer,
      loadSession:async()=>h.response,evaluate:async input=>{h.calls.push(['evaluate',structuredClone(input)]);return {mode:'draft-preview',persistent:false,draftToken:'fixture-token',result:{exerciseId:item.id,lessonId:lesson.id,answer:input.answer,correct:false,expected:'fixture'}};}});
    t.after(()=>preview.dispose());await preview.ready;preview.go('apply');preview.setAnswer(draft);
    await h.views.at(-1).actions.submit(wire);
    assert.deepEqual(h.calls.at(-1)[1],{lessonId:lesson.id,exerciseId:item.id,draftToken:'fixture-token',answer:wire});
    assert.deepEqual(h.views.at(-1).answer,draft);assert.deepEqual(h.views.at(-1).result.answer,wire);
    preview.go('learn');preview.go('apply');assert.deepEqual(h.views.at(-1).answer,draft);
  }
});

test('both conflict codes freeze session loading and evaluation; missing preview targets fail closed', async t => {
  for (const phase of ['loadSession','evaluate']) for (const [status,code] of [[409,'DRAFT_CONFLICT'],[409,'STALE_BASE'],[404,'PREVIEW_TARGET_NOT_FOUND']]) {
    const h=harness(t,{[phase]:async()=>{throw Object.assign(new Error('Fixture target unavailable'),{statusCode:status,code});}});
    await h.preview.ready;
    if(phase==='evaluate'){h.preview.go('apply');await h.preview.submit('Fixture answer');}
    assert.match(h.container.textContent,status===409?/draft changed/:/Fixture target unavailable/);
    assert.equal(h.container.querySelector('[data-preview-content]').childElementCount,0);
    assert.throws(()=>h.preview.go('learn'),/unavailable/);
    h.preview.exit();assert.equal(h.container.childElementCount,0);
  }
});

test('INVALID_ANSWER leaves the response draft available for correction and retry', async t => {
  let count=0;
  const h=harness(t,{evaluate:async input=>{count++;if(count===1)throw Object.assign(new Error('Malformed answer'),{status:400,code:'INVALID_ANSWER'});return {mode:'draft-preview',persistent:false,draftToken:'fixture-token',result:{correct:true,answer:input.answer}};}});
  await h.preview.ready;h.preview.go('apply');const draft={text:'Fixture text',matching:{},selectedTokens:[]};h.preview.setAnswer(draft);
  await h.preview.submit(undefined);assert.match(h.container.textContent,/Malformed answer/);assert.deepEqual(h.views.at(-1).answer,draft);
  await h.preview.submit('Corrected fixture wire');assert.equal(h.views.at(-1).result.correct,true);assert.deepEqual(h.views.at(-1).answer,draft);
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
  const asset = {assetId:'fixture-audio',revisionId:'fixture-revision',sha256:'a'.repeat(64),url:'/media/fixture.mp3',source:{synthetic:true},extension:{retain:true}};
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

test('pinned sha256 media can be selected without a URL; unsafe supplied URLs remain disabled', async t => {
  const dom=new JSDOM('<main></main>'),container=dom.window.document.querySelector('main');t.after(()=>dom.window.close());
  const pinned={assetId:'fixture-only',revisionId:'r1',sha256:'b'.repeat(64),unknown:{preserve:true}};
  const assets=[pinned,{...pinned,url:'javascript:alert(1)'},{...pinned,sha256:undefined,hash:'legacy-hash',url:'/media/legacy.mp3'}];let selected;
  const dispose=mountMediaPicker(container,{assets,onSelected:asset=>{selected=asset;}});t.after(dispose);
  const buttons=container.querySelectorAll('[data-select-media]');assert.equal(buttons[0].disabled,false);assert.equal(buttons[1].disabled,true);
  assert.match(container.textContent,/SHA-256/);assert.match(container.querySelectorAll('article')[2].textContent,/Unpinned legacy/);
  buttons[0].click();await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(selected,pinned);assert.notEqual(selected,pinned);
});
