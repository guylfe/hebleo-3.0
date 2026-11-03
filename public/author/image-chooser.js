import {escapeHTML as e} from '../studio/editor-fields.js';
const clone=value=>structuredClone(value);
const safeID=value=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(value)&&!['__proto__','constructor','prototype'].includes(value);
const extensions={'image/png':'.png','image/jpeg':'.jpg','image/webp':'.webp','image/gif':'.gif'};
const pinFields=['assetId','revisionId','sha256','url','mimeType','byteLength','kind'];
const samePin=(left,right)=>pinFields.every(key=>left?.[key]===right?.[key]);
const privateApproved=(record,pin)=>record?.version===1&&record.scope==='private-image-use'&&record.status==='approved'&&safeID(record.actorId)&&safeID(record.operationId)&&typeof record.approvedAt==='string'&&Number.isFinite(Date.parse(record.approvedAt))&&samePin(record.pin,pin);
function candidates(dto){
 if(dto?.version!==1||!Array.isArray(dto.assets))throw Error('Image library could not be verified.');
 return dto.assets.filter(a=>a.kind==='image'&&safeID(a.assetId)&&typeof a.title==='string'&&Array.isArray(a.revisions)).flatMap(a=>a.revisions.filter(r=>safeID(r.revisionId)&&/^[a-f0-9]{64}$/.test(r.sha256)&&extensions[r.mimeType]&&r.url==='/media/blobs/'+r.sha256+extensions[r.mimeType]&&Number.isInteger(r.byteLength)&&r.byteLength>0&&r.byteLength<=20_000_000&&r.approval?.version===1&&r.approval.status==='pending'&&['human-authored','verified-source','synthetic-demo'].includes(r.provenance?.kind)&&typeof r.provenance.label==='string').map(r=>({...clone(r),assetId:a.assetId,title:a.title,kind:'image',expectedCurrentRevisionId:a.revisions.at(-1)?.revisionId})));
}
export function chooseLocalImage(panel,{api,onSelected,onClose=()=>{}}){
 const doc=panel.ownerDocument,ctl=new doc.defaultView.AbortController();let disposed=false,busy=false,assets=[],selected=null,page=0;
 const operations=new Map(),failedPreviews=new Set();
 panel.hidden=false;panel.innerHTML='<form novalidate><label>Image alt text<input name="alt" type="text" maxlength="2000"></label><p>Review the local preview, source and checksum. Approve one exact image for private use, then select it. Canonical teaching publication approval remains separate.</p><button type="button" data-image-refresh>Refresh images</button><div data-image-picker></div><p role="status" aria-live="polite">Loading local images…</p><button type="submit" class="button small outline">Insert selected image</button><button type="button" data-image-cancel class="button small outline">Cancel</button></form>';
 const form=panel.querySelector('form'),list=form.querySelector('[data-image-picker]'),status=form.querySelector('[role=status]');
 const key=asset=>asset.assetId+'/'+asset.revisionId+'/'+asset.sha256;
 const say=text=>{if(!disposed)status.textContent=text;};
 function dispose(){if(disposed)return;disposed=true;ctl.abort();form.setAttribute('aria-busy','false');panel.hidden=true;}
 function render(){
  list.innerHTML=assets.length?assets.slice(page*20,(page+1)*20).map((a,j)=>{const i=page*20+j,approved=privateApproved(a.privateUseApproval,a),failed=failedPreviews.has(key(a));return '<article><h3>'+e(a.title)+'</h3><p>'+e(a.provenance.kind+' · '+a.provenance.label)+'</p><p>'+e(a.assetId+' · '+a.revisionId+' · '+a.mimeType+' · '+a.byteLength+' bytes')+'</p><p>SHA-256 '+e(a.sha256)+'</p><img data-image-preview="'+i+'" src="'+e(a.url)+'" alt="Local preview: '+e(a.title)+'" width="240" loading="lazy"><p>'+e(approved?'Approved for private use by '+a.privateUseApproval.actorId+' at '+a.privateUseApproval.approvedAt:'Private use approval pending')+'. Canonical teaching approval remains pending.</p>'+(approved?'':'<button type="button" data-private-approve="'+i+'"'+(busy||failed?' disabled':'')+'>Approve this exact image for private use</button>')+'<button type="button" data-select-media="'+i+'"'+(busy||failed||!approved?' disabled':'')+'>Select exact image revision</button></article>';}).join('')+'<nav aria-label="Local image revisions"><button type="button" data-image-page="-1"'+(!page||busy?' disabled':'')+'>Previous images</button><span>Page '+(page+1)+' of '+Math.ceil(assets.length/20)+'</span><button type="button" data-image-page="1"'+((page+1)*20>=assets.length||busy?' disabled':'')+'>Next images</button></nav>':'<p>No imported local images are available. Import an image in Studio’s Reusable media, then Refresh images.</p>';
  list.querySelectorAll('[data-image-preview]').forEach(img=>img.addEventListener('error',()=>{if(disposed)return;const a=assets[Number(img.dataset.imagePreview)];failedPreviews.add(key(a));if(selected&&key(selected)===key(a))selected=null;img.closest('article').querySelectorAll('button').forEach(b=>b.disabled=true);say('This local preview is unavailable. Refresh images before approving or selecting it.');},{once:true,signal:ctl.signal}));
  form.querySelector('[data-image-refresh]').disabled=busy;form.querySelector('[type=submit]').disabled=busy;
 }
 async function call(path,body){if(typeof api!=='function')throw Error('Image library is unavailable.');const dto=await api('studio/media/'+path,body);if(dto?.error)throw Error(dto.error);return dto;}
 async function perform(task){if(busy||disposed)return;busy=true;form.setAttribute('aria-busy','true');render();try{await task();}catch(error){say(error.message+' Your text and alt text are retained.');}finally{busy=false;if(!disposed){form.setAttribute('aria-busy','false');render();}}}
 async function refresh(){const next=candidates(await call('status'));if(disposed)return;assets=next;selected=null;failedPreviews.clear();page=Math.min(page,Math.max(0,Math.ceil(assets.length/20)-1));say('Review an image for private use, then select its exact revision and add alt text.');}
 async function approve(asset){
  const request=Object.fromEntries(['assetId','revisionId','sha256','url','mimeType','byteLength','expectedCurrentRevisionId'].map(field=>[field,asset[field]]));
  const retryKey=JSON.stringify(request);if(!operations.has(retryKey))operations.set(retryKey,'private-image-'+doc.defaultView.crypto.randomUUID());request.operationId=operations.get(retryKey);
  say('Recording explicit private image approval…');const record=await call('approve-private-image-use',request);if(disposed)return;
  if(!privateApproved(record,asset))throw Error('Private image approval could not be verified. Refresh images.');
  asset.privateUseApproval=clone(record);say('Approved for private use. Select this exact revision, then add alt text. Teaching publication approval remains separate.');
 }
 form.addEventListener('submit',event=>{event.preventDefault();if(busy||disposed)return;if(!selected){say('Choose an image approved for private use first.');return;}const alt=form.elements.alt.value;if(!alt.trim()||alt.length>2000){say('Add image alt text (up to 2000 characters).');form.elements.alt.focus();return;}
  const chosen=clone(selected);perform(async()=>{say('Verifying the selected immutable image…');const current=candidates(await call('status')).find(a=>samePin(a,chosen));if(disposed)return;if(!current||!privateApproved(current.privateUseApproval,current))throw Error('This exact image is unavailable or lacks private-use approval. Refresh images.');await onSelected({...clone(current),alt});if(disposed)return;dispose();onClose();});
 },{signal:ctl.signal});
 form.addEventListener('click',event=>{const b=event.target.closest('button');if(!b||b.disabled||disposed)return;if(b.matches('[data-image-cancel]')){dispose();onClose();return;}if(busy)return;
  if(b.matches('[data-image-refresh]'))perform(refresh);
  else if(b.matches('[data-private-approve]')){const asset=assets[Number(b.dataset.privateApprove)];if(asset&&!failedPreviews.has(key(asset)))perform(()=>approve(asset));}
  else if(b.matches('[data-select-media]')){const asset=assets[Number(b.dataset.selectMedia)];if(asset&&privateApproved(asset.privateUseApproval,asset)&&!failedPreviews.has(key(asset))){selected=clone(asset);say('Exact image revision selected. Add alt text, then Insert selected image.');}}
  else if(b.matches('[data-image-page]')){page+=Number(b.dataset.imagePage);render();}
 },{signal:ctl.signal});
 perform(refresh);form.elements.alt.focus();return dispose;
}
