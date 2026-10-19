import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {Store} from '../hebleo-lead/src/store.js';
import {createServer} from '../hebleo-lead/src/server.js';
const commit=process.env.COMMIT_LABEL||'unlabelled',clone=structuredClone;
const source=new Store();
for(const [u,r] of [['learner-demo','report-a'],['learner-core','report-b']]){source.attempt(u,{requestId:'answer-'+u,revisionId:source.get('active'),exerciseId:'ex-1-type',answer:'אני'});source.report(u,{requestId:r,attemptId:'answer-'+u,reason:'unclear',note:'SYNTHETIC '+r});}
const backup=source.backup();source.close();const aKey='report-learner-demo-report-a',bKey='report-learner-core-report-b';
const dump=s=>Object.fromEntries(s.db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(({name})=>[name,s.db.prepare(`SELECT * FROM "${name}" ORDER BY rowid`).all()]));
const writes=s=>s.db.prepare('SELECT total_changes() n').get().n,results=[];
const variants={
 userAbsent:r=>{delete r.value.userId;},userNull:r=>r.value.userId=null,userUnknown:r=>r.value.userId='unknown-user',userOther:r=>r.value.userId='learner-core',
 requestAbsent:r=>{delete r.value.requestId;},requestNull:r=>r.value.requestId=null,requestEmpty:r=>r.value.requestId='',requestOther:r=>r.value.requestId='unbacked-request',
 collision:r=>{r.value.userId='learner-core';r.value.requestId='report-b';},valid:()=>{}
};
for(const [name,mutate] of Object.entries(variants)){
 const s=new Store(),server=createServer(s),row={case:name};await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const req=async(path,input)=>{const res=await fetch(base+'/api/'+path,{method:input===undefined?'GET':'POST',headers:{'content-type':'application/json','x-demo-user':'author-demo'},...(input===undefined?{}:{body:JSON.stringify(input)})});return {status:res.status,body:await res.json()};};
 try{const input=clone(backup);mutate(input.reports.find(r=>r.key===aKey));const before=dump(s),n=writes(s);const restored=await req('restore',input);row.restore=restored;row.totalChangesDelta=writes(s)-n;row.allTablesEqual=JSON.stringify(dump(s))===JSON.stringify(before);row.sequenceBefore=before.sqlite_sequence;row.sequenceAfter=dump(s).sqlite_sequence;
  if(restored.status===200){const listed=await req('reports');const reportA=listed.body.find(r=>r.note==='SYNTHETIC report-a');row.listedReportA=reportA;const rn=writes(s);row.resolve=await req('reports/resolve',{userId:reportA.userId,requestId:reportA.requestId,status:'reviewed'});row.resolveChanges=writes(s)-rn;row.afterResolve={a:s.get(aKey),b:s.get(bKey)};
   if(name==='collision'){assert.equal(row.resolve.status,200);assert.equal(row.afterResolve.a.status,'pending');assert.equal(row.afterResolve.b.status,'reviewed');row.wrongReportModified=true;}
   if(name==='requestOther')assert.equal(row.resolve.status,404);
  }
  row.passed=name==='valid'?(row.restore.status===200&&row.resolve.status===200&&row.afterResolve.a.status==='reviewed'&&row.afterResolve.b.status==='pending'):(row.restore.status===400&&row.totalChangesDelta===0&&row.allTablesEqual);
 }catch(e){row.passed=false;row.harnessError=e.stack;}finally{await new Promise(r=>server.close(r));s.close();}
 results.push(row);writeFileSync(new URL(process.env.OUT||'reviewer-report-envelope-results.json',import.meta.url),JSON.stringify({commit,results},null,2));console.log(`${row.passed?'PASS':'FAIL'} ${name} restore=${row.restore?.status} writes=${row.totalChangesDelta} resolve=${row.resolve?.status} wrongReportModified=${row.wrongReportModified??false}`);
}
if(results.some(r=>!r.passed))process.exitCode=1;
