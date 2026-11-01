// Read-only, exact full-D and all non-progress state verification after native
// synthetic edits. No learner/private/source bodies are written to reports.
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,writeFileSync} from 'node:fs';
import {databaseReceipt,sha256} from './runtime-state.mjs';
const [source,preparedPath,prefix,output='tmp/native-preservation.json']=process.argv.slice(2),prepared=JSON.parse(readFileSync(preparedPath));
assert.deepEqual(databaseReceipt(source),prepared.sourceReceipt,'Original read-only source changed');
const read=path=>{const db=new DatabaseSync(path,{readOnly:true});try{return {kv:db.prepare('SELECT * FROM kv ORDER BY key').all(),learners:db.prepare('SELECT * FROM learners ORDER BY id').all()};}finally{db.close();}};
const original=read(source),candidate=read(prepared.file),get=(rows,key)=>JSON.parse(rows.find(r=>r.key===key).value),expected=get(original.kv,'draft').content,actual=get(candidate.kv,'draft').content;
const page=expected.lessons.find(l=>l.id==='MEMORY-A2').blocks[0].textPages.pages[0];assert.ok(page.html.includes('Welcome to Hebleo'));page.html=page.html.replace('Welcome to Hebleo',prefix+'Welcome to Hebleo');assert.deepEqual(actual,expected,'Complete 23-lesson workspace must equal only the explicit native insertion');
assert.deepEqual(candidate.kv.map(r=>r.key),original.kv.map(r=>r.key));for(const row of original.kv)if(row.key!=='draft')assert.deepEqual(candidate.kv.find(r=>r.key===row.key),row,'kv '+row.key);
const receipt=databaseReceipt(prepared.file);assert.equal(receipt.schemaSha256,prepared.sourceReceipt.schemaSha256);for(const [table,entry] of Object.entries(prepared.sourceReceipt.tables))if(!['kv','learners'].includes(table))assert.deepEqual(receipt.tables[table],entry,table);
const changedProfiles=candidate.learners.filter(row=>JSON.stringify(row)!==JSON.stringify(original.learners.find(r=>r.id===row.id))).map(row=>row.id);assert.deepEqual(candidate.learners.map(r=>r.id),original.learners.map(r=>r.id));assert.ok(changedProfiles.every(id=>id==='author-demo'),'Only native author navigation may change progress');
const result={lessonCount:actual.lessons.length,contentBytes:Buffer.byteLength(JSON.stringify(actual)),draftSha256:sha256(JSON.stringify(actual)),completeExpectedDraftExact:true,allNonProgressStateExact:true,allNonDraftKVExact:true,allRevisionsEventsMediaSequenceExact:true,schemaExact:true,changedProfiles,sourceUnchanged:true,sourceReceipt:prepared.sourceReceipt,finalReceipt:receipt};writeFileSync(output,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
