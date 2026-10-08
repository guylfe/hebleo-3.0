import test from 'node:test';
import assert from 'node:assert/strict';
import {seed,upgradeDemo} from '../src/seed.js';
import {projectCurriculum,validateCurriculum,courseOutline,orderedLessons,resolveSelector,resolveComponent,deriveLessonIndices,projectLesson,lessonFlow,keyboardForLesson,introductionWarnings,validateLessonComposition} from '../public/course.js';
const fixture=()=>structuredClone(upgradeDemo(seed)||seed);
const v2=c=>{c.lessons=c.lessons.map(l=>projectLesson(c,l));return c;};
test('legacy chapter runs project without combining equal noncontiguous titles or writing source',()=>{
 const c=fixture();c.lessons[0].chapter='Same';c.lessons[1].chapter='Other';c.lessons[2].chapter='Same';const before=JSON.stringify(c);
 const projected=projectCurriculum(c);assert.equal(projected.chapters.length,3);assert.notEqual(projected.chapters[0].id,projected.chapters[2].id);
 c.curriculum=projected;validateCurriculum(c);assert.deepEqual(orderedLessons(c).map(l=>l.id),c.lessons.map(l=>l.id));delete c.curriculum;assert.equal(JSON.stringify(c),before);
});
test('optional chapters support mixed ungrouped children, empty chapters and independent storage order',()=>{
 const c=fixture(),[a,b,d]=c.lessons.map(l=>l.id);
 c.curriculum={version:1,chapters:[{id:'chapter-one',title:'One',lessonIds:[d,a]},{id:'chapter-empty',title:'Empty',lessonIds:[]}],order:[{lessonId:b},{chapterId:'chapter-empty'},{chapterId:'chapter-one'}]};
 validateCurriculum(c);assert.deepEqual(orderedLessons(c).map(l=>l.id),[b,d,a]);assert.equal(courseOutline(c)[1].lessons.length,0);
});
test('duplicate, missing and dangling placements fail; every lesson appears exactly once',()=>{
 for(const change of [c=>c.curriculum.order.push({lessonId:c.lessons[0].id}),c=>c.curriculum.chapters[0].lessonIds.pop(),c=>c.curriculum.order.push({chapterId:'missing'}),c=>c.curriculum.order[0].lessonId=c.lessons[0].id]) {
  const c=fixture();c.curriculum=projectCurriculum(c);change(c);assert.throws(()=>validateCurriculum(c));
 }
});
test('projection preserves source fields and existing identities without mutating a snapshot',()=>{
 const c=fixture(),l=c.lessons[0];l.blocks[0].opaque={source:'kept'};const before=JSON.stringify(c),projected=projectLesson(c,l);
 assert.equal(projected.compositionVersion,2);assert.equal(projected.blocks.find(b=>b.id==='legacy-explanation').opaque.source,'kept');
 assert.equal(projected.blocks.find(b=>b.id==='legacy-explanation').text,l.explanation);assert.equal(projected.id,l.id);assert.equal(JSON.stringify(c),before);
 validateLessonComposition(c,projected);
});
test('two authored texts have independent IDs, exact text, stable reorder and instance flow',()=>{
 const c=v2(fixture()),l=c.lessons[0],first=l.blocks.find(b=>b.type==='explanation');
 const second={...structuredClone(first),id:'block-second',text:c.lessons[1].explanation};l.blocks.push(second);
 validateLessonComposition(c,l);assert.notEqual(resolveComponent(c,l,first),resolveComponent(c,l,second));
 assert.equal(lessonFlow(c,l).filter(s=>s.kind==='learn').length,2);l.blocks.reverse();
 assert.equal(lessonFlow(c,l)[0].key,'block-second');assert.equal(lessonFlow(c,l).at(-1).kind,'complete');
});
test('repeated exercise presentation earns a unique required index and check subset',()=>{
 const c=v2(fixture()),l=c.lessons[0],block=l.blocks.find(b=>b.type==='exercise-set');
 l.blocks.push({...structuredClone(block),id:'block-repeat'});const derived=deriveLessonIndices(c,l);
 assert.equal(new Set(derived.exerciseIds).size,derived.exerciseIds.length);assert.deepEqual(derived.exerciseIds,l.exerciseIds);validateLessonComposition(c,derived);
});
test('ID and tag selectors preserve source order, any/all and explicit include/exclude order',()=>{
 const c=fixture(),[a,b,d]=c.words;a.tags=['qa','one'];b.tags=['qa'];d.tags=['one'];
 assert.deepEqual(resolveSelector(c,'words',{mode:'ids',ids:[d.id,a.id]}).map(w=>w.id),[d.id,a.id]);
 assert.deepEqual(resolveSelector(c,'words',{mode:'tags',tags:['qa','one'],match:'all'}).map(w=>w.id),[a.id]);
 assert.deepEqual(resolveSelector(c,'words',{mode:'tags',tags:['qa'],match:'any',includeIds:[d.id],excludeIds:[a.id]}).map(w=>w.id),[b.id,d.id]);
 assert.throws(()=>resolveSelector(c,'words',{mode:'tags',tags:['qa'],match:'any',includeIds:[a.id],excludeIds:[a.id]}));
 assert.throws(()=>resolveSelector(c,'words',{mode:'ids',ids:[a.id,a.id]}));
});
test('foreign exercises and stale derived indices fail rather than silently changing reviewed content',()=>{
 const c=v2(fixture()),l=c.lessons[0],foreign=c.lessons[1].exerciseIds[0];
 assert.throws(()=>resolveSelector(c,'exercises',{mode:'ids',ids:[foreign]},l.id));
 l.exerciseIds.reverse();assert.throws(()=>validateLessonComposition(c,l),/stale/);
});
test('cumulative keyboard uses the exact authored course order and highlights only current introductions',()=>{
 const c=v2(fixture()),[a,b,d]=c.lessons;a.introducedLetters='אב';b.introducedLetters='בג';d.introducedLetters='';
 let k=keyboardForLesson(c,b.id);assert.equal(k.knownKeys,'אב');assert.equal(k.newKeys,'ג');assert.equal(k.availableKeys,'אבג');assert.match(introductionWarnings(c).join(' '),/already introduced/);
 c.curriculum={version:1,chapters:[],order:[{lessonId:b.id},{lessonId:a.id},{lessonId:d.id}]};validateCurriculum(c);
 k=keyboardForLesson(c,a.id);assert.equal(k.knownKeys,'בג');assert.equal(k.newKeys,'א');
});
test('explicit legacy new letters accumulate without rewriting authored keyboards; missing evidence is reported',()=>{
 const c=fixture(),legacy=c.lessons[0];delete legacy.introducedLetters;
 const before=JSON.stringify(c);assert.deepEqual(keyboardForLesson(c,legacy.id),{...legacy.keyboard,availableKeys:legacy.keyboard.newKeys,missingIntroductionLessonIds:[]});
 assert.equal(JSON.stringify(c),before);delete c.lessons[1].introducedLetters;assert.equal(keyboardForLesson(c,c.lessons[1].id).knownKeys,legacy.keyboard.newKeys);
 const current=projectLesson(c,c.lessons[1]);current.introducedLetters='ת';c.lessons[1]=current;delete legacy.keyboard;
 assert.deepEqual(keyboardForLesson(c,current.id).missingIntroductionLessonIds,[legacy.id]);assert.match(introductionWarnings(c)[0],/missing/);
});
test('letter validation allows explicit empty introductions and rejects marks, punctuation and duplicates',()=>{
 const c=v2(fixture()),l=c.lessons[0];l.introducedLetters='';validateLessonComposition(c,l);
 for(const bad of ['אא','אָ','א,ב']){l.introducedLetters=bad;assert.throws(()=>validateLessonComposition(c,l));}
});
test('component bounds and duplicate IDs are enforced without restricting repeated kinds',()=>{
 const c=v2(fixture()),l=c.lessons[0];l.blocks.push({...structuredClone(l.blocks[0])});assert.throws(()=>validateLessonComposition(c,l),/IDs/);
 l.blocks.pop();for(let i=l.blocks.length;i<101;i++)l.blocks.push({...structuredClone(l.blocks[0]),id:'block-'+i});assert.throws(()=>validateLessonComposition(c,l),/100/);
});
