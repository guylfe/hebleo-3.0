import {mountMediaPicker} from '../studio/media-picker.js';
export function chooseLocalImage(panel,{api,onSelected,onClose=()=>{}}){
 const doc=panel.ownerDocument,ctl=new doc.defaultView.AbortController();let disposed=false,picker,selected;
 panel.hidden=false;panel.innerHTML='<form novalidate><label>Image alt text<input name="alt" type="text"></label><div data-image-picker></div><p role="status">Loading approved local images…</p><button type="submit" class="button small outline">Insert selected image</button><button type="button" data-image-cancel class="button small outline">Cancel</button></form>';
 const form=panel.querySelector('form'),status=form.querySelector('[role=status]');
 function dispose(){disposed=true;ctl.abort();picker?.();panel.hidden=true;}
 form.addEventListener('submit',event=>{event.preventDefault();if(!selected){status.textContent='Choose an approved local image first.';return;}if(!form.elements.alt.value.trim()){status.textContent='Add image alt text.';form.elements.alt.focus();return;}onSelected({...selected,alt:form.elements.alt.value});dispose();onClose();},{signal:ctl.signal});
 form.querySelector('[data-image-cancel]').addEventListener('click',()=>{dispose();onClose();},{signal:ctl.signal});
 Promise.resolve(api?api('studio/media/status'):null).then(dto=>{
  if(disposed)return;const assets=(dto?.assets||[]).filter(a=>a.kind==='image').flatMap(a=>a.revisions.filter(r=>r.approval?.status==='approved'&&/^\/media\/[A-Za-z0-9_./-]+$/.test(r.url||'')&&!r.url.includes('..')&&!r.url.includes('//')).map(r=>({...r,assetId:a.assetId,title:a.title})));
  picker=mountMediaPicker(panel.querySelector('[data-image-picker]'),{assets,onSelected:asset=>{selected=asset;status.textContent='Image selected. Add alt text, then Insert selected image.';}});status.textContent=assets.length?'Choose an image and add alt text.':'No approved local images are available. Existing image references remain intact.';
 }).catch(error=>{if(!disposed)status.textContent=error.message+' Your text is retained.';});
 form.elements.alt.focus();return dispose;
}
