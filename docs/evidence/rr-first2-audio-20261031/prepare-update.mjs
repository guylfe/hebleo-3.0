import {DatabaseSync,backup} from 'node:sqlite';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const root='C:/Users/Trans/.openmausbot/task-workspaces/8c900356-50f6-4d41-bbb9-50c8abe09233/489864a5-e240-4cef-a6fc-8cc6d0df25fa/hebleo-audio-contract';
const {databaseReceipt,openPreservedStore,executableIdentity}=await import(pathToFileURL(root+'/scripts/runtime-state.mjs'));
const [mode,db,output,revision,expected]=process.argv.slice(2);
assert.ok(['rehearse','apply'].includes(mode));assert.ok(db&&output&&revision);
const build=executableIdentity(root,revision);mkdirSync(output,{recursive:true});
const tables=file=>{const d=new DatabaseSync(file,{readOnly:true});try{return Object.fromEntries(d.prepare("SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name").all().map(({name})=>[name,d.prepare('SELECT * FROM "'+name.replaceAll('"','""')+'" ORDER BY 1').all()]));}finally{d.close();}};
async function copy(from,to){const d=new DatabaseSync(from,{readOnly:true});try{await backup(d,to);}finally{d.close();}}
const before=databaseReceipt(db);if(mode==='apply')assert.equal(before.sha256,expected,'Live state changed: rehearse again.');
await copy(db,join(output,'before.sqlite'));assert.deepEqual(databaseReceipt(join(output,'before.sqlite')),before);
await copy(join(output,'before.sqlite'),join(output,'reset.sqlite'));
const strip=state=>{state=JSON.parse(state);for(const key of ['completed','attempts','cards','resumes','lastReview','lastLessonId','textPages'])delete state[key];return state;};
function reset(file){const {store}=openPreservedStore(file);try{
 assert.deepEqual(store.db.prepare('SELECT id FROM learners ORDER BY id').all().map(r=>r.id),['author-demo','learner-core','learner-demo']);
 assert.equal(store.get('active'),5);assert.deepEqual(store.snapshot().lessons.slice(0,2).map(l=>l.id),['MEMORY-A2','MNTL-A2']);
 assert.equal(store.resetDemoProgressForBuild(build.runtimeSha256),true);assert.equal(store.resetDemoProgressForBuild(build.runtimeSha256),false);
 assert.equal(store.db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
}finally{store.close();}}
function verify(file){const a=tables(join(output,'before.sqlite')),b=tables(file);assert.deepEqual(Object.keys(b),Object.keys(a));
 for(const [name,rows]of Object.entries(a)){
  if(name==='kv'){const keep=r=>!['demo-progress-build','demo-progress-reset-at'].includes(r.key)&&!r.key.startsWith('review-');assert.deepEqual(b[name].filter(keep),rows.filter(keep));}
  else if(name==='learners'){for(const row of rows){const next=b[name].find(r=>r.id===row.id);assert.deepEqual({...next,state:null},{...row,state:null});assert.deepEqual(strip(next.state),strip(row.state));const s=JSON.parse(next.state);assert.deepEqual(s.completed,[]);assert.deepEqual(s.attempts,[]);assert.deepEqual(s.cards,{});assert.deepEqual(s.resumes,{});assert.ok(!s.textPages&&!s.lastLessonId);}}
  else assert.deepEqual(b[name],rows,'Protected table changed: '+name);
 }
 assert.equal(databaseReceipt(file).schemaSha256,before.schemaSha256);
 return {schemaExact:true,allRevisionsExact:true,activeRevision5Exact:true,entireDraftExact:true,mediaTablesExact:true,eventsExact:true,nonProgressLearnerFieldsExact:true,onlyThreeFictionalProfilesReset:true};
}
reset(join(output,'reset.sqlite'));const preservation=verify(join(output,'reset.sqlite'));
await copy(join(output,'before.sqlite'),join(output,'restore.sqlite'));
const stage=openPreservedStore(join(output,'reset.sqlite')).store,recovery=openPreservedStore(join(output,'restore.sqlite')).store;
try{recovery.restore(stage.backup());assert.deepEqual(recovery.snapshot(),stage.snapshot());assert.deepEqual(recovery.currentDraft().content,stage.currentDraft().content);for(const id of ['author-demo','learner-core','learner-demo'])assert.deepEqual(recovery.learner(id),stage.learner(id));}finally{stage.close();recovery.close();}
if(mode==='apply'){assert.deepEqual(databaseReceipt(db),before);reset(db);verify(db);}
const report={mode,database:resolve(db),revision:build.revision,runtimeSha256:build.runtimeSha256,before,after:databaseReceipt(mode==='apply'?db:join(output,'reset.sqlite')),preservation,applicationExportRestoreRehearsal:true,integrity:'ok',sourceContentChanged:false};
writeFileSync(join(output,'receipt.json'),JSON.stringify(report,null,2));writeFileSync(join(output,'build.json'),JSON.stringify(build,null,2));
console.log(JSON.stringify({mode,before:before.sha256,after:report.after.sha256,revision,runtimeSha256:build.runtimeSha256,preservation,applicationExportRestoreRehearsal:true}));
