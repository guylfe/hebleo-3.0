import assert from 'node:assert/strict';
import {exerciseVocabularySurfaces,validateExerciseVocabularyBindings} from '../public/exercise-bindings.js';
import {validateContent} from '../src/store.js';

// One-time authoring of the existing illustrative fixtures, never a runtime text
// lookup, seed replay, source approval, or mapping of real curriculum content.
const entries=[
 ['w-ani','אני','I'],['w-mi','מי','who'],['w-hu','הוא','he'],['w-hi','היא','she'],
 ['w-bayit','בית','house'],['w-po','פה','here'],['w-sham','שם','there'],
 ['w-kotev','כותב','writes (masculine singular)'],['w-kotevet','כותבת','writes (feminine singular)']
];
const exerciseIds=new Set(['ex-1-recognize','ex-1-type','ex-1-match','ex-2-order','ex-2-cloze','ex-2-transform','ex-3-recognize','ex-3-transform','ex-3-order']);
export function linkIllustrativeExercises(content){
 assert.equal(content.provenance?.kind,'synthetic-demo','Only the existing illustrative demo can use this authoring helper.');
 const next=structuredClone(content),forms=new Map();
 for(const [id,unpointed,english] of entries){
  const matches=next.words.filter(w=>w.id===id);assert.equal(matches.length,1,'Missing or ambiguous illustrative entry '+id);
  const w=matches[0];assert.equal(w.unpointed,unpointed);assert.equal(w.english,english);
  if(w.noVocab)continue;
  for(const form of new Set([w.pointed,w.unpointed,w.curated].filter(Boolean))){
   assert.ok(!forms.has(form)||forms.get(form)===id,'Ambiguous illustrative spelling');forms.set(form,id);
  }
 }
 let added=0;
 for(const e of next.exercises.filter(e=>exerciseIds.has(e.id))){
  const links=[...validateExerciseVocabularyBindings(e,next.words)];
  for(const surface of exerciseVocabularySurfaces(e)){
   // A complete Hebrew token only: no prefix stripping, normalization or inferred
   // relation between בית and בבית. The hidden standalone prefixed entry stays hidden.
   for(const match of surface.sourceText.matchAll(/[\u0590-\u05ff]+/gu)){
    const wordId=forms.get(match[0]);if(!wordId)continue;
    const start=match.index,end=start+match[0].length;
    if(links.some(b=>b.field===surface.field&&b.index===surface.index&&start<b.end&&b.start<end))continue;
    links.push({id:'demo-link-'+surface.field+'-'+(surface.index??'scalar')+'-'+start,wordId,...surface,start,end,text:match[0]});added++;
   }
  }
  if(links.length)e.vocabularyBindings=links;
  validateExerciseVocabularyBindings(e,next.words);
 }
 validateContent(next);return {content:next,added};
}

// Publication is explicit, atomic, and separate from startup. Old revisions and
// learner records retain their identities. Unrelated saved draft edits remain draft.
export function publishIllustrativeLinks(store){
 return store.transaction(()=>{
  const source=store.get('source-state');
  assert.ok(!Object.keys(source?.sources||{}).length&&!source?.draftBinding,'Source-bound publication requires its existing human-reviewed workflow.');
  const previousRevision=store.get('active'),previous=store.snapshot(),draft=store.currentDraft();
  const linked=linkIllustrativeExercises(previous);
  if(!linked.added)return {previousRevision,revisionId:previousRevision,added:0,unchanged:true};
  const draftLinks=draft?linkIllustrativeExercises(draft.content):null;
  const staged=store.stage({baseRevisionId:previousRevision,expectedDraftToken:draft?.draftToken??null,content:linked.content});
  const {revisionId}=store.publish(previousRevision,staged.draftToken);
  if(draft){
   store.stage({baseRevisionId:revisionId,expectedDraftToken:null,content:draftLinks.content});
   // Keep original draft metadata, with the new base and only the explicit links.
   const {draftToken:_,...saved}=draft;
   store.set('draft',{...saved,baseRevisionId:revisionId,content:draftLinks.content});
  }
  assert.deepEqual(store.snapshot(previousRevision),previous,'Historical content changed.');
  return {previousRevision,revisionId,added:linked.added,draftAdded:draftLinks?.added??0,draftPreserved:Boolean(draft)};
 });
}
