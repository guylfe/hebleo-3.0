import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const [candidate,parent,tempPath]=process.argv.slice(2);
const load=(root,file)=>import(pathToFileURL(path.join(root,file)));
const current=await load(candidate,'src/store.js'),old=await load(parent,'src/store.js');
const {projectLesson,projectCurriculum}=await load(candidate,'public/course.js');
const imported=await load(candidate,'public/vocabulary-import.js'),beforeCSV=await load(parent,'public/content.js');
const a=new current.Store(),b=new old.Store();
try{
 const c=a.snapshot();c.lessons=c.lessons.map(l=>projectLesson(c,l));c.curriculum=projectCurriculum(c);
 c.lessons[0].blocks.push({...structuredClone(c.lessons[0].blocks[0]),id:'block-control-second',text:c.lessons[1].explanation});
 current.validateContent(c);assert.throws(()=>old.validateContent(c));console.log('CONTROL: repeated text content accepted by candidate; unchanged parent rejects it.');
 const e={...a.snapshot().exercises.find(e=>e.type==='typing'),requireNikkud:true},word=a.snapshot().words.find(w=>w.id===e.wordId);
 const cv=await load(candidate,'src/evaluate.js'),pv=await load(parent,'src/evaluate.js');assert.equal(cv.evaluateAnswer(e,a.snapshot(),word.unpointed).correct,true);assert.equal(pv.evaluateAnswer(e,a.snapshot(),word.unpointed).correct,false);console.log('CONTROL: unpointed answer on old vowel-required content passes candidate, fails unchanged parent.');
 const w=a.snapshot().words[0],header=['id','pointed','unpointed','curated','english','fieldFormatting'],metadata={pointed:{formattedValue:w.pointed,effectiveFormat:{textFormat:{bold:true}}}},values=[w.id,w.pointed,w.unpointed,w.curated,w.english,JSON.stringify(metadata)];
 const csv=[header,values].map(row=>row.map(value=>'"'+value.replaceAll('"','""')+'"').join(',')).join('\n');
 const parsed=imported.parseVocabularyCSV(csv);assert.deepEqual(imported.mapVocabularyRows(parsed,imported.defaultColumnMapping(header),a.snapshot()).content.words[0].fieldFormatting,metadata);assert.equal(beforeCSV.importVocabularyCSV(csv,b.snapshot()).words[0].sourceFields.fieldFormatting,JSON.stringify(metadata));console.log('CONTROL: typed CSV metadata is decoded by candidate; unchanged parent retains an opaque string.');
 const p={lessonId:'lesson-1',revisionId:1,step:'learn',componentId:'legacy-explanation',question:0,answer:'',selectedTokens:[],matching:{},practiceIds:[]};
 assert.equal(a.saveProgress('learner-demo',p).componentId,'legacy-explanation');assert.equal(b.saveProgress('learner-demo',p).componentId,undefined);console.log('CONTROL: candidate stores a component cursor; unchanged parent drops it.');
 const schema3=new current.Store(tempPath);schema3.close();assert.throws(()=>new old.Store(tempPath),/schema 3/);console.log('CONTROL: old binary refuses schema-3 database.');
}finally{a.close();b.close();}
