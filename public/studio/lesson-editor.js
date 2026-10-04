import {escapeHTML as e, field, wordOptions, markDirty, readFields, replaceObject} from './editor-fields.js';

export function applyLessonEdits(original, edits) {
  const next = structuredClone(original);
  const textFields = ['title','chapter','letters','explanation','textDirection'];
  for (const [key, value] of Object.entries(edits)) {
    if (textFields.includes(key)) {
      if (typeof value !== 'string') throw new Error(`${key} must be text.`);
      if (key === 'textDirection' && value === '') delete next[key]; else next[key] = value;
    } else if (key === 'minutes') {
      if (!Number.isInteger(Number(value)) || Number(value) < 1 || Number(value) > 120) throw new Error('Lesson duration must be 1–120 minutes.');
      next[key] = Number(value);
    } else if (['wordIds','exerciseIds','checkExerciseIds'].includes(key)) {
      if (!Array.isArray(value) || new Set(value).size !== value.length) throw new Error(`Invalid ${key}.`);
      next[key] = [...value];
    } else if (key === 'blockOrder') {
      if (!Array.isArray(value) || value.length !== original.blocks.length || new Set(value).size !== value.length || value.some(i => !Number.isInteger(i) || !original.blocks[i])) throw new Error('Reorder the existing three blocks.');
      next.blocks = value.map(i => structuredClone(original.blocks[i]));
    } else throw new Error(`Lesson field is read-only: ${key}`);
  }
  if (next.checkExerciseIds?.some(id => !next.exerciseIds.includes(id))) throw new Error('Every Check exercise must also be in Core practice.');
  return next;
}

function selections(name, title, items, chosen) {
  return `<fieldset><legend>${e(title)}</legend>${items.map(([id,label]) => `<label class="studio-field"><span><input type="checkbox" name="${name}" value="${e(id)}"${chosen.includes(id)?' checked':''}> ${e(label)}</span></label>`).join('')}</fieldset>`;
}
export function renderLessonEditor(lesson, content) {
  const exercises = content.exercises.filter(x => x.lessonId === lesson.id).map(x => [x.id, `${x.type} · ${x.prompt} (${x.id})`]);
  return `<form class="studio-editor" data-lesson-editor><h3>Compose lesson</h3><p>Stable ID: <b>${e(lesson.id)}</b></p>${field('title','Title',lesson.title)}${field('chapter','Chapter',lesson.chapter)}${field('minutes','Duration in minutes',lesson.minutes,{type:'number'})}${field('letters','Known letters',lesson.letters)}${field('textDirection','Explanation direction',lesson.textDirection,{options:[['','Automatic'],['auto','Automatic (explicit)'],['ltr','Left to right'],['rtl','Right to left']]})}${field('explanation','Authored Markdown explanation',lesson.explanation,{multiline:true})}${selections('wordIds','Vocabulary references',wordOptions(content.words),lesson.wordIds)}${selections('exerciseIds','Core practice',exercises,lesson.exerciseIds)}${selections('checkExerciseIds','Bounded Check (also select in Core)',exercises,lesson.checkExerciseIds||[])}<fieldset><legend>Component order</legend><p>The current manifest supports exactly one explanation, vocabulary and exercise set. Each existing component retains its source, selector and options.</p><ol data-blocks>${lesson.blocks.map((b,i) => `<li data-block-index="${i}">${e(b.type)} <button type="button" data-move="-1">Move earlier</button> <button type="button" data-move="1">Move later</button></li>`).join('')}</ol></fieldset><p>Source-owned vocabulary and explicit forms are referenced without modification. Media, keyboard metadata, interactions and unknown fields are retained.</p><p data-editor-status role="status"></p><button type="submit">Save lesson draft</button><p>Saving stages a draft. Publication is a separate action.</p></form>`;
}

export function mountLessonEditor(container, {content, lessonId, baseRevisionId, expectedDraftToken = null, saveDraft, onSaved = () => {}}) {
  let frozen = structuredClone(content), original = frozen.lessons.find(x => x.id === lessonId);
  if (!original) throw new Error('Lesson not found.');
  container.innerHTML = renderLessonEditor(original, frozen);
  const form = container.querySelector('form'), dirty = new Set(), controller = new container.ownerDocument.defaultView.AbortController();
  const signal = controller.signal;
  for (const type of ['input','change']) form.addEventListener(type,event=>markDirty(event,dirty),{signal});
  form.addEventListener('click', event => {
    const button = event.target.closest('[data-move]'); if (!button) return;
    const row = button.closest('[data-block-index]'), sibling = button.dataset.move === '-1' ? row.previousElementSibling : row.nextElementSibling;
    if (!sibling) return;
    if (button.dataset.move === '-1') sibling.before(row); else sibling.after(row);
    dirty.add('blockOrder');
  }, {signal});
  let saving = false;
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (saving) return; saving = true;
    const controls = [...form.querySelectorAll('input,select,textarea,button')], disabled = controls.map(el=>el.disabled);
    const status = form.querySelector('[data-editor-status]');
    try {
      const edits = readFields(form, new Set([...dirty].filter(k=>k!=='blockOrder')), ['wordIds','exerciseIds','checkExerciseIds']);
      // Keep selected reference order; checkbox layout is not an author reorder request.
      for (const key of ['wordIds','exerciseIds','checkExerciseIds']) if (edits[key]) edits[key] = [...(original[key]||[]).filter(id=>edits[key].includes(id)), ...edits[key].filter(id=>!(original[key]||[]).includes(id))];
      if (dirty.has('blockOrder')) edits.blockOrder = [...form.querySelectorAll('[data-block-index]')].map(el=>Number(el.dataset.blockIndex));
      const next = replaceObject(frozen, 'lessons', lessonId, applyLessonEdits(original, edits));
      controls.forEach(el=>el.disabled=true);
      const result = await saveDraft({baseRevisionId,expectedDraftToken,content:next});
      if (controller.signal.aborted) return;
      expectedDraftToken = result?.draft?.draftToken ?? result?.draftToken ?? expectedDraftToken;
      frozen = structuredClone(next); original = frozen.lessons.find(x=>x.id===lessonId);
      form.querySelectorAll('[data-block-index]').forEach((row,i)=>row.dataset.blockIndex=String(i));
      dirty.clear(); status.textContent = 'Lesson draft saved.';
      await onSaved(result,next);
    } catch(error) {if (!controller.signal.aborted) status.textContent=error.message;}
    finally {saving=false; controls.forEach((el,i)=>el.disabled=disabled[i]);}
  }, {signal});
  return () => controller.abort();
}
