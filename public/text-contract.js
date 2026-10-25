// Additive text explanation contract. IDs name content; order names placement.
export const validPageID = value => typeof value==='string' && /^[A-Za-z0-9][A-Za-z0-9_.-]{0,119}$/.test(value) && !['__proto__','constructor','prototype'].includes(value);
const fail = message => {throw new Error(message);};
const string = (value,label,max=12000,empty=false) => {if(typeof value!=='string'||value.length>max||(!empty&&!value.trim()))fail('Invalid text page '+label+'.');};
const list = (value,known,label) => {if(!Array.isArray(value)||value.length>2000||new Set(value).size!==value.length||value.some(id=>!known.has(id)))fail('Invalid text page '+label+' references.');};
const plain = value => value && typeof value==='object' && !Array.isArray(value);
export function validateTextMetadata(value,depth=0) {
 if(depth>14)fail('Text metadata exceeds nesting limit.');
 if(typeof value==='string'&&value.length>100000)fail('Text metadata exceeds string limit.');
 if(value&&typeof value==='object')for(const [key,child]of Object.entries(value)){if(['__proto__','constructor','prototype'].includes(key))fail('Reserved text metadata key.');validateTextMetadata(child,depth+1);}
}
export function validateTextPages(value,{wordIds=[],targetIds=[]}={}) {
 if(!plain(value)||value.version!==1||!Array.isArray(value.pages)||value.pages.length>200||!Array.isArray(value.order))fail('Invalid text pages version or bounds.');
 if(JSON.stringify(value).length>1500000)fail('Text explanation exceeds size limit.');
 validateTextMetadata(value);
 const ids=new Set(),words=new Set(wordIds),targets=new Set(targetIds);
 for(const page of value.pages){
  if(!plain(page)||!validPageID(page.id)||ids.has(page.id)||!['reading','choice','recall','timedRecall','vocabulary','complete'].includes(page.type))fail('Invalid or duplicate stable text page ID/type.');
  ids.add(page.id);string(page.title,'title',1000);
  for(const key of ['html','prompt','explanation'])if(page[key]!==undefined)string(page[key],key,100000,true);
  if(page.gate!==undefined&&!['none','commit','reveal'].includes(page.gate))fail('Invalid text page gate.');
  if(page.type==='choice'){
   if(!Array.isArray(page.options)||page.options.length<2||page.options.length>20||!Number.isInteger(page.answer)||page.answer<0||page.answer>=page.options.length)fail('Invalid text page choices or answer.');
   page.options.forEach(x=>string(x,'choice',4000));
  }
  if(page.type==='recall'){string(page.answer,'illustrative model');if(page.grading!=='self-check')fail('Written models require self-check grading.');}
  if(page.type==='timedRecall'){
   string(page.value,'timed value');if(!Number.isInteger(page.durationMs)||page.durationMs<100||page.durationMs>120000||page.accessibleAlternative!==true)fail('Invalid text timing or missing untimed alternative.');
   if(page.answer!==undefined)string(page.answer,'timed model',12000,true);
  }
  if(page.type==='vocabulary'){list(page.wordIds||[],words,'canonical word');list(page.unresolvedTargetIds||[],targets,'draft target');if(page.words!==undefined)fail('Prototype word cards are not canonical vocabulary.');}
  if(page.media!==undefined){
   if(!plain(page.media)||!Object.keys(page.media).length||Object.keys(page.media).some(k=>!['audio','video'].includes(k)))fail('Invalid text page media reference.');
   for(const ref of Object.values(page.media)){const url=typeof ref==='string'?ref:ref?.url;if(typeof url!=='string'||!(/^(https:\/\/[^\s<>"']+|\/media\/[A-Za-z0-9_./-]+)$/.test(url))||url.includes('..'))fail('Invalid text page media URL.');}
  }
 }
 if(value.order.length!==ids.size||new Set(value.order).size!==ids.size||value.order.some(id=>!ids.has(id)))fail('Text page order must place each stable ID exactly once.');
 return value;
}
export function orderedTextPages(value){return value.order.map(id=>value.pages.find(p=>p.id===id));}
export function textPageGatePassed(page,response={}){
 if(!page.gate||page.gate==='none')return true;
 if(page.type==='choice')return Number.isInteger(response.choice)&&response.checked===true;
 if(['recall','timedRecall'].includes(page.type))return Boolean(response.text?.trim())&&(page.gate!=='reveal'||response.revealed===true);
 return page.gate==='reveal'?response.revealed===true:response.checked===true;
}
export function textGatesPassed(textPages,state={}){return !textPages||textPages.pages.every(p=>textPageGatePassed(p,state.responses?.[p.id]));}
// Release eligibility follows teaching/review semantics, independently of import flags.
export function textPublicationIssues(content){
 return content.lessons.flatMap(lesson=>{
  const reasons=[],hasText=lesson.blocks?.some(b=>b.textPages);
  if(lesson.draftImport||lesson.publicationStatus==='unpublished-adapted-draft'||lesson.status==='adapted-draft-for-Guy-review')reasons.push('unpublished adapted import');
  if(lesson.provenance?.kind==='adapted-draft')reasons.push('adapted teaching has no promotion approval');
  if((hasText||lesson.draftTargets)&&lesson.provenance?.approval&&lesson.provenance.approval!=='approved')reasons.push('pending teaching approval');
  if(lesson.draftTargets?.some(t=>!t.wordId||t.mappingStatus!=='explicitly-mapped'))reasons.push('unresolved vocabulary targets');
  if(lesson.blocks?.some(b=>b.textPages?.pages.some(p=>p.unresolvedTargetIds?.length)))reasons.push('unresolved page vocabulary');
  if(lesson.authoringReview&&Object.values(lesson.authoringReview).some(value=>value!=='approved'))reasons.push('pending human authoring review');
  return reasons.length?[{lessonId:lesson.id,reasons}]:[];
 });
}
export function validateTextResponse(page,response){
 if(!plain(response)||Object.keys(response).some(k=>!['text','choice','checked','revealed'].includes(k)))fail('Invalid text page response.');
 if(response.text!==undefined){string(response.text,'response',12000,true);if(!['recall','timedRecall'].includes(page.type))fail('Written response on another page type.');}
 if(response.choice!==undefined&&(!Number.isInteger(response.choice)||page.type!=='choice'||response.choice<0||response.choice>=page.options.length))fail('Invalid selected text choice.');
 for(const key of ['checked','revealed'])if(response[key]!==undefined&&typeof response[key]!=='boolean')fail('Invalid text commitment flag.');
 if(page.type==='choice'&&response.checked&&!Number.isInteger(response.choice))fail('Choose before checking.');
 if(['recall','timedRecall'].includes(page.type)&&response.revealed&&!response.text?.trim())fail('Write an attempt before revealing.');
 return response;
}
