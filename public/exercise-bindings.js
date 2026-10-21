// Authored occurrences only: no normalization, spelling lookup, or learner-answer matching.
const families = new Set(['recognition', 'typing', 'matching', 'ordering', 'cloze', 'transformation']);
const answerFamilies = new Set(['typing', 'ordering', 'cloze', 'transformation']);
const scalarFields = ['prompt', 'context', 'feedback', 'feedbackDetails'];
const bindingKeys = new Set(['id', 'wordId', 'field', 'index', 'start', 'end', 'text', 'sourceText']);
const validId = value => typeof value === 'string' && value.length <= 100 &&
  /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(value) && !['constructor', 'prototype', '__proto__'].includes(value);
const surfaceKey = ({field, index}) => field + ':' + (index ?? '');

// Offsets and lengths are JavaScript UTF-16 code units. Missing Intl.Segmenter fails closed.
export function exerciseGraphemeBoundaries(text) {
  if (typeof text !== 'string' || typeof Intl?.Segmenter !== 'function') return new Set();
  return new Set([0, ...Array.from(new Intl.Segmenter('he', {granularity:'grapheme'}).segment(text),
    part => part.index + part.segment.length)]);
}

export function exerciseVocabularySurfaces(exercise) {
  if (!families.has(exercise?.type)) return [];
  const surfaces = scalarFields.filter(field => typeof exercise[field] === 'string')
    .map(field => ({field, sourceText:exercise[field]}));
  for (const field of [...(exercise.type === 'ordering' ? ['tokens'] : []),
    ...(answerFamilies.has(exercise.type) ? ['answers'] : [])]) {
    if (Array.isArray(exercise[field])) exercise[field].forEach((sourceText, index) => {
      if (typeof sourceText === 'string') surfaces.push({field, index, sourceText});
    });
  }
  return surfaces;
}

// Returns the original array unchanged, or throws an actionable error. Pass words at authoring
// boundaries to require one existing runtime ID; omission permits validation of projected surfaces.
export function validateExerciseVocabularyBindings(exercise, words) {
  if (!Object.hasOwn(exercise, 'vocabularyBindings')) return [];
  const fail = message => { throw new Error('Exercise ' + (exercise.id || '?') + ' vocabularyBindings: ' + message); };
  const bindings = exercise.vocabularyBindings;
  if (!Array.isArray(bindings) || bindings.length > 500) fail('expected an array of at most 500 occurrences.');
  if (!families.has(exercise.type)) fail('unsupported exercise family.');
  const surfaces = new Map(exerciseVocabularySurfaces(exercise).map(surface => [surfaceKey(surface), surface]));
  const ids = new Set(), ranges = new Map(), boundaries = new Map();
  for (const [position, binding] of bindings.entries()) {
    const at = 'item ' + (position + 1) + ': ';
    if (!binding || typeof binding !== 'object' || Array.isArray(binding) ||
        Object.keys(binding).some(key => !bindingKeys.has(key))) fail(at + 'unsupported binding properties.');
    if (!validId(binding.id) || ids.has(binding.id)) fail(at + 'binding ID must be valid and unique in this exercise.');
    ids.add(binding.id);
    if (typeof binding.field !== 'string' || ![...scalarFields, 'answers', 'tokens'].includes(binding.field)) {
      fail(at + 'unsupported surface field.');
    }
    if (!validId(binding.wordId) || (words !== undefined &&
        (!Array.isArray(words) || words.filter(word => word.id === binding.wordId).length !== 1))) {
      fail(at + 'wordId must identify exactly one existing vocabulary runtime ID.');
    }
    const arrayField = ['answers', 'tokens'].includes(binding.field);
    if (arrayField ? !Number.isInteger(binding.index) || binding.index < 0 : Object.hasOwn(binding, 'index')) {
      fail(at + 'array surfaces require a nonnegative integer index; scalar surfaces forbid index.');
    }
    const key = surfaceKey(binding), surface = surfaces.get(key);
    if (!surface) fail(at + 'unsupported or missing surface/index.');
    if (typeof binding.sourceText !== 'string' || binding.sourceText.length > 12000 ||
        binding.sourceText !== surface.sourceText) fail(at + 'sourceText differs from the exact authored surface; rebind after editing.');
    if (typeof binding.text !== 'string' || !binding.text.length ||
        !Number.isInteger(binding.start) || !Number.isInteger(binding.end) ||
        binding.start < 0 || binding.end <= binding.start || binding.end > binding.sourceText.length ||
        binding.text !== binding.sourceText.slice(binding.start, binding.end)) {
      fail(at + 'text must be the exact nonempty slice at in-range UTF-16 start/end offsets.');
    }
    if (!boundaries.has(key)) boundaries.set(key, exerciseGraphemeBoundaries(binding.sourceText));
    if (!boundaries.get(key).has(binding.start) || !boundaries.get(key).has(binding.end)) fail(at + 'offset splits a grapheme or grapheme segmentation is unavailable.');
    const prior = ranges.get(key) || [];
    if (prior.some(other => binding.start < other.end && other.start < binding.end)) fail(at + 'overlapping occurrences on one surface.');
    prior.push(binding); ranges.set(key, prior);
  }
  return bindings;
}

// Valid explicit links add to the existing direct references. Malformed bindings never grant cards.
export function exerciseVocabularyReferenceIds(exercise, words) {
  const direct = ['recognition', 'typing'].includes(exercise.type) ? [exercise.wordId] :
    exercise.type === 'matching' ? exercise.wordIds || [] : [];
  let bindings = [];
  try { bindings = validateExerciseVocabularyBindings(exercise, words); } catch { /* fail closed for response helpers */ }
  return [...new Set([...direct, ...bindings.map(binding => binding.wordId)].filter(validId))];
}

// tokenIndexMap is supplied by the tray builder, never guessed from matching text.
// Answer surfaces stay private until the existing grading response reveals authored answers.
export function projectExerciseVocabularyBindings(exercise, {tokenIndexMap} = {}) {
  let bindings;
  try { bindings = validateExerciseVocabularyBindings(exercise); } catch { return []; }
  return bindings.filter(binding => binding.field !== 'answers').flatMap(binding => {
    if (binding.field !== 'tokens' || tokenIndexMap === undefined) return [{...binding}];
    const index = tokenIndexMap[binding.index];
    return Number.isInteger(index) && index >= 0 ? [{...binding, index}] : [];
  });
}

// Response only: preserve the original grade and submitted answer, including wrong raw text.
// Render these on authored expected/accepted surfaces, NEVER on result.answer.
export function withAnswerVocabularyBindings(exercise, result) {
  if (!result) return result;
  // Older/imported receipts are data, not authority for occurrence links.
  if (Object.hasOwn(result, 'vocabularyBindings')) {
    result = {...result};
    delete result.vocabularyBindings;
  }
  let bindings;
  try { bindings = validateExerciseVocabularyBindings(exercise).filter(binding => binding.field === 'answers'); }
  catch { return result; }
  return bindings.length ? {...result, vocabularyBindings:bindings.map(binding => ({...binding}))} : result;
}
