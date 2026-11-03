import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {marked} from 'marked';
import createPurifier from 'dompurify';
import {createLessonRenderer} from '../public/rich.js';
import {mountTextReader} from '../public/text-reader.js';
import {memoryComparison} from '../public/source-activities.js';
import {validateTextResponse,textGatesPassed} from '../public/text-contract.js';
import {Store,validateContent} from '../src/store.js';
import {seed} from '../src/seed.js';
import {replaceFirstTwo,installFirstTwo} from '../scripts/install-first2.mjs';
import {mountTextPagesEditor} from '../public/studio/text-pages-editor.js';
const pack=JSON.parse(readFileSync(new URL('../content/first2/history/revision5.json',import.meta.url)));
const memory=pack.lessons[0].blocks[0].textPages,letters=pack.lessons[1].blocks[0].textPages;
const page=(pages,kind)=>pages.pages.find(p=>p.activity?.kind===kind);
function clock(){let now=0,id=0;const jobs=new Map();return {now:()=>now,schedule:(f,ms)=>{jobs.set(++id,{f,at:now+ms});return id;},cancel:id=>jobs.delete(id),advance(ms){now+=ms;for(const [id,j]of [...jobs])if(j.at<=now){jobs.delete(id);j.f();}},get count(){return jobs.size;}};}
function harness(t,textPages,options={}){
 const dom=new JSDOM('<main></main>',{pretendToBeVisual:true,url:'http://127.0.0.1'}),w=dom.window,host=w.document.querySelector('main'),fake=clock(),saves=[];
 const binding=mountTextReader(host,{textPages,renderLesson:createLessonRenderer(marked,createPurifier(w),w.document),clock:fake,dock:false,saveProgress:async record=>saves.push(record),...options});
 t.after(()=>{binding.destroy();w.close();});
 return {w,host,binding,clock:fake,saves,click:a=>host.querySelector('[data-source-action="'+a+'"]')?.click(),input:text=>{const el=host.querySelector('[data-source-input]');assert.ok(el);el.value=text;el.dispatchEvent(new w.Event('input',{bubbles:true}));},choose:i=>{const el=host.querySelectorAll('[name="source-choice"]')[i];el.checked=true;el.dispatchEvent(new w.Event('change',{bubbles:true}));}};
}
const single=p=>({version:1,activityVersion:1,pages:[p],order:[p.id]});
test('historical source text, bold 70-hour emphasis, stable page and activity identities; no template vocabulary',()=>{
 assert.deepEqual(pack.lessons.map(l=>l.id),['MEMORY-A2','MNTL-A2']);
 assert.ok(memory.pages[1].html.includes('70 hours'));assert.match(memory.pages[1].html,/<strong>[^<]*70[^<]*<\/strong>/);
 assert.equal(letters.pages.filter(p=>p.stage==='Learn').length,3);assert.equal(letters.pages[0].id,'MNTL-A2.learn.mem-nun');
 assert.equal(letters.pages.some(p=>p.id==='MNTL-A2.learn.tav-lamed'),false);
 assert.deepEqual(letters.pages.slice(1,8).map(p=>p.activity.id),['MNTL-A2.embedded.nun','MNTL-A2.embedded.copy-lamed','MNTL-A2.check.tav','MNTL-A2.apply.four-sounds','MNTL-A2.apply.mem','MNTL-A2.apply.lamed','MNTL-A2.apply.say-four']);
 assert.ok(pack.lessons.every(l=>!l.wordIds.length&&!l.blocks.some(b=>b.type==='vocabulary')));
});
test('user-started exact ten seconds, leading zero, hidden before input, one attempt, honest complete feedback',async t=>{
 const p=page(memory,'memory-first'),h=harness(t,single(p));assert.doesNotMatch(h.host.textContent,/0704177609112001/);assert.equal(h.clock.count,0);assert.equal(h.host.querySelector('textarea'),null);
 h.click('play');assert.equal(h.host.querySelector('.source-number').textContent,p.activity.value);h.clock.advance(9999);assert.ok(h.host.querySelector('.source-number'));assert.equal(h.host.querySelector('textarea'),null);h.clock.advance(1);assert.equal(h.host.querySelector('.source-number'),null);assert.ok(h.host.querySelector('textarea'));h.input(p.activity.value);h.click('submit-first');assert.match(h.host.textContent,/You remembered it/);assert.equal(h.host.querySelector('[data-source-action="play"]'),null);assert.doesNotMatch(h.host.textContent,/Correct|Incorrect|Try again/);await h.binding.settled();assert.equal(h.saves.at(-1).response.text,p.activity.value);
});
test('empty/skip/interrupted first recall all continue; restored started timer never replays',t=>{
 const p=page(memory,'memory-first'),h=harness(t,single(p));h.click('skip');assert.equal(textGatesPassed(single(p),h.binding.getState()),true);
 const e=harness(t,single(p));e.click('play');e.clock.advance(10000);e.click('submit-first');assert.match(e.host.textContent,/lot of digits/);
 const i=harness(t,single(p));i.click('play');Object.defineProperty(i.w.document,'hidden',{value:true,configurable:true});i.w.document.dispatchEvent(new i.w.Event('visibilitychange'));assert.equal(i.clock.count,0);assert.equal(i.host.querySelector('.source-number'),null);i.click('skip');assert.equal(textGatesPassed(single(p),i.binding.getState()),true);
 const restored=harness(t,single(p),{initialState:{responses:{[p.id]:{started:true}}}});assert.ok(restored.host.querySelector('textarea'));assert.equal(restored.host.querySelector('[data-source-action="play"]'),null);
});
test('three exact date stages, delayed labels, deliberate three reveals, retained bold titles and reduced-motion steps',t=>{
 const p=page(memory,'date-connection'),h=harness(t,single(p));h.w.matchMedia=()=>({matches:true});assert.doesNotMatch(h.host.textContent,/1776/);h.click('animate');assert.equal(h.host.querySelector('.source-number').textContent,'0704177609112001');assert.equal(h.clock.count,0);h.click('animation-next');assert.equal(h.host.querySelector('.source-number').textContent,'07041776 · 09112001');assert.doesNotMatch(h.host.textContent,/Declaration/);h.click('animation-next');assert.equal(h.host.querySelector('.source-number').textContent,'07/04/1776 · 09/11/2001');assert.match(h.host.textContent,/Declaration/);assert.equal(h.host.querySelectorAll('strong').length,0);for(let i=0;i<3;i++){h.click('principle');assert.equal(h.host.querySelectorAll('strong').length,i+1);}assert.equal(h.host.querySelector('[data-source-action="principle"]'),null);assert.equal(textGatesPassed(single(p),h.binding.getState()),true);
});
test('application question gives every authored option feedback and B explanation without mastery gate',t=>{
 const p=memory.pages.find(p=>p.type==='choice');for(let i=0;i<3;i++){const h=harness(t,single(p));assert.doesNotMatch(h.host.textContent,/Yes\. Two date/);h.choose(i);h.click('check-choice');assert.ok(h.host.textContent.includes(p.activity.feedback[i]));assert.ok(h.host.textContent.includes(p.activity.feedback[1]));assert.equal(textGatesPassed(single(p),h.binding.getState()),true);}
});
test('comparison entry and opened Skip are optional; only actual raw attempts appear; no hidden model leaks',t=>{
 const p=page(memory,'memory-comparison'),h=harness(t,single(p));assert.doesNotMatch(h.host.textContent,/070417|07\/04/);h.click('skip');assert.equal(textGatesPassed(single(p),h.binding.getState()),true);assert.equal(h.host.querySelector('dl'),null);
 const o=harness(t,single(p));o.click('open');assert.doesNotMatch(o.host.textContent,/070417|07\/04/);o.click('skip');assert.equal(textGatesPassed(single(p),o.binding.getState()),true);
 const c=harness(t,single(p));c.click('open');c.input('9/11/2001 · 7/4/1776');c.click('compare');assert.match(c.host.textContent,/swapped their order/);assert.match(c.host.textContent,/zeroes/);assert.equal(c.host.querySelectorAll('dt').length,3);assert.ok(c.host.textContent.includes('9/11/2001 · 7/4/1776'));
});
test('comparison identifies known combined differences and rejects arbitrary strings as dates',()=>{
 const f=page(memory,'memory-comparison').activity.feedback;
 assert.deepEqual(memoryComparison('0704177609112001',f),[f.exact]);assert.deepEqual(memoryComparison('0911200107041776',f),[f.reverse]);assert.deepEqual(memoryComparison('7417769112001',f),[f.zeros]);assert.deepEqual(memoryComparison('04/07/1776 · 11/09/2001',f),[f.dayMonth]);assert.deepEqual(memoryComparison('11/9/2001 · 4/7/1776',f),[f.reverse,f.dayMonth,f.zeros]);assert.deepEqual(memoryComparison('123456789',f),[f.partial]);assert.deepEqual(memoryComparison('',f),[f.empty]);
});
test('four original mnemonic references precede four-option retrieval; recall has no model or copy highlight',t=>{
 const g=harness(t,single(letters.pages[0]));assert.equal(g.host.querySelectorAll('figure').length,4);assert.equal(g.host.querySelectorAll('img').length,4);
 const n=harness(t,single(letters.pages[1]));assert.equal(n.host.querySelectorAll('input[type="radio"]').length,4);n.choose(3);n.click('check-choice');assert.match(n.host.textContent,/ל represents \/l\//);
 const copy=harness(t,single(letters.pages[2]));assert.equal(copy.host.querySelector('[data-copy-letter]').dataset.copyLetter,'ל');copy.input('ל');copy.click('check-input');assert.match(copy.host.textContent,/Correct/);
 const mem=harness(t,single(letters.pages[5]));assert.equal(mem.host.querySelector('[data-copy-letter]'),null);assert.doesNotMatch(mem.host.textContent,/matching letter is מ/);mem.input('ם');mem.click('check-input');assert.match(mem.host.textContent,/Incorrect/);
 const m=harness(t,single(letters.pages[5]));m.input('מְ');m.click('check-input');assert.match(m.host.textContent,/Correct/);
});
test('all four matching pairs are independently checked and optional self-check reveals individual models',t=>{
 const p=page(letters,'letter-matching'),h=harness(t,single(p));for(const item of p.activity.items){const el=h.host.querySelector('[data-source-match="'+item.id+'"]');el.value=item.letter;el.dispatchEvent(new h.w.Event('change',{bubbles:true}));}h.click('check-match');assert.equal(h.host.querySelectorAll('.feedback p').length,5);assert.doesNotMatch(h.host.querySelector('.feedback').textContent,/Compare:/);
 const s=harness(t,single(page(letters,'self-check')));s.click('skip');assert.equal(textGatesPassed(single(page(letters,'self-check')),s.binding.getState()),true);
});
test('source response validation rejects malformed state; saving failure retains input and retries',async t=>{
 const p=page(memory,'memory-first');assert.throws(()=>validateTextResponse(p,{choice:4}));assert.throws(()=>validateTextResponse(p,{started:'yes'}));let fail=true;
 const h=harness(t,single(p),{saveProgress:async()=>{if(fail)throw Error('offline');}});h.click('play');h.clock.advance(10000);h.input('raw attempt');await h.binding.settled();assert.match(h.host.textContent,/could not save/);assert.equal(h.host.querySelector('textarea').value,'raw attempt');fail=false;h.click('retry');await h.binding.settled();assert.match(h.host.textContent,/Answers saved/);
});
test('bounded replacement uses new identities, retains history/unrelated content/draft and only resets fictional progress',()=>{
 const store=new Store(':memory:');try{
 const original=store.snapshot(),base=store.get('active');store.set('draft',{baseRevisionId:base,content:original,stagedAt:'fixed'});store.saveLearner('learner-demo',{...store.learner('learner-demo'),completed:['lesson-1'],attempts:[],cards:{},resumes:{}});
 const fixture=structuredClone(pack);for(const p of fixture.lessons.flatMap(l=>l.blocks[0].textPages.pages)){if(p.activity)delete p.activity.image;for(const item of p.activity?.items||[])delete item.image;}
 const result=installFirstTwo(store,{pack:fixture,build:'first2-test',mediaRoot:'.'});assert.equal(result.fictionalProgressReset,true);assert.deepEqual(store.snapshot(base),original);assert.deepEqual(store.snapshot().lessons.find(l=>l.id==='lesson-3'),original.lessons[2]);assert.deepEqual(store.snapshot().words,original.words);assert.deepEqual(store.learner('learner-demo').completed,[]);assert.equal(store.currentDraft().content.lessons[0].id,'MEMORY-A2');assert.equal(store.currentDraft().baseRevisionId,result.revisionId);validateContent(store.snapshot());assert.throws(()=>replaceFirstTwo(store.snapshot(),pack),/unexpected replacement slots/);
 }finally{store.close();}
});
test('Studio saves exact authored activity settings without changing stable identities',t=>{
 const dom=new JSDOM('<main></main>'),host=dom.window.document.querySelector('main');t.after(()=>dom.window.close());const p=page(memory,'date-connection');const editor=mountTextPagesEditor(host,{value:single(p)});assert.ok(host.querySelector('[data-page-field="activity"]'));const el=host.querySelector('[data-page-field="activity"]'),a=JSON.parse(el.value);a.descriptions[0]='Author-edited description';el.value=JSON.stringify(a);el.dispatchEvent(new dom.window.Event('input',{bubbles:true}));const saved=editor.getValue();assert.equal(saved.pages[0].activity.descriptions[0],a.descriptions[0]);assert.equal(saved.pages[0].id,p.id);editor.dispose();
});
