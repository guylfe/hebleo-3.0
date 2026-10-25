// Independent reviewer probes: deterministic simulated geometry, never native evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {mountExerciseDock} from '../public/exercise-actions.js';

const box=(left,top,width,height)=>({left,top,width,height,right:left+width,bottom:top+height});
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(t,{preview=false}={}){
 const dom=new JSDOM((preview?'<dialog open>':'')+'<main><textarea>אבג SYNTHETIC</textarea><nav data-exercise-dock style="gap:8px"><button disabled>Check</button></nav></main>'+(preview?'</dialog>':''),{pretendToBeVisual:true});
 const w=dom.window,d=w.document,scope=d.querySelector('main'),dock=d.querySelector('nav'),field=d.querySelector('textarea');
 Object.defineProperties(w,{innerWidth:{value:480},innerHeight:{value:800}});
 let now=0,sequence=0,measurements=0,scrolls=0,fieldTop=100,dockHeight=68,scopeLeft=20,scopeWidth=440;
 const jobs=new Map(),observers=[];
 w.requestAnimationFrame=fn=>{jobs.set(++sequence,fn);return sequence;};w.cancelAnimationFrame=id=>jobs.delete(id);
 w.performance.now=()=>now;
 w.ResizeObserver=class{nodes=new Set();constructor(fn){this.fn=fn;observers.push(this);}observe(n){this.nodes.add(n);}unobserve(n){this.nodes.delete(n);}disconnect(){this.nodes.clear();}};
 const vv=new w.EventTarget();Object.assign(vv,{width:480,height:800,offsetLeft:0,offsetTop:0});Object.defineProperty(w,'visualViewport',{value:vv});
 scope.getBoundingClientRect=()=>{measurements++;return box(scopeLeft,0,scopeWidth,1600);};
 dock.getBoundingClientRect=()=>box(Number.parseFloat(dock.style.left)||0,800-(Number.parseFloat(dock.style.bottom)||0)-dockHeight,Number.parseFloat(dock.style.width)||440,dockHeight);
 if(preview)d.querySelector('dialog').getBoundingClientRect=()=>box(10,20,460,740);
 field.getBoundingClientRect=()=>box(30,fieldTop,400,60);
 // Model CSSOM center alignment in the scrollport. Learner scrolls the document;
 // Preview scrolls its dialog (20..760), including its CSS fallback 100px end inset.
 // The measured reserve is on a non-scrolling child, not either scroll container.
 field.scrollIntoView=options=>{scrolls++;assert.equal(options.block,'center');fieldTop=(preview?(20+760-100)/2:800/2)-60/2;};
  // CSSOM scrollBy moves the field by the requested delta in its actual owner.
  const scrollBy=options=>{scrolls++;fieldTop-=options.top;};
  w.scrollBy=scrollBy;if(preview)d.querySelector('dialog').scrollBy=scrollBy;
 const owner=mountExerciseDock(scope);t.after(()=>{owner.destroy();w.close();});
 const flush=async(ms=16)=>{await tick();now+=ms;const current=[...jobs];jobs.clear();for(const [,fn]of current)fn(now);await tick();};
 function keyboard({top=600,left=0,width=480,height=200,css=''}={}){const node=d.createElement('section');node.className='hebleo-keyboard__panel';node.style.cssText=css;const geometry={top,left,width,height};node.getBoundingClientRect=()=>box(geometry.left,geometry.top,geometry.width,geometry.height);d.body.append(node);return {node,geometry};}
 const resize=node=>{for(const o of observers)if(o.nodes.has(node))o.fn([{target:node}]);};
 return {w,d,scope,dock,field,owner,vv,jobs,observers,flush,keyboard,resize,setFieldTop:y=>fieldTop=y,setDockHeight:h=>dockHeight=h,setHost:(x,width)=>{scopeLeft=x;scopeWidth=width;},get scrolls(){return scrolls;},get measurements(){return measurements;}};
}

test('QA-KBD-01 absent/zero-size/hidden/transparent/outside horizontal keyboard leaves normal dock',async t=>{
 const f=fixture(t);assert.equal(f.dock.style.bottom,'0px');
 for(const options of [{height:0},{css:'display:none'},{css:'visibility:hidden'},{css:'opacity:0'},{left:470,width:10}]){
  const {node}=f.keyboard(options);await f.flush();assert.equal(f.dock.style.bottom,'0px',JSON.stringify(options));node.remove();await f.flush();
 }
 assert.equal(f.jobs.size,0,'measurement mutations must settle');
});

test('QA-KBD-02 late mount, resize, replacement, removal and multi-surface minimum',async t=>{
 const f=fixture(t),a=f.keyboard({top:600});await f.flush();assert.equal(f.dock.getBoundingClientRect().bottom,592);
 const b=f.keyboard({top:400});await f.flush();assert.equal(f.dock.getBoundingClientRect().bottom,392);
 a.geometry.top=300;f.resize(a.node);await f.flush();assert.equal(f.dock.getBoundingClientRect().bottom,292);
 a.node.remove();await f.flush();assert.ok(f.observers.every(o=>!o.nodes.has(a.node)));assert.equal(f.dock.getBoundingClientRect().bottom,392);
 b.node.remove();await f.flush();assert.equal(f.dock.getBoundingClientRect().bottom,800);assert.ok(Number.parseFloat(f.scope.style.getPropertyValue('--exercise-dock-reserve'))>=592);
});

for(const preview of [false,true])test('QA-KBD-03 '+(preview?'Preview':'learner')+' modal/inert suspension restores unchanged primary action',async t=>{
 const f=fixture(t,{preview}),button=f.dock.querySelector('button'),other=f.d.createElement('dialog');other.open=true;f.d.body.append(other);await f.flush();assert.equal(f.dock.hidden,true);assert.equal(f.dock.inert,true);
 other.remove();await f.flush();assert.equal(f.dock.hidden,false);assert.equal(f.dock.querySelector('button'),button);assert.equal(button.disabled,true);
 f.scope.setAttribute('inert','');await f.flush();assert.equal(f.dock.hidden,true);f.scope.removeAttribute('inert');await f.flush();assert.equal(f.dock.hidden,false);
 assert.equal(f.dock.getBoundingClientRect().bottom,preview?759:800);
});

test('QA-KBD-04 viewport offsets, host reflow and action-height reflow update and then quiesce',async t=>{
 const f=fixture(t);f.vv.offsetTop=100;f.vv.height=500;f.vv.offsetLeft=30;f.vv.width=400;f.vv.dispatchEvent(new f.w.Event('resize'));await f.flush();assert.equal(f.dock.getBoundingClientRect().bottom,600);assert.equal(f.dock.style.left,'38px');assert.equal(f.dock.style.width,'384px');
 f.setHost(80,250);f.resize(f.scope);f.setDockHeight(130);f.resize(f.dock);await f.flush();assert.equal(f.dock.style.left,'80px');assert.equal(f.dock.style.width,'250px');assert.ok(Number.parseFloat(f.scope.style.getPropertyValue('--exercise-dock-reserve'))>=146);
 await f.flush();assert.equal(f.jobs.size,0);
});

test('QA-KBD-05 transform frames follow geometry and finish even if final event is absent',async t=>{
 const f=fixture(t),p=f.keyboard({top:600,css:'transition-duration:180ms;transition-delay:20ms'});await f.flush();p.node.dispatchEvent(new f.w.Event('transitionrun',{bubbles:true}));await f.flush();p.geometry.top=350;await f.flush();assert.equal(f.dock.getBoundingClientRect().bottom,342);assert.ok(f.jobs.size>0);
 await f.flush(300);await f.flush();assert.equal(f.jobs.size,0,'deadline stops following a missing transitionend');
 p.node.dispatchEvent(new f.w.Event('transitionrun',{bubbles:true}));await f.flush();p.node.remove();await f.flush();assert.equal(f.jobs.size,0,'removed transition target stops following');
});

test('QA-KBD-06 destroy releases callbacks/listeners/observers including pending transition',async t=>{
 const f=fixture(t),p=f.keyboard({css:'transition-duration:10s;transition-delay:0s'});await f.flush();p.node.dispatchEvent(new f.w.Event('transitionrun',{bubbles:true}));await f.flush();assert.ok(f.jobs.size);f.owner.destroy();f.owner.destroy();assert.equal(f.jobs.size,0);assert.ok(f.observers.every(o=>o.nodes.size===0));
 const before=f.measurements;f.w.dispatchEvent(new f.w.Event('resize'));f.vv.dispatchEvent(new f.w.Event('scroll'));p.node.dispatchEvent(new f.w.Event('transitionrun',{bubbles:true}));f.scope.classList.add('synthetic');await f.flush();f.owner.refresh();assert.equal(f.measurements,before);assert.equal(f.scope.hasAttribute('data-exercise-dock-host'),false);
});

test('QA-KBD-07 reflow preserves answer target, value and selection',async t=>{
 const f=fixture(t),p=f.keyboard({top:600});await f.flush();f.field.focus();f.field.setSelectionRange(1,3);const value=f.field.value;p.geometry.top=350;f.resize(p.node);await f.flush();assert.equal(f.d.activeElement,f.field);assert.equal(f.field.value,value);assert.equal(f.field.selectionStart,1);assert.equal(f.field.selectionEnd,3);assert.equal(f.dock.querySelector('button').disabled,true);
});

for(const preview of [false,true])test('QA-KBD-08 '+(preview?'Preview':'learner')+' reflow recovery must leave focused answer above keyboard/action boundary',async t=>{
 const f=fixture(t,{preview}),p=f.keyboard({top:600});await f.flush();f.setFieldTop(280);f.field.focus();assert.ok(f.field.getBoundingClientRect().bottom<f.dock.getBoundingClientRect().top,'answer starts unobscured');
 p.geometry.top=350;f.resize(p.node);await f.flush();
 console.log('QA-KBD-08 simulated geometry '+JSON.stringify({preview,viewportHeight:800,keyboardTop:350,dock:f.dock.getBoundingClientRect(),answer:f.field.getBoundingClientRect(),scrolls:f.scrolls}));
 assert.ok(f.scrolls>0,'reflow invokes focus recovery');
 assert.ok(f.field.getBoundingClientRect().bottom<=f.dock.getBoundingClientRect().top,'viewport-centered answer must not remain behind actions/keyboard');
});
