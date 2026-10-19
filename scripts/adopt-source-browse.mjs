import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {parseArgs} from 'node:util';
import {backup,DatabaseSync} from 'node:sqlite';
import {validateSourceBrowse} from '../src/source-vocabulary.js';
import {validateContent} from '../src/store.js';
import {databaseReceipt,openPreservedStore,sha256} from './runtime-state.mjs';
const {values}=parseArgs({options:{database:{type:'string'},source:{type:'string'},backup:{type:'string'},expected:{type:'string'},receipt:{type:'string'}}});
for(const k of ['database','source','backup','expected','receipt'])assert.ok(values[k],'Supply --'+k);
const database=path.resolve(values.database),source=JSON.parse(fs.readFileSync(values.source,'utf8')),expected=JSON.parse(fs.readFileSync(values.expected,'utf8'));
validateSourceBrowse(source);
assert.equal(fs.existsSync(values.backup),false,'Never overwrite recovery evidence.');
const before=databaseReceipt(database);assert.deepEqual(before,expected,'Database changed; reconcile before adopting.');
fs.mkdirSync(values.backup,{recursive:true});
const reader=new DatabaseSync(database,{readOnly:true});try{await backup(reader,path.join(values.backup,'consistent.sqlite'));}finally{reader.close();}
assert.deepEqual(databaseReceipt(path.join(values.backup,'consistent.sqlite')),before);
const {store}=openPreservedStore(database);
let ledger;
try{store.transaction(()=>{
 assert.deepEqual(databaseReceipt(database),before,'CAS mismatch inside adoption transaction.');
 const previous=store.snapshot(),draft=store.get('draft'),oldActive=store.get('active');
 assert.ok(!previous.lexical.sourceBrowse,'Already adopted; inspect rather than repeat.');
 const active=structuredClone(previous);active.lexical.sourceBrowse=source;validateContent(active);
 const nextDraft=structuredClone(draft);if(nextDraft){nextDraft.content.lexical.sourceBrowse=source;validateContent(nextDraft.content);}
 const revision=store.addRevision(active,'Exact authored Masterfile source browsing; no learned eligibility or held/generated approval');
 store.set('active',revision);
 if(nextDraft){nextDraft.baseRevisionId=revision;store.set('draft',nextDraft);}
 // Prove only the explicitly allowed content addition/rebase occurred.
 const check=structuredClone(store.snapshot());delete check.lexical.sourceBrowse;assert.deepEqual(check,previous);
 if(nextDraft){const checkDraft=structuredClone(store.get('draft'));delete checkDraft.content.lexical.sourceBrowse;checkDraft.baseRevisionId=draft.baseRevisionId;assert.deepEqual(checkDraft,draft);}
 ledger={previousActive:oldActive,active:revision,sourceDigest:source.digest,counts:source.counts,allowedChanges:['revisions: one appended snapshot with lexical.sourceBrowse only','kv.active: new revision ID','kv.draft: lexical.sourceBrowse addition and baseRevisionId rebase','sqlite_sequence: revisions append'],preservedPreviousContentSha256:sha256(JSON.stringify(previous)),preservedDraftSha256:sha256(JSON.stringify(draft))};
});}finally{store.close();}
const after=databaseReceipt(database);
assert.equal(after.schemaSha256,before.schemaSha256);
for(const [name,table]of Object.entries(before.tables))if(!['kv','revisions','sqlite_sequence'].includes(name))assert.deepEqual(after.tables[name],table,name+' must remain exact');
const receipt={at:new Date().toISOString(),database,before,after,ledger};fs.writeFileSync(values.receipt,JSON.stringify(receipt,null,2));
console.log(JSON.stringify({adopted:source.counts.rows,sourceRecords:source.counts.visibleSourceRecords,active:ledger.active,sourceDigest:source.digest,learnerTablesPreserved:true,before:before.sha256,after:after.sha256}));
