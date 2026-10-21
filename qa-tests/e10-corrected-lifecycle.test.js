// Independent corrected-E10 lifecycle evidence. Synthetic, memory-only, stubbed geometry.
import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {Store} from '../src/store.js';
import {syntheticOccurrencePack} from '../scripts/exercise-bindings-fixture.mjs';
import {exerciseFeedback,bindResultExplanations} from '../public/learner-view.js';
import {mountAnsweredVocabulary} from '../public/post-answer-vocabulary.js';

const pause=ms=>new Promise(r=>setTimeout(r,ms));
const dump=s=>JSON.stringify(s.db.prepare("SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name").all().map(({name})=>[name,s.db.prepare('SELECT * FROM "'+name+'" ORDER BY 1').all()]));
const actions=['unpinned pointer departure','outside pointer','outside focus','stale context','hidden anchor','inert anchor','removed anchor','removed panel','destroy'];
for(const field of ['feedback','feedbackDetails'])for(const action of actions)test('QA corrected lifecycle: '+field+' / '+action,async t=>{
 const store=new Store();t.after(()=>store.close());
 const content=syntheticOccurrencePack(store),original=content.exercises.find(e=>e.type==='cloze');
 const draft=store.stage({baseRevisionId:store.get('active'),expectedDraftToken:null,content});
 const session=store.previewSession({lessonId:original.lessonId,draftToken:draft.draftToken}),e=session.content.exercises.find(x=>x.id===original.id);
 const result=store.previewEvaluate({lessonId:e.lessonId,exerciseId:e.id,draftToken:draft.draftToken,answer:'SYNTHETIC WRONG'}).result,before=dump(store);
 const dom=new JSDOM('<button id="outside">Outside</button><main>'+exerciseFeedback(e,result)+'</main>',{pretendToBeVisual:true});t.after(()=>dom.window.close());
 const w=dom.window,doc=w.document,root=doc.querySelector('main'),outside=doc.querySelector('#outside');
 w.HTMLElement.prototype.getBoundingClientRect=()=>({left:20,top:50,right:240,bottom:100,width:220,height:50});
 w.HTMLElement.prototype.getClientRects=function(){return [this.getBoundingClientRect()];};
 let current=true;
 bindResultExplanations(root);
 const h=mountAnsweredVocabulary(root,{content:session.content,exercise:e,result,mode:'full',isCurrent:()=>current});t.after(()=>h.destroy());
 const popover=root.querySelector('[data-result-popover]'),box=popover.parentElement;
 const pointer=(el,type,relatedTarget,bubbles=false)=>{
  const event=new w.MouseEvent(type,{bubbles,relatedTarget});Object.defineProperty(event,'pointerType',{value:'mouse'});el.dispatchEvent(event);
 };
 pointer(box,'pointerenter');
 const trigger=popover.querySelector('[data-vocabulary-surface="'+field+'"] [data-vocabulary-binding]');assert.ok(trigger);
 pointer(trigger,'pointerover',null,true);
 if(action!=='unpinned pointer departure')trigger.click();
 const card=root.querySelector('.vocabulary-reminder');assert.ok(card);assert.equal(card.closest('[role=status]'),null);
 pointer(box,'pointerleave',card);pointer(card,'pointerover',popover,true);
 await pause(230);assert.equal(popover.hidden,false);assert.equal(root.querySelector('.vocabulary-reminder'),card);
 let outsideClicks=0;outside.addEventListener('click',()=>outsideClicks++);
 if(action==='unpinned pointer departure')pointer(card,'pointerout',outside,true);
 if(action==='outside pointer'){
  const event=new w.MouseEvent('pointerdown',{bubbles:true,cancelable:true});outside.dispatchEvent(event);assert.equal(event.defaultPrevented,false);outside.focus();outside.click();assert.equal(outsideClicks,1);
 }
 if(action==='outside focus')outside.focus();
 if(action==='stale context')current=false;
 if(action==='hidden anchor')trigger.hidden=true;
 if(action==='inert anchor')trigger.setAttribute('inert','');
 if(action==='removed anchor')trigger.remove();
 if(action==='removed panel')card.remove();
 if(action==='destroy'){
  h.destroy();assert.equal(doc.activeElement,trigger,'destroy restores exact available trigger');outside.focus();
 }
 await pause(450);
 assert.equal(root.querySelector('.vocabulary-reminder'),null,'closed layer must not resurrect');
 assert.equal(popover.hidden,true,'owner must resume dismissal after child release');
 if(['outside pointer','outside focus','destroy'].includes(action))assert.equal(doc.activeElement,outside,'outside focus is retained');
 if(action==='stale context'){trigger.click();assert.equal(root.querySelector('.vocabulary-reminder'),null);}
 assert.equal(dump(store),before,'all persistent tables unchanged');
});
