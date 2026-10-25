// Simulated geometry regression probes, not native rendering or physical-input evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {pathToFileURL} from 'node:url';
const {mountExerciseDock}=await import(process.env.HEBLEO_DOCK_SOURCE?pathToFileURL(process.env.HEBLEO_DOCK_SOURCE):'../public/exercise-actions.js');
const wait=()=>new Promise(r=>setTimeout(r,55));
const rect=(left,top,width,height)=>({left,top,width,height,right:left+width,bottom:top+height});
function fixture(t,{preview=false,keyboard=true,header=false}={}){
 const dom=new JSDOM((header?'<header class="app-header" style="position:sticky"></header>':'')+(preview?'<dialog open>':'')+'<main><textarea></textarea><nav data-exercise-dock style="gap:8px"><button>Continue</button></nav></main>'+(preview?'</dialog>':'')+(keyboard?'<aside><button class="hebleo-keyboard__launcher">Keyboard</button></aside>':''),{pretendToBeVisual:true}),w=dom.window,d=w.document;
 Object.defineProperty(w,'innerWidth',{value:480});Object.defineProperty(w,'innerHeight',{value:800});
 const observers=[];w.ResizeObserver=class{nodes=new Set();constructor(fn){this.fn=fn;observers.push(this);}observe(node){this.nodes.add(node);}unobserve(node){this.nodes.delete(node);}disconnect(){this.nodes.clear();}};
 const scope=d.querySelector('main'),dock=d.querySelector('nav'),field=d.querySelector('textarea'),launcher=d.querySelector('.hebleo-keyboard__launcher');
 let dockHeight=68,launcherTop=724,fieldTop=100,fieldHeight=60,scrolls=0;
 scope.getBoundingClientRect=()=>rect(20,0,440,1000);
 dock.getBoundingClientRect=()=>rect(Number.parseFloat(dock.style.left)||0,800-(Number.parseFloat(dock.style.bottom)||0)-dockHeight,Number.parseFloat(dock.style.width)||440,dockHeight);
 if(launcher)launcher.getBoundingClientRect=()=>rect(410,launcherTop,54,54);
 if(preview)d.querySelector('dialog').getBoundingClientRect=()=>rect(10,20,460,740);
 if(header)d.querySelector('header').getBoundingClientRect=()=>rect(0,0,480,220);
 field.getBoundingClientRect=()=>rect(30,fieldTop,400,Math.min(fieldHeight,Number.parseFloat(field.style.maxHeight)||Infinity));
 const scrollBy=options=>{scrolls++;fieldTop-=options.top;};w.scrollBy=scrollBy;if(preview)d.querySelector('dialog').scrollBy=scrollBy;
 if(launcher)launcher.parentElement.className='hebleo-keyboard';
 const owner=mountExerciseDock(scope);t.after(()=>{owner.destroy();w.close();});
 return {w,d,scope,dock,field,launcher,owner,observers,setDockHeight:n=>dockHeight=n,setLauncherTop:n=>launcherTop=n,setField:(top,height)=>{fieldTop=top;fieldHeight=height;},occludeField:()=>fieldTop=dock.getBoundingClientRect().top+10,get scrolls(){return scrolls;},resize(node){for(const o of observers)if(o.nodes.has(node))o.fn([{target:node}]);}};
}

for(const preview of [false,true])test('TXT-NATIVE-01 '+(preview?'Preview':'learner')+' collapsed launcher clears action dock at changing heights',async t=>{
 const f=fixture(t,{preview});
 assert.ok(f.dock.getBoundingClientRect().bottom<=f.launcher.getBoundingClientRect().top-8,'launcher must not overlap the action row');
 for(const height of [44,128]){f.setDockHeight(height);f.resize(f.dock);await wait();assert.ok(f.dock.getBoundingClientRect().bottom<=716);assert.ok(Number.parseFloat(f.scope.style.getPropertyValue('--exercise-dock-reserve'))>=height+16);}
 f.setLauncherTop(660);f.resize(f.launcher);await wait();assert.ok(f.dock.getBoundingClientRect().bottom<=652,'launcher height/position change is observed');
});

test('TXT-NATIVE-01 open keyboard reflow observes panel size, preserves focused answer and reserves scroll space',async t=>{
 const f=fixture(t),panel=f.d.createElement('div');panel.className='hebleo-keyboard__panel';let top=500;panel.getBoundingClientRect=()=>rect(0,top,480,800-top);f.launcher.parentElement.classList.add('hebleo-keyboard--open');f.launcher.parentElement.append(panel);await wait();
 assert.ok(f.observers.some(o=>o.nodes.has(panel)),'new keyboard panel is observed');assert.equal(f.dock.getBoundingClientRect().bottom,492);
 f.field.focus();f.occludeField();top=350;f.resize(panel);await wait();assert.equal(f.dock.getBoundingClientRect().bottom,342);assert.equal(f.d.activeElement,f.field);assert.ok(f.scrolls>0,'focused answer is scrolled above reflowed actions');
 panel.remove();await wait();assert.ok(f.observers.every(o=>!o.nodes.has(panel)));assert.equal(f.dock.getBoundingClientRect().bottom,716);assert.ok(Number.parseFloat(f.scope.style.getPropertyValue('--exercise-dock-reserve'))>=474,'collapse retains reserve to avoid scroll clamp');
});

test('TXT-NATIVE-01 missing, hidden and horizontally separate keyboards reserve no obstacle; Preview stays in dialog',async t=>{
 const f=fixture(t,{keyboard:false});assert.equal(f.dock.getBoundingClientRect().bottom,800);
 const hidden=f.d.createElement('div');hidden.className='hebleo-keyboard__panel';hidden.style.display='none';hidden.getBoundingClientRect=()=>rect(0,300,480,500);f.d.body.append(hidden);await wait();assert.equal(f.dock.getBoundingClientRect().bottom,800);
 const g=fixture(t,{preview:true});g.scope.getBoundingClientRect=()=>rect(20,0,300,1000);g.owner.refresh();assert.equal(g.dock.getBoundingClientRect().bottom,759,'nonintersecting launcher does not lift dialog dock');
});

test('TXT-NATIVE-01 follows transform frames and releases observers/queued updates on departure',async t=>{
 const f=fixture(t),panel=f.d.createElement('div');panel.className='hebleo-keyboard__panel';panel.style.transitionDuration='0.15s';panel.style.transitionDelay='0s';let top=760;panel.getBoundingClientRect=()=>rect(0,top,480,800-top);f.launcher.parentElement.classList.add('hebleo-keyboard--open');f.launcher.parentElement.append(panel);await wait();
 panel.dispatchEvent(new f.w.Event('transitionrun',{bubbles:true}));top=400;await wait();assert.equal(f.dock.getBoundingClientRect().bottom,392,'transform position is followed without ResizeObserver size event');
 f.owner.destroy();top=200;f.w.dispatchEvent(new f.w.Event('resize'));await wait();assert.equal(f.scope.hasAttribute('data-exercise-dock-host'),false);assert.equal(f.scope.style.getPropertyValue('--exercise-dock-reserve'),'');assert.ok(f.observers.every(o=>!o.nodes.size));
});

test('QA-KBD-08 sticky learner header bounds short textarea; collapse restores authored size/caret',async t=>{
 const f=fixture(t,{header:true});f.setField(300,100);f.field.style.cssText='min-height:100px;max-height:300px;overflow-y:scroll';f.field.value='אבג';f.field.setSelectionRange(1,2);
 const panel=f.d.createElement('div');panel.className='hebleo-keyboard__panel';let top=600;panel.getBoundingClientRect=()=>rect(0,top,480,800-top);f.d.body.append(panel);await wait();f.field.focus();
 top=400;f.resize(panel);await wait();const r=f.field.getBoundingClientRect();assert.ok(r.top>=228);assert.ok(r.bottom<=f.dock.getBoundingClientRect().top-8);assert.equal(f.field.style.maxHeight,'88px');assert.equal(f.d.activeElement,f.field);assert.equal(f.field.value,'אבג');assert.equal(f.field.selectionStart,1);assert.equal(f.field.selectionEnd,2);
 panel.remove();await wait();assert.equal(f.field.style.minHeight,'100px');assert.equal(f.field.style.maxHeight,'300px');assert.equal(f.field.style.overflowY,'scroll');
});

test('QA-KBD-08 Preview ignores app header behind modal and restores temporary constraints on destroy',async t=>{
 const f=fixture(t,{header:true,preview:true});f.setField(100,700);f.field.focus();f.owner.refresh();assert.ok(f.field.getBoundingClientRect().top<220,'background header must not consume modal space');assert.ok(f.field.style.maxHeight);f.owner.destroy();assert.equal(f.field.style.maxHeight,'');assert.equal(f.field.style.minHeight,'');assert.equal(f.field.style.overflowY,'');
});
