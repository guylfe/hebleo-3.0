import test from 'node:test';
import assert from 'node:assert/strict';
import {Store,validateContent,DomainError} from '../src/store.js';
import {createServer} from '../src/server.js';
import {createStudioWorkspace} from '../public/studio/workspace.js';

const dump=s=>Object.fromEntries(s.db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(({name})=>[name,s.db.prepare('SELECT * FROM "'+name+'" ORDER BY rowid').all()]));
async function fixture(t){
 const s=new Store(),server=createServer(s);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 t.after(async()=>{await new Promise(r=>server.close(r));s.close();});
 const post=async(input,{minimal=true,user='author-demo'}={})=>{
  const r=await fetch('http://127.0.0.1:'+server.address().port+'/api/studio/draft',{method:'POST',headers:{'x-demo-user':user,'content-type':'application/json',...(minimal?{Prefer:'return=minimal'}:{})},body:JSON.stringify(input)});
  return {status:r.status,applied:r.headers.get('Preference-Applied'),body:await r.json()};
 };return {s,post};
}
test('compact/default HTTP receipts have identical saved state, warnings, no-op, validation and atomic CAS semantics',async t=>{
 const {s,post}=await fixture(t),content=s.snapshot(),baseRevisionId=s.get('active'),published=s.snapshot();content.lessons[0].title+=' Synthetic';
 const input={baseRevisionId,expectedDraftToken:null,content},minimal=await post(input);assert.equal(minimal.status,200);assert.equal(minimal.applied,'return=minimal');assert.equal(Object.hasOwn(minimal.body,'changes'),false);
 const saved=s.currentDraft(),before=dump(s),full=await post({...input,expectedDraftToken:saved.draftToken},{minimal:false});assert.equal(full.status,200);
 assert.ok(Array.isArray(full.body.changes));assert.deepEqual(full.body.mediaWarnings,minimal.body.mediaWarnings);assert.equal(full.body.draftToken,minimal.body.draftToken);assert.equal(full.body.baseRevisionId,minimal.body.baseRevisionId);assert.equal(full.body.unchanged,true);assert.deepEqual(dump(s),before);assert.deepEqual(s.currentDraft(),saved);
 const repeat=await post({...input,expectedDraftToken:saved.draftToken});assert.equal(repeat.body.unchanged,true);assert.deepEqual(dump(s),before);
 for(const [label,changed,status,options] of [
  ['stale token',input,409],['stale base',{...input,baseRevisionId:baseRevisionId+1},409],
  ['missing token',{baseRevisionId,content},400],['unauthorized',{...input,expectedDraftToken:saved.draftToken},403,{user:'learner-demo'}],
  ['duplicate identity',{...input,expectedDraftToken:saved.draftToken,content:{...content,lessons:[...content.lessons,content.lessons[0]]}},400],
  ['invalid composition',{...input,expectedDraftToken:saved.draftToken,content:{...content,words:[]}},400],
  ['wrong reviewed token',{...input,expectedDraftToken:saved.draftToken,reviewedDraftToken:'dt1-'+'0'.repeat(64)},409]
 ]){const result=await post(changed,options);assert.equal(result.status,status,label);assert.deepEqual(dump(s),before,label);}
 assert.deepEqual(s.snapshot(),published);
});

test('26 MB / 23 lesson compact Save commits the complete workspace and exact readback, preserving unrelated tables and metadata',async t=>{
 const {s,post}=await fixture(t),content=s.snapshot();
 for(let i=0;i<20;i++){const l=structuredClone(content.lessons[0]);l.id='synthetic-retained-'+i;l.title='Synthetic retained lesson '+i;l.exerciseIds=[];l.checkExerciseIds=[];for(const b of l.blocks)if(b.selector)b.selector.lessonId=l.id;content.lessons.push(l);}
 content.syntheticRetainedMetadata=JSON.parse('{"retained":[null,1],"unknown":{"retain":true}}');
 content.syntheticSizePadding='';const target=26632089;content.syntheticSizePadding='.'.repeat(target-Buffer.byteLength(JSON.stringify(content)));
 validateContent(content);assert.equal(content.lessons.length,23);assert.equal(Buffer.byteLength(JSON.stringify(content)),target);
 const baseRevisionId=s.get('active'),published=s.snapshot(),before=dump(s),response=await post({baseRevisionId,expectedDraftToken:null,content});
 assert.equal(response.status,200);assert.deepEqual(s.currentDraft().content,content);assert.deepEqual(s.snapshot(),published);
 for(const table of Object.keys(before)){if(table==='kv')continue;assert.deepEqual(dump(s)[table],before[table],table);}
 for(const entry of before.kv)assert.deepEqual(s.db.prepare('SELECT * FROM kv WHERE key=?').get(entry.key),entry);
});

for(const hook of ['media-plan','source-validation','source-stage'])test('compact Save preserves atomic refusal from '+hook,async t=>{
 const {s,post}=await fixture(t),before=dump(s),content=s.snapshot();content.lessons[0].title+=' Synthetic rejected hook';let calls=0;
 const object=hook==='media-plan'?s.media:s.sourceAuthoring,key=hook==='media-plan'?'plan':hook==='source-validation'?'validateLocalContent':'onLocalStage';
 object[key]=()=>{calls++;throw new DomainError('Synthetic hook refusal',409,'SYNTHETIC_HOOK_REFUSAL');};
 const result=await post({baseRevisionId:s.get('active'),expectedDraftToken:null,content});assert.equal(result.status,409);assert.equal(result.body.code,'SYNTHETIC_HOOK_REFUSAL');assert.equal(calls,1);assert.deepEqual(dump(s),before);
});

for(const status of [403,409,503,'lost'])test('compact Save '+status+' retains exact owner buffers and pins without impact or automatic reload/retry',async t=>{
 const s=new Store();t.after(()=>s.close());let calls=0,raw='Synthetic exact \r\nשָׁלוֹם',ack=0;
 const content=s.snapshot(),w=createStudioWorkspace({content,baseRevisionId:s.get('active'),getWorkspaceImpact:()=>assert.fail('Private Save must not review publication'),saveDraft:input=>{
  calls++;if(status==='lost'){s.stage(input,undefined,{returnMinimal:true});throw new Error('Synthetic lost receipt');}
  throw Object.assign(new Error('Synthetic failure'),{status});
 }});
 w.registerCollector(()=>{const next=w.peekContent();next.lessons[0].explanation=raw;w.replace(next,{changed:false});return ()=>ack++;});w.touch();
 await assert.rejects(w.save(),/Synthetic/);assert.equal(raw,'Synthetic exact \r\nשָׁלוֹם');assert.equal(w.expectedDraftToken,null);assert.equal(w.dirty,true);assert.equal(ack,0);assert.equal(calls,1);assert.equal(w.revoked,status===403);
 if(status==='lost'){assert.equal(s.currentDraft().content.lessons[0].explanation,raw);await assert.rejects(w.save(),error=>error.status===409||/Synthetic/.test(error.message));assert.equal(w.expectedDraftToken,null);}
});
