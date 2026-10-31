// Additional full-size recovery checks on a previously created disposable copy.
// Never accepts a live database as an input. Only aggregate evidence is emitted.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {realpathSync,writeFileSync} from 'node:fs';
import {resolve,relative,dirname,join,isAbsolute} from 'node:path';
import {Store} from '../src/store.js';
import {createServer} from '../src/server.js';
import {contextHash} from '../src/immutable-context.js';

const file=realpathSync(process.argv[2]),root=realpathSync(resolve('tmp')),rel=relative(root,file);
assert(!rel.startsWith('..')&&!isAbsolute(rel)&&rel.startsWith('selected-publication-copy-'),'Only this verifier\'s disposable copies are accepted.');
const s=new Store(file),dir=dirname(file),result={scope:'disposable-copy-only',roundtrips:[]};
const hashTables=store=>contextHash(store.db.prepare("SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name").all().map(({name})=>[name,store.db.prepare('SELECT * FROM "'+name+'" ORDER BY rowid').all()]));
let server;
try {
  const draft=s.currentDraft(),l=draft.content.lessons.find(l=>l.id==='MEMORY-A2'),b=l.blocks[0],p=b.textPages.pages[0];
  const prior=s.authorReview.state();result.oldContexts=Object.keys(prior.drafts).length;result.oldComments=prior.comments.length;
  const request={requestId:randomUUID(),lessonId:l.id,componentId:b.id,pageId:p.id,activityId:null,fieldPath:'html',baseRevisionId:draft.baseRevisionId,draftToken:draft.draftToken,selection:null,body:'SYNTHETIC selected-publication recovery check on disposable copy only'};
  s.authorReview.create('author-demo',request);
  const expected={revisions:contextHash(s.db.prepare('SELECT * FROM revisions ORDER BY id').all()),draft:contextHash(s.currentDraft()),review:contextHash(s.authorReview.state()),contexts:s.authorReview.contexts().map(contextHash),learners:contextHash(s.db.prepare('SELECT * FROM learners ORDER BY id').all())};
  server=createServer(s,{mediaRoot:join(dir,'no-external-media')});await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const origin='http://127.0.0.1:'+server.address().port,headers={'x-demo-user':'author-demo','content-type':'application/json'};
  const post=async(body)=>{const r=await fetch(origin+'/api/restore',{method:'POST',headers,body,signal:AbortSignal.timeout(180000)});const response=await r.json();return {status:r.status,code:response.code};};
  const response=await fetch(origin+'/api/export',{headers,signal:AbortSignal.timeout(180000)});assert.equal(response.status,200);const original=await response.text();result.compactBytes=Buffer.byteLength(original);assert.equal(original.includes('\n  '),false);
  for(let i=0;i<2;i++){
    assert.equal((await post(original)).status,200);
    const exported=await (await fetch(origin+'/api/export',{headers,signal:AbortSignal.timeout(180000)})).text();assert.equal(Buffer.byteLength(exported),result.compactBytes);assert.equal((await post(exported)).status,200);
    assert.equal(contextHash(s.db.prepare('SELECT * FROM revisions ORDER BY id').all()),expected.revisions);assert.equal(contextHash(s.currentDraft()),expected.draft);assert.equal(contextHash(s.authorReview.state()),expected.review);assert.deepEqual(s.authorReview.contexts().map(contextHash),expected.contexts);assert.equal(contextHash(s.db.prepare('SELECT * FROM learners ORDER BY id').all()),expected.learners);
    result.roundtrips.push({cycle:i+1,originalAndReexportRestore:'PASS',revisionRows:s.db.prepare('SELECT count(*) AS n FROM revisions').get().n,contexts:expected.contexts.length,allPinsAndContextsExact:true,bytes:Buffer.byteLength(exported)});
    console.log('PASS disposable recovery cycle '+(i+1));
  }
  const mutations=[b=>b.authorReview.drafts[Object.keys(b.authorReview.drafts)[0]].baseHash='0'.repeat(64),b=>b.mediaRecovery.blobs=[],b=>b.draft.baseRevisionId=9999];
  for(const mutate of mutations){const bad=JSON.parse(original);mutate(bad);const before=hashTables(s),response=await post(JSON.stringify(bad));assert(response.status>=400);assert.equal(hashTables(s),before);}
  result.atomicMalformedRestores=mutations.length;result.status='PASS';
} finally {if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}s.close();}
writeFileSync(join(dir,'recovery-evidence.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
