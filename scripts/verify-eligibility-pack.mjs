// Reproduce Curriculum's supplied evidence without writing to its source checkout.
// This verifies the acceptance transport, not the application's eligibility logic.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const artifact = path.join(root, 'docs/content-provenance/eligibility-acceptance-20261018');
const fixturePath = path.join(artifact, 'FIXTURES.json');
const hash = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const read = file => JSON.parse(readFileSync(file, 'utf8'));
const expectedHash = '1601f231797714021a9ee11f812d461b415599c74094a3284050509b57520957';
assert.equal(hash(fixturePath), expectedHash, 'The supplied acceptance fixture changed');
const supplied = read(fixturePath);
for (const input of supplied.sourceInputs) {
  assert.ok(existsSync(input.path), `Source unavailable; restore the supplied handoff: ${input.path}`);
  assert.equal(hash(input.path), input.sha256, `Source changed: ${input.path}`);
}

const scratch = mkdtempSync(path.join(tmpdir(), 'hebleo-eligibility-reproduce-'));
const copiedPack = path.join(scratch, 'eligibility-acceptance-20261018');
const copiedSource = path.join(scratch, 'lexeme-consolidation-20261018');
mkdirSync(copiedPack);
mkdirSync(copiedSource);
for (const name of ['FIXTURES.json', 'build.cjs', 'validate.cjs']) {
  copyFileSync(path.join(artifact, name), path.join(copiedPack, name));
}
for (const input of supplied.sourceInputs.slice(2)) {
  copyFileSync(input.path, path.join(copiedSource, path.basename(input.path)));
}
const execute = name => {
  const result = spawnSync(process.execPath, [path.join(copiedPack, name)], {
    cwd: root, encoding: 'utf8', timeout: 60_000
  });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `${name} failed: ${result.stderr || result.stdout}`);
  return JSON.parse(result.stdout.trim());
};

const validation = execute('validate.cjs');
assert.equal(validation.fixtureSha256, expectedHash);
const generation = execute('build.cjs');
const rebuilt = read(path.join(copiedPack, 'FIXTURES.json'));
// Four inventory paths move to scratch. No data, approval, expectation, hash or
// source locator is normalized; these must all remain identical to the handoff.
const normalizePaths = pack => ({
  ...pack,
  sourceInputs: pack.sourceInputs.map(input => ({ ...input, path: path.basename(input.path) }))
});
assert.deepEqual(normalizePaths(rebuilt), normalizePaths(supplied), 'Rebuilt acceptance data differs');
const rebuiltValidation = execute('validate.cjs');
assert.equal(rebuiltValidation.checks, validation.checks);
assert.equal(hash(fixturePath), expectedHash, 'Original fixture was modified');

const report = {
  status: 'PASS',
  scope: 'Source/fixture integrity and reproducibility only',
  fixtureSha256: expectedHash,
  ...Object.fromEntries(['cases', 'words', 'exactBindings', 'semanticSlots', 'checks'].map(key => [key, validation[key]])),
  generation,
  rebuiltMatchesSuppliedExceptRelocatedInputPaths: true,
  originalFixtureUnchanged: true,
  applicationRuntimeTested: false,
  nativeRenderingTested: false,
  linguisticApproval: false,
  testOverlaysPublishable: false
};
if (process.argv[2]) writeFileSync(path.resolve(process.argv[2]), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
