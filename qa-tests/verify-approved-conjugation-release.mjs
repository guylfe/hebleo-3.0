// Verify the exact human-approved release against the integrated production engine.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {validateConjugationCatalog} from '../src/conjugation.js';
import {eligibleForms,Drill,answers,normalize} from '../public/conjugation/engine.js';

const file=fileURLToPath(new URL('../public/conjugation/catalog.json',import.meta.url));
const bytes=fs.readFileSync(file),sha256=crypto.createHash('sha256').update(bytes).digest('hex');
assert.equal(sha256,'fa58473bbd19b201829f9584482003d2d78e850d6bdef0b0f030837b92dd2ca1');
const catalog=validateConjugationCatalog(JSON.parse(bytes));
const forms=eligibleForms(catalog);
assert.equal(catalog.forms.length,508);assert.equal(forms.length,508);
assert.equal(catalog.words.filter(w=>w.kind==='verb').length,11);
assert.equal(catalog.words.filter(w=>w.kind==='prep').length,19);
assert.equal(forms.filter(f=>f.tense==='gerund').length,10);
assert(!forms.some(f=>f.id==='verb-proposal-02:gerund:lexeme'));
for(const w of catalog.words)assert(forms.some(f=>f.wordId===w.id),w.id);
let answerChecks=0,distractorChecks=0;
for(const form of forms)for(const direction of ['he','en']){
  const drill=new Drill(catalog,[form],{direction,random:()=>0.5});
  const valid=new Set(answers(form,forms,direction));
  assert.equal(drill.options.length,4,form.id+' '+direction);
  for(const other of drill.options.filter(f=>f.id!==form.id)){
    assert(!valid.has(normalize(direction==='he'?other.unpointed:other.english,direction)),form.id+' distractor');
    distractorChecks++;
  }
  assert.equal(drill.grade(direction==='he'?form.unpointed:form.english,'write'),true,form.id+' '+direction);
  answerChecks++;
}
console.log(JSON.stringify({sha256,approvedForms:forms.length,verbs:11,prepositions:19,actionNouns:10,answerChecks,distractorChecks,excludedHeldActionNoun:true}));
