import { DatabaseSync } from 'node:sqlite';
import { seed } from './seed.js';

export class DomainError extends Error { constructor(message, status = 400) { super(message); this.status = status; } }
const clone = value => JSON.parse(JSON.stringify(value));
const text = (value, label, max = 4000) => { if (typeof value !== 'string' || !value.trim() || value.length > max) throw new DomainError('Invalid ' + label); return value; };
const id = value => { text(value, 'ID', 100); if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(value) || ['constructor', 'prototype', '__proto__'].includes(value)) throw new DomainError('IDs must use letters, numbers, hyphens, or underscores, without reserved names.'); return value; };
const modes = ['curated', 'full', 'none'];
export const normalizeHebrew = (value, requireNikkud = false) => String(value).normalize('NFC').replace(requireNikkud ? /[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g : /[\u0591-\u05c7\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '').replace(/[.,!?;:״„“”"׳‘’']/g, '').trim().replace(/\s+/g, ' ');

export function validateContent(content) {
  if (!content || content.schemaVersion !== 1) throw new DomainError('Expected content schemaVersion 1.');
  if (content.provenance?.kind !== 'synthetic-demo' && content.provenance?.kind !== 'verified-source') throw new DomainError('Content needs explicit provenance.');
  for (const key of ['words', 'lessons', 'exercises']) {
    if (!Array.isArray(content[key]) || content[key].length > 2000 || !content[key].length) throw new DomainError('Invalid ' + key + ' collection.');
    const ids = new Set();
    for (const object of content[key]) { if (!object || typeof object !== 'object') throw new DomainError('Invalid content item.'); id(object.id); if (ids.has(object.id)) throw new DomainError('Duplicate ID: ' + object.id); ids.add(object.id); }
  }
  const words = new Set(content.words.map(w => w.id));
  const lessons = new Set(content.lessons.map(l => l.id));
  const exercises = new Map(content.exercises.map(e => [e.id, e]));
  for (const w of content.words) {
    for (const key of ['pointed', 'unpointed', 'curated', 'english']) text(w[key], 'word ' + key, 1000);
    if (w.notes != null && (typeof w.notes !== 'string' || w.notes.length > 4000)) throw new DomainError('Invalid notes.');
    if (w.format && (typeof w.format !== 'object' || (w.format.color && !/^#[0-9a-f]{6}$/i.test(w.format.color)) || (w.format.bold !== undefined && typeof w.format.bold !== 'boolean'))) throw new DomainError('Invalid word formatting.');
  }
  for (const e of content.exercises) {
    text(e.prompt, 'exercise prompt');
    if (!lessons.has(e.lessonId)) throw new DomainError('Exercise references a missing lesson: ' + e.id);
    if (e.nikkudOverride && !modes.includes(e.nikkudOverride)) throw new DomainError('Invalid vowel override.');
    if (e.requireNikkud !== undefined && typeof e.requireNikkud !== 'boolean') throw new DomainError('Invalid vowel requirement.');
    if (['recognition', 'typing'].includes(e.type)) { if (!words.has(e.wordId)) throw new DomainError('Missing exercise word: ' + e.id); }
    else if (e.type === 'matching') { if (!Array.isArray(e.wordIds) || !e.wordIds.length || new Set(e.wordIds).size !== e.wordIds.length || e.wordIds.some(w => !words.has(w))) throw new DomainError('Invalid matching words.'); }
    else if (['ordering', 'cloze', 'transformation'].includes(e.type)) {
      if (!Array.isArray(e.answers) || !e.answers.length) throw new DomainError('Exercise needs accepted answers.');
      e.answers.forEach(a => text(a, 'accepted answer', 1000));
      if (e.type === 'ordering' && (!Array.isArray(e.tokens) || !e.tokens.length || e.tokens.some(t => typeof t !== 'string'))) throw new DomainError('Ordering exercise needs tokens.');
    } else throw new DomainError('Unsupported exercise type: ' + e.type);
    if (e.type === 'recognition' && (!Array.isArray(e.distractors) || !e.distractors.length || e.distractors.some(x => typeof x !== 'string'))) throw new DomainError('Recognition needs choices.');
  }
  for (const l of content.lessons) {
    text(l.title, 'lesson title'); text(l.explanation, 'lesson explanation');
    text(l.chapter, 'chapter'); text(l.letters, 'known letters', 100);
    if (!Number.isInteger(l.minutes) || l.minutes < 1 || l.minutes > 120) throw new DomainError('Invalid lesson duration.');
    if (!Array.isArray(l.wordIds) || !l.wordIds.length || l.wordIds.some(w => !words.has(w))) throw new DomainError('Lesson references a missing word: ' + l.id);
    if (!Array.isArray(l.exerciseIds) || !l.exerciseIds.length || new Set(l.exerciseIds).size !== l.exerciseIds.length || l.exerciseIds.some(e => !exercises.has(e) || exercises.get(e).lessonId !== l.id)) throw new DomainError('Invalid lesson exercise reference: ' + l.id);
    if (!Array.isArray(l.blocks) || l.blocks.length !== 3 || new Set(l.blocks.map(b => b?.type)).size !== 3) throw new DomainError('Each demo manifest needs one explanation, vocabulary, and exercise set.');
    for (const b of l.blocks) {
      if (b.type === 'explanation') { if (b.renderer !== 'text') throw new DomainError('Unsupported explanation renderer.'); }
      else if (b.type === 'vocabulary' || b.type === 'exercise-set') {
        const expectedSource = b.type === 'vocabulary' ? 'words' : 'exercises';
        if (b.source !== expectedSource || !lessons.has(b.selector?.lessonId) || b.renderer !== (b.type === 'vocabulary' ? 'vocabulary-table' : 'practice')) throw new DomainError('Invalid source, selector, or renderer.');
        if (b.type === 'exercise-set' && b.selector.lessonId !== l.id) throw new DomainError('Core practice must reference this lesson.');
        if (b.options?.showNotes !== undefined && typeof b.options.showNotes !== 'boolean') throw new DomainError('Invalid renderer options.');
      } else throw new DomainError('Unsupported lesson block.');
    }
  }
  return content;
}

const emptyLearner = () => ({ completed: [], attempts: [], cards: {}, bookmarks: [], notes: {}, preferences: { nikkud: 'curated' }, goal: 10, membership: true, purchasedCourses: ['demo-foundations'] });
const users = [{ id: 'learner-demo', name: 'Alex', role: 'Course + membership' }, { id: 'learner-core', name: 'Sam', role: 'Course purchaser' }];

export class Store {
  constructor(path = ':memory:') {
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS kv(key TEXT PRIMARY KEY, value TEXT NOT NULL); CREATE TABLE IF NOT EXISTS revisions(id INTEGER PRIMARY KEY AUTOINCREMENT, snapshot TEXT NOT NULL, created_at TEXT NOT NULL, reason TEXT NOT NULL); CREATE TABLE IF NOT EXISTS learners(id TEXT PRIMARY KEY, state TEXT NOT NULL); CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY, payload TEXT NOT NULL);');
    if (!this.get('active')) this.transaction(() => { const r = this.addRevision(seed, 'Initial illustrative demo'); this.set('active', r); });
    for (const u of users) if (!this.db.prepare('SELECT id FROM learners WHERE id=?').get(u.id)) { const state = emptyLearner(); if (u.id === 'learner-core') state.membership = false; this.saveLearner(u.id, state); }
  }
  close() { this.db.close(); }
  transaction(fn) { this.db.exec('BEGIN IMMEDIATE'); try { const result = fn(); this.db.exec('COMMIT'); return result; } catch (e) { this.db.exec('ROLLBACK'); throw e; } }
  get(key) { const row = this.db.prepare('SELECT value FROM kv WHERE key=?').get(key); return row ? JSON.parse(row.value) : null; }
  set(key, value) { this.db.prepare('INSERT INTO kv(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key, JSON.stringify(value)); }
  addRevision(content, reason) { const result = this.db.prepare('INSERT INTO revisions(snapshot,created_at,reason) VALUES(?,?,?)').run(JSON.stringify(content), new Date().toISOString(), reason); return Number(result.lastInsertRowid); }
  snapshot(revisionId = this.get('active')) { const row = this.db.prepare('SELECT snapshot FROM revisions WHERE id=?').get(Number(revisionId)); if (!row) throw new DomainError('Content revision not found.', 404); return JSON.parse(row.snapshot); }
  learner(userId) { if (!users.some(u => u.id === userId)) throw new DomainError('Unknown demo learner.', 404); return JSON.parse(this.db.prepare('SELECT state FROM learners WHERE id=?').get(userId).state); }
  saveLearner(userId, state) { this.db.prepare('INSERT INTO learners(id,state) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET state=excluded.state').run(userId, JSON.stringify(state)); }
  active() { return { revisionId: this.get('active'), content: this.snapshot(), draft: this.get('draft'), history: this.db.prepare('SELECT id,created_at AS createdAt,reason FROM revisions ORDER BY id DESC').all() }; }
  dependencies(wordId, content = this.snapshot()) {
    return { lessons: content.lessons.filter(l => l.wordIds.includes(wordId) || l.blocks.some(b => b.source === 'words' && content.lessons.find(target => target.id === b.selector.lessonId)?.wordIds.includes(wordId))).map(l => l.id), exercises: content.exercises.filter(e => e.wordId === wordId || e.wordIds?.includes(wordId)).map(e => e.id), review: 'All enrolled cards for this word resolve the latest published vocabulary.' };
  }
  bootstrap(userId) {
    const content = this.snapshot(); const learner = this.learner(userId);
    const due = Object.entries(learner.cards).filter(([, c]) => Date.parse(c.due) <= Date.now()).map(([wordId, card]) => ({ word: content.words.find(w => w.id === wordId), card })).filter(c => c.word && !c.card.suspended);
    return { revisionId: this.get('active'), content: { ...content, exercises: content.exercises.map(e => this.publicExercise(e, content)) }, learner, users, due: learner.purchasedCourses.includes('demo-foundations') ? due : [], scheduler: 'Prototype interval scheduler (not FSRS)', integrations: { checkout: 'WordPress retained; local event simulator only', audio: 'Native audio not yet imported', video: 'Video not yet imported' } };
  }
  publicExercise(exercise, content) {
    const e = clone(exercise); delete e.answers;
    if (e.type === 'recognition') { const meaning = content.words.find(w => w.id === e.wordId).english; e.choices = [...new Set([meaning, ...e.distractors])].sort(); delete e.distractors; }
    return e;
  }
  updateLearner(userId, patch) {
    const state = this.learner(userId);
    if (patch.nikkud !== undefined) { if (!modes.includes(patch.nikkud)) throw new DomainError('Invalid vowel mode.'); state.preferences.nikkud = patch.nikkud; }
    if (patch.goal !== undefined) { if (!Number.isInteger(patch.goal) || patch.goal < 1 || patch.goal > 120) throw new DomainError('Goal must be 1–120 minutes.'); state.goal = patch.goal; }
    if (patch.bookmark !== undefined) { if (!this.snapshot().words.some(w => w.id === patch.bookmark)) throw new DomainError('Unknown word.'); state.bookmarks = state.bookmarks.includes(patch.bookmark) ? state.bookmarks.filter(x => x !== patch.bookmark) : [...state.bookmarks, patch.bookmark]; }
    if (patch.note !== undefined) { const wordId = id(patch.note.wordId); if (!this.snapshot().words.some(w => w.id === wordId) || typeof patch.note.text !== 'string' || patch.note.text.length > 2000) throw new DomainError('Invalid note.'); state.notes[wordId] = patch.note.text; }
    this.saveLearner(userId, state); return state;
  }
  attempt(userId, input) {
    const requestId = id(input.requestId); const state = this.learner(userId);
    const duplicate = state.attempts.find(a => a.requestId === requestId);
    if (duplicate) { if (duplicate.exerciseId !== input.exerciseId || duplicate.revisionId !== input.revisionId || JSON.stringify(duplicate.answer) !== JSON.stringify(input.answer)) throw new DomainError('Conflicting attempt request ID.', 409); return { ...duplicate, duplicate: true }; }
    if (!state.purchasedCourses.includes('demo-foundations')) throw new DomainError('Course access required.', 403);
    if (!Number.isInteger(input.revisionId)) throw new DomainError('An exact content revision is required.');
    const content = this.snapshot(input.revisionId); const exercise = content.exercises.find(e => e.id === input.exerciseId);
    if (!exercise) throw new DomainError('Exercise not found.', 404);
    let correct = false; let expected;
    if (exercise.type === 'matching') {
      expected = Object.fromEntries(exercise.wordIds.map(w => [w, content.words.find(x => x.id === w).english]));
      correct = input.answer && typeof input.answer === 'object' && !Array.isArray(input.answer) && Object.keys(input.answer).length === exercise.wordIds.length && exercise.wordIds.every(w => input.answer[w] === expected[w]);
    } else {
      if (typeof input.answer !== 'string' || input.answer.length > 2000) throw new DomainError('Invalid answer.');
      if (exercise.type === 'recognition') { expected = content.words.find(w => w.id === exercise.wordId).english; correct = input.answer === expected; }
      else { const w = content.words.find(w => w.id === exercise.wordId); const answers = exercise.type === 'typing' ? (exercise.requireNikkud ? [w.pointed] : [w.pointed, w.unpointed]) : exercise.answers; expected = answers[0]; correct = answers.some(a => normalizeHebrew(a, exercise.requireNikkud) === normalizeHebrew(input.answer, exercise.requireNikkud)); }
    }
    const result = { requestId, exerciseId: exercise.id, lessonId: exercise.lessonId, revisionId: input.revisionId, answer: input.answer, correct: Boolean(correct), expected, at: new Date().toISOString() };
    state.attempts.push(result);
    const lesson = content.lessons.find(l => l.id === exercise.lessonId);
    if (lesson.exerciseIds.every(e => state.attempts.some(a => a.exerciseId === e && a.correct))) {
      if (!state.completed.includes(lesson.id)) state.completed.push(lesson.id);
      for (const wordId of lesson.wordIds) if (!state.cards[wordId]) state.cards[wordId] = { due: new Date().toISOString(), intervalDays: 0, repetitions: 0, suspended: false };
    }
    this.saveLearner(userId, state); return result;
  }
  review(userId, input) {
    if (![1, 2, 3, 4].includes(input.rating)) throw new DomainError('Invalid review rating.');
    const state = this.learner(userId); const card = state.cards[input.wordId];
    if (!state.purchasedCourses.includes('demo-foundations')) throw new DomainError('Course access required.', 403);
    if (!card || !this.snapshot().words.some(w => w.id === input.wordId)) throw new DomainError('Review card not found.', 404);
    const requestId = id(input.requestId); const previous = this.get('review-' + userId + '-' + requestId);
    if (previous) { if (previous.wordId !== input.wordId || previous.rating !== input.rating) throw new DomainError('Conflicting review request ID.', 409); return { ...previous, duplicate: true }; }
    card.intervalDays = input.rating === 1 ? 0 : input.rating === 2 ? 1 : Math.max(1, Math.round((card.intervalDays || 1) * (input.rating === 3 ? 2 : 3)));
    card.repetitions += 1; card.due = new Date(Date.now() + (input.rating === 1 ? 600000 : card.intervalDays * 86400000)).toISOString();
    const result = { wordId: input.wordId, rating: input.rating, card: clone(card) };
    return this.transaction(() => { this.saveLearner(userId, state); this.set('review-' + userId + '-' + requestId, result); return result; });
  }
  enroll(userId, wordId) { if (!this.snapshot().words.some(w => w.id === wordId)) throw new DomainError('Word not found.', 404); const state = this.learner(userId); if (!state.purchasedCourses.includes('demo-foundations')) throw new DomainError('Course access required.', 403); if (!state.cards[wordId]) state.cards[wordId] = { due: new Date().toISOString(), intervalDays: 0, repetitions: 0, suspended: false }; this.saveLearner(userId, state); return state; }
  stage(input) {
    const active = this.get('active');
    if (input.baseRevisionId !== active) throw new DomainError('Published content changed. Refresh before editing.', 409);
    let content = input.content ? clone(input.content) : clone(this.get('draft')?.content || this.snapshot());
    if (input.word) { const index = content.words.findIndex(w => w.id === input.word.id); if (index < 0) throw new DomainError('Word not found.', 404); content.words[index] = { ...content.words[index], ...input.word, id: content.words[index].id }; }
    validateContent(content);
    const draft = { baseRevisionId: active, content, stagedAt: new Date().toISOString() }; this.set('draft', draft); return this.preview();
  }
  preview() {
    const draft = this.get('draft'); if (!draft) return { draft: null, changes: [], affectedLessons: [] };
    const current = this.snapshot(); const changes = [];
    for (const kind of ['words', 'lessons', 'exercises']) {
      const before = new Map(current[kind].map(x => [x.id, x])); const after = new Map(draft.content[kind].map(x => [x.id, x]));
      for (const key of new Set([...before.keys(), ...after.keys()])) if (JSON.stringify(before.get(key)) !== JSON.stringify(after.get(key))) changes.push({ kind, id: key, action: !before.has(key) ? 'added' : !after.has(key) ? 'removed' : 'changed', impact: kind === 'words' ? this.dependencies(key, draft.content) : null });
    }
    return { draft, changes, affectedLessons: [...new Set(changes.flatMap(c => c.kind === 'lessons' ? [c.id] : c.impact?.lessons || (c.kind === 'exercises' ? [draft.content.exercises.find(e => e.id === c.id)?.lessonId].filter(Boolean) : [])))] };
  }
  publish(baseRevisionId) {
    const draft = this.get('draft'); if (!draft) throw new DomainError('No draft to publish.');
    if (baseRevisionId !== this.get('active') || draft.baseRevisionId !== baseRevisionId) throw new DomainError('Stale publication request.', 409);
    validateContent(draft.content);
    return this.transaction(() => { const revisionId = this.addRevision(draft.content, 'Published draft'); this.set('active', revisionId); this.set('draft', null); return { revisionId }; });
  }
  rollback(revisionId, baseRevisionId) {
    if (baseRevisionId !== this.get('active')) throw new DomainError('Stale rollback request.', 409);
    const content = this.snapshot(revisionId); validateContent(content);
    return this.transaction(() => { const next = this.addRevision(content, 'Restored content revision ' + revisionId); this.set('active', next); this.set('draft', null); return { revisionId: next }; });
  }
  entitlement(userId, input) {
    const eventId = id(input.eventId);
    if (!['membership_cancelled', 'membership_started', 'course_refunded', 'course_purchased'].includes(input.type)) throw new DomainError('Unknown demo event.');
    const previous = this.db.prepare('SELECT payload FROM events WHERE id=?').get(eventId);
    if (previous) { const payload = JSON.parse(previous.payload); if (payload.userId !== userId || payload.type !== input.type) throw new DomainError('Conflicting event ID.', 409); return { duplicate: true, learner: this.learner(userId) }; }
    const state = this.learner(userId);
    if (input.type === 'membership_cancelled') state.membership = false;
    if (input.type === 'membership_started') state.membership = true;
    if (input.type === 'course_refunded') state.purchasedCourses = state.purchasedCourses.filter(c => c !== 'demo-foundations');
    if (input.type === 'course_purchased' && !state.purchasedCourses.includes('demo-foundations')) state.purchasedCourses.push('demo-foundations');
    return this.transaction(() => { this.saveLearner(userId, state); this.db.prepare('INSERT INTO events(id,payload) VALUES(?,?)').run(eventId, JSON.stringify({ userId, type: input.type })); return { duplicate: false, learner: state }; });
  }
  backup() { return { format: 'hebleo-demo-backup-v1', exportedAt: new Date().toISOString(), content: this.snapshot(), learners: users.map(u => ({ id: u.id, state: this.learner(u.id) })), events: this.db.prepare('SELECT id,payload FROM events').all().map(row => ({ id: row.id, payload: JSON.parse(row.payload) })), reviewReceipts: this.db.prepare("SELECT key,value FROM kv WHERE key LIKE 'review-%'").all().map(row => ({ key: row.key, value: JSON.parse(row.value) })) }; }
  restore(input) {
    if (input.format !== 'hebleo-demo-backup-v1' || !Array.isArray(input.learners) || input.learners.length !== users.length || new Set(input.learners.map(x => x.id)).size !== users.length) throw new DomainError('Invalid demo backup.');
    validateContent(input.content);
    if (!Array.isArray(input.events) || !Array.isArray(input.reviewReceipts)) throw new DomainError('Backup needs replay receipts.');
    if (new Set(input.events.map(e => e?.id)).size !== input.events.length || new Set(input.reviewReceipts.map(r => r?.key)).size !== input.reviewReceipts.length) throw new DomainError('Duplicate backup receipt.');
    for (const e of input.events) { id(e?.id); if (!users.some(u => u.id === e.payload?.userId) || !['membership_cancelled', 'membership_started', 'course_refunded', 'course_purchased'].includes(e.payload?.type)) throw new DomainError('Invalid event receipt.'); }
    for (const r of input.reviewReceipts) if (typeof r?.key !== 'string' || !/^review-learner-(demo|core)-[A-Za-z0-9_-]+$/.test(r.key) || !r.value || ![1,2,3,4].includes(r.value.rating) || typeof r.value.wordId !== 'string' || !r.value.card) throw new DomainError('Invalid review receipt.');
    for (const row of input.learners) {
      const s = row.state;
      if (!users.some(u => u.id === row.id) || !s || !Array.isArray(s.completed) || !Array.isArray(s.attempts) || !Array.isArray(s.bookmarks) || !Array.isArray(s.purchasedCourses) || !s.cards || !s.notes || !modes.includes(s.preferences?.nikkud) || typeof s.membership !== 'boolean' || !Number.isInteger(s.goal) || s.goal < 1 || s.goal > 120) throw new DomainError('Invalid learner backup.');
      if (Array.isArray(s.cards) || Array.isArray(s.notes) || typeof s.cards !== 'object' || typeof s.notes !== 'object') throw new DomainError('Invalid learner state objects.');
      for (const list of [s.completed, s.bookmarks, s.purchasedCourses]) list.forEach(id);
      for (const a of s.attempts) { if (!a || typeof a.correct !== 'boolean' || !Number.isInteger(a.revisionId) || !Number.isFinite(Date.parse(a.at))) throw new DomainError('Invalid saved attempt.'); [a.requestId, a.exerciseId, a.lessonId].forEach(id); }
      for (const [key, note] of Object.entries(s.notes)) { id(key); if (typeof note !== 'string' || note.length > 2000) throw new DomainError('Invalid saved note.'); }
      for (const [key, c] of Object.entries(s.cards)) { id(key); if (!c || !Number.isFinite(Date.parse(c.due)) || !Number.isFinite(c.intervalDays) || !Number.isInteger(c.repetitions) || c.intervalDays < 0 || c.repetitions < 0 || typeof c.suspended !== 'boolean') throw new DomainError('Invalid review card in backup.'); }
    }
    return this.transaction(() => { const revisionId = this.addRevision(input.content, 'Restored local demo backup'); this.set('active', revisionId); this.set('draft', null); for (const row of input.learners) this.saveLearner(row.id, row.state); this.db.exec("DELETE FROM events; DELETE FROM kv WHERE key LIKE 'review-%';"); for (const e of input.events) this.db.prepare('INSERT INTO events(id,payload) VALUES(?,?)').run(e.id, JSON.stringify(e.payload)); for (const r of input.reviewReceipts) this.set(r.key, r.value); return { revisionId }; });
  }
}
