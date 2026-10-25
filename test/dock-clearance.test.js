import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {mountExerciseDock} from '../public/exercise-actions.js';

// Supplied rectangles are synthetic geometry, never native layout evidence.
function fixture(t,width=484.8,height=697.6){
 const dom=new JSDOM('<main><button>Answer</button><nav data-exercise-dock><button>Continue</button></nav></main><div class="hebleo-keyboard"><button class="hebleo-keyboard__launcher">Keyboard</button><section class="hebleo-keyboard__panel"></section></div>',{pretendToBeVisual:true});
 t.after(()=>dom.window.close());const w=dom.window,d=w.document,host=d.querySelector('main'),dock=d.querySelector('nav'),keyboard=d.querySelector('.hebleo-keyboard'),panel=keyboard.querySelector('section');
 Object.defineProperties(w,{innerWidth:{value:width,writable:true},innerHeight:{value:height,writable:true}});
 const vv=new w.EventTarget();Object.assign(vv,{offsetLeft:0,offsetTop:0,width,height});Object.defineProperty(w,'visualViewport',{value:vv});
 let dockHeight=60,panelHeight=280,callbacks=0;const observers=[];
 w.ResizeObserver=class{constructor(fn){this.fn=()=>{callbacks++;fn();};this.targets=new Set();observers.push(this);}observe(el){this.targets.add(el);}unobserve(el){this.targets.delete(el);}disconnect(){this.targets.clear();}};
 host.getBoundingClientRect=()=>({left:16,right:w.innerWidth-16,top:100,bottom:1200});
 dock.getBoundingClientRect=()=>({height:dockHeight,top:w.innerHeight-parseFloat(dock.style.bottom||0)-dockHeight,bottom:w.innerHeight-parseFloat(dock.style.bottom||0)});
 panel.getBoundingClientRect=()=>({height:panelHeight,top:w.innerHeight-panelHeight});
 const owner=mountExerciseDock(host);t.after(()=>owner.destroy());
 return {w,d,host,dock,keyboard,panel,owner,observers,setDockHeight:v=>dockHeight=v,setPanelHeight:v=>panelHeight=v,bottom:()=>parseFloat(d.documentElement.style.getPropertyValue('--exercise-keyboard-launcher-bottom')),get callbacks(){return callbacks;}};
}
const tick=()=>new Promise(r=>setTimeout(r,35));

for(const width of [360,484.8,760,1280])test('launcher clears changing dock and open keyboard at synthetic width '+width,async t=>{
 const h=fixture(t,width);assert.equal(h.bottom(),72);
 h.setDockHeight(104);h.observers[0].fn();await tick();assert.equal(h.bottom(),116);
 h.keyboard.classList.add('hebleo-keyboard--open');await tick();assert.equal(h.dock.style.bottom,'280px');assert.equal(h.bottom(),396);
 assert.ok(h.observers[0].targets.has(h.panel));h.setPanelHeight(340);h.observers[0].fn();await tick();assert.equal(h.dock.style.bottom,'340px');assert.equal(h.bottom(),456);
 // During the slide-in, top can still be below the viewport. Full panel height
 // must be reserved before the transform reaches its final position.
 h.panel.getBoundingClientRect=()=>({height:340,top:800});h.owner.refresh();assert.equal(h.dock.style.bottom,'340px');
 h.keyboard.classList.remove('hebleo-keyboard--open');await tick();assert.equal(h.dock.style.bottom,'0px');assert.equal(h.bottom(),116);
});

test('visual viewport changes and modal suspension release only the active launcher reservation',async t=>{
 const h=fixture(t);const vv=h.w.visualViewport;Object.assign(vv,{offsetLeft:0,offsetTop:100,width:360,height:400});vv.dispatchEvent(new h.w.Event('resize'));await tick();assert.ok(Math.abs(parseFloat(h.dock.style.bottom)-197.6)<.001);assert.ok(Math.abs(h.bottom()-269.6)<.001);
 const modal=h.d.createElement('dialog');modal.open=true;modal.innerHTML='<section><nav data-exercise-dock>Preview</nav></section>';h.d.body.append(modal);modal.getBoundingClientRect=()=>({bottom:480});const scope=modal.querySelector('section'),dock=scope.querySelector('nav');scope.getBoundingClientRect=()=>({left:24,right:330});dock.getBoundingClientRect=()=>({height:80});
 h.owner.refresh();assert.equal(h.dock.hidden,true);assert.equal(h.bottom()||0,0);
 const preview=mountExerciseDock(scope);assert.equal(dock.hidden,false);assert.ok(Math.abs(h.bottom()-310.6)<.001);
 h.owner.destroy();assert.ok(Math.abs(h.bottom()-310.6)<.001,'learner disposal must preserve Preview owner');
 preview.destroy();assert.equal(h.d.documentElement.style.getPropertyValue('--exercise-keyboard-launcher-bottom'),'');
});

test('drawer suspension, navigation removal and explicit disposal clear shared state and observers',async t=>{
 const h=fixture(t);const shell=h.d.createElement('aside');shell.className='nav-shell';shell.dataset.courseOverlay='true';h.d.body.append(shell);await tick();assert.equal(h.dock.hidden,true);assert.equal(h.d.documentElement.style.getPropertyValue('--exercise-keyboard-launcher-bottom'),'');
 shell.remove();await tick();assert.equal(h.dock.hidden,false);assert.equal(h.bottom(),72);
 h.host.remove();await tick();assert.equal(h.d.documentElement.style.getPropertyValue('--exercise-keyboard-launcher-bottom'),'');assert.equal(h.host.style.getPropertyValue('--exercise-dock-reserve'),'');assert.equal(h.host.hasAttribute('data-exercise-dock-host'),false);assert.equal(h.observers[0].targets.size,0);
 h.w.dispatchEvent(new h.w.Event('resize'));h.owner.refresh();await tick();assert.equal(h.d.documentElement.style.getPropertyValue('--exercise-keyboard-launcher-bottom'),'');
});

test('keyboard replacement is observed and prior inline launcher reservation is restored',async t=>{
 const h=fixture(t);h.owner.destroy();h.d.documentElement.style.setProperty('--exercise-keyboard-launcher-bottom','9px');const next=mountExerciseDock(h.host);const replacement=h.panel.cloneNode();h.panel.replaceWith(replacement);await tick();assert.ok(h.observers.at(-1).targets.has(replacement));assert.equal(h.observers.at(-1).targets.has(h.panel),false);next.destroy();assert.equal(h.d.documentElement.style.getPropertyValue('--exercise-keyboard-launcher-bottom'),'9px');
});
