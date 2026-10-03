import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Store, normalizeHebrew, validateContent } from '../src/store.js';
import { seed } from '../src/seed.js';
import { resolveBlock } from '../public/content.js';

const learner = 'learner-demo';
const copy = value => structuredClone(value);
function setup(t) { const s = new Store(); t.after(() => s.close()); return s; }
function answer(s, exerciseId, value, revisionId = s.get('active'), requestId = randomUUID()) { return s.attempt(learner, { requestId, exerciseId, answer: value, revisionId }); }
const fails = (fn, status = 400) => assert.throws(fn, error => error.status === status);

test('Hebrew normalization permits vowels, punctuation and direction controls but not misspellings or final-letter substitutions', () => {
  assert.equal(normalizeHebrew(' \u200fאֲנִי! '), 'אני');
  assert.notEqual(normalizeHebrew('שם'), normalizeHebrew('שמ'));
  assert.notEqual(normalizeHebrew('אֲנִי', true), normalizeHebrew('אני', true));
});
test('all six exercise families grade submitted answers; lessons complete and enroll words', t => {
  const s = setup(t);
  const answers = ['who', 'אני', { 'w-hu': 'he', 'w-hi': 'she', 'w-mi': 'who' }, 'אני בבית', 'היא', 'היא בבית', 'writes (feminine singular)', 'היא כותבת', 'היא כותבת פה'];
  seed.exercises.forEach((e, i) => assert.equal(answer(s, e.id, answers[i]).correct, true, e.id));
  assert.deepEqual(s.learner(learner).completed, seed.lessons.map(l => l.id));
  assert.equal(Object.keys(s.learner(learner).cards).length, 10);
  assert.equal(answer(s, 'ex-3-transform', 'היא כותב').correct, false);
});
test('nikkud-required typing rejects the unpointed alternative', t => {
  const s = setup(t); const content = copy(seed); content.exercises[1].requireNikkud = true;
  s.stage({ baseRevisionId: 1, content }); s.publish(1);
  assert.equal(answer(s, 'ex-1-type', 'אני').correct, false);
  assert.equal(answer(s, 'ex-1-type', 'אֲנִי').correct, true);
});
test('duplicate attempts are idempotent and conflicting payloads fail', t => {
  const s = setup(t); const requestId = randomUUID();
  answer(s, 'ex-1-type', 'אני', 1, requestId);
  assert.equal(answer(s, 'ex-1-type', 'אני', 1, requestId).duplicate, true);
  fails(() => answer(s, 'ex-1-type', 'היא', 1, requestId), 409);
  assert.equal(s.learner(learner).attempts.length, 1);
});
test('draft publication and rollback propagate vocabulary while retaining progress and pinned answers', t => {
  const s = setup(t); answer(s, 'ex-1-type', 'אני'); s.enroll(learner, 'w-mi');
  s.updateLearner(learner, { bookmark: 'w-mi', note: { wordId: 'w-mi', text: 'My connection' } });
  const before = s.learner(learner);
  const preview = s.stage({ baseRevisionId: 1, word: { id: 'w-mi', english: 'who (updated demo)' } });
  assert.deepEqual(preview.affectedLessons, ['lesson-1']);
  assert.equal(s.snapshot().words[1].english, 'who');
  s.publish(1);
  assert.equal(s.bootstrap(learner).due[0].word.english, 'who (updated demo)');
  assert.equal(s.bootstrap(learner).content.exercises[0].choices.includes('who (updated demo)'), true);
  assert.equal(answer(s, 'ex-1-recognize', 'who', 1).correct, true);
  assert.equal(answer(s, 'ex-1-recognize', 'who', 2).correct, false);
  assert.equal(answer(s, 'ex-1-recognize', 'who (updated demo)', 2).correct, true);
  s.rollback(1, 2);
  assert.equal(s.get('active'), 3);
  assert.equal(s.snapshot().words[1].english, 'who');
  assert.deepEqual(s.learner(learner).cards, before.cards);
  assert.deepEqual(s.learner(learner).notes, before.notes);
  assert.deepEqual(s.learner(learner).bookmarks, before.bookmarks);
  assert.equal(s.learner(learner).attempts.length, 4);
  fails(() => s.publish(1));
  fails(() => s.stage({ baseRevisionId: 1, content: seed }), 409);
});
test('manifest selectors use canonical source objects and permit changing component order', () => {
  const content = copy(seed); const l = content.lessons[0];
  l.blocks.unshift(l.blocks.splice(1, 1)[0]); validateContent(content);
  assert.equal(l.blocks[0].type, 'vocabulary');
  assert.equal(resolveBlock(content, l, l.blocks[0])[0], content.words[0]);
  l.blocks[0].selector.lessonId = 'lesson-2';
  assert.equal(resolveBlock(content, l, l.blocks[0]).length, 7);
});
test('invalid imports fail without changing the active revision or existing draft', t => {
  const s = setup(t); s.stage({ baseRevisionId: 1, word: { id: 'w-mi', notes: 'Staged note' } }); const before = s.active();
  const cases = [c => c.words.push(copy(c.words[0])), c => c.words[0].id = 'bad"id', c => c.lessons[0].wordIds.push('missing'), c => c.lessons[0].blocks[1].source = 'unknown', c => c.lessons[0].blocks[1].selector.lessonId = 'missing', c => c.lessons[0].blocks[0].renderer = 'html', c => c.exercises[0].type = 'unknown', c => c.words[0] = null];
  for (const mutate of cases) { const content = copy(seed); mutate(content); fails(() => s.stage({ baseRevisionId: 1, content })); assert.deepEqual(s.active(), before); }
});
test('membership cancellation preserves course and core review; refunds gate practice but retain data', t => {
  const s = setup(t); s.enroll(learner, 'w-mi'); answer(s, 'ex-1-type', 'אני');
  const eventId = randomUUID(); s.entitlement(learner, { eventId, type: 'membership_cancelled' });
  assert.equal(s.entitlement(learner, { eventId, type: 'membership_cancelled' }).duplicate, true);
  fails(() => s.entitlement(learner, { eventId, type: 'course_refunded' }), 409);
  assert.equal(s.learner(learner).membership, false);
  assert.equal(s.bootstrap(learner).due.length, 1);
  s.review(learner, { wordId: 'w-mi', rating: 1, requestId: randomUUID() });
  s.entitlement(learner, { eventId: randomUUID(), type: 'course_refunded' });
  assert.equal(s.bootstrap(learner).due.length, 0);
  fails(() => answer(s, 'ex-1-type', 'אני'), 403);
  fails(() => s.enroll(learner, 'w-hi'), 403);
  fails(() => s.review(learner, { wordId: 'w-mi', rating: 3, requestId: randomUUID() }), 403);
  assert.equal(s.learner(learner).attempts.length, 1);
  s.entitlement(learner, { eventId: randomUUID(), type: 'course_purchased' });
  assert.equal(s.learner(learner).cards['w-mi'].repetitions, 1);
});
test('review ratings schedule and deduplicate without pretending to use FSRS', t => {
  const s = setup(t); s.enroll(learner, 'w-mi'); const requestId = randomUUID();
  const result = s.review(learner, { wordId: 'w-mi', rating: 3, requestId });
  assert.equal(result.card.intervalDays, 2);
  assert.equal(s.review(learner, { wordId: 'w-mi', rating: 3, requestId }).duplicate, true);
  assert.equal(s.learner(learner).cards['w-mi'].repetitions, 1);
  fails(() => s.review(learner, { wordId: 'w-mi', rating: 4, requestId }), 409);
  assert.match(s.bootstrap(learner).scheduler, /not FSRS/);
});
test('backup restore preserves both learners and replay receipts, and clears events after the snapshot', t => {
  const s = setup(t); s.enroll(learner, 'w-mi'); const requestId = randomUUID();
  s.review(learner, { requestId, wordId: 'w-mi', rating: 3 });
  const eventId = randomUUID(); s.entitlement(learner, { eventId, type: 'membership_cancelled' });
  const backup = s.backup(); s.enroll('learner-core', 'w-hi');
  const laterId = randomUUID(); s.entitlement(learner, { eventId: laterId, type: 'course_refunded' });
  s.restore(backup);
  assert.deepEqual(s.learner(learner), backup.learners[0].state);
  assert.deepEqual(s.learner('learner-core'), backup.learners[1].state);
  assert.equal(s.review(learner, { requestId, wordId: 'w-mi', rating: 3 }).duplicate, true);
  assert.equal(s.entitlement(learner, { eventId, type: 'membership_cancelled' }).duplicate, true);
  assert.equal(s.entitlement(learner, { eventId: laterId, type: 'course_refunded' }).duplicate, false);
});
test('invalid restore is atomic, including a malformed saved attempt', t => {
  const s = setup(t); const before = s.backup(); const invalid = copy(before); invalid.learners[0].state.attempts = [null];
  fails(() => s.restore(invalid)); assert.deepEqual(s.snapshot(), before.content); assert.equal(s.get('active'), 1);
  assert.deepEqual(s.learner(learner), before.learners[0].state);
});
test('SQLite survives reopen and keeps profiles isolated', () => {
  const directory = mkdtempSync(join(tmpdir(), 'hebleo-test-')); const path = join(directory, 'demo.sqlite'); let s;
  try { s = new Store(path); s.updateLearner(learner, { nikkud: 'none', goal: 17 }); answer(s, 'ex-1-type', 'אני'); s.close(); s = new Store(path); assert.equal(s.learner(learner).goal, 17); assert.equal(s.learner(learner).attempts.length, 1); assert.equal(s.learner('learner-core').attempts.length, 0); }
  finally { s?.close(); rmSync(directory, { recursive: true }); }
});
