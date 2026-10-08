import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {JSDOM} from 'jsdom';
import {Store} from '../src/store.js';
import {composeSentence} from '../public/interactions.js';
import {stepExercises} from '../public/ux.js';
import {createLearnerRenderer} from '../public/preview/learner-renderer.js';
import {mountLessonPreview} from '../public/preview/lesson-preview.js';

// Synthetic rehearsal fixture: seed demo content with one labelled draft edit; no source curriculum.
const LABEL = 'who (synthetic rehearsal fixture)', profiles = ['learner-demo','learner-core','author-demo'];
const dump = s => JSON.stringify(s.db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(({name}) => [name, s.db.prepare('SELECT * FROM "' + name + '" ORDER BY 1').all()]));
async function settled(predicate) {for (let i = 0; i < 100; i++) {if (predicate()) return; await new Promise(r => setTimeout(r, 2));} throw new Error('Rehearsal condition did not settle.');}
function fixture(t) {
  const store = new Store(); t.after(() => store.close());
  const draft = structuredClone(store.snapshot()); draft.words.find(w => w.id === 'w-mi').english = LABEL;
  const staged = store.stage({baseRevisionId:store.get('active'), expectedDraftToken:null, content:draft});
  for (const user of profiles) store.attempt(user, {requestId:randomUUID(), revisionId:store.get('active'), exerciseId:'ex-1-type', answer:'אני'});
  for (const user of profiles) store.saveProgress(user, {lessonId:'lesson-2', revisionId:store.get('active'), step:'apply', question:1, answer:'learner draft ' + user, selectedTokens:[], matching:{}});
  return {store, draft, token:staged.draftToken};
}
function dom(t) {
  const d = new JSDOM('<main></main>', {url:'https://fixture.invalid', pretendToBeVisual:true}), w = d.window;
  t.after(() => w.close());
  const forbidden = [];
  w.fetch = (...args) => {forbidden.push(['window.fetch', args]); throw new Error('fetch is forbidden in rehearsal');};
  Object.defineProperty(w, 'localStorage', {get() {forbidden.push(['localStorage']); throw new Error('storage is forbidden in rehearsal');}});
  t.mock.method(globalThis, 'fetch', (...args) => {forbidden.push(['globalThis.fetch', args]); throw new Error('fetch is forbidden in rehearsal');});
  return {w, doc:w.document, container:w.document.querySelector('main'), forbidden};
}
// Direct adapter mount with recording actions, for DOM/action contract checks.
function direct(t, session, overrides = {}) {
  const env = dom(t), calls = [], played = [];
  let stops = 0;
  const actions = Object.fromEntries(['go','next','setAnswer','submit','retry','lookup','setPreference','exit'].map(name => [name, (...args) => {calls.push([name, ...structuredClone(args)]);}]));
  const renderer = createLearnerRenderer({playAudio:async (...args) => {played.push(args);}, stopMedia:() => {stops++;}});
  const props = {mode:'draft-preview', persistent:false, content:structuredClone(session.content), lessonId:'lesson-1', step:'check', question:0, exerciseId:'ex-1-recognize', answer:undefined, result:null, preferences:{nikkud:'full'}, lookupId:null, busy:false, actions, ...overrides};
  const dispose = renderer.mount(env.container, props);
  return {...env, calls, played, dispose, stops:() => stops, root:() => env.container.querySelector('[data-preview-root]')};
}
function previewHarness(t, store, token, lessonId, evaluateHook = input => store.previewEvaluate(input)) {
  const env = dom(t), evaluations = [];
  const preview = mountLessonPreview(env.container, {
    lessonId, draftToken:token, renderer:createLearnerRenderer(), preferences:{nikkud:'curated', keyboardVisible:false},
    loadSession:async input => store.previewSession(input),
    evaluate:async input => {evaluations.push(structuredClone(input)); return evaluateHook(input);}
  });
  t.after(() => preview.dispose());
  return {...env, preview, evaluations, root:() => env.container.querySelector('[data-preview-root]')};
}
function input(h, value) {const el = h.root().querySelector('#answer'); el.value = value; el.dispatchEvent(new h.w.Event('input', {bubbles:true}));}
function orderingSelection(tokens, prefixes, target) {
  const search = picked => {
    if (picked.length && composeSentence(tokens, picked, prefixes) === target) return picked;
    for (let i = 0; i < tokens.length; i++) if (!picked.includes(i)) {const found = search([...picked, i]); if (found) return found;}
    return null;
  };
  return search([]);
}

test('every seed exercise kind submits the learner wire answer through the real controller, is graded correct by the actual draft evaluator, and leaves every row of three profiles unchanged', async t => {
  const {store, draft, token} = fixture(t), before = dump(store), kinds = new Set();
  for (const lesson of draft.lessons) {
    const h = previewHarness(t, store, token, lesson.id);
    await h.preview.ready;
    const session = store.previewSession({lessonId:lesson.id, draftToken:token});
    assert.equal(h.container.querySelectorAll('[data-preview-root]').length, 1, 'one renderer root per mount');
    if (session.steps[0] === 'learn') {
      assert.ok(h.root().querySelector('.explanation'), 'learn step renders the shared lesson explanation');
      h.root().querySelector('[data-action="next-step"]').click();
      assert.equal(h.container.querySelector('[data-preview-step][aria-current="step"]').dataset.previewStep, session.steps[1], 'Continue advances through the controller');
    }
    for (const step of session.steps.filter(s => ['check','apply'].includes(s))) {
      const ids = stepExercises(session.content.lessons.find(l => l.id === lesson.id), step, []);
      for (const [question, id] of ids.entries()) {
        h.preview.go(step, question);
        const source = draft.exercises.find(e => e.id === id), shown = session.content.exercises.find(e => e.id === id);
        assert.equal(h.root().querySelector('.exercise-prompt').textContent, source.prompt);
        let expected;
        if (source.type === 'recognition') {
          expected = draft.words.find(w => w.id === source.wordId).english;
          Array.from(h.root().querySelectorAll('[data-action="choice"]')).find(el => el.dataset.value === expected).click();
          assert.ok(h.root().querySelector('[data-action="choice"].selected'), 'local choice re-renders selected');
        } else if (source.type === 'matching') {
          expected = Object.fromEntries(source.wordIds.map(wordId => [wordId, draft.words.find(w => w.id === wordId).english]));
          for (const [wordId, meaning] of Object.entries(expected)) {
            h.root().querySelector('[data-match-word="' + wordId + '"]').click();
            Array.from(h.root().querySelectorAll('[data-match-target]')).find(el => el.dataset.matchTarget === meaning).click();
          }
        } else if (source.type === 'ordering') {
          expected = source.answers[0];
          for (const index of orderingSelection(shown.tokens, shown.prefixTokenIndices, expected)) h.root().querySelector('[data-action="token"][data-value="' + index + '"]').click();
          assert.equal(h.root().querySelector('.assembled-sentence').textContent, expected);
        } else {
          expected = source.type === 'typing' ? draft.words.find(w => w.id === source.wordId).unpointed : source.answers[0];
          input(h, expected);
        }
        h.root().querySelector('[data-action="check"]').click();
        await settled(() => h.root()?.querySelector('.feedback'));
        assert.deepEqual(h.evaluations.at(-1), {lessonId:lesson.id, exerciseId:id, draftToken:token, answer:expected}, source.type + ' wire answer');
        assert.ok(!h.root().querySelector('.feedback').classList.contains('wrong'), source.type + ' graded correct by the draft evaluator');
        kinds.add(source.type);
      }
    }
    h.preview.exit();
    assert.equal(h.container.children.length, 0);
  }
  assert.deepEqual([...kinds].sort(), ['cloze','matching','ordering','recognition','transformation','typing']);
  assert.equal(dump(store), before, 'navigation, grading and exit change no row in any table');
});

test('wrong answers keep the local draft through re-renders, show the learner feedback, and retry clears only the rehearsal answer', async t => {
  const {store, token} = fixture(t), before = dump(store);
  const h = previewHarness(t, store, token, 'lesson-2');
  await h.preview.ready;
  h.preview.go('apply', 1);
  assert.equal(h.root().querySelector('.exercise-prompt').textContent.includes('missing word'), true);
  input(h, 'הוא');
  h.root().querySelector('#preview-nikkud').value = 'none';
  h.root().querySelector('#preview-nikkud').dispatchEvent(new h.w.Event('change', {bubbles:true}));
  assert.equal(h.root().querySelector('#preview-nikkud').value, 'none', 'setting re-rendered through the controller');
  assert.equal(h.root().querySelector('#answer').value, 'הוא', 'typed draft survives a controller re-render');
  h.preview.go('apply', 0); h.preview.go('apply', 1);
  assert.equal(h.root().querySelector('#answer').value, 'הוא', 'draft survives navigation away and back');
  h.root().querySelector('#answer').dispatchEvent(new h.w.KeyboardEvent('keydown', {key:'Enter', bubbles:true, cancelable:true}));
  await settled(() => h.root()?.querySelector('.feedback.wrong'));
  assert.equal(h.evaluations.length, 1); assert.equal(h.evaluations[0].answer, 'הוא');
  assert.match(h.root().querySelector('.feedback').textContent, /Your answer: הוא/);
  assert.equal(h.root().querySelector('#answer').disabled, true);
  h.root().querySelector('[data-action="retry-question"]').click();
  assert.equal(h.root().querySelector('.feedback'), null);
  assert.equal(h.root().querySelector('#answer').value, '');
  assert.equal(h.root().querySelector('#answer').disabled, false);
  // Ordering selection survives a step round trip, and empty submissions stay local.
  h.preview.go('apply', 0);
  h.root().querySelector('[data-action="check"]').click();
  assert.match(h.root().querySelector('[data-preview-message]').textContent, /Choose or enter an answer first/);
  assert.equal(h.evaluations.length, 1, 'blank answer is not sent');
  h.root().querySelector('[data-action="token"][data-value="2"]').click();
  h.preview.go('learn'); h.preview.go('apply', 0);
  assert.equal(h.root().querySelectorAll('[data-action="remove-token"]').length, 1);
  h.root().querySelector('[data-action="remove-token"]').click();
  assert.equal(h.root().querySelectorAll('[data-action="remove-token"]').length, 0);
  assert.equal(dump(store), before);
  assert.deepEqual(h.forbidden, []);
});

test('settings, keyboard, vocabulary and lookup controls call rehearsal actions and render a read-only entry', async t => {
  const {store, token} = fixture(t), session = store.previewSession({lessonId:'lesson-1', draftToken:token});
  const mi = session.content.words.find(w => w.id === 'w-mi');
  const a = direct(t, session, {preferences:{nikkud:'none'}});
  assert.match(a.root().querySelector('.hebrew.large').textContent, new RegExp(mi.unpointed), 'Nikkud preference drives the shared word rendering');
  assert.equal(a.root().querySelector('.preview-vocabulary-help'), null, 'lookup is unavailable before grading without allowLookup');
  a.root().querySelector('#preview-nikkud').value = 'full';
  a.root().querySelector('#preview-nikkud').dispatchEvent(new a.w.Event('change', {bubbles:true}));
  Array.from(a.root().querySelectorAll('[data-action="choice"]')).find(el => el.dataset.value === LABEL).click();
  a.root().querySelector('[data-action="check"]').click();
  assert.deepEqual(a.calls, [['setPreference','nikkud','full'], ['setAnswer',{text:LABEL, matching:{}, selectedTokens:[]}], ['setAnswer',{text:LABEL, matching:{}, selectedTokens:[]}], ['submit',LABEL]]);
  a.dispose();

  const graded = direct(t, session, {answer:{text:LABEL}, result:{correct:false, answer:LABEL, expected:'who'}});
  graded.root().querySelector('.preview-vocabulary-help [data-action="lookup"][data-value="w-mi"]').click();
  graded.root().querySelector('[data-action="retry-question"]').click();
  graded.root().querySelector('[data-action="next-question"]').click();
  assert.deepEqual(graded.calls, [['lookup','w-mi'], ['retry'], ['next']]);
  graded.dispose();

  const card = direct(t, session, {lookupId:'w-mi', step:'vocabulary', exerciseId:null, preferences:{vocabularyView:'cards'}});
  const aside = card.root().querySelector('.preview-lookup');
  assert.match(aside.textContent, new RegExp(LABEL.replace(/[()]/g, '\\$&')));
  assert.equal(card.root().querySelector('textarea,[data-action="bookmark"],[data-action="enroll"],form'), null, 'read-only: no notes, bookmarks, review or forms');
  aside.querySelector('[data-preview-lookup-close]').click();
  const firstCard = card.root().querySelector('.word-card [data-action="lookup"]').dataset.value;
  card.root().querySelector('.word-card [data-action="lookup"]').click();
  card.root().querySelector('[data-preview-pref="vocabularyView"][data-preview-value="table"]').click();
  card.root().querySelector('[data-action="audio"]:not(:disabled)')?.click();
  card.root().querySelector('[data-action="next-step"]').click();
  assert.deepEqual(card.calls.slice(0, 3), [['lookup',null], ['lookup',firstCard], ['setPreference','vocabularyView','table']]);
  assert.deepEqual(card.calls.at(-1), ['next']);
  card.dispose();
  const table = direct(t, session, {step:'vocabulary', exerciseId:null, preferences:{vocabularyView:'table'}});
  assert.ok(table.root().querySelector('table.vocabulary-table'));
  table.dispose();

  const keys = direct(t, session, {exerciseId:'ex-1-type', question:1, preferences:{keyboardVisible:false}});
  keys.root().querySelector('[data-preview-keyboard="show"]').click();
  assert.deepEqual(keys.calls, [['setPreference','keyboardVisible',true]]);
  keys.dispose();
  const pad = direct(t, session, {exerciseId:'ex-1-type', question:1, preferences:{keyboardVisible:true}});
  for (const key of ['א','נ','י','ה']) pad.root().querySelector('[data-preview-key="' + key + '"]').click();
  pad.root().querySelector('[data-preview-key=""]').click();
  assert.equal(pad.root().querySelector('#answer').value, 'אני');
  assert.deepEqual(pad.calls.at(-1), ['setAnswer',{text:'אני', matching:{}, selectedTokens:[]}]);
  pad.root().querySelector('[data-preview-keyboard="hide"]').click();
  assert.deepEqual(pad.calls.at(-1), ['setPreference','keyboardVisible',false]);
  pad.dispose();
  for (const h of [a, graded, card, table, keys, pad]) assert.deepEqual(h.forbidden, []);
});

test('dispose removes the root and every listener, stops media, and is idempotent', async t => {
  const {store, token} = fixture(t), session = store.previewSession({lessonId:'lesson-1', draftToken:token});
  const h = direct(t, session, {answer:{text:LABEL}});
  const root = h.root(), check = root.querySelector('[data-action="check"]'), choice = root.querySelector('[data-action="choice"]');
  assert.equal(root.hasAttribute('data-preview-root'), true);
  h.dispose(); h.dispose();
  assert.equal(h.container.querySelector('[data-preview-root]'), null);
  assert.equal(h.stops(), 1);
  check.click(); choice.click();
  root.dispatchEvent(new h.w.KeyboardEvent('keydown', {key:'1', bubbles:true}));
  root.dispatchEvent(new h.w.KeyboardEvent('keydown', {key:'Enter', bubbles:true}));
  h.container.dispatchEvent(new h.w.KeyboardEvent('keydown', {key:'Enter', bubbles:true}));
  assert.deepEqual(h.calls, [], 'detached handlers never reach actions after disposal');
  const source = readFileSync(new URL('../public/preview/learner-renderer.js', import.meta.url), 'utf8') + readFileSync(new URL('../public/learner-view.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /fetch\(|localStorage|sessionStorage|XMLHttpRequest|\/api\/|indexedDB|HebleoKeyboard|document\.|window\./, 'renderer has no network, storage or global DOM access');
});

test('busy rehearsal disables every control and ignores clicks and shortcuts; a pending check evaluates exactly once', async t => {
  const {store, token} = fixture(t), session = store.previewSession({lessonId:'lesson-1', draftToken:token});
  const h = direct(t, session, {busy:true, answer:{text:LABEL}});
  assert.equal(h.root().getAttribute('aria-busy'), 'true');
  assert.deepEqual(Array.from(h.root().querySelectorAll('button,input,select')).filter(el => !el.disabled), []);
  h.root().querySelector('[data-action="check"]').dispatchEvent(new h.w.MouseEvent('click', {bubbles:true}));
  h.root().dispatchEvent(new h.w.KeyboardEvent('keydown', {key:'Enter', bubbles:true}));
  h.root().dispatchEvent(new h.w.KeyboardEvent('keydown', {key:'2', bubbles:true}));
  assert.deepEqual(h.calls, []);

  let release;
  const p = previewHarness(t, store, token, 'lesson-1', input => new Promise(resolve => {release = () => resolve(store.previewEvaluate(input));}));
  await p.preview.ready;
  p.preview.go('check', 0);
  p.root().querySelectorAll('[data-action="choice"]')[0].click();
  p.root().querySelector('[data-action="check"]').click();
  assert.equal(p.root().getAttribute('aria-busy'), 'true');
  p.root().querySelector('[data-action="check"]').click();
  p.root().dispatchEvent(new p.w.KeyboardEvent('keydown', {key:'Enter', bubbles:true, cancelable:true}));
  p.root().dispatchEvent(new p.w.KeyboardEvent('keydown', {key:'2', bubbles:true, cancelable:true}));
  assert.equal(p.evaluations.length, 1);
  release();
  await settled(() => p.root()?.querySelector('.feedback'));
  assert.equal(p.evaluations.length, 1);
  assert.equal(p.root().getAttribute('aria-busy'), null);
  assert.equal(p.container.querySelectorAll('[data-preview-root]').length, 1);
});
