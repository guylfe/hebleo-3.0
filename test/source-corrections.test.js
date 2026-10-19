import test from 'node:test';
import assert from 'node:assert/strict';
import {Store} from '../src/store.js';
import {fixture,author} from '../test-support/source-fixture.js';
import {copy,sha256} from '../src/source-utils.js';
import {capturePayload,validateCapture} from '../src/google-source.js';
import {projectLesson,deriveLessonIndices} from '../public/course.js';
import {validateSourceOwnership} from '../src/source-invariants.js';

// Synthetic adversarial data only. Each rejection compares every table plus
// SQLite total_changes(), not just the returned error or current draft.
let sequence=0;
const operation=()=>({operationId:'source-correction-'+(++sequence)});
const fingerprint=f=>({tables:f.dump(),writes:f.store.db.prepare('SELECT total_changes() AS n').get().n});
const register=(f,r)=>f.engine.register(author,{...operation(),registration:r,expectedRegistryRevision:f.engine.state().sources[r.sourceId]?.registryRevision??null});
const ready=async f=>{await f.register();await f.stage(f.resolve(await f.review()));await f.approve();};
const publishInput=f=>{const s=f.engine.status(author);return {...operation(),expectedActiveRevision:s.activeRevisionId,expectedDraftToken:s.draftToken,expectedSourceBundleSha256:s.draftSourceBundleSha256,reason:'Synthetic correction verification'};};

test('RR-SRC-01 current registration drift invalidates eligibility and rejects approval/Publish without writes',async t=>{
 const f=fixture(t);await ready(f);const input=publishInput(f);
 await register(f,{...f.r,connectionSlot:'synthetic-new-slot'});const before=fingerprint(f);
 assert.equal(f.engine.publicationEligibility().canPublish,false);
 await assert.rejects(f.engine.publishStagedSource(author,input),e=>e.code==='SOURCE_CAS');
 await assert.rejects(f.engine.approveStagedSource(author,{...input,confirmation:'I approve this exact canonical content and source mapping'},{account:f.r.expectedAccount}),e=>e.code==='SOURCE_CAS');
 assert.deepEqual(fingerprint(f),before);
});

test('RR-SRC-01 registration changed during awaited publication remains the competing writer’s state',async t=>{
 const f=fixture(t);await ready(f);const input=publishInput(f);let afterWriter;
 f.wait(async()=>{await register(f,{...f.r,connectionSlot:'synthetic-during-slot'});afterWriter=fingerprint(f);});
 await assert.rejects(f.engine.publishStagedSource(author,input),e=>e.code==='SOURCE_CAS');
 assert.deepEqual(fingerprint(f),afterWriter);assert.equal(f.engine.state().sources[f.r.sourceId].registration.connectionSlot,'synthetic-during-slot');
});

test('registration A to B to A cannot revive an old review or approval; identical registration remains zero-write',async t=>{
 const f=fixture(t);await ready(f);const frozen=await f.review(),input=publishInput(f),oldRevision=f.engine.pins(f.r.sourceId).expectedRegistryRevision;
 const before=fingerprint(f);await register(f,f.r);assert.deepEqual(fingerprint(f),before);
 await register(f,{...f.r,connectionSlot:'synthetic-intermediate-slot'});await register(f,f.r);
 assert.notEqual(f.engine.pins(f.r.sourceId).expectedRegistryRevision,oldRevision);
 assert.equal(f.engine.publicationEligibility().canPublish,false);
 const reverted=fingerprint(f);await assert.rejects(f.stage(frozen),e=>e.code==='SOURCE_CAS');await assert.rejects(f.engine.publishStagedSource(author,input),e=>e.code==='SOURCE_CAS');assert.deepEqual(fingerprint(f),reverted);
 const reviewed=await f.review();assert.equal(reviewed.changedAuthorState,true);await f.stage(reviewed);assert.equal(f.engine.publicationEligibility().canPublish,false);await f.approve();assert.equal(f.engine.publicationEligibility().canPublish,true);
});

test('RR-SRC-02 callers cannot replace registration/mapping/identity pins on a frozen review',async t=>{
 for(const change of ['registration','mapping','identity']){
  const f=fixture(t);await f.register();await f.stage(f.resolve(await f.review()));const frozen=await f.review(),oldToken=f.store.currentDraft().draftToken;
  if(change==='registration')await register(f,{...f.r,connectionSlot:'synthetic-rebased-slot'});
  else {
   let dto=await f.review();
   if(change==='mapping'){const mapping=copy(f.mapping);mapping.columns[1].owner='studio';dto=f.engine.resolveReview(author,{reviewId:dto.reviewId,expectedReviewSha256:dto.reviewSha256,mapping});}
   else {const entry=f.engine.state().sources[f.r.sourceId].identity[0];dto=f.engine.resolveReview(author,{reviewId:dto.reviewId,expectedReviewSha256:dto.reviewSha256,identityMatches:[{rowIndex:1,action:'ignore',entryId:entry.entryId}]});}
   assert.equal(dto.canStage,true,JSON.stringify(dto.errors));await f.stage(dto);assert.equal(f.store.currentDraft().draftToken,oldToken);
  }
  const before=fingerprint(f);
  await assert.rejects(f.engine.stageSourceReview(author,{...operation(),reviewId:frozen.reviewId,reviewSha256:frozen.reviewSha256,...f.engine.pins(f.r.sourceId)}),e=>e.code==='SOURCE_CAS');
  assert.deepEqual(fingerprint(f),before,change);
 }
});

test('RR-SRC-02 the entire source set is frozen, including a second registration before or during Stage',async t=>{
 for(const during of [false,true]){
  const f=fixture(t);await f.register();const dto=f.resolve(await f.review());
  f.transport.describeSource=async r=>({spreadsheetId:r.spreadsheetId,sheetId:r.sheetId,account:r.expectedAccount,gridExtent:r.gridExtent});
  const second={...f.r,sourceId:'synthetic-second-registration',spreadsheetId:'synthetic_second_registered_file'};let afterWriter;
  const write=async()=>{await register(f,second);afterWriter=fingerprint(f);};
  if(during)f.wait(write);else await write();
  await assert.rejects(f.stage(dto),e=>e.code==='SOURCE_CAS');assert.deepEqual(fingerprint(f),afterWriter);
 }
});

test('QA-SRC-01 ignored and canonical entry IDs share uniqueness; invalid prospective state never reaches a draft write',async t=>{
 const f=fixture(t);await f.register();let dto=await f.review();dto=f.engine.resolveReview(author,{reviewId:dto.reviewId,expectedReviewSha256:dto.reviewSha256,identityMatches:[{rowIndex:1,action:'ignore'}]});await f.stage(dto);
 const valid=await f.review(),record=f.engine.review(author,valid.reviewId);record.next.identity.push(copy(record.next.identity[0]));record.next.identityRevision='identity-'+sha256(record.next.identity);record.dto.changedAuthorState=true;
 const before=fingerprint(f);await assert.rejects(f.stage(valid),e=>['SOURCE_IDENTITY_INVALID','SOURCE_BACKUP_INVALID'].includes(e.code));assert.deepEqual(fingerprint(f),before);
 f.engine.validatePersistent();
 const dest=new Store(':memory:');try{dest.restore(f.store.backup());}finally{dest.close();}
});

test('QA-SRC-02 identical local component IDs in distinct lessons are valid; duplicate use in one lesson remains blocked',async t=>{
 const f=fixture(t);await f.register();const content=f.store.snapshot();content.lessons=content.lessons.map(l=>projectLesson(content,l));
 const components=content.lessons.slice(0,2).map(l=>l.blocks.find(b=>b.type==='vocabulary').id);assert.equal(components[0],components[1]);
 const mapping=copy(f.mapping);mapping.membership={lessonColumnIndex:2,partColumnIndex:3,courseVersionId:'synthetic-corrected-course',sets:content.lessons.slice(0,2).map((l,i)=>({membershipSetId:'synthetic-set-'+i,lessonLabel:i?'1.3.5':'1.3',partLabel:'1.3.5',lessonId:l.id,componentIds:[components[i]],ordering:'source-row',additions:copy(l.wordIds),exclusions:[]}))};
 let dto=await f.engine.refreshPreview(author,{sourceId:f.r.sourceId,...f.engine.pins(f.r.sourceId),content,mapping});dto=f.resolve(dto);assert.equal(dto.canStage,true,JSON.stringify(dto.errors));await f.stage(dto);
 const invalid=copy(mapping);invalid.membership.sets.push({...copy(invalid.membership.sets[0]),membershipSetId:'synthetic-invalid-repeat',lessonLabel:'unrelated'});
 await assert.rejects(f.engine.refreshPreview(author,{sourceId:f.r.sourceId,...f.engine.pins(f.r.sourceId),content:f.store.currentDraft().content,mapping:invalid}),e=>e.code==='MEMBERSHIP_INVALID');
});

function dynamicTransport(f){
 f.transport.describeSource=async r=>({spreadsheetId:r.spreadsheetId,sheetId:r.sheetId,account:r.expectedAccount,gridExtent:r.gridExtent});
 f.transport.captureSource=async r=>{const c=f.capture();c.spreadsheetId=r.spreadsheetId;c.sheetId=r.sheetId;c.account=r.expectedAccount;c.capturePayloadSha256=sha256(capturePayload(c));return c;};
 f.transport.verifyFreshness=async c=>({checkedAt:c.observedAt,observedVersion:c.postVersion,capturePayloadSha256:c.capturePayloadSha256});
}
const secondReview=(f,r,mapping)=>f.engine.refreshPreview(author,{sourceId:r.sourceId,...f.engine.pins(r.sourceId),content:f.store.currentDraft()?.content||f.store.snapshot(),mapping});

test('RR-SRC-03 a second source cannot acquire an owned field by choosing remote; explicit release and fresh review preserves canonical ID',async t=>{
 const f=fixture(t);await ready(f);dynamicTransport(f);const first=f.engine.state().sources[f.r.sourceId].identity[0],second={...f.r,sourceId:'synthetic-source-two',spreadsheetId:'synthetic_second_source_fields'};await register(f,second);
 const mapping=copy(f.mapping);mapping.columns[0].target='sourceForm';let dto=await secondReview(f,second,mapping);
 dto=f.engine.resolveReview(author,{reviewId:dto.reviewId,expectedReviewSha256:dto.reviewSha256,identityMatches:[{rowIndex:1,action:'reuse',objectId:first.objectId}]});
 assert.equal(dto.canStage,false);assert(dto.errors.some(e=>e.code==='SOURCE_OWNERSHIP_CONFLICT'));
 const before=fingerprint(f);await assert.rejects(f.stage(dto),e=>e.code==='REVIEW_BLOCKED');assert.deepEqual(fingerprint(f),before);
 // Explicitly release the first source’s field/word-format ownership.
 let release=await f.review();const released=copy(f.mapping);released.columns.forEach(c=>c.owner='studio');release=f.engine.resolveReview(author,{reviewId:release.reviewId,expectedReviewSha256:release.reviewSha256,mapping:released});assert.equal(release.canStage,true);await f.stage(release);
 dto=await secondReview(f,second,mapping);dto=f.engine.resolveReview(author,{reviewId:dto.reviewId,expectedReviewSha256:dto.reviewSha256,identityMatches:[{rowIndex:1,action:'reuse',objectId:first.objectId}]});
 const pending=f.engine.review(author,dto.reviewId).mapped.identity[0];dto=f.engine.resolveReview(author,{reviewId:dto.reviewId,expectedReviewSha256:dto.reviewSha256,fieldResolutions:dto.conflicts.filter(c=>c.kind==='competing-edit'||c.kind==='studio-owned-proposal').map(c=>({entryId:pending.entryId,target:c.target,choice:'local'}))});assert.equal(dto.canStage,true,JSON.stringify(dto.errors));await f.stage(dto);assert.equal(f.engine.state().sources[second.sourceId].identity[0].objectId,first.objectId);f.engine.validatePersistent();
});

test('RR-SRC-03 global component ownership is lesson-scoped and rejects competing maps before mutation',async t=>{
 const f=fixture(t);await f.register();const source=f.engine.state().sources[f.r.sourceId],content=f.store.snapshot(),lesson=projectLesson(content,content.lessons[0]),component=lesson.blocks.find(b=>b.type==='vocabulary').id;
 const mapping=copy(f.mapping);mapping.membership={lessonColumnIndex:2,partColumnIndex:3,courseVersionId:'synthetic-course',sets:[{membershipSetId:'synthetic-owned-set',lessonLabel:'1.3',partLabel:'1.3.5',lessonId:lesson.id,componentIds:[component],ordering:'source-row',additions:copy(lesson.wordIds),exclusions:[]}]};
 let dto=await secondReview(f,f.r,mapping);dto=f.resolve(dto);await f.stage(dto);dynamicTransport(f);
 const second={...f.r,sourceId:'synthetic-source-two',spreadsheetId:'synthetic_second_components'};await register(f,second);const raw={version:1,columns:[{columnIndex:0,header:'Form',target:'sourceForm',owner:'source',allowBlank:true}],membership:copy(mapping.membership)};raw.membership.sets[0].membershipSetId='synthetic-other-set';
 const before=fingerprint(f),blocked=await secondReview(f,second,raw);assert.equal(blocked.canStage,false);await assert.rejects(f.stage(blocked),e=>e.code==='REVIEW_BLOCKED');assert.deepEqual(fingerprint(f),before);
});

test('RR-SRC-03 independent nonoverlapping typed fields may share a canonical word; formatting ownership is explicit',async t=>{
 const f=fixture(t);await ready(f);dynamicTransport(f);const first=f.engine.state().sources[f.r.sourceId].identity[0],second={...f.r,sourceId:'synthetic-flag-source',spreadsheetId:'synthetic_boolean_source_file'};await register(f,second);
 const oldCapture=f.transport.captureSource;f.transport.captureSource=async r=>{const c=await oldCapture(r);if(r.sourceId===second.sourceId)c.cells[1][1]={formattedValue:'TRUE',effectiveValue:{boolValue:true},userEnteredValue:{boolValue:true}};c.capturePayloadSha256=sha256(capturePayload(c));return c;};
 const mapping={version:1,columns:[{columnIndex:1,header:'English',target:'noCard',owner:'source',allowBlank:false}],membership:{sets:[]}};
 let dto=await secondReview(f,second,mapping);dto=f.engine.resolveReview(author,{reviewId:dto.reviewId,expectedReviewSha256:dto.reviewSha256,identityMatches:[{rowIndex:1,action:'reuse',objectId:first.objectId}]});assert.equal(dto.canStage,true,JSON.stringify(dto.errors));await f.stage(dto);assert.equal(f.store.currentDraft().content.words.find(w=>w.id===first.objectId).noCard,true);f.engine.validatePersistent();
});

test('RR-SRC-04 malformed current mapping is rejected against current draft/active content before any restore writes',async t=>{
 const f=fixture(t);await ready(f);const backup=f.store.backup();
 for(const badTarget of ['lesson','component','word']){
  const b=copy(backup),s=b.sourceAuthoring.sources[f.r.sourceId];
  if(badTarget==='word'){s.identity[0].objectId='synthetic-nonexistent-word';s.identityRevision='identity-'+sha256(s.identity);}
  else {s.mapping.membership={lessonColumnIndex:2,partColumnIndex:3,courseVersionId:'synthetic-course',sets:[{membershipSetId:'synthetic-invalid-map',lessonLabel:'1.3',partLabel:'1.3.5',lessonId:badTarget==='lesson'?'synthetic-missing-lesson':b.content.lessons[0].id,componentIds:['synthetic-missing-component'],ordering:'source-row',additions:[],exclusions:[]}]};s.mappingRevision='mapping-'+sha256(s.mapping);}
  const dest=new Store(':memory:');try{const wrapped={store:dest,dump:()=>JSON.stringify(dest.db.prepare('SELECT * FROM revisions').all())},before=fingerprint(wrapped);assert.throws(()=>dest.restore(b),e=>e.code==='SOURCE_BACKUP_INVALID');assert.deepEqual(fingerprint(wrapped),before);}finally{dest.close();}
 }
});

test('RR-SRC-04 legitimate newer registration remains recoverable without inventing a new confirmed baseline',async t=>{
 const f=fixture(t);await ready(f);await register(f,{...f.r,connectionSlot:'synthetic-new-unreviewed-slot'});f.engine.validatePersistent();
 const b=f.store.backup(),dest=new Store(':memory:');try{dest.restore(b);assert.equal(dest.get('source-state').sources[f.r.sourceId].registration.connectionSlot,'synthetic-new-unreviewed-slot');assert.equal(dest.get('source-state').draftBinding.bundleSha256,b.sourceAuthoring.draftBinding.bundleSha256);}finally{dest.close();}
});

test('a reviewed registration header change retains the old mapping anchor until a new source review',async t=>{
 const f=fixture(t);await ready(f);const prior=f.engine.state().sources[f.r.sourceId].baselineSha256,headers=[...f.r.headers];headers[1]='Synthetic revised English';
 await register(f,{...f.r,headers,headerSha256:sha256(headers)});f.engine.validatePersistent();
 assert.equal(f.engine.state().sources[f.r.sourceId].baselineSha256,prior);assert.equal(f.engine.publicationEligibility().canPublish,false);
 const dest=new Store(':memory:');try{dest.restore(f.store.backup());const source=dest.get('source-state').sources[f.r.sourceId];assert.equal(source.registration.headers[1],headers[1]);assert.equal(source.mapping.columns[1].header,'English');assert.equal(source.baselineSha256,prior);}finally{dest.close();}
});

test('RR-SRC-05 raw header cells must equal declarations even when every public hash is recomputed',async t=>{
 const f=fixture(t),c=f.capture();c.cells[0][1].formattedValue='Synthetic changed header';c.capturePayloadSha256=sha256(capturePayload(c));assert.throws(()=>validateCapture(c,f.r),e=>e.code==='SCHEMA_CHANGED');
 await ready(f);const b=f.store.backup(),state=b.sourceAuthoring,oldHash=Object.keys(state.captures)[0],capture=state.captures[oldHash];capture.cells[0][1].formattedValue='Synthetic changed header';capture.capturePayloadSha256=sha256(capturePayload(capture));const hash=capture.capturePayloadSha256;state.captures[hash]=capture;delete state.captures[oldHash];
 const repair=s=>{if(s.baseline?.captureSha256===oldHash){s.baseline.captureSha256=hash;s.baselineSha256=sha256(s.baseline);}if(s.identityCaptureSha256===oldHash)s.identityCaptureSha256=hash;};Object.values(state.sources).forEach(repair);const hashes={};for(const [h,bundle]of Object.entries({...state.bundles})){Object.values(bundle.sources).forEach(repair);hashes[h]=sha256(bundle);state.bundles[hashes[h]]=bundle;delete state.bundles[h];}state.authorBundle=hashes[state.authorBundle];state.draftBinding.bundleSha256=hashes[state.draftBinding.bundleSha256];
 const dest=new Store(':memory:');try{const before=dest.db.prepare('SELECT total_changes() AS n').get().n;assert.throws(()=>dest.restore(b),e=>e.code==='SOURCE_BACKUP_INVALID');assert.equal(dest.db.prepare('SELECT total_changes() AS n').get().n,before);}finally{dest.close();}
});
