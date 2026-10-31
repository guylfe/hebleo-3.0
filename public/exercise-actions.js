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
  let frame=null, destroyed=false, reserve=0, lastBoundary='';
  const keyboardNodes=new Set(), transitions=new Map(), constrainedAnswers=new Map();
  const keyboardSelector='.hebleo-keyboard__panel, .hebleo-keyboard__launcher';
  const set=(el,key,value)=>{if(el.style.getPropertyValue(key)!==value)el.style.setProperty(key,value);};
  function restoreAnswer(el){
    const saved=constrainedAnswers.get(el);if(!saved)return;
    for(const [key,{value,priority}]of Object.entries(saved.styles))value?el.style.setProperty(key,value,priority):el.style.removeProperty(key);
    constrainedAnswers.delete(el);
  }
  function revealFocusedAnswer(el, entering=false){
    for(const target of constrainedAnswers.keys())if(target!==el)restoreAnswer(target);
    // Reading headings receive programmatic focus on page changes. They must be
    // free to leave the viewport when the learner scrolls to the controls below.
    const headingEntry=entering&&el?.matches?.('h1[tabindex],h2[tabindex],h3[tabindex],h4[tabindex],h5[tabindex],h6[tabindex]');
    if(!(headingEntry||el?.matches?.('input:not([type=hidden]),textarea,select,button,summary,a[href],[contenteditable=true]'))||!scope.contains(el)||dock.contains(el)||el.closest('.vocabulary-reminder')||dock.hidden)return;
    const vv=win.visualViewport,bounds=dialog?.getBoundingClientRect(),gap=Number.parseFloat(win.getComputedStyle(dock).gap)||8;
    let scroller=dialog||win,clip=bounds;
    for(let parent=el.parentElement;parent&&parent!==dialog&&parent!==doc.body;parent=parent.parentElement){
      if(/auto|scroll|overlay/.test(win.getComputedStyle(parent).overflowY)&&parent.scrollHeight>parent.clientHeight){scroller=parent;clip=parent.getBoundingClientRect();break;}
    }
    let top=Math.max(vv?.offsetTop||0,bounds?.top??0,clip?.top??0)+gap;
    // The learner's sticky navigation still covers the document after scrolling.
    // It is behind a modal Preview and must not reduce that dialog's interval.
    if(!dialog)for(const header of doc.querySelectorAll('.app-header')){
      const style=win.getComputedStyle(header),h=header.getBoundingClientRect(),r=el.getBoundingClientRect();
      if(['sticky','fixed'].includes(style.position)&&style.display!=='none'&&style.visibility!=='hidden'&&h.left<r.right&&h.right>r.left&&h.top<=top&&h.bottom>top)top=h.bottom+gap;
    }
    const bottom=Math.min(dock.getBoundingClientRect().top-gap,clip?.bottom??Infinity,(vv?.offsetTop||0)+(vv?.height??win.innerHeight));
    if(bottom<=top)return;
    const available=bottom-top,saved=constrainedAnswers.get(el);
    if(saved&&available>=saved.height)restoreAnswer(el);
    let r=el.getBoundingClientRect();
    // Keep a focused multiline answer operable in a short viewport. Restore its
    // authored size when space returns; content/value/caret remain on the same node.
    if(el.tagName==='TEXTAREA'&&r.height>available){
      if(!constrainedAnswers.has(el))constrainedAnswers.set(el,{height:r.height,styles:Object.fromEntries(['min-height','max-height','overflow-y'].map(key=>[key,{value:el.style.getPropertyValue(key),priority:el.style.getPropertyPriority(key)}]))});
      set(el,'min-height','0px');set(el,'max-height',available+'px');set(el,'overflow-y','auto');r=el.getBoundingClientRect();
    }
    if(r.top>=top&&r.bottom<=bottom)return;
    // Center within the usable interval, not the full document/dialog viewport.
    // A field taller than the interval aligns its start rather than oscillating.
    const targetTop=top+Math.max(0,(bottom-top-r.height)/2),delta=r.top-targetTop;
    if(Math.abs(delta)>1)scroller.scrollBy?.({top:delta,behavior:'instant'});
  }
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
    // Scrolling updates horizontal dock placement without pinning a focused
    // answer in place. Recover it only when the usable viewport actually changes
    // (keyboard, resize, dialog or sticky-header reflow), or on a new focusin.
    const box=dock.getBoundingClientRect();
    const headers=dialog?[]:[...doc.querySelectorAll('.app-header')].filter(el=>['sticky','fixed'].includes(win.getComputedStyle(el).position)).map(el=>el.getBoundingClientRect().bottom);
    const boundary=[box.top,box.left,box.right,top,bounds?.top,bounds?.bottom,...headers].join('|');
    const changed=boundary!==lastBoundary;lastBoundary=boundary;
    if(!suspended&&changed)revealFocusedAnswer(doc.activeElement);
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
    revealFocusedAnswer(event.target,true);
  },{signal});
  // Pointer activation can arrive before focusin (and summary focus differs
  // across engines). Clear the whole target before its native toggle/action.
  scope.addEventListener('pointerdown',event=>revealFocusedAnswer(event.target.closest?.('summary,input,textarea,select,button'),true),{signal,capture:true});
  scope.addEventListener('toggle',event=>{
    if(event.target.matches?.('details'))revealFocusedAnswer(event.target.querySelector('summary'),true);
  },{signal,capture:true});
  // Blur can leave no subsequent focusin event. Wait for focus to settle before
  // restoring an abandoned field; keyboard pointer handlers retain answer focus.
  doc.addEventListener('focusout',()=>{
    win.queueMicrotask(()=>{
      if(destroyed)return;
      for(const el of constrainedAnswers.keys())if(el!==doc.activeElement)restoreAnswer(el);
    });
  },{signal});
  measure();
  return {refresh:measure,reveal:el=>revealFocusedAnswer(el,true),destroy(){if(destroyed)return;destroyed=true;controller.abort();resize?.disconnect();mutation.disconnect();transitions.clear();keyboardNodes.clear();for(const el of constrainedAnswers.keys())restoreAnswer(el);if(frame!==null)cancelFrame(frame);scope.style.removeProperty('--exercise-dock-reserve');delete scope.dataset.exerciseDockHost;}};
}
