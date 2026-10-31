import {escapeHTML as e} from '../studio/editor-fields.js';
import {mountMarkdownEditor} from '../studio/markdown-editor.js';
import {mountTextReader} from '../text-reader.js';
import {textPageMedia} from '../learner-view.js';

// IDs are immutable; settings replace only existing authored keys, preserving
// unknown source metadata. The server still validates every full-workspace save.
export function patchAuthorField(content,target,field,value){
 const next=structuredClone(content),l=next.lessons.find(x=>x.id===target.lessonId),b=l?.blocks?.find(x=>x.id===target.componentId),p=b?.textPages?.pages.find(x=>x.id===target.pageId),owner=p||b||l;
 if(!owner)throw new Error('This source block no longer exists.');
 if(field==='activity'){
  const candidate=JSON.parse(value),original=owner.activity;
  if(!candidate||Array.isArray(candidate)||typeof candidate!=='object'||!original||candidate.id!==original.id||candidate.kind!==original.kind)throw new Error('Keep the existing activity ID and kind.');
  const checkIDs=(a,b)=>{if(!a||typeof a!=='object')return;if(a.id!==undefined&&a.id!==b?.id)throw new Error('Activity and item IDs are immutable.');if(Array.isArray(a)){if(!Array.isArray(b)||a.length!==b.length)throw new Error('Keep the existing activity items.');a.forEach((v,i)=>checkIDs(v,b[i]));}else for(const k of Object.keys(a))if(a[k]&&typeof a[k]==='object')checkIDs(a[k],b?.[k]);};checkIDs(original,candidate);
  const merge=(old,edited)=>Array.isArray(old)?old.map((v,i)=>merge(v,edited[i])):old&&typeof old==='object'?Object.fromEntries(Object.keys(old).map(k=>[k,edited[k]===undefined?old[k]:merge(old[k],edited[k])])):edited;
  owner.activity=merge(original,candidate);
 }else if(field==='pageSettings'){
  const settings=JSON.parse(value),allowed=['prompt','options','answer','explanation','durationMs','value','media','gate'];
  if(!settings||typeof settings!=='object'||Array.isArray(settings)||Object.keys(settings).some(k=>!allowed.includes(k)))throw new Error('Keep only the existing page settings fields; page IDs and types stay fixed.');
  Object.assign(owner,settings);
 }else if(field==='options.extraInformation'){
  if(!b)throw new Error('Extra information requires the current source component.');b.options={...b.options,extraInformation:value};
 }else if(['title','html','text','explanation','prompt','extraInformation'].includes(field))owner[field]=value;
 else throw new Error('This field is not editable here.');
 return next;
}
const button=(name,label,disabled=false)=>'<button type="button" class="button small outline" data-author-action="'+name+'" '+(disabled?'disabled':'')+'>'+e(label)+'</button>';
export function mountInlineAuthor(host,{workspace,lessonId,componentId,pageId,api,renderLesson,onPreview,onApply,state={},markdownDependencies,onExit=()=>{},reviewOnly=false}){
 const doc=host.ownerDocument,ctl=new doc.defaultView.AbortController(),statusId='author-status-'+doc.defaultView.crypto.randomUUID();let disposed=false,editor,reader,requestGeneration=0,busy=false,commentBusy=false,comments=[],commentError='',message='',nextCursor=null,total=0;
 state.componentId??=componentId;state.pageId??=pageId;state.raw??={};state.commentBody??='';state.editing??=false;
 const content=()=>reviewOnly?workspace.getContent():workspace.peekContent(),lesson=()=>content().lessons.find(l=>l.id===lessonId),block=()=>lesson()?.blocks?.find(b=>b.id===state.componentId),page=()=>block()?.textPages?.pages.find(p=>p.id===state.pageId),target=()=>({lessonId,componentId:block()?.id??null,pageId:page()?.id??null,activityId:null});
 const rawKey=(field,t=target())=>JSON.stringify([t.componentId,t.pageId,field]);
 const current=()=>!disposed&&host.isConnected;
 function applyRaw(next){for(const [key,value] of Object.entries(state.raw)){const [componentId,pageId,field]=JSON.parse(key);try{next=patchAuthorField(next,{lessonId,componentId,pageId},field,value);}catch(error){throw Object.assign(error,{authorField:field,authorTarget:{componentId,pageId}});}}return next;}
 function flush(){const next=applyRaw(contentWithoutCollect());workspace.replace(next,{changed:false});return next;}
 // Avoid recursively invoking our own collector.
 let collecting=false;
 function contentWithoutCollect(){if(collecting)return snapshot;collecting=true;try{return workspace.getContent();}finally{collecting=false;}}
 let snapshot=workspace.getContent();
 const unregister=reviewOnly?()=>{}:workspace.registerCollector(()=>{if(collecting)return;collecting=true;try{const next=applyRaw(snapshot);workspace.replace(next,{changed:false});snapshot=next;}finally{collecting=false;}});
 function write(field,value){state.raw[rawKey(field)]=value;workspace.touch();message='Unsaved workspace edits.';refreshStatus();}
 function sourceValue(field){const key=rawKey(field);if(Object.hasOwn(state.raw,key))return state.raw[key];if(field==='options.extraInformation')return block()?.options?.extraInformation||'';const owner=page()||block()||lesson();if(field==='pageSettings')return JSON.stringify(Object.fromEntries(['prompt','options','answer','explanation','durationMs','value','media','gate'].filter(k=>Object.hasOwn(owner,k)).map(k=>[k,owner[k]])),null,2);return field==='activity'?JSON.stringify(owner.activity,null,2):owner?.[field]||'';}
 function refreshStatus(){if(!current()||!host.querySelector('[data-author-status]'))return;host.querySelector('[data-author-status]').textContent=message|| (workspace.dirty?'Unsaved workspace edits.':'Saved workspace · published content changes only after Apply.');
  host.querySelectorAll('[data-author-action="preview"],[data-author-action="apply"]').forEach(b=>b.disabled=busy||workspace.dirty||!workspace.expectedDraftToken);
  host.querySelector('[data-author-action="save"]').disabled=busy||workspace.revoked;
  host.querySelectorAll('[data-author-field],[data-author-page],[data-author-component],[data-author-markdown] textarea,[data-author-markdown] select,[data-author-markdown] button,[data-author-action="edit"]').forEach(el=>el.disabled=busy||workspace.revoked);
  host.querySelectorAll('.CodeMirror').forEach(el=>el.CodeMirror?.setOption('readOnly',busy||workspace.revoked));
 }
 function captureSelection(event){
  const quote=event.target.closest?.('[data-author-quote]');
  if(quote){const start=quote.selectionStart,end=quote.selectionEnd;state.selection=end>start?{start,end,exact:quote.value.slice(start,end)}:null;return;}
  if(!event.target.closest?.('[data-author-projection]'))return;
  const selection=doc.defaultView.getSelection(),field=host.querySelector('[data-author-projection]');state.selection=null;
  if(!selection?.rangeCount||selection.isCollapsed)return;
  const range=selection.getRangeAt(0);if(!field?.contains(range.commonAncestorContainer))return;
  const before=doc.createRange();before.selectNodeContents(field);before.setEnd(range.startContainer,range.startOffset);const start=before.toString().length,end=start+range.toString().length;
  state.selection={start,end,exact:range.toString()};
 }
 async function save(){
  if(busy)return;busy=true;message='Saving complete workspace draft…';refreshStatus();
  try{flush();const result=await workspace.save();state.raw={};snapshot=workspace.getContent();message='Draft saved. Preview it, then Apply separately.';return result;}
  catch(error){message=error.status===409?'Draft changed elsewhere. Your edits remain here. Compare with the latest saved draft before reconciling.':error.status===403?'Author access ended. Your edits remain here; restore author access to save.':(error.authorField?'Correct '+error.authorField+': ':'')+error.message+' Your edits remain here.';
   if(error.authorField||error.status===400){const field=host.querySelector('[data-author-field="'+(error.authorField||'activity')+'"]');if(field){field.disabled=false;field.setAttribute('aria-invalid','true');field.setAttribute('aria-describedby',statusId);field.focus({preventScroll:true});}}
   throw error;}
  finally{busy=false;refreshStatus();}
 }
 function render(){
  editor?.dispose();reader?.destroy();const l=lesson();if(!l)return;
  const b=block(),p=page(),t=target();
  host.innerHTML='<section class="inline-author" aria-label="Private author workspace"><div class="author-toolbar">'+button('edit',state.editing?'Read layout':'Edit lesson')+button('save','Save draft')+button('preview','Preview saved draft')+button('apply','Apply changes')+button('latest','Compare latest saved draft')+button('reconcile','Reconcile nonconflicting changes')+'</div><p data-author-status role="status"></p><div data-author-compare></div><p class="author-scope">Author workspace · '+e(l.id)+(workspace.expectedDraftToken?' · saved draft':' · published source')+'. Private comments are visible only to authors.</p><label>Source component<select data-author-component>'+l.blocks.filter(b=>b.type==='explanation').map(b=>'<option value="'+e(b.id)+'" '+(b.id===state.componentId?'selected':'')+'>'+e(b.id)+'</option>').join('')+'</select></label>'+(b?.textPages?'<label>Page<select data-author-page>'+b.textPages.order.map(id=>'<option value="'+e(id)+'" '+(id===state.pageId?'selected':'')+'>'+e(b.textPages.pages.find(p=>p.id===id)?.title||id)+'</option>').join('')+'</select></label>':'')+'<div data-author-canvas class="text-reader"></div><section class="author-review-panel" aria-label="Private author comments"><h3>Author comments</h3><div class="button-row">'+button('comment','Comment on selected text or block')+button('refresh','Reload comments')+'<label>Status<select data-author-filter><option value="all">All comments</option><option value="open">Open</option><option value="resolved">Resolved</option></select></label></div><form novalidate data-author-composer><p data-author-anchor></p><label>Private comment<textarea data-author-body dir="auto" rows="3" maxlength="8000" style="resize:none">'+e(state.commentBody)+'</textarea></label><button type="submit" class="button secondary">Save author comment</button><p data-author-comment-status role="status"></p></form><div data-author-comments></div></section></section>';
  host.querySelector('[data-author-status]').id=statusId;
  if(p?.activity?.id){const action=doc.createElement('button');action.type='button';action.className='button small outline';action.dataset.authorAction='comment-activity';action.textContent='Comment on activity settings';host.querySelector('.author-review-panel .button-row').append(action);}
  const canvas=host.querySelector('[data-author-canvas]');canvas.tabIndex=-1;
  if(state.editing&&!reviewOnly){
   const owner=p||b||l,field=p?'html':b?'text':'explanation';
   canvas.innerHTML='<header>'+(p||!b?'<label>Heading<input data-author-field="title" dir="auto" value="'+e(sourceValue('title'))+'"></label>':'<h3>'+e(l.title)+'</h3>')+'</header><div class="rich-lesson" data-author-projection>'+renderLesson(sourceValue(field))+'</div><div data-author-markdown></div>'+(owner.activity?'<details><summary>Edit existing activity settings</summary><label>Authored activity settings (JSON)<textarea rows="10" data-author-field="activity" dir="ltr" style="resize:none">'+e(sourceValue('activity'))+'</textarea></label><p>Existing activity and item IDs stay fixed. Saved Preview uses the same learner activity.</p></details>':'')+'<details><summary>Extra information</summary><label>Supplementary text for this component<textarea rows="4" data-author-field="options.extraInformation" dir="auto" style="resize:none">'+e(sourceValue('options.extraInformation'))+'</textarea></label></details>';
   if(p){const settings=doc.createElement('details');settings.innerHTML='<summary>Edit prompt, choices and page settings</summary><label>Existing page settings (JSON)<textarea rows="8" data-author-field="pageSettings" dir="ltr" style="resize:none"></textarea></label>';settings.querySelector('textarea').value=sourceValue('pageSettings');canvas.append(settings);}
   const projection=canvas.querySelector('[data-author-projection]');
   if(projection.textContent){const quote=doc.createElement('details');quote.innerHTML='<summary>Select text for a private comment</summary><label>Source text · select a quote with mouse or keyboard<textarea readonly rows="4" data-author-quote dir="auto" style="resize:none"></textarea></label>';quote.querySelector('textarea').value=projection.textContent;projection.after(quote);}
   editor=mountMarkdownEditor(canvas.querySelector('[data-author-markdown]'),{value:sourceValue(field),label:'Teaching text · preserve HTML and Markdown',name:'author-source',onChange:value=>{state.selection=null;write(field,value);},dependencies:markdownDependencies});
  }else{
   if(reviewOnly)canvas.innerHTML='<h3>'+e(p?.title||l.title)+'</h3><div class="rich-lesson" data-author-projection>'+renderLesson(p?.html||b?.text||l.explanation||'')+'</div>';
   else if(b?.textPages){reader=mountTextReader(canvas,{textPages:b.textPages,renderLesson,renderMedia:textPageMedia,dock:false,initialState:{cursorPageId:p?.id},onState:s=>{state.pageId=s.cursorPageId;},onContinue:()=>onExit()});}
   else canvas.innerHTML='<h3>'+e(l.title)+'</h3><div class="rich-lesson" data-author-projection>'+renderLesson(b?.text||l.explanation||'')+'</div>';
   // The edit layout provides an exact single-field projection for selections.
  }
  host.querySelector('[data-author-filter]').value=state.filter||'all';
  host.querySelector('[data-author-anchor]').textContent=state.commentTarget?'Comment context: '+(state.commentTarget.pageId||state.commentTarget.componentId||lessonId)+(state.pendingSelection?' · selected quote':' · whole field'):'Choose a block or select text in Edit lesson, then Comment.';
  if(reviewOnly){host.querySelector('.author-toolbar').hidden=true;}
  renderComments();refreshStatus();
 }
 function renderComments(){if(!current())return;host.querySelector('[data-author-comments]').innerHTML=commentError?'<p role="status">'+e(commentError)+' Use Reload comments to retry.</p>':'<p>'+total+' private comment'+(total===1?'':'s')+' in this filter.</p>'+(comments.length?comments.map(c=>'<article data-author-note="'+e(c.id)+'"><p><strong>'+e(c.status)+' · '+e(c.anchorState)+'</strong> · '+e(c.anchor.pageId||c.anchor.componentId||c.anchor.lessonId)+'</p><p class="author-note-body" dir="auto">'+e(c.body)+'</p><details><summary>Original source context · version '+e(c.anchor.revisionId)+'</summary><p dir="auto">'+e(c.anchor.selection?.exact||c.anchor.sourceText)+'</p><ol>'+c.audit.map(a=>'<li>'+e(a.action+' · '+a.status+' · '+a.at)+'</li>').join('')+'</ol></details>'+button('jump','Go to source')+button(c.status==='open'?'resolve':'reopen',c.status==='open'?'Resolve':'Reopen')+'</article>').join(''):'<p>No author comments in this filter.</p>')+((nextCursor||state.commentCursors?.length)?'<nav aria-label="Private comment pages">'+button('previous-comments','Previous comments',!state.commentCursors?.length)+button('next-comments','Next comments',!nextCursor)+'</nav>':'');}
 async function loadComments(){const request=++requestGeneration;commentError='Loading private comments…';renderComments();try{const result=await api('studio/author-comments?'+new URLSearchParams({lessonId,status:state.filter||'all',limit:50,...(state.commentCursor?{cursor:state.commentCursor}:{})}));if(current()&&request===requestGeneration){comments=result.comments;nextCursor=result.nextCursor;total=result.total;commentError='';renderComments();}}catch(error){if(current()&&request===requestGeneration){commentError=error.message;renderComments();}}}
 async function beginComment(activity=false){
  const pins=workspace.savedContext(),serial=workspace.version,contextKey=JSON.stringify(target());const t={...target(),activityId:activity?page()?.activity?.id:null},field=activity?'activity':page()?'html':block()?'text':'explanation';const projection=await api('studio/author-comments/projection?'+new URLSearchParams({...t,activityId:t.activityId||'',pageId:t.pageId||'',componentId:t.componentId||'',fieldPath:field,baseRevisionId:workspace.baseRevisionId,draftToken:workspace.expectedDraftToken||''}));
  if(!current())return;if(workspace.version!==serial||JSON.stringify(target())!==contextKey||workspace.expectedDraftToken!==pins.draftToken)throw new Error('Source changed while opening the comment. Choose the block again.');
  const selected=state.selection,rendered=host.querySelector('[data-author-projection]');
  if(!activity&&selected&&rendered?.textContent===projection.text&&projection.text.slice(selected.start,selected.end)===selected.exact)state.pendingSelection={...selected,prefix:projection.text.slice(Math.max(0,selected.start-80),selected.start),suffix:projection.text.slice(selected.end,selected.end+80)};
  else state.pendingSelection=null;
  state.commentTarget={...t,fieldPath:field,...workspace.savedContext()};state.commentRequest=null;
  host.querySelector('[data-author-anchor]').textContent='Comment on '+(t.pageId||t.componentId||lessonId)+(state.pendingSelection?' · “'+state.pendingSelection.exact+'”':' · whole source field');host.querySelector('[data-author-body]').focus();
 }
 async function submitComment(){
  if(commentBusy)return;if(!state.commentTarget)throw new Error('Choose the source block before saving a comment.');
  if(!state.commentBody.trim())throw new Error('Write a private comment first.');
  const now=workspace.savedContext();if(now.baseRevisionId!==state.commentTarget.baseRevisionId||now.draftToken!==state.commentTarget.draftToken)throw new Error('Source changed. Choose the block again; your comment is retained.');
  const candidate={...state.commentTarget,selection:state.pendingSelection||null,body:state.commentBody};
  if(!state.commentRequest||JSON.stringify(candidate)!==JSON.stringify(state.commentRequest.content))state.commentRequest={requestId:doc.defaultView.crypto.randomUUID(),content:candidate};
  commentBusy=true;const submit=host.querySelector('[data-author-composer] button');submit.disabled=true;
  const requestId=state.commentRequest.requestId;
  try{await api('studio/author-comments',{requestId,...candidate});if(state.commentBody===candidate.body&&state.commentRequest?.requestId===requestId){state.commentBody='';state.commentRequest=null;if(current())host.querySelector('[data-author-body]').value='';}if(current()){await loadComments();host.querySelector('[data-author-comment-status]').textContent='Private author comment saved.';}}
  finally{commentBusy=false;if(current())submit.disabled=false;}
 }
 const error=err=>{if(current()){host.querySelector('[data-author-comment-status]').textContent=err.message+' Your comment and edits remain here.';}};
 host.addEventListener('pointerup',captureSelection,{signal:ctl.signal});host.addEventListener('keyup',captureSelection,{signal:ctl.signal});host.addEventListener('select',captureSelection,{signal:ctl.signal});
 host.addEventListener('input',event=>{if(event.target.matches('[data-author-field]'))write(event.target.dataset.authorField,event.target.value);if(event.target.matches('[data-author-body]'))state.commentBody=event.target.value;},{signal:ctl.signal});
 host.addEventListener('change',event=>{try{if(event.target.matches('[data-author-page],[data-author-component]')){if(!reviewOnly)flush();snapshot=workspace.getContent();if(event.target.matches('[data-author-component]')){state.componentId=event.target.value;state.pageId=block()?.textPages?.order[0];}else state.pageId=event.target.value;state.selection=null;render();}if(event.target.matches('[data-author-filter]')){state.filter=event.target.value;state.commentCursor=null;state.commentCursors=[];loadComments();}}catch(err){error(err);event.target.value=event.target.matches('[data-author-page]')?state.pageId:state.componentId;}},{signal:ctl.signal});
 host.addEventListener('submit',event=>{if(!event.target.matches('[data-author-composer]'))return;event.preventDefault();event.stopPropagation();submitComment().catch(error);},{signal:ctl.signal});
 host.addEventListener('click',event=>{
  const el=event.target.closest('[data-author-action]');if(!el||el.disabled)return;event.preventDefault();event.stopPropagation();const action=el.dataset.authorAction;
  (async()=>{
   if(action==='edit'){flush();snapshot=workspace.getContent();state.editing=!state.editing;render();}
   if(action==='save')await save();
   if(action==='preview'){workspace.savedContext();await onPreview(lessonId,el);}
   if(action==='apply'){workspace.savedContext();await onApply(lessonId);}
   if(action==='refresh')await loadComments();
   if(action==='next-comments'&&nextCursor){state.commentCursors??=[];state.commentCursors.push(state.commentCursor||null);state.commentCursor=nextCursor;await loadComments();}
   if(action==='previous-comments'&&state.commentCursors?.length){state.commentCursor=state.commentCursors.pop();await loadComments();}
   if(action==='comment')await beginComment();
   if(action==='comment-activity')await beginComment(true);
   if(action==='reconcile'){flush();const latest=await api('studio');snapshot=workspace.reconcile(latest);state.raw={};message='Latest source reconciled with your local changes. Review, then Save draft explicitly.';render();}
   if(action==='latest'){const latest=await api('studio');if(current()){const area=host.querySelector('[data-author-compare]');area.innerHTML='<details open><summary>Latest saved source · compare before reconciling</summary><p>Your local edits remain above. No overwrite or automatic retry was made.</p><pre></pre></details>';area.querySelector('pre').textContent=JSON.stringify((latest.draft?.content||latest.content).lessons.find(l=>l.id===lessonId),null,2);}}
   const note=comments.find(c=>c.id===el.closest('[data-author-note]')?.dataset.authorNote);
   if(note&&action==='jump'){flush();const anchor=note.anchor;if(!lesson().blocks?.find(b=>b.id===anchor.componentId)?.textPages?.order.includes(anchor.pageId)){message='Original source is historical or missing. Read its retained context below.';refreshStatus();return;}state.componentId=anchor.componentId;state.pageId=anchor.pageId;render();host.querySelector('[data-author-canvas]')?.scrollIntoView?.({block:'start'});host.querySelector('[data-author-canvas]')?.focus({preventScroll:true});}
   if(note&&['resolve','reopen'].includes(action)){el.disabled=true;state.statusRequests??={};const key=note.id+'|'+note.version+'|'+action;state.statusRequests[key]??=doc.defaultView.crypto.randomUUID();try{await api('studio/author-comments/'+note.id+'/status',{requestId:state.statusRequests[key],expectedVersion:note.version,status:action==='resolve'?'resolved':'open'});await loadComments();}catch(err){if(err.status===409)await loadComments();throw err;}finally{if(el.isConnected)el.disabled=false;}}
  })().catch(error);
 },{signal:ctl.signal});
 const unsubscribe=workspace.subscribe(refreshStatus);
 render();loadComments();
 return {save,collect:flush,isDirty:()=>workspace.dirty||Boolean(state.commentBody.trim()),hasCommentDraft:()=>Boolean(state.commentBody.trim()),getState:()=>state,dispose(){if(!reviewOnly)try{flush();}catch{}disposed=true;requestGeneration++;unregister();unsubscribe();ctl.abort();editor?.dispose();reader?.destroy();host.replaceChildren();}};
}
