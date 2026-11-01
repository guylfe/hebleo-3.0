import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {inflateSync} from 'node:zlib';
import {Store} from '../src/store.js';
import {MEDIA_LIMITS} from '../src/media-store.js';
import {sha256} from '../src/source-utils.js';
import {fixture as sourceFixture} from '../test-support/source-fixture.js';
import {author,png,imageInput,approveInput,fingerprint,mediaHTTP} from '../test-support/private-image-fixture.js';
const route='studio/media/approve-private-image-use';
const clone=structuredClone;
const setup=t=>{const store=new Store(':memory:');t.after(()=>store.close());return store;};
const stage=(store,html)=>{const content=store.currentDraft()?.content||store.snapshot();content.lessons[0].explanation=html;return store.stage({baseRevisionId:store.get('active'),expectedDraftToken:store.currentDraft()?.draftToken??null,content});};
const scope=store=>({lessonId:store.currentDraft().content.lessons[0].id,baseRevisionId:store.get('active'),expectedDraftToken:store.currentDraft().draftToken,includeDependencies:[]});
const firstRecord=state=>Object.values(state.privateImageUse.approvals)[0];
const firstReceipt=state=>Object.values(state.privateImageUse.operations)[0];

test('HTTP import/status never approve; explicit private consent preserves canonical pending revision, frozen receipt, bytes and unrelated state',async t=>{
 const {store,api}=await mediaHTTP(t),input=imageInput(),pin=await api('studio/media/import',input),original=store.media.state(),before=fingerprint(store);
 const pending=await api('studio/media/status');assert.equal(pending.assets[0].revisions[0].approval.status,'pending');assert.equal(pending.assets[0].revisions[0].privateUseApproval,null);assert.deepEqual(fingerprint(store),before);
 const request=approveInput(pin),record=await api(route,request);assert.equal(record.actorId,author);assert.equal(record.scope,'private-image-use');assert.equal(record.pin.url,pin.url);assert.equal(record.operationId,request.operationId);assert.equal(new Date(record.approvedAt).toISOString(),record.approvedAt);
 const state=store.media.state();assert.deepEqual(state.assets,original.assets);assert.deepEqual(state.operations,original.operations);assert.deepEqual(store.media.importAsset(author,input),pin);assert.deepEqual(store.media.resolveLocal(pin.url).bytes,png);
 const other=rows=>rows.map(([name,data])=>[name,name==='kv'?data.filter(row=>row.key!=='media-state'):data]);assert.deepEqual(other(fingerprint(store).rows),other(before.rows));
 const after=fingerprint(store);assert.deepEqual(await api(route,request),record);const dto=await api('studio/media/status');assert.deepEqual(dto.assets[0].revisions[0].privateUseApproval,record);assert.equal(dto.assets[0].revisions[0].approval.status,'pending');assert.deepEqual(fingerprint(store),after);
});

test('HTTP permission, strict schema, bounds, origin and forged authority reject without any write',async t=>{
 const {store,api,request}=await mediaHTTP(t),pin=await api('studio/media/import',imageInput()),valid=approveInput(pin);
 for(const actor of [null,'learner-demo','learner-core','unknown']){const before=fingerprint(store),r=await request(route,valid,{actor});assert.ok([403,404].includes(r.status));assert.deepEqual(fingerprint(store),before);}
 for(const field of Object.keys(valid)){const bad=clone(valid);delete bad[field];const before=fingerprint(store);assert.equal((await request(route,bad)).status,400);assert.deepEqual(fingerprint(store),before);}
 for(const extra of [{actorId:author},{approval:{status:'approved'}},{trustedContentApproval:true},{scope:'canonical'},{privateUseApproval:{status:'approved'}}]){const before=fingerprint(store);assert.equal((await request(route,{...valid,...extra})).status,400);assert.deepEqual(fingerprint(store),before);}
 for(const options of [{headers:{origin:'https://foreign.invalid'}},{raw:'{"operationId":"a","operationId":"b"}'},{raw:'{"__proto__":{}}'},{raw:JSON.stringify({...valid,padding:'x'.repeat(5000)})}]){const before=fingerprint(store),r=await request(route,valid,options);assert.ok([400,403,413].includes(r.status));assert.deepEqual(fingerprint(store),before);}
 assert.throws(()=>store.media.approvePrivateImageUse('learner-demo',valid),e=>e.status===403);
});

test('HTTP exact asset, revision, SHA, MIME, length, URL and CAS pins cannot be substituted',async t=>{
 const {store,api,request}=await mediaHTTP(t),pin=await api('studio/media/import',imageInput()),valid=approveInput(pin);
 const variants=[{assetId:'missing'},{revisionId:'missing'},{sha256:'0'.repeat(64)},{mimeType:'image/jpeg',url:pin.url.replace('.png','.jpg')},{byteLength:pin.byteLength+1},{url:'https://foreign.invalid/image.png'},{expectedCurrentRevisionId:'stale'},{operationId:'../bad'},{sha256:7},{mimeType:'image/svg+xml'},{byteLength:20_000_001}];
 for(const patch of variants){const before=fingerprint(store),r=await request(route,{...valid,...patch});assert.ok([400,409].includes(r.status),JSON.stringify(r));assert.deepEqual(fingerprint(store),before);}
 const pdf=await api('studio/media/import',imageInput({assetId:'synthetic-pdf',kind:'document',mimeType:'application/pdf',dataBase64:Buffer.from('%PDF-1.4 SYNTHETIC').toString('base64')}));const before=fingerprint(store);assert.equal((await request(route,approveInput(pdf))).status,400);assert.deepEqual(fingerprint(store),before);
});

test('HTTP concurrent replay is one audited write; changed operation and competing duplicate approval conflict',async t=>{
 const {store,api,request}=await mediaHTTP(t),pin=await api('studio/media/import',imageInput()),input=approveInput(pin),before=fingerprint(store);
 const results=await Promise.all(Array.from({length:4},()=>api(route,input)));results.forEach(result=>assert.deepEqual(result,results[0]));assert.equal(fingerprint(store).writes-before.writes,1);
 for(const bad of [{...input,expectedCurrentRevisionId:'changed'},approveInput(pin)]){const before=fingerprint(store),r=await request(route,bad);assert.equal(r.status,409);assert.ok(['MEDIA_OPERATION_CONFLICT','MEDIA_ALREADY_APPROVED'].includes(r.body.code));assert.deepEqual(fingerprint(store),before);}
});

test('CAS detects newer imports; approval never propagates to another revision and exact replay survives history growth',async t=>{
 const {store,api,request}=await mediaHTTP(t),first=await api('studio/media/import',imageInput()),oldRequest=approveInput(first);
 const second=await api('studio/media/import',imageInput({expectedRevisionId:first.revisionId}));const before=fingerprint(store);assert.equal((await request(route,oldRequest)).body.code,'MEDIA_CAS');assert.deepEqual(fingerprint(store),before);
 const historicalRequest={...oldRequest,expectedCurrentRevisionId:second.revisionId},record=await api(route,historicalRequest);let dto=await api('studio/media/status');assert.deepEqual(dto.assets[0].revisions[0].privateUseApproval,record);assert.equal(dto.assets[0].revisions[1].privateUseApproval,null);
 const third=await api('studio/media/import',imageInput({expectedRevisionId:second.revisionId}));assert.deepEqual(await api(route,historicalRequest),record);assert.equal((await request(route,approveInput(second))).body.code,'MEDIA_CAS');assert.equal((await api(route,approveInput(second,{expectedCurrentRevisionId:third.revisionId}))).pin.revisionId,second.revisionId);
});

for(const broken of ['missing','corrupt'])test(broken+' bytes block new approval, replay and status atomically',async t=>{
 const {store,api,request}=await mediaHTTP(t),pin=await api('studio/media/import',imageInput()),input=approveInput(pin);await api(route,input);
 if(broken==='missing')store.db.prepare('DELETE FROM media_blobs WHERE sha256=?').run(pin.sha256);else store.db.prepare('UPDATE media_blobs SET bytes=? WHERE sha256=?').run(Buffer.from('corrupt SYNTHETIC'),pin.sha256);
 const before=fingerprint(store);for(const body of [input,approveInput(pin)])assert.notEqual((await request(route,body)).status,200);assert.notEqual((await request('studio/media/status')).status,200);assert.deepEqual(fingerprint(store),before);
});

test('approval audit storage limit refuses append while retaining a valid previous receipt',t=>{
 const store=setup(t),pin=store.media.importAsset(author,imageInput());const record=store.media.approvePrivateImageUse(author,approveInput(pin));const second=store.media.importAsset(author,imageInput({assetId:'synthetic-second'})),before=fingerprint(store),limit=MEDIA_LIMITS.privateImageApprovals;
 try{MEDIA_LIMITS.privateImageApprovals=1;assert.throws(()=>store.media.approvePrivateImageUse(author,approveInput(second)),e=>e.code==='MEDIA_LIMIT');assert.deepEqual(fingerprint(store),before);assert.deepEqual(firstRecord(store.media.state()),record);}finally{MEDIA_LIMITS.privateImageApprovals=limit;}
});

test('HTTP older/no-map restores retain newer approvals, exact media receipts, aliases and bytes; repeated export/restore is stable',async t=>{
 const {store,api}=await mediaHTTP(t),legacy=await api('export'),pin=await api('studio/media/import',imageInput()),preapproval=await api('export'),input=approveInput(pin),record=await api(route,input);
 store.db.prepare('INSERT INTO media_aliases(path,sha256) VALUES(?,?)').run('synthetic-image.png',pin.sha256);const state=store.media.state();
 for(const pack of [legacy,preapproval,await api('export')]){await api('restore',pack);assert.deepEqual(store.media.state(),state);assert.deepEqual(await api(route,input),record);assert.deepEqual(store.media.resolveLocal('/media/synthetic-image.png').bytes,png);assert.deepEqual(store.media.resolveLocal(pin.url).bytes,png);}
 for(let i=0;i<3;i++){await api('restore',await api('export'));assert.deepEqual(store.media.state(),state);}
 const fresh=setup(t);fresh.restore(preapproval);assert.equal(Object.hasOwn(fresh.media.state(),'privateImageUse'),false);fresh.restore(await api('export'));assert.deepEqual(fresh.media.state(),state);
});

test('file reopen validates and retains private approval without auto-approving pending imports',t=>{
 const dir=mkdtempSync(join(tmpdir(),'hebleo-private-image-test-')),file=join(dir,'synthetic.sqlite');t.after(()=>rmSync(dir,{recursive:true,force:true}));let store=new Store(file);
 const pin=store.media.importAsset(author,imageInput()),request=approveInput(pin),record=store.media.approvePrivateImageUse(author,request);store.media.importAsset(author,imageInput({assetId:'synthetic-pending'}));const state=store.media.state();store.close();
 store=new Store(file);assert.deepEqual(store.media.state(),state);assert.deepEqual(store.media.approvePrivateImageUse(author,request),record);assert.equal(store.media.status(store.snapshot()).assets[1].revisions[0].privateUseApproval,null);
 const bad=store.media.state();firstRecord(bad).actorId='learner-demo';store.set('media-state',bad);store.close();assert.throws(()=>new Store(file),e=>e.code==='MEDIA_PRIVATE_USE_INVALID');
});

test('backup and persistent validation reject missing, forged or mismatched approval audit before all writes',async t=>{
 const {store,api,request}=await mediaHTTP(t),pin=await api('studio/media/import',imageInput());await api(route,approveInput(pin));const backup=await api('export'),dest=setup(t);assert.equal(backup.mediaRecovery.version,2);
 const mutations=[s=>s.privateImageUse=null,s=>s.privateImageUse.version=2,s=>s.privateImageUse.extra=true,s=>firstRecord(s).actorId='learner-demo',s=>firstRecord(s).actorId='unknown',s=>firstRecord(s).scope='canonical',s=>firstRecord(s).status='pending',s=>firstRecord(s).approvedAt='invalid',s=>firstRecord(s).approvedAt=1,s=>firstRecord(s).pin.assetId='foreign',s=>firstRecord(s).pin.sha256='0'.repeat(64),s=>firstRecord(s).pin.revisionId='missing',s=>firstRecord(s).pin.url='https://foreign.invalid/image.png',s=>firstRecord(s).pin.mimeType='image/jpeg',s=>firstRecord(s).pin.byteLength++,s=>firstRecord(s).pin.kind='audio',s=>firstRecord(s).pin.extra=true,s=>firstRecord(s).trustedContentApproval=true,s=>s.privateImageUse.operations={},s=>s.privateImageUse.approvals={},s=>firstReceipt(s).payload='0'.repeat(64),s=>firstReceipt(s).request.operationId='forged',s=>firstReceipt(s).request.actorId=author,s=>firstReceipt(s).request.expectedCurrentRevisionId='missing',s=>firstReceipt(s).result.approvedAt='2001-01-01T00:00:00.000Z',s=>s.operations={},s=>s.assets[0].revisions[0].approval.status='approved'];
 for(const mutate of mutations){const bad=clone(backup);mutate(bad.mediaRecovery.state);const before=fingerprint(dest);assert.throws(()=>dest.restore(bad));assert.deepEqual(fingerprint(dest),before);}
 for(const mutate of [b=>delete b.mediaRecovery.state.privateImageUse,b=>b.mediaRecovery.version=1,b=>b.mediaRecovery.blobs=b.mediaRecovery.blobs.filter(x=>x.sha256!==pin.sha256),b=>delete b.mediaRecovery.state.privateImageUse.approvals[Object.keys(b.mediaRecovery.state.privateImageUse.approvals)[0]]]){const bad=clone(backup);mutate(bad);const before=fingerprint(store);assert.notEqual((await request('restore',bad)).status,200);assert.deepEqual(fingerprint(store),before);}
 const original=store.media.state();for(const mutate of mutations){const bad=clone(original);mutate(bad);store.set('media-state',bad);const before=fingerprint(store);assert.throws(()=>store.media.status(store.snapshot()));assert.throws(()=>store.media.validatePersistent([store.snapshot()]));assert.deepEqual(fingerprint(store),before);}store.set('media-state',original);
});

test('individually valid conflicting audits reject merge atomically; malformed incoming cannot borrow retained receipts',async t=>{
 const {store,api,request}=await mediaHTTP(t),pin=await api('studio/media/import',imageInput());await api(route,approveInput(pin));const backup=await api('export');
 for(const change of [state=>{firstRecord(state).approvedAt='2001-01-01T00:00:00.000Z';firstReceipt(state).result.approvedAt='2001-01-01T00:00:00.000Z';},state=>{const old=Object.keys(state.privateImageUse.operations)[0],receipt=state.privateImageUse.operations[old];delete state.privateImageUse.operations[old];receipt.request.operationId='different-operation';receipt.result.operationId='different-operation';firstRecord(state).operationId='different-operation';receipt.payload=sha256(receipt.request);state.privateImageUse.operations[author+'/different-operation']=receipt;}]){
  const bad=clone(backup);change(bad.mediaRecovery.state);const fresh=setup(t);fresh.restore(bad);const before=fingerprint(store),result=await request('restore',bad);assert.equal(result.body.code,'MEDIA_RESTORE_CONFLICT');assert.deepEqual(fingerprint(store),before);
 }
});

test('private approval cannot satisfy whole-workspace or selected-lesson publication guards for human media',async t=>{
 const {store,api,request}=await mediaHTTP(t),pin=await api('studio/media/import',imageInput({provenance:{kind:'human-authored',label:'SYNTHETIC bytes exercising unapproved human-source policy'}}));await api(route,approveInput(pin));const draft=stage(store,'<p>SYNTHETIC pending</p><img src="'+pin.url+'" alt="Synthetic fixture">'),before=fingerprint(store);
 const result=await request('studio/publish',{baseRevisionId:draft.baseRevisionId,draftToken:draft.draftToken});assert.equal(result.body.code,'MEDIA_APPROVAL_REQUIRED');const review=store.reviewLessonPublication(scope(store));assert.equal(review.canPublish,false);assert.match(JSON.stringify(review),/MEDIA_APPROVAL_REQUIRED/);assert.deepEqual(fingerprint(store),before);
});

test('exact source-bundle human approval remains necessary and invalidates after a content change despite private image consent',async t=>{
 const f=sourceFixture(t),store=f.store;await f.register();await f.stage(f.resolve(await f.review()));const pin=store.media.importAsset(author,imageInput({provenance:{kind:'verified-source',label:'SYNTHETIC source-media policy fixture'}}));store.media.approvePrivateImageUse(author,approveInput(pin));stage(store,'<img src="'+pin.url+'" alt="SYNTHETIC">');
 assert.equal(f.engine.publicationEligibility().canPublish,false);await assert.rejects(f.publish(),e=>e.code==='PUBLICATION_BLOCKED');await f.approve();assert.equal(f.engine.publicationEligibility().canPublish,true);stage(store,'<p>SYNTHETIC later edit</p><img src="'+pin.url+'" alt="SYNTHETIC">');assert.equal(f.engine.publicationEligibility().canPublish,false);await assert.rejects(f.publish(),e=>e.code==='PUBLICATION_BLOCKED');await f.approve();await f.publish();assert.equal(store.media.state().assets[0].revisions[0].approval.status,'pending');
});

test('synthetic PNG fixture has complete valid CRC chunks and a decodable 1x1 grayscale/alpha scanline',()=>{
 const crc32=bytes=>{let crc=0xffffffff;for(const value of bytes){crc^=value;for(let bit=0;bit<8;bit++)crc=crc&1?(crc>>>1)^0xedb88320:crc>>>1;}return (crc^0xffffffff)>>>0;};
 const chunks=[];let i=8;for(;i<png.length;){const n=png.readUInt32BE(i),type=png.toString('ascii',i+4,i+8),data=png.subarray(i+8,i+8+n);assert.equal(crc32(png.subarray(i+4,i+8+n)),png.readUInt32BE(i+8+n));if(type==='IHDR'){assert.equal(data.readUInt32BE(0),1);assert.equal(data.readUInt32BE(4),1);assert.equal(data[8],8);assert.equal(data[9],4);}if(type==='IDAT')assert.equal(inflateSync(data).toString('hex'),'01ffff');chunks.push(type);i+=n+12;}assert.equal(i,png.length);assert.deepEqual(chunks,['IHDR','IDAT','IEND']);
});

test('failed approval write and failed approval-bearing restore roll back every affected table',async t=>{
 const {store,api,request}=await mediaHTTP(t),pin=await api('studio/media/import',imageInput()),input=approveInput(pin);
 store.db.exec("CREATE TRIGGER synthetic_approval_failure BEFORE UPDATE ON kv WHEN NEW.key='media-state' BEGIN SELECT RAISE(ABORT,'synthetic write failure'); END;");
 const before=fingerprint(store);assert.equal((await request(route,input)).status,500);assert.deepEqual(fingerprint(store),before);store.db.exec('DROP TRIGGER synthetic_approval_failure');await api(route,input);
 const incoming=await api('export'),dest=setup(t),local=dest.media.importAsset(author,imageInput({assetId:'synthetic-retained'}));dest.media.approvePrivateImageUse(author,approveInput(local));
 dest.db.exec("CREATE TRIGGER synthetic_restore_failure BEFORE UPDATE ON kv WHEN NEW.key='media-state' BEGIN SELECT RAISE(ABORT,'synthetic restore failure'); END;");const retained=fingerprint(dest).rows;assert.throws(()=>dest.restore(incoming),/synthetic restore failure/);assert.deepEqual(fingerprint(dest).rows,retained);
});

test('valid historical import receipt extensions survive private approval and recovery unchanged',t=>{
 const store=setup(t),pin=store.media.importAsset(author,imageInput()),state=store.media.state();const receipt=Object.values(state.operations)[0];receipt.extension={note:'SYNTHETIC inert audit extension'};receipt.result.extension={note:'SYNTHETIC inert result extension'};store.set('media-state',state);
 store.media.approvePrivateImageUse(author,approveInput(pin));const dest=setup(t);dest.restore(store.backup());assert.deepEqual(dest.media.state().operations,state.operations);
});
