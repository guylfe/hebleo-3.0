import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {databaseReceipt} from './hebleo-classic/scripts/runtime-state.mjs';
const prepared=JSON.parse(readFileSync('installed-classic-editor-20261101/PREPARED.json'));
assert.deepEqual(databaseReceipt(prepared.database),prepared.before,'Concurrent original write: refuse this installation');
console.log('Original receipt still equals fresh backup.');
