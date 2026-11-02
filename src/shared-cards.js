import {createHash} from 'node:crypto';
import {parseFragment,parse} from 'parse5';
import {createRenderer,validateNote,PACKAGE_SHA256} from './shared-card-adapter/index.mjs';
import {inspectMedia} from './media-store.js';
import {DomainError} from './errors.js';
const copy=structuredClone;
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fail=(message,status=400)=>{throw new DomainError(message,status,'SHARED_CARDS_INVALID');};
const fieldsHash='12b3f62e02e09c7f143d502c7559ba5eed4788f5ebe6dae86ba0aba84b2a8dd2';
const manifestHash='64aea4e805f7d4c949fb8b431775e20f82237d69a7e3c9b1e13afec29f1cdf77';
const text=node=>node.nodeName==='#text'?node.value:(node.childNodes||[]).map(text).join('');
const all=node=>[node,...(node.childNodes||[]).flatMap(all)];
const attr=(node,name)=>node.attrs?.find(a=>a.name===name)?.value;
const plain=value=>text(parseFragment(value));
export const sharedCardId=(sourceId,direction)=>'sc-'+sourceId+'-'+direction;
export function parseSharedCardId(id){const match=/^sc-(mf-\d{6})-(he-en|en-he)$/.exec(id||'');return match?{sourceId:match[1],direction:match[2]}:null;}
export function validateCardSettings(value){if(!value||Object.keys(value).sort().join('|')!=='mode|nikkud'||!['light','dark'].includes(value.mode)||typeof value.nikkud!=='boolean')fail('Invalid shared card settings.');return copy(value);}
export function audioSlots(note) {
 const slots=[];
 const base=[...note.fields.Audio.matchAll(/\[sound:([^\]]+)\]/g)];
 base.forEach((m,i)=>slots.push({formKey:'Audio:'+i,formValue:note.fields.HebrewNikkud||note.fields.Hebrew,file:m[1]}));
 const tree=parseFragment(note.fields.Forms);
 for(const [i,button] of all(tree).filter(n=>n.tagName==='button'&&attr(n,'data-audio')).entries()){
  let parent=button.parentNode,value='';
  while(parent&&parent!==tree){const pointed=all(parent).find(n=>attr(n,'class')?.split(' ').includes('hc-pointed'));if(pointed){value=text(pointed);break;}parent=parent.parentNode;}
  if(!value)fail('Form replay has no exact supplied form value.');
  slots.push({formKey:'Forms:'+i,formValue:value,file:attr(button,'data-audio')});
 }
 return slots;
}
export function validateSharedState(state,blobFor) {
 if(state===null)return null;
 if(!state||state.version!==1||Object.keys(state).sort().join('|')!=='manifest|overlays|raw|revision|version'||hash(state.raw)!==fieldsHash||hash(state.manifest)!==manifestHash||state.revision!==hash({raw:state.raw,manifest:state.manifest})||!Array.isArray(state.overlays))fail('Shared namespace does not match independently approved content.',409);
 const notes=new Map(state.raw.notes.map(n=>[n.id,n]));
 if(notes.size!==1025||state.manifest.length!==1329||state.raw.packageSha256!==PACKAGE_SHA256)fail('Invalid shared counts.');
 for(const note of notes.values())validateNote(note);
 const seen=new Set();
 for(const overlay of state.overlays){
  if(!overlay||Object.keys(overlay).sort().join('|')!=='file|formKey|formValue|sha256|sourceId')fail('Invalid audio overlay.');
  const key=JSON.stringify([overlay.sourceId,overlay.formKey]);
  const slot=notes.has(overlay.sourceId)&&audioSlots(notes.get(overlay.sourceId)).find(s=>s.formKey===overlay.formKey&&s.formValue===overlay.formValue);
  if(!slot||seen.has(key)||!/^overlay-[a-f0-9]{64}\.mp3$/.test(overlay.file)||overlay.file!=='overlay-'+overlay.sha256+'.mp3')fail('Invalid exact form binding.');
  seen.add(key);
 }
 const objects=[...state.manifest,...state.overlays.map(o=>({file:o.file,sha256:o.sha256}))];
 for(const item of objects){const blob=blobFor(item.sha256);if(!blob||item.bytes!==undefined&&blob.byteLength!==item.bytes||blob.mimeType!==(item.file.endsWith('.mp3')?'audio/mpeg':'image/png'))fail('Shared media dependency is missing or corrupt.',409);}
 return copy(state);
}
export class SharedCards {
 constructor(store){this.store=store;}
 state(){if(this.cached===undefined)this.cached=this.store.get('shared-cards');return this.cached;}
 invalidate(){this.cached=undefined;}
 access(userId){const learner=this.store.learner(userId);if(!learner.purchasedCourses.includes('demo-foundations'))fail('Course access required.',403);return learner;}
 settings(userId){return this.store.learner(userId).sharedCardSettings||{mode:'light',nikkud:false};}
 saveSettings(userId,input){const learner=this.access(userId);learner.sharedCardSettings=validateCardSettings(input);this.store.saveLearner(userId,learner);return learner.sharedCardSettings;}
 note(sourceId){return this.state()?.raw.notes.find(n=>n.id===sourceId);}
 word(id){const key=parseSharedCardId(id),note=key&&this.note(key.sourceId);return note?{id,shared:true,...key,hebrew:plain(note.fields.Hebrew),pointed:plain(note.fields.HebrewNikkud),english:plain(note.fields.English)}:null;}
 collection(userId,{offset=0,search=''}={}){
  const learner=this.access(userId),state=this.state();offset=Math.max(0,Math.floor(Number(offset)||0));search=String(search).slice(0,200).toLocaleLowerCase();
  const notes=(state?.raw.notes||[]).filter(n=>[n.id,n.fields.Hebrew,n.fields.HebrewNikkud,n.fields.English].some(v=>plain(v).toLocaleLowerCase().includes(search)));
  return {total:notes.length,offset,limit:25,rows:notes.slice(offset,offset+25).map(n=>({sourceId:n.id,hebrew:plain(n.fields.Hebrew),english:plain(n.fields.English),directions:['he-en','en-he'].map(direction=>({direction,id:sharedCardId(n.id,direction),enrolled:!!learner.cards[sharedCardId(n.id,direction)]}))}))};
 }
 importPackage(userId,{raw,manifest,blobs,expectedRevision=null}){
  this.store.requireAuthor(userId);
  const state={version:1,raw,manifest,overlays:this.state()?.overlays||[],revision:hash({raw,manifest})};
  if(!Array.isArray(blobs))fail('Verified media bytes required.');
  const prepared=new Map();
  for(const blob of blobs){
   if(!blob||typeof blob.dataBase64!=='string'||!Number.isInteger(blob.byteLength)||blob.byteLength<1||blob.byteLength>20_000_000||Buffer.from(blob.dataBase64,'base64').toString('base64')!==blob.dataBase64)fail('Invalid media bytes.');
   const bytes=Buffer.from(blob.dataBase64,'base64'),sha256=createHash('sha256').update(bytes).digest('hex');
   if(sha256!==blob.sha256||bytes.length!==blob.byteLength||prepared.has(sha256))fail('Media checksum mismatch.');
   prepared.set(sha256,{...blob,bytes});
  }
  validateSharedState(state,h=>prepared.get(h)||this.store.media.blob(h));
  return this.store.transaction(()=>{
   const current=this.state();if((current?.revision??null)!==expectedRevision)fail('Shared source revision changed.',409);
   for(const item of prepared.values())this.store.media.putBlob(item);
   this.store.set('shared-cards',state);return {revision:state.revision,notes:raw.notes.length,cards:2050,media:manifest.length};
  });
 }
 updateAudio(userId,{sourceId,formKey,formValue,blob,expectedSHA256=null}){
  this.store.requireAuthor(userId);const state=copy(this.state());if(!state)fail('Import the shared source first.');
  const slot=this.note(sourceId)&&audioSlots(this.note(sourceId)).find(s=>s.formKey===formKey&&s.formValue===formValue);if(!slot)fail('Exact approved source/form binding required.');
  const bytes=Buffer.from(blob?.dataBase64||'','base64'),sha256=createHash('sha256').update(bytes).digest('hex');
  if(!bytes.length||bytes.length>20_000_000||bytes.toString('base64')!==blob.dataBase64||sha256!==blob.sha256||blob.mimeType!=='audio/mpeg')fail('Invalid audio bytes.');
  inspectMedia(bytes,'audio/mpeg');
  const old=state.overlays.find(o=>o.sourceId===sourceId&&o.formKey===formKey);
  if((old?.sha256??null)!==expectedSHA256)fail('Audio overlay changed.',409);
  const overlay={sourceId,formKey,formValue,file:'overlay-'+sha256+'.mp3',sha256};
  state.overlays=state.overlays.filter(o=>o!==old);state.overlays.push(overlay);
  return this.store.transaction(()=>{this.store.media.putBlob({bytes,sha256,mimeType:'audio/mpeg',byteLength:bytes.length});validateSharedState(state,h=>this.store.media.blob(h));this.store.set('shared-cards',state);return overlay;});
 }
 document(userId,id,face,mediaBaseUrl){
  this.access(userId);const key=parseSharedCardId(id),note=key&&this.note(key.sourceId);if(!note)fail('Shared card not found.',404);
  const state=this.state(),derived=copy(note);
  for(const overlay of state.overlays.filter(o=>o.sourceId===key.sourceId)){
   const slot=audioSlots(note).find(s=>s.formKey===overlay.formKey);
   if(overlay.formKey.startsWith('Audio:'))derived.fields.Audio=derived.fields.Audio.replace('[sound:'+slot.file+']','[sound:'+overlay.file+']');
   else {let index=0;derived.fields.Forms=derived.fields.Forms.replace(/data-audio="([^"]+)"/g,(match)=>'Forms:'+index++===overlay.formKey?'data-audio="'+overlay.file+'"':match);}
  }
  const manifest=[...state.manifest,...state.overlays.map(o=>({file:o.file,sha256:o.sha256,bytes:this.store.media.blob(o.sha256).byteLength}))].filter((o,i,a)=>a.findIndex(x=>x.file===o.file)===i);
  const html=createRenderer({mediaManifest:manifest,mediaBaseUrl}).renderCard({note:derived,direction:key.direction,face,settings:this.settings(userId)});
  const policy=all(parse(html)).find(n=>n.tagName==='meta'&&attr(n,'http-equiv')==='Content-Security-Policy');
  return {html,csp:attr(policy,'content')+"; frame-ancestors 'self'"};
 }
 media(userId,file){this.access(userId);const state=this.state(),item=state&&[...state.manifest,...state.overlays].find(o=>o.file===file);if(!item)fail('Media not found.',404);return this.store.media.blob(item.sha256);}
}
