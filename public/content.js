// Shared manifest selector contract. Stable references resolve canonical content.
export {resolveComponent as resolveBlock} from './course.js';
export * from './vocabulary-import.js';

// CSV exports preserve the explicit authored forms; no transliteration or vowels are generated.
export function importVocabularyCSV(csv, content) {
  const rows = []; let row = [], field = '', quoted = false, closed = false;
  const finishField = () => { row.push(field); field = ''; closed = false; };
  const finishRow = () => { finishField(); if (row.some(v => v !== '')) rows.push(row); row = []; };
  const input = csv.replace(/^\uFEFF/, '');
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (quoted) { if (c === '"') { if (input[i+1] === '"') { field += '"'; i++; } else { quoted = false; closed = true; } } else field += c; }
    else if (c === ',') finishField();
    else if (c === '\r' || c === '\n') { if (c === '\r' && input[i+1] === '\n') i++; finishRow(); }
    else if (c === '"' && !field && !closed) quoted = true;
    else { if (closed || c === '"') throw new Error('Malformed CSV quoting.'); field += c; }
  }
  if (quoted) throw new Error('Unclosed quoted CSV field.');
  finishRow();
  const headers = rows.shift()?.map(h => h.trim());
  const required = ['id', 'pointed', 'unpointed', 'curated', 'english'];
  if (!headers || required.some(h => !headers.includes(h)) || new Set(headers).size !== headers.length || headers.some(h => !h || h.length > 100 || ['__proto__', 'prototype', 'constructor'].includes(h))) throw new Error('CSV needs unique columns including id, pointed, unpointed, curated, english. Other source columns are preserved.');
  if (!rows.length || rows.length > 2000) throw new Error('CSV needs 1–2000 vocabulary rows.');
  const next = structuredClone(content); const seen = new Set();
  for (const values of rows) {
    if (values.length !== headers.length) throw new Error('CSV row has a different number of columns.');
    const fields = Object.fromEntries(headers.map((h, i) => [h, values[i]]));
    if (seen.has(fields.id)) throw new Error('Duplicate CSV vocabulary ID: ' + fields.id); seen.add(fields.id);
    const known = [...required, 'notes', 'root', 'pattern', 'gender', 'plural', 'feminine', 'pluralFeminine', 'infinitive', 'partOfSpeech', 'audio', 'introducedLesson', 'part'];
    const old = next.words.find(w => w.id === fields.id); const w = { ...old, ...Object.fromEntries(Object.entries(fields).filter(([key]) => known.includes(key))) };
    w.sourceFields = { ...old?.sourceFields, ...Object.fromEntries(Object.entries(fields).filter(([key]) => ![...known, 'color', 'bold'].includes(key))) };
    if ('color' in fields || 'bold' in fields) {
      w.format = { ...(old?.format || {}) };
      if ('color' in fields) { if (fields.color && !/^#[0-9a-f]{6}$/i.test(fields.color)) throw new Error('CSV color must be a six-digit hex value.'); if (fields.color) w.format.color = fields.color; else delete w.format.color; }
      if ('bold' in fields) { if (!['true', 'false', ''].includes(fields.bold)) throw new Error('CSV bold must be true or false.'); w.format.bold = fields.bold === 'true'; }
    }
    if (old) next.words[next.words.indexOf(old)] = w; else next.words.push(w);
  }
  return next;
}
