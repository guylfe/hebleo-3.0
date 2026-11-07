import {eligibleForms,selectForms,displayHebrew,Drill,TENSES} from './engine.js';
const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mountConjugation(root,{catalog,learnedIds=[],platform='native',storageKey,allowFixtures=false}={}) {
  const pool=eligibleForms(catalog,{allowFixtures}), doc=root.ownerDocument;
  root.classList.add('conjugation-root');
  let saved={}; try { if(storageKey)saved=JSON.parse(doc.defaultView.localStorage.getItem(storageKey))||{}; } catch {}
  let nikkud=saved.nikkud===true, direction=saved.direction==='en'?'en':'he', drill=null, dead=false;
  const s={kind:'verb',wordIds:catalog.words.filter(w=>pool.some(f=>f.wordId===w.id)).map(w=>w.id),tenses:[...new Set(pool.map(f=>f.tense))],scope:'learned',platform,learnedIds,person:'all',gender:'all',number:'all'};
  const he = f => `<bdi class="cp-he" lang="he" dir="rtl">${esc(displayHebrew(f,nikkud)).replaceAll('–','–\u200b')}</bdi>`;
  const button=(action,label,extra='')=>`<button type="button" data-action="${action}" ${extra}>${label}</button>`;
  function persist(){try{if(storageKey)doc.defaultView.localStorage.setItem(storageKey,JSON.stringify({nikkud,direction}));}catch{}}
  function select(key,label,values){return `<label>${label}<select data-filter="${key}">${values.map(v=>`<option value="${v}" ${s[key]===v?'selected':''}>${v==='all'?'All':esc(v)}</option>`).join('')}</select></label>`;}
  function render(focus=false){
    if(dead)return;
    let html=`<header class="cp-header"><h1 tabindex="-1">Conjugation practice</h1><label class="cp-toggle">Nikkud <input type="checkbox" role="switch" data-action="nikkud" aria-label="Show Nikkud" ${nikkud?'checked':''}></label></header>`;
    if(allowFixtures)html+='<p class="cp-fixture" role="note">Synthetic fixture rehearsal — illustrative forms, not approved teaching content.</p>';
    if(!drill){
      const selected=selectForms(catalog,s,{allowFixtures});
      html+=`<p>Choose what to practice, then work through a short round.</p><div class="cp-row">${button('verb','Verbs',`aria-pressed="${s.kind==='verb'}"`)}${button('prep','Prepositions',`aria-pressed="${s.kind==='prep'}"`)}</div><div class="cp-grid"><fieldset><legend>${s.kind==='verb'?'Verbs':'Prepositions'}</legend><div class="cp-words" data-family="${s.kind}">${catalog.words.filter(w=>w.kind===s.kind).map(w=>`<label class="cp-word"><input type="checkbox" data-word="${esc(w.id)}" ${s.wordIds.includes(w.id)?'checked':''} ${pool.some(f=>f.wordId===w.id)?'':'disabled'}>${he(w)}</label>`).join('')}</div></fieldset><section class="cp-panel">`;
      if(platform!=='wordpress')html+=`<h2>Practice material</h2><label class="cp-toggle">Learned only <input type="checkbox" role="switch" data-action="scope" aria-label="Include all forms" ${s.scope==='all'?'checked':''}> All</label><p>Practicing ahead does not complete a lesson.</p>`;
      if(s.kind==='verb')html+=`<fieldset><legend>Forms</legend><div class="cp-chips">${TENSES.filter(t=>t!=='preposition').map(t=>`<label><input type="checkbox" data-tense="${t}" ${s.tenses.includes(t)?'checked':''} ${pool.some(f=>f.tense===t)?'':'disabled'}>${t[0].toUpperCase()+t.slice(1)}</label>`).join('')}</div></fieldset>`;
      html+=`<details><summary>More filters</summary><div class="cp-row">${select('person','Person',['all','1','2','3','none'])}${select('gender','Gender',['all','masculine','feminine','common','none'])}${select('number','Number',['all','singular','plural','none'])}</div></details><label>Direction<select data-action="direction"><option value="he" ${direction==='he'?'selected':''}>Produce the Hebrew form</option><option value="en" ${direction==='en'?'selected':''}>Recognize the English meaning</option></select></label><div class="cp-row cp-footer"><strong>${selected.length} forms</strong>${button('start','Start practice →',`class="cp-primary" ${selected.length?'':'disabled'}`)}</div>${!selected.length?`<p role="status">${pool.length?'Select available words and matching forms, or include All forms.':'Practice content is awaiting approval. No forms are available for grading.'}</p>`:''}</section></div><p>Missed forms return after the remaining forms in each pass. Your flashcard schedule stays unchanged.</p>`;
    }else if(!drill.current){html+=`<section class="cp-practice"><h2 tabindex="-1">Drill complete</h2><p>You practiced ${drill.total} forms, including any missed-form passes and your own corrections.</p>${button('back','Change selection')}</section>`;
    }else{
      const f=drill.current,w=catalog.words.find(w=>w.id===f.wordId),en=direction==='en',fb=drill.feedback;
      html+=`<section class="cp-practice"><div class="cp-row">${button('back','← Change selection')}<span>${drill.pass>1?'Missed forms · ':''}${drill.index+1} of ${drill.queue.length}</span></div><progress value="${drill.index}" max="${drill.queue.length}" aria-label="Current pass progress"></progress>${drill.pass>1?'<p>You finished the other forms. Now review the ones you missed.</p>':''}<div class="cp-prompt"><h2 tabindex="-1">${en?'What does this form mean?':'Give the Hebrew form'}</h2><div class="cp-base">${he(en?f:w)}</div><p>${f.tense==='preposition'?'':esc(f.tense)+' · '}${esc(f.pronoun)} · ${esc(f.gender)} · ${esc(f.number)}</p></div><div class="cp-row">${button('choose','Choose',`aria-pressed="${drill.mode==='choose'}"`)}${button('write','Write',`aria-pressed="${drill.mode==='write'}"`)}</div>`;
      if(drill.mode==='choose')html+=`<div class="cp-options">${drill.options.map((o,i)=>button('answer',en?esc(o.english):he(o),`data-index="${i}" aria-pressed="${drill.choice===o.id}" ${fb||drill.options.length<2?'disabled':''}`)).join('')}</div>${drill.options.length<2?'<p>Too few distinct choices are available. Switch to Write to practice this form.</p>':''}`;
      else html+=`<form data-answer-form novalidate><label>Your answer<input data-typed type="text" dir="${en?'ltr':'rtl'}" lang="${en?'en':'he'}" autocomplete="off" placeholder="${en?'Type the meaning':'Type your answer in Hebrew'}" value="${esc(drill.typed)}" ${fb?'disabled':''}></label><div class="cp-row">${button('check','Check answer',fb?'disabled':'')}${button('show','Show answer',fb?'disabled':'')}</div><p>Nikkud is optional.</p></form>`;
      if(fb)html+=`<div class="cp-feedback" role="status"><strong>${fb==='correct'?'Correct':fb==='shown'?'Compare with your answer':'Added to missed-form review'}</strong><p>${he(f)} — ${esc(f.english)}</p>${fb==='incorrect'?'<p>Continue through the remaining forms. This one returns at the end of the pass.</p>':''}</div><div class="cp-row">${fb==='shown'?button('knew','I got it right')+button('missed','I missed it'):(fb==='incorrect'&&drill.attempt?.mode==='write'?button('override','Mark as correct'):'')+button('next',drill.index+1<drill.queue.length?'Next form →':drill.missed.size?'Review missed forms →':'Finish drill','class="cp-primary"')}</div>`;
      html+='</section>';
    }
    root.innerHTML=html;
    if(focus)root.querySelector('h2[tabindex],h1')?.focus();
  }
  function act(e){const el=e.target.closest('[data-action]');if(!el||!root.contains(el)||el.disabled)return;const a=el.dataset.action;
    if(['nikkud','scope','direction'].includes(a))return;
    if(a==='start')drill=new Drill(catalog,selectForms(catalog,s,{allowFixtures}),{allowFixtures,direction});
    else if(a==='back')drill=null;
    else if(a==='verb'||a==='prep'){s.kind=a;drill=null;}
    else if(drill){if(a==='choose'||a==='write')drill.setMode(a);else if(a==='answer'){const o=drill.options[Number(el.dataset.index)];if(o){drill.choice=o.id;drill.grade(direction==='he'?o.unpointed:o.english,'choose');}}else if(a==='check')drill.grade(drill.typed,'write');else if(a==='show')drill.show();else if(a==='override')drill.override();else if(a==='knew'||a==='missed')drill.selfCheck(a==='knew');else if(a==='next')drill.next();}
    render(['start','back','next'].includes(a));
  }
  function change(e){const el=e.target;
    if(!el.matches('[data-action=nikkud],[data-action=scope],[data-action=direction],[data-filter],[data-word],[data-tense]'))return;
    if(el.dataset.action==='nikkud')nikkud=el.checked;
    else if(el.dataset.action==='scope'){s.scope=el.checked?'all':'learned';drill=null;}
    else if(el.dataset.action==='direction'){direction=el.value;drill=null;}
    else if(el.dataset.filter){s[el.dataset.filter]=el.value;drill=null;}
    else if(el.dataset.word||el.dataset.tense){const key=el.dataset.word?'wordIds':'tenses',v=el.dataset.word||el.dataset.tense;s[key]=el.checked?[...new Set([...s[key],v])]:s[key].filter(x=>x!==v);drill=null;}
    persist();render();
  }
  function input(e){if(e.target.matches('[data-typed]')&&drill)drill.typed=e.target.value;}
  function submit(e){if(e.target.matches('[data-answer-form]')){e.preventDefault();drill.grade(drill.typed,'write');render();}}
  root.addEventListener('click',act);root.addEventListener('change',change);root.addEventListener('input',input);root.addEventListener('submit',submit);render();
  return {destroy(){dead=true;root.removeEventListener('click',act);root.removeEventListener('change',change);root.removeEventListener('input',input);root.removeEventListener('submit',submit);root.replaceChildren();root.classList.remove('conjugation-root');}};
}
