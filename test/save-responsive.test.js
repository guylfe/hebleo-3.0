import test from 'node:test';
import assert from 'node:assert/strict';
import {Worker as NodeWorker} from 'node:worker_threads';
import {Store} from '../src/store.js';
import {createStudioWorkspace} from '../public/studio/workspace.js';
import {runSaveTask} from '../public/studio/save-processor.js';
import {processSaveTask} from '../public/studio/save-task.js';
import {patchAuthorField} from '../public/author/field-patch.js';

// Execute the actual browser worker entry in a real Node worker thread; no
// synchronous processor mock can satisfy the thread/timer/transfer assertions.
class BrowserWorker {
 constructor(url){this.node=new NodeWorker(new URL('data:text/javascript,'+encodeURIComponent(
  "import {parentPort} from 'node:worker_threads';globalThis.self={postMessage:(data,transfer)=>parentPort.postMessage(data,transfer)};await import("+JSON.stringify(url.href)+");parentPort.on('message',data=>self.onmessage({data}));")));
  this.node.on('message',data=>this.onmessage?.({data}));this.node.on('error',error=>this.onerror?.(error));
 }
 postMessage(task){this.node.postMessage(task);}
 terminate(){this.node.terminate();}
}
const install=t=>{const old=globalThis.Worker;globalThis.Worker=BrowserWorker;t.after(()=>globalThis.Worker=old);};
function fixture(t){const store=new Store();t.after(()=>store.close());const content=store.snapshot();for(let i=0;i<20;i++){const l=structuredClone(content.lessons[0]);l.id='synthetic-copy-'+i;l.exerciseIds=[];l.checkExerciseIds=[];content.lessons.push(l);}content.retained=JSON.parse('{"__proto__":{"constructor":[null,"exact"]},"constructor":{"left":0,"right":0}}');content.syntheticSizePadding='';content.syntheticSizePadding='.'.repeat(26632089-Buffer.byteLength(JSON.stringify(content)));return {store,content};}

test('real worker prepares exact 26MB/23-lesson body off thread; Save has no full UI clone/stringify and only one frozen submitted owner',async t=>{
 install(t);const {content}=fixture(t),published=structuredClone(content);let ticks=0,submitted,wire;const heartbeat=setInterval(()=>ticks++,1);t.after(()=>clearInterval(heartbeat));
 const original=structuredClone(content),w=createStudioWorkspace({content,publishedContent:published,baseRevisionId:6,expectedDraftToken:'original-token',saveDraft:(input,prepared)=>{submitted=input.content;wire=prepared.body;assert.ok(Object.isFrozen(input.content));assert.throws(()=>input.content.retained.constructor.left=99,TypeError);return {draftToken:'saved-token'};}});
 let raw='Synthetic first';w.registerCollector(()=>{w.patchAuthorFields(content.lessons[0].id,[{field:'title',value:raw}]);return ()=>{if(raw==='Synthetic first')raw=null;};});w.touchBuffer('editor');
 const clone=globalThis.structuredClone,stringify=JSON.stringify;let fullClones=0,fullSerializations=0;globalThis.structuredClone=value=>{if(value?.lessons?.length===23)fullClones++;return clone(value);};JSON.stringify=(value,...args)=>{if(value?.content?.lessons?.length===23||value?.lessons?.length===23)fullSerializations++;return stringify(value,...args);};
 try{await w.save();}finally{globalThis.structuredClone=clone;JSON.stringify=stringify;}
 assert.equal(fullClones,0);assert.equal(fullSerializations,0);assert.ok(ticks>1,'main event loop runs while real worker prepares');assert.equal(raw,null);assert.equal(w.dirty,false);
 original.lessons[0].title='Synthetic first';assert.deepEqual(submitted,original);assert.deepEqual(JSON.parse(wire instanceof Blob?await wire.text():new TextDecoder().decode(wire)),{baseRevisionId:6,expectedDraftToken:'original-token',content:original});assert.deepEqual(w.peekContent(),original);
 content.retained.constructor.left=7;published.lessons[0].title='External alias';const detached=w.getLesson(content.lessons[0].id);detached.title='Detached alias';assert.deepEqual(w.peekContent(),original);assert.match(w.publicationState(content.lessons[0].id),/Draft saved/);t.diagnostic(JSON.stringify({bytes:wire.size??wire.byteLength,lessons:submitted.lessons.length,fullUIClones:fullClones,fullUISerializations:fullSerializations,heartbeatTicks:ticks,measurement:'Node real worker correctness, not native paint'}));
});

test('copy-on-write source patch retains all untouched identities and reserved JSON, atomically refuses malformed settings',t=>{
 const s=new Store();t.after(()=>s.close());const c=s.snapshot(),before=structuredClone(c),l=c.lessons[0];Object.defineProperty(l,'__proto__',{value:{constructor:'exact'},enumerable:true});
 const next=patchAuthorField(c,{lessonId:l.id},'title','Synthetic immutable',{clone:false,immutable:true});assert.equal(next.words,c.words);assert.equal(next.lessons[1],c.lessons[1]);assert.notEqual(next.lessons[0],l);assert.deepEqual(next.lessons[0].__proto__,l.__proto__);assert.equal(Object.getPrototypeOf(next.lessons[0]),Object.prototype);assert.equal(c.lessons[0].title,before.lessons[0].title);
 const w=createStudioWorkspace({content:c,baseRevisionId:1,saveDraft:()=>{}}),exact=w.peekContent();assert.throws(()=>w.patchAuthorFields(l.id,[{field:'title',value:'Synthetic must roll back'},{field:'pageSettings',value:'{"id":"forged"}'}]));assert.deepEqual(w.peekContent(),exact);
});

test('worker preparation and HTTP delay retain submitted receipt, newer raw input, CAS pins and immutable baseline',async t=>{
 install(t);const s=new Store();t.after(()=>s.close());let releasePrepared,releaseHTTP,raw='A',acks=[],sent;
 const w=createStudioWorkspace({content:s.snapshot(),baseRevisionId:1,processSave:async task=>{const result=await runSaveTask(task);await new Promise(r=>releasePrepared=r);return result;},saveDraft:input=>{sent=input;return new Promise(r=>releaseHTTP=()=>r({draftToken:'new-token'}));}});
 w.registerCollector(()=>{const value=raw;w.patchAuthorFields('lesson-1',[{field:'title',value}]);return ()=>{acks.push(value);if(raw===value)raw=null;};});w.touchBuffer('editor');const pending=w.save();
 while(!releasePrepared)await new Promise(r=>setTimeout(r,2));raw='B';w.touchBuffer('editor');releasePrepared();while(!releaseHTTP)await new Promise(r=>setTimeout(r,2));assert.equal(sent.content.lessons[0].title,'A');assert.equal(w.expectedDraftToken,null);assert.throws(()=>sent.content.lessons[0].title='Alias corruption',TypeError);releaseHTTP();await pending;assert.equal(w.expectedDraftToken,'new-token');assert.equal(w.dirty,true);assert.equal(raw,'B');assert.deepEqual(acks,['A']);
});

for(const status of [400,403,409,503])test('worker-encoded Save failure '+status+' retains exact source, original pins and unacknowledged buffers',async t=>{
 install(t);const s=new Store();t.after(()=>s.close());let acknowledgements=0;const w=createStudioWorkspace({content:s.snapshot(),baseRevisionId:1,saveDraft:()=>{throw Object.assign(Error('Synthetic failure'),{status});}});w.registerCollector(()=>{w.patchAuthorFields('lesson-1',[{field:'title',value:'Exact 😀 שָׁלוֹם'}]);return ()=>acknowledgements++;});w.touchBuffer('editor');await assert.rejects(w.save(),/Synthetic/);assert.equal(w.pending,null);assert.equal(w.expectedDraftToken,null);assert.equal(w.dirty,true);assert.equal(w.getLesson('lesson-1').title,'Exact 😀 שָׁלוֹם');assert.equal(acknowledgements,0);assert.equal(w.revoked,status===403);
});

test('worker startup/validation failure never submits or acknowledges; full malformed identities are still rejected',async t=>{
 install(t);const s=new Store();t.after(()=>s.close());const c=s.snapshot();c.lessons[0].contentId="bad space";await assert.rejects(runSaveTask({input:{content:c,baseRevisionId:1}}),/Invalid readable/i);
 let sends=0,ack=0;const w=createStudioWorkspace({content:s.snapshot(),baseRevisionId:1,processSave:()=>Promise.reject(Error('Synthetic worker failure')),saveDraft:()=>sends++});w.registerCollector(()=>()=>ack++);w.touch();await assert.rejects(w.save(),/worker failure/);assert.equal(sends,0);assert.equal(ack,0);assert.equal(w.dirty,true);assert.equal(w.expectedDraftToken,null);
});
