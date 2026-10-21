// Independent QA for 065197a. Synthetic mappings, memory-only databases, ephemeral HTTP.
import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {Store} from '../src/store.js';
import {createServer} from '../src/server.js';
import {mountExerciseEditor} from '../public/studio/exercise-editor.js';
import {exerciseInput,exerciseSurface,exerciseFeedback,bindResultExplanations} from '../public/learner-view.js';
import {mountAnsweredVocabulary} from '../public/post-answer-vocabulary.js';
import {validateExerciseVocabularyBindings} from '../public/exercise-bindings.js';
import {lexicalFixture} from '../scripts/lexical-fixture.mjs';
import {lexicalApprovalDigest} from '../src/lexical-trust.js';

const families=['recognition','typing','matching','ordering','cloze','transformation'];
const rawWrong=' \u200fSYNTHETIC WRONG e\u0301\r\n  ';
const dump=s=>JSON.stringify(s.db.prepare("SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name").all().map(({name})=>[name,s.db.prepare('SELECT * FROM "'+name+'" ORDER BY 1').all()]));
function store(t){const s=new Store();t.after(()=>s.close());return s;}
function dom(t){const d=new JSDOM('<main></main>',{pretendToBeVisual:true,url:'http://127.0.0.1/'});t.after(()=>d.window.close());return d;}
const change=(d,el,value)=>{el.value=value;el.dispatchEvent(new d.window.Event('change',{bubbles:true}));};
function select(d,host,field='prompt',index){
 change(d,host.querySelector('[data-binding-surface]'),field+':'+(index??''));
 const el=host.querySelector('[data-binding-source]');el.setSelectionRange(0,el.value.length);el.dispatchEvent(new d.window.Event('select',{bubbles:true}));
}
const choose=(host,id)=>host.querySelector('[data-binding-picker] [data-vocab-id="'+id+'"]').click();
const apply=host=>{const el=host.querySelector('[data-binding-apply]');assert.equal(el.disabled,false);el.click();};
function binding(e,field='prompt',index,id='qa-occurrence',wordId='qa-only-word'){
 const text=index===undefined?e[field]:e[field][index];return {id,wordId,field,...(index===undefined?{}:{index}),start:0,end:text.length,text,sourceText:text};
}
function synthetic(s,type){
 const c=s.snapshot(),e=c.exercises.find(x=>x.type===type);
 c.words.push({...structuredClone(c.words[0]),id:'qa-only-word',english:'SYNTHETIC QA card',notes:'SYNTHETIC version one'});
 e.prompt='שָׁ\r\n👨‍👩‍👧‍👦 e\u0301\u200f SYNTHETIC';
 e.context='SYNTHETIC exact context';e.feedback='SYNTHETIC feedback';e.feedbackDetails='SYNTHETIC details';
 if(type==='typing')e.answers=['SYNTHETIC QA accepted'];
 return {c,e};
}
const stage=(s,c)=>s.stage({baseRevisionId:s.get('active'),expectedDraftToken:s.currentDraft()?.draftToken??null,content:c});
async function endpoint(t,s){const server=createServer(s);await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));return async(path,data)=>{
 const response=await fetch('http://127.0.0.1:'+server.address().port+path,{method:data?'POST':'GET',headers:{'content-type':'application/json','x-demo-user':'author-demo'},...(data?{body:JSON.stringify(data)}:{})});
 const result=await response.json();assert.equal(response.ok,true,JSON.stringify(result));return result;
};}
function render(t,content,e,result,revisionId){
 const d=dom(t),root=d.window.document.querySelector('main');
 root.innerHTML='<p>'+exerciseSurface(e.prompt,'prompt')+'</p><div data-exercise-input>'+exerciseInput(e,{mode:'full',word:id=>content.words.find(w=>w.id===id),draft:{text:rawWrong,matching:{},selectedTokens:[]},result})+'</div>'+exerciseFeedback(e,result);
 d.window.HTMLElement.prototype.getBoundingClientRect=()=>({left:10,top:10,right:150,bottom:50,width:140,height:40});
 d.window.HTMLElement.prototype.getClientRects=function(){return [this.getBoundingClientRect()];};
 bindResultExplanations(root);
 const h=mountAnsweredVocabulary(root,{content,exercise:e,result,revisionId,mode:'full',isCurrent:()=>true});t.after(()=>h?.destroy());return {root,d,h};
}

for(const type of families)test('QA all-family Studio -> HTTP rehearsal -> publish -> pin/restore/rollback: '+type,async t=>{
 const s=store(t),{c,e}=synthetic(s,type),http=await endpoint(t,s),d=dom(t),host=d.window.document.querySelector('main'),initial=dump(s);
 let saved;
 const editor=mountExerciseEditor(host,{content:c,exerciseId:e.id,baseRevisionId:s.get('active'),saveDraft:async request=>saved=await http('/api/studio/draft',request)});t.after(()=>editor());
 select(d,host);choose(host,'qa-only-word');apply(host);
 const originalId=editor.snapshot().vocabularyBindings[0].id;
 host.querySelector('[data-binding-rebind]').click();choose(host,'w-mi');apply(host);
 assert.equal(editor.snapshot().vocabularyBindings[0].id,originalId);
 assert.equal(editor.snapshot().vocabularyBindings[0].wordId,'w-mi');
 host.querySelector('[data-binding-remove]').click();assert.deepEqual(editor.snapshot().vocabularyBindings,[]);
 select(d,host);choose(host,'qa-only-word');apply(host);
 const finalId=editor.snapshot().vocabularyBindings[0].id;assert.notEqual(finalId,originalId);
 for(const field of ['context','feedback','feedbackDetails']){select(d,host,field);apply(host);}
 if(['typing','ordering','cloze','transformation'].includes(type)){select(d,host,'answers',0);apply(host);}
 assert.equal(dump(s),initial,'authoring is local until Save');
 host.querySelector('form').dispatchEvent(new d.window.Event('submit',{bubbles:true,cancelable:true}));
 for(let i=0;i<200&&!/Draft saved|Failed|error/i.test(host.querySelector('[data-editor-status]').textContent);i++)await new Promise(r=>setTimeout(r,5));
 assert.match(host.querySelector('[data-editor-status]').textContent,/Draft saved/);
 const authored=s.currentDraft().content.exercises.find(x=>x.id===e.id);
 assert.equal(authored.vocabularyBindings[0].sourceText,e.prompt,'CRLF survives the editor');
 assert.equal(authored.vocabularyBindings[0].id,finalId);
 const preview=s.previewSession({lessonId:e.lessonId,draftToken:saved.draftToken}),pub=preview.content.exercises.find(x=>x.id===e.id);
 assert.equal(pub.answers,undefined);assert.ok(pub.vocabularyBindings.every(b=>b.field!=='answers'));
 assert.equal(render(t,preview.content,pub,null).root.querySelector('[data-vocabulary-word]'),null);
 const correct=type==='recognition'?c.words.find(w=>w.id===e.wordId).english:type==='matching'?Object.fromEntries(e.wordIds.map(id=>[id,c.words.find(w=>w.id===id).english])):e.answers[0];
 for(const answer of [correct,type==='matching'?{}:rawWrong]){
  const before=dump(s),out=await http('/api/studio/preview/evaluate',{lessonId:e.lessonId,exerciseId:e.id,draftToken:saved.draftToken,answer});
  assert.equal(out.result.correct,answer===correct);assert.deepEqual(out.result.answer,answer);
  const {root}=render(t,preview.content,pub,out.result);
  assert.ok(root.querySelector('[data-vocabulary-binding="'+finalId+'"]'));
  assert.equal(root.querySelector('button button,button:disabled [data-vocabulary-word]'),null);
  for(const trigger of root.querySelectorAll('[data-vocabulary-binding]')){if(trigger.closest('[data-result-popover]'))root.querySelector('[data-result-explanation]').focus();trigger.focus();trigger.click();assert.ok(root.querySelector('.vocabulary-reminder'),type+' '+trigger.closest('[data-vocabulary-surface]').dataset.vocabularySurface);root.querySelector('[data-vocabulary-close]').click();}
  if(root.querySelector('textarea'))assert.equal(root.querySelector('textarea').value,rawWrong.replace(/\r\n?/g,'\n'),'textarea follows HTML newline rules; result.answer stays exact');
  assert.equal(dump(s),before,'real HTTP evaluation and card viewing write nothing');
 }
 const revision=s.publish(s.get('active'),saved.draftToken).revisionId;
 const wrong=type==='matching'?{}:rawWrong,result=s.attempt('learner-demo',{lessonId:e.lessonId,exerciseId:e.id,revisionId:revision,requestId:'qa-'+type,answer:wrong});
 const lesson=c.lessons.find(x=>x.id===e.lessonId),step=lesson.checkExerciseIds?.includes(e.id)?'check':'apply',ids=step==='check'?lesson.checkExerciseIds:lesson.exerciseIds.filter(id=>!lesson.checkExerciseIds?.includes(id));
 s.saveProgress('learner-demo',{lessonId:e.lessonId,revisionId:revision,step,question:ids.indexOf(e.id),answer:typeof wrong==='string'?wrong:'',matching:typeof wrong==='object'?wrong:{},selectedTokens:[],resultRequestId:result.requestId});
 const newer=s.snapshot();newer.words.find(w=>w.id==='qa-only-word').notes='SYNTHETIC version two';stage(s,newer);
 assert.ok(s.preview().affectedLessons.includes(e.lessonId));assert.ok(s.dependencies('qa-only-word').exercises.includes(e.id));
 s.publish(s.get('active'),s.currentDraft().draftToken);
 const beforePin=dump(s),pinned=s.session('learner-demo',e.lessonId);
 assert.equal(pinned.revisionId,revision);assert.deepEqual(pinned.result.answer,wrong);
 assert.equal(pinned.content.exerciseVocabulary.byWordId['qa-only-word'].word.notes,'SYNTHETIC version one');
 render(t,pinned.content,pinned.content.exercises.find(x=>x.id===e.id),pinned.result,revision);assert.equal(dump(s),beforePin);
 const exported=s.backup(),target=store(t),receipt=target.restore(exported),restored=target.session('learner-demo',e.lessonId);
 assert.equal(restored.revisionId,receipt.revisions[revision]);assert.deepEqual(restored.result.answer,wrong);
 const bad=structuredClone(exported);bad.content.exercises.find(x=>x.id===e.id).vocabularyBindings[0].end++;
 const beforeBad=dump(target);assert.throws(()=>target.restore(bad),/vocabularyBindings/);assert.equal(dump(target),beforeBad);
 s.rollback(revision,s.get('active'),null);assert.equal(s.snapshot().words.find(w=>w.id==='qa-only-word').notes,'SYNTHETIC version one');
});

test('QA exhaustive UTF-16 range acceptance agrees with independent Intl grapheme segmentation, including CRLF, flags, Hebrew and ZWJ',()=>{
 let checked=0;
 for(const text of ['שָׁלוֹם','A\r\nB\rC\nD','👨‍👩‍👧‍👦🇮🇱👍🏽','e\u0301\u200f שָׁ','<button>מי</button>','\u2067מי\u2069']){
  const cuts=new Set([0]);for(const part of new Intl.Segmenter('he',{granularity:'grapheme'}).segment(text))cuts.add(part.index+part.segment.length);
  for(let start=0;start<=text.length;start++)for(let end=start+1;end<=text.length;end++){
   const e={id:'qa-unicode',type:'cloze',prompt:text,vocabularyBindings:[{id:'qa-span',wordId:'qa-word',field:'prompt',sourceText:text,start,end,text:text.slice(start,end)}]};
   if(cuts.has(start)&&cuts.has(end))assert.doesNotThrow(()=>validateExerciseVocabularyBindings(e,[{id:'qa-word'}]));
   else assert.throws(()=>validateExerciseVocabularyBindings(e,[{id:'qa-word'}]),/grapheme/);
   checked++;
  }
 }
 assert.ok(checked>400);console.log('Independent UTF-16 span cases:',checked);
});

for(const type of families)test('QA all-family malformed binding sets reject atomically: '+type,t=>{
 const s=store(t),{c,e}=synthetic(s,type);e.vocabularyBindings=[binding(e)];const before=dump(s);
 for(const mutate of [
  b=>b.id='constructor',b=>b.wordId='absent-qa-word',b=>b.start=NaN,b=>b.end=Infinity,
  b=>b.index=null,b=>b.field='__proto__',b=>b.sourceText+=' ',b=>b.text=b.text.normalize('NFD'),b=>b.extra=true
 ]){
  const bad=structuredClone(c),x=bad.exercises.find(x=>x.id===e.id);mutate(x.vocabularyBindings[0]);
  if(JSON.stringify(x.vocabularyBindings)===JSON.stringify(e.vocabularyBindings))continue;
  assert.throws(()=>stage(s,bad),/vocabularyBindings/);assert.equal(dump(s),before);
 }
 for(const duplicateId of [true,false]){
  const bad=structuredClone(c),x=bad.exercises.find(x=>x.id===e.id);x.vocabularyBindings.push({...x.vocabularyBindings[0],...(!duplicateId?{id:'qa-overlap'}:{})});
  assert.throws(()=>stage(s,bad),/vocabularyBindings/);assert.equal(dump(s),before);
 }
 const missing=structuredClone(c);missing.words=missing.words.filter(w=>w.id!=='qa-only-word');assert.throws(()=>stage(s,missing),/vocabularyBindings/);assert.equal(dump(s),before);
});

test('QA revision/lesson/exercise guards suppress stale cards; forged IDs and missing projections have no flat fallback',t=>{
 const s=store(t),{c,e}=synthetic(s,'cloze');e.vocabularyBindings=[binding(e,'answers',0)];const staged=stage(s,c),session=s.previewSession({lessonId:e.lessonId,draftToken:staged.draftToken}),pub=session.content.exercises.find(x=>x.id===e.id),base=s.previewEvaluate({lessonId:e.lessonId,exerciseId:e.id,draftToken:staged.draftToken,answer:rawWrong}).result;
 for(const change of [r=>r.revisionId=2,r=>r.lessonId='another-lesson',r=>r.exerciseId='another-exercise']){
  const r={...structuredClone(base),revisionId:1};change(r);assert.equal(render(t,session.content,pub,r,1).root.querySelector('[data-vocabulary-word]'),null);
 }
 const absent=structuredClone(session.content);delete absent.exerciseVocabulary.byWordId['qa-only-word'];assert.equal(render(t,absent,pub,base).root.querySelector('[data-vocabulary-word]'),null);
 const forged=structuredClone(base);forged.vocabularyBindings[0].wordId='w-hu';assert.equal(render(t,session.content,pub,forged).root.querySelector('[data-vocabulary-word]'),null);
 const descriptor=Object.getOwnPropertyDescriptor(Intl,'Segmenter');try{Object.defineProperty(Intl,'Segmenter',{value:undefined,configurable:true});assert.throws(()=>validateExerciseVocabularyBindings(e,c.words),/segmentation/);}finally{Object.defineProperty(Intl,'Segmenter',descriptor);}
});

test('QA managed bound-only ID never falls through denied lexical eligibility to an available flat card',t=>{
 const s=store(t),{c,e}=synthetic(s,'cloze');e.vocabularyBindings=[binding(e)];c.lexical=lexicalFixture();
 const w=c.lexical.words[0];w.runtimeId='qa-only-word';w.approvalDigest=lexicalApprovalDigest(w);
 assert.equal(s.publicContent(c,e.lessonId).exerciseVocabulary.byWordId['qa-only-word'].kind,'lexical');
 for(const mutate of [x=>x.identityReview={status:'pending'},x=>x.displayReview={status:'pending'},x=>x.fieldConflicts=['SYNTHETIC conflict']]){
  const bad=structuredClone(c);mutate(bad.lexical.words[0]);const view=s.publicContent(bad,e.lessonId);assert.equal(view.exerciseVocabulary.byWordId['qa-only-word'],undefined);
 }
 const denied=structuredClone(c);denied.lexical.introductions=[];assert.equal(s.publicContent(denied,e.lessonId).exerciseVocabulary.byWordId['qa-only-word'],undefined);
});

for(const correct of [true,false])test('QA-E10-02 pinned feedback card survives pointer transit out of explanation '+correct,async t=>{
 const s=store(t),{c,e}=synthetic(s,'cloze');e.vocabularyBindings=[binding(e,'feedback')];
 const staged=stage(s,c),session=s.previewSession({lessonId:e.lessonId,draftToken:staged.draftToken}),pub=session.content.exercises.find(x=>x.id===e.id),result=s.previewEvaluate({lessonId:e.lessonId,exerciseId:e.id,draftToken:staged.draftToken,answer:correct?e.answers[0]:rawWrong}).result;
 assert.equal(result.correct,correct);const before=dump(s),{root,d}=render(t,session.content,pub,result),box=root.querySelector('.result-explanation'),popover=root.querySelector('[data-result-popover]');
 box.dispatchEvent(new d.window.MouseEvent('pointerenter',{bubbles:false}));assert.equal(popover.hidden,false);
 const trigger=root.querySelector('[data-vocabulary-binding]');trigger.click();
 const card=root.querySelector('.vocabulary-reminder');assert.ok(card);assert.ok(card.contains(d.window.document.activeElement));
 // The production reminder deliberately mounts outside role=status, as its sibling.
 assert.equal(box.contains(card),false);
 box.dispatchEvent(new d.window.MouseEvent('pointerleave',{relatedTarget:card,bubbles:false}));
 card.dispatchEvent(new d.window.MouseEvent('pointerover',{relatedTarget:trigger,bubbles:true}));
 await new Promise(r=>setTimeout(r,260));
 assert.equal(dump(s),before);
 assert.ok(root.querySelector('.vocabulary-reminder'),'pinned card must remain usable after moving the pointer onto it');
 assert.equal(popover.hidden,false,'the authored surface owning a pinned card must stay visible');
});

test('QA repeated token text and identical accepted rows retain separate authored identities',t=>{
 const s=store(t),{c,e}=synthetic(s,'ordering');c.words.push({...structuredClone(c.words[0]),id:'qa-second-word',english:'SYNTHETIC second identity'});
 e.tokens=['מי','מי'];e.prefixTokenIndices=[0];e.answers=['מי מי','מי מי'];
 e.vocabularyBindings=['tokens','answers'].flatMap(field=>e[field].map((_,i)=>binding(e,field,i,'qa-'+field+'-'+i,i?'qa-second-word':'qa-only-word')));
 const staged=stage(s,c),session=s.previewSession({lessonId:e.lessonId,draftToken:staged.draftToken}),pub=session.content.exercises.find(x=>x.id===e.id),result=s.previewEvaluate({lessonId:e.lessonId,exerciseId:e.id,draftToken:staged.draftToken,answer:rawWrong}).result;
 assert.equal(pub.answers,undefined);const {root}=render(t,session.content,pub,result);
 for(const field of ['tokens','answers'])for(const index of [0,1]){
  const buttons=[...root.querySelectorAll('[data-vocabulary-binding="qa-'+field+'-'+index+'"]')];assert.ok(buttons.length);
  assert.ok(buttons.every(b=>b.dataset.vocabularyWord===(index?'qa-second-word':'qa-only-word')));
 }
 assert.equal(root.querySelector('.assembled-sentence button,button button'),null);
 for(const b of pub.vocabularyBindings)assert.equal(pub.tokens[b.index],b.sourceText);
 const stale=structuredClone(c);stale.exercises.find(x=>x.id===e.id).tokens[0]='changed';const before=dump(s);assert.throws(()=>stage(s,stale),/vocabularyBindings/);assert.equal(dump(s),before);
});

for(const type of families)test('QA saved Studio rebind and removal persist after fresh remount: '+type,async t=>{
 const s=store(t),{c,e}=synthetic(s,type);e.vocabularyBindings=[binding(e)];stage(s,c);
 async function edit(action){
  const draft=s.currentDraft(),d=dom(t),host=d.window.document.querySelector('main');let completed=false;
  const ui=mountExerciseEditor(host,{content:draft.content,exerciseId:e.id,baseRevisionId:s.get('active'),expectedDraftToken:draft.draftToken,saveDraft:request=>s.stage(request),onSaved:()=>completed=true});t.after(()=>ui());
  action(host,d,ui);host.querySelector('form').dispatchEvent(new d.window.Event('submit',{bubbles:true,cancelable:true}));
  await new Promise(r=>setImmediate(r));assert.equal(completed,true,host.querySelector('[data-editor-status]').textContent);
 }
 await edit(host=>{host.querySelector('[data-binding-rebind]').click();choose(host,'w-mi');apply(host);});
 const reloaded=s.currentDraft().content.exercises.find(x=>x.id===e.id).vocabularyBindings;assert.equal(reloaded[0].wordId,'w-mi');assert.equal(reloaded[0].id,'qa-occurrence');
 await edit(host=>host.querySelector('[data-binding-remove]').click());
 assert.deepEqual(s.currentDraft().content.exercises.find(x=>x.id===e.id).vocabularyBindings,[]);
 const before=dump(s),session=s.previewSession({lessonId:e.lessonId,draftToken:s.currentDraft().draftToken}),pub=session.content.exercises.find(x=>x.id===e.id);
 const result=s.previewEvaluate({lessonId:e.lessonId,exerciseId:e.id,draftToken:s.currentDraft().draftToken,answer:type==='matching'?{}:rawWrong}).result;
 const {root}=render(t,session.content,pub,result);assert.equal(root.querySelector('[data-vocabulary-binding]'),null);assert.equal(dump(s),before);
});
