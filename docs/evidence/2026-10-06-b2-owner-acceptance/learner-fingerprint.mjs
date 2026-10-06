// Read-only: every table (row count + sha256 prefix), the three fictional learner rows, and the published pack hash.
import {DatabaseSync} from 'node:sqlite';import {createHash} from 'node:crypto';
const db=new DatabaseSync(process.argv[2],{readOnly:true}),h=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0,16);
const tables={};for(const {name} of db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all()){const rows=db.prepare('SELECT * FROM "'+name+'" ORDER BY rowid').all();tables[name]=rows.length+' rows '+h(rows);}
const learnerCols=db.prepare('PRAGMA table_info(learners)').all().map(c=>c.name),idCol=learnerCols.includes('id')?'id':learnerCols[0];
const learners=Object.fromEntries(db.prepare('SELECT * FROM learners ORDER BY rowid').all().map(r=>[r[idCol],h(r)]));
const active=db.prepare("SELECT value FROM kv WHERE key='active'").get()?.value;
const revCols=db.prepare('PRAGMA table_info(revisions)').all().map(c=>c.name);
const pub=db.prepare('SELECT * FROM revisions WHERE '+(revCols.includes('id')?'id':'rowid')+'=?').get(Number(active));
const draft=db.prepare("SELECT value FROM kv WHERE key='draft'").get()?.value;
console.log(JSON.stringify({tables,learners,activeRevision:active,publishedPack:h(pub),draft:draft&&draft!=='null'?h(draft):'none'},null,1));db.close();
