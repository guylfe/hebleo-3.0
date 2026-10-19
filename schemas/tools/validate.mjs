import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { validateSchema, semanticErrors, publicationEligibility } from './contracts.mjs';
import { seed } from '../../src/seed.js';
import { dump } from './runtime-utils.mjs';

const args = process.argv.slice(2), repo = fileURLToPath(new URL('../../', import.meta.url));
const option = name => args.includes(name) ? args[args.indexOf(name) + 1] : undefined;
let value, name, bytes;
if (args.includes('--seed')) { value = structuredClone(seed); name = 'synthetic seed'; }
else if (option('--candidate-ref')) {
  const ref = option('--candidate-ref');
  if (!/^[a-f0-9]{7,40}$/.test(ref)) throw new Error('Use a pinned candidate commit SHA.');
  name = ref + ':docs/curriculum/lesson-1.3/candidate-pack.json';
  bytes = execFileSync('git', ['show', name], { cwd: repo });
  value = JSON.parse(bytes.toString('utf8'));
} else if (option('--file')) { name = resolve(option('--file')); bytes = readFileSync(name); value = JSON.parse(bytes.toString('utf8')); }
else throw new Error('Use --seed, --file <json>, or --candidate-ref <sha>; optional --runtime <checkout> --expect-ineligible.');
const before = JSON.stringify(value), structure = validateSchema('content-pack', value);
const semantics = structure.length ? [] : semanticErrors(value);
const report = { input: name, ...(bytes ? { inputSha256: createHash('sha256').update(bytes).digest('hex') } : {}), structuralErrors: structure, semanticErrors: semantics };
report.canonicalPublication = publicationEligibility(value);
report.privateDemoPublication = publicationEligibility(value, { mode: 'private-demo' });
report.pendingObjects = ['words', 'lessons', 'exercises'].flatMap(k => (value[k] || []).filter(o => o.provenance?.approval === 'pending' || o.approval?.status === 'pending').map(o => `${k}/${o.id}`));
report.derivedForms = (value.words || []).filter(w => w.provenance?.derived).map(w => ({ id: w.id, derived: w.provenance.derived }));
if (option('--runtime')) {
  const { Store } = await import(pathToFileURL(resolve(option('--runtime'), 'src/store.js')));
  const store = new Store(':memory:'), before = dump(store);
  try { store.stage({ baseRevisionId: store.get('active'), expectedDraftToken: null, content: value }); report.runtime = { accepted: true, operation: 'stage' }; }
  catch (e) { report.runtime = { accepted: false, operation: 'stage', code: e.code, error: e.message, failedRequestWroteNothing: before === dump(store) }; }
  finally { store.close(); }
}
report.inputUnchanged = before === JSON.stringify(value);
const output = args.includes('--summary') ? { ...report, canonicalPublication: { eligible: report.canonicalPublication.eligible, reasonCount: report.canonicalPublication.reasons.length }, privateDemoPublication: { eligible: report.privateDemoPublication.eligible, reasonCount: report.privateDemoPublication.reasons.length }, pendingObjects: report.pendingObjects.length, derivedForms: report.derivedForms.length } : report;
console.log(JSON.stringify(output, null, 2));
if (structure.length || semantics.length || !report.inputUnchanged || args.includes('--expect-ineligible') && (report.canonicalPublication.eligible || report.privateDemoPublication.eligible || report.runtime?.accepted)) process.exitCode = 1;
