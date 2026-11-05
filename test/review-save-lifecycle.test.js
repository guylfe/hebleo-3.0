import test from 'node:test';import assert from 'node:assert/strict';
import {createReviewSave} from '../public/review-save.js';
const receipt={requestId:'lifecycle',wordId:'w-ani',rating:3};
test('confirmed write plus stalled apply is bounded, cancellable and recovered without POST retry',async()=>{
 let release,context,applications=0,status='',calls=[];
 const save=createReviewSave({timeoutMs:20,send:async path=>{calls.push(path);return path==='review'?receipt:{receipt}},status:value=>status=value,apply:async(_,operation)=>{if(!context){context=operation;await new Promise(r=>release=r);}if(operation.isCurrent())applications++;}});
 await assert.rejects(save.commit(receipt),/timed out/);assert(context.signal.aborted);assert(save.blocked);assert.match(status,/Review saved.*refresh is incomplete/);assert.equal(applications,0);
 await save.reconcile();assert.equal(applications,1);assert.equal(calls.filter(x=>x==='review').length,1);assert(!save.blocked);
 release();await new Promise(r=>setImmediate(r));assert.equal(applications,1);assert.equal(status,'');
});
test('cancelling a review suppresses late acknowledgment and old status/apply work',async()=>{
 let release,applications=0,status=[];const save=createReviewSave({send:()=>new Promise(r=>release=r),status:s=>status.push(s),apply:()=>applications++});
 const operation=save.commit(receipt);save.cancel();await operation;const messages=status.length;release(receipt);await new Promise(r=>setImmediate(r));assert.equal(applications,0);assert.equal(status.length,messages);
});
