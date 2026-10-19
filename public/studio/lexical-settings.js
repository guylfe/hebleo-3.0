import {SLOT_DEFINITIONS,isApproved,validateLexicalContent} from '../lexical-contract.js';
import {emptyLexical,lexicalCatalogue,lessonLexicalDiagnostics} from '../lexical-runtime.js';
import {esc as e} from '../learner-view.js';

const review=revision=>({status:'approved',reviewedRevision:revision,reviewedBy:'local-author',reviewedAt:new Date().toISOString()});
const categoryLabel={verb:'Verbs',adjective:'Adjectives',preposition:'Prepositions'};
const groupLabel={past:'Past',present:'Present',future:'Future',imperative:'Imperative',infinitive:'Infinitive',gerund:'Verbal noun',adjective:'Gender and number',preposition:'Pronouns'};
const wordLabel=w=>[w.display?.hebrew?.text,w.display?.english?.text].filter(Boolean).join(' — ')||w.wordKey;
const slotLabel=slot=>{
 const s=typeof slot==='string'?SLOT_DEFINITIONS.find(s=>s.id===slot):slot;
 if(!s)return String(slot);
 if(s.category==='preposition')return s.pronoun;
 const token=s.id.split('.').at(-1);
 return ({I:'I',he:'he',she:'she',they:'they','אנחנו':'we','Singular M':'Masculine singular','Singular F':'Feminine singular','Plural M':'Masculine plural','Plural F':'Feminine plural',ms:'Masculine singular',fs:'Feminine singular',mp:'Masculine plural',fp:'Feminine plural',infinitive:'Infinitive',gerund:'Verbal noun'})[token]||s.pronoun||token;
};
const settingLabel=ids=>{const grouped=new Map();for(const id of ids){const s=SLOT_DEFINITIONS.find(s=>s.id===id);const group=groupLabel[s?.group]||s?.group||'';if(!grouped.has(group))grouped.set(group,[]);grouped.get(group).push(slotLabel(id));}return [...grouped].map(([g,labels])=>g+': '+labels.join(', ')).join('; ');};
// The author controls lesson additions and bindings; this never approves source text.
export function mountLexicalSettings(host,{getContent,lessonId,onChange,newId=()=>crypto.randomUUID(),importWorkbook}){
 const doc=host.ownerDocument,ctl=new doc.defaultView.AbortController();
 let chosen='',category='verb',scope='all',linkWord='',linkAction='introduce',pending=null,busy=false;
 const targets=new Map();
 // Keep the live region mounted while replacing only the settings body.
 host.innerHTML='<details class="studio-lexical-settings" open><summary>Conjugations introduced in this lesson</summary><div data-lexical-status role="status" aria-atomic="true"></div><div data-lexical-body></div></details>';
 const body=host.querySelector('[data-lexical-body]');
 const message=text=>{host.querySelector('[data-lexical-status]').textContent=text;};
 const current=()=>getContent();
 const change=(fn,success)=>{
  const c=current();c.lexical??=emptyLexical();fn(c.lexical,c);
  const check=validateLexicalContent(c.lexical,lexicalCatalogue(c));
  if(!check.ok)throw new Error(check.errors.map(e=>e.path+' '+e.code).join('; '));
  onChange(c);render();message(success);
 };
 function render(){
  const active=doc.activeElement;
  const focusAttr=body.contains(active)&&['data-lex-category','data-lex-scope','data-lex-target','data-lex-add','data-lex-remove','data-lex-word','data-lex-action','data-lex-bind','data-lex-unbind','data-lex-import-apply'].find(attr=>active.hasAttribute(attr));
  const focusValue=focusAttr?active.getAttribute(focusAttr):null;
  const focusIndex=focusAttr?[...body.querySelectorAll('['+focusAttr+']')].indexOf(active):-1;
  const openPanels=new Map([...body.querySelectorAll('details[data-lex-panel]')].map(panel=>[panel.dataset.lexPanel,panel.open]));
  const c=current(),lex=c.lexical||emptyLexical(),cat=lexicalCatalogue(c),courseId=cat.courses[0].id;
  const local=lex.unlocks.filter(u=>u.courseId===courseId&&u.lessonId===lessonId),words=lex.words.filter(w=>w.category===category);
  const targetOptions=scope==='class'
   ?lex.classes.filter(k=>k.category===category&&isApproved(k.review,k.revision)).map(k=>({id:k.classId,label:k.classId}))
   :scope==='word'?words.map(w=>({id:w.wordKey,label:wordLabel(w)})):[];
  const targetKey=category+':'+scope;
  const target=targetOptions.some(item=>item.id===targets.get(targetKey))?targets.get(targetKey):targetOptions[0]?.id||'';
  targets.set(targetKey,target);
  const noTarget=scope!=='all'&&!target;
  if(!words.some(w=>w.wordKey===chosen))chosen=words[0]?.wordKey||'';
  if(!lex.words.some(w=>w.wordKey===linkWord))linkWord=lex.words[0]?.wordKey||'';
  const groups=[...new Set(SLOT_DEFINITIONS.filter(s=>s.category===category).map(s=>s.group))];
  const options=items=>items.map(i=>'<option value="'+e(i.id)+'">'+e(i.label)+'</option>').join('');
  const targetHelp=noTarget?(scope==='class'?'Review a conjugation class for this category before adding class-scoped forms.':'Add a lexical word in this category before choosing a word scope.') :'';
  body.innerHTML='<p>Choose the forms this lesson introduces. Learners keep forms introduced in earlier lessons. Save with the lesson, then Preview.</p><p>Lesson: '+e(c.lessons.find(l=>l.id===lessonId)?.title)+'</p><fieldset><legend>Add forms in this lesson</legend><label>Category<select data-lex-category>'+options(['verb','adjective','preposition'].map(id=>({id,label:categoryLabel[id]})))+'</select></label><label>Applies to<select data-lex-scope>'+options([{id:'all',label:'All words in category'},{id:'word',label:'One lexical word'},{id:'class',label:'Reviewed conjugation class'}])+'</select></label><label data-lex-target-label>Scope target<select data-lex-target'+(noTarget||scope==='all'?' disabled':'')+'>'+options(targetOptions.length?targetOptions:[{id:'',label:scope==='class'?'No reviewed classes in this category':'No lexical words in this category'}])+'</select><span>'+e(targetHelp)+'</span></label>'+groups.map(g=>'<fieldset><legend>'+e(groupLabel[g]||g)+'</legend><div class="lexical-slot-options">'+SLOT_DEFINITIONS.filter(s=>s.category===category&&s.group===g).map(s=>'<label><input type="checkbox" data-lex-slot value="'+e(s.id)+'"> '+e(slotLabel(s))+'</label>').join('')+'</div></fieldset>').join('')+'<button type="button" data-lex-add'+(noTarget?' disabled':'')+'>Add selected forms to lesson</button></fieldset><h3>New additions in this lesson</h3>'+(local.length?local.map(u=>'<div class="lexical-setting-row"><strong>'+e(u.scope.category+' · '+u.scope.kind+' · '+(u.scope.wordKey||u.scope.classId||'all'))+'</strong><p>'+e(settingLabel(u.slotIds))+'</p><button type="button" data-lex-remove="'+e(u.unlockId)+'">Remove this lesson addition</button></div>').join(''):'<p>No new forms added here.</p>')+'<details data-lex-panel="links"><summary>Lexical lesson links · introduce and reuse</summary><label>Lexical word<select data-lex-word>'+options(lex.words.map(w=>({id:w.wordKey,label:wordLabel(w)})))+'</select></label><label>Link action<select data-lex-action><option value="introduce">Introduce</option><option value="reuse">Reuse</option></select></label><button type="button" data-lex-bind>Add lesson link</button><p>Legacy associations stay as evidence until deliberately bound. Titles come from the course catalogue.</p><div data-lex-links></div></details><label>Lesson-context preview word<select data-lex-preview>'+options(words.map(w=>({id:w.wordKey,label:wordLabel(w)})))+'</select></label><div data-lex-preview-result></div><details data-lex-panel="import"><summary>Import consolidated workbook capture (private draft)</summary><p>Use a hebleo-consolidated-capture-v1 JSON capture. Preview validates the model; adding it preserves existing words and learner records. Source proposals remain pending.</p><label>Capture file<input type="file" accept=".json,application/json" data-lex-file></label><button type="button" data-lex-import-preview>Validate capture</button><pre data-lex-import-summary></pre><button type="button" data-lex-import-apply disabled>Add validated model to workspace</button></details>';
  host.querySelector('[data-lex-category]').value=category;
  host.querySelector('[data-lex-scope]').value=scope;
  host.querySelector('[data-lex-target-label]').hidden=scope==='all';
  host.querySelector('[data-lex-target]').value=target;
  host.querySelector('[data-lex-word]').value=linkWord;
  host.querySelector('[data-lex-action]').value=linkAction;
  host.querySelector('[data-lex-preview]').value=chosen;
  preview();
  for(const panel of body.querySelectorAll('details[data-lex-panel]'))panel.open=openPanels.get(panel.dataset.lexPanel)||false;
  if(focusAttr){
   const peers=[...body.querySelectorAll('['+focusAttr+']')];
   const fallback=focusAttr==='data-lex-remove'?'[data-lex-add]':focusAttr==='data-lex-unbind'?'[data-lex-bind]':focusAttr==='data-lex-import-apply'?'[data-lex-import-preview]':'[data-lex-scope]';
   const next=peers.find(el=>el.getAttribute(focusAttr)===focusValue)||peers[Math.min(focusIndex,peers.length-1)]||body.querySelector(fallback);
   (next?.disabled?body.querySelector('[data-lex-scope]'):next)?.focus({preventScroll:true});
  }
 }
 function preview(){const c=current(),lex=c.lexical||emptyLexical(),d=lessonLexicalDiagnostics(c,lessonId,chosen),r=d.eligibility;
  host.querySelector('[data-lex-preview-result]').innerHTML=r?'<p>Word: '+e(r.wordState)+'</p>'+r.slots.map(s=>'<p data-slot-preview="'+e(s.slotId)+'">'+e(s.slotId)+' · '+e(s.state)+' · '+(s.inherited?'Inherited; ':'')+(s.addedHere?'Added here; ':'')+'source: '+e(s.sourceState)+'</p>').join(''):'<p>No lexical word selected. Legacy content keeps its existing behavior.</p>';
  host.querySelector('[data-lex-links]').innerHTML=d.titles.filter(t=>t.lessonId===lessonId||lex.introductions.find(i=>i.linkId===t.linkId)?.wordKey===chosen).slice(0,50).map(t=>'<p>'+e(lex.introductions.find(i=>i.linkId===t.linkId)?.action)+' · '+e(t.title||t.status)+' · '+e(t.lessonId||'Unconnected legacy reference')+(t.lessonId===lessonId?'<button type="button" data-lex-unbind="'+e(t.linkId)+'">Remove link</button>':'')+'</p>').join('');
 }
 host.addEventListener('change',event=>{
  if(event.target.matches('[data-lex-category]')){category=event.target.value;render();}
  else if(event.target.matches('[data-lex-scope]')){scope=event.target.value;render();}
  else if(event.target.matches('[data-lex-target]'))targets.set(category+':'+scope,event.target.value);
  else if(event.target.matches('[data-lex-word]'))linkWord=event.target.value;
  else if(event.target.matches('[data-lex-action]'))linkAction=event.target.value;
  else if(event.target.matches('[data-lex-preview]')){chosen=event.target.value;preview();}
 },{signal:ctl.signal});
 host.addEventListener('click',async event=>{const b=event.target.closest('button');if(!b||b.disabled||busy)return;
  try{
   if(b.matches('[data-lex-add]')){
    const slotIds=[...host.querySelectorAll('[data-lex-slot]:checked')].map(e=>e.value);
    if(!slotIds.length)throw new Error('Select at least one form.');
    const selectedTarget=host.querySelector('[data-lex-target]').value;
    if(scope!=='all'&&!selectedTarget)throw new Error('Choose a valid word or reviewed class.');
    change((lex,c)=>{const revision=newId();lex.unlocks.push({unlockId:newId(),revision,review:review(revision),courseId:lexicalCatalogue(c).courses[0].id,lessonId,scope:{kind:scope,category,...(scope==='word'?{wordKey:selectedTarget}:scope==='class'?{classId:selectedTarget}:{})},slotIds});},'Selected forms added to this lesson. Save the lesson to stage them.');
   }
   else if(b.matches('[data-lex-remove]'))change(lex=>{lex.unlocks=lex.unlocks.filter(u=>u.unlockId!==b.dataset.lexRemove);},'Lesson addition removed. Save the lesson to stage the change.');
   else if(b.matches('[data-lex-bind]')){
    const wordKey=host.querySelector('[data-lex-word]').value,action=host.querySelector('[data-lex-action]').value;
    if(!wordKey)throw new Error('Select a lexical word.');
    change((lex,c)=>{if(lex.introductions.some(i=>i.wordKey===wordKey&&i.lessonId===lessonId&&i.courseId===lexicalCatalogue(c).courses[0].id&&i.action===action))throw new Error('That lesson link already exists.');const revision=newId();lex.introductions.push({linkId:newId(),wordKey,action,revision,review:review(revision),courseId:lexicalCatalogue(c).courses[0].id,lessonId});},'Lesson link added. Save the lesson to stage it.');
   }
   else if(b.matches('[data-lex-unbind]'))change(lex=>{lex.introductions=lex.introductions.filter(i=>i.linkId!==b.dataset.lexUnbind);},'Lesson link removed. Save the lesson to stage the change.');
   else if(b.matches('[data-lex-import-preview]')){
    const file=host.querySelector('[data-lex-file]').files[0];
    if(!file||!importWorkbook)throw new Error('Choose a capture file; the import service must be connected.');
    if(file.size>20000000)throw new Error('Capture exceeds 20 MB.');
    busy=true;message('Validating capture…');pending=await importWorkbook(JSON.parse(await file.text()));
    host.querySelector('[data-lex-import-summary]').textContent=JSON.stringify(pending.preview,null,2);
    host.querySelector('[data-lex-import-apply]').disabled=false;message('Capture validated. Review the counts before adding it.');
   }
   else if(b.matches('[data-lex-import-apply]')){
    if(!pending)throw new Error('Validate a capture first.');
    change(lex=>{if(lex.words.length)throw new Error('A lexical model already exists. Replacement needs an explicit reconciliation.');Object.assign(lex,pending.lexical);},'Model added to workspace. Save the lesson to stage it.');pending=null;
   }
  }catch(error){if(!ctl.signal.aborted)message(error.message);}finally{busy=false;}
 },{signal:ctl.signal});
 render();return {dispose(){ctl.abort();host.replaceChildren();},refresh:preview};
}
