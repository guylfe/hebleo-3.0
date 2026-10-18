import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {LEXICAL_VERSION, SOURCE_SCHEMA_VERSION, SLOT_IDS, SLOT_DEFINITIONS, slotsForCategory, validateLexicalContent,
  validateCatalogue, computeEligibility, projectLessonTitles, projectVerbCitation, resolveLexicalAlias,
  readLessonUnlocks, resolveFieldOwnership, previewProgressMigration, isApproved} from '../public/lexical-contract.js';

// Metadata and text below are synthetic test fixtures, never source/curriculum approvals.
const approved = (revision = 'r1') => ({status: 'approved', reviewedRevision: revision, reviewedBy: 'synthetic-test', reviewedAt: '2026-10-18T00:00:00Z'});
const pending = () => ({status: 'pending'});
const variant = (id, text = 'synthetic') => ({variantId: id, revision: 'r1', origin: 'source', sourceRefs: ['synthetic:cell'],
  review: approved(), mappingReview: approved(), representations: {pointed: {text}}});
const word = (wordKey, category = 'verb') => ({wordKey, category, revision: 'r1', identityReview: approved(), fieldConflicts: [], classMemberships: [],
  forms: slotsForCategory(category).map(slotId => ({slotId, status: 'supplied', variants: [variant(wordKey + ':' + slotId)]}))});
function fixture() {
  const content = {version: LEXICAL_VERSION, sourceSchemaVersion: SOURCE_SCHEMA_VERSION,
    words: [word('v'), word('v2'), word('a', 'adjective'), word('p', 'preposition'), word('n', 'noun'), word('o', 'other')],
    classes: [], aliases: [], usages: [], examples: [], unlocks: [], introductions: []};
  const catalogue = {status: 'connected', courses: [{id: 'c', lessonIds: ['2.10', '2.1.5', '2.2']}, {id: 'other', lessonIds: ['2.2', '2.10']}],
    lessons: [{id: '2.10', title: 'First'}, {id: '2.1.5', title: 'Second'}, {id: '2.2', title: 'Third'}]};
  const introduce = (wordKey, lessonId = '2.10', courseId = 'c', action = 'introduce') => content.introductions.push({linkId: `link-${content.introductions.length}`,
    wordKey, lessonId, courseId, action, revision: 'r1', review: approved()});
  const unlock = (slotIds, lessonId = '2.10', scope = {kind: 'all', category: 'verb'}, courseId = 'c') => content.unlocks.push({unlockId: `unlock-${content.unlocks.length}`,
    courseId, lessonId, scope, slotIds, revision: 'r1', review: approved()});
  const eligible = (wordKey = 'v', lessonId = '2.10', courseId = 'c', representation = 'pointed') => computeEligibility(content, catalogue, {wordKey, lessonId, courseId, representation});
  const state = (slotId, ...args) => eligible(...args).slots.find(s => s.slotId === slotId);
  return {content, catalogue, introduce, unlock, eligible, state};
}
const slot = 'verb.past.I';

test('42 unchanged semantic IDs, category inventories and declared shared cells', async () => {
  assert.equal(SLOT_IDS.length, 42); assert.equal(new Set(SLOT_IDS).size, 42);
  assert.deepEqual(['verb', 'adjective', 'preposition'].map(c => slotsForCategory(c).length), [28, 4, 10]);
  const pinned = JSON.parse(await readFile(new URL('../schemas/lexical-slots.v1.json', import.meta.url)));
  assert.deepEqual(SLOT_IDS, pinned.slotIds);
  assert.equal(SLOT_DEFINITIONS.find(s => s.id === 'verb.past.they').shared, true);
  assert.equal(SLOT_DEFINITIONS.find(s => s.id === 'preposition.הן').shared, false);
  assert.equal(SLOT_DEFINITIONS.find(s => s.id === 'preposition.הם').pronoun, 'הם');
});
test('complete inventories are required; other categories survive unchanged', () => {
  const f = fixture(); assert.equal(validateLexicalContent(f.content, f.catalogue).ok, true);
  f.content.words[0].forms.pop(); assert.equal(validateLexicalContent(f.content).ok, false);
  assert.equal(f.eligible().wordAvailable, false);
});
test('source presence does not unlock; citation pair stays available independently', () => {
  const f = fixture(); f.introduce('v');
  assert.equal(f.state(slot).state, 'locked');
  assert.deepEqual(f.eligible().citation.slots.map(s => s.slotId), ['verb.past.he', 'verb.present.Singular M']);
  assert.equal(f.eligible().citation.slots.every(s => s.variants.length === 1), true);
  assert.equal(f.eligible().citation.separator, '-');
});
test('only approved introduce bindings make a word available; reuse/legacy do not', () => {
  const f = fixture(); f.introduce('v', '2.10', 'c', 'reuse'); f.unlock([slot]);
  assert.equal(f.state(slot).state, 'word-unavailable'); assert.equal(f.eligible().citation, null);
  f.content.introductions.push({linkId: 'legacy', wordKey: 'v', action: 'legacy', legacyReference: '2.1.5', revision: 'r1', review: approved()});
  assert.equal(f.eligible().wordAvailable, false);
  f.introduce('v'); f.content.introductions.at(-1).review = pending(); assert.equal(f.eligible().wordAvailable, false);
  f.content.introductions.at(-1).review = approved(); assert.equal(f.eligible().wordAvailable, true);
});
test('authoritative sequence governs cumulative eligibility; empty additions never revoke', () => {
  const f = fixture(); f.introduce('v'); f.unlock([slot], '2.1.5'); f.unlock([], '2.2');
  assert.equal(f.state(slot).state, 'locked'); assert.equal(f.state(slot, 'v', '2.1.5').addedHere, true);
  assert.equal(f.state(slot, 'v', '2.2').inherited, true); assert.equal(f.state(slot, 'v', '2.2').state, 'available');
  f.catalogue.courses[0].lessonIds = ['2.10', '2.2', '2.1.5'];
  assert.equal(f.state(slot, 'v', '2.2').state, 'locked');
});
test('course context isolates otherwise identical lesson IDs', () => {
  const f = fixture(); f.introduce('v'); f.unlock([slot]);
  assert.equal(f.eligible('v', '2.10', 'other').wordAvailable, false);
  f.introduce('v', '2.2', 'other'); assert.equal(f.state(slot, 'v', '2.10', 'other').state, 'locked');
});
test('word scopes never leak; class scope needs both reviewed class and membership', () => {
  const f = fixture(); f.introduce('v'); f.introduce('v2');
  f.unlock([slot], '2.10', {kind: 'word', wordKey: 'v', category: 'verb'});
  assert.equal(f.state(slot).state, 'available'); assert.equal(f.state(slot, 'v2').state, 'locked');
  f.content.classes.push({classId: 'class-a', category: 'verb', revision: 'r1', review: approved()});
  f.content.words[1].root = 'class-a'; f.content.words[1].pattern = 'class-a';
  f.unlock([slot], '2.10', {kind: 'class', classId: 'class-a', category: 'verb'});
  assert.equal(f.state(slot, 'v2').state, 'locked');
  f.content.words[1].classMemberships.push({classId: 'class-a', review: pending()});
  assert.equal(f.state(slot, 'v2').state, 'locked');
  f.content.words[1].classMemberships[0].review = approved(); assert.equal(f.state(slot, 'v2').state, 'available');
  f.content.classes[0].review = pending(); assert.equal(f.state(slot, 'v2').state, 'locked');
});
test('cross-category scopes and unknown slots fail closed', () => {
  const f = fixture(); f.introduce('v'); f.unlock([slot], '2.10', {kind: 'word', wordKey: 'a', category: 'verb'});
  assert.equal(f.eligible().ok, false);
  f.content.unlocks[0].scope = {kind: 'all', category: 'verb'}; f.content.unlocks[0].slotIds = ['verb.past.i'];
  assert.equal(f.eligible().ok, false);
});
test('missing, unapproved, unresolved, inapplicable and locked have distinct states', () => {
  const f = fixture(); f.introduce('v'); f.unlock([slot]); const form = f.content.words[0].forms.find(x => x.slotId === slot);
  form.variants[0].review = pending(); assert.equal(f.state(slot).state, 'unapproved');
  form.variants[0].review = approved(); form.variants[0].mappingReview = pending(); assert.equal(f.state(slot).state, 'unapproved');
  form.variants = []; form.status = 'missing'; assert.equal(f.state(slot).state, 'missing');
  form.status = 'inapplicable'; assert.equal(f.state(slot).state, 'inapplicable');
  form.status = 'unresolved'; assert.equal(f.state(slot).state, 'unresolved');
  f.content.unlocks = []; assert.equal(f.state(slot).state, 'locked'); assert.equal(f.state(slot).sourceState, 'unresolved');
});
test('selected representation must exist; never strip nikkud or substitute citation slots', () => {
  const f = fixture(); f.introduce('v'); f.unlock([slot]);
  assert.equal(f.state(slot, 'v', '2.10', 'c', 'unpointed').state, 'missing');
  const form = f.content.words[0].forms.find(x => x.slotId === 'verb.past.he'); form.status = 'inapplicable'; form.variants = [];
  const citation = projectVerbCitation(f.content.words[0]);
  assert.equal(citation.slots[0].sourceState, 'inapplicable'); assert.deepEqual(citation.slots[0].variants, []);
  assert.equal(citation.slots[1].sourceState, 'available');
});
test('pending generated text never reaches learner projection; supplied alternatives all survive', () => {
  const f = fixture(); f.introduce('v'); f.unlock([slot]);
  const form = f.content.words[0].forms.find(x => x.slotId === slot);
  form.variants.push({...variant('draft', 'DO NOT EXPOSE'), origin: 'generated', review: pending()}, variant('alternative', 'exact alternative'));
  const output = f.eligible(); assert.equal(JSON.stringify(output).includes('DO NOT EXPOSE'), false);
  assert.equal(f.state(slot).variants.length, 2); assert.equal(JSON.stringify(output).includes('synthetic:cell'), false);
});
test('approval records must match revision and have issuer/date; field conflicts hold the word', () => {
  const f = fixture(); f.introduce('v'); f.unlock([slot]);
  assert.equal(isApproved({status: 'approved'}, 'r1'), false);
  f.content.words[0].revision = 'r2'; assert.equal(f.eligible().ok, false);
  f.content.words[0].identityReview = approved('r2'); f.content.words[0].fieldConflicts = ['audio ownership'];
  assert.equal(f.eligible().wordState, 'unresolved'); assert.equal(f.eligible().citation, null);
});
test('seven then ten prepositions, partial adjectives and staged verb tenses', () => {
  const f = fixture(); ['p', 'a', 'v'].forEach(w => f.introduce(w));
  const preps = slotsForCategory('preposition'); f.unlock(preps.slice(0, 7), '2.10', {kind: 'all', category: 'preposition'});
  f.unlock(preps.slice(7), '2.1.5', {kind: 'all', category: 'preposition'});
  f.unlock(['adjective.ms'], '2.10', {kind: 'all', category: 'adjective'});
  for (const [group, lesson] of [['past', '2.10'], ['present', '2.1.5'], ['future', '2.2']]) f.unlock(SLOT_IDS.filter(s => s.startsWith('verb.' + group + '.')), lesson);
  const count = (w, l) => f.eligible(w, l).slots.filter(s => s.state === 'available').length;
  assert.deepEqual([count('p', '2.10'), count('p', '2.1.5'), count('a', '2.10')], [7, 10, 1]);
  assert.deepEqual(['2.10', '2.1.5', '2.2'].map(l => count('v', l)), [9, 13, 22]);
});
test('live titles change after rename; unknown, unconnected and legacy labels are explicit', () => {
  const f = fixture(); f.introduce('v'); const links = [...f.content.introductions, {linkId: 'unknown', lessonId: 'unknown', courseId: 'c'}, {linkId: 'legacy', action: 'legacy'}];
  assert.equal(projectLessonTitles(links, f.catalogue)[0].title, 'First');
  f.catalogue.lessons[0].title = 'Renamed'; assert.equal(projectLessonTitles(links, f.catalogue)[0].title, 'Renamed');
  assert.deepEqual(projectLessonTitles(links, f.catalogue).map(l => l.status), ['connected', 'unknown-lesson', 'unbound']);
  f.catalogue.status = 'unconnected'; assert.equal(projectLessonTitles(links, f.catalogue)[0].title, null); assert.equal(f.eligible().ok, false);
});
test('malformed catalogue, duplicate IDs and unknown courses cannot yield eligibility', () => {
  const f = fixture(); f.introduce('v'); f.unlock([slot]);
  f.catalogue.courses[0].lessonIds.push('2.10'); assert.equal(validateCatalogue(f.catalogue).ok, false); assert.equal(f.eligible().ok, false);
  f.catalogue.courses[0].lessonIds.pop(); f.content.unlocks[0].courseId = 'unknown'; assert.equal(f.eligible().ok, false);
  assert.equal(validateLexicalContent(null).ok, false); assert.equal(validateCatalogue(null).ok, false);
});
test('rich runs retain exact UTF-16 text and reject split surrogates, unsorted/out of range runs', () => {
  const f = fixture(); f.introduce('v'); f.unlock([slot]);
  const rich = {text: 'א😀ב\n', runs: [{startIndex: 0, format: {bold: true}}, {startIndex: 3, format: {foregroundColor: '#123456'}}]};
  f.content.words[0].forms.find(x => x.slotId === slot).variants[0].representations.pointed = rich;
  const before = JSON.stringify(f.content); assert.deepEqual(f.state(slot).variants[0].runs, rich.runs); assert.equal(JSON.stringify(f.content), before);
  for (const index of [2, 5, -1, 0]) { rich.runs[1].startIndex = index; assert.equal(validateLexicalContent(f.content).ok, false); }
});
test('aliases are namespace scoped; repeated aliases/forms/links never add lexical rows', () => {
  const f = fixture(); const alias = (aliasId, namespace = 'workbook-A') => ({kind: 'source', namespace, aliasId, wordKey: 'v', revision: 'r1', review: approved()});
  f.content.aliases = [alias('mf-000273'), alias('mf-000274'), {...alias('mf-000273', 'workbook-B'), wordKey: 'v2'}];
  f.introduce('v'); f.introduce('v', '2.1.5', 'c', 'reuse');
  assert.equal(validateLexicalContent(f.content, f.catalogue).ok, true);
  assert.equal(resolveLexicalAlias(f.content, {kind: 'source', namespace: 'workbook-A', aliasId: 'mf-000274'}).wordKey, 'v');
  assert.equal(resolveLexicalAlias(f.content, {kind: 'source', namespace: 'workbook-B', aliasId: 'mf-000273'}).wordKey, 'v2');
  f.content.aliases.push(alias('mf-000273')); assert.equal(validateLexicalContent(f.content).ok, false);
  assert.equal(resolveLexicalAlias(f.content, {kind: 'source', namespace: 'workbook-A', aliasId: 'mf-000273'}).status, 'conflict');
});
test('Usage and Examples retain separate child IDs and cannot bind across words', () => {
  const f = fixture(); f.content.usages = [{usageId: 'usage', wordKey: 'v', notes: 'exact notes'}];
  f.content.examples = [{exampleId: 'example', wordKey: 'v', usageId: 'usage', english: 'exact example'}];
  assert.equal(validateLexicalContent(f.content).ok, true);
  f.content.examples[0].wordKey = 'v2'; assert.equal(validateLexicalContent(f.content).ok, false);
});
test('audio/flags conflicts require exact reviewed resolution; missing and false are different', () => {
  const candidates = [{sourceRef: 'a', value: false}, {sourceRef: 'b', value: ''}];
  assert.equal(resolveFieldOwnership({candidates}).status, 'conflict');
  const resolution = {revision: 'r1', review: approved(), candidates: structuredClone(candidates), value: false};
  assert.equal(resolveFieldOwnership({candidates, resolution}).value, false);
  candidates.push({sourceRef: 'c', value: true}); assert.equal(resolveFieldOwnership({candidates, resolution}).status, 'conflict');
  assert.equal(resolveFieldOwnership({candidates: [{sourceRef: 'a', value: 'audio-a'}, {sourceRef: 'b', value: 'audio-b'}]}).status, 'conflict');
  assert.equal(resolveFieldOwnership({candidates: [{sourceRef: 'a', value: 'same'}, {sourceRef: 'b', value: 'same'}]}).status, 'agreed');
});
test('compatibility adds nothing for absent settings and rejects unknown versions', () => {
  assert.deepEqual(readLessonUnlocks(undefined).additions, []);
  assert.equal(readLessonUnlocks(undefined).mode, 'legacy-no-additions');
  assert.equal(readLessonUnlocks({version: 'future', additions: []}).ok, false);
  assert.equal(readLessonUnlocks(null).ok, false);
  assert.equal(readLessonUnlocks({version: LEXICAL_VERSION, additions: []}).mode, 'explicit');
});
test('progress preview retains card identity, never writes schedules, and reports collisions per learner', () => {
  const f = fixture(), mappings = ['old-1', 'old-2'].map(legacyWordId => ({legacyWordId, wordKey: 'v', revision: 'r1', review: approved()}));
  const progress = [{learnerId: 'u', wordId: 'old-1', cardId: 'card-a', schedule: {due: 12}}, {learnerId: 'u', wordId: 'old-2', cardId: 'card-b', schedule: {due: 99}},
    {learnerId: 'other-user', wordId: 'old-1', cardId: 'card-c', schedule: {due: 3}}, {learnerId: 'u', wordId: 'untouched', cardId: 'card-d', schedule: {due: 4}}];
  const before = JSON.stringify({content: f.content, mappings, progress}), output = previewProgressMigration({content: f.content, mappings, progress});
  assert.equal(output.canApply, false); assert.equal(output.conflicts[0].code, 'multiple-schedules');
  assert.equal(output.proposals[0].cards[0].cardId, 'card-c'); assert.equal(output.unchanged[0].cardId, 'card-d');
  assert.equal(JSON.stringify(output).includes('schedule":'), false); assert.equal(output.reverseMappings.length, 2);
  assert.equal(JSON.stringify({content: f.content, mappings, progress}), before);
  progress.push({learnerId: 'other-user', wordId: 'v', cardId: 'existing-canonical', schedule: {due: 77}});
  assert.equal(previewProgressMigration({content: f.content, mappings, progress}).conflicts.filter(c => c.code === 'multiple-schedules').length, 2);
});
test('ambiguous and unapproved migration mappings are held', () => {
  const f = fixture(), mapping = {legacyWordId: 'old', wordKey: 'v', revision: 'r1', review: pending()};
  assert.equal(previewProgressMigration({content: f.content, mappings: [mapping], progress: []}).conflicts[0].code, 'unapproved-mapping');
  assert.equal(previewProgressMigration({content: f.content, mappings: [mapping, {...mapping, wordKey: 'v2'}], progress: []}).conflicts[0].code, 'ambiguous-mapping');
});
