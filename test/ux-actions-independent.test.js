import {mountReviewKeys} from '../public/review-shortcuts.js';
import {createReviewSave} from '../public/review-save.js';
import {mountSharedReview} from '../public/shared-cards.js';
import {courseRailEdge,updateCourseToggle} from '../public/sidebar-toggle.js';
// Independent UX regression source: review 2a67a825-81a7-4356-bc08-3502f8ab4532; original first seven probes retained.
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
import {JSDOM} from 'jsdom';
import {marked} from 'marked';
import createPurifier from 'dompurify';
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
import {mountTextImport} from '../public/studio/text-import.js';
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
  Object.assign(w,{courseRailEdge,updateCourseToggle,mountAnsweredVocabulary,renderLexicalVocabulary,bindLexicalVocabulary},ux,reviewScheduler,courseHelpers,learnerView,{structuredClone,resolveBlock,importVocabularyCSV,composeSentence,bindMatching,matchWord,richCell,cellCSS,renderLesson:createLessonRenderer(marked,createPurifier(w),w.document),mountMediaLibrary,mountSourceAuthoring,mountUnifiedStudio,mountTextImport,mountImportWorkflow,mountLessonEditor,mountExerciseEditor,inspectImport,renderImportReview,mountLessonPreview,createLearnerRenderer,getPlaybackState:()=>w.referenceState||{},playAudio:async()=>{},setPlaybackSpeed(){},stopMedia(){},clearRecording(){},feedbackSound(){}});
  if(markdownDependencies)w.mountUnifiedStudio=(host,options)=>mountUnifiedStudio(host,{...options,markdownDependencies:markdownDependencies(w)});
  const calls=[];
  w.fetch=async(path,options={})=>{const url=new URL(path,w.location.href),user=options.headers?.['x-demo-user']||'learner-demo',input=options.body?JSON.parse(typeof options.body==='string'?options.body:new TextDecoder().decode(options.body)):null;calls.push(url.pathname);try{let value;
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
  Object.assign(w,{mountReviewKeys,createReviewSave,mountSharedReview});w.eval(readFileSync(process.env.HEBLEO_APP_SOURCE || new URL('../public/app.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,''));
  await settled(()=>w.document.querySelector('h1'));return {store,w,doc:w.document,calls};
}
const click=(doc,action)=>{const el=doc.querySelector('[data-action="'+action+'"]');assert.ok(el,action);el.click();};

// Independent UX probes: actual candidate source; synthetic failure injection only.
function typeReview(w,field,text){field.value=text;field.dispatchEvent(new w.Event('input',{bubbles:true}));}
const waitReview=ms=>new Promise(resolve=>setTimeout(resolve,ms));
test('UX-ACT-01 Concept retains exact answer node selection and authored content gates',async t=>{
 const {w,doc,store,calls}=await app(t,{page:'lesson/lesson-1/apply',realHTTP:true});
 const answer=doc.querySelector('#answer');typeReview(w,answer,'SYNTHETIC composed answer');answer.focus();answer.setSelectionRange(3,9,'backward');
 await waitReview(450);const count=calls.length;
 click(doc,'concept');assert.equal(doc.querySelector('#answer'),answer);assert.equal(answer.selectionStart,3);assert.equal(answer.selectionEnd,9);assert.equal(answer.selectionDirection,'backward');
 assert.equal(doc.querySelector('[data-action=concept]').getAttribute('aria-expanded'),'true');assert.equal(doc.querySelector('[data-authored-vocabulary-answers]'),null);assert.equal(doc.querySelector('.feedback'),null);
 await settled(()=>!doc.querySelector('[data-action=concept]').disabled);click(doc,'inline-concept-close');assert.equal(doc.activeElement,doc.querySelector('[data-action=concept]'));answer.focus();assert.equal(answer.selectionStart,3);assert.equal(answer.selectionEnd,9);assert.equal(calls.length,count);assert.equal(store.learner('learner-demo').attempts.length,0);
});
test('UX-ACT-02 pending duplicate/departure guards and known-grade save state preserve nodes',async t=>{
 const {w,doc,store}=await app(t,{page:'lesson/lesson-1/apply',realHTTP:true});const answer=doc.querySelector('#answer'),scope=doc.querySelector('#practice');typeReview(w,answer,'אני');await waitReview(450);
 const original=w.fetch;let releaseAttempt,releaseSave,attempts=0;
 t.after(()=>{releaseAttempt?.();releaseSave?.();});
 w.fetch=async(url,options)=>{if(url==='/api/attempt'){attempts++;await new Promise(r=>releaseAttempt=r);}if(url==='/api/progress')await new Promise(r=>releaseSave=r);return original(url,options);};
 click(doc,'check');await settled(()=>releaseAttempt);assert.match(doc.querySelector('[data-primary-action]').textContent,/Checking/);assert.equal(answer.disabled,true);
 click(doc,'pending-answer');doc.querySelector('[data-action=step][data-value=learn]').click();assert.equal(doc.querySelector('#practice'),scope);assert.equal(attempts,1);
 releaseAttempt();await settled(()=>releaseSave);assert.equal(doc.querySelector('#answer'),answer);assert.ok(doc.querySelector('.feedback'));assert.equal(doc.querySelector('[data-action=check]'),null);assert.equal(doc.querySelector('[data-action=next-question]'),null);assert.match(doc.querySelector('[data-primary-action]').textContent,/Saving position/);assert.equal(doc.activeElement,doc.querySelector('[data-answer-commit]'));
 releaseSave();await settled(()=>doc.querySelector('[data-action=next-question]'));assert.equal(store.learner('learner-demo').attempts.length,1);
});
test('UX-ACT-03 dock lifecycle suspends modal/drawer and releases listeners/reserve',async t=>{
 const {mountExerciseDock}=learnerView;const d=new JSDOM('<main><button>Answer</button><nav data-exercise-dock><button>Check</button></nav></main>',{pretendToBeVisual:true});t.after(()=>d.window.close());const doc=d.window.document,host=doc.querySelector('main'),dock=doc.querySelector('nav');
 host.getBoundingClientRect=()=>({left:300,right:1060,top:180,bottom:1200,width:760,height:1020});dock.getBoundingClientRect=()=>({left:300,right:1060,top:700,bottom:768,width:760,height:68});
 const owner=mountExerciseDock(host);assert.equal(dock.style.width,'716px');assert.equal(host.style.getPropertyValue('--exercise-dock-reserve'),'84px');
 const modal=doc.createElement('dialog');modal.open=true;doc.body.append(modal);owner.refresh();assert.equal(dock.hidden,true);assert.equal(dock.inert,true);modal.remove();owner.refresh();assert.equal(dock.hidden,false);
 const shell=doc.createElement('aside');shell.className='nav-shell';shell.dataset.courseOverlay='true';doc.body.append(shell);owner.refresh();assert.equal(dock.hidden,true);shell.remove();owner.refresh();assert.equal(dock.hidden,false);
 owner.destroy();assert.equal(host.style.getPropertyValue('--exercise-dock-reserve'),'');assert.equal(host.hasAttribute('data-exercise-dock-host'),false);
});
function previewReview(t,store,token,lessonId,evaluate){
 const d=new JSDOM('<main></main>',{pretendToBeVisual:true}),w=d.window,container=w.document.querySelector('main');t.after(()=>w.close());
 const preview=mountLessonPreview(container,{lessonId,draftToken:token,renderer:createLearnerRenderer(),loadSession:async input=>store.previewSession(input),evaluate:async input=>evaluate?evaluate(input):store.previewEvaluate(input)});t.after(()=>preview.dispose());return {w,doc:w.document,container,preview,root:()=>container.querySelector('[data-preview-root]')};
}
function stageReview(t){const store=new Store();t.after(()=>store.close());const draft=structuredClone(store.snapshot()),token=store.stage({baseRevisionId:store.get('active'),expectedDraftToken:null,content:draft}).draftToken;return {store,draft,token};}
test('UX-ACT-04 Preview matching in-place grade retains per-pair correct/incorrect feedback',async t=>{
 const {store,draft,token}=stageReview(t),source=draft.exercises.find(e=>e.type==='matching'),lesson=draft.lessons.find(l=>l.exerciseIds.includes(source.id));
 const h=previewReview(t,store,token,lesson.id);await h.preview.ready;const step=lesson.checkExerciseIds?.includes(source.id)?'check':'apply',ids=courseHelpers.portionExercises?courseHelpers.portionExercises(draft,lesson,step):ux.portionExercises(draft,lesson,step);h.preview.go(step,ids.indexOf(source.id));
 const meanings=source.wordIds.map(id=>draft.words.find(w=>w.id===id).english);
 for(const [index,id] of source.wordIds.entries()){h.root().querySelector('[data-match-word="'+id+'"]').click();[...h.root().querySelectorAll('[data-match-target]')].find(el=>el.dataset.matchTarget===meanings[index<2?1-index:index]).click();}
 const root=h.root();root.querySelector('[data-action=check]').click();await settled(()=>h.root().querySelector('.feedback'));
 assert.equal(h.root(),root,'grading must keep answer nodes');const summary=[...root.querySelectorAll('[data-match-word]')].map(el=>({id:el.dataset.matchWord,status:el.querySelector('.pair-status')?.textContent||null,class:el.className}));
 console.log('MATCHING_RESULT_OBSERVATION '+JSON.stringify(summary));const count=root.querySelectorAll('[data-match-word] .pair-status').length;h.preview.go('learn');h.preview.go(step,ids.indexOf(source.id));console.log('MATCHING_RESTORED_OBSERVATION '+JSON.stringify([...h.root().querySelectorAll('[data-match-word]')].map(el=>({id:el.dataset.matchWord,status:el.querySelector('.pair-status')?.textContent||null,class:el.className}))));assert.equal(count,source.wordIds.length,'each submitted pair needs existing textual correctness feedback');assert.ok(h.root().querySelector('.pair-incorrect'));
});
test('UX-ACT-05 Preview failed request preserves mounted answer selection and retry remains available',async t=>{
 const {store,token}=stageReview(t);let release;const h=previewReview(t,store,token,'lesson-1',()=>new Promise((_,reject)=>release=()=>reject(new Error('SYNTHETIC interrupted'))));await h.preview.ready;h.preview.go('apply');
 const answer=h.root().querySelector('#answer');typeReview(h.w,answer,'SYNTHETIC answer');answer.focus();answer.setSelectionRange(2,8);h.root().querySelector('[data-action=concept]').click();assert.equal(h.root().querySelector('#answer'),answer);h.root().querySelector('[data-action=concept-close]').click();assert.equal(h.doc.activeElement,h.root().querySelector('[data-action=concept]'));
 h.root().querySelector('[data-action=check]').click();await settled(()=>release);assert.equal(h.root().querySelector('#answer'),answer);assert.equal(answer.disabled,true);release();await settled(()=>h.container.querySelector('[data-preview-status]').textContent.includes('interrupted'));
 assert.equal(h.root().querySelector('#answer'),answer);assert.equal(answer.disabled,false);assert.equal(answer.selectionStart,2);assert.equal(answer.selectionEnd,8);assert.equal(h.root().querySelector('.feedback'),null);assert.ok(h.root().querySelector('[data-action=check]'));
});
test('UX-ACT-06 repeated save-only failure retains recovery focus in exercise workspace',async t=>{
 const {w,doc}=await app(t,{page:'lesson/lesson-1/apply',realHTTP:true});typeReview(w,doc.querySelector('#answer'),'אני');await waitReview(450);const original=w.fetch;
 w.fetch=(url,options)=>url==='/api/progress'?Promise.resolve({ok:false,status:503,json:async()=>({error:'SYNTHETIC save offline'})}):original(url,options);
 click(doc,'check');await settled(()=>doc.querySelector('[data-action=save-answer-position]'));const retry=doc.querySelector('[data-action=save-answer-position]');retry.focus();retry.click();await settled(()=>doc.querySelector('[data-action=save-answer-position]'));console.log('RECOVERY_FOCUS_OBSERVATION '+doc.activeElement.tagName+' '+doc.activeElement.getAttribute('data-action'));
 assert.ok(doc.querySelector('#practice').contains(doc.activeElement),'failed retry must keep a meaningful focus target in the exercise');
});
test('UX-ACT-07 learner pending state exposes one busy or live announcement',async t=>{
 const {w,doc}=await app(t,{page:'lesson/lesson-1/apply',realHTTP:true});typeReview(w,doc.querySelector('#answer'),'אני');await waitReview(450);const original=w.fetch;let release;
 w.fetch=async(url,options)=>{if(url==='/api/attempt')await new Promise(resolve=>release=resolve);return original(url,options);};
 click(doc,'check');await settled(()=>release);const scope=doc.querySelector('#practice'),busy=scope.getAttribute('aria-busy'),announcements=[...doc.querySelectorAll('[role=status],[role=alert],[aria-live]')].filter(el=>!el.closest('[hidden],[inert]')&&/Checking|pending/i.test(el.textContent));console.log('PENDING_ANNOUNCEMENT_OBSERVATION '+JSON.stringify({busy,announcements:announcements.map(el=>el.outerHTML)}));release();await settled(()=>doc.querySelector('[data-action=next-question]'));
 assert.ok(busy==='true'||announcements.length===1,'Checking must have an announced busy state as specified');
});

// Source: Hebleo UX Owner review 2a67a825-81a7-4356-bc08-3502f8ab4532.
// Additional Lead correction coverage; disposable Store/HTTP/JSDOM, no native geometry claims.
for(const placement of [[0,1,2],[1,0,2],[1,2,0]])test('UX-ACT-04 matching initial/restored bank and target parity '+placement.join('-'),async t=>{
 const {store,draft,token}=stageReview(t),source=draft.exercises.find(e=>e.type==='matching'),lesson=draft.lessons.find(l=>l.exerciseIds.includes(source.id));
 const h=previewReview(t,store,token,lesson.id);await h.preview.ready;const step=lesson.checkExerciseIds?.includes(source.id)?'check':'apply',ids=ux.portionExercises(draft,lesson,step),index=ids.indexOf(source.id);
 h.preview.go(step,index);const meanings=source.wordIds.map(id=>draft.words.find(w=>w.id===id).english);
 for(const [i,id] of source.wordIds.entries()){h.root().querySelector('[data-match-word="'+id+'"]').click();h.root().querySelector('[data-match-target="'+meanings[placement[i]]+'"]').click();}
 const root=h.root(),input=root.querySelector('[data-exercise-input]');root.querySelector('[data-action=check]').click();await settled(()=>root.querySelector('.feedback'));
 assert.equal(h.root(),root);assert.equal(root.querySelector('[data-exercise-input]'),input,'retain answer host while existing word decorator converts button wrappers');
 const summary=()=>[...h.root().querySelectorAll('[data-match-word],[data-match-target]')].map(el=>({word:el.dataset.matchWord,target:el.dataset.matchTarget,correct:el.classList.contains('pair-correct'),incorrect:el.classList.contains('pair-incorrect'),status:el.querySelector('.pair-status')?.textContent}));
 const initial=summary();assert.equal(initial.length,source.wordIds.length*2);assert.ok(initial.every(el=>el.status&&el.correct!==el.incorrect));
 for(const [i,id] of source.wordIds.entries()){const row=initial.find(el=>el.word===id);assert.equal(row.correct,placement[i]===i);}
 h.preview.go('learn');h.preview.go(step,index);assert.deepEqual(summary(),initial);assert.equal(store.learner('learner-demo').attempts.length,0);
});

test('UX-ACT-06 uncertain recovery failures keep focus and submitted answer locked',async t=>{
 const {w,doc,store}=await app(t,{page:'lesson/lesson-1/apply',realHTTP:true});typeReview(w,doc.querySelector('#answer'),'אני');const transport=w.fetch;
 w.fetch=async(url,options)=>{const response=await transport(url,options);if(url==='/api/attempt')throw new Error('SYNTHETIC response lost repeatedly');return response;};
 click(doc,'check');await settled(()=>doc.querySelector('[data-action=recover-attempt]'));
 for(let n=0;n<2;n++){const retry=doc.querySelector('[data-action=recover-attempt]');retry.focus();retry.click();await settled(()=>doc.querySelector('[data-action=recover-attempt]')!==retry&&doc.querySelector('[data-action=recover-attempt]'));assert.equal(doc.activeElement,doc.querySelector('[data-answer-commit]'));assert.equal(doc.querySelector('#answer').disabled,true);}
 assert.equal(store.learner('learner-demo').attempts.length,1);
});

test('UX-ACT-06 continuing recovery failures keep focus and the graded question',async t=>{
 const {w,doc}=await app(t,{page:'lesson/lesson-1/apply',realHTTP:true});typeReview(w,doc.querySelector('#answer'),'אני');click(doc,'check');await settled(()=>doc.querySelector('[data-action=next-question]'));const scope=doc.querySelector('#practice'),transport=w.fetch;
 w.fetch=(url,options)=>url==='/api/progress'?Promise.resolve({ok:false,status:503,json:async()=>({error:'SYNTHETIC continuing offline'})}):transport(url,options);
 click(doc,'next-question');await settled(()=>doc.querySelector('[data-action=retry-continuing]'));const retry=doc.querySelector('[data-action=retry-continuing]');retry.focus();retry.click();await settled(()=>doc.querySelector('[data-action=retry-continuing]')!==retry&&doc.querySelector('[data-action=retry-continuing]'));
 assert.equal(doc.querySelector('#practice'),scope);assert.equal(doc.activeElement,doc.querySelector('[data-answer-commit]'));assert.equal(doc.querySelector('[data-action=check]'),null);assert.ok(doc.querySelector('.compact-result'));
});
