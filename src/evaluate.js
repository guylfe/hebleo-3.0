import { DomainError } from './errors.js';

import {normalizeHebrew,hasGradingContent} from '../public/answer-policy.js';
export {normalizeHebrew};

// The one grader for learner attempts and author draft preview: same content in, same verdict out, no state.
export function evaluateAnswer(exercise, content, answer) {
  let correct = false; let expected, pairResults;
  if (exercise.type === 'matching') {
    // A matching attempt is a {wordId: meaning} map; anything else is malformed, not merely wrong.
    if (!answer || typeof answer !== 'object' || Array.isArray(answer) || Object.keys(answer).length > 100 || Object.values(answer).some(v => typeof v !== 'string' || v.length > 2000)) throw new DomainError('Invalid answer.', 400, 'INVALID_ANSWER');
    expected = Object.fromEntries(exercise.wordIds.map(w => [w, content.words.find(x => x.id === w).english]));
    pairResults = matchingPairResults(exercise, {answer, expected});
    correct = Object.keys(answer).length === exercise.wordIds.length && exercise.wordIds.every(w => pairResults[w]);
  } else {
    if (typeof answer !== 'string' || answer.length > 2000) throw new DomainError('Invalid answer.', 400, 'INVALID_ANSWER');
    if (exercise.type === 'recognition') { expected = content.words.find(w => w.id === exercise.wordId).english; correct = answer === expected; }
    else { const w = content.words.find(w => w.id === exercise.wordId); const answers = exercise.type === 'typing' ? (Object.hasOwn(exercise,'answers') ? exercise.answers : [w.pointed, w.unpointed]) : exercise.answers; expected = answers[0]; correct = hasGradingContent(answer) && answers.some(a => hasGradingContent(a) && normalizeHebrew(a) === normalizeHebrew(answer)); }
  }
  return { correct: Boolean(correct), expected, ...(Array.isArray(exercise.answers)&&new Set(exercise.answers).size>1?{acceptedAnswers:[...new Set(exercise.answers)]}:{}), ...(pairResults ? {pairResults} : {}), ...(!['matching','recognition'].includes(exercise.type) ? {evaluationPolicy:'ignore-nikkud-v1'} : {}) };
}

// Derive display verdicts on the server from the saved submitted/expected pairs.
// Legacy grades keep their historical overall verdict and exact expected answers.
export function matchingPairResults(exercise, result) {
  return Object.fromEntries(exercise.wordIds.map(id=>[id, result.answer?.[id] === result.expected?.[id]]));
}
