import {openReadOnlyDialog} from './read-only-dialog.js';
export const spacedRepetitionIntroduction=[
 'Spaced repetition means reviewing what you learn over time, with longer gaps as it becomes easier to remember. Cards you find difficult return sooner; cards you remember well return later.',
 "Spacing out reviews helps you remember vocabulary for longer and focus your study time on words that need more practice. Try to recall each answer before revealing it, then rate how well you remembered. Your rating helps set the card's next review.",
 'Come back regularly and work through the cards due for review. Short, regular sessions help you keep up as you add new words.'
];
export const tutorials={
 flashcards:{title:'How to use flashcards',common:spacedRepetitionIntroduction,native:[
 'Choose how many cards to practice and how you want them presented, then choose **Start review**.',
 'Try to recall each answer before choosing **Show answer**.',
 "**Again:** I didn't remember. **Hard:** I remembered, but it took effort. **Good:** I remembered. **Easy:** I remembered immediately. Your choice sets when you'll see the card again.",
 "Choose **Finish session** when you're ready to stop.",
 'Chose the wrong rating? Use **Undo last rating** to correct your latest choice.'
 ],wordpress:[
 "**NEW** is how many new cards you can study today. **Total remaining** counts all new cards still to learn, including today's cards. **LEARNING** and **REVIEW** show cards you're returning to.",
 'Choose **Study** to begin. Try to recall each answer before choosing **Show answer**.',
 "**Again:** I didn't remember. **Hard:** I remembered, but it took effort. **Good:** I remembered. **Easy:** I remembered immediately. Your choice sets when you'll see the card again.",
 "Choose **Back to Decks** when you're ready to stop."
 ]},
 conjugation:{title:'How to use conjugation practice',common:[
 'Choose **Verbs** or **Prepositions**, then select the words you want to practice.',
 'Select the forms you want to practice. Use **More filters** to focus on a person, gender or number.',
 'Practice producing the Hebrew form or recognising its English meaning. Then choose **Start practice**.',
 'Use **Choose** to pick an answer, or **Write** to type one and check it. Turn on **Nikkud** when you want vowel marks.',
 "Stuck? Choose **Show answer**, then **I got it right** or **I missed it**. If a typed answer was marked wrong but you know it's valid, choose **Mark as correct**. Missed forms return for another try."
 ],native:['**Learned only** practices forms unlocked by completed lessons. Choose **All** to practice ahead.'],wordpress:[]}
};
const format=text=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
export function tutorialHTML(tutorial,platform){const copy=tutorials[tutorial];if(!copy||!['native','wordpress'].includes(platform))throw Error('Unknown tutorial or platform');const steps=tutorial==='conjugation'?copy.common:copy[platform];return (tutorial==='flashcards'?copy.common.map(text=>'<p>'+format(text)+'</p>').join(''):'')+'<ol>'+steps.map(text=>'<li>'+format(text)+'</li>').join('')+'</ol>'+(tutorial==='conjugation'?copy[platform].map(text=>'<p>'+format(text)+'</p>').join(''):'');}
export const helpControl=tutorial=>'<button type="button" class="button small outline" data-practice-help="'+tutorial+'">How to practice</button>';
export function bindPracticeHelp(root,{platform='native'}={}) {
 let modal;
 function click(event){const trigger=event.target.closest('[data-practice-help]');if(!trigger||!root.contains(trigger))return;event.preventDefault();event.stopPropagation();if(modal?.dialog.isConnected)return;const tutorial=trigger.dataset.practiceHelp;modal=openReadOnlyDialog({document:root.ownerDocument,trigger,title:tutorials[tutorial].title,html:tutorialHTML(tutorial,platform),className:'practice-help'});const done=modal.dialog.querySelector('[data-extra-close]');done.textContent='Done';done.setAttribute('aria-label','Done');}
 root.addEventListener('click',click);
 return {destroy(){root.removeEventListener('click',click);modal?.close();}};
}
