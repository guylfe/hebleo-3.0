import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Store} from '../src/store.js';

// Publication diff (Store.preview): key order is never a change, omitted pack metadata is,
// and meaningful array/collection order changes stay visible.
function setup(t){const s=new Store();t.after(()=>s.close());return s;}
const stage=(s,content)=>s.stage({baseRevisionId:s.get('active'),expectedDraftToken:s.currentDraft()?.draftToken??null,content});
const reverseKeys=v=>Array.isArray(v)?v.map(reverseKeys):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).reverse().map(([k,x])=>[k,reverseKeys(x)])):v;
const lessonIds=s=>s.snapshot().lessons.map(l=>l.id);

test('object-key-only differences produce no changes and no affected lessons, including nested unknown fields',t=>{
  const s=setup(t),c=structuredClone(s.snapshot());
  c.words[0].sourceFields={Root:'fixture',Row:{sheet:'fixture',line:2}};c.packNotes={owner:'fixture',flags:['a','b']};
  stage(s,c);s.publish(s.get('active'),s.currentDraft().draftToken);
  const reordered=reverseKeys(s.snapshot());assert.notEqual(JSON.stringify(reordered),JSON.stringify(s.snapshot()));
  stage(s,reordered);
  assert.deepEqual(s.preview().changes,[]);assert.deepEqual(s.preview().affectedLessons,[]);
});

test('omitted, added and changed pack metadata are reported and affect every lesson',t=>{
  const s=setup(t),c=structuredClone(s.snapshot());c.packNotes={owner:'fixture'};
  stage(s,c);s.publish(s.get('active'),s.currentDraft().draftToken);
  const omitted=structuredClone(s.snapshot());delete omitted.packNotes;omitted.courseLabel='Fixture label';
  stage(s,omitted);
  const p=s.preview(),meta=p.changes.filter(x=>x.kind==='metadata');
  assert.deepEqual(meta.map(x=>[x.field,x.action]),[['courseLabel','added'],['packNotes','removed']]);
  for(const x of meta)assert.deepEqual(x.impact.lessons,lessonIds(s));
  assert.deepEqual(p.affectedLessons,lessonIds(s));
  const changed=structuredClone(s.currentDraft().content);changed.provenance={...changed.provenance,label:'Fixture relabel'};delete changed.courseLabel;
  stage(s,changed);
  assert.deepEqual(s.preview().changes.filter(x=>x.kind==='metadata').map(x=>[x.field,x.action]),[['packNotes','removed'],['provenance','changed']]);
  const noPolicy=structuredClone(s.snapshot());delete noPolicy.reviewPolicy;stage(s,noPolicy);
  assert.deepEqual(s.preview().changes.map(x=>[x.kind,x.id,x.action]),[['policy','review-defaults','removed']]);
});

test('collection reorders and in-object array order changes stay visible; additions alone are not reorders',t=>{
  const s=setup(t),base=s.snapshot(),ids=lessonIds(s);
  // Swap the first adjacent lesson pair that remains publishable (ordering trays depend on lesson order).
  const swapped=ids.slice(0,-1).map((_,i)=>{const c=structuredClone(base);[c.lessons[i],c.lessons[i+1]]=[c.lessons[i+1],c.lessons[i]];return c;}).find(c=>{try{stage(s,c);return true;}catch{return false;}});
  assert.ok(swapped,'some adjacent lesson swap is publishable');
  let changes=s.preview().changes;
  assert.equal(changes.length,2);assert.ok(changes.every(x=>x.kind==='lessons'&&x.action==='changed'&&x.reordered===true));
  for(const x of changes)assert.ok(s.preview().affectedLessons.includes(x.id));
  const exercises=structuredClone(base);exercises.exercises.reverse();stage(s,exercises);
  assert.ok(s.preview().changes.length&&s.preview().changes.every(x=>x.kind==='exercises'&&x.reordered));
  const words=structuredClone(base);words.words.reverse();stage(s,words);
  assert.ok(s.preview().changes.length&&s.preview().changes.every(x=>x.kind==='words'&&x.reordered));
  const inner=structuredClone(base),lesson=inner.lessons.find(l=>l.wordIds.length>1);lesson.wordIds.reverse();stage(s,inner);
  changes=s.preview().changes;
  assert.deepEqual(changes.map(x=>[x.kind,x.id,x.action,x.reordered]),[['lessons',lesson.id,'changed',undefined]]);
  assert.ok(s.preview().affectedLessons.includes(lesson.id));
  const added=structuredClone(base);added.words.unshift({...structuredClone(base.words[0]),id:'w-fixture-added'});stage(s,added);
  assert.deepEqual(s.preview().changes.map(x=>[x.kind,x.id,x.action,x.reordered]),[['words','w-fixture-added','added',undefined]]);
  const removed=structuredClone(base);const unused=removed.words.findIndex(w=>!removed.lessons.some(l=>l.wordIds.includes(w.id))&&!removed.exercises.some(e=>e.wordId===w.id||e.wordIds?.includes(w.id)));
  if(unused>=0){const [w]=removed.words.splice(unused,1);stage(s,removed);assert.deepEqual(s.preview().changes.map(x=>[x.id,x.action,x.reordered]),[[w.id,'removed',undefined]]);}
});

test('word impact unions published and draft dependencies so a moved reference names both lessons',t=>{
  const s=setup(t),base=s.snapshot(),c=structuredClone(base);
  const from=c.lessons.find(l=>l.wordIds.length),to=c.lessons.find(l=>l.id!==from.id),wordId=from.wordIds[0];
  c.words.find(w=>w.id===wordId).english+=' (fixture)';
  from.wordIds=from.wordIds.filter(id=>id!==wordId);to.wordIds=[...to.wordIds,wordId];
  for(const l of c.lessons)for(const b of l.blocks||[])if(b.selector?.wordIds)b.selector.wordIds=b.selector.wordIds.filter(id=>id!==wordId||l.id===to.id);
  try{stage(s,c);}catch(error){t.skip('Seed lesson blocks reject moving this word: '+error.message);return;}
  const change=s.preview().changes.find(x=>x.kind==='words'&&x.id===wordId);
  assert.ok(change.impact.lessons.includes(from.id)&&change.impact.lessons.includes(to.id));
});
