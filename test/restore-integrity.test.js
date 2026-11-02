import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Store,STORE_SCHEMA_VERSION,RESTORABLE_SCHEMA_VERSIONS} from '../src/store.js';
import {lessonQuestionProgress} from '../public/ux.js';
import {createServer} from '../src/server.js';

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
const v1From=(backup,first)=>{const v1=structuredClone(backup);v1.format='hebleo-demo-backup-v1';v1.sessionSnapshots=v1.revisionSnapshots.filter(r=>r.revisionId===first);for(const key of ['revisionSnapshots','activeRevisionId','draft','storeSchemaVersion','mediaRecovery','authorReview'])delete v1[key];return v1;};

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
  assert.deepEqual(RESTORABLE_SCHEMA_VERSIONS['hebleo-demo-backup-v2'],[2,3,4,5,6,7,8,9,10,STORE_SCHEMA_VERSION]);assert.equal(backup.storeSchemaVersion,STORE_SCHEMA_VERSION);
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

// Release recheck RR-B2-02: a reported attempt is a copy of a graded attempt, so it needs the same identity and grade as learner history.
const changes=s=>s.db.prepare('SELECT total_changes() AS n').get().n;
// Reports on resumed feedback, on no-resume history and on an explicit legacy record, plus a lesson-level question with no exercise or word.
function reportSource(t){
  const {s,first}=source(t);
  s.report('learner-core',{requestId:'report-history',attemptId:'history-correct',reason:'answer',note:'SYNTHETIC no-resume report'});
  s.report('author-demo',{requestId:'report-legacy',attemptId:'legacy-answer',reason:'media',note:'SYNTHETIC legacy report'});
  s.askQuestion(user,{requestId:'question-lesson',revisionId:first,lessonId:'lesson-1',question:'SYNTHETIC lesson-level question'});
  return {s,first,backup:s.backup()};
}
const reportedBy=(b,key)=>b.reports.find(r=>r.key===key).value;
const reportKeys={resumed:'report-learner-demo-report-1','no-resume':'report-learner-core-report-history',legacy:'report-author-demo-report-legacy'};
const blank={absent:undefined,null:null,empty:''};
const setField=(record,field,value)=>{if(value===undefined)delete record[field];else record[field]=value;};
function malformedReports(){
  const cases={};
  for(const [kind,key] of Object.entries(reportKeys))for(const [how,value] of Object.entries(blank))cases[kind+' report, exerciseId '+how]=b=>setField(reportedBy(b,key).attempt,'exerciseId',value);
  for(const field of ['requestId','lessonId'])for(const [how,value] of Object.entries(blank))cases['resumed report, '+field+' '+how]=b=>setField(reportedBy(b,reportKeys.resumed).attempt,field,value);
  Object.assign(cases,{
    'no-resume report, correct absent':b=>{delete reportedBy(b,reportKeys['no-resume']).attempt.correct;},
    'no-resume report, correct not boolean':b=>{reportedBy(b,reportKeys['no-resume']).attempt.correct='true';},
    'legacy report, at absent':b=>{delete reportedBy(b,reportKeys.legacy).attempt.at;},
    'legacy report, at not a date':b=>{reportedBy(b,reportKeys.legacy).attempt.at='SYNTHETIC not a date';},
    'resumed report, attempt absent':b=>{delete reportedBy(b,reportKeys.resumed).attempt;},
    'resumed report, attempt is a list':b=>{reportedBy(b,reportKeys.resumed).attempt=[];},
  });
  return cases;
}

test('restore refuses reported attempts with absent, null or empty identities or grades before any write, in v2 and v1',t=>{
  const {first,backup}=reportSource(t);
  for(const [format,base] of [['v2',backup],['v1',v1From(backup,first)]])for(const [name,mutate] of Object.entries(malformedReports())){
    const d=destination(t),before=tables(d),beforeChanges=changes(d),bad=structuredClone(base);mutate(bad);
    assert.throws(()=>d.restore(bad),/Invalid learner report/,format+' '+name);
    assert.equal(changes(d)-beforeChanges,0,format+' '+name+': no SQLite change at all');
    assert.deepEqual(tables(d),before,format+' '+name+': every table and sqlite_sequence unchanged');
  }
});

test('valid reports on resumed, no-resume and legacy history restore with unchanged grades; lesson-level questions keep optional targets',t=>{
  const {first,backup}=reportSource(t);
  for(const [format,base] of [['v2',backup],['v1',v1From(backup,first)]]){
    const d=destination(t),input=structuredClone(base);delete input.questions.find(q=>q.key==='question-learner-demo-question-lesson').value.exerciseId;
    const {revisions}=d.restore(input),restored=Object.fromEntries(d.reports('author-demo').map(r=>[r.requestId,r.attempt]));
    for(const [kind,key] of Object.entries(reportKeys)){const want=reportedBy(base,key).attempt,got=restored[reportedBy(base,key).requestId];assert.deepEqual(grades([got]),grades([want]),format+' '+kind+' report keeps its identity and grade');}
    assert.equal(restored['report-1'].revisionId,revisions[first]);assert.equal(restored['report-history'].revisionId,revisions[first]);
    assert.equal(restored['report-legacy'].revisionId,null);assert.equal(restored['report-legacy'].legacyRevisionId,4242,format+' legacy report stays legacy, not repaired');
    const lessonQuestion=d.questions('author-demo').find(q=>q.requestId==='question-lesson');assert.equal(lessonQuestion.exerciseId,undefined);assert.equal(lessonQuestion.wordId,null);assert.equal(lessonQuestion.revisionId,revisions[first]);
  }
});

test('HTTP restore refuses reported attempts without an exercise, lesson or request ID and writes nothing; a valid report restores',async t=>{
  const {backup}=reportSource(t),d=destination(t),server=createServer(d);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{
    const restore=body=>fetch('http://127.0.0.1:'+server.address().port+'/api/restore',{method:'POST',headers:{'content-type':'application/json','x-demo-user':'author-demo'},body:JSON.stringify(body)});
    const before=tables(d),beforeChanges=changes(d);
    for(const [kind,key] of [['resumed',reportKeys.resumed],['no-resume',reportKeys['no-resume']]])for(const field of ['exerciseId','lessonId','requestId'])for(const [how,value] of Object.entries(blank)){
      const bad=structuredClone(backup);setField(reportedBy(bad,key).attempt,field,value);const name=kind+' '+field+' '+how,response=await restore(bad);
      assert.equal(response.status,400,name);assert.match((await response.json()).error,/Invalid learner report/,name);
      assert.equal(changes(d)-beforeChanges,0,name+': no SQLite change at all');assert.deepEqual(tables(d),before,name+': every table and sqlite_sequence unchanged');
    }
    const ok=await restore(structuredClone(backup));assert.equal(ok.status,200);
    const restored=d.reports('author-demo').find(r=>r.requestId==='report-1').attempt;assert.equal(restored.exerciseId,'ex-1-type');assert.equal(restored.correct,true);
  }finally{await new Promise(resolve=>server.close(resolve));}
});

// Release recheck RR-B2-04: reports are stored under report-<userId>-<requestId> but listed and resolved by their own userId/requestId, so the two must agree, with one report per key.
const keyOf=v=>'report-'+v.userId+'-'+v.requestId;
function malformedEnvelopes(){
  const a=b=>b.reports.find(r=>r.key===reportKeys.resumed),cases={};
  for(const [how,value] of Object.entries({...blank,unknown:'learner-unknown',other:'learner-core'}))cases['userId '+how]=b=>setField(a(b).value,'userId',value);
  for(const [how,value] of Object.entries({...blank,other:'report-elsewhere'}))cases['requestId '+how]=b=>setField(a(b).value,'requestId',value);
  Object.assign(cases,{
    'unknown userId with a matching key':b=>{const r=a(b);r.key='report-learner-unknown-report-1';r.value.userId='learner-unknown';},
    'reserved requestId with a matching key':b=>{const r=a(b);r.key='report-learner-demo-constructor';r.value.requestId='constructor';},
    'identity copied from report B under report A key':b=>Object.assign(a(b).value,{userId:'learner-core',requestId:'report-history'}),
    'key renamed away from its identity':b=>{a(b).key='report-learner-demo-report-renamed';},
    'key absent':b=>{delete a(b).key;},
    'value absent':b=>{delete a(b).value;},
    'report A moved onto report B key and identity (two reports, one key)':b=>{const r=a(b);r.key=reportKeys['no-resume'];Object.assign(r.value,{userId:'learner-core',requestId:'report-history'});},
    'same report twice':b=>{b.reports.push(structuredClone(a(b)));},
  });
  return cases;
}

test('restore refuses report envelopes that disagree with their key and duplicate report keys before any write, in v2 and v1',t=>{
  const {first,backup}=reportSource(t);
  for(const [format,base] of [['v2',backup],['v1',v1From(backup,first)]])for(const [name,mutate] of Object.entries(malformedEnvelopes())){
    const d=destination(t),before=tables(d),beforeChanges=changes(d),bad=structuredClone(base);mutate(bad);
    assert.throws(()=>d.restore(bad),/Invalid (learner report|backup reports)/,format+' '+name);
    assert.equal(changes(d)-beforeChanges,0,format+' '+name+': no SQLite change at all');
    assert.deepEqual(tables(d),before,format+' '+name+': every table and sqlite_sequence unchanged');
  }
});

test('valid reports restore under their own identities and resolving one changes only that report, in v2 and v1',t=>{
  const {first,backup}=reportSource(t);
  for(const [format,base] of [['v2',backup],['v1',v1From(backup,first)]]){
    const d=destination(t);d.restore(structuredClone(base));
    const listed=d.reports('author-demo');assert.deepEqual(listed.map(keyOf).sort(),Object.values(reportKeys).sort(),format+' every listed identity is its stored key');
    const before=Object.fromEntries(Object.values(reportKeys).map(key=>[key,d.get(key)])),a=listed.find(r=>r.note==='SYNTHETIC report');
    assert.equal(a.status,'pending');d.resolveReport('author-demo',{userId:a.userId,requestId:a.requestId,status:'reviewed'});
    for(const [kind,key] of Object.entries(reportKeys))assert.deepEqual(d.get(key),kind==='resumed'?{...before[key],status:'reviewed'}:before[key],format+' '+kind+' report');
  }
});

test('HTTP restore refuses mismatched or duplicate report identities and writes nothing; after a valid restore, resolving the listed report A changes only A',async t=>{
  const {backup}=reportSource(t),d=destination(t),server=createServer(d);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{
    const api=(path,body)=>fetch('http://127.0.0.1:'+server.address().port+'/api/'+path,{method:body?'POST':'GET',headers:{'content-type':'application/json','x-demo-user':'author-demo'},...(body?{body:JSON.stringify(body)}:{})});
    const before=tables(d),beforeChanges=changes(d);
    for(const [name,mutate] of Object.entries(malformedEnvelopes())){
      const bad=structuredClone(backup);mutate(bad);const response=await api('restore',bad);
      assert.equal(response.status,400,name);assert.match((await response.json()).error,/Invalid (learner report|backup reports)/,name);
      assert.equal(changes(d)-beforeChanges,0,name+': no SQLite change at all');assert.deepEqual(tables(d),before,name+': every table and sqlite_sequence unchanged');
    }
    assert.equal((await api('restore',structuredClone(backup))).status,200);
    const listed=await (await api('reports')).json(),a=listed.find(r=>r.note==='SYNTHETIC report');
    assert.deepEqual(listed.map(keyOf).sort(),Object.values(reportKeys).sort());assert.equal(a.status,'pending');
    const others=Object.values(reportKeys).filter(key=>key!==reportKeys.resumed),othersBefore=others.map(key=>d.get(key));
    const resolved=await api('reports/resolve',{userId:a.userId,requestId:a.requestId,status:'reviewed'});assert.equal(resolved.status,200);
    assert.equal(d.get(reportKeys.resumed).status,'reviewed');assert.deepEqual(others.map(key=>d.get(key)),othersBefore,'report B and the legacy report unchanged');
  }finally{await new Promise(resolve=>server.close(resolve));}
});
