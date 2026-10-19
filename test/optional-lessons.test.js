import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Store,validateContent} from '../src/store.js';
import {createServer} from '../src/server.js';
import {projectLesson,deriveLessonIndices,lessonFlow} from '../public/course.js';
const U='learner-demo',A='author-demo',setup=t=>{const s=new Store();t.after(()=>s.close());return s;};
const rows=s=>JSON.stringify(Object.fromEntries(['kv','learners','revisions','events','sqlite_sequence'].map(t=>[t,s.db.prepare('SELECT * FROM '+t+' ORDER BY 1').all()])));
function pack(s,shape){const c=s.snapshot();c.lessons=c.lessons.map(l=>projectLesson(c,l));const l=c.lessons[1],text=l.blocks.find(b=>b.type==='explanation'),vocab=l.blocks.find(b=>b.type==='vocabulary');
 const set={id:'synthetic-cloze',type:'exercise-set',source:'exercises',renderer:'practice',role:'apply',selector:{mode:'ids',ids:['ex-2-cloze']}};
 if(shape==='vocabulary-only')l.blocks=[vocab];else{l.wordIds=[];if(shape==='text-only')l.blocks=[text];if(shape==='video-only')l.blocks=[{...text,text:'',video:'https://example.invalid/synthetic-video.mp4'}];if(shape==='exercise-only')l.blocks=[set];if(shape==='interleaved-no-vocabulary')l.blocks=[text,{...set,role:'check'},{...text,id:'synthetic-repeat-text'},{...set,id:'synthetic-repeat-exercise'}];}
 c.lessons=c.lessons.map(l=>deriveLessonIndices(c,l));return c;
}
function position(s,lid,rev,block,step){return {lessonId:lid,revisionId:rev,componentId:block,step,question:0,answer:'',selectedTokens:[],matching:{},practiceIds:[],resultRequestId:null};}
async function http(t,s){const server=createServer(s);await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));return async(path,user,body)=>{const r=await fetch('http://127.0.0.1:'+server.address().port+'/api/'+path,{method:body?'POST':'GET',headers:{'content-type':'application/json','x-demo-user':user},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,body:await r.json()};};}
for(const shape of ['text-only','video-only','vocabulary-only','exercise-only','interleaved-no-vocabulary'])test('optional portions: '+shape+' stage, preview, publish, session and pinned restore use exact existing identities',async t=>{
 const s=setup(t),c=pack(s,shape),l=c.lessons[1],post=await http(t,s),before=rows(s);validateContent(c);const impact=await post('studio/impact',A,{content:c,baseRevisionId:1,expectedDraftToken:null});assert.equal(impact.status,200);assert.equal(rows(s),before);
 const draft=await post('studio/draft',A,{content:c,baseRevisionId:1,expectedDraftToken:null,reviewedDraftToken:impact.body.candidateDraftToken});assert.equal(draft.status,200);const stored=rows(s),preview=await post('studio/preview/session',A,{draftToken:draft.body.draftToken,lessonId:l.id});assert.equal(preview.status,200);assert.deepEqual(preview.body.flow.map(x=>x.key),lessonFlow(c,l).map(x=>x.key));assert.equal(rows(s),stored);
 const published=await post('studio/publish',A,{baseRevisionId:1,draftToken:draft.body.draftToken});assert.equal(published.status,200);const rev=published.body.revisionId,session=await post('session?lessonId='+l.id,U);assert.equal(session.status,200);assert.deepEqual(session.body.content.lessons[1].exerciseIds,l.exerciseIds);assert.ok(!s.learner(U).completed.includes(l.id));
 const first=session.body.flow[0];assert.equal((await post('progress',U,position(s,l.id,rev,first.blockId,first.kind))).status,200);assert.ok(!s.learner(U).completed.includes(l.id));
 assert.equal((await post('progress',U,position(s,l.id,rev,null,'complete'))).status,200);assert.equal(s.learner(U).completed.includes(l.id),!l.exerciseIds.length);
 if(l.exerciseIds.length){assert.equal((await post('attempt',U,{requestId:'synthetic-optional-grade',revisionId:rev,lessonId:l.id,exerciseId:'ex-2-cloze',answer:c.exercises.find(e=>e.id==='ex-2-cloze').answers[0]})).status,200);assert.ok(s.learner(U).completed.includes(l.id));}
 const d=setup(t),r=d.restore(s.backup());assert.equal(d.session(U,l.id).revisionId,r.revisions[rev]);assert.ok(d.learner(U).completed.includes(l.id));assert.deepEqual(d.snapshot().lessons[1].blocks,l.blocks);assert.equal(d.learner(U).attempts.length,l.exerciseIds.length?1:0);
});
test('text-only course permits empty registries while retaining one valid authored lesson and exact source data',t=>{
 const s=setup(t),c=pack(s,'text-only');c.lessons=[c.lessons[1]];c.words=[];c.exercises=[];delete c.curriculum;const exact=JSON.stringify(c);validateContent(c);assert.equal(JSON.stringify(c),exact);
 const draft=s.stage({content:c,baseRevisionId:1,expectedDraftToken:null}),rev=s.publish(1,draft.draftToken).revisionId;const first=s.session(U,c.lessons[0].id);assert.deepEqual(first.content.words,[]);assert.deepEqual(first.content.exercises,[]);assert.equal(first.flow.length,2);assert.equal(s.practice(U,{revisionId:rev,lessonId:c.lessons[0].id}).exerciseIds.length,0);
 s.saveProgress(U,position(s,c.lessons[0].id,rev,null,'complete'));assert.ok(s.learner(U).completed.includes(c.lessons[0].id));assert.deepEqual(s.learner(U).cards,{});assert.equal(s.learner(U).attempts.length,0);
 const d=setup(t);d.restore(s.backup());assert.deepEqual(d.snapshot(),c);assert.equal(d.bootstrap(U).content.words.length,0);
});
test('no-question Finish preserves existing schedules, skips noCard words and still enforces purchased access',async t=>{
 const s=setup(t),c=pack(s,'vocabulary-only');c.words.find(w=>w.id==='w-babayit').noCard=true;s.enroll(U,'w-ani');const card=structuredClone(s.learner(U).cards['w-ani']);
 const draft=s.stage({content:c,baseRevisionId:1,expectedDraftToken:null}),rev=s.publish(1,draft.draftToken).revisionId;s.saveProgress(U,position(s,'lesson-2',rev,null,'complete'));assert.deepEqual(s.learner(U).cards['w-ani'],card);assert.equal(s.learner(U).cards['w-babayit'],undefined);assert.ok(s.learner(U).cards['w-bayit']);
 s.entitlement('learner-core',{eventId:'synthetic-optional-refund',type:'course_refunded'});const before=rows(s),post=await http(t,s);assert.equal((await post('progress','learner-core',position(s,'lesson-2',rev,null,'complete'))).status,403);assert.equal(rows(s),before);
});
test('empty optional indices do not permit stale, forged, duplicate or missing references; rejected stage/restore writes nothing',t=>{
 const s=setup(t),valid=pack(s,'text-only');for(const mutate of [c=>c.lessons[1].exerciseIds=['ex-2-cloze'],c=>c.lessons[1].wordIds=['synthetic-missing'],c=>c.lessons[1].blocks.push({id:'synthetic-empty-exercises',type:'exercise-set',source:'exercises',renderer:'practice',role:'apply',selector:{mode:'ids',ids:[]}}),c=>c.lessons=[],c=>c.lessons[1].blocks=[]]){const c=structuredClone(valid);mutate(c);const before=rows(s);assert.throws(()=>s.stage({content:c,baseRevisionId:1,expectedDraftToken:null}));assert.equal(rows(s),before);}
 const draft=s.stage({content:valid,baseRevisionId:1,expectedDraftToken:null}),rev=s.publish(1,draft.draftToken).revisionId;const old=rows(s);assert.throws(()=>s.saveProgress(U,{...position(s,'lesson-2',rev,null,'complete'),resultRequestId:'synthetic-forged'}));assert.equal(rows(s),old);
 const b=s.backup();b.content.lessons[1].exerciseIds=['ex-2-cloze'];assert.throws(()=>s.restore(b));assert.equal(rows(s),old);
});
