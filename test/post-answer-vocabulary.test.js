import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {JSDOM} from 'jsdom';
import {Store,validateContent} from '../src/store.js';
import {projectExerciseVocabulary} from '../src/exercise-vocabulary.js';
import {lexicalFixture} from '../scripts/lexical-fixture.mjs';
import {lexicalApprovalDigest} from '../src/lexical-trust.js';
import {exerciseInput} from '../public/learner-view.js';
import {mountAnsweredVocabulary,exerciseVocabularyEntry} from '../public/post-answer-vocabulary.js';

const tables=s=>JSON.stringify(s.db.prepare("SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name").all().map(({name})=>[name,s.db.prepare('SELECT * FROM "'+name+'" ORDER BY 1').all()]));
function store(t){const s=new Store();t.after(()=>s.close());return s;}
function managed(c){c.lexical=lexicalFixture();const w=c.lexical.words[0];w.runtimeId='w-mi';w.approvalDigest=lexicalApprovalDigest(w);return w;}
function dom(t,content,e,result,mode='full'){
 const d=new JSDOM('<main><div data-exercise-input>'+exerciseInput(e,{mode,word:id=>content.words.find(w=>w.id===id),draft:{text:'WRONG',matching:{},selectedTokens:[]},result})+'</div></main>',{pretendToBeVisual:true});t.after(()=>d.window.close());
 const w=d.window,scope=w.document.querySelector('main');
 // Geometry stubs exercise lifecycle logic, not rendered/native acceptance.
 w.HTMLElement.prototype.getBoundingClientRect=function(){return {x:20,y:30,left:20,top:30,right:180,bottom:70,width:160,height:40};};
 w.HTMLElement.prototype.getClientRects=function(){return [this.getBoundingClientRect()];};
 const binding=mountAnsweredVocabulary(scope,{content,exercise:e,result,mode,isCurrent:()=>true});t.after(()=>binding?.destroy());return {w,scope,binding};
}
test('reminder projection is lesson scoped, response only, and preserves all storage/source/learner state',t=>{
 const s=store(t),before=tables(s),c=s.session('learner-demo','lesson-1').content;
 assert.deepEqual(Object.keys(c.exerciseVocabulary.byWordId).sort(),['w-ani','w-hi','w-hu','w-mi']);
 assert.equal(c.exerciseVocabulary.lessonId,'lesson-1');assert.equal(s.snapshot().exerciseVocabulary,undefined);assert.equal(s.bootstrap('learner-demo').content.exerciseVocabulary,undefined);
 assert.throws(()=>validateContent({...s.snapshot(),exerciseVocabulary:c.exerciseVocabulary}),/learner projection/);
 assert.equal(tables(s),before);
});
test('legacy exclusions, missing/duplicate IDs and absent projections fail closed without text fallback',t=>{
 const s=store(t),c=s.snapshot();c.words.find(w=>w.id==='w-mi').noVocab=true;
 const project=()=>projectExerciseVocabulary(c,'lesson-1',w=>s.publicWord(w));
 assert.equal(project().byWordId['w-mi'],undefined);delete c.words.find(w=>w.id==='w-mi').noVocab;
 c.words.push({...c.words.find(w=>w.id==='w-mi')});assert.equal(project().byWordId['w-mi'],undefined);
 c.words=c.words.filter(w=>w.id!=='w-mi');assert.equal(project().byWordId['w-mi'],undefined);
 assert.equal(exerciseVocabularyEntry({...c,exerciseVocabulary:null},{type:'recognition',wordId:'w-ani'},'w-ani'),null);
 const view=s.session('learner-demo','lesson-1').content;assert.equal(exerciseVocabularyEntry(view,{type:'recognition',wordId:'w-mi'},'w-ani'),null);
});
test('all managed identities deny flat fallback when pending, unavailable, conflicting, or unintroduced',t=>{
 for(const change of [w=>{w.identityReview={status:'pending'};},w=>{w.displayReview={status:'pending'};},(_w,c)=>{c.lexical.introductions=[];},w=>{w.fieldConflicts=['Synthetic unresolved'];}]){
  const s=store(t),c=s.snapshot(),w=managed(c);change(w,c);
  const view=projectExerciseVocabulary(c,'lesson-1',word=>s.publicWord(word));assert.equal(view.byWordId['w-mi'],undefined);
 }
});
test('referenced lexical entry beyond page 50 retains safe citation/forms and no Source merge',t=>{
 const s=store(t),c=s.snapshot(),w=managed(c);
 // Synthetic duplicates with independent keys/introduction identities, solely for paging regression.
 for(let i=0;i<55;i++){const copy=structuredClone(w);copy.wordKey='synthetic-extra-'+i;delete copy.runtimeId;copy.approvalDigest=lexicalApprovalDigest(copy);c.lexical.words.unshift(copy);const intro=c.lexical.introductions.find(i=>i.wordKey===w.wordKey);c.lexical.introductions.push({...intro,linkId:'synthetic-intro-'+i,wordKey:copy.wordKey});}
 const view=projectExerciseVocabulary(c,'lesson-1',word=>s.publicWord(word));assert.equal(view.byWordId['w-mi'].kind,'lexical');
 const row=view.byWordId['w-mi'].row;assert.equal(row.forms.filter(f=>f.status==='eligible').length,1);assert.ok(row.forms.filter(f=>f.status!=='eligible').every(f=>!f.value));assert.ok(row.citation);
 assert.equal(row.sourceRecord,undefined);assert.equal(row.sourceBrowse,undefined);
});
test('pinned session and saved-draft rehearsal resolve their own entries after publication changes',t=>{
 const s=store(t),session=s.session('learner-demo','lesson-1'),old=JSON.stringify(session.content.exerciseVocabulary),c=s.snapshot();c.words.find(w=>w.id==='w-mi').notes='Synthetic newer note';
 const staged=s.stage({baseRevisionId:s.get('active'),expectedDraftToken:null,content:c});const preview=s.previewSession({lessonId:'lesson-1',draftToken:staged.draftToken});
 assert.equal(preview.content.exerciseVocabulary.byWordId['w-mi'].word.notes,'Synthetic newer note');s.publish(s.get('active'),staged.draftToken);
 assert.equal(JSON.stringify(session.content.exerciseVocabulary),old);assert.notEqual(JSON.stringify(s.session('learner-core','lesson-1').content.exerciseVocabulary),old);
});
test('recognition correct/incorrect and restored feedback expose exact ID-backed word cards only after grading',t=>{
 const s=store(t),content=s.session('learner-demo','lesson-1').content,e=content.exercises.find(e=>e.type==='recognition');
 assert.equal(dom(t,content,e,null).scope.querySelector('[data-vocabulary-word]'),null);
 for(const correct of [true,false]){const {scope}=dom(t,content,e,{correct});const link=scope.querySelector('[data-vocabulary-word]');assert.equal(link.dataset.vocabularyWord,e.wordId);link.click();
  const card=scope.querySelector('.vocabulary-reminder');assert.ok(card.textContent.includes(content.words.find(w=>w.id===e.wordId).pointed));assert.equal(card.querySelector('[data-action=lookup],[data-action=enroll],[data-action=bookmark],textarea'),null);
 }
});
test('typing target card never labels arbitrary wrong learner text; matching wrong placement retains its explicit word ID',t=>{
 const s=store(t),content=s.session('learner-demo','lesson-1').content,typing=content.exercises.find(e=>e.type==='typing'),a=dom(t,content,typing,{correct:false});
 assert.equal(a.scope.querySelector('textarea').value,'WRONG');assert.equal(a.scope.querySelector('textarea').disabled,true);assert.equal(a.scope.querySelector('[data-vocabulary-word]').textContent,content.words.find(w=>w.id===typing.wordId).pointed);
 const matching=content.exercises.find(e=>e.type==='matching'),answer=Object.fromEntries(matching.wordIds.map((id,i)=>[id,content.words.find(w=>w.id===matching.wordIds[(i+1)%matching.wordIds.length]).english]));
 const b=dom(t,content,matching,{correct:false,answer,pairResults:{}});
 assert.equal(b.scope.querySelector('button button'),null);assert.equal(b.scope.querySelectorAll('[data-vocabulary-word]').length,matching.wordIds.length*2);
 for(const target of b.scope.querySelectorAll('[data-match-target]'))assert.equal(answer[target.querySelector('[data-vocabulary-word]').dataset.vocabularyWord],target.dataset.matchTarget);
});
test('unmapped exercise families and ambiguous spelling/phrases/punctuation remain inert; no guessed content bindings',t=>{
 const s=store(t),content=s.session('learner-demo','lesson-2').content;
 for(const e of content.exercises.filter(e=>['ordering','cloze','transformation'].includes(e.type))){const {scope}=dom(t,content,e,{correct:false});assert.equal(scope.querySelector('[data-vocabulary-word]'),null);}
 const e={type:'cloze',prompt:'מי? מי / מי אני',wordId:'w-mi',context:'מי?'};assert.equal(dom(t,content,e,{correct:true}).scope.querySelector('[data-vocabulary-word]'),null);
});
test('opening, pinning, disclosure and dismissal add no attempts/progress/cards or approvals',t=>{
 const s=store(t),session=s.session('learner-demo','lesson-1'),e=session.content.exercises.find(e=>e.type==='recognition'),result=s.attempt('learner-demo',{requestId:randomUUID(),revisionId:session.revisionId,lessonId:'lesson-1',exerciseId:e.id,answer:'WRONG'}),before=tables(s);
 const {scope,w,binding}=dom(t,session.content,e,result);const trigger=scope.querySelector('[data-vocabulary-word]');trigger.click();scope.querySelector('details').open=true;
 scope.querySelector('[data-vocabulary-close]').click();assert.equal(w.document.activeElement,trigger);trigger.click();binding.destroy();assert.equal(scope.querySelector('.vocabulary-reminder'),null);assert.equal(tables(s),before);
});
test('managed card reuses lexical disclosures once, omits mutation actions and keeps locked forms out of DOM',t=>{
 const s=store(t),c=s.snapshot();managed(c);const content=s.publicContent(c,'lesson-1'),e=content.exercises.find(e=>e.type==='recognition');const {scope}=dom(t,content,e,{correct:false});scope.querySelector('[data-vocabulary-word]').click();
 const card=scope.querySelector('.vocabulary-reminder');assert.ok(card.querySelector('.lexical-vocabulary'));assert.equal(card.querySelector('[data-action=lookup],[data-action=enroll]'),null);assert.ok(!card.textContent.includes('SYNTHETIC preposition.את'));
 const forms=card.querySelector('[data-lexical-toggle=forms]');forms.click();assert.equal(forms.getAttribute('aria-expanded'),'true');forms.click();assert.equal(forms.getAttribute('aria-expanded'),'false');
});
