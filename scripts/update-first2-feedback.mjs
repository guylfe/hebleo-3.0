// Reviewed bounded revision update. Initial-install guards remain unchanged.
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {parseArgs} from 'node:util';
import assert from 'node:assert/strict';
import {Store,validateContent,STORE_SCHEMA_VERSION,draftTokenFor} from '../src/store.js';
import {validateAuthorReview} from '../src/author-review.js';
import {assertContentIdentityTransition} from '../public/content-identity.js';
import {mergeWorkspace} from '../public/studio/workspace.js';
import {databaseReceipt} from './runtime-state.mjs';
const clone=v=>structuredClone(v),rows=(db,t)=>db.prepare('SELECT * FROM "'+t+'" ORDER BY rowid').all();
const basePack=JSON.parse(readFileSync(new URL('../content/first2/history/revision5.json',import.meta.url)));
const readTables=file=>{const db=new DatabaseSync(file,{readOnly:true});try{return Object.fromEntries(db.prepare("SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name").all().map(({name})=>[name,rows(db,name)]));}finally{db.close();}};
const compactReview=tables=>{
 const value=JSON.parse(tables.kv.find(r=>r.key==='author-review')?.value||'null');
 return validateAuthorReview(value,{carried:new Map(tables.revisions.map(r=>[r.id,JSON.parse(r.snapshot)])),validateContent,draftTokenFor,authorIds:['author-demo']});
};
export function migrateFeedbackStore(file){
 const before=readTables(file),s=new Store(file);try{
  assert.equal(s.get('schema-version'),STORE_SCHEMA_VERSION);
  const after=readTables(file);assert.deepEqual(Object.keys(after),Object.keys(before));
  const legacyReview=before.kv.some(r=>r.key==='author-review');
  const allowed=new Set(['schema-version',...(legacyReview?['author-review']:[])]);
  for(const [table,data] of Object.entries(before))assert.deepEqual(table==='kv'?after[table].filter(r=>!allowed.has(r.key)):after[table],table==='kv'?data.filter(r=>!allowed.has(r.key)):data,'Migration may change only marker and lossless legacy review encoding: '+table);
  if(legacyReview)assert.deepEqual(compactReview(after),compactReview(before),'Every legacy note, receipt, audit and full immutable context is retained.');
  return s;
 }catch(error){s.close();throw error;}
}
export function updateFirstTwoFeedback(s,{pack,build,mediaRoot}){
 assert.deepEqual(s.db.prepare('SELECT id FROM learners ORDER BY id').all().map(r=>r.id),['author-demo','learner-core','learner-demo']);
 assert.ok(s.get('first2-local-install'),'Requires existing first2 installation.');assert.ok(!s.get('first2-feedback-install'),'Feedback update already installed.');
 assert.equal(typeof build,'string');assert.ok(build.length>0);
 const before=s.snapshot(),base=s.get('active'),draft=s.currentDraft(),next=clone(before),old=before.lessons.find(l=>l.id==='MEMORY-A2');
 assert.deepEqual(old,basePack.lessons[0],'Active MEMORY differs from reviewed baseline; preserve and reconcile before update.');
 assert.deepEqual(pack.lessons[1],basePack.lessons[1],'MNTL source must remain unchanged.');
 const replacement=pack.lessons[0];assert.equal(replacement.id,old.id);assert.equal(replacement.blocks[0].textPages.pages.length,6);
 next.lessons[next.lessons.findIndex(l=>l.id===old.id)]=clone(replacement);next.first2FeedbackTransition=clone(pack.memoryFeedbackTransition);
 const draftContent=draft?clone(draft.content):null;
 if(draft){const i=draftContent.lessons.findIndex(l=>l.id===old.id);assert.ok(i>=0);draftContent.lessons[i]=mergeWorkspace(old,draftContent.lessons[i],replacement,'MEMORY-A2');draftContent.first2FeedbackTransition=clone(pack.memoryFeedbackTransition);validateContent(draftContent);assertContentIdentityTransition(draft.content,draftContent);}
 validateContent(next);assertContentIdentityTransition(before,next);s.media.bindRoot(mediaRoot);s.media.plan(next,{strict:true});
 return s.transaction(()=>{
  s.expectBase(base);s.expectDraft(draft?.draftToken??null);
  const revisionId=s.addRevision(next,'Guy-authorized combined first2 feedback for local testing, 31 October 2026');s.set('active',revisionId);
  if(draft){const {draftToken,...saved}=draft;s.set('draft',{...saved,baseRevisionId:revisionId,content:draftContent});}
  const fictionalProgressReset=s.resetDemoProgressForBuild(build);
  const result={previousRevisionId:base,revisionId,build,fictionalProgressReset,progressRemapped:false,transition:pack.memoryFeedbackTransition,storeSchemaVersion:STORE_SCHEMA_VERSION,priorRevisionsRetained:true,unrelatedDraftLessonsRetained:true};
  s.set('first2-feedback-install',result);return result;
 });
}
export function assertFeedbackPreservation(beforeFile,afterFile){
 const a=readTables(beforeFile),b=readTables(afterFile);assert.deepEqual(Object.keys(a),Object.keys(b));
 for(const table of ['events','media_aliases','media_blobs'])assert.deepEqual(b[table],a[table],table);
 assert.deepEqual(b.revisions.slice(0,a.revisions.length),a.revisions);assert.equal(b.revisions.length,a.revisions.length+1);
 const allowed=new Set(['active','draft','schema-version','demo-progress-build','demo-progress-reset-at','author-review']);
 for(const row of a.kv)if(!allowed.has(row.key))assert.deepEqual(b.kv.find(r=>r.key===row.key),row,'Retained kv '+row.key);
 assert.deepEqual(compactReview(b),compactReview(a),'Private review is losslessly retained.');
 const strip=v=>{const s=JSON.parse(v);for(const k of ['completed','attempts','cards','resumes','lastReview','lastLessonId','textPages'])delete s[k];return s;};
 for(const row of a.learners)assert.deepEqual(strip(b.learners.find(r=>r.id===row.id).state),strip(row.state),'Nonprogress learner '+row.id);
 const value=(t,key)=>JSON.parse(t.kv.find(r=>r.key===key)?.value||'null'),oldDraft=value(a,'draft'),newDraft=value(b,'draft');
 if(oldDraft)for(const lesson of oldDraft.content.lessons.filter(l=>l.id!=='MEMORY-A2'))assert.deepEqual(newDraft.content.lessons.find(l=>l.id===lesson.id),lesson,'Saved draft lesson '+lesson.id);
 const oldContent=JSON.parse(a.revisions.find(r=>r.id===value(a,'active')).snapshot),newContent=JSON.parse(b.revisions.find(r=>r.id===value(b,'active')).snapshot);
 for(const lesson of oldContent.lessons.filter(l=>l.id!=='MEMORY-A2'))assert.deepEqual(newContent.lessons.find(l=>l.id===lesson.id),lesson);
 assert.deepEqual(newContent.words,oldContent.words);assert.deepEqual(newContent.exercises,oldContent.exercises);
 return {allPriorRevisionsExact:true,MNTLAndUnrelatedLessonsExact:true,allOther22DraftLessonsExact:!oldDraft||oldDraft.content.lessons.length===23,eventsAndMediaExact:true,nonprogressLearnerFieldsExact:true,privateReviewExact:true,historicalProgressInBackup:true};
}
// VACUUM INTO takes a consistent SQLite snapshot through the read-only source.
// It also avoids the async backup worker stalling on Windows mounted files.
async function copyDB(from,to){const db=new DatabaseSync(from,{readOnly:true});try{db.prepare('VACUUM INTO ?').run(to);}finally{db.close();}}
export async function prepareFeedbackUpdate({database,output,packFile,build,mediaRoot,apply=false,expectedSHA}){
 mkdirSync(output,{recursive:true});const before=databaseReceipt(database);if(apply)assert.equal(before.sha256,expectedSHA,'Live data changed; rehearse current state before installing.');
 await copyDB(database,join(output,'before.sqlite'));assert.deepEqual(databaseReceipt(join(output,'before.sqlite')),before,'Concurrent data change; repeat from current state.');
 await copyDB(join(output,'before.sqlite'),join(output,'candidate.sqlite'));
 const pack=JSON.parse(readFileSync(packFile,'utf8')),s=migrateFeedbackStore(join(output,'candidate.sqlite'));let receipt,exported;
 try{receipt=updateFirstTwoFeedback(s,{pack,build,mediaRoot});exported=s.backup();}finally{s.close();}
 const preservation=assertFeedbackPreservation(join(output,'before.sqlite'),join(output,'candidate.sqlite'));
 await copyDB(join(output,'before.sqlite'),join(output,'restore.sqlite'));const recovery=migrateFeedbackStore(join(output,'restore.sqlite'));
 try{for(let pass=0;pass<2;pass++){recovery.restore(pass?recovery.backup():exported);assert.deepEqual(recovery.snapshot(),exported.content);assert.deepEqual(recovery.currentDraft()?.content,exported.draft?.content);assert.deepEqual(recovery.authorReview.state().comments.map(c=>({id:c.id,body:c.body,audit:c.audit})),exported.authorReview.comments.map(c=>({id:c.id,body:c.body,audit:c.audit})));}}finally{recovery.close();}
 if(apply){assert.deepEqual(databaseReceipt(database),before);const live=migrateFeedbackStore(database);try{updateFirstTwoFeedback(live,{pack,build,mediaRoot});}finally{live.close();}assertFeedbackPreservation(join(output,'before.sqlite'),database);}
 const result={mode:apply?'installed':'rehearsed',database,before,after:databaseReceipt(apply?database:join(output,'candidate.sqlite')),reader8To10MigrationOnlyMarker:true,legacyReviewMigration:'namespace 1 to lossless namespace 2 when present',restoreTwice:true,preservation,...receipt};writeFileSync(join(output,'receipt.json'),JSON.stringify(result,null,2)+'\n');return result;
}
if(process.argv[1]?.endsWith('update-first2-feedback.mjs')){
 const {values:v}=parseArgs({options:{database:{type:'string'},output:{type:'string'},pack:{type:'string'},build:{type:'string'},'media-root':{type:'string'},apply:{type:'boolean'},'expected-sha':{type:'string'}}});
 for(const k of ['database','output','pack','build','media-root'])assert.ok(v[k],'Supply --'+k);
 console.log(JSON.stringify(await prepareFeedbackUpdate({database:resolve(v.database),output:resolve(v.output),packFile:resolve(v.pack),build:v.build,mediaRoot:resolve(v['media-root']),apply:v.apply,expectedSHA:v['expected-sha']}),null,2));
}
