import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {JSDOM} from 'jsdom';
import {marked} from 'marked';
import createPurifier from 'dompurify';
import {Store} from '../src/store.js';
import {resolveBlock,importVocabularyCSV} from '../public/content.js';
import * as ux from '../public/ux.js';
import {composeSentence,bindMatching,matchWord} from '../public/interactions.js';
import {richCell,cellCSS,createLessonRenderer} from '../public/rich.js';
import * as learnerView from '../public/learner-view.js';
async function settled(predicate){for(let i=0;i<80;i++){if(predicate())return;await new Promise(r=>setTimeout(r,5));}throw new Error('App condition did not settle.');}
async function app(t,{page='lesson/lesson-2/learn',author=false,prepare,ownerKeyboard=false,store:providedStore}={}){
  const store=providedStore||new Store();prepare?.(store);const d=new JSDOM('<div id="app"></div><div id="toast"></div>',{url:'http://127.0.0.1/#'+page,runScripts:'outside-only',pretendToBeVisual:true}),w=d.window;
  t.after(()=>{w.close();if(!providedStore)store.close();});w.matchMedia=()=>({matches:false});w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
  if(author)w.localStorage.setItem('hebleo-demo-user','author-demo');
  if(ownerKeyboard){w.scrollBy=()=>{};w.eval(readFileSync(new URL('../public/keyboard-owner.js',import.meta.url),'utf8'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));}
  Object.assign(w,ux,learnerView,{structuredClone,resolveBlock,importVocabularyCSV,composeSentence,bindMatching,matchWord,richCell,cellCSS,renderLesson:createLessonRenderer(marked,createPurifier(w),w.document),stopMedia(){},clearRecording(){},feedbackSound(){}});
  w.fetch=async(path,options={})=>{const url=new URL(path,w.location.href),user=options.headers?.['x-demo-user']||'learner-demo',input=options.body?JSON.parse(options.body):null;try{let value;
    if(url.pathname==='/api/bootstrap')value=store.bootstrap(user);
    else if(url.pathname==='/api/questions')value=input?store.askQuestion(user,input):store.questions(user);
    else if(url.pathname==='/api/session')value=store.session(user,url.searchParams.get('lessonId'));
    else if(url.pathname==='/api/session/latest')value=store.startLatestLesson(user,input.lessonId);
    else if(url.pathname==='/api/progress')value=store.saveProgress(user,input);
    else if(url.pathname==='/api/preferences')value=store.updateLearner(user,input);
    else if(url.pathname==='/api/attempt')value=store.attempt(user,input);
    else if(url.pathname==='/api/practice')value=store.practice(user,input);
    else if(url.pathname==='/api/studio'){store.requireAuthor(user);value={...store.active(),preview:store.preview()};}
    else if(url.pathname==='/api/reports')value=store.reports(user);
    else if(url.pathname==='/api/studio/draft'){store.requireAuthor(user);value=store.stage(input);}
    else if(url.pathname==='/api/studio/publish'){store.requireAuthor(user);value=store.publish(input.baseRevisionId,input.draftToken);}
    else if(url.pathname==='/api/help')value={source:'demo-authored',text:store.snapshot(input.revisionId).lessons.find(l=>l.id===input.lessonId).explanation};
    else throw new Error('Unexpected app API '+url.pathname);
    return {ok:true,json:async()=>structuredClone(value)};
  }catch(e){return {ok:false,status:e.status||500,json:async()=>({error:e.message,code:e.code,...e.details})};}};
  w.eval(readFileSync(new URL('../public/app.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,''));
  await settled(()=>w.document.querySelector('h1'));return {store,w,doc:w.document};
}
const click=(doc,action)=>{const el=doc.querySelector('[data-action="'+action+'"]');assert.ok(el,action);el.click();};

test('Lesson 1 can advance past optional practice with an unresolved Check answer, preserving actual completion and graded history',async t=>{
  const {store,w,doc}=await app(t,{page:'lesson/lesson-1/complete',prepare(s){
    s.attempt('learner-demo',{requestId:randomUUID(),revisionId:1,exerciseId:'ex-1-recognize',answer:'incorrect'});
    s.attempt('learner-demo',{requestId:randomUUID(),revisionId:1,exerciseId:'ex-1-type',answer:'אני'});
    const e=s.snapshot().exercises.find(e=>e.id==='ex-1-match');
    s.attempt('learner-demo',{requestId:randomUUID(),revisionId:1,exerciseId:e.id,answer:Object.fromEntries(e.wordIds.map(id=>[id,s.snapshot().words.find(w=>w.id===id).english]))});
  }});
  assert.equal(store.learner('learner-demo').completed.includes('lesson-1'),false);
  const attempts=store.learner('learner-demo').attempts;
  const next=doc.querySelector('#practice [data-action="lesson"]');assert.ok(next);assert.equal(next.dataset.value,'lesson-2');assert.equal(next.textContent,'Next lesson →');
  assert.equal(doc.querySelectorAll('#practice [data-action="target-practice"]').length,1);
  next.click();await settled(()=>w.location.hash==='#lesson/lesson-2/learn');
  assert.deepEqual(store.learner('learner-demo').attempts,attempts);assert.equal(store.learner('learner-demo').completed.includes('lesson-1'),false);
  assert.equal(store.learner('learner-demo').resumes['lesson-1'].step,'complete');
});

test('Extra practice can be skipped before submission and after grading, clearing its resume without erasing attempts',async t=>{
  const {store,w,doc}=await app(t,{page:'lesson/lesson-1/complete'});
  click(doc,'target-practice');await settled(()=>doc.querySelector('#practice .exercise-footer'));
  const skip=()=>[...doc.querySelectorAll('#practice [data-action="step"]')].find(el=>el.textContent==='Skip extra practice');
  assert.ok(skip());assert.ok(store.learner('learner-demo').resumes['lesson-1'].practiceIds.length);
  skip().click();await settled(()=>w.location.hash==='#lesson/lesson-1/complete'&&doc.querySelector('#practice [data-action="target-practice"]')&&store.learner('learner-demo').resumes['lesson-1'].practiceIds.length===0);
  assert.deepEqual(store.learner('learner-demo').resumes['lesson-1'].practiceIds,[]);assert.equal(store.learner('learner-demo').attempts.length,0);
  click(doc,'target-practice');await settled(()=>doc.querySelector('#practice .choices'));
  doc.querySelector('#practice [data-action="choice"]').click();await settled(()=>doc.querySelector('#practice [data-action="check"]'));
  click(doc,'check');await settled(()=>doc.querySelector('#practice .feedback'));
  const attempts=store.learner('learner-demo').attempts;assert.equal(attempts.length,1);
  skip().click();await settled(()=>w.location.hash==='#lesson/lesson-1/complete'&&doc.querySelector('#practice [data-action="target-practice"]')&&store.learner('learner-demo').resumes['lesson-1'].practiceIds.length===0);
  assert.deepEqual(store.learner('learner-demo').attempts,attempts);assert.deepEqual(store.learner('learner-demo').resumes['lesson-1'].practiceIds,[]);
});

test('The final lesson offers a course exit when incomplete, and core exercises do not show the extra-practice skip',async t=>{
  const {doc,w}=await app(t,{page:'lesson/lesson-3/complete'});
  const exit=doc.querySelector('#practice [data-action="page"]');assert.ok(exit);assert.equal(exit.textContent,'Return to course →');assert.equal(exit.dataset.value,'course');
  exit.click();await settled(()=>w.location.hash==='#course');
  const lesson1=doc.querySelector('[data-action="lesson"][data-value="lesson-1"]');lesson1.click();await settled(()=>w.location.hash==='#lesson/lesson-1/learn');
  doc.querySelector('[data-action="step"][data-value="apply"]').click();await settled(()=>doc.querySelector('#practice .exercise-footer'));
  assert.ok(!doc.querySelector('#practice .exercise-footer').textContent.includes('Skip extra practice'));
});

test('Wrong-answer retry keeps the particular question, only correct answers fill progress, and saved progress survives reload',async t=>{
  const {store,w,doc}=await app(t,{page:'lesson/lesson-1/apply',prepare(s){s.attempt('learner-demo',{requestId:randomUUID(),revisionId:1,exerciseId:'ex-1-recognize',answer:'who'});}});
  const bar=()=>doc.querySelector('#lesson-question-progress');assert.equal(bar().value,1);assert.equal(bar().max,3);
  const input=doc.querySelector('#answer');input.value='היא';input.dispatchEvent(new w.Event('input',{bubbles:true}));click(doc,'check');await settled(()=>doc.querySelector('.feedback.wrong'));
  assert.equal(bar().value,1);click(doc,'retry-question');await settled(()=>doc.querySelector('#answer')&&!doc.querySelector('.feedback'));
  assert.equal(store.learner('learner-demo').resumes['lesson-1'].question,0);assert.deepEqual(store.learner('learner-demo').resumes['lesson-1'].practiceIds,[]);
  const answer=doc.querySelector('#answer');assert.equal(answer.disabled,false);answer.value='אני';answer.dispatchEvent(new w.Event('input',{bubbles:true}));click(doc,'check');await settled(()=>doc.querySelector('.feedback:not(.wrong)'));
  assert.equal(bar().value,2);assert.equal(store.learner('learner-demo').attempts.length,3);assert.equal(doc.querySelector('[data-action="retry-question"]'),null);
  click(doc,'next-question');await settled(()=>doc.querySelector('.matching-game'));assert.equal(bar().value,2);
  const resumed=await app(t,{page:'lesson/lesson-1/apply',store});assert.equal(resumed.doc.querySelector('#lesson-question-progress').value,2);assert.ok(resumed.doc.querySelector('.matching-game'));
});

test('Finish-screen retry opens only the chosen missed question, then removes the corrected miss without changing other answers',async t=>{
  const {store,w,doc}=await app(t,{page:'lesson/lesson-1/complete',prepare(s){
    for(const [exerciseId,answer] of [['ex-1-recognize','incorrect'],['ex-1-type','היא']])s.attempt('learner-demo',{requestId:randomUUID(),revisionId:1,exerciseId,answer});
    const e=s.snapshot().exercises.find(e=>e.id==='ex-1-match');s.attempt('learner-demo',{requestId:randomUUID(),revisionId:1,exerciseId:e.id,answer:Object.fromEntries(e.wordIds.map(id=>[id,s.snapshot().words.find(w=>w.id===id).english]))});
  }});
  const history=store.learner('learner-demo').attempts;assert.equal(doc.querySelectorAll('.retry-list button').length,2);assert.equal(doc.querySelector('#lesson-question-progress').value,1);
  doc.querySelector('[data-action="retry-question"][data-value="ex-1-type"]').click();await settled(()=>doc.querySelector('#answer'));
  assert.deepEqual(store.learner('learner-demo').resumes['lesson-1'].practiceIds,['ex-1-type']);assert.equal(doc.querySelector('.mode-bar .tag').textContent,'Question 1 of 1');
  const input=doc.querySelector('#answer');input.value='אני';input.dispatchEvent(new w.Event('input',{bubbles:true}));click(doc,'check');await settled(()=>doc.querySelector('.feedback:not(.wrong)'));
  assert.equal(doc.querySelector('#lesson-question-progress').value,2);click(doc,'next-question');await settled(()=>doc.querySelector('.retry-list'));
  assert.equal(doc.querySelector('[data-action="retry-question"][data-value="ex-1-type"]'),null);assert.equal(doc.querySelectorAll('.retry-list button').length,1);
  assert.deepEqual(store.learner('learner-demo').attempts.slice(0,history.length),history);assert.equal(store.learner('learner-demo').completed.includes('lesson-1'),false);
});

test('Starting updated lesson through the actual app does not flush the old resume back over the reset',async t=>{
  const {store,doc}=await app(t,{prepare(s){s.saveProgress('learner-demo',{lessonId:'lesson-2',revisionId:1,step:'learn',question:0,answer:'old',selectedTokens:[],matching:{},practiceIds:[],resultRequestId:null});s.stage({baseRevisionId:1,expectedDraftToken:null,word:{id:'w-mi',notes:'Updated'}});s.publish(1,s.currentDraft().draftToken);}});
  click(doc,'latest-lesson');await settled(()=>store.learner('learner-demo').resumes['lesson-2']?.revisionId===2);
  assert.equal(store.learner('learner-demo').resumes['lesson-2'].answer,'');assert.equal(doc.querySelector('[data-action="latest-lesson"]'),null);
});
test('App sentence tiles submit attached prefixes, and source-rich cards/table open without field rendering errors',async t=>{
  const {store,doc}=await app(t,{page:'lesson/lesson-2/apply'});
  for(const text of ['אני','ב','בית']){const el=Array.from(doc.querySelectorAll('[data-action="token"]')).find(el=>el.childNodes[0].textContent===text);assert.ok(el);el.click();await settled(()=>!el.isConnected);}
  assert.equal(doc.querySelector('.assembled-sentence').textContent,'אני בבית');assert.equal(doc.querySelector('.prefix-token'),null);assert.equal(doc.querySelector('[data-action="token"] small'),null);const groups=[...doc.querySelectorAll('.sentence-tile-group')];assert.deepEqual(groups.map(g=>g.textContent),['אני','בבית']);assert.equal(groups[1].querySelectorAll('button').length,2);click(doc,'check');await settled(()=>doc.querySelector('.feedback'));assert.equal(store.learner('learner-demo').attempts[0].correct,true);
  doc.querySelector('[data-action="step"][data-value="vocabulary"]').click();await settled(()=>doc.querySelector('.word-grid'));assert.equal(doc.querySelectorAll('.word-card').length,6);assert.ok(doc.querySelector('.word-details dd'));
});
test('Studio edits author card policy and lesson highlights through the app draft/publication workflow',async t=>{
  const {store,w,doc}=await app(t,{page:'studio',author:true});await settled(()=>doc.querySelector('#review-policy-form'));
  const form=doc.querySelector('#review-policy-form');form.querySelector('select').value='none';form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await settled(()=>store.get('draft')?.content.reviewPolicy.defaultNikkud==='none');await settled(()=>doc.querySelector('[data-action="publish"]'));
  click(doc,'publish');await settled(()=>store.snapshot().reviewPolicy.defaultNikkud==='none');
  await settled(()=>doc.body.textContent.includes('PUBLISHED VERSION 2'));
  const lessonForm=doc.querySelector('#lesson-form');lessonForm.elements.knownKeys.value='א';lessonForm.elements.newKeys.value='ב';lessonForm.elements.newColor.value='#abcdef';lessonForm.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await settled(()=>store.get('draft')?.content.lessons[0].keyboard.newKeys==='ב');
  assert.equal(doc.querySelector('#known-color'),null);
  assert.equal(store.get('draft').content.lessons[0].keyboard.newColor,'#abcdef');
});

test('Actual app launcher focuses the native answer field and saves pinning through the learner preference API',async t=>{
  const {store,w,doc}=await app(t,{page:'lesson/lesson-1/apply',ownerKeyboard:true});
  click(doc,'keyboard-open');const answer=doc.querySelector('#answer');
  await settled(()=>doc.activeElement===answer);assert.equal(answer.readOnly,false);
  doc.querySelector('[data-insert="א"]').click();assert.equal(answer.value,'א');
  doc.querySelector('[data-action="pin"]').click();await settled(()=>store.learner('learner-demo').preferences.keyboardPinned);
  doc.querySelector('h1').dispatchEvent(new w.Event('pointerdown',{bubbles:true}));
  assert.ok(doc.querySelector('.hebleo-keyboard--open'));
  doc.querySelector('[data-action="pin"]').click();await settled(()=>!store.learner('learner-demo').preferences.keyboardPinned);
  doc.querySelector('h1').dispatchEvent(new w.Event('pointerdown',{bubbles:true}));assert.equal(doc.querySelector('.hebleo-keyboard--open'),null);
});
test('Lesson help exposes an actual question form and saves it to the author inbox',async t=>{
  const {store,w,doc}=await app(t);click(doc,'help');await settled(()=>doc.querySelector('#author-question-form'));
  const form=doc.querySelector('#author-question-form');form.elements.question.value='Why is this prefix used?';form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await settled(()=>store.questions('author-demo').length===1);assert.equal(store.questions('author-demo')[0].lessonId,'lesson-2');
});
