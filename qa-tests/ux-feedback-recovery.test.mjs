// Independent correction review. SYNTHETIC controller/DOM/HTTP evidence only.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {JSDOM} from 'jsdom';
import {Store} from '../src/store.js';
import {syntheticOccurrencePack} from '../scripts/exercise-bindings-fixture.mjs';
import {mountLessonPreview} from '../public/preview/lesson-preview.js';
import {createLearnerRenderer} from '../public/preview/learner-renderer.js';
import {portionExercises,portionKind} from '../public/ux.js';
import {app,settled} from '../qa-tests/app-harness.mjs';

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const dump=(s,ignoreResumeTime=false)=>createHash('sha256').update(JSON.stringify(s.db.prepare("SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name").all().map(({name})=>[name,s.db.prepare('SELECT * FROM "'+name+'" ORDER BY 1').all().map(row=>{if(ignoreResumeTime&&name==='learners'){const state=JSON.parse(row.state);for(const resume of Object.values(state.resumes||{}))delete resume.updatedAt;return {...row,state:JSON.stringify(state)};}return row;})]))).digest('hex');
function pointer(w,el,type,relatedTarget,bubbles=false){const e=new w.MouseEvent(type,{bubbles,relatedTarget});Object.defineProperty(e,'pointerType',{value:'mouse'});el.dispatchEvent(e);}
function escape(w,el){const e=new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true});el.dispatchEvent(e);assert.equal(e.defaultPrevented,true);}

for(const mode of ['learner','rehearsal'])for(const field of ['feedback','feedbackDetails'])for(const correct of [false,true])test('independent feedback recovery '+mode+' '+field+' correct='+correct,async t=>{
 let w,root,store,e,disposeContext,raw;
 if(mode==='learner'){
  const ctx=await app(t,{page:'lesson/lesson-2/apply',realHTTP:true,prepare(s){const c=syntheticOccurrencePack(s);e=c.exercises.find(x=>x.type==='cloze');const draft=s.stage({baseRevisionId:s.get('active'),expectedDraftToken:null,content:c}),revisionId=s.publish(s.get('active'),draft.draftToken).revisionId;const lesson=c.lessons.find(x=>x.id===e.lessonId);s.saveProgress('learner-demo',{lessonId:e.lessonId,revisionId,step:'apply',question:lesson.exerciseIds.indexOf(e.id),answer:'',selectedTokens:[],matching:{},practiceIds:[],resultRequestId:null});}});
  ({w,store}=ctx);root=ctx.doc.querySelector('#app');raw=correct?e.answers[0]:'SYNTHETIC WRONG';const input=root.querySelector('#answer');input.value=raw;input.dispatchEvent(new w.Event('input',{bubbles:true}));root.querySelector('[data-action=check]').click();await settled(()=>root.querySelector('[data-authored-vocabulary-answers]'));await sleep(500); // Let the pre-existing 400ms answer-input save finish before the no-write receipt.
  disposeContext=async()=>{w.location.hash='#course';await settled(()=>!root.querySelector('[data-result-explanation]'));};
 }else{
  store=new Store();t.after(()=>store.close());const c=syntheticOccurrencePack(store);e=c.exercises.find(x=>x.type==='cloze');const draft=store.stage({baseRevisionId:store.get('active'),expectedDraftToken:null,content:c}),session=store.previewSession({lessonId:e.lessonId,draftToken:draft.draftToken}),lesson=session.content.lessons.find(x=>x.id===e.lessonId);
  const d=new JSDOM('<dialog open><main></main></dialog>',{pretendToBeVisual:true});w=d.window;root=w.document.querySelector('main');t.after(()=>w.close());const ui=mountLessonPreview(root,{lessonId:e.lessonId,draftToken:draft.draftToken,loadSession:x=>store.previewSession(x),evaluate:x=>store.previewEvaluate(x),renderer:createLearnerRenderer()});t.after(()=>ui.dispose());await ui.ready;const step=session.steps.find(x=>['check','apply'].includes(portionKind(lesson,x))&&portionExercises(session.content,lesson,x).includes(e.id));ui.go(step,portionExercises(session.content,lesson,step).indexOf(e.id));raw=correct?e.answers[0]:'SYNTHETIC WRONG';ui.setAnswer({text:raw});await ui.submit(raw);disposeContext=async()=>ui.go(step,portionExercises(session.content,lesson,step).indexOf(e.id));
 }
 w.matchMedia=q=>({matches:q==='(any-hover: hover)'});w.HTMLElement.prototype.getBoundingClientRect=()=>({left:20,top:50,right:240,bottom:100,width:220,height:50});w.HTMLElement.prototype.getClientRects=function(){return [this.getBoundingClientRect()];};
 const before=dump(store),icon=root.querySelector('[data-result-explanation]'),popover=root.querySelector('[data-result-popover]'),box=icon.parentElement,trigger=popover.querySelector('[data-vocabulary-surface='+field+'] [data-vocabulary-binding]');let outerEscapes=0;
 const owner=w.document.querySelector('dialog')||root;owner.addEventListener('keydown',e=>{if(e.key==='Escape')outerEscapes++;});
 pointer(w,box,'pointerenter');pointer(w,trigger,'pointerover',null,true);let card=root.querySelector('.vocabulary-reminder');assert.ok(card);assert.equal(card.closest('[role=status]'),null);pointer(w,popover,'pointerleave',card);pointer(w,box,'pointerleave',card);pointer(w,card,'pointerover',popover,true);await sleep(240);assert.equal(popover.hidden,false);assert.ok(card.isConnected);
 // Preview exit releases the parent rather than leaving it permanently visible.
 const outside=w.document.createElement('button');outside.textContent='SYNTHETIC outside';root.append(outside);pointer(w,card,'pointerout',outside,true);await sleep(420);assert.equal(card.isConnected,false);assert.equal(popover.hidden,true);
 pointer(w,box,'pointerenter');trigger.click();card=root.querySelector('.vocabulary-reminder');assert.equal(w.document.activeElement,card.querySelector('[data-vocabulary-close]'));pointer(w,box,'pointerleave',card);await sleep(240);assert.equal(popover.hidden,false);
 const details=card.querySelector('details'),summary=details.querySelector('summary');details.open=true;summary.focus();escape(w,summary);assert.equal(details.open,false);assert.equal(w.document.activeElement,summary);assert.ok(card.isConnected);escape(w,summary);assert.equal(card.isConnected,false);assert.equal(w.document.activeElement,trigger);assert.equal(popover.hidden,false);assert.equal(outerEscapes,0);if(owner.tagName==='DIALOG')assert.equal(owner.open,true);
 outside.focus();await sleep(240);assert.equal(w.document.activeElement,outside);assert.equal(popover.hidden,true);assert.equal(dump(store),before);
 // Exact trigger remains operable after recovery, then normal Close returns focus.
 pointer(w,box,'pointerenter');trigger.click();card=root.querySelector('.vocabulary-reminder');pointer(w,box,'pointerleave',card);card.querySelector('[data-vocabulary-close]').click();assert.equal(w.document.activeElement,trigger);assert.equal(popover.hidden,false);assert.equal(root.querySelector('textarea').value,raw);assert.equal(dump(store),before);
 trigger.click();assert.ok(root.querySelector('.vocabulary-reminder'));assert.equal(dump(store),before);const priorDeparture=dump(store,true);await disposeContext();assert.equal(root.querySelector('.vocabulary-reminder'),null);if(mode==='rehearsal')assert.equal(dump(store),before,'Preview replacement writes no tables');else assert.equal(dump(store,true),priorDeparture,'ordinary route progress flush only refreshes its resume timestamp');
});
