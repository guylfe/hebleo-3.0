// Assessment only: assert existing behavior; do not change settings or defaults.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {JSDOM} from 'jsdom';
const host=fs.readFileSync(process.argv[2]||new URL('../shared-cards/frame-host.js',import.meta.url),'utf8');
function mount(saved){const dom=new JSDOM('<div id="study-app"><iframe data-hebleo-shared></iframe></div>',{url:'https://hebleo.com/decks/',runScripts:'outside-only'});if(saved)dom.window.localStorage.setItem('hebleo-shared-card-settings-v1',saved);dom.window.eval(host);return dom;}
function ready(w,frame){const messages=[];frame.contentWindow.postMessage=value=>messages.push(value);w.dispatchEvent(new w.MessageEvent('message',{source:frame.contentWindow,data:{type:'hebleo-card-ready'}}));return messages.find(x=>x.type==='hebleo-card-settings');}
test('WordPress starts unpointed when no stored hint choice exists',()=>{const dom=mount();try{assert.equal(ready(dom.window,dom.window.document.querySelector('iframe')).nikkud,false);}finally{dom.window.close();}});
test('WordPress Nikkud hint visibility carries to the next card and browser reload',()=>{
 const dom=mount();let saved;
 try{const w=dom.window,old=w.document.querySelector('iframe');w.dispatchEvent(new w.MessageEvent('message',{source:old.contentWindow,data:{type:'hebleo-card-settings',mode:'light',nikkud:true}}));saved=w.localStorage.getItem('hebleo-shared-card-settings-v1');assert.equal(JSON.parse(saved).nikkud,true);w.document.querySelector('#study-app').innerHTML='<iframe data-hebleo-shared></iframe>';assert.equal(ready(w,w.document.querySelector('iframe')).nikkud,true);}finally{dom.window.close();}
 const reopened=mount(saved);try{assert.equal(ready(reopened.window,reopened.window.document.querySelector('iframe')).nikkud,true);}finally{reopened.window.close();}
});
