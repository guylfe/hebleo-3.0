// Field-local DOM model; reuse proven source ranges and minimal HTML patches.
import {sourceRegions,patchHTML,supportedHTML,encodeBlockSeparators} from './source-adapter.js';
export function createClassicAdapter({source,marked,doc,sanitize,project}){
 const regions=sourceRegions(source,marked,{fullMarkdownTokens:true}),original=[];
 const holder=html=>{const box=doc.createElement('div');box.innerHTML=html;return box;};
 const clean=html=>{const box=holder(html);box.querySelectorAll('[data-classic-region]').forEach(n=>n.removeAttribute('data-classic-region'));return box.innerHTML;};
 const projection=project||((value)=>holder(sanitize(marked.parse(value))).textContent);
 const sourceProjection=projection(source);
 for(const [index,r] of regions.entries()){
  r.raw=source.slice(r.start,r.end);const rendered=r.kind==='markdown'?marked.parse(r.raw):r.raw;if(!supportedHTML(rendered)||/<input\b|\uFEFF/i.test(rendered))r.kind='opaque';
  const html=r.kind==='opaque'?'<div data-retained="'+index+'" contenteditable="false" class="author-opaque">Retained source boundary · edit prose on either side.</div>':sanitize(r.kind==='html'?r.raw:marked.parse(r.raw));
  r.rendered=html;r.rawRendered=r.kind==='markdown'?marked.parse(r.raw):html;
  const box=holder(html),children=[...box.childNodes],meaningful=children.filter(n=>n.nodeType===1||n.textContent.trim());
  r.prefix=children.slice(0,children.indexOf(meaningful[0])).map(n=>n.textContent).join('');
  r.suffix=children.slice(children.indexOf(meaningful.at(-1))+1).map(n=>n.textContent).join('');
  for(const node of meaningful){if(r.kind!=='opaque'&&node.nodeType===1)node.setAttribute('data-classic-region',String(index));original.push({html:node.outerHTML||node.textContent,region:r,id:index});}
 }
 if(!original.length)original.push({html:'<p><br></p>',region:{start:0,end:source.length,raw:source,kind:'html'}});
 let initial=original.map(x=>x.html).join(''),newline=source.includes('\r\n')?'\r\n':'\n';
 const read=value=>[...holder(value).childNodes].filter(n=>n.nodeType===1||n.textContent.trim()).map(n=>({html:n.outerHTML||n.textContent,node:n,ids:n.nodeType===1?[...(n.hasAttribute('data-classic-region')?[n]:[]),...n.querySelectorAll('[data-classic-region]')].map(x=>+x.getAttribute('data-classic-region')):[]}));
 const boundaries=original.filter(x=>x.region.kind==='opaque').map(x=>x.html);
 function validate(value){
  const box=holder(value),actual=[...box.querySelectorAll('[data-retained]')];
  let previous=-1;for(const node of box.querySelectorAll('[data-classic-region]')){const value=node.getAttribute('data-classic-region'),id=Number(value);if(!/^\d+$/.test(value)||!original.some(entry=>entry.id===id&&entry.region.kind!=='opaque')||id<previous)throw Error('Source-region order could not be proved. Your input is retained; undo this move or use Advanced source.');previous=id;}
  if(actual.length!==boundaries.length||actual.some((n,i)=>n.parentNode!==box||n.outerHTML!==boundaries[i]))throw Error('This edit crosses retained source. Your input is retained; undo the crossing or recover through Advanced source.');
 }
 function metadata(html){const box=holder(html),out=[];box.querySelectorAll('*').forEach(el=>{for(const a of el.attributes)if(!['style','dir','href','src','alt','rel','loading'].includes(a.name))out.push([a.name,a.value]);});return out.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));}
 function ensureRetained(raw,value){const before=metadata(raw),after=metadata(value);for(const item of before){const key=JSON.stringify(item),at=after.findIndex(x=>JSON.stringify(x)===key);if(at<0)throw Error('This edit would remove retained source attributes. Undo the structure change or recover through Advanced source. Your input is retained.');after.splice(at,1);}for(const comment of raw.match(/<!--[\s\S]*?-->/g)||[])if(!value.includes(comment))throw Error('This edit would remove a retained comment. Undo this change; your input is retained.');return value;}
 const equal=(old,next)=>old&&next&&old.html===next.html&&next.ids.every(id=>id===old.id);
 // Raw HTML block tokens trim source delimiter newlines. Encode only the
 // mapped renderer-owned top-level text nodes so their UTF16 survives parsing.
 function markdownHTML(region,html){
  const before=region.rendered,after=region.prefix+html+region.suffix;
  let patched=patchHTML(region.rawRendered,before,after,doc)||after;
  return encodeBlockSeparators(patched).replace(/\n/g,newline)+newline+newline;
 }
 function layout(html){const root=holder(clean(html));const block=/^(P|H[1-6]|UL|OL|LI|BLOCKQUOTE|PRE|TABLE|THEAD|TBODY|TR|TH|TD|DIV|SECTION|ARTICLE|HR|BR)$/;const walk=node=>[...node.childNodes].map(n=>n.nodeType===1?(block.test(n.tagName)?'['+(/^(P|H[1-6])$/.test(n.tagName)?'TEXT':n.tagName)+walk(n)+']':walk(n)):'').join('');return walk(root);}
 function compile(value){
  if(value===initial)return source;validate(value);
  const next=read(value),edits=[];let i=0,j=0;
  while(i<original.length||j<next.length){
   if(equal(original[i],next[j])&&i<original.length&&j<next.length){i++;j++;continue;}
   const from=i,newFrom=j;let match;
   for(let distance=1;distance<=original.length-i+next.length-j&&!match;distance++)for(let a=0;a<=distance;a++){const b=distance-a;if(original[i+a]&&next[j+b]&&equal(original[i+a],next[j+b])){match=[i+a,j+b];break;}}
   const oldEnd=match?.[0]??original.length,newEnd=match?.[1]??next.length,old=original.slice(from,oldEnd),fresh=next.slice(newFrom,newEnd);
   if(old.some(x=>x.region.kind==='opaque')||fresh.some(x=>x.node.querySelector?.('[data-retained]')||x.node.hasAttribute?.('data-retained')))throw Error('This operation crosses retained source. Undo it before saving; your current input is retained.');
   const start=old[0]?.region.start??original[from]?.region.start??original.at(-1).region.end,end=old.at(-1)?.region.end??start;
   if(old.length===fresh.length&&old.every(x=>original.filter(y=>y.region===x.region).length===1)){
    old.forEach((entry,k)=>{
     const safe=sanitize(clean(fresh[k].html));let value=entry.region.kind==='html'?patchHTML(entry.region.raw,clean(entry.html),safe,doc):null;
     if(value===null){if(/<!--|\s(?:data-[\w-]+|class|id)\s*=/i.test(entry.region.raw))throw Error('This structure contains retained metadata. Undo the structure change or use Advanced source. Your input is retained.');value=entry.region.kind==='markdown'?markdownHTML(entry.region,safe):safe;}
     edits.push([entry.region.start,entry.region.end,ensureRetained(entry.region.raw,value)]);
    });
   }else{
    const replacements=fresh.map(n=>sanitize(clean(n.html)));
    if(old.length===1&&fresh.length&&old[0].region.kind==='html'){
     const kept=patchHTML(old[0].region.raw,clean(old[0].html),replacements[0],doc);
     if(kept!==null)replacements[0]=kept;
    }
    const value=old.length===1&&old[0].region.kind==='markdown'?markdownHTML(old[0].region,replacements.join(newline)):replacements.join(newline+newline);
    ensureRetained(old.map(x=>x.region.raw).join(''),value);
    edits.push([start,end,(old.length?'':from>0?newline+newline:'')+value+(old.length?'':from<original.length?newline+newline:'')]);
   }
   i=oldEnd;j=newEnd;
  }
  let out=source;for(const [start,end,value] of edits.sort((a,b)=>b[0]-a[0]))out=out.slice(0,start)+value+out.slice(end);
  const formatOnly=holder(clean(initial)).textContent===holder(clean(value)).textContent&&layout(initial)===layout(value);
  if(formatOnly&&projection(out)!==sourceProjection)throw Error('Formatting could not be mapped to the exact source text. Your input is retained; undo this change or use Advanced source.');
  return out;
 }
 return {get initial(){return initial;},compile,validate,regions,adoptInitial(value){validate(value);const normalized=read(value);if(normalized.length!==original.length)throw Error('Editor mount changed source structure. Exact source is retained.');normalized.forEach((n,i)=>original[i].html=n.html);initial=value;}};
}
