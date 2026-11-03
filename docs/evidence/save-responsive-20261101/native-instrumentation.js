// Passive timing only. Does not dispatch events, wrap functions or edit content.
window.saveRuns=[];window.nativeInputs=[];window.frameGaps=[];window.longTasks=[];
let lastFrame;function frame(t){if(window.measuringSave&&lastFrame)window.frameGaps.push(t-lastFrame);lastFrame=t;requestAnimationFrame(frame);}requestAnimationFrame(frame);
new PerformanceObserver(list=>{if(window.measuringSave)window.longTasks.push(...list.getEntries().map(e=>({start:e.startTime,duration:e.duration})));}).observe({type:'longtask',buffered:false});
document.addEventListener('input',e=>{if(e.target.closest('.ProseMirror'))window.nativeInputs.push({time:performance.now(),trusted:e.isTrusted,pending:Boolean(window.measuringSave),inputType:e.inputType});},true);
document.addEventListener('click',e=>{
 if(!e.target.closest('[data-author-action=save]'))return;
 const start=performance.now(),editor=document.querySelector('.ProseMirror'),selection=getSelection(),anchor=selection.anchorNode,offset=selection.anchorOffset,run={trusted:e.isTrusted,start,firstRaf:null,feedback:null,resources:[],gaps:[],longTasks:[]};window.measuringSave=run;window.frameGaps=[];window.longTasks=[];
 requestAnimationFrame(()=>run.firstRaf=performance.now()-start);
 const status=document.querySelector('[data-author-status]'),observer=new MutationObserver(()=>{
  const text=status.textContent;if(text.includes('Saving')&&run.feedback===null)run.feedback=performance.now()-start;
  if(!text.includes('Saving')&&!document.querySelector('[data-author-action=save]').disabled){run.total=performance.now()-start;run.status=text;run.sameEditor=editor===document.querySelector('.ProseMirror');run.editable=editor.isContentEditable;run.sameSelection=anchor===getSelection().anchorNode&&offset===getSelection().anchorOffset;
   run.resources=performance.getEntriesByType('resource').filter(r=>r.startTime>=start&&r.name.includes('/api/')).map(r=>({name:r.name.split('/api/')[1],start:r.startTime-start,duration:r.duration}));run.gaps=window.frameGaps;run.longTasks=window.longTasks;window.saveRuns.push(run);window.measuringSave=null;observer.disconnect();
  }
 });observer.observe(status,{childList:true,characterData:true,subtree:true});
},true);
