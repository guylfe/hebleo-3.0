import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import '../public/review-outbox.js';
import {contextHash} from '../src/immutable-context.js';
import {Store} from '../src/store.js';
import {createServer} from '../src/server.js';
import {createReviewSave} from '../public/review-save.js';
const ownerId='learner-demo',siteId='hebleo-local-demo';
const intent=(cardId='w-ani',siblingGroupId=cardId)=>({protocolVersion:1,siteId,ownerId,requestId:randomUUID(),cardId,siblingGroupId,expectedVersion:'v1',rating:3,clockTicketId:'clock',elapsedMs:0});
const receipt=i=>({protocolVersion:1,acceptedAnswerAt:Date.now(),committedAt:Date.now(),requestId:i.requestId,cardId:i.cardId,expectedVersion:i.expectedVersion,resultingVersion:'v2',intentHash:contextHash(i),outcome:'committed',authoritativeSchedule:{due:new Date(Date.now()+600000).toISOString()},siblingsUntil:Date.now()+86400000});
const until=async fn=>{const end=Date.now()+2000;while(!fn()){if(Date.now()>end)throw Error('Condition timeout');await new Promise(r=>setTimeout(r,5));}};
function queue(t,options={}){const q=globalThis.HebleoReviewOutbox.create({siteId,ownerId,now:()=>Date.now(),indexedDB:new IDBFactory(),send:async i=>receipt(i),lookup:async()=>null,pollMs:10,timeoutMs:100,...options});t.after(()=>q.dispose());return q;}
function payload(s,cardId='w-ani'){const a=s.reviewClock(ownerId).anchors[cardId];return {protocolVersion:1,siteId,ownerId,requestId:randomUUID(),cardId,siblingGroupId:a.siblingGroupId,expectedVersion:a.expectedVersion,rating:3,clockTicketId:a.clockTicketId,elapsedMs:0};}

test('capture completes independently of slow backend; ordered head cannot be overtaken',async t=>{
 let release;const calls=[];const q=queue(t,{send:async i=>{calls.push(i.cardId);if(calls.length===1)await new Promise(r=>release=r);return receipt(i);},timeoutMs:1500});
 const start=performance.now();await q.capture(intent());const captureMs=performance.now()-start;
 await q.capture(intent('w-hu'));await until(()=>release);assert.deepEqual(calls,['w-ani']);assert(q.excluded('w-ani','w-ani'));assert.equal(q.snapshot().pending.length,2);
 release();await until(()=>!q.snapshot().pending.length);assert.deepEqual(calls,['w-ani','w-hu']);assert(captureMs<1000);t.diagnostic('durable capture '+captureMs.toFixed(1)+'ms; backend deliberately held until assertions');
});
test('unavailable storage never accepts; dispose preserves reload intents; account scope parks replay',async t=>{
 const unavailable=queue(t,{indexedDB:null});await assert.rejects(unavailable.capture(intent()),/unavailable/);
 const indexedDB=new IDBFactory();let active=false;const q=queue(t,{indexedDB,isActive:()=>active});const i=intent();await q.capture(i).catch(e=>assert.match(e.message,/account/));active=true;await q.capture(i);q.dispose();active=false;
 const other=queue(t,{indexedDB,ownerId:'learner-core',send:()=>assert.fail('wrong account replay')});await other.ready;await new Promise(r=>setTimeout(r,25));assert.equal(other.snapshot().pending.length,0);
 const reload=queue(t,{indexedDB});await reload.ready;await until(()=>reload.snapshot().overlays.length===1);assert.equal(reload.snapshot().overlays[0].requestId,i.requestId);
});
test('simultaneous tabs atomically exclude opposite siblings; receipt hash mismatch retains head',async t=>{
 const indexedDB=new IDBFactory(),send=async()=>new Promise(()=>{});const a=queue(t,{indexedDB,send}),b=queue(t,{indexedDB,send});
 const result=await Promise.allSettled([a.capture(intent('a','note')),b.capture(intent('b','note'))]);assert.equal(result.filter(x=>x.status==='fulfilled').length,1);
 const bad=queue(t,{send:async i=>({...receipt(i),intentHash:'wrong'})});await bad.capture(intent());await until(()=>bad.snapshot().error);assert.equal(bad.snapshot().pending.length,1);assert.equal(bad.snapshot().overlays.length,0);
});
test('lost committed response reconciles by immutable receipt exactly once after reload',async t=>{
 const indexedDB=new IDBFactory(),receipts=new Map();let commits=0;
 const q=queue(t,{indexedDB,send:async i=>{commits++;receipts.set(i.requestId,receipt(i));throw Error('response lost');}});const i=intent();await q.capture(i);await until(()=>q.snapshot().error);q.dispose();
 const reload=queue(t,{indexedDB,lookup:async i=>receipts.get(i.requestId),send:()=>assert.fail('must reconcile commit')});await until(()=>reload.snapshot().overlays.length===1);assert.equal(commits,1);assert(reload.excluded(i.cardId,i.siblingGroupId));
});
test('trusted clock, immutable replay, ABA Undo, expired receipt recovery and backup/reopen',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'hebleo-outbox-'));let s=new Store(join(dir,'fixture.db'));t.after(()=>{s?.close();rmSync(dir,{recursive:true,force:true});});s.enroll(ownerId,'w-ani');const before=s.snapshot();const i=payload(s),r=s.backgroundReview(ownerId,i);
 assert.equal(r.acceptedAnswerAt,s.learner(ownerId).reviewClockTickets[i.clockTicketId].issuedAt);assert.equal(r.outcome,'committed');assert.notEqual(r.expectedVersion,r.resultingVersion);assert.equal(s.backgroundReview(ownerId,i).duplicate,true);
 assert.throws(()=>s.backgroundReview(ownerId,{...i,rating:4}),/Conflicting/);s.undoReview(ownerId,{requestId:i.requestId});assert.equal(s.backgroundReview(ownerId,i).outcome,'undone');assert.equal(s.backgroundReview(ownerId,{...i,requestId:randomUUID()}).reasonCode,'CARD_CHANGED');
 const fresh=payload(s),state=s.learner(ownerId);state.reviewClockTickets[fresh.clockTicketId].issuedAt-=10000;state.reviewClockTickets[fresh.clockTicketId].expiresAt=state.reviewClockTickets[fresh.clockTicketId].issuedAt+1;s.saveLearner(ownerId,state);assert.equal(s.backgroundReview(ownerId,fresh).reasonCode,'CLOCK_EXPIRED');
 const backup=s.backup();s.restore(backup);assert.deepEqual(s.learner(ownerId).reviewGenerations,backup.learners.find(x=>x.id===ownerId).state.reviewGenerations);assert.deepEqual(s.snapshot(),before);
 s.close();s=new Store(join(dir,'fixture.db'));assert.equal(s.backgroundReview(ownerId,i).outcome,'undone');assert.deepEqual(s.learner(ownerId).reviewClockTickets,backup.learners.find(x=>x.id===ownerId).state.reviewClockTickets);
});
test('HTTP contract enforces scope, suspended/version changes, future/regressed clocks',async t=>{
 const s=new Store();t.after(()=>s.close());s.enroll(ownerId,'w-ani');const server=createServer(s);await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));const origin='http://127.0.0.1:'+server.address().port;
 const post=async(path,body)=>{const r=await fetch(origin+'/api/'+path,{method:'POST',headers:{'content-type':'application/json','x-demo-user':ownerId},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};};
 const anchors=(await post('review/clock',{})).body.anchors;assert(anchors['w-ani']);const i=payload(s);
 assert.equal((await post('review/background',{...i,ownerId:'learner-core'})).status,403);
 assert.equal((await post('review/background',{...i,elapsedMs:180000})).body.reasonCode,'ANSWER_TIME_INVALID');
 const state=s.learner(ownerId);state.reviewAnswerTimes={'w-ani':Date.now()+5000};s.saveLearner(ownerId,state);assert.equal((await post('review/background',{...i,requestId:randomUUID()})).status,409);delete state.reviewAnswerTimes;state.cards['w-ani'].suspended=true;s.saveLearner(ownerId,state);assert.equal((await post('review/background',{...i,requestId:randomUUID()})).body.reasonCode,'CARD_CHANGED');
});

test('lease takeover during unabortable HTTP fences stale acknowledgment and retains exact head',async t=>{
 const indexedDB=new IDBFactory(),receipts=new Map();let late,commits=0;
 const a=queue(t,{indexedDB,send:async i=>{if(!receipts.has(i.requestId)){commits++;receipts.set(i.requestId,receipt(i));}await new Promise(r=>late=r);return receipts.get(i.requestId);}});
 const i=intent();await a.capture(i);await until(()=>late);a.dispose();
 const b=queue(t,{indexedDB,lookup:async i=>receipts.get(i.requestId),send:()=>assert.fail('already committed')});await until(()=>b.snapshot().overlays.length===1);late();await new Promise(r=>setTimeout(r,20));assert.equal(commits,1);assert.equal(b.snapshot().pending.length,0);assert.equal(b.snapshot().overlays[0].requestId,i.requestId);
});
test('authoritative learning return keeps siblings hidden and requires resulting version; backlog is bounded',async t=>{
 const i=intent('a','note'),q=queue(t,{maxPending:2});await q.capture(i);await until(()=>q.snapshot().overlays.length===1);
 assert(q.excluded('b','note'));assert(!q.excluded('a','note',Date.now()+700000));
 await assert.rejects(q.capture({...intent('a','note'),expectedVersion:'stale'}),/already rated/);
 const held=queue(t,{maxPending:2,send:()=>new Promise(()=>{})});await held.capture(intent('a'));await held.capture(intent('b'));await assert.rejects(held.capture(intent('c')),/pending/);assert(held.blocked);
});

test('incomplete matching-hash receipts never acknowledge; rejected heads persist and resolve only by identity',async t=>{
 const i=intent(),bad=queue(t,{send:async()=>({requestId:i.requestId,cardId:i.cardId,expectedVersion:i.expectedVersion,intentHash:contextHash(i),outcome:'committed'})});await bad.capture(i);await until(()=>bad.snapshot().error);assert.equal(bad.snapshot().pending.length,1);
 const indexedDB=new IDBFactory();let sends=0;const rejected=i=>({protocolVersion:1,requestId:i.requestId,cardId:i.cardId,expectedVersion:i.expectedVersion,intentHash:contextHash(i),outcome:'rejected',reasonCode:'CARD_CHANGED',rejectedAt:Date.now()});
 const q=queue(t,{indexedDB,send:async i=>{sends++;return rejected(i);}});const a=intent('a'),b=intent('b');await q.capture(a);await q.capture(b);await until(()=>q.snapshot().pending[0]?.phase==='needs-resolution');assert(q.blocked);q.dispose();
 const reload=queue(t,{indexedDB,send:async i=>{sends++;return receipt(i);}});await until(()=>reload.snapshot().pending[0]?.phase==='needs-resolution');await reload.retry();assert.equal(sends,1);await assert.rejects(reload.resolveRejected(a.requestId,'bad'),/changed/);await reload.resolveRejected(a.requestId,contextHash(a));await until(()=>!reload.snapshot().pending.length);assert.equal(sends,2);assert(!reload.excluded('a','a'));assert(reload.excluded('b','b'));
});
test('server rejection tombstone survives repair, Undo and backup without changing review state',t=>{
 const s=new Store();t.after(()=>s.close());s.enroll(ownerId,'w-ani');const i=payload(s),state=s.learner(ownerId);state.cards['w-ani'].suspended=true;s.saveLearner(ownerId,state);const before=s.learner(ownerId),r=s.backgroundReview(ownerId,i);assert.equal(r.outcome,'rejected');assert(!Object.hasOwn(r,'acceptedAnswerAt'));assert.deepEqual(s.learner(ownerId),before);
 state.cards['w-ani'].suspended=false;s.saveLearner(ownerId,state);assert.equal(s.backgroundReview(ownerId,i).outcome,'rejected');assert.equal(s.learner(ownerId).cards['w-ani'].repetitions,0);s.restore(s.backup());assert.equal(s.backgroundReview(ownerId,i).outcome,'rejected');assert.throws(()=>s.backgroundReview(ownerId,{...i,rating:4}),/Conflicting/);
});
test('selective reusable clock anchors do not multiply with normal refreshes',t=>{
 const s=new Store();t.after(()=>s.close());const state=s.learner(ownerId);for(let n=0;n<2050;n++)state.cards['synthetic-'+n]={due:new Date(0).toISOString(),repetitions:0,intervalDays:0,suspended:false};s.saveLearner(ownerId,state);
 const cardIds=Object.keys(state.cards).slice(0,100),first=s.reviewClock(ownerId,{cardIds});for(let n=0;n<10;n++)assert.equal(s.reviewClock(ownerId,{cardIds}).anchors[cardIds[0]].clockTicketId,first.anchors[cardIds[0]].clockTicketId);assert.equal(Object.keys(s.learner(ownerId).reviewClockTickets).length,100);
});
test('resume refresh blocks old anchors, ignores superseded responses and uses trusted elapsed clock',async t=>{
 let mono=0,server=100000,hold=false,releases=[],sent;
 const wrapper=createReviewSave({background:true,ownerId,isActive:()=>true,indexedDB:new IDBFactory(),monotonicNow:()=>mono,getCardIds:()=>['a'],pollMs:10,
  send:async(path,body)=>{if(path==='review/clock'){if(hold)await new Promise(r=>releases.push(r));return {serverNow:server,anchors:{a:{issuedAt:100000,clockTicketId:'ticket',expectedVersion:'v1',siblingGroupId:'a'}}};}if(path.startsWith('review/status'))return {receipt:null};sent=body;return receipt(body);}});t.after(()=>wrapper.dispose());
 await wrapper.clock();hold=true;const old=wrapper.clock();await assert.rejects(wrapper.commit({cardId:'a',rating:1,requestId:randomUUID()}),/refreshing/);assert(wrapper.blocked);const latest=wrapper.clock();server+=7200000;mono+=20;releases[1]();await latest;releases[0]();await old;await wrapper.commit({cardId:'a',rating:1,requestId:randomUUID()});await until(()=>sent);assert.equal(sent.elapsedMs,7200000);assert.equal(wrapper.now(),server);
});
test('durable Undo pause fences captures in other tabs while sender still drains',async t=>{
 const indexedDB=new IDBFactory(),a=queue(t,{indexedDB}),b=queue(t,{indexedDB});await a.ready;const resume=await a.pauseCapture();await assert.rejects(b.capture(intent()),/paused/);await resume();await b.capture(intent());await until(()=>b.snapshot().overlays.length===1);
});

test('expired Undo pause cannot renew or retake ownership from a new client',async t=>{
 const indexedDB=new IDBFactory(),a=queue(t,{indexedDB,pauseLeaseMs:20,pauseRenewMs:40}),b=queue(t,{indexedDB});
 await a.ready;const old=await a.pauseCapture();await old.assertOwned();await until(()=>old.lost);assert(old.signal.aborted);await assert.rejects(old.assertOwned(),/expired or was lost/);
 const replacement=await b.pauseCapture();await old();await replacement.assertOwned();assert(!replacement.lost);await replacement();await b.capture(intent());
});
test('Undo pause renewal storage failure is terminal for that handle',async t=>{
 const factory=new IDBFactory();let fail=false;
 const indexedDB={open(...args){const r=factory.open(...args);r.addEventListener('success',()=>{const db=r.result,transaction=db.transaction.bind(db);db.transaction=(...args)=>{if(fail)throw Error('Synthetic pause renewal storage failure');return transaction(...args);};});return r;}};
 const q=queue(t,{indexedDB,pauseRenewMs:20});await q.ready;const pause=await q.pauseCapture();fail=true;await until(()=>pause.lost);assert(pause.signal.aborted);fail=false;await assert.rejects(pause.assertOwned(),/storage failure/);await pause();
});
