// One full workspace/base/CAS owner shared by Studio and inline authoring.
import {deriveLessonIndices,validateCurriculum,validateLessonComposition} from '../course.js';
import {validateContentIdentities} from '../content-identity.js';
export function prepareStudioContent(content){
 return prepareCollectedContent(structuredClone(content));
}
function prepareCollectedContent(next){
 next.lessons=next.lessons.map(l=>deriveLessonIndices(next,l));
 validateContentIdentities(next);validateCurriculum(next);for(const l of next.lessons)validateLessonComposition(next,l);return next;
}
export function createStudioWorkspace({content,publishedContent,baseRevisionId,expectedDraftToken=null,saveDraft,getWorkspaceImpact}){
 let value=structuredClone(content),baseline=structuredClone(content),published=publishedContent?structuredClone(publishedContent):null,token=expectedDraftToken,dirty=false,pending=null,version=0,revoked=false,writeBlock=null;
 const publicationCache=new Map();let pendingKind=null;
 const collectors=new Set(),listeners=new Set(),settlers=new Set(),buffers=new Set();let notificationQueued=false;
 const notify=()=>listeners.forEach(fn=>fn());
 const notifySoon=()=>{if(notificationQueued)return;notificationQueued=true;queueMicrotask(()=>{notificationQueued=false;notify();});};
 // Collectors may return a receipt callback for exactly the buffers collected.
 // Capture receipts only for a save; reads never acknowledge unsaved inputs.
 let collecting=false;
 const collect=(receipts)=>{collecting=true;try{for(const fn of collectors){const acknowledge=fn();if(receipts&&typeof acknowledge==='function')receipts.push(acknowledge);}return structuredClone(value);}finally{collecting=false;}};
 const api={
  get baseRevisionId(){return baseRevisionId;},get expectedDraftToken(){return token;},get dirty(){return dirty||buffers.size>0;},get pending(){return pending;},get revoked(){return revoked;},get version(){return version;},get writeBlock(){return writeBlock;},
  publicationState(lessonId){
   if(writeBlock)return writeBlock;
   if(api.dirty)return 'Unsaved edits. Save draft to preview or publish these edits.';
   if(!published)return 'Saved workspace · publication is a separate action.';
   if(!publicationCache.has(lessonId)){
    const saved=baseline.lessons.find(l=>l.id===lessonId),active=published.lessons.find(l=>l.id===lessonId),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
    const referencesEqual=['words','exercises'].every(kind=>{const ids=kind==='words'?saved?.wordIds:saved?.exerciseIds;return (ids||[]).every(id=>same(baseline[kind].find(x=>x.id===id),published[kind].find(x=>x.id===id)));});
    const others=baseline.lessons.some(l=>l.id!==lessonId&&!same(l,published.lessons.find(a=>a.id===l.id)));
    publicationCache.set(lessonId,same(saved,active)&&referencesEqual?'This lesson is published.'+(others?' Other workspace drafts remain private.':''):'Draft saved · not published.');
   }return publicationCache.get(lessonId);
  },
  getContent:collect,
  peekContent:()=>structuredClone(value),
  replace(next,{changed=true}={}){if(pending&&!collecting)throw new Error('Wait for the workspace save.');value=structuredClone(next);if(changed){dirty=true;version++;}if(!collecting)notify();},
  touch(){const changed=!api.dirty;dirty=true;version++;if(changed)notifySoon();},
  // A mounted editor owns only its small buffer. No content read or traversal.
  touchBuffer(key,changed=true){const wasDirty=api.dirty;if(changed)buffers.add(key);else buffers.delete(key);version++;if(wasDirty!==api.dirty)notifySoon();},
  registerSettler(fn){settlers.add(fn);return ()=>settlers.delete(fn);},
  registerCollector(fn){collectors.add(fn);return ()=>collectors.delete(fn);},subscribe(fn){listeners.add(fn);return ()=>listeners.delete(fn);},
  savedContext(){if(writeBlock)throw new Error(writeBlock);if(api.dirty||pending)throw new Error('Save the complete workspace draft before previewing or anchoring a comment.');return {baseRevisionId,draftToken:token};},
  reconcile(latest){
   if(pending)throw new Error('Wait for the workspace save.');
   const merged=mergeWorkspace(baseline,collect(),latest.draft?.content||latest.content);
   baseline=structuredClone(latest.draft?.content||latest.content);published=structuredClone(latest.content);publicationCache.clear();value=merged;baseRevisionId=latest.revisionId;token=latest.draft?.draftToken??null;dirty=true;version++;revoked=false;writeBlock=null;notify();return structuredClone(value);
  },
  async publishLesson(review,commit){
   if(pending)throw new Error('Wait for the current workspace operation.');
   api.savedContext();
   if(review.baseRevisionId!==baseRevisionId||review.expectedDraftToken!==token||!review.canPublish)throw new Error('Saved publication review is stale or blocked. Review again.');
   const serial=version,sentBase=baseRevisionId,sentToken=token,sent=baseline;
   pendingKind='publication';
   pending=Promise.resolve().then(async()=>{
    let result;
    try{
     for(const settle of settlers)await settle();
     if(api.dirty||version!==serial)throw Object.assign(new Error('Workspace changed. Save and review again.'),{status:409});
     result=await commit();
     const receipt=result?.publication,latest=result?.workspace,revision=result?.revisionId;
     const envelope=content=>content&&typeof content==='object'&&!Array.isArray(content)&&content.courseId===sent.courseId&&['words','lessons','exercises'].every(key=>Array.isArray(content[key]));
     const validRevision=Number.isSafeInteger(revision)&&revision>0&&typeof result.noChanges==='boolean'&&result.noChanges===review.noChanges&&(result.noChanges?revision===sentBase:revision>sentBase);
     const validToken=typeof latest?.draft?.draftToken==='string'&&/^dt1-[a-f0-9]{64}$/.test(latest.draft.draftToken)&&(result.noChanges?latest.draft.draftToken===sentToken:latest.draft.draftToken!==sentToken);
     if(!validRevision||!validToken||!envelope(latest?.content)||!envelope(latest?.draft?.content)||!latest.content.lessons.some(l=>l?.id===review.lessonId)||receipt?.scope!=='lesson'||receipt.lessonId!==review.lessonId||receipt.fromBaseRevisionId!==sentBase||receipt.consumedDraftToken!==sentToken||receipt.reviewToken!==review.reviewToken||receipt.publishedContentHash!==review.publishedContentHash||latest.revisionId!==revision||latest.draft.baseRevisionId!==revision||JSON.stringify(latest.draft.content)!==JSON.stringify(sent))throw new Error('Publication receipt needs reconciliation; local work is retained.');
     const local=collect(),merged=mergeWorkspace(sent,local,latest.draft.content);
     baseline=structuredClone(latest.draft.content);published=structuredClone(latest.content);value=merged;baseRevisionId=latest.revisionId;token=latest.draft.draftToken;publicationCache.clear();
     dirty=version!==serial||JSON.stringify(local)!==JSON.stringify(sent);if(!dirty)buffers.clear();writeBlock=null;notify();return result;
    }catch(error){
     if(error.status===403)revoked=true;
     if(result||!Number.isInteger(error.status)||error.status>=500){writeBlock=result?'Publication succeeded, but local adoption needs reconciliation. Your edits are retained.':'Publication result is uncertain. Check the saved state and reconcile before saving or publishing again.';}
     throw error;
    }finally{pending=null;pendingKind=null;notify();}
   });notify();return pending;
  },
  async save(){
   if(writeBlock)throw new Error(writeBlock);
   if(revoked)throw new Error('Author access ended. Your work is retained; restore author access before saving.');
   if(pending){if(pendingKind==='publication')throw new Error('Wait for the selected publication to finish.');return pending;}
   pendingKind='save';
   pending=Promise.resolve().then(async()=>{
    try{
     for(const settle of settlers)await settle();
     const receipts=[],next=prepareCollectedContent(collect(receipts)),serial=version;
     // Private Save validates the full D, but does not review publication impact.
     // Selected publication owns its own dependency/eligibility proof.
     const result=await saveDraft({baseRevisionId,expectedDraftToken:token,content:next});
     baseline=next;publicationCache.clear();if(version===serial){value=next;dirty=false;buffers.clear();}token=result.draftToken;for(const acknowledge of receipts)acknowledge();notify();return result;
    }catch(error){if(error.status===403)revoked=true;throw error;}
    finally{pending=null;pendingKind=null;notify();}
   });notify();return pending;
  }
 };return api;
}

// Explicit three-way reconciliation. Never guess on an overlapping authored edit.
export function mergeWorkspace(base,local,latest,path='workspace'){
 const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 if(same(local,base))return structuredClone(latest);
 if(same(latest,base)||same(local,latest))return structuredClone(local);
 if(Array.isArray(base)&&Array.isArray(local)&&Array.isArray(latest)&&[base,local,latest].every(a=>a.every(x=>x&&typeof x.id==='string'))){
  const ids=a=>a.map(x=>x.id),order=mergeWorkspace(ids(base),ids(local),ids(latest),path+'.order');
  return order.map(id=>mergeWorkspace(base.find(x=>x.id===id),local.find(x=>x.id===id),latest.find(x=>x.id===id),path+'.'+id));
 }
 if([base,local,latest].every(x=>x&&typeof x==='object'&&!Array.isArray(x))){
  const own=(object,key)=>Object.hasOwn(object,key)?object[key]:undefined;
  const result={};for(const key of new Set([...Object.keys(base),...Object.keys(local),...Object.keys(latest)])){const child=mergeWorkspace(own(base,key),own(local,key),own(latest,key),path+'.'+key);if(child!==undefined)Object.defineProperty(result,key,{value:child,enumerable:true,configurable:true,writable:true});}return result;
 }
 throw new Error('Both drafts changed '+path+'. Compare and resolve that field before saving. Local edits are retained.');
}
