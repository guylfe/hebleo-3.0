// Owner-only fixture: ephemeral loopback port, in-memory fictional database.
// No protected runtime, persisted learner data or application route changes.
import {createServer as httpServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {Store} from '../../src/store.js';
import {createServer} from '../../src/server.js';
import {seed} from '../../src/seed.js';
const store=new Store(),app=createServer(store),content=structuredClone(seed);
content.exercises[1].requireNikkud=true;content.exercises[1].sourceSentinel={status:'synthetic-owner-fixture'};
const words=Array.from({length:2000},(_,i)=>({...structuredClone(seed.words[i%seed.words.length]),id:`synthetic-ui-${i}`,tags:[`fixture-tag-${i%4}`]}));
const lessons=content.lessons.map((l,i)=>({...l,wordIds:words.filter((w,n)=>n%3===i).map(w=>w.id)}));
const fingerprint=()=>createHash('sha256').update(JSON.stringify(store.db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(({name})=>[name,store.db.prepare(`SELECT * FROM "${name}" ORDER BY rowid`).all()]))).digest('hex');
const initial=fingerprint();
const files={'/feature-ui':'feedback18-ui.html','/fixture.js':'feedback18-ui.js','/fixture.css':'feedback18-ui.css'};
const assets=['markdown-editor.js','vocabulary-browser.js','vendor/easymde.min.js','vendor/easymde.min.css'];
const receipts=[];
const server=httpServer(async(req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname,before=fingerprint();
  res.on('finish',()=>receipts.push({method:req.method,path,status:res.statusCode,before,after:fingerprint()}));
  if(path==='/fixture-receipts'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({initial,current:fingerprint(),receipts}));return;}
  if(path==='/fixture-content'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({content,words,lessons}));return;}
  const asset=assets.find(x=>path==='/studio/'+x),fixture=files[path];
  if(asset||fixture){try{const file=asset?new URL('../../public/studio/'+asset,import.meta.url):new URL(fixture,import.meta.url);res.setHeader('Content-Type',path.endsWith('.css')?'text/css':path.endsWith('.js')?'text/javascript':'text/html');res.end(await readFile(file));}catch{res.writeHead(404);res.end('Missing fixture asset');}return;}
  app.emit('request',req,res);
});
server.listen(0,'127.0.0.1',()=>console.log(JSON.stringify({url:`http://127.0.0.1:${server.address().port}/feature-ui`,pid:process.pid,root:fileURLToPath(new URL('../../',import.meta.url)),initial})));
const stop=()=>server.close(()=>{store.close();process.exit(0);});
process.on('SIGINT',stop);process.on('SIGTERM',stop);
