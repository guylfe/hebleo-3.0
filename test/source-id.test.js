import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,author} from '../test-support/source-fixture.js';
import {Store} from '../src/store.js';
import {copy,sha256} from '../src/source-utils.js';
import {validateMapping} from '../src/source-mapping.js';
import {GoogleSourceTransport,validateIdentitySortRanges,validateRegistration} from '../src/google-source.js';
import {sourceTemplates} from '../src/source-template.js';

// All rows, words, forms, credentials, transport responses and databases below
// are disposable synthetic fixtures. No live source is registered or imported.
const forms={pointed:'שָׁלוֹם',unpointed:'שלום',curated:'שָׁלוֹם'};
const cell=value=>({userEnteredValue:{stringValue:value},effectiveValue:{stringValue:value},formattedValue:value});
function idFixture(t){
 const f=fixture(t);
 Object.assign(f.r,{spreadsheetId:sourceTemplates[0].spreadsheetId,sheetId:sourceTemplates[0].sheetId});
 f.r.headers=copy(sourceTemplates[0].headers);f.r.extent.endColumn=31;f.r.gridExtent.columnCount=31;f.r.headerSha256=sha256(f.r.headers);
 f.mapping.columns[0].columnIndex=6;f.mapping.columns[0].header='Hebrew';f.mapping.columns[1].columnIndex=7;
 f.mapping.columns.push({columnIndex:30,header:'ID',target:'id',owner:'source',allowBlank:false});
 let cells=[f.r.headers.map(cell),Array.from({length:31},()=>({})),Array.from({length:31},()=>({}))];
 for(const [i,value] of [[6,'שָׁלוֹם'],[7,'Synthetic fixture'],[1,'1.3'],[2,'1.3.5'],[30,'mf-000001']])cells[1][i]=cell(value);
 const set=value=>{cells=copy(value);f.setCells(cells);};set(cells);
 return {...f,cells:()=>copy(cells),set};
}
const fingerprint=f=>({tables:f.dump(),writes:f.store.db.prepare('SELECT total_changes() AS n').get().n});
const resolve=(f,dto,decisions)=>f.engine.resolveReview(author,{reviewId:dto.reviewId,expectedReviewSha256:dto.reviewSha256,identityMatches:decisions});

test('ID01 AE template requests every column, including plain-text ID, and retains source sort metadata',async()=>{
 const r=copy(sourceTemplates[0]);assert.equal(r.headers[30],'ID');assert.equal(r.extent.endColumn,31);assert.equal(r.headerSha256,sha256(r.headers));
 const old={...r,headers:r.headers.slice(0,30),extent:{...r.extent,endColumn:30}};old.headerSha256=sha256(old.headers);assert.throws(()=>validateRegistration(old),e=>e.code==='SCHEMA_CHANGED');
 const ranges=[],filter={range:{sheetId:r.sheetId,startRowIndex:0,endRowIndex:1059,startColumnIndex:0,endColumnIndex:31}};
 const properties={title:'Synthetic transport only'},tab={sheetId:r.sheetId,title:'Synthetic',sheetType:'GRID',gridProperties:r.gridExtent};
 const fetcher=async(input,init)=>{const u=new URL(input);assert.equal(init.method,'GET');
  if(u.hostname==='www.googleapis.com')return Response.json({id:r.spreadsheetId,mimeType:'application/vnd.google-apps.spreadsheet',version:'1'});
  const range=u.searchParams.get('ranges');if(!range){assert.match(u.searchParams.get('fields'),/basicFilter\(range\)/);return Response.json({spreadsheetId:r.spreadsheetId,properties,sheets:[{properties:tab,basicFilter:filter}]});}
  ranges.push(range);const start=Number(/!A(\d+)/.exec(range)[1])-1;
  return Response.json({spreadsheetId:r.spreadsheetId,properties,sheets:[{properties:tab,data:[{startRow:start,...(start===0?{rowData:[{values:r.headers.map(cell)}]}:{})}]}]});
 };
 const transport=new GoogleSourceTransport({auth:{getToken:async()=>({verified:true,account:r.expectedAccount,accessToken:'SYNTHETIC token'})},fetcher});
 const capture=await transport.captureSource(r);assert.equal(capture.cells.length,1059);assert.equal(capture.cells[0].length,31);
 assert.equal(ranges.length,5);assert(ranges.every(range=>range.includes(':AE')));assert.equal(capture.sortRanges[0].range.endColumnIndex,31);
});

test('ID02 identity mapping is source-owned, nonblank and mandatory for canonical ID-header imports',async t=>{
 const f=idFixture(t);await f.register();const before=fingerprint(f);
 for(const mutate of [m=>m.columns.pop(),m=>m.columns.at(-1).allowBlank=true,m=>m.columns.at(-1).owner='studio',m=>m.columns.at(-1).target='notes']){
  const mapping=copy(f.mapping);mutate(mapping);assert.throws(()=>validateMapping(mapping,f.r,f.store.snapshot()),e=>e.code==='MAPPING_INVALID');
 }
 assert.deepEqual(fingerprint(f),before);
});

test('ID03 new IDs still need human decisions; create uses the source ID without generating forms',async t=>{
 const f=idFixture(t);await f.register();const before=fingerprint(f),dto=await f.review();
 assert.equal(dto.canStage,false);assert.equal(dto.identityCandidates[0].sourceRowId,'mf-000001');
 const incomplete=resolve(f,dto,[{rowIndex:1,action:'create'}]);assert(incomplete.errors.some(e=>e.code==='CANONICAL_FORMS_REQUIRED'));assert.deepEqual(fingerprint(f),before);
 const ready=resolve(f,incomplete,[{rowIndex:1,action:'create',forms}]);assert.equal(ready.canStage,true,JSON.stringify(ready.errors));await f.stage(ready);
 const entry=f.engine.state().sources[f.r.sourceId].identity[0];assert.equal(entry.entryId,'mf-000001');assert.equal(entry.objectId,'mf-000001');assert.equal(entry.sourceRowId,'mf-000001');
 assert.equal(f.store.currentDraft().content.words.at(-1).id,'mf-000001');assert.equal(f.engine.state().sources[f.r.sourceId].baseline.remoteFields['mf-000001'].id,undefined);
});

test('ID04 row move and content edit reuse immutable identity, retain learner state, and repeat refresh is zero-write',async t=>{
 const f=idFixture(t);await f.register();await f.stage(f.resolve(await f.review()));
 const learner=f.store.learner('learner-demo');learner.notes['mf-000001']='Synthetic private note';learner.bookmarks.push('mf-000001');learner.cards['mf-000001']={due:new Date().toISOString(),intervalDays:3,repetitions:2,suspended:false};f.store.saveLearner('learner-demo',learner);
 const beforeLearner=f.store.learner('learner-demo'),cells=f.cells();cells[2]=cells[1];cells[1]=Array.from({length:31},()=>({}));cells[2][7]=cell('Synthetic edited meaning');f.set(cells);f.advance();
 const dto=await f.review();assert.equal(dto.canStage,true,JSON.stringify(dto.errors));assert.equal(dto.identityCandidates[0].status,'confirmed');assert.equal(dto.identityCandidates[0].candidates[0].oldRowIndex,1);await f.stage(dto);
 const source=f.engine.state().sources[f.r.sourceId];assert.equal(source.identity[0].rowIndex,2);assert.equal(source.identity[0].objectId,'mf-000001');assert.equal(f.store.currentDraft().content.words.at(-1).english,'Synthetic edited meaning');assert.deepEqual(f.store.learner('learner-demo'),beforeLearner);
 const before=fingerprint(f),repeat=await f.review();assert.equal(repeat.status,'no_op');await f.stage(repeat);assert.deepEqual(fingerprint(f),before);
});

test('ID05 identical source content with distinct IDs remains two separate explicitly reviewed entries',async t=>{
 const f=idFixture(t),cells=f.cells();cells[2]=copy(cells[1]);cells[2][30]=cell('mf-000002');f.set(cells);await f.register();
 const dto=resolve(f,await f.review(),[{rowIndex:1,action:'create',forms},{rowIndex:2,action:'create',forms}]);assert.equal(dto.canStage,true,JSON.stringify(dto.errors));await f.stage(dto);
 assert.deepEqual(f.engine.state().sources[f.r.sourceId].identity.map(e=>e.objectId),['mf-000001','mf-000002']);
});

test('ID06 blank, numeric, formula, unsafe and malformed Masterfile IDs block Stage without any writes',async t=>{
 for(const value of [{},{numberValue:1},{formulaValue:'="mf-000001"'},{stringValue:'__proto__'},{stringValue:'mf-1'},{stringValue:'mf-000001 '}]){
  const f=idFixture(t),cells=f.cells();cells[1][30]={formattedValue:'mf-000001',effectiveValue:{stringValue:'mf-000001'},userEnteredValue:value};f.set(cells);await f.register();const before=fingerprint(f);
  const dto=f.resolve(await f.review());assert(dto.errors.some(e=>e.code==='SOURCE_ID_INVALID'));await assert.rejects(f.stage(dto),e=>e.code==='REVIEW_BLOCKED');assert.deepEqual(fingerprint(f),before);
 }
});

test('ID07 duplicate IDs block even when the duplicate is explicitly ignored; all raw rows remain visible',async t=>{
 const f=idFixture(t),cells=f.cells();cells[2]=copy(cells[1]);f.set(cells);await f.register();const before=fingerprint(f);
 const dto=resolve(f,await f.review(),[{rowIndex:1,action:'create',forms},{rowIndex:2,action:'ignore'}]);assert.equal(dto.rows.length,2);assert(dto.errors.some(e=>e.code==='SOURCE_ID_DUPLICATE'));await assert.rejects(f.stage(dto),e=>e.code==='REVIEW_BLOCKED');assert.deepEqual(fingerprint(f),before);
});

test('ID08 an edited ID is a new entry plus a missing old identity, never an automatic rename',async t=>{
 const f=idFixture(t);await f.register();await f.stage(f.resolve(await f.review()));const prior=f.engine.state().sources[f.r.sourceId].identity[0],cells=f.cells();cells[1][30]=cell('mf-000003');f.set(cells);
 let dto=await f.review();assert(dto.errors.some(e=>e.code==='IDENTITY_REVIEW_REQUIRED'));assert(dto.errors.some(e=>e.code==='MISSING_IDENTITY_REVIEW'));assert.equal(dto.identityCandidates[0].candidates.length,0);
 const before=fingerprint(f);dto=resolve(f,dto,[{rowIndex:1,action:'reuse',entryId:prior.entryId,objectId:prior.objectId}]);assert(dto.errors.some(e=>e.code==='IDENTITY_INVALID'));await assert.rejects(f.stage(dto),e=>e.code==='REVIEW_BLOCKED');assert.deepEqual(fingerprint(f),before);
 dto=resolve(f,dto,[{rowIndex:1,action:'create',forms},{rowIndex:-1-prior.rowIndex,action:'detach',entryId:prior.entryId,objectId:prior.objectId}]);assert.equal(dto.canStage,true,JSON.stringify(dto.errors));await f.stage(dto);
 assert(f.store.currentDraft().content.words.some(w=>w.id==='mf-000001'));assert(f.store.currentDraft().content.words.some(w=>w.id==='mf-000003'));
});

test('ID09 explicit first reuse preserves the existing canonical ID and private learner state through refresh',async t=>{
 const f=idFixture(t),word=f.store.snapshot().words[0],cells=f.cells();cells[1][6]=cell(word.pointed);cells[1][7]=cell(word.english);f.set(cells);const state=f.store.learner('learner-demo');state.notes[word.id]='Synthetic retained private note';f.store.saveLearner('learner-demo',state);
 await f.register();let dto=resolve(f,await f.review(),[{rowIndex:1,action:'reuse',objectId:word.id}]);assert.equal(dto.canStage,true,JSON.stringify(dto.errors));await f.stage(dto);
 assert.equal(f.store.currentDraft().content.words.length,f.store.snapshot().words.length);assert.equal(f.engine.state().sources[f.r.sourceId].identity[0].objectId,word.id);
 cells[2]=cells[1];cells[1]=Array.from({length:31},()=>({}));f.set(cells);dto=await f.review();assert.equal(dto.canStage,true,JSON.stringify(dto.errors));await f.stage(dto);assert.deepEqual(f.store.learner('learner-demo'),state);
 const prior=f.engine.state().sources[f.r.sourceId].identity[0],before=fingerprint(f);dto=resolve(f,await f.review(),[{rowIndex:2,action:'reuse',entryId:prior.entryId,objectId:f.store.snapshot().words[1].id}]);assert(dto.errors.some(e=>e.code==='IDENTITY_INVALID'));assert.deepEqual(fingerprint(f),before);
});

test('ID10 an existing canonical ID collision requires explicit reuse and ID cannot be resolved as a field',async t=>{
 const f=idFixture(t);await f.register();const content=f.store.snapshot();content.words.push({...copy(content.words[0]),id:'mf-000001'});
 let dto=await f.engine.refreshPreview(author,{sourceId:f.r.sourceId,...f.engine.pins(f.r.sourceId),content,mapping:f.mapping});dto=resolve(f,dto,[{rowIndex:1,action:'create',forms}]);assert(dto.errors.some(e=>e.code==='IDENTITY_COLLISION'));
 assert.throws(()=>f.engine.resolveReview(author,{reviewId:dto.reviewId,expectedReviewSha256:dto.reviewSha256,fieldResolutions:[{entryId:'mf-000001',target:'id',choice:'authored',value:'mf-000002'}]}),e=>e.code==='RESOLUTION_INVALID');
});

test('ID11 source-only inspection retains rows lacking Hebrew and ID-only mapping never creates canonical words',async t=>{
 const f=idFixture(t),cells=f.cells();cells[1][6]={};f.set(cells);await f.register();
 const mapping={version:1,columns:[{columnIndex:6,header:'Hebrew',target:'sourceForm',owner:'source',allowBlank:true},copy(f.mapping.columns.at(-1))],membership:{sets:[]}},before=f.store.snapshot();
 const dto=await f.engine.refreshPreview(author,{sourceId:f.r.sourceId,...f.engine.pins(f.r.sourceId),content:before,mapping});assert.equal(dto.rows.length,1);assert.equal(dto.rows[0].sourceRowId,'mf-000001');assert(dto.warnings.some(e=>e.code==='SOURCE_FORM_MISSING'));assert.equal(dto.canStage,true);await f.stage(dto);assert.deepEqual(f.store.snapshot(),before);assert.equal(f.store.currentDraft(),null);
 const idOnly=await f.engine.refreshPreview(author,{sourceId:f.r.sourceId,...f.engine.pins(f.r.sourceId),content:before,mapping:{...mapping,columns:[copy(f.mapping.columns.at(-1))]}});assert.equal(idOnly.identityCandidates.length,0);assert.equal(idOnly.changedContent,false);
});

test('ID12 filter, filter view and table ranges excluding AE fail registration or review without writes',async t=>{
 const f=idFixture(t),badRange={sheetId:f.r.sheetId,startRowIndex:0,endRowIndex:3,startColumnIndex:0,endColumnIndex:30};
 for(const kind of ['basicFilter','filterView','table'])assert.throws(()=>validateIdentitySortRanges(f.r,[{kind,range:badRange}]),e=>e.code==='SOURCE_ID_SORT_RANGE');
 const describe=f.transport.describeSource;f.transport.describeSource=async()=>({...await describe(),sortRanges:[{kind:'basicFilter',range:badRange}]});const before=fingerprint(f);await assert.rejects(f.register(),e=>e.code==='SOURCE_ID_SORT_RANGE');assert.deepEqual(fingerprint(f),before);
 f.transport.describeSource=describe;await f.register();const capture=f.transport.captureSource;f.transport.captureSource=async()=>{const c=await capture();c.sortRanges=[{kind:'basicFilter',range:badRange}];c.capturePayloadSha256=sha256((await import('../src/google-source.js')).capturePayload(c));return c;};
 const dto=f.resolve(await f.review());assert(dto.errors.some(e=>e.code==='SOURCE_ID_SORT_RANGE'));const registered=fingerprint(f);await assert.rejects(f.stage(dto),e=>e.code==='REVIEW_BLOCKED');assert.deepEqual(fingerprint(f),registered);
});

test('ID13 pending-draft backup retains source IDs and rejects identity tampering before restore writes',async t=>{
 const f=idFixture(t);await f.register();await f.stage(f.resolve(await f.review()));const backup=f.store.backup(),dest=new Store(':memory:');t.after(()=>dest.close());dest.restore(backup);
 assert.equal(dest.get('source-state').sources[f.r.sourceId].identity[0].sourceRowId,'mf-000001');assert.equal(dest.currentDraft().content.words.at(-1).id,'mf-000001');
 const broken=copy(backup),source=broken.sourceAuthoring.sources[f.r.sourceId];source.identity[0].sourceRowId='mf-000007';source.identityRevision='identity-'+sha256(source.identity);
 const dump=()=>({tables:dest.db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(({name})=>[name,dest.db.prepare('SELECT * FROM '+name+' ORDER BY rowid').all()]),writes:dest.db.prepare('SELECT total_changes() AS n').get().n});const before=dump();assert.throws(()=>dest.restore(broken),e=>e.code==='SOURCE_BACKUP_INVALID');assert.deepEqual(dump(),before);
});


test('ID14 retired source IDs cannot be recycled into new vocabulary and attach old learner progress',async t=>{
 const f=idFixture(t);await f.register();await f.stage(f.resolve(await f.review()));const prior=f.engine.state().sources[f.r.sourceId].identity[0],original=f.cells();
 const removed=f.cells();removed[1]=Array.from({length:31},()=>({}));f.set(removed);let dto=resolve(f,await f.review(),[{rowIndex:-1-prior.rowIndex,action:'tombstone',entryId:prior.entryId,objectId:prior.objectId}]);assert.equal(dto.canStage,true,JSON.stringify(dto.errors));await f.stage(dto);
 assert(!f.store.currentDraft().content.words.some(w=>w.id==='mf-000001'));f.set(original);const before=fingerprint(f);dto=f.resolve(await f.review());assert(dto.errors.some(e=>e.code==='SOURCE_ID_RETIRED'));await assert.rejects(f.stage(dto),e=>e.code==='REVIEW_BLOCKED');assert.deepEqual(fingerprint(f),before);
});
