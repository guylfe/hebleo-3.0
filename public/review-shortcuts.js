export function reviewShortcut(event,consumeRepeat=false){
 if(event.defaultPrevented||event.repeat&&!consumeRepeat||event.isComposing||event.ctrlKey||event.altKey||event.metaKey||event.shiftKey)return null;
 if(event.target?.closest?.('input,textarea,select,.app-header,#course-navigation,[data-preview-root],[data-text-reader],[inert],[hidden],[contenteditable]:not([contenteditable="false"]),dialog,[role="dialog"]'))return null;
 return event.key===' '||event.code==='Space'?'reveal':/^[1-4]$/.test(event.key)?event.key:null;
}
export function mountReviewKeys({document,active,onShortcut}){
 const keydown=event=>{const key=reviewShortcut(event,true);if(!key||!active())return;event.preventDefault();if(!event.repeat)onShortcut(key);};
 document.addEventListener('keydown',keydown);return ()=>document.removeEventListener('keydown',keydown);
}
