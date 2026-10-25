// One text explanation reader for learner and disposable Studio Preview.
// Authored HTML is rendered only through the host's safe renderLesson function.
import {exerciseActionDock,mountExerciseDock} from './exercise-actions.js';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const hasTextPages = lesson => Boolean(lesson?.textPages?.pages?.length);
export const textReaderSlot = () => '<div class="text-reader" data-text-reader></div>';
const ordered = textPages => (textPages.order || []).map(id => textPages.pages.find(p => p.id === id)).filter(Boolean);
const action = (name, label, disabled=false, primary=false) => '<button type="button" class="button '+(primary?'primary':'secondary')+'" data-reader-action="'+name+'" '+(disabled?'disabled':'')+'>'+label+'</button>';

// Deadline rather than decrementing ticks: the value exists for [start, deadline).
export function createTextTimer({now, schedule, cancel, onChange}) {
  let handle, generation=0, deadline=0, phase='idle';
  function stop(next='idle') { generation++;cancel(handle);handle=undefined;deadline=0;phase=next;onChange(phase); }
  function play(duration) {
    stop();phase='running';deadline=now()+duration;const token=generation;onChange(phase);
    const tick=()=>{if(token!==generation)return;const remaining=deadline-now();if(remaining<=0){handle=undefined;deadline=0;phase='expired';onChange(phase);}else handle=schedule(tick,remaining);};
    handle=schedule(tick,duration);
  }
  return {play,stop,get phase(){return phase;},get visible(){return phase==='running'&&now()<deadline;}};
}

export function mountTextReader(host,{textPages,renderLesson,renderWord=()=>'',word=()=>null,renderMedia=()=>'',loadProgress,saveProgress,onState=()=>{},initialState={},isCurrent=()=>true,clock,dock=true}={}) {
  const doc=host.ownerDocument,view=doc.defaultView;
  const pages=ordered(textPages),responses=Object.assign(Object.create(null),structuredClone(initialState.responses||{}));
  let index=Math.max(0,pages.findIndex(p=>p.id===initialState.cursorPageId)),disposed=false,edited=false,untimed=false,queue=Promise.resolve(),failed=new Map(),saveVersion=0;
  const latest=new Map();
  let saveMessage='',observer,dockBinding;
  const active=()=>!disposed&&host.isConnected&&isCurrent();
  const page=()=>pages[index];
  const response=()=>responses[page()?.id]||{};
  const snapshot=()=>({cursorPageId:page()?.id,responses:structuredClone(responses)});
  const safe=value=>renderLesson?renderLesson(value||''):'<p>'+esc(value)+'</p>';
  const timer=createTextTimer({now:clock?.now||(()=>view.performance.now()),schedule:clock?.schedule||((f,ms)=>view.setTimeout(f,ms)),cancel:clock?.cancel||(id=>view.clearTimeout(id)),onChange:()=>{if(active())render();}});
  function saveStatus() {
    const el=host.querySelector('[data-reader-save]');if(el)el.textContent=saveMessage;
    const retry=host.querySelector('[data-reader-action="retry-save"]');if(retry)retry.hidden=!failed.size;
  }
  function persist() {
    edited=true;const p=page();if(!p)return;onState(snapshot());if(!saveProgress)return;
    const version=++saveVersion,record={pageId:p.id,response:structuredClone(response()),cursorPageId:p.id};
    latest.set(p.id,record);failed.delete(p.id);
    saveMessage='Saving text progress…';saveStatus();
    queue=queue.catch(()=>{}).then(()=>latest.get(p.id)===record?saveProgress(record):undefined).then(()=>{if(latest.get(p.id)===record)failed.delete(p.id);if(active()&&version===saveVersion){saveMessage=failed.size?'Some text progress is not saved. Retry saving.':'Text progress saved.';saveStatus();}},()=>{if(latest.get(p.id)===record){failed.set(p.id,record);if(active()){saveMessage='Text progress could not save. Your answers remain here. Retry saving.';saveStatus();}}});
  }
  function gatePassed(p,r) {
    if(!p.gate||p.gate==='none')return true;
    if(p.type==='choice')return Boolean(r.checked);
    if(p.type==='recall'||p.type==='timedRecall')return p.gate==='reveal'?Boolean(r.revealed):Boolean(r.text?.trim());
    return p.gate==='reveal'?Boolean(r.revealed):Boolean(r.checked);
  }
  function body(p,r) {
    const html=safe(p.html),prompt=p.prompt?'<p dir="auto">'+esc(p.prompt)+'</p>':'';
    if(p.type==='choice')return html+'<fieldset class="text-reader-choices"><legend>'+esc(p.prompt||'Choose an answer')+'</legend>'+p.options.map((label,i)=>'<label><input type="radio" name="reader-choice" value="'+i+'" '+(r.choice===i?'checked ':'')+(r.checked?'disabled ':'')+'><bdi dir="auto">'+esc(label)+'</bdi></label>').join('')+'</fieldset>'+(r.checked?'<div role="status" class="feedback '+(r.choice===p.answer?'':'wrong')+'"><strong>'+(r.choice===p.answer?'Correct':'Incorrect')+'</strong>'+(p.explanation?'<details><summary>Explanation</summary><p dir="auto">'+esc(p.explanation)+'</p></details>':'')+'</div>':'');
    if(p.type==='recall'||p.type==='timedRecall') {
      const timed=p.type==='timedRecall',running=timer.phase==='running',ready=!timed||timer.phase==='expired'||r.text||r.revealed;
      const demonstration=timed?'<div class="text-reader-demo"><p>'+(untimed?'Untimed study. Hide the value when you are ready.':running?'Study the value. It will be hidden before recall.':timer.phase==='expired'?'The value is hidden. Write what you recall.':'Press Play when you are ready. The value appears for '+(p.durationMs/1000)+' seconds.')+'</p>'+((untimed||timer.visible)?'<div class="text-reader-value" dir="ltr">'+esc(p.value)+'</div>':'')+'<div class="button-row">'+(untimed?action('hide-study','Hide and recall'):action('play',timer.phase==='idle'?'Play':'Replay / reset'))+action('study',untimed?'Return to timed practice':'Study without a timer')+'</div></div>':'';
      return html+demonstration+prompt+(!running&&!untimed&&ready?'<label>Your attempt<textarea data-reader-attempt dir="auto" rows="3" maxlength="12000" style="resize:none" '+(r.revealed?'readonly':'')+'>'+esc(r.text)+'</textarea></label>':'')+(r.revealed?'<section class="text-reader-model" role="status"><strong>'+(timed?'Reference value · self-check':'Illustrative model · self-check')+'</strong>'+safe(timed?(p.answer?.trim()?p.answer:p.value):p.answer)+'<p>'+(timed?'Compare your recall with the reference.':'Compare your attempt with this example. Other answers may also be valid.')+'</p></section>':'');
    }
    if(p.type==='vocabulary')return html+prompt+'<div class="word-grid">'+(p.wordIds||[]).map(id=>word(id)?renderWord(word(id)):'<p>Vocabulary entry unavailable.</p>').join('')+'</div>'+((p.unresolvedTargetIds||[]).length?'<p class="hint">'+p.unresolvedTargetIds.length+' vocabulary target(s) awaiting canonical mapping.</p>':'');
    return html+prompt;
  }
  function render(focus=false) {
    if(!active())return;const p=page();if(!p){host.textContent='No text pages are available.';return;}
    const focusedAction=host.contains(doc.activeElement)?doc.activeElement.dataset.readerAction:null;
    dockBinding?.destroy();
    const r=response(),passed=gatePassed(p,r),recall=['recall','timedRecall'].includes(p.type),canReveal=Boolean(r.text?.trim())&&!untimed&&timer.phase!=='running';
    const commitment=p.type==='choice'&&!r.checked?action('check','Check answer',!Number.isInteger(r.choice),true):recall&&!r.revealed?action('reveal','Show model answer',!canReveal,true):!passed?action('acknowledge','Mark page read',false,true):'';
    const next=action('next','Continue →',index===pages.length-1||!passed,!commitment),back=action('back','← Back',index===0);
    const navigation=dock?exerciseActionDock(commitment||next,back,commitment?next:'').replace('aria-label="Question actions"','aria-label="Text page actions"'):'<nav class="text-reader-pagination" aria-label="Text pages">'+back+(commitment||'')+next+'</nav>';
    host.innerHTML='<header><p class="tag">Page '+(index+1)+' of '+pages.length+'</p><h3 tabindex="-1" data-reader-heading dir="auto">'+esc(p.title||'Read and practise')+'</h3></header><div class="text-reader-body" dir="auto">'+body(p,r)+renderMedia(p.media)+'</div><div class="text-reader-actions">'+navigation+'</div>'+(!passed?'<p class="hint">'+(p.gate==='reveal'?'Reveal or acknowledge this page before continuing.':'Commit an answer or mark this page read before continuing.')+'</p>':'')+'<p data-reader-save role="status">'+esc(saveMessage)+'</p><button type="button" class="button small secondary" data-reader-action="retry-save" '+(!failed.size?'hidden':'')+'>Retry saving text progress</button>';
    if(dock)dockBinding=mountExerciseDock(host);
    if(focus)host.querySelector('[data-reader-heading]')?.focus({preventScroll:true});
    else if(focusedAction){const target=[...host.querySelectorAll('[data-reader-action]')].find(el=>el.dataset.readerAction===focusedAction&&!el.disabled);target?.focus({preventScroll:true});}
  }
  function cancelAttempt(){if(page()?.type==='timedRecall'&&!response().revealed&&response().text){responses[page().id]={};persist();}}
  function clearTimed() {cancelAttempt();untimed=false;timer.stop();}
  function click(event) {
    const el=event.target.closest('[data-reader-action]');if(!el||!host.contains(el)||el.disabled)return;
    const a=el.dataset.readerAction,p=page();if(!p)return;
    event.stopPropagation();
    if(a==='next'||a==='back'){if(a==='next'&&!gatePassed(p,response()))return;clearTimed();index=Math.max(0,Math.min(pages.length-1,index+(a==='next'?1:-1)));render(true);persist();}
    if(a==='check'&&Number.isInteger(response().choice)){responses[p.id]={...response(),checked:true};persist();render();host.querySelector('[role="status"]')?.setAttribute('tabindex','-1');host.querySelector('[role="status"]')?.focus();}
    if(a==='acknowledge'&&!['choice','recall','timedRecall'].includes(p.type)){responses[p.id]={checked:true,revealed:true};persist();render();}
    if(a==='reveal'&&response().text?.trim()&&!untimed&&timer.phase!=='running'){responses[p.id]={...response(),revealed:true};persist();render();host.querySelector('.text-reader-model')?.setAttribute('tabindex','-1');host.querySelector('.text-reader-model')?.focus();}
    if(a==='play'&&!doc.hidden){responses[p.id]={};untimed=false;persist();timer.play(p.durationMs);}
    if(a==='study'){responses[p.id]={};const next=!untimed;timer.stop();untimed=next;persist();render();}
    if(a==='hide-study'){untimed=false;timer.stop('expired');render();}
    if(a==='retry-save'){for(const [id,record] of failed){const version=++saveVersion;queue=queue.catch(()=>{}).then(()=>latest.get(id)===record?saveProgress(record):undefined).then(()=>{if(latest.get(id)===record)failed.delete(id);if(active()&&version===saveVersion){saveMessage=failed.size?'Some text progress is not saved. Retry saving.':'Text progress saved.';saveStatus();}},()=>{if(active()&&latest.get(id)===record){saveMessage='Text progress could not save. Retry saving.';saveStatus();}});}}
  }
  function change(event) {
    if(event.target.matches('[name="reader-choice"]')&&!response().checked){responses[page().id]={choice:Number(event.target.value)};persist();render();const radio=host.querySelector('[name="reader-choice"]:checked');radio?.focus({preventScroll:true});}
  }
  function input(event) {
    if(!event.target.matches('[data-reader-attempt]')||response().revealed)return;
    responses[page().id]={text:event.target.value};persist();
    const reveal=host.querySelector('[data-reader-action="reveal"]');if(reveal)reveal.disabled=!event.target.value.trim();
    const next=host.querySelector('[data-reader-action="next"]');if(next)next.disabled=index===pages.length-1||!gatePassed(page(),response());
  }
  const visibility=()=>{if(doc.hidden)clearTimed();};
  host.addEventListener('click',click);host.addEventListener('change',change);host.addEventListener('input',input);doc.addEventListener('visibilitychange',visibility);
  function destroy(){if(disposed)return;cancelAttempt();disposed=true;untimed=false;timer.stop();dockBinding?.destroy();host.replaceChildren();observer?.disconnect();host.removeEventListener('click',click);host.removeEventListener('change',change);host.removeEventListener('input',input);doc.removeEventListener('visibilitychange',visibility);}
  observer=new view.MutationObserver(()=>{if(!host.isConnected)destroy();});observer.observe(doc,{childList:true,subtree:true});
  render();
  if(loadProgress){saveMessage='Loading text progress…';saveStatus();Promise.resolve().then(loadProgress).then(saved=>{if(!active()||edited)return;Object.assign(responses,saved?.responses||{});index=Math.max(0,pages.findIndex(p=>p.id===saved?.cursorPageId));saveMessage='';render();},()=>{if(active()&&!edited){saveMessage='Saved text progress could not load. You can continue here.';saveStatus();}});}
  return {destroy,getState:snapshot,settled:()=>queue};
}
