/** Versioned exact snapshots; never persist mutable teaching records as authority. */
import {Drill,eligibleForms} from './engine.js';
const copy=value=>JSON.parse(JSON.stringify(value));
function check(ok){if(!ok)throw Error('Saved drill is incompatible with the current practice content. It has been preserved.');}
export function serializeRun(catalog,drill,{setup,nikkud,direction,paused=false,runId}={}){
  return copy({schema:1,source:catalog,runId,setup,nikkud,direction,paused,drill:{
    queue:drill.queue.map(f=>f.id),choicePool:drill.choicePool.map(f=>f.id),total:drill.total,index:drill.index,pass:drill.pass,
    missed:[...drill.missed],typed:drill.typed,choice:drill.choice,feedback:drill.feedback,attempt:drill.attempt,
    options:drill.options.map(f=>f.id),preferredMode:drill.preferredMode,direction:drill.direction
  }});
}
export function hydrateRun(catalog,raw,{allowFixtures=false}={}){
  const x=copy(raw);check(x?.schema===1&&JSON.stringify(x.source)===JSON.stringify(catalog));
  const d=x.drill,pool=eligibleForms(catalog,{allowFixtures}),byId=new Map(pool.map(f=>[f.id,f]));
  const ids=(a,allowEmpty=false)=>Array.isArray(a)&&(allowEmpty||a.length>0)&&new Set(a).size===a.length&&a.every(id=>byId.has(id));
  check(typeof x.runId==='string'&&x.runId.length>0&&typeof x.paused==='boolean'&&typeof x.nikkud==='boolean'&&['he','en'].includes(x.direction));
  check(d&&ids(d.queue)&&ids(d.choicePool)&&ids(d.options)&&ids(d.missed,true));
  check(Number.isSafeInteger(d.index)&&d.index>=0&&d.index<d.queue.length&&Number.isSafeInteger(d.total)&&d.total>=d.queue.length&&d.total<=pool.length&&Number.isSafeInteger(d.pass)&&d.pass>=1);
  check(d.direction===x.direction&&['choose','write'].includes(d.preferredMode)&&typeof d.typed==='string'&&[null,'shown','correct','incorrect'].includes(d.feedback));
  check(d.options.includes(d.queue[d.index])&&d.options.length<=4&&d.options.every(id=>d.choicePool.includes(id)||id===d.queue[d.index]));
  check(d.missed.every(id=>d.queue.includes(id))&&(d.choice===null||d.options.includes(d.choice)));
  check(d.feedback===null?d.attempt===null:d.attempt&&['choose','write','self'].includes(d.attempt.mode)&&[true,false,null].includes(d.attempt.ok));
  const current=byId.get(d.queue[d.index]);
  check(d.options.every(id=>byId.get(id).wordId===current.wordId));
  if(d.attempt){
    check(d.feedback==='shown'?d.attempt.mode==='self'&&d.attempt.ok===null:typeof d.attempt.ok==='boolean');
    check(d.feedback!=='correct'||d.attempt.ok===true||d.attempt.override===true);
    check(d.feedback!=='incorrect'||d.attempt.ok===false);
    check(!d.attempt.override||d.attempt.mode==='write'&&d.feedback==='correct');
  }
  const s=x.setup;check(s&&['verb','prep'].includes(s.kind)&&['learned','all'].includes(s.scope)&&Array.isArray(s.wordIds)&&s.wordIds.every(id=>catalog.words.some(w=>w.id===id))&&Array.isArray(s.tenses)&&s.tenses.every(t=>pool.some(f=>f.tense===t)));
  check(['all','1','2','3','none'].includes(s.person)&&['all','masculine','feminine','common','none'].includes(s.gender)&&['all','singular','plural','none'].includes(s.number));
  // No constructor, shuffle, reset, grade or next on hydration.
  const drill=Object.create(Drill.prototype);
  Object.assign(drill,d,{pool,random:Math.random,queue:d.queue.map(id=>byId.get(id)),choicePool:d.choicePool.map(id=>byId.get(id)),options:d.options.map(id=>byId.get(id)),missed:new Set(d.missed)});
  return {...x,drill};
}
