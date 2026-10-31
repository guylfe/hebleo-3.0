// One full workspace/base/CAS owner shared by Studio and inline authoring.
import {deriveLessonIndices,validateCurriculum,validateLessonComposition} from '../course.js';
import {validateContentIdentities} from '../content-identity.js';
export function prepareStudioContent(content){
 const next=structuredClone(content);next.lessons=next.lessons.map(l=>deriveLessonIndices(next,l));
 validateContentIdentities(next);validateCurriculum(next);for(const l of next.lessons)validateLessonComposition(next,l);return next;
}
export function createStudioWorkspace({content,baseRevisionId,expectedDraftToken=null,saveDraft,getWorkspaceImpact}){
 let value=structuredClone(content),baseline=structuredClone(content),token=expectedDraftToken,dirty=false,pending=null,version=0,revoked=false;
 const collectors=new Set(),listeners=new Set(),settlers=new Set(),buffers=new Set();let notificationQueued=false;
 const notify=()=>listeners.forEach(fn=>fn());
 const notifySoon=()=>{if(notificationQueued)return;notificationQueued=true;queueMicrotask(()=>{notificationQueued=false;notify();});};
 // Collectors may return a receipt callback for exactly the buffers collected.
 // Capture receipts only for a save; reads never acknowledge unsaved inputs.
 let collecting=false;
 const collect=(receipts)=>{collecting=true;try{for(const fn of collectors){const acknowledge=fn();if(receipts&&typeof acknowledge==='function')receipts.push(acknowledge);}return structuredClone(value);}finally{collecting=false;}};
 const api={
  get baseRevisionId(){return baseRevisionId;},get expectedDraftToken(){return token;},get dirty(){return dirty||buffers.size>0;},get pending(){return pending;},get revoked(){return revoked;},get version(){return version;},
  getContent:collect,
  peekContent:()=>structuredClone(value),
  replace(next,{changed=true}={}){if(pending&&!collecting)throw new Error('Wait for the workspace save.');value=structuredClone(next);if(changed){dirty=true;version++;}if(!collecting)notify();},
  touch(){const changed=!api.dirty;dirty=true;version++;if(changed)notifySoon();},
  // A mounted editor owns only its small buffer. No content read or traversal.
  touchBuffer(key,changed=true){const wasDirty=api.dirty;if(changed)buffers.add(key);else buffers.delete(key);version++;if(wasDirty!==api.dirty)notifySoon();},
  registerSettler(fn){settlers.add(fn);return ()=>settlers.delete(fn);},
  registerCollector(fn){collectors.add(fn);return ()=>collectors.delete(fn);},subscribe(fn){listeners.add(fn);return ()=>listeners.delete(fn);},
  savedContext(){if(api.dirty||pending)throw new Error('Save the complete workspace draft before previewing or anchoring a comment.');return {baseRevisionId,draftToken:token};},
  reconcile(latest){
   if(pending)throw new Error('Wait for the workspace save.');
   const merged=mergeWorkspace(baseline,collect(),latest.draft?.content||latest.content);
   baseline=structuredClone(latest.draft?.content||latest.content);value=merged;baseRevisionId=latest.revisionId;token=latest.draft?.draftToken??null;dirty=true;version++;revoked=false;notify();return structuredClone(value);
  },
  async save(){
   if(revoked)throw new Error('Author access ended. Your work is retained; restore author access before saving.');
   if(pending)return pending;
   pending=Promise.resolve().then(async()=>{
    try{
     for(const settle of settlers)await settle();
     const receipts=[],next=prepareStudioContent(collect(receipts)),serial=version;
     const impact=getWorkspaceImpact?await getWorkspaceImpact({baseRevisionId,expectedDraftToken:token,content:next}):null;
     const result=await saveDraft({baseRevisionId,expectedDraftToken:token,content:next,...(impact?.candidateDraftToken?{reviewedDraftToken:impact.candidateDraftToken}:{})});
     baseline=next;if(version===serial){value=next;dirty=false;buffers.clear();}token=result.draftToken;for(const acknowledge of receipts)acknowledge();notify();return result;
    }catch(error){if(error.status===403)revoked=true;throw error;}
    finally{pending=null;notify();}
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
