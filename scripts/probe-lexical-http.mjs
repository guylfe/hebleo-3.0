import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Store} from '../src/store.js';
import {createServer} from '../src/server.js';
const capture=JSON.parse(fs.readFileSync(process.argv[2],'utf8')),store=new Store(':memory:'),server=createServer(store);
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const before=JSON.stringify(store.db.prepare('SELECT * FROM learners ORDER BY id').all());
const post=async(path,body)=>{const response=await fetch(base+'/api/'+path,{method:'POST',headers:{'content-type':'application/json','x-demo-user':'author-demo'},body:JSON.stringify(body)}),result=await response.json();assert.equal(response.status,200,result.error);return result;};
try{
 const adapted=await post('studio/lexical/import-preview',capture),content=store.snapshot();content.lexical=adapted.lexical;
 const stage=await post('studio/draft',{baseRevisionId:store.get('active'),expectedDraftToken:null,content});
 const preview=await post('studio/preview/session',{draftToken:stage.draftToken,lessonId:'lesson-2'});
 assert.equal(preview.content.lexicalView.rows.length,0);assert.equal(preview.content.lexical,undefined);
 assert.deepEqual(store.currentDraft().content.lexical,content.lexical);
 const migration=await post('studio/lexical/migration-preview',{draftToken:stage.draftToken,mappings:[]});assert.equal(migration.canApply,false);
 assert.equal(JSON.stringify(store.db.prepare('SELECT * FROM learners ORDER BY id').all()),before);assert.equal(store.get('active'),1);
 console.log(JSON.stringify({status:'passed',endpoints:['author import preview','18 MB draft stage','exact draft learner rehearsal','read-only migration preview'],draftBytes:Buffer.byteLength(JSON.stringify(content)),counts:adapted.preview.counts,learnerRowsUnchanged:true,activeRevisionUnchanged:true,rawSourceExcluded:true,draftToken:stage.draftToken},null,2));
}finally{await new Promise(r=>server.close(r));store.close();}
