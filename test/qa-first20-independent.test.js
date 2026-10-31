import {courseRailEdge,updateCourseToggle} from '../public/sidebar-toggle.js';
// Independent QA for frozen d912e746. Synthetic fixtures only; no owner database.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {JSDOM} from 'jsdom';
import {marked} from 'marked';
import createPurifier from 'dompurify';
import {Store,validateContent} from '../src/store.js';
import {createServer} from '../src/server.js';
import {projectCurriculum} from '../public/course.js';
import {mountTextReader} from '../public/text-reader.js';
import {createLearnerRenderer} from '../public/preview/learner-renderer.js';
import {createLessonRenderer} from '../public/rich.js';
import {resolveContentID} from '../public/content-identity.js';

const pack=JSON.parse(readFileSync(new URL('../docs/curriculum/first20-20261025/content.json',import.meta.url)));
const recall={id:'qa.recall',type:'recall',title:'Synthetic gated recall',prompt:'Commit an attempt',answer:'Illustrative model',grading:'self-check',gate:'reveal'};
const choice={id:'qa.choice',type:'choice',title:'Synthetic gated choice',options:['אֲנִי','הוּא'],answer:0,explanation:'Synthetic feedback',gate:'commit'};
const memory={id:'qa.memory',type:'timedRecall',title:'Synthetic timer',value:'0704177609112001',durationMs:10000,accessibleAlternative:true,gate:'reveal'};
const pages=list=>({version:1,pages:structuredClone(list),order:list.map(p=>p.id)});
const requestInput=(s,p=pack)=>({baseRevisionId:s.get('active'),expectedDraftToken:s.currentDraft()?.draftToken??null,pack:p});
const allRows=s=>JSON.stringify(s.db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(({name})=>[name,s.db.prepare('SELECT * FROM "'+name.replaceAll('"','""')+'" ORDER BY 1').all()]));
const tick=()=>new Promise(r=>setImmediate(r));
async function until(fn){for(let n=0;n<300;n++){if(fn())return;await new Promise(r=>setTimeout(r,5));}throw Error('QA fixture did not settle');}
function addSynthetic(s,list=[choice,recall,memory]){
 const c=s.snapshot(),lesson={id:'qa-text-only',title:'SYNTHETIC QA text-only lesson',chapter:'SYNTHETIC QA',minutes:5,compositionVersion:2,introducedLetters:'',wordIds:[],exerciseIds:[],checkExerciseIds:[],blocks:[{id:'qa-text',type:'explanation',source:'inline',renderer:'text',text:'',textPages:pages(list)}]};
 c.lessons.push(lesson);c.curriculum=projectCurriculum(c);const d=s.stage({baseRevisionId:s.get('active'),expectedDraftToken:s.currentDraft()?.draftToken??null,content:c});s.publish(d.baseRevisionId,d.draftToken);return lesson;
}
async function http(t,s){const server=createServer(s);await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));const origin='http://127.0.0.1:'+server.address().port;
 return {origin,async call(path,body,user='learner-demo'){const res=await fetch(origin+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{'x-demo-user':user,'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:res.status,value:await res.json()};}};
}
async function actualApp(t,s,origin,{beforeFetch}={}){
 const dom=new JSDOM('<div id="app"></div><div id="toast"></div>',{url:origin+'/#lesson/qa-text-only/qa-text',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;t.after(()=>w.close());
 w.matchMedia=()=>({matches:false});w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 // Evaluate actual app with its actual module exports. Only browser vendor imports and device media are adapted.
 for(const match of source.matchAll(/^import \{([^}]+)\} from '([^']+)';/gm)){
  if(match[2]==='./rich-browser.js')continue;
  const exports=await import(new URL('../public/'+match[2].replace(/^\.\//,''),import.meta.url));
  for(const name of match[1].split(',').map(x=>x.trim())){const [original,alias]=name.split(/\s+as\s+/);w[alias||original]=exports[original];}
 }
 Object.assign(w,{courseRailEdge,updateCourseToggle,structuredClone,renderLesson:createLessonRenderer(marked,createPurifier(w),w.document),playAudio:async()=>{},stopMedia:()=>{},clearRecording:()=>{},feedbackSound:()=>{}});
 const calls=[];w.fetch=async(path,options)=>{calls.push({path,...options});await beforeFetch?.(path,options);return fetch(new URL(path,origin),options);};
 w.eval(source.replace(/^import .*;\r?\n/gm,''));await until(()=>w.document.querySelector('[data-reader-heading]'));return {w,doc:w.document,calls};
}

test('QA positive: actual HTTP response/revision/profile/entitlement isolation and atomic malformed writes',async t=>{
 const s=new Store();t.after(()=>s.close());addSynthetic(s);const api=await http(t,s),revisionId=s.get('active'),base={lessonId:'qa-text-only',componentId:'qa-text',revisionId,pageId:recall.id,cursorPageId:recall.id};
 const before=s.learner('learner-demo');assert.equal((await api.call('text-progress',{...base,response:{text:'תּוֹדָה',revealed:true}})).status,200);
 assert.deepEqual(s.learner('learner-demo').completed,before.completed);assert.deepEqual(s.learner('learner-demo').attempts,before.attempts);assert.deepEqual(s.learner('learner-demo').cards,before.cards);
 const query='text-progress?'+new URLSearchParams({lessonId:base.lessonId,componentId:base.componentId,revisionId});
 assert.deepEqual((await api.call(query,undefined,'learner-core')).value.responses,{});
 for(const response of [{text:' ',revealed:true},{running:true},{choice:0},{text:'x',timerValue:memory.value}]){const rows=allRows(s);assert.equal((await api.call('text-progress',{...base,response})).status,400);assert.equal(allRows(s),rows);}
 const c=s.snapshot();c.lessons.find(l=>l.id===base.lessonId).blocks[0].textPages.pages.find(p=>p.id===recall.id).answer='A different human-authored model fixture';const d=s.stage({baseRevisionId:revisionId,expectedDraftToken:null,content:c});s.publish(revisionId,d.draftToken);
 assert.deepEqual(s.textProgress('learner-demo',{...base,revisionId:s.get('active')}).responses,{});
 const rows=allRows(s);assert.equal((await api.call('text-progress',{...base,response:{text:'late'}})).status,409);assert.equal(allRows(s),rows);
 const learner=s.learner('learner-demo');learner.purchasedCourses=[];s.saveLearner('learner-demo',learner);const protectedRows=allRows(s);assert.equal((await api.call('text-progress',{...base,revisionId:s.get('active'),response:{text:'late'}})).status,403);assert.equal(allRows(s),protectedRows);
});

test('QA positive: real first20 import, aliases, sources, two lesson/page reorders and two backup/restores preserve synthetic state',t=>{
 const temp=mkdtempSync(join(tmpdir(),'hebleo-independent-first20-')),file=join(temp,'synthetic.sqlite');t.after(()=>rmSync(temp,{recursive:true,force:true}));let s=new Store(file);
 try{
  addSynthetic(s);s.saveTextProgress('learner-demo',{lessonId:'qa-text-only',componentId:'qa-text',revisionId:s.get('active'),pageId:recall.id,cursorPageId:recall.id,response:{text:'תּוֹדָה',revealed:true}});
  s.updateLearner('learner-demo',{note:{wordId:'w-ani',text:'SYNTHETIC retained note'},bookmark:'w-ani',nikkud:'none'});
  const active=s.snapshot(),learners=['learner-demo','learner-core','author-demo'].map(id=>s.learner(id));
  const r=s.importTextDraft(requestInput(s));assert.deepEqual([r.importReceipt.lessonCount,r.importReceipt.pageCount,r.importReceipt.targetCount,r.importReceipt.unresolvedTargetCount],[20,154,127,127]);
  const content=s.currentDraft().content;assert.deepEqual(content.words,active.words);assert.equal(resolveContentID(content,'lessons','mnt'),'draft-first20-MNT');assert.throws(()=>resolveContentID(content,'lessons','unknown'));
  for(const source of pack.lessons){const l=content.lessons.find(l=>l.contentId===source.id);assert.deepEqual(l.draftTargets.map(({mappingStatus,...t})=>t),source.vocabulary);for(const p of source.pages){const native=l.blocks[0].textPages.pages.find(x=>x.id===p.id);assert.equal(native.sourceStage,p.stage);if(p.sourceRefs)assert.deepEqual(native.sourceRefs,p.sourceRefs);}}
  for(const l of content.lessons.filter(l=>l.draftImport).slice(0,2)){const order=l.blocks[0].textPages.order;[order[0],order[1]]=[order[1],order[0]];}
  const order=content.curriculum.order,n=order.length;[order[n-1],order[n-2]]=[order[n-2],order[n-1]];
  s.stage({baseRevisionId:s.get('active'),expectedDraftToken:s.currentDraft().draftToken,content});const expected=s.currentDraft().content;
  s.close();s=new Store(file);assert.deepEqual(s.currentDraft().content,expected);
  let backup=s.backup();for(let i=0;i<2;i++){
   const token=s.currentDraft().draftToken;s.importTextDraft(requestInput(s));assert.equal(s.currentDraft().draftToken,token);assert.deepEqual(s.currentDraft().content,expected);
   const dest=new Store();try{dest.restore(backup);assert.deepEqual(dest.currentDraft().content,expected);assert.deepEqual(dest.snapshot(),active);const remapped=structuredClone(learners);for(const l of remapped)for(const r of l.textPages||[])r.revisionId=dest.get('active');assert.deepEqual(['learner-demo','learner-core','author-demo'].map(id=>dest.learner(id)),remapped);backup=dest.backup();}finally{dest.close();}
  }
  const rows=allRows(s);assert.throws(()=>s.publish(s.get('active'),s.currentDraft().draftToken),e=>e.code==='TEXT_DRAFT_REVIEW_REQUIRED');assert.equal(allRows(s),rows);
  const changed=structuredClone(pack);changed.lessons[0].pages[0].html='Different teaching';assert.throws(()=>s.importTextDraft(requestInput(s,changed)),e=>e.code==='TEXT_IMPORT_CONFLICT');assert.equal(allRows(s),rows);
 }finally{s.close();}
});

test('QA positive: unknown/ambiguous mapping, CAS, collision and malformed packs leave every table unchanged',t=>{
 const s=new Store();t.after(()=>s.close());const c=s.snapshot();c.words[0].contentAliases=[{value:'shared',namespace:'one'}];c.words[1].contentAliases=[{value:'shared',namespace:'two'}];s.stage({baseRevisionId:1,expectedDraftToken:null,content:c});
 for(const word of ['unknown','shared']){const rows=allRows(s);const result=s.reviewTextImport({...requestInput(s),wordMappings:{'PRONOUNS.word.1':word}});assert.equal(result.status,'review-required');assert.equal(result.content,undefined);assert.equal(allRows(s),rows);}
 const valid=s.reviewTextImport({...requestInput(s),wordMappings:{'PRONOUNS.word.1':'w-ani'}});assert.equal(valid.receipt.unresolvedTargetCount,126);
 const stale=requestInput(s);c.lessons[0].title='Concurrent synthetic edit';s.stage({baseRevisionId:1,expectedDraftToken:s.currentDraft().draftToken,content:c});const rows=allRows(s);assert.throws(()=>s.importTextDraft(stale),e=>e.code==='DRAFT_CONFLICT');assert.equal(allRows(s),rows);
 const bad=structuredClone(pack);bad.lessons[1].pages[0].id=bad.lessons[0].pages[0].id;assert.throws(()=>s.importTextDraft(requestInput(s,bad)));assert.equal(allRows(s),rows);
 const collision=s.currentDraft().content;collision.lessons[0].contentId='MNT';s.stage({baseRevisionId:1,expectedDraftToken:s.currentDraft().draftToken,content:collision});const protectedRows=allRows(s);assert.equal(s.reviewTextImport(requestInput(s)).status,'review-required');assert.equal(allRows(s),protectedRows);
});

test('QA positive: actual learner delayed GET/POST remain with initiating profile across switching and reload',async t=>{
 const s=new Store();t.after(()=>s.close());addSynthetic(s,[recall]);const {origin}=await http(t,s);let releaseGet,releasePost,hold=true;
 t.after(()=>{releaseGet?.();releasePost?.();});
 const {w,doc}=await actualApp(t,s,origin,{beforeFetch:async(path,options)=>{
  if(hold&&path.startsWith('text-progress'))throw Error('Unexpected relative API shape');
  if(hold&&path.startsWith('/api/text-progress')&&options.headers['x-demo-user']==='learner-demo')await new Promise(r=>{if(options.method==='GET')releaseGet=r;else releasePost=r;});
 }});
 const attempt=doc.querySelector('textarea[data-reader-attempt]');attempt.value='תּוֹדָה · SYNTHETIC Alex';attempt.dispatchEvent(new w.Event('input',{bubbles:true}));await until(()=>releaseGet&&releasePost);
 const chooser=doc.querySelector('#demo-user');chooser.value='learner-core';chooser.dispatchEvent(new w.Event('change'));await until(()=>doc.querySelector('h1')&&!doc.querySelector('[data-reader-heading]')&&w.localStorage.getItem('hebleo-demo-user')==='learner-core');
 w.history.pushState({},'','#lesson/qa-text-only/qa-text');w.dispatchEvent(new w.PopStateEvent('popstate'));await until(()=>doc.querySelector('[data-reader-attempt]'));await tick();assert.equal(doc.querySelector('[data-reader-attempt]').value,'');
 const coreAttempt=doc.querySelector('[data-reader-attempt]');coreAttempt.value='שלום · SYNTHETIC Sam';coreAttempt.dispatchEvent(new w.Event('input',{bubbles:true}));await until(()=>s.learner('learner-core').textPages?.[0]?.responses[recall.id]?.text==='שלום · SYNTHETIC Sam');
 hold=false;releaseGet();releasePost();await until(()=>s.learner('learner-demo').textPages?.[0]?.responses[recall.id]?.text==='תּוֹדָה · SYNTHETIC Alex');await tick();assert.equal(doc.querySelector('[data-reader-attempt]').value,'שלום · SYNTHETIC Sam');assert.equal(doc.querySelector('.text-reader-model'),null);
 const reload=await actualApp(t,s,origin);await until(()=>reload.doc.querySelector('[data-reader-attempt]').value==='תּוֹדָה · SYNTHETIC Alex');
});

test('QA positive: integrated pack pages all traverse with production adapter, exact timing, commitment and hidden-tab cancellation',async t=>{
 const s=new Store();t.after(()=>s.close());const content=s.reviewTextImport(requestInput(s)).content;let count=0;
 for(const l of content.lessons.filter(l=>l.draftImport)){
  const dom=new JSDOM('<main></main>',{pretendToBeVisual:true}),w=dom.window,host=w.document.querySelector('main');let now=0,job,captured;
  const clock={now:()=>now,schedule(fn){job=fn;captured=fn;return 1;},cancel(){job=null;}};
  const binding=mountTextReader(host,{textPages:l.blocks[0].textPages,clock,renderLesson:createLessonRenderer(marked,createPurifier(w),w.document)});
  try{for(const id of l.blocks[0].textPages.order){const p=l.blocks[0].textPages.pages.find(p=>p.id===id),click=a=>host.querySelector('[data-reader-action="'+a+'"]')?.click();assert.equal(host.querySelector('[data-reader-heading]').textContent,p.title);
   if(p.type==='choice'){assert.equal(host.querySelector('[data-reader-action="next"]').disabled,true);const radio=host.querySelector('input');radio.checked=true;radio.dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(host.querySelector('[role="status"]').textContent,'');click('check');}
   if(p.type==='timedRecall'){assert.equal(host.textContent.includes('0704177609112001'),false);click('play');now+=9999;assert.equal(host.querySelector('.text-reader-value').textContent,'0704177609112001');now++;job();assert.equal(host.querySelector('.text-reader-value'),null);click('play');const stale=captured;Object.defineProperty(w.document,'hidden',{configurable:true,value:true});w.document.dispatchEvent(new w.Event('visibilitychange'));stale();assert.equal(host.querySelector('.text-reader-value'),null);Object.defineProperty(w.document,'hidden',{configurable:true,value:false});click('study');assert.equal(host.querySelector('.text-reader-value').textContent,p.value);click('hide-study');}
   if(['recall','timedRecall'].includes(p.type)){const el=host.querySelector('textarea');assert.ok(el);assert.equal(host.querySelector('.text-reader-model'),null);el.value='תּוֹדָה · SYNTHETIC QA attempt';el.dispatchEvent(new w.Event('input',{bubbles:true}));click('reveal');assert.ok(host.querySelector('.text-reader-model'));}
   count++;click('next');
  }}finally{binding.destroy();dom.window.close();}
 }
 assert.equal(count,154);await tick();
});

test('QA-TXT-01 learner outer Continue must not complete an unattempted gated text-only lesson',async t=>{
 const s=new Store();t.after(()=>s.close());addSynthetic(s,[choice,recall]);const {origin}=await http(t,s),{doc,w}=await actualApp(t,s,origin);
 assert.equal(doc.querySelector('[data-reader-action="next"]').disabled,true);assert.equal(s.learner('learner-demo').textPages,undefined);
 const outer=doc.querySelector('.lesson-footer [data-action="step"][data-value="complete"]');assert.ok(outer);
 // The corrected control refuses advancement; do not wait for the invalid terminal
 // progress write that the original reproduction deliberately exposed on d912e746.
 assert.equal(outer.disabled,true);const protectedRows=allRows(s);outer.click();await tick();assert.equal(allRows(s),protectedRows);
 assert.equal(s.learner('learner-demo').completed.includes('qa-text-only'),false,'Outer Continue bypassed all mandatory choice/recall gates and marked the lesson complete');
 const radio=doc.querySelector('[name="reader-choice"]');radio.checked=true;radio.dispatchEvent(new w.Event('change',{bubbles:true}));doc.querySelector('[data-reader-action="check"]').click();assert.equal(outer.disabled,true);
 doc.querySelector('[data-reader-action="next"]').click();const attempt=doc.querySelector('[data-reader-attempt]');attempt.value='SYNTHETIC committed answer';attempt.dispatchEvent(new w.Event('input',{bubbles:true}));doc.querySelector('[data-reader-action="reveal"]').click();assert.equal(outer.disabled,false);outer.click();await until(()=>s.learner('learner-demo').completed.includes('qa-text-only'));
});

test('QA-TXT-01 Preview outer Continue must respect the same mandatory page gate',t=>{
 const s=new Store();t.after(()=>s.close());const l=addSynthetic(s,[choice,recall]),dom=new JSDOM('<main></main>',{pretendToBeVisual:true});t.after(()=>dom.window.close());let next=0;
 const renderer=createLearnerRenderer(),dispose=renderer.mount(dom.window.document.querySelector('main'),{content:s.snapshot(),lessonId:l.id,componentId:'qa-text',step:'learn',preferences:{},actions:{next(){next++;}}});t.after(dispose);
 assert.equal(dom.window.document.querySelector('[data-reader-action="next"]').disabled,true);dom.window.document.querySelector('.lesson-footer [data-action="next-step"]').click();assert.equal(next,0,'Preview outer Continue bypasses the required page answer');
 const doc=dom.window.document,w=dom.window,radio=doc.querySelector('[name="reader-choice"]');radio.checked=true;radio.dispatchEvent(new w.Event('change',{bubbles:true}));doc.querySelector('[data-reader-action="check"]').click();doc.querySelector('[data-reader-action="next"]').click();const attempt=doc.querySelector('[data-reader-attempt]');attempt.value='SYNTHETIC Preview commitment';attempt.dispatchEvent(new w.Event('input',{bubbles:true}));doc.querySelector('[data-reader-action="reveal"]').click();doc.querySelector('.lesson-footer [data-action="next-step"]').click();assert.equal(next,1);assert.equal(s.learner('learner-demo').textPages,undefined);
});

test('QA-TXT-02 fresh-build demo reset must clear separately persisted text-page responses',t=>{
 const s=new Store();t.after(()=>s.close());addSynthetic(s,[recall]);s.saveTextProgress('learner-demo',{lessonId:'qa-text-only',componentId:'qa-text',revisionId:s.get('active'),pageId:recall.id,cursorPageId:recall.id,response:{text:'SYNTHETIC previous build',revealed:true}});
 s.resetDemoProgressForBuild('qa-new-executable-build');assert.deepEqual(s.textProgress('learner-demo',{lessonId:'qa-text-only',componentId:'qa-text',revisionId:s.get('active')}).responses,{},'Fresh progress retains prior text answers and revealed models');
});

test('QA-TXT-03 new prerequisite references must reject cycles before staging an import',t=>{
 const s=new Store();t.after(()=>s.close());const p=structuredClone(pack);p.lessons[0].prerequisites='MNT';p.lessons[1].prerequisites='MEMORY';const before=allRows(s);
 assert.throws(()=>s.importTextDraft(requestInput(s,p)),/cycl|prerequisite/i,'A mutual MEMORY/MNT prerequisite cycle was accepted');assert.equal(allRows(s),before);
});

test('QA-TXT-01 outer Finish waits for a delayed committed page save before navigating',async t=>{
 const s=new Store();t.after(()=>s.close());addSynthetic(s,[recall]);const {origin}=await http(t,s);let release,hold=true;
 const {doc,w}=await actualApp(t,s,origin,{beforeFetch:async(path,options)=>{if(path==='/api/text-progress'&&options?.method==='POST'&&hold&&JSON.parse(options.body).response.revealed){hold=false;await new Promise(r=>release=r);}}});t.after(()=>release?.());
 const attempt=doc.querySelector('[data-reader-attempt]');attempt.value='SYNTHETIC pending answer';attempt.dispatchEvent(new w.Event('input',{bubbles:true}));doc.querySelector('[data-reader-action="reveal"]').click();await until(()=>release);
 doc.querySelector('.lesson-footer [data-action="step"][data-value="complete"]').click();await tick();assert.equal(s.learner('learner-demo').completed.includes('qa-text-only'),false);assert.ok(doc.querySelector('[data-reader-heading]'));
 release();await until(()=>s.learner('learner-demo').completed.includes('qa-text-only'));assert.equal(s.learner('learner-demo').textPages[0].responses[recall.id].revealed,true);
});

test('QA corrected: HTTP Finish checks every text block before writing and unlocks after all commitments',async t=>{
 const s=new Store();t.after(()=>s.close());addSynthetic(s,[choice]);const c=s.snapshot(),l=c.lessons.find(l=>l.id==='qa-text-only');
 l.blocks.push({id:'qa-second',type:'explanation',source:'inline',renderer:'text',text:'',textPages:pages([recall])});
 const draft=s.stage({baseRevisionId:s.get('active'),expectedDraftToken:null,content:c});s.publish(draft.baseRevisionId,draft.draftToken);
 const api=await http(t,s),revisionId=s.get('active'),finish={lessonId:l.id,componentId:null,revisionId,step:'complete',question:0,answer:'',selectedTokens:[],matching:{}};
 const refused=async()=>{const before=allRows(s),r=await api.call('progress',finish);assert.equal(r.status,409);assert.equal(r.value.code,'TEXT_GATES_REQUIRED');assert.equal(allRows(s),before);};
 await refused();assert.equal((await api.call('text-progress',{lessonId:l.id,revisionId,componentId:'qa-text',pageId:choice.id,cursorPageId:choice.id,response:{choice:1,checked:true}})).status,200);
 await refused();assert.equal((await api.call('text-progress',{lessonId:l.id,revisionId,componentId:'qa-second',pageId:recall.id,cursorPageId:recall.id,response:{text:'תּוֹדָה',revealed:true}})).status,200);
 assert.equal(s.learner('learner-demo').completed.includes(l.id),false);assert.equal((await api.call('progress',finish)).status,200);assert.equal(s.learner('learner-demo').completed.includes(l.id),true);
});

test('QA corrected: same-build startup retains all profiles text responses; next build clears responses while preserving draft and settings',t=>{
 const s=new Store();t.after(()=>s.close());addSynthetic(s,[recall]);s.resetDemoProgressForBuild('qa-build-a');
 for(const user of ['learner-demo','learner-core','author-demo']){s.updateLearner(user,{nikkud:'full',note:{wordId:'w-ani',text:'SYNTHETIC retained note'}});s.saveTextProgress(user,{lessonId:'qa-text-only',componentId:'qa-text',revisionId:s.get('active'),pageId:recall.id,cursorPageId:recall.id,response:{text:user,revealed:true}});}
 s.stage({baseRevisionId:s.get('active'),expectedDraftToken:null,word:{id:'w-ani',notes:'SYNTHETIC retained draft'}});const draft=s.currentDraft(),before=allRows(s);
 assert.equal(s.resetDemoProgressForBuild('qa-build-a'),false);assert.equal(allRows(s),before);assert.equal(s.resetDemoProgressForBuild('qa-build-b'),true);
 for(const user of ['learner-demo','learner-core','author-demo']){const learner=s.learner(user);assert.equal(learner.textPages,undefined);assert.equal(learner.preferences.nikkud,'full');assert.equal(learner.notes['w-ani'],'SYNTHETIC retained note');}assert.deepEqual(s.currentDraft(),draft);
});

test('QA corrected: three-node prerequisite cycle refuses atomically with concrete review conflict; acyclic chain imports',t=>{
 const s=new Store();t.after(()=>s.close());const p=structuredClone(pack);for(const l of p.lessons)l.prerequisites='None';
 p.lessons[0].prerequisites=p.lessons[1].id;p.lessons[1].prerequisites=p.lessons[2].id;p.lessons[2].prerequisites=p.lessons[0].id;
 const before=allRows(s),review=s.reviewTextImport(requestInput(s,p));assert.equal(review.status,'review-required');assert.match(review.conflicts[0].message,/Cyclic prerequisite references: draft-first20-/);assert.equal(allRows(s),before);assert.throws(()=>s.importTextDraft(requestInput(s,p)),e=>e.code==='TEXT_IMPORT_CONFLICT');assert.equal(allRows(s),before);
 p.lessons[2].prerequisites='None';assert.equal(s.reviewTextImport(requestInput(s,p)).status,'ready-unpublished');assert.equal(s.importTextDraft(requestInput(s,p)).importReceipt.lessonCount,20);
});

test('QA-TXT-04 delayed outer Finish must not complete a different profile and lesson after navigation',async t=>{
 const s=new Store();t.after(()=>s.close());addSynthetic(s,[recall]);const c=s.snapshot(),other=structuredClone(c.lessons.find(l=>l.id==='qa-text-only'));other.id='qa-other';other.title='SYNTHETIC other lesson';other.blocks[0].textPages.pages[0].gate='none';c.lessons.push(other);c.curriculum.order.push({lessonId:other.id});
 const d=s.stage({baseRevisionId:s.get('active'),expectedDraftToken:null,content:c});s.publish(d.baseRevisionId,d.draftToken);
 const {origin}=await http(t,s);let release,hold=true;const {doc,w,calls}=await actualApp(t,s,origin,{beforeFetch:async(path,options)=>{if(path==='/api/text-progress'&&options?.method==='POST'&&hold&&JSON.parse(options.body).response.revealed){hold=false;await new Promise(r=>release=r);}}});t.after(()=>release?.());
 const attempt=doc.querySelector('[data-reader-attempt]');attempt.value='SYNTHETIC Alex pending commitment';attempt.dispatchEvent(new w.Event('input',{bubbles:true}));doc.querySelector('[data-reader-action="reveal"]').click();await until(()=>release);
 doc.querySelector('.lesson-footer [data-action="step"][data-value="complete"]').click();await tick();
 const chooser=doc.querySelector('#demo-user');chooser.value='learner-core';chooser.dispatchEvent(new w.Event('change'));await until(()=>w.localStorage.getItem('hebleo-demo-user')==='learner-core'&&!doc.querySelector('[data-reader-heading]'));
 w.history.pushState({},'','#lesson/qa-other/qa-text');w.dispatchEvent(new w.PopStateEvent('popstate'));await until(()=>doc.querySelector('[data-reader-heading]')&&doc.querySelector('h1')?.textContent===other.title);
 release();await until(()=>s.learner('learner-demo').textPages?.[0]?.responses[recall.id]?.revealed===true);
 for(let n=0;n<10;n++)await new Promise(r=>setTimeout(r,10));
 t.diagnostic(JSON.stringify({terminalWrites:calls.filter(c=>c.path==='/api/progress'&&c.body&&JSON.parse(c.body).step==='complete').map(c=>({user:c.headers['x-demo-user'],...JSON.parse(c.body)})),samCompleted:s.learner('learner-core').completed,route:w.location.hash}));
 assert.equal(s.learner('learner-core').completed.includes(other.id),false,'Alex pending Finish completed Sam other lesson');assert.ok(doc.querySelector('[data-reader-heading]'),'Stale Finish replaced the newly opened lesson portion');
});

for(const departure of ['later portion request','history away and back','profile switch with failed save'])test('Lead QA-TXT-04: '+departure+' cancels a pending Finish',async t=>{
 const s=new Store();t.after(()=>s.close());addSynthetic(s,[recall]);
 const c=s.snapshot(),l=c.lessons.find(l=>l.id==='qa-text-only');
 l.blocks.push({id:'qa-second',type:'explanation',source:'inline',renderer:'text',text:'SYNTHETIC second portion',textPages:pages([{id:'qa.reading',type:'reading',title:'SYNTHETIC second portion',html:'Read the next portion',gate:'none'}])});
 const d=s.stage({baseRevisionId:s.get('active'),expectedDraftToken:null,content:c});s.publish(d.baseRevisionId,d.draftToken);
 const {origin}=await http(t,s);let release,hold=true;
 const {doc,w,calls}=await actualApp(t,s,origin,{beforeFetch:async(path,options)=>{
  if(path==='/api/text-progress'&&options?.method==='POST'&&hold&&JSON.parse(options.body).response.revealed){hold=false;await new Promise(r=>release=r);if(departure==='profile switch with failed save')throw Error('SYNTHETIC disconnected save');}
 }});t.after(()=>release?.());
 const attempt=doc.querySelector('[data-reader-attempt]');attempt.value='SYNTHETIC pending Finish';attempt.dispatchEvent(new w.Event('input',{bubbles:true}));doc.querySelector('[data-reader-action="reveal"]').click();await until(()=>release);
 doc.querySelector('.step-strip [data-action="step"][data-value="complete"]').click();await tick();
 if(departure==='later portion request')doc.querySelector('.step-strip [data-action="step"][data-value="qa-second"]').click();
 if(departure==='history away and back'){
  w.history.pushState({},'','#home');w.dispatchEvent(new w.PopStateEvent('popstate'));await until(()=>!doc.querySelector('[data-reader-heading]'));
  w.history.pushState({},'','#lesson/qa-text-only/qa-text');w.dispatchEvent(new w.PopStateEvent('popstate'));await until(()=>doc.querySelector('[data-reader-heading]'));
 }
 if(departure==='profile switch with failed save'){
  const chooser=doc.querySelector('#demo-user');chooser.value='learner-core';chooser.dispatchEvent(new w.Event('change'));await until(()=>w.localStorage.getItem('hebleo-demo-user')==='learner-core'&&!doc.querySelector('[data-reader-heading]'));
 }
 release();await until(()=>calls.some(c=>c.path==='/api/text-progress'&&c.method==='POST'));
 if(departure==='later portion request')await until(()=>doc.querySelector('[data-reader-heading]')?.textContent==='SYNTHETIC second portion');
 else for(let n=0;n<10;n++)await new Promise(r=>setTimeout(r,10));
 assert.deepEqual(calls.filter(c=>c.path==='/api/progress'&&JSON.parse(c.body).step==='complete'),[],'A cancelled Finish issued a terminal write');
 for(const user of ['learner-demo','learner-core'])assert.equal(s.learner(user).completed.includes(l.id),false);
 if(departure==='history away and back')assert.equal(w.location.hash,'#lesson/qa-text-only/qa-text');
 if(departure==='profile switch with failed save')assert.equal(doc.querySelector('#toast').textContent,'','An abandoned save error surfaced in the new profile');
});

test('QA-TXT-04 independent: same-profile lesson change cancels delayed Finish without stealing focus',async t=>{
 const s=new Store();t.after(()=>s.close());addSynthetic(s,[recall]);const c=s.snapshot(),other=structuredClone(c.lessons.find(l=>l.id==='qa-text-only'));other.id='qa-other';other.title='SYNTHETIC other lesson';other.blocks[0].textPages.pages[0].gate='none';c.lessons.push(other);c.curriculum.order.push({lessonId:other.id});
 const d=s.stage({baseRevisionId:s.get('active'),expectedDraftToken:null,content:c});s.publish(d.baseRevisionId,d.draftToken);
 const {origin}=await http(t,s);let release,hold=true;const {doc,w,calls}=await actualApp(t,s,origin,{beforeFetch:async(path,options)=>{if(path==='/api/text-progress'&&options?.method==='POST'&&hold&&JSON.parse(options.body).response.revealed){hold=false;await new Promise(r=>release=r);}}});t.after(()=>release?.());
 const attempt=doc.querySelector('[data-reader-attempt]');attempt.value='SYNTHETIC pending old lesson';attempt.dispatchEvent(new w.Event('input',{bubbles:true}));doc.querySelector('[data-reader-action="reveal"]').click();await until(()=>release);
 doc.querySelector('.lesson-footer [data-action="step"][data-value="complete"]').click();await tick();w.history.pushState({},'','#lesson/qa-other/qa-text');w.dispatchEvent(new w.PopStateEvent('popstate'));await until(()=>doc.querySelector('h1')?.textContent===other.title);
 await until(()=>doc.querySelector('[data-reader-save]')?.textContent==='');const current=doc.querySelector('[data-reader-attempt]');current.focus();assert.equal(doc.activeElement,current);release();await until(()=>s.learner('learner-demo').textPages?.some(r=>r.lessonId==='qa-text-only'&&r.responses[recall.id]?.revealed));
 for(let n=0;n<10;n++)await new Promise(r=>setTimeout(r,10));
 assert.deepEqual(calls.filter(c=>c.path==='/api/progress'&&JSON.parse(c.body).step==='complete'),[]);assert.deepEqual(s.learner('learner-demo').completed,[]);assert.equal(w.location.hash,'#lesson/qa-other/qa-text');assert.equal(doc.activeElement,current);assert.equal(doc.querySelector('#toast').textContent,'');
});

for(const outcome of ['success','failure'])test('QA-TXT-04 independent: newer Back supersedes delayed position '+outcome+' after text settling',async t=>{
 const s=new Store();t.after(()=>s.close());addSynthetic(s,[recall]);const {origin}=await http(t,s);let release,hold=true;
 const {doc,w,calls}=await actualApp(t,s,origin,{beforeFetch:async(path,options)=>{if(path==='/api/progress'&&options?.method==='POST'&&JSON.parse(options.body).step==='complete'&&hold){hold=false;await new Promise(r=>release=r);if(outcome==='failure')throw Error('SYNTHETIC abandoned position failure');}}});t.after(()=>release?.());
 const attempt=doc.querySelector('[data-reader-attempt]');attempt.value='SYNTHETIC position boundary';attempt.dispatchEvent(new w.Event('input',{bubbles:true}));doc.querySelector('[data-reader-action="reveal"]').click();
 let headingFocus=0;const focus=w.HTMLElement.prototype.focus;w.HTMLElement.prototype.focus=function(...args){if(this.tagName==='H1')headingFocus++;return focus.apply(this,args);};
 doc.querySelector('.lesson-footer [data-action="step"][data-value="complete"]').click();await until(()=>release);assert.equal(w.location.hash,'#lesson/qa-text-only/complete');
 doc.querySelector('.step-strip [data-action="step"][data-value="qa-text"]').click();await until(()=>w.location.hash==='#lesson/qa-text-only/qa-text');release();await until(()=>headingFocus>0);
 for(let n=0;n<10;n++)await new Promise(r=>setTimeout(r,10));
 assert.equal(headingFocus,1,'Abandoned Finish rendered/focused in addition to the newer Back');assert.ok(doc.querySelector('[data-reader-heading]'));assert.equal(w.location.hash,'#lesson/qa-text-only/qa-text');assert.equal(doc.querySelector('#toast').textContent,'');
 const terminal=calls.filter(c=>c.path==='/api/progress'&&JSON.parse(c.body).step==='complete');assert.equal(terminal.length,1);assert.equal(terminal[0].headers['x-demo-user'],'learner-demo');assert.equal(JSON.parse(terminal[0].body).lessonId,'qa-text-only');assert.equal(s.learner('learner-demo').completed.includes('qa-text-only'),outcome==='success');assert.equal(s.learner('learner-demo').resumes['qa-text-only'].componentId,'qa-text');
});
