// Owner probe (Hebleo Lead Engineer), RR-B2-04: every malformed report envelope / duplicate key, v2 and v1, through real HTTP /api/restore on a fresh synthetic store per case.
// Records status, total_changes delta, all-table equality, and on a 200 how many reports survived (a duplicate key silently drops one).
import {writeFileSync} from 'node:fs';
import {Store} from '../hebleo-lead/src/store.js';
import {createServer} from '../hebleo-lead/src/server.js';
const label=process.env.COMMIT_LABEL||'unlabelled',out=process.env.OUT||'owner-envelope-matrix-results.json';
const src=new Store(),first=src.get('active');
src.attempt('learner-demo',{requestId:'answer-a',revisionId:first,exerciseId:'ex-1-type',answer:'אני'});
src.attempt('learner-core',{requestId:'answer-b',revisionId:first,exerciseId:'ex-1-recognize',answer:'who'});
src.report('learner-demo',{requestId:'report-a',attemptId:'answer-a',reason:'unclear',note:'SYNTHETIC report A'});
src.report('learner-core',{requestId:'report-b',attemptId:'answer-b',reason:'answer',note:'SYNTHETIC report B'});
const v2=src.backup();src.close();
const v1=structuredClone(v2);v1.format='hebleo-demo-backup-v1';v1.sessionSnapshots=[];for(const k of ['revisionSnapshots','activeRevisionId','draft','storeSchemaVersion'])delete v1[k];
const A='report-learner-demo-report-a',B='report-learner-core-report-b',row=(b,key)=>b.reports.find(r=>r.key===key);
const set=(o,k,v)=>{if(v===undefined)delete o[k];else o[k]=v;};
const cases={};
for(const [how,v] of Object.entries({absent:undefined,null:null,empty:'',unknown:'learner-unknown',other:'learner-core'}))cases['userId '+how]=b=>set(row(b,A).value,'userId',v);
for(const [how,v] of Object.entries({absent:undefined,null:null,empty:'',other:'report-elsewhere'}))cases['requestId '+how]=b=>set(row(b,A).value,'requestId',v);
Object.assign(cases,{
 'unknown userId, matching key':b=>{const r=row(b,A);r.key='report-learner-unknown-report-a';r.value.userId='learner-unknown';},
 'reserved requestId, matching key':b=>{const r=row(b,A);r.key='report-learner-demo-constructor';r.value.requestId='constructor';},
 'B identity under A key (collision)':b=>Object.assign(row(b,A).value,{userId:'learner-core',requestId:'report-b'}),
 'key renamed away from identity':b=>{row(b,A).key='report-learner-demo-renamed';},
 'key absent':b=>{delete row(b,A).key;},
 'value absent':b=>{delete row(b,A).value;},
 'A moved onto B key+identity (duplicate key)':b=>{const r=row(b,A);r.key=B;Object.assign(r.value,{userId:'learner-core',requestId:'report-b'});},
 'same report twice (duplicate key)':b=>{b.reports.push(structuredClone(row(b,A)));},
 'valid control':()=>{},
});
const dump=s=>JSON.stringify(Object.fromEntries(s.db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(({name})=>[name,s.db.prepare(`SELECT * FROM "${name}" ORDER BY rowid`).all()])));
const n=s=>s.db.prepare('SELECT total_changes() n').get().n,results=[];
for(const [format,base] of [['v2',v2],['v1',v1]])for(const [name,mutate] of Object.entries(cases)){
 const s=new Store(),server=createServer(s);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const api=(p,body)=>fetch('http://127.0.0.1:'+server.address().port+'/api/'+p,{method:body?'POST':'GET',headers:{'content-type':'application/json','x-demo-user':'author-demo'},...(body?{body:JSON.stringify(body)}:{})});
 const r={format,case:name};
 try{const input=structuredClone(base);mutate(input);r.reportsSubmitted=input.reports.length;const before=dump(s),c=n(s);const res=await api('restore',input);r.status=res.status;r.error=(await res.json()).error;r.totalChangesDelta=n(s)-c;r.allTablesEqual=dump(s)===before;
  if(res.status===200){const listed=await (await api('reports')).json();r.reportsAfter=listed.length;r.listedIdentities=listed.map(x=>x.userId+'/'+x.requestId+' '+x.note);
   const a=listed.find(x=>x.note==='SYNTHETIC report A');if(a){const k=n(s);const rs=await api('reports/resolve',{userId:a.userId,requestId:a.requestId,status:'reviewed'});r.resolveA=rs.status;r.resolveChanges=n(s)-k;r.afterResolve={A:s.get(A)?.status??null,B:s.get(B)?.status??null};}}
  r.passed=name==='valid control'?(r.status===200&&r.reportsAfter===2&&r.resolveA===200&&r.afterResolve.A==='reviewed'&&r.afterResolve.B==='pending'):(r.status===400&&r.totalChangesDelta===0&&r.allTablesEqual);
 }catch(e){r.passed=false;r.harnessError=e.stack;}finally{await new Promise(x=>server.close(x));s.close();}
 results.push(r);console.log(`${r.passed?'PASS':'FAIL'} ${format} ${name}: status=${r.status} delta=${r.totalChangesDelta} tablesEqual=${r.allTablesEqual}${r.reportsAfter!==undefined?` reportsAfter=${r.reportsAfter}/${r.reportsSubmitted}`:''}${r.resolveA!==undefined?` resolveA=${r.resolveA} A=${r.afterResolve.A} B=${r.afterResolve.B}`:''}`);
}
writeFileSync(new URL(out,import.meta.url),JSON.stringify({label,results},null,2));
console.log(`${results.filter(r=>r.passed).length}/${results.length} passed`);if(results.some(r=>!r.passed))process.exitCode=1;
