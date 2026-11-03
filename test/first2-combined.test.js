import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {JSDOM} from 'jsdom';
import {mountTextReader} from '../public/text-reader.js';
import {textPageGatePassed,validateTextPages,validateTextResponse} from '../public/text-contract.js';
import {Store} from '../src/store.js';
import {createServer} from '../src/server.js';
import {replaceFirstTwo} from '../scripts/install-first2.mjs';
import {validateSchema,semanticErrors} from '../schemas/tools/contracts.mjs';
const json=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const pack=json('content/first2/lessons.json'),oldPack=json('content/first2/history/revision5.json'),revision=json('docs/curriculum/memory-feedback-20261031/REVISION.json');
const pages=pack.lessons[0].blocks[0].textPages,find=kind=>pages.pages.find(p=>p.activity?.kind===kind),flush=()=>new Promise(r=>setImmediate(r));
function harness(t,p,options={}){
 const dom=new JSDOM('<main></main>',{pretendToBeVisual:true}),w=dom.window,host=w.document.querySelector('main');let time=0,id=0;const jobs=new Map();
 const clock={now:()=>time,schedule:(f,ms)=>{jobs.set(++id,{at:time+ms,f});return id;},cancel:id=>jobs.delete(id),advance(ms){time+=ms;for(const [id,j]of [...jobs])if(j.at<=time){jobs.delete(id);j.f();}},get count(){return jobs.size;}};
 const textPages={version:1,activityVersion:1,pages:[p,{id:'after',title:'After',type:'complete'}],order:[p.id,'after']};
 const binding=mountTextReader(host,{textPages,renderLesson:s=>s,dock:false,clock,onContinue:async()=>{},...options});
 t.after(()=>{binding.destroy();w.close();});
 return {w,host,binding,clock,click(a){const el=host.querySelector('[data-source-action="'+a+'"]');assert.ok(el,a);assert.equal(el.disabled,false,a);el.click();},input(v){const el=host.querySelector('textarea');el.value=v;el.dispatchEvent(new w.Event('input',{bubbles:true}));}};
}
test('reconciled exact copy and six stable pages, 125-word welcome, numbered experience, bold 70, no application quiz, MNTL exact',()=>{
 assert.equal(pages.pages.length,6);assert.deepEqual(pages.order,revision.order);assert.deepEqual(pack.lessons[1],oldPack.lessons[1]);
 const dom=new JSDOM(pages.pages.slice(0,2).map(p=>p.html).join(''));assert.equal(dom.window.document.querySelectorAll('ol li').length,3);assert.equal(dom.window.document.querySelector('strong').textContent,'70 hours');assert.equal([...dom.window.document.querySelectorAll('p,li')].map(e=>e.textContent).join(' ').trim().split(/\s+/).length+3,125);dom.window.close();
 assert.ok(pages.pages.every(p=>p.type!=='choice'));assert.equal(find('memory-comparison').activity.id,'MEMORY-A2.embedded.number-return');assert.equal(pack.memoryFeedbackTransition.progressRemapped,false);validateTextPages(pages);
});
test('study option is collapsed, untimed, explicit and never speech; interrupted study resumes hidden recall',async t=>{
 const p=find('memory-first'),h=harness(t,p);h.w.speechSynthesis={speak(){assert.fail('No TTS');}};
 assert.equal(h.host.querySelector('details').open,false);assert.equal(h.host.querySelector('[data-source-action=speak]'),null);assert.equal(h.host.querySelector('[data-source-exposure]'),null);
 h.click('study');assert.equal(h.clock.count,0);assert.equal(h.host.querySelector('[data-source-exposure]').textContent,p.activity.value);assert.match(h.host.textContent,/Untimed study mode/);assert.equal(h.binding.getState().responses[p.id].study,true);h.click('hide-study');assert.equal(h.host.querySelector('[data-source-exposure]'),null);h.input('0704');h.click('submit-first');validateTextResponse(p,h.binding.getState().responses[p.id]);
 const resumed=harness(t,p,{initialState:{responses:{[p.id]:{study:true,started:true}}}});assert.equal(resumed.host.querySelector('[data-source-exposure]'),null);assert.ok(resumed.host.querySelector('textarea'));
});
test('sixteen digit nodes retain identity through groups, slashes, settled labels, replay and principle toggles',async t=>{
 const p=find('date-connection'),h=harness(t,p),nodes=[...h.host.querySelectorAll('[data-digit]')];assert.equal(nodes.length,16);assert.equal(h.host.querySelector('[data-date-frame]').style.visibility,'hidden');assert.equal(textPageGatePassed(p,{}),true);
 h.click('animate');assert.equal(h.host.querySelector('[data-date-teaching]').hidden,true);h.clock.advance(40);assert.equal(h.binding.getState().responses[p.id].stage,1);h.clock.advance(1800);assert.equal(h.binding.getState().responses[p.id].stage,2);assert.equal(h.host.querySelector('[data-date-teaching]').hidden,true);h.clock.advance(900);assert.equal(h.host.querySelector('[data-date-teaching]').hidden,false);
 assert.deepEqual([...h.host.querySelectorAll('[data-digit]')],nodes);assert.equal(nodes.map(n=>n.textContent).join(''),'0704177609112001');assert.equal(nodes[0].style.transform,'translateX(2ch)');assert.equal(nodes[8].style.transform,'translateX(15ch)');
 const rows=h.host.querySelectorAll('[data-source-principle]');assert.equal(rows.length,3);rows[2].open=true;rows[2].dispatchEvent(new h.w.Event('toggle'));assert.equal(rows[0].open,true);assert.equal(rows[1].open,false);assert.equal(rows[2].open,true);assert.equal(h.host.querySelector('[data-source-action=next]').disabled,false);
 h.click('animate');h.clock.advance(40);h.clock.advance(1800);h.clock.advance(900);assert.deepEqual([...h.host.querySelectorAll('[data-digit]')],nodes);assert.equal(rows[2].open,true);validateTextResponse(p,h.binding.getState().responses[p.id]);
});
test('reduced motion uses explicit coordinate steps, all principle rows available, Continue never requires them',t=>{
 const p=find('date-connection'),h=harness(t,p);h.w.matchMedia=()=>({matches:true});const nodes=[...h.host.querySelectorAll('[data-digit]')];h.click('animate');assert.equal(h.clock.count,0);h.click('animation-next');assert.equal(h.host.querySelector('[data-date-teaching]').hidden,true);h.click('animation-next');assert.equal(h.host.querySelector('[data-date-teaching]').hidden,false);assert.deepEqual([...h.host.querySelectorAll('[data-digit]')],nodes);h.click('next');assert.match(h.host.textContent,/After/);
});
for(const phase of ['closed','open','empty','typed','compared','skipped'])test('optional comparison Continue remains independent: '+phase,async t=>{
 const p=find('memory-comparison'),h=harness(t,p);if(phase!=='closed'){const el=h.host.querySelector('details');el.open=true;el.dispatchEvent(new h.w.Event('toggle'));}
 if(['typed','compared'].includes(phase))h.input('11/9/2001 · 4/7/1776');if(phase==='compared'){h.click('compare');assert.match(h.host.textContent,/swapped their order/);assert.match(h.host.textContent,/day–month/);assert.match(h.host.textContent,/zeroes/);}if(phase==='skipped')h.click('skip');
 assert.equal(h.host.querySelectorAll('nav .primary').length,1);assert.ok(h.host.querySelector('nav [data-source-action=next]'));h.click('next');await flush();assert.match(h.host.querySelector('h3').textContent,/After/);
 if(phase==='closed')assert.equal(h.binding.getState().responses[p.id]?.attempted,undefined);
});
test('unresolved and rejected optional saves never block Continue; raw work/retry survives departure and remount',async t=>{
 const p=find('memory-comparison');let reject,cache;const h=harness(t,p,{saveProgress:r=>r.optional?new Promise((_,no)=>{reject=no;}):Promise.resolve(),onState:s=>{cache=s;}});
 h.input('07041776 raw');await flush();h.click('next');await flush();assert.equal(h.host.querySelector('h3').textContent,'After');assert.equal(cache.responses[p.id].text,'07041776 raw');assert.ok(cache.unsavedOptional.includes(p.id));reject(Error('synthetic offline'));await h.binding.optionalSettled();h.binding.destroy();
 const restored=harness(t,p,{initialState:{...cache,cursorPageId:p.id},saveProgress:async()=>{}});assert.equal(restored.host.querySelector('textarea').value,'07041776 raw');assert.match(restored.host.textContent,/could not save/);restored.click('retry');await restored.binding.optionalSettled();assert.deepEqual(restored.binding.getState().unsavedOptional,[]);
});
function stripped(p){const clean=structuredClone(p);for(const l of clean.lessons)for(const p of l.blocks[0].textPages.pages){if(p.activity)delete p.activity.image;for(const item of p.activity?.items||[])delete item.image;}return clean;}
test('old quiz/comparison stay revision-pinned, latest answers never reinterpret them; backup/restore twice retains raw history',()=>{
 const s=new Store(),recovery=new Store();try{
  const old=replaceFirstTwo(s.snapshot(),stripped(oldPack)).content,oldId=s.addRevision(old,'Historical first2 fixture');s.set('active',oldId);
  const ctx={lessonId:'MEMORY-A2',componentId:'MEMORY-A2-interactive',revisionId:oldId};
  s.saveProgress('learner-demo',{...ctx,step:'learn',question:0,answer:'',selectedTokens:[],matching:{}});
  for(const [id,response]of [['MEMORY-A2.learn.meaning',{choice:1,checked:true,attempted:true}],['MEMORY-A2.learn.return',{text:'11/9/2001 · 4/7/1776',opened:true,attempted:true,checked:true}]])s.saveTextProgress('learner-demo',{...ctx,pageId:id,cursorPageId:id,response});
  const historical=structuredClone(s.learner('learner-demo').textPages),latest=structuredClone(old);latest.lessons[0]=stripped(pack).lessons[0];s.set('active',s.addRevision(latest,'Combined candidate'));
  assert.equal(s.session('learner-demo','MEMORY-A2').revisionId,oldId);assert.equal(s.session('learner-demo','MEMORY-A2').content.lessons[0].blocks[0].textPages.pages.length,7);
  const newCtx={...ctx,revisionId:s.get('active')},current=s.textProgress('learner-demo',newCtx);assert.equal(current.responses['MEMORY-A2.learn.meaning'],undefined);assert.equal(current.responses['MEMORY-A2.learn.return'],undefined);assert.deepEqual(s.learner('learner-demo').textPages,historical);
  s.saveTextProgress('learner-demo',{...newCtx,pageId:'MEMORY-A2.learn.meaning',cursorPageId:'MEMORY-A2.learn.meaning',response:{text:'0704',opened:true,checked:true,attempted:true}});
  for(let i=0;i<2;i++)recovery.restore(i?recovery.backup():s.backup());const records=recovery.learner('learner-demo').textPages;assert.equal(records.length,2);const oldRecord=records.find(r=>r.responses['MEMORY-A2.learn.return']);assert.equal(oldRecord.responses['MEMORY-A2.learn.meaning'].choice,1);assert.equal(oldRecord.responses['MEMORY-A2.learn.return'].text,'11/9/2001 · 4/7/1776');assert.equal(records.find(r=>!r.responses['MEMORY-A2.learn.return']).responses['MEMORY-A2.learn.meaning'].text,'0704');
 }finally{s.close();recovery.close();}
});
test('optional/expandable malformed contracts reject through HTTP save/publish/restore with zero mutation',async t=>{
 const s=new Store(),content=replaceFirstTwo(s.snapshot(),stripped(pack)).content;s.set('active',s.addRevision(content,'Synthetic combined validation'));const base=s.get('active');s.stage({baseRevisionId:base,expectedDraftToken:null,content});const draft=s.get('draft'),backup=s.backup(),server=createServer(s);await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(async()=>{await new Promise(r=>server.close(r));s.close();});
 const dump=()=>JSON.stringify(s.db.prepare("SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name").all().map(({name})=>[name,s.db.prepare('SELECT * FROM "'+name+'" ORDER BY rowid').all()]));
 const changes=[p=>p.activity.optional='yes',p=>delete p.activity.intro,p=>delete p.activity.id,p=>p.gate='commit',p=>p.options=['retired quiz'],p=>p.answer=1,p=>p.activity.intro=' ',p=>p.activity.kind='memory-first'];
 for(const change of changes){const bad=structuredClone(content),p=bad.lessons[0].blocks[0].textPages.pages.find(p=>p.activity?.optional);change(p);assert.ok(validateSchema('content-pack',bad).length||semanticErrors(bad).length);
  for(const route of ['studio/draft','studio/publish','restore']){let body;if(route==='studio/draft')body={baseRevisionId:base,expectedDraftToken:s.currentDraft().draftToken,content:bad};else if(route==='studio/publish'){s.set('draft',{...draft,content:bad});body={baseRevisionId:base,draftToken:s.currentDraft().draftToken};}else{body=structuredClone(backup);body.content=bad;}
   const before=dump(),r=await fetch('http://127.0.0.1:'+server.address().port+'/api/'+route,{method:'POST',headers:{'x-demo-user':'author-demo','content-type':'application/json'},body:JSON.stringify(body)});assert.equal(r.status,400,route);assert.equal(dump(),before,route+' atomic');s.set('draft',draft);
  }
 }
 const connection=find('date-connection');assert.throws(()=>validateTextResponse(connection,{principlesOpen:[0,0]}));assert.throws(()=>validateTextResponse(find('memory-first'),{study:'yes'}));
});
