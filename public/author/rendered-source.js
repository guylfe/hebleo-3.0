// Transient editor ranges are never content IDs or private-comment anchors.
// Only verified leaf blocks are editable. Unmapped/complex structures stay in
// Advanced source. Never serialize the whole projection back into teaching.
const leaves='p,li,h1,h2,h3,h4,h5,h6';
const tags=/<!--[\s\S]*?-->|<![^>]*>|<\/?[a-z][^>"']*(?:(?:"[^"]*"|'[^']*')[^>"']*)*>/gi;
function htmlRanges(source,offset=0){
 const stack=[],out=[];
 for(const match of source.matchAll(tags)){
  const tag=/^<(\/)?([a-z][\w-]*)/i.exec(match[0]);if(!tag)continue;
  const name=tag[2].toLowerCase();
  if(tag[1]){const i=stack.findLastIndex(x=>x.name===name);if(i<0)continue;const open=stack[i];stack.length=i;
   if(/^(p|li|h[1-6])$/.test(name)&&!open.child&&!stack.some(x=>/^(script|style|pre|code|template)$/.test(x.name)))out.push({start:offset+open.start,end:offset+match.index+match[0].length,innerStart:offset+open.innerStart,innerEnd:offset+match.index,kind:'html'});
  }else if(!/\/$/.test(match[0].slice(0,-1))&&!/^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/.test(name)){
   if(/^(p|li|h[1-6])$/.test(name))for(const parent of stack)parent.child=true;
   stack.push({name,start:match.index,innerStart:match.index+match[0].length,child:false});
  }
 }
 return out.sort((a,b)=>a.start-b.start);
}
export function sourceBlockRanges(source,lexer){
 if(!lexer)return htmlRanges(source);
 // marked normalizes CRLF before lexing. Keep an explicit code-unit boundary
 // map back to the original bytes; a token.raw search in the original would
 // miss every Markdown block in a Windows-authored mixed source.
 const original=source,offsets=[];let normalized='';
 for(let i=0;i<original.length;i++){offsets.push(i);if(original[i]==='\r'){normalized+='\n';if(original[i+1]==='\n')i++;}else normalized+=original[i];}
 offsets.push(original.length);source=normalized;
 const out=[];
 function walk(tokens,base){let cursor=0;for(const token of tokens){
  const at=source.indexOf(token.raw,base+cursor);if(at<0)continue;cursor=at-base+token.raw.length;
  if(token.type==='html')out.push(...htmlRanges(token.raw,at));
  else if(['paragraph','heading'].includes(token.type)){
   const raw=token.raw.replace(/\s+$/,'');out.push({start:at,end:at+raw.length,kind:'markdown'});
  }else if(token.type==='list'){
   let itemCursor=at;for(const item of token.items){const start=source.indexOf(item.raw,itemCursor);if(start<0)continue;itemCursor=start+item.raw.length;
    // Nested lists/task controls deliberately use Advanced source rather than
    // guessing a range that might absorb another authored block.
    if(item.task||item.tokens?.some(t=>t.type==='list'))continue;
    const prefix=/^\s*(?:[-+*]|\d+[.)])\s+/.exec(item.raw);if(!prefix)continue;
    const innerStart=start+prefix[0].length,innerEnd=start+item.raw.trimEnd().length;
    out.push({start:innerStart,end:innerEnd,kind:'markdown-list'});
   }
  }else if(token.type==='blockquote'){
   // Quote prefixes are part of source syntax; retain them via Advanced source.
  }
 }}
 walk(lexer(source),0);return out.map(range=>Object.fromEntries(Object.entries(range).map(([k,v])=>[k,k==='kind'?v:offsets[v]]))).sort((a,b)=>a.start-b.start);
}
const escape=value=>value.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
function shape(node){return [...node.childNodes].map(n=>n.nodeType===3?'#':n.nodeType===1?'<'+n.tagName+' '+[...n.attributes].map(a=>a.name+'='+a.value).join('|')+'>'+shape(n)+'</>':'').join('');}
function textPatch(raw,before,after,doc){
 // A normal HTML text edit keeps original tags, attributes, entities and rich
 // runs. Formatting commands instead replace only this leaf's inner range.
 let text='',positions=[],cursor=0;
 for(const tag of [...raw.matchAll(tags),{index:raw.length,0:''}]){
  const segment=raw.slice(cursor,tag.index),pattern=/&(?:#\d+|#x[\da-f]+|[a-z][\da-z]+);|[^&]|&/gi;
  for(const m of segment.matchAll(pattern)){
   const decoder=doc.createElement('textarea');decoder.innerHTML=m[0];const decoded=decoder.value;
   for(let i=0;i<decoded.length;i++){positions.push({start:cursor+m.index,end:cursor+m.index+m[0].length});text+=decoded[i];}
  }
  cursor=tag.index+tag[0].length;
 }
 if(text!==before)return null;
 let start=0,end=before.length,newEnd=after.length;
 while(start<end&&start<newEnd&&before[start]===after[start])start++;
 while(end>start&&newEnd>start&&before[end-1]===after[newEnd-1]){end--;newEnd--;}
 const from=positions[start]?.start??positions.at(-1)?.end??0,to=end>start?positions[end-1].end:from;
 // Crossing markup is a deliberate structural edit: leave it to the leaf
 // replacement path, rather than removing one half of an emphasis tag.
 if(/<[^>]*>/.test(raw.slice(from,to)))return null;
 return raw.slice(0,from)+escape(after.slice(start,newEnd))+raw.slice(to);
}
export function mountRenderedSource(projection,{source,renderLesson,onChange,dependencies,onError=()=>{}}){
 const doc=projection.ownerDocument,win=doc.defaultView,ctl=new win.AbortController();
 let bindings=[],active=null,selection=null,locked=false,composing=false,disposed=false;
 const toolbar=doc.createElement('div');toolbar.className='author-context-tools';toolbar.setAttribute('role','toolbar');toolbar.setAttribute('aria-label','Format selected text');toolbar.hidden=true;
 for(const [command,label]of [['bold','Bold'],['italic','Italic']]){const button=doc.createElement('button');button.type='button';button.className='button small outline';button.textContent=label;button.dataset.format=command;toolbar.append(button);}
 projection.before(toolbar);
 function bind(lexer){
  if(disposed)return;
  const candidates=sourceBlockRanges(source,lexer),nodes=[...projection.querySelectorAll(leaves)].filter(el=>!el.querySelector(leaves));let cursor=0;
  bindings=[];
  for(const range of candidates){
   const box=doc.createElement('div'),raw=source.slice(range.start,range.end);box.innerHTML=renderLesson(range.kind==='markdown-list'?'- '+raw:raw);
   const expected=[...box.querySelectorAll(leaves)].filter(el=>!el.querySelector(leaves));if(expected.length!==1)continue;
   const index=nodes.findIndex((el,i)=>i>=cursor&&el.outerHTML===expected[0].outerHTML);if(index<0)continue;
   const node=nodes[index];cursor=index+1;node.setAttribute('contenteditable',String(!locked));node.setAttribute('role','textbox');node.setAttribute('aria-label','Edit '+(node.tagName==='LI'?'list item':/^H/.test(node.tagName)?'heading':'paragraph'));node.setAttribute('aria-multiline','true');node.dataset.authorBlock=String(bindings.length);
   bindings.push({range,node,original:node.innerHTML,shape:shape(node),text:node.textContent,patch:null});
  }
 }
 function compile(){let result='',cursor=0;for(const b of bindings){result+=source.slice(cursor,b.range.start)+(b.patch??source.slice(b.range.start,b.range.end));cursor=b.range.end;}return result+source.slice(cursor);}
 function commit(node){
  const b=bindings.find(b=>b.node===node);if(!b||locked)return;
  if(node.innerHTML===b.original)b.patch=null;
  else{
   const {range}=b,raw=source.slice(range.start,range.end),box=doc.createElement('div');box.innerHTML=renderLesson('<'+node.tagName+'>'+node.innerHTML+'</'+node.tagName+'>');const clean=box.querySelector(node.tagName);
   if(!clean){onError(new Error('This block cannot be represented safely. Use Advanced source.'));return;}
   if(range.kind==='html'){
    const inner=source.slice(range.innerStart,range.innerEnd),plain=shape(node)===b.shape?textPatch(inner,b.text,node.textContent,doc):null;
    b.patch=source.slice(range.start,range.innerStart)+(plain??clean.innerHTML)+source.slice(range.innerEnd,range.end);
   }else b.patch=range.kind==='markdown-list'?clean.innerHTML:clean.outerHTML;
  }
  onChange(compile());
 }
 projection.addEventListener('focusin',event=>{active=event.target.closest('[data-author-block]');toolbar.hidden=!active;},{signal:ctl.signal});
 projection.addEventListener('focusout',()=>win.queueMicrotask(()=>{if(!projection.contains(doc.activeElement)&&!toolbar.contains(doc.activeElement))toolbar.hidden=true;}),{signal:ctl.signal});
 projection.addEventListener('compositionstart',()=>composing=true,{signal:ctl.signal});
 projection.addEventListener('compositionend',event=>{composing=false;commit(event.target.closest('[data-author-block]'));},{signal:ctl.signal});
 projection.addEventListener('input',event=>{if(!composing)commit(event.target.closest('[data-author-block]'));},{signal:ctl.signal});
 projection.addEventListener('beforeinput',event=>{if(['insertParagraph','insertOrderedList','insertUnorderedList'].includes(event.inputType))event.preventDefault();},{signal:ctl.signal});
 // Paste plain text into the current leaf; pasted HTML never carries editor or
 // active markup. Formatting is explicit and scoped to that leaf.
 projection.addEventListener('paste',event=>{if(locked)return;const s=win.getSelection();if(!s?.rangeCount||!active)return;const r=s.getRangeAt(0);if(!active.contains(r.commonAncestorContainer))return;event.preventDefault();r.deleteContents();const n=doc.createTextNode(event.clipboardData?.getData('text/plain')||'');r.insertNode(n);r.setStartAfter(n);r.collapse(true);s.removeAllRanges();s.addRange(r);commit(active);},{signal:ctl.signal});
 const remember=()=>{const s=win.getSelection();if(s?.rangeCount&&!s.isCollapsed&&active?.contains(s.getRangeAt(0).commonAncestorContainer))selection=s.getRangeAt(0).cloneRange();else selection=null;};
 projection.addEventListener('pointerup',remember,{signal:ctl.signal});projection.addEventListener('keyup',remember,{signal:ctl.signal});
 toolbar.addEventListener('pointerdown',event=>{if(event.target.closest('button'))event.preventDefault();},{signal:ctl.signal});
 toolbar.addEventListener('click',event=>{const command=event.target.closest('[data-format]')?.dataset.format;if(!command||locked||composing||!selection||!active?.contains(selection.commonAncestorContainer))return;const tag=doc.createElement(command==='bold'?'strong':'em');tag.append(selection.extractContents());selection.insertNode(tag);const s=win.getSelection();s.removeAllRanges();const r=doc.createRange();r.selectNodeContents(tag);s.addRange(r);selection=r.cloneRange();active.focus({preventScroll:true});commit(active);},{signal:ctl.signal});
 bind();
 // Existing injected dependency promise is also consumed on legacy test paths.
 const ready=Promise.resolve(dependencies??import('/vendor/marked.js')).then(deps=>{if(!disposed&&!bindings.some(b=>b.patch!==null)&&deps.marked?.lexer){for(const b of bindings){b.node.removeAttribute('contenteditable');b.node.removeAttribute('data-author-block');b.node.removeAttribute('role');b.node.removeAttribute('aria-label');b.node.removeAttribute('aria-multiline');}bind(deps.marked.lexer);}}).catch(()=>{});
 return {ready,setLocked(value){locked=value;for(const b of bindings)b.node.setAttribute('contenteditable',String(!locked));toolbar.querySelectorAll('button').forEach(b=>b.disabled=locked);},dispose(){disposed=true;ctl.abort();toolbar.remove();}};
}
