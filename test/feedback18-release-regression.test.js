import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Store} from '../src/store.js';
import {createServer} from '../src/server.js';
import {projectLesson,deriveLessonIndices} from '../public/course.js';
import {parseVocabularyCSV,defaultColumnMapping,mapVocabularyRows} from '../public/vocabulary-import.js';
const digest=s=>createHash('sha256').update(JSON.stringify(['kv','revisions','learners','events','sqlite_sequence'].map(n=>s.db.prepare('SELECT * FROM '+n+' ORDER BY 1').all()))).digest('hex');
const setup=t=>{const s=new Store();t.after(()=>s.close());return s;};
const publish=(s,c)=>{const base=s.get('active'),d=s.stage({baseRevisionId:base,expectedDraftToken:s.currentDraft()?.draftToken??null,content:c});return s.publish(base,d.draftToken).revisionId;};
const mapped=s=>{const c=s.snapshot(),w=c.words[0],headers=['id','pointed','unpointed','curated','english','tags','source_note'],values=[w.id,w.pointed,w.unpointed,w.curated,w.english,'["release-synthetic"]','SYNTHETIC-PRIVATE-IMPORT-SENTINEL'];const csv=[headers,values].map(r=>r.map(x=>'"'+x.replaceAll('"','""')+'"').join(',')).join('\r\n');return mapVocabularyRows(parseVocabularyCSV(csv),defaultColumnMapping(headers),c).content;};
async function http(t,s){const server=createServer(s);await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));const base='http://127.0.0.1:'+server.address().port;return {get:async route=>(await fetch(base+'/api/'+route)).json(),post:async(route,input)=>{const r=await fetch(base+'/api/'+route,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input)});return {status:r.status,body:await r.json()};}};}
const noImportRecords=wire=>{const visit=value=>{if(!value||typeof value!=='object')return;assert.equal(Object.hasOwn(value,'importSource'),false);for(const child of Object.values(value))visit(child);};visit(wire);};
const position=(revisionId,block,extra={})=>({revisionId,lessonId:'lesson-1',componentId:block.id,step:block.role,question:0,answer:'',selectedTokens:[],matching:{},practiceIds:[],resultRequestId:null,...extra});
const answer=(c,id)=>{const e=c.exercises.find(e=>e.id===id),w=c.words.find(w=>w.id===e.wordId);return e.type==='recognition'?w.english:e.type==='typing'?w.unpointed:e.type==='matching'?Object.fromEntries(e.wordIds.map(id=>[id,c.words.find(w=>w.id===id).english])):e.answers[0];};
function practiceCandidate(s,checkOnly){const c=s.snapshot();c.lessons=c.lessons.map(l=>projectLesson(c,l));if(checkOnly)for(const b of c.lessons[0].blocks)if(b.type==='exercise-set')b.role='check';c.lessons[0]=deriveLessonIndices(c,c.lessons[0]);return c;}

test('RR-F18-01 every HTTP learner word surface excludes import records while author/backup retain source bytes',async t=>{
 const s=setup(t),c=mapped(s),revision=publish(s,c);s.enroll('learner-demo',c.words[0].id);const api=await http(t,s),before=digest(s);
 const bootstrap=await api.get('bootstrap');assert.equal(bootstrap.due.length,1);noImportRecords(bootstrap);noImportRecords(await api.get('session?lessonId=lesson-1'));assert.equal(digest(s),before);
 assert.deepEqual(s.active().content.words[0].importSource,c.words[0].importSource);assert.deepEqual(s.backup().content.words[0].importSource,c.words[0].importSource);
 const d=s.stage({baseRevisionId:revision,expectedDraftToken:null,word:{id:c.words[0].id,notes:'SYNTHETIC AUTHOR EDIT'}}),staged=digest(s);noImportRecords(s.previewSession({lessonId:'lesson-1',draftToken:d.draftToken}));assert.equal(digest(s),staged);assert.deepEqual(s.currentDraft().content.words[0].importSource,c.words[0].importSource);
});

for(const checkOnly of [true,false])test('RR-F18-02 check practice subset/reorder validates actual receipts across HTTP/reload/pinned revision/restore: '+(checkOnly?'check-only':'mixed-role'),async t=>{
 const s=setup(t),c=practiceCandidate(s,checkOnly),block=c.lessons[0].blocks.find(b=>b.type==='exercise-set'),revision=publish(s,c),api=await http(t,s),ids=['ex-1-type',block.selector.ids[0]];
 for(const [question,exerciseId] of ids.entries()){const a=answer(c,exerciseId),requestId='practice-valid-'+question,grade=await api.post('attempt',{revisionId:revision,exerciseId,answer:a,requestId});assert.equal(grade.body.correct,true);const saved=await api.post('progress',position(revision,block,{practiceIds:ids,question,answer:a,resultRequestId:requestId}));assert.equal(saved.status,200);assert.equal((await api.get('session?lessonId=lesson-1')).result.exerciseId,exerciseId);}
 const newer=s.snapshot();newer.lessons[0].blocks.reverse();newer.lessons[0]=deriveLessonIndices(newer,newer.lessons[0]);publish(s,newer);assert.equal(s.session('learner-demo','lesson-1').revisionId,revision);
 const target=setup(t),restored=target.restore(s.backup()),session=target.session('learner-demo','lesson-1');assert.deepEqual(session.progress.practiceIds,ids);assert.equal(session.result.exerciseId,ids[1]);assert.equal(session.revisionId,restored.revisions[revision]);assert.deepEqual(session.progress.question,1);
 const attempts=s.learner('learner-demo').attempts;assert.equal(new Set(attempts.map(a=>a.exerciseId)).size,2);assert.equal(s.learner('learner-demo').completed.includes('lesson-1'),false);
});

test('RR-F18-03 check practice rejects foreign receipts and malformed sets atomically in HTTP and restore',async t=>{
 const s=setup(t),c=practiceCandidate(s,true),block=c.lessons[0].blocks.find(b=>b.type==='exercise-set'),revision=publish(s,c),api=await http(t,s),id=block.selector.ids[0];
 const grade=s.attempt('learner-demo',{revisionId:revision,exerciseId:id,answer:answer(c,id),requestId:'practice-wrong'}),p=position(revision,block,{practiceIds:['ex-1-type'],answer:grade.answer,resultRequestId:grade.requestId}),before=digest(s);
 for(const bad of [p,{...p,practiceIds:['ex-1-type','ex-1-type']},{...p,practiceIds:[c.lessons[1].exerciseIds[0]]}]){assert.equal((await api.post('progress',bad)).status,400);assert.equal(digest(s),before);}
 const backup=s.backup();backup.learners.find(l=>l.id==='learner-demo').state.resumes['lesson-1']=p;const target=setup(t),targetBefore=digest(target);assert.throws(()=>target.restore(backup),/feedback/);assert.equal(digest(target),targetBefore);
 const terminal=position(revision,block,{practiceIds:['ex-1-type'],question:1});s.saveProgress('learner-demo',terminal);const atEnd=digest(s);assert.throws(()=>s.saveProgress('learner-demo',{...terminal,resultRequestId:grade.requestId}));assert.equal(digest(s),atEnd);
});

test('RR-F18-02 check practice matching input and ordering tokens resolve the practice list',t=>{
 const s=setup(t),c=practiceCandidate(s,true),block=c.lessons[0].blocks.find(b=>b.type==='exercise-set'),revision=publish(s,c),matching='ex-1-match';
 s.saveProgress('learner-demo',position(revision,block,{practiceIds:[matching],matching:answer(c,matching)}));assert.deepEqual(s.session('learner-demo','lesson-1').progress.matching,answer(c,matching));
 const before=digest(s);assert.throws(()=>s.saveProgress('learner-demo',position(revision,block,{practiceIds:['ex-1-type'],matching:answer(c,matching)})));assert.equal(digest(s),before);
 const c2=s.snapshot(),l=c2.lessons[1],b=l.blocks.find(b=>b.type==='exercise-set'),order=l.exerciseIds.find(id=>c2.exercises.find(e=>e.id===id).type==='ordering');b.role='check';c2.lessons[1]=deriveLessonIndices(c2,l);const r2=publish(s,c2),p={...position(r2,b),lessonId:l.id,practiceIds:[order],selectedTokens:[0]};s.saveProgress('learner-core',p);assert.deepEqual(s.session('learner-core',l.id).progress.selectedTokens,[0]);const before2=digest(s);assert.throws(()=>s.saveProgress('learner-core',{...p,selectedTokens:[100]}));assert.equal(digest(s),before2);
});

const invalidSources=source=>[
 'SYNTHETIC malformed metadata',null,[],{...source,version:2},{...source,headers:['id']},{...source,headers:[...source.headers.slice(0,-1),'id']},{...source,values:source.values.slice(1)},{...source,values:source.values.map((x,i)=>i?x:12)},{...source,columns:undefined},{...source,columns:source.columns.slice(1)},
 {...source,columns:[...source.columns,source.columns[0]]},{...source,columns:source.columns.map((x,i)=>i?x:{...x,columnIndex:9999})},{...source,columns:source.columns.map((x,i)=>i?x:{...x,target:'importSource'})},{...source,columns:source.columns.map((x,i)=>i?x:{...x,decode:'json'})},{...source,values:source.values.map((x,i)=>i===5?'not JSON':x)},{...source,values:source.values.map((x,i)=>i===5?'{}':x)},{...source,columns:[...source.columns,{columnIndex:6,target:'fieldStyle',field:'pointed',property:'horizontalAlignment',decode:'string'}]},JSON.parse('{"version":1,"__proto__":{"polluted":true}}')
];
test('RR-F18-04 malformed declared source records reject Stage/Publish/restore with every table unchanged',t=>{
 const s=setup(t),good=mapped(s),source=good.words[0].importSource,before=digest(s);
 for(const bad of invalidSources(source)){const c=structuredClone(good);c.words[0].importSource=bad;assert.throws(()=>s.stage({baseRevisionId:s.get('active'),expectedDraftToken:null,content:c}));assert.equal(digest(s),before);}
 const base=s.get('active'),d=s.stage({baseRevisionId:base,expectedDraftToken:null,content:good}),backup=s.backup(),target=setup(t);
 for(const mutate of [b=>b.content.words[0].importSource='bad',b=>b.draft.content.words[0].importSource='bad',b=>b.revisionSnapshots[0].content.words[0].importSource='bad']){const bad=structuredClone(backup);mutate(bad);const h=digest(target);assert.throws(()=>target.restore(bad));assert.equal(digest(target),h);}
 // Simulates corrupt persisted WIP; Publish must validate before creating a revision.
 const badDraft=s.get('draft');badDraft.content.words[0].importSource='bad';s.set('draft',badDraft);const corrupt=s.currentDraft(),h=digest(s);assert.throws(()=>s.publish(base,corrupt.draftToken));assert.equal(digest(s),h);assert.equal(s.get('active'),base);
});
test('RR-F18-04 mapped source survives same-token Stage, later authored edits, publish and restore without repair',t=>{
 const s=setup(t),good=mapped(s),base=s.get('active'),d=s.stage({baseRevisionId:base,expectedDraftToken:null,content:good}),h=digest(s);assert.equal(s.stage({baseRevisionId:base,expectedDraftToken:d.draftToken,content:good}).unchanged,true);assert.equal(digest(s),h);
 const edit=s.stage({baseRevisionId:base,expectedDraftToken:d.draftToken,word:{id:good.words[0].id,notes:'SYNTHETIC EDIT AFTER IMPORT'}});s.publish(base,edit.draftToken);const target=setup(t);target.restore(s.backup());assert.deepEqual(target.snapshot().words[0].importSource,good.words[0].importSource);assert.deepEqual(target.snapshot().words[0].sourceFields,good.words[0].sourceFields);
});

for(const step of ['check','apply'])test('RR-F18-02 legacy '+step+' practice uses its validated subset for receipts and terminal position',t=>{
 const s=setup(t),c=s.snapshot(),revision=s.get('active'),id=step==='check'?'ex-1-type':'ex-1-recognize',grade=s.attempt('learner-demo',{revisionId:revision,exerciseId:id,answer:answer(c,id),requestId:'legacy-practice'}),p={...position(revision,{id:null,role:step}),answer:typeof grade.answer==='string'?grade.answer:'',resultRequestId:grade.requestId,practiceIds:[id]};delete p.componentId;
 s.saveProgress('learner-demo',p);assert.equal(s.session('learner-demo','lesson-1').result.exerciseId,id);const target=setup(t);target.restore(s.backup());assert.equal(target.session('learner-demo','lesson-1').result.exerciseId,id);
 const other=step==='check'?'ex-1-recognize':'ex-1-type',foreign=s.attempt('learner-demo',{revisionId:revision,exerciseId:other,answer:answer(c,other),requestId:'legacy-other'}),before=digest(s);for(const bad of [{...p,resultRequestId:foreign.requestId},{...p,question:1},{...p,question:2,answer:'',resultRequestId:null}]){assert.throws(()=>s.saveProgress('learner-demo',bad));assert.equal(digest(s),before);}
 s.saveProgress('learner-demo',{...p,question:1,answer:'',resultRequestId:null});assert.equal(s.session('learner-demo','lesson-1').progress.question,1);
});
