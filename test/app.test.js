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
async function settled(predicate){for(let i=0;i<80;i++){if(predicate())return;await new Promise(r=>setTimeout(r,5));}throw new Error('App condition did not settle.');}
async function app(t,{page='lesson/lesson-2/learn',author=false,prepare,ownerKeyboard=false,store:providedStore,realHTTP=false,width=1024,navigationPrefs}={}){
  const store=providedStore||new Store();prepare?.(store);const d=new JSDOM('<div id="app"></div><div id="toast"></div>',{url:'http://127.0.0.1/#'+page,runScripts:'outside-only',pretendToBeVisual:true}),w=d.window;
  Object.defineProperty(w,'innerWidth',{value:width,writable:true});let server,origin;
  if(realHTTP){server=createServer(store);await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;}
  t.after(async()=>{w.close();if(server)await new Promise(r=>server.close(r));if(!providedStore)store.close();});w.matchMedia=()=>({matches:false});w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
  if(author)w.localStorage.setItem('hebleo-demo-user','author-demo');
  if(navigationPrefs)w.localStorage.setItem('hebleo-navigation-'+(author?'author-demo':'learner-demo'),JSON.stringify(navigationPrefs));
  if(ownerKeyboard){w.scrollBy=()=>{};w.eval(readFileSync(process.env.HEBLEO_KEYBOARD_SOURCE || new URL('../public/keyboard-owner.js',import.meta.url),'utf8'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));}
  Object.assign(w,ux,reviewScheduler,courseHelpers,learnerView,{structuredClone,resolveBlock,importVocabularyCSV,composeSentence,bindMatching,matchWord,richCell,cellCSS,renderLesson:createLessonRenderer(marked,createPurifier(w),w.document),mountMediaLibrary,mountSourceAuthoring,mountUnifiedStudio,mountImportWorkflow,mountLessonEditor,mountExerciseEditor,inspectImport,renderImportReview,mountLessonPreview,createLearnerRenderer,playAudio:async()=>{},setPlaybackSpeed(){},stopMedia(){},clearRecording(){},feedbackSound(){}});
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

// JSDOM does not lay out viewports. Apply the real loaded stylesheet order with
// only the width media queries matching this fixture; this checks the cascade,
// not pixels or native drawer geometry.
function loadViewportStyles(doc,width){
 const index=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
 for(const [,href]of index.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)){
  const source=href==='/refinement.css'&&process.env.HEBLEO_REFINEMENT_SOURCE?process.env.HEBLEO_REFINEMENT_SOURCE:new URL('../public'+href,import.meta.url),style=doc.createElement('style');style.textContent=readFileSync(source,'utf8');doc.head.append(style);
  const flatten=rules=>[...rules].map(rule=>{if(rule.type!==4)return rule.cssText;const bounds=[...rule.conditionText.matchAll(/(min|max)-width\s*:\s*([\d.]+)px/g)];return bounds.length&&bounds.every(([,kind,size])=>kind==='min'?width>=Number(size):width<=Number(size))?flatten(rule.cssRules):'';}).join('\n');
  const css=flatten(style.sheet.cssRules);style.textContent=css;
 }
}

test('DESIGN13 persistent header exposes all entitled destinations at wide and narrow widths',async t=>{
 for(const width of [1400,960,700,480])await t.test(String(width)+'px source/DOM cascade',async t=>{const {w,doc}=await app(t,{width});loadViewportStyles(doc,width);const nav=doc.querySelector('#main-menu');assert.equal(nav.closest('.app-header')!==null,true);assert.equal(w.getComputedStyle(nav).display,'flex');for(const label of nav.querySelectorAll('.nav-label'))assert.equal(w.getComputedStyle(label).display,'block');assert.deepEqual([...nav.querySelectorAll('[data-action=page]')].map(x=>x.dataset.value),['home','course','review','library','settings']);assert.equal(nav.querySelector('[aria-current=page]').dataset.value,'course');assert.equal(doc.querySelectorAll('[data-action=navigation-toggle]').length,1);assert.equal(doc.querySelector('[data-action=navigation-toggle]').closest('.app-header')!==null,true);assert.ok(doc.querySelector('.app-header #demo-user'));assert.equal(doc.querySelector('.brand').getAttribute('aria-label'),'Hebleo home');assert.equal(doc.querySelector('.brand-logo-slot').dataset.logoStatus,'pending');});
});
test('DESIGN13 single course rail reclaims width without remount, data writes or losing caret',async t=>{
 const {w,doc,calls,store}=await app(t,{page:'lesson/lesson-1/apply',width:1400});const shell=doc.querySelector('.nav-shell'),rail=doc.querySelector('#course-navigation'),answer=doc.querySelector('#answer'),toggle=doc.querySelector('[data-action=navigation-toggle]'),before=structuredClone(store.learner('learner-demo')),count=calls.length;assert.equal(rail.parentElement,doc.querySelector('#main-content').parentElement);assert.equal(doc.querySelector('#main-content').contains(rail),false);answer.value='SYNTHETIC unchanged';answer.focus();answer.setSelectionRange(1,4);
 for(const closed of [true,false,true]){toggle.click();await settled(()=>!toggle.disabled);assert.equal(shell.style.getPropertyValue('--course-track'),closed?'0px':'248px');assert.equal(rail.hidden,closed);assert.equal(toggle.getAttribute('aria-expanded'),String(!closed));assert.equal(doc.querySelector('#answer'),answer);assert.equal(answer.value,'SYNTHETIC unchanged');assert.equal(answer.selectionStart,1);assert.equal(answer.selectionEnd,4);}
 assert.equal(calls.length,count);assert.deepEqual(store.learner('learner-demo'),before);const saved=JSON.parse(w.localStorage.getItem('hebleo-navigation-learner-demo'));assert.equal(saved.course,true);const reloaded=await app(t,{width:1400,navigationPrefs:saved});assert.equal(reloaded.doc.querySelector('.nav-shell').style.getPropertyValue('--course-track'),'0px');
});
test('DESIGN13 outline dismisses narrow drawer for current and different same-lesson portions',async t=>{
 const {w,doc}=await app(t,{width:700});for(const portion of ['learn','vocabulary']){const toggle=doc.querySelector('[data-action=navigation-toggle]');toggle.click();await settled(()=>!toggle.disabled&&doc.querySelector('.nav-shell').dataset.courseOverlay==='true');assert.equal(doc.querySelector('#main-content').hasAttribute('inert'),true);doc.querySelector('[data-action=outline][data-value="lesson-2|'+portion+'"]').click();await settled(()=>doc.querySelector('[data-action=outline][aria-current=step]')?.dataset.value==='lesson-2|'+portion&&doc.querySelector('.nav-shell').dataset.courseOverlay==='false');assert.equal(doc.querySelector('#main-content').hasAttribute('inert'),false);assert.equal(doc.querySelector('#course-navigation').hidden,true);}assert.ok(w.location.hash.includes('vocabulary'));
});
test('DESIGN13 drawer Tab cycle retains header access and excludes hidden chapter descendants; Escape returns toggle focus',async t=>{
 const {w,doc,calls}=await app(t,{width:700});const rail=doc.querySelector('#course-navigation'),chapters=[...rail.querySelectorAll('.course-outline-content>details')],toggle=doc.querySelector('[data-action=navigation-toggle]');chapters[0].open=false;chapters[1].open=true;chapters[2].open=false;toggle.click();await settled(()=>!toggle.disabled);const count=calls.length,last=chapters[2].querySelector(':scope>summary');toggle.focus();toggle.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true,cancelable:true}));assert.equal(doc.activeElement,last);last.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));assert.equal(doc.activeElement,toggle);chapters[2].open=true;const lesson=chapters[2].querySelector('details');lesson.open=false;toggle.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true,cancelable:true}));assert.equal(doc.activeElement,lesson.querySelector('summary'));doc.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));assert.equal(rail.hidden,true);assert.equal(doc.querySelector('#main-content').hasAttribute('inert'),false);assert.equal(doc.activeElement,toggle);assert.equal(calls.length,count);
});
test('DESIGN13 Studio task keys preserve one title editor and unsaved text across all six tasks',async t=>{
 const {w,doc,store}=await app(t,{page:'studio',author:true});const title=doc.querySelector('[name=title]');title.value='SYNTHETIC retained title';title.dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(doc.querySelectorAll('#studio-lesson-metadata [name=title]').length,1);const tabs=[...doc.querySelectorAll('.studio-task-menu [role=tab]')];assert.equal(tabs.length,6);tabs[0].focus();tabs[0].dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));await settled(()=>tabs[1].getAttribute('aria-selected')==='true');assert.equal(doc.activeElement,tabs[1]);assert.equal(doc.querySelector('[name=title]'),title);assert.equal(title.value,'SYNTHETIC retained title');tabs[1].dispatchEvent(new w.KeyboardEvent('keydown',{key:'End',bubbles:true,cancelable:true}));await settled(()=>tabs[5].getAttribute('aria-selected')==='true');tabs[5].dispatchEvent(new w.KeyboardEvent('keydown',{key:'Home',bubbles:true,cancelable:true}));await settled(()=>tabs[0].getAttribute('aria-selected')==='true');assert.equal(title.value,'SYNTHETIC retained title');assert.equal(store.currentDraft(),null);
});
test('DESIGN13 library search clears immediately and Cards/Table use identical multi-lesson membership',async t=>{
 const {w,doc}=await app(t,{page:'library',prepare(store){const c=store.snapshot();c.lessons[1].wordIds.push('w-ani');const d=store.stage({baseRevisionId:1,expectedDraftToken:null,content:c});store.publish(1,d.draftToken);}});const input=doc.querySelector('#library-search');input.value='I';input.dispatchEvent(new w.Event('input',{bubbles:true}));const clear=doc.querySelector('[data-action=library-clear]');assert.ok(clear);clear.click();await settled(()=>!doc.querySelector('[data-action=library-clear]'));assert.equal(doc.querySelector('#library-search').value,'');assert.equal(doc.activeElement,doc.querySelector('#library-search'));doc.querySelector('#library-lesson').value='lesson-2';doc.querySelector('#library-lesson').dispatchEvent(new w.Event('change'));const cards=[...doc.querySelectorAll('.word-card [data-action=note-open]')].map(x=>x.dataset.value);assert.ok(cards.includes('w-ani'));doc.querySelector('[data-action=vocab-view][data-value=table]').click();await settled(()=>doc.querySelector('.vocabulary-table'));const rows=[...doc.querySelectorAll('.vocabulary-table [data-action=note-open]')].map(x=>x.dataset.value);assert.deepEqual(rows,cards);assert.equal(doc.querySelectorAll('.vocabulary-table [data-action=lookup]').length,cards.length);
});

test('UX2333 compact composers collapse replies and preserve dirty reply and lesson title through task switches',async t=>{
 const {store,w,doc}=await app(t,{page:'studio',author:true,prepare(s){s.askQuestion('learner-demo',{requestId:randomUUID(),revisionId:1,lessonId:'lesson-1',discussionVersion:1,question:'SYNTHETIC reply topic'});}});const style=doc.createElement('style');style.textContent=readFileSync(new URL('../public/refinement.css',import.meta.url),'utf8');doc.head.append(style);
 const title=doc.querySelector('[name=title]');title.value='SYNTHETIC dirty title';title.dispatchEvent(new w.Event('input',{bubbles:true}));doc.querySelector('[data-action=studio-task][data-value=comments]').click();const details=doc.querySelector('.reply-composer');assert.equal(details.open,false);details.querySelector('summary').click();await settled(()=>details.open&&doc.activeElement===details.querySelector('textarea'));const text=details.querySelector('textarea');assert.equal(w.getComputedStyle(text).width,'100%');assert.equal(w.getComputedStyle(text).minHeight,'88px');assert.equal(w.getComputedStyle(text.closest('label')).display,'grid');text.value='SYNTHETIC dirty reply';details.querySelector('[data-action=reply-cancel]').click();assert.equal(details.open,false);doc.querySelector('[data-action=studio-task][data-value=sources]').click();doc.querySelector('[data-action=studio-task][data-value=comments]').click();assert.equal(doc.querySelector('.reply-composer').open,false);doc.querySelector('.reply-composer summary').click();await settled(()=>doc.querySelector('.reply-composer').open);assert.equal(doc.querySelector('[data-question-answer] textarea').value,'SYNTHETIC dirty reply');assert.equal(title.value,'SYNTHETIC dirty title');assert.equal(title.isConnected,true);assert.equal(store.currentDraft(),null);
});

test('UX2333 private note save has matching Card Table and full-entry visibility and stays out of another profile and preview',async t=>{
 const {store,w,doc}=await app(t,{page:'library',realHTTP:true});const beforeSource=structuredClone(store.snapshot().words);const sam=store.bootstrap('learner-demo').users.find(u=>u.name==='Sam').id;doc.querySelector('[data-action=note-open][data-value=w-ani]').click();doc.querySelector('#personal-note').value='SYNTHETIC private note: אֲנִי  exact';click(doc,'save-panel-note');await settled(()=>!doc.querySelector('#context-panel'));const note=store.learner('learner-demo').notes['w-ani'];assert.equal(note,'SYNTHETIC private note: אֲנִי  exact');const card=doc.querySelector('[data-action=note-open][data-value=w-ani]').closest('.word-card');assert.ok(card.textContent.includes(note));assert.ok(card.querySelector('details').textContent.includes(note));const other=doc.querySelector('[data-action=note-open]:not([data-value=w-ani])').closest('.word-card');assert.ok(!other.textContent.includes(note));doc.querySelector('[data-action=vocab-view][data-value=table]').click();await settled(()=>doc.querySelector('.vocabulary-table'));assert.ok(doc.querySelector('[data-action=note-open][data-value=w-ani]').closest('tr').textContent.includes(note));doc.querySelector('[data-action=lookup][data-value=w-ani]').click();assert.ok(doc.querySelector('#context-panel .personal-note-summary').textContent.includes(note));assert.equal(doc.querySelector('#personal-note').value,note);assert.deepEqual(store.snapshot().words,beforeSource);assert.equal(store.questions('author-demo').length,0);
 click(doc,'panel-close');const user=doc.querySelector('#demo-user');user.value=sam;user.dispatchEvent(new w.Event('change'));await settled(()=>doc.querySelector('h1')?.textContent.includes('Welcome back, Sam'));assert.equal(store.learner(sam).notes['w-ani'],undefined);assert.ok(!doc.querySelector('#app').textContent.includes(note));
 const {wordCard}=learnerView;assert.ok(!wordCard(store.snapshot().words.find(x=>x.id==='w-ani')).includes(note));
});

test('UX2333 word-comment control posts to its lesson discussion rather than the private-note store',async t=>{
 const {store,w,doc}=await app(t,{page:'library',realHTTP:true});doc.querySelector('[data-action=lookup][data-value=w-ani]').click();const control=doc.querySelector('[data-action=help-word]');assert.ok(control.textContent.includes('lesson discussion'));control.click();await settled(()=>doc.querySelector('#author-question-form'));assert.ok(doc.querySelector('.word-comment-destination').textContent.includes('separate from Your private note'));const form=doc.querySelector('#author-question-form');form.querySelector('textarea').value='SYNTHETIC public word-linked comment';form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await settled(()=>store.questions('author-demo').length===1&&doc.querySelector('#context-panel').textContent.includes('SYNTHETIC public word-linked comment'));const q=store.questions('author-demo')[0];assert.equal(q.wordId,'w-ani');assert.equal(q.lessonId,'lesson-1');assert.equal(q.discussionVersion,1);assert.equal(store.learner('learner-demo').notes['w-ani'],undefined);doc.querySelector('[data-action=word-discussion]').click();await settled(()=>doc.querySelector('#lesson-comments .comment-text'));assert.ok(doc.querySelector('#lesson-comments').textContent.includes('SYNTHETIC public word-linked comment'));assert.ok(doc.querySelector('.comment-word-context').textContent.includes('I'));
});

test('UX2333 reply pending and failure retain exact text and leave unrelated Studio input intact',async t=>{
 const {store,w,doc}=await app(t,{page:'studio',author:true,realHTTP:true,prepare(s){s.askQuestion('learner-demo',{requestId:randomUUID(),revisionId:1,lessonId:'lesson-1',discussionVersion:1,question:'SYNTHETIC pending reply'});}});const title=doc.querySelector('[name=title]');title.value='SYNTHETIC title retained';title.dispatchEvent(new w.Event('input',{bubbles:true}));doc.querySelector('[data-action=studio-task][data-value=comments]').click();const details=doc.querySelector('.reply-composer');details.querySelector('summary').click();await settled(()=>details.open);const form=details.querySelector('form'),text=form.querySelector('textarea');text.value='SYNTHETIC exact reply  two spaces';const old=w.fetch;let release;w.fetch=async(url,options)=>url==='/api/questions/answer'&&options?.method==='POST'?new Promise(r=>{release=()=>r({ok:false,status:503,json:async()=>({error:'SYNTHETIC retry later'})});}):old(url,options);
 form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await settled(()=>release);assert.equal(text.readOnly,true);assert.equal(form.querySelector('button').disabled,true);release();await settled(()=>form.querySelector('[data-reply-status]').textContent==='SYNTHETIC retry later');assert.equal(text.value,'SYNTHETIC exact reply  two spaces');assert.equal(text.readOnly,false);assert.equal(title.value,'SYNTHETIC title retained');assert.equal(store.questions('author-demo')[0].answer,'');
 w.fetch=old;form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await settled(()=>store.questions('author-demo')[0].answer==='SYNTHETIC exact reply  two spaces'&&!doc.querySelector('.reply-composer').open);assert.equal(title.value,'SYNTHETIC title retained');
});

test('OCT12 lesson practice uses existing missed-item context and keeps its optional exit',async t=>{
 const {store,doc}=await app(t,{page:'course',realHTTP:true,prepare(s){s.attempt('learner-demo',{requestId:randomUUID(),revisionId:1,exerciseId:'ex-1-type',answer:'wrong'});}});
 const entry=doc.querySelector('[data-action=lesson-practice][data-value=lesson-1]');assert.ok(entry);entry.click();
 await settled(()=>doc.querySelector('#practice [data-action=step][data-value=complete]')&&store.learner('learner-demo').resumes['lesson-1']?.practiceIds?.length);
 const resume=store.learner('learner-demo').resumes['lesson-1'];assert.deepEqual(resume.practiceIds,['ex-1-type']);assert.equal(resume.revisionId,1);
 assert.ok(doc.querySelector('#practice [data-action=step][data-value=complete]').textContent.includes('Skip extra practice'));assert.equal(store.learner('learner-demo').attempts.length,1);assert.deepEqual(store.learner('learner-demo').completed,[]);
});

test('OCT12 left outline and private notes remain discoverable through reload-equivalent navigation',async t=>{
 const {store,w,doc}=await app(t,{page:'lesson/lesson-1/vocabulary',prepare(s){s.updateLearner('learner-demo',{note:{wordId:'w-ani',text:'SYNTHETIC private learner note'}});}});
 assert.equal(doc.querySelector('#course-navigation').parentElement,doc.querySelector('#main-content').parentElement);assert.equal(doc.querySelector('.lesson-comments').closest('.lesson-layout'),null);assert.ok(doc.querySelector('[data-lesson-comment]'));
 const toc=doc.querySelector('.app-header [data-action=navigation-toggle]');toc.click();await settled(()=>doc.querySelector('.nav-shell').dataset.courseCollapsed==='true');
 doc.querySelector('[data-action=step][data-value=learn]').click();await settled(()=>doc.querySelector('#practice .explanation'));assert.equal(doc.querySelector('.nav-shell').dataset.courseCollapsed,'true');
 doc.querySelector('[data-action=step][data-value=vocabulary]').click();await settled(()=>doc.querySelector('.personal-note-summary'));assert.ok(doc.querySelector('#app').textContent.includes('SYNTHETIC private learner note'));
 doc.querySelector('[data-action=note-open][data-value=w-ani]').click();assert.equal(doc.querySelector('#personal-note').value,'SYNTHETIC private learner note');doc.querySelector('#personal-note').value='SYNTHETIC amended private note';click(doc,'save-panel-note');await settled(()=>!doc.querySelector('#context-panel'));assert.equal(store.learner('learner-demo').notes['w-ani'],'SYNTHETIC amended private note');
 doc.querySelector('[data-action=vocab-view][data-value=table]').click();await settled(()=>doc.querySelector('.vocabulary-table'));assert.ok(doc.querySelector('.vocabulary-table').textContent.includes('SYNTHETIC amended private note'));assert.ok(doc.querySelector('.vocabulary-table thead').textContent.includes('Your private note'));
 const sam=store.bootstrap('learner-demo').users.find(u=>u.name==='Sam').id;const user=doc.querySelector('#demo-user');user.value=sam;user.dispatchEvent(new w.Event('change'));await settled(()=>doc.querySelector('#demo-user').value===sam&&!doc.querySelector('#app').textContent.includes('SYNTHETIC amended private note'));assert.equal(store.learner(sam).notes['w-ani'],undefined);
});

test('OCT12 task switching and moderation retain unsaved title and reply, with a paged author feed',async t=>{
 const {store,w,doc}=await app(t,{page:'studio',author:true,realHTTP:true,prepare(s){for(let i=0;i<23;i++)s.askQuestion('learner-demo',{requestId:randomUUID(),revisionId:1,lessonId:'lesson-1',discussionVersion:1,anonymous:true,question:'SYNTHETIC comment '+i});}});
 const title=doc.querySelector('[name=title]');title.value='SYNTHETIC unsaved title';title.dispatchEvent(new w.Event('input',{bubbles:true}));const beforeToken=store.currentDraft()?.draftToken??null;
 doc.querySelector('[data-action=studio-task][data-value=sources]').click();assert.equal(doc.querySelector('[data-studio-pane=sources]').hidden,false);assert.equal(doc.querySelector('[name=title]'),title);assert.equal(title.value,'SYNTHETIC unsaved title');
 doc.querySelector('[data-action=studio-task][data-value=comments]').click();assert.equal(doc.querySelectorAll('[data-comment-feed] .question-item').length,20);assert.equal(doc.querySelector('[data-studio-pane=media]').hidden,true);
 const reply=doc.querySelector('[data-question-answer] textarea');reply.value='SYNTHETIC unsaved reply';doc.querySelector('[data-action=studio-task][data-value=media]').click();doc.querySelector('[data-action=studio-task][data-value=comments]').click();assert.equal(doc.querySelector('[data-question-answer] textarea').value,'SYNTHETIC unsaved reply');
 const hide=doc.querySelector('[data-action=comment-moderate][data-value$="|remove"]');assert.ok(hide.textContent.includes('Reject'));hide.click();await settled(()=>store.questions('author-demo').some(q=>q.visibility==='removed'));assert.equal(title.isConnected,true);assert.equal(title.value,'SYNTHETIC unsaved title');assert.equal(store.currentDraft()?.draftToken??null,beforeToken);
 doc.querySelector('[data-action=comment-page][data-value="1"]').click();assert.equal(doc.querySelectorAll('[data-comment-feed] .question-item').length,3);doc.querySelector('[data-action=comment-page][data-value="0"]').click();assert.equal(doc.querySelector('[data-question-answer] textarea').value,'SYNTHETIC unsaved reply');
 doc.querySelector('[data-action=studio-task][data-value=lesson]').click();assert.equal(doc.querySelector('[name=title]').value,'SYNTHETIC unsaved title');
});

test('OCT12 inline comment posting retains rejected input and uses existing scoped anonymous projection',async t=>{
 const {store,w,doc}=await app(t,{page:'lesson/lesson-1/learn',realHTTP:true});const form=doc.querySelector('[data-lesson-comment]');assert.ok(form);form.querySelector('textarea').value='SYNTHETIC anonymous inline comment';form.querySelector('[name=anonymous]').checked=true;
 const oldFetch=w.fetch;let reject=true;w.fetch=async(path,options)=>path==='/api/questions'&&options?.method==='POST'&&reject?{ok:false,status:403,json:async()=>({error:'SYNTHETIC denied'})}:oldFetch(path,options);
 form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await settled(()=>form.querySelector('[data-comment-status]').textContent==='SYNTHETIC denied');assert.equal(form.querySelector('textarea').value,'SYNTHETIC anonymous inline comment');assert.equal(store.questions('author-demo').length,0);
 reject=false;form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await settled(()=>doc.querySelector('.comment-text'));assert.equal(form.querySelector('textarea').value,'');const q=store.questions('author-demo')[0];assert.equal(q.lessonId,'lesson-1');assert.equal(q.revisionId,1);assert.equal(q.anonymous,true);assert.ok(doc.querySelector('[data-comment-feed]').textContent.includes('Anonymous'));assert.ok(!doc.querySelector('[data-comment-feed]').textContent.includes('learner-demo'));
});

test('FB8 outside first-click lifecycle: Check and concept survive typing/cloze, closed/open/pinned keyboards and old revision pins',async t=>{
  for(const cloze of [false,true])for(const mode of ['closed','open','pinned'])for(const action of ['concept','check'])await t.test((cloze?'cloze':'typing')+' '+mode+' '+action,async t=>{
    const lessonId=cloze?'lesson-2':'lesson-1',exerciseId=cloze?'ex-2-cloze':'ex-1-type',text=cloze?'היא':'אני';
    const {store,w,doc,calls}=await app(t,{page:'lesson/'+lessonId+'/apply',ownerKeyboard:true,realHTTP:true,prepare(s){
      s.updateLearner('learner-demo',{keyboardPinned:mode==='pinned'});
      s.saveProgress('learner-demo',{lessonId,revisionId:1,step:'apply',question:cloze?1:0,answer:text,matching:{},selectedTokens:[],resultRequestId:null,practiceIds:[]});
      const content=s.snapshot();content.lessons.find(l=>l.id===lessonId).title+=' SYNTHETIC next release';const draft=s.stage({content,baseRevisionId:1,expectedDraftToken:null});s.publish(1,draft.draftToken);
    }});
    assert.ok(doc.querySelector('.hint').textContent.includes('earlier lesson'));assert.equal(doc.querySelector('#answer').value,text);
    const support=doc.querySelector('#practice .keyboard-tools');assert.equal(support.querySelector('[data-action=concept]').dataset.action,'concept');assert.ok(doc.querySelector('#practice .answer-commit [data-action=check]'));assert.equal(doc.querySelector('#answer').tagName,'TEXTAREA');
    if(mode!=='closed')click(doc,'keyboard-open');
    const answerBefore=doc.querySelector('#answer');answerBefore.setSelectionRange(1,2);const el=doc.querySelector('#practice [data-action="'+action+'"]'),seen=calls.length;
    el.dispatchEvent(new w.MouseEvent('pointerdown',{bubbles:true,cancelable:true}));
    assert.equal(el.isConnected,true);assert.equal(doc.querySelector('#practice [data-action="'+action+'"]'),el);
    if(mode!=='closed')assert.ok(doc.body.classList.contains('hebleo-keyboard-is-open'),'layout must survive pointerdown until click target is resolved');
    el.dispatchEvent(new w.MouseEvent('pointerup',{bubbles:true,cancelable:true}));el.click();
    if(action==='concept'){
      await settled(()=>doc.querySelector('#inline-concept'));assert.equal(doc.querySelector('#answer'),answerBefore);assert.equal(store.learner('learner-demo').attempts.length,0);assert.equal(calls.slice(seen).filter(p=>p==='/api/attempt').length,0);
      assert.equal(doc.querySelector('#answer').value,text);click(doc,'inline-concept-close');assert.equal(doc.querySelector('#answer').value,text);assert.equal(doc.activeElement,doc.querySelector('#answer'));assert.equal(doc.querySelector('#answer').selectionStart,1);assert.equal(doc.querySelector('#answer').selectionEnd,2);
      const answer=doc.querySelector('#answer');answer.focus();answer.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
    }
    await settled(()=>doc.querySelector('#practice .feedback'));
    const attempts=store.learner('learner-demo').attempts;assert.equal(attempts.length,1);assert.equal(attempts[0].correct,true);assert.equal(attempts[0].exerciseId,exerciseId);assert.equal(attempts[0].revisionId,1);
    assert.equal(store.learner('learner-demo').resumes[lessonId].resultRequestId,attempts[0].requestId);
    assert.equal(Boolean(doc.querySelector('.hebleo-keyboard--open')),false,'graded/non-typing state closes dock even when Keep open is enabled');
  });
});

test('FB8 saved-draft Preview swaps controls, preserves typed answer through concept and inline keyboard, and grades with zero stored writes',async t=>{
  const {store,w,doc}=await app(t,{page:'studio',author:true,realHTTP:true,ownerKeyboard:true,prepare(s){stageDraft(s,c=>{c.lessons[0].title+=' SYNTHETIC preview';});}});
  click(doc,'rehearse');await settled(()=>doc.querySelector('[data-preview-step="apply"]'));
  const before=tables(store),inside=s=>doc.querySelector('#rehearsal-panel '+s);
  inside('[data-preview-step="apply"]').click();await settled(()=>inside('#answer'));
  let answer=inside('#answer');answer.value='אני';answer.dispatchEvent(new w.Event('input',{bubbles:true}));
  inside('[data-preview-owner-keyboard]').click();await settled(()=>doc.querySelector('.hebleo-keyboard--open'));assert.equal(doc.querySelectorAll('.hebleo-keyboard [data-insert]').length>=33,true);
  assert.ok(inside('.keyboard-tools [data-action=concept]'));assert.ok(inside('.answer-commit [data-action=check]'));answer.setSelectionRange(1,2);
  const concept=inside('[data-action="concept"]');concept.dispatchEvent(new w.MouseEvent('pointerdown',{bubbles:true}));concept.dispatchEvent(new w.MouseEvent('pointerup',{bubbles:true}));concept.click();
  assert.ok(inside('.preview-concept'));assert.equal(inside('#answer').value,'אני');assert.equal(doc.activeElement,inside('#answer'));assert.equal(inside('#answer').selectionStart,1);assert.equal(inside('#answer').selectionEnd,2);assert.deepEqual(tables(store),before);
  inside('[data-action="concept-close"]').click();const check=inside('[data-action="check"]');check.dispatchEvent(new w.MouseEvent('pointerdown',{bubbles:true}));check.dispatchEvent(new w.MouseEvent('pointerup',{bubbles:true}));check.click();await settled(()=>inside('.feedback'));
  assert.ok(inside('.feedback').textContent.includes('right'));assert.deepEqual(tables(store),before);
});

test('FB8 actual lesson comments post anonymously, render to another learner without identity and disappear after Author Remove',async t=>{
  const {store,w,doc}=await app(t,{page:'lesson/lesson-1/learn',realHTTP:true});click(doc,'help');await settled(()=>doc.querySelector('#author-question-form'));
  const form=doc.querySelector('#author-question-form');form.elements.question.value='SYNTHETIC anonymous discussion';form.elements.anonymous.checked=true;form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await settled(()=>store.questions('author-demo').length===1&&doc.querySelector('#context-panel .question-item'));
  const q=store.questions('author-demo')[0];assert.equal(q.anonymous,true);assert.equal(q.revisionId,1);
  const sam=await app(t,{page:'lesson/lesson-1/learn',store,realHTTP:true});sam.doc.querySelector('#demo-user').value='learner-core';sam.doc.querySelector('#demo-user').dispatchEvent(new sam.w.Event('change',{bubbles:true}));await settled(()=>sam.doc.querySelector('h1').textContent.includes('Sam'));
  sam.doc.querySelector('[data-action="lesson"][data-value="lesson-1"]').click();await settled(()=>sam.doc.querySelector('.question-item'));
  assert.ok(sam.doc.querySelector('.question-item').textContent.includes('Anonymous'));assert.equal(sam.doc.querySelector('.question-item').outerHTML.includes('Alex'),false);assert.equal(sam.doc.querySelector('.question-item').outerHTML.includes('learner-demo'),false);
  const authorApp=await app(t,{page:'studio',author:true,store,realHTTP:true});const remove=authorApp.doc.querySelector('[data-action="comment-moderate"][data-value$="|remove"]');assert.ok(remove);remove.click();await settled(()=>store.questions('learner-core').length===0);
  assert.equal(store.questions('author-demo')[0].visibility,'removed');assert.equal(store.questions('author-demo')[0].moderation[0].action,'remove');
  const reloaded=await app(t,{page:'lesson/lesson-1/learn',store,realHTTP:true});assert.equal(reloaded.doc.querySelector('.question-item'),null);
});

test('FB8 actual review buttons show shared scheduler durations and refresh after Undo',async t=>{
  const {store,doc}=await app(t,{page:'review',realHTTP:true,prepare(s){s.enroll('learner-demo','w-ani');const state=s.learner('learner-demo');state.cards['w-ani'].intervalDays=4;state.cards['w-ani'].repetitions=3;s.saveLearner('learner-demo',state);}});
  click(doc,'review-start');await settled(()=>doc.querySelector('[data-action="review-reveal"]'));click(doc,'review-reveal');
  const labels=()=>[...doc.querySelectorAll('[data-action="review-rate"]')].map(el=>el.textContent);
  assert.deepEqual(labels(),['Again 10 minutes','Hard 1 day','Good 8 days','Easy 12 days']);
  const before=structuredClone(store.learner('learner-demo').cards['w-ani']);doc.querySelector('[data-action="review-rate"][data-value="3"]').click();await settled(()=>store.learner('learner-demo').lastReview&&doc.querySelector('[data-action="review-undo"]'));
  assert.equal(store.learner('learner-demo').cards['w-ani'].intervalDays,8);click(doc,'review-undo');await settled(()=>doc.querySelector('[data-action="review-reveal"]'));assert.deepEqual(store.learner('learner-demo').cards['w-ani'],before);
  click(doc,'review-reveal');assert.deepEqual(labels(),['Again 10 minutes','Hard 1 day','Good 8 days','Easy 12 days']);
});

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
test('Studio edits author card policy and cumulative introductions while retaining legacy keyboard metadata',async t=>{
 const {store,w,doc}=await app(t,{page:'studio',author:true});await settled(()=>doc.querySelector('[data-review-policy-form]'));
 const initial=structuredClone(store.snapshot().lessons[0].keyboard),form=doc.querySelector('[data-review-policy-form]');edit(w,form.querySelector('select'),'none');submit(w,form);await settled(()=>store.currentDraft()?.content.reviewPolicy.defaultNikkud==='none'&&doc.querySelector('[data-action="publish"]'));
 click(doc,'publish');await settled(()=>store.snapshot().reviewPolicy.defaultNikkud==='none'&&doc.body.textContent.includes('PUBLISHED VERSION 2'));
 const lesson=doc.querySelector('[data-lesson-metadata]');edit(w,lesson.elements.introducedLetters,'ב');edit(w,doc.querySelector('[data-keyboard-color]'),'#abcdef');submit(w,lesson);await settled(()=>store.currentDraft()?.content.lessons[0].introducedLetters==='ב');
 assert.equal(doc.querySelector('[name="knownKeys"]'),null);assert.equal(store.currentDraft().content.lessons[0].keyboard.newKeys,initial.newKeys);assert.equal(store.currentDraft().content.lessons[0].keyboard.knownKeys,initial.knownKeys);assert.equal(store.currentDraft().content.lessons[0].keyboard.newColor,'#abcdef');
});

test('Actual app launcher focuses the native answer field and saves pinning through the learner preference API',async t=>{
  const {store,w,doc}=await app(t,{page:'lesson/lesson-1/apply',ownerKeyboard:true});
  click(doc,'keyboard-open');const answer=doc.querySelector('#answer');
  await settled(()=>doc.activeElement===answer);assert.equal(answer.readOnly,false);
  doc.querySelector('[data-insert="א"]').click();assert.equal(answer.value,'א');
  doc.querySelector('[data-action="pin"]').click();await settled(()=>store.learner('learner-demo').preferences.keyboardPinned);
  doc.querySelector('h1').dispatchEvent(new w.Event('pointerdown',{bubbles:true}));doc.querySelector('h1').click();
  assert.ok(doc.querySelector('.hebleo-keyboard--open'));
  doc.querySelector('[data-action="pin"]').click();await settled(()=>!store.learner('learner-demo').preferences.keyboardPinned);
  doc.querySelector('h1').dispatchEvent(new w.Event('pointerdown',{bubbles:true}));doc.querySelector('h1').click();assert.equal(doc.querySelector('.hebleo-keyboard--open'),null);
});
test('Lesson help exposes an actual question form and saves it to the author inbox',async t=>{
  const {store,w,doc}=await app(t);click(doc,'help');await settled(()=>doc.querySelector('#author-question-form'));
  const form=doc.querySelector('#author-question-form');form.elements.question.value='Why is this prefix used?';form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await settled(()=>store.questions('author-demo').length===1);assert.equal(store.questions('author-demo')[0].lessonId,'lesson-2');
});

test('Learner keyboard shortcuts never activate or handle controls inside a rehearsal root',async t=>{
  const {w,doc}=await app(t,{page:'lesson/lesson-2/learn'});
  const host=doc.createElement('div');host.dataset.previewRoot='';host.innerHTML='<button data-action="check">Check</button><button data-action="choice">One</button><button data-action="next-question">Next</button><button data-action="audio-replay">Replay</button><input id="answer">';doc.body.append(host);
  let clicks=0;host.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>clicks++));
  for(const key of ['Enter',' ','1','r'])doc.body.dispatchEvent(new w.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));
  const inside=new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true});host.querySelector('input').dispatchEvent(inside);
  host.querySelector('button').dispatchEvent(new w.KeyboardEvent('keydown',{key:'1',bubbles:true,cancelable:true}));
  assert.equal(clicks,0);assert.equal(inside.defaultPrevented,false,'the learner handler leaves rehearsal keys to the rehearsal');
});

// Studio integration: actual app.js wiring of the guided editors, import review and disposable rehearsal.
const learnerIds=['learner-demo','learner-core','author-demo'];
const tables=store=>Object.fromEntries(store.db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(({name})=>[name,store.db.prepare('SELECT * FROM "'+name+'" ORDER BY rowid').all().map(row=>({...row}))]));
const learnerRecords=store=>learnerIds.map(id=>store.learner(id));
const edit=(w,el,value)=>{el.value=value;el.dispatchEvent(new w.Event('input',{bubbles:true}));};
const submit=(w,form)=>form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
const stageDraft=(s,change)=>{const c=structuredClone(s.currentDraft()?.content||s.snapshot());change(c);return s.stage({baseRevisionId:s.get('active'),expectedDraftToken:s.currentDraft()?.draftToken??null,content:c});};
const draftPrompt='Synthetic draft prompt: choose the meaning.';

test('G5-01 actual app over HTTP: a second author window saves while rehearsal retains its typed answer frozen; Escape restores focus',async t=>{
  const store=new Store();t.after(()=>store.close());
  stageDraft(store,c=>{c.exercises[0].prompt=draftPrompt;});
  const a=await app(t,{page:'studio',author:true,store,realHTTP:true});
  const b=await app(t,{page:'studio',author:true,store,realHTTP:true});
  await settled(()=>a.doc.querySelector('[data-action="rehearse"]:not([disabled])')&&b.doc.querySelector('[data-owned-exercise="ex-1-recognize"] form'));
  click(a.doc,'rehearse');await settled(()=>a.doc.querySelector('#rehearsal-panel [data-preview-step="apply"]'));
  const dialog=()=>a.doc.querySelector('#rehearsal-panel');
  dialog().querySelector('[data-preview-step="apply"]').click();
  const answer=dialog().querySelector('#answer');edit(a.w,answer,'אני');
  const form=b.doc.querySelector('[data-owned-exercise="ex-1-type"] form');edit(b.w,form.elements.prompt,'Synthetic G5-01 two-window change');submit(b.w,form);
  await settled(()=>store.currentDraft().content.exercises.find(e=>e.id==='ex-1-type').prompt==='Synthetic G5-01 two-window change');
  const baseline=tables(store),learners=learnerRecords(store),published=store.snapshot(),seen=a.calls.length;
  answer.focus();answer.dispatchEvent(new a.w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
  await settled(()=>dialog().querySelector('[data-preview-frozen]'));
  assert.equal(dialog().querySelector('#answer').value,'אני');assert.equal(dialog().querySelector('#answer').readOnly,true);
  assert.equal(dialog().querySelector('#answer').disabled,true);assert.equal(dialog().querySelector('.feedback'),null);
  assert.equal(a.doc.activeElement,dialog().querySelector('[data-preview-exit]'));
  for(const key of ['1','Enter'])dialog().querySelector('.learner-preview').dispatchEvent(new a.w.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));
  assert.deepEqual(a.calls.slice(seen),['/api/studio/preview/evaluate']);
  assert.deepEqual(tables(store),baseline);assert.deepEqual(learnerRecords(store),learners);assert.deepEqual(store.snapshot(),published);
  dialog().dispatchEvent(new a.w.Event('cancel',{cancelable:true}));await settled(()=>!dialog());
  assert.equal(a.doc.activeElement,a.doc.querySelector('[data-action="rehearse"]'));
});

test('G5 automated HTTP overlap: learner autosave response is pending when Studio navigation starts, flush completes before rehearsal and preview writes nothing',async t=>{
  const h=await app(t,{page:'lesson/lesson-1/apply',author:true,realHTTP:true,prepare(s){stageDraft(s,c=>{c.exercises[0].prompt=draftPrompt;});}});
  const {store,w,doc,calls}=h,published=store.snapshot(),before=tables(store),otherProfiles=learnerRecords(store).slice(0,2);
  const original=w.fetch,payloads=[];let release,arrived;
  const blocked=new Promise(r=>release=r),firstResponse=new Promise(r=>arrived=r);
  t.after(()=>release());
  w.fetch=async(path,options={})=>{
    const progress=new URL(path,w.location.href).pathname==='/api/progress';
    if(progress)payloads.push(JSON.parse(options.body));
    const result=await original(path,options);
    if(progress&&payloads.length===1){arrived();await blocked;}
    return result;
  };
  edit(w,doc.querySelector('#answer'),'אני');await firstResponse;
  const seen=calls.length;
  doc.querySelector('[data-action="page"][data-value="studio"]').click();
  await new Promise(r=>setTimeout(r,25));
  assert.equal(w.location.hash,'#lesson/lesson-1/apply','navigation waits for the pending real response');
  assert.ok(doc.querySelector('#answer'));assert.equal(doc.querySelector('#rehearsal-panel'),null);
  assert.equal(calls.slice(seen).includes('/api/studio'),false);
  release();await settled(()=>w.location.hash==='#studio'&&doc.querySelector('[data-action="rehearse"]:not([disabled])'));
  assert.equal(payloads.length,2,'autosave plus intentional navigation flush');
  assert.ok(payloads.every(p=>p.answer==='אני'&&p.lessonId==='lesson-1'));
  const afterFlush=tables(store);assert.deepEqual(learnerRecords(store).slice(0,2),otherProfiles);
  for(const table of Object.keys(before).filter(name=>name!=='learners'))assert.deepEqual(afterFlush[table],before[table],table+' did not change');
  assert.equal(store.learner('author-demo').resumes['lesson-1'].answer,'אני');assert.deepEqual(store.snapshot(),published);
  const previewSeen=calls.length;click(doc,'rehearse');await settled(()=>doc.querySelector('#rehearsal-panel [data-preview-step="apply"]'));
  doc.querySelector('#rehearsal-panel [data-preview-step="apply"]').click();edit(w,doc.querySelector('#rehearsal-panel #answer'),'הוא');
  doc.querySelector('#rehearsal-panel [data-preview-exit]').click();
  await new Promise(r=>setTimeout(r,450));
  assert.deepEqual(calls.slice(previewSeen),['/api/studio/preview/session']);assert.deepEqual(tables(store),afterFlush);
  assert.equal(store.learner('author-demo').resumes['lesson-1'].answer,'אני');
});

test('G5 automated HTTP owner-event: the real keyboard Pin handler emits its preference event during rehearsal and app persistence is suppressed until Exit',async t=>{
  const {store,w,doc,calls}=await app(t,{page:'studio',author:true,ownerKeyboard:true,realHTTP:true,prepare(s){stageDraft(s,c=>{c.exercises[0].prompt=draftPrompt;});}});
  await settled(()=>doc.querySelector('[data-action="rehearse"]:not([disabled])'));
  const events=[];w.addEventListener('hebleo-keyboard-preference',event=>events.push(structuredClone(event.detail)));
  const before=tables(store),seen=calls.length,pin=()=>doc.querySelector('#hebleo-keyboard-root [data-action="pin"]');
  click(doc,'rehearse');await settled(()=>doc.querySelector('#rehearsal-panel .learner-preview'));
  assert.ok(pin());pin().click();await new Promise(r=>setTimeout(r,25));
  assert.equal(events.length,1);assert.equal(events[0].keyboardPinned,true,'event originates in the actual owner keyboard click handler');
  assert.deepEqual(calls.slice(seen),['/api/studio/preview/session']);assert.deepEqual(tables(store),before);
  doc.querySelector('#rehearsal-panel [data-preview-exit]').click();
  assert.equal(pin().getAttribute('aria-pressed'),'false','Exit restores the persisted pin preference before a new click');
  const beforePreference=store.db.prepare('SELECT total_changes() AS n').get().n;
  pin().click();await settled(()=>calls.includes('/api/preferences'));
  await settled(()=>store.db.prepare('SELECT total_changes() AS n').get().n>beforePreference);
  assert.equal(store.learner('author-demo').preferences.keyboardPinned,true);
  assert.equal(events.length,2,'same handler operates after disposal');
  assert.equal(calls.filter(path=>path==='/api/preferences').length,1,'positive control proves active persistence outside rehearsal');
});

test('Studio guided exercise and lesson forms save private drafts, reload discards unsaved edits, a stale token keeps entered values, and publishing stays separate',async t=>{
  const {store,w,doc}=await app(t,{page:'studio',author:true});
  const exerciseForm=()=>doc.querySelector('[data-owned-exercise="ex-1-recognize"] form'),lessonForm=()=>doc.querySelector('[data-lesson-metadata]');
  await settled(()=>exerciseForm()&&lessonForm());
  const published=structuredClone(store.snapshot()),revision=store.get('active'),learners=learnerRecords(store);
  assert.equal(doc.querySelector('[data-action="rehearse"]').disabled,true,'rehearsal needs an explicitly saved draft');
  assert.equal(doc.querySelector('#guided-exercise'),null,'every owned exercise is inline in learner order');
  edit(w,exerciseForm().elements.prompt,draftPrompt);submit(w,exerciseForm());
  await settled(()=>store.currentDraft()?.content.exercises.find(e=>e.id==='ex-1-recognize').prompt===draftPrompt&&doc.querySelector('[data-action="rehearse"]:not([disabled])'));
  assert.deepEqual(store.snapshot(),published);assert.equal(store.get('active'),revision);
  assert.match(doc.querySelector('.studio-preview').textContent,/ex-1-recognize/);
  edit(w,exerciseForm().elements.prompt,'Unsaved edit');click(doc,'studio-reload');
  await settled(()=>exerciseForm()?.elements.prompt.value===draftPrompt);
  const saved=store.currentDraft();stageDraft(store,c=>{c.lessons[0].title='Synthetic title from another tab';});const otherToken=store.currentDraft().draftToken;
  assert.notEqual(otherToken,saved.draftToken);
  edit(w,exerciseForm().elements.prompt,'Stale tab edit');submit(w,exerciseForm());
  await settled(()=>/Draft changed elsewhere/.test(exerciseForm().querySelector('[data-editor-status]').textContent));
  assert.equal(exerciseForm().elements.prompt.value,'Stale tab edit','rejected values stay in the form');
  assert.equal(store.currentDraft().draftToken,otherToken,'the newer draft is not overwritten');
  click(doc,'studio-reload');await settled(()=>lessonForm()?.elements.title.value==='Synthetic title from another tab');
  edit(w,lessonForm().elements.title,'Synthetic lesson title');submit(w,lessonForm());
  await settled(()=>store.currentDraft()?.content.lessons[0].title==='Synthetic lesson title'&&lessonForm()?.elements.title.value==='Synthetic lesson title');
  assert.equal(store.currentDraft().content.exercises.find(e=>e.id==='ex-1-recognize').prompt,draftPrompt);
  assert.ok(doc.querySelector('[data-owned-exercise="ex-1-type"] form'),'typing editor is already below its component');
  assert.deepEqual(store.snapshot(),published);assert.deepEqual(learnerRecords(store),learners);
  click(doc,'publish');await settled(()=>store.get('active')===revision+1&&store.currentDraft()===null);
  assert.equal(store.snapshot().lessons[0].title,'Synthetic lesson title');assert.equal(store.snapshot().exercises.find(e=>e.id==='ex-1-recognize').prompt,draftPrompt);
  assert.deepEqual(learnerRecords(store),learners);
});

test('Studio native JSON import Review/Discard write nothing; Stage stays separate, stale Stage retains file/mapping and invalidates after reload',async t=>{
 const {store,w,doc}=await app(t,{page:'studio',author:true});await settled(()=>doc.querySelector('[data-import-file]'));
 const before=tables(store),published=structuredClone(store.snapshot()),learners=learnerRecords(store);
 const choose=async(name,value)=>{const raw=JSON.stringify(value),el=doc.querySelector('[data-import-file]');Object.defineProperty(el,'files',{configurable:true,value:[{name,size:raw.length,text:async()=>raw}]});el.dispatchEvent(new w.Event('change',{bubbles:true}));await settled(()=>doc.querySelector('[data-prepare-import]:not([disabled])'));};
 const candidate=structuredClone(published);candidate.words[0].english='I (synthetic import)';candidate.provenance={...candidate.provenance,label:'Synthetic import fixture'};
 await choose('synthetic-pack.json',candidate);doc.querySelector('[data-prepare-import]').click();await settled(()=>doc.querySelector('[data-stage-import]'));
 assert.match(doc.querySelector('[data-import-review]').textContent,/words · w-ani · changed/);assert.match(doc.querySelector('[data-import-review]').textContent,/I \(synthetic import\)/);assert.deepEqual(tables(store),before);
 doc.querySelector('[data-discard-import]').click();assert.equal(doc.querySelector('[data-stage-import]'),null);assert.deepEqual(tables(store),before);
 await choose('synthetic-pack.json',candidate);doc.querySelector('[data-prepare-import]').click();doc.querySelector('[data-stage-import]').click();await settled(()=>store.currentDraft()&&!doc.querySelector('[data-stage-import]'));
 assert.deepEqual(store.currentDraft().content,candidate);assert.deepEqual(store.snapshot(),published);assert.match(doc.querySelector('.studio-preview').textContent,/Pack provenance/);
 const second=structuredClone(candidate);second.words[0].notes='Synthetic note';await choose('second.json',second);doc.querySelector('[data-prepare-import]').click();
 stageDraft(store,c=>{c.lessons[0].title='Synthetic title from another tab';});const token=store.currentDraft().draftToken,after=tables(store);
 doc.querySelector('[data-stage-import]').click();await settled(()=>/Draft changed elsewhere/.test(doc.querySelector('[data-import-status]').textContent));assert.equal(store.currentDraft().draftToken,token);assert.deepEqual(tables(store),after);assert.match(doc.querySelector('#studio-import-mount').textContent,/second.json/);
 click(doc,'studio-reload');await settled(()=>doc.querySelector('[data-import-review] [role="alert"]'));assert.equal(doc.querySelector('[data-stage-import]').disabled,true);assert.deepEqual(store.snapshot(),published);assert.deepEqual(learnerRecords(store),learners);
});

test('Studio draft rehearsal uses the shared renderer and grader, isolates app.js handlers, and leaves every table, learner record and the published pack unchanged',async t=>{
  const {store,w,doc,calls}=await app(t,{page:'studio',author:true,prepare(s){stageDraft(s,c=>{c.exercises.find(e=>e.id==='ex-1-recognize').prompt=draftPrompt;});}});
  await settled(()=>doc.querySelector('[data-action="rehearse"]:not([disabled])'));
  const before=tables(store),learners=learnerRecords(store),published=structuredClone(store.snapshot()),seen=calls.length;
  const dialog=()=>doc.querySelector('#rehearsal-panel'),preview=()=>dialog().querySelector('.learner-preview'),inside=selector=>dialog().querySelector(selector);
  click(doc,'rehearse');await settled(()=>dialog()?.querySelector('.learner-preview'));
  assert.equal(dialog().open,true);assert.equal(doc.querySelector('#app').contains(dialog()),false);assert.ok(dialog().hasAttribute('data-preview-root'));
  assert.deepEqual([...dialog().querySelectorAll('[data-preview-step]')].map(b=>b.dataset.previewStep),['learn','check','vocabulary','apply','complete']);
  inside('[data-action="next-step"]').click();await settled(()=>inside('[aria-current="step"]')?.dataset.previewStep==='check');
  assert.equal(inside('.exercise-prompt').textContent,draftPrompt,'rehearsal shows the saved draft, not the published prompt');
  const nikkud=inside('#preview-nikkud');nikkud.value='none';nikkud.dispatchEvent(new w.Event('change',{bubbles:true}));await settled(()=>inside('#preview-nikkud').value==='none');
  const exercise=published.exercises.find(e=>e.id==='ex-1-recognize'),correct=published.words.find(x=>x.id===exercise.wordId).english;
  const choices=()=>[...dialog().querySelectorAll('[data-action="choice"]')];
  choices().find(b=>b.dataset.value!==correct).click();inside('[data-action="check"]').click();
  await settled(()=>inside('[data-action="retry-question"]'));
  inside('[data-action="retry-question"]').click();await settled(()=>inside('[data-action="check"]')&&!inside('.feedback'));
  // Keyboard: a digit picks a choice and Enter checks it, handled inside the rehearsal root only.
  doc.body.dispatchEvent(new w.KeyboardEvent('keydown',{key:'1',bubbles:true,cancelable:true}));
  preview().dispatchEvent(new w.KeyboardEvent('keydown',{key:String(choices().findIndex(b=>b.dataset.value===correct)+1),bubbles:true,cancelable:true}));
  preview().dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
  await settled(()=>inside('[data-action="next-question"]'));
  inside('[data-action="lookup"]').click();await settled(()=>inside('.preview-lookup'));inside('[data-preview-lookup-close]').click();await settled(()=>!inside('.preview-lookup'));
  inside('[data-preview-step="vocabulary"]').click();await settled(()=>inside('.word-grid'));
  inside('[data-preview-pref="vocabularyView"][data-preview-value="table"]').click();await settled(()=>inside('.word-grid')===null);
  inside('[data-preview-step="apply"]').click();await settled(()=>inside('#answer'));
  inside('[data-preview-keyboard="show"]').click();await settled(()=>inside('[data-preview-key]'));
  for(const key of ['א','נ','י'])inside('[data-preview-key="'+key+'"]').click();
  assert.equal(inside('#answer').value,'אני');
  inside('#answer').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
  await settled(()=>inside('.feedback')&&inside('[data-action="next-question"]'));
  // Learner-side events during rehearsal never persist preferences or progress.
  w.dispatchEvent(new w.CustomEvent('hebleo-keyboard-preference',{detail:{keyboardPinned:true,keyboardConvert:true}}));
  w.dispatchEvent(new w.Event('pagehide'));
  await new Promise(r=>setTimeout(r,20));
  dialog().dispatchEvent(new w.Event('cancel',{cancelable:true}));await settled(()=>!dialog());
  assert.equal(doc.activeElement,doc.querySelector('[data-action="rehearse"]'));
  const used=calls.slice(seen);
  assert.deepEqual([...new Set(used)].sort(),['/api/studio/preview/evaluate','/api/studio/preview/session']);
  assert.equal(used.filter(p=>p.endsWith('/evaluate')).length,3);
  assert.deepEqual(tables(store),before,'every table is byte-identical after rehearsal');
  assert.deepEqual(learnerRecords(store),learners);assert.deepEqual(store.snapshot(),published);
});

// Browser path: a pointer click focuses its button before activating it, and keys go to whatever then has focus.
// Every rehearsal re-render replaces the focused control, so keys only work if focus stays inside the modal.
test('Rehearsal keeps keyboard focus inside the modal across re-renders, so a digit then Enter grade, Retry resets, and a new result is scrolled into view',async t=>{
  const {store,w,doc,calls}=await app(t,{page:'studio',author:true,prepare(s){stageDraft(s,c=>{c.exercises.find(e=>e.id==='ex-1-recognize').prompt=draftPrompt;});}});
  await settled(()=>doc.querySelector('[data-action="rehearse"]:not([disabled])'));
  const before=tables(store),learners=learnerRecords(store),published=structuredClone(store.snapshot()),seen=calls.length,scrolled=[];
  w.HTMLElement.prototype.scrollIntoView=function(){scrolled.push(this);};
  const dialog=()=>doc.querySelector('#rehearsal-panel'),inside=selector=>dialog().querySelector(selector),focusInside=()=>dialog().contains(doc.activeElement);
  const press=el=>{el.focus();el.click();};
  // Returns whether the key was delivered inside the rehearsal (checked before handlers re-render it).
  const key=k=>{const target=doc.activeElement,delivered=dialog().contains(target);target.dispatchEvent(new w.KeyboardEvent('keydown',{key:k,bubbles:true,cancelable:true}));return delivered;};
  const exercise=published.exercises.find(e=>e.id==='ex-1-recognize'),correct=published.words.find(x=>x.id===exercise.wordId).english;
  const choices=()=>[...dialog().querySelectorAll('[data-action="choice"]')],digit=value=>String(choices().findIndex(b=>b.dataset.value===value)+1);
  press(doc.querySelector('[data-action="rehearse"]'));await settled(()=>dialog()?.querySelector('[data-action="next-step"]'));
  press(inside('[data-action="next-step"]'));await settled(()=>inside('[data-action="choice"]'));
  assert.ok(focusInside(),'the step re-render keeps focus in the rehearsal');
  const wrong=choices().find(b=>b.dataset.value!==correct).dataset.value;
  assert.ok(key(digit(wrong)),'the digit is delivered inside the rehearsal');
  assert.deepEqual(choices().filter(b=>b.classList.contains('selected')).map(b=>b.dataset.value),[wrong]);
  assert.ok(focusInside(),'focus survives the selection re-render');
  scrolled.length=0;assert.ok(key('Enter'));await settled(()=>inside('[data-action="retry-question"]'));
  assert.ok(focusInside(),'focus survives grading');
  assert.equal(scrolled.length,1,'only the newly shown result is scrolled');
  assert.equal(scrolled[0],inside('.answer-result'));assert.ok(scrolled[0].contains(inside('[data-action="retry-question"]')),'Retry is inside the revealed area');
  press(inside('[data-action="retry-question"]'));await settled(()=>inside('[data-action="check"]'));
  assert.equal(inside('[data-action="retry-question"]'),null);assert.doesNotMatch(inside('.lesson-section').textContent,/Accepted answer/,'Retry clears the feedback');
  assert.deepEqual(choices().filter(b=>b.classList.contains('selected')),[],'Retry clears the selection');
  assert.ok(focusInside(),'focus survives Retry');
  // The originally failing path: a pointer-selected choice is replaced by the re-render, then Enter grades it.
  press(choices().find(b=>b.dataset.value===correct));
  assert.ok(focusInside(),'focus survives the clicked choice being replaced');
  assert.ok(key('Enter'),'Enter is delivered inside the rehearsal');await settled(()=>inside('[data-action="next-question"]'));
  assert.match(inside('.lesson-section').textContent,new RegExp(correct));assert.equal(inside('[data-action="retry-question"]'),null,'a correct answer needs no retry');
  assert.ok(key('Enter'));await settled(()=>inside('[aria-current="step"]')?.dataset.previewStep==='vocabulary');
  assert.ok(focusInside(),'Enter advances and focus stays');
  press(inside('[data-preview-step="check"]'));await settled(()=>inside('[aria-current="step"]')?.dataset.previewStep==='check');
  assert.equal(doc.activeElement.dataset.previewStep,'check','the replaced step button keeps focus');
  dialog().dispatchEvent(new w.Event('cancel',{cancelable:true}));await settled(()=>!dialog());
  assert.equal(doc.activeElement,doc.querySelector('[data-action="rehearse"]'));
  const used=calls.slice(seen);
  assert.deepEqual([...new Set(used)].sort(),['/api/studio/preview/evaluate','/api/studio/preview/session']);assert.equal(used.filter(p=>p.endsWith('/evaluate')).length,2);
  assert.deepEqual(tables(store),before);assert.deepEqual(learnerRecords(store),learners);assert.deepEqual(store.snapshot(),published);
});

test('A rehearsal stops on a changed draft or a newer publication revision, writes nothing itself, and closes when the author navigates away',async t=>{
  const {store,w,doc,calls}=await app(t,{page:'studio',author:true,prepare(s){stageDraft(s,c=>{c.exercises.find(e=>e.id==='ex-1-recognize').prompt=draftPrompt;});}});
  await settled(()=>doc.querySelector('[data-action="rehearse"]:not([disabled])'));
  const learners=learnerRecords(store),dialog=()=>doc.querySelector('#rehearsal-panel'),inside=selector=>dialog().querySelector(selector);
  const openCheck=async()=>{click(doc,'rehearse');await settled(()=>dialog()?.querySelector('[data-preview-step="check"]'));inside('[data-preview-step="check"]').click();await settled(()=>inside('[data-action="choice"]'));inside('[data-action="choice"]').click();};
  await openCheck();
  stageDraft(store,c=>{c.lessons[0].title='Synthetic title from another tab';});
  let after=tables(store),seen=calls.length;
  inside('[data-action="check"]').click();await settled(()=>/This draft changed/.test(inside('[data-preview-status]').textContent));
  assert.ok([...dialog().querySelectorAll('[data-preview-step]')].every(b=>b.disabled));assert.ok(inside('[data-preview-frozen]'));assert.equal(inside('[data-action="check"]').disabled,true);
  assert.deepEqual(tables(store),after);assert.deepEqual(calls.slice(seen),['/api/studio/preview/evaluate']);
  inside('[data-preview-exit]').click();await settled(()=>!dialog());
  click(doc,'studio-reload');await settled(()=>/another tab/.test(doc.querySelector('[data-lesson-metadata]')?.elements.title.value||''));
  await openCheck();
  store.publish(store.get('active'),store.currentDraft().draftToken);
  after=tables(store);seen=calls.length;
  inside('[data-action="check"]').click();await settled(()=>/This draft changed/.test(inside('[data-preview-status]').textContent));
  assert.deepEqual(tables(store),after);assert.deepEqual(calls.slice(seen),['/api/studio/preview/evaluate']);
  w.history.pushState({},'','#home');w.dispatchEvent(new w.PopStateEvent('popstate'));
  await settled(()=>!dialog()&&doc.querySelector('.breadcrumb')?.textContent.includes('Your path'));
  assert.deepEqual(learnerRecords(store),learners);
});
// Holds this tab's post-save workspace reload (GET /api/studio) and records Studio write request bodies.
function holdStudioReload(w){
  const original=w.fetch,bodies=[];let gate=null;
  w.fetch=async(path,options={})=>{const pathname=new URL(path,w.location.href).pathname;if(options.body&&pathname.startsWith('/api/studio/'))bodies.push({path:pathname,body:JSON.parse(options.body)});if(gate&&pathname==='/api/studio'){const held=gate;held.waiting=true;await held.promise;}return original(path,options);};
  return {bodies,hold(){let release;const promise=new Promise(r=>release=r);gate={promise,release,waiting:false};},release(){const held=gate;gate=null;held?.release();},get waiting(){return Boolean(gate?.waiting);}};
}
const publishBody=reload=>reload.bodies.filter(b=>b.path==='/api/studio/publish').at(-1)?.body;

test('A pending unified save locks every sibling and lesson switch; subsequent save and queued Publish name the saved token',async t=>{
 const {store,w,doc}=await app(t,{page:'studio',author:true,prepare(s){stageDraft(s,c=>{c.exercises[0].prompt=draftPrompt;});}});
 const reload=holdStudioReload(w),exercise=()=>doc.querySelector('[data-owned-exercise="ex-1-type"] form'),lesson=()=>doc.querySelector('[data-lesson-metadata]');await settled(()=>exercise()&&lesson()&&doc.querySelector('[data-action="publish"]'));
 const revision=store.get('active'),learners=learnerRecords(store);
 reload.hold();edit(w,lesson().elements.title,'Synthetic lesson title');edit(w,exercise().elements.prompt,'Synthetic sibling typing prompt');submit(w,lesson());await settled(()=>store.currentDraft()?.content.lessons[0].title==='Synthetic lesson title'&&reload.waiting);
 const saved=store.currentDraft().draftToken;assert.equal(store.currentDraft().content.exercises.find(e=>e.id==='ex-1-type').prompt,'Synthetic sibling typing prompt');assert.ok([...exercise().querySelectorAll('input,select,textarea,button')].every(el=>el.disabled));assert.equal(doc.querySelector('[data-current-lesson]').disabled,true);
 submit(w,exercise());await settled(()=>/still reloading/.test(exercise().querySelector('[data-editor-status]').textContent));assert.equal(store.currentDraft().draftToken,saved);
 reload.release();await settled(()=>exercise()&&!exercise().elements.prompt.disabled&&lesson().elements.title.value==='Synthetic lesson title');
 const mounted=exercise();edit(w,mounted.elements.prompt,'Synthetic typing prompt');submit(w,mounted);await settled(()=>store.currentDraft()?.content.exercises.find(e=>e.id==='ex-1-type').prompt==='Synthetic typing prompt'&&exercise()!==mounted);assert.equal(store.currentDraft().content.lessons[0].title,'Synthetic lesson title');
 reload.hold();edit(w,lesson().elements.estimatedMinutes,'8');submit(w,lesson());await settled(()=>store.currentDraft()?.content.lessons[0].estimatedMinutes===8&&reload.waiting);const latest=store.currentDraft().draftToken;
 click(doc,'publish');await new Promise(r=>setTimeout(r,20));assert.equal(store.get('active'),revision);assert.equal(publishBody(reload),undefined);reload.release();await settled(()=>store.get('active')===revision+1&&store.currentDraft()===null&&/Published locally/.test(doc.querySelector('#toast').textContent));assert.equal(publishBody(reload).draftToken,latest);assert.equal(store.snapshot().lessons[0].estimatedMinutes,8);assert.equal(store.snapshot().exercises.find(e=>e.id==='ex-1-type').prompt,'Synthetic typing prompt');assert.deepEqual(learnerRecords(store),learners);
});

test('Publishing behind a pending guided save still rejects a newer draft from another tab and publishes nothing',async t=>{
  const {store,w,doc}=await app(t,{page:'studio',author:true,prepare(s){stageDraft(s,c=>{c.exercises.find(e=>e.id==='ex-1-recognize').prompt=draftPrompt;});}});
  const reload=holdStudioReload(w),lessonForm=()=>doc.querySelector('[data-lesson-metadata]');
  await settled(()=>lessonForm()&&doc.querySelector('[data-action="publish"]'));
  const revision=store.get('active'),published=structuredClone(store.snapshot()),learners=learnerRecords(store);
  reload.hold();edit(w,lessonForm().elements.title,'Synthetic lesson title');submit(w,lessonForm());
  await settled(()=>store.currentDraft()?.content.lessons[0].title==='Synthetic lesson title'&&reload.waiting);
  const saved=store.currentDraft().draftToken;
  stageDraft(store,c=>{c.lessons[0].chapter='Synthetic chapter from another tab';});const other=store.currentDraft().draftToken;
  click(doc,'publish');await new Promise(r=>setTimeout(r,20));reload.release();
  await settled(()=>/draft changed elsewhere/i.test(doc.querySelector('#toast').textContent));
  assert.equal(publishBody(reload).draftToken,saved,'the token this tab saved, not the reloaded one');
  assert.equal(store.get('active'),revision);assert.deepEqual(store.snapshot(),published);assert.equal(store.currentDraft().draftToken,other);
  assert.deepEqual(learnerRecords(store),learners);
});

test('QA-EE9-G4-02: matching autosave keeps an authored pair word from outside the lesson list, and the match resumes after reload',async t=>{
  const pairs=['w-ani','w-mi','w-sham'];
  const {store,w,doc}=await app(t,{page:'lesson/lesson-1/apply',prepare(s){
    const c=structuredClone(s.snapshot());c.exercises.find(e=>e.id==='ex-1-match').wordIds=pairs;s.publish(1,s.stage({baseRevisionId:1,expectedDraftToken:null,content:c}).draftToken);
  }});
  assert.ok(!store.snapshot().lessons.find(l=>l.id==='lesson-1').wordIds.includes('w-sham'));
  const input=doc.querySelector('#answer');input.value='אני';input.dispatchEvent(new w.Event('input',{bubbles:true}));click(doc,'check');await settled(()=>doc.querySelector('.feedback:not(.wrong)'));
  click(doc,'next-question');await settled(()=>doc.querySelector('.matching-game'));
  const place=(d,id,meaning)=>{d.querySelector('[data-match-word="'+id+'"]').click();d.querySelector('[data-match-target="'+meaning+'"]').click();};
  const resume=()=>store.learner('learner-demo').resumes['lesson-1'];
  place(doc,'w-sham','there');
  await settled(()=>resume()?.matching?.['w-sham']==='there');
  assert.deepEqual(resume().matching,{'w-sham':'there'});assert.equal(resume().revisionId,2);assert.equal(resume().question,1);
  const resumed=await app(t,{page:'lesson/lesson-1/apply',store});
  await settled(()=>resumed.doc.querySelector('.matching-game'));
  assert.match(resumed.doc.querySelector('[data-match-word="w-sham"] small').textContent,/Placed: there/);
  assert.ok(resumed.doc.querySelector('[data-match-target="there"]').classList.contains('filled'));
  place(resumed.doc,'w-ani','I');await settled(()=>resume().matching['w-ani']==='I');
  place(resumed.doc,'w-mi','who');await settled(()=>resume().matching['w-mi']==='who');
  click(resumed.doc,'check');await settled(()=>resumed.doc.querySelector('.feedback:not(.wrong)'));
  const graded=store.learner('learner-demo').attempts.at(-1);
  assert.deepEqual([graded.exerciseId,graded.revisionId,graded.correct,graded.answer],['ex-1-match',2,true,{'w-sham':'there','w-ani':'I','w-mi':'who'}]);
});


test('fresh home says Start, a saved lesson says Continue, and a completed lesson says Revisit', async t=>{
  const {doc,store}=await app(t,{page:'home',realHTTP:true});
  assert.match(doc.querySelector('.hero button').textContent,/^Start · Learn/);
  assert.ok([...doc.querySelectorAll('.lesson-card [data-action="lesson"]')].every(b=>b.textContent==='Start →'));
  assert.ok(doc.querySelector('.lesson-card [data-action="lesson-practice"]'),'Existing direct-practice action remains available.');
  doc.querySelector('.hero button').click();
  await settled(()=>store.learner('learner-demo').resumes['lesson-1'] && doc.querySelector('.step-strip') && !doc.querySelector('.hero'));
  click(doc,'page'); await settled(()=>/^Continue · Learn/.test(doc.querySelector('.hero button')?.textContent || ''));
  assert.match(doc.querySelector('.hero button').textContent,/^Continue · Learn/);
  assert.equal(doc.querySelector('[data-value="lesson-2"].button').textContent,'Start →');
  const completed=await app(t,{page:'home',prepare(s){const learner=s.learner('learner-demo');learner.completed=['lesson-1'];s.saveLearner('learner-demo',learner);}});
  assert.equal(completed.doc.querySelector('[data-value="lesson-1"].button').textContent,'Revisit');
});

test('Native import Stage locks sibling lesson/exercise/Markdown inputs until workspace reload finishes',async t=>{
 const {store,w,doc}=await app(t,{page:'studio',author:true});await settled(()=>doc.querySelector('[data-import-file]'));
 const published=structuredClone(store.snapshot()),candidate=structuredClone(published);candidate.words[0].notes='Synthetic import lock fixture';const raw=JSON.stringify(candidate),input=doc.querySelector('[data-import-file]');Object.defineProperty(input,'files',{configurable:true,value:[{name:'synthetic-lock.json',size:raw.length,text:async()=>raw}]});input.dispatchEvent(new w.Event('change',{bubbles:true}));await settled(()=>doc.querySelector('[data-prepare-import]:not([disabled])'));doc.querySelector('[data-prepare-import]').click();
 const reload=holdStudioReload(w);reload.hold();doc.querySelector('[data-stage-import]').click();await settled(()=>reload.waiting&&store.currentDraft()?.content.words[0].notes==='Synthetic import lock fixture');
 assert.ok([...doc.querySelectorAll('#unified-studio-mount input,#unified-studio-mount textarea,#unified-studio-mount select,#unified-studio-mount button')].every(el=>el.disabled));const token=store.currentDraft().draftToken;
 const form=doc.querySelector('[data-owned-exercise="ex-1-recognize"] form');submit(w,form);await settled(()=>/still reloading/.test(form.querySelector('[data-editor-status]').textContent));assert.equal(store.currentDraft().draftToken,token);
 reload.release();await settled(()=>!doc.querySelector('[data-stage-import]')&&!doc.querySelector('[data-current-lesson]').disabled);assert.equal(store.currentDraft().draftToken,token);assert.deepEqual(store.snapshot(),published);
});

const repeatedPack=s=>{
 const c=s.snapshot(),l=courseHelpers.projectLesson(c,c.lessons[0]);
 l.blocks[0].text='SYNTHETIC INSTANCE ONE';
 l.blocks.splice(1,0,{id:'synthetic-text-two',type:'explanation',source:'inline',renderer:'text',text:'SYNTHETIC INSTANCE TWO',options:{textDirection:'rtl'}});
 c.lessons[0]=courseHelpers.deriveLessonIndices(c,l);
 c.curriculum={version:1,chapters:[{id:'synthetic-chapter',title:'Synthetic chapter',lessonIds:['lesson-2']}],order:[{lessonId:'lesson-1'},{chapterId:'synthetic-chapter'},{lessonId:'lesson-3'}]};
 return c;
};
test('v2 actual app over HTTP navigates two text instances, pins second-instance resume and ignores a newer reorder',async t=>{
 const store=new Store();t.after(()=>store.close());const c=repeatedPack(store);const d=store.stage({baseRevisionId:1,expectedDraftToken:null,content:c});const rev=store.publish(1,d.draftToken).revisionId;
 const first=await app(t,{store,page:'lesson/lesson-1/legacy-explanation',realHTTP:true});
 assert.match(first.doc.querySelector('#practice').textContent,/SYNTHETIC INSTANCE ONE/);
 assert.equal(first.doc.querySelectorAll('.step-strip [data-value="synthetic-text-two"]').length,1);
 first.doc.querySelector('.step-strip [data-value="synthetic-text-two"]').click();
 await settled(()=>first.doc.querySelector('#practice').textContent.includes('SYNTHETIC INSTANCE TWO'));
 assert.equal(first.doc.querySelector('.explanation').dir,'rtl');
 assert.equal(store.learner('learner-demo').resumes['lesson-1'].componentId,'synthetic-text-two');
 assert.equal(store.learner('learner-demo').resumes['lesson-1'].step,'learn');
 const latest=structuredClone(c);latest.lessons[0].blocks.reverse();latest.lessons[0]=courseHelpers.deriveLessonIndices(latest,latest.lessons[0]);const changed=store.stage({baseRevisionId:rev,expectedDraftToken:null,content:latest});store.publish(rev,changed.draftToken);
 const resumed=await app(t,{store,page:'lesson/lesson-1',realHTTP:true});
 assert.match(resumed.doc.querySelector('#practice').textContent,/SYNTHETIC INSTANCE TWO/);
 assert.match(resumed.doc.querySelector('#practice').textContent,/earlier lesson/);
 assert.equal(store.session('learner-demo','lesson-1').revisionId,rev);
 assert.equal(resumed.doc.querySelector('.step-strip [aria-current]').dataset.value,'synthetic-text-two');
 resumed.doc.querySelector('.step-strip [data-value="legacy-check"]').click();await settled(()=>resumed.doc.querySelector('[data-action="choice"]'));
 assert.equal(store.learner('learner-demo').resumes['lesson-1'].componentId,'legacy-check');
 assert.equal(store.learner('learner-demo').resumes['lesson-1'].step,'check');
});
test('v2 saved draft preview shows both text instances and grades its selected component with zero writes',async t=>{
 const {store,doc}=await app(t,{author:true,page:'studio',realHTTP:true,prepare(s){s.stage({baseRevisionId:1,expectedDraftToken:null,content:repeatedPack(s)});}});
 const dump=()=>JSON.stringify(['kv','learners','events','revisions'].map(name=>store.db.prepare('SELECT * FROM '+name+' ORDER BY 1').all()));const before=dump();
 click(doc,'rehearse');await settled(()=>doc.querySelector('[data-preview-step="synthetic-text-two"]'));
 doc.querySelector('[data-preview-step="synthetic-text-two"]').click();await settled(()=>doc.querySelector('.learner-preview').textContent.includes('SYNTHETIC INSTANCE TWO'));
 doc.querySelector('[data-preview-step="legacy-check"]').click();await settled(()=>doc.querySelector('.learner-preview [data-action="choice"]'));
 const e=store.currentDraft().content.exercises.find(e=>e.id==='ex-1-recognize'),correct=store.currentDraft().content.words.find(w=>w.id===e.wordId).english;
 [...doc.querySelectorAll('.learner-preview [data-action="choice"]')].find(el=>el.dataset.value===correct).click();
 doc.querySelector('.learner-preview [data-action="check"]').click();await settled(()=>doc.querySelector('.learner-preview .feedback'));
 assert.match(doc.querySelector('.learner-preview .feedback strong').textContent,/That’s right/);assert.equal(doc.querySelector('.learner-preview .feedback').classList.contains('wrong'),false);
 assert.equal(dump(),before);
});
test('My Hebrew combines tag, lesson and review filters, bounds results, and empty review explicitly enrolls synthetic words',async t=>{
 const {store,doc}=await app(t,{page:'library',realHTTP:true,prepare(s){const c=s.snapshot();c.words[0].tags=['synthetic-tag'];const d=s.stage({baseRevisionId:1,expectedDraftToken:null,content:c});s.publish(1,d.draftToken);}});
 doc.querySelector('#library-tag').value='synthetic-tag';doc.querySelector('#library-tag').dispatchEvent(new doc.defaultView.Event('change'));
 doc.querySelector('#library-lesson').value='lesson-1';doc.querySelector('#library-lesson').dispatchEvent(new doc.defaultView.Event('change'));
 assert.equal(doc.querySelectorAll('.word-card').length,1);
 doc.querySelector('#library-state').value='review';doc.querySelector('#library-state').dispatchEvent(new doc.defaultView.Event('change'));assert.match(doc.body.textContent,/No matching words/);
 doc.querySelector('[data-action="page"][data-value="review"]').click();await settled(()=>doc.querySelector('[data-action="review-demo"]'));
 assert.match(doc.body.textContent,/deck is empty/);click(doc,'review-demo');await settled(()=>store.bootstrap('learner-demo').due.length===3);
 await settled(()=>doc.querySelector('[data-action="review-start"]')&&!doc.querySelector('[data-action="review-start"]').disabled);
 assert.equal(Object.keys(store.learner('learner-demo').cards).length,3);
});

test('v2 extra practice works when all authored exercise components are checks; skip and reload retain unique grading history',async t=>{
 const {store,doc}=await app(t,{page:'lesson/lesson-1/complete',realHTTP:true,prepare(s){const c=repeatedPack(s),l=c.lessons[0];for(const b of l.blocks)if(b.type==='exercise-set')b.role='check';c.lessons[0]=courseHelpers.deriveLessonIndices(c,l);const d=s.stage({baseRevisionId:1,expectedDraftToken:null,content:c});s.publish(1,d.draftToken);}});
 click(doc,'target-practice');await settled(()=>doc.querySelector('#practice [data-action="choice"]'));
 const p=store.learner('learner-demo').resumes['lesson-1'];assert.equal(p.step,'check');assert.equal(p.componentId,'legacy-check');assert.equal(p.practiceIds.length,3);
 const correct=store.snapshot().words.find(w=>w.id===store.snapshot().exercises.find(e=>e.id===p.practiceIds[0]).wordId).english;
 doc.querySelector('#practice [data-action="choice"][data-value="'+correct+'"]').click();await settled(()=>store.learner('learner-demo').resumes['lesson-1'].answer===correct);
 doc.querySelector('#practice [data-action="check"]').click();await settled(()=>doc.querySelector('#practice .feedback'));
 const before=JSON.stringify(store.learner('learner-demo').attempts);doc.querySelector('#practice [data-action="step"][data-value="complete"]').click();await settled(()=>store.learner('learner-demo').resumes['lesson-1'].componentId===null);
 assert.equal(store.learner('learner-demo').resumes['lesson-1'].practiceIds.length,0);assert.equal(JSON.stringify(store.learner('learner-demo').attempts),before);
});

for(const checkOnly of [true,false])test('RR-F18-02 real HTTP app saves and reloads typing feedback in a check-role practice subset '+(checkOnly?'check-only':'mixed-role'),async t=>{
 const {store,w,doc}=await app(t,{page:'lesson/lesson-1/complete',realHTTP:true,prepare(s){const c=repeatedPack(s),l=c.lessons[0];if(checkOnly)for(const b of l.blocks)if(b.type==='exercise-set')b.role='check';c.lessons[0]=courseHelpers.deriveLessonIndices(c,l);const d=s.stage({baseRevisionId:1,expectedDraftToken:null,content:c}),r=s.publish(1,d.draftToken).revisionId;s.attempt('learner-demo',{requestId:'synthetic-prior-miss',revisionId:r,exerciseId:'ex-1-type',answer:'SYNTHETIC wrong'});}});
 click(doc,'target-practice');await settled(()=>doc.querySelector('#answer'));const p=store.learner('learner-demo').resumes['lesson-1'];assert.equal(p.step,'check');assert.deepEqual(p.practiceIds,['ex-1-type']);
 const correct=store.snapshot(p.revisionId).words.find(w=>w.id==='w-ani').unpointed,input=doc.querySelector('#answer');input.value=correct;input.dispatchEvent(new w.Event('input',{bubbles:true}));click(doc,'check');
 await settled(()=>store.learner('learner-demo').resumes['lesson-1'].resultRequestId&&doc.querySelector('.feedback:not(.wrong)'));assert.equal(store.session('learner-demo','lesson-1').result.exerciseId,'ex-1-type');assert.ok(doc.querySelector('.feedback:not(.wrong)'));assert.equal(doc.querySelector('#toast').textContent.includes('does not match'),false);
 const history=JSON.stringify(store.learner('learner-demo').attempts),resumed=await app(t,{store,page:w.location.hash.slice(1),realHTTP:true});assert.ok(resumed.doc.querySelector('.feedback:not(.wrong)'));assert.equal(resumed.doc.querySelector('#answer').value,correct);assert.equal(JSON.stringify(store.learner('learner-demo').attempts),history);
 const restored=new Store();t.after(()=>restored.close());restored.restore(store.backup());const reloaded=await app(t,{store:restored,page:w.location.hash.slice(1),realHTTP:true});assert.ok(reloaded.doc.querySelector('.feedback:not(.wrong)'));assert.equal(restored.session('learner-demo','lesson-1').result.exerciseId,'ex-1-type');assert.equal(restored.learner('learner-demo').completed.includes('lesson-1'),false);
});

test('NEW7 publication impact displays authoritative affected lesson names before Publish',async t=>{
 const {store,doc}=await app(t,{page:'studio',author:true,realHTTP:true,prepare(s){const c=s.snapshot();c.words[0].notes='SYNTHETIC publication scope';s.stage({content:c,baseRevisionId:1,expectedDraftToken:null});}});
 const list=doc.querySelector('[aria-label="Affected lessons"]');assert.ok(list);
 const expected=store.preview().affectedLessons.map(id=>store.currentDraft().content.lessons.find(l=>l.id===id).title+' '+id);
 assert.deepEqual([...list.querySelectorAll('li')].map(el=>el.textContent),expected);assert.ok(doc.querySelector('[data-action="publish"]'));
});

test('optional text-only lesson uses actual HTTP, finishes without fabricated grades and reloads completed identity',async t=>{
 const {store,doc,w}=await app(t,{page:'lesson/lesson-2/learn',realHTTP:true,prepare(s){const c=s.snapshot();c.lessons=c.lessons.map(l=>courseHelpers.projectLesson(c,l));const l=c.lessons[1];l.blocks=l.blocks.filter(b=>b.type==='explanation');l.wordIds=[];c.lessons=c.lessons.map(l=>courseHelpers.deriveLessonIndices(c,l));const d=s.stage({content:c,baseRevisionId:1,expectedDraftToken:null});s.publish(1,d.draftToken);}});
 assert.equal(doc.querySelector('.lesson-progress'),null);assert.ok(!store.learner('learner-demo').completed.includes('lesson-2'));const finish=doc.querySelector('.lesson-footer [data-action="step"][data-value="complete"]');assert.ok(finish);finish.click();await settled(()=>store.learner('learner-demo').completed.includes('lesson-2')&&doc.querySelector('#practice h2')?.textContent==='Lesson complete.');assert.equal(doc.querySelector('#practice [data-action="target-practice"]'),null);assert.equal(store.learner('learner-demo').attempts.length,0);
 const restored=new Store();t.after(()=>restored.close());restored.restore(store.backup());const reloaded=await app(t,{store:restored,page:w.location.hash.slice(1),realHTTP:true});assert.equal(reloaded.doc.querySelector('#practice h2').textContent,'Lesson complete.');
});
test('empty vocabulary/exercise registries render the real learner and saved author Preview with stable text-only portions',async t=>{
 const {store,doc}=await app(t,{page:'studio',author:true,realHTTP:true,prepare(s){const c=s.snapshot();c.lessons=c.lessons.map(l=>courseHelpers.projectLesson(c,l));for(const l of c.lessons){l.blocks=l.blocks.filter(b=>b.type==='explanation');l.wordIds=[];}c.lessons=c.lessons.map(l=>courseHelpers.deriveLessonIndices(c,l));c.words=[];c.exercises=[];const d=s.stage({content:c,baseRevisionId:1,expectedDraftToken:null});s.publish(1,d.draftToken);s.stage({content:c,baseRevisionId:s.get('active'),expectedDraftToken:null});}});
 const before=JSON.stringify(store.learner('author-demo'));const preview=doc.querySelector('[data-action="rehearse"]');assert.ok(preview);preview.click();await settled(()=>doc.querySelector('[data-preview-step]'));assert.deepEqual([...doc.querySelectorAll('[data-preview-step]')].map(b=>b.dataset.previewStep),['legacy-explanation','complete']);assert.equal(doc.querySelector('[data-preview-answer]'),null);assert.equal(JSON.stringify(store.learner('author-demo')),before);
});

test('DESIGN13 restore confirmation defaults to Cancel and preserves the initiating field',async t=>{const {w,doc,store}=await app(t,{page:'settings',author:true}),before={learner:structuredClone(store.learner('author-demo')),content:store.snapshot()},trigger=doc.querySelector('[data-action=restore]');trigger.focus();const cancel=w.askConfirmation('SYNTHETIC backup restore question','Restore backup');assert.equal(doc.querySelector('.confirmation-dialog').open,true);assert.equal(doc.activeElement,doc.querySelector('[data-confirm-cancel]'));doc.querySelector('[data-confirm-cancel]').click();assert.equal(await cancel,false);assert.equal(doc.querySelector('.confirmation-dialog'),null);assert.equal(doc.activeElement,trigger);assert.deepEqual({learner:store.learner('author-demo'),content:store.snapshot()},before);const accept=w.askConfirmation('SYNTHETIC backup restore question','Restore backup');doc.querySelector('[data-confirm-accept]').click();assert.equal(await accept,true);assert.deepEqual({learner:store.learner('author-demo'),content:store.snapshot()},before);});

test('DESIGN13 skip link focuses content without changing the lesson hash or writing progress',async t=>{const {doc,w,calls}=await app(t,{page:'lesson/lesson-1/apply'}),route=w.location.hash,count=calls.length;doc.querySelector('.skip-link').click();await settled(()=>!doc.querySelector('.skip-link').disabled);assert.equal(doc.activeElement,doc.querySelector('#main-content'));assert.equal(w.location.hash,route);assert.equal(calls.length,count);});

test('DESIGN13 real lesson keyboard closes for a non-typing portion and unrelated word dialog',async t=>{
 const {w,doc}=await app(t,{page:'lesson/lesson-1/apply',ownerKeyboard:true,prepare(store){store.updateLearner('learner-demo',{keyboardPinned:true,keyboardConvert:true});}});click(doc,'keyboard-open');const answer=doc.querySelector('#answer');answer.value='SYNTHETIC preserved';doc.body.style.setProperty('--hebleo-keyboard-height','320px');doc.querySelector('[data-action=step][data-value=vocabulary]').click();await settled(()=>doc.querySelector('.word-card'));assert.equal(doc.querySelector('.hebleo-keyboard--open'),null);assert.equal(doc.body.style.getPropertyValue('--hebleo-keyboard-height'),'');assert.equal(doc.querySelector('.hebleo-keyboard__launcher').getAttribute('aria-expanded'),'false');doc.querySelector('[data-action=lookup]').click();assert.ok(doc.querySelector('#context-panel'));assert.equal(doc.querySelector('.hebleo-keyboard--open'),null);assert.equal(answer.value,'SYNTHETIC preserved');const before=answer.value;answer.dispatchEvent(new w.KeyboardEvent('keydown',{key:'t',bubbles:true,cancelable:true}));doc.querySelector('.hebleo-keyboard [data-insert="א"]').click();assert.equal(answer.value,before);assert.equal(doc.querySelector('#personal-note').value,'');
});
