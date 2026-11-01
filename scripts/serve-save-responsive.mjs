// Source is read-only. Never install the generated synthetic review store.
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,writeFileSync,existsSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createServer} from '../src/server.js';
import {databaseReceipt,openPreservedStore,sha256} from './runtime-state.mjs';
import {demoBuildFiles} from '../src/demo-build.js';
import {execFileSync} from 'node:child_process';
const [source,port='63482']=process.argv.slice(2);if(!source)throw Error('Supply original read-only database.');
mkdirSync('tmp',{recursive:true});const label='native-'+port+'-'+Date.now(),file=resolve('tmp/'+label+'.sqlite'),beforeSource=databaseReceipt(source);
const original=new DatabaseSync(resolve(source),{readOnly:true});try{original.prepare('VACUUM INTO ?').run(file);}finally{original.close();}
assert.deepEqual(databaseReceipt(file),beforeSource);const {store}=openPreservedStore(file),draft=store.currentDraft(),active=store.snapshot();
const prepared={file,stopFile:file+'.stop',sourceReceipt:beforeSource,lessonCount:draft.content.lessons.length,contentBytes:Buffer.byteLength(JSON.stringify(draft.content)),draftSha256:sha256(JSON.stringify(draft.content)),activeSha256:sha256(JSON.stringify(active))};
assert.equal(prepared.lessonCount,23);assert.equal(prepared.contentBytes,26632089);
const build={revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',windowsHide:true}).trim(),files:Object.fromEntries((await demoBuildFiles()).map(path=>[path,sha256(readFileSync(path))])),preservationMode:true};
prepared.build=build;writeFileSync('tmp/'+label+'-prepared.json',JSON.stringify(prepared,null,2));
const server=createServer(store,{mediaRoot:resolve('tmp/absent-media-root'),developerAudit:true,buildIdentity:build});
await new Promise(r=>server.listen(Number(port),'127.0.0.1',r));console.log(JSON.stringify({url:'http://127.0.0.1:'+port,pid:process.pid,...prepared}));
const timer=setInterval(async()=>{if(!existsSync(prepared.stopFile))return;clearInterval(timer);server.closeAllConnections();await new Promise(r=>server.close(r));const finalDraft=store.currentDraft(),final={sourceUnchanged:databaseReceipt(source).sha256===beforeSource.sha256,activeUnchanged:JSON.stringify(store.snapshot())===JSON.stringify(active),draftLessons:finalDraft.content.lessons.length,finalDraftBytes:Buffer.byteLength(JSON.stringify(finalDraft.content)),receipt:databaseReceipt(file)};store.close();writeFileSync('tmp/'+label+'-final.json',JSON.stringify(final,null,2));console.log(JSON.stringify(final));},1000);
