// NONLINGUISTIC, DISPOSABLE integration fixture. Never a source approval.
import {emptyLexical} from '../public/lexical-runtime.js';
import {slotsForCategory} from '../public/lexical-contract.js';
import {lexicalApprovalDigest} from '../src/lexical-trust.js';
const reviewed=revision=>({status:'approved',reviewedRevision:revision,reviewedBy:'synthetic-fixture-only',reviewedAt:'2026-10-18T00:00:00.000Z'});
export function lexicalFixture(){
 const lex=emptyLexical();let n=0;
 for(const category of ['verb','adjective','preposition']){
  const revision='synthetic-v1',word={wordKey:'synthetic-'+category,revision,category,identityReview:reviewed(revision),displayReview:reviewed(revision),fieldConflicts:[],classMemberships:[],display:{hebrew:{text:'SYNTHETIC'},english:{text:'Synthetic '+category+' · not teaching content'},notes:{text:'Synthetic integration fixture.\n[No linguistic approval is implied.]'},root:{text:''},pattern:{text:''}},forms:slotsForCategory(category).map(slotId=>{const v={variantId:'synthetic-'+(++n),revision,origin:'human-authored',review:reviewed(revision),mappingReview:reviewed(revision),sourceRefs:['synthetic-fixture-only'],representations:{pointed:{text:'SYNTHETIC '+slotId,runs:[{startIndex:0,format:{bold:true}}]}}};v.approvalDigest=lexicalApprovalDigest(v);return {slotId,status:'supplied',variants:[v]};})};word.approvalDigest=lexicalApprovalDigest(word);lex.words.push(word);
  lex.introductions.push({linkId:'synthetic-intro-'+category,wordKey:word.wordKey,action:'introduce',revision,review:reviewed(revision),courseId:'demo-foundations',lessonId:'lesson-1'});
 }
 for(const [lessonId,category,slotIds] of [
  ['lesson-1','preposition',slotsForCategory('preposition').slice(0,3)],['lesson-2','preposition',slotsForCategory('preposition').slice(3,7)],['lesson-3','preposition',slotsForCategory('preposition').slice(7)],
  ['lesson-1','adjective',['adjective.ms']],['lesson-2','adjective',['adjective.fs']],['lesson-3','adjective',['adjective.mp','adjective.fp']],
  ['lesson-1','verb',['verb.past.he']],['lesson-2','verb',slotsForCategory('verb').filter(s=>s.startsWith('verb.present.'))],['lesson-3','verb',slotsForCategory('verb').filter(s=>s.startsWith('verb.future.'))]
 ])lex.unlocks.push({unlockId:'synthetic-unlock-'+(++n),revision:'synthetic-v1',review:reviewed('synthetic-v1'),courseId:'demo-foundations',lessonId,scope:{kind:'all',category},slotIds});
 return lex;
}
