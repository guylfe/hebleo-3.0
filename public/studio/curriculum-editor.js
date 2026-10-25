import {escapeHTML as e} from './editor-fields.js';
import {projectCurriculum,validateCurriculum,courseOutline} from '../course.js';
export function moveLesson(content,lessonId,destination=null,index=Infinity){
 const next=structuredClone(content),c=next.curriculum=projectCurriculum(next);
 if(!next.lessons.some(l=>l.id===lessonId))throw new Error('Lesson not found.');
 if(destination&&!c.chapters.some(ch=>ch.id===destination))throw new Error('Destination chapter not found.');
 c.order=c.order.filter(x=>x.lessonId!==lessonId);for(const ch of c.chapters)ch.lessonIds=ch.lessonIds.filter(id=>id!==lessonId);
 const list=destination?c.chapters.find(ch=>ch.id===destination).lessonIds:c.order;
 list.splice(Math.min(list.length,Math.max(0,index)),0,destination?lessonId:{lessonId});validateCurriculum(next);return next;
}
export function removeChapter(content,id){
 const next=structuredClone(content),c=next.curriculum=projectCurriculum(next),ch=c.chapters.find(ch=>ch.id===id);
 if(!ch)throw new Error('Chapter not found.');
 // Explicit caller action moves every child in its current order into the chapter's top-level slot.
 const i=c.order.findIndex(x=>x.chapterId===id);c.order.splice(i,1,...ch.lessonIds.map(lessonId=>({lessonId})));c.chapters=c.chapters.filter(x=>x.id!==id);validateCurriculum(next);return next;
}
export function moveCurriculumEntry(content,{chapterId,lessonId},delta){
 const next=structuredClone(content),c=next.curriculum=projectCurriculum(next);
 const parent=lessonId?c.chapters.find(ch=>ch.lessonIds.includes(lessonId)):null;
 const list=parent?parent.lessonIds:c.order,index=parent?list.indexOf(lessonId):list.findIndex(x=>chapterId?x.chapterId===chapterId:x.lessonId===lessonId);
 if(index<0)throw new Error('Placement not found.');const target=index+delta;if(target<0||target>=list.length)return next;
 const [entry]=list.splice(index,1);list.splice(target,0,entry);validateCurriculum(next);return next;
}
export function mountCurriculumEditor(host,{getContent,getLessonOptions=()=>getContent().lessons,onChange,selectedLessonId,onLessonSelect,newId=()=> 'chapter-'+crypto.randomUUID()}){
 const ctl=new host.ownerDocument.defaultView.AbortController();let currentLesson=selectedLessonId,filter='',disposed=false;
 const source=()=>{const c=structuredClone(getContent());c.curriculum=projectCurriculum(c);return c;};
 const lessonLabel=(c,id)=>c.lessons.find(l=>l.id===id)?.title||id;
 const moves=ref=>'<button type="button" data-order="'+e(ref)+'" data-delta="-1">Move up</button><button type="button" data-order="'+e(ref)+'" data-delta="1">Move down</button>';
 function draw(){if(disposed)return;const c=source(),model=c.curriculum,outline=courseOutline(c);
 host.innerHTML='<div class="studio-lesson-context"><label>Chapter filter<select data-chapter-filter><option value="">All chapters and ungrouped</option><option value="ungrouped">Ungrouped lessons</option>'+model.chapters.map(ch=>'<option value="'+e(ch.id)+'">'+e(ch.title)+'</option>').join('')+'</select></label><label>Selected lesson<select data-current-lesson>'+outline.map(item=>item.kind==='chapter'?(!filter||filter===item.id?'<optgroup label="'+e(item.title)+'">'+item.lessons.map(l=>'<option value="'+e(l.id)+'">'+e(l.title)+' ('+e(l.id)+')</option>').join('')+'</optgroup>':''):(!filter||filter==='ungrouped'?'<option value="'+e(item.lesson.id)+'">'+e(item.lesson.title)+' · Ungrouped</option>':'')).join('')+'</select></label></div><details class="studio-course-order"><summary>Chapters and lesson order</summary><p>Legacy chapter strings remain as source metadata. Saving these controls creates the optional structured outline.</p><div class="studio-inline-control"><label>New chapter title<input data-new-chapter maxlength="4000"></label><button type="button" data-create-chapter>Create chapter</button></div>'+outline.map(item=>item.kind==='chapter'?'<section data-order-entry="chapter:'+e(item.id)+'"><label>Chapter title<input data-chapter-title="'+e(item.id)+'" value="'+e(item.title)+'"></label>'+moves('chapter:'+item.id)+'<button type="button" data-remove-chapter="'+e(item.id)+'">Remove chapter and move '+item.lessons.length+' lessons to ungrouped</button><ol>'+item.lessons.map(l=>'<li data-order-entry="lesson:'+e(l.id)+'">'+e(l.title)+' '+moves('lesson:'+l.id)+'</li>').join('')+'</ol></section>':'<section data-order-entry="lesson:'+e(item.lesson.id)+'"><strong>'+e(item.lesson.title)+' · Ungrouped</strong>'+moves('lesson:'+item.lesson.id)+'</section>').join('')+'<label>Move selected lesson to<select data-move-destination><option value="">Ungrouped</option>'+model.chapters.map(ch=>'<option value="'+e(ch.id)+'">'+e(ch.title)+'</option>').join('')+'</select></label><button type="button" data-move-lesson>Move lesson atomically to end of destination</button><p data-curriculum-status role="status"></p></details>';
 host.querySelector('[data-chapter-filter]').value=filter;const select=host.querySelector('[data-current-lesson]');select.value=currentLesson;
 if(!select.value){const first=select.options[0]?.value;if(first){const previous=currentLesson;currentLesson=first;select.value=first;if(onLessonSelect(first)===false){currentLesson=previous;filter='';draw();}}}
 const parent=model.chapters.find(ch=>ch.lessonIds.includes(currentLesson));host.querySelector('[data-move-destination]').value=parent?.id||'';
 }
 function changed(next){onChange(next);draw();}
 host.addEventListener('change',ev=>{try{
 if(ev.target.matches('[data-chapter-filter]')){filter=ev.target.value;draw();}
 else if(ev.target.matches('[data-current-lesson]')){const previous=currentLesson;currentLesson=ev.target.value;if(onLessonSelect(currentLesson)===false){currentLesson=previous;ev.target.value=previous;}}
 else if(ev.target.matches('[data-chapter-title]')){const c=source();c.curriculum.chapters.find(x=>x.id===ev.target.dataset.chapterTitle).title=ev.target.value;validateCurriculum(c);onChange(c);for(const option of host.querySelectorAll('option'))if(option.value===ev.target.dataset.chapterTitle)option.textContent=ev.target.value;}
 }catch(err){host.querySelector('[data-curriculum-status]').textContent=err.message;}},{signal:ctl.signal});
 host.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;try{const c=source();
 if(b.matches('[data-order]')){const [kind,id]=b.dataset.order.split(':');changed(moveCurriculumEntry(c,{[kind+'Id']:id},Number(b.dataset.delta)));}
 else if(b.matches('[data-create-chapter]')){const title=host.querySelector('[data-new-chapter]').value,id=newId();c.curriculum.chapters.push({id,title,lessonIds:[]});c.curriculum.order.push({chapterId:id});validateCurriculum(c);changed(c);}
 else if(b.matches('[data-remove-chapter]'))changed(removeChapter(c,b.dataset.removeChapter));
 else if(b.matches('[data-move-lesson]'))changed(moveLesson(c,currentLesson,host.querySelector('[data-move-destination]').value||null));
 }catch(err){host.querySelector('[data-curriculum-status]').textContent=err.message;}},{signal:ctl.signal});
 let picker;
 function openPicker(opener,onSelected=()=>{}){
  if(disposed)return;
  if(picker){picker.querySelector('input').focus();return;}
  const doc=host.ownerDocument,dialog=doc.createElement('dialog');picker=dialog;
  dialog.className='confirmation-dialog studio-lesson-picker';dialog.setAttribute('aria-labelledby','studio-lesson-picker-title');
  dialog.innerHTML='<h2 id="studio-lesson-picker-title">Choose a draft lesson</h2><p>Choose a lesson to edit. Preview uses its saved draft.</p><label>Search lessons<input type="search" data-lesson-search placeholder="Title or readable ID, e.g. MEMORY"></label><p data-picker-count role="status"></p><p data-picker-error role="alert"></p><ul data-picker-lessons></ul><button type="button" data-picker-close>Cancel</button>';
  function dismiss(selected=false){dialog.close();dialog.remove();picker=undefined;if(selected)onSelected();else if(opener?.isConnected)opener.focus({preventScroll:true});}
  function list(){
   try{
    const all=getLessonOptions(),query=dialog.querySelector('input').value.trim().toLocaleLowerCase();
    const lessons=all.filter(l=>[l.id,l.contentId,l.title].some(value=>String(value||'').toLocaleLowerCase().includes(query)));
    dialog.querySelector('[data-picker-count]').textContent=lessons.length+' of '+all.length+' lessons';
    dialog.querySelector('ul').innerHTML=lessons.map(l=>'<li><button type="button" class="outline" data-pick-lesson="'+e(l.id)+'"'+(l.id===currentLesson?' aria-current="true"':'')+'><strong><bdi>'+e(l.contentId||l.id)+'</bdi></strong><span dir="auto">'+e(l.title)+'</span><small>'+e(l.id)+(l.id===currentLesson?' · Selected':'')+'</small></button></li>').join('')||'<li>No matching lessons. Try another title or ID.</li>';
   }catch(err){dialog.querySelector('[data-picker-error]').textContent=err.message;}
  }
  dialog.addEventListener('input',list);
  dialog.addEventListener('cancel',event=>{event.preventDefault();dismiss();});
  dialog.addEventListener('click',event=>{
   const button=event.target.closest('button');if(!button)return;
   if(button.matches('[data-picker-close]')){dismiss();return;}
   if(!button.matches('[data-pick-lesson]'))return;
   try{
    const id=button.dataset.pickLesson;
    if(onLessonSelect(id)===false)throw new Error('Lesson was not changed. Correct the workspace error and try again.');
    currentLesson=id;filter='';draw();dismiss(true);
   }catch(err){dialog.querySelector('[data-picker-error]').textContent='Lesson was not changed: '+err.message+' Your edits are retained. Cancel to correct them.';}
  });
  doc.body.append(dialog);list();dialog.showModal();dialog.querySelector('input').focus();
 }
 draw();return {refresh:draw,openPicker,dispose(){disposed=true;ctl.abort();picker?.close();picker?.remove();picker=undefined;host.replaceChildren();}};
}
