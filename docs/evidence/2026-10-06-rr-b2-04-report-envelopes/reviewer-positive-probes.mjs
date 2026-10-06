import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {cpSync, mkdirSync, writeFileSync, appendFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {Store} from '../hebleo-lead/src/store.js';
import {createServer, prepareDemoProgress} from '../hebleo-lead/src/server.js';
import {demoBuildFingerprint} from '../hebleo-lead/src/demo-build.js';
import {evaluateAnswer} from '../hebleo-lead/src/evaluate.js';
import {lessonQuestionProgress} from '../hebleo-lead/public/ux.js';
import {publicationEligibility} from '../hebleo-lead/schemas/tools/contracts.mjs';

const evidence=fileURLToPath(new URL('.',import.meta.url));
const repo=fileURLToPath(new URL('../hebleo-lead/',import.meta.url));
const clone=structuredClone, users=['learner-demo','learner-core','author-demo'];
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const tables=s=>s.db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(x=>x.name);
const dump=s=>Object.fromEntries(tables(s).map(n=>[n,s.db.prepare(`SELECT * FROM "${n}" ORDER BY 1`).all()]));
const fingerprint=s=>({tables:Object.fromEntries(Object.entries(dump(s)).map(([k,v])=>[k,{rows:v.length,sha256:hash(v)}])),learners:Object.fromEntries(users.map(u=>[u,hash(s.db.prepare('SELECT * FROM learners WHERE id=?').get(u))])),published:hash(s.snapshot()),draft:hash(s.currentDraft()),active:s.get('active')});
const results=[];
const check=async(name,fn)=>{try{const details=await fn();results.push({name,status:'PASS',details});console.log('PASS '+name);}catch(e){results.push({name,status:'ERROR',error:e.stack});console.log('ERROR '+name+' '+e.stack);}};
const observation=(name,details)=>{results.push({name,status:'OBSERVED',details});console.log('OBSERVED '+name+' '+JSON.stringify(details));};
const stage=(s,content)=>s.stage({baseRevisionId:s.get('active'),expectedDraftToken:s.currentDraft()?.draftToken??null,content});
const publish=(s,content)=>{stage(s,content);return s.publish(s.get('active'),s.currentDraft().draftToken).revisionId;};
const good=(e,c)=>e.type==='matching'?Object.fromEntries(e.wordIds.map(id=>[id,c.words.find(w=>w.id===id).english])):e.type==='recognition'?c.words.find(w=>w.id===e.wordId).english:e.type==='typing'?c.words.find(w=>w.id===e.wordId).pointed:e.answers[0];
const reverse=v=>Array.isArray(v)?v.map(reverse):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).reverse().map(([k,x])=>[k,reverse(x)])):v;

await check('HTTP simultaneous create/save CAS, stale stage/publish/preview/rollback, all-table isolation',async()=>{
 const s=new Store(join(evidence,'http-synthetic-'+randomUUID()+'.sqlite')), server=createServer(s);
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port;
 const req=async(path,input,user='author-demo')=>{const r=await fetch(base+'/api/'+path,{method:input===undefined?'GET':'POST',headers:{'content-type':'application/json','x-demo-user':user},...(input===undefined?{}:{body:JSON.stringify(input)})});assert.equal(r.headers.get('cache-control'),'no-store');return {status:r.status,body:await r.json()};};
 try{
  const asset=await fetch(base+'/preview/learner-renderer.js');assert.equal(asset.status,200);
  const {readFileSync}=await import('node:fs');assert.equal(hash(await asset.text()),hash(readFileSync(join(repo,'public/preview/learner-renderer.js'),'utf8')));
  for(const u of users){s.attempt(u,{requestId:'seed-'+u,revisionId:s.get('active'),exerciseId:'ex-1-type',answer:'אני'});s.updateLearner(u,{nikkud:'full',note:{wordId:'w-ani',text:'SYNTHETIC review fixture'}});}
  const content=s.snapshot(), rev=s.get('active'), first=clone(content),second=clone(content);first.reviewProbe='A';second.reviewProbe='B';
  const create=await Promise.all([first,second].map(c=>req('studio/draft',{baseRevisionId:rev,expectedDraftToken:null,content:c})));
  assert.deepEqual(create.map(r=>r.status).sort(),[200,409]);
  const token=s.currentDraft().draftToken;
  const saved=await Promise.all([first,second].map((c,i)=>req('studio/draft',{baseRevisionId:rev,expectedDraftToken:token,content:{...c,reviewProbe:'SAVE-'+i}})));
  assert.deepEqual(saved.map(r=>r.status).sort(),[200,409]);
  const before=fingerprint(s), current=s.currentDraft().draftToken;
  for(const [path,input] of [
   ['studio/draft',{baseRevisionId:rev,expectedDraftToken:token,content}],
   ['studio/publish',{baseRevisionId:rev,draftToken:token}],
   ['studio/rollback',{baseRevisionId:rev,revisionId:rev,expectedDraftToken:token}],
   ['studio/preview/session',{lessonId:'lesson-1',draftToken:token}],
   ['studio/preview/evaluate',{lessonId:'lesson-1',exerciseId:'ex-1-type',answer:'אני',draftToken:token}]
  ]){const r=await req(path,input);assert.equal(r.status,409);assert.equal(r.body.code,'DRAFT_CONFLICT');assert.deepEqual(fingerprint(s),before);}
  const noOp=await req('studio/draft',{baseRevisionId:rev,expectedDraftToken:current,content:reverse(s.currentDraft().content)});assert.equal(noOp.body.unchanged,true);assert.deepEqual(fingerprint(s),before);
  const writesBefore=s.db.prepare('SELECT total_changes() n').get().n;
  const draft=s.currentDraft().content;
  for(const l of draft.lessons){const r=await req('studio/preview/session',{lessonId:l.id,draftToken:current});assert.equal(r.status,200);assert.equal(r.body.persistent,false);assert.ok(r.body.content.exercises.every(e=>!Object.hasOwn(e,'answers')));}
  for(const e of draft.exercises){for(const answer of [e.type==='matching'?{}:'SYNTHETIC WRONG',good(e,draft)]){const r=await req('studio/preview/evaluate',{lessonId:e.lessonId,exerciseId:e.id,draftToken:current,answer});assert.equal(r.status,200);assert.equal(r.body.result.correct,evaluateAnswer(e,draft,answer).correct);}}
  for(const u of users.slice(0,2)){const r=await req('studio/preview/session',{lessonId:'lesson-1',draftToken:current},u);assert.equal(r.status,403);}
  assert.equal(s.db.prepare('SELECT total_changes() n').get().n,writesBefore);
  assert.deepEqual(fingerprint(s),before);
  writeFileSync(join(evidence,'preview-fingerprints.json'),JSON.stringify({before,after:fingerprint(s),sqliteTotalChangesDelta:0},null,2));
  const published=await req('studio/publish',{baseRevisionId:rev,draftToken:current});assert.equal(published.status,200);assert.deepEqual(s.snapshot(),draft);assert.equal(s.currentDraft(),null);
  const afterPublish=fingerprint(s);assert.deepEqual(afterPublish.learners,before.learners);
  const old=await req('studio/draft',{baseRevisionId:rev,expectedDraftToken:null,content});assert.equal(old.status,409);assert.equal(old.body.code,'STALE_BASE');assert.deepEqual(fingerprint(s),afterPublish);
  return {base,createStatuses:create.map(r=>r.status),saveStatuses:saved.map(r=>r.status),previewExercises:draft.exercises.length,types:[...new Set(draft.exercises.map(e=>e.type))],allTables:tables(s),servedRendererMatches:true};
 }finally{await new Promise(r=>server.close(r));s.close();}
});

await check('Publication diff metadata, nested arrays and collection reorders; object key order no-op',()=>{
 const cases={provenance:c=>c.provenance.label+=' SYNTHETIC DIFF',approval:c=>c.approval={status:'not-applicable',label:'SYNTHETIC'},packUnknown:c=>c.extra={ordered:['b','a']},wordUnknown:c=>c.words[0].sourceFields={columns:['b','a']},wordProvenance:c=>c.words[0].provenance={kind:'synthetic-demo'},wordApproval:c=>c.words[0].approval={status:'not-applicable'},wordsOrder:c=>c.words.reverse(),lessonsOrder:c=>{[c.lessons[0],c.lessons[1]]=[c.lessons[1],c.lessons[0]];},exercisesOrder:c=>c.exercises.reverse(),lessonWordOrder:c=>c.lessons[0].wordIds.reverse(),exerciseOrder:c=>c.lessons[0].exerciseIds.reverse(),blocksOrder:c=>c.lessons[0].blocks.reverse()};
 const observations=[];
 for(const [name,mutate] of Object.entries(cases)){const s=new Store();try{const c=s.snapshot();mutate(c);const p=stage(s,c);assert.ok(p.changes.length,name);observations.push({name,changes:p.changes.map(x=>({kind:x.kind,id:x.id,reordered:x.reordered})),affected:p.affectedLessons});}finally{s.close();}}
 const s=new Store();try{const p=stage(s,reverse(s.snapshot()));assert.deepEqual(p.changes,[]);assert.deepEqual(p.affectedLessons,[]);}finally{s.close();}
 writeFileSync(join(evidence,'publication-diff.json'),JSON.stringify(observations,null,2));return {variants:observations.length};
});

let savedBackup;
await check('Backup/restore into populated destination and repeat restore preserve all reference mappings, history grades, draft and replay',()=>{
 const s=new Store(),d=new Store();
 try{
  const original=s.get('active');
  for(const u of users){
   const a=s.attempt(u,{requestId:'answer-'+u,revisionId:original,exerciseId:'ex-1-type',answer:'אני'});
   s.saveProgress(u,{lessonId:'lesson-1',revisionId:original,step:'apply',question:0,answer:'אני',selectedTokens:[],matching:{},resultRequestId:a.requestId,practiceIds:[]});
   s.report(u,{requestId:'report-'+u,attemptId:a.requestId,reason:'unclear',note:'SYNTHETIC'});
   s.askQuestion(u,{requestId:'question-'+u,revisionId:original,lessonId:'lesson-1',exerciseId:'ex-1-type',wordId:'w-ani',question:'SYNTHETIC question'});
   s.updateLearner(u,{nikkud:'none',note:{wordId:'w-ani',text:'SYNTHETIC note'},bookmark:'w-ani'});
   s.enroll(u,'w-ani');s.review(u,{requestId:'review-'+u,wordId:'w-ani',rating:3});
  }
  const newer=s.snapshot();newer.words.find(w=>w.id==='w-ani').notes='SYNTHETIC newer';publish(s,newer);
  const pending=s.snapshot();pending.lessons[0].minutes++;pending.extra={keep:'SYNTHETIC draft unknown field'};stage(s,pending);
  const backup=s.backup();savedBackup=clone(backup);
  for(let i=0;i<3;i++){const c=d.snapshot();c.extra={destinationRevision:i};publish(d,c);}
  const rounds=[];
  for(let i=0;i<2;i++){
   const source=i===0?backup:d.backup();const beforeDraftToken=s.currentDraft().draftToken;
   const mapping=d.restore(clone(source)).revisions;
   for(const r of source.revisionSnapshots)assert.deepEqual(d.snapshot(mapping[r.revisionId]),r.content);
   assert.deepEqual(d.currentDraft().content,pending);assert.notEqual(d.currentDraft().draftToken,beforeDraftToken);
   for(const u of users){const state=d.learner(u), prior=source.learners.find(x=>x.id===u).state, expected=clone(prior);expected.attempts.forEach(a=>a.revisionId=mapping[a.revisionId]);Object.values(expected.resumes).forEach(p=>p.revisionId=mapping[p.revisionId]);assert.deepEqual(state,expected);
    const session=d.session(u,'lesson-1');assert.equal(session.result.revisionId,session.revisionId);assert.equal(session.result.correct,true);assert.equal(lessonQuestionProgress(session.content.lessons[0],state.attempts,session.revisionId).correctIds.length,1);
    const a=state.attempts[0],c=d.snapshot(a.revisionId);assert.deepEqual(evaluateAnswer(c.exercises.find(e=>e.id===a.exerciseId),c,a.answer),{correct:a.correct,expected:a.expected});
    assert.equal(d.attempt(u,{requestId:a.requestId,revisionId:a.revisionId,exerciseId:a.exerciseId,answer:a.answer}).duplicate,true);
    assert.equal(d.review(u,{requestId:'review-'+u,wordId:'w-ani',rating:3}).duplicate,true);
    assert.equal(d.questions(u).find(q=>q.userId===u).revisionId,session.revisionId);
    assert.equal(d.reports('author-demo').find(r=>r.attempt.requestId===a.requestId).attempt.revisionId,session.revisionId);
   }rounds.push(mapping);
  }return {rounds,profiles:users.length,referencedRevisions:backup.revisionSnapshots.length};
 }finally{s.close();d.close();}
});

await check('Restore failure rolls back every table and revision sequence, including injected SQL failure after writes',()=>{
 assert.ok(savedBackup);const d=new Store();try{
  const pending=d.snapshot();pending.extra='SYNTHETIC preserved pending';stage(d,pending);
  const base=fingerprint(d);
  const invalid=clone(savedBackup);invalid.learners[0].state.cards['w-ani'].intervalDays=-1;assert.throws(()=>d.restore(invalid));assert.deepEqual(fingerprint(d),base);
  d.db.exec("CREATE TEMP TRIGGER review_restore_abort BEFORE UPDATE ON learners BEGIN SELECT RAISE(ABORT,'SYNTHETIC injected restore fault'); END;");
  assert.throws(()=>d.restore(clone(savedBackup)),/injected restore fault/);assert.deepEqual(fingerprint(d),base);
  d.db.exec('DROP TRIGGER review_restore_abort');return {allTables:tables(d),invalidCardRejected:true,postWriteFailureRolledBack:true};
 }finally{d.close();}
});

await check('Cross-revision completion requires one revision and retains already-earned completion',()=>{
 const s=new Store();try{let n=0;const answer=(id,r)=>{const c=s.snapshot(r),e=c.exercises.find(e=>e.id===id);return s.attempt(users[0],{requestId:'cross-'+n++,revisionId:r,exerciseId:id,answer:good(e,c)});};
  const r1=s.get('active'), l=s.snapshot().lessons[0];answer(l.exerciseIds[0],r1);
  const c=s.snapshot();c.words.find(w=>w.id==='w-mi').english='SYNTHETIC CHANGED KEY';const r2=publish(s,c);
  for(const id of l.exerciseIds.slice(1))answer(id,r2);assert.ok(!s.learner(users[0]).completed.includes(l.id));
  answer(l.exerciseIds[0],r2);assert.ok(s.learner(users[0]).completed.includes(l.id));
  s.rollback(r1,r2,null);assert.ok(s.learner(users[0]).completed.includes(l.id));return {mixedRevisionRejected:true,fullRevisionCompletes:true,attainmentRetainedOnRollback:true};
 }finally{s.close();}
});

writeFileSync(join(evidence,'positive-results.json'),JSON.stringify({commit:(process.env.COMMIT_LABEL||'unlabelled'),node:process.version,results},null,2));
console.log(JSON.stringify({checks:results.filter(r=>r.status==='PASS').length,errors:results.filter(r=>r.status==='ERROR').length}));
if(results.some(r=>r.status==='ERROR'))process.exitCode=1;