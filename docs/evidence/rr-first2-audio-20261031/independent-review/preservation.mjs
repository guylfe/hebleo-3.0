import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const [root,evidence,previous,out]=process.argv.slice(2);
const expected='73e242e717c630976fd2d040396d4d8d5fcd3127',runtime='08e689b369f2129b94e6d6d0016c4a0c6dadc4936b680cd30d26b69a20bb2249';
const json=p=>JSON.parse(fs.readFileSync(p,'utf8')),sha=v=>createHash('sha256').update(v).digest('hex');
const git=(...args)=>execFileSync('git',['-c','safe.directory='+root,...args],{cwd:root,encoding:'utf8',windowsHide:true}).trim();
const {databaseReceipt,executableIdentity}=await import(pathToFileURL(path.join(root,'scripts/runtime-state.mjs')));
const report={startedAt:new Date().toISOString(),revision:expected,head:git('rev-parse','HEAD'),checks:[]};
const check=async(name,fn)=>{try{const detail=await fn();report.checks.push({name,pass:true,detail});}catch(e){report.checks.push({name,pass:false,error:e.message.slice(0,800)});}fs.writeFileSync(path.join(out,'preservation.json'),JSON.stringify(report,null,2));console.log(name+': '+report.checks.at(-1).pass);};
const receipt=json(path.join(evidence,'installed/receipt.json')),beforeLive=databaseReceipt(receipt.database);
const identity={...executableIdentity(root,report.head),revision:expected};
await check('exact one executable delta, clean evidence HEAD, all 113 build hashes recomputed',()=>{
 assert.equal(git('status','--porcelain'),'');
 assert.equal(git('diff',expected,'HEAD','--','public','src','scripts','schemas','test','content','curriculum','package.json','package-lock.json'),'');
 git('diff','--check','abf3cca1d8b9c3380de2e512f8fca665fa475f41',expected);
 assert.equal(identity.runtimeSha256,runtime);assert.equal(identity.backendSha256,'c5f13d8d3e9190bb620874e9a239a454a96d90074dc711ead64aa7f54a38edc1');
 const old=json(path.join(previous,'installed/build.json'));assert.equal(old.revision,'abf3cca1d8b9c3380de2e512f8fca665fa475f41');
 assert.deepEqual(Object.keys(identity.files),Object.keys(old.files));
 const changed=Object.keys(identity.files).filter(k=>identity.files[k]!==old.files[k]);assert.deepEqual(changed,['public/text-contract.js']);
 assert.equal(sha(fs.readFileSync(path.join(root,'content/first2/lessons.json'))),'1b9df3021485e37c5c01af7a0eb573a482ba7329c797dc1dad55aaa2e9fb9e3a');
 return {executableFiles:Object.keys(identity.files).length,unchanged:112,changed,backend:identity.backendSha256,docsOnlyHead:report.head};
});
function read(file){const d=new DatabaseSync(file,{readOnly:true});try{d.exec('PRAGMA query_only=ON; BEGIN');const schema=d.prepare('SELECT type,name,tbl_name,sql FROM sqlite_schema ORDER BY type,name').all(),tables=Object.fromEntries(schema.filter(r=>r.type==='table').map(({name})=>[name,d.prepare('SELECT * FROM "'+name.replaceAll('"','""')+'" ORDER BY rowid').all()]));assert.equal(d.prepare('PRAGMA integrity_check').get().integrity_check,'ok');return {schema,tables};}finally{d.close();}}
const copies=[];
function offline(file,name){assert.ok(!fs.existsSync(file+'-wal')||fs.statSync(file+'-wal').size===0,'Offline backup has pending WAL: '+name);const dest=path.resolve(out,name+'.sqlite');assert.equal(path.dirname(dest),path.resolve(out));assert.ok(!fs.existsSync(dest));fs.copyFileSync(file,dest);copies.push(dest);return {data:read(dest),receipt:databaseReceipt(dest)};}
const kv=(s,k)=>{const r=s.tables.kv.find(r=>r.key===k);return r?JSON.parse(r.value):null;};
const active=s=>JSON.parse(s.tables.revisions.find(r=>r.id===kv(s,'active')).snapshot);
const keep=r=>!['demo-progress-build','demo-progress-reset-at'].includes(r.key)&&!r.key.startsWith('review-');
const receiptOf=s=>{const tables=Object.fromEntries(Object.entries(s.tables).map(([name,rows])=>[name,{rows:rows.length,sha256:sha(JSON.stringify(rows.map(r=>JSON.stringify(r)).sort()))}]));return {schemaSha256:sha(JSON.stringify(s.schema)),tables,sha256:sha(JSON.stringify({schema:s.schema,tables}))};};
const strip=state=>{const s=JSON.parse(state);for(const k of ['completed','attempts','cards','resumes','lastReview','lastLessonId','textPages'])delete s[k];return s;};
function protectedEqual(a,b){assert.deepEqual(a.schema,b.schema);assert.deepEqual(Object.keys(a.tables),Object.keys(b.tables));for(const [name,rows]of Object.entries(a.tables)){if(name==='kv')assert.deepEqual(rows.filter(keep),b.tables.kv.filter(keep));else if(name==='learners'){assert.deepEqual(rows.map(r=>r.id).sort(),['author-demo','learner-core','learner-demo']);assert.equal(b.tables.learners.length,3);for(const row of rows){const next=b.tables.learners.find(r=>r.id===row.id);assert.deepEqual({...next,state:null},{...row,state:null});assert.deepEqual(strip(next.state),strip(row.state));}}else assert.deepEqual(b.tables[name],rows,name);}}
function fresh(s){for(const row of s.tables.learners){const t=JSON.parse(row.state);assert.deepEqual(t.completed,[]);assert.deepEqual(t.attempts,[]);assert.deepEqual(t.cards,{});assert.deepEqual(t.resumes,{});assert.equal(t.lastReview,null);assert.ok(!t.lastLessonId&&!t.textPages);}}
function compareRestore(reset,restored){assert.deepEqual(active(restored),active(reset));assert.deepEqual(kv(restored,'draft').content,kv(reset,'draft').content);for(const t of ['learners','events','media_blobs','media_aliases'])assert.deepEqual(restored.tables[t],reset.tables[t]);assert.deepEqual(kv(restored,'source-state'),kv(reset,'source-state'));for(const r of reset.tables.revisions)assert.ok(restored.tables.revisions.some(x=>x.snapshot===r.snapshot));}
try{
 const old=offline(path.join(previous,'installed/reset.sqlite'),'previous-accepted-reset');
 const stages=[];
 for(const [name,dir]of [['initial',path.join(evidence,'initial-checkout-install')],['final',evidence]]){
  const stage={name,receipt:json(path.join(dir,'installed/receipt.json')),preflightReceipt:json(path.join(dir,'preflight/receipt.json'))};
  for(const area of ['preflight','installed'])for(const file of ['before','reset','restore'])stage[area+'_'+file]=offline(path.join(dir,area,file+'.sqlite'),name+'-'+area+'-'+file);
  stages.push(stage);
 }
 const initial=stages[0],final=stages[1],live=read(receipt.database);
 await check('original baseline matches retained backup and previous reviewed protected state',()=>{assert.equal(initial.installed_before.receipt.sha256,'0e5ade4b664aa6cdce3809b50fe12cf6e358f123efd52aebad54db70d1c914a4');assert.deepEqual(initial.installed_before.receipt,initial.receipt.before);protectedEqual(old.data,initial.installed_before.data);return {originalBaseline:initial.installed_before.receipt.sha256};});
 for(const st of stages){
  await check(st.name+' preflight and actual before snapshots and receipts match',()=>{assert.deepEqual(st.preflight_before.data,st.installed_before.data);assert.deepEqual(st.installed_before.receipt,st.receipt.before);assert.deepEqual(st.preflight_before.receipt,st.preflightReceipt.before);assert.deepEqual(st.preflight_reset.receipt,st.preflightReceipt.after);return st.installed_before.receipt.sha256;});
  await check(st.name+' reset rehearsal preserves all protected tables and resets only fictional progress',()=>{protectedEqual(st.installed_before.data,st.installed_reset.data);protectedEqual(st.preflight_before.data,st.preflight_reset.data);fresh(st.installed_reset.data);fresh(st.preflight_reset.data);assert.equal(kv(st.installed_reset.data,'demo-progress-build'),st.receipt.runtimeSha256);return {knownFictionalProfiles:3,protectedTables:'all',revisions:st.installed_reset.data.tables.revisions.length};});
  await check(st.name+' both retained application restore artifacts preserve content, history, learner and media rows',()=>{compareRestore(st.preflight_reset.data,st.preflight_restore.data);compareRestore(st.installed_reset.data,st.installed_restore.data);return {restoredActiveRevision:kv(st.installed_restore.data,'active'),integrity:'ok'};});
 }
 await check('two installation chain: only reset timestamp separates saved rehearsal from actual after digest',()=>{
  for(const [st,actual]of [[initial,final.installed_before.data],[final,live]]){
   const adjusted=structuredClone(st.installed_reset.data),savedTime=kv(adjusted,'demo-progress-reset-at'),actualTime=kv(actual,'demo-progress-reset-at');assert.ok(Date.parse(actualTime)>Date.parse(savedTime));adjusted.tables.kv.find(r=>r.key==='demo-progress-reset-at').value=actual.tables.kv.find(r=>r.key==='demo-progress-reset-at').value;
   assert.deepEqual(receiptOf(adjusted),st.receipt.after);assert.deepEqual(adjusted,structuredClone(actual));
  }
  assert.deepEqual(initial.receipt.after,final.receipt.before);assert.equal(final.receipt.before.sha256,'72340619fc25b0a829dad5b88501fb7d9e58cd612dc851f4e5c03930be435c8a');assert.equal(final.receipt.after.sha256,'11029b482abea7916d414fc0ef15243fe594412b3ed1d32b7f6b3bece529be33');assert.equal(final.receipt.revision,expected);assert.equal(final.receipt.runtimeSha256,runtime);
  return {intermediateRuntime:initial.receipt.runtimeSha256,before:final.receipt.before.sha256,after:final.receipt.after.sha256,onlyRehearsalDifference:'demo-progress-reset-at'};
 });
 await check('original baseline to live retains every nonprogress field, source, media and historical revision',()=>{protectedEqual(initial.installed_before.data,live);fresh(live);assert.equal(kv(live,'demo-progress-build'),runtime);assert.deepEqual(receiptOf(live),beforeLive);return {revisions:live.tables.revisions.length,events:live.tables.events.length,freshFictionalProfiles:3,integrity:'ok'};});
 const pack=json(path.join(root,'content/first2/lessons.json'));
 await check('active revision 5, 23 exact saved drafts, and 7 plus 9 page source lessons preserved',()=>{for(const state of [initial.installed_before.data,final.installed_before.data,live]){assert.equal(kv(state,'active'),5);assert.equal(state.tables.revisions.length,5);assert.equal(kv(state,'draft').content.lessons.length,23);for(const l of pack.lessons){assert.deepEqual(active(state).lessons.find(x=>x.id===l.id),l);assert.deepEqual(kv(state,'draft').content.lessons.find(x=>x.id===l.id),l);}}return {sourcePackSha256:sha(fs.readFileSync(path.join(root,'content/first2/lessons.json'))),pages:pack.lessons.map(l=>({id:l.id,pages:l.blocks[0].textPages.pages.length}))};});
}finally{for(const file of copies)for(const suffix of ['','-wal','-shm','-journal']){const target=file+suffix;assert.equal(path.dirname(target),path.resolve(out));if(fs.existsSync(target))fs.unlinkSync(target);}}
const get=async(route,user='author-demo')=>{const r=await fetch('http://127.0.0.1:63358'+route,{headers:{'x-demo-user':user},signal:AbortSignal.timeout(8000)});assert.equal(r.status,200,route);return r;};
await check('live build and exact validator plus unchanged reader bytes verified',async()=>{assert.deepEqual(await (await get('/api/build')).json(),identity);for(const name of ['public/text-contract.js','public/text-reader.js','public/source-activities.js'])assert.equal(sha(Buffer.from(await (await get('/'+name.slice(7))).arrayBuffer())),identity.files[name]);return {revision:expected,runtimeSha256:runtime,verifiedServedModules:3};});
await check('live source lesson and draft GETs retain exact source content',async()=>{const studio=await (await get('/api/studio')).json();assert.equal(studio.draft.content.lessons.length,23);for(const l of json(path.join(root,'content/first2/lessons.json')).lessons){const s=await(await get('/api/session?lessonId='+l.id)).json();assert.equal(s.revisionId,5);assert.deepEqual(s.content.lessons.find(x=>x.id===l.id),l);assert.deepEqual(studio.draft.content.lessons.find(x=>x.id===l.id),l);}});
await check('all review GETs leave live database digest unchanged',()=>{assert.deepEqual(databaseReceipt(receipt.database),beforeLive);return {sha256:beforeLive.sha256};});
report.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(out,'preservation.json'),JSON.stringify(report,null,2));process.exitCode=report.checks.some(x=>!x.pass)?1:0;
