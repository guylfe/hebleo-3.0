/**
 * Read-only vocabulary reminder primitive. Import its CSS once in each host.
 * bindVocabularyReminders(scope, {renderCard, bindCard?, stopCardMedia?, isCurrent?})
 * returns {close(), destroy(), isOpen()}. Rebinding a scope destroys its old binder.
 *
 * Host supplies enabled button[type=button][data-vocabulary-word] triggers only
 * after grading and resolves their exact runtime IDs against its pinned snapshot.
 * renderCard(id) synchronously returns SAFE existing card HTML or null; no lookup,
 * sanitization, eligibility inference, fetch, storage or learner writes happen here.
 * bindCard(dialogElement) wires only that card's controls and may return a disposer.
 * stopCardMedia(dialogElement) must stop ONLY media owned by that card, including
 * external players started by bindCard. It runs before the disposer and DOM removal.
 * isCurrent() defaults true; host must destroy on rerender/context disposal and may
 * use this guard to reject stale callbacks. Callback exceptions propagate after cleanup.
 *
 * close() dismisses and returns focus to the exact trigger only if focus was inside
 * the card. Outside/focus-leave dismissal never steals focus. destroy() is idempotent,
 * restores original trigger ARIA and cancels every listener, observer, frame and timer.
 * Keys bubble within the card, then stop before exercise shortcuts; native defaults
 * (button Enter/Space, Tab, details, media controls) remain intact except Escape.
 * Hosts must keep exercise shortcut listeners in the bubble phase, not capture.
 * Mounts immediately after the trigger (after a containing status region if needed),
 * within scope and any owning Preview dialog. No body portal or focus trap.
 */
const bindings = new WeakMap();
const openByDocument = new WeakMap();
let sequence = 0;
const selector = 'button[type="button"][data-vocabulary-word]';
const attributes = ['aria-haspopup', 'aria-expanded', 'aria-controls'];
const EDGE = 12, GAP = 8, TRANSIT = 180;

export function bindVocabularyReminders(scope, {renderCard, bindCard, stopCardMedia, isCurrent = () => true}) {
  if (!scope?.ownerDocument || typeof renderCard !== 'function') throw new TypeError('Vocabulary reminders need a scope and renderCard');
  bindings.get(scope)?.destroy();
  const doc = scope.ownerDocument, win = doc.defaultView;
  const cleanups = [], triggers = new Map(), suppressed = new WeakSet();
  let destroyed = false, current = null, leaveTimer = null, frame = null;
  const currentContext = () => !destroyed && scope.isConnected && isCurrent();
  const on = (target, type, handler, options) => {
    target.addEventListener(type, handler, options);
    const off = () => target.removeEventListener(type, handler, options);
    return off;
  };
  const listen = (...args) => cleanups.push(on(...args));
  const viewport = () => {
    const v = win.visualViewport;
    return {left: v?.offsetLeft || 0, top: v?.offsetTop || 0,
      width: v?.width ?? win.innerWidth, height: v?.height ?? win.innerHeight};
  };
  function displayed(el) {
    if (el.closest('[hidden],[inert],[aria-hidden="true"]')) return false;
    for (let node = el; node; node = node.parentElement) {
      const style = win.getComputedStyle(node);
      if (style.display === 'none' || ['hidden', 'collapse'].includes(style.visibility) || style.opacity === '0') return false;
    }
    return true;
  }
  function available(anchor) {
    if (!currentContext() || !scope.contains(anchor) || !anchor.isConnected || anchor.disabled || !anchor.matches(selector) || !displayed(anchor)) return false;
    const modal = [...doc.querySelectorAll('dialog[open],[role="dialog"][aria-modal="true"]')]
      .some(el => displayed(el) && !el.contains(anchor));
    const drawer = [...doc.querySelectorAll('[data-course-overlay="true"],[data-main-overlay="true"],.nav-backdrop:not([hidden])')].some(displayed);
    if (modal || drawer) return false;
    const r = anchor.getBoundingClientRect(), v = viewport();
    let left = Math.max(r.left, v.left), right = Math.min(r.right, v.left + v.width);
    let top = Math.max(r.top, v.top), bottom = Math.min(r.bottom, v.top + v.height);
    if (!anchor.getClientRects().length || r.width <= 0 || r.height <= 0) return false;
    for (let node = anchor.parentElement; node; node = node.parentElement) {
      const style = win.getComputedStyle(node), box = node.getBoundingClientRect();
      if (/(auto|scroll|hidden|clip)/.test(style.overflowX || style.overflow)) { left = Math.max(left, box.left); right = Math.min(right, box.right); }
      if (/(auto|scroll|hidden|clip)/.test(style.overflowY || style.overflow)) { top = Math.max(top, box.top); bottom = Math.min(bottom, box.bottom); }
    }
    if (right <= left || bottom <= top) return false;
    const hit = doc.elementFromPoint?.((left + right) / 2, (top + bottom) / 2);
    return !hit || anchor.contains(hit) || hit.contains(anchor) || Boolean(current?.panel.contains(hit));
  }
  function cancelLeave() { if (leaveTimer !== null) win.clearTimeout(leaveTimer); leaveTimer = null; }
  function close({returnFocus = true} = {}) {
    cancelLeave();
    if (frame !== null) win.cancelAnimationFrame(frame);
    frame = null;
    const old = current;
    if (!old) return;
    const restore = returnFocus && old.panel.contains(doc.activeElement) && available(old.anchor);
    current = null;
    old.events.splice(0).forEach(off => off());
    if (openByDocument.get(doc) === api) openByDocument.delete(doc);
    suppressed.add(old.anchor);
    old.anchor.setAttribute('aria-expanded', 'false');
    old.anchor.removeAttribute('aria-controls');
    try {
      try { stopCardMedia?.(old.panel); }
      finally { old.dispose?.(); }
    } finally {
      old.panel.remove();
      if (restore) old.anchor.focus({preventScroll: true});
    }
  }
  function position() {
    if (!current) return;
    const {anchor, panel, bridge} = current;
    if (!available(anchor) || !panel.isConnected || current.id !== anchor.dataset.vocabularyWord) { close(); return; }
    const r = anchor.getBoundingClientRect(), v = viewport();
    const width = Math.max(0, Math.min(360, v.width - EDGE * 2));
    const below = v.top + v.height - EDGE - r.bottom - GAP;
    const above = r.top - v.top - EDGE - GAP;
    panel.style.width = width + 'px';
    panel.style.maxHeight = Math.max(0, v.height - EDGE * 2) + 'px';
    const height = panel.getBoundingClientRect().height;
    const flip = height > below && above > below;
    // When neither side can fit even the header, use viewport space and clamp,
    // allowing overlap with the anchor rather than losing the Close control.
    const room = Math.max(above, below) < 100 ? Math.max(0, v.height - EDGE * 2) : Math.max(0, flip ? above : below);
    panel.style.maxHeight = Math.min(room, Math.max(0, v.height - EDGE * 2)) + 'px';
    const actualHeight = Math.min(height, room);
    const rtl = win.getComputedStyle(anchor).direction === 'rtl';
    const left = Math.max(v.left + EDGE, Math.min(rtl ? r.right - width : r.left, v.left + v.width - EDGE - width));
    const top = Math.max(v.top + EDGE, Math.min(flip ? r.top - GAP - actualHeight : r.bottom + GAP, v.top + v.height - EDGE - actualHeight));
    panel.style.left = left + 'px'; panel.style.top = top + 'px';
    panel.dataset.placement = flip ? 'above' : 'below';
    // Transparent pointer bridge spans only the gap, giving slow diagonal transit
    // a target while the cancelable 180ms grace handles wrapped/bidi anchors.
    Object.assign(bridge.style, {left: Math.min(left, r.left) + 'px',
      top: (flip ? top + actualHeight : r.bottom) + 'px',
      width: Math.max(left + width, r.right) - Math.min(left, r.left) + 'px', height: GAP + 'px'});
  }
  function monitor() {
    frame = null;
    position();
    if (current && win.requestAnimationFrame) frame = win.requestAnimationFrame(monitor);
  }
  function scheduleLeave() {
    cancelLeave();
    if (!current || current.pinned) return;
    const expected = current;
    leaveTimer = win.setTimeout(() => {
      leaveTimer = null;
      if (current === expected && !expected.pinned && !expected.panel.contains(doc.activeElement) && doc.activeElement !== expected.anchor) close({returnFocus: false});
    }, TRANSIT);
  }
  function open(anchor, pin = false) {
    if (!available(anchor) || (!pin && suppressed.has(anchor))) return;
    cancelLeave();
    if (current?.anchor === anchor) {
      if (pin) { current.pinned = true; current.panel.querySelector('[data-vocabulary-close]').focus({preventScroll: true}); }
      return;
    }
    const id = anchor.dataset.vocabularyWord;
    if (!id) return;
    let html;
    try { html = renderCard(id); }
    catch (error) { close({returnFocus: false}); throw error; }
    if (typeof html !== 'string' || !html || !available(anchor)) return;
    close({returnFocus: false});
    openByDocument.get(doc)?.close();
    if (!available(anchor)) return;
    const panel = doc.createElement('section');
    panel.className = 'vocabulary-reminder'; panel.id = 'vocabulary-reminder-' + (++sequence);
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Vocabulary card');
    panel.innerHTML = '<div class="vocabulary-reminder__bridge" aria-hidden="true"></div><header class="vocabulary-reminder__header" dir="ltr"><span>Vocabulary card</span><button type="button" class="button small secondary" data-vocabulary-close>Close</button></header><div class="vocabulary-reminder__body"></div>';
    panel.querySelector('.vocabulary-reminder__body').innerHTML = html;
    let mount = anchor;
    const status = anchor.closest('[role="status"]');
    if (status && scope.contains(status) && status !== scope) mount = status;
    mount.after(panel);
    current = {id, anchor, panel, pinned: pin, dispose: null, events: [], bridge: panel.firstElementChild};
    openByDocument.set(doc, api);
    anchor.setAttribute('aria-expanded', 'true'); anchor.setAttribute('aria-controls', panel.id);
    try {
      const opened = current;
      const dispose = bindCard?.(panel);
      if (current !== opened) { if (typeof dispose === 'function') dispose(); return; }
      opened.dispose = typeof dispose === 'function' ? dispose : null;
      opened.events.push(on(panel, 'pointerover', cancelLeave));
      opened.events.push(on(panel, 'pointerout', event => { if (!panel.contains(event.relatedTarget)) scheduleLeave(); }));
      opened.events.push(on(panel.querySelector('[data-vocabulary-close]'), 'click', event => { event.stopPropagation(); close(); }));
      for (const type of ['keydown', 'keyup', 'keypress']) opened.events.push(on(panel, type, isolateKeys));
      position();
      if (!current) return;
      if (pin) panel.querySelector('[data-vocabulary-close]').focus({preventScroll: true});
      if (win.requestAnimationFrame) frame = win.requestAnimationFrame(monitor);
    } catch (error) { close(); throw error; }
  }
  function isolateKeys(event) {
    event.stopPropagation();
    if (!event.defaultPrevented && event.type === 'keydown' && event.key === 'Escape' && current) { event.preventDefault(); close(); }
  }
  function registerTriggers() {
    for (const [anchor, saved] of triggers) {
      if (!scope.contains(anchor) || !anchor.matches(selector)) {
        if (current?.anchor === anchor) close({returnFocus: false});
        saved.off.forEach(off => off()); restoreAttributes(anchor, saved.values); triggers.delete(anchor);
      }
    }
    for (const anchor of scope.querySelectorAll(selector)) {
      if (anchor.closest('.vocabulary-reminder') || triggers.has(anchor)) continue;
      const values = attributes.map(name => anchor.getAttribute(name));
      anchor.setAttribute('aria-haspopup', 'dialog'); anchor.setAttribute('aria-expanded', 'false'); anchor.removeAttribute('aria-controls');
      const off = ['keydown', 'keyup', 'keypress'].map(type => on(anchor, type, isolateKeys));
      off.push(on(anchor, 'click', event => {
        event.stopPropagation();
        if (current?.anchor === anchor && current.pinned) { close(); return; }
        suppressed.delete(anchor); open(anchor, true);
      }));
      off.push(on(anchor, 'focusin', () => open(anchor)));
      off.push(on(anchor, 'pointerover', event => {
        if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
        if (win.matchMedia && !win.matchMedia('(any-hover: hover)').matches) return;
        if (!anchor.contains(event.relatedTarget)) { suppressed.delete(anchor); open(anchor); }
      }));
      off.push(on(anchor, 'pointerout', event => {
        if (anchor.contains(event.relatedTarget)) return;
        if (current?.anchor === anchor) scheduleLeave();
      }));
      triggers.set(anchor, {values, off});
    }
  }
  function restoreAttributes(anchor, values) {
    attributes.forEach((name, i) => values[i] === null ? anchor.removeAttribute(name) : anchor.setAttribute(name, values[i]));
  }
  const api = {
    close: () => close(),
    isOpen: () => { position(); return Boolean(current); },
    destroy() {
      if (destroyed) return;
      // Close while context is still live so exact-trigger focus return can work.
      try { close(); }
      finally {
        destroyed = true;
        cleanups.splice(0).forEach(off => off());
        for (const [anchor, saved] of triggers) { saved.off.forEach(off => off()); restoreAttributes(anchor, saved.values); }
        triggers.clear();
        if (bindings.get(scope) === api) bindings.delete(scope);
      }
    }
  };
  registerTriggers();
  listen(doc, 'pointerdown', event => {
    if (current && !current.panel.contains(event.target) && !current.anchor.contains(event.target)) close({returnFocus: false});
  }, true);
  // Catch Escape outside the surface before Preview's owning dialog shortcuts.
  // Inside, target-level isolation lets card controls receive their other keys.
  listen(doc, 'keydown', event => {
    if (event.key === 'Escape' && current && !current.panel.contains(event.target) && !current.anchor.contains(event.target)) {
      event.preventDefault(); event.stopPropagation(); close();
    }
  }, true);
  listen(doc, 'focusin', event => {
    if (current && !current.panel.contains(event.target) && !current.anchor.contains(event.target)) close({returnFocus: false});
    // A real departure releases focus suppression; close-trigger focus restoration
    // runs while suppression is still present and therefore cannot reopen the card.
    for (const anchor of triggers.keys()) if (anchor !== event.target) suppressed.delete(anchor);
  });
  listen(doc, 'scroll', position, true);
  listen(win, 'resize', position);
  if (win.visualViewport) { listen(win.visualViewport, 'resize', position); listen(win.visualViewport, 'scroll', position); }
  const observer = new win.MutationObserver(records => {
    if (destroyed) return;
    const external = records.filter(record => !current?.panel.contains(record.target));
    if (external.some(record => record.type === 'childList' || ['type', 'data-vocabulary-word'].includes(record.attributeName))) registerTriggers();
    if (current && external.length) position();
  });
  observer.observe(doc.documentElement, {subtree: true, childList: true, attributes: true,
    attributeFilter: ['hidden', 'inert', 'aria-hidden', 'aria-modal', 'open', 'class', 'style', 'disabled', 'type', 'data-vocabulary-word', 'data-course-overlay', 'data-main-overlay']});
  cleanups.push(() => observer.disconnect());
  bindings.set(scope, api);
  return api;
}
