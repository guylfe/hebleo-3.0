import fs from 'node:fs';
import path from 'node:path';
import {Store} from '../src/store.js';
import {createServer,prepareDemoProgress} from '../src/server.js';
import {adaptConsolidatedWorkbook} from '../src/lexical-adapter.js';
import {lexicalFixture} from './lexical-fixture.mjs';
const args=process.argv.slice(2),option=name=>args[args.indexOf(name)+1],port=Number(args.includes('--port')?option('--port'):63358);
if(!args.includes('--capture'))throw new Error('Supply --capture <private consolidated capture.json>.');
const capture=JSON.parse(fs.readFileSync(option('--capture'),'utf8')),adapted=adaptConsolidatedWorkbook(capture);
fs.mkdirSync('data',{recursive:true});
const db=path.resolve('data/lexical-private-demo.sqlite'),store=new Store(db);
if(!store.get('lexical-demo-initialized')){
 const active=store.snapshot();active.lexical=lexicalFixture();
 const revision=store.addRevision(active,'NONLINGUISTIC SYNTHETIC lexical UI fixture; no source approval');store.set('active',revision);
 const candidate=structuredClone(active);
 for(const collection of ['words','classes','introductions','unlocks','aliases','usages','examples'])candidate.lexical[collection].push(...adapted.lexical[collection]);
 for(const [key,value]of Object.entries(adapted.lexical))if(!['version','sourceSchemaVersion','words','classes','introductions','unlocks','aliases','usages','examples'].includes(key))candidate.lexical[key]=value;
 store.stage({baseRevisionId:revision,expectedDraftToken:null,content:candidate});store.set('lexical-demo-initialized',adapted.preview.captureDigest);
}
if(store.get('lexical-demo-initialized')!==adapted.preview.captureDigest)throw new Error('A different capture needs explicit reconciliation; existing demo retained.');
const reset=await prepareDemoProgress(store,{enabled:true});
const server=createServer(store,{mediaRoot:path.resolve('tmp/lexical-demo-media')});
server.listen(port,'127.0.0.1',()=>console.log(JSON.stringify({url:'http://127.0.0.1:'+port+'/',pid:process.pid,database:db,capture:adapted.preview,draftToken:store.currentDraft().draftToken,syntheticFixtureWords:3,realSourceLearnerWords:0,freshFictionalProgress:reset},null,2)));
for(const event of ['SIGINT','SIGTERM'])process.on(event,()=>server.close(()=>{store.close();process.exit(0);}));
