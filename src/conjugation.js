import {readFileSync} from 'node:fs';
import {DomainError} from './errors.js';
import {validateCatalog} from '../public/conjugation/catalog-contract.js';
import {validateFormIds,validateConjugationUnlocks,selectableConjugationForms} from '../public/conjugation-contract.js';

export const emptyConjugationCatalog = () => ({schemaVersion:1,status:'Conjugation forms are awaiting content approval.',words:[],forms:[]});
export function validateConjugationCatalog(catalog, {allowFixtures=false}={}) {
  try { return validateCatalog(catalog,{allowFixtures}); }
  catch(error) { throw new DomainError(error.message); }
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
