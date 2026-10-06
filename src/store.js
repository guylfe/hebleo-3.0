import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { DomainError } from './errors.js';
import { normalizeHebrew, evaluateAnswer } from './evaluate.js';
import { seed, upgradeDemo } from './seed.js';
import { orderingTokens, orderingPrefixes, lessonSteps, stepExercises, targetedExercises, audioURL, lessonQuestionProgress } from '../public/ux.js';

// Version 1 databases predate schema tracking. Version 2 adds revision-mapped backups and pinned-revision completion.
export const STORE_SCHEMA_VERSION = 2;
const backupFormats = ['hebleo-demo-backup-v1', 'hebleo-demo-backup-v2'];
// Store schema versions each backup format may declare. v2 exports always declare one, and this build restores schema 2 only.
// v1 exports predate the field (absent); a declared version must still be one this build supports. Anything else is refused before any write.
export const RESTORABLE_SCHEMA_VERSIONS = { 'hebleo-demo-backup-v1': [undefined, 1, 2], 'hebleo-demo-backup-v2': [2] };
export { DomainError, normalizeHebrew };
const clone = value => JSON.parse(JSON.stringify(value));
// Sorted-key JSON, so the same content always yields the same token whatever key order an import used.
const canonicalJSON = value => Array.isArray(value) ? '[' + value.map(canonicalJSON).join(',') + ']' : value && typeof value === 'object' ? '{' + Object.keys(value).sort().filter(k => value[k] !== undefined).map(k => JSON.stringify(k) + ':' + canonicalJSON(value[k])).join(',') + '}' : JSON.stringify(value);
// The token names one exact draft: every content field (unknown/source fields, provenance, approval, formatting, media refs) plus its base revision.
export const draftTokenFor = (baseRevisionId, content) => 'dt1-' + createHash('sha256').update(canonicalJSON({ v: 1, baseRevisionId, content })).digest('hex');
const text = (value, label, max = 4000) => { if (typeof value !== 'string' || !value.trim() || value.length > max) throw new DomainError('Invalid ' + label); return value; };
const id = value => { text(value, 'ID', 100); if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(value) || ['constructor', 'prototype', '__proto__'].includes(value)) throw new DomainError('IDs must use letters, numbers, hyphens, or underscores, without reserved names.'); return value; };
const modes = ['curated', 'full', 'none'];
const preferenceDefaults = { nikkud: 'curated', vocabularyView: 'cards', immediateAnswers: false, sounds: false, animations: true, keyboardHints: true, keyboardConvert: false, keyboardVisible: false, keyboardPinned: false, reviewNikkud: 'default', audioSpeed: 1, reviewLimit: 10, reviewType: 'recognition' };
function richData(value, depth = 0) {
  if (depth > 8) throw new DomainError('Vocabulary field nesting exceeds the limit.');
  if (typeof value === 'string' && value.length > 12000) throw new DomainError('Vocabulary field exceeds the limit.');
  if (value && typeof value === 'object') for (const [key, child] of Object.entries(value)) { if (['__proto__', 'constructor', 'prototype'].includes(key)) throw new DomainError('Reserved vocabulary field.'); richData(child, depth + 1); }
}
function validatePreferences(p) {
  if(p.reviewNikkud!==undefined && !['default',...modes].includes(p.reviewNikkud))throw new DomainError('Invalid flashcard Nikkud.');
  for (const key of ['immediateAnswers', 'sounds', 'animations', 'keyboardHints', 'keyboardConvert', 'keyboardVisible', 'keyboardPinned']) if (p[key] !== undefined && typeof p[key] !== 'boolean') throw new DomainError('Invalid preference: ' + key);
  if (p.vocabularyView !== undefined && !['cards', 'table'].includes(p.vocabularyView)) throw new DomainError('Invalid vocabulary view.');
  if (p.audioSpeed !== undefined && ![0.75, 1].includes(p.audioSpeed)) throw new DomainError('Invalid audio speed.');
  if (p.reviewLimit !== undefined && (!Number.isInteger(p.reviewLimit) || p.reviewLimit < 1 || p.reviewLimit > 100)) throw new DomainError('Review limit must be 1–100 cards.');
  if (p.reviewType !== undefined && !['recognition', 'translation', 'listening', 'sentence'].includes(p.reviewType)) throw new DomainError('Invalid review type.');
}

export function validateContent(content) {
  if (!content || content.schemaVersion !== 1) throw new DomainError('Expected content schemaVersion 1.');
  if (content.provenance?.kind !== 'synthetic-demo' && content.provenance?.kind !== 'verified-source') throw new DomainError('Content needs explicit provenance.');
  // A verified pack may not smuggle in objects still awaiting the owner's approval; candidate packs stay blocked until each object is approved.
  if (content.provenance.kind === 'verified-source' && ['words', 'lessons', 'exercises'].some(kind => Array.isArray(content[kind]) && content[kind].some(o => o?.provenance?.approval !== undefined && o.provenance.approval !== 'approved'))) throw new DomainError('Verified-source content cannot include objects pending approval.');
  for (const key of ['words', 'lessons', 'exercises']) {
    if (!Array.isArray(content[key]) || content[key].length > 2000 || !content[key].length) throw new DomainError('Invalid ' + key + ' collection.');
    const ids = new Set();
    for (const object of content[key]) { if (!object || typeof object !== 'object') throw new DomainError('Invalid content item.'); id(object.id); if (ids.has(object.id)) throw new DomainError('Duplicate ID: ' + object.id); ids.add(object.id); }
  }
  if(content.reviewPolicy && !modes.includes(content.reviewPolicy.defaultNikkud))throw new DomainError('Invalid author flashcard Nikkud.');
  const words = new Set(content.words.map(w => w.id));
  const lessons = new Set(content.lessons.map(l => l.id));
  const exercises = new Map(content.exercises.map(e => [e.id, e]));
  for (const w of content.words) {
    richData(w);
    if(w.fieldFormatting){
      if(typeof w.fieldFormatting!=='object'||Array.isArray(w.fieldFormatting))throw new DomainError('Invalid source cell formatting.');
      for(const cell of Object.values(w.fieldFormatting)){
        if(!cell||typeof cell!=='object'||Array.isArray(cell))throw new DomainError('Invalid source cell formatting.');
        if(cell.textFormatRuns && (!Array.isArray(cell.textFormatRuns)||cell.textFormatRuns.length>1000||cell.textFormatRuns.some(run=>!run||typeof run!=='object'||(run.startIndex!==undefined&&(!Number.isInteger(run.startIndex)||run.startIndex<0))||(run.format!==undefined&&(!run.format||typeof run.format!=='object'||Array.isArray(run.format))))))throw new DomainError('Invalid source text-format runs.');
      }
    }
    if (JSON.stringify(w).length > 50000) throw new DomainError('Vocabulary entry exceeds the limit.');
    if (w.audio && !audioURL(w.audio)) throw new DomainError('Audio requires an HTTPS URL or local /media path.');
    for (const key of ['pointed', 'unpointed', 'curated', 'english']) text(w[key], 'word ' + key, 1000);
    if (w.notes != null && (typeof w.notes !== 'string' || w.notes.length > 4000)) throw new DomainError('Invalid notes.');
    if (w.format && (typeof w.format !== 'object' || (w.format.color && !/^#[0-9a-f]{6}$/i.test(w.format.color)) || (w.format.bold !== undefined && typeof w.format.bold !== 'boolean'))) throw new DomainError('Invalid word formatting.');
  }
  for (const e of content.exercises) {
    text(e.prompt, 'exercise prompt');
    if (!lessons.has(e.lessonId)) throw new DomainError('Exercise references a missing lesson: ' + e.id);
    if (e.nikkudOverride && !modes.includes(e.nikkudOverride)) throw new DomainError('Invalid vowel override.');
    if (e.requireNikkud !== undefined && typeof e.requireNikkud !== 'boolean') throw new DomainError('Invalid vowel requirement.');
    if (e.allowLookup !== undefined && typeof e.allowLookup !== 'boolean') throw new DomainError('Invalid lookup setting.');
    if (e.feedback !== undefined) text(e.feedback, 'authored feedback');
    if (e.feedbackDetails !== undefined) text(e.feedbackDetails, 'detailed feedback');
    if (e.concept !== undefined) text(e.concept, 'concept', 200);
    if (e.explanationTime !== undefined && (!Number.isFinite(e.explanationTime) || e.explanationTime < 0)) throw new DomainError('Invalid explanation timestamp.');
    if (['recognition', 'typing'].includes(e.type)) { if (!words.has(e.wordId)) throw new DomainError('Missing exercise word: ' + e.id); }
    else if (e.type === 'matching') { if (!Array.isArray(e.wordIds) || !e.wordIds.length || new Set(e.wordIds).size !== e.wordIds.length || e.wordIds.some(w => !words.has(w))) throw new DomainError('Invalid matching words.'); }
    else if (['ordering', 'cloze', 'transformation'].includes(e.type)) {
      if (!Array.isArray(e.answers) || !e.answers.length) throw new DomainError('Exercise needs accepted answers.');
      e.answers.forEach(a => text(a, 'accepted answer', 1000));
      if (e.type === 'ordering' && (!Array.isArray(e.tokens) || !e.tokens.length || e.tokens.some(t => typeof t !== 'string'))) throw new DomainError('Ordering exercise needs tokens.');
    } else throw new DomainError('Unsupported exercise type: ' + e.type);
    if(e.prefixTokenIndices && (e.type!=='ordering'||!Array.isArray(e.prefixTokenIndices)||new Set(e.prefixTokenIndices).size!==e.prefixTokenIndices.length||e.prefixTokenIndices.some(i=>!Number.isInteger(i)||i<0||i>=e.tokens.length)))throw new DomainError('Invalid prefix tiles.');
    if (e.type === 'recognition') {
      if (!Array.isArray(e.distractors) || !e.distractors.length || e.distractors.some(x => typeof x !== 'string')) throw new DomainError('Recognition needs choices.');
      // Each distractor is shown to learners as a choice; one with nothing visible is refused, never trimmed or dropped.
      const blank = e.distractors.findIndex(x => !x.replace(/[\s\p{Cc}\p{Default_Ignorable_Code_Point}]/gu, ''));
      if (blank >= 0) throw new DomainError('Authored distractor meaning ' + (blank + 1) + ' of ' + e.id + ' is blank. Enter a meaning or remove that item.');
    }
  }
  for (const l of content.lessons) {
    text(l.title, 'lesson title'); if (!l.video || l.explanation) text(l.explanation, 'lesson explanation',100000);
    if(l.textDirection && !['auto','ltr','rtl'].includes(l.textDirection))throw new DomainError('Invalid lesson direction.');
    if(l.keyboard){for(const k of ['knownKeys','newKeys'])if(typeof l.keyboard[k]!=='string'||l.keyboard[k].length>100)throw new DomainError('Invalid keyboard highlights.');if([...l.keyboard.newKeys].some(k=>l.keyboard.knownKeys.includes(k)))throw new DomainError('Known and new key groups must be distinct.');for(const k of ['knownColor','newColor'])if(l.keyboard[k]&&!/^#[0-9a-f]{6}$/i.test(l.keyboard[k]))throw new DomainError('Invalid highlight color.');}
    if(l.interactions){if(!Array.isArray(l.interactions)||l.interactions.length>30)throw new DomainError('Invalid lesson interactions.');for(const item of l.interactions){if(!['reveal','choice'].includes(item.type))throw new DomainError('Unsupported lesson interaction.');text(item.prompt,'interaction prompt');if(item.type==='reveal')text(item.answer,'interaction answer',12000);else{if(!Array.isArray(item.choices)||item.choices.length<2||item.choices.length>10||!Number.isInteger(item.correctIndex)||item.correctIndex<0||item.correctIndex>=item.choices.length)throw new DomainError('Invalid inline choices.');item.choices.forEach(v=>text(v,'inline choice'));text(item.feedback,'inline feedback');}}}
    if (l.video && !audioURL(l.video)) throw new DomainError('Video requires an HTTPS URL or local /media path.');
    if (l.checkExerciseIds && (!Array.isArray(l.checkExerciseIds) || new Set(l.checkExerciseIds).size !== l.checkExerciseIds.length || l.checkExerciseIds.some(e => !l.exerciseIds.includes(e)))) throw new DomainError('Check questions must belong to the lesson.');
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
  for(const e of content.exercises)if(e.type==='ordering'&&orderingTokens(e,content).length-e.tokens.length<4)throw new DomainError('Ordering exercise needs at least four distinct taught distractor words: '+e.id);
  return content;
}

const emptyLearner = () => ({ completed: [], attempts: [], cards: {}, bookmarks: [], notes: {}, preferences: { ...preferenceDefaults }, resumes: {}, goal: 10, membership: true, purchasedCourses: ['demo-foundations'] });
const users = [{ id: 'learner-demo', name: 'Alex', role: 'Course + membership' }, { id: 'learner-core', name: 'Sam', role: 'Course purchaser' }, { id: 'author-demo', name: 'Author', role: 'Content author', canAuthor: true }];

export class Store {
  constructor(path = ':memory:') {
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS kv(key TEXT PRIMARY KEY, value TEXT NOT NULL); CREATE TABLE IF NOT EXISTS revisions(id INTEGER PRIMARY KEY AUTOINCREMENT, snapshot TEXT NOT NULL, created_at TEXT NOT NULL, reason TEXT NOT NULL); CREATE TABLE IF NOT EXISTS learners(id TEXT PRIMARY KEY, state TEXT NOT NULL); CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY, payload TEXT NOT NULL);');
    // A refused migration must release the file, or the database stays locked for the caller.
    try { this.migrate(); } catch (e) { this.db.close(); throw e; }
    if (!this.get('active')) this.transaction(() => { const r = this.addRevision(seed, 'Initial illustrative demo'); this.set('active', r); });
    for (const u of users) if (!this.db.prepare('SELECT id FROM learners WHERE id=?').get(u.id)) { const state = emptyLearner(); if (u.id === 'learner-core') state.membership = false; this.saveLearner(u.id, state); }
    const upgraded = !this.get('draft') && upgradeDemo(this.snapshot());
    if (upgraded) { validateContent(upgraded); this.transaction(()=>this.set('active',this.addRevision(upgraded,'Additive UX demo fixture upgrade; learner records retained'))); }
  }
  close() { this.db.close(); }
  migrate() {
    const version = this.get('schema-version') ?? 1;
    if (!Number.isInteger(version) || version > STORE_SCHEMA_VERSION) throw new DomainError('This database uses schema ' + version + '; this build supports up to ' + STORE_SCHEMA_VERSION + '. Use a newer build or a separate database.', 409);
    if (version < 2) this.transaction(() => {
      // Earlier restores could leave history pointing at revision IDs from another database. Keep the record and its grade, but mark the link legacy instead of guessing.
      const contents = new Map();
      const revision = revisionId => { if (!contents.has(revisionId)) { const row = Number.isInteger(revisionId) && this.db.prepare('SELECT snapshot FROM revisions WHERE id=?').get(revisionId); contents.set(revisionId, row ? JSON.parse(row.snapshot) : null); } return contents.get(revisionId); };
      const linked = record => { const c = revision(record.revisionId); return Boolean(c) && (!record.exerciseId || c.exercises.some(e => e.id === record.exerciseId && (!record.lessonId || e.lessonId === record.lessonId))) && (!record.lessonId || c.lessons.some(l => l.id === record.lessonId)); };
      const unlink = record => { if (record && record.revisionId != null && !linked(record)) { record.legacyRevisionId = record.revisionId; record.revisionId = null; } };
      for (const row of this.db.prepare('SELECT id,state FROM learners').all()) { const state = JSON.parse(row.state); (state.attempts || []).forEach(unlink); this.saveLearner(row.id, state); }
      for (const row of this.db.prepare("SELECT key,value FROM kv WHERE key LIKE 'question-%' OR key LIKE 'report-%'").all()) { const value = JSON.parse(row.value); unlink(row.key.startsWith('report-') ? value.attempt : value); this.set(row.key, value); }
      this.set('schema-version', 2);
    });
  }
  transaction(fn) { this.db.exec('BEGIN IMMEDIATE'); try { const result = fn(); this.db.exec('COMMIT'); return result; } catch (e) { this.db.exec('ROLLBACK'); throw e; } }
  get(key) { const row = this.db.prepare('SELECT value FROM kv WHERE key=?').get(key); return row ? JSON.parse(row.value) : null; }
  set(key, value) { this.db.prepare('INSERT INTO kv(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key, JSON.stringify(value)); }
  addRevision(content, reason) { const result = this.db.prepare('INSERT INTO revisions(snapshot,created_at,reason) VALUES(?,?,?)').run(JSON.stringify(content), new Date().toISOString(), reason); return Number(result.lastInsertRowid); }
  snapshot(revisionId = this.get('active')) { const row = this.db.prepare('SELECT snapshot FROM revisions WHERE id=?').get(Number(revisionId)); if (!row) throw new DomainError('Content revision not found.', 404); return JSON.parse(row.snapshot); }
  learner(userId) { if (!users.some(u => u.id === userId)) throw new DomainError('Unknown demo learner.', 404); const state = JSON.parse(this.db.prepare('SELECT state FROM learners WHERE id=?').get(userId).state); state.preferences = { ...preferenceDefaults, ...state.preferences }; state.resumes ||= {}; return state; }
  requireAuthor(userId) { if (!users.find(u => u.id === userId)?.canAuthor) throw new DomainError('Author workspace required. Switch to the fictional Author profile for local testing.', 403); }
  saveLearner(userId, state) { this.db.prepare('INSERT INTO learners(id,state) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET state=excluded.state').run(userId, JSON.stringify(state)); }
  resetDemoProgressForBuild(build) {
    if(typeof build!=='string'||!build.trim()||build.length>100)throw new DomainError('Invalid demo build.');
    if(this.get('demo-progress-build')===build)return false;
    return this.transaction(()=>{
      for(const user of users){const state=this.learner(user.id);Object.assign(state,{completed:[],attempts:[],cards:{},resumes:{},lastReview:null});delete state.lastLessonId;this.saveLearner(user.id,state);}
      this.db.exec("DELETE FROM kv WHERE key LIKE 'review-%'");
      this.set('demo-progress-build',build);this.set('demo-progress-reset-at',new Date().toISOString());return true;
    });
  }
  // Drafts saved before tokens existed get theirs computed on read; the token is deterministic, so no migration is needed.
  currentDraft() { const draft = this.get('draft'); return draft ? { ...draft, draftToken: draftTokenFor(draft.baseRevisionId, draft.content) } : null; }
  draftConflict(message, code = 'DRAFT_CONFLICT') { return new DomainError(message, code === 'DRAFT_TOKEN_REQUIRED' ? 400 : 409, code, { current: { draftToken: this.currentDraft()?.draftToken ?? null, activeRevisionId: this.get('active') } }); }
  // Callers name the draft they believe is current (null = none). Anything else is a conflict, never a silent overwrite.
  expectDraft(token) {
    if (token !== null && (typeof token !== 'string' || !token)) throw this.draftConflict('Name the current draft token, or null when there is no draft.', 'DRAFT_TOKEN_REQUIRED');
    if ((this.currentDraft()?.draftToken ?? null) !== token) throw this.draftConflict('The draft changed elsewhere. Reload before saving again.');
  }
  expectBase(baseRevisionId, message = 'Published content changed. Refresh before editing.') { if (baseRevisionId !== this.get('active')) throw this.draftConflict(message, 'STALE_BASE'); }
  active() { return { revisionId: this.get('active'), content: this.snapshot(), draft: this.currentDraft(), history: this.db.prepare('SELECT id,created_at AS createdAt,reason FROM revisions ORDER BY id DESC').all() }; }
  dependencies(wordId, content = this.snapshot()) {
    return { lessons: content.lessons.filter(l => l.wordIds.includes(wordId) || l.blocks.some(b => b.source === 'words' && content.lessons.find(target => target.id === b.selector.lessonId)?.wordIds.includes(wordId))).map(l => l.id), exercises: content.exercises.filter(e => e.wordId === wordId || e.wordIds?.includes(wordId)).map(e => e.id), review: 'All enrolled cards for this word resolve the latest published vocabulary.' };
  }
  bootstrap(userId) {
    const content = this.snapshot(); const learner = this.learner(userId);
    const due = Object.entries(learner.cards).filter(([, c]) => Date.parse(c.due) <= Date.now()).map(([wordId, card]) => ({ word: content.words.find(w => w.id === wordId), card })).filter(c => c.word && !c.word.noCard && !c.card.suspended);
    return { revisionId: this.get('active'), content: { ...content, exercises: content.exercises.map(e => this.publicExercise(e, content)) }, learner, users, canAuthor: Boolean(users.find(u => u.id === userId)?.canAuthor), due: learner.purchasedCourses.includes('demo-foundations') ? due : [], scheduler: 'Prototype interval scheduler (not FSRS)', aiConnected: Boolean(process.env.HEBLEO_AI_KEY && process.env.HEBLEO_AI_MODEL) };
  }
  publicExercise(exercise, content) {
    const e = clone(exercise); delete e.answers;
    if (e.type === 'recognition') { const meaning = content.words.find(w => w.id === e.wordId).english; e.choices = [...new Set([meaning, ...e.distractors])].sort(); delete e.distractors; }
    if (e.type === 'ordering') {e.tokens=orderingTokens(exercise,content);e.prefixTokenIndices=orderingPrefixes(exercise,e.tokens);}
    return e;
  }
  updateLearner(userId, patch) {
    const state = this.learner(userId);
    validatePreferences(patch);
    for (const key of Object.keys(preferenceDefaults)) if (key !== 'nikkud' && patch[key] !== undefined) state.preferences[key] = patch[key];
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
    const { correct, expected } = evaluateAnswer(exercise, content, input.answer);
    const result = { requestId, exerciseId: exercise.id, lessonId: exercise.lessonId, revisionId: input.revisionId, answer: input.answer, correct, expected, at: new Date().toISOString() };
    state.attempts.push(result);
    const lesson = content.lessons.find(l => l.id === exercise.lessonId);
    // Completion needs every core question answered correctly in this one pinned revision; retries count once and revisions never combine.
    if (lessonQuestionProgress(lesson, state.attempts, input.revisionId).correctIds.length === lesson.exerciseIds.length) {
      if (!state.completed.includes(lesson.id)) state.completed.push(lesson.id);
      for (const wordId of lesson.wordIds) if (!content.words.find(w=>w.id===wordId)?.noCard && !state.cards[wordId]) state.cards[wordId] = { due: new Date().toISOString(), intervalDays: 0, repetitions: 0, suspended: false };
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
    const before = clone(card);
    card.intervalDays = input.rating === 1 ? 0 : input.rating === 2 ? 1 : Math.max(1, Math.round((card.intervalDays || 1) * (input.rating === 3 ? 2 : 3)));
    card.repetitions += 1; card.due = new Date(Date.now() + (input.rating === 1 ? 600000 : card.intervalDays * 86400000)).toISOString();
    const result = { wordId: input.wordId, rating: input.rating, requestId, card: clone(card) };
    state.lastReview = { requestId, wordId: input.wordId, before, after: clone(card) };
    return this.transaction(() => { this.saveLearner(userId, state); this.set('review-' + userId + '-' + requestId, result); return result; });
  }
  undoReview(userId, input) {
    const state = this.learner(userId); const previous = state.lastReview;
    if (!state.purchasedCourses.includes('demo-foundations')) throw new DomainError('Course access required.', 403);
    if (!previous || previous.requestId !== input.requestId || JSON.stringify(state.cards[previous.wordId]) !== JSON.stringify(previous.after)) throw new DomainError('Only the most recent unchanged review can be undone.', 409);
    return this.transaction(() => { state.cards[previous.wordId] = previous.before; state.lastReview = null; this.saveLearner(userId, state); const key = 'review-' + userId + '-' + input.requestId; this.set(key, { ...this.get(key), undone: true }); return { wordId: previous.wordId }; });
  }
  session(userId, lessonId) {
    const state = this.learner(userId); let progress = state.resumes[lessonId];
    let content; try { content = this.snapshot(progress?.revisionId); } catch { progress = null; content = this.snapshot(); }
    if (!state.purchasedCourses.includes('demo-foundations')) throw new DomainError('Course access required.', 403);
    if (!content.lessons.some(l => l.id === lessonId)) throw new DomainError('Lesson not found.', 404);
    return { revisionId: progress?.revisionId || this.get('active'), content: { ...content, exercises: content.exercises.map(e => this.publicExercise(e, content)) }, progress, result: progress?.resultRequestId ? state.attempts.find(a => a.requestId === progress.resultRequestId) || null : null };
  }
  startLatestLesson(userId,lessonId) {
    const state=this.learner(userId);if(!state.purchasedCourses.includes('demo-foundations'))throw new DomainError('Course access required.',403);
    if(!this.snapshot().lessons.some(l=>l.id===lessonId))throw new DomainError('Lesson not found.',404);
    // Starting a newer lesson clears its current position, while all graded attempts, notes and cards survive.
    delete state.resumes[lessonId];this.saveLearner(userId,state);return this.session(userId,lessonId);
  }
  saveProgress(userId, input) {
    const state = this.learner(userId); if (!state.purchasedCourses.includes('demo-foundations')) throw new DomainError('Course access required.', 403);
    this.validateProgress(input, state);
    const safe = { lessonId: input.lessonId, revisionId: input.revisionId, step: input.step, question: input.question, answer: input.answer, selectedTokens: input.selectedTokens, matching: input.matching, resultRequestId: input.resultRequestId || null, practiceIds: input.practiceIds || [], updatedAt: new Date().toISOString() };
    state.resumes[input.lessonId] = safe; state.lastLessonId = input.lessonId; this.saveLearner(userId, state); return safe;
  }
  validateProgress(p, state, backupContent) {
    if (!Number.isInteger(p?.revisionId)) throw new DomainError('Invalid saved lesson revision.');
    const content = backupContent || this.snapshot(p.revisionId); const l = content.lessons.find(l => l.id === p.lessonId);
    if (!l || !lessonSteps(l).includes(p.step) || !Number.isInteger(p.question) || p.question < 0 || p.question > l.exerciseIds.length || typeof p.answer !== 'string' || p.answer.length > 2000 || !Array.isArray(p.selectedTokens) || p.selectedTokens.length > 100 || new Set(p.selectedTokens).size !== p.selectedTokens.length || p.selectedTokens.some(i => !Number.isInteger(i) || i < 0 || i > 100)) throw new DomainError('Invalid saved lesson position.');
    if (!p.matching || typeof p.matching !== 'object' || Array.isArray(p.matching) || Object.entries(p.matching).some(([k,v]) => !l.wordIds.includes(k) || typeof v !== 'string' || v.length > 1000)) throw new DomainError('Invalid saved matching answer.');
    if (p.practiceIds && (!Array.isArray(p.practiceIds) || p.practiceIds.some(id => !l.exerciseIds.includes(id)))) throw new DomainError('Invalid practice set.');
    const exercise=content.exercises.find(e=>e.id===stepExercises(l,p.step,p.practiceIds)[p.question]);
    if(p.selectedTokens.length && (!exercise || exercise.type!=='ordering' || p.selectedTokens.some(i=>i>=orderingTokens(exercise,content).length)))throw new DomainError('Invalid saved sentence tokens.');
    if (p.resultRequestId && !state.attempts.some(a => a.requestId === p.resultRequestId && a.revisionId === p.revisionId && a.lessonId === p.lessonId && a.exerciseId === stepExercises(l,p.step,p.practiceIds)[p.question])) throw new DomainError('Saved feedback does not match the exercise.');
  }
  practice(userId, input) {
    const content = this.snapshot(input.revisionId); const lesson = content.lessons.find(l => l.id === input.lessonId); const state = this.learner(userId);
    if (!state.purchasedCourses.includes('demo-foundations')) throw new DomainError('Course access required.', 403);
    if (!lesson) throw new DomainError('Lesson not found.', 404);
    return { exerciseIds: targetedExercises(content, lesson, state.attempts.filter(a => a.revisionId === input.revisionId)), source: 'authored-practice' };
  }
  report(userId, input) {
    const state = this.learner(userId); const attempt = state.attempts.find(a => a.requestId === input.attemptId);
    if (!attempt) throw new DomainError('Submit an answer before reporting it.');
    if (!['answer', 'unclear', 'media'].includes(input.reason)) throw new DomainError('Invalid report reason.');
    if (typeof input.note !== 'string' || input.note.length > 2000) throw new DomainError('Invalid report note.');
    const requestId = id(input.requestId); const key = 'report-' + userId + '-' + requestId; const report = { requestId, userId, reason: input.reason, note: input.note, attempt: clone(attempt), status: 'pending', at: new Date().toISOString() };
    const old = this.get(key); if (old) { if (old.reason !== report.reason || old.note !== report.note || old.attempt.requestId !== attempt.requestId) throw new DomainError('Conflicting report request.', 409); return old; }
    this.set(key,report); return report;
  }
  reports(userId) { this.requireAuthor(userId); return this.db.prepare("SELECT value FROM kv WHERE key LIKE 'report-%' ORDER BY key").all().map(r => JSON.parse(r.value)); }
  questions(userId) { return this.db.prepare("SELECT value FROM kv WHERE key LIKE 'question-%' ORDER BY key").all().map(r=>JSON.parse(r.value)).filter(q=>users.find(u=>u.id===userId)?.canAuthor || q.userId===userId); }
  askQuestion(userId,input) {
    const state=this.learner(userId);if(!state.purchasedCourses.includes('demo-foundations'))throw new DomainError('Course access required.',403);
    if(!Number.isInteger(input.revisionId))throw new DomainError('Question needs a content revision.');
    const c=this.snapshot(input.revisionId);if(!c.lessons.some(l=>l.id===input.lessonId))throw new DomainError('Lesson not found.',404);
    if(input.wordId && !c.words.some(w=>w.id===input.wordId))throw new DomainError('Word not found.',404);
    if(input.exerciseId && !c.exercises.some(e=>e.id===input.exerciseId && e.lessonId===input.lessonId))throw new DomainError('Exercise not found.',404);
    const question=text(input.question,'question',1500),requestId=id(input.requestId),key='question-'+userId+'-'+requestId;
    const q={requestId,userId,lessonId:input.lessonId,revisionId:input.revisionId,wordId:input.wordId||null,exerciseId:input.exerciseId||null,question,status:'waiting',answer:'',at:new Date().toISOString()};
    const old=this.get(key);if(old){if(['question','lessonId','revisionId','wordId','exerciseId'].some(k=>old[k]!==q[k]))throw new DomainError('Conflicting question request.',409);return old;}
    this.set(key,q);return q;
  }
  answerQuestion(userId,input) { this.requireAuthor(userId);const key='question-'+id(input.userId)+'-'+id(input.requestId),q=this.get(key);if(!q)throw new DomainError('Question not found.',404);q.answer=text(input.answer,'author answer',12000);q.status='answered';q.answeredAt=new Date().toISOString();this.set(key,q);return q; }
  resolveReport(userId, input) { this.requireAuthor(userId); const key = 'report-' + id(input.userId) + '-' + id(input.requestId); const r = this.get(key); if (!r) throw new DomainError('Report not found.',404); if (!['pending','reviewed'].includes(input.status)) throw new DomainError('Invalid report status.'); r.status = input.status; this.set(key,r); return r; }
  enroll(userId, wordId) { if (!this.snapshot().words.some(w => w.id === wordId)) throw new DomainError('Word not found.', 404); const state = this.learner(userId); if (!state.purchasedCourses.includes('demo-foundations')) throw new DomainError('Course access required.', 403); if (!state.cards[wordId]) state.cards[wordId] = { due: new Date().toISOString(), intervalDays: 0, repetitions: 0, suspended: false }; this.saveLearner(userId, state); return state; }
  stage(input) {
    if (!input || !Object.hasOwn(input, 'expectedDraftToken')) throw this.draftConflict('expectedDraftToken is required (null when creating a draft).', 'DRAFT_TOKEN_REQUIRED');
    return this.transaction(() => {
      const active = this.get('active'); this.expectBase(input.baseRevisionId); this.expectDraft(input.expectedDraftToken);
      const current = this.currentDraft();
      let content = input.content ? clone(input.content) : clone(current?.content || this.snapshot());
      if (input.word) { const index = content.words.findIndex(w => w.id === input.word.id); if (index < 0) throw new DomainError('Word not found.', 404); content.words[index] = { ...content.words[index], ...input.word, id: content.words[index].id }; }
      validateContent(content);
      const draftToken = draftTokenFor(active, content), unchanged = current?.draftToken === draftToken;
      // Re-staging the exact same draft writes nothing and keeps its token and stagedAt.
      if (!unchanged) this.set('draft', { baseRevisionId: active, content, stagedAt: new Date().toISOString() });
      return { ...this.preview(), draftToken, baseRevisionId: active, unchanged };
    });
  }
  // Publication diff: canonical key comparison (key order is never a change), array order kept
  // (`reordered` marks retained IDs whose relative position moved), pack metadata affects every
  // lesson, and impacts union the published and draft dependency graphs. affectedLessons also
  // includes any lesson whose prepared learner view (lesson, neighbours, public exercises, words) differs.
  preview() {
    const draft = this.currentDraft(); if (!draft) return { draft: null, changes: [], affectedLessons: [] };
    const current = this.snapshot(), next = draft.content, both = [current, next], changes = [];
    const same = (a, b) => canonicalJSON(a) === canonicalJSON(b), uniq = list => [...new Set(list.filter(Boolean))];
    const action = (b, a) => b === undefined ? 'added' : a === undefined ? 'removed' : 'changed';
    const hasOrdering = (c, lessonId) => c.exercises.some(e => e.type === 'ordering' && e.lessonId === lessonId);
    // Ordering trays draw distractors from the current and previous two lessons' words.
    const orderingLessons = (wordId, c) => c.lessons.filter((l, i) => hasOrdering(c, l.id) && c.lessons.slice(Math.max(0, i - 2), i + 1).some(w => w.wordIds.includes(wordId))).map(l => l.id);
    const impact = {
      words: (id, b, a) => {
        const deps = both.map(c => this.dependencies(id, c)), exercises = uniq(deps.flatMap(d => d.exercises));
        const tray = !b || !a || b.unpointed !== a.unpointed || Boolean(b.noVocab) !== Boolean(a.noVocab);
        return { lessons: uniq([...deps.flatMap(d => d.lessons), ...both.flatMap(c => c.exercises.filter(e => exercises.includes(e.id)).map(e => e.lessonId)), ...(tray ? both.flatMap(c => orderingLessons(id, c)) : [])]), exercises, review: deps[1].review };
      },
      lessons: (id, b, a, reordered) => ({ lessons: uniq([id, ...both.flatMap(c => {
        const i = c.lessons.findIndex(l => l.id === id), window = !b || !a || reordered || !same(b.wordIds, a.wordIds);
        return [...c.lessons.filter(l => l.blocks.some(x => x.source === 'words' && x.selector?.lessonId === id)).map(l => l.id), ...(window && i >= 0 ? c.lessons.slice(i + 1, i + 3).filter(l => hasOrdering(c, l.id)).map(l => l.id) : [])];
      })]) }),
      exercises: (id, b, a) => ({ lessons: uniq([b?.lessonId, a?.lessonId, ...both.flatMap(c => c.lessons.filter(l => l.exerciseIds.includes(id) || l.checkExerciseIds?.includes(id)).map(l => l.id))]) })
    };
    for (const kind of ['words', 'lessons', 'exercises']) {
      const before = new Map(current[kind].map(x => [x.id, x])), after = new Map(next[kind].map(x => [x.id, x]));
      const kept = current[kind].map(x => x.id).filter(id => after.has(id)), keptNext = next[kind].map(x => x.id).filter(id => before.has(id));
      const moved = new Set(kept.filter((id, i) => keptNext[i] !== id));
      for (const id of new Set([...before.keys(), ...after.keys()])) {
        const b = before.get(id), a = after.get(id), reordered = moved.has(id);
        if (!same(b, a) || reordered) changes.push({ kind, id, action: action(b, a), ...(reordered ? { reordered: true } : {}), impact: impact[kind](id, b, a, reordered) });
      }
    }
    if (!same(current.reviewPolicy, next.reviewPolicy)) changes.push({ kind: 'policy', id: 'review-defaults', action: action(current.reviewPolicy, next.reviewPolicy), impact: { lessons: [] } });
    const allLessons = uniq(both.flatMap(c => c.lessons.map(l => l.id))), collections = new Set(['words', 'lessons', 'exercises', 'reviewPolicy']);
    for (const field of uniq([...Object.keys(current), ...Object.keys(next)]).filter(k => !collections.has(k)).sort()) if (!same(current[field], next[field])) changes.push({ kind: 'metadata', id: /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(field) ? field : 'pack', field, action: action(current[field], next[field]), impact: { lessons: allLessons } });
    const view = (c, id) => {
      const i = c.lessons.findIndex(l => l.id === id); if (i < 0) return null;
      const lesson = c.lessons[i], exercises = c.exercises.filter(e => e.lessonId === id || lesson.exerciseIds.includes(e.id) || lesson.checkExerciseIds?.includes(e.id));
      const wordIds = new Set([...lesson.wordIds, ...lesson.blocks.flatMap(x => x.source === 'words' ? c.lessons.find(t => t.id === x.selector?.lessonId)?.wordIds || [] : []), ...exercises.flatMap(e => [e.wordId, ...(e.wordIds || [])])]);
      return canonicalJSON({ lesson, index: i, previous: c.lessons[i - 1]?.id ?? null, following: c.lessons[i + 1]?.id ?? null, exercises: exercises.map(e => [e, this.publicExercise(e, c)]), words: c.words.filter(w => wordIds.has(w.id)) });
    };
    const affected = new Set([...changes.flatMap(c => c.impact?.lessons || []), ...allLessons.filter(id => view(current, id) !== view(next, id))]);
    return { draft, changes, affectedLessons: allLessons.filter(id => affected.has(id)) };
  }
  publish(baseRevisionId, draftToken) {
    if (typeof draftToken !== 'string' || !draftToken) throw this.draftConflict('Publishing needs the reviewed draft token.', 'DRAFT_TOKEN_REQUIRED');
    // Base and token are compared inside the transaction that creates the release, so a stale request cannot publish or clear a newer draft.
    return this.transaction(() => {
      this.expectBase(baseRevisionId, 'Stale publication request.'); this.expectDraft(draftToken);
      const draft = this.currentDraft(); validateContent(draft.content);
      const revisionId = this.addRevision(draft.content, 'Published draft'); this.set('active', revisionId); this.set('draft', null); return { revisionId };
    });
  }
  rollback(revisionId, baseRevisionId, expectedDraftToken) {
    if (expectedDraftToken === undefined) throw this.draftConflict('Rollback discards the draft; name it, or null when there is none.', 'DRAFT_TOKEN_REQUIRED');
    return this.transaction(() => {
      this.expectBase(baseRevisionId, 'Stale rollback request.'); this.expectDraft(expectedDraftToken);
      const content = this.snapshot(revisionId); validateContent(content);
      const next = this.addRevision(content, 'Restored content revision ' + revisionId); this.set('active', next); this.set('draft', null); return { revisionId: next };
    });
  }
  // Author rehearsal reads one exact draft. It never falls back to another draft or to published answers, and writes nothing.
  previewDraft(draftToken) {
    if (typeof draftToken !== 'string' || !draftToken) throw this.draftConflict('Preview needs a draft token.', 'DRAFT_TOKEN_REQUIRED');
    const draft = this.currentDraft();
    if (!draft || draft.draftToken !== draftToken) throw this.draftConflict('This draft changed. Reopen the preview.');
    if (draft.baseRevisionId !== this.get('active')) throw this.draftConflict('Published content changed. Reopen the preview.', 'STALE_BASE');
    return draft;
  }
  previewSession(input) {
    const draft = this.previewDraft(input.draftToken), content = draft.content, lesson = content.lessons.find(l => l.id === input.lessonId);
    if (!lesson) throw new DomainError('Lesson not found in this draft.', 404, 'PREVIEW_TARGET_NOT_FOUND');
    return { mode: 'draft-preview', persistent: false, draftToken: draft.draftToken, baseRevisionId: draft.baseRevisionId, lessonId: lesson.id, content: { ...content, exercises: content.exercises.map(e => this.publicExercise(e, content)) }, steps: lessonSteps(lesson) };
  }
  previewEvaluate(input) {
    const draft = this.previewDraft(input.draftToken), content = draft.content, exercise = content.exercises.find(e => e.id === input.exerciseId);
    if (!content.lessons.some(l => l.id === input.lessonId) || !exercise || exercise.lessonId !== input.lessonId) throw new DomainError('Exercise not found in this draft lesson.', 404, 'PREVIEW_TARGET_NOT_FOUND');
    const { correct, expected } = evaluateAnswer(exercise, content, input.answer);
    return { mode: 'draft-preview', persistent: false, draftToken: draft.draftToken, exerciseId: exercise.id, result: { exerciseId: exercise.id, lessonId: exercise.lessonId, answer: input.answer, correct, expected } };
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
  backup() {
    const rows = prefix => this.db.prepare('SELECT key,value FROM kv WHERE key LIKE ?').all(prefix + '%').map(r => ({ key: r.key, value: JSON.parse(r.value) }));
    const learners = users.map(u => ({ id: u.id, state: this.learner(u.id) })), questions = rows('question-'), reports = rows('report-'), activeRevisionId = this.get('active'), draft = this.get('draft');
    // Every revision that history points at travels with the backup, so restore can remap IDs instead of guessing.
    const referenced = [activeRevisionId, draft?.baseRevisionId, ...learners.flatMap(({ state }) => [...state.attempts.map(a => a.revisionId), ...Object.values(state.resumes).map(p => p.revisionId)]), ...questions.map(q => q.value.revisionId), ...reports.map(r => r.value.attempt?.revisionId)];
    const revisionSnapshots = [...new Set(referenced.filter(Number.isInteger))].sort((a, b) => a - b).map(revisionId => ({ revisionId, content: this.snapshot(revisionId) }));
    return { format: 'hebleo-demo-backup-v2', storeSchemaVersion: STORE_SCHEMA_VERSION, exportedAt: new Date().toISOString(), activeRevisionId, content: this.snapshot(activeRevisionId), draft, learners, events: this.db.prepare('SELECT id,payload FROM events').all().map(row => ({ id: row.id, payload: JSON.parse(row.payload) })), questions, reports, revisionSnapshots, reviewReceipts: rows('review-') };
  }
  restore(input) {
    if (!backupFormats.includes(input?.format) || !Array.isArray(input.learners) || ![2,3].includes(input.learners.length) || new Set(input.learners.map(x => x?.id)).size !== input.learners.length || !['learner-demo','learner-core'].every(id=>input.learners.some(row=>row.id===id))) throw new DomainError('Invalid demo backup.');
    if (!RESTORABLE_SCHEMA_VERSIONS[input.format].includes(input.storeSchemaVersion)) throw new DomainError('This backup declares store schema ' + JSON.stringify(input.storeSchemaVersion ?? null) + '; this build restores ' + input.format + ' with schema ' + RESTORABLE_SCHEMA_VERSIONS[input.format].filter(Boolean).join(' or ') + '. Use a newer build.', 409);
    const v2 = input.format === 'hebleo-demo-backup-v2';
    validateContent(input.content);
    // v1 carried only resumed-lesson snapshots; v2 carries every referenced revision, including the active one.
    const reports=input.reports || [], sessions=(v2 ? input.revisionSnapshots : input.sessionSnapshots) || [], questions=input.questions||[];
    if(!Array.isArray(questions)||new Set(questions.map(q=>q?.key)).size!==questions.length)throw new DomainError('Invalid backup questions.');
    if(!Array.isArray(reports)||new Set(reports.map(r=>r?.key)).size!==reports.length||!Array.isArray(sessions)||new Set(sessions.map(x=>x?.revisionId)).size!==sessions.length)throw new DomainError('Invalid backup reports or lesson sessions.');
    for(const session of sessions){if(!Number.isInteger(session?.revisionId))throw new DomainError('Invalid session revision.');validateContent(session.content);}
    const carried = new Map(sessions.map(s => [s.revisionId, s.content]));
    if (v2) {
      if (!carried.has(input.activeRevisionId) || JSON.stringify(carried.get(input.activeRevisionId)) !== JSON.stringify(input.content)) throw new DomainError('Backup active revision does not match its content.');
      if (input.draft != null) { if (typeof input.draft !== 'object' || input.draft.baseRevisionId !== input.activeRevisionId || typeof input.draft.stagedAt !== 'string') throw new DomainError('Invalid backup draft.'); validateContent(input.draft.content); }
    }
    // A link holds only if its exact carried revision agrees with every reference, as normal writes require: the lesson exists, the exercise belongs to that lesson, an optional word exists.
    // v2 must carry every link and rejects any disagreement. v1 history that does not hold becomes an explicit legacy link with its grade; nothing is repaired or regraded.
    const linked = record => { const c = carried.get(record.revisionId); return Boolean(c) && c.lessons.some(l => l.id === record.lessonId) && (!record.exerciseId || c.exercises.some(e => e.id === record.exerciseId && e.lessonId === record.lessonId)) && (!record.wordId || c.words.some(w => w.id === record.wordId)); };
    const linkable = record => record.revisionId === null ? Number.isInteger(record.legacyRevisionId) : Number.isInteger(record.revisionId) && (!v2 || linked(record));
    // A reported attempt is a copy of a graded attempt, so it needs the same identity and grade as learner history; only questions have optional targets.
    const validId = value => { try { return id(value) === value; } catch { return false; } };
    const savedAttempt = a => Boolean(a) && typeof a === 'object' && typeof a.correct === 'boolean' && Number.isFinite(Date.parse(a.at)) && [a.requestId, a.exerciseId, a.lessonId].every(validId) && linkable(a);
    for(const entry of questions){const q=entry?.value;if(!q || !users.some(u=>u.id===q.userId)||entry.key!=='question-'+q.userId+'-'+id(q.requestId)||!linkable(q)||typeof q.question!=='string'||!q.question.trim()||q.question.length>1500||typeof q.answer!=='string'||q.answer.length>12000||!['waiting','answered'].includes(q.status)||(q.status==='answered'&&!q.answer.trim()))throw new DomainError('Invalid learner question in backup.');id(q.lessonId);if(q.wordId)id(q.wordId);if(q.exerciseId)id(q.exerciseId);}
    // Reports are listed and resolved by their own userId/requestId, so the key must be exactly the one report() derives from them; otherwise resolving one report could update another.
    for(const r of reports){const v=r?.value;if(!v||!users.some(u=>u.id===v.userId)||!validId(v.requestId)||r.key!=='report-'+v.userId+'-'+v.requestId||!['answer','unclear','media'].includes(v.reason)||!['pending','reviewed'].includes(v.status)||typeof v.note!=='string'||v.note.length>2000||!savedAttempt(v.attempt))throw new DomainError('Invalid learner report in backup.');}
    if (!Array.isArray(input.events) || !Array.isArray(input.reviewReceipts)) throw new DomainError('Backup needs replay receipts.');
    if (new Set(input.events.map(e => e?.id)).size !== input.events.length || new Set(input.reviewReceipts.map(r => r?.key)).size !== input.reviewReceipts.length) throw new DomainError('Duplicate backup receipt.');
    for (const e of input.events) { id(e?.id); if (!users.some(u => u.id === e.payload?.userId) || !['membership_cancelled', 'membership_started', 'course_refunded', 'course_purchased'].includes(e.payload?.type)) throw new DomainError('Invalid event receipt.'); }
    for (const r of input.reviewReceipts) if (typeof r?.key !== 'string' || !/^review-(learner-(demo|core)|author-demo)-[A-Za-z0-9_-]+$/.test(r.key) || !r.value || ![1,2,3,4].includes(r.value.rating) || typeof r.value.wordId !== 'string' || !r.value.card) throw new DomainError('Invalid review receipt.');
    for (const row of input.learners) {
      const s = row.state;
      if (!users.some(u => u.id === row.id) || !s || !Array.isArray(s.completed) || !Array.isArray(s.attempts) || !Array.isArray(s.bookmarks) || !Array.isArray(s.purchasedCourses) || !s.cards || !s.notes || !modes.includes(s.preferences?.nikkud) || typeof s.membership !== 'boolean' || !Number.isInteger(s.goal) || s.goal < 1 || s.goal > 120) throw new DomainError('Invalid learner backup.');
      if (Array.isArray(s.cards) || Array.isArray(s.notes) || typeof s.cards !== 'object' || typeof s.notes !== 'object') throw new DomainError('Invalid learner state objects.');
      for (const list of [s.completed, s.bookmarks, s.purchasedCourses]) list.forEach(id);
      for (const a of s.attempts) if (!savedAttempt(a)) throw new DomainError('Invalid saved attempt.');
      for (const [key, note] of Object.entries(s.notes)) { id(key); if (typeof note !== 'string' || note.length > 2000) throw new DomainError('Invalid saved note.'); }
      validatePreferences(s.preferences);
      if(s.resumes){if(typeof s.resumes!=='object'||Array.isArray(s.resumes))throw new DomainError('Invalid saved lesson sessions.');for(const [lessonId,p] of Object.entries(s.resumes)){if(p.lessonId!==lessonId)throw new DomainError('Invalid resume key.');const snapshot=sessions.find(x=>x.revisionId===p.revisionId);if(!snapshot)throw new DomainError('Missing pinned session snapshot.');this.validateProgress(p,s,snapshot.content);}}
      if(s.lastReview){const r=s.lastReview;id(r.requestId);id(r.wordId);for(const card of [r.before,r.after])if(!card||!Number.isFinite(Date.parse(card.due))||!Number.isInteger(card.repetitions)||card.repetitions<0||!Number.isFinite(card.intervalDays)||card.intervalDays<0||typeof card.suspended!=='boolean')throw new DomainError('Invalid review undo state.');}
      for (const [key, c] of Object.entries(s.cards)) { id(key); if (!c || !Number.isFinite(Date.parse(c.due)) || !Number.isFinite(c.intervalDays) || !Number.isInteger(c.repetitions) || c.intervalDays < 0 || c.repetitions < 0 || typeof c.suspended !== 'boolean') throw new DomainError('Invalid review card in backup.'); }
    }
    return this.transaction(() => {
      const ids = new Map(); let revisionId;
      if (v2) { for (const s of [...sessions].sort((a, b) => a.revisionId - b.revisionId)) ids.set(s.revisionId, this.addRevision(s.content, s.revisionId === input.activeRevisionId ? 'Restored local demo backup' : 'Restored backup revision ' + s.revisionId)); revisionId = ids.get(input.activeRevisionId); }
      else { revisionId = this.addRevision(input.content, 'Restored local demo backup'); for (const s of sessions) ids.set(s.revisionId, this.addRevision(s.content, 'Restored pinned lesson session')); }
      // Attempts, resumes, questions and reports move together, so a resumed result still points at the attempt graded in that same revision.
      const relink = record => { if (!record || record.revisionId == null) return; if (linked(record)) record.revisionId = ids.get(record.revisionId); else { record.legacyRevisionId = record.revisionId; record.revisionId = null; } };
      this.set('active', revisionId); this.set('draft', v2 && input.draft ? { ...clone(input.draft), baseRevisionId: revisionId } : null);
      for (const row of input.learners) { const state = clone(row.state); state.attempts.forEach(relink); Object.values(state.resumes || {}).forEach(relink); this.saveLearner(row.id, state); }
      this.db.exec("DELETE FROM events; DELETE FROM kv WHERE key LIKE 'review-%' OR key LIKE 'report-%' OR key LIKE 'question-%';");
      for (const q of questions) { const value = clone(q.value); relink(value); this.set(q.key, value); }
      for (const r of reports) { const value = clone(r.value); relink(value.attempt); this.set(r.key, value); }
      for (const e of input.events) this.db.prepare('INSERT INTO events(id,payload) VALUES(?,?)').run(e.id, JSON.stringify(e.payload));
      for (const r of input.reviewReceipts) this.set(r.key, r.value);
      return { revisionId, revisions: Object.fromEntries(ids) };
    });
  }
}
