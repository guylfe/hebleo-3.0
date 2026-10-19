import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {Store} from '../hebleo-lead/src/store.js';
import {createServer} from '../hebleo-lead/src/server.js';
const dump=s=>Object.fromEntries(s.db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(({name})=>[name,s.db.prepare(`SELECT * FROM "${name}" ORDER BY rowid`).all()]));
const total=s=>s.db.prepare('SELECT total_changes() n').get().n;
const source=new Store();
source.attempt('learner-demo',{requestId:'SYNTHETIC-answer',revisionId:source.get('active'),exerciseId:'ex-1-type',answer:'אני'});
source.report('learner-demo',{requestId:'SYNTHETIC-report',attemptId:'SYNTHETIC-answer',reason:'unclear',note:'SYNTHETIC independent omission probe'});
const backup=source.backup();source.close();const results=[];
for(const name of ['absent','null','empty','missing-target-control','cross-lesson-control','valid-control']){
 const s=new Store(),server=createServer(s);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{
  const bad=structuredClone(backup),a=bad.reports[0].value.attempt;
  if(name==='absent')delete a.exerciseId;
  if(name==='null')a.exerciseId=null;
  if(name==='empty')a.exerciseId='';
  if(name==='missing-target-control')a.exerciseId='ex-absent';
  if(name==='cross-lesson-control')a.exerciseId='ex-2-cloze';
  const before=dump(s),beforeChanges=total(s),url='http://127.0.0.1:'+server.address().port;
  const response=await fetch(url+'/api/restore',{method:'POST',headers:{'content-type':'application/json','x-demo-user':'author-demo'},body:JSON.stringify(bad)});
  const body=await response.json(),after=dump(s),restored=s.reports('author-demo')[0];
  const row={case:name,url,status:response.status,body,totalChangesDelta:total(s)-beforeChanges,allTablesEqual:JSON.stringify(before)===JSON.stringify(after),sequenceBefore:before.sqlite_sequence,sequenceAfter:after.sqlite_sequence,restoredReport:restored??null};
  const shouldReject=name!=='valid-control';row.passed=shouldReject?(response.status>=400&&response.status<500&&row.allTablesEqual&&row.totalChangesDelta===0):(response.status===200&&restored?.attempt?.exerciseId==='ex-1-type');results.push(row);
  console.log((row.passed?'PASS ':'FAIL ')+name+' HTTP='+row.status+' totalChangesDelta='+row.totalChangesDelta+' allTablesEqual='+row.allTablesEqual);
  writeFileSync(new URL(process.env.OUT||'probe-results.json',import.meta.url),JSON.stringify({commit:process.env.COMMIT,results},null,2));
 }finally{await new Promise(r=>server.close(r));s.close();}
}
try{assert.ok(results.every(r=>r.passed),'Every malformed reported attempt must be rejected before writes; see saved per-case evidence');}
catch(error){console.error(error.stack);process.exitCode=1;}

