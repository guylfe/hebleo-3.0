// UI-only references. Source objects, authored forms and unknown columns never change.
import {escapeHTML as e} from './editor-fields.js';

const text = value => typeof value === 'string' ? value : JSON.stringify(value ?? '');
const searchKey = value => text(value).normalize('NFC').toLocaleLowerCase().replace(/[\u0591-\u05BD\u05BF\u05C1-\u05C2\u05C4-\u05C5\u05C7]/g, '');
export const wordLabel = word => [word.pointed, word.unpointed, word.curated, word.english, `(${word.id})`].filter(Boolean).join(' · ');

export function createVocabularyIndex({words = [], lessons = []}) {
  const tags = [...new Set(words.flatMap(w => Array.isArray(w.tags) ? w.tags : []))].sort();
  const membership = new Map(words.map(w => [w.id, new Set(w.lessonId ? [w.lessonId] : [])]));
  for (const lesson of lessons) for (const id of lesson.wordIds || []) membership.get(id)?.add(lesson.id);
  const entries = words.map(word => ({word, key: searchKey(word), lessons: membership.get(word.id)}));
  return {
    tags, lessons: lessons.map(l => ({id:l.id, title:l.title})),
    query({search = '', tag = '', lessonId = '', page = 0, pageSize = 50} = {}) {
      const terms = searchKey(search).trim().split(/\s+/).filter(Boolean);
      const matches = entries.filter(x => terms.every(term => x.key.includes(term)) && (!tag || Array.isArray(x.word.tags) && x.word.tags.includes(tag)) && (!lessonId || x.lessons?.has(lessonId)));
      const size = Math.min(50, Math.max(1, Math.trunc(Number(pageSize)) || 50));
      const pages = Math.max(1, Math.ceil(matches.length / size));
      const current = Math.min(pages - 1, Math.max(0, Math.trunc(Number(page)) || 0));
      return {words:matches.slice(current * size, (current + 1) * size).map(x => x.word), total:matches.length, page:current, pages};
    }
  };
}

// Retain pre-existing references (including unresolved IDs), append new IDs in click order.
export function toggleWordSelection(selectedIds, id, selected = !selectedIds.includes(id)) {
  return selected ? [...new Set([...selectedIds, id])] : selectedIds.filter(x => x !== id);
}

export function mountVocabularyBrowser(host, {words = [], lessons = [], selectedIds = [], onSelect = () => {}, onSelectionChange = () => {}, selection = false, pageSize = 50, label = 'Vocabulary browser'} = {}) {
  const index = createVocabularyIndex({words, lessons});
  const doc = host.ownerDocument, controller = new doc.defaultView.AbortController(), signal = controller.signal;
  let chosen = [...selectedIds], state = {search:'', tag:'', lessonId:'', page:0, pageSize}, disposed = false;
  host.innerHTML = `<section class="studio-vocabulary" aria-label="${e(label)}"><div class="studio-vocabulary-filters"><label>Find a word<input type="search" data-vocab-search dir="auto" placeholder="Hebrew, meaning, ID or source field"></label><label>Tag<select data-vocab-tag><option value="">All tags</option>${index.tags.map(tag => `<option value="${e(tag)}">${e(tag)}</option>`).join('')}</select></label><label>Lesson<select data-vocab-lesson><option value="">All lessons</option>${index.lessons.map(l => `<option value="${e(l.id)}">${e(l.title)} (${e(l.id)})</option>`).join('')}</select></label></div><p role="status" aria-live="polite" data-vocab-status></p><ul data-vocab-results></ul><nav aria-label="Vocabulary pages"><button type="button" data-vocab-page="-1">Previous</button><span data-vocab-page-label></span><button type="button" data-vocab-page="1">Next</button></nav></section>`;
  const results = host.querySelector('[data-vocab-results]'), status = host.querySelector('[data-vocab-status]');
  function render() {
    if (disposed) return;
    const result = index.query(state); state.page = result.page;
    status.textContent = `${result.total} matching words${selection ? ` · ${chosen.length} selected` : ''}${result.total ? '' : ' · No words match these filters.'}`;
    results.innerHTML = result.words.map(w => `<li data-vocab-row><button type="button" data-vocab-id="${e(w.id)}"${selection ? ` aria-pressed="${chosen.includes(w.id)}"` : ''}><bdi dir="auto">${e(wordLabel(w))}</bdi>${selection ? (chosen.includes(w.id) ? ' · Selected' : ' · Add') : ''}</button></li>`).join('');
    host.querySelector('[data-vocab-page-label]').textContent = ` Page ${result.page + 1} of ${result.pages} `;
    host.querySelector('[data-vocab-page="-1"]').disabled = result.page === 0;
    host.querySelector('[data-vocab-page="1"]').disabled = result.page === result.pages - 1;
  }
  function filter(event) {
    const key = event.target.matches('[data-vocab-search]') ? 'search' : event.target.matches('[data-vocab-tag]') ? 'tag' : event.target.matches('[data-vocab-lesson]') ? 'lessonId' : null;
    // A search input emits change on blur after input. Replacing its result button
    // between pointerdown and click would swallow the first selection.
    if (!key || state[key] === event.target.value) return;
    state[key] = event.target.value; state.page = 0; render();
  }
  host.addEventListener('input', filter, {signal});
  host.addEventListener('change', filter, {signal});
  host.addEventListener('click', event => {
    const button = event.target.closest('[data-vocab-id]');
    const paging = event.target.closest('[data-vocab-page]');
    if (paging) {state.page += Number(paging.dataset.vocabPage); render();}
    if (!button) return;
    const id = button.dataset.vocabId, word = words.find(w => w.id === id);
    if (!word) return;
    if (selection) {chosen = toggleWordSelection(chosen, id); onSelectionChange([...chosen]); render();}
    onSelect(id, word);
  }, {signal});
  render();
  return {getSelectedIds: () => [...chosen], setSelectedIds(ids) {if (!disposed) {chosen = [...ids]; render();}}, dispose() {disposed = true; controller.abort(); host.replaceChildren();}};
}

export const mountWordSelector = (host, options = {}) => mountVocabularyBrowser(host, {...options, selection:true, label:options.label || 'Select specific vocabulary words'});

// Store tag references as tags. Choosing one never expands into a copied word list.
export function mountTagSelector(host, {tags = [], selectedTags = [], onChange = () => {}} = {}) {
  let selected = [...selectedTags], disposed = false;
  const available = [...new Set(tags)].sort(), controller = new host.ownerDocument.defaultView.AbortController();
  host.innerHTML = '<div class="studio-tag-selector"><label>Find a tag<input type="search" data-tag-search dir="auto"></label><div data-tag-results></div><p data-tag-status role="status"></p><div data-selected-tags></div></div>';
  function render() {
    if (disposed) return;
    const query = searchKey(host.querySelector('[data-tag-search]').value), matches = available.filter(t => searchKey(t).includes(query));
    host.querySelector('[data-tag-results]').innerHTML = matches.slice(0,50).map(tag => `<button type="button" data-tag="${e(tag)}" aria-pressed="${selected.includes(tag)}">${e(tag)}${selected.includes(tag) ? ' · Selected' : ' · Add'}</button>`).join('');
    host.querySelector('[data-tag-status]').textContent = `${matches.length} matching tags · ${selected.length} selected${matches.length > 50 ? ' · Refine search to see more than the first 50' : ''}`;
    // Removals also bounded; unknown legacy selections are retained and searchable.
    const chosen = selected.filter(t => searchKey(t).includes(query));
    host.querySelector('[data-selected-tags]').innerHTML = chosen.slice(0,50).map(tag => `<button type="button" data-remove-tag="${e(tag)}">Remove ${e(tag)}</button>`).join('');
  }
  host.addEventListener('input', render, {signal:controller.signal});
  host.addEventListener('click', event => {
    const add = event.target.closest('[data-tag]'), remove = event.target.closest('[data-remove-tag]');
    if (!add && !remove) return;
    const tag = add?.dataset.tag ?? remove.dataset.removeTag;
    selected = toggleWordSelection(selected, tag, remove ? false : !selected.includes(tag));
    onChange([...selected]); render();
  }, {signal:controller.signal}); render();
  return {getSelectedTags: () => [...selected], dispose() {disposed = true; controller.abort(); host.replaceChildren();}};
}
