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

export function mountSourceActivities(host,{textPages,renderLesson,initialState={},loadProgress,saveProgress,onState=()=>{},onGateChange=()=>{},onContinue,isCurrent=()=>true,clock,dock=true}={}){
 const doc=host.ownerDocument,view=doc.defaultView,pages=textPages.order.map(id=>textPages.pages.find(p=>p.id===id));
 const responses=Object.assign(Object.create(null),structuredClone(initialState.responses||{}));
 let index=Math.max(0,pages.findIndex(p=>p.id===initialState.cursorPageId)),disposed=false,edited=false,queue=Promise.resolve(),optionalQueue=Promise.resolve(),failed=new Map(),message='',dockBinding,observer;
 const latest=new Map(),pending=new Set(),answerSaves=new WeakSet();let successHandle,navigating=false;
 let handle,generation=0,deadline=0,animationHandle,audio,speaking=false,studyVisible=false,datesSettled=true,live='';
 const schedule=clock?.schedule||((f,ms)=>view.setTimeout(f,ms)),cancel=clock?.cancel||(id=>view.clearTimeout(id)),now=clock?.now||(()=>view.performance.now());
 const active=()=>!disposed&&host.isConnected&&isCurrent(),page=()=>pages[index],r=()=>responses[page().id]||{},snap=()=>({cursorPageId:page().id,responses:structuredClone(responses),unsavedOptional:[...new Set([...pending,...failed.values()].filter(r=>r.optional).map(r=>r.pageId))]});
 const safe=s=>renderLesson?renderLesson(s||''):'<p>'+esc(s)+'</p>';
 function status(){const el=host.querySelector('[data-source-save]');if(el)el.textContent=message;const retry=host.querySelector('[data-source-action="retry"]');if(retry){retry.hidden=!failed.size;retry.disabled=!!pending.size;}const next=host.querySelector('[data-source-action="next"]');if(next)next.disabled=navigating||!textPageGatePassed(page(),r())||(index===pages.length-1&&(!onContinue||!textGatesPassed(textPages,snap())));}
 function saveStatus(record){
  cancel(successHandle);successHandle=undefined;
  if([...failed.values()].some(record=>!pending.has(record)))message='Progress could not save. Your answers remain here. Retry saving.';
  else if(pending.size)message='Saving…';
  else if(record&&answerSaves.has(record)&&record.pageId===page().id&&latest.get(record.pageId)===record){message='Answers saved.';successHandle=schedule(()=>{if(active()){message='';status();}},1800);}
  else message='';
  status();
 }
 function send(record){
  pending.add(record);saveStatus();
  const task=(record.optional?optionalQueue:queue).catch(()=>{}).then(()=>latest.get(record.pageId)===record?saveProgress(record):undefined).then(()=>{if(latest.get(record.pageId)===record)failed.delete(record.pageId);},()=>{if(latest.get(record.pageId)===record)failed.set(record.pageId,record);}).then(()=>{pending.delete(record);if(active()){onState(snap());saveStatus(record);}});
  if(record.optional)optionalQueue=task;else queue=task;
 }
 function persist(answer=false){edited=true;if(saveProgress){const record={pageId:page().id,cursorPageId:page().id,response:structuredClone(r()),optional:page().activity?.optional===true};if(answer)answerSaves.add(record);latest.set(record.pageId,record);failed.delete(record.pageId);send(record);}else{message='';status();}onState(snap());onGateChange(textGatesPassed(textPages,snap()),snap());}
 function update(patch,draw=true){responses[page().id]={...r(),...patch};persist(['text','choice','matches','attempted'].some(key=>Object.hasOwn(patch,key)));if(draw)render();}
 function stop(){generation++;cancel(handle);cancel(animationHandle);handle=animationHandle=undefined;deadline=0;studyVisible=false;audio?.pause();audio=null;if(speaking)view.speechSynthesis?.cancel();speaking=false;}
 function comparisonResult(a,rr){
  const first=Object.entries(responses).find(([id])=>pages.find(p=>p.id===id)?.activity?.kind==='memory-first')?.[1];
  const feedback=memoryComparison(rr.attempted?rr.text:'',a.feedback),digits=String(rr.text||'').replace(/[\s/.·,;:–—-]/g,''),partial=feedback.includes(a.feedback.partial)&&/^\d+$/.test(digits);
  const groups=partial?'<p>Compare the digit groups:</p><div class="source-comparison" dir="ltr">'+[0,8].map(start=>{const expected=a.value.slice(start,start+8),actual=digits.slice(start,start+8);return '<p>'+esc(expected)+' → '+(expected===actual?esc(actual):'<mark aria-label="Different digit group">'+esc(actual||'(empty)')+'</mark>')+'</p>';}).join('')+'</div>':'';
  return '<div role="status">'+feedback.map(s=>'<p>'+esc(s)+'</p>').join('')+'</div><dl class="source-comparison"><dt>Original number</dt><dd dir="ltr">'+esc(a.value)+'</dd><dt>The two dates</dt><dd dir="ltr">'+esc(a.dates)+'</dd>'+(first?.attempted?'<dt>Your first attempt'+(first.study?' (untimed study)':'')+'</dt><dd dir="ltr">'+esc(first.text||'(empty)')+'</dd>':'')+(rr.attempted?'<dt>Your later attempt</dt><dd dir="ltr">'+esc(rr.text||'(empty)')+'</dd>':'')+'</dl>'+groups;
 }
 function dateMarkup(a){
  return '<div class="source-date-frame" data-date-frame dir="ltr" aria-hidden="true">'+a.stages[0].split('').map((digit,i)=>'<span class="source-date-digit" data-digit="'+i+'">'+esc(digit)+'</span>').join('')+[4,7,17,20].map(x=>'<span class="source-date-slash" style="transform:translateX('+x+'ch)">/</span>').join('')+'</div><p class="sr-only" role="status" data-date-summary></p><div class="button-row">'+btn('animate','Show the connection')+btn('animation-next','Group the digits')+'</div><div data-date-teaching hidden>'+safe(a.after)+'<div class="source-principles">'+a.principles.map((item,i)=>'<details data-source-principle="'+i+'"><summary><strong>'+(i+1)+'. '+esc(item.title)+'</strong></summary><p>'+esc(item.text)+'</p></details>').join('')+'</div></div>';
 }
 function syncDate(){
  const a=page().activity,rr=r(),stage=rr.stage??-1,frame=host.querySelector('[data-date-frame]');if(!frame)return;
  frame.style.visibility=stage<0?'hidden':'visible';frame.dataset.stage=String(stage);
  frame.querySelectorAll('[data-digit]').forEach((node,i)=>{const offset=stage===2?(i<8?2:15)+[0,1,3,4,6,7,8,9][i%8]:stage===1?(i<8?3.5+i:15.5+i-8):5.5+i;node.style.transform='translateX('+offset+'ch)';});
  const summary=host.querySelector('[data-date-summary]');summary.textContent=stage<0?'':stage===2?a.stages[stage]:a.descriptions[stage];
  const replay=host.querySelector('[data-source-action="animate"]');replay.textContent=stage<0?'Show the connection':'Replay connection';
  const step=host.querySelector('[data-source-action="animation-next"]');step.hidden=stage<0||stage===2;step.textContent=stage===0?'Group the digits':'Add date separators';
  host.querySelector('[data-date-teaching]').hidden=stage!==2||!datesSettled;
  for(const el of host.querySelectorAll('[data-source-principle]'))el.open=(rr.principlesOpen||[]).includes(Number(el.dataset.sourcePrinciple));
 }
 function toggle(event){
  const el=event.target;
  if(el.matches('[data-source-comparison]')){if(Boolean(r().opened)!==el.open)update({opened:el.open},false);return;}
  if(!el.matches('[data-source-principle]')||page().activity?.principleInteraction!=='expandable')return;
  const i=Number(el.dataset.sourcePrinciple),open=r().principlesOpen||[];
  if(open.includes(i)===el.open)return;
  update({principlesOpen:el.open?[...open,i]:open.filter(n=>n!==i),principlesSeen:el.open?[...new Set([...(r().principlesSeen||[]),i])]:r().principlesSeen||[]},false);
 }
 function media(item,label){return item?.audio?btn('audio:'+item.id,label||'Play sound'): '<p class="hint">Sound recording unavailable.</p>';}
 // Keep missing listening stimuli explicit without exposing a target sound or
 // letter as a substitute. Original author prompts/options/feedback stay intact.
 function stimulus(a){return a.audio?media(a,'Play sound'):'<p class="hint" role="status" data-source-stimulus-unavailable>Sound recording unavailable. This listening activity is unfinished.</p>';}
 function field(p,rr){return '<label>'+esc(p.prompt||'Your attempt')+'<textarea data-source-input '+(p.activity?.kind==='letter-input'?'id="answer" '+(p.activity.copy?'data-copy-letter="'+esc(p.activity.answer)+'" ':'')+'data-hebleo-keyboard-target dir="rtl"':'dir="ltr"')+' rows="2" maxlength="12000" style="resize:none" '+(rr.checked?'readonly':'')+'>'+esc(rr.text)+'</textarea></label>';}
 function body(p,rr,commit=html=>html){
  const a=p.activity||{},kind=a.kind;
  if(kind==='memory-first'){
   const running=rr.started&&!rr.checked&&!rr.interrupted&&(deadline>now()||studyVisible);
   const number='<div class="text-reader-value source-number" data-source-exposure dir="ltr" draggable="false" aria-label="'+esc(a.value.split('').join(' '))+'">'+esc(a.value)+'</div>';
   return safe(p.html)+(rr.study?'<p class="hint">Untimed study mode · separate from the timed experiment.</p>':'')+(running?number+(studyVisible?btn('hide-study','Hide and recall'):'<progress class="source-exposure-timer" data-source-timer max="'+a.durationMs+'" value="'+Math.max(0,deadline-now())+'" aria-label="Time remaining to study the number"></progress><p data-source-time-remaining>'+Math.ceil(Math.max(0,deadline-now())/1000)+' seconds remaining</p><p>The number will disappear before you write.</p>'):!rr.started&&!rr.checked?'<div class="button-row">'+btn('play','Play')+'</div><details><summary>Accessible untimed study option</summary><p>Study the same digits without a timer, then hide them before recall. This is a separate study mode.</p>'+btn('study','Start untimed study')+'</details>':!rr.checked?field(p,rr):'<p role="status">'+esc(rr.attempted&&String(rr.text).replace(/\s/g,'')===a.value?a.feedback.exact:a.feedback.partial)+'</p>')+(!rr.checked?'<div class="button-row">'+btn('skip','Show me how')+'</div>':'');
  }
  if(kind==='date-connection'){
   if(a.principleInteraction==='expandable')return safe(p.html)+dateMarkup(a);
   const stage=rr.stage??-1;
   return safe(p.html)+'<div class="source-date-demo" aria-live="polite">'+(stage>=0?'<div class="source-number" dir="ltr">'+esc(a.stages[stage])+'</div><p>'+esc(a.descriptions[stage])+'</p>':'')+'</div><div class="button-row">'+(stage<0?btn('animate','Show the connection'):stage<2?btn('animation-next','Next step'):btn('animate','Replay connection'))+'</div>'+(stage===2?safe(a.after)+(a.principles||[]).slice(0,rr.revealCount||0).map(item=>'<p><strong>'+esc(item.title)+'</strong> '+esc(item.text)+'</p>').join('')+((rr.revealCount||0)<a.principles.length?btn('principle','Show the next idea'):''):'');
  }
  if(kind==='memory-comparison'){
   if(a.optional){
    const content=rr.skipped?'<p>Comparison skipped. You can continue.</p>':!rr.checked?safe(a.intro)+field(p,rr)+'<div class="button-row">'+btn('compare','Show the comparison')+btn('skip','Skip')+'</div>':comparisonResult(a,rr);
    return safe(p.html)+'<details data-source-comparison '+(rr.opened?'open':'')+'><summary>'+esc(a.label||'Try the comparison (optional)')+'</summary>'+content+'</details>';
   }
   if(!rr.opened&&!rr.checked)return safe(p.html)+'<div class="button-row">'+btn('open','Try the comparison')+btn('skip','Continue without it')+'</div>';
   if(rr.skipped)return safe(p.html)+'<p>You can continue to the next lesson.</p>';
   if(!rr.checked)return safe(p.html)+field(p,rr)+'<div class="button-row">'+commit(btn('compare','Show the comparison',false,true))+btn('skip','Skip')+'</div>';
   const first=Object.entries(responses).find(([id])=>pages.find(p=>p.id===id)?.activity?.kind==='memory-first')?.[1];
   const feedback=memoryComparison(rr.attempted?rr.text:'',a.feedback),digits=String(rr.text||'').replace(/[\s/.·,;:–—-]/g,''),partial=feedback.includes(a.feedback.partial)&&/^\d+$/.test(digits);
   const groups=partial?'<p>Compare the digit groups:</p><div class="source-comparison" dir="ltr">'+[0,8].map(start=>{const expected=a.value.slice(start,start+8),actual=digits.slice(start,start+8);return '<p>'+esc(expected)+' → '+(expected===actual?esc(actual):'<mark aria-label="Different digit group">'+esc(actual||'(empty)')+'</mark>')+'</p>';}).join('')+'</div>':'';
   return safe(p.html)+'<div role="status">'+feedback.map(s=>'<p>'+esc(s)+'</p>').join('')+'</div><dl class="source-comparison"><dt>Original number</dt><dd dir="ltr">'+esc(a.value)+'</dd><dt>The two dates</dt><dd dir="ltr">'+esc(a.dates)+'</dd>'+(first?.attempted?'<dt>Your first attempt'+(first.study?' (untimed study)':'')+'</dt><dd dir="ltr">'+esc(first.text||'(empty)')+'</dd>':'')+(rr.attempted?'<dt>Your later attempt</dt><dd dir="ltr">'+esc(rr.text||'(empty)')+'</dd>':'')+'</dl>'+groups;
  }
  if(kind==='letter-gallery')return '<div class="source-letter-gallery">'+a.items.map(item=>'<figure><div class="source-mnemonic">'+(item.image?'<img src="'+esc(item.image)+'" alt="'+esc(item.alt)+'" width="400" height="260">':'')+'</div><figcaption><bdi class="source-letter" lang="he" dir="rtl">'+esc(item.letter)+'</bdi>'+safe(item.text)+media(item,'Play '+item.sound)+'</figcaption></figure>').join('')+'</div>'+safe(p.html);
  if(kind==='letter-input')return safe(p.html)+(!a.copy?stimulus(a):a.audio?media(a,'Play sound'):'')+field(p,rr)+(!rr.checked?'<div class="button-row">'+btn('keyboard','Open Hebrew keyboard')+commit(btn('check-input','Check answer',!String(rr.text||'').trim(),true))+'</div>':'<div role="status" class="feedback"><strong>'+esc(normalized(rr.text)===a.answer?'Correct':'Incorrect')+'</strong><p>'+esc(a.feedback)+'</p></div>');
  if(kind==='letter-matching')return safe(p.html)+'<fieldset><legend>'+esc(p.prompt)+'</legend>'+a.items.map(item=>'<label class="source-match"><span>'+esc(item.sound)+'</span>'+media(item,'Play '+item.sound)+'<select data-source-match="'+esc(item.id)+'" '+(rr.checked?'disabled':'')+' aria-label="Letter for '+esc(item.sound)+'"><option value="">Choose a letter</option>'+a.options.map(v=>'<option '+(rr.matches?.[item.id]===v?'selected ':'')+'value="'+esc(v)+'">'+esc(v)+'</option>').join('')+'</select></label>').join('')+'</fieldset>'+(rr.checked?'<div role="status" class="feedback">'+a.items.map(item=>'<p>'+esc(rr.matches?.[item.id]===item.letter?'Correct: ':'Compare: ')+esc(item.sound)+' → <bdi lang="he" dir="rtl">'+esc(item.letter)+'</bdi></p>').join('')+'<p>'+esc(a.feedback)+'</p></div>':commit(btn('check-match','Check answer',a.items.some(item=>!rr.matches?.[item.id]),true)));
  if(kind==='self-check')return safe(p.html)+'<p>'+esc(p.prompt)+'</p>'+(rr.revealed?'<p role="status">'+esc(a.feedback)+'</p><div class="button-row">'+a.items.map(item=>media(item,'Play '+item.letter)).join('')+'</div>':btn('model','Show sound models'))+(!rr.checked?btn('skip','Continue without it'):'');
  if(p.type==='choice')return safe(p.html)+(a.sound||a.audio?stimulus(a):'')+'<fieldset><legend>'+esc(p.prompt)+'</legend>'+p.options.map((option,i)=>'<label class="source-choice"><input type="radio" name="source-choice" value="'+i+'" '+(rr.choice===i?'checked ':'')+(rr.checked?'disabled':'')+'><bdi dir="auto">'+esc(option)+'</bdi></label>').join('')+'</fieldset>'+(rr.checked?'<div role="status" class="feedback"><p>'+esc(a.feedback[rr.choice])+'</p>'+(rr.choice!==p.answer&&a.showCorrectFeedback?'<p>'+esc(a.feedback[p.answer])+'</p>':'')+'</div>':commit(btn('check-choice','Check answer',!Number.isInteger(rr.choice),true)));
  return safe(p.html);
 }
 function keyboard(){const a=page().activity||{};view.HebleoKeyboard?.sync({knownKeys:'',newKeys:a.kind==='letter-input'&&a.copy&&!r().checked?a.answer:''},{keyboardPinned:false,keyboardConvert:false},'source|'+page().id);}
 function render(focus=false){if(!active())return;const focused=host.contains(doc.activeElement)?doc.activeElement.dataset.sourceAction:null;const p=page(),rr=r(),passed=textPageGatePassed(p,rr);
  if(p.activity?.principleInteraction==='expandable'&&host.dataset.sourceDatePage===p.id){syncDate();status();onGateChange(textGatesPassed(textPages,snap()),snap());return;}
  delete host.dataset.sourceDatePage;dockBinding?.destroy();
  let commitment='';const content=body(p,rr,html=>{commitment=html;return '';});
  // Move each existing commitment into the single primary dock slot.
  if(p.activity?.kind==='memory-first'&&rr.started&&!rr.checked&&!deadline&&!speaking&&!studyVisible)commitment=btn('submit-first','Continue',false,true);
  const next=btn('next',navigating?'Saving…':'Continue →',navigating||!passed||(index===pages.length-1&&(!onContinue||!textGatesPassed(textPages,snap()))),true),back=btn('back','← Back',index===0);
  const nav=dock?exerciseActionDock(commitment||next,back,'').replace('aria-label="Question actions"','aria-label="Lesson page actions"'):'<nav class="text-reader-pagination">'+back+(commitment||next)+'</nav>';
  host.innerHTML='<header><p class="tag">'+esc(p.stage||'Learn')+' · Page '+(index+1)+' of '+pages.length+'</p><h3 tabindex="-1" data-source-heading>'+esc(p.title)+'</h3></header><div class="text-reader-body source-activity">'+content+'</div><p class="sr-only" role="status" aria-live="polite">'+esc(live)+'</p><div class="text-reader-actions">'+nav+'</div><p role="status" data-source-save>'+esc(message)+'</p><button type="button" class="button secondary small" data-source-action="retry" '+(!failed.size?'hidden':'')+' '+(pending.size?'disabled':'')+'>Retry saving</button>';
  if(p.activity?.principleInteraction==='expandable'){host.dataset.sourceDatePage=p.id;syncDate();}
  if(dock)dockBinding=mountExerciseDock(host);keyboard();onGateChange(textGatesPassed(textPages,snap()),snap());
  if(focus)host.querySelector('[data-source-heading]')?.focus({preventScroll:true});else if(focused)host.querySelector('[data-source-action="'+focused+'"]')?.focus({preventScroll:true});
 }
 function animate(){const replay=r().stage>=0;stop();const modern=page().activity.principleInteraction==='expandable';datesSettled=!modern;update(modern?{stage:0}:{stage:0,revealCount:0,checked:false});const token=generation;
  if(view.matchMedia?.('(prefers-reduced-motion: reduce)').matches||host.closest('.reduce-motion'))return;
  if(modern){animationHandle=schedule(()=>{if(token!==generation||!active())return;update({stage:1});animationHandle=schedule(()=>{if(token!==generation||!active())return;update({stage:2});animationHandle=schedule(()=>{if(token!==generation||!active())return;datesSettled=true;if(!r().principlesOpen)update({principlesOpen:[0],principlesSeen:[0]});else syncDate();},900);},1800);},replay?1800:40);return;}
  const advance=()=>{if(token!==generation||!active())return;const stage=(r().stage||0)+1;update({stage});if(stage<2)animationHandle=schedule(advance,1400);};animationHandle=schedule(advance,1400);
 }
 async function advance(){
  if(navigating||!textPageGatePassed(page(),r()))return;
  const token=generation;navigating=true;status();if([...pending].some(r=>!r.optional))await queue;
  if(!active()||token!==generation){navigating=false;return;}
  navigating=false;if([...failed.values()].some(r=>!r.optional)){saveStatus();return;}
  if(index===pages.length-1){if(onContinue&&textGatesPassed(textPages,snap())){navigating=true;status();try{await onContinue();}catch{if(active())message='Could not continue. Try Continue again.';}finally{navigating=false;if(active())status();}}return;}
  stop();index++;persist();render(true);
 }
 function click(event){const el=event.target.closest('[data-source-action]');if(!el||!host.contains(el)||el.disabled)return;event.stopPropagation();const action=el.dataset.sourceAction,p=page(),a=p.activity||{};
  if(action==='next'){void advance();return;}
  if(action==='back'){stop();navigating=false;index=Math.max(0,index-1);persist();render(true);return;}
  if(action==='study'){
   if(r().started||r().checked||doc.hidden)return;stop();studyVisible=true;update({started:true,study:true});return;
  }
  if(action==='hide-study'){studyVisible=false;update({interrupted:true});host.querySelector('[data-source-input]')?.focus({preventScroll:true});return;}
  if(action==='play'){
   if(r().started||r().checked||doc.hidden)return;stop();update({started:true});const token=generation;
   deadline=now()+a.durationMs;render();const tick=()=>{if(token!==generation||!active())return;const remaining=Math.max(0,deadline-now());if(remaining){const bar=host.querySelector('[data-source-timer]');if(bar){bar.value=remaining;bar.setAttribute('aria-valuetext',Math.ceil(remaining/1000)+' seconds remaining');}const label=host.querySelector('[data-source-time-remaining]');if(label)label.textContent=Math.ceil(remaining/1000)+' seconds remaining';handle=schedule(tick,Math.min(100,remaining));return;}deadline=0;handle=undefined;render();host.querySelector('[data-source-input]')?.focus({preventScroll:true});};handle=schedule(tick,Math.min(100,a.durationMs));return;
  }
  if(action==='skip'){stop();update({skipped:true,checked:true});return;}
  if(action==='submit-first'){stop();update({attempted:true,checked:true});return;}
  if(action==='animate'){animate();return;}
  if(action==='animation-next'){cancel(animationHandle);datesSettled=true;const stage=Math.min(2,(r().stage||0)+1);update({stage,...(stage===2&&!r().principlesOpen?{principlesOpen:[0],principlesSeen:[0]}:{})});return;}
  if(action==='principle'){const count=Math.min(a.principles.length,(r().revealCount||0)+1);live=a.principles[count-1].title+' '+a.principles[count-1].text;update({revealCount:count,checked:count===a.principles.length});if(count===a.principles.length)host.querySelector('[data-source-action="next"]')?.focus({preventScroll:true});return;}
  if(action==='open'){update({opened:true});host.querySelector('[data-source-input]')?.focus();return;}
  if(action==='compare'){update({checked:true,attempted:Object.hasOwn(r(),'text'),opened:true});return;}
  if(action==='check-choice'||action==='check-input'||action==='check-match'){update({checked:true,attempted:true});return;}
  if(action==='model'){update({revealed:true,checked:true});return;}
  if(action==='keyboard'){view.HebleoKeyboard?.open(host.querySelector('[data-source-input]'));return;}
  if(action==='retry'){for(const record of failed.values())send(record);return;}
  if(action.startsWith('audio:')){const id=action.slice(6),item=a.id===id?a:a.items?.find(item=>item.id===id);if(!item?.audio)return;audio?.pause();audio=new view.Audio(item.audio);audio.play().catch(()=>{if(active()){message='The recording could not play. Try again.';status();}});}
 }
 function input(event){if(event.target.matches('[data-source-input]')&&!r().checked){update({text:event.target.value},false);const button=host.querySelector('[data-source-action="check-input"]');if(button)button.disabled=!event.target.value.trim();}}
 function change(event){if(r().checked)return;if(event.target.matches('[name="source-choice"]')){update({choice:Number(event.target.value)});host.querySelector('[name="source-choice"]:checked')?.focus();}if(event.target.matches('[data-source-match]')){const id=event.target.dataset.sourceMatch,value=event.target.value,matches={...r().matches};for(const k of Object.keys(matches))if(matches[k]===value)delete matches[k];matches[id]=value;update({matches});host.querySelector('[data-source-match="'+id+'"]')?.focus();}}
 function preventNumberTransfer(event){if(event.target.closest?.('[data-source-exposure]'))event.preventDefault();}
 function copy(event){
  const number=host.querySelector('[data-source-exposure]');if(!number)return;
  const selection=doc.getSelection();if(!selection?.rangeCount)return;
  const ranges=Array.from({length:selection.rangeCount},(_,i)=>selection.getRangeAt(i));if(!ranges.some(range=>range.intersectsNode(number)))return;
  const contents=doc.createElement('div');for(const range of ranges)if(!number.contains(range.commonAncestorContainer))contents.append(range.cloneContents());contents.querySelectorAll('[data-source-exposure]').forEach(el=>el.remove());
  event.preventDefault();event.clipboardData?.setData('text/plain',contents.textContent);
 }
 function visibility(){if(!doc.hidden)return;const interrupted=page().activity?.kind==='memory-first'&&r().started&&!r().checked;stop();navigating=false;if(interrupted)update({interrupted:true});}
 function destroy(){if(disposed)return;visibility();onState(snap());disposed=true;stop();cancel(successHandle);dockBinding?.destroy();observer?.disconnect();host.removeEventListener('click',click);host.removeEventListener('input',input);host.removeEventListener('change',change);host.removeEventListener('toggle',toggle,true);host.removeEventListener('selectstart',preventNumberTransfer);host.removeEventListener('dragstart',preventNumberTransfer);doc.removeEventListener('copy',copy);doc.removeEventListener('cut',copy);doc.removeEventListener('visibilitychange',visibility);host.replaceChildren();}
 host.addEventListener('click',click);host.addEventListener('input',input);host.addEventListener('change',change);doc.addEventListener('visibilitychange',visibility);
 host.addEventListener('toggle',toggle,true);host.addEventListener('selectstart',preventNumberTransfer);host.addEventListener('dragstart',preventNumberTransfer);doc.addEventListener('copy',copy);doc.addEventListener('cut',copy);
 // A saved started round resumes at recall, without displaying the number again.
 for(const p of pages)if(p.activity?.kind==='memory-first'&&responses[p.id]?.started&&!responses[p.id]?.checked)responses[p.id].interrupted=true;
 for(const id of initialState.unsavedOptional||[]){const p=pages.find(p=>p.id===id&&p.activity?.optional===true);if(p&&saveProgress){const record={pageId:id,cursorPageId:page().id,response:structuredClone(responses[id]||{}),optional:true};latest.set(id,record);failed.set(id,record);}}
 observer=new view.MutationObserver(()=>{if(!host.isConnected)destroy();});observer.observe(doc,{subtree:true,childList:true});render();if(failed.size)saveStatus();
 if(loadProgress){message='Loading saved answers…';status();Promise.resolve().then(loadProgress).then(saved=>{if(!active()||edited)return;Object.assign(responses,saved?.responses||{});for(const p of pages)if(p.activity?.kind==='memory-first'&&responses[p.id]?.started&&!responses[p.id]?.checked)responses[p.id].interrupted=true;index=Math.max(0,pages.findIndex(p=>p.id===saved?.cursorPageId));message='';render();},()=>{if(active()){message='Saved answers could not load. You can continue here.';status();}});}
 return {destroy,getState:snap,settled:()=>queue,optionalSettled:()=>optionalQueue};
}
