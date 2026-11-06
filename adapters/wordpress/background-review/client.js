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
  if(s?.error){const b=document.createElement('button');b.type='button';const reject=s.pending.find(x=>x.phase==='needs-resolution');b.textContent=reject?'Refresh rejected rating':'Retry saved reviews';b.onclick=async()=>{b.disabled=true;try{if(reject){const cards=await fresh(a);if(!cards)throw Error('Refresh superseded; reopen recovery.');await queue.resolveRejected(reject.intent.requestId,reject.receipt.intentHash);a.cards=cards.filter(c=>allowed(c)&&(!a.currentCard||cid(c)!==cid(a.currentCard)));}else await queue.retry();status();}catch(e){status(e.message);}};n.append(' ',b);}
 }
 async function acquire(cards){const version=++epoch;anchors.clear();const ids=[...new Set(cards.map(cid))];for(let offset=0;offset<ids.length;offset+=100){const r=await transport('hebleo_bg_clock',{card_ids:JSON.stringify(ids.slice(offset,offset+100))});if(version!==epoch)return;const at=performance.now();for(const a of r.anchors)anchors.set(a.cardId,{...a,base:r.serverNow-a.issuedAt,at});}}
 const allowed=c=>!queue?.excluded(cid(c),group(c));
 async function fresh(a){if(!active||!a.currentDeck)return;const deck=a.currentDeck;const r=await prior.makeRequest.call(a,'start_study_session',{deck_id:deck});if(!r?.success)throw Error('Unable to refresh authoritative card state.');if(deck!==a.currentDeck||!active)return;const cards=r.data.cards;await acquire(cards);if(deck!==a.currentDeck||!active)return;
  // Server queue is the sole authority for learning return. Never replace a revealed card.
  a.cards=cards.filter(c=>allowed(c)&&(!a.currentCard||cid(c)!==cid(a.currentCard)||a.currentView!=='study'));
  status();scheduleRefresh();return cards;
 }
 function scheduleRefresh(){clearTimeout(refreshTimer);if(!queue||!active||!ownerApp?.currentDeck)return;const s=queue.snapshot(),at=now();if(!Number.isFinite(at))return;const times=s.overlays.flatMap(r=>[Date.parse(r.authoritativeSchedule.due),r.siblingsUntil]).filter(t=>Number.isFinite(t)&&t>at);if(times.length)refreshTimer=setTimeout(()=>fresh(ownerApp).catch(e=>status(e.message)),Math.min(2147483647,Math.max(50,Math.min(...times)-at+50)));}
 Study.prototype.makeRequest=async function(action,data,options){const r=await prior.makeRequest.call(this,action,data,options);if(action==='start_study_session'&&r?.success){await getQueue(this).ready;await acquire(r.data.cards);r.data.cards=r.data.cards.filter(allowed);}return r;};
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
