import test from 'node:test';
import assert from 'node:assert/strict';
import {Store} from '../src/store.js';
import {createServer} from '../src/server.js';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';

const bytes=Buffer.from('%PDF-1.4\n% SYNTHETIC retained alias recovery fixture\n%%EOF');
let sequence=0;
const importInput=()=>({operationId:'synthetic-alias-'+(++sequence),assetId:'synthetic-unused-document',title:'SYNTHETIC unplaced PDF',kind:'document',mimeType:'application/pdf',dataBase64:bytes.toString('base64'),provenance:{kind:'synthetic-demo',label:'SYNTHETIC disposable alias bytes'}});
const fingerprint=store=>({rows:store.db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(({name})=>[name,store.db.prepare('SELECT * FROM "'+name+'" ORDER BY rowid').all()]),changes:store.db.prepare('SELECT total_changes() n').get().n});
async function runtime(t){const store=new Store(':memory:'),server=createServer(store);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(async()=>{await new Promise(resolve=>server.close(resolve));store.close();});const origin='http://127.0.0.1:'+server.address().port;return {store,origin,get:async path=>{const response=await fetch(origin+path,{headers:{'x-demo-user':'author-demo'}});return {status:response.status,body:await response.json()};}};}

test('RR-MED-05 retained malformed aliases reject installed export/status and persistent recovery without writes',async t=>{
 for(const shape of ['wrong-mime','reserved-managed-path','unsafe-path','missing-blob']){
  const f=await runtime(t),item=f.store.media.importAsset('author-demo',importInput());let path='synthetic-unplaced.pdf',target=item.sha256;
  if(shape==='wrong-mime')path='synthetic-unplaced.wav';if(shape==='reserved-managed-path')path=item.url.slice(7);if(shape==='unsafe-path')path='../synthetic-unplaced.pdf';if(shape==='missing-blob'){target='f'.repeat(64);f.store.db.exec('PRAGMA foreign_keys=OFF');}
  f.store.db.prepare('INSERT INTO media_aliases(path,sha256) VALUES(?,?)').run(path,target);const before=fingerprint(f.store);
  for(const endpoint of ['/api/export','/api/studio/media/status']){const result=await f.get(endpoint);assert.equal(result.status,409,shape+' '+endpoint);assert.equal(result.body.code,'MEDIA_BACKUP_INVALID');assert.deepEqual(fingerprint(f.store),before);}
  assert.throws(()=>f.store.media.validatePersistent([f.store.snapshot()]),e=>e.code==='MEDIA_BACKUP_INVALID');assert.deepEqual(fingerprint(f.store),before);assert.equal(f.store.media.alias(path),target);assert(f.store.media.blob(item.sha256).bytes.equals(bytes));
 }
});

test('valid unused and historical aliases export/restore exact bytes alongside pending draft and immutable learner grade',async t=>{
 const f=await runtime(t),item=f.store.media.importAsset('author-demo',importInput());for(const path of ['synthetic-unused.pdf','history/synthetic-old.PDF'])f.store.db.prepare('INSERT INTO media_aliases(path,sha256) VALUES(?,?)').run(path,item.sha256);
 const grade=f.store.attempt('learner-demo',{requestId:'synthetic-alias-grade',revisionId:f.store.get('active'),exerciseId:'ex-1-type',answer:'אני'});const content=f.store.snapshot();content.lessons[0].title='SYNTHETIC pending local title';f.store.stage({content,baseRevisionId:f.store.get('active'),expectedDraftToken:null});
 const before=fingerprint(f.store),exported=await f.get('/api/export');assert.equal(exported.status,200);assert.deepEqual(fingerprint(f.store),before);assert.equal(exported.body.mediaRecovery.aliases.length,2);assert.equal(exported.body.mediaRecovery.localReferences.length,0);
 const dest=new Store(':memory:');t.after(()=>dest.close());dest.restore(exported.body);assert(dest.media.resolveLocal('/media/synthetic-unused.pdf').bytes.equals(bytes));assert(dest.media.resolveLocal('/media/history/synthetic-old.PDF').bytes.equals(bytes));assert.equal(dest.currentDraft().content.lessons[0].title,content.lessons[0].title);assert.equal(dest.learner('learner-demo').attempts[0].correct,grade.correct);assert.deepEqual(dest.backup().mediaRecovery,exported.body.mediaRecovery);
});

test('RR-MED-05 missing retained bytes never fall back to a different external file or rebind an exported alias',async t=>{
 const f=await runtime(t),dir=mkdtempSync(join(tmpdir(),'hebleo-synthetic-missing-pin-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));f.store.media.bindRoot(dir);const name='synthetic-retained.pdf',url='/media/'+name,replacement=Buffer.from('%PDF-1.4\n% SYNTHETIC different external bytes\n%%EOF');writeFileSync(join(dir,name),bytes);
 const content=f.store.snapshot();content.lessons[0].document=url;f.store.stage({content,baseRevisionId:f.store.get('active'),expectedDraftToken:null});const originalHash=f.store.media.alias(name);assert(f.store.media.blob(originalHash).bytes.equals(bytes));
 f.store.db.exec('PRAGMA foreign_keys=OFF');f.store.db.prepare('DELETE FROM media_blobs WHERE sha256=?').run(originalHash);writeFileSync(join(dir,name),replacement);const before=fingerprint(f.store);let externalReads=0;const readExternal=f.store.media.readExternal.bind(f.store.media);f.store.media.readExternal=(...args)=>{externalReads++;return readExternal(...args);};
 assert.throws(()=>f.store.backup(),e=>e.code==='MEDIA_BACKUP_INVALID');assert.equal(externalReads,0,'Retained rows must validate before any external acquisition');
 for(const checkExternal of [false,true])assert.throws(()=>f.store.media.resolveLocal(url,{checkExternal}),e=>e.code==='MEDIA_MISSING');
 const plan=f.store.media.plan(content);assert(plan.warnings.some(w=>w.code==='MEDIA_MISSING'&&w.url===url));assert.equal(plan.entries.length,0);
 for(const endpoint of ['/api/export','/api/studio/media/status']){const result=await f.get(endpoint);assert.equal(result.status,409);assert.equal(result.body.code,'MEDIA_BACKUP_INVALID');}
 const served=await fetch(f.origin+url);assert.equal(served.status,409);assert.equal((await served.json()).code,'MEDIA_MISSING');assert.equal(externalReads,0);assert.deepEqual(fingerprint(f.store),before);assert.equal(f.store.media.alias(name),originalHash);assert.equal(f.store.media.blob(createHash('sha256').update(replacement).digest('hex')),null);
});

test('new external paths export exact bytes read-only, while intact retained aliases reject replacement and recover original bytes',async t=>{
 const f=await runtime(t),dir=mkdtempSync(join(tmpdir(),'hebleo-synthetic-new-pin-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));f.store.media.bindRoot(dir);const name='synthetic-new.pdf',url='/media/'+name,content=f.store.snapshot();content.lessons[0].document=url;writeFileSync(join(dir,name),bytes);const beforeNew=fingerprint(f.store),prospective=f.store.media.backup([content]);assert.equal(prospective.aliases[0].path,name);assert.equal(prospective.aliases[0].sha256,createHash('sha256').update(bytes).digest('hex'));assert.deepEqual(fingerprint(f.store),beforeNew);assert.equal(f.store.media.alias(name),null);
 f.store.stage({content,baseRevisionId:f.store.get('active'),expectedDraftToken:null});const retained=f.store.media.alias(name),before=fingerprint(f.store);writeFileSync(join(dir,name),Buffer.from('%PDF-1.4\n% SYNTHETIC replacement control\n%%EOF'));const rejected=await f.get('/api/export');assert.equal(rejected.status,409);assert.equal(rejected.body.code,'MEDIA_REPLACED');assert.deepEqual(fingerprint(f.store),before);assert.equal(f.store.media.alias(name),retained);assert(f.store.media.blob(retained).bytes.equals(bytes));
 writeFileSync(join(dir,name),bytes);const exported=await f.get('/api/export');assert.equal(exported.status,200);assert.deepEqual(fingerprint(f.store),before);const dest=new Store(':memory:');t.after(()=>dest.close());dest.restore(exported.body);assert(dest.media.resolveLocal(url).bytes.equals(bytes));assert.equal(dest.media.alias(name),retained);
});
