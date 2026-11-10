import {helpControl,bindPracticeHelp} from './help.js?ver=20261110-spaced-repetition';
// A single full-width item keeps help out of the theme's practice layout tracks.
// Sibling controls survive practice-owned innerHTML changes. No prototype patches.
export function mountWordPressHelp(doc){
 const mounts=[];
 for(const [selector,tutorial] of [['#study-app','flashcards'],['[data-conjugation-host]','conjugation']]){
  const surface=doc.querySelector(selector);if(!surface||surface.querySelector('[data-practice-help]')||surface.previousElementSibling?.hasAttribute('data-wordpress-practice-help'))continue;
  const wrapper=doc.createElement('div');wrapper.dataset.wordpressPracticeLayout=tutorial;surface.before(wrapper);
  const bar=doc.createElement('div');bar.dataset.wordpressPracticeHelp='';bar.innerHTML=helpControl(tutorial);wrapper.append(bar,surface);const help=bindPracticeHelp(bar,{platform:'wordpress'});mounts.push(()=>{help.destroy();wrapper.before(surface);wrapper.remove();});
 }
 return {destroy(){mounts.forEach(dispose=>dispose());}};
}
if(typeof document!=='undefined')mountWordPressHelp(document);
