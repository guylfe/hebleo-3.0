import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Store} from '../src/store.js';
import {createServer} from '../src/server.js';

// QA-EE9-G4-02: a matching exercise may pair any existing pack word, so saved learner matches are checked
// against the matching question at the progress's own pinned revision, step and position, not the lesson's word list.
// Revision 1 is the seed (ex-1-match pairs w-hu, w-hi, w-mi). Revision 2 pairs w-ani, w-mi and w-sham; w-sham is not in lesson-1's list.
const user='learner-demo',profiles=['learner-demo','learner-core','author-demo'];
const refused='Invalid saved matching answer.';
const dump=s=>JSON.stringify(s.db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(({name})=>[name,s.db.prepare('SELECT * FROM "'+name+'" ORDER BY 1').all()]));
const changes=s=>s.db.prepare('SELECT total_changes() AS n').get().n;
const at=patch=>({lessonId:'lesson-1',revisionId:2,step:'apply',question:1,answer:'',selectedTokens:[],matching:{},resultRequestId:null,practiceIds:[],...patch});
const english=(s,revisionId,ids)=>Object.fromEntries(ids.map(id=>[id,s.snapshot(revisionId).words.find(w=>w.id===id).english]));
function crossLesson(){
  const s=new Store(),c=structuredClone(s.snapshot()),ex=c.exercises.find(e=>e.id==='ex-1-match');
  ex.wordIds=['w-ani','w-mi','w-sham'];ex.sourceRef={sheet:'fixture-only',row:3};ex.extension={unknown:['retain',{nested:true}]};
  const staged=s.stage({baseRevisionId:1,expectedDraftToken:null,content:c});s.publish(1,staged.draftToken);
  assert.equal(s.get('active'),2);
  assert.ok(!s.snapshot(2).lessons.find(l=>l.id==='lesson-1').wordIds.includes('w-sham'));
  return s;
}
const state=s=>({learners:profiles.map(u=>s.learner(u)),before:dump(s),n:changes(s)});
function unchanged(s,was){assert.equal(changes(s),was.n);assert.equal(dump(s),was.before);profiles.forEach((u,i)=>assert.deepEqual(s.learner(u),was.learners[i]));}

test('a partial match on an authored pair word outside the lesson list saves, resumes, and the full set grades and completes the lesson',t=>{
  const s=crossLesson();t.after(()=>s.close());
  const others=['learner-core','author-demo'].map(u=>s.learner(u));
  // QA's repro: this exact save was refused with 400 before the fix.
  assert.deepEqual(s.saveProgress(user,at({matching:{'w-sham':'there'}})).matching,{'w-sham':'there'});
  let session=s.session(user,'lesson-1');
  assert.equal(session.revisionId,2);assert.deepEqual(session.progress.matching,{'w-sham':'there'});
  const ex=session.content.exercises.find(e=>e.id==='ex-1-match');
  assert.deepEqual(ex.wordIds,['w-ani','w-mi','w-sham']);assert.deepEqual([ex.sourceRef,ex.extension],[{sheet:'fixture-only',row:3},{unknown:['retain',{nested:true}]}]);
  s.saveProgress(user,at({matching:{'w-sham':'there','w-ani':'I'}}));
  assert.deepEqual(s.session(user,'lesson-1').progress.matching,{'w-sham':'there','w-ani':'I'});
  // Retry path: a one-question practice set holding the matching exercise.
  s.saveProgress(user,at({question:0,practiceIds:['ex-1-match'],matching:{'w-sham':'there'}}));
  assert.deepEqual(s.session(user,'lesson-1').progress.practiceIds,['ex-1-match']);
  const full=english(s,2,['w-ani','w-mi','w-sham']);assert.deepEqual(full,{'w-ani':'I','w-mi':'who','w-sham':'there'});
  const wrong=s.attempt(user,{requestId:randomUUID(),revisionId:2,exerciseId:'ex-1-match',answer:{'w-ani':'I','w-mi':'there','w-sham':'who'}});
  assert.equal(wrong.correct,false);
  s.attempt(user,{requestId:randomUUID(),revisionId:2,exerciseId:'ex-1-recognize',answer:'who'});
  s.attempt(user,{requestId:randomUUID(),revisionId:2,exerciseId:'ex-1-type',answer:'אני'});
  assert.equal(s.learner(user).completed.includes('lesson-1'),false);
  const right=s.attempt(user,{requestId:randomUUID(),revisionId:2,exerciseId:'ex-1-match',answer:full});
  assert.equal(right.correct,true);assert.ok(s.learner(user).completed.includes('lesson-1'));
  s.saveProgress(user,at({matching:full,resultRequestId:right.requestId}));
  session=s.session(user,'lesson-1');
  assert.deepEqual(session.progress.matching,full);assert.equal(session.result.requestId,right.requestId);assert.equal(session.result.correct,true);
  assert.deepEqual(['learner-core','author-demo'].map(u=>s.learner(u)),others);
});

test('saved matches are refused unless every key belongs to the matching question at that exact revision, step and position; nothing is written',t=>{
  const s=crossLesson();t.after(()=>s.close());
  const cases={
    'lesson word no longer paired in revision 2 (accepted before the fix)':at({matching:{'w-hu':'he'}}),
    'one owned key plus one lesson word not in this exercise':at({matching:{'w-sham':'there','w-hi':'she'}}),
    'unknown word':at({matching:{'w-unknown':'fixture'}}),
    'reserved key':at({matching:JSON.parse('{"__proto__":"fixture"}')}),
    'Apply question 0 is the typing exercise':at({question:0,matching:{'w-mi':'who'}}),
    'Check question 0 is the recognition exercise':at({step:'check',question:0,matching:{'w-mi':'who'}}),
    'Learn is not an exercise portion even if the index maps to a match':at({step:'learn',question:1,matching:{'w-mi':'who'}}),
    'Vocabulary is not an exercise portion even if the index maps to a match':at({step:'vocabulary',question:1,matching:{'w-mi':'who'}}),
    'Finish is not an exercise portion even if the index maps to a match':at({step:'complete',question:1,matching:{'w-mi':'who'}}),
    'practice set holding the typing exercise':at({question:0,practiceIds:['ex-1-type'],matching:{'w-sham':'there'}}),
    'revision 1 never paired w-sham':at({revisionId:1,matching:{'w-sham':'there'}}),
    'non-string meaning':at({matching:{'w-sham':5}}),
    'oversized meaning':at({matching:{'w-sham':'x'.repeat(1001)}}),
    'array':at({matching:[]}),
    'null':at({matching:null}),
  };
  for(const [name,input] of Object.entries(cases)){
    const was=state(s);
    assert.throws(()=>s.saveProgress(user,input),e=>e.status===400&&e.code==='BAD_REQUEST'&&e.message===refused,name);
    unchanged(s,was);
  }
  // Controls: each revision's own pairs are accepted when pinned to that revision, and empty maps fit any position.
  s.saveProgress(user,at({revisionId:1,matching:{'w-hu':'he'}}));assert.deepEqual(s.learner(user).resumes['lesson-1'].matching,{'w-hu':'he'});
  for(const position of [{question:0},{step:'check',question:0},{step:'learn',question:0},{step:'complete',question:0}])s.saveProgress(user,at({...position,matching:{}}));
});

test('Check, Core and repeat practice use their own matching question; empty matches preserve transitions and legacy v1 restores',t=>{
  const s=crossLesson();t.after(()=>s.close());
  const c=structuredClone(s.snapshot()),lesson=c.lessons.find(l=>l.id==='lesson-1');
  c.exercises.push({...structuredClone(c.exercises.find(e=>e.id==='ex-1-match')),id:'ex-1-match-core',wordIds:['w-hu','w-hi']});
  lesson.exerciseIds.push('ex-1-match-core');lesson.checkExerciseIds=['ex-1-match'];
  s.publish(2,s.stage({baseRevisionId:2,expectedDraftToken:null,content:c}).draftToken);
  const check=at({revisionId:3,step:'check',question:0,matching:{'w-sham':'there'}});
  const core=at({revisionId:3,question:2,matching:{'w-hu':'he'}});
  const repeat=at({revisionId:3,question:1,practiceIds:['ex-1-match-core','ex-1-match'],matching:{'w-sham':'there'}});
  for(const p of [check,core,repeat]){
    s.saveProgress(user,p);assert.deepEqual({...s.session(user,'lesson-1').progress,updatedAt:undefined},{...p,updatedAt:undefined});
    const was=state(s),other=p.matching['w-sham']?{'w-hu':'he'}:{'w-sham':'there'};
    assert.throws(()=>s.saveProgress(user,{...p,matching:other}),{message:refused});unchanged(s,was);
    for(const step of ['learn','vocabulary','complete']){
      assert.throws(()=>s.saveProgress(user,{...p,step}),{message:refused});unchanged(s,was);
    }
  }
  for(const step of ['learn','check','vocabulary','apply','complete']){
    s.saveProgress(user,at({revisionId:3,step,question:2}));assert.deepEqual(s.session(user,'lesson-1').progress.matching,{});
  }
  s.saveProgress(user,check);s.saveProgress('learner-core',core);s.saveProgress('author-demo',repeat);
  const v1=s.backup();v1.format='hebleo-demo-backup-v1';v1.sessionSnapshots=v1.revisionSnapshots;delete v1.revisionSnapshots;delete v1.storeSchemaVersion;delete v1.mediaRecovery;
  const fresh=new Store();t.after(()=>fresh.close());fresh.restore(v1);
  for(const [u,p] of [[user,check],['learner-core',core],['author-demo',repeat]]){
    const session=fresh.session(u,'lesson-1');
    assert.deepEqual({...session.progress,revisionId:undefined,updatedAt:undefined},{...p,revisionId:undefined,updatedAt:undefined});
    assert.equal(session.revisionId,session.progress.revisionId);
    assert.deepEqual(fresh.snapshot(session.revisionId),c);
  }
  const bad=structuredClone(v1);bad.learners.find(r=>r.id===user).state.resumes['lesson-1'].matching={'w-hu':'he'};
  const was=state(fresh);assert.throws(()=>fresh.restore(bad),{message:refused});unchanged(fresh,was);
});

test('backup restore keeps cross-lesson and older-revision matches and refuses a resume whose keys its pinned matching question does not own',t=>{
  const s=crossLesson();t.after(()=>s.close());
  s.saveProgress('learner-demo',at({matching:{'w-sham':'there'}}));
  s.saveProgress('learner-core',at({revisionId:1,matching:{'w-hu':'he'}}));
  const backup=s.backup(),fresh=new Store();t.after(()=>fresh.close());
  fresh.restore(backup);
  // Restore maps each backup revision to a new local revision; each resume stays pinned to the content it was saved against.
  for(const [u,pairs] of [['learner-demo',['w-ani','w-mi','w-sham']],['learner-core',['w-hu','w-hi','w-mi']]]){
    const before=s.learner(u).resumes['lesson-1'],session=fresh.session(u,'lesson-1');
    assert.deepEqual({...session.progress,revisionId:undefined},{...before,revisionId:undefined});
    assert.equal(session.revisionId,session.progress.revisionId);
    assert.deepEqual(session.content.exercises.find(e=>e.id==='ex-1-match').wordIds,pairs);
  }
  const tampered=(u,matching)=>{const b=structuredClone(backup);b.learners.find(r=>r.id===u).state.resumes['lesson-1'].matching=matching;return b;};
  const was=state(s);
  assert.throws(()=>s.restore(tampered('learner-demo',{'w-hu':'he'})),{message:refused});
  assert.throws(()=>s.restore(tampered('learner-core',{'w-sham':'there'})),{message:refused});
  unchanged(s,was);
  // Control: the untampered backup still restores.
  s.restore(backup);assert.deepEqual(s.session('learner-demo','lesson-1').progress.matching,{'w-sham':'there'});
});

test('HTTP: progress with a cross-lesson pair word saves (200) and resumes; a key the question does not own returns 400 and writes nothing',async t=>{
  const s=crossLesson(),server=createServer(s);await new Promise(r=>server.listen(0,'127.0.0.1',r));
  t.after(async()=>{await new Promise(r=>server.close(r));s.close();});const base='http://127.0.0.1:'+server.address().port;
  const call=async(path,body)=>{const r=await fetch(base+'/api/'+path,body?{method:'POST',headers:{'content-type':'application/json','x-demo-user':user},body:JSON.stringify(body)}:{headers:{'x-demo-user':user}});return {status:r.status,body:await r.json()};};
  const saved=await call('progress',at({matching:{'w-sham':'there'}}));
  assert.equal(saved.status,200);assert.deepEqual(saved.body.matching,{'w-sham':'there'});
  const resumed=await call('session?lessonId=lesson-1');
  assert.equal(resumed.status,200);assert.equal(resumed.body.revisionId,2);assert.deepEqual(resumed.body.progress.matching,{'w-sham':'there'});
  const was=state(s);
  for(const input of [at({matching:{'w-hu':'he'}}),at({revisionId:1,matching:{'w-sham':'there'}}),at({question:0,matching:{'w-sham':'there'}})])
    assert.deepEqual(await call('progress',input),{status:400,body:{error:refused,code:'BAD_REQUEST'}});
  unchanged(s,was);
  const graded=await call('attempt',{requestId:randomUUID(),revisionId:2,exerciseId:'ex-1-match',answer:{'w-ani':'I','w-mi':'who','w-sham':'there'}});
  assert.equal(graded.status,200);assert.equal(graded.body.correct,true);
});
