import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {projectLesson,deriveLessonIndices} from '../../public/course.js';
import {Store} from '../../src/store.js';
import { seed } from '../../src/seed.js';
import { syntheticPack } from '../tools/fixtures.mjs';
import { validateSchema, semanticErrors, publicationEligibility, resolveSourceIdentity, mergeSourceField, objectDigest, mediaDigest, dependenciesFor, collections, sha256, draftTokenFor } from '../tools/contracts.mjs';
import { reverseKeys } from '../tools/runtime-utils.mjs';

test('seed and synthetic interchange are valid without mutation; seed is private-demo only', () => {
  for (const p of [structuredClone(seed), syntheticPack()]) {
    const before = JSON.stringify(p); assert.deepEqual(validateSchema('content-pack', p), []); assert.deepEqual(semanticErrors(p), []);
    assert.equal(publicationEligibility(p).eligible, false); assert.equal(publicationEligibility(p, { mode: 'private-demo' }).eligible, true); assert.equal(JSON.stringify(p), before);
  }
});
test('required explicit Hebrew forms cannot be inferred by validation', () => {
  const p = syntheticPack(); delete p.words[0].unpointed;
  assert.ok(validateSchema('content-pack', p).length); assert.equal(p.words[0].unpointed, undefined);
});
test('unknown values, rich formatting, themes and explicit forms survive JSON unchanged', () => {
  const p = syntheticPack(), copy = JSON.parse(JSON.stringify(p)); assert.deepEqual(copy, p); assert.deepEqual(validateSchema('content-pack', copy), []);
  assert.equal(draftTokenFor(1, p), draftTokenFor(1, reverseKeys(copy))); copy.words[0].fieldFormatting.pointed.textFormatRuns[0].format.bold = false;
  assert.notEqual(draftTokenFor(1, p), draftTokenFor(1, copy));
});
test('stable IDs and dependency/selector references reject ambiguity', () => {
  const p = syntheticPack(); p.words.push(structuredClone(p.words[0])); assert.match(semanticErrors(p).join(), /duplicate ID/);
  p.words.pop(); p.lessons[0].wordIds.push('missing'); assert.match(semanticErrors(p).join(), /missing dependency/);
  p.lessons[0].blocks[1].selector.lessonId = 'missing'; assert.match(semanticErrors(p).join(), /invalid selector/);
});
test('same-snapshot row lookup works; reorder in a new snapshot never auto-assigns identity', () => {
  const map = syntheticPack().contracts.sourceMap, entry = map.entries[0];
  const row = { sourceId: entry.sourceId, rowSha256: entry.rowSha256, locator: entry.locator, snapshotSha256: map.sources[0].snapshotSha256 };
  assert.equal(resolveSourceIdentity(map, row).status, 'frozen-snapshot');
  assert.equal(resolveSourceIdentity(map, { ...row, snapshotSha256: sha256('reordered'), locator: { rowAtCapture: 20 } }).status, 'review-required');
  assert.deepEqual(resolveSourceIdentity(map, { ...row, entryId: entry.entryId, snapshotSha256: sha256('new') }).object, entry.object);
});
test('duplicate row hashes stay ambiguous; duplicate frozen locators are invalid', () => {
  const p = syntheticPack(), map = p.contracts.sourceMap, entry = map.entries[0];
  map.entries.push({ ...entry, entryId: 'another', object: { collection: 'words', id: p.words[1].id } });
  assert.match(semanticErrors(p).join(), /ambiguous frozen locator/);
  assert.equal(resolveSourceIdentity(map, { sourceId: entry.sourceId, rowSha256: entry.rowSha256, snapshotSha256: sha256('new'), locator: { rowAtCapture: 2 } }).candidates.length, 2);
});
test('source omissions retain work; simultaneous source and Studio edits require resolution', () => {
  assert.deepEqual(mergeSourceField({ base: 'a', source: undefined, studio: 'b', owner: 'source' }), { status: 'omitted-retained', value: 'b' });
  assert.equal(mergeSourceField({ base: 'a', source: 'c', studio: 'b', owner: 'source' }).status, 'conflict');
  assert.equal(mergeSourceField({ base: 'a', source: 'c', studio: 'a', owner: 'source' }).value, 'c');
  assert.equal(mergeSourceField({ base: 'a', source: 'c', studio: 'b', owner: 'studio' }).value, 'b');
});
test('media pins must resolve exact asset, revision and hash; legacy URLs remain unpinned', () => {
  const p = syntheticPack(); p.words[0].mediaRefs.nativeAudio.sha256 = 'a'.repeat(64); assert.match(semanticErrors(p).join(), /unresolved media pin/);
  assert.ok(validateSchema('common', { assetId: 'a', revisionId: 'r' }, 'mediaRef').length);
  assert.deepEqual(validateSchema('common', 'https://example.invalid/legacy.mp3', 'mediaRef'), []);
});
test('pending source objects cannot inherit synthetic or verified pack approval', () => {
  const p = syntheticPack(); p.words[0].provenance = { kind: 'source-candidate', approval: 'pending' };
  assert.equal(publicationEligibility(p, { mode: 'private-demo' }).eligible, false);
  p.provenance.kind = 'verified-source'; assert.equal(publicationEligibility(p).eligible, false);
});
// Only metadata is simulated below, over synthetic seed fixtures. These records

test('pending fields veto the private synthetic compatibility exception', () => {
  const p = syntheticPack(); p.words[0].provenance.fields = { curated: { approval: 'pending' } };
  const result = publicationEligibility(p, { mode: 'private-demo' });
  assert.equal(result.eligible, false); assert.match(result.reasons.join(), /field approval/);
});

// are never exported, published or presented as real human approvals.
function simulatedApprovedPack() {
  const p = structuredClone(seed); p.provenance = { kind: 'verified-source', label: 'SIMULATED TEST ONLY' };
  for (const kind of collections) for (const o of p[kind]) o.provenance = { kind: 'human-authored', label: 'SIMULATED TEST ONLY' };
  for (const kind of collections) for (const o of p[kind]) o.approval = { version: 1, status: 'approved', reviewedBy: 'synthetic-test', reviewedAt: '2026-10-04T00:00:00Z', contentSha256: objectDigest(o), dependencies: dependenciesFor(kind, o, p).map(d => ({ ...d, sha256: objectDigest(p[d.collection].find(x => x.id === d.id)) })) };
  return p;
}
test('changed content or dependency invalidates approval digests', () => {
  const p = simulatedApprovedPack(); assert.equal(publicationEligibility(p).eligible, true);
  p.words[0].english += ' TEST EDIT'; const r = publicationEligibility(p); assert.equal(r.eligible, false); assert.match(r.reasons.join(), /approval digest changed/); assert.match(r.reasons.join(), /dependency approval changed/);
});
test('pending fields, unpinned media and missing approval dependencies stay ineligible', () => {
  const p = simulatedApprovedPack(); p.words[0].provenance.fields = { curated: { approval: 'pending' } };
  assert.match(publicationEligibility(p).reasons.join(), /field approval/);
  const legacy = simulatedApprovedPack(); legacy.words[0].audio = 'https://example.invalid/legacy.mp3'; assert.match(publicationEligibility(legacy).reasons.join(), /legacy media is unpinned/);
  const missing = simulatedApprovedPack(); missing.lessons[0].approval.dependencies.pop(); assert.match(publicationEligibility(missing).reasons.join(), /dependency set differs/);
});
test('wire fixtures validate by named definitions and missing CAS token is invalid', () => {
  const examples = JSON.parse(readFileSync(new URL('../examples/synthetic-wire.json', import.meta.url)));
  for (const [name, example] of Object.entries(examples)) if (name !== 'label') assert.deepEqual(validateSchema('studio-wire', example, name), [], name);
  const missing = { ...examples.stageRequest }; delete missing.expectedDraftToken; assert.ok(validateSchema('studio-wire', missing, 'stageRequest').length);
});

test('media approval binds asset identity and revision metadata; no bytes are fetched', () => {
  const p = syntheticPack(), asset = p.contracts.mediaManifest.assets[0], revision = asset.revisions[0];
  revision.provenance = { kind: 'human-authored', label: 'SIMULATED TEST ONLY; no bytes exist' };
  revision.approval = { version: 1, status: 'approved', reviewedBy: 'synthetic-test', reviewedAt: '2026-10-04T00:00:00Z', contentSha256: mediaDigest(asset.assetId, revision), dependencies: [] };
  assert.equal(publicationEligibility(p, { mode: 'private-demo' }).eligible, true);
  revision.url = '/media/replaced.mp3';
  assert.match(publicationEligibility(p, { mode: 'private-demo' }).reasons.join(), /media\/fixture-audio\/rev-1: approval required or changed/);
  assert.notEqual(mediaDigest('other-asset', revision), mediaDigest(asset.assetId, revision));
});
test('preview response schemas reject learner writes and answer-key leakage', () => {
  assert.ok(validateSchema('studio-wire', { mode: 'draft-preview', persistent: true }, 'previewSessionResponse').length);
  assert.ok(validateSchema('learner-content', syntheticPack()).length, 'raw author exercises are not the learner wire shape');
});

test('additive v2 schemas accept repeated text, optional mixed chapters and keyed preview; malformed typed selectors fail without rewriting legacy',()=>{
 const p=syntheticPack();p.lessons=p.lessons.map(l=>projectLesson(p,l));const l=p.lessons[0];l.blocks.push({...structuredClone(l.blocks[0]),id:'synthetic-second-text',text:'SYNTHETIC schema-only text'});p.lessons[0]=deriveLessonIndices(p,l);
 p.curriculum={version:1,chapters:[{id:'synthetic-ch',title:'Synthetic chapter',lessonIds:['lesson-2']}],order:[{lessonId:'lesson-1'},{chapterId:'synthetic-ch'},{lessonId:'lesson-3'}]};
 const before=JSON.stringify(p);assert.deepEqual(validateSchema('content-pack',p),[]);assert.deepEqual(semanticErrors(p),[]);assert.equal(JSON.stringify(p),before);
 const bad=structuredClone(p);bad.lessons[0].blocks[1].selector={mode:'tags',tags:['qa']};assert.ok(validateSchema('content-pack',bad).length);
 const legacy=syntheticPack();legacy.words[0].tags={legacyOpaque:true};assert.deepEqual(validateSchema('content-pack',legacy),[]);
 legacy.words[0].taggingVersion=1;assert.ok(validateSchema('content-pack',legacy).length);
});


test('RR-F18-01 learner schema forbids author import records and retains other source fields',()=>{
 const p=structuredClone(seed),source={version:1,headers:['id','pointed','unpointed','curated','english'],values:['id','pointed','unpointed','curated','english'].map(k=>p.words[0][k]),columns:['id','pointed','unpointed','curated','english'].map((target,columnIndex)=>({columnIndex,target,decode:'string'}))};
 p.words[0].sourceFields={synthetic:'SYNTHETIC preserved unknown'};const s=new Store();try{const wire=s.publicContent(p);assert.deepEqual(validateSchema('learner-content',wire),[]);wire.words[0].importSource=source;assert.ok(validateSchema('learner-content',wire).some(e=>e.includes('importSource')));}finally{s.close();}p.words[0].importSource=source;assert.deepEqual(validateSchema('content-pack',p),[]);
});
test('RR-F18-04 structural and semantic source validation rejects malformed records without changing source',()=>{
 const p=structuredClone(seed),w=p.words[0],source={version:1,headers:['id','pointed','unpointed','curated','english','note'],values:[...['id','pointed','unpointed','curated','english'].map(k=>w[k]),'SYNTHETIC exact unknown'],columns:['id','pointed','unpointed','curated','english'].map((target,columnIndex)=>({columnIndex,target,decode:'string'}))};w.importSource=source;const before=JSON.stringify(p);assert.deepEqual(validateSchema('content-pack',p),[]);assert.deepEqual(semanticErrors(p),[]);assert.equal(JSON.stringify(p),before);
 for(const bad of ['malformed',null,{...source,version:2},{...source,columns:undefined},{...source,values:[1,...source.values.slice(1)]},{...source,columns:source.columns.map((x,i)=>i?x:{...x,decode:'json'})}]){const c=structuredClone(p);c.words[0].importSource=bad;const unchanged=JSON.stringify(c);assert.ok(validateSchema('content-pack',c).length);assert.ok(semanticErrors(c).length);assert.equal(JSON.stringify(c),unchanged);}
 for(const bad of [{...source,values:source.values.slice(1)},{...source,columns:source.columns.slice(1)},{...source,columns:source.columns.map((x,i)=>i===1?{...x,columnIndex:0}:x)}]){const c=structuredClone(p);c.words[0].importSource=bad;assert.ok(semanticErrors(c).length);}
});
