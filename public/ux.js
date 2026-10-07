import {orderedLessons,lessonFlow} from './course.js';
// Shared, deterministic UX contracts. No generated linguistic content.
export const stepLabels = { learn: 'Learn', check: 'Check', vocabulary: 'Vocabulary', apply: 'Apply', complete: 'Finish' };
export function lessonSteps(lesson) {
  if(lesson.compositionVersion===2)return lesson.blocks.map(b=>b.type==='explanation'?'learn':b.type==='vocabulary'?'vocabulary':b.role==='check'?'check':'apply').concat('complete');
  return lesson.blocks.flatMap(b => b.type === 'explanation' ? ['learn', ...(lesson.checkExerciseIds?.length ? ['check'] : [])] : b.type === 'vocabulary' ? ['vocabulary'] : ['apply']).concat('complete');
}
export function stepExercises(lesson, step, practiceIds) {
  if (practiceIds?.length && step === 'apply') return practiceIds;
  return step === 'check' ? lesson.checkExerciseIds || [] : lesson.exerciseIds.filter(id => !lesson.checkExerciseIds?.includes(id));
}
export function followingLesson(content, lessonId) {
  const lessons=orderedLessons(content),index = lessons.findIndex(l => l.id === lessonId);
  return index < 0 ? null : lessons[index + 1] || null;
}
export function defaultMedium(lesson) { return lesson.video ? 'watch' : 'read'; }
export function audioURL(value) {
  const candidate = typeof value === 'string' ? value : value?.url;
  if (!candidate) return null;
  if (/^\/media\/[A-Za-z0-9_./-]+$/.test(candidate) && !candidate.includes('..')) return candidate;
  try { const url = new URL(candidate); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; } catch { return null; }
}
export function orderingTokens(exercise, content) {
  const base = [...exercise.tokens];
  const lessons=orderedLessons(content),lessonIndex = lessons.findIndex(l => l.id === exercise.lessonId);
  const recent = lessons.slice(Math.max(0, lessonIndex - 2), lessonIndex + 1).reverse().flatMap(l => l.wordIds);
  const candidates = [...new Set(recent)].map(id => content.words.find(w => w.id === id)).filter(w=>w && !w.noVocab).map(w=>w.unpointed);
  const key=t=>t.normalize('NFD').replace(/[\u0591-\u05c7]/g,'').trim();
  const seen=new Set(base.map(key));
  const extras=candidates.filter(t=>{const k=key(t);if(seen.has(k))return false;seen.add(k);return true;}).slice(0, 6);
  // Interleave rather than show the answer as a leading run of tokens.
  const tray = [];
  for (let i = 0; i < Math.max(base.length, extras.length); i++) { if (extras[i]) tray.push(extras[i]); if (base[i]) tray.push(base[i]); }
  return tray;
}
// Correct answers earn one slot per question within the pinned lesson revision.
export function lessonQuestionProgress(lesson, attempts, revisionId) {
  const latest=new Map(),correct=new Set();
  for(const a of attempts)if(a.lessonId===lesson.id && a.revisionId===revisionId && lesson.exerciseIds.includes(a.exerciseId)){
    latest.set(a.exerciseId,a.correct);if(a.correct)correct.add(a.exerciseId);
  }
  return {correctIds:lesson.exerciseIds.filter(id=>correct.has(id)),missedIds:lesson.exerciseIds.filter(id=>latest.get(id)===false)};
}
export function targetedExercises(content, lesson, attempts) {
  const latest = new Map();
  for (const a of attempts) if (a.lessonId === lesson.id) latest.set(a.exerciseId, a.correct);
  const weak = lesson.exerciseIds.filter(id => latest.get(id) === false);
  return weak.length ? weak : lesson.exerciseIds;
}
export function searchableWord(word) { return JSON.stringify(word).normalize('NFD').replace(/[\u0591-\u05c7]/g, '').toLowerCase(); }
export function wordFields(word) {
  const skip = new Set(['id', 'pointed', 'unpointed', 'curated', 'english', 'notes', 'format', 'sourceFields', 'audio', 'fieldFormatting', 'sourceTheme', 'baseWordId', 'prefix', 'importSource', 'formattingVersion', 'taggingVersion']);
  const fields = Object.entries(word).filter(([key, value]) => !skip.has(key) && value != null && value !== '');
  return [...fields, ...Object.entries(word.sourceFields || {}).filter(([, value]) => value != null && value !== '')];
}
export function fieldLabel(key) { return ({ partOfSpeech: 'Part of speech', pluralFeminine: 'Plural feminine', alternateAudio: 'Audio for other forms', introducedLesson: 'Introduced in lesson', noCard: 'Exclude from cards', noVocab: 'Exclude from vocabulary' })[key] || key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, c => c.toUpperCase()); }

export function orderingPrefixes(exercise, tray) {
  const positions=new Set(exercise.prefixTokenIndices || []), counts=new Map();
  return tray.flatMap((t,i)=>{const count=counts.get(t)||0;counts.set(t,count+1);const occurrences=exercise.tokens.map((v,p)=>v===t?p:-1).filter(p=>p>=0);return positions.has(occurrences[count])?[i]:[];});
}
export function reviewNikkud(content, preference) { return preference && preference !== 'default' ? preference : content.reviewPolicy?.defaultNikkud || 'full'; }
