import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {seed} from '../src/seed.js';
const {applyExerciseEdits,renderExerciseEditor}=await import(new URL(process.env.FEEDBACK18_EXERCISE_MODULE || '../public/studio/exercise-editor.js',import.meta.url));

test('guided UI cannot offer a vowel requirement even for a legacy flagged exercise',()=>{
  const exercise={...seed.exercises[1],requireNikkud:true},dom=new JSDOM(renderExerciseEditor(exercise,seed));
  try {assert.equal(dom.window.document.querySelector('[name=requireNikkud]'),null);} finally {dom.window.close();}
});

test('legacy vowel metadata is retained but guided patch attempts are rejected without mutation',()=>{
  const exercise={...seed.exercises[1],requireNikkud:true,sourceSentinel:{unknown:'keep'}},before=structuredClone(exercise);
  assert.throws(()=>applyExerciseEdits(exercise,{requireNikkud:false}),/read-only/);
  assert.deepEqual(exercise,before);
  const saved=applyExerciseEdits(exercise,{feedbackDetails:'Synthetic authored feedback'});
  assert.equal(saved.requireNikkud,true);assert.deepEqual(saved.sourceSentinel,before.sourceSentinel);
});

test('authored short/detailed feedback share a named group separate from concept metadata',()=>{
  const dom=new JSDOM(renderExerciseEditor(seed.exercises[1],seed));
  try {
    const doc=dom.window.document,concept=doc.querySelector('[name=concept]').closest('[role=group]'),feedback=doc.querySelector('[name=feedback]').closest('[role=group]');
    assert.ok(concept&&feedback&&concept!==feedback);assert.match(concept.getAttribute('aria-label'),/Concept metadata/);
    assert.match(feedback.getAttribute('aria-label'),/Authored feedback/);assert.equal(doc.querySelector('[name=feedbackDetails]').closest('[role=group]'),feedback);
  } finally {dom.window.close();}
});
