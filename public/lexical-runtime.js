import {orderedLessons,validateCurriculum} from './course.js';
import {audioURL} from './ux.js';
import {LEXICAL_VERSION,SOURCE_SCHEMA_VERSION,SLOT_DEFINITIONS,computeEligibility,isApproved,projectLessonTitles,validateLexicalContent} from './lexical-contract.js';

export const emptyLexical=()=>({version:LEXICAL_VERSION,sourceSchemaVersion:SOURCE_SCHEMA_VERSION,words:[],classes:[],introductions:[],unlocks:[],aliases:[],usages:[],examples:[]});
// This local app's existing entitlement/course ID is authoritative. A workbook's
// unconnected catalogue never substitutes a curriculum or decimal sorting rule.
export function lexicalCatalogue(content){
 validateCurriculum(content);
 return {status:'connected',courses:[{id:content.courseId||'demo-foundations',lessonIds:orderedLessons(content).map(l=>l.id)}],lessons:content.lessons.map(l=>({id:l.id,title:l.title}))};
}
export const lexicalCourseId=content=>lexicalCatalogue(content).courses[0].id;
const plural={noun:'Nouns',adjective:'Adjectives',verb:'Verbs',preposition:'Prepositions',other:'Other'};
const rich=v=>typeof v==='string'?v:v?{text:v.text,formatting:{formattedValue:v.text,...(v.format?{userEnteredFormat:v.format}:{}),...(v.runs?{textFormatRuns:v.runs}:{})}}:'';
function projectedForm(slot){
 const meta=SLOT_DEFINITIONS.find(d=>d.id===slot.slotId),token=slot.slotId.split('.').at(-1);
 return {slotId:slot.slotId,status:slot.state==='available'||slot.sourceState==='available'&&slot.state===undefined?'eligible':slot.state||slot.sourceState,
  ...(slot.variants?.length?{value:rich(slot.variants[0]),values:slot.variants.map(rich)}:{}),label:slot.slotId,pronoun:meta?.pronoun,
  tense:meta?.group==='gerund'?'verbal-noun':meta?.group,number:meta?.number,gender:({masculine:'m',feminine:'f',shared:'shared'})[meta?.gender],
  person:['I','אנחנו'].includes(token)?'1':['אתה','את','אתם','אתן'].includes(token)?'2':'3',base:meta?.citation===true||slot.slotId==='adjective.ms'};
}
export function projectLexicalRows(content,lessonId,{offset=0,limit=50,representation='pointed',search='',tag='',usedLessonId='',learningState='',learner}={}){
 if(!content.lexical)return null;
 const lexical=content.lexical,catalogue=lexicalCatalogue(content),courseId=catalogue.courses[0].id;
 const check=validateLexicalContent(lexical,catalogue);if(!check.ok)throw new Error('Invalid lexical content: '+JSON.stringify(check.errors.slice(0,4)));
 const contextIndex=catalogue.courses[0].lessonIds.indexOf(lessonId);
 if(contextIndex<0)return {version:1,courseId,lessonId,status:'unknown-lesson',rows:[],total:0};
 const available=lexical.words.filter(w=>isApproved(w.identityReview,w.revision)&&isApproved(w.displayReview,w.revision)&&!w.fieldConflicts.length&&lexical.introductions.some(i=>i.wordKey===w.wordKey&&i.action==='introduce'&&i.courseId===courseId&&catalogue.courses[0].lessonIds.indexOf(i.lessonId)>=0&&catalogue.courses[0].lessonIds.indexOf(i.lessonId)<=contextIndex&&isApproved(i.review,i.revision)));
 let rows=available.map(word=>{
  const result=computeEligibility(lexical,catalogue,{courseId,lessonId,wordKey:word.wordKey,representation});
  const display=word.display||{};
  const ownedAudio=word.sourceFields?.Audio;
  const audio=ownedAudio&&['agreed','resolved'].includes(ownedAudio.status)?ownedAudio.value:word.category==='noun'||word.category==='other'?word.sourceRecord?.values?.[15]:null;
  let projectedForms=result.slots.map(projectedForm);
  for(const shared of word.sharedScopes||[])if(isApproved(shared.review,word.revision)&&shared.slotIds?.length===2){const selected=projectedForms.filter(f=>shared.slotIds.includes(f.slotId));if(selected.length===2&&selected.every(f=>f.status==='eligible')&&selected[0].number===selected[1].number&&selected[0].tense===selected[1].tense&&JSON.stringify(selected[0].values)===JSON.stringify(selected[1].values)){projectedForms=projectedForms.filter(f=>!shared.slotIds.includes(f.slotId));projectedForms.push({...selected[0],gender:'shared',sharedSlotIds:[...shared.slotIds],introducedGenders:['m','f']});}}
  const pairs=(kind)=>lexical[kind].filter(i=>i.wordKey===word.wordKey&&isApproved(i.review,i.revision)).map(i=>({hebrew:rich(i.hebrew),english:rich(i.english),notes:rich(i.notes),...(i.coversBareMeaning===true?{coversBareMeaning:true}:{})}));
  return {wordKey:word.wordKey,category:plural[word.category],available:result.wordAvailable,...Object.fromEntries(['hebrew','english','root','pattern','notes','gender','plural'].map(k=>[k,rich(display[k])])),noteRevision:word.revision,forms:projectedForms,...(result.citation?{citation:{past:projectedForm(result.citation.slots[0]),present:projectedForm(result.citation.slots[1])}}:{}),usages:pairs('usages'),examples:pairs('examples'),tags:word.tags||[],lessonIds:lexical.introductions.filter(i=>i.wordKey===word.wordKey&&i.action!=='legacy'&&i.courseId===courseId&&isApproved(i.review,i.revision)).map(i=>i.lessonId),...(audioURL(audio)?{audio}:{}),...(word.runtimeId?{runtimeId:word.runtimeId}:{})};
 }).filter(w=>w.available);
 const managedRuntimeIds=rows.map(w=>w.runtimeId).filter(Boolean),query=search.trim().toLocaleLowerCase();
 rows=rows.filter(w=>(!query||JSON.stringify(w).toLocaleLowerCase().includes(query))&&(!tag||w.tags.includes(tag))&&(!usedLessonId||w.lessonIds.includes(usedLessonId))&&(!learningState||learningState==='new'&&!learner?.cards?.[w.runtimeId]||learningState==='review'&&learner?.cards?.[w.runtimeId]||learningState==='saved'&&learner?.bookmarks?.includes(w.runtimeId)||learningState==='due'&&learner?.cards?.[w.runtimeId]&&Date.parse(learner.cards[w.runtimeId].due)<=Date.now()));
 const total=rows.length,pageSize=Math.min(50,Math.max(1,limit));offset=Math.min(Math.max(0,offset),Math.max(0,Math.ceil(total/pageSize)-1)*pageSize);
 return {version:1,courseId,lessonId,status:'connected',offset,limit:pageSize,total,managedRuntimeIds,rows:rows.slice(offset,offset+pageSize)};
}
export function lessonLexicalDiagnostics(content,lessonId,wordKey){
 const lexical=content.lexical||emptyLexical(),catalogue=lexicalCatalogue(content);
 return {titles:projectLessonTitles(lexical.introductions,catalogue),...(wordKey?{eligibility:computeEligibility(lexical,catalogue,{courseId:catalogue.courses[0].id,lessonId,wordKey})}:{})};
}
