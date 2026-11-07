// One catalogue contract for native startup, portable grading and WordPress packaging.
export const isConjugationId = value => typeof value === 'string' && value.length <= 160 && /^[A-Za-z0-9][A-Za-z0-9_:-]*$/.test(value) && !['constructor','prototype','__proto__'].includes(value);
export const TENSES = ['past','present','future','imperative','infinitive','gerund','preposition'];
const nonempty = value => typeof value === 'string' && Boolean(value.trim()) && value.length <= 4000;
const provenance = value => nonempty(value) || value !== null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0 && JSON.stringify(value).length <= 4000;
export function validateCatalog(catalog, {allowFixtures=true}={}) {
  if (catalog?.schemaVersion !== 1 || !Array.isArray(catalog.words) || !Array.isArray(catalog.forms) || catalog.words.length > 2000 || catalog.forms.length > 10000) throw Error('Invalid conjugation catalog.');
  const words = new Map(), ids = new Set();
  for (const word of catalog.words) {
    if (!word || !isConjugationId(word.id) || words.has(word.id) || !['verb','prep'].includes(word.kind) || !nonempty(word.unpointed) || word.pointed != null && !nonempty(word.pointed)) throw Error('Invalid or duplicate conjugation word.');
    words.set(word.id, word);
  }
  for (const form of catalog.forms) {
    if (!form || !isConjugationId(form.id) || ids.has(form.id) || !words.has(form.wordId) || !['approved','fixture','held','source-attested'].includes(form.approval)) throw Error('Invalid form identity or approval.');
    ids.add(form.id);
    if (form.approval === 'fixture' && allowFixtures !== true) throw Error('Fixture conjugations are excluded from the production catalog.');
    if (!['approved','fixture'].includes(form.approval)) continue;
    if (!TENSES.includes(form.tense) || !['1','2','3','none'].includes(String(form.person)) || !['common','masculine','feminine','none'].includes(form.gender) || !['singular','plural','none'].includes(form.number) || !['pointed','unpointed','english','pronoun'].every(k=>nonempty(form[k]))) throw Error('Approved conjugation forms need explicit display forms and target cues.');
    if ((words.get(form.wordId).kind === 'prep') !== (form.tense === 'preposition') || ['infinitive','gerund'].includes(form.tense) && ['person','gender','number'].some(k=>form[k]!=='none') || form.tense === 'imperative' && String(form.person) !== '2') throw Error('Conjugation target does not match its semantic slot.');
    if (['acceptedHebrew','acceptedEnglish'].some(k=>!Array.isArray(form[k]) || form[k].length > 100 || form[k].some(v=>!nonempty(v))) || !Array.isArray(form.provenance) || !form.provenance.length || form.provenance.length > 100 || form.provenance.some(v=>!provenance(v))) throw Error('Approved conjugation forms need reviewed alternatives and provenance.');
  }
  return catalog;
}
