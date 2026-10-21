import {exerciseInLesson} from '../public/course.js';
import {projectLexicalRows} from '../public/lexical-runtime.js';

// Response only. Direct exercise references are runtime IDs, never spellings or aliases.
export function projectExerciseVocabulary(content,lessonId,publicWord){
 const exercises=content.exercises.filter(e=>exerciseInLesson(content,lessonId,e.id));
 const ids=new Set(exercises.flatMap(e=>['recognition','typing'].includes(e.type)?[e.wordId]:e.type==='matching'?e.wordIds||[]:[]).filter(Boolean));
 const managed=new Map();
 for(const word of content.lexical?.words||[])if(word.runtimeId){const list=managed.get(word.runtimeId)||[];list.push(word);managed.set(word.runtimeId,list);}
 const rows=content.lexical?projectLexicalRows(content,lessonId,{runtimeIds:ids}).rows:[];
 const byWordId=Object.create(null);
 for(const id of ids){
  const words=content.words.filter(w=>w.id===id);if(words.length!==1||words[0].noVocab)continue;
  if(managed.has(id)){
   const matches=rows.filter(w=>w.runtimeId===id);
   if(managed.get(id).length===1&&matches.length===1)byWordId[id]={kind:'lexical',row:matches[0]};
  }else byWordId[id]={kind:'legacy',word:publicWord(words[0])};
 }
 return {version:1,lessonId,byWordId};
}
