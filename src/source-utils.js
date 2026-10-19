import {createHash} from 'node:crypto';
import {DomainError} from './errors.js';
export const copy=structuredClone;
export class SourceError extends DomainError {
 constructor(code,message,{phase='review',retryable=false,status=409,sourceId=null,nextAction='Refresh and review again.',...details}={}){super(message,status,code);this.details={phase,retryable,sourceId,nextAction,...details};}
}
export const fail=(code,message,details)=>{throw new SourceError(code,message,details);};
export function canonicalJSON(v){if(v===null||typeof v==='string'||typeof v==='boolean'||typeof v==='number'&&Number.isFinite(v))return JSON.stringify(v);if(Array.isArray(v))return '['+v.map(canonicalJSON).join(',')+']';if(v&&typeof v==='object'&&[Object.prototype,null].includes(Object.getPrototypeOf(v)))return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonicalJSON(v[k])).join(',')+'}';throw new TypeError('Unsupported canonical JSON value');}
export const sha256=v=>createHash('sha256').update(canonicalJSON(v),'utf8').digest('hex');
export const equal=(a,b)=>a===undefined||b===undefined?a===b:canonicalJSON(a)===canonicalJSON(b);
export const safeID=v=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(v)&&!['__proto__','constructor','prototype'].includes(v);
// Reject duplicate object keys before canonical hashing, rather than letting JSON.parse choose one.
export function parseStrictJSON(source){let i=0,depth=0;const ws=()=>{while(/[ \t\r\n]/.test(source[i]||'')&&i<source.length)i++;};
 function string(){const start=i++;for(;i<source.length;i++){if(source[i]==='\\'){i++;continue;}if(source[i]==='"'){i++;return JSON.parse(source.slice(start,i));}}throw Error('Invalid JSON string');}
 function value(){ws();if(++depth>100)throw Error('JSON nesting exceeds limit');let v;const c=source[i];
  if(c==='"')v=string();else if(c==='{'||c==='['){const object=c==='{';i++;v=object?{}:[];const seen=new Set();ws();if(source[i]===(object?'}':']'))i++;else for(;;){ws();let key;if(object){if(source[i]!=='"')throw Error('Invalid JSON key');key=string();if(seen.has(key)||['__proto__','constructor','prototype'].includes(key))throw Error('Duplicate or reserved JSON key');seen.add(key);ws();if(source[i++]!==':')throw Error('Invalid JSON colon');}const next=value();if(object)Object.defineProperty(v,key,{value:next,enumerable:true,writable:true,configurable:true});else v.push(next);ws();const end=source[i++];if(end===(object?'}':']'))break;if(end!==',')throw Error('Invalid JSON separator');}}
  else{const m=/^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(source.slice(i));if(!m)throw Error('Invalid JSON value');i+=m[0].length;v=JSON.parse(m[0]);}depth--;return v;}
 const result=value();ws();if(i!==source.length)throw Error('Trailing JSON');return result;
}
