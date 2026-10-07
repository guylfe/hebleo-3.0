import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {JSDOM} from 'jsdom';
import {Store} from '../src/store.js';
import {exerciseFeedback,matchingGame} from '../public/learner-view.js';

test('matching verdicts are supplied by the server, retained on resume and individually accessible',t=>{
  const s=new Store();t.after(()=>s.close());const c=s.snapshot(),e=c.exercises.find(e=>e.id==='ex-1-match');
  const answer={'w-hu':'she','w-mi':'who','w-hi':'he'};
  const result=s.attempt('learner-demo',{requestId:randomUUID(),revisionId:s.get('active'),exerciseId:e.id,answer});
  assert.deepEqual(result.pairResults,{'w-hu':false,'w-hi':false,'w-mi':true});
  s.saveProgress('learner-demo',{lessonId:e.lessonId,revisionId:s.get('active'),step:'apply',question:1,answer:'',matching:answer,selectedTokens:[],resultRequestId:result.requestId});
  assert.deepEqual(s.session('learner-demo',e.lessonId).result,result);
  const d=new JSDOM(matchingGame(e,'full',id=>c.words.find(w=>w.id===id),{},result));t.after(()=>d.window.close());
  const rows=[...d.window.document.querySelectorAll('.match-target')];
  assert.equal(rows.filter(el=>el.classList.contains('pair-correct')).length,1);
  assert.equal(rows.filter(el=>el.classList.contains('pair-incorrect')).length,2);
  assert.ok(rows.every(el=>/✓ Correct|✕ Incorrect/.test(el.textContent)));
  // Old attempts gain server display metadata without rewriting history or their overall grade.
  const state=s.learner('learner-demo');delete state.attempts[0].pairResults;s.saveLearner('learner-demo',state);
  const before=JSON.stringify(s.learner('learner-demo'));
  assert.deepEqual(s.session('learner-demo',e.lessonId).result.pairResults,result.pairResults);
  assert.equal(JSON.stringify(s.learner('learner-demo')),before);
});

test('correct matching summary follows authored ID order regardless of selection order',()=>{
  const e={type:'matching',wordIds:['w-hu','w-hi','w-mi']};
  const html=exerciseFeedback(e,{correct:true,answer:{'w-hu':'he','w-mi':'who','w-hi':'she'},expected:{'w-hu':'he','w-hi':'she','w-mi':'who'}});
  assert.equal(html.match(/Your answer: <bdi>([^<]*)/)[1],html.match(/Accepted answer: <bdi>([^<]*)/)[1]);
});
