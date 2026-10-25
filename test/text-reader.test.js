import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {marked} from 'marked';
import createPurifier from 'dompurify';
import {createLessonRenderer} from '../public/rich.js';
import {createTextTimer,mountTextReader,hasTextPages} from '../public/text-reader.js';
import {wordCard,learnMedia,textPageMedia} from '../public/learner-view.js';
import {createLearnerRenderer} from '../public/preview/learner-renderer.js';
import {portionLesson} from '../public/ux.js';
import {seed} from '../src/seed.js';
import {readFileSync} from 'node:fs';

function fakeClock(){let now=0,id=0;const jobs=new Map(),captured=[];return {now:()=>now,schedule(fn,ms){jobs.set(++id,{fn,at:now+ms});captured.push(fn);return id;},cancel:id=>jobs.delete(id),advance(ms){now+=ms;for(const [id,job] of [...jobs])if(job.at<=now){jobs.delete(id);job.fn();}},get jobs(){return jobs.size;},captured};}
const pack=pages=>({version:1,pages,order:pages.map(p=>p.id)});
const memory={id:'MEMORY.number',type:'timedRecall',title:'Memory',value:'0704177609112001',durationMs:10000,answer:'Illustrative model',grading:'self-check',accessibleAlternative:true,gate:'reveal'};
const tick=()=>new Promise(r=>setImmediate(r));
function harness(t,pages,options={}){const dom=new JSDOM('<main></main>',{pretendToBeVisual:true,url:'https://fixture.invalid'}),w=dom.window,host=w.document.querySelector('main'),clock=fakeClock(),saved=[];
 const renderLesson=createLessonRenderer(marked,createPurifier(w),w.document),binding=mountTextReader(host,{textPages:pack(pages),renderLesson,clock,saveProgress:async value=>saved.push(value),...options});t.after(()=>{binding.destroy();dom.window.close();});
 const click=a=>host.querySelector('[data-reader-action="'+a+'"]')?.click();
 const input=text=>{const el=host.querySelector('textarea');el.value=text;el.dispatchEvent(new w.Event('input',{bubbles:true}));};
 return {dom,w,host,clock,binding,saved,click,input,renderLesson};}

test('exact source number, no autoplay, 9999 visible / 10000 hidden and replay invalidates stale callbacks',async t=>{
 const source=JSON.parse(readFileSync(new URL('../docs/curriculum/first20-20261025/content.json',import.meta.url),'utf8'));
 const original=source.lessons.flatMap(l=>l.pages).find(p=>p.type==='timedRecall');assert.equal(original.value,memory.value);assert.equal(original.durationMs,10000);
 const h=harness(t,[memory]);assert.equal(h.host.textContent.includes(memory.value),false);assert.equal(h.clock.jobs,0);assert.equal(h.host.querySelector('textarea'),null);
 h.click('play');assert.equal(h.host.querySelector('.text-reader-value').textContent,memory.value);assert.equal(h.host.querySelector('textarea'),null);
 h.clock.advance(9999);assert.equal(h.host.querySelector('.text-reader-value').textContent,memory.value);
 h.clock.advance(1);assert.equal(h.host.textContent.includes(memory.value),false);assert.ok(h.host.querySelector('textarea'));assert.equal(h.host.querySelector('[data-reader-action="reveal"]').disabled,true);
 h.input('my attempt');h.click('reveal');assert.match(h.host.textContent,/Illustrative model/);
 h.click('play');assert.equal(h.host.querySelector('textarea'),null);assert.equal(h.host.querySelector('.text-reader-model'),null);
 const old=h.clock.captured.at(-1);h.clock.advance(5000);h.click('play');old();assert.ok(h.host.querySelector('.text-reader-value'));h.clock.advance(9999);assert.ok(h.host.querySelector('.text-reader-value'));h.clock.advance(1);assert.equal(h.host.querySelector('.text-reader-value'),null);
 await h.binding.settled();assert.ok(h.saved.every(v=>!JSON.stringify(v).includes(memory.value)));assert.ok(h.saved.every(v=>Object.keys(v).every(k=>['pageId','response','cursorPageId'].includes(k))));
});

test('elapsed deadline handles early scheduler and late callbacks without accumulated counter drift',()=>{
 const clock=fakeClock(),phases=[],timer=createTextTimer({...clock,onChange:p=>phases.push(p)});timer.play(10000);clock.advance(9000);clock.captured[0]();assert.equal(timer.visible,true);clock.advance(999);assert.equal(timer.visible,true);clock.advance(1);assert.equal(timer.visible,false);assert.equal(timer.phase,'expired');timer.play(10000);clock.advance(12000);assert.equal(timer.phase,'expired');timer.stop();assert.equal(clock.jobs,0);
});

test('hidden-tab cancellation, untimed alternative, navigation and explicit unmount hide timed content',async t=>{
 const h=harness(t,[memory,{id:'after',type:'reading',title:'After',html:'Next page'}]);
 h.click('play');Object.defineProperty(h.w.document,'hidden',{configurable:true,value:true});h.w.document.dispatchEvent(new h.w.Event('visibilitychange'));assert.equal(h.host.querySelector('.text-reader-value'),null);assert.equal(h.clock.jobs,0);h.click('play');assert.equal(h.clock.jobs,0);
 Object.defineProperty(h.w.document,'hidden',{configurable:true,value:false});h.w.document.dispatchEvent(new h.w.Event('visibilitychange'));assert.equal(h.host.querySelector('textarea'),null);
 h.click('study');assert.equal(h.host.querySelector('.text-reader-value').textContent,memory.value);assert.equal(h.clock.jobs,0);h.click('hide-study');assert.equal(h.host.querySelector('.text-reader-value'),null);h.input('attempt');h.click('reveal');h.click('next');assert.equal(h.w.document.activeElement.textContent,'After');
 h.click('back');assert.equal(h.host.querySelector('.text-reader-value'),null);h.click('play');const stale=h.clock.captured.at(-1);h.binding.destroy();assert.equal(h.host.textContent,'');assert.equal(h.clock.jobs,0);stale();assert.equal(h.host.textContent,'');
});

test('removing a host cancels timers and stale asynchronous loads never update it',async t=>{
 let resolve;const h=harness(t,[memory],{loadProgress:()=>new Promise(r=>resolve=r)});await tick();h.click('play');h.host.remove();await tick();assert.equal(h.clock.jobs,0);assert.equal(h.host.textContent,'');resolve({cursorPageId:memory.id,responses:{[memory.id]:{text:'stale',revealed:true}}});await tick();assert.equal(h.host.textContent,'');
});

test('choices require explicit selection and Check; recall requires nonblank commitment, preserves exact Hebrew and safe source HTML',async t=>{
 const choice={id:'choice',type:'choice',title:'Choice',options:['מָנָה','test'],answer:0,explanation:'Feedback only after Check',gate:'commit',html:'<img src=x onerror="alert(1)"><script>leak()</script>'};
 const h=harness(t,[choice,{id:'recall',type:'recall',title:'Recall',prompt:'Write',answer:'Hidden answer model',gate:'reveal'}]);
 assert.equal(h.host.textContent.includes(choice.explanation),false);assert.equal(h.host.querySelector('[data-reader-action="check"]').disabled,true);assert.equal(h.host.querySelector('[data-reader-action="next"]').disabled,true);assert.equal(h.host.querySelector('script'),null);assert.equal(h.host.querySelector('[onerror]'),null);
 const radio=h.host.querySelector('input[type="radio"]');radio.checked=true;radio.dispatchEvent(new h.w.Event('change',{bubbles:true}));assert.equal(h.w.document.activeElement.type,'radio');assert.equal(h.host.textContent.includes(choice.explanation),false);h.click('check');assert.match(h.host.textContent,/Correct/);assert.match(h.host.textContent,/Feedback only after Check/);assert.ok([...h.host.querySelectorAll('input')].every(el=>el.disabled));assert.equal(h.host.querySelector('[data-reader-action="check"]'),null);
 h.click('next');assert.equal(h.w.document.activeElement.textContent,'Recall');assert.equal(h.host.textContent.includes('Hidden answer model'),false);h.input('  ');h.click('reveal');assert.equal(h.host.querySelector('.text-reader-model'),null);h.input('תּוֹדָה');assert.equal(h.host.querySelector('textarea').value,'תּוֹדָה');h.click('reveal');assert.match(h.host.textContent,/Hidden answer model/);assert.match(h.host.textContent,/self-check/);assert.equal(h.host.querySelector('textarea').readOnly,true);
 await h.binding.settled();assert.ok(h.saved.some(s=>s.response.text==='תּוֹדָה'));
});

test('save failure is retryable, input remains, writes serialize and stale loads cannot replace user edits',async t=>{
 let fail=true,resolve;const calls=[];const h=harness(t,[{id:'r',type:'recall',answer:'model'}],{loadProgress:()=>new Promise(r=>resolve=r),saveProgress:async r=>{calls.push(r);if(fail)throw new Error('offline');}});await tick();h.input('new edit');await h.binding.settled();assert.match(h.host.textContent,/could not save/);assert.equal(h.host.querySelector('textarea').value,'new edit');resolve({responses:{r:{text:'stale',revealed:true}}});await tick();assert.equal(h.host.querySelector('textarea').value,'new edit');assert.equal(h.host.querySelector('.text-reader-model'),null);fail=false;h.click('retry-save');await h.binding.settled();assert.match(h.host.textContent,/Text progress saved/);assert.equal(calls.at(-1).response.text,'new edit');
});

test('canonical vocabulary cards and media use existing actions; unresolved targets are explicit and no parallel lexemes appear',t=>{
 const canonical=seed.words[0],h=harness(t,[{id:'v',type:'vocabulary',wordIds:[canonical.id],unresolvedTargetIds:['draft.target']}],{word:id=>id===canonical.id?canonical:null,renderWord:w=>wordCard(w)});
 assert.equal(h.host.querySelector('[data-action="lookup"]').dataset.value,canonical.id);assert.match(h.host.textContent,/awaiting canonical mapping/);assert.equal(h.host.querySelector('[data-action="lookup"]').dataset.value.includes('.word.'),false);
 assert.equal(textPageMedia({video:'javascript:alert(1)',audio:'file:///secret'}),'');assert.match(textPageMedia({video:'https://fixture.invalid/approved.mp4'}),/controls preload="metadata"/);assert.doesNotMatch(textPageMedia({video:'https://fixture.invalid/approved.mp4'}),/autoplay/);
});

test('saved response identities survive page reordering and are independent of course completion',t=>{
 const h=harness(t,[{id:'second',type:'complete',title:'Reflection'},{id:'first',type:'recall',answer:'model'}],{initialState:{cursorPageId:'first',responses:{first:{text:'my prior answer',revealed:true}}}});
 assert.equal(h.host.querySelector('textarea').value,'my prior answer');assert.match(h.host.textContent,/Page 2 of 2/);h.click('back');assert.match(h.host.textContent,/Reflection/);assert.equal(h.saved.some(s=>'completed' in s),false);
});

test('all 154 supplied draft pages render and traverse through the native contract without creating vocabulary records',async t=>{
 const source=JSON.parse(readFileSync(new URL('../docs/curriculum/first20-20261025/content.json',import.meta.url),'utf8'));let count=0;
 for(const lesson of source.lessons){
  // Explicit test adapter only. Production draft import/mapping belongs to Lead.
  const pages=lesson.pages.map(p=>({...p,sourceStage:p.stage,gate:['choice','recall','timedRecall'].includes(p.type)?'reveal':'none',...(p.type==='vocabulary'?{wordIds:[],unresolvedTargetIds:(p.words||[]).map(w=>w.id)}:{})}));
  const h=harness(t,pages,{saveProgress:undefined});
  for(const [i,p] of pages.entries()){
   assert.match(h.host.textContent,new RegExp('Page '+(i+1)+' of '+pages.length));
   if(p.type==='choice'){const radio=h.host.querySelectorAll('input[type="radio"]')[p.answer];radio.checked=true;radio.dispatchEvent(new h.w.Event('change',{bubbles:true}));h.click('check');}
   if(p.type==='timedRecall'){h.click('play');h.clock.advance(p.durationMs);assert.equal(h.host.querySelector('.text-reader-value'),null);}
   if(['recall','timedRecall'].includes(p.type)){h.input('SYNTHETIC traversal attempt');h.click('reveal');assert.ok(h.host.querySelector('.text-reader-model'));if(p.type==='timedRecall'&&!p.answer)assert.match(h.host.querySelector('.text-reader-model').textContent,new RegExp(p.value));}
   if(i<pages.length-1){assert.equal(h.host.querySelector('[data-reader-action="next"]').disabled,false);h.click('next');}count++;
  }
  assert.equal(h.host.querySelectorAll('.word-card').length,0);h.binding.destroy();
 }
 assert.equal(count,154);
});

test('incomplete timed attempts are cancelled by tab hiding and require fresh Play',t=>{
 const h=harness(t,[{...memory,answer:undefined}]);h.click('play');h.clock.advance(10000);h.input('partial');Object.defineProperty(h.w.document,'hidden',{configurable:true,value:true});h.w.document.dispatchEvent(new h.w.Event('visibilitychange'));Object.defineProperty(h.w.document,'hidden',{configurable:true,value:false});h.w.document.dispatchEvent(new h.w.Event('visibilitychange'));assert.equal(h.host.querySelector('textarea'),null);assert.equal(h.binding.getState().responses[memory.id].text,undefined);h.click('play');assert.equal(h.host.querySelector('.text-reader-value').textContent,memory.value);
});

test('native lesson markup and Preview share the reader; Watch/Read and legacy text remain available without Preview persistence',async t=>{
 const dom=new JSDOM('<main></main>',{pretendToBeVisual:true}),w=dom.window; t.after(()=>w.close());const content=structuredClone(seed),l=content.lessons[0];l.compositionVersion=2;l.blocks=[{id:'explanation.component',type:'explanation',source:'inline',renderer:'text',text:'',textPages:pack([{id:'one',type:'reading',title:'Shared page',html:'<b>Teaching</b>'},{id:'two',type:'recall',answer:'model'}]),video:'https://fixture.invalid/lesson.mp4'}];
 const projected=portionLesson(l,l.blocks[0].id);assert.equal(projected.textComponentId,l.blocks[0].id);assert.equal(hasTextPages(projected),true);assert.match(learnMedia(projected,'read',v=>v),/data-text-reader/);assert.match(learnMedia({explanation:'legacy'},'read',v=>v),/legacy/);
 const calls=[],renderer=createLearnerRenderer({renderLesson:createLessonRenderer(marked,createPurifier(w),w.document)}),container=w.document.querySelector('main');let dispose=renderer.mount(container,{content,lessonId:l.id,step:'learn',componentId:l.blocks[0].id,preferences:{},actions:new Proxy({},{get:(_,name)=>(...args)=>calls.push([name,...args])})});
 assert.ok(container.querySelector('video'));container.querySelector('[data-preview-medium="read"]').click();assert.equal(container.querySelector('[data-reader-heading]').textContent,'Shared page');container.querySelector('[data-reader-action="next"]').click();assert.ok(container.querySelector('textarea'));assert.equal(calls.length,0);dispose();assert.equal(container.textContent,'');
});
