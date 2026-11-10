import {createRunStore} from './run-store.js';
import {serializeRun,hydrateRun} from './run-state.js';
import {helpControl,bindPracticeHelp} from './help.js';
import {eligibleForms,selectForms,displayHebrew,Drill,TENSES} from './engine.js';
const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const retainedRuns=new Map();
export function mountConjugation(root,{catalog,learnedIds=[],platform='native',storageKey,ownerKey,runStore,allowFixtures=false}={}) {
  const pool=eligibleForms(catalog,{allowFixtures}), doc=root.ownerDocument;
  root.classList.add('conjugation-root');
  let saved={}; try { if(storageKey)saved=JSON.parse(doc.defaultView.localStorage.getItem(storageKey))||{}; } catch {}
  let nikkud=saved.nikkud===true, direction=saved.direction==='en'?'en':'he', drill=null, dead=false;
  const s={kind:'verb',wordIds:catalog.words.filter(w=>pool.some(f=>f.wordId===w.id)).map(w=>w.id),tenses:[...new Set(pool.map(f=>f.tense))],scope:'learned',platform,learnedIds,person:'all',gender:'all',number:'all'};
  const store=runStore||(ownerKey?createRunStore(ownerKey,{indexedDB:doc.defaultView.indexedDB}):null);
  let revision=0, pending=null, runId=null, loading=!!store, blocked=false, busy=false, terminalDirty=false, message='', inFlight=0, saveFailed=false, chain=Promise.resolve();
  const status=()=>{const el=root.querySelector('[data-run-status]');if(el)el.textContent=message;};
  function failure(error){saveFailed=true;if(error.code==='CONFLICT')blocked=true;message=error.code==='CONFLICT'?error.message:'Drill could not be saved in this browser. Keep this page open and retry Save & pause drill. '+error.message;status();}
  function save(terminal=false,paused=!drill){
    if(!store)return Promise.resolve(true);
    if(blocked||loading)return Promise.resolve(false);
    const active=drill||pending;
    const snapshot=terminal||active&&!active.current?null:active?serializeRun(catalog,active,{setup:s,nikkud,direction,paused,runId}):null;
    inFlight++;message='Saving drill…';status();
    chain=chain.then(async()=>{
      if(blocked){inFlight--;return false;}
      try{const slot=await store.write(revision,snapshot);revision=slot.revision;saveFailed=false;message=terminal?'Drill ended.':'Saved in this browser.';status();return true;}
      catch(error){failure(error);return false;}
      finally{inFlight--;}
    });
    return chain;
  }
  const he = f => `<bdi class="cp-he" lang="he" dir="rtl">${esc(displayHebrew(f,nikkud)).replaceAll('–','–\u200b')}</bdi>`;
  const button=(action,label,extra='')=>`<button type="button" data-action="${action}" ${extra}>${label}</button>`;
  function persist(){try{if(storageKey)doc.defaultView.localStorage.setItem(storageKey,JSON.stringify({nikkud,direction}));}catch{}}
  function select(key,label,values){return `<label>${label}<select data-filter="${key}">${values.map(v=>`<option value="${v}" ${s[key]===v?'selected':''}>${v==='all'?'All':esc(v)}</option>`).join('')}</select></label>`;}
  function selectableWords(){return new Set(selectForms(catalog,{scope:s.scope,platform,learnedIds},{allowFixtures}).map(f=>f.wordId));}
  function render(focus=false){
    if(dead)return;
    let html=`<header class="cp-header"><h1 tabindex="-1">Conjugation practice</h1>${helpControl('conjugation')}<label class="cp-toggle">Nikkud <input type="checkbox" role="switch" data-action="nikkud" aria-label="Show Nikkud" ${nikkud?'checked':''}></label></header>`;
    if(store)html+=`<p data-run-status role="status" aria-live="polite">${esc(message)}</p>`;
    if(allowFixtures)html+='<p class="cp-fixture" role="note">Synthetic fixture rehearsal — illustrative forms, not approved teaching content.</p>';
    if(loading||blocked){
      html+='<p>Your saved drill is retained. Reload this page to retry or use the latest saved version.</p>';
      root.innerHTML=html;return;
    }
    if(!drill){
      if(pending)html+=`<section class="cp-resume"><p>A drill is saved in this browser. Resume it or end it before starting another.</p><div class="cp-row">${button('resume','Resume drill','class="cp-primary"')}${button('end','End drill','class="cp-end"')}</div></section>`;
      html+=`<fieldset ${pending?'disabled':''} class="cp-setup">`;

      const selected=selectForms(catalog,s,{allowFixtures}), selectable=selectableWords();
      html+=`<p>Choose what to practice, then work through a short round.</p><div class="cp-row">${button('verb','Verbs',`aria-pressed="${s.kind==='verb'}"`)}${button('prep','Prepositions',`aria-pressed="${s.kind==='prep'}"`)}</div><div class="cp-grid"><fieldset><legend>${s.kind==='verb'?'Verbs':'Prepositions'}</legend><div class="cp-row cp-selection">${button('select-all','Select all')}${button('select-none','Select none')}</div><div class="cp-words" data-family="${s.kind}">${catalog.words.filter(w=>w.kind===s.kind).map(w=>`<label class="cp-word"><input type="checkbox" data-word="${esc(w.id)}" ${s.wordIds.includes(w.id)?'checked':''} ${selectable.has(w.id)?'':'disabled'}>${he(w)}</label>`).join('')}</div></fieldset><section class="cp-panel">`;
      if(platform!=='wordpress')html+=`<h2>Practice material</h2><label class="cp-toggle">Learned only <input type="checkbox" role="switch" data-action="scope" aria-label="Include all forms" ${s.scope==='all'?'checked':''}> All</label><p>Practicing ahead does not complete a lesson.</p>`;
      if(s.kind==='verb')html+=`<fieldset><legend>Forms</legend><div class="cp-chips">${TENSES.filter(t=>t!=='preposition').map(t=>`<label><input type="checkbox" data-tense="${t}" ${s.tenses.includes(t)?'checked':''} ${pool.some(f=>f.tense===t)?'':'disabled'}>${t[0].toUpperCase()+t.slice(1)}</label>`).join('')}</div></fieldset>`;
      html+=`<details><summary>More filters</summary><div class="cp-row">${select('person','Person',['all','1','2','3','none'])}${select('gender','Gender',['all','masculine','feminine','common','none'])}${select('number','Number',['all','singular','plural','none'])}</div></details><label>Direction<select data-action="direction"><option value="he" ${direction==='he'?'selected':''}>Produce the Hebrew form</option><option value="en" ${direction==='en'?'selected':''}>Recognize the English meaning</option></select></label><div class="cp-row cp-footer"><strong>${selected.length} forms</strong>${button('start','Start practice →',`class="cp-primary" ${selected.length?'':'disabled'}`)}</div>${!selected.length?`<p role="status">${pool.length?'Select available words and matching forms, or include All forms.':'Practice content is awaiting approval. No forms are available for grading.'}</p>`:''}</section></div><p>Missed forms return after the remaining forms in each pass. Your flashcard schedule stays unchanged.</p>`;
      html+='</fieldset>';
    }else if(!drill.current){html+=`<section class="cp-practice"><h2 tabindex="-1">Drill complete</h2><p>You practiced ${drill.total} forms, including any missed-form passes and your own corrections.</p>${button('back','Change selection')}${button('end','End drill','class="cp-end"')}</section>`;
    }else{
      const f=drill.current,w=catalog.words.find(w=>w.id===f.wordId),en=direction==='en',fb=drill.feedback;
      html+=`<section class="cp-practice"><div class="cp-row">${button('back','← Change selection')}${button('pause','Save & pause drill','class="cp-pause"')}${button('end','End drill','class="cp-end"')}<span>${drill.pass>1?'Missed forms · ':''}${drill.index+1} of ${drill.queue.length}</span></div><progress value="${drill.index}" max="${drill.queue.length}" aria-label="Current pass progress"></progress>${drill.pass>1?'<p>You finished the other forms. Now review the ones you missed.</p>':''}<div class="cp-prompt"><h2 tabindex="-1">${en?'What does this form mean?':'Give the Hebrew form'}</h2><div class="cp-base">${he(en?f:w)}</div><p>${f.tense==='preposition'?'':esc(f.tense)+' · '}${esc(f.pronoun)} · ${esc(f.gender)} · ${esc(f.number)}</p></div><div class="cp-row">${button('choose','Choose',`aria-pressed="${drill.mode==='choose'}" ${drill.options.length<2?'disabled':''}`)}${button('write','Write',`aria-pressed="${drill.mode==='write'}"`)}</div>`;
      if(drill.options.length<2)html+='<p role="note">Too few distinct choices are available for this word. Practice in Write mode or show the answer.</p>';
      if(drill.mode==='choose')html+=`<div class="cp-options">${drill.options.map((o,i)=>button('answer',en?esc(o.english):he(o),`data-index="${i}" aria-pressed="${drill.choice===o.id}" ${fb?'disabled':''}`)).join('')}</div>`;
      else html+=`<form data-answer-form novalidate><label>Your answer<input data-typed type="text" dir="${en?'ltr':'rtl'}" lang="${en?'en':'he'}" autocomplete="off" placeholder="${en?'Type the meaning':'Type your answer in Hebrew'}" value="${esc(drill.typed)}" ${fb?'disabled':''}></label><div class="cp-row">${button('check','Check answer',fb?'disabled':'')}${button('show','Show answer',fb?'disabled':'')}</div><p>Nikkud is optional.</p></form>`;
      if(fb)html+=`<div class="cp-feedback" role="status"><strong>${fb==='correct'?'Correct':fb==='shown'?'Compare with your answer':'Added to missed-form review'}</strong><p>${he(f)} — ${esc(f.english)}</p>${fb==='incorrect'?'<p>Continue through the remaining forms. This one returns at the end of the pass.</p>':''}</div><div class="cp-row">${fb==='shown'?button('knew','I got it right')+button('missed','I missed it'):(fb==='incorrect'&&drill.attempt?.mode==='write'?button('override','Mark as correct'):'')+button('next',drill.index+1<drill.queue.length?'Next form →':drill.missed.size?'Review missed forms →':'Finish drill','class="cp-primary"')}</div>`;
      html+='</section>';
    }
    root.innerHTML=html;
    if(focus)root.querySelector('h2[tabindex],h1')?.focus();
  }
  async function act(e){const el=e.target.closest('[data-action]');if(!el||!root.contains(el)||el.disabled)return;const a=el.dataset.action;
    if(['nikkud','scope','direction'].includes(a)||loading||blocked||busy)return;
    if(a==='back'&&terminalDirty)return;
    if(a==='end'){
      busy=true;root.querySelectorAll('button,input,select').forEach(el=>el.disabled=true);const ok=await save(true);busy=false;terminalDirty=!ok;
      if(ok&&!dead){drill=null;pending=null;runId=null;}if(!dead)render(ok);return;
    }
    if(a==='pause'||(a==='back'&&drill?.current&&store)){
      busy=true;root.querySelectorAll('button,input,select').forEach(el=>el.disabled=true);const ok=await save(false,true);busy=false;
      if(ok&&!dead){pending=drill;drill=null;}if(!dead)render(ok);return;
    }
    if(a==='resume'||(a==='start'&&pending)){drill=pending;pending=null;save();render(true);return;}
    if(pending)return;
    if(a==='start'){runId=doc.defaultView.crypto.randomUUID();drill=new Drill(catalog,selectForms(catalog,s,{allowFixtures}),{allowFixtures,direction,choiceForms:selectForms(catalog,{scope:s.scope,platform,learnedIds},{allowFixtures})});}
    else if(a==='select-all'||a==='select-none'){
      const selectable=selectableWords(), ids=catalog.words.filter(w=>w.kind===s.kind&&selectable.has(w.id)).map(w=>w.id);
      s.wordIds=a==='select-all'?[...new Set([...s.wordIds,...ids])]:s.wordIds.filter(id=>!ids.includes(id));
    }
    else if(a==='back')drill=null;
    else if(a==='verb'||a==='prep'){s.kind=a;drill=null;}
    else if(drill){if(a==='choose'||a==='write')drill.setMode(a);else if(a==='answer'){const o=drill.options[Number(el.dataset.index)];if(o){drill.choice=o.id;drill.grade(direction==='he'?o.unpointed:o.english,'choose');}}else if(a==='check')drill.grade(drill.typed,'write');else if(a==='show')drill.show();else if(a==='override')drill.override();else if(a==='knew'||a==='missed')drill.selfCheck(a==='knew');else if(a==='next')drill.next();}
    if(drill&&!drill.current&&store){
      busy=true;const ok=await save(true);busy=false;terminalDirty=!ok;
      if(!ok){message+=' Use End drill to retry clearing the completed run.';status();}
    }else if(drill)save();
    render(['start','back','next'].includes(a));
    if(a==='select-all'||a==='select-none')root.querySelector(`[data-action=${a}]`)?.focus();
  }
  function change(e){const el=e.target;
    if(!el.matches('[data-action=nikkud],[data-action=scope],[data-action=direction],[data-filter],[data-word],[data-tense]'))return;
    if(loading||blocked||busy||(pending&&el.dataset.action!=='nikkud'))return;
    if(el.dataset.action==='nikkud')nikkud=el.checked;
    else if(el.dataset.action==='scope'){s.scope=el.checked?'all':'learned';drill=null;}
    else if(el.dataset.action==='direction'){direction=el.value;drill=null;}
    else if(el.dataset.filter){s[el.dataset.filter]=el.value;drill=null;}
    else if(el.dataset.word||el.dataset.tense){const key=el.dataset.word?'wordIds':'tenses',v=el.dataset.word||el.dataset.tense;s[key]=el.checked?[...new Set([...s[key],v])]:s[key].filter(x=>x!==v);drill=null;}
    persist();if(drill||pending)save();render();
  }
  function input(e){if(e.target.matches('[data-typed]')&&drill&&!blocked&&!busy){drill.typed=e.target.value;save();}}
  function submit(e){if(e.target.matches('[data-answer-form]')){e.preventDefault();if(blocked||busy||!drill)return;drill.grade(drill.typed,'write');save();render();}}
  const help=bindPracticeHelp(root,{platform});
  root.addEventListener('click',act);root.addEventListener('change',change);root.addEventListener('input',input);root.addEventListener('submit',submit);render();
  const retained=ownerKey?retainedRuns.get(ownerKey):null;
  const ready=store?Promise.resolve(retained?.settled).then(()=>store.read()).then(slot=>{
    if(dead)return;
    revision=slot.revision;
    if(retained&&retained.failed()){
      if(slot.revision!==retained.revision())throw Error('This drill changed in another tab. The unsaved draft is retained in this page session.');
      slot={...slot,run:retained.run};saveFailed=true;
    }
    if(slot.run){
      const restored=hydrateRun(catalog,slot.run,{allowFixtures});
      Object.assign(s,restored.setup,{platform,learnedIds});nikkud=restored.nikkud;direction=restored.direction;runId=restored.runId;
      if(restored.paused)pending=restored.drill;else drill=restored.drill;
    }
    if(ownerKey)retainedRuns.delete(ownerKey);
    loading=false;message=saveFailed?'Unsaved drill recovered from this page session. Retry Save & pause drill.':slot.run?'Saved drill restored from this browser.':'';render();
  }).catch(error=>{if(!dead){loading=false;blocked=true;message=error.message+' Saved data has not been changed.';render();}}):Promise.resolve();
  const leave=event=>{if(store&&(saveFailed||inFlight)){event.preventDefault();event.returnValue='';}};
  doc.defaultView.addEventListener('beforeunload',leave);
  return {ready,flush:()=>chain,destroy(){help.destroy();
    const active=drill||pending;
    if(ownerKey&&active?.current&&!blocked&&(saveFailed||inFlight))retainedRuns.set(ownerKey,{run:serializeRun(catalog,active,{setup:s,nikkud,direction,paused:!drill,runId}),settled:chain,failed:()=>saveFailed,revision:()=>revision});
    doc.defaultView.removeEventListener('beforeunload',leave);dead=true;root.removeEventListener('click',act);root.removeEventListener('change',change);root.removeEventListener('input',input);root.removeEventListener('submit',submit);root.replaceChildren();root.classList.remove('conjugation-root');}};
}
