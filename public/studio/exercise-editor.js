import { escapeHTML as e, field, listField, booleanOptions, nikkudOptions, wordOptions, bindLists, markDirty, readFields, replaceObject } from './editor-fields.js';

export const exerciseTypes = ['recognition', 'typing', 'matching', 'ordering', 'cloze', 'transformation'];
const shared = ['prompt', 'feedback', 'feedbackDetails', 'concept', 'explanationTime', 'nikkudOverride', 'requireNikkud', 'allowLookup'];
const specific = {recognition:['wordId','distractors'], typing:['wordId'], matching:['wordIds'], ordering:['tokens','prefixTokenIndices','answers'], cloze:['context','answers'], transformation:['context','answers']};
const arrays = ['distractors','wordIds','tokens','answers','prefixTokenIndices'];

// Explicit patches retain omitted fields, identity, original forms, rich runs and extensions.
export function applyExerciseEdits(original, edits) {
  if (!exerciseTypes.includes(original.type)) throw new Error('Unsupported exercise type.');
  const next = structuredClone(original), allowed = [...shared, ...specific[original.type]];
  for (const [key, value] of Object.entries(edits)) {
    if (!allowed.includes(key)) throw new Error(`Exercise field is read-only: ${key}`);
    if (arrays.includes(key)) {
      if (!Array.isArray(value)) throw new Error(`${key} must be a list.`);
      next[key] = structuredClone(value);
    } else if (value === '' && key !== 'prompt' && key !== 'wordId') delete next[key];
    else if (['requireNikkud', 'allowLookup'].includes(key)) {
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

export function renderExerciseEditor(exercise, content) {
  if (!exerciseTypes.includes(exercise.type)) throw new Error('Unsupported exercise type.');
  const words = wordOptions(content.words), type = exercise.type;
  let controls = '';
  if (['recognition','typing'].includes(type)) controls += field('wordId', 'Vocabulary reference (explicit stored forms)', exercise.wordId, {options: words});
  if (type === 'recognition') controls += listField('distractors', 'Authored distractor meanings', exercise.distractors || []);
  if (type === 'matching') controls += listField('wordIds', 'Vocabulary pairs', exercise.wordIds || [], {options: words});
  if (type === 'ordering') controls += listField('tokens', 'Authored tokens in stored order', exercise.tokens || [], {prefixes: exercise.prefixTokenIndices || []}) + '<p>Prefix positions follow the stored tokens. Ordering also requires four distinct taught distractor words; the server validates the lesson vocabulary.</p>';
  if (['cloze','transformation'].includes(type)) controls += field('context', 'Authored context', exercise.context, {multiline:true});
  if (['ordering','cloze','transformation'].includes(type)) controls += listField('answers', 'Explicit accepted answers', exercise.answers || []) + '<p>Enter each approved answer separately. Forms and Nikkud are preserved exactly.</p>';
  return `<form class="studio-editor" data-exercise-editor><h3>Edit ${e(type)} exercise</h3><p>ID: <b>${e(exercise.id)}</b> · Lesson: ${e(exercise.lessonId)}</p>${field('prompt','Prompt',exercise.prompt,{multiline:true})}${controls}${field('nikkudOverride','Display Nikkud',exercise.nikkudOverride,{options:nikkudOptions})}${field('requireNikkud','Require Nikkud in the answer',exercise.requireNikkud,{options:booleanOptions})}${field('allowLookup','Allow lookup',exercise.allowLookup,{options:booleanOptions})}${field('concept','Concept',exercise.concept)}${field('feedback','Authored feedback',exercise.feedback,{multiline:true})}${field('feedbackDetails','Detailed feedback',exercise.feedbackDetails,{multiline:true})}${field('explanationTime','Explanation timestamp (seconds)',exercise.explanationTime,{type:'number'})}<p data-editor-status role="status"></p><button type="submit">Save exercise draft</button><p>Saving stages a draft. Publication is a separate action.</p></form>`;
}

// saveDraft receives {baseRevisionId, expectedDraftToken, content}; it must invoke
// the author draft API. null is only appropriate when no draft exists.
// Reload supplies a fresh content pack before the next editor is mounted.
export function mountExerciseEditor(container, {content, exerciseId, baseRevisionId, expectedDraftToken = null, saveDraft, onSaved = () => {}}) {
  let frozen = structuredClone(content), original = frozen.exercises.find(x => x.id === exerciseId);
  if (!original) throw new Error('Exercise not found.');
  container.innerHTML = renderExerciseEditor(original, frozen);
  const form = container.querySelector('form'), dirty = new Set(), controller = new container.ownerDocument.defaultView.AbortController();
  const unbind = bindLists(form, {distractors:{}, wordIds:{options:wordOptions(frozen.words)}, tokens:{prefixes:true}, answers:{}}, dirty);
  const change = event => {markDirty(event, dirty); if (event.target.name === 'tokens') dirty.add('prefixTokenIndices');};
  form.addEventListener('input', change, {signal:controller.signal});
  form.addEventListener('change', change, {signal:controller.signal});
  let saving = false;
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (saving) return;
    const button = form.querySelector('[type="submit"]'), status = form.querySelector('[data-editor-status]');
    const controls = [...form.querySelectorAll('input,select,textarea,button')], disabled = controls.map(el=>el.disabled);
    saving = true; button.disabled = true;
    try {
      const next = replaceObject(frozen, 'exercises', exerciseId, applyExerciseEdits(original, readFields(form, dirty, arrays)));
      controls.forEach(el=>el.disabled=true);
      const result = await saveDraft({baseRevisionId, expectedDraftToken, content: next});
      if (controller.signal.aborted) return;
      expectedDraftToken = result?.draft?.draftToken ?? result?.draftToken ?? expectedDraftToken;
      status.textContent = 'Draft saved. Reloading author workspace…';
      // Subsequent saves from this mount use the successfully saved object.
      frozen = structuredClone(next);
      original = frozen.exercises.find(x => x.id === exerciseId);
      dirty.clear();
      await onSaved(result, next);
    } catch (error) {if (!controller.signal.aborted) status.textContent = error.message;}
    finally {saving = false; controls.forEach((el,i)=>el.disabled=disabled[i]);}
  }, {signal:controller.signal});
  return () => {controller.abort(); unbind();};
}
