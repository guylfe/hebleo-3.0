import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Store} from '../src/store.js';
import {createServer} from '../src/server.js';
import {contextHash} from '../src/immutable-context.js';
const ownerId='learner-demo';
function capture(s,cardId='w-ani'){
 const a=s.reviewClock(ownerId,{cardIds:[cardId]}).anchors[cardId];assert(a,'card must be due');
 return {protocolVersion:1,siteId:'hebleo-local-demo',ownerId,requestId:randomUUID(),cardId,siblingGroupId:a.siblingGroupId,expectedVersion:a.expectedVersion,rating:3,clockTicketId:a.clockTicketId,elapsedMs:0};
}
function fixture(t){const s=new Store();t.after(()=>s.close());s.enroll(ownerId,'w-ani');return s;}
function withoutTickets(learners){return learners.map(row=>{const result=structuredClone(row);delete result.state.reviewClockTickets;return result;});}
function dump(s){return JSON.stringify(['kv','learners','revisions','events'].map(table=>s.db.prepare('SELECT * FROM '+table+' ORDER BY 1').all()));}

test('pre-commit restore invalidates the old immutable intent and preserves ordinary backup data',t=>{
 const s=fixture(t),content=s.snapshot();content.lessons[0].title+=' · SYNTHETIC epoch preservation fixture';s.stage({baseRevisionId:s.get('active'),expectedDraftToken:null,content});s.updateLearner(ownerId,{reviewLimit:5});
 const old=capture(s),backup=s.backup();assert.equal(s.backgroundReview(ownerId,old).outcome,'committed');s.restore(backup);
 const restored=s.backup();for(const key of ['content','draft','revisionSnapshots','reviewReceipts','sharedCards','mediaRecovery','authorReview'])assert.deepEqual(restored[key],backup[key],key+' retained');assert.deepEqual(withoutTickets(restored.learners),withoutTickets(backup.learners));assert.equal(s.learner(ownerId).reviewClockTickets,undefined);
 assert.notEqual(s.reviewVersion(s.learner(ownerId),old.cardId),old.expectedVersion);assert.equal(s.backgroundReview(ownerId,old).outcome,'rejected');assert.equal(s.learner(ownerId).cards[old.cardId].repetitions,0);
 const fresh=capture(s);assert.notEqual(fresh.clockTicketId,old.clockTicketId);assert.notEqual(fresh.expectedVersion,old.expectedVersion);assert.equal(s.backgroundReview(ownerId,fresh).outcome,'committed');assert.equal(s.backgroundReview(ownerId,old).outcome,'rejected');assert.equal(s.learner(ownerId).cards[old.cardId].repetitions,1);
});

test('same-timestamp deliberate resets rotate epochs even when card state repeats; same-build restart does not',t=>{
 const s=fixture(t),now=Date.now()+10000;t.mock.method(Date,'now',()=>now);
 const sameCard=()=>{const state=s.learner(ownerId);state.cards['w-ani']={due:new Date(now).toISOString(),repetitions:0,intervalDays:0,suspended:false};s.saveLearner(ownerId,state);};sameCard();const originalCard=structuredClone(s.learner(ownerId).cards['w-ani']),old=capture(s);
 assert.equal(s.resetDemoProgressForBuild('synthetic-epoch-build-a'),true);const epochA=s.get('reviewDataEpoch');sameCard();assert.deepEqual(s.learner(ownerId).cards['w-ani'],originalCard);assert.equal(s.backgroundReview(ownerId,old).outcome,'rejected');assert.equal(s.learner(ownerId).cards['w-ani'].repetitions,0);
 const pending=capture(s);assert.equal(s.resetDemoProgressForBuild('synthetic-epoch-build-a'),false);assert.equal(s.get('reviewDataEpoch'),epochA);assert(s.learner(ownerId).reviewClockTickets[pending.clockTicketId]);
 assert.equal(s.resetDemoProgressForBuild('synthetic-epoch-build-b'),true);assert.notEqual(s.get('reviewDataEpoch'),epochA);sameCard();assert.equal(s.backgroundReview(ownerId,pending).outcome,'rejected');assert.equal(s.learner(ownerId).cards['w-ani'].repetitions,0);assert.equal(s.backgroundReview(ownerId,capture(s)).outcome,'committed');
});

test('ordinary reopen preserves legacy and explicit-epoch pending recovery without rotating versions',t=>{
 const dir=mkdtempSync(join(tmpdir(),'hebleo-review-epoch-'));let s=new Store(join(dir,'fixture.db'));t.after(()=>{s.close();rmSync(dir,{recursive:true,force:true});});
 s.enroll(ownerId,'w-ani');let pending=capture(s),before=s.learner(ownerId);assert.equal(s.get('reviewDataEpoch'),null);assert.equal(pending.expectedVersion,contextHash({generation:0,card:before.cards['w-ani']}),'legacy queued versions remain byte-compatible');s.close();s=new Store(join(dir,'fixture.db'));assert.deepEqual(s.learner(ownerId),before);assert.equal(s.backgroundReview(ownerId,pending).outcome,'committed');
 s.restore(s.backup());s.enroll(ownerId,'w-hu');pending=capture(s,'w-hu');before=s.learner(ownerId);const epoch=s.get('reviewDataEpoch');s.close();s=new Store(join(dir,'fixture.db'));assert.equal(s.get('reviewDataEpoch'),epoch);assert.deepEqual(s.learner(ownerId),before);assert.equal(s.reviewVersion(before,'w-hu'),pending.expectedVersion);assert.equal(s.backgroundReview(ownerId,pending).outcome,'committed');assert.equal(s.backgroundReview(ownerId,pending).duplicate,true);
});

test('retained committed, undone and rejected receipts reconcile before cleared tickets and epoch CAS',t=>{
 const s=fixture(t);s.enroll(ownerId,'w-hu');s.enroll(ownerId,'w-hi');const committed=capture(s),undone=capture(s,'w-hu'),rejected=capture(s,'w-hi');
 s.backgroundReview(ownerId,committed);s.backgroundReview(ownerId,undone);s.undoReview(ownerId,{requestId:undone.requestId});const state=s.learner(ownerId);state.cards['w-hi'].suspended=true;s.saveLearner(ownerId,state);s.backgroundReview(ownerId,rejected);const backup=s.backup();
 s.restore(backup);const restoredState=s.learner(ownerId),epoch=s.get('reviewDataEpoch');assert.equal(restoredState.reviewClockTickets,undefined);
 for(const [intent,outcome]of [[committed,'committed'],[undone,'undone'],[rejected,'rejected']]){const result=s.backgroundReview(ownerId,intent);assert.equal(result.outcome,outcome);assert.equal(result.duplicate,true);}
 assert.deepEqual(s.learner(ownerId),restoredState);assert.equal(s.get('reviewDataEpoch'),epoch);assert.deepEqual(s.backup().reviewReceipts,backup.reviewReceipts);
});

test('backup epoch is validated provenance and never selects the active namespace',t=>{
 const s=fixture(t),legacy=s.backup();assert(!Object.hasOwn(legacy,'reviewDataEpoch'));s.restore(legacy);const first=s.get('reviewDataEpoch'),backup=s.backup();assert.equal(backup.reviewDataEpoch,first);
 for(const invalid of [null,42,{},'',first+'x']){const before=dump(s);assert.throws(()=>s.restore({...backup,reviewDataEpoch:invalid}),/Invalid review data epoch/);assert.equal(dump(s),before);}
 const clientChosen='11111111-1111-4111-8111-111111111111';s.restore({...backup,reviewDataEpoch:clientChosen});assert.notEqual(s.get('reviewDataEpoch'),first);assert.notEqual(s.get('reviewDataEpoch'),clientChosen);const second=s.get('reviewDataEpoch');s.restore(backup);assert.notEqual(s.get('reviewDataEpoch'),second);assert.notEqual(s.get('reviewDataEpoch'),backup.reviewDataEpoch);
});

test('HTTP old intent after pre-commit restore becomes a retained rejection without scheduling',async t=>{
 const s=fixture(t),old=capture(s),backup=s.backup();s.backgroundReview(ownerId,old);s.restore(backup);const server=createServer(s);await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));const origin='http://127.0.0.1:'+server.address().port,headers={'x-demo-user':ownerId,'content-type':'application/json'};
 const response=await fetch(origin+'/api/review/background',{method:'POST',headers,body:JSON.stringify(old)});assert.equal(response.status,200);assert.equal((await response.json()).outcome,'rejected');const status=await (await fetch(origin+'/api/review/status?requestId='+old.requestId,{headers})).json();assert.equal(status.receipt.outcome,'rejected');assert.equal(s.learner(ownerId).cards['w-ani'].repetitions,0);
});

test('epoch rotation and invalidation roll back with a failed restore transaction',t=>{
 const s=fixture(t),intent=capture(s);s.backgroundReview(ownerId,intent);const backup=s.backup();s.restore(backup);const before=dump(s),set=s.set.bind(s);let rotated=false;
 const mock=t.mock.method(s,'set',(key,value)=>{if(key==='reviewDataEpoch')rotated=true;if(key.startsWith('review-'))throw Error('SYNTHETIC restore receipt write failure');return set(key,value);});
 assert.throws(()=>s.restore(backup),/receipt write failure/);mock.mock.restore();assert(rotated,'failure occurs after epoch rotation inside transaction');assert.equal(dump(s),before,'failed restore retains exact namespace, tickets, content and rows');
});

test('legacy two-profile restore invalidates old author tickets without overwriting author records',t=>{
 const s=fixture(t),author='author-demo';s.enroll(author,'w-ani');const a=s.reviewClock(author,{cardIds:['w-ani']}).anchors['w-ani'],intent={protocolVersion:1,siteId:'hebleo-local-demo',ownerId:author,requestId:randomUUID(),cardId:'w-ani',siblingGroupId:a.siblingGroupId,expectedVersion:a.expectedVersion,rating:3,clockTicketId:a.clockTicketId,elapsedMs:0},before=s.learner(author),backup=s.backup();backup.learners=backup.learners.filter(row=>row.id!==author);
 s.restore(backup);assert.deepEqual(s.learner(author),before);assert.equal(s.backgroundReview(author,intent).outcome,'rejected');assert.equal(s.learner(author).cards['w-ani'].repetitions,0);
});
