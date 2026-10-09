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
  var vowelToggle, vowelPicker, vowelTimer, activeVowelRow;

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
    tools.appendChild(buildVowelPicker());
    tools.appendChild(convertToggle);
    tools.appendChild(makeControlButton('arrow-left', '←', 'Move cursor left'));
    tools.appendChild(makeControlButton('space', '', 'Space'));
    tools.appendChild(makeControlButton('arrow-right', '→', 'Move cursor right'));
    tools.appendChild(makeControlButton('enter', '↵', 'Enter'));

    panel.appendChild(tools);
    root.appendChild(launcher);
    root.appendChild(panel);
  }

  function buildVowelPicker() {
    var container = document.createElement('div');
    container.className = 'hebleo-keyboard__nikkud';
    vowelToggle = makeControlButton('toggle-vowels', 'אִ', 'Nikkud (vowel marks)');
    vowelToggle.setAttribute('aria-expanded', 'false');
    vowelToggle.setAttribute('aria-controls', 'hebleo-vowel-picker');
    container.appendChild(vowelToggle);
    vowelPicker = document.createElement('div');
    vowelPicker.id = 'hebleo-vowel-picker';
    vowelPicker.className = 'hebleo-keyboard__vowel-picker';
    vowelPicker.setAttribute('aria-label', 'Nikkud sounds');
    vowelPicker.hidden = true;
    var groups = [
      {sound:'a', mark:'ַ', name:'Patah', variants:[['ָ','Qamats'],['ֲ','Hataf patah'],['ֳ','Hataf qamats']]},
      {sound:'e', mark:'ֶ', name:'Segol', variants:[['ֵ','Tsere'],['ֱ','Hataf segol']]},
      {sound:'i', mark:'ִ', name:'Hiriq', variants:[['ִי','Hiriq with yod']]},
      {sound:'o', mark:'ֹ', name:'Holam', variants:[['וֹ','Holam with vav'],['ׂ','Sin dot']]},
      {sound:'u', mark:'ֻ', name:'Qubuts', variants:[['וּ','Shuruk']]}
    ];
    groups.forEach(function (group) {
      var row = document.createElement('div');
      row.className = 'hebleo-keyboard__vowel-group';
      row.dataset.sound = group.sound;
      var key = makeVowelKey(group.mark, group.name, group.sound);
      row.appendChild(key);
      addVowelVariants(row, key, group.variants);
      vowelPicker.appendChild(row);
    });
    var stop = document.createElement('div');
    stop.className = 'hebleo-keyboard__vowel-group';
    stop.dataset.category = 'stop';
    stop.appendChild(makeVowelKey('ְ', 'Sheva'));
    vowelPicker.appendChild(stop);
    // Remaining consonant marks retain their own Unicode values.
    var extra = document.createElement('div');
    extra.className = 'hebleo-keyboard__vowel-group hebleo-keyboard__extra-marks';
    var more = makeControlButton('more-marks', '⋯', 'Other marks: dagesh and right Shin dot');
    extra.appendChild(more);
    addVowelVariants(extra, more, [['ּ','Dagesh'],['ׁ','Right Shin dot']]);
    vowelPicker.appendChild(extra);
    container.appendChild(vowelPicker);
    return container;
  }

  function makeVowelKey(mark, name, sound) {
    var base = mark === 'ׁ' || mark === 'ׂ' ? 'ש' : 'א';
    var key = makeLetterKey({he:/^[\u05B0-\u05BC\u05C1\u05C2]/.test(mark) ? base+mark : mark, en:sound || ''});
    key.dataset.insert = mark;
    key.classList.add('hebleo-keyboard__vowel-key');
    key.setAttribute('aria-label', 'Insert '+name+(sound ? ' ('+sound+')' : ''));
    key.title = name;
    return key;
  }

  function addVowelVariants(row, key, variants) {
    if (!variants.length) return;
    var alternatives = document.createElement('div');
    alternatives.className = 'hebleo-keyboard__vowel-variants';
    alternatives.id = 'hebleo-vowel-'+(row.dataset.sound || 'other');
    alternatives.hidden = true;
    key.setAttribute('aria-expanded', 'false');
    key.setAttribute('aria-controls', alternatives.id);
    variants.forEach(function (variant) { alternatives.appendChild(makeVowelKey(variant[0], variant[1])); });
    row.appendChild(alternatives);
    key.addEventListener('pointerenter', function () {
      clearTimeout(vowelTimer);
      vowelTimer = window.setTimeout(function () { showVowelVariants(row); }, 1500);
    });
    key.addEventListener('pointerleave', function () { clearTimeout(vowelTimer); });
    row.addEventListener('pointerleave', function () { hideVowelVariants(); });
    key.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();showVowelVariants(row);alternatives.querySelector('button').focus();
      }
    });
    if (key.dataset.action === 'more-marks') key.addEventListener('click', function () { showVowelVariants(row); });
  }

  function showVowelVariants(row) {
    hideVowelVariants();
    if (vowelPicker.hidden || !isOpen) return;
    activeVowelRow = row;
    row.querySelector('.hebleo-keyboard__vowel-variants').hidden = false;
    row.firstElementChild.setAttribute('aria-expanded', 'true');
  }

  function hideVowelVariants() {
    clearTimeout(vowelTimer);
    if (!activeVowelRow) return;
    activeVowelRow.querySelector('.hebleo-keyboard__vowel-variants').hidden = true;
    activeVowelRow.firstElementChild.setAttribute('aria-expanded', 'false');
    activeVowelRow = null;
  }

  function closeVowels() {
    hideVowelVariants();
    vowelPicker.hidden = true;
    vowelToggle.setAttribute('aria-expanded', 'false');
  }

  function positionVowels() {
    if (vowelPicker.hidden) return;
    // Keep the longest left-opening row on screen, including narrow viewports.
    var rect = vowelToggle.getBoundingClientRect();
    vowelPicker.style.left = Math.max(0, 208 - rect.left)+'px';
  }

  function updatePinState() {
    root.classList.toggle('hebleo-keyboard--pinned', pinned);
    pinButton.textContent = pinned ? 'Unpin' : 'Pin';
    pinButton.setAttribute('aria-pressed', String(pinned));
    pinButton.setAttribute('aria-label', pinned ? 'Unpin keyboard' : 'Pin keyboard to keep it open');
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
      if (event.target.closest('.hebleo-keyboard__key')) event.preventDefault();
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

    // Removing the bottom keyboard space can clamp scrollY and move the pressed
    // button before pointerup. Wait until the browser has resolved its click
    // target; that same native event then reaches the button's normal handler.
    document.addEventListener('click', function (event) {
      if (root.contains(event.target) || !isOpen || pinned) return;
      var editable = event.target.closest('input, textarea, [contenteditable=""], [contenteditable="true"]');
      if (!isEditable(editable)) closeKeyboard();
    }, true);

    document.addEventListener('selectionchange', function () {
      if (activeTarget && isContentEditable(activeTarget) && activeTarget.contains(document.activeElement)) {
        saveCurrentRange();
      }

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
      focusTarget(activeTarget);
      insertText(mapped);
    }, true);

    root.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (!vowelPicker.hidden) { closeVowels();vowelToggle.focus(); }
        else closeKeyboard();
      }
    });

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
    window.addEventListener('resize', positionVowels);
    window.addEventListener('orientationchange', positionTarget);
  }

  function setActiveTarget(target) {
    if (!isEditable(target)) {
      return;
    }

    if (activeTarget !== target) {
      clearActiveTargetCue();
      activeTarget = target;
    }

    if (isContentEditable(target)) {
      saveCurrentRange();
    }

    if (isOpen) {
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
      focusTarget(activeTarget);
      positionTarget();
    }

    refreshActiveTargetCue();
    updateStatus();
  }

  function closeKeyboard() {
    isOpen = false;
    closeVowels();
    root.classList.remove('hebleo-keyboard--open');
    document.body.classList.remove(bodyOpenClass);
    launcher.setAttribute('aria-expanded', 'false');
    panel.setAttribute('aria-hidden', 'true');
    clearActiveTargetCue();
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
        pinned=!pinned;updatePinState();changed();break;
      case 'toggle-vowels':
        if (!vowelPicker.hidden) closeVowels();
        else { vowelPicker.hidden=false;vowelToggle.setAttribute('aria-expanded','true');positionVowels(); }
        break;
      case 'toggle-hints':
        showHints = !showHints;
        try {
          window.localStorage.setItem(HINTS_STORAGE_KEY, showHints ? '1' : '0');
        } catch (error) {
          // Local storage may be unavailable in private contexts.
        }
        updateHintState();
        if (activeTarget) {
          focusTarget(activeTarget);
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
          focusTarget(activeTarget);
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
  }

  function insertIntoField(field, text) {
    ensureWritableField(field);

    var value = field.value || '';
    var start = typeof field.selectionStart === 'number' ? field.selectionStart : value.length;
    var end = typeof field.selectionEnd === 'number' ? field.selectionEnd : start;
    var next = value.slice(0, start) + text + value.slice(end);
    var cursor = start + text.length;

    field.value = next;
    focusTarget(field);
    setSelection(field, cursor, cursor);
    dispatchEditEvents(field);
  }

  function insertIntoContentEditable(target, text) {
    focusTarget(target);
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
      focusTarget(activeTarget);
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
  }

  function moveCursor(direction) {
    if (!activeTarget || !isEditable(activeTarget)) {
      return;
    }

    if (isInput(activeTarget) || activeTarget.tagName === 'TEXTAREA') {
      var value = activeTarget.value || '';
      var current = typeof activeTarget.selectionStart === 'number' ? activeTarget.selectionStart : value.length;
      var next = Math.max(0, Math.min(value.length, current + direction));
      focusTarget(activeTarget);
      setSelection(activeTarget, next, next);
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
    }
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

  function focusTarget(target) {
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
        document.body.style.setProperty('--hebleo-keyboard-height', keyboardRect.height+'px');
        fieldRect=activeTarget.getBoundingClientRect();
        if (fieldRect.top >= 12 && fieldRect.bottom <= keyboardRect.top-16) return;
        var desiredTop=Math.max(12,(keyboardRect.top-fieldRect.height)/2);
        var container=activeTarget.closest('dialog');
        if(container)container.scrollBy({top:fieldRect.top-desiredTop,behavior:'instant'});
        else window.scrollBy({top:fieldRect.top-desiredTop,behavior:'instant'});
      } catch (error) {
        activeTarget.scrollIntoView(false);
      }
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
    activeTarget = null;
    savedRange = null;
    updateStatus();
  }

  function refreshActiveTargetCue() {
    clearActiveTargetCue();

    if (!isOpen || !activeTarget || !isEditable(activeTarget)) {
      return;
    }

    activeTarget.classList.add(ACTIVE_TARGET_CLASS);
    activeTarget.setAttribute(ACTIVE_TARGET_ATTR, 'true');
  }

  function clearActiveTargetCue() {
    var current = document.querySelector('[' + ACTIVE_TARGET_ATTR + '="true"]');
    if (current) {
      current.classList.remove(ACTIVE_TARGET_CLASS);
      current.removeAttribute(ACTIVE_TARGET_ATTR);
    }
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
      return !element.disabled && !element.readOnly;
    }

    if (isInput(element)) {
      var type = (element.getAttribute('type') || 'text').toLowerCase();
      return !element.disabled && !element.readOnly && !blockedInputTypes[type];
    }

    return false;
  }

  function isInput(element) {
    return element && element.tagName === 'INPUT';
  }

  function isContentEditable(element) {
    return Boolean(element && element.isContentEditable);
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

  function highlightShades(color) {
    var base = /^#[0-9a-f]{6}$/i.test(color || '') ? color : '#00a9ca';
    var rgb = [1,3,5].map(function (offset) { return parseInt(base.slice(offset,offset+2),16); });
    if (!rgb.some(Boolean)) rgb = [0,169,202];
    var maximum = Math.max.apply(null,rgb);
    function shade(lightness) {
      return '#'+rgb.map(function (channel) { return Math.round(channel*lightness/maximum).toString(16).padStart(2,'0'); }).join('');
    }
    return {known:shade(88),new:shade(205)};
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
      updateHintState();updateConvertState();updatePinState();
      root.querySelectorAll('[data-insert]').forEach(function(key){var letter=key.dataset.insert;key.classList.toggle('known-key',(config.knownKeys||'').includes(letter));key.classList.toggle('new-key',(config.newKeys||'').includes(letter));});
      var shades=highlightShades(config.newColor);root.style.setProperty('--known-key',shades.known);root.style.setProperty('--new-key',shades.new);
      if(isOpen && !activeTarget){var dialog=root.closest('dialog'),answer=dialog?dialog.querySelector('textarea,input:not([disabled]):not([readonly])'):document.getElementById('answer');if(answer&&!answer.disabled&&isEditable(answer)){setActiveTarget(answer);focusTarget(answer);}}
    }
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
