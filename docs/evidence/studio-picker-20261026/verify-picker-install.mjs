import assert from 'node:assert/strict';
import {DatabaseSync,backup} from 'node:sqlite';
import {readFileSync,writeFileSync,mkdirSync,existsSync,statSync,readdirSync,copyFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {databaseReceipt,executableIdentity,sha256,openPreservedStore} from './hebleo-lesson-picker/scripts/runtime-state.mjs';

const [mode,root,folder,database,port]=process.argv.slice(2);
const json=file=>JSON.parse(readFileSync(file,'utf8'));
const save=(name,value)=>writeFileSync(join(folder,name),JSON.stringify(value,null,2)+'\n');
const stateRoot='C:/Users/Trans/.openmausbot/task-workspaces/8c900356-50f6-4d41-bbb9-50c8abe09233/b1d5e7a0-1d13-4e9e-b544-06d3b889fb9e/hebleo-consolidated';
function protectedFiles(){
 const result={};
 function visit(file){
  if(!existsSync(file)){result[file]={exists:false};return;}
  const s=statSync(file);assert.ok(!s.isSymbolicLink?.(),'No linked preservation target');
  if(s.isDirectory()){result[file]={directory:true};for(const entry of readdirSync(file).sort())visit(join(file,entry));}
  else result[file]={size:s.size,sha256:sha256(readFileSync(file))};
 }
 for(const name of ['.env','.private/google-auth.bin','tmp/lexical-demo-media','uploads','config','config.json'])visit(resolve(stateRoot,name));
 return result;
}
if(mode==='snapshot'){
 assert.ok(!existsSync(folder),'Never overwrite earlier preservation evidence');mkdirSync(folder,{recursive:true});
 const before=databaseReceipt(database),files=protectedFiles();
 const source=new DatabaseSync(database,{readOnly:true});try{await backup(source,join(folder,'before.sqlite'));}finally{source.close();}
 assert.deepEqual(databaseReceipt(join(folder,'before.sqlite')),before);
 copyFileSync(join(folder,'before.sqlite'),join(folder,'restore-rehearsal.sqlite'));
 const rehearsal=openPreservedStore(join(folder,'restore-rehearsal.sqlite'));rehearsal.store.close();
 const db=new DatabaseSync(join(folder,'restore-rehearsal.sqlite'),{readOnly:true});try{assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');}finally{db.close();}
 assert.deepEqual(databaseReceipt(join(folder,'restore-rehearsal.sqlite')),before);assert.deepEqual(databaseReceipt(database),before);assert.deepEqual(protectedFiles(),files);
 save('PRESERVATION_BEFORE.json',{createdAt:new Date().toISOString(),before,files,onlineBackupVerified:true,restoreRehearsalVerified:true});
 console.log(JSON.stringify({backup:folder,databaseSHA256:before.sha256,onlineBackupVerified:true,restoreRehearsalVerified:true}));
}else if(mode==='assert'){
 const receipt=json(join(folder,'PRESERVATION_BEFORE.json'));
 assert.deepEqual(databaseReceipt(database),receipt.before);assert.deepEqual(protectedFiles(),receipt.files);
 console.log(JSON.stringify({entireDatabaseUnchanged:true,protectedFilesUnchanged:true,sha256:receipt.before.sha256}));
}else if(mode==='verify'){
 const identity=json(join(folder,'BUILD.json')),receipt=json(join(folder,'PRESERVATION_BEFORE.json'));
 assert.deepEqual(executableIdentity(root,identity.revision),identity);assert.deepEqual(databaseReceipt(database),receipt.before);assert.deepEqual(protectedFiles(),receipt.files);
 const db=new DatabaseSync(database,{readOnly:true});let active,draft,learners;
 try{db.exec('BEGIN');const kv=k=>JSON.parse(db.prepare('SELECT value FROM kv WHERE key=?').get(k).value);active=kv('active');draft=kv('draft');assert.equal(kv('schema-version'),8);learners=db.prepare('SELECT * FROM learners ORDER BY id').all();}finally{db.close();}
 assert.equal(active,4);assert.equal(learners.length,3);assert.equal(draft.content.lessons.length,23);
 const added=draft.content.lessons.filter(l=>l.draftImport);assert.equal(added.length,20);
 assert.equal(added.reduce((n,l)=>n+l.blocks[0].textPages.pages.length,0),154);
 assert.equal(added.reduce((n,l)=>n+l.draftTargets.length,0),127);
 assert.equal(added.flatMap(l=>l.draftTargets).filter(t=>t.mappingStatus!=='resolved').length,127);
 const origin='http://127.0.0.1:'+port;
 const call=async(path,body,user='author-demo')=>{
  const r=await fetch(origin+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{'x-demo-user':user,'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:r.status,value:await r.json()};
 };
 const build=await call('build');assert.equal(build.status,200);assert.deepEqual(build.value,identity);
 const assets={};
 for(const [file,expected]of Object.entries(identity.files).filter(([f])=>f.startsWith('public/')&&!f.endsWith('.d.ts')&&!f.endsWith('.txt')&&!f.endsWith('.gitattributes')&&f!=='public/studio/media-picker.js')){
  const url=file==='public/index.html'?'/':'/'+file.slice(7),r=await fetch(origin+url);assert.equal(r.status,200,url);const hash=sha256(Buffer.from(await r.arrayBuffer()));assert.equal(hash,expected,url);assets[url]=hash;
 }
 for(const [url,file]of Object.entries({'/vendor/marked.js':'node_modules/marked/lib/marked.esm.js','/vendor/purify.js':'node_modules/dompurify/dist/purify.es.mjs'})){
  const r=await fetch(origin+url);assert.equal(r.status,200);const hash=sha256(Buffer.from(await r.arrayBuffer()));assert.equal(hash,sha256(readFileSync(join(root,file))));assets[url]=hash;
 }
 const studio=await call('studio');assert.equal(studio.status,200);assert.deepEqual(studio.value.draft.content,draft.content);assert.equal(studio.value.revisionId,active);
 let pages=0,sessions=0;
 for(const lesson of added){const p=await call('studio/preview/session',{lessonId:lesson.id,draftToken:studio.value.draft.draftToken});assert.equal(p.status,200);assert.equal(p.value.persistent,false);const projected=p.value.content.lessons.find(l=>l.id===lesson.id);assert.deepEqual(projected.blocks[0].textPages,lesson.blocks[0].textPages);pages+=projected.blocks[0].textPages.pages.length;}
 for(const row of learners){
  const boot=await call('bootstrap',undefined,row.id);assert.equal(boot.status,200);assert.equal(boot.value.revisionId,active);assert.ok(boot.value.content.lessons.every(l=>!added.some(a=>a.id===l.id)));
  const expected=JSON.parse(row.state);for(const [key,value]of Object.entries(expected))if(key==='preferences'){for(const [name,v]of Object.entries(value))assert.deepEqual(boot.value.learner.preferences[name],v);}else assert.deepEqual(boot.value.learner[key],value);
  if(row.id==='learner-demo')for(const lesson of boot.value.content.lessons){assert.equal((await call('session?lessonId='+encodeURIComponent(lesson.id),undefined,row.id)).status,200);sessions++;}
 }
 const unpublished=await call('session?lessonId=draft-first20-MEMORY',undefined,'learner-demo');assert.equal(unpublished.status,404);
 const alias=await call('studio/identity/resolve',{kind:'lessons',value:'MNT'});assert.equal(alias.status,200);assert.equal(alias.value.id,'draft-first20-MNT');
 assert.deepEqual(databaseReceipt(database),receipt.before);assert.deepEqual(protectedFiles(),receipt.files);
 const result={verifiedAt:new Date().toISOString(),origin,revision:identity.revision,runtimeSha256:identity.runtimeSha256,backendSha256:identity.backendSha256,executableFiles:Object.keys(identity.files).length,servedAssets:assets,entireDatabasePreserved:true,databaseBefore:receipt.before,databaseAfter:databaseReceipt(database),protectedFiles:receipt.files,activeRevision:active,learners:learners.length,priorDraftLessons:3,unpublishedLessons:added.length,previewPages:pages,unresolvedTargets:127,legacyLearnerSessions:sessions,unpublishedRouteStatus:404,alias:alias.value.id,nativeVerified:false};
 save('DESTINATION-'+port+'.json',result);console.log(JSON.stringify({...result,servedAssets:Object.keys(assets).length,databaseBefore:undefined,databaseAfter:undefined,protectedFiles:undefined}));
}else throw Error('Use snapshot or verify');
