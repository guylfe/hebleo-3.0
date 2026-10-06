import {stepExercises, audioURL} from '../ux.js';
import {resolveBlock} from '../content.js';
import {bindMatching, matchWord} from '../interactions.js';
import {esc, button, wordText, fieldText, cellAttribute, audioControls, richFields, wordCard, vocabularyTable, learnMedia, exerciseInput, exerciseFeedback, wireAnswer} from '../learner-view.js';

const HEBREW_KEYS = 'קראטוןםפשדגכעיחלךףזסבהנמצתץ'.split('');
const plainText = text => '<p style="white-space:pre-wrap">' + esc(text) + '</p>';
const draftOf = answer => ({
  text: typeof answer?.text === 'string' ? answer.text : '',
  matching: answer?.matching && typeof answer.matching === 'object' && !Array.isArray(answer.matching) ? Object.fromEntries(Object.entries(answer.matching).filter(([, v]) => typeof v === 'string')) : {},
  selectedTokens: Array.isArray(answer?.selectedTokens) ? answer.selectedTokens.filter(Number.isInteger) : []
});

// Shared learner renderer for disposable draft rehearsal (docs/B2_DRAFT_API_DECISIONS.md §4).
// It renders with the learner's lesson/exercise HTML and answer serialization, and reports
// every change through props.actions. It never fetches, calls the API or touches storage;
// optional browser-only dependencies (lesson Markdown, audio playback) are injected.
// keyScope is the host element whose keys are rehearsal shortcuts (the modal); it defaults to the renderer root.
export function createLearnerRenderer({renderLesson = plainText, playAudio, stopMedia, keyScope} = {}) {
  // Kept across mounts: every controller re-render replaces the root, so the focused control and the
  // last revealed result/entry are carried over instead of dropping focus to the page body.
  let medium = null, focusKey = null, shownKey = null;
  return {
    mount(container, props) {
      const doc = container.ownerDocument, controller = new doc.defaultView.AbortController(), signal = controller.signal;
      const {content, lessonId, step, question, exerciseId, result, lookupId, busy, actions} = props;
      const preferences = props.preferences || {};
      const lesson = content.lessons.find(l => l.id === lessonId);
      const word = id => content.words.find(w => w.id === id);
      const exercise = exerciseId ? content.exercises.find(x => x.id === exerciseId) : null;
      let draft = draftOf(props.answer), message = '';
      const root = doc.createElement('div');
      root.className = 'learner-preview';
      root.dataset.previewRoot = '';
      root.tabIndex = -1;
      container.append(root);
      const active = () => !signal.aborted;
      // focusKey names the control to refocus after a re-render ('root' for the rehearsal root, null when focus is elsewhere).
      const quote = value => JSON.stringify(String(value));
      const focusSelector = el => el.id ? '[id=' + quote(el.id) + ']' : Object.keys(el.dataset).length ? el.tagName.toLowerCase() + Object.entries(el.dataset).map(([k, v]) => '[data-' + k.replace(/[A-Z]/g, c => '-' + c.toLowerCase()) + '=' + quote(v) + ']').join('') : 'root';
      const captureFocus = () => { const el = doc.activeElement; focusKey = el === root ? 'root' : root.contains(el) ? focusSelector(el) : null; };
      const restoreFocus = () => {
        if (focusKey === null) return;
        const el = focusKey === 'root' ? root : root.querySelector(focusKey);
        if (el && !el.disabled) el.focus({preventScroll:true});
        if (!root.contains(doc.activeElement)) root.focus({preventScroll:true});
      };
      // A newly shown result (with its retry/next controls) or vocabulary entry is scrolled into the host's visible area.
      const reveal = () => {
        const key = lookupId ? 'lookup:' + lookupId : result ? 'result:' + exerciseId : null;
        if (key && key !== shownKey) root.querySelector(lookupId ? '.preview-lookup' : '.exercise-footer')?.scrollIntoView?.({block:'nearest'});
        shownKey = key;
      };
      // After a shortcut activates a control the root keeps the keys, as the page body does for the learner app.
      const keepKeys = () => { if (active()) { focusKey = 'root'; root.focus({preventScroll:true}); } };
      const call = (name, ...args) => {
        if (!active() || busy) return;
        try {
          const pending = actions[name](...args);
          pending?.catch?.(error => { if (active()) show(error.message); });
        } catch (error) { if (active()) show(error.message); }
      };
      const show = text => { message = text; render(); };
      const updateDraft = (next, rerender = true) => { draft = next; message = ''; call('setAnswer', structuredClone(draft)); if (rerender && active()) render(); };
      const settings = () => '<div class="mode-bar preview-settings" role="group" aria-label="Rehearsal settings (not saved)"><label for="preview-nikkud">Exercise Nikkud</label><select id="preview-nikkud" data-preview-pref="nikkud">' + [['curated','Lesson-authored Nikkud'],['full','With Nikkud'],['none','Without Nikkud']].map(([v, t]) => '<option value="' + v + '"' + ((preferences.nikkud || 'full') === v ? ' selected' : '') + '>' + t + '</option>').join('') + '</select><small>Rehearsal settings are temporary.</small></div>';
      const keypad = () => preferences.keyboardVisible
        ? '<div class="preview-keypad" role="group" aria-label="Hebrew keyboard">' + HEBREW_KEYS.map(k => '<button type="button" class="key" data-preview-key="' + k + '">' + k + '</button>').join('') + '<button type="button" class="key" data-preview-key=" ">Space</button><button type="button" class="key" data-preview-key="" aria-label="Backspace">⌫</button><button type="button" class="button small outline" data-preview-keyboard="hide">Hide keyboard</button></div>'
        : '<div class="keyboard-tools"><button type="button" class="button small secondary" data-preview-keyboard="show">Open Hebrew keyboard</button><small>Rehearsal keyboard · not saved</small></div>';
      const lookupCard = () => {
        const w = lookupId && word(lookupId);
        return w ? '<aside class="card preview-lookup" aria-label="Vocabulary entry"><div class="panel-header"><h3>' + esc(w.english) + '</h3><button type="button" class="button small outline" data-preview-lookup-close>Close</button></div><div class="hebrew">' + wordText(w) + '</div><div class="meaning">' + fieldText(w, 'english', w.english) + '</div>' + audioControls(w.audio, w.english) + (w.notes ? '<p class="note"' + cellAttribute(w, 'notes') + '>' + fieldText(w, 'notes', w.notes) + '</p>' : '') + richFields(w) + '</aside>' : '';
      };
      const note = () => message ? '<p class="hint" role="alert" data-preview-message>' + esc(message) + '</p>' : '';
      const continueRow = () => '<div class="lesson-footer">' + button('Continue →', 'next-step', 'primary') + '</div>';
      function learn() {
        const hasText = Boolean(lesson.explanation?.trim()), video = Boolean(audioURL(lesson.video)), mode = video && hasText ? (medium || 'watch') : video ? 'watch' : 'read';
        return (video && hasText ? '<div class="mode-bar"><h2>Your explanation</h2><div class="segmented" role="group" aria-label="Lesson format">' + [['watch','Watch'],['read','Read']].map(([v, t]) => '<button type="button" data-preview-medium="' + v + '" aria-pressed="' + (mode === v) + '">' + t + '</button>').join('') + '</div></div>' : '') + learnMedia(lesson, mode, renderLesson) + continueRow();
      }
      function vocabulary() {
        const block = lesson.blocks?.find(b => b.type === 'vocabulary'), words = block ? resolveBlock(content, lesson, block).filter(w => !w.noVocab) : [];
        const view = preferences.vocabularyView === 'table' ? 'table' : 'cards', notes = block?.options?.showNotes !== false;
        return '<h2>Your building blocks</h2><div class="mode-bar"><span>' + (view === 'cards' ? 'Fully pointed Hebrew' : 'All source fields') + '</span><div class="segmented" role="group" aria-label="Vocabulary view">' + [['cards','Cards'],['table','Table']].map(([v, t]) => '<button type="button" data-preview-pref="vocabularyView" data-preview-value="' + v + '" aria-pressed="' + (view === v) + '">' + t + '</button>').join('') + '</div></div>' + (view === 'cards' ? '<div class="word-grid">' + words.map(w => wordCard(w, {notes})).join('') + '</div>' : vocabularyTable(words)) + continueRow();
      }
      function practice() {
        const count = stepExercises(lesson, step, []).length;
        if (!exercise) return '<h2>That portion is finished.</h2>' + continueRow();
        const mode = exercise.nikkudOverride || preferences.nikkud || 'full', allowed = exercise.allowLookup || Boolean(result);
        const lessonWords = content.words.filter(w => lesson.wordIds?.includes(w.id));
        return '<div class="mode-bar"><span class="tag">Question ' + (question + 1) + ' of ' + count + '</span>' + (exercise.nikkudOverride ? '<span class="tag">Nikkud: ' + esc({full:'With Nikkud', none:'Without Nikkud', curated:'Lesson-authored Nikkud'}[exercise.nikkudOverride]) + '</span>' : '') + '</div><p class="exercise-prompt">' + esc(exercise.prompt) + '</p>'
          + exerciseInput(exercise, {mode, word, draft, result, keyboard:keypad()})
          + note()
          + exerciseFeedback(exercise, result)
          + '<div class="exercise-footer">' + (result ? button(question + 1 === count ? 'Continue →' : 'Next question →', 'next-question', 'primary') : button('Check answer', 'check', 'primary'))
          + '<div class="toolbar">' + (result && !result.correct ? button('Try this question again', 'retry-question', 'small secondary', exercise.id) : '')
          + (allowed ? '<details class="preview-vocabulary-help"><summary>Vocabulary help</summary>' + lessonWords.map(w => button(esc(w.pointed) + ' · ' + esc(w.english), 'lookup', 'small secondary', w.id)).join('') + '</details>' : '') + '</div></div>';
      }
      let mounted = false;
      function render() {
        if (!active()) return;
        if (mounted) captureFocus();
        mounted = true;
        const body = !lesson ? '<p>This lesson is not in the draft.</p>'
          : step === 'learn' ? learn()
          : step === 'vocabulary' ? vocabulary()
          : step === 'complete' ? '<div class="empty"><h2>Rehearsal finished.</h2><p>Nothing in this rehearsal was saved to a learner profile.</p><div class="button-row centered">' + button('Exit rehearsal', 'exit', 'primary') + '</div></div>'
          : practice();
        root.innerHTML = settings() + (exercise ? '' : note()) + '<section class="card lesson-section">' + body + '</section>' + lookupCard();
        if (busy) { root.setAttribute('aria-busy', 'true'); root.querySelectorAll('button,input,select').forEach(el => { el.disabled = true; }); }
        if (exercise?.type === 'matching' && !result && !busy) bindMatching(root, (id, meaning) => { if (active()) updateDraft({...draft, matching:matchWord(draft.matching, id, meaning)}); });
        restoreFocus(); reveal();
      }
      function submit() {
        if (!exercise || result) return;
        const wire = wireAnswer(exercise, draft);
        if (wire.error) { show(wire.error); return; }
        call('setAnswer', structuredClone(draft));
        call('submit', wire.answer);
      }
      function insertKey(value) {
        const input = root.querySelector('#answer');
        if (!input || result) return;
        let start = input.selectionStart ?? input.value.length, end = input.selectionEnd ?? start;
        if (!value && start === end) start = Math.max(0, start - 1);
        const text = input.value.slice(0, start) + value + input.value.slice(end), caret = start + value.length;
        updateDraft({...draft, text});
        const next = root.querySelector('#answer');
        next?.focus(); next?.setSelectionRange(caret, caret);
      }
      root.addEventListener('click', event => {
        if (busy) return;
        const el = event.target.closest('button');
        if (!el || el.disabled || !root.contains(el)) return;
        const {action, value} = el.dataset;
        if (el.dataset.previewKey !== undefined) insertKey(el.dataset.previewKey);
        else if (el.dataset.previewKeyboard) call('setPreference', 'keyboardVisible', el.dataset.previewKeyboard === 'show');
        else if (el.dataset.previewMedium) { medium = el.dataset.previewMedium; render(); }
        else if (el.dataset.previewPref) call('setPreference', el.dataset.previewPref, el.dataset.previewValue);
        else if (el.hasAttribute('data-preview-lookup-close')) call('lookup', null);
        // Answer-building controls hand the keys to the root, so Enter checks rather than re-activating the control.
        else if (action === 'choice') {
          if (result) return;
          updateDraft({...draft, text:value}); keepKeys();
          if (preferences.immediateAnswers) submit();
        }
        else if (action === 'token') { if (!result) { updateDraft({...draft, selectedTokens:[...draft.selectedTokens, Number(value)]}); keepKeys(); } }
        else if (action === 'remove-token') { if (!result) { updateDraft({...draft, selectedTokens:draft.selectedTokens.filter((_, i) => i !== Number(value))}); keepKeys(); } }
        else if (action === 'check') submit();
        else if (action === 'retry-question') call('retry');
        else if (action === 'next-question' || action === 'next-step') call('next');
        else if (action === 'lookup') call('lookup', value);
        else if (action === 'exit') call('exit');
        else if (action === 'audio' || action === 'audio-replay') { if (value) playAudio?.(value, Number(preferences.audioSpeed) || 1, action === 'audio-replay')?.catch?.(error => { if (active()) show(error.message); }); }
        else if (action === 'inline-choice') {
          const [i, j] = value.split('|').map(Number), item = lesson.interactions[i], box = root.querySelector('#inline-feedback-' + i);
          if (box) box.textContent = (item.correctIndex === j ? 'Correct. ' : 'Try again. ') + item.feedback;
        }
      }, {signal});
      root.addEventListener('input', event => { if (event.target.id === 'answer' && !busy && !result) updateDraft({...draft, text:event.target.value}, false); }, {signal});
      root.addEventListener('change', event => { if (event.target.dataset.previewPref && event.target.tagName === 'SELECT') call('setPreference', event.target.dataset.previewPref, event.target.value); }, {signal});
      // Rehearsal keyboard shortcuts stay inside the preview host; defaultPrevented keeps the learner's global handler out.
      (keyScope || root).addEventListener('keydown', event => {
        if (event.defaultPrevented || event.isComposing || event.ctrlKey || event.altKey || event.metaKey || busy) return;
        const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName) || event.target.isContentEditable;
        if (typing) { if (event.target.id === 'answer' && event.key === 'Enter' && !result) { event.preventDefault(); submit(); } return; }
        if ((event.key === 'Enter' || event.key === ' ') && ['BUTTON','A','SUMMARY'].includes(event.target.tagName)) return;
        if (event.key === 'Enter' || event.key === ' ') {
          const el = root.querySelector('[data-action="next-question"],[data-action="check"]');
          if (el && !el.disabled) { event.preventDefault(); el.click(); keepKeys(); }
        } else if (/^[1-9]$/.test(event.key)) {
          const el = root.querySelectorAll('[data-action="choice"]')[Number(event.key) - 1];
          if (el && !el.disabled) { event.preventDefault(); el.click(); keepKeys(); }
        }
      }, {signal});
      render();
      return function dispose() {
        if (!active()) return;
        captureFocus();
        controller.abort();
        stopMedia?.();
        root.remove();
      };
    }
  };
}
