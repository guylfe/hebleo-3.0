import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Store} from '../src/store.js';
import {evaluateAnswer,normalizeHebrew} from '../src/evaluate.js';
import {hasGradingContent} from '../public/answer-policy.js';
import {validateExerciseDraft} from '../public/studio/exercise-editor.js';
import {projectLesson,deriveLessonIndices} from '../public/course.js';
import {createServer} from '../src/server.js';
const U='learner-demo',A='author-demo';
const state=b=>b.learners.find(l=>l.id===U).state;
const rows=s=>JSON.stringify(Object.fromEntries(['kv','revisions','learners','events','sqlite_sequence'].map(t=>[t,s.db.prepare('SELECT * FROM '+t+' ORDER BY 1').all()])));
const changes=s=>s.db.prepare('SELECT total_changes() AS n').get().n;
const setup=t=>{const s=new Store();t.after(()=>s.close());return s;};
function rejectWithoutWrites(s,fn){const before=rows(s),n=changes(s);assert.throws(fn);assert.equal(rows(s),before);assert.equal(changes(s),n);}
function shared(s){const c=s.snapshot();c.lessons=c.lessons.map(l=>projectLesson(c,l));c.lessons[1].blocks.push({id:'synthetic-shared',type:'exercise-set',source:'exercises',renderer:'practice',role:'apply',selector:{mode:'ids',ids:['ex-1-type']}});c.lessons=c.lessons.map(l=>deriveLessonIndices(c,l));const d=s.stage({content:c,baseRevisionId:s.get('active'),expectedDraftToken:null});return s.publish(s.get('active'),d.draftToken).revisionId;}
function grade(s,rev,lessonId='lesson-1',requestId=randomUUID()){return s.attempt(U,{requestId,revisionId:rev,lessonId,exerciseId:'ex-1-type',answer:'אני'});}
function resume(s,a){s.saveProgress(U,{lessonId:a.lessonId,revisionId:a.revisionId,componentId:a.lessonId==='lesson-2'?'synthetic-shared':s.session(U,a.lessonId).flow.find(p=>p.exerciseIds?.includes(a.exerciseId)).blockId,step:'apply',question:0,answer:a.answer,selectedTokens:[],matching:{},practiceIds:[],resultRequestId:a.requestId});}
async function http(t,s){const server=createServer(s);await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));return async(path,user,body)=>{const response=await fetch('http://127.0.0.1:'+server.address().port+'/api/'+path,{method:'POST',headers:{'content-type':'application/json','x-demo-user':user},body:JSON.stringify(body)});return {status:response.status,body:await response.json()};};}

for(const type of ['typing','cloze','transformation','ordering'])test('QA-NEW7-01 '+type+' rejects empty-effective keys atomically and never grades an empty-effective response correct',async t=>{
 const s=setup(t),c=s.snapshot(),e=c.exercises.find(e=>e.type===type),post=await http(t,s);
 for(const key of ['ַ','  ״... ! ?  ','\u200fַ\u2066','\u0301','\u200b']){
  e.answers=[key];const before=rows(s),n=changes(s),source=JSON.stringify(e);
  assert.throws(()=>validateExerciseDraft(e,c),/content beyond marks/);assert.equal(JSON.stringify(e),source);
  assert.equal(evaluateAnswer(e,c,'').correct,false);assert.equal(evaluateAnswer(e,c,key).correct,false);
  const input={baseRevisionId:1,expectedDraftToken:null,content:c};
  assert.equal((await post('studio/impact',A,input)).status,400);assert.equal((await post('studio/draft',A,input)).status,400);
  assert.equal(rows(s),before);assert.equal(changes(s),n);
 }
 e.answers=['  אֲנִי  '];const d=s.stage({content:c,baseRevisionId:1,expectedDraftToken:null}),rev=s.publish(1,d.draftToken).revisionId;
 assert.deepEqual(s.snapshot().exercises.find(x=>x.id===e.id).answers,e.answers);
 for(const answer of ['', 'ַ','... ?!','\u200b']){const r=await post('attempt',U,{requestId:randomUUID(),revisionId:rev,exerciseId:e.id,answer});assert.equal(r.status,200);assert.equal(r.body.correct,false);}
 assert.equal(evaluateAnswer(e,c,'אני').correct,true);assert.equal(normalizeHebrew('  אֲנִי.  '),'אני');
});
test('QA-NEW7-01 omitted typing defaults cannot contain a mark-only accepted form',t=>{
 const s=setup(t),c=s.snapshot(),e=c.exercises.find(e=>e.type==='typing');delete e.answers;c.words.find(w=>w.id===e.wordId).pointed='ַ';
 rejectWithoutWrites(s,()=>s.stage({content:c,baseRevisionId:1,expectedDraftToken:null}));
 assert.equal(evaluateAnswer(e,c,'').correct,false);assert.equal(hasGradingContent(' אֲנִי '),true);
});
test('RR-NEW7-01 rejects duplicate identical and conflicting receipts with or without resumed feedback',async t=>{
 const s=setup(t),rev=shared(s),a=grade(s,rev),b=grade(s,rev,'lesson-2');resume(s,b);const d=setup(t),post=await http(t,d);
 for(const duplicate of [structuredClone(a),{...a,correct:false},{...a,lessonId:'lesson-2',correct:false}]){
  for(const withResume of [false,true]){const backup=s.backup();state(backup).attempts.push(duplicate);if(!withResume)state(backup).resumes={};
   const before=rows(d),n=changes(d);assert.equal((await post('restore',A,backup)).status,400);assert.equal(rows(d),before);assert.equal(changes(d),n);
  }
 }
 const restored=d.restore(s.backup());assert.equal(d.session(U,'lesson-2').result.requestId,b.requestId);assert.equal(d.session(U,'lesson-2').result.revisionId,restored.revisions[rev]);
});
test('RR-NEW7-01 receipt ID uniqueness retains its per-learner scope',t=>{
 const s=setup(t),id='synthetic-same-per-user';grade(s,1,'lesson-1',id);s.attempt('learner-core',{requestId:id,revisionId:1,exerciseId:'ex-1-type',answer:'אני'});
 const d=setup(t);d.restore(s.backup());for(const u of [U,'learner-core'])assert.equal(d.learner(u).attempts[0].requestId,id);
});
test('RR-NEW7-01 session refuses ambiguous or foreign contextual feedback in a damaged Store without writes',t=>{
 const s=setup(t),rev=shared(s),a=grade(s,rev,'lesson-2');resume(s,a);const original=s.learner(U);
 for(const attempts of [[{...a,lessonId:'lesson-1'}],[{...a,lessonId:'lesson-1'},a],[{...a,exerciseId:'ex-2-cloze'}],[{...a,revisionId:1}]]){
  const damaged=structuredClone(original);damaged.attempts=attempts;s.saveLearner(U,damaged);rejectWithoutWrites(s,()=>s.session(U,'lesson-2'));
 }
 s.saveLearner(U,original);assert.equal(s.session(U,'lesson-2').result.lessonId,'lesson-2');
});
test('RR-NEW7-02 report and surviving history must agree on context, submitted answer and recorded grade without regrading',async t=>{
 const s=setup(t),rev=shared(s),a=grade(s,rev);s.report(U,{requestId:'synthetic-report',attemptId:a.requestId,reason:'answer',note:'SYNTHETIC corruption regression'});const d=setup(t),post=await http(t,d);
 const mutations=[x=>x.lessonId='lesson-2',x=>x.revisionId=1,x=>x.answer='SYNTHETIC other',x=>x.correct=false,x=>x.expected='SYNTHETIC other',x=>x.evaluationPolicy='SYNTHETIC other',x=>x.pairResults={synthetic:true},x=>x.at='2025-01-01T00:00:00.000Z',x=>x.legacyRevisionId=123];
 for(const mutate of mutations){const backup=s.backup();mutate(backup.reports[0].value.attempt);const before=rows(d),n=changes(d);assert.equal((await post('restore',A,backup)).status,400);assert.equal(rows(d),before);assert.equal(changes(d),n);}
 const valid=s.backup(),copy=valid.reports[0].value.attempt;valid.reports[0].value.attempt=Object.fromEntries(Object.entries(copy).reverse());d.restore(valid);assert.equal(d.reports(A)[0].attempt.correct,true);
});
test('RR-NEW7-02 retains standalone reports after deliberate progress clearing',t=>{
 const s=setup(t),a=grade(s,1);s.report(U,{requestId:'synthetic-standalone',attemptId:a.requestId,reason:'answer',note:'SYNTHETIC retained history'});const backup=s.backup();state(backup).attempts=[];state(backup).resumes={};state(backup).completed=[];
 const d=setup(t);const r=d.restore(backup);assert.equal(d.learner(U).attempts.length,0);assert.equal(d.reports(A)[0].attempt.correct,a.correct);assert.equal(d.reports(A)[0].attempt.revisionId,r.revisions[a.revisionId]);
});
test('RR-NEW7-02 preserves exact legacy grade copies and rejects mismatched legacy-link metadata',t=>{
 const s=setup(t),a=grade(s,1);s.report(U,{requestId:'synthetic-legacy',attemptId:a.requestId,reason:'answer',note:'SYNTHETIC legacy'});const backup=s.backup();
 for(const x of [state(backup).attempts[0],backup.reports[0].value.attempt]){x.revisionId=null;x.legacyRevisionId=77;delete x.evaluationPolicy;x.correct=false;}
 const d=setup(t);d.restore(backup);assert.equal(d.learner(U).attempts[0].correct,false);assert.equal(d.reports(A)[0].attempt.legacyRevisionId,77);
 const bad=structuredClone(backup);bad.reports[0].value.attempt.legacyRevisionId=78;rejectWithoutWrites(d,()=>d.restore(bad));
});

test('browser module dependency graph serves as JavaScript over real HTTP, including shared answer policy',async t=>{
 const s=setup(t),server=createServer(s);await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const base='http://127.0.0.1:'+server.address().port,queue=['/app.js','/studio/unified-studio.js','/preview/learner-renderer.js'],seen=new Set(),before=rows(s),n=changes(s);
 while(queue.length){const path=queue.pop();if(seen.has(path))continue;seen.add(path);const response=await fetch(base+path);assert.equal(response.status,200,path);assert.match(response.headers.get('content-type'),/javascript/,path);const source=await response.text();
  const references=[...source.matchAll(/\b(?:import|export)\s+(?:[^'";]*?\s+from\s+)?['"](\.{1,2}\/[^'"]+)['"]/g),...source.matchAll(/\bimport\s*\(\s*['"](\.{1,2}\/[^'"]+)['"]/g)];
  for(const match of references)queue.push(new URL(match[1],base+path).pathname);
 }
 assert.ok(seen.has('/answer-policy.js'));assert.equal(rows(s),before);assert.equal(changes(s),n);
});
