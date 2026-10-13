import {escapeHTML as e,field,draftSaveError} from './editor-fields.js';
import {projectLesson,deriveLessonIndices,resolveComponent,keyboardForLesson,introductionWarnings,validateCurriculum,validateLessonComposition} from '../course.js';
import {mountMarkdownEditor} from './markdown-editor.js';
import {mountVocabularyBrowser,mountTagSelector} from './vocabulary-browser.js';
import {mountSelectorEditor} from './selector-editor.js';
import {mountExerciseEditor,applyExerciseEdits,exerciseTypes,blankExercise,validateExerciseDraft} from './exercise-editor.js';
import {mountCurriculumEditor} from './curriculum-editor.js';

export function prepareStudioContent(content){
 const next=structuredClone(content);
 next.lessons=next.lessons.map(l=>deriveLessonIndices(next,l));
 validateCurriculum(next);for(const l of next.lessons)validateLessonComposition(next,l);return next;
}
export function moveComponent(lesson,id,target){
 const next=structuredClone(lesson),i=next.blocks.findIndex(b=>b.id===id);if(i<0)throw new Error('Component not found.');
 const [block]=next.blocks.splice(i,1);next.blocks.splice(Math.max(0,Math.min(next.blocks.length,target)),0,block);return next;
}
export function mountComponentDrag(host,{onMove,onStart=()=>{}}){
 const ctl=new host.ownerDocument.defaultView.AbortController();let drag=null;
 const doc=host.ownerDocument;
 host.addEventListener('pointerdown',ev=>{const handle=ev.target.closest('[data-component-drag]');if(!handle||ev.button!==0)return;onStart();drag={id:handle.dataset.componentDrag,x:ev.clientX,y:ev.clientY,pointer:ev.pointerId};handle.setPointerCapture?.(ev.pointerId);},{signal:ctl.signal});
 doc.addEventListener('pointerup',ev=>{if(!drag||ev.pointerId!==drag.pointer)return;const current=drag;drag=null;if(Math.hypot(ev.clientX-current.x,ev.clientY-current.y)<6)return;
 const rows=[...host.querySelectorAll('[data-component-id]')],source=rows.findIndex(r=>r.dataset.componentId===current.id);
 let target=rows.findIndex(r=>ev.clientY<r.getBoundingClientRect().top+r.getBoundingClientRect().height/2);if(target<0)target=rows.length;
 if(target>source)target--;if(target!==source)onMove(current.id,target);
 },{signal:ctl.signal});doc.addEventListener('pointercancel',()=>drag=null,{signal:ctl.signal});return ()=>ctl.abort();
}

// One content snapshot, one CAS save. All sibling editors contribute patches before any save.
export function mountUnifiedStudio(host,{content,lessonId,baseRevisionId,expectedDraftToken=null,saveDraft,onSaved=()=>{},onLessonSelect=()=>{},onChanged=()=>{},getExerciseDependencies,getWorkspaceImpact,newId=prefix=>prefix+'-'+crypto.randomUUID(),markdownDependencies}){
 let workspace=structuredClone(content),selected=lessonId||workspace.lessons[0]?.id,disposed=false,saving=false,dirty=false,children=[],exerciseMounts=[],wordId=workspace.words[0]?.id,wordOriginal=null,layout=false;
 const dependencyRequests=new WeakMap(),saveWaiters=[];
 const ctl=new host.ownerDocument.defaultView.AbortController(),doc=host.ownerDocument;
 const status=message=>{const el=host.querySelector('[data-unified-status]');if(el)el.textContent=message;};
 const touch=()=>{dirty=true;onChanged();host.querySelector('[data-unsaved-status]').textContent='Unsaved workspace edits. Save includes lesson, component, exercise and vocabulary edits.';};
 const clearChildren=()=>{children.splice(0).forEach(x=>typeof x==='function'?x():x.dispose());exerciseMounts=[];};
 function lesson(){return workspace.lessons.find(l=>l.id===selected);}
 function collect(){
  // Metadata is in a separate form; authored exercise forms are never nested.
  const meta=host.querySelector('[data-lesson-metadata]');if(meta){const l=lesson();for(const name of ['title','estimatedMinutes'])if(meta.elements[name]?.dataset.dirty)l[name]=name==='estimatedMinutes'?Number(meta.elements[name].value):meta.elements[name].value;
   if(meta.elements.introducedLetters?.dataset.dirty)l.introducedLetters=meta.elements.introducedLetters.value;
  }
  const policy=host.querySelector('[data-review-policy]');if(policy?.dataset.dirty)workspace.reviewPolicy={...workspace.reviewPolicy,defaultNikkud:policy.value};
  const color=host.querySelector('[data-keyboard-color]');if(color?.dataset.dirty)lesson().keyboard={...lesson().keyboard,newColor:color.value};
  for(const {id,mount} of exerciseMounts){const edits=mount.getEdits();if(Object.keys(edits).length){const index=workspace.exercises.findIndex(x=>x.id===id);workspace.exercises[index]=applyExerciseEdits(workspace.exercises[index],edits);}}
  const form=host.querySelector('[data-canonical-word]');if(form&&wordOriginal){
   const word=workspace.words.find(w=>w.id===wordId);for(const name of ['pointed','unpointed','curated','english','notes'])if(form.elements[name]?.dataset.dirty)word[name]=form.elements[name].value;
   if(form.elements.richFields?.dataset.dirty){const extra=JSON.parse(form.elements.richFields.value||'{}');if(!extra||Array.isArray(extra)||typeof extra!=='object'||Object.keys(extra).some(k=>['id','pointed','unpointed','curated','english','notes','__proto__','prototype','constructor'].includes(k)))throw new Error('Additional fields need a JSON object without core or reserved fields.');
    // Explicit advanced replacement only touches the authored extra-field set, preserving core identity/forms.
    for(const key of Object.keys(word))if(!['id','pointed','unpointed','curated','english','notes'].includes(key))delete word[key];Object.assign(word,extra);
   }
  }
  return structuredClone(workspace);
 }
 function ensureProjection(){const index=workspace.lessons.findIndex(l=>l.id===selected);workspace.lessons[index]=projectLesson(workspace,workspace.lessons[index]);}
 function keyboard(){
  try{const c=collect(),k=keyboardForLesson(c,selected),warnings=introductionWarnings(c);host.querySelector('[data-keyboard-preview]').innerHTML='<p>Previously introduced: <bdi dir="rtl">'+e(k.knownKeys||'')+'</bdi></p><p>New in this lesson: <bdi dir="rtl">'+e(k.newKeys||'')+'</bdi></p><p>Available: <bdi dir="rtl">'+e(k.availableKeys||((k.knownKeys||'')+(k.newKeys||'')))+'</bdi></p>'+warnings.slice(0,50).map(w=>'<p>'+e(w)+'</p>').join('');}catch(err){status(err.message);}
 }
 function exerciseActions(after){
  return '<section class="studio-exercise-actions" data-exercise-actions="'+e(after)+'"><button type="button" data-add-text>Add text</button><label>New exercise type<select data-new-exercise-type>'+exerciseTypes.map(type=>'<option value="'+type+'">'+type+'</option>').join('')+'</select></label><button type="button" data-create-exercise>Add exercise</button><details><summary>Reuse existing exercise</summary><label>Canonical exercise<select data-reuse-choice>'+workspace.exercises.map(x=>'<option value="'+e(x.id)+'">'+e(x.type+' · '+(x.prompt||'(blank prompt)')+' · '+x.id+' · source lesson '+x.lessonId)+'</option>').join('')+'</select></label><p data-reuse-scope></p><label data-cross-lesson-label hidden><input type="checkbox" data-cross-lesson-confirm> Deliberately reference this exercise from another lesson. It keeps the same canonical ID; server membership validation still applies.</label><button type="button" data-reuse-exercise>Reuse selected exercise here</button></details></section>';
 }
 function affectedLessons(id){
  return workspace.lessons.filter(l=>l.exerciseIds?.includes(id)||l.checkExerciseIds?.includes(id)||l.blocks?.some(b=>b.source==='exercises'&&(b.selector?.ids?.includes(id)||b.selector?.includeIds?.includes(id)||b.selector?.mode==='tags'&&(()=>{try{return resolveComponent(workspace,l,b).some(x=>x.id===id);}catch{return false;}})())));
 }
 // Optional Lead callback: receives {exerciseId,baseRevisionId,expectedDraftToken,signal}.
 // Returns {exerciseId,lessons:[{id,title}],lessonCount,componentCount,activeRevisionId,draftToken}.
 // Scope is displayed separately from draft-local memberships; no endpoint is invented here.
 async function dependencyNotice(el,id){
  const request=(dependencyRequests.get(el)||0)+1;dependencyRequests.set(el,request);const local=affectedLessons(id);el.textContent='Shared canonical exercise '+id+' · current workspace affected lessons: '+local.map(l=>l.title+' ('+l.id+')').join(', ')+'. Edits apply to every reference after deliberate publication.';
  if(!getExerciseDependencies){el.textContent+=' Server dependency counts are unavailable in this mount.';return;}
  try{const result=await getExerciseDependencies({exerciseId:id,baseRevisionId,expectedDraftToken,signal:ctl.signal});if(disposed||!el.isConnected||dependencyRequests.get(el)!==request)return;
   if(result?.exerciseId!==id||!Array.isArray(result.lessons)||result.lessons.some(l=>typeof l.id!=='string'||typeof l.title!=='string')||!Number.isInteger(result.lessonCount)||result.lessonCount!==result.lessons.length||!Number.isInteger(result.componentCount)||result.componentCount<0)throw new Error('Invalid dependency callback result.');
   el.textContent+=' Server scope: '+result.lessonCount+' lessons, '+result.componentCount+' component references: '+result.lessons.map(l=>l.title+' ('+l.id+')').join(', ')+' · active revision '+result.activeRevisionId+' · draft token '+(result.draftToken??'none')+'.';
  }catch(err){if(!disposed&&el.isConnected&&dependencyRequests.get(el)===request)el.textContent+=' Server dependencies could not be refreshed: '+err.message;}
 }
 function showReuseScope(actions){const x=workspace.exercises.find(x=>x.id===actions.querySelector('[data-reuse-choice]').value);if(!x)return;const foreign=x.lessonId!==selected;actions.querySelector('[data-cross-lesson-label]').hidden=!foreign;actions.querySelector('[data-cross-lesson-confirm]').checked=false;dependencyNotice(actions.querySelector('[data-reuse-scope]'),x.id);}
 function focusExercise(id){if(layout){layout=false;renderLesson();}const owner=[...host.querySelectorAll('[data-owned-exercise]')].find(el=>el.dataset.ownedExercise===id);if(!owner)return;owner.closest('details').open=true;owner.querySelector('[name=prompt]').focus();}
 function insertBlock(l,block,after){const next=structuredClone(l),index=after?next.blocks.findIndex(b=>b.id===after)+1:next.blocks.length;next.blocks.splice(index,0,block);return next;}
 function addExercise(actions,reuse=false){
  mutateLesson(l=>{let x;if(reuse){x=workspace.exercises.find(x=>x.id===actions.querySelector('[data-reuse-choice]').value);if(!x)throw new Error('Choose an existing exercise.');if(x.lessonId!==selected&&!actions.querySelector('[data-cross-lesson-confirm]').checked)throw new Error('Confirm deliberate cross-lesson reuse before adding the reference.');}
   else{x=blankExercise(actions.querySelector('[data-new-exercise-type]').value,{id:newId('exercise'),lessonId:selected});if(workspace.exercises.some(e=>e.id===x.id))throw new Error('New exercise ID already exists.');}
   const id=newId('component');if(l.blocks.some(b=>b.id===id))throw new Error('New component ID already exists.');
   if(!reuse)workspace.exercises.push(x);return insertBlock(l,{id,type:'exercise-set',source:'exercises',renderer:'practice',role:actions.dataset.exerciseActions&&l.blocks.find(b=>b.id===actions.dataset.exerciseActions)?.type==='explanation'?'check':'apply',selector:{mode:'ids',ids:[x.id]}},actions.dataset.exerciseActions);
  });
 }
 function renderLesson(){
  clearChildren();ensureProjection();const l=lesson(),area=host.querySelector('[data-lesson-workspace]');
  area.innerHTML='<form id="studio-lesson-metadata" data-lesson-metadata><header class="studio-selected-header"><div class="studio-title-slot">'+(layout?'<h2 dir="auto">'+e(l.title)+'</h2>':'<label class="studio-inline-title"><span>Lesson title · edit here <span aria-hidden="true">✎</span></span><textarea name="title" dir="auto" rows="2" aria-describedby="studio-title-hint">'+e(l.title)+'</textarea><small id="studio-title-hint">Edit the title where it appears. It can wrap onto multiple lines.</small></label>')+'<small>'+e(l.id)+'</small></div><button type="button" data-view-layout aria-pressed="'+layout+'">'+(layout?'Edit layout':'View layout')+'</button><button type="button" data-save-workspace>Save lesson & all workspace edits</button></header>'+field('estimatedMinutes','Duration (minutes)',l.estimatedMinutes,{type:'number'})+'</form><div data-component-list>'+l.blocks.map((b,i)=>'<article class="studio-component" data-component-id="'+e(b.id)+'"><header><h3>'+ (i+1)+'. '+e(b.type==='explanation'?'Authored text':b.type==='vocabulary'?'Vocabulary':'Exercises')+'</h3><small>Instance '+e(b.id)+'</small><div class="button-row"><button type="button" data-component-drag="'+e(b.id)+'" aria-label="Drag component '+e(b.id)+'; move buttons are also available">Drag</button><button type="button" data-component-move="'+e(b.id)+'" data-delta="-1"'+(i===0?' disabled':'')+'>Move up</button><button type="button" data-component-move="'+e(b.id)+'" data-delta="1"'+(i===l.blocks.length-1?' disabled':'')+'>Move down</button><button type="button" data-component-remove="'+e(b.id)+'">Remove component reference</button></div></header>'+(b.type==='explanation'?'<div data-layout-text dir="'+e(b.options?.textDirection||'auto')+'">'+e(b.text)+'</div><div data-component-markdown></div><details data-text-source><summary>Authored media and interactions (preserve existing source)</summary>'+field('video','Video reference JSON',JSON.stringify(b.video??null,null,2),{multiline:true})+field('interactions','Inline interactions JSON',JSON.stringify(b.interactions||[],null,2),{multiline:true})+'</details>':(b.type==='exercise-set'?'<label data-role-control>Exercise role<select data-component-role><option value="check">Check</option><option value="apply">Apply</option></select></label>':'')+'<div data-component-selector></div><div data-component-exercises></div>')+(b.type==='vocabulary'?'':exerciseActions(b.id))+'</article>').join('')+'</div>'+exerciseActions('')+'<details class="studio-component-add"><summary>Other component operations</summary><label>Add component<select data-new-component><option value="explanation">Authored text</option><option value="vocabulary">Vocabulary</option><option value="exercise-set">Exercise set</option></select></label><button type="button" data-add-component>Add component instance</button></details><section class="studio-lesson-vocabulary"><h3>Lesson vocabulary membership</h3><p>Select stable IDs or tags. Derived indices are generated before saving; words stay canonical.</p><div data-lesson-vocabulary-selector></div></section><details class="studio-cumulative-letters" open><summary>Keyboard configuration · below lesson content</summary>'+field('introducedLetters','Letters introduced in this lesson',l.introducedLetters,{form:'studio-lesson-metadata',hint:l.introducedLetters===undefined?'Missing explicit source evidence. Enter the intended letters or explicitly confirm an empty set.':'Legacy newKeys projects exactly on read; original keyboard metadata is retained.'})+(l.introducedLetters===undefined?'<button type="button" data-empty-introductions>Confirm no introduced letters</button>':'')+'<div data-keyboard-preview></div><label>New letter highlight color<input data-keyboard-color type="color" value="'+e(l.keyboard?.newColor||'#00a9ca')+'"></label></details>';
  area.classList.toggle('studio-view-layout',layout);
  const selector=mountSelectorEditor(area.querySelector('[data-lesson-vocabulary-selector]'),{content:workspace,selector:l.vocabularySelector||{mode:'ids',ids:[...l.wordIds]},onChange:value=>{l.vocabularySelector=value;try{Object.assign(l,deriveLessonIndices(workspace,l));}catch{}touch();}});children.push(selector);
  const renderedExercises=new Set();
  for(const b of l.blocks){const row=area.querySelector('[data-component-id="'+b.id+'"]');
   if(b.type==='explanation'){
    const markdown=mountMarkdownEditor(row.querySelector('[data-component-markdown]'),{value:b.text,direction:b.options?.textDirection||'auto',label:'Authored text · '+b.id,name:'text-'+b.id,dependencies:markdownDependencies,onChange:value=>{b.text=value;touch();},onDirectionChange:direction=>{b.options={...b.options,textDirection:direction};touch();}});children.push(markdown);markdown.ready.then(editor=>{const preview=row.querySelector('[data-layout-text]');if(editor&&preview.isConnected)preview.innerHTML=editor.options.previewRender(markdown.getValue());});
    row.querySelectorAll('[name="video"],[name="interactions"]').forEach(el=>el.addEventListener('input',()=>{el.dataset.dirty='true';touch();},{signal:ctl.signal}));
   }else{
    children.push(mountSelectorEditor(row.querySelector('[data-component-selector]'),{content:workspace,source:b.source,ownerLessonId:selected,selector:b.selector,allowLesson:b.source==='words',onChange:value=>{try{collectAll();b.selector=value;touch();renderLesson();}catch(err){status(err.message);}}}));
    if(b.type==='exercise-set'){row.querySelector('[data-component-role]').value=b.role;refreshExercises(row,b,renderedExercises);}
   }
  }
  const drag=mountComponentDrag(area.querySelector('[data-component-list]'),{onStart:()=>{try{collectAll();}catch(err){status(err.message);}} ,onMove:(id,target)=>mutateLesson(l=>moveComponent(l,id,target))});children.push(drag);
  area.querySelectorAll('[data-exercise-actions]').forEach(showReuseScope);keyboard();
 }
 function collectAll(){
  collect();for(const row of host.querySelectorAll('[data-component-id]')){const b=lesson().blocks.find(x=>x.id===row.dataset.componentId);if(b?.type!=='explanation')continue;
   for(const name of ['video','interactions']){const el=row.querySelector('[name="'+name+'"]');if(el?.dataset.dirty){const value=JSON.parse(el.value);if(name==='video'&&value===null)delete b.video;else b[name]=value;}}
  }return structuredClone(workspace);
 }
 function refreshExercises(row,b,seen){
  const existing=exerciseMounts.filter(x=>row.contains(x.container));for(const x of existing)x.mount();exerciseMounts=exerciseMounts.filter(x=>!existing.includes(x));
  const target=row.querySelector('[data-component-exercises]');target.innerHTML='';
  let exercises;try{exercises=resolveComponent(workspace,lesson(),b);}catch(err){const message=doc.createElement('p');message.textContent=err.message+' Cross-lesson grading and saving require Lead membership integration.';target.append(message);if(b.selector?.mode!=='ids')return;exercises=b.selector.ids.map(id=>workspace.exercises.find(x=>x.id===id)).filter(Boolean);}
  for(const exercise of exercises){
   if(seen.has(exercise.id)){const p=doc.createElement('p');p.innerHTML='Shared canonical exercise '+e(exercise.id)+' · <button type="button" data-edit-exercise="'+e(exercise.id)+'">Edit exercise at its owning component</button>';target.append(p);continue;}seen.add(exercise.id);
   const details=doc.createElement('details');details.open=true;details.className='studio-owned-exercise';details.innerHTML='<summary>'+e(exercise.type+' · '+(exercise.prompt||'Blank exercise — author input required'))+'</summary><button type="button" data-edit-exercise="'+e(exercise.id)+'">Edit exercise</button><p data-exercise-dependencies></p><p data-layout-prompt dir="auto">'+e(exercise.prompt)+'</p>';
   target.append(details);dependencyNotice(details.querySelector('[data-exercise-dependencies]'),exercise.id);
   const el=doc.createElement('div');el.dataset.ownedExercise=exercise.id;details.append(el);
   const mount=mountExerciseEditor(el,{content:workspace,exerciseId:exercise.id,baseRevisionId,expectedDraftToken,saveWorkspace:stage,onChanged:touch});
   el.querySelector('[type="submit"]').textContent='Save lesson & exercise edits';exerciseMounts.push({id:exercise.id,mount,container:el});children.push(mount);
  }
 }
 function mutateLesson(fn){if(saving)return;try{collectAll();const index=workspace.lessons.findIndex(l=>l.id===selected);workspace.lessons[index]=fn(lesson());touch();renderLesson();}catch(err){status(err.message);}}
 function renderWord(){
  const w=workspace.words.find(w=>w.id===wordId);if(!w)return;wordOriginal=structuredClone(w);
  const area=host.querySelector('[data-word-editor]');area.innerHTML='<details><summary>Canonical word · '+e(w.id)+' · '+e(w.english)+'</summary><form data-canonical-word>'+['pointed','unpointed','curated','english','notes'].map(name=>field(name,name,w[name],{multiline:name==='notes'})).join('')+field('richFields','Additional source fields (JSON)',JSON.stringify(Object.fromEntries(Object.entries(w).filter(([k])=>!['id','pointed','unpointed','curated','english','notes'].includes(k))),null,2),{multiline:true})+'<button type="submit">Save word & all workspace edits</button></form></details>';
 }
 const disabledState=new Map();
 function lock(value){host.setAttribute('aria-busy',String(value));if(value){for(const el of host.querySelectorAll('input,textarea,select,button')){disabledState.set(el,el.disabled);el.disabled=true;}host.querySelectorAll('.CodeMirror').forEach(el=>el.CodeMirror?.setOption('readOnly','nocursor'));}
 else{for(const [el,was] of disabledState)if(el.isConnected)el.disabled=was;disabledState.clear();host.querySelectorAll('.CodeMirror').forEach(el=>el.CodeMirror?.setOption('readOnly',false));}}
 async function stage(){
  if(saving)throw new Error('The previous workspace save is still reloading.');
  let next;try{const collected=collectAll();for(const exercise of collected.exercises)validateExerciseDraft(exercise,collected);next=prepareStudioContent(collected);}catch(err){if(err.exerciseId)focusExercise(err.exerciseId);status(err.message+' · All entered values retained.');throw err;}saving=true;lock(true);status('Saving every workspace edit and reloading the saved draft…');
  try{if(getExerciseDependencies)await Promise.all(exerciseMounts.filter(({mount})=>Object.keys(mount.getEdits()).length).map(({id,container})=>dependencyNotice(container.parentElement.querySelector('[data-exercise-dependencies]'),id)));let reviewedDraftToken;
   if(getWorkspaceImpact){const impact=await getWorkspaceImpact({baseRevisionId,expectedDraftToken,content:next});const notice=host.querySelector('[data-workspace-impact]');notice.textContent='Server-checked impact: '+impact.affectedLessons.map(l=>l.title+' ('+l.id+')').join(', ')+'. Shared edits apply to all listed references after deliberate publication.';notice.hidden=false;reviewedDraftToken=impact.candidateDraftToken;}

   const result=await saveDraft({baseRevisionId,expectedDraftToken,content:next,...(reviewedDraftToken?{reviewedDraftToken}:{})});if(disposed)return result;
   workspace=structuredClone(next);expectedDraftToken=result?.draftToken??expectedDraftToken;dirty=false;status('Draft saved. Publish separately.');await onSaved(result,next);if(!disposed){renderLesson();renderWord();curriculum.refresh();host.querySelector('[data-unsaved-status]').textContent='All workspace edits saved to the private draft.';status('Draft saved. Publish separately.');}return result;
  }catch(err){if(!disposed)status(draftSaveError(err)+' · All entered values retained.');throw err;}
  finally{saving=false;if(!disposed)lock(false);saveWaiters.splice(0).forEach(resolve=>resolve());}
 }
 host.innerHTML='<section class="card unified-studio"><div data-curriculum-editor></div><p data-unsaved-status role="status">Opening the workspace writes nothing. Changes are staged only by explicit Save.</p><p data-unified-status role="status"></p><p data-workspace-impact role="status" hidden></p><div data-lesson-workspace></div><details><summary>Author card presentation default</summary><form data-review-policy-form><label>Default flashcard front Nikkud<select data-review-policy><option value="full">With Nikkud</option><option value="curated">Authored Nikkud</option><option value="none">Without Nikkud</option></select></label><button type="submit">Save default & workspace edits</button></form></details><details class="studio-source-browser"><summary>Vocabulary source · search, tags and lesson filters</summary><div data-source-browser></div><div data-word-editor></div></details></section>';
 const curriculum=mountCurriculumEditor(host.querySelector('[data-curriculum-editor]'),{getContent:collectAll,selectedLessonId:selected,newId:()=>newId('chapter'),onChange:next=>{workspace=next;touch();renderLesson();renderWord();},onLessonSelect:id=>{try{collectAll();selected=id;onLessonSelect(id);renderLesson();return true;}catch(err){status(err.message);return false;}}});
 const browser=mountVocabularyBrowser(host.querySelector('[data-source-browser]'),{words:workspace.words,lessons:workspace.lessons,onSelect:id=>{try{collectAll();wordId=id;renderWord();}catch(err){status(err.message);}}});
 host.querySelector('[data-review-policy]').value=workspace.reviewPolicy?.defaultNikkud||'full';renderWord();renderLesson();
 host.addEventListener('input',ev=>{if(saving)return;if(ev.target.closest('[data-lesson-metadata],[data-canonical-word],[data-review-policy-form]')||ev.target.matches('[data-review-policy],[data-keyboard-color],[name=introducedLetters]')){ev.target.dataset.dirty='true';touch();if(ev.target.name==='introducedLetters')keyboard();}else if(ev.target.closest('[data-exercise-editor]'))touch();},{signal:ctl.signal});
 host.addEventListener('change',ev=>{if(ev.target.matches('[data-reuse-choice]'))showReuseScope(ev.target.closest('[data-exercise-actions]'));const role=ev.target.closest('[data-component-role]');if(role){lesson().blocks.find(b=>b.id===role.closest('[data-component-id]').dataset.componentId).role=role.value;touch();}},{signal:ctl.signal});
 host.addEventListener('submit',ev=>{if(!ev.target.matches('[data-lesson-metadata],[data-canonical-word],[data-review-policy-form]'))return;ev.preventDefault();stage().catch(err=>status(draftSaveError(err)+' · All entered values retained.'));},{signal:ctl.signal});
 host.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b||b.disabled||saving)return;
 if(b.matches('[data-save-workspace]'))stage().catch(err=>status(draftSaveError(err)+' · All entered values retained.'));
 else if(b.matches('[data-empty-introductions]'))mutateLesson(l=>({...l,introducedLetters:''}));
 else if(b.matches('[data-view-layout]')){try{collectAll();layout=!layout;renderLesson();}catch(err){status(err.message);}}
 else if(b.matches('[data-edit-exercise]')){try{collectAll();if(layout){layout=false;renderLesson();}focusExercise(b.dataset.editExercise);}catch(err){status(err.message);}}
 else if(b.matches('[data-create-exercise],[data-reuse-exercise]')){const actions=b.closest('[data-exercise-actions]');addExercise(actions,b.matches('[data-reuse-exercise]'));}
 else if(b.matches('[data-add-text]'))mutateLesson(l=>insertBlock(l,{id:newId('component'),type:'explanation',source:'inline',renderer:'text',text:'',options:{textDirection:'auto'}},b.closest('[data-exercise-actions]').dataset.exerciseActions));
 else if(b.matches('[data-component-move]'))mutateLesson(l=>moveComponent(l,b.dataset.componentMove,l.blocks.findIndex(x=>x.id===b.dataset.componentMove)+Number(b.dataset.delta)));
 else if(b.matches('[data-component-remove]'))mutateLesson(l=>({...l,blocks:l.blocks.filter(x=>x.id!==b.dataset.componentRemove)}));
 else if(b.matches('[data-add-component],[data-add-check]'))mutateLesson(l=>{const next=structuredClone(l),type=b.matches('[data-add-check]')?'exercise-set':host.querySelector('[data-new-component]').value,id=newId('component');
 const block=type==='explanation'?{id,type,source:'inline',renderer:'text',text:'',options:{textDirection:'auto'}}:type==='vocabulary'?{id,type,source:'words',renderer:'vocabulary-table',selector:{mode:'lesson',lessonId:selected}}:{id,type,source:'exercises',renderer:'practice',role:b.matches('[data-add-check]')?'check':'apply',selector:{mode:'ids',ids:[]}};
 const index=b.matches('[data-add-check]')?next.blocks.findIndex(x=>x.id===b.dataset.addCheck)+1:next.blocks.length;next.blocks.splice(index,0,block);return next;});
 },{signal:ctl.signal});
 return {getContent:collectAll,save:stage,whenIdle:()=>saving?new Promise(resolve=>saveWaiters.push(resolve)):Promise.resolve(),isDirty:()=>dirty||exerciseMounts.some(({mount})=>Object.keys(mount.getEdits()).length>0),dispose(){disposed=true;ctl.abort();clearChildren();curriculum.dispose();browser.dispose();host.replaceChildren();}};
}
