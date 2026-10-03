export function composeSentence(tokens, indices, prefixIndices = []) {
  const prefixes=new Set(prefixIndices); let result='',attach=false;
  for(const i of indices){if(!Number.isInteger(i)||tokens[i]===undefined)throw new Error('Invalid sentence tile.');result+=(result&&!attach?' ':'')+tokens[i];attach=prefixes.has(i);}
  return result;
}
export function matchWord(matches, wordId, meaning) {
  const next={...matches};
  for(const [id,value] of Object.entries(next))if(value===meaning && id!==wordId)delete next[id];
  if(meaning)next[wordId]=meaning;else delete next[wordId];
  return next;
}
export function bindMatching(scope, onMatch) {
  let selected=null,drag=null,ghost=null,skipClick=false,htmlDragId=null;
  const select=id=>{selected=id;scope.querySelectorAll('[data-match-word]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.matchWord===id)));};
  const finish=()=>{ghost?.remove();ghost=null;drag=null;scope.querySelectorAll('[data-match-target]').forEach(el=>el.classList.remove('drop-hover'));};
  scope.querySelectorAll('[data-match-word]').forEach(el=>{
    el.draggable=!el.disabled;
    el.addEventListener('dragstart',event=>{if(el.disabled){event.preventDefault();return;}htmlDragId=el.dataset.matchWord;event.dataTransfer?.setData('text/plain',htmlDragId);if(event.dataTransfer)event.dataTransfer.effectAllowed='move';finish();});
    el.addEventListener('dragend',()=>{htmlDragId=null;finish();});
    el.addEventListener('click',()=>{if(skipClick){skipClick=false;return;}if(!el.disabled)select(el.dataset.matchWord);});
    el.addEventListener('pointerdown',event=>{if(el.disabled||event.button!==0)return;drag={id:el.dataset.matchWord,x:event.clientX,y:event.clientY};el.setPointerCapture?.(event.pointerId);});
    el.addEventListener('pointermove',event=>{
      if(!drag)return;if(!ghost&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<7)return;
      if(!ghost){ghost=el.cloneNode(true);ghost.classList.add('match-ghost');ghost.removeAttribute('id');ghost.setAttribute('aria-hidden','true');scope.append(ghost);}
      ghost.style.left=event.clientX+'px';ghost.style.top=event.clientY+'px';
      const target=scope.ownerDocument.elementFromPoint(event.clientX,event.clientY)?.closest('[data-match-target]');
      scope.querySelectorAll('[data-match-target]').forEach(t=>t.classList.toggle('drop-hover',t===target));event.preventDefault();
    });
    el.addEventListener('pointerup',event=>{if(!drag)return;const id=drag.id;if(ghost){skipClick=true;const target=scope.ownerDocument.elementFromPoint(event.clientX,event.clientY)?.closest('[data-match-target]');finish();if(target&&!target.disabled){onMatch(id,target.dataset.matchTarget);return;}}finish();});
    el.addEventListener('pointercancel',finish);
  });
  scope.querySelectorAll('[data-match-target]').forEach(el=>{
    el.addEventListener('click',()=>{if(selected&&!el.disabled)onMatch(selected,el.dataset.matchTarget);});
    el.addEventListener('dragover',event=>{if(!el.disabled){event.preventDefault();el.classList.add('drop-hover');}});
    el.addEventListener('dragleave',()=>el.classList.remove('drop-hover'));
    el.addEventListener('drop',event=>{event.preventDefault();const id=event.dataTransfer?.getData('text/plain')||htmlDragId;finish();htmlDragId=null;if(!el.disabled&&Array.from(scope.querySelectorAll('[data-match-word]')).some(t=>t.dataset.matchWord===id&&!t.disabled))onMatch(id,el.dataset.matchTarget);});
  });
}
