import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Store,validateContent,STORE_SCHEMA_VERSION} from '../src/store.js';
import {createServer} from '../src/server.js';
import {projectLesson,deriveLessonIndices,exerciseInLesson} from '../public/course.js';
import {orderingTokens} from '../public/ux.js';
const user='learner-demo';
const db=s=>JSON.stringify(Object.fromEntries(['kv','revisions','learners','events','sqlite_sequence'].map(t=>[t,s.db.prepare('SELECT * FROM '+t+' ORDER BY 1').all()])));
const setup=t=>{const s=new Store();t.after(()=>s.close());return s;};
function shared(s,id='ex-1-type',target='lesson-2'){
 const c=s.snapshot();c.lessons=c.lessons.map(l=>projectLesson(c,l));
 const l=c.lessons.find(l=>l.id===target);l.blocks.push({id:'shared-new7',type:'exercise-set',source:'exercises',renderer:'practice',role:'apply',selector:{mode:'ids',ids:[id]}});
 c.lessons=c.lessons.map(l=>deriveLessonIndices(c,l));return c;
}
function publish(s,c){const d=s.stage({content:c,baseRevisionId:s.get('active'),expectedDraftToken:null});return s.publish(s.get('active'),d.draftToken).revisionId;}
test('NEW7 authored typing lists replace omitted defaults, preserve exact source and remain private',t=>{
 const s=setup(t),c=s.snapshot(),before=structuredClone(c.words),e=c.exercises.find(e=>e.type==='typing');
 const old=s.attempt(user,{requestId:randomUUID(),revisionId:1,exerciseId:e.id,answer:'אני'});assert.equal(old.correct,true);
 e.answers=['  אָדָם  ','אַתָּה'];const revisionId=publish(s,c);
 for(const answer of e.answers)assert.equal(s.attempt(user,{requestId:randomUUID(),revisionId,exerciseId:e.id,answer}).correct,true);
 assert.equal(s.attempt(user,{requestId:randomUUID(),revisionId,exerciseId:e.id,answer:'אני'}).correct,false);
 assert.deepEqual(s.snapshot().words,before);assert.deepEqual(s.snapshot().exercises.find(x=>x.id===e.id).answers,e.answers);
 assert.equal(Object.hasOwn(s.bootstrap(user).content.exercises.find(x=>x.id===e.id),'answers'),false);
 const d=s.stage({content:c,baseRevisionId:revisionId,expectedDraftToken:null});const tables=db(s);
 assert.equal(Object.hasOwn(s.previewSession({draftToken:d.draftToken,lessonId:e.lessonId}).content.exercises.find(x=>x.id===e.id),'answers'),false);
 assert.equal(s.previewEvaluate({draftToken:d.draftToken,lessonId:e.lessonId,exerciseId:e.id,answer:'אתה'}).result.correct,true);assert.equal(db(s),tables);
});
test('NEW7 invalid explicit typing lists reject atomically; ignored legacy vowel policy is retained',t=>{
 const s=setup(t);for(const answers of [[],null,'text',[''],['  '],['\u200e'],[42]]){const c=s.snapshot();c.exercises[1].answers=answers;const before=db(s);assert.throws(()=>s.stage({content:c,baseRevisionId:1,expectedDraftToken:null}));assert.equal(db(s),before);}
 const c=s.snapshot();c.exercises[1].answers=['אֲנִי'];c.exercises[1].requireNikkud=true;const rev=publish(s,c);
 const result=s.attempt(user,{requestId:randomUUID(),revisionId:rev,exerciseId:'ex-1-type',answer:'אני'});assert.equal(result.correct,true);assert.equal(result.evaluationPolicy,'ignore-nikkud-v1');
});
test('NEW7 shared canonical exercise has contextual attempts, independent completion, receipt replay and pinned restore',t=>{
 const s=setup(t),c=shared(s);const rev=publish(s,c);assert.equal(exerciseInLesson(c,'lesson-2','ex-1-type'),true);
 assert.equal(s.snapshot().exercises.find(e=>e.id==='ex-1-type').lessonId,'lesson-1');
 const first={requestId:randomUUID(),revisionId:rev,lessonId:'lesson-2',exerciseId:'ex-1-type',answer:'אני'};const a=s.attempt(user,first);assert.equal(a.lessonId,'lesson-2');assert.equal(s.attempt(user,first).duplicate,true);
 const before=db(s);assert.throws(()=>s.attempt(user,{...first,lessonId:'lesson-1'}),e=>e.status===409);assert.equal(db(s),before);
 assert.throws(()=>s.attempt(user,{...first,requestId:randomUUID(),lessonId:'lesson-3'}));assert.equal(db(s),before);
 for(const id of c.lessons[0].exerciseIds){const e=c.exercises.find(e=>e.id===id);const answer=e.type==='recognition'?'who':e.type==='matching'?Object.fromEntries(e.wordIds.map(id=>[id,c.words.find(w=>w.id===id).english])):'אני';s.attempt(user,{requestId:randomUUID(),revisionId:rev,lessonId:'lesson-1',exerciseId:id,answer});}
 assert.ok(s.learner(user).completed.includes('lesson-1'));assert.equal(s.learner(user).completed.includes('lesson-2'),false);
 s.saveProgress(user,{lessonId:'lesson-2',revisionId:rev,componentId:'shared-new7',step:'apply',question:0,answer:'אני',matching:{},selectedTokens:[],resultRequestId:a.requestId,practiceIds:[]});
 s.report(user,{requestId:randomUUID(),attemptId:a.requestId,reason:'unclear',note:'SYNTHETIC shared placement'});
 s.askQuestion(user,{requestId:randomUUID(),revisionId:rev,lessonId:'lesson-2',exerciseId:'ex-1-type',question:'SYNTHETIC shared comment',discussionVersion:1,anonymous:true});
 const d=setup(t),r=d.restore(s.backup());assert.equal(d.get('schema-version'),STORE_SCHEMA_VERSION);
 const restored=d.session(user,'lesson-2');assert.equal(restored.result.lessonId,'lesson-2');assert.equal(restored.result.revisionId,r.revisions[rev]);assert.equal(d.reports('author-demo')[0].attempt.lessonId,'lesson-2');
});
test('NEW7 placement ordering uses taught context and rejects insufficient earlier pools',t=>{
 const s=setup(t),c=shared(s,'ex-2-order','lesson-3');assert.ok(orderingTokens(c.exercises.find(e=>e.id==='ex-2-order'),c,'lesson-3').length>3);validateContent(c);
 const bad=shared(s,'ex-3-order','lesson-1');assert.throws(()=>validateContent(bad),/taught distractor/);
 const rev=publish(s,c),session=s.session(user,'lesson-3');assert.deepEqual(session.content.exercises.find(e=>e.id==='ex-2-order').tokens,orderingTokens(c.exercises.find(e=>e.id==='ex-2-order'),c,'lesson-3'));assert.equal(session.revisionId,rev);
});
test('NEW7 workspace impact names shared dependencies without staging, and candidate/base/draft conflicts write nothing',t=>{
 const s=setup(t),c=shared(s),before=db(s),input={baseRevisionId:1,expectedDraftToken:null,content:c};const impact=s.workspaceImpact(input);assert.equal(db(s),before);
 const dependency=impact.dependencies.find(d=>d.id==='ex-1-type');assert.equal(dependency.lessonCount,2);assert.ok(dependency.lessons.some(l=>l.id==='lesson-2'&&l.candidate&&!l.active));
 assert.ok(impact.affectedLessons.some(l=>l.id==='lesson-2'&&l.title));
 const changed=structuredClone(c);changed.exercises[1].prompt='SYNTHETIC changed after impact';assert.throws(()=>s.stage({...input,content:changed,reviewedDraftToken:impact.candidateDraftToken}),e=>e.code==='IMPACT_CHANGED');assert.equal(db(s),before);
 const d=s.stage({...input,reviewedDraftToken:impact.candidateDraftToken}),saved=db(s);assert.throws(()=>s.workspaceImpact(input));assert.equal(db(s),saved);
 const scope=s.exerciseDependencies({exerciseId:'ex-1-type',baseRevisionId:1,expectedDraftToken:d.draftToken});assert.equal(scope.lessonCount,2);assert.ok(scope.lessons.every(l=>l.title));assert.equal(db(s),saved);
});
test('NEW7 impact and dependency HTTP endpoints enforce author scope and exact CAS without writes',async t=>{
 const s=setup(t),server=createServer(s);await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));const base='http://127.0.0.1:'+server.address().port;
 const post=(path,user,body)=>fetch(base+'/api/'+path,{method:'POST',headers:{'content-type':'application/json','x-demo-user':user},body:JSON.stringify(body)});
 const input={baseRevisionId:1,expectedDraftToken:null,content:shared(s)},before=db(s);
 assert.equal((await post('studio/impact','learner-demo',input)).status,403);assert.equal(db(s),before);
 const response=await post('studio/impact','author-demo',input);assert.equal(response.status,200);assert.ok((await response.json()).candidateDraftToken);assert.equal(db(s),before);
 assert.equal((await post('studio/dependencies','author-demo',{baseRevisionId:99,expectedDraftToken:null,exerciseId:'ex-1-type'})).status,409);assert.equal(db(s),before);
});


import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
test('NEW7 full physical keyboard retains row order, English hints, all controls, selection caret and pin',t=>{
 const d=new JSDOM('<textarea id="answer" dir="rtl">אבג</textarea>',{runScripts:'outside-only',pretendToBeVisual:true,url:'http://127.0.0.1/'}),w=d.window,doc=w.document;t.after(()=>w.close());
 w.scrollBy=()=>{};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.eval(readFileSync(new URL('../public/keyboard-owner.js',import.meta.url),'utf8'));doc.dispatchEvent(new w.Event('DOMContentLoaded'));
 w.HebleoKeyboard.sync({knownKeys:'',newKeys:'אהוימנ',newColor:'#008899'},{keyboardPinned:false,keyboardConvert:false},'synthetic-first-lesson');
 const keys=[...doc.querySelectorAll('.hebleo-keyboard__row [data-insert]')].filter(b=>!b.closest('#hebleo-vowel-picker'));
 assert.deepEqual(keys.map(b=>b.dataset.insert),['/','׳','ק','ר','א','ט','ו','ן','ם','פ','ש','ד','ג','כ','ע','י','ח','ל','ך','ף',',','"','ז','ס','ב','ה','נ','מ','צ','ת','ץ','.','?']);
 assert.equal(keys.filter(b=>b.classList.contains('known-key')).length,0);assert.ok(keys.every(b=>b.querySelector('.hebleo-keyboard__en').textContent===b.dataset.en));assert.ok(doc.querySelector('.hebleo-keyboard--show-hints'));
 for(const action of ['backspace','space','arrow-left','arrow-right','enter','pin','close','toggle-vowels'])assert.ok(doc.querySelector('[data-action="'+action+'"]'),action);
 const answer=doc.querySelector('#answer');answer.focus();answer.setSelectionRange(1,2);w.HebleoKeyboard.open(answer);
 keys.find(b=>b.dataset.insert==='ק').click();assert.equal(answer.value,'אקג');assert.equal(answer.selectionStart,2);
 doc.querySelector('[data-action="pin"]').click();doc.body.dispatchEvent(new w.MouseEvent('pointerdown',{bubbles:true}));doc.body.click();assert.ok(doc.querySelector('.hebleo-keyboard--open'));
 w.HebleoKeyboard.open(answer);doc.querySelector('[data-action="toggle-vowels"]').click();doc.querySelector('[data-insert="ַ"]').click();assert.equal(answer.value,'אקַג');assert.equal(answer.selectionStart,3);
});
