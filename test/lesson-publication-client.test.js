import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {Store} from '../src/store.js';
import {createStudioWorkspace} from '../public/studio/workspace.js';
import {openLessonPublication} from '../public/studio/lesson-publication.js';
import {readFileSync} from 'node:fs';

function fixture(t){
 const s=new Store();t.after(()=>s.close());const active=s.snapshot(),c=s.snapshot();c.lessons[0].explanation+=' Synthetic selected text';c.lessons[1].title+=' Synthetic remaining draft';
 s.stage({baseRevisionId:s.get('active'),expectedDraftToken:null,content:c});
 const d=s.currentDraft(),w=createStudioWorkspace({content:d.content,publishedContent:active,baseRevisionId:d.baseRevisionId,expectedDraftToken:d.draftToken,saveDraft:input=>s.stage(input,undefined,{returnMinimal:true})}),id=c.lessons[0].id;
 const input=()=>({baseRevisionId:w.baseRevisionId,expectedDraftToken:w.expectedDraftToken,lessonId:id,includeDependencies:[]});
 return {s,w,id,input,review:()=>s.reviewLessonPublication(input())};
}
const turn=()=>new Promise(r=>setImmediate(r));
for(const kind of ['missing-pins','string-pins','zero-pins','old-revision','missing-published','bad-published','empty-token','malformed-token','old-token'])test('QA-EDITOR-PUB-RECEIPT-01: '+kind+' freezes writes before adopting any pin or acknowledging late input',async t=>{
 const {s,w,input,review}=fixture(t),r=review(),oldBase=w.baseRevisionId,oldToken=w.expectedDraftToken;let raw=null,acks=0;
 w.registerCollector(()=>{if(raw){const c=w.peekContent();c.lessons[1].title=raw;w.replace(c,{changed:false});}return ()=>acks++;});
 await assert.rejects(w.publishLesson(r,()=>{
  const result=s.publishLesson({...input(),reviewToken:r.reviewToken});raw='Synthetic retained after '+kind;w.touchBuffer('late');
  if(kind==='missing-pins'){delete result.revisionId;delete result.workspace.revisionId;delete result.workspace.draft.baseRevisionId;}
  if(kind==='string-pins')result.revisionId=result.workspace.revisionId=result.workspace.draft.baseRevisionId='invalid';
  if(kind==='zero-pins')result.revisionId=result.workspace.revisionId=result.workspace.draft.baseRevisionId=0;
  if(kind==='old-revision')result.revisionId=result.workspace.revisionId=result.workspace.draft.baseRevisionId=oldBase;
  if(kind==='missing-published')delete result.workspace.content;
  if(kind==='bad-published')result.workspace.content={};
  if(kind==='empty-token')result.workspace.draft.draftToken='';
  if(kind==='malformed-token')result.workspace.draft.draftToken='dt1-not-a-hash';
  if(kind==='old-token')result.workspace.draft.draftToken=oldToken;
  return result;
 }),/receipt/);
 assert.equal(w.baseRevisionId,oldBase);assert.equal(w.expectedDraftToken,oldToken);assert.ok(w.writeBlock);assert.equal(w.dirty,true);assert.equal(w.getContent().lessons[1].title,raw);assert.equal(acks,0);await assert.rejects(w.save(),/reconciliation/);
 w.reconcile(s.active());await w.save();assert.equal(s.currentDraft().content.lessons[1].title,raw);assert.equal(s.get('active'),oldBase+1);
});
test('same owner adopts remaining draft and new pins; later selected/unselected saves cannot revert publication',async t=>{
 const {s,w,id,input,review}=fixture(t),r=review(),before=structuredClone(s.currentDraft().content),result=await w.publishLesson(r,()=>s.publishLesson({...input(),reviewToken:r.reviewToken}));
 assert.equal(w.baseRevisionId,result.revisionId);assert.equal(w.expectedDraftToken,result.workspace.draft.draftToken);assert.equal(w.dirty,false);assert.deepEqual(w.getContent(),before);assert.match(w.publicationState(id),/This lesson is published.*Other workspace drafts remain private/);
 const published=s.snapshot(),next=w.getContent();next.lessons[1].title+=' More';w.replace(next);await w.save();assert.deepEqual(s.snapshot(),published);assert.equal(s.currentDraft().baseRevisionId,result.revisionId);assert.deepEqual(s.currentDraft().content.lessons[0],published.lessons[0]);
});
test('publication preserves later collector buffers and unsent comment; save is serialized and no unsent value is acknowledged',async t=>{
 const {s,w,id,input,review}=fixture(t),r=review();let release,raw=null,acks=0;const comment={body:'Synthetic unsent quote comment'};
 w.registerCollector(()=>{if(raw!==null){const c=w.peekContent();c.lessons[1].title=raw;w.replace(c,{changed:false});}return ()=>{acks++;raw=null;};});
 const immutable={...input(),reviewToken:r.reviewToken},p=w.publishLesson(r,()=>new Promise(resolve=>release=()=>resolve(s.publishLesson(immutable))));await turn();
 await assert.rejects(w.save(),/publication/);raw='Synthetic later edit';w.touchBuffer('later');release();const result=await p;
 assert.equal(w.baseRevisionId,result.revisionId);assert.equal(w.dirty,true);assert.equal(raw,'Synthetic later edit');assert.equal(acks,0);assert.equal(comment.body,'Synthetic unsent quote comment');assert.equal(w.getContent().lessons[1].title,raw);
 await w.save();assert.equal(acks,1);assert.equal(w.dirty,false);assert.equal(s.currentDraft().content.lessons[1].title,'Synthetic later edit');assert.equal(s.snapshot().lessons[0].id,id);
});
test('lost response freezes writes; explicit three-way reconciliation keeps late input and retry cannot duplicate a release',async t=>{
 const {s,w,input,review}=fixture(t),r=review(),immutable={...input(),reviewToken:r.reviewToken};let raw=null;
 w.registerCollector(()=>{if(raw){const c=w.peekContent();c.lessons[1].title=raw;w.replace(c,{changed:false});}});
 await assert.rejects(w.publishLesson(r,async()=>{s.publishLesson(immutable);raw='Synthetic late retained';w.touchBuffer('later');throw new TypeError('Synthetic response dropped');}),/dropped/);
 assert.match(w.writeBlock,/uncertain/);await assert.rejects(w.save(),/uncertain/);assert.throws(()=>s.publishLesson(immutable),error=>error.code==='STALE_BASE');
 const current=s.get('active');w.reconcile(s.active());assert.equal(w.writeBlock,null);assert.equal(w.getContent().lessons[1].title,raw);await w.save();assert.equal(s.get('active'),current);assert.equal(s.currentDraft().baseRevisionId,current);
});
test('stale review and failed authorization retain buffers without adopting new pins; malformed success freezes writes',async t=>{
 const {w,input,review}=fixture(t),r=review(),old=input();w.touchBuffer('newer');await assert.rejects(w.publishLesson(r,()=>assert.fail('must not commit')),/Save/);w.touchBuffer('newer',false);
 await assert.rejects(w.publishLesson(r,()=>Promise.reject(Object.assign(new Error('Synthetic 409'),{status:409}))),/409/);assert.equal(w.writeBlock,null);assert.equal(w.baseRevisionId,old.baseRevisionId);
 await assert.rejects(w.publishLesson(r,()=>({publication:{},workspace:{}})),/receipt/);assert.match(w.writeBlock,/reconciliation/);assert.equal(w.expectedDraftToken,old.expectedDraftToken);
});
test('composition finishing during publish preparation invalidates review before commit',async t=>{
 const {w,review}=fixture(t),r=review();let settle;w.registerSettler(()=>new Promise(resolve=>settle=()=>{w.touchBuffer('IME');resolve();}));
 const p=w.publishLesson(r,()=>assert.fail('must not commit'));await turn();settle();await assert.rejects(p,/changed/);assert.equal(w.dirty,true);assert.equal(w.writeBlock,null);
});
test('dialog reviews without publication, requires final confirmation, shows exact private remainder, and retains owner after completion',async t=>{
 const {s,w,id}=fixture(t),dom=new JSDOM('<button id="before">Review</button>',{pretendToBeVisual:true}),doc=dom.window.document;t.after(()=>dom.window.close());let calls=[],published;
 doc.querySelector('button').focus();const ui=openLessonPublication({document:doc,workspace:w,lessonId:id,title:'Synthetic lesson',api:async(path,input)=>{calls.push(path);if(path.endsWith('/review'))return s.reviewLessonPublication(input);return s.publishLesson(input);},onPublished:result=>published=result});await ui.ready;
 assert.deepEqual(calls,['studio/publish-lesson/review']);assert.match(ui.dialog.textContent,/Selected lesson/);assert.match(ui.dialog.textContent,/Saved changes left private/);assert.equal(ui.dialog.querySelector('[data-publication-confirm]').disabled,false);
 ui.dialog.querySelector('[data-publication-confirm]').click();await turn();assert.equal(calls.filter(x=>x==='studio/publish-lesson').length,1);assert.equal(w.baseRevisionId,published.revisionId);assert.match(ui.dialog.textContent,/Published .* local revision/);ui.close();assert.equal(doc.activeElement.id,'before');
});
test('dirty input invalidates a displayed confirmation; Cancel does not publish or discard buffers',async t=>{
 const {s,w,id}=fixture(t),dom=new JSDOM('<button>Review</button>');t.after(()=>dom.window.close());let commits=0;
 const ui=openLessonPublication({document:dom.window.document,workspace:w,lessonId:id,api:async(path,input)=>{if(path.endsWith('/review'))return s.reviewLessonPublication(input);commits++;return s.publishLesson(input);}});await ui.ready;
 w.touchBuffer('late');await turn();assert.equal(ui.dialog.querySelector('[data-publication-confirm]').disabled,true);assert.match(ui.dialog.textContent,/previous confirmation is no longer valid/);ui.close();assert.equal(w.dirty,true);assert.equal(commits,0);
});

test('publication loading retains a stable focus target; refresh and completion recover usable dialog focus',async t=>{
 const {s,w,id}=fixture(t),dom=new JSDOM('<button id="opener">Review</button>',{pretendToBeVisual:true}),doc=dom.window.document;t.after(()=>dom.window.close());
 const opener=doc.querySelector('button');opener.focus();let release;const ui=openLessonPublication({document:doc,workspace:w,lessonId:id,api:(path,input)=>path.endsWith('/review')?new Promise(resolve=>release=()=>resolve(s.reviewLessonPublication(input))):s.publishLesson(input)});
 assert.equal(doc.activeElement,ui.dialog.querySelector('h2'));assert.equal(ui.dialog.querySelector('[data-publication-cancel]').disabled,true);release();await ui.ready;
 assert.equal(doc.activeElement,ui.dialog.querySelector('h2'));
 const refresh=ui.dialog.querySelector('[data-publication-refresh]');refresh.focus();refresh.click();doc.body.tabIndex=-1;doc.body.focus();release();await turn();assert.equal(doc.activeElement,refresh);
 const confirm=ui.dialog.querySelector('[data-publication-confirm]');confirm.focus();confirm.click();doc.body.focus();await turn();assert.equal(doc.activeElement,ui.dialog.querySelector('[data-publication-cancel]'));assert.equal(doc.activeElement.textContent,'Close');ui.close();assert.equal(doc.activeElement,opener);
});

for(const uncertain of [false,true])test('publication controls honor hidden in review, '+(uncertain?'uncertain':'success')+' and Close states',async t=>{
 const {s,w,id}=fixture(t),dom=new JSDOM('<main></main>',{pretendToBeVisual:true});t.after(()=>dom.window.close());const doc=dom.window.document,style=doc.createElement('style');style.textContent='.button{display:flex}\n'+readFileSync(new URL('../public/author/author.css',import.meta.url),'utf8');doc.head.append(style);
 const ui=openLessonPublication({document:doc,workspace:w,lessonId:id,api:async(path,input)=>{if(path.endsWith('/review'))return s.reviewLessonPublication(input);const result=s.publishLesson(input);if(uncertain)throw new TypeError('Synthetic dropped response');return result;}});await ui.ready;
 const display=selector=>dom.window.getComputedStyle(ui.dialog.querySelector(selector)).display;
 assert.equal(display('[data-publication-check]'),'none');assert.notEqual(display('[data-publication-confirm]'),'none');ui.dialog.querySelector('[data-publication-confirm]').click();await turn();
 if(uncertain){assert.ok(w.writeBlock);assert.notEqual(display('[data-publication-check]'),'none');assert.equal(ui.dialog.querySelector('[data-publication-confirm]').disabled,true);}else{assert.equal(display('[data-publication-confirm]'),'none');assert.equal(display('[data-publication-refresh]'),'none');assert.equal(display('[data-publication-check]'),'none');assert.equal(ui.dialog.querySelector('[data-publication-cancel]').textContent,'Close');}ui.close();
});
