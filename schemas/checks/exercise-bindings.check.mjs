import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Store} from '../../src/store.js';
import {validateSchema, semanticErrors, dependenciesFor, objectDigest} from '../tools/contracts.mjs';

function fixture(t) {
  const s=new Store();t.after(()=>s.close());const c=s.snapshot(),e=c.exercises.find(e=>e.type==='cloze');
  c.words.push({...c.words[0],id:'synthetic-binding-only'});
  e.vocabularyBindings=[{id:'synthetic-occurrence',wordId:'synthetic-binding-only',field:'answers',index:0,
    start:0,end:e.answers[0].length,text:e.answers[0],sourceText:e.answers[0]}];
  return {s,c,e};
}
test('bindings are structurally additive; shared semantics enforce surfaces/unique targets without mutation',t=>{
  const {c,e}=fixture(t),before=JSON.stringify(c);
  assert.deepEqual(validateSchema('content-pack',c),[]);assert.deepEqual(semanticErrors(c),[]);
  assert.equal(JSON.stringify(c),before);
  assert.ok(dependenciesFor('exercises',e,c).some(d=>d.collection==='words'&&d.id==='synthetic-binding-only'));
  const digest=objectDigest(e);e.vocabularyBindings[0].id='new-occurrence';
  assert.notEqual(objectDigest(e),digest);
  e.answers[0]+=' edited';assert.ok(semanticErrors(c).some(error=>error.includes('sourceText')));
  assert.deepEqual(validateSchema('content-pack',c),[],'exact slices require semantic validation');
});
test('author schema rejects invalid shape and learner schema forbids answer bindings before feedback',t=>{
  const {s,c,e}=fixture(t),wire=s.publicContent(c,e.lessonId);
  assert.deepEqual(validateSchema('learner-content',wire),[]);
  wire.exercises.find(x=>x.id===e.id).vocabularyBindings=e.vocabularyBindings;
  assert.ok(validateSchema('learner-content',wire).length);
  for(const mutate of [b=>{delete b.index;},b=>{b.index=-1;},b=>{b.extra=true;},b=>{b.wordId='__proto__';},
    b=>{b.field='answer';},b=>{b.field='prompt';},b=>{b.text='';},b=>{b.end=1.5;}]) {
    const bad=structuredClone(c);mutate(bad.exercises.find(x=>x.id===e.id).vocabularyBindings[0]);
    assert.ok(validateSchema('content-pack',bad).length);
  }
});
test('schema dependency audit follows binding-only references and rejects missing or ambiguous words',t=>{
  const {c,e}=fixture(t);
  c.words=c.words.filter(w=>w.id!=='synthetic-binding-only');
  const errors=semanticErrors(c);
  assert.ok(errors.some(error=>error.includes('missing dependency '+e.id)));
  assert.ok(errors.some(error=>error.includes('exactly one existing')));
});
test('actual saved-draft grade satisfies the strict wire schema with answer-only feedback bindings',t=>{
  const {s,c,e}=fixture(t);
  const staged=s.stage({baseRevisionId:s.get('active'),expectedDraftToken:null,content:c});
  const wire=s.previewEvaluate({lessonId:e.lessonId,exerciseId:e.id,draftToken:staged.draftToken,answer:'SYNTHETIC wrong'});
  assert.deepEqual(validateSchema('studio-wire',wire,'previewEvaluateResponse'),[]);
  wire.result.vocabularyBindings[0].field='prompt';delete wire.result.vocabularyBindings[0].index;
  assert.ok(validateSchema('studio-wire',wire,'previewEvaluateResponse').length);
});
