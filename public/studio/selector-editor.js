import {escapeHTML as e} from './editor-fields.js';
import {mountWordSelector,mountTagSelector} from './vocabulary-browser.js';
import {resolveSelector} from '../course.js';

const modeKeys=['mode','ids','tags','match','lessonId','includeIds','excludeIds'];
export function changeSelectorMode(selector,mode,{lessonId}={}) {
  const extra=Object.fromEntries(Object.entries(selector||{}).filter(([k])=>!modeKeys.includes(k)));
  return {...extra,...(mode==='ids'?{mode,ids:[]}:mode==='tags'?{mode,tags:[],match:'any'}:{mode,lessonId})};
}
// All selector state is reference-only. Unknown existing references/metadata stay visible and preserved.
export function mountSelectorEditor(host,{content,source='words',ownerLessonId,selector,allowLesson=false,onChange=()=>{}}) {
  let current=structuredClone(selector),disposed=false,mounts=[],expanded=false;
  const ctl=new host.ownerDocument.defaultView.AbortController(),listControllers=new Map();
  const items=source==='words'?content.words:content.exercises.filter(x=>x.lessonId===ownerLessonId);
  const words=source==='words'?items:items.map(x=>({...x,english:x.prompt,pointed:x.type,curated:'',unpointed:''}));
  const lessons=content.lessons;
  const tags=[...new Set(items.flatMap(x=>Array.isArray(x.tags)?x.tags:[]))];
  const clear=()=>{mounts.splice(0).forEach(x=>x.dispose());};
  function notify(){onChange(structuredClone(current));showResolution();}
  function showResolution(){
    if(disposed)return;
    const el=host.querySelector('[data-selector-resolution]');
    try{const rows=resolveSelector(content,source,current,ownerLessonId);el.textContent=rows.length+' resolved references · '+rows.slice(0,50).map(x=>x.id).join(', ')+(rows.length>50?' …':'');}
    catch(error){el.textContent=error.message;}
  }
  function selectedList(container,key){
    listControllers.get(container)?.abort();const listCtl=new host.ownerDocument.defaultView.AbortController();listControllers.set(container,listCtl);
    const ids=current[key]||[];
    container.innerHTML='<label>Find a selected ID<input type="search" data-selected-search></label><div data-selected-results></div><p data-selected-count></p>';
    const render=()=>{const q=container.querySelector('input').value.toLowerCase(),shown=(current[key]||[]).filter(id=>id.toLowerCase().includes(q));container.querySelector('[data-selected-results]').innerHTML=shown.slice(0,50).map(id=>'<button type="button" data-remove-id="'+e(id)+'">Remove '+e(id)+(items.some(w=>w.id===id)?'':' (unresolved)')+'</button>').join('');container.querySelector('[data-selected-count]').textContent=ids.length+' stored IDs · '+shown.length+' match (up to 50 shown)';};
    container.addEventListener('input',render,{signal:listCtl.signal});
    container.addEventListener('click',ev=>{const b=ev.target.closest('[data-remove-id]');if(b){current[key]=current[key].filter(id=>id!==b.dataset.removeId);notify();draw();}},{signal:listCtl.signal});render();
  }
  function picker(container,key){
    mounts.push(mountWordSelector(container,{words,lessons,selectedIds:current[key]||[],onSelectionChange:ids=>{current[key]=ids;notify();const chosen=host.querySelector('[data-chosen="'+key+'"]');if(chosen)selectedList(chosen,key);}}));
  }
  function draw(){
    if(disposed)return;clear();
    host.innerHTML='<section class="studio-selector"><label>Selection method<select data-selector-mode>'+[['ids','Specific IDs'],['tags','Tags'],...(allowLesson?[['lesson','Lesson vocabulary']]:[])].map(([v,t])=>'<option value="'+v+'"'+(current.mode===v?' selected':'')+'>'+t+'</option>').join('')+'</select></label><details '+(expanded?' open':'')+'><summary>Choose references</summary><div data-selector-body></div></details><p role="status" data-selector-resolution></p></section>';
    const body=host.querySelector('[data-selector-body]');
    if(current.mode==='ids'){body.innerHTML='<div data-ids-picker></div><div data-chosen="ids"></div>';picker(body.querySelector('[data-ids-picker]'),'ids');selectedList(body.querySelector('[data-chosen]'),'ids');}
    else if(current.mode==='tags'){
      body.innerHTML='<label>Match<select data-selector-match><option value="any">Any selected tag</option><option value="all">Every selected tag</option></select></label><div data-tags-picker></div><details><summary>Include specific IDs</summary><div data-include-picker></div><div data-chosen="includeIds"></div></details><details><summary>Exclude specific IDs</summary><div data-exclude-picker></div><div data-chosen="excludeIds"></div></details>';
      body.querySelector('[data-selector-match]').value=current.match;
      mounts.push(mountTagSelector(body.querySelector('[data-tags-picker]'),{tags,selectedTags:current.tags,onChange:tags=>{current.tags=tags;notify();}}));
      picker(body.querySelector('[data-include-picker]'),'includeIds');picker(body.querySelector('[data-exclude-picker]'),'excludeIds');
      selectedList(body.querySelector('[data-chosen="includeIds"]'),'includeIds');selectedList(body.querySelector('[data-chosen="excludeIds"]'),'excludeIds');
    }else {body.innerHTML='<label>Vocabulary lesson<select data-selector-lesson>'+lessons.map(l=>'<option value="'+e(l.id)+'">'+e(l.title)+' ('+e(l.id)+')</option>').join('')+'</select></label>';body.querySelector('select').value=current.lessonId;}
    showResolution();
  }
  host.addEventListener('change',ev=>{if(ev.target.matches('[data-selector-mode]')){expanded=true;current=changeSelectorMode(current,ev.target.value,{lessonId:ownerLessonId||lessons[0]?.id});notify();draw();}else if(ev.target.matches('[data-selector-match]')){current.match=ev.target.value;notify();}else if(ev.target.matches('[data-selector-lesson]')){current.lessonId=ev.target.value;notify();}},{signal:ctl.signal});
  draw();return {getValue:()=>structuredClone(current),dispose(){disposed=true;ctl.abort();listControllers.forEach(c=>c.abort());clear();host.replaceChildren();}};
}
