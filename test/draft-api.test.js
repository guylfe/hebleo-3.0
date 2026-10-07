import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Store,draftTokenFor} from '../src/store.js';
import {createServer} from '../src/server.js';
import {seed} from '../src/seed.js';

const author='author-demo',profiles=['learner-demo','learner-core','author-demo'];
function setup(t){const s=new Store();t.after(()=>s.close());return s;}
const rejects=(fn,status,code)=>assert.throws(fn,e=>e.status===status&&e.code===code);
// Every row in every table: preview must leave all of it byte-identical.
const dump=s=>JSON.stringify(['kv','learners','events','revisions'].map(table=>s.db.prepare('SELECT * FROM '+table+' ORDER BY 1').all()));
function draftWithWho(s,english){const c=structuredClone(s.snapshot());c.words.find(w=>w.id==='w-mi').english=english;return s.stage({baseRevisionId:s.get('active'),expectedDraftToken:s.currentDraft()?.draftToken??null,content:c});}

test('draft token is canonical and covers unknown fields, provenance, approval, formatting and media refs',()=>{
  const base=structuredClone(seed),token=draftTokenFor(1,base);
  assert.match(token,/^dt1-[0-9a-f]{64}$/);
  const reverse=v=>Array.isArray(v)?v.map(reverse):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).reverse().map(([k,x])=>[k,reverse(x)])):v;const reordered=reverse(base);assert.notEqual(JSON.stringify(reordered),JSON.stringify(base));
  assert.equal(draftTokenFor(1,reordered),token,'key order never changes a token');
  assert.notEqual(draftTokenFor(2,base),token,'the base revision is covered');
  const variants=[
    c=>c.words[0].sourceFields={Root:'אני'},
    c=>c.words[0].unknownAuthorField='kept',
    c=>c.words[0].provenance={kind:'verified-source',approval:'approved'},
    c=>c.words[0].provenance={kind:'verified-source',approval:'pending'},
    c=>c.words[0].fieldFormatting={pointed:{textFormatRuns:[{startIndex:0,format:{bold:true}}]}},
    c=>c.words[0].audio={assetId:'asset-1',revisionId:1,sha256:'a'.repeat(64)},
    c=>c.words[0].audio='/media/legacy.mp3',
    c=>c.lessons[0].blocks.reverse(),
  ];
  const tokens=variants.map(mutate=>{const c=structuredClone(base);mutate(c);return draftTokenFor(1,c);});
  for(const t of tokens)assert.notEqual(t,token);
  assert.equal(new Set(tokens).size,tokens.length,'each covered field yields a distinct token');
});

test('stage requires the expected token, creates with null, is a no-op on equal content and conflicts otherwise',t=>{
  const s=setup(t),active=s.get('active');
  rejects(()=>s.stage({baseRevisionId:active,word:{id:'w-mi',notes:'x'}}),400,'DRAFT_TOKEN_REQUIRED');
  rejects(()=>s.stage({baseRevisionId:active,expectedDraftToken:'',word:{id:'w-mi',notes:'x'}}),400,'DRAFT_TOKEN_REQUIRED');
  rejects(()=>s.stage({baseRevisionId:active,expectedDraftToken:'dt1-none',word:{id:'w-mi',notes:'x'}}),409,'DRAFT_CONFLICT');
  assert.equal(s.get('draft'),null);
  const first=s.stage({baseRevisionId:active,expectedDraftToken:null,word:{id:'w-mi',notes:'first'}});
  assert.equal(first.unchanged,false);assert.equal(first.baseRevisionId,active);assert.equal(first.draftToken,first.draft.draftToken);
  assert.equal(first.draftToken,draftTokenFor(active,s.get('draft').content));
  const stagedAt=s.get('draft').stagedAt;
  const again=s.stage({baseRevisionId:active,expectedDraftToken:first.draftToken,word:{id:'w-mi',notes:'first'}});
  assert.equal(again.unchanged,true);assert.equal(again.draftToken,first.draftToken);assert.equal(s.get('draft').stagedAt,stagedAt);
  assert.throws(()=>s.stage({baseRevisionId:active,expectedDraftToken:null,word:{id:'w-mi',notes:'second tab'}}),e=>e.status===409&&e.code==='DRAFT_CONFLICT'&&e.details.current.draftToken===first.draftToken&&e.details.current.activeRevisionId===active);
  rejects(()=>s.stage({baseRevisionId:active+1,expectedDraftToken:first.draftToken,word:{id:'w-mi',notes:'x'}}),409,'STALE_BASE');
  rejects(()=>s.stage({baseRevisionId:active,expectedDraftToken:first.draftToken,content:{schemaVersion:2}}),400,'BAD_REQUEST');
  assert.equal(s.currentDraft().draftToken,first.draftToken,'failed stages leave the draft untouched');
  const next=s.stage({baseRevisionId:active,expectedDraftToken:first.draftToken,word:{id:'w-mi',notes:'second'}});
  assert.equal(next.unchanged,false);assert.notEqual(next.draftToken,first.draftToken);
});

test('publish and rollback compare base and token in one transaction; a stale publish cannot clear a newer draft',t=>{
  const s=setup(t),active=s.get('active');
  rejects(()=>s.publish(active),400,'DRAFT_TOKEN_REQUIRED');
  rejects(()=>s.publish(active,'dt1-none'),409,'DRAFT_CONFLICT');
  const reviewed=draftWithWho(s,'who (reviewed)');
  const newer=draftWithWho(s,'who (edited in another tab)');
  rejects(()=>s.publish(active,reviewed.draftToken),409,'DRAFT_CONFLICT');
  assert.equal(s.currentDraft().draftToken,newer.draftToken);assert.equal(s.get('active'),active);
  rejects(()=>s.publish(active+5,newer.draftToken),409,'STALE_BASE');
  const {revisionId}=s.publish(active,newer.draftToken);
  assert.equal(s.get('active'),revisionId);assert.equal(s.get('draft'),null);assert.equal(s.snapshot().words.find(w=>w.id==='w-mi').english,'who (edited in another tab)');
  rejects(()=>s.publish(revisionId,newer.draftToken),409,'DRAFT_CONFLICT');
  const pending=draftWithWho(s,'who (pending)');
  rejects(()=>s.rollback(active,revisionId),400,'DRAFT_TOKEN_REQUIRED');
  rejects(()=>s.rollback(active,revisionId,null),409,'DRAFT_CONFLICT');
  assert.equal(s.currentDraft().draftToken,pending.draftToken,'rollback must name the draft it discards');
  const restored=s.rollback(active,revisionId,pending.draftToken);
  assert.equal(s.get('draft'),null);assert.equal(s.get('active'),restored.revisionId);assert.equal(s.snapshot().words.find(w=>w.id==='w-mi').english,'who');
  rejects(()=>s.rollback(active,restored.revisionId,'dt1-none'),409,'DRAFT_CONFLICT');
});

test('preview session returns the learner public shape of the exact draft and writes nothing for any profile',t=>{
  const s=setup(t),staged=draftWithWho(s,'who (draft)');
  for(const user of profiles)s.attempt(user,{requestId:randomUUID(),revisionId:s.get('active'),exerciseId:'ex-1-type',answer:'אני'});
  const before=dump(s);
  const session=s.previewSession({lessonId:'lesson-1',draftToken:staged.draftToken});
  assert.equal(session.mode,'draft-preview');assert.equal(session.persistent,false);assert.equal(session.draftToken,staged.draftToken);assert.equal(session.baseRevisionId,s.get('active'));assert.equal(session.lessonId,'lesson-1');
  assert.deepEqual(session.steps,['learn','check','vocabulary','apply','complete']);
  const learnerShape=s.bootstrap('learner-demo').content.exercises;
  assert.deepEqual(session.content.exercises.map(e=>Object.keys(e).sort()),learnerShape.map(e=>Object.keys(e).sort()),'same public fields as learners get');
  assert.ok(session.content.exercises.every(e=>e.answers===undefined&&e.distractors===undefined),'answer keys stripped');
  assert.ok(session.content.exercises.find(e=>e.id==='ex-1-recognize').choices.includes('who (draft)'),'choices come from the draft, not the published content');
  assert.equal(s.previewEvaluate({lessonId:'lesson-1',exerciseId:'ex-1-recognize',draftToken:staged.draftToken,answer:'who (draft)'}).result.correct,true);
  assert.equal(s.previewEvaluate({lessonId:'lesson-1',exerciseId:'ex-1-recognize',draftToken:staged.draftToken,answer:'who'}).result.correct,false,'never falls back to published answers');
  const match=s.previewEvaluate({lessonId:'lesson-1',exerciseId:'ex-1-match',draftToken:staged.draftToken,answer:{'w-hu':'he','w-hi':'she','w-mi':'who (draft)'}});
  assert.deepEqual(Object.keys(match).sort(),['draftToken','exerciseId','mode','persistent','result']);
  assert.deepEqual(Object.keys(match.result).sort(),['answer','correct','exerciseId','expected','lessonId','pairResults']);
  assert.deepEqual(match.result.pairResults,{'w-hu':true,'w-hi':true,'w-mi':true});
  assert.equal(match.result.correct,true);assert.equal(match.result.expected['w-mi'],'who (draft)');
  assert.equal(s.previewEvaluate({lessonId:'lesson-2',exerciseId:'ex-2-order',draftToken:staged.draftToken,answer:'אני בבית'}).result.correct,true,'ordering takes the composed sentence');
  rejects(()=>s.previewEvaluate({lessonId:'lesson-1',exerciseId:'ex-1-match',draftToken:staged.draftToken,answer:['he']}),400,'INVALID_ANSWER');
  rejects(()=>s.previewEvaluate({lessonId:'lesson-1',exerciseId:'ex-1-match',draftToken:staged.draftToken,answer:{'w-hu':7}}),400,'INVALID_ANSWER');
  rejects(()=>s.previewEvaluate({lessonId:'lesson-1',exerciseId:'ex-1-type',draftToken:staged.draftToken,answer:{}}),400,'INVALID_ANSWER');
  rejects(()=>s.previewSession({lessonId:'missing',draftToken:staged.draftToken}),404,'PREVIEW_TARGET_NOT_FOUND');
  rejects(()=>s.previewEvaluate({lessonId:'lesson-2',exerciseId:'ex-1-type',draftToken:staged.draftToken,answer:'אני'}),404,'PREVIEW_TARGET_NOT_FOUND');
  rejects(()=>s.previewEvaluate({lessonId:'lesson-1',exerciseId:'missing',draftToken:staged.draftToken,answer:'אני'}),404,'PREVIEW_TARGET_NOT_FOUND');
  rejects(()=>s.previewSession({lessonId:'lesson-1'}),400,'DRAFT_TOKEN_REQUIRED');
  assert.equal(dump(s),before,'no attempt, completion, card, resume, preference, event or revision was written');
});

test('preview is stale after re-stage, publish or rollback and has no no-draft mode',t=>{
  const s=setup(t);
  rejects(()=>s.previewSession({lessonId:'lesson-1',draftToken:'dt1-none'}),409,'DRAFT_CONFLICT');
  const zero=s.stage({baseRevisionId:s.get('active'),expectedDraftToken:null,content:s.snapshot()});
  assert.equal(zero.changes.length,0);assert.equal(s.previewSession({lessonId:'lesson-1',draftToken:zero.draftToken}).draftToken,zero.draftToken,'published content is rehearsed through a zero-change draft');
  const edited=draftWithWho(s,'who (newer)');
  assert.throws(()=>s.previewEvaluate({lessonId:'lesson-1',exerciseId:'ex-1-recognize',draftToken:zero.draftToken,answer:'who'}),e=>e.code==='DRAFT_CONFLICT'&&e.details.current.draftToken===edited.draftToken);
  s.publish(s.get('active'),edited.draftToken);
  rejects(()=>s.previewSession({lessonId:'lesson-1',draftToken:edited.draftToken}),409,'DRAFT_CONFLICT');
});

test('a restored draft is re-based onto the new revision, so its old token is stale',t=>{
  const s=setup(t),staged=draftWithWho(s,'who (carried)'),backup=s.backup();
  const target=setup(t);target.restore(JSON.parse(JSON.stringify(backup)));
  const carried=target.currentDraft();
  assert.equal(carried.baseRevisionId,target.get('active'));assert.equal(carried.content.words.find(w=>w.id==='w-mi').english,'who (carried)');
  assert.notEqual(carried.draftToken,staged.draftToken);
  rejects(()=>target.previewSession({lessonId:'lesson-1',draftToken:staged.draftToken}),409,'DRAFT_CONFLICT');
  assert.equal(target.previewSession({lessonId:'lesson-1',draftToken:carried.draftToken}).baseRevisionId,target.get('active'));
});

test('unapproved source candidates stay blocked at stage, including when relabelled as verified',t=>{
  const s=setup(t),active=s.get('active'),candidate=structuredClone(seed);
  candidate.provenance={kind:'source-candidate-unapproved',label:'Synthetic test candidate'};
  rejects(()=>s.stage({baseRevisionId:active,expectedDraftToken:null,content:candidate}),400,'BAD_REQUEST');
  const relabelled=structuredClone(seed);relabelled.provenance={kind:'verified-source'};relabelled.words[0].provenance={kind:'source-candidate',approval:'pending'};
  assert.throws(()=>s.stage({baseRevisionId:active,expectedDraftToken:null,content:relabelled}),/pending approval/);
  relabelled.words[0].provenance.approval='approved';
  assert.equal(s.stage({baseRevisionId:active,expectedDraftToken:null,content:relabelled}).unchanged,false);
  assert.deepEqual(s.currentDraft().content.words[0].provenance,{kind:'source-candidate',approval:'approved'},'per-object provenance is kept as authored');
});

test('HTTP draft and preview routes are author-only, no-store and return the coded error envelope',async t=>{
  const store=new Store(),server=createServer(store);await new Promise(r=>server.listen(0,'127.0.0.1',r));
  t.after(async()=>{await new Promise(r=>server.close(r));store.close();});const base='http://127.0.0.1:'+server.address().port;
  const post=async(path,body,user=author)=>{const r=await fetch(base+'/api/'+path,{method:'POST',headers:{'content-type':'application/json','x-demo-user':user},body:JSON.stringify(body)});return {status:r.status,cache:r.headers.get('cache-control'),body:await r.json()};};
  const active=store.get('active');
  const missing=await post('studio/draft',{baseRevisionId:active,word:{id:'w-mi',notes:'x'}});
  assert.equal(missing.status,400);assert.equal(missing.body.code,'DRAFT_TOKEN_REQUIRED');
  const staged=await post('studio/draft',{baseRevisionId:active,expectedDraftToken:null,word:{id:'w-mi',notes:'http'}});
  assert.equal(staged.status,200);assert.equal(staged.cache,'no-store');assert.equal(staged.body.unchanged,false);
  const conflict=await post('studio/draft',{baseRevisionId:active,expectedDraftToken:null,word:{id:'w-mi',notes:'other'}});
  assert.equal(conflict.status,409);assert.deepEqual(conflict.body,{error:conflict.body.error,code:'DRAFT_CONFLICT',current:{draftToken:staged.body.draftToken,activeRevisionId:active}});
  const before=dump(store);
  for(const user of ['learner-demo','learner-core']){
    assert.equal((await post('studio/preview/session',{lessonId:'lesson-1',draftToken:staged.body.draftToken},user)).status,403);
    assert.equal((await post('studio/preview/evaluate',{lessonId:'lesson-1',exerciseId:'ex-1-type',draftToken:staged.body.draftToken,answer:'אני'},user)).status,403);
  }
  const session=await post('studio/preview/session',{lessonId:'lesson-1',draftToken:staged.body.draftToken});
  assert.equal(session.status,200);assert.equal(session.cache,'no-store');assert.equal(session.body.persistent,false);
  const graded=await post('studio/preview/evaluate',{lessonId:'lesson-1',exerciseId:'ex-1-type',draftToken:staged.body.draftToken,answer:'אני'});
  assert.equal(graded.status,200);assert.equal(graded.body.result.correct,true);
  assert.equal((await post('studio/preview/evaluate',{lessonId:'lesson-1',exerciseId:'ex-1-match',draftToken:staged.body.draftToken,answer:'he'})).body.code,'INVALID_ANSWER');
  assert.equal((await post('studio/preview/session',{lessonId:'nope',draftToken:staged.body.draftToken})).body.code,'PREVIEW_TARGET_NOT_FOUND');
  assert.equal(dump(store),before,'preview over HTTP wrote nothing');
  const stale=await post('studio/publish',{baseRevisionId:active+1,draftToken:staged.body.draftToken});
  assert.equal(stale.status,409);assert.equal(stale.body.code,'STALE_BASE');assert.equal(stale.body.current.draftToken,staged.body.draftToken);
  const published=await post('studio/publish',{baseRevisionId:active,draftToken:staged.body.draftToken});
  assert.equal(published.status,200);assert.equal(published.body.revisionId,store.get('active'));
  const unknown=await post('nowhere',{});assert.equal(unknown.status,404);assert.equal(unknown.body.code,'NOT_FOUND');
});
