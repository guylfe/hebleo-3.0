import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM, VirtualConsole} from 'jsdom';
import {bindVocabularyReminders} from '../public/vocabulary-reminder.js';

// Synthetic test DOM. These rects stub layout: lifecycle/geometry evidence,
// never proof of rendered layout, native key synthesis, hit testing or touch.
const rect = (left, top, width, height) => ({left, top, width, height, right:left + width, bottom:top + height, x:left, y:top, toJSON(){return this;}});
function fixture(t, options = {}, markup = '') {
  const errors = [], virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error));
  const dom = new JSDOM('<!doctype html><button id="outside">Outside</button><main id="scope">' + (markup || '<p><button type="button" data-vocabulary-word="runtime-1" id="one"><bdi dir="rtl">שָׁלוֹם</bdi></button> <button type="button" data-vocabulary-word="runtime-2" id="two">Second</button></p>') + '</main>', {pretendToBeVisual:true, virtualConsole});
  const {window:win} = dom, doc = win.document, scope = doc.querySelector('#scope');
  let clock = 0, timerId = 0, frameId = 0;
  const timers = new Map(), frames = new Map(), calls = [], stopped = [], disposed = [];
  win.setTimeout = (fn, delay) => { const id = ++timerId; timers.set(id, {at:clock + delay, fn}); return id; };
  win.clearTimeout = id => timers.delete(id);
  win.requestAnimationFrame = fn => { const id = ++frameId; frames.set(id, fn); return id; };
  win.cancelAnimationFrame = id => frames.delete(id);
  const boxes = new WeakMap();
  win.HTMLElement.prototype.getBoundingClientRect = function() {
    if (boxes.has(this)) return boxes.get(this);
    if (this.classList.contains('vocabulary-reminder')) return rect(parseFloat(this.style.left) || 0, parseFloat(this.style.top) || 0, parseFloat(this.style.width) || 360, Math.min(220, parseFloat(this.style.maxHeight) || 220));
    return this.matches('[data-vocabulary-word]') ? rect(100, 120, 80, 40) : rect(0, 0, 1024, 768);
  };
  win.HTMLElement.prototype.getClientRects = function() { return [this.getBoundingClientRect()]; };
  const callbacks = {renderCard:id => { calls.push(id); return '<article class="word-card"><bdi dir="rtl">שָׁלוֹם</bdi><button type="button" data-card-action>Play recording</button><details><summary>Full vocabulary entry</summary><input aria-label="Native control"></details></article>'; },
    bindCard:card => () => disposed.push(card), stopCardMedia:card => stopped.push(card), ...options};
  let binder = bindVocabularyReminders(scope, callbacks);
  t.after(() => { binder.destroy(); dom.window.close(); });
  const dispatch = (el, type, properties = {}) => {
    const event = /key/.test(type) ? new win.KeyboardEvent(type, {bubbles:true, cancelable:true, ...properties}) : new win.MouseEvent(type, {bubbles:true, cancelable:true, relatedTarget:properties.relatedTarget || null});
    for (const [key, value] of Object.entries(properties)) if (key === 'pointerType') Object.defineProperty(event, key, {value});
    el.dispatchEvent(event); return event;
  };
  return {win, doc, scope, boxes, calls, stopped, disposed, callbacks, timers, frames, errors,
    one:doc.querySelector('#one'), two:doc.querySelector('#two'), outside:doc.querySelector('#outside'),
    get binder(){return binder;}, rebind(){binder = bindVocabularyReminders(scope, callbacks); return binder;},
    panel:() => doc.querySelector('.vocabulary-reminder'), dispatch,
    hover:(el, relatedTarget = null, pointerType = 'mouse') => dispatch(el, 'pointerover', {relatedTarget, pointerType}),
    leave:(el, relatedTarget = null) => dispatch(el, 'pointerout', {relatedTarget, pointerType:'mouse'}),
    tick(ms) { clock += ms; for (const [id, timer] of timers) if (timer.at <= clock) { timers.delete(id); timer.fn(); } },
    frame() { const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn()); },
    async flush() { await new Promise(resolve => setImmediate(resolve)); }
  };
}

test('exact runtime IDs and original Hebrew preserved; labelled nonmodal ARIA and one card', t => {
  const f = fixture(t), original = f.one.innerHTML;
  f.hover(f.one);
  assert.deepEqual(f.calls, ['runtime-1']);
  assert.equal(f.one.innerHTML, original);
  assert.equal(f.panel().getAttribute('role'), 'dialog');
  assert.equal(f.panel().getAttribute('aria-label'), 'Vocabulary card');
  assert.equal(f.panel().hasAttribute('aria-modal'), false);
  assert.equal(f.one.getAttribute('aria-haspopup'), 'dialog');
  assert.equal(f.one.getAttribute('aria-expanded'), 'true');
  assert.equal(f.one.getAttribute('aria-controls'), f.panel().id);
  assert.notEqual(f.doc.activeElement, f.panel().querySelector('[data-vocabulary-close]'));
  f.hover(f.two);
  assert.equal(f.doc.querySelectorAll('.vocabulary-reminder').length, 1);
  assert.deepEqual(f.calls, ['runtime-1', 'runtime-2']);
  assert.equal(f.one.getAttribute('aria-expanded'), 'false');
  assert.equal(f.stopped.length, 1); assert.equal(f.disposed.length, 1);
});

test('first hover click pins; second activation closes; pointer leave never closes pinned card', t => {
  const f = fixture(t);
  f.hover(f.one); const panel = f.panel();
  f.one.click();
  assert.equal(f.panel(), panel); assert.equal(f.calls.length, 1);
  assert.equal(f.doc.activeElement, panel.querySelector('[data-vocabulary-close]'));
  f.leave(f.one); f.tick(500); assert.equal(f.binder.isOpen(), true);
  f.one.click(); assert.equal(f.binder.isOpen(), false); assert.equal(f.doc.activeElement, f.one);
});

test('cancelable 180ms leave grace, bridge and card entry allow slow pointer transit', t => {
  const f = fixture(t);
  f.hover(f.one); f.leave(f.one); f.tick(179); assert.ok(f.panel());
  const bridge = f.panel().querySelector('.vocabulary-reminder__bridge');
  assert.equal(bridge.style.height, '8px');
  f.hover(bridge, f.one); f.tick(500); assert.ok(f.panel());
  f.leave(bridge, f.outside); f.tick(180); assert.equal(f.panel(), null);
  f.hover(f.one); f.leave(f.one); f.hover(f.two); f.tick(500);
  assert.equal(f.two.getAttribute('aria-expanded'), 'true');
});

test('Escape consumes event, restores exact trigger only for inside focus, suppresses reopen', t => {
  const f = fixture(t);
  f.one.focus(); assert.ok(f.panel());
  f.one.click(); const close = f.panel().querySelector('[data-vocabulary-close]');
  const event = f.dispatch(close, 'keydown', {key:'Escape'});
  assert.equal(event.defaultPrevented, true); assert.equal(f.doc.activeElement, f.one); assert.equal(f.panel(), null);
  f.one.dispatchEvent(new f.win.FocusEvent('focusin', {bubbles:true})); assert.equal(f.panel(), null);
  f.outside.focus(); f.one.focus(); assert.ok(f.panel());
  f.binder.close(); f.outside.focus(); f.hover(f.two);
  f.dispatch(f.outside, 'keydown', {key:'Escape'});
  assert.equal(f.panel(), null); assert.equal(f.doc.activeElement, f.outside);
});

test('Close suppresses synthetic same-entry hover; real pointer re-entry or click reactivates', t => {
  const f = fixture(t);
  f.one.click(); f.panel().querySelector('[data-vocabulary-close]').click();
  assert.equal(f.panel(), null);
  f.hover(f.one.querySelector('bdi'), f.one); assert.equal(f.panel(), null);
  f.hover(f.one, f.outside); assert.ok(f.panel());
  f.binder.close(); f.one.click(); assert.ok(f.panel());
});

test('outside pointer dismissal preserves target action/default/focus; Tab can leave card', t => {
  const f = fixture(t); let clicks = 0;
  f.outside.addEventListener('click', () => clicks++);
  f.one.click();
  assert.equal(f.dispatch(f.outside, 'pointerdown').defaultPrevented, false);
  f.outside.focus(); f.outside.click();
  assert.equal(clicks, 1); assert.equal(f.doc.activeElement, f.outside); assert.equal(f.panel(), null);
  f.one.click(); const close = f.panel().querySelector('[data-vocabulary-close]');
  assert.equal(f.dispatch(close, 'keydown', {key:'Tab'}).defaultPrevented, false);
  // jsdom does not move focus on Tab; explicitly verify resulting focus-leave path.
  f.outside.focus(); assert.equal(f.panel(), null); assert.equal(f.doc.activeElement, f.outside);
});

test('all trigger/card key events isolated from exercise and Preview shortcuts without canceling native defaults', t => {
  const f = fixture(t); let background = 0, local = 0;
  for (const type of ['keydown', 'keyup', 'keypress']) f.scope.addEventListener(type, () => background++);
  f.one.focus();
  for (const type of ['keydown', 'keyup', 'keypress']) for (const key of ['Enter', ' ', '1', 'r', 'Tab']) {
    assert.equal(f.dispatch(f.one, type, {key}).defaultPrevented, false);
  }
  // Real buttons synthesize click from Enter/Space; jsdom needs the click supplied.
  f.one.click();
  const control = f.panel().querySelector('[data-card-action]');
  control.addEventListener('keydown', () => local++);
  for (const type of ['keydown', 'keyup', 'keypress']) for (const key of ['Enter', ' ', '2', 'r', 'Tab']) assert.equal(f.dispatch(control, type, {key}).defaultPrevented, false);
  assert.equal(local, 5); assert.equal(background, 0);
  control.click(); assert.ok(f.panel());
});

test('touch/no-hover pointer never previews; click still pins', t => {
  const f = fixture(t);
  f.hover(f.one, null, 'touch'); assert.equal(f.panel(), null);
  f.win.matchMedia = () => ({matches:false});
  f.hover(f.one); assert.equal(f.panel(), null);
  f.one.click(); assert.ok(f.panel()); assert.equal(f.doc.activeElement.textContent, 'Close');
});

test('null or empty renderer result and disabled triggers reveal nothing; no guessed ID', t => {
  const ids = [], f = fixture(t, {renderCard:id => {ids.push(id); return null;}});
  f.one.click(); assert.equal(f.panel(), null); assert.deepEqual(ids, ['runtime-1']);
  f.two.disabled = true; f.hover(f.two); assert.deepEqual(ids, ['runtime-1']);
  f.one.dataset.vocabularyWord = ''; f.one.click(); assert.equal(ids.length, 1);
});

test('stale context and detached anchor cancel delayed work and clean only owned card', t => {
  let valid = true;
  const f = fixture(t, {isCurrent:() => valid});
  f.hover(f.one); f.leave(f.one); valid = false; f.frame();
  assert.equal(f.panel(), null); assert.equal(f.timers.size, 0); assert.equal(f.frames.size, 0);
  f.tick(500); f.two.click(); assert.equal(f.panel(), null);
  valid = true; f.two.click(); const old = f.panel(); f.two.remove(); f.frame();
  assert.equal(f.panel(), null); assert.equal(f.stopped.at(-1), old); assert.equal(f.disposed.at(-1), old);
});

test('hidden, inert, occluded, clipped and offscreen anchors close on lifecycle events', async t => {
  const f = fixture(t);
  for (const attr of ['hidden', 'inert', 'aria-hidden']) {
    f.one.click(); f.one.setAttribute(attr, attr === 'aria-hidden' ? 'true' : ''); await f.flush();
    assert.equal(f.panel(), null, attr); f.one.removeAttribute(attr);
  }
  f.one.click(); f.boxes.set(f.one, rect(-200, 20, 80, 40)); f.doc.dispatchEvent(new f.win.Event('scroll'));
  assert.equal(f.panel(), null); f.boxes.delete(f.one);
  f.one.click(); f.doc.elementFromPoint = () => f.outside; f.frame(); assert.equal(f.panel(), null); delete f.doc.elementFromPoint;
  f.one.click(); f.one.parentElement.style.overflowX = 'hidden'; f.one.parentElement.style.overflowY = 'hidden'; f.boxes.set(f.one.parentElement, rect(0, 0, 50, 50)); f.frame(); assert.equal(f.panel(), null);
});

test('other modal/drawer closes reminders; owning Preview dialog keeps card within active subtree', async t => {
  const f = fixture(t);
  const preview = f.doc.createElement('dialog'); preview.open = true; f.scope.replaceWith(preview); preview.append(f.scope);
  f.one.click(); assert.ok(f.panel()); assert.equal(preview.contains(f.panel()), true);
  const modal = f.doc.createElement('dialog'); modal.open = true; f.doc.body.append(modal); await f.flush(); assert.equal(f.panel(), null);
  modal.remove(); f.two.click(); assert.ok(f.panel());
  f.scope.dataset.courseOverlay = 'true'; await f.flush(); assert.equal(f.panel(), null);
  delete f.scope.dataset.courseOverlay; f.two.click();
  const drawer = f.doc.createElement('div'); drawer.className = 'nav-backdrop'; f.doc.body.append(drawer); await f.flush(); assert.equal(f.panel(), null);
});

test('mount stays after exact trigger for logical Tab order and outside a containing status region', t => {
  const f = fixture(t); f.one.click(); assert.equal(f.one.nextElementSibling, f.panel());
  f.binder.close();
  f.one.parentElement.setAttribute('role', 'status'); f.one.click();
  assert.equal(f.panel().closest('[role="status"]'), null);
  assert.equal(f.one.parentElement.nextElementSibling, f.panel());
});

test('visual viewport offset/edges, RTL alignment, flipping and long-card height are clamped', t => {
  const f = fixture(t), viewport = new f.win.EventTarget();
  Object.assign(viewport, {offsetLeft:50, offsetTop:100, width:320, height:400});
  Object.defineProperty(f.win, 'visualViewport', {value:viewport, configurable:true});
  f.rebind(); f.boxes.set(f.one, rect(310, 430, 40, 30)); f.one.style.direction = 'rtl'; f.one.click();
  const panel = f.panel();
  assert.equal(panel.style.width, '296px'); assert.equal(panel.style.left, '62px');
  assert.equal(panel.dataset.placement, 'above');
  assert.ok(parseFloat(panel.style.top) >= 112); assert.ok(parseFloat(panel.style.maxHeight) <= 376);
  viewport.width = 500; viewport.height = 250; viewport.offsetTop = 350;
  viewport.dispatchEvent(new f.win.Event('resize'));
  assert.equal(panel.style.width, '360px'); assert.ok(parseFloat(panel.style.top) >= 362);
  assert.ok(parseFloat(panel.style.maxHeight) <= 226);
});

test('scroll/resize reposition and identity mutation close before showing a stale card', async t => {
  const f = fixture(t); f.one.click(); const initial = f.panel().style.top;
  f.boxes.set(f.one, rect(300, 300, 80, 40)); f.win.dispatchEvent(new f.win.Event('resize'));
  assert.notEqual(f.panel().style.top, initial);
  f.one.dataset.vocabularyWord = 'new-runtime-id'; await f.flush(); assert.equal(f.panel(), null);
  f.one.click(); assert.equal(f.calls.at(-1), 'new-runtime-id');
});

test('dynamic triggers and rebinding do not duplicate listeners; original ARIA restored on destroy', async t => {
  const f = fixture(t); f.binder.destroy();
  f.one.setAttribute('aria-expanded', 'original'); f.one.setAttribute('aria-controls', 'existing');
  f.rebind(); f.rebind();
  const clone = f.two.cloneNode(true); clone.id = 'three'; f.scope.append(clone); await f.flush();
  clone.click(); assert.equal(f.calls.length, 1);
  f.binder.destroy(); f.binder.destroy();
  assert.equal(f.one.getAttribute('aria-expanded'), 'original'); assert.equal(f.one.getAttribute('aria-controls'), 'existing');
  assert.equal(f.one.hasAttribute('aria-haspopup'), false);
  assert.equal(f.timers.size, 0); assert.equal(f.frames.size, 0);
  clone.click(); f.hover(f.one); assert.equal(f.calls.length, 1); assert.equal(f.panel(), null);
  assert.equal(f.stopped.length, 1); assert.equal(f.disposed.length, 1);
});

test('destroy with pending pointer transit never resurrects a card', t => {
  const f = fixture(t); f.hover(f.one); f.leave(f.one); assert.equal(f.timers.size, 1);
  f.binder.destroy(); f.tick(500); f.frame();
  assert.equal(f.panel(), null); assert.equal(f.binder.isOpen(), false); assert.equal(f.timers.size, 0); assert.equal(f.frames.size, 0);
});

test('only one reminder across binders in a document; independent scope remains reusable', t => {
  const f = fixture(t), second = f.doc.createElement('aside');
  second.innerHTML = '<button type="button" data-vocabulary-word="other">Other</button>'; f.doc.body.append(second);
  const other = bindVocabularyReminders(second, f.callbacks); t.after(() => other.destroy());
  f.one.click(); const old = f.panel(); second.firstElementChild.click();
  assert.equal(f.doc.querySelectorAll('.vocabulary-reminder').length, 1);
  assert.equal(f.binder.isOpen(), false); assert.equal(other.isOpen(), true); assert.equal(f.stopped[0], old);
  f.one.click(); assert.equal(other.isOpen(), false); assert.equal(f.binder.isOpen(), true);
});

test('renderer failure leaves no card; binder/disposer failure still removes card and ARIA', t => {
  const f = fixture(t, {renderCard:() => {throw new Error('render failed');}});
  f.one.click(); assert.equal(f.errors.length, 1); assert.equal(f.panel(), null);
  f.callbacks.renderCard = () => '<b>Safe existing card</b>';
  f.callbacks.bindCard = () => {throw new Error('bind failed');}; f.rebind();
  f.one.click(); assert.equal(f.errors.length, 2); assert.equal(f.panel(), null);
  f.callbacks.bindCard = () => () => {throw new Error('dispose failed');}; f.rebind();
  f.one.click(); assert.throws(() => f.binder.close(), /dispose failed/);
  assert.equal(f.panel(), null); assert.equal(f.one.getAttribute('aria-expanded'), 'false');
  assert.equal(f.frames.size, 0); assert.equal(f.stopped.length, 2);
});

test('reentrant bindCard disposal cannot leave stale card, timer or returned disposer behind', t => {
  const f = fixture(t);
  let released = 0;
  f.callbacks.bindCard = () => { f.binder.destroy(); return () => released++; }; f.rebind();
  f.one.click(); assert.equal(released, 1); assert.equal(f.panel(), null); assert.equal(f.frames.size, 0);
});

test('destroy releases listeners and restores attributes even when scoped shutdown throws', t => {
  const f = fixture(t, {stopCardMedia:() => {throw new Error('scoped stop failed');}});
  f.one.click(); const panel = f.panel();
  assert.throws(() => f.binder.destroy(), /scoped stop failed/);
  assert.deepEqual(f.disposed, [panel]); assert.equal(f.panel(), null);
  assert.equal(f.one.hasAttribute('aria-haspopup'), false); assert.equal(f.frames.size, 0);
  f.one.click(); f.binder.destroy(); assert.equal(f.calls.length, 1);
});

test('geometry can use a short visual viewport without own-card occlusion dismissing it', t => {
  const f = fixture(t);
  Object.defineProperty(f.win, 'innerHeight', {value:150}); f.boxes.set(f.one, rect(100, 60, 80, 40));
  f.one.click(); const panel = f.panel();
  assert.equal(panel.style.maxHeight, '126px'); assert.equal(panel.style.top, '12px');
  f.doc.elementFromPoint = () => panel; f.frame(); assert.equal(f.panel(), panel);
});

test('removed triggers restore prior ARIA after observer-driven close', async t => {
  const f = fixture(t); f.binder.destroy();
  f.one.setAttribute('aria-controls', 'prior-panel'); f.rebind();
  f.one.click(); f.one.remove(); await f.flush();
  assert.equal(f.panel(), null); assert.equal(f.one.getAttribute('aria-controls'), 'prior-panel'); assert.equal(f.one.hasAttribute('aria-expanded'), false);
});

test('retained old card nodes cannot close the new card or alter its transit timer', t => {
  const f = fixture(t); f.hover(f.one);
  const old = f.panel(), oldClose = old.querySelector('[data-vocabulary-close]');
  f.hover(f.two); f.leave(f.two); assert.equal(f.timers.size, 1);
  f.hover(old); assert.equal(f.timers.size, 1);
  oldClose.click(); assert.equal(f.two.getAttribute('aria-expanded'), 'true');
  f.tick(180); assert.equal(f.panel(), null);
});
