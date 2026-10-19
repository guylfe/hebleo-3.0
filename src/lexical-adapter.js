import {createHash} from 'node:crypto';
import {LEXICAL_VERSION,SOURCE_SCHEMA_VERSION,SLOT_IDS,slotsForCategory,validateLexicalContent,resolveFieldOwnership} from '../public/lexical-contract.js';

import {validateConsolidatedCapture} from './lexical-capture.js';
export {WORKBOOK_CAPTURE_VERSION} from './lexical-capture.js';
const pending=()=>({status:'pending'});
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const value=cell=>cell?.userEnteredValue?.stringValue??cell?.userEnteredValue?.numberValue??cell?.userEnteredValue?.boolValue??cell?.stringValue??'';
const records=sheet=>(sheet?.data||[]).flatMap(d=>d.values||[]);
const textCell=cell=>({text:String(value(cell)),...(cell?.textFormatRuns?{runs:structuredClone(cell.textFormatRuns)}:{}),...(cell?.userEnteredFormat?{format:structuredClone(cell.userEnteredFormat)}:{})});

// Explicit, lossless map between the linguistic handoff's slot vocabulary and v3.
export const HANDOFF_SLOT_MAP=Object.freeze(Object.fromEntries([
 ['infinitive','verbalNoun','past.1s','past.2ms','past.2fs','past.3ms','past.3fs','past.1p','past.2mp','past.2fp','past.3p','present.ms','present.fs','present.mp','present.fp','future.1s','future.2ms','future.2fs','future.3ms','future.3fs','future.1p','future.2mp','future.2fp','future.3p','imperative.2ms','imperative.2fs','imperative.2mp','imperative.2fp'].map((s,i)=>['verb:'+s,SLOT_IDS[i]]),
 ['ms','fs','mp','fp'].map(s=>['adjective:'+s,'adjective.'+s]),
 ['1s','2ms','2fs','3ms','3fs','1p','2mp','2fp','3mp','3fp'].map((s,i)=>['preposition:'+s,SLOT_IDS[32+i]])
].flat()));

function bindingText(binding,styles){
 const raw=styles?.cells?.[binding.sourceRow+':'+binding.sourceField];
 const rich=raw?.cell||raw;
 // Original native styles remain in archive even when a source span needs review.
 const sourceRuns=rich?.textFormatRuns||raw?.runs?.map(r=>({startIndex:r[0],format:styles.formats[r[1]]}));
 const [start,end]=binding.sourceSpan||[0,binding.value.length];
 const runs=[];
 if(sourceRuns){const active=sourceRuns.filter(r=>r.startIndex<=start).at(-1);if(active)runs.push({...active,startIndex:0});for(const run of sourceRuns)if(run.startIndex>start&&run.startIndex<end)runs.push({...run,startIndex:run.startIndex-start});}
 const segments=binding.originalBinding?.teachingSegments;
 if(!runs.length&&segments?.map(s=>s.text).join('')===binding.value){let at=0;for(const segment of segments){const colors=[...new Set(segment.sourceColors||[])],format={...(colors.length===1&&/^[0-9a-f]{6}$/i.test(colors[0])?{foregroundColor:'#'+colors[0]}:{}),...(segment.stress===true?{bold:true}:{})};if(segment.text.length)runs.push({startIndex:at,format});at+=segment.text.length;}}
 const format=rich?.userEnteredFormat||styles?.formats?.[raw?.format];
 return {text:binding.value,...(runs.length?{runs}:{}),...(format?{format}:{})};
}

// Consumes a supplied capture, never reads hidden/legacy tabs as active paradigms.
// Every source, proposal, flag, audio candidate and native cell survives in archive.
export function adaptConsolidatedWorkbook(capture){
 const {byBinding,sources,headerIndex,sourceTargets,held}=validateConsolidatedCapture(capture);
 const {plan,sourceRecords,styles,related}=capture,namespace=sourceRecords.sourceSpreadsheetId;
 const lexical={version:LEXICAL_VERSION,sourceSchemaVersion:SOURCE_SCHEMA_VERSION,words:[],classes:[],introductions:[],unlocks:[],aliases:[],usages:[],examples:[],captureDigest:digest(capture),sourceSpreadsheetId:capture.spreadsheetId,catalogueStatus:'unconnected',archive:structuredClone(capture)};
 const active=new Set();
 const names={Verbs:'verb',Adjectives:'adjective',Prepositions:'preposition'};
 for(const table of plan.tables.filter(t=>names[t.name]))for(const row of table.rows){
  const wordKey=value(row[0]),category=names[table.name];if(active.has(wordKey)||held.has(wordKey))throw new Error('Duplicate or held active lexical identity.');active.add(wordKey);
  const sourceIds=String(value(row[8])).split(',').map(s=>s.trim()).filter(Boolean);
  const revision='capture-'+lexical.captureDigest;
  const word={wordKey,category,revision,identityReview:pending(),displayReview:pending(),fieldConflicts:[],classMemberships:[],forms:[],sourceIds,display:{hebrew:textCell(row[1]),english:textCell(row[2]),root:textCell(row[5]),pattern:textCell(row[6]),notes:textCell(row[7])},sourceFields:{}};
  word.sharedScopes=(capture.sharedScopes||[]).filter(s=>s.wordKey===wordKey).map(s=>({...structuredClone(s),review:pending()}));
  for(const field of ['Audio','Pl. Audio','Fem. Audio','Pl.Fem. Audio','No_Vocab','No_Card']){
   const candidates=sourceIds.map(id=>({sourceRef:namespace+':'+id+':'+field,value:sources.get(id).values[headerIndex.get(field)]}));
   word.sourceFields[field]=resolveFieldOwnership({candidates});if(word.sourceFields[field].status==='conflict')word.fieldConflicts.push(field);
  }
  const audit=plan.statusAudit.filter(a=>a.groupKey===wordKey);
  for(const slotId of slotsForCategory(category)){
   const a=audit.find(a=>HANDOFF_SLOT_MAP[category+':'+a.slot.replace(new RegExp('^'+category+'\\.'),'')]===slotId);if(!a)throw new Error('Missing explicit slot mapping: '+wordKey+' '+slotId);
   const variants=(a.bindingIds||[]).map(bindingId=>{const b=byBinding.get(bindingId);if(!b)throw new Error('Unknown supplied binding '+bindingId);return {variantId:bindingId,revision,origin:'source',review:pending(),mappingReview:pending(),sourceRefs:[b.sourceId?namespace+':Masterfile:'+b.sourceId+':'+b.sourceField:JSON.stringify(b.source||b.locator||b)],representations:{pointed:bindingText(b,styles)},sourceBinding:structuredClone(b)};});
   word.forms.push({slotId,status:['inapplicable','not-applicable-in-source-sense'].includes(a.status)?'inapplicable':a.status==='missing'?'missing':variants.length?'supplied':'unresolved',variants,sourceStatus:a.status,draftId:a.draftId??null});
  }
  lexical.words.push(word);
 }
 // All non-paradigm entries remain one author-side object each; no fabricated spellings.
 for(const r of sourceRecords.records){const sourceId=r.values[30];if(sourceTargets.has(sourceId))continue;
  const get=h=>r.values[headerIndex.get(h)]??'';
  lexical.words.push({wordKey:sourceId,category:get('Type')==='Noun'?'noun':'other',revision:'capture-'+lexical.captureDigest,identityReview:pending(),displayReview:pending(),fieldConflicts:[],classMemberships:[],forms:[],sourceIds:[sourceId],display:{hebrew:{text:String(get('Hebrew'))},english:{text:String(get('English'))},notes:{text:String(get('Notes'))},root:{text:String(get('Root'))},pattern:{text:String(get('Pattern'))},gender:{text:String(get('Gender'))},plural:{text:String(get('Plural'))}},sourceRecord:structuredClone(r)});active.add(sourceId);
 }
 const table=name=>plan.tables.find(t=>t.name===name);
 for(const row of table('Source Map').rows){const v=row.map(value);if(!active.has(v[4]))continue;lexical.aliases.push({kind:v[0]==='source-entry'?'source':'word',namespace:v[1]+':'+v[2],aliasId:v[3],wordKey:v[4],revision:'capture-'+lexical.captureDigest,review:pending(),sourceRow:structuredClone(row)});}
 lexical.formReferences=table('Form References').rows.map(row=>{const v=row.map(value),word=lexical.words.find(w=>w.wordKey===v[3]),slots=String(v[4]).split(/,\s*/).filter(Boolean).map(s=>HANDOFF_SLOT_MAP[word?.category+':'+s.replace(new RegExp('^'+word?.category+'\\.'),'')]);return {referenceId:v[0],namespace:namespace+':Masterfile',wordKey:word?.wordKey||null,retainedTarget:v[3],slotIds:slots.filter(Boolean),state:!word?'held':slots.length===1&&slots[0]?'pending-mapping':'retained-source-reference',review:pending(),sourceRow:structuredClone(row)};});
 for(const ref of lexical.formReferences)if(ref.wordKey&&ref.slotIds.length===1)lexical.aliases.push({kind:'form',namespace:ref.namespace,aliasId:ref.referenceId,wordKey:ref.wordKey,slotId:ref.slotIds[0],revision:'capture-'+lexical.captureDigest,review:pending()});
 for(const row of table('Word Introductions').rows){const v=row.map(value);if(!active.has(v[1]))continue;lexical.introductions.push({linkId:v[0],wordKey:v[1],action:'legacy',revision:'capture-'+lexical.captureDigest,review:pending(),legacyReference:String(v[3]),sourceRow:structuredClone(row)});}
 for(const name of ['Usage','Examples']){
  const sheet=related.find(s=>s.title===name);if(!sheet)throw new Error('Missing child table '+name);
  const rs=records(sheet),headers=rs[0].map(value),updates=plan.childUpdates.find(c=>c.name===name)?.updates||[];
  for(const update of updates){const row=rs[update.row-1];if(!row||!active.has(update.target))throw new Error('Unresolved child parent '+update.childKey);
   const payload=Object.fromEntries(headers.map((h,i)=>[h,structuredClone(row[i]||{})]));
   lexical[name==='Usage'?'usages':'examples'].push({[name==='Usage'?'usageId':'exampleId']:update.childKey,wordKey:update.target,revision:'capture-'+lexical.captureDigest,review:pending(),sourceCells:payload});
  }
 }
 const check=validateLexicalContent(lexical);if(!check.ok)throw new Error('Invalid adapted vocabulary: '+JSON.stringify(check.errors.slice(0,8)));
 lexical.retainedReferences={aliases:structuredClone(table('Source Map').rows),occurrences:structuredClone(table('Word Introductions').rows),formReferences:structuredClone(table('Form References').rows),heldIdentities:structuredClone(table('Identity Review').rows)};
 return {lexical,preview:{captureDigest:lexical.captureDigest,counts:{words:lexical.words.length,categories:Object.fromEntries(['verb','adjective','preposition','noun','other'].map(c=>[c,lexical.words.filter(w=>w.category===c).length])),aliases:table('Source Map').rows.length,activeSourceAliases:lexical.aliases.filter(a=>a.kind!=='form').length,semanticFormAliases:lexical.aliases.filter(a=>a.kind==='form').length,formReferences:table('Form References').rows.length,legacyOccurrences:table('Word Introductions').rows.length,activeLegacyOccurrences:lexical.introductions.length,usages:lexical.usages.length,examples:lexical.examples.length,held:held.size,unapprovedDrafts:table('Draft Forms').rows.length},migration:{mode:'preview-only',canApply:false},sourceStatus:'captured-draft; live native freshness unverified'}};
}
