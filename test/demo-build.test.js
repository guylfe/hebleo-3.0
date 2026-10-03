import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Store} from '../src/store.js';
import {createServer} from '../src/server.js';
import {demoBuildFingerprint} from '../src/demo-build.js';

function directory(t,cleanup=true){const dir=mkdtempSync(join(tmpdir(),'hebleo-build-'));if(cleanup)t.after(()=>rmSync(dir,{recursive:true,force:true}));return dir;}

test('Demo reset clears only progress for all three profiles once per build and survives process restart',t=>{
  const dir=directory(t,false),path=join(dir,'demo.sqlite');let store=new Store(path);t.after(()=>{store.close();rmSync(dir,{recursive:true,force:true});});
  store.resetDemoProgressForBuild('build-a');
  const content=store.snapshot();store.stage({baseRevisionId:store.get('active'),word:{id:'w-ani',notes:'Keep authored draft'}});
  for(const user of ['learner-demo','learner-core','author-demo']){
    store.updateLearner(user,{nikkud:'full',keyboardPinned:true});
    const attempt=store.attempt(user,{requestId:user+'-answer',revisionId:1,exerciseId:'ex-1-type',answer:'אני'});
    store.saveProgress(user,{lessonId:'lesson-1',revisionId:1,step:'apply',question:0,answer:'אני',matching:{},selectedTokens:[],resultRequestId:attempt.requestId,practiceIds:[]});
    store.enroll(user,'w-ani');store.review(user,{requestId:user+'-review',wordId:'w-ani',rating:3});
    const state=store.learner(user);state.completed=['lesson-1'];store.saveLearner(user,state);
  }
  const membership=store.learner('learner-core').membership;
  store.close();store=new Store(path);assert.equal(store.resetDemoProgressForBuild('build-a'),false);assert.equal(store.learner('learner-demo').attempts.length,1);
  assert.equal(store.resetDemoProgressForBuild('build-b'),true);
  for(const user of ['learner-demo','learner-core','author-demo']){
    const state=store.learner(user);assert.deepEqual(state.attempts,[]);assert.deepEqual(state.completed,[]);assert.deepEqual(state.resumes,{});assert.deepEqual(state.cards,{});assert.equal(state.lastReview,null);assert.equal(state.lastLessonId,undefined);
    assert.equal(state.preferences.nikkud,'full');assert.equal(state.preferences.keyboardPinned,true);
  }
  assert.equal(store.learner('learner-core').membership,membership);assert.deepEqual(store.snapshot(),content);assert.equal(store.get('draft').content.words.find(w=>w.id==='w-ani').notes,'Keep authored draft');assert.deepEqual(store.backup().reviewReceipts,[]);
  store.attempt('learner-demo',{requestId:'fresh-answer',revisionId:1,exerciseId:'ex-1-type',answer:'אני'});assert.equal(store.resetDemoProgressForBuild('build-b'),false);assert.equal(store.learner('learner-demo').attempts.length,1);
});

test('Running demo API resets on a changed build while ordinary refreshes retain new progress',async t=>{
  const store=new Store();let build='build-a';const server=createServer(store,{demoBuild:async()=>build});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));store.close();});const base='http://127.0.0.1:'+server.address().port;
  const bootstrap=async()=>{const response=await fetch(base+'/api/bootstrap');assert.equal(response.status,200);return response.json();};
  await bootstrap();await fetch(base+'/api/attempt',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({requestId:'saved',revisionId:1,exerciseId:'ex-1-type',answer:'אני'})});
  assert.equal((await bootstrap()).learner.attempts.length,1);assert.equal((await bootstrap()).learner.attempts.length,1);
  build='build-b';assert.deepEqual((await bootstrap()).learner.attempts,[]);assert.equal(store.get('demo-progress-build'),'build-b');
});

test('Demo fingerprint detects app edits, ignores documentation edits and normalizes Windows line endings',async t=>{
  const dir=directory(t);mkdirSync(join(dir,'public'));mkdirSync(join(dir,'src'));writeFileSync(join(dir,'package-lock.json'),'{}');writeFileSync(join(dir,'public','app.js'),'one\ntwo\n');writeFileSync(join(dir,'src','store.js'),'store');
  const initial=await demoBuildFingerprint(dir);writeFileSync(join(dir,'public','app.js'),'one\r\ntwo\r\n');assert.equal(await demoBuildFingerprint(dir),initial);
  writeFileSync(join(dir,'README.md'),'Documentation change');assert.equal(await demoBuildFingerprint(dir),initial);
  writeFileSync(join(dir,'public','app.js'),'different');assert.notEqual(await demoBuildFingerprint(dir),initial);
});
