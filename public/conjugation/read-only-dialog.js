// Shared read-only modal owner. Opening never remounts the caller's surface.
let serial=0;
export function openReadOnlyDialog({document:doc,trigger,title,html,className=''}) {
 const previous=doc.activeElement, selection=previous && typeof previous.selectionStart==='number' ? [previous.selectionStart,previous.selectionEnd,previous.selectionDirection] : null;
 const dialog=doc.createElement('dialog'), id='read-only-dialog-'+(++serial);
 dialog.className='lesson-extra-information '+className;dialog.setAttribute('aria-labelledby',id);
 const header=doc.createElement('div');header.className='panel-header';
 const heading=doc.createElement('h2');heading.id=id;heading.textContent=title;
 const button=doc.createElement('button');button.type='button';button.dataset.extraClose='';button.className='button small outline';button.textContent='Close';button.setAttribute('aria-label','Close '+title);
 const content=doc.createElement('div');content.className='rich-lesson';content.innerHTML=html;header.append(heading,button);dialog.append(header,content);
 let closed=false;
 function close(){if(closed)return;closed=true;dialog.close();dialog.remove();doc.removeEventListener('keydown',keys,true);const target=trigger?.isConnected?trigger:previous?.isConnected?previous:null;target?.focus({preventScroll:true});if(target===previous&&selection)target.setSelectionRange(...selection);}
 // Capture before document-level study shortcuts, including WordPress's legacy handlers.
 function keys(event){event.stopImmediatePropagation();if(event.key==='Escape'){event.preventDefault();close();}}
 button.addEventListener('click',close);dialog.addEventListener('cancel',event=>{event.preventDefault();close();});dialog.addEventListener('close',close);
 doc.body.append(dialog);dialog.showModal();doc.addEventListener('keydown',keys,true);button.focus({preventScroll:true});
 return {close,dialog};
}
