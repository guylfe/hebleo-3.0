// Disposable engineering fixture: never opens the installed demo database.
import {Store,validateContent} from '../src/store.js';
import {createServer} from '../src/server.js';
import {projectCurriculum} from '../public/course.js';
import {readFileSync} from 'node:fs';
const store=new Store();
const pack=JSON.parse(readFileSync(new URL('../docs/curriculum/first20-20261025/content.json',import.meta.url)));
store.importTextDraft({baseRevisionId:store.get('active'),expectedDraftToken:null,pack});
const content=store.snapshot();
const pages=[{id:'dock.read',type:'reading',title:'SYNTHETIC layout verification',html:'<p>Disposable engineering fixture. No approved curriculum or learner records are changed.</p>',gate:'none'},{id:'dock.recall',type:'recall',title:'SYNTHETIC commitment gate',prompt:'Enter a sample before revealing the engineering model.',answer:'<p>Engineering model only.</p>',grading:'self-check',gate:'reveal'}];
const fixture={id:'dock-test-only',title:'SYNTHETIC dock clearance',chapter:'SYNTHETIC engineering fixture',minutes:1,compositionVersion:2,introducedLetters:'',wordIds:[],exerciseIds:[],checkExerciseIds:[],blocks:[{id:'dock-text',type:'explanation',source:'inline',renderer:'text',text:'',textPages:{version:1,pages,order:pages.map(p=>p.id)}}]};
content.lessons.push(fixture);content.curriculum=projectCurriculum(content);validateContent(content);
const revisionId=store.addRevision(content,'SYNTHETIC disposable geometry fixture');store.set('active',revisionId);
const draft=store.currentDraft();draft.content.lessons.push(structuredClone(fixture));draft.content.curriculum=projectCurriculum(draft.content);store.set('draft',draft);
if(store.currentDraft().content.lessons.filter(l=>l.draftImport).length!==20)throw Error('Expected 20 unpublished drafts');
const server=createServer(store);
server.listen(63891,'127.0.0.1',()=>console.log('Disposable in-memory fixture http://127.0.0.1:63891/#lesson/dock-test-only; 20 drafts unpublished'));
for(const event of ['SIGINT','SIGTERM'])process.on(event,()=>server.close(()=>{store.close();process.exit(0);}));
