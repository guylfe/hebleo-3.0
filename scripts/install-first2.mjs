// Bounded local testing installation. This is not the general publishing API.
import {DatabaseSync,backup} from 'node:sqlite';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {parseArgs} from 'node:util';
import assert from 'node:assert/strict';
import {validateContent} from '../src/store.js';
import {orderedLessons} from '../public/course.js';
import {assertContentIdentityTransition} from '../public/content-identity.js';
import {orderingTokens} from '../public/ux.js';
import {databaseReceipt,openPreservedStore} from './runtime-state.mjs';

export function replaceFirstTwo(content,pack){
 assert.deepEqual(pack.lessons.map(l=>l.id),['MEMORY-A2','MNTL-A2']);
 const old=orderedLessons(content).slice(0,2);assert.deepEqual(old.map(l=>l.id),['lesson-1','lesson-2'],'Refuse unexpected replacement slots.');
 assert.ok(old.every(l=>!l.draftImport),'Never replace source-imported identities.');
 const next=structuredClone(content),mapping=new Map(old.map((l,i)=>[l.id,pack.lessons[i].id]));
 if(pack.memoryFeedbackTransition)next.first2FeedbackTransition=structuredClone(pack.memoryFeedbackTransition);
 for(const [i,l]of next.lessons.entries())if(mapping.has(l.id))next.lessons[i]=structuredClone(pack.lessons[[...mapping.keys()].indexOf(l.id)]);
 const removed=next.exercises.filter(e=>mapping.has(e.lessonId));
 for(const lesson of next.lessons.filter(l=>!pack.lessons.some(p=>p.id===l.id)))assert.ok(!lesson.exerciseIds.some(id=>removed.some(e=>e.id===id)),'A placeholder exercise is shared; resolve explicitly.');
 next.exercises=next.exercises.filter(e=>!mapping.has(e.lessonId));
 // Synthetic fixture introduction/unlock declarations cannot be rebound to the real
 // lessons. Retain them as retired metadata and in the original immutable revision.
 const retiredSettings={};
 for(const name of ['introductions','unlocks'])if(next.lexical?.[name]){
  const retired=next.lexical[name].filter(x=>mapping.has(x.lessonId));
  assert.ok(retired.every(x=>(x.linkId||x.unlockId||'').startsWith('synthetic-')),'A real lexical setting refers to a replacement slot.');
  retiredSettings[name]=retired;next.lexical[name]=next.lexical[name].filter(x=>!mapping.has(x.lessonId));
 }
 const orderingTrays=Object.fromEntries(next.exercises.filter(e=>e.type==='ordering').map(e=>[e.lessonId+'/'+e.id,{baseTokens:e.tokens,tray:orderingTokens(e,content,e.lessonId)}]));
 next.retiredLocalPlaceholders={lessonIds:[...mapping.keys()],lexicalSettings:retiredSettings,orderingTrays,progressRemapped:false};
 if(next.curriculum){for(const chapter of next.curriculum.chapters)chapter.lessonIds=chapter.lessonIds.map(id=>mapping.get(id)||id);for(const p of next.curriculum.order)if(p.lessonId)p.lessonId=mapping.get(p.lessonId)||p.lessonId;}
 validateContent(next);assertContentIdentityTransition(content,next);
 assert.deepEqual(next.words,content.words);
 for(const l of content.lessons.filter(l=>!mapping.has(l.id)))assert.deepEqual(next.lessons.find(x=>x.id===l.id),l);
 return {content:next,mapping:old.map((l,i)=>({retiredPlaceholderId:l.id,newLessonId:pack.lessons[i].id,progressRemapped:false})),retiredExerciseIds:removed.map(e=>e.id)};
}

export function installFirstTwo(store,{pack,build,mediaRoot}){
 assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM learners').get().n,3,'Refuse database containing additional learner records.');
 assert.deepEqual(store.db.prepare('SELECT id FROM learners ORDER BY id').all().map(x=>x.id),['author-demo','learner-core','learner-demo']);
 const before=store.snapshot(),draft=store.currentDraft(),active=store.get('active');
 assert.ok(!store.get('first2-local-install'),'This bounded install already ran; use a separately reviewed revision update.');
 const candidate=replaceFirstTwo(before,pack),draftCandidate=draft?replaceFirstTwo(draft.content,pack):null;
 store.media.bindRoot(mediaRoot);
 return store.transaction(()=>{
  // Existing media aliases are immutable. Only the source lesson assets are added.
  const plan=store.media.plan(candidate.content,{strict:true});store.media.persistPlan(plan);
  const revisionId=store.addRevision(candidate.content,'Guy-authorized local first two actual lessons, 30 October 2026');store.set('active',revisionId);
  if(draft)store.set('draft',{...draft,baseRevisionId:revisionId,content:draftCandidate.content});
  // Repository policy: each new executable build clears only the three fictional profiles.
  // Raw prior states remain in the verified online backup; no IDs/verdicts are remapped.
  const fictionalProgressReset=store.resetDemoProgressForBuild(build);
  const receipt={previousRevisionId:active,revisionId,build,sourceRevision:pack.sourceRevision,mapping:candidate.mapping,retiredExerciseIds:candidate.retiredExerciseIds,retiredUnpublishedPageIds:pack.retiredUnpublishedPageIds,fictionalProgressReset,realRecordsChanged:false,priorRevisionsRetained:true,unrelatedLessonsRetained:true,draftLessons:store.currentDraft()?.content.lessons.length};
  store.set('first2-local-install',receipt);return receipt;
 });
}

export function assertFirstTwoPreservation(beforeFile,afterFile){
 const a=new DatabaseSync(beforeFile,{readOnly:true}),b=new DatabaseSync(afterFile,{readOnly:true});
 const rows=(db,table)=>db.prepare('SELECT * FROM '+table+' ORDER BY 1').all();
 try{
  assert.equal(databaseReceipt(beforeFile).schemaSha256,databaseReceipt(afterFile).schemaSha256);
  assert.deepEqual(rows(a,'events'),rows(b,'events'));
  const oldRevisions=rows(a,'revisions'),newRevisions=rows(b,'revisions');assert.deepEqual(newRevisions.slice(0,oldRevisions.length),oldRevisions);assert.equal(newRevisions.length,oldRevisions.length+1);
  for(const table of ['media_blobs','media_aliases'])for(const row of rows(a,table))assert.deepEqual(rows(b,table).find(next=>next[Object.keys(row)[0]]===row[Object.keys(row)[0]]),row);
  const mutable=new Set(['active','draft','demo-progress-build','demo-progress-reset-at']);for(const row of rows(a,'kv'))if(!mutable.has(row.key))assert.deepEqual(b.prepare('SELECT * FROM kv WHERE key=?').get(row.key),row);
  const strip=s=>{for(const k of ['completed','attempts','cards','resumes','lastReview','lastLessonId','textPages'])delete s[k];return s;};
  for(const old of rows(a,'learners')){const next=b.prepare('SELECT state FROM learners WHERE id=?').get(old.id);assert.deepEqual(strip(JSON.parse(next.state)),strip(JSON.parse(old.state)));}
  const oldDraft=JSON.parse(a.prepare("SELECT value FROM kv WHERE key='draft'").get()?.value||'null'),newDraft=JSON.parse(b.prepare("SELECT value FROM kv WHERE key='draft'").get()?.value||'null');
  if(oldDraft)for(const lesson of oldDraft.content.lessons.filter(l=>!['lesson-1','lesson-2'].includes(l.id)))assert.deepEqual(newDraft.content.lessons.find(l=>l.id===lesson.id),lesson);
  return {schemaUnchanged:true,allPriorRevisionsExact:true,existingMediaBytesAndAliasesExact:true,eventsExact:true,nonProgressLearnerFieldsExact:true,unrelatedDraftLessonsExact:true};
 }finally{a.close();b.close();}
}

export async function prepareFirstTwo({database,output,packFile,build,mediaRoot,apply=false,expectedSHA}){
 mkdirSync(output,{recursive:true});const before=databaseReceipt(database);
 if(apply)assert.equal(before.sha256,expectedSHA,'Live database changed; rehearse the new state.');
 const source=new DatabaseSync(database,{readOnly:true});try{await backup(source,join(output,'before.sqlite'));}finally{source.close();}
 assert.deepEqual(databaseReceipt(join(output,'before.sqlite')),before);
 const restore=new DatabaseSync(join(output,'before.sqlite'),{readOnly:true});try{await backup(restore,join(output,'rehearsal.sqlite'));}finally{restore.close();}
 const pack=JSON.parse(readFileSync(packFile,'utf8'));
 const run=file=>{const {store}=openPreservedStore(file);try{return installFirstTwo(store,{pack,build,mediaRoot});}finally{store.close();}};
 const rehearsal=run(join(output,'rehearsal.sqlite')),preservation=assertFirstTwoPreservation(join(output,'before.sqlite'),join(output,'rehearsal.sqlite'));
 // Test the application's actual export/restore path against a copy that already
 // trusts this installation's source approvals, with no blank-store trust bypass.
 const original=new DatabaseSync(join(output,'before.sqlite'),{readOnly:true});try{await backup(original,join(output,'restore.sqlite'));}finally{original.close();}
 const staged=openPreservedStore(join(output,'rehearsal.sqlite')).store,recovery=openPreservedStore(join(output,'restore.sqlite')).store;
 try{const exported=staged.backup();recovery.restore(exported);assert.deepEqual(recovery.snapshot(),staged.snapshot());assert.deepEqual(recovery.currentDraft().content,staged.currentDraft().content);}finally{staged.close();recovery.close();}
 if(apply){assert.deepEqual(databaseReceipt(database),before);run(database);assertFirstTwoPreservation(join(output,'before.sqlite'),database);}
 const report={mode:apply?'installed':'rehearsed',database,before,after:databaseReceipt(apply?database:join(output,'rehearsal.sqlite')),preservation,exportRestoreRehearsal:true,...rehearsal};
 writeFileSync(join(output,'receipt.json'),JSON.stringify(report,null,2));return report;
}
if(process.argv[1]?.endsWith('install-first2.mjs')){
 const {values:v}=parseArgs({options:{database:{type:'string'},output:{type:'string'},pack:{type:'string'},build:{type:'string'},'media-root':{type:'string'},apply:{type:'boolean'},'expected-sha':{type:'string'}}});
 for(const k of ['database','output','pack','build','media-root'])assert.ok(v[k],'Supply --'+k);
 const report=await prepareFirstTwo({database:resolve(v.database),output:resolve(v.output),packFile:resolve(v.pack),build:v.build,mediaRoot:resolve(v['media-root']),apply:v.apply,expectedSHA:v['expected-sha']});console.log(JSON.stringify(report,null,2));
}
