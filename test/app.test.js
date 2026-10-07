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
import {composeSentence,bindMatching,matchWord} from '../public/interactions.js';
import {richCell,cellCSS,createLessonRenderer} from '../public/rich.js';
import * as learnerView from '../public/learner-view.js';
import {mountLessonEditor} from '../public/studio/lesson-editor.js';
import {mountExerciseEditor} from '../public/studio/exercise-editor.js';
import {inspectImport,renderImportReview} from '../public/studio/import-review.js';
import {pathToFileURL} from 'node:url';
const {mountLessonPreview} = await import(process.env.HEBLEO_PREVIEW_CONTROLLER ? pathToFileURL(process.env.HEBLEO_PREVIEW_CONTROLLER) : '../public/preview/lesson-preview.js');
import {createLearnerRenderer} from '../public/preview/learner-renderer.js';
async function settled(predicate){for(let i=0;i<80;i++){if(predicate())return;await new Promise(r=>setTimeout(r,5));}throw new Error('App condition did not settle.');}
async function app(t,{page='lesson/lesson-2/learn',author=false,prepare,ownerKeyboard=false,store:providedStore,realHTTP=false}={}){
  const store=providedStore||new Store();prepare?.(store);const d=new JSDOM('<div id="app"></div><div id="toast"></div>',{url:'http://127.0.0.1/#'+page,runScripts:'outside-only',pretendToBeVisual:true}),w=d.window;
  let server,origin;
  if(realHTTP){server=createServer(store);await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;}
  t.after(async()=>{w.close();if(server)await new Promise(r=>server.close(r));if(!providedStore)store.close();});w.matchMedia=()=>({matches:false});w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
  if(author)w.localStorage.setItem('hebleo-demo-user','author-demo');
  if(ownerKeyboard){w.scrollBy=()=>{};w.eval(readFileSync(new URL('../public/keyboard-owner.js',import.meta.url),'utf8'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));}
  Object.assign(w,ux,learnerView,{structuredClone,resolveBlock,importVocabularyCSV,composeSentence,bindMatching,matchWord,richCell,cellCSS,renderLesson:createLessonRenderer(marked,createPurifier(w),w.document),mountLessonEditor,mountExerciseEditor,inspectImport,renderImportReview,mountLessonPreview,createLearnerRenderer,playAudio:async()=>{},stopMedia(){},clearRecording(){},feedbackSound(){}});
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
    else if(url.pathname==='/api/studio/draft'){store.requireAuthor(user);value=store.stage(input);}
    else if(url.pathname==='/api/studio/publish'){store.requireAuthor(user);value=store.publish(input.baseRevisionId,input.draftToken);}
    else if(url.pathname==='/api/studio/rollback'){store.requireAuthor(user);value=store.rollback(input.revisionId,input.baseRevisionId,input.expectedDraftToken);}
    else if(url.pathname==='/api/studio/preview/session'){store.requireAuthor(user);value=store.previewSession(input);}
    else if(url.pathname==='/api/studio/preview/evaluate'){store.requireAuthor(user);value=store.previewEvaluate(input);}
    else if(url.pathname==='/api/help')value={source:'demo-authored',text:store.snapshot(input.revisionId).lessons.find(l=>l.id===input.lessonId).explanation};
    else throw new Error('Unexpected app API '+url.pathname);
    return {ok:true,json:async()=>structuredClone(value)};
  }catch(e){return {ok:false,status:e.status||500,json:async()=>({error:e.message,code:e.code,...e.details})};}};
  w.eval(readFileSync(new URL('../public/app.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,''));
  await settled(()=>w.document.querySelector('h1'));return {store,w,doc:w.document,calls};
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
  await settled(()=>a.doc.querySelector('[data-action="rehearse"]:not([disabled])')&&b.doc.querySelector('#guided-exercise-editor form'));
  click(a.doc,'rehearse');await settled(()=>a.doc.querySelector('#rehearsal-panel [data-preview-step="apply"]'));
  const dialog=()=>a.doc.querySelector('#rehearsal-panel');
  dialog().querySelector('[data-preview-step="apply"]').click();
  const answer=dialog().querySelector('#answer');edit(a.w,answer,'אני');
  const choice=b.doc.querySelector('#guided-exercise');choice.value='ex-1-type';choice.dispatchEvent(new b.w.Event('change',{bubbles:true}));
  const form=b.doc.querySelector('#guided-exercise-editor form');edit(b.w,form.elements.prompt,'Synthetic G5-01 two-window change');submit(b.w,form);
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
  const beforePreference=store.db.prepare('SELECT total_changes() AS n').get().n;
  pin().click();await settled(()=>calls.includes('/api/preferences'));
  await settled(()=>store.db.prepare('SELECT total_changes() AS n').get().n>beforePreference);
  assert.equal(store.learner('author-demo').preferences.keyboardPinned,false);
  assert.equal(events.length,2,'same handler operates after disposal');
  assert.equal(calls.filter(path=>path==='/api/preferences').length,1,'positive control proves active persistence outside rehearsal');
});

test('Studio guided exercise and lesson forms save private drafts, reload discards unsaved edits, a stale token keeps entered values, and publishing stays separate',async t=>{
  const {store,w,doc}=await app(t,{page:'studio',author:true});
  const exerciseForm=()=>doc.querySelector('#guided-exercise-editor form'),lessonForm=()=>doc.querySelector('#guided-lesson-editor form');
  await settled(()=>exerciseForm()&&lessonForm());
  const published=structuredClone(store.snapshot()),revision=store.get('active'),learners=learnerRecords(store);
  assert.equal(doc.querySelector('[data-action="rehearse"]').disabled,true,'rehearsal needs an explicitly saved draft');
  assert.equal(doc.querySelector('#guided-exercise').value,'ex-1-recognize');
  edit(w,exerciseForm().elements.prompt,draftPrompt);submit(w,exerciseForm());
  await settled(()=>store.currentDraft()?.content.exercises.find(e=>e.id==='ex-1-recognize').prompt===draftPrompt&&doc.querySelector('[data-action="rehearse"]:not([disabled])'));
  assert.deepEqual(store.snapshot(),published);assert.equal(store.get('active'),revision);
  assert.match(doc.querySelector('.studio-preview table').textContent,/ex-1-recognize/);
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
  const select=doc.querySelector('#guided-exercise');select.value='ex-1-type';select.dispatchEvent(new w.Event('change',{bubbles:true}));
  await settled(()=>/ex-1-type/.test(exerciseForm()?.textContent||''));
  assert.deepEqual(store.snapshot(),published);assert.deepEqual(learnerRecords(store),learners);
  click(doc,'publish');await settled(()=>store.get('active')===revision+1&&store.currentDraft()===null);
  assert.equal(store.snapshot().lessons[0].title,'Synthetic lesson title');assert.equal(store.snapshot().exercises.find(e=>e.id==='ex-1-recognize').prompt,draftPrompt);
  assert.deepEqual(learnerRecords(store),learners);
});

test('Studio import review writes nothing until the reviewed candidate is staged, discard writes nothing, and a stale review cannot be staged',async t=>{
  const {store,doc}=await app(t,{page:'studio',author:true});await settled(()=>doc.querySelector('#import-file'));
  const before=tables(store),published=structuredClone(store.snapshot()),learners=learnerRecords(store);
  const choose=(name,value)=>{const raw=JSON.stringify(value);Object.defineProperty(doc.querySelector('#import-file'),'files',{configurable:true,value:[{name,size:raw.length,text:async()=>raw}]});};
  const candidate=structuredClone(published);candidate.words.find(x=>x.id==='w-ani').english='I (synthetic import)';candidate.provenance={...candidate.provenance,label:'Synthetic import fixture'};
  choose('synthetic-pack.json',candidate);click(doc,'import-review');await settled(()=>doc.querySelector('#import-review'));
  assert.match(doc.querySelector('#import-review').textContent,/words · w-ani · changed/);assert.match(doc.querySelector('#import-review').textContent,/I \(synthetic import\)/);
  assert.deepEqual(tables(store),before,'reviewing writes nothing');
  click(doc,'import-discard');await settled(()=>!doc.querySelector('#import-review'));assert.deepEqual(tables(store),before,'discarding writes nothing');
  choose('synthetic-pack.json',candidate);click(doc,'import-review');await settled(()=>doc.querySelector('#import-review [data-action="import"]'));
  click(doc,'import');await settled(()=>store.currentDraft()&&!doc.querySelector('#import-review'));
  assert.deepEqual(store.currentDraft().content,candidate);assert.deepEqual(store.snapshot(),published);
  assert.match(doc.querySelector('.studio-preview table').textContent,/Pack provenance/);
  const second=structuredClone(candidate);second.words.find(x=>x.id==='w-ani').notes='Synthetic note';
  choose('second.json',second);click(doc,'import-review');await settled(()=>doc.querySelector('#import-review [data-action="import"]'));
  stageDraft(store,c=>{c.lessons[0].title='Synthetic title from another tab';});const otherToken=store.currentDraft().draftToken;
  click(doc,'import');await settled(()=>/changed elsewhere/.test(doc.querySelector('#toast').textContent));
  assert.equal(store.currentDraft().draftToken,otherToken,'a stale review cannot overwrite the newer draft');
  click(doc,'studio-reload');await settled(()=>doc.querySelector('#import-review [role="alert"]'));
  assert.equal(doc.querySelector('#import-review [data-action="import"]'),null);
  assert.deepEqual(store.snapshot(),published);assert.deepEqual(learnerRecords(store),learners);
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
  assert.equal(scrolled[0],inside('.exercise-footer'));assert.ok(scrolled[0].contains(inside('[data-action="retry-question"]')),'Retry is inside the revealed area');
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
  click(doc,'studio-reload');await settled(()=>/another tab/.test(doc.querySelector('#guided-lesson-editor form')?.elements.title.value||''));
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

test('Switching exercises while a guided lesson save is still reloading keeps re-mounted editors and Publish on the token that save returned',async t=>{
  const {store,w,doc}=await app(t,{page:'studio',author:true,prepare(s){stageDraft(s,c=>{c.exercises.find(e=>e.id==='ex-1-recognize').prompt=draftPrompt;});}});
  const reload=holdStudioReload(w),exerciseForm=()=>doc.querySelector('#guided-exercise-editor form'),lessonForm=()=>doc.querySelector('#guided-lesson-editor form'),status=()=>exerciseForm().querySelector('[data-editor-status]').textContent;
  await settled(()=>exerciseForm()&&lessonForm()&&doc.querySelector('[data-action="publish"]'));
  const revision=store.get('active'),learners=learnerRecords(store);
  reload.hold();edit(w,lessonForm().elements.title,'Synthetic lesson title');submit(w,lessonForm());
  await settled(()=>store.currentDraft()?.content.lessons[0].title==='Synthetic lesson title'&&reload.waiting);
  let saved=store.currentDraft().draftToken;
  const select=doc.querySelector('#guided-exercise');select.value='ex-1-type';select.dispatchEvent(new w.Event('change',{bubbles:true}));
  await settled(()=>/ex-1-type/.test(exerciseForm()?.textContent||''));
  assert.ok([...exerciseForm().elements].every(el=>el.disabled),'an editor mounted from the pre-save state stays disabled');
  submit(w,exerciseForm());await settled(()=>/still reloading/.test(status()));
  assert.equal(store.currentDraft().draftToken,saved,'a pre-save editor cannot write');
  reload.release();await settled(()=>!reload.waiting&&exerciseForm()&&!exerciseForm().elements.prompt.disabled&&/ex-1-type/.test(exerciseForm().textContent));
  // The re-mounted editor names the current token, so its save succeeds and keeps the lesson change.
  const mounted=exerciseForm();edit(w,mounted.elements.prompt,'Synthetic typing prompt');submit(w,mounted);
  await settled(()=>store.currentDraft()?.content.exercises.find(e=>e.id==='ex-1-type').prompt==='Synthetic typing prompt'&&exerciseForm()&&exerciseForm()!==mounted);
  assert.equal(store.currentDraft().content.lessons[0].title,'Synthetic lesson title');assert.notEqual(store.currentDraft().draftToken,saved);
  reload.hold();edit(w,lessonForm().elements.chapter,'Synthetic chapter');submit(w,lessonForm());
  await settled(()=>store.currentDraft()?.content.lessons[0].chapter==='Synthetic chapter'&&reload.waiting);
  saved=store.currentDraft().draftToken;
  click(doc,'publish');await new Promise(r=>setTimeout(r,20));
  assert.equal(store.get('active'),revision,'Publish waits for the pending reload');assert.equal(publishBody(reload),undefined);
  reload.release();await settled(()=>store.get('active')===revision+1&&store.currentDraft()===null&&/Published locally/.test(doc.querySelector('#toast').textContent));
  assert.equal(publishBody(reload).draftToken,saved,'Publish names the token this tab saved');
  const live=store.snapshot();assert.equal(live.lessons[0].title,'Synthetic lesson title');assert.equal(live.lessons[0].chapter,'Synthetic chapter');
  assert.equal(live.exercises.find(e=>e.id==='ex-1-type').prompt,'Synthetic typing prompt');assert.equal(live.exercises.find(e=>e.id==='ex-1-recognize').prompt,draftPrompt);
  assert.deepEqual(learnerRecords(store),learners);
});

test('Publishing behind a pending guided save still rejects a newer draft from another tab and publishes nothing',async t=>{
  const {store,w,doc}=await app(t,{page:'studio',author:true,prepare(s){stageDraft(s,c=>{c.exercises.find(e=>e.id==='ex-1-recognize').prompt=draftPrompt;});}});
  const reload=holdStudioReload(w),lessonForm=()=>doc.querySelector('#guided-lesson-editor form');
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
  assert.ok([...doc.querySelectorAll('.lesson-card button')].every(b=>b.textContent==='Start →'));
  doc.querySelector('.hero button').click();
  await settled(()=>store.learner('learner-demo').resumes['lesson-1']);
  click(doc,'page'); await settled(()=>doc.querySelector('.hero'));
  assert.match(doc.querySelector('.hero button').textContent,/^Continue · Learn/);
  assert.equal(doc.querySelector('[data-value="lesson-2"].button').textContent,'Start →');
  const completed=await app(t,{page:'home',prepare(s){const learner=s.learner('learner-demo');learner.completed=['lesson-1'];s.saveLearner('learner-demo',learner);}});
  assert.equal(completed.doc.querySelector('[data-value="lesson-1"].button').textContent,'Revisit');
});
