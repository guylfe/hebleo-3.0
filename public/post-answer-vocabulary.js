import {wordCard,wordText,syncReferenceControls} from './learner-view.js';
import {renderLexicalVocabulary,bindLexicalVocabulary} from './lexical-vocabulary.js';
import {bindVocabularyReminders} from './vocabulary-reminder.js';
import {exerciseVocabularyReferenceIds,validateExerciseVocabularyBindings} from './exercise-bindings.js';

// The caller supplies only the current pinned session/rehearsal result. Also require
// matching exercise/lesson identity before using response-only authored answer links.
function answerBindings(content,e,result){
 if(!result||result.exerciseId!==e.id||result.lessonId!==content?.exerciseVocabulary?.lessonId||!Array.isArray(result.vocabularyBindings))return [];
 const answers=[],indices=new Map(),sources=new Map();
 try{
  const bindings=result.vocabularyBindings.map(binding=>{
   if(binding?.field!=='answers'||!Number.isInteger(binding.index)||binding.index<0)throw Error('Invalid answer surface');
   if(sources.has(binding.index)&&sources.get(binding.index)!==binding.sourceText)throw Error('Conflicting answer surface');
   sources.set(binding.index,binding.sourceText);
   if(!indices.has(binding.index)){indices.set(binding.index,answers.length);answers.push(binding.sourceText);}
   if(e.vocabularyBindings?.some(b=>b.id===binding.id))throw Error('Conflicting occurrence ID');
   return {...binding,index:indices.get(binding.index)};
  });
  validateExerciseVocabularyBindings({id:e.id,type:e.type,answers,vocabularyBindings:bindings});
  return result.vocabularyBindings;
 }catch{return [];}
}
export function exerciseVocabularyEntry(content,e,id,result){
 const view=content?.exerciseVocabulary;
 if(view?.version!==1||![...exerciseVocabularyReferenceIds(e),...answerBindings(content,e,result).map(b=>b.wordId)].includes(id)||!Object.hasOwn(view.byWordId||{},id))return null;
 return projectedEntry(content,id);
}
function projectedEntry(content,id){
 const view=content?.exerciseVocabulary;if(view?.version!==1||!Object.hasOwn(view.byWordId||{},id))return null;
 const entry=view.byWordId[id];
 return entry?.kind==='legacy'&&entry.word?.id===id||entry?.kind==='lexical'&&entry.row?.runtimeId===id&&entry.row.available===true?entry:null;
}

// Called after the answer controls are locked, for both restored and in-place feedback.
// Only existing ID-backed word occurrences are decorated. No text/translation matching.
export function decorateAnsweredVocabulary(scope,{content,exercise:e,result,mode}){
 if(!result||!e)return;
 const doc=scope.ownerDocument;
 const answers=answerBindings(content,e,result),ids=new Set([...exerciseVocabularyReferenceIds(e),...answers.map(b=>b.wordId)]);
 const eligible=id=>ids.has(id)&&projectedEntry(content,id);
 const link=(node,id)=>{
  if(!node||node.closest('[data-vocabulary-word]')||!eligible(id))return;
  const trigger=doc.createElement('button');trigger.type='button';trigger.dataset.vocabularyWord=id;
  trigger.setAttribute('aria-label','Vocabulary card for '+node.textContent);node.replaceWith(trigger);trigger.append(node);
 };
 if(e.type==='recognition')link(scope.querySelector('[data-exercise-input] > .hebrew .hebrew'),e.wordId);
 if(e.type==='matching')for(const tile of scope.querySelectorAll('[data-match-word],[data-match-target]')){
  // Placed target identity is the learner's explicit ID-keyed assignment, even when wrong.
  const placed=e.wordIds.filter(id=>result.answer?.[id]===tile.dataset.matchTarget);
  const id=tile.dataset.matchWord||(placed.length===1?placed[0]:null);if(!eligible(id))continue;
  let wrapper=tile;
  if(tile.tagName==='BUTTON'){
   wrapper=doc.createElement('div');
   for(const {name,value} of tile.attributes)if(!['disabled','aria-pressed','type'].includes(name))wrapper.setAttribute(name,value);
   wrapper.dataset.answerLocked='true';wrapper.disabled=true;wrapper.append(...tile.childNodes);tile.replaceWith(wrapper);
  }
  link(wrapper.querySelector('.hebrew'),id);
 }
 if(e.type==='typing'&&eligible(e.wordId)&&!scope.querySelector('[data-target-vocabulary]')){
  const w=content.words.find(w=>w.id===e.wordId);if(!w)return;
  const target=doc.createElement('p');target.dataset.targetVocabulary='';target.className='target-vocabulary';
  target.innerHTML='Target word: '+wordText(w,mode);const verdict=scope.querySelector('[data-answer-commit],.answer-result');if(verdict)verdict.after(target);else scope.querySelector('[data-exercise-input]')?.append(target);link(target.querySelector('.hebrew'),e.wordId);
 }
 let bindings=[];try{bindings=validateExerciseVocabularyBindings(e);}catch{/* malformed public occurrences stay plain */}
 if(answers.some(b=>eligible(b.wordId))&&!scope.querySelector('[data-authored-vocabulary-answers]')){
  const section=doc.createElement('section');section.dataset.authoredVocabularyAnswers='';
  const label=doc.createElement('p');label.className='accepted-answer-label';label.textContent=new Set(answers.map(b=>b.index)).size>1?'Accepted answers':'Accepted answer';section.append(label);
  const seen=new Set();
  for(const b of answers){if(seen.has(b.index))continue;seen.add(b.index);
   const p=doc.createElement('p'),text=doc.createElement('bdi');p.className='hebrew';text.dir='auto';
   text.dataset.vocabularySurface='answers';text.dataset.vocabularyIndex=String(b.index);text.textContent=b.sourceText;p.append(text);section.append(p);
  }
  const result=scope.querySelector('[data-answer-commit],.answer-result');
  if(result)result.after(section);else scope.querySelector('[data-exercise-input]')?.append(section);
 }
 // Every displayed surface is exact authored text. Never inspect result.answer or a
 // learner input to infer identity; ordering markers carry prepared token indices.
 for(const surface of scope.querySelectorAll('[data-vocabulary-surface]')){
  if(surface.dataset.vocabularyDecorated)continue;
  const field=surface.dataset.vocabularySurface,index=surface.hasAttribute('data-vocabulary-index')?Number(surface.dataset.vocabularyIndex):undefined;
  const selected=(field==='answers'?answers:bindings).filter(b=>b.field===field&&b.index===index&&b.sourceText===surface.textContent&&eligible(b.wordId)).sort((a,b)=>a.start-b.start);
  if(!selected.length)continue;
  const tile=surface.closest('button.token');
  if(tile){const wrapper=doc.createElement('span');wrapper.className=tile.className;wrapper.dataset.answerLocked='true';wrapper.append(...tile.childNodes);tile.replaceWith(wrapper);}
  const text=surface.textContent,fragment=doc.createDocumentFragment();let offset=0;
  for(const b of selected){fragment.append(doc.createTextNode(text.slice(offset,b.start)));const trigger=doc.createElement('button');trigger.type='button';trigger.dataset.vocabularyWord=b.wordId;trigger.dataset.vocabularyBinding=b.id;trigger.setAttribute('aria-label','Vocabulary card for '+b.text);trigger.textContent=b.text;fragment.append(trigger);offset=b.end;}
  fragment.append(doc.createTextNode(text.slice(offset)));surface.replaceChildren(fragment);surface.dataset.vocabularyDecorated='true';
 }
}

export function mountAnsweredVocabulary(scope,{content,exercise,result,revisionId,mode,isCurrent,playAudio,stopMedia,getPlaybackState=()=>({})}){
 if(isCurrent?.()===false||revisionId!==undefined&&result?.revisionId!==revisionId||result?.exerciseId!==undefined&&result.exerciseId!==exercise?.id||result?.lessonId!==undefined&&result.lessonId!==content?.exerciseVocabulary?.lessonId)return null;
 decorateAnsweredVocabulary(scope,{content,exercise,result,mode});
 if(!result)return null;
 let cardSequence=0,mediaOwner=null;
 return bindVocabularyReminders(scope,{
  isCurrent,
  renderCard(id){
   const entry=exerciseVocabularyEntry(content,exercise,id,result);if(!entry)return null;
   return entry.kind==='legacy'?wordCard(entry.word,{readOnly:true}):renderLexicalVocabulary([entry.row],{readOnly:true,idPrefix:'reminder-'+(++cardSequence)});
  },
  bindCard(panel){
   const binding=panel.querySelector('.lexical-vocabulary')?bindLexicalVocabulary(panel):null;
   const sync=()=>syncReferenceControls(panel,getPlaybackState());
   const audio=event=>{event.stopPropagation();const button=event.target.closest('[data-action="audio"]');if(!button)return;event.preventDefault();mediaOwner={panel,url:button.dataset.value};Promise.resolve(playAudio?.(button.dataset.value)).catch(()=>{}).finally(()=>{if(panel.isConnected)sync();});};
   const disclosureEscape=event=>{if(event.defaultPrevented||event.key!=='Escape')return;const details=event.target.closest?.('details[open]');if(!details||!panel.contains(details))return;event.preventDefault();event.stopPropagation();details.open=false;details.querySelector(':scope > summary')?.focus({preventScroll:true});};
   panel.addEventListener('keydown',disclosureEscape);panel.addEventListener('click',audio);panel.ownerDocument.defaultView.addEventListener('hebleo-reference-state',sync);sync();
   return ()=>{binding?.destroy();panel.removeEventListener('keydown',disclosureEscape);panel.removeEventListener('click',audio);panel.ownerDocument.defaultView.removeEventListener('hebleo-reference-state',sync);};
  },
  stopCardMedia(panel){if(mediaOwner?.panel===panel){if(getPlaybackState().url===mediaOwner.url)stopMedia?.();mediaOwner=null;}}
 });
}
