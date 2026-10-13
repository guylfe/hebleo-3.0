import {richCell,cellCSS} from './rich.js';
import {audioURL,wordFields,fieldLabel} from './ux.js';
import {composeSentence} from './interactions.js';

// Pure learner lesson/exercise HTML and answer serialization, shared by the learner app
// and the disposable draft-rehearsal renderer. No state, DOM, fetch or storage access here.
export const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const button = (label, action, cls='', value='', disabled=false) => '<button type="button" class="button '+cls+'" data-action="'+action+'" data-value="'+esc(value)+'" '+(disabled?'disabled':'')+'>'+label+'</button>';
export function sourceCell(w,key){return w.fieldFormatting?.[key];}
export function wordText(w,mode='full') {
  const key=mode==='none'?'unpointed':mode==='curated'?'curated':'pointed',cell=sourceCell(w,key),legacy=w.format||{};
  const style=cellCSS(cell,w.sourceTheme)+(legacy.color&&/^#[0-9a-f]{6}$/i.test(legacy.color)?';color:'+legacy.color:'')+(legacy.bold?';font-weight:700':'');
  return '<bdi dir="rtl" class="hebrew" style="'+style+'">'+richCell(w[key],cell,w.sourceTheme)+'</bdi>';
}
export function fieldText(w,key,value){return richCell(value,sourceCell(w,key),w.sourceTheme);}
export function cellAttribute(w,key){return ' style="'+cellCSS(sourceCell(w,key),w.sourceTheme)+'"';}
export function playbackSpeedControl(disabled=false) {
  return '<label class="playback-speed">Playback speed <select data-audio-speed aria-label="Playback speed" '+(disabled?'disabled':'')+'><option value="1">Normal (1×)</option><option value="0.75">Slower (0.75×)</option></select></label>';
}
export function syncReferenceControls(scope,state={}) {
 for(const control of scope.querySelectorAll('[data-reference-control]')){const current=control.dataset.value===state.url?state.status:'idle',active=['playing','buffering'].includes(current),error=current==='error';control.dataset.playbackState=current||'idle';control.setAttribute('aria-pressed',String(active));control.setAttribute('aria-busy',String(current==='buffering'));control.textContent=active?'Ⅱ Pause':error?'↻ Retry':'▶ Play';control.setAttribute('aria-label',(active?'Pause':error?'Retry':'Play')+' recording for '+control.dataset.referenceLabel);const status=control.parentElement.querySelector('[data-reference-status]');if(status)status.textContent=error?(state.error||'Recording could not play. Retry.'):current==='buffering'?'Loading recording…':'';}
}
export function syncAudioControls(scope,speed=1,state={}) {
 for(const media of scope.querySelectorAll('audio,video')){media.playbackRate=speed;media.preservesPitch=true;}
 const marked=[...(scope.matches?.('[data-audio-surface]')?[scope]:[]),...scope.querySelectorAll('[data-audio-surface]')],surfaces=marked.length?marked.filter(el=>!marked.some(parent=>parent!==el&&parent.contains(el))):[scope];
 for(const surface of surfaces){let toolbar=surface.querySelector(':scope > [data-audio-toolbar]');const available=Boolean(surface.querySelector('[data-reference-control],audio[src],video[src]'));if(!available){toolbar?.remove();continue;}if(!toolbar){toolbar=surface.ownerDocument.createElement('div');toolbar.dataset.audioToolbar='';toolbar.className='surface-media-toolbar';toolbar.innerHTML=playbackSpeedControl();surface.prepend(toolbar);}toolbar.querySelector('[data-audio-speed]').value=String(speed);}
 for(const input of scope.querySelectorAll('[data-audio-speed]'))input.value=String(speed);syncReferenceControls(scope,state);
}
export function audioControls(audio,label) {
 const url=audioURL(audio);if(!url)return '';const synthetic=audio?.kind==='synthetic-demo';
 return '<div class="audio-controls" role="group" aria-label="'+esc(label)+' recording">'+button('▶ Play','audio','small secondary',url).replace('<button','<button data-reference-control data-reference-label="'+esc(label)+'" aria-pressed="false" aria-label="Play recording for '+esc(label)+'"')+'<span class="reference-status" data-reference-status role="status"></span>'+(synthetic?'<small class="synthetic-audio-note">Demo sound · not Hebrew pronunciation</small>':'')+'</div>';
}
export function structuredExamples(value) {
 const render=item=>{if(!item||typeof item!=='object'||Array.isArray(item)||typeof item.hebrew!=='string')return '<div class="example-fallback">'+formatValue(item,'')+'</div>';
 const cell=key=>item.fieldFormatting?.[key],theme=item.sourceTheme||[],rich=(key,dir)=>'<bdi dir="'+dir+'" style="'+cellCSS(cell(key),theme)+'">'+richCell(item[key],cell(key),theme)+'</bdi>',remaining=Object.entries(item).filter(([key])=>!['hebrew','english','notes','prefix','fieldFormatting','sourceTheme'].includes(key));
 return '<div class="authored-example"><div class="example-hebrew" dir="rtl">'+rich('hebrew','rtl')+'</div>'+(typeof item.english==='string'?'<div class="example-english" dir="ltr">'+rich('english','ltr')+'</div>':item.english!=null?formatValue(item.english):'')+(item.notes!=null?'<div class="example-notes" dir="auto">'+(typeof item.notes==='string'?rich('notes','auto'):formatValue(item.notes))+'</div>':'')+(item.prefix!=null?'<div class="example-prefix">Prefix: '+(typeof item.prefix==='string'?rich('prefix','rtl'):formatValue(item.prefix))+'</div>':'')+(remaining.length?'<dl class="example-extra">'+remaining.map(([key,v])=>'<dt>'+esc(fieldLabel(key))+'</dt><dd>'+formatValue(v,key)+'</dd>').join('')+'</dl>':'')+'</div>';};
 return '<div class="authored-examples">'+(Array.isArray(value)?value:[value]).map(render).join('')+'</div>';
}
export function formatValue(value,field='') {
  if(value===null || value===undefined)return '';
  if(/^(examples?|prefixed[ _-]?forms?)$/i.test(field))return structuredExamples(value);
  if(typeof value==='object')return Array.isArray(value)?'<ul>'+value.map(v=>'<li>'+formatValue(v,field)+'</li>').join('')+'</ul>':audioURL(value)&&/audio|recording/i.test(field)?audioControls(value,'Related form'):'<dl>'+Object.entries(value).map(([k,v])=>'<dt>'+esc(fieldLabel(k))+'</dt><dd>'+formatValue(v,k)+'</dd>').join('')+'</dl>';
  if(audioURL(value)&&/audio|recording/i.test(field))return audioControls(value,'Related form');
  return '<bdi>'+esc(value)+'</bdi>';
}
export function richFields(w) { const fields=wordFields(w);return fields.length?'<dl class="word-details">'+fields.map(([k,v])=>'<dt>'+esc(fieldLabel(k))+'</dt><dd'+cellAttribute(w,k)+'>'+(/audio|recording/i.test(k)?formatValue(v,k):typeof v==='string'?fieldText(w,k,v):formatValue(v,k))+'</dd>').join('')+'</dl>':'<p>No additional source fields for this demo entry.</p>'; }
// before/after carry the learner-only bookmark and review controls; rehearsal passes none.
export function wordCard(w,{notes=true,before='',after='',privateNote=''}={}) {
  return '<article class="word-card">'+before+'<button class="hebrew-word" data-action="lookup" data-value="'+w.id+'" aria-label="Open full entry for '+esc(w.english)+'">'+wordText(w)+'</button><div class="meaning">'+fieldText(w,'english',w.english)+'</div>'+audioControls(w.audio,w.english)+(notes&&w.notes?'<p class="note"'+cellAttribute(w,'notes')+'>'+fieldText(w,'notes',w.notes)+'</p>':'')+'<details><summary>Full vocabulary entry</summary>'+richFields(w)+privateNote+'</details>'+after+'</article>';
}
export function vocabularyTable(words) {
  const extras=[...new Set(words.flatMap(w=>wordFields(w).map(([k])=>k)))];
  return '<div class="table-scroll" role="region" aria-label="Vocabulary table" tabindex="0"><table class="table vocabulary-table"><thead><tr>'+['Hebrew','English','Audio','Notes',...extras.map(fieldLabel),'Entry'].map(x=>'<th scope="col">'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'+words.map(w=>'<tr><td'+cellAttribute(w,'pointed')+'>'+wordText(w)+'</td><td'+cellAttribute(w,'english')+'>'+fieldText(w,'english',w.english)+'</td><td>'+audioControls(w.audio,w.english)+'</td><td'+cellAttribute(w,'notes')+'>'+fieldText(w,'notes',w.notes)+'</td>'+extras.map(k=>{const value=wordFields(w).find(([key])=>key===k)?.[1];return '<td'+cellAttribute(w,k)+'>'+(/audio|recording/i.test(k)?formatValue(value,k):typeof value==='string'?fieldText(w,k,value):formatValue(value,k))+'</td>';}).join('')+'<td>'+button('Open entry','lookup','small secondary',w.id)+'</td></tr>').join('')+'</tbody></table></div>';
}
export function lessonInteractions(l,renderLesson){return (l.interactions||[]).map((item,i)=>item.type==='reveal'?'<details class="lesson-interaction"><summary>'+esc(item.prompt)+'</summary>'+renderLesson(item.answer)+'</details>':'<section class="lesson-interaction"><h3>'+esc(item.prompt)+'</h3><div class="choices">'+item.choices.map((choice,j)=>button(esc(choice),'inline-choice','secondary',i+'|'+j)).join('')+'</div><p class="inline-feedback" role="status" id="inline-feedback-'+i+'"></p></section>').join('');}
export function learnMedia(l,mode,renderLesson,conceptTime) {
  return mode==='watch'?'<video class="lesson-video" controls preload="metadata" src="'+esc(audioURL(l.video))+'" '+(conceptTime!==undefined?'data-start="'+Number(conceptTime)+'"':'')+' aria-label="'+esc(l.title)+' explanation"></video>':'<div class="explanation rich-lesson" dir="'+(l.textDirection||'auto')+'">'+renderLesson(l.explanation)+lessonInteractions(l,renderLesson)+'</div>';
}
// draft = {text, matching:{wordId: meaning}, selectedTokens:int[]}; word(id) resolves content words.
export function matchingGame(e,mode,word,matching,result) {
  const placed = result?.answer && typeof result.answer==='object' ? result.answer : matching;
  const status = id => !result?.pairResults ? '' : '<small class="pair-status">'+(result.pairResults[id]?'✓ Correct':'✕ Incorrect')+'</small>';
  const verdict = id => !result?.pairResults ? '' : result.pairResults[id] ? ' pair-correct' : ' pair-incorrect';
  const means = e.wordIds.map(id=>word(id).english).sort();
  return '<p class="interaction-hint">Drag a word onto its meaning, or select a word and then its meaning.</p><div class="matching-game"><div class="match-bank">'+e.wordIds.map(id=>'<button class="match-tile'+verdict(id)+'" data-match-word="'+esc(id)+'" aria-pressed="false" '+(result?'disabled':'')+'>'+wordText(word(id),mode)+'<small>'+(placed[id]?'Placed: '+esc(placed[id]):'Drag or select')+'</small>'+status(id)+'</button>').join('')+'</div><div class="match-targets">'+means.map(meaning=>{const id=e.wordIds.find(id=>placed[id]===meaning);return '<button class="match-target '+(id?'filled':'')+verdict(id)+'" data-match-target="'+esc(meaning)+'" '+(result?'disabled':'')+'><strong>'+esc(meaning)+'</strong><span>'+(id?wordText(word(id),mode):'Drop word here')+'</span>'+status(id)+'</button>';}).join('')+'</div></div>';
}
export function sentenceTiles(e,selectedTokens,result) {
  const prefixes=new Set(e.prefixTokenIndices||[]),groups=[];
  for(const [position,index] of selectedTokens.entries()){
    if(groups.length && prefixes.has(selectedTokens[position-1]))groups.at(-1).push({position,index});
    else groups.push([{position,index}]);
  }
  return groups.map(group=>'<span class="sentence-tile-group">'+group.map(({position,index},member)=>'<button class="token target '+(member>0?'joined-previous ':'')+(member<group.length-1?'joined-next':'')+'" data-action="remove-token" data-value="'+position+'" '+(result?'disabled':'')+'>'+esc(e.tokens[index])+'</button>').join('')+'</span>').join('');
}
export function exerciseInput(e,{mode,word,draft,result,keyboard=''}) {
  if(e.type==='recognition')return '<div class="hebrew large">'+wordText(word(e.wordId),mode)+'</div><div class="choices">'+e.choices.map((c,i)=>'<button class="choice '+(draft.text===c?'selected':'')+'" data-action="choice" data-value="'+esc(c)+'" '+(result?'disabled':'')+'><span class="shortcut">'+(i+1)+'</span>'+esc(c)+'</button>').join('')+'</div>';
  if(e.type==='matching')return matchingGame(e,mode,word,draft.matching,result);
  if(e.type==='ordering')return '<label>Your sentence</label><p class="assembled-sentence hebrew" dir="rtl">'+esc(composeSentence(e.tokens,draft.selectedTokens,e.prefixTokenIndices))+'</p><div class="token-row sentence-answer" aria-label="Your sentence">'+sentenceTiles(e,draft.selectedTokens,result)+'</div><label>Choose words</label><div class="token-row" aria-label="Available words">'+e.tokens.map((t,i)=>'<button class="token" data-action="token" data-value="'+i+'" '+(draft.selectedTokens.includes(i)||result?'disabled':'')+'>'+esc(t)+'</button>').join('')+'</div>';
  return (e.context?'<div class="hebrew large">'+esc(e.context)+'</div>':'')+(e.type==='cloze'?'<label for="answer">Type the missing word</label>':'<label for="answer">Your Hebrew answer</label>')+'<textarea id="answer" class="answer-input" dir="rtl" rows="2" autocomplete="off" spellcheck="false" inputmode="text" '+(result?'disabled':'')+'>'+esc(draft.text)+'</textarea>'+(result?'':keyboard);
}
export function exerciseFeedback(e,result) {
 if(!result)return '';const status=result.correct?'Correct':'Incorrect',explanation=[e.feedback,e.feedbackDetails].filter(value=>typeof value==='string'&&value.trim()),alternatives=Array.isArray(result.acceptedAnswers)?[...new Set(result.acceptedAnswers)].filter(value=>typeof value==='string'&&value.trim()):[],meaningful=explanation.length||alternatives.length>1;
 const icon='<span aria-hidden="true">'+(result.correct?'✓':'✕')+'</span><span class="sr-only">'+status+'</span>',body=explanation.map(value=>'<p dir="auto">'+esc(value)+'</p>').join('')+(alternatives.length>1?'<p>Authored alternatives</p><ul>'+alternatives.map(value=>'<li><bdi dir="auto">'+esc(value)+'</bdi></li>').join('')+'</ul>':'');
 return '<div class="feedback compact-result '+(result.correct?'':'wrong')+'" role="status" aria-label="'+status+'">'+(meaningful?'<span class="result-explanation"><button type="button" class="result-icon" data-result-explanation aria-label="'+status+'. Show explanation" aria-expanded="false">'+icon+'</button><span class="result-popover" data-result-popover role="note" hidden>'+body+'</span></span>':'<span class="result-icon" aria-label="'+status+'">'+icon+'</span>')+'</div>';
}
export function bindResultExplanations(scope){
 for(const trigger of scope.querySelectorAll('[data-result-explanation]')){const box=trigger.parentElement,popover=box.querySelector('[data-result-popover]');let dismissed=false,pointerWasOpen=null;trigger.addEventListener('pointerdown',()=>pointerWasOpen=!popover.hidden);const show=()=>{if(dismissed)return;popover.hidden=false;trigger.setAttribute('aria-expanded','true');},hide=()=>{popover.hidden=true;trigger.setAttribute('aria-expanded','false');};box.addEventListener('pointerenter',event=>{if(event.pointerType==='touch')return;dismissed=false;show();});box.addEventListener('pointerleave',()=>{if(!box.contains(box.ownerDocument.activeElement))hide();});trigger.addEventListener('focus',()=>{dismissed=false;show();});trigger.addEventListener('blur',()=>{if(!box.matches(':hover'))hide();});trigger.addEventListener('click',()=>{dismissed=pointerWasOpen??!popover.hidden;pointerWasOpen=null;if(dismissed)hide();else show();});box.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();dismissed=true;hide();}});}
}
// Wire answer exactly as graded by the learner attempt and draft preview evaluate endpoints.
export function wireAnswer(e,draft) {
  let answer=draft.text;
  if(e.type==='ordering')answer=composeSentence(e.tokens,draft.selectedTokens,e.prefixTokenIndices);
  if(e.type==='matching'){answer={...draft.matching};if(e.wordIds.some(id=>!answer[id]))return {error:'Choose a meaning for every word.'};}
  if(typeof answer==='string'&&!answer.trim())return {error:'Choose or enter an answer first.'};
  return {answer};
}
