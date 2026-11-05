import test from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {JSDOM} from 'jsdom';
import {Store} from '../src/store.js';import {nextStudyDay,isReviewBuried} from '../src/review-burial.js';import {createReviewSave} from '../public/review-save.js';import {mountReviewKeys} from '../public/review-shortcuts.js';import {mountSharedReview} from '../public/shared-cards.js';
const a='sc-mf-000001-he-en',b='sc-mf-000001-en-he';
function synthetic(store){store.shared.word=id=>[a,b].includes(id)?{id,shared:true,sourceId:'mf-000001'}:null;for(const user of ['learner-demo','learner-core']){store.enroll(user,a);store.enroll(user,b);}}
test('burial success only, stable identity, learner isolation, same-card relearning, CAS, duplicate and undo',()=>{
 const s=new Store();try{synthetic(s);const before=s.learner('learner-demo');assert.throws(()=>s.review('learner-demo',{wordId:a,requestId:'bad',rating:9}));assert(!s.learner('learner-demo').reviewBurials);
 const result=s.review('learner-demo',{wordId:a,requestId:'burial-1',rating:1,expectedCard:before.cards[a]});let state=s.learner('learner-demo');assert(isReviewBuried(state,b));assert(!isReviewBuried(state,a));assert(!isReviewBuried(s.learner('learner-core'),b));assert.deepEqual(state.cards[b],before.cards[b]);
 assert.throws(()=>s.review('learner-demo',{wordId:b,requestId:'burial-2',rating:1}),e=>e.code==='REVIEW_CARD_BURIED');assert.equal(s.review('learner-demo',{wordId:a,requestId:'burial-1',rating:1}).duplicate,true);
 assert(!s.bootstrap('learner-demo').due.some(x=>x.word.id===b));assert(s.bootstrap('learner-core').due.some(x=>x.word.id===b));
 const expires=state.reviewBurials['mf-000001'].until;assert(!isReviewBuried(state,b,Date.parse(expires)));s.undoReview('learner-demo',{requestId:result.requestId});assert(!isReviewBuried(s.learner('learner-demo'),b));assert.deepEqual(s.learner('learner-demo').cards,before.cards);
 }finally{s.close()}
});
test('local next-midnight honors DST short/long days',()=>{const old=process.env.TZ;process.env.TZ='America/New_York';try{for(const [start,hours]of [['2026-03-08T00:00:00-05:00',23],['2026-11-01T00:00:00-04:00',25]])assert.equal((Date.parse(nextStudyDay(Date.parse(start)))-Date.parse(start))/3600000,hours)}finally{if(old===undefined)delete process.env.TZ;else process.env.TZ=old}});
test('burial persists across SQLite reopen without touching sibling history',()=>{const dir=mkdtempSync(join(tmpdir(),'hebleo-burial-')),file=join(dir,'test.sqlite');let s=new Store(file);try{synthetic(s);s.review('learner-demo',{wordId:a,requestId:'persist',rating:1});const before=s.learner('learner-demo');s.close();s=new Store(file);assert.deepEqual(s.learner('learner-demo'),before);assert(isReviewBuried(s.learner('learner-demo'),b));}finally{s.close();rmSync(dir,{recursive:true,force:true})}});
test('review write blocks duplicate calls, times out unresolved promises and reconciles without resubmission',async()=>{let calls=0,applies=0,status;const receipt={requestId:'r1',wordId:a,rating:3};const save=createReviewSave({timeoutMs:10,send:async path=>{calls++;if(path==='review')return new Promise(()=>{});return {receipt}},apply:()=>applies++,status:s=>status=s});const first=save.commit(receipt);await save.commit(receipt);await assert.rejects(first,/timed out/);assert(save.blocked);await save.commit(receipt);assert.equal(calls,1);await save.reconcile();assert.equal(calls,2);assert.equal(applies,1);assert(!save.blocked);assert.equal(status,'')});
test('mismatched or missing reconciliation never reports success',async()=>{let applied=0;const save=createReviewSave({send:async path=>path==='review'?Promise.reject(Error('network')):{receipt:null},apply:()=>applied++,status:()=>{}});await assert.rejects(save.commit({requestId:'r1',wordId:a,rating:3}));await assert.rejects(save.reconcile());assert(save.blocked);assert.equal(applied,0)});
test('host shortcuts ignore repeats, editables, dialogs/modifiers and prevent native button double clicks',()=>{const page=new JSDOM('<button>Reveal</button><input><div contenteditable="true"></div>');const {document,KeyboardEvent}=page.window;let keys=[];const dispose=mountReviewKeys({document,active:()=>true,onShortcut:k=>keys.push(k)});const send=(el,key,options={})=>{const e=new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true,...options});el.dispatchEvent(e);return e};assert(send(document.querySelector('button'),' ').defaultPrevented);send(document.body,'3');assert(send(document.body,'3',{repeat:true}).defaultPrevented);send(document.body,'3',{shiftKey:true});send(document.querySelector('input'),'1');send(document.querySelector('[contenteditable]'),'1');assert.deepEqual(keys,['reveal','3']);dispose();page.window.close()});
test('opaque frame relay rejects wrong source, generation, extra keys and stale frame after dispose',async()=>{const page=new JSDOM('<iframe data-card-id="'+a+'" data-face="front"></iframe>',{url:'http://localhost'});const prior=globalThis.window;globalThis.window=page.window;try{const frame=page.window.document.querySelector('iframe');let context,keys=[];const binding=mountSharedReview(frame,{api:async()=>({url:'/fixture'}),onError:()=>{},onShortcut:key=>keys.push(key)});await binding.loaded;frame.contentWindow.postMessage=data=>context=data;const send=(data,source=frame.contentWindow)=>page.window.dispatchEvent(new page.window.MessageEvent('message',{source,data}));send({type:'hebleo-review-ready'});assert(context.generation);const valid={type:'hebleo-review-key',generation:context.generation,key:'3'};send(valid,page.window);send({...valid,generation:'old'});send({...valid,extra:true});assert.equal(keys.length,0);send(valid);assert.deepEqual(keys,['3']);binding.dispose();send(valid);assert.equal(keys.length,1);assert.equal(frame.getAttribute('sandbox'),'allow-scripts');}finally{globalThis.window=prior;page.window.close()}});

test('Jerusalem DST rollover and bootstrap eligibility expire at local midnight, not elapsed 24 hours',()=>{
 const oldZone=process.env.TZ,oldNow=Date.now;
 process.env.TZ='Asia/Jerusalem';
 try{
  for(const [day,hours]of [['2026-11-04T00:00:00+02:00',24],['2026-03-27T00:00:00+02:00',23],['2026-10-25T00:00:00+03:00',25]]){
   const start=Date.parse(day);let now=start;Date.now=()=>now;
   const s=new Store();
   try{
    synthetic(s);
    // Enrollment uses new Date(), which Date.now-only mocking does not freeze.
    // Give every synthetic card a due date in this fixture's timeline, independently of wall time.
    for(const user of ['learner-demo','learner-core']){
     const state=s.learner(user);
     for(const id of [a,b])state.cards[id].due=new Date(start-1000).toISOString();
     s.saveLearner(user,state);
    }
    assert(s.bootstrap('learner-demo').due.some(c=>c.word.id===a));
    assert(s.bootstrap('learner-demo').due.some(c=>c.word.id===b));
    const siblingBefore=structuredClone(s.learner('learner-demo').cards[b]);
    s.review('learner-demo',{wordId:a,requestId:'rollover',rating:1});
    const expiry=Date.parse(s.learner('learner-demo').reviewBurials['mf-000001'].until);
    assert.equal((expiry-start)/3600000,hours);
    assert.equal(expiry,Date.parse(nextStudyDay(start)));
    now=start+600001;
    assert(s.bootstrap('learner-demo').due.some(c=>c.word.id===a));
    assert(!s.bootstrap('learner-demo').due.some(c=>c.word.id===b));
    now=expiry-1;
    assert(!s.bootstrap('learner-demo').due.some(c=>c.word.id===b));
    now=expiry;
    assert(s.bootstrap('learner-demo').due.some(c=>c.word.id===b));
    assert.deepEqual(s.learner('learner-demo').cards[b],siblingBefore);
   }finally{s.close();}
  }
 }finally{Date.now=oldNow;if(oldZone===undefined)delete process.env.TZ;else process.env.TZ=oldZone;}
});

test('read-only reconciliation receipts are learner scoped and course gated',async()=>{
 const {createServer}=await import('../src/server.js');const s=new Store();synthetic(s);s.review('learner-demo',{wordId:a,requestId:'scope-receipt',rating:1});const server=createServer(s);await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port+'/api/review/status?requestId=scope-receipt';try{
 const own=await fetch(url,{headers:{'x-demo-user':'learner-demo'}});assert.equal((await own.json()).receipt.requestId,'scope-receipt');const other=await fetch(url,{headers:{'x-demo-user':'learner-core'}});assert.equal((await other.json()).receipt,null);const state=s.learner('learner-demo');state.purchasedCourses=[];s.saveLearner('learner-demo',state);assert.equal((await fetch(url,{headers:{'x-demo-user':'learner-demo'}})).status,403);
 }finally{await new Promise(r=>server.close(r));s.close()}
});
