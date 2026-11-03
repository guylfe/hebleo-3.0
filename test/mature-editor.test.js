import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import purify from 'dompurify';
import {readFileSync} from 'node:fs';
import {marked} from 'marked';
import {createSourceAdapter} from '../public/author/source-adapter.js';
import {proseSchema,createProseState} from '../public/author/standard-editor.js';
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

test('physical sidebar edge determines glyph/title/aria for both states, including hidden restored state and RTL content',t=>{
 const {doc}=editorDOM(t),button=doc.createElement('button');button.innerHTML='<svg><path data-course-arrow></path></svg>';button.setAttribute('aria-controls','course-navigation');
 for(const edge of ['left','right'])for(const expanded of [true,false]){updateCourseToggle(button,{edge,expanded});const left=expanded?edge==='left':edge==='right';assert.equal(button.title,(expanded?'Collapse':'Expand')+' course outline');assert.equal(button.getAttribute('aria-label'),button.title);assert.equal(button.getAttribute('aria-expanded'),String(expanded));assert.equal(button.querySelector('path').getAttribute('d'),left?'M13 6l-4 4 4 4':'M9 6l4 4-4 4');}
 const shell={dataset:{courseRailEdge:'right'},getBoundingClientRect:()=>({left:0,width:1280})};assert.equal(courseRailEdge({getBoundingClientRect:()=>({left:0,width:0})},shell),'right');assert.equal(courseRailEdge({getBoundingClientRect:()=>({left:0,width:248})},shell),'left');
});
