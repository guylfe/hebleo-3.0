// One shared action owner for the learner workspace and disposable Studio rehearsal.
// Geometry is measured in the real host; DOM tests establish lifecycle only.
export function exerciseActionDock(primary, back = '', extra = '') {
  return '<nav class="exercise-dock exercise-footer" data-exercise-dock aria-label="Question actions"><div class="exercise-dock-secondary">'+back+extra+'</div><div data-primary-action>'+primary+'</div></nav>';
}

// Several owners can coexist while Preview is above the learner. Only visible
// docks contribute; disposing one owner must not clear another owner's reserve.
const launcherOwners=new WeakMap();
const launcherProperty='--exercise-keyboard-launcher-bottom';
function reserveLauncher(doc,owner,bottom){
  let state=launcherOwners.get(doc);
  if(!state){if(bottom===null)return;state={owners:new Map(),previous:doc.documentElement.style.getPropertyValue(launcherProperty)};launcherOwners.set(doc,state);}
  if(bottom===null)state.owners.delete(owner);else state.owners.set(owner,bottom);
  const value=state.owners.size?Math.max(...state.owners.values())+'px':state.previous;
  const style=doc.documentElement.style;
  if(value){if(style.getPropertyValue(launcherProperty)!==value)style.setProperty(launcherProperty,value);}
  else style.removeProperty(launcherProperty);
  if(!state.owners.size)launcherOwners.delete(doc);
}

export function mountExerciseDock(scope) {
  const dock=scope?.querySelector('[data-exercise-dock]');
  if(!dock)return {destroy(){}};
  const doc=scope.ownerDocument, win=doc.defaultView, dialog=scope.closest('dialog');
  const controller=new win.AbortController(), {signal}=controller;
  const requestFrame=win.requestAnimationFrame?.bind(win)||(fn=>win.setTimeout(fn,0)),cancelFrame=win.cancelAnimationFrame?.bind(win)||win.clearTimeout.bind(win);
  let frame=null, destroyed=false, reserve=0, observedKeyboard=null;
  const launcherOwner={};
  const set=(el,key,value)=>{if(el.style.getPropertyValue(key)!==value)el.style.setProperty(key,value);};
  function measure(){
    frame=null;if(destroyed)return;if(!scope.isConnected){destroy();return;}
    const vv=win.visualViewport, left=vv?.offsetLeft||0, top=vv?.offsetTop||0;
    const right=left+(vv?.width??win.innerWidth), viewportBottom=top+(vv?.height??win.innerHeight);
    const host=scope.getBoundingClientRect(), bounds=dialog?.getBoundingClientRect();
    const otherModal=[...doc.querySelectorAll('dialog[open]')].some(el=>el!==dialog);
    const suspended=Boolean(otherModal||scope.closest('[inert]')||doc.querySelector('.nav-shell[data-course-overlay="true"]')&&!dialog);
    if(dock.hidden!==suspended)dock.hidden=suspended;
    if(dock.inert!==suspended)dock.inert=suspended;
    const keyboard=doc.querySelector('.hebleo-keyboard--open .hebleo-keyboard__panel, .hebleo-keyboard__panel.hebleo-keyboard--open');
    const panel=doc.querySelector('.hebleo-keyboard__panel');
    if(panel!==observedKeyboard){if(observedKeyboard)resize?.unobserve(observedKeyboard);if(panel)resize?.observe(panel);observedKeyboard=panel;}
    const keyboardRect=keyboard?.getBoundingClientRect();
    // The panel slides up from bottom:0. Reserve its final box immediately,
    // rather than measuring an intermediate transform during its transition.
    const keyboardTop=keyboardRect?.height?Math.min(keyboardRect.top,win.innerHeight-keyboardRect.height):viewportBottom;
    const bottom=Math.max(top,Math.min(viewportBottom,bounds?bounds.bottom-1:viewportBottom,keyboardTop));
    const x=Math.max(left+8,host.left), end=Math.min(right-8,host.right);
    set(dock,'left',x+'px');set(dock,'width',Math.max(0,end-x)+'px');
    set(dock,'bottom',Math.max(0,win.innerHeight-bottom)+'px');
    const height=dock.getBoundingClientRect().height;
    reserveLauncher(doc,launcherOwner,suspended?null:Math.max(0,win.innerHeight-bottom)+height+12);
    // Keep the previous reserve during a modal or keyboard collapse to avoid a scroll jump.
    reserve=Math.max(height+Math.max(0,(bounds?.bottom??viewportBottom)-bottom)+16,reserve);
    set(scope,'--exercise-dock-reserve',reserve+'px');
    scope.dataset.exerciseDockHost='';
  }
  const schedule=()=>{if(!destroyed&&frame===null)frame=requestFrame(measure);};
  for(const type of ['resize','scroll'])win.addEventListener(type,schedule,{signal,passive:true,capture:true});
  for(const type of ['resize','scroll'])win.visualViewport?.addEventListener(type,schedule,{signal,passive:true});
  const resize=win.ResizeObserver?new win.ResizeObserver(schedule):null;
  resize?.observe(scope);resize?.observe(dock);if(dialog)resize?.observe(dialog);
  const mutation=new win.MutationObserver(schedule);
  mutation.observe(doc.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','open','inert','data-course-overlay']});
  doc.addEventListener('focusin',event=>{
    const el=event.target;if(!scope.contains(el)||dock.contains(el)||el.closest('.vocabulary-reminder'))return;
    const r=el.getBoundingClientRect(),d=dock.getBoundingClientRect();
    if(r.bottom>d.top&&r.top<d.bottom)el.scrollIntoView?.({block:'center',behavior:'instant'});
  },{signal});
  measure();
  function destroy(){if(destroyed)return;destroyed=true;controller.abort();resize?.disconnect();mutation.disconnect();if(frame!==null)cancelFrame(frame);reserveLauncher(doc,launcherOwner,null);scope.style.removeProperty('--exercise-dock-reserve');delete scope.dataset.exerciseDockHost;}
  return {refresh:measure,destroy};
}
