// Fictional-only in-memory Browser fixture. No user database, seed file or protected runtime.
import {Store} from '../../../src/store.js';
import {createServer} from '../../../src/server.js';
import {projectLesson,deriveLessonIndices} from '../../../public/course.js';
import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const store=new Store(),content=structuredClone(store.snapshot()),word=structuredClone(content.words[0]);
content.words.push(...Array.from({length:2000-content.words.length},(_,i)=>({...structuredClone(word),id:'synthetic-browser-'+i,tags:['browser-fixture',i%2?'odd':'even']})));
const lesson=projectLesson(content,content.lessons[0]);lesson.blocks.push({id:'synthetic-browser-second-text',type:'explanation',source:'inline',renderer:'text',text:content.lessons[0].explanation,sourceLocator:{fixture:'second-instance'},options:{textDirection:'rtl'}});content.lessons[0]=deriveLessonIndices(content,lesson);
store.stage({baseRevisionId:1,expectedDraftToken:null,content});
const server=createServer(store),fingerprint=()=>store.db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(({name})=>{const rows=store.db.prepare('SELECT * FROM '+name+' ORDER BY rowid').all();return {name,rowCount:rows.length,sha256:hash(rows)};});
const learners=hash(store.backup().learners),published=hash(store.snapshot());
let prior=null;const captures=[];
const capture=label=>{const tables=fingerprint();const summary={label,capturedUTC:new Date().toISOString(),tables,zeroWritesSincePreviousCapture:prior?JSON.stringify(tables)===JSON.stringify(prior):null,learnersUnchanged:hash(store.backup().learners)===learners,publishedUnchanged:hash(store.snapshot())===published};prior=tables;captures.push(summary);writeFileSync(new URL('./browser-recovery-captures.json',import.meta.url),JSON.stringify({syntheticFixture:true,fixture:'Fictional-only in-memory seed and synthetic 2000-word Browser fixture',captures},null,2));return summary;};capture('fixture-start');
// Local IPC supports bounded capture/conflict/stop only; no HTTP control endpoints or raw table dumps.
process.on('message',message=>{if(message?.action==='capture'){process.send?.({captured:capture(message.label)});}if(message?.action==='conflict'){const c=structuredClone(store.currentDraft().content);c.lessons[0].title='Synthetic conflict from second author';store.stage({baseRevisionId:1,expectedDraftToken:store.currentDraft().draftToken,content:c});process.send?.({conflict:capture(message.label||'synthetic-conflict')});}if(message?.action==='stop'){server.close(()=>{store.close();process.exit(0);});}});
server.listen(57318,'127.0.0.1',()=>console.log('FICTIONAL_BROWSER_READY 57318'));
process.on('SIGTERM',()=>server.close(()=>{store.close();process.exit(0);}));
