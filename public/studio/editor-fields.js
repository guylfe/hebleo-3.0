// Authoring controls only. All content validation and grading remain server-owned.
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function draftSaveError(error) {
  if ((error.status === 409 || error.statusCode === 409) && ['DRAFT_CONFLICT','STALE_BASE'].includes(error.code)) {
    const current = error.current;
    return `Draft changed elsewhere — reload${current ? ` (active revision: ${current.activeRevisionId}; draft token: ${current.draftToken ?? 'none'})` : ''}`;
  }
  return error.message;
}
export const field = (name, label, value, { multiline = false, type = 'text', options, hint } = {}) => {
  const e = escapeHTML;
  const control = options ? `<select name="${e(name)}">${options.map(([v, text]) => `<option value="${e(v)}"${String(value ?? '') === String(v) ? ' selected' : ''}>${e(text)}</option>`).join('')}</select>`
    : multiline ? `<textarea name="${e(name)}" dir="auto" rows="3">${e(value)}</textarea>`
      : `<input name="${e(name)}" type="${type}" dir="auto" value="${e(value)}"${type === 'number' ? ' min="0" step="any"' : ''}>`;
  return `<label class="studio-field"><span>${e(label)}</span>${control}${hint ? `<small>${e(hint)}</small>` : ''}</label>`;
};
export const booleanOptions = [['', 'Use existing default'], ['true', 'Yes'], ['false', 'No']];
export const nikkudOptions = [['', 'Learner setting'], ['curated', 'Curated forms'], ['full', 'Full Nikkud'], ['none', 'Unpointed forms']];
export const wordOptions = words => words.map(w => [w.id, `${w.pointed} · ${w.english} (${w.id})`]);
export function listField(name, label, values, { options, prefixes } = {}) {
  return `<fieldset data-list="${escapeHTML(name)}"><legend>${escapeHTML(label)}</legend><div data-list-rows>${values.map((value, i) => listRow(name, value, { options, prefix: prefixes?.includes(i), prefixes: Boolean(prefixes) })).join('')}</div><button type="button" data-list-add="${escapeHTML(name)}">Add item</button></fieldset>`;
}
export function listRow(name, value, { options, prefix = false, prefixes = false } = {}) {
  return `<div class="studio-list-row" data-list-row>${field(name, 'Value', value, {options})}${prefixes ? `<label><input type="checkbox" data-prefix${prefix ? ' checked' : ''}>Attach as prefix</label>` : ''}<button type="button" data-list-remove>Remove item</button></div>`;
}
export function bindLists(form, definitions, dirty) {
  const controller = new form.ownerDocument.defaultView.AbortController();
  form.addEventListener('click', event => {
    const add = event.target.closest('[data-list-add]'), remove = event.target.closest('[data-list-remove]');
    if (!add && !remove) return;
    const group = (add || remove).closest('[data-list]'), name = group.dataset.list;
    if (add) group.querySelector('[data-list-rows]').insertAdjacentHTML('beforeend', listRow(name, '', definitions[name]));
    else remove.closest('[data-list-row]').remove();
    dirty.add(name);
    if (definitions[name]?.prefixes) dirty.add('prefixTokenIndices');
  }, { signal: controller.signal });
  return () => controller.abort();
}
export function markDirty(event, dirty) {
  if (event.target.name) dirty.add(event.target.name);
  if (event.target.matches('[data-prefix]')) dirty.add('prefixTokenIndices');
}
export function readFields(form, dirty, arrays = []) {
  const data = new form.ownerDocument.defaultView.FormData(form), edits = {};
  for (const name of dirty) {
    if (name === 'prefixTokenIndices') edits[name] = [...form.querySelectorAll('[data-list="tokens"] [data-list-row]')].flatMap((row, i) => row.querySelector('[data-prefix]').checked ? [i] : []);
    else edits[name] = arrays.includes(name) ? data.getAll(name) : data.get(name);
  }
  return edits;
}
export function replaceObject(content, collection, id, updated) {
  const next = structuredClone(content), index = next[collection].findIndex(item => item.id === id);
  if (index < 0) throw new Error(`Missing ${collection} object: ${id}`);
  next[collection][index] = updated;
  return next;
}
