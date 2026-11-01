// Disposable HTTP/owner Save benchmark. Never opens the input with Store.
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {Store} from '../src/store.js';
import {createServer} from '../src/server.js';
import {createStudioWorkspace} from '../public/studio/workspace.js';
const [source,label='before',mode='default']=process.argv.slice(2);
if(!source)throw new Error('Supply a read-only source SQLite path. Output stays in ignored tmp/.');
mkdirSync('tmp',{recursive:true});
const hash=value=>createHash('sha256').update(value).digest('hex');
function receipt(db){
 const result={};db.exec('BEGIN');try{for(const {name} of db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all()){
  const rows=db.prepare('SELECT * FROM "'+name.replaceAll('"','""')+'"').all().map(row=>JSON.stringify(row,(_k,v)=>typeof v==='bigint'?String(v):v)).sort();
  result[name]={rows:rows.length,hash:hash(rows.join('\n'))};
 }return result;}finally{db.exec('ROLLBACK');}
}
const input=new DatabaseSync(resolve(source),{readOnly:true}),before=receipt(input),path=resolve('tmp/save-'+label+'-'+Date.now()+'.sqlite');
input.exec("VACUUM INTO '"+path.replaceAll("'","''")+"'");input.close();
const s=new Store(path),server=createServer(s),initial=s.currentDraft(),original=JSON.stringify(initial.content),active=JSON.stringify(s.snapshot());
const phases={},methods={};
for(const key of ['stage','preview','workspaceImpact','currentDraft','expectDraft','snapshot']){const fn=s[key];s[key]=function(...args){const start=performance.now();try{return fn.apply(this,args);}finally{const item=methods[key]||={calls:0,ms:0};item.calls++;item.ms+=performance.now()-start;}};}
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
async function request(path,body,minimal=false){const start=performance.now(),wire=body===undefined?undefined:JSON.stringify(body);phases[path+':serialize']=(phases[path+':serialize']||0)+performance.now()-start;
 const t=performance.now(),res=await fetch(origin+'/api/'+path,{method:wire?'POST':'GET',headers:{'x-demo-user':'author-demo','content-type':'application/json',...(minimal?{Prefer:'return=minimal'}:{})},body:wire}),raw=await res.text(),value=JSON.parse(raw);
 phases[path+':httpParse']=(phases[path+':httpParse']||0)+performance.now()-t;if(!res.ok)throw new Error(res.status+' '+value.code);return value;}
const w=createStudioWorkspace({content:initial.content,publishedContent:s.snapshot(),baseRevisionId:initial.baseRevisionId,expectedDraftToken:initial.draftToken,
 ...(mode==='default'?{getWorkspaceImpact:body=>request('studio/impact',body)}:{}),
 saveDraft:async body=>{const result=await request('studio/draft',body,mode==='minimal');if(mode==='default')await request('studio');return result;}});
const next=w.getContent();next.lessons[0].title+='X';w.replace(next);const start=performance.now();
try{await w.save();const totalMs=performance.now()-start,readback=s.currentDraft();
 const expected=JSON.parse(original);expected.lessons[0].title+='X';
 if(JSON.stringify(readback.content)!==JSON.stringify(expected)||JSON.stringify(s.snapshot())!==active||w.dirty)throw new Error('Full content/active/owner preservation failed');
 const live=new DatabaseSync(resolve(source),{readOnly:true}),after=receipt(live);live.close();if(JSON.stringify(before)!==JSON.stringify(after))throw new Error('Source receipt changed');
 const output={label,mode,lessonCount:readback.content.lessons.length,contentBytes:Buffer.byteLength(original),totalMs,phases,methods,exactFullDraftReadback:true,activeUnchanged:true,sourceReceiptBefore:before,sourceReceiptAfter:after,sourceUnchanged:true};
 writeFileSync('tmp/save-'+label+'.json',JSON.stringify(output,null,2));console.log(JSON.stringify(output,null,2));
}finally{await new Promise(r=>server.close(r));s.close();}
