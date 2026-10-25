// Readable aliases are additive. Persisted primary IDs and source locators never move.
const collections=['lessons','words','exercises'];
const aliasRE=/^[A-Za-z0-9][A-Za-z0-9_.-]{0,119}$/;
const fail=message=>{throw new Error(message);};
const norm=value=>value.toUpperCase();
function entries(content,kind){return content[kind].flatMap(item=>[{id:item.id,value:item.id,namespace:'primary'},...(item.contentId?[{id:item.id,value:item.contentId,namespace:'readable'}]:[]),...(item.contentAliases||[]).map(a=>({...a,id:item.id}))]);}
export function validateContentIdentities(content){
 for(const kind of collections){const scoped=new Map(),global=new Map();
  for(const item of content[kind]){
   if(item.contentId!==undefined&&(!aliasRE.test(item.contentId)||typeof item.contentId!=='string'))fail('Invalid readable content ID.');
   if(item.contentAliases!==undefined&&(!Array.isArray(item.contentAliases)||item.contentAliases.length>100))fail('Invalid content aliases.');
   if(item.prerequisiteIds!==undefined&&(!Array.isArray(item.prerequisiteIds)||new Set(item.prerequisiteIds).size!==item.prerequisiteIds.length||item.prerequisiteIds.some(id=>id===item.id||!content.lessons.some(l=>l.id===id))))fail('Invalid prerequisite references.');
  }
  for(const entry of entries(content,kind)){
   if(typeof entry.value!=='string'||!aliasRE.test(entry.value)||typeof entry.namespace!=='string'||!aliasRE.test(entry.namespace)||['__proto__','constructor','prototype'].includes(entry.value))fail('Invalid namespaced content alias.');
   const key=entry.namespace+'/'+norm(entry.value),previous=scoped.get(key);if(previous&&previous!==entry.id)fail('Content alias collision: '+key);scoped.set(key,entry.id);
   if(['primary','readable'].includes(entry.namespace)){const key=norm(entry.value),previous=global.get(key);if(previous&&previous!==entry.id)fail('Readable alias collides with persisted identity: '+entry.value);global.set(key,entry.id);}
  }
 }
}
export function resolveContentID(content,kind,value,{namespace}={}){
 if(!collections.includes(kind)||typeof value!=='string')fail('Unknown content reference.');
 const found=[...new Set(entries(content,kind).filter(e=>(!namespace||e.namespace===namespace)&&norm(e.value)===norm(value)).map(e=>e.id))];
 if(!found.length)fail('Unknown content alias: '+value);if(found.length!==1)fail('Ambiguous content alias: '+value+'; name its namespace.');return found[0];
}
export function assertContentIdentityTransition(previous,next){
 for(const kind of collections)for(const old of previous[kind]){
  const item=next[kind].find(x=>x.id===old.id);
  if(old.draftImport&&!item)fail('Imported persisted identity cannot be removed or reissued by import.');
  if(!item)continue;
  if(old.draftImport&&JSON.stringify(old.draftImport)!==JSON.stringify(item.draftImport))fail('Frozen draft import identity cannot change.');
  const all=[item.contentId,...(item.contentAliases||[]).map(a=>a.value)].filter(Boolean).map(norm);
  if(old.contentId&&!all.includes(norm(old.contentId)))fail('Retain the former readable ID as an alias.');
  for(const a of old.contentAliases||[])if(!(item.contentAliases||[]).some(b=>b.namespace===a.namespace&&norm(a.value)===norm(b.value)))fail('Historical content aliases must be retained.');
 }
}
