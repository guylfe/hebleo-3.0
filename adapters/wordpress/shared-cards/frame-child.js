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
function valid(v){return v&&Object.keys(v).sort().join('|')==='mode|nikkud|type'&&v.type==='hebleo-card-settings'&&(v.mode==='light'||v.mode==='dark')&&typeof v.nikkud==='boolean';}
window.addEventListener('message',function(e){if(e.source!==parent||!valid(e.data))return;theme.checked=e.data.mode==='dark';theme.dispatchEvent(new Event('change'));if(nikkud)nikkud.checked=e.data.nikkud;});
function changed(){parent.postMessage({type:'hebleo-card-settings',mode:theme.checked?'dark':'light',nikkud:!!(nikkud&&nikkud.checked)},'*');}
theme.addEventListener('change',function(e){if(e.isTrusted)changed();});if(nikkud)nikkud.addEventListener('change',changed);parent.postMessage({type:'hebleo-card-ready'},'*');
}());
