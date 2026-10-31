import test from 'node:test';
import assert from 'node:assert/strict';
import {Store,validateContent,STORE_SCHEMA_VERSION} from '../src/store.js';
import {projectLesson,projectCurriculum,deriveLessonIndices,lessonFlow} from '../public/course.js';
import {evaluateAnswer} from '../src/evaluate.js';
import {createServer} from '../src/server.js';
const tables=s=>JSON.stringify(['kv','revisions','learners','events','sqlite_sequence'].map(name=>s.db.prepare('SELECT * FROM '+name+' ORDER BY 1').all()));
function setup(t){const s=new Store();t.after(()=>s.close());return s;}
function candidate(s){const c=s.snapshot();c.lessons=c.lessons.map(l=>projectLesson(c,l));c.curriculum=projectCurriculum(c);return c;}
const position=(revisionId,lessonId,componentId,step,extras={})=>({revisionId,lessonId,componentId,step,question:0,answer:'',matching:{},selectedTokens:[],practiceIds:[],...extras});
function publish(s,c){const base=s.get('active'),staged=s.stage({baseRevisionId:base,expectedDraftToken:s.currentDraft()?.draftToken??null,content:c});return s.publish(base,staged.draftToken).revisionId;}
test('v2 Stage/review/preview/publish preserves two text IDs; preview and reads write zero rows',t=>{
 const s=setup(t),c=candidate(s),l=c.lessons[0],text=l.blocks.find(b=>b.type==='explanation');
 l.blocks.push({...structuredClone(text),id:'block-second',text:c.lessons[1].explanation});validateContent(c);
 const base=s.get('active'),staged=s.stage({baseRevisionId:base,expectedDraftToken:null,content:c}),before=tables(s);
 const wire=s.previewSession({lessonId:l.id,draftToken:staged.draftToken});assert.equal(wire.flow.filter(x=>x.kind==='learn').length,2);assert.equal(wire.persistent,false);assert.equal(tables(s),before);
 const revisionId=s.publish(base,staged.draftToken).revisionId;assert.equal(s.session('learner-demo',l.id).flow.at(-2).key,'block-second');
 assert.equal(s.snapshot(revisionId).lessons[0].blocks.at(-1).text,c.lessons[1].explanation);
});
test('cursor in second text stays pinned after publishing reorder; forged component/feedback fails atomically',t=>{
 const s=setup(t),c=candidate(s),l=c.lessons[0];l.blocks.push({...structuredClone(l.blocks[0]),id:'block-second'});const revision=publish(s,c);
 s.saveProgress('learner-demo',position(revision,l.id,'block-second','learn'));const newer=s.snapshot();newer.lessons[0].blocks.reverse();newer.lessons[0]=deriveLessonIndices(newer,newer.lessons[0]);publish(s,newer);
 assert.equal(s.session('learner-demo',l.id).revisionId,revision);assert.equal(s.session('learner-demo',l.id).progress.componentId,'block-second');
 const before=tables(s);
 for(const bad of [position(revision,l.id,'missing','learn'),position(revision,l.id,'block-second','apply'),position(revision,l.id,'block-second','learn',{answer:'wrong'}),position(revision,l.id,'legacy-apply','apply',{question:999})]){assert.throws(()=>s.saveProgress('learner-demo',bad));assert.equal(tables(s),before);}
});
test('second exercise instance retains exact feedback on reload/restore; one repeated exercise earns one slot',t=>{
 const s=setup(t),c=candidate(s),l=c.lessons[0],block=l.blocks.find(b=>b.type==='exercise-set');l.blocks.push({...structuredClone(block),id:'block-repeat'});c.lessons[0]=deriveLessonIndices(c,l);
 const revision=publish(s,c),exerciseId=block.selector.ids[0],e=c.exercises.find(e=>e.id===exerciseId),answer=e.type==='recognition'?c.words.find(w=>w.id===e.wordId).english:e.type==='typing'?c.words.find(w=>w.id===e.wordId).unpointed:'';
 const grade=s.attempt('learner-demo',{revisionId:revision,exerciseId,requestId:'instance-grade',answer});
 s.saveProgress('learner-demo',position(revision,l.id,'block-repeat',block.role,{answer,resultRequestId:grade.requestId}));
 const backup=s.backup(),target=setup(t);const restored=target.restore(backup);assert.equal(target.session('learner-demo',l.id).progress.componentId,'block-repeat');assert.equal(target.session('learner-demo',l.id).result.requestId,grade.requestId);assert.equal(target.session('learner-demo',l.id).revisionId,restored.revisions[revision]);
 const bad=structuredClone(backup);bad.learners[0].state.resumes[l.id].componentId='legacy-explanation';const before=tables(target);assert.throws(()=>target.restore(bad));assert.equal(tables(target),before);
});
test('new submissions ignore old requireNikkud while duplicate historical verdicts remain exact',t=>{
 const s=setup(t),c=s.snapshot();c.exercises.find(e=>e.id==='ex-1-type').requireNikkud=true;const revision=publish(s,c);
 const learner=s.learner('learner-demo'),old={requestId:'old-grade',exerciseId:'ex-1-type',lessonId:'lesson-1',revisionId:revision,answer:'אני',expected:c.words.find(w=>w.id==='w-ani').pointed,correct:false,at:new Date().toISOString()};learner.attempts.push(old);s.saveLearner('learner-demo',learner);
 assert.deepEqual(s.attempt('learner-demo',{...old}),{...old,duplicate:true});const fresh=s.attempt('learner-demo',{...old,requestId:'fresh-grade'});assert.equal(fresh.correct,true);assert.equal(fresh.evaluationPolicy,'ignore-nikkud-v1');assert.equal(s.learner('learner-demo').attempts[0].correct,false);
 const backup=s.backup(),target=setup(t);target.restore(backup);assert.equal(target.learner('learner-demo').attempts[0].correct,false);assert.equal(target.snapshot().exercises.find(e=>e.id==='ex-1-type').requireNikkud,true);
 for(const e of c.exercises.filter(e=>['cloze','transformation','ordering'].includes(e.type))){e.requireNikkud=true;assert.equal(evaluateAnswer(e,c,e.answers[0].replace(/[\u0591-\u05c7]/g,'')).correct,true);}
});
test('invalid curriculum, stale indices and newly changed unsafe styles fail Stage with no writes',t=>{
 const s=setup(t),good=candidate(s),before=tables(s);
 for(const mutate of [c=>c.curriculum.order.push({lessonId:c.lessons[0].id}),c=>c.lessons[0].exerciseIds.reverse(),c=>c.words[0].fieldFormatting={pointed:{effectiveFormat:{textFormat:{foregroundColor:'url(https://bad)'}}}}]){const c=structuredClone(good);mutate(c);assert.throws(()=>s.stage({baseRevisionId:s.get('active'),expectedDraftToken:null,content:c}));assert.equal(tables(s),before);}
});
test('schema-2 backup remains supported; schema-3 refuses future versions and leaves legacy reads unchanged',t=>{
 const s=setup(t),old=s.backup();old.storeSchemaVersion=2;delete old.authorReview;delete old.mediaRecovery;const target=setup(t);target.restore(old);assert.equal(target.get('schema-version'),STORE_SCHEMA_VERSION);
 const before=tables(target);target.session('learner-demo','lesson-1');target.bootstrap('learner-demo');target.active();assert.equal(tables(target),before);
 old.storeSchemaVersion=STORE_SCHEMA_VERSION+1;assert.throws(()=>target.restore(old));assert.equal(tables(target),before);
});
test('HTTP serves local editor assets with CSS MIME; learner projection hides new import author records',async t=>{
 const s=setup(t),c=candidate(s);c.words[0].importSource={version:1,headers:['id','pointed','unpointed','curated','english','raw'],values:[...['id','pointed','unpointed','curated','english'].map(k=>c.words[0][k]),'SYNTHETIC private author record'],columns:['id','pointed','unpointed','curated','english'].map((target,columnIndex)=>({columnIndex,target,decode:'string'}))};publish(s,c);
 const server=createServer(s);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));const base='http://127.0.0.1:'+server.address().port;
 for(const route of ['/course.js','/vocabulary-import.js','/studio/markdown-editor.js','/studio/vocabulary-browser.js','/studio/vendor/easymde.min.js','/studio/vendor/easymde.min.css']){const response=await fetch(base+route);assert.equal(response.status,200);assert.match(response.headers.get('content-type'),route.endsWith('.css')?/text\/css/:/text\/javascript/);}
 const wire=await (await fetch(base+'/api/session?lessonId=lesson-1')).json();assert.equal(wire.content.words[0].importSource,undefined);assert.ok(wire.flow.length);assert.equal(wire.content.exercises.some(e=>'answers' in e),false);
});
