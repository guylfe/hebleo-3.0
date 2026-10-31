// Bounded release planning. Never stages a candidate or mutates either snapshot.
import {canonicalJSON, contextHash} from './immutable-context.js';
import {DomainError} from './errors.js';
import {resolveSelector, validateLessonComposition} from '../public/course.js';
import {exerciseVocabularyReferenceIds} from '../public/exercise-bindings.js';
import {projectLexicalRows} from '../public/lexical-runtime.js';

const same = (a, b) => canonicalJSON(a) === canonicalJSON(b);
const keyFor = ({kind, id}) => kind + '/' + id;
const plain = v => v && typeof v === 'object' && !Array.isArray(v);
const validID = v => typeof v === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(v) && !['constructor','prototype','__proto__'].includes(v);
const invalid = message => { throw new DomainError(message, 400, 'LESSON_PUBLICATION_SCOPE'); };

export function publicationScope(input, {commit = false} = {}) {
  const fields = ['baseRevisionId','expectedDraftToken','lessonId','includeDependencies', ...(commit ? ['reviewToken'] : [])];
  if (!plain(input) || Object.keys(input).some(k => !fields.includes(k))) invalid('Unknown selected-publication field.');
  if (!Number.isSafeInteger(input.baseRevisionId) || input.baseRevisionId < 1 || typeof input.expectedDraftToken !== 'string' || !input.expectedDraftToken || !validID(input.lessonId)) invalid('Name the saved base, draft token and selected lesson.');
  if (!Array.isArray(input.includeDependencies) || input.includeDependencies.length > 4000) invalid('includeDependencies must be an explicit array.');
  const seen = new Set();
  for (const entry of input.includeDependencies) {
    if (!plain(entry) || Object.keys(entry).length !== 3 || Object.keys(entry).some(k => !['kind','id','action'].includes(k)) || !['words','exercises'].includes(entry.kind) || !validID(entry.id) || !['added','changed'].includes(entry.action)) invalid('Dependencies need exactly kind, id and action (added or changed).');
    if (seen.has(keyFor(entry))) invalid('Duplicate dependency selection.');
    seen.add(keyFor(entry));
  }
  if (commit && (typeof input.reviewToken !== 'string' || !/^lp1-[a-f0-9]{64}$/.test(input.reviewToken))) invalid('The exact review token is required.');
  return {...input, includeDependencies: [...input.includeDependencies].sort((a,b) => keyFor(a).localeCompare(keyFor(b)))};
}

export function planLessonPublication(active, draft, scope) {
  const lesson = draft.lessons.find(l => l.id === scope.lessonId);
  if (!lesson) throw new DomainError('Selected lesson is absent from the saved draft.', 404, 'LESSON_PUBLICATION_TARGET');
  const candidate = structuredClone(active), blockers = [], required = new Map();
  const block = (code, path, reason, id = scope.lessonId) => {
    if (!blockers.some(b => b.code === code && b.path === path && b.id === id)) blockers.push({code, id, path, reason, action:'Resolve this dependency in an explicitly reviewed publication scope.'});
  };
  const index = candidate.lessons.findIndex(l => l.id === lesson.id);
  if (index < 0) {
    block('CURRICULUM_PUBLICATION_REQUIRED', 'curriculum', 'A new lesson requires an explicit curriculum placement; selected publication supports existing published lessons.');
    if (lesson.draftImport || lesson.publicationStatus === 'unpublished-adapted-draft') block('TEXT_DRAFT_REVIEW_REQUIRED', 'lessons/' + lesson.id, 'An adapted draft has no teaching promotion approval.');
    if (scope.includeDependencies.length) invalid('Dependencies cannot be selected for an unsupported new lesson.');
    return {candidate, blockers, requiredDependencies:[], includedDependencies:[]};
  }
  candidate.lessons[index] = structuredClone(lesson);
  const before = {}, saved = {}, refs = {words:new Map(), exercises:new Map()};
  for (const kind of ['words','exercises']) {
    before[kind] = new Map(active[kind].map(o => [o.id,o]));
    saved[kind] = new Map(draft[kind].map(o => [o.id,o]));
  }
  // Newly referenced IDs must not make old selector resolution throw before it
  // reveals removed tag members. Add only missing objects to this read-only probe;
  // replacements still use active values and never enter the release implicitly.
  const selectorBefore={...candidate};
  for(const kind of ['words','exercises'])selectorBefore[kind]=[...candidate[kind],...draft[kind].filter(o=>!before[kind].has(o.id))];
  const ref = (kind, id, path) => {
    if (!id) return;
    if (!refs[kind].has(id)) refs[kind].set(id, new Set());
    refs[kind].get(id).add(path);
  };
  const prerequisite = (object, path) => {
    for (const id of object.prerequisiteIds || []) {
      if(id===lesson.id)continue;
      const a = active.lessons.find(l => l.id === id), d = draft.lessons.find(l => l.id === id);
      if (!a || !same(a,d)) block('OTHER_LESSON_REQUIRED', path + '/prerequisiteIds', 'The referenced prerequisite is new or changed in the saved draft; it cannot be published incidentally.', id);
    }
  };
  const selectors = [];
  if (lesson.vocabularySelector) selectors.push({source:'words', selector:lesson.vocabularySelector, path:'lessons/'+lesson.id+'/vocabularySelector'});
  for (const b of lesson.blocks || []) if (['words','exercises'].includes(b.source)) selectors.push({source:b.source, selector:b.selector, path:'lessons/'+lesson.id+'/blocks/'+(b.id || b.type)+'/selector'});
  for (const id of lesson.wordIds) ref('words', id, 'lesson.wordIds');
  for (const id of [...lesson.exerciseIds, ...(lesson.checkExerciseIds || [])]) ref('exercises', id, 'lesson.exerciseIds');
  for (const target of lesson.draftTargets || []) ref('words', target.wordId, 'draftTargets/'+target.id);
  for (const b of lesson.blocks || []) for (const p of b.textPages?.pages || []) for (const id of p.wordIds || []) ref('words', id, 'pages/'+p.id+'/wordIds');
  prerequisite(lesson, 'lessons/'+lesson.id);

  // Resolve the saved selector and the selected lesson over the old collections.
  // The union catches removals as well as additions (including tag exclusions).
  for (const {source, selector, path} of selectors) {
    if (selector.lessonId && selector.lessonId !== lesson.id) {
      const a = active.lessons.find(l => l.id === selector.lessonId), d = draft.lessons.find(l => l.id === selector.lessonId);
      const field = source === 'words' ? 'wordIds' : 'exerciseIds';
      if (!a || !same(a[field], d?.[field])) block('OTHER_LESSON_REQUIRED', path, 'This selector needs another saved lesson membership change.', selector.lessonId);
    }
    for (const id of [...(selector.ids || []), ...(selector.includeIds || []), ...(selector.excludeIds || [])]) ref(source, id, path);
    for (const pack of [draft, selectorBefore]) {
      try { for (const item of resolveSelector(pack,source,selector,source==='exercises'?lesson.id:null,lesson.compositionVersion===2)) ref(source,item.id,path); }
      catch { /* Missing candidate dependencies are diagnosed after explicit inclusion. */ }
    }
  }
  for (const [id] of refs.exercises) {
    const exercise = saved.exercises.get(id);
    if (!exercise) { block('DEPENDENCY_REMOVAL_REQUIRED', 'exercises/'+id, 'Selector membership requires removal of a published exercise; deletion is outside this scope.', id); continue; }
    for (const wordId of [exercise.wordId, ...(exercise.wordIds || []), ...exerciseVocabularyReferenceIds(exercise)]) ref('words',wordId,'exercises/'+id);
    if (!candidate.lessons.some(l => l.id === exercise.lessonId)) block('OTHER_LESSON_REQUIRED', 'exercises/'+id+'/lessonId', 'This exercise belongs to a lesson that is not published.', exercise.lessonId);
    prerequisite(exercise, 'exercises/'+id);
  }
  for (const kind of ['words','exercises']) for (const [id, paths] of refs[kind]) {
    const a = before[kind].get(id), d = saved[kind].get(id);
    if (!d) { block('DEPENDENCY_REMOVAL_REQUIRED',kind+'/'+id,'A referenced published object is absent from the saved draft; deletion is outside this scope.',id); continue; }
    prerequisite(d,kind+'/'+id);
    if (!same(a,d)) required.set(kind+'/'+id,{kind,id,action:a?'changed':'added',reasonPaths:[...paths].sort()});
  }
  const included = new Set(scope.includeDependencies.map(keyFor));
  for (const entry of scope.includeDependencies) {
    const dependency = required.get(keyFor(entry));
    if (!dependency || dependency.action !== entry.action) invalid('Unknown, unrelated, unchanged or mismatched dependency selection: '+keyFor(entry));
  }
  // Replacements retain collection positions; additions append in saved order.
  for (const kind of ['words','exercises']) {
    candidate[kind] = candidate[kind].map(o => included.has(kind+'/'+o.id) ? structuredClone(saved[kind].get(o.id)) : o);
    for (const o of draft[kind]) if (included.has(kind+'/'+o.id) && !before[kind].has(o.id)) candidate[kind].push(structuredClone(o));
  }
  for (const dependency of required.values()) if (!included.has(keyFor(dependency))) block('DEPENDENCY_REQUIRED',dependency.kind+'/'+dependency.id,'Explicitly include this exact saved dependency and review its shared effects.',dependency.id);

  // Complete inclusion must reproduce the selected saved membership, including order.
  if ([...required.keys()].every(k => included.has(k))) {
    for (const {source,selector,path} of selectors) {
      try {
        const resolve = c => resolveSelector(c,source,selector,source==='exercises'?lesson.id:null,lesson.compositionVersion===2).map(o=>o.id);
        if (!same(resolve(draft),resolve(candidate))) block('SELECTOR_SCOPE_REQUIRED',path,'Saved selector membership/order cannot be reproduced without another lesson, deletion or collection reorder.');
      } catch { block('SELECTOR_SCOPE_REQUIRED',path,'The selector cannot resolve within this bounded publication.'); }
    }
    for (const l of candidate.lessons) {
      try { validateLessonComposition(candidate,l); }
      catch (error) { block(l.id===lesson.id?'LESSON_COMPOSITION_REQUIRED':'OTHER_LESSON_INDEX_REQUIRED','lessons/'+l.id,error.message,l.id); }
    }
  }
  if (!same(active.courseId,draft.courseId)) block('PACK_PUBLICATION_REQUIRED','courseId','The saved lesson belongs to a changed course identity.');
  if (!same(active.lexical,draft.lexical) || !same(active.curriculum,draft.curriculum)) {
    const lexicalView = c => c.lexical ? projectLexicalRows(c,lesson.id,{runtimeIds:new Set(c.lexical.words.map(w=>w.runtimeId))}) : null;
    try {
      if (!same(lexicalView(candidate),lexicalView(draft))) block('LEXICAL_PUBLICATION_REQUIRED','lexical','Saved lexical eligibility or representation for this lesson requires a pack or curriculum change.');
    } catch { block('LEXICAL_PUBLICATION_REQUIRED','lexical','Saved lexical references cannot be resolved in the published curriculum.'); }
  }
  return {candidate,blockers,requiredDependencies:[...required.values()].sort((a,b)=>keyFor(a).localeCompare(keyFor(b))),includedDependencies:scope.includeDependencies};
}

export const lessonReviewToken = value => 'lp1-' + contextHash({version:1,...value});

// Remaining-work summary must also work while a candidate has missing dependencies.
// Do not resolve invalid candidate selectors merely to explain unpublished changes.
export function remainingLessonChanges(base, draft) {
  const changes=[];
  for(const kind of ['words','lessons','exercises']) {
    const a=new Map(base[kind].map(o=>[o.id,o])),d=new Map(draft[kind].map(o=>[o.id,o]));
    const retained=base[kind].map(o=>o.id).filter(id=>d.has(id)),next=draft[kind].map(o=>o.id).filter(id=>a.has(id));
    const moved=new Set(retained.filter((id,i)=>next[i]!==id));
    for(const id of new Set([...a.keys(),...d.keys()])) if(!same(a.get(id),d.get(id))||moved.has(id)) changes.push({kind,id,action:!a.has(id)?'added':!d.has(id)?'removed':'changed',...(moved.has(id)?{reordered:true}:{})});
  }
  for(const field of [...new Set([...Object.keys(base),...Object.keys(draft)])].sort()) if(!['words','lessons','exercises'].includes(field)&&!same(base[field],draft[field])) changes.push({kind:'metadata',id:field,field,action:!Object.hasOwn(base,field)?'added':!Object.hasOwn(draft,field)?'removed':'changed'});
  return changes;
}

// Replace only the top-level numeric base token. The content substring, timestamp,
// unknown draft fields, whitespace and escaping all survive byte-for-byte.
export function rebaseDraftJSON(raw, expectedBase, nextBase) {
  let depth = 0;
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === '{' || raw[i] === '[') depth++;
    else if (raw[i] === '}' || raw[i] === ']') depth--;
    else if (raw[i] === '"') {
      const start = i++;
      for (; i < raw.length; i++) { if (raw[i] === '\\') i++; else if (raw[i] === '"') break; }
      if (depth !== 1 || JSON.parse(raw.slice(start,i+1)) !== 'baseRevisionId') continue;
      const match = /^\s*:\s*(\d+)/.exec(raw.slice(i+1));
      if (!match) continue;
      if (Number(match[1]) !== expectedBase) break;
      const end = i+1+match[0].length, begin = end-match[1].length;
      return raw.slice(0,begin)+nextBase+raw.slice(end);
    }
  }
  throw new DomainError('Saved draft base is malformed.',409,'STALE_BASE');
}
