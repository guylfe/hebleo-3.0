// Separate local visual-review database; no existing candidate/source is modified.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {Store} from '../src/store.js';
import {createServer,prepareDemoProgress} from '../src/server.js';
const lex=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const fixtureHash=createHash('sha256').update(JSON.stringify(lex)).digest('hex');
fs.mkdirSync('data',{recursive:true});
const store=new Store(path.resolve('data/vocabulary-visual-preview.sqlite'));
if(store.get('source-backed-visual-preview')!==fixtureHash){
 const content=store.snapshot();content.lexical=lex;
 const revision=store.addRevision(content,'Private visual fixture: exact approved-prototype examples; demonstration lesson unlocks only');
 store.set('active',revision);store.set('source-backed-visual-preview',fixtureHash);
}
await prepareDemoProgress(store,{enabled:true});
const server=createServer(store,{mediaRoot:path.resolve('tmp/visual-media')});
server.listen(63359,'127.0.0.1',()=>console.log('Corrected application preview http://127.0.0.1:63359/#lesson/lesson-2/vocabulary'));
for(const event of ['SIGINT','SIGTERM'])process.on(event,()=>server.close(()=>{store.close();process.exit(0);}));
