import {test} from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,rmSync} from 'node:fs';import path from 'node:path';
import {Store} from '../src/store.js';import {createServer} from '../src/server.js';

test('UX2333 installed HTTP private notes and word-linked comments survive SQLite reopening as distinct records',async t=>{
 const tempRoot=path.resolve('tmp');mkdirSync(tempRoot,{recursive:true});const dir=mkdtempSync(path.join(tempRoot,'navnotes-'));assert.ok(path.resolve(dir).startsWith(tempRoot+path.sep));let store=new Store(path.join(dir,'fixture.sqlite')),server=createServer(store);t.after(async()=>{if(server?.listening)await new Promise(r=>server.close(r));store?.close();if(!path.resolve(dir).startsWith(tempRoot+path.sep))throw new Error('Cleanup outside fixture root');rmSync(dir,{recursive:true,force:true});});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,post=(endpoint,input)=>fetch(base+'/api/'+endpoint,{method:'POST',headers:{'content-type':'application/json','x-demo-user':'learner-demo'},body:JSON.stringify(input)});
 const wordsBefore=structuredClone(store.snapshot().words),note='SYNTHETIC private UTF note אֲנִי  two spaces';assert.equal((await post('preferences',{note:{wordId:'w-ani',text:note}})).status,200);assert.equal((await post('questions',{requestId:'synthetic-word-comment',lessonId:'lesson-1',revisionId:1,wordId:'w-ani',discussionVersion:1,anonymous:true,question:'SYNTHETIC public lesson comment'})).status,200);
 await new Promise(r=>server.close(r));server=null;store.close();store=new Store(path.join(dir,'fixture.sqlite'));
 assert.equal(store.learner('learner-demo').notes['w-ani'],note);assert.equal(store.learner('learner-demo').notes['w-sham'],undefined);const sam=store.bootstrap('learner-demo').users.find(u=>u.name==='Sam').id;assert.equal(store.learner(sam).notes['w-ani'],undefined);assert.deepEqual(store.snapshot().words,wordsBefore);
 const author=store.questions('author-demo')[0],projection=store.questions(sam)[0];assert.equal(author.wordId,'w-ani');assert.equal(author.lessonId,'lesson-1');assert.equal(author.discussionVersion,1);assert.equal(projection.question,'SYNTHETIC public lesson comment');assert.equal(projection.userId,undefined);assert.ok(!JSON.stringify(projection).includes(note));
});
