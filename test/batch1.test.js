import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Store,STORE_SCHEMA_VERSION} from '../src/store.js';
import {createServer,prepareDemoProgress,demoFreshProgressEnabled} from '../src/server.js';

const user='learner-demo';
function setup(t){const s=new Store();t.after(()=>s.close());return s;}
const answer=(s,exerciseId,value,revisionId=s.get('active'))=>s.attempt(user,{requestId:randomUUID(),exerciseId,answer:value,revisionId});
const correct={'ex-1-recognize':'who','ex-1-type':'אני','ex-1-match':{'w-hu':'he','w-hi':'she','w-mi':'who'}};
function publishWordNote(s,note){s.stage({baseRevisionId:s.get('active'),expectedDraftToken:s.currentDraft()?.draftToken??null,word:{id:'w-ani',notes:note}});return s.publish(s.get('active'),s.currentDraft().draftToken).revisionId;}

test('fresh demo progress is an explicit startup switch: npm start flag or env only',()=>{
  assert.equal(demoFreshProgressEnabled(['node','src/server.js','--demo-fresh-progress'],{}),true);
  assert.equal(demoFreshProgressEnabled(['node','src/server.js'],{HEBLEO_DEMO_FRESH_PROGRESS:'1'}),true);
  assert.equal(demoFreshProgressEnabled(['node','--watch','src/server.js'],{}),false);
  assert.equal(demoFreshProgressEnabled(['node','src/server.js'],{HEBLEO_DEMO_FRESH_PROGRESS:'true'}),false);
});

test('startup preparation resets once per build and never when disabled',async t=>{
  const s=setup(t);answer(s,'ex-1-type','אני');
  assert.equal(await prepareDemoProgress(s,{enabled:false,fingerprint:async()=>'build-a'}),false);assert.equal(s.learner(user).attempts.length,1);
  assert.equal(await prepareDemoProgress(s,{enabled:true,fingerprint:async()=>'build-a'}),true);assert.deepEqual(s.learner(user).attempts,[]);
  answer(s,'ex-1-type','אני');
  assert.equal(await prepareDemoProgress(s,{enabled:true,fingerprint:async()=>'build-a'}),false);assert.equal(s.learner(user).attempts.length,1);
  assert.ok(Number.isFinite(Date.parse(s.get('demo-progress-reset-at'))));
});

test('a running server never resets progress, even after the app build changes on disk',async t=>{
  const store=new Store();const server=createServer(store);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));store.close();});const base='http://127.0.0.1:'+server.address().port;
  await prepareDemoProgress(store,{enabled:true,fingerprint:async()=>'build-a'});
  const bootstrap=async()=>{const response=await fetch(base+'/api/bootstrap');assert.equal(response.status,200);return response.json();};
  await fetch(base+'/api/attempt',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({requestId:'saved',revisionId:1,exerciseId:'ex-1-type',answer:'אני'})});
  for(let i=0;i<3;i++)assert.equal((await bootstrap()).learner.attempts.length,1);
  assert.equal(store.get('demo-progress-build'),'build-a');
});

test('completion needs every core question correct within one pinned revision; retries count once',t=>{
  const s=setup(t),first=s.get('active');
  answer(s,'ex-1-recognize','wrong',first);answer(s,'ex-1-recognize',correct['ex-1-recognize'],first);answer(s,'ex-1-recognize',correct['ex-1-recognize'],first);
  answer(s,'ex-1-type',correct['ex-1-type'],first);
  assert.ok(!s.learner(user).completed.includes('lesson-1'),'two of three questions, one retried twice, is not completion');
  const second=publishWordNote(s,'Revision two');
  answer(s,'ex-1-match',correct['ex-1-match'],second);
  assert.ok(!s.learner(user).completed.includes('lesson-1'),'answers from two revisions never combine');
  answer(s,'ex-1-recognize',correct['ex-1-recognize'],second);answer(s,'ex-1-type',correct['ex-1-type'],second);
  assert.ok(s.learner(user).completed.includes('lesson-1'));
});

test('v2 backup carries every referenced revision and restore remaps history consistently',t=>{
  const s=setup(t),first=s.get('active');
  const old=answer(s,'ex-1-type','אני',first);
  s.saveProgress(user,{lessonId:'lesson-1',revisionId:first,step:'apply',question:0,answer:'אני',selectedTokens:[],matching:{},resultRequestId:old.requestId,practiceIds:[]});
  s.report(user,{requestId:randomUUID(),attemptId:old.requestId,reason:'unclear',note:'old revision'});
  const second=publishWordNote(s,'Revision two');answer(s,'ex-1-type','אני',second);
  s.stage({baseRevisionId:second,expectedDraftToken:null,word:{id:'w-ani',notes:'Pending draft'}});
  const backup=s.backup();
  assert.equal(backup.format,'hebleo-demo-backup-v2');assert.deepEqual(backup.revisionSnapshots.map(r=>r.revisionId),[first,second]);
  const target=setup(t);target.stage({baseRevisionId:target.get('active'),expectedDraftToken:null,word:{id:'w-mi',notes:'unrelated'}});
  const {revisions,revisionId}=target.restore(JSON.parse(JSON.stringify(backup)));
  const state=target.learner(user);
  assert.equal(revisionId,target.get('active'));assert.equal(revisions[second],revisionId);
  assert.deepEqual(state.attempts.map(a=>a.revisionId),[revisions[first],revisions[second]]);
  assert.equal(state.resumes['lesson-1'].revisionId,revisions[first]);
  const session=target.session(user,'lesson-1');
  assert.equal(session.result.requestId,old.requestId,'resumed feedback still points at the attempt graded in that revision');
  assert.equal(session.result.revisionId,session.revisionId);
  assert.equal(target.reports('author-demo')[0].attempt.revisionId,revisions[first]);
  assert.equal(target.currentDraft().content.words.find(w=>w.id==='w-ani').notes,'Pending draft');
  assert.equal(target.currentDraft().baseRevisionId,revisionId);
});

test('v1 backups still restore; attempts from uncarried revisions keep grades as explicit legacy links',t=>{
  const s=setup(t),first=s.get('active');const old=answer(s,'ex-1-type','אני',first);const second=publishWordNote(s,'Revision two');
  const v2=s.backup();
  const v1={...v2,format:'hebleo-demo-backup-v1',sessionSnapshots:[]};delete v1.revisionSnapshots;delete v1.activeRevisionId;delete v1.draft;delete v1.storeSchemaVersion;delete v1.mediaRecovery;delete v1.authorReview;
  const target=setup(t);target.restore(v1);
  const restored=target.learner(user).attempts.find(a=>a.requestId===old.requestId);
  assert.equal(restored.revisionId,null);assert.equal(restored.legacyRevisionId,first);assert.equal(restored.correct,true);
  assert.notEqual(second,null);
});

test('v2 restore rejects inconsistent backups atomically',t=>{
  const s=setup(t);answer(s,'ex-1-type','אני');const backup=s.backup();
  const target=setup(t);const before=target.backup();
  const mismatch=structuredClone(backup);mismatch.revisionSnapshots[0].content.words[0].english='tampered';
  assert.throws(()=>target.restore(mismatch),/active revision/);
  const dangling=structuredClone(backup);dangling.learners[0].state.attempts[0].revisionId=999;
  assert.throws(()=>target.restore(dangling),/attempt/);
  const after=target.backup();delete before.exportedAt;delete after.exportedAt;assert.deepEqual(after,before);
});

test('schema migration marks dangling history links legacy once and refuses newer databases',t=>{
  const dir=mkdtempSync(join(tmpdir(),'hebleo-migrate-'));const path=join(dir,'demo.sqlite');let s;
  t.after(()=>{try{s?.close();}catch{}rmSync(dir,{recursive:true,force:true,maxRetries:5,retryDelay:50});});s=new Store(path);const a=answer(s,'ex-1-type','אני');const state=s.learner(user);state.attempts[0].revisionId=4242;s.saveLearner(user,state);s.set('schema-version',1);s.close();
  s=new Store(path);const migrated=s.learner(user).attempts.find(x=>x.requestId===a.requestId);
  assert.equal(migrated.revisionId,null);assert.equal(migrated.legacyRevisionId,4242);assert.equal(s.get('schema-version'),STORE_SCHEMA_VERSION);
  s.set('schema-version',STORE_SCHEMA_VERSION+1);s.close();
  assert.throws(()=>new Store(path),/schema/);
});
