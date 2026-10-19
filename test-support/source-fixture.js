import test from 'node:test';
import assert from 'node:assert/strict';
import {Store,STORE_SCHEMA_VERSION} from '../src/store.js';
import {SourceAuthoring} from '../src/source-authoring.js';
import {GoogleSourceTransport} from '../src/google-source.js';
import {sha256,copy,SourceError} from '../src/source-utils.js';
import {capturePayload} from '../src/google-source.js';
import {projectLesson} from '../public/course.js';
import {createServer} from '../src/server.js';
// Every word/form, credential and transport in this file is a labeled synthetic adversarial fixture.
export const author='author-demo';let seq=0;const op=()=>({operationId:'synthetic-operation-'+(++seq)});
export function fixture(t,{ttl=60000}={}){
 const store=new Store(':memory:');t.after(()=>store.close());let now=1000000,version='1';const r={sourceId:'synthetic-master',spreadsheetId:'synthetic_spreadsheet_id_123456',sheetId:123,connectionSlot:'synthetic-google',expectedAccount:'guylfe@gmail.com',extent:{startRow:0,endRow:3,startColumn:0,endColumn:4},gridExtent:{rowCount:3,columnCount:4},headers:['Form','English','Lesson','Part']};r.headerSha256=sha256(r.headers);
 const cell=s=>({formattedValue:s,userEnteredValue:{stringValue:s},effectiveValue:{stringValue:s}});let cells=[r.headers.map(cell),['שָׁלוֹם','Synthetic fixture','1.3','1.3.5'].map(cell),[{},{},{},{}]];cells[1][0].textFormatRuns=[{startIndex:0,format:{bold:true}}];cells[1][0].note='<script>synthetic inert</script>';
 const capture=()=>{const c={schemaVersion:1,provider:'google-rest',account:r.expectedAccount,spreadsheetId:r.spreadsheetId,sheetId:r.sheetId,title:'Synthetic transport only',extent:copy(r.extent),gridExtent:copy(r.gridExtent),properties:{defaultFormat:{textFormat:{italic:true}},spreadsheetTheme:{themeColors:[]}},merges:[],cells:copy(cells),headers:copy(r.headers),gridMetadata:[{startRow:0,startColumn:0}],receipts:[{ok:true,sheetId:r.sheetId,startRow:0,endRow:3,returnedRows:3,requestedRange:'Synthetic!A1:D3'}],preVersion:version,postVersion:version,observedAt:new Date(now).toISOString(),complete:true};c.capturePayloadSha256=sha256(capturePayload(c));return c;};
 let wait=null,offline=false;const transport={kind:'synthetic-disposable',async describeSource(){return {spreadsheetId:r.spreadsheetId,sheetId:r.sheetId,gridExtent:r.gridExtent,account:r.expectedAccount};},async captureSource(){if(offline)throw new SourceError('SOURCE_UNAVAILABLE','Synthetic outage');return capture();},async verifyFreshness(c){if(wait)await wait();if(offline)throw new SourceError('SOURCE_UNAVAILABLE','Synthetic outage');const fresh=capture();if(fresh.capturePayloadSha256!==c.capturePayloadSha256)throw new SourceError('SOURCE_CHANGED','Synthetic freshness conflict');return {checkedAt:fresh.observedAt,observedVersion:version,capturePayloadSha256:c.capturePayloadSha256};}};
 const auth={signApproval(p){return sha256(['synthetic-test-only-key',p]);},verifyApproval(p,proof){return proof===sha256(['synthetic-test-only-key',p]);},status(slot=r.connectionSlot){return {configured:true,connected:true,verified:true,connectionSlot:slot,account:r.expectedAccount,requiredScopes:[],credentialStorage:'Synthetic memory only'};}};
 const engine=new SourceAuthoring(store,{transport,auth,clock:()=>now,reviewTTL:ttl});
 const dump=()=>store.db.prepare('SELECT name FROM sqlite_master WHERE type=\'table\' ORDER BY name').all().map(({name})=>[name,store.db.prepare('SELECT * FROM '+name+' ORDER BY rowid').all()]);
 const mapping={version:1,columns:[{columnIndex:0,header:'Form',target:'pointed',owner:'source',allowBlank:false},{columnIndex:1,header:'English',target:'english',owner:'source',allowBlank:false}],membership:{sets:[]}};
 const register=()=>engine.register(author,{...op(),expectedRegistryRevision:null,registration:r});
 const review=()=>engine.refreshPreview(author,{sourceId:r.sourceId,...engine.pins(r.sourceId),content:store.currentDraft()?.content||store.snapshot(),mapping});
 const resolve=dto=>engine.resolveReview(author,{reviewId:dto.reviewId,expectedReviewSha256:dto.reviewSha256,identityMatches:[{rowIndex:1,action:'create',forms:{pointed:'שָׁלוֹם',unpointed:'שלום',curated:'שָׁלוֹם'}}]});
 const stage=dto=>engine.stageSourceReview(author,{...op(),reviewId:dto.reviewId,reviewSha256:dto.reviewSha256,...dto.pins});
 const approve=()=>{const s=engine.status(author);return engine.approveStagedSource(author,{expectedActiveRevision:s.activeRevisionId,expectedDraftToken:s.draftToken,expectedSourceBundleSha256:s.draftSourceBundleSha256,confirmation:'I approve this exact canonical content and source mapping'},{account:r.expectedAccount});};
 const publish=()=>{const s=engine.status(author);return engine.publishStagedSource(author,{...op(),expectedActiveRevision:s.activeRevisionId,expectedDraftToken:s.draftToken,expectedSourceBundleSha256:s.draftSourceBundleSha256,reason:'Synthetic approved test'});};
 return {store,engine,r,transport,auth,mapping,dump,register,review,resolve,stage,approve,publish,capture,advance(){now+=1000;version=String(Number(version)+1);},expire(){now+=ttl+1;},edit(value){cells[1][0]=cell(value);cells[1][0].textFormatRuns=[{startIndex:0,format:{bold:true}}];cells[1][0].note='<script>synthetic inert</script>';},remove(){cells[1]=[{},{},{},{}];},offline(value){offline=value;},wait(fn){wait=fn;},setCells(value){cells=value;}};
}
