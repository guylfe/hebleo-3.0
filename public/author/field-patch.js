// IDs are immutable; settings replace only existing authored keys, preserving
// unknown source metadata. The server still validates every full-workspace save.
export function patchAuthorField(content,target,field,value,{clone=true,immutable=false}={}){
 let next=clone?structuredClone(content):content;
 if(immutable){
  const li=content.lessons.findIndex(x=>x.id===target.lessonId);if(li<0)throw new Error('This source block no longer exists.');
  const l={...content.lessons[li]},lessons=content.lessons.slice();lessons[li]=l;next={...content,lessons};
  const bi=target.componentId==null?-1:(l.blocks?.findIndex(x=>x.id===target.componentId)??-1);
  if(bi>=0){const b={...l.blocks[bi]};l.blocks=l.blocks.slice();l.blocks[bi]=b;
   const pi=target.pageId==null?-1:(b.textPages?.pages.findIndex(x=>x.id===target.pageId)??-1);
   if(pi>=0){const pages=b.textPages.pages.slice();pages[pi]={...pages[pi]};b.textPages={...b.textPages,pages};}
  }
 }
 const l=next.lessons.find(x=>x.id===target.lessonId),b=target.componentId==null?undefined:l?.blocks?.find(x=>x.id===target.componentId),p=target.pageId==null?undefined:b?.textPages?.pages.find(x=>x.id===target.pageId),owner=p||b||l;
 if(!owner||(target.componentId!=null&&!b)||(target.pageId!=null&&!p))throw new Error('This source block no longer exists.');
 if(field==='activity'){
  const candidate=JSON.parse(value),original=owner.activity;
  if(!candidate||Array.isArray(candidate)||typeof candidate!=='object'||!original||candidate.id!==original.id||candidate.kind!==original.kind)throw new Error('Keep the existing activity ID and kind.');
  const checkIDs=(a,b)=>{if(!a||typeof a!=='object')return;if(a.id!==undefined&&a.id!==b?.id)throw new Error('Activity and item IDs are immutable.');if(Array.isArray(a)){if(!Array.isArray(b)||a.length!==b.length)throw new Error('Keep the existing activity items.');a.forEach((v,i)=>checkIDs(v,b[i]));}else for(const k of Object.keys(a))if(a[k]&&typeof a[k]==='object')checkIDs(a[k],b?.[k]);};checkIDs(original,candidate);
  const merge=(old,edited)=>Array.isArray(old)?old.map((v,i)=>merge(v,edited[i])):old&&typeof old==='object'?Object.fromEntries(Object.keys(old).map(k=>[k,edited[k]===undefined?old[k]:merge(old[k],edited[k])])):edited;
  owner.activity=merge(original,candidate);
 }else if(field==='pageSettings'){
  const settings=JSON.parse(value),allowed=['prompt','options','answer','explanation','durationMs','value','media','gate'];
  if(!settings||typeof settings!=='object'||Array.isArray(settings)||Object.keys(settings).some(k=>!allowed.includes(k)))throw new Error('Keep only the existing page settings fields; page IDs and types stay fixed.');
  Object.assign(owner,settings);
 }else if(field==='options.extraInformation'){
  if(!b)throw new Error('Extra information requires the current source component.');b.options={...b.options,extraInformation:value};
 }else if(['title','html','text','explanation','prompt','extraInformation'].includes(field))owner[field]=value;
 else throw new Error('This field is not editable here.');
 return next;
}
