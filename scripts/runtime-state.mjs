import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {Store,STORE_SCHEMA_VERSION} from '../src/store.js';
import {upgradeDemo,upgradeDemoSignal} from '../src/seed.js';

export const sha256 = value => createHash('sha256').update(value).digest('hex');
const quoted = name => '"'+name.replaceAll('"','""')+'"';
// Read one consistent SQLite snapshot, including every application table and sequence.
// Receipts contain counts and hashes, never learner rows or credential values.
export function databaseReceipt(filename) {
  const db = new DatabaseSync(filename,{readOnly:true});
  try {
    db.exec('BEGIN');
    const schema = db.prepare("SELECT type,name,tbl_name,sql FROM sqlite_schema ORDER BY type,name").all();
    const tables = {};
    for (const {name} of schema.filter(x=>x.type==='table')) {
      const rows = db.prepare('SELECT * FROM '+quoted(name)).all().map(row=>JSON.stringify(row)).sort();
      tables[name] = {rows:rows.length,sha256:sha256(JSON.stringify(rows))};
    }
    return {schemaSha256:sha256(JSON.stringify(schema)),tables,sha256:sha256(JSON.stringify({schema,tables}))};
  } finally {db.close();}
}

export function openPreservedStore(filename) {
  // readOnly:true refuses a missing file instead of creating/initializing it.
  const probe = new DatabaseSync(filename,{readOnly:true});
  try {
    const get = key => {const row=probe.prepare('SELECT value FROM kv WHERE key=?').get(key);return row?JSON.parse(row.value):null;};
    assert.equal(get('schema-version'),STORE_SCHEMA_VERSION,'Preservation startup refuses schema migration.');
    const active=get('active');
    assert.ok(active,'Preservation startup requires existing content.');
    const content=JSON.parse(probe.prepare('SELECT snapshot FROM revisions WHERE id=?').get(active).snapshot);
    if (!get('draft')) assert.ok(!upgradeDemo(content)&&!upgradeDemoSignal(content),'Preservation startup refuses fixture upgrade replay.');
    for (const id of ['learner-demo','learner-core','author-demo']) assert.ok(probe.prepare('SELECT id FROM learners WHERE id=?').get(id),'Preservation startup refuses profile initialization.');
  } finally {probe.close();}
  const before=databaseReceipt(filename);
  const store=new Store(filename);
  try {assert.deepEqual(databaseReceipt(filename),before,'Opening Store changed persistent state.');}
  catch(error){store.close();throw error;}
  return {store,before};
}

export function executableIdentity(root,expectedRevision) {
  const git = args => execFileSync('git',['-c','safe.directory='+root.replaceAll('\\','/'),...args],{cwd:root,encoding:'utf8',windowsHide:true});
  const revision=git(['rev-parse','HEAD']).trim();
  assert.match(expectedRevision,/^[a-f0-9]{40}$/,'Supply the exact reviewed commit.');
  assert.equal(revision,expectedRevision,'Checkout differs from the requested build.');
  const paths=['public','src','scripts','package.json','package-lock.json'];
  git(['diff','--exit-code','HEAD','--',...paths]);
  const files=Object.fromEntries(git(['ls-files','-z','--',...paths]).split('\0').filter(Boolean).sort().map(file=>[file,sha256(readFileSync(resolve(root,file)))]));
  const select=prefix=>Object.fromEntries(Object.entries(files).filter(([name])=>name.startsWith(prefix)));
  return Object.freeze({revision,runtimeSha256:sha256(JSON.stringify(files)),backendSha256:sha256(JSON.stringify(select('src/'))),files,preservationMode:true});
}
