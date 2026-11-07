// Native boundary validation; independent of the practice view and its controls.
export function isConjugationId(value) {
  return typeof value === 'string' && value.length <= 160 && /^[A-Za-z0-9][A-Za-z0-9_:-]*$/.test(value) && !['constructor','prototype','__proto__'].includes(value);
}
export function validateFormIds(ids) {
  if (!Array.isArray(ids) || ids.length > 10000 || ids.some(id => !isConjugationId(id)) || new Set(ids).size !== ids.length) throw new Error('Conjugation form IDs must be a unique list of safe stable IDs.');
  return ids;
}
export function selectableConjugationForms(catalog, {allowFixtures = false} = {}) {
  return (catalog?.forms || []).filter(form => form.approval === 'approved' || allowFixtures === true && form.approval === 'fixture');
}
export function validateConjugationUnlocks(value, catalog, options) {
  if (value === undefined) return;
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => key !== 'formIds')) throw new Error('Lesson conjugationUnlocks must contain only formIds.');
  validateFormIds(value.formIds);
  if (catalog) {
    const available = new Set(selectableConjugationForms(catalog, options).map(form => form.id));
    for (const id of value.formIds) if (!available.has(id)) throw new Error('Conjugation form is unknown or not approved: ' + id);
  }
}
