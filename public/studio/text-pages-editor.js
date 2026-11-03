import {escapeHTML as e} from './editor-fields.js';
const types=['reading','choice','recall','timedRecall','vocabulary','complete'];
const field=(name,label,value,{area=false,type='text',hint=''}={})=>'<label>'+e(label)+(area?'<textarea style="resize:none" rows="4" data-page-field="'+name+'" dir="auto">'+e(value)+'</textarea>':'<input type="'+type+'" data-page-field="'+name+'" value="'+e(value)+'">')+(hint?'<small>'+e(hint)+'</small>':'')+'</label>';
const button=(name,label,disabled=false)=>'<button type="button" class="button small secondary" data-page-action="'+name+'" '+(disabled?'disabled':'')+'>'+label+'</button>';
export function moveTextPage(value,id,delta){const next=structuredClone(value),index=next.order.indexOf(id),target=index+delta;if(index>=0&&target>=0&&target<next.order.length)[next.order[index],next.order[target]]=[next.order[target],next.order[index]];return next;}

export function mountTextPagesEditor(host,{value,wordIds=[],targetIds=[],onChange=()=>{},newId=()=> 'page-'+crypto.randomUUID()}={}) {
  let data=value?structuredClone(value):{version:1,pages:[],order:[]},selected=data.order[0],removed=[],disposed=false;
  const doc=host.ownerDocument,ctl=new doc.defaultView.AbortController();
  const page=()=>data.pages.find(p=>p.id===selected);
  const select=(name,label,values,current)=>'<label>'+label+'<select data-page-field="'+name+'">'+values.map(v=>'<option value="'+e(v)+'" '+(v===current?'selected':'')+'>'+e(v)+'</option>').join('')+'</select></label>';
  function status(message){host.querySelector('[data-pages-status]').textContent=message;}
  function collect(){
    const p=page();if(!p)return;
    const next=structuredClone(p);
    for(const el of host.querySelectorAll('[data-page-field]')) {
      if(!el.dataset.dirty)continue;const name=el.dataset.pageField;
      try {
        if(name==='durationMs'){const n=Number(el.value);if(!Number.isInteger(n)||n<100||n>120000)throw new Error('Enter whole milliseconds from 100 to 120000.');next[name]=n;}
        else if(name==='answer'&&next.type==='choice'){const n=Number(el.value)-1;if(!Number.isInteger(n)||n<0||n>=(next.options||[]).length)throw new Error('Choose an answer number within the options.');next.answer=n;}
        else if(name==='options'){const options=el.value.split('\n').filter(x=>x.trim());if(options.length<2||options.length>20)throw new Error('Enter 2–20 options, one per line.');next.options=options;}
        else if(name==='wordIds'){const ids=el.value.split(/[\s,]+/).filter(Boolean);if(ids.some(id=>!wordIds.includes(id)))throw new Error('Use existing canonical word IDs.');next.wordIds=[...new Set(ids)];}
        else if(name==='unresolvedTargetIds'){const ids=el.value.split(/[\s,]+/).filter(Boolean);if(ids.some(id=>!targetIds.includes(id)))throw new Error('Use existing draft target IDs.');next.unresolvedTargetIds=[...new Set(ids)];}
        else if(name==='activity'){const activity=JSON.parse(el.value);if(!activity||typeof activity!=='object'||Array.isArray(activity))throw new Error('Enter the authored activity object.');next.activity=activity;}
        else if(name==='media'){const media=el.value.trim()?JSON.parse(el.value):undefined;if(media!==undefined&&(!media||typeof media!=='object'||Array.isArray(media)))throw new Error('Enter a media object, or leave empty.');if(media)next.media=media;else delete next.media;}
        else next[name]=el.value;
        el.removeAttribute('aria-invalid');
      }catch(error){el.setAttribute('aria-invalid','true');el.setAttribute('aria-describedby','text-pages-error-'+host.dataset.editorId);status(error.message);throw error;}
    }
    if(next.type==='choice'&&(!Number.isInteger(next.answer)||next.answer<0||next.answer>=next.options.length))throw new Error('Choose an answer number within the options.');
    if(next.type==='timedRecall'&&(!next.value||typeof next.value!=='string'))throw new Error('Enter the exact timed value as text.');
    data.pages[data.pages.findIndex(x=>x.id===p.id)]=next;
    return next;
  }
  function changed(){onChange(structuredClone(data));}
  function render(focus){
    if(disposed)return;const p=page(),i=data.order.indexOf(selected);
    host.innerHTML='<details class="text-pages-editor" '+(data.pages.length?'open':'')+'><summary>Interactive text pages ('+data.pages.length+')</summary><p>Pages stay inside this explanation. Reordering preserves page identity and saved learner responses.</p><div class="button-row">'+button('add','Add page')+button('undo','Restore removed page',!removed.length)+'</div>'+(p?'<label>Page to edit<select data-page-select>'+data.order.map((id,n)=>'<option value="'+e(id)+'" '+(id===selected?'selected':'')+'>'+(n+1)+'. '+e(data.pages.find(x=>x.id===id)?.title||id)+'</option>').join('')+'</select></label><p class="text-page-id">Stable page ID: <code>'+e(p.id)+'</code></p><div class="button-row">'+button('up','Move page up',i===0)+button('down','Move page down',i===data.order.length-1)+button('remove','Remove page')+'</div><div class="text-page-fields">'+select('type','Page type',types,p.type)+field('title','Page title',p.title)+select('gate','Continue rule',['none','commit','reveal'],p.gate||'none')+field('html','Teaching text (Markdown or HTML)',p.html,{area:true})+field('prompt','Prompt',p.prompt,{area:true})+(p.type==='choice'?field('options','Options · one per line',(p.options||[]).join('\n'),{area:true})+field('answer','Correct option number',(p.answer??0)+1,{type:'number'})+field('explanation','Feedback explanation',p.explanation,{area:true}):'')+(['recall','timedRecall'].includes(p.type)?field('answer','Illustrative model answer',p.answer,{area:true,hint:'Written attempt required. This is self-check, not exact-match grading.'}):'')+(p.type==='timedRecall'?field('value','Timed value · exact text',p.value,{hint:'Leading zeroes are preserved.'})+field('durationMs','Display duration (milliseconds)',p.durationMs,{type:'number',hint:'100–120000 milliseconds. Play is always learner-controlled; untimed study is available.'}):'')+(p.type==='vocabulary'?field('wordIds','Canonical word IDs',(p.wordIds||[]).join('\n'),{area:true,hint:'Existing vocabulary references only; no new word records are created.'})+field('unresolvedTargetIds','Pending draft target IDs',(p.unresolvedTargetIds||[]).join('\n'),{area:true}):'')+(p.activity?field('activity','Authored interaction (JSON)',JSON.stringify(p.activity,null,2),{area:true,hint:'Exact interaction settings, feedback and local media references. Learner and Preview share this activity.'}):'')+field('media','Native media references (JSON)',p.media?JSON.stringify(p.media,null,2):'',{area:true,hint:'Optional {"audio": reference, "video": reference}. Existing safe media rules apply.'})+'</div><details><summary>Retained source metadata</summary><pre>'+e(JSON.stringify(Object.fromEntries(Object.entries(p).filter(([k])=>['sourceRefs','provenance','sourceStage'].includes(k))),null,2))+'</pre></details>':'<p>Add a reading, choice, recall, timed recall, vocabulary or reflection page. Legacy teaching text remains available when there are no pages.</p>')+'<p data-pages-status id="text-pages-error-'+host.dataset.editorId+'" role="status"></p></details>';
    if(focus)host.querySelector(focus)?.focus({preventScroll:true});
  }
  host.dataset.editorId=doc.defaultView.crypto.randomUUID();
  host.addEventListener('input',event=>{if(event.target.matches('input[data-page-field],textarea[data-page-field]')){event.target.dataset.dirty='true';try{collect();changed();status('Unsaved page edits. Save the workspace draft.');}catch{}}},{signal:ctl.signal});
  host.addEventListener('change',event=>{
    if(event.target.matches('[data-page-select]')){try{collect();selected=event.target.value;render('[data-page-select]');}catch{event.target.value=selected;}}
    else if(event.target.matches('[data-page-field="type"],[data-page-field="gate"]')){
      const el=event.target;try{const p=collect();p[el.dataset.pageField]=el.value;if(p.type==='choice'){p.options??=['Option 1','Option 2'];if(!Number.isInteger(p.answer))p.answer=0;}if(['recall','timedRecall'].includes(p.type)){p.grading='self-check';if(typeof p.answer!=='string')p.answer='';}if(p.type==='timedRecall'){p.durationMs??=10000;p.value??='';p.accessibleAlternative=true;}if(p.type==='vocabulary'){p.wordIds??=[];p.unresolvedTargetIds??=[];}changed();render('[data-page-field="'+el.dataset.pageField+'"]');}catch{}}
  },{signal:ctl.signal});
  host.addEventListener('click',event=>{
    const el=event.target.closest('[data-page-action]');if(!el||el.disabled)return;event.preventDefault();event.stopPropagation();
    try{collect();const a=el.dataset.pageAction;
      if(a==='add'){const id=newId();if(data.pages.some(p=>p.id===id))throw new Error('Page ID already exists.');data.pages.push({id,type:'reading',title:'New page',html:'',gate:'none'});data.order.push(id);selected=id;}
      if(a==='up'||a==='down')data=moveTextPage(data,selected,a==='up'?-1:1);
      if(a==='remove'){removed.push({page:page(),index:data.order.indexOf(selected)});data.pages=data.pages.filter(p=>p.id!==selected);data.order=data.order.filter(id=>id!==selected);selected=data.order[Math.min(data.order.length-1,iSafe())];}
      if(a==='undo'){const item=removed.pop();if(item){data.pages.push(item.page);data.order.splice(item.index,0,item.page.id);selected=item.page.id;}}
      changed();render(a==='add'?'[data-page-field="title"]':'[data-page-select]');status('Unsaved page edits. Save the workspace draft.');
    }catch(error){status(error.message);host.querySelector('[aria-invalid="true"]')?.focus();}
  },{signal:ctl.signal});
  function iSafe(){return removed.at(-1)?.index||0;}
  render();
  return {getValue(){collect();return data.pages.length?structuredClone(data):undefined;},dispose(){disposed=true;ctl.abort();host.replaceChildren();}};
}
