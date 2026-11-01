// Code-only replacement: retain the original database; never install a review DB.
import {DatabaseSync} from 'node:sqlite';
import {pathToFileURL} from 'node:url';
import {resolve,join} from 'node:path';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const installing=process.argv.includes('--apply')||process.argv.includes('--verify');
const root=resolve(installing?'hebleo-editor':'hebleo-classic'),revision='40864ec3cad885b5d550eb9c9cda9c0addc6bd6d';
const installedBase='C:/Users/Trans/.openmausbot/task-workspaces/8c900356-50f6-4d41-bbb9-50c8abe09233/b1d5e7a0-1d13-4e9e-b544-06d3b889fb9e/hebleo-consolidated';
const database=installedBase+'/data/lexical-private-demo.sqlite',output=resolve('installed-classic-editor-20261101');
const {databaseReceipt,openPreservedStore,executableIdentity}=await import(pathToFileURL(root+'/scripts/runtime-state.mjs'));
const {demoBuildFingerprint}=await import(pathToFileURL(root+'/src/demo-build.js'));
const hash=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
const reviewed=JSON.parse(readFileSync('classic-combined-20261101/PREPARED.json'));
const identity=executableIdentity(root,revision);assert.deepEqual(identity,reviewed.build,'Exact independently reviewed raw bytes required');
const sourceRepo='C:/Users/Trans/.openmausbot/task-workspaces/71c71389-5334-4e0c-9ca8-d80dd28223d1/653fb433-7485-48b1-9f7c-cb22711bda02/hebleo-3';
const reports={qa:sourceRepo+'/qa-classic-40864ec/REPORT.md',release:sourceRepo+'/tmp/rr-combined-40864ec/REPORT.md',ux:'C:/Users/Trans/.openmausbot/task-workspaces/33456e11-6fe6-4081-9ac2-a1a240770492/9b214edb-a778-44be-acbc-f06f6a5d1fcb/CORRECTED_NATIVE_UX_40864EC.md'};
const reportText=Object.fromEntries(Object.entries(reports).map(([key,file])=>[key,readFileSync(file,'utf8')]));
for(const [key,value] of Object.entries(reportText)){assert.ok(value.includes(revision),'Exact revision in '+key);assert.match(value,/PASS/);}
assert.ok(/QA-CLASSIC-PROJECTION-01 (?:is )?CLOSED/.test(reportText.qa),'QA closure required');assert.match(reportText.release,/RR-CLASSIC-PROJECTION-01 CLOSED/);assert.match(reportText.ux,/Bounded UX PASS/);
const ci=JSON.parse(readFileSync('classic-final-ci.json','utf8').replace(/^\uFEFF/,''));assert.equal(ci.headSha,revision);assert.equal(ci.status,'completed');assert.equal(ci.conclusion,'success');
const gates={reports:Object.fromEntries(Object.entries(reports).map(([key,path])=>[key,{path,sha256:hash(reportText[key])}])),ci,qa:'bounded native/preinstall PASS',ux:'bounded native reference and corrected controls PASS',release:'bounded preinstall integrity PASS',guyAcceptance:'Pending'};
const rollbackRestriction='Never run the old executable against a newer approval-bearing database. Rollback requires the matching pre-update executable AND database, and must refuse if newer user saves or approvals would be overwritten. No automatic restore or downgrade is authorized.';
const build=await demoBuildFingerprint(root);
function tables(file){const db=new DatabaseSync(file,{readOnly:true});try{db.exec('BEGIN');return Object.fromEntries(db.prepare("SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name").all().map(({name})=>[name,db.prepare('SELECT * FROM "'+name.replaceAll('"','""')+'" ORDER BY rowid').all()]));}finally{db.close();}}
function copy(from,to){assert.equal(existsSync(to),false,'Never replace a backup/rehearsal');const db=new DatabaseSync(from,{readOnly:true});try{db.prepare('VACUUM INTO ?').run(to);}finally{db.close();}}
function preservation(before,after,{fresh=true}={}){
 const a=tables(before),b=tables(after);assert.deepEqual(Object.keys(b),Object.keys(a));
 for(const table of Object.keys(a))if(!['learners','kv'].includes(table))assert.deepEqual(b[table],a[table],'Protected table: '+table);
 const progressKeys=new Set(['demo-progress-build','demo-progress-reset-at']),retained=rows=>rows.filter(row=>!progressKeys.has(row.key)&&!row.key.startsWith('review-'));
 assert.deepEqual(retained(b.kv),retained(a.kv),'Full source/draft/private/settings KV exact');
 const strip=value=>{const result=JSON.parse(value);for(const key of ['completed','attempts','cards','resumes','lastReview','lastLessonId','textPages'])delete result[key];return result;};
 assert.deepEqual(b.learners.map(row=>row.id),a.learners.map(row=>row.id));assert.equal(b.learners.length,3);
 for(const row of a.learners){const next=b.learners.find(item=>item.id===row.id);assert.deepEqual(strip(next.state),strip(row.state),'All nonprogress profile fields: '+row.id);if(fresh){const state=JSON.parse(next.state);assert.deepEqual(state.completed,[]);assert.deepEqual(state.attempts,[]);assert.deepEqual(state.cards,{});assert.deepEqual(state.resumes,{});assert.equal(state.lastReview,null);assert.equal(state.lastLessonId,undefined);assert.equal(state.textPages,undefined);}}
 if(fresh)for(const row of b.kv)assert.ok(!row.key.startsWith('review-'),'Progress cache cleared');
 const get=key=>JSON.parse(b.kv.find(row=>row.key===key)?.value||'null'),draft=get('draft');assert.equal(get('active'),6);assert.equal(get('schema-version'),10);assert.equal(draft.content.lessons.length,23);assert.equal(get('demo-progress-build'),build);
 return {all23SavedDraftsAndRawMetadataExact:true,allSourceAndPrivateSettingsExact:true,allRevisionsMediaEventsAndSequencesExact:true,allNonprogressLearnerFieldsExact:true,fictionalProfilesFresh:fresh?3:undefined,contentRevision:6,reader:10,draftContentBytes:Buffer.byteLength(JSON.stringify(draft.content)),draftContentSha256:hash(draft.content),rawDraftSha256:hash(b.kv.find(row=>row.key==='draft').value)};
}
const apply=process.argv.includes('--apply'),verify=process.argv.includes('--verify');
if(!apply&&!verify){
 assert.equal(existsSync(output),false,'A new output directory is required');mkdirSync(output);
 const before=databaseReceipt(database),oldBuild=await(await fetch('http://127.0.0.1:63358/api/build')).json();assert.equal(oldBuild.revision,'3e01c79ebc51c72a8eff11b56e406367b87502a1');assert.deepEqual(oldBuild,executableIdentity(resolve('hebleo-editor'),oldBuild.revision));assert.equal(oldBuild.preservationMode,true);
 const backup=join(output,'before.sqlite'),rehearsal=join(output,'reset-rehearsal.sqlite');copy(database,backup);assert.deepEqual(databaseReceipt(database),before);assert.deepEqual(databaseReceipt(backup),before);copy(backup,rehearsal);
 const opened=openPreservedStore(rehearsal);try{assert.equal(opened.store.resetDemoProgressForBuild(build),true);}finally{opened.store.close();}
 const preserved=preservation(backup,rehearsal),after=databaseReceipt(rehearsal),reopened=openPreservedStore(rehearsal);try{assert.equal(reopened.store.resetDemoProgressForBuild(build),false);}finally{reopened.store.close();}
 assert.deepEqual(databaseReceipt(rehearsal),after,'Same-build rehearsal must change no rows');assert.deepEqual(databaseReceipt(database),before,'Original unchanged by rehearsal');
 const result={status:'PREPARED',database,backup,rehearsalNeverInstall:rehearsal,identity,oldBuild,build,before,rehearsalAfter:after,preservation:preserved,sameBuildNoReset:true,recoveryEvidenceReused:true,rollbackRestriction,gates};writeFileSync(join(output,'PREPARED.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({status:result.status,revision,runtimeSha256:identity.runtimeSha256,build,beforeSHA:before.sha256,rehearsalAfterSHA:after.sha256,preservation:preserved,backup}));
}else{
 const prepared=JSON.parse(readFileSync(join(output,'PREPARED.json')));assert.deepEqual(prepared.identity,identity);assert.equal(prepared.build,build);
 if(apply){
  assert.equal(existsSync(join(output,'APPLIED.json')),false,'Never apply twice');assert.deepEqual(databaseReceipt(database),prepared.before,'Original changed since rehearsal; refuse install');
  let reachable=false;try{await fetch('http://127.0.0.1:63358/api/build');reachable=true;}catch(error){assert.equal(error.cause?.code,'ECONNREFUSED','Unexpected shutdown state');}assert.equal(reachable,false,'Stop the verified previous demo first');
  const opened=openPreservedStore(database);try{assert.equal(opened.store.resetDemoProgressForBuild(build),true);}finally{opened.store.close();}
  const preserved=preservation(prepared.backup,database),after=databaseReceipt(database),result={status:'APPLIED_TO_ORIGINAL',database,backup:prepared.backup,identity,build,before:prepared.before,after,preservation:preserved,sourceOrDraftReplaced:false,recoveryEvidenceReused:true,rollbackRestriction,gates};
  writeFileSync(join(output,'APPLIED.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({status:result.status,revision,afterSHA:after.sha256,preservation:preserved}));
 }else{
  const before=databaseReceipt(database),preserved=preservation(prepared.backup,database,{fresh:false}),opened=openPreservedStore(database);try{assert.equal(opened.store.resetDemoProgressForBuild(build),false);}finally{opened.store.close();}assert.deepEqual(databaseReceipt(database),before,'Same-build reopening retains all new progress');
  const result={status:'VERIFIED_ORIGINAL',identity,build,preservation:preserved,receipt:before,sameBuildReset:false,gates};writeFileSync(join(output,'VERIFIED.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({status:result.status,revision,receiptSHA:before.sha256,preservation:preserved,sameBuildReset:false}));
 }
}
