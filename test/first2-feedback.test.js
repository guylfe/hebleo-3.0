import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {mountTextReader} from '../public/text-reader.js';
import {extraInformationControl,bindExtraInformation} from '../public/learner-view.js';
import {portionLesson} from '../public/ux.js';
import {validateContent,Store} from '../src/store.js';

const pack=JSON.parse(readFileSync(new URL('../content/first2/lessons.json',import.meta.url)));
const memory=pack.lessons[0].blocks[0].textPages,first=memory.pages.find(p=>p.activity?.kind==='memory-first');
const single=p=>({version:1,activityVersion:1,pages:[p],order:[p.id]});
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function harness(t,textPages=single(first),options={}){
 const dom=new JSDOM('<aside>Other course text</aside><main></main>',{pretendToBeVisual:true}),w=dom.window,host=w.document.querySelector('main');
 let time=0,id=0;const jobs=new Map();
 const clock={now:()=>time,schedule:(f,ms)=>{jobs.set(++id,{f,at:time+ms});return id;},cancel:id=>jobs.delete(id),advance(ms){time+=ms;for(const [id,job]of [...jobs])if(job.at<=time){jobs.delete(id);job.f();}},get count(){return jobs.size;}};
 const owner=mountTextReader(host,{textPages,renderLesson:s=>s,dock:false,clock,...options});
 t.after(()=>{owner.destroy();w.close();});
 const click=action=>{const el=host.querySelector('[data-source-action="'+action+'"]');assert.ok(el,action);el.click();};
 const input=text=>{const el=host.querySelector('textarea');el.value=text;el.dispatchEvent(new w.Event('input',{bubbles:true}));};
 return {w,doc:w.document,host,owner,clock,click,input};
}

for(const reduced of [false,true])test('feedback timer measures the exposure deadline, including delayed ticks and reduced motion '+reduced,t=>{
 const h=harness(t);h.w.matchMedia=()=>({matches:reduced});assert.equal(h.clock.count,0);assert.equal(h.host.querySelector('progress'),null);
 h.click('play');const bar=h.host.querySelector('progress');assert.equal(bar.max,10000);assert.equal(bar.value,10000);assert.equal(h.host.querySelector('[data-source-exposure]').textContent,'0704177609112001');
 h.clock.advance(3456);assert.equal(bar.value,6544);assert.equal(bar.getAttribute('aria-valuetext'),'7 seconds remaining');assert.equal(h.host.querySelector('textarea'),null);
 h.clock.advance(6543);assert.equal(bar.value,1);assert.ok(h.host.querySelector('[data-source-exposure]'));
 h.clock.advance(1);assert.equal(h.host.querySelector('progress'),null);assert.equal(h.host.querySelector('[data-source-exposure]'),null);assert.ok(h.host.querySelector('textarea'));assert.equal(h.clock.count,0);
 h.click('submit-first');assert.equal(h.host.querySelector('[data-source-action="play"]'),null);
});

test('exposure interruption cancels bar and cannot replay after visibility, back navigation or restored state',async t=>{
 const pages={...single(first),pages:[memory.pages[0],first],order:[memory.pages[0].id,first.id]};
 const h=harness(t,pages);h.click('next');h.click('play');h.clock.advance(1500);h.click('back');assert.equal(h.clock.count,0);h.click('next');assert.equal(h.host.querySelector('progress'),null);assert.equal(h.host.querySelector('[data-source-action="play"]'),null);assert.ok(h.host.querySelector('textarea'));
 const v=harness(t);v.click('play');Object.defineProperty(v.doc,'hidden',{value:true,configurable:true});v.doc.dispatchEvent(new v.w.Event('visibilitychange'));assert.equal(v.clock.count,0);assert.equal(v.host.querySelector('progress'),null);assert.ok(v.host.querySelector('textarea'));
 Object.defineProperty(v.doc,'hidden',{value:false});v.doc.dispatchEvent(new v.w.Event('visibilitychange'));assert.equal(v.host.querySelector('[data-source-action="play"]'),null);
 const restored=harness(t,single(first),{loadProgress:async()=>({cursorPageId:first.id,responses:{[first.id]:{started:true}}})});await flush();assert.equal(restored.host.querySelector('progress'),null);assert.equal(restored.clock.count,0);assert.ok(restored.host.querySelector('textarea'));
});

test('number selection/drag/copy is scoped to exposure; other course copy and recall paste stay available',t=>{
 const h=harness(t);h.click('play');const number=h.host.querySelector('[data-source-exposure]');
 for(const type of ['selectstart','dragstart']){const event=new h.w.Event(type,{bubbles:true,cancelable:true});number.dispatchEvent(event);assert.equal(event.defaultPrevented,true);}
 const selection=h.doc.getSelection(),range=h.doc.createRange();range.selectNodeContents(number);selection.addRange(range);
 const copied=[];const copy=()=>{const event=new h.w.Event('copy',{bubbles:true,cancelable:true});Object.defineProperty(event,'clipboardData',{value:{setData:(type,text)=>copied.push([type,text])}});h.doc.dispatchEvent(event);return event;};
 assert.equal(copy().defaultPrevented,true);assert.equal(copied.at(-1)[1],'');
 selection.removeAllRanges();range.selectNodeContents(h.doc.body);selection.addRange(range);copy();assert.ok(copied.at(-1)[1].includes('Other course text'));assert.ok(!copied.at(-1)[1].includes(first.activity.value));
 selection.removeAllRanges();range.selectNodeContents(h.doc.querySelector('aside'));selection.addRange(range);assert.equal(copy().defaultPrevented,false);
 h.clock.advance(10000);const field=h.host.querySelector('textarea'),paste=new h.w.Event('paste',{bubbles:true,cancelable:true});field.dispatchEvent(paste);assert.equal(paste.defaultPrevented,false);h.input('0012345678901234');assert.equal(field.value,'0012345678901234');assert.equal(copy().defaultPrevented,false);
});

test('cursor-only navigation has one Continue, waits for real saves, and never reports Answers saved',async t=>{
 let release;const calls=[];const pages={...memory,pages:memory.pages.slice(0,2),order:memory.order.slice(0,2)};
 const h=harness(t,pages,{saveProgress:record=>{calls.push(record);return new Promise(resolve=>release=resolve);}});
 assert.equal(h.host.querySelectorAll('.primary').length,1);h.click('next');assert.equal(h.owner.getState().cursorPageId,pages.order[1]);assert.match(h.host.textContent,/Saving/);await flush();release();await h.owner.settled();assert.equal(h.host.querySelector('[data-source-save]').textContent,'');assert.equal(calls.length,1);
 h.click('back');await flush();assert.equal(h.owner.getState().cursorPageId,pages.order[0]);h.click('next');assert.equal(h.host.querySelector('[data-source-action="next"]').disabled,true);assert.equal(h.owner.getState().cursorPageId,pages.order[0]);release();await flush();assert.equal(h.owner.getState().cursorPageId,pages.order[1]);await flush();release();await h.owner.settled();assert.doesNotMatch(h.host.textContent,/Answers saved/);
});

test('answer success is brief; failed saves retain text and block forward until a successful retry',async t=>{
 let fail=true,continues=0;const h=harness(t,single(first),{saveProgress:async()=>{if(fail)throw Error('offline');},onContinue:()=>{continues++;}});
 h.click('play');h.clock.advance(10000);h.input('0704177609112001');h.click('submit-first');await h.owner.settled();assert.match(h.host.textContent,/could not save/);assert.equal(h.owner.getState().responses[first.id].text,'0704177609112001');h.click('next');await flush();assert.equal(continues,0);
 fail=false;h.click('retry');assert.match(h.host.textContent,/Saving/);await h.owner.settled();assert.match(h.host.textContent,/Answers saved/);h.clock.advance(1800);assert.equal(h.host.querySelector('[data-source-save]').textContent,'');h.click('next');await flush();assert.equal(continues,1);
});

test('latest save owns status; stale completion cannot hide a newer pending save or failure',async t=>{
 const saves=[];const h=harness(t,single(first),{saveProgress:record=>new Promise((resolve,reject)=>saves.push({record,resolve,reject}))});h.click('play');await flush();h.clock.advance(10000);h.input('first');h.input('latest');saves[0].resolve();await flush();assert.match(h.host.textContent,/Saving/);assert.equal(saves.at(-1).record.response.text,'latest');saves.at(-1).reject(Error('offline'));await h.owner.settled();assert.match(h.host.textContent,/could not save/);assert.doesNotMatch(h.host.textContent,/Answers saved/);assert.equal(h.host.querySelector('textarea').value,'latest');
});

test('final Continue requires every page gate and one in-flight handoff',async t=>{
 const end=memory.pages.at(-1);let continues=0,release;const h=harness(t,{...memory,pages:[first,end],order:[first.id,end.id]},{initialState:{cursorPageId:end.id},onContinue:()=>{continues++;return new Promise(resolve=>release=resolve);}});
 assert.equal(h.host.querySelector('[data-source-action="next"]').disabled,true);
 h.click('back');h.click('skip');h.click('next');h.click('next');assert.equal(continues,1);h.click('next');assert.equal(continues,1);release();await flush();assert.equal(h.host.querySelectorAll('.primary').length,1);
});

test('authored extras alone produce a shared accessible dialog, Escape/Close restore exact focus, cleanup removes it',t=>{
 const dom=new JSDOM('<main></main>',{pretendToBeVisual:true}),w=dom.window,doc=w.document,host=doc.querySelector('main');t.after(()=>w.close());
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 for(const value of [undefined,'','  ','<p> &nbsp; </p>'])assert.equal(extraInformationControl({extraInformation:value}),'');
 const lesson={extraInformation:'<p>SYNTHETIC authored extra for verification</p>'};host.innerHTML=extraInformationControl(lesson);const binding=bindExtraInformation(host,lesson,s=>s),trigger=host.querySelector('button');trigger.focus();trigger.click();
 let dialog=doc.querySelector('dialog');assert.ok(dialog.open);assert.equal(doc.getElementById(dialog.getAttribute('aria-labelledby')).textContent,'Extra information');assert.equal(doc.activeElement,dialog.querySelector('button'));assert.doesNotMatch(dialog.textContent,/comment|AI clarification|practice/);
 dialog.dispatchEvent(new w.Event('cancel',{cancelable:true}));assert.equal(doc.querySelector('dialog'),null);assert.equal(doc.activeElement,trigger);trigger.click();doc.querySelector('[data-extra-close]').click();assert.equal(doc.activeElement,trigger);trigger.click();binding.destroy();assert.equal(doc.querySelector('dialog'),null);
});

test('authored extra options survive projection and reject malformed save/restore content',()=>{
 const store=new Store();try{const content=store.snapshot();const {projectLesson}=awaitableProjection;content.lessons[0]=projectLesson(content,content.lessons[0]);const lesson=content.lessons[0],block=lesson.blocks.find(b=>b.type==='explanation');
 block.options.extraInformation='SYNTHETIC verified field';validateContent(content);assert.equal(portionLesson(lesson,block.id).extraInformation,block.options.extraInformation);
 const draft=store.stage({baseRevisionId:store.get('active'),expectedDraftToken:null,content});store.publish(store.get('active'),draft.draftToken);const projected=store.bootstrap('learner-demo').content.lessons[0];assert.equal(portionLesson(projected,block.id).extraInformation,block.options.extraInformation);
 block.options.extraInformation={bad:true};assert.throws(()=>validateContent(content),/extra information/);
 }finally{store.close();}
});
import * as awaitableProjection from '../public/course.js';
