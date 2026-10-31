// Physical rail geometry owns the next action, independent of authored text dir.
export function courseRailEdge(rail,shell){
 const r=rail?.getBoundingClientRect(),s=shell?.getBoundingClientRect();
 if(r?.width&&s?.width)return r.left+r.width/2>s.left+s.width/2?'right':'left';
 // Retain the measured side while a collapsed rail has zero geometry.
 return shell?.dataset.courseRailEdge||'left';
}
export function updateCourseToggle(button,{expanded,edge='left'}){
 const label=(expanded?'Collapse ':'Expand ')+'course outline',left=expanded?edge==='left':edge==='right';
 button.setAttribute('aria-expanded',String(expanded));button.setAttribute('aria-label',label);button.title=label;
 button.querySelector('[data-course-arrow]')?.setAttribute('d',left?'M13 6l-4 4 4 4':'M9 6l4 4-4 4');
}
