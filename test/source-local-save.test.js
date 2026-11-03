import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,author} from '../test-support/source-fixture.js';
import {copy,sha256} from '../src/source-utils.js';
import {createServer} from '../src/server.js';

// Synthetic source/header/history fixtures; actual installed loopback HTTP.
let sequence=0;
const op=()=>({operationId:'synthetic-header-save-'+(++sequence)});
const fingerprint=f=>({tables:f.dump(),writes:f.store.db.prepare('SELECT total_changes() AS n').get().n});

async function pending(t,restored){
 const original=fixture(t);await original.register();await original.stage(original.resolve(await original.review()));
 const previous=copy(original.engine.state().sources[original.r.sourceId]),headers=[...original.r.headers];headers[1]='Synthetic pending English header';
 await original.engine.register(author,{...op(),expectedRegistryRevision:previous.registryRevision,registration:{...original.r,headers,headerSha256:sha256(headers)}});
 const f=restored?fixture(t):original;if(restored)f.store.restore(original.store.backup());f.offline(true);return {f,previous,headers};
}

for(const minimal of [false,true])for(const restored of [false,true])test('RR-SRC-06 unrelated offline HTTP Save preserves pending source/header state '+(restored?'after restore':'before restore')+(minimal?' minimal receipt':' default receipt'),async t=>{
 const {f,headers}=await pending(t,restored),store=f.store;
 const exercise=store.snapshot().exercises.find(e=>e.type==='typing'),word=store.snapshot().words.find(w=>w.id===exercise.wordId);
 store.attempt('learner-demo',{requestId:'synthetic-preserved-grade',exerciseId:exercise.id,lessonId:exercise.lessonId,revisionId:store.get('active'),answer:word.unpointed});
 const server=createServer(store,{sourceAuth:f.auth,sourceTransport:f.transport});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 let acquisitions=0;f.transport.captureSource=async()=>{acquisitions++;throw Error('Local Save must not acquire source');};
 const origin='http://127.0.0.1:'+server.address().port,post=async(path,body)=>{const response=await fetch(origin+'/api/'+path,{method:'POST',headers:{'content-type':'application/json','x-demo-user':author,...(minimal&&path==='studio/draft'?{Prefer:'return=minimal'}:{})},body:JSON.stringify(body)});return {status:response.status,body:await response.json()};};
 const draft=store.currentDraft(),content=copy(draft.content),sourceState=copy(server.sourceAuthoring.state()),active=store.get('active'),learners=store.db.prepare('SELECT * FROM learners ORDER BY id').all();
 content.lessons[0].title='Synthetic offline title preserved with pending schema';content.lessons[0].explanation+=' Synthetic sibling paragraph';content.exercises[0].prompt+=' Synthetic sibling prompt';content.words[0].notes='Synthetic unmapped sibling note';
 const input={baseRevisionId:active,expectedDraftToken:draft.draftToken,content},impact=await post('studio/impact',input);assert.equal(impact.status,200);
 const saved=await post('studio/draft',{...input,reviewedDraftToken:impact.body.candidateDraftToken});assert.equal(saved.status,200,JSON.stringify(saved.body));
 assert.deepEqual(store.currentDraft().content,content);assert.equal(store.get('active'),active);assert.deepEqual(store.db.prepare('SELECT * FROM learners ORDER BY id').all(),learners);assert.deepEqual(server.sourceAuthoring.state().sources,sourceState.sources);assert.deepEqual(server.sourceAuthoring.state().captures,sourceState.captures);
 const source=server.sourceAuthoring.state().sources[f.r.sourceId];assert.equal(source.registration.headers[1],headers[1]);assert.equal(source.mapping.columns[1].header,'English');assert.equal(acquisitions,0);server.sourceAuthoring.validatePersistent();
 assert.equal(server.sourceAuthoring.publicationEligibility().canPublish,false);assert.equal(server.sourceAuthoring.state().bundles[server.sourceAuthoring.state().draftBinding.bundleSha256].approval,null);
 const before=fingerprint(f),stale=await post('studio/draft',{...input,reviewedDraftToken:impact.body.candidateDraftToken});assert.equal(stale.status,409);assert.deepEqual(fingerprint(f),before);
 // Even a synthetic trusted approval cannot publish while source is unavailable.
 const engine=server.sourceAuthoring,status=engine.status(author),pub={...op(),expectedActiveRevision:active,expectedDraftToken:status.draftToken,expectedSourceBundleSha256:status.draftSourceBundleSha256,reason:'Synthetic blocked offline publication'};
 await engine.approveStagedSource(author,{...pub,confirmation:'I approve this exact canonical content and source mapping'},{account:f.r.expectedAccount});const approved=engine.status(author),beforePublish=fingerprint(f);
 await assert.rejects(engine.publishStagedSource(author,{...pub,expectedSourceBundleSha256:approved.draftSourceBundleSha256}),e=>e.code==='SOURCE_UNAVAILABLE');assert.deepEqual(fingerprint(f),beforePublish);
});

test('anchored local Save still rejects dangling source identities/memberships without altering the draft',async t=>{
 const {f}=await pending(t,false),draft=f.store.currentDraft(),entry=f.engine.state().sources[f.r.sourceId].identity[0];
 const content=copy(draft.content);content.words=content.words.filter(w=>w.id!==entry.objectId);const before=fingerprint(f);
 assert.throws(()=>f.store.stage({baseRevisionId:draft.baseRevisionId,expectedDraftToken:draft.draftToken,content}),e=>e.code==='SOURCE_REFERENCES');assert.deepEqual(fingerprint(f),before);
});
