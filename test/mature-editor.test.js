import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import purify from 'dompurify';
import {readFileSync} from 'node:fs';
import {marked} from 'marked';
import {createSourceAdapter} from '../public/author/source-adapter.js';
import {mountStandardEditor,proseSchema,createProseState} from '../public/author/standard-editor.js';
import {TextSelection,undo,redo,splitListItem,baseKeymap,closeHistory} from '../public/author/vendor/prosemirror.js';
import {courseRailEdge,updateCourseToggle} from '../public/sidebar-toggle.js';
import {mountRenderedSource} from '../public/author/rendered-source.js';
const source='<p class="authored" data-original="keep" style="color:navy">A <strong>bold 😀 שָׁלוֹם</strong> sentence &amp; exact.</p>\r\n\r\n<!-- untouched comment -->\r\n## Markdown **heading**\r\n\r\nA **mixed** paragraph.\r\n\r\n- **First** item\r\n- Second item\r\n\r\n<ol start="3"><li><em>HTML</em> item</li><li data-original="bytes">Untouched &nbsp; sibling</li></ol>\r\n';
export function editorDOM(t,options={}){
 const d=new JSDOM('<main></main>',{pretendToBeVisual:true,...options}),w=d.window,doc=w.document;
 const old={window:globalThis.window,document:globalThis.document,getComputedStyle:globalThis.getComputedStyle,ClipboardEvent:globalThis.ClipboardEvent};
 globalThis.window=w;globalThis.document=doc;globalThis.getComputedStyle=w.getComputedStyle.bind(w);
 globalThis.ClipboardEvent=w.ClipboardEvent||w.Event;
 w.Range.prototype.getBoundingClientRect=()=>({left:0,right:0,top:0,bottom:0,width:0,height:0});w.Range.prototype.getClientRects=()=>[];w.scrollBy=()=>{};
 t.after(()=>{Object.assign(globalThis,old);w.close();});return {w,doc,host:doc.querySelector('main'),deps:{marked,purifier:purify(w)}};
}
const locate=(doc,text)=>{let found;doc.descendants((n,p)=>{if(found===undefined&&n.isText&&n.text.includes(text))found=p+n.text.indexOf(text);});if(found===undefined)throw Error('Missing '+text);return found;};
test('HTML/Markdown/CRLF/opaque source: mount is exact, rich-run text patch is minimal, untouched entities/wrappers stay exact, undo returns original bytes',t=>{
 const {doc,deps}=editorDOM(t),a=createSourceAdapter({source,marked,schema:proseSchema,doc,sanitize:deps.purifier.sanitize});let s=createProseState(a.initial);assert.equal(a.compile(s.doc),source);
 const at=locate(s.doc,'sentence');s=s.apply(s.tr.insertText('revised ',at));assert.equal(a.compile(s.doc),source.replace('sentence','revised sentence'));
 undo(s,tr=>s=s.apply(tr));assert.equal(a.compile(s.doc),source);redo(s,tr=>s=s.apply(tr));assert.equal(a.compile(s.doc),source.replace('sentence','revised sentence'));
 const heading=locate(s.doc,'Markdown');s=s.apply(closeHistory(s.tr).insertText('New ',heading));const value=a.compile(s.doc);assert.match(value,/## New Markdown \*\*heading\*\*/);assert.ok(value.includes('<!-- untouched comment -->\r\n'));assert.ok(value.endsWith(source.slice(source.indexOf('<ol'))));
});
test('existing HTML span metadata, character entities, UTF16 emoji and Nikkud survive a text patch and paragraph direction change',t=>{
 const {doc,deps}=editorDOM(t),raw='<p class="keep" dir="rtl"><span style="color:red" data-x="keep">שָׁלוֹם 😀 &nbsp; &amp; tail</span><!--inner--></p>\r\n<p>Next.</p>',a=createSourceAdapter({source:raw,marked,schema:proseSchema,doc,sanitize:deps.purifier.sanitize});let s=createProseState(a.initial);s=s.apply(s.tr.insertText('new ',locate(s.doc,'tail')));assert.equal(a.compile(s.doc),raw.replace('tail','new tail'));
 s=s.apply(s.tr.setNodeMarkup(0,null,{...s.doc.firstChild.attrs,dir:'ltr'}));assert.equal(a.compile(s.doc),raw.replace('dir="rtl"','dir="ltr"').replace('tail','new tail'));
});
test('HTML text patches preserve authored CRLF and repeated whitespace inside a changed paragraph',t=>{
 const {doc,deps}=editorDOM(t),raw='<p class="keep">Line\r\nnext   words &amp; tail.</p>\r\n',a=createSourceAdapter({source:raw,marked,schema:proseSchema,doc,sanitize:deps.purifier.sanitize});let s=createProseState(a.initial);s=s.apply(s.tr.insertText('new ',locate(s.doc,'tail')));assert.equal(a.compile(s.doc),raw.replace('tail','new tail'));
});
test('normal Enter, list continuation/empty exit, multiline paste, formatting and history operate on a contiguous document',t=>{
 const {doc,deps}=editorDOM(t),raw='<p>First sentence</p>\r\n<ol start="3" class="keep"><li><p>Item</p></li></ol>\r\n<p data-last="exact">Last &amp; exact.</p>',a=createSourceAdapter({source:raw,marked,schema:proseSchema,doc,sanitize:deps.purifier.sanitize});let s=createProseState(a.initial);
 s=s.apply(s.tr.setSelection(TextSelection.create(s.doc,locate(s.doc,'sentence'))));assert.equal(baseKeymap.Enter(s,tr=>s=s.apply(tr)),true);let value=a.compile(s.doc);assert.match(value,/<p[^>]*>First <\/p>[\s\S]*<p[^>]*>sentence<\/p>/);assert.ok(value.endsWith(raw.slice(raw.indexOf('<ol'))));
 s=s.apply(s.tr.setSelection(TextSelection.create(s.doc,locate(s.doc,'Item')+4)));assert.equal(splitListItem(proseSchema.nodes.list_item)(s,tr=>s=s.apply(tr)),true);assert.equal(baseKeymap.Enter(s,tr=>s=s.apply(tr)),true);value=a.compile(s.doc);assert.match(value,/<ol[^>]*start="3"/);assert.ok(value.endsWith('<p data-last="exact">Last &amp; exact.</p>'));
});
test('opaque source cannot be deleted or crossed; adjacent current prose remains editable',t=>{
 const {doc,deps}=editorDOM(t),raw='<p>Before</p>\n<figure data-private="keep"><custom-widget>exact</custom-widget></figure>\n<p>After</p>',a=createSourceAdapter({source:raw,marked,schema:proseSchema,doc,sanitize:deps.purifier.sanitize});let s=createProseState(a.initial),errors=[];s=createProseState(a.initial,{onBoundary:e=>errors.push(e.message)});
 const rejected=s.applyTransaction(s.tr.delete(0,s.doc.content.size));assert.equal(rejected.transactions.length,0);assert.equal(errors.length,1);s=s.apply(s.tr.insertText('new ',locate(s.doc,'After')));assert.equal(a.compile(s.doc),raw.replace('After','new After'));
});
test('mature toolbar selection/history survives save status, paste strips active/external content, IME commits once and save waits for composition',async t=>{
 const {w,host,deps}=editorDOM(t);let changes=0;const ui=mountStandardEditor(host,{source:'<p>Selected words</p>',dependencies:deps,onChange:()=>changes++});t.after(()=>ui.dispose());await ui.ready;assert.ok(ui.view);const view=ui.view;
 view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc,1,9)));host.querySelector('[data-prose-command=Bold]').click();assert.match(ui.getValue(),/<strong>Selected<\/strong>/);assert.equal(view.state.selection.from,1);assert.equal(view.state.selection.to,9);
 const required=['Bold','Italic','Strikethrough','Quote','Bullet list','Numbered list','Checklist','Code','Link','Image','Table','Rule','Undo','Redo','Full screen'];for(const label of required)assert.ok(host.querySelector('[data-prose-command="'+label+'"]'),label);
 const safe=view.props.transformPastedHTML('<p onclick="bad()">Safe <span data-action="restore-backup" id="app">text</span></p><script>bad()</script><img src="https://example.invalid/x" onerror="bad()">');assert.doesNotMatch(safe,/onclick|onerror|<script|https:|data-action|id="app"/);
 host.querySelector('.ProseMirror').dispatchEvent(new w.CompositionEvent('compositionstart',{bubbles:true}));const before=changes;view.dispatch(view.state.tr.insertText('שָׁלוֹם 😀',9));assert.equal(changes,before);let settled=false;const wait=ui.whenSettled().then(()=>settled=true);await Promise.resolve();assert.equal(settled,false);assert.throws(()=>ui.getValue(),/composing/);
 host.querySelector('.ProseMirror').dispatchEvent(new w.CompositionEvent('compositionend',{bubbles:true}));await wait;assert.equal(changes,before+1);assert.match(ui.getValue(),/שָׁלוֹם 😀/);
 const state=view.state;ui.setLocked(true);assert.equal(view.editable,false);ui.setLocked(false);assert.equal(view.state,state);assert.equal(host.querySelector('[role=toolbar]').hidden,false);
});
test('physical sidebar edge determines glyph/title/aria for both states, including hidden restored state and RTL content',t=>{
 const {doc}=editorDOM(t),button=doc.createElement('button');button.innerHTML='<svg><path data-course-arrow></path></svg>';button.setAttribute('aria-controls','course-navigation');
 for(const edge of ['left','right'])for(const expanded of [true,false]){updateCourseToggle(button,{edge,expanded});const left=expanded?edge==='left':edge==='right';assert.equal(button.title,(expanded?'Collapse':'Expand')+' course outline');assert.equal(button.getAttribute('aria-label'),button.title);assert.equal(button.getAttribute('aria-expanded'),String(expanded));assert.equal(button.querySelector('path').getAttribute('d'),left?'M13 6l-4 4 4 4':'M9 6l4 4-4 4');}
 const shell={dataset:{courseRailEdge:'right'},getBoundingClientRect:()=>({left:0,width:1280})};assert.equal(courseRailEdge({getBoundingClientRect:()=>({left:0,width:0})},shell),'right');assert.equal(courseRailEdge({getBoundingClientRect:()=>({left:0,width:248})},shell),'left');
});
test('actual EasyMDE edits genuine Markdown with history and exact no-op CRLF retention',async t=>{
 const {w,host,deps}=editorDOM(t,{runScripts:'outside-only'});w.eval(readFileSync(new URL('../public/studio/vendor/easymde.min.js',import.meta.url),'utf8'));
 const raw='## Heading\r\n\r\n**Exact** שָׁלוֹם 😀.\r\n';let changes=0;const ui=mountRenderedSource(host,{source:raw,dependencies:{...deps,EasyMDE:w.EasyMDE},onChange:()=>changes++});t.after(()=>ui.dispose());await ui.ready;
 assert.equal(ui.getValue(),raw);assert.equal(ui.isClean(),true);const cm=host.querySelector('.CodeMirror').CodeMirror;cm.setCursor({line:2,ch:0});cm.replaceSelection('New ');assert.equal(changes,1);assert.match(ui.getValue(),/New \*\*Exact/);cm.undo();assert.equal(ui.getValue(),raw);assert.equal(ui.isClean(),true);
 const toolbar=host.querySelector('.editor-toolbar');for(const title of ['Bold','Italic','Image','Table','Undo','Redo'])assert.ok([...toolbar.querySelectorAll('button')].some(b=>b.textContent===title));
 const before=changes,field=cm.getInputField();field.dispatchEvent(new w.CompositionEvent('compositionstart',{bubbles:true}));cm.replaceSelection('שָׁלוֹם');assert.equal(changes,before);let settled=false;const wait=ui.whenSettled().then(()=>settled=true);await Promise.resolve();assert.equal(settled,false);field.dispatchEvent(new w.CompositionEvent('compositionend',{bubbles:true}));await wait;assert.equal(changes,before+1);assert.match(ui.getValue(),/שָׁלוֹם/);
});
test('rich paste inserts multiple paragraphs/lists with mature history; image insertion only selects approved local media and requires alt text',async t=>{
 const {w,host,deps}=editorDOM(t),calls=[];const ui=mountStandardEditor(host,{source:'<p>Start.</p>',dependencies:deps,api:async path=>{calls.push(path);return {assets:[{assetId:'synthetic-image',title:'Synthetic approved image',kind:'image',revisions:[{url:'/media/synthetic/image.png',revisionId:'r1',sha256:'a'.repeat(64),approval:{status:'approved'}},{url:'https://example.invalid/no.png',revisionId:'r2',sha256:'b'.repeat(64),approval:{status:'approved'}}]}]};}});t.after(()=>ui.dispose());await ui.ready;const view=ui.view;
 view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc,7)));view.pasteHTML('<p>First paste</p><p>Second שָׁלוֹם</p><ul><li>One</li><li>Two</li></ul>');assert.match(ui.getValue(),/First paste/);assert.match(ui.getValue(),/<ul>/);assert.equal(undo(view.state,tr=>view.dispatch(tr)),true);assert.equal(ui.getValue(),'<p>Start.</p>');
 host.querySelector('[data-prose-command=Image]').click();await new Promise(r=>setTimeout(r,0));assert.deepEqual(calls,['studio/media/status']);assert.equal(host.querySelectorAll('[data-select-media]').length,1);host.querySelector('[data-select-media]').click();const form=host.querySelector('[data-prose-insert] form');form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert.match(form.querySelector(':scope > p[role=status]').textContent,/alt text/);form.elements.alt.value='Synthetic image description';form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert.match(ui.getValue(),/src="\/media\/synthetic\/image.png"/);assert.match(ui.getValue(),/alt="Synthetic image description"/);assert.doesNotMatch(ui.getValue(),/example.invalid/);
});
test('checklist is a real list with editable checked state, conventional Enter and exact Undo restoration',async t=>{
 const {host,deps,w}=editorDOM(t),ui=mountStandardEditor(host,{source:'<p>Task</p>',dependencies:deps});t.after(()=>ui.dispose());await ui.ready;host.querySelector('[data-prose-command=Checklist]').click();const box=host.querySelector('[data-task-checkbox]');assert.ok(box);assert.equal(box.checked,false);box.click();assert.match(ui.getValue(),/checked/);assert.match(ui.getValue(),/Task/);host.querySelector('[data-prose-command=Undo]').click();assert.equal(ui.getValue(),'<p>Task</p>');
});
test('long rich source inputs never reparse/sanitize or compile source; collection retains every untouched entity',async t=>{
 const {host,deps}=editorDOM(t),raw='<p class="long">'+('שָׁלוֹם text &amp; '.repeat(6000))+'</p>';let sanitizes=0,changes=0;
 const ui=mountStandardEditor(host,{source:raw,dependencies:{...deps,purifier:{sanitize:html=>{sanitizes++;return deps.purifier.sanitize(html);}}},onChange:()=>changes++});t.after(()=>ui.dispose());await ui.ready;const initialSanitizes=sanitizes,times=[];
 for(let i=0;i<60;i++){const start=performance.now();ui.view.dispatch(ui.view.state.tr.insertText('x',1));times.push(performance.now()-start);}
 assert.equal(changes,60);assert.equal(sanitizes,initialSanitizes);assert.equal(ui.getValue(),raw.replace('<p class="long">','<p class="long">'+'x'.repeat(60)));times.sort((a,b)=>a-b);t.diagnostic(JSON.stringify({syntheticSourceCodeUnits:raw.length,operations:60,sanitizesDuringInput:0,transactionMs:{p50:times[30],p95:times[57],max:times.at(-1)},measurement:'JSDOM only, not native input-to-paint'}));
});
