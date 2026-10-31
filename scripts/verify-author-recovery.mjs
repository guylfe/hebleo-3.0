// Full-data regression for RR-FIRST2-F14-01. Inputs are read-only; only copies
// under --output are opened by Store. Never point --output at an installed DB.
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {parseArgs} from 'node:util';
import {randomUUID} from 'node:crypto';
import {Store,draftTokenFor} from '../src/store.js';
import {createServer} from '../src/server.js';
import {prepareFeedbackUpdate,migrateFeedbackStore} from './update-first2-feedback.mjs';
import {databaseReceipt} from './runtime-state.mjs';
import {authorProjection} from '../src/author-review.js';
import {contextHash,reconstructContext} from '../src/immutable-context.js';
import {BACKUP_BYTE_LIMIT,serializeBackup} from '../public/backup-contract.js';

const {values:v}=parseArgs({options:{baseline:{type:'string'},legacy:{type:'string'},output:{type:'string'}}});
for(const k of ['baseline','legacy','output'])assert.ok(v[k],'Supply --'+k);
const baseline=resolve(v.baseline),legacy=resolve(v.legacy),output=resolve(v.output);
assert.ok(!existsSync(output),'Use a fresh output directory.');mkdirSync(output,{recursive:true});
const sourceReceipts={baseline:databaseReceipt(baseline),legacy:databaseReceipt(legacy)};
assert.equal(sourceReceipts.baseline.sha256,'42a61a378a7f68d2d678910513de1fcade8434b926e88ac27f0f81c1ff479072','Use Lead combined-final-rehearsal/before.sqlite.');
const result={finding:'RR-FIRST2-F14-01',sourceReceipts,groups:[],roundtrips:[]};
const report=()=>writeFileSync(join(output,'receipt.json'),JSON.stringify(result,null,2)+'\n');
const passed=(name,detail)=>{result.groups.push({name,status:'PASS',detail});report();console.log('PASS '+name);};
async function copy(from,to){const db=new DatabaseSync(from,{readOnly:true});try{db.prepare('VACUUM INTO ?').run(to);}finally{db.close();}}
function rawReview(file){const db=new DatabaseSync(file,{readOnly:true});try{return JSON.parse(db.prepare("SELECT value FROM kv WHERE key='author-review'").get().value);}finally{db.close();}}
const revisions=s=>s.db.prepare('SELECT * FROM revisions ORDER BY id').all();
const counts=s=>({revisions:revisions(s).length,contexts:Object.keys(s.authorReview.state().drafts).length,comments:s.authorReview.state().comments.length});
async function serve(s,fn){const server=createServer(s,{mediaRoot:join(output,'no-filesystem-media')});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const api=async(path,body)=>{const r=await fetch(origin+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{'x-demo-user':'author-demo','content-type':'application/json'},...(body===undefined?{}:{body:typeof body==='string'?body:JSON.stringify(body)}),signal:AbortSignal.timeout(180000)});const text=await r.text();assert.equal(r.status,200,path+': '+text.slice(0,500));return {text,value:JSON.parse(text)};};
 try{return await fn(api);}finally{server.closeAllConnections();await new Promise(r=>server.close(r));}}

const candidate=join(output,'candidate.sqlite');await copy(baseline,candidate);
const update=await prepareFeedbackUpdate({database:candidate,output:join(output,'updater'),packFile:resolve('content/first2/lessons.json'),build:'synthetic-f14-recovery-regression',mediaRoot:join(output,'no-filesystem-media'),apply:true,expectedSHA:databaseReceipt(candidate).sha256});
passed('bounded updater on copied actual 23-lesson DB; reader 8 marker-only migration; preservation and twice-restored rehearsal',update.preservation);
let s=new Store(candidate);
try{
 assert.equal(s.currentDraft().content.lessons.length,23);const initialRows=revisions(s),requests=[],contexts=new Map();
 await serve(s,async api=>{
  for(let i=0;i<6;i++){
   const d=s.currentDraft(),content=structuredClone(d.content),l=content.lessons.find(l=>l.id==='MEMORY-A2'),b=l.blocks[0],p=b.textPages.pages[0];
   p.title='SYNTHETIC disposable recovery heading '+i+' 😀 שָׁלוֹם';
   const payload={baseRevisionId:s.get('active'),expectedDraftToken:d.draftToken,content},impact=(await api('studio/impact',payload)).value;
   const saved=(await api('studio/draft',{...payload,reviewedDraftToken:impact.candidateDraftToken})).value;
   const source=authorProjection(p.html),exact=source.slice(0,Math.min(source.length,45));
   const req={requestId:randomUUID(),lessonId:l.id,componentId:b.id,pageId:p.id,activityId:null,fieldPath:'html',baseRevisionId:s.get('active'),draftToken:saved.draftToken,selection:{start:0,end:exact.length,exact,prefix:'',suffix:source.slice(exact.length,exact.length+80)},body:'SYNTHETIC private regression note '+i};
   const created=(await api('studio/author-comments',req)).value;
   assert.deepEqual((await api('studio/author-comments',req)).value,created);
   await api('studio/author-comments/'+created.id+'/status',{requestId:randomUUID(),expectedVersion:1,status:'resolved'});
   requests.push(req);contexts.set(saved.draftToken,contextHash(content));
   const bytes=Buffer.byteLength(serializeBackup(s.backup()));console.log(JSON.stringify({cycle:i+1,bytes,...counts(s)}));
  }
  const expected=s.authorReview.state(),learners=s.backup().learners,fullContexts=s.authorReview.contexts().map(contextHash);
  assert.equal(expected.comments.length,6);assert.equal(Object.keys(expected.drafts).length,6);assert.deepEqual(revisions(s),initialRows);
  for(const [token,ctx] of Object.entries(expected.drafts)){const reconstructed=reconstructContext(ctx,s.snapshot(ctx.baseRevisionId),expected.chunks);assert.equal(contextHash(reconstructed),contexts.get(token));assert.equal(draftTokenFor(ctx.baseRevisionId,reconstructed),token);}
  let stableBytes;
  for(let i=0;i<4;i++){
   const exported=await api('export'),bytes=Buffer.byteLength(exported.text);assert.ok(bytes<BACKUP_BYTE_LIMIT);assert.equal(exported.text,serializeBackup(exported.value));
   stableBytes??=bytes;assert.equal(bytes,stableBytes,'No serialized size growth across repeated full-data recovery.');
   const restored=(await api('restore',exported.text)).value;assert.equal(restored.revisionId,6);
   assert.deepEqual(s.authorReview.state(),expected);assert.deepEqual(s.authorReview.contexts().map(contextHash),fullContexts);assert.deepEqual(revisions(s),initialRows);assert.deepEqual(s.backup().learners,learners);
   for(const req of requests){const original=expected.comments.find(c=>c.requestId===req.requestId);assert.deepEqual((await api('studio/author-comments',req)).value,original);}
   result.roundtrips.push({pass:i+1,bytes,...counts(s),exactContextsNotesAuditRequestsTokens:true});report();
  }
  passed('six actual full-workspace HTTP impact/save/comment cycles and four exact HTTP export/restores without growth',{bytes:stableBytes,...counts(s),fullContextHashes:fullContexts});
  const valid=s.backup(),token=Object.keys(valid.authorReview.drafts)[0];
  const malformed=[b=>b.authorReview.drafts[token].baseHash='0'.repeat(64),b=>b.authorReview.drafts[token].delta=['o',[],[['lessons',['v',[]]]]],b=>b.authorReview.comments[0].anchor.selection.exact+='forged',b=>b.authorReview.comments[0].audit[0].by='learner-demo',b=>delete b.mediaRecovery.blobs[0]];
  // Complete all-table+sequence hashes on every full-data rejected restore.
  for(const mutate of malformed){const bad=structuredClone(valid);mutate(bad);const before=databaseReceipt(candidate);assert.throws(()=>s.restore(bad));assert.deepEqual(databaseReceipt(candidate),before);}
  passed('five malformed full-data contexts/quote/audit/media restores reject atomically including every table and sqlite_sequence',{cases:malformed.length});
 });
}finally{s.close();}
const legacyCopy=join(output,'legacy-six.sqlite');await copy(legacy,legacyCopy);const old=rawReview(legacyCopy);assert.equal(old.schemaVersion,1);assert.equal(old.comments.length,6);assert.equal(Object.keys(old.drafts).length,6);
const oldHashes=Object.fromEntries(Object.entries(old.drafts).map(([token,d])=>[token,contextHash(d.content)]));
s=migrateFeedbackStore(legacyCopy);
try{
 const current=s.authorReview.state();assert.equal(current.schemaVersion,2);assert.deepEqual(current.comments,old.comments);
 for(const [token,d] of Object.entries(current.drafts))assert.equal(contextHash(reconstructContext(d,s.snapshot(d.baseRevisionId),current.chunks)),oldHashes[token]);
 const compactBytes=Buffer.byteLength(JSON.stringify(current)),legacyBytes=Buffer.byteLength(JSON.stringify(old));assert.ok(compactBytes<legacyBytes/5);
 const expectedCounts=counts(s),expectedRows=revisions(s);let bytes;
 await serve(s,async api=>{for(let i=0;i<3;i++){
  const exported=await api('export');bytes??=Buffer.byteLength(exported.text);assert.equal(Buffer.byteLength(exported.text),bytes);await api('restore',exported.text);
  assert.deepEqual(s.authorReview.state(),current);assert.deepEqual(counts(s),expectedCounts);assert.deepEqual(revisions(s),expectedRows);
  for(const c of old.comments)assert.deepEqual((await api('studio/author-comments',c.request)).value,c);
 }});
 passed('legacy reader 9 six-full-context DB compacts losslessly and completes three stable HTTP recovery roundtrips',{legacyNamespaceBytes:legacyBytes,compactNamespaceBytes:compactBytes,exportBytes:bytes,...counts(s),commentsQuotesAuditsReceiptsAndTokensExact:true});
}finally{s.close();}
assert.deepEqual(databaseReceipt(baseline),sourceReceipts.baseline);assert.deepEqual(databaseReceipt(legacy),sourceReceipts.legacy);
passed('both supplied source databases untouched',{allTableAndSequenceReceiptsUnchanged:true});
result.status='PASS';report();
