import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFile} from 'node:fs/promises';
import {marked} from 'marked';
import DOMPurify from 'dompurify';
import {seed} from '../src/seed.js';
import {Store} from '../src/store.js';
import {createServer} from '../src/server.js';
import {mountUnifiedStudio} from '../public/studio/unified-studio.js';
import {blankExercise,exerciseTypes,validateExerciseDraft,mountExerciseEditor} from '../public/studio/exercise-editor.js';

// All authored strings below are isolated synthetic test sentinels, not curriculum.
const edit=(d,el,value,type='input')=>{assert.ok(el);el.value=value;el.dispatchEvent(new d.window.Event(type,{bubbles:true}));};
const change=(d,el,value)=>edit(d,el,value,'change');
const tick=()=>new Promise(r=>setTimeout(r,10));
async function until(fn){for(let n=0;n<100;n++){if(fn())return;await tick();}throw new Error('DOM/HTTP did not settle');}
function harness(t,options={}){
 const d=new JSDOM('<main></main>',{url:'http://127.0.0.1/',pretendToBeVisual:true,runScripts:'outside-only'}),host=d.window.document.querySelector('main');let n=0;
 const c=structuredClone(seed);options.fixture?.(c);c.exercises.forEach(x=>x.sourceUnknown={exact:['retain',x.id]});
 const h=mountUnifiedStudio(host,{content:c,lessonId:'lesson-1',baseRevisionId:1,newId:p=>p+'-synthetic-'+(++n),saveDraft:async()=>({draftToken:'test-token'}),markdownDependencies:options.editorDependencies?.(d),...options});
 t.after(()=>{h.dispose();d.window.close();});return {d,host,h,c};
}
async function http(t){const store=new Store(),server=createServer(store);await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(async()=>{await new Promise(r=>server.close(r));store.close();});
 const origin='http://127.0.0.1:'+server.address().port;
 const post=async(endpoint,input)=>{const r=await fetch(origin+endpoint,{method:'POST',headers:{'content-type':'application/json','x-demo-user':'author-demo'},body:JSON.stringify(input)});const b=await r.json();if(!r.ok)throw Object.assign(new Error(b.error),{status:r.status,...b});return b;};
 return {store,post,stage:input=>post('/api/studio/draft',input)};
}
const tables=store=>store.db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(({name})=>[name,store.db.prepare('SELECT * FROM '+name+' ORDER BY rowid').all()]);
const form=(host,id)=>host.querySelector('[data-owned-exercise="'+id+'"] form');
const actions=(host,id='')=>host.querySelector('[data-exercise-actions="'+id+'"]');
function addRows(d,f,key,values){for(const v of values){f.querySelector('[data-list-add="'+key+'"]').click();edit(d,[...f.querySelectorAll('[name="'+key+'"]')].at(-1),v);}}
function create(d,host,type,after=''){const a=actions(host,after);change(d,a.querySelector('[data-new-exercise-type]'),type);a.querySelector('[data-create-exercise]').click();return [...host.querySelectorAll('[data-owned-exercise]')].find(el=>el.dataset.ownedExercise.startsWith('exercise-synthetic-')).dataset.ownedExercise;}

 test('single wrapping title with persistent cue; keyboard settings follow content and no nested forms',t=>{
 const {host}=harness(t);assert.equal(host.querySelectorAll('[name=title]').length,1);assert.equal(host.querySelector('[name=title]').tagName,'TEXTAREA');assert.match(host.querySelector('.studio-inline-title').textContent,/edit here.*✎.*Edit the title/s);assert.equal(host.querySelector('[name=title]').closest('header').className,'studio-selected-header');assert.equal(host.querySelector('form form'),null);
 const list=host.querySelector('[data-component-list]'),keyboard=host.querySelector('.studio-cumulative-letters');assert.ok(list.compareDocumentPosition(keyboard)&4);assert.equal(host.querySelector('[name=introducedLetters]').form,host.querySelector('[data-lesson-metadata]'));assert.equal(host.querySelectorAll('[data-edit-exercise="ex-1-type"]').length,1);
 });

for(const type of exerciseTypes)test('blank '+type+' creation, response validation, stable instances and actual HTTP stage',async t=>{
 const {store,stage,post}=await http(t),{d,host,h,c}=harness(t,{saveDraft:stage,fixture:type==='ordering'?c=>c.lessons[0].wordIds=c.words.map(w=>w.id):undefined});
 edit(d,host.querySelector('[name=title]'),'Synthetic long title\nsecond line');edit(d,host.querySelector('[data-component-markdown] textarea'),'  Synthetic retained sibling text  ');edit(d,host.querySelector('[data-canonical-word] [name=notes]'),'Synthetic word note');
 const id=create(d,host,type,'legacy-explanation'),x=h.getContent().exercises.find(x=>x.id===id),f=form(host,id);
 assert.deepEqual(x,blankExercise(type,{id,lessonId:'lesson-1'}));const instance=h.getContent().lessons[0].blocks[1];assert.deepEqual(instance.selector.ids,[id]);assert.equal(instance.role,'check');assert.notEqual(instance.id,id);
 await assert.rejects(h.save(),/exercise prompt/);assert.equal(store.currentDraft(),null);edit(d,f.elements.prompt,'Synthetic authored '+type+' prompt');await assert.rejects(h.save());assert.equal(f.elements.prompt.value,'Synthetic authored '+type+' prompt');assert.equal(d.window.document.activeElement,f.elements.prompt);
 if(['recognition','typing'].includes(type))f.querySelector('[data-vocab-id="w-ani"]').click();
 if(type==='recognition')addRows(d,f,'distractors',[' Synthetic choice one ','Synthetic choice two']);
 if(type==='matching')for(const word of ['w-ani','w-mi','w-hu'])f.querySelector('[data-vocab-id="'+word+'"]').click();
 if(type==='ordering'){addRows(d,f,'tokens',['ב','בית','אני']);const prefix=f.querySelector('[data-prefix]');prefix.checked=true;prefix.dispatchEvent(new d.window.Event('change',{bubbles:true}));}
 if(['typing','ordering','cloze','transformation'].includes(type))addRows(d,f,'answers',['  אֲנִי  ','אני',' Synthetic answer three ','Synthetic answer four']);
 if(['cloze','transformation'].includes(type))edit(d,f.elements.context,'Synthetic context');
 edit(d,f.elements.concept,'Synthetic separate concept');edit(d,f.elements.feedback,'Synthetic short feedback');edit(d,f.elements.feedbackDetails,'Synthetic detailed feedback');
 host.querySelector('[data-view-layout]').click();assert.equal(host.querySelector('h2').textContent,'Synthetic long title\nsecond line');host.querySelector('[data-edit-exercise="'+id+'"]').click();assert.equal(host.querySelector('[name=title]').value,'Synthetic long title\nsecond line');
 host.querySelector('[data-component-move="'+instance.id+'"][data-delta="1"]').click();const submitted=form(host,id);submitted.dispatchEvent(new d.window.Event('submit',{bubbles:true,cancelable:true}));await until(()=>store.currentDraft()||/retained/.test(host.querySelector('[data-unified-status]').textContent));assert.ok(store.currentDraft(),host.querySelector('[data-unified-status]').textContent);
 const saved=store.currentDraft().content,answer=saved.exercises.find(x=>x.id===id);assert.equal(saved.lessons[0].title,'Synthetic long title\nsecond line');assert.equal(saved.lessons[0].blocks.find(b=>b.id==='legacy-explanation').text,'  Synthetic retained sibling text  ');assert.equal(saved.words[0].notes,'Synthetic word note');assert.equal(saved.lessons[0].blocks[2].id,instance.id);assert.deepEqual(saved.exercises.slice(0,c.exercises.length),c.exercises);
 if(answer.answers)assert.deepEqual(answer.answers,['  אֲנִי  ','אני',' Synthetic answer three ','Synthetic answer four']);if(type==='ordering')assert.deepEqual(answer.prefixTokenIndices,[0]);if(type==='matching')assert.deepEqual(answer.wordIds,['w-ani','w-mi','w-hu']);
 const before=tables(store);edit(d,host.querySelector('[name=title]'),'Synthetic unsaved later title');const preview=await post('/api/studio/preview/session',{lessonId:'lesson-1',draftToken:store.currentDraft().draftToken});assert.equal(preview.content.lessons[0].title,'Synthetic long title\nsecond line');assert.equal(preview.content.exercises.find(x=>x.id===id).answers,undefined);assert.deepEqual(tables(store),before);assert.equal(store.snapshot().lessons[0].title,c.lessons[0].title);
 });

test('untouched legacy typing never gains answers; explicit list edits copy only exact word forms and never global vocabulary',async t=>{
 const {store,stage}=await http(t),{d,host,h,c}=harness(t,{saveDraft:stage});const original=c.exercises.find(x=>x.id==='ex-1-type'),w=c.words.find(w=>w.id===original.wordId);
 assert.deepEqual([...form(host,original.id).querySelectorAll('[name=answers]')].map(el=>el.value),[...new Set([w.pointed,w.unpointed])]);await h.save();assert.equal(store.currentDraft().content.exercises.find(x=>x.id===original.id).answers,undefined);
 const f=form(host,original.id);addRows(d,f,'answers',['  אָדָם  ','Synthetic exact fifth form']);f.querySelector('[data-list=answers] [data-list-remove]').click();const expected=[w.unpointed,'  אָדָם  ','Synthetic exact fifth form'];await h.save();assert.deepEqual(store.currentDraft().content.exercises.find(x=>x.id===original.id).answers,expected);assert.deepEqual(store.currentDraft().content.words,c.words);assert.deepEqual(store.currentDraft().content.exercises.find(x=>x.id===original.id).sourceUnknown,original.sourceUnknown);
 });

test('same-ID reuse, Add text, switches, moves and successive single CAS saves preserve every sibling and unknown field',async t=>{
 const {store,stage}=await http(t),{d,host,h,c}=harness(t,{saveDraft:stage});const id='ex-1-type';
 edit(d,host.querySelector('[name=title]'),'Synthetic title');edit(d,host.querySelector('[data-component-markdown] textarea'),'Synthetic first text');addRows(d,form(host,id),'answers',['Synthetic local exact answer']);edit(d,form(host,'ex-1-recognize').elements.prompt,'Synthetic sibling question');edit(d,host.querySelector('[data-canonical-word] [name=english]'),'Synthetic changed meaning');
 const a=actions(host,'legacy-explanation');change(d,a.querySelector('[data-reuse-choice]'),id);a.querySelector('[data-reuse-exercise]').click();assert.equal(h.getContent().exercises.length,c.exercises.length);const reference=h.getContent().lessons[0].blocks[1];assert.deepEqual(reference.selector.ids,[id]);
 actions(host,'legacy-explanation').querySelector('[data-add-text]').click();const newText=h.getContent().lessons[0].blocks[1];assert.equal(newText.text,'');edit(d,host.querySelector('[data-component-id="'+newText.id+'"] textarea'),'Synthetic second text');
 change(d,host.querySelector('[data-current-lesson]'),'lesson-2');change(d,host.querySelector('[data-current-lesson]'),'lesson-1');host.querySelector('[data-component-move="'+reference.id+'"][data-delta="1"]').click();host.querySelector('[data-view-layout]').click();host.querySelector('[data-view-layout]').click();await h.save();
 let saved=store.currentDraft().content;assert.equal(saved.lessons[0].title,'Synthetic title');assert.equal(saved.lessons[0].blocks.find(x=>x.id===newText.id).text,'Synthetic second text');assert.equal(saved.lessons[0].blocks.find(x=>x.id==='legacy-explanation').text,'Synthetic first text');assert.equal(saved.exercises[0].prompt,'Synthetic sibling question');assert.equal(saved.words[0].english,'Synthetic changed meaning');assert.equal(saved.exercises.length,c.exercises.length);assert.deepEqual(saved.exercises.find(x=>x.id===id).answers,[...new Set([c.words[0].pointed,c.words[0].unpointed]),'Synthetic local exact answer']);
 const owners=host.querySelectorAll('[data-owned-exercise="'+id+'"]');assert.equal(owners.length,1);edit(d,owners[0].querySelector('[name=feedback]'),'Synthetic feedback after reuse');await h.save();saved=store.currentDraft().content;assert.equal(saved.exercises.find(x=>x.id===id).feedback,'Synthetic feedback after reuse');assert.equal(saved.lessons[0].blocks.find(x=>x.id===newText.id).text,'Synthetic second text');
 });

test('deliberate cross-lesson reuse keeps canonical ID; current membership contract blocks save with draft retained',async t=>{
 let saves=0;const {d,host,h,c}=harness(t,{saveDraft:async()=>{saves++;return {};}});const id='ex-2-cloze',a=actions(host);change(d,a.querySelector('[data-reuse-choice]'),id);assert.equal(a.querySelector('[data-cross-lesson-label]').hidden,false);a.querySelector('[data-reuse-exercise]').click();assert.equal(h.getContent().lessons[0].blocks.some(b=>b.selector?.ids?.includes(id)),false);assert.match(host.querySelector('[data-unified-status]').textContent,/Confirm deliberate/);
 a.querySelector('[data-cross-lesson-confirm]').checked=true;a.querySelector('[data-reuse-exercise]').click();assert.equal(h.getContent().exercises.length,c.exercises.length);assert.ok(h.getContent().lessons[0].blocks.some(b=>b.selector?.ids?.includes(id)));assert.match(host.textContent,/require Lead membership integration/);edit(d,form(host,id).elements.prompt,'Synthetic shared change');await assert.rejects(h.save(),/must belong/);assert.equal(saves,0);assert.equal(form(host,id).elements.prompt.value,'Synthetic shared change');
 });

test('answer-only typing is authored locally but base server rejection is retained until Lead schema/grading integration',async t=>{
 const {store,stage}=await http(t),{d,host,h}=harness(t,{saveDraft:stage});const id=create(d,host,'typing'),f=form(host,id);edit(d,f.elements.prompt,'Synthetic answer-only question');addRows(d,f,'answers',['Synthetic author response']);await assert.rejects(h.save(),/Missing exercise word/);assert.equal(store.currentDraft(),null);assert.equal(f.elements.prompt.value,'Synthetic answer-only question');assert.equal(f.elements.answers.value,'Synthetic author response');
 });

test('dependency callback displays server scope, refreshes before Save, rejects malformed shape and ignores stale selection responses',async t=>{
 const calls=[];let resolveOld;const callback=async input=>{calls.push(input);if(input.exerciseId==='ex-1-recognize'&&!resolveOld)return new Promise(r=>resolveOld=r);return {exerciseId:input.exerciseId,lessons:[{id:'lesson-1',title:'Synthetic server lesson'}],lessonCount:1,componentCount:3,activeRevisionId:1,draftToken:null};};
 const {d,host,h}=harness(t,{getExerciseDependencies:callback});const a=actions(host);change(d,a.querySelector('[data-reuse-choice]'),'ex-1-type');await tick();assert.match(a.querySelector('[data-reuse-scope]').textContent,/Server scope: 1 lessons, 3 component references/);resolveOld({exerciseId:'ex-1-recognize',lessons:[],lessonCount:0,componentCount:0,activeRevisionId:1,draftToken:null});await tick();assert.match(a.querySelector('[data-reuse-scope]').textContent,/ex-1-type/);
 const before=calls.length;edit(d,form(host,'ex-1-type').elements.prompt,'Synthetic edited');await h.save();assert.ok(calls.length>before);assert.ok(calls.every(x=>x.signal&&x.baseRevisionId===1));
 const second=harness(t,{getExerciseDependencies:async()=>({lessons:[]})});await tick();assert.match(second.host.querySelector('[data-exercise-dependencies]').textContent,/Invalid dependency callback result/);
 });

test('blank answer rows and ordering prefix remapping survive failed save without truncation or generated alternatives',async t=>{
 const {d,host,h}=harness(t,{lessonId:'lesson-2'}),f=form(host,'ex-2-order');const tokens=[...f.querySelectorAll('[data-list=tokens] [data-list-row]')];tokens[0].querySelector('[data-list-remove]').click();const remaining=f.querySelector('[data-prefix]');remaining.checked=true;remaining.dispatchEvent(new d.window.Event('change',{bubbles:true}));addRows(d,f,'answers',['  exact synthetic variant  ','']);await assert.rejects(h.save(),/row.*blank/);assert.equal([...f.querySelectorAll('[name=answers]')].at(-2).value,'  exact synthetic variant  ');[...f.querySelectorAll('[data-list=answers] [data-list-row]')].at(-1).querySelector('[data-list-remove]').click();await h.save();const next=h.getContent().exercises.find(x=>x.id==='ex-2-order');assert.deepEqual(next.prefixTokenIndices,[0]);assert.equal(next.answers.at(-1),'  exact synthetic variant  ');
 });


test('View layout uses the actual bundled Markdown sanitizer, preserves source, and validation returns from layout to the invalid editor',async t=>{
 const editorDependencies=async d=>{d.window.Range.prototype.getBoundingClientRect=()=>({left:0,right:0,top:0,bottom:0,width:0,height:0});d.window.Range.prototype.getClientRects=()=>[];d.window.focus=()=>{};d.window.eval(await readFile(new URL('../public/studio/vendor/easymde.min.js',import.meta.url),'utf8'));return {EasyMDE:d.window.EasyMDE,marked,purifier:DOMPurify(d.window)};};
 const {d,host,h}=harness(t,{editorDependencies});await until(()=>host.querySelector('[data-markdown-status]').textContent==='Markdown editor ready. Preview shows unpublished text.');
 const source='אֲנִי **הוּא**\n\n<script>bad()</script><img src="https://example.invalid/p.png" onerror="bad()">';host.querySelector('.CodeMirror').CodeMirror.setValue(source);host.querySelector('[data-view-layout]').click();await until(()=>host.querySelector('[data-layout-text] strong'));
 const preview=host.querySelector('[data-layout-text]');assert.equal(preview.querySelector('img,script,[onerror]'),null);assert.match(preview.textContent,/אֲנִי/);assert.equal(h.getContent().lessons[0].blocks.find(x=>x.id==='legacy-explanation').text,source);
 host.querySelector('[data-view-layout]').click();addRows(d,form(host,'ex-1-type'),'answers',['']);host.querySelector('[data-view-layout]').click();await assert.rejects(h.save(),/blank/);assert.ok(host.querySelector('[name=title]'));assert.equal(host.querySelector('.studio-view-layout'),null);assert.equal(d.window.document.activeElement,form(host,'ex-1-type').elements.prompt);assert.equal([...form(host,'ex-1-type').querySelectorAll('[name=answers]')].at(-1).value,'');
});
