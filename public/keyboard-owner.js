(function () {
  'use strict';

  var HINTS_STORAGE_KEY = 'hebleoKeyboardShowEnglishHints';
  var CONVERT_STORAGE_KEY = 'hebleoKeyboardConvertEnglishKeys';
  var ROOT_ID = 'hebleo-keyboard-root';
  var ACTIVE_TARGET_CLASS = 'hebleo-keyboard-target-active';
  var ACTIVE_TARGET_ATTR = 'data-hebleo-keyboard-target';
  var bodyOpenClass = 'hebleo-keyboard-is-open';
  var activeTarget = null;
  var savedRange = null;
  var restoreState = null;
  var isOpen = false;
  var pinned = false, lessonContext = '', pinButton;
  function changed() { window.dispatchEvent(new CustomEvent('hebleo-keyboard-preference', {detail:{keyboardPinned:pinned,keyboardConvert:convertPhysicalKeys}})); }
  var showHints = readHintsPreference();
  var convertPhysicalKeys = readConvertPreference();
  var root;
  var launcher;
  var panel;
  var statusNode;
  var hintToggle;
  var convertToggle;
  var caretIndicator;

  var blockedInputTypes = {
    button: true,
    checkbox: true,
    color: true,
    file: true,
    hidden: true,
    image: true,
    radio: true,
    range: true,
    reset: true,
    submit: true
  };

  var hebrewRows = [
    [
      { en: 'q', he: '/' },
      { en: 'w', he: '׳' },
      { en: 'e', he: 'ק' },
      { en: 'r', he: 'ר' },
      { en: 't', he: 'א' },
      { en: 'y', he: 'ט' },
      { en: 'u', he: 'ו' },
      { en: 'i', he: 'ן' },
      { en: 'o', he: 'ם' },
      { en: 'p', he: 'פ' }
    ],
    [
      { en: 'a', he: 'ש' },
      { en: 's', he: 'ד' },
      { en: 'd', he: 'ג' },
      { en: 'f', he: 'כ' },
      { en: 'g', he: 'ע' },
      { en: 'h', he: 'י' },
      { en: 'j', he: 'ח' },
      { en: 'k', he: 'ל' },
      { en: 'l', he: 'ך' },
      { en: ';', he: 'ף' },
      { en: "'", he: ',' },
      { en: '"', he: '"' }
    ],
    [
      { en: 'z', he: 'ז' },
      { en: 'x', he: 'ס' },
      { en: 'c', he: 'ב' },
      { en: 'v', he: 'ה' },
      { en: 'b', he: 'נ' },
      { en: 'n', he: 'מ' },
      { en: 'm', he: 'צ' },
      { en: ',', he: 'ת' },
      { en: '.', he: 'ץ' },
      { en: '/', he: '.' },
      { en: '?', he: '?' }
    ]
  ];

  var physicalMap = {};
  hebrewRows.forEach(function (row) {
    row.forEach(function (key) {
      physicalMap[key.en] = key.he;
    });
  });
  physicalMap["'"] = ',';
  physicalMap['['] = ']';
  physicalMap[']'] = '[';

  function init() {
    if (document.getElementById(ROOT_ID)) {
      return;
    }

    buildUI();
    bindGlobalEvents();
    document.body.appendChild(root);
    updateHintState();
    updateConvertState();
    updateStatus();
  }

  function buildUI() {
    root = document.createElement('div');
    root.id = ROOT_ID;
    root.className = 'hebleo-keyboard';

    launcher = document.createElement('button');
    launcher.type = 'button';
    launcher.className = 'hebleo-keyboard__launcher';
    launcher.setAttribute('aria-label', 'Open Hebrew keyboard');
    launcher.setAttribute('aria-expanded', 'false');
    launcher.innerHTML = (
      '<svg class="hebleo-keyboard__launcher-icon" viewBox="0 0 32 24" aria-hidden="true" focusable="false">' +
        '<rect x="2" y="4" width="28" height="16" rx="2.5"></rect>' +
        '<path d="M6 8h3v2H6V8Zm5 0h3v2h-3V8Zm5 0h3v2h-3V8Zm5 0h3v2h-3V8ZM8 12h3v2H8v-2Zm5 0h3v2h-3v-2Zm5 0h3v2h-3v-2Zm5 0h3v2h-3v-2ZM10 16h12v2H10v-2Z"></path>' +
      '</svg>'
    );

    panel = document.createElement('section');
    panel.className = 'hebleo-keyboard__panel';
    panel.setAttribute('aria-label', 'Hebleo Hebrew keyboard');
    panel.setAttribute('aria-hidden', 'true');

    caretIndicator = document.createElement('div');
    caretIndicator.className = 'hebleo-keyboard__field-caret';
    caretIndicator.setAttribute('aria-hidden', 'true');

    var header = document.createElement('div');
    header.className = 'hebleo-keyboard__header';

    var brand = document.createElement('div');
    brand.className = 'hebleo-keyboard__brand';
    brand.innerHTML = '<span class="hebleo-keyboard__mark" aria-hidden="true"></span><span>Hebleo Keyboard</span>';

    statusNode = document.createElement('div');
    statusNode.className = 'hebleo-keyboard__status';
    statusNode.setAttribute('aria-live', 'polite');

    var closeButton = makeControlButton('close', '×', 'Close keyboard');
    closeButton.classList.add('hebleo-keyboard__close');

    header.appendChild(brand);
    header.appendChild(statusNode);
    pinButton=makeControlButton('pin','Pin','Keep keyboard open between questions');
    pinButton.classList.add('hebleo-keyboard__pin');
    header.appendChild(pinButton);
    header.appendChild(closeButton);
    panel.appendChild(header);

    hebrewRows.forEach(function (row, index) {
      var rowEl = document.createElement('div');
      rowEl.className = 'hebleo-keyboard__row hebleo-keyboard__row--letters hebleo-keyboard__row--' + (index + 1);

      row.forEach(function (key) {
        rowEl.appendChild(makeLetterKey(key));
      });

      if (index === 0) {
        rowEl.appendChild(makeControlButton('backspace', '⌫', 'Backspace'));
      }

      panel.appendChild(rowEl);
    });

    var tools = document.createElement('div');
    tools.className = 'hebleo-keyboard__row hebleo-keyboard__row--tools';

    hintToggle = makeControlButton('toggle-hints', 'EN', 'Toggle English key hints');
    hintToggle.classList.add('hebleo-keyboard__key--hint-toggle');
    convertToggle = makeControlButton('toggle-convert', 'A→א', 'Toggle physical English keys to Hebrew');
    convertToggle.classList.add('hebleo-keyboard__key--convert-toggle');
    showHints=true; // English equivalents remain visible as requested.
    hintToggle.hidden=true;
    tools.appendChild(convertToggle);
    tools.appendChild(makeControlButton('space', '', 'Space'));
    tools.appendChild(makeControlButton('arrow-left', '←', 'Move cursor left'));
    tools.appendChild(makeControlButton('arrow-right', '→', 'Move cursor right'));
    tools.appendChild(makeControlButton('enter', '↵', 'Enter'));

    panel.appendChild(tools);
    var vowels=document.createElement('details');vowels.className='hebleo-keyboard__vowels';
    var summary=document.createElement('summary');summary.textContent='Nikkud (vowel marks)';vowels.appendChild(summary);
    var vowelRow=document.createElement('div');vowelRow.className='hebleo-keyboard__row';
    ['ְ','ֱ','ֲ','ֳ','ִ','ֵ','ֶ','ַ','ָ','ֹ','ֻ','ּ','ׁ','ׂ'].forEach(function(mark){var key=makeLetterKey({he:'א'+mark,en:''});key.dataset.insert=mark;key.setAttribute('aria-label','Insert vowel '+mark);vowelRow.appendChild(key);});
    vowels.appendChild(vowelRow);panel.appendChild(vowels);
    var legend=document.createElement('small');legend.className='hebleo-keyboard__legend';legend.innerHTML='<span class="known-key-legend">Known keys</span><span class="new-key-legend">New this lesson</span>';panel.appendChild(legend);
    root.appendChild(launcher);
    root.appendChild(caretIndicator);
    root.appendChild(panel);
  }

  function makeLetterKey(key) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'hebleo-keyboard__key hebleo-keyboard__key--letter';
    button.dataset.insert = key.he;
    button.dataset.en = key.en;
    button.setAttribute('aria-label', 'Type ' + key.he);
    button.innerHTML =
      '<span class="hebleo-keyboard__he">' + escapeHTML(key.he) + '</span>' +
      '<span class="hebleo-keyboard__en">' + escapeHTML(key.en) + '</span>';
    return button;
  }

  function makeControlButton(action, label, ariaLabel) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'hebleo-keyboard__key hebleo-keyboard__key--control';
    button.dataset.action = action;
    button.setAttribute('aria-label', ariaLabel);
    button.textContent = label;
    return button;
  }

  function bindGlobalEvents() {
    launcher.addEventListener('click', function () {
      if (isOpen) {
        closeKeyboard();
      } else {
        openKeyboard();
      }
    });

    panel.addEventListener('pointerdown', function (event) {
      event.preventDefault();
    });
    panel.addEventListener('transitionend', function () { if (isOpen && activeTarget) positionTarget(); });

    panel.addEventListener('click', function (event) {
      var key = event.target.closest('.hebleo-keyboard__key');
      if (!key) {
        return;
      }

      flashKey(key);

      if (key.dataset.insert) {
        insertText(key.dataset.insert);
        return;
      }

      runAction(key.dataset.action);
    });

    document.addEventListener('focusin', function (event) {
      if (isEditable(event.target)) {
        setActiveTarget(event.target);
      }
    });

    document.addEventListener('pointerdown', function (event) {
      if (root.contains(event.target)) {
        return;
      }

      var editable = event.target.closest('input, textarea, [contenteditable=""], [contenteditable="true"]');
      if (isEditable(editable)) {
        setActiveTarget(editable);
      } else {
        clearActiveTarget();
      }
    }, true);

    document.addEventListener('selectionchange', function () {
      if (activeTarget && isContentEditable(activeTarget) && activeTarget.contains(document.activeElement)) {
        saveCurrentRange();
      }

      updateReadonlyCaretIndicator();
    });

    document.addEventListener('keydown', function (event) {
      if (!isOpen || !convertPhysicalKeys || !activeTarget || event.defaultPrevented || event.isComposing) {
        return;
      }

      if (event.ctrlKey || event.altKey || event.metaKey) {
        return;
      }

      var mapped = physicalMap[event.key.toLowerCase()];
      if (!mapped) {
        return;
      }

      event.preventDefault();
      focusWithoutNativeKeyboard(activeTarget);
      insertText(mapped);
    }, true);

    document.addEventListener('focusout', function (event) {
      if (root.contains(event.target)) {
        return;
      }

      window.setTimeout(function () {
        if (!root.contains(document.activeElement) && !isEditable(document.activeElement)) {
          clearActiveTarget();
        }
      }, 0);
    }, true);

    window.addEventListener('resize', positionTarget);
    window.addEventListener('resize', updateReadonlyCaretIndicator);
    window.addEventListener('orientationchange', positionTarget);
    window.addEventListener('orientationchange', updateReadonlyCaretIndicator);
  }

  function setActiveTarget(target) {
    if (!isEditable(target)) {
      return;
    }

    if (activeTarget !== target) {
      clearActiveTargetCue();
      restoreTarget();
      activeTarget = target;
    }

    if (isContentEditable(target)) {
      saveCurrentRange();
    }

    if (isOpen) {
      suppressNativeKeyboard(target);
      positionTarget();
    }

    refreshActiveTargetCue();
    updateStatus();
  }

  function openKeyboard() {
    isOpen = true;
    root.classList.add('hebleo-keyboard--open');
    document.body.classList.add(bodyOpenClass);
    launcher.setAttribute('aria-expanded', 'true');
    panel.setAttribute('aria-hidden', 'false');

    if (!activeTarget && isEditable(document.activeElement)) {
      activeTarget = document.activeElement;
    }

    if (activeTarget) {
      suppressNativeKeyboard(activeTarget);
      positionTarget();
    }

    refreshActiveTargetCue();
    updateStatus();
  }

  function closeKeyboard() {
    isOpen = false;
    root.classList.remove('hebleo-keyboard--open');
    document.body.classList.remove(bodyOpenClass);
    launcher.setAttribute('aria-expanded', 'false');
    panel.setAttribute('aria-hidden', 'true');
    clearActiveTargetCue();
    restoreTarget();
    updateStatus();
  }

  function runAction(action) {
    switch (action) {
      case 'close':
        closeKeyboard();
        break;
      case 'backspace':
        backspace();
        break;
      case 'space':
        insertText(' ');
        break;
      case 'comma':
        insertText(',');
        break;
      case 'enter':
        insertText('\n');
        break;
      case 'arrow-left':
        moveCursor(-1);
        break;
      case 'arrow-right':
        moveCursor(1);
        break;
      case 'pin':
        pinned=!pinned;pinButton.textContent=pinned?'Unpin':'Pin';pinButton.setAttribute('aria-pressed',String(pinned));changed();break;
      case 'toggle-hints':
        showHints = !showHints;
        try {
          window.localStorage.setItem(HINTS_STORAGE_KEY, showHints ? '1' : '0');
        } catch (error) {
          // Local storage may be unavailable in private contexts.
        }
        updateHintState();
        if (activeTarget) {
          focusWithoutNativeKeyboard(activeTarget);
        }
        break;
      case 'toggle-convert':
        convertPhysicalKeys = !convertPhysicalKeys;
        try {
          window.localStorage.setItem(CONVERT_STORAGE_KEY, convertPhysicalKeys ? '1' : '0');
        } catch (error) {
          // Local storage may be unavailable in private contexts.
        }
        updateConvertState();changed();
        if (activeTarget) {
          focusWithoutNativeKeyboard(activeTarget);
        }
        break;
      default:
        break;
    }
  }

  function insertText(text) {
    if (!activeTarget || !isEditable(activeTarget)) {
      updateStatus();
      return;
    }

    if (isInput(activeTarget) || activeTarget.tagName === 'TEXTAREA') {
      insertIntoField(activeTarget, text);
    } else if (isContentEditable(activeTarget)) {
      insertIntoContentEditable(activeTarget, text);
    }

    updateStatus();
    positionTarget();
    updateReadonlyCaretIndicator();
  }

  function insertIntoField(field, text) {
    ensureWritableField(field);

    var value = field.value || '';
    var start = typeof field.selectionStart === 'number' ? field.selectionStart : value.length;
    var end = typeof field.selectionEnd === 'number' ? field.selectionEnd : start;
    var next = value.slice(0, start) + text + value.slice(end);
    var cursor = start + text.length;

    field.value = next;
    focusWithoutNativeKeyboard(field);
    setSelection(field, cursor, cursor);
    dispatchEditEvents(field);
  }

  function insertIntoContentEditable(target, text) {
    focusWithoutNativeKeyboard(target);
    restoreRange(target);

    var selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      placeCursorAtEnd(target);
      selection = window.getSelection();
    }

    var range = selection.getRangeAt(0);
    range.deleteContents();

    var node = document.createTextNode(text);
    range.insertNode(node);
    range.setStartAfter(node);
    range.setEndAfter(node);
    selection.removeAllRanges();
    selection.addRange(range);
    savedRange = range.cloneRange();
    dispatchEditEvents(target);
  }

  function backspace() {
    if (!activeTarget || !isEditable(activeTarget)) {
      updateStatus();
      return;
    }

    if (isInput(activeTarget) || activeTarget.tagName === 'TEXTAREA') {
      ensureWritableField(activeTarget);

      var value = activeTarget.value || '';
      var start = typeof activeTarget.selectionStart === 'number' ? activeTarget.selectionStart : value.length;
      var end = typeof activeTarget.selectionEnd === 'number' ? activeTarget.selectionEnd : start;

      if (start === end && start > 0) {
        start -= 1;
      }

      activeTarget.value = value.slice(0, start) + value.slice(end);
      focusWithoutNativeKeyboard(activeTarget);
      setSelection(activeTarget, start, start);
      dispatchEditEvents(activeTarget);
    } else if (isContentEditable(activeTarget)) {
      restoreRange(activeTarget);
      var selection = window.getSelection();

      if (!selection || selection.rangeCount === 0) {
        return;
      }

      var range = selection.getRangeAt(0);
      if (range.collapsed) {
        if (typeof selection.modify === 'function') {
          selection.modify('extend', 'backward', 'character');
          range = selection.getRangeAt(0);
        } else {
          range.setStart(range.startContainer, Math.max(0, range.startOffset - 1));
        }
      }

      range.deleteContents();
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
      savedRange = range.cloneRange();
      dispatchEditEvents(activeTarget);
    }

    updateStatus();
    updateReadonlyCaretIndicator();
  }

  function moveCursor(direction) {
    if (!activeTarget || !isEditable(activeTarget)) {
      return;
    }

    if (isInput(activeTarget) || activeTarget.tagName === 'TEXTAREA') {
      var value = activeTarget.value || '';
      var current = typeof activeTarget.selectionStart === 'number' ? activeTarget.selectionStart : value.length;
      var next = Math.max(0, Math.min(value.length, current + direction));
      focusWithoutNativeKeyboard(activeTarget);
      setSelection(activeTarget, next, next);
      updateReadonlyCaretIndicator();
      return;
    }

    if (isContentEditable(activeTarget)) {
      restoreRange(activeTarget);
      var selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        placeCursorAtEnd(activeTarget);
        return;
      }

      selection.modify(direction < 0 ? 'move' : 'move', direction < 0 ? 'backward' : 'forward', 'character');
      saveCurrentRange();
      updateReadonlyCaretIndicator();
    }
  }

  function suppressNativeKeyboard(target) {
    if (!target || !isEditable(target)) {
      return;
    }

    if (restoreState && restoreState.target !== target) {
      restoreTarget();
    }

    if (restoreState && restoreState.target === target) {
      return;
    }

    restoreState = {
      target: target,
      readOnly: isInput(target) || target.tagName === 'TEXTAREA' ? target.readOnly : null,
      inputMode: target.getAttribute('inputmode'),
      keyboardPolicy: target.getAttribute('virtualkeyboardpolicy'),
      type: isInput(target) ? target.getAttribute('type') : null
    };

    target.setAttribute('inputmode', 'none');
    target.setAttribute('virtualkeyboardpolicy', 'manual');

    if ((isInput(target) || target.tagName === 'TEXTAREA') && isTouchDevice()) {
      ensureWritableField(target);
      target.readOnly = true;
    }

    updateReadonlyCaretIndicator();
  }

  function restoreTarget() {
    if (!restoreState || !restoreState.target) {
      restoreState = null;
      return;
    }

    var target = restoreState.target;

    if (restoreState.inputMode === null) {
      target.removeAttribute('inputmode');
    } else {
      target.setAttribute('inputmode', restoreState.inputMode);
    }

    if (restoreState.keyboardPolicy === null) {
      target.removeAttribute('virtualkeyboardpolicy');
    } else {
      target.setAttribute('virtualkeyboardpolicy', restoreState.keyboardPolicy);
    }

    if ((isInput(target) || target.tagName === 'TEXTAREA') && restoreState.readOnly !== null) {
      target.readOnly = restoreState.readOnly;
    }

    if (isInput(target) && restoreState.type !== null && target.getAttribute('type') !== restoreState.type) {
      try {
        target.setAttribute('type', restoreState.type);
      } catch (error) {
        // Some browser/input combinations refuse type changes after creation.
      }
    }

    restoreState = null;
    hideReadonlyCaretIndicator();
  }

  function ensureWritableField(field) {
    if (!isInput(field)) {
      return;
    }

    var type = (field.getAttribute('type') || 'text').toLowerCase();
    if (type === 'number') {
      try {
        field.setAttribute('type', 'text');
      } catch (error) {
        // If the type cannot be changed, direct value assignment still works for normal text-like inputs.
      }
    }
  }

  function focusWithoutNativeKeyboard(target) {
    if (!target || typeof target.focus !== 'function') {
      return;
    }

    try {
      target.focus({ preventScroll: true });
    } catch (error) {
      target.focus();
    }
  }

  function setSelection(field, start, end) {
    if (typeof field.setSelectionRange !== 'function') {
      return;
    }

    try {
      field.setSelectionRange(start, end);
    } catch (error) {
      // Some input types do not support selection ranges.
    }
  }

  function restoreRange(target) {
    if (!isContentEditable(target) || !savedRange) {
      return;
    }

    var selection = window.getSelection();
    if (!selection) {
      return;
    }

    if (!target.contains(savedRange.startContainer) || !target.contains(savedRange.endContainer)) {
      placeCursorAtEnd(target);
      return;
    }

    selection.removeAllRanges();
    selection.addRange(savedRange);
  }

  function saveCurrentRange() {
    var selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return;
    }

    var range = selection.getRangeAt(0);
    if (activeTarget && isContentEditable(activeTarget) && activeTarget.contains(range.commonAncestorContainer)) {
      savedRange = range.cloneRange();
    }
  }

  function placeCursorAtEnd(target) {
    var range = document.createRange();
    range.selectNodeContents(target);
    range.collapse(false);

    var selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }

    savedRange = range.cloneRange();
  }

  function positionTarget() {
    if (!isOpen || !activeTarget || !document.documentElement.contains(activeTarget)) {
      return;
    }

    window.setTimeout(function () {
      if (!activeTarget || !activeTarget.isConnected || !isOpen) return;
      try {
        var keyboardRect=panel.getBoundingClientRect(),fieldRect=activeTarget.getBoundingClientRect();
        var desiredTop=Math.max(12,(keyboardRect.top-fieldRect.height)/2);
        var container=activeTarget.closest('dialog');
        if(container)container.scrollBy({top:fieldRect.top-desiredTop,behavior:'instant'});
        else window.scrollBy({top:fieldRect.top-desiredTop,behavior:'instant'});
      } catch (error) {
        activeTarget.scrollIntoView(false);
      }
      updateReadonlyCaretIndicator();
    }, 40);
  }

  function dispatchEditEvents(target) {
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function updateHintState() {
    root.classList.toggle('hebleo-keyboard--show-hints', showHints);
    if (hintToggle) {
      hintToggle.setAttribute('aria-pressed', showHints ? 'true' : 'false');
      hintToggle.classList.toggle('hebleo-keyboard__key--active', showHints);
    }
  }

  function updateConvertState() {
    root.classList.toggle('hebleo-keyboard--convert-physical', convertPhysicalKeys);
    if (convertToggle) {
      convertToggle.setAttribute('aria-pressed', convertPhysicalKeys ? 'true' : 'false');
      convertToggle.classList.toggle('hebleo-keyboard__key--active', convertPhysicalKeys);
    }
  }

  function updateStatus() {
    if (!statusNode) {
      return;
    }

    statusNode.textContent = activeTarget && isEditable(activeTarget) ? 'field selected; you may begin typing' : 'select a field to type';
  }

  function clearActiveTarget() {
    clearActiveTargetCue();
    restoreTarget();
    activeTarget = null;
    savedRange = null;
    hideReadonlyCaretIndicator();
    updateStatus();
  }

  function refreshActiveTargetCue() {
    clearActiveTargetCue();

    if (!isOpen || !activeTarget || !isEditable(activeTarget)) {
      return;
    }

    activeTarget.classList.add(ACTIVE_TARGET_CLASS);
    activeTarget.setAttribute(ACTIVE_TARGET_ATTR, 'true');
    updateReadonlyCaretIndicator();
  }

  function clearActiveTargetCue() {
    var current = document.querySelector('[' + ACTIVE_TARGET_ATTR + '="true"]');
    if (current) {
      current.classList.remove(ACTIVE_TARGET_CLASS);
      current.removeAttribute(ACTIVE_TARGET_ATTR);
    }

    hideReadonlyCaretIndicator();
  }

  function updateReadonlyCaretIndicator() {
    if (!caretIndicator || !shouldShowReadonlyCaret()) {
      hideReadonlyCaretIndicator();
      return;
    }

    var rect = getReadonlyCaretRect(activeTarget);
    if (!rect) {
      hideReadonlyCaretIndicator();
      return;
    }

    caretIndicator.style.left = Math.round(rect.left) + 'px';
    caretIndicator.style.top = Math.round(rect.top) + 'px';
    caretIndicator.style.height = Math.max(18, Math.round(rect.height)) + 'px';
    caretIndicator.classList.add('hebleo-keyboard__field-caret--visible');
  }

  function shouldShowReadonlyCaret() {
    return Boolean(
      isOpen &&
      activeTarget &&
      (isInput(activeTarget) || activeTarget.tagName === 'TEXTAREA') &&
      activeTarget.readOnly &&
      isTouchDevice()
    );
  }

  function hideReadonlyCaretIndicator() {
    if (caretIndicator) {
      caretIndicator.classList.remove('hebleo-keyboard__field-caret--visible');
    }
  }

  function getReadonlyCaretRect(field) {
    if (field.tagName === 'TEXTAREA') {
      return getReadonlyTextareaCaretRect(field);
    }

    return getReadonlyInputCaretRect(field);
  }

  function getReadonlyInputCaretRect(field) {
    var computed = window.getComputedStyle(field);
    var fieldRect = field.getBoundingClientRect();
    var value = field.value || '';
    var position = typeof field.selectionStart === 'number' ? field.selectionStart : value.length;
    var before = value.slice(0, position);
    var span = document.createElement('span');

    span.style.font = computed.font;
    span.style.letterSpacing = computed.letterSpacing;
    span.style.position = 'fixed';
    span.style.left = '-9999px';
    span.style.top = '-9999px';
    span.style.whiteSpace = 'pre';
    span.textContent = before || '';
    document.body.appendChild(span);

    var textWidth = span.getBoundingClientRect().width;
    span.remove();

    var paddingLeft = parseFloat(computed.paddingLeft) || 0;
    var paddingRight = parseFloat(computed.paddingRight) || 0;
    var borderLeft = parseFloat(computed.borderLeftWidth) || 0;
    var borderTop = parseFloat(computed.borderTopWidth) || 0;
    var innerWidth = Math.max(0, fieldRect.width - paddingLeft - paddingRight - borderLeft);
    var left = fieldRect.left + borderLeft + paddingLeft + Math.min(innerWidth, Math.max(0, textWidth - field.scrollLeft));
    var height = Math.min(fieldRect.height - 8, parseFloat(computed.fontSize) * 1.25 || 22);
    var top = fieldRect.top + borderTop + Math.max(4, (fieldRect.height - height) / 2);

    return { left: left, top: top, height: height };
  }

  function getReadonlyTextareaCaretRect(field) {
    var computed = window.getComputedStyle(field);
    var fieldRect = field.getBoundingClientRect();
    var position = typeof field.selectionStart === 'number' ? field.selectionStart : (field.value || '').length;
    var mirror = document.createElement('div');
    var marker = document.createElement('span');

    mirror.style.boxSizing = computed.boxSizing;
    mirror.style.direction = computed.direction;
    mirror.style.font = computed.font;
    mirror.style.letterSpacing = computed.letterSpacing;
    mirror.style.lineHeight = computed.lineHeight;
    mirror.style.overflowWrap = 'break-word';
    mirror.style.padding = computed.padding;
    mirror.style.position = 'fixed';
    mirror.style.visibility = 'hidden';
    mirror.style.whiteSpace = 'pre-wrap';
    mirror.style.wordBreak = computed.wordBreak;
    mirror.style.width = fieldRect.width + 'px';
    mirror.style.left = fieldRect.left + 'px';
    mirror.style.top = fieldRect.top + 'px';
    mirror.textContent = (field.value || '').slice(0, position);
    marker.textContent = '\u200b';
    mirror.appendChild(marker);
    document.body.appendChild(mirror);

    var markerRect = marker.getBoundingClientRect();
    var fontSize = parseFloat(computed.fontSize) || 18;
    var result = {
      left: markerRect.left - field.scrollLeft,
      top: markerRect.top - field.scrollTop,
      height: Math.min(fieldRect.height - 8, fontSize * 1.35)
    };

    mirror.remove();
    return clampReadonlyCaretRect(result, fieldRect);
  }

  function clampReadonlyCaretRect(caretRect, fieldRect) {
    var left = Math.min(Math.max(caretRect.left, fieldRect.left + 4), fieldRect.right - 4);
    var top = Math.min(Math.max(caretRect.top, fieldRect.top + 4), fieldRect.bottom - 12);
    var height = Math.min(caretRect.height, fieldRect.bottom - top - 4);

    return { left: left, top: top, height: height };
  }

  function flashKey(key) {
    key.classList.remove('hebleo-keyboard__key--pressed');
    window.requestAnimationFrame(function () {
      key.classList.add('hebleo-keyboard__key--pressed');
      window.setTimeout(function () {
        key.classList.remove('hebleo-keyboard__key--pressed');
        key.blur();
      }, 120);
    });
  }

  function isEditable(element) {
    if (!element || element === document.body || element === document.documentElement) {
      return false;
    }

    if (isContentEditable(element)) {
      return true;
    }

    if (element.tagName === 'TEXTAREA') {
      return !element.disabled;
    }

    if (isInput(element)) {
      var type = (element.getAttribute('type') || 'text').toLowerCase();
      return !element.disabled && !blockedInputTypes[type];
    }

    return false;
  }

  function isInput(element) {
    return element && element.tagName === 'INPUT';
  }

  function isContentEditable(element) {
    return Boolean(element && element.isContentEditable);
  }

  function isTouchDevice() {
    return window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  }

  function readHintsPreference() {
    try {
      return window.localStorage.getItem(HINTS_STORAGE_KEY) === '1';
    } catch (error) {
      return false;
    }
  }

  function readConvertPreference() {
    try {
      return window.localStorage.getItem(CONVERT_STORAGE_KEY) === '1';
    } catch (error) {
      return false;
    }
  }

  function escapeHTML(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  window.HebleoKeyboard={
    mount:function(parent){if(parent.tagName==='DIALOG' && activeTarget && !parent.contains(activeTarget))clearActiveTarget();if(root && root.parentNode!==parent)parent.appendChild(root);},
    close:closeKeyboard,
    open:function(target){if(target && isEditable(target))setActiveTarget(target);openKeyboard();},
    sync:function(config,preferences,context){
      if(!root)return;
      pinned=Boolean(preferences.keyboardPinned);
      if(context!==lessonContext && !pinned)closeKeyboard();lessonContext=context;
      if(activeTarget && !activeTarget.isConnected)clearActiveTarget();
      pinned=Boolean(preferences.keyboardPinned);convertPhysicalKeys=Boolean(preferences.keyboardConvert);showHints=true;
      updateHintState();updateConvertState();pinButton.textContent=pinned?'Unpin':'Pin';pinButton.setAttribute('aria-pressed',String(pinned));
      root.querySelectorAll('[data-insert]').forEach(function(key){var letter=key.dataset.insert;key.classList.toggle('known-key',(config.knownKeys||'').includes(letter));key.classList.toggle('new-key',(config.newKeys||'').includes(letter));});
      ['knownColor','newColor'].forEach(function(name){root.style.setProperty(name==='knownColor'?'--known-key':'--new-key', /^#[0-9a-f]{6}$/i.test(config[name]||'')?config[name]:(name==='knownColor'?'#164b81':'#007b89'));});
      if(isOpen && !activeTarget){var dialog=root.closest('dialog'),answer=dialog?dialog.querySelector('textarea,input:not([disabled])'):document.getElementById('answer');if(answer&&!answer.disabled&&isEditable(answer))setActiveTarget(answer);}
    }
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
