// Writes, receipt reads and authoritative refresh each belong to one cancellable operation.
export function createReviewSave({send,status,apply,timeoutMs=15000}){
 let pending=false,unconfirmed=null,confirmedReceipt=null,active=null;
 const recovery=()=>confirmedReceipt
  ?'Review saved, but refresh is incomplete. Check saved review, or finish and reopen the overview before continuing.'
  :'Review save is unconfirmed. Check saved review, or finish and reopen the overview before continuing.';
 function validate(receipt){
  const p=unconfirmed;
  if(!receipt||receipt.undone||receipt.requestId!==p?.requestId||receipt.wordId!==p.wordId||receipt.rating!==p.rating)
   throw Error('Save is still unconfirmed. Reopen the review overview to reconcile before continuing.');
 }
 async function finish(receipt,context){
  if(!context.isCurrent())return;
  validate(receipt);confirmedReceipt=receipt;
  status('Review saved. Refreshing review…');
  await apply(receipt,context);
  if(!context.isCurrent())return;
  unconfirmed=null;status('');
 }
 async function operation(task){
  const controller=new AbortController(),op={controller};active=op;pending=true;
  const context={signal:controller.signal,isCurrent:()=>active===op&&!controller.signal.aborted};
  let timer,abort;
  const stopped=new Promise((_,reject)=>{
   abort=()=>reject(controller.signal.reason||Error('Review operation cancelled.'));
   controller.signal.addEventListener('abort',abort,{once:true});
   timer=setTimeout(()=>controller.abort(Error('Review response or refresh timed out.')),timeoutMs);
  });
  try{return await Promise.race([task(context),stopped]);}
  catch(error){if(active===op){status(recovery());throw error;}}
  finally{clearTimeout(timer);controller.signal.removeEventListener('abort',abort);if(active===op){active=null;pending=false;}}
 }
 return {
  get blocked(){return pending||!!unconfirmed},
  async commit(payload){
   if(pending||unconfirmed)return;
   unconfirmed=payload;confirmedReceipt=null;status('Saving review…');
   return operation(async context=>{const receipt=await send('review',payload,context.signal);await finish(receipt,context);});
  },
  async reconcile(){
   if(pending||!unconfirmed)return;
   status('Checking saved review…');
   return operation(async context=>{const result=await send('review/status?'+new URLSearchParams({requestId:unconfirmed.requestId}),undefined,context.signal);await finish(result.receipt,context);});
  },
  cancel(){const previous=active;active=null;pending=false;previous?.controller.abort(Error('Review context ended.'));}
 };
}
