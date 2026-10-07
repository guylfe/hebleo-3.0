import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {JSDOM} from 'jsdom';
import {marked} from 'marked';
import DOMPurify from 'dompurify';
import {seed} from '../src/seed.js';
import {createVocabularyIndex, mountVocabularyBrowser, mountWordSelector, mountTagSelector} from '../public/studio/vocabulary-browser.js';
import {mountMarkdownEditor, createMarkdownPreview} from '../public/studio/markdown-editor.js';
import {applyExerciseEdits, mountExerciseEditor} from '../public/studio/exercise-editor.js';
import {Store} from '../src/store.js';
import {createServer} from '../src/server.js';

const syntheticWords = () => Array.from({length:2000}, (_,i) => ({...structuredClone(seed.words[i % seed.words.length]), id:`synthetic-ui-${i}`, tags:[`fixture-tag-${i%4}`]}));
function harness(t) {const dom = new JSDOM('<main></main>',{runScripts:'outside-only',pretendToBeVisual:true,url:'http://127.0.0.1/'}); t.after(()=>dom.window.close()); return {dom,host:dom.window.document.querySelector('main')};}
function input(dom,el,value) {el.value=value; el.dispatchEvent(new dom.window.Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));}
const tick=()=>new Promise(r=>setImmediate(r));

test('2000 synthetic words: complete search, tag/lesson intersection and bounded pagination without mutation',t=>{
  const words=syntheticWords(),before=structuredClone(words),lessons=[{id:'fixture-lesson',title:'Synthetic reference set',wordIds:words.slice(90,160).map(w=>w.id)}];
  const index=createVocabularyIndex({words,lessons});
  assert.equal(index.query({pageSize:2000}).words.length,50);
  assert.equal(index.query({search:'synthetic-ui-1999'}).words[0].id,'synthetic-ui-1999');
  assert.equal(index.query({search:seed.words[0].unpointed}).total,200);
  assert.equal(index.query({tag:'fixture-tag-2',lessonId:'fixture-lesson'}).total,18);
  assert.equal(index.query({page:9999}).page,39);
  const {dom,host}=harness(t), selected=[];
  const ui=mountVocabularyBrowser(host,{words,lessons,onSelect:(id,w)=>selected.push([id,w])});t.after(()=>ui.dispose());
  assert.equal(host.querySelectorAll('[data-vocab-row]').length,50);
  host.querySelector('[data-vocab-page="1"]').click();assert.match(host.textContent,/Page 2 of 40/);
  input(dom,host.querySelector('[data-vocab-search]'),'synthetic-ui-1999');assert.equal(host.querySelectorAll('[data-vocab-row]').length,1);
  host.querySelector('[data-vocab-id]').click();assert.equal(selected[0][0],'synthetic-ui-1999');assert.equal(selected[0][1],words[1999]);
  input(dom,host.querySelector('[data-vocab-search]'),'');input(dom,host.querySelector('[data-vocab-lesson]'),'fixture-lesson');
  input(dom,host.querySelector('[data-vocab-tag]'),'fixture-tag-2');assert.equal(host.querySelectorAll('[data-vocab-row]').length,18);
  input(dom,host.querySelector('[data-vocab-search]'),'no such synthetic term');assert.match(host.textContent,/No words match/);
  assert.deepEqual(words,before);
});

test('word selector keeps authored order and unresolved references through filters/remount; old buttons become inert',t=>{
  const words=syntheticWords(),{dom,host}=harness(t),changes=[];
  const ui=mountWordSelector(host,{words,selectedIds:['synthetic-ui-7','legacy-unresolved','synthetic-ui-1'],onSelectionChange:ids=>changes.push(ids)});
  input(dom,host.querySelector('[data-vocab-search]'),'synthetic-ui-1999');host.querySelector('[data-vocab-id]').click();
  assert.deepEqual(ui.getSelectedIds(),['synthetic-ui-7','legacy-unresolved','synthetic-ui-1','synthetic-ui-1999']);
  const old=host.querySelector('[data-vocab-id]');ui.dispose();old.click();assert.equal(changes.length,1);
  const second=mountWordSelector(host,{words,selectedIds:changes[0],onSelectionChange:ids=>changes.push(ids)});t.after(()=>second.dispose());
  host.querySelector('[data-vocab-id="synthetic-ui-1"]').click();assert.deepEqual(second.getSelectedIds(),['synthetic-ui-7','legacy-unresolved','synthetic-ui-1999']);
  assert.ok(host.querySelectorAll('[data-vocab-id]').length<=50);assert.equal(host.querySelectorAll('input[type=checkbox]').length,0);
});

test('tag selectors retain unknown tags, cap lists and keep multiple mounts independent',t=>{
  const {dom,host}=harness(t);host.innerHTML='<div id="a"></div><div id="b"></div>';
  const tags=Array.from({length:2000},(_,i)=>`synthetic-tag-${i}`),changes=[];
  const a=host.querySelector('#a'),b=host.querySelector('#b');
  const one=mountTagSelector(a,{tags,selectedTags:['legacy-tag'],onChange:x=>changes.push(x)}),two=mountTagSelector(b,{tags});
  t.after(()=>{one.dispose();two.dispose();});assert.equal(a.querySelectorAll('[data-tag]').length,50);
  input(dom,a.querySelector('input'),'synthetic-tag-1999');a.querySelector('[data-tag]').click();
  assert.deepEqual(changes[0],['legacy-tag','synthetic-tag-1999']);assert.deepEqual(two.getSelectedTags(),[]);
  input(dom,a.querySelector('input'),'legacy-tag');a.querySelector('[data-remove-tag]').click();assert.deepEqual(one.getSelectedTags(),['synthetic-tag-1999']);
  assert.equal(a.querySelectorAll('input[type=checkbox]').length,0);
});

test('search blur does not replace the pending pointer target or swallow the first selection',t=>{
  const {dom,host}=harness(t),words=syntheticWords(),changes=[];
  const ui=mountWordSelector(host,{words,onSelectionChange:ids=>changes.push(ids)});t.after(()=>ui.dispose());
  const search=host.querySelector('[data-vocab-search]');input(dom,search,'synthetic-ui-1999');
  const button=host.querySelector('[data-vocab-id]');button.dispatchEvent(new dom.window.MouseEvent('mousedown',{bubbles:true}));
  search.dispatchEvent(new dom.window.Event('change',{bubbles:true}));
  assert.equal(host.querySelector('[data-vocab-id]'),button);button.click();
  assert.deepEqual(changes,[['synthetic-ui-1999']]);
});

test('full source labels/search escape hostile content, preserve Nikkud and include unknown nested fields',t=>{
  const {dom,host}=harness(t),word={...seed.words[0],id:'fixture-escape',english:'<img src=x onerror=bad()>',sourceFields:{unknown:'unique-source-sentinel'},fieldFormatting:{pointed:{textFormatRuns:[{startIndex:2,format:{bold:true}}]}}};
  const ui=mountVocabularyBrowser(host,{words:[word]});t.after(()=>ui.dispose());
  assert.equal(host.querySelector('img'),null);assert.match(host.textContent,/אֲנִי/);
  input(dom,host.querySelector('input'),'unique-source-sentinel');assert.equal(host.querySelectorAll('[data-vocab-row]').length,1);
  assert.equal(word.fieldFormatting.pointed.textFormatRuns[0].startIndex,2);
});

async function editorDeps(dom) {
  // Execute the exact shipped browser bundle, with jsdom-only layout shims.
  dom.window.Range.prototype.getBoundingClientRect=()=>({left:0,right:0,top:0,bottom:0,width:0,height:0});
  dom.window.Range.prototype.getClientRects=()=>[];
  dom.window.focus=()=>{};
  dom.window.eval(await readFile(new URL('../public/studio/vendor/easymde.min.js',import.meta.url),'utf8'));
  return {EasyMDE:dom.window.EasyMDE,marked,purifier:DOMPurify(dom.window)};
}

test('actual EasyMDE bundle: Hebrew/RTL, toolbar formatting, sanitized preview, input bytes and disposal',async t=>{
  const {dom,host}=harness(t),deps=await editorDeps(dom),changes=[],directions=[];
  const source='אֲנִי **הוּא**\n\n<script>bad()</script><img src="https://example.invalid/remote.png" onerror="bad()">[bad](javascript:bad())';
  const ui=mountMarkdownEditor(host,{value:source,direction:'rtl',dependencies:deps,onChange:x=>changes.push(x),onDirectionChange:x=>directions.push(x)});
  const editor=await ui.ready;assert.ok(editor);assert.equal(ui.getValue(),source);assert.equal(changes.length,0);
  assert.equal(editor.codemirror.getOption('direction'),'rtl');
  assert.equal(editor.options.autoDownloadFontAwesome,false);assert.equal(editor.options.spellChecker,false);assert.equal(editor.options.autosave.enabled,false);
  assert.ok([...host.querySelectorAll('.editor-toolbar button')].every(b=>b.tabIndex===0&&b.getAttribute('aria-label')));
  ui.setValue('אֲנִי');assert.equal(changes.length,0);editor.codemirror.setSelection({line:0,ch:0},{line:0,ch:5});
  host.querySelector('.editor-toolbar .bold').click();assert.equal(ui.getValue(),'**אֲנִי**');assert.equal(changes.length,1);
  ui.setValue(source);host.querySelector('.editor-toolbar .preview').click();
  await new Promise(r=>setTimeout(r,10));
  const preview=host.querySelector('.editor-preview');assert.ok(preview.classList.contains('editor-preview-active'));
  assert.equal(preview.querySelector('script,img,[onerror],a[href^="javascript:"]'),null);
  assert.match(preview.textContent,/אֲנִי/);assert.equal(ui.getValue(),source);
  input(dom,host.querySelector('select'),'ltr');assert.deepEqual(directions,['ltr']);assert.equal(editor.codemirror.getOption('direction'),'ltr');
  const oldBold=host.querySelector('.bold'),before=changes.length;ui.dispose();oldBold.click();assert.equal(changes.length,before);assert.equal(host.childElementCount,0);
});

test('Markdown loader cancellation/failure leaves input intact and callbacks stop after disposal',async t=>{
  const {dom,host}=harness(t);let resolve,calls=0;
  const ui=mountMarkdownEditor(host,{value:'  אֲנִי  ',dependencies:new Promise(r=>resolve=r),onChange:()=>calls++});
  const old=host.querySelector('textarea');ui.dispose();resolve(await editorDeps(dom));assert.equal(await ui.ready,null);old.dispatchEvent(new dom.window.Event('input',{bubbles:true}));assert.equal(calls,0);assert.equal(host.childElementCount,0);
  const failed=mountMarkdownEditor(host,{value:'exact source',dependencies:Promise.reject(new Error('Fixture missing asset'))});
  assert.equal(await failed.ready,null);assert.equal(failed.getValue(),'exact source');assert.match(host.textContent,/still edit/);failed.dispose();
});

test('preview sanitizer rejects form/style/svg payloads while retaining pointed authored source',t=>{
  const {dom}=harness(t),preview=createMarkdownPreview(dom.window.document,marked,DOMPurify(dom.window));
  const result=preview('<svg onload="bad()"></svg><form><input></form><style>body{display:none}</style><p style="color:red" dir="rtl">אֲנִי</p>');
  const box=dom.window.document.createElement('div');box.innerHTML=result;
  assert.equal(box.querySelector('svg,form,input,style,[style],[onload]'),null);assert.match(box.textContent,/אֲנִי/);
});

test('vendored editor bytes match locked installed distribution and have license notices',async()=>{
  for(const name of ['easymde.min.js','easymde.min.css']) {
    const local=await readFile(new URL('../public/studio/vendor/'+name,import.meta.url)),installed=await readFile(new URL('../node_modules/easymde/dist/'+name,import.meta.url));
    assert.equal(createHash('sha256').update(local).digest('hex'),createHash('sha256').update(installed).digest('hex'));
  }
  for(const name of ['EasyMDE','CodeMirror','Marked-bundled','SpellChecker','TypoJS'])assert.match(await readFile(new URL('../public/studio/vendor/'+name+'-LICENSE.txt',import.meta.url),'utf8'),/Permission|Redistribution/);
});

test('native exercise HTTP save retains legacy flags/source metadata; CAS failure preserves input and all database tables',async t=>{
  const {dom,host}=harness(t),store=new Store();t.after(()=>store.close());
  const server=createServer(store);await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
  const url=`http://127.0.0.1:${server.address().port}`,content=structuredClone(seed),exercise=content.exercises[1];
  exercise.requireNikkud=true;exercise.extension={unknown:'source-sentinel'};
  const beforeLearners=store.backup().learners,requests=[];
  async function saveDraft(body) {
    requests.push(structuredClone(body));const response=await fetch(url+'/api/studio/draft',{method:'POST',headers:{'Content-Type':'application/json','X-Demo-User':'author-demo'},body:JSON.stringify(body)});
    const data=await response.json();if(!response.ok)throw Object.assign(new Error(data.error),data,{status:response.status});return data;
  }
  const dispose=mountExerciseEditor(host,{content,exerciseId:exercise.id,baseRevisionId:1,saveDraft});t.after(dispose);
  const form=host.querySelector('form');assert.equal(form.querySelector('[name="requireNikkud"]'),null);
  assert.ok(form.querySelector('.studio-concept-metadata [name="concept"]'));assert.ok(form.querySelector('.studio-authored-feedback [name="feedbackDetails"]'));
  input(dom,form.elements.feedbackDetails,'exact authored fixture feedback');
  form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));
  for(let i=0;i<100&&!/Draft saved/.test(form.textContent);i++)await new Promise(r=>setTimeout(r,10));
  assert.match(form.textContent,/Draft saved/);assert.equal(requests[0].content.exercises[1].requireNikkud,true);
  assert.deepEqual(store.currentDraft().content.exercises[1].extension,exercise.extension);assert.deepEqual(store.backup().learners,beforeLearners);
  assert.deepEqual(store.snapshot(),seed);assert.throws(()=>applyExerciseEdits(exercise,{requireNikkud:false}),/read-only/);
  const token=store.currentDraft().draftToken;await saveDraft({baseRevisionId:1,expectedDraftToken:token,word:{id:seed.words[0].id,notes:'synthetic concurrent writer'}});
  const dump=()=>JSON.stringify(store.db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(({name})=>[name,store.db.prepare(`SELECT * FROM "${name}" ORDER BY rowid`).all()]));
  const before=dump();input(dom,form.elements.feedback,'retained conflict input');form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));
  for(let i=0;i<100&&!/changed elsewhere/.test(form.textContent);i++)await new Promise(r=>setTimeout(r,10));
  assert.match(form.textContent,/changed elsewhere/);assert.equal(form.elements.feedback.value,'retained conflict input');assert.equal(dump(),before);
});
