// Owner-only synthetic integration fixture. In-memory database, loopback, bounded hash evidence.
import {Store} from '../../../src/store.js';
import {createServer} from '../../../src/server.js';
import {projectLesson,deriveLessonIndices} from '../../../public/course.js';
import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const store=new Store(),c=store.snapshot(),word=c.words[0];
c.words.push(...Array.from({length:2000-c.words.length},(_,i)=>({...structuredClone(word),id:'synthetic-owner-'+i,tags:['synthetic-owner',i%2?'odd':'even']})));
c.words[0].tags=['synthetic-owner','first'];
c.lessons=c.lessons.map(l=>projectLesson(c,l));const l=c.lessons[0];l.blocks[0].text='SYNTHETIC FIRST INSTANCE\n\n'+l.blocks[0].text;
l.blocks.splice(1,0,{id:'synthetic-owner-text-two',type:'explanation',source:'inline',renderer:'text',text:'SYNTHETIC SECOND INSTANCE\n\n'+c.lessons[1].explanation,options:{textDirection:'rtl'}});c.lessons[0]=deriveLessonIndices(c,l);
c.curriculum={version:1,chapters:[{id:'synthetic-owner-ch',title:'Synthetic ordered chapter',lessonIds:['lesson-2']}],order:[{lessonId:'lesson-1'},{chapterId:'synthetic-owner-ch'},{lessonId:'lesson-3'}]};
const staged=store.stage({baseRevisionId:1,expectedDraftToken:null,content:c});store.publish(1,staged.draftToken);store.stage({baseRevisionId:2,expectedDraftToken:null,content:c});
const server=createServer(store),published=hash(store.snapshot()),captures=[];
const capture=label=>{const tables=store.db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(({name})=>{const rows=store.db.prepare('SELECT * FROM '+name+' ORDER BY rowid').all();return {name,rowCount:rows.length,sha256:hash(rows)};});const summary={label,capturedUTC:new Date().toISOString(),tables,publishedUnchanged:hash(store.snapshot())===published};captures.push(summary);writeFileSync(new URL('./browser-captures.json',import.meta.url),JSON.stringify({syntheticFixture:true,captures},null,2));return summary;};
process.on('message',m=>{if(m?.action==='capture')process.send?.({captured:capture(m.label)});if(m?.action==='stop')server.close(()=>{store.close();process.exit(0);});});
server.listen(57418,'127.0.0.1',()=>console.log('OWNER_FIXTURE_READY 57418'));
process.on('SIGTERM',()=>server.close(()=>{store.close();process.exit(0);}));
