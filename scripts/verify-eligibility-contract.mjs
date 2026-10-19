// Runs source-backed cases against an actual module snapshot. No runtime writes.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { adaptEligibilityCase, assertEligibilityCase } from './eligibility-fixture-adapter.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const option = name => { const index = process.argv.indexOf(name); return index < 0 ? null : process.argv[index + 1]; };
const contractPath = path.resolve(option('--contract') ?? path.join(root, 'public/lexical-contract.js'));
const fixturePath = path.join(root, 'docs/content-provenance/eligibility-acceptance-20261018/FIXTURES.json');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const fixtureBytes = readFileSync(fixturePath);
assert.equal(sha256(fixtureBytes), '1601f231797714021a9ee11f812d461b415599c74094a3284050509b57520957');
const pack = JSON.parse(fixtureBytes);
const moduleBytes = readFileSync(contractPath);
// Import the exact hashed bytes, not a moving teammate working file. The current
// contract is self-contained; relative imports must be integrated before this is used.
const api = await import('data:text/javascript;base64,' + moduleBytes.toString('base64'));
assert.deepEqual(api.SLOT_IDS, pack.slotMap.map(mapping => mapping.semanticSlot));
assert.equal(pack.sourceApproval, false);
assert.equal(pack.syntheticContext, true);
const cases = pack.cases.map(testCase => {
  try { return assertEligibilityCase(pack, testCase, adaptEligibilityCase(pack, testCase, api), api); }
  catch (error) { return {id: testCase.id, status: 'FAIL', error: error.message}; }
});
const negativeControls = [];
if (cases.every(result => result.status === 'PASS')) {
  const controls = [
    ['source-presence-unlocks', 'V00-citation-with-no-expanded-unlocks', (output) => {
      for (const slot of output.slots) if (slot.sourceState === 'available') slot.state = 'available';
    }],
    ['cross-course-leak', 'T04-other-course-no-leak', output => {
      output.slots.find(slot => slot.slotId === 'verb.past.he').state = 'available';
    }],
    ['citation-order-substitution', 'V00-citation-with-no-expanded-unlocks', output => output.citation.slots.reverse()],
    ['unapproved-form-eligible', 'V08-unapproved-draft-never-eligible', output => {
      output.slots.find(slot => slot.slotId === 'verb.infinitive').state = 'available';
    }]
  ];
  for (const [id, caseId, mutate] of controls) {
    const testCase = pack.cases.find(testCase => testCase.id === caseId);
    const adapted = adaptEligibilityCase(pack, testCase, api);
    const altered = structuredClone(api.computeEligibility(adapted.content, adapted.catalogue, adapted.context));
    mutate(altered);
    let caught = false;
    try { assertEligibilityCase(pack, testCase, adapted, api, altered); }
    catch (error) { if (error.code !== 'ERR_ASSERTION') throw error; caught = true; }
    negativeControls.push({id, status: caught ? 'PASS' : 'FAIL', defectDetected: caught});
  }
}
const status = cases.every(result => result.status === 'PASS') && negativeControls.length === 4
  && negativeControls.every(result => result.defectDetected) ? 'PASS' : 'FAIL';
const report = {
  status, scope: 'Pure resolver projection against a provisional implementation; not full application acceptance',
  contract: {path: contractPath, sha256: sha256(moduleBytes), revision: option('--revision') ?? 'uncommitted provisional snapshot'},
  fixtureSha256: sha256(fixtureBytes), casesExecuted: cases.length,
  casesPassed: cases.filter(result => result.status === 'PASS').length,
  assertions: cases.reduce((sum, result) => sum + (result.assertions ?? 0), 0),
  negativeControls, cases,
  nativeRenderingTested: false, studioPersistenceTested: false, publishingTested: false,
  migrationApplyTested: false, answerKeyIntegrationTested: false, linguisticApproval: false,
  overlaysPublishable: false,
  limitations: ['Original canonical lesson feed remains unconnected.',
    'Resolver state/fixture label differences and presentation expectations are listed per case.',
    'No production code copied or edited; no learner database or workbook written.']
};
if (option('--report')) writeFileSync(path.resolve(option('--report')), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({...report, cases: cases.filter(result => result.status === 'FAIL')}));
if (status !== 'PASS') process.exitCode = 1;
