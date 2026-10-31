import {validateTextPages} from './text-contract.js';
// Pure snapshot-based course contracts shared by Studio, learner and Store.
// Projections return new objects. They never rewrite historical releases.
const copy = value => structuredClone(value);
const unique = values => [...new Set(values)];
const fail = message => { throw new Error(message); };
const validID = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(value) && !['constructor','prototype','__proto__'].includes(value);
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const assertIDs = (ids, registry, label) => {
  if (!Array.isArray(ids) || unique(ids).length !== ids.length || ids.some(id => !registry.has(id))) fail('Invalid '+label+' references.');
};
function legacyChapterID(firstLessonId) {
  // Source identity rather than chapter title: renames and noncontiguous equal titles cannot merge runs.
  // Long IDs use a deterministic suffix; projection checks collisions before returning.
  let hash = 2166136261;
  for (const c of firstLessonId) hash = Math.imul(hash ^ c.charCodeAt(0),16777619) >>> 0;
  return 'legacy-ch-' + firstLessonId.slice(0,72) + '-' + hash.toString(16).padStart(8,'0');
}
export function projectCurriculum(content) {
  if (content.curriculum) return copy(content.curriculum);
  const chapters = [], order = [];
  let current = null;
  for (const lesson of content.lessons) {
    if (!lesson.chapter?.trim()) {order.push({lessonId:lesson.id}); current = null; continue;}
    if (!current || current.title !== lesson.chapter) {
      current = {id:legacyChapterID(lesson.id),title:lesson.chapter,lessonIds:[]};
      if (chapters.some(ch => ch.id === current.id)) fail('Legacy chapter projection collision.');
      chapters.push(current); order.push({chapterId:current.id});
    }
    current.lessonIds.push(lesson.id);
  }
  return {version:1,chapters,order};
}
export function validateCurriculum(content) {
  const c = content.curriculum; if (!c) return;
  if (c.version !== 1 || !Array.isArray(c.chapters) || !Array.isArray(c.order) || c.chapters.length > 2000 || c.order.length > 4000) fail('Invalid curriculum.');
  const lessons = new Set(content.lessons.map(l=>l.id)), chapters = new Set(), placements = new Set(), usedChapters = new Set();
  const place = id => {if (!lessons.has(id) || placements.has(id)) fail('Missing or duplicate curriculum lesson: '+id); placements.add(id);};
  for (const ch of c.chapters) {
    if (!validID(ch.id) || chapters.has(ch.id) || typeof ch.title !== 'string' || !ch.title.trim() || ch.title.length > 4000 || !Array.isArray(ch.lessonIds)) fail('Invalid chapter.');
    chapters.add(ch.id); ch.lessonIds.forEach(place);
  }
  for (const entry of c.order) {
    if (!entry || typeof entry !== 'object' || Number('chapterId' in entry)+Number('lessonId' in entry) !== 1) fail('Curriculum order entries need exactly one reference.');
    if ('chapterId' in entry) {if (!chapters.has(entry.chapterId) || usedChapters.has(entry.chapterId)) fail('Missing or duplicate chapter placement.'); usedChapters.add(entry.chapterId);}
    else place(entry.lessonId);
  }
  if (placements.size !== lessons.size || usedChapters.size !== chapters.size) fail('Every lesson and chapter needs exactly one placement.');
}
export function courseOutline(content) {
  const c = content.curriculum || projectCurriculum(content);
  return c.order.map(entry => entry.chapterId
    ? (()=>{const ch=c.chapters.find(ch=>ch.id===entry.chapterId); if(!ch)fail('Missing chapter.'); return {kind:'chapter',id:ch.id,title:ch.title,lessons:ch.lessonIds.map(id=>content.lessons.find(l=>l.id===id))};})()
    : {kind:'lesson',lesson:content.lessons.find(l=>l.id===entry.lessonId)});
}
export function orderedLessons(content) {
  return content.curriculum ? courseOutline(content).flatMap(entry=>entry.kind==='chapter'?entry.lessons:[entry.lesson]) : [...content.lessons];
}
export function resolveSelector(content, source, selector, ownerLessonId = null, allowSharedIDs = false) {
  if (!['words','exercises'].includes(source)) fail('Unsupported component source.');
  const collection = content[source], registry = new Map(collection.map(item=>[item.id,item]));
  const mode = selector?.mode || (selector?.lessonId ? 'lesson' : null);
  let ids;
  if (mode === 'ids') {
    if ('tags' in selector || 'lessonId' in selector) fail('Selector modes cannot be combined.');
    assertIDs(selector.ids,registry,'selector'); ids=[...selector.ids];
  } else if (mode === 'lesson') {
    if ('ids' in selector || 'tags' in selector) fail('Selector modes cannot be combined.');
    const target=content.lessons.find(l=>l.id===selector.lessonId); if(!target)fail('Missing selector lesson.');
    ids=[...(source==='words'?target.wordIds:target.exerciseIds)];
    if(target.compositionVersion===2)assertIDs(ids,registry,'lesson selector');
    else if(ids.some(id=>!registry.has(id)))fail('Invalid lesson selector references.');
  } else if (mode === 'tags') {
    if ('ids' in selector || 'lessonId' in selector || !Array.isArray(selector.tags) || !selector.tags.length || unique(selector.tags).length!==selector.tags.length || selector.tags.some(tag=>typeof tag!=='string'||!tag.trim()) || !['any','all'].includes(selector.match)) fail('Invalid tag selector.');
    const include=selector.includeIds||[],exclude=selector.excludeIds||[];
    assertIDs(include,registry,'included'); assertIDs(exclude,registry,'excluded');
    if(source==='exercises'&&ownerLessonId&&[...include,...exclude].some(id=>registry.get(id)?.lessonId!==ownerLessonId))fail('Exercise selector references must belong to their lesson.');
    if(include.some(id=>exclude.includes(id)))fail('Selector includes and exclusions overlap.');
    ids=collection.filter(item=>(source!=='exercises'||!ownerLessonId||item.lessonId===ownerLessonId) && selector.tags[selector.match==='all'?'every':'some'](tag=>Array.isArray(item.tags)&&item.tags.includes(tag))).map(item=>item.id);
    ids=unique([...ids,...include]).filter(id=>!exclude.includes(id));
  } else fail('Missing selector mode.');
  if (source==='exercises' && ownerLessonId && !(allowSharedIDs && mode==='ids') && ids.some(id=>registry.get(id)?.lessonId!==ownerLessonId)) fail('Exercise components must belong to their lesson.');
  return ids.map(id=>registry.get(id));
}
export function resolveComponent(content, lesson, block) {
  if (block.type==='explanation') return lesson.compositionVersion===2 ? block.text || '' : lesson.explanation;
  return resolveSelector(content,block.source,block.selector,block.source==='exercises'?lesson.id:null,lesson.compositionVersion===2);
}
export function deriveLessonIndices(content, lesson) {
  const next=copy(lesson);
  if(next.vocabularySelector) next.wordIds=resolveSelector(content,'words',next.vocabularySelector).map(w=>w.id);
  if(next.compositionVersion===2) {
    const snapshot={...content,lessons:content.lessons.map(l=>l.id===next.id?next:l)};
    next.exerciseIds=unique(next.blocks.filter(b=>b.type==='exercise-set').flatMap(b=>resolveComponent(snapshot,next,b).map(e=>e.id)));
    next.checkExerciseIds=unique(next.blocks.filter(b=>b.type==='exercise-set'&&b.role==='check').flatMap(b=>resolveComponent(snapshot,next,b).map(e=>e.id)));
  }
  return next;
}
export function projectLesson(content, lesson) {
  if(lesson.compositionVersion===2)return copy(lesson);
  const next=copy(lesson),blocks=[];
  for(const block of lesson.blocks) {
    if(block.type==='explanation') {
      blocks.push({...copy(block),id:'legacy-explanation',source:'inline',text:lesson.explanation||'',...(lesson.video?{video:copy(lesson.video)}:{}),...(lesson.interactions?{interactions:copy(lesson.interactions)}:{}),options:{...block.options,textDirection:lesson.textDirection||'auto'}});
      if(lesson.checkExerciseIds?.length)blocks.push({id:'legacy-check',type:'exercise-set',source:'exercises',renderer:'practice',role:'check',selector:{mode:'ids',ids:[...lesson.checkExerciseIds]}});
    } else if(block.type==='vocabulary') blocks.push({...copy(block),id:'legacy-vocabulary',selector:{...copy(block.selector),mode:block.selector.mode||'lesson'}});
    else {
      const ids=lesson.exerciseIds.filter(id=>!lesson.checkExerciseIds?.includes(id));
      if(ids.length)blocks.push({...copy(block),id:'legacy-apply',role:'apply',selector:{mode:'ids',ids}});
    }
  }
  next.compositionVersion=2;next.blocks=blocks;
  if(lesson.introducedLetters!==undefined) next.introducedLetters=lesson.introducedLetters;
  else if(typeof lesson.keyboard?.newKeys==='string')next.introducedLetters=lesson.keyboard.newKeys;
  return deriveLessonIndices(content,next);
}
export function lessonFlow(content, lesson) {
  const projected=projectLesson(content,lesson);
  return projected.blocks.map(block=>({key:block.id,blockId:block.id,kind:block.type==='explanation'?'learn':block.type==='vocabulary'?'vocabulary':block.role==='check'?'check':'apply',exerciseIds:block.type==='exercise-set'?resolveComponent(content,projected,block).map(e=>e.id):[]})).concat({key:'complete',blockId:null,kind:'complete',exerciseIds:[]});
}
export function introductionWarnings(content) {
  const seen=new Set(),warnings=[];
  for(const lesson of orderedLessons(content)) {
    const letters=lesson.introducedLetters ?? lesson.keyboard?.newKeys;
    if(typeof letters!=='string'){warnings.push(lesson.id+': explicit introduced letters are missing.');continue;}
    for(const letter of letters){if(seen.has(letter))warnings.push(lesson.id+': letter '+letter+' was already introduced.');seen.add(letter);}
  }
  return warnings;
}
export function keyboardForLesson(content, lessonId) {
  const lessons=orderedLessons(content),index=lessons.findIndex(l=>l.id===lessonId),lesson=lessons[index];
  if(!lesson)fail('Keyboard lesson not found.');
  if(lesson.introducedLetters===undefined&&typeof lesson.keyboard?.newKeys!=='string') return {...copy(lesson.keyboard||{knownKeys:lesson.letters||'',newKeys:''}),legacy:true};
  const prior=unique(lessons.slice(0,index).flatMap(l=>[...(l.introducedLetters??l.keyboard?.newKeys??'')]));
  const introduced=[...(lesson.introducedLetters??lesson.keyboard.newKeys)],newKeys=introduced.filter(key=>!prior.includes(key)).join('');
  return {...lesson.keyboard,knownKeys:prior.join(''),newKeys,availableKeys:unique([...prior,...introduced]).join(''),missingIntroductionLessonIds:lessons.slice(0,index).filter(l=>l.introducedLetters===undefined&&typeof l.keyboard?.newKeys!=='string').map(l=>l.id)};
}
export function validateLessonComposition(content,lesson) {
  if(lesson.extraInformation!==undefined&&(typeof lesson.extraInformation!=='string'||lesson.extraInformation.length>100000))fail('Invalid authored extra information.');
  if(lesson.introducedLetters!==undefined && (typeof lesson.introducedLetters!=='string'||!/^[א-ת]*$/.test(lesson.introducedLetters)||unique([...lesson.introducedLetters]).length!==[...lesson.introducedLetters].length))fail('Introduced letters need unique Hebrew base letters.');
  if(lesson.compositionVersion!==undefined&&lesson.compositionVersion!==2)fail('Unsupported composition version.');
  if(lesson.vocabularySelector) {
    if(!['ids','tags'].includes(lesson.vocabularySelector.mode))fail('Lesson vocabulary selector needs IDs or tags.');
    if(!same(resolveSelector(content,'words',lesson.vocabularySelector).map(w=>w.id),lesson.wordIds))fail('Lesson vocabulary index is stale.');
  }
  if(lesson.compositionVersion!==2)return;
  if(typeof lesson.introducedLetters!=='string')fail('Edited lessons need explicit introduced letters, including an intentional empty string.');
  if(!Array.isArray(lesson.blocks)||!lesson.blocks.length||lesson.blocks.length>100)fail('Lessons need 1–100 component instances.');
  const ids=new Set();
  for(const block of lesson.blocks) {
    if(!block||!validID(block.id)||ids.has(block.id)||block.id==='complete')fail('Component IDs must be unique and stable.');
    ids.add(block.id);
    if(block.type==='explanation') {
      if(block.source!=='inline'||block.renderer!=='text'||typeof block.text!=='string'||block.text.length>100000||(!block.text.trim()&&!block.video&&!block.textPages?.pages?.length))fail('Text components need inline authored text, pages or video.');
      if(block.textPages!==undefined)validateTextPages(block.textPages,{wordIds:content.words.map(w=>w.id),targetIds:(lesson.draftTargets||[]).map(t=>t.id)});
      if(block.options?.textDirection&&!['auto','ltr','rtl'].includes(block.options.textDirection))fail('Invalid component text direction.');
      if(block.options?.extraInformation!==undefined&&(typeof block.options.extraInformation!=='string'||block.options.extraInformation.length>100000))fail('Invalid authored extra information.');
    } else if(['vocabulary','exercise-set'].includes(block.type)) {
      if(block.source!==(block.type==='vocabulary'?'words':'exercises')||block.renderer!==(block.type==='vocabulary'?'vocabulary-table':'practice'))fail('Invalid component source or renderer.');
      if(block.options?.showNotes!==undefined&&typeof block.options.showNotes!=='boolean')fail('Invalid component options.');
      if(block.type==='exercise-set' && (!['check','apply'].includes(block.role)||block.selector?.mode==='lesson'||!resolveComponent(content,lesson,block).length))fail('Exercise components need owned questions and check/apply role.');
      if(!['ids','tags','lesson'].includes(block.selector?.mode))fail('Component selector mode must be explicit.');
      resolveComponent(content,lesson,block);
    } else fail('Unsupported component type.');
  }
  const derived=deriveLessonIndices(content,lesson);
  if(!same(derived.exerciseIds,lesson.exerciseIds)||!same(derived.checkExerciseIds,lesson.checkExerciseIds||[]))fail('Lesson exercise indices are stale.');
}

// Canonical exercises may have explicit placements in several v2 lessons.
export function exerciseInLesson(content, lessonId, exerciseId) {
 const lesson=content.lessons.find(l=>l.id===lessonId),exercise=content.exercises.find(e=>e.id===exerciseId);
 if(!lesson||!exercise)return false;
 return lesson.compositionVersion===2
  ? lesson.blocks.some(b=>b.type==='exercise-set'&&resolveComponent(content,lesson,b).some(e=>e.id===exerciseId))
  : exercise.lessonId===lessonId&&lesson.exerciseIds.includes(exerciseId);
}
