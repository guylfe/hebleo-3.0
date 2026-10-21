// Independent desired-behavior regression: SYNTHETIC DOM/controller evidence only.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {Store} from '../src/store.js';
import {syntheticOccurrencePack} from '../scripts/exercise-bindings-fixture.mjs';
import {createLearnerRenderer} from '../public/preview/learner-renderer.js';
import {mountLessonPreview} from '../public/preview/lesson-preview.js';
import {portionExercises,portionKind} from '../public/ux.js';

for(const field of ['feedback','feedbackDetails'])for(const pinned of [false,true])test('feedback reminder remains open across parent-popover pointer departure: '+field+' pinned='+pinned,async t=>{
 const store=new Store();t.after(()=>store.close());const content=syntheticOccurrencePack(store),e=content.exercises.find(e=>e.type==='cloze');
 const draft=store.stage({baseRevisionId:store.get('active'),expectedDraftToken:null,content}),session=store.previewSession({lessonId:e.lessonId,draftToken:draft.draftToken}),lesson=session.content.lessons.find(l=>l.id===e.lessonId);
 const d=new JSDOM('<dialog open><main></main></dialog>',{pretendToBeVisual:true});t.after(()=>d.window.close());const w=d.window,root=w.document.querySelector('main');
 w.HTMLElement.prototype.getBoundingClientRect=()=>({left:20,top:50,right:240,bottom:100,width:220,height:50});w.HTMLElement.prototype.getClientRects=function(){return [this.getBoundingClientRect()];};
 const ui=mountLessonPreview(root,{lessonId:e.lessonId,draftToken:draft.draftToken,loadSession:x=>store.previewSession(x),evaluate:x=>store.previewEvaluate(x),renderer:createLearnerRenderer()});t.after(()=>ui.dispose());await ui.ready;
 const step=session.steps.find(step=>['check','apply'].includes(portionKind(lesson,step))&&portionExercises(session.content,lesson,step).includes(e.id));ui.go(step,portionExercises(session.content,lesson,step).indexOf(e.id));ui.setAnswer({text:'SYNTHETIC WRONG'});await ui.submit('SYNTHETIC WRONG');
 const icon=root.querySelector('[data-result-explanation]'),popover=root.querySelector('[data-result-popover]'),box=icon.parentElement;
 const pointer=(el,type,relatedTarget)=>{const event=new w.MouseEvent(type,{bubbles:false,relatedTarget});Object.defineProperty(event,'pointerType',{value:'mouse'});el.dispatchEvent(event);};
 pointer(box,'pointerenter');assert.equal(popover.hidden,false);
 const trigger=popover.querySelector('[data-vocabulary-surface="'+field+'"] [data-vocabulary-binding]');assert.ok(trigger);
 const over=new w.MouseEvent('pointerover',{bubbles:true});Object.defineProperty(over,'pointerType',{value:'mouse'});trigger.dispatchEvent(over);
 if(pinned)trigger.click();const card=root.querySelector('.vocabulary-reminder');assert.ok(card,'card initially opens');
 pointer(popover,'pointerleave',card);pointer(box,'pointerleave',card);pointer(card,'pointerenter',popover);card.dispatchEvent(new w.MouseEvent('pointerover',{bubbles:true,relatedTarget:popover}));
 await new Promise(r=>setTimeout(r,280));
 console.log(JSON.stringify({field,pinned,parentHidden:popover.hidden,cardOpen:Boolean(root.querySelector('.vocabulary-reminder')),focus:w.document.activeElement?.outerHTML?.slice(0,90)}));
 assert.equal(root.querySelector('.vocabulary-reminder'),card,'parent result explanation must keep its bound anchor visible while the vocabulary card is in use');
});
