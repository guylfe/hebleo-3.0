// Private visual-review fixture extracted from the approved local prototype.
// Exact supplied Hebrew only. Reviews/lesson milestones below are disposable
// UI test overlays, never an approval or curriculum change to the workbook.
import fs from 'node:fs';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
import {emptyLexical} from '../public/lexical-runtime.js';
import {slotsForCategory} from '../public/lexical-contract.js';
import {lexicalApprovalDigest} from '../src/lexical-trust.js';

export function buildVisualVocabulary(referenceHtml,modelCode){
 const document=new JSDOM(referenceHtml).window.document;
 const data=JSON.parse(document.getElementById('grammar-option-data').textContent);
 const entryMatch=document.scripts[3].textContent.match(/const entries=(\[.*?\]);\s*function noteForDisplay/s);
 if(!entryMatch)throw new Error('Approved prototype entries were not found');
 const entries=JSON.parse(entryMatch[1]);
 const box={};vm.runInNewContext(modelCode,box);const model=box.HebleoGrammarModel;
 const lex=emptyLexical(),revision='source-backed-visual-preview-v1';let n=0;
 const reviewed=()=>({status:'approved',reviewedRevision:revision,reviewedBy:'disposable-visual-preview-only',reviewedAt:'2026-10-18T00:00:00Z'});
 const rich=text=>({text:text||''});
 function sourceValue(form){
  const text=form.value||'',runs=[];let startIndex=0;
  const colors={blue:'#0070c0',green:'#087a42',purple:'#7731b8',orange:'#9c4b09',red:'#a6192e'};
  if(form.teachingSegments?.map(s=>s.text).join('')===text)for(const segment of form.teachingSegments){
   const format={};if(colors[segment.role])format.foregroundColor=colors[segment.role];if(segment.stress)format.bold=true;
   if(segment.text)runs.push({startIndex,format});startIndex+=segment.text.length;
  }
  return {text,...(runs.length?{runs}:{})};
 }
 function addForm(word,slotId,form){
  if(!form?.value)return;
  const v={variantId:'visual-binding-'+(++n),revision,origin:'source',review:reviewed(),mappingReview:reviewed(),sourceRefs:[String(form.sourceId||word.sourceIds[0])+':'+String(form.sourceField||slotId)],representations:{pointed:sourceValue(form)}};
  v.approvalDigest=lexicalApprovalDigest(v);word.forms.find(f=>f.slotId===slotId).status='supplied';word.forms.find(f=>f.slotId===slotId).variants.push(v);
 }
 function word(key,category,entry){
  return {wordKey:'visual-'+key,revision,category,identityReview:reviewed(),displayReview:reviewed(),fieldConflicts:[],classMemberships:[],sourceIds:[entry.id||entry.ID||key],display:Object.fromEntries(['hebrew','english','notes','root','pattern','gender','plural'].map(k=>[k,rich(entry[k]??entry[k[0].toUpperCase()+k.slice(1)])])),forms:slotsForCategory(category).map(slotId=>({slotId,status:'missing',variants:[]}))};
 }
 function finish(w,entry){
  for(const [i,example]of(entry.examples||[]).entries())lex.examples.push({exampleId:w.wordKey+'-example-'+i,wordKey:w.wordKey,revision,review:reviewed(),hebrew:rich(example.hebrew),english:rich(example.english)});
  w.approvalDigest=lexicalApprovalDigest(w);lex.words.push(w);
  lex.introductions.push({linkId:w.wordKey+'-introduction',wordKey:w.wordKey,action:'introduce',revision,review:reviewed(),courseId:'demo-foundations',lessonId:'lesson-1'});
 }
 for(const e of entries.filter(e=>['Nouns','Adjectives','Other'].includes(e.category))){
  const category={Nouns:'noun',Adjectives:'adjective',Other:'other'}[e.category],w=word(e.id,category,e);
  if(category==='adjective')for(const [slot,key]of[['ms','hebrew'],['fs','feminine'],['mp','plural'],['fp','femininePlural']])addForm(w,'adjective.'+slot,{value:e[key],sourceId:e.id,sourceField:key});
  finish(w,e);
 }
 for(const s of model.specs(data)){
  const source=data.rows.find(r=>r.ID===s.entry)||data.rows.find(r=>r.ID===s.anchor)||{};
  const e=entries.find(e=>e.id===s.anchor)||source,w=word(s.key,'verb',{...source,...e,id:s.anchor});
  w.display.english=rich(s.label);w.display.root=rich(source.Root);w.display.pattern=rich(source.Pattern);
  for(const tense of ['past','present','future'])for(const f of s[tense+'Forms']||[]){
   let tokens=tense==='present'?[f.label]:f.label==='you-pl'?['אתם','אתן']:[({we:'אנחנו','הם':'they','הן':'they'})[f.label]||f.label];
   for(const token of tokens)if(w.forms.some(x=>x.slotId==='verb.'+tense+'.'+token))addForm(w,'verb.'+tense+'.'+token,f);
   if(tokens.length===2&&f.gender==='Shared'){
    w.sharedScopes??=[];w.sharedScopes.push({slotIds:tokens.map(token=>'verb.'+tense+'.'+token),review:reviewed(),sourceRef:f.sourceId+':'+f.sourceField});
   }
  }
  for(const [key,slot]of[['infinitive','infinitive'],['gerund','gerund']])addForm(w,'verb.'+slot,s[key]);
  for(const sense of s.senses||[]){
   const noteLink=s.key==='pass'&&sense.construction.includes('בֶּ');
   lex.usages.push({usageId:w.wordKey+'-'+sense.key,wordKey:w.wordKey,revision,review:reviewed(),hebrew:rich(sense.construction),english:rich(noteLink?'pass through':sense.english),...(noteLink?{noteLink:true,sourceEnglish:sense.english}:{}),coversBareMeaning:true});
  }
  finish(w,e);
 }
 // Use the same three compact preposition examples with the fullest supplied
 // source record per base string, as the approved discussion demo does.
 const bases=[...new Set(data.prepositions.map(p=>p.Hebrew))].slice(0,3);
 for(const base of bases){
  const candidates=data.prepositions.filter(p=>p.Hebrew===base);
  const p=candidates.sort((a,b)=>model.prepositionSlots(b).filter(f=>f.value).length-model.prepositionSlots(a).filter(f=>f.value).length)[0];
  const w=word(p.ID,'preposition',p);
  for(const f of model.prepositionSlots(p))addForm(w,'preposition.'+f.field,{value:f.value,sourceId:p.ID,sourceField:f.sourceField});
  finish(w,p);
 }
 for(const category of ['adjective','verb','preposition'])for(const [lessonId,slots]of [
  ['lesson-1',slotsForCategory(category).filter(s=>category==='verb'?s==='verb.past.he':category==='adjective'?['adjective.ms','adjective.fs'].includes(s):['preposition.I','preposition.he','preposition.she'].includes(s))],
  ['lesson-2',slotsForCategory(category).filter(s=>category==='verb'?!s.startsWith('verb.future.')&&!s.startsWith('verb.imperative.'):category==='adjective'?['adjective.mp','adjective.fp'].includes(s):['preposition.אתה','preposition.את','preposition.אתם','preposition.אתן'].includes(s))],
  ['lesson-3',slotsForCategory(category).filter(s=>category==='verb'?s.startsWith('verb.future.'):category==='preposition'?['preposition.אנחנו','preposition.הם','preposition.הן'].includes(s):false)]
 ])lex.unlocks.push({unlockId:'visual-setting-'+(++n),revision,review:reviewed(),courseId:'demo-foundations',lessonId,scope:{kind:'all',category},slotIds:slots});
 return lex;
}
if(process.argv[1]?.endsWith('build-visual-vocabulary.mjs')){
 const [htmlPath,modelPath,out]=process.argv.slice(2);
 const lex=buildVisualVocabulary(fs.readFileSync(htmlPath,'utf8'),fs.readFileSync(modelPath,'utf8'));
 fs.writeFileSync(out,JSON.stringify(lex));console.log(JSON.stringify({words:lex.words.length,forms:lex.words.reduce((n,w)=>n+w.forms.filter(f=>f.variants.length).length,0),output:out}));
}
