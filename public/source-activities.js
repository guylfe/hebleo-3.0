// Shared interactive, source-authored lesson pages. Learner and Studio use this owner.
import {exerciseActionDock,mountExerciseDock} from './exercise-actions.js';
import {textGatesPassed,textPageGatePassed,SOURCE_MEMORY_VALUE} from './text-contract.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const btn=(a,label,disabled=false,primary=false)=>'<button type="button" class="button '+(primary?'primary':'secondary')+'" data-source-action="'+a+'" '+(disabled?'disabled':'')+'>'+esc(label)+'</button>';
const normalized=v=>String(v).normalize('NFD').replace(/[\u0591-\u05c7]/g,'').trim();

// Only explicitly known equivalent forms are classified. No arbitrary date parsing.
export function memoryComparison(raw,feedback){
 const digits=String(raw).replace(/[\s/.·,;:–—-]/g,'');
 if(!raw.trim())return [feedback.empty];
 if(digits===SOURCE_MEMORY_VALUE)return [feedback.exact];
 const dates=[{month:'07',day:'04',year:'1776'},{month:'09',day:'11',year:'2001'}];
 for(const reverse of [false,true])for(const dayFirst of [false,true])for(let zeros=0;zeros<16;zeros++){
  const list=(reverse?[...dates].reverse():dates).map((d,i)=>{
   const a=dayFirst?d.day:d.month,b=dayFirst?d.month:d.day;
   return ((zeros&(1<<(i*2)))?String(Number(a)):a)+((zeros&(1<<(i*2+1)))?String(Number(b)):b)+d.year;
  });
  if(list.join('')!==digits)continue;
  const omitted=list.some((s,i)=>s.length<(reverse?[...dates].reverse():dates)[i].year.length+4);
  return [...(reverse?[feedback.reverse]:[]),...(dayFirst?[feedback.dayMonth]:[]),...(omitted?[feedback.zeros]:[])];
 }
 return [feedback.partial];
}

export function mountSourceActivities(host,{textPages,renderLesson,initialState={},loadProgress,saveProgress,onState=()=>{},onGateChange=()=>{},isCurrent=()=>true,clock,dock=true}={}){
 const doc=host.ownerDocument,view=doc.defaultView,pages=textPages.order.map(id=>textPages.pages.find(p=>p.id===id));
 const responses=Object.assign(Object.create(null),structuredClone(initialState.responses||{}));
 let index=Math.max(0,pages.findIndex(p=>p.id===initialState.cursorPageId)),disposed=false,edited=false,queue=Promise.resolve(),failed=new Map(),message='',dockBinding,observer;
 const latest=new Map();
 let handle,generation=0,deadline=0,animationHandle,audio,speaking=false,live='';
 const schedule=clock?.schedule||((f,ms)=>view.setTimeout(f,ms)),cancel=clock?.cancel||(id=>view.clearTimeout(id)),now=clock?.now||(()=>view.performance.now());
 const active=()=>!disposed&&host.isConnected&&isCurrent(),page=()=>pages[index],r=()=>responses[page().id]||{},snap=()=>({cursorPageId:page().id,responses:structuredClone(responses)});
 const safe=s=>renderLesson?renderLesson(s||''):'<p>'+esc(s)+'</p>';
 function status(){const el=host.querySelector('[data-source-save]');if(el)el.textContent=message;const retry=host.querySelector('[data-source-action="retry"]');if(retry)retry.hidden=!failed.size;}
 function send(record){queue=queue.catch(()=>{}).then(()=>latest.get(record.pageId)===record?saveProgress(record):undefined).then(()=>{if(latest.get(record.pageId)===record)failed.delete(record.pageId);if(active()){message=failed.size?'Some answers could not save. Retry saving.':'Answers saved.';status();}},()=>{if(latest.get(record.pageId)!==record)return;failed.set(record.pageId,record);if(active()){message='Your answer could not save. Retry saving.';status();}});}
 function persist(){edited=true;onState(snap());onGateChange(textGatesPassed(textPages,snap()),snap());if(saveProgress){message='Saving…';const record={pageId:page().id,cursorPageId:page().id,response:structuredClone(r())};latest.set(record.pageId,record);failed.delete(record.pageId);send(record);status();}}
 function update(patch,draw=true){responses[page().id]={...r(),...patch};persist();if(draw)render();}
 function stop(){generation++;cancel(handle);cancel(animationHandle);handle=animationHandle=undefined;deadline=0;audio?.pause();audio=null;if(speaking)view.speechSynthesis?.cancel();speaking=false;}
 function media(item,label){return item?.audio?btn('audio:'+item.id,label||'Play sound'): '<p class="hint">Sound recording unavailable.</p>';}
 // Keep missing listening stimuli explicit without exposing a target sound or
 // letter as a substitute. Original author prompts/options/feedback stay intact.
 function stimulus(a){return a.audio?media(a,'Play sound'):'<p class="hint" role="status" data-source-stimulus-unavailable>Sound recording unavailable. This listening activity is unfinished.</p>';}
 function field(p,rr){return '<label>'+esc(p.prompt||'Your attempt')+'<textarea data-source-input '+(p.activity?.kind==='letter-input'?'id="answer" '+(p.activity.copy?'data-copy-letter="'+esc(p.activity.answer)+'" ':'')+'data-hebleo-keyboard-target dir="rtl"':'dir="ltr"')+' rows="2" maxlength="12000" style="resize:none" '+(rr.checked?'readonly':'')+'>'+esc(rr.text)+'</textarea></label>';}
 function body(p,rr){
  const a=p.activity||{},kind=a.kind;
  if(kind==='memory-first'){
   const running=rr.started&&!rr.checked&&!rr.interrupted&&(deadline>now()||speaking);
   return safe(p.html)+(running?(speaking?'<p>Listen to the digit sequence.</p>':'<div class="text-reader-value source-number" dir="ltr" aria-label="'+esc(a.value.split('').join(' '))+'">'+esc(a.value)+'</div><p>The number will disappear before you write.</p>'):!rr.started&&!rr.checked?'<div class="button-row">'+btn('play','Play')+btn('speak','Hear the digits once',!view.speechSynthesis||!view.SpeechSynthesisUtterance)+'</div>':!rr.checked?field(p,rr):'<p role="status">'+esc(rr.attempted&&String(rr.text).replace(/\s/g,'')===a.value?a.feedback.exact:a.feedback.partial)+'</p>')+(!rr.checked?'<div class="button-row">'+(!running&&rr.started?btn('submit-first','Continue',false,true):'')+btn('skip','Show me how')+'</div>':'');
  }
  if(kind==='date-connection'){
   const stage=rr.stage??-1;
   return safe(p.html)+'<div class="source-date-demo" aria-live="polite">'+(stage>=0?'<div class="source-number" dir="ltr">'+esc(a.stages[stage])+'</div><p>'+esc(a.descriptions[stage])+'</p>':'')+'</div><div class="button-row">'+(stage<0?btn('animate','Show the connection'):stage<2?btn('animation-next','Next step'):btn('animate','Replay connection'))+'</div>'+(stage===2?safe(a.after)+(a.principles||[]).slice(0,rr.revealCount||0).map(item=>'<p><strong>'+esc(item.title)+'</strong> '+esc(item.text)+'</p>').join('')+((rr.revealCount||0)<a.principles.length?btn('principle','Show the next idea'):''):'');
  }
  if(kind==='memory-comparison'){
   if(!rr.opened&&!rr.checked)return safe(p.html)+'<div class="button-row">'+btn('open','Try the comparison')+btn('skip','Continue without it',false,true)+'</div>';
   if(rr.skipped)return safe(p.html)+'<p>You can continue to the next lesson.</p>';
   if(!rr.checked)return safe(p.html)+field(p,rr)+'<div class="button-row">'+btn('compare','Show the comparison',false,true)+btn('skip','Skip')+'</div>';
   const first=Object.entries(responses).find(([id])=>pages.find(p=>p.id===id)?.activity?.kind==='memory-first')?.[1];
   const feedback=memoryComparison(rr.attempted?rr.text:'',a.feedback),digits=String(rr.text||'').replace(/[\s/.·,;:–—-]/g,''),partial=feedback.includes(a.feedback.partial)&&/^\d+$/.test(digits);
   const groups=partial?'<p>Compare the digit groups:</p><div class="source-comparison" dir="ltr">'+[0,8].map(start=>{const expected=a.value.slice(start,start+8),actual=digits.slice(start,start+8);return '<p>'+esc(expected)+' → '+(expected===actual?esc(actual):'<mark aria-label="Different digit group">'+esc(actual||'(empty)')+'</mark>')+'</p>';}).join('')+'</div>':'';
   return safe(p.html)+'<div role="status">'+feedback.map(s=>'<p>'+esc(s)+'</p>').join('')+'</div><dl class="source-comparison"><dt>Original number</dt><dd dir="ltr">'+esc(a.value)+'</dd><dt>The two dates</dt><dd dir="ltr">'+esc(a.dates)+'</dd>'+(first?.attempted?'<dt>Your first attempt</dt><dd dir="ltr">'+esc(first.text||'(empty)')+'</dd>':'')+(rr.attempted?'<dt>Your later attempt</dt><dd dir="ltr">'+esc(rr.text||'(empty)')+'</dd>':'')+'</dl>'+groups;
  }
  if(kind==='letter-gallery')return '<div class="source-letter-gallery">'+a.items.map(item=>'<figure><div class="source-mnemonic">'+(item.image?'<img src="'+esc(item.image)+'" alt="'+esc(item.alt)+'" width="400" height="260">':'')+'</div><figcaption><bdi class="source-letter" lang="he" dir="rtl">'+esc(item.letter)+'</bdi>'+safe(item.text)+media(item,'Play '+item.sound)+'</figcaption></figure>').join('')+'</div>'+safe(p.html);
  if(kind==='letter-input')return safe(p.html)+(!a.copy?stimulus(a):a.audio?media(a,'Play sound'):'')+field(p,rr)+(!rr.checked?'<div class="button-row">'+btn('keyboard','Open Hebrew keyboard')+btn('check-input','Check answer',!String(rr.text||'').trim(),true)+'</div>':'<div role="status" class="feedback"><strong>'+esc(normalized(rr.text)===a.answer?'Correct':'Incorrect')+'</strong><p>'+esc(a.feedback)+'</p></div>');
  if(kind==='letter-matching')return safe(p.html)+'<fieldset><legend>'+esc(p.prompt)+'</legend>'+a.items.map(item=>'<label class="source-match"><span>'+esc(item.sound)+'</span>'+media(item,'Play '+item.sound)+'<select data-source-match="'+esc(item.id)+'" '+(rr.checked?'disabled':'')+' aria-label="Letter for '+esc(item.sound)+'"><option value="">Choose a letter</option>'+a.options.map(v=>'<option '+(rr.matches?.[item.id]===v?'selected ':'')+'value="'+esc(v)+'">'+esc(v)+'</option>').join('')+'</select></label>').join('')+'</fieldset>'+(rr.checked?'<div role="status" class="feedback">'+a.items.map(item=>'<p>'+esc(rr.matches?.[item.id]===item.letter?'Correct: ':'Compare: ')+esc(item.sound)+' → <bdi lang="he" dir="rtl">'+esc(item.letter)+'</bdi></p>').join('')+'<p>'+esc(a.feedback)+'</p></div>':btn('check-match','Check answer',a.items.some(item=>!rr.matches?.[item.id]),true));
  if(kind==='self-check')return safe(p.html)+'<p>'+esc(p.prompt)+'</p>'+(rr.revealed?'<p role="status">'+esc(a.feedback)+'</p><div class="button-row">'+a.items.map(item=>media(item,'Play '+item.letter)).join('')+'</div>':btn('model','Show sound models'))+(!rr.checked?btn('skip','Continue without it'):'');
  if(p.type==='choice')return safe(p.html)+(a.sound||a.audio?stimulus(a):'')+'<fieldset><legend>'+esc(p.prompt)+'</legend>'+p.options.map((option,i)=>'<label class="source-choice"><input type="radio" name="source-choice" value="'+i+'" '+(rr.choice===i?'checked ':'')+(rr.checked?'disabled':'')+'><bdi dir="auto">'+esc(option)+'</bdi></label>').join('')+'</fieldset>'+(rr.checked?'<div role="status" class="feedback"><p>'+esc(a.feedback[rr.choice])+'</p>'+(rr.choice!==p.answer&&a.showCorrectFeedback?'<p>'+esc(a.feedback[p.answer])+'</p>':'')+'</div>':btn('check-choice','Check answer',!Number.isInteger(rr.choice),true));
  return safe(p.html);
 }
 function keyboard(){const a=page().activity||{};view.HebleoKeyboard?.sync({knownKeys:'',newKeys:a.kind==='letter-input'&&a.copy&&!r().checked?a.answer:''},{keyboardPinned:false,keyboardConvert:false},'source|'+page().id);}
 function render(focus=false){if(!active())return;const focused=host.contains(doc.activeElement)?doc.activeElement.dataset.sourceAction:null;dockBinding?.destroy();const p=page(),rr=r(),passed=textPageGatePassed(p,rr);
  const next=btn('next',index===pages.length-1?'Ready to finish':'Continue →',index===pages.length-1||!passed,true),back=btn('back','← Back',index===0);
  const nav=dock?exerciseActionDock(next,back,'').replace('aria-label="Question actions"','aria-label="Lesson page actions"'):'<nav class="text-reader-pagination">'+back+next+'</nav>';
  host.innerHTML='<header><p class="tag">'+esc(p.stage||'Learn')+' · Page '+(index+1)+' of '+pages.length+'</p><h3 tabindex="-1" data-source-heading>'+esc(p.title)+'</h3></header><div class="text-reader-body source-activity">'+body(p,rr)+'</div><p class="sr-only" role="status" aria-live="polite">'+esc(live)+'</p><div class="text-reader-actions">'+nav+'</div><p role="status" data-source-save>'+esc(message)+'</p><button type="button" class="button secondary small" data-source-action="retry" '+(!failed.size?'hidden':'')+'>Retry saving</button>';
  if(dock)dockBinding=mountExerciseDock(host);keyboard();onGateChange(textGatesPassed(textPages,snap()),snap());
  if(focus)host.querySelector('[data-source-heading]')?.focus({preventScroll:true});else if(focused)host.querySelector('[data-source-action="'+focused+'"]')?.focus({preventScroll:true});
 }
 function animate(){stop();update({stage:0,revealCount:0,checked:false});const token=generation;
  if(view.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
  const advance=()=>{if(token!==generation||!active())return;const stage=(r().stage||0)+1;update({stage});if(stage<2)animationHandle=schedule(advance,1400);};animationHandle=schedule(advance,1400);
 }
 function click(event){const el=event.target.closest('[data-source-action]');if(!el||!host.contains(el)||el.disabled)return;event.stopPropagation();const action=el.dataset.sourceAction,p=page(),a=p.activity||{};
  if(action==='next'||action==='back'){if(action==='next'&&!textPageGatePassed(p,r()))return;stop();index=Math.max(0,Math.min(pages.length-1,index+(action==='next'?1:-1)));persist();render(true);return;}
  if(action==='play'||action==='speak'){
   if(r().started||r().checked||doc.hidden)return;stop();update({started:true});const token=generation;
   if(action==='speak'){
    if(!view.speechSynthesis||!view.SpeechSynthesisUtterance)return;const utterance=new view.SpeechSynthesisUtterance(a.value.split('').join(', '));utterance.lang='en-US';speaking=true;render();
    utterance.onend=utterance.onerror=()=>{if(token===generation&&active()){speaking=false;update({interrupted:true});}};view.speechSynthesis.speak(utterance);
   }else{deadline=now()+a.durationMs;render();const expire=()=>{if(token!==generation||!active())return;if(now()<deadline){handle=schedule(expire,deadline-now());return;}deadline=0;render();host.querySelector('[data-source-input]')?.focus({preventScroll:true});};handle=schedule(expire,a.durationMs);}return;
  }
  if(action==='skip'){stop();update({skipped:true,checked:true});return;}
  if(action==='submit-first'){stop();update({attempted:true,checked:true});return;}
  if(action==='animate'){animate();return;}
  if(action==='animation-next'){cancel(animationHandle);update({stage:Math.min(2,(r().stage||0)+1)});return;}
  if(action==='principle'){const count=Math.min(a.principles.length,(r().revealCount||0)+1);live=a.principles[count-1].title+' '+a.principles[count-1].text;update({revealCount:count,checked:count===a.principles.length});if(count===a.principles.length)host.querySelector('[data-source-action="next"]')?.focus({preventScroll:true});return;}
  if(action==='open'){update({opened:true});host.querySelector('[data-source-input]')?.focus();return;}
  if(action==='compare'){update({checked:true,attempted:Object.hasOwn(r(),'text')});return;}
  if(action==='check-choice'||action==='check-input'||action==='check-match'){update({checked:true,attempted:true});return;}
  if(action==='model'){update({revealed:true,checked:true});return;}
  if(action==='keyboard'){view.HebleoKeyboard?.open(host.querySelector('[data-source-input]'));return;}
  if(action==='retry'){for(const record of failed.values())send(record);return;}
  if(action.startsWith('audio:')){const id=action.slice(6),item=a.id===id?a:a.items?.find(item=>item.id===id);if(!item?.audio)return;audio?.pause();audio=new view.Audio(item.audio);audio.play().catch(()=>{if(active()){message='The recording could not play. Try again.';status();}});}
 }
 function input(event){if(event.target.matches('[data-source-input]')&&!r().checked){update({text:event.target.value},false);const button=host.querySelector('[data-source-action="check-input"]');if(button)button.disabled=!event.target.value.trim();}}
 function change(event){if(r().checked)return;if(event.target.matches('[name="source-choice"]')){update({choice:Number(event.target.value)});host.querySelector('[name="source-choice"]:checked')?.focus();}if(event.target.matches('[data-source-match]')){const id=event.target.dataset.sourceMatch,value=event.target.value,matches={...r().matches};for(const k of Object.keys(matches))if(matches[k]===value)delete matches[k];matches[id]=value;update({matches});host.querySelector('[data-source-match="'+id+'"]')?.focus();}}
 function visibility(){if(!doc.hidden)return;const interrupted=page().activity?.kind==='memory-first'&&r().started&&!r().checked;stop();if(interrupted)update({interrupted:true});}
 function destroy(){if(disposed)return;visibility();disposed=true;stop();dockBinding?.destroy();observer?.disconnect();host.removeEventListener('click',click);host.removeEventListener('input',input);host.removeEventListener('change',change);doc.removeEventListener('visibilitychange',visibility);host.replaceChildren();}
 host.addEventListener('click',click);host.addEventListener('input',input);host.addEventListener('change',change);doc.addEventListener('visibilitychange',visibility);
 // A saved started round resumes at recall, without displaying the number again.
 for(const p of pages)if(p.activity?.kind==='memory-first'&&responses[p.id]?.started&&!responses[p.id]?.checked)responses[p.id].interrupted=true;
 observer=new view.MutationObserver(()=>{if(!host.isConnected)destroy();});observer.observe(doc,{subtree:true,childList:true});render();
 if(loadProgress){message='Loading saved answers…';status();Promise.resolve().then(loadProgress).then(saved=>{if(!active()||edited)return;Object.assign(responses,saved?.responses||{});for(const p of pages)if(p.activity?.kind==='memory-first'&&responses[p.id]?.started&&!responses[p.id]?.checked)responses[p.id].interrupted=true;index=Math.max(0,pages.findIndex(p=>p.id===saved?.cursorPageId));message='';render();},()=>{if(active()){message='Saved answers could not load. You can continue here.';status();}});}
 return {destroy,getState:snap,settled:()=>queue};
}
