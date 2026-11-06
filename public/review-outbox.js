/* Shared classic-script/module side effect. No credentials are persisted. */
(function(root){
 'use strict';
 const copy=value=>structuredClone(value);
 const canonical=value=>Array.isArray(value)?'['+value.map(canonical).join(',')+']':value&&typeof value==='object'?'{'+Object.keys(value).sort().filter(k=>value[k]!==undefined).map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}':JSON.stringify(value);
 async function hash(value){return Array.from(new Uint8Array(await root.crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(value)))),x=>x.toString(16).padStart(2,'0')).join('');}
 function create(options){
  const {siteId,ownerId,send,lookup,isActive=()=>true,now=()=>-Infinity,indexedDB=root.indexedDB,maxPending=20,timeoutMs=15000,pollMs=2000,pauseLeaseMs=60000,pauseRenewMs=10000}=options;
  if(!siteId||!ownerId)throw Error('Review storage needs a site and learner.');
  const scope=JSON.stringify([siteId,ownerId]),sender=root.crypto.randomUUID(),listeners=new Set();
  let db,disposed=false,running=false,failed=null,view={entries:[],overlays:[]},timer,controller,lastPublication,pauseTimer,pauseAbort;
  const channel=typeof root.BroadcastChannel==='function'?new root.BroadcastChannel('hebleo-review-outbox-v1'):null;
  function transaction(change){return new Promise((resolve,reject)=>{
   let tx;try{tx=db.transaction('scopes','readwrite',{durability:'strict'});}catch(error){reject(error);return;}
   const store=tx.objectStore('scopes'),request=store.get(scope);let result,next;
   request.onsuccess=()=>{try{next=request.result||{seq:0,entries:[],overlays:[],lease:null};result=change(next);store.put(next,scope);}catch(error){tx.abort();reject(error);}};
   tx.oncomplete=()=>{view=copy(next);resolve(result);};tx.onabort=tx.onerror=()=>reject(tx.error||Error('Durable review storage failed.'));
  });}
  function snapshot(){const rejection=view.entries.find(x=>x.phase==='needs-resolution'),paused=!!(view.pause&&view.pause.until>Date.now());return copy({siteId,ownerId,pending:view.entries,overlays:view.overlays,error:failed||(rejection?'Rating not applied: '+rejection.receipt.reasonCode:null),blocked:paused||!!failed||!!rejection||view.entries.length>=maxPending,paused,disposed});}
  function publish(){const value=snapshot(),serialized=JSON.stringify(value);if(serialized===lastPublication)return;lastPublication=serialized;for(const fn of listeners)try{fn(value);}catch{} }
  async function sync(){if(disposed)return;try{await ready;await transaction(()=>{});publish();}catch(error){failed=error.message;publish();}}
  const ready=new Promise((resolve,reject)=>{
   if(!indexedDB){reject(Error('Durable review storage is unavailable.'));return;}
   const request=indexedDB.open('hebleo-review-outbox-v1',1);
   request.onupgradeneeded=()=>request.result.createObjectStore('scopes');
   request.onsuccess=()=>{db=request.result;db.onversionchange=()=>{db.close();failed='Review storage changed. Reload before continuing.';publish();};resolve();};
   request.onerror=()=>reject(request.error);request.onblocked=()=>reject(Error('Review storage upgrade is blocked.'));
  });
  function notify(){channel?.postMessage(scope);publish();}
  async function bounded(fn){controller=new AbortController();let timeout;try{return await Promise.race([fn(controller.signal),new Promise((_,reject)=>{timeout=setTimeout(()=>{controller.abort();reject(Error('Review save timed out. Retry saved reviews.'));},timeoutMs);})]);}finally{clearTimeout(timeout);controller=null;}}
  async function pump(){
   if(disposed||running||failed||!isActive())return;running=true;
   try{await ready;
    while(!disposed&&isActive()){
     const claim=await transaction(s=>{
      if(!s.entries.length||s.entries[0].phase==='needs-resolution')return null;
      if(s.lease&&s.lease.owner!==sender&&s.lease.until>Date.now())return null;
      const generation=(s.lease?.generation||0)+1;s.lease={owner:sender,generation,until:Date.now()+timeoutMs+5000};
      return {entry:copy(s.entries[0]),generation};
     });
     if(!claim||disposed||!isActive())break;const {entry,generation}=claim;
     let receipt=await bounded(async signal=>{const found=await lookup(copy(entry.intent),signal);return found||await send(copy(entry.intent),signal);});
     if(disposed||!isActive())break;
     const baseValid=receipt?.protocolVersion===1&&receipt.requestId===entry.intent.requestId&&receipt.cardId===entry.intent.cardId&&receipt.expectedVersion===entry.intent.expectedVersion&&receipt.intentHash===await hash(entry.intent);
     const outcomeValid=receipt?.outcome==='rejected'
      ? typeof receipt.reasonCode==='string'&&receipt.reasonCode.length>0&&Number.isSafeInteger(receipt.rejectedAt)&&receipt.rejectedAt>=0
      : ['committed','undone'].includes(receipt?.outcome)&&typeof receipt.resultingVersion==='string'&&receipt.resultingVersion.length>0&&Number.isSafeInteger(receipt.acceptedAnswerAt)&&receipt.acceptedAnswerAt>=0&&Number.isSafeInteger(receipt.committedAt)&&receipt.committedAt>=receipt.acceptedAnswerAt&&receipt.authoritativeSchedule&&typeof receipt.authoritativeSchedule.due==='string'&&Number.isFinite(Date.parse(receipt.authoritativeSchedule.due))&&Number.isSafeInteger(receipt.siblingsUntil)&&receipt.siblingsUntil>=0;
     if(!baseValid||!outcomeValid)throw Error('Review receipt mismatch or incomplete. Retry saved reviews.');
     const acknowledged=await transaction(s=>{
      if(s.lease?.owner!==sender||s.lease.generation!==generation||s.entries[0]?.seq!==entry.seq||s.entries[0]?.intent.requestId!==entry.intent.requestId)return false;
      if(receipt.outcome==='rejected'){s.entries[0].phase='needs-resolution';s.entries[0].receipt=copy(receipt);s.lease=null;return true;}
      s.overlays=s.overlays.filter(x=>x.cardId!==receipt.cardId);
      s.overlays.push({...copy(receipt),siblingGroupId:entry.intent.siblingGroupId});s.entries.shift();s.lease=null;return true;
     });
     if(acknowledged)notify();else break;
    }
   }catch(error){if(!disposed){failed=error.message;publish();}}finally{running=false;}
  }
  async function capture(payload){
   await ready;if(disposed||!isActive())throw Error('Review account changed.');
   const intent=copy(payload);
   if(intent.protocolVersion!==1||intent.siteId!==siteId||intent.ownerId!==ownerId||!intent.requestId||!intent.cardId||!intent.siblingGroupId||typeof intent.expectedVersion!=='string'||![1,2,3,4].includes(intent.rating)||!Number.isFinite(intent.elapsedMs)||intent.elapsedMs<0||!intent.clockTicketId)throw Error('Invalid review intent.');
   if(failed)throw Error(failed);
   try{await transaction(s=>{
    if(s.pause&&s.pause.until>Date.now())throw Error('Review capture is paused for Undo.');
    if(s.entries.some(x=>x.phase==='needs-resolution'))throw Error('Resolve the rejected rating before continuing.');
    if(s.entries.length>=maxPending)throw Error('Finish saving pending reviews before continuing.');
    if(s.entries.some(x=>x.intent.requestId===intent.requestId||x.intent.cardId===intent.cardId||x.intent.siblingGroupId===intent.siblingGroupId))throw Error('This card or its sibling already has a pending rating.');
    if(!Number.isFinite(now()))throw Error('Refresh the trusted review clock before rating.');
    if(s.overlays.some(x=>x.cardId===intent.cardId&&(x.resultingVersion!==intent.expectedVersion||Date.parse(x.authoritativeSchedule?.due)>now())||x.siblingGroupId===intent.siblingGroupId&&x.cardId!==intent.cardId&&x.siblingsUntil>now()))throw Error('This card was already rated. Refresh review.');
    s.entries.push({seq:++s.seq,intent});
   });}catch(error){await sync();throw error;}
   notify();void pump();return copy(intent);
  }
  function excluded(cardId,groupId,at=now()){
   return view.entries.some(x=>x.intent.cardId===cardId||x.intent.siblingGroupId===groupId)||view.overlays.some(x=>x.cardId===cardId&&Date.parse(x.authoritativeSchedule?.due)>at||x.cardId!==cardId&&x.siblingGroupId===groupId&&x.siblingsUntil>at);
  }
  async function pauseCapture(){
   await ready;if(disposed||!isActive())throw Error('Review account changed.');const token=root.crypto.randomUUID();
   await transaction(s=>{if(s.pause&&s.pause.until>Date.now())throw Error('Undo is already running in another tab.');s.pause={owner:sender,token,until:Date.now()+pauseLeaseMs};});notify();
   let lost=false,released=false;const abort=new AbortController();pauseAbort=abort;
   const lose=error=>{lost=true;clearInterval(renewTimer);abort.abort(error);};
   function assertState(s){if(lost||released||disposed||!isActive()||s.pause?.owner!==sender||s.pause?.token!==token||s.pause.until<=Date.now())throw Error('Undo pause expired or was lost. Reopen review before Undo.');}
   async function check(renew=false){try{if(lost)throw abort.signal.reason;await transaction(s=>{assertState(s);if(renew)s.pause.until=Date.now()+pauseLeaseMs;});}catch(error){lose(error);throw error;}}
   const renewTimer=setInterval(()=>void check(true).catch(()=>{/* lost state and abort signal retain the failure */}),pauseRenewMs);pauseTimer=renewTimer;
   const release=async()=>{if(released)return;released=true;clearInterval(renewTimer);await transaction(s=>{if(s.pause?.owner===sender&&s.pause.token===token)s.pause=null;});notify();};
   release.assertOwned=()=>check();release.signal=abort.signal;Object.defineProperty(release,'lost',{get:()=>lost});return release;
  }
  async function resolveRejected(requestId,intentHash){
   await ready;if(disposed||!isActive())throw Error('Review account changed.');
   const intent=await transaction(s=>{const entry=s.entries[0];if(entry?.phase!=='needs-resolution'||entry.intent.requestId!==requestId||entry.receipt.intentHash!==intentHash)throw Error('Rejected rating changed. Refresh recovery.');s.entries.shift();return copy(entry.intent);});notify();void pump();return intent;
  }
  channel&&(channel.onmessage=event=>{if(event.data===scope)void sync().then(pump);});
  timer=setInterval(()=>void sync().then(pump),pollMs);
  ready.then(()=>sync().then(pump)).catch(error=>{failed=error.message;clearInterval(timer);channel?.close();publish();});
  return {ready,capture,snapshot,excluded,pauseCapture,resolveRejected,subscribe(fn){listeners.add(fn);fn(snapshot());return()=>listeners.delete(fn);},async retry(){failed=null;await sync();await pump();return snapshot();},async reconcile(observed){await ready;await transaction(s=>{s.overlays=s.overlays.filter(x=>!observed(x));});notify();},dispose(){disposed=true;clearInterval(timer);clearInterval(pauseTimer);pauseAbort?.abort(Error('Undo context ended.'));controller?.abort();channel?.close();listeners.clear();/* Release only owned claims; HTTP relies on server idempotency. */void ready.then(()=>transaction(s=>{if(s.lease?.owner===sender)s.lease=null;if(s.pause?.owner===sender)s.pause=null;})).then(()=>db.close()).catch(()=>{});},get blocked(){return snapshot().blocked;}};
 }
 root.HebleoReviewOutbox={create,protocolVersion:1};
})(globalThis);
