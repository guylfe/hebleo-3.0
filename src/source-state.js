import {copy,sha256,safeID,fail,equal} from './source-utils.js';
import {validateMapping,rowFields,sourceRowIDs} from './source-mapping.js';
import {validateRegistration,validateCapture} from './google-source.js';
import {validateSourceOwnership,validateSourceTargets,registrationForCapture} from './source-invariants.js';
export const emptySourceState=()=>({version:1,sources:{},captures:{},bundles:{},revisions:{},draftBinding:null,authorBundle:null,operations:{}});
const hashRE=/^[a-f0-9]{64}$/;
const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
function noSecrets(value){
 if(value&&typeof value==='object')for(const [key,child]of Object.entries(value)){
  if(['accessToken','refreshToken','approvalKey','clientSecret','clientJSON','access_token','refresh_token','client_secret','authorization','cookie'].includes(key))fail('SOURCE_BACKUP_SECRET','Credential fields cannot enter source state/export.');
  noSecrets(child);
 }
}
export function validateSourceState(state,revisionContents,draft,activeContent){
 if(state==null)return null;noSecrets(state);
 if(state.version!==1||!['sources','captures','bundles','revisions','operations'].every(key=>object(state[key])))fail('SOURCE_BACKUP_INVALID','Malformed source state.');
 if(Object.keys(state.sources).length>10||Object.keys(state.captures).length>1000||Object.keys(state.bundles).length>1000)fail('SOURCE_BACKUP_INVALID','Source history exceeds the bounded local limit.');
 // Validate every raw capture, including inert historical snapshots.
 for(const [hash,capture]of Object.entries(state.captures)){
  if(!hashRE.test(hash)||capture?.capturePayloadSha256!==hash)fail('SOURCE_BACKUP_INVALID','Invalid capture index.');
  try{validateCapture(capture,{sourceId:'retained-capture',connectionSlot:'retained-readonly',expectedAccount:capture.account,spreadsheetId:capture.spreadsheetId,sheetId:capture.sheetId,extent:capture.extent,gridExtent:capture.gridExtent,headers:capture.headers,headerSha256:sha256(capture.headers)});}
  catch(error){fail('SOURCE_BACKUP_INVALID','Invalid retained capture: '+error.message,{causeCode:error.code});}
 }
 const checkSources=sources=>{
  if(!object(sources))fail('SOURCE_BACKUP_INVALID','Malformed source collection.');
  for(const [id,source]of Object.entries(sources)){
   if(!source||!safeID(id)||source.registration?.sourceId!==id||!Array.isArray(source.identity)||!source.mapping)fail('SOURCE_BACKUP_INVALID','Malformed source mapping or identity history.');
   validateRegistration(source.registration);
   const baselineCapture=state.captures[source.baseline?.captureSha256];
   // A newer registration may retain its previously confirmed mapping schema.
   const mappingRegistration=source.mapping.columns?.some(c=>c.header!==source.registration.headers[c.columnIndex])&&baselineCapture?registrationForCapture(source.registration,baselineCapture):source.registration;
   validateMapping(source.mapping,mappingRegistration,null);
   if(source.registryRevision!=='registry-'+sha256(source.registration)||source.mappingRevision!=='mapping-'+sha256(source.mapping)||source.identityRevision!=='identity-'+sha256(source.identity))fail('SOURCE_BACKUP_INVALID','Source configuration, mapping or identity digest disagrees.');
   if(source.baseline){
    if(!baselineCapture||!object(source.baseline.remoteFields)||sha256(source.baseline)!==source.baselineSha256)fail('SOURCE_BACKUP_INVALID','Missing retained capture or invalid baseline digest.');
    validateCapture(baselineCapture,registrationForCapture(source.registration,baselineCapture));
    if(source.mapping.columns.some(c=>!['sourceForm','id'].includes(c.target))&&source.identity.some(e=>e.objectId&&!Object.hasOwn(source.baseline.remoteFields,e.entryId)))fail('SOURCE_BACKUP_INVALID','Missing remote baseline fields for a canonical source entry.');
    for(const [entryId,fields]of Object.entries(source.baseline.remoteFields)){
     const entry=source.identity.find(e=>e.entryId===entryId&&e.objectId);
     try{if(!entry||!equal(fields,rowFields(baselineCapture,source.mapping,entry.rowIndex)))fail('SOURCE_BACKUP_INVALID','Remote baseline does not equal its retained mapped source cells.');}
     catch(error){if(error.code==='SOURCE_BACKUP_INVALID')throw error;fail('SOURCE_BACKUP_INVALID','Invalid retained field baseline.');}
    }
   }
   if(source.identityCaptureSha256){
    const capture=state.captures[source.identityCaptureSha256];if(!capture)fail('SOURCE_BACKUP_INVALID','Missing capture backing confirmed identity locators.');
    const idColumn=source.mapping.columns.find(c=>c.target==='id');
    if(idColumn){const checked=sourceRowIDs(capture,registrationForCapture(source.registration,capture),source.mapping);if(checked.errors.length||source.identity.some(e=>e.sourceRowId!==checked.ids.get(e.rowIndex)))fail('SOURCE_BACKUP_INVALID','Confirmed source ID disagrees with its frozen plain-text cell or sort range.');}
    for(const entry of source.identity)if(!capture.cells[entry.rowIndex]||sha256(capture.cells[entry.rowIndex])!==entry.rowSha256)fail('SOURCE_BACKUP_INVALID','Confirmed identity row hash disagrees with its frozen capture.');
   }else if(source.identity.length)fail('SOURCE_BACKUP_INVALID','Confirmed identities have no retained capture.');
  }
  validateSourceOwnership(sources);
 };
 try{
  checkSources(state.sources);
  if(Object.keys(state.sources).length)validateSourceTargets(state.sources,draft?.content||activeContent,state.captures);
  for(const [hash,bundle]of Object.entries(state.bundles)){
   if(!hashRE.test(hash)||sha256(bundle)!==hash||bundle.version!==1||!hashRE.test(bundle.contentSha256)||!object(bundle.sources))fail('SOURCE_BACKUP_INVALID','Missing or tampered source bundle.');
   checkSources(bundle.sources);
   const content=[...revisionContents.values(),draft?.content].find(c=>c&&sha256(c)===bundle.contentSha256);
   // Unreferenced superseded draft bundles are inert audit data. Current and
   // reachable bundles additionally validate against their carried content.
   if(content)validateSourceTargets(bundle.sources,content,state.captures);
  }
 }catch(error){
  if(error.code?.startsWith('SOURCE_BACKUP'))throw error;
  fail('SOURCE_BACKUP_INVALID','Invalid retained source relationship: '+error.message,{causeCode:error.code});
 }
 for(const [id,hash]of Object.entries(state.revisions)){
  const bundle=state.bundles[hash],content=revisionContents.get(Number(id));
  if(!bundle||!content||sha256(content)!==bundle.contentSha256)fail('SOURCE_BACKUP_INVALID','Source/content revision binding disagrees.');
 }
 if(state.draftBinding){
  const bundle=state.bundles[state.draftBinding.bundleSha256];
  if(!draft||!bundle||sha256(draft.content)!==bundle.contentSha256)fail('SOURCE_BACKUP_INVALID','Source/draft binding disagrees.');
 }
 if(state.authorBundle&&!state.bundles[state.authorBundle])fail('SOURCE_BACKUP_INVALID','Missing author-state bundle.');
 return copy(state);
}
