import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {Store,STORE_SCHEMA_VERSION} from '../src/store.js';
import {createServer} from '../src/server.js';
import {audioSlots,sharedCardId,validateCardSettings} from '../src/shared-cards.js';
import {createRenderer} from '../src/shared-card-adapter/index.mjs';
const source=process.env.HEBLEO_SHARED_SOURCE;
let pack;
function input(){
 if(!pack){const json=n=>JSON.parse(readFileSync(join(source,n),'utf8'));const raw=json('vocabulary.json'),manifest=json('media-manifest.json');
 pack={raw,manifest,blobs:manifest.map(m=>({sha256:m.sha256,byteLength:m.bytes,mimeType:m.file.endsWith('.mp3')?'audio/mpeg':'image/png',dataBase64:readFileSync(join(source,'media',m.file)).toString('base64')}))};}
 return structuredClone(pack);
}
function setup(t,path=':memory:'){const s=new Store(path);t.after(()=>s.close());s.shared.importPackage('author-demo',input());return s;}
test('shared display malicious fields, URLs and settings reject (synthetic security fixture)',()=>{
 assert.throws(()=>validateCardSettings({mode:'light',nikkud:true,html:'evil'}));
 const renderer=createRenderer({mediaManifest:[],mediaBaseUrl:'https://example.test/'});
 assert.doesNotMatch(renderer.sanitize('<script>evil()</script><p onclick="evil()" style="display:none">Synthetic security fixture</p>'),/script|onclick|style/);
 assert.throws(()=>renderer.sanitize('<button data-audio="../evil.mp3">Bad</button>'));
});
test('approved full raw package import/reimport, source slots, stable directions and content preservation',{skip:!source},t=>{
 const s=setup(t),state=s.shared.state(),before=s.backup(),revision=state.revision;
 assert.equal(state.raw.notes.length,1025);assert.equal(state.manifest.length,1329);
 for(const n of state.raw.notes)audioSlots(n);
 assert.deepEqual(state.raw,input().raw);assert.equal(s.bootstrap('learner-demo').due.length,0);
 s.shared.importPackage('author-demo',{...input(),expectedRevision:revision});
 assert.deepEqual(s.backup().learners,before.learners);assert.deepEqual(s.snapshot(),before.content);assert.deepEqual(s.currentDraft(),before.draft);
 assert.equal(s.shared.collection('learner-demo').total,1025);
 assert.equal(s.shared.collection('learner-demo',{offset:1000}).rows.length,25);
 assert.equal(s.shared.collection('learner-demo',{search:'mf-001025'}).rows.length,1);
 assert.throws(()=>s.shared.importPackage('learner-demo',input()));
 const bad=input();bad.raw.notes[0].fields.English='unapproved';assert.throws(()=>s.shared.importPackage('author-demo',{...bad,expectedRevision:revision}));
});
test('both direction schedules persist; review retry/conflict/undo/access use existing scheduler',{skip:!source},t=>{
 const s=setup(t),a=sharedCardId('mf-000001','he-en'),b=sharedCardId('mf-000001','en-he');
 s.enroll('learner-demo',a);s.enroll('learner-demo',b);
 const before=s.learner('learner-demo').cards[a],request={requestId:'shared-review-1',wordId:a,rating:3,expectedCard:before};
 const result=s.review('learner-demo',request);assert.equal(result.card.repetitions,1);assert.equal(s.review('learner-demo',request).duplicate,true);
 assert.deepEqual(s.learner('learner-demo').cards[b].repetitions,0);
 assert.throws(()=>s.review('learner-demo',{...request,requestId:'stale'}),e=>e.code==='REVIEW_CARD_CHANGED');
 s.undoReview('learner-demo',{requestId:request.requestId});assert.deepEqual(s.learner('learner-demo').cards[a],before);
 const learner=s.learner('learner-demo');learner.purchasedCourses=[];s.saveLearner('learner-demo',learner);
 assert.equal(s.bootstrap('learner-demo').due.length,0);assert.throws(()=>s.enroll('learner-demo',a));assert.throws(()=>s.shared.collection('learner-demo'));assert.throws(()=>s.review('learner-demo',request));
});
test('exact source/form audio overlay preserves raw fields/card identity, rejects unrelated phrase binding',{skip:!source},t=>{
 const s=setup(t),note=s.shared.note('mf-000001'),slot=audioSlots(note)[0],baseRaw=structuredClone(s.shared.state().raw);
 const blob=input().blobs.find(b=>b.mimeType==='audio/mpeg'&&b.sha256!==slot.file.replace('.mp3',''));
 const id=sharedCardId(note.id,'he-en');s.enroll('learner-demo',id);const before=s.learner('learner-demo').cards;
 const overlay=s.shared.updateAudio('author-demo',{sourceId:note.id,...slot,blob});
 s.shared.importPackage('author-demo',{...input(),expectedRevision:s.shared.state().revision});
 assert.deepEqual(s.shared.state().raw,baseRaw);assert.deepEqual(s.learner('learner-demo').cards,before);
 assert.ok(s.shared.document('learner-demo',id,'back','http://127.0.0.1:1234/media/').html.includes(overlay.file));
 assert.throws(()=>s.shared.updateAudio('author-demo',{sourceId:note.id,...slot,formValue:'unrelated phrase',blob}));
 assert.throws(()=>s.shared.updateAudio('author-demo',{sourceId:note.id,...slot,blob}));
 const restored=new Store();try{restored.restore(s.backup());assert.deepEqual(restored.shared.state().overlays,s.shared.state().overlays);assert.deepEqual(restored.learner('learner-demo').cards,before);}finally{restored.close();}
 const formSlot=audioSlots(note).find(slot=>slot.formKey.startsWith('Forms:'));
 s.shared.updateAudio('author-demo',{sourceId:note.id,...formSlot,blob});
 assert.ok(s.shared.document('learner-demo',id,'back','http://127.0.0.1:1234/media/').html.includes(overlay.file));
});
test('real SQLite reload and backup roundtrip retain namespace, bytes, settings, drafts and schedules; incomplete restore rejects',{skip:!source},t=>{
 const s=setup(t);s.stage({baseRevisionId:s.get('active'),expectedDraftToken:null,content:s.snapshot()});
 for(const direction of ['he-en','en-he'])s.enroll('learner-demo',sharedCardId('mf-000001',direction));
 s.shared.saveSettings('learner-demo',{mode:'dark',nikkud:true});
 const backup=s.backup(),dir=mkdtempSync(join(tmpdir(),'shared-roundtrip-')),path=join(dir,'test.sqlite');
 let target=new Store(path);
 try{
 target.restore(backup);assert.deepEqual(target.shared.state(),s.shared.state());assert.deepEqual(target.learner('learner-demo'),s.learner('learner-demo'));assert.deepEqual(target.currentDraft().content,s.currentDraft().content);
 target.close();target=new Store(path);assert.equal(target.get('schema-version'),STORE_SCHEMA_VERSION);assert.deepEqual(target.shared.settings('learner-demo'),{mode:'dark',nikkud:true});
 const bad=structuredClone(backup);delete bad.sharedCards;assert.throws(()=>target.restore(bad));
 const old=structuredClone(backup);old.storeSchemaVersion=10;delete old.sharedCards;assert.throws(()=>target.restore(old));
 const corrupt=structuredClone(backup);corrupt.sharedCards.raw.notes[0].fields.English='corrupt';assert.throws(()=>target.restore(corrupt));
 assert.deepEqual(target.shared.state(),backup.sharedCards);
 }finally{target.close();rmSync(dir,{recursive:true,force:true});}
});
test('real app headers authorize sandbox document and byte ranges; reject forged tickets, cross origin, invalid face, denied learner',{skip:!source},async t=>{
 const s=setup(t),server=createServer(s);await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));const base='http://127.0.0.1:'+server.address().port;
 const post=(path,body,user='learner-demo')=>fetch(base+'/api/'+path,{method:'POST',headers:{'content-type':'application/json','x-demo-user':user},body:JSON.stringify(body)});
 const root=await fetch(base);assert.match(root.headers.get('content-security-policy'),/script-src 'self'/);
 const id=sharedCardId('mf-000001','en-he'),response=await post('shared-cards/ticket',{cardId:id,face:'back'});assert.equal(response.status,200);
 const {url}=await response.json(),document=await fetch(base+url),html=await document.text(),csp=document.headers.get('content-security-policy');
 assert.match(csp,/script-src 'sha256-/);assert.doesNotMatch(csp,/script-src 'unsafe-inline'/);assert.match(csp,/frame-ancestors 'self'/);assert.ok(html.includes('Replay base audio'));assert.ok(html.includes('hebleo-card-settings'));
 const src=/data-audio="([^"]+)"/.exec(html)[1],media=await fetch(src,{headers:{range:'bytes=0-9'}});assert.equal(media.status,206);assert.equal((await media.arrayBuffer()).byteLength,10);
 assert.equal((await fetch(src,{headers:{range:'bytes=999999999-'}})).status,416);
 assert.equal((await fetch(base+'/shared-card/forged')).status,403);
 assert.equal((await post('shared-cards/ticket',{cardId:id,face:'<script>'})).status,404);
 assert.equal((await fetch(base+'/api/bootstrap',{headers:{origin:'https://evil.test'}})).status,403);
 await post('shared-cards/settings',{mode:'dark',nikkud:true});
 const again=await (await post('shared-cards/ticket',{cardId:id,face:'front'})).json();assert.match(await (await fetch(base+again.url)).text(),/data-hebleo-mode="dark"/);
 const learner=s.learner('learner-demo');learner.purchasedCourses=[];s.saveLearner('learner-demo',learner);
 assert.equal((await fetch(base+url)).status,403);assert.equal((await fetch(src)).status,403);
});
