import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Store} from '../src/store.js';
import {createServer} from '../src/server.js';
import {MEDIA_LIMITS} from '../src/media-store.js';
import {fixture as sourceFixture,author} from '../test-support/source-fixture.js';

const pdf=Buffer.from('%PDF-1.4\n% SYNTHETIC disposable integrity fixture\n%%EOF');
function wave(size=46){const bytes=Buffer.alloc(size);bytes.write('RIFF');bytes.writeUInt32LE(size-8,4);bytes.write('WAVEfmt ',8);bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(1,22);bytes.writeUInt32LE(8000,24);bytes.writeUInt32LE(16000,28);bytes.writeUInt16LE(2,32);bytes.writeUInt16LE(16,34);bytes.write('data',36);bytes.writeUInt32LE(size-44,40);return bytes;}
let counter=0;
const input=(bytes=pdf,extra={})=>({operationId:'synthetic-integrity-'+(++counter),assetId:'synthetic-document',title:'SYNTHETIC disposable document',kind:'document',mimeType:'application/pdf',dataBase64:bytes.toString('base64'),provenance:{kind:'synthetic-demo',label:'SYNTHETIC disposable bytes'},...extra});
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function fingerprint(store){const rows=store.db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(({name})=>[name,store.db.prepare('SELECT * FROM "'+name+'" ORDER BY rowid').all().map(row=>Object.fromEntries(Object.entries(row).map(([key,value])=>[key,value instanceof Uint8Array?{sha256:hash(value),bytes:value.byteLength}:value])))]);return {rows,changes:store.db.prepare('SELECT total_changes() n').get().n};}
function setup(t){const dir=mkdtempSync(join(tmpdir(),'hebleo-synthetic-media-integrity-')),store=new Store(':memory:');store.media.bindRoot(dir);t.after(()=>{store.close();rmSync(dir,{recursive:true,force:true});});return {store,dir};}
async function http(t,store,dir){const server=createServer(store,{mediaRoot:dir});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));const origin='http://127.0.0.1:'+server.address().port;return {origin,call:async(path,body)=>{const response=await fetch(origin+'/api/'+path,{method:'POST',headers:{'x-demo-user':author,'content-type':'application/json'},body:JSON.stringify(body)});return {status:response.status,body:await response.json()};}};}
const stage=(store,content)=>store.stage({content,baseRevisionId:store.get('active'),expectedDraftToken:store.currentDraft()?.draftToken??null});

for(const direction of ['document-to-audio','audio-to-document'])test('QA-REC-01/RR-MED-02 HTTP rejects '+direction+' before blob/history/receipt writes',async t=>{
 const {store,dir}=setup(t),{call}=await http(t,store,dir),audioFirst=direction==='audio-to-document';
 const one=await call('studio/media/import',audioFirst?input(wave(),{kind:'audio',mimeType:'audio/wav'}):input());assert.equal(one.status,200);
 const replacement=audioFirst?input():input(wave(),{kind:'audio',mimeType:'audio/wav'}),before=fingerprint(store);
 const rejected=await call('studio/media/import',{...replacement,expectedRevisionId:one.body.revisionId});assert.equal(rejected.status,409);assert.equal(rejected.body.code,'MEDIA_KIND');assert.deepEqual(fingerprint(store),before);
 const dest=new Store(':memory:');t.after(()=>dest.close());dest.restore(store.backup());assert(dest.media.resolveLocal(one.body.url).bytes.equals(audioFirst?wave():pdf));
 const separate=await call('studio/media/import',{...replacement,assetId:'synthetic-new-kind'});assert.equal(separate.status,200);dest.restore(store.backup());assert.equal(dest.media.state().assets.length,2);
});

test('same-kind revisions retain old byte URLs and consistent receipts across offline restore',t=>{
 const {store}=setup(t),request=input(),one=store.media.importAsset(author,request),second=store.media.importAsset(author,input(Buffer.from('%PDF-1.4\n% SYNTHETIC next revision\n%%EOF'),{expectedRevisionId:one.revisionId}));
 const dest=new Store(':memory:');t.after(()=>dest.close());dest.restore(store.backup());const before=fingerprint(dest);assert.deepEqual(dest.media.importAsset(author,request),one);assert.deepEqual(fingerprint(dest),before);assert(dest.media.resolveLocal(one.url).bytes.equals(pdf));assert.notEqual(one.sha256,second.sha256);
});

test('QA-REC-02 advertised 20 MB HTTP upload and full recovery pass; oversize/malformed encodings reject without writes',async t=>{
 const {store,dir}=setup(t),{call,origin}=await http(t,store,dir),bytes=wave(MEDIA_LIMITS.fileBytes),request=input(bytes,{kind:'audio',mimeType:'audio/wav'}),one=await call('studio/media/import',request);assert.equal(one.status,200);assert.equal(one.body.byteLength,MEDIA_LIMITS.fileBytes);
 const dest=new Store(':memory:');t.after(()=>dest.close());dest.restore(store.backup());assert.equal(hash(dest.media.resolveLocal(one.body.url).bytes),hash(bytes));const range=await fetch(origin+one.body.url,{headers:{range:'bytes=19999990-19999999'}});assert.equal(range.status,206);assert.equal((await range.arrayBuffer()).byteLength,10);
 for(const bad of [input(wave(MEDIA_LIMITS.fileBytes+1),{kind:'audio',mimeType:'audio/wav'}),input(pdf,{dataBase64:'QQ==\n'}),input(pdf,{dataBase64:'QR=='}),input(pdf,{dataBase64:'Q=Q='}),input(pdf,{dataBase64:'QQ-_'}),input(pdf,{dataBase64:'QQ'})]){const before=fingerprint(store),res=await call('studio/media/import',bad);assert.equal(res.status,400);assert(['MEDIA_BYTES','MEDIA_INVALID'].includes(res.body.code));assert.deepEqual(fingerprint(store),before);}
});

for(const restored of [false,true])test('RR-MED-01 '+(restored?'restored':'ordinary Save')+' aliases retain pending real-byte approval at actual HTTP Publish',async t=>{
 const {store,dir}=setup(t),one=store.media.importAsset(author,input(pdf,{provenance:{kind:'verified-source',label:'UNAPPROVED synthetic stand-in'}}));writeFileSync(join(dir,'synthetic-alias.pdf'),pdf);
 const content=store.snapshot();content.lessons[0].document='/media/synthetic-alias.pdf';stage(store,content);
 const dest=restored?new Store(':memory:'):store;if(restored){t.after(()=>dest.close());dest.restore(store.backup());}
 const {call}=await http(t,dest,restored?null:dir),before=fingerprint(dest),res=await call('studio/publish',{baseRevisionId:dest.get('active'),draftToken:dest.currentDraft().draftToken});assert.equal(res.status,409);assert.equal(res.body.code,'MEDIA_APPROVAL_REQUIRED');assert.deepEqual(fingerprint(dest),before);assert.equal(dest.media.resolveLocal('/media/synthetic-alias.pdf').sha256,one.sha256);
});

test('RR-MED-01 a synthetic duplicate ID cannot relabel pending bytes; exact synthetic owner permit remains valid for an alias',async t=>{
 const f=sourceFixture(t),{store}=f;await f.register();await f.stage(f.resolve(await f.review()));const dir=mkdtempSync(join(tmpdir(),'hebleo-synthetic-alias-permit-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));store.media.bindRoot(dir);
 store.media.importAsset(author,input(pdf,{provenance:{kind:'human-authored',label:'UNAPPROVED synthetic human-media stand-in'}}));const duplicate=store.media.importAsset(author,input(pdf,{assetId:'synthetic-labelled-copy'}));writeFileSync(join(dir,'synthetic-permit.pdf'),pdf);const content=store.currentDraft().content;content.lessons[0].document='/media/synthetic-permit.pdf';stage(store,content);
 assert.throws(()=>store.media.checkPublication({...content,lessons:content.lessons.map((l,i)=>i?l:{...l,document:duplicate.url})}),e=>e.code==='MEDIA_APPROVAL_REQUIRED');assert.equal(f.engine.publicationEligibility().canPublish,false);await f.approve();const published=await f.publish();assert.equal(published.activeRevision,store.get('active'));assert.equal(store.media.state().assets[0].revisions[0].approval.status,'pending');
});

test('RR-MED-03 restore rejects every unusable unplaced historical managed URL before writes',t=>{
 const {store}=setup(t),one=store.media.importAsset(author,input()),backup=store.backup(),dest=new Store(':memory:');t.after(()=>dest.close());
 for(const url of [one.url.replace('.pdf','.extra.pdf'),one.url.replace('.pdf','.PDF'),one.url+'?download=1',one.url.replace('/blobs/','/aliases/'),one.url.replace(one.sha256,'0'.repeat(64))]){const bad=structuredClone(backup);bad.mediaRecovery.state.assets[0].revisions[0].url=url;const before=fingerprint(dest);assert.throws(()=>dest.restore(bad),e=>e.code==='MEDIA_BACKUP_INVALID');assert.deepEqual(fingerprint(dest),before);}
 const reservedAlias=structuredClone(backup);reservedAlias.mediaRecovery.aliases.push({path:one.url.slice(7),sha256:one.sha256});const before=fingerprint(dest);assert.throws(()=>dest.restore(reservedAlias),e=>e.code==='MEDIA_BACKUP_INVALID');assert.deepEqual(fingerprint(dest),before);
 assert.throws(()=>store.media.resolveLocal(one.url.replace('.pdf','.extra.pdf')),e=>e.code==='MEDIA_PATH');dest.restore(backup);assert(dest.media.resolveLocal(one.url).bytes.equals(pdf));
});

test('RR-MED-04 restore reconciles receipt owner/payload/result with exact surviving history before writes',t=>{
 const {store}=setup(t),request=input(),one=store.media.importAsset(author,request),backup=store.backup(),key=author+'/'+request.operationId,dest=new Store(':memory:');t.after(()=>dest.close());
 const mutations=[b=>b.state.operations[key].result.url='/media/blobs/'+'0'.repeat(64)+'.pdf',b=>b.state.operations[key].result.assetId='synthetic-foreign',b=>b.state.operations[key].result.revisionId='synthetic-missing',b=>b.state.operations[key].result.sha256='0'.repeat(64),b=>b.state.operations[key].result.byteLength++,b=>b.state.operations[key].result.kind='audio',b=>b.state.operations[key].result.provenance.label='Contradictory synthetic provenance',b=>b.state.operations[key].result.approval.status='approved',b=>b.state.operations[key].payload='not-a-hash',b=>{b.state.operations['learner-demo/'+request.operationId]=b.state.operations[key];delete b.state.operations[key];}];
 for(const mutate of mutations){const bad=structuredClone(backup);mutate(bad.mediaRecovery);const before=fingerprint(dest);assert.throws(()=>dest.restore(bad.mediaRecovery?bad:{}),e=>e.code==='MEDIA_BACKUP_INVALID');assert.deepEqual(fingerprint(dest),before);}
 // Object key order is immaterial, and valid extensions remain exact/inert.
 const valid=structuredClone(backup),receipt=valid.mediaRecovery.state.operations[key];receipt.result=Object.fromEntries(Object.entries(receipt.result).reverse());receipt.extension={label:'SYNTHETIC preserved receipt annotation'};dest.restore(valid);assert.deepEqual(dest.media.state().operations[key].extension,receipt.extension);const before=fingerprint(dest);assert.deepEqual(dest.media.importAsset(author,request),one);assert.deepEqual(fingerprint(dest),before);
});

test('damaged in-store receipt cannot return invented metadata even when its library revision survives',t=>{
 const {store}=setup(t),request=input(),one=store.media.importAsset(author,request),state=store.media.state(),key=author+'/'+request.operationId;state.operations[key].result.url='/media/blobs/'+'0'.repeat(64)+'.pdf';store.set('media-state',state);const before=fingerprint(store);assert.throws(()=>store.media.importAsset(author,request),e=>e.code==='MEDIA_BACKUP_INVALID');assert.deepEqual(fingerprint(store),before);assert(store.media.resolveLocal(one.url).bytes.equals(pdf));
});
