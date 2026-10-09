import {createHash,randomUUID} from 'node:crypto';
import {readFileSync,realpathSync,statSync,existsSync} from 'node:fs';
import {resolve,relative,isAbsolute,extname} from 'node:path';
import {DomainError} from './errors.js';
import {safeID,copy,sha256,equal} from './source-utils.js';

export const MEDIA_LIMITS={fileBytes:20_000_000,backupBytes:50_000_000,assets:1000};
export const MEDIA_TYPES={'.mp3':'audio/mpeg','.wav':'audio/wav','.ogg':'audio/ogg','.m4a':'audio/mp4','.mp4':'video/mp4','.webm':'video/webm','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.pdf':'application/pdf'};
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=(code,message,status=409)=>{throw new DomainError(message,status,code);};
const hashRE=/^[a-f0-9]{64}$/;
const kindFor=mime=>mime.startsWith('audio/')?'audio':mime.startsWith('video/')?'video':mime.startsWith('image/')?'image':'document';
const managedURL=(hash,mime)=>'/media/blobs/'+hash+Object.keys(MEDIA_TYPES).find(extension=>MEDIA_TYPES[extension]===mime);
const plainObject=value=>value&&typeof value==='object'&&!Array.isArray(value)&&[Object.prototype,null].includes(Object.getPrototypeOf(value));
const resultFor=(asset,revision)=>({assetId:asset.assetId,revisionId:revision.revisionId,sha256:revision.sha256,url:revision.url,byteLength:revision.byteLength,mimeType:revision.mimeType,kind:asset.kind,provenance:revision.provenance,approval:revision.approval});
function validateLibrary(state,blobFor,requireAuthor){
 if(state?.version!==1||!Array.isArray(state.assets)||state.assets.length>MEDIA_LIMITS.assets||!plainObject(state.operations))fail('MEDIA_BACKUP_INVALID','Invalid reusable media state.');
 const assets=new Map(),revisions=new Map();
 for(const asset of state.assets){
  if(!safeID(asset.assetId)||assets.has(asset.assetId)||typeof asset.title!=='string'||!asset.title.trim()||asset.title.length>300||!['audio','video','image','document'].includes(asset.kind)||!Array.isArray(asset.revisions)||!asset.revisions.length)fail('MEDIA_BACKUP_INVALID','Invalid stable media asset history.');
  assets.set(asset.assetId,asset);
  for(const rev of asset.revisions){
   const bytes=blobFor(rev.sha256);
   if(!safeID(rev.revisionId)||revisions.has(rev.revisionId)||!bytes||rev.byteLength!==bytes.byteLength||rev.mimeType!==bytes.mimeType||asset.kind!==kindFor(bytes.mimeType)||rev.url!==managedURL(rev.sha256,bytes.mimeType)||!['human-authored','verified-source','synthetic-demo'].includes(rev.provenance?.kind)||typeof rev.provenance?.label!=='string'||!rev.provenance.label.trim()||rev.approval?.version!==1||rev.approval.status!=='pending')fail('MEDIA_BACKUP_INVALID','Media revision history is unreachable or inconsistent.');
   revisions.set(rev.revisionId,{asset,revision:rev});
  }
 }
 for(const [key,receipt]of Object.entries(state.operations)){
  const ids=key.split('/'),pair=revisions.get(receipt?.result?.revisionId);
  if(ids.length!==2||!ids.every(safeID)||!plainObject(receipt)||!hashRE.test(receipt.payload)||!plainObject(receipt.result)||!pair)fail('MEDIA_BACKUP_INVALID','Invalid media operation receipt.');
  try{requireAuthor(ids[0]);}catch{fail('MEDIA_BACKUP_INVALID','Media operation receipt has no valid author.');}
  const expected=resultFor(pair.asset,pair.revision),actual=Object.fromEntries(Object.keys(expected).map(field=>[field,receipt.result[field]]));
  if(!equal(actual,expected))fail('MEDIA_BACKUP_INVALID','Media receipt contradicts its surviving asset revision.');
 }
}

function validatePins(content,state){const visit=value=>{if(!value||typeof value!=='object')return;if(value.assetId&&typeof value.url==='string'&&value.url.startsWith('/media/blobs/')){const asset=state.assets.find(a=>a.assetId===value.assetId),rev=asset?.revisions.find(r=>r.revisionId===value.revisionId);if(!rev||rev.sha256!==value.sha256||rev.url!==value.url)fail('MEDIA_PIN_INVALID','Pinned media identity/revision/checksum disagrees with its immutable library reference.');}for(const child of Object.values(value))visit(child);};visit(content);}
function safeMetadata(value,depth=0){if(depth>10)fail('MEDIA_METADATA','Media metadata nesting exceeds its limit.',400);if(value&&typeof value==='object')for(const [key,child]of Object.entries(value)){if(['__proto__','constructor','prototype','accessToken','refreshToken','clientSecret','clientJSON','approvalKey','access_token','refresh_token','client_secret'].includes(key))fail('MEDIA_METADATA','Credential/reserved fields cannot be stored in media metadata.',400);safeMetadata(child,depth+1);}}
export function mediaPath(url){if(typeof url!=='string'||!url.startsWith('/media/'))return null;const path=url.slice(7);if(!/^[A-Za-z0-9][A-Za-z0-9_./-]*$/.test(path)||path.includes('..')||path.includes('//')||!MEDIA_TYPES[extname(path).toLowerCase()])fail('MEDIA_PATH','Invalid local media reference.');if(path.startsWith('blobs/')){const managed=/^blobs\/([a-f0-9]{64})\.[a-z0-9]+$/.exec(path),mime=MEDIA_TYPES[extname(path)];if(!managed||url!==managedURL(managed[1],mime))fail('MEDIA_PATH','Invalid immutable media URL.');}return path;}
export function inspectMedia(bytes,mime){
 if(!Buffer.isBuffer(bytes)||!bytes.length||bytes.length>MEDIA_LIMITS.fileBytes||!Object.values(MEDIA_TYPES).includes(mime))fail('MEDIA_INVALID','Choose a supported nonempty media file within the 20 MB local limit.',400);
 const prefix=bytes.subarray(0,16),ascii=prefix.toString('ascii');
 const okay=mime==='audio/wav'?ascii.startsWith('RIFF')&&bytes.subarray(8,12).toString()==='WAVE':mime==='audio/mpeg'?ascii.startsWith('ID3')||bytes[0]===255&&(bytes[1]&224)===224:mime==='audio/ogg'?ascii.startsWith('OggS'):['audio/mp4','video/mp4'].includes(mime)?bytes.subarray(4,8).toString()==='ftyp':mime==='video/webm'?prefix.subarray(0,4).equals(Buffer.from([26,69,223,163])):mime==='image/png'?prefix.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):mime==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:mime==='image/gif'?ascii.startsWith('GIF87a')||ascii.startsWith('GIF89a'):mime==='image/webp'?ascii.startsWith('RIFF')&&bytes.subarray(8,12).toString()==='WEBP':mime==='application/pdf'?ascii.startsWith('%PDF-'):false;
 if(!okay)fail('MEDIA_SIGNATURE','The file bytes disagree with the selected media type.',400);
 return {sha256:digest(bytes),byteLength:bytes.length,mimeType:mime};
}
export function mediaReferences(content){
 const local=new Set(),remote=new Set();
 const mediaKeys=new Set(['audio','video','image','document','poster','mediaRefs']);
 const visit=(value,key='',mediaZone=false)=>{const applies=mediaZone||mediaKeys.has(key);if(typeof value==='string'){
  const markdown=['text','explanation','notes','conceptText','feedback'].includes(key);
  if(applies||markdown)for(const match of value.matchAll(/\/media\/[A-Za-z0-9_./-]+/g))if(mediaPath(match[0]))local.add(match[0]);
  if(applies&&value.startsWith('https://')){const url=new URL(value);if(url.username||url.password)fail('MEDIA_URL','Credentials are not allowed in media URLs.');remote.add(value);}
 }else if(value&&typeof value==='object')for(const [k,v]of Object.entries(value))visit(v,k,applies);};visit(content);
 return {local:[...local].sort(),remote:[...remote].sort()};
}
function decodeBase64(value){
 // A repeated-group regular expression over a supported 20 MB payload can exhaust V8's stack.
 // Validate the alphabet linearly, then use the canonical re-encoding to check padding and trailing bits.
 if(typeof value!=='string'||value.length>Math.ceil(MEDIA_LIMITS.fileBytes/3)*4||value.length%4)fail('MEDIA_BYTES','Invalid bounded media encoding.',400);
 for(let index=0;index<value.length;index++){const code=value.charCodeAt(index);if(!(code>=65&&code<=90||code>=97&&code<=122||code>=48&&code<=57||code===43||code===47||code===61))fail('MEDIA_BYTES','Invalid media encoding alphabet.',400);}
 const bytes=Buffer.from(value,'base64');if(bytes.length>MEDIA_LIMITS.fileBytes)fail('MEDIA_INVALID','Choose a supported media file within the 20 MB local limit.',400);if(bytes.toString('base64')!==value)fail('MEDIA_BYTES','Noncanonical media encoding.',400);return bytes;
}
const emptyState=()=>({version:1,assets:[],operations:{}});

export class MediaStore {
 constructor(store,{mediaRoot=null}={}){this.store=store;this.db=store.db;this.mediaRoot=mediaRoot;this.db.exec('CREATE TABLE IF NOT EXISTS media_blobs(sha256 TEXT PRIMARY KEY,mime_type TEXT NOT NULL,byte_length INTEGER NOT NULL,bytes BLOB NOT NULL); CREATE TABLE IF NOT EXISTS media_aliases(path TEXT PRIMARY KEY,sha256 TEXT NOT NULL REFERENCES media_blobs(sha256));');}
 bindRoot(root){this.mediaRoot=root;}
 state(){return this.store.get('media-state')||emptyState();}
 blob(hash){const row=this.db.prepare('SELECT * FROM media_blobs WHERE sha256=?').get(hash);if(!row)return null;const bytes=Buffer.from(row.bytes);const checked=inspectMedia(bytes,row.mime_type);if(checked.sha256!==hash||checked.byteLength!==row.byte_length)fail('MEDIA_CORRUPT','Stored media bytes fail their integrity check.');return {...checked,bytes};}
 alias(path){return this.db.prepare('SELECT sha256 FROM media_aliases WHERE path=?').get(path)?.sha256||null;}
 readExternal(path){if(!this.mediaRoot)return null;let base,file;try{base=realpathSync(this.mediaRoot);file=realpathSync(resolve(base,path));}catch{return null;}const rel=relative(base,file);if(rel.startsWith('..')||isAbsolute(rel))fail('MEDIA_PATH','Media path escapes its designated local storage.');const stat=statSync(file);if(!stat.isFile()||stat.size>MEDIA_LIMITS.fileBytes)fail('MEDIA_INVALID','Referenced local media is not a supported bounded file.');return inspectWithBytes(readFileSync(file),MEDIA_TYPES[extname(path).toLowerCase()]);}
 resolveLocal(url,{checkExternal=false}={}){const path=mediaPath(url),managed=/^blobs\/([a-f0-9]{64})\.[a-z0-9]+$/.exec(path),hash=managed?.[1]||this.alias(path),stored=hash?this.blob(hash):null;
  if(managed){if(!stored)fail('MEDIA_MISSING','Pinned managed media bytes are missing.');if(stored.mimeType!==MEDIA_TYPES[extname(path).toLowerCase()])fail('MEDIA_CORRUPT','Pinned URL type disagrees with stored bytes.');return {path,...stored,status:'managed'};}
  const external=checkExternal?this.readExternal(path):null;if(stored){if(external&&external.sha256!==stored.sha256)fail('MEDIA_REPLACED','A mutable local media file was replaced. Import it as a new explicit asset revision; retained bytes remain available.');return {path,...stored,status:'recovered-alias',warning:checkExternal&&!external?'Original local file unavailable; retained immutable bytes are available.':null};}
  return external?{path,...external,status:'unmanaged-local'}:null;
 }
 plan(content,{strict=false}={}){validatePins(content,this.state());const refs=mediaReferences(content),entries=[],warnings=[];for(const url of refs.local){try{const item=this.resolveLocal(url,{checkExternal:true});if(item){entries.push(item);if(item.warning)warnings.push({code:'MEDIA_ORIGINAL_FILE_UNAVAILABLE',url,message:item.warning});}else if(strict)fail('MEDIA_MISSING','Required local media is unavailable: '+url);else warnings.push({code:'MEDIA_MISSING',url,message:'Referenced local bytes are unavailable; private authoring remains possible, publication/recovery is blocked.'});}catch(error){if(strict||['MEDIA_CORRUPT','MEDIA_PATH'].includes(error.code))throw error;warnings.push({code:error.code,url,message:error.message});}}
  for(const url of refs.remote)warnings.push({code:'REMOTE_MEDIA_REFERENCE_ONLY',url,message:'Remote media URL retained; remote bytes/availability are not backed up or verified.'});return {entries,warnings,references:refs};}
 persistPlan(plan){for(const item of plan.entries){this.putBlob(item);if(item.status==='unmanaged-local'){const old=this.alias(item.path);if(old&&old!==item.sha256)fail('MEDIA_REPLACED','A local media alias cannot silently change bytes.');this.db.prepare('INSERT OR IGNORE INTO media_aliases(path,sha256) VALUES(?,?)').run(item.path,item.sha256);}}}
 putBlob(item){const prior=this.blob(item.sha256);if(prior){if(prior.mimeType!==item.mimeType||!prior.bytes.equals(item.bytes))fail('MEDIA_CORRUPT','Conflicting content-addressed media.');return;}this.db.prepare('INSERT INTO media_blobs(sha256,mime_type,byte_length,bytes) VALUES(?,?,?,?)').run(item.sha256,item.mimeType,item.byteLength,item.bytes);}
 importAsset(author,input){if(!safeID(input.operationId)||!safeID(input.assetId)||typeof input.title!=='string'||!input.title.trim()||input.title.length>300||!['audio','video','image','document'].includes(input.kind))fail('MEDIA_METADATA','Explicit stable asset ID, title, kind and operation ID required.',400);const bytes=decodeBase64(input.dataBase64),metadata=inspectMedia(bytes,input.mimeType);if(input.expectedSHA256!==undefined&&input.expectedSHA256!==metadata.sha256)fail('MEDIA_REPLACED','Imported bytes differ from the reviewed expected checksum.');const url=managedURL(metadata.sha256,metadata.mimeType),state=this.state(),key=author+'/'+input.operationId,payload=sha256(input),previous=state.operations[key];if(previous){if(previous.payload!==payload)fail('MEDIA_OPERATION_CONFLICT','Media operation ID names another input.');validateLibrary(state,hash=>this.blob(hash),id=>this.store.requireAuthor(id));const result=previous.result;if(result.assetId!==input.assetId||result.sha256!==metadata.sha256||result.mimeType!==metadata.mimeType||result.byteLength!==metadata.byteLength||result.kind!==input.kind||!equal(result.provenance,input.provenance))fail('MEDIA_OPERATION_CONFLICT','Media receipt does not describe the requested bytes and provenance.');return copy(result);}
  const asset=state.assets.find(a=>a.assetId===input.assetId);if((asset?.revisions.at(-1)?.revisionId??null)!==(input.expectedRevisionId??null))fail('MEDIA_CAS','Media asset revision changed. Refresh before importing.');if(!asset&&state.assets.length>=MEDIA_LIMITS.assets)fail('MEDIA_LIMIT','Local media library limit reached.');
  if(asset&&asset.kind!==input.kind)fail('MEDIA_KIND','An existing asset cannot change media kind. Use a new stable asset ID.');
  if(kindFor(metadata.mimeType)!==input.kind)fail('MEDIA_METADATA','Media kind disagrees with the verified file type.',400);
  if(!input.provenance||!['synthetic-demo','human-authored','verified-source'].includes(input.provenance.kind)||typeof input.provenance.label!=='string'||!input.provenance.label.trim())fail('MEDIA_PROVENANCE','Label source/human provenance explicitly. Import never grants teaching approval.',400);safeMetadata(input.provenance);
  const revision={revisionId:'media-'+randomUUID(),...metadata,url,provenance:copy(input.provenance),approval:{version:1,status:'pending'}};
  return this.store.transaction(()=>{const current=this.state(),now=current.assets.find(a=>a.assetId===input.assetId);if((now?.revisions.at(-1)?.revisionId??null)!==(input.expectedRevisionId??null))fail('MEDIA_CAS','Media revision changed.');if(now&&now.kind!==input.kind)fail('MEDIA_KIND','An existing asset cannot change media kind. Use a new stable asset ID.');const updated=now||{assetId:input.assetId,title:input.title,kind:input.kind,revisions:[]};updated.title=input.title;updated.revisions.push(revision);if(!now)current.assets.push(updated);const result=resultFor(updated,revision);current.operations[key]={payload,result};safeMetadata(current);validateLibrary(current,hash=>this.blob(hash)||(hash===metadata.sha256?metadata:null),id=>this.store.requireAuthor(id));this.putBlob({...metadata,bytes});this.store.set('media-state',current);return copy(result);});
 }
 status(content){const plan=this.plan(content),state=this.state();for(const asset of state.assets)for(const rev of asset.revisions){const bytes=this.blob(rev.sha256);if(!bytes||bytes.mimeType!==rev.mimeType||bytes.byteLength!==rev.byteLength)fail('MEDIA_CORRUPT','Reusable media library references missing or corrupt stored bytes.');}return {version:1,storage:'Immutable bytes in local SQLite; explicitly pinned legacy aliases',assets:state.assets,localReferences:plan.references.local,remoteReferences:plan.references.remote,warnings:plan.warnings,limits:MEDIA_LIMITS,approval:'Import is not canonical content approval'};}
 checkPublication(content,{trustedContentApproval=false}={}){const hashes=new Set(this.plan(content,{strict:true}).entries.map(item=>item.sha256));for(const asset of this.state().assets)for(const rev of asset.revisions)if(hashes.has(rev.sha256)&&rev.provenance.kind!=='synthetic-demo'&&!trustedContentApproval)fail('MEDIA_APPROVAL_REQUIRED','Real source/human media is still unapproved for canonical publication. Use the verified owner approval of this exact source/content bundle; private preview remains available.');}
 backup(packs){const all={local:new Set(),remote:new Set()},entries=new Map();for(const content of packs){const plan=this.plan(content,{strict:true});for(const p of plan.references.local)all.local.add(p);for(const p of plan.references.remote)all.remote.add(p);for(const item of plan.entries)entries.set(item.sha256,item);}
  for(const row of this.db.prepare('SELECT sha256 FROM media_blobs').all()){const item=this.blob(row.sha256);entries.set(item.sha256,item);}let total=0;const blobs=[...entries.values()].map(item=>{total+=item.byteLength;if(total>MEDIA_LIMITS.backupBytes)fail('MEDIA_BACKUP_LIMIT','Referenced local media exceeds the 50 MB recovery package limit; no data has been discarded.');return {sha256:item.sha256,mimeType:item.mimeType,byteLength:item.byteLength,dataBase64:item.bytes.toString('base64')};});
  const aliases=new Map(this.db.prepare('SELECT path,sha256 FROM media_aliases').all().map(a=>[a.path,a.sha256]));for(const content of packs)for(const item of this.plan(content,{strict:true}).entries)if(!item.path.startsWith('blobs/'))aliases.set(item.path,item.sha256);
  const state=this.state();safeMetadata(state);validateLibrary(state,hash=>entries.get(hash),id=>this.store.requireAuthor(id));return {version:1,storageMode:'sqlite-immutable-bytes',state,blobs,aliases:[...aliases].map(([path,sha256])=>({path,sha256})),localReferences:[...all.local].sort(),remoteReferences:[...all.remote].sort(),remoteRecovery:'References only; no remote bytes fetched or restored'};
 }
 validateBackup(bundle,packs,{required=false}={}){if(bundle==null){if(required)fail('MEDIA_BACKUP_REQUIRED','This Store version requires its complete media recovery bundle.');return {legacy:true,blobs:[],aliases:[],state:emptyState()};}safeMetadata(bundle.state);if(bundle.version!==1||bundle.storageMode!=='sqlite-immutable-bytes'||!Array.isArray(bundle.blobs)||!Array.isArray(bundle.aliases)||bundle.state?.version!==1||!Array.isArray(bundle.state.assets)||!bundle.state.operations)fail('MEDIA_BACKUP_INVALID','Unsupported or incomplete media recovery bundle.');const blobs=new Map();let total=0;for(const item of bundle.blobs){if(!hashRE.test(item.sha256)||blobs.has(item.sha256))fail('MEDIA_BACKUP_INVALID','Duplicate/invalid media checksum.');const bytes=decodeBase64(item.dataBase64),checked=inspectMedia(bytes,item.mimeType);if(checked.sha256!==item.sha256||checked.byteLength!==item.byteLength)fail('MEDIA_CORRUPT','Media recovery bytes disagree with their checksum/length.');total+=bytes.length;if(total>MEDIA_LIMITS.backupBytes)fail('MEDIA_BACKUP_LIMIT','Media recovery size limit exceeded.');blobs.set(item.sha256,{...checked,bytes});}
  const aliases=new Map();for(const a of bundle.aliases){if(mediaPath('/media/'+a.path)!==a.path||a.path.startsWith('blobs/')||aliases.has(a.path)||!blobs.has(a.sha256)||blobs.get(a.sha256).mimeType!==MEDIA_TYPES[extname(a.path).toLowerCase()])fail('MEDIA_BACKUP_INVALID','Missing or malformed media alias dependency.');aliases.set(a.path,a.sha256);}
  validateLibrary(bundle.state,hash=>blobs.get(hash),id=>this.store.requireAuthor(id));
  const refs=new Set();for(const content of packs){validatePins(content,bundle.state);for(const url of mediaReferences(content).local){refs.add(url);const path=mediaPath(url),managed=/^blobs\/([a-f0-9]{64})\.[a-z0-9]+$/.exec(path),hash=managed?.[1]||aliases.get(path),item=blobs.get(hash);if(!item||item.mimeType!==MEDIA_TYPES[extname(path).toLowerCase()])fail('MEDIA_MISSING','A carried content reference has no matching recovered bytes: '+url);}}if(!equal([...refs].sort(),bundle.localReferences))fail('MEDIA_BACKUP_INVALID','Declared local media references disagree with carried content.');
  return {legacy:false,blobs:[...blobs.values()],aliases:[...aliases].map(([path,sha256])=>({path,sha256})),state:copy(bundle.state)};
 }
 restore(plan){this.db.exec('DELETE FROM media_aliases; DELETE FROM media_blobs;');for(const item of plan.blobs)this.putBlob(item);for(const a of plan.aliases)this.db.prepare('INSERT INTO media_aliases(path,sha256) VALUES(?,?)').run(a.path,a.sha256);this.store.set('media-state',plan.state);}
 validatePersistent(packs){const bundle=this.backup(packs);return this.validateBackup(bundle,packs,{required:true});}
}
const inspectWithBytes=(bytes,mime)=>({...inspectMedia(bytes,mime),bytes});
