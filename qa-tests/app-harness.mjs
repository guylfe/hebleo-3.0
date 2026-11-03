import {createStudioWorkspace} from '../public/studio/workspace.js';
import {mountInlineAuthor} from '../public/author/inline-author.js';
// Independent review reuses candidate test/app.test.js harness through first test boundary.
import {renderLexicalVocabulary,bindLexicalVocabulary} from '../public/lexical-vocabulary.js';
import {mountAnsweredVocabulary} from '../public/post-answer-vocabulary.js';
import {sourceBrowseFixture} from '../scripts/source-browse-fixture.mjs';
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
  Object.assign(w,{createStudioWorkspace,mountInlineAuthor},{mountAnsweredVocabulary,renderLexicalVocabulary,bindLexicalVocabulary},ux,reviewScheduler,courseHelpers,learnerView,{structuredClone,resolveBlock,importVocabularyCSV,composeSentence,bindMatching,matchWord,richCell,cellCSS,renderLesson:createLessonRenderer(marked,createPurifier(w),w.document),mountMediaLibrary,mountSourceAuthoring,mountUnifiedStudio,mountImportWorkflow,mountLessonEditor,mountExerciseEditor,inspectImport,renderImportReview,mountLessonPreview,createLearnerRenderer,getPlaybackState:()=>w.referenceState||{},playAudio:async()=>{},setPlaybackSpeed(){},stopMedia(){},clearRecording(){},feedbackSound(){}});
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


export {app,settled};
