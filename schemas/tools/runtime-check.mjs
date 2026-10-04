import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { runtimeFromArgs, reverseKeys, dump } from './runtime-utils.mjs';
import { validateSchema, draftTokenFor, semanticErrors } from './contracts.mjs';
import { syntheticPack } from './fixtures.mjs';

const { Store, directory, commit, draftTokenFor: runtimeToken } = await runtimeFromArgs();
const { createServer } = await import(pathToFileURL(resolve(directory, 'src/server.js')));
let passed = 0;
const check = async (name, fn) => { await fn(); passed++; console.log('PASS ' + name); };
const schema = (definition, data) => assert.deepEqual(validateSchema('studio-wire', data, definition), [], definition);
const s = new Store(':memory:'), server = createServer(s);
// Give all three fictional profiles existing progress and preferences to protect.
for (const user of ['learner-demo', 'learner-core', 'author-demo']) {
  s.attempt(user, { requestId: 'contract-attempt', revisionId: s.get('active'), exerciseId: 'ex-1-recognize', answer: 'who' });
  s.updateLearner(user, { preferences: { keyboardPinned: true } });
}
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = 'http://127.0.0.1:' + server.address().port;
const request = async (path, input, user = 'author-demo') => {
  const response = await fetch(base + '/api/studio' + path, { method: input === undefined ? 'GET' : 'POST', headers: { 'content-type': 'application/json', 'x-demo-user': user }, ...(input === undefined ? {} : { body: JSON.stringify(input) }) });
  assert.equal(response.headers.get('cache-control'), 'no-store');
  return { status: response.status, body: await response.json() };
};
const reject = async (path, input, status, code, user) => {
  const before = dump(s), response = await request(path, input, user);
  assert.equal(response.status, status); assert.equal(response.body.code, code); schema('errorResponse', response.body); assert.equal(dump(s), before);
};
try {
  const revision = s.get('active'), content = syntheticPack(); let staged;
  await check('GET null draft and empty diff match schemas', async () => {
    const r = await request(''); assert.equal(r.status, 200); schema('studioResponse', r.body); schema('noDraftResponse', r.body.preview); assert.equal(r.body.draft, null);
  });
  await check('no-draft, missing token and stale base errors are coded and write nothing', async () => {
    await reject('/draft', { baseRevisionId: revision, content }, 400, 'DRAFT_TOKEN_REQUIRED');
    await reject('/draft', { baseRevisionId: revision + 1, expectedDraftToken: null, content }, 409, 'STALE_BASE');
    await reject('/preview/session', { lessonId: 'lesson-1' }, 400, 'DRAFT_TOKEN_REQUIRED');
    await reject('/preview/session', { lessonId: 'lesson-1', draftToken: 'dt1-' + '0'.repeat(64) }, 409, 'DRAFT_CONFLICT');
  });
  await check('stage preserves every field and emits first-stage unchanged false', async () => {
    assert.deepEqual(semanticErrors(content), []);
    const input = { baseRevisionId: revision, expectedDraftToken: null, content }; schema('stageRequest', input);
    const r = await request('/draft', input); assert.equal(r.status, 200); schema('stageResponse', r.body); staged = r.body;
    assert.equal(staged.unchanged, false); assert.deepEqual(staged.draft.content, content); assert.equal(staged.draftToken, draftTokenFor(revision, content));
    schema('studioResponse', (await request('')).body);
  });
  await check('full-token scope and key-order-only restage preserve time and database rows', async () => {
    const mutations = [c => c.words[0].provenance.kind = 'changed', c => c.words[0].approval.reason += '!', c => c.words[0].fieldFormatting.pointed.textFormatRuns[0].format.bold = false, c => c.words[0].sourceTheme.reverse(), c => c.words[0].sourceFields.unknownColumn += '!', c => c.contracts.sourceMap.entries[0].locator.rowAtCapture++, c => c.contracts.mediaManifest.assets[0].revisions[0].sha256 = 'f'.repeat(64), c => c.words[0].mediaRefs.nativeAudio.revisionId = 'rev-2', c => c.words[0].unknownNested.retained.push('another'), c => c.lessons.reverse()];
    // Give the theme a real edit (the fixture has one theme entry).
    mutations[3] = c => c.words[0].sourceTheme[0].color.rgbColor.green = 0.25;
    for (const mutate of mutations) { const c = structuredClone(content); mutate(c); assert.notEqual(runtimeToken(revision, c), staged.draftToken); assert.equal(runtimeToken(revision, c), draftTokenFor(revision, c)); }
    assert.notEqual(runtimeToken(revision + 1, content), staged.draftToken);
    const before = dump(s), r = await request('/draft', { baseRevisionId: revision, expectedDraftToken: staged.draftToken, content: reverseKeys(content) });
    schema('stageResponse', r.body); assert.equal(r.body.unchanged, true); assert.equal(r.body.draft.stagedAt, staged.draft.stagedAt); assert.equal(dump(s), before);
  });
  await check('HTTP preview matches preparation/evaluation schemas and changes no stored profile rows', async () => {
    const before = dump(s), r = await request('/preview/session', { lessonId: 'lesson-1', draftToken: staged.draftToken });
    assert.equal(r.status, 200); schema('previewSessionResponse', r.body); assert.deepEqual(r.body.steps, ['learn', 'check', 'vocabulary', 'apply', 'complete']);
    for (const exercise of content.exercises) {
      const word = content.words.find(w => w.id === exercise.wordId);
      const answer = exercise.type === 'matching' ? Object.fromEntries(exercise.wordIds.map(id => [id, content.words.find(w => w.id === id).english])) : exercise.type === 'recognition' ? word.english : exercise.type === 'typing' ? word.pointed : exercise.answers[0];
      const input = { lessonId: exercise.lessonId, exerciseId: exercise.id, draftToken: staged.draftToken, answer }; schema('previewEvaluateRequest', input);
      const evaluated = await request('/preview/evaluate', input); assert.equal(evaluated.status, 200); schema('previewEvaluateResponse', evaluated.body); assert.equal(evaluated.body.result.correct, true);
    }
    assert.equal(dump(s), before);
  });
  await check('non-authors, malformed answers and wrong targets are rejected without writes', async () => {
    for (const user of ['learner-demo', 'learner-core']) {
      await reject('', undefined, 403, 'FORBIDDEN', user);
      await reject('/draft', { baseRevisionId: revision, expectedDraftToken: staged.draftToken, content }, 403, 'FORBIDDEN', user);
      await reject('/preview/session', { lessonId: 'lesson-1', draftToken: staged.draftToken }, 403, 'FORBIDDEN', user);
      await reject('/preview/evaluate', { lessonId: 'lesson-1', exerciseId: 'ex-1-type', draftToken: staged.draftToken, answer: '' }, 403, 'FORBIDDEN', user);
    }
    await reject('/preview/evaluate', { lessonId: 'lesson-1', exerciseId: 'ex-1-match', draftToken: staged.draftToken, answer: { 'w-hu': 7 } }, 400, 'INVALID_ANSWER');
    await reject('/preview/evaluate', { lessonId: 'lesson-1', exerciseId: 'ex-1-type', draftToken: staged.draftToken, answer: {} }, 400, 'INVALID_ANSWER');
    await reject('/preview/session', { lessonId: 'missing', draftToken: staged.draftToken }, 404, 'PREVIEW_TARGET_NOT_FOUND');
    await reject('/preview/evaluate', { lessonId: 'lesson-2', exerciseId: 'ex-1-type', draftToken: staged.draftToken, answer: '' }, 404, 'PREVIEW_TARGET_NOT_FOUND');
  });
  await check('newer draft rejects stale saves, preview, publish and rollback atomically', async () => {
    const previous = staged.draftToken, c = structuredClone(content); c.words[0].unknownNested.edited = true;
    staged = (await request('/draft', { baseRevisionId: revision, expectedDraftToken: previous, content: c })).body;
    schema('stageResponse', staged);
    await reject('/draft', { baseRevisionId: revision, expectedDraftToken: previous, content }, 409, 'DRAFT_CONFLICT');
    await reject('/preview/session', { lessonId: 'lesson-1', draftToken: previous }, 409, 'DRAFT_CONFLICT');
    await reject('/preview/evaluate', { lessonId: 'lesson-1', exerciseId: 'ex-1-type', draftToken: previous, answer: '' }, 409, 'DRAFT_CONFLICT');
    await reject('/publish', { baseRevisionId: revision, draftToken: previous }, 409, 'DRAFT_CONFLICT');
    await reject('/rollback', { revisionId: revision, baseRevisionId: revision, expectedDraftToken: previous }, 409, 'DRAFT_CONFLICT');
    await reject('/publish', { baseRevisionId: revision + 1, draftToken: staged.draftToken }, 409, 'STALE_BASE');
  });
  await check('publish and rollback return revision envelopes and enforce null/no-draft CAS', async () => {
    const r = await request('/publish', { baseRevisionId: revision, draftToken: staged.draftToken }); assert.equal(r.status, 200); schema('publishResponse', r.body);
    await reject('/publish', { baseRevisionId: r.body.revisionId, draftToken: staged.draftToken }, 409, 'DRAFT_CONFLICT');
    await reject('/rollback', { revisionId: revision, baseRevisionId: r.body.revisionId }, 400, 'DRAFT_TOKEN_REQUIRED');
    const rollback = await request('/rollback', { revisionId: revision, baseRevisionId: r.body.revisionId, expectedDraftToken: null }); assert.equal(rollback.status, 200); schema('rollbackResponse', rollback.body); assert.equal(s.currentDraft(), null);
    schema('noDraftResponse', (await request('')).body.preview);
  });
  console.log(JSON.stringify({ runtimeCommit: commit, passed, database: ':memory:', transport: 'ephemeral loopback HTTP; closed on exit', limits: 'Contract and backend checks only; no app renderer, browser or independent release acceptance.' }));
} finally { await new Promise(resolve => server.close(resolve)); s.close(); }
