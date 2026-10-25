import {escapeHTML as e} from './editor-fields.js';
// Review and CAS stage are distinct. Editing inputs invalidates the reviewed request.
export function mountTextImport(host,{api,getSnapshot,saveDraft,onStaged=()=>{}}){
 const ctl=new host.ownerDocument.defaultView.AbortController();let reviewed=null,busy=false,generation=0;
 host.innerHTML='<section class="card"><h3>Interactive text draft import</h3><p>Import adapted teaching for review. Existing lessons and saved drafts are retained. Publication requires separate human content approval.</p><label>Interactive draft JSON<input type="file" accept=".json,application/json" data-text-import-file></label><label>Explicit canonical word mappings (JSON object, optional)<textarea data-text-import-mappings rows="3" dir="ltr">{}</textarea></label><div class="button-row"><button type="button" class="button secondary" data-text-review>Review text import</button><button type="button" class="button primary" data-text-stage disabled>Stage unpublished drafts</button></div><div data-text-import-result role="status"></div></section>';
 const result=host.querySelector('[data-text-import-result]'),stage=host.querySelector('[data-text-stage]');
 const invalidate=()=>{generation++;reviewed=null;stage.disabled=true;};
 host.addEventListener('input',invalidate,{signal:ctl.signal});host.addEventListener('change',invalidate,{signal:ctl.signal});
 host.addEventListener('click',async event=>{const b=event.target.closest('[data-text-review],[data-text-stage]');if(!b||busy||b.disabled)return;busy=true;
  try{
   const snapshot=getSnapshot();if(snapshot.hasUnsavedChanges)throw new Error('Save workspace edits or reload the saved draft before importing.');
   if(b.matches('[data-text-review]')){
    invalidate();const token=generation,file=host.querySelector('[data-text-import-file]').files?.[0];if(!file)throw new Error('Choose an interactive text draft JSON file.');if(file.size>12000000)throw new Error('Draft file exceeds 12 MB.');
    const input={pack:JSON.parse(await file.text()),wordMappings:JSON.parse(host.querySelector('[data-text-import-mappings]').value||'{}'),baseRevisionId:snapshot.baseRevisionId,expectedDraftToken:snapshot.expectedDraftToken};
    const review=await api('studio/text/import-preview',input);if(ctl.signal.aborted||token!==generation)return;
    result.innerHTML=review.status==='ready-unpublished'?'<p>'+e(review.receipt.lessonCount)+' lessons · '+e(review.receipt.pageCount)+' pages · '+e(review.receipt.targetCount)+' targets. '+e(review.receipt.unresolvedTargetCount)+' targets require canonical mapping. Unpublished only.</p>':'<p>Review required. No content changed.</p><ul>'+review.conflicts.map(c=>'<li>'+e(c.message)+'</li>').join('')+'</ul>';
    if(review.status==='ready-unpublished'){reviewed={...input,content:review.content};stage.disabled=false;}
   }else{
    if(!reviewed)throw new Error('Review the import first.');
    const saved=await saveDraft({baseRevisionId:reviewed.baseRevisionId,expectedDraftToken:reviewed.expectedDraftToken,content:reviewed.content});if(ctl.signal.aborted)return;invalidate();result.textContent='Unpublished text drafts saved. Existing published content and learner progress retained.';await onStaged(saved);
   }
  }catch(error){if(!ctl.signal.aborted){invalidate();result.textContent=error.message;}}
  finally{busy=false;}
 },{signal:ctl.signal});return ()=>ctl.abort();
}
