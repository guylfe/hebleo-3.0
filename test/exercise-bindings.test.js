import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Store, validateContent} from '../src/store.js';
import {exerciseVocabularySurfaces, validateExerciseVocabularyBindings, exerciseVocabularyReferenceIds,
  projectExerciseVocabularyBindings, exerciseGraphemeBoundaries, withAnswerVocabularyBindings} from '../public/exercise-bindings.js';
import {projectExerciseVocabulary} from '../src/exercise-vocabulary.js';
import {projectLesson, projectCurriculum, deriveLessonIndices} from '../public/course.js';
import {lexicalFixture} from '../scripts/lexical-fixture.mjs';
import {lexicalApprovalDigest} from '../src/lexical-trust.js';

// Every test uses synthetic content and in-memory SQLite, never owner data or runtime.
const tables = s => JSON.stringify(s.db.prepare("SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name").all()
  .map(({name}) => [name, s.db.prepare('SELECT * FROM "'+name+'" ORDER BY 1').all()]));
function setup(t) { const s = new Store(); t.after(() => s.close()); return s; }
const stage = (s, content) => s.stage({baseRevisionId:s.get('active'), expectedDraftToken:s.currentDraft()?.draftToken ?? null, content});
const publish = (s, content) => { const draft = stage(s,content); return s.publish(s.get('active'),draft.draftToken).revisionId; };
function binding(e, field, {index, start=0, end, wordId='binding-only-word', id='occurrence-1'}={}) {
  const sourceText = index === undefined ? e[field] : e[field][index];
  end ??= sourceText.length;
  return {id,wordId,field,...(index===undefined?{}:{index}),start,end,text:sourceText.slice(start,end),sourceText};
}
function candidate(s, type='cloze', fields=['prompt']) {
  const c = s.snapshot(), e = c.exercises.find(e => e.type === type);
  c.words.push({...structuredClone(c.words[0]),id:'binding-only-word',english:'SYNTHETIC binding only',notes:'SYNTHETIC original note'});
  e.vocabularyBindings = fields.map((field,i) => binding(e,field,{id:'occurrence-'+i,...(['answers','tokens'].includes(field)?{index:0}:{})}));
  return {c,e};
}

test('all six families enumerate only authored supported surfaces and remain optional', t => {
  const s=setup(t);
  for (const type of ['recognition','typing','matching','ordering','cloze','transformation']) {
    const {c,e}=candidate(s,type);
    e.context='SYNTHETIC context'; e.feedback='SYNTHETIC feedback'; e.feedbackDetails='SYNTHETIC detail';
    if(type==='typing') e.answers=['SYNTHETIC accepted'];
    const surfaces=exerciseVocabularySurfaces(e);
    assert.deepEqual(surfaces.slice(0,4).map(x=>x.field),['prompt','context','feedback','feedbackDetails']);
    assert.equal(surfaces.some(x=>x.field==='tokens'),type==='ordering');
    assert.equal(surfaces.some(x=>x.field==='answers'),['typing','ordering','cloze','transformation'].includes(type));
    e.vocabularyBindings=surfaces.map((surface,i)=>binding(e,surface.field,{index:surface.index,id:'occurrence-'+i}));
    const before=JSON.stringify(c); assert.equal(validateContent(c),c); assert.equal(JSON.stringify(c),before);
    assert.ok(exerciseVocabularyReferenceIds(e,c.words).includes('binding-only-word'));
    assert.equal(s.publicContent(c,e.lessonId).exerciseVocabulary.byWordId['binding-only-word'].kind,'legacy');
    delete e.vocabularyBindings; assert.deepEqual(validateExerciseVocabularyBindings(e,c.words),[]);
    assert.equal(exerciseVocabularyReferenceIds(e,c.words).includes('binding-only-word'),false);
  }
});

test('exact UTF-16 spans include whole pointed graphemes, bidi text and emoji without normalization',t=>{
  const s=setup(t),{c,e}=candidate(s);e.prompt='שָׁ \u200f👩‍🏫 e\u0301';
  const cuts=[...exerciseGraphemeBoundaries(e.prompt)];
  e.vocabularyBindings=[binding(e,'prompt',{start:0,end:3}),binding(e,'prompt',{id:'emoji',start:5,end:10}),binding(e,'prompt',{id:'accent',start:11,end:13})];
  assert.ok(cuts.includes(3)&&cuts.includes(5)&&cuts.includes(10)&&cuts.includes(13));
  assert.equal(validateContent(c),c);
  const original=JSON.stringify(c);validateExerciseVocabularyBindings(e,c.words);assert.equal(JSON.stringify(c),original);
  for (const [start,end] of [[0,1],[1,3],[5,6],[5,7],[7,10],[11,12]]) {
    const bad=structuredClone(e);bad.vocabularyBindings=[binding(e,'prompt',{start,end})];
    assert.throws(()=>validateExerciseVocabularyBindings(bad,c.words),/grapheme/);
  }
  const normalized=structuredClone(e);normalized.vocabularyBindings[0].sourceText=e.prompt.normalize('NFC');
  assert.throws(()=>validateExerciseVocabularyBindings(normalized,c.words),/sourceText/);
});

test('stale text/index, duplicate IDs, overlaps, missing targets and unsupported surfaces reject Stage atomically',t=>{
  const s=setup(t),{c,e}=candidate(s),before=tables(s);
  const cases=[
    x=>{x.prompt+=' changed';},
    x=>{x.vocabularyBindings[0].text+=' changed';},
    x=>{x.vocabularyBindings[0].sourceText=x.prompt.normalize('NFD')+' ';},
    x=>{x.vocabularyBindings[0].index=0;},
    x=>{x.vocabularyBindings[0].start=-1;},
    x=>{x.vocabularyBindings[0].end=999999;},
    x=>{x.vocabularyBindings[0].end=0;},
    x=>{x.vocabularyBindings[0].start=0.5;},
    x=>{x.vocabularyBindings[0].field='answer';},
    x=>{x.vocabularyBindings[0].field='choices';},
    x=>{x.vocabularyBindings[0].field=['prompt'];},
    x=>{x.vocabularyBindings[0].wordId='missing-word';},
    x=>{x.vocabularyBindings[0].wordId='constructor';},
    x=>{x.vocabularyBindings[0].html='<b>unsupported</b>';},
    x=>{x.vocabularyBindings.push({...x.vocabularyBindings[0]});},
    x=>{x.vocabularyBindings.push({...x.vocabularyBindings[0],id:'overlap'});},
    x=>{x.vocabularyBindings=null;},
    x=>{x.vocabularyBindings=Array(501).fill(x.vocabularyBindings[0]);}
  ];
  for (const mutate of cases) {
    const bad=structuredClone(c),item=bad.exercises.find(x=>x.id===e.id);mutate(item);
    assert.throws(()=>stage(s,bad),/vocabularyBindings/);
    assert.equal(tables(s),before);
    assert.equal(exerciseVocabularyReferenceIds(item,bad.words).includes('binding-only-word'),false);
  }
  const duplicate=[...c.words,c.words.find(w=>w.id==='binding-only-word')];
  assert.throws(()=>validateExerciseVocabularyBindings(e,duplicate),/exactly one/);
  const wrong=structuredClone(e);wrong.type='recognition';wrong.answers=['private'];
  wrong.vocabularyBindings=[binding(wrong,'answers',{index:0})];
  assert.throws(()=>validateExerciseVocabularyBindings(wrong,c.words),/unsupported/);
});

test('array row swaps fail closed; adjacent occurrences and repeated IDs for one word are legitimate',t=>{
  const s=setup(t),{c,e}=candidate(s,'ordering');e.tokens=['SYNTHETIC left','SYNTHETIC right'];
  e.vocabularyBindings=[binding(e,'tokens',{index:0}),binding(e,'tokens',{index:1,id:'repeat'})];
  validateExerciseVocabularyBindings(e,c.words);
  const swapped=structuredClone(e);swapped.tokens.reverse();
  assert.throws(()=>validateExerciseVocabularyBindings(swapped,c.words),/sourceText/);
  for (const index of [undefined,null,-1,0.1,2,'0']) {
    const bad=structuredClone(e);bad.vocabularyBindings[0].index=index;
    assert.throws(()=>validateExerciseVocabularyBindings(bad,c.words));
  }
  e.prompt='one two';e.vocabularyBindings=[binding(e,'prompt',{end:3}),binding(e,'prompt',{id:'next',start:3})];
  validateExerciseVocabularyBindings(e,c.words);
  assert.deepEqual(exerciseVocabularyReferenceIds(e,c.words),['binding-only-word']);
});

test('public exercises withhold answer binding bytes; prepared duplicate/prefix token indices keep exact identity',t=>{
  const s=setup(t),{c,e}=candidate(s,'ordering');e.tokens=['SYNTHETIC-A','SYNTHETIC-A','SYNTHETIC-B'];e.answers=['SYNTHETIC private answer'];
  e.prefixTokenIndices=[1];
  e.vocabularyBindings=e.tokens.map((_,index)=>binding(e,'tokens',{index,id:'tile-'+index}));
  e.vocabularyBindings.push(binding(e,'answers',{index:0,id:'answer-private'}));
  validateContent(c);
  const projected=s.publicExercise(e,c);
  assert.equal(projected.answers,undefined);
  assert.equal(JSON.stringify(projected).includes('SYNTHETIC private answer'),false);
  assert.deepEqual(projected.vocabularyBindings.map(b=>b.index),[1,3,5]);
  assert.deepEqual(projected.prefixTokenIndices,[3]);
  for(const b of projected.vocabularyBindings)assert.equal(projected.tokens[b.index],b.sourceText);
  validateExerciseVocabularyBindings(projected,c.words);
  assert.deepEqual(projectExerciseVocabularyBindings(e,{tokenIndexMap:[]}),[]);
  assert.equal(s.snapshot().exercises.find(x=>x.id===e.id).vocabularyBindings,undefined);
});

test('answer bindings are response-only after grading and preserve incorrect raw submissions in all answer families',t=>{
  for (const type of ['typing','ordering','cloze','transformation']) {
    const s=setup(t);
    const {c,e}=candidate(s,type);if(type==='typing')e.answers=['SYNTHETIC expected','SYNTHETIC alternative'];
    e.vocabularyBindings=e.answers.map((_,index)=>binding(e,'answers',{index,id:'accepted-'+index}));
    const staged=stage(s,c),before=tables(s),raw='\u200fSYNTHETIC wrong e\u0301  ';
    const preview=s.previewEvaluate({lessonId:e.lessonId,exerciseId:e.id,draftToken:staged.draftToken,answer:raw});
    assert.equal(preview.result.correct,false);assert.equal(preview.result.answer,raw);
    assert.deepEqual(preview.result.vocabularyBindings,e.vocabularyBindings);assert.equal(tables(s),before);
    const revisionId=s.publish(s.get('active'),staged.draftToken).revisionId;
    const input={lessonId:e.lessonId,exerciseId:e.id,revisionId,requestId:'answer-'+type,answer:raw};
    const result=s.attempt('learner-demo',input);
    assert.deepEqual(result.vocabularyBindings,e.vocabularyBindings);assert.equal(result.answer,raw);
    assert.equal(s.learner('learner-demo').attempts.at(-1).vocabularyBindings,undefined);
    const graded=tables(s),replay=s.attempt('learner-demo',input);
    assert.equal(replay.duplicate,true);assert.deepEqual(replay.vocabularyBindings,e.vocabularyBindings);assert.equal(tables(s),graded);
  }
});

test('binding-only word edits affect owning and reused composition lessons, and references survive import/publish/rollback',t=>{
  const s=setup(t),{c,e}=candidate(s);
  c.lessons=c.lessons.map(l=>projectLesson(c,l));c.curriculum=projectCurriculum(c);
  const shared=c.lessons.find(l=>l.id!==e.lessonId);
  shared.blocks.push({id:'synthetic-reuse',type:'exercise-set',role:'apply',source:'exercises',selector:{mode:'ids',ids:[e.id]},renderer:'practice',options:{}});
  Object.assign(shared,deriveLessonIndices(c,shared));
  const revisionId=publish(s,c),deps=s.dependencies('binding-only-word');
  assert.deepEqual(deps.exercises,[e.id]);assert.ok(deps.lessons.includes(e.lessonId)&&deps.lessons.includes(shared.id));
  const newer=s.snapshot();newer.words.find(w=>w.id==='binding-only-word').notes='SYNTHETIC updated note';
  stage(s,newer);
  const view=s.preview();assert.ok(view.affectedLessons.includes(e.lessonId)&&view.affectedLessons.includes(shared.id));
  const impact=view.changes.find(x=>x.id==='binding-only-word').impact;
  assert.deepEqual(impact.exercises,[e.id]);assert.ok(impact.lessons.includes(shared.id));
  const draftToken=s.currentDraft().draftToken;
  assert.equal(s.previewSession({lessonId:shared.id,draftToken}).content.exerciseVocabulary.byWordId['binding-only-word'].word.notes,'SYNTHETIC updated note');
  s.publish(s.get('active'),draftToken);
  assert.equal(s.session('learner-demo',shared.id).content.exerciseVocabulary.byWordId['binding-only-word'].word.notes,'SYNTHETIC updated note');
  s.rollback(revisionId,s.get('active'),null);
  assert.deepEqual(s.snapshot().exercises.find(x=>x.id===e.id).vocabularyBindings,e.vocabularyBindings);
  assert.equal(s.snapshot().words.find(w=>w.id==='binding-only-word').notes,'SYNTHETIC original note');
  const removed=s.snapshot();removed.words=removed.words.filter(w=>w.id!=='binding-only-word');
  const before=tables(s);assert.throws(()=>stage(s,removed),/runtime ID/);assert.equal(tables(s),before);
});

test('saved feedback/resume stays pinned through newer bindings, backup/restore, and rollback without view writes',t=>{
  const s=setup(t),{c,e}=candidate(s,'typing');e.answers=['SYNTHETIC expected'];e.vocabularyBindings=[binding(e,'answers',{index:0})];
  const revisionId=publish(s,c),raw='\u200fSYNTHETIC wrong';
  const attempt=s.attempt('learner-demo',{revisionId,lessonId:e.lessonId,exerciseId:e.id,requestId:'pinned-answer',answer:raw});
  const lesson=c.lessons.find(l=>l.id===e.lessonId),step=lesson.checkExerciseIds?.includes(e.id)?'check':'apply';
  const ids=step==='check'?lesson.checkExerciseIds:lesson.exerciseIds.filter(id=>!lesson.checkExerciseIds?.includes(id));
  s.saveProgress('learner-demo',{revisionId,lessonId:e.lessonId,step,question:ids.indexOf(e.id),answer:raw,selectedTokens:[],matching:{},resultRequestId:attempt.requestId});
  const newer=s.snapshot();newer.exercises.find(x=>x.id===e.id).answers=['SYNTHETIC newer'];
  const changed=newer.exercises.find(x=>x.id===e.id);changed.vocabularyBindings=[binding(changed,'answers',{index:0})];
  newer.words.find(w=>w.id==='binding-only-word').notes='SYNTHETIC latest note';publish(s,newer);
  const before=tables(s),session=s.session('learner-demo',e.lessonId);
  assert.equal(session.revisionId,revisionId);assert.equal(session.result.answer,raw);
  assert.deepEqual(session.result.vocabularyBindings,e.vocabularyBindings);
  assert.equal(session.content.exerciseVocabulary.byWordId['binding-only-word'].word.notes,'SYNTHETIC original note');
  assert.equal(tables(s),before);
  const backup=s.backup(),target=setup(t),restored=target.restore(backup);
  const after=tables(target),restoredSession=target.session('learner-demo',e.lessonId);
  assert.equal(restoredSession.revisionId,restored.revisions[revisionId]);
  assert.deepEqual(restoredSession.result.vocabularyBindings,e.vocabularyBindings);assert.equal(restoredSession.result.answer,raw);
  assert.equal(tables(target),after);
  const invalid=structuredClone(backup);invalid.content.exercises.find(x=>x.id===e.id).vocabularyBindings[0].sourceText='STALE';
  assert.throws(()=>target.restore(invalid),/vocabularyBindings/);assert.equal(tables(target),after);
  const historical=structuredClone(backup),pin=historical.revisionSnapshots.find(r=>r.revisionId===revisionId);
  pin.content.exercises.find(x=>x.id===e.id).vocabularyBindings[0].sourceText='STALE historical';
  assert.throws(()=>target.restore(historical),/vocabularyBindings/);assert.equal(tables(target),after);
});

test('feedback binding projection ignores forged receipt metadata and has no learner text matching',t=>{
  const s=setup(t),{c,e}=candidate(s,'cloze',['answers']);
  const forged={correct:false,answer:e.answers[0],vocabularyBindings:[{id:'forged',field:'answer'}]};
  const before=JSON.stringify(forged),projected=withAnswerVocabularyBindings(e,forged);
  assert.deepEqual(projected.vocabularyBindings,e.vocabularyBindings);
  assert.equal(projected.answer,e.answers[0]);assert.equal(JSON.stringify(forged),before);
  delete e.vocabularyBindings;
  assert.equal(withAnswerVocabularyBindings(e,forged).vocabularyBindings,undefined);
  assert.equal(validateContent(c),c);
});

test('bound managed IDs use Learned eligibility and never Source/flat fallback; legacy exclusions and scoping persist',t=>{
  const s=setup(t),{c,e}=candidate(s);c.lexical=lexicalFixture();const managed=c.lexical.words[0];
  managed.runtimeId='binding-only-word';managed.approvalDigest=lexicalApprovalDigest(managed);
  // The synthetic fixture introduces this word in lesson-1, while cloze belongs to lesson-2.
  const project=()=>projectExerciseVocabulary(c,e.lessonId,w=>s.publicWord(w));
  assert.equal(project().byWordId['binding-only-word'].kind,'lexical');
  const eligible=structuredClone(c.lexical),before=JSON.stringify(c);
  assert.equal(project().byWordId['binding-only-word'].row.sourceRecord,undefined);
  assert.equal(JSON.stringify(c),before);
  for(const mutate of [x=>{x.words[0].identityReview={status:'pending'};},x=>{x.words[0].displayReview={status:'pending'};},
    x=>{x.introductions=[];},x=>{x.words[0].fieldConflicts=['SYNTHETIC conflict'];},x=>{const copy=structuredClone(x.words[0]);copy.wordKey='synthetic-duplicate-runtime';copy.approvalDigest=lexicalApprovalDigest(copy);x.words.push(copy);}]) {
    c.lexical=structuredClone(eligible);mutate(c.lexical);
    assert.equal(project().byWordId['binding-only-word'],undefined);
  }
  delete c.lexical;
  assert.equal(project().byWordId['binding-only-word'].kind,'legacy');
  const word=c.words.find(w=>w.id==='binding-only-word');word.noCard=true;
  assert.ok(project().byWordId['binding-only-word']);word.noVocab=true;
  assert.equal(project().byWordId['binding-only-word'],undefined);delete word.noVocab;
  const unrelated=c.lessons.find(l=>l.id!==e.lessonId);
  assert.equal(projectExerciseVocabulary(c,unrelated.id,w=>s.publicWord(w)).byWordId['binding-only-word'],undefined);
  e.prompt+=' stale';assert.equal(project().byWordId['binding-only-word'],undefined);
});
