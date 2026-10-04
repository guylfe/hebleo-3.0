// Checks the lesson 1-3 candidate against its evidence and the current store validator. Writes nothing.
// Usage: node docs/content-provenance/tools/check-lesson-1.3.mjs
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { validateContent, normalizeHebrew } from '../../../src/store.js';

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const evidence = read('../lesson-1.3-source-rows.json');
const idMap = read('../lesson-1.3-id-map.json');
const pack = read('../../curriculum/lesson-1.3/candidate-pack.json');
const rowById = new Map(evidence.rows.map((r) => [r.stableId, r]));
let checks = 0;
const ok = (name, fn) => { fn(); checks++; console.log('ok', name); };

ok('unapproved pack is rejected by the current store validator', () => {
  assert.throws(() => validateContent(structuredClone(pack)), /explicit provenance/);
});
ok('pack is otherwise structurally valid (in-memory provenance substitution only)', () => {
  validateContent({ ...structuredClone(pack), provenance: { kind: 'synthetic-demo' } });
});
ok('stable IDs are unique and not row ordinals', () => {
  const ids = [...Object.values(idMap.words), ...Object.values(idMap.exercises), ...Object.values(idMap.lessons)].map((x) => x.id);
  assert.equal(new Set(ids).size, ids.length);
  ids.forEach((id) => assert.match(id, /^h[wxl]-[0-9a-f]{10}$/));
});
ok('every word carries exact source strings and a matching row hash', () => {
  for (const w of pack.words) {
    const r = rowById.get(w.id);
    assert.ok(r, w.id);
    assert.equal(w.pointed, r.cells.Hebrew);
    assert.equal(w.english, r.cells.English);
    assert.equal(w.notes, r.cells.Notes);
    assert.equal(w.provenance.rowSha256, r.rowSha256);
    assert.equal(w.provenance.approval, 'pending');
    assert.equal(w.audio, undefined, 'audio stays unattached until a match is confirmed');
    for (const [k, v] of Object.entries(w.sourceFields)) assert.equal(v, r.cells[k], k);
  }
});
ok('No_Vocab/No_Card are not activated without source evidence', () => {
  for (const w of pack.words) { assert.equal(w.noVocab, undefined); assert.equal(w.noCard, undefined); }
  for (const r of evidence.rows) { assert.equal(r.cells.No_Vocab, undefined); assert.equal(r.cells.No_Card, undefined); }
});
ok('without required Nikkud, both sheet and answer-key forms are accepted', () => {
  for (const e of pack.exercises) {
    const w = pack.words.find((x) => x.id === e.wordId);
    assert.equal(normalizeHebrew(w.pointed), normalizeHebrew(e.provenance.answerKeyHebrew));
  }
});
ok('requiring Nikkud would reject the answer-key form for exactly the dagesh/shva items (decision D4 evidence)', () => {
  const rejected = pack.exercises.filter((e) => {
    const w = pack.words.find((x) => x.id === e.wordId);
    return normalizeHebrew(w.pointed, true) !== normalizeHebrew(e.provenance.answerKeyHebrew, true);
  }).map((e) => e.provenance.answerKeyHebrew);
  assert.deepEqual(rejected.sort(), ['אַת', 'אַתֶם', 'אַתֶן', 'אַתָה', 'מַתָנָה'].sort());
});
console.log(`${checks} checks passed`);
