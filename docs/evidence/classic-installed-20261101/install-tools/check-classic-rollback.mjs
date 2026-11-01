// Read-only preflight. This script never downgrades code or restores a database.
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {databaseReceipt} from './hebleo-classic/scripts/runtime-state.mjs';
const folder='installed-classic-editor-20261101/';
const prepared=JSON.parse(readFileSync(folder+'PREPARED.json'));
const applied=JSON.parse(readFileSync(folder+'APPLIED.json'));
assert.deepEqual(databaseReceipt(prepared.backup),prepared.before,'Pre-update backup must match old executable receipt');
assert.equal(prepared.oldBuild.revision,'3e01c79ebc51c72a8eff11b56e406367b87502a1');
const current=databaseReceipt(prepared.database);
const unchangedSinceUpdate=current.sha256===applied.after.sha256;
const result={readOnly:true,matchingPreUpdateBackup:true,oldExecutable:prepared.oldBuild.revision,oldRuntimeSha256:prepared.oldBuild.runtimeSha256,currentReceipt:current.sha256,unchangedSinceUpdate,automaticRollbackAllowed:false,reason:unchangedSinceUpdate?'Rollback requires an explicitly guarded paired executable/database recovery; no automatic downgrade.':'Refuse rollback: original changed after installation, including new progress. Do not overwrite newer state or run old code against newer private image approvals.',noDatabaseOrExecutableWritten:true};
writeFileSync(folder+'ROLLBACK_PREFLIGHT.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
