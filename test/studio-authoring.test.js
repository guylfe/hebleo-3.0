import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {seed} from '../src/seed.js';
import {Store,validateContent} from '../src/store.js';
import {applyExerciseEdits,mountExerciseEditor,exerciseTypes} from '../public/studio/exercise-editor.js';
import {applyLessonEdits,mountLessonEditor} from '../public/studio/lesson-editor.js';
import {inspectImport,renderImportReview} from '../public/studio/import-review.js';

function fixture() {
  const content = structuredClone(seed);
  content.sourceTheme = {color:'#abcdef'};
  for (const x of [...content.exercises,...content.lessons]) {
    x.privateSource = {locator:'fixture-only',snapshot:'synthetic-1'};
    x.extension = {richRuns:[{startIndex:0,format:{bold:true}}],unknown:['retain']};
    x.provenance = {status:'synthetic-demo',source:{locator:'fixture-only'}};
    x.approval = {status:'unapproved'};
    x.media = {assetId:'fixture-only',revisionId:'fixture-r1',sha256:'a'.repeat(64)};
  }
  return content;
}
function harness() {
  const dom = new JSDOM('<main></main>');
  return {dom,container:dom.window.document.querySelector('main')};
}
function change(dom,form,name,value) {
  const control=form.elements.namedItem(name);control.value=value;
  control.dispatchEvent(new dom.window.Event('input',{bubbles:true}));
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function submit(dom,form) {form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));await tick();}

test('all six exercise forms save/reload without losing authored answers, extensions or absent defaults',async()=>{
  const content=fixture(),store=new Store();
  try {
    const before=store.backup();
    for(const type of exerciseTypes) {
      const exercise=content.exercises.find(x=>x.type===type), {dom,container}=harness();
      const dispose=mountExerciseEditor(container,{content,exerciseId:exercise.id,baseRevisionId:store.get('active'),saveDraft:input=>store.stage(input)});
      await submit(dom,container.querySelector('form'));
      assert.match(container.textContent,/Draft saved/);
      assert.deepEqual(store.active().draft.content,content);
      dispose();dom.window.close();
    }
    for(const user of ['learner-demo','learner-core','author-demo']) assert.deepEqual(store.learner(user),before.learners.find(x=>x.id===user).state);
    assert.deepEqual(store.snapshot(),before.content);
  } finally {store.close();}
});

test('typing edits retain explicit word forms, identity, rich data and Nikkud defaults; immutable fields reject',()=>{
  const content=fixture(),original=content.exercises.find(x=>x.type==='typing');
  const next=applyExerciseEdits(original,{prompt:'Author-provided fixture prompt',requireNikkud:'true',allowLookup:'false'});
  assert.equal(next.requireNikkud,true);assert.equal(next.allowLookup,false);
  assert.equal(next.id,original.id);assert.deepEqual(next.extension,original.extension);
  assert.equal(next.nikkudOverride,undefined);assert.equal(original.requireNikkud,undefined);
  for(const key of ['id','type','lessonId','extension']) assert.throws(()=>applyExerciseEdits(original,{[key]:'changed'}),/read-only/);
  assert.deepEqual(applyExerciseEdits({...next,feedback:'authored'},{feedback:''}).feedback,undefined);
});

test('prefix removal remaps stored token indices and never infers or rewrites accepted answers',async()=>{
  const content=fixture(),original=content.exercises.find(x=>x.type==='ordering');
  const {dom,container}=harness();let saved;
  mountExerciseEditor(container,{content,exerciseId:original.id,baseRevisionId:1,saveDraft:input=>{saved=input.content;validateContent(saved);}});
  const form=container.querySelector('form'),rows=form.querySelectorAll('[data-list="tokens"] [data-list-row]');
  // Remove the initial prefix, then explicitly mark a remaining tile as a prefix.
  rows[0].querySelector('[data-list-remove]').click();
  const checkbox=form.querySelector('[data-prefix]');checkbox.checked=true;checkbox.dispatchEvent(new dom.window.Event('change',{bubbles:true}));
  await submit(dom,form);
  const next=saved.exercises.find(x=>x.id===original.id);
  assert.deepEqual(next.tokens,original.tokens.slice(1));assert.deepEqual(next.prefixTokenIndices,[0]);
  assert.deepEqual(next.answers,original.answers);assert.deepEqual(next.privateSource,original.privateSource);
  dom.window.close();
});

test('failed draft validation retains the entered text and the previous saved draft',async()=>{
  const store=new Store(),content=fixture(),original=content.exercises.find(x=>x.type==='recognition'),{dom,container}=harness();
  try {
    store.stage({baseRevisionId:1,content});const before=store.active().draft;
    mountExerciseEditor(container,{content,exerciseId:original.id,baseRevisionId:1,saveDraft:input=>store.stage(input)});
    const form=container.querySelector('form');change(dom,form,'prompt','');
    await submit(dom,form);
    assert.match(form.textContent,/Invalid exercise prompt/);assert.equal(form.elements.prompt.value,'');
    assert.equal(form.querySelector('[type="submit"]').disabled,false);assert.deepEqual(store.active().draft,before);
    change(dom,form,'prompt','  Explicit fixture prompt with spacing  ');await submit(dom,form);
    assert.equal(store.active().draft.content.exercises.find(x=>x.id===original.id).prompt,'  Explicit fixture prompt with spacing  ');
    // A second save must retain the first successful edit.
    change(dom,form,'feedback','Fixture-only feedback');await submit(dom,form);
    assert.equal(store.active().draft.content.exercises.find(x=>x.id===original.id).prompt,'  Explicit fixture prompt with spacing  ');
  } finally {store.close();dom.window.close();}
});

test('lesson composition preserves blocks, vocabulary/source fields and reference order through save/reload',async()=>{
  const store=new Store(),content=fixture(),lesson=content.lessons[0],{dom,container}=harness();
  lesson.blocks[1].extension={source:'retain'};lesson.wordIds.reverse();
  try {
    mountLessonEditor(container,{content,lessonId:lesson.id,baseRevisionId:1,saveDraft:input=>store.stage(input)});
    const form=container.querySelector('form');change(dom,form,'title','Fixture composition');
    form.querySelector('[data-block-index="1"] [data-move="-1"]').click();await submit(dom,form);
    const next=store.active().draft.content;
    assert.equal(next.lessons[0].blocks[0].type,'vocabulary');assert.deepEqual(next.lessons[0].blocks[0].extension,{source:'retain'});
    assert.deepEqual(next.words,content.words);assert.deepEqual(next.lessons[0].wordIds,lesson.wordIds);
    assert.deepEqual(next.lessons[0].keyboard,lesson.keyboard);assert.deepEqual(next.lessons[0].extension,lesson.extension);
    // Reordering again on the same mount must use the newly saved order.
    form.querySelector('[data-block-index="0"] [data-move="1"]').click();await submit(dom,form);
    assert.deepEqual(store.active().draft.content.lessons[0].blocks,lesson.blocks);
    assert.throws(()=>applyLessonEdits(lesson,{id:'new'}),/read-only/);
    assert.throws(()=>applyLessonEdits(lesson,{exerciseIds:[],checkExerciseIds:[lesson.exerciseIds[0]]}),/Check/);
    assert.throws(()=>applyLessonEdits(lesson,{blockOrder:[0,0,1]}),/three blocks/);
  } finally {store.close();dom.window.close();}
});

test('untrusted authored text is escaped in forms; disposing prevents queued save handlers',async()=>{
  const content=fixture(),original=content.exercises[0],{dom,container}=harness();let calls=0;
  original.prompt='</textarea><script>bad()</script>';original.distractors=['" onfocus="bad()'];
  const dispose=mountExerciseEditor(container,{content,exerciseId:original.id,baseRevisionId:1,saveDraft:()=>calls++});
  assert.equal(container.querySelector('script'),null);assert.equal(container.querySelector('[onfocus]'),null);
  assert.equal(container.querySelector('[name="prompt"]').value,original.prompt);
  dispose();await submit(dom,container.querySelector('form'));assert.equal(calls,0);dom.window.close();
});

test('import inspection exposes exact forms, formatting, provenance and omissions without mutation',()=>{
  const previous=fixture(),candidate=structuredClone(previous),before=structuredClone(candidate);
  candidate.words[0].fieldFormatting={pointed:{textFormatRuns:[{startIndex:0,format:{bold:true}}]}};
  candidate.words[0].privateSource={location:'synthetic-row-1'};
  candidate.words[0].curated='';candidate.words.pop();candidate.lessons[0].title='<img src=x onerror=bad()>';
  const frozen=structuredClone(candidate),report=inspectImport(previous,candidate);
  assert.ok(report.warnings.some(x=>x.includes('missing explicit curated')));
  assert.ok(report.warnings.some(x=>x.includes('omitted')));
  const word=report.changes.find(x=>x.id===candidate.words[0].id);
  assert.deepEqual(word.after.fieldFormatting,candidate.words[0].fieldFormatting);
  const dom=new JSDOM(renderImportReview(previous,candidate,{validationMessages:['Missing reference: fixture-only']}));
  assert.equal(dom.window.document.querySelector('img'),null);
  assert.match(dom.window.document.body.textContent,/textFormatRuns/);
  assert.match(dom.window.document.body.textContent,/Missing reference: fixture-only/);
  assert.deepEqual(candidate,frozen);assert.notDeepEqual(candidate,before);dom.window.close();
  const duplicate=structuredClone(previous);duplicate.words.push(duplicate.words[0]);assert.throws(()=>inspectImport(previous,duplicate),/duplicate/);
});

test('draft editors carry successful CAS tokens forward but retain previous tokens and authored input after rejection',async()=>{
  for (const kind of ['exercise','lesson']) for (const code of ['DRAFT_CONFLICT','STALE_BASE']) {
    const content=fixture(),{dom,container}=harness(),requests=[];let savedCalls=0;
    const saveDraft=async input=>{requests.push(structuredClone(input));if(requests.length===2)throw Object.assign(new Error('Raw conflict'),{status:409,code,current:{draftToken:'other-token',activeRevisionId:9}});return {draftToken:`token-${requests.length}`,draft:{draftToken:'nested-token-must-not-be-used'}};};
    const config={content,baseRevisionId:1,expectedDraftToken:null,saveDraft,onSaved:()=>savedCalls++};
    const dispose=kind==='exercise'?mountExerciseEditor(container,{...config,exerciseId:content.exercises[0].id}):mountLessonEditor(container,{...config,lessonId:content.lessons[0].id});
    const form=container.querySelector('form'),field=kind==='exercise'?'prompt':'title';
    change(dom,form,field,'Fixture first edit');await submit(dom,form);
    change(dom,form,field,'Fixture conflicted edit');await submit(dom,form);
    assert.match(form.textContent,/Draft changed elsewhere — reload/);assert.match(form.textContent,/active revision: 9; draft token: other-token/);assert.equal(form.elements.namedItem(field).value,'Fixture conflicted edit');assert.equal(savedCalls,1);
    await submit(dom,form);assert.deepEqual(requests.map(x=>x.expectedDraftToken),[null,'token-1','token-1']);
    assert.ok(requests.every(x=>x.baseRevisionId===1));
    assert.equal(requests[2].content[kind==='exercise'?'exercises':'lessons'][0][field],'Fixture conflicted edit');
    const retained=requests[2].content[kind==='exercise'?'exercises':'lessons'][0];
    for(const key of ['id','privateSource','provenance','approval','extension','media']) assert.deepEqual(retained[key],content[kind==='exercise'?'exercises':'lessons'][0][key]);
    dispose();dom.window.close();
  }
});

test('a disposed editor never remounts the workspace when its pending stage returns',async()=>{
  const content=fixture(),{dom,container}=harness();let resolveSave,saved=0;
  const dispose=mountExerciseEditor(container,{content,exerciseId:content.exercises[0].id,baseRevisionId:1,saveDraft:()=>new Promise(resolve=>resolveSave=resolve),onSaved:()=>saved++});
  await submit(dom,container.querySelector('form'));dispose();resolveSave({draft:{draftToken:'fixture'}});await tick();assert.equal(saved,0);dom.window.close();
});

test('import review includes pack-level contracts, approval and unknown metadata changes',()=>{
  const previous=fixture(),candidate=structuredClone(previous);candidate.contracts={version:1,fixture:true};candidate.approval={status:'unapproved'};candidate.unknownPack={retain:['source']};
  const changes=inspectImport(previous,candidate).changes;
  assert.deepEqual(changes[0].fields,['contracts','approval','unknownPack']);assert.equal(changes[0].collection,'pack');
  assert.match(renderImportReview(previous,candidate),/unknownPack/);
});

test('import inspection ignores nested JSON object key order but retains metadata and array changes',()=>{
  const previous=fixture();previous.unknownPack={source:{sheet:'fixture',row:2},flags:['a','b']};
  previous.words[0].approval={status:'fixture-only',review:{person:'fixture',version:1}};
  const reorder=value=>Array.isArray(value)?value.map(reorder):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).reverse().map(([key,item])=>[key,reorder(item)])):value;
  const candidate=reorder(previous),before=structuredClone(candidate);
  assert.deepEqual(inspectImport(previous,candidate).changes,[]);
  candidate.unknownPack.flags.reverse();candidate.words[0].approval.review.version=2;
  const changes=inspectImport(previous,candidate).changes;
  assert.deepEqual(changes.find(x=>x.collection==='pack').fields,['unknownPack']);
  assert.deepEqual(changes.find(x=>x.id===previous.words[0].id).fields,['approval']);
  assert.deepEqual(previous.unknownPack.flags,['a','b']);assert.deepEqual(before.unknownPack.flags,['a','b']);
});

test('import inspection reports collection order without mutating identities or treating additions as reorders',()=>{
  const previous=fixture(),candidate=structuredClone(previous);
  for(const collection of ['words','lessons','exercises'])candidate[collection].reverse();
  const changes=inspectImport(previous,candidate).changes;
  assert.equal(changes.length,1);assert.equal(changes[0].collection,'pack');
  assert.deepEqual(changes[0].fields,['words','lessons','exercises']);
  assert.match(renderImportReview(previous,candidate),/<th>lessons<\/th>/);
  const added=structuredClone(previous);added.words.unshift({...added.words[0],id:'fixture-addition'});
  assert.deepEqual(inspectImport(previous,added).changes.map(x=>[x.id,x.kind]),[['fixture-addition','added']]);
  const omitted=structuredClone(previous);omitted.words.shift();
  assert.deepEqual(inspectImport(previous,omitted).changes.map(x=>[x.id,x.kind]),[[previous.words[0].id,'omitted']]);
  assert.notEqual(previous.lessons[0].id,candidate.lessons[0].id);
});
