// Independent Release review: synthetic content and in-memory databases only.
import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {Store,validateContent} from '../src/store.js';
import {validateExerciseVocabularyBindings} from '../public/exercise-bindings.js';
import {mountAnsweredVocabulary} from '../public/post-answer-vocabulary.js';
import {exerciseInput} from '../public/learner-view.js';
import {lexicalFixture} from '../scripts/lexical-fixture.mjs';
import {lexicalApprovalDigest} from '../src/lexical-trust.js';
import {projectExerciseVocabulary} from '../src/exercise-vocabulary.js';

const dump=s=>JSON.stringify(s.db.prepare("SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name").all().map(({name})=>[name,s.db.prepare('SELECT * FROM "'+name+'" ORDER BY 1').all()]));
const create=t=>{const s=new Store();t.after(()=>s.close());return s;};
const stage=(s,content)=>s.stage({baseRevisionId:s.get('active'),expectedDraftToken:s.currentDraft()?.draftToken??null,content});
const publish=(s,c)=>{const d=stage(s,c);return s.publish(s.get('active'),d.draftToken).revisionId;};
function bind(e,field,index,wordId='w-mi',id='release-occurrence'){
 const sourceText=index===undefined?e[field]:e[field][index];
 return {id,wordId,field,...(index===undefined?{}:{index}),sourceText,text:sourceText,start:0,end:sourceText.length};
}
function saveResult(s,c,e,revisionId){
 const answer='\u200fSYNTHETIC wrong e\u0301  ',requestId='release-receipt';
 const input={lessonId:e.lessonId,exerciseId:e.id,revisionId,requestId,answer};
 const result=s.attempt('learner-demo',input),lesson=c.lessons.find(l=>l.id===e.lessonId);
 const step=lesson.checkExerciseIds?.includes(e.id)?'check':'apply';
 const ids=step==='check'?lesson.checkExerciseIds:lesson.exerciseIds.filter(id=>!lesson.checkExerciseIds?.includes(id));
 s.saveProgress('learner-demo',{lessonId:e.lessonId,revisionId,step,question:ids.indexOf(e.id),answer,selectedTokens:[],matching:{},resultRequestId:requestId});
 return {input,result};
}

test('Release occurrence and source size limits, exact unknown fields, and absent segmentation fail closed without writes',t=>{
 const s=create(t),c=s.snapshot(),e=c.exercises.find(e=>e.type==='cloze');
 e.context='x'.repeat(12000);e.vocabularyBindings=Array.from({length:500},(_,i)=>({...bind(e,'context',undefined,'w-mi','release-'+i),start:i,end:i+1,text:'x'}));
 const original=JSON.stringify(c);validateContent(c);assert.equal(JSON.stringify(c),original);
 const before=dump(s);
 for(const mutate of [x=>x.vocabularyBindings.push({...x.vocabularyBindings[0],id:'release-501',start:500,end:501}),x=>{x.context+='x';x.vocabularyBindings.forEach(b=>b.sourceText=x.context);},x=>{x.vocabularyBindings[0].index=null;},x=>{x.vocabularyBindings[0].unrecognized='value';}]){
  const bad=structuredClone(c);mutate(bad.exercises.find(x=>x.id===e.id));assert.throws(()=>stage(s,bad),/vocabularyBindings/);assert.equal(dump(s),before);
 }
 const segmenter=Intl.Segmenter;
 try{Intl.Segmenter=undefined;assert.throws(()=>stage(s,c),/grapheme/);assert.equal(dump(s),before);}finally{Intl.Segmenter=segmenter;}
});

for(const bound of [true,false])test('Release imported receipt links cannot authorize cards; pinned restore/replay derives '+(bound?'original bindings':'no bindings'),t=>{
 const s=create(t),c=s.snapshot(),e=c.exercises.find(e=>e.type==='cloze');e.answers=['SYNTHETIC original'];
 if(bound)e.vocabularyBindings=[bind(e,'answers',0)];
 const revisionId=publish(s,c),{input,result}=saveResult(s,c,e,revisionId);
 const latest=s.snapshot(),changed=latest.exercises.find(x=>x.id===e.id);changed.answers=['SYNTHETIC newer'];
 if(bound)changed.vocabularyBindings=[bind(changed,'answers',0,'w-ani')];publish(s,latest);
 const backup=s.backup(),receipt=backup.learners.find(x=>x.id==='learner-demo').state.attempts.find(x=>x.requestId===input.requestId);
 receipt.vocabularyBindings=[{...bind(e,'answers',0,'w-ani','forged'),sourceText:'ATTACKER',text:'ATTACKER',end:8}];
 const untouched=JSON.stringify(backup),target=create(t),mapping=target.restore(backup);assert.equal(JSON.stringify(backup),untouched);
 const before=dump(target),restored=target.session('learner-demo',e.lessonId);
 assert.equal(restored.revisionId,mapping.revisions[revisionId]);assert.equal(restored.result.answer,input.answer);assert.equal(restored.result.correct,result.correct);
 assert.deepEqual(restored.result.vocabularyBindings,bound?e.vocabularyBindings:undefined);
 const replay=target.attempt('learner-demo',{...input,revisionId:mapping.revisions[revisionId]});assert.equal(replay.duplicate,true);
 assert.deepEqual(replay.vocabularyBindings,bound?e.vocabularyBindings:undefined);assert.equal(dump(target),before);
 // Historical imported extension bytes may remain in the receipt. They are never render authority.
 assert.equal(target.learner('learner-demo').attempts[0].vocabularyBindings[0].id,'forged');
});

test('Release authored answer index 2 survives grader deduplication to two entries and DOM decoration',t=>{
 const s=create(t),c=s.snapshot(),e=c.exercises.find(e=>e.type==='cloze');e.answers=['SYNTHETIC alpha','SYNTHETIC alpha','SYNTHETIC beta'];
 e.vocabularyBindings=[bind(e,'answers',1,'w-mi','duplicate-alpha'),bind(e,'answers',2,'w-ani','third-beta')];
 const d=stage(s,c),session=s.previewSession({lessonId:e.lessonId,draftToken:d.draftToken}),pub=session.content.exercises.find(x=>x.id===e.id);
 assert.equal(JSON.stringify(pub).includes('SYNTHETIC beta'),false);assert.equal(pub.vocabularyBindings.length,0);
 const result=s.previewEvaluate({lessonId:e.lessonId,exerciseId:e.id,draftToken:d.draftToken,answer:'SYNTHETIC wrong'}).result;
 assert.deepEqual(result.acceptedAnswers,['SYNTHETIC alpha','SYNTHETIC beta']);assert.deepEqual(result.vocabularyBindings.map(b=>b.index),[1,2]);
 const before=dump(s),dom=new JSDOM('<main><div data-exercise-input>'+exerciseInput(pub,{mode:'full',word:id=>session.content.words.find(w=>w.id===id),result,draft:{text:result.answer}})+'</div></main>');t.after(()=>dom.window.close());
 const root=dom.window.document.querySelector('main'),binding=mountAnsweredVocabulary(root,{content:session.content,exercise:pub,result,mode:'full',isCurrent:()=>true});t.after(()=>binding?.destroy());
 for(const [id,index,wordId,text] of [['duplicate-alpha',1,'w-mi',e.answers[1]],['third-beta',2,'w-ani',e.answers[2]]]){
  const trigger=root.querySelector('[data-vocabulary-binding="'+id+'"]');assert.ok(trigger);assert.equal(trigger.dataset.vocabularyWord,wordId);assert.equal(trigger.closest('[data-vocabulary-index]').dataset.vocabularyIndex,String(index));assert.equal(trigger.textContent,text);
 }
 assert.equal(root.querySelector('textarea button'),null);assert.equal(result.answer,'SYNTHETIC wrong');assert.equal(dump(s),before);
});

test('Release binding edits participate in CAS; stale stage/publish/rollback and delete reject atomically',t=>{
 const s=create(t),c=s.snapshot(),e=c.exercises.find(e=>e.type==='cloze');
 c.words.push({...structuredClone(c.words[0]),id:'release-only',notes:'SYNTHETIC binding-only target'});e.vocabularyBindings=[bind(e,'prompt',undefined,'release-only')];
 const initial=s.get('active'),first=stage(s,c),newer=structuredClone(c);newer.exercises.find(x=>x.id===e.id).vocabularyBindings[0].wordId='w-mi';
 const second=stage(s,newer);assert.notEqual(first.draftToken,second.draftToken);const before=dump(s);
 for(const operation of [()=>s.stage({baseRevisionId:initial,expectedDraftToken:first.draftToken,content:c}),()=>s.publish(initial,first.draftToken),()=>s.rollback(initial,initial,first.draftToken)]){assert.throws(operation,err=>err.status===409);assert.equal(dump(s),before);}
 const revision=publish(s,c);assert.deepEqual(s.dependencies('release-only').exercises,[e.id]);
 const invalid=s.snapshot();invalid.words=invalid.words.filter(w=>w.id!=='release-only');const preDelete=dump(s);assert.throws(()=>stage(s,invalid),/runtime ID/);assert.equal(dump(s),preDelete);
 const legal=structuredClone(invalid);legal.exercises.find(x=>x.id===e.id).vocabularyBindings=[];publish(s,legal);s.rollback(revision,s.get('active'),null);assert.deepEqual(s.snapshot().exercises.find(x=>x.id===e.id).vocabularyBindings,e.vocabularyBindings);
});

test('Release exact duplicate external rows have index semantics; prepared repeated and prefix tiles retain distinct occurrence IDs',t=>{
 const s=create(t),c=s.snapshot(),e=c.exercises.find(e=>e.type==='ordering');e.tokens=['SYNTHETIC repeated','SYNTHETIC repeated','SYNTHETIC last'];e.prefixTokenIndices=[1];
 e.vocabularyBindings=e.tokens.map((_,i)=>bind(e,'tokens',i,i===1?'w-ani':'w-mi','tile-'+i));
 const original=JSON.stringify(e);[e.tokens[0],e.tokens[1]]=[e.tokens[1],e.tokens[0]];assert.equal(JSON.stringify(e),original);validateExerciseVocabularyBindings(e,c.words);
 const projected=s.publicExercise(e,c),positions=projected.tokens.flatMap((text,index)=>text.startsWith('SYNTHETIC ')?[index]:[]);
 assert.deepEqual(projected.vocabularyBindings.map(b=>b.index),positions);assert.deepEqual(projected.prefixTokenIndices,[positions[1]]);
 assert.deepEqual(projected.vocabularyBindings.map(b=>[b.id,b.wordId]),[['tile-0','w-mi'],['tile-1','w-ani'],['tile-2','w-mi']]);
 [e.tokens[1],e.tokens[2]]=[e.tokens[2],e.tokens[1]];assert.throws(()=>validateExerciseVocabularyBindings(e,c.words),/sourceText/);
});

test('Release managed row eligibility never discloses locked forms or falls back to flat vocabulary',t=>{
 const s=create(t),c=s.snapshot(),e=c.exercises.find(e=>e.type==='cloze');e.vocabularyBindings=[bind(e,'prompt')];c.lexical=lexicalFixture();
 const word=c.lexical.words.find(w=>w.category==='verb');word.runtimeId='w-mi';word.approvalDigest=lexicalApprovalDigest(word);
 const project=()=>projectExerciseVocabulary(c,e.lessonId,w=>s.publicWord(w));
 const entry=project().byWordId['w-mi'];assert.equal(entry.kind,'lexical');assert.ok(entry.row.forms.some(f=>f.status==='eligible'));
 const locked=entry.row.forms.filter(f=>f.status==='locked');assert.ok(locked.length);for(const f of locked){assert.equal(f.value,undefined);assert.equal(f.values,undefined);}
 assert.equal(entry.row.sourceRecord,undefined);const before=JSON.stringify(c);project();assert.equal(JSON.stringify(c),before);
 c.lexical.introductions=c.lexical.introductions.filter(x=>x.wordKey!==word.wordKey);assert.equal(project().byWordId['w-mi'],undefined);assert.ok(c.words.some(w=>w.id==='w-mi'));
});
