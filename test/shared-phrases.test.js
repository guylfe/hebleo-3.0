import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {parse,parseFragment} from 'parse5';
import {Store} from '../src/store.js';
import {audioSlots,sharedCardId} from '../src/shared-cards.js';
import {createRenderer,buildRuntime} from '../src/shared-card-adapter/index.mjs';
const current=process.env.HEBLEO_SHARED_SOURCE,previous=process.env.HEBLEO_SHARED_PREVIOUS_SOURCE,phraseFile=process.env.HEBLEO_PHRASE_MANIFEST;
const enabled=!!current&&!!previous&&!!phraseFile;
const sha=x=>createHash('sha256').update(x).digest('hex');
const json=p=>JSON.parse(readFileSync(p,'utf8'));
const all=n=>[n,...(n.childNodes||[]).flatMap(all)];
const attr=(n,key)=>n.attrs?.find(a=>a.name===key)?.value;
const text=n=>n.nodeName==='#text'?n.value:(n.childNodes||[]).map(text).join('');
const classIs=(n,c)=>attr(n,'class')?.split(' ').includes(c);
const input=dir=>{const raw=json(join(dir,'vocabulary.json')),manifest=json(join(dir,'media-manifest.json'));return {raw,manifest,blobs:manifest.map(m=>{const bytes=readFileSync(join(dir,'media',m.file));assert.equal(sha(bytes),m.sha256);assert.equal(bytes.length,m.bytes);return {sha256:m.sha256,mimeType:m.file.endsWith('.mp3')?'audio/mpeg':'image/png',byteLength:bytes.length,dataBase64:bytes.toString('base64')};})};};

test('CSP authorizes the exact HTML-parsed script on Windows and Linux checkouts',()=>{
 const note={id:'mf-999999',ankiGuid:'synthetic-csp',tags:[],fields:{SourceId:'mf-999999',Hebrew:'Synthetic fixture',English:'Synthetic CSP fixture',Forms:'',Notes:'',Grammar:'',Source:'',Audio:'',HebrewNikkud:'Synthetic fixture'}};
 const manifest=['_hebleo-logo-blue.png','_hebleo-logo-white.png'].map(file=>({file,bytes:1,sha256:'0'.repeat(64)}));const renderer=createRenderer({mediaManifest:manifest,mediaBaseUrl:'https://example.test/'});
 for(const mode of ['light','dark'])for(const nikkud of [false,true]){
  const tree=parse(renderer.renderCard({note,direction:'he-en',face:'back',settings:{mode,nikkud}})),script=all(tree).find(n=>n.tagName==='script'),policy=attr(all(tree).find(n=>n.tagName==='meta'&&attr(n,'http-equiv')==='Content-Security-Policy'),'content');
  const hash=createHash('sha256').update(text(script)).digest('base64');assert.ok(policy.includes("'sha256-"+hash+"'"),'CSP hash must use the script text the HTML parser actually executes');
 }
});

test('v2.2 source changes only appended exact examples and 97 immutable recordings',{skip:!enabled},()=>{
 const old=input(previous),next=input(current),phrases=json(phraseFile);assert.equal(next.raw.notes.length,1025);assert.equal(next.manifest.length,1426);assert.equal(phrases.length,97);
 assert.deepEqual(json(join(previous,'anki-templates.json')),json(join(current,'anki-templates.json')));
 let changed=0,bindings=0;const seen=new Set();
 for(const [i,note] of next.raw.notes.entries()){
  const before=old.raw.notes[i];assert.deepEqual({...note,fields:undefined},{...before,fields:undefined});
  assert.deepEqual({...note.fields,Forms:undefined},{...before.fields,Forms:undefined});assert.ok(note.fields.Forms.startsWith(before.fields.Forms));
  if(note.fields.Forms!==before.fields.Forms)changed++;
  const rows=all(parseFragment(note.fields.Forms)).filter(n=>attr(n,'data-phrase'));
  const expected=phrases.filter(p=>p.noteIds.includes(note.id));assert.equal(rows.length,expected.length);
  for(const phrase of expected){const row=rows.find(n=>attr(n,'data-phrase')===String(phrase.number));assert.ok(row);assert.equal(text(all(row).find(n=>classIs(n,'hc-pointed'))),phrase.text);assert.equal(text(all(row).find(n=>classIs(n,'hc-unpointed'))),phrase.text);assert.equal(attr(all(row).find(n=>n.tagName==='button'),'data-audio'),phrase.file);assert.equal(sha(readFileSync(join(current,'media',phrase.file))),phrase.sha256);bindings++;seen.add(phrase.number);}
 }
 assert.equal(changed,56);assert.equal(bindings,107);assert.equal(seen.size,97);
 for(const media of old.manifest){assert.deepEqual(next.manifest.find(n=>n.file===media.file),media);assert.ok(readFileSync(join(previous,'media',media.file)).equals(readFileSync(join(current,'media',media.file))));}
 assert.equal(phrases.find(p=>p.number===77).text,'ארוחת ערב גדולה');assert.equal(phrases.find(p=>p.number===78).text,'ארוחות ערב גדולות');
});

test('all 107 phrase bindings render with exact text/manual media in both directions and Nikkud states',{skip:!enabled},()=>{
 const next=input(current),phrases=json(phraseFile),renderer=createRenderer({mediaManifest:next.manifest,mediaBaseUrl:'https://example.test/verified/'});let rendered=0;
 for(const note of next.raw.notes)for(const direction of ['he-en','en-he'])for(const nikkud of [false,true]){
  const tree=parse(renderer.renderCard({note,direction,face:'back',settings:{mode:nikkud?'dark':'light',nikkud}}));
  const rows=all(tree).filter(n=>attr(n,'data-phrase')),expected=phrases.filter(p=>p.noteIds.includes(note.id));assert.equal(rows.length,expected.length);
  for(const p of expected){const row=rows.find(n=>attr(n,'data-phrase')===String(p.number));assert.equal(text(all(row).find(n=>classIs(n,'hc-pointed'))),p.text);assert.equal(text(all(row).find(n=>classIs(n,'hc-unpointed'))),p.text);assert.equal(attr(all(row).find(n=>n.tagName==='button'),'data-audio'),'https://example.test/verified/'+p.file);rendered++;}
  assert.ok(!all(tree).some(n=>n.tagName==='audio'&&attr(n,'autoplay')!==undefined));
 }
 assert.equal(rendered,428);
 const runtime=buildRuntime({vocabulary:next.raw,templates:json(join(current,'anki-templates.json')),mediaManifest:next.manifest,mediaBaseUrl:'https://example.test/verified/'});
 assert.equal(runtime.packageSha256,next.raw.packageSha256);assert.deepEqual(runtime.raw,next.raw);assert.equal(runtime.cards.length,2050);
});

test('v2.1 upgrade and v2.2 reimport retain IDs, progress, settings, receipts, draft and existing audio overlays without reset',{skip:!enabled},()=>{
 const old=input(previous),next=input(current),s=new Store();try{
  s.shared.importPackage('author-demo',old);s.stage({baseRevisionId:s.get('active'),expectedDraftToken:null,content:s.snapshot()});
  const first=sharedCardId('mf-000361','he-en'),second=sharedCardId('mf-000361','en-he');s.enroll('learner-demo',first);s.enroll('learner-demo',second);s.review('learner-demo',{requestId:'before-v22-review',wordId:first,rating:3,expectedCard:s.learner('learner-demo').cards[first]});s.shared.saveSettings('learner-demo',{mode:'dark',nikkud:true});
  const slot=audioSlots(s.shared.note('mf-000361')).find(x=>x.formKey==='Forms:0'),blob=old.blobs.find(b=>b.mimeType==='audio/mpeg'&&b.sha256!==slot.file.replace('.mp3',''));s.shared.updateAudio('author-demo',{sourceId:'mf-000361',...slot,blob});
  const tables=['learners','revisions','events','media_aliases','sqlite_sequence'],before=Object.fromEntries(tables.map(t=>[t,s.db.prepare('SELECT * FROM '+t+' ORDER BY rowid').all()])),kv=s.db.prepare('SELECT * FROM kv ORDER BY key').all().filter(r=>r.key!=='shared-cards'),media=s.db.prepare('SELECT * FROM media_blobs ORDER BY sha256').all(),overlays=structuredClone(s.shared.state().overlays);
  s.resetDemoProgressForBuild=()=>assert.fail('Phrase update must never reset progress');
  s.shared.importPackage('author-demo',{...next,expectedRevision:s.shared.state().revision});
  for(const t of tables)assert.deepEqual(s.db.prepare('SELECT * FROM '+t+' ORDER BY rowid').all(),before[t],t);for(const r of kv)assert.equal(s.db.prepare('SELECT value FROM kv WHERE key=?').get(r.key)?.value,r.value);
  for(const r of media)assert.deepEqual(s.db.prepare('SELECT * FROM media_blobs WHERE sha256=?').get(r.sha256),r);
  assert.deepEqual(s.shared.state().overlays,overlays);assert.deepEqual(s.shared.state().raw,next.raw);
  const after=s.backup();s.shared.importPackage('author-demo',{...next,expectedRevision:s.shared.state().revision});const reimport=s.backup();delete after.exportedAt;delete reimport.exportedAt;assert.deepEqual(reimport,after);
  assert.throws(()=>s.shared.importPackage('author-demo',{...old,expectedRevision:s.shared.state().revision}),/Older source import refused/);
  assert.deepEqual(s.learner('learner-demo').cards[first].repetitions,1);assert.deepEqual(s.learner('learner-demo').cards[second].repetitions,0);
  const restored=new Store();try{restored.restore(s.backup());assert.deepEqual(restored.shared.state(),s.shared.state());assert.deepEqual(restored.learner('learner-demo'),s.learner('learner-demo'));}finally{restored.close();}
 }finally{s.close();}
});
