import { resolveBlock, importVocabularyCSV } from './content.js';
import { lessonSteps, stepLabels, stepExercises, followingLesson, defaultMedium, audioURL, wordFields, fieldLabel, searchableWord } from './ux.js';
import { playAudio, stopMedia, recordVoice, stopRecording, replayVoice, clearRecording, feedbackSound } from './media.js';

const root = document.querySelector('#app');
const state = { page:'home', user:localStorage.getItem('hebleo-demo-user') || 'learner-demo', data:null, lessonId:'lesson-1', step:'learn', question:0, answer:'', matching:{}, selectedTokens:[], result:null, practiceIds:[], medium:'watch', wordId:'w-ani', search:'', studio:null, reports:[], panel:null, reviewSession:null, revealReview:false, recording:'empty' };
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => crypto.randomUUID();
const button = (label, action, cls='', value='', disabled=false) => '<button type="button" class="button '+cls+'" data-action="'+action+'" data-value="'+esc(value)+'" '+(disabled?'disabled':'')+'>'+label+'</button>';
const pref = () => state.data.learner.preferences;
let saveTimer, saveChain=Promise.resolve(), submitting=false, routeGeneration=0, lastFocus=null;
async function api(path, body, user=state.user) {
  const response=await fetch('/api/'+path,{method:body===undefined?'GET':'POST',headers:{'x-demo-user':user,...(body===undefined?{}:{'content-type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const value=await response.json(); if(!response.ok)throw new Error(value.error || 'Request failed'); return value;
}
function toast(message) { const box=document.querySelector('#toast');box.textContent=message;box.classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>box.classList.remove('visible'),5000); }
async function load() {
  state.data=await api('bootstrap');
  if(state.page==='studio' && state.data.canAuthor) { state.studio=await api('studio');state.reports=await api('reports'); }
}
function content() { return state.page==='lesson' && state.session ? state.session.content : state.data.content; }
function word(id) { return content().words.find(w=>w.id===id); }
function lessonObject() { return content().lessons.find(l=>l.id===state.lessonId); }
function currentExercise() { const l=lessonObject();return l ? content().exercises.find(e=>e.id===stepExercises(l,state.step,state.practiceIds)[state.question]) : null; }
function wordText(w, mode='full') { return '<bdi dir="rtl" class="hebrew '+(w.format?.bold?'word-bold ':'')+(w.format?.color?'word-accent':'')+'">'+esc(mode==='none'?w.unpointed:mode==='curated'?w.curated:w.pointed)+'</bdi>'; }
function nextLesson() { return state.data.content.lessons.find(l=>!state.data.learner.completed.includes(l.id)) || null; }
function continueLesson() { const l=state.data.content.lessons.find(l=>l.id===state.data.learner.lastLessonId && !state.data.learner.completed.includes(l.id));return l || nextLesson(); }
function resetQuestion() { state.question=0;state.answer='';state.matching={};state.selectedTokens=[];state.result=null; }
function progressPayload() { return {lessonId:state.lessonId,revisionId:state.session.revisionId,step:state.step,question:state.question,answer:state.answer,selectedTokens:[...state.selectedTokens],matching:{...state.matching},resultRequestId:state.result?.requestId || null,practiceIds:state.practiceIds}; }
function queueSave() {
  if(state.page!=='lesson' || !state.session)return saveChain;
  const payload=progressPayload(),user=state.user;
  saveChain=saveChain.catch(()=>{}).then(async()=>{ const saved=await api('progress',payload,user);if(state.user===user){state.data.learner.resumes[payload.lessonId]=saved;state.data.learner.lastLessonId=payload.lessonId;} }).catch(error=>{toast('Position was not saved: '+error.message);throw error;});
  return saveChain;
}
function scheduleSave() { clearTimeout(saveTimer);saveTimer=setTimeout(()=>queueSave().catch(()=>{}),400); }
async function flushSave() { clearTimeout(saveTimer);if(state.page==='lesson')await queueSave();else await saveChain.catch(()=>{}); }
function setRoute(replace=false) { const hash=state.page==='lesson'?'#lesson/'+state.lessonId+'/'+state.step:'#'+state.page;history[replace || location.hash===hash?'replaceState':'pushState']({},'',hash); }
async function openLesson(id, step, replace=false) {
  await flushSave();clearRecording();state.recording='empty';stopMedia();
  const session=await api('session?lessonId='+encodeURIComponent(id));
  state.session=session;state.lessonId=id;state.page='lesson';state.practiceIds=[];resetQuestion();
  const p=session.progress;
  if(p){state.step=p.step;state.question=p.question;state.answer=p.answer;state.matching=p.matching;state.selectedTokens=p.selectedTokens;state.practiceIds=p.practiceIds || [];state.result=session.result;}
  else state.step=lessonSteps(lessonObject())[0];
  if(step && lessonSteps(lessonObject()).includes(step) && step!==state.step){state.step=step;resetQuestion();state.practiceIds=[];}
  state.medium=defaultMedium(lessonObject());state.panel=null;setRoute(replace);await queueSave();render();focusHeading();
}
function focusHeading() { window.scrollTo({top:0,behavior:pref().animations?'smooth':'instant'});document.querySelector('h1')?.focus({preventScroll:true}); }
function nav() {
  const items=[['home','⌂','Your path'],['course','▤','Course'],['review','↻','Review'],['library','◇','My Hebrew'],...(state.data.canAuthor?[['studio','▦','Studio']]:[]),['settings','⚙','Settings']];
  return items.map(([page,icon,label])=>'<button data-action="page" data-value="'+page+'" class="'+(state.page===page || page==='course'&&state.page==='lesson'?'active':'')+'"><span class="nav-icon" aria-hidden="true">'+icon+'</span><span>'+label+'</span></button>').join('');
}
function segmented(items, selected, action, label) { return '<div class="segmented" role="group" aria-label="'+esc(label)+'">'+items.map(([value,text])=>'<button data-action="'+action+'" data-value="'+esc(value)+'" aria-pressed="'+(value===selected)+'" class="'+(value===selected?'active':'')+'">'+esc(text)+'</button>').join('')+'</div>'; }
function modeControl() { return '<div><span class="control-label">Exercise Nikkud (vowel marks)</span>'+segmented([['curated','Lesson-authored Nikkud'],['full','With Nikkud'],['none','Without Nikkud']],pref().nikkud,'mode','Exercise Nikkud')+'</div>'; }
function render() {
  if(!state.data)return;
  document.querySelector('#context-panel')?.remove();
  const pages={home,course,lesson,review,library,studio,settings};const u=state.data.users.find(u=>u.id===state.user);
  if(state.page==='studio'&&!state.data.canAuthor)state.page='home';
  root.innerHTML='<div class="shell '+(!pref().animations?'reduce-motion':'')+'"><aside class="sidebar"><a class="brand" href="#home" data-action="page" data-value="home">hebleo<span>.</span></a><div class="brand-sub">Hebrew makes sense here</div><nav class="nav" aria-label="Main navigation">'+nav()+'</nav><div class="side-foot"><strong>Your course. Your next step.</strong><p>Local demonstration</p></div></aside><main class="main"><header class="topbar"><div class="breadcrumb">Your Hebrew / '+esc({home:'Your path',course:'Foundations',lesson:stepLabels[state.step],review:'Review',library:'My Hebrew',studio:'Author workspace',settings:'Settings'}[state.page])+'</div><div class="profile"><span class="demo-pill">DEMO CONTENT</span><select id="demo-user" aria-label="Demo profile">'+state.data.users.map(x=>'<option value="'+x.id+'" '+(x.id===state.user?'selected':'')+'>'+esc(x.name)+' · '+esc(x.role)+'</option>').join('')+'</select></div></header><div class="content">'+pages[state.page]()+'</div></main></div>';
  bind();if(state.panel)showPanel();
}
function lessonCards() {
  return state.data.content.lessons.map((l,i)=>'<article class="card lesson-card"><div class="lesson-number '+(state.data.learner.completed.includes(l.id)?'done':'')+'">'+(state.data.learner.completed.includes(l.id)?'✓':i+1)+'</div><div class="lesson-copy"><h3>'+esc(l.title)+'</h3><p>'+esc(l.chapter)+' · '+l.minutes+' min</p></div>'+button(state.data.learner.completed.includes(l.id)?'Revisit':'Continue →','lesson','small '+(l.id===continueLesson()?.id?'primary':'secondary'),l.id)+'</article>').join('');
}
function home() {
  const {learner,due,content:c}=state.data,l=continueLesson(),position=l&&learner.resumes[l.id];
  return '<div class="intro-row"><div><div class="eyebrow">YOUR PATH</div><h1 tabindex="-1">Welcome back, '+esc(state.data.users.find(u=>u.id===state.user).name)+'.</h1><p>A short lesson. A useful connection.</p></div></div><section class="hero"><div class="hero-copy"><div class="eyebrow">'+(l?'YOUR NEXT STEP':'COURSE COMPLETE')+'</div><h2>'+(l?esc(l.title):'Keep your Hebrew growing.')+'</h2><p>'+(l?esc(l.chapter)+' · '+esc(stepLabels[position?.step || lessonSteps(l)[0]]):'Revisit a lesson or start your scheduled review.')+'</p>'+(l?button('Continue · '+esc(stepLabels[position?.step || lessonSteps(l)[0]])+' →','lesson','light',l.id):button('Open review →','page','light','review'))+'</div></section><div class="grid-2"><article class="card"><h2>Your course</h2><p>'+learner.completed.length+' / '+c.lessons.length+' lessons complete</p><progress max="'+c.lessons.length+'" value="'+learner.completed.length+'" aria-label="Course completion"></progress></article><article class="card"><h2>'+due.length+' cards due</h2><p>Bring familiar words back into focus.</p>'+button('Start review →','page','secondary','review')+'</article></div><div class="section-heading"><h2>Your course</h2></div><div class="lesson-list">'+lessonCards()+'</div>';
}
function course() {
  const groups=Map.groupBy(state.data.content.lessons,l=>l.chapter);
  return '<div class="eyebrow">FOUNDATIONS</div><h1 tabindex="-1">Your course.</h1><p>Choose a lesson or return to your saved place.</p>'+Array.from(groups).map(([chapter,ls])=>'<details class="card course-chapter" open><summary>'+esc(chapter)+'</summary>'+ls.map(l=>'<div class="chapter-lesson"><strong>'+esc(l.title)+'</strong><span class="tag">'+(state.data.learner.completed.includes(l.id)?'Complete':'In progress')+'</span>'+button('Open lesson →','lesson','small secondary',l.id)+'</div>').join('')+'</details>').join('');
}
function audioControls(audio,label) {
  const url=audioURL(audio);
  return '<div class="audio-controls" role="group" aria-label="'+esc(label)+' recording">'+button('▶ Play / Pause','audio','small secondary',url||'',!url)+button('↻ Replay','audio-replay','small outline',url||'',!url)+(url?'':'<small>Recording not linked</small>')+'</div>';
}
function formatValue(value,field='') {
  if(value===null || value===undefined)return '';
  if(typeof value==='object')return Array.isArray(value)?'<ul>'+value.map(v=>'<li>'+formatValue(v,field)+'</li>').join('')+'</ul>':audioURL(value)&&/audio|recording/i.test(field)?audioControls(value,'Related form'):'<dl>'+Object.entries(value).map(([k,v])=>'<dt>'+esc(fieldLabel(k))+'</dt><dd>'+formatValue(v,k)+'</dd>').join('')+'</dl>';
  if(audioURL(value)&&/audio|recording/i.test(field))return audioControls(value,'Related form');
  return '<bdi>'+esc(value)+'</bdi>';
}
function richFields(w) { const fields=wordFields(w);return fields.length?'<dl class="word-details">'+fields.map(([k,v])=>'<dt>'+esc(fieldLabel(k))+'</dt><dd>'+formatValue(v,k)+'</dd>').join('')+'</dl>':'<p>No additional source fields for this demo entry.</p>'; }
function vocabulary(w,notes=true) {
  return '<article class="word-card"><button class="bookmark '+(state.data.learner.bookmarks.includes(w.id)?'saved':'')+'" data-action="bookmark" data-value="'+w.id+'" aria-label="Bookmark '+esc(w.english)+'">'+(state.data.learner.bookmarks.includes(w.id)?'★':'☆')+'</button><button class="hebrew-word" data-action="lookup" data-value="'+w.id+'" aria-label="Open full entry for '+esc(w.english)+'">'+wordText(w)+'</button><div class="meaning">'+esc(w.english)+'</div>'+audioControls(w.audio,w.english)+(notes&&w.notes?'<p class="note">'+esc(w.notes)+'</p>':'')+'<details><summary>Full vocabulary entry</summary>'+richFields(w)+'</details>'+button(state.data.learner.cards[w.id]?'In your review':'+ Add to review','enroll','small secondary',w.id)+'</article>';
}
function vocabularyView(words,notes=true) {
  const controls=segmented([['cards','Cards'],['table','Table']],pref().vocabularyView,'vocab-view','Vocabulary view');
  if(pref().vocabularyView==='cards')return '<div class="mode-bar"><span>Fully pointed Hebrew</span>'+controls+'</div><div class="word-grid">'+words.map(w=>vocabulary(w,notes)).join('')+'</div>';
  const extras=[...new Set(words.flatMap(w=>wordFields(w).map(([k])=>k)))];
  return '<div class="mode-bar"><span>All source fields</span>'+controls+'</div><div class="table-scroll" role="region" aria-label="Vocabulary table" tabindex="0"><table class="table vocabulary-table"><thead><tr>'+['Hebrew','English','Audio','Notes',...extras.map(fieldLabel),'Entry'].map(x=>'<th scope="col">'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'+words.map(w=>'<tr><td>'+wordText(w)+'</td><td>'+esc(w.english)+'</td><td>'+audioControls(w.audio,w.english)+'</td><td>'+esc(w.notes)+'</td>'+extras.map(k=>'<td>'+formatValue(wordFields(w).find(([key])=>key===k)?.[1],k)+'</td>').join('')+'<td>'+button('Open entry','lookup','small secondary',w.id)+'</td></tr>').join('')+'</tbody></table></div>';
}
function linkedText(text, words) {
  const normalize=s=>s.normalize('NFD').replace(/[\u0591-\u05c7.,!?;:״“”"׳‘’]/g,'');
  return String(text||'').split(/(\s+)/).map(t=>{const w=words.find(w=>normalize(t)===normalize(w.unpointed));return w?'<button class="inline-word" data-action="lookup" data-value="'+w.id+'">'+esc(t)+'</button>':esc(t);}).join('');
}
function learnBody(l,conceptTime) {
  const hasText=Boolean(l.explanation?.trim()),video=audioURL(l.video),mode=video&&hasText?state.medium:video?'watch':'read';
  return (video&&hasText?'<div class="mode-bar"><h2>Your explanation</h2>'+segmented([['watch','Watch'],['read','Read']],mode,'medium','Lesson format')+'</div>':'')+(mode==='watch'?'<video class="lesson-video" controls preload="metadata" src="'+esc(video)+'" '+(conceptTime!==undefined?'data-start="'+Number(conceptTime)+'"':'')+' aria-label="'+esc(l.title)+' explanation"></video>':'<div class="explanation">'+linkedText(l.explanation,content().words.filter(w=>l.wordIds.includes(w.id)))+'</div>')+'<div class="button-row">'+button('Ask about this lesson','help','outline small',l.id)+'</div>';
}
function lessonOutline(l) {
  return '<details class="card lesson-toc" '+(window.matchMedia('(max-width:1100px)').matches?'':'open')+'><summary>Course outline</summary><div class="course-outline-content">'+state.session.content.lessons.map(x=>'<details '+(x.id===l.id?'open':'')+'><summary>'+esc(x.title)+(state.data.learner.completed.includes(x.id)?' ✓':'')+'</summary>'+lessonSteps(x).map(step=>'<button data-action="outline" data-value="'+x.id+'|'+step+'" class="outline-step '+(x.id===l.id&&state.step===step?'active':'')+'" '+(x.id===l.id&&state.step===step?'aria-current="step"':'')+'>'+esc(stepLabels[step])+'</button>').join('')+'</details>').join('')+'<small>Answers and your place are saved.</small></div></details>';
}
function lesson() {
  const l=lessonObject(),steps=lessonSteps(l);let body;
  if(state.step==='learn')body=learnBody(l);
  else if(state.step==='vocabulary'){const block=l.blocks.find(b=>b.type==='vocabulary');body='<h2>Your building blocks</h2>'+vocabularyView(resolveBlock(content(),l,block),block.options?.showNotes!==false);}
  else if(state.step==='complete')body=completion(l);
  else body=exercisePanel(l);
  const index=steps.indexOf(state.step),isExercise=['check','apply'].includes(state.step);
  return '<div class="intro-row"><div><div class="eyebrow">'+esc(l.chapter)+'</div><h1 tabindex="-1">'+esc(l.title)+'</h1><p>'+esc(stepLabels[state.step])+' · Step '+(index+1)+' of '+steps.length+'</p></div>'+button('← Course','page','outline small','course')+'</div><div class="lesson-layout"><div><nav class="step-strip" aria-label="Lesson portions">'+steps.map(s=>'<button data-action="step" data-value="'+s+'" class="'+(s===state.step?'active':'')+'" '+(s===state.step?'aria-current="step"':'')+'>'+esc(stepLabels[s])+'</button>').join('')+'</nav><section class="card lesson-section" id="practice">'+body+'</section>'+(!isExercise&&state.step!=='complete'?'<div class="lesson-footer">'+button('← Back','step','outline',steps[index-1]||'',index===0)+button('Continue →','step','primary',steps[index+1])+'</div>':'')+'</div>'+lessonOutline(l)+'</div>';
}
function completion(l) {
  const completed=state.data.learner.completed.includes(l.id),next=followingLesson(state.data.content,l.id),wrong=state.data.learner.attempts.filter(a=>a.lessonId===l.id&&a.revisionId===state.session.revisionId).filter(a=>!a.correct);
  return '<div class="empty '+(completed&&pref().animations?'celebrate':'')+'"><div class="empty-symbol" aria-hidden="true">'+(completed?'✓':'↻')+'</div><h2>'+(completed?'Lesson complete.':'You finished this set.')+'</h2><p>'+(completed?'A new connection made.':'Some core questions still need a correct answer. Try a short practice set.')+'</p><div class="button-row centered">'+(completed?(next?button('Next lesson →','lesson','primary',next.id):button('Course complete →','page','primary','course')):button('Practise these questions','target-practice','primary'))+button('Practice more','target-practice','secondary')+'</div>'+(wrong.length?'<p>Practice can focus on: '+esc([...new Set(wrong.map(a=>content().exercises.find(e=>e.id===a.exerciseId)?.concept || 'questions from this lesson'))].join(', '))+'.</p>':'')+'<p>Your answers are saved. This session is not a mastery assessment.</p></div>';
}
const keyboardRows=[
  [['q','/'],['w','׳'],['e','ק'],['r','ר'],['t','א'],['y','ט'],['u','ו'],['i','ן'],['o','ם'],['p','פ']],
  [['a','ש'],['s','ד'],['d','ג'],['f','כ'],['g','ע'],['h','י'],['j','ח'],['k','ל'],['l','ך'],[';','ף'],["'",','],['"','"']],
  [['z','ז'],['x','ס'],['c','ב'],['v','ה'],['b','נ'],['n','מ'],['m','צ'],[',','ת'],['.','ץ'],['/','.'],['?','?']]
];
function keyboard(letters) {
  return '<div class="keyboard-tools">'+button(pref().keyboardVisible?'Use device keyboard':'Open Hebrew keyboard','keyboard-toggle','small outline')+'</div>'+(pref().keyboardVisible?'<div class="keyboard" aria-label="Hebleo Hebrew keyboard"><div class="keyboard-heading"><strong>Hebleo keyboard</strong>'+button('EN hints '+(pref().keyboardHints?'on':'off'),'keyboard-hints','small outline')+button('A→א '+(pref().keyboardConvert?'on':'off'),'keyboard-convert','small outline')+'</div>'+keyboardRows.map(row=>'<div class="keyboard-row">'+row.map(([en,he])=>'<button class="key '+(letters.includes(he)?'known':'')+'" data-action="key" data-value="'+esc(he)+'" aria-label="Type '+esc(he)+'">'+esc(he)+(pref().keyboardHints?'<small>'+esc(en)+'</small>':'')+'</button>').join('')+'</div>').join('')+'<div class="keyboard-row">'+button('←','cursor','small outline','-1')+button('Space','key','small secondary',' ')+button('→','cursor','small outline','1')+button('⌫','backspace','small outline')+'</div><details><summary>Nikkud (vowel marks)</summary><div class="keyboard-row">'+['ְ','ֱ','ֲ','ֳ','ִ','ֵ','ֶ','ַ','ָ','ֹ','ֻ','ּ','ׁ','ׂ'].map(mark=>button('א'+mark,'key','key',mark)).join('')+'</div></details></div>':'');
}
function exercisePanel(l) {
  const ids=stepExercises(l,state.step,state.practiceIds),e=currentExercise();
  if(!e)return '<h2>That portion is finished.</h2>'+button('Continue →','step','primary',lessonSteps(l)[lessonSteps(l).indexOf(state.step)+1]);
  const mode=e.nikkudOverride||pref().nikkud;let input;
  if(e.type==='recognition')input='<div class="hebrew large">'+wordText(word(e.wordId),mode)+'</div><div class="choices">'+e.choices.map((c,i)=>'<button class="choice '+(state.answer===c?'selected':'')+'" data-action="choice" data-value="'+esc(c)+'" '+(state.result?'disabled':'')+'><span class="shortcut">'+(i+1)+'</span>'+esc(c)+'</button>').join('')+'</div>';
  else if(e.type==='matching')input=e.wordIds.map(id=>'<div class="match-row">'+wordText(word(id),mode)+'<select data-match="'+id+'" aria-label="Meaning for '+esc(word(id).unpointed)+'" '+(state.result?'disabled':'')+'><option value="">Choose meaning…</option>'+e.wordIds.map(id=>word(id).english).sort().map(o=>'<option '+(state.matching[id]===o?'selected':'')+'>'+esc(o)+'</option>').join('')+'</select></div>').join('');
  else if(e.type==='ordering')input='<label>Your sentence</label><div class="token-row sentence-answer" aria-label="Your sentence">'+state.selectedTokens.map((i,p)=>'<button class="token target" data-action="remove-token" data-value="'+p+'" '+(state.result?'disabled':'')+'>'+esc(e.tokens[i])+'</button>').join('')+'</div><label>Choose words</label><div class="token-row" aria-label="Available words">'+e.tokens.map((t,i)=>'<button class="token" data-action="token" data-value="'+i+'" '+(state.selectedTokens.includes(i)||state.result?'disabled':'')+'>'+esc(t)+'</button>').join('')+'</div>';
  else input=(e.context?'<div class="hebrew large">'+esc(e.context)+'</div>':'')+(e.type==='cloze'?'<label for="answer">Type the missing word</label>':'<label for="answer">Your Hebrew answer</label>')+'<input id="answer" class="answer-input" dir="rtl" autocomplete="off" spellcheck="false" inputmode="'+(pref().keyboardVisible?'none':'text')+'" value="'+esc(state.answer)+'" '+(state.result?'disabled':'')+'>'+(state.result?'':keyboard(l.letters));
  const allowed=e.allowLookup || Boolean(state.result);
  const feedback=state.result?'<div class="feedback '+(state.result.correct?'':'wrong')+'" role="status"><strong>'+(state.result.correct?'That’s right.':'Let’s look at this answer.')+'</strong><p>Your answer: <bdi>'+esc(typeof state.result.answer==='object'?Object.values(state.result.answer).join(' · '):state.result.answer)+'</bdi></p><p>Accepted answer: <bdi>'+esc(typeof state.result.expected==='object'?Object.values(state.result.expected).join(' · '):state.result.expected)+'</bdi></p>'+(e.feedback?'<p>'+esc(e.feedback)+'</p>':'')+(e.feedbackDetails?'<details><summary>Explain further</summary><p>'+esc(e.feedbackDetails)+'</p></details>':'')+'</div>':'';
  return '<div class="mode-bar"><span class="tag">Question '+(state.question+1)+' of '+ids.length+'</span>'+(e.nikkudOverride?'<span class="tag">Nikkud: '+esc({full:'With Nikkud',none:'Without Nikkud',curated:'Lesson-authored Nikkud'}[e.nikkudOverride])+'</span>':'')+'</div><progress value="'+state.question+'" max="'+ids.length+'" aria-label="Exercise progress"></progress><p class="exercise-prompt">'+esc(e.prompt)+'</p>'+input+feedback+'<div class="exercise-footer">'+(state.result?button(state.question+1===ids.length?'Continue →':'Next question →','next-question','primary'):button('Check answer','check','primary'))+'<div class="toolbar">'+button('Review this concept','concept','small outline')+(allowed?button('Vocabulary help','exercise-lookup','small outline'):'')+(state.result?button('Report a problem','report-open','small outline'):'')+'</div></div>';
}
function reviewWord() { return state.reviewSession ? state.data.content.words.find(w=>w.id===state.reviewSession.ids[state.reviewSession.index]) : null; }
function voiceControls() { return '<details class="voice-comparison" '+(state.recording!=='empty'?'open':'')+'><summary>Record yourself and compare</summary><p>Your recording stays in this tab and is cleared when you leave this item. Maximum 60 seconds.</p><div class="toolbar">'+button(state.recording==='recording'?'Recording…':'Record yourself','record','small secondary','',state.recording==='recording')+button('Stop recording','record-stop','small outline','',state.recording!=='recording')+button('Replay my voice','voice-replay','small outline','',state.recording!=='ready')+'</div></details>'; }
function review() {
  const undo=state.data.learner.lastReview?button('Undo last rating','review-undo','small outline'):'',session=state.reviewSession,w=reviewWord();
  if(!session)return '<div class="eyebrow">A SHORT RETURN TO FAMILIAR WORDS</div><h1 tabindex="-1">Your review.</h1><section class="card"><h2>'+state.data.due.length+' cards due</h2><label for="review-limit">Cards in this session</label><input id="review-limit" type="number" min="1" max="100" value="'+pref().reviewLimit+'"><label for="review-type">Card presentation</label><select id="review-type">'+[['recognition','Hebrew → meaning'],['translation','English → Hebrew'],['listening','Listening first'],['sentence','Sentence context']].map(([v,l])=>'<option value="'+v+'" '+(pref().reviewType===v?'selected':'')+'>'+l+'</option>').join('')+'</select><div class="button-row">'+button('Start review','review-start','primary','',!state.data.due.length)+undo+'</div><p>Listening and sentence cards appear when their source media or examples are available. These are initial presentation options; final card pedagogy remains to be defined.</p></section>';
  if(!w)return '<h1 tabindex="-1">Review finished.</h1><section class="card empty"><h2>You reviewed '+session.index+' cards.</h2><div class="button-row centered">'+button('Continue learning','lesson','primary',continueLesson()?.id||state.data.content.lessons[0].id)+button('Review overview','review-end','secondary')+undo+'</div></section>';
  const type=session.type,example=w.examples?.[0],sentence=typeof example==='string'?example:example?.hebrew;
  return '<h1 tabindex="-1">Your review.</h1><p>Card '+(session.index+1)+' of '+session.ids.length+'</p><article class="card review-card"><span class="tag">'+esc({recognition:'HEBREW → MEANING',translation:'ENGLISH → HEBREW',listening:'LISTENING FIRST',sentence:'SENTENCE CONTEXT'}[type])+'</span><div class="card-side-label">'+(state.revealReview?'ANSWER':'QUESTION')+'</div>'+(state.revealReview?'<div class="hebrew">'+wordText(w)+'</div><div class="review-meaning">'+esc(w.english)+'</div><p>'+esc(w.notes)+'</p>'+audioControls(w.audio,w.english)+'<details><summary>Full entry</summary>'+richFields(w)+'</details>'+voiceControls()+'<div class="review-ratings">'+[['Again',1],['Hard',2],['Good',3],['Easy',4]].map(([label,rating])=>button(label+' <small>'+rating+'</small>','review-rate',rating===3?'primary':'secondary',rating)).join('')+'</div>':(type==='listening'?audioControls(w.audio,w.english):type==='translation'?'<div class="review-meaning">'+esc(w.english)+'</div>':type==='sentence'?'<div class="hebrew">'+esc(sentence)+'</div>':'<div class="hebrew">'+wordText(w,'none')+'</div>')+button('Show answer','review-reveal','primary'))+'</article><div class="toolbar centered">'+undo+button('Finish session','review-end','small outline')+'</div>';
}
function library() {
  const query=state.search.normalize('NFD').replace(/[\u0591-\u05c7]/g,'').toLowerCase(),words=state.data.content.words.filter(w=>searchableWord(w).includes(query));
  return '<div class="eyebrow">YOUR GROWING HEBREW</div><h1 tabindex="-1">My Hebrew.</h1><p>Search words, notes, roots, patterns, and forms.</p><input id="library-search" class="search-input" type="search" placeholder="Search Hebrew, English, root, pattern, or notes…" aria-label="Search vocabulary" value="'+esc(state.search)+'">'+(words.length?vocabularyView(words):'<div class="card empty">No matching words.</div>');
}
function settings() {
  const l=state.data.learner;const checks=[['immediateAnswers','Submit multiple-choice answers immediately'],['sounds','Play feedback sounds'],['animations','Show brief completion animations'],['keyboardHints','Show English key hints'],['keyboardConvert','Convert physical English keys to Hebrew while the Hebrew keyboard is open']];
  return '<div class="eyebrow">MAKE THE EXPERIENCE YOURS</div><h1 tabindex="-1">Settings.</h1><div class="grid-2"><section class="card"><h2>Immediate & interaction</h2>'+checks.map(([key,label])=>'<label class="check-setting"><input type="checkbox" data-preference="'+key+'" '+(pref()[key]?'checked':'')+'>'+esc(label)+'</label>').join('')+'<p>Immediate submission still waits for you to press Continue after feedback.</p><h2>Nikkud</h2>'+modeControl()+'<p>New vocabulary always shows full Nikkud. Exercises may specify their own display. Flashcard display follows the card’s purpose.</p><label for="audio-speed">Audio playback speed</label><select id="audio-speed"><option value="1" '+(pref().audioSpeed===1?'selected':'')+'>Normal</option><option value="0.75" '+(pref().audioSpeed===.75?'selected':'')+'>Slower (0.75×)</option></select><label for="goal">Daily goal, in minutes</label><input id="goal" type="number" min="1" max="120" value="'+l.goal+'">'+button('Save goal','save-goal','small secondary')+'</section><section class="card"><h2>Demo access</h2><p>Course: '+(l.purchasedCourses.length?'Available':'No access')+' · Membership: '+(l.membership?'Active':'Inactive')+'</p><div class="button-row">'+button(l.membership?'Cancel test membership':'Start test membership','event','secondary small',l.membership?'membership_cancelled':'membership_started')+button(l.purchasedCourses.length?'Simulate course refund':'Simulate course purchase','event','outline small',l.purchasedCourses.length?'course_refunded':'course_purchased')+'</div><p>These fictional accounts and events do not contact WordPress. Choose Author in the profile selector to test Studio.</p><h2>Contextual help</h2><p>Authored explanations: available.<br>AI help: '+(state.data.aiConnected?'Configured (live check pending)':'Not connected')+'.</p>'+(state.data.canAuthor?'<h2>Local backup</h2><div class="toolbar">'+button('Export backup','export-backup','small secondary')+'<input type="file" id="restore-file" accept=".json" aria-label="Choose demo backup">'+button('Restore backup','restore','small outline')+'</div>':'')+'</section></div>';
}
function studio() {
  if (!state.studio) return '<p>Opening Studio…</p>';
  const s = state.studio; const content = s.draft?.content || s.content; const w = content.words.find(w => w.id === state.wordId) || content.words[0]; state.wordId = w.id;
  return `<div class="intro-row"><div><div class="eyebrow">ONE SOURCE · MANY LEARNING EXPERIENCES</div><h1>Content Studio.</h1><p>Edit once. Preview the impact. Publish everywhere.</p></div><span class="tag teal">PUBLISHED VERSION ${s.revisionId}</span></div><div class="studio-layout"><aside class="card"><h3>Vocabulary source</h3><small>DEMO MASTERFILE</small><div class="word-list">${content.words.map(x=>`<button data-action="studio-word" data-value="${esc(x.id)}" class="${x.id===w.id?'selected':''}"><span>${esc(x.english)}</span><bdi dir="rtl" class="hebrew">${esc(x.curated)}</bdi></button>`).join('')}</div></aside><div><section class="card"><div class="studio-header"><h2>Canonical word</h2><span class="tag">${esc(w.id)}</span></div><form id="word-form"><div class="field-grid">${[['pointed','Full vowels'],['unpointed','Standard unpointed'],['curated','Curated display'],['english','English meaning']].map(([key,label])=>`<div class="field"><label for="edit-${key}">${label}</label><input id="edit-${key}" name="${key}" value="${esc(w[key])}" dir="${key==='english'?'ltr':'rtl'}" required></div>`).join('')}</div><div class="field"><label for="edit-notes">Teaching note</label><textarea id="edit-notes" name="notes">${esc(w.notes)}</textarea></div><div class="field"><label for="rich-fields">Additional source fields (JSON)</label><textarea id="rich-fields" class="rich-editor" name="richFields">${esc(JSON.stringify(Object.fromEntries(Object.entries(w).filter(([key])=>!["id","pointed","unpointed","curated","english","notes"].includes(key))),null,2))}</textarea></div><div class="button-row"><button type="submit" class="button primary">Save draft</button>${button('Export content JSON','export-content','outline')}</div></form><p class="footer-note">Stable ID stays fixed. Draft edits do not change the learner’s published content.</p></section><section class="card studio-preview"><div class="studio-header"><h2>Publication preview</h2><span class="tag">${s.preview.changes.length} CHANGES</span></div>${s.preview.changes.length?`<table class="table"><thead><tr><th>Object</th><th>Change</th><th>Dependent lessons</th></tr></thead><tbody>${s.preview.changes.map(c=>`<tr><td>${esc(c.id)}</td><td>${esc(c.action)}</td><td>${esc((c.impact?.lessons||[]).join(', ')||'—')}</td></tr>`).join('')}</tbody></table><p>${s.preview.affectedLessons.length} lessons affected. Enrolled review cards resolve the published word.</p>${button('Publish draft →','publish','primary')}`:'<p>No unpublished changes. Edit a word or import a content file.</p>'}</section><section class="card"><h2>Import a source</h2><p>Import full content JSON or vocabulary CSV. CSV updates words by stable ID and preserves words absent from the file.</p><div class="toolbar"><input type="file" id="import-file" accept=".json,.csv,application/json,text/csv" aria-label="Choose a content JSON or vocabulary CSV file">${button('Validate & stage','import','secondary')}</div><p class="footer-note">CSV columns: id, pointed, unpointed, curated, english; optional notes, color, bold. All extra CSV columns are preserved. Live Google Sheets is not connected.</p></section></div></div><section class="card section-heading"><div><h2>Published history</h2><p>Restoring creates a new published revision. Learner progress stays intact.</p><div class="revision-list">${s.history.map(r=>`<div class="revision-row"><div><strong>Version ${r.id}</strong> · ${esc(r.reason)}<br><small>${esc(new Date(r.createdAt).toLocaleString())}</small></div>${r.id!==s.revisionId?button('Restore','rollback','small outline',r.id):'<span class="tag teal">CURRENT</span>'}</div>`).join('')}</div></div></section><section class="card"><h2>Reusable lesson composition</h2><p>Lesson components reference the vocabulary source. Reordering these blocks changes the lesson presentation without copying words.</p>${content.lessons.map(l=>`<div class="integration-item"><strong>${esc(l.title)}</strong><div class="toolbar">${l.blocks.map((b,i)=>`<span class="tag">${i+1}. ${esc(b.type)}</span>`).join('')}${button('Move vocabulary first','reorder','small outline',l.id)}</div></div>`).join('')}</section>${reportList()}`;
}

function reportList() {
  return '<section class="card"><h2>Learner reports</h2><p>Reports retain the submitted answer and content version. Reviewing a report does not change accepted answers.</p>'+(!state.reports.length?'<p>No reports yet.</p>':state.reports.map(r=>'<article class="report-item"><strong>'+esc(r.reason)+' · '+esc(r.attempt.exerciseId)+'</strong><p>Version '+r.attempt.revisionId+' · '+esc(r.userId)+' · '+esc(r.status)+'</p><p>Submitted: '+esc(typeof r.attempt.answer==='object'?JSON.stringify(r.attempt.answer):r.attempt.answer)+'</p><p>'+esc(r.note)+'</p>'+button(r.status==='reviewed'?'Reopen':'Mark reviewed','report-resolve','small secondary',r.userId+'|'+r.requestId+'|'+(r.status==='reviewed'?'pending':'reviewed'))+'</article>').join(''))+'</section>';
}
function showPanel() {
  lastFocus ||= document.activeElement?.dataset.action;
  const p=state.panel;let body,title;
  if(p.type==='word'){const w=word(p.id);title=w.english;body='<div class="hebrew">'+wordText(w)+'</div><p>'+esc(w.notes)+'</p>'+audioControls(w.audio,w.english)+richFields(w)+voiceControls()+'<div class="toolbar">'+button(state.data.learner.bookmarks.includes(w.id)?'Unbookmark':'Bookmark','bookmark','small secondary',w.id)+button('Add to review','enroll','small secondary',w.id)+button('Ask about this word','help-word','small outline',w.id)+'</div><label for="personal-note">Your note</label><textarea id="personal-note">'+esc(state.data.learner.notes[w.id]||'')+'</textarea>'+button('Save note','save-panel-note','small secondary',w.id);}
  else if(p.type==='lookup'){title='Vocabulary help';body=content().words.filter(w=>lessonObject().wordIds.includes(w.id)).map(w=>button(esc(w.pointed)+' · '+esc(w.english),'lookup','small secondary',w.id)).join('');}
  else if(p.type==='concept'){title='Review this concept';body=learnBody(lessonObject(),currentExercise()?.explanationTime);}
  else if(p.type==='report'){title='Report a problem';body='<form id="report-form"><label for="report-reason">What needs review?</label><select id="report-reason" name="reason"><option value="answer">My answer should be accepted</option><option value="unclear">The question is unclear</option><option value="media">Text or audio error</option></select><label for="report-note">Details (optional)</label><textarea id="report-note" name="note" maxlength="2000"></textarea><p>Your submitted answer, exercise, and content version will be attached.</p><button class="button primary">Send for review</button></form>';}
  else {title='Ask about this';body='<p class="tag">'+esc(p.source==='ai-generated'?'OPTIONAL AI ASSISTANCE':p.source==='demo-authored'?'DEMO-AUTHORED EXPLANATION':'AUTHORED EXPLANATION')+'</p><div class="help-text">'+esc(p.text||'Opening the explanation…')+'</div>'+(state.data.aiConnected&&state.data.learner.membership?'<form id="help-form"><label for="help-question">Your question</label><textarea id="help-question" name="question" maxlength="1500" required>'+esc(p.question||'')+'</textarea><button class="button secondary">Ask AI for clarification</button></form>':'<p>AI clarification is '+(!state.data.learner.membership?'a membership feature':'not connected')+'. You can use the authored explanation above.</p>')+'<div class="toolbar">'+(state.page==='lesson'?button('Practise this difficulty','target-practice','small secondary'):'')+'</div>';}
  const dialog=document.createElement('dialog');dialog.id='context-panel';dialog.setAttribute('aria-labelledby','panel-title');dialog.innerHTML='<div class="panel-header"><h2 id="panel-title">'+esc(title)+'</h2>'+button('Close','panel-close','small outline')+'</div>'+body;document.body.appendChild(dialog);dialog.showModal();dialog.addEventListener('cancel',event=>{event.preventDefault();closePanel();});bind(dialog);
}
function closePanel() { document.querySelector('#context-panel')?.close();document.querySelector('#context-panel')?.remove();state.panel=null;clearRecording();state.recording='empty';const target=lastFocus;lastFocus=null;Array.from(document.querySelectorAll('[data-action]')).find(el=>el.dataset.action===target)?.focus(); }
function replacePanel(panel) { clearRecording();state.recording='empty';document.querySelector('#context-panel')?.remove();state.panel=panel;showPanel(); }
async function authoredHelp(wordId) {
  const l=state.page==='lesson'?lessonObject():state.data.content.lessons.find(l=>l.wordIds.includes(wordId));
  if(!l){toast('This word has no lesson explanation linked yet.');return;}
  const context={revisionId:state.page==='lesson'?state.session.revisionId:state.data.revisionId,lessonId:l.id,wordId,exerciseId:state.page==='lesson'?currentExercise()?.id:undefined,question:''};
  const response=await api('help',context);replacePanel({type:'help',...response,context});
}
async function submitAnswer() {
  if(submitting || state.result)return;
  const e=currentExercise();if(!e)return;let answer=state.answer;
  if(e.type==='ordering')answer=state.selectedTokens.map(i=>e.tokens[i]).join(' ');
  if(e.type==='matching'){answer={...state.matching};if(e.wordIds.some(id=>!answer[id])){toast('Choose a meaning for every word.');return;}}
  if(typeof answer==='string'&&!answer.trim()){toast('Choose or enter an answer first.');return;}
  submitting=true;document.querySelectorAll('[data-action="check"],[data-action="choice"]').forEach(el=>el.disabled=true);
  try {state.result=await api('attempt',{requestId:uid(),revisionId:state.session.revisionId,exerciseId:e.id,answer});feedbackSound(pref().sounds,state.result.correct);await load();await queueSave();render();document.querySelector('[data-action="next-question"]')?.focus();}
  finally{submitting=false;document.querySelectorAll('[data-action="check"],[data-action="choice"]').forEach(el=>el.disabled=Boolean(state.result));}
}
function insertKey(value,backspace=false) {
  const input=document.querySelector('#answer');if(!input || state.result)return;
  let start=input.selectionStart,end=input.selectionEnd;if(backspace&&start===end)start=Math.max(0,start-1);
  input.value=input.value.slice(0,start)+(backspace?'':value)+input.value.slice(end);input.focus();input.setSelectionRange(start+(backspace?0:value.length),start+(backspace?0:value.length));state.answer=input.value;scheduleSave();
}
async function updatePreference(key,value) { await api('preferences',{[key]:value});await load(); }
async function act(action,value) {
  if(action==='page'){await flushSave();closePanel();stopMedia();state.page=value;state.reviewSession=null;state.revealReview=false;state.search='';await load();setRoute();render();focusHeading();return;}
  if(action==='lesson'){await openLesson(value);return;}
  if(action==='outline'){const [id,step]=value.split('|');if(id!==state.lessonId){await openLesson(id,step);return;}action='step';value=step;}
  if(action==='step'){if(value===state.step || !lessonSteps(lessonObject()).includes(value))return;closePanel();resetQuestion();state.practiceIds=[];state.step=value;state.medium=defaultMedium(lessonObject());stopMedia();setRoute();await queueSave();render();focusHeading();return;}
  if(action==='mode'||action==='vocab-view'){await updatePreference(action==='mode'?'nikkud':'vocabularyView',value);render();return;}
  if(action==='medium'){state.medium=value;render();return;}
  if(action==='lookup'){replacePanel({type:'word',id:value});return;}
  if(action==='exercise-lookup'){if(!currentExercise()?.allowLookup&&!state.result)return;replacePanel({type:'lookup'});return;}
  if(action==='concept'){replacePanel({type:'concept'});return;}
  if(action==='help'||action==='help-word'){await authoredHelp(action==='help-word'?value:undefined);return;}
  if(action==='panel-close'){closePanel();return;}
  if(action==='audio'||action==='audio-replay'){const playing=await playAudio(value,pref().audioSpeed,action==='audio-replay');toast(playing==='playing'?'Playing recording.':'Audio paused.');return;}
  if(action==='record'){await recordVoice(status=>{state.recording=status;const dialog=document.querySelector('#context-panel');if(dialog){dialog.remove();showPanel();}else render();});return;}
  if(action==='record-stop'){stopRecording();return;}
  if(action==='voice-replay'){await replayVoice();return;}
  if(action==='bookmark'||action==='enroll'){await api(action==='bookmark'?'preferences':'enroll',action==='bookmark'?{bookmark:value}:{wordId:value});await load();if(action==='enroll')toast('Word added to review.');if(state.panel){document.querySelector('#context-panel')?.remove();showPanel();}else render();return;}
  if(action==='save-panel-note'){await api('preferences',{note:{wordId:value,text:document.querySelector('#personal-note').value}});await load();toast('Note saved.');return;}
  if(action==='choice'){if(state.result||submitting)return;state.answer=value;if(pref().immediateAnswers)await submitAnswer();else{await queueSave();render();}return;}
  if(action==='check'){await submitAnswer();return;}
  if(action==='token'){if(state.result)return;state.selectedTokens.push(Number(value));await queueSave();render();return;}
  if(action==='remove-token'){if(state.result)return;state.selectedTokens.splice(Number(value),1);await queueSave();render();return;}
  if(action==='key'||action==='backspace'){insertKey(value,action==='backspace');return;}
  if(action==='cursor'){const input=document.querySelector('#answer');if(input){const p=Math.max(0,Math.min(input.value.length,input.selectionStart+Number(value)));input.focus();input.setSelectionRange(p,p);}return;}
  if(action.startsWith('keyboard-')){const key=action==='keyboard-hints'?'keyboardHints':action==='keyboard-convert'?'keyboardConvert':'keyboardVisible';await updatePreference(key,!pref()[key]);render();document.querySelector('#answer')?.focus();return;}
  if(action==='next-question'){if(!state.result)return;const ids=stepExercises(lessonObject(),state.step,state.practiceIds);if(state.question+1>=ids.length){state.step=lessonSteps(lessonObject())[lessonSteps(lessonObject()).indexOf(state.step)+1];state.practiceIds=[];resetQuestion();}else{state.question++;state.answer='';state.matching={};state.selectedTokens=[];state.result=null;}setRoute();await queueSave();render();focusHeading();return;}
  if(action==='target-practice'){const result=await api('practice',{revisionId:state.session.revisionId,lessonId:state.lessonId});closePanel();state.step='apply';resetQuestion();state.practiceIds=result.exerciseIds;setRoute();await queueSave();render();focusHeading();return;}
  if(action==='report-open'){if(state.result)replacePanel({type:'report'});return;}
  if(action==='review-start'){
    const limit=Number(document.querySelector('#review-limit').value),type=document.querySelector('#review-type').value;await api('preferences',{reviewLimit:limit,reviewType:type});await load();
    const ids=state.data.due.filter(({word:w})=>type==='listening'?audioURL(w.audio):type==='sentence'?w.examples?.length:true).slice(0,limit).map(({word:w})=>w.id);
    if(!ids.length){toast('No due cards have the source audio or examples needed for this presentation.');return;}state.reviewSession={ids,index:0,type};state.revealReview=false;render();return;
  }
  if(action==='review-reveal'){state.revealReview=true;render();return;}
  if(action==='review-rate'){const w=reviewWord();if(!w||!state.revealReview)return;await api('review',{requestId:uid(),wordId:w.id,rating:Number(value)});clearRecording();state.recording='empty';state.reviewSession.index++;state.revealReview=false;await load();render();return;}
  if(action==='review-undo'){const last=state.data.learner.lastReview;if(!last)return;await api('review/undo',{requestId:last.requestId});if(state.reviewSession){const index=state.reviewSession.ids.indexOf(last.wordId);if(index>=0)state.reviewSession.index=index;}state.revealReview=false;await load();render();toast('Previous review schedule restored.');return;}
  if(action==='review-end'){clearRecording();state.recording='empty';state.reviewSession=null;state.revealReview=false;render();return;}
  if(action==='studio-word'){state.wordId=value;render();return;}
  if(action==='report-resolve'){const [userId,requestId,status]=value.split('|');await api('reports/resolve',{userId,requestId,status});await load();render();return;}
  if(action==='publish'){await api('studio/publish',{baseRevisionId:state.studio.revisionId});await load();toast('Published locally.');render();return;}
  if(action==='rollback'){await api('studio/rollback',{baseRevisionId:state.studio.revisionId,revisionId:Number(value)});await load();toast('Content restored; learner progress retained.');render();return;}
  if(action==='import'){const file=document.querySelector('#import-file').files[0];if(!file)throw new Error('Choose a JSON or CSV file first.');if(file.size>700000)throw new Error('File exceeds the local demo limit.');const raw=await file.text();const c=file.name.toLowerCase().endsWith('.csv')?importVocabularyCSV(raw,state.studio.draft?.content||state.studio.content):JSON.parse(raw);await api('studio/draft',{baseRevisionId:state.studio.revisionId,content:c});await load();toast('Import validated and staged.');render();return;}
  if(action==='reorder'){const c=structuredClone(state.studio.draft?.content||state.studio.content),l=c.lessons.find(l=>l.id===value),i=l.blocks.findIndex(b=>b.type==='vocabulary');l.blocks.unshift(...l.blocks.splice(i,1));await api('studio/draft',{baseRevisionId:state.studio.revisionId,content:c});await load();render();return;}
  if(action==='export-content'||action==='export-backup'){download(action==='export-content'?'hebleo-content.json':'hebleo-demo-backup.json',await api(action==='export-content'?'content':'export'));return;}
  if(action==='restore'){const file=document.querySelector('#restore-file').files[0];if(!file)throw new Error('Choose a demo backup first.');if(file.size>750000)throw new Error('Backup exceeds the import limit.');if(!confirm('Restore fictional demo profiles and published content from this backup?'))return;await api('restore',JSON.parse(await file.text()));await load();toast('Local backup restored.');render();return;}
  if(action==='save-goal'){await api('preferences',{goal:Number(document.querySelector('#goal').value)});await load();toast('Goal saved.');return;}
  if(action==='event'){await api('demo/event',{eventId:uid(),type:value});await load();render();return;}
}
function download(name,value){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function bind(scope=root) {
  scope.querySelectorAll('[data-action]').forEach(el=>el.addEventListener('click',async event=>{event.preventDefault();if(el.disabled)return;el.disabled=true;try{await act(el.dataset.action,el.dataset.value);}catch(error){toast(error.message);}finally{if(el.isConnected)el.disabled=false;}}));
  scope.querySelectorAll('[data-action="key"],[data-action="backspace"],[data-action="cursor"]').forEach(el=>el.addEventListener('pointerdown',event=>event.preventDefault()));
  scope.querySelector('#answer')?.addEventListener('input',event=>{state.answer=event.target.value;scheduleSave();});
  scope.querySelectorAll('[data-match]').forEach(el=>el.addEventListener('change',()=>{state.matching[el.dataset.match]=el.value;scheduleSave();}));
  scope.querySelector('#demo-user')?.addEventListener('change',async event=>{try{await flushSave();closePanel();clearRecording();state.user=event.target.value;localStorage.setItem('hebleo-demo-user',state.user);state.page='home';state.session=null;state.reviewSession=null;resetQuestion();await load();setRoute();render();}catch(error){toast(error.message);}});
  scope.querySelector('#library-search')?.addEventListener('input',event=>{const position=event.target.selectionStart;state.search=event.target.value;render();const el=document.querySelector('#library-search');el.focus();el.setSelectionRange(position,position);});
  scope.querySelectorAll('[data-preference]').forEach(el=>el.addEventListener('change',async()=>{try{await updatePreference(el.dataset.preference,el.checked);render();}catch(error){toast(error.message);}}));
  scope.querySelector('#audio-speed')?.addEventListener('change',async event=>{try{await updatePreference('audioSpeed',Number(event.target.value));}catch(error){toast(error.message);}});
  scope.querySelector('#word-form')?.addEventListener('submit',async event=>{event.preventDefault();try{const patch=Object.fromEntries(new FormData(event.target)),raw=patch.richFields;delete patch.richFields;const extra=JSON.parse(raw||'{}');if(!extra || Array.isArray(extra) || typeof extra!=='object' || Object.keys(extra).some(k=>['id','pointed','unpointed','curated','english','notes','__proto__','prototype','constructor'].includes(k)))throw new Error('Additional fields must be a JSON object without core fields or reserved names.');await api('studio/draft',{baseRevisionId:state.studio.revisionId,word:{...extra,...patch,id:state.wordId}});await load();toast('Draft saved.');render();}catch(error){toast(error.message);}});
  scope.querySelector('#report-form')?.addEventListener('submit',async event=>{event.preventDefault();const el=event.target.querySelector('button');el.disabled=true;try{await api('report',{requestId:uid(),attemptId:state.result.requestId,...Object.fromEntries(new FormData(event.target))});closePanel();toast('Report saved for author review.');}catch(error){toast(error.message);}finally{el.disabled=false;}});
  scope.querySelector('#help-form')?.addEventListener('submit',async event=>{event.preventDefault();const question=new FormData(event.target).get('question'),el=event.target.querySelector('button'),p=state.panel;el.disabled=true;try{const response=await api('help',{...p.context,question,useAI:true});if(state.panel===p)replacePanel({...p,...response,question});}catch(error){toast(error.message);}finally{if(el.isConnected)el.disabled=false;}});
  scope.querySelectorAll('video[data-start]').forEach(el=>el.addEventListener('loadedmetadata',()=>{el.currentTime=Math.min(Number(el.dataset.start),el.duration||Number(el.dataset.start));},{once:true}));
}
document.addEventListener('keydown',event=>{
  if(event.defaultPrevented||event.isComposing||event.ctrlKey||event.altKey||event.metaKey)return;
  const typing=/^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)||event.target.isContentEditable;
  if(typing){
    if(event.target.id==='answer'&&!state.result){
      if(event.key==='Enter'){event.preventDefault();document.querySelector('[data-action="check"]')?.click();return;}
      if(pref().keyboardVisible&&pref().keyboardConvert){const key=keyboardRows.flat().find(([en])=>en===event.key);if(key){event.preventDefault();insertKey(key[1]);}}
    }
    return;
  }
  if(state.panel)return;
  if((event.key==='Enter'||event.key===' ')&&['BUTTON','A','SUMMARY'].includes(event.target.tagName))return;
  if(event.key==='Enter'||event.key===' '){const el=document.querySelector('[data-action="next-question"],[data-action="check"],[data-action="review-reveal"]');if(el){event.preventDefault();el.click();}}
  if(/^[1-9]$/.test(event.key)){const choices=document.querySelectorAll('[data-action="choice"]'),ratings=document.querySelectorAll('[data-action="review-rate"]'),el=choices[Number(event.key)-1]||ratings[Number(event.key)-1];if(el){event.preventDefault();el.click();}}
  if(event.key.toLowerCase()==='r'){const el=document.querySelector('[data-action="audio-replay"]:not(:disabled)');if(el){event.preventDefault();el.click();}}
});
async function routeFromURL() {
  const generation=++routeGeneration,parts=location.hash.slice(1).split('/');
  try{if(parts[0]==='lesson'&&parts[1]){await openLesson(parts[1],parts[2],true);return;}await flushSave();if(generation!==routeGeneration)return;closePanel();state.page=['home','course','review','library','studio','settings'].includes(parts[0])?parts[0]:'home';state.reviewSession=null;await load();render();}catch(error){toast(error.message);}
}
window.addEventListener('popstate',()=>routeFromURL());
window.addEventListener('pagehide',()=>{if(state.page==='lesson'&&state.session){fetch('/api/progress',{method:'POST',headers:{'content-type':'application/json','x-demo-user':state.user},body:JSON.stringify(progressPayload()),keepalive:true}).catch(()=>{});}});
load().then(routeFromURL).catch(error=>{root.innerHTML='<div class="card empty"><h1>Could not open the demo.</h1><p>'+esc(error.message)+'</p></div>';});
