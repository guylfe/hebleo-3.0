import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {databaseReceipt,executableIdentity} from './hebleo-first20/scripts/runtime-state.mjs';
const identity=JSON.parse(readFileSync('FIRST20_BUILD_2053b8f.json'));
assert.deepEqual(executableIdentity(resolve('hebleo-first20'),identity.revision),identity);
const baseline=JSON.parse(readFileSync('hebleo-first20/.private/first20-install-preflight-2053b8f/receipt.json'));
assert.deepEqual(databaseReceipt(baseline.database),baseline.before,'Owner database changed since the fresh successful rehearsal.');
console.log(JSON.stringify({revision:identity.revision,databaseSHA256:baseline.before.sha256,unchanged:true}));
