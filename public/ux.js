// Shared, deterministic UX contracts. No generated linguistic content.
export const stepLabels = { learn: 'Learn', check: 'Check', vocabulary: 'Vocabulary', apply: 'Apply', complete: 'Finish' };
export function lessonSteps(lesson) {
  return lesson.blocks.flatMap(b => b.type === 'explanation' ? ['learn', ...(lesson.checkExerciseIds?.length ? ['check'] : [])] : b.type === 'vocabulary' ? ['vocabulary'] : ['apply']).concat('complete');
}
export function stepExercises(lesson, step, practiceIds) {
  if (practiceIds?.length && step === 'apply') return practiceIds;
  return step === 'check' ? lesson.checkExerciseIds || [] : lesson.exerciseIds.filter(id => !lesson.checkExerciseIds?.includes(id));
}
export function followingLesson(content, lessonId) {
  const index = content.lessons.findIndex(l => l.id === lessonId);
  return index < 0 ? null : content.lessons[index + 1] || null;
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
  const lessonIndex = content.lessons.findIndex(l => l.id === exercise.lessonId);
  const taught = content.lessons.slice(0, lessonIndex + 1).flatMap(l => l.wordIds);
  const recent = content.lessons.slice(Math.max(0, lessonIndex - 2), lessonIndex + 1).reverse().flatMap(l => l.wordIds);
  const candidates = [...new Set([...recent, ...taught])].map(id => content.words.find(w => w.id === id)?.unpointed).filter(Boolean);
  const key=t=>t.normalize('NFD').replace(/[\u0591-\u05c7]/g,'').trim();
  const seen=new Set(base.map(key));
  const extras=candidates.filter(t=>{const k=key(t);if(seen.has(k))return false;seen.add(k);return true;}).slice(0, 6);
  // Interleave rather than show the answer as a leading run of tokens.
  const tray = [];
  for (let i = 0; i < Math.max(base.length, extras.length); i++) { if (extras[i]) tray.push(extras[i]); if (base[i]) tray.push(base[i]); }
  return tray;
}
export function targetedExercises(content, lesson, attempts) {
  const latest = new Map();
  for (const a of attempts) if (a.lessonId === lesson.id) latest.set(a.exerciseId, a.correct);
  const weak = lesson.exerciseIds.filter(id => latest.get(id) === false);
  return weak.length ? weak : lesson.exerciseIds;
}
export function searchableWord(word) { return JSON.stringify(word).normalize('NFD').replace(/[\u0591-\u05c7]/g, '').toLowerCase(); }
export function wordFields(word) {
  const skip = new Set(['id', 'pointed', 'unpointed', 'curated', 'english', 'notes', 'format', 'sourceFields', 'audio']);
  const fields = Object.entries(word).filter(([key, value]) => !skip.has(key) && value != null && value !== '');
  return [...fields, ...Object.entries(word.sourceFields || {}).filter(([, value]) => value != null && value !== '')];
}
export function fieldLabel(key) { return ({ partOfSpeech: 'Part of speech', pluralFeminine: 'Plural feminine', alternateAudio: 'Audio for other forms', introducedLesson: 'Introduced in lesson', noCard: 'Exclude from cards', noVocab: 'Exclude from vocabulary' })[key] || key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, c => c.toUpperCase()); }
