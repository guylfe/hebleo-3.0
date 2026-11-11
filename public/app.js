import {helpControl,bindPracticeHelp} from './conjugation/help.js';
let practiceHelpBinding=null;
import {mountNativeConjugation} from './native-conjugation.js';
let conjugationMount=null;
import {mountReviewKeys} from './review-shortcuts.js';
import {createReviewSave} from './review-save.js';
let reviewSave=null,reviewUndoQueue=null,reviewRevealPending=null;
import {heatmapHTML} from './review-heatmap.js';
import {mountSharedReview} from './shared-cards.js';
let sharedFrame=null;
import {createStudioWorkspace} from './studio/workspace.js';
import {courseRailEdge,updateCourseToggle} from './sidebar-toggle.js';
import {mountInlineAuthor} from './author/inline-author.js';
import {openLessonPublication} from './studio/lesson-publication.js';
import {BACKUP_BYTE_LIMIT,serializeBackup} from './backup-contract.js';
import { resolveBlock, importVocabularyCSV } from './content.js';
import { lessonSteps, stepLabels, stepExercises, followingLesson, lessonQuestionProgress, defaultMedium, audioURL, wordFields, fieldLabel, searchableWord, lessonPortions, portionKind, portionExercises, portionLesson, portionLabel, libraryWords } from './ux.js';
import {orderedLessons,courseOutline,keyboardForLesson,resolveComponent,projectLesson} from './course.js';
import {richCell,cellCSS} from './rich.js';
import {renderLesson} from './rich-browser.js';
import {hasTextPages,mountTextReader} from './text-reader.js';
import {textPageMedia,textGatesPassed,syncTextContinue,textGateNotice,ownsTextNavigation,extraInformationControl,bindExtraInformation} from './learner-view.js';
import {composeSentence,bindMatching,matchWord} from './interactions.js';
import {reviewNikkud} from './ux.js';
import {scheduleReview,reviewIntervalLabel} from './review-schedule.js';
import { playAudio, setPlaybackSpeed, stopMedia, recordVoice, stopRecording, replayVoice, clearRecording, feedbackSound, getPlaybackState } from './media.js';
import {esc,button,wordText,fieldText,cellAttribute,audioControls,syncAudioControls,richFields,wordCard,vocabularyTable,learnMedia,exerciseInput,exerciseSurface,exerciseFeedback,wireAnswer,syncReferenceControls,bindResultExplanations,applyMatchingResult,exerciseActionDock,mountExerciseDock} from './learner-view.js';
import {mountMediaLibrary} from './studio/media-library.js';
import {mountSourceAuthoring} from './studio/sources-editor.js';
import {mountUnifiedStudio} from './studio/unified-studio.js';
import {mountTextImport} from './studio/text-import.js';
import {mountImportWorkflow} from './studio/import-workflow.js';
import {mountExerciseEditor} from './studio/exercise-editor.js';
import {inspectImport,renderImportReview} from './studio/import-review.js';
import {mountLessonPreview} from './preview/lesson-preview.js';
import {createLearnerRenderer} from './preview/learner-renderer.js';
import {renderLexicalVocabulary,bindLexicalVocabulary} from './lexical-vocabulary.js';
import {mountAnsweredVocabulary} from './post-answer-vocabulary.js';

const root = document.querySelector('#app');
const state = { page:'home', user:localStorage.getItem('hebleo-demo-user') || 'learner-demo', data:null, lessonId:'lesson-1', step:'learn', question:0, answer:'', matching:{}, selectedTokens:[], sentenceMode:'simple', result:null, practiceIds:[], medium:'watch', wordId:'w-ani', search:'', libraryTag:'', libraryLesson:'', libraryState:'', libraryPage:0, libraryMode:'source', sourceCategory:'', sourceLesson:'', studioTask:'lesson', outlineOpen:null, discussionPage:0, commentDrafts:{}, commentPending:{}, commentErrors:{}, noteDrafts:{}, replyDrafts:{}, replyOpen:{}, replyPending:{}, replyErrors:{}, navigation:{}, navDrawer:null, navLast:null, studio:null, reports:[], questions:[], authorLessonId:'lesson-1', authorExerciseId:null, importCandidate:null, studioImport:{}, panel:null, reviewSession:null, revealReview:false, recording:'empty' };
const uid = () => crypto.randomUUID();
let authorContext=null,inlineAuthor=null,studioPrivateComments=null,inlineAuthorStates=new Map();
let publicationDialog=null;
function openSelectedLessonPublication(lessonId){
 if(publicationDialog?.dialog.isConnected){publicationDialog.dialog.focus();return;}
 const owner=state.user,workspace=ensureAuthorContext(state.studio);workspace.savedContext();
 state.authorLessonId=lessonId;
 const title=workspace.peekContent().lessons.find(l=>l.id===lessonId)?.title||lessonId;
 publicationDialog=openLessonPublication({document,workspace,lessonId,title,api:(path,input)=>api(path,input,owner),returnFocus:()=>root.querySelector('[data-author-action="save"]:not(:disabled),[data-save-workspace]:not(:disabled)')||root.querySelector('h1'),onPublished:async result=>{
  if(authorContext?.workspace!==workspace||state.user!==owner)return;
  state.studio={...state.studio,...result.workspace};
  // Refresh summaries without remounting the editor, its selection or comments.
  try{state.studio=await api('studio',undefined,owner);state.data=await api('bootstrap',undefined,owner);if(state.page==='studio'){const template=document.createElement('template');template.innerHTML=studio();const versions=root.querySelector('#studio-pane-versions'),next=template.content.querySelector('#studio-pane-versions');if(versions&&next){versions.replaceChildren(...next.childNodes);bind(versions);}}}catch{toast('Publication confirmed. Summary refresh failed; local edits remain.');}
 },onReconciled:latest=>{if(authorContext?.workspace===workspace&&state.user===owner){state.studio=latest;render();}}});
 return publicationDialog;
}
function authorStateFor(id){const key=JSON.stringify([state.user,id]);if(!inlineAuthorStates.has(key))inlineAuthorStates.set(key,{});return inlineAuthorStates.get(key);}
function inlineState(){return authorStateFor(state.lessonId);}
function inlineActive(){return state.page==='lesson'&&state.data?.canAuthor&&inlineState().active&&authorContext?.owner===state.user;}
function ensureAuthorContext(studio){
 if(authorContext?.owner===state.user)return authorContext.workspace;
 const owner=state.user;
 const workspace=createStudioWorkspace({content:studio.draft?.content||studio.content,publishedContent:studio.content,baseRevisionId:studio.revisionId,expectedDraftToken:studio.draft?.draftToken??null,
  saveDraft:async (input,prepared)=>{if(studioSave)throw new Error('The previous draft save is still reloading.');const result=await api('studio/draft',input,owner,{Prefer:'return=minimal'},prepared?.body);if(state.user===owner){state.studio={...state.studio,revisionId:input.baseRevisionId,preview:null,draft:{baseRevisionId:input.baseRevisionId,content:input.content,draftToken:result.draftToken}};}return result;}});
 authorContext={owner,workspace};return workspace;
}
async function openInlineAuthor(editing){
 if(!state.data.canAuthor)return;
 await settleTextSaves();await flushSave();state.studio=await api('studio');const workspace=ensureAuthorContext(state.studio);let l=workspace.getContent().lessons.find(l=>l.id===state.lessonId);if(l.compositionVersion!==2){const c=workspace.getContent();l=projectLesson(c,l);c.lessons[c.lessons.findIndex(x=>x.id===l.id)]=l;workspace.replace(c);}
 const b=l.blocks.find(b=>b.id===state.step&&b.type==='explanation')||l.blocks.find(b=>b.type==='explanation');
 if(!b)throw new Error('This lesson has no editable teaching block.');
 const local=inlineState();local.componentId??=b.id;
 const saved=textReaderStates.get(JSON.stringify([state.user,state.session.revisionId,l.id,b.id]));local.pageId??=saved?.cursorPageId||b.textPages?.order[0];local.active=true;local.editing=editing;
 render();root.querySelector('[data-author-action="edit"]')?.focus({preventScroll:true});
}
function mountInlineLesson(){
 if(!inlineActive())return;
 const local=inlineState();inlineAuthor=mountInlineAuthor(root.querySelector('[data-inline-author-mount]'),{workspace:authorContext.workspace,lessonId:state.lessonId,componentId:local.componentId,pageId:local.pageId,state:local,api,renderLesson,onPreview:startRehearsal,onReviewPublish:openSelectedLessonPublication,onApply:async id=>{
  authorContext.workspace.savedContext();state.authorLessonId=id;state.studioTask='versions';state.page='studio';await load();setRoute();render();focusHeading();
 },onExit:()=>{local.active=false;render();}});
}

const pref = () => state.data.learner.preferences;
let navigationHideTimer;const navigationMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)');
let exerciseDockBinding, pendingAttempt=null, answerPhase="ready", continueTarget=null;
let textReaderBindings=[];let extraInformationBinding;
let textReaderGeneration=0;
const textReaderStates=new Map();
const textSaveQueues=new Map();
function captureTextDestination(){
 const generation=textReaderGeneration,owner=state.user,page=state.page,session=state.session,lessonId=state.lessonId,step=state.step;
 return ()=>generation===textReaderGeneration&&owner===state.user&&page===state.page&&session===state.session&&lessonId===state.lessonId&&step===state.step;
}
function lessonTextReady(blockId){
 if(state.page!=='lesson'||!state.session)return true;const l=lessonObject(),revisionId=state.session.revisionId;
 return l.blocks.filter(b=>!blockId||b.id===blockId).every(b=>{
  const key=JSON.stringify([state.user,revisionId,l.id,b.id]);
  const saved=textReaderStates.get(key)||state.data.learner.textPages?.find(r=>r.lessonId===l.id&&r.componentId===b.id&&r.revisionId===revisionId);
  return textGatesPassed(b.textPages,saved||{});
 });
}
function syncLessonTextGates(){
 if(state.page!=='lesson')return;const l=lessonObject(),keys=portionKeys(l),next=keys[keys.indexOf(state.step)+1];
 syncTextContinue(root,(currentKind()!=='learn'||lessonTextReady(state.step))&&(next!=='complete'||lessonTextReady()));
 for(const control of root.querySelectorAll('.step-strip [data-action="step"][data-value="complete"]'))control.disabled=!lessonTextReady();
}
async function settleTextSaves(){
 const prefix=JSON.stringify([state.user,state.session.revisionId,state.lessonId]).slice(0,-1)+',';
 const bindings=[...textReaderBindings];
 await Promise.all(bindings.map(binding=>binding.settled()));
 await Promise.all([...textSaveQueues].filter(([key])=>key.startsWith(prefix)&&!key.endsWith('|optional')).map(([,promise])=>promise));
}
function disposeTextReaders(){extraInformationBinding?.destroy();extraInformationBinding=null;textReaderGeneration++;textReaderBindings.splice(0).forEach(binding=>binding.destroy());}
function mountLessonTextReaders(scope=root){
 if(state.page!=='lesson'||!state.session)return;
 const lesson=portionLesson(lessonObject(),state.step);if(!hasTextPages(lesson))return;
 const owner=state.user,revisionId=state.session.revisionId,lessonId=lesson.id,componentId=lesson.textComponentId||state.step;
 const key=JSON.stringify([owner,revisionId,lessonId,componentId]);
 for(const host of scope.querySelectorAll('[data-text-reader]')){
  const current=()=>state.user===owner&&state.page==='lesson'&&state.session?.revisionId===revisionId&&state.lessonId===lessonId&&portionLesson(lessonObject(),state.step).textComponentId===lesson.textComponentId;
  const binding=mountTextReader(host,{textPages:lesson.textPages,renderLesson,word,renderWord:w=>wordCard(w),renderMedia:textPageMedia,dock:currentKind()==='learn',
   initialState:textReaderStates.get(key),isCurrent:current,onContinue:()=>act('step',portionKeys(lessonObject())[portionKeys(lessonObject()).indexOf(state.step)+1],host),onState:saved=>textReaderStates.set(key,saved),onGateChange:(_ready,saved)=>{textReaderStates.set(key,saved);syncLessonTextGates();},
   loadProgress:textReaderStates.has(key)?undefined:()=>api('text-progress?'+new URLSearchParams({lessonId,revisionId,componentId}),undefined,owner),
   saveProgress:record=>{
    const queueKey=record.optional?key+'|optional':key;
    const pending=(textSaveQueues.get(queueKey)||Promise.resolve()).catch(()=>{}).then(()=>{
     const latest=textReaderStates.get(key);
     const {optional,...wire}=record;
     return api('text-progress',{lessonId,revisionId,componentId,...wire,response:latest?.responses[record.pageId]||record.response,cursorPageId:latest?.cursorPageId||record.cursorPageId},owner);
    });textSaveQueues.set(queueKey,pending);return pending;
   }});
  textReaderBindings.push(binding);
 }
}
let reminderBinding,lexicalBinding,lexicalSearchTimer,lexicalRequest=0,lexicalLoading=false,lexicalError='';
let saveTimer, saveChain=Promise.resolve(), submitting=false, routeGeneration=0, panelGeneration=0, lastFocus=null;
// The author workspace owns its mounts across status renders; deliberate departures dispose it.
let studioMounts=[], studioWorkspace=null, studioDeparturePending=false, rehearsal=null, sourceWorkspaceState=null,mediaWorkspaceState=null;
// This tab's in-flight guided draft save and workspace reload. Until it settles state.studio still holds the previous draft,
// so Studio writes wait for it and then name the token that save returned: another tab's newer draft is still rejected.
let studioSave=null;
// The task calls done() once state.studio is reloaded, so the render that follows mounts current, enabled editors.
function trackStudioSave(task){let run;const done=()=>{if(studioSave===run)studioSave=null;};run=task(done).finally(done);studioSave=run;return run;}
async function settledDraftToken(){let token=draftToken();while(studioSave||authorContext?.workspace.pending){const pending=studioSave||authorContext.workspace.pending;try{token=(await pending)?.draftToken??token;}catch{}}return token;}
async function api(path, body, user=state.user, headers={},preparedBody,options={}) {
  const response=await fetch('/api/'+path,{signal:options.signal,method:body===undefined?'GET':'POST',headers:{'x-demo-user':user,...(body===undefined?{}:{'content-type':'application/json'}),...headers},...(body===undefined?{}:{body:preparedBody??JSON.stringify(body)})});
  const value=await response.json(); if(!response.ok)throw Object.assign(new Error(value.error || 'Request failed'),{status:response.status,...value}); return value;
}
function toast(message) { const box=document.querySelector('#toast');box.textContent=message;box.classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>box.classList.remove('visible'),5000); }
const reviewGroup=id=>/^sc-(mf-\d{6})-(he-en|en-he)$/.exec(id)?.[1]||id;
let reviewDueSource=[],reviewDueTimer=null,reviewRefreshRunning=false;
function scheduleReviewReturn(){
 clearTimeout(reviewDueTimer);if(!reviewSave)return;
 const now=reviewSave.now();if(!Number.isFinite(now))return;
 const boundaries=reviewSave.snapshot().overlays.flatMap(r=>[Date.parse(r.authoritativeSchedule?.due),r.siblingsUntil]).filter(t=>Number.isFinite(t)&&t>now);
 if(boundaries.length)reviewDueTimer=setTimeout(()=>refreshReviewDue().catch(error=>toast(error.message)),Math.min(2147483647,Math.max(25,Math.min(...boundaries)-now+25)));
}
async function refreshReviewDue(){
 if(reviewRefreshRunning||!reviewSave)return;reviewRefreshRunning=true;
 const save=reviewSave,owner=state.user,session=state.reviewSession,controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
 try{const data=await api('bootstrap',undefined,owner,{},undefined,{signal:controller.signal});
  if(state.user!==owner||reviewSave!==save)return;
  await save.observe(data);if(state.user!==owner||reviewSave!==save)return;
  const hadCard=!!reviewWord();state.data=data;reviewDueSource=data.due;overlayReviews();
  if(session&&session===state.reviewSession){for(const {word}of state.data.due)if(session.ids.indexOf(word.id)<session.index&&!session.ids.slice(session.index).includes(word.id))session.ids.push(word.id);}
  if(!hadCard&&session===state.reviewSession&&session){await save.clock(session.ids.slice(session.index,session.index+100));if(state.user!==owner||reviewSave!==save||state.reviewSession!==session)return;}
  if(state.page==='review'&&(!state.reviewSession||!hadCard)){state.revealReview=false;render();}
 }finally{clearTimeout(timeout);reviewRefreshRunning=false;}
}
function overlayReviews(){
 if(!reviewSave||!state.data)return;
 const snap=reviewSave.snapshot();
 for(const receipt of snap.overlays)if(receipt.outcome==='committed'&&(state.data.learner.reviewGenerations?.[receipt.cardId]||0)<=(receipt.resultingGeneration||0))state.data.learner.cards[receipt.cardId]=receipt.authoritativeSchedule;
 state.data.due=reviewDueSource.filter(({word})=>!reviewSave.excluded(word.id,reviewGroup(word.id)));
 scheduleReviewReturn();
}
async function ensureReviewOutbox(){
 if(reviewSave?.owner===state.user&&!reviewSave.snapshot().disposed)return reviewSave;
 reviewSave?.dispose();const owner=state.user;
 let save;save=createReviewSave({background:true,ownerId:owner,isActive:()=>state.user===owner,
 getCardIds:()=>state.reviewSession?state.reviewSession.ids.slice(state.reviewSession.index,state.reviewSession.index+100):reviewDueSource.map(x=>x.word.id).slice(0,100),send:(path,body,signal)=>api(path,body,owner,{},undefined,{signal}),onChange:()=>{
  if(reviewSave!==save||state.user!==owner)return;
  overlayReviews();reviewPendingStatus();
  if(state.page==='review'&&(!state.reviewSession||!reviewWord())){render();reviewPendingStatus();}
  const session=state.reviewSession;
  if(session&&!save.blocked){let moved=false;while(session.index<session.ids.length&&save.excluded(session.ids[session.index],reviewGroup(session.ids[session.index]))){session.index++;moved=true;}if(moved){state.revealReview=false;render();reviewPendingStatus();}}
 }});save.owner=owner;reviewSave=save;await save.ready.catch(()=>{});return save;
}
function reviewPendingStatus(){
 if(!reviewSave)return;const snap=reviewSave.snapshot();
 reviewStatus(snap.error?'Pending reviews need recovery: '+snap.error:snap.pending.length?snap.pending.length+' review'+(snap.pending.length===1?'':'s')+' pending':'');
 const rejected=snap.pending.find(x=>x.phase==='needs-resolution');if(rejected){const status=root.querySelector('[data-review-save-status]');if(status){status.textContent='Rating was not applied: '+rejected.receipt.reasonCode+'. ';const resolve=document.createElement('button');resolve.textContent='Resolve rejected rating';resolve.onclick=()=>act('review-resolve-rejected',rejected.intent.requestId).catch(error=>toast(error.message));status.append(resolve);}}
}
// Review refresh commits nothing until all reads and the captured operation are current.
async function loadReview({owner,signal,isCurrent}) {
 if(!isCurrent()||signal.aborted)return false;
 const data=await api('bootstrap',undefined,owner,{},undefined,{signal});
 if(!isCurrent()||signal.aborted)return false;
 const questions=await api('questions',undefined,owner,{},undefined,{signal});
 if(!isCurrent()||signal.aborted)return false;
 state.sharedView=data.sharedCollection;state.data=data;state.questions=questions;return true;
}
async function load() {
  const owner=state.user,page=state.page,data=await api('bootstrap',undefined,owner),questions=await api('questions',undefined,owner);
  const author=page==='studio'&&data.canAuthor,studio=author?await api('studio',undefined,owner):null,reports=author?await api('reports',undefined,owner):null;
  const sharedView=page==='library'&&state.libraryMode==='shared'&&data.sharedCollection?await api('shared-cards?'+new URLSearchParams({search:state.sharedSearch||'',offset:state.sharedView?.offset||0}),undefined,owner):data.sharedCollection;
  if(state.user!==owner)return;state.sharedView=sharedView;state.data=data;reviewDueSource=data.due;state.questions=questions;const save=await ensureReviewOutbox();if(state.user!==owner||reviewSave!==save)return;await save.observe(data).catch(()=>{});if(state.user!==owner||reviewSave!==save)return;overlayReviews();if(author){state.studio=studio;state.reports=reports;}
}
// Studio writes name the draft they were built from, so a draft changed in another tab is never silently overwritten.
function draftToken() { return authorContext?.owner===state.user?authorContext.workspace.expectedDraftToken:state.studio?.draft?.draftToken ?? null; }
function content() { return state.page==='lesson' && state.session ? state.session.content : state.data.content; }
function word(id) { return content().words.find(w=>w.id===id); }
function lessonObject() { return content().lessons.find(l=>l.id===state.lessonId); }
function currentExercise() { const l=lessonObject();return l ? content().exercises.find(e=>e.id===portionExercises(content(),l,state.step,state.practiceIds)[state.question]) : null; }
function keyboardContext(){return state.page==='lesson'?state.session.keyboard||keyboardForLesson(content(),state.lessonId):{knownKeys:'',newKeys:''};}
const portionKeys=l=>lessonPortions(content(),l).map(p=>p.key);
const currentKind=()=>portionKind(lessonObject(),state.step);
const label=key=>lessonObject()?portionLabel(lessonObject(),key):stepLabels[key]||key;
function practicePortion(){return lessonObject().compositionVersion===2?lessonPortions(content(),lessonObject()).find(p=>['check','apply'].includes(p.kind))?.key:'apply';}
function syncKeyboard(){window.HebleoKeyboard?.sync(keyboardContext(),pref(),state.page==='lesson'?state.lessonId+'|'+state.step+'|'+state.question:state.page);}
function returnKeyboard(){window.HebleoKeyboard?.mount(document.body);}
const chapterName=(c,id)=>courseOutline(c).find(g=>g.kind==='chapter'&&g.lessons.some(l=>l.id===id))?.title||'';
function nextLesson() { return orderedLessons(state.data.content).find(l=>!state.data.learner.completed.includes(l.id)) || null; }
function continueLesson() { const l=state.data.content.lessons.find(l=>l.id===state.data.learner.lastLessonId && !state.data.learner.completed.includes(l.id));return l || nextLesson(); }
let pendingApproval=null;
function clearQuestionAnswer() { pendingApproval=null;pendingAttempt=null;answerPhase='ready';continueTarget=null;state.answer='';state.matching={};state.selectedTokens=[];state.sentenceMode='simple';state.result=null; }
function answerDraft() { return {text:state.answer,matching:state.matching,sentenceMode:state.sentenceMode,selectedTokens:state.selectedTokens}; }
function resetQuestion() { state.question=0;clearQuestionAnswer(); }
function questionProgress(l) { return lessonQuestionProgress(l,state.data.learner.attempts,state.session.revisionId); }
function lessonProgressBar(l) { if(!l.exerciseIds.length)return '';const n=questionProgress(l).correctIds.length,total=l.exerciseIds.length;return '<div class="lesson-progress"><label for="lesson-question-progress">'+n+' of '+total+' questions answered correctly</label><progress id="lesson-question-progress" value="'+n+'" max="'+(total||1)+'" aria-label="Lesson questions answered correctly" aria-valuetext="'+n+' of '+total+'"></progress></div>'; }
function progressPayload() { return {lessonId:state.lessonId,revisionId:state.session.revisionId,step:currentKind(),...(lessonObject().compositionVersion===2?{componentId:state.step==='complete'?null:state.step}:{}),question:state.question,answer:state.answer,sentenceMode:state.sentenceMode,selectedTokens:[...state.selectedTokens],matching:{...state.matching},resultRequestId:state.result?.requestId || null,practiceIds:state.practiceIds}; }
function queueSave() {
  if(state.page!=='lesson' || !state.session||inlineActive())return saveChain;
  const payload=progressPayload(),user=state.user,isCurrent=captureTextDestination(),finishesWithoutQuestions=payload.step==='complete'&&!lessonObject().exerciseIds.length;
  saveChain=saveChain.catch(()=>{}).then(async()=>{ const saved=await api('progress',payload,user);if(state.user===user){state.data.learner.resumes[payload.lessonId]=saved;state.data.learner.lastLessonId=payload.lessonId;if(finishesWithoutQuestions){const fresh=await api('bootstrap',undefined,user);if(state.user===user)state.data.learner=fresh.learner;}} }).catch(error=>{if(isCurrent())toast('Position was not saved: '+error.message);throw error;});
  return saveChain;
}
function scheduleSave() { clearTimeout(saveTimer);saveTimer=setTimeout(()=>queueSave().catch(()=>{}),400); }
async function flushSave() { clearTimeout(saveTimer);if(state.page==='lesson')await queueSave();else await saveChain.catch(()=>{}); }
function setRoute(replace=false) { const hash=state.page==='lesson'?'#lesson/'+state.lessonId+'/'+state.step:'#'+state.page;history[replace || location.hash===hash?'replaceState':'pushState']({},'',hash); }
async function openLesson(id, step, replace=false) {
  if(!await guardStudioDeparture('Open this lesson'))return;
  disposeTextReaders();
  rememberComposers();closeNavigation();
  await flushSave();clearRecording();state.recording='empty';stopMedia();
  const session=await api('session?lessonId='+encodeURIComponent(id));
  state.session=session;state.lessonId=id;state.page='lesson';state.practiceIds=[];resetQuestion();
  const p=session.progress;
  if(p){state.step=lessonObject().compositionVersion===2?(p.componentId??'complete'):p.step;state.question=p.question;state.answer=p.answer;state.matching=p.matching;state.selectedTokens=p.selectedTokens;state.sentenceMode=p.sentenceMode||'simple';state.practiceIds=p.practiceIds || [];state.result=session.result;}
  else state.step=portionKeys(lessonObject())[0];
  step=portionKeys(lessonObject()).includes(step)?step:lessonObject().compositionVersion===2?lessonPortions(content(),lessonObject()).find(p=>p.kind===step)?.key:step;
  if(step && portionKeys(lessonObject()).includes(step) && step!==state.step){state.step=step;resetQuestion();state.practiceIds=[];}
  if(state.step==='complete'&&!lessonTextReady()){state.step=lessonObject().blocks.find(b=>!lessonTextReady(b.id))?.id||portionKeys(lessonObject())[0];resetQuestion();}
  state.medium=defaultMedium(portionLesson(lessonObject(),state.step));state.panel=null;setRoute(replace);await queueSave();render();focusHeading();
}
function focusHeading() { window.scrollTo({top:0,behavior:pref().animations?'smooth':'instant'});document.querySelector('h1')?.focus({preventScroll:true}); }
function navIcon(page){const paths={home:'M3 9 10 3l7 6v8h-5v-5H8v5H3Z',course:'M3 3h14v14H3Z M6 7h8 M6 10h8 M6 13h5',conjugation:'M3 5h14 M3 10h10 M3 15h14',review:'M4 7a7 7 0 1 1 0 7 M4 3v4h4',library:'M3 4h6l1 2 1-2h6v13h-6l-1-2-1 2H3Z',studio:'M4 3h12v14H4Z M7 7h6 M7 10h6 M7 13h3',settings:'M3 5h14 M3 10h14 M3 15h14 M7 3v4 M13 8v4 M8 13v4'};return '<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+paths[page]+'"/></svg>';}
function nav(){const items=[['home','Your path'],['course','Course'],['review','Flashcards'],['conjugation','Conjugation practice'],['library','My Hebrew'],...(state.data.canAuthor?[['studio','Studio']]:[]),['settings','Settings']];return items.map(([page,title])=>'<button data-action="page" data-value="'+page+'" aria-label="'+title+'" title="'+title+'" aria-current="'+(state.page===page||page==='course'&&state.page==='lesson'?'page':'false')+'" class="'+(state.page===page||page==='course'&&state.page==='lesson'?'active':'')+'"><span class="nav-icon" aria-hidden="true">'+navIcon(page)+'</span><span class="nav-label">'+title+'</span></button>').join('');}
function navigationChoices(){
 const width=window.innerWidth||1280;if(!state.navigation[state.user]){let saved={};try{saved=JSON.parse(localStorage.getItem('hebleo-navigation-'+state.user)||'{}');}catch{}state.navigation[state.user]={main:typeof saved.main==='boolean'?saved.main:width<1280,course:typeof saved.course==='boolean'?saved.course:width<1024};}return state.navigation[state.user];
}
function navigationToggle(){return '<button type="button" class="nav-toggle" data-action="navigation-toggle" data-value="course" aria-controls="course-navigation" aria-label="Course outline" title="Course outline"><svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="2" y="3" width="16" height="14" rx="2"/><path d="M7 3v14"/><path data-course-arrow d="M13 6l-4 4 4 4"/></svg></button>';}
function applyNavigation(){
 const shell=root.querySelector('.nav-shell');if(!shell)return;const wasReady=shell.dataset.navigationReady==='true';shell.dataset.navigationReady='true';const prefs=navigationChoices(),width=window.innerWidth||1280,hasCourse=shell.classList.contains('has-course'),mobile=width<960,overlay=hasCourse&&mobile&&state.navDrawer==='course',expanded=hasCourse&&(mobile?overlay:!prefs.course),header=root.querySelector('.app-header');
 const openingRail=root.querySelector('#course-navigation');if(expanded&&openingRail?.hidden){openingRail.hidden=false;void openingRail.offsetWidth;}
  root.style.setProperty('--header-height',(header?.getBoundingClientRect().height||88)+'px');shell.style.setProperty('--course-track',hasCourse&&!mobile&&!prefs.course?'248px':'0px');shell.dataset.mainOverlay='false';shell.dataset.courseCollapsed=String(!expanded);shell.dataset.courseOverlay=String(overlay);shell.dataset.mobile=String(mobile);
 clearTimeout(navigationHideTimer);const rail=root.querySelector('#course-navigation');if(rail){if(expanded&&rail.hidden){rail.hidden=false;void rail.offsetWidth;}rail.inert=!expanded;rail.toggleAttribute('inert',!expanded);rail.setAttribute('aria-hidden',String(!expanded));if(!expanded){if(rail.contains(document.activeElement)){const toggle=root.querySelector('[data-action="navigation-toggle"]');if(toggle){toggle.disabled=false;toggle.focus({preventScroll:true});}}const reduced=!wasReady||navigationMotion?.matches||!pref().animations;if(reduced)rail.hidden=true;else navigationHideTimer=setTimeout(()=>{if(rail.isConnected&&root.querySelector('.nav-shell')?.dataset.courseCollapsed==='true')rail.hidden=true;},210);}}root.querySelector('#main-content')?.toggleAttribute('inert',overlay);
 const edge=courseRailEdge(rail,shell);shell.dataset.courseRailEdge=edge;
 root.querySelectorAll('[data-action="navigation-toggle"]').forEach(b=>updateCourseToggle(b,{expanded,edge}));
 const backdrop=root.querySelector('[data-action="navigation-close"]');if(backdrop)backdrop.hidden=!overlay;
}
function persistNavigationChoices(prefs){try{localStorage.setItem('hebleo-navigation-'+state.user,JSON.stringify(prefs));}catch{}}
function closeNavigation(){state.navDrawer=null;applyNavigation();}
function toggleNavigation(which){if(which!=='course')return;const prefs=navigationChoices();if((window.innerWidth||1280)<960)state.navDrawer=state.navDrawer==='course'?null:'course';else{prefs.course=!prefs.course;persistNavigationChoices(prefs);}applyNavigation();if(state.navDrawer){window.HebleoKeyboard?.close();root.querySelector('#course-navigation summary, #course-navigation button')?.focus();}}
function navigationControlVisible(el){if(el.closest('[hidden]'))return false;const closed=[];for(let parent=el.parentElement;parent;parent=parent.parentElement)if(parent.tagName==='DETAILS'&&!parent.open)closed.push(parent);return !closed.length||closed.length===1&&el.tagName==='SUMMARY'&&el.parentElement===closed[0];}

function segmented(items, selected, action, label) { return '<div class="segmented" role="group" aria-label="'+esc(label)+'">'+items.map(([value,text])=>'<button data-action="'+action+'" data-value="'+esc(value)+'" aria-pressed="'+(value===selected)+'" class="'+(value===selected?'active':'')+'">'+esc(text)+'</button>').join('')+'</div>'; }
function modeControl() { return '<div><span class="control-label">Exercise Nikkud (vowel marks)</span>'+segmented([['curated','Lesson-authored Nikkud'],['full','With Nikkud'],['none','Without Nikkud']],pref().nikkud,'mode','Exercise Nikkud')+'</div>'; }
function rememberComposers(){
  document.querySelectorAll('[data-lesson-comment]').forEach(rememberComment);
  root.querySelectorAll('[data-question-answer]').forEach(f=>{state.replyDrafts[f.dataset.questionAnswer]=f.querySelector('[name=answer]').value;state.replyOpen[f.dataset.questionAnswer]=Boolean(f.closest('details')?.open);});
}
function applyStudioTask(){
  if(state.page!=='studio')return;
  const task=state.studioTask;
  root.querySelectorAll('[data-studio-pane]').forEach(el=>{el.hidden=!el.dataset.studioPane.split(' ').includes(task);});
  root.querySelectorAll('.studio-task-menu [data-action="studio-task"]').forEach(el=>{const selected=el.dataset.value===task;el.setAttribute('aria-current',selected?'page':'false');el.setAttribute('aria-selected',String(selected));el.tabIndex=selected?0:-1;});
  root.querySelectorAll('[data-studio-pane]').forEach(el=>{el.setAttribute('role','tabpanel');el.setAttribute('aria-labelledby','studio-tab-'+task);});
  const unified=root.querySelector('#unified-studio-mount');
  unified?.querySelectorAll('[data-curriculum-editor],[data-lesson-workspace]').forEach(el=>{el.hidden=task!=='lesson';});
  unified?.querySelectorAll('.studio-source-browser,[data-review-policy-form]').forEach(el=>{el.hidden=task!=='vocabulary';if(el.matches('details')&&task==='vocabulary')el.open=true;});
  root.querySelector('[data-action="studio-save"]').hidden=!['lesson','vocabulary'].includes(task);
}
function pageStudioLists(){
  for(const [selector,title] of [['.revision-row','Version history'],['.report-item','Learner reports']]){
    const rows=[...root.querySelectorAll(selector)];if(rows.length<=20)continue;
    const nav=document.createElement('nav');nav.className='button-row';nav.setAttribute('aria-label',title+' pages');let page=0;
    const draw=()=>{rows.forEach((row,i)=>{row.hidden=i<page*20||i>=(page+1)*20;});nav.replaceChildren();const prev=document.createElement('button'),next=document.createElement('button'),label=document.createElement('span');prev.textContent='Previous';next.textContent='Next';prev.type=next.type='button';prev.className=next.className='button small outline';prev.disabled=page===0;next.disabled=(page+1)*20>=rows.length;label.textContent=title+' · Page '+(page+1)+' of '+Math.ceil(rows.length/20);prev.onclick=()=>{page--;draw();};next.onclick=()=>{page++;draw();};nav.append(prev,label,next);};rows[0].before(nav);draw();
  }
}
function refreshComments(){rememberComposers();for(const area of document.querySelectorAll('[data-comment-feed]')){const panel=area.closest('#context-panel');area.innerHTML=questionList(panel?false:state.data.canAuthor,panel?state.panel?.context?.lessonId:state.page==='studio'?state.authorLessonId:state.lessonId);bind(area);}}
function render() {
  if(!state.data)return;
  practiceHelpBinding?.destroy();practiceHelpBinding=null;
  conjugationMount?.destroy();conjugationMount=null;
  reviewRevealPending=null;sharedFrame?.dispose();sharedFrame=null;
  inlineAuthor?.dispose();inlineAuthor=null;
  disposeTextReaders();
  exerciseDockBinding?.destroy();exerciseDockBinding=null;
  reminderBinding?.destroy();reminderBinding=null;
  rememberComposers();rememberNote();if(studioWorkspace&&state.page==='studio'&&studioWorkspace.owner===state.user){for(const node of studioWorkspace.nodes)node.remove();}else disposeStudioMounts();if(rehearsal&&state.page!=='studio'&&!inlineActive())endRehearsal();
  returnKeyboard();document.querySelector('#context-panel')?.remove();
  const pages={home,course,lesson,review,library,conjugation,studio,settings};const u=state.data.users.find(u=>u.id===state.user);
  if(state.page==='studio'&&!state.data.canAuthor)state.page='home';
  document.title='Hebleo · '+({home:'Your path',course:'Course',lesson:lessonObject()?.title||'Lesson',review:'Flashcards',library:'My Hebrew',conjugation:'Conjugation practice',studio:'Content Studio',settings:'Settings'}[state.page]||'Your path');
  const hasCourse=['lesson','course'].includes(state.page),courseLesson=hasCourse?(content().lessons.find(l=>l.id===state.lessonId)||orderedLessons(content())[0]):null;
  root.innerHTML='<a class="skip-link" href="#main-content" data-action="skip-content">Skip to content</a><header class="app-header" aria-label="Hebleo navigation">'+(hasCourse?navigationToggle():'')+'<a class="brand" href="#home" data-action="page" data-value="home" aria-label="Hebleo home"><span class="brand-logo-slot" aria-hidden="true"><img src="/assets/hebleo-wide-navy.png" alt="" width="3693" height="1198"></span></a><nav id="main-menu" class="nav main-navigation" aria-label="Main navigation">'+nav()+'</nav><div class="profile"><span class="demo-pill">DEMO CONTENT</span><label class="profile-control"><span>Demo profile</span><select id="demo-user" aria-label="Demo profile">'+state.data.users.map(x=>'<option value="'+x.id+'" '+(x.id===state.user?'selected':'')+'>'+esc(x.name)+' · '+esc(x.role)+'</option>').join('')+'</select></label></div></header><div class="shell nav-shell page-'+state.page+' '+(hasCourse?'has-course ':'')+(!pref().animations?'reduce-motion':'')+'">'+(hasCourse?courseNavigation(courseLesson):'')+'<main class="main" id="main-content" tabindex="-1"><div class="topbar"><div class="breadcrumb">Your Hebrew / '+esc({home:'Your path',course:'Foundations',lesson:label(state.step),review:'Flashcards',library:'My Hebrew',conjugation:'Conjugation practice',studio:'Author workspace',settings:'Settings'}[state.page])+'</div></div><div class="content">'+pages[state.page]()+'</div></main><button type="button" class="nav-backdrop" data-action="navigation-close" aria-label="Close course outline" hidden></button></div>';

  applyNavigation();bind();
  if(state.page==='review')practiceHelpBinding=bindPracticeHelp(root,{platform:'native'});
  if(state.page==='conjugation')conjugationMount=mountNativeConjugation(root.querySelector('[data-native-conjugation]'),{api,userId:state.user});
  const cardFrame=root.querySelector('[data-shared-review]');if(cardFrame)sharedFrame=mountSharedReview(cardFrame,{api,user:state.user,onError:error=>toast(error.message),onShortcut:reviewKey});mountLessonTextReaders();mountInlineLesson();if(state.page==='lesson'&&state.data.canAuthor){const owner=state.user,id=state.lessonId,control=root.querySelector('[data-action=author-comments]');if(control)api('studio/author-comments?'+new URLSearchParams({lessonId:id,limit:1})).then(r=>{if(control.isConnected&&state.user===owner&&state.lessonId===id)control.textContent='Author comments ('+r.total+')';},()=>{if(control.isConnected)control.textContent='Author comments · unavailable';});}if(state.page==='lesson')extraInformationBinding=bindExtraInformation(root,portionLesson(lessonObject(),state.step),renderLesson);syncLessonTextGates();exerciseDockBinding=state.page==='lesson'&&currentKind()==='learn'&&root.querySelector('[data-text-reader]')?null:mountExerciseDock(root.querySelector('#practice'));if(state.page==='studio'&&state.studio)mountStudioEditors();applyStudioTask();if(state.page==='studio'){pageStudioLists();if(state.studioTask==='comments')mountStudioPrivateComments();}syncKeyboard();if(state.panel)showPanel();if(state.page==='review')reviewPendingStatus();
}
function conjugation(){return '<link rel="stylesheet" href="/conjugation/practice.css"><section data-native-conjugation></section>';}
function lessonStarted(id) { const l=state.data.learner; return Boolean(l.resumes[id] || l.attempts.some(a=>a.lessonId===id)); }
function lessonCards() {
  return orderedLessons(state.data.content).map((l,i)=>'<article class="card lesson-card"><div class="lesson-number '+(state.data.learner.completed.includes(l.id)?'done':'')+'">'+(state.data.learner.completed.includes(l.id)?'✓':i+1)+'</div><div class="lesson-copy"><h3>'+esc(l.title)+'</h3><p>'+esc(chapterName(content(),l.id))+' · '+l.minutes+' min</p></div>'+button(state.data.learner.completed.includes(l.id)?'Revisit':lessonStarted(l.id)?'Continue →':'Start →','lesson','small '+(l.id===continueLesson()?.id?'primary':'secondary'),l.id)+(l.exerciseIds.length?button('Practice lesson questions','lesson-practice','small outline',l.id):'')+'</article>').join('');
}
function home() {
  const {learner,due,content:c}=state.data,l=continueLesson(),position=l&&learner.resumes[l.id];
  return '<div class="intro-row"><div><div class="eyebrow">YOUR PATH</div><h1 tabindex="-1">Welcome back, '+esc(state.data.users.find(u=>u.id===state.user).name)+'.</h1><p>A short lesson. A useful connection.</p></div></div><section class="hero"><div class="hero-copy"><div class="eyebrow">'+(l?'YOUR NEXT STEP':'COURSE COMPLETE')+'</div><h2>'+(l?esc(l.title):'Keep your Hebrew growing.')+'</h2><p>'+(l?esc(l.chapter)+' · '+esc(stepLabels[position?.step || lessonSteps(l)[0]]):'Revisit a lesson or start your scheduled review.')+'</p>'+(l?button((lessonStarted(l.id)?'Continue':'Start')+' · '+esc(stepLabels[position?.step || lessonSteps(l)[0]])+' →','lesson','light',l.id):button('Open review →','page','light','review'))+'</div></section><div class="grid-2"><article class="card"><h2>Your course</h2><p>'+learner.completed.length+' / '+c.lessons.length+' lessons complete</p><progress max="'+c.lessons.length+'" value="'+learner.completed.length+'" aria-label="Course completion"></progress></article><article class="card"><h2>'+due.length+' cards due</h2><p>Bring familiar words back into focus.</p>'+button('Start review →','page','secondary','review')+'</article></div><div class="section-heading"><h2>Your course</h2></div><div class="lesson-list">'+lessonCards()+'</div>';
}
function course() {
 const item=l=>'<div class="chapter-lesson"><strong>'+esc(l.title)+'</strong><span class="tag">'+(state.data.learner.completed.includes(l.id)?'Complete':lessonStarted(l.id)?'In progress':'Not started')+'</span>'+button(state.data.learner.completed.includes(l.id)?'Revisit':lessonStarted(l.id)?'Continue →':'Start →','lesson','small secondary',l.id)+(l.exerciseIds.length?button('Practice lesson questions','lesson-practice','small outline',l.id):'')+'</div>';
 return '<div class="eyebrow">FOUNDATIONS</div><h1 tabindex="-1">Your course.</h1><p>Choose a lesson or return to your saved place.</p>'+courseOutline(state.data.content).map(g=>g.kind==='chapter'?'<details class="card course-chapter" open><summary>'+esc(g.title)+'</summary>'+g.lessons.map(item).join('')+'</details>':'<section class="card">'+item(g.lesson)+'</section>').join('');
}
function personalNote(w,editable=true){const note=state.data.learner.notes[w.id];return '<div class="personal-note-summary"><strong>Your private note</strong>'+(note?'<p>'+esc(note)+'</p>':'<p>No personal note yet.</p>')+(editable?button(note?'Edit your note':'Add your note','note-open','small outline',w.id):'')+'</div>';}
function vocabulary(w,notes=true) {
  return wordCard(w,{notes,privateNote:personalNote(w,false),before:'<button class="bookmark '+(state.data.learner.bookmarks.includes(w.id)?'saved':'')+'" data-action="bookmark" data-value="'+w.id+'" aria-label="Bookmark '+esc(w.english)+'">'+(state.data.learner.bookmarks.includes(w.id)?'★':'☆')+'</button>',after:button(state.data.learner.cards[w.id]?'In your review':'+ Add to review','enroll','small secondary',w.id)+personalNote(w)});
}
function personalVocabularyTable(words){const table=document.createElement('div');table.innerHTML=vocabularyTable(words);const head=document.createElement('th');head.scope='col';head.textContent='Your private note';table.querySelector('thead tr').lastElementChild.before(head);for(const [i,row]of [...table.querySelectorAll('tbody tr')].entries()){const td=document.createElement('td');td.innerHTML=personalNote(words[i]);row.lastElementChild.before(td);}return table.innerHTML;}
function vocabularyView(words,notes=true) {
  const lexical=content().lexicalView;
  if(lexical){const sourceLink=state.data?.content?.sourceView?'<p><a href="#library">Browse the original course’s authored vocabulary</a></p>':'';const managed=new Set(lexical.managedRuntimeIds||lexical.rows.map(w=>w.runtimeId).filter(Boolean));const legacy=words.filter(w=>!managed.has(w.id)&&!w.noVocab);return sourceLink+renderLexicalVocabulary(lexical.rows,{idPrefix:'lesson-'+lexical.lessonId})+(lexical.total>50?'<p>'+lexical.total+' available words · 50 per page</p><div class="button-row">'+button('Previous words','lexical-page','small outline',Math.max(0,lexical.offset-50),lexical.offset===0)+button('Next words','lexical-page','small outline',lexical.offset+50,lexical.offset+50>=lexical.total)+'</div>':'')+(legacy.length?'<details><summary>Existing vocabulary entries</summary>'+personalVocabularyTable(legacy)+'</details>':'');}
  words=words.filter(w=>!w.noVocab);
  const controls=segmented([['cards','Cards'],['table','Table']],pref().vocabularyView,'vocab-view','Vocabulary view');
  if(pref().vocabularyView==='cards')return '<section class="vocabulary-surface" data-audio-surface><div class="mode-bar"><span>Fully pointed Hebrew</span>'+controls+'</div><div class="word-grid">'+words.map(w=>vocabulary(w,notes)).join('')+'</div></section>';
  return '<section class="vocabulary-surface" data-audio-surface><div class="mode-bar"><span>All source fields</span>'+controls+'</div>'+personalVocabularyTable(words)+'</section>';
}
function learnBody(l,conceptTime) {
  l=portionLesson(l,state.step);
  const hasText=Boolean(l.explanation?.trim())||hasTextPages(l),video=audioURL(l.video),mode=video&&hasText?state.medium:video?'watch':'read';
  return (video&&hasText?'<div class="mode-bar"><h2>Your explanation</h2>'+segmented([['watch','Watch'],['read','Read']],mode,'medium','Lesson format')+'</div>':'')+learnMedia(l,mode,renderLesson,conceptTime)+extraInformationControl(l);
}
function courseNavigation(l) {
 const item=x=>'<details '+(x.id===l.id?'open':'')+'><summary>'+esc(x.title)+(state.data.learner.completed.includes(x.id)?' ✓':'')+'</summary>'+lessonPortions(content(),x).map(p=>'<button data-action="outline" data-value="'+x.id+'|'+p.key+'" class="outline-step '+(x.id===l.id&&state.step===p.key?'active':'')+'" '+(x.id===l.id&&state.step===p.key?'aria-current="step"':'')+'>'+esc(portionLabel(x,p.key))+'</button>').join('')+'</details>';
 return '<aside id="course-navigation" class="course-navigation" aria-label="Course navigation"><header class="rail-header"><h2>Course outline</h2></header><div class="course-rail-body"><h3>Foundations</h3><p>'+state.data.learner.completed.length+' of '+content().lessons.length+' lessons complete</p><div class="course-outline-content">'+courseOutline(content()).map(g=>g.kind==='chapter'?'<details open><summary>'+esc(g.title)+'</summary>'+g.lessons.map(item).join('')+'</details>':item(g.lesson)).join('')+'</div><small>Answers and your place are saved.</small></div></aside>';

}
function lesson() {
  const l=lessonObject(),steps=portionKeys(l);let body;
  if(currentKind()==='learn')body=learnBody(l);
  else if(currentKind()==='vocabulary'){const block=l.blocks.find(b=>l.compositionVersion===2?b.id===state.step:b.type==='vocabulary');body='<h2>Your building blocks</h2>'+vocabularyView(l.compositionVersion===2?resolveComponent(content(),l,block):resolveBlock(content(),l,block),block.options?.showNotes!==false);}
  else if(state.step==='complete')body=completion(l);
  else body=exercisePanel(l);
  if(inlineActive())body='<div data-inline-author-mount></div>';
  const index=steps.indexOf(state.step),isExercise=['check','apply'].includes(currentKind());
  if(state.session.revisionId!==state.data.revisionId)body='<div class="hint">This saved session uses an earlier lesson. Starting the updated lesson resets this lesson’s current answers; your graded attempts and review progress remain. '+button('Start updated lesson','latest-lesson','small secondary')+'</div>'+body;
  return '<div class="intro-row"><div><div class="eyebrow">'+esc(l.chapter)+'</div><h1 tabindex="-1">'+esc(l.title)+'</h1><p>'+esc(label(state.step))+' · Step '+(index+1)+' of '+steps.length+'</p></div>'+(state.data.canAuthor?'<div class="button-row">'+button(inlineActive()?'Return to learning':'Edit lesson',inlineActive()?'author-exit':'author-inline','small outline')+(!inlineActive()?button('Author comments','author-comments','small outline'):'')+'</div>':'')+button('← Course','page','outline small','course')+'</div><div class="lesson-layout lesson-content-region"><div class="lesson-content"><nav class="step-strip" '+(inlineActive()?'hidden':'')+' aria-label="Lesson portions">'+steps.map(s=>'<button data-action="step" data-value="'+s+'" class="'+(s===state.step?'active':'')+'" '+(s===state.step?'aria-current="step"':'')+'>'+esc(portionLabel(l,s))+'</button>').join('')+'</nav>'+lessonProgressBar(l)+'<section class="card lesson-section" data-portion-kind="'+esc(currentKind())+'" id="practice">'+body+'</section>'+(!inlineActive()&&!isExercise&&state.step!=='complete'&&!(currentKind()==='learn'&&ownsTextNavigation(portionLesson(l,state.step)))?'<div class="lesson-footer">'+button('← Back','step','outline',steps[index-1]||'',index===0)+button('Continue →','step','primary',steps[index+1]).replace('<button','<button data-text-gated-continue')+textGateNotice()+'</div>':'')+'</div></div><section class="lesson-comments card" id="lesson-comments"><header><h2>Discussion under this lesson</h2><p>Share a question or comment. Author replies appear here.</p></header>'+commentComposer({lessonId:l.id,revisionId:state.session.revisionId})+'<div data-comment-feed>'+questionList(state.data.canAuthor,l.id)+'</div></section>';
}
function completion(l) {
  const completed=state.data.learner.completed.includes(l.id),next=followingLesson(content(),l.id),missed=questionProgress(l).missedIds;
  const onward=next?button('Next lesson →','lesson','primary',next.id):button(completed?'Course complete →':'Return to course →','page','primary','course');
  return '<div class="empty '+(completed&&pref().animations?'celebrate':'')+'"><div class="empty-symbol" aria-hidden="true">'+(completed?'✓':'↻')+'</div><h2>'+(completed?'Lesson complete.':'You finished this set.')+'</h2><p>'+(completed?'A new connection made.':'Some core questions still need a correct answer. Extra practice is optional; you can continue and return later.')+'</p><div class="button-row centered completion-navigation">'+onward+(l.exerciseIds.length?button('Practice more','target-practice','secondary'):'')+'</div>'+(missed.length?'<div class="missed-questions"><h3>Retry a missed question</h3><div class="retry-list">'+missed.map(id=>button('Question '+(l.exerciseIds.indexOf(id)+1)+': '+esc(content().exercises.find(e=>e.id===id).prompt),'retry-question','small outline',id)).join('')+'</div></div>':'')+'<p>Your answers are saved. This session is not a mastery assessment.</p></div>';
}
function keyboard(){return '<div class="keyboard-tools">'+button('Open Hebrew keyboard','keyboard-open','small secondary')+'</div>';}
function questionPrimary(l=lessonObject()){
 const ids=portionExercises(content(),l,state.step,state.practiceIds);
 const phase=answerPhase;
 if(phase==='approving')return button('Saving approval…','pending-answer','primary','',true);
 if(phase==='approval-error'&&pendingApproval)return button('Retry saving approval','self-approve','primary');
 if(phase==='checking'||phase==='saving'||phase==='advancing')return button(phase==='checking'?'Checking…':phase==='saving'?'Saving position…':'Continuing…','pending-answer','primary','',true);
 if(phase==='save-error')return button('Retry saving position','save-answer-position','primary');
 if(phase==='advance-error')return button('Retry continuing','retry-continuing','primary');
 if(phase==='uncertain')return button('Retry checking answer','recover-attempt','primary');
 return state.result?button(state.question+1===ids.length?'Continue →':'Next question →','next-question','primary'):button('Check answer','check','primary').replace('<button','<button data-keyboard-preserve');
}
function updateQuestionPrimary(){
 const scope=root.querySelector('#practice'),host=scope?.querySelector('[data-primary-action]');
 if(host){
  const focused=host.contains(document.activeElement);host.innerHTML=questionPrimary();bind(host);
  const pending=scope.querySelector('[data-answer-pending]'),message={checking:'Checking…',saving:'Saving position…',advancing:'Continuing…'}[answerPhase]||'';
  if(pending&&pending.textContent!==message)pending.textContent=message;
  const input=scope.querySelector('[data-exercise-input]');if(answerPhase==='checking')input?.setAttribute('aria-busy','true');else input?.removeAttribute('aria-busy');
  if(focused||['uncertain','save-error','advance-error'].includes(answerPhase)&&document.activeElement===document.body)scope.querySelector('[data-answer-commit]')?.focus({preventScroll:true});
 }
 exerciseDockBinding?.refresh?.();
}
function questionSupport(e,allowed){return (state.result&&!state.result.correct?button('Try this question again','retry-question','exercise-quiet',e.id):'')+(allowed?button('Vocabulary help','exercise-lookup','exercise-quiet'):'')+(state.result?button('Report a problem','report-open','exercise-quiet'):'');}
function exercisePanel(l) {
 const ids=portionExercises(content(),l,state.step,state.practiceIds),e=currentExercise();
 if(!e)return '<h2>That portion is finished.</h2>'+button('Continue →','step','primary',portionKeys(l)[portionKeys(l).indexOf(state.step)+1]);
 const mode=e.nikkudOverride||pref().nikkud,input=exerciseInput(e,{mode,word,draft:answerDraft(),result:state.result,keyboard:''}),back=portionKeys(l)[portionKeys(l).indexOf(state.step)-1];
 return '<div class="exercise-question-header"><div class="mode-bar"><span class="tag">Question '+(state.question+1)+' of '+ids.length+'</span>'+(e.nikkudOverride?'<span class="tag">Nikkud: '+esc({full:'With Nikkud',none:'Without Nikkud',curated:'Lesson-authored Nikkud'}[e.nikkudOverride])+'</span>':'')+'</div>'+button('Review this concept','concept','exercise-quiet').replace('<button','<button data-keyboard-preserve aria-expanded="false" aria-controls="inline-concept"')+'</div><p class="exercise-prompt">'+exerciseSurface(e.prompt,'prompt')+'</p><div data-concept-slot></div><div data-exercise-input>'+input+'</div>'
 +(!state.result&&['typing','cloze','transformation'].includes(e.type)?keyboard():'')
 +'<p class="sr-only" data-answer-pending role="status" aria-live="polite" aria-atomic="true"></p><div class="answer-commit" data-answer-commit tabindex="-1" aria-label="Answer result"><span data-answer-status>'+exerciseFeedback(e,state.result)+'</span></div><div data-answer-recovery></div>'
 +'<div class="exercise-support">'+questionSupport(e,e.allowLookup||Boolean(state.result))+'</div>'
 +exerciseActionDock(questionPrimary(l),button('← Back','step','exercise-quiet',back||'',!back),state.practiceIds.length?button('Skip extra practice','step','exercise-quiet','complete'):'');
}
function reviewWord() { return state.reviewSession ? state.data.content.words.find(w=>w.id===state.reviewSession.ids[state.reviewSession.index])||state.data.due.find(c=>c.word.id===state.reviewSession.ids[state.reviewSession.index])?.word : null; }
function voiceControls(w) {return '<details class="voice-comparison pronunciation-practice" data-pronunciation-word="'+esc(w.id)+'" '+(state.recording!=='empty'?'open':'')+'><summary>Pronunciation practice · Record yourself and compare</summary><div class="pronunciation-word">'+wordText(w)+' · '+esc(w.english)+'</div><p>'+ (audioURL(w.audio)?w.audio?.kind==='synthetic-demo'?'The linked demo sound is nonlinguistic, not a pronunciation model.':'Use the linked Play control to compare with the source recording.':'No reference recording is linked for comparison.')+'</p><p>Your recording stays in this tab and is cleared when you leave this item. Maximum 60 seconds. Recording is optional and ungraded; microphone permission is requested only when you choose Record.</p><div class="toolbar">'+button(state.recording==='recording'?'Recording…':'Record yourself','record','small secondary',w.id,state.recording==='recording')+button('Stop recording','record-stop','small outline',w.id,state.recording!=='recording')+button('Play my recording','voice-replay','small outline',w.id,state.recording!=='ready')+'</div><p data-recording-status role="status">'+esc(state.recording==='recording'?'Recording locally…':state.recording==='ready'?'Your local recording is ready.':'')+'</p></details>';}
function updateVoiceStatus(){for(const section of document.querySelectorAll('[data-pronunciation-word]')){section.open=true;const record=section.querySelector('[data-action="record"]'),stop=section.querySelector('[data-action="record-stop"]'),play=section.querySelector('[data-action="voice-replay"]');record.textContent=state.recording==='recording'?'Recording…':'Record yourself';record.disabled=state.recording==='recording';stop.disabled=state.recording!=='recording';play.disabled=state.recording!=='ready';section.querySelector('[data-recording-status]').textContent=state.recording==='recording'?'Recording locally…':state.recording==='ready'?'Your local recording is ready.':'';}}

function review(){return helpControl('flashcards')+reviewContent()+(!state.reviewSession?heatmapHTML(state.data.reviewActivity):'');}
function reviewContent() {
  const undo=(state.data.learner.lastReview||reviewSave?.snapshot().overlays.length||reviewSave?.snapshot().pending.length)?button('Undo last rating','review-undo','small outline'):'',session=state.reviewSession,w=reviewWord();
  if(!session)return '<div class="eyebrow">A SHORT RETURN TO FAMILIAR WORDS</div><h1 tabindex="-1">Your review.</h1><section class="card"><h2>'+state.data.due.length+' cards due</h2><label for="review-limit">Cards in this session</label><input id="review-limit" type="number" min="1" max="100" value="'+pref().reviewLimit+'"><label for="review-type">Card presentation</label><select id="review-type">'+[['recognition','Hebrew → meaning'],['translation','English → Hebrew'],['listening','Listening first'],['sentence','Sentence context']].map(([v,l])=>'<option value="'+v+'" '+(pref().reviewType===v?'selected':'')+'>'+l+'</option>').join('')+'</select>'+reviewNikkudControl()+(!state.data.due.length?'<p>'+(!Object.keys(state.data.learner.cards).length?'Your review deck is empty. Add a word from a lesson or My Hebrew.':'No cards are due yet. They will return on their scheduled date.')+'</p>'+((state.data.content.provenance?.kind==='synthetic-demo'&&!Object.keys(state.data.learner.cards).length)?button('Add 3 synthetic demo words to review','review-demo','secondary'):''):'')+'<div class="button-row">'+button('Start review','review-start','primary','',!state.data.due.length)+undo+'</div><p>Listening and sentence cards appear when their source media or examples are available. These are initial presentation options; final card pedagogy remains to be defined.</p></section>';
  if(!w)return '<h1 tabindex="-1">Review finished.</h1><section class="card empty"><h2>You reviewed '+session.ratings.length+' cards.</h2><div class="button-row centered">'+button('Continue learning','lesson','primary',continueLesson()?.id||state.data.content.lessons[0].id)+button('Review overview','review-end','secondary')+undo+'</div></section>';
  if(w?.shared)return sharedReview(w,undo,session);
  const frontMode=reviewNikkud(state.data.content,pref().reviewNikkud),type=session.type,example=w.examples?.[0],sentence=typeof example==='string'?example:example?.hebrew;
  return '<h1 tabindex="-1">Your review.</h1><section class="review-surface" data-audio-surface><div class="review-reference">'+audioControls(w.audio,w.english)+'</div><p>Card '+(session.index+1)+' of '+session.ids.length+'</p><article class="card review-card"><span class="tag">'+esc({recognition:'HEBREW → MEANING',translation:'ENGLISH → HEBREW',listening:'LISTENING FIRST',sentence:'SENTENCE CONTEXT'}[type])+'</span><div class="card-side-label">'+(state.revealReview?'ANSWER':'QUESTION')+'</div>'+(state.revealReview?'<div class="hebrew">'+wordText(w)+'</div><div class="review-meaning">'+esc(w.english)+'</div><p>'+esc(w.notes)+'</p>'+'<details><summary>Full entry</summary>'+richFields(w)+'</details>'+'<div class="review-ratings">'+[['Again',1],['Hard',2],['Good',3],['Easy',4]].map(([label,rating])=>button('<span class="rating-label">'+label+'</span> <span class="rating-interval">'+reviewIntervalLabel(scheduleReview(state.data.learner.cards[w.id],rating,state.data.reviewClock).delayMs)+'</span>','review-rate',rating===3?'primary':'secondary',rating)).join('')+'</div>':(type==='listening'?'':type==='translation'?'<div class="review-meaning">'+esc(w.english)+'</div>':type==='sentence'?'<div class="hebrew">'+esc(frontMode==='none'?sentence?.replace(/[\u0591-\u05c7]/g,''):sentence)+'</div>':'<div class="hebrew">'+wordText(w,frontMode)+'</div>')+button('Show answer','review-reveal','primary'))+'</article>'+voiceControls(w)+'<div class="toolbar centered">'+undo+button('Finish session','review-end','small outline')+'</div></section>';
}
function scheduleLexicalLibrary(delay=300){if(state.libraryMode==='source'&&state.data.content.sourceView){clearTimeout(lexicalSearchTimer);lexicalRequest++;lexicalSearchTimer=setTimeout(()=>refreshSourceLibrary(),delay);return;}clearTimeout(lexicalSearchTimer);lexicalRequest++;if(state.data.content.lexicalView)lexicalSearchTimer=setTimeout(()=>refreshLexicalLibrary(),delay);}
async function refreshLexicalLibrary(offset=0){
 const c=state.data.content,view=c.lexicalView;if(!view||state.page!=='library')return;
 const request=++lexicalRequest,owner=state.user;lexicalLoading=true;lexicalError='';const status=root.querySelector('.lexical-library-status');if(status)status.textContent='Updating lexical words…';
 try{const query=new URLSearchParams({lessonId:state.libraryLesson||view.lessonId,offset:String(offset),search:state.search,tag:state.libraryTag,usedLessonId:state.libraryLesson,learningState:state.libraryState});const result=await api('lexical?'+query,undefined,owner);if(request!==lexicalRequest||owner!==state.user||c!==state.data.content||state.page!=='library')return;c.lexicalView=result;}
 catch(error){if(request===lexicalRequest&&owner===state.user)lexicalError='Lexical search could not refresh: '+error.message;}
 finally{if(request===lexicalRequest&&owner===state.user&&c===state.data.content&&state.page==='library'){lexicalLoading=false;const focused=document.activeElement?.id==='library-search',start=focused?document.activeElement.selectionStart:null,end=focused?document.activeElement.selectionEnd:null;render();if(focused){const input=root.querySelector('#library-search');input.focus();input.setSelectionRange(start,end);}}}
}
async function refreshSourceLibrary(offset=0){
 const c=state.data.content;if(!c.sourceView||state.page!=='library')return;
 const request=++lexicalRequest,owner=state.user;lexicalLoading=true;lexicalError='';const status=root.querySelector('.lexical-library-status');if(status)status.textContent='Updating source vocabulary…';
 try{const query=new URLSearchParams({offset:String(offset),search:state.search,category:state.sourceCategory,sourceLesson:state.sourceLesson});const result=await api('source-vocabulary?'+query,undefined,owner);if(request!==lexicalRequest||owner!==state.user||c!==state.data.content||state.libraryMode!=='source')return;c.sourceView=result;}
 catch(error){if(request===lexicalRequest&&owner===state.user)lexicalError='Source vocabulary could not refresh: '+error.message;}
 finally{if(request===lexicalRequest&&owner===state.user&&c===state.data.content&&state.page==='library'){lexicalLoading=false;const focused=document.activeElement?.id==='library-search',start=focused?document.activeElement.selectionStart:null;render();if(focused){const input=root.querySelector('#library-search');input.focus();input.setSelectionRange(start,start);}}}
}
function sourceLibrary(){
 const view=state.data.content.sourceView;
 const select=(id,title,values,value)=>'<label for="'+id+'">'+title+'<select id="'+id+'"><option value="">All</option>'+values.map(v=>'<option value="'+esc(v)+'" '+(v===value?'selected':'')+'>'+esc(v)+'</option>').join('')+'</select></label>';
 return '<h1 tabindex="-1">Vocabulary.</h1>'+libraryModes()+'<p class="source-vocabulary-heading">Browse Guy’s authored vocabulary from the original course. Original Lesson and Part labels are preserved. Browsing does not mark words as learned or add them to review.</p><div class="library-filters"><label class="library-search-label" for="library-search">Search vocabulary<div class="search-control"><input id="library-search" class="search-input" type="search" placeholder="Hebrew, English, root, pattern, notes, or source ID…" value="'+esc(state.search)+'">'+(state.search?button('Clear','library-clear','small outline'):'')+'</div></label><div class="library-filter-selects">'+select('source-category','Category',['Nouns','Adjectives','Verbs','Prepositions','Other'],state.sourceCategory)+select('source-lesson','Original lesson',view.sourceLessons,state.sourceLesson)+'</div></div><p class="lexical-library-status" role="status" tabindex="-1">'+(lexicalLoading?'Updating source vocabulary…':lexicalError?esc(lexicalError):view.total+' source '+(view.total===1?'word':'words')+' · '+(view.total?view.offset+1:0)+'–'+Math.min(view.offset+view.limit,view.total))+'</p>'+renderLexicalVocabulary(view.rows,{idPrefix:'source-library'})+'<div class="button-row">'+button('Previous words','source-page','small outline',Math.max(0,view.offset-view.limit),view.offset===0||lexicalLoading)+button('Next words','source-page','small outline',view.offset+view.limit,view.offset+view.limit>=view.total||lexicalLoading)+'</div>';
}
function sharedReview(w,undo,session){
 const ratings=[['Again',1],['Hard',2],['Good',3],['Easy',4]].map(([label,rating])=>button(label+' · '+reviewIntervalLabel(scheduleReview(state.data.learner.cards[w.id],rating,state.data.reviewClock).delayMs),'review-rate',rating===3?'primary':'secondary',rating)).join('');
 return '<h1 tabindex="-1">Your review.</h1><p>Card '+(session.index+1)+' of '+session.ids.length+'</p><iframe title="Hebleo vocabulary card" data-shared-review data-card-id="'+esc(w.id)+'" data-face="'+(state.revealReview?'back':'front')+'" sandbox="allow-scripts"></iframe><div class="review-primary">'+(state.revealReview?ratings:button('Show answer','review-reveal','primary'))+'</div><div class="review-secondary">'+undo+button('Finish session','review-end','small outline')+'</div><p data-review-save-status role="status"></p>';
}
function sharedLibrary(){
 const view=state.sharedView||{rows:[],total:0,offset:0,limit:25};
 return '<h1 tabindex="-1">Shared vocabulary.</h1>'+libraryModes()+'<p>Approved Anki vocabulary. Choose each review direction explicitly.</p><label for="shared-search">Search vocabulary</label><input id="shared-search" type="search" value="'+esc(state.sharedSearch||'')+'">'+button('Search','shared-search','secondary')+'<p role="status">'+view.total+' entries · '+(view.total?view.offset+1:0)+'–'+Math.min(view.offset+view.limit,view.total)+'</p>'+view.rows.map(n=>'<section class="card"><h2 dir="auto">'+esc(n.hebrew)+'</h2><p>'+esc(n.english)+'</p><p>'+esc(n.sourceId)+'</p><div class="button-row">'+n.directions.map(d=>button(d.enrolled?'In review · '+d.direction:'Add '+(d.direction==='he-en'?'Hebrew → English':'English → Hebrew'),'enroll','small secondary',d.id,d.enrolled)).join('')+'</div></section>').join('')+'<div class="button-row">'+button('Previous','shared-page','secondary',view.offset-view.limit,view.offset===0)+button('Next','shared-page','secondary',view.offset+view.limit,view.offset+view.limit>=view.total)+'</div>';
}
function libraryModes(){return '<div class="button-row">'+button('Conjugation practice','page','small outline','conjugation')+'</div>'+ ((state.data.content.sourceView||state.data.sharedCollection)?'<div class="button-row vocabulary-collection" role="group" aria-label="Vocabulary collection">'+[...(state.data.content.sourceView?[['source','Source vocabulary']]:[]),['learned','Learned vocabulary'],...(state.data.sharedCollection?[['shared','Shared vocabulary']]:[])].map(([mode,label])=>'<button type="button" class="button small secondary" data-action="library-mode" data-value="'+mode+'" aria-pressed="'+(state.libraryMode===mode)+'">'+label+'</button>').join('')+'</div>':'');}
function library() {
 if(state.libraryMode==='shared')return sharedLibrary();
 if(state.libraryMode==='source'&&state.data.content.sourceView)return sourceLibrary();
 const c=state.data.content,words=libraryWords(c,state.data.learner,{search:state.search,tag:state.libraryTag,lessonId:state.libraryLesson,learningState:state.libraryState});
 const pages=Math.max(1,Math.ceil(words.length/50));state.libraryPage=Math.min(state.libraryPage,pages-1);
 const select=(id,title,values,value)=>'<label for="'+id+'">'+title+'<select id="'+id+'"><option value="">All</option>'+values.map(([v,name])=>'<option value="'+esc(v)+'" '+(v===value?'selected':'')+'>'+esc(name)+'</option>').join('')+'</select></label>';
 return '<div class="eyebrow">YOUR GROWING HEBREW</div><h1 tabindex="-1">My Hebrew.</h1>'+libraryModes()+'<p>Search words, notes, roots, patterns, and forms.</p><div class="library-filters"><label class="library-search-label" for="library-search">Search vocabulary<div class="search-control"><input id="library-search" class="search-input" type="search" placeholder="Hebrew, English, root, pattern, or notes…" value="'+esc(state.search)+'">'+(state.search?button('Clear','library-clear','small outline'):'')+'</div></label><div class="library-filter-selects">'+select('library-tag','Tag',[...new Set(c.words.flatMap(w=>Array.isArray(w.tags)?w.tags:[]))].sort().map(t=>[t,t]),state.libraryTag)+select('library-lesson','Used in lesson',orderedLessons(c).map(l=>[l.id,l.title]),state.libraryLesson)+select('library-state','Learning state',[['new','Not in review'],['review','In review'],['due','Due'],['saved','Bookmarked']],state.libraryState)+'</div></div>'+(c.lexicalView?'<p class="lexical-library-status" role="status">'+(lexicalLoading?'Updating lexical words…':lexicalError?esc(lexicalError):c.lexicalView.total+' lexical words · context: '+esc(c.lessons.find(l=>l.id===c.lexicalView.lessonId)?.title||c.lexicalView.lessonId))+'</p>':'')+'<p class="library-result-meta" role="status">'+words.length+' words · Page '+(state.libraryPage+1)+' of '+pages+'</p>'+((words.length||c.lexicalView?.total)?vocabularyView(words.slice(state.libraryPage*50,state.libraryPage*50+50)):'<div class="card empty">No matching words. Clear your search or change a filter.</div>')+'<div class="button-row">'+button('Previous','library-page','outline small',state.libraryPage-1,state.libraryPage===0)+button('Next','library-page','outline small',state.libraryPage+1,state.libraryPage+1>=pages)+'</div>';
}
function settings() {
  const l=state.data.learner;const checks=[['immediateAnswers','Submit multiple-choice answers immediately'],['sounds','Play feedback sounds'],['animations','Show brief completion animations'],['keyboardPinned','Keep the floating keyboard visible between typing questions'],['keyboardConvert','Convert physical English keys to Hebrew while the Hebrew keyboard is open']];
  return '<div class="eyebrow">MAKE THE EXPERIENCE YOURS</div><h1 tabindex="-1">Settings.</h1><div class="grid-2"><section class="card"><h2>Immediate & interaction</h2>'+checks.map(([key,label])=>'<label class="check-setting"><input type="checkbox" data-preference="'+key+'" '+(pref()[key]?'checked':'')+'>'+esc(label)+'</label>').join('')+'<p>Immediate submission still waits for you to press Continue after feedback.</p><h2>Nikkud</h2>'+modeControl()+'<p>New vocabulary always shows full Nikkud. Exercises may specify their own display. Flashcard fronts follow your choice below; the author supplies the default.</p>'+reviewNikkudControl()+'<label for="audio-speed">Audio playback speed</label><select id="audio-speed"><option value="1" '+(pref().audioSpeed===1?'selected':'')+'>Normal</option><option value="0.75" '+(pref().audioSpeed===.75?'selected':'')+'>Slower (0.75×)</option></select><label for="goal">Daily goal, in minutes</label><input id="goal" type="number" min="1" max="120" value="'+l.goal+'">'+button('Save goal','save-goal','small secondary')+'</section><section class="card"><h2>Demo access</h2><p>Course: '+(l.purchasedCourses.length?'Available':'No access')+' · Membership: '+(l.membership?'Active':'Inactive')+'</p><div class="button-row">'+button(l.membership?'Cancel test membership':'Start test membership','event','secondary small',l.membership?'membership_cancelled':'membership_started')+button(l.purchasedCourses.length?'Simulate course refund':'Simulate course purchase','event','outline small',l.purchasedCourses.length?'course_refunded':'course_purchased')+'</div><p>These fictional accounts and events do not contact WordPress. Choose Author in the profile selector to test Studio.</p><h2>Contextual help</h2><p>Authored explanations: available.<br>AI help: '+(state.data.aiConnected?'Configured (live check pending)':'Not connected')+'.</p>'+(state.data.canAuthor?'<h2>Local backup</h2><div class="toolbar">'+button('Export backup','export-backup','small secondary')+'<input type="file" id="restore-file" accept=".json" aria-label="Choose demo backup">'+button('Restore backup','restore','small outline')+'</div>':'')+'</section></div>';
}
function studio() {
 if(!state.studio)return '<p>Opening Studio…</p>';
 const s=state.studio,c=s.draft?.content||s.content,l=c.lessons.find(l=>l.id===state.authorLessonId)||c.lessons[0];
 state.authorLessonId=l.id;
 return '<div class="intro-row"><div><div class="eyebrow">ONE SOURCE · MANY LEARNING EXPERIENCES</div><h1>Content Studio.</h1><p>Edit the lesson in learner order. Save a draft, preview it, then publish.</p></div><span class="tag teal">PUBLISHED VERSION '+s.revisionId+'</span></div><p class="studio-context">Selected lesson: <strong data-selected-lesson>'+esc(l.id)+'</strong>. '+button('Choose lesson','studio-choose-lesson','small outline')+'</p><nav class="studio-task-menu" role="tablist" aria-label="Studio tasks">'+[['lesson','Edit lesson'],['vocabulary','Vocabulary'],['sources','Sources & import'],['media','Media'],['comments','Comments & replies'],['versions','Changes & history']].map(([id,title])=>button(title,'studio-task','outline',id).replace('<button','<button role="tab" id="studio-tab-'+id+'" aria-controls="'+(['lesson','vocabulary'].includes(id)?'studio-pane-workspace':'studio-pane-'+id)+'"')).join('')+'</nav><div class="studio-task-actions">'+button('Save complete workspace draft','studio-save','primary')+button('Review & publish selected lesson…','publish','outline')+'<p>Switch tasks without losing entered edits. Save stages the whole workspace; publication stays separate.</p></div><section id="studio-pane-sources" data-studio-pane="sources"><h2>Read sources or review an import</h2><div id="studio-import-mount"></div><div id="studio-text-import-mount"></div><section class="card"><a class="button outline" href="/google-setup" data-studio-departure>Google connection setup</a><p>Connection is separate from source registration and lesson approval. Masterfile is not loaded automatically. The team prepares exact column, identity, ownership and Lesson + Part mappings; you review teaching choices.</p><p class="hint warning">Masterfile now has AE / ID (mf-000001-style), and filter coverage A1:AE1059 was verified. ID-aware importer implementation exists in a separate revision and has not been activated here. This adapter template currently reads A–AD. Do not register/import that Masterfile until the importer and identity mapping explicitly support its ID column. Row position is not identity.</p></section><div id="studio-sources-mount"></div></section><section id="studio-pane-media" data-studio-pane="media"><h2>Reusable media</h2><div id="studio-media-mount"></div></section><section id="studio-pane-workspace" data-studio-pane="lesson vocabulary"><section class="card studio-lesson-actions"><h2>Selected lesson workspace</h2><div class="button-row">'+button('Preview saved draft','rehearse','primary',l.id,!s.draft)+button('Reload saved draft (discard workspace edits)','studio-reload','outline')+button('Export content JSON','export-content','outline')+'</div><p>Preview is disposable and unpublished. It saves no learner progress or settings. Unsaved edits are excluded.</p></section><div id="unified-studio-mount"></div></section><section id="studio-pane-versions" data-studio-pane="versions"><h2>Saved changes and version history</h2><section class="card studio-preview"><h2>Publication impact</h2>'+(s.preview?'<p>'+s.preview.changes.length+' unpublished changes · '+s.preview.affectedLessons.length+' affected lessons.</p><ul aria-label="Affected lessons">'+s.preview.affectedLessons.map(id=>'<li>'+esc((c.lessons.find(l=>l.id===id)||s.content.lessons.find(l=>l.id===id))?.title||id)+' <small>'+esc(id)+'</small></li>').join('')+'</ul>'+s.preview.changes.slice(0,50).map(c=>'<p>'+esc(changeLabel(c))+' · '+esc(c.action+(c.reordered?' · order changed':''))+'</p>').join(''):'<p>Open Changes & history to load the current saved publication impact.</p>')+(s.draft?button('Review & publish selected lesson…','publish','primary'):'<p>No saved draft to publish.</p>')+'</section><section class="card"><h2>Published history</h2><p>Restoring creates a new revision and retains learner progress.</p>'+s.history.map(r=>'<div class="revision-row">Version '+r.id+' · '+esc(r.reason)+(r.id!==s.revisionId?button('Restore','rollback','small outline',r.id):'<span class="tag">Current</span>')+'</div>').join('')+'</section></section><section id="studio-pane-comments" data-studio-pane="comments"><div id="studio-author-comments-mount"></div><h2>Moderate comments and reply</h2><p>New comments are immediately visible to entitled learners. Approve/keep and Reject/hide moderate visibility; they do not introduce preapproval.</p><div data-comment-feed>'+questionList(true,l.id)+'</div>'+reportList()+'</section>';
}
const changeLabel=c=>c.kind==='metadata'?'Pack '+c.field:c.kind==='policy'?'Review defaults':c.id;
function disposeStudioMounts(){studioPrivateComments?.dispose();studioPrivateComments=null;if(studioWorkspace&&authorContext?.owner===state.user){try{authorContext.workspace.getContent();}catch{}}studioWorkspace=null;for(const dispose of studioMounts.splice(0))try{dispose();}catch{}}
function studioDirty(){return Boolean(studioWorkspace?.owner===state.user&&studioWorkspace.unified.isDirty()||authorContext?.owner===state.user&&authorContext.workspace.dirty||[...inlineAuthorStates].some(([key,s])=>key.startsWith(JSON.stringify([state.user]).slice(0,-1)+',')&&s.commentBody?.trim()));}
async function guardStudioDeparture(reason,onSaved=()=>{}){
 if(studioSave||authorContext?.workspace.pending)await settledDraftToken();await studioWorkspace?.unified.whenIdle();
 if(reason==='Open this lesson'){if(authorContext?.owner===state.user)authorContext.workspace.getContent();return true;}
 if(!studioDirty())return true;if(studioDeparturePending)return false;studioDeparturePending=true;window.HebleoKeyboard?.close();
 const previous=document.activeElement,dialog=document.createElement('dialog');dialog.id='studio-departure';dialog.setAttribute('aria-labelledby','studio-departure-title');dialog.innerHTML='<h2 id="studio-departure-title">Unsaved workspace edits</h2><p>'+esc(reason)+'. Save the complete workspace as a private draft, discard these edits, or stay here. Saving does not publish.</p><p data-departure-status role="status"></p><div class="button-row"><button type="button" data-departure-save>Save draft</button><button type="button" data-departure-discard>Discard</button><button type="button" data-departure-stay>Stay</button></div>';document.body.append(dialog);
 return new Promise(resolve=>{let saving=false;const finish=allowed=>{dialog.close();dialog.remove();studioDeparturePending=false;if(!allowed)previous?.focus?.({preventScroll:true});resolve(allowed);};
 dialog.querySelector('[data-departure-stay]').onclick=()=>{if(!saving)finish(false);};dialog.querySelector('[data-departure-discard]').onclick=()=>{if(!saving){disposeStudioMounts();authorContext=null;inlineAuthorStates.clear();finish(true);}};
 dialog.querySelector('[data-departure-save]').onclick=async()=>{if(saving)return;saving=true;dialog.querySelectorAll('button').forEach(b=>b.disabled=true);try{if([...inlineAuthorStates.values()].some(s=>s.commentBody?.trim()))throw new Error('Save your private comment first, choose Stay, or explicitly Discard.');const result=studioWorkspace?await studioWorkspace.unified.save():await authorContext.workspace.save();onSaved(result);finish(true);}catch(error){dialog.querySelector('[data-departure-status]').textContent='Draft was not saved: '+error.message+' All entered values remain. Choose Stay or retry.';}finally{saving=false;if(dialog.isConnected)dialog.querySelectorAll('button').forEach(b=>b.disabled=false);}};
 dialog.addEventListener('cancel',event=>{event.preventDefault();if(!saving)finish(false);});dialog.showModal();dialog.querySelector('[data-departure-stay]').focus();});
}
function mountStudioPrivateComments(){
 if(studioPrivateComments||!studioWorkspace||state.studioTask!=='comments')return;
 let workspace=authorContext.workspace,l;try{l=workspace.getContent().lessons.find(l=>l.id===state.authorLessonId);}catch(error){root.querySelector('#studio-author-comments-mount').textContent='Save or correct the workspace before opening private comments. '+error.message;return;}const b=l?.blocks.find(b=>b.type==='explanation');if(!b)return;
 studioPrivateComments=mountInlineAuthor(root.querySelector('#studio-author-comments-mount'),{workspace,lessonId:l.id,componentId:b.id,pageId:b.textPages?.order[0],state:authorStateFor(l.id),api,renderLesson,reviewOnly:true,onPreview:startRehearsal,onApply:()=>{}});
}
function mountStudioEditors(){
 if(studioWorkspace?.owner===state.user){for(const node of studioWorkspace.nodes)root.querySelector('#'+node.id).replaceWith(node);return;}
 const s=state.studio,coordinator=ensureAuthorContext(s),c=coordinator.getContent();
 const saveDraft=(input,renderAfter=true)=>{
  if(studioSave)return Promise.reject(new Error('The previous draft save is still reloading.'));
  const controls=[...root.querySelectorAll('#studio-text-import-mount input,#studio-text-import-mount textarea,#studio-text-import-mount button,#studio-import-mount input,#studio-import-mount select,#studio-import-mount button,#unified-studio-mount input,#unified-studio-mount select,#unified-studio-mount textarea,#unified-studio-mount button')],disabled=controls.map(el=>el.disabled);controls.forEach(el=>el.disabled=true);const mirrors=[...root.querySelectorAll('#unified-studio-mount .CodeMirror')].map(el=>el.CodeMirror).filter(Boolean),mirrorState=mirrors.map(cm=>cm.getOption('readOnly'));mirrors.forEach(cm=>cm.setOption('readOnly','nocursor'));
  return trackStudioSave(async done=>{try{const result=await api('studio/draft',input);if(state.page==='studio'){await load();done();if(renderAfter)render();toast('Draft saved. Publish separately when ready.');}return result;}finally{controls.forEach((el,i)=>{if(el.isConnected)el.disabled=disabled[i];});mirrors.forEach((cm,i)=>cm.setOption('readOnly',mirrorState[i]));}});
 };
 const unified=mountUnifiedStudio(root.querySelector('#unified-studio-mount'),{content:c,coordinator,conjugationCatalog:state.studio.conjugationCatalog,conjugationFixtureMode:state.studio.conjugationFixtureMode,onSaved:()=>{if(state.page==='studio'){const versions=root.querySelector('#studio-pane-versions');if(versions)versions.innerHTML='<h2>Saved changes and version history</h2><p>Open Changes & history to load the current saved publication impact.</p>';const preview=root.querySelector('[data-action="rehearse"]');if(preview)preview.disabled=false;}},lessonId:state.authorLessonId,baseRevisionId:coordinator.baseRevisionId,expectedDraftToken:coordinator.expectedDraftToken,saveDraft,importWorkbook:input=>api('studio/lexical/import-preview',input),getWorkspaceImpact:input=>{if(studioSave)return Promise.reject(new Error('The previous draft save is still reloading.'));return api('studio/impact',input);},getExerciseDependencies:({signal,...input})=>api('studio/dependencies',input),onLessonSelect:id=>{studioPrivateComments?.dispose();studioPrivateComments=null;state.authorLessonId=id;root.querySelector('[data-selected-lesson]').textContent=id;const b=root.querySelector('[data-action="rehearse"]');if(b)b.dataset.value=id;}});
 studioMounts.push(()=>unified.dispose());
 const textImport=mountTextImport(root.querySelector('#studio-text-import-mount'),{api,getSnapshot:()=>({baseRevisionId:state.studio.revisionId,expectedDraftToken:draftToken(),hasUnsavedChanges:unified.isDirty()}),saveDraft:input=>saveDraft(input,false),onStaged:()=>{authorContext=null;disposeStudioMounts();render();}});studioMounts.push(textImport);
 const importer=mountImportWorkflow(root.querySelector('#studio-import-mount'),{session:state.studioImport,getSnapshot:()=>({content:state.studio.draft?.content||state.studio.content,baseRevisionId:state.studio.revisionId,expectedDraftToken:draftToken()}),saveDraft:input=>{if(unified.isDirty())return Promise.reject(new Error('Save workspace edits or explicitly Reload saved draft before staging an import.'));return saveDraft(input,false);},onStaged:()=>{disposeStudioMounts();render();},renderWord:word=>vocabularyTable([word])});
 studioMounts.push(()=>importer.dispose());
 const sourceMount=mountSourceAuthoring(root.querySelector('#studio-sources-mount'),{api,initialState:sourceWorkspaceState,getSnapshot:()=>{if(studioSave)throw new Error('The previous draft save is still reloading.');return {content:unified.getContent(),baseRevisionId:state.studio.revisionId,expectedDraftToken:draftToken(),hasUnsavedChanges:unified.isDirty()};},onStaged:async(result,guard)=>{const next=await api('studio');if(guard?.isCurrent&&!await guard.isCurrent()){toast('Saved source draft retained. Newer local sibling edits remain in this workspace.');return;}state.studio=next;authorContext=null;disposeStudioMounts();render();},onPreview:async({draftToken:token})=>{const current=await api('studio');if(current.draft?.draftToken!==token)throw new Error('Saved source draft changed; refresh source status.');state.studio=current;await startRehearsal(state.authorLessonId);},onChanged:()=>{}});
 studioMounts.push(()=>{try{sourceWorkspaceState=sourceMount.exportState();}catch{}sourceMount.dispose();});
 const mediaMount=mountMediaLibrary(root.querySelector('#studio-media-mount'),{api,initialState:mediaWorkspaceState,onSelected:()=>toast('Pinned media selected. Copy its URL into the intended audio/video field, then Save the complete workspace.')});studioMounts.push(()=>{mediaWorkspaceState=mediaMount.getState();mediaMount.dispose();});
 studioWorkspace={owner:state.user,unified,nodes:['unified-studio-mount','studio-import-mount','studio-sources-mount','studio-media-mount','studio-author-comments-mount'].map(id=>root.querySelector('#'+id))};
  if(studioSave){root.querySelector('#unified-studio-mount').setAttribute('aria-busy','true');root.querySelectorAll('#unified-studio-mount input,#unified-studio-mount select,#unified-studio-mount textarea,#unified-studio-mount button').forEach(el=>el.disabled=true);}
}
// Rehearsal runs in a modal outside #app (learner controls inert), marked data-preview-root so app handlers ignore it.
// Only the author preview routes are injected; learner saves are flushed first and preferences stay local.
async function startRehearsal(lessonId,trigger){
  if(rehearsal)return;
  if(inlineActive())authorContext.workspace.savedContext();
  const token=await settledDraftToken();if(!token)throw new Error('Save a draft before rehearsing it.');if(rehearsal)return;
  const opener=trigger||root.querySelector(inlineActive()?'[data-author-action="preview"]':'[data-action="rehearse"]')||document.activeElement;await flushSave();clearTimeout(saveTimer);closePanel();stopMedia();window.HebleoKeyboard?.close?.();
  const dialog=document.createElement('dialog');dialog.id='rehearsal-panel';dialog.className='rehearsal-dialog';dialog.dataset.previewRoot='';dialog.setAttribute('aria-labelledby','rehearsal-title');
  dialog.innerHTML='<div class="panel-header"><h2 id="rehearsal-title">Rehearsing the saved draft</h2></div><p class="footer-note">Unsaved form edits are not included. Nothing here is saved to any profile.</p><div data-rehearsal-host></div>';
  document.body.appendChild(dialog);dialog.showModal();
  const current=rehearsal={dialog,controller:null,opener};
  dialog.addEventListener('cancel',event=>{event.preventDefault();current.controller?.exit();});
  current.controller=mountLessonPreview(dialog.querySelector('[data-rehearsal-host]'),{lessonId,draftToken:token,renderer:createLearnerRenderer({renderLesson,playAudio,stopMedia,keyScope:dialog,keyboardAdapter:window.HebleoKeyboard}),preferences:structuredClone(pref()),loadSession:input=>api('studio/preview/session',input),evaluate:input=>api('studio/preview/evaluate',input),onExit:()=>endRehearsal()});
  await current.controller.ready;
}
function endRehearsal(){const current=rehearsal;if(!current)return;rehearsal=null;current.controller?.dispose();current.dialog.close?.();returnKeyboard();current.dialog.remove();stopMedia();setPlaybackSpeed(pref().audioSpeed);syncKeyboard();if(current.opener?.isConnected)current.opener.focus({preventScroll:true});else root.querySelector('[data-action="rehearse"],[data-author-action="preview"]')?.focus();}

function reviewNikkudControl(){return '<label for="review-nikkud">Flashcard front Nikkud (vowel marks)</label><select id="review-nikkud">'+[['default','Follow author default ('+({full:'with Nikkud',curated:'authored Nikkud',none:'without Nikkud'}[state.data.content.reviewPolicy?.defaultNikkud||'full'])+')'],['full','With Nikkud'],['curated','Authored Nikkud'],['none','Without Nikkud']].map(([v,l])=>'<option value="'+v+'" '+(pref().reviewNikkud===v?'selected':'')+'>'+l+'</option>').join('')+'</select>';}
// Draft identity is recorded on the form, so a late capture cannot reassign it to the active profile.
const commentKey=(owner,context)=>JSON.stringify([owner,context.lessonId,context.revisionId,context.wordId||null,context.exerciseId||null]);
function rememberComment(form){const key=form.dataset.commentKey;state.commentDrafts[key]={text:form.querySelector('[name=question]').value,anonymous:form.querySelector('[name=anonymous]').checked};}
function commentComposer(context,id=''){
 const owner=state.user,key=commentKey(owner,context),d=state.commentDrafts[key]||{},pending=state.commentPending[key];return '<form '+(id?'id="'+id+'" ':'')+'class="comment-composer" data-lesson-comment="'+esc(context.lessonId)+'" data-revision="'+context.revisionId+'" data-comment-owner="'+esc(owner)+'" data-comment-key="'+esc(key)+'" data-comment-context="'+esc(JSON.stringify(context))+'"><label class="compose-field"><span>Your comment or question</span><textarea name="question" dir="auto" rows="3" required maxlength="1500" '+(pending?'readonly':'')+' placeholder="Write about this lesson…">'+esc(d.text||'')+'</textarea></label><label><input type="checkbox" name="anonymous" '+(d.anonymous?'checked ':'')+(pending?'disabled':'')+'> Post anonymously to learners</label><p>Visible immediately to learners with course access. Author can identify and moderate posts.</p><button class="button primary" '+(pending?'disabled':'')+'>Post lesson comment</button><p data-comment-status role="status">'+esc(state.commentErrors[key]||'')+'</p></form>';
}
function commentForms(key){return [...document.querySelectorAll('[data-lesson-comment]')].filter(form=>form.dataset.commentKey===key);}
async function postComment(form){
 const owner=form.dataset.commentOwner,key=form.dataset.commentKey,context=JSON.parse(form.dataset.commentContext);if(state.commentPending[key])return;rememberComment(form);const submitted={...state.commentDrafts[key]};state.commentPending[key]=true;state.commentErrors[key]='';
 const sync=()=>commentForms(key).forEach(live=>{live.querySelector('textarea').readOnly=Boolean(state.commentPending[key]);live.querySelector('[name=anonymous]').disabled=Boolean(state.commentPending[key]);live.querySelector('button').disabled=Boolean(state.commentPending[key]);live.querySelector('[data-comment-status]').textContent=state.commentErrors[key]||'';});sync();
 try{await api('questions',{...context,requestId:uid(),discussionVersion:1,question:submitted.text,anonymous:submitted.anonymous},owner);
  if(JSON.stringify(state.commentDrafts[key])===JSON.stringify(submitted)){state.commentDrafts[key]={};commentForms(key).forEach(live=>{live.querySelector('textarea').value='';live.querySelector('[name=anonymous]').checked=false;});}
  state.commentErrors[key]='Comment posted. Author can reply or moderate it.';if(state.user===owner){await load();if(state.user===owner)refreshComments();}
 }catch(error){state.commentErrors[key]=error.message;}finally{state.commentPending[key]=false;sync();}
}
function questionList(author=false,lessonId){
 const qs=state.questions.filter(q=>q.visibility!=='removed'&&(!lessonId||q.lessonId===lessonId)),pages=Math.max(1,Math.ceil(qs.length/20));state.discussionPage=Math.min(state.discussionPage,pages-1);
 return '<section class="question-list"><h3>'+qs.length+' comment'+(qs.length===1?'':'s')+(author?' & private questions':'')+'</h3>'+(!qs.length?'<p>No comments yet. Start the discussion above.</p>':qs.slice(state.discussionPage*20,state.discussionPage*20+20).map(q=>{
  const shared=q.discussionVersion===1,identity=shared?(q.anonymous?'Anonymous':q.posterName||state.data.users.find(u=>u.id===q.userId)?.name):'Private question',key=q.userId+'|'+q.requestId,lastModeration=q.moderation?.at(-1);
  return '<article class="question-item"><div class="comment-avatar" aria-hidden="true">'+esc(identity.slice(0,1))+'</div><div class="comment-body"><strong>'+esc(identity)+'</strong><small>'+esc(q.lessonId)+' · Version '+esc(q.revisionId??q.legacyRevisionId)+' · '+esc(q.status)+(author&&shared?' · '+esc(q.visibility)+' · Moderation: '+esc(lastModeration?(lastModeration.action==='keep'?'Kept visible':'Hidden')+' at '+lastModeration.at:'Not reviewed')+' · identity '+esc(q.userId):'')+'</small>'+(q.wordId?'<p class="comment-word-context">About '+esc(content().words.find(w=>w.id===q.wordId)?.english||'a word in this lesson')+'</p>':'')+'<p class="comment-text" dir="auto">'+esc(q.question)+'</p>'+(q.answer?'<div class="comment-reply"><strong>Author reply</strong><div class="rich-lesson">'+renderLesson(q.answer)+'</div></div>':'<p>No author reply yet.</p>')+(author?(shared?'<div class="toolbar">'+button('Approve / keep visible','comment-moderate','small secondary',key+'|keep')+button('Reject / hide','comment-moderate','small outline',key+'|remove')+'</div>':'<p>Private: only its poster and Author can see this question.</p>')+'<details class="reply-composer" '+(state.replyOpen[key]?'open':'')+'><summary>'+(q.answer?'Edit reply':'Reply')+'</summary><form data-question-answer="'+esc(key)+'"><label class="compose-field"><span>Reply to this comment</span><textarea name="answer" dir="auto" rows="3" required maxlength="12000" '+(state.replyPending[key]?'readonly':'')+'>'+esc(state.replyDrafts[key]??q.answer??'')+'</textarea></label><div class="compose-actions"><button class="button primary small" '+(state.replyPending[key]?'disabled':'')+'>Save reply</button>'+button('Cancel','reply-cancel','small outline',key)+'</div><p data-reply-status role="status">'+esc(state.replyErrors[key]||'')+'</p></form></details>':'')+'</div></article>';
 }).join(''))+(qs.length>20?'<nav class="button-row centered comment-pager" aria-label="Comment pages">'+button('Previous comments','comment-page','small outline',state.discussionPage-1,state.discussionPage===0)+'<span>Page '+(state.discussionPage+1)+' of '+pages+'</span>'+button('Next comments','comment-page','small outline',state.discussionPage+1,state.discussionPage+1>=pages)+'</nav>':'')+'</section>';
}

function reportList() {
  return '<section class="card"><h2>Learner reports</h2><p>Reports retain the submitted answer and content version. Reviewing a report does not change accepted answers.</p>'+(!state.reports.length?'<p>No reports yet.</p>':state.reports.map(r=>'<article class="report-item"><strong>'+esc(r.reason)+' · '+esc(r.attempt.exerciseId)+'</strong><p>Version '+r.attempt.revisionId+' · '+esc(r.userId)+' · '+esc(r.status)+'</p><p>Submitted: '+esc(typeof r.attempt.answer==='object'?JSON.stringify(r.attempt.answer):r.attempt.answer)+'</p><p>'+esc(r.note)+'</p>'+button(r.status==='reviewed'?'Reopen':'Mark reviewed','report-resolve','small secondary',r.userId+'|'+r.requestId+'|'+(r.status==='reviewed'?'pending':'reviewed'))+'</article>').join(''))+'</section>';
}
function inlineConceptBody(){return learnBody(lessonObject(),currentExercise()?.explanationTime).replace(/<button/g,'<button data-keyboard-preserve');}
function inlineConcept(open=true){
 const field=root.querySelector('#practice #answer'),selection=field?{start:field.selectionStart,end:field.selectionEnd,direction:field.selectionDirection}:null;let panel=root.querySelector('#inline-concept');
 if(open&&!panel){panel=document.createElement('section');panel.id='inline-concept';panel.className='inline-concept';panel.setAttribute('aria-labelledby','inline-concept-title');panel.innerHTML='<div class="panel-header"><h3 id="inline-concept-title">Review this concept</h3>'+button('Close concept','inline-concept-close','small outline').replace('<button','<button data-keyboard-preserve')+'</div><div data-inline-concept-body>'+inlineConceptBody()+'</div>';root.querySelector('#practice [data-concept-slot]')?.append(panel);bind(panel);mountLessonTextReaders(panel);}
 root.querySelector('#practice [data-action=concept]')?.setAttribute('aria-expanded',String(open));
 if(!open){panel?.remove();root.querySelector('#practice [data-action=concept]')?.focus({preventScroll:true});return;}if(field&&!field.disabled){field.focus({preventScroll:true});if(selection)field.setSelectionRange(selection.start,selection.end,selection.direction);}else if(!open)root.querySelector('#practice [data-action="concept"]')?.focus();
}
function changeConceptMedium(value){
 const body=root.querySelector('#inline-concept [data-inline-concept-body]');if(!body)return;const field=root.querySelector('#practice #answer'),selection=field?{start:field.selectionStart,end:field.selectionEnd,direction:field.selectionDirection}:null;
 state.medium=value;body.innerHTML=inlineConceptBody();bind(body);mountLessonTextReaders(body);if(field&&!field.disabled){field.focus({preventScroll:true});if(selection)field.setSelectionRange(selection.start,selection.end,selection.direction);}
}
const noteKey=(owner,id)=>JSON.stringify([owner,id]);
function rememberNote(){const field=document.querySelector('#personal-note');if(!field)return;state.noteDrafts[noteKey(field.dataset.noteOwner,field.dataset.noteWord)]={text:field.value,start:field.selectionStart,end:field.selectionEnd,direction:field.selectionDirection};}
function restoreNote(field,draft){if(!field||!draft)return;field.value=draft.text;field.setSelectionRange(draft.start??0,draft.end??0,draft.direction||'none');}
function refreshWordStatus(panel){const dialog=document.querySelector('#context-panel');if(state.panel!==panel||!dialog||panel.owner!==state.user)return;const mark=dialog.querySelector('[data-action=bookmark]');if(mark)mark.textContent=state.data.learner.bookmarks.includes(panel.id)?'Unbookmark':'Bookmark';}
function showPanel() {
  lastFocus ||= document.activeElement?.dataset.action;
  window.HebleoKeyboard?.close();const p=state.panel;let body,title;if(p.type==='word')p.owner??=state.user;
  if(p.type==='word'){const w=word(p.id);title=w.english;body='<div class="hebrew">'+wordText(w)+'</div><p>'+esc(w.notes)+'</p>'+audioControls(w.audio,w.english)+richFields(w)+voiceControls(w)+'<div class="toolbar">'+button(state.data.learner.bookmarks.includes(w.id)?'Unbookmark':'Bookmark','bookmark','small secondary',w.id)+button('Add to review','enroll','small secondary',w.id)+button('Comment in lesson discussion about this word','help-word','small outline',w.id)+'</div>'+personalNote(w,false)+'<label for="personal-note">Edit your private note</label><textarea id="personal-note" dir="auto" data-note-owner="'+esc(p.owner)+'" data-note-word="'+esc(w.id)+'">'+esc(state.noteDrafts[noteKey(p.owner,w.id)]?.text??state.data.learner.notes[w.id]??'')+'</textarea>'+button('Save note','save-panel-note','small secondary',w.id);}
  else if(p.type==='lookup'){title='Vocabulary help';body='<p>Hover or select an underlined word to see its vocabulary card.</p>'+ content().words.filter(w=>lessonObject().wordIds.includes(w.id)).map(w=>button(esc(w.pointed)+' · '+esc(w.english),'lookup','small secondary',w.id)).join('');}
  else if(p.type==='concept'){title='Review this concept';body=learnBody(lessonObject(),currentExercise()?.explanationTime);}
  else if(p.type==='report'){title='Report a problem';body='<form id="report-form"><label for="report-reason">What needs review?</label><select id="report-reason" name="reason"><option value="answer">My answer should be accepted</option><option value="unclear">The question is unclear</option><option value="media">Text or audio error</option></select><label for="report-note">Details (optional)</label><textarea id="report-note" name="note" maxlength="2000"></textarea><p>Your submitted answer, exercise, and content version will be attached.</p><button class="button primary">Send for review</button></form>';}
  else {title='Lesson help & comments';body=(p.context?.wordId?'<p class="word-comment-destination">This posts about '+esc(word(p.context.wordId)?.english||'this word')+' in the lesson discussion. It is separate from Your private note.</p>':'')+'<p class="tag">'+esc(p.source==='ai-generated'?'OPTIONAL AI ASSISTANCE':p.source==='demo-authored'?'DEMO-AUTHORED EXPLANATION':'AUTHORED EXPLANATION')+'</p><div class="help-text rich-lesson">'+renderLesson(p.text||'Opening the explanation…')+'</div>'+(state.data.aiConnected&&state.data.learner.membership?'<form id="help-form"><label for="help-question">Your question</label><textarea id="help-question" name="question" maxlength="1500" required>'+esc(p.question||'')+'</textarea><button class="button secondary">Ask AI for clarification</button></form>':'<p>AI clarification is '+(!state.data.learner.membership?'a membership feature':'not connected')+'.</p>')+(p.context?.wordId?button('Open lesson discussion','word-discussion','small outline',p.context.lessonId):'')+commentComposer(p.context,'author-question-form')+'<div data-comment-feed>'+questionList(false,p.context?.lessonId)+'</div><div class="toolbar">'+(state.page==='lesson'&&lessonObject().exerciseIds.length?button('Repeat lesson questions','target-practice','small secondary'):'')+'</div><p>Extra practice repeats authored questions you last answered incorrectly in this lesson; if none are incorrect, it repeats the lesson set.</p>';}
  const dialog=document.createElement('dialog');dialog.id='context-panel';dialog.dataset.audioSurface='';dialog.setAttribute('aria-labelledby','panel-title');dialog.innerHTML='<div class="panel-header"><h2 id="panel-title">'+esc(title)+'</h2>'+button('Close','panel-close','small outline')+'</div>'+body;document.body.appendChild(dialog);dialog.showModal();window.HebleoKeyboard?.mount(dialog);syncKeyboard();dialog.addEventListener('cancel',event=>{event.preventDefault();closePanel();});bind(dialog);restoreNote(dialog.querySelector('#personal-note'),state.noteDrafts[noteKey(p.owner,p.id)]);
}
function closePanel() { panelGeneration++;rememberComposers();rememberNote();returnKeyboard(); document.querySelector('#context-panel')?.close();document.querySelector('#context-panel')?.remove();state.panel=null;clearRecording();state.recording='empty';const target=lastFocus;lastFocus=null;const answer=document.querySelector('#practice #answer:not([disabled])');if(answer){answer.focus({preventScroll:true});syncKeyboard();}else Array.from(document.querySelectorAll('[data-action]')).find(el=>el.dataset.action===target)?.focus(); }
function replacePanel(panel) { panelGeneration++;rememberComposers();rememberNote();returnKeyboard(); clearRecording();state.recording='empty';document.querySelector('#context-panel')?.remove();state.panel=panel;showPanel(); }
async function authoredHelp(wordId) {
  const l=state.page==='lesson'?lessonObject():state.data.content.lessons.find(l=>l.wordIds.includes(wordId));
  if(!l){toast('This word has no lesson explanation linked yet.');return;}
  const context={revisionId:state.page==='lesson'?state.session.revisionId:state.data.revisionId,lessonId:l.id,wordId,exerciseId:state.page==='lesson'?currentExercise()?.id:undefined,question:''};
  // A dismissal/replacement consumes this request even if the same profile/route returns.
  const request={generation:++panelGeneration,owner:state.user,page:state.page,route:location.hash,routeGeneration,session:state.session,lessonId:state.lessonId,step:state.step,question:state.question,panel:state.panel};
  const isCurrent=()=>request.generation===panelGeneration&&request.owner===state.user&&request.page===state.page&&request.route===location.hash&&request.routeGeneration===routeGeneration&&request.session===state.session&&request.lessonId===state.lessonId&&request.step===state.step&&request.question===state.question&&request.panel===state.panel;
  try{const response=await api('help',context,request.owner);if(isCurrent())replacePanel({type:'help',...response,context});}
  catch(error){if(isCurrent())throw error;}
}
function showAnswerResult(scope,e){
 if(!scope?.isConnected||!state.result)return;scope.dataset.checked='true';
 scope.querySelectorAll('[data-exercise-input] button:not([data-vocabulary-word]),[data-exercise-input] textarea,[data-exercise-input] input').forEach(el=>el.disabled=true);scope.querySelectorAll('[data-action="choice"]').forEach(el=>el.classList.toggle('selected',el.dataset.value===state.answer));
 applyMatchingResult(scope,e,state.result);
 const status=scope.querySelector('[data-answer-status]');status.innerHTML=exerciseFeedback(e,state.result);bindResultExplanations(status);bind(status);const keyboard=scope.querySelector('[data-action="keyboard-open"]');if(keyboard)keyboard.remove();
 const support=scope.querySelector('.exercise-support');support.innerHTML=questionSupport(e,true);bind(support);updateQuestionPrimary();
 refreshQuestionProgress();
 mountExerciseReminders(scope,e);syncKeyboard();refreshComments();scope.querySelector('[data-answer-commit]').focus({preventScroll:true});
}
function refreshQuestionProgress(){const bar=root.querySelector('.lesson-progress'),n=questionProgress(lessonObject()).correctIds.length,total=lessonObject().exerciseIds.length;if(bar){bar.querySelector('label').textContent=n+' of '+total+' questions answered correctly';const progress=bar.querySelector('progress');progress.value=n;progress.setAttribute('aria-valuenow',String(n));progress.setAttribute('aria-valuetext',n+' of '+total);}}
function answerRecovery(message,kind){const region=root.querySelector('#practice [data-answer-recovery]');region.innerHTML=message?'<p role="alert" data-'+kind+'>'+esc(message)+'</p>':'';}
function mountExerciseReminders(scope,e=currentExercise()){
 reminderBinding?.destroy();reminderBinding=null;
 if(!scope||!e||!state.result||state.page!=='lesson')return;
 const session=state.session,owner=state.user,result=state.result,step=state.step,question=state.question,route=location.hash;
 reminderBinding=mountAnsweredVocabulary(scope,{content:content(),exercise:e,result,revisionId:session.revisionId,mode:e.nikkudOverride||pref().nikkud,playAudio,stopMedia,getPlaybackState,
  isCurrent:()=>state.user===owner&&state.session===session&&state.result===result&&state.step===step&&state.question===question&&location.hash===route&&!state.panel});
}
async function submitAnswer(recover=false) {
 if(submitting||state.result||!learnerControlsActive()||pendingAttempt&&!recover)return;const e=currentExercise();if(!e)return;const wire=wireAnswer(e,answerDraft());if(wire.error){toast(wire.error);return;}
 const context={owner:state.user,session:state.session,step:state.step,question:state.question},scope=root.querySelector('#practice'),field=scope.querySelector('#answer'),selection=field?{start:field.selectionStart,end:field.selectionEnd,direction:field.selectionDirection}:null,isCurrent=()=>state.user===context.owner&&state.session===context.session&&state.step===context.step&&state.question===context.question&&root.querySelector('#practice')===scope;
 pendingAttempt??={requestId:uid(),revisionId:context.session.revisionId,lessonId:state.lessonId,exerciseId:e.id,answer:structuredClone(wire.answer),...(e.type==='ordering'?{sentenceMode:state.sentenceMode}:{})};
 const controls=[...scope.querySelectorAll('[data-exercise-input] button,[data-exercise-input] textarea,[data-exercise-input] input')],disabled=controls.map(el=>el.disabled);
 clearTimeout(saveTimer);submitting=true;answerPhase='checking';controls.forEach(el=>el.disabled=true);updateQuestionPrimary();answerRecovery('','');
 try{
  // Same request ID retrieves the immutable receipt if the response was lost.
  // This uses Store.attempt's existing idempotency contract; it never regrades a known result.
  const result=await api('attempt',pendingAttempt,context.owner);if(!isCurrent())return;
  state.result=result;pendingAttempt=null;answerPhase='saving';feedbackSound(pref().sounds,result.correct);showAnswerResult(scope,e);
  await load();if(!isCurrent())return;refreshQuestionProgress();await queueSave();if(!isCurrent())return;answerPhase='ready';updateQuestionPrimary();
 }catch(error){if(isCurrent()){
  if(state.result){answerPhase='save-error';answerRecovery('Your answer was graded. This position was not saved.','position-recovery');updateQuestionPrimary();}
  else if(error.status&&error.status<500){pendingAttempt=null;answerPhase='ready';controls.forEach((el,i)=>el.disabled=disabled[i]);updateQuestionPrimary();answerRecovery('Checking failed. Your answer is unchanged; try checking again.','grade-recovery');field?.focus({preventScroll:true});if(selection)field.setSelectionRange(selection.start,selection.end,selection.direction);}
  else{answerPhase='uncertain';answerRecovery('The checking response was interrupted. Retry checking to recover this answer’s result.','grade-recovery');updateQuestionPrimary();}
 }throw error;}finally{submitting=false;}
}
async function approveSentenceAnswer(){
 if(submitting||!state.result||state.result.correct||state.result.sentenceMode!=='complex'||currentExercise()?.type!=='ordering'||!learnerControlsActive()||!['ready','approval-error'].includes(answerPhase))return;
 const scope=root.querySelector('#practice'),owner=state.user,result=state.result,isCurrent=()=>owner===state.user&&root.querySelector('#practice')===scope&&state.result===result;
 pendingApproval??={requestId:result.requestId,revisionId:result.revisionId,lessonId:result.lessonId,exerciseId:result.exerciseId};
 submitting=true;answerPhase='approving';updateQuestionPrimary();scope.querySelector('[data-action="self-approve"]')?.setAttribute('disabled','');answerRecovery('Saving your approval…','approval-status');
 try{
  const approved=await api('attempt/self-approve',pendingApproval,owner);if(!isCurrent())return;
  if(approved.requestId!==result.requestId||approved.revisionId!==result.revisionId||approved.lessonId!==result.lessonId||approved.exerciseId!==result.exerciseId||approved.answer!==result.answer||approved.selfApproved!==true||approved.correct!==true)throw new Error('Invalid approval response. Retry to check the saved result.');
  state.result=approved;pendingApproval=null;answerPhase='saving';showAnswerResult(scope,currentExercise());answerRecovery('','');
  await load();if(owner!==state.user||root.querySelector('#practice')!==scope)return;refreshQuestionProgress();await queueSave();answerPhase='ready';updateQuestionPrimary();
 }catch(error){if(owner===state.user&&root.querySelector('#practice')===scope){
  if(state.result.selfApproved){answerPhase='save-error';answerRecovery('Your approval was saved. Retry saving this position.','position-recovery');}
  else{if(error.status&&error.status<500)pendingApproval=null;answerPhase='approval-error';answerRecovery('Approval was not confirmed. Your answer is unchanged here. Retry Mark my answer correct.','approval-error');scope.querySelector('[data-action="self-approve"]')?.removeAttribute('disabled');}
  updateQuestionPrimary();
 }throw error;}finally{submitting=false;}
}
async function saveAnswerPosition(){
 if(!state.result||submitting)return;const scope=root.querySelector('#practice'),owner=state.user;submitting=true;answerPhase='saving';updateQuestionPrimary();
 try{await load();if(owner!==state.user||root.querySelector('#practice')!==scope)return;await queueSave();if(root.querySelector('#practice')!==scope)return;answerPhase='ready';answerRecovery('','');refreshQuestionProgress();updateQuestionPrimary();scope.querySelector('[data-answer-commit]')?.focus({preventScroll:true});}
 catch(error){answerPhase='save-error';updateQuestionPrimary();throw error;}finally{submitting=false;}
}
async function continueQuestion(){
 if(!state.result||submitting||!['ready','advance-error'].includes(answerPhase))return;
 const scope=root.querySelector('#practice'),owner=state.user;
 if(!continueTarget){const ids=portionExercises(content(),lessonObject(),state.step,state.practiceIds),last=state.question+1>=ids.length;continueTarget={...progressPayload(),step:last?portionKind(lessonObject(),portionKeys(lessonObject())[portionKeys(lessonObject()).indexOf(state.step)+1]):currentKind(),question:last?0:state.question+1,sentenceMode:'simple',answer:'',matching:{},selectedTokens:[],resultRequestId:null,practiceIds:last?[]:state.practiceIds};if(lessonObject().compositionVersion===2)continueTarget.componentId=last?(portionKeys(lessonObject())[portionKeys(lessonObject()).indexOf(state.step)+1]??null):state.step;}
 submitting=true;answerPhase='advancing';updateQuestionPrimary();
 try{await saveChain.catch(()=>{});const saved=await api('progress',continueTarget,owner);if(owner!==state.user||root.querySelector('#practice')!==scope)return;state.data.learner.resumes[state.lessonId]=saved;state.data.learner.lastLessonId=state.lessonId;const target=continueTarget;state.step=lessonObject().compositionVersion===2?(target.componentId??'complete'):target.step;state.question=target.question;state.practiceIds=target.practiceIds;clearQuestionAnswer();setRoute();render();focusHeading();}
 catch(error){if(owner===state.user&&root.querySelector('#practice')===scope){answerPhase='advance-error';answerRecovery('Your next position was not saved. Retry continuing.','continue-recovery');updateQuestionPrimary();}throw error;}finally{submitting=false;}
}

function insertKey(value,backspace=false) {
  const input=document.querySelector('#answer');if(!input || state.result)return;
  let start=input.selectionStart,end=input.selectionEnd;if(backspace&&start===end)start=Math.max(0,start-1);
  input.value=input.value.slice(0,start)+(backspace?'':value)+input.value.slice(end);input.focus();input.setSelectionRange(start+(backspace?0:value.length),start+(backspace?0:value.length));state.answer=input.value;scheduleSave();
}
async function updatePreference(key,value) { await api('preferences',{[key]:value});await load(); }
const learnerActions=new Set(['choice','check','sentence-mode','self-approve','token','remove-token','next-question','retry-question','inline-choice','review-reveal','review-rate','save-answer-position','recover-attempt','retry-continuing','key','backspace','cursor']);
function learnerControlsActive(){return !state.panel&&!rehearsal&&!document.querySelector('dialog[open]')&&root.querySelector('.nav-shell')?.dataset.courseOverlay!=='true'&&!root.querySelector('#main-content')?.hasAttribute('inert');}
function reviewStatus(text){
 let status=root.querySelector('[data-review-save-status]');if(!status){status=document.createElement('p');status.dataset.reviewSaveStatus='';status.setAttribute('role','status');(root.querySelector('.review-surface,.review-card')||root.querySelector('#main-content'))?.append(status);}
 if(status){status.textContent=text;if(text.includes('unconfirmed')||text.includes('refresh is incomplete')||text.includes('need recovery')){const check=document.createElement('button');check.textContent='Check saved review';check.onclick=()=>act('review-reconcile').catch(e=>toast(e.message));status.append(check);}}
 root.querySelectorAll('[data-action="review-rate"],[data-action="review-reveal"]').forEach(el=>el.disabled=!!reviewSave?.blocked);
}
function reviewKey(key){if(state.page!=='review'||!state.reviewSession||state.panel||rehearsal||submitting||reviewSave?.blocked||reviewRevealPending||document.querySelector('dialog[open],[role="dialog"]')||!learnerControlsActive())return;const selector=key==='reveal'?'[data-action="review-reveal"]':state.revealReview?'[data-action="review-rate"][data-value="'+key+'"]':null;if(selector)learnerElements(selector)[0]?.click();}
mountReviewKeys({document,active:()=>state.page==='review'&&!!state.reviewSession&&!state.panel&&!rehearsal&&!document.querySelector('dialog[open],[role="dialog"]'),onShortcut:reviewKey});
async function act(action,value,source) {
  if(pendingApproval&&!['self-approve','audio'].includes(action))return;
  if(reviewSave?.blocked&&['review-start','review-reveal','review-rate'].includes(action)){reviewPendingStatus();return;}


  if((submitting||pendingAttempt)&&['page','lesson','outline','step','latest-lesson','lesson-practice','retry-question','target-practice','mode','sentence-mode','token','remove-token','choice','concept','inline-concept-close'].includes(action))return;
  if(learnerActions.has(action)&&(!learnerControlsActive()||source&&!activeLearnerDestination(source,true)))return;
  if(action==='author-inline'||action==='author-comments'){await openInlineAuthor(action==='author-inline');return;}
  if(action==='author-exit'){inlineState().active=false;render();return;}
  if(action==='skip-content'){root.querySelector('#main-content')?.focus({preventScroll:true});return;}
  if(action==='navigation-toggle'){toggleNavigation(value);return;}
  if(action==='navigation-close'){closeNavigation();root.querySelector('[data-action="navigation-toggle"]')?.focus();return;}
  if(action==='reply-cancel'){const form=root.querySelector('[data-question-answer="'+value+'"]');if(form){state.replyDrafts[value]=form.querySelector('[name=answer]').value;form.closest('details').open=false;state.replyOpen[value]=false;form.closest('details').querySelector('summary').focus();}return;}
  if(action==='word-discussion'){await openLesson(value);closePanel();root.querySelector('#lesson-comments')?.scrollIntoView({block:'start'});return;}
  if(action==='studio-choose-lesson'){state.studioTask='lesson';applyStudioTask();window.HebleoKeyboard?.close?.();studioWorkspace?.unified.openLessonPicker(source);return;}
  if(action==='studio-task'){state.studioTask=value;if(value==='versions'&&!state.studio.preview){const owner=state.user,latest=await api('studio',undefined,owner);if(state.user!==owner||state.page!=='studio')return;const workspace=ensureAuthorContext(state.studio);if(workspace.pending||latest.revisionId!==workspace.baseRevisionId||(latest.draft?.draftToken??null)!==workspace.expectedDraftToken){toast('Saved state changed. Compare and reconcile before reviewing history.');return;}state.studio={...state.studio,preview:latest.preview,history:latest.history};const template=document.createElement('template');template.innerHTML=studio();const versions=root.querySelector('#studio-pane-versions');versions.replaceChildren(...template.content.querySelector('#studio-pane-versions').childNodes);bind(versions);}applyStudioTask();syncKeyboard();if(value==='comments'){refreshComments();mountStudioPrivateComments();}return;}
  if(action==='studio-save'){root.querySelector('[data-save-workspace]')?.click();return;}
  if(action==='comment-page'){state.discussionPage=Math.max(0,Number(value));refreshComments();return;}
  if(action==='lesson-practice'){await openLesson(value);await act('target-practice');return;}
  if(action==='latest-lesson'){await flushSave();await api('session/latest',{lessonId:state.lessonId});state.session=null;await openLesson(state.lessonId);return;}
  if(action==='page'){if(value!==state.page&&!(value==='studio'&&inlineActive()&&!authorContext.workspace.pending)&&!await guardStudioDeparture('Leave Studio'))return;disposeTextReaders();rememberComposers();closeNavigation();await flushSave();closePanel();stopMedia();state.page=value;state.reviewSession=null;state.revealReview=false;state.search='';await load();setRoute();render();focusHeading();return;}
  if(action==='lesson'){await openLesson(value);return;}
  if(action==='outline'){closeNavigation();const [id,step]=value.split('|');if(id!==state.lessonId){await openLesson(id,step);return;}action='step';value=step;}
  if(action==='step'){if(value===state.step || !portionKeys(lessonObject()).includes(value))return;
  const forward=portionKeys(lessonObject()).indexOf(value)>portionKeys(lessonObject()).indexOf(state.step);
  const gated=()=>(value==='complete'&&!lessonTextReady())||(forward&&(source?.closest('.lesson-footer')||source?.matches('[data-text-reader]'))&&currentKind()==='learn'&&!lessonTextReady(state.step));
  const refuse=()=>{toast('Complete the required text-page activities before continuing.');root.querySelector('[data-reader-heading]')?.focus();};
  if(gated()){refuse();return;}
  // A later portion request supersedes an earlier continuation even while both wait for the same save.
  textReaderGeneration++;
  let isCurrent=captureTextDestination();
  const previous={step:state.step,medium:state.medium,question:state.question,answer:state.answer,matching:state.matching,sentenceMode:state.sentenceMode,selectedTokens:state.selectedTokens,result:state.result,practiceIds:state.practiceIds};
  try{
   if(forward)await settleTextSaves();
   if(!isCurrent())return;
   if(gated()){refuse();return;}
   closePanel();resetQuestion();state.practiceIds=[];state.step=value;state.medium=defaultMedium(portionLesson(lessonObject(),state.step));stopMedia();setRoute();isCurrent=captureTextDestination();
   await queueSave();if(!isCurrent())return;disposeTextReaders();render();focusHeading();
  }catch(error){if(isCurrent()){Object.assign(state,previous);setRoute(true);syncLessonTextGates();throw error;}}return;}
  if(action==='mode'||action==='vocab-view'){await updatePreference(action==='mode'?'nikkud':'vocabularyView',value);render();return;}
  if(action==='keyboard-open'){window.HebleoKeyboard?.open(document.querySelector('#answer'));return;}
  if(action==='inline-choice'){const [i,j]=value.split('|').map(Number),item=portionLesson(lessonObject(),state.step).interactions[i];document.querySelector('#inline-feedback-'+i).textContent=(item.correctIndex===j?'Correct. ':'Try again. ')+item.feedback;return;}
  if(action==='author-lesson'){state.authorLessonId=value;render();return;}
  if(action==='medium'){if(source?.closest('#inline-concept'))changeConceptMedium(value);else{state.medium=value;render();}return;}
  if(action==='note-open'){replacePanel({type:'word',id:value});document.querySelector('#personal-note')?.focus();return;}
  if(action==='lookup'){replacePanel({type:'word',id:value});return;}
  if(action==='exercise-lookup'){if(!currentExercise()?.allowLookup&&!state.result)return;replacePanel({type:'lookup'});return;}
  if(action==='concept'){inlineConcept();return;}
  if(action==='inline-concept-close'){inlineConcept(false);return;}
  if(action==='source-page'){const owner=state.data.content;await refreshSourceLibrary(Number(value));if(state.page==='library'&&state.libraryMode==='source'&&owner===state.data.content&&!lexicalError){const start=root.querySelector('.lexical-library-status');start?.focus({preventScroll:true});start?.scrollIntoView({block:'start',behavior:'auto'});}return;}
  if(action==='shared-search'||action==='shared-page'){state.sharedSearch=document.querySelector('#shared-search').value;state.sharedView=await api('shared-cards?'+new URLSearchParams({search:state.sharedSearch,offset:action==='shared-page'?value:0}));render();return;}
  if(action==='library-mode'){clearTimeout(lexicalSearchTimer);lexicalRequest++;lexicalLoading=false;lexicalError='';state.libraryMode=value;state.search='';if(value==='shared'){state.sharedSearch='';state.sharedView=state.data.sharedCollection;}render();if(value==='source')await refreshSourceLibrary();else if(value!=='shared')await refreshLexicalLibrary();return;}
  if(action==='library-clear'){state.search='';state.libraryPage=0;render();scheduleLexicalLibrary(0);root.querySelector('#library-search')?.focus();return;}
  if(action==='help'||action==='help-word'){await authoredHelp(action==='help-word'?value:undefined);return;}
  if(action==='panel-close'){closePanel();return;}
  if(action==='audio'){await playAudio(value,pref().audioSpeed);syncReferenceControls(document,getPlaybackState());return;}
  if(action==='record'){const owner=state.user,page=state.page,panel=state.panel,section=source?.closest('[data-pronunciation-word]'),id=section?.dataset.pronunciationWord;if(!id)return;await recordVoice(status=>{if(owner!==state.user||page!==state.page||panel!==state.panel||![...document.querySelectorAll('[data-pronunciation-word]')].some(el=>el.dataset.pronunciationWord===id))return;state.recording=status;updateVoiceStatus();});return;}
  if(action==='record-stop'){stopRecording();return;}
  if(action==='voice-replay'){await replayVoice();return;}
  if(action==='bookmark'||action==='enroll'){
    rememberNote();const panel=state.panel,owner=panel?.type==='word'?panel.owner:state.user;
    await api(action==='bookmark'?'preferences':'enroll',action==='bookmark'?{bookmark:value}:{wordId:value},owner);
    if(state.user!==owner)return;await load();if(state.user!==owner)return;if(action==='enroll')toast('Word added to review.');if(state.panel===panel&&panel?.type==='word')refreshWordStatus(panel);else if(!state.panel)render();return;
  }
  if(action==='save-panel-note'){
    const field=document.querySelector('#personal-note');if(!field||field.dataset.noteWord!==value)return;rememberNote();const panel=state.panel,owner=field.dataset.noteOwner,key=noteKey(owner,value),saved=field.value;field.readOnly=true;
    try{await api('preferences',{note:{wordId:value,text:saved}},owner);rememberNote();if(state.noteDrafts[key]?.text===saved)delete state.noteDrafts[key];if(state.user!==owner)return;await load();if(state.user===owner&&state.panel===panel){closePanel();delete state.noteDrafts[key];render();toast('Your private note is saved beside this word.');}}
    finally{if(field.isConnected)field.readOnly=false;}return;
  }
  if(action==='choice'){if(state.result||submitting)return;state.answer=value;root.querySelectorAll('[data-action="choice"]').forEach(el=>el.classList.toggle('selected',el.dataset.value===value));root.querySelector('[data-answer-commit]')?.focus({preventScroll:true});if(pref().immediateAnswers)await submitAnswer();else await queueSave();return;}
  if(action==='check'){await submitAnswer();return;}
  if(action==='recover-attempt'){await submitAnswer(true);return;}
  if(action==='self-approve'){await approveSentenceAnswer();return;}
  if(action==='save-answer-position'){await saveAnswerPosition();return;}
  if(action==='retry-continuing'){await continueQuestion();return;}
  if(action==='sentence-mode'){if(state.result||submitting||currentExercise()?.type!=='ordering'||!['simple','complex'].includes(value))return;state.sentenceMode=value;render();scheduleSave();root.querySelector('[data-action="sentence-mode"][aria-pressed="true"]')?.focus({preventScroll:true});return;}
  if(action==='token'){if(state.result||submitting)return;state.selectedTokens.push(Number(value));render();scheduleSave();return;}
  if(action==='remove-token'){if(state.result||submitting)return;state.selectedTokens.splice(Number(value),1);render();scheduleSave();return;}
  if(action==='next-question'){await continueQuestion();return;}
  if(action==='retry-question'){
    if(submitting || !questionProgress(lessonObject()).missedIds.includes(value))return;
    await flushSave();closePanel();
    if(currentExercise()?.id===value && state.result&&!state.result.correct)clearQuestionAnswer();
    else{state.step=practicePortion();resetQuestion();state.practiceIds=[value];}
    setRoute();await queueSave();render();focusHeading();document.querySelector('#answer,#practice [data-action="choice"],#practice .match-tile,#practice [data-action="token"]')?.focus({preventScroll:true});return;
  }
  if(action==='target-practice'){const result=await api('practice',{revisionId:state.session.revisionId,lessonId:state.lessonId});if(!result.exerciseIds.length){toast('This lesson has no authored questions.');return;}closePanel();state.step=practicePortion();resetQuestion();state.practiceIds=result.exerciseIds;toast('Repeating '+result.exerciseIds.length+' authored questions from this lesson.');setRoute();await queueSave();render();focusHeading();return;}
  if(action==='report-open'){if(state.result)replacePanel({type:'report'});return;}
  if(action==='lexical-page'){if(state.page==='library'){await refreshLexicalLibrary(Number(value));return;}const c=content(),view=c.lexicalView;c.lexicalView=await api('lexical?lessonId='+encodeURIComponent(view.lessonId)+'&offset='+Number(value));render();return;}
  if(action==='library-page'){state.libraryPage=Math.max(0,Number(value));render();return;}
  if(action==='review-demo'){const candidates=state.data.content.words.filter(w=>!w.noCard).slice(0,3);for(const w of candidates)if(!state.data.learner.cards[w.id])await api('enroll',{wordId:w.id});await load();render();toast('Existing synthetic words are ready for review.');return;}
  if(action==='review-start'){
    reviewRevealPending=null;
    await (await ensureReviewOutbox()).clock();
    const limit=Number(document.querySelector('#review-limit').value),type=document.querySelector('#review-type').value;await api('preferences',{reviewLimit:limit,reviewType:type});await load();
    const ids=state.data.due.filter(({word:w})=>w.shared|| (type==='listening'?audioURL(w.audio):type==='sentence'?w.examples?.length:true)).slice(0,limit).map(({word:w})=>w.id);
    if(!ids.length){toast('No due cards have the source audio or examples needed for this presentation.');return;}state.reviewSession={ids,index:0,type,ratings:[]};state.revealReview=false;render();return;
  }
  if(action==='review-reveal'){
    if(reviewRevealPending||reviewSave?.blocked)return;
    const operation={owner:state.user,session:state.reviewSession,index:state.reviewSession?.index,card:reviewWord()?.id,frame:sharedFrame};
    if(!operation.session||!operation.card)return;reviewRevealPending=operation;
    try{
      if(operation.frame)await operation.frame.flush();
      if(reviewRevealPending!==operation||state.user!==operation.owner||state.reviewSession!==operation.session||state.reviewSession.index!==operation.index||reviewWord()?.id!==operation.card||sharedFrame!==operation.frame||reviewSave?.blocked)return;
      state.revealReview=true;render();root.querySelector('[data-action="review-rate"]')?.focus();
    }finally{if(reviewRevealPending===operation)reviewRevealPending=null;}
    return;
  }
  if(action==='review-resolve-rejected'){
   const save=reviewSave,owner=state.user,session=state.reviewSession;const data=await api('bootstrap',undefined,owner);
   if(state.user!==owner||reviewSave!==save||state.reviewSession!==session)return;
   const intent=await save.resolveRejected(value,data);if(state.user!==owner||reviewSave!==save||state.reviewSession!==session)return;
   state.data=data;reviewDueSource=data.due;overlayReviews();const eligible=state.data.due.some(x=>x.word.id===intent.cardId);
   if(session){session.ratings=session.ratings.filter(id=>id!==intent.requestId);if(eligible)session.ids.splice(session.index,0,intent.cardId);}
   state.revealReview=false;render();
   const card=data.learner.cards[intent.cardId];toast(eligible?'Rating was not applied. The card is ready for a new choice.':!card?'Rating was not applied. This card is no longer available.':card.suspended?'Rating was not applied. This card is suspended.':Date.parse(card.due)>data.reviewClock?'Rating was not applied. This card is not due yet.':'Rating was not applied. A sibling restriction currently excludes this card.');return;
  }
  if(action==='review-reconcile'){await reviewSave?.reconcile();return;}
  if(action==='review-rate'){
    if(reviewRevealPending||reviewSave?.blocked)return;const w=reviewWord();if(!w||!state.revealReview)return;
    const owner=state.user,session=state.reviewSession,index=session.index,ids=[...session.ids];
    const save=await ensureReviewOutbox(),frame=sharedFrame;await frame?.flush();
    if(state.user!==owner||state.reviewSession!==session||session.index!==index||reviewWord()?.id!==w.id)return;
    const captured=await save.commit({requestId:uid(),cardId:w.id,rating:Number(value)});
    if(state.user!==owner||state.reviewSession!==session||reviewSave!==save)return;
    reviewUndoQueue={session,ids,index,requestId:captured.requestId};session.ratings.push(captured.requestId);
    session.index=Math.max(session.index,index+1);
    while(session.index<session.ids.length&&save.excluded(session.ids[session.index],reviewGroup(session.ids[session.index])))session.index++;
    clearRecording();state.recording='empty';state.revealReview=false;overlayReviews();render();reviewPendingStatus();return;
  }
  if(action==='review-undo'){
   const owner=state.user,session=state.reviewSession,save=reviewSave,pause=await save.pauseCapture();
   const snapshot=save.snapshot(),selectedId=snapshot.pending.at(-1)?.intent.requestId||snapshot.overlays.at(-1)?.requestId||state.data.learner.lastReview?.requestId;
   const current=()=>state.user===owner&&state.reviewSession===session&&reviewSave===save;
   try{
    await save.drain();await pause.assertOwned();if(!current()||!selectedId)return;
    await load();await pause.assertOwned();if(!current())return;
    const last=state.data.learner.lastReview;
    if(!last||last.requestId!==selectedId)throw Error('The latest rating changed. Reopen review before Undo.');
    await pause.assertOwned();
    await api('review/undo',{requestId:selectedId},owner,{},undefined,{signal:pause.signal});
    await save.clearOverlays(selectedId);if(!current())return;
    if(reviewUndoQueue?.requestId===selectedId&&reviewUndoQueue.session===session){session.ids=reviewUndoQueue.ids;session.index=reviewUndoQueue.index;}
    clearRecording();state.recording='empty';if(session){session.ratings=session.ratings.filter(id=>id!==selectedId);const index=session.ids.indexOf(last.wordId);if(index>=0)session.index=index;}
    state.revealReview=false;await load();await pause.assertOwned();if(!current())return;
    await save.clock([last.wordId]);await pause.assertOwned();if(!current())return;
    await pause();render();toast('Previous review schedule restored.');
   }finally{await pause();}return;
  }
  if(action==='review-end'){reviewRevealPending=null;clearRecording();state.recording='empty';state.reviewSession=null;state.revealReview=false;render();void refreshReviewDue().catch(error=>toast(error.message));return;}
  if(action==='studio-word'){state.wordId=value;render();return;}
  if(action==='report-resolve'){const [userId,requestId,status]=value.split('|');await api('reports/resolve',{userId,requestId,status});await load();render();return;}
  if(action==='comment-moderate'){const owner=state.user,[userId,requestId,choice]=value.split('|');rememberComposers();await api('questions/moderate',{userId,requestId,action:choice},owner);if(state.user!==owner)return;if(choice==='remove'){state.questions=state.questions.filter(q=>q.userId!==userId||q.requestId!==requestId);refreshComments();}await load();if(state.user===owner){refreshComments();toast(choice==='keep'?'Comment kept.':'Comment removed from learner discussion.');}return;}
  if(action==='publish'){if(!await guardStudioDeparture('Review publication of the selected saved lesson'))return;openSelectedLessonPublication(state.authorLessonId);return;}
  if(action==='rollback'){let token=await settledDraftToken();if(!await guardStudioDeparture('Restore this published version',result=>token=result.draftToken))return;await api('studio/rollback',{baseRevisionId:state.studio.revisionId,expectedDraftToken:token,revisionId:Number(value)});await load();disposeStudioMounts();authorContext=null;inlineAuthorStates.clear();toast('Content restored; learner progress retained.');render();return;}
  if(action==='studio-reload'){if(!await guardStudioDeparture('Reload the saved draft'))return;await settledDraftToken();await load();disposeStudioMounts();authorContext=null;inlineAuthorStates.clear();render();toast('Saved draft reloaded. Unsaved form edits were discarded.');return;}
  if(action==='rehearse'){await startRehearsal(value);return;}
  if(action==='export-content'||action==='export-backup'){download(action==='export-content'?'hebleo-content.json':'hebleo-demo-backup.json',await api(action==='export-content'?'content':'export'));return;}
  if(action==='restore'){const file=document.querySelector('#restore-file').files[0];if(!file)throw new Error('Choose a demo backup first.');if(file.size>BACKUP_BYTE_LIMIT)throw new Error('Backup exceeds the 200 MB restore limit.');if(!await askConfirmation('Restore fictional demo profiles and published content from this backup?','Restore backup'))return;await api('restore',JSON.parse(await file.text()));await load();toast('Local backup restored.');render();return;}
  if(action==='save-goal'){await api('preferences',{goal:Number(document.querySelector('#goal').value)});await load();toast('Goal saved.');return;}
  if(action==='event'){await api('demo/event',{eventId:uid(),type:value});await load();render();return;}
}
function askConfirmation(message,action){
 window.HebleoKeyboard?.close();const previous=document.activeElement,dialog=document.createElement('dialog');dialog.className='confirmation-dialog';dialog.setAttribute('aria-labelledby','confirmation-title');dialog.innerHTML='<h2 id="confirmation-title">'+esc(action)+'</h2><p>'+esc(message)+'</p><div class="button-row"><button type="button" class="button outline" data-confirm-cancel>Cancel</button><button type="button" class="button danger" data-confirm-accept>'+esc(action)+'</button></div>';document.body.append(dialog);
 return new Promise(resolve=>{const finish=value=>{dialog.close();dialog.remove();previous?.focus?.({preventScroll:true});resolve(value);};dialog.querySelector('[data-confirm-cancel]').onclick=()=>finish(false);dialog.querySelector('[data-confirm-accept]').onclick=()=>finish(true);dialog.addEventListener('cancel',event=>{event.preventDefault();finish(false);});dialog.showModal();dialog.querySelector('[data-confirm-cancel]').focus();});
}
function download(name,value){const serialized=name==='hebleo-demo-backup.json'?serializeBackup(value):JSON.stringify(value,null,2);const url=URL.createObjectURL(new Blob([serialized],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function bind(scope=root) {
  if(scope===root)mountExerciseReminders(scope.querySelector('#practice'));
  if(scope===root){lexicalBinding?.destroy();lexicalBinding=scope.querySelector('.lexical-vocabulary')?bindLexicalVocabulary(scope,{encounters:{has:token=>{try{return localStorage.getItem('hebleo-note-seen:'+state.user+':'+token)==='1';}catch{return false;}},mark:token=>{try{localStorage.setItem('hebleo-note-seen:'+state.user+':'+token,'1');}catch{}}}}):null;}
  scope.querySelector('[data-studio-departure]')?.addEventListener('click',async event=>{event.preventDefault();const href=event.currentTarget.href;if(await guardStudioDeparture('Open Google connection setup'))location.assign(href);});
  scope.querySelector('.studio-task-menu')?.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;const tabs=[...event.currentTarget.querySelectorAll('[role="tab"]')],index=tabs.indexOf(document.activeElement);if(index<0)return;event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[next].focus();tabs[next].click();});
  scope.querySelectorAll('.reply-composer').forEach(el=>el.addEventListener('toggle',()=>{const key=el.querySelector('form').dataset.questionAnswer;state.replyOpen[key]=el.open;if(el.open)el.querySelector('textarea').focus({preventScroll:true});}));
  syncAudioControls(scope,pref().audioSpeed,getPlaybackState());bindResultExplanations(scope);
  scope.querySelector('.lesson-toc')?.addEventListener('toggle',event=>{state.outlineOpen=event.target.open;});
  scope.querySelectorAll('[data-lesson-comment]').forEach(form=>form.addEventListener('submit',event=>{event.preventDefault();postComment(form);}));
  scope.querySelectorAll('[data-audio-speed]').forEach(el=>el.addEventListener('change',async()=>{const speed=Number(el.value),owner=state.user;try{await updatePreference('audioSpeed',speed);if(owner!==state.user)return;setPlaybackSpeed(speed);syncAudioControls(root,speed,getPlaybackState());const panel=document.querySelector('#context-panel');if(panel)syncAudioControls(panel,speed,getPlaybackState());}catch(error){if(owner!==state.user)return;syncAudioControls(scope,pref().audioSpeed,getPlaybackState());toast(error.message);}}));
  bindMatching(scope,(id,meaning)=>{if(!learnerControlsActive()||!activeLearnerDestination(scope.querySelector('.matching-game')))return;state.matching=matchWord(state.matching,id,meaning);queueSave().catch(()=>{});render();});
  scope.querySelector('#review-nikkud')?.addEventListener('change',async event=>{try{await updatePreference('reviewNikkud',event.target.value);}catch(error){toast(error.message);}});

  scope.querySelectorAll('[data-question-answer]').forEach(form=>form.addEventListener('submit',async event=>{event.preventDefault();const key=form.dataset.questionAnswer;if(state.replyPending[key])return;const text=form.querySelector('[name=answer]'),save=form.querySelector('button');state.replyPending[key]=true;state.replyErrors[key]='';text.readOnly=true;save.disabled=true;try{const [userId,requestId]=key.split('|');await api('questions/answer',{userId,requestId,answer:text.value});delete state.replyDrafts[key];form.closest('details').open=false;state.replyOpen[key]=false;state.replyPending[key]=false;await load();text.value=state.questions.find(q=>q.userId+'|'+q.requestId===key)?.answer||'';refreshComments();toast('Author reply saved.');}catch(error){state.replyErrors[key]=error.message;const live=[...root.querySelectorAll('[data-question-answer]')].find(f=>f.dataset.questionAnswer===key);if(live)live.querySelector('[data-reply-status]').textContent=error.message;}finally{state.replyPending[key]=false;const live=[...root.querySelectorAll('[data-question-answer]')].find(f=>f.dataset.questionAnswer===key);if(live){live.querySelector('[name=answer]').readOnly=false;live.querySelector('button').disabled=false;}}}));
  Array.from(scope.querySelectorAll('[data-action]')).filter(el=>!el.closest('#hebleo-keyboard-root')).forEach(el=>el.addEventListener('click',async event=>{event.preventDefault();if(el.disabled||learnerActions.has(el.dataset.action)&&!activeLearnerDestination(el))return;const transient=!['audio','studio-choose-lesson'].includes(el.dataset.action);if(transient)el.disabled=true;try{await act(el.dataset.action,el.dataset.value,el);}catch(error){toast(error.message);}finally{if(el.isConnected&&transient)el.disabled=['review-rate','review-reveal','review-undo'].includes(el.dataset.action)&&reviewSave?.blocked?true:el.dataset.action==='record'?state.recording==='recording':el.dataset.action==='record-stop'?state.recording!=='recording':['check','choice','sentence-mode','token','remove-token'].includes(el.dataset.action)&&Boolean(state.result||submitting||pendingAttempt);}}));
  scope.querySelectorAll('[data-action="key"],[data-action="backspace"],[data-action="cursor"]').forEach(el=>el.addEventListener('pointerdown',event=>event.preventDefault()));
  scope.querySelector('#answer')?.addEventListener('input',event=>{state.answer=event.target.value;scheduleSave();});
  scope.querySelectorAll('[data-match]').forEach(el=>el.addEventListener('change',()=>{state.matching[el.dataset.match]=el.value;scheduleSave();}));
  scope.querySelector('#demo-user')?.addEventListener('change',async event=>{const next=event.target.value;event.target.value=state.user;if(submitting||pendingAttempt)return;try{if(next===state.user||!await guardStudioDeparture('Change demo profile'))return;disposeTextReaders();rememberComposers();rememberNote();await flushSave();closePanel();clearRecording();authorContext=null;inlineAuthorStates.clear();state.user=next;localStorage.setItem('hebleo-demo-user',state.user);state.page='home';state.session=null;state.reviewSession=null;resetQuestion();await load();setRoute();render();}catch(error){toast(error.message);}});
  scope.querySelector('#library-search')?.addEventListener('input',event=>{const position=event.target.selectionStart;state.search=event.target.value;state.libraryPage=0;render();if(!event.isComposing)scheduleLexicalLibrary();const el=document.querySelector('#library-search');el.focus();el.setSelectionRange(position,position);});
  for(const [id,key] of [['source-category','sourceCategory'],['source-lesson','sourceLesson'],['library-tag','libraryTag'],['library-lesson','libraryLesson'],['library-state','libraryState']])scope.querySelector('#'+id)?.addEventListener('change',event=>{state[key]=event.target.value;state.libraryPage=0;render();scheduleLexicalLibrary(0);});
  scope.querySelectorAll('[data-preference]').forEach(el=>el.addEventListener('change',async()=>{try{await updatePreference(el.dataset.preference,el.checked);render();}catch(error){toast(error.message);}}));
  scope.querySelector('#audio-speed')?.addEventListener('change',async event=>{try{await updatePreference('audioSpeed',Number(event.target.value));setPlaybackSpeed(pref().audioSpeed);syncAudioControls(scope,pref().audioSpeed,getPlaybackState());}catch(error){toast(error.message);}});
  scope.querySelector('#report-form')?.addEventListener('submit',async event=>{event.preventDefault();const el=event.target.querySelector('button');el.disabled=true;try{await api('report',{requestId:uid(),attemptId:state.result.requestId,...Object.fromEntries(new FormData(event.target))});closePanel();toast('Report saved for author review.');}catch(error){toast(error.message);}finally{el.disabled=false;}});
  scope.querySelector('#help-form')?.addEventListener('submit',async event=>{event.preventDefault();const question=new FormData(event.target).get('question'),el=event.target.querySelector('button'),p=state.panel;el.disabled=true;try{const response=await api('help',{...p.context,question,useAI:true});if(state.panel===p)replacePanel({...p,...response,question});}catch(error){toast(error.message);}finally{if(el.isConnected)el.disabled=false;}});
  scope.querySelectorAll('video[data-start]').forEach(el=>el.addEventListener('loadedmetadata',()=>{el.currentTime=Math.min(Number(el.dataset.start),el.duration||Number(el.dataset.start));},{once:true}));
}
window.addEventListener('hebleo-reference-state',event=>syncReferenceControls(document,event.detail));
// Learner shortcuts never reach a disposable rehearsal (data-preview-root); it handles its own keys.
function activeLearnerDestination(el,allowDisabled=false){
 if(!el?.isConnected||el.disabled&&!allowDisabled||el.closest('[data-preview-root],[hidden],[inert],[aria-hidden="true"],.app-header,#course-navigation'))return false;
 for(let parent=el;parent;parent=parent.parentElement){if(parent.tagName==='DETAILS'&&!parent.open)return false;const style=window.getComputedStyle(parent);if(style.display==='none'||style.visibility==='hidden'||style.visibility==='collapse')return false;}
 return learnerControlsActive();
}
const learnerElements=selector=>Array.from(root.querySelectorAll(selector)).filter(el=>activeLearnerDestination(el));
window.addEventListener('resize',()=>applyNavigation());navigationMotion?.addEventListener?.('change',()=>applyNavigation());
document.addEventListener('keydown',event=>{if(state.page==='review'&&state.reviewSession&&([' ','1','2','3','4'].includes(event.key)))return;exerciseDockBinding?.refresh?.();
  const navigationShell=root.querySelector('.nav-shell'),navigationOverlays=navigationShell?.dataset.courseOverlay==='true'?[root.querySelector('.app-header'),root.querySelector('#course-navigation')]:[];
  if(navigationOverlays.length&&!document.querySelector('dialog[open]')&&event.key==='Tab'){const controls=navigationOverlays.flatMap(el=>[...el.querySelectorAll('button:not(:disabled),a[href],summary,select:not(:disabled)')]).filter(navigationControlVisible);const first=controls[0],last=controls.at(-1);if(event.shiftKey&&(document.activeElement===first||!controls.includes(document.activeElement))){event.preventDefault();last?.focus();return;}if(!event.shiftKey&&(document.activeElement===last||!controls.includes(document.activeElement))){event.preventDefault();first?.focus();return;}}
  if(event.key==='Escape'&&!document.querySelector('dialog[open]')){const shell=root.querySelector('.nav-shell');if(shell?.dataset.mainOverlay==='true'||shell?.dataset.courseOverlay==='true'){event.preventDefault();act('navigation-close');return;}}

  if(!learnerControlsActive()||event.target.closest?.('.app-header,#course-navigation,[hidden],[inert],[aria-hidden="true"]')||rehearsal||event.defaultPrevented||event.target.closest?.('[data-preview-root],[data-text-reader]')||event.isComposing||event.ctrlKey||event.altKey||event.metaKey)return;
  const typing=/^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)||event.target.isContentEditable;
  if(typing){
    if(event.target.id==='answer'&&!state.result&&activeLearnerDestination(event.target)){
      if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();learnerElements('[data-action="check"]')[0]?.click();return;}

    }
    return;
  }
  if(state.panel)return;
  if((event.key==='Enter'||event.key===' ')&&['BUTTON','A','SUMMARY'].includes(event.target.tagName))return;
  if(event.key==='Enter'||event.key===' '){const el=learnerElements('[data-action="next-question"],[data-action="check"],[data-action="review-reveal"]')[0];if(el){event.preventDefault();el.click();}}
  if(/^[1-9]$/.test(event.key)){const choices=learnerElements('[data-action="choice"]'),ratings=learnerElements('[data-action="review-rate"]'),el=choices[Number(event.key)-1]||ratings[Number(event.key)-1];if(el){event.preventDefault();el.click();}}
  if(event.key.toLowerCase()==='r'){const el=learnerElements('[data-action="audio-replay"]:not(:disabled)')[0];if(el){event.preventDefault();el.click();}}
});
async function routeFromURL() {
  if(submitting||pendingAttempt){setRoute(true);return;}
  disposeTextReaders();const generation=++routeGeneration,parts=location.hash.slice(1).split('/');
  if(state.page==='studio'&&parts[0]!=='studio'&&!await guardStudioDeparture('Leave Studio through browser history')){setRoute(true);return;}
  rememberComposers();
  try{if(parts[0]==='lesson'&&parts[1]){await openLesson(parts[1],parts[2],true);return;}await flushSave();if(generation!==routeGeneration)return;closePanel();state.page=['home','course','review','library','conjugation','studio','settings'].includes(parts[0])?parts[0]:'home';state.reviewSession=null;await load();render();}catch(error){toast(error.message);}
}
// Keyboard preference changes are learner records; a rehearsal never persists them.
window.addEventListener('hebleo-keyboard-preference',async event=>{if(rehearsal)return;try{await api('preferences',event.detail);await load();}catch(error){toast(error.message);}});
window.addEventListener('popstate',()=>routeFromURL());
window.addEventListener('beforeunload',event=>{if(studioDirty()){event.preventDefault();event.returnValue='';}});
window.addEventListener('pagehide',()=>{practiceHelpBinding?.destroy();practiceHelpBinding=null;conjugationMount?.destroy();conjugationMount=null;clearTimeout(reviewDueTimer);reviewSave?.dispose();disposeTextReaders();if(state.page==='lesson'&&state.session&&!inlineActive()){fetch('/api/progress',{method:'POST',headers:{'content-type':'application/json','x-demo-user':state.user},body:JSON.stringify(progressPayload()),keepalive:true}).catch(()=>{});}});
load().then(routeFromURL).catch(error=>{root.innerHTML='<div class="card empty"><h1>Could not open the demo.</h1><p>'+esc(error.message)+'</p></div>';});

document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&reviewSave)reviewSave.clock().catch(error=>toast(error.message));});

window.addEventListener('pageshow',event=>{if(event.persisted){if(state.page==='conjugation')render();ensureReviewOutbox().then(save=>save.clock()).catch(error=>toast(error.message));}});
