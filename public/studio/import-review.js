import {escapeHTML as e} from './editor-fields.js';

// JSON object insertion order is not an authored change. Arrays keep their order;
// the displayed before/after values remain exactly as supplied.
const comparable = value => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);

// Display an interchange pack as supplied. No guessing forms, source authority or approval.
export function inspectImport(previous, candidate) {
  const changes = [], warnings = [];
  const collections = ['words','lessons','exercises'];
  const packFields = [...new Set([...Object.keys(previous), ...Object.keys(candidate || {})])].filter(key => !collections.includes(key) && comparable(previous[key]) !== comparable(candidate?.[key]));
  // Object identity is stable, but surviving objects can be intentionally reordered.
  // Additions/omissions already have item entries; report relative order separately.
  for (const collection of collections) if (Array.isArray(candidate?.[collection])) {
    const beforeIds = (previous[collection] || []).map(item => item.id);
    const afterIds = candidate[collection].map(item => item?.id);
    const beforeSet = new Set(beforeIds), afterSet = new Set(afterIds);
    if (comparable(beforeIds.filter(id => afterSet.has(id))) !== comparable(afterIds.filter(id => beforeSet.has(id)))) packFields.push(collection);
  }
  if (packFields.length) changes.push({collection:'pack',id:'content',kind:'changed',before:previous,after:candidate,fields:packFields});
  for (const collection of collections) {
    if (!Array.isArray(candidate?.[collection])) throw new Error(`Import needs ${collection}.`);
    const old = new Map((previous[collection] || []).map(item=>[item.id,item]));
    const seen = new Set();
    for (const item of candidate[collection]) {
      if (!item || typeof item.id !== 'string' || seen.has(item.id)) throw new Error(`Missing or duplicate ${collection} ID: ${item?.id}`);
      seen.add(item.id);
      const before = old.get(item.id), fields = new Set([...Object.keys(before||{}),...Object.keys(item)]);
      const different = [...fields].filter(key=>comparable(before?.[key])!==comparable(item[key]));
      if (different.length) changes.push({collection,id:item.id,kind:before?'changed':'added',before,after:item,fields:different});
      if (collection === 'words') for (const key of ['pointed','unpointed','curated']) if (typeof item[key] !== 'string' || !item[key].trim()) warnings.push(`${item.id}: missing explicit ${key} form; none will be generated.`);
    }
    for (const [id,before] of old) if (!seen.has(id)) {
      changes.push({collection,id,kind:'omitted',before,after:undefined,fields:Object.keys(before)});
      warnings.push(`${id}: omitted from the pack. Resolve source ownership and references before staging; omission is not deletion approval.`);
    }
  }
  return {changes,warnings};
}
const value = item => item === undefined ? '(absent)' : typeof item === 'string' ? item : JSON.stringify(item,null,2);
export function renderImportReview(previous, candidate, {renderWord = null, validationMessages = []} = {}) {
  const {changes,warnings} = inspectImport(previous,candidate);
  return `<section class="studio-import-review"><h3>Inspect import before staging</h3><p>Supplied provenance: ${e(value(candidate.provenance))}</p><p>Source claims shown here do not establish approval. Server validation and conflict resolution remain required.</p>${[...warnings,...validationMessages].length ? `<ul>${[...warnings,...validationMessages].map(message=>`<li>${e(message)}</li>`).join('')}</ul>`:''}${changes.length ? changes.map(change=>`<details><summary>${e(change.collection)} · ${e(change.id)} · ${e(change.kind)}</summary>${change.collection === 'words' && renderWord && change.after ? `<div data-import-word-preview>${renderWord(change.after,candidate)}</div>`:''}<table><thead><tr><th>Field</th><th>Before</th><th>Supplied value</th></tr></thead><tbody>${change.fields.map(key=>`<tr><th>${e(key)}</th><td><pre dir="auto">${e(value(change.before?.[key]))}</pre></td><td><pre dir="auto">${e(value(change.after?.[key]))}</pre></td></tr>`).join('')}</tbody></table></details>`).join(''):'<p>No object changes.</p>'}</section>`;
}
