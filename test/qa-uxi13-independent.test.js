import {courseRailEdge,updateCourseToggle} from '../public/sidebar-toggle.js';
import {createStudioWorkspace} from '../public/studio/workspace.js';
import {mountInlineAuthor} from '../public/author/inline-author.js';
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
import {mountTextImport} from '../public/studio/text-import.js';
import {mountLessonEditor} from '../public/studio/lesson-editor.js';
import {mountExerciseEditor} from '../public/studio/exercise-editor.js';
import {inspectImport,renderImportReview} from '../public/studio/import-review.js';
import {pathToFileURL} from 'node:url';
const {mountLessonPreview} = await import(process.env.HEBLEO_PREVIEW_CONTROLLER ? pathToFileURL(process.env.HEBLEO_PREVIEW_CONTROLLER) : '../public/preview/lesson-preview.js');
import {createLearnerRenderer} from '../public/preview/learner-renderer.js';
async function settled(predicate){for(let i=0;i<80;i++){if(predicate())return;await new Promise(r=>setTimeout(r,5));}throw new Error('App condition did not settle.');}
async function app(t,{page='lesson/lesson-2/learn',author=false,prepare,ownerKeyboard=false,store:providedStore,realHTTP=false,width=1024,navigationPrefs,markdownDependencies}={}){
  const store=providedStore||new Store();prepare?.(store);const d=new JSDOM('<div id="app"></div><div id="toast"></div>',{url:'http://127.0.0.1/#'+page,runScripts:'outside-only',pretendToBeVisual:true}),w=d.window;
  Object.defineProperty(w,'innerWidth',{value:width,writable:true});let server,origin;
  if(realHTTP){server=createServer(store);await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;}
  t.after(async()=>{w.close();if(server)await new Promise(r=>server.close(r));if(!providedStore)store.close();});w.matchMedia=()=>({matches:false});w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
  if(author)w.localStorage.setItem('hebleo-demo-user','author-demo');
  if(navigationPrefs)w.localStorage.setItem('hebleo-navigation-'+(author?'author-demo':'learner-demo'),JSON.stringify(navigationPrefs));
  if(ownerKeyboard){w.scrollBy=()=>{};w.eval(readFileSync(process.env.HEBLEO_KEYBOARD_SOURCE || new URL('../public/keyboard-owner.js',import.meta.url),'utf8'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));}
  Object.assign(w,{courseRailEdge,updateCourseToggle,createStudioWorkspace,mountInlineAuthor},ux,reviewScheduler,courseHelpers,learnerView,{structuredClone,resolveBlock,importVocabularyCSV,composeSentence,bindMatching,matchWord,richCell,cellCSS,renderLesson:createLessonRenderer(marked,createPurifier(w),w.document),mountMediaLibrary,mountSourceAuthoring,mountUnifiedStudio,mountTextImport,mountImportWorkflow,mountLessonEditor,mountExerciseEditor,inspectImport,renderImportReview,mountLessonPreview,createLearnerRenderer,getPlaybackState:()=>({}),playAudio:async()=>{},setPlaybackSpeed(){},stopMedia(){},clearRecording(){},feedbackSound(){}});
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
// The obsolete general Help control was removed at Guy's request. Keep the
// delayed help regressions through the supported word-linked discussion entry.
async function openLessonWordHelp(w,doc){
 doc.querySelector('[data-action=step][data-value=vocabulary]').click();
 await settled(()=>doc.querySelector('[data-action=lookup][data-value=w-ani]'));
 doc.querySelector('[data-action=lookup][data-value=w-ani]').click();click(doc,'help-word');
}
const edit=(w,el,value)=>{assert.ok(el);el.value=value;el.dispatchEvent(new w.Event('input',{bubbles:true}));};
const submit=(w,f)=>f.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
const pause=()=>new Promise(r=>setTimeout(r,60));
const nav=(doc,value)=>doc.querySelector('.app-header [data-action=page][data-value="'+value+'"]');
const stageDraft=(s,fn)=>{const c=structuredClone(s.currentDraft()?.content||s.snapshot());fn(c);return s.stage({baseRevisionId:s.get('active'),expectedDraftToken:s.currentDraft()?.draftToken??null,content:c});};
const profile=async(w,doc,id)=>{const p=doc.querySelector('#demo-user');p.value=id;p.dispatchEvent(new w.Event('change'));await settled(()=>doc.querySelector('#demo-user').value===id&&doc.querySelector('h1').textContent.includes('Welcome back'));};

test('QA-UXI13-01 stale concurrent draft refuses departure Save and retains raw Unicode title',async t=>{
 const {w,doc,store}=await app(t,{page:'studio',author:true,realHTTP:true});
 const f=doc.querySelector('[data-lesson-metadata] [name=title]');edit(w,f,'SYNTHETIC  אֲנִי \u200f English');
 stageDraft(store,c=>c.lessons[0].title='SYNTHETIC other tab');const token=store.currentDraft().draftToken,active=store.get('active');
 nav(doc,'home').click();await settled(()=>doc.querySelector('#studio-departure'));doc.querySelector('[data-departure-save]').click();
 await settled(()=>/not saved/.test(doc.querySelector('[data-departure-status]').textContent));
 assert.equal(w.location.hash,'#studio');assert.equal(doc.querySelector('[data-lesson-metadata] [name=title]'),f);assert.equal(f.value,'SYNTHETIC  אֲנִי \u200f English');assert.equal(store.currentDraft().draftToken,token);assert.equal(store.get('active'),active);
 doc.querySelector('[data-departure-stay]').click();await settled(()=>!doc.querySelector('#studio-departure'));assert.equal(f.isConnected,true);
});

test('QA-UXI13-02 lost post-commit draft receipt does not silently publish or discard unsaved workspace',async t=>{
 const {w,doc,store}=await app(t,{page:'studio',author:true,realHTTP:true});
 const f=doc.querySelector('[data-lesson-metadata] [name=title]');edit(w,f,'SYNTHETIC saved despite reload outage');
 const real=w.fetch;let failed=false;w.fetch=async(p,o)=>{const response=await real(p,o);if(p==='/api/studio/draft'&&!failed){failed=true;return {ok:false,status:503,json:async()=>({error:'SYNTHETIC draft receipt outage'})};}return response;};
 const active=store.get('active');nav(doc,'home').click();await settled(()=>doc.querySelector('#studio-departure'));doc.querySelector('[data-departure-save]').click();
 await settled(()=>/receipt outage/.test(doc.querySelector('[data-departure-status]').textContent));
 assert.equal(store.currentDraft().content.lessons[0].title,f.value);assert.equal(store.get('active'),active);assert.equal(w.location.hash,'#studio');assert.equal(f.isConnected,true);assert.equal(f.disabled,false);
 doc.querySelector('[data-departure-stay]').click();await settled(()=>!doc.querySelector('#studio-departure'));assert.equal(f.isConnected,true);
});

test('QA-UXI13-03 word and general comment contexts retain independent drafts with late failure',async t=>{
 const {w,doc,store}=await app(t,{page:'lesson/lesson-1/learn',realHTTP:true});
 const general=doc.querySelector('[data-lesson-comment]');edit(w,general.querySelector('textarea'),'SYNTHETIC general draft');general.querySelector('[name=anonymous]').checked=true;
 nav(doc,'library').click();await settled(()=>doc.querySelector('[data-action=note-open]'));doc.querySelector('[data-action=note-open][data-value=w-ani]').click();click(doc,'help-word');await settled(()=>doc.querySelector('#author-question-form'));
 const f=doc.querySelector('#author-question-form');assert.equal(f.querySelector('textarea').value,'');edit(w,f.querySelector('textarea'),'SYNTHETIC word-only draft');
 const real=w.fetch;let release;w.fetch=(p,o)=>p==='/api/questions'&&o?.method==='POST'?new Promise(r=>release=()=>r({ok:false,status:503,json:async()=>({error:'SYNTHETIC word post failure'})})):real(p,o);
 submit(w,f);await settled(()=>release);click(doc,'panel-close');nav(doc,'course').click();await settled(()=>doc.querySelector('[data-action=lesson][data-value=lesson-1]'));doc.querySelector('[data-action=lesson][data-value=lesson-1]').click();await settled(()=>doc.querySelector('[data-lesson-comment]'));
 release();await pause();assert.equal(doc.querySelector('[data-lesson-comment] textarea').value,'SYNTHETIC general draft');assert.equal(doc.querySelector('[data-lesson-comment] [data-comment-status]').textContent,'');assert.equal(store.questions('author-demo').length,0);
 nav(doc,'library').click();await settled(()=>doc.querySelector('[data-action=note-open]'));doc.querySelector('[data-action=note-open][data-value=w-ani]').click();click(doc,'help-word');await settled(()=>doc.querySelector('#author-question-form'));
 assert.equal(doc.querySelector('#author-question-form textarea').value,'SYNTHETIC word-only draft');assert.match(doc.querySelector('#author-question-form [data-comment-status]').textContent,/word post failure/);
});

test('QA-UXI13-04 pending private Save close-reopen permits newer draft without late success losing it',async t=>{
 const {w,doc,store}=await app(t,{page:'library',realHTTP:true});
 const open=()=>doc.querySelector('[data-action=note-open][data-value=w-ani]').click();open();edit(w,doc.querySelector('#personal-note'),'SYNTHETIC older requested note');
 const real=w.fetch;let release;w.fetch=(p,o)=>p==='/api/preferences'&&o?.body?.includes('older requested')?new Promise(r=>release=async()=>r(await real(p,o))):real(p,o);
 click(doc,'save-panel-note');await settled(()=>release);assert.equal(doc.querySelector('#personal-note').readOnly,true);click(doc,'panel-close');open();
 const newer=doc.querySelector('#personal-note');assert.equal(newer.readOnly,false);edit(w,newer,'SYNTHETIC newer אֲנִי unsaved');newer.setSelectionRange(3,10,'backward');release();
 await settled(()=>store.learner('learner-demo').notes['w-ani']==='SYNTHETIC older requested note');await pause();
 assert.equal(doc.querySelector('#personal-note'),newer);assert.equal(newer.value,'SYNTHETIC newer אֲנִי unsaved');assert.equal(newer.selectionDirection,'backward');
 click(doc,'panel-close');open();assert.equal(doc.querySelector('#personal-note').value,'SYNTHETIC newer אֲנִי unsaved');assert.equal(doc.querySelector('#personal-note').selectionStart,3);
});

test('QA-UXI13-05 pending private Save failure after owner switch retains both owners exact selections',async t=>{
 const {w,doc,store}=await app(t,{page:'library',realHTTP:true});
 const open=()=>doc.querySelector('[data-action=note-open][data-value=w-ani]').click();open();edit(w,doc.querySelector('#personal-note'),'SYNTHETIC A  אֲנִי');doc.querySelector('#personal-note').setSelectionRange(2,8,'backward');
 const real=w.fetch;let release;w.fetch=(p,o)=>p==='/api/preferences'&&o?.body?.includes('SYNTHETIC A')?new Promise(r=>release=()=>r({ok:false,status:503,json:async()=>({error:'SYNTHETIC A failure'})})):real(p,o);
 click(doc,'save-panel-note');await settled(()=>release);await profile(w,doc,'learner-core');nav(doc,'library').click();await settled(()=>doc.querySelector('[data-action=note-open]'));open();
 const b=doc.querySelector('#personal-note');edit(w,b,'SYNTHETIC B other');b.setSelectionRange(1,7,'forward');release();await pause();assert.equal(doc.querySelector('#personal-note'),b);assert.equal(b.value,'SYNTHETIC B other');assert.equal(b.selectionStart,1);assert.equal(store.learner('learner-demo').notes['w-ani'],undefined);
 await profile(w,doc,'learner-demo');nav(doc,'library').click();await settled(()=>doc.querySelector('[data-action=note-open]'));open();assert.equal(doc.querySelector('#personal-note').value,'SYNTHETIC A  אֲנִי');assert.equal(doc.querySelector('#personal-note').selectionDirection,'backward');
});

test('QA-UXI13-06 prefilled typing answer and direct submit never grade through drawer or modal',async t=>{
 const {w,doc,store}=await app(t,{page:'lesson/lesson-1/apply',width:700,realHTTP:true,ownerKeyboard:true});const answer=doc.querySelector('#answer');edit(w,answer,'אני');
 await new Promise(r=>setTimeout(r,460));const before=structuredClone(store.learner('learner-demo').attempts),callsBefore=store.learner('learner-demo').attempts.length;
 click(doc,'navigation-toggle');await settled(()=>doc.querySelector('.nav-shell').dataset.courseOverlay==='true');
 for(const key of ['Enter',' ','1'])answer.dispatchEvent(new w.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));click(doc,'check');await pause();assert.deepEqual(store.learner('learner-demo').attempts,before);
 click(doc,'navigation-close');const modal=doc.createElement('dialog');modal.innerHTML='<textarea>Unrelated SYNTHETIC</textarea>';doc.body.append(modal);modal.showModal();click(doc,'check');answer.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));await pause();assert.deepEqual(store.learner('learner-demo').attempts,before);
 modal.close();modal.remove();answer.focus();answer.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));await settled(()=>store.learner('learner-demo').attempts.length===callsBefore+1);
});

test('QA-UXI13-07 mounted malformed input survives complete task and real-route navigation Stay cycle',async t=>{
 const {w,doc,store}=await app(t,{page:'studio',author:true,realHTTP:true});const f=doc.querySelector('[name=richFields]');edit(w,f,'{"SYNTHETIC incomplete":');
 for(const task of ['vocabulary','sources','media','comments','versions','lesson']){doc.querySelector('[data-action=studio-task][data-value="'+task+'"]').click();assert.equal(f.isConnected,true);assert.equal(f.value,'{"SYNTHETIC incomplete":');}
 for(const route of ['settings','course','review','library','home']){nav(doc,route).click();await settled(()=>doc.querySelector('#studio-departure'));doc.querySelector('[data-departure-stay]').click();await settled(()=>!doc.querySelector('#studio-departure'));assert.equal(w.location.hash,'#studio');assert.equal(f.isConnected,true);}
 assert.equal(store.currentDraft(),null);
});

test('QA-UXI13-08 installed static routes original logo hash and source boundary preserve actual destinations',async t=>{
 const {createHash}=await import('node:crypto');const s=new Store(),server=createServer(s);t.after(async()=>{await new Promise(r=>server.close(r));s.close();});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 for(const p of ['/','/google-setup','/app.js','/refinement.css','/studio/unified-studio.js'])assert.equal((await fetch(base+p)).status,200,p);
 assert.equal((await fetch(base+'/index.html')).status,404);assert.equal((await fetch(base+'/assets/not-approved.png')).status,404);
 const logo=await fetch(base+'/assets/hebleo-wide-navy.png');assert.equal(logo.headers.get('content-type'),'image/png');const bytes=Buffer.from(await logo.arrayBuffer());assert.equal(bytes.length,137630);assert.equal(createHash('sha256').update(bytes).digest('hex'),'d744d37a3a10f315d58372b3a8f557b2913c04f6d6065c4f15ae26fc10789971');
 const {w,doc,store}=await app(t,{page:'home',author:true,realHTTP:true});for(const route of ['course','library','review','settings','studio','home']){nav(doc,route).click();await settled(()=>w.location.hash==='#'+route&&doc.querySelector('h1'));assert.ok(doc.title);assert.ok(doc.querySelector('.app-header [aria-current=page]'));}
 nav(doc,'studio').click();await settled(()=>doc.querySelector('[data-studio-departure]'));assert.match(doc.body.textContent,/has not been activated here/);assert.equal(store.currentDraft(),null);
});
test('QA-UXI13-09 late help callback after profile departure does not reopen old context on new owner',async t=>{
 const {w,doc}=await app(t,{page:'lesson/lesson-1/learn',realHTTP:true});const real=w.fetch;let release;
 w.fetch=(p,o)=>p==='/api/help'?new Promise(r=>release=async()=>r(await real(p,o))):real(p,o);
 await openLessonWordHelp(w,doc);await settled(()=>release);await profile(w,doc,'learner-core');assert.equal(w.location.hash,'#home');release();await pause();
 console.log('SYNTHETIC late-help observation',JSON.stringify({route:w.location.hash,profile:doc.querySelector('#demo-user').value,modalOwner:doc.querySelector('#author-question-form')?.dataset.commentOwner,context:doc.querySelector('#author-question-form')?.dataset.commentContext}));assert.equal(doc.querySelector('#context-panel'),null,'An obsolete help request must not open a modal after profile/route departure');
});


// Original independent QA provenance (general Help entry adapted above for the Oct31 removal):
// qa-uxi13-20261013/source/test/qa-uxi13-independent.test.js at candidate 1669a10.
// Below: Lead's bounded delayed-response lifecycle regressions, using only
// fictional in-memory profiles and ephemeral loopback HTTP.
function holdHelp(w) {
 const real=w.fetch,requests=[];
 w.fetch=(path,options)=>path==='/api/help'?new Promise(resolve=>requests.push({
  owner:options.headers['x-demo-user'],context:JSON.parse(options.body),
  release:async(error)=>{resolve(error?{ok:false,status:503,json:async()=>({error})}:await real(path,options));await pause();}
 })):real(path,options);
 return requests;
}
const syntheticDraft='SYNTHETIC newer אֲנִי draft';
function expectDraft(doc,field,value=syntheticDraft) {
 assert.equal(doc.querySelector('#personal-note,#author-question-form textarea'),field);
 assert.equal(field.value,value);assert.equal(field.selectionStart,2);assert.equal(field.selectionEnd,9);assert.equal(field.selectionDirection,'backward');
}
function draft(w,field) {edit(w,field,syntheticDraft);field.setSelectionRange(2,9,'backward');}

for(const outcome of ['success','error']) {
 const failure=outcome==='error'?'SYNTHETIC obsolete Help failure':undefined;
 test('UXI13 Help '+outcome+' ignores same-profile route departure',async t=>{
  const {w,doc}=await app(t,{page:'lesson/lesson-1/learn',realHTTP:true}),requests=holdHelp(w);
  await openLessonWordHelp(w,doc);await settled(()=>requests.length===1);nav(doc,'home').click();await settled(()=>w.location.hash==='#home');
  await requests[0].release(failure);assert.equal(doc.querySelector('#context-panel'),null);assert.equal(doc.querySelector('#toast').textContent,'');
 });
 test('UXI13 Help '+outcome+' stays obsolete after returning to the same route and profile',async t=>{
  const {w,doc}=await app(t,{page:'lesson/lesson-1/learn',realHTTP:true}),requests=holdHelp(w);
  await openLessonWordHelp(w,doc);await settled(()=>requests.length===1);nav(doc,'home').click();await settled(()=>w.location.hash==='#home');
  nav(doc,'course').click();await settled(()=>doc.querySelector('[data-action=lesson][data-value=lesson-1]'));doc.querySelector('[data-action=lesson][data-value=lesson-1]').click();await settled(()=>doc.querySelector('[data-lesson-comment]'));
  assert.equal(w.location.hash,'#lesson/lesson-1/vocabulary');await requests[0].release(failure);assert.equal(doc.querySelector('#context-panel'),null);assert.equal(doc.querySelector('#toast').textContent,'');
 });
 test('UXI13 Help '+outcome+' preserves a newer word panel and private draft',async t=>{
  const {w,doc}=await app(t,{page:'library',realHTTP:true}),requests=holdHelp(w);
  doc.querySelector('[data-action=note-open][data-value=w-ani]').click();click(doc,'help-word');await settled(()=>requests.length===1);
  click(doc,'panel-close');doc.querySelector('[data-action=note-open][data-value=w-ani]').click();const field=doc.querySelector('#personal-note');draft(w,field);
  await requests[0].release(failure);expectDraft(doc,field);assert.equal(doc.querySelector('#toast').textContent,'');
 });
 test('UXI13 Help '+outcome+' cannot replace a newer Help request and comment draft',async t=>{
  const {w,doc}=await app(t,{page:'library',realHTTP:true}),requests=holdHelp(w);
  const open=()=>doc.querySelector('[data-action=note-open][data-value=w-ani]').click();open();click(doc,'help-word');await settled(()=>requests.length===1);
  click(doc,'panel-close');open();click(doc,'help-word');await settled(()=>requests.length===2);
  await requests[1].release();await settled(()=>doc.querySelector('#author-question-form'));const field=doc.querySelector('#author-question-form textarea');draft(w,field);
  await requests[0].release(failure);expectDraft(doc,field);assert.equal(doc.querySelector('#toast').textContent,'');
 });
 test('UXI13 Help '+outcome+' cannot resurrect a dismissed and reopened word panel',async t=>{
  const {w,doc}=await app(t,{page:'library',realHTTP:true}),requests=holdHelp(w);
  const open=()=>doc.querySelector('[data-action=note-open][data-value=w-ani]').click();open();click(doc,'help-word');await settled(()=>requests.length===1);
  // Escape uses the app-owned dialog cancel path, then the same word reopens.
  doc.querySelector('#context-panel').dispatchEvent(new w.Event('cancel',{cancelable:true}));assert.equal(doc.querySelector('#context-panel'),null);open();
  const field=doc.querySelector('#personal-note');draft(w,field);await requests[0].release(failure);expectDraft(doc,field);assert.equal(doc.querySelector('#toast').textContent,'');
 });
 test('UXI13 Help '+outcome+' ignores departure to a different lesson portion',async t=>{
  const {w,doc}=await app(t,{page:'lesson/lesson-1/learn',realHTTP:true}),requests=holdHelp(w);
  await openLessonWordHelp(w,doc);await settled(()=>requests.length===1);doc.querySelector('[data-action=step][data-value=apply]').click();await settled(()=>w.location.hash==='#lesson/lesson-1/apply');
  await requests[0].release(failure);assert.equal(doc.querySelector('#context-panel'),null);assert.equal(doc.querySelector('#toast').textContent,'');
 });
 test('UXI13 Help '+outcome+' ignores replacement of the lesson session on the same route',async t=>{
  const {w,doc}=await app(t,{page:'lesson/lesson-1/learn',realHTTP:true}),requests=holdHelp(w);
  await openLessonWordHelp(w,doc);await settled(()=>requests.length===1);const previous=doc.querySelector('[data-lesson-comment]');
  w.dispatchEvent(new w.PopStateEvent('popstate'));await settled(()=>doc.querySelector('[data-lesson-comment]')!==previous);
  assert.equal(w.location.hash,'#lesson/lesson-1/vocabulary');await requests[0].release(failure);assert.equal(doc.querySelector('#context-panel'),null);assert.equal(doc.querySelector('#toast').textContent,'');
 });
 test('UXI13 Help '+outcome+' cannot interrupt another profile new panel or draft',async t=>{
  const {w,doc}=await app(t,{page:'lesson/lesson-1/learn',realHTTP:true}),requests=holdHelp(w);
  await openLessonWordHelp(w,doc);await settled(()=>requests.length===1);await profile(w,doc,'learner-core');nav(doc,'library').click();await settled(()=>doc.querySelector('[data-action=note-open][data-value=w-ani]'));
  doc.querySelector('[data-action=note-open][data-value=w-ani]').click();const field=doc.querySelector('#personal-note');draft(w,field);
  await requests[0].release(failure);expectDraft(doc,field);assert.equal(field.dataset.noteOwner,'learner-core');assert.equal(doc.querySelector('#toast').textContent,'');
 });
}
test('UXI13 Help valid same-context success keeps owner/context and retained comment draft',async t=>{
 const {w,doc,store}=await app(t,{page:'lesson/lesson-1/learn',realHTTP:true});await openLessonWordHelp(w,doc);await settled(()=>doc.querySelector('#author-question-form'));
 draft(w,doc.querySelector('#author-question-form textarea'));click(doc,'panel-close');const requests=holdHelp(w),before=structuredClone(store.learner('learner-demo'));
 await openLessonWordHelp(w,doc);await settled(()=>requests.length===1);assert.equal(requests[0].owner,'learner-demo');await requests[0].release();await settled(()=>doc.querySelector('#author-question-form'));
 const form=doc.querySelector('#author-question-form');assert.equal(form.dataset.commentOwner,'learner-demo');assert.deepEqual(JSON.parse(form.dataset.commentContext),requests[0].context);assert.equal(form.querySelector('textarea').value,syntheticDraft);
 assert.equal(doc.querySelectorAll('#context-panel').length,1);assert.deepEqual(store.learner('learner-demo'),before);assert.equal(store.questions('author-demo').length,0);
});
test('UXI13 Help valid same-context error retains the current word panel and draft',async t=>{
 const {w,doc}=await app(t,{page:'library',realHTTP:true}),requests=holdHelp(w);doc.querySelector('[data-action=note-open][data-value=w-ani]').click();const field=doc.querySelector('#personal-note');draft(w,field);
 click(doc,'help-word');await settled(()=>requests.length===1);await requests[0].release('SYNTHETIC current Help failure');expectDraft(doc,field);assert.match(doc.querySelector('#toast').textContent,/current Help failure/);
});
