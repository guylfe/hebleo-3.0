// Read-only QA: compares receipt, backup and current original DB without opening Store.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {databaseReceipt} from '../scripts/runtime-state.mjs';
const root=process.argv[2];
assert.ok(root,'Supply the Lead evidence root containing preservation/before.json and after.json.');
const before=JSON.parse(readFileSync(resolve(root,'preservation/before.json')));
const after=JSON.parse(readFileSync(resolve(root,'preservation/after.json')));
assert.deepEqual(before.before,after.after);
assert.deepEqual(before.content,after.content);
const backup=databaseReceipt(before.backup),live=databaseReceipt(before.database);
assert.deepEqual(backup,before.before);assert.deepEqual(live,before.before);
const result={at:new Date().toISOString(),beforeSha256:before.before.sha256,afterSha256:after.after.sha256,liveSha256:live.sha256,backupSha256:backup.sha256,sourceDigest:after.content.sourceDigest,allTablesAndSchemaEqual:true,backupReadOnly:true,liveReadOnly:true};
writeFileSync('qa-preservation.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
