// Verification only: copy the supplied SQLite file, never mutate or install it.
import assert from 'node:assert/strict';
import {copyFileSync,mkdtempSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {createServer} from '../src/server.js';
import {databaseReceipt,openPreservedStore} from './runtime-state.mjs';
import {classicDOM} from '../test-support/classic-dom.js';
import {mountStandardEditor} from '../public/author/standard-editor.js';
import {authorProjection} from '../src/author-review.js';
const source=process.argv[process.argv.indexOf('--source')+1];if(!process.argv.includes('--source')||!source)throw Error('Supply --source <read-only baseline sqlite>');
const original=resolve(source),before=databaseReceipt(original);
mkdirSync('tmp',{recursive:true});const dir=mkdtempSync(resolve('tmp/classic-http-')),file=join(dir,'copy.sqlite');copyFileSync(original,file);
const {store}=openPreservedStore(file),server=createServer(store,{mediaRoot:join(dir,'media')}),cleanup=[];
const {host,deps,doc}=classicDOM({after:fn=>cleanup.push(fn)});let ui;
const sha=value=>createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value)).digest('hex');
try{
 const draft=store.currentDraft(),content=structuredClone(draft.content),old=JSON.stringify(content),active=sha(store.snapshot()),learners=sha(store.db.prepare('SELECT * FROM learners ORDER BY id').all());
 const lesson=content.lessons.find(l=>l.blocks?.some(b=>b.textPages?.pages.some(p=>p.html))),block=lesson.blocks.find(b=>b.textPages?.pages.some(p=>p.html)),page=block.textPages.pages.find(p=>p.html);
 ui=mountStandardEditor(host,{source:page.html,dependencies:deps});assert.ok(await ui.ready,host.textContent);assert.equal(ui.getValue(),page.html);
 const p=ui.view.editor.querySelector('p:not([data-retained]),h1,h2,h3,li');assert.ok(p,'Need supported prose for matching-copy verification');
 ui.view.s.focus();ui.view.s.select(p,true);ui.view.execCommand('forecolor',false,'#123456');ui.view.setEditorValue();
 const value=ui.getValue();assert.notEqual(value,page.html);assert.equal(authorProjection(value),authorProjection(page.html));page.html=value;
 const retainedKV=sha(store.db.prepare("SELECT key,value FROM kv WHERE key NOT IN ('draft','source-state') ORDER BY key").all()),tableBaseline=databaseReceipt(file);
 const expected=JSON.stringify(content),otherLessons=sha(content.lessons.filter(l=>l.id!==lesson.id));
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port,headers={'x-demo-user':'author-demo','content-type':'application/json','prefer':'return=minimal'};
 const post=async(path,input)=>{const response=await fetch(origin+'/api/'+path,{method:'POST',headers,body:JSON.stringify(input)});const value=await response.json();assert.equal(response.status,200,value.error);return value;};
 const start=performance.now(),saved=await post('studio/draft',{baseRevisionId:draft.baseRevisionId,expectedDraftToken:draft.draftToken,content}),saveMs=performance.now()-start;
 assert.equal(JSON.stringify(store.currentDraft().content),expected);
 const preview=await post('studio/preview/session',{lessonId:lesson.id,draftToken:saved.draftToken});assert.equal(preview.content.lessons.find(l=>l.id===lesson.id).blocks.find(b=>b.id===block.id).textPages.pages.find(p=>p.id===page.id).html,value);
 const response=await fetch(origin+'/api/studio',{headers});assert.equal(response.status,200);const reloaded=await response.json();assert.equal(JSON.stringify(reloaded.draft.content),expected);
 assert.equal(sha(reloaded.draft.content.lessons.filter(l=>l.id!==lesson.id)),otherLessons);assert.equal(sha(store.snapshot()),active);assert.equal(sha(store.db.prepare('SELECT * FROM learners ORDER BY id').all()),learners);
 const assets={};for(const asset of ['safe-format.js','author/classic-source.js','author/standard-editor.js','author/legacy-editor.js','author/vendor/jodit.min.js','author/vendor/jodit.min.css']){const r=await fetch(origin+'/'+asset);assert.equal(r.status,200,asset);const body=Buffer.from(await r.arrayBuffer());assert.equal(sha(body),sha(readFileSync(resolve('public',asset))));assets[asset]={bytes:body.length,sha256:sha(body)};}
 assert.equal(sha(store.db.prepare("SELECT key,value FROM kv WHERE key NOT IN ('draft','source-state') ORDER BY key").all()),retainedKV);
 const tableAfter=databaseReceipt(file);for(const name of Object.keys(tableBaseline.tables))if(name!=='kv')assert.deepEqual(tableAfter.tables[name],tableBaseline.tables[name],name);
 assert.deepEqual(databaseReceipt(original),before);
 const result={baselineUnchanged:before.sha256,disposableFile:file,lessonCount:content.lessons.length,originalContentBytes:Buffer.byteLength(old),savedContentBytes:Buffer.byteLength(expected),saveMs,sourceProjectionExact:true,otherLessonsExact:true,activeExact:true,learnersExact:true,allNonKVTablesExact:true,privateHistoryMediaSettingsExact:true,savedPreviewExact:true,httpReloadExact:true,assets,limits:'JSDOM supplied component plus loopback HTTP, not trusted native UI or input-to-paint. No installation/publication.'};
 const output=resolve('tmp/classic-http-result.json');writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}finally{ui?.dispose();cleanup.forEach(fn=>fn());if(server.listening){server.closeAllConnections();await new Promise(r=>server.close(r));}store.close();}
