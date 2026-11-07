// Read-only independent comparison with the frozen authored draft and prior matrix.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const ledger=JSON.parse(fs.readFileSync('docs/content-provenance/conjugation-20261107/PROVENANCE_LEDGER.json','utf8'));
for(const input of ledger.inputs)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(input.path)).digest('hex'),input.sha256.toLowerCase());
const draft=JSON.parse(fs.readFileSync(ledger.inputs.find(i=>i.path.endsWith('conjugation-practice-source.draft.json')).path,'utf8'));
const items=new Map([...draft.verbs,...draft.prepositions].map(w=>[w.id,w]));
let compared=0;
for(const unit of ledger.heldCourseReviewUnits){
  const e=unit.courseEvidence;if(!Object.hasOwn(e,'sourceValue'))continue;
  const item=items.get(unit.wordId);assert(item);
  if(unit.category!=='preposition'){const table=item.sourceEvidence.sources.find(s=>s.postId===e.postId&&s.tableIndex===e.tableIndex);assert.equal(table.tableRows[e.rowIndex][e.cellIndex],e.sourceValue);}
  else{const form=item.sourceEvidence.forms.find(f=>f.slot===e.slot);for(const k of ['postId','tableIndex','rowIndex','cellIndex','sourceValue'])assert.equal(form[k],e[k]);}
  assert.equal(unit.approval,'held');assert.equal(unit.unpointedEvidence,null);compared++;
}
assert.equal(compared,302);assert.equal(ledger.heldCourseReviewUnits.length,509);assert.equal(ledger.heldExternalVerbProposals.length,308);
console.log(JSON.stringify({verifiedInputHashes:ledger.inputs.length,sourceCellsCompared:compared,heldReviewUnits:509,separateExternalProposals:308,approvedGradingForms:0},null,2));
