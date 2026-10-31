import {escapeHTML as e} from './editor-fields.js';

// Review stored content only. Opening, changing scope and cancelling never publish.
export function openLessonPublication({document:doc=globalThis.document,workspace,lessonId,title=lessonId,api,onPublished=()=>{},onReconciled=()=>{}}){
 workspace.savedContext();
 const focus=doc.activeElement,dialog=doc.createElement('dialog');
 dialog.className='lesson-publication-dialog';dialog.setAttribute('aria-labelledby','lesson-publication-title');
 dialog.innerHTML='<h2 id="lesson-publication-title">Review & publish</h2><p><strong data-publication-title></strong> <small data-publication-id></small></p><p>Publish reviewed changes to this local demo. Save draft and Preview remain separate.</p><p data-publication-status role="status"></p><div data-publication-review></div><div class="button-row"><button type="button" class="button outline" data-publication-refresh>Review saved draft again</button><button type="button" class="button outline" data-publication-check hidden>Check saved state & reconcile</button><button type="button" class="button primary" data-publication-confirm disabled>Publish reviewed changes</button><button type="button" class="button outline" data-publication-cancel>Cancel</button></div>';
 dialog.querySelector('[data-publication-title]').textContent=title;dialog.querySelector('[data-publication-id]').textContent=lessonId;
 const area=dialog.querySelector('[data-publication-review]'),status=dialog.querySelector('[data-publication-status]'),confirm=dialog.querySelector('[data-publication-confirm]'),refresh=dialog.querySelector('[data-publication-refresh]'),check=dialog.querySelector('[data-publication-check]'),cancel=dialog.querySelector('[data-publication-cancel]');
 let review=null,scope=null,serial=null,generation=0,busy=false,closed=false,includes=[];
 const changes=list=>'<ul>'+list.map(c=>'<li>'+e(c.kind)+' · '+e(c.id)+' · '+e(c.action)+'</li>').join('')+'</ul>';
 const valid=()=>review&&scope&&serial===workspace.version&&!workspace.dirty&&!workspace.pending&&!workspace.writeBlock&&review.baseRevisionId===workspace.baseRevisionId&&review.expectedDraftToken===workspace.expectedDraftToken;
 function sync(){
  if(closed)return;
  confirm.disabled=busy||!valid()||!review.canPublish||review.noChanges;
  refresh.disabled=busy||workspace.dirty||Boolean(workspace.pending)||Boolean(workspace.writeBlock);
  check.hidden=!workspace.writeBlock;check.disabled=busy||Boolean(workspace.pending);
  cancel.disabled=busy;area.querySelectorAll('input').forEach(x=>x.disabled=busy||Boolean(workspace.pending));
  if(!busy&&review&&!valid()&&!workspace.writeBlock)status.textContent='Workspace changed. Save draft and review again; the previous confirmation is no longer valid.';
  if(workspace.writeBlock)status.textContent=workspace.writeBlock;
 }
 function render(){
  area.innerHTML='<h3>Exact publication scope</h3><p>Selected lesson: <strong>'+e(lessonId)+'</strong>. '+review.changes.length+' reviewed object change(s).</p>'+changes(review.changes)+
   '<h3>Required reusable changes</h3>'+(review.requiredDependencies.length?'<p>Choose each required dependency explicitly, then review the resulting scope.</p><ul>'+review.requiredDependencies.map((d,i)=>'<li><label><input type="checkbox" data-publication-dependency="'+i+'" '+(includes.some(x=>x.kind===d.kind&&x.id===d.id)?'checked':'')+'> Include '+e(d.kind)+' · '+e(d.id)+' · '+e(d.action)+'</label><p>'+e(d.reasonPaths.join('; '))+'</p><p>Potential effects on published lessons: '+e(d.potentiallyAffectedPublishedLessons.join(', ')||'none')+'</p></li>').join('')+'</ul>':'<p>No changed reusable dependencies are required.</p>')+
   '<h3>Effects on published lessons</h3><p>'+e(review.affectedPublishedLessons.join(', ')||'None while blocked or unchanged')+'</p>'+
   '<h3>Saved changes left private</h3><p>'+review.remainingSavedChanges.length+' remaining saved difference(s). All other saved lesson objects remain in the draft.</p><details><summary>See remaining changes</summary>'+changes(review.remainingSavedChanges)+'</details>'+
   (review.blockers.length?'<h3>Publication is blocked</h3><ul>'+review.blockers.map(b=>'<li><strong>'+e(b.code)+'</strong> · '+e(b.path||b.id)+'<p>'+e(b.reason)+'</p><p>'+e(b.action)+'</p></li>').join('')+'</ul>':'')+
   '<details><summary>Saved version details</summary><p>Published base '+e(review.baseRevisionId)+'</p><p class="publication-token">'+e(review.expectedDraftToken)+'</p><p class="publication-token">'+e(review.reviewToken)+'</p></details>';
  area.querySelectorAll('[data-publication-dependency]').forEach(input=>input.addEventListener('change',()=>{
   const d=review.requiredDependencies[Number(input.dataset.publicationDependency)];
   includes=includes.filter(x=>!(x.kind===d.kind&&x.id===d.id));if(input.checked)includes.push({kind:d.kind,id:d.id,action:d.action});
   refreshReview();
  }));
 }
 async function refreshReview(){
  const request=++generation;busy=true;review=null;scope=null;status.textContent='Reviewing the selected saved lesson and required dependencies…';sync();
  try{
   const pins=workspace.savedContext();serial=workspace.version;
   const input={baseRevisionId:pins.baseRevisionId,expectedDraftToken:pins.draftToken,lessonId,includeDependencies:includes};
   const result=await api('studio/publish-lesson/review',input);
   if(closed||request!==generation)return;scope=input;review=result;render();
   status.textContent=result.noChanges?'This selected lesson is already published. Other saved changes remain private.':result.canPublish?'Review the scope above. Publish reviewed changes confirms publication to this local demo.':'Resolve the listed blockers or include the explicitly required dependencies, then review again.';
  }catch(error){status.textContent=error.message+' No publication was requested.';}
  finally{if(request===generation){busy=false;sync();}}
 }
 async function publish(){
  if(!valid()||!review.canPublish||review.noChanges||busy)return;
  busy=true;status.textContent='Publishing exactly the reviewed scope…';sync();
  const submitted={...scope,reviewToken:review.reviewToken};
  try{
   const result=await workspace.publishLesson(review,()=>api('studio/publish-lesson',submitted));
   await onPublished(result);review=null;scope=null;area.replaceChildren();
   status.textContent='Published '+lessonId+' to local revision '+result.revisionId+'. '+result.remainingSavedChanges.length+' saved difference(s) remain private.'+(workspace.dirty?' Newer local edits remain unsaved.':'');
   confirm.hidden=true;refresh.hidden=true;cancel.textContent='Close';
  }catch(error){status.textContent=(workspace.writeBlock||error.message)+' Your local edits and private comment drafts are retained. No automatic retry was made.';}
  finally{busy=false;sync();}
 }
 async function reconcile(){
  busy=true;status.textContent='Checking current saved state and reconciling retained local edits…';sync();
  try{const latest=await api('studio');workspace.reconcile(latest);onReconciled(latest);review=null;scope=null;area.replaceChildren();status.textContent='Current local published revision is '+latest.revisionId+'. Local edits were reconciled and remain unsaved. Save draft, then open a fresh review.';confirm.hidden=true;refresh.hidden=true;cancel.textContent='Close';}
  catch(error){status.textContent=error.message+' Local work remains retained; saving stays blocked until reconciliation succeeds.';}
  finally{busy=false;sync();}
 }
 const unsubscribe=workspace.subscribe(sync);
 function close(){if(busy)return;closed=true;generation++;unsubscribe();dialog.close?.();dialog.remove();if(focus?.isConnected)focus.focus({preventScroll:true});}
 cancel.addEventListener('click',close);refresh.addEventListener('click',refreshReview);confirm.addEventListener('click',publish);check.addEventListener('click',reconcile);
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
 doc.body.append(dialog);if(dialog.showModal)dialog.showModal();else dialog.setAttribute('open','');cancel.focus();
 const ready=refreshReview();return {dialog,ready,close,get review(){return review;}};
}
