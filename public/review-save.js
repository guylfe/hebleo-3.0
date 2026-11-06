// Writes, receipt reads and authoritative refresh each belong to one cancellable operation.
import './review-outbox.js';
export function createReviewSave(options){
 if(options.background)return createBackgroundReview(options);
 const {send,status,apply,timeoutMs=15000}=options;
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

function createBackgroundReview({ownerId,siteId='hebleo-local-demo',send,isActive,onChange=()=>{},...options}){
 let anchors={},anchoredAt=0,capturing=false;
 const queue=globalThis.HebleoReviewOutbox.create({...options,siteId,ownerId,isActive,
  send:(intent,signal)=>send('review/background',intent,signal),
  lookup:async(intent,signal)=>(await send('review/status?'+new URLSearchParams({requestId:intent.requestId}),undefined,signal)).receipt});
 queue.subscribe(onChange);
 async function clock(){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);try{const result=await send('review/clock',{},controller.signal);if(!isActive())throw Error('Review account changed.');anchors=result.anchors;anchoredAt=performance.now();}finally{clearTimeout(timer);}}
 return {ready:queue.ready,snapshot:queue.snapshot,excluded:queue.excluded,reconcile:queue.retry,retry:queue.retry,
  get blocked(){return capturing||queue.blocked;},clock,
  async commit({cardId,rating,requestId}){
   if(capturing)throw Error('A rating is already being captured.');capturing=true;
   try{const anchor=anchors[cardId];if(!anchor||performance.now()-anchoredAt>300000) {await clock();throw Error('Review clock refreshed. Choose your rating again.');}
    const {clockTicketId,expectedVersion,siblingGroupId}=anchor;
    return await queue.capture({protocolVersion:1,siteId,ownerId,requestId,cardId,siblingGroupId,expectedVersion,rating,clockTicketId,elapsedMs:Math.max(0,performance.now()-anchoredAt)});
   }finally{capturing=false;}
  },dispose:queue.dispose,cancel:queue.dispose,async drain(){
   await queue.retry();if(!queue.snapshot().pending.length)return;
   await new Promise((resolve,reject)=>{let unsubscribe=()=>{},timer;
    const done=error=>{clearTimeout(timer);unsubscribe();error?reject(error):resolve();};
    timer=setTimeout(()=>done(Error('Pending reviews need recovery before Undo.')),20000);
    unsubscribe=queue.subscribe(snapshot=>{if(snapshot.error)done(Error(snapshot.error));else if(!snapshot.pending.length)done();});
   });
  },
  async observe(data){await queue.reconcile(r=>Number.isSafeInteger(r.resultingGeneration)&&(data.learner.reviewGenerations?.[r.cardId]||0)>=r.resultingGeneration&&data.reviewVersions?.[r.cardId]!==r.resultingVersion);},
  async clearOverlays(requestId){await queue.reconcile(receipt=>receipt.requestId===requestId);}
 };
}
