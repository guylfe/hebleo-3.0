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

import {projectExerciseVocabulary} from '../src/exercise-vocabulary.js';
import {lexicalApprovalDigest} from '../src/lexical-trust.js';
import {createHash} from 'node:crypto';
import {executableIdentity} from '../scripts/runtime-state.mjs';
import {execFileSync} from 'node:child_process';
const sha='444b9177f556e103f48f548db5d700d6cddf29e8';
const dump=s=>JSON.stringify(s.db.prepare("SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name").all().map(({name})=>[name,s.db.prepare('SELECT * FROM "'+name+'" ORDER BY 1').all()]));
function geometry(w){w.HTMLElement.prototype.getBoundingClientRect=()=>({left:20,top:40,right:180,bottom:80,width:160,height:40});w.HTMLElement.prototype.getClientRects=function(){return [this.getBoundingClientRect()];};}

test('QA independent served review build and every allowlisted static route match exact clone',async()=>{
 const root=new URL('../',import.meta.url).pathname.replace(/^\/(?:([A-Za-z]:))/,'$1');
 const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true});
 // QA evidence commits may descend from the frozen candidate; executable files must remain identical.
 git(['diff','--exit-code',sha,'HEAD','--','public','src','scripts','package.json','package-lock.json']);
 const local=executableIdentity(root,git(['rev-parse','HEAD']).trim()),res=await fetch('http://127.0.0.1:63360/api/build'),remote=await res.json();
 assert.equal(remote.revision,sha);assert.equal(remote.preservationMode,true);
 assert.equal(remote.runtimeSha256,local.runtimeSha256);assert.equal(remote.backendSha256,local.backendSha256);assert.deepEqual(remote.files,local.files);
 const serverText=readFileSync(new URL('../src/server.js',import.meta.url),'utf8');
 const allowed=Object.fromEntries([...serverText.match(/const allowed = (\{.*?\});/s)[1].matchAll(/'([^']+)'\s*:\s*'([^']+)'/g)].map(([,route,file])=>[route,file]));
 for(const [,file] of serverText.match(/for\(const asset of (\[.*?\])/)[1].matchAll(/'([^']+)'/g))allowed['/'+file]=file;
 let count=0;for(const [route,file] of Object.entries(allowed)){const path='public/'+file;const digest=remote.files[path]||createHash('sha256').update(readFileSync(new URL('../'+path,import.meta.url))).digest('hex');const asset=await fetch('http://127.0.0.1:63360'+route);assert.equal(asset.status,200,route);assert.equal(createHash('sha256').update(Buffer.from(await asset.arrayBuffer())).digest('hex'),digest,route);count++;}
 assert.ok(count>25);console.log('QA allowlisted static routes verified:',count);
});

for(const correct of [true,false])test('QA Apply typing actual HTTP retains raw answer and all tables across reminder actions '+correct,async t=>{
 const {doc,w,store,calls}=await app(t,{page:'lesson/lesson-1/apply',realHTTP:true,ownerKeyboard:true});geometry(w);
 assert.equal(doc.querySelector('[data-vocabulary-word]'),null);const field=doc.querySelector('#answer');assert.ok(field);const raw=correct?'אני':'  מִי? \u202eSYNTHETIC wrong\u202c  ';field.value=raw;field.dispatchEvent(new w.Event('input',{bubbles:true}));click(doc,'check');
 await settled(()=>doc.querySelector('[data-vocabulary-word]')&&store.learner('learner-demo').resumes['lesson-1']?.resultRequestId);
 await new Promise(r=>setTimeout(r,650));assert.equal(field.value,raw);assert.equal(field.disabled,true);assert.equal(store.learner('learner-demo').attempts[0].correct,correct);
 const before=dump(store),requests=calls.length,trigger=doc.querySelector('[data-vocabulary-word]');assert.equal(trigger.dataset.vocabularyWord,'w-ani');
 trigger.click();assert.ok(doc.querySelector('.vocabulary-reminder'));
 for(const key of ['Enter',' ','1','r','ArrowRight'])doc.querySelector('[data-vocabulary-close]').dispatchEvent(new w.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));
 assert.equal(store.learner('learner-demo').attempts.length,1);assert.ok(doc.querySelector('.vocabulary-reminder'));
 doc.querySelector('[data-vocabulary-close]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));assert.equal(doc.querySelector('.vocabulary-reminder'),null);assert.equal(doc.activeElement,trigger);
 trigger.click();doc.querySelector('[data-action=report-open]').click();await settled(()=>doc.querySelector('#context-panel'));await new Promise(r=>setTimeout(r,30));assert.equal(doc.querySelector('.vocabulary-reminder'),null);
 click(doc,'panel-close');assert.equal(dump(store),before);assert.equal(calls.length,requests);
 trigger.click();w.location.hash='#home';w.dispatchEvent(new w.HashChangeEvent('hashchange'));await settled(()=>doc.querySelector('.page-home'));assert.equal(doc.querySelector('.vocabulary-reminder'),null);
 trigger.click();assert.equal(doc.querySelector('.vocabulary-reminder'),null);assert.equal(store.learner('learner-demo').attempts.length,1);
});

test('QA wrong matching Apply HTTP every placement preserves explicit identity; viewing does not write',async t=>{
 let answer;
 const {doc,w,store,calls}=await app(t,{page:'lesson/lesson-1/apply',realHTTP:true,prepare(s){const c=s.snapshot(),e=c.exercises.find(e=>e.id==='ex-1-match');answer=Object.fromEntries(e.wordIds.map((id,i)=>[id,c.words.find(w=>w.id===e.wordIds[(i+1)%e.wordIds.length]).english]));s.saveProgress('learner-demo',{revisionId:s.get('active'),lessonId:'lesson-1',step:'apply',question:1,answer:'',matching:answer,selectedTokens:[]});}});geometry(w);
 assert.ok(doc.querySelector('[data-match-target]'));click(doc,'check');await settled(()=>doc.querySelectorAll('[data-vocabulary-word]').length===6);await new Promise(r=>setTimeout(r,650));
 assert.equal(store.learner('learner-demo').attempts[0].correct,false);const before=dump(store),requests=calls.length;
 for(const tile of doc.querySelectorAll('[data-match-target]')){const trigger=tile.querySelector('[data-vocabulary-word]');assert.equal(answer[trigger.dataset.vocabularyWord],tile.dataset.matchTarget);trigger.click();const word=store.snapshot().words.find(w=>w.id===trigger.dataset.vocabularyWord);assert.ok(doc.querySelector('.vocabulary-reminder').textContent.includes(word.english));doc.querySelector('[data-vocabulary-close]').click();}
 assert.equal(doc.querySelector('button button'),null);assert.equal(calls.length,requests);assert.equal(dump(store),before);
});

test('QA managed duplicate runtime identity denies both approved and pending duplicate flat fallback',t=>{
 const s=new Store();t.after(()=>s.close());const c=s.snapshot();c.lexical=lexicalFixture();const first=c.lexical.words[0];first.runtimeId='w-mi';first.approvalDigest=lexicalApprovalDigest(first);
 assert.equal(projectExerciseVocabulary(c,'lesson-1',w=>s.publicWord(w)).byWordId['w-mi'].kind,'lexical');
 const second=structuredClone(first);second.wordKey='qa-synthetic-duplicate';second.identityReview={status:'pending'};second.approvalDigest=lexicalApprovalDigest(second);c.lexical.words.push(second);
 assert.equal(projectExerciseVocabulary(c,'lesson-1',w=>s.publicWord(w)).byWordId['w-mi'],undefined);
 second.identityReview=structuredClone(first.identityReview);second.approvalDigest=lexicalApprovalDigest(second);assert.equal(projectExerciseVocabulary(c,'lesson-1',w=>s.publicWord(w)).byWordId['w-mi'],undefined);
});

test('QA saved rehearsal matching result opens each ID then dispose leaves every table unchanged',t=>{
 const s=new Store();t.after(()=>s.close());const c=s.snapshot();c.words.find(w=>w.id==='w-hu').notes='QA SYNTHETIC frozen note';const staged=s.stage({baseRevisionId:s.get('active'),expectedDraftToken:null,content:c});const session=s.previewSession({lessonId:'lesson-1',draftToken:staged.draftToken});const e=session.content.exercises.find(e=>e.type==='matching'),answer=Object.fromEntries(e.wordIds.map((id,i)=>[id,session.content.words.find(w=>w.id===e.wordIds[(i+1)%e.wordIds.length]).english]));
 const result=s.previewEvaluate({lessonId:'lesson-1',draftToken:staged.draftToken,exerciseId:e.id,answer}).result;const before=dump(s),d=new JSDOM('<dialog open><main></main></dialog>',{pretendToBeVisual:true}),w=d.window;t.after(()=>w.close());geometry(w);let actionCalls=0;
 const actions=Object.fromEntries(['go','next','setAnswer','submit','retry','lookup','setPreference','exit'].map(name=>[name,()=>actionCalls++]));const dispose=createLearnerRenderer().mount(w.document.querySelector('main'),{content:session.content,lessonId:'lesson-1',step:'apply',question:1,exerciseId:e.id,answer:{matching:answer},result,preferences:{nikkud:'none'},actions});
 assert.equal(w.document.querySelectorAll('[data-vocabulary-word]').length,6);for(const trigger of w.document.querySelectorAll('[data-vocabulary-word]')){trigger.click();assert.ok(w.document.querySelector('dialog').contains(w.document.querySelector('.vocabulary-reminder')));w.document.querySelector('[data-vocabulary-close]').click();}
 const old=w.document.querySelector('[data-vocabulary-word]');old.click();dispose();old.click();assert.equal(w.document.querySelector('.vocabulary-reminder'),null);assert.equal(actionCalls,0);assert.equal(dump(s),before);
});





