import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {cpSync,mkdirSync,writeFileSync,readFileSync,appendFileSync,unlinkSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Store} from '../../hebleo-lead/src/store.js';
import {createServer,prepareDemoProgress} from '../../hebleo-lead/src/server.js';
import {demoBuildFingerprint} from '../../hebleo-lead/src/demo-build.js';

const commit='staged RR-B2-02 fix on 6d957fe';
const evidence=fileURLToPath(new URL('.',import.meta.url)),repo=fileURLToPath(new URL('../../hebleo-lead/',import.meta.url));
const users=['learner-demo','learner-core','author-demo'],clone=structuredClone;
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const dump=s=>Object.fromEntries(s.db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(({name})=>[name,s.db.prepare(`SELECT * FROM "${name}" ORDER BY rowid`).all()]));
const writes=s=>s.db.prepare('SELECT total_changes() n').get().n;
const results=[];
function save(){writeFileSync(join(evidence,'closure-results.json'),JSON.stringify({commit,node:process.version,results},null,2));}
async function check(name,fn){try{const details=await fn();results.push({name,status:'PASS',details});console.log('PASS '+name);}catch(e){results.push({name,status:'FAIL',error:e.stack});console.log('FAIL '+name+' '+e.stack);}save();}
const stage=(s,c)=>s.stage({baseRevisionId:s.get('active'),expectedDraftToken:s.currentDraft()?.draftToken??null,content:c});
const publish=(s,c)=>{stage(s,c);return s.publish(s.get('active'),s.currentDraft().draftToken).revisionId;};

function source(){
 const s=new Store();try{
  const first=s.get('active');
  for(const u of users){const a=s.attempt(u,{requestId:'answer-'+u,revisionId:first,exerciseId:'ex-1-type',answer:'אני'});
   s.report(u,{requestId:'report-'+u,attemptId:a.requestId,reason:'unclear',note:'SYNTHETIC audit'});
   s.askQuestion(u,{requestId:'question-'+u,revisionId:first,lessonId:'lesson-1',exerciseId:'ex-1-type',wordId:'w-ani',question:'SYNTHETIC audit question'});
  }
  s.saveProgress(users[0],{lessonId:'lesson-1',revisionId:first,step:'apply',question:0,answer:'אני',selectedTokens:[],matching:{},resultRequestId:'answer-'+users[0],practiceIds:[]});
  const c=s.snapshot();c.words.push({...clone(c.words[0]),id:'w-later',english:'SYNTHETIC later revision only'});publish(s,c);
  const pending=s.snapshot();pending.auditDraft={unknown:['SYNTHETIC','retained']};stage(s,pending);
  return s.backup();
 }finally{s.close();}
}
const backup=source(),first=backup.learners[0].state.attempts[0].revisionId;
const resumed=b=>b.learners.find(x=>x.id===users[0]).state.attempts[0];
const history=b=>b.learners.find(x=>x.id===users[1]).state.attempts[0];
const question=b=>b.questions.find(x=>x.value.userId===users[0]).value;
const reported=b=>b.reports.find(x=>x.value.userId===users[0]).value.attempt;
function destination(){const s=new Store();const c=s.snapshot();c.reviewDestination='SYNTHETIC independent';publish(s,c);s.attempt(users[1],{requestId:'destination-history',revisionId:s.get('active'),exerciseId:'ex-1-type',answer:'אני'});const draft=s.snapshot();draft.keepPending='SYNTHETIC';stage(s,draft);return s;}
function rejection(b,label,pattern=/Invalid|Saved feedback/){
 const d=destination();try{const before=dump(d),count=writes(d);let error;
  try{d.restore(clone(b));}catch(e){error=e;}
  assert.ok(error,label+': malformed backup was accepted');assert.match(error.message,pattern,label);
  assert.deepEqual(dump(d),before,label+': every table and sqlite_sequence preserved');
  assert.equal(writes(d),count,label+': rejection must precede all writes, not just rollback');
  return {label,error:error.message,status:error.status,tableHash:hash(before),totalChangesDelta:0};
 }finally{d.close();}
}

await check('RR-B2-02 exact-revision reference rejection across resumed, no-resume, question and report history',()=>{
 const outcomes=[];
 for(const [type,get] of Object.entries({resumed,history,question,reported})){
  const mutations={missingLesson:r=>r.lessonId='lesson-absent',otherExistingLesson:r=>r.lessonId='lesson-2',missingExercise:r=>r.exerciseId='ex-absent',otherLessonExercise:r=>r.exerciseId='ex-2-cloze',missingWord:r=>r.wordId='w-absent',wordOnlyInLaterRevision:r=>r.wordId='w-later',uncarriedRevision:r=>r.revisionId=98765};
  for(const [name,mutate] of Object.entries(mutations)){const b=clone(backup);mutate(get(b));outcomes.push(rejection(b,type+'/'+name));}
 }
 return {rejections:outcomes.length,outcomes};
});

await check('RR-B2-02 mandatory exercise reference on reported attempt cannot be omitted',()=>{
 const outcomes=[];
 for(const value of [undefined,null,'']){const b=clone(backup);if(value===undefined)delete reported(b).exerciseId;else reported(b).exerciseId=value;outcomes.push(rejection(b,'reported exercise '+String(value)));}
 return outcomes;
});

await check('RR-B2-03 v2 supports exactly numeric schema 2; invalid v2 and v1 rejected before writes',()=>{
 const outcomes=[];
 for(const format of ['v2','v1'])for(const v of [undefined,1,0,-1,2.5,3,999,'2',null,true,{},[]]){
  if(format==='v1'&&(v===undefined||v===1))continue;
  const b=format==='v2'?clone(backup):v1(backup);if(v===undefined)delete b.storeSchemaVersion;else b.storeSchemaVersion=v;
  outcomes.push(rejection(b,format+'/'+JSON.stringify(v),/store schema/));assert.equal(outcomes.at(-1).status,409);
 }
 return {rejections:outcomes.length,outcomes};
});

function v1(b){b=clone(b);b.format='hebleo-demo-backup-v1';b.sessionSnapshots=b.revisionSnapshots.filter(r=>r.revisionId===first);for(const k of ['storeSchemaVersion','revisionSnapshots','activeRevisionId','draft'])delete b[k];return b;}
const withoutRevision=r=>{r=clone(r);delete r.revisionId;delete r.legacyRevisionId;return r;};
await check('RR-B2-03 v1 absent/1/2 and v2=2 remain supported; null and legacy history preserved without repair or regrading',()=>{
 const outcomes=[];
 for(const version of [undefined,1,2]){
  const b=v1(backup);if(version!==undefined)b.storeSchemaVersion=version;
  // Keep one real resumed record, convert every other record category by a conflicting historical reference.
  history(b).lessonId='lesson-2';question(b).wordId='w-later';reported(b).exerciseId='ex-2-cloze';
  const author=b.learners.find(x=>x.id===users[2]);author.state.attempts[0].revisionId=54321;
  const d=destination();try{
   const mapping=d.restore(clone(b)).revisions;assert.equal(d.session(users[0],'lesson-1').result.correct,true);
   assert.equal(d.learner(users[0]).attempts[0].revisionId,mapping[first]);
   const out=[d.learner(users[1]).attempts[0],d.questions(users[0])[0],d.reports(users[2]).find(r=>r.userId===users[0]).attempt,d.learner(users[2]).attempts[0]];
   const prior=[history(b),question(b),reported(b),author.state.attempts[0]];
   out.forEach((r,i)=>{assert.equal(r.revisionId,null);assert.equal(r.legacyRevisionId,prior[i].revisionId);assert.deepEqual(withoutRevision(r),withoutRevision(prior[i]));});
   // The v2 export must preserve all newly explicit legacy records on another restore.
   const round2=d.backup(),again=destination();try{again.restore(round2);assert.deepEqual(again.learner(users[1]).attempts[0],out[0]);assert.deepEqual(again.questions(users[0])[0],out[1]);assert.deepEqual(again.reports(users[2]).find(r=>r.userId===users[0]).attempt,out[2]);assert.deepEqual(again.learner(users[2]).attempts[0],out[3]);}finally{again.close();}
   outcomes.push({v1Schema:version??'absent',mappedResumedRevision:mapping[first],legacyRecords:out.length,reexportV2RoundTrip:true});
  }finally{d.close();}
 }
 const malformed=v1(backup);resumed(malformed).lessonId='lesson-2';outcomes.push(rejection(malformed,'v1 invalid resumed feedback',/Saved feedback/));
 // Explicit null history is a supported truthful legacy state, but needs a legacy revision ID.
 const b=clone(backup);for(const get of [history,question,reported]){get(b).legacyRevisionId=get(b).revisionId;get(b).revisionId=null;}
 const d=destination();try{d.restore(clone(b));assert.deepEqual(d.learner(users[1]).attempts[0],history(b));assert.deepEqual(d.questions(users[0])[0],question(b));assert.deepEqual(d.reports(users[2]).find(r=>r.userId===users[0]).attempt,reported(b));}finally{d.close();}
 for(const get of [history,question,reported]){const invalid=clone(b);delete get(invalid).legacyRevisionId;outcomes.push(rejection(invalid,'null revision without legacy ID'));}
 return outcomes;
});

await check('RR-B2-01 nested edits/add/removal change hash, startup resets once, docs/data preserve, live sessions do not reset',async()=>{
 const base=join(evidence,'fingerprint-fixture-'+randomUUID());mkdirSync(base);
 for(const path of ['public','src'])cpSync(join(repo,path),join(base,path),{recursive:true});cpSync(join(repo,'package-lock.json'),join(base,'package-lock.json'));
 const db=join(base,'synthetic.sqlite');let s=new Store(db),server;
 try{
  const fp=()=>demoBuildFingerprint(base),start=()=>prepareDemoProgress(s,{enabled:true,fingerprint:fp});
  assert.equal(await fp(),await demoBuildFingerprint(repo));assert.equal(await start(),true);
  const practise=()=>{for(const u of users)s.attempt(u,{requestId:randomUUID(),revisionId:s.get('active'),exerciseId:'ex-1-type',answer:'אני'});};
  for(const u of users)s.updateLearner(u,{nikkud:'full',keyboardPinned:true,bookmark:'w-ani',note:{wordId:'w-ani',text:'SYNTHETIC retained note'}});
  const pending=s.snapshot();pending.auditDraft='SYNTHETIC retained draft';stage(s,pending);
  const preserved=()=>({content:s.snapshot(),draft:s.currentDraft(),prefs:users.map(u=>{const l=s.learner(u);return {preferences:l.preferences,bookmarks:l.bookmarks,notes:l.notes,membership:l.membership,purchasedCourses:l.purchasedCourses};})});
  const keep=preserved();practise();const stable=await fp();
  for(const path of ['README.md','docs/nested/check.md','data/test.sqlite','uploads/test.js','public/studio/NOTES.md']){mkdirSync(dirname(join(base,path)),{recursive:true});writeFileSync(join(base,path),'SYNTHETIC ignored '+path);assert.equal(await fp(),stable);const before=dump(s),n=writes(s);assert.equal(await start(),false);assert.deepEqual(dump(s),before);assert.equal(writes(s),n);}
  const outcomes=[];
  const transitions=[];
  for(const path of ['public/preview/learner-renderer.js','public/preview/lesson-preview.js','public/studio/exercise-editor.js','public/studio/lesson-editor.js','public/studio/import-review.js','public/studio/editor-fields.js','public/studio/studio.css'])transitions.push([path+' edit',()=>appendFileSync(join(base,path),'\n/* SYNTHETIC independent edit */\n')]);
  for(const path of ['src/deep/nested/probe.js','public/studio/deep/probe.css','public/preview/deep/probe.html','public/studio/deep/probe.svg']){
   transitions.push([path+' add',()=>{mkdirSync(dirname(join(base,path)),{recursive:true});writeFileSync(join(base,path),'/* SYNTHETIC new executable */\n');}]);
   transitions.push([path+' remove',()=>unlinkSync(join(base,path))]);
  }
  for(const [name,mutate] of transitions){const beforeHash=await fp();mutate();const afterHash=await fp();assert.notEqual(afterHash,beforeHash,name);assert.equal(await start(),true,name);assert.deepEqual(users.map(u=>s.learner(u).attempts.length),[0,0,0]);assert.deepEqual(preserved(),keep);practise();s.close();s=new Store(db);const before=dump(s),n=writes(s);assert.equal(await start(),false);assert.deepEqual(dump(s),before);assert.equal(writes(s),n);assert.deepEqual(users.map(u=>s.learner(u).attempts.length),[1,1,1]);outcomes.push({name,beforeHash,afterHash,restartPreserved:true});}
  const path=join(base,'public/studio/studio.css'),lf=readFileSync(path,'utf8').replace(/\r\n/g,'\n');writeFileSync(path,lf);const normal=await fp();writeFileSync(path,lf.replace(/\n/g,'\r\n'));assert.equal(await fp(),normal);
  server=createServer(s);await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
  const before=dump(s);appendFileSync(join(base,'public/studio/studio.css'),'\n/* SYNTHETIC live edit */\n');
  for(const u of users){const response=await fetch(url+'/api/bootstrap',{headers:{'x-demo-user':u}});assert.equal(response.status,200);assert.equal((await response.json()).learner.attempts.length,1);}
  assert.deepEqual(dump(s),before);await new Promise(r=>server.close(r));server=undefined;
  assert.equal(await prepareDemoProgress(s,{enabled:false,fingerprint:fp}),false);assert.deepEqual(dump(s),before);
  assert.equal(await start(),true);assert.deepEqual(users.map(u=>s.learner(u).attempts.length),[0,0,0]);assert.deepEqual(preserved(),keep);
  return {fixture:base,transitions:outcomes.length,outcomes,ignoredChanges:5,lineEndingsNormalized:true,liveHttpPreserved:true,disabledPreserved:true,allProfiles:3,db};
 }finally{if(server)await new Promise(r=>server.close(r));s.close();}
});

console.log(JSON.stringify({checks:results.length,passed:results.filter(r=>r.status==='PASS').length,failed:results.filter(r=>r.status==='FAIL').length}));
if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
