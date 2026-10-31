import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root='C:/Users/Trans/.openmausbot/task-workspaces/8c900356-50f6-4d41-bbb9-50c8abe09233/489864a5-e240-4cef-a6fc-8cc6d0df25fa/hebleo-audio-contract';
const {databaseReceipt}=await import(pathToFileURL(root+'/scripts/runtime-state.mjs'));
const expected=JSON.parse(readFileSync('preflight/build.json')),receipt=JSON.parse(readFileSync('installed/receipt.json'));
const base='http://127.0.0.1:63358',sha=b=>createHash('sha256').update(b).digest('hex');
async function json(route,user='learner-demo'){const r=await fetch(base+route,{headers:{'x-demo-user':user}});assert.equal(r.status,200,route);return r.json();}
const build=await json('/api/build');assert.deepEqual(build,expected);
const before=databaseReceipt(receipt.database);assert.deepEqual(before,receipt.after,'State changed before readback.');
const boot=await json('/api/bootstrap'),studio=await json('/api/studio','author-demo');assert.equal(boot.revisionId,5);assert.equal(studio.draft.content.lessons.length,23);
const pack=JSON.parse(readFileSync(root+'/content/first2/lessons.json')),lessons=[];
for(const lesson of pack.lessons){const s=await json('/api/session?lessonId='+lesson.id);assert.equal(s.revisionId,5);assert.deepEqual(s.content.lessons.find(l=>l.id===lesson.id).blocks,lesson.blocks);assert.deepEqual(studio.draft.content.lessons.find(l=>l.id===lesson.id),lesson);lessons.push({id:lesson.id,component:lesson.blocks[0].id,pages:lesson.blocks[0].textPages.pages.length});}
const profiles=[];for(const user of ['author-demo','learner-core','learner-demo']){const b=await json('/api/bootstrap',user);assert.deepEqual(b.learner.completed,[]);assert.deepEqual(b.learner.attempts,[]);assert.deepEqual(b.learner.resumes,{});assert.equal(b.learner.lastReview,null);assert.ok(!b.learner.textPages?.length);profiles.push({id:user,completed:0,attempts:0,resumes:0});}
// The historical media-picker module is intentionally not a public server route.
const served=[];for(const [name,hash]of Object.entries(build.files).filter(([n])=>n.startsWith('public/')&&n!=='public/studio/media-picker.js'&&/\.(js|css|html|png|svg)$/.test(n))){const path=name==='public/index.html'?'/':'/'+name.slice(7),r=await fetch(base+path);assert.equal(r.status,200,path);assert.equal(sha(Buffer.from(await r.arrayBuffer())),hash,path);served.push(path);}
const media=[];for(const item of JSON.parse(readFileSync("C:/Users/Trans/.openmausbot/task-workspaces/8c900356-50f6-4d41-bbb9-50c8abe09233/3f5dff25-a1fa-4bda-b947-bd733b040b0a/first2-media-receipt.json"))){const path='/media/first2/first2-'+item.name+'.png',r=await fetch(base+path);assert.equal(r.status,200,path);const bytes=Buffer.from(await r.arrayBuffer());assert.equal(sha(bytes),item.sha256);media.push({path,sha256:item.sha256,bytes:bytes.length});}
assert.deepEqual(databaseReceipt(receipt.database),before,'Verification reads changed stored state.');
const result={verifiedAt:new Date().toISOString(),url:base,revision:build.revision,runtimeSha256:build.runtimeSha256,backendSha256:build.backendSha256,activeRevision:5,sourceLessonsExact:true,savedDraftLessons:23,lessons,profiles,servedPublicAssetsVerified:served.length,served,sourceMediaExact:media,preservation:receipt.preservation,applicationExportRestoreRehearsal:receipt.applicationExportRestoreRehearsal,readsWroteNothing:true,installedDatabaseSha256:before.sha256,audio:'unavailable; no isolated clips installed; listening functionality unfinished'};
writeFileSync('INSTALLED_READBACK.json',JSON.stringify(result,null,2));console.log(JSON.stringify({...result,served:undefined,sourceMediaExact:media.length},null,2));
