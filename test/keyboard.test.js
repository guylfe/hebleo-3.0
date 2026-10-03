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

test('Pin holds the overlay across click-away and lesson context; unpinned click-away dismisses it',t=>{
  const {d,doc,k,input,click}=keyboard(t);
  const outside=()=>doc.querySelector('#outside').dispatchEvent(new d.window.Event('pointerdown',{bubbles:true}));
  outside();assert.equal(doc.querySelector('.hebleo-keyboard--open'),null);
  k.open(input);click('[data-action="pin"]');
  assert.ok(doc.querySelector('.hebleo-keyboard--pinned'));assert.equal(doc.querySelector('[data-action="pin"]').getAttribute('aria-pressed'),'true');
  outside();assert.ok(doc.querySelector('.hebleo-keyboard--open'));
  k.sync({}, {keyboardPinned:true},'two');assert.ok(doc.querySelector('.hebleo-keyboard--open'));
  click('[data-action="pin"]');outside();assert.equal(doc.querySelector('.hebleo-keyboard--open'),null);
  k.sync({}, {keyboardPinned:true},'two');k.open(input);click('[data-action="close"]');assert.equal(doc.querySelector('.hebleo-keyboard--open'),null);
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
