import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {JSDOM} from 'jsdom';
import {Store,validateContent} from '../src/store.js';
import {createServer} from '../src/server.js';
import {lexicalFixture} from '../scripts/lexical-fixture.mjs';
import {lexicalApprovalDigest} from '../src/lexical-trust.js';
import {projectLexicalRows,lexicalCatalogue,lessonLexicalDiagnostics} from '../public/lexical-runtime.js';
import {slotsForCategory,computeEligibility} from '../public/lexical-contract.js';
import {mountUnifiedStudio} from '../public/studio/unified-studio.js';
import {renderLexicalVocabulary} from '../public/lexical-vocabulary.js';
import {createLearnerRenderer} from '../public/preview/learner-renderer.js';

const approved=revision=>({status:'approved',reviewedRevision:revision,reviewedBy:'synthetic-fixture-only',reviewedAt:'2026-10-18T00:00:00Z'});
const setup=t=>{const s=new Store(':memory:');t.after(()=>s.close());const c=s.snapshot();c.lexical=lexicalFixture();validateContent(c);s.set('active',s.addRevision(c,'Synthetic lexical integration fixture only'));return {s,c};};
const learnerState=s=>JSON.stringify(s.db.prepare('SELECT * FROM learners ORDER BY id').all());
const eligible=(c,lessonId,wordKey)=>computeEligibility(c.lexical,lexicalCatalogue(c),{courseId:'demo-foundations',lessonId,wordKey});

test('saved/reloaded scoped additions drive 3/7/10 prepositions, partial adjectives and tense progression',t=>{
 const {s,c}=setup(t),before=learnerState(s),base=s.get('active');
 const staged=s.stage({content:c,baseRevisionId:base,expectedDraftToken:null});
 for(const [lessonId,prep,adjective,verb] of [['lesson-1',3,1,1],['lesson-2',7,2,5],['lesson-3',10,4,14]]){
  const view=s.previewSession({draftToken:staged.draftToken,lessonId}).content.lexicalView;
  for(const [category,count] of [['Prepositions',prep],['Adjectives',adjective],['Verbs',verb]])assert.equal(view.rows.find(w=>w.category===category).forms.filter(f=>f.status==='eligible').length,count);
  const dom=new JSDOM(renderLexicalVocabulary(view.rows));assert.equal(dom.window.document.querySelector('[data-preposition-forms]').dataset.count,String(prep));dom.window.close();
 }
 assert.equal(learnerState(s),before);assert.equal(s.currentDraft().content.lexical.unlocks.length,c.lexical.unlocks.length);
 const citation=lesson=>projectLexicalRows(c,lesson).rows.find(w=>w.category==='Verbs').citation;
 assert.deepEqual(citation('lesson-1'),citation('lesson-3'));
 s.publish(base,staged.draftToken);assert.equal(s.session('learner-demo','lesson-2').content.lexicalView.rows.find(w=>w.category==='Prepositions').forms.filter(f=>f.status==='eligible').length,7);
});

test('authoritative reordering changes inheritance; empty later additions do not revoke; no word/course/class leakage',t=>{
 const {c}=setup(t);c.lexical.unlocks.push({unlockId:'empty',revision:'r',review:approved('r'),courseId:'demo-foundations',lessonId:'lesson-3',scope:{kind:'all',category:'preposition'},slotIds:[]});
 assert.equal(eligible(c,'lesson-3','synthetic-preposition').slots.filter(s=>s.introduced).length,10);
 c.lessons=[c.lessons[2],c.lessons[0],c.lessons[1]];
 assert.equal(eligible(c,'lesson-3','synthetic-preposition').wordAvailable,false);
 assert.equal(eligible(c,'lesson-1','synthetic-preposition').slots.filter(s=>s.introduced).length,6);
 c.lexical.unlocks=c.lexical.unlocks.filter(u=>u.scope.category!=='adjective');
 const word=c.lexical.words.find(w=>w.category==='adjective');c.lexical.classes=[{classId:'synthetic-class',category:'adjective',revision:'r',review:approved('r')}];
 const other=structuredClone(word);other.wordKey='synthetic-other';c.lexical.words.push(other);c.lexical.introductions.push({...c.lexical.introductions[1],linkId:'intro-other',wordKey:other.wordKey});
 c.lexical.unlocks.push({unlockId:'class',revision:'r',review:approved('r'),courseId:'demo-foundations',lessonId:'lesson-1',scope:{kind:'class',category:'adjective',classId:'synthetic-class'},slotIds:['adjective.fs']});
 assert.equal(eligible(c,'lesson-1',word.wordKey).slots[1].introduced,false);
 word.classMemberships.push({classId:'synthetic-class',review:approved(word.revision)});
 assert.equal(eligible(c,'lesson-1',word.wordKey).slots[1].introduced,true);assert.equal(eligible(c,'lesson-1',other.wordKey).slots[1].introduced,false);
 c.lexical.unlocks.push({unlockId:'word',revision:'r',review:approved('r'),courseId:'demo-foundations',lessonId:'lesson-1',scope:{kind:'word',category:'adjective',wordKey:word.wordKey},slotIds:['adjective.mp']});
 assert.equal(eligible(c,'lesson-1',word.wordKey).slots[2].introduced,true);assert.equal(eligible(c,'lesson-1',other.wordKey).slots[2].introduced,false);
 assert.equal(computeEligibility(c.lexical,lexicalCatalogue(c),{courseId:'another-course',lessonId:'lesson-1',wordKey:word.wordKey}).ok,false);
});

test('source-only, pending, missing, inapplicable and locked remain distinct; raw draft metadata never reaches learner JSON',t=>{
 const {s,c}=setup(t),word=c.lexical.words.find(w=>w.category==='preposition');
 word.forms[0]={slotId:word.forms[0].slotId,status:'missing',variants:[]};word.forms[1]={slotId:word.forms[1].slotId,status:'inapplicable',variants:[]};word.forms[2].variants[0].review={status:'pending'};word.approvalDigest=lexicalApprovalDigest(word);
 const states=eligible(c,'lesson-1',word.wordKey).slots.map(s=>s.state);assert.deepEqual(states.slice(0,4),['missing','inapplicable','unapproved','locked']);
 c.lexical.archive={privateDraft:'NEVER_LEAK_THIS'};const output=s.publicContent(c,'lesson-1');assert.equal(output.lexical,undefined);assert.ok(!JSON.stringify(output).includes('NEVER_LEAK_THIS'));assert.ok(!JSON.stringify(output).includes('SYNTHETIC preposition.את'));
 const html=renderLexicalVocabulary(output.lexicalView.rows);assert.match(html,/Source missing/);assert.match(html,/Not applicable/);assert.match(html,/Awaiting approval/);
});

test('exact reviewed payload and source promotion are protected at stage, publish and restore validation',t=>{
 const {s,c}=setup(t);const changed=structuredClone(c);changed.lexical.words[0].display.english.text='UNREVIEWED';assert.throws(()=>validateContent(changed),/approval/);
 changed.lexical.words[0].approvalDigest=lexicalApprovalDigest(changed.lexical.words[0]);assert.throws(()=>s.stage({content:changed,baseRevisionId:s.get('active'),expectedDraftToken:null}),/trusted content review/);
 const pending=structuredClone(c.lexical.words[0]);pending.wordKey='pending';pending.identityReview={status:'pending'};pending.displayReview={status:'pending'};c.lexical.words.push(pending);
 const draft=s.stage({content:c,baseRevisionId:s.get('active'),expectedDraftToken:null});assert.ok(draft.draftToken);
 c.lexical.words.at(-1).identityReview=approved(pending.revision);c.lexical.words.at(-1).approvalDigest=lexicalApprovalDigest(c.lexical.words.at(-1));assert.throws(()=>s.stage({content:c,baseRevisionId:s.get('active'),expectedDraftToken:draft.draftToken}),/trusted content review/);
 const forged=s.backup();const sourceWord=forged.content.lexical.words[0];sourceWord.display.english.text='FORGED APPROVAL';sourceWord.approvalDigest=lexicalApprovalDigest(sourceWord);forged.revisionSnapshots.find(r=>r.revisionId===forged.activeRevisionId).content=structuredClone(forged.content);assert.throws(()=>s.restore(forged),/not previously trusted/);
 const old=s.backup();old.content.lexical.version='unknown';const before=learnerState(s);assert.throws(()=>s.restore(old),/lexical contract/);assert.equal(learnerState(s),before);
});

test('persistent reopen, backup and restore preserve lexical rows, references and exact existing review schedules',t=>{
 const dir=mkdtempSync(join(tmpdir(),'hebleo-lexical-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));let s=new Store(join(dir,'test.sqlite'));const c=s.snapshot();c.lexical=lexicalFixture();const id=s.addRevision(c,'Synthetic persistence fixture');s.set('active',id);const before=learnerState(s);s.stage({content:c,baseRevisionId:id,expectedDraftToken:null});s.close();s=new Store(join(dir,'test.sqlite'));try{assert.deepEqual(s.currentDraft().content.lexical,c.lexical);assert.equal(learnerState(s),before);const backup=s.backup();s.restore(backup);assert.equal(learnerState(s),before);assert.deepEqual(s.snapshot().lexical,c.lexical);}finally{s.close();}
});

test('dynamic lesson titles follow rename; unknown and unconnected references are explicit',t=>{
 const {c}=setup(t);c.lessons[0].title='Synthetic renamed lesson';const d=lessonLexicalDiagnostics(c,'lesson-1','synthetic-verb');assert.ok(d.titles.every(t=>t.title==='Synthetic renamed lesson'));
 assert.equal(projectLexicalRows(c,'unknown').status,'unknown-lesson');
});

test('display approval remains separate from identity, and shared cells require reviewed explicit metadata',t=>{
 const {c}=setup(t),word=c.lexical.words[0];word.displayReview={status:'pending'};assert.equal(projectLexicalRows(c,'lesson-3').rows.some(w=>w.wordKey===word.wordKey),false);word.displayReview=approved(word.revision);
 const ids=['verb.future.אתם','verb.future.אתן'];for(const id of ids){const variant=word.forms.find(f=>f.slotId===id).variants[0];variant.representations.pointed={text:'SYNTHETIC SHARED'};}
 let forms=projectLexicalRows(c,'lesson-3').rows.find(w=>w.wordKey===word.wordKey).forms;assert.equal(forms.filter(f=>ids.includes(f.slotId)).length,2);
 word.sharedScopes=[{slotIds:ids,review:{status:'pending'}}];assert.equal(projectLexicalRows(c,'lesson-3').rows.find(w=>w.wordKey===word.wordKey).forms.filter(f=>ids.includes(f.slotId)).length,2);
 word.sharedScopes[0].review=approved(word.revision);forms=projectLexicalRows(c,'lesson-3').rows.find(w=>w.wordKey===word.wordKey).forms;assert.equal(forms.filter(f=>ids.includes(f.slotId)).length,1);assert.deepEqual(forms.find(f=>f.sharedSlotIds)?.introducedGenders,['m','f']);
});

test('lexical paging and filters operate on safe contextual records; source-only values never match search',t=>{
 const {c}=setup(t);assert.equal(projectLexicalRows(c,'lesson-1',{search:'SYNTHETIC verb.future.I'}).total,0);assert.equal(projectLexicalRows(c,'lesson-3',{search:'SYNTHETIC verb.future.I'}).total,1);
 const original=c.lexical.words[1];for(let i=0;i<53;i++){const copy=structuredClone(original);copy.wordKey='synthetic-paged-'+i;copy.display.english={text:'Unique fixture '+i};c.lexical.words.push(copy);c.lexical.introductions.push({...c.lexical.introductions[1],linkId:'paged-'+i,wordKey:copy.wordKey});}
 assert.equal(projectLexicalRows(c,'lesson-3').rows.length,50);const next=projectLexicalRows(c,'lesson-3',{offset:50});assert.equal(next.rows.length,6);assert.equal(next.total,56);assert.equal(projectLexicalRows(c,'lesson-3',{offset:9999}).offset,50);assert.equal(projectLexicalRows(c,'lesson-3',{search:'Unique fixture 52'}).rows[0].wordKey,'synthetic-paged-52');assert.equal(projectLexicalRows(c,'lesson-3',{usedLessonId:'lesson-2'}).total,0);
});

test('actual card migration preview reports many-to-one schedule conflicts without changing IDs or schedules',t=>{
 const {s,c}=setup(t);s.enroll('learner-demo',c.words[0].id);s.enroll('learner-demo',c.words[1].id);const before=learnerState(s),staged=s.stage({content:c,baseRevisionId:s.get('active'),expectedDraftToken:null});
 const mappings=c.words.slice(0,2).map(w=>({legacyWordId:w.id,wordKey:'synthetic-verb',revision:'r',review:approved('r')}));
 const preview=s.lexicalMigrationPreview({draftToken:staged.draftToken,mappings});assert.equal(preview.canApply,false);assert.ok(preview.conflicts.some(c=>c.code==='multiple-schedules'));assert.equal(learnerState(s),before);assert.equal(preview.reverseMappings.length,2);
});

test('Studio settings retain letter behavior and sibling edits through Save, reload, inherited preview and CAS rejection',async t=>{
 const {s,c}=setup(t),dom=new JSDOM('<main></main>',{url:'http://127.0.0.1',pretendToBeVisual:true}),host=dom.window.document.querySelector('main');let seq=0;
 const mount=mountUnifiedStudio(host,{content:c,lessonId:'lesson-2',baseRevisionId:s.get('active'),newId:prefix=>prefix+'-'+(++seq),saveDraft:input=>Promise.resolve(s.stage(input))});t.after(()=>{mount.dispose();dom.window.close();});
 const category=host.querySelector('[data-lex-category]');category.value='preposition';category.dispatchEvent(new dom.window.Event('change',{bubbles:true}));
 host.querySelector('[data-lex-slot][value="preposition.הם"]').checked=true;host.querySelector('[data-lex-add]').click();
 const title=host.querySelector('[name=title]');title.value='Synthetic saved title';title.dispatchEvent(new dom.window.Event('input',{bubbles:true}));
 const letters=host.querySelector('[name=introducedLetters]');letters.value='אב';letters.dispatchEvent(new dom.window.Event('input',{bubbles:true}));
 await mount.save();const saved=s.currentDraft();assert.equal(saved.content.lessons[1].title,'Synthetic saved title');assert.equal(saved.content.lessons[1].introducedLetters,'אב');assert.equal(eligible(saved.content,'lesson-2','synthetic-preposition').slots.filter(s=>s.introduced).length,8);
 assert.equal(s.previewSession({draftToken:saved.draftToken,lessonId:'lesson-2'}).content.lexicalView.rows.find(w=>w.category==='Prepositions').forms.filter(f=>f.status==='eligible').length,8);
 assert.match(host.querySelector('[data-lex-preview-result]').textContent,/Inherited/);
 s.stage({baseRevisionId:s.get('active'),expectedDraftToken:saved.draftToken,word:{id:c.words[0].id,notes:'Other synthetic tab'}});
 await assert.rejects(mount.save(),/draft changed elsewhere/i);assert.equal(title.isConnected,false);assert.equal(host.querySelector('[name=title]').value,'Synthetic saved title');
});

test('actual rehearsal renderer uses saved projection and keeps forms above notes with accessible RTL markup',t=>{
 const {s,c}=setup(t),publicContent=s.publicContent(c,'lesson-2'),dom=new JSDOM('<main></main>',{pretendToBeVisual:true});const renderer=createLearnerRenderer();
 const dispose=renderer.mount(dom.window.document.querySelector('main'),{content:publicContent,lessonId:'lesson-2',step:'vocabulary',preferences:{},actions:{}});t.after(()=>{dispose();dom.window.close();});
 const doc=dom.window.document;assert.equal(doc.querySelectorAll('[data-word-key]').length,3);const verb=doc.querySelector('[data-word-key="synthetic-verb"]');assert.ok(verb.querySelector('.lexical-forms-row').compareDocumentPosition(verb.querySelector('.lexical-support-row'))&dom.window.Node.DOCUMENT_POSITION_FOLLOWING);assert.ok(doc.querySelector('bdi[lang=he][dir=rtl]'));assert.ok(doc.querySelector('button[aria-expanded][aria-controls]'));
});

test('HTTP author boundary, exact draft preview, lexical pages, invalid import and public data isolation',async t=>{
 const {s,c}=setup(t),server=createServer(s);await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));const origin='http://127.0.0.1:'+server.address().port;
 const post=(path,body,user='author-demo')=>fetch(origin+'/api/'+path,{method:'POST',headers:{'content-type':'application/json','x-demo-user':user},body:JSON.stringify(body)});
 assert.equal((await post('studio/lexical/import-preview',{},'learner-demo')).status,403);
 const staged=await (await post('studio/draft',{baseRevisionId:s.get('active'),expectedDraftToken:null,content:c})).json();assert.ok(staged.draftToken);
 const preview=await (await post('studio/preview/session',{draftToken:staged.draftToken,lessonId:'lesson-3'})).json();assert.equal(preview.content.lexicalView.rows.length,3);assert.equal(preview.content.lexical,undefined);
 const view=await (await fetch(origin+'/api/lexical?lessonId=lesson-2')).json();assert.equal(view.rows.find(w=>w.category==='Prepositions').forms.filter(f=>f.status==='eligible').length,7);
 assert.equal((await post('studio/lexical/import-preview',{})).status,400);
});
