import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync,statSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {databaseReceipt,executableIdentity,sha256} from './hebleo-first20/scripts/runtime-state.mjs';
import {assertTextInstallPreservation} from './hebleo-first20/scripts/prepare-text-install.mjs';

const [folder,database,port]=process.argv.slice(2),root=resolve('hebleo-first20');
assert.ok(folder&&database&&port,'Supply receipt folder, database and port.');
const receipt=JSON.parse(readFileSync(join(folder,'receipt.json'))),identity=JSON.parse(readFileSync('FIRST20_BUILD_2053b8f.json'));
assert.deepEqual(executableIdentity(root,identity.revision),identity);
const tables=file=>{const db=new DatabaseSync(file,{readOnly:true});try{db.exec('BEGIN');return Object.fromEntries(db.prepare("SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name").all().map(({name})=>[name,db.prepare('SELECT * FROM "'+name.replaceAll('"','""')+'" ORDER BY 1').all()]));}finally{db.close();}};
const before=tables(join(folder,'before.sqlite')),after=tables(database),kv=(data,key)=>JSON.parse(data.kv.find(row=>row.key===key).value);
assertTextInstallPreservation(before,after);
assert.equal(kv(after,'schema-version'),8);
const oldDraft=kv(before,'draft'),draft=kv(after,'draft');
const oldContent=oldDraft?.content||JSON.parse(before.revisions.find(row=>row.id===kv(before,'active')).snapshot);
for(const lesson of oldContent.lessons)assert.deepEqual(draft.content.lessons.find(l=>l.id===lesson.id),lesson);
for(const key of ['words','exercises'])assert.deepEqual(draft.content[key],oldContent[key]);
const pack=JSON.parse(readFileSync(join(root,'docs/curriculum/first20-20261025/content.json')));
const added=pack.lessons.map(source=>draft.content.lessons.find(l=>l.id==='draft-first20-'+source.id));
assert.equal(added.length,20);assert.ok(added.every(Boolean));
assert.equal(added.reduce((n,l)=>n+l.blocks[0].textPages.pages.length,0),154);
assert.equal(added.reduce((n,l)=>n+l.draftTargets.length,0),127);
assert.equal(added.flatMap(l=>l.draftTargets).filter(t=>t.mappingStatus!=='resolved').length,127);
const protectedFileResults={};
for(const [file,expected] of Object.entries(receipt.files)){
 if(expected.exists===false){assert.equal(existsSync(file),false);protectedFileResults[file]={exists:false};}
 else{const actual={size:statSync(file).size,sha256:sha256(readFileSync(file))};assert.deepEqual(actual,expected);protectedFileResults[file]=actual;}
}
const stableReceipt=databaseReceipt(database),origin='http://127.0.0.1:'+port;
const call=async(path,body,user='author-demo')=>{
 const r=await fetch(origin+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{'x-demo-user':user,'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 return {status:r.status,value:await r.json()};
};
const build=await call('build');assert.equal(build.status,200);assert.deepEqual(build.value,identity);
const assets={};
for(const [file,expected] of Object.entries(identity.files).filter(([file])=>file.startsWith('public/')&&!file.endsWith('.d.ts')&&!file.endsWith('.txt')&&!file.endsWith('.gitattributes')&&file!=='public/studio/media-picker.js')){
 const url=file==='public/index.html'?'/':'/'+file.slice(7),r=await fetch(origin+url);assert.equal(r.status,200,url);
 const actual=sha256(Buffer.from(await r.arrayBuffer()));assert.equal(actual,expected,url);assets[url]=actual;
}
for(const [url,file] of Object.entries({'/vendor/marked.js':'node_modules/marked/lib/marked.esm.js','/vendor/purify.js':'node_modules/dompurify/dist/purify.es.mjs'})){
 const r=await fetch(origin+url);assert.equal(r.status,200);const actual=sha256(Buffer.from(await r.arrayBuffer()));assert.equal(actual,sha256(readFileSync(join(root,file))));assets[url]=actual;
}
const studio=await call('studio');assert.equal(studio.status,200);assert.deepEqual(studio.value.draft.content,draft.content);assert.equal(studio.value.revisionId,kv(before,'active'));
const currentToken=studio.value.draft.draftToken;
let previewPageCount=0,learnerSessions=0;
for(const lesson of added){
 const preview=await call('studio/preview/session',{lessonId:lesson.id,draftToken:currentToken});assert.equal(preview.status,200);assert.equal(preview.value.persistent,false);
 const projected=preview.value.content.lessons.find(l=>l.id===lesson.id);assert.deepEqual(projected.blocks[0].textPages,lesson.blocks[0].textPages);previewPageCount+=projected.blocks[0].textPages.pages.length;
}
for(const row of before.learners){
 const boot=await call('bootstrap',undefined,row.id);assert.equal(boot.status,200);assert.equal(boot.value.revisionId,kv(before,'active'));assert.equal(boot.value.content.lessons.some(l=>added.some(a=>a.id===l.id)),false);
 const expected=JSON.parse(row.state);for(const [key,value]of Object.entries(expected))if(key==='preferences'){for(const [name,v]of Object.entries(value))assert.deepEqual(boot.value.learner.preferences[name],v);}else assert.deepEqual(boot.value.learner[key],value);
 if(row.id==='learner-demo')for(const lesson of boot.value.content.lessons){const session=await call('session?lessonId='+encodeURIComponent(lesson.id),undefined,row.id);assert.equal(session.status,200);assert.ok(session.value.content.lessons.some(l=>l.id===lesson.id));learnerSessions++;}
}
const unpublished=await call('session?lessonId=draft-first20-MEMORY',undefined,'learner-demo');assert.equal(unpublished.status,404);
const alias=await call('studio/identity/resolve',{kind:'lessons',value:'MNT'});assert.equal(alias.status,200);assert.equal(alias.value.id,'draft-first20-MNT');
assert.deepEqual(databaseReceipt(database),stableReceipt,'Read-only destination verification changed database state.');
const report={revision:identity.revision,runtimeSha256:identity.runtimeSha256,origin,protectedTablesPreserved:true,priorDraftLessonsPreserved:oldContent.lessons.length,activeRevisionId:kv(after,'active'),schemaVersion:8,unpublishedLessons:20,previewPages:previewPageCount,targets:127,unresolvedTargets:127,learnerProfiles:before.learners.length,legacyLearnerSessions:learnerSessions,unpublishedLearnerRouteStatus:unpublished.status,aliasResolution:alias.value.id,servedAssets:assets,protectedFiles:protectedFileResults,databaseBefore:receipt.before,databaseAfter:stableReceipt,readOnlyDestinationChecks:true,nativeVerified:false};
writeFileSync(join(folder,'destination.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({revision:report.revision,origin,assets:Object.keys(assets).length,protectedTablesPreserved:true,legacyLearnerSessions:learnerSessions,previewPages:previewPageCount,targets:127,databaseSHA256:stableReceipt.sha256,nativeVerified:false}));
