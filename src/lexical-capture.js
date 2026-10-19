import {DomainError} from './errors.js';

export const WORKBOOK_CAPTURE_VERSION='hebleo-consolidated-capture-v1';
const cellValue=cell=>cell?.userEnteredValue?.stringValue??cell?.userEnteredValue?.numberValue??cell?.userEnteredValue?.boolValue??cell?.stringValue??'';
const list=value=>String(value??'').split(',').map(s=>s.trim()).filter(Boolean);
// The supplied Form References column uses semicolons for multiple binding IDs.
const bindingList=value=>String(value??'').split(/[;,]/).map(s=>s.trim()).filter(Boolean);
const fail=(at,message)=>{throw new DomainError('Invalid consolidated capture at '+at+': '+message,400,'LEXICAL_CAPTURE_INVALID');};
const array=(value,at)=>{if(!Array.isArray(value))fail(at,'expected an array');return value;};
const identity=(value,at)=>{if(typeof value!=='string'||!value.trim())fail(at,'expected a nonblank identity');return value;};
// Check before insertion; even byte-identical duplicates are ambiguous identities.
function index(items,key,at){
 const result=new Map(),locations=new Map();
 items.forEach((item,i)=>{const location=at+'['+i+']';let raw;try{raw=key(item);}catch{fail(location,'missing registry identity');}const id=identity(raw,location);if(result.has(id))fail(location,'duplicate identity '+JSON.stringify(id)+'; first declared at '+locations.get(id));result.set(id,item);locations.set(id,location);});
 return result;
}
const reference=(registry,id,at,kind)=>{identity(id,at);if(!registry.has(id))fail(at,'missing '+kind+' '+JSON.stringify(id));};

// Capture v1 has one Masterfile registry and one binding registry shared by its
// supplied and secondary-document arrays. This validates evidence, not language,
// approval, source freshness, or course placement, and never normalizes source data.
export function validateConsolidatedCapture(capture){
 if(capture?.version!==WORKBOOK_CAPTURE_VERSION)fail('version','unsupported consolidated workbook capture');
 const {plan,sourceRecords,bindings}=capture;
 if(plan?.version!=='lexical-consolidation-v3')fail('plan.version','unsupported consolidation plan');
 identity(sourceRecords?.sourceSpreadsheetId,'sourceRecords.sourceSpreadsheetId');
 const headers=array(sourceRecords?.headers,'sourceRecords.headers');
 const headerIndex=index(headers,h=>h,'sourceRecords.headers');
 if(headers[30]!=='ID')fail('sourceRecords.headers[30]','Masterfile AE must be the ID column');
 for(const field of ['Type','Hebrew','English','Notes','Gender','Plural','Root','Pattern','Audio','Pl. Audio','Fem. Audio','Pl.Fem. Audio','No_Vocab','No_Card'])reference(headerIndex,field,'sourceRecords.headers', 'source column');
 const sourceRows=array(sourceRecords?.records,'sourceRecords.records');
 sourceRows.forEach((r,i)=>{if(!Array.isArray(r?.values)||r.values.length!==headers.length)fail('sourceRecords.records['+i+'].values','expected one explicit value per source column (null and blank are allowed)');});
 const sources=index(sourceRows,r=>r.values[30],'sourceRecords.records');
 const tables=index(array(plan.tables,'plan.tables'),t=>t?.name,'plan.tables');
 for(const name of ['Verbs','Adjectives','Prepositions','Source Map','Form References','Word Introductions','Draft Forms','Identity Review'])reference(tables,name,'plan.tables','table');
 const rows=name=>array(tables.get(name)?.rows,'plan.tables['+JSON.stringify(name)+'].rows');
 const held=index(array(plan.heldKeys,'plan.heldKeys'),key=>key,'plan.heldKeys');
 const active=new Map();
 for(const [name,category] of [['Verbs','verb'],['Adjectives','adjective'],['Prepositions','preposition']])rows(name).forEach((row,i)=>{
  const at='plan.tables['+JSON.stringify(name)+'].rows['+i+']',key=identity(cellValue(row?.[0]),at+'[0]');
  if(active.has(key)||held.has(key))fail(at+'[0]','duplicate or held active lexical identity '+JSON.stringify(key));
  active.set(key,{category,sourceIds:list(cellValue(row[8])),at});
 });
 const groups=new Set([...active.keys(),...held.keys()]);
 const allBindings=new Map(),bindingLocations=new Map();
 for(const name of ['bindings','documentBindings'])array(bindings?.[name],'bindings.'+name).forEach((b,i)=>{
  const at='bindings.'+name+'['+i+']',id=identity(b?.bindingId,at+'.bindingId');
  if(allBindings.has(id))fail(at+'.bindingId','duplicate binding identity '+JSON.stringify(id)+'; first declared at '+bindingLocations.get(id));
  allBindings.set(id,b);bindingLocations.set(id,at);
  if(typeof b.value!=='string')fail(at+'.value','expected exact supplied text');
  if(name==='bindings')reference(sources,b.sourceId,at+'.sourceId','Masterfile source record');
  else identity(b.sourceDocument,at+'.sourceDocument'); // Explicit secondary source; not a Masterfile ID.
  if(b.groupKey!==undefined)reference(groups,b.groupKey,at+'.groupKey','active or held lexical group');
 });
 const bindingRefs=(ids,at)=>array(ids,at).forEach((id,i)=>reference(allBindings,id,at+'['+i+']','binding'));
 const sourceMapRows=array(plan.sourceMap,'plan.sourceMap');
 const sourceTargets=index(sourceMapRows,m=>m?.sourceId,'plan.sourceMap');
 sourceMapRows.forEach((m,i)=>{
  const at='plan.sourceMap['+i+']';reference(sources,m.sourceId,at+'.sourceId','Masterfile source record');reference(groups,m.destinationGroupKey,at+'.destinationGroupKey','active or held lexical group');bindingRefs(m.bindingIds||[],at+'.bindingIds');
 });
 for(const [key,group] of active)for(const [i,id] of group.sourceIds.entries()){
  const at=group.at+'[8] sourceIds['+i+']';reference(sources,id,at,'Masterfile source record');reference(sourceTargets,id,at,'source mapping');
  if(sourceTargets.get(id).destinationGroupKey!==key)fail(at,'source mapping targets a different lexical group for '+JSON.stringify(id));
 }
 const activeWords=new Set([...active.keys(),...[...sources.keys()].filter(id=>!sourceTargets.has(id))]);
 const auditRows=array(plan.statusAudit,'plan.statusAudit');
 const auditKey=a=>{const category=active.get(a?.groupKey)?.category;return JSON.stringify([a?.groupKey,category&&typeof a?.slot==='string'?a.slot.replace(new RegExp('^'+category+'\\.'),''):a?.slot]);};
 index(auditRows,auditKey,'plan.statusAudit');
 const drafts=index(rows('Draft Forms'),row=>cellValue(row[0]),'plan.tables["Draft Forms"].rows');
 auditRows.forEach((a,i)=>{const at='plan.statusAudit['+i+']';reference(groups,a?.groupKey,at+'.groupKey','active or held lexical group');identity(a.slot,at+'.slot');bindingRefs(a.bindingIds||[],at+'.bindingIds');if(a.draftId!==null&&a.draftId!==undefined)reference(drafts,a.draftId,at+'.draftId','draft proposal');});
 const targets=new Set([...groups,...sources.keys()]);
 const aliasRows=rows('Source Map');
 index(aliasRows,row=>JSON.stringify(row.slice(0,4).map(cellValue)),'plan.tables["Source Map"].rows');
 aliasRows.forEach((row,i)=>{const at='plan.tables["Source Map"].rows['+i+']';if(cellValue(row[0])==='source-entry')reference(sources,cellValue(row[3]),at+'[3]','Masterfile source record');reference(targets,cellValue(row[4]),at+'[4]','active, held, or retained source target');});
 const formRows=rows('Form References');
 index(formRows,row=>cellValue(row[0]),'plan.tables["Form References"].rows');
 formRows.forEach((row,i)=>{const at='plan.tables["Form References"].rows['+i+']';reference(sources,cellValue(row[1]),at+'[1]','Masterfile source record');reference(targets,cellValue(row[3]),at+'[3]','active, held, or retained source target');bindingRefs(bindingList(cellValue(row[5])),at+'[5]');});
 const occurrenceRows=rows('Word Introductions');
 index(occurrenceRows,row=>cellValue(row[0]),'plan.tables["Word Introductions"].rows');
 occurrenceRows.forEach((row,i)=>{const at='plan.tables["Word Introductions"].rows['+i+']';reference(targets,cellValue(row[1]),at+'[1]','active, held, or retained source target');reference(sources,cellValue(row[7]),at+'[7]','Masterfile source record');});
 const identityRows=rows('Identity Review');
 index(identityRows,row=>cellValue(row[0]),'plan.tables["Identity Review"].rows');
 identityRows.forEach((row,i)=>{const at='plan.tables["Identity Review"].rows['+i+']';reference(held,cellValue(row[0]),at+'[0]','held lexical identity');for(const id of list(cellValue(row[2])))reference(sources,id,at+'[2]','Masterfile source record');});
 const related=index(array(capture.related,'related'),sheet=>sheet?.title,'related');
 const updates=index(array(plan.childUpdates,'plan.childUpdates'),child=>child?.name,'plan.childUpdates');
 for(const name of ['Usage','Examples']){
  reference(related,name,'related','child sheet');reference(updates,name,'plan.childUpdates','child update set');
  const data=related.get(name).data;
  const cells=array(data,'related['+JSON.stringify(name)+'].data').flatMap(d=>array(d.values,'related['+JSON.stringify(name)+'].data.values'));
  index(array(cells[0],'related['+JSON.stringify(name)+'].headers').map(cellValue),h=>h,'related['+JSON.stringify(name)+'].headers');
  const children=array(updates.get(name).updates,'plan.childUpdates['+JSON.stringify(name)+'].updates');
  index(children,child=>child?.childKey,'plan.childUpdates['+JSON.stringify(name)+'].updates');
  children.forEach((child,i)=>{const at='plan.childUpdates['+JSON.stringify(name)+'].updates['+i+']';if(!Number.isInteger(child.row)||child.row<2||!cells[child.row-1])fail(at+'.row','missing child source row '+JSON.stringify(child.row));reference(activeWords,child.target,at+'.target','active child parent');if(child.oldParent!==undefined)reference(sources,child.oldParent,at+'.oldParent','Masterfile source record');});
 }
 // All maps returned here were built with duplicate checks before every insertion.
 return {byBinding:allBindings,sources,headerIndex:new Map(headers.map((h,i)=>[h,i])),sourceTargets:new Map(sourceMapRows.map(m=>[m.sourceId,m.destinationGroupKey])),held:new Set(held.keys())};
}
