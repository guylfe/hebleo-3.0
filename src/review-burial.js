import {parseSharedCardId} from './shared-cards.js';
export function nextStudyDay(now){const date=new Date(now);date.setHours(24,0,0,0);return date.toISOString();}
export function isReviewBuried(state,cardId,now=Date.now()){
 const note=parseSharedCardId(cardId),entry=note&&state.reviewBurials?.[note.sourceId];
 return !!(entry&&entry.cardId!==cardId&&Date.parse(entry.until)>now);
}
export function validateBurials(value){
 if(value===undefined)return;
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length>1025)throw Error('Invalid review burial state.');
 for(const [sourceId,entry]of Object.entries(value))if(!entry||Object.keys(entry).sort().join('|')!=='cardId|until'||parseSharedCardId(entry.cardId)?.sourceId!==sourceId||typeof entry.until!=='string'||!Number.isFinite(Date.parse(entry.until)))throw Error('Invalid review burial state.');
}
