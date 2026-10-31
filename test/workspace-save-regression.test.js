import test from 'node:test';
import assert from 'node:assert/strict';
import {Store} from '../src/store.js';
import {createStudioWorkspace,mergeWorkspace} from '../public/studio/workspace.js';

test('shared save receipts acknowledge only sent buffers; pending edits, detached collectors and failures retain exact state',async t=>{
 const s=new Store();t.after(()=>s.close());let release,fail=false,raw='A',acknowledged=[];
 const w=createStudioWorkspace({content:s.snapshot(),baseRevisionId:s.get('active'),saveDraft:input=>new Promise((yes,no)=>{release=()=>fail?no(Object.assign(new Error('synthetic conflict'),{status:409})):yes(s.stage(input));})});
 const off=w.registerCollector(()=>{const sent=raw;if(sent!==null){const next=w.peekContent();next.lessons[0].title=sent;w.replace(next,{changed:false});}return ()=>{acknowledged.push(sent);if(raw===sent)raw=null;};});
 w.touch();w.getContent();assert.equal(raw,'A');assert.deepEqual(acknowledged,[]);
 const first=w.save();await new Promise(r=>setImmediate(r));raw='B';w.touch();off();release();await first;
 assert.equal(raw,'B');assert.deepEqual(acknowledged,['A']);assert.equal(w.dirty,true);assert.equal(s.currentDraft().content.lessons[0].title,'A');
 w.registerCollector(()=>{const sent=raw,next=w.peekContent();next.lessons[0].title=sent;w.replace(next,{changed:false});return ()=>{acknowledged.push(sent);if(raw===sent)raw=null;};});
 fail=true;const failed=w.save();await new Promise(r=>setImmediate(r));release();await assert.rejects(failed,/synthetic conflict/);assert.equal(raw,'B');assert.deepEqual(acknowledged,['A']);assert.equal(w.dirty,true);
 fail=false;const second=w.save();await new Promise(r=>setImmediate(r));release();await second;assert.equal(raw,null);assert.deepEqual(acknowledged,['A','B']);assert.equal(w.dirty,false);assert.equal(s.currentDraft().content.lessons[0].title,'B');
});

test('QA-F14-META-02: nested own reserved JSON keys, deletions, nulls and arrays survive reconcile and Store save/readback',async t=>{
 const s=new Store();t.after(()=>s.close());const c=s.snapshot();
 c.qaMetadata=JSON.parse('{"left":0,"right":0,"__proto__":{"constructor":{"__proto__":[1,null,{"constructor":"exact"}]}},"constructor":{"left":0,"right":0},"deleteMe":1,"nullMe":1,"array":[null,{"__proto__":"array own","constructor":2}]}');
 s.set('active',s.addRevision(c,'Synthetic reserved JSON metadata'));const w=createStudioWorkspace({content:c,baseRevisionId:s.get('active'),saveDraft:input=>s.stage(input)}),local=w.getContent();
 local.qaMetadata.left=1;local.qaMetadata.constructor.left=1;delete local.qaMetadata.deleteMe;local.qaMetadata.nullMe=null;w.replace(local);
 const latest=s.snapshot();latest.qaMetadata.right=1;latest.qaMetadata.constructor.right=1;latest.qaMetadata.newOwn=JSON.parse('{"__proto__":null,"constructor":[null,3]}');
 s.stage({baseRevisionId:s.get('active'),expectedDraftToken:null,content:latest});w.reconcile(s.active());await w.save();
 const result=s.currentDraft().content.qaMetadata;assert.equal(Object.getPrototypeOf(result),Object.prototype);assert.equal(Object.hasOwn(result,'__proto__'),true);assert.deepEqual(result.__proto__,c.qaMetadata.__proto__);assert.deepEqual(result.constructor,{left:1,right:1});assert.equal(Object.hasOwn(result,'deleteMe'),false);assert.equal(result.nullMe,null);assert.deepEqual(result.array,c.qaMetadata.array);assert.deepEqual(result.newOwn,latest.qaMetadata.newOwn);
 for(const key of ['__proto__','constructor']){
  const base=JSON.parse('{"left":0,"'+key+'":{"retained":true}}'),local=structuredClone(base),latest=structuredClone(base);delete local[key];latest.left=1;
  const deleted=mergeWorkspace(base,local,latest);assert.equal(Object.hasOwn(deleted,key),false);assert.equal(deleted.left,1);
  const absent={left:0,right:0},added=structuredClone(absent),other=structuredClone(absent);Object.defineProperty(added,key,{value:null,enumerable:true,writable:true,configurable:true});other.right=1;
  const merged=mergeWorkspace(absent,added,other);assert.equal(Object.hasOwn(merged,key),true);assert.equal(merged[key],null);assert.equal(Object.getPrototypeOf(merged),Object.prototype);
 }
});
