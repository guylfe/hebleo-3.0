import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {Store} from '../src/store.js';
import {syntheticOccurrencePack} from '../scripts/exercise-bindings-fixture.mjs';
import {exerciseInput,exerciseSurface,exerciseFeedback,bindResultExplanations} from '../public/learner-view.js';
import {mountAnsweredVocabulary} from '../public/post-answer-vocabulary.js';
import {createLearnerRenderer} from '../public/preview/learner-renderer.js';
import {mountLessonPreview} from '../public/preview/lesson-preview.js';
import {portionExercises,portionKind} from '../public/ux.js';

const dump=s=>JSON.stringify(s.db.prepare("SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name").all().map(({name})=>[name,s.db.prepare('SELECT * FROM "'+name+'" ORDER BY 1').all()]));
function fixture(t){const store=new Store();t.after(()=>store.close());const content=syntheticOccurrencePack(store),staged=store.stage({baseRevisionId:store.get('active'),expectedDraftToken:null,content});return {store,content,token:staged.draftToken};}
function mount(t,content,e,result,draft={text:'SYNTHETIC WRONG',matching:{},selectedTokens:[0]}){
 const d=new JSDOM('<main><p>'+exerciseSurface(e.prompt,'prompt')+'</p><div data-exercise-input>'+exerciseInput(e,{mode:'full',word:id=>content.words.find(w=>w.id===id),result,draft})+'</div>'+exerciseFeedback(e,result)+'</main>',{pretendToBeVisual:true});t.after(()=>d.window.close());
 const scope=d.window.document.querySelector('main');
 d.window.HTMLElement.prototype.getBoundingClientRect=()=>({left:10,top:10,right:120,bottom:50,width:110,height:40});
 d.window.HTMLElement.prototype.getClientRects=function(){return [this.getBoundingClientRect()];};
 const binding=mountAnsweredVocabulary(scope,{content,exercise:e,result,mode:'full',isCurrent:()=>true});t.after(()=>binding?.destroy());
 bindResultExplanations(scope);
 return {scope,w:d.window};
}
function answer(e,c){return e.type==='matching'?Object.fromEntries(e.wordIds.map(id=>[id,c.words.find(w=>w.id===id).english])):e.type==='recognition'?c.words.find(w=>w.id===e.wordId).english:e.answers[0];}

test('all six families decorate exact authored question/context/feedback and answer surfaces after correct and incorrect grading only',t=>{
 const {store,content,token}=fixture(t);
 for(const type of ['recognition','typing','matching','ordering','cloze','transformation']){
  const original=content.exercises.find(e=>e.type===type),session=store.previewSession({lessonId:original.lessonId,draftToken:token}),e=session.content.exercises.find(x=>x.id===original.id);
  assert.equal(mount(t,session.content,e,null).scope.querySelector('[data-vocabulary-word]'),null);
  for(const correct of [true,false]){
   const raw=correct?answer(original,content):type==='matching'?{}:'SYNTHETIC WRONG';
   const result=store.previewEvaluate({lessonId:original.lessonId,draftToken:token,exerciseId:e.id,answer:raw}).result;
   assert.equal(result.correct,correct);const before=dump(store),{scope}=mount(t,session.content,e,result);
   for(const field of ['prompt','context','feedback','feedbackDetails'])assert.ok(scope.querySelector('[data-vocabulary-surface='+field+'] [data-vocabulary-binding]'),type+' '+field);
   assert.equal(scope.querySelector('[data-vocabulary-surface=context]').textContent,e.context,'exact CRLF/Unicode context');
   if(['typing','ordering','cloze','transformation'].includes(type)){
    assert.equal(scope.querySelector('[data-authored-vocabulary-answers] [data-vocabulary-surface]').textContent,original.answers[0]);
    assert.ok(scope.querySelector('[data-authored-vocabulary-answers] [data-vocabulary-binding]'));
   }
   assert.equal(scope.querySelector('button button'),null,'no interactive nesting in locked tokens');
   const trigger=scope.querySelector('[data-vocabulary-binding]');trigger.click();assert.ok(scope.querySelector('.vocabulary-reminder'));scope.querySelector('[data-vocabulary-close]').click();assert.equal(scope.ownerDocument.activeElement,trigger);
   assert.equal(dump(store),before,'viewing cards writes nothing');
   if(scope.querySelector('textarea'))assert.equal(scope.querySelector('textarea').value,'SYNTHETIC WRONG','raw learner field is not relabelled or linked');
   assert.equal(result.answer,raw);
  }
 }
});

test('feedback child layer keeps its owner available through disclosure/card Escape and releases on real focus departure',async t=>{
 const {store,content,token}=fixture(t),original=content.exercises.find(e=>e.type==='cloze'),session=store.previewSession({lessonId:original.lessonId,draftToken:token}),e=session.content.exercises.find(x=>x.id===original.id),result=store.previewEvaluate({lessonId:e.lessonId,draftToken:token,exerciseId:e.id,answer:'WRONG'}).result;
 const before=dump(store),{scope,w}=mount(t,session.content,e,result),popover=scope.querySelector('[data-result-popover]'),box=popover.parentElement;
 box.dispatchEvent(new w.MouseEvent('pointerenter'));const trigger=popover.querySelector('[data-vocabulary-binding]');trigger.click();const card=scope.querySelector('.vocabulary-reminder');
 box.dispatchEvent(new w.MouseEvent('pointerleave',{relatedTarget:card}));await new Promise(r=>setTimeout(r,220));assert.equal(popover.hidden,false);assert.equal(scope.querySelector('.vocabulary-reminder'),card);
 const details=card.querySelector('details');details.open=true;details.querySelector('summary').focus();
 details.querySelector('summary').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));assert.equal(details.open,false);assert.ok(card.isConnected);
 card.querySelector('summary').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));assert.equal(card.isConnected,false);assert.equal(scope.ownerDocument.activeElement,trigger);assert.equal(popover.hidden,false);
 const outside=w.document.createElement('button');outside.textContent='Outside';scope.append(outside);outside.focus();await new Promise(r=>setTimeout(r,220));assert.equal(popover.hidden,true);assert.equal(dump(store),before);
});

test('answer links require current exercise/lesson and valid nonconflicting authored spans; stale public text stays plain',t=>{
 const {store,content,token}=fixture(t),original=content.exercises.find(e=>e.type==='cloze'),session=store.previewSession({lessonId:original.lessonId,draftToken:token}),e=session.content.exercises.find(x=>x.id===original.id);
 const result=store.previewEvaluate({lessonId:original.lessonId,draftToken:token,exerciseId:e.id,answer:'WRONG'}).result;
 for(const mutate of [r=>r.exerciseId='other',r=>r.lessonId='other',r=>r.vocabularyBindings[0].start=1,r=>r.vocabularyBindings.push({...r.vocabularyBindings[0]}),r=>r.vocabularyBindings[0].field='context',r=>r.vocabularyBindings[0].wordId='missing']){
  const bad=structuredClone(result);mutate(bad);assert.equal(mount(t,session.content,e,bad).scope.querySelector('[data-authored-vocabulary-answers]'),null);
 }
 const stale=structuredClone(e);stale.prompt+=' changed';assert.equal(mount(t,session.content,stale,result).scope.querySelector('[data-vocabulary-surface=prompt] button'),null);
 const denied=structuredClone(session.content);delete denied.exerciseVocabulary.byWordId['w-mi'];assert.equal(mount(t,denied,e,result).scope.querySelector('[data-vocabulary-binding]'),null);
});

test('ordering repeated tokens and deduplicated accepted answers keep authored positional identity',t=>{
 const {store,content}=fixture(t),e=content.exercises.find(e=>e.type==='ordering');e.tokens=['מי','מי'];e.answers=['מי מי','מי מי'];e.prefixTokenIndices=[];
 e.vocabularyBindings=['tokens','answers'].flatMap(field=>e[field].map((text,index)=>({id:field+'-'+index,wordId:index?'w-ani':'w-mi',field,index,start:0,end:text.length,text,sourceText:text})));
 const staged=store.stage({baseRevisionId:store.get('active'),expectedDraftToken:store.currentDraft().draftToken,content}),session=store.previewSession({lessonId:e.lessonId,draftToken:staged.draftToken}),pub=session.content.exercises.find(x=>x.id===e.id),result=store.previewEvaluate({lessonId:e.lessonId,draftToken:staged.draftToken,exerciseId:e.id,answer:'WRONG'}).result;
 const {scope}=mount(t,session.content,pub,result,{text:'',matching:{},selectedTokens:pub.vocabularyBindings.filter(b=>b.field==='tokens').map(b=>b.index)});
 for(const field of ['tokens','answers'])for(const i of [0,1]){
  const triggers=[...scope.querySelectorAll('[data-vocabulary-binding="'+field+'-'+i+'"]')];assert.ok(triggers.length);assert.ok(triggers.every(el=>el.dataset.vocabularyWord===(i?'w-ani':'w-mi')));
 }
 assert.equal(scope.querySelector('.assembled-sentence button'),null,'raw submitted composition is not guessed');
});

for(const type of ['ordering','cloze','transformation'])for(const correct of [true,false])test('saved-draft controller exercises '+type+' '+correct+' cards without persistence',async t=>{
 const {store,content,token}=fixture(t),e=content.exercises.find(e=>e.type===type),session=store.previewSession({lessonId:e.lessonId,draftToken:token}),lesson=session.content.lessons.find(l=>l.id===e.lessonId);
 const d=new JSDOM('<main></main>',{pretendToBeVisual:true});t.after(()=>d.window.close());const host=d.window.document.querySelector('main'),before=dump(store);
 const h=mountLessonPreview(host,{lessonId:e.lessonId,draftToken:token,loadSession:input=>store.previewSession(input),evaluate:input=>store.previewEvaluate(input),renderer:createLearnerRenderer()});t.after(()=>h.dispose());await h.ready;
 const step=session.steps.find(step=>['check','apply'].includes(portionKind(lesson,step))&&portionExercises(session.content,lesson,step).includes(e.id));
 const ids=portionExercises(session.content,lesson,step);h.go(step,ids.indexOf(e.id));assert.ok(host.querySelector('[data-vocabulary-surface=prompt]'));
 const raw=correct?e.answers[0]:'SYNTHETIC WRONG';h.setAnswer({text:raw,matching:{},selectedTokens:[]});await h.submit(raw);
 assert.ok(host.querySelector('.feedback'+(correct?':not(.wrong)':'.wrong')));assert.ok(host.querySelector('[data-authored-vocabulary-answers] [data-vocabulary-binding]'));assert.equal(dump(store),before);
});
