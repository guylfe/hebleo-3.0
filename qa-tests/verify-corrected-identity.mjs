import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {executableIdentity} from '../scripts/runtime-state.mjs';

// Run before creating the QA-only evidence commit. Expected receipt is retained.
const actual=executableIdentity(process.cwd(),'b67b67b3838fa37f38798946ec24ccb16522a7bd');
const expected=JSON.parse(readFileSync(new URL('../QA_CORRECTED_IDENTITY.json',import.meta.url),'utf8'));
assert.deepEqual(actual,expected,'Every actual executable-file hash must match the supplied fresh-byte receipt');
console.log(JSON.stringify({revision:actual.revision,runtime:actual.runtimeSha256,backend:actual.backendSha256,files:Object.keys(actual.files).length,exactReceipt:true}));
