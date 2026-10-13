import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

function keyboard(t,html='<input id="answer" dir="rtl"><button id="outside">Elsewhere</button>') {
  const d=new JSDOM(html,{url:'http://127.0.0.1',runScripts:'outside-only',pretendToBeVisual:true});
  t.after(()=>d.window.close());
  d.window.scrollBy=()=>{};
  d.window.eval(readFileSync(new URL('../public/keyboard-owner.js',import.meta.url),'utf8'));
  d.window.document.dispatchEvent(new d.window.Event('DOMContentLoaded'));
  const doc=d.window.document,k=d.window.HebleoKeyboard,input=doc.querySelector('input');
  k.sync({knownKeys:'א',newKeys:'ב',newColor:'#00a9ca'},{keyboardPinned:false},'one');k.open(input);
  return {d,doc,k,input,click:selector=>doc.querySelector(selector).click()};
}

test('Nikkud uses five sound slots, inserts at the actual caret, and preserves native field editing',t=>{
  const {doc,input,click}=keyboard(t);
  assert.equal(doc.querySelector('.hebleo-keyboard__legend'),null);
  assert.equal(doc.querySelector('.hebleo-keyboard__field-caret'),null);
  assert.equal(input.readOnly,false);assert.equal(input.hasAttribute('inputmode'),false);
  assert.equal(input.hasAttribute('virtualkeyboardpolicy'),false);
  assert.equal(doc.activeElement,input,'Opening focuses the real answer field and its native caret.');
  const tools=doc.querySelector('.hebleo-keyboard__row--tools');
  assert.deepEqual([...tools.children].map(x=>x.dataset.action||x.querySelector('button').dataset.action),['toggle-vowels','toggle-convert','arrow-left','space','arrow-right','enter']);
  click('[data-action="toggle-vowels"]');
  assert.deepEqual([...doc.querySelectorAll('[data-sound]')].map(x=>x.dataset.sound),['a','e','i','o','u']);
  for(const group of doc.querySelectorAll('[data-sound]'))assert.ok(group.querySelector('.hebleo-keyboard__vowel-variants'),'Each sound has alternatives.');
  assert.equal(doc.querySelector('[data-insert="ֳ"]').closest('[data-sound]').dataset.sound,'a');
  assert.equal(doc.querySelector('[data-insert="ׂ"]').closest('[data-sound]').dataset.sound,'o');
  assert.equal(doc.querySelector('[data-insert="ׁ"] .hebleo-keyboard__he').textContent,'שׁ');
  assert.equal(doc.querySelector('[data-insert="ְ"]').parentElement.dataset.category,'stop');
  input.value='נ';input.setSelectionRange(1,1);click('[data-category="stop"]>button');assert.equal(input.value,'נְ');
  input.value='אב';input.setSelectionRange(1,1);
  click('[data-sound="a"]>button');assert.equal(input.value,'אַב');assert.equal(input.selectionStart,2);
  click('[data-action="space"]');assert.equal(input.value,'אַ ב');
  click('[data-action="arrow-left"]');assert.equal(input.selectionStart,2);
  click('[data-action="backspace"]');assert.equal(input.value,'א ב');
});

test('Vowel hover waits 1500ms, cancels on early exit, keeps variants reachable, and inserts an alternative',t=>{
  const {d,doc,input,click}=keyboard(t);click('[data-action="toggle-vowels"]');
  const timers=new Map();let id=0;
  d.window.setTimeout=(fn,ms)=>{timers.set(++id,{fn,ms});return id;};
  d.window.clearTimeout=n=>timers.delete(n);
  const group=doc.querySelector('[data-sound="a"]'),key=group.firstElementChild,row=group.querySelector('.hebleo-keyboard__vowel-variants');
  key.dispatchEvent(new d.window.Event('pointerenter'));assert.equal(row.hidden,true);
  assert.equal([...timers.values()][0].ms,1500);
  key.dispatchEvent(new d.window.Event('pointerleave'));assert.equal(timers.size,0);assert.equal(row.hidden,true);
  key.dispatchEvent(new d.window.Event('pointerenter'));[...timers.values()][0].fn();assert.equal(row.hidden,false);
  key.dispatchEvent(new d.window.Event('pointerleave'));assert.equal(row.hidden,false,'Moving into the row keeps it open.');
  input.value='א';input.setSelectionRange(1,1);row.querySelector('button').click();assert.equal(input.value,'אָ');
  group.dispatchEvent(new d.window.Event('pointerleave'));assert.equal(row.hidden,true);
  key.dispatchEvent(new d.window.Event('pointerenter'));click('[data-action="toggle-vowels"]');
  assert.equal([...timers.values()].filter(timer=>timer.ms===1500).length,0);assert.equal(doc.querySelector('#hebleo-vowel-picker').hidden,true);
});

test('Vowel variants have a keyboard path, include auxiliary marks, and dismiss on Escape',t=>{
  const {d,doc,input,click}=keyboard(t);click('[data-action="toggle-vowels"]');
  const e=doc.querySelector('[data-sound="e"]>button');
  e.dispatchEvent(new d.window.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true,cancelable:true}));
  const row=doc.querySelector('#hebleo-vowel-e');assert.equal(row.hidden,false);assert.equal(doc.activeElement,row.firstElementChild);
  input.value='א';input.setSelectionRange(1,1);row.firstElementChild.click();assert.equal(input.value,'אֵ');
  doc.querySelector('[data-sound="i"]>button').dispatchEvent(new d.window.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true,cancelable:true}));
  input.value='ב';input.setSelectionRange(1,1);click('#hebleo-vowel-i button');assert.equal(input.value,'בִי');
  doc.querySelector('[data-sound="o"]>button').dispatchEvent(new d.window.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true,cancelable:true}));
  input.value='כ';input.setSelectionRange(1,1);click('#hebleo-vowel-o button');assert.equal(input.value,'כוֹ');
  click('[data-action="more-marks"]');assert.equal(doc.querySelector('#hebleo-vowel-other').hidden,false);
  assert.equal(doc.querySelector('#hebleo-vowel-other').querySelectorAll('button').length,2);
  input.value='ש';input.setSelectionRange(1,1);click('#hebleo-vowel-other [data-insert="ׁ"]');assert.equal(input.value,'שׁ');
  doc.querySelector('[data-sound="o"]>button').dispatchEvent(new d.window.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true,cancelable:true}));
  input.value='ש';input.setSelectionRange(1,1);click('#hebleo-vowel-o [data-insert="ׂ"]');assert.equal(input.value,'שׂ');
  doc.querySelector('[data-action="toggle-vowels"]').dispatchEvent(new d.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  assert.equal(doc.querySelector('#hebleo-vowel-picker').hidden,true);
  assert.ok(doc.querySelector('.hebleo-keyboard--open'));
});

test('Keep open holds the dock across click-away and valid typing questions; unpinned click-away dismisses it',t=>{
  const {d,doc,k,input,click}=keyboard(t);
  const outside=()=>{doc.querySelector('#outside').dispatchEvent(new d.window.Event('pointerdown',{bubbles:true}));doc.querySelector('#outside').click();};
  outside();assert.equal(doc.querySelector('.hebleo-keyboard--open'),null);
  k.open(input);click('[data-action="pin"]');
  assert.ok(doc.querySelector('.hebleo-keyboard--pinned'));assert.equal(doc.querySelector('[data-action="pin"]').getAttribute('aria-pressed'),'true');
  outside();assert.ok(doc.querySelector('.hebleo-keyboard--open'));
  k.sync({}, {keyboardPinned:true},'lesson-1|apply|0');k.open(input);k.sync({}, {keyboardPinned:true},'lesson-1|apply|1');assert.ok(doc.querySelector('.hebleo-keyboard--open'));
  click('[data-action="pin"]');outside();assert.equal(doc.querySelector('.hebleo-keyboard--open'),null);
  k.sync({}, {keyboardPinned:true},'lesson-1|apply|1');k.open(input);click('[data-action="close"]');assert.equal(doc.querySelector('.hebleo-keyboard--open'),null);
});

test('Known and new keys derive dark and bright shades from one authored hue, including legacy two-color data',t=>{
  const {doc,k}=keyboard(t);
  k.sync({knownKeys:'א',newKeys:'ב',knownColor:'#ff0000',newColor:'#00ff00'},{},'one');
  const root=doc.querySelector('.hebleo-keyboard');
  assert.equal(root.style.getPropertyValue('--known-key'),'#005800');assert.equal(root.style.getPropertyValue('--new-key'),'#00cd00');
  k.sync({newColor:'#000000'},{},'one');
  assert.notEqual(root.style.getPropertyValue('--known-key'),root.style.getPropertyValue('--new-key'));
});

test('Read-only fields cannot be edited by the custom keyboard',t=>{
  const {doc,k,click}=keyboard(t,'<input id="answer"><input id="locked" readonly value="protected">');
  k.open(doc.querySelector('#locked'));click('[data-insert="א"]');assert.equal(doc.querySelector('#locked').value,'protected');
});


test('DESIGN13 keyboard shared close clears dock space, caret target and all expanded states',t=>{
 const {doc,k,input,click}=keyboard(t);const trigger=doc.createElement('button');trigger.dataset.action='keyboard-open';doc.body.append(trigger);k.sync({}, {keyboardPinned:true},'lesson-1|apply|0');k.open(input);doc.body.style.setProperty('--hebleo-keyboard-height','320px');assert.equal(trigger.getAttribute('aria-expanded'),'true');assert.equal(trigger.getAttribute('aria-controls'),'hebleo-keyboard-panel');k.close();assert.equal(doc.body.classList.contains('hebleo-keyboard-is-open'),false);assert.equal(doc.body.style.getPropertyValue('--hebleo-keyboard-height'),'');assert.equal(trigger.getAttribute('aria-expanded'),'false');assert.equal(doc.querySelector('.hebleo-keyboard__launcher').getAttribute('aria-expanded'),'false');assert.equal(doc.querySelector('.hebleo-keyboard__panel').getAttribute('aria-hidden'),'true');assert.equal(input.hasAttribute('data-hebleo-keyboard-target'),false);input.value='protected';click('[data-insert="א"]');assert.equal(input.value,'protected');assert.equal(doc.querySelector('.hebleo-keyboard__status').textContent,'select a field to type');
});
test('DESIGN13 keyboard insert, delete, cursor and physical conversion reject inactive target states',async t=>{
 const cases={hidden:input=>input.hidden=true,ancestorHidden:(input,doc)=>doc.querySelector('#scope').hidden=true,inert:(input,doc)=>doc.querySelector('#scope').setAttribute('inert',''),ariaHidden:(input,doc)=>doc.querySelector('#scope').setAttribute('aria-hidden','true'),busy:(input,doc)=>doc.querySelector('#scope').setAttribute('aria-busy','true'),displayNone:(input,doc)=>doc.querySelector('#scope').style.display='none',visibilityHidden:(input,doc)=>doc.querySelector('#scope').style.visibility='hidden',closedDetails:(input,doc)=>{const details=doc.createElement('details');doc.querySelector('#scope').replaceWith(details);details.append(input);},closedDialog:(input,doc)=>{const dialog=doc.createElement('dialog');doc.querySelector('#scope').replaceWith(dialog);dialog.append(input);},backgroundModal:(input,doc)=>{const modal=doc.createElement('dialog');modal.open=true;modal.innerHTML='<textarea></textarea>';doc.body.append(modal);},readOnly:input=>input.readOnly=true,disabled:input=>input.disabled=true,detached:input=>input.remove()};
 for(const [name,invalidate] of Object.entries(cases))await t.test(name,t=>{const {d,doc,k,input,click}=keyboard(t,'<section id="scope"><input id="answer" value="אב"></section>');k.sync({}, {keyboardPinned:true,keyboardConvert:true},'lesson-1|apply|0');k.open(input);input.setSelectionRange(1,1);invalidate(input,doc);const physical=new d.window.KeyboardEvent('keydown',{key:'t',bubbles:true,cancelable:true});input.dispatchEvent(physical);assert.equal(physical.defaultPrevented,false);click('[data-insert="א"]');click('[data-action="backspace"]');click('[data-action="arrow-right"]');assert.equal(input.value,'אב');assert.equal(input.selectionStart,1);});
});
test('DESIGN13 physical conversion requires focused editable target and respects modifiers/IME',t=>{
 const {d,doc,k,input}=keyboard(t);k.sync({}, {keyboardPinned:true,keyboardConvert:true},'lesson-1|apply|0');k.open(input);input.value='אב';input.setSelectionRange(1,2);const valid=new d.window.KeyboardEvent('keydown',{key:'t',bubbles:true,cancelable:true});input.dispatchEvent(valid);assert.equal(valid.defaultPrevented,true);assert.equal(input.value,'אא');assert.equal(input.selectionStart,2);doc.querySelector('#outside').focus();const unfocused=new d.window.KeyboardEvent('keydown',{key:'t',bubbles:true,cancelable:true});input.dispatchEvent(unfocused);assert.equal(unfocused.defaultPrevented,false);assert.equal(input.value,'אא');input.focus();for(const props of [{ctrlKey:true},{altKey:true},{metaKey:true},{isComposing:true}]){const event=new d.window.KeyboardEvent('keydown',{key:'t',bubbles:true,cancelable:true,...props});input.dispatchEvent(event);assert.equal(event.defaultPrevented,false);}assert.equal(input.value,'אא');
});
test('DESIGN13 Keep open retargets valid next typing question and closes on non-typing or route changes',t=>{
 const {doc,k,input}=keyboard(t);k.sync({}, {keyboardPinned:true},'lesson-1|apply|0');k.open(input);doc.body.style.setProperty('--hebleo-keyboard-height','320px');const next=doc.createElement('textarea');next.id='answer';input.replaceWith(next);k.sync({}, {keyboardPinned:true},'lesson-1|apply|1');assert.ok(doc.querySelector('.hebleo-keyboard--open'));assert.equal(doc.activeElement,next);next.disabled=true;k.sync({}, {keyboardPinned:true},'lesson-1|apply|1');assert.equal(doc.querySelector('.hebleo-keyboard--open'),null);assert.equal(doc.body.style.getPropertyValue('--hebleo-keyboard-height'),'');next.disabled=false;k.open(next);k.sync({}, {keyboardPinned:true},'settings');assert.equal(doc.querySelector('.hebleo-keyboard--open'),null);assert.equal(doc.querySelector('[data-hebleo-keyboard-target]'),null);
});
test('DESIGN13 unrelated modal clears old target and valid author Preview can use the same keyboard',t=>{
 const {doc,k,input,click}=keyboard(t);k.sync({}, {keyboardPinned:true,keyboardConvert:true},'lesson-1|apply|0');k.open(input);input.value='background';doc.body.style.setProperty('--hebleo-keyboard-height','300px');const modal=doc.createElement('dialog');modal.open=true;modal.innerHTML='<textarea id="modal-field"></textarea>';doc.body.append(modal);k.mount(modal);assert.equal(doc.querySelector('.hebleo-keyboard--open'),null);assert.equal(doc.body.style.getPropertyValue('--hebleo-keyboard-height'),'');click('[data-insert="א"]');assert.equal(input.value,'background');assert.equal(modal.querySelector('textarea').value,'');k.mount(doc.body);modal.remove();const preview=doc.createElement('dialog');preview.open=true;preview.className='rehearsal-dialog';preview.innerHTML='<div data-preview-root><textarea id="answer">אב</textarea><button data-preview-owner-keyboard>Keyboard</button></div>';doc.body.append(preview);k.mount(preview);k.sync({}, {keyboardPinned:true,keyboardConvert:true},'preview|lesson-1|apply|0');const answer=preview.querySelector('#answer');k.open(answer);answer.setSelectionRange(1,2);click('[data-insert="א"]');assert.equal(answer.value,'אא');assert.equal(answer.selectionStart,2);assert.equal(preview.querySelector('[data-preview-owner-keyboard]').getAttribute('aria-expanded'),'true');k.mount(doc.body);assert.equal(doc.querySelector('.hebleo-keyboard--open'),null);assert.equal(doc.body.style.getPropertyValue('--hebleo-keyboard-height'),'');
});
