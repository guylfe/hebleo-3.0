import {DatabaseSync} from 'node:sqlite';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const dir=resolve('installed-classic-editor-20261101'),applied=JSON.parse(readFileSync(dir+'/APPLIED.json'));
const {databaseReceipt}=await import(pathToFileURL(resolve('hebleo-editor/scripts/runtime-state.mjs')));
const receipt=databaseReceipt(applied.database),db=new DatabaseSync(applied.database,{readOnly:true});let profiles;
try{profiles=db.prepare('SELECT id,state FROM learners ORDER BY id').all().map(row=>{const state=JSON.parse(row.state);return {id:row.id,completed:state.completed.length,attempts:state.attempts.length,resumes:Object.keys(state.resumes).length,textPageRecords:state.textPages?.length||0,hasLastLesson:Boolean(state.lastLessonId)};});}finally{db.close();}
if(process.argv.includes('--capture')){assert.ok(profiles.some(profile=>profile.resumes>0||profile.textPageRecords>0),'Actual new fictional progress is required');writeFileSync(dir+'/RESTART_BEFORE.json',JSON.stringify({receipt,profiles},null,2));console.log(JSON.stringify({status:'CAPTURED',receipt:receipt.sha256,profiles}));}
else{const before=JSON.parse(readFileSync(dir+'/RESTART_BEFORE.json'));assert.deepEqual(receipt,before.receipt,'Same-build restart must preserve every row including new progress');assert.deepEqual(profiles,before.profiles);const response=await fetch('http://127.0.0.1:63358/api/build'),build=await response.json();assert.deepEqual(build,applied.identity);const result={sameBuildRestartRetainsAllRows:true,newProgressRetained:true,receipt,profiles,revision:build.revision};writeFileSync(dir+'/RESTART_AFTER.json',JSON.stringify(result,null,2));console.log(JSON.stringify({...result,receipt:receipt.sha256}));}
