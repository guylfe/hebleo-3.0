import {test} from 'node:test';
import assert from 'node:assert/strict';
import {semanticErrors} from '../tools/contracts.mjs';
import {seed} from '../../src/seed.js';
test('QA-NEW7-01 schema semantics reject empty-effective authored keys without rewriting source',()=>{
 for(const type of ['typing','cloze','transformation','ordering'])for(const key of ['ַ','... ?!','\u200b','\u0301']){
  const pack=structuredClone(seed),e=pack.exercises.find(e=>e.type===type);e.answers=[key];const before=JSON.stringify(pack);
  assert.match(semanticErrors(pack).join(),/accepted answers need grading content/);assert.equal(JSON.stringify(pack),before);
 }
 const pack=structuredClone(seed),e=pack.exercises.find(e=>e.type==='typing');e.answers=['  אֲנִי  '];const before=JSON.stringify(pack);assert.deepEqual(semanticErrors(pack),[]);assert.equal(JSON.stringify(pack),before);
});
