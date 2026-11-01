import test from 'node:test';
import assert from 'node:assert/strict';
import {classicDOM} from '../test-support/classic-dom.js';
import {mountStandardEditor} from '../public/author/standard-editor.js';
import {authorProjection} from '../src/author-review.js';
import {Store} from '../src/store.js';
import {createServer} from '../src/server.js';
import {randomUUID} from 'node:crypto';
const qaCases=[['Markdown heading','## Heading\r\n\r\nTail.','h2'],['repeated HTML blocks','<p>Same</p>\r\n<p>Same</p>\r\n<p>Same</p>','p'],['Markdown table','| A | B |\r\n|---|---|\r\n| א | 😀 |\r\n\r\nTail.','td']];
for(const [name,source,selector]of qaCases)test('QA-CLASSIC-PROJECTION-01: actual supplied Center preserves exact UTF16 projection: '+name,async t=>{
 const {host,deps}=classicDOM(t),ui=mountStandardEditor(host,{source,dependencies:deps});t.after(()=>ui.dispose());assert.ok(await ui.ready);assert.equal(ui.getValue(),source);
 ui.view.s.focus();ui.view.s.select(ui.view.editor.querySelector(selector),true);ui.view.execCommand('justifycenter');ui.view.setEditorValue();assert.match(ui.getValue(),/text-align:center/);assert.equal(authorProjection(ui.getValue()),authorProjection(source));
});
for(const kind of ['html','markdown'])for(const index of [0,1,2])test('repeated '+kind+' sibling '+index+' keeps untouched byte ranges and projection over reload',async t=>{
 const {host,deps,doc}=classicDOM(t),newline='\r\n',source=kind==='html'?Array(3).fill('<p class="keep">Same &nbsp; 😀 שָׁלוֹם</p>').join(newline):Array(3).fill('Same &#160; 😀 שָׁלוֹם').join(newline+newline);
 const ui=mountStandardEditor(host,{source,dependencies:deps});t.after(()=>ui.dispose());assert.ok(await ui.ready);
 ui.view.s.focus();ui.view.s.select(ui.view.editor.querySelectorAll('p')[index],true);ui.view.execCommand('justifycenter');ui.view.setEditorValue();
 const saved=ui.getValue();assert.equal(authorProjection(saved),authorProjection(source));assert.equal((saved.match(/text-align:center/g)||[]).length,1);
 if(kind==='html'){assert.equal(saved,source.replace(/<p class="keep">/g,(match,offset)=>offset===Array.from(source.matchAll(/<p class="keep">/g))[index].index?'<p class="keep" style="text-align:center">':match));}
 const node=doc.createElement('div');doc.body.append(node);const reload=mountStandardEditor(node,{source:saved,dependencies:deps});t.after(()=>reload.dispose());assert.ok(await reload.ready);assert.equal(reload.getValue(),saved);
 reload.view.s.focus();reload.view.s.select(reload.view.editor.querySelectorAll('p')[index],true);reload.view.execCommand('forecolor',false,'#123456');reload.view.setEditorValue();assert.equal(authorProjection(reload.getValue()),authorProjection(source));
});
test('format-only Markdown persists whole-block and repeated-quote private anchors through actual HTTP Save/Preview, scoped publication and recovery',async t=>{
 const {host,deps}=classicDOM(t),s=new Store(),restored=new Store();t.after(()=>{s.close();restored.close();});
 const source='## SYNTHETIC heading\r\n\r\nRepeated שָׁלוֹם 😀 quote.\r\n\r\nRepeated שָׁלוֹם 😀 quote.\r\n',c=s.snapshot(),l=c.lessons[0];l.explanation=source;s.set('active',s.addRevision(c,'SYNTHETIC projection/anchor fixture'));
 const pins={lessonId:l.id,baseRevisionId:s.get('active'),draftToken:null,componentId:null,pageId:null,activityId:null,fieldPath:'explanation'},text=authorProjection(source),exact='Repeated שָׁלוֹם 😀 quote.',start=text.lastIndexOf(exact),selection={start,end:start+exact.length,exact,prefix:text.slice(Math.max(0,start-80),start),suffix:text.slice(start+exact.length,start+exact.length+80)};
 s.authorReview.create('author-demo',{...pins,requestId:randomUUID(),selection:null,body:'SYNTHETIC whole-block note'});s.authorReview.create('author-demo',{...pins,requestId:randomUUID(),selection,body:'SYNTHETIC repeated second quote'});
 const historical=structuredClone(s.authorReview.state()),ui=mountStandardEditor(host,{source,dependencies:deps});t.after(()=>ui.dispose());assert.ok(await ui.ready);
 ui.view.s.focus();ui.view.s.select(ui.view.editor.querySelector('h2'),true);ui.view.execCommand('justifycenter');ui.view.setEditorValue();const compiled=ui.getValue();assert.equal(authorProjection(compiled),text);c.lessons[0].explanation=compiled;
 const server=createServer(s);await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));});
 const post=async(path,input)=>{const r=await fetch('http://127.0.0.1:'+server.address().port+'/api/'+path,{method:'POST',headers:{'x-demo-user':'author-demo','content-type':'application/json','prefer':'return=minimal'},body:JSON.stringify(input)});const dto=await r.json();assert.equal(r.status,200,dto.error);return dto;};
 const saved=await post('studio/draft',{baseRevisionId:s.get('active'),expectedDraftToken:null,content:c});assert.equal(s.currentDraft().content.lessons[0].explanation,compiled);assert.ok(s.authorReview.list('author-demo',{lessonId:l.id}).comments.every(n=>n.anchorState==='current'));assert.deepEqual(s.authorReview.state(),historical);
 const preview=await post('studio/preview/session',{lessonId:l.id,draftToken:saved.draftToken});assert.equal(preview.content.lessons[0].explanation,compiled);
 const scope={lessonId:l.id,baseRevisionId:s.get('active'),expectedDraftToken:saved.draftToken,includeDependencies:[]},review=await post('studio/publish-lesson/review',scope);assert.equal(review.canPublish,true);await post('studio/publish-lesson',{...scope,reviewToken:review.reviewToken});
 assert.ok(s.authorReview.list('author-demo',{lessonId:l.id}).comments.every(n=>n.anchorState==='current'));assert.deepEqual(s.authorReview.state(),historical);
 restored.restore(s.backup());assert.deepEqual(restored.authorReview.state(),historical);assert.ok(restored.authorReview.list('author-demo',{lessonId:l.id}).comments.every(n=>n.anchorState==='current'));assert.equal(restored.snapshot().lessons[0].explanation,compiled);
 const edit=restored.snapshot();edit.lessons[0].explanation=compiled.replace('SYNTHETIC heading','Actual text edit');restored.stage({baseRevisionId:restored.get('active'),expectedDraftToken:restored.currentDraft()?.draftToken??null,content:edit});
 assert.equal(restored.authorReview.list('author-demo',{lessonId:l.id}).comments.find(n=>n.body==='SYNTHETIC whole-block note').anchorState,'changed');assert.deepEqual(restored.authorReview.state(),historical);
});
test('NC02/03 supplied link popup excludes file/media controls, atomic font list is exact in runtime and opened menu',async t=>{
 const {host,deps,doc}=classicDOM(t),ui=mountStandardEditor(host,{source:'<p><a href="https://example.invalid">SYNTHETIC link</a></p>',dependencies:deps});t.after(()=>ui.dispose());assert.ok(await ui.ready);
 const view=ui.view;assert.deepEqual(Array.from(view.o.popup.a,x=>typeof x==='string'?x:x.name),['link','unlink','brush']);assert.equal(view.o.popup.img,null);assert.equal(view.o.controls.image.popup,null);assert.equal(view.o.controls.image.list,null);
 assert.deepEqual(Array.from(view.o.controls.fontsize.list),[8,10,12,14,16,18,24,32,48,72,96]);
 view.s.focus();view.s.setCursorIn(view.editor.querySelector('a'),true);view.e.fire('showPopup',view.editor.querySelector('a'),()=>({left:0,right:0,top:0,bottom:0,width:0,height:0}),'a');await new Promise(r=>setTimeout(r,150));
 assert.equal(doc.querySelector('.jodit-popup [data-ref=file]'),null);assert.ok(doc.querySelector('.jodit-popup [data-ref=unlink]'));
 view.e.fire('hidePopup');host.querySelector('[data-ref=fontsize] .jodit-toolbar-button__trigger').click();
 const menu=[...doc.querySelectorAll('.jodit-popup [role=button]')].map(n=>n.textContent.trim()).filter(x=>/^\d+px$/.test(x));assert.deepEqual(menu,['8px','10px','12px','14px','16px','18px','24px','32px','48px','72px','96px']);
});
test('NC04 supplied Brush tabs expose selected/panel relationships with pointer/keyboard state and are disposed',async t=>{
 const {host,deps,doc,w}=classicDOM(t),ui=mountStandardEditor(host,{source:'<p>SYNTHETIC color tabs</p>',dependencies:deps});assert.ok(await ui.ready);
 ui.view.s.focus();ui.view.s.select(ui.view.editor.querySelector('p'),true);host.querySelector('[data-ref=brush] .jodit-toolbar-button__trigger').click();
 const root=doc.querySelector('.author-classic-brush-tabs'),tabs=[...root.querySelectorAll('[role=tab]')],panels=[...root.querySelectorAll('[role=tabpanel]')];assert.equal(tabs.length,2);
 const check=idx=>tabs.forEach((tab,i)=>{assert.equal(tab.getAttribute('aria-selected'),String(i===idx));assert.equal(tab.tabIndex,i===idx?0:-1);assert.equal(tab.getAttribute('aria-controls'),panels[i].id);assert.equal(panels[i].getAttribute('aria-labelledby'),tab.id);assert.equal(panels[i].hidden,i!==idx);assert.equal(panels[i].classList.contains('jodit-tab_active'),i===idx);});
 check(0);tabs[1].click();check(1);tabs[1].dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true,cancelable:true}));check(0);assert.equal(doc.activeElement,tabs[0]);tabs[0].dispatchEvent(new w.KeyboardEvent('keydown',{key:'End',bubbles:true,cancelable:true}));check(1);
 const before=tabs.map(n=>n.getAttribute('aria-selected'));ui.dispose();panels[0].classList.add('jodit-tab_active');await Promise.resolve();assert.deepEqual(tabs.map(n=>n.getAttribute('aria-selected')),before);
});


test('ambiguous reordered or forged region mappings refuse visibly without changing the current input',async t=>{
 const {host,deps}=classicDOM(t),ui=mountStandardEditor(host,{source:'<p>Same</p>\r\n<p>Same</p>\r\n<p>Same</p>',dependencies:deps});t.after(()=>ui.dispose());assert.ok(await ui.ready);
 const view=ui.view;view.editor.append(view.editor.firstElementChild);view.setEditorValue();const retained=ui.model;
 assert.throws(()=>ui.getValue(),/Source-region order could not be proved/);assert.equal(ui.model,retained);
 view.editor.firstElementChild.setAttribute('data-classic-region','999');const forged=ui.model;assert.throws(()=>ui.getValue(),/Source-region order/);assert.equal(ui.model,forged);
});
