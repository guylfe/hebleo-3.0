import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {mountSharedReview} from '../public/shared-cards.js';
test('host settings bridge trusts only current frame, validates exact settings, persists serially and disposes',async()=>{
 const page=new JSDOM('<iframe data-card-id="sc-mf-000001-he-en" data-face="front"></iframe>',{url:'http://localhost'});
 const old=globalThis.window;globalThis.window=page.window;
 try{
 const frame=page.window.document.querySelector('iframe'),calls=[],errors=[];
 const api=async(path,body,user)=>{calls.push({path,body,user});return {url:'/shared-card/fixture'};};
 const binding=mountSharedReview(frame,{api,user:'learner-demo',onError:e=>errors.push(e)});
 await binding.loaded;assert.equal(frame.getAttribute('sandbox'),'allow-scripts');assert.equal(frame.getAttribute('src'),'/shared-card/fixture');
 const send=(data,source=frame.contentWindow)=>page.window.dispatchEvent(new page.window.MessageEvent('message',{source,data}));
 send({type:'hebleo-card-settings',mode:'dark',nikkud:true},page.window);
 send({type:'hebleo-card-settings',mode:'bad',nikkud:true});
 send({type:'hebleo-card-settings',mode:'dark',nikkud:true,html:'bad'});
 assert.equal(calls.length,1);
 send({type:'hebleo-card-settings',mode:'dark',nikkud:true});await binding.flush();assert.deepEqual(calls.at(-1).body,{mode:'dark',nikkud:true});
 send({type:'hebleo-card-height',height:100000});assert.equal(frame.style.height,'2400px');send({type:'hebleo-card-height',height:NaN});assert.equal(frame.style.height,'2400px');
 binding.dispose();send({type:'hebleo-card-settings',mode:'light',nikkud:false});assert.equal(calls.length,2);assert.equal(errors.length,0);
 }finally{globalThis.window=old;page.window.close();}
});
