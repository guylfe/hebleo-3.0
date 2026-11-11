(function(){'use strict';const theme=document.querySelector('.hc-theme-input'),nikkud=document.querySelector('.hc-nikkud');
// Move existing nodes only; all source text, recording URLs and event handlers survive.
const content=document.querySelector('.hc-content'),answer=document.querySelector('.hc-answer');
if(content&&answer){
 const primary=document.createElement('div'),support=document.createElement('div');
 primary.className='hc-study-primary';support.className='hc-study-support';
 const prompt=content.querySelector('.hc-prompt'),solution=answer.querySelector('.hc-solution');
 if(prompt)primary.append(prompt);if(solution)primary.append(solution);
 while(answer.firstChild)support.append(answer.firstChild);
 answer.classList.add('hc-study-answer');answer.append(primary,support);
}
let studyContext=null;
function reportAudio(){parent.postMessage({type:'hebleo-base-audio',context:studyContext,audio:document.querySelector('.hc-audio .hc-play[data-audio]')?.getAttribute('data-audio')||null,hebrew:!!document.querySelector('.hc-prompt .hc-hebrew')},'*');}
document.addEventListener('click',e=>{if(e.target.closest?.('.hc-play[data-audio]'))parent.postMessage({type:'hebleo-manual-audio'},'*');},true);
function valid(v){return v&&Object.keys(v).sort().join('|')==='mode|nikkud|type'&&v.type==='hebleo-card-settings'&&(v.mode==='light'||v.mode==='dark')&&typeof v.nikkud==='boolean';}
window.addEventListener('message',function(e){if(e.source!==parent)return;const v=e.data;
if(v&&Object.keys(v).sort().join('|')==='context|type'&&v.type==='hebleo-study-context'&&v.context&&Object.keys(v.context).sort().join('|')==='face|generation|noteId|templateId'&&typeof v.context.generation==='string'&&v.context.generation.length<=80&&/^[0-9]+$/.test(v.context.noteId)&&/^[0-9]+$/.test(v.context.templateId)&&['front','back'].includes(v.context.face)){studyContext=v.context;reportAudio();return;}
if(!valid(v))return;if(theme){theme.checked=e.data.mode==='dark';theme.dispatchEvent(new Event('change'));}if(nikkud)nikkud.checked=e.data.nikkud;});
function changed(){parent.postMessage({type:'hebleo-card-settings',mode:theme.checked?'dark':'light',nikkud:!!(nikkud&&nikkud.checked)},'*');}
if(theme)theme.addEventListener('change',function(e){if(e.isTrusted)changed();});if(nikkud)nikkud.addEventListener('change',changed);parent.postMessage({type:'hebleo-card-ready'},'*');
function excluded(e){return e.altKey||e.ctrlKey||e.metaKey||e.shiftKey||e.isComposing||e.keyCode===229||e.target?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"],dialog[open],[role="dialog"]')||document.querySelector('dialog[open],[role="dialog"]:not([aria-hidden="true"])');}
window.addEventListener('keydown',function(e){if(!studyContext||excluded(e))return;const key=e.code==='Space'||e.key===' '?'Space':e.key;if(key!=='Space'&&!/^[1-4]$/.test(key))return;e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)parent.postMessage({type:'hebleo-study-key',key,context:studyContext},'*');},true);
window.addEventListener('keyup',function(e){if(studyContext&&!excluded(e)&&(e.code==='Space'||e.key===' '))e.preventDefault();},true);
}());
