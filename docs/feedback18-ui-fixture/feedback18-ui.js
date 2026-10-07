import {mountVocabularyBrowser,mountWordSelector,mountTagSelector} from '/studio/vocabulary-browser.js';
import {mountMarkdownEditor} from '/studio/markdown-editor.js';
import {mountExerciseEditor} from '/studio/exercise-editor.js';
const {content,words,lessons}=await (await fetch('/fixture-content')).json();
const byId=id=>document.getElementById(id),selected=byId('selected');
const handles=[];
handles.push(mountVocabularyBrowser(byId('words'),{words,lessons}));
handles.push(mountWordSelector(byId('selection'),{words,lessons,selectedIds:[words[7].id,words[1].id],onSelectionChange:ids=>selected.textContent=JSON.stringify(ids)}));
handles.push(mountTagSelector(byId('tags'),{tags:[...new Set(words.flatMap(w=>w.tags))]}));
const markdown=mountMarkdownEditor(byId('markdown'),{value:content.lessons[1].explanation,direction:'rtl'});
const second=mountMarkdownEditor(byId('markdown-two'),{value:content.lessons[0].explanation,direction:'auto'});
handles.push(markdown,second);
handles.push({dispose:mountExerciseEditor(byId('exercise'),{content,exerciseId:content.exercises[1].id,baseRevisionId:1,saveDraft:async body=>{
  const response=await fetch('/api/studio/draft',{method:'POST',headers:{'Content-Type':'application/json','X-Demo-User':'author-demo'},body:JSON.stringify(body)}),result=await response.json();
  if(!response.ok)throw Object.assign(new Error(result.error),result,{status:response.status});return result;
}})});
await Promise.all([markdown.ready,second.ready]);
byId('fixture-status').textContent=markdown.editor&&second.editor?'Local widgets ready. Two independent Markdown instances.':'Editor loading failed; textarea fallback is active.';
window.addEventListener('pagehide',()=>handles.forEach(handle=>handle.dispose()),{once:true});
