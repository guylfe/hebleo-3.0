(function () {
'use strict';
function valid(v){return v&&Object.keys(v).sort().join('|')==='mode|nikkud|type'&&v.type==='hebleo-card-settings'&&(v.mode==='light'||v.mode==='dark')&&typeof v.nikkud==='boolean';}
const key='hebleo-shared-card-settings-v1';let state={type:'hebleo-card-settings',mode:'light',nikkud:false};
try{const stored=JSON.parse(localStorage.getItem(key));if(valid(stored))state=stored;}catch(_){}
const frames=()=>Array.from(document.querySelectorAll('iframe[data-hebleo-shared]'));
function send(frame){const app=document.getElementById('study-app');if(app)app.dataset.hebleoMode=state.mode;try{frame.contentWindow.postMessage(state,'*');}catch(_){}}
window.addEventListener('message',function(event){const frame=frames().find(f=>f.contentWindow===event.source);if(!frame)return;const v=event.data;
if(v&&Object.keys(v).sort().join('|')==='height|type'&&v.type==='hebleo-card-height'&&Number.isFinite(v.height)){frame.style.height=Math.max(120,Math.min(1000000,Math.ceil(v.height)))+'px';return;}
if(v&&Object.keys(v).join('|')==='type'&&v.type==='hebleo-card-ready'){send(frame);return;}
if(!valid(v))return;state={type:v.type,mode:v.mode,nikkud:v.nikkud};const app=document.getElementById('study-app');if(app)app.dataset.hebleoMode=state.mode;try{localStorage.setItem(key,JSON.stringify(state));}catch(_){}for(const f of frames())if(f!==frame)send(f);
});
}());
