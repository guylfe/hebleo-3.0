/* WordPress transport/clock adapter; shared durable core is loaded unchanged. */
(function(Study,config){'use strict';
 const prior={};for(const k of ['makeRequest','nextCard','renderStudyInterface','showSessionComplete','showDecks'])prior[k]=Study.prototype[k];
 const cid=c=>String(c.note_id)+':'+String(c.template_id),group=c=>String(c.note_id);
 let active=true,queue,clock=null,anchors=new Map(),epoch=0,ownerApp,refreshTimer;
 const now=()=>clock?clock.serverNow+performance.now()-clock.at:NaN;
 async function transport(action,data={},signal){
  const body=new FormData();for(const [k,v] of Object.entries({action,nonce:config.nonce,...data}))body.append(k,v);
  const response=await fetch(config.endpoint,{method:'POST',credentials:'same-origin',body,signal});
  const r=await response.json();if(!response.ok||!r?.success)throw Error(typeof r?.data==='string'?r.data:'Unable to confirm saved reviews.');
  if(r.data.ownerId!==config.ownerId||r.data.siteId!==config.siteId){active=false;queue?.dispose();throw Error('Review account changed. Reopen the deck.');}
  clock={serverNow:r.data.serverNow,at:performance.now()};return r.data;
 }
 function getQueue(a){ownerApp=a;if(queue)return queue;
  queue=HebleoReviewOutbox.create({siteId:config.siteId,ownerId:config.ownerId,isActive:()=>active,now,
   send:async(i,signal)=>(await transport('hebleo_bg_save',{intent:JSON.stringify(i)},signal)).receipt,
   lookup:async(i,signal)=>(await transport('hebleo_bg_status',{request_id:i.requestId},signal)).receipt,maxPending:20});
  queue.subscribe(()=>{status();scheduleRefresh();});queue.ready.catch(e=>status(e.message));return queue;
 }
 function status(error){const a=ownerApp;if(!a)return;let n=document.getElementById('background-review-status');if(!n){n=document.createElement('p');n.id='background-review-status';n.setAttribute('role','status');document.getElementById('study-app')?.append(n);}const s=queue?.snapshot();n.textContent=error||s?.error||(s?.pending.length?`Saving ${s.pending.length} review${s.pending.length===1?'':'s'}…`:'');
  if(s?.error){const b=document.createElement('button');b.type='button';const reject=s.pending.find(x=>x.phase==='needs-resolution');b.textContent=reject?'Refresh rejected rating':'Retry saved reviews';b.onclick=async()=>{b.disabled=true;try{if(reject){const observed=await fresh(a);if(!observed)throw Error('Refresh superseded; reopen recovery.');await queue.resolveRejected(reject.intent.requestId,reject.receipt.intentHash);const cards=observed.afterResolution(reject.intent.requestId);if(!cards)throw Error('Refresh superseded; reopen recovery.');a.cards=cards.filter(c=>!a.currentCard||cid(c)!==cid(a.currentCard));}else await queue.retry();status();}catch(e){status(e.message);}};n.append(' ',b);}
 }
 async function acquire(cards){const version=++epoch;anchors.clear();const ids=[...new Set(cards.map(cid))];for(let offset=0;offset<ids.length;offset+=100){const r=await transport('hebleo_bg_clock',{card_ids:JSON.stringify(ids.slice(offset,offset+100))});if(version!==epoch)return null;const at=performance.now();for(const a of r.anchors)anchors.set(a.cardId,{...a,base:r.serverNow-a.issuedAt,at,serverNow:r.serverNow});}return version;}
 const allowed=c=>!queue?.excluded(cid(c),group(c));
 // Snapshot BEFORE the authoritative request. A receipt acknowledged while the
 // request is in flight cannot be retired by that request's older response.
 async function observation(a){const q=getQueue(a);await q.ready;await q.reconcile(()=>false);return {q,...q.snapshot()};}
 const sameReceipt=(a,b)=>a.requestId===b.requestId&&a.intentHash===b.intentHash&&a.cardId===b.cardId&&a.expectedVersion===b.expectedVersion&&a.resultingVersion===b.resultingVersion;
 function observedAllowed(c,before,retired){const at=now(),id=cid(c),note=group(c);return allowed(c)&&!before.pending.some(e=>e.intent.cardId===id||e.intent.siblingGroupId===note)&&!before.overlays.some(r=>r.cardId!==id&&r.siblingGroupId===note&&(!Number.isFinite(at)||r.siblingsUntil>at)||r.cardId===id&&!retired.has(r.requestId)&&(!Number.isFinite(at)||Date.parse(r.authoritativeSchedule?.due)>at));}
 async function reconcileObserved(cards,before,valid){const token=await acquire(cards);if(token===null||!valid()||before.q!==queue)return null;
  const current=()=>active&&queue===before.q&&epoch===token&&valid(),retired=new Set(),byId=new Map(cards.map(c=>[cid(c),c]));
  await before.q.reconcile(r=>{
   if(!current()||!before.overlays.some(old=>sameReceipt(old,r)))return false;
   const c=byId.get(r.cardId),anchor=anchors.get(r.cardId);
   // Opaque hashes are not ordered: evidence is a subsequent authoritative due
   // queue plus matching fresh clock state, distinct from both older versions.
   if(!c||!anchor||anchor.expectedVersion!==c.review_version||!Number.isSafeInteger(anchor.serverNow)||anchor.serverNow<r.committedAt||c.review_version===r.resultingVersion||c.review_version===r.expectedVersion)return false;
   retired.add(r.requestId);return true;
  });
  if(!current())return null;
  // Retain the observation's sibling/pending fences even after retirement, so
  // a response started before a concurrent commit cannot resurrect its cards.
  return {cards:cards.filter(c=>observedAllowed(c,before,retired)),afterResolution(requestId){if(!current())return null;const resolved={...before,pending:before.pending.filter(e=>e.intent.requestId!==requestId)};return cards.filter(c=>observedAllowed(c,resolved,retired));}};
 }
 async function fresh(a){if(!active||!a.currentDeck)return;const deck=a.currentDeck,before=await observation(a);const r=await prior.makeRequest.call(a,'start_study_session',{deck_id:deck});if(!r?.success)throw Error('Unable to refresh authoritative card state.');if(deck!==a.currentDeck||!active)return;const observed=await reconcileObserved(r.data.cards,before,()=>deck===a.currentDeck);if(!observed)return;const cards=observed.cards;
  // Server queue is the sole authority for learning return. Never replace a revealed card.
  a.cards=cards.filter(c=>allowed(c)&&(!a.currentCard||cid(c)!==cid(a.currentCard)||a.currentView!=='study'));
  status();scheduleRefresh();return observed;
 }
 function scheduleRefresh(){clearTimeout(refreshTimer);if(!queue||!active||!ownerApp?.currentDeck)return;const s=queue.snapshot(),at=now();if(!Number.isFinite(at))return;const times=s.overlays.flatMap(r=>[Date.parse(r.authoritativeSchedule.due),r.siblingsUntil]).filter(t=>Number.isFinite(t)&&t>at);if(times.length)refreshTimer=setTimeout(()=>fresh(ownerApp).catch(e=>status(e.message)),Math.min(2147483647,Math.max(50,Math.min(...times)-at+50)));}
 Study.prototype.makeRequest=async function(action,data,options){const before=action==='start_study_session'?await observation(this):null;const r=await prior.makeRequest.call(this,action,data,options);if(before&&r?.success){const observed=await reconcileObserved(r.data.cards,before,()=>active);if(!observed)throw Error('Review refresh superseded. Reopen the deck.');r.data.cards=observed.cards;}return r;};
 Study.prototype.nextCard=function(){this.cards=this.cards.filter(allowed);return prior.nextCard.call(this);};
 Study.prototype.renderStudyInterface=function(){prior.renderStudyInterface.call(this);status();};
 Study.prototype.showSessionComplete=function(){this.currentView='complete';this.currentCard=null;prior.showSessionComplete.call(this);status();};
 Study.prototype.showDecks=function(){const r=prior.showDecks.call(this);status();return r;};
 // The old time-based sibling restoration is superseded by authoritative fresh queues.
 Study.prototype.restoreExpiredSiblings=function(){};
 Study.prototype.rateCard=async function(rating){const card=this.currentCard;if(!active||!card||this.currentView!=='study'||!this.answerRevealed||this.ratingPending||![1,2,3,4].includes(rating))return;
  const q=getQueue(this),anchor=anchors.get(cid(card));if(!anchor||performance.now()-anchor.at>300000||anchor.expectedVersion!==card.review_version){try{await acquire([card,...this.cards]);status('Timing refreshed. Choose your rating again.');}catch(e){status(e.message);}return;}
  this.ratingPending=true;const generation=this.studyGeneration;try{
   await q.capture({protocolVersion:1,siteId:config.siteId,ownerId:config.ownerId,requestId:crypto.randomUUID(),cardId:cid(card),siblingGroupId:group(card),expectedVersion:card.review_version,rating,clockTicketId:anchor.clockTicketId,elapsedMs:Math.floor(anchor.base+performance.now()-anchor.at)});
   if(!active||this.currentCard!==card||this.studyGeneration!==generation)return;
   this.stats.studied++;if(rating>=3)this.stats.correct++;if(card.state==='new')this.stats.new_studied++;else this.stats.reviews_studied++;
   this.ratingPending=false;this.cards=this.cards.filter(allowed);this.nextCard();status();
  }catch(e){status(e.message);}finally{this.ratingPending=false;}
 };
 function invalidate(){++epoch;anchors.clear();if(active&&ownerApp)fresh(ownerApp).catch(e=>status(e.message));}
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')invalidate();else{++epoch;anchors.clear();}});
 window.addEventListener('pagehide',()=>{active=false;++epoch;anchors.clear();clearTimeout(refreshTimer);queue?.dispose();queue=null;});
 window.addEventListener('pageshow',e=>{if(e.persisted){active=true;getQueue(ownerApp);invalidate();}});
 // Exposed adapter state supports same-byte DOM regression fixtures without storage substitutes.
 Study.prototype.backgroundReview=()=>({queue,anchors,now,fresh:()=>fresh(ownerApp),invalidate});
})(StudyApp,window.HebleoBackgroundConfig);
