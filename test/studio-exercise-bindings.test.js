import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
import {seed} from '../src/seed.js';
import {Store} from '../src/store.js';
import {createServer} from '../src/server.js';
import {exerciseVocabularySurfaces, validateExerciseVocabularyBindings} from '../public/exercise-bindings.js';
import {applyExerciseEdits, exerciseTypes, mountExerciseEditor, validateExerciseDraft} from '../public/studio/exercise-editor.js';
import {mountUnifiedStudio} from '../public/studio/unified-studio.js';

// Synthetic-only content, JSDOM interactions and disposable in-memory stores.
const fixture = () => structuredClone(seed);
const tables = store => JSON.stringify(store.db.prepare("SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name").all()
  .map(({name}) => [name, store.db.prepare('SELECT * FROM "' + name + '" ORDER BY 1').all()]));
const dom = () => new JSDOM('<main></main>', {url:'http://127.0.0.1/', pretendToBeVisual:true, runScripts:'outside-only'});
const input = (d, el, value) => {el.value = value; el.dispatchEvent(new d.window.Event('input', {bubbles:true}));};
const controlChange = (d, el, value) => {el.value = value; el.dispatchEvent(new d.window.Event('change', {bubbles:true}));};
const panel = host => host.querySelector('[data-exercise-bindings-editor]');
const binding = (exercise, {field='prompt', index, start=0, end, id='existing-occurrence', wordId='w-mi'} = {}) => {
  const sourceText = index === undefined ? exercise[field] : exercise[field][index]; end ??= sourceText.length;
  return {id, wordId, field, ...(index === undefined ? {} : {index}), start, end, text:sourceText.slice(start, end), sourceText};
};
function select(d, owner, field, index, start=0, end, event='select') {
  controlChange(d, owner.querySelector('[data-binding-surface]'), field + ':' + (index ?? ''));
  const source = owner.querySelector('[data-binding-source]');
  source.setSelectionRange(start, end ?? source.value.length);
  source.dispatchEvent(new d.window.Event(event, {bubbles:true}));
  return source;
}
function choose(owner, id) {owner.querySelector('[data-binding-picker] [data-vocab-id="' + id + '"]').click();}
function link(owner) {assert.equal(owner.querySelector('[data-binding-apply]').disabled, false); owner.querySelector('[data-binding-apply]').click();}
function editor(t, content, exercise, config={}) {
  const d = dom(), host = d.window.document.querySelector('main');
  const mount = mountExerciseEditor(host, {content, exerciseId:exercise.id, baseRevisionId:1, saveDraft:()=>{}, ...config});
  t.after(()=>{mount(); d.window.close();});
  return {d, host, mount, owner:panel(host)};
}
async function submit(d, host) {
  host.querySelector('[data-exercise-editor]').dispatchEvent(new d.window.Event('submit', {bubbles:true, cancelable:true}));
  await new Promise(resolve=>setImmediate(resolve));
}

for (const type of exerciseTypes) test(type + ': author every supported surface, retain exact snapshots/IDs and reload a real draft', async t => {
  const content = fixture(), exercise = content.exercises.find(exercise=>exercise.type===type), store = new Store(); t.after(()=>store.close());
  exercise.prompt = 'SYNTHETIC שָׁ 👩‍🏫 e\u0301 \u200f'; exercise.context = 'SYNTHETIC context';
  exercise.feedback = 'SYNTHETIC feedback'; exercise.feedbackDetails = 'SYNTHETIC detailed feedback';
  if (type==='typing') exercise.answers = ['SYNTHETIC authored answer'];
  const surfaces = exerciseVocabularySurfaces(exercise), original = structuredClone(content), before = tables(store);
  const {d, host, mount, owner} = editor(t, content, exercise, {saveDraft:request=>store.stage(request)});
  assert.deepEqual(mount.getEdits(), {});
  assert.equal(owner.querySelectorAll('[data-binding-surface] option').length, surfaces.length);
  assert.equal(host.querySelectorAll('form form').length, 0);
  surfaces.forEach((surface, i)=>{
    select(d, owner, surface.field, surface.index, 0, undefined, i%2 ? 'keyup' : 'mouseup');
    choose(owner, 'w-mi'); link(owner);
  });
  const authored = mount.snapshot(), links = authored.vocabularyBindings;
  assert.equal(links.length, surfaces.length); assert.equal(new Set(links.map(link=>link.id)).size, links.length);
  surfaces.forEach((surface, i)=>assert.deepEqual(links[i], {...surface, id:links[i].id, wordId:'w-mi', start:0, end:surface.sourceText.length, text:surface.sourceText}));
  validateExerciseVocabularyBindings(authored, content.words);
  assert.equal(tables(store), before); assert.deepEqual(content, original);
  await submit(d, host);
  assert.match(host.querySelector('[data-editor-status]').textContent, /Draft saved/);
  const saved = store.currentDraft().content, reloaded = editor(t, saved, saved.exercises.find(e=>e.id===exercise.id));
  assert.deepEqual(reloaded.mount.snapshot(), authored); assert.deepEqual(reloaded.mount.getEdits(), {});
  assert.deepEqual(store.snapshot(), seed);
});

test('rebind keeps occurrence identity, remove is local until Save, unrelated fields and absent optional bindings stay exact', async t => {
  const content = fixture(), exercise = content.exercises.find(e=>e.type==='cloze');
  exercise.prompt = 'SYNTHETIC one two'; exercise.vocabularyBindings = [binding(exercise, {end:9})];
  exercise.extension = {source:'SYNTHETIC', exact:' \u200fשָׁ '}; const original = structuredClone(exercise);
  let saves = 0; const {d, host, mount, owner} = editor(t, content, exercise, {saveDraft:()=>{saves++; return {draftToken:'synthetic-token'};}});
  owner.querySelector('[data-binding-rebind]').click(); choose(owner, 'w-hu'); link(owner);
  assert.equal(mount.snapshot().vocabularyBindings[0].id, 'existing-occurrence');
  assert.equal(mount.snapshot().vocabularyBindings[0].wordId, 'w-hu');
  assert.equal(saves, 0);
  select(d, owner, 'prompt', undefined, 14, 17); choose(owner, 'w-mi'); link(owner);
  const secondId = mount.snapshot().vocabularyBindings[1].id; assert.notEqual(secondId, 'existing-occurrence');
  owner.querySelector('[data-binding-remove="0"]').click();
  assert.equal(mount.snapshot().vocabularyBindings[0].id, secondId); assert.equal(saves, 0);
  owner.querySelector('[data-binding-remove="0"]').click(); assert.deepEqual(mount.getEdits(), {vocabularyBindings:[]});
  await submit(d, host); assert.equal(saves, 1);
  assert.deepEqual(mount.snapshot(), {...original, vocabularyBindings:[]});
  const unbound = content.exercises.find(e=>e.type==='matching');
  assert.equal(Object.hasOwn(applyExerciseEdits(unbound, {}), 'vocabularyBindings'), false);
  assert.throws(()=>applyExerciseEdits(unbound, {vocabularyBindings:'invalid'}), /must be a list/);
});

test('stale surfaces remain visible, validation carries exerciseId, and explicit rebind repairs the stored snapshot', t => {
  const content = fixture(), exercise = content.exercises.find(e=>e.type==='cloze');
  exercise.prompt = 'SYNTHETIC original'; exercise.vocabularyBindings = [binding(exercise)];
  const {d, host, mount, owner} = editor(t, content, exercise);
  input(d, host.querySelector('[name=prompt]'), 'SYNTHETIC edited');
  assert.equal(mount.snapshot().vocabularyBindings[0].sourceText, 'SYNTHETIC original');
  assert.match(owner.textContent, /Needs repair/); assert.match(owner.textContent, /rebind after editing/);
  assert.throws(()=>validateExerciseDraft(mount.snapshot(), content), error=>error.exerciseId===exercise.id && /sourceText/.test(error.message));
  owner.querySelector('[data-binding-rebind]').click(); select(d, owner, 'prompt'); link(owner);
  const saved = mount.snapshot(); assert.equal(saved.vocabularyBindings[0].id, 'existing-occurrence');
  assert.equal(saved.vocabularyBindings[0].sourceText, 'SYNTHETIC edited');
  assert.equal(validateExerciseDraft(saved, content), saved);
});

test('grapheme splits, empty selection and overlapping ranges cannot create links; exact Nikkud/emoji/combining text can', t => {
  const content = fixture(), exercise = content.exercises.find(e=>e.type==='cloze');
  exercise.prompt = 'שָׁ 👩‍🏫 e\u0301'; const {d, owner, mount} = editor(t, content, exercise);
  choose(owner, 'w-mi');
  for (const [start, end] of [[0,1], [4,5], [10,11]]) {
    select(d, owner, 'prompt', undefined, start, end); link(owner);
    assert.equal(mount.snapshot().vocabularyBindings, undefined);
    assert.match(owner.querySelector('[data-binding-status]').textContent, /grapheme/);
  }
  select(d, owner, 'prompt', undefined, 0, 0); assert.equal(owner.querySelector('[data-binding-apply]').disabled, true);
  select(d, owner, 'prompt', undefined, 0, 3); link(owner);
  select(d, owner, 'prompt', undefined, 0, 3); link(owner);
  assert.equal(mount.snapshot().vocabularyBindings.length, 1); assert.match(owner.querySelector('[data-binding-status]').textContent, /overlapping/);
  select(d, owner, 'prompt', undefined, 4, 9); link(owner);
  select(d, owner, 'prompt', undefined, 10, 12); link(owner);
  assert.deepEqual(mount.snapshot().vocabularyBindings.map(binding=>binding.text), ['שָׁ','👩‍🏫','e\u0301']);
  const invalid = mount.snapshot(); invalid.vocabularyBindings[0].end=1; invalid.vocabularyBindings[0].text='ש';
  assert.throws(()=>validateExerciseDraft(invalid, content), error=>error.exerciseId===exercise.id && /grapheme/.test(error.message));
});

test('read-only selection preserves CRLF/CR UTF16 offsets and cannot become a Hebrew keyboard edit target', t => {
  const content = fixture(), exercise = content.exercises.find(e=>e.type==='cloze');
  exercise.prompt = '\r\nשָׁ\r\n👩‍🏫\re\u0301\u200f';
  const {d, host, owner, mount} = editor(t, content, exercise);
  const source = select(d, owner, 'prompt', undefined, 5, 10, 'keyup'); choose(owner, 'w-mi'); link(owner);
  assert.deepEqual(mount.snapshot().vocabularyBindings[0], binding(exercise, {id:mount.snapshot().vocabularyBindings[0].id, start:7, end:12}));
  assert.equal(source.value, exercise.prompt.replace(/\r\n?/g, '\n')); assert.equal(source.readOnly, true); assert.equal(source.name, '');
  // Run the established owner in JSDOM; this is not native keyboard acceptance.
  d.window.eval(readFileSync(new URL('../public/keyboard-owner.js', import.meta.url), 'utf8'));
  d.window.document.dispatchEvent(new d.window.Event('DOMContentLoaded'));
  source.focus(); source.dispatchEvent(new d.window.MouseEvent('click', {bubbles:true}));
  assert.equal(source.hasAttribute('data-hebleo-keyboard-target'), false);
  assert.equal(host.querySelectorAll('[data-exercise-bindings-editor] input[name],[data-exercise-bindings-editor] textarea[name]').length, 0);
});

for (const field of ['tokens','answers']) test('row removal never silently remaps ' + field + ', including byte-identical rows', t => {
  const content = fixture(), exercise = content.exercises.find(e=>e.type==='ordering');
  exercise[field] = ['SYNTHETIC same', 'SYNTHETIC same', 'SYNTHETIC different']; exercise.prefixTokenIndices = [];
  exercise.vocabularyBindings = [binding(exercise, {field, index:1}), binding(exercise, {field, index:2, id:'last-row'})];
  const {d, host, owner, mount} = editor(t, content, exercise);
  select(d, owner, field, 1); choose(owner, 'w-mi');
  host.querySelector('[data-list="'+field+'"] [data-list-remove]').click();
  assert.equal(owner.querySelector('[data-binding-excerpt]').textContent, 'None');
  assert.equal(owner.querySelector('[data-binding-apply]').disabled, true);
  assert.match(owner.textContent, /Row position changed/);
  assert.throws(()=>mount.snapshot(), error=>error.exerciseId===exercise.id && /row position changed/.test(error.message));
  owner.querySelector('[data-binding-rebind="0"]').click(); select(d, owner, field, 0); choose(owner, 'w-mi'); link(owner);
  owner.querySelector('[data-binding-rebind="1"]').click(); select(d, owner, field, 1); link(owner);
  assert.deepEqual(mount.snapshot().vocabularyBindings.map(binding=>[binding.id,binding.index]), [['existing-occurrence',0],['last-row',1]]);
  validateExerciseVocabularyBindings(mount.snapshot(), content.words);
});

test('binding search/paging is bounded UI state, incomplete unrelated input preserves selection and local links', async t => {
  const content = fixture(), exercise = content.exercises.find(e=>e.type==='cloze');
  content.words.push(...Array.from({length:120}, (_,i)=>({...content.words[0], id:'synthetic-'+i, english:'SYNTHETIC entry '+i})));
  let changes=0, writes=0; const {d, host, owner, mount} = editor(t, content, exercise, {onChanged:()=>changes++, saveDraft:()=>writes++});
  const search = owner.querySelector('[data-vocab-search]'); input(d, search, 'SYNTHETIC');
  assert.equal(owner.querySelectorAll('[data-vocab-row]').length, 50);
  owner.querySelector('[data-vocab-page="1"]').click(); choose(owner, 'synthetic-50');
  select(d, owner, 'prompt'); const excerpt=owner.querySelector('[data-binding-excerpt]').textContent;
  assert.equal(changes, 0); assert.deepEqual(mount.getEdits(), {});
  input(d, host.querySelector('[name=explanationTime]'), '-1');
  assert.equal(owner.querySelector('[data-binding-excerpt]').textContent, excerpt);
  link(owner); assert.equal(changes, 2);
  await submit(d, host); assert.equal(writes, 0);
  assert.match(host.querySelector('[data-editor-status]').textContent, /nonnegative/);
  input(d, host.querySelector('[name=explanationTime]'), '0');
  assert.equal(mount.snapshot().vocabularyBindings[0].wordId, 'synthetic-50');
});

test('unified HTTP Save/CAS/reload retains bindings and siblings; conflicts keep edits, selection and every persisted table', async t => {
  const store = new Store(), server = createServer(store); await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(async()=>{await new Promise(resolve=>server.close(resolve)); store.close();});
  const origin='http://127.0.0.1:'+server.address().port, requests=[];
  const saveDraft=async request=>{
    requests.push(structuredClone(request));
    const response=await fetch(origin+'/api/studio/draft', {method:'POST', headers:{'content-type':'application/json','x-demo-user':'author-demo'}, body:JSON.stringify(request)});
    const result=await response.json(); if(!response.ok)throw Object.assign(new Error(result.error), {status:response.status,...result}); return result;
  };
  const content=fixture(), exercise=content.exercises.find(e=>e.id==='ex-1-recognize'), d=dom(), host=d.window.document.querySelector('main');
  const ui=mountUnifiedStudio(host,{content,lessonId:exercise.lessonId,baseRevisionId:1,saveDraft}); t.after(()=>{ui.dispose(); d.window.close();});
  let owner=panel(host.querySelector('[data-owned-exercise="'+exercise.id+'"]'));
  const before=tables(store); select(d,owner,'prompt'); choose(owner,'w-mi'); link(owner);
  input(d,host.querySelector('[name=title]'),'SYNTHETIC sibling title'); assert.equal(ui.isDirty(),true);
  assert.equal(requests.length,0); assert.equal(tables(store),before);
  await ui.save(); assert.equal(requests.length,1); const firstToken=store.currentDraft().draftToken;
  const savedBinding=store.currentDraft().content.exercises.find(e=>e.id===exercise.id).vocabularyBindings[0];
  assert.equal(store.currentDraft().content.lessons[0].title,'SYNTHETIC sibling title');
  owner=panel(host.querySelector('[data-owned-exercise="'+exercise.id+'"]'));
  assert.match(owner.textContent, new RegExp(savedBinding.id));
  owner.querySelector('[data-binding-rebind]').click(); choose(owner,'w-hu'); link(owner);
  // Keep another unsaved selection in the mounted control while a sibling invalidates CAS.
  const source=select(d,owner,'prompt',undefined,0,5); const excerpt=owner.querySelector('[data-binding-excerpt]').textContent;
  const external=store.currentDraft().content; external.lessons[0].title='SYNTHETIC competing author';
  store.stage({baseRevisionId:1,expectedDraftToken:firstToken,content:external}); const competing=tables(store);
  await assert.rejects(ui.save(), error=>error.status===409);
  assert.equal(tables(store),competing); assert.equal(source.isConnected,true);
  assert.equal(source.selectionStart,0); assert.equal(source.selectionEnd,5);
  assert.equal(owner.querySelector('[data-binding-excerpt]').textContent,excerpt);
  assert.equal(owner.querySelector('[data-binding-apply]').disabled,false);
  assert.equal(ui.getContent().exercises.find(e=>e.id===exercise.id).vocabularyBindings[0].wordId,'w-hu');
  assert.equal(ui.getContent().exercises.find(e=>e.id===exercise.id).vocabularyBindings[0].id,savedBinding.id);
  assert.equal(requests[1].expectedDraftToken,firstToken); assert.match(host.querySelector('[data-unified-status]').textContent,/retained/);
  assert.deepEqual(store.snapshot(), seed);
});

test('pending/error standalone Save restores the original control states and preserves selection for explicit retry', async t => {
  const content=fixture(), exercise=content.exercises.find(e=>e.type==='cloze'), store=new Store(); t.after(()=>store.close());
  exercise.context='SYNTHETIC context for selection';
  let calls=0, rejectSave, retry=false; const before=tables(store);
  const {d,host,owner,mount}=editor(t,content,exercise,{saveDraft:request=>{
    calls++; return retry ? store.stage(request) : new Promise((_resolve,reject)=>{rejectSave=reject;});
  }});
  select(d,owner,'prompt'); choose(owner,'w-mi'); link(owner);
  const source=select(d,owner,'context',undefined,0,2), excerpt=owner.querySelector('[data-binding-excerpt]').textContent;
  const states=[...host.querySelectorAll('input,select,textarea,button')].map(el=>[el,el.disabled]);
  await submit(d,host); await submit(d,host); assert.equal(calls,1);
  assert.ok(states.every(([el])=>el.disabled));
  rejectSave(new Error('SYNTHETIC transport failure')); await new Promise(resolve=>setImmediate(resolve));
  assert.match(host.querySelector('[data-editor-status]').textContent,/SYNTHETIC transport failure/);
  assert.ok(states.every(([el,disabled])=>el.disabled===disabled));
  assert.equal(source.selectionStart,0); assert.equal(source.selectionEnd,2);
  assert.equal(owner.querySelector('[data-binding-excerpt]').textContent,excerpt);
  assert.equal(mount.snapshot().vocabularyBindings.length,1); assert.equal(tables(store),before);
  retry=true; await submit(d,host); assert.equal(calls,2);
  assert.equal(store.currentDraft().content.exercises.find(e=>e.id===exercise.id).vocabularyBindings.length,1);
});

test('unified validation failure focuses the exercise and keeps exact stale links plus the pending selection without any Stage', async t => {
  const content=fixture(), exercise=content.exercises.find(e=>e.id==='ex-1-recognize');
  exercise.vocabularyBindings=[binding(exercise)]; let writes=0;
  const d=dom(), host=d.window.document.querySelector('main'), ui=mountUnifiedStudio(host,{content,lessonId:exercise.lessonId,baseRevisionId:1,saveDraft:()=>writes++});
  t.after(()=>{ui.dispose();d.window.close();});
  const form=host.querySelector('[data-owned-exercise="'+exercise.id+'"] form'), owner=panel(form);
  input(d,form.querySelector('[name=prompt]'),'SYNTHETIC edited surface');
  select(d,owner,'prompt',undefined,0,9); choose(owner,'w-mi');
  await assert.rejects(ui.save(),error=>error.exerciseId===exercise.id && /sourceText/.test(error.message));
  assert.equal(writes,0); assert.equal(d.window.document.activeElement,form.querySelector('[name=prompt]'));
  assert.equal(owner.querySelector('[data-binding-excerpt]').textContent,'SYNTHETIC');
  assert.equal(owner.querySelector('[data-binding-source]').selectionEnd,9);
  assert.deepEqual(ui.getContent().exercises.find(e=>e.id===exercise.id).vocabularyBindings,exercise.vocabularyBindings);
  assert.match(owner.textContent,/Needs repair/);
});
