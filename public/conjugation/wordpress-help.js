import {helpControl,bindPracticeHelp} from './help.js';
// Sibling controls survive practice-owned innerHTML changes. No prototype patches.
export function mountWordPressHelp(doc){
 const mounts=[];
 for(const [selector,tutorial] of [['#study-app','flashcards'],['[data-conjugation-host]','conjugation']]){
  const surface=doc.querySelector(selector);if(!surface||surface.querySelector('[data-practice-help]')||surface.previousElementSibling?.hasAttribute('data-wordpress-practice-help'))continue;
  const bar=doc.createElement('div');bar.dataset.wordpressPracticeHelp='';bar.innerHTML=helpControl(tutorial);surface.before(bar);const help=bindPracticeHelp(bar,{platform:'wordpress'});mounts.push(()=>{help.destroy();bar.remove();});
 }
 return {destroy(){mounts.forEach(dispose=>dispose());}};
}
if(typeof document!=='undefined')mountWordPressHelp(document);
