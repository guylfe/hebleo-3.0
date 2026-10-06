import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Store,STORE_SCHEMA_VERSION,RESTORABLE_SCHEMA_VERSIONS} from '../src/store.js';
import {lessonQuestionProgress} from '../public/ux.js';

// Release review RR-B2-02/03: restore must refuse contradictory history links and unsupported schema declarations before writing anything.
const user='learner-demo';
function setup(t){const s=new Store();t.after(()=>s.close());return s;}
// Every table, including sqlite_sequence, so a rejected restore provably leaves no trace (not even a consumed revision ID).
const tables=s=>Object.fromEntries(s.db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(({name})=>[name,s.db.prepare('SELECT * FROM "'+name+'" ORDER BY rowid').all()]));
const learnerState=(backup,id)=>backup.learners.find(row=>row.id===id).state;
const grades=attempts=>attempts.map(a=>[a.requestId,a.exerciseId,a.lessonId,a.correct,JSON.stringify(a.expected)]);

// Synthetic source: resumed correct feedback, history without a resume, a question, a report and an explicit legacy record, all pinned to revision 1; revision 2 adds a word.
function source(t){
  const s=setup(t),first=s.get('active');
  s.attempt(user,{requestId:'resumed-correct',revisionId:first,exerciseId:'ex-1-type',answer:'אני'});
  s.saveProgress(user,{lessonId:'lesson-1',revisionId:first,step:'apply',question:0,answer:'אני',selectedTokens:[],matching:{},resultRequestId:'resumed-correct',practiceIds:[]});
  s.attempt('learner-core',{requestId:'history-correct',revisionId:first,exerciseId:'ex-1-recognize',answer:'who'});
  s.askQuestion(user,{requestId:'question-1',revisionId:first,lessonId:'lesson-1',exerciseId:'ex-1-type',wordId:'w-ani',question:'SYNTHETIC question'});
  s.report(user,{requestId:'report-1',attemptId:'resumed-correct',reason:'unclear',note:'SYNTHETIC report'});
  const author=s.learner('author-demo');author.attempts.push({requestId:'legacy-answer',exerciseId:'ex-1-type',lessonId:'lesson-1',revisionId:null,legacyRevisionId:4242,answer:'אני',correct:true,expected:'אֲנִי',at:new Date().toISOString()});s.saveLearner('author-demo',author);
  const content=s.snapshot();content.words.push({id:'w-new',pointed:'חָדָשׁ',unpointed:'חדש',curated:'חָדָשׁ',english:'new (SYNTHETIC test word)'});
  s.stage({baseRevisionId:first,expectedDraftToken:null,content});const second=s.publish(first,s.currentDraft().draftToken).revisionId;
  const backup=s.backup();assert.deepEqual(backup.revisionSnapshots.map(r=>r.revisionId),[first,second]);
  return {s,first,second,backup};
}
// A populated destination: its own progress, a pending draft and an advanced revision sequence that a rejected restore must not touch.
function destination(t){
  const d=setup(t);d.attempt('learner-core',{requestId:'destination-answer',revisionId:d.get('active'),exerciseId:'ex-1-type',answer:'אני'});
  d.stage({baseRevisionId:d.get('active'),expectedDraftToken:null,word:{id:'w-mi',notes:'Destination draft'}});return d;
}
const v1From=(backup,first)=>{const v1=structuredClone(backup);v1.format='hebleo-demo-backup-v1';v1.sessionSnapshots=v1.revisionSnapshots.filter(r=>r.revisionId===first);for(const key of ['revisionSnapshots','activeRevisionId','draft','storeSchemaVersion'])delete v1[key];return v1;};

test('valid v2 backup restores consistent links with unchanged grades, resumed feedback, legacy records and replay',t=>{
  const {s,first,backup}=source(t),d=destination(t);
  const {revisions}=d.restore(structuredClone(backup));
  const session=d.session(user,'lesson-1'),lesson=session.content.lessons.find(l=>l.id==='lesson-1');
  assert.equal(session.result.requestId,'resumed-correct');assert.equal(session.result.correct,true);assert.equal(session.revisionId,revisions[first]);
  const sourceSlots=lessonQuestionProgress(s.snapshot(first).lessons.find(l=>l.id==='lesson-1'),s.learner(user).attempts,first).correctIds.length;
  assert.equal(sourceSlots,1);assert.equal(lessonQuestionProgress(lesson,d.learner(user).attempts,session.revisionId).correctIds.length,sourceSlots,'correct feedback and progress agree after restore');
  for(const id of ['learner-demo','learner-core','author-demo'])assert.deepEqual(grades(d.learner(id).attempts),grades(learnerState(backup,id).attempts),id+' grades unchanged');
  assert.equal(d.learner('learner-core').attempts[0].revisionId,revisions[first],'no-resume history relinked to the restored revision');
  const legacy=d.learner('author-demo').attempts[0];assert.equal(legacy.revisionId,null);assert.equal(legacy.legacyRevisionId,4242);assert.equal(legacy.correct,true);
  const [question]=d.questions('author-demo');assert.equal(question.revisionId,revisions[first]);assert.equal(question.wordId,'w-ani');
  assert.equal(d.reports('author-demo')[0].attempt.revisionId,revisions[first]);
  assert.equal(d.attempt(user,{requestId:'resumed-correct',revisionId:revisions[first],exerciseId:'ex-1-type',answer:'אני'}).duplicate,true,'replay is recognised, not a second attempt');
});

test('v2 restore rejects nonexistent or existing-but-wrong historical lesson, exercise and word links before any write',t=>{
  const {backup}=source(t);
  const resumed=b=>learnerState(b,user).attempts.find(a=>a.requestId==='resumed-correct'),history=b=>learnerState(b,'learner-core').attempts[0],question=b=>b.questions[0].value,reported=b=>b.reports[0].value.attempt;
  const cases={
    'resumed correct attempt, nonexistent lesson':b=>{resumed(b).lessonId='lesson-does-not-exist';},
    'resumed correct attempt, existing but wrong lesson':b=>{resumed(b).lessonId='lesson-2';},
    'no-resume attempt, nonexistent lesson':b=>{history(b).lessonId='lesson-does-not-exist';},
    'no-resume attempt, existing but wrong lesson':b=>{history(b).lessonId='lesson-3';},
    'no-resume attempt, exercise owned by another lesson':b=>{history(b).exerciseId='ex-2-cloze';},
    'no-resume attempt, nonexistent exercise':b=>{history(b).exerciseId='ex-does-not-exist';},
    'question, nonexistent lesson':b=>{question(b).lessonId='lesson-does-not-exist';},
    'question, existing lesson that does not own its exercise':b=>{question(b).lessonId='lesson-2';},
    'question, nonexistent exercise':b=>{question(b).exerciseId='ex-does-not-exist';},
    'question, nonexistent word':b=>{question(b).wordId='word-does-not-exist';},
    'question, word that exists only in a later revision':b=>{question(b).wordId='w-new';},
    'reported attempt, nonexistent lesson':b=>{reported(b).lessonId='lesson-does-not-exist';},
    'reported attempt, existing but wrong lesson':b=>{reported(b).lessonId='lesson-2';},
  };
  for(const [name,mutate] of Object.entries(cases)){
    const d=destination(t),before=tables(d),bad=structuredClone(backup);mutate(bad);
    assert.throws(()=>d.restore(bad),/Invalid (saved attempt|learner question|learner report)/,name);
    assert.deepEqual(tables(d),before,name+': every table and sqlite_sequence unchanged');
  }
});

test('restore refuses missing, malformed or unsupported store schema declarations atomically',t=>{
  const {first,backup}=source(t);
  assert.deepEqual(RESTORABLE_SCHEMA_VERSIONS['hebleo-demo-backup-v2'],[STORE_SCHEMA_VERSION]);assert.equal(backup.storeSchemaVersion,STORE_SCHEMA_VERSION);
  const v2Cases={future:999,next:STORE_SCHEMA_VERSION+1,older:1,zero:0,negative:-1,fraction:2.5,string:'2',null:null,missing:undefined};
  const v1Cases={future:999,next:STORE_SCHEMA_VERSION+1,string:'1',null:null};
  for(const [format,base,cases] of [['v2',backup,v2Cases],['v1',v1From(backup,first),v1Cases]])for(const [name,version] of Object.entries(cases)){
    const d=destination(t),before=tables(d),bad=structuredClone(base);if(version===undefined)delete bad.storeSchemaVersion;else bad.storeSchemaVersion=version;
    assert.throws(()=>d.restore(bad),e=>e.status===409&&/store schema/.test(e.message),format+' '+name);
    assert.deepEqual(tables(d),before,format+' '+name+': every table and sqlite_sequence unchanged');
  }
});

test('v1 exports without a schema field still restore; links that disagree with a carried revision become explicit legacy links, never repaired',t=>{
  const {first,backup}=source(t),v1=v1From(backup,first);
  const plain=destination(t);const {revisions}=plain.restore(structuredClone(v1));
  assert.equal(plain.session(user,'lesson-1').result.correct,true);assert.equal(plain.learner('learner-core').attempts[0].revisionId,revisions[first]);
  const wrong=structuredClone(v1);learnerState(wrong,'learner-core').attempts[0].lessonId='lesson-3';
  const d=destination(t);d.restore(wrong);const restored=d.learner('learner-core').attempts[0];
  assert.equal(restored.revisionId,null);assert.equal(restored.legacyRevisionId,first);assert.equal(restored.lessonId,'lesson-3');assert.equal(restored.correct,true,'grade kept, link not invented');
  // Resumed feedback must still match its own lesson; a v1 resume cannot point at an attempt that would turn legacy.
  const resumed=structuredClone(v1);learnerState(resumed,user).attempts.find(a=>a.requestId==='resumed-correct').lessonId='lesson-2';
  const r=destination(t),before=tables(r);assert.throws(()=>r.restore(resumed),/Saved feedback does not match/);assert.deepEqual(tables(r),before);
});
