import {mountVocabularyBrowser,mountWordSelector} from './vocabulary-browser.js';
import {hasGradingContent} from '../answer-policy.js';
import {validateExerciseVocabularyBindings} from '../exercise-bindings.js';
import {mountExerciseBindingsEditor} from './exercise-bindings-editor.js';
import { escapeHTML as e, field, listField, booleanOptions, nikkudOptions, wordOptions, bindLists, markDirty, readFields, replaceObject, draftSaveError } from './editor-fields.js';

export const exerciseTypes = ['recognition', 'typing', 'matching', 'ordering', 'cloze', 'transformation'];
const shared = ['prompt', 'context', 'feedback', 'feedbackDetails', 'concept', 'explanationTime', 'nikkudOverride', 'allowLookup', 'vocabularyBindings'];
const specific = {recognition:['wordId','distractors'], typing:['wordId','answers'], matching:['wordIds'], ordering:['tokens','prefixTokenIndices','answers'], cloze:['context','answers'], transformation:['context','answers']};
const arrays = ['distractors','wordIds','tokens','answers','prefixTokenIndices'];

// Explicit patches retain omitted fields, identity, original forms, rich runs and extensions.
export function applyExerciseEdits(original, edits) {
  if (!exerciseTypes.includes(original.type)) throw new Error('Unsupported exercise type.');
  const next = structuredClone(original), allowed = [...shared, ...specific[original.type]];
  for (const [key, value] of Object.entries(edits)) {
    if (!allowed.includes(key)) throw new Error(`Exercise field is read-only: ${key}`);
    if (arrays.includes(key) || key === 'vocabularyBindings') {
      if (!Array.isArray(value)) throw new Error(`${key} must be a list.`);
      next[key] = structuredClone(value);
    } else if (value === '' && key !== 'prompt' && key !== 'wordId') delete next[key];
    else if (key === 'allowLookup') {
      if (![true, false, 'true', 'false'].includes(value)) throw new Error(`Invalid ${key}.`);
      next[key] = value === true || value === 'true';
    } else if (key === 'explanationTime') {
      const seconds = Number(value);
      if (!Number.isFinite(seconds) || seconds < 0) throw new Error('Explanation time must be nonnegative seconds.');
      next[key] = seconds;
    } else {
      if (typeof value !== 'string') throw new Error(`${key} must be text.`);
      next[key] = value;
    }
  }
  if (next.type === 'ordering' && next.prefixTokenIndices?.some(i => !Number.isInteger(i) || i < 0 || i >= next.tokens.length)) throw new Error('Prefix tiles must reference an existing token.');
  return next;
}

// Blank authoring records contain no generated prompt, answer, context or feedback.
export function blankExercise(type,{id,lessonId}) {
  if (!exerciseTypes.includes(type)) throw new Error('Unsupported exercise type.');
  const response={recognition:{wordId:'',distractors:[]},typing:{answers:[]},matching:{wordIds:[]},ordering:{tokens:[],answers:[],prefixTokenIndices:[]},cloze:{context:'',answers:[]},transformation:{context:'',answers:[]}};
  return {id,lessonId,type,prompt:'',...response[type]};
}
// Guided checks improve author feedback; server validation remains authoritative.
export function validateExerciseDraft(exercise,content) {
  const fail=message=>{throw Object.assign(new Error(message+' · '+exercise.id),{exerciseId:exercise.id});};
  if(typeof exercise.prompt!=='string'||!exercise.prompt.trim())fail('Invalid exercise prompt. Enter an authored prompt');
  const list=(key,label)=>{const values=exercise[key];if(!Array.isArray(values)||!values.length)fail('Exercise needs '+label);values.forEach((v,i)=>{if(typeof v!=='string'||!v.trim())fail(label+' row '+(i+1)+' is blank. Fill or remove it');if(key==='answers'&&!hasGradingContent(v))fail(label+' row '+(i+1)+' needs content beyond marks, ignored punctuation or invisible characters');});};
  const word=id=>content.words.some(w=>w.id===id);
  if(exercise.type==='recognition'){if(!word(exercise.wordId))fail('Choose an existing vocabulary reference');list('distractors','authored distractor meanings');}
  else if(exercise.type==='typing'){if(exercise.answers!==undefined)list('answers','explicit accepted answers');else if(!word(exercise.wordId))fail('Choose a linked word or enter explicit accepted answers');}
  else if(exercise.type==='matching'){list('wordIds','vocabulary pairs');if(new Set(exercise.wordIds).size!==exercise.wordIds.length||exercise.wordIds.some(id=>!word(id)))fail('Matching needs distinct existing vocabulary references');}
  else if(['ordering','cloze','transformation'].includes(exercise.type)){list('answers','explicit accepted answers');if(exercise.type==='ordering'){list('tokens','authored tokens');if(exercise.prefixTokenIndices?.some(i=>!Number.isInteger(i)||i<0||i>=exercise.tokens.length))fail('Prefix tiles must reference existing tokens');}}
  else fail('Unsupported exercise type');
  try {validateExerciseVocabularyBindings(exercise, content.words);} catch (error) {fail(error.message);}
  return exercise;
}

export function renderExerciseEditor(exercise, content) {
  if (!exerciseTypes.includes(exercise.type)) throw new Error('Unsupported exercise type.');
  const type = exercise.type;
  let controls = '';
  if (['recognition','typing'].includes(type)) controls += '<fieldset><legend>Vocabulary reference (explicit stored forms)</legend><input type="hidden" name="wordId" value="'+e(exercise.wordId)+'"><p data-word-reference>'+e(exercise.wordId)+'</p><details><summary>Find or change the specific word</summary><div data-exercise-word-picker></div></details></fieldset>';
  if (type === 'recognition') controls += listField('distractors', 'Authored distractor meanings', exercise.distractors || []);
  if (type === 'matching') controls += '<fieldset><legend>Vocabulary pairs</legend><div data-word-ids-values>'+ (exercise.wordIds||[]).map(id=>'<input type="hidden" name="wordIds" value="'+e(id)+'">').join('')+'</div><details><summary>Select vocabulary pairs</summary><div data-exercise-pairs-picker></div></details></fieldset>';
  if (type === 'ordering') controls += listField('tokens', 'Authored tokens in stored order', exercise.tokens || [], {prefixes: exercise.prefixTokenIndices || []}) + '<p>Prefix positions follow the stored tokens. Ordering also requires four distinct taught distractor words; the server validates the lesson vocabulary.</p>';
  controls += field('context', 'Authored context (optional)', exercise.context, {multiline:true});
  if (['typing','ordering','cloze','transformation'].includes(type)) controls += listField('answers', 'Explicit accepted answers', exercise.answers ?? (type==='typing' ? (()=>{const word=content.words.find(w=>w.id===exercise.wordId);return word?[...new Set([word.pointed,word.unpointed])]:[];})() : [])) + '<p>Enter each approved answer separately. Forms and Nikkud are preserved exactly.</p>';
  if(type==='typing')controls += '<p data-typing-answer-policy>'+(exercise.answers===undefined?'Linked word forms remain the answer source until you edit, add or remove an answer row. The rows above copy only the exact stored pointed and unpointed forms.':'These exercise-local answers keep their exact forms and do not change the global word.')+'</p>';
  return `<form class="studio-editor" data-exercise-editor novalidate><h3>Edit ${e(type)} exercise</h3><p>ID: <b>${e(exercise.id)}</b> · Lesson: ${e(exercise.lessonId)}</p>${field('prompt','Prompt',exercise.prompt,{multiline:true})}${controls}<section role="group" aria-label="Exercise settings" class="studio-exercise-settings"><h4>Exercise settings</h4>${field('nikkudOverride','Display Nikkud',exercise.nikkudOverride,{options:nikkudOptions})}${field('allowLookup','Allow lookup',exercise.allowLookup,{options:booleanOptions})}</section><section role="group" aria-label="Concept metadata" class="studio-concept-metadata"><h4>Concept metadata</h4>${field('concept','Concept reference',exercise.concept)}${field('explanationTime','Explanation timestamp (seconds)',exercise.explanationTime,{type:'number'})}</section><section role="group" aria-label="Authored feedback" class="studio-authored-feedback"><h4>Authored feedback</h4>${field('feedback','Short feedback',exercise.feedback,{multiline:true})}${field('feedbackDetails','Detailed feedback',exercise.feedbackDetails,{multiline:true})}</section><details><summary>Word and phrase links</summary><div data-exercise-bindings-editor></div></details><p data-editor-status role="status"></p><button type="submit">Save exercise draft</button><p>Saving stages a draft. Publication is a separate action.</p></form>`;
}

// saveDraft receives {baseRevisionId, expectedDraftToken, content}; it must invoke
// the author draft API. null is only appropriate when no draft exists.
// Reload supplies a fresh content pack before the next editor is mounted.
export function mountExerciseEditor(container, {content, exerciseId, baseRevisionId, expectedDraftToken = null, saveDraft, saveWorkspace, onSaved = () => {}, onChanged = () => {}}) {
  let frozen = structuredClone(content), original = frozen.exercises.find(x => x.id === exerciseId);
  if (!original) throw new Error('Exercise not found.');
  container.innerHTML = renderExerciseEditor(original, frozen);
  const form = container.querySelector('form'), dirty = new Set(), controller = new container.ownerDocument.defaultView.AbortController();
  const read = () => readFields(form, dirty, arrays);
  // Surface browsing must survive incomplete unrelated fields (e.g. a timestamp).
  const bindings = mountExerciseBindingsEditor(form.querySelector('[data-exercise-bindings-editor]'), {getExercise:()=>({...original,...read()}),words:frozen.words,lessons:frozen.lessons,onChanged});
  const edits = () => ({...read(), ...bindings.getEdits()});
  // Capture the old position before the canonical list handler removes the row.
  form.addEventListener('click', event => {
    const remove = event.target.closest('[data-list-remove]');
    if (!remove) return;
    const group = remove.closest('[data-list]'), row = remove.closest('[data-list-row]');
    bindings.rowsRemoved(group.dataset.list, [...group.querySelectorAll('[data-list-row]')].indexOf(row));
  }, {capture:true, signal:controller.signal});
  const unbind = bindLists(form, {distractors:{}, wordIds:{options:wordOptions(frozen.words)}, tokens:{prefixes:true}, answers:{}}, dirty);
  const change = event => {if(!event.target.name && !event.target.matches('[data-prefix]'))return;markDirty(event, dirty); onChanged(); if (event.target.name === 'tokens') dirty.add('prefixTokenIndices');bindings.refresh();};
  form.addEventListener('input', change, {signal:controller.signal});
  form.addEventListener('change', change, {signal:controller.signal});
  const pickers=[];
  const single=form.querySelector('[data-exercise-word-picker]');
  if(single)pickers.push(mountVocabularyBrowser(single,{words:frozen.words,lessons:frozen.lessons,onSelect:id=>{form.elements.wordId.value=id;form.querySelector('[data-word-reference]').textContent=id;dirty.add('wordId');if(original.type==='typing'&&original.answers===undefined&&!dirty.has('answers')){const w=frozen.words.find(w=>w.id===id);form.querySelector('[data-list=answers]').outerHTML=listField('answers','Explicit accepted answers',[...new Set([w.pointed,w.unpointed])]);}onChanged();bindings.refresh();}}));
  const pairs=form.querySelector('[data-exercise-pairs-picker]');
  if(pairs)pickers.push(mountWordSelector(pairs,{words:frozen.words,lessons:frozen.lessons,selectedIds:original.wordIds,onSelectionChange:ids=>{form.querySelector('[data-word-ids-values]').innerHTML=ids.map(id=>'<input type="hidden" name="wordIds" value="'+e(id)+'">').join('');dirty.add('wordIds');onChanged();}}));
  form.addEventListener('click',event=>{if(event.target.closest('[data-list-add],[data-list-remove]')){onChanged();bindings.refresh();}},{signal:controller.signal});
  let saving = false;
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (saving) return;
    const button = form.querySelector('[type="submit"]'), status = form.querySelector('[data-editor-status]');
    const controls = [...form.querySelectorAll('input,select,textarea,button')], disabled = controls.map(el=>el.disabled);
    saving = true; button.disabled = true;
    try {
      if(saveWorkspace){await saveWorkspace();return;}
      const exercise = applyExerciseEdits(original, edits());
      try {validateExerciseVocabularyBindings(exercise, frozen.words);} catch(error) {throw Object.assign(error,{exerciseId});}
      const next = replaceObject(frozen, 'exercises', exerciseId, exercise);
      controls.forEach(el=>el.disabled=true);
      const result = await saveDraft({baseRevisionId, expectedDraftToken, content: next});
      if (controller.signal.aborted) return;
      expectedDraftToken = result?.draftToken ?? expectedDraftToken;
      status.textContent = 'Draft saved. Reloading author workspace…';
      // Subsequent saves from this mount use the successfully saved object.
      frozen = structuredClone(next);
      original = frozen.exercises.find(x => x.id === exerciseId);
      dirty.clear();
      bindings.saved();
      await onSaved(result, next);
    } catch (error) {if (!controller.signal.aborted) status.textContent = draftSaveError(error);}
    finally {saving = false; controls.forEach((el,i)=>el.disabled=disabled[i]);}
  }, {signal:controller.signal});
  const dispose = () => {controller.abort(); unbind();bindings.dispose();pickers.forEach(p=>p.dispose());};
  // Unified workspace reads dirty patches from every mounted sibling before one CAS save.
  dispose.snapshot = () => applyExerciseEdits(original,edits());
  dispose.getEdits = edits;
  return dispose;
}
