import {JSDOM} from 'jsdom';
import createDOMPurify from 'dompurify';
import {marked} from 'marked';
import {createLessonRenderer} from '../public/rich.js';
import {validateTextPages,validateTextMetadata,validPageID} from '../public/text-contract.js';
import {validateContentIdentities,resolveContentID} from '../public/content-identity.js';
import {projectCurriculum} from '../public/course.js';
import {sha256,equal,safeID} from './source-utils.js';
import {DomainError} from './errors.js';

const namespace='first20-20261025';
const dom=new JSDOM(''),sanitize=createLessonRenderer(marked,createDOMPurify(dom.window),dom.window.document);
const fail=message=>{throw new DomainError(message,400,'TEXT_IMPORT_INVALID');};
const text=(value,label,max=12000)=>{if(typeof value!=='string'||!value.trim()||value.length>max)fail('Invalid '+label);};
const cleanID=id=>'draft-first20-'+id;
const sourceHash=source=>{const stable=structuredClone(source);delete stable.order;stable.pages.sort((a,b)=>a.id.localeCompare(b.id));return sha256(stable);};
// Review has no Store access. Conflicts return no candidate and cannot partially write.
export function prepareTextDraftImport(content,pack,{wordMappings={},lessonMappings={}}={}){
 if(pack?.schema!=='hebleo.interactive-text-draft.v1'||!Array.isArray(pack.lessons)||!pack.lessons.length||pack.lessons.length>200||JSON.stringify(pack).length>12000000)fail('Unsupported interactive text draft pack.');
 validateTextMetadata(pack);validateContentIdentities(content);
 for(const mapping of [wordMappings,lessonMappings])if(!mapping||typeof mapping!=='object'||Array.isArray(mapping))fail('Mappings need explicit objects.');
 const incomingIds=new Set(),pageIds=new Set(),targetIds=new Set();
 for(const lesson of pack.lessons){
  if(!safeID(lesson.id)||incomingIds.has(lesson.id))fail('Duplicate or invalid draft lesson identity.');incomingIds.add(lesson.id);
  text(lesson.title,'lesson title',1000);if(!Array.isArray(lesson.pages)||!lesson.pages.length||lesson.pages.length>200||!Array.isArray(lesson.vocabulary)||lesson.vocabulary.length>300)fail('Invalid lesson pages/targets.');
  for(const page of lesson.pages){if(!validPageID(page.id)||pageIds.has(page.id))fail('Duplicate or invalid frozen page identity.');pageIds.add(page.id);}
  for(const target of lesson.vocabulary){if(!validPageID(target.id)||targetIds.has(target.id))fail('Duplicate or invalid draft target identity.');targetIds.add(target.id);text(target.he,'draft target surface');text(target.meaning,'draft target meaning');}
 }
 if(Object.keys(wordMappings).some(id=>!targetIds.has(id))||Object.keys(lessonMappings).some(id=>!incomingIds.has(id)))fail('Unknown mapping source ID.');
 const next=structuredClone(content),conflicts=[],mappings=[],unresolvedTargets=[],unresolvedPrerequisites=[];
 const lessonIDs=new Map();
 for(const source of pack.lessons){
  let target=cleanID(source.id);
  if(Object.hasOwn(lessonMappings,source.id)){
   // Explicit mapping is review information, never permission to overwrite another lesson.
   try{target=resolveContentID(content,'lessons',lessonMappings[source.id]);}catch(error){conflicts.push({kind:'lesson-mapping',sourceId:source.id,message:error.message});}
  }
  lessonIDs.set(source.id,target);
 }
 for(const source of pack.lessons){
  const id=lessonIDs.get(source.id),draftTargets=source.vocabulary.map(target=>{
   const mapped=wordMappings[target.id];let wordId;
   if(mapped!==undefined){try{wordId=resolveContentID(content,'words',mapped);}catch(error){conflicts.push({kind:'word-mapping',sourceId:target.id,message:error.message});}}
   if(!wordId)unresolvedTargets.push({lessonId:id,targetId:target.id,he:target.he,meaning:target.meaning});
   mappings.push({kind:'target',sourceId:target.id,wordId:wordId||null,status:wordId?'explicitly-mapped':'review-required'});
   return {...structuredClone(target),...(wordId?{wordId}:{}),mappingStatus:wordId?'explicitly-mapped':'review-required'};
  });
  const targets=new Map(draftTargets.map(t=>[t.id,t]));
  const pages=source.pages.map(original=>{
   const page=structuredClone(original);page.sourceStage=page.stage;delete page.stage;
   if(page.html!==undefined)page.html=sanitize(page.html);
   if(page.type==='recall'){page.grading='self-check';page.gate='reveal';}
   if(page.type==='timedRecall'){page.accessibleAlternative=true;page.gate='reveal';}
   if(page.type==='choice')page.gate='commit';
   if(page.type==='vocabulary'){
    if(!Array.isArray(page.words)||page.words.some(w=>!targets.has(w.id)||!equal(w,source.vocabulary.find(t=>t.id===w.id))))fail('Vocabulary page targets disagree with the lesson target registry.');
    page.wordIds=[...new Set(page.words.map(w=>targets.get(w.id).wordId).filter(Boolean))];
    page.unresolvedTargetIds=page.words.filter(w=>!targets.get(w.id).wordId).map(w=>w.id);delete page.words;
   }
   return page;
  });
  const wordIds=[...new Set(draftTargets.map(t=>t.wordId).filter(Boolean))],textPages={version:1,pages,order:pages.map(p=>p.id)};
  validateTextPages(textPages,{wordIds:next.words.map(w=>w.id),targetIds:draftTargets.map(t=>t.id)});
  // Token-boundary matches are explicit readable IDs in the supplied prerequisite text.
  // Free prose is retained for human review; no inferred pedagogical dependency is invented.
  const prerequisiteText=source.prerequisites||'',references=[...prerequisiteText.matchAll(/\b[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*\b/g)].map(m=>m[0]);
  const prerequisiteIds=[...new Set(references.filter(ref=>lessonIDs.has(ref)&&ref!==source.id).map(ref=>lessonIDs.get(ref)))];
  const unknown=references.filter(ref=>!lessonIDs.has(ref)&&ref!=='None');if(unknown.length)unresolvedPrerequisites.push({lessonId:id,references:unknown});
  const imported={...structuredClone(source),id,contentId:source.id,contentAliases:(source.legacyIds||[]).map(value=>({value,namespace:'planning-spiral-a'})),
   compositionVersion:2,introducedLetters:'',minutes:5,wordIds,exerciseIds:[],checkExerciseIds:[],draftTargets,prerequisiteIds,prerequisiteText,
   blocks:[{id:'first20-text',type:'explanation',source:'inline',renderer:'text',text:'',textPages,options:{textDirection:'auto'}},
    {id:'first20-vocabulary',type:'vocabulary',source:'words',renderer:'vocabulary-table',selector:{mode:'ids',ids:wordIds}}],
   draftImport:{namespace,sourceLessonId:source.id,sourceHash:sourceHash(source),packRevision:pack.revision},
   publicationStatus:'unpublished-adapted-draft',provenance:{kind:'adapted-draft',source:pack.sourcePolicy||'Supplied adapted teaching pack',approval:'pending'},
   authoringReview:{wording:'pending-Guy-review',nikkud:'pending-human-authoring',audio:'pending-human-authoring',recordings:'not-inspected',keyboard:'introduced letters require explicit source mapping'}};
  delete imported.pages;delete imported.vocabulary;delete imported.order;
  const existing=next.lessons.find(l=>l.id===id);
  if(existing){
   if(!equal(existing.draftImport,imported.draftImport))conflicts.push({kind:'existing-content',sourceId:source.id,targetId:id,message:'Existing identity has different source content or import ownership.'});
   // Same source import leaves author edits, page ordering and responses attached to their IDs.
   else if(!equal(existing.draftTargets,imported.draftTargets))conflicts.push({kind:'mapping-change',sourceId:source.id,targetId:id,message:'Existing target mappings differ; explicit mapping review required.'});
  }else next.lessons.push(imported);
  mappings.push({kind:'lesson',sourceId:source.id,targetId:id,legacyAliases:source.legacyIds||[]});
 }
 if(conflicts.length)return {status:'review-required',conflicts,mappings,unresolvedTargets,unresolvedPrerequisites};
 next.curriculum=projectCurriculum(content);
 for(const source of pack.lessons){const id=lessonIDs.get(source.id);if(!content.lessons.some(l=>l.id===id))next.curriculum.order.push({lessonId:id});}
 // Do not change an existing verified/synthetic envelope's provenance. Object approvals
 // and publicationStatus make the adapted draft boundary explicit and independently gated.
 try{validateContentIdentities(next);}catch(error){return {status:'review-required',conflicts:[{kind:'alias',message:error.message}],mappings,unresolvedTargets,unresolvedPrerequisites};}
 const receipt={namespace,sourceHash:sha256(pack),lessonCount:pack.lessons.length,pageCount:pageIds.size,targetCount:targetIds.size,unresolvedTargetCount:unresolvedTargets.length,
  mappings,unresolvedTargets,unresolvedPrerequisites,publicationStatus:'unpublished-adapted-draft',sourcePolicy:pack.sourcePolicy,sheetStatus:pack.sheetStatus};
 return {status:'ready-unpublished',content:next,receipt,conflicts:[],mappings,unresolvedTargets,unresolvedPrerequisites};
}
