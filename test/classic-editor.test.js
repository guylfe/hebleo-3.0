import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {marked} from 'marked';
import purify from 'dompurify';
import {createClassicAdapter} from '../public/author/classic-source.js';
import {mountStandardEditor} from '../public/author/standard-editor.js';
import {mountRenderedSource} from '../public/author/rendered-source.js';
import {safeStyle,sanitizeProse} from '../public/safe-format.js';
import {createLessonRenderer} from '../public/rich.js';
import {classicDOM} from '../test-support/classic-dom.js';
import {mediaHTTP,imageInput,idle} from '../test-support/private-image-fixture.js';
const source='<p class="authored" data-original="keep" style="color:navy">A <strong>bold 😀 שָׁלוֹם</strong> sentence &amp; exact.</p>\r\n\r\n<!-- untouched comment -->\r\n## Markdown **heading**\r\n\r\nA **mixed** paragraph.\r\n\r\n- **First** item\r\n- Second item\r\n\r\n<ol start="3"><li><em>HTML</em> item</li><li data-original="bytes">Untouched &nbsp; sibling</li></ol>\r\n';
test('generic DOM adapter no-op, exact UTF16/entity/CRLF patch, unknown wrappers and opaque boundaries',t=>{
 const {doc,deps}=classicDOM(t),a=createClassicAdapter({source,marked,doc,sanitize:html=>sanitizeProse(html,deps.purifier,doc,{editor:true})});
 assert.equal(a.compile(a.initial),source);
 const box=doc.createElement('div');box.innerHTML=a.initial;
 box.firstElementChild.lastChild.textContent=' revised sentence & exact.';
 assert.equal(a.compile(box.innerHTML),source.replace(' sentence',' revised sentence'));
 box.querySelector('[data-retained]').remove();assert.throws(()=>a.compile(box.innerHTML),/retained source/);
});
test('strict shared CSS grammar retains bounded visual formatting and strips malicious paste in author and learner',t=>{
 const {doc,deps}=classicDOM(t);
 const bad='color:red;background-image:url(https://evil.invalid/x);position:fixed;display:none;font-size:999px;--x:red;left:0;filter:url(x);font-family:evil;behavior:url(x);text-align:center;margin-left:40px';
 assert.equal(safeStyle(bad),'color:red;text-align:center;margin-left:40px');
 assert.equal(safeStyle('color:rgb(999,0,0);color:expression(x);background-color:var(--x);font-size:12px!important'), '');
 const pasted='<p style="'+bad+'" onclick="evil()">שָׁלוֹם 😀 <u><s> text </s></u><span style="font-size:24px;background-color:#ff0;color:rgb(10, 20, 30)"> exact </span></p><img src="https://evil.invalid/x"><iframe src="x"></iframe><script>bad()</script>';
 for(const html of [sanitizeProse(pasted,deps.purifier,doc,{editor:true}),createLessonRenderer(marked,deps.purifier,doc)(pasted)]){
  assert.doesNotMatch(html,/evil|position|display|999|iframe|script|filter|behavior|font-family/);
  assert.match(html,/font-size:24px/);assert.match(html,/background-color:#ff0/);assert.match(html,/<u><s>/);
  const box=doc.createElement('div');box.innerHTML=html;assert.equal(box.textContent,'שָׁלוֹם 😀  text  exact ');
 }
});
test('actual pinned Jodit supplied toolbar, HTML/Markdown visual mounting, no-op exact source and immutable acknowledgement',async t=>{
 const {host,deps,w}=classicDOM(t);let changes=0;
 const ui=mountRenderedSource(host,{source,onError:e=>t.diagnostic(e.stack),dependencies:deps,onChange:()=>changes++});t.after(()=>ui.dispose());assert.ok(await ui.ready,host.textContent);
 assert.equal(w.Jodit.version,'4.18.12');assert.ok(host.querySelector('.jodit-toolbar__box'));assert.equal(host.querySelector('.CodeMirror'),null);
 assert.equal(ui.getValue(),source);assert.equal(ui.isClean(),true);assert.equal(changes,0);
 const view=ui.view,first=view.editor.querySelector('p');first.lastChild.textContent=' revised sentence & exact.';view.setEditorValue();assert.equal(changes,1);
 assert.equal(ui.getValue(),source.replace(' sentence',' revised sentence'));const A=ui.model;
 first.lastChild.textContent=' newer sentence & exact.';view.setEditorValue();ui.acceptSaved(A);assert.equal(ui.isClean(),false);assert.match(ui.getValue(),/newer/);
 const selection=w.document.createRange();selection.selectNodeContents(first);w.getSelection().removeAllRanges();w.getSelection().addRange(selection);const range=w.getSelection().getRangeAt(0);
 ui.setLocked(true);ui.setLocked(false);assert.equal(ui.view,view);assert.equal(w.getSelection().getRangeAt(0),range);
 for(const name of ['bold','italic','underline','strikethrough','brush','fontsize','paragraph','left','center','right','justify','ul','ol','outdent','indent','link','image','table','undo','redo'])assert.ok(host.querySelector('[data-ref="'+name+'"]'),name);
});
test('actual Jodit Markdown starts visually; formatting persists with same UTF16 projection, safe paste and retained source failures',async t=>{
 const {host,deps,doc,w}=classicDOM(t),raw='## Exact **heading**\r\n\r\nשָׁלוֹם 😀  words\r\n',ui=mountStandardEditor(host,{source:raw,onError:e=>t.diagnostic(e.stack),dependencies:deps});t.after(()=>ui.dispose());assert.ok(await ui.ready,host.textContent);assert.equal(ui.getValue(),raw);assert.ok(ui.view.editor.querySelector('h2'));assert.equal(ui.view.editor.textContent.includes('##'),false);
 const p=ui.view.editor.querySelector('p'),before=p.textContent;p.innerHTML='<span style="font-size:24px;color:#ff0000;background-color:#ffff00"><u>'+p.innerHTML+'</u></span>';p.style.textAlign='center';ui.view.setEditorValue();
 const saved=ui.getValue(),render=createLessonRenderer(marked,deps.purifier,doc),box=doc.createElement('div');box.innerHTML=render(saved);assert.equal(box.querySelector('p').textContent,before);assert.match(saved,/font-size:24px/);assert.match(render(saved),/text-align:center/);assert.match(render(saved),/<u>/);
 const safe=ui.view.e.fire('beforePasteInsert','<p style="display:none;color:red" onclick="x()">Paste</p><img src="https://evil/x">');assert.doesNotMatch(safe,/display|onclick|https/);assert.match(safe,/color:red/);
});
test('composition wait and retained component snapshot preserve real Jodit selection/history across page reuse',async t=>{
 const {host,deps,w,doc}=classicDOM(t),ui=mountStandardEditor(host,{source:'<p>Exact שָׁלוֹם 😀.</p>',onError:e=>t.diagnostic(e.stack),dependencies:deps});t.after(()=>ui.dispose());assert.ok(await ui.ready,host.textContent);
 const view=ui.view;view.editor.dispatchEvent(new w.CompositionEvent('compositionstart',{bubbles:true}));view.editor.querySelector('p').firstChild.insertData(0,'New ');view.setEditorValue();let settled=false;const wait=ui.whenSettled().then(()=>settled=true);await Promise.resolve();assert.equal(settled,false);assert.throws(()=>ui.getValue(),/composing/);
 view.editor.dispatchEvent(new w.CompositionEvent('compositionend',{bubbles:true}));await wait;
 const saved=ui.getValue(),session=ui.snapshot();ui.dispose();assert.equal(host.childNodes.length,0);const next=doc.createElement('div');doc.body.append(next);const resumed=mountStandardEditor(next,{source:saved,onError:e=>t.diagnostic(e.stack),dependencies:deps,session,onChange:()=>{}});assert.equal(resumed,ui);assert.equal(resumed.view,view);assert.equal(resumed.getValue(),saved);assert.equal(view.history.canUndo(),true);view.history.undo();view.setEditorValue();assert.equal(resumed.getValue(),'<p>Exact שָׁלוֹם 😀.</p>');
});

import {Store} from '../src/store.js';
import {authorProjection} from '../src/author-review.js';
test('supplied toolbar commands persist formatting with exact projection; safe styles survive draft, scoped publication and recovery',async t=>{
 const {host,deps,doc,w}=classicDOM(t),raw='<p data-original="retained">שָׁלוֹם 😀 exact  words</p>\r\n<p>Untouched &nbsp; entity.</p>',ui=mountStandardEditor(host,{source:raw,dependencies:deps});t.after(()=>ui.dispose());assert.ok(await ui.ready,host.textContent);
 const view=ui.view,selectText=()=>{view.s.focus();view.s.select(view.editor.querySelector('p'),true);};
 for(const name of ['bold','italic','underline','strikethrough']){selectText();host.querySelector('[data-ref="'+name+'"] .jodit-toolbar-button__button').click();}
 for(const [name,value] of [['fontsize',24],['forecolor','#123456'],['background','#ffff00'],['justifycenter']]){selectText();view.execCommand(name,false,value);}
 view.setEditorValue();const saved=ui.getValue();assert.equal(authorProjection(saved),authorProjection(raw));assert.match(saved,/data-original="retained"/);assert.match(saved,/font-size:24px/);assert.match(saved,/text-align:center/);assert.match(saved,/<u>/);assert.match(saved,/<s[^>]*>/);assert.match(saved,/<strong>שָ/);
 const render=createLessonRenderer(marked,deps.purifier,doc);assert.match(render(saved),/background-color:/);assert.match(render(saved),/color:/);
 const s=new Store(),recovered=new Store();t.after(()=>{s.close();recovered.close();});
 const c=s.snapshot(),lessonId=c.lessons[0].id;c.lessons[0].explanation=saved;
 const d=s.stage({baseRevisionId:s.get('active'),expectedDraftToken:null,content:c});
 assert.equal(s.currentDraft().content.lessons[0].explanation,saved);
 const scope={baseRevisionId:s.get('active'),expectedDraftToken:s.currentDraft().draftToken,lessonId,includeDependencies:[]},review=s.reviewLessonPublication(scope);assert.equal(review.canPublish,true);
 s.publishLesson({...scope,reviewToken:review.reviewToken});assert.equal(s.snapshot().lessons[0].explanation,saved);
 recovered.restore(s.backup());assert.equal(recovered.snapshot().lessons[0].explanation,saved);assert.equal(authorProjection(recovered.snapshot().lessons[0].explanation),authorProjection(raw));
});
test('structural Enter preserves authored wrapper attributes; metadata loss refuses compilation with recoverable DOM intact',t=>{
 const {doc,deps}=classicDOM(t),raw='<p class="keep" data-original="exact">One &amp; two</p>\r\n<p>Adjacent</p>',a=createClassicAdapter({source:raw,marked,doc,sanitize:h=>sanitizeProse(h,deps.purifier,doc,{editor:true})}),box=doc.createElement('div');box.innerHTML=a.initial;
 box.firstElementChild.innerHTML='One &amp;';const split=doc.createElement('p');split.textContent=' two';box.firstElementChild.after(split);
 const value=a.compile(box.innerHTML);assert.match(value,/<p class="keep" data-original="exact">One &amp;<\/p>/);assert.ok(value.endsWith('<p>Adjacent</p>'));
 const nested='<p><span data-private="exact">Keep</span> words</p>',b=createClassicAdapter({source:nested,marked,doc,sanitize:h=>sanitizeProse(h,deps.purifier,doc,{editor:true})});
 const changed='<p><strong>Keep words</strong></p>';assert.throws(()=>b.compile(changed),/retained source attributes/);assert.equal(changed,'<p><strong>Keep words</strong></p>');assert.equal(b.compile(b.initial),nested);
});
test('actual imported private-approved image inserts with alt, saves, publishes synthetically and recovers immutable media',async t=>{
 const {store,api}=await mediaHTTP(t),pin=await api('studio/media/import',imageInput()),initialState=store.media.state();
 const {host,deps,doc,w}=classicDOM(t),ui=mountStandardEditor(host,{source:'<p>Before image</p>',dependencies:deps,api});t.after(()=>ui.dispose());assert.ok(await ui.ready);
 assert.equal(ui.view.o.controls.image.popup,null);assert.equal(ui.view.o.controls.image.list,null);
 assert.equal(host.querySelector('[data-ref="image"] .jodit-toolbar-button__trigger'),null);
 const range=doc.createRange();range.selectNodeContents(ui.view.editor.firstElementChild);range.collapse(false);w.getSelection().removeAllRanges();w.getSelection().addRange(range);
 host.querySelector('[data-ref="image"] .jodit-toolbar-button__button').click();await idle(host);assert.equal(host.querySelectorAll('[data-select-media]').length,1);assert.equal(host.querySelector('[data-select-media]').disabled,true);
 host.querySelector('[data-private-approve]').click();await idle(host);host.querySelector('[data-select-media]').click();
 const form=host.querySelector('[data-prose-insert] form');form.dispatchEvent(new w.Event('submit',{cancelable:true,bubbles:true}));assert.match(form.querySelector(':scope > p[role=status]').textContent,/alt text/);form.elements.alt.value='Synthetic description';form.dispatchEvent(new w.Event('submit',{cancelable:true,bubbles:true}));await idle(host);ui.view.setEditorValue();
 const saved=ui.getValue();assert.ok(saved.includes('src="'+pin.url+'"'));assert.match(saved,/alt="Synthetic description"/);assert.doesNotMatch(saved,/selection_marker|remote.invalid/);assert.equal(store.currentDraft(),null);
 const paste=ui.view.e.fire('beforePasteInsert','<div data-retained="0" contenteditable="false"><img src="//remote.invalid/img.png">paste</div>');assert.doesNotMatch(paste,/data-retained|contenteditable|<img/);
 const prior=ui.model;ui.view.execCommand('insertimage',false,'https://remote.invalid/img.png');assert.equal(ui.model,prior);
 const content=store.snapshot();content.lessons[0].explanation=saved;store.stage({baseRevisionId:store.get('active'),expectedDraftToken:null,content});assert.equal(store.currentDraft().content.lessons[0].explanation,saved);
 const scope={baseRevisionId:store.get('active'),expectedDraftToken:store.currentDraft().draftToken,lessonId:content.lessons[0].id,includeDependencies:[]},review=store.reviewLessonPublication(scope);assert.equal(review.canPublish,true);store.publishLesson({...scope,reviewToken:review.reviewToken});
 const recovered=new Store();t.after(()=>recovered.close());recovered.restore(store.backup());assert.equal(recovered.snapshot().lessons[0].explanation,saved);assert.deepEqual(recovered.media.state(),store.media.state());assert.deepEqual(store.media.state().assets,initialState.assets);assert.deepEqual(store.media.state().operations,initialState.operations);
 const render=createLessonRenderer(marked,deps.purifier,doc);assert.ok(render(recovered.snapshot().lessons[0].explanation).includes(pin.url));
 const next=doc.createElement('div');doc.body.append(next);const reopened=mountStandardEditor(next,{source:saved,dependencies:deps,api});t.after(()=>reopened.dispose());assert.ok(await reopened.ready);assert.equal(reopened.view.editor.querySelector('img').getAttribute('src'),pin.url);assert.equal(reopened.view.editor.querySelector('img').alt,'Synthetic description');assert.equal(reopened.getValue(),saved);
});

test('normal lists/indent/direction and supplied table picker/edit commands compile safe persisted structures',async t=>{
 const {host,deps,doc,w}=classicDOM(t),ui=mountStandardEditor(host,{source:'<p>List words</p>',dependencies:deps});t.after(()=>ui.dispose());assert.ok(await ui.ready);
 const view=ui.view;view.s.focus();view.s.select(view.editor.querySelector('p'),true);host.querySelector('[data-ref="ul"] .jodit-toolbar-button__button').click();view.setEditorValue();assert.match(ui.getValue(),/<ul>/);assert.match(ui.getValue(),/<li/);
 view.s.select(view.editor.querySelector('li'),true);view.execCommand('indent');view.setEditorValue();assert.match(ui.getValue(),/margin-left:10px/);
 view.o.controls.direction.exec(view,null,{control:{args:['rtl']}});view.setEditorValue();assert.match(ui.getValue(),/dir="rtl"/);
 view.s.setCursorAfter(view.editor.lastChild);host.querySelector('[data-ref="table"] .jodit-toolbar-button__button').click();
 const cell=doc.querySelector('[role=gridcell][aria-label="2 by 2"]');assert.ok(cell);cell.dispatchEvent(new w.MouseEvent('mousedown',{bubbles:true,cancelable:true}));view.setEditorValue();assert.equal(view.editor.querySelectorAll('td').length,4);
 view.s.setCursorIn(view.editor.querySelector('td'));view.getInstance('Table',view.o).addSelection(view.editor.querySelector('td'));view.execCommand('tableaddrowafter');view.setEditorValue();assert.equal(view.editor.querySelectorAll('td').length,6);
 const value=ui.getValue();assert.match(value,/<table\b/);assert.match(value,/width:50%/);assert.equal((value.match(/<td/g)||[]).length,6);
});
test('unsupported inline markup, authored FEFF/checklists and animation remain byte-exact retained boundaries beside editable prose',t=>{
 const {doc,deps}=classicDOM(t),raw='Text <custom-widget data-x="exact">opaque</custom-widget> tail.\r\n\r\n- [ ] Exact task\r\n\r\n<p>Invisible \uFEFF source</p>\r\n<p>Editable שָׁלוֹם 😀.</p>',a=createClassicAdapter({source:raw,marked,doc,sanitize:h=>sanitizeProse(h,deps.purifier,doc,{editor:true})}),box=doc.createElement('div');box.innerHTML=a.initial;assert.equal(box.querySelectorAll('[data-retained]').length,3);assert.equal(a.compile(a.initial),raw);box.lastElementChild.firstChild.insertData(0,'New ');assert.equal(a.compile(box.innerHTML),raw.replace('Editable','New Editable'));
});

test('component Enter/list continuation and boundary-adjacent deletion guards keep source recoverable',async t=>{
 const {host,deps,w}=classicDOM(t),ui=mountStandardEditor(host,{source:'<p>Before</p>\n<widget data-x="exact">Retained</widget>\n<p>After</p>',dependencies:deps});t.after(()=>ui.dispose());assert.ok(await ui.ready);
 const view=ui.view,before=ui.getValue();view.s.focus();view.s.setCursorIn(view.editor.lastElementChild,true);
 const back=new w.InputEvent('beforeinput',{inputType:'deleteContentBackward',bubbles:true,cancelable:true});view.editor.dispatchEvent(back);assert.equal(back.defaultPrevented,true);assert.equal(ui.getValue(),before);
 view.s.setCursorIn(view.editor.firstElementChild,false);const del=new w.InputEvent('beforeinput',{inputType:'deleteContentForward',bubbles:true,cancelable:true});view.editor.dispatchEvent(del);assert.equal(del.defaultPrevented,true);
 const range=w.document.createRange();range.selectNodeContents(view.editor);w.getSelection().removeAllRanges();w.getSelection().addRange(range);const crossed=new w.InputEvent('beforeinput',{inputType:'insertText',data:'replacement',bubbles:true,cancelable:true});view.editor.dispatchEvent(crossed);assert.equal(crossed.defaultPrevented,true);assert.equal(ui.getValue(),before);
 // Exercise the component's Enter handler; JSDOM has no browser default edit.
 view.s.select(view.editor.lastElementChild,true);view.execCommand('insertUnorderedList');view.setEditorValue();view.s.setCursorIn(view.editor.querySelector('li'),false);
 view.editor.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',keyCode:13,which:13,bubbles:true,cancelable:true}));view.setEditorValue();assert.equal(view.editor.querySelectorAll('li').length,2);assert.match(ui.getValue(),/data-x="exact"/);
});
