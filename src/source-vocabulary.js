import {createHash} from 'node:crypto';
import {adaptConsolidatedWorkbook} from './lexical-adapter.js';
import {HANDOFF_SLOT_MAP} from './lexical-adapter.js';
import {SLOT_DEFINITIONS} from '../public/lexical-contract.js';

const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const sourceBrowseDigest=source=>hash(Object.fromEntries(Object.entries(source).filter(([k])=>k!=='digest')));
const value=c=>c?.userEnteredValue?.stringValue??c?.userEnteredValue?.numberValue??c?.userEnteredValue?.boolValue??c?.stringValue??'';
const categories={noun:'Nouns',other:'Other',verb:'Verbs',adjective:'Adjectives',preposition:'Prepositions'};

// Trusted offline adoption only. No consolidated display summaries, generated
// drafts, secondary-document bindings, introductions or unlocks enter this model.
export function buildSourceVocabulary(capture,native,{catalogue,mappingLedger,authorization}={}) {
 if(!authorization?.instruction||!authorization?.assignmentId)throw new Error('Exact source display authorization required.');
 if(native.spreadsheetId!==capture.sourceRecords.sourceSpreadsheetId)throw new Error('Native source spreadsheet differs.');
 const lexical=adaptConsolidatedWorkbook(capture).lexical,headers=capture.sourceRecords.headers;
 const nativeRows=new Map();
 for(const sheet of native.sheets||[])for(const block of sheet.data||[])for(const [index,row]of (block.rowData||[]).entries())nativeRows.set((block.startRow||0)+index+1,row.values||[]);
 const cells=new Map(),records=new Map(capture.sourceRecords.records.map(r=>[r.values[30],r]));
 for(const record of records.values())for(const [i,label]of headers.entries()) {
  const cell=nativeRows.get(record.row)?.[i]||{},raw=record.values[i]??'';
  if(value(cell)!==raw)throw new Error('Source values differ at '+record.values[30]+':'+label);
  cells.set(record.values[30]+':'+label,{text:String(raw),formatting:{...structuredClone(cell),formattedValue:String(raw)}});
 }
 const field=(id,label)=>structuredClone(cells.get(id+':'+label));
 const rowCounts={},rows=[],heldIds=new Set(capture.plan.tables.find(t=>t.name==='Identity Review').rows.flatMap(r=>String(value(r[2])).split(/,\s*/)));
 const allBindings=capture.bindings.bindings;
 for(const word of lexical.words) {
  const ids=word.sourceIds.filter(id=>!heldIds.has(id)&&id!=='mf-000647'),sources=ids.map(id=>records.get(id));
  if(!sources.length)continue;
  // A group identity is display-only; every original record remains accessible.
  const sourceEntries=sources.map(r=>({sourceId:r.values[30],row:r.row,lesson:r.values[1],part:r.values[2],type:r.values[3],fields:Object.fromEntries(headers.filter(h=>!['Ordinals','Lesson','Part','Type','No_Vocab','No_Card','ID'].includes(h)).filter(h=>String(r.values[headers.indexOf(h)]??'')!=='').map(h=>[h,field(r.values[30],h)])),catalogueLinks:mappingLedger?.records?.find(x=>x.sourceId===r.values[30])?.links||[]}));
  const unique=label=>[...new Map(ids.map(id=>field(id,label)).filter(f=>f.text).map(f=>[f.text,f])).values()];
  // Join exact authored notes with display separators; rebase all UTF-16 runs.
  const join=items=>{let text='',runs=[];for(const item of items){if(text)text+='\n\n';const start=text.length;const format=item.formatting?.userEnteredFormat?.textFormat||{};runs.push({startIndex:start,format});for(const run of item.formatting?.textFormatRuns||[])runs.push({...run,startIndex:start+(run.startIndex||0)});text+=item.text;}return {text,formatting:{formattedValue:text,textFormatRuns:runs}};};
  const formGroups=new Map();
  for(const b of allBindings.filter(b=>b.groupKey===word.wordKey&&ids.includes(b.sourceId)&&b.mappingStatus==='source-labeled-slot')) {
   const slotId=HANDOFF_SLOT_MAP[word.category+':'+b.slot.replace(new RegExp('^'+word.category+'\\.'),'')],meta=SLOT_DEFINITIONS.find(s=>s.id===slotId);
   // The source's base preposition is display text, not a conjugation slot.
   if(!meta)continue;
   const original=field(b.sourceId,b.sourceField),[start,end]=b.sourceSpan||[0,original.text.length];
   if(original.text!==b.rawCell||original.text.slice(start,end)!==b.value)throw new Error('Binding differs from source '+b.bindingId);
   const sourceRuns=original.formatting.textFormatRuns||[],active=sourceRuns.filter(r=>(r.startIndex||0)<=start).at(-1);
   const formatted={...original.formatting,formattedValue:b.value,textFormatRuns:[...(active?[{...active,startIndex:0}]:[]),...sourceRuns.filter(r=>r.startIndex>start&&r.startIndex<end).map(r=>({...r,startIndex:r.startIndex-start}))]};
   const f=formGroups.get(slotId)||{slotId,status:'eligible',label:slotId,pronoun:meta.pronoun,tense:meta.group==='gerund'?'verbal-noun':meta.group,number:meta.number,gender:({masculine:'m',feminine:'f',shared:'shared'})[meta.gender],person:['I','אנחנו'].includes(slotId.split('.').at(-1))?'1':['אתה','את','אתם','אתן'].includes(slotId.split('.').at(-1))?'2':'3',values:[],sourceBindingIds:[]};
   if(!f.values.some(v=>v.text===b.value))f.values.push({text:b.value,formatting:formatted});
   f.sourceBindingIds.push(b.bindingId);formGroups.set(slotId,f);
  }
  const forms=[...formGroups.values()].map(f=>({...f,value:f.values[0]}));
  const citation=word.category==='verb'?{past:forms.find(f=>f.slotId==='verb.past.he')||{status:'missing'},present:forms.find(f=>f.slotId==='verb.present.Singular M')||{status:'missing'}}:undefined;
  const first=ids[0],category=categories[word.category];
  const row={wordKey:word.wordKey,category,available:true,sourceBrowse:true,hebrew:field(first,'Hebrew'),english:field(first,'English'),root:join(unique('Root')),pattern:join(unique('Pattern')),notes:join(unique('Notes')),gender:field(first,'Gender'),plural:field(first,'Plural'),forms,...(citation?{citation}:{}),sourceEntries,noteRevision:hash(sourceEntries)};
  rows.push(row);rowCounts[category]=(rowCounts[category]||0)+1;
 }
 rows.sort((a,b)=>Math.min(...a.sourceEntries.map(e=>e.row))-Math.min(...b.sourceEntries.map(e=>e.row)));
 const source={version:1,kind:'authored-source-browse',authorization,sourceSpreadsheetId:capture.sourceRecords.sourceSpreadsheetId,captureDigest:hash(capture),nativeDigest:hash(native),catalogue:catalogue||null,mappingLedger:mappingLedger||null,rows,sourceLessons:[...new Set(rows.flatMap(r=>r.sourceEntries.map(e=>String(e.lesson))))],counts:{rows:rows.length,categories:rowCounts,visibleSourceRecords:rows.reduce((n,r)=>n+r.sourceEntries.length,0),originalSourceRecords:records.size,heldIdentityRecords:heldIds.size,emptyRecords:1,generatedDraftsHeld:capture.plan.tables.find(t=>t.name==='Draft Forms').rows.length,proposedSlotsHeld:allBindings.filter(b=>b.mappingStatus!=='source-labeled-slot').length,secondaryDocumentBindingsHeld:capture.bindings.documentBindings.length}};
 source.digest=sourceBrowseDigest(source);return source;
}

export function validateSourceBrowse(source) {
 if(!source||source.kind!=='authored-source-browse'||source.digest!==sourceBrowseDigest(source))throw new Error('Source browsing approval does not match its exact payload.');
 const ids=new Set(),keys=new Set();
 for(const row of source.rows){if(keys.has(row.wordKey)||!row.sourceBrowse||row.runtimeId||row.lessonIds)throw new Error('Invalid source browse identity or eligibility.');keys.add(row.wordKey);for(const entry of row.sourceEntries){if(ids.has(entry.sourceId)||entry.sourceId==='mf-000647')throw new Error('Duplicate or empty source browse record.');ids.add(entry.sourceId);}}
 if(ids.size!==source.counts.visibleSourceRecords||keys.size!==source.counts.rows)throw new Error('Source browsing conservation mismatch.');
}
