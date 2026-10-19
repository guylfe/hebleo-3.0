import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {JSDOM} from 'jsdom';
import {Store} from '../src/store.js';
import {createServer} from '../src/server.js';
import {mountExerciseEditor} from '../public/studio/exercise-editor.js';

// QA-EE9-G4-01: each recognition distractor becomes a learner choice. Empty, whitespace-only and
// invisible-only rows are refused at the shared content boundary before any write; valid authored
// strings are kept exactly (never trimmed, replaced or invented). All strings here are fixture-only.
const blanks=['','   ','\t\n',' ','　','‏','‎ ‏','​','﻿','⁦⁩','­'];
const profiles=['learner-demo','learner-core','author-demo'];
const message=(exerciseId,row)=>`Authored distractor meaning ${row} of ${exerciseId} is blank. Enter a meaning or remove that item.`;
// Every row of every table, sqlite_sequence included.
const dump=s=>JSON.stringify(s.db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(({name})=>[name,s.db.prepare('SELECT * FROM "'+name+'" ORDER BY 1').all()]));
const changes=s=>s.db.prepare('SELECT total_changes() AS n').get().n;
const withDistractor=(content,exerciseId,index,value)=>{const c=structuredClone(content);c.exercises.find(e=>e.id===exerciseId).distractors.splice(index,0,value);return c;};
// Published revision 2 with source/extension fields on the recognition exercise, a learner attempt on it, and a pending draft.
function populated(){
  const s=new Store(),c=structuredClone(s.snapshot()),ex=c.exercises.find(e=>e.id==='ex-1-recognize');
  ex.sourceRef={sheet:'fixture-only',row:2};ex.extension={unknown:['retain',{nested:true}]};
  const first=s.stage({baseRevisionId:s.get('active'),expectedDraftToken:null,content:c});s.publish(first.baseRevisionId,first.draftToken);
  s.attempt('learner-demo',{requestId:randomUUID(),revisionId:s.get('active'),exerciseId:'ex-1-recognize',answer:'who'});
  const d=structuredClone(s.snapshot());d.exercises.find(e=>e.id==='ex-1-type').prompt='Fixture-only pending draft prompt';
  s.stage({baseRevisionId:s.get('active'),expectedDraftToken:null,content:d});
  return s;
}
function unchanged(s,{draft,published,learners,before}){
  assert.equal(dump(s),before);assert.deepEqual(s.currentDraft(),draft);assert.deepEqual(s.snapshot(),published);
  profiles.forEach((u,i)=>assert.deepEqual(s.learner(u),learners[i]));
}
const state=s=>({draft:s.currentDraft(),published:s.snapshot(),learners:profiles.map(u=>s.learner(u)),before:dump(s)});

test('stage (Studio save and import staging) refuses empty, whitespace-only and invisible-only distractors before any write',t=>{
  const s=populated();t.after(()=>s.close());
  const was=state(s),draft=was.draft;
  for(const exerciseId of ['ex-1-recognize','ex-3-recognize'])for(const value of blanks)for(const at of [0,1,3]){
    const n=changes(s),content=withDistractor(draft.content,exerciseId,at,value);
    assert.throws(()=>s.stage({baseRevisionId:s.get('active'),expectedDraftToken:draft.draftToken,content}),e=>e.status===400&&e.code==='BAD_REQUEST'&&e.message===message(exerciseId,at+1),JSON.stringify({exerciseId,value,at}));
    assert.equal(changes(s),n);
  }
  // QA repro shape: an existing meaning replaced by an empty row.
  const replaced=structuredClone(draft.content);replaced.exercises.find(e=>e.id==='ex-1-recognize').distractors[2]='';
  assert.throws(()=>s.stage({baseRevisionId:s.get('active'),expectedDraftToken:draft.draftToken,content:replaced}),{message:message('ex-1-recognize',3)});
  unchanged(s,was);
});

test('publish, rollback and restore refuse blank distractors written by an earlier build, leaving every table unchanged',t=>{
  const s=populated();t.after(()=>s.close());
  const active=s.get('active'),backup=s.backup();
  // The earlier build stored these without checking; write them directly.
  s.set('draft',{baseRevisionId:active,content:withDistractor(s.currentDraft().content,'ex-1-recognize',3,''),stagedAt:'2026-10-06T00:00:00.000Z'});
  const legacyRevision=s.addRevision(withDistractor(s.snapshot(),'ex-1-recognize',0,'‏'),'Fixture revision written by an earlier build');
  const was=state(s),n=changes(s);
  assert.throws(()=>s.publish(active,was.draft.draftToken),{message:message('ex-1-recognize',4)});
  assert.throws(()=>s.rollback(legacyRevision,active,was.draft.draftToken),{message:message('ex-1-recognize',1)});
  const blankContent=structuredClone(backup);
  for(const c of [blankContent.content,blankContent.revisionSnapshots.find(r=>r.revisionId===backup.activeRevisionId).content])c.exercises.find(e=>e.id==='ex-3-recognize').distractors.push('  ');
  const blankDraft=structuredClone(backup);blankDraft.draft.content.exercises.find(e=>e.id==='ex-1-recognize').distractors[1]='​';
  assert.throws(()=>s.restore(blankContent),{message:message('ex-3-recognize',4)});
  assert.throws(()=>s.restore(blankDraft),{message:message('ex-1-recognize',2)});
  assert.equal(changes(s),n);unchanged(s,was);
  // Control: the same backup without the blank rows restores.
  s.restore(backup);assert.deepEqual(s.snapshot(),backup.content);
});

test('valid authored distractors keep exact text, order and neighbouring fields through stage, preview, publish, session and grading',t=>{
  const s=populated();t.after(()=>s.close());
  const draft=s.currentDraft(),content=structuredClone(draft.content),ex=content.exercises.find(e=>e.id==='ex-1-recognize');
  // Fixture-only strings: surrounding spaces, a no-break space, a leading direction mark and pointed Hebrew are authored bytes.
  ex.distractors=[' he ','she ','‏at home','הִיא','I'];
  const staged=s.stage({baseRevisionId:s.get('active'),expectedDraftToken:draft.draftToken,content});
  assert.deepEqual(s.currentDraft().content,content);
  const choices=[...new Set(['who',...ex.distractors])].sort();
  const preview=s.previewSession({lessonId:'lesson-1',draftToken:staged.draftToken}).content.exercises.find(e=>e.id==='ex-1-recognize');
  assert.deepEqual(preview.choices,choices);assert.equal(preview.distractors,undefined);
  assert.deepEqual(preview.sourceRef,ex.sourceRef);assert.deepEqual(preview.extension,ex.extension);
  const grade=answer=>s.previewEvaluate({lessonId:'lesson-1',exerciseId:'ex-1-recognize',draftToken:staged.draftToken,answer}).result;
  assert.deepEqual(grade('who'),{exerciseId:'ex-1-recognize',lessonId:'lesson-1',answer:'who',correct:true,expected:'who'});
  assert.equal(grade(' he ').correct,false);assert.equal(grade('הִיא').correct,false);
  const learners=profiles.map(u=>s.learner(u));
  s.publish(s.get('active'),staged.draftToken);
  const revisionId=s.get('active');
  assert.deepEqual(s.snapshot().exercises.find(e=>e.id==='ex-1-recognize'),ex);
  profiles.forEach((u,i)=>assert.deepEqual(s.learner(u),learners[i]));
  assert.deepEqual(s.session('learner-core','lesson-1').content.exercises.find(e=>e.id==='ex-1-recognize').choices,choices);
  const wrong=s.attempt('learner-core',{requestId:randomUUID(),revisionId,exerciseId:'ex-1-recognize',answer:' he '});
  const right=s.attempt('learner-core',{requestId:randomUUID(),revisionId,exerciseId:'ex-1-recognize',answer:'who'});
  assert.equal(wrong.correct,false);assert.equal(wrong.answer,' he ');assert.equal(right.correct,true);
  for(const u of ['learner-demo','author-demo'])assert.deepEqual(s.learner(u),learners[profiles.indexOf(u)]);
});

test('HTTP: blank distractor saves and legacy publishes return 400 with the field message and write nothing; a filled row saves',async t=>{
  const s=populated(),server=createServer(s);await new Promise(r=>server.listen(0,'127.0.0.1',r));
  t.after(async()=>{await new Promise(r=>server.close(r));s.close();});const base='http://127.0.0.1:'+server.address().port;
  const post=async(path,body)=>{const r=await fetch(base+'/api/'+path,{method:'POST',headers:{'content-type':'application/json','x-demo-user':'author-demo'},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};};
  const was=state(s),draft=was.draft,active=s.get('active');
  for(const value of ['','   ','‏']){
    const r=await post('studio/draft',{baseRevisionId:active,expectedDraftToken:draft.draftToken,content:withDistractor(draft.content,'ex-1-recognize',3,value)});
    assert.deepEqual(r,{status:400,body:{error:message('ex-1-recognize',4),code:'BAD_REQUEST'}});
  }
  unchanged(s,was);
  const ok=await post('studio/draft',{baseRevisionId:active,expectedDraftToken:draft.draftToken,content:withDistractor(draft.content,'ex-1-recognize',3,'there')});
  assert.equal(ok.status,200);assert.deepEqual(s.currentDraft().content.exercises.find(e=>e.id==='ex-1-recognize').distractors,['I','he','she','there']);
  s.set('draft',{baseRevisionId:active,content:withDistractor(draft.content,'ex-1-recognize',0,' '),stagedAt:'2026-10-06T00:00:00.000Z'});
  const legacy=state(s),refused=await post('studio/publish',{baseRevisionId:active,draftToken:legacy.draft.draftToken});
  assert.deepEqual(refused,{status:400,body:{error:message('ex-1-recognize',1),code:'BAD_REQUEST'}});
  unchanged(s,legacy);
});

test('Studio editor shows the field error, keeps every typed value and re-enables controls; filling or removing the row then saves',async t=>{
  const s=populated(),dom=new JSDOM('<main></main>'),container=dom.window.document.querySelector('main');
  t.after(()=>{s.close();dom.window.close();});
  const tick=()=>new Promise(resolve=>setImmediate(resolve));
  const submit=async()=>{form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));await tick();};
  const type=(control,value)=>{control.value=value;control.dispatchEvent(new dom.window.Event('input',{bubbles:true}));};
  const draft=s.currentDraft(),original=draft.content.exercises.find(e=>e.id==='ex-1-recognize');
  mountExerciseEditor(container,{content:draft.content,exerciseId:'ex-1-recognize',baseRevisionId:s.get('active'),expectedDraftToken:draft.draftToken,saveDraft:input=>s.stage(input)});
  const form=container.querySelector('form'),status=form.querySelector('[data-editor-status]');
  const rows=()=>[...form.querySelectorAll('[data-list="distractors"] [name="distractors"]')];
  type(form.elements.prompt,'Fixture-only edited prompt');
  form.querySelector('[data-list-add="distractors"]').click();
  const was=state(s);
  for(const value of ['','    ','‏']){
    type(rows()[3],value);await submit();
    assert.equal(status.textContent,message('ex-1-recognize',4));
    assert.deepEqual(rows().map(x=>x.value),[...original.distractors,value]);
    assert.equal(form.elements.prompt.value,'Fixture-only edited prompt');
    assert.ok([...form.querySelectorAll('input,select,textarea,button:not([data-vocab-page])')].every(el=>!el.disabled));
    assert.equal(form.querySelector('[data-vocab-page="-1"]').disabled,true,'first-page navigation stays correctly bounded');
    unchanged(s,was);
  }
  type(rows()[3],'there');await submit();
  assert.match(status.textContent,/Draft saved/);
  const saved=()=>s.currentDraft().content.exercises.find(e=>e.id==='ex-1-recognize');
  assert.deepEqual(saved(),{...original,prompt:'Fixture-only edited prompt',distractors:[...original.distractors,'there']});
  // Recovery by removal: add a blank row, get refused, remove it, save.
  form.querySelector('[data-list-add="distractors"]').click();await submit();
  assert.equal(status.textContent,message('ex-1-recognize',5));
  rows()[4].closest('[data-list-row]').querySelector('[data-list-remove]').click();
  type(rows()[0],'I (fixture edit)');await submit();
  assert.match(status.textContent,/Draft saved/);
  assert.deepEqual(saved().distractors,['I (fixture edit)','he','she','there']);
  assert.deepEqual([saved().sourceRef,saved().extension],[original.sourceRef,original.extension]);
});
