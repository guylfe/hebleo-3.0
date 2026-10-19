import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {JSDOM} from 'jsdom';
import {marked} from 'marked';
import createPurifier from 'dompurify';
import {createLessonRenderer,richCell,cellCSS,sheetColor} from '../public/rich.js';
import {composeSentence,matchWord,bindMatching} from '../public/interactions.js';
import {orderingPrefixes,orderingTokens,reviewNikkud} from '../public/ux.js';
import {seed,upgradeDemo} from '../src/seed.js';
import {Store,validateContent} from '../src/store.js';
import {createServer} from '../src/server.js';
const user='learner-demo',author='author-demo';
function store(t){const s=new Store();t.after(()=>s.close());return s;}
function dom(t,html=''){const d=new JSDOM(html,{url:'http://127.0.0.1',runScripts:'outside-only',pretendToBeVisual:true});d.window.matchMedia=()=>({matches:false});t.after(()=>d.window.close());return d;}

test('Markdown renders headings, tables, images, formatting and authored disclosure while removing executable markup',t=>{
  const d=dom(t),render=createLessonRenderer(marked,createPurifier(d.window),d.window.document);
  d.window.document.body.innerHTML=render('## Heading\n\n**Bold** and *italic* ~~old~~\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n\n![Diagram](https://example.com/diagram.png)\n\n<details><summary>More</summary>Answer</details>\n\n<script>alert(1)</script><img src="x" onerror="alert(1)"><a href="javascript:alert(1)">bad</a><iframe src="https://example.com"></iframe><p style="position:fixed">Text</p>');
  const doc=d.window.document;for(const tag of ['h2','strong','em','del','table','img','details','summary'])assert.ok(doc.querySelector(tag),tag);
  assert.equal(doc.querySelector('img').src,'https://example.com/diagram.png');
  assert.equal(doc.querySelectorAll('script,iframe,[onerror],[style]').length,0);assert.equal(doc.querySelector('a').hasAttribute('href'),false);
});
test('Hebrew lesson phrases remain in source order inside a single directional isolate',t=>{
  const d=dom(t),render=createLessonRenderer(marked,createPurifier(d.window),d.window.document);
  d.window.document.body.innerHTML=render('For example: אני בבית — I am at home.\n\nהוא כותב פה\n\n`const x = 1`');
  assert.equal(d.window.document.querySelector('bdi').textContent,'אני בבית');
  assert.equal(d.window.document.querySelector('bdi').dir,'rtl');
  assert.equal(d.window.document.querySelectorAll('p')[1].dir,'auto');
  assert.equal(d.window.document.querySelector('code').textContent,'const x = 1');
  d.window.document.body.innerHTML=render('For example: **אני** בבית — I am at home.');
  assert.equal(d.window.document.querySelector('bdi').textContent,'אני בבית');assert.ok(d.window.document.querySelector('bdi strong'));
});
test('Sheets cell fills, exact RGB colors, and rich runs retain UTF-16 vowel offsets, including explicit bold=false',t=>{
  const d=dom(t),cell={formattedValue:'יַיִן',effectiveFormat:{backgroundColor:{red:.5,green:1,blue:1},textFormat:{bold:true,foregroundColor:{red:1}}},textFormatRuns:[{format:{}},{startIndex:2,format:{bold:false,foregroundColor:{blue:1}}}]};
  d.window.document.body.innerHTML='<div style="'+cellCSS(cell)+'">'+richCell(cell.formattedValue,cell)+'</div>';
  const spans=d.window.document.querySelectorAll('span');assert.equal(spans[0].textContent,'יַ');assert.equal(spans[1].textContent,'יִן');assert.equal(spans[0].style.fontWeight,'700');assert.equal(spans[1].style.fontWeight,'400');assert.equal(spans[0].style.color,'rgb(255, 0, 0)');assert.equal(spans[1].style.color,'rgb(0, 0, 255)');assert.equal(d.window.document.querySelector('div').style.backgroundColor,'rgb(128, 255, 255)');
  assert.equal(sheetColor({themeColor:'ACCENT1'},[{colorType:'ACCENT1',color:{rgbColor:{green:1}}}]),'#00ff00');
  assert.equal(richCell('different',cell),'different','Stale rich offsets are never applied to changed content.');
  assert.equal(sheetColor('red;position:fixed'),null);
});
test('Source formatting metadata survives publication, JSON export and backup without canonical text changes',t=>{
  const s=store(t),c=structuredClone(seed),w=c.words[1];w.fieldFormatting={pointed:{formattedValue:w.pointed,effectiveFormat:{backgroundColor:{blue:1},textFormat:{foregroundColor:{red:1}}},textFormatRuns:[{startIndex:0,format:{bold:true}},{startIndex:2,format:{bold:false}}]}};
  s.stage({baseRevisionId:1,expectedDraftToken:null,content:c});s.publish(1,s.currentDraft().draftToken);const original=s.snapshot().words[1];s.restore(s.backup());assert.deepEqual(s.snapshot().words[1],original);
  c.words[1].fieldFormatting.pointed.textFormatRuns='malformed';assert.throws(()=>validateContent(c),/text-format runs/);
});
test('Prefixes are separate tray choices but compose and grade as attached forms, without guessed vowel changes',t=>{
  const s=store(t),c=s.snapshot(),e=c.exercises.find(x=>x.id==='ex-2-order'),tray=orderingTokens(e,c),prefixes=orderingPrefixes(e,tray),indices=['אני','ב','בית'].map(t=>tray.indexOf(t));
  assert.ok(!tray.includes('בבית'));assert.equal(prefixes.length,1);assert.equal(composeSentence(tray,indices,prefixes),'אני בבית');
  assert.equal(s.attempt(user,{requestId:randomUUID(),revisionId:1,exerciseId:e.id,answer:composeSentence(tray,indices,prefixes)}).correct,true);
  assert.equal(composeSentence(['ו','ב','בית'],[0,1,2],[0,1]),'ובבית');
  assert.equal(c.lessons[1].wordIds.includes('w-babayit'),false);assert.ok(c.words.find(w=>w.id==='w-babayit'),'Legacy word identity is preserved.');
  assert.throws(()=>validateContent({...c,exercises:c.exercises.map(x=>x.id===e.id?{...x,prefixTokenIndices:[999]}:x)}),/prefix/);
});
test('Known and newly taught keyboard keys are independently authored and validated',t=>{
  const s=store(t),c=structuredClone(seed);c.lessons[1].keyboard={knownKeys:'א',newKeys:'ב',knownColor:'#112233',newColor:'#445566'};s.stage({baseRevisionId:1,expectedDraftToken:null,content:c});s.publish(1,s.currentDraft().draftToken);assert.deepEqual(s.snapshot().lessons[1].keyboard,c.lessons[1].keyboard);
  c.lessons[1].keyboard.newKeys='א';assert.throws(()=>validateContent(c),/distinct/);
});
test('Owner keyboard floats, shows English equivalents, distinguishes key groups, edits the active field and stays pinned across questions',async t=>{
  const d=dom(t,'<input id="answer">');d.window.HTMLElement.prototype.scrollIntoView=()=>{};d.window.eval(readFileSync(new URL('../public/keyboard-owner.js',import.meta.url),'utf8'));d.window.document.dispatchEvent(new d.window.Event('DOMContentLoaded'));
  const doc=d.window.document,k=d.window.HebleoKeyboard,config={knownKeys:'א',newKeys:'ב'};
  k.sync(config,{keyboardPinned:false,keyboardConvert:false},'lesson-2|apply|0');k.open(doc.querySelector('input'));
  assert.ok(doc.querySelector('.hebleo-keyboard--open'));assert.ok(doc.querySelector('.hebleo-keyboard--show-hints'));assert.equal(doc.querySelector('[data-insert="א"] .hebleo-keyboard__en').textContent,'t');
  assert.ok(doc.querySelector('[data-insert="א"]').classList.contains('known-key'));assert.ok(doc.querySelector('[data-insert="ב"]').classList.contains('new-key'));
  doc.querySelector('[data-insert="ב"]').click();assert.equal(doc.querySelector('input').value,'ב');
  doc.querySelector('[data-action="pin"]').click();doc.querySelector('input').remove();const input=doc.createElement('input');input.id='answer';doc.body.append(input);
  k.sync(config,{keyboardPinned:true,keyboardConvert:false},'lesson-2|apply|1');assert.ok(doc.querySelector('.hebleo-keyboard--open'));doc.querySelector('[data-insert="א"]').click();assert.equal(input.value,'א');
  k.sync(config,{keyboardPinned:false,keyboardConvert:false},'lesson-2|apply|2');assert.ok(!doc.querySelector('.hebleo-keyboard--open'));
});
test('Matching supports pointer dragging and accessible select-then-place, with one word per meaning',t=>{
  const d=dom(t,'<div id="game"><button data-match-word="w-hu">הוא</button><button data-match-target="he">he</button></div>'),doc=d.window.document,game=doc.querySelector('#game'),tile=doc.querySelector('[data-match-word]'),target=doc.querySelector('[data-match-target]');let matches={};bindMatching(game,(id,meaning)=>{matches=matchWord(matches,id,meaning);});
  doc.elementFromPoint=()=>target;const pointer=(type,x,y)=>tile.dispatchEvent(new d.window.MouseEvent(type,{bubbles:true,clientX:x,clientY:y,button:0}));pointer('pointerdown',10,10);pointer('pointermove',100,100);assert.ok(game.querySelector('.match-ghost'));pointer('pointerup',100,100);assert.deepEqual(matches,{'w-hu':'he'});assert.equal(game.querySelector('.match-ghost'),null);
  tile.click();tile.click();target.click();assert.deepEqual(matches,{'w-hu':'he'});assert.deepEqual(matchWord({'w-hu':'he'},'w-hi','he'),{'w-hi':'he'});
  matches={};const transfer={value:'',setData(_,v){this.value=v;},getData(){return this.value;}};
  const start=new d.window.Event('dragstart',{bubbles:true});Object.defineProperty(start,'dataTransfer',{value:transfer});tile.dispatchEvent(start);
  const drop=new d.window.Event('drop',{bubbles:true});Object.defineProperty(drop,'dataTransfer',{value:transfer});target.dispatchEvent(drop);assert.deepEqual(matches,{'w-hu':'he'});
});
test('Flashcard front Nikkud follows an author default or a persisted learner override',t=>{
  const s=store(t),c=structuredClone(seed);c.reviewPolicy.defaultNikkud='curated';s.stage({baseRevisionId:1,expectedDraftToken:null,content:c});assert.ok(s.preview().changes.some(x=>x.id==='review-defaults'));s.publish(1,s.currentDraft().draftToken);
  assert.equal(reviewNikkud(s.snapshot(),'default'),'curated');assert.equal(reviewNikkud(s.snapshot(),'full'),'full');s.updateLearner(user,{reviewNikkud:'none',keyboardPinned:true});s.restore(s.backup());assert.equal(s.learner(user).preferences.reviewNikkud,'none');assert.equal(s.learner(user).preferences.keyboardPinned,true);assert.throws(()=>s.updateLearner(user,{reviewNikkud:'guess'}));
});
test('Real lesson questions are isolated per learner, idempotent, author-answerable and included in atomic backups',t=>{
  const s=store(t),input={revisionId:1,lessonId:'lesson-2',requestId:randomUUID(),question:'Which prefix does this sentence use?'};const q=s.askQuestion(user,input);assert.equal(q.status,'waiting');assert.equal(s.askQuestion(user,input).requestId,q.requestId);assert.equal(s.questions('learner-core').length,0);assert.equal(s.questions(author).length,1);assert.throws(()=>s.answerQuestion(user,{...input,userId:user,answer:'Answer'}),e=>e.status===403);assert.throws(()=>s.askQuestion(user,{...input,question:'different'}),e=>e.status===409);
  s.answerQuestion(author,{userId:user,requestId:q.requestId,answer:'Human-authored answer.'});s.restore(s.backup());assert.equal(s.questions(user)[0].answer,'Human-authored answer.');
  const before=s.backup(),bad=structuredClone(before);bad.questions[0].key='question-learner-core-'+q.requestId;assert.throws(()=>s.restore(bad));assert.equal(s.questions(user).length,1);
});
test('Starting an updated lesson is explicit and preserves graded attempts and review records',t=>{
  const s=store(t),result=s.attempt(user,{requestId:randomUUID(),revisionId:1,exerciseId:'ex-1-type',answer:'אני'});s.saveProgress(user,{lessonId:'lesson-1',revisionId:1,step:'apply',question:0,answer:'אני',selectedTokens:[],matching:{},practiceIds:[],resultRequestId:result.requestId});s.stage({baseRevisionId:1,expectedDraftToken:null,word:{id:'w-mi',notes:'Updated note'}});s.publish(1,s.currentDraft().draftToken);assert.equal(s.session(user,'lesson-1').revisionId,1);
  assert.equal(s.startLatestLesson(user,'lesson-1').revisionId,2);assert.equal(s.learner(user).attempts[0].requestId,result.requestId);assert.equal(s.session(user,'lesson-1').progress,undefined);
});
test('New rich assets, image media and question endpoints work over HTTP with author boundaries',async t=>{
  const s=store(t),dir=mkdtempSync(join(tmpdir(),'hebleo-rich-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));writeFileSync(join(dir,'test.png'),Buffer.from([137,80,78,71]));const server=createServer(s,{mediaRoot:dir});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));const base='http://127.0.0.1:'+server.address().port;
  for(const path of ['/rich-browser.js','/vendor/marked.js','/vendor/purify.js','/keyboard-owner.js','/keyboard-owner.css','/refinement.css']){const r=await fetch(base+path);assert.equal(r.status,200,path);assert.match(r.headers.get('content-security-policy'),/style-src-attr/);}
  assert.equal((await fetch(base+'/media/test.png')).headers.get('content-type'),'image/png');
  const input={requestId:randomUUID(),revisionId:1,lessonId:'lesson-1',question:'Question?'},r=await fetch(base+'/api/questions',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input)});assert.equal(r.status,200);
  assert.deepEqual(await (await fetch(base+'/api/questions',{headers:{'x-demo-user':'learner-core'}})).json(),[]);
  assert.equal((await fetch(base+'/api/questions/answer',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...input,userId:user,answer:'Forged'})})).status,403);
});
