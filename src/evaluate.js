import { DomainError } from './errors.js';

export const normalizeHebrew = (value, requireNikkud = false) => String(value).normalize('NFC').replace(requireNikkud ? /[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g : /[\u0591-\u05c7\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '').replace(/[.,!?;:״„“”"׳‘’']/g, '').trim().replace(/\s+/g, ' ');

// The one grader for learner attempts and author draft preview: same content in, same verdict out, no state.
export function evaluateAnswer(exercise, content, answer) {
  let correct = false; let expected;
  if (exercise.type === 'matching') {
    // A matching attempt is a {wordId: meaning} map; anything else is malformed, not merely wrong.
    if (!answer || typeof answer !== 'object' || Array.isArray(answer) || Object.keys(answer).length > 100 || Object.values(answer).some(v => typeof v !== 'string' || v.length > 2000)) throw new DomainError('Invalid answer.', 400, 'INVALID_ANSWER');
    expected = Object.fromEntries(exercise.wordIds.map(w => [w, content.words.find(x => x.id === w).english]));
    correct = Object.keys(answer).length === exercise.wordIds.length && exercise.wordIds.every(w => answer[w] === expected[w]);
  } else {
    if (typeof answer !== 'string' || answer.length > 2000) throw new DomainError('Invalid answer.', 400, 'INVALID_ANSWER');
    if (exercise.type === 'recognition') { expected = content.words.find(w => w.id === exercise.wordId).english; correct = answer === expected; }
    else { const w = content.words.find(w => w.id === exercise.wordId); const answers = exercise.type === 'typing' ? (exercise.requireNikkud ? [w.pointed] : [w.pointed, w.unpointed]) : exercise.answers; expected = answers[0]; correct = answers.some(a => normalizeHebrew(a, exercise.requireNikkud) === normalizeHebrew(answer, exercise.requireNikkud)); }
  }
  return { correct: Boolean(correct), expected };
}
