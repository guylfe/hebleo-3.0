// Host integration. Only trusted, exact-frame settings and bounded height are accepted.
export function mountSharedReview(frame,{api,user,onError,onShortcut=()=>{}}){
 const generation=window.crypto.randomUUID();
 let disposed=false,url=null,pending=Promise.resolve();
 function message(event){
  if(disposed||event.source!==frame.contentWindow||!event.data||typeof event.data!=='object')return;
  const data=event.data,keys=Object.keys(data).sort().join('|');
  if(keys==='type'&&data.type==='hebleo-review-ready'&&frame.isConnected)frame.contentWindow.postMessage({type:'hebleo-review-context',generation},'*');
  if(keys==='generation|key|type'&&data.type==='hebleo-review-key'&&data.generation===generation&&['reveal','1','2','3','4'].includes(data.key)&&frame.isConnected)onShortcut(data.key);

  if(keys==='height|type'&&data.type==='hebleo-card-height'&&Number.isFinite(data.height))frame.style.height=Math.max(120,Math.min(2400,Math.ceil(data.height)))+'px';
  if(keys==='mode|nikkud|type'&&data.type==='hebleo-card-settings'&&['light','dark'].includes(data.mode)&&typeof data.nikkud==='boolean'){
   pending=pending.catch(()=>{}).then(()=>api('shared-cards/settings',{mode:data.mode,nikkud:data.nikkud},user));
   pending.catch(error=>onError(error));
  }
 }
 window.addEventListener('message',message);
 frame.setAttribute('sandbox','allow-scripts');frame.setAttribute('referrerpolicy','no-referrer');frame.style.width='100%';frame.style.height='120px';frame.style.border='0';
 const loaded=api('shared-cards/ticket',{cardId:frame.dataset.cardId,face:frame.dataset.face},user).then(result=>{if(!disposed){url=result.url;frame.src=url;}}).catch(error=>{if(!disposed)onError(error);});
 return {flush:()=>pending,dispose(){disposed=true;window.removeEventListener('message',message);frame.removeAttribute('src');},loaded};
}
