// Lossless JSON tree changes against an immutable revision, never the current draft.
import {createHash} from 'node:crypto';
import {DomainError} from './errors.js';

export const canonicalJSON = value => Array.isArray(value) ? '[' + value.map(canonicalJSON).join(',') + ']' : value && typeof value === 'object' ? '{' + Object.keys(value).sort().filter(k => value[k] !== undefined).map(k => JSON.stringify(k) + ':' + canonicalJSON(value[k])).join(',') + '}' : JSON.stringify(value);
export const contextHash = value => createHash('sha256').update(canonicalJSON(value)).digest('hex');
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const fail = () => {throw new DomainError('Invalid immutable author context delta or base hash.',400,'AUTHOR_REVIEW_INVALID');};
const set = (v,k,child) => Object.defineProperty(v,k,{value:child,enumerable:true,writable:true,configurable:true});

// null means unchanged. A tagged replacement distinguishes JSON null from no change.
export function contextDelta(base,value) {
  if(base === value)return null;
  if(Array.isArray(base)&&Array.isArray(value)){
    const edits=[];
    for(let i=0;i<value.length;i++){const delta=i<base.length?contextDelta(base[i],value[i]):['v',value[i]];if(delta!==null)edits.push([i,delta]);}
    return base.length===value.length&&!edits.length?null:['a',value.length,edits];
  }
  if(object(base)&&object(value)){
    const removed=Object.keys(base).filter(k=>!Object.hasOwn(value,k)).sort(),edits=[];
    for(const key of Object.keys(value).sort()){const delta=Object.hasOwn(base,key)?contextDelta(base[key],value[key]):['v',value[key]];if(delta!==null)edits.push([key,delta]);}
    return !removed.length&&!edits.length?null:['o',removed,edits];
  }
  return ['v',value];
}

export function applyContextDelta(base,delta,depth=0,chunks={},seen=new Set()) {
  if(depth>200)fail();
  if(delta===null)return structuredClone(base);
  if(!Array.isArray(delta))fail();
  if(delta[0]==='r'){
    const key=delta[1];
    if(delta.length!==2||typeof key!=='string'||!Object.hasOwn(chunks,key)||seen.has(key)||contextHash(chunks[key])!==key)fail();
    seen.add(key);try{return applyContextDelta(base,chunks[key],depth+1,chunks,seen);}finally{seen.delete(key);}
  }
  if(delta[0]==='v') {if(delta.length!==2||delta[1]===undefined)fail();return structuredClone(delta[1]);}
  if(delta.length!==3||!Array.isArray(delta[2]))fail();
  let result;
  const seenKeys=new Set();
  if(delta[0]==='o'){
    if(!object(base)||!Array.isArray(delta[1]))fail();
    result=structuredClone(base);
    for(const key of delta[1]){if(typeof key!=='string'||seenKeys.has(key)||!Object.hasOwn(base,key))fail();seenKeys.add(key);delete result[key];}
  }else if(delta[0]==='a'){
    if(!Array.isArray(base)||!Number.isSafeInteger(delta[1])||delta[1]<0||delta[1]>1000000)fail();
    result=structuredClone(base.slice(0,delta[1]));result.length=delta[1];
  }else fail();
  for(const entry of delta[2]){
    if(!Array.isArray(entry)||entry.length!==2)fail();
    const [key,child]=entry;
    if(delta[0]==='a'?!Number.isSafeInteger(key)||key<0||key>=result.length:typeof key!=='string')fail();
    if(seenKeys.has(key)||child===null)fail();
    seenKeys.add(key);set(result,key,applyContextDelta(base[key],child,depth+1,chunks,seen));
  }
  if(Array.isArray(result)&&Object.keys(result).length!==result.length)fail();
  return result;
}

// Content-address large immutable delta nodes. Draft-only collections absent from
// the published base are carried once, even when hundreds of saved tokens use them.
function internDelta(delta,chunks){
  if(delta===null)return null;
  if(delta[0]==='o'||delta[0]==='a')delta=[delta[0],delta[1],delta[2].map(([key,child])=>[key,internDelta(child,chunks)])];
  if(Buffer.byteLength(JSON.stringify(delta))<4096)return delta;
  const key=contextHash(delta);if(!Object.hasOwn(chunks,key))set(chunks,key,delta);
  return ['r',key];
}
export function compactContext(baseRevisionId,base,content,chunks={}) {
  return {baseRevisionId,baseHash:contextHash(base),delta:internDelta(contextDelta(base,content),chunks)};
}
export function reconstructContext(context,base,chunks={}) {
  if(!context||!Number.isInteger(context.baseRevisionId)||context.baseRevisionId<1||Object.keys(context).length!==3||!Object.hasOwn(context,'delta')||context.baseHash!==contextHash(base))fail();
  return applyContextDelta(base,context.delta,0,chunks);
}

export function validateContextChunks(chunks){
  if(!object(chunks))fail();
  for(const [key,node] of Object.entries(chunks))if(!/^[a-f0-9]{64}$/.test(key)||contextHash(node)!==key)fail();
  const checked=new Set(),visiting=new Set();
  function walk(node,depth=0){
    if(depth>200||!Array.isArray(node))fail();
    if(node[0]==='r'){
      const key=node[1];if(node.length!==2||typeof key!=='string'||!Object.hasOwn(chunks,key)||visiting.has(key))fail();
      if(checked.has(key))return;visiting.add(key);walk(chunks[key],depth+1);visiting.delete(key);checked.add(key);return;
    }
    if(node[0]==='v'){if(node.length!==2||node[1]===undefined)fail();return;}
    if(node.length!==3||!['o','a'].includes(node[0])||!Array.isArray(node[2]))fail();
    const names=new Set();
    if(node[0]==='o'){
      if(!Array.isArray(node[1]))fail();
      for(const key of node[1]){if(typeof key!=='string'||names.has(key))fail();names.add(key);}
    }else if(!Number.isSafeInteger(node[1])||node[1]<0||node[1]>1000000)fail();
    for(const entry of node[2]){
      if(!Array.isArray(entry)||entry.length!==2)fail();const [key,child]=entry;
      if(node[0]==='o'?typeof key!=='string':!Number.isSafeInteger(key)||key<0||key>=node[1])fail();
      if(names.has(key))fail();names.add(key);walk(child,depth+1);
    }
  }
  for(const key of Object.keys(chunks))walk(['r',key]);
}
