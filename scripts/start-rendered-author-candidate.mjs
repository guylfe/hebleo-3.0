// Disposable local review only. Never opens/copies/installs the demo database.
import {Store} from '../src/store.js';
import {createServer} from '../src/server.js';
import {replaceFirstTwo} from './install-first2.mjs';
import {readFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const directory=new URL('../tmp/',import.meta.url);mkdirSync(directory,{recursive:true});
const store=new Store(fileURLToPath(new URL('rendered-author-candidate.sqlite',directory)));
if(!store.get('rendered-author-disposable')){
 const pack=JSON.parse(readFileSync(new URL('../content/first2/lessons.json',import.meta.url)));
 // Do not pretend that unimported private media exist in this review fixture.
 for(const lesson of pack.lessons)for(const page of lesson.blocks[0].textPages.pages){if(page.activity)delete page.activity.image;for(const item of page.activity?.items||[])delete item.image;}
 const content=replaceFirstTwo(store.snapshot(),pack).content;
 store.set('active',store.addRevision(content,'Disposable rendered-author candidate; no live content'));
 store.stage({baseRevisionId:store.get('active'),expectedDraftToken:null,content});store.set('rendered-author-disposable',true);
}
const port=Number(process.env.PORT||63471),server=createServer(store);
server.listen(port,'127.0.0.1',()=>console.log('Disposable author candidate http://127.0.0.1:'+port+' PID '+process.pid));
const stop=()=>server.close(()=>{store.close();process.exit(0);});process.on('SIGINT',stop);process.on('SIGTERM',stop);
