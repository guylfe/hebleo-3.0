/* Scoped flashcard feedback: shared audio and read-only review activity. */
(function(){'use strict';
function install(){
 if(typeof StudyApp==='undefined')return;
 const p=StudyApp.prototype,player=new Audio(),info=new WeakMap();let played=null,activeContext=null;
 const root=()=>document.getElementById('study-app'),app=()=>{try{return studyApp;}catch(_){return null;}};
 function stop(){player.pause();try{player.currentTime=0;}catch(_){} }
 function sync(){
  const a=app(),r=root();if(!a||!r||a.currentView!=='study'||!a.currentCard||!r.dataset.studyGeneration){stop();return;}
  const key=[r.dataset.studyGeneration,r.dataset.studyFace].join(':');if(activeContext!==key){stop();activeContext=key;}
  if(!parseInt(a.currentDeckSettings?.autoplay_audio)||document.hidden){stop();return;}
  const frames=Array.from(r.querySelectorAll('iframe[data-hebleo-shared]'));
  const front=frames.find(f=>!f.closest('.card-back')),back=frames.find(f=>f.closest('.card-back'));
  const frontInfo=info.get(front),backInfo=info.get(back),data=r.dataset.studyFace==='back'?backInfo:frontInfo;
  if(!data||data.generation!==r.dataset.studyGeneration||r.dataset.studyFace==='front'&&!data.hebrew)return;
  const url=data.audio||backInfo?.audio;if(!url||backInfo&&backInfo.generation!==r.dataset.studyGeneration||played===key)return;
  played=key;player.src=url;try{player.play()?.catch(()=>{});}catch(_){}
 }
 window.addEventListener('message',e=>{
  const r=root(),f=r&&Array.from(r.querySelectorAll('iframe[data-hebleo-shared]')).find(f=>f.contentWindow===e.source),d=e.data;if(!f||!d)return;
  if(d.type==='hebleo-manual-audio'&&Object.keys(d).join('|')==='type'){stop();return;}
  if(d.type!=='hebleo-base-audio'||Object.keys(d).sort().join('|')!=='audio|context|hebrew|type'||typeof d.hebrew!=='boolean')return;
  const c=d.context;if(!c||Object.keys(c).sort().join('|')!=='face|generation|noteId|templateId'||c.generation!==r.dataset.studyGeneration||c.noteId!==r.dataset.studyNoteId||c.templateId!==r.dataset.studyTemplateId||c.face!==(f.closest('.card-back')?'back':'front'))return;
  if(d.audio!==null){try{const u=new URL(d.audio);if(u.origin!==location.origin||!u.pathname.startsWith('/wp-content/uploads/')||!u.pathname.endsWith('.mp3')||u.search||u.hash)return;}catch(_){return;}}
  info.set(f,{audio:d.audio,hebrew:d.hebrew,generation:c.generation});sync();
 });
 document.addEventListener('hebleo-study-context',sync);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});window.addEventListener('pagehide',stop);
 const autoplay=p.startAutoplay;p.startAutoplay=function(side){if(root()?.querySelector('iframe[data-hebleo-shared]')){sync();return;}return autoplay.call(this,side);};
 for(const name of ['pauseAllAudio','stopAutoplay']){const old=p[name];p[name]=function(...args){stop();return old.apply(this,args);};}
 const render=p.renderDeckSelector;p.renderDeckSelector=function(...args){const result=render.apply(this,args),r=root(),grid=r?.querySelector('.deck-grid');if(!grid)return result;
  const section=document.createElement('div');section.dataset.reviewActivity='';grid.before(section);
  this.makeRequest('hebleo_review_activity').then(v=>{if(!section.isConnected)return;if(v?.success){section.innerHTML=window.HebleoHeatmap(v.data);}else{section.textContent='Review activity could not load.';}}).catch(()=>{if(section.isConnected)section.textContent='Review activity could not load.';});return result;
 };
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
}());
