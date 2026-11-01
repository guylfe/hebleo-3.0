import {readFileSync,writeFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root=resolve('hebleo-editor'),dir=resolve('installed-classic-editor-20261101'),applied=JSON.parse(readFileSync(dir+'/APPLIED.json'));
const {databaseReceipt,executableIdentity}=await import(pathToFileURL(root+'/scripts/runtime-state.mjs'));
const {draftTokenFor}=await import(pathToFileURL(root+'/src/store.js'));
const digest=bytes=>createHash('sha256').update(bytes).digest('hex'),identity=executableIdentity(root,applied.identity.revision);assert.deepEqual(identity,applied.identity);
const before=databaseReceipt(applied.database),origin='http://127.0.0.1:63358',build=await(await fetch(origin+'/api/build')).json();assert.deepEqual(build,identity);
const served=[],unserved=[];
for(const [file,expected] of Object.entries(identity.files).filter(([file])=>file.startsWith('public/'))){
 const path=file==='public/index.html'?'/':'/'+file.slice(7),response=await fetch(origin+path);
 if(response.status===404){unserved.push(path);continue;}assert.equal(response.status,200,path);const bytes=Buffer.from(await response.arrayBuffer());assert.equal(digest(bytes),expected,'Served bytes: '+path);served.push({path,sha256:expected});
}
for(const path of ['/','/app.js','/author/inline-author.js','/author/field-patch.js','/author/standard-editor.js','/author/source-adapter.js','/author/vendor/jodit.min.js','/author/vendor/jodit.min.css','/author/classic-source.js','/author/image-chooser.js','/safe-format.js','/studio/workspace.js','/studio/save-task.js','/studio/save-processor.js','/studio/save-worker.js','/studio/lesson-publication.js','/sidebar-toggle.js'])assert.ok(served.some(item=>item.path===path),'Required served asset: '+path);
for(const [path,file] of [['/vendor/marked.js','node_modules/marked/lib/marked.esm.js'],['/vendor/purify.js','node_modules/dompurify/dist/purify.es.mjs']]){const response=await fetch(origin+path);assert.equal(response.status,200);const sha256=digest(Buffer.from(await response.arrayBuffer()));assert.equal(sha256,digest(readFileSync(resolve(root,file))));served.push({path,sha256});}
const headers={'x-demo-user':'author-demo'},response=await fetch(origin+'/api/studio',{headers});assert.equal(response.status,200);const studio=await response.json();
const db=new DatabaseSync(applied.database,{readOnly:true});let draft,active,media;
try{draft=JSON.parse(db.prepare("SELECT value FROM kv WHERE key='draft'").get().value);active=JSON.parse(db.prepare('SELECT snapshot FROM revisions WHERE id=?').get(studio.revisionId).snapshot);media={blobs:db.prepare('SELECT sha256,mime_type,byte_length FROM media_blobs ORDER BY sha256').all(),aliases:db.prepare('SELECT path,sha256 FROM media_aliases ORDER BY path').all()};}finally{db.close();}
assert.deepEqual(studio.draft.content,draft.content);assert.deepEqual(studio.content,active);assert.equal(studio.draft.draftToken,draftTokenFor(draft.baseRevisionId,draft.content));assert.equal(studio.revisionId,6);assert.equal(studio.draft.content.lessons.length,23);assert.equal(digest(JSON.stringify(studio.draft.content)),applied.preservation.draftContentSha256);
const mimeExt={'audio/wav':'.wav','audio/mpeg':'.mp3','audio/ogg':'.ogg','audio/mp4':'.m4a','video/mp4':'.mp4','video/webm':'.webm','image/png':'.png','image/jpeg':'.jpg','image/gif':'.gif','image/webp':'.webp','application/pdf':'.pdf'};
const mediaReadback=[];
for(const item of [...media.aliases.map(row=>({path:'/media/'+row.path,sha256:row.sha256})),...media.blobs.map(row=>({path:'/media/blobs/'+row.sha256+mimeExt[row.mime_type],sha256:row.sha256}))]){const response=await fetch(origin+item.path,{headers});assert.equal(response.status,200,item.path);assert.equal(digest(Buffer.from(await response.arrayBuffer())),item.sha256,item.path);mediaReadback.push(item);}
const profiles=[];for(const user of ['learner-demo','learner-core','author-demo']){const response=await fetch(origin+'/api/bootstrap',{headers:{'x-demo-user':user}});assert.equal(response.status,200);const data=await response.json(),state=data.learner;profiles.push({id:user,completed:state.completed.length,attempts:state.attempts.length,cards:Object.keys(state.cards).length,resumes:Object.keys(state.resumes).length});}
assert.deepEqual(databaseReceipt(applied.database),before,'Readback must write no rows');
const result={revision:build.revision,runtimeSha256:build.runtimeSha256,backendSha256:build.backendSha256,runtimeFiles:Object.keys(build.files).length,servedAssets:served,unmappedPublicFiles:unserved,mediaReadback,contentRevision:studio.revisionId,draftLessons:studio.draft.content.lessons.length,draftContentBytes:Buffer.byteLength(JSON.stringify(studio.draft.content)),draftContentSha256:digest(JSON.stringify(studio.draft.content)),exactSavedTokenReadback:true,fullDraftAndPublishedReadbackExact:true,profiles,readbackReceipt:before,readbackChangedNoRows:true};
writeFileSync(dir+'/HTTP_READBACK.json',JSON.stringify(result,null,2));console.log(JSON.stringify({...result,servedAssets:served.length,unmappedPublicFiles:unserved,mediaReadback:mediaReadback.length,readbackReceipt:before.sha256}));
