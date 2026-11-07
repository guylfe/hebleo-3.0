import {openReadOnlyDialog} from './read-only-dialog.js';
export const tutorials={
 flashcards:{title:'How to use flashcards',common:[
 'Try to recall the answer before choosing Show answer.',
 'After revealing the answer, rate your recall: Again if you missed it, Hard if it was difficult, Good if you recalled it, or Easy if it was effortless. Your rating schedules the card’s next review.'
 ],native:['Before starting, choose the session size and card presentation. Listening and sentence presentations depend on available source material.','Add words to review from lessons or My Hebrew. Use Undo last rating to correct your latest rating. Finish session returns to the overview.'],wordpress:['Flashcards are independent practice. On Study Decks, choose Study beside a deck. If No cards due appears, return when cards are next due.']},
 conjugation:{title:'How to use conjugation practice',common:[
 'Select Verbs or Prepositions, choose words and forms, and use More filters to narrow the selection. Choose a direction, then Start practice.',
 'Choose selects an answer. Write lets you type and Check answer; Nikkud is optional. You can switch modes and show or hide Nikkud.',
 'Show answer lets you compare, then choose I got it right or I missed it. After an incorrect written answer, Mark as correct lets you accept your own answer.',
 'Missed forms return after the remaining forms in each pass. Change selection returns to setup. Conjugation practice leaves your flashcard schedule unchanged.'
 ],native:['Learned only includes the forms lesson authors unlock when you complete their lessons. Choose All to practice ahead. Practice does not complete lessons.'],wordpress:['Conjugation is independent practice; choose from the available forms.']}
};
export function tutorialHTML(tutorial,platform){const copy=tutorials[tutorial];if(!copy||!['native','wordpress'].includes(platform))throw Error('Unknown tutorial or platform');return '<ul>'+[...copy[platform],...copy.common].map(text=>'<li>'+text+'</li>').join('')+'</ul>';}
export const helpControl=tutorial=>'<button type="button" class="button small outline" data-practice-help="'+tutorial+'">How to practice</button>';
export function bindPracticeHelp(root,{platform='native'}={}) {
 let modal;
 function click(event){const trigger=event.target.closest('[data-practice-help]');if(!trigger||!root.contains(trigger))return;event.preventDefault();event.stopPropagation();if(modal?.dialog.isConnected)return;const tutorial=trigger.dataset.practiceHelp;modal=openReadOnlyDialog({document:root.ownerDocument,trigger,title:tutorials[tutorial].title,html:tutorialHTML(tutorial,platform),className:'practice-help'});}
 root.addEventListener('click',click);
 return {destroy(){root.removeEventListener('click',click);modal?.close();}};
}
