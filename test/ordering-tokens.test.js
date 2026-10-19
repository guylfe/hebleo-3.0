import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {JSDOM} from 'jsdom';
import {Store} from '../src/store.js';
import {createServer} from '../src/server.js';
import {mountExerciseEditor} from '../public/studio/exercise-editor.js';

// QA-EE9-G4-01 ordering variant: each authored ordering token becomes a learner tile, and the tray silently skipped
// an empty one, so the stored pack and the learner tray disagreed. Tokens with nothing visible are refused at the
// shared content boundary before any write; valid tokens, prefix indices and duplicates are kept exactly. Fixture-only strings.
const blanks=['','   ','\t\n',' ','　','‏','‎ ‏','​','﻿','⁦⁩','­'];
const profiles=['learner-demo','learner-core','author-demo'];
const message=(exerciseId,row)=>`Authored token ${row} of ${exerciseId} is blank. Enter a token or remove that item.`;
const dump=s=>JSON.stringify(s.db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(({name})=>[name,s.db.prepare('SELECT * FROM "'+name+'" ORDER BY 1').all()]));
const changes=s=>s.db.prepare('SELECT total_changes() AS n').get().n;
const withToken=(content,exerciseId,index,value)=>{const c=structuredClone(content);c.exercises.find(e=>e.id===exerciseId).tokens.splice(index,0,value);return c;};
// Published revision 2 with source/extension fields on ex-2-order, a learner attempt on it, and a pending draft.
function populated(){
  const s=new Store(),c=structuredClone(s.snapshot()),ex=c.exercises.find(e=>e.id==='ex-2-order');
  ex.sourceRef={sheet:'fixture-only',row:4};ex.extension={unknown:['retain',{nested:true}]};
  const first=s.stage({baseRevisionId:s.get('active'),expectedDraftToken:null,content:c});s.publish(first.baseRevisionId,first.draftToken);
  s.attempt('learner-demo',{requestId:randomUUID(),revisionId:s.get('active'),exerciseId:'ex-2-order',answer:'אני בבית'});
  const d=structuredClone(s.snapshot());d.exercises.find(e=>e.id==='ex-2-cloze').prompt='Fixture-only pending draft prompt';
  s.stage({baseRevisionId:s.get('active'),expectedDraftToken:null,content:d});
  return s;
}
const state=s=>({draft:s.currentDraft(),published:s.snapshot(),learners:profiles.map(u=>s.learner(u)),before:dump(s)});
function unchanged(s,{draft,published,learners,before}){
  assert.equal(dump(s),before);assert.deepEqual(s.currentDraft(),draft);assert.deepEqual(s.snapshot(),published);
  profiles.forEach((u,i)=>assert.deepEqual(s.learner(u),learners[i]));
}

test('stage (Studio save and import staging) refuses empty, whitespace-only and invisible-only ordering tokens before any write',t=>{
  const s=populated();t.after(()=>s.close());
  const was=state(s),draft=was.draft;
  for(const exerciseId of ['ex-2-order','ex-3-order'])for(const value of blanks)for(const at of [0,1,3]){
    const n=changes(s),content=withToken(draft.content,exerciseId,at,value);
    assert.throws(()=>s.stage({baseRevisionId:s.get('active'),expectedDraftToken:draft.draftToken,content}),e=>e.status===400&&e.code==='BAD_REQUEST'&&e.message===message(exerciseId,at+1),JSON.stringify({exerciseId,value,at}));
    assert.equal(changes(s),n);
  }
  // QA's repro shape (tokens[3] = '') and the same blank row ticked as a prefix tile.
  const appended=withToken(draft.content,'ex-2-order',3,'');
  assert.throws(()=>s.stage({baseRevisionId:s.get('active'),expectedDraftToken:draft.draftToken,content:appended}),{message:message('ex-2-order',4)});
  appended.exercises.find(e=>e.id==='ex-2-order').prefixTokenIndices=[0,3];
  assert.throws(()=>s.stage({baseRevisionId:s.get('active'),expectedDraftToken:draft.draftToken,content:appended}),{message:message('ex-2-order',4)});
  unchanged(s,was);
});

test('publish, rollback and restore refuse blank ordering tokens written by an earlier build, leaving every table unchanged',t=>{
  const s=populated();t.after(()=>s.close());
  const active=s.get('active'),backup=s.backup();
  // The earlier build stored these without checking; write them directly.
  s.set('draft',{baseRevisionId:active,content:withToken(s.currentDraft().content,'ex-2-order',3,''),stagedAt:'2026-10-06T00:00:00.000Z'});
  const legacyRevision=s.addRevision(withToken(s.snapshot(),'ex-3-order',0,'‏'),'Fixture revision written by an earlier build');
  const was=state(s),n=changes(s);
  assert.throws(()=>s.publish(active,was.draft.draftToken),{message:message('ex-2-order',4)});
  assert.throws(()=>s.rollback(legacyRevision,active,was.draft.draftToken),{message:message('ex-3-order',1)});
  const blankContent=structuredClone(backup);
  for(const c of [blankContent.content,blankContent.revisionSnapshots.find(r=>r.revisionId===backup.activeRevisionId).content])c.exercises.find(e=>e.id==='ex-3-order').tokens.push('  ');
  const blankDraft=structuredClone(backup);blankDraft.draft.content.exercises.find(e=>e.id==='ex-2-order').tokens[1]='​';
  assert.throws(()=>s.restore(blankContent),{message:message('ex-3-order',4)});
  assert.throws(()=>s.restore(blankDraft),{message:message('ex-2-order',2)});
  assert.equal(changes(s),n);unchanged(s,was);
  // Control: the same backup without the blank rows restores.
  s.restore(backup);assert.deepEqual(s.snapshot(),backup.content);
});

test('valid ordering tokens keep exact text, order, duplicates and prefix positions through stage, preview, publish, session, progress and grading',t=>{
  const s=populated();t.after(()=>s.close());
  const draft=s.currentDraft(),content=structuredClone(draft.content),ex=content.exercises.find(e=>e.id==='ex-2-order');
  // Fixture-only tokens: a duplicate prefix tile (only the second is a prefix), a trailing space, and a leading direction mark with Nikkud.
  ex.tokens=['ב','בית ','‏אֲנִי','ב'];ex.prefixTokenIndices=[3];
  const staged=s.stage({baseRevisionId:s.get('active'),expectedDraftToken:draft.draftToken,content});
  assert.deepEqual(s.currentDraft().content,content);
  const tray=e=>{
    const fromAuthored=e.tokens.filter(t=>ex.tokens.includes(t));
    assert.deepEqual([...fromAuthored].sort(),[...ex.tokens].sort(),'every authored tile appears once per authored occurrence, byte-exact');
    assert.equal(e.prefixTokenIndices.length,1);const [prefix]=e.prefixTokenIndices;
    assert.equal(e.tokens[prefix],'ב');assert.ok(e.tokens.indexOf('ב')<prefix,'the prefix is the later of the two ב tiles');
    return e.tokens;
  };
  const preview=s.previewSession({lessonId:'lesson-2',draftToken:staged.draftToken}).content.exercises.find(e=>e.id==='ex-2-order');
  const previewTray=tray(preview);assert.equal(preview.answers,undefined);
  assert.deepEqual([preview.sourceRef,preview.extension],[ex.sourceRef,ex.extension]);
  const grade=answer=>s.previewEvaluate({lessonId:'lesson-2',exerciseId:'ex-2-order',draftToken:staged.draftToken,answer}).result.correct;
  assert.equal(grade('אני בבית'),true);assert.equal(grade('בית אני'),false);
  const learners=profiles.map(u=>s.learner(u));
  s.publish(s.get('active'),staged.draftToken);
  const revisionId=s.get('active');
  assert.deepEqual(s.snapshot().exercises.find(e=>e.id==='ex-2-order'),ex);
  profiles.forEach((u,i)=>assert.deepEqual(s.learner(u),learners[i]));
  const session=s.session('learner-core','lesson-2').content.exercises.find(e=>e.id==='ex-2-order');
  assert.deepEqual(tray(session),previewTray);
  const position=selectedTokens=>({lessonId:'lesson-2',revisionId,step:'apply',question:0,answer:'',selectedTokens,matching:{},resultRequestId:null,practiceIds:[]});
  s.saveProgress('learner-core',position([previewTray.length-1,0]));
  assert.deepEqual(s.learner('learner-core').resumes['lesson-2'].selectedTokens,[previewTray.length-1,0]);
  assert.throws(()=>s.saveProgress('learner-core',position([previewTray.length])),{message:'Invalid saved sentence tokens.'});
  assert.equal(s.attempt('learner-core',{requestId:randomUUID(),revisionId,exerciseId:'ex-2-order',answer:'אני בבית'}).correct,true);
  assert.equal(s.attempt('learner-core',{requestId:randomUUID(),revisionId,exerciseId:'ex-2-order',answer:'בית אני'}).correct,false);
  for(const u of ['learner-demo','author-demo'])assert.deepEqual(s.learner(u),learners[profiles.indexOf(u)]);
});

test('HTTP: blank token saves and legacy publishes return 400 with the field message and write nothing; a filled row saves',async t=>{
  const s=populated(),server=createServer(s);await new Promise(r=>server.listen(0,'127.0.0.1',r));
  t.after(async()=>{await new Promise(r=>server.close(r));s.close();});const base='http://127.0.0.1:'+server.address().port;
  const post=async(path,body)=>{const r=await fetch(base+'/api/'+path,{method:'POST',headers:{'content-type':'application/json','x-demo-user':'author-demo'},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};};
  const was=state(s),draft=was.draft,active=s.get('active');
  for(const value of ['','   ','‏']){
    const r=await post('studio/draft',{baseRevisionId:active,expectedDraftToken:draft.draftToken,content:withToken(draft.content,'ex-2-order',3,value)});
    assert.deepEqual(r,{status:400,body:{error:message('ex-2-order',4),code:'BAD_REQUEST'}});
  }
  unchanged(s,was);
  const ok=await post('studio/draft',{baseRevisionId:active,expectedDraftToken:draft.draftToken,content:withToken(draft.content,'ex-2-order',3,'שם')});
  assert.equal(ok.status,200);
  const saved=s.currentDraft().content.exercises.find(e=>e.id==='ex-2-order');
  assert.deepEqual([saved.tokens,saved.prefixTokenIndices],[['ב','בית','אני','שם'],[0]]);
  s.set('draft',{baseRevisionId:active,content:withToken(draft.content,'ex-2-order',0,' '),stagedAt:'2026-10-06T00:00:00.000Z'});
  const legacy=state(s),refused=await post('studio/publish',{baseRevisionId:active,draftToken:legacy.draft.draftToken});
  assert.deepEqual(refused,{status:400,body:{error:message('ex-2-order',1),code:'BAD_REQUEST'}});
  unchanged(s,legacy);
});

test('Studio editor shows the token error, keeps typed tokens, prefix ticks and answers, re-enables controls; filling or removing the row then saves',async t=>{
  const s=populated(),dom=new JSDOM('<main></main>'),container=dom.window.document.querySelector('main');
  t.after(()=>{s.close();dom.window.close();});
  const tick=()=>new Promise(resolve=>setImmediate(resolve));
  const submit=async()=>{form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));await tick();};
  const type=(control,value)=>{control.value=value;control.dispatchEvent(new dom.window.Event('input',{bubbles:true}));};
  const draft=s.currentDraft(),original=draft.content.exercises.find(e=>e.id==='ex-2-order');
  mountExerciseEditor(container,{content:draft.content,exerciseId:'ex-2-order',baseRevisionId:s.get('active'),expectedDraftToken:draft.draftToken,saveDraft:input=>s.stage(input)});
  const form=container.querySelector('form'),status=form.querySelector('[data-editor-status]');
  const rows=()=>[...form.querySelectorAll('[data-list="tokens"] [data-list-row]')];
  const tokens=()=>rows().map(r=>r.querySelector('[name="tokens"]').value),ticks=()=>rows().map(r=>r.querySelector('[data-prefix]').checked);
  const answers=()=>[...form.querySelectorAll('[data-list="answers"] [name="answers"]')].map(x=>x.value);
  type(form.elements.prompt,'Fixture-only edited prompt');
  form.querySelector('[data-list-add="tokens"]').click();
  const was=state(s);
  const refusedAt=async(row,expectedTokens,expectedTicks)=>{
    await submit();
    assert.equal(status.textContent,message('ex-2-order',row));
    assert.deepEqual(tokens(),expectedTokens);assert.deepEqual(ticks(),expectedTicks);assert.deepEqual(answers(),original.answers);
    assert.equal(form.elements.prompt.value,'Fixture-only edited prompt');
    assert.ok([...form.querySelectorAll('input,select,textarea,button')].every(el=>!el.disabled));
    unchanged(s,was);
  };
  for(const value of ['','    ','‏']){type(rows()[3].querySelector('[name="tokens"]'),value);await refusedAt(4,[...original.tokens,value],[true,false,false,false]);}
  // A blank row ticked as a prefix tile is refused the same way; the tick is kept.
  const prefix=rows()[3].querySelector('[data-prefix]');prefix.checked=true;prefix.dispatchEvent(new dom.window.Event('change',{bubbles:true}));
  await refusedAt(4,[...original.tokens,'‏'],[true,false,false,true]);
  prefix.checked=false;prefix.dispatchEvent(new dom.window.Event('change',{bubbles:true}));
  type(rows()[3].querySelector('[name="tokens"]'),'שם');await submit();
  assert.match(status.textContent,/Draft saved/);
  const saved=()=>s.currentDraft().content.exercises.find(e=>e.id==='ex-2-order');
  assert.deepEqual(saved(),{...original,prompt:'Fixture-only edited prompt',tokens:[...original.tokens,'שם'],prefixTokenIndices:[0]});
  // Recovery by removal: add a blank row, get refused, remove it, save.
  form.querySelector('[data-list-add="tokens"]').click();await submit();
  assert.equal(status.textContent,message('ex-2-order',5));
  rows()[4].querySelector('[data-list-remove]').click();
  type(form.elements.prompt,'Fixture-only edited prompt 2');await submit();
  assert.match(status.textContent,/Draft saved/);
  assert.deepEqual(saved(),{...original,prompt:'Fixture-only edited prompt 2',tokens:[...original.tokens,'שם'],prefixTokenIndices:[0]});
  assert.deepEqual([saved().sourceRef,saved().extension],[original.sourceRef,original.extension]);
});
