// SYNTHETIC disposable test/rehearsal pack. Never loaded by seed/startup/import.
import {exerciseVocabularySurfaces} from '../public/exercise-bindings.js';
export function syntheticOccurrencePack(store) {
 const content=store.snapshot();
 for(const e of content.exercises){
  e.prompt='SYNTHETIC occurrence fixture · מי';
  e.context='מִי?! \u200f👩‍🏫 e\u0301\r\nמי';
  e.feedback='SYNTHETIC feedback · מי';e.feedbackDetails='SYNTHETIC detail · מי';
  if(e.type==='typing'&&!e.answers)e.answers=[content.words.find(w=>w.id===e.wordId).pointed];
  e.vocabularyBindings=exerciseVocabularySurfaces(e).map((surface,i)=>{
   const start=['prompt','feedback','feedbackDetails'].includes(surface.field)?surface.sourceText.lastIndexOf('מי'):0;
   return {id:'synthetic-occurrence-'+i,wordId:'w-mi',...surface,start,end:surface.sourceText.length,text:surface.sourceText.slice(start)};
  });
 }
 return content;
}
