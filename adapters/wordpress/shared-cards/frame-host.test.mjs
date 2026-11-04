import {readFileSync} from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const source=readFileSync(new URL('./frame-host.js',import.meta.url),'utf8');const saved=new Map();const app={dataset:{}};let handler,frames=[],posts=[];
function run(){vm.runInNewContext(source,{window:{addEventListener(t,f){handler=f;}},document:{addEventListener(){},querySelectorAll(){return frames;},getElementById(id){return id==='study-app'?app:null;}},localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)}});}
const frame={contentWindow:{postMessage:v=>posts.push(v)},style:{}};frames=[frame];run();
handler({source:{},data:{type:'hebleo-card-settings',mode:'dark',nikkud:true}});assert.equal(saved.size,0);
handler({source:frame.contentWindow,data:{type:'hebleo-card-settings',mode:'dark',nikkud:'true'}});assert.equal(saved.size,0);
handler({source:frame.contentWindow,data:{type:'hebleo-card-settings',mode:'dark',nikkud:true,url:'https://bad.invalid'}});assert.equal(saved.size,0);
handler({source:frame.contentWindow,data:{type:'hebleo-card-height',height:Infinity}});assert.equal(frame.style.height,undefined);
handler({source:frame.contentWindow,data:{type:'hebleo-card-height',height:4096}});assert.equal(frame.style.height,'4096px');
handler({source:frame.contentWindow,data:{type:'hebleo-card-height',height:1e8}});assert.equal(frame.style.height,'1000000px');
handler({source:frame.contentWindow,data:{type:'hebleo-card-height',height:-10}});assert.equal(frame.style.height,'120px');
handler({source:frame.contentWindow,data:{type:'hebleo-card-settings',mode:'dark',nikkud:true}});assert.equal(saved.size,1);assert.equal(app.dataset.hebleoMode,'dark');
run();handler({source:frame.contentWindow,data:{type:'hebleo-card-ready'}});assert.equal(posts.at(-1).mode,'dark');assert.equal(posts.at(-1).nikkud,true);
frames=[];const before=saved.size;handler({source:frame.contentWindow,data:{type:'hebleo-card-settings',mode:'light',nikkud:false}});assert.equal(saved.size,before);
console.log('PASS frame bridge: spoofed/stale sources, extra keys, wrong types and nonfinite heights rejected; bounds and persisted restore pass');
