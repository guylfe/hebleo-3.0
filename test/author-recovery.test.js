import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {Store,draftTokenFor} from '../src/store.js';
import {createServer} from '../src/server.js';
import {authorProjection} from '../src/author-review.js';
import {contextDelta,applyContextDelta,reconstructContext,compactContext,contextHash} from '../src/immutable-context.js';
import {BACKUP_BYTE_LIMIT,serializeBackup} from '../public/backup-contract.js';

const dump=s=>s.db.prepare("SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name").all().map(({name})=>[name,s.db.prepare('SELECT * FROM "'+name+'" ORDER BY rowid').all().map(r=>({...r}))]);
const setup=t=>{const s=new Store();t.after(()=>s.close());return s;};
function note(s){
 const d=s.currentDraft(),content=d?.content||s.snapshot(),l=content.lessons[0];
 return {requestId:randomUUID(),lessonId:l.id,componentId:null,pageId:null,activityId:null,fieldPath:'explanation',baseRevisionId:s.get('active'),draftToken:d?.draftToken??null,selection:null,body:'SYNTHETIC recovery fixture'};
}
function contextFixture(s){
 const c=s.snapshot();c.lessons[0].explanation='<p>Original 😀 שָׁלוֹם source.</p>';
 c.unknown={array:[null,{marks:'שָׁלוֹם',emoji:'😀',nested:[1,false,'retained']}],removeMe:42};
 s.set('active',s.addRevision(c,'Synthetic immutable context base'));
 const value=structuredClone(c);delete value.unknown.removeMe;value.unknown.array[1].nested.splice(0,1);value.unknown.array.push({added:[null,true]});value.unknown.newKey={empty:[],nil:null};
 s.stage({baseRevisionId:s.get('active'),expectedDraftToken:null,content:value});
 const req=note(s),source=authorProjection(value.lessons[0].explanation),exact='😀 שָׁלוֹם',start=source.indexOf(exact);
 req.selection={start,end:start+exact.length,exact,prefix:source.slice(0,start),suffix:source.slice(start+exact.length)};
 const created=s.authorReview.create('author-demo',req);
 return {req,created,content:value};
}
async function http(t,s){const server=createServer(s);await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>{server.closeAllConnections();return new Promise(r=>server.close(r));});return 'http://127.0.0.1:'+server.address().port;}
const headers={'x-demo-user':'author-demo','content-type':'application/json'};

test('lossless immutable tree changes cover every JSON field, array edits, deletions, nulls and reserved keys',()=>{
 const base=JSON.parse('{"unknown":{"__proto__":{"retained":1},"array":[1,2,3]},"empty":null}');
 const changed=JSON.parse('{"unknown":{"__proto__":{"retained":2},"array":[0,{"unicode":"😀 שָׁלוֹם"}]},"added":false}');
 assert.deepEqual(applyContextDelta(base,contextDelta(base,changed)),changed);assert.equal({}.retained,undefined);
 const c=compactContext(1,base,changed);assert.deepEqual(reconstructContext(c,base),changed);
 assert.throws(()=>reconstructContext(c,{...base,wrong:true}));
 for(const delta of [['o',[],[['added',['v',1]],['added',['v',2]]]],['a',2,[]],['o',[],[['absent',['o',[],[]]]]],['o',['missing'],[]],['x',[],[]],['v'],['a',-1,[]]])assert.throws(()=>applyContextDelta(base,delta));
});

test('comment contexts reconstruct complete immutable workspaces after later draft changes and legacy backup conversion',t=>{
 const s=setup(t),f=contextFixture(s),state=s.authorReview.state(),token=f.req.draftToken,context=state.drafts[token];
 assert.equal(state.schemaVersion,2);assert.equal(Object.hasOwn(context,'content'),false);
 assert.deepEqual(reconstructContext(context,s.snapshot(f.req.baseRevisionId)),f.content);
 const next=s.currentDraft().content;next.unknown.array=[];s.stage({baseRevisionId:s.get('active'),expectedDraftToken:token,content:next});
 assert.deepEqual(s.authorReview.contexts()[0],f.content);assert.deepEqual(s.authorReview.create('author-demo',f.req),f.created);
 const legacy=s.backup();legacy.storeSchemaVersion=9;legacy.authorReview.schemaVersion=1;delete legacy.authorReview.chunks;legacy.authorReview.drafts[token]={baseRevisionId:f.req.baseRevisionId,content:f.content};
 s.restore(legacy);assert.deepEqual(s.authorReview.contexts()[0],f.content);assert.deepEqual(s.authorReview.state().comments[0],f.created);
});

test('revision reuse is deterministic and one-to-one even for identical-content histories and repeated old-backup restores',t=>{
 const s=setup(t),content=s.snapshot(),a=s.get('active'),b=s.addRevision(content,'Distinct identical revision B'),c=s.addRevision(content,'Distinct identical revision C');
 s.set('active',c);const old=s.backup(),dest=setup(t);
 // Force an offset collision at source ID 1, with only one reusable identical row.
 const changed=dest.snapshot();changed.lessons[0].title='Synthetic destination conflict';dest.db.prepare('UPDATE revisions SET snapshot=? WHERE id=1').run(JSON.stringify(changed));
 dest.addRevision(content,'Reusable original snapshot');const existing=dump(dest).find(([name])=>name==='revisions')[1];
 const r=dest.restore(old);assert.equal(new Set(Object.values(r.revisions)).size,3);assert.notEqual(r.revisions[b],r.revisions[c]);
 const expected=dest.db.prepare('SELECT * FROM revisions ORDER BY id').all();assert.equal(expected.length,4);
 for(const row of existing)assert.deepEqual({...expected.find(r=>r.id===row.id)},row);
 for(let i=0;i<3;i++){
  const r2=dest.restore(old);assert.deepEqual(r2.revisions,r.revisions);
  dest.restore(dest.backup());assert.deepEqual(dest.db.prepare('SELECT * FROM revisions ORDER BY id').all(),expected);
 }
 assert.equal(dest.snapshot(r.revisions[a]).lessons[0].title,content.lessons[0].title);
});

test('large draft-only JSON is shared immutably across six saved tokens, with missing, corrupted or unsupported chunks rejected atomically',t=>{
 const s=setup(t),payload='😀 שָׁלוֹם exact draft-only field'.repeat(800),expected=[];
 for(let i=0;i<6;i++){
  const c=s.currentDraft()?.content||s.snapshot();c.privateFixture={payload};c.lessons[0].title='Synthetic recovery heading '+i;
  s.stage({baseRevisionId:s.get('active'),expectedDraftToken:s.currentDraft()?.draftToken??null,content:c});s.authorReview.create('author-demo',note(s));expected.push(c);
 }
 const state=s.authorReview.state();assert.equal(Object.keys(state.chunks).length,1);assert.equal(Object.keys(state.drafts).length,6);
 assert.ok(Buffer.byteLength(JSON.stringify(state))<Buffer.byteLength(payload)+20000);
 assert.deepEqual(s.authorReview.contexts(),expected);const saved=s.backup(),before=dump(s);
 const chunk=Object.keys(state.chunks)[0];
 for(const mutate of [b=>delete b.authorReview.chunks[chunk],b=>b.authorReview.chunks[chunk]=['v','forged'],b=>{const node=['unsupported',null],hash=contextHash(node);b.authorReview.chunks[hash]=node;},b=>{b.authorReview.chunks[contextHash(['r','0'.repeat(64)])]=['r','0'.repeat(64)];}]){
  const bad=structuredClone(saved);mutate(bad);assert.throws(()=>s.restore(bad));assert.deepEqual(dump(s),before);
 }
 for(let i=0;i<3;i++){s.restore(s.backup());assert.deepEqual(s.authorReview.state(),state);assert.deepEqual(s.authorReview.contexts(),expected);}
});

test('malformed deltas, base hashes, draft tokens, UTF-16 quotes, receipts, audit and mismatched readers reject before table or sequence writes over HTTP',async t=>{
 const s=setup(t),f=contextFixture(s),origin=await http(t,s),saved=s.backup(),token=f.req.draftToken;
 const cases=[
  b=>b.authorReview.drafts[token].baseHash='0'.repeat(64),
  b=>b.authorReview.drafts[token].baseRevisionId=9999,
  b=>b.authorReview.drafts[token].delta=['a',2,[]],
  b=>b.authorReview.drafts[token].delta=['o',[],[['lessons',['v',[]]]]],
  b=>b.authorReview.drafts[token].delta=['o',[],[['evil',['v',1]],['evil',['v',2]]]],
  b=>b.authorReview.drafts[token].content=f.content,
  b=>{b.authorReview.drafts['dt1-'+'0'.repeat(64)]=b.authorReview.drafts[token];delete b.authorReview.drafts[token];},
  b=>b.authorReview.comments[0].anchor.selection.start++,
  b=>b.authorReview.comments[0].anchor.sourceText+='forged',
  b=>b.authorReview.comments[0].audit[0].at='invalid',
  b=>b.authorReview.comments[0].request.body='forged',
  b=>b.authorReview.comments[0].request.fieldPath='forged',
  b=>b.authorReview.comments[0].anchor.contentHash='0'.repeat(64),
  b=>b.storeSchemaVersion=9,
  b=>b.authorReview.schemaVersion=1,
  b=>b.mediaRecovery.blobs[0].dataBase64='invalid',
 ];
 const before=dump(s),changes=s.db.prepare('SELECT total_changes() AS n').get().n;
 for(const mutate of cases){const bad=structuredClone(saved);mutate(bad);const response=await fetch(origin+'/api/restore',{method:'POST',headers,body:JSON.stringify(bad)});assert.ok([400,409].includes(response.status),(await response.text()));assert.deepEqual(dump(s),before);assert.equal(s.db.prepare('SELECT total_changes() AS n').get().n,changes);}
});

test('legacy reader 9 migration is lossless, atomic on invalid namespace, and marker-only for reader 8 without review',t=>{
 const dir=mkdtempSync(join(tmpdir(),'hebleo-context-migrate-')),file=join(dir,'legacy.sqlite');t.after(()=>rmSync(dir,{recursive:true,force:true}));
 let s=new Store(file);const f=contextFixture(s),legacy=s.authorReview.state();legacy.schemaVersion=1;delete legacy.chunks;legacy.drafts[f.req.draftToken]={baseRevisionId:f.req.baseRevisionId,content:f.content};s.set('author-review',legacy);s.set('schema-version',9);const before=dump(s);s.close();
 s=new Store(file);assert.equal(s.get('schema-version'),10);assert.deepEqual(s.authorReview.contexts()[0],f.content);assert.deepEqual(s.authorReview.state().comments[0],f.created);
 const after=dump(s);for(const [table,rows] of before)assert.deepEqual(after.find(([t])=>t===table)[1],table==='kv'?rows.map(r=>r.key==='schema-version'?{...r,value:'10'}:r.key==='author-review'?{...r,value:JSON.stringify(s.authorReview.state())}:r):rows);
 // A malformed old context must not even advance its reader marker.
 legacy.comments[0].anchor.contentHash='0'.repeat(64);s.set('author-review',legacy);s.set('schema-version',9);const invalid=dump(s);s.close();assert.throws(()=>new Store(file));const db=new DatabaseSync(file,{readOnly:true});try{assert.deepEqual(dump({db}),invalid);}finally{db.close();}
 const cleanFile=join(dir,'reader8.sqlite');s=new Store(cleanFile);s.set('schema-version',8);const clean=dump(s);s.close();s=new Store(cleanFile);try{assert.deepEqual(dump(s),clean.map(([table,rows])=>[table,table==='kv'?rows.map(r=>r.key==='schema-version'?{...r,value:'10'}:r):rows]));}finally{s.close();}
});

test('export validates the actual compact UTF-8 file and refuses oversized backup before sending any artifact; shared client/server bound is enforced',async t=>{
 const unicode={text:'😀שָׁלוֹם'};const compact=JSON.stringify(unicode),bytes=Buffer.byteLength(compact);
 assert.equal(serializeBackup(unicode,{limit:bytes}),compact);assert.throws(()=>serializeBackup(unicode,{limit:bytes-1}),e=>e.code==='BACKUP_TOO_LARGE');
 const s=setup(t),origin=await http(t,s),before=dump(s),actual=await fetch(origin+'/api/export',{headers});assert.equal(actual.status,200);const text=await actual.text();assert.equal(text,serializeBackup(JSON.parse(text)));
 assert.match(await (await fetch(origin+'/backup-contract.js')).text(),/BACKUP_BYTE_LIMIT = 200000000/);
 const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');assert.match(app,/file.size>BACKUP_BYTE_LIMIT/);assert.match(app,/hebleo-demo-backup.json'\?serializeBackup/);
 // Deliberately bypass Store.backup eligibility to prove the HTTP boundary itself checks.
 s.backup=()=>({text:'x'.repeat(BACKUP_BYTE_LIMIT)});
 const refused=await fetch(origin+'/api/export',{headers});assert.equal(refused.status,413);assert.equal((await refused.json()).code,'BACKUP_TOO_LARGE');assert.deepEqual(dump(s),before);
 // Stream chunks so this check exercises the real shared 200 MB HTTP body bound.
 const stream=new ReadableStream({start(c){let remaining=BACKUP_BYTE_LIMIT+1;while(remaining){const size=Math.min(1000000,remaining);c.enqueue(new Uint8Array(size).fill(32));remaining-=size;}c.close();}});
 const tooLarge=await fetch(origin+'/api/restore',{method:'POST',headers,body:stream,duplex:'half'});assert.equal(tooLarge.status,413);assert.equal((await tooLarge.json()).code,'PAYLOAD_TOO_LARGE');assert.deepEqual(dump(s),before);
});
