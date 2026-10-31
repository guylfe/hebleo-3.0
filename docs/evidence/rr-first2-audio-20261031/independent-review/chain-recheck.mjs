import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const [root,evidence,out]=process.argv.slice(2),json=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const {databaseReceipt}=await import(pathToFileURL(path.join(root,'scripts/runtime-state.mjs')));
const initial=json(path.join(evidence,'initial-checkout-install/installed/receipt.json')),final=json(path.join(evidence,'installed/receipt.json'));
const sha=v=>createHash('sha256').update(v).digest('hex'),copies=[];
function read(file){const d=new DatabaseSync(file,{readOnly:true});try{d.exec('PRAGMA query_only=ON; BEGIN');const schema=d.prepare('SELECT type,name,tbl_name,sql FROM sqlite_schema ORDER BY type,name').all(),tables=Object.fromEntries(schema.filter(r=>r.type==='table').map(({name})=>[name,d.prepare('SELECT * FROM "'+name.replaceAll('"','""')+'" ORDER BY rowid').all()]));assert.equal(d.prepare('PRAGMA integrity_check').get().integrity_check,'ok');return structuredClone({schema,tables});}finally{d.close();}}
function offline(file,name){assert.ok(!fs.existsSync(file+'-wal')||fs.statSync(file+'-wal').size===0);const dest=path.resolve(out,name+'.sqlite');assert.equal(path.dirname(dest),path.resolve(out));assert.ok(!fs.existsSync(dest));fs.copyFileSync(file,dest);copies.push(dest);return read(dest);}
const kv=(s,k)=>JSON.parse(s.tables.kv.find(r=>r.key===k).value);
const receiptOf=s=>{const tables=Object.fromEntries(Object.entries(s.tables).map(([name,rows])=>[name,{rows:rows.length,sha256:sha(JSON.stringify(rows.map(r=>JSON.stringify(r)).sort()))}]));return {schemaSha256:sha(JSON.stringify(s.schema)),tables,sha256:sha(JSON.stringify({schema:s.schema,tables}))};};
const beforeLive=databaseReceipt(final.database),result={startedAt:new Date().toISOString(),checks:[]};
try{
 const firstReset=offline(path.join(evidence,'initial-checkout-install/installed/reset.sqlite'),'chain-initial-reset');
 const nextBefore=offline(path.join(evidence,'installed/before.sqlite'),'chain-final-before');
 const nextReset=offline(path.join(evidence,'installed/reset.sqlite'),'chain-final-reset'),live=read(final.database);
 for(const [name,receipt,saved,actual]of [['initial',initial,firstReset,nextBefore],['final',final,nextReset,live]]){
  const adjusted=structuredClone(saved),savedTime=kv(saved,'demo-progress-reset-at'),actualTime=kv(actual,'demo-progress-reset-at');assert.ok(Date.parse(actualTime)>Date.parse(savedTime));
  adjusted.tables.kv.find(r=>r.key==='demo-progress-reset-at').value=actual.tables.kv.find(r=>r.key==='demo-progress-reset-at').value;
  assert.deepEqual(receiptOf(adjusted),receipt.after);assert.deepEqual(adjusted,actual);
  result.checks.push({name,pass:true,savedTime,actualTime,onlyDifference:'demo-progress-reset-at',afterSha256:receipt.after.sha256});
 }
 assert.deepEqual(initial.after,final.before);assert.equal(initial.before.sha256,'0e5ade4b664aa6cdce3809b50fe12cf6e358f123efd52aebad54db70d1c914a4');
 assert.equal(final.before.sha256,'72340619fc25b0a829dad5b88501fb7d9e58cd612dc851f4e5c03930be435c8a');assert.equal(final.after.sha256,'11029b482abea7916d414fc0ef15243fe594412b3ed1d32b7f6b3bece529be33');
 assert.equal(final.revision,'73e242e717c630976fd2d040396d4d8d5fcd3127');assert.equal(final.runtimeSha256,'08e689b369f2129b94e6d6d0016c4a0c6dadc4936b680cd30d26b69a20bb2249');
 assert.deepEqual(databaseReceipt(final.database),beforeLive);result.liveReadsUnchanged=true;result.pass=true;result.finishedAt=new Date().toISOString();
 fs.writeFileSync(path.join(out,'chain-recheck.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{for(const file of copies)for(const suffix of ['','-wal','-shm','-journal']){const target=file+suffix;assert.equal(path.dirname(target),path.resolve(out));if(fs.existsSync(target))fs.unlinkSync(target);}}
