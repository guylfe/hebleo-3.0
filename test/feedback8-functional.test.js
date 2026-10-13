import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Store,STORE_SCHEMA_VERSION} from '../src/store.js';
import {createServer} from '../src/server.js';
import {scheduleReview,reviewIntervalLabel} from '../public/review-schedule.js';

const author='author-demo',alex='learner-demo',sam='learner-core';
const tables=s=>JSON.parse(JSON.stringify(Object.fromEntries(['revisions','kv','learners','events','sqlite_sequence'].map(t=>[t,s.db.prepare('SELECT * FROM '+t+' ORDER BY 1').all()]))));
const setup=t=>{const s=new Store();t.after(()=>s.close());return s;};
const post=(s,extra={})=>({requestId:randomUUID(),revisionId:s.get('active'),lessonId:'lesson-1',question:'SYNTHETIC lesson comment',discussionVersion:1,anonymous:true,...extra});

test('FB8 discussions share opt-in comments without exposing anonymous identity; old private questions remain private',t=>{
  const s=setup(t),legacy=post(s,{requestId:'private-1'});delete legacy.discussionVersion;delete legacy.anonymous;
  const old=s.askQuestion(alex,legacy),before=structuredClone(s.get('question-'+alex+'-private-1'));
  const input=post(s,{requestId:'alex-internal-replay'}),anonymous=s.askQuestion(alex,input);
  assert.equal(anonymous.posterName,'Anonymous');assert.equal(anonymous.own,true);
  assert.equal(s.askQuestion(alex,input).commentId,anonymous.commentId);
  assert.throws(()=>s.askQuestion(alex,{...input,anonymous:false}),e=>e.status===409);
  s.askQuestion(alex,post(s,{anonymous:false,question:'SYNTHETIC named comment'}));
  const shared=s.questions(sam);assert.equal(shared.length,2);assert.equal(shared.find(q=>q.anonymous).posterName,'Anonymous');
  for(const q of shared){assert.equal(q.own,false);for(const key of ['userId','requestId','avatar','moderation'])assert.equal(Object.hasOwn(q,key),false);}
  assert.equal(shared.find(q=>!q.anonymous).posterName,'Alex');
  const raw=s.questions(author).find(q=>q.commentId===anonymous.commentId);assert.equal(raw.userId,alex);assert.equal(raw.requestId,input.requestId);
  s.answerQuestion(author,{userId:alex,requestId:input.requestId,answer:'SYNTHETIC author reply'});
  assert.equal(s.questions(sam).find(q=>q.commentId===anonymous.commentId).answer,'SYNTHETIC author reply');
  assert.deepEqual(s.get('question-'+alex+'-private-1'),before);assert.equal(s.questions(alex).find(q=>q.requestId===old.requestId).question,old.question);
  assert.throws(()=>s.moderateQuestion(author,{userId:alex,requestId:old.requestId,action:'keep'}));
  s.entitlement(sam,{eventId:randomUUID(),type:'course_refunded'});assert.deepEqual(s.questions(sam),[]);
});

test('FB8 moderation is author-only, soft and audited; old/new records and revision pins survive backup restore',t=>{
  const s=setup(t),input=post(s),q=s.askQuestion(alex,input),pin=q.revisionId;
  const before=tables(s);
  for(const user of [alex,sam])assert.throws(()=>s.moderateQuestion(user,{userId:alex,requestId:input.requestId,action:'remove'}),e=>e.status===403);
  assert.deepEqual(tables(s),before);
  s.moderateQuestion(author,{userId:alex,requestId:input.requestId,action:'keep'});
  s.moderateQuestion(author,{userId:alex,requestId:input.requestId,action:'remove'});
  assert.deepEqual(s.questions(sam),[]);assert.deepEqual(s.questions(alex),[]);
  assert.deepEqual(s.questions(author),[]);const raw=s.questionAudit(author)[0];assert.equal(raw.question,input.question);assert.equal(raw.revisionId,pin);assert.deepEqual(raw.moderation.map(m=>m.action),['keep','remove']);
  const removed=tables(s);s.moderateQuestion(author,{userId:alex,requestId:input.requestId,action:'remove'});assert.deepEqual(tables(s),removed);
  const b=s.backup(),d=setup(t),r=d.restore(b);assert.deepEqual(d.questions(author),[]);const restored=d.questionAudit(author)[0];
  assert.equal(restored.commentId,q.commentId);assert.deepEqual(restored.moderation,raw.moderation);assert.equal(restored.revisionId,r.revisions[pin]);assert.deepEqual(d.questions(sam),[]);
  d.moderateQuestion(author,{userId:alex,requestId:input.requestId,action:'keep'});assert.equal(d.questions(sam).length,1);
  assert.deepEqual(d.questions(author)[0].moderation.map(m=>m.action),['keep','remove','keep']);
});

test('FB8 invalid anonymity, identity and moderation restores reject atomically',t=>{
  const s=setup(t);s.askQuestion(alex,post(s));const good=s.backup(),d=setup(t);
  const mutations=[q=>q.anonymous='true',q=>q.discussionVersion=2,q=>q.commentId='learner-demo',q=>q.visibility='removed',q=>q.moderation=[{action:'remove',by:alex,at:new Date().toISOString()}],q=>q.moderation=[{action:'keep',by:author,at:'bad'}],q=>{delete q.discussionVersion;}];
  for(const mutate of mutations){const bad=structuredClone(good);mutate(bad.questions[0].value);const before=tables(d);assert.throws(()=>d.restore(bad));assert.deepEqual(tables(d),before);}
  const dupe=structuredClone(good),second=structuredClone(dupe.questions[0]);second.value.requestId='second';second.key='question-'+alex+'-second';dupe.questions.push(second);const before=tables(d);assert.throws(()=>d.restore(dupe));assert.deepEqual(tables(d),before);
  assert.throws(()=>s.askQuestion(alex,post(s,{anonymous:'yes'})));assert.throws(()=>s.askQuestion(alex,post(s,{discussionVersion:undefined})));
});

test('FB8 schema-3 migration retains all private questions, drafts and learner state; schema-2/3 backups remain restorable',t=>{
  const dir=mkdtempSync(join(tmpdir(),'hebleo-fb8-'));const path=join(dir,'isolated.sqlite');
  let s=new Store(path);const input=post(s);delete input.discussionVersion;delete input.anonymous;s.askQuestion(alex,input);
  s.stage({content:s.snapshot(),baseRevisionId:s.get('active'),expectedDraftToken:null});s.updateLearner(alex,{bookmark:'w-ani',note:{wordId:'w-ani',text:'SYNTHETIC saved note'}});
  s.set('schema-version',3);const before=tables(s);s.close();s=new Store(path);t.after(()=>{s.close();rmSync(dir,{recursive:true,force:true});});const after=tables(s);
  assert.equal(s.get('schema-version'),STORE_SCHEMA_VERSION);for(const t of Object.keys(before))assert.deepEqual(after[t],t==='kv'?before[t].map(r=>r.key==='schema-version'?{...r,value:JSON.stringify(STORE_SCHEMA_VERSION)}:r):before[t]);
  for(const version of [2,3]){const backup=s.backup();backup.storeSchemaVersion=version;delete backup.mediaRecovery;const d=setup(t);d.restore(backup);assert.equal(d.questions(sam).length,0);assert.equal(d.questions(author)[0].question,input.question);assert.ok(d.currentDraft());}
});

test('FB8 rating choices equal persisted schedule after successive ratings, Undo and a midnight boundary',t=>{
  const s=setup(t);s.enroll(alex,'w-ani');const originalNow=Date.now;let clock=Date.parse('2026-10-09T23:59:50Z');Date.now=()=>clock;t.after(()=>{Date.now=originalNow;});
  for(const rating of [3,4,2,3,1,4]){
    const before=structuredClone(s.learner(alex).cards['w-ani']);
    const choices=[1,2,3,4].map(r=>scheduleReview(before,r,clock));
    assert.equal(reviewIntervalLabel(choices[0].delayMs),'10 minutes');assert.equal(choices[1].delayMs,86400000);
    const requestId=randomUUID(),result=s.review(alex,{wordId:'w-ani',requestId,rating,expectedCard:before});
    assert.deepEqual(result.card,choices[rating-1].card);assert.equal(Date.parse(result.card.due)-clock,choices[rating-1].delayMs);
    s.undoReview(alex,{requestId});assert.deepEqual(s.learner(alex).cards['w-ani'],before);
    const persisted=s.review(alex,{wordId:'w-ani',requestId:randomUUID(),rating,expectedCard:before});assert.deepEqual(persisted.card,choices[rating-1].card);clock+=100000;
  }
  const stale=structuredClone(s.learner(alex).cards['w-ani']);s.review(alex,{wordId:'w-ani',requestId:randomUUID(),rating:4});const before=tables(s);
  assert.throws(()=>s.review(alex,{wordId:'w-ani',requestId:randomUUID(),rating:3,expectedCard:stale}),e=>e.status===409&&e.code==='REVIEW_CARD_CHANGED');assert.deepEqual(tables(s),before);
});

test('FB8 real HTTP projections omit anonymous identifiers and moderation route refuses learners with zero writes',async t=>{
  const s=setup(t),server=createServer(s);await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));const base='http://127.0.0.1:'+server.address().port;
  const request=(path,user,input)=>fetch(base+'/api/'+path,{method:input?'POST':'GET',headers:{'x-demo-user':user,...(input?{'content-type':'application/json'}:{})},...(input?{body:JSON.stringify(input)}:{})});
  const input=post(s),r=await request('questions',alex,input);assert.equal(r.status,200);const q=await r.json();assert.equal(q.posterName,'Anonymous');assert.equal(Object.hasOwn(q,'userId'),false);
  const before=tables(s);assert.equal((await request('questions/moderate',sam,{userId:alex,requestId:input.requestId,action:'remove'})).status,403);assert.deepEqual(tables(s),before);
  const shared=await (await request('questions',sam)).json();assert.equal(shared.length,1);assert.equal(JSON.stringify(shared).includes(input.requestId),false);assert.equal(JSON.stringify(shared).includes(alex),false);assert.equal(JSON.stringify(shared).includes('Alex'),false);
  assert.equal((await request('questions/moderate',author,{userId:alex,requestId:input.requestId,action:'remove'})).status,200);assert.deepEqual(await (await request('questions',sam)).json(),[]);
  assert.equal((await fetch(base+'/review-schedule.js')).status,200);
});
