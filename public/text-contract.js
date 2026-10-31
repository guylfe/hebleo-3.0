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
 validateTextActivityVersion(value);
 const activityIds=new Set();
 const ids=new Set(),words=new Set(wordIds),targets=new Set(targetIds);
 for(const page of value.pages){
  if(!plain(page)||!validPageID(page.id)||ids.has(page.id)||!['reading','choice','recall','timedRecall','vocabulary','complete'].includes(page.type))fail('Invalid or duplicate stable text page ID/type.');
  ids.add(page.id);string(page.title,'title',1000);
  if(page.activity!==undefined){
   validateSourceActivity(page);
   if(page.activity.id!==undefined){if(activityIds.has(page.activity.id))fail('Duplicate activity identity.');activityIds.add(page.activity.id);}
  }
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
 if(page.activity){
  if(page.activity.kind==='memory-comparison'&&page.activity.optional===true)return true;
  if(page.activity.kind==='date-connection'&&page.activity.principleInteraction==='expandable')return true;
  if(page.activity.kind==='date-connection')return response.stage===2&&response.revealCount===page.activity.principles.length;
  if(['memory-first','memory-comparison','letter-input','letter-matching','self-check'].includes(page.activity.kind)||page.type==='choice')return response.checked===true;
 }
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
 if(page.activity)return validateSourceResponse(page,response);
 if(!plain(response)||Object.keys(response).some(k=>!['text','choice','checked','revealed'].includes(k)))fail('Invalid text page response.');
 if(response.text!==undefined){string(response.text,'response',12000,true);if(!['recall','timedRecall'].includes(page.type))fail('Written response on another page type.');}
 if(response.choice!==undefined&&(!Number.isInteger(response.choice)||page.type!=='choice'||response.choice<0||response.choice>=page.options.length))fail('Invalid selected text choice.');
 for(const key of ['checked','revealed'])if(response[key]!==undefined&&typeof response[key]!=='boolean')fail('Invalid text commitment flag.');
 if(page.type==='choice'&&response.checked&&!Number.isInteger(response.choice))fail('Choose before checking.');
 if(['recall','timedRecall'].includes(page.type)&&response.revealed&&!response.text?.trim())fail('Write an attempt before revealing.');
 return response;
}

// Versionless explanations retain the original reader. Authored activities must
// explicitly select their supported reader; no unknown version falls through.
export function validateTextActivityVersion(value){
 if(value.activityVersion!==undefined&&value.activityVersion!==1)fail('Unsupported text activity version.');
 for(const page of value.pages){
  if(page.activity!==undefined&&value.activityVersion!==1)fail('Authored activities require activityVersion 1.');
  if(value.activityVersion===1&&(!['reading','choice','complete'].includes(page.type)||(page.type==='choice'&&page.activity===undefined)))fail('Unsupported authored activity page type.');
 }
 return value.activityVersion;
}
// The comparison classifier currently supports this exact authored example.
// A different example needs its own classifier contract, not misleading feedback.
export const SOURCE_MEMORY_VALUE='0704177609112001';
export const SOURCE_MEMORY_DATES='07/04/1776 · 09/11/2001';
export function validateSourceActivity(page){
 const a=page.activity,choices=['letter-choice','application-choice'],kinds=['memory-first','date-connection','memory-comparison','letter-gallery','letter-input','letter-matching','self-check',...choices];
 if(!plain(a)||!kinds.includes(a.kind))fail('Invalid authored activity.');
 if(page.type!==(choices.includes(a.kind)?'choice':'reading'))fail('Activity kind does not match page type.');
 if(a.id!==undefined&&!validPageID(a.id))fail('Invalid activity identity.');
 if(a.optional!==undefined&&typeof a.optional!=='boolean')fail('Invalid optional activity flag.');
 if(a.optional===true){
  if(a.kind!=='memory-comparison'||page.type!=='reading'||page.gate!=='none'||!validPageID(a.id))fail('Only an identified reading comparison may be optional.');
  string(a.intro,'optional comparison introduction',100000);
  if(a.label!==undefined)string(a.label,'optional comparison label',1000);
  if(['options','answer','explanation'].some(k=>page[k]!==undefined))fail('Optional comparison cannot retain quiz fields.');
 }else if(a.intro!==undefined)fail('Comparison introduction requires optional activity.');
 if(a.principleInteraction!==undefined&&(a.kind!=='date-connection'||a.principleInteraction!=='expandable'))fail('Invalid principle interaction.');
 const text=(v,label,max=12000)=>string(v,'activity '+label,max);
 const texts=(v,label,count)=>{if(!Array.isArray(v)||v.length!==count)fail('Invalid activity '+label+'.');v.forEach(x=>text(x,label));};
 const feedback=keys=>{if(!plain(a.feedback))fail('Invalid activity feedback.');for(const key of keys)text(a.feedback[key],'feedback '+key);};
 const media=item=>{for(const key of ['audio','image'])if(item[key]!==undefined&&(typeof item[key]!=='string'||!/^\/media\/[A-Za-z0-9_./-]+$/.test(item[key])||item[key].includes('..')))fail('Activities require safe local media.');if(item.audio!==undefined&&!validPageID(item.id))fail('Activity audio requires a stable identity.');};
 const letter=v=>{if(typeof v!=='string'||!/^[א-ת]$/.test(v))fail('Activity needs one printed Hebrew letter.');};
 media(a);
 for(const key of ['copy','showCorrectFeedback'])if(a[key]!==undefined&&typeof a[key]!=='boolean')fail('Invalid activity '+key+' flag.');
 for(const key of ['sound','alt'])if(a[key]!==undefined)text(a[key],key);
 if(a.letter!==undefined)letter(a.letter);
 if(a.kind==='memory-first'){
  if(typeof a.value!=='string'||!/^\d{1,12000}$/.test(a.value)||a.durationMs!==10000)fail('Memory display requires an exact digit string and ten seconds.');
  feedback(['exact','partial']);
 }
 if(a.kind==='memory-comparison'){
  if(a.value!==SOURCE_MEMORY_VALUE||a.dates!==SOURCE_MEMORY_DATES)fail('Unsupported memory comparison model.');
  feedback(['exact','partial','empty','reverse','dayMonth','zeros']);
 }
 if(a.kind==='date-connection'){
  if(a.principleInteraction==='expandable'&&a.stages?.[0]!==SOURCE_MEMORY_VALUE)fail('Spatial date demonstration requires its exact sixteen-digit model.');
  texts(a.stages,'date stages',3);
  if(!Array.isArray(a.descriptions)||a.descriptions.length!==3)fail('Invalid activity date descriptions.');
  a.descriptions.forEach((v,i)=>string(v,'date description',12000,i===2));
  if(!/^\d+$/.test(a.stages[0])||a.stages.some(s=>s.replace(/\D/g,'')!==a.stages[0]))fail('Date stages must preserve every digit.');
  text(a.after,'date explanation',100000);
  if(!Array.isArray(a.principles)||a.principles.length!==3)fail('Invalid activity principles.');
  for(const item of a.principles){if(!plain(item))fail('Invalid activity principle.');text(item.title,'principle title');text(item.text,'principle text');}
 }
 if(a.kind==='letter-input'){letter(a.answer);text(a.feedback,'feedback');if(a.letter!==undefined&&a.letter!==a.answer)fail('Contradictory letter input model reference.');}
 if(choices.includes(a.kind)){
  if(!Array.isArray(page.options)||page.options.length<2||page.options.length>20||!Number.isInteger(page.answer)||page.answer<0||page.answer>=page.options.length)fail('Invalid activity choice model.');
  page.options.forEach(x=>text(x,'choice',4000));texts(a.feedback,'choice feedback',page.options.length);
  if(a.kind==='letter-choice'){page.options.forEach(letter);if(new Set(page.options).size!==page.options.length||a.letter!==undefined&&a.letter!==page.options[page.answer])fail('Invalid letter choice model references.');}
 }
 if(['letter-gallery','letter-matching','self-check'].includes(a.kind)){
  if(!Array.isArray(a.items)||a.items.length<1||a.items.length>200||a.kind==='letter-matching'&&a.items.length!==4)fail('Invalid activity items.');
  // Parent and items use the same page-local audio action lookup. Reserve the
  // parent identity even without a clip, so attaching media cannot shadow an item.
  const ids=new Set(a.id===undefined?[]:[a.id]);for(const item of a.items){
   if(!plain(item)||!validPageID(item.id)||ids.has(item.id))fail('Invalid or duplicate activity item identity.');ids.add(item.id);
   letter(item.letter);text(item.sound,'item sound');media(item);
   if(a.kind==='letter-gallery'){text(item.text,'gallery text',100000);if(item.image!==undefined)text(item.alt,'image alternative');}
  }
  if(a.kind!=='letter-gallery')text(a.feedback,'feedback');
 }
 if(a.kind==='letter-matching'){
  if(!Array.isArray(a.options)||a.options.length!==4||new Set(a.options).size!==4)fail('Invalid matching options.');
  a.options.forEach(letter);
  if(new Set(a.items.map(i=>i.letter)).size!==4||a.items.some(i=>!a.options.includes(i.letter)))fail('Invalid matching model references.');
 }
}
export function validateSourceResponse(page,response){
 const allowed=['text','choice','checked','revealed','started','interrupted','skipped','attempted','opened','stage','revealCount','matches','study','principlesOpen','principlesSeen'];
 if(!plain(response)||Object.keys(response).some(k=>!allowed.includes(k)))fail('Invalid activity response.');
 if(response.text!==undefined){string(response.text,'response',12000,true);if(!['memory-first','memory-comparison','letter-input'].includes(page.activity.kind))fail('Text on another activity.');}
 for(const key of ['checked','revealed','started','interrupted','skipped','attempted','opened'])if(response[key]!==undefined&&typeof response[key]!=='boolean')fail('Invalid activity flag.');
 if(response.study!==undefined&&(page.activity.kind!=='memory-first'||typeof response.study!=='boolean'))fail('Invalid study mode.');
 for(const key of ['principlesOpen','principlesSeen'])if(response[key]!==undefined&&(page.activity.kind!=='date-connection'||page.activity.principleInteraction!=='expandable'||!Array.isArray(response[key])||response[key].length>3||new Set(response[key]).size!==response[key].length||response[key].some(i=>!Number.isInteger(i)||i<0||i>2)))fail('Invalid principle state.');
 if(response.choice!==undefined&&(page.type!=='choice'||!Number.isInteger(response.choice)||response.choice<0||response.choice>=page.options.length))fail('Invalid activity choice.');
 if(page.type==='choice'&&response.checked&&!Number.isInteger(response.choice))fail('Choose before checking.');
 if(response.stage!==undefined&&(page.activity.kind!=='date-connection'||!Number.isInteger(response.stage)||response.stage<0||response.stage>2))fail('Invalid animation stage.');
 if(response.revealCount!==undefined&&(page.activity.kind!=='date-connection'||!Number.isInteger(response.revealCount)||response.revealCount<0||response.revealCount>3))fail('Invalid reveal count.');
 if(response.matches!==undefined&&(page.activity.kind!=='letter-matching'||!plain(response.matches)||Object.entries(response.matches).some(([id,v])=>!page.activity.items.some(item=>item.id===id)||!['',...page.activity.options].includes(v))))fail('Invalid letter matches.');
 return response;
}
