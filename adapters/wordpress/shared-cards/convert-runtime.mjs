import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const [input,output]=process.argv.slice(2);
if(!input||!output) throw Error('node convert-runtime.mjs runtime.json wordpress.json');
const r=JSON.parse(await readFile(input,'utf8'));
if(r.schemaVersion!==1||r.adapterVersion!=='1.0.0')throw Error('Unsupported renderer artifact');
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const bindings={};
const notes=r.raw.notes.map(n=>{
 const documents={}; for(const direction of ['he-en','en-he']){
 const matches=r.cards.filter(c=>c.sourceId===n.id&&c.direction===direction);
 if(matches.length!==1)throw Error('Missing/duplicate direction'); const c=matches[0];documents[direction]={front:c.front,back:c.back};}
 const m=/^\[sound:([^\]]+)\]$/.exec(n.fields.Audio);
 if(m){const b={sourceId:n.id,formKey:'Audio',formValue:n.fields.HebrewNikkud,file:m[1]};bindings[hash([b.sourceId,b.formKey,b.formValue])]=b;}
 return {id:n.id,fields:n.fields,documents};
});
const p={schema:'hebleo-wp-shared/1',packageSha256:r.packageSha256,fields:r.raw.fields,mediaBaseUrl:r.mediaBaseUrl,notes,media:r.mediaManifest,bindings};
await writeFile(output,JSON.stringify(p)+'\n',{flag:'wx'});
console.log(JSON.stringify({notes:notes.length,cards:r.cards.length,media:r.mediaManifest.length,baseAudioBindings:Object.keys(bindings).length,sha256:createHash('sha256').update(await readFile(output)).digest('hex')}));
