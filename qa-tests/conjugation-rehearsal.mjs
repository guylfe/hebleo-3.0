// Disposable integrated UI rehearsal. Always in-memory, explicitly synthetic.
// No installed DB path, credentials, network service or production fixture flag.
import {Store} from '../src/store.js';
import {createServer} from '../src/server.js';
import {fixture} from '../adapters/wordpress/conjugation/rehearsal/fixture.js';
const store=new Store(':memory:',{conjugationTestCatalog:fixture});
const server=createServer(store),handler=server.listeners('request')[0];
server.removeListener('request',handler);
server.on('request',(req,res)=>{
  if(req.method==='GET'&&req.url==='/__rehearsal_phone'){
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
    return res.end('<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Synthetic native phone rehearsal</title><p>SYNTHETIC IN-MEMORY REHEARSAL — 360px actual application viewport.</p><iframe title="Synthetic native app at 360px" src="/#conjugation" style="width:360px;height:740px;border:1px solid #ccc"></iframe></html>');
  }
  // Same-origin embedding is allowed only in this disposable fixture process.
  const writeHead=res.writeHead;
  res.writeHead=function(status,headers){
    if(headers?.['Content-Security-Policy'])headers={...headers,'Content-Security-Policy':headers['Content-Security-Policy'].replace("frame-ancestors 'none'","frame-ancestors 'self'")};
    return writeHead.call(this,status,headers);
  };
  return handler(req,res);
});
server.listen(63491,'127.0.0.1',()=>console.log('SYNTHETIC in-memory native rehearsal http://127.0.0.1:63491/#conjugation; phone /__rehearsal_phone; PID '+process.pid));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>{store.close();process.exit(0);}));
