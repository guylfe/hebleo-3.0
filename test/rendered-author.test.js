import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {marked} from 'marked';
import purify from 'dompurify';
import {createLessonRenderer} from '../public/rich.js';
import {mountRenderedSource} from '../public/author/rendered-source.js';
import {mountInlineAuthor} from '../public/author/inline-author.js';
import {createStudioWorkspace} from '../public/studio/workspace.js';
import {Store} from '../src/store.js';
import {createServer} from '../src/server.js';
import {replaceFirstTwo} from '../scripts/install-first2.mjs';
import {mountExerciseDock} from '../public/exercise-actions.js';
import {mountTextReader} from '../public/text-reader.js';
const source='<p class="authored" data-original="keep" style="color:navy">A <strong>bold 😀 שָׁלוֹם</strong> sentence &amp; exact.</p>\r\n\r\n<!-- untouched comment -->\r\n## Markdown **heading**\r\n\r\nA **mixed** paragraph.\r\n\r\n- **First** item\r\n- Second item\r\n\r\n<ol start="3"><li><em>HTML</em> item</li><li data-original="bytes">Untouched &nbsp; sibling</li></ol>\r\n';
const pack=JSON.parse(readFileSync(new URL('../content/first2/lessons.json',import.meta.url)));
const tick=()=>new Promise(r=>setTimeout(r,5));
async function until(fn){for(let i=0;i<300;i++){if(fn())return;await tick();}throw Error('Did not settle');}
const input=(w,node,value)=>{if(node.hasAttribute('contenteditable'))node.textContent=value;else node.value=value;node.dispatchEvent(new w.Event('input',{bubbles:true}));};
function dom(t){const d=new JSDOM('<main></main>',{pretendToBeVisual:true});t.after(()=>d.window.close());return {w:d.window,doc:d.window.document,host:d.window.document.querySelector('main'),renderLesson:createLessonRenderer(marked,purify(d.window),d.window.document)};}
function select(w,node,start,end){const range=w.document.createRange();range.setStart(node,start);range.setEnd(node,end);w.getSelection().removeAllRanges();w.getSelection().addRange(range);}

test('rendered mixed-source edits patch only chosen leaf ranges; unchanged HTML attributes, rich runs, CRLF, Markdown and sibling bytes survive',async t=>{
 const {w,host,renderLesson}=dom(t);host.innerHTML=renderLesson(source);let value=source;
 const ui=mountRenderedSource(host,{source,renderLesson,dependencies:{marked},onChange:v=>value=v});t.after(()=>ui.dispose());await ui.ready;
 assert.equal(host.querySelectorAll('[contenteditable=true]').length,7);
 const sentence=host.querySelector('p'),tail=sentence.lastChild;tail.textContent=tail.textContent.replace('sentence','revised sentence');sentence.dispatchEvent(new w.Event('input',{bubbles:true}));
 assert.equal(value,source.replace(' sentence &amp;',' revised sentence &amp;'),'text-only editing keeps even sanitized-away source style/data attributes');
 const heading=host.querySelector('h2');input(w,heading,'Updated heading');
 const markdownParagraph=[...host.querySelectorAll('p')][1];markdownParagraph.lastChild.textContent=' revised paragraph.';markdownParagraph.dispatchEvent(new w.Event('input',{bubbles:true}));
 const items=host.querySelectorAll('li');items[0].lastChild.textContent=' revised item';items[0].dispatchEvent(new w.Event('input',{bubbles:true}));
 assert.ok(value.startsWith(source.slice(0,source.indexOf('sentence'))+'revised '+source.slice(source.indexOf('sentence'),source.indexOf('## Markdown'))));
 assert.ok(value.includes('<!-- untouched comment -->\r\n'));
 assert.ok(value.includes('<strong>mixed</strong> revised paragraph.'));
 assert.ok(value.includes('- <strong>First</strong> revised item\r\n- Second item\r\n'));
 assert.ok(value.endsWith('<ol start="3"><li><em>HTML</em> item</li><li data-original="bytes">Untouched &nbsp; sibling</li></ol>\r\n'));
 items[2].lastChild.textContent=' revised HTML item';items[2].dispatchEvent(new w.Event('input',{bubbles:true}));
 assert.ok(value.endsWith('<ol start="3"><li><em>HTML</em> revised HTML item</li><li data-original="bytes">Untouched &nbsp; sibling</li></ol>\r\n'));
 const rendered=renderLesson(value);assert.match(rendered,/<h2[^>]*>Updated heading<\/h2>/);assert.match(rendered,/<strong>First<\/strong> revised item/);assert.match(rendered,/<ol start="3">/);
});

test('contextual formatting stays within a selected leaf; paste is plain text; IME commits once and locked controls cannot modify source',async t=>{
 const {w,doc,host,renderLesson}=dom(t);const original='<p>Selected words here.</p>\n\nUnchanged **Markdown**.\n';host.innerHTML=renderLesson(original);let values=[];
 const ui=mountRenderedSource(host,{source:original,renderLesson,dependencies:{marked},onChange:v=>values.push(v)});t.after(()=>ui.dispose());await ui.ready;
 const p=host.querySelector('p');p.focus();select(w,p.firstChild,0,8);p.dispatchEvent(new w.Event('keyup',{bubbles:true}));doc.querySelector('[data-format=bold]').click();
 assert.match(values.at(-1),/^<p><strong>Selected<\/strong> words here.<\/p>/);assert.ok(values.at(-1).endsWith('Unchanged **Markdown**.\n'));
 const before=values.length;p.dispatchEvent(new w.Event('compositionstart',{bubbles:true}));p.lastChild.textContent=' מילים כאן.';p.dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(values.length,before);p.dispatchEvent(new w.Event('compositionend',{bubbles:true}));assert.equal(values.length,before+1);
 select(w,p.lastChild,1,6);const paste=new w.Event('paste',{bubbles:true,cancelable:true});Object.defineProperty(paste,'clipboardData',{value:{getData:()=>'<img onerror=bad>plain'}});p.dispatchEvent(paste);assert.equal(p.querySelector('img'),null);assert.match(values.at(-1),/&lt;img onerror=bad&gt;plain/);
 ui.setLocked(true);const held=values.at(-1);input(w,p,'forbidden while saving');assert.equal(values.at(-1),held);assert.equal(p.getAttribute('contenteditable'),'false');
});

test('format toolbar keeps its flow space on blur against the real reader hidden rule, preserving a pending pointer click',async t=>{
 const {w,doc,host,renderLesson}=dom(t);host.className='inline-author';const reader=doc.createElement('div');reader.className='text-reader';const projection=doc.createElement('div');reader.append(projection);host.append(reader);
 for(const path of ['refinement.css','author/author.css']){const style=doc.createElement('style');style.textContent=readFileSync(new URL('../public/'+path,import.meta.url),'utf8');doc.head.append(style);}
 projection.innerHTML=renderLesson('<p>Click once after typing.</p>');const ui=mountRenderedSource(projection,{source:'<p>Click once after typing.</p>',renderLesson,dependencies:{marked},onChange:()=>{}});t.after(()=>ui.dispose());await ui.ready;
 const toolbar=host.querySelector('.author-context-tools'),p=projection.querySelector('p');p.focus();const display=w.getComputedStyle(toolbar).display;assert.equal(display,'flex');p.blur();await tick();assert.equal(toolbar.hidden,true);assert.equal(w.getComputedStyle(toolbar).display,display);assert.equal(w.getComputedStyle(toolbar).visibility,'hidden');
});

async function author(t,{failStatus=0,pending=false}={}){
 const {w,doc,host,renderLesson}=dom(t),s=new Store();const cleaned=structuredClone(pack);for(const l of cleaned.lessons)for(const p of l.blocks[0].textPages.pages){if(p.activity)delete p.activity.image;for(const i of p.activity?.items||[])delete i.image;}
 const c=replaceFirstTwo(s.snapshot(),cleaned).content,l=c.lessons[0],b=l.blocks[0],p=b.textPages.pages[0];p.html=source;p.unknown={preserve:[null,'exact']};s.set('active',s.addRevision(c,'Synthetic rendered-author fixture'));
 const server=createServer(s);await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(async()=>{ui.dispose();await new Promise(r=>server.close(r));s.close();});
 const api=async(path,body,user='author-demo')=>{const response=await fetch('http://127.0.0.1:'+server.address().port+'/api/'+path,{method:body?'POST':'GET',headers:{'x-demo-user':user,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const value=await response.json();if(!response.ok)throw Object.assign(Error(value.error),{status:response.status});return value;};
 let release;const workspace=createStudioWorkspace({content:c,baseRevisionId:s.get('active'),saveDraft:async i=>{if(failStatus)throw Object.assign(Error('Synthetic failure'),{status:failStatus});if(pending)await new Promise(r=>release=r);return api('studio/draft',i);}}),state={},calls=[];
 workspace.registerCollector(()=>{const next=workspace.peekContent();next.words[0].notes='Synthetic sibling';workspace.replace(next,{changed:false});});
 const ui=mountInlineAuthor(host,{workspace,lessonId:l.id,componentId:b.id,pageId:p.id,state,api,renderLesson,markdownDependencies:{marked},onPreview:async id=>calls.push(await api('studio/preview/session',{lessonId:id,draftToken:workspace.expectedDraftToken})),onApply:()=>calls.push('Review changes')});
 await until(()=>host.querySelectorAll('[data-author-block]').length===7);return {w,doc,host,s,ui,state,workspace,api,calls,p,release:()=>release?.()};
}
test('rendered heading/sentence save through full draft/CAS; saved Preview reads exact rich source; quote and whole-block notes are readable, persistent and learner-excluded',async t=>{
 const a=await author(t),{w,host,workspace,s,p,api,state,calls}=a,revision=s.get('active'),learners=s.backup().learners;
 assert.equal(host.querySelector('[data-author-advanced]').open,false);assert.equal(host.querySelector('[data-author-action=save]').classList.contains('primary'),true);assert.equal(host.querySelector('[data-author-action=apply]').textContent,'Review changes');
 input(w,host.querySelector('[data-author-field=title]'),'Synthetic edited heading');const sentence=host.querySelector('[data-author-projection] p');sentence.lastChild.textContent=' saved sentence & exact.';sentence.dispatchEvent(new w.Event('input',{bubbles:true}));
 assert.equal(host.querySelector('[data-author-action=preview]').disabled,true);assert.equal(workspace.dirty,true);await a.ui.save();assert.deepEqual(state.raw,{});
 const saved=s.currentDraft().content,edited=saved.lessons[0].blocks[0].textPages.pages[0];assert.equal(edited.title,'Synthetic edited heading');assert.equal(edited.html,source.replace(' sentence &amp; exact.',' saved sentence &amp; exact.'));assert.deepEqual(edited.unknown,p.unknown);assert.equal(saved.words[0].notes,'Synthetic sibling');assert.equal(s.get('active'),revision);
 host.querySelector('[data-author-action=preview]').click();await until(()=>calls.length===1);assert.equal(calls[0].content.lessons[0].blocks[0].textPages.pages[0].html,edited.html);assert.match(a.ui.getState().commentBody,/^$/);
 const strong=host.querySelector('[data-author-projection] strong');select(w,strong.firstChild,0,5);strong.dispatchEvent(new w.Event('pointerup',{bubbles:true}));host.querySelector('[data-author-action=comment]').click();await until(()=>state.pendingSelection);assert.equal(state.pendingSelection.exact,'bold ');assert.match(host.querySelector('[data-author-anchor]').textContent,/Selected quote: “bold ”/);
 input(w,host.querySelector('[data-author-body]'),'Synthetic quote note');host.querySelector('form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await until(()=>s.authorReview.state().comments.length===1&&!state.commentBody);
 w.getSelection().removeAllRanges();sentence.dispatchEvent(new w.Event('pointerup',{bubbles:true}));host.querySelector('[data-author-action=comment]').click();await until(()=>host.querySelector('[data-author-anchor]').textContent.startsWith('Whole block:'));assert.match(host.querySelector('[data-author-anchor]').textContent,/saved sentence/);input(w,host.querySelector('[data-author-body]'),'Synthetic whole-block note');host.querySelector('form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await until(()=>s.authorReview.state().comments.length===2);
 assert.equal((await api('studio/author-comments?lessonId=MEMORY-A2')).comments.length,2);for(const user of ['learner-demo','learner-core']){assert.equal(JSON.stringify(s.bootstrap(user)).includes('Synthetic quote note'),false);await assert.rejects(api('studio/author-comments?lessonId=MEMORY-A2',null,user),e=>e.status===403);}
 host.querySelector('[data-author-action=apply]').click();await until(()=>calls.includes('Review changes'));assert.equal(s.get('active'),revision);assert.deepEqual(s.backup().learners,learners);
});
for(const status of [400,403,409,503])test('rendered edits and unsent comment survive failed save '+status,async t=>{
 const a=await author(t,{failStatus:status});input(a.w,a.host.querySelector('[data-author-field=title]'),'Retain heading '+status);const sentence=a.host.querySelector('[data-author-projection] p');sentence.lastChild.textContent=' Retain sentence.';sentence.dispatchEvent(new a.w.Event('input',{bubbles:true}));input(a.w,a.host.querySelector('[data-author-body]'),'Retain unsent comment');
 const raw=a.host.querySelector('[name=author-source]').value;await assert.rejects(a.ui.save(),e=>e.status===status);assert.equal(a.host.querySelector('[name=author-source]').value,raw);assert.equal(a.state.commentBody,'Retain unsent comment');assert.equal(a.workspace.dirty,true);assert.equal(a.s.currentDraft(),null);assert.ok(Object.keys(a.state.raw).length);
});
test('pending shared save acknowledges sent rendered edits only; newer raw edits and unsent comments survive',async t=>{
 const a=await author(t,{pending:true});input(a.w,a.host.querySelector('[data-author-field=title]'),'First heading');const promise=a.workspace.save();await tick();input(a.w,a.host.querySelector('[name=author-source]'),'<p>Newer pending edit.</p>');input(a.w,a.host.querySelector('[data-author-body]'),'Unsent during save');a.release();await promise;
 assert.equal(a.workspace.dirty,true);assert.equal(a.state.commentBody,'Unsent during save');assert.ok(Object.values(a.state.raw).includes('<p>Newer pending edit.</p>'));assert.equal(a.s.currentDraft().content.lessons[0].blocks[0].textPages.pages[0].title,'First heading');assert.equal(a.s.currentDraft().content.lessons[0].blocks[0].textPages.pages[0].html,source);
});

const rect=(top,height)=>({left:20,right:780,width:760,top,bottom:top+height,height});
for(const preview of [false,true])test('optional summary focus and active input clear fixed dock in '+(preview?'1280x720 Preview':'learner')+'; reading scroll remains free',t=>{
 const d=new JSDOM((preview?'<dialog open style="overflow-y:auto">':'')+'<main><details><summary>Optional comparison</summary><textarea></textarea></details><nav data-exercise-dock></nav></main>'+(preview?'</dialog>':''),{pretendToBeVisual:true}),w=d.window,doc=w.document,scope=doc.querySelector('main'),dock=doc.querySelector('nav'),summary=doc.querySelector('summary'),textarea=doc.querySelector('textarea');t.after(()=>w.close());Object.defineProperty(w,'innerWidth',{value:1280});Object.defineProperty(w,'innerHeight',{value:720});let y=655,frame;
 scope.getBoundingClientRect=()=>rect(50,1400);dock.getBoundingClientRect=()=>rect(620,80);summary.getBoundingClientRect=()=>rect(y,44);textarea.getBoundingClientRect=()=>rect(y+70,70);
 const scroll=({top})=>y-=top;w.scrollBy=scroll;if(preview){const panel=doc.querySelector('dialog');panel.getBoundingClientRect=()=>rect(20,680);panel.scrollBy=scroll;}
 w.requestAnimationFrame=fn=>{frame=fn;return 1;};w.cancelAnimationFrame=()=>{};const owner=mountExerciseDock(scope);t.after(()=>owner.destroy());summary.focus();assert.ok(summary.getBoundingClientRect().bottom<620);assert.equal(doc.activeElement,summary);doc.querySelector('details').open=true;textarea.focus();assert.ok(textarea.getBoundingClientRect().bottom<620);assert.equal(doc.activeElement,textarea);
 const held=y;y=-250;w.dispatchEvent(new w.Event('scroll'));frame();assert.equal(y,-250,'no repeated focus pinning while reading');assert.notEqual(held,y);
});
test('actual six-page reader 6 → Back → 5 reveals optional summary before hit testing, without opening or gating Continue',t=>{
 const d=new JSDOM('<dialog open><main></main></dialog>',{pretendToBeVisual:true}),w=d.window,doc=w.document,host=doc.querySelector('main');t.after(()=>w.close());let scroll=0;
 const original=w.HTMLElement.prototype.getBoundingClientRect;w.HTMLElement.prototype.getBoundingClientRect=function(){if(this.tagName==='DIALOG')return rect(0,720);if(this.hasAttribute('data-exercise-dock'))return rect(620,80);if(this.tagName==='SUMMARY')return rect(655-scroll,44);if(this.hasAttribute('data-source-heading'))return rect(100-scroll,40);if(this===host)return rect(50,1400);return original.call(this);};doc.querySelector('dialog').scrollBy=({top})=>scroll+=top;
 const textPages=pack.lessons[0].blocks[0].textPages,ui=mountTextReader(host,{textPages,renderLesson:s=>s,initialState:{cursorPageId:textPages.order[5]},onContinue:()=>{}});t.after(()=>ui.destroy());host.querySelector('[data-source-action=back]').click();
 const summary=host.querySelector('[data-source-comparison] > summary');assert.ok(summary);assert.ok(summary.getBoundingClientRect().bottom<620);assert.equal(summary.parentElement.open,false);assert.equal(host.querySelector('[data-source-action=next]').disabled,false);summary.focus();summary.click();assert.equal(summary.parentElement.open,true);assert.equal(host.querySelector('[data-source-action=next]').disabled,false);
});
