import {DatabaseSync,backup} from 'node:sqlite';
import {mkdirSync,readFileSync,writeFileSync,existsSync,statSync,readdirSync,copyFileSync} from 'node:fs';
import {resolve,join,relative} from 'node:path';
import {parseArgs} from 'node:util';
import assert from 'node:assert/strict';
import {Store} from '../src/store.js';
import {createServer} from '../src/server.js';
import {databaseReceipt,sha256} from './runtime-state.mjs';

const q=name=>'"'+name.replaceAll('"','""')+'"';
const tables=filename=>{const db=new DatabaseSync(filename,{readOnly:true});try{db.exec('BEGIN');return Object.fromEntries(db.prepare("SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name").all().map(({name})=>[name,db.prepare('SELECT * FROM '+q(name)+' ORDER BY 1').all()]));}finally{db.close();}};
export function assertTextInstallPreservation(before,after){
 assert.deepEqual(Object.keys(after),Object.keys(before),'Installation must not create/drop application tables.');
 for(const [name,rows] of Object.entries(before)){
  const keep=row=>name!=='kv'||!['schema-version','draft'].includes(row.key);
  assert.deepEqual(after[name].filter(keep),rows.filter(keep),'Installation changed protected '+name+' records.');
 }
}
function files(paths){const out={};for(const path of paths){const root=resolve(path);const visit=p=>{if(!existsSync(p)){out[p]={exists:false};return;}if(statSync(p).isDirectory()){for(const name of readdirSync(p).sort())visit(join(p,name));}else out[root+(p===root?'':'/'+relative(root,p))]={size:statSync(p).size,sha256:sha256(readFileSync(p))};};visit(root);}return out;}
export async function prepareTextInstall({database,output,packFile,mediaRoot,preservePaths=[],apply=false,expectedDatabaseSHA256}){
 database=resolve(database);output=resolve(output);mkdirSync(output,{recursive:true});
 const pack=JSON.parse(readFileSync(packFile,'utf8')),before=databaseReceipt(database),protectedFiles=files(preservePaths);
 if(apply)assert.equal(before.sha256,expectedDatabaseSHA256,'Database changed since reviewed preflight; prepare a fresh rehearsal.');
 const source=new DatabaseSync(database,{readOnly:true});try{await backup(source,join(output,'before.sqlite'));}finally{source.close();}
 assert.deepEqual(databaseReceipt(join(output,'before.sqlite')),before,'Online backup differs from the reviewed consistent snapshot.');
 const snapshot=new DatabaseSync(join(output,'before.sqlite'),{readOnly:true});try{await backup(snapshot,join(output,'rehearsal.sqlite'));}finally{snapshot.close();}
 const preserved=tables(join(output,'before.sqlite'));
 let receipt;
 const stage=file=>{const store=new Store(file);let server;try{
  // Bind the same source-aware local validation and media adapter as the app, without listening or fetching.
  server=createServer(store,{...(mediaRoot?{mediaRoot:resolve(mediaRoot)}:{})});
  const originalDraft=store.currentDraft(),active=store.get('active'),priorLessons=(originalDraft?.content||store.snapshot()).lessons;
  const result=store.importTextDraft({baseRevisionId:active,expectedDraftToken:originalDraft?.draftToken??null,pack});
  const draft=store.currentDraft();assert.equal(store.get('active'),active);assert.equal(store.db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
  assert.deepEqual(draft.content.lessons.filter(l=>priorLessons.some(p=>p.id===l.id)),priorLessons,'Existing draft lesson records changed.');
  // Recovery retains the existing database's known human source approvals. A blank
  // synthetic Store correctly refuses importing previously unknown lexical trust.
  copyFileSync(join(output,'before.sqlite'),join(output,'recovery.sqlite'));
  const exported=store.backup(),restore=new Store(join(output,'recovery.sqlite'));try{if(mediaRoot)restore.media.bindRoot(resolve(mediaRoot));restore.restore(exported);assert.deepEqual(restore.currentDraft().content,draft.content);for(const row of exported.learners){const actual=restore.learner(row.id),expected=structuredClone(row.state);for(const a of expected.attempts)if(a.revisionId!==null)a.revisionId=actual.attempts.find(x=>x.requestId===a.requestId).revisionId;for(const [id,r]of Object.entries(expected.resumes))r.revisionId=actual.resumes[id].revisionId;for(const r of expected.textPages||[])r.revisionId=actual.textPages.find(x=>x.lessonId===r.lessonId&&x.componentId===r.componentId).revisionId;assert.deepEqual(actual,expected);}}finally{restore.close();}
  receipt={activeRevisionId:active,previousDraftToken:originalDraft?.draftToken??null,draftToken:draft.draftToken,import:result.importReceipt,restoreRehearsal:true,integrity:'ok'};
 }finally{server?.close();store.close();}};
 stage(join(output,'rehearsal.sqlite'));assertTextInstallPreservation(preserved,tables(join(output,'rehearsal.sqlite')));
 if(apply){assert.deepEqual(databaseReceipt(database),before,'Database changed during rehearsal. Stop only its verified owner process before applying.');stage(database);assertTextInstallPreservation(preserved,tables(database));}
 assert.deepEqual(files(preservePaths),protectedFiles,'Configuration or media changed.');
 const report={mode:apply?'applied':'rehearsal-only',database,before,after:apply?databaseReceipt(database):null,files:protectedFiles,allProtectedTablesPreserved:true,...receipt};
 writeFileSync(join(output,'receipt.json'),JSON.stringify(report,null,2));return report;
}
if(process.argv[1]?.endsWith('prepare-text-install.mjs')){
 const {values}=parseArgs({options:{database:{type:'string'},output:{type:'string'},pack:{type:'string'},'media-root':{type:'string'},preserve:{type:'string',multiple:true},apply:{type:'boolean'},'expected-sha':{type:'string'}}});
 for(const key of ['database','output','pack'])assert.ok(values[key],'Supply --'+key);
 const report=await prepareTextInstall({database:values.database,output:values.output,packFile:values.pack,mediaRoot:values['media-root'],preservePaths:values.preserve||[],apply:values.apply,expectedDatabaseSHA256:values['expected-sha']});
 console.log(JSON.stringify({mode:report.mode,databaseSHA256:report.before.sha256,lessonCount:report.import.lessonCount,pageCount:report.import.pageCount,targetCount:report.import.targetCount,allProtectedTablesPreserved:report.allProtectedTablesPreserved,restoreRehearsal:report.restoreRehearsal,receipt:join(resolve(values.output),'receipt.json')}));
}
