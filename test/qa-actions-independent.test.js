// Independent QA regression source: review 3aae14c8-d2cf-4ae1-bef6-86c2c159cb74. Imports adapted to repository; fixed-delay wait replaced with bounded state wait.
import {renderLexicalVocabulary,bindLexicalVocabulary} from '../public/lexical-vocabulary.js';
import {mountAnsweredVocabulary} from '../public/post-answer-vocabulary.js';
import {sourceBrowseFixture} from '../scripts/source-browse-fixture.mjs';
import {publishIllustrativeLinks} from '../scripts/link-illustrative-exercises.mjs';
import {lexicalFixture} from '../scripts/lexical-fixture.mjs';
import {mountMediaLibrary} from '../public/studio/media-library.js';
import {mountSourceAuthoring} from '../public/studio/sources-editor.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {JSDOM} from '../node_modules/jsdom/lib/api.js';
import {marked} from '../node_modules/marked/lib/marked.esm.js';
import createPurifier from '../node_modules/dompurify/dist/purify.es.mjs';
import {Store} from '../src/store.js';
import {syntheticOccurrencePack} from '../scripts/exercise-bindings-fixture.mjs';
import {createServer} from '../src/server.js';
import {resolveBlock,importVocabularyCSV} from '../public/content.js';
import * as ux from '../public/ux.js';
import * as reviewScheduler from '../public/review-schedule.js';
import * as courseHelpers from '../public/course.js';
import {composeSentence,bindMatching,matchWord} from '../public/interactions.js';
import {richCell,cellCSS,createLessonRenderer} from '../public/rich.js';
import * as learnerView from '../public/learner-view.js';
import {mountUnifiedStudio} from '../public/studio/unified-studio.js';
import {mountImportWorkflow} from '../public/studio/import-workflow.js';
import {mountLessonEditor} from '../public/studio/lesson-editor.js';
import {mountExerciseEditor} from '../public/studio/exercise-editor.js';
import {inspectImport,renderImportReview} from '../public/studio/import-review.js';
import {pathToFileURL} from 'node:url';
const {mountLessonPreview} = await import(process.env.HEBLEO_PREVIEW_CONTROLLER ? pathToFileURL(process.env.HEBLEO_PREVIEW_CONTROLLER) : '../public/preview/lesson-preview.js');
import {createLearnerRenderer} from '../public/preview/learner-renderer.js';
async function settled(predicate){const deadline=Date.now()+5000;while(Date.now()<deadline){if(predicate())return;await new Promise(r=>setTimeout(r,5));}throw new Error('App condition did not settle within 5 seconds.');}
async function app(t,{page='lesson/lesson-2/learn',author=false,prepare,ownerKeyboard=false,store:providedStore,realHTTP=false,width=1024,navigationPrefs,markdownDependencies,reduceMotion=false}={}){
  const store=providedStore||new Store();prepare?.(store);const d=new JSDOM('<div id="app"></div><div id="toast"></div>',{url:'http://127.0.0.1/#'+page,runScripts:'outside-only',pretendToBeVisual:true}),w=d.window;
  Object.defineProperty(w,'innerWidth',{value:width,writable:true});let server,origin;
  if(realHTTP){server=createServer(store);await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;}
  t.after(async()=>{w.close();if(server)await new Promise(r=>server.close(r));if(!providedStore)store.close();});w.matchMedia=()=>({matches:reduceMotion});w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
  if(author)w.localStorage.setItem('hebleo-demo-user','author-demo');
  if(navigationPrefs)w.localStorage.setItem('hebleo-navigation-'+(author?'author-demo':'learner-demo'),JSON.stringify(navigationPrefs));
  if(ownerKeyboard){w.scrollBy=()=>{};w.eval(readFileSync(process.env.HEBLEO_KEYBOARD_SOURCE || new URL('../public/keyboard-owner.js',import.meta.url),'utf8'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));}
  Object.assign(w,{mountAnsweredVocabulary,renderLexicalVocabulary,bindLexicalVocabulary},ux,reviewScheduler,courseHelpers,learnerView,{structuredClone,resolveBlock,importVocabularyCSV,composeSentence,bindMatching,matchWord,richCell,cellCSS,renderLesson:createLessonRenderer(marked,createPurifier(w),w.document),mountMediaLibrary,mountSourceAuthoring,mountUnifiedStudio,mountImportWorkflow,mountLessonEditor,mountExerciseEditor,inspectImport,renderImportReview,mountLessonPreview,createLearnerRenderer,getPlaybackState:()=>w.referenceState||{},playAudio:async()=>{},setPlaybackSpeed(){},stopMedia(){},clearRecording(){},feedbackSound(){}});
  if(markdownDependencies)w.mountUnifiedStudio=(host,options)=>mountUnifiedStudio(host,{...options,markdownDependencies:markdownDependencies(w)});
  const calls=[];
  w.fetch=async(path,options={})=>{const url=new URL(path,w.location.href),user=options.headers?.['x-demo-user']||'learner-demo',input=options.body?JSON.parse(options.body):null;calls.push(url.pathname);try{let value;
    if(realHTTP)return await fetch(origin+url.pathname+url.search,options);
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
    else if(url.pathname==='/api/studio/impact'){store.requireAuthor(user);value=store.workspaceImpact(input);}
    else if(url.pathname==='/api/studio/dependencies'){store.requireAuthor(user);value=store.exerciseDependencies(input);}
    else if(url.pathname==='/api/studio/draft'){store.requireAuthor(user);value=store.stage(input);}
    else if(url.pathname==='/api/studio/publish'){store.requireAuthor(user);value=store.publish(input.baseRevisionId,input.draftToken);}
    else if(url.pathname==='/api/studio/rollback'){store.requireAuthor(user);value=store.rollback(input.revisionId,input.baseRevisionId,input.expectedDraftToken);}
    else if(url.pathname==='/api/studio/preview/session'){store.requireAuthor(user);value=store.previewSession(input);}
    else if(url.pathname==='/api/studio/preview/evaluate'){store.requireAuthor(user);value=store.previewEvaluate(input);}
    else if(url.pathname==='/api/help')value={source:'demo-authored',text:store.snapshot(input.revisionId).lessons.find(l=>l.id===input.lessonId).explanation};
    else throw new Error('Unexpected app API '+url.pathname);
    return {ok:true,json:async()=>structuredClone(value)};
  }catch(e){return {ok:false,status:e.status||500,json:async()=>({error:e.message,code:e.code,...e.details})};}};
  w.eval(readFileSync(process.env.HEBLEO_APP_SOURCE || new URL('../public/app.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,''));
  await settled(()=>w.document.querySelector('h1'));return {store,w,doc:w.document,calls};
}
const click=(doc,action)=>{const el=doc.querySelector('[data-action="'+action+'"]');assert.ok(el,action);el.click();};

const pause=ms=>new Promise(r=>setTimeout(r,ms));
const typeAnswer=(w,el,text)=>{el.value=text;el.dispatchEvent(new w.Event('input',{bubbles:true}));};

test('QA-ACTIONS-04 real keyboard Pin during pending grade must not strand Checking',async t=>{
 const {w,doc,store}=await app(t,{page:'lesson/lesson-1/apply',realHTTP:true,ownerKeyboard:true,prepare:s=>s.updateLearner('learner-demo',{keyboardPinned:true})});
 typeAnswer(w,doc.querySelector('#answer'),'אני');click(doc,'keyboard-open');
 const transport=w.fetch;let release;w.fetch=async(url,options)=>{if(url==='/api/attempt')await new Promise(r=>release=r);return transport(url,options);};
 const scope=doc.querySelector('#practice');click(doc,'check');await settled(()=>release);
 const pin=doc.querySelector('[data-action=pin]');assert.ok(pin,'real mounted keyboard pin');pin.click();await pause(100);
 release();await settled(()=>doc.querySelector('[data-action=next-question]'));
 assert.equal(store.learner('learner-demo').attempts.length,1);
 assert.equal(doc.querySelector('#practice'),scope,'keyboard preference must preserve pending question owner');
 assert.ok(doc.querySelector('.compact-result'),'committed grade must render');
 assert.ok(doc.querySelector('[data-action=next-question]'),'pending dock must settle');
});

test('QA-ACTIONS-01 immediate choice remains locked after an uncertain HTTP response',async t=>{
 const {w,doc,store}=await app(t,{page:'lesson/lesson-1/check',realHTTP:true,prepare:s=>s.updateLearner('learner-demo',{immediateAnswers:true})});
 const transport=w.fetch,requests=[];let lose=true;w.fetch=async(url,options)=>{const r=await transport(url,options);if(url==='/api/attempt'){requests.push(JSON.parse(options.body));if(lose){lose=false;throw new Error('SYNTHETIC lost response after commit');}}return r;};
 const selected=doc.querySelector('[data-action=choice]');selected.click();await settled(()=>doc.querySelector('[data-action=recover-attempt]'));await pause(15);
 assert.equal(store.learner('learner-demo').attempts.length,1);
 const locked=[...doc.querySelectorAll('[data-action=choice]')].every(el=>el.disabled);
 console.log(JSON.stringify({scenario:'QA-ACTIONS-01',choiceDisabled:[...doc.querySelectorAll('[data-action=choice]')].map(el=>el.disabled),recordedAttempts:store.learner('learner-demo').attempts.length}));
 selected.click();await pause(20);assert.equal(requests.length,1,'guard must prevent duplicate grade despite the enabled control');
 click(doc,'recover-attempt');await settled(()=>doc.querySelector('[data-action=next-question]'));assert.equal(store.learner('learner-demo').attempts.length,1);assert.deepEqual(requests[0],requests[1]);
 assert.ok(locked,'all choices must remain disabled while the submitted receipt is uncertain');
});

test('QA-ACTIONS-02 repeated lost HTTP responses preserve one frozen request through controlled departures',async t=>{
 const {w,doc,store}=await app(t,{page:'lesson/lesson-1/apply',realHTTP:true});const field=doc.querySelector('#answer'),scope=doc.querySelector('#practice');typeAnswer(w,field,'אני');
 const transport=w.fetch,requests=[];let lost=2;
 w.fetch=async(url,options)=>{const r=await transport(url,options);if(url==='/api/attempt'){requests.push(JSON.parse(options.body));if(lost-->0)throw new Error('SYNTHETIC committed response lost');}return r;};
 click(doc,'check');await settled(()=>doc.querySelector('[data-action=recover-attempt]'));await pause(10);
 doc.querySelector('[data-action=page][data-value=library]').click();const profile=doc.querySelector('#demo-user');profile.value='learner-core';profile.dispatchEvent(new w.Event('change',{bubbles:true}));
 w.history.pushState({},'','#library');w.dispatchEvent(new w.PopStateEvent('popstate'));await pause(30);
 assert.equal(doc.querySelector('#practice'),scope);assert.equal(profile.value,'learner-demo');assert.equal(w.location.hash,'#lesson/lesson-1/apply');assert.equal(field.disabled,true);
 click(doc,'recover-attempt');await pause(20);await settled(()=>doc.querySelector('[data-action=recover-attempt]'));click(doc,'recover-attempt');await settled(()=>doc.querySelector('[data-action=next-question]'));
 assert.equal(requests.length,3);for(const request of requests)assert.deepEqual(request,requests[0]);assert.equal(store.learner('learner-demo').attempts.length,1);assert.equal(doc.querySelector('#answer'),field);assert.equal(field.value,'אני');assert.equal(doc.querySelector('[data-action=check]'),null);
});

for(const family of ['recognition','typing','ordering','matching','cloze','transformation'])test('QA-ACTIONS-03 '+family+' restored and in-place results share primary action and read-only answer',async t=>{
 let exercise,answer,lesson,step,question;
 const {w,doc,store}=await app(t,{page:'lesson/lesson-1/apply',realHTTP:true,prepare:s=>{
  const c=s.snapshot();exercise=c.exercises.find(e=>e.type===family);lesson=c.lessons.find(l=>l.id===exercise.lessonId);step=(lesson.checkExerciseIds||[]).includes(exercise.id)?'check':'apply';question=(step==='check'?lesson.checkExerciseIds:lesson.exerciseIds.filter(id=>!(lesson.checkExerciseIds||[]).includes(id))).indexOf(exercise.id);
  answer=family==='recognition'?c.words.find(w=>w.id===exercise.wordId).english:family==='matching'?Object.fromEntries(exercise.wordIds.map(id=>[id,c.words.find(w=>w.id===id).english])):family==='typing'?c.words.find(w=>w.id===exercise.wordId).pointed:exercise.answers[0];
  s.saveProgress('learner-demo',{lessonId:lesson.id,revisionId:1,step,question,answer:'',selectedTokens:[],matching:{}});
 }});
 // Open the prepared lesson through the real route; the initial route can name another lesson.
 if(lesson.id!=='lesson-1'||step!=='apply'){w.history.pushState({},'','#lesson/'+lesson.id+'/'+step);w.dispatchEvent(new w.PopStateEvent('popstate'));await settled(()=>doc.querySelector('.exercise-prompt')?.textContent===exercise.prompt);}
 exercise=store.session('learner-demo',lesson.id).content.exercises.find(e=>e.id===exercise.id);
 const scope=doc.querySelector('#practice');
 if(family==='recognition')doc.querySelector('[data-action=choice][data-value="'+answer+'"]').click();
 else if(family==='matching'){for(const [id,meaning] of Object.entries(answer)){doc.querySelector('[data-match-word="'+id+'"]').click();doc.querySelector('[data-match-target="'+meaning+'"]').click();}}
 else if(family==='ordering'){const arrange=p=>{if(composeSentence(exercise.tokens,p,exercise.prefixTokenIndices)===answer)return p;if(p.length===exercise.tokens.length)return null;for(let i=0;i<exercise.tokens.length;i++)if(!p.includes(i)){const v=arrange([...p,i]);if(v)return v;}return null;};for(const index of arrange([])){doc.querySelector('[data-action=token][data-value="'+index+'"]').click();}}
 else typeAnswer(w,doc.querySelector('#answer'),answer);
 await pause(30);click(doc,'check');await settled(()=>doc.querySelector('[data-action=next-question]'));
 assert.equal(doc.querySelector('[data-action=check]'),null);assert.equal(doc.querySelectorAll('[data-exercise-dock]').length,1);assert.ok([...doc.querySelectorAll('[data-exercise-input] button:not([data-vocabulary-word]),[data-exercise-input] input')].every(el=>el.disabled));
 assert.equal(store.learner('learner-demo').attempts.at(-1).correct,true);
 const restored=await app(t,{page:'#unused'.slice(1),store,realHTTP:true});restored.w.history.pushState({},'','#lesson/'+lesson.id+'/'+step);restored.w.dispatchEvent(new restored.w.PopStateEvent('popstate'));await settled(()=>restored.doc.querySelector('.compact-result'));
 assert.equal(restored.doc.querySelector('[data-action=check]'),null);assert.ok(restored.doc.querySelector('[data-action=next-question]'));assert.equal(store.learner('learner-demo').attempts.length,1);
});






