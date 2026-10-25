import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {mountTextPagesEditor,moveTextPage} from '../public/studio/text-pages-editor.js';
import {mountUnifiedStudio} from '../public/studio/unified-studio.js';
import {seed} from '../src/seed.js';
import {projectLesson} from '../public/course.js';

const fixture=()=>({version:1,extension:{retain:true},pages:[{id:'stable.alpha',type:'reading',title:'Alpha',html:'Original',sourceStage:'learn',sourceRefs:[{locator:'original-source'}],provenance:{status:'adapted-draft'},unknown:{keep:['all']}},{id:'stable.beta',type:'choice',title:'Beta',options:['one','two'],answer:1,explanation:'authored',gate:'commit'}],order:['stable.alpha','stable.beta']});
function harness(t,value=fixture(),options={}){const dom=new JSDOM('<main></main>'),w=dom.window,host=w.document.querySelector('main'),changes=[];const editor=mountTextPagesEditor(host,{value,newId:()=>w.crypto.randomUUID(),wordIds:['canonical.word'],targetIds:['draft.target'],onChange:v=>changes.push(v),...options});t.after(()=>{editor.dispose();dom.window.close();});
 const click=a=>host.querySelector('[data-page-action="'+a+'"]').click();
 const change=(name,value)=>{const el=host.querySelector('[data-page-field="'+name+'"]');el.value=value;el.dispatchEvent(new w.Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));};
 const select=id=>{const el=host.querySelector('[data-page-select]');el.value=id;el.dispatchEvent(new w.Event('change',{bubbles:true}));};
 return {dom,w,host,editor,changes,click,change,select};}

test('edit, reorder twice, JSON reload, remove/restore preserve stable IDs and every unknown source field',t=>{
 const original=fixture(),h=harness(t,original);h.change('title','Edited title');h.click('down');assert.deepEqual(h.editor.getValue().order,['stable.beta','stable.alpha']);assert.equal(h.w.document.activeElement.tagName,'SELECT');h.click('up');
 let value=h.editor.getValue();assert.deepEqual(value.pages.map(p=>p.id),original.pages.map(p=>p.id));assert.deepEqual(value.pages[0].sourceRefs,original.pages[0].sourceRefs);assert.deepEqual(value.pages[0].unknown,original.pages[0].unknown);assert.deepEqual(value.extension,original.extension);assert.equal(original.pages[0].title,'Alpha');
 h.click('remove');assert.deepEqual(h.editor.getValue().order,['stable.beta']);h.click('undo');assert.deepEqual(h.editor.getValue().order,original.order);assert.equal(h.editor.getValue().pages.find(p=>p.id==='stable.alpha').title,'Edited title');
 value=JSON.parse(JSON.stringify(value));const second=harness(t,value);second.select('stable.beta');second.click('up');const twice=JSON.parse(JSON.stringify(second.editor.getValue()));assert.deepEqual(new Set(twice.order),new Set(original.order));assert.equal(twice.pages.find(p=>p.id==='stable.beta').answer,1);assert.deepEqual(twice.pages.find(p=>p.id==='stable.alpha').provenance,{status:'adapted-draft'});
 assert.deepEqual(moveTextPage(original,'absent',1),original);
});

test('new pages use UUIDs; author can change type, timing, models, options, gate and exact text without changing identity',t=>{
 const h=harness(t,undefined);h.click('add');const id=h.editor.getValue().order.at(-1);assert.match(id,/^[0-9a-f-]{36}$/);h.change('type','timedRecall');h.change('value','0704177609112001');h.change('durationMs','10000');h.change('answer','Author model');h.change('gate','reveal');
 let p=h.editor.getValue().pages.find(p=>p.id===id);assert.equal(p.durationMs,10000);assert.equal(p.value,'0704177609112001');assert.equal(p.grading,'self-check');assert.equal(p.accessibleAlternative,true);assert.equal(p.gate,'reveal');
 h.change('type','choice');h.change('options','Yes\nNo\nMaybe');h.change('answer','3');h.change('explanation','Explicit feedback');p=h.editor.getValue().pages.find(p=>p.id===id);assert.equal(p.answer,2);assert.deepEqual(p.options,['Yes','No','Maybe']);assert.equal(p.explanation,'Explicit feedback');assert.equal(p.id,id);
});

test('invalid timings, options, media and unknown vocabulary block save while retaining entered values and recovery',t=>{
 const h=harness(t,{version:1,pages:[{id:'timer',type:'timedRecall',title:'Memory',value:'001',durationMs:10000,answer:'model'}],order:['timer']});
 h.change('durationMs','99');assert.throws(()=>h.editor.getValue(),/100 to 120000/);assert.equal(h.host.querySelector('[data-page-field="durationMs"]').value,'99');assert.equal(h.host.querySelector('[data-page-field="durationMs"]').getAttribute('aria-invalid'),'true');h.change('durationMs','120000');assert.equal(h.editor.getValue().pages[0].durationMs,120000);
 h.change('media','bad json');assert.throws(()=>h.editor.getValue());h.change('media','{"video":{"url":"https://fixture.invalid/native.mp4","source":{"retain":true}}}');assert.deepEqual(h.editor.getValue().pages[0].media.video.source,{retain:true});
 h.change('type','choice');h.change('options','only one');assert.throws(()=>h.editor.getValue(),/2–20/);h.change('options','First\nSecond');h.change('answer','2');assert.equal(h.editor.getValue().pages[0].answer,1);
 h.change('type','vocabulary');h.change('wordIds','prototype.word.1');assert.throws(()=>h.editor.getValue(),/existing canonical/);h.change('wordIds','canonical.word');h.change('unresolvedTargetIds','draft.target');assert.deepEqual(h.editor.getValue().pages[0].wordIds,['canonical.word']);assert.deepEqual(h.editor.getValue().pages[0].unresolvedTargetIds,['draft.target']);
});

test('unified Studio collects page edits with sibling text and title edits, preserving existing block identity and workspace save',async t=>{
 const dom=new JSDOM('<main></main>'),host=dom.window.document.querySelector('main'),content=structuredClone(seed);content.lessons[0]=projectLesson(content,content.lessons[0]);const l=content.lessons[0],source=l.blocks.find(b=>b.type==='explanation');source.textPages=fixture();let saved;
 const editor=mountUnifiedStudio(host,{content,lessonId:l.id,baseRevisionId:1,saveDraft:async input=>{saved=input;return {draftToken:'saved'};},markdownDependencies:{}});t.after(()=>{editor.dispose();dom.window.close();});
 const title=host.querySelector('[data-lesson-metadata] [name="title"]');title.value='Sibling title edit';title.dispatchEvent(new dom.window.Event('input',{bubbles:true}));
 const pageTitle=host.querySelector('[data-page-field="title"]');pageTitle.value='Native page edit';pageTitle.dispatchEvent(new dom.window.Event('input',{bubbles:true}));
 host.querySelector('[data-page-action="down"]').click();host.querySelector('[data-save-workspace]').click();await new Promise(r=>setTimeout(r,60));
 assert.ok(saved);const next=saved.content.lessons.find(x=>x.id===l.id),block=next.blocks.find(b=>b.id===source.id);assert.equal(next.title,'Sibling title edit');assert.equal(block.textPages.pages.find(p=>p.id==='stable.alpha').title,'Native page edit');assert.deepEqual(block.textPages.order,['stable.beta','stable.alpha']);assert.deepEqual(block.textPages.pages[0].unknown,{keep:['all']});assert.deepEqual(saved.content.words,content.words);
});
