import {wordCard,wordText,syncReferenceControls} from './learner-view.js';
import {renderLexicalVocabulary,bindLexicalVocabulary} from './lexical-vocabulary.js';
import {bindVocabularyReminders} from './vocabulary-reminder.js';

const idsFor=e=>['recognition','typing'].includes(e?.type)?[e.wordId]:e?.type==='matching'?e.wordIds||[]:[];
export function exerciseVocabularyEntry(content,e,id){
 const view=content?.exerciseVocabulary;
 if(view?.version!==1||!idsFor(e).includes(id)||!Object.hasOwn(view.byWordId||{},id))return null;
 const entry=view.byWordId[id];
 return entry?.kind==='legacy'&&entry.word?.id===id||entry?.kind==='lexical'&&entry.row?.runtimeId===id&&entry.row.available===true?entry:null;
}

// Called after the answer controls are locked, for both restored and in-place feedback.
// Only existing ID-backed word occurrences are decorated. No text/translation matching.
export function decorateAnsweredVocabulary(scope,{content,exercise:e,result,mode}){
 if(!result||!e)return;
 const doc=scope.ownerDocument;
 const link=(node,id)=>{
  if(!node||node.closest('[data-vocabulary-word]')||!exerciseVocabularyEntry(content,e,id))return;
  const trigger=doc.createElement('button');trigger.type='button';trigger.dataset.vocabularyWord=id;
  trigger.setAttribute('aria-label','Vocabulary card for '+node.textContent);node.replaceWith(trigger);trigger.append(node);
 };
 if(e.type==='recognition')link(scope.querySelector('[data-exercise-input] > .hebrew .hebrew'),e.wordId);
 if(e.type==='matching')for(const tile of scope.querySelectorAll('[data-match-word],[data-match-target]')){
  // Placed target identity is the learner's explicit ID-keyed assignment, even when wrong.
  const placed=e.wordIds.filter(id=>result.answer?.[id]===tile.dataset.matchTarget);
  const id=tile.dataset.matchWord||(placed.length===1?placed[0]:null);if(!exerciseVocabularyEntry(content,e,id))continue;
  let wrapper=tile;
  if(tile.tagName==='BUTTON'){
   wrapper=doc.createElement('div');
   for(const {name,value} of tile.attributes)if(!['disabled','aria-pressed','type'].includes(name))wrapper.setAttribute(name,value);
   wrapper.dataset.answerLocked='true';wrapper.disabled=true;wrapper.append(...tile.childNodes);tile.replaceWith(wrapper);
  }
  link(wrapper.querySelector('.hebrew'),id);
 }
 if(e.type==='typing'&&exerciseVocabularyEntry(content,e,e.wordId)&&!scope.querySelector('[data-target-vocabulary]')){
  const w=content.words.find(w=>w.id===e.wordId);if(!w)return;
  const target=doc.createElement('p');target.dataset.targetVocabulary='';target.className='target-vocabulary';
  target.innerHTML='Target word: '+wordText(w,mode);scope.querySelector('[data-exercise-input]')?.append(target);link(target.querySelector('.hebrew'),e.wordId);
 }
 if(scope.querySelector('[data-vocabulary-word]')&&!scope.querySelector('[data-vocabulary-hint]')){
  const hint=doc.createElement('p');hint.dataset.vocabularyHint='';hint.className='interaction-hint';hint.textContent='Hover or select an underlined word to see its vocabulary card.';
  scope.querySelector('[data-exercise-input]')?.append(hint);
 }
}

export function mountAnsweredVocabulary(scope,{content,exercise,result,mode,isCurrent,playAudio,stopMedia,getPlaybackState=()=>({})}){
 decorateAnsweredVocabulary(scope,{content,exercise,result,mode});
 if(!result)return null;
 let cardSequence=0,mediaOwner=null;
 return bindVocabularyReminders(scope,{
  isCurrent,
  renderCard(id){
   const entry=exerciseVocabularyEntry(content,exercise,id);if(!entry)return null;
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
