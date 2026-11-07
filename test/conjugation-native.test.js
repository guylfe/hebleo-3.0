import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {IDBFactory} from 'fake-indexeddb';
import {marked} from 'marked';
import createPurifier from 'dompurify';
import {Store,validateContent} from '../src/store.js';
import {createServer} from '../src/server.js';
import {validateConjugationCatalog} from '../src/conjugation.js';
import {selectableConjugationForms} from '../public/conjugation-contract.js';
import {mountNativeConjugation} from '../public/native-conjugation.js';
import {mountUnifiedStudio} from '../public/studio/unified-studio.js';
import {createStudioWorkspace} from '../public/studio/workspace.js';
import {projectLesson} from '../public/course.js';
import {createLessonRenderer} from '../public/rich.js';

// Invented, explicitly labeled test data. Never copied to the learner catalog.
const form=(id,extra={})=>({id,wordId:'fixture-verb',tense:'past',person:'1',pronoun:'I (synthetic)',gender:'common',number:'singular',pointed:'אֶ',unpointed:'א',english:'Synthetic answer',acceptedHebrew:[],acceptedEnglish:[],approval:'fixture',provenance:[{kind:'synthetic-test',source:'test/conjugation-native.test.js'}],...extra});
const fixtureCatalog=()=>({schemaVersion:1,status:'SYNTHETIC TEST FIXTURE',words:[{id:'fixture-verb',kind:'verb',pointed:'אֶ–בֶ',unpointed:'א–ב'},{id:'fixture-prep',kind:'prep',pointed:'בֶ',unpointed:'ב'}],forms:[
  form('fixture-verb:past-1-common-singular'),form('fixture-verb:past-1-common-plural',{pronoun:'We (synthetic)',number:'plural'}),
  form('fixture-prep:preposition-1-common-singular',{wordId:'fixture-prep',tense:'preposition'}),form('fixture-prep:preposition-1-common-plural',{wordId:'fixture-prep',tense:'preposition',number:'plural'}),
  form('fixture-verb:held',{approval:'held'}),form('fixture-verb:attested',{approval:'source-attested'})]});
const F1='fixture-verb:past-1-common-singular',F2='fixture-verb:past-1-common-plural',P1='fixture-prep:preposition-1-common-singular',P2='fixture-prep:preposition-1-common-plural';
const makeStore=()=>new Store(':memory:',{conjugationTestCatalog:fixtureCatalog()});
const tables=s=>s.db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(({name})=>[name,s.db.prepare('SELECT * FROM '+name+' ORDER BY rowid').all()]);
const dom=()=>new JSDOM('<main></main>',{url:'http://127.0.0.1/',pretendToBeVisual:true});
async function until(fn){const end=Date.now()+5000;while(Date.now()<end){if(fn())return;await new Promise(r=>setTimeout(r,5));}throw new Error('Test condition did not settle.');}
async function http(t,store=makeStore()){
  const server=createServer(store);await new Promise(r=>server.listen(0,'127.0.0.1',r));
  t.after(async()=>{await new Promise(r=>server.close(r));store.close();});
  const origin='http://127.0.0.1:'+server.address().port,calls=[];
  const api=async(path,input,user='author-demo')=>{calls.push({path,user,method:input===undefined?'GET':'POST'});const r=await fetch(origin+'/api/'+path,{method:input===undefined?'GET':'POST',headers:{'x-demo-user':user,...(input===undefined?{}:{'content-type':'application/json'})},...(input===undefined?{}:{body:JSON.stringify(input)})});const body=await r.json();if(!r.ok)throw Object.assign(new Error(body.error),{status:r.status,...body});return body;};
  return {store,origin,api,calls};
}
function publish(s,mutate){const content=s.currentDraft()?.content||s.snapshot();mutate(content);const revision=s.get('active'),draft=s.stage({baseRevisionId:revision,expectedDraftToken:s.currentDraft()?.draftToken??null,content});s.publish(revision,draft.draftToken);return s.get('active');}
function answer(s,revision,exercise){const c=s.snapshot(revision);if(exercise.type==='recognition')return c.words.find(w=>w.id===exercise.wordId).english;if(exercise.type==='typing')return exercise.answers?.[0]||c.words.find(w=>w.id===exercise.wordId).pointed;if(exercise.type==='matching')return Object.fromEntries(exercise.wordIds.map(id=>[id,c.words.find(w=>w.id===id).english]));return exercise.answers[0];}
function finishQuestions(s,revision,lessonId='lesson-1',user='learner-demo') {const c=s.snapshot(revision),l=c.lessons.find(l=>l.id===lessonId);for(const id of l.exerciseIds){const e=c.exercises.find(e=>e.id===id);const result=s.attempt(user,{requestId:'test-'+revision+'-'+id,exerciseId:id,lessonId,revisionId:revision,answer:answer(s,revision,e)});assert.equal(result.correct,true);} }
function position(revisionId,step='learn'){return {lessonId:'lesson-1',revisionId,step,question:0,answer:'',matching:{},selectedTokens:[],practiceIds:[]};}

test('production has no fixture key; injection is restricted to disposable in-memory Stores',t=>{
  const s=new Store();t.after(()=>s.close());assert.equal(s.conjugation('learner-demo').allowFixtures,false);
  assert.equal(s.conjugation('learner-demo').catalog.forms.some(f=>f.approval==='fixture'),false);
  assert.throws(()=>new Store('never-created.sqlite',{conjugationTestCatalog:fixtureCatalog()}),/in-memory/);
  assert.throws(()=>validateConjugationCatalog(fixtureCatalog()),/excluded/);
  assert.deepEqual(selectableConjugationForms(fixtureCatalog()),[]);
  assert.deepEqual(selectableConjugationForms(fixtureCatalog(),{allowFixtures:'true'}),[]);
  assert.equal(selectableConjugationForms(fixtureCatalog(),{allowFixtures:true}).length,4);
  const c=s.snapshot();c.lessons[0].conjugationUnlocks={formIds:[F1]};assert.throws(()=>validateContent(c),/unknown or not approved/);
});

test('catalog rejects malformed safe-key and approval records independently of the view',()=>{
  for(const mutate of [c=>c.forms.push(c.forms[0]),c=>c.words[0].id='constructor',c=>c.forms[0].wordId='missing',c=>c.forms[0].approval='yes',c=>c.forms[0].unpointed='',c=>c.forms[0].tense='gerund',c=>c.forms[0].acceptedEnglish=[null],c=>c.forms[0].provenance=[]]){
    const c=fixtureCatalog();mutate(c);assert.throws(()=>validateConjugationCatalog(c,{allowFixtures:true}));
  }
});

test('bad unlock IDs and whole-word shortcuts fail atomically, including held, attested and duplicates',t=>{
  const s=makeStore();t.after(()=>s.close());const before=tables(s);
  for(const value of [null,[],{}, {formIds:'all'},{wordIds:['fixture-verb']},{formIds:[F1],wordIds:[]},{formIds:[F1,F1]},{formIds:['missing']},{formIds:['constructor']},{formIds:['../catalog']},{formIds:['fixture-verb:held']},{formIds:['fixture-verb:attested']}]){
    const content=s.snapshot();content.lessons[0].conjugationUnlocks=value;
    assert.throws(()=>s.stage({baseRevisionId:s.get('active'),expectedDraftToken:null,content}),/conjugation|Conjugation/);assert.deepEqual(tables(s),before);
  }
});

test('actual Studio collector and HTTP Save/reload retain exact partial forms, sibling edits and scoped publication',async t=>{
  const {store:s,api,calls}=await http(t),original=s.snapshot(),initial=await api('studio'),d=dom(),host=d.window.document.querySelector('main');
  const coordinator=createStudioWorkspace({content:initial.content,publishedContent:initial.content,baseRevisionId:initial.revisionId,saveDraft:input=>api('studio/draft',input),yieldSave:async()=>{}});
  let saved=false;const h=mountUnifiedStudio(host,{coordinator,content:initial.content,lessonId:'lesson-1',conjugationCatalog:initial.conjugationCatalog,conjugationFixtureMode:initial.conjugationFixtureMode,onSaved:()=>{saved=true;}});t.after(()=>{h.dispose();d.window.close();});
  const before=tables(s);assert.match(host.textContent,/SYNTHETIC TEST FIXTURE/);assert.deepEqual(tables(s),before);
  assert.equal(host.querySelector('[data-conjugation-form="fixture-verb:held"]'),null);
  host.querySelector('[data-conjugation-form="'+F1+'"]').click();host.querySelector('[data-conjugation-word="fixture-prep"]').click();
  assert.match(host.textContent,/1 of 2 available forms selected/);
  const title=host.querySelector('[data-lesson-metadata] [name=title]');title.value='Synthetic title edit';title.dispatchEvent(new d.window.Event('input',{bubbles:true}));
  const prompt=host.querySelector('[data-owned-exercise="ex-1-type"] [name=prompt]');prompt.value='Synthetic sibling prompt';prompt.dispatchEvent(new d.window.Event('input',{bubbles:true}));
  assert.equal(coordinator.dirty,true);host.querySelector('[data-save-workspace]').click();await until(()=>saved);
  const reloaded=await api('studio'),lesson=reloaded.draft.content.lessons[0];
  assert.deepEqual(lesson.conjugationUnlocks.formIds,[F1,P1,P2]);assert.equal(lesson.title,title.value);assert.equal(reloaded.draft.content.exercises.find(e=>e.id==='ex-1-type').prompt,prompt.value);
  assert.deepEqual(reloaded.draft.content.words,original.words);assert.deepEqual(s.snapshot(),original);assert.deepEqual(s.learner('learner-demo').conjugationLearnedFormIds,[]);
  assert.ok(calls.some(c=>c.path==='studio/draft'&&c.method==='POST'));
  const d2=dom(),h2=mountUnifiedStudio(d2.window.document.querySelector('main'),{content:reloaded.draft.content,lessonId:'lesson-1',baseRevisionId:reloaded.revisionId,expectedDraftToken:reloaded.draft.draftToken,saveDraft:input=>api('studio/draft',input),conjugationCatalog:reloaded.conjugationCatalog,conjugationFixtureMode:true});
  assert.equal(d2.window.document.querySelector('[data-conjugation-form="'+F1+'"]').checked,true);assert.equal(d2.window.document.querySelector('[data-conjugation-form="'+F2+'"]').checked,false);h2.dispose();d2.window.close();
  const scope={lessonId:'lesson-1',baseRevisionId:reloaded.revisionId,expectedDraftToken:reloaded.draft.draftToken,includeDependencies:[{kind:'exercises',id:'ex-1-type',action:'changed'}]};
  const review=await api('studio/publish-lesson/review',scope);assert.equal(review.canPublish,true,JSON.stringify(review.blockers));await api('studio/publish-lesson',{...scope,reviewToken:review.reviewToken});
  assert.deepEqual(s.snapshot().lessons[0].conjugationUnlocks.formIds,[F1,P1,P2]);assert.deepEqual(s.snapshot().lessons.slice(1),original.lessons.slice(1));
  assert.deepEqual((await api('bootstrap',undefined,'learner-demo')).learner.conjugationLearnedFormIds,[]);
});

test('Studio CAS failure retains unlock inputs; empty catalog never drops existing metadata on mount',async t=>{
  const s=makeStore();t.after(()=>s.close());const d=dom(),h=mountUnifiedStudio(d.window.document.querySelector('main'),{content:s.snapshot(),lessonId:'lesson-1',baseRevisionId:s.get('active'),conjugationCatalog:fixtureCatalog(),conjugationFixtureMode:true,saveDraft:i=>s.stage(i)});t.after(()=>{h.dispose();d.window.close();});
  d.window.document.querySelector('[data-conjugation-form="'+F1+'"]').click();s.stage({baseRevisionId:s.get('active'),expectedDraftToken:null,word:{id:'w-ani',notes:'Another author tab'}});const before=tables(s);await assert.rejects(h.save(),/draft changed/i);assert.deepEqual(tables(s),before);assert.equal(d.window.document.querySelector('[data-conjugation-form="'+F1+'"]').checked,true);
  const c=s.snapshot();c.lessons[0].conjugationUnlocks={formIds:[F1]};const d2=dom(),h2=mountUnifiedStudio(d2.window.document.querySelector('main'),{content:c,lessonId:'lesson-1',saveDraft:()=>{}});assert.match(d2.window.document.body.textContent,/No approved forms/);assert.match(d2.window.document.body.textContent,/Unavailable selection retained/);assert.deepEqual(h2.getContent().lessons[0].conjugationUnlocks,{formIds:[F1]});h2.dispose();d2.window.close();
});

test('open, author preview, practice ahead, and client preferences never grant forms or change cards',async t=>{
  const {store:s,api}=await http(t);const rev=publish(s,c=>c.lessons[0].conjugationUnlocks={formIds:[F1]});const before=tables(s);
  await api('session?lessonId=lesson-1',undefined,'learner-demo');await api('conjugation',undefined,'learner-demo');s.practice('learner-demo',{revisionId:rev,lessonId:'lesson-1'});
  assert.deepEqual(tables(s),before);
  const draft=s.stage({baseRevisionId:rev,expectedDraftToken:null,content:s.snapshot()}),beforePreview=tables(s);s.previewSession({draftToken:draft.draftToken,lessonId:'lesson-1'});assert.deepEqual(tables(s),beforePreview);
  const state=s.learner('learner-demo');await api('preferences',{conjugationLearnedFormIds:[F1,F2],completed:['lesson-1']},'learner-demo');assert.deepEqual(s.learner('learner-demo'),state);
  await assert.rejects(api('conjugation',{learnedIds:[F1]},'learner-demo'),e=>e.status===404);assert.deepEqual(s.learner('learner-demo').cards,state.cards);
});

test('completion unions only authored partial slots from the actual pinned revision, per learner, idempotently',async t=>{
  const {store:s,api}=await http(t);const rev=publish(s,c=>c.lessons[0].conjugationUnlocks={formIds:[F1,P1]});
  s.saveProgress('learner-demo',position(rev));const otherBefore=s.learner('learner-core');
  publish(s,c=>c.lessons[0].conjugationUnlocks={formIds:[F2,P2]});assert.equal(s.session('learner-demo','lesson-1').revisionId,rev);
  finishQuestions(s,rev);assert.deepEqual(s.learner('learner-demo').conjugationLearnedFormIds,[F1,P1]);assert.deepEqual(s.learner('learner-core'),otherBefore);
  const persisted=s.learner('learner-demo');finishQuestions(s,rev);assert.deepEqual(s.learner('learner-demo'),persisted);
  assert.deepEqual((await api('bootstrap',undefined,'learner-demo')).learner.conjugationLearnedFormIds,[F1,P1]);assert.deepEqual((await api('conjugation',undefined,'learner-core')).learnedIds,[]);
  finishQuestions(s,s.get('active'),'lesson-1','learner-core');assert.deepEqual(s.learner('learner-core').conjugationLearnedFormIds,[F2,P2]);
  const cards=s.learner('learner-demo').cards;await api('conjugation',undefined,'learner-demo');assert.deepEqual(s.learner('learner-demo').cards,cards);
  const backup=s.backup(),restored=makeStore();t.after(()=>restored.close());restored.restore(backup);assert.deepEqual(restored.learner('learner-demo').conjugationLearnedFormIds,[F1,P1]);assert.deepEqual(restored.learner('learner-demo').cards,cards);
});

test('questionless Finish grants exact forms only after the actual text-page gate passes',t=>{
  const s=makeStore();t.after(()=>s.close());let componentId;
  const rev=publish(s,c=>{const l=c.lessons[0];l.exerciseIds=[];l.checkExerciseIds=[];c.exercises=c.exercises.filter(e=>e.lessonId!==l.id);l.conjugationUnlocks={formIds:[F2]};c.lessons[0]=projectLesson(c,l);const b=c.lessons[0].blocks.find(b=>b.type==='explanation');componentId=b.id;b.textPages={version:1,pages:[{id:'fixture-recall',type:'recall',title:'Synthetic recall',prompt:'Try a synthetic answer',answer:'Synthetic model',grading:'self-check',gate:'reveal'}],order:['fixture-recall']};});
  const finish={...position(rev,'complete'),componentId:null};
  s.session('learner-demo','lesson-1');s.saveProgress('learner-demo',{...position(rev),componentId});assert.deepEqual(s.learner('learner-demo').conjugationLearnedFormIds,[]);
  const before=tables(s);assert.throws(()=>s.saveProgress('learner-demo',finish),/required text-page/);assert.deepEqual(tables(s),before);
  s.saveTextProgress('learner-demo',{lessonId:'lesson-1',revisionId:rev,componentId,pageId:'fixture-recall',cursorPageId:'fixture-recall',response:{text:'Synthetic attempt',revealed:true}});
  assert.deepEqual(s.learner('learner-demo').conjugationLearnedFormIds,[]);s.saveProgress('learner-demo',finish);assert.deepEqual(s.learner('learner-demo').conjugationLearnedFormIds,[F2]);s.saveProgress('learner-demo',finish);assert.deepEqual(s.learner('learner-demo').conjugationLearnedFormIds,[F2]);
});

test('later catalog additions never expand a saved preposition selection or historical defaults',t=>{
  const s=makeStore();t.after(()=>s.close());const rev=publish(s,c=>c.lessons[0].conjugationUnlocks={formIds:[P1,P2]});finishQuestions(s,rev);
  const larger=fixtureCatalog();larger.forms.push(form('fixture-prep:preposition-3-masculine-singular',{wordId:'fixture-prep',tense:'preposition',person:'3',gender:'masculine'}));
  const restored=new Store(':memory:',{conjugationTestCatalog:larger});t.after(()=>restored.close());restored.restore(s.backup());
  assert.deepEqual(restored.snapshot().lessons[0].conjugationUnlocks.formIds,[P1,P2]);assert.deepEqual(restored.conjugation('learner-demo').learnedIds,[P1,P2]);
  finishQuestions(restored,restored.get('active'),'lesson-1','learner-core');assert.deepEqual(restored.conjugation('learner-core').learnedIds,[P1,P2]);
});

test('completion and unlocks roll back together if the learner write fails after writing',t=>{
  const s=makeStore();t.after(()=>s.close());const rev=publish(s,c=>c.lessons[0].conjugationUnlocks={formIds:[F1]});
  const c=s.snapshot(),l=c.lessons[0];for(const id of l.exerciseIds.slice(0,-1)){const e=c.exercises.find(e=>e.id===id);s.attempt('learner-demo',{requestId:'atomic-'+id,lessonId:l.id,exerciseId:id,revisionId:rev,answer:answer(s,rev,e)});}
  const before=tables(s),save=s.saveLearner;s.saveLearner=function(...args){save.apply(this,args);throw new Error('Synthetic disk-write failure');};const e=c.exercises.find(e=>e.id===l.exerciseIds.at(-1));
  assert.throws(()=>s.attempt('learner-demo',{requestId:'atomic-final',lessonId:l.id,exerciseId:e.id,revisionId:rev,answer:answer(s,rev,e)}),/Synthetic disk/);assert.deepEqual(tables(s),before);s.saveLearner=save;
});

test('legacy learners default empty on read without writes, and malformed learned lists cannot be restored',t=>{
  const s=makeStore();t.after(()=>s.close());const old=s.learner('learner-demo');delete old.conjugationLearnedFormIds;s.saveLearner('learner-demo',old);const before=tables(s);assert.deepEqual(s.bootstrap('learner-demo').learner.conjugationLearnedFormIds,[]);assert.deepEqual(tables(s),before);
  for(const ids of [['constructor'],[F1,F1],'all']){const b=s.backup();b.learners[0].state.conjugationLearnedFormIds=ids;assert.throws(()=>s.restore(b),/form IDs/);assert.deepEqual(tables(s),before);}
});

test('native mount passes the fixed API, owner-scoped preferences and read-only learned IDs; destroy cleans up',async()=>{
  const d=dom(),host=d.window.document.querySelector('main'),calls=[];let destroyed=0,options;
  const h=mountNativeConjugation(host,{userId:'learner-core',api:async(...args)=>{calls.push(args);return {catalog:fixtureCatalog(),learnedIds:[F1],allowFixtures:true};},loadView:async()=>({mountConjugation:(_root,input)=>{options=input;return {destroy(){destroyed++;}};}})});
  await h.ready;assert.deepEqual(calls,[['conjugation',undefined,'learner-core']]);assert.equal(options.platform,'native');assert.deepEqual(options.learnedIds,[F1]);assert.equal(options.storageKey,'hebleo-conjugation-v1-learner-core');assert.equal(options.allowFixtures,true);assert.match(host.textContent,/SYNTHETIC TEST FIXTURE/);h.destroy();assert.equal(destroyed,1);assert.equal(host.children.length,0);d.window.close();
});

test('native loading failure supports retry, and departed async loads cannot mount another learner view',async()=>{
  const d=dom(),host=d.window.document.querySelector('main');let finish,mounts=0,attempts=0;
  const h=mountNativeConjugation(host,{userId:'learner-demo',api:async()=>{if(++attempts===1)throw new Error('Synthetic offline');return new Promise(r=>finish=r);},loadView:async()=>({mountConjugation:()=>{mounts++;return {destroy(){}};}})});
  await h.ready;assert.match(host.textContent,/could not load/);host.querySelector('button').click();assert.match(host.textContent,/Loading/);h.destroy();finish({catalog:fixtureCatalog(),learnedIds:[],allowFixtures:true});await new Promise(r=>setTimeout(r,0));assert.equal(mounts,0);assert.equal(host.children.length,0);d.window.close();
});

test('HTTP access follows existing course entitlement; catalogs are read-only and only fixed assets are served',async t=>{
  const {store:s,api,origin}=await http(t);const state=s.learner('learner-core');state.purchasedCourses=[];s.saveLearner('learner-core',state);await assert.rejects(api('conjugation',undefined,'learner-core'),e=>e.status===403);
  await assert.rejects(api('studio',undefined,'learner-demo'),e=>e.status===403);
  for(const path of ['/native-conjugation.js','/conjugation-contract.js','/studio/conjugation-unlocks.js','/conjugation/help.js','/conjugation/help.css','/conjugation/read-only-dialog.js'])assert.equal((await fetch(origin+path)).status,200);
  for(const path of ['/src/conjugation.js','/conjugation/catalog.json','/test/conjugation-native.test.js'])assert.equal((await fetch(origin+path)).status,404);
});

test('real app #conjugation navigation, profile change and page restore preserve teaching and card state',async t=>{
  const {store:s,origin}=await http(t),d=new JSDOM('<div id="app"></div><div id="toast"></div>',{url:origin+'/#conjugation',runScripts:'outside-only',pretendToBeVisual:true}),w=d.window;
  t.after(()=>w.close());w.matchMedia=()=>({matches:true});w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.structuredClone=structuredClone;
  w.fetch=(url,options={})=>fetch(new URL(url,origin),options);
  const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
  for(const match of source.matchAll(/^import \{([^}]+)\} from '([^']+)';/gm)){
    if(match[2]==='./rich-browser.js')continue;
    const module=await import(new URL('../public/'+match[2].slice(2),import.meta.url));
    for(const name of match[1].split(',').map(n=>n.trim()))w[name]=module[name];
  }
  w.renderLesson=createLessonRenderer(marked,createPurifier(w),w.document);let queue,destroyed=0,mountedOptions;
  const createSave=w.createReviewSave;w.createReviewSave=options=>queue=createSave({...options,indexedDB:new IDBFactory()});t.after(()=>queue?.dispose());
  w.mountNativeConjugation=(host,options)=>mountNativeConjugation(host,{...options,loadView:async()=>({mountConjugation:(root,input)=>{mountedOptions=input;root.textContent='Shared practice view boundary test';return {destroy(){destroyed++;}};}})});
  const before=tables(s);w.eval(source.replace(/^import .*;\r?\n/gm,''));await until(()=>mountedOptions);
  assert.equal(w.document.querySelector('[data-action=page][data-value=conjugation]').getAttribute('aria-current'),'page');assert.equal(w.document.querySelector('[data-action=page][data-value=library]').getAttribute('aria-current'),'false');assert.equal(w.document.querySelector('[data-action=page][data-value=review]').textContent,'Flashcards');assert.equal(mountedOptions.platform,'native');assert.deepEqual(tables(s),before);
  w.document.querySelector('[data-action=page][data-value=home]').click();await until(()=>w.location.hash==='#home');assert.equal(destroyed,1);
  w.document.querySelector('[data-action=page][data-value=library]').click();await until(()=>w.location.hash==='#library');
  w.document.querySelector('[data-action=page][data-value=conjugation]').click();await until(()=>w.document.querySelector('[data-native-conjugation]')?.textContent.includes('boundary test'));
  const select=w.document.querySelector('#demo-user');select.value='learner-core';select.dispatchEvent(new w.Event('change',{bubbles:true}));await until(()=>w.location.hash==='#home');assert.equal(destroyed,2);
  w.document.querySelector('[data-action=page][data-value=library]').click();await until(()=>w.location.hash==='#library');
  w.document.querySelector('[data-action=page][data-value=conjugation]').click();await until(()=>mountedOptions.storageKey.endsWith('learner-core'));assert.deepEqual(mountedOptions.learnedIds,[]);assert.deepEqual(tables(s),before);
  w.dispatchEvent(new w.Event('pagehide'));assert.equal(destroyed,3);assert.equal(w.document.querySelector('[data-native-conjugation]').children.length,0);
  const restoredPage=new w.Event('pageshow');Object.defineProperty(restoredPage,'persisted',{value:true});w.dispatchEvent(restoredPage);await until(()=>w.document.querySelector('[data-native-conjugation]').textContent.includes('boundary test'));assert.equal(mountedOptions.storageKey,'hebleo-conjugation-v1-learner-core');
  // Existing pageshow review-clock maintenance may create an empty ticket map.
  const returned=s.learner('learner-core');delete returned.reviewClockTickets;const initialCore=JSON.parse(before.find(([name])=>name==='learners')[1].find(row=>row.id==='learner-core').state);assert.deepEqual(returned,initialCore);
});
