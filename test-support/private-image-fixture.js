import {Store} from '../src/store.js';
import {createServer} from '../src/server.js';
import {randomUUID} from 'node:crypto';
export const author='author-demo';
// One synthetic 1x1 PNG. This has no source, teaching or user-image authority.
export const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=','base64');
export const imageInput=(extra={})=>({operationId:'synthetic-import-'+randomUUID(),assetId:'synthetic-image',title:'SYNTHETIC private-image test',kind:'image',mimeType:'image/png',dataBase64:png.toString('base64'),provenance:{kind:'synthetic-demo',label:'SYNTHETIC 1x1 disposable PNG'},...extra});
export const approveInput=(pin,extra={})=>({operationId:'synthetic-private-'+randomUUID(),...Object.fromEntries(['assetId','revisionId','sha256','url','mimeType','byteLength'].map(key=>[key,pin[key]])),expectedCurrentRevisionId:pin.revisionId,...extra});
export const fingerprint=store=>({rows:store.db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(({name})=>[name,store.db.prepare('SELECT * FROM "'+name+'" ORDER BY rowid').all()]),writes:store.db.prepare('SELECT total_changes() AS n').get().n});
export async function mediaHTTP(t,store=new Store(':memory:')){
 const server=createServer(store,{mediaRoot:null});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));store.close();});
 const origin='http://127.0.0.1:'+server.address().port;
 const request=async(path,body,{actor=author,headers={},raw}={})=>{const res=await fetch(origin+'/api/'+path,{method:body===undefined&&raw===undefined?'GET':'POST',headers:{...(actor?{'x-demo-user':actor}:{}),'content-type':'application/json',...headers},...(body===undefined&&raw===undefined?{}:{body:raw??JSON.stringify(body)})});return {status:res.status,body:await res.json()};};
 const api=async(path,body)=>{const result=await request(path,body);if(result.status!==200)throw Object.assign(Error(result.body.error),{code:result.body.code,status:result.status});return result.body;};
 return {store,server,origin,request,api};
}
export async function idle(host){for(let i=0;i<400;i++){if(host.querySelector('form')?.getAttribute('aria-busy')!=='true')return;await new Promise(resolve=>setTimeout(resolve,5));}throw Error('Image chooser did not settle');}
