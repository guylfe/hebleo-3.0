import test from 'node:test';
import assert from 'node:assert/strict';
import {classicDOM} from '../test-support/classic-dom.js';
import {mountStandardEditor} from '../public/author/standard-editor.js';
import {createClassicAdapter} from '../public/author/classic-source.js';
import {sanitizeProse} from '../public/safe-format.js';
import {authorProjection} from '../src/author-review.js';
const cases={
 'two Markdown paragraphs':'First paragraph.\n\nSecond שָׁלוֹם 😀 paragraph.\n',
 'Markdown heading and paragraph':'## Heading\r\n\r\nשָׁלוֹם 😀  paragraph\r\n',
 'Markdown list and paragraph':'- First item\n- Second item\n\nAfter list\n',
 'plain paragraph without newline':'שָׁלוֹם 😀  exact',
 'HTML sibling entities':'<p data-retain="exact">שָׁלוֹם 😀 &nbsp; words</p>\r\n<p>Adjacent</p>',
 'Markdown blockquote':'> First\n> second\n\nTail\n',
 'table Markdown':'| One | Two |\n| --- | --- |\n| שָׁלוֹם | 😀 |\n\nTail\n'
};
for(const [name,source] of Object.entries(cases))test('RR format-only projection: '+name,async t=>{
 const {host,deps}=classicDOM(t),ui=mountStandardEditor(host,{source,dependencies:deps});t.after(()=>ui.dispose());assert.ok(await ui.ready,host.textContent);assert.equal(ui.getValue(),source,'No-op exact');
 const view=ui.view,p=view.editor.querySelector('p,h1,h2,li,td');view.s.focus();view.s.select(p,true);view.execCommand('forecolor',false,'#123456');view.setEditorValue();const value=ui.getValue();assert.notEqual(value,source);assert.equal(authorProjection(value),authorProjection(source),'Formatting must retain the entire UTF16 projection');
});
test('RR changed field retains comment and unknown descendant source bytes',t=>{
 const {doc,deps}=classicDOM(t),source='<p>Top <span data-opaque="exact" title="retain">unchanged &nbsp; 😀</span> tail<!--keep comment--></p>\r\n<p>After</p>',a=createClassicAdapter({source,marked:deps.marked,doc,sanitize:h=>sanitizeProse(h,deps.purifier,doc,{editor:true})}),box=doc.createElement('div');box.innerHTML=a.initial;
 box.firstElementChild.firstChild.textContent='New top ';assert.equal(a.compile(box.innerHTML),source.replace('Top ','New top '));
});
test('RR sanitizer strips active content and unsafe attributes in malformed nested paste',t=>{
 const {doc,deps}=classicDOM(t),html='<svg><a xlink:href="javascript:alert(1)">SVG</a></svg><math><mtext><img src="x" onerror="alert(1)"></mtext></math><a href="javascript:alert(1)" ping="https://evil.invalid/">bad</a><img src="/media/../x" onerror="x()"><p style="background-image:uRl(x);color:red;position:fixed" onmouseover="x()">safe</p>';
 const safe=sanitizeProse(html,deps.purifier,doc,{editor:true});assert.doesNotMatch(safe,/onerror|onmouseover|javascript:|ping=|<svg|<math|url\(|position|<img/i);assert.match(safe,/color:red/);
});
