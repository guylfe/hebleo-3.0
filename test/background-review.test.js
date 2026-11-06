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
const ownerId='learner-demo',siteId='hebleo-local-demo';
const intent=(cardId='w-ani',siblingGroupId=cardId)=>({protocolVersion:1,siteId,ownerId,requestId:randomUUID(),cardId,siblingGroupId,expectedVersion:'v1',rating:3,clockTicketId:'clock',elapsedMs:0});
const receipt=i=>({requestId:i.requestId,cardId:i.cardId,expectedVersion:i.expectedVersion,resultingVersion:'v2',intentHash:contextHash(i),outcome:'committed',authoritativeSchedule:{due:new Date(Date.now()+600000).toISOString()},siblingsUntil:Date.now()+86400000});
const until=async fn=>{const end=Date.now()+2000;while(!fn()){if(Date.now()>end)throw Error('Condition timeout');await new Promise(r=>setTimeout(r,5));}};
function queue(t,options={}){const q=globalThis.HebleoReviewOutbox.create({siteId,ownerId,indexedDB:new IDBFactory(),send:async i=>receipt(i),lookup:async()=>null,pollMs:10,timeoutMs:100,...options});t.after(()=>q.dispose());return q;}
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
 assert.throws(()=>s.backgroundReview(ownerId,{...i,rating:4}),/Conflicting/);s.undoReview(ownerId,{requestId:i.requestId});assert.equal(s.backgroundReview(ownerId,i).outcome,'undone');assert.throws(()=>s.backgroundReview(ownerId,{...i,requestId:randomUUID()}),/changed/);
 const fresh=payload(s),state=s.learner(ownerId);state.reviewClockTickets[fresh.clockTicketId].issuedAt-=10000;state.reviewClockTickets[fresh.clockTicketId].expiresAt=state.reviewClockTickets[fresh.clockTicketId].issuedAt+1;s.saveLearner(ownerId,state);assert.throws(()=>s.backgroundReview(ownerId,fresh),/expired/);
 const backup=s.backup();s.restore(backup);assert.deepEqual(s.learner(ownerId).reviewGenerations,backup.learners.find(x=>x.id===ownerId).state.reviewGenerations);assert.deepEqual(s.snapshot(),before);
 s.close();s=new Store(join(dir,'fixture.db'));assert.equal(s.backgroundReview(ownerId,i).outcome,'undone');assert.deepEqual(s.learner(ownerId).reviewClockTickets,backup.learners.find(x=>x.id===ownerId).state.reviewClockTickets);
});
test('HTTP contract enforces scope, suspended/version changes, future/regressed clocks',async t=>{
 const s=new Store();t.after(()=>s.close());s.enroll(ownerId,'w-ani');const server=createServer(s);await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));const origin='http://127.0.0.1:'+server.address().port;
 const post=async(path,body)=>{const r=await fetch(origin+'/api/'+path,{method:'POST',headers:{'content-type':'application/json','x-demo-user':ownerId},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};};
 const anchors=(await post('review/clock',{})).body.anchors;assert(anchors['w-ani']);const i=payload(s);
 assert.equal((await post('review/background',{...i,ownerId:'learner-core'})).status,403);
 assert.equal((await post('review/background',{...i,elapsedMs:180000})).status,409);
 const state=s.learner(ownerId);state.reviewAnswerTimes={'w-ani':Date.now()+5000};s.saveLearner(ownerId,state);assert.equal((await post('review/background',i)).status,409);delete state.reviewAnswerTimes;state.cards['w-ani'].suspended=true;s.saveLearner(ownerId,state);assert.equal((await post('review/background',i)).status,409);
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
