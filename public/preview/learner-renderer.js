import * as referenceMedia from '../media.js';
const {setPlaybackSpeed}=referenceMedia;
const getPlaybackState=()=>referenceMedia.getPlaybackState?.()||{};
import {stepExercises, audioURL, portionExercises, portionLesson} from '../ux.js';
import {keyboardForLesson,resolveComponent} from '../course.js';
import {resolveBlock} from '../content.js';
import {renderLexicalVocabulary,bindLexicalVocabulary} from '../lexical-vocabulary.js';
import {mountAnsweredVocabulary} from '../post-answer-vocabulary.js';
import {hasTextPages,mountTextReader} from '../text-reader.js';
import {textGatesPassed,syncTextContinue,textGateNotice,ownsTextNavigation,extraInformationControl,bindExtraInformation} from '../learner-view.js';
import {textPageMedia} from '../learner-view.js';
import {bindMatching, matchWord} from '../interactions.js';
import {esc, button, wordText, fieldText, cellAttribute, audioControls, syncAudioControls, richFields, wordCard, vocabularyTable, learnMedia, exerciseInput, exerciseSurface, exerciseFeedback, wireAnswer,bindResultExplanations,syncReferenceControls,applyMatchingResult,exerciseActionDock,mountExerciseDock} from '../learner-view.js';

const KEY_ROWS=[
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
const VOWELS=[
      {sound:'a', mark:'ַ', name:'Patah', variants:[['ָ','Qamats'],['ֲ','Hataf patah'],['ֳ','Hataf qamats']]},
      {sound:'e', mark:'ֶ', name:'Segol', variants:[['ֵ','Tsere'],['ֱ','Hataf segol']]},
      {sound:'i', mark:'ִ', name:'Hiriq', variants:[['ִי','Hiriq with yod']]},
      {sound:'o', mark:'ֹ', name:'Holam', variants:[['וֹ','Holam with vav'],['ׂ','Sin dot']]},
      {sound:'u', mark:'ֻ', name:'Qubuts', variants:[['וּ','Shuruk']]}
    ];
const plainText = text => '<p style="white-space:pre-wrap">' + esc(text) + '</p>';
const draftOf = answer => ({
  ...(answer?.sentenceMode!==undefined ? {sentenceMode:answer.sentenceMode==='complex'?'complex':'simple'} : {}),
  text: typeof answer?.text === 'string' ? answer.text : '',
  matching: answer?.matching && typeof answer.matching === 'object' && !Array.isArray(answer.matching) ? Object.fromEntries(Object.entries(answer.matching).filter(([, v]) => typeof v === 'string')) : {},
  selectedTokens: Array.isArray(answer?.selectedTokens) ? answer.selectedTokens.filter(Number.isInteger) : []
});

// Shared learner renderer for disposable draft rehearsal (docs/B2_DRAFT_API_DECISIONS.md §4).
// It renders with the learner's lesson/exercise HTML and answer serialization, and reports
// every change through props.actions. It never fetches, calls the API or touches storage;
// optional browser-only dependencies (lesson Markdown, audio playback) are injected.
// keyScope is the host element whose keys are rehearsal shortcuts (the modal); it defaults to the renderer root.
export function createLearnerRenderer({renderLesson = plainText, playAudio, stopMedia, keyScope, keyboardAdapter} = {}) {
  // Kept across mounts: every controller re-render replaces the root, so the focused control and the
  // last revealed result/entry are carried over instead of dropping focus to the page body.
  let medium = null, mediumKey = null, focusKey = null, shownKey = null;
  const textStates=new Map();
  return {
    mount(container, props) {
      const doc = container.ownerDocument, controller = new doc.defaultView.AbortController(), signal = controller.signal;
      let {content, lessonId, step, componentId, question, exerciseId, result, lookupId, busy, actions} = props;
      const preferences = props.preferences || {};
      const lesson = content.lessons.find(l => l.id === lessonId);
      const presentation=portionLesson(lesson,componentId);
      const keyboard=keyboardForLesson(content,lessonId);
      const context=lessonId+'|'+(componentId||step);if(context!==mediumKey){medium=null;mediumKey=context;}
      const word = id => content.words.find(w => w.id === id);
      const exercise = exerciseId ? content.exercises.find(x => x.id === exerciseId) : null;
      let lexicalBinding,reminderBinding,dockBinding,textBinding,extraBinding;
      const mountText=()=>{
        const host=root.querySelector('[data-text-reader]');if(!host||!hasTextPages(presentation))return;
        textBinding?.destroy();
        textBinding=mountTextReader(host,{textPages:presentation.textPages,renderLesson,word,renderWord:w=>wordCard(w),renderMedia:textPageMedia,dock:step==='learn',onContinue:()=>{if(active()&&!busy&&textGatesPassed(presentation.textPages,textStates.get(context)||{}))return actions.next();},initialState:textStates.get(context),onState:saved=>textStates.set(context,saved),onGateChange:(_ready,saved)=>{textStates.set(context,saved);syncTextContinue(root,textGatesPassed(presentation.textPages,saved));},isCurrent:active});
      };
      let draft = draftOf(props.answer), message = '', conceptOpen = false, answerSelection = null;
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
        if (lookupId && key && key !== shownKey) root.querySelector(lookupId ? '.preview-lookup' : '.answer-result')?.scrollIntoView?.({block:'nearest'});
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
      const ownerKeyboard=keyboardAdapter;
      const keypad=()=>ownerKeyboard
       ? '<div class="keyboard-tools"><button type="button" class="button small secondary" data-preview-owner-keyboard>Open Hebrew keyboard</button>'+'</div>'
       : preferences.keyboardVisible
        ? '<div class="preview-keypad" role="group" aria-label="Full Hebrew teaching keyboard">'+KEY_ROWS.map((row,i)=>'<div class="keyboard-row">'+row.map(k=>'<button type="button" class="key '+(keyboard.newKeys.includes(k.he)?'new-key':keyboard.knownKeys.includes(k.he)?'known-key':'')+'" data-preview-key="'+esc(k.he)+'"><bdi>'+esc(k.he)+'</bdi><small>'+esc(k.en)+'</small></button>').join('')+(i===0?'<button type="button" data-preview-key="" aria-label="Backspace">⌫</button>':'')+'</div>').join('')+'<div class="keyboard-tools"><button data-preview-command="left">←</button><button data-preview-key=" ">Space</button><button data-preview-command="right">→</button><button data-preview-command="enter">↵</button><button data-preview-pref="keyboardPinned" data-preview-value="'+(!preferences.keyboardPinned)+'">'+(preferences.keyboardPinned?'Unpin':'Pin')+'</button><button data-preview-pref="keyboardConvert" data-preview-value="'+(!preferences.keyboardConvert)+'">A→א</button><button data-preview-keyboard="hide">Close keyboard</button></div><details><summary>Nikkud</summary>'+VOWELS.map(g=>[[g.mark,g.name],...g.variants].map(([mark,name])=>'<button data-preview-key="'+esc(mark)+'" aria-label="Insert '+esc(name)+'">'+esc(name)+' · '+esc(mark)+'</button>').join('')).join('')+[['ְ','Sheva'],['ּ','Dagesh'],['ׁ','Right Shin dot']].map(([mark,name])=>'<button data-preview-key="'+esc(mark)+'" aria-label="Insert '+name+'">'+name+'</button>').join('')+'</details></div>'
        : '<div class="keyboard-tools"><button type="button" class="button small secondary" data-preview-keyboard="show">Open Hebrew keyboard</button>'+'</div>';
      const lookupCard = () => {
        const w = lookupId && word(lookupId);
        return w ? '<aside class="card preview-lookup" aria-label="Vocabulary entry"><div class="panel-header"><h3>' + esc(w.english) + '</h3><button type="button" class="button small outline" data-preview-lookup-close>Close</button></div><div class="hebrew">' + wordText(w) + '</div><div class="meaning">' + fieldText(w, 'english', w.english) + '</div>' + audioControls(w.audio, w.english) + (w.notes ? '<p class="note"' + cellAttribute(w, 'notes') + '>' + fieldText(w, 'notes', w.notes) + '</p>' : '') + richFields(w) + '</aside>' : '';
      };
      const note = () => message ? '<p class="hint" role="alert" data-preview-message>' + esc(message) + '</p>' : '';
      const continueRow = () => '<div class="lesson-footer">' + button('Continue →', 'next-step', 'primary').replace('<button','<button data-text-gated-continue') + textGateNotice() + '</div>';
      function learn() {
        const hasText = Boolean(presentation.explanation?.trim())||hasTextPages(presentation), video = Boolean(audioURL(presentation.video)), mode = video && hasText ? (medium || 'watch') : video ? 'watch' : 'read';
        return (video && hasText ? '<div class="mode-bar"><h2>Your explanation</h2><div class="segmented" role="group" aria-label="Lesson format">' + [['watch','Watch'],['read','Read']].map(([v, t]) => '<button type="button" data-preview-medium="' + v + '" aria-pressed="' + (mode === v) + '">' + t + '</button>').join('') + '</div></div>' : '') + learnMedia(presentation, mode, renderLesson) + extraInformationControl(presentation) + (ownsTextNavigation(presentation)?'':continueRow());
      }
      function vocabulary() {
        if(content.lexicalView)return '<h2>Your building blocks</h2>'+renderLexicalVocabulary(content.lexicalView.rows,{idPrefix:'rehearsal-'+lessonId})+continueRow();
        const block = lesson.blocks?.find(b => lesson.compositionVersion===2?b.id===componentId:b.type==='vocabulary'), words = block ? (lesson.compositionVersion===2?resolveComponent(content,lesson,block):resolveBlock(content,lesson,block)).filter(w => !w.noVocab) : [];
        const view = preferences.vocabularyView === 'table' ? 'table' : 'cards', notes = block?.options?.showNotes !== false;
        return '<h2>Your building blocks</h2><div class="mode-bar"><span>' + (view === 'cards' ? 'Fully pointed Hebrew' : 'All source fields') + '</span><div class="segmented" role="group" aria-label="Vocabulary view">' + [['cards','Cards'],['table','Table']].map(([v, t]) => '<button type="button" data-preview-pref="vocabularyView" data-preview-value="' + v + '" aria-pressed="' + (view === v) + '">' + t + '</button>').join('') + '</div></div>' + (view === 'cards' ? '<div class="word-grid">' + words.map(w => wordCard(w, {notes})).join('') + '</div>' : vocabularyTable(words)) + continueRow();
      }
      function practice() {
        const count = portionExercises(content,lesson,componentId||step).length;
        if (!exercise) return '<h2>That portion is finished.</h2>' + continueRow();
        const mode = exercise.nikkudOverride || preferences.nikkud || 'full', allowed = exercise.allowLookup || Boolean(result);
        const lessonWords = content.words.filter(w => lesson.wordIds?.includes(w.id));
        return '<div class="exercise-question-header"><div class="mode-bar"><span class="tag">Question '+(question+1)+' of '+count+'</span>'+(exercise.nikkudOverride?'<span class="tag">Nikkud: '+esc({full:'With Nikkud',none:'Without Nikkud',curated:'Lesson-authored Nikkud'}[exercise.nikkudOverride])+'</span>':'')+'</div>'+button('Review this concept','concept','exercise-quiet').replace('<button','<button data-keyboard-preserve aria-expanded="false" aria-controls="preview-concept"')+'</div><p class="exercise-prompt">'+exerciseSurface(exercise.prompt,'prompt')+'</p><div data-concept-slot></div>'
        +'<div data-exercise-input>'+exerciseInput(exercise,{mode,word,draft,result,keyboard:keypad()})+'</div>'+note()
        +'<div class="answer-result answer-commit" data-answer-commit tabindex="-1" aria-label="Answer result">'+exerciseFeedback(exercise,result)+'</div>'
        +'<div class="exercise-support">'+(result&&!result.correct?button('Try this question again','retry-question','exercise-quiet',exercise.id):'')+(allowed?'<details class="preview-vocabulary-help"><summary>Vocabulary help</summary><p>Hover or select an underlined word to see its vocabulary card.</p>'+lessonWords.map(w=>button(esc(w.pointed)+' · '+esc(w.english),'lookup','small secondary',w.id)).join('')+'</details>':'')+'</div>'
        +exerciseActionDock(busy?button('Checking…','pending-answer','primary','',true):result?button(question+1===count?'Continue →':'Next question →','next-question','primary'):button('Check answer','check','primary').replace('<button','<button data-keyboard-preserve'));

      }
      let mounted = false;
      function render() {
        if (!active()) return;
        extraBinding?.destroy();dockBinding?.destroy();reminderBinding?.destroy();lexicalBinding?.destroy();textBinding?.destroy();
        if (mounted) captureFocus();
        mounted = true;
        const body = !lesson ? '<p>This lesson is not in the draft.</p>'
          : step === 'learn' ? learn()
          : step === 'vocabulary' ? vocabulary()
          : step === 'complete' ? '<div class="empty"><h2>Rehearsal finished.</h2><p>Nothing in this rehearsal was saved to a learner profile.</p><div class="button-row centered">' + button('Exit rehearsal', 'exit', 'primary') + '</div></div>'
          : practice();
        root.innerHTML = settings() + (exercise ? '' : note()) + '<section class="card lesson-section">' + body + '</section>' + lookupCard();
        mountText();extraBinding=bindExtraInformation(root,presentation,renderLesson);syncTextContinue(root,step!=='learn'||textGatesPassed(presentation.textPages,textStates.get(context)||{}));lexicalBinding=bindLexicalVocabulary(root);
        syncAudioControls(root,Number(preferences.audioSpeed)||1,getPlaybackState());bindResultExplanations(root);
        if(exercise&&result&&!busy)reminderBinding=mountAnsweredVocabulary(root,{content,exercise,result,mode:exercise.nikkudOverride||preferences.nikkud||'full',isCurrent:()=>active(),playAudio,stopMedia,getPlaybackState});
        if (busy) { root.setAttribute('aria-busy', 'true'); root.querySelectorAll('button,input,select,textarea').forEach(el => { el.disabled = true; }); }
        if (exercise?.type === 'matching' && !result && !busy) bindMatching(root, (id, meaning) => { if (active()) updateDraft({...draft, matching:matchWord(draft.matching, id, meaning)}); });
        dockBinding=step==='learn'&&textBinding?null:mountExerciseDock(root);
        restoreFocus(); reveal();

        if(ownerKeyboard){ownerKeyboard.mount(container.closest('dialog')||container);ownerKeyboard.sync(keyboard,preferences,'preview|'+lessonId+'|'+(componentId||step)+'|'+question);}
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
        else if(el.hasAttribute('data-preview-owner-keyboard'))ownerKeyboard?.open(root.querySelector('#answer'));
        else if(el.dataset.previewCommand){const input=root.querySelector('#answer');if(input){const caret=input.selectionStart??0;if(el.dataset.previewCommand==='enter')submit();else{input.focus();input.setSelectionRange(Math.max(0,Math.min(input.value.length,caret+(el.dataset.previewCommand==='left'?-1:1))),Math.max(0,Math.min(input.value.length,caret+(el.dataset.previewCommand==='left'?-1:1))));}}}
        else if (el.dataset.previewPref) call('setPreference', el.dataset.previewPref, ['keyboardPinned','keyboardConvert'].includes(el.dataset.previewPref)?el.dataset.previewValue==='true':el.dataset.previewValue);
        else if (el.hasAttribute('data-preview-lookup-close')) call('lookup', null);
        // Answer-building controls hand the keys to the root, so Enter checks rather than re-activating the control.
        else if (action === 'choice') {
          if (result) return;
          updateDraft({...draft, text:value}); keepKeys();
          if (preferences.immediateAnswers) submit();
        }
        else if (action === 'sentence-mode') { if (!result && exercise?.type==='ordering' && ['simple','complex'].includes(value)) updateDraft({...draft, sentenceMode:value}); }
        else if (action === 'token') { if (!result) { updateDraft({...draft, selectedTokens:[...draft.selectedTokens, Number(value)]}); keepKeys(); } }
        else if (action === 'remove-token') { if (!result) { updateDraft({...draft, selectedTokens:draft.selectedTokens.filter((_, i) => i !== Number(value))}); keepKeys(); } }
        else if (action === 'check') submit();
        else if (action === 'self-approve') call('selfApprove');
        else if (action === 'concept' || action === 'concept-close') {
          const input=root.querySelector('#answer'),slot=root.querySelector('[data-concept-slot]'),trigger=root.querySelector('[data-action="concept"]');
          if(action==='concept'){
            if(input)answerSelection={start:input.selectionStart,end:input.selectionEnd};
            if(!conceptOpen)slot.innerHTML='<section class="preview-concept" id="preview-concept"><h3>Review this concept</h3>'+learnMedia(presentation,audioURL(presentation.video)?'watch':'read',renderLesson,exercise.explanationTime)+button('Close concept','concept-close','exercise-quiet')+'</section>';
            mountText();conceptOpen=true;trigger.setAttribute('aria-expanded','true');
            if(input&&!input.disabled){input.focus({preventScroll:true});if(answerSelection)input.setSelectionRange(answerSelection.start,answerSelection.end);}
          }else{textBinding?.destroy();slot.replaceChildren();conceptOpen=false;trigger.setAttribute('aria-expanded','false');trigger.focus({preventScroll:true});}
        }
        else if (action === 'retry-question') call('retry');
        else if (action === 'next-question' || action === 'next-step') {if(action==='next-step'&&step==='learn'&&!textGatesPassed(presentation.textPages,textStates.get(context)||{}))return;call('next');}
        else if (action === 'lookup') call('lookup', value);
        else if (action === 'exit') call('exit');
        else if (action === 'audio' || action === 'audio-replay') { if (value) playAudio?.(value, Number(preferences.audioSpeed) || 1, action === 'audio-replay')?.catch?.(error => { if (active()) show(error.message); }); }
        else if (action === 'inline-choice') {
          const [i, j] = value.split('|').map(Number), item = presentation.interactions[i], box = root.querySelector('#inline-feedback-' + i);
          if (box) box.textContent = (item.correctIndex === j ? 'Correct. ' : 'Try again. ') + item.feedback;
        }
      }, {signal});
      root.addEventListener('input', event => { if (event.target.id === 'answer' && !busy && !result) updateDraft({...draft, text:event.target.value}, false); }, {signal});
      root.addEventListener('change', event => { if(event.target.matches('[data-audio-speed]')&&!busy){const speed=Number(event.target.value);preferences.audioSpeed=speed;call('setPreference','audioSpeed',speed);setPlaybackSpeed(speed);syncAudioControls(root,speed,getPlaybackState());return;} if (event.target.dataset.previewPref && event.target.tagName === 'SELECT') call('setPreference', event.target.dataset.previewPref, event.target.value); }, {signal});
      // Rehearsal keyboard shortcuts stay inside the preview host; defaultPrevented keeps the learner's global handler out.
      (keyScope || root).addEventListener('keydown', event => {
        if (event.target.closest?.('[data-text-reader],[data-vocabulary-card]') || event.defaultPrevented || event.isComposing || event.ctrlKey || event.altKey || event.metaKey || busy) return;
        const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName) || event.target.isContentEditable;
        if (typing) { if (event.target.id === 'answer' && event.key === 'Enter' && !event.shiftKey && !result) { event.preventDefault(); submit(); } return; }
        if ((event.key === 'Enter' || event.key === ' ') && ['BUTTON','A','SUMMARY'].includes(event.target.tagName)) return;
        if (event.key === 'Enter' || event.key === ' ') {
          const el = root.querySelector(result ? '[data-action="next-question"]' : '[data-action="check"]');
          if (el && !el.disabled) { event.preventDefault(); el.click(); keepKeys(); }
        } else if (/^[1-9]$/.test(event.key)) {
          const el = root.querySelectorAll('[data-action="choice"]')[Number(event.key) - 1];
          if (el && !el.disabled) { event.preventDefault(); el.click(); keepKeys(); }
        }
      }, {signal});
      ownerKeyboard?.listen?.(detail=>{for(const [key,value] of Object.entries(detail))if(preferences[key]!==value){call('setPreference',key,value);break;}},signal);
      doc.defaultView.addEventListener('hebleo-reference-state',event=>syncReferenceControls(root,event.detail),{signal});
      render();
      function dispose() {
        if (!active()) return;
        captureFocus();
        extraBinding?.destroy();
        dockBinding?.destroy();
        lexicalBinding?.destroy();
        reminderBinding?.destroy();
        textBinding?.destroy();
        controller.abort();
        stopMedia?.();
        root.remove();
      }
      dispose.update = next => {
        if(!exercise||next.exerciseId!==exerciseId||next.lessonId!==lessonId||next.componentId!==componentId||next.step!==step||next.question!==question||next.lookupId!==lookupId||JSON.stringify(next.preferences)!==JSON.stringify(props.preferences)||result&&!next.result)return false;
        const hadResult=Boolean(result),resultChanged=JSON.stringify(result)!==JSON.stringify(next.result);result=next.result;busy=next.busy;draft=draftOf(next.answer);props=next;
        if(busy)root.setAttribute('aria-busy','true');else root.removeAttribute('aria-busy');
        for(const el of root.querySelectorAll('button,input,select,textarea')){
          if(busy){if(!el.hasAttribute('data-before-pending'))el.dataset.beforePending=String(el.disabled);el.disabled=true;}
          else if(el.hasAttribute('data-before-pending')){el.disabled=el.dataset.beforePending==='true';delete el.dataset.beforePending;}
        }
        root.querySelector('[data-primary-action]').innerHTML=busy?button('Checking…','pending-answer','primary','',true):result?button(question+1===portionExercises(content,lesson,componentId||step).length?'Continue →':'Next question →','next-question','primary'):button('Check answer','check','primary').replace('<button','<button data-keyboard-preserve');
        if(result&&(!hadResult||resultChanged)){
          root.querySelector('[data-answer-commit]').innerHTML=exerciseFeedback(exercise,result);bindResultExplanations(root);
          for(const el of root.querySelectorAll('[data-exercise-input] button,[data-exercise-input] textarea,[data-exercise-input] input'))el.disabled=true;
          applyMatchingResult(root,exercise,result);
          for(const el of root.querySelectorAll('[draggable]'))el.draggable=false;
          root.querySelectorAll('.keyboard-tools,.preview-keypad').forEach(el=>el.remove());
          const support=root.querySelector('.exercise-support');support.innerHTML=(!result.correct?button('Try this question again','retry-question','exercise-quiet',exercise.id):'')+'<details class="preview-vocabulary-help"><summary>Vocabulary help</summary><p>Hover or select an underlined word to see its vocabulary card.</p>'+content.words.filter(w=>lesson.wordIds?.includes(w.id)).map(w=>button(esc(w.pointed)+' · '+esc(w.english),'lookup','small secondary',w.id)).join('')+'</details>';
          reminderBinding=mountAnsweredVocabulary(root,{content,exercise,result,mode:exercise.nikkudOverride||preferences.nikkud||'full',isCurrent:()=>active(),playAudio,stopMedia,getPlaybackState});
          root.querySelector('[data-answer-commit]').focus({preventScroll:true});
          ownerKeyboard?.sync(keyboard,preferences,'preview|'+lessonId+'|'+(componentId||step)+'|'+question);
        }
        if(!busy&&!result){const input=root.querySelector('#answer');input?.focus({preventScroll:true});}
        dockBinding?.refresh?.();return true;
      };
      return dispose;
    }
  };
}
