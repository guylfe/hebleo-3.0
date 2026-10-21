import {exerciseVocabularySurfaces, validateExerciseVocabularyBindings} from '../exercise-bindings.js';
import {escapeHTML as e} from './editor-fields.js';
import {mountVocabularyBrowser, wordLabel} from './vocabulary-browser.js';

const key = surface => surface.field + ':' + (surface.index ?? '');
const labels = {prompt:'Prompt', context:'Context', feedback:'Short feedback', feedbackDetails:'Detailed feedback', tokens:'Token', answers:'Accepted answer'};
const label = surface => labels[surface.field] + (surface.index === undefined ? '' : ' row ' + (surface.index + 1));
const fail = (exercise, message) => Object.assign(new Error(message), {exerciseId:exercise.id});

// Textarea selection uses LF newlines. Translate only those offsets back into the
// untouched source snapshot, including CRLF/CR; never normalize stored content.
function sourceOffset(source, offset) {
  let shown = 0, raw = 0;
  while (shown < offset && raw < source.length) {
    if (source[raw] === '\r' && source[raw + 1] === '\n') raw++;
    raw++; shown++;
  }
  return raw;
}
const displayOffset = (source, offset) => source.slice(0, offset).replace(/\r\n?/g, '\n').length;

export function mountExerciseBindingsEditor(host, {getExercise, words, lessons, onChanged = () => {}}) {
  const doc = host.ownerDocument, controller = new doc.defaultView.AbortController(), signal = controller.signal;
  let bindings = structuredClone(getExercise().vocabularyBindings ?? []), changed = false;
  let surfaces = [], activeKey = '', selected = null, targetId = '', rebinding = null;
  const movedRows = new Set();
  host.innerHTML = `<section role="group" aria-label="Word and phrase links">
    <p>Select exact authored text, then choose an existing vocabulary entry. Links are staged only with workspace Save.</p>
    <label class="studio-field"><span>Authored surface</span><select data-binding-surface></select></label>
    <label class="studio-field"><span>Select a word or phrase here (read only)</span><textarea data-binding-source readonly dir="auto" rows="4"></textarea></label>
    <p>Use the pointer or Shift + arrow keys to select text. Include all vowel marks belonging to each letter.</p>
    <p data-binding-mode role="status"></p><p>Selected excerpt: <bdi dir="auto" data-binding-excerpt>None</bdi></p>
    <p>Vocabulary target: <bdi dir="auto" data-binding-target>Choose an existing entry below.</bdi></p>
    <details><summary>Find or change vocabulary target</summary><div data-binding-picker></div></details>
    <div class="button-row"><button type="button" data-binding-apply disabled>Link selected text</button><button type="button" data-binding-cancel hidden>Cancel rebind</button></div>
    <p role="status" data-binding-status></p><h4>Existing links</h4><ul data-binding-list></ul>
  </section>`;
  const surfaceControl = host.querySelector('[data-binding-surface]'), sourceControl = host.querySelector('[data-binding-source]');
  const status = host.querySelector('[data-binding-status]'), list = host.querySelector('[data-binding-list]');
  const apply = host.querySelector('[data-binding-apply]'), cancel = host.querySelector('[data-binding-cancel]');
  const currentSurface = () => surfaces.find(surface => key(surface) === activeKey);
  const exerciseWith = items => ({...getExercise(), vocabularyBindings:items});
  function errorFor(items) {
    try {validateExerciseVocabularyBindings(exerciseWith(items), words); return '';}
    catch (error) {return error.message;}
  }
  function updateSelection() {
    host.querySelector('[data-binding-excerpt]').textContent = selected?.text ?? 'None';
    const word = words.find(word => word.id === targetId);
    host.querySelector('[data-binding-target]').textContent = word ? wordLabel(word) : 'Choose an existing entry below.';
    host.querySelector('[data-binding-mode]').textContent = rebinding ? 'Rebinding occurrence ' + rebinding + '. Select its current text and target, then apply.' : 'Creating a new occurrence link.';
    apply.textContent = rebinding ? 'Apply rebind' : 'Link selected text';
    // Native select events may be queued before the workspace locks for Save.
    // They must never re-enable a mutation button during that pending save.
    apply.disabled = sourceControl.disabled || !selected || !word;
    cancel.hidden = !rebinding;
  }
  function renderLinks() {
    list.innerHTML = bindings.map((binding, i) => {
      const word = words.find(word => word.id === binding.wordId);
      const error = movedRows.has(binding.id) ? 'Row position changed. Explicitly rebind or remove this occurrence.' : errorFor([binding]);
      return `<li><p><bdi dir="auto">${e(binding.text)}</bdi> → <bdi dir="auto">${e(word ? wordLabel(word) : binding.wordId + ' (missing target)')}</bdi> · ${e(label(binding))} · ${e(binding.id)}</p>
        ${error ? '<p role="alert">Needs repair: ' + e(error) + '</p>' : ''}
        <details><summary>Inspect saved surface</summary><label class="studio-field"><span>Exact surface snapshot</span><textarea data-binding-snapshot readonly dir="auto" rows="3"></textarea></label></details>
        <button type="button" data-binding-rebind="${i}">Rebind link ${i + 1}</button><button type="button" data-binding-remove="${i}">Remove link ${i + 1}</button></li>`;
    }).join('');
    list.querySelectorAll('[data-binding-snapshot]').forEach((control, i) => {control.value = bindings[i].sourceText;});
    if (!bindings.length) list.innerHTML = '<li>No word or phrase links yet. Select authored text above to add one.</li>';
  }
  function loadSurface() {
    const surface = currentSurface();
    sourceControl.value = surface?.sourceText ?? '';
    sourceControl.disabled = !surface;
    selected = null;
    sourceControl.setSelectionRange(0, 0);
    updateSelection();
  }
  function refresh() {
    const previous = currentSurface();
    surfaces = exerciseVocabularySurfaces(getExercise());
    if (!surfaces.some(surface => key(surface) === activeKey)) activeKey = surfaces[0] ? key(surfaces[0]) : '';
    surfaceControl.innerHTML = surfaces.map(surface => `<option value="${e(key(surface))}">${e(label(surface))}</option>`).join('');
    surfaceControl.value = activeKey;
    const current = currentSurface();
    if (!previous || !current || key(previous) !== key(current) || previous.sourceText !== current.sourceText) loadSurface();
    renderLinks();
    const error = errorFor(bindings);
    status.textContent = movedRows.size ? 'Row position changed. Rebind or remove affected links before saving.' : error ? error + ' Rebind or remove affected links before saving.' : '';
  }
  function captureSelection() {
    const surface = currentSurface();
    if (!surface) return;
    const start = sourceOffset(surface.sourceText, sourceControl.selectionStart), end = sourceOffset(surface.sourceText, sourceControl.selectionEnd);
    const candidate = {...surface, start, end, text:surface.sourceText.slice(start, end)};
    const error = errorFor([{id:'selection-check', wordId:targetId || words[0]?.id || 'missing-target', ...candidate}]);
    selected = start < end ? candidate : null;
    // A vocabulary target may not have been chosen yet; selection itself remains exact.
    status.textContent = start === end ? 'Select a nonempty word or phrase.' : error || '';
    updateSelection();
  }
  surfaceControl.addEventListener('change', () => {activeKey = surfaceControl.value; status.textContent = ''; loadSurface();}, {signal});
  for (const event of ['select', 'keyup', 'mouseup']) sourceControl.addEventListener(event, captureSelection, {signal});
  // Browsing and selecting are local UI state, not authored field edits or keyboard targets.
  for (const event of ['input', 'change']) host.addEventListener(event, event => event.stopPropagation(), {signal});
  const picker = mountVocabularyBrowser(host.querySelector('[data-binding-picker]'), {words, lessons, label:'Choose the vocabulary target for selected text', onSelect:id=>{targetId = id; updateSelection();}});
  host.addEventListener('click', event => {
    const remove = event.target.closest('[data-binding-remove]'), rebind = event.target.closest('[data-binding-rebind]');
    if (remove) {
      const binding = bindings[Number(remove.dataset.bindingRemove)];
      bindings.splice(Number(remove.dataset.bindingRemove), 1); movedRows.delete(binding.id);
      if (rebinding === binding.id) {rebinding = null; selected = null;}
      changed = true; onChanged(); refresh(); updateSelection();
      status.textContent = 'Link removed locally. Save the workspace to retain this change.';
      (list.querySelector('[data-binding-rebind]') || surfaceControl).focus();
    } else if (rebind) {
      const binding = bindings[Number(rebind.dataset.bindingRebind)];
      rebinding = binding.id; targetId = binding.wordId;
      if (surfaces.some(surface => key(surface) === key(binding))) activeKey = key(binding);
      surfaceControl.value = activeKey; loadSurface();
      if (!movedRows.has(binding.id) && !errorFor([binding])) {
        const {field, index, sourceText, start, end, text} = binding;
        selected = {field, ...(index === undefined ? {} : {index}), sourceText, start, end, text};
        sourceControl.setSelectionRange(displayOffset(sourceText, start), displayOffset(sourceText, end));
      }
      updateSelection(); sourceControl.focus();
    } else if (event.target.closest('[data-binding-cancel]')) {
      rebinding = null; selected = null; updateSelection(); sourceControl.focus();
    } else if (event.target.closest('[data-binding-apply]')) {
      if (!selected || !targetId) return;
      const id = rebinding || 'occurrence-' + globalThis.crypto.randomUUID();
      const candidate = {id, wordId:targetId, ...selected};
      const next = rebinding ? bindings.map(binding => binding.id === rebinding ? candidate : binding) : [...bindings, candidate];
      // Check the new occurrence with every other currently valid range, while allowing
      // unrelated stale links to remain available for their own explicit repair.
      const peers = next.filter(binding => binding.id === id || (!movedRows.has(binding.id) && !errorFor([binding])));
      const error = errorFor(peers);
      if (error) {status.textContent = error + ' Adjust the selection or remove the conflicting link.'; return;}
      bindings = next; movedRows.delete(id); changed = true; rebinding = null; selected = null;
      sourceControl.setSelectionRange(sourceControl.selectionEnd, sourceControl.selectionEnd);
      onChanged(); refresh(); updateSelection();
      status.textContent = 'Link updated locally. Save the workspace to retain this change.'; sourceControl.focus();
    }
  }, {signal});
  refresh(); updateSelection();
  return {
    refresh,
    // Even byte-identical rows must be explicitly repaired after a positional removal.
    rowsRemoved(field, index) {
      for (const binding of bindings) if (binding.field === field && binding.index >= index) movedRows.add(binding.id);
      const surface = currentSurface();
      if (surface?.field === field && surface.index >= index) {
        selected = null; sourceControl.setSelectionRange(0, 0); updateSelection();
      }
    },
    getEdits() {
      if (movedRows.size) throw fail(getExercise(), 'Exercise ' + getExercise().id + ': row position changed. Rebind or remove affected vocabulary links before saving.');
      return changed ? {vocabularyBindings:structuredClone(bindings)} : {};
    },
    saved() {changed = false;},
    dispose() {controller.abort(); picker.dispose();}
  };
}
