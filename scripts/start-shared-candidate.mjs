import {appendFileSync,mkdirSync} from 'node:fs';
import {Store} from '../src/store.js';
import {createServer} from '../src/server.js';
import {resolve} from 'node:path';
const database=resolve(import.meta.dirname,'../data/shared-candidate.db');
const store=new Store(database);
const server=createServer(store);
mkdirSync(resolve(import.meta.dirname,'../tmp'),{recursive:true});
server.on('request',(req,res)=>{if(/^\/shared-media\/[^/]+\/[^/]+\.mp3$/.test(req.url.split('?')[0]))res.on('finish',()=>appendFileSync(resolve(import.meta.dirname,'../tmp/shared-browser-media.jsonl'),JSON.stringify({file:req.url.split('/').at(-1),status:res.statusCode,range:req.headers.range||null})+'\n'));});
server.listen(63592,'127.0.0.1',()=>console.log('Shared-card isolated candidate http://127.0.0.1:63592'));
function stop(){server.close(()=>{store.close();process.exit(0);});}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
