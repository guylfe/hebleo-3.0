import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {Store} from '../hebleo-lead/src/store.js';
import {createServer} from '../hebleo-lead/src/server.js';
const commit=(process.env.COMMIT_LABEL||'unlabelled'), clone=structuredClone;
const users=['learner-demo','learner-core','author-demo'];
const dump=s=>Object.fromEntries(s.db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(({name})=>[name,s.db.prepare(`SELECT * FROM "${name}" ORDER BY rowid`).all()]));
const writes=s=>s.db.prepare('SELECT total_changes() n').get().n;
const stage=s=>s.stage({baseRevisionId:s.get('active'),expectedDraftToken:null,content:{...s.snapshot(),reviewFixture:'SYNTHETIC pending draft'}});
const results=[];
function save(){writeFileSync(new URL('attempt-matrix-results.json',import.meta.url),JSON.stringify({commit,results},null,2));}
function fixture(){const s=new Store();try{
 const first=s.get('active');
 for(const [i,u] of users.entries()){
  const a=s.attempt(u,{requestId:'answer-'+u,revisionId:first,exerciseId:'ex-1-type',answer:i===1?'SYNTHETIC WRONG':'אני'});
  if(i===0)s.saveProgress(u,{lessonId:'lesson-1',revisionId:first,step:'apply',question:0,answer:'אני',selectedTokens:[],matching:{},resultRequestId:a.requestId,practiceIds:[]});
  if(i===2){const state=s.learner(u);Object.assign(state.attempts[0],{revisionId:null,legacyRevisionId:4242,lessonId:'legacy-lesson',exerciseId:'legacy-exercise'});s.saveLearner(u,state);}
  s.report(u,{requestId:'report-'+u,attemptId:a.requestId,reason:'unclear',note:'SYNTHETIC '+u});
 }
 s.askQuestion(users[0],{requestId:'lesson-only',revisionId:first,lessonId:'lesson-1',question:'SYNTHETIC optional target question'});
 stage(s);return s.backup();
}finally{s.close();}}
function destination(){const s=new Store();s.attempt(users[1],{requestId:'destination-answer',revisionId:s.get('active'),exerciseId:'ex-1-type',answer:'אני'});stage(s);s.publish(s.get('active'),s.currentDraft().draftToken);stage(s);return s;}
function convert(b,format){b=clone(b);if(format==='v1'){b.format='hebleo-demo-backup-v1';b.sessionSnapshots=clone(b.revisionSnapshots);for(const k of ['revisionSnapshots','storeSchemaVersion','activeRevisionId','draft'])delete b[k];}return b;}
const backup=fixture(), variants=[];
const set=(o,k,v)=>v===undefined?delete o[k]:o[k]=v;
for(const field of ['exerciseId','requestId','lessonId'])for(const [name,value] of [['absent',undefined],['null',null],['empty','']])variants.push([field+'/'+name,r=>set(r.attempt,field,value)]);
for(const [name,value] of [['absent',undefined],['string','true'],['null',null]])variants.push(['correct/'+name,r=>set(r.attempt,'correct',value)]);
for(const [name,value] of [['absent',undefined],['invalid','SYNTHETIC invalid date'],['null',null]])variants.push(['at/'+name,r=>set(r.attempt,'at',value)]);
for(const [name,value] of [['absent',undefined],['null',null],['array',[]],['string','bad']])variants.push(['attempt/'+name,r=>set(r,'attempt',value)]);
for(const format of ['v2','v1'])for(const [i,kind] of ['resumed','no-resume','legacy-null'].entries())for(const [name,mutate] of variants){
 const input=convert(backup,format);mutate(input.reports.find(r=>r.value.userId===users[i]).value);
 for(const transport of ['store','http']){
  const s=destination();let server;const row={format,kind,case:name,transport};
  try{const before=dump(s),n=writes(s);assert.ok(before.sqlite_sequence.length);
   if(transport==='http'){server=createServer(s);await new Promise(r=>server.listen(0,'127.0.0.1',r));const response=await fetch('http://127.0.0.1:'+server.address().port+'/api/restore',{method:'POST',headers:{'content-type':'application/json','x-demo-user':'author-demo'},body:JSON.stringify(input)});row.status=response.status;row.body=await response.json();}
   else {try{s.restore(clone(input));row.status=200;}catch(e){row.status=e.status;row.body={error:e.message};}}
   const after=dump(s);row.totalChangesDelta=writes(s)-n;row.allTablesEqual=JSON.stringify(before)===JSON.stringify(after);row.sequenceBefore=before.sqlite_sequence;row.sequenceAfter=after.sqlite_sequence;
   assert.equal(row.status,400);assert.match(row.body.error,/Invalid learner report/);assert.equal(row.totalChangesDelta,0);assert.deepEqual(after,before);row.passed=true;
  }catch(e){row.passed=false;row.error=e.stack;}finally{if(server)await new Promise(r=>server.close(r));s.close();}results.push(row);save();
 }
}
for(const format of ['v2','v1'])for(const transport of ['store','http']){
 const row={format,transport,case:'valid-compatibility-control'},s=destination();let server;
 try{const input=convert(backup,format);delete input.questions[0].value.exerciseId;let mapping;
  if(transport==='http'){server=createServer(s);await new Promise(r=>server.listen(0,'127.0.0.1',r));const response=await fetch('http://127.0.0.1:'+server.address().port+'/api/restore',{method:'POST',headers:{'content-type':'application/json','x-demo-user':'author-demo'},body:JSON.stringify(input)});assert.equal(response.status,200);mapping=(await response.json()).revisions;}else mapping=s.restore(clone(input)).revisions;
  const expectedRecord=a=>{a=clone(a);if(a.revisionId!==null)a.revisionId=mapping[a.revisionId];return a;};
  for(const prior of input.reports){const expected=clone(prior.value);expected.attempt=expectedRecord(expected.attempt);assert.deepEqual(s.get(prior.key),expected);}
  for(const u of users){assert.deepEqual(s.learner(u).attempts,input.learners.find(r=>r.id===u).state.attempts.map(expectedRecord));}
  assert.deepEqual(s.get(input.questions[0].key),expectedRecord(input.questions[0].value));assert.equal(s.session(users[0],'lesson-1').result.correct,true);assert.equal(s.learner(users[1]).attempts[0].correct,false);
  assert.equal(Object.keys(s.learner(users[1]).resumes).length,0);assert.equal(s.get(input.reports.find(r=>r.value.userId===users[2]).key).attempt.legacyRevisionId,4242);
  row.passed=true;row.reports=3;row.wholeRecordsPreservedExceptMappedRevision=true;
 }catch(e){row.passed=false;row.error=e.stack;}finally{if(server)await new Promise(r=>server.close(r));s.close();}results.push(row);save();
}
const failed=results.filter(r=>!r.passed);console.log(JSON.stringify({checks:results.length,passed:results.length-failed.length,failed:failed.length,storeRejections:114,httpRejections:114,validControls:4},null,2));for(const r of failed)console.error(JSON.stringify(r));if(failed.length)process.exitCode=1;
