import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {databaseReceipt} from './hebleo-first2/scripts/runtime-state.mjs';
import {assertFirstTwoPreservation} from './hebleo-first2/scripts/install-first2.mjs';
const identity=JSON.parse(fs.readFileSync('FIRST2_BUILD.json')),receipt=JSON.parse(fs.readFileSync('installed/receipt.json'));
const base='http://127.0.0.1:63358';
const json=async(route,user='learner-demo')=>{const r=await fetch(base+route,{headers:{'x-demo-user':user}});assert.equal(r.status,200,route);return r.json();};
const build=await json('/api/build');assert.deepEqual(build,identity);
const initialDatabase=databaseReceipt(receipt.database);assert.deepEqual(initialDatabase,receipt.after,'Database changed after installation/startup, before verification.');
const active=await json('/api/bootstrap'),studio=await json('/api/studio','author-demo');assert.equal(active.revisionId,5);assert.deepEqual(active.content.lessons.map(l=>l.id),['MEMORY-A2','MNTL-A2','lesson-3']);assert.equal(studio.draft.content.lessons.length,23);
const pack=JSON.parse(fs.readFileSync('hebleo-first2/content/first2/lessons.json'));
const sessions=[];for(const lesson of pack.lessons){const s=await json('/api/session?lessonId='+lesson.id);assert.equal(s.revisionId,5);assert.deepEqual(s.content.lessons.find(l=>l.id===lesson.id).blocks,lesson.blocks);assert.deepEqual(studio.draft.content.lessons.find(l=>l.id===lesson.id),lesson);sessions.push({id:lesson.id,revisionId:s.revisionId,pages:lesson.blocks[0].textPages.pages.length,componentId:lesson.blocks[0].id});}
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),assets=[];
for(const entry of JSON.parse(fs.readFileSync('first2-media-receipt.json'))){const path='/media/first2/first2-'+entry.name+'.png',r=await fetch(base+path);assert.equal(r.status,200);const bytes=Buffer.from(await r.arrayBuffer());assert.equal(sha(bytes),entry.sha256);assets.push({path,sha256:entry.sha256,bytes:bytes.length});}
const changed=['app.js','source-activities.js','text-reader.js','text-contract.js','ux.js','keyboard-owner.js','refinement.css','studio/text-pages-editor.js'];
for(const path of changed){const r=await fetch(base+'/'+path);assert.equal(r.status,200,path);assert.equal(sha(Buffer.from(await r.arrayBuffer())),identity.files['public/'+path],path);}
const preservation=assertFirstTwoPreservation('installed/before.sqlite',receipt.database);assert.deepEqual(databaseReceipt(receipt.database),initialDatabase,'Readback wrote persistent state.');
const result={verifiedAt:new Date().toISOString(),url:base,revision:build.revision,runtimeSha256:build.runtimeSha256,activeRevisionId:active.revisionId,lessons:sessions,draftLessons:23,media:assets,servedChangedAssetsVerified:changed,preservation,readsWroteNothing:true,fictionalProgressReset:receipt.fictionalProgressReset,genuineConsonantAudio:'pending acquisition; no playback verified',nativeAcceptance:'pending independent review and Guy'};
fs.writeFileSync('FIRST2_INSTALLED_READBACK.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
