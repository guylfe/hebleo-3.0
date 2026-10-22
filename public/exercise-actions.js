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
  let frame=null, destroyed=false, reserve=0;
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
    const keyboard=doc.querySelector('.hebleo-keyboard--open .hebleo-keyboard__panel, .hebleo-keyboard__panel.hebleo-keyboard--open');
    const keyboardRect=keyboard?.getBoundingClientRect();
    const bottom=Math.max(top,Math.min(viewportBottom,bounds?bounds.bottom-1:viewportBottom,keyboardRect?.height?keyboardRect.top:viewportBottom));
    const x=Math.max(left+8,host.left), end=Math.min(right-8,host.right);
    set(dock,'left',x+'px');set(dock,'width',Math.max(0,end-x)+'px');
    set(dock,'bottom',Math.max(0,win.innerHeight-bottom)+'px');
    const height=dock.getBoundingClientRect().height;
    // Keep the previous reserve during a modal or keyboard collapse to avoid a scroll jump.
    reserve=Math.max(height+Math.max(0,(bounds?.bottom??viewportBottom)-bottom)+16,reserve);
    set(scope,'--exercise-dock-reserve',reserve+'px');
    scope.dataset.exerciseDockHost='';
  }
  const schedule=()=>{if(!destroyed&&frame===null)frame=win.requestAnimationFrame(measure);};
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
  return {refresh:measure,destroy(){if(destroyed)return;destroyed=true;controller.abort();resize?.disconnect();mutation.disconnect();if(frame!==null)win.cancelAnimationFrame(frame);scope.style.removeProperty('--exercise-dock-reserve');delete scope.dataset.exerciseDockHost;}};
}
