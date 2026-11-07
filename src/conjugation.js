import {readFileSync} from 'node:fs';
import {DomainError} from './errors.js';
import {isConjugationId,validateFormIds,validateConjugationUnlocks,selectableConjugationForms} from '../public/conjugation-contract.js';

export const emptyConjugationCatalog = () => ({schemaVersion:1,status:'Conjugation forms are awaiting content approval.',words:[],forms:[]});
const nonempty = v => typeof v === 'string' && Boolean(v.trim()) && v.length <= 4000;
export function validateConjugationCatalog(catalog, {allowFixtures=false}={}) {
  if (!catalog || catalog.schemaVersion !== 1 || !Array.isArray(catalog.words) || !Array.isArray(catalog.forms) || catalog.words.length > 2000 || catalog.forms.length > 10000) throw new DomainError('Invalid conjugation catalog.');
  const words = new Map();
  for (const word of catalog.words) {
    if (!word || !isConjugationId(word.id) || words.has(word.id) || !['verb','prep'].includes(word.kind) || !nonempty(word.unpointed) || word.pointed != null && !nonempty(word.pointed)) throw new DomainError('Invalid or duplicate conjugation word.');
    words.set(word.id, word);
  }
  const ids = new Set();
  for (const form of catalog.forms) {
    if (!form || !isConjugationId(form.id) || ids.has(form.id) || !words.has(form.wordId) || !['approved','source-attested','held','fixture'].includes(form.approval)) throw new DomainError('Invalid or duplicate conjugation form.');
    ids.add(form.id);
    if (form.approval === 'fixture' && allowFixtures !== true) throw new DomainError('Fixture conjugations are excluded from the production catalog.');
    if (!selectableConjugationForms({forms:[form]}, {allowFixtures}).length) continue;
    if (!['past','present','future','imperative','infinitive','gerund','preposition'].includes(form.tense) || !['1','2','3','none'].includes(String(form.person)) || !['common','masculine','feminine','none'].includes(form.gender) || !['singular','plural','none'].includes(form.number) || !['pointed','unpointed','english','pronoun'].every(k=>nonempty(form[k]))) throw new DomainError('Approved conjugation forms need explicit display forms and target cues.');
    if ((words.get(form.wordId).kind === 'prep') !== (form.tense === 'preposition') || ['infinitive','gerund'].includes(form.tense) && ['person','gender','number'].some(k=>form[k]!=='none')) throw new DomainError('Conjugation target does not match its semantic slot.');
    if (['acceptedHebrew','acceptedEnglish'].some(k=>!Array.isArray(form[k]) || form[k].length>100 || form[k].some(v=>!nonempty(v))) || !Array.isArray(form.provenance) || !form.provenance.length) throw new DomainError('Approved conjugation forms need reviewed alternatives and provenance.');
  }
  return catalog;
}
export function loadConjugationCatalog() {
  let raw;
  try { raw = readFileSync(new URL('../public/conjugation/catalog.json', import.meta.url), 'utf8'); }
  catch (error) { if (error.code === 'ENOENT') return emptyConjugationCatalog(); throw error; }
  return validateConjugationCatalog(JSON.parse(raw));
}
export function validateLessonUnlocks(lesson, catalog, options) {
  try { validateConjugationUnlocks(lesson.conjugationUnlocks, catalog, options); }
  catch(error) { throw new DomainError(error.message); }
}
export function validateLearnedFormIds(ids) {
  if (ids === undefined) return;
  try { validateFormIds(ids); } catch(error) { throw new DomainError(error.message); }
}
export function addCompletionUnlocks(state, lesson, catalog, options) {
  validateLessonUnlocks(lesson); // Never reinterpret a stored slot as a whole paradigm.
  const approved = new Set(selectableConjugationForms(catalog, options).map(f=>f.id));
  state.conjugationLearnedFormIds = [...new Set([...(state.conjugationLearnedFormIds || []), ...(lesson.conjugationUnlocks?.formIds || []).filter(id=>approved.has(id))])];
}
