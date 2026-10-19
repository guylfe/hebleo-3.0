import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,renameSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {Store} from '../src/store.js';
import {prepareDemoProgress} from '../src/server.js';

import {demoBuildFingerprint,demoBuildFiles} from '../src/demo-build.js';

function directory(t,cleanup=true){const dir=mkdtempSync(join(tmpdir(),'hebleo-build-'));if(cleanup)t.after(()=>rmSync(dir,{recursive:true,force:true}));return dir;}

test('Demo reset clears only progress for all three profiles once per build and survives process restart',t=>{
  const dir=directory(t,false),path=join(dir,'demo.sqlite');let store=new Store(path);t.after(()=>{store.close();rmSync(dir,{recursive:true,force:true});});
  store.resetDemoProgressForBuild('build-a');
  const content=store.snapshot();store.stage({baseRevisionId:store.get('active'),expectedDraftToken:null,word:{id:'w-ani',notes:'Keep authored draft'}});
  for(const user of ['learner-demo','learner-core','author-demo']){
    store.updateLearner(user,{nikkud:'full',keyboardPinned:true});
    const attempt=store.attempt(user,{requestId:user+'-answer',revisionId:1,exerciseId:'ex-1-type',answer:'אני'});
    store.saveProgress(user,{lessonId:'lesson-1',revisionId:1,step:'apply',question:0,answer:'אני',matching:{},selectedTokens:[],resultRequestId:attempt.requestId,practiceIds:[]});
    store.enroll(user,'w-ani');store.review(user,{requestId:user+'-review',wordId:'w-ani',rating:3});
    const state=store.learner(user);state.completed=['lesson-1'];store.saveLearner(user,state);
  }
  const membership=store.learner('learner-core').membership;
  store.close();store=new Store(path);assert.equal(store.resetDemoProgressForBuild('build-a'),false);assert.equal(store.learner('learner-demo').attempts.length,1);
  assert.equal(store.resetDemoProgressForBuild('build-b'),true);
  for(const user of ['learner-demo','learner-core','author-demo']){
    const state=store.learner(user);assert.deepEqual(state.attempts,[]);assert.deepEqual(state.completed,[]);assert.deepEqual(state.resumes,{});assert.deepEqual(state.cards,{});assert.equal(state.lastReview,null);assert.equal(state.lastLessonId,undefined);
    assert.equal(state.preferences.nikkud,'full');assert.equal(state.preferences.keyboardPinned,true);
  }
  assert.equal(store.learner('learner-core').membership,membership);assert.deepEqual(store.snapshot(),content);assert.equal(store.get('draft').content.words.find(w=>w.id==='w-ani').notes,'Keep authored draft');assert.deepEqual(store.backup().reviewReceipts,[]);
  store.attempt('learner-demo',{requestId:'fresh-answer',revisionId:1,exerciseId:'ex-1-type',answer:'אני'});assert.equal(store.resetDemoProgressForBuild('build-b'),false);assert.equal(store.learner('learner-demo').attempts.length,1);
});

test('Demo fingerprint detects app edits, ignores documentation edits and normalizes Windows line endings',async t=>{
  const dir=directory(t);mkdirSync(join(dir,'public'));mkdirSync(join(dir,'src'));writeFileSync(join(dir,'package-lock.json'),'{}');writeFileSync(join(dir,'public','app.js'),'one\ntwo\n');writeFileSync(join(dir,'src','store.js'),'store');
  const initial=await demoBuildFingerprint(dir);writeFileSync(join(dir,'public','app.js'),'one\r\ntwo\r\n');assert.equal(await demoBuildFingerprint(dir),initial);
  writeFileSync(join(dir,'README.md'),'Documentation change');assert.equal(await demoBuildFingerprint(dir),initial);
  writeFileSync(join(dir,'public','app.js'),'different');assert.notEqual(await demoBuildFingerprint(dir),initial);
});

// Release review RR-B2-01: Studio and preview modules live in subfolders, so a nested-only deployment must still count as a new build.
function buildTree(t){
  const dir=directory(t);
  const files={'package-lock.json':'{}','public/app.js':'app\n','public/studio/studio.css':'.studio{}\n','public/studio/exercise-editor.js':'editor\n','public/preview/lesson-preview.js':'preview\n','src/store.js':'store\n','docs/STATUS.md':'docs\n','data/hebleo-demo.sqlite':'mutable\n','uploads/clip.js':'media\n'};
  for(const [path,body] of Object.entries(files)){mkdirSync(dirname(join(dir,path)),{recursive:true});writeFileSync(join(dir,path),body);}
  return dir;
}

test('Demo fingerprint covers nested executable assets at any depth and ignores docs, data and uploads',async t=>{
  const dir=buildTree(t),at=path=>join(dir,...path.split('/')),fingerprint=()=>demoBuildFingerprint(dir);
  assert.deepEqual(await demoBuildFiles(dir),['package-lock.json','public/app.js','public/preview/lesson-preview.js','public/studio/exercise-editor.js','public/studio/studio.css','src/store.js']);
  const initial=await fingerprint();
  writeFileSync(at('public/studio/studio.css'),'.studio{}\r\n');assert.equal(await fingerprint(),initial,'nested Windows line endings normalize');
  writeFileSync(at('public/studio/studio.css'),'.studio{color:red}\n');assert.notEqual(await fingerprint(),initial,'nested edit');
  writeFileSync(at('public/studio/studio.css'),'.studio{}\n');assert.equal(await fingerprint(),initial,'reverting gives the same build');
  mkdirSync(at('public/preview/deep'));writeFileSync(at('public/preview/deep/added.js'),'added\n');assert.notEqual(await fingerprint(),initial,'nested addition at any depth');
  rmSync(at('public/preview/deep'),{recursive:true});assert.equal(await fingerprint(),initial);
  rmSync(at('public/studio/exercise-editor.js'));assert.notEqual(await fingerprint(),initial,'nested removal');
  writeFileSync(at('public/studio/exercise-editor.js'),'editor\n');assert.equal(await fingerprint(),initial);
  renameSync(at('public/preview/lesson-preview.js'),at('public/studio/lesson-preview.js'));assert.notEqual(await fingerprint(),initial,'moving a module between folders');
  renameSync(at('public/studio/lesson-preview.js'),at('public/preview/lesson-preview.js'));assert.equal(await fingerprint(),initial);
  mkdirSync(at('public/studio/empty'));
  for(const path of ['README.md','docs/STATUS.md','public/studio/NOTES.md','data/hebleo-demo.sqlite','uploads/clip.js']){writeFileSync(at(path),'changed '+path);assert.equal(await fingerprint(),initial,path+' is not part of the build');}
});

test('Startup reset follows nested-only deployments once per build and keeps settings, content and drafts',async t=>{
  const dir=buildTree(t),store=new Store();t.after(()=>store.close());
  const profiles=['learner-demo','learner-core','author-demo'],attempts=()=>profiles.map(u=>store.learner(u).attempts.length);
  const start=()=>prepareDemoProgress(store,{enabled:true,fingerprint:()=>demoBuildFingerprint(dir)});
  const practise=()=>{for(const u of profiles)store.attempt(u,{requestId:randomUUID(),revisionId:store.get('active'),exerciseId:'ex-1-type',answer:'אני'});};
  assert.equal(await start(),true,'first startup records the build');
  for(const u of profiles)store.updateLearner(u,{nikkud:'full',keyboardPinned:true});
  store.stage({baseRevisionId:store.get('active'),expectedDraftToken:null,word:{id:'w-ani',notes:'Authored draft kept'}});const content=store.snapshot();
  practise();assert.equal(await start(),false,'same build');assert.deepEqual(attempts(),[1,1,1]);
  writeFileSync(join(dir,'docs','STATUS.md'),'documentation-only update');assert.equal(await start(),false,'documentation-only update');assert.deepEqual(attempts(),[1,1,1]);
  const deployments={edit:()=>writeFileSync(join(dir,'public','studio','studio.css'),'.studio{color:red}\n'),add:()=>writeFileSync(join(dir,'public','preview','added.js'),'added\n'),remove:()=>rmSync(join(dir,'public','studio','exercise-editor.js'))};
  for(const [name,deploy] of Object.entries(deployments)){
    deploy();assert.equal(await start(),true,'nested-only '+name+' resets');assert.deepEqual(attempts(),[0,0,0],name);
    for(const u of profiles){const p=store.learner(u).preferences;assert.equal(p.nikkud,'full');assert.equal(p.keyboardPinned,true);}
    assert.deepEqual(store.snapshot(),content);assert.equal(store.currentDraft().content.words.find(w=>w.id==='w-ani').notes,'Authored draft kept');
    practise();assert.equal(await start(),false,name+': once per build');assert.deepEqual(attempts(),[1,1,1]);
  }
});

test('The checkout fingerprint includes every nested public module and no docs or mutable data',async()=>{
  const root=fileURLToPath(new URL('..',import.meta.url)),listed=await demoBuildFiles();
  const nested=readdirSync(join(root,'public'),{recursive:true}).map(p=>p.split('\\').join('/')).filter(p=>p.includes('/')&&/\.(js|css|html|svg)$/.test(p)).map(p=>'public/'+p);
  for(const folder of ['public/studio/','public/preview/'])assert.ok(nested.some(p=>p.startsWith(folder)),folder+' modules exist');
  for(const path of nested)assert.ok(listed.includes(path),path+' is part of the build');
  assert.ok(listed.includes('src/demo-build.js'));assert.ok(listed.every(p=>p==='package-lock.json'||/^(public|src)\//.test(p)));
});
