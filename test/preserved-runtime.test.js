import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {Store,STORE_SCHEMA_VERSION} from '../src/store.js';
import {createServer} from '../src/server.js';
import {databaseReceipt,openPreservedStore} from '../scripts/runtime-state.mjs';

test('preserved runtime serves build identity across repeated starts with all persistent state intact',async t=>{
  const dir=mkdtempSync(join(tmpdir(),'hebleo-preserved-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const database=join(dir,'demo.sqlite'),seed=new Store(database);
  const learner=seed.learner('learner-demo');learner.completed=['lesson-1'];learner.notes={'lesson-1':'saved note'};learner.bookmarks=['lesson-1'];learner.preferences.nikkud='none';seed.saveLearner('learner-demo',learner);
  seed.stage({baseRevisionId:seed.get('active'),expectedDraftToken:null,content:seed.snapshot()});
  seed.set('preserved-config',{setting:'retained'});seed.close();
  const before=databaseReceipt(database),buildIdentity={revision:'a'.repeat(40),backendSha256:'b'.repeat(64),preservationMode:true};
  for(let i=0;i<2;i++){
    const {store}=openPreservedStore(database),server=createServer(store,{mediaRoot:dir,buildIdentity});
    try{
      await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
      const base='http://127.0.0.1:'+server.address().port;
      assert.deepEqual(await (await fetch(base+'/api/build')).json(),buildIdentity);
      assert.deepEqual((await (await fetch(base+'/api/bootstrap')).json()).learner.completed,['lesson-1']);
      assert.deepEqual(databaseReceipt(database),before);
    }finally{await new Promise(resolve=>server.close(resolve));store.close();}
  }
});

test('preserved startup refuses missing files, old schemas and fixture replay before writes',t=>{
  const dir=mkdtempSync(join(tmpdir(),'hebleo-preserved-refusal-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const missing=join(dir,'missing.sqlite');assert.throws(()=>openPreservedStore(missing));assert.equal(existsSync(missing),false);
  const database=join(dir,'demo.sqlite'),store=new Store(database);store.set('schema-version',6);store.close();
  let before=databaseReceipt(database);assert.throws(()=>openPreservedStore(database),/schema migration/);assert.deepEqual(databaseReceipt(database),before);
  const db=new DatabaseSync(database);db.prepare("UPDATE kv SET value=? WHERE key='schema-version'").run(String(STORE_SCHEMA_VERSION));
  const active=JSON.parse(db.prepare("SELECT value FROM kv WHERE key='active'").get().value),row=db.prepare('SELECT snapshot FROM revisions WHERE id=?').get(active),content=JSON.parse(row.snapshot);delete content.uxVersion;
  db.prepare('UPDATE revisions SET snapshot=? WHERE id=?').run(JSON.stringify(content),active);db.close();
  before=databaseReceipt(database);assert.throws(()=>openPreservedStore(database),/fixture upgrade replay/);assert.deepEqual(databaseReceipt(database),before);
});
