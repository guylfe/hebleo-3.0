import assert from 'node:assert/strict';
import { runtimeFromArgs, reverseKeys, dump } from './runtime-utils.mjs';
const { Store, draftTokenFor, commit } = await runtimeFromArgs();
const cases = [
  ['pack provenance label', c => { c.provenance.label += ' [metadata-only edit]'; }],
  ['pack approval', c => { c.approval = { version: 1, status: 'pending', reason: 'Synthetic test only' }; }],
  ['pack source map', c => { c.contracts = { version: 1, sourceMap: { version: 1, sources: [], entries: [] } }; }],
  ['pack media manifest', c => { c.contracts = { version: 1, mediaManifest: { version: 1, assets: [] } }; }],
  ['pack unknown field', c => { c.unknownPackMetadata = { retained: true }; }]
];
const report = { runtimeCommit: commit, metadata: [] };
for (const [name, mutate] of cases) {
  const s = new Store(':memory:');
  try {
    const content = structuredClone(s.snapshot()), baseRevisionId = s.get('active');
    const before = draftTokenFor(baseRevisionId, content); mutate(content);
    const result = s.stage({ baseRevisionId, expectedDraftToken: null, content });
    assert.deepEqual(s.currentDraft().content, content);
    assert.notEqual(result.draftToken, before);
    report.metadata.push({ name, tokenChanged: true, unchanged: result.unchanged, changes: result.changes, affectedLessons: result.affectedLessons, allLessonsAffected: content.lessons.every(l => result.affectedLessons.includes(l.id)) });
  } finally { s.close(); }
}
const s = new Store(':memory:');
try {
  const content = reverseKeys(s.snapshot()), baseRevisionId = s.get('active');
  const first = s.stage({ baseRevisionId, expectedDraftToken: null, content });
  const before = dump(s);
  const repeated = s.stage({ baseRevisionId, expectedDraftToken: first.draftToken, content: reverseKeys(content) });
  assert.equal(repeated.unchanged, true); assert.equal(dump(s), before);
  report.keyOrderOnly = { tokenMatchesPublishedContent: first.draftToken === draftTokenFor(baseRevisionId, s.snapshot()), firstStageChangeCount: first.changes.length, repeatedStageUnchanged: repeated.unchanged, repeatedStageWrites: false };
} finally { s.close(); }
report.fixed = report.metadata.every(r => r.changes.length > 0 && r.allLessonsAffected) && report.keyOrderOnly.firstStageChangeCount === 0;
console.log(JSON.stringify(report, null, 2));
if (process.argv.includes('--require-fixed') && !report.fixed) process.exitCode = 1;
