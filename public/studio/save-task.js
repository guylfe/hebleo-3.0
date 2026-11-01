// Stateless worker tasks. Only workspace.js owns draft/base/CAS authority.
import {deriveLessonIndices,validateCurriculum,validateLessonComposition} from '../course.js';
import {validateContentIdentities} from '../content-identity.js';
export function prepareCollectedContent(next){
 next.lessons=next.lessons.map(l=>deriveLessonIndices(next,l));
 validateContentIdentities(next);validateCurriculum(next);for(const l of next.lessons)validateLessonComposition(next,l);return next;
}
export const prepareStudioContent=content=>prepareCollectedContent(structuredClone(content));
export function publicationStates(baseline,published){
 if(!published)return [];
 const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),lessons=new Map(published.lessons.map(l=>[l.id,l]));
 const changed=new Set(baseline.lessons.filter(l=>!same(l,lessons.get(l.id))).map(l=>l.id));
 const indices=Object.fromEntries(['words','exercises'].map(k=>[k,[new Map(baseline[k].map(x=>[x.id,x])),new Map(published[k].map(x=>[x.id,x]))]]));
 return baseline.lessons.map(saved=>{
  const referencesEqual=['words','exercises'].every(k=>(saved[k==='words'?'wordIds':'exerciseIds']||[]).every(id=>same(indices[k][0].get(id),indices[k][1].get(id))));
  return [saved.id,!changed.has(saved.id)&&referencesEqual?'This lesson is published.'+(changed.size?' Other workspace drafts remain private.':''):'Draft saved · not published.'];
 });
}
export function processSaveTask({kind='prepare',input,published,baseline}){
 if(kind==='publication')return {states:publicationStates(baseline,published)};
 const start=performance.now(),content=prepareCollectedContent(input.content),validated=performance.now();
 const indices=content.lessons.map(l=>({id:l.id,wordIds:l.wordIds,exerciseIds:l.exerciseIds,checkExerciseIds:l.checkExerciseIds}));
 const body=new TextEncoder().encode(JSON.stringify({...input,content})),encoded=performance.now();
 const states=publicationStates(content,published);
 return {indices,body,states,timing:{validationMs:validated-start,encodingMs:encoded-validated,publicationMs:performance.now()-encoded}};
}
