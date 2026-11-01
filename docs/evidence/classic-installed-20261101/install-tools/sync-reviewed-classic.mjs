import {readFileSync,copyFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import assert from 'node:assert/strict';
import {executableIdentity} from './hebleo-classic/scripts/runtime-state.mjs';
const prepared=JSON.parse(readFileSync('installed-classic-editor-20261101/PREPARED.json'));
const source=resolve('hebleo-classic'),target=resolve('hebleo-editor');
assert.deepEqual(executableIdentity(source,prepared.identity.revision),prepared.identity);
try{await fetch('http://127.0.0.1:63358/api/build');throw Error('Stop original service before executable sync');}catch(e){assert.equal(e.cause?.code,'ECONNREFUSED');}
// Verify committed content first; copy only the reviewed executable paths to retain identical raw line endings.
executableIdentity(target,prepared.identity.revision);
for(const file of Object.keys(prepared.identity.files)){
 assert.ok(/^(public\/|src\/|scripts\/|package(?:-lock)?\.json$)/.test(file)&&!file.includes('..'));
 const destination=resolve(target,file);assert.ok(destination.startsWith(target+'\\'));
 mkdirSync(dirname(destination),{recursive:true});copyFileSync(resolve(source,file),destination);
}
assert.deepEqual(executableIdentity(target,prepared.identity.revision),prepared.identity);
console.log('All151 reviewed raw executable hashes match installed checkout. No database copied.');
