// One shared action owner for the learner workspace and disposable Studio rehearsal.
// Geometry is measured in the real host; DOM tests establish lifecycle only.
export function exerciseActionDock(primary, back = '', extra = '') {
  return '<nav class="exercise-dock exercise-footer" data-exercise-dock aria-label="Question actions"><div class="exercise-dock-secondary">'+back+extra+'</div><div data-primary-action>'+primary+'</div></nav>';
}

export function mountExerciseDock(scope) {
  const dock=scope?.querySelector('[data-exercise-dock]');
  if(!dock)return {destroy(){}};
  const doc=scope.ownerDocument, win=doc.defaultView, dialog=scope.closest('dialog');
  const controller=new win.AbortController(), {signal}=controller;
  const requestFrame=win.requestAnimationFrame?.bind(win)||(fn=>win.setTimeout(fn,0)),cancelFrame=win.cancelAnimationFrame?.bind(win)||win.clearTimeout.bind(win);
  let frame=null, destroyed=false, reserve=0;
  const keyboardNodes=new Set(), transitions=new Map();
  const keyboardSelector='.hebleo-keyboard__panel, .hebleo-keyboard__launcher';
  const set=(el,key,value)=>{if(el.style.getPropertyValue(key)!==value)el.style.setProperty(key,value);};
  function measure(){
    frame=null;if(destroyed||!scope.isConnected)return;
    const vv=win.visualViewport, left=vv?.offsetLeft||0, top=vv?.offsetTop||0;
    const right=left+(vv?.width??win.innerWidth), viewportBottom=top+(vv?.height??win.innerHeight);
    const host=scope.getBoundingClientRect(), bounds=dialog?.getBoundingClientRect();
    const otherModal=[...doc.querySelectorAll('dialog[open]')].some(el=>el!==dialog);
    const suspended=Boolean(otherModal||scope.closest('[inert]')||doc.querySelector('.nav-shell[data-course-overlay="true"]')&&!dialog);
    if(dock.hidden!==suspended)dock.hidden=suspended;
    if(dock.inert!==suspended)dock.inert=suspended;
    const x=Math.max(left+8,host.left), end=Math.min(right-8,host.right);
    const gap=Number.parseFloat(win.getComputedStyle(dock).gap)||8;
    let floor=Math.min(viewportBottom,bounds?bounds.bottom-1:viewportBottom);
    const present=new Set(doc.querySelectorAll(keyboardSelector));
    for(const node of keyboardNodes)if(!present.has(node)){resize?.unobserve(node);keyboardNodes.delete(node);transitions.delete(node);}
    for(const node of present){
      if(!keyboardNodes.has(node)){keyboardNodes.add(node);resize?.observe(node);}
      // Closed panels have a translated box; hidden launchers must reserve nothing.
      const style=win.getComputedStyle(node),rect=node.getBoundingClientRect();
      if(style.display==='none'||style.visibility==='hidden'||Number.parseFloat(style.opacity)===0||!rect.width||!rect.height)continue;
      if(rect.left<end&&rect.right>x&&rect.bottom>top&&rect.top<floor)floor=rect.top-gap;
    }
    const bottom=Math.max(top,floor);
    set(dock,'left',x+'px');set(dock,'width',Math.max(0,end-x)+'px');
    set(dock,'bottom',Math.max(0,win.innerHeight-bottom)+'px');
    const height=dock.getBoundingClientRect().height;
    // Keep the previous reserve during a modal or keyboard collapse to avoid a scroll jump.
    reserve=Math.max(height+Math.max(0,(bounds?.bottom??viewportBottom)-bottom)+16,reserve);
    set(scope,'--exercise-dock-reserve',reserve+'px');
    scope.dataset.exerciseDockHost='';
    if(!suspended){
      const active=doc.activeElement;
      if(scope.contains(active)&&!dock.contains(active)&&!active.closest('.vocabulary-reminder')){
        const r=active.getBoundingClientRect(),d=dock.getBoundingClientRect();
        if(r.bottom>d.top&&r.top<viewportBottom)active.scrollIntoView?.({block:'center',behavior:'instant'});
      }
    }
    for(const [node,deadline]of transitions)if(!node.isConnected||win.performance.now()>=deadline)transitions.delete(node);
    if(transitions.size)schedule();
  }
  const schedule=()=>{if(!destroyed&&frame===null)frame=requestFrame(measure);};
  for(const type of ['resize','scroll'])win.addEventListener(type,schedule,{signal,passive:true,capture:true});
  for(const type of ['resize','scroll'])win.visualViewport?.addEventListener(type,schedule,{signal,passive:true});
  const resize=win.ResizeObserver?new win.ResizeObserver(schedule):null;
  resize?.observe(scope);resize?.observe(dock);if(dialog)resize?.observe(dialog);
  const mutation=new win.MutationObserver(schedule);
  mutation.observe(doc.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','open','inert','hidden','data-course-overlay']});
  const milliseconds=value=>Number.parseFloat(value)*(value.trim().endsWith('ms')?1:1000)||0;
  // ResizeObserver does not observe transforms. Follow keyboard opening/closing
  // frames as well as their final box, without polling after a removed transition.
  for(const type of ['transitionrun','transitionend','transitioncancel'])doc.addEventListener(type,event=>{
    const node=event.target;if(!node.matches?.(keyboardSelector))return;
    if(type==='transitionrun'){
      const style=win.getComputedStyle(node),durations=style.transitionDuration.split(',').map(milliseconds),delays=style.transitionDelay.split(',').map(milliseconds);
      const duration=Math.max(0,...durations.map((ms,index)=>ms+(delays[index%delays.length]||0)));
      transitions.set(node,win.performance.now()+duration+50);
    }
    schedule();
  },{signal,capture:true});
  doc.addEventListener('focusin',event=>{
    const el=event.target;if(!scope.contains(el)||dock.contains(el)||el.closest('.vocabulary-reminder'))return;
    const r=el.getBoundingClientRect(),d=dock.getBoundingClientRect();
    if(r.bottom>d.top&&r.top<d.bottom)el.scrollIntoView?.({block:'center',behavior:'instant'});
  },{signal});
  measure();
  return {refresh:measure,destroy(){if(destroyed)return;destroyed=true;controller.abort();resize?.disconnect();mutation.disconnect();transitions.clear();keyboardNodes.clear();if(frame!==null)cancelFrame(frame);scope.style.removeProperty('--exercise-dock-reserve');delete scope.dataset.exerciseDockHost;}};
}
