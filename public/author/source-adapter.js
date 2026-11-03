// Source ranges belong to this transient field model, never to content IDs or
// comment anchors. Parsing and source compilation run at mount/collect only.
import {parseFragment,DOMParser as PMParser,DOMSerializer,defaultMarkdownSerializer,MarkdownSerializer} from './vendor/prosemirror.js';
const ordinary=new Set('p h1 h2 h3 h4 h5 h6 ul ol blockquote pre hr table div section article'.split(' '));
const supported=new Set('p h1 h2 h3 h4 h5 h6 ul ol li blockquote pre code hr table div section article thead tbody tr th td bdi strong b em i u s del strike a br img span input sup sub'.split(' '));
const esc=s=>s.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const nodes=n=>(n.childNodes||[]).filter(c=>c.nodeName!=='#comment');
function supportedTree(n){const attrs=Object.fromEntries((n.attrs||[]).map(a=>[a.name,a.value]));return (!n.tagName||supported.has(n.tagName))&&!(n.attrs||[]).some(a=>a.name.startsWith('data-activity')||a.name==='contenteditable')&&(n.tagName!=='input'||attrs.type==='checkbox')&&(n.tagName!=='img'||/^\/media\//.test(attrs.src||''))&&(n.tagName!=='a'||!attrs.href||/^(https?:\/\/|mailto:|\/(?!\/)|#)/i.test(attrs.href))&&nodes(n).every(supportedTree);}
export const supportedHTML=html=>nodes(parseFragment(html)).every(supportedTree);
function offsetsFor(source){const map=[];let text='';for(let i=0;i<source.length;i++){map.push(i);if(source[i]==='\r'){text+='\n';if(source[i+1]==='\n')i++;}else text+=source[i];}map.push(source.length);return {text,map};}
export function sourceRegions(source,marked,{fullMarkdownTokens=false}={}){
 const out=[],{text,map}=offsetsFor(source);let cursor=0;
 for(const token of marked.lexer(text)){
  const at=text.indexOf(token.raw,cursor);if(at<0)throw Error('Cannot prove source range. Use exact source.');cursor=at+token.raw.length;
  if(token.type==='space')continue;
  const start=map[at],end=map[cursor],raw=source.slice(start,end);
  if(token.type==='html'){
   const tree=parseFragment(raw,{sourceCodeLocationInfo:true});let pos=0;
   for(const n of tree.childNodes){const loc=n.sourceCodeLocation;if(!loc)continue;
    if(loc.startOffset>pos&&raw.slice(pos,loc.startOffset).trim())out.push({start:start+pos,end:start+loc.startOffset,kind:'opaque'});
    if(n.nodeName==='#text'&&!n.value.trim()){pos=loc.endOffset;continue;}
    out.push({start:start+loc.startOffset,end:start+loc.endOffset,kind:ordinary.has(n.tagName)&&supportedTree(n)?'html':'opaque'});pos=loc.endOffset;
   }
   if(pos<raw.length&&raw.slice(pos).trim())out.push({start:start+pos,end,kind:'opaque'});
  }else if(['paragraph','heading','list','blockquote','code','hr','table'].includes(token.type)){
   const trimmed=fullMarkdownTokens?raw:raw.trimEnd();out.push({start,end:start+trimmed.length,kind:'markdown'});
  }else out.push({start,end,kind:'opaque'});
 }
 return out;
}
// Encode mapped top-level whitespace without reserializing any element,
// attribute, entity or descendant source bytes.
export function encodeBlockSeparators(html){
 const tree=parseFragment(html,{sourceCodeLocationInfo:true}),edits=[];
 for(const node of tree.childNodes)if(node.nodeName==='#text'&&!node.value.trim()&&node.sourceCodeLocation){const loc=node.sourceCodeLocation;edits.push([loc.startOffset,loc.endOffset,[...node.value].map(c=>'&#'+c.charCodeAt(0)+';').join('')]);}
 return applyEdits(html,edits);
}
function htmlFor(node,doc){const box=doc.createElement('div');box.append(DOMSerializer.fromSchema(node.type.schema).serializeNode(node,{document:doc}));return box.innerHTML;}
const meaningful=n=>(n.childNodes||[]).filter(c=>c.nodeName!=='#comment'&&!(c.nodeName==='#text'&&!c.value.trim()&&n.tagName&&/^(ul|ol|table|tbody|thead|tr|blockquote)$/.test(n.tagName)));
const same=(a,b)=>a.nodeName===b.nodeName&&(a.nodeName==='#text'?a.value===b.value:JSON.stringify(a.attrs||[])===JSON.stringify(b.attrs||[])&&meaningful(a).length===meaningful(b).length&&meaningful(a).every((c,i)=>same(c,meaningful(b)[i])));
// Decode only entities, not every source code unit. The offset map is local to
// the changed text run and keeps untouched entity spellings byte-for-byte.
function patchText(raw,before,after,doc){
 let positions=[];let decoded='',decoder;
 for(const m of raw.matchAll(/&(?:#\d+|#x[\da-f]+|[a-z][\da-z]+);|[^&]+|&/gi)){
  let value=m[0];if(value.startsWith('&')&&value.endsWith(';')){decoder??=doc.createElement('textarea');decoder.innerHTML=value;value=decoder.value;for(let i=0;i<value.length;i++)positions.push([m.index,m.index+m[0].length]);}
  else for(let i=0;i<value.length;i++)positions.push([m.index+i,m.index+i+1]);decoded+=value;
 }
 if(decoded!==before){
  let collapsed='',mapped=[];for(const m of decoded.matchAll(/[\t\n\r\f ]+|[^\t\n\r\f ]+/g)){
   if(/^[\t\n\r\f ]/.test(m[0])){collapsed+=' ';mapped.push([positions[m.index][0],positions[m.index+m[0].length-1][1]]);}
   else{collapsed+=m[0];mapped.push(...positions.slice(m.index,m.index+m[0].length));}
  }
  if(collapsed!==before&&collapsed.trim()===before){const left=collapsed.length-collapsed.trimStart().length,right=collapsed.trimEnd().length;mapped=mapped.slice(left,right);collapsed=collapsed.trim();}
  if(collapsed!==before)return null;decoded=collapsed;positions=mapped;
 }
 let start=0,end=before.length,nextEnd=after.length;while(start<end&&start<nextEnd&&before[start]===after[start])start++;while(end>start&&nextEnd>start&&before[end-1]===after[nextEnd-1]){end--;nextEnd--;}
 // Do not split surrogate pairs or a multi-code-unit entity at the boundary.
 if(start>0&&/[\uDC00-\uDFFF]/.test(before[start]||''))start--;
 while(start>0&&positions[start]?.[0]===positions[start-1]?.[0])start--;
 while(end<positions.length&&positions[end]?.[0]===positions[end-1]?.[0]){end++;nextEnd++;}
 const from=positions[start]?.[0]??raw.length,to=end>start?positions[end-1][1]:from;
 return raw.slice(0,from)+esc(after.slice(start,nextEnd))+raw.slice(to);
}
export function patchHTML(raw,beforeHTML,afterHTML,doc){
 const original=parseFragment(raw,{sourceCodeLocationInfo:true}),before=parseFragment(beforeHTML),after=parseFragment(afterHTML),edits=[];
 function walk(o,b,a){
  if(same(b,a))return true;
  const loc=o.sourceCodeLocation;if(!loc)return false;
  if(o.nodeName==='#text'&&b.nodeName==='#text'&&a.nodeName==='#text'){
   const value=patchText(raw.slice(loc.startOffset,loc.endOffset),b.value,a.value,doc);if(value===null)return false;edits.push([loc.startOffset,loc.endOffset,value]);return true;
  }
  if(o.tagName!==b.tagName||!a.tagName)return false;
  const originalEditCount=edits.length;
  if(b.tagName!==a.tagName&&!(/^(p|h[1-6]|ul|ol|blockquote|pre|div|section|article|table)$/.test(b.tagName)&&/^(p|h[1-6]|ul|ol|blockquote|pre|div|section|article|table)$/.test(a.tagName)))return false;
  if(loc.startTag&&(b.tagName!==a.tagName||JSON.stringify(b.attrs)!==JSON.stringify(a.attrs))){
   let opening=raw.slice(loc.startTag.startOffset,loc.startTag.endOffset).replace(/^<[^\s/>]+/,'<'+a.tagName);
   const beforeAttrs=Object.fromEntries((b.attrs||[]).map(x=>[x.name,x.value])),afterAttrs=Object.fromEntries((a.attrs||[]).map(x=>[x.name,x.value]));
   for(const name of new Set([...Object.keys(beforeAttrs),...Object.keys(afterAttrs)]))if(beforeAttrs[name]!==afterAttrs[name]){
    const pattern=new RegExp('\\s'+name+'(?:\\s*=\\s*(?:"[^"]*"|\x27[^\x27]*\x27|[^\\s>]+))?','i');opening=opening.replace(pattern,'');
    if(afterAttrs[name]!==undefined)opening=opening.replace(/\/?\s*>$/,m=>' '+name+'="'+afterAttrs[name].replace(/[&"<>]/g,c=>({'&':'&amp;','"':'&quot;','<':'&lt;','>':'&gt;'}[c]))+'"'+m);
   }
   edits.push([loc.startTag.startOffset,loc.startTag.endOffset,opening]);
   if(loc.endTag&&b.tagName!==a.tagName)edits.push([loc.endTag.startOffset,loc.endTag.endOffset,'</'+a.tagName+'>']);
  }
  const os=meaningful(o),bs=meaningful(b),as=meaningful(a);
  if(os.length===bs.length&&bs.length===as.length){const held=edits.length;if(bs.every((c,i)=>walk(os[i],c,as[i])))return true;edits.length=held;}
  // Structural replacement is limited to this element's inner content. Keep
  // wrappers/attributes and reject deleting an opaque comment inside it.
  if(loc.startTag&&loc.endTag&&!raw.slice(loc.startTag.endOffset,loc.endTag.startOffset).includes('<!--')){
   const childHTML=serializeParseChildren(a);edits.push([loc.startTag.endOffset,loc.endTag.startOffset,childHTML]);return true;
  }edits.length=originalEditCount;return false;
 }
 const os=meaningful(original),bs=meaningful(before),as=meaningful(after);
 if(os.length!==bs.length||bs.length!==as.length||!bs.every((n,i)=>walk(os[i],n,as[i])))return null;
 return applyEdits(raw,edits);
}
function serializeParseChildren(node){return (node.childNodes||[]).map(n=>n.nodeName==='#text'?esc(n.value):n.nodeName==='#comment'?'<!--'+n.data+'-->':'<'+n.tagName+(n.attrs||[]).map(a=>' '+a.name+'="'+a.value.replace(/[&"<>]/g,c=>({'&':'&amp;','"':'&quot;','<':'&lt;','>':'&gt;'}[c]))+'"').join('')+'>'+serializeParseChildren(n)+(/^(br|img|hr)$/.test(n.tagName)?'':'</'+n.tagName+'>')).join('');}
function applyEdits(source,edits){let out=source;for(const [start,end,value] of edits.sort((a,b)=>b[0]-a[0]))out=out.slice(0,start)+value+out.slice(end);return out;}
export function createSourceAdapter({source,marked,schema,doc,sanitize}){
 const regions=sourceRegions(source,marked),original=[];
 for(const region of regions){region.raw=source.slice(region.start,region.end);
  if(region.kind==='opaque'){region.nodes=[schema.nodes.opaque.create({raw:region.raw})];}
  else{const box=doc.createElement('div');box.innerHTML=sanitize(region.kind==='html'?region.raw:marked.parse(region.raw));const parsed=PMParser.fromSchema(schema).parse(box);region.nodes=[];parsed.forEach(n=>region.nodes.push(n));if(!region.nodes.length)region.nodes=[schema.nodes.paragraph.create()];}
  for(const node of region.nodes)original.push({node,region});
 }
 if(!original.length)original.push({node:schema.nodes.paragraph.create(),region:{start:0,end:source.length,raw:source,kind:'html',nodes:[]}});
 const initial=schema.nodes.doc.create(null,original.map(x=>x.node)),newline=source.includes('\r\n')?'\r\n':'\n';
 const md=new MarkdownSerializer({...defaultMarkdownSerializer.nodes,list_item:(state,node)=>{if(node.attrs.checked!==null)state.write(node.attrs.checked?'[x] ':'[ ] ');state.renderContent(node);},...Object.fromEntries(['table','table_row','table_cell','table_header'].map(name=>[name,(state,node)=>{state.write(htmlFor(node,doc));state.closeBlock(node);}]))},{...defaultMarkdownSerializer.marks,strike:{open:'~~',close:'~~',mixable:true,expelEnclosingWhitespace:true},span:{open:(_state,mark)=>'<span'+Object.entries(mark.attrs.attributes).map(([k,v])=>' '+k+'="'+String(v).replace(/"/g,'&quot;')+'"').join('')+'>',close:'</span>'}});
 function serialize(node,kind){let explicitDirection=node.attrs.dir&&node.attrs.dir!=='auto';node.descendants(child=>{if(child.attrs.dir&&child.attrs.dir!=='auto')explicitDirection=true;});return kind==='markdown'&&!explicitDirection?md.serialize(schema.nodes.doc.create(null,[node])).replace(/\n/g,newline):htmlFor(node,doc);}
 function compile(current){
  if(current.eq(initial))return source;
  const next=[];current.forEach(n=>next.push(n));const edits=[];let i=0,j=0;
  while(i<original.length||j<next.length){
   if(i<original.length&&j<next.length&&original[i].node.eq(next[j])){i++;j++;continue;}
   const from=i,newFrom=j;let match=null;
   // Field-local alignment, once on collect. Prefer closest surviving block.
   for(let distance=1;distance<=original.length-i+next.length-j&&!match;distance++)for(let a=0;a<=distance;a++){const b=distance-a;if(original[i+a]&&next[j+b]&&original[i+a].node.eq(next[j+b])){match=[i+a,j+b];break;}}
   const oldEnd=match?.[0]??original.length,newEnd=match?.[1]??next.length,old=original.slice(from,oldEnd),fresh=next.slice(newFrom,newEnd);
   if(old.some(x=>x.node.type.name==='opaque')||fresh.some(n=>n.type.name==='opaque'))throw Error('This operation crosses retained source. Edit prose on either side separately.');
   const start=old[0]?.region.start??original[from]?.region.start??original.at(-1).region.end,end=old.at(-1)?.region.end??start;
   if(old.length===fresh.length&&old.every(x=>x.region.nodes.length===1)){
    old.forEach((entry,k)=>{const before=htmlFor(entry.node,doc),after=htmlFor(fresh[k],doc);let value=entry.region.kind==='html'?patchHTML(entry.region.raw,before,after,doc):null;
     if(value===null){if(entry.region.raw.includes('<!--'))throw Error('Retained comment prevents replacing this structure. Edit adjacent prose or use exact source.');value=serialize(fresh[k],entry.region.kind);}
     edits.push([entry.region.start,entry.region.end,value]);});
   }else{
    if(old.some(x=>x.region.raw.includes('<!--')))throw Error('Retained comment prevents replacing this structure.');
    const kind=old[0]?.region.kind??original[from]?.region.kind??original.at(-1).region.kind;
    const replacements=fresh.map(n=>serialize(n,kind));
    if(kind==='html'&&old.length===1&&fresh.length&&old[0].region.nodes.length===1){const kept=patchHTML(old[0].region.raw,htmlFor(old[0].node,doc),htmlFor(fresh[0],doc),doc);if(kept!==null)replacements[0]=kept;}
    edits.push([start,end,(old.length?'':from>0?newline+newline:'')+replacements.join(newline+newline)+(old.length?'':from<original.length?newline+newline:'')]);
   }
   i=oldEnd;j=newEnd;
  }
  return applyEdits(source,edits);
 }
 return {initial,compile,regions};
}
