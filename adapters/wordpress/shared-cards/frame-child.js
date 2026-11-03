(function(){'use strict';const theme=document.querySelector('.hc-theme-input'),nikkud=document.querySelector('.hc-nikkud');
function valid(v){return v&&Object.keys(v).sort().join('|')==='mode|nikkud|type'&&v.type==='hebleo-card-settings'&&(v.mode==='light'||v.mode==='dark')&&typeof v.nikkud==='boolean';}
window.addEventListener('message',function(e){if(e.source!==parent||!valid(e.data))return;theme.checked=e.data.mode==='dark';theme.dispatchEvent(new Event('change'));if(nikkud)nikkud.checked=e.data.nikkud;});
function changed(){parent.postMessage({type:'hebleo-card-settings',mode:theme.checked?'dark':'light',nikkud:!!(nikkud&&nikkud.checked)},'*');}
theme.addEventListener('change',function(e){if(e.isTrusted)changed();});if(nikkud)nikkud.addEventListener('change',changed);parent.postMessage({type:'hebleo-card-ready'},'*');
}());
