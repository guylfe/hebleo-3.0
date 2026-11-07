// Verify a fresh complete package; refuse overlays retaining deprecated public data.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const root=path.resolve(process.argv[2]||'');assert(process.argv[2],'Supply package directory');
const manifest=JSON.parse(await fs.readFile(path.join(root,'manifest.json'),'utf8'));
assert.equal(manifest.schema,2);assert.deepEqual(manifest.forbiddenFiles,['assets/catalog.json']);
for(const file of manifest.forbiddenFiles)assert.equal(await fs.stat(path.join(root,file)).then(()=>true,()=>false),false,'Deprecated public catalog remains: '+file);
async function files(directory,prefix=''){const result=[];for(const entry of await fs.readdir(directory,{withFileTypes:true})){const relative=prefix+entry.name;if(entry.isDirectory())result.push(...await files(path.join(directory,entry.name),relative+'/'));else result.push(relative);}return result;}
assert.deepEqual((await files(root)).sort(),['manifest.json',...Object.keys(manifest.files)].sort(),'Package must be a complete replacement with no unreviewed extra files');
for(const [file,hash]of Object.entries(manifest.files)){
  const resolved=path.resolve(root,file);assert(resolved.startsWith(root+path.sep),'Manifest path escapes package');
  assert.equal(crypto.createHash('sha256').update(await fs.readFile(resolved)).digest('hex'),hash,file);
}
console.log(JSON.stringify({filesVerified:Object.keys(manifest.files).length,approvedForms:manifest.approvedForms,deprecatedPublicCatalogAbsent:true}));
