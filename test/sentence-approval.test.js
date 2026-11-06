import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {Store} from '../src/store.js';
import {createServer} from '../src/server.js';
import {lessonQuestionProgress} from '../public/ux.js';
const receipt=s=>({requestId:randomUUID(),revisionId:s.get('active'),lessonId:'lesson-2',exerciseId:'ex-2-order',sentenceMode:'complex',answer:'אני בביית'});
const context=a=>Object.fromEntries(['requestId','revisionId','lessonId','exerciseId'].map(k=>[k,a[k]]));

test('Type self-approval retains automatic grade, same receipt, report and drafts across database restart and backup restore',t=>{
 const folder=mkdtempSync(join(tmpdir(),'hebleo-sentence-'));assert.ok(resolve(folder).startsWith(resolve(tmpdir())));
 let store=new Store(join(folder,'state.sqlite'));t.after(()=>{store.close();rmSync(folder,{recursive:true,force:true});});
 const input=receipt(store),original=store.attempt('learner-demo',input);assert.equal(original.correct,false);
 const lesson=store.snapshot().lessons.find(l=>l.id===input.lessonId);
 for(const id of lesson.exerciseIds.filter(id=>id!==input.exerciseId)){
  const e=store.snapshot().exercises.find(e=>e.id===id),w=store.snapshot().words.find(w=>w.id===e.wordId);
  store.attempt('learner-demo',{requestId:randomUUID(),revisionId:input.revisionId,lessonId:lesson.id,exerciseId:id,answer:e.type==='recognition'?w.english:e.answers?.[0]||w.pointed});
 }
 store.saveProgress('learner-demo',{lessonId:input.lessonId,revisionId:input.revisionId,step:'apply',question:0,answer:input.answer,sentenceMode:'complex',selectedTokens:[0],matching:{},resultRequestId:input.requestId});
 const report=store.report('learner-demo',{requestId:randomUUID(),attemptId:input.requestId,reason:'answer',note:'Synthetic typo test'});
 const approved=store.approveSentenceAttempt('learner-demo',context(input));
 assert.equal(approved.correct,true);assert.equal(approved.selfApproved,true);assert.equal(approved.automaticGrade.correct,false);
 assert.equal(approved.answer,input.answer);assert.equal(approved.requestId,original.requestId);assert.equal(approved.at,original.at);assert.equal(approved.expected,original.expected);
 assert.ok(store.learner('learner-demo').completed.includes(lesson.id));
 assert.ok(!lessonQuestionProgress(lesson,store.learner('learner-demo').attempts,input.revisionId).missedIds.includes(input.exerciseId));
 assert.equal(store.get('report-learner-demo-'+report.requestId).attempt.selfApproved,true);
 const before=store.learner('learner-demo');assert.equal(store.approveSentenceAttempt('learner-demo',context(input)).duplicate,true);assert.deepEqual(store.learner('learner-demo'),before);
 assert.equal(store.attempt('learner-demo',input).selfApproved,true);
 store.close();store=new Store(join(folder,'state.sqlite'));
 const resumed=store.session('learner-demo',input.lessonId);assert.equal(resumed.result.selfApproved,true);assert.equal(resumed.result.automaticGrade.correct,false);assert.equal(resumed.progress.answer,input.answer);assert.deepEqual(resumed.progress.selectedTokens,[0]);
 const backup=store.backup(),restored=new Store();t.after(()=>restored.close());restored.restore(backup);
 assert.equal(restored.session('learner-demo',input.lessonId).result.selfApproved,true);
 const bad=structuredClone(backup),attempt=bad.learners.find(l=>l.id==='learner-demo').state.attempts.find(a=>a.requestId===input.requestId);attempt.automaticGrade.correct=true;
 assert.throws(()=>restored.restore(bad),/Invalid saved attempt/);
});

test('approval endpoint isolates learner and exact pinned attempt; Build, legacy, other types and mismatched mode are rejected',async t=>{
 const store=new Store();t.after(()=>store.close());const server=createServer(store);await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const post=async(path,user,input)=>{const response=await fetch('http://127.0.0.1:'+server.address().port+'/api/'+path,{method:'POST',headers:{'content-type':'application/json','x-demo-user':user},body:JSON.stringify(input)});return {status:response.status,body:await response.json()};};
 const input=receipt(store);assert.equal((await post('attempt','learner-demo',input)).body.sentenceMode,'complex');
 const untouched=store.learner('learner-core');assert.equal((await post('attempt/self-approve','learner-core',context(input))).status,404);assert.deepEqual(store.learner('learner-core'),untouched);
 const before=store.learner('learner-demo');for(const change of [{revisionId:999},{lessonId:'lesson-1'},{exerciseId:'ex-1-type'}])assert.equal((await post('attempt/self-approve','learner-demo',{...context(input),...change})).status,409);assert.deepEqual(store.learner('learner-demo'),before);
 assert.equal((await post('attempt','learner-demo',{...input,sentenceMode:'simple'})).status,409);
 for(const mode of ['simple',undefined]){const a={...receipt(store),sentenceMode:mode};await post('attempt','learner-demo',a);assert.equal((await post('attempt/self-approve','learner-demo',context(a))).status,400);}
 assert.equal((await post('attempt','learner-demo',{...receipt(store),sentenceMode:'forged'})).status,400);
 assert.equal((await post('attempt','learner-demo',{...receipt(store),exerciseId:'ex-1-type',lessonId:'lesson-1'})).status,400);
 const responses=await Promise.all([post('attempt/self-approve','learner-demo',context(input)),post('attempt/self-approve','learner-demo',context(input))]);assert.ok(responses.every(r=>r.status===200&&r.body.selfApproved));assert.equal(store.learner('learner-demo').attempts.filter(a=>a.requestId===input.requestId).length,1);
 const success=store.learner('learner-demo');await post('attempt/self-approve','learner-demo',context(input));assert.deepEqual(store.learner('learner-demo'),success);
});

test('failed approval transaction writes nothing, and approval uses the original revision after active content changes',t=>{
 const store=new Store();t.after(()=>store.close());const input=receipt(store),wrong=store.attempt('learner-demo',input),before=store.learner('learner-demo');
 const save=store.saveLearner.bind(store);store.saveLearner=()=>{throw new Error('Synthetic persistence failure');};
 assert.throws(()=>store.approveSentenceAttempt('learner-demo',context(input)),/persistence failure/);assert.deepEqual(store.learner('learner-demo'),before);store.saveLearner=save;
 const content=store.snapshot();content.exercises.find(e=>e.id===input.exerciseId).answers=['משפט אחר'];store.set('active',store.addRevision(content,'Synthetic pinned-revision test'));
 const approved=store.approveSentenceAttempt('learner-demo',context(input));assert.equal(approved.revisionId,input.revisionId);assert.equal(approved.expected,wrong.expected);assert.equal(approved.automaticGrade.expected,wrong.expected);
});
