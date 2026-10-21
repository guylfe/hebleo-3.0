// SYNTHETIC real-HTTP learner-controller regression, no rendered/native claim.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {app,settled} from './app-harness.mjs';
import {syntheticOccurrencePack} from '../scripts/exercise-bindings-fixture.mjs';
for(const correct of [false,true])for(const pinned of [false,true])test('learner HTTP feedback card transit correct='+correct+' pinned='+pinned,async t=>{
 let authored;const {w,doc,store}=await app(t,{page:'lesson/lesson-2/apply',realHTTP:true,prepare(s){
  const content=syntheticOccurrencePack(s);authored=content.exercises.find(e=>e.type==='cloze');const staged=s.stage({baseRevisionId:s.get('active'),expectedDraftToken:null,content}),revisionId=s.publish(s.get('active'),staged.draftToken).revisionId;
  const lesson=content.lessons.find(l=>l.id===authored.lessonId);s.saveProgress('learner-demo',{lessonId:authored.lessonId,revisionId,step:'apply',question:lesson.exerciseIds.indexOf(authored.id),answer:'',selectedTokens:[],matching:{},practiceIds:[],resultRequestId:null});
 }});
 const raw=correct?authored.answers[0]:'SYNTHETIC WRONG';doc.querySelector('#answer').value=raw;doc.querySelector('#answer').dispatchEvent(new w.Event('input',{bubbles:true}));doc.querySelector('[data-action=check]').click();await settled(()=>doc.querySelector('[data-authored-vocabulary-answers]'));
 w.matchMedia=query=>({matches:query==='(any-hover: hover)'});
 w.HTMLElement.prototype.getBoundingClientRect=()=>({left:20,top:50,right:240,bottom:100,width:220,height:50});w.HTMLElement.prototype.getClientRects=function(){return [this.getBoundingClientRect()];};
 const pointer=(el,type,relatedTarget,bubbles=false)=>{const event=new w.MouseEvent(type,{bubbles,relatedTarget});Object.defineProperty(event,'pointerType',{value:'mouse'});el.dispatchEvent(event);};
 const icon=doc.querySelector('[data-result-explanation]'),popover=doc.querySelector('[data-result-popover]'),box=icon.parentElement;pointer(box,'pointerenter');assert.equal(popover.hidden,false);
 const trigger=popover.querySelector('[data-vocabulary-surface=feedback] [data-vocabulary-binding]');pointer(trigger,'pointerover',null,true);if(pinned)trigger.click();const card=doc.querySelector('.vocabulary-reminder');assert.ok(card);
 pointer(popover,'pointerleave',card);pointer(box,'pointerleave',card);pointer(card,'pointerover',popover,true);await new Promise(r=>setTimeout(r,280));
 console.log(JSON.stringify({correct,pinned,parentHidden:popover.hidden,cardOpen:Boolean(doc.querySelector('.vocabulary-reminder')),focusTag:doc.activeElement.tagName,rawPreserved:doc.querySelector('#answer').value===raw,gradePreserved:store.learner('learner-demo').attempts.at(-1).correct===correct}));
 assert.equal(doc.querySelector('.vocabulary-reminder'),card,'feedback card must survive parent-popover departure');
});
