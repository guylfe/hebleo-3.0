// Reviewer-only simulated CSSOM probes. This is not native browser evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {mountExerciseDock} from '../public/exercise-actions.js';

const rect=(left,top,width,height)=>({left,top,width,height,right:left+width,bottom:top+height});
const turn=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(t,{nested=false,priority=''}={}){
 const dom=new JSDOM('<header class="app-header" style="position:sticky"><button id="outside">Navigation</button></header><main><div id="scroller" style="overflow-y:auto"><textarea>אבג SYNTHETIC</textarea><input></div><nav data-exercise-dock style="gap:8px"><button>Check</button></nav></main>',{pretendToBeVisual:true});
 const w=dom.window,d=w.document,scope=d.querySelector('main'),field=d.querySelector('textarea'),dock=d.querySelector('nav'),scroller=d.querySelector('#scroller');
 Object.defineProperties(w,{innerWidth:{value:480},innerHeight:{value:800}});
 let fieldTop=300,keyboardTop=400,fieldHeight=200,documentScrolls=0,nestedScrolls=0;
 const jobs=new Map(),observers=[];let seq=0;
 w.requestAnimationFrame=fn=>{jobs.set(++seq,fn);return seq;};w.cancelAnimationFrame=id=>jobs.delete(id);
 w.ResizeObserver=class{nodes=new Set();constructor(fn){this.fn=fn;observers.push(this);}observe(n){this.nodes.add(n);}unobserve(n){this.nodes.delete(n);}disconnect(){this.nodes.clear();}};
 scope.getBoundingClientRect=()=>rect(20,0,440,1600);
 d.querySelector('header').getBoundingClientRect=()=>rect(0,0,480,220);
 dock.getBoundingClientRect=()=>rect(20,800-(parseFloat(dock.style.bottom)||0)-68,440,68);
 field.getBoundingClientRect=()=>rect(30,fieldTop,400,Math.min(fieldHeight,parseFloat(field.style.maxHeight)||Infinity));
 d.querySelector('input').getBoundingClientRect=()=>rect(30,250,400,30);
 scroller.getBoundingClientRect=()=>rect(20,230,440,350);
 if(nested)Object.defineProperties(scroller,{scrollHeight:{value:1000},clientHeight:{value:350}});
 const move=(target,amount)=>{fieldTop-=amount;target.dispatchEvent(new w.Event('scroll'));};
 w.scrollBy=options=>{documentScrolls++;move(w,options.top);};
 scroller.scrollBy=options=>{nestedScrolls++;move(scroller,options.top);};
 for(const [key,value]of [['min-height','200px'],['max-height','450px'],['overflow-y','scroll']])field.style.setProperty(key,value,priority);
 const original=field.style.cssText;
 const panel=d.createElement('div');panel.className='hebleo-keyboard__panel';panel.getBoundingClientRect=()=>rect(0,keyboardTop,480,800-keyboardTop);d.body.append(panel);
 const owner=mountExerciseDock(scope);field.focus();field.setSelectionRange(1,2);
 const flush=async()=>{await turn();for(let n=0;n<12&&jobs.size;n++){const batch=[...jobs.values()];jobs.clear();for(const fn of batch)fn(n*16);await turn();}assert.equal(jobs.size,0,'scroll/resize callbacks must quiesce');};
 const resize=()=>{for(const o of observers)o.fn([{target:scope}]);};
 t.after(()=>{owner.destroy();w.close();});
 return {w,d,scope,field,dock,panel,owner,original,flush,resize,setKeyboardTop:n=>keyboardTop=n,setFieldHeight:n=>fieldHeight=n,get documentScrolls(){return documentScrolls;},get nestedScrolls(){return nestedScrolls;}};
}

test('QA-KBD-09 nested scroller owns recovery and actual scroll events settle',async t=>{
 const f=fixture(t,{nested:true});await f.flush();assert.equal(f.documentScrolls,0);assert.equal(f.nestedScrolls,1);const r=f.field.getBoundingClientRect();assert.ok(r.top>=238);assert.ok(r.bottom<=f.dock.getBoundingClientRect().top-8);assert.equal(f.field.value,'אבג SYNTHETIC');assert.equal(f.field.selectionStart,1);assert.equal(f.field.selectionEnd,2);f.resize();await f.flush();assert.equal(f.nestedScrolls,1);
});

test('QA-KBD-10 repeated constrain/restore retains node, caret and authored values',async t=>{
 const f=fixture(t);await f.flush();const node=f.field;
 for(let n=0;n<4;n++){f.setKeyboardTop(700);f.resize();await f.flush();assert.equal(f.field.style.cssText,f.original);f.setKeyboardTop(400);f.resize();await f.flush();assert.equal(f.field.style.maxHeight,'88px');assert.equal(f.d.activeElement,node);assert.equal(node.selectionStart,1);assert.equal(node.selectionEnd,2);}
 f.owner.destroy();assert.equal(node.style.cssText,f.original);
});

test('QA-KBD-11 focus to another answer restores old constraints',async t=>{
 const f=fixture(t);await f.flush();f.d.querySelector('input').focus();await f.flush();assert.equal(f.field.style.cssText,f.original);
});

for(const target of ['dock','outside','blur'])test('QA-KBD-12 temporary constraints restore on '+target+' focus departure',async t=>{
 const f=fixture(t);await f.flush();assert.equal(f.field.style.maxHeight,'88px');
 if(target==='blur')f.field.blur();else f.d.querySelector(target==='dock'?'nav button':'#outside').focus();
 await f.flush();assert.equal(f.field.style.cssText,f.original,'the unfocused answer must regain authored sizing without unrelated resize/scroll');
});

test('QA-KBD-13 exact inline priorities survive constraint disposal',async t=>{
 const f=fixture(t,{priority:'important'});await f.flush();f.owner.destroy();for(const key of ['min-height','max-height','overflow-y'])assert.equal(f.field.style.getPropertyPriority(key),'important',key);
});

test('QA-KBD-14 constraint map releases detached answer on destroy',async t=>{
 const f=fixture(t);await f.flush();const field=f.field;field.remove();await f.flush();f.owner.destroy();assert.equal(field.style.cssText,f.original);
});
