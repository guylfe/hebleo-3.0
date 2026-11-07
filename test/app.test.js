import {helpControl,bindPracticeHelp} from '../public/conjugation/help.js';
import {IDBFactory} from 'fake-indexeddb';
import {mountReviewKeys} from '../public/review-shortcuts.js';
import {createReviewSave} from '../public/review-save.js';
import {mountSharedReview} from '../public/shared-cards.js';
import {createStudioWorkspace} from '../public/studio/workspace.js';
import {courseRailEdge,updateCourseToggle} from '../public/sidebar-toggle.js';
import {BACKUP_BYTE_LIMIT,serializeBackup} from '../public/backup-contract.js';
import {mountInlineAuthor} from '../public/author/inline-author.js';
import {openLessonPublication} from '../public/studio/lesson-publication.js';
import {hasTextPages,mountTextReader} from '../public/text-reader.js';
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
const parseRequestBody=body=>JSON.parse(typeof body==='string'?body:new TextDecoder().decode(body));
async function settled(predicate){const deadline=Date.now()+5000;while(Date.now()<deadline){if(predicate())return;await new Promise(r=>setTimeout(r,5));}throw new Error('App condition did not settle within 5 seconds.');}
async function app(t,{page='lesson/lesson-2/learn',author=false,prepare,ownerKeyboard=false,store:providedStore,realHTTP=false,reviewTransport,reviewStorage,width=1024,navigationPrefs,markdownDependencies,reduceMotion=false,textProgressTransport,sharedTutorialFixture=false}={}){
  const store=providedStore||new Store();prepare?.(store);const d=new JSDOM('<div id="app"></div><div id="toast"></div>',{url:'http://127.0.0.1/#'+page,runScripts:'outside-only',pretendToBeVisual:true}),w=d.window;
  Object.defineProperty(w,'innerWidth',{value:width,writable:true});let server,origin;
  if(realHTTP){server=createServer(store);await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;}
  t.after(async()=>{w.close();if(server)await new Promise(r=>server.close(r));if(!providedStore)store.close();});w.matchMedia=()=>({matches:reduceMotion});w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
  Object.assign(w,{BACKUP_BYTE_LIMIT,serializeBackup,courseRailEdge,updateCourseToggle,openLessonPublication});
  if(author)w.localStorage.setItem('hebleo-demo-user','author-demo');
  if(navigationPrefs)w.localStorage.setItem('hebleo-navigation-'+(author?'author-demo':'learner-demo'),JSON.stringify(navigationPrefs));
  if(ownerKeyboard){w.scrollBy=()=>{};w.eval(readFileSync(process.env.HEBLEO_KEYBOARD_SOURCE || new URL('../public/keyboard-owner.js',import.meta.url),'utf8'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));}
  Object.assign(w,{createStudioWorkspace,mountInlineAuthor,hasTextPages,mountTextReader,mountAnsweredVocabulary,renderLexicalVocabulary,bindLexicalVocabulary},ux,reviewScheduler,courseHelpers,learnerView,{structuredClone,resolveBlock,importVocabularyCSV,composeSentence,bindMatching,matchWord,richCell,cellCSS,renderLesson:createLessonRenderer(marked,createPurifier(w),w.document),mountMediaLibrary,mountSourceAuthoring,mountUnifiedStudio,mountTextImport,mountImportWorkflow,mountLessonEditor,mountExerciseEditor,inspectImport,renderImportReview,mountLessonPreview,createLearnerRenderer,getPlaybackState:()=>w.referenceState||{},playAudio:async()=>{},setPlaybackSpeed(){},stopMedia(){},clearRecording(){},feedbackSound(){}});
  if(markdownDependencies){w.mountUnifiedStudio=(host,options)=>mountUnifiedStudio(host,{...options,markdownDependencies:markdownDependencies(w)});w.mountInlineAuthor=(host,options)=>mountInlineAuthor(host,{...options,markdownDependencies:markdownDependencies(w)});}
  const calls=[];
  w.fetch=async(path,options={})=>{if(options.signal&&!(options.signal instanceof AbortSignal)){const originalSignal=options.signal,controller=new AbortController();if(originalSignal.aborted)controller.abort();else originalSignal.addEventListener('abort',()=>controller.abort(),{once:true});options={...options,signal:controller.signal};}const url=new URL(path,w.location.href),user=options.headers?.['x-demo-user']||'learner-demo',input=options.body?parseRequestBody(options.body):null;calls.push(url.pathname);try{let value;
    if(realHTTP){if(reviewTransport&&url.pathname.startsWith('/api/review/'))return await reviewTransport({url,input,perform:()=>fetch(origin+url.pathname+url.search,options)});return await fetch(origin+url.pathname+url.search,options);}
    if(url.pathname==='/api/bootstrap'){value=store.bootstrap(user);if(sharedTutorialFixture){value=structuredClone(value);value.content.words.find(word=>word.id==='w-ani').shared=true;value.due.forEach(card=>card.word.shared=true);}}
    else if(url.pathname==='/api/text-progress'&&textProgressTransport)value=await textProgressTransport({user,input,query:url.searchParams});
    else if(url.pathname==='/api/questions')value=input?store.askQuestion(user,input):store.questions(user);
    else if(url.pathname==='/api/session')value=store.session(user,url.searchParams.get('lessonId'));
    else if(url.pathname==='/api/session/latest')value=store.startLatestLesson(user,input.lessonId);
    else if(url.pathname==='/api/progress')value=store.saveProgress(user,input);
    else if(url.pathname==='/api/review/clock')value=store.reviewClock(user,input);
    else if(url.pathname==='/api/review/background')value=store.backgroundReview(user,input);
    else if(url.pathname==='/api/review/status')value={receipt:store.get('review-'+user+'-'+url.searchParams.get('requestId'))||null};
    else if(url.pathname==='/api/review/undo')value=store.undoReview(user,input);
    else if(url.pathname==='/api/preferences')value=store.updateLearner(user,input);
    else if(url.pathname==='/api/attempt')value=store.attempt(user,input);
    else if(url.pathname==='/api/practice')value=store.practice(user,input);
    else if(url.pathname==='/api/studio'){store.requireAuthor(user);value={...store.active(),preview:store.preview()};}
    else if(url.pathname==='/api/reports')value=store.reports(user);
    else if(url.pathname==='/api/studio/impact'){store.requireAuthor(user);value=store.workspaceImpact(input);}
    else if(url.pathname==='/api/studio/dependencies'){store.requireAuthor(user);value=store.exerciseDependencies(input);}
    else if(url.pathname==='/api/studio/draft'){store.requireAuthor(user);value=store.stage(input,undefined,{returnMinimal:options.headers?.Prefer==='return=minimal'});}
    else if(url.pathname==='/api/studio/publish'){store.requireAuthor(user);value=store.publish(input.baseRevisionId,input.draftToken);}
    else if(url.pathname==='/api/studio/publish-lesson/review'){store.requireAuthor(user);value=store.reviewLessonPublication(input);}
    else if(url.pathname==='/api/studio/publish-lesson'){store.requireAuthor(user);value=store.publishLesson(input);}
    else if(url.pathname==='/api/studio/rollback'){store.requireAuthor(user);value=store.rollback(input.revisionId,input.baseRevisionId,input.expectedDraftToken);}
    else if(url.pathname==='/api/studio/preview/session'){store.requireAuthor(user);value=store.previewSession(input);}
    else if(url.pathname==='/api/studio/preview/evaluate'){store.requireAuthor(user);value=store.previewEvaluate(input);}
    else if(url.pathname==='/api/help')value={source:'demo-authored',text:store.snapshot(input.revisionId).lessons.find(l=>l.id===input.lessonId).explanation};
    else throw new Error('Unexpected app API '+url.pathname);
    return {ok:true,json:async()=>structuredClone(value)};
  }catch(e){return {ok:false,status:e.status||500,json:async()=>({error:e.message,code:e.code,...e.details})};}};
  const reviewIDB=new IDBFactory();let queue;const reviewFactory=options=>{queue=createReviewSave({...options,indexedDB:reviewStorage||reviewIDB,pollMs:50});return queue;};t.after(()=>queue?.dispose?.());Object.assign(w,{helpControl,bindPracticeHelp,mountReviewKeys,createReviewSave:reviewFactory,mountSharedReview});w.eval(readFileSync(process.env.HEBLEO_APP_SOURCE || new URL('../public/app.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,''));
  await settled(()=>w.document.querySelector('h1'));return {store,w,doc:w.document,calls};
}
const click=(doc,action)=>{const el=doc.querySelector('[data-action="'+action+'"]');assert.ok(el,action);el.click();};

test('BACKGROUND actual app advances two cards while HTTP save is held, Finish retains queue and Undo follows drain',async t=>{
 let release,started=0;const {doc,store}=await app(t,{page:'review',realHTTP:true,prepare(s){s.enroll('learner-demo','w-ani');s.enroll('learner-demo','w-hu');},reviewTransport:async({url,perform})=>{if(url.pathname==='/api/review/background'&&++started===1)await new Promise(r=>release=r);return perform();}});
 click(doc,'review-start');await settled(()=>doc.querySelector('[data-action=review-reveal]'));click(doc,'review-reveal');const start=performance.now();click(doc,'review-rate');await settled(()=>doc.querySelector('[data-action=review-reveal]'));
 const visibleMs=performance.now()-start;assert.equal(store.learner('learner-demo').lastReview,undefined);await settled(()=>release);assert.match(doc.body.textContent,/pending/);
 click(doc,'review-reveal');click(doc,'review-rate');await settled(()=>doc.querySelector('h1').textContent.includes('finished'));click(doc,'review-end');await settled(()=>doc.querySelector('[data-action=review-start]'));assert.match(doc.body.textContent,/pending/);
 release();await settled(()=>store.learner('learner-demo').cards['w-hu'].repetitions===1&&doc.querySelector('[data-action=review-undo]'));await settled(()=>!doc.body.textContent.includes('pending'));click(doc,'review-undo');await settled(()=>store.learner('learner-demo').cards['w-hu'].repetitions===0);
 assert.equal(started,2);t.diagnostic('capture-to-next-visible '+visibleMs.toFixed(1)+'ms with first backend save held until Finish assertions');
});

test('BACKGROUND completion counts captured ratings rather than skipped siblings and Undo removes its count',async t=>{
 const a='sc-mf-000001-he-en',b='sc-mf-000001-en-he';
 const {doc,store}=await app(t,{page:'review',realHTTP:true,prepare(s){s.shared.word=id=>[a,b].includes(id)?{id,shared:true,sourceId:'mf-000001',english:'Synthetic note',hebrew:'fixture'}:null;for(const id of [a,b,'w-hu'])s.enroll('learner-demo',id);}});
 click(doc,'review-start');await settled(()=>doc.querySelector('[data-action=review-reveal]'));click(doc,'review-reveal');click(doc,'review-rate');await settled(()=>doc.querySelector('[data-pronunciation-word]')?.dataset.pronunciationWord==='w-hu');
 click(doc,'review-reveal');click(doc,'review-rate');await settled(()=>doc.querySelector('h1').textContent.includes('finished'));
 assert.equal(doc.querySelector('h2').textContent,'You reviewed 2 cards.');await settled(()=>!doc.body.textContent.includes('pending'));
 click(doc,'review-undo');await settled(()=>doc.querySelector('[data-action=review-reveal]')&&!doc.querySelector('[data-action=review-reveal]').disabled);
 assert.equal(store.learner('learner-demo').cards['w-hu'].repetitions,0);click(doc,'review-reveal');click(doc,'review-rate');await settled(()=>doc.querySelector('h1').textContent.includes('finished'));
 assert.equal(doc.querySelector('h2').textContent,'You reviewed 2 cards.');assert.equal(store.learner('learner-demo').cards[b].repetitions,0);
});

test('BACKGROUND actual app lost committed HTTP response recovers through status without another POST',async t=>{
 let posts=0;const {doc,store}=await app(t,{page:'review',realHTTP:true,prepare(s){s.enroll('learner-demo','w-ani');},reviewTransport:async({url,perform})=>{const response=await perform();if(url.pathname==='/api/review/background'){posts++;await response.text();throw Error('Synthetic lost committed response');}return response;}});
 click(doc,'review-start');await settled(()=>doc.querySelector('[data-action=review-reveal]'));click(doc,'review-reveal');click(doc,'review-rate');await settled(()=>doc.body.textContent.includes('need recovery'));assert.equal(store.learner('learner-demo').cards['w-ani'].repetitions,1);
 const retry=[...doc.querySelectorAll('button')].find(x=>x.textContent==='Check saved review');assert(retry);retry.click();await settled(()=>!doc.body.textContent.includes('need recovery'));assert.equal(posts,1);assert.equal(store.learner('learner-demo').cards['w-ani'].repetitions,1);
});

test('BACKGROUND actual app durable transaction failure retains revealed card and rating controls',async t=>{
 const factory=new IDBFactory();let fail=false;const reviewStorage={open(...args){const r=factory.open(...args);r.addEventListener('success',()=>{const db=r.result,transaction=db.transaction.bind(db);db.transaction=(...values)=>{if(fail)throw Error('Synthetic storage failure');return transaction(...values);};});return r;}};
 const {doc,store}=await app(t,{page:'review',realHTTP:true,reviewStorage,prepare(s){s.enroll('learner-demo','w-ani');s.enroll('learner-demo','w-hu');}});
 click(doc,'review-start');await settled(()=>doc.querySelector('[data-action=review-reveal]'));click(doc,'review-reveal');const before=doc.querySelector('.review-card').textContent;fail=true;click(doc,'review-rate');await settled(()=>doc.querySelector('#toast').textContent.includes('storage failure'));
 assert.equal(doc.querySelector('.review-card').textContent,before);assert.equal(store.learner('learner-demo').cards['w-ani'].repetitions,0);assert(doc.querySelector('[data-action=review-rate]'));fail=false;
});

test('BACKGROUND Undo then rerate reacquires CAS anchor and commits a new learner choice',async t=>{
 const {doc,store}=await app(t,{page:'review',realHTTP:true,prepare(s){s.enroll('learner-demo','w-ani');}});
 click(doc,'review-start');await settled(()=>doc.querySelector('[data-action=review-reveal]'));click(doc,'review-reveal');click(doc,'review-rate');await settled(()=>store.learner('learner-demo').lastReview&&doc.querySelector('[data-action=review-undo]'));
 const first=store.learner('learner-demo').lastReview.requestId;click(doc,'review-undo');await settled(()=>doc.querySelector('[data-action=review-reveal]')&&!doc.querySelector('[data-action=review-reveal]').disabled);click(doc,'review-reveal');click(doc,'review-rate');await settled(()=>store.learner('learner-demo').lastReview?.requestId!==first&&store.learner('learner-demo').cards['w-ani'].repetitions===1);await settled(()=>!doc.body.textContent.includes('pending'));
 assert(!doc.body.textContent.includes('need recovery'));
});

test('BACKGROUND expired Undo pause aborts original attempt without undoing another client rating',async t=>{
 const indexedDB=new IDBFactory();const {doc,w,store}=await app(t,{page:'review',realHTTP:true,reviewStorage:indexedDB,prepare(s){s.enroll('learner-demo','w-ani');s.enroll('learner-demo','w-hu');}});
 click(doc,'review-start');await settled(()=>doc.querySelector('[data-action=review-reveal]'));click(doc,'review-reveal');click(doc,'review-rate');await settled(()=>!doc.body.textContent.includes('pending')&&store.learner('learner-demo').lastReview);
 const original=w.fetch;let release,held=false,undoPosts=0;const gate=new Promise(r=>release=r);t.after(()=>release());
 w.fetch=async(path,options)=>{if(path==='/api/review/undo')undoPosts++;if(path==='/api/bootstrap'&&!held){held=true;await gate;}return original(path,options);};
 click(doc,'review-undo');await settled(()=>held);
 // Represents a 61-second suspended holder whose durable pause has expired.
 await new Promise((resolve,reject)=>{const r=indexedDB.open('hebleo-review-outbox-v1',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('scopes','readwrite'),store=tx.objectStore('scopes'),key=JSON.stringify(['hebleo-local-demo','learner-demo']),get=store.get(key);get.onsuccess=()=>{const value=get.result;assert(value.pause);value.pause.until=Date.now()-1;store.put(value,key);};tx.oncomplete=()=>{db.close();resolve();};tx.onabort=()=>reject(tx.error);};r.onerror=()=>reject(r.error);});
 const second=createReviewSave({background:true,ownerId:'learner-demo',isActive:()=>true,indexedDB,pollMs:10,getCardIds:()=>['w-hu'],send:async(path,body,signal)=>{const response=await original('/api/'+path,{method:body===undefined?'GET':'POST',headers:{'x-demo-user':'learner-demo','content-type':'application/json'},signal,...(body===undefined?{}:{body:JSON.stringify(body)})});const value=await response.json();if(!response.ok)throw Error(value.error);return value;}});t.after(()=>second.dispose());await second.clock();await second.commit({cardId:'w-hu',rating:3,requestId:randomUUID()});await settled(()=>store.learner('learner-demo').cards['w-hu'].repetitions===1);
 release();await settled(()=>doc.querySelector('#toast').textContent.includes('Undo pause expired or was lost'));assert.equal(undoPosts,0);const state=store.learner('learner-demo');assert.equal(state.cards['w-ani'].repetitions,1);assert.equal(state.cards['w-hu'].repetitions,1);assert.equal(state.lastReview.wordId,'w-hu');assert(!doc.querySelector('#toast').textContent.includes('restored'));
});

test('BACKGROUND authoritative shortened synthetic learning boundary returns through timed bootstrap',async t=>{
 let storeRef,shorten=true;const {doc,store,w,calls}=await app(t,{page:'review',realHTTP:true,prepare(s){storeRef=s;s.enroll('learner-demo','w-ani');},reviewTransport:async({url,perform})=>{
  const response=await perform();if(url.pathname!=='/api/review/background'||!shorten)return response;shorten=false;const receipt=await response.json(),state=storeRef.learner('learner-demo');
  // Test-only 150ms due boundary, preserving the production algorithm unchanged.
  state.cards[receipt.cardId].due=new Date(Date.now()+150).toISOString();state.lastReview.after=structuredClone(state.cards[receipt.cardId]);storeRef.saveLearner('learner-demo',state);receipt.authoritativeSchedule=receipt.card=structuredClone(state.cards[receipt.cardId]);receipt.resultingVersion=storeRef.reviewVersion(state,receipt.cardId);storeRef.set('review-learner-demo-'+receipt.requestId,receipt);return {ok:true,json:async()=>receipt};
 }});
 click(doc,'review-start');await settled(()=>doc.querySelector('[data-action=review-reveal]'));click(doc,'review-reveal');click(doc,'review-rate');await settled(()=>store.learner('learner-demo').cards['w-ani'].repetitions===1);await settled(()=>doc.querySelector('[data-action=review-reveal]')&&!doc.querySelector('[data-action=review-reveal]').disabled);

 assert.equal(doc.querySelector('[data-pronunciation-word]').dataset.pronunciationWord,'w-ani');assert.equal(store.bootstrap('learner-demo').due.length,1);click(doc,'review-end');await settled(()=>doc.querySelector('h2')?.textContent==='1 cards due');assert.equal(doc.querySelector('[data-action=review-start]').disabled,false);
});

test('BACKGROUND rejected card stays excluded until explicit fresh-state resolution; next choice gets a new ID',async t=>{
 let conflict=true;const {doc,store}=await app(t,{page:'review',realHTTP:true,prepare(s){s.enroll('learner-demo','w-ani');},reviewTransport:async({url,perform})=>{
  if(url.pathname==='/api/review/background'&&conflict){conflict=false;const state=store.learner('learner-demo');state.cards['w-ani'].intervalDays=1;store.saveLearner('learner-demo',state);}return perform();
 }});
 click(doc,'review-start');await settled(()=>doc.querySelector('[data-action=review-reveal]'));click(doc,'review-reveal');click(doc,'review-rate');await settled(()=>doc.body.textContent.includes('Resolve rejected rating'));assert.equal(store.learner('learner-demo').cards['w-ani'].repetitions,0);
 const rejected=store.db.prepare("SELECT value FROM kv WHERE key LIKE 'review-learner-demo-%'").all().map(x=>JSON.parse(x.value)).find(x=>x.outcome==='rejected');assert(rejected);[...doc.querySelectorAll('button')].find(x=>x.textContent==='Resolve rejected rating').click();await settled(()=>doc.querySelector('[data-action=review-reveal]')&&!doc.querySelector('[data-action=review-reveal]').disabled);click(doc,'review-reveal');click(doc,'review-rate');await settled(()=>store.learner('learner-demo').cards['w-ani'].repetitions===1);assert.notEqual(store.learner('learner-demo').lastReview.requestId,rejected.requestId);
});

test('F14 actual app backup download and confirmed HTTP restore retain exact comments, saved token and revision counts through three roundtrips',async t=>{
 const {w,doc,store,calls}=await app(t,{author:true,page:'settings',realHTTP:true});
 const base=store.get('active'),c=store.snapshot();c.lessons[0].explanation+='<p>SYNTHETIC 😀 שָׁלוֹם recovery fixture.</p>';
 store.stage({baseRevisionId:base,expectedDraftToken:null,content:c});
 store.authorReview.create('author-demo',{requestId:randomUUID(),lessonId:c.lessons[0].id,componentId:null,pageId:null,activityId:null,fieldPath:'explanation',baseRevisionId:base,draftToken:store.currentDraft().draftToken,selection:null,body:'SYNTHETIC app recovery comment'});
 const token=store.currentDraft().draftToken,review=store.authorReview.state(),revisions=store.db.prepare('SELECT * FROM revisions ORDER BY id').all(),downloads=[];
 w.Blob=Blob;w.URL.createObjectURL=blob=>{downloads.push(blob);return 'blob:synthetic-download';};w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){assert.equal(this.download,'hebleo-demo-backup.json');};
 for(let i=0;i<3;i++){
  click(doc,'export-backup');await settled(()=>downloads.length===i+1);const text=await downloads[i].text(),payload=JSON.parse(text);assert.equal(text,serializeBackup(payload));assert.ok(downloads[i].size<=BACKUP_BYTE_LIMIT);
  Object.defineProperty(doc.querySelector('#restore-file'),'files',{configurable:true,value:[{size:downloads[i].size,text:async()=>text}]});
  const previous=calls.filter(p=>p==='/api/restore').length;doc.querySelector('#toast').textContent='';click(doc,'restore');await settled(()=>doc.querySelector('[data-confirm-accept]')||doc.querySelector('#toast').textContent);assert.ok(doc.querySelector('[data-confirm-accept]'),doc.querySelector('#toast').textContent);doc.querySelector('[data-confirm-accept]').click();
  await settled(()=>calls.filter(p=>p==='/api/restore').length===previous+1&&doc.querySelector('#toast').textContent==='Local backup restored.');
  assert.deepEqual(store.authorReview.state(),review);assert.equal(store.currentDraft().draftToken,token);assert.deepEqual(store.db.prepare('SELECT * FROM revisions ORDER BY id').all(),revisions);
 }
 const before=calls.length;Object.defineProperty(doc.querySelector('#restore-file'),'files',{configurable:true,value:[{size:BACKUP_BYTE_LIMIT+1}]});click(doc,'restore');await settled(()=>doc.querySelector('#toast').textContent.includes('200 MB restore limit'));assert.equal(calls.length,before);
});

function first20Draft(store){store.importTextDraft({baseRevisionId:store.get('active'),expectedDraftToken:null,pack:JSON.parse(readFileSync(new URL('../docs/curriculum/first20-20261025/content.json',import.meta.url)))});}
const pickerDump=store=>JSON.stringify(store.db.prepare("SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name").all().map(({name})=>[name,store.db.prepare('SELECT * FROM "'+name+'" ORDER BY 1').all()]));

test('STUDIO-PICKER-01 real app Choose lesson lists all23 drafts and routes MEMORY/MNT editor and saved Preview without writes',async t=>{
 const {store,w,doc,calls}=await app(t,{author:true,page:'studio',realHTTP:true,prepare:first20Draft});
 await settled(()=>doc.querySelector('[data-current-lesson]'));
 const before=pickerDump(store),requests=[],fetch=w.fetch;
 w.fetch=(path,options)=>{if(path==='/api/studio/preview/session')requests.push(parseRequestBody(options.body));return fetch(path,options);};
 for(const readable of ['MEMORY','MNT']){
  const lesson=store.currentDraft().content.lessons.find(l=>l.contentId===readable);
  doc.querySelector('.studio-context button').click();const picker=doc.querySelector('.studio-lesson-picker');assert.ok(picker?.open,'Choose lesson opens a visible native dialog');
  assert.equal(picker.querySelectorAll('[data-pick-lesson]').length,23);assert.equal(doc.activeElement,picker.querySelector('input'));
  assert.equal(picker.querySelectorAll('[aria-current=true]').length,1);
  picker.querySelector('[data-pick-lesson="'+lesson.id+'"]').click();
  assert.equal(doc.querySelector('.studio-lesson-picker'),null);assert.equal(doc.querySelector('[data-selected-lesson]').textContent,lesson.id);
  assert.equal(doc.querySelector('[data-lesson-metadata] [name=title]').value,lesson.title);
  assert.equal(doc.activeElement,doc.querySelector('[data-lesson-metadata] [name=title]'));
  assert.equal(doc.querySelector('[data-page-select]').options.length,lesson.blocks[0].textPages.pages.length);
  assert.equal(doc.querySelector('[data-action=rehearse]').dataset.value,lesson.id);
  click(doc,'rehearse');await settled(()=>doc.querySelector('#rehearsal-panel .learner-preview'));
  assert.equal(requests.at(-1).lessonId,lesson.id);assert.equal(requests.at(-1).draftToken,store.currentDraft().draftToken);
  assert.ok(doc.querySelector('#rehearsal-panel [data-text-reader]'),'saved paginated text is mounted in the actual shared Preview');
  doc.querySelector('#rehearsal-panel [data-preview-exit]').click();await settled(()=>!doc.querySelector('#rehearsal-panel'));
 }
 assert.equal(pickerDump(store),before,'chooser/editor/Preview never save or publish');
 assert.equal(calls.some(path=>['/api/studio/draft','/api/studio/publish','/api/progress'].includes(path)),false);
});

test('STUDIO-PICKER-02 switching retains lesson/page/sibling edits; Preview remains the saved draft',async t=>{
 const {store,w,doc}=await app(t,{author:true,page:'studio',realHTTP:true,prepare:first20Draft});await settled(()=>doc.querySelector('[data-current-lesson]'));
 const before=pickerDump(store),title=doc.querySelector('[data-lesson-metadata] [name=title]');edit(w,title,'SYNTHETIC unsaved original title');
 const word=doc.querySelector('[data-canonical-word] [name=notes]');edit(w,word,'SYNTHETIC sibling notes retained');
 const choose=id=>{click(doc,'studio-choose-lesson');doc.querySelector('[data-pick-lesson="'+id+'"]').click();};
 choose('draft-first20-MEMORY');edit(w,doc.querySelector('[data-page-field=title]'),'SYNTHETIC unsaved MEMORY page');
 choose('draft-first20-MNT');choose('draft-first20-MEMORY');assert.equal(doc.querySelector('[data-page-field=title]').value,'SYNTHETIC unsaved MEMORY page');
 click(doc,'rehearse');await settled(()=>doc.querySelector('#rehearsal-panel .learner-preview'));assert.equal(doc.querySelector('#rehearsal-panel').textContent.includes('SYNTHETIC unsaved MEMORY page'),false);doc.querySelector('#rehearsal-panel [data-preview-exit]').click();
 choose('lesson-1');assert.equal(doc.querySelector('[data-lesson-metadata] [name=title]').value,'SYNTHETIC unsaved original title');assert.equal(doc.querySelector('[data-canonical-word] [name=notes]').value,'SYNTHETIC sibling notes retained');assert.equal(pickerDump(store),before);
});

test('STUDIO-PICKER-03 chapter filtering cannot omit drafts; search, cancel, Escape and visible validation failure retain focus and edits',async t=>{
 const {store,w,doc}=await app(t,{author:true,page:'studio',realHTTP:true,prepare:first20Draft});await settled(()=>doc.querySelector('[data-current-lesson]'));
 const before=pickerDump(store),filter=doc.querySelector('[data-chapter-filter]');filter.value='ungrouped';filter.dispatchEvent(new w.Event('change',{bubbles:true}));
 click(doc,'studio-choose-lesson');let picker=doc.querySelector('.studio-lesson-picker');assert.equal(picker.querySelectorAll('[data-pick-lesson]').length,23);
 edit(w,picker.querySelector('input'),'MEMORY');assert.equal(picker.querySelectorAll('[data-pick-lesson]').length,1);picker.querySelector('[data-picker-close]').click();assert.equal(doc.activeElement,doc.querySelector('[data-action=studio-choose-lesson]'));
 click(doc,'studio-choose-lesson');picker=doc.querySelector('.studio-lesson-picker');picker.dispatchEvent(new w.Event('cancel',{cancelable:true}));assert.equal(doc.querySelector('.studio-lesson-picker'),null);assert.equal(doc.activeElement,doc.querySelector('[data-action=studio-choose-lesson]'));
 const invalid=doc.querySelector('[data-canonical-word] [name=richFields]');edit(w,invalid,'{incomplete');const selected=doc.querySelector('[data-selected-lesson]').textContent;
 click(doc,'studio-choose-lesson');picker=doc.querySelector('.studio-lesson-picker');picker.querySelector('[data-pick-lesson="draft-first20-MEMORY"]').click();assert.equal(picker.open,true);assert.match(picker.querySelector('[role=alert]').textContent,/not changed.*edits are retained/);assert.equal(doc.querySelector('[data-selected-lesson]').textContent,selected);picker.querySelector('[data-picker-close]').click();assert.equal(invalid.value,'{incomplete');assert.equal(pickerDump(store),before);
});

test('STUDIO-PICKER-04 pending CAS save refuses lesson replacement and retains the matching Preview target',async t=>{
 const {store,w,doc}=await app(t,{author:true,page:'studio',realHTTP:true,prepare:first20Draft});await settled(()=>doc.querySelector('[data-current-lesson]'));
 const reload=holdStudioReload(w);t.after(()=>reload.release());reload.hold();
 edit(w,doc.querySelector('[data-lesson-metadata] [name=title]'),'SYNTHETIC explicitly saved title');submit(w,doc.querySelector('[data-lesson-metadata]'));
 await settled(()=>reload.waiting);click(doc,'studio-choose-lesson');const picker=doc.querySelector('.studio-lesson-picker');picker.querySelector('[data-pick-lesson="draft-first20-MEMORY"]').click();assert.equal(picker.open,true);assert.match(picker.querySelector('[role=alert]').textContent,/not changed/);assert.equal(doc.querySelector('[data-selected-lesson]').textContent,'lesson-1');assert.equal(doc.querySelector('[data-action=rehearse]').dataset.value,'lesson-1');picker.querySelector('[data-picker-close]').click();reload.release();await settled(()=>!doc.querySelector('#unified-studio-mount [aria-busy=true]'));
 assert.equal(store.snapshot().lessons.length,3);assert.equal(store.currentDraft().content.lessons.length,23);
});

test('Ordering word selection and removal stay immediate during a slow save and persist the latest sentence',async t=>{
 const {w,doc,store}=await app(t,{page:'lesson/lesson-2/apply',realHTTP:true}),fetch=w.fetch;
 let release,held=true;
 w.fetch=async(path,options)=>{
  if(path==='/api/progress'&&held){held=false;await new Promise(resolve=>{release=resolve;});}
  return fetch(path,options);
 };
 t.after(()=>release?.());
 const choose=index=>doc.querySelector('[data-action=token][data-value="'+index+'"]').click();
 choose(0);
 await settled(()=>release);
 assert.equal(doc.querySelectorAll('[data-action=remove-token]').length,1,'first word is visible without a save response');
 choose(1);
 assert.equal(doc.querySelectorAll('[data-action=remove-token]').length,2,'a pending save does not block another word');
 doc.querySelector('[data-action=remove-token][data-value="0"]').click();
 assert.equal(doc.querySelectorAll('[data-action=remove-token]').length,1,'removal is visible while the save remains pending');
 assert.equal(doc.querySelector('[data-action=token][data-value="0"]').disabled,false);
 assert.equal(doc.querySelector('[data-action=token][data-value="1"]').disabled,true);
 release();
 await settled(()=>JSON.stringify(store.learner('learner-demo').resumes['lesson-2']?.selectedTokens)==='[1]');
 const restored=await app(t,{page:'lesson/lesson-2/apply',store,realHTTP:true});
 assert.equal(restored.doc.querySelectorAll('[data-action=remove-token]').length,1);
 assert.equal(restored.doc.querySelector('[data-action=token][data-value="1"]').disabled,true);
});

for(const correct of [true,false])test('Published illustrative Build lesson exposes word cards in the actual learner app '+correct,async t=>{
 const {w,doc,store}=await app(t,{page:'lesson/lesson-2/apply',realHTTP:true,prepare:publishIllustrativeLinks});
 assert.equal(doc.querySelector('[data-vocabulary-word]'),null);
 for(const text of correct?['אני','ב','בית']:['בית']){
  const token=[...doc.querySelectorAll('[data-action=token]')].find(el=>el.textContent===text);assert.ok(token,text);token.click();
 }
 click(doc,'check');await settled(()=>doc.querySelector('[data-vocabulary-word]'));
 assert.equal(store.learner('learner-demo').attempts.at(-1).correct,correct);
 assert.equal(doc.querySelector('button button'),null);
 const trigger=doc.querySelector('[data-vocabulary-word="w-ani"]');assert.ok(trigger,'a word itself opens its linked entry');
 w.HTMLElement.prototype.getBoundingClientRect=function(){return {left:20,top:40,right:180,bottom:80,width:160,height:40};};
 w.HTMLElement.prototype.getClientRects=function(){return [this.getBoundingClientRect()];};
 trigger.click();assert.ok(doc.querySelector('.vocabulary-reminder'));
 const before=JSON.stringify(store.learner('learner-demo'));doc.querySelector('[data-vocabulary-close]').click();
 assert.equal(JSON.stringify(store.learner('learner-demo')),before);
});

test('POST-VOC delayed choice save cannot replace the grading scope or drop returned feedback',async t=>{
 const {w,doc,store}=await app(t,{page:'lesson/lesson-1/check',realHTTP:true}),original=w.fetch;let release;
 w.fetch=async(path,options)=>{const response=await original(path,options);if(path==='/api/progress'&&!release){await new Promise(resolve=>{release=resolve;});}return response;};
 const expected=store.snapshot().words.find(w=>w.id==='w-mi').english,choice=[...doc.querySelectorAll('[data-action=choice]')].find(el=>el.dataset.value===expected),scope=doc.querySelector('#practice');choice.click();await settled(()=>release);
 click(doc,'check');await settled(()=>store.learner('learner-demo').attempts.length===1);release();await settled(()=>doc.querySelector('[data-vocabulary-word]'));
 assert.equal(doc.querySelector('#practice'),scope);assert.ok(doc.querySelector('.feedback:not(.wrong)'));assert.equal(store.learner('learner-demo').attempts.length,1);
});
for(const correct of [true,false])test('POST-VOC actual HTTP app gates correct/incorrect cards, preserves grade/state, reloads feedback and clears on retry/next/profile '+correct,async t=>{
 const {w,doc,store,calls}=await app(t,{page:'lesson/lesson-1/check',realHTTP:true});
 assert.equal(doc.querySelector('[data-vocabulary-word]'),null);
 const expected=store.snapshot().words.find(w=>w.id==='w-mi').english;
 const choice=[...doc.querySelectorAll('[data-action=choice]')].find(el=>correct?el.dataset.value===expected:el.dataset.value!==expected);assert.ok(choice);choice.click();await settled(()=>doc.querySelector('[data-action=choice].selected'));
 const prompt=doc.querySelector('.exercise-prompt'),input=doc.querySelector('[data-exercise-input]');click(doc,'check');
 await settled(()=>doc.querySelector('[data-vocabulary-word]')&&store.learner('learner-demo').resumes['lesson-1']?.resultRequestId);
 assert.equal(doc.querySelector('.exercise-prompt'),prompt);assert.equal(doc.querySelector('[data-exercise-input]'),input);assert.ok([...doc.querySelectorAll('[data-action=choice]')].every(el=>el.disabled));
 assert.equal(store.learner('learner-demo').attempts.length,1);assert.equal(store.learner('learner-demo').attempts[0].correct,correct);
 const before=JSON.stringify(store.learner('learner-demo')),writes=calls.filter(p=>['/api/attempt','/api/progress','/api/preferences'].includes(p)).length;
 // Stub geometry to permit DOM interaction; this does not certify native layout.
 w.HTMLElement.prototype.getBoundingClientRect=function(){return {x:20,y:40,left:20,top:40,right:180,bottom:80,width:160,height:40};};w.HTMLElement.prototype.getClientRects=function(){return [this.getBoundingClientRect()];};
 const trigger=doc.querySelector('[data-vocabulary-word]');trigger.click();assert.ok(doc.querySelector('.vocabulary-reminder'));assert.equal(doc.querySelector('.vocabulary-reminder [data-action=enroll]'),null);
 doc.querySelector('.vocabulary-reminder').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));assert.equal(store.learner('learner-demo').attempts.length,1);
 doc.querySelector('[data-vocabulary-close]').click();assert.equal(doc.activeElement,trigger);assert.equal(JSON.stringify(store.learner('learner-demo')),before);assert.equal(calls.filter(p=>['/api/attempt','/api/progress','/api/preferences'].includes(p)).length,writes);
 const restored=await app(t,{page:'lesson/lesson-1/check',store,realHTTP:true});assert.ok(restored.doc.querySelector('[data-vocabulary-word]'));assert.equal(store.learner('learner-demo').attempts.length,1);
 trigger.click();click(doc,correct?'next-question':'retry-question');await settled(()=>!doc.querySelector('.vocabulary-reminder')&&!doc.querySelector('[data-vocabulary-word]'));
 assert.equal(store.learner('learner-demo').attempts.length,1);
 const profile=restored.doc.querySelector('#demo-user');profile.value='learner-core';profile.dispatchEvent(new restored.w.Event('change',{bubbles:true}));await settled(()=>restored.doc.querySelector('.page-home'));assert.equal(restored.doc.querySelector('.vocabulary-reminder'),null);
});

test('LEXICAL actual app uses context eligibility, category disclosure and server-filtered My Hebrew without source-only search leakage',async t=>{
 const {doc,w}=await app(t,{page:'lesson/lesson-2/vocabulary',realHTTP:true,prepare(store){const c=store.snapshot();c.lexical=lexicalFixture();store.set('active',store.addRevision(c,'Synthetic lexical UI fixture only'));}});
 assert.equal(doc.querySelector('[data-preposition-forms]').dataset.count,'7');assert.equal(doc.querySelectorAll('[data-word-key]').length,3);
 const forms=doc.querySelector('[data-lexical-toggle=forms]');forms.click();assert.equal(forms.getAttribute('aria-expanded'),'true');assert.equal(doc.querySelector('.lexical-forms-row').hidden,false);
 doc.querySelector('[data-action=page][data-value=library]').click();await settled(()=>doc.querySelector('#library-search'));const search=doc.querySelector('#library-search');search.value='SYNTHETIC verb.future.I';search.dispatchEvent(new w.Event('input',{bubbles:true}));
 await new Promise(r=>setTimeout(r,350));await settled(()=>doc.querySelector('.lexical-library-status')?.textContent.startsWith('0 lexical'));
 assert.equal(doc.querySelector('[data-word-key="synthetic-verb"]'),null);
 click(doc,'library-clear');await settled(()=>doc.querySelector('.lexical-library-status')?.textContent.startsWith('3 lexical'));
 const lesson=doc.querySelector('#library-lesson');lesson.value='lesson-3';lesson.dispatchEvent(new w.Event('change'));await settled(()=>doc.querySelector('.lexical-library-status')?.textContent.includes('context:')&&!doc.querySelector('.lexical-library-status').textContent.includes('Updating'));
});

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
 for(const width of [1400,960,700,480])await t.test(String(width)+'px source/DOM cascade',async t=>{const {w,doc}=await app(t,{width});loadViewportStyles(doc,width);const nav=doc.querySelector('#main-menu');assert.equal(nav.closest('.app-header')!==null,true);assert.equal(w.getComputedStyle(nav).display,'flex');for(const label of nav.querySelectorAll('.nav-label'))assert.equal(w.getComputedStyle(label).display,'block');assert.deepEqual([...nav.querySelectorAll('[data-action=page]')].map(x=>x.dataset.value),['home','course','review','library','settings']);assert.equal(nav.querySelector('[aria-current=page]').dataset.value,'course');assert.equal(doc.querySelectorAll('[data-action=navigation-toggle]').length,1);assert.equal(doc.querySelector('[data-action=navigation-toggle]').closest('.app-header')!==null,true);assert.ok(doc.querySelector('.app-header #demo-user'));assert.equal(doc.querySelector('.brand').getAttribute('aria-label'),'Hebleo home');const logo=doc.querySelector('.brand-logo-slot img');assert.equal(logo.getAttribute('src'),'/assets/hebleo-wide-navy.png');assert.equal(logo.getAttribute('alt'),'');assert.equal(logo.getAttribute('width'),'3693');assert.equal(logo.getAttribute('height'),'1198');assert.equal(doc.querySelector('[data-logo-status= pending]'),null);});
});
test('DESIGN13 single course rail reclaims width without remount, data writes or losing caret',async t=>{
 const {w,doc,calls,store}=await app(t,{page:'lesson/lesson-1/apply',width:1400});const shell=doc.querySelector('.nav-shell'),rail=doc.querySelector('#course-navigation'),answer=doc.querySelector('#answer'),toggle=doc.querySelector('[data-action=navigation-toggle]'),before=structuredClone(store.learner('learner-demo')),count=calls.length;assert.equal(rail.parentElement,doc.querySelector('#main-content').parentElement);assert.equal(doc.querySelector('#main-content').contains(rail),false);answer.value='SYNTHETIC unchanged';answer.focus();answer.setSelectionRange(1,4);
 for(const closed of [true,false,true]){toggle.click();await settled(()=>!toggle.disabled&&rail.hidden===closed);assert.equal(shell.style.getPropertyValue('--course-track'),closed?'0px':'248px');assert.equal(rail.hidden,closed);assert.equal(toggle.getAttribute('aria-expanded'),String(!closed));assert.equal(toggle.title,(closed?'Expand':'Collapse')+' course outline');assert.equal(toggle.getAttribute('aria-label'),toggle.title);assert.equal(toggle.querySelector('[data-course-arrow]').getAttribute('d'),closed?'M9 6l4 4-4 4':'M13 6l-4 4 4 4');assert.equal(doc.querySelector('#answer'),answer);assert.equal(answer.value,'SYNTHETIC unchanged');assert.equal(answer.selectionStart,1);assert.equal(answer.selectionEnd,4);}
 assert.equal(calls.length,count);assert.deepEqual(store.learner('learner-demo'),before);const saved=JSON.parse(w.localStorage.getItem('hebleo-navigation-learner-demo'));assert.equal(saved.course,true);const reloaded=await app(t,{width:1400,navigationPrefs:saved});assert.equal(reloaded.doc.querySelector('.nav-shell').style.getPropertyValue('--course-track'),'0px');
});
test('DESIGN13 outline dismisses narrow drawer for current and different same-lesson portions',async t=>{
 const {w,doc}=await app(t,{width:700});for(const portion of ['learn','vocabulary']){const toggle=doc.querySelector('[data-action=navigation-toggle]');toggle.click();await settled(()=>!toggle.disabled&&doc.querySelector('.nav-shell').dataset.courseOverlay==='true');assert.equal(doc.querySelector('#main-content').hasAttribute('inert'),true);doc.querySelector('[data-action=outline][data-value="lesson-2|'+portion+'"]').click();await settled(()=>doc.querySelector('[data-action=outline][aria-current=step]')?.dataset.value==='lesson-2|'+portion&&doc.querySelector('.nav-shell').dataset.courseOverlay==='false');assert.equal(doc.querySelector('#main-content').hasAttribute('inert'),false);assert.equal(doc.querySelector('#course-navigation').hasAttribute('inert'),true);await settled(()=>doc.querySelector('#course-navigation').hidden);assert.equal(doc.querySelector('#course-navigation').hidden,true);}assert.ok(w.location.hash.includes('vocabulary'));
});
test('DESIGN13 drawer Tab cycle retains header access and excludes hidden chapter descendants; Escape returns toggle focus',async t=>{
 const {w,doc,calls}=await app(t,{width:700});const rail=doc.querySelector('#course-navigation'),chapters=[...rail.querySelectorAll('.course-outline-content>details')],toggle=doc.querySelector('[data-action=navigation-toggle]');chapters[0].open=false;chapters[1].open=true;chapters[2].open=false;toggle.click();await settled(()=>!toggle.disabled);const count=calls.length,last=chapters[2].querySelector(':scope>summary');toggle.focus();toggle.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true,cancelable:true}));assert.equal(doc.activeElement,last);last.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));assert.equal(doc.activeElement,toggle);chapters[2].open=true;const lesson=chapters[2].querySelector('details');lesson.open=false;toggle.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true,cancelable:true}));assert.equal(doc.activeElement,lesson.querySelector('summary'));doc.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));assert.equal(rail.hasAttribute('inert'),true);await settled(()=>rail.hidden);assert.equal(rail.hidden,true);assert.equal(doc.querySelector('#main-content').hasAttribute('inert'),false);assert.equal(doc.activeElement,toggle);assert.equal(calls.length,count);
});
test('DESIGN13 Studio task keys preserve one title editor and unsaved text across all six tasks',async t=>{
 const {w,doc,store}=await app(t,{page:'studio',author:true});const title=doc.querySelector('[data-lesson-metadata] [name=title]');title.value='SYNTHETIC retained title';title.dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(doc.querySelectorAll('#studio-lesson-metadata [name=title]').length,1);const tabs=[...doc.querySelectorAll('.studio-task-menu [role=tab]')];assert.equal(tabs.length,6);tabs[0].focus();tabs[0].dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));await settled(()=>tabs[1].getAttribute('aria-selected')==='true');assert.equal(doc.activeElement,tabs[1]);assert.equal(doc.querySelector('[data-lesson-metadata] [name=title]'),title);assert.equal(title.value,'SYNTHETIC retained title');tabs[1].dispatchEvent(new w.KeyboardEvent('keydown',{key:'End',bubbles:true,cancelable:true}));await settled(()=>tabs[5].getAttribute('aria-selected')==='true');tabs[5].dispatchEvent(new w.KeyboardEvent('keydown',{key:'Home',bubbles:true,cancelable:true}));await settled(()=>tabs[0].getAttribute('aria-selected')==='true');assert.equal(title.value,'SYNTHETIC retained title');assert.equal(store.currentDraft(),null);
});
test('DESIGN13 library search clears immediately and Cards/Table use identical multi-lesson membership',async t=>{
 const {w,doc}=await app(t,{page:'library',prepare(store){const c=store.snapshot();c.lessons[1].wordIds.push('w-ani');const d=store.stage({baseRevisionId:1,expectedDraftToken:null,content:c});store.publish(1,d.draftToken);}});const input=doc.querySelector('#library-search');input.value='I';input.dispatchEvent(new w.Event('input',{bubbles:true}));const clear=doc.querySelector('[data-action=library-clear]');assert.ok(clear);clear.click();await settled(()=>!doc.querySelector('[data-action=library-clear]'));assert.equal(doc.querySelector('#library-search').value,'');assert.equal(doc.activeElement,doc.querySelector('#library-search'));doc.querySelector('#library-lesson').value='lesson-2';doc.querySelector('#library-lesson').dispatchEvent(new w.Event('change'));const cards=[...doc.querySelectorAll('.word-card [data-action=note-open]')].map(x=>x.dataset.value);assert.ok(cards.includes('w-ani'));doc.querySelector('[data-action=vocab-view][data-value=table]').click();await settled(()=>doc.querySelector('.vocabulary-table'));const rows=[...doc.querySelectorAll('.vocabulary-table [data-action=note-open]')].map(x=>x.dataset.value);assert.deepEqual(rows,cards);assert.equal(doc.querySelectorAll('.vocabulary-table [data-action=lookup]').length,cards.length);
});

test('UX2333 compact composers collapse replies and preserve dirty reply and lesson title through task switches',async t=>{
 const {store,w,doc}=await app(t,{page:'studio',author:true,prepare(s){s.askQuestion('learner-demo',{requestId:randomUUID(),revisionId:1,lessonId:'lesson-1',discussionVersion:1,question:'SYNTHETIC reply topic'});}});const style=doc.createElement('style');style.textContent=readFileSync(new URL('../public/refinement.css',import.meta.url),'utf8');doc.head.append(style);
 const title=doc.querySelector('[data-lesson-metadata] [name=title]');title.value='SYNTHETIC dirty title';title.dispatchEvent(new w.Event('input',{bubbles:true}));doc.querySelector('[data-action=studio-task][data-value=comments]').click();const details=doc.querySelector('.reply-composer');assert.equal(details.open,false);details.querySelector('summary').click();await settled(()=>details.open&&doc.activeElement===details.querySelector('textarea'));const text=details.querySelector('textarea');assert.equal(w.getComputedStyle(text).width,'100%');assert.equal(w.getComputedStyle(text).minHeight,'88px');assert.equal(w.getComputedStyle(text.closest('label')).display,'grid');text.value='SYNTHETIC dirty reply';details.querySelector('[data-action=reply-cancel]').click();assert.equal(details.open,false);doc.querySelector('[data-action=studio-task][data-value=sources]').click();doc.querySelector('[data-action=studio-task][data-value=comments]').click();assert.equal(doc.querySelector('.reply-composer').open,false);doc.querySelector('.reply-composer summary').click();await settled(()=>doc.querySelector('.reply-composer').open);assert.equal(doc.querySelector('[data-question-answer] textarea').value,'SYNTHETIC dirty reply');assert.equal(title.value,'SYNTHETIC dirty title');assert.equal(title.isConnected,true);assert.equal(store.currentDraft(),null);
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
 const {store,w,doc}=await app(t,{page:'studio',author:true,realHTTP:true,prepare(s){s.askQuestion('learner-demo',{requestId:randomUUID(),revisionId:1,lessonId:'lesson-1',discussionVersion:1,question:'SYNTHETIC pending reply'});}});const title=doc.querySelector('[data-lesson-metadata] [name=title]');title.value='SYNTHETIC title retained';title.dispatchEvent(new w.Event('input',{bubbles:true}));doc.querySelector('[data-action=studio-task][data-value=comments]').click();const details=doc.querySelector('.reply-composer');details.querySelector('summary').click();await settled(()=>details.open);const form=details.querySelector('form'),text=form.querySelector('textarea');text.value='SYNTHETIC exact reply  two spaces';const old=w.fetch;let release;w.fetch=async(url,options)=>url==='/api/questions/answer'&&options?.method==='POST'?new Promise(r=>{release=()=>r({ok:false,status:503,json:async()=>({error:'SYNTHETIC retry later'})});}):old(url,options);
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
 const title=doc.querySelector('[data-lesson-metadata] [name=title]');title.value='SYNTHETIC unsaved title';title.dispatchEvent(new w.Event('input',{bubbles:true}));const beforeToken=store.currentDraft()?.draftToken??null;
 doc.querySelector('[data-action=studio-task][data-value=sources]').click();assert.equal(doc.querySelector('[data-studio-pane=sources]').hidden,false);assert.equal(doc.querySelector('[data-lesson-metadata] [name=title]'),title);assert.equal(title.value,'SYNTHETIC unsaved title');
 doc.querySelector('[data-action=studio-task][data-value=comments]').click();assert.equal(doc.querySelectorAll('[data-comment-feed] .question-item').length,20);assert.equal(doc.querySelector('[data-studio-pane=media]').hidden,true);
 const reply=doc.querySelector('[data-question-answer] textarea');reply.value='SYNTHETIC unsaved reply';doc.querySelector('[data-action=studio-task][data-value=media]').click();doc.querySelector('[data-action=studio-task][data-value=comments]').click();assert.equal(doc.querySelector('[data-question-answer] textarea').value,'SYNTHETIC unsaved reply');
 const hide=doc.querySelectorAll('[data-action=comment-moderate][data-value$="|remove"]')[1];assert.ok(hide.textContent.includes('Reject'));hide.click();await settled(()=>store.questionAudit('author-demo').some(q=>q.visibility==='removed'));assert.equal(title.isConnected,true);assert.equal(title.value,'SYNTHETIC unsaved title');assert.equal(store.currentDraft()?.draftToken??null,beforeToken);
 await settled(()=>doc.querySelector('.question-list h3').textContent.startsWith('22 comments'));doc.querySelector('[data-action=comment-page][data-value="1"]').click();assert.equal(doc.querySelectorAll('[data-comment-feed] .question-item').length,2);doc.querySelector('[data-action=comment-page][data-value="0"]').click();assert.equal(doc.querySelector('[data-question-answer] textarea').value,'SYNTHETIC unsaved reply');
 doc.querySelector('[data-action=studio-task][data-value=lesson]').click();assert.equal(doc.querySelector('[data-lesson-metadata] [name=title]').value,'SYNTHETIC unsaved title');
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
    const support=doc.querySelector('#practice .exercise-question-header');assert.equal(support.querySelector('[data-action=concept]').dataset.action,'concept');assert.ok(doc.querySelector('#practice [data-exercise-dock] [data-action=check]'));assert.equal(doc.querySelector('#answer').tagName,'TEXTAREA');
    if(mode!=='closed')click(doc,'keyboard-open');
    const answerBefore=doc.querySelector('#answer');answerBefore.setSelectionRange(1,2);const el=doc.querySelector('#practice [data-action="'+action+'"]'),seen=calls.length;
    el.dispatchEvent(new w.MouseEvent('pointerdown',{bubbles:true,cancelable:true}));
    assert.equal(el.isConnected,true);assert.equal(doc.querySelector('#practice [data-action="'+action+'"]'),el);
    if(mode!=='closed')assert.ok(doc.body.classList.contains('hebleo-keyboard-is-open'),'layout must survive pointerdown until click target is resolved');
    el.dispatchEvent(new w.MouseEvent('pointerup',{bubbles:true,cancelable:true}));el.click();
    if(action==='concept'){
      await settled(()=>doc.querySelector('#inline-concept'));assert.equal(doc.querySelector('#answer'),answerBefore);assert.equal(store.learner('learner-demo').attempts.length,0);assert.equal(calls.slice(seen).filter(p=>p==='/api/attempt').length,0);
      assert.equal(doc.querySelector('#answer').value,text);click(doc,'inline-concept-close');assert.equal(doc.querySelector('#answer').value,text);assert.equal(doc.activeElement,doc.querySelector('[data-action=concept]'));assert.equal(doc.querySelector('#answer').selectionStart,1);assert.equal(doc.querySelector('#answer').selectionEnd,2);
      const answer=doc.querySelector('#answer');answer.focus();answer.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
    }
    await settled(()=>doc.querySelector('#practice .feedback'));await settled(()=>doc.querySelector('[data-action=next-question]'));
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
  assert.ok(inside('.exercise-question-header [data-action=concept]'));assert.ok(inside('[data-exercise-dock] [data-action=check]'));answer.setSelectionRange(1,2);
  const concept=inside('[data-action="concept"]');concept.dispatchEvent(new w.MouseEvent('pointerdown',{bubbles:true}));concept.dispatchEvent(new w.MouseEvent('pointerup',{bubbles:true}));concept.click();
  assert.ok(inside('.preview-concept'));assert.equal(inside('#answer').value,'אני');assert.equal(doc.activeElement,inside('#answer'));assert.equal(inside('#answer').selectionStart,1);assert.equal(inside('#answer').selectionEnd,2);assert.deepEqual(tables(store),before);
  inside('[data-action="concept-close"]').click();const check=inside('[data-action="check"]');check.dispatchEvent(new w.MouseEvent('pointerdown',{bubbles:true}));check.dispatchEvent(new w.MouseEvent('pointerup',{bubbles:true}));check.click();await settled(()=>inside('.feedback'));
  assert.equal(inside('.feedback').getAttribute('aria-label'),'Correct');assert.equal(inside('#answer'),answer,'Preview retains the answer node through Concept and grading');assert.equal(inside('[data-action=check]'),null);assert.deepEqual(tables(store),before);
});

test('FB8 actual lesson comments post anonymously, render to another learner without identity and disappear after Author Remove',async t=>{
  const {store,w,doc}=await app(t,{page:'lesson/lesson-1/learn',realHTTP:true});
  const form=doc.querySelector('[data-lesson-comment]');form.elements.question.value='SYNTHETIC anonymous discussion';form.elements.anonymous.checked=true;form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await settled(()=>store.questions('author-demo').length===1&&doc.querySelector('#lesson-comments .question-item'));
  const q=store.questions('author-demo')[0];assert.equal(q.anonymous,true);assert.equal(q.revisionId,1);
  const sam=await app(t,{page:'lesson/lesson-1/learn',store,realHTTP:true});sam.doc.querySelector('#demo-user').value='learner-core';sam.doc.querySelector('#demo-user').dispatchEvent(new sam.w.Event('change',{bubbles:true}));await settled(()=>sam.doc.querySelector('h1').textContent.includes('Sam'));
  sam.doc.querySelector('[data-action="lesson"][data-value="lesson-1"]').click();await settled(()=>sam.doc.querySelector('.question-item'));
  assert.ok(sam.doc.querySelector('.question-item').textContent.includes('Anonymous'));assert.equal(sam.doc.querySelector('.question-item').outerHTML.includes('Alex'),false);assert.equal(sam.doc.querySelector('.question-item').outerHTML.includes('learner-demo'),false);
  const authorApp=await app(t,{page:'studio',author:true,store,realHTTP:true});const remove=authorApp.doc.querySelector('[data-action="comment-moderate"][data-value$="|remove"]');assert.ok(remove);remove.click();await settled(()=>store.questions('learner-core').length===0);
  assert.equal(store.questionAudit('author-demo')[0].visibility,'removed');assert.equal(store.questionAudit('author-demo')[0].moderation[0].action,'remove');
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
  click(doc,'check');await settled(()=>doc.querySelector('#practice .feedback'));await settled(()=>doc.querySelector('[data-action=next-question]'));
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
  const input=doc.querySelector('#answer');input.value='היא';input.dispatchEvent(new w.Event('input',{bubbles:true}));click(doc,'check');await settled(()=>doc.querySelector('.feedback.wrong'));await settled(()=>doc.querySelector('[data-action=next-question]'));
  assert.equal(bar().value,1);click(doc,'retry-question');await settled(()=>doc.querySelector('#answer')&&!doc.querySelector('.feedback'));
  assert.equal(store.learner('learner-demo').resumes['lesson-1'].question,0);assert.deepEqual(store.learner('learner-demo').resumes['lesson-1'].practiceIds,[]);
  const answer=doc.querySelector('#answer');assert.equal(answer.disabled,false);answer.value='אני';answer.dispatchEvent(new w.Event('input',{bubbles:true}));click(doc,'check');await settled(()=>doc.querySelector('.feedback:not(.wrong)'));await settled(()=>doc.querySelector('[data-action=next-question]'));
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
  const input=doc.querySelector('#answer');input.value='אני';input.dispatchEvent(new w.Event('input',{bubbles:true}));click(doc,'check');await settled(()=>doc.querySelector('.feedback:not(.wrong)'));await settled(()=>doc.querySelector('[data-action=next-question]'));
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
  assert.equal(doc.querySelector('.assembled-sentence').textContent,'אני בבית');assert.equal(doc.querySelector('.prefix-token'),null);assert.equal(doc.querySelector('[data-action="token"] small'),null);const groups=[...doc.querySelectorAll('.sentence-tile-group')];assert.deepEqual(groups.map(g=>g.textContent),['אני','בבית']);assert.equal(groups[1].querySelectorAll('button').length,2);click(doc,'check');await settled(()=>doc.querySelector('.feedback'));await settled(()=>doc.querySelector('[data-action=next-question]'));assert.equal(store.learner('learner-demo').attempts[0].correct,true);
  doc.querySelector('[data-action="step"][data-value="vocabulary"]').click();await settled(()=>doc.querySelector('.word-grid'));assert.equal(doc.querySelectorAll('.word-card').length,6);assert.ok(doc.querySelector('.word-details dd'));
});
test('Studio saves author card policy privately; selected lesson publication excludes it and keyboard metadata stays intact',async t=>{
 const {store,w,doc}=await app(t,{page:'studio',author:true});await settled(()=>doc.querySelector('[data-review-policy-form]'));
 const initial=structuredClone(store.snapshot().lessons[0].keyboard),form=doc.querySelector('[data-review-policy-form]');edit(w,form.querySelector('select'),'none');submit(w,form);await settled(()=>store.currentDraft()?.content.reviewPolicy.defaultNikkud==='none'&&doc.querySelector('[data-action="publish"]'));
 const active=store.get('active'),policy=structuredClone(store.snapshot().reviewPolicy);click(doc,'publish');await confirmSelectedPublication(doc);assert.deepEqual(store.snapshot().reviewPolicy,policy);assert.equal(store.get('active'),active+1,'only the saved selected lesson composition is published');assert.equal(store.currentDraft().content.reviewPolicy.defaultNikkud,'none');
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
test('Lesson discussion exposes an actual question form and saves it to the author inbox',async t=>{
  const {store,w,doc}=await app(t);
  const form=doc.querySelector('[data-lesson-comment]');form.elements.question.value='Why is this prefix used?';form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await settled(()=>store.questions('author-demo').length===1);assert.equal(store.questions('author-demo')[0].lessonId,'lesson-2');
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
const edit=(w,el,value)=>{if(el.hasAttribute('contenteditable'))el.textContent=value;else el.value=value;el.dispatchEvent(new w.Event('input',{bubbles:true}));};
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
    if(progress)payloads.push(parseRequestBody(options.body));
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
  assert.equal(doc.querySelector('.studio-preview'),null,'Save invalidates old impact counts');doc.querySelector('[data-action="studio-task"][data-value="versions"]').click();await settled(()=>doc.querySelector('.studio-preview'));assert.match(doc.querySelector('.studio-preview').textContent,/ex-1-recognize/);doc.querySelector('[data-action="studio-task"][data-value="lesson"]').click();
  edit(w,exerciseForm().elements.prompt,'Unsaved edit');click(doc,'studio-reload');await settled(()=>doc.querySelector('#studio-departure'));doc.querySelector('[data-departure-discard]').click();
  await settled(()=>exerciseForm()?.elements.prompt.value===draftPrompt);
  const saved=store.currentDraft();stageDraft(store,c=>{c.lessons[0].title='Synthetic title from another tab';});const otherToken=store.currentDraft().draftToken;
  assert.notEqual(otherToken,saved.draftToken);
  edit(w,exerciseForm().elements.prompt,'Stale tab edit');submit(w,exerciseForm());
  await settled(()=>/Draft changed elsewhere/.test(exerciseForm().querySelector('[data-editor-status]').textContent));
  assert.equal(exerciseForm().elements.prompt.value,'Stale tab edit','rejected values stay in the form');
  assert.equal(store.currentDraft().draftToken,otherToken,'the newer draft is not overwritten');
  click(doc,'studio-reload');await settled(()=>doc.querySelector('#studio-departure'));doc.querySelector('[data-departure-discard]').click();await settled(()=>lessonForm()?.elements.title.value==='Synthetic title from another tab');
  edit(w,lessonForm().elements.title,'Synthetic lesson title');submit(w,lessonForm());
  await settled(()=>store.currentDraft()?.content.lessons[0].title==='Synthetic lesson title'&&lessonForm()?.elements.title.value==='Synthetic lesson title');
  assert.equal(store.currentDraft().content.exercises.find(e=>e.id==='ex-1-recognize').prompt,draftPrompt);
  assert.ok(doc.querySelector('[data-owned-exercise="ex-1-type"] form'),'typing editor is already below its component');
  assert.deepEqual(store.snapshot(),published);assert.deepEqual(learnerRecords(store),learners);
  click(doc,'publish');await confirmSelectedPublication(doc);await settled(()=>store.get('active')===revision+1);assert.ok(store.currentDraft());
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
test('Rehearsal keeps keyboard focus inside the modal across re-renders, so a digit then Enter grade, Retry resets, and grading preserves the viewport',async t=>{
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
  assert.equal(scrolled.length,0,'grading does not auto-scroll the result');
  assert.ok(inside('.exercise-support').contains(inside('[data-action="retry-question"]')),'Retry remains a secondary action');
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
  assert.ok([...dialog().querySelectorAll('[data-preview-step]')].every(b=>b.disabled));assert.ok(inside('[data-preview-frozen]'));assert.equal(inside('[data-action="check"]'),null);assert.ok(inside('[data-exercise-dock] [data-preview-exit]'));
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
  // Hold the actual POST receipt after server commit, not a removed GET reload.
  w.fetch=async(path,options={})=>{const pathname=new URL(path,w.location.href).pathname;if(options.body&&pathname.startsWith('/api/studio/'))bodies.push({path:pathname,body:parseRequestBody(options.body)});const response=await original(path,options);if(gate&&pathname==='/api/studio/draft'){const held=gate;held.waiting=true;await held.promise;}return response;};
  return {bodies,hold(){let release;const promise=new Promise(r=>release=r);gate={promise,release,waiting:false};},release(){const held=gate;gate=null;held?.release();},get waiting(){return Boolean(gate?.waiting);}};
}
const publishBody=reload=>reload.bodies.filter(b=>b.path==='/api/studio/publish-lesson').at(-1)?.body;
async function confirmSelectedPublication(doc){
 await settled(()=>doc.querySelector('[data-publication-review] h3')&&!doc.querySelector('[data-publication-refresh]').disabled);
 for(let i=0;i<20;i++){
  const input=doc.querySelector('[data-publication-dependency]:not(:checked)');if(!input)break;input.click();
  await settled(()=>!doc.querySelector('[data-publication-refresh]').disabled);
 }
 const confirm=doc.querySelector('[data-publication-confirm]');assert.equal(confirm.disabled,false,doc.querySelector('.lesson-publication-dialog').textContent);confirm.click();
 await settled(()=>doc.querySelector('[data-publication-confirm]').hidden);doc.querySelector('[data-publication-cancel]').click();
}

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
 click(doc,'publish');await new Promise(r=>setTimeout(r,20));assert.equal(store.get('active'),revision);assert.equal(publishBody(reload),undefined);reload.release();await confirmSelectedPublication(doc);await settled(()=>store.get('active')===revision+1);assert.equal(publishBody(reload).expectedDraftToken,latest);assert.ok(store.currentDraft(),'complete rebased draft is retained');assert.equal(store.snapshot().lessons[0].estimatedMinutes,8);assert.equal(store.snapshot().exercises.find(e=>e.id==='ex-1-type').prompt,'Synthetic typing prompt');assert.deepEqual(learnerRecords(store),learners);
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
  await settled(()=>/draft changed elsewhere/i.test(doc.querySelector('[data-publication-status]')?.textContent||''));
  assert.equal(publishBody(reload),undefined,'a stale review never sends a publication');
  assert.equal(store.get('active'),revision);assert.deepEqual(store.snapshot(),published);assert.equal(store.currentDraft().draftToken,other);
  assert.deepEqual(learnerRecords(store),learners);
});

test('QA-EE9-G4-02: matching autosave keeps an authored pair word from outside the lesson list, and the match resumes after reload',async t=>{
  const pairs=['w-ani','w-mi','w-sham'];
  const {store,w,doc}=await app(t,{page:'lesson/lesson-1/apply',prepare(s){
    const c=structuredClone(s.snapshot());c.exercises.find(e=>e.id==='ex-1-match').wordIds=pairs;s.publish(1,s.stage({baseRevisionId:1,expectedDraftToken:null,content:c}).draftToken);
  }});
  assert.ok(!store.snapshot().lessons.find(l=>l.id==='lesson-1').wordIds.includes('w-sham'));
  const input=doc.querySelector('#answer');input.value='אני';input.dispatchEvent(new w.Event('input',{bubbles:true}));click(doc,'check');await settled(()=>doc.querySelector('.feedback:not(.wrong)'));await settled(()=>doc.querySelector('[data-action=next-question]'));
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
 assert.equal(doc.querySelector('.learner-preview .feedback').getAttribute('aria-label'),'Correct');assert.equal(doc.querySelector('.learner-preview .feedback').classList.contains('wrong'),false);
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
 doc.querySelector('#practice [data-action="check"]').click();await settled(()=>doc.querySelector('#practice .feedback'));await settled(()=>doc.querySelector('[data-action=next-question]'));
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


// UXI13 owner regressions use only fictional in-memory/ephemeral HTTP data and JSDOM.
// They assert actual app behavior; they are not rendered/native/media playback acceptance.
const pageButton=(doc,value)=>doc.querySelector('.app-header [data-action=page][data-value="'+value+'"]');
const changeProfile=async(w,doc,id)=>{const el=doc.querySelector('#demo-user');el.value=id;el.dispatchEvent(new w.Event('change'));await settled(()=>doc.querySelector('#demo-user').value===id&&doc.querySelector('h1').textContent.includes('Welcome back'));};
const openSameLesson=async(doc)=>{doc.querySelector('[data-action=lesson][data-value=lesson-1]').click();await settled(()=>doc.querySelector('[data-lesson-comment="lesson-1"]'));return doc.querySelector('[data-lesson-comment="lesson-1"]');};
const departure=async(doc,choice)=>{await settled(()=>doc.querySelector('#studio-departure'));doc.querySelector('[data-departure-'+choice+']').click();};
const tick=()=>new Promise(r=>setTimeout(r,25));

test('UXI13-01 unrelated report render preserves title Markdown instance exercise word and malformed sibling values',async t=>{
 const editors=[];class FakeMDE{constructor(options){this.options=options;this.text=options.initialValue;this.handlers={};this.disposed=false;this.codemirror={getInputField:()=>options.element,getOption:()=>false,setOption(){},on:(event,fn)=>this.handlers[event]=fn,off(){},focus:()=>options.element.focus()};editors.push(this);}value(next){if(next!==undefined){this.text=next;this.handlers.change?.();}return this.text;}toTextArea(){this.disposed=true;}cleanup(){}}
 const {w,doc,store}=await app(t,{page:'studio',author:true,realHTTP:true,markdownDependencies:w=>({EasyMDE:FakeMDE,marked,purifier:createPurifier(w)}),prepare(s){const result=s.attempt('learner-demo',{requestId:randomUUID(),revisionId:1,exerciseId:'ex-1-type',answer:'wrong'});s.report('learner-demo',{requestId:randomUUID(),attemptId:result.requestId,reason:'unclear',note:'SYNTHETIC report'});}});
 await settled(()=>editors.length&&doc.querySelector('[data-markdown-status]').textContent.includes('ready'));
 const title=doc.querySelector('[data-lesson-metadata] [name=title]'),exercise=doc.querySelector('[data-owned-exercise="ex-1-recognize"] [name=prompt]'),word=doc.querySelector('[data-canonical-word] [name=notes]'),rich=doc.querySelector('[name=richFields]'),video=doc.querySelector('[data-component-id] [name=video]');
 edit(w,title,'SYNTHETIC unsaved title');edit(w,exercise,'');edit(w,word,'SYNTHETIC אֲנִי note');edit(w,rich,'{"incomplete":');edit(w,video,'{');editors[0].value('SYNTHETIC **אֲנִי** Markdown');const firstEditor=editors[0];
 doc.querySelector('[data-action=studio-task][data-value=comments]').click();doc.querySelector('[data-action=report-resolve]').click();await settled(()=>store.reports('author-demo')[0].status==='reviewed'&&doc.querySelector('[data-action=report-resolve]').textContent==='Reopen');
 for(const [field,value]of [[title,'SYNTHETIC unsaved title'],[exercise,''],[word,'SYNTHETIC אֲנִי note'],[rich,'{"incomplete":'],[video,'{']]){assert.equal(field.isConnected,true);assert.equal(field.value,value);}
 assert.equal(firstEditor.disposed,false);assert.equal(firstEditor.value(),'SYNTHETIC **אֲנִי** Markdown');assert.equal(editors[0],firstEditor);assert.equal(store.currentDraft(),null);
 doc.querySelector('[data-action=studio-task][data-value=lesson]').click();assert.equal(doc.querySelector('[data-lesson-metadata] [name=title]'),title);pageButton(doc,'home').click();await departure(doc,'save');await settled(()=>doc.querySelector('[data-departure-status]').textContent.includes('not saved'));assert.equal(doc.querySelector('[data-lesson-metadata] [name=title]'),title);assert.equal(store.currentDraft(),null);await departure(doc,'stay');await settled(()=>!doc.querySelector('#studio-departure'));assert.equal(w.location.hash,'#studio');
});

test('UXI13-01 dirty navigation waits for successful explicit Save draft and never publishes',async t=>{
 const {w,doc,store}=await app(t,{page:'studio',author:true,realHTTP:true});const active=store.get('active');edit(w,doc.querySelector('[data-lesson-metadata] [name=title]'),'SYNTHETIC save before leave');edit(w,doc.querySelector('[data-owned-exercise="ex-1-type"] [name=prompt]'),'SYNTHETIC sibling prompt');
 const fetch=w.fetch;let release;w.fetch=(url,options)=>url==='/api/studio/draft'&&options?.method==='POST'?new Promise(resolve=>{release=async()=>resolve(await fetch(url,options));}):fetch(url,options);
 pageButton(doc,'home').click();await departure(doc,'save');await settled(()=>release);assert.equal(w.location.hash,'#studio');assert.equal(store.currentDraft(),null);assert.equal(doc.querySelector('[data-departure-stay]').disabled,true);release();await settled(()=>doc.querySelector('h1').textContent.includes('Welcome back'));
 assert.equal(w.location.hash,'#home');assert.equal(store.get('active'),active);assert.equal(store.currentDraft().content.lessons[0].title,'SYNTHETIC save before leave');assert.equal(store.currentDraft().content.exercises.find(e=>e.id==='ex-1-type').prompt,'SYNTHETIC sibling prompt');
 pageButton(doc,'studio').click();await settled(()=>doc.querySelector('[data-lesson-metadata] [name=title]'));pageButton(doc,'home').click();await settled(()=>doc.querySelector('h1').textContent.includes('Welcome back'));assert.equal(doc.querySelector('#studio-departure'),null,'clean workspace has no gate');
});

test('UXI13-01 failed save cancel profile and browser-history departure retain exact workspace until explicit Discard',async t=>{
 const {w,doc,store}=await app(t,{page:'studio',author:true,realHTTP:true});const title=doc.querySelector('[data-lesson-metadata] [name=title]');edit(w,title,'SYNTHETIC retained after error');const fetch=w.fetch;w.fetch=(url,options)=>url==='/api/studio/draft'?Promise.resolve({ok:false,status:503,json:async()=>({error:'SYNTHETIC draft unavailable'})}):fetch(url,options);
 const profile=doc.querySelector('#demo-user');profile.value='learner-core';profile.dispatchEvent(new w.Event('change'));await departure(doc,'save');await settled(()=>doc.querySelector('[data-departure-status]').textContent.includes('SYNTHETIC draft unavailable'));assert.equal(profile.value,'author-demo');assert.equal(doc.querySelector('[data-lesson-metadata] [name=title]'),title);assert.equal(title.value,'SYNTHETIC retained after error');assert.equal(store.currentDraft(),null);
 doc.querySelector('#studio-departure').dispatchEvent(new w.Event('cancel',{cancelable:true}));await settled(()=>!doc.querySelector('#studio-departure'));
 w.history.pushState({},'','#home');w.dispatchEvent(new w.PopStateEvent('popstate'));await departure(doc,'stay');await settled(()=>w.location.hash==='#studio');assert.equal(doc.querySelector('[data-lesson-metadata] [name=title]'),title);
 w.history.pushState({},'','#home');w.dispatchEvent(new w.PopStateEvent('popstate'));await departure(doc,'discard');await settled(()=>doc.querySelector('h1').textContent.includes('Welcome back'));assert.equal(store.currentDraft(),null);
 pageButton(doc,'studio').click();await settled(()=>doc.querySelector('[data-lesson-metadata] [name=title]'));edit(w,doc.querySelector('[data-lesson-metadata] [name=title]'),'SYNTHETIC profile departure');const current=doc.querySelector('#demo-user');current.value='learner-core';current.dispatchEvent(new w.Event('change'));await departure(doc,'discard');await settled(()=>doc.querySelector('#demo-user').value==='learner-core');assert.ok(!doc.body.textContent.includes('SYNTHETIC profile departure'));
});

test('UXI13-01 dirty publication and rollback require a workspace decision while preserving deliberate publishing',async t=>{
 const {w,doc,store}=await app(t,{page:'studio',author:true,realHTTP:true,prepare(s){stageDraft(s,c=>c.lessons[0].title='SYNTHETIC staged first');}});const before=store.get('active');edit(w,doc.querySelector('[data-lesson-metadata] [name=title]'),'SYNTHETIC publish with explicit save');click(doc,'publish');await departure(doc,'stay');await settled(()=>!doc.querySelector('#studio-departure'));assert.equal(store.get('active'),before);await settled(()=>!doc.querySelector('[data-action=publish]').disabled);click(doc,'publish');await departure(doc,'save');await confirmSelectedPublication(doc);await settled(()=>store.get('active')===before+1&&store.currentDraft()&&doc.querySelector('[data-action=rollback]'));assert.equal(store.snapshot().lessons[0].title,'SYNTHETIC publish with explicit save');
 edit(w,doc.querySelector('[data-lesson-metadata] [name=title]'),'SYNTHETIC uncommitted rollback sibling');click(doc,'rollback');await departure(doc,'stay');await settled(()=>!doc.querySelector('#studio-departure'));assert.equal(doc.querySelector('[data-lesson-metadata] [name=title]').value,'SYNTHETIC uncommitted rollback sibling');assert.equal(store.get('active'),before+1);await settled(()=>!doc.querySelector('[data-action=rollback]').disabled);click(doc,'rollback');await departure(doc,'discard');await settled(()=>store.get('active')===before+2);assert.notEqual(store.snapshot().lessons[0].title,'SYNTHETIC uncommitted rollback sibling');
});

test('UXI13-02 two same-lesson profiles keep independent exact comment text and anonymity across switches',async t=>{
 const {w,doc,store}=await app(t,{page:'lesson/lesson-1/learn',realHTTP:true});let form=doc.querySelector('[data-lesson-comment]');edit(w,form.querySelector('textarea'),'SYNTHETIC A אֲנִי comment');form.querySelector('[name=anonymous]').checked=true;
 await changeProfile(w,doc,'learner-core');form=await openSameLesson(doc);assert.equal(form.querySelector('textarea').value,'');assert.equal(form.querySelector('[name=anonymous]').checked,false);edit(w,form.querySelector('textarea'),'SYNTHETIC B independent');
 await changeProfile(w,doc,'learner-demo');form=await openSameLesson(doc);assert.equal(form.querySelector('textarea').value,'SYNTHETIC A אֲנִי comment');assert.equal(form.querySelector('[name=anonymous]').checked,true);
 await changeProfile(w,doc,'learner-core');form=await openSameLesson(doc);assert.equal(form.querySelector('textarea').value,'SYNTHETIC B independent');assert.equal(form.querySelector('[name=anonymous]').checked,false);assert.equal(store.questions('author-demo').length,0);
});

test('UXI13-02 pending comment success and failure stay with initiating owner without clearing another profile draft',async t=>{
 for(const fails of [false,true])await t.test(fails?'failed initiating request':'successful initiating request',async t=>{
 const {w,doc,store}=await app(t,{page:'lesson/lesson-1/learn',realHTTP:true});const initial=doc.querySelector('[data-lesson-comment]');edit(w,initial.querySelector('textarea'),'SYNTHETIC owner A pending');initial.querySelector('[name=anonymous]').checked=true;const fetch=w.fetch;let release,submitted;
 w.fetch=(url,options)=>url==='/api/questions'&&options?.method==='POST'?new Promise(resolve=>{submitted=options;release=async()=>resolve(fails?{ok:false,status:503,json:async()=>({error:'SYNTHETIC A request failed'})}:await fetch(url,options));}):fetch(url,options);
 submit(w,initial);await settled(()=>release);await changeProfile(w,doc,'learner-core');let form=await openSameLesson(doc);edit(w,form.querySelector('textarea'),'SYNTHETIC B stays private');release();await tick();assert.equal(form.querySelector('textarea').value,'SYNTHETIC B stays private');assert.equal(form.querySelector('[data-comment-status]').textContent,'');assert.equal(submitted.headers['x-demo-user'],'learner-demo');
 await changeProfile(w,doc,'learner-demo');form=await openSameLesson(doc);await settled(()=>!form.querySelector('button').disabled);assert.equal(form.querySelector('textarea').value,fails?'SYNTHETIC owner A pending':'');assert.equal(form.querySelector('[name=anonymous]').checked,fails);if(!fails){const post=store.questions('author-demo')[0];assert.equal(post.userId,'learner-demo');assert.equal(post.question,'SYNTHETIC owner A pending');assert.equal(post.anonymous,true);}else assert.equal(store.questions('author-demo').length,0);
 });
});

for(const immediateAnswers of [false,true])test('UXI13-03 background shortcuts and direct controls are blocked by drawer or unrelated modal; resume after close '+immediateAnswers,async t=>{
 const {w,doc,store}=await app(t,{page:'lesson/lesson-1/check',width:700,realHTTP:true,prepare(s){s.updateLearner('learner-demo',{immediateAnswers});}});const before=structuredClone(store.learner('learner-demo'));const fire=(el,key)=>el.dispatchEvent(new w.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));
 click(doc,'navigation-toggle');await settled(()=>doc.querySelector('.nav-shell').dataset.courseOverlay==='true');const header=doc.querySelector('.app-header .brand'),summary=doc.querySelector('#course-navigation summary');for(const target of [header,summary,doc.querySelector('#practice')])for(const key of ['1','Enter',' '])fire(target,key);doc.querySelector('[data-action=choice]').click();click(doc,'check');await tick();assert.deepEqual(store.learner('learner-demo'),before);assert.equal(doc.querySelector('.choice.selected'),null);
 fire(summary,'Escape');await settled(()=>doc.querySelector('.nav-shell').dataset.courseOverlay==='false');assert.equal(doc.activeElement,doc.querySelector('[data-action=navigation-toggle]'));
 const modal=doc.createElement('dialog');modal.innerHTML='<input><button>Unrelated modal</button>';doc.body.append(modal);modal.showModal();for(const key of ['1','Enter',' '])fire(modal,key);click(doc,'check');await tick();assert.deepEqual(store.learner('learner-demo'),before);modal.close();modal.remove();
 for(const key of ['1','Enter',' '])fire(header,key);await tick();assert.deepEqual(store.learner('learner-demo'),before);
 fire(doc.querySelector('#practice'),'1');await settled(()=>immediateAnswers?store.learner('learner-demo').attempts.length===before.attempts.length+1:doc.querySelector('.choice.selected'));if(!immediateAnswers){assert.equal(store.learner('learner-demo').attempts.length,before.attempts.length);fire(doc.querySelector('#practice'),'Enter');await settled(()=>store.learner('learner-demo').attempts.length===before.attempts.length+1);}
});

test('UXI13-03 hidden inert and closed-details accelerator destinations reject before reaching valid controls',async t=>{
 const {w,doc,store}=await app(t,{page:'lesson/lesson-1/check',realHTTP:true,prepare(s){s.updateLearner('learner-demo',{immediateAnswers:false});}});const choices=[...doc.querySelectorAll('[data-action=choice]')];const hidden=doc.createElement('div');hidden.hidden=true;choices[0].before(hidden);hidden.append(choices[0]);
 const wrong=doc.createElement('div');wrong.setAttribute('inert','');wrong.innerHTML='<button data-action="check">Background check</button>';const closed=doc.createElement('details');closed.innerHTML='<summary>Closed</summary><button data-action="check">Hidden check</button>';doc.querySelector('#practice').prepend(wrong,closed);let background=0;wrong.querySelector('button').onclick=closed.querySelector('button').onclick=()=>background++;
 doc.querySelector('#practice').dispatchEvent(new w.KeyboardEvent('keydown',{key:'1',bubbles:true,cancelable:true}));await settled(()=>doc.querySelector('.choice.selected'));assert.equal(background,0);assert.equal(store.learner('learner-demo').attempts.length,0);
});

test('UXI13-04 adjacent word actions and request errors preserve the exact unsaved note node and selection without saving',async t=>{
 const {w,doc,store}=await app(t,{page:'library',realHTTP:true});doc.querySelector('[data-action=note-open][data-value=w-ani]').click();const field=doc.querySelector('#personal-note'),value='SYNTHETIC אֲנִי English  two spaces';edit(w,field,value);field.setSelectionRange(10,17,'backward');const before=store.learner('learner-demo').notes;
 for(const action of ['bookmark','enroll']){click(doc,action);await settled(()=>!doc.querySelector('#context-panel [data-action='+action+']').disabled);assert.equal(doc.querySelector('#personal-note'),field);assert.equal(field.value,value);assert.equal(field.selectionStart,10);assert.equal(field.selectionEnd,17);assert.equal(field.selectionDirection,'backward');assert.deepEqual(store.learner('learner-demo').notes,before);}
 const fetch=w.fetch;w.fetch=(url,options)=>['/api/preferences','/api/enroll'].includes(url)&&options?.method==='POST'?Promise.resolve({ok:false,status:503,json:async()=>({error:'SYNTHETIC adjacent request failed'})}):fetch(url,options);
 for(const action of ['bookmark','enroll','save-panel-note']){click(doc,action);await settled(()=>!doc.querySelector('#context-panel [data-action='+action+']').disabled);assert.equal(doc.querySelector('#personal-note'),field);assert.equal(field.value,value);assert.equal(field.selectionStart,10);assert.equal(field.selectionEnd,17);assert.deepEqual(store.learner('learner-demo').notes,before);}
 click(doc,'panel-close');doc.querySelector('[data-action=note-open][data-value=w-ani]').click();assert.equal(doc.querySelector('#personal-note').value,value);assert.equal(doc.querySelector('#personal-note').selectionStart,10);
});

test('UXI13-04 notes survive replacement and profile switches; late Save changes only initiating owner and word',async t=>{
 const {w,doc,store}=await app(t,{page:'library',realHTTP:true});doc.querySelector('[data-action=note-open][data-value=w-ani]').click();edit(w,doc.querySelector('#personal-note'),'SYNTHETIC A note אֲנִי');doc.querySelector('[data-action=lookup][data-value=w-mi]').click();assert.equal(doc.querySelector('#personal-note').value,'');edit(w,doc.querySelector('#personal-note'),'SYNTHETIC different word');doc.querySelector('[data-action=lookup][data-value=w-ani]').click();assert.equal(doc.querySelector('#personal-note').value,'SYNTHETIC A note אֲנִי');
 const fetch=w.fetch;let release,submitted;w.fetch=(url,options)=>url==='/api/preferences'&&options?.body?.includes('SYNTHETIC A note')?new Promise(resolve=>{submitted=options;release=async()=>resolve(await fetch(url,options));}):fetch(url,options);click(doc,'save-panel-note');await settled(()=>release);await changeProfile(w,doc,'learner-core');pageButton(doc,'library').click();await settled(()=>doc.querySelector('.library-filters'));doc.querySelector('[data-action=note-open][data-value=w-ani]').click();assert.equal(doc.querySelector('#personal-note').value,'');edit(w,doc.querySelector('#personal-note'),'SYNTHETIC B note');const b=doc.querySelector('#personal-note');release();await settled(()=>store.learner('learner-demo').notes['w-ani']==='SYNTHETIC A note אֲנִי');assert.equal(doc.querySelector('#personal-note'),b);assert.equal(b.value,'SYNTHETIC B note');assert.equal(store.learner('learner-core').notes['w-ani'],undefined);assert.equal(store.learner('learner-demo').notes['w-mi'],undefined);assert.equal(submitted.headers['x-demo-user'],'learner-demo');
});

test('UXI13-05 inline Watch Read Watch is explanation-only and preserves exact answer caret Keep open with zero writes',async t=>{
 const {w,doc,store,calls}=await app(t,{page:'lesson/lesson-1/apply',ownerKeyboard:true,prepare(s){const c=structuredClone(s.snapshot());const l=c.lessons.find(l=>l.id==='lesson-1');l.explanation='SYNTHETIC format-state explanation';l.video={url:'https://example.invalid/synthetic-format-state.mp4'};for(const b of l.blocks.filter(b=>b.type==='explanation')){b.text=l.explanation;b.video=l.video;}s.stage({baseRevisionId:1,expectedDraftToken:null,content:c});s.publish(1,s.currentDraft().draftToken);s.updateLearner('learner-demo',{keyboardPinned:true});}});
 const answer=doc.querySelector('#answer');edit(w,answer,'SYNTHETIC אֲנִי retained');answer.focus();answer.setSelectionRange(3,11,'backward');await settled(()=>store.learner('learner-demo').resumes['lesson-1']?.answer===answer.value);await new Promise(r=>setTimeout(r,450));click(doc,'keyboard-open');click(doc,'concept');const panel=doc.querySelector('#inline-concept');assert.ok(panel.querySelector('video'),'synthetic fixture supplies actual video availability');const before=tables(store),count=calls.length;
 for(const medium of ['read','watch','read','watch']){const control=panel.querySelector('[data-action=medium][data-value='+medium+']');assert.ok(control.hasAttribute('data-keyboard-preserve'));control.dispatchEvent(new w.Event('pointerdown',{bubbles:true,cancelable:true}));control.click();await settled(()=>panel.querySelector('[data-action=medium][aria-pressed=true]').dataset.value===medium);assert.equal(doc.querySelector('#inline-concept'),panel);assert.equal(doc.querySelector('#answer'),answer);assert.equal(answer.value,'SYNTHETIC אֲנִי retained');assert.equal(answer.selectionStart,3);assert.equal(answer.selectionEnd,11);assert.equal(answer.selectionDirection,'backward');assert.ok(doc.querySelector('.hebleo-keyboard--open'));assert.equal(doc.activeElement,answer);assert.equal(Boolean(panel.querySelector('video')),medium==='watch');}
 assert.equal(calls.length,count);assert.deepEqual(tables(store),before);assert.equal(store.learner('learner-demo').attempts.length,0);
});


// Oct14 focused app cases: real app source, disposable fictional Store/HTTP, JSDOM only.
// Controlled media dependencies exercise UI wiring; separate reference-module probes verify that module.
test('FB14 item1 directional rail rapid reversal and resize settle without remount data writes or stranded focus',async t=>{
 const {w,doc,calls}=await app(t,{width:1400,page:'lesson/lesson-1/apply'}),answer=doc.querySelector('#answer'),rail=doc.querySelector('#course-navigation'),toggle=doc.querySelector('[data-action=navigation-toggle]');edit(w,answer,'SYNTHETIC retained rail answer');await new Promise(resolve=>setTimeout(resolve,450));const count=calls.length;answer.setSelectionRange(3,9);rail.querySelector('summary').focus();toggle.click();await settled(()=>!toggle.disabled);assert.equal(rail.getAttribute('aria-hidden'),'true');assert.equal(rail.hasAttribute('inert'),true);assert.equal(doc.activeElement,toggle);assert.equal(rail.hidden,false,'closing rail remains mounted for its slide');toggle.click();await settled(()=>!toggle.disabled);await new Promise(resolve=>setTimeout(resolve,230));assert.equal(rail.hidden,false);assert.equal(rail.hasAttribute('inert'),false);assert.equal(doc.querySelector('#answer'),answer);assert.equal(answer.selectionStart,3);assert.equal(answer.selectionEnd,9);assert.equal(calls.length,count);
 toggle.click();await settled(()=>!toggle.disabled);w.innerWidth=700;w.dispatchEvent(new w.Event('resize'));await new Promise(resolve=>setTimeout(resolve,230));assert.equal(rail.hidden,true);assert.equal(doc.querySelector('.nav-shell').style.getPropertyValue('--course-track'),'0px');assert.equal(doc.querySelector('#answer'),answer);
});
test('FB14 item1 OS and app reduced motion collapse synchronously',async t=>{
 for(const mode of ['OS','app'])await t.test(mode,async t=>{const {doc}=await app(t,{page:'lesson/lesson-1/apply',width:1400,reduceMotion:mode==='OS',prepare(s){if(mode==='app')s.updateLearner('learner-demo',{animations:false});}});click(doc,'navigation-toggle');assert.equal(doc.querySelector('#course-navigation').hidden,true);assert.equal(doc.querySelector('#course-navigation').getAttribute('aria-hidden'),'true');});
});
test('FB14 items3 5 actual cards/table use one reference control and one surface menu and expose honest error retry state',async t=>{
 const {w,doc,store}=await app(t,{page:'library',realHTTP:true});assert.equal(doc.querySelectorAll('.vocabulary-surface [data-audio-speed]').length,1);assert.equal(doc.querySelector('[data-action=audio-replay]'),null);const linked=doc.querySelector('[data-action=lookup][data-value=w-ani]').closest('.word-card'),absent=doc.querySelector('[data-action=lookup][data-value=w-hu]').closest('.word-card');assert.equal(linked.querySelectorAll('[data-action=audio]').length,1);assert.equal(absent.querySelector('button[data-action=audio],select[data-audio-speed]'),null);assert.ok(!absent.textContent.includes('Recording not linked'));
 w.playAudio=async url=>{w.referenceState={url,status:w.referenceState?.status==='playing'?'paused':'playing',error:null};w.dispatchEvent(new w.CustomEvent('hebleo-reference-state',{detail:w.referenceState}));};const control=linked.querySelector('[data-action=audio]');control.click();await settled(()=>control.dataset.playbackState==='playing');assert.match(control.textContent,/Pause/);control.click();await settled(()=>control.dataset.playbackState==='paused');assert.match(control.textContent,/Play/);w.playAudio=async url=>{w.referenceState={url,status:'error',error:'SYNTHETIC reference unavailable'};w.dispatchEvent(new w.CustomEvent('hebleo-reference-state',{detail:w.referenceState}));throw Error('SYNTHETIC reference unavailable');};control.click();await settled(()=>control.dataset.playbackState==='error');assert.match(control.textContent,/Retry/);assert.ok(linked.querySelector('[data-reference-status]').textContent.includes('unavailable'));
 doc.querySelector('[data-action=vocab-view][data-value=table]').click();await settled(()=>doc.querySelector('.vocabulary-table'));assert.equal(doc.querySelectorAll('.vocabulary-surface [data-audio-speed]').length,1);assert.equal(doc.querySelectorAll('.vocabulary-table [data-audio-speed]').length,0);assert.equal(store.learner('learner-demo').preferences.audioSpeed,1);
});
test('FB14 items4 6 recording practice is outside card ratings consent remains explicit and rating text preserves scheduler intervals',async t=>{
 const {w,doc,store}=await app(t,{page:'review',realHTTP:true,prepare(s){s.enroll('learner-demo','w-ani');}});let permissionCalls=0,changed,cleared=0;w.recordVoice=async callback=>{permissionCalls++;changed=callback;callback('recording');};w.stopRecording=()=>changed('ready');w.replayVoice=async()=>{};w.clearRecording=()=>cleared++;
 click(doc,'review-start');await settled(()=>doc.querySelector('.review-card'));const section=doc.querySelector('[data-pronunciation-word]');assert.ok(section);assert.equal(section.dataset.pronunciationWord,'w-ani');assert.equal(doc.querySelector('.review-card [data-action=record]'),null);assert.equal(permissionCalls,0);section.querySelector('summary').click();assert.equal(permissionCalls,0);section.querySelector('[data-action=record]').click();await settled(()=>section.querySelector('[data-action=record-stop]').disabled===false);assert.equal(permissionCalls,1);assert.equal(section.querySelector('[data-action=record]').disabled,true);click(doc,'record-stop');await settled(()=>!section.querySelector('[data-action=voice-replay]').disabled);assert.ok(section.textContent.includes('nonlinguistic'));click(doc,'review-reveal');await settled(()=>doc.querySelector('.review-ratings'));const ratings=[...doc.querySelectorAll('.review-ratings [data-action=review-rate]')];assert.deepEqual(ratings.map(button=>button.querySelector('.rating-label').textContent),['Again','Hard','Good','Easy']);for(const button of ratings){const expected=reviewScheduler.reviewIntervalLabel(reviewScheduler.scheduleReview(store.learner('learner-demo').cards['w-ani'],Number(button.dataset.value),store.bootstrap('learner-demo').reviewClock).delayMs);assert.equal(button.querySelector('.rating-interval').textContent,expected);}assert.equal(doc.querySelector('.review-ratings [data-action=record]'),null);click(doc,'review-rate');await settled(()=>doc.querySelector('h1').textContent.includes('finished'));assert.equal(cleared,1);
});
test('FB14 items10 11 removed last-page comment disappears clamps count and pager preserves author sibling and reply draft',async t=>{
 const {w,doc,store}=await app(t,{page:'studio',author:true,realHTTP:true,prepare(s){for(let i=0;i<21;i++)s.askQuestion('learner-demo',{requestId:'fb14-'+String(i).padStart(2,'0'),revisionId:1,lessonId:'lesson-1',discussionVersion:1,question:'SYNTHETIC comment '+i});}});const title=doc.querySelector('[data-lesson-metadata] [name=title]');edit(w,title,'SYNTHETIC sibling retained');doc.querySelector('[data-action=studio-task][data-value=comments]').click();const first=doc.querySelector('[data-question-answer]');edit(w,first.querySelector('textarea'),'SYNTHETIC draft reply retained');assert.equal(doc.querySelectorAll('.comment-pager').length,1);doc.querySelector('[data-action=comment-page][data-value="1"]').click();await settled(()=>doc.querySelectorAll('.question-item').length===1);doc.querySelector('[data-action=comment-moderate][data-value$="|remove"]').click();await settled(()=>store.questions('author-demo').length===20&&doc.querySelectorAll('.question-item').length===20);assert.equal(doc.querySelector('.comment-pager'),null);assert.equal(doc.querySelector('[data-question-answer] textarea').value,'SYNTHETIC draft reply retained');assert.equal(doc.querySelector('[data-lesson-metadata] [name=title]'),title);assert.equal(title.value,'SYNTHETIC sibling retained');assert.equal(store.questionAudit('author-demo').length,21);assert.equal(store.questionAudit('author-demo').filter(q=>q.visibility==='removed').length,1);
});
test('FB14 items10 11 zero singular and filtered-page counts hide pager; failed removal retains item and error',async t=>{
 const {w,doc,store}=await app(t,{page:'studio',author:true,realHTTP:true,prepare(s){s.askQuestion('learner-demo',{requestId:'fb14-one',revisionId:1,lessonId:'lesson-1',discussionVersion:1,anonymous:true,question:'SYNTHETIC visible one'});for(let i=0;i<21;i++)s.askQuestion('learner-demo',{requestId:'fb14-other-'+i,revisionId:1,lessonId:'lesson-2',discussionVersion:1,question:'SYNTHETIC other lesson '+i});}});doc.querySelector('[data-action=studio-task][data-value=comments]').click();assert.match(doc.querySelector('.question-list h3').textContent,/^1 comment /);assert.equal(doc.querySelector('.comment-pager'),null);const fetch=w.fetch;w.fetch=(url,options)=>url==='/api/questions/moderate'?Promise.resolve({ok:false,status:503,json:async()=>({error:'SYNTHETIC removal unavailable'})}):fetch(url,options);doc.querySelector('[data-action=comment-moderate][data-value$="|remove"]').click();await settled(()=>doc.querySelector('#toast').textContent.includes('unavailable'));assert.equal(doc.querySelectorAll('.question-item').length,1);w.fetch=fetch;doc.querySelector('[data-action=comment-moderate][data-value$="|remove"]').click();await settled(()=>doc.querySelectorAll('.question-item').length===0);assert.match(doc.querySelector('.question-list h3').textContent,/^0 comments/);assert.equal(doc.querySelector('.comment-pager'),null);assert.equal(store.questionAudit('author-demo').length,22);
});
test('FB14 item9 Studio chapter and lesson controls retain associated labels and state across task switches',async t=>{
 const {w,doc,store}=await app(t,{page:'studio',author:true});loadViewportStyles(doc,480);const group=doc.querySelector('.studio-lesson-context'),select=group.querySelector('[data-current-lesson]'),label=select.closest('label');assert.ok(label.textContent.includes('Selected lesson'));assert.equal(w.getComputedStyle(label).gap,'8px');assert.equal(w.getComputedStyle(group).gap,'20px');select.value='lesson-2';select.dispatchEvent(new w.Event('change',{bubbles:true}));doc.querySelector('[data-action=studio-task][data-value=comments]').click();doc.querySelector('[data-action=studio-task][data-value=lesson]').click();assert.equal(select.value,'lesson-2');assert.equal(store.currentDraft(),null);
});
test('Actions: lost attempt response recovers the exact immutable receipt and removes Check without remounting the answer',async t=>{
 const {w,doc,store}=await app(t,{page:'lesson/lesson-1/apply',realHTTP:true});const answer=doc.querySelector('#answer'),scope=doc.querySelector('#practice');edit(w,answer,'SYNTHETIC wrong');answer.focus();answer.setSelectionRange(3,7);
 const fetch=w.fetch,requests=[];let lose=true;w.fetch=async(url,options)=>{if(url==='/api/attempt'){requests.push(parseRequestBody(options.body));const response=await fetch(url,options);if(lose){lose=false;throw new Error('SYNTHETIC lost receipt');}return response;}return fetch(url,options);};
 click(doc,'check');await settled(()=>doc.querySelector('[data-action=recover-attempt]'));
 assert.equal(store.learner('learner-demo').attempts.length,1);assert.equal(doc.querySelector('.feedback'),null);assert.equal(doc.querySelector('[data-action=check]'),null);assert.equal(doc.querySelector('#answer'),answer);assert.equal(answer.value,'SYNTHETIC wrong');assert.equal(answer.disabled,true);
 click(doc,'recover-attempt');await settled(()=>doc.querySelector('[data-action=next-question]'));
 assert.equal(store.learner('learner-demo').attempts.length,1);assert.deepEqual(requests[0],requests[1]);assert.equal(doc.querySelector('#practice'),scope);assert.equal(doc.querySelector('#answer'),answer);assert.equal(doc.querySelector('[data-action=check]'),null);assert.match(doc.querySelector('[data-answer-status]').textContent,/Incorrect.*Explanation/);assert.equal(doc.activeElement,doc.querySelector('[data-answer-commit]'));
});

test('Actions: a rejected grade preserves answer/caret and restores Check; uncertain responses never unlock a second answer',async t=>{
 const {w,doc,store}=await app(t,{page:'lesson/lesson-1/apply',realHTTP:true});const answer=doc.querySelector('#answer');edit(w,answer,'SYNTHETIC retained');answer.focus();answer.setSelectionRange(2,5);const fetch=w.fetch;w.fetch=(url,options)=>url==='/api/attempt'?Promise.resolve({ok:false,status:400,json:async()=>({error:'SYNTHETIC rejected'})}):fetch(url,options);
 click(doc,'check');await settled(()=>doc.querySelector('[data-grade-recovery]'));assert.equal(doc.querySelector('#answer'),answer);assert.equal(answer.value,'SYNTHETIC retained');assert.equal(answer.disabled,false);assert.equal(answer.selectionStart,2);assert.equal(answer.selectionEnd,5);assert.equal(store.learner('learner-demo').attempts.length,0);assert.equal(doc.querySelector('.feedback'),null);assert.ok(doc.querySelector('[data-action=check]'));
});

test('Actions: known grade save failure repeatedly retries only persistence with one primary recovery action',async t=>{
 const {w,doc,store,calls}=await app(t,{page:'lesson/lesson-1/apply',realHTTP:true});edit(w,doc.querySelector('#answer'),'אני');await new Promise(r=>setTimeout(r,450));const fetch=w.fetch;let fail=true;w.fetch=(url,options)=>url==='/api/progress'&&fail?Promise.resolve({ok:false,status:503,json:async()=>({error:'SYNTHETIC position unavailable'})}):fetch(url,options);
 click(doc,'check');await settled(()=>doc.querySelector('[data-position-recovery]'));assert.equal(store.learner('learner-demo').attempts.length,1);assert.equal(doc.querySelector('[data-action=check]'),null);assert.equal(doc.querySelector('[data-action=next-question]'),null);assert.equal(doc.querySelector('[data-primary-action]').children.length,1);assert.match(doc.querySelector('.compact-result').textContent,/Correct/);
 click(doc,'save-answer-position');await settled(()=>doc.querySelector('[data-action=save-answer-position]'));fail=false;click(doc,'save-answer-position');await settled(()=>doc.querySelector('[data-action=next-question]'));assert.equal(doc.querySelector('[data-position-recovery]'),null);assert.equal(calls.filter(url=>url==='/api/attempt').length,1);assert.equal(store.learner('learner-demo').resumes['lesson-1'].resultRequestId,store.learner('learner-demo').attempts[0].requestId);
});

test('Actions: failed continuing retains the graded answer until the same destination saves, including a lost save response',async t=>{
 const {w,doc,store,calls}=await app(t,{page:'lesson/lesson-1/apply',realHTTP:true});edit(w,doc.querySelector('#answer'),'אני');click(doc,'check');await settled(()=>doc.querySelector('[data-action=next-question]'));const answer=doc.querySelector('#answer'),scope=doc.querySelector('#practice'),fetch=w.fetch,targets=[];let lose=true;
 w.fetch=async(url,options)=>{const response=await fetch(url,options);if(url==='/api/progress'){targets.push(parseRequestBody(options.body));if(lose){lose=false;throw new Error('SYNTHETIC lost save response');}}return response;};
 click(doc,'next-question');await settled(()=>doc.querySelector('[data-action=retry-continuing]'));assert.equal(doc.querySelector('#practice'),scope);assert.equal(doc.querySelector('#answer'),answer);assert.equal(answer.value,'אני');assert.ok(doc.querySelector('.compact-result'));assert.equal(doc.querySelector('[data-action=check]'),null);
 click(doc,'retry-continuing');await settled(()=>doc.querySelector('.matching-game'));assert.deepEqual(targets[0],targets[1]);assert.equal(calls.filter(url=>url==='/api/attempt').length,1);assert.equal(store.learner('learner-demo').resumes['lesson-1'].question,1);
});

test('FB14 item3 surface preference ownership and late completion preserve current owner control state without rate quality assertions',async t=>{
 const {w,doc,store}=await app(t,{page:'library',realHTTP:true});const url=store.snapshot().words.find(word=>word.id==='w-ani').audio.url;w.referenceState={url,status:'playing',error:null};w.dispatchEvent(new w.CustomEvent('hebleo-reference-state',{detail:w.referenceState}));let selector=doc.querySelector('[data-audio-speed]');selector.value='0.75';selector.dispatchEvent(new w.Event('change',{bubbles:true}));await settled(()=>store.learner('learner-demo').preferences.audioSpeed===0.75);await settled(()=>doc.querySelector('[data-reference-control]').dataset.playbackState==='playing');assert.equal(doc.querySelector('[data-reference-control]').getAttribute('aria-pressed'),'true');
 const original=w.fetch;let release;w.fetch=(target,options)=>target==='/api/preferences'&&options?.method==='POST'?new Promise(resolve=>{release=async()=>resolve(await original(target,options));}):original(target,options);selector.value='1';selector.dispatchEvent(new w.Event('change',{bubbles:true}));await settled(()=>release);await changeProfile(w,doc,'learner-core');pageButton(doc,'library').click();await settled(()=>doc.querySelector('[data-audio-speed]'));const other=doc.querySelector('[data-audio-speed]');assert.equal(other.value,'1');release();await settled(()=>store.learner('learner-demo').preferences.audioSpeed===1);await tick();assert.equal(doc.querySelector('[data-audio-speed]'),other);assert.equal(other.value,'1');assert.equal(store.learner('learner-core').preferences.audioSpeed,1);
});

test('FB14 item4 Undo clears the departing word recording and ignores its late callback',async t=>{
 const {w,doc,store}=await app(t,{page:'review',realHTTP:true,prepare(s){s.enroll('learner-demo','w-ani');s.enroll('learner-demo','w-hu');}});let cleared=0,changed;w.clearRecording=()=>cleared++;w.recordVoice=async callback=>{changed=callback;callback('recording');};click(doc,'review-start');await settled(()=>doc.querySelector('.review-card'));click(doc,'review-reveal');await settled(()=>doc.querySelector('.review-ratings'));click(doc,'review-rate');await settled(()=>doc.querySelector('[data-pronunciation-word]')?.dataset.pronunciationWord==='w-hu');doc.querySelector('[data-action=record]').click();await settled(()=>doc.querySelector('[data-recording-status]').textContent.includes('Recording locally'));await settled(()=>!doc.body.textContent.includes('pending'));const before=cleared;click(doc,'review-undo');await settled(()=>doc.querySelector('[data-pronunciation-word]')?.dataset.pronunciationWord==='w-ani');assert.equal(cleared,before+1);assert.equal(doc.querySelector('[data-action=record-stop]').disabled,true);assert.equal(doc.querySelector('[data-action=voice-replay]').disabled,true);changed('ready');assert.equal(doc.querySelector('[data-action=voice-replay]').disabled,true);assert.equal(doc.querySelector('[data-recording-status]').textContent,'');assert.equal(store.learner('learner-demo').lastReview,null);
});

test('FB14 actual reference module drives all same-source app controls through pending Pause ended and retry',async t=>{
 const {w,doc}=await app(t,{page:'library',realHTTP:true});const keys=['window','Audio'],previous=Object.fromEntries(keys.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)])),elements=[];
 class NativeAPIFixture extends w.EventTarget{constructor(url){super();this.url=url;this.currentTime=0;this.paused=true;this.pending=new Promise((resolve,reject)=>{this.resolve=resolve;this.reject=reject;});elements.push(this);}play(){return this.pending;}pause(){this.paused=true;this.dispatchEvent(new w.Event('pause'));}emit(name){if(name==='playing')this.paused=false;this.dispatchEvent(new w.Event(name));}}
 Object.defineProperty(globalThis,'window',{value:w,configurable:true,writable:true});Object.defineProperty(globalThis,'Audio',{value:NativeAPIFixture,configurable:true,writable:true});const media=await import('../public/media.js?fb14-app-integration='+randomUUID());t.after(()=>{media.clearRecording();for(const [key,descriptor] of Object.entries(previous)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}});Object.assign(w,media);
 const controls=[...doc.querySelectorAll('[data-reference-control]')];assert.equal(controls.length,2);assert.equal(controls[0].dataset.value,controls[1].dataset.value);const sameState=status=>controls.every(button=>button.dataset.playbackState===status);controls[0].click();await settled(()=>sameState('buffering'));assert.equal(controls[0].disabled,false);controls[1].click();await settled(()=>sameState('paused'));elements[0].emit('playing');elements[0].resolve();await Promise.resolve();assert.equal(elements[0].paused,true);assert.equal(media.getPlaybackState().status,'paused');
 controls[0].click();await settled(()=>sameState('buffering'));elements[1].emit('playing');elements[1].resolve();await settled(()=>sameState('playing'));elements[1].emit('ended');assert.ok(sameState('ended'));assert.ok(controls.every(button=>button.textContent.includes('Play')));controls[0].click();await settled(()=>sameState('buffering'));assert.equal(elements[2].currentTime,0);elements[2].reject(Error('SYNTHETIC link unavailable'));await settled(()=>sameState('error'));assert.ok(controls.every(button=>button.textContent.includes('Retry')));assert.ok(doc.querySelector('[data-reference-status]').textContent.includes('try Play again'));controls[1].click();await settled(()=>sameState('buffering'));elements[3].resolve();await settled(()=>sameState('playing'));media.stopMedia();assert.ok(sameState('idle'));assert.equal(doc.querySelectorAll('[data-audio-speed]').length,1);
});

test('FB14 item14 confirmed grade bootstrap failure refreshes authoritative progress on persistence-only recovery',async t=>{
 const {w,doc,store,calls}=await app(t,{page:'lesson/lesson-1/apply',realHTTP:true});edit(w,doc.querySelector('#answer'),'אני');await new Promise(resolve=>setTimeout(resolve,450));const fetch=w.fetch;let failBootstrap=true;w.fetch=(url,options)=>url==='/api/bootstrap'&&failBootstrap?Promise.resolve({ok:false,status:503,json:async()=>({error:'SYNTHETIC progress refresh unavailable'})}):fetch(url,options);const answer=doc.querySelector('#answer'),check=doc.querySelector('[data-action=check]');check.click();await settled(()=>doc.querySelector('[data-position-recovery]'));assert.equal(store.learner('learner-demo').attempts.length,1);assert.equal(doc.querySelector('[role=status].compact-result').getAttribute('aria-label'),'Correct');assert.equal(doc.querySelector('[data-action=next-question]'),null);failBootstrap=false;click(doc,'save-answer-position');await settled(()=>!doc.querySelector('[data-position-recovery]'));assert.equal(doc.querySelector('#answer'),answer);assert.equal(doc.querySelector('[data-action=check]'),null);assert.equal(doc.querySelector('.lesson-progress progress').value,1);assert.equal(doc.querySelector('[data-action=next-question]').disabled,false);assert.equal(store.learner('learner-demo').resumes['lesson-1'].resultRequestId,store.learner('learner-demo').attempts[0].requestId);assert.equal(calls.filter(url=>url==='/api/attempt').length,1);
});

test('Source vocabulary uses the normal library with exact text, filters, paging, focus and separate learned collection',async t=>{
 const a=await app(t,{page:'library',realHTTP:true,prepare:store=>{const c=store.snapshot();c.lexical=lexicalFixture();c.lexical.sourceBrowse=sourceBrowseFixture();store.set('active',store.addRevision(c,'Synthetic source library test'));}});
 const {doc,w,store}=a,before=JSON.stringify(store.learner('learner-demo'));
 const scrollTargets=[];w.HTMLElement.prototype.scrollIntoView=function(){scrollTargets.push(this);};
 assert.match(doc.querySelector('h1').textContent,/Vocabulary/);assert.equal(doc.querySelectorAll('tbody[data-word-key]').length,50);
 doc.querySelector('[data-action="source-page"][data-value="50"]').click();await settled(()=>doc.querySelectorAll('tbody[data-word-key]').length===11);
 assert.equal(doc.activeElement,doc.querySelector('.lexical-library-status'));assert.equal(scrollTargets.at(-1),doc.activeElement);
 const category=doc.querySelector('#source-category');category.value='Other';category.dispatchEvent(new w.Event('change'));
 await settled(()=>doc.querySelectorAll('tbody[data-word-key]').length===1);assert.match(doc.body.textContent,/Exact test meaning 60/);
 assert.match(doc.querySelector('.lexical-library-status').textContent,/1 source word · 1–1/);
 const input=doc.querySelector('#library-search');input.focus();input.value='no matching source';input.dispatchEvent(new w.Event('input',{bubbles:true}));
 await settled(()=>doc.querySelector('.lexical-vocabulary').textContent.includes('No vocabulary'));assert.equal(doc.activeElement.id,'library-search');
 doc.querySelector('[data-action="library-clear"]').click();await settled(()=>doc.querySelectorAll('tbody[data-word-key]').length===1);
 assert.equal(doc.activeElement.id,'library-search');
 doc.querySelector('[data-action="library-mode"][data-value="learned"]').click();await settled(()=>doc.querySelector('#library-state'));
 assert.equal(doc.querySelectorAll('.lexical-source-details').length,0);assert.equal(JSON.stringify(store.learner('learner-demo')),before);
});

for(const type of ['ordering','cloze','transformation'])for(const correct of [true,false])test('E10 bound '+type+' actual HTTP correct/incorrect, in-place and restored cards '+correct,async t=>{
 let authored;
 const {w,doc,store,calls}=await app(t,{page:'lesson/lesson-2/apply',realHTTP:true,prepare(s){
  const c=syntheticOccurrencePack(s);authored=c.exercises.find(e=>e.type===type);
  const staged=s.stage({baseRevisionId:s.get('active'),expectedDraftToken:null,content:c}),revisionId=s.publish(s.get('active'),staged.draftToken).revisionId;
  const lesson=c.lessons.find(l=>l.id===authored.lessonId);
  s.saveProgress('learner-demo',{lessonId:authored.lessonId,revisionId,step:'apply',question:lesson.exerciseIds.indexOf(authored.id),answer:'',selectedTokens:[],matching:{},practiceIds:[],resultRequestId:null});
 }});
 assert.equal(doc.querySelector('[data-vocabulary-binding]'),null);
 const pub=store.session('learner-demo',authored.lessonId).content.exercises.find(e=>e.id===authored.id);
 let raw;
 if(type==='ordering'){
  const targetIndices=pub.vocabularyBindings.filter(b=>b.field==='tokens').map(b=>b.index);
  const arrange=picked=>{if(picked.length===targetIndices.length)return composeSentence(pub.tokens,picked,pub.prefixTokenIndices)===authored.answers[0]?picked:null;for(const i of targetIndices)if(!picked.includes(i)){const found=arrange([...picked,i]);if(found)return found;}return null;};
  const indices=correct?arrange([]):[pub.tokens.findIndex((_t,i)=>!targetIndices.includes(i))];assert.ok(indices);
  for(const [position,i] of indices.entries()){doc.querySelector('[data-action=token][data-value="'+i+'"]').click();await settled(()=>doc.querySelectorAll('[data-action=remove-token]').length===position+1);}
  raw=doc.querySelector('.assembled-sentence').textContent;
 }else{raw=correct?authored.answers[0]:'SYNTHETIC WRONG';const input=doc.querySelector('#answer');input.value=raw;input.dispatchEvent(new w.Event('input',{bubbles:true}));}
 const scope=doc.querySelector('#practice');click(doc,'check');await settled(()=>doc.querySelector('[data-authored-vocabulary-answers] [data-vocabulary-binding]')&&store.learner('learner-demo').resumes[authored.lessonId]?.resultRequestId);
 assert.equal(doc.querySelector('#practice'),scope);assert.equal(store.learner('learner-demo').attempts.at(-1).correct,correct);assert.equal(store.learner('learner-demo').attempts.at(-1).answer,raw);
 if(type!=='ordering')assert.equal(doc.querySelector('#answer').value,raw);
 assert.equal(doc.querySelector('button button'),null);
 const before=JSON.stringify(store.learner('learner-demo')),writes=calls.filter(p=>['/api/attempt','/api/progress','/api/preferences'].includes(p)).length;
 w.HTMLElement.prototype.getBoundingClientRect=()=>({left:10,top:10,right:160,bottom:60,width:150,height:50});w.HTMLElement.prototype.getClientRects=function(){return [this.getBoundingClientRect()];};
 const trigger=doc.querySelector('[data-authored-vocabulary-answers] [data-vocabulary-binding]');trigger.click();assert.ok(doc.querySelector('.vocabulary-reminder'));doc.querySelector('[data-vocabulary-close]').click();assert.equal(doc.activeElement,trigger);
 assert.equal(JSON.stringify(store.learner('learner-demo')),before);assert.equal(calls.filter(p=>['/api/attempt','/api/progress','/api/preferences'].includes(p)).length,writes);
 const restored=await app(t,{page:'lesson/lesson-2/apply',store,realHTTP:true});assert.ok(restored.doc.querySelector('[data-authored-vocabulary-answers] [data-vocabulary-binding]'));assert.equal(store.learner('learner-demo').attempts.length,1);
});


test('first20 actual learner UI consumes injected text projection/progress contracts and cancels on departure',async t=>{
 const records=[],savedResponses={};
 const {doc,w,store,calls}=await app(t,{page:'lesson/lesson-1/learn',width:360,prepare(store){
  const c=store.snapshot();c.lessons[0]=courseHelpers.projectLesson(c,c.lessons[0]);
  const block=c.lessons[0].blocks.find(b=>b.type==='explanation');block.textPages={version:1,pages:[{id:'stable.recall',type:'recall',title:'Native text page',answer:'Illustrative fixture answer',grading:'self-check',gate:'reveal'},{id:'stable.memory',type:'timedRecall',title:'Timed native page',value:'0704177609112001',durationMs:10000,answer:'model',accessibleAlternative:true}],order:['stable.recall','stable.memory']};
  // Frozen base strips textPages. Inject the agreed projection seam; Lead owns its integration.
  const project=store.publicContent.bind(store);store.publicContent=(content,lessonId)=>{const value=project(content,lessonId);for(const lesson of value.lessons)for(const block of lesson.blocks||[]){const original=content.lessons.find(l=>l.id===lesson.id)?.blocks.find(b=>b.id===block.id);if(original?.textPages)block.textPages=structuredClone(original.textPages);}return value;};
  store.set('active',store.addRevision(c,'Synthetic text UI fixture only'));store.startLatestLesson('learner-demo','lesson-1');
 },textProgressTransport:async({input})=>{if(!input)return {responses:savedResponses};records.push(input);savedResponses[input.pageId]=input.response;return {saved:true};}});
 doc.querySelector('[data-action=medium][data-value=read]')?.click();await settled(()=>doc.querySelector('[data-reader-heading]')).catch(error=>{throw new Error(error.message+' '+doc.body.textContent.slice(-2400));});
 const before=store.learner('learner-demo');assert.equal(doc.querySelector('[data-reader-heading]').textContent,'Native text page');
 const attempt=doc.querySelector('[data-reader-attempt]');attempt.value='תּוֹדָה';attempt.dispatchEvent(new w.Event('input',{bubbles:true}));doc.querySelector('[data-reader-action=reveal]').click();
 await settled(()=>records.some(r=>r.response.revealed));assert.ok(records.every(r=>r.lessonId==='lesson-1'&&r.componentId==='legacy-explanation'&&r.revisionId===2));assert.equal(records.at(-1).response.text,'תּוֹדָה');assert.deepEqual(store.learner('learner-demo').completed,before.completed);assert.deepEqual(store.learner('learner-demo').attempts,before.attempts);
 doc.querySelector('[data-reader-action=next]').click();doc.querySelector('[data-reader-action=play]').click();assert.equal(doc.querySelector('.text-reader-value').textContent,'0704177609112001');const old=doc.querySelector('[data-text-reader]');
 doc.querySelector('[data-action=page][data-value=course]').click();await settled(()=>!doc.querySelector('[data-text-reader]'));assert.equal(old.textContent,'');assert.ok(calls.includes('/api/text-progress'));assert.ok(records.every(r=>!JSON.stringify(r).includes('0704177609112001')));
});

test('first20 integrated learner uses real HTTP text projection and persistence across reload without completion writes',async t=>{
 const s=new Store();t.after(()=>s.close());const c=s.snapshot();c.lessons[0]=courseHelpers.projectLesson(c,c.lessons[0]);const b=c.lessons[0].blocks.find(b=>b.type==='explanation');
 b.textPages={version:1,pages:[{id:'http.recall',type:'recall',title:'Synthetic native-contract HTTP fixture',prompt:'Try before reveal',answer:'Illustrative answer',grading:'self-check',gate:'reveal'}],order:['http.recall']};const draft=s.stage({baseRevisionId:1,expectedDraftToken:null,content:c});s.publish(1,draft.draftToken);
 const {doc,w,calls}=await app(t,{page:'lesson/lesson-1/learn',store:s,realHTTP:true,width:360});doc.querySelector('[data-action=medium][data-value=read]')?.click();await settled(()=>doc.querySelector('[data-reader-attempt]'));
 const before=s.learner('learner-demo'),attempt=doc.querySelector('[data-reader-attempt]');assert.equal(doc.querySelector('.text-reader-model'),null);attempt.value='תּוֹדָה';attempt.dispatchEvent(new w.Event('input',{bubbles:true}));doc.querySelector('[data-reader-action=reveal]').click();await settled(()=>s.learner('learner-demo').textPages?.[0]?.responses['http.recall']?.revealed);
 assert.deepEqual(s.learner('learner-demo').completed,before.completed);assert.deepEqual(s.learner('learner-demo').attempts,before.attempts);assert.ok(calls.includes('/api/text-progress'));
 const reload=await app(t,{page:'lesson/lesson-1/learn',store:s,realHTTP:true,width:360});reload.doc.querySelector('[data-action=medium][data-value=read]')?.click();await settled(()=>reload.doc.querySelector('.text-reader-model'));assert.equal(reload.doc.querySelector('[data-reader-attempt]').value,'תּוֹדָה');
});

// Actual app + server integration for the current human-authored lesson replacement.
const actualFirst2=JSON.parse(readFileSync(new URL('../content/first2/lessons.json',import.meta.url)));
const {installFirstTwo}=await import('../scripts/install-first2.mjs');
function installFirst2Fixture(store){const fixture=structuredClone(actualFirst2);for(const p of fixture.lessons.flatMap(l=>l.blocks[0].textPages.pages)){if(p.activity)delete p.activity.image;for(const i of p.activity?.items||[])delete i.image;}store.set('draft',{baseRevisionId:store.get('active'),content:store.snapshot(),stagedAt:'first2-test'});installFirstTwo(store,{pack:fixture,build:'first2-actual-http',mediaRoot:'.'});}

test('FIRST2 actual HTTP learner completes skip/empty paths and navigates to the real second lesson with saved responses',async t=>{
 const {store,w,doc}=await app(t,{page:'lesson/MEMORY-A2',realHTTP:true,prepare:installFirst2Fixture,reduceMotion:true,ownerKeyboard:true});
 assert.equal(doc.querySelector('.lesson-footer'),null);assert.equal(doc.querySelectorAll('#practice .primary').length,1);assert.equal(doc.querySelector('[data-action=help]'),null);assert.ok(doc.querySelector('#lesson-comments'));
 const source=a=>{const e=doc.querySelector('[data-source-action="'+a+'"]');assert.ok(e,a);assert.equal(e.disabled,false,a);e.click();};
 const next=async()=>{const marker=doc.querySelector('[data-text-reader] header .tag')?.textContent;source('next');await settled(()=>doc.querySelector('[data-text-reader] header .tag')?.textContent!==marker);};
 await next();await next();source('skip');await next();source('animate');source('animation-next');source('animation-next');assert.equal(doc.querySelector('[data-source-action=next]').disabled,false);await next();
 const optional=doc.querySelector('[data-source-comparison]');optional.open=true;await settled(()=>doc.querySelector('[data-source-comparison]').open);source('compare');assert.match(doc.querySelector('#practice').textContent,/Here are the two dates/);await next();
 // A failed position save must leave the last page and its retryable Continue intact.
 const fetch=w.fetch;let refuseFinish=true;w.fetch=(url,options)=>{if(refuseFinish&&url==='/api/progress'&&options?.method==='POST'){refuseFinish=false;return Promise.resolve({ok:false,status:503,json:async()=>({error:'Synthetic failed position save'})});}return fetch(url,options);};
 source('next');await settled(()=>doc.querySelector('[data-source-save]')?.textContent.includes('Could not continue'));assert.equal(store.learner('learner-demo').completed.includes('MEMORY-A2'),false);assert.ok(doc.querySelector('[data-source-heading]'));assert.equal(doc.querySelector('[data-source-action=next]').disabled,false);
 await next();await settled(()=>store.learner('learner-demo').completed.includes('MEMORY-A2'));
 const record=store.learner('learner-demo').textPages.find(r=>r.lessonId==='MEMORY-A2');assert.equal(record.responses['MEMORY-A2.learn.number-round'].skipped,true);assert.equal(record.responses['MEMORY-A2.learn.meaning'].attempted,false);assert.equal(store.learner('learner-demo').attempts.length,0);
 await settled(()=>doc.querySelector('[data-action="lesson"][data-value="MNTL-A2"]'));doc.querySelector('[data-action="lesson"][data-value="MNTL-A2"]').click();await settled(()=>doc.querySelector('h1')?.textContent.includes('four consonants'));assert.equal(doc.querySelectorAll('figure').length,4);await next();
 const n=doc.querySelectorAll('[name="source-choice"]')[1];n.checked=true;n.dispatchEvent(new w.Event('change',{bubbles:true}));source('check-choice');await next();assert.equal(doc.querySelector('[data-copy-letter]').dataset.copyLetter,'ל');source('keyboard');const key=doc.querySelector('#hebleo-keyboard-root [data-insert="ל"]');key.click();assert.equal(doc.querySelector('[data-source-input]').value,'ל');source('check-input');await next();
 const tav=doc.querySelectorAll('[name="source-choice"]')[1];tav.checked=true;tav.dispatchEvent(new w.Event('change',{bubbles:true}));source('check-choice');await next();
 for(const [id,letter]of [['m','מ'],['n','נ'],['t','ת'],['l','ל']]){const el=doc.querySelector('[data-source-match="'+id+'"]');el.value=letter;el.dispatchEvent(new w.Event('change',{bubbles:true}));}source('check-match');await next();
 for(const letter of ['מ','ל']){assert.equal(doc.querySelector('[data-copy-letter]'),null);assert.equal(doc.querySelectorAll('#hebleo-keyboard-root .new-key').length,0);const field=doc.querySelector('[data-source-input]');field.value=letter;field.dispatchEvent(new w.Event('input',{bubbles:true}));source('check-input');await next();}source('skip');await next();await next();await settled(()=>store.learner('learner-demo').completed.includes('MNTL-A2'));await settled(()=>doc.querySelector('[data-action="lesson"][data-value="lesson-3"]'));
 const restored=new Store();t.after(()=>restored.close());restored.restore(store.backup());assert.deepEqual(restored.learner('learner-demo').completed,['MEMORY-A2','MNTL-A2']);
});

test('FIRST2 actual Studio selects both installed source lessons, edits activity settings and previews the same interactions without learner writes',async t=>{
 const {store,w,doc}=await app(t,{page:'studio',author:true,realHTTP:true,prepare:installFirst2Fixture});await settled(()=>doc.querySelector('[data-current-lesson]'));const before=JSON.stringify(store.learner('author-demo'));
 for(const id of ['MEMORY-A2','MNTL-A2']){
  doc.querySelector('.studio-context button').click();doc.querySelector('[data-pick-lesson="'+id+'"]').click();assert.equal(doc.querySelector('[data-selected-lesson]').textContent,id);assert.equal(doc.querySelector('[data-page-select]').options.length,id==='MEMORY-A2'?6:9);doc.querySelector('[data-action="rehearse"]').click();await settled(()=>doc.querySelector('[data-preview-root] [data-source-action="next"]'));assert.equal(doc.querySelector('[data-preview-root] h3').textContent,id==='MEMORY-A2'?'Welcome to Hebleo':'Four shapes, four sounds');doc.querySelector('[data-preview-root] [data-source-action="next"]').click();assert.ok(doc.querySelector('[data-preview-root] h3').textContent.includes(id==='MEMORY-A2'?'Welcome to Hebleo':'Try without'));doc.querySelector('[data-preview-exit]').click();await settled(()=>!doc.querySelector('[data-preview-root]'));
 }
 assert.equal(JSON.stringify(store.learner('author-demo')),before);
});

function authorInlineFixture(s){const c=s.snapshot();c.lessons[1]=courseHelpers.projectLesson(c,c.lessons[1]);const l=c.lessons[1],b=l.blocks.find(b=>b.type==='explanation');b.textPages={version:1,order:['synthetic-author-page'],pages:[{id:'synthetic-author-page',type:'reading',title:'Synthetic author heading',html:'<p><strong>Exact 😀 שָׁלוֹם</strong> source.</p>',gate:'none',unknownMetadata:{retain:true}}]};s.set('active',s.addRevision(c,'Synthetic inline author fixture'));}
test('F14 real app inline → shared draft → saved Preview → Studio review → deliberate disposable publish; private note survives reload and is excluded for learner',async t=>{
 const {w,doc,store,calls}=await app(t,{author:true,page:'lesson/lesson-2/learn',realHTTP:true,prepare:authorInlineFixture});
 click(doc,'author-inline');await settled(()=>doc.querySelector('[name=author-source]'));const revision=store.get('active'),before=JSON.stringify(store.learner('author-demo'));
 const html='<p><strong>Exact 😀 שָׁלוֹם</strong> <em>synthetic edited</em> source.</p>';edit(w,doc.querySelector('[name=author-source]'),html);
 assert.equal(doc.querySelector('[data-author-action=preview]').disabled,true);assert.equal(store.currentDraft(),null);
 assert.ok(Object.keys(w.inlineState().raw).length,JSON.stringify(w.inlineState()));doc.querySelector('[data-author-action=save]').click();await settled(()=>store.currentDraft()&&!doc.querySelector('[data-author-action=preview]').disabled);
 assert.equal(store.get('active'),revision);assert.equal(store.currentDraft().content.lessons[1].blocks.find(b=>b.textPages).textPages.pages[0].html,html);
 doc.querySelector('[data-author-action=preview]').click();await settled(()=>doc.querySelector('#rehearsal-panel [data-text-reader]'));assert.match(doc.querySelector('#rehearsal-panel').textContent,/synthetic edited/);doc.querySelector('[data-preview-exit]').click();await settled(()=>!doc.querySelector('#rehearsal-panel'));assert.equal(doc.activeElement,doc.querySelector('[data-author-action=preview]'));
 doc.querySelector('[data-author-action=comment]').click();await settled(()=>doc.querySelector('[data-author-anchor]').textContent.includes('Whole block:'));
 edit(w,doc.querySelector('[data-author-body]'),'SYNTHETIC F14 PRIVATE NOTE');doc.querySelector('[data-author-composer]').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await settled(()=>doc.querySelector('[data-author-note]'));
 doc.querySelector('[data-author-action=apply]').click();await settled(()=>doc.querySelector('.lesson-publication-dialog'));assert.equal(store.get('active'),revision);
 await confirmSelectedPublication(doc);await settled(()=>store.get('active')!==revision);assert.equal(store.snapshot().lessons[1].blocks.find(b=>b.textPages).textPages.pages[0].html,html);
 assert.equal(JSON.stringify(store.learner('author-demo')),before);assert.equal(store.authorReview.list('author-demo',{lessonId:'lesson-2'}).comments[0].body,'SYNTHETIC F14 PRIVATE NOTE');
 pageButton(doc,'studio').click();await settled(()=>doc.querySelector('[data-action=studio-task][data-value=comments]'));doc.querySelector('[data-action=studio-task][data-value=comments]').click();await settled(()=>doc.querySelector('#studio-author-comments-mount [data-author-note]'));assert.match(doc.querySelector('#studio-author-comments-mount').textContent,/SYNTHETIC F14 PRIVATE NOTE/);
 const select=doc.querySelector('#demo-user');select.value='learner-core';select.dispatchEvent(new w.Event('change',{bubbles:true}));await settled(()=>doc.querySelector('#demo-user')?.value==='learner-core');
 assert.equal(JSON.stringify(store.bootstrap('learner-core')).includes('SYNTHETIC F14 PRIVATE NOTE'),false);assert.equal(doc.querySelector('[data-author-note]'),null);assert.equal(doc.querySelector('[data-action=author-inline]'),null);
 assert.ok(calls.includes('/api/studio/author-comments'));
});

test('F14 unsaved inline edits and sibling Studio edits survive view changes; stale save retains input until explicit reconciliation',async t=>{
 const {w,doc,store}=await app(t,{author:true,page:'lesson/lesson-2/learn',realHTTP:true,prepare:authorInlineFixture});click(doc,'author-inline');await settled(()=>doc.querySelector('[name=author-source]'));
 edit(w,doc.querySelector('[name=author-source]'),'<p><b>SYNTHETIC unsaved inline source</b></p>');
 doc.querySelector('[data-action=page][data-value=studio]').click();await settled(()=>doc.querySelector('[data-canonical-word]'));edit(w,doc.querySelector('[data-canonical-word] [name=notes]'),'SYNTHETIC sibling retained');
 assert.equal(w.ensureAuthorContext({}).getContent().words[0].notes,'SYNTHETIC sibling retained','Studio collector captures the word');
 // Return through the normal course flow through the shared Save draft departure action.
 doc.querySelector('[data-action=page][data-value=course]').click();await departure(doc,'save');await settled(()=>doc.querySelector('[data-action=lesson][data-value=lesson-2]'));assert.equal(w.ensureAuthorContext({}).getContent().words[0].notes,'SYNTHETIC sibling retained','Course transition retains the word');doc.querySelector('[data-action=lesson][data-value=lesson-2]').click();await settled(()=>doc.querySelector('[name=author-source]'));
 assert.equal(doc.querySelector('[name=author-source]').value,'<p><b>SYNTHETIC unsaved inline source</b></p>');
 assert.equal(w.ensureAuthorContext({}).getContent().words[0].notes,'SYNTHETIC sibling retained','Inline re-entry retains the word');edit(w,doc.querySelector('[data-author-field=title]'),'SYNTHETIC local heading');const foreign=structuredClone(store.currentDraft()?.content||store.snapshot());foreign.lessons[0].title='SYNTHETIC other tab title';store.stage({baseRevisionId:store.get('active'),expectedDraftToken:store.currentDraft()?.draftToken??null,content:foreign});
 doc.querySelector('[data-author-action=save]').click();await settled(()=>/changed elsewhere/.test(doc.querySelector('[data-author-status]').textContent));assert.match(doc.querySelector('[name=author-source]').value,/unsaved inline/);assert.equal(store.currentDraft().content.lessons[0].title,'SYNTHETIC other tab title');
 doc.querySelector('[data-author-action=reconcile]').click();await settled(()=>/reconciled/.test(doc.querySelector('[data-author-status]').textContent));assert.equal(w.ensureAuthorContext({}).getContent().words[0].notes,'SYNTHETIC sibling retained','Reconciliation retains the word');doc.querySelector('[data-author-action=save]').click();await settled(()=>/Draft saved/.test(doc.querySelector('[data-author-status]').textContent));
 assert.equal(store.currentDraft().content.words[0].notes,'SYNTHETIC sibling retained');assert.equal(store.currentDraft().content.lessons[0].title,'SYNTHETIC other tab title');assert.match(store.currentDraft().content.lessons[1].blocks.find(b=>b.textPages).textPages.pages[0].html,/unsaved inline/);
});

// QA-F14-STATE-01: original independent real-HTTP navigation roundtrip.
const savedAuthorHTML=s=>s.currentDraft().content.lessons[1].blocks.find(b=>b.textPages).textPages.pages[0].html;
const authorNavigate=(doc,id)=>doc.querySelector('[data-action=page][data-value="'+id+'"]').click();
test('REGRESSION: departure Save must retire inline raw buffers so later Studio changes survive inline reentry',async t=>{
 const {w,doc,store}=await app(t,{author:true,realHTTP:true,page:'lesson/lesson-2/learn',prepare:authorInlineFixture});doc.querySelector('[data-action=author-inline]').click();await settled(()=>doc.querySelector('[name=author-source]'));
 const first='<p><b>SYNTHETIC first edit saved using departure</b></p>',second='<p><em>SYNTHETIC later Studio edit</em></p>';edit(w,doc.querySelector('[name=author-source]'),first);
 authorNavigate(doc,'home');await settled(()=>doc.querySelector('#studio-departure'));doc.querySelector('[data-departure-save]').click();await settled(()=>w.location.hash==='#home');assert.equal(savedAuthorHTML(store),first);
 authorNavigate(doc,'studio');await settled(()=>doc.querySelector('.studio-context button'));doc.querySelector('.studio-context button').click();await settled(()=>doc.querySelector('[data-pick-lesson="lesson-2"]'));doc.querySelector('[data-pick-lesson="lesson-2"]').click();await settled(()=>doc.querySelector('[data-page-field=html]'));
 edit(w,doc.querySelector('[data-page-field=html]'),second);
 authorNavigate(doc,'course');await settled(()=>doc.querySelector('#studio-departure'));doc.querySelector('[data-departure-save]').click();await settled(()=>w.location.hash==='#course');assert.equal(savedAuthorHTML(store),second,'Studio successfully saved the newer source');
 doc.querySelector('[data-action=lesson][data-value="lesson-2"]').click();await settled(()=>doc.querySelector('[name=author-source]'));
 const shown=doc.querySelector('[name=author-source]').value;
 doc.querySelector('[data-author-action=save]').click();await settled(()=>/Draft saved/.test(doc.querySelector('[data-author-status]').textContent));

 assert.equal(savedAuthorHTML(store),second,'An unchanged inline save must not overwrite the newer saved Studio source');assert.equal(shown,second,'Inline must display the newer saved Studio source');
});


test('Flashcard follow-up: actual app Space/digits preserve one commit and recover a lost acknowledgement read-only',async t=>{
 const {w,doc,store}=await app(t,{page:'review',realHTTP:true,prepare(s){s.enroll('learner-demo','w-ani');s.enroll('learner-demo','w-hu');}});
 click(doc,'review-start');await settled(()=>doc.querySelector('[data-action=review-reveal]'));
 const key=(el,k,extra={})=>{const event=new w.KeyboardEvent('keydown',{key:k,bubbles:true,cancelable:true,...extra});el.dispatchEvent(event);return event};
 let sends=0,lost=true;const original=w.fetch;w.fetch=async(path,options)=>{if(path==='/api/review/background'){sends++;const response=await original(path,options);if(lost){lost=false;throw Error('Synthetic lost acknowledgement after server commit');}return response;}return original(path,options)};
 key(doc.body,'1');assert.equal(sends,0);const reveal=doc.querySelector('[data-action=review-reveal]');reveal.focus();assert(key(reveal,' ').defaultPrevented);
 await settled(()=>doc.querySelector('[data-action=review-rate]'));key(doc.body,'1');key(doc.body,'2');await settled(()=>doc.querySelector('[data-review-save-status]')?.textContent.includes('need recovery'));
 assert.equal(sends,1);assert.equal(store.learner('learner-demo').cards['w-ani'].repetitions,1);key(doc.body,'3');assert.equal(sends,1);
 doc.querySelector('[data-review-save-status] button').click();await settled(()=>doc.querySelector('[data-pronunciation-word]')?.dataset.pronunciationWord==='w-hu');assert.equal(sends,1);assert.equal(store.learner('learner-demo').cards['w-ani'].repetitions,1);
});

test('Flashcard follow-up: actual queued sibling removed after confirmed save and undo restores its queue',async t=>{
 const a='sc-mf-000001-he-en',b='sc-mf-000001-en-he';
 const {doc,store}=await app(t,{page:'review',realHTTP:true,prepare(s){s.shared.word=id=>[a,b].includes(id)?{id,shared:true,sourceId:'mf-000001',english:'Synthetic note',hebrew:'fixture'}:null;s.enroll('learner-demo',a);s.enroll('learner-demo',b);s.enroll('learner-demo','w-hu');}});
 click(doc,'review-start');await settled(()=>doc.querySelector('[data-shared-review]'));click(doc,'review-reveal');await settled(()=>doc.querySelector('[data-action=review-rate]'));click(doc,'review-rate');
 await settled(()=>doc.querySelector('[data-pronunciation-word]')?.dataset.pronunciationWord==='w-hu');assert.equal(store.learner('learner-demo').cards[b].repetitions,0);await settled(()=>!store.bootstrap('learner-demo').due.some(x=>x.word.id===b)&&!doc.body.textContent.includes('pending'));
 click(doc,'review-undo');await settled(()=>doc.querySelector('[data-shared-review]')?.dataset.cardId===a);assert(store.bootstrap('learner-demo').due.some(x=>x.word.id===b));assert(!store.learner('learner-demo').reviewBurials?.['mf-000001']);
});

for(const stalledPath of ['/api/bootstrap','/api/questions'])test('BACKGROUND no per-rating '+stalledPath+' fetch is needed to advance and save',async t=>{
 const {w,doc,store}=await app(t,{page:'review',realHTTP:true,prepare(s){s.enroll('learner-demo','w-ani');s.enroll('learner-demo','w-hu');}});
 click(doc,'review-start');await settled(()=>doc.querySelector('[data-action=review-reveal]'));click(doc,'review-reveal');
 const original=w.fetch;let reads=0;w.fetch=async(path,options)=>{if(path===stalledPath){reads++;return new Promise(()=>{});}return original(path,options);};
 click(doc,'review-rate');await settled(()=>doc.querySelector('[data-pronunciation-word]')?.dataset.pronunciationWord==='w-hu');await settled(()=>store.learner('learner-demo').cards['w-ani'].repetitions===1);assert.equal(reads,0);
});

test('RR-APP delayed old frame flush cannot reveal or clear a newer pending reveal',async t=>{
 const a='sc-mf-000001-he-en',b='sc-mf-000001-en-he';
 const {w,doc,store}=await app(t,{page:'review',realHTTP:true,prepare(s){s.shared.word=id=>[a,b].includes(id)?{id,shared:true,sourceId:'mf-000001',english:'Synthetic',hebrew:'fixture'}:null;[a,b].forEach(id=>s.enroll('learner-demo',id));}});
 const prior=globalThis.window;globalThis.window=w;const releases=[];t.after(()=>{releases.forEach(release=>release?.());globalThis.window=prior});
 const original=w.fetch;w.fetch=async(path,options)=>{const response=await original(path,options);if(path==='/api/shared-cards/settings')await new Promise(resolve=>releases.push(resolve));return response};
 const settings=(frame,mode,nikkud)=>w.dispatchEvent(new w.MessageEvent('message',{source:frame.contentWindow,data:{type:'hebleo-card-settings',mode,nikkud}}));
 click(doc,'review-start');await settled(()=>doc.querySelector('[data-shared-review]'));const oldFrame=doc.querySelector('[data-shared-review]');settings(oldFrame,'dark',false);await settled(()=>releases.length===1);click(doc,'review-reveal');
 click(doc,'review-end');click(doc,'review-start');await settled(()=>doc.querySelector('[data-shared-review]')&&doc.querySelector('[data-shared-review]')!==oldFrame);const nextFrame=doc.querySelector('[data-shared-review]');settings(nextFrame,'light',true);await settled(()=>releases.length===2);click(doc,'review-reveal');
 releases[0]();await new Promise(resolve=>setTimeout(resolve,30));assert.equal(doc.querySelector('[data-shared-review]').dataset.face,'front');
 releases[1]();await settled(()=>doc.querySelector('[data-shared-review]')?.dataset.face==='back');assert.deepEqual(store.shared.settings('learner-demo'),{mode:'light',nikkud:true});
});

test('practice tutorial is read-only before and during native review',async t=>{
 const {doc,w,store,calls}=await app(t,{page:'review',prepare:s=>s.enroll('learner-demo','w-ani')});
 const help=()=>doc.querySelector('[data-practice-help=flashcards]');
 const check=()=>{const before=JSON.stringify(store.learner('learner-demo')),count=calls.length,card=doc.querySelector('.review-card');help().focus();help().click();const modal=doc.querySelector('dialog[open]');assert(modal);for(const key of [' ','1','2','3','4','Enter'])modal.querySelector('button').dispatchEvent(new w.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));assert.equal(JSON.stringify(store.learner('learner-demo')),before);assert.equal(calls.length,count);assert.equal(doc.querySelector('.review-card'),card);modal.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));assert.equal(doc.querySelector('dialog'),null);assert.equal(doc.activeElement,help());};
 check();doc.querySelector('[data-action=review-start]').click();await settled(()=>doc.querySelector('[data-action=review-reveal]'));check();doc.querySelector('[data-action=review-reveal]').click();await settled(()=>doc.querySelector('[data-action=review-rate]'));check();doc.querySelector('[data-action=review-rate][data-value="3"]').click();await settled(()=>doc.querySelector('h1')?.textContent.includes('finished'));check();doc.querySelector('[data-action=review-end]').click();await settled(()=>doc.querySelector('[data-action=review-start]'));check();
});

test('practice tutorial keeps synthetic sharedReview iframe mounted and its face unchanged',async t=>{
 const {doc,w,calls}=await app(t,{page:'review',sharedTutorialFixture:true,prepare:s=>s.enroll('learner-demo','w-ani')});let mounts=0,disposals=0;
 // Synthetic shared-card projection; isolate ticket transport while using actual app branch.
 w.mountSharedReview=()=>{mounts++;return {dispose(){disposals++;}};};
 doc.querySelector('[data-action=review-start]').click();await settled(()=>doc.querySelector('[data-shared-review]'));
 const frame=doc.querySelector('[data-shared-review]'),before=frame.outerHTML,count=calls.length;assert(frame);doc.querySelector('[data-practice-help]').click();doc.querySelector('dialog button').click();assert.equal(doc.querySelector('[data-shared-review]'),frame);assert.equal(frame.outerHTML,before);assert.equal(mounts,1);assert.equal(disposals,0);assert.equal(calls.length,count);
});
