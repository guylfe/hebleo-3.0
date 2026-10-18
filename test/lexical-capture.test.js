import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {adaptConsolidatedWorkbook,HANDOFF_SLOT_MAP,WORKBOOK_CAPTURE_VERSION} from '../src/lexical-adapter.js';
import {Store} from '../src/store.js';
import {createServer} from '../src/server.js';

// Nonlinguistic disposable capture. It carries no source or linguistic approval.
const wordKey='synthetic-capture-verb',heldKey='synthetic-held-identity',sourceId='mf-900001',heldSource='mf-900003';
const cell=v=>({userEnteredValue:typeof v==='boolean'?{boolValue:v}:typeof v==='number'?{numberValue:v}:{stringValue:v}});
const row=values=>values.map(cell);
const table=(name,values=[])=>({name,headers:[],rows:values.map(row)});
function fixture(){
 const headers=['Ordinals','Lesson','Part','Type','No_Vocab','No_Card','Hebrew','English','Notes','Gender','Plural','Root','Pattern','Feminine','Plural Feminine','Audio','Pl. Audio','Fem. Audio','Pl.Fem. Audio','Infinitive','I','he','she','אתה','את','אתם','אתן','הם','הן','אנחנו','ID'];
 const record=(id,type)=>({row:id===sourceId?2:id===heldSource?4:3,values:headers.map(h=>h==='ID'?id:h==='Type'?type:h==='Hebrew'?'SYNTHETIC SOURCE':h==='English'?'Synthetic fixture':h==='No_Vocab'?null:'')});
 const primary=[wordKey,'','Synthetic fixture','','','','','Synthetic note',sourceId];
 const tables=[table('Verbs',[primary]),table('Adjectives'),table('Prepositions'),
  table('Source Map',[["source-entry","synthetic","Masterfile",sourceId,wordKey],["source-entry","synthetic","Masterfile","mf-900002","mf-900002"],["source-entry","synthetic","Masterfile",heldSource,heldKey],["word","synthetic","old-words","retired-synthetic-word",heldKey]]),
  table('Form References',[["synthetic-form",sourceId,"Hebrew",wordKey,"past.3ms","binding-1"],["synthetic-held-form",heldSource,"Hebrew",heldKey,"",""]]),
  table('Word Introductions',[["synthetic-link",wordKey,"legacy-association","1.4","","",1,sourceId],["synthetic-held-link",heldKey,"legacy-association","1.4","","",1,heldSource]]),
  table('Draft Forms'),table('Identity Review',[[heldKey,'Synthetic held identity',heldSource]])];
 return {version:WORKBOOK_CAPTURE_VERSION,spreadsheetId:'synthetic-capture',sourceRecords:{sourceSpreadsheetId:'synthetic-source',headers,records:[record(sourceId,'Verb'),record('mf-900002','Other'),record(heldSource,'Adjective')]},
  plan:{version:'lexical-consolidation-v3',tables,heldKeys:[heldKey],sourceMap:[{sourceId,destinationGroupKey:wordKey,bindingIds:['binding-1']},{sourceId:heldSource,destinationGroupKey:heldKey,bindingIds:[]}],
   statusAudit:Object.keys(HANDOFF_SLOT_MAP).filter(k=>k.startsWith('verb:')).map(k=>({groupKey:wordKey,slot:k.slice(5),status:['past.3ms','infinitive'].includes(k.slice(5))?'supplied':'missing',bindingIds:k==='verb:past.3ms'?['binding-1']:k==='verb:infinitive'?['document-1']:[],draftId:null})),
   childUpdates:['Usage','Examples'].map(name=>({name,updates:[{row:2,oldParent:name==='Examples'?'mf-900002':sourceId,target:name==='Examples'?'mf-900002':wordKey,childKey:'synthetic-'+name}]}))},
  bindings:{bindings:[{bindingId:'binding-1',groupKey:wordKey,sourceId,sourceRow:2,sourceField:'Hebrew',sourceSpan:[0,16],value:'SYNTHETIC SOURCE'}],documentBindings:[{bindingId:'document-1',groupKey:wordKey,sourceId:'secondary-table-1',sourceDocument:'Synthetic secondary document.docx',sourceField:'table/1',value:'SYNTHETIC DOCUMENT',originalBinding:{teachingSegments:[{text:'SYNTHETIC DOCUMENT',sourceColors:['008000'],stress:true}]}}]},
  related:['Usage','Examples'].map(title=>({title,data:[{values:[row(['Local key','Entry ID','Text']),row(['synthetic-'+title,sourceId,'SYNTHETIC CHILD'])]}]})),
  styles:{cells:{'2:Hebrew':{cell:{formattedValue:'SYNTHETIC SOURCE',textFormatRuns:[{startIndex:0,format:{foregroundColor:'#008000'}}]}}}},sharedScopes:[]};
}
const sheet=(c,name)=>c.plan.tables.find(t=>t.name===name);
const duplicate=(items,index=0,front=false)=>items[front?'unshift':'push'](structuredClone(items[index]));
const mutations=[
 ['duplicate source appended',c=>{const d=structuredClone(c.sourceRecords.records[0]);d.values[4]=true;c.sourceRecords.records.push(d);},/sourceRecords\.records.*duplicate.*mf-900001/],
 ['duplicate source prepended',c=>{const d=structuredClone(c.sourceRecords.records[0]);d.values[4]=true;c.sourceRecords.records.unshift(d);},/sourceRecords\.records.*duplicate.*mf-900001/],
 ['identical duplicate source',c=>duplicate(c.sourceRecords.records),/sourceRecords\.records.*duplicate/],
 ['duplicate supplied binding',c=>{const d=structuredClone(c.bindings.bindings[0]);d.value='CHANGED-SAME-LEN!';c.bindings.bindings.push(d);},/bindings\.bindings.*duplicate.*binding-1/],
 ['identical duplicate binding',c=>duplicate(c.bindings.bindings),/bindings\.bindings.*duplicate/],
 ['binding identity shared across supplied and document registries',c=>{c.bindings.documentBindings[0].bindingId='binding-1';},/bindings\.documentBindings.*duplicate.*binding-1/],
 ['duplicate document binding',c=>duplicate(c.bindings.documentBindings),/bindings\.documentBindings.*duplicate.*document-1/],
 ['missing referenced source',c=>{c.sourceRecords.records.shift();},/sourceId.*missing Masterfile source record.*mf-900001/],
 ['missing supplied binding',c=>{c.bindings.bindings=[];},/bindingIds.*missing binding.*binding-1/],
 ['missing document binding',c=>{c.bindings.documentBindings=[];},/bindingIds.*missing binding.*document-1/],
 ['duplicate source mapping appended',c=>duplicate(c.plan.sourceMap),/plan\.sourceMap.*duplicate.*mf-900001/],
 ['duplicate source mapping prepended',c=>{const d=structuredClone(c.plan.sourceMap[0]);d.destinationGroupKey=heldKey;c.plan.sourceMap.unshift(d);},/plan\.sourceMap.*duplicate/],
 ['missing source-map binding',c=>{c.plan.sourceMap[0].bindingIds.push('absent-binding');},/plan\.sourceMap.*bindingIds.*missing binding.*absent-binding/],
 ['missing source-map destination',c=>{c.plan.sourceMap[0].destinationGroupKey='absent-group';},/destinationGroupKey.*missing.*absent-group/],
 ['duplicate audit semantic slot',c=>{const d=structuredClone(c.plan.statusAudit[0]);d.slot='verb.'+d.slot;c.plan.statusAudit.push(d);},/plan\.statusAudit.*duplicate/],
 ['duplicate table registry',c=>duplicate(c.plan.tables),/plan\.tables.*duplicate.*Verbs/],
 ['duplicate source header',c=>{c.sourceRecords.headers[4]=c.sourceRecords.headers[5];},/sourceRecords\.headers.*duplicate.*No_Card/],
 ['duplicate retained held alias',c=>duplicate(sheet(c,'Source Map').rows,3),/Source Map.*duplicate/],
 ['duplicate retained held form reference',c=>duplicate(sheet(c,'Form References').rows,1),/Form References.*duplicate/],
 ['missing form-reference source',c=>{sheet(c,'Form References').rows[0][1]=cell('absent-source');},/Form References.*missing Masterfile source record.*absent-source/],
 ['missing form-reference binding',c=>{sheet(c,'Form References').rows[0][5]=cell('absent-binding');},/Form References.*missing binding.*absent-binding/],
 ['missing occurrence source',c=>{sheet(c,'Word Introductions').rows[0][7]=cell('absent-source');},/Word Introductions.*missing Masterfile source record.*absent-source/],
 ['duplicate related child sheet',c=>duplicate(c.related),/related.*duplicate.*Usage/],
 ['duplicate child update registry',c=>duplicate(c.plan.childUpdates),/plan\.childUpdates.*duplicate.*Usage/],
 ['duplicate child header',c=>{c.related[0].data[0].values[0][1]=cell('Local key');},/related.*headers.*duplicate.*Local key/]
];
function sqlState(store){
 const tables=store.db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
 return {hash:createHash('sha256').update(JSON.stringify(tables.map(({name})=>({name,rows:store.db.prepare('SELECT * FROM "'+name.replaceAll('"','""')+'"').all()})))).digest('hex'),changes:store.db.prepare('SELECT total_changes() AS n').get().n};
}

test('valid capture preserves exact archive, native formatting, typed null/blank flags, secondary documents and held references',()=>{
 const capture=fixture(),before=JSON.stringify(capture),{lexical}=adaptConsolidatedWorkbook(capture),word=lexical.words.find(w=>w.wordKey===wordKey);
 assert.equal(JSON.stringify(capture),before);assert.deepEqual(lexical.archive,capture);
 assert.equal(word.sourceFields.No_Vocab.status,'agreed');assert.equal(word.sourceFields.No_Vocab.value,null);assert.equal(word.sourceFields.No_Card.value,'');
 assert.equal(word.forms.find(f=>f.slotId==='verb.past.he').variants[0].representations.pointed.runs[0].format.foregroundColor,'#008000');
 assert.equal(word.forms.find(f=>f.slotId==='verb.infinitive').variants[0].sourceBinding.sourceDocument,'Synthetic secondary document.docx');
 assert.equal(lexical.words.some(w=>w.wordKey===heldKey),false);assert.equal(lexical.formReferences.find(r=>r.referenceId==='synthetic-held-form').state,'held');
 assert.equal(lexical.retainedReferences.aliases.length,4);assert.equal(lexical.retainedReferences.occurrences.length,2);
 assert.equal(lexical.examples[0].wordKey,'mf-900002','children of retained non-paradigm words remain valid');
 assert.ok(lexical.words.every(w=>w.identityReview.status==='pending'&&w.displayReview.status==='pending'));
});

test('supplied semicolon-separated binding references retain every explicit variant without rewriting the cell',()=>{
 const capture=fixture(),second=structuredClone(capture.bindings.bindings[0]);second.bindingId='binding-2';capture.bindings.bindings.push(second);
 capture.plan.statusAudit.find(a=>a.slot==='past.3ms').bindingIds.push('binding-2');
 sheet(capture,'Form References').rows[0][5]=cell('binding-1; binding-2');
 const {lexical}=adaptConsolidatedWorkbook(capture);
 assert.deepEqual(lexical.words.find(w=>w.wordKey===wordKey).forms.find(f=>f.slotId==='verb.past.he').variants.map(v=>v.variantId),['binding-1','binding-2']);
 assert.deepEqual(lexical.archive,capture);assert.equal(lexical.formReferences[0].sourceRow[5].userEnteredValue.stringValue,'binding-1; binding-2');
});

test('legitimate typed null, blank and boolean source exclusion values are conserved without coercion',()=>{
 for(const value of [null,'',false,true,0,'false']){
  const capture=fixture();capture.sourceRecords.records[0].values[4]=value;
  const {lexical}=adaptConsolidatedWorkbook(capture);
  assert.equal(lexical.words.find(w=>w.wordKey===wordKey).sourceFields.No_Vocab.value,value);
  assert.deepEqual(lexical.archive,capture);
 }
});

for(const [name,mutate,errorPattern] of mutations)test('QA-LEX-01/02 '+name+' rejects at adapter, HTTP import and HTTP/Store Stage before any SQL write',async t=>{
 const capture=fixture(),valid=adaptConsolidatedWorkbook(capture),bad=structuredClone(capture);mutate(bad);
 assert.throws(()=>adaptConsolidatedWorkbook(bad),errorPattern);
 const s=new Store(':memory:'),server=createServer(s);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 t.after(async()=>{await new Promise(r=>server.close(r));s.close();});
 const base=s.get('active'),content=s.snapshot();content.lexical=valid.lexical;
 const staged=s.stage({baseRevisionId:base,expectedDraftToken:null,content});s.enroll('learner-demo',content.words[0].id);
 const origin='http://127.0.0.1:'+server.address().port;
 const post=(route,body)=>fetch(origin+'/api/'+route,{method:'POST',headers:{'content-type':'application/json','x-demo-user':'author-demo'},body:JSON.stringify(body)});
 const before=sqlState(s),response=await post('studio/lexical/import-preview',bad);
 assert.equal(response.status,400);assert.match((await response.json()).error,errorPattern);assert.deepEqual(sqlState(s),before,'all SQL tables and total_changes unchanged after import rejection');
 // The malformed capture cannot bypass the adapter via an otherwise valid typed envelope.
 const bypass=structuredClone(content);bypass.lexical.archive=bad;
 const input={baseRevisionId:base,expectedDraftToken:staged.draftToken,content:bypass};
 assert.throws(()=>s.stage(input),errorPattern);assert.deepEqual(sqlState(s),before,'Store stage rejected before writes');
 const stageResponse=await post('studio/draft',input);assert.equal(stageResponse.status,400);assert.match((await stageResponse.json()).error,errorPattern);assert.deepEqual(sqlState(s),before,'HTTP stage rejected before writes');
});
