import {lessonSteps, stepLabels, stepExercises, lessonPortions, portionKind, portionExercises, portionLabel} from '../ux.js';
import {escapeHTML as e} from '../studio/editor-fields.js';

// Inject only author preview APIs and the shared learner renderer. No learner
// identity, persistence, fetch, localStorage or publication API enters this module.
export function mountLessonPreview(container, {lessonId, draftToken, loadSession, evaluate, renderer, preferences = {}, onExit = () => {}}) {
  if (typeof renderer?.mount !== 'function') throw new Error('A shared learner renderer adapter is required.');
  if (!draftToken || typeof loadSession !== 'function' || typeof evaluate !== 'function') throw new Error('Draft preview adapters and token are required.');
  const controller = new container.ownerDocument.defaultView.AbortController();
  let session, lesson, step, question = 0, lookupId = null, busy = false, stale = false, generation = 0, unmount;
  let localPreferences = structuredClone(preferences);
  const answers = new Map();
  container.innerHTML = '<section class="lesson-preview"><h2>Draft rehearsal</h2><p>Changes here are temporary.</p><nav aria-label="Rehearsal steps" data-preview-nav></nav><p data-preview-status role="status">Loading draft…</p><div data-preview-content></div><button type="button" data-preview-exit>Exit rehearsal</button></section>';
  const body = container.querySelector('[data-preview-content]'), nav = container.querySelector('[data-preview-nav]'), status = container.querySelector('[data-preview-status]');
  const active = () => !controller.signal.aborted;
  const exerciseIds = () => ['check','apply'].includes(portionKind(lesson,step)) ? portionExercises(session.content,lesson,step) : [];
  const exercise = () => session.content.exercises.find(x => x.id === exerciseIds()[question]);
  const currentAnswer = () => answers.get(exercise()?.id) || {answer:'',result:null};
  const assertMutable = () => { if (!active() || !session || stale || busy) throw new Error('Rehearsal is unavailable or busy.'); };
  function render() {
    if (!active() || !session) return;
    const focused = container.ownerDocument.activeElement, hadFocus = container.contains(focused), focusedStep = nav.contains(focused) ? focused.dataset.previewStep : null;
    // Retain the actual displayed draft before disposing its renderer. Cloning drops
    // listeners; the disposer still removes scoped keys/matching handlers and media.
    const frozen = stale ? frozenPresentation(body) : null;
    unmount?.(); unmount = undefined;
    nav.innerHTML = session.steps.map(name => `<button type="button" data-preview-step="${e(name)}"${step === name ? ' aria-current="step"' : ''}${busy || stale ? ' disabled' : ''}>${e(portionLabel(lesson,name))}</button>`).join('');
    if (stale) {body.replaceChildren(...frozen.childNodes); keepFocus(hadFocus, focusedStep); return;}
    const state = currentAnswer();
    unmount = renderer.mount(body, {
      mode:'draft-preview', persistent:false, content:structuredClone(session.content),
      lessonId, step:portionKind(lesson,step), componentId:lesson.compositionVersion===2?(step==='complete'?null:step):undefined, question, exerciseId:exercise()?.id ?? null,
      answer:structuredClone(state.answer), result:structuredClone(state.result),
      preferences:structuredClone(localPreferences), lookupId, busy,
      actions: {go, next, setAnswer, submit, retry, lookup, setPreference, exit}
    });
    if (unmount !== undefined && typeof unmount !== 'function') throw new Error('Shared renderer mount must return a disposer or undefined.');
    keepFocus(hadFocus, focusedStep);
  }
  function frozenPresentation(source) {
    const copy = source.cloneNode(true);
    const originals = source.querySelectorAll('input,textarea,select');
    copy.querySelectorAll('input,textarea,select').forEach((el, index) => {
      const original = originals[index];
      el.value = original.value;
      if (el.tagName === 'INPUT') el.checked = original.checked;
      if (el.tagName === 'SELECT') [...el.options].forEach((option, i) => {option.selected = original.options[i].selected;});
    });
    copy.querySelectorAll('button,input,textarea,select').forEach(el => {el.disabled = true;});
    copy.querySelectorAll('input,textarea').forEach(el => {el.readOnly = true;});
    copy.querySelectorAll('[aria-busy]').forEach(el => el.removeAttribute('aria-busy'));
    copy.querySelectorAll('[draggable]').forEach(el => {el.draggable = false;});
    copy.querySelectorAll('[contenteditable]').forEach(el => {el.contentEditable = 'false';});
    copy.querySelectorAll('a[href],summary').forEach(el => {el.removeAttribute('href');el.inert = true;el.tabIndex = -1;el.setAttribute('aria-disabled','true');});
    copy.querySelectorAll('audio,video').forEach(el => {el.removeAttribute('autoplay');el.removeAttribute('controls');el.removeAttribute('src');el.querySelectorAll('source').forEach(source => source.remove());});
    copy.querySelector('[data-preview-root]')?.setAttribute('data-preview-frozen','');
    return copy;
  }
  // Re-rendering replaces the focused step button; keep keyboard focus inside the rehearsal (same step, else Exit).
  function keepFocus(hadFocus, focusedStep) {
    if (!hadFocus || container.contains(container.ownerDocument.activeElement)) return;
    const stepButton = focusedStep && [...nav.querySelectorAll('[data-preview-step]')].find(b => b.dataset.previewStep === focusedStep && !b.disabled);
    (stepButton || container.querySelector('[data-preview-exit]'))?.focus({preventScroll:true});
  }
  function go(nextStep, nextQuestion = 0) {
    assertMutable();
    if (!session.steps.includes(nextStep)) throw new Error('Invalid rehearsal step.');
    const ids = ['check','apply'].includes(portionKind(lesson,nextStep)) ? portionExercises(session.content,lesson,nextStep) : [];
    if (!Number.isInteger(nextQuestion) || nextQuestion < 0 || nextQuestion >= Math.max(1, ids.length)) throw new Error('Invalid rehearsal question.');
    step = nextStep; question = nextQuestion; lookupId = null; render();
  }
  function next() {
    assertMutable();
    if (question + 1 < exerciseIds().length) go(step, question + 1);
    else if (session.steps.indexOf(step) + 1 < session.steps.length) go(session.steps[session.steps.indexOf(step) + 1]);
  }
  function setAnswer(answer) {
    assertMutable(); const item = exercise();
    if (!item || currentAnswer().result) return;
    answers.set(item.id, {answer:structuredClone(answer), result:null});
  }
  async function submit(wireAnswer) {
    assertMutable(); const item = exercise();
    if (!item || currentAnswer().result) return;
    const current = ++generation, answer = structuredClone(currentAnswer().answer);
    busy = true; status.textContent = 'Checking draft answer…'; render();
    try {
      const response = await evaluate({lessonId, exerciseId:item.id, draftToken, answer:structuredClone(wireAnswer)});
      if (!active() || current !== generation) return;
      if (response?.mode !== 'draft-preview' || response.persistent !== false || response.draftToken !== draftToken || !response.result) throw new Error('Invalid draft evaluation response.');
      answers.set(item.id, {answer, result:structuredClone(response.result)});
      status.textContent = 'Draft answer checked. Your learner progress is unchanged.';
    } catch (error) {
      if (!active() || current !== generation) return;
      const code = error.status ?? error.statusCode;
      stale = code === 409 || (code === 404 && error.code === 'PREVIEW_TARGET_NOT_FOUND');
      status.textContent = (code === 409 ? 'This draft changed. Exit and reopen rehearsal.' : error.message)
        + (stale ? ' The displayed answer is read-only and has not been checked against the changed draft.' : '');
    } finally {if (active() && current === generation) {busy = false; render();}}
  }
  function retry() {assertMutable(); const item = exercise(); if (item) {answers.delete(item.id); lookupId = null; render();}}
  function lookup(wordId) {
    assertMutable(); const item = exercise();
    if (wordId !== null && (!session.content.words.some(w => w.id === wordId) || (item && !item.allowLookup && !currentAnswer().result))) throw new Error('Lookup is unavailable for this exercise.');
    lookupId = wordId; render();
  }
  function setPreference(key, value) {
    assertMutable();
    if (!['nikkud','vocabularyView','immediateAnswers','sounds','animations','keyboardHints','keyboardConvert','keyboardVisible','keyboardPinned','audioSpeed'].includes(key)) throw new Error('Unsupported rehearsal setting.');
    localPreferences[key] = structuredClone(value); render();
  }
  function dispose() {
    if (!active()) return;
    controller.abort(); generation++; unmount?.(); unmount = undefined;
    answers.clear(); localPreferences = {}; session = undefined; lesson = undefined;
    container.replaceChildren();
  }
  function exit() {if (!active()) return; dispose(); onExit();}
  container.addEventListener('click', event => {
    if (event.target.closest('[data-preview-exit]')) exit();
    const button = event.target.closest('[data-preview-step]');
    if (button && !button.disabled) go(button.dataset.previewStep);
  }, {signal:controller.signal});
  const ready = (async () => {
    try {
      const response = await loadSession({lessonId, draftToken});
      if (!active()) return;
      if (response?.mode !== 'draft-preview' || response.persistent !== false || response.draftToken !== draftToken || response.lessonId !== lessonId) throw new Error('Invalid draft preview session.');
      session = structuredClone(response); lesson = session.content.lessons.find(x => x.id === lessonId);
      const allowed = lesson && lessonPortions(session.content,lesson).map(p=>p.key);
      if (!allowed || !Array.isArray(session.steps) || !session.steps.length || new Set(session.steps).size !== session.steps.length || session.steps.some(name => !allowed.includes(name))) throw new Error('Invalid draft preview steps.');
      step = session.steps[0]; status.textContent = 'Draft rehearsal. Nothing here is saved to your learner profile.'; render();
    } catch (error) {
      if (!active()) return;
      stale = true; session = undefined; unmount?.(); unmount = undefined; body.replaceChildren(); nav.replaceChildren();
      status.textContent = error.status === 409 || error.statusCode === 409 ? 'This draft changed. Exit and reopen rehearsal.' : error.message;
    }
  })();
  return {ready, go, next, setAnswer, submit, retry, lookup, setPreference, exit, dispose};
}
