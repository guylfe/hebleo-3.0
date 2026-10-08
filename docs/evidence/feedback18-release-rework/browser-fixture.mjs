// Disposable synthetic in-memory owner fixture; no learner rows are exported.
import {Store} from '../../../src/store.js';
import {createServer} from '../../../src/server.js';
import {projectLesson,deriveLessonIndices} from '../../../public/course.js';
import {parseVocabularyCSV,defaultColumnMapping,mapVocabularyRows} from '../../../public/vocabulary-import.js';
import {createHash} from 'node:crypto';
const s=new Store(),c=s.snapshot(),w=c.words[0],headers=['id','pointed','unpointed','curated','english','source_note'],values=[...headers.slice(0,5).map(k=>w[k]),'SYNTHETIC PRIVATE SOURCE'];
const csv=[headers,values].map(r=>r.map(x=>'"'+x.replaceAll('"','""')+'"').join(',')).join('\r\n'),pack=mapVocabularyRows(parseVocabularyCSV(csv),defaultColumnMapping(headers),c).content;
pack.lessons=pack.lessons.map(l=>projectLesson(pack,l));for(const b of pack.lessons[0].blocks)if(b.type==='exercise-set')b.role='check';pack.lessons[0]=deriveLessonIndices(pack,pack.lessons[0]);const d=s.stage({baseRevisionId:1,expectedDraftToken:null,content:pack}),revision=s.publish(1,d.draftToken).revisionId;
s.attempt('learner-demo',{requestId:'synthetic-miss',revisionId:revision,exerciseId:'ex-1-type',answer:'SYNTHETIC wrong'});s.enroll('learner-demo',w.id);
const server=createServer(s),handler=server.listeners('request')[0];server.removeListener('request',handler);server.on('request',(req,res)=>{if(req.url==='/__fixture/state'){const tables=Object.fromEntries(['kv','revisions','learners','events','sqlite_sequence'].map(n=>{const rows=s.db.prepare('SELECT * FROM '+n+' ORDER BY 1').all();return [n,{count:rows.length,hash:createHash('sha256').update(JSON.stringify(rows)).digest('hex')}];}));const session=s.session('learner-demo','lesson-1');res.setHeader('Content-Type','application/json');res.end(JSON.stringify({synthetic:true,tables,practice:{kind:session.progress?.step,componentId:session.progress?.componentId,ids:session.progress?.practiceIds,receiptExerciseId:session.result?.exerciseId,correct:session.result?.correct},authorSourceRetained:JSON.stringify(s.snapshot().words[0].importSource)===JSON.stringify(pack.words[0].importSource)}));return;}handler(req,res);});
server.listen(0,'127.0.0.1',()=>console.log(JSON.stringify({synthetic:true,url:'http://127.0.0.1:'+server.address().port,revision})));
