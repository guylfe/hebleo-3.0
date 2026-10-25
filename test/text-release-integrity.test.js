// Regression provenance: independent Release Reviewer RR-TXT-01, frozen d912e746.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Store} from '../src/store.js';
import {createServer} from '../src/server.js';
import {projectLesson} from '../public/course.js';
const pack=JSON.parse(readFileSync(new URL('../docs/curriculum/first20-20261025/content.json',import.meta.url)));
const dump=s=>JSON.stringify(s.db.prepare("SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name").all().map(({name})=>[name,s.db.prepare('SELECT * FROM "'+name+'" ORDER BY 1').all()]));
const input=s=>({baseRevisionId:s.get('active'),expectedDraftToken:s.currentDraft()?.draftToken??null,pack});
const strip=content=>{for(const l of content.lessons.filter(l=>l.draftImport)){delete l.draftImport;delete l.publicationStatus;}return content;};

test('RR-TXT-01 actual author HTTP restore cannot strip two flags and release pending teaching',async t=>{
 const s=new Store(),server=createServer(s);t.after(()=>s.close());await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));const base='http://127.0.0.1:'+server.address().port+'/api/';
 const call=async(path,body)=>{const response=await fetch(base+path,{method:body?'POST':'GET',headers:{'x-demo-user':'author-demo','content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,value:await response.json()};};
 assert.equal((await call('studio/text/import',input(s))).status,200);const original=(await call('export')).value;
 assert.equal((await call('studio/publish',{baseRevisionId:s.get('active'),draftToken:s.currentDraft().draftToken})).status,409);
 const backup=structuredClone(original);strip(backup.draft.content);const before=dump(s),refusal=await call('restore',backup);assert.equal(refusal.status,409);assert.equal(refusal.value.code,'TEXT_IMPORT_IDENTITY_REQUIRED');assert.equal(dump(s),before);assert.equal(s.snapshot().lessons.length,3);
 // Semantics independently refuse a stripped draft even without prior imported identity knowledge.
 const blank=new Store();try{blank.restore(backup);const draft=blank.currentDraft();const rows=dump(blank);assert.throws(()=>blank.publish(draft.baseRevisionId,draft.draftToken),e=>e.code==='TEXT_DRAFT_REVIEW_REQUIRED');assert.equal(dump(blank),rows);assert.equal(blank.snapshot().lessons.length,3);}finally{blank.close();}
});
test('RR-TXT-01 active and historical restores check pending review semantics independently of removable markers',t=>{
 const s=new Store();t.after(()=>s.close());s.importTextDraft(input(s));const original=s.backup();
 for(const historical of [false,true]){
  const backup=structuredClone(original),teaching=strip(structuredClone(backup.draft.content));backup.draft=null;
  if(historical)backup.revisionSnapshots.push({revisionId:777,content:teaching});else{backup.content=teaching;backup.revisionSnapshots.find(r=>r.revisionId===backup.activeRevisionId).content=structuredClone(teaching);}
  const rows=dump(s);assert.throws(()=>s.restore(backup),e=>e.code==='TEXT_DRAFT_REVIEW_REQUIRED');assert.equal(dump(s),rows);
 }
 // A deliberately poisoned historical fixture also cannot be activated by rollback.
 const poisoned=s.addRevision(strip(structuredClone(original.draft.content)),'SYNTHETIC historical corruption fixture'),rows=dump(s);
 assert.throws(()=>s.rollback(poisoned,s.get('active'),s.currentDraft().draftToken),e=>e.code==='TEXT_DRAFT_REVIEW_REQUIRED');assert.equal(dump(s),rows);
});
test('RR-TXT-01 valid unpublished recovery retains source identity and tolerates JSON key-order changes',t=>{
 const s=new Store();t.after(()=>s.close());s.importTextDraft(input(s));const backup=s.backup();
 for(const l of backup.draft.content.lessons.filter(l=>l.draftImport))l.draftImport=Object.fromEntries(Object.entries(l.draftImport).reverse());
 const expected=structuredClone(backup.draft.content);s.restore(backup);assert.deepEqual(s.currentDraft().content,expected);const rows=dump(s);assert.throws(()=>s.publish(s.get('active'),s.currentDraft().draftToken),e=>e.code==='TEXT_DRAFT_REVIEW_REQUIRED');assert.equal(dump(s),rows);
});
test('RR-TXT-01 pending adapted provenance and review/target records cannot be laundered as ordinary synthetic text',t=>{
 const s=new Store();t.after(()=>s.close());const imported=s.reviewTextImport(input(s)).content;
 for(const l of imported.lessons.filter(l=>l.draftImport)){delete l.draftImport;delete l.publicationStatus;}
 const d=s.stage({baseRevisionId:s.get('active'),expectedDraftToken:null,content:imported}),rows=dump(s);assert.throws(()=>s.publish(d.baseRevisionId,d.draftToken),e=>e.code==='TEXT_DRAFT_REVIEW_REQUIRED');assert.equal(dump(s),rows);
});
test('required text gates refuse forged Finish atomically; grades and page responses still require deliberate completion',t=>{
 const s=new Store();t.after(()=>s.close());const c=s.snapshot(),l=projectLesson(c,c.lessons[0]);l.blocks[0].textPages={version:1,pages:[{id:'required',type:'recall',title:'Synthetic gated recall',answer:'Model',grading:'self-check',gate:'reveal'}],order:['required']};c.lessons[0]=l;const d=s.stage({baseRevisionId:s.get('active'),expectedDraftToken:null,content:c});s.publish(d.baseRevisionId,d.draftToken);const revisionId=s.get('active');
 const finish={lessonId:l.id,componentId:null,revisionId,step:'complete',question:0,answer:'',selectedTokens:[],matching:{}};
 const before=dump(s);assert.throws(()=>s.saveProgress('learner-demo',finish),e=>e.code==='TEXT_GATES_REQUIRED');assert.equal(dump(s),before);
 for(const [exerciseId,answer]of [['ex-1-recognize','who'],['ex-1-type','אני'],['ex-1-match',{'w-hu':'he','w-hi':'she','w-mi':'who'}]])s.attempt('learner-demo',{lessonId:l.id,exerciseId,revisionId,requestId:exerciseId,answer});
 assert.equal(s.learner('learner-demo').completed.includes(l.id),false);s.saveTextProgress('learner-demo',{lessonId:l.id,revisionId,componentId:l.blocks[0].id,pageId:'required',cursorPageId:'required',response:{text:'My attempt',revealed:true}});assert.equal(s.learner('learner-demo').completed.includes(l.id),false);s.saveProgress('learner-demo',finish);assert.equal(s.learner('learner-demo').completed.includes(l.id),true);
});
