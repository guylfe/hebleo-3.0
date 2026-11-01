// Field-local DOM model; reuse proven source ranges and minimal HTML patches.
import {sourceRegions,patchHTML,supportedHTML} from './source-adapter.js';
export function createClassicAdapter({source,marked,doc,sanitize}){
 const regions=sourceRegions(source,marked),original=[];
 const holder=html=>{const box=doc.createElement('div');box.innerHTML=html;return box;};
 for(const [index,r] of regions.entries()){
  r.raw=source.slice(r.start,r.end);const rendered=r.kind==='markdown'?marked.parse(r.raw):r.raw;if(!supportedHTML(rendered)||/<input\b|\uFEFF/i.test(rendered))r.kind='opaque';
  const html=r.kind==='opaque'?'<div data-retained="'+index+'" contenteditable="false" class="author-opaque">Retained source boundary · edit prose on either side.</div>':sanitize(r.kind==='html'?r.raw:marked.parse(r.raw));
  for(const node of holder(html).childNodes)if(node.nodeType===1||node.textContent.trim())original.push({html:node.outerHTML||node.textContent,region:r});
 }
 if(!original.length)original.push({html:'<p><br></p>',region:{start:0,end:source.length,raw:source,kind:'html'}});
 let initial=original.map(x=>x.html).join(''),newline=source.includes('\r\n')?'\r\n':'\n';
 const read=value=>[...holder(value).childNodes].filter(n=>n.nodeType===1||n.textContent.trim()).map(n=>({html:n.outerHTML||n.textContent,node:n}));
 const boundaries=original.filter(x=>x.region.kind==='opaque').map(x=>x.html);
 function validate(value){
  const box=holder(value),actual=[...box.querySelectorAll('[data-retained]')];
  if(actual.length!==boundaries.length||actual.some((n,i)=>n.parentNode!==box||n.outerHTML!==boundaries[i]))throw Error('This edit crosses retained source. Your input is retained; undo the crossing or recover through Advanced source.');
 }
 function metadata(html){const box=holder(html),out=[];box.querySelectorAll('*').forEach(el=>{for(const a of el.attributes)if(!['style','dir','href','src','alt','rel','loading'].includes(a.name))out.push([a.name,a.value]);});return out.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));}
 function ensureRetained(raw,value){const before=metadata(raw),after=metadata(value);for(const item of before){const key=JSON.stringify(item),at=after.findIndex(x=>JSON.stringify(x)===key);if(at<0)throw Error('This edit would remove retained source attributes. Undo the structure change or recover through Advanced source. Your input is retained.');after.splice(at,1);}for(const comment of raw.match(/<!--[\s\S]*?-->/g)||[])if(!value.includes(comment))throw Error('This edit would remove a retained comment. Undo this change; your input is retained.');return value;}
 function compile(value){
  if(value===initial)return source;validate(value);
  const next=read(value),edits=[];let i=0,j=0;
  while(i<original.length||j<next.length){
   if(original[i]?.html===next[j]?.html&&i<original.length&&j<next.length){i++;j++;continue;}
   const from=i,newFrom=j;let match;
   for(let distance=1;distance<=original.length-i+next.length-j&&!match;distance++)for(let a=0;a<=distance;a++){const b=distance-a;if(original[i+a]&&next[j+b]&&original[i+a].html===next[j+b].html){match=[i+a,j+b];break;}}
   const oldEnd=match?.[0]??original.length,newEnd=match?.[1]??next.length,old=original.slice(from,oldEnd),fresh=next.slice(newFrom,newEnd);
   if(old.some(x=>x.region.kind==='opaque')||fresh.some(x=>x.node.querySelector?.('[data-retained]')||x.node.hasAttribute?.('data-retained')))throw Error('This operation crosses retained source. Undo it before saving; your current input is retained.');
   const start=old[0]?.region.start??original[from]?.region.start??original.at(-1).region.end,end=old.at(-1)?.region.end??start;
   if(old.length===fresh.length&&old.every(x=>original.filter(y=>y.region===x.region).length===1)){
    old.forEach((entry,k)=>{
     const safe=sanitize(fresh[k].html);let value=entry.region.kind==='html'?patchHTML(entry.region.raw,entry.html,safe,doc):null;
     if(value===null){if(/<!--|\s(?:data-[\w-]+|class|id)\s*=/i.test(entry.region.raw))throw Error('This structure contains retained metadata. Undo the structure change or use Advanced source. Your input is retained.');value=safe;}
     edits.push([entry.region.start,entry.region.end,ensureRetained(entry.region.raw,value)]);
    });
   }else{
    const replacements=fresh.map(n=>sanitize(n.html));
    if(old.length===1&&fresh.length&&old[0].region.kind==='html'){
     const kept=patchHTML(old[0].region.raw,old[0].html,replacements[0],doc);
     if(kept!==null)replacements[0]=kept;
    }
    const value=replacements.join(newline+newline);
    ensureRetained(old.map(x=>x.region.raw).join(''),value);
    edits.push([start,end,(old.length?'':from>0?newline+newline:'')+value+(old.length?'':from<original.length?newline+newline:'')]);
   }
   i=oldEnd;j=newEnd;
  }
  let out=source;for(const [start,end,value] of edits.sort((a,b)=>b[0]-a[0]))out=out.slice(0,start)+value+out.slice(end);return out;
 }
 return {get initial(){return initial;},compile,validate,regions,adoptInitial(value){validate(value);const normalized=read(value);if(normalized.length!==original.length)throw Error('Editor mount changed source structure. Exact source is retained.');normalized.forEach((n,i)=>original[i].html=n.html);initial=value;}};
}
