import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parseFragment} from 'parse5';
const [input,output]=process.argv.slice(2);
if(!input||!output) throw Error('node convert-runtime.mjs runtime.json wordpress.json');
const r=JSON.parse(await readFile(input,'utf8'));
if(r.schemaVersion!==1||r.adapterVersion!=='1.0.0')throw Error('Unsupported renderer artifact');
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const all=n=>[n,...(n.childNodes||[]).flatMap(all)];
const attr=(n,k)=>n.attrs?.find(a=>a.name===k)?.value;
const text=n=>n.nodeName==='#text'?n.value:(n.childNodes||[]).map(text).join('');
const bindings={};
const notes=r.raw.notes.map(n=>{
 const documents={}; for(const direction of ['he-en','en-he']){
 const matches=r.cards.filter(c=>c.sourceId===n.id&&c.direction===direction);
 if(matches.length!==1)throw Error('Missing/duplicate direction'); const c=matches[0];documents[direction]={front:c.front,back:c.back};}
 const m=/^\[sound:([^\]]+)\]$/.exec(n.fields.Audio);
 if(m){const b={sourceId:n.id,formKey:'Audio',formValue:n.fields.HebrewNikkud,file:m[1]};bindings[hash([b.sourceId,b.formKey,b.formValue])]=b;}
 for(const row of all(parseFragment(n.fields.Forms)).filter(n=>attr(n,'data-phrase'))){
  const number=attr(row,'data-phrase'),value=all(row).find(n=>attr(n,'class')?.split(' ').includes('hc-pointed')),play=all(row).find(n=>n.tagName==='button'&&attr(n,'data-audio'));
  if(!/^(?:[1-9]|[1-8][0-9]|9[0-7])$/.test(number)||!value||!play)throw Error('Invalid supplied phrase binding');
  const b={sourceId:n.id,formKey:'Phrase:'+number,formValue:text(value),file:attr(play,'data-audio')};bindings[hash([b.sourceId,b.formKey,b.formValue])]=b;
 }
 return {id:n.id,fields:n.fields,documents};
});
const p={schema:'hebleo-wp-shared/1',packageSha256:r.packageSha256,fields:r.raw.fields,mediaBaseUrl:r.mediaBaseUrl,notes,media:r.mediaManifest,bindings};
await writeFile(output,JSON.stringify(p)+'\n',{flag:'wx'});
console.log(JSON.stringify({notes:notes.length,cards:r.cards.length,media:r.mediaManifest.length,audioBindings:Object.keys(bindings).length,baseAudioBindings:Object.values(bindings).filter(b=>b.formKey==='Audio').length,phraseBindings:Object.values(bindings).filter(b=>b.formKey.startsWith('Phrase:')).length,sha256:createHash('sha256').update(await readFile(output)).digest('hex')}));
