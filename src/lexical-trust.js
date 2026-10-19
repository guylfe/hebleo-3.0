import {validateSourceBrowse} from './source-vocabulary.js';
import {createHash} from 'node:crypto';
import {isApproved,validateLexicalContent} from '../public/lexical-contract.js';
import {lexicalCatalogue} from '../public/lexical-runtime.js';
import {DomainError} from './errors.js';
import {WORKBOOK_CAPTURE_VERSION,validateConsolidatedCapture} from './lexical-capture.js';
const canonical=v=>JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))):x);
const payload=record=>Object.fromEntries(Object.entries(record).filter(([key])=>!['review','identityReview','mappingReview','approvalDigest'].includes(key)));
const approvedRecord=record=>[record.review,record.identityReview,record.mappingReview,record.displayReview].some(review=>isApproved(review,record.revision));
export const lexicalApprovalDigest=record=>'lxa1-'+createHash('sha256').update(canonical(payload(record))).digest('hex');
export function lexicalReviewedRecords(lexical){
 if(!lexical)return [];
 return [...lexical.words,...lexical.classes,...lexical.aliases,...lexical.usages,...lexical.examples,...lexical.words.flatMap(w=>w.forms.flatMap(f=>f.variants))];
}
export function validateLexicalSnapshot(content){
 if(!Object.hasOwn(content,'lexical'))return;
 if(content.lexical?.sourceBrowse)validateSourceBrowse(content.lexical.sourceBrowse);
 // Declared captured evidence must also be valid when supplied directly to Stage/restore.
 // Synthetic/legacy lexical envelopes without a capture keep their existing contract.
 if(content.lexical?.captureDigest!==undefined||content.lexical?.archive?.version===WORKBOOK_CAPTURE_VERSION)validateConsolidatedCapture(content.lexical.archive);
 const check=validateLexicalContent(content.lexical,lexicalCatalogue(content));
 if(!check.ok)throw new DomainError('Invalid lexical contract: '+check.errors.slice(0,8).map(e=>e.path+' '+e.code).join('; '));
 const ids=new Set();for(const w of content.lexical.words)if(w.runtimeId!==undefined){if(ids.has(w.runtimeId)||!content.words.some(old=>old.id===w.runtimeId))throw new DomainError('Invalid or duplicate lexical runtime identity.');ids.add(w.runtimeId);}
 for(const record of lexicalReviewedRecords(content.lexical))if(approvedRecord(record)){
  if(record.approvalDigest!==lexicalApprovalDigest(record))throw new DomainError('Lexical approval does not match its exact payload.');
 }
}
export function assertLexicalTransition(previous,next){
 if(JSON.stringify(previous.lexical?.sourceBrowse)!==JSON.stringify(next.lexical?.sourceBrowse))throw new DomainError('Source browsing adoption must come through trusted exact-source review.');
 if(previous.lexical&&!next.lexical)throw new DomainError('Removing the lexical envelope requires a reversible migration.');
 const approved=new Set(lexicalReviewedRecords(previous.lexical).filter(approvedRecord).map(canonical));
 for(const record of lexicalReviewedRecords(next.lexical))if(approvedRecord(record)&&!approved.has(canonical(record)))throw new DomainError('Source and identity approvals must come through a trusted content review; local settings cannot approve source material.');
 for(const name of ['unlocks','introductions'])for(const record of next.lexical?.[name]||[]){
  const old=previous.lexical?.[name]?.find(i=>(i.unlockId||i.linkId)===(record.unlockId||record.linkId));
  if(old&&old.revision===record.revision&&canonical(old)!==canonical(record))throw new DomainError('Changing a reviewed lesson setting needs a new revision.');
 }
}
export function assertKnownLexicalRestore(knownContents,incomingContents){
 const knownBrowse=new Set(knownContents.map(c=>c.lexical?.sourceBrowse?.digest).filter(Boolean));
 for(const c of incomingContents)if(c.lexical?.sourceBrowse&&!knownBrowse.has(c.lexical.sourceBrowse.digest))throw new DomainError('Unknown source browsing approval in restore.',409,'LEXICAL_APPROVAL_REQUIRED');
 const known=new Set(knownContents.flatMap(c=>lexicalReviewedRecords(c.lexical)).filter(approvedRecord).map(canonical));
 for(const c of incomingContents)for(const record of lexicalReviewedRecords(c?.lexical))if(approvedRecord(record)&&!known.has(canonical(record)))throw new DomainError('This backup contains lexical source approvals not previously trusted by this installation. Import pending material or use an explicit trusted source review.',409,'LEXICAL_APPROVAL_REQUIRED');
}
