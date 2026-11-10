import test from 'node:test';import assert from 'node:assert/strict';import {IDBFactory} from 'fake-indexeddb';import {JSDOM} from 'jsdom';
import {fixture} from '../adapters/wordpress/conjugation/rehearsal/fixture.js';
import {Drill} from '../public/conjugation/engine.js';import {serializeRun,hydrateRun} from '../public/conjugation/run-state.js';import {createRunStore,validOwner} from '../public/conjugation/run-store.js';import {mountConjugation} from '../public/conjugation/view.js';
const setup={kind:'verb',wordIds:['fixture-study'],tenses:['past','present'],scope:'all',person:'all',gender:'all',number:'all'};
const fresh=()=>new Drill(fixture,fixture.forms.slice(0,3),{allowFixtures:true,random:()=>.999});
const snapshot=d=>serializeRun(fixture,d,{setup,nikkud:true,direction:'he',paused:false,runId:'synthetic-run'});
const tick=()=>new Promise(r=>setTimeout(r,0));
for(const platform of ['native','wordpress'])for(const direction of ['he','en'])test(`${platform} ${direction}: choices advance, incorrect choices wait, missed pass and final cleanup persist silently`,async()=>{
 const db=new IDBFactory(),owner='native:auto-choice',catalog={...fixture,forms:fixture.forms.filter(f=>f.wordId==='fixture-study')},options={platform,catalog};
 let x=await ui(db,owner,options);const select=x.root.querySelector('[data-action=direction]');select.value=direction;select.dispatchEvent(new x.dom.window.Event('change',{bubbles:true}));await x.click('start');
 const store=createRunStore(owner,{indexedDB:db});let raw=(await store.read()).run;
 const wrong=raw.drill.options.findIndex(id=>id!==raw.drill.queue[raw.drill.index]);
 x.root.querySelector(`[data-action=answer][data-index="${wrong}"]`).click();assert(!x.root.textContent.includes('Saving drill'));await x.mount.flush();
 assert(x.root.querySelector('.cp-choice-error'));assert.equal(x.root.querySelectorAll('.cp-answer-correct').length,1);assert.equal(x.root.querySelectorAll('.cp-answer-wrong').length,1);assert.equal(x.root.querySelector('[data-action=next]').textContent,'Continue');
 assert.equal((await store.read()).run.drill.index,raw.drill.index);assert.equal((await store.read()).run.drill.feedback,'incorrect');
 x.close();x=await ui(db,owner,options);assert(x.root.querySelector('.cp-answer-correct'));assert.equal(x.root.querySelector('[data-action=next]').textContent,'Continue');await x.click('next');
 let count=0,sawMissedPass=false;
 while((raw=(await store.read()).run)){
  assert(++count<6);if(raw.drill.pass>1)sawMissedPass=true;
  const correct=raw.drill.options.indexOf(raw.drill.queue[raw.drill.index]);x.root.querySelector(`[data-action=answer][data-index="${correct}"]`).click();assert(!x.root.textContent.includes('Saving drill'));await x.mount.flush();await tick();
  assert(x.root.querySelector('.cp-choice-success'));assert(!x.root.querySelector('[data-action=next]'));
  const after=(await store.read()).run;if(after){assert(after.drill.index!==raw.drill.index||after.drill.pass!==raw.drill.pass);assert.equal(after.drill.feedback,null);x.close();x=await ui(db,owner,options);assert.deepEqual((await store.read()).run,after);}
 }
 assert(sawMissedPass);assert.match(x.root.textContent,/Drill complete/);x.close();
});
async function ui(db,owner='native:synthetic',options={}){
 const dom=new JSDOM('<main></main>',{url:'https://synthetic.invalid'});dom.window.indexedDB=db;
 const root=dom.window.document.querySelector('main'),mount=mountConjugation(root,{catalog:fixture,learnedIds:fixture.forms.map(f=>f.id),allowFixtures:true,ownerKey:owner,...options});await mount.ready;
 const click=async a=>{const b=root.querySelector(`[data-action=${a}]`);assert(b,a+' exists');b.click();await mount.flush();await tick();};
 const type=async text=>{const i=root.querySelector('[data-typed]');i.value=text;i.dispatchEvent(new dom.window.Event('input',{bubbles:true}));await mount.flush();};
 return {root,mount,dom,click,type,close(){mount.destroy();dom.window.close();}};
}
for(const platform of ['native','wordpress'])test(platform+': text-node and nested-element clicks preserve the durable lifecycle',async()=>{
 const x=await ui(new IDBFactory(),'native:text-click',{platform}),errors=[];x.dom.virtualConsole.on('jsdomError',e=>errors.push(e));
 const textClick=async action=>{const b=x.root.querySelector(`[data-action=${action}]`);assert(b&&!b.disabled,action);b.firstChild.dispatchEvent(new x.dom.window.MouseEvent('click',{bubbles:true}));await x.mount.flush();await tick();};
 await textClick('start');assert(x.root.querySelector('.cp-practice'));
 await x.click('write');await x.type('synthetic pointer draft');
 await textClick('pause');assert(x.root.querySelector('[data-action=resume]'));assert(x.root.querySelector('[data-action=start]').matches(':disabled'));
 const resume=x.root.querySelector('[data-action=resume]'),span=x.dom.window.document.createElement('span');span.textContent=resume.textContent;resume.replaceChildren(span);span.click();await x.mount.flush();await tick();
 assert.equal(x.root.querySelector('[data-typed]').value,'synthetic pointer draft');
 await textClick('end');assert(!x.root.querySelector('[data-action=resume]'));assert(!x.root.querySelector('[data-action=start]').disabled);assert.deepEqual(errors,[]);x.close();
});
for(const stage of ['draft','chosen','shown','incorrect','override','missed-pass'])test('exact immutable snapshot roundtrip: '+stage,()=>{
 const d=fresh();d.setMode('write');d.typed='synthetic draft';
 if(stage==='chosen'){d.choice=d.options[1].id;d.grade(d.options[1].unpointed,'choose');}
 if(stage==='shown')d.show();
 if(['incorrect','override','missed-pass'].includes(stage))d.grade('synthetic mismatch','write');
 if(stage==='override')d.override();
 if(stage==='missed-pass'){d.next();while(d.pass===1){d.grade(d.current.unpointed);d.next();}}
 const before=JSON.stringify(fixture),raw=snapshot(d),restored=hydrateRun(fixture,raw,{allowFixtures:true});
 assert.deepEqual(snapshot(restored.drill),raw);assert.equal(JSON.stringify(fixture),before);assert.equal(restored.drill.current,fixture.forms.find(f=>f.id===d.current.id));
 raw.drill.typed='changed';assert.equal(restored.drill.typed,'synthetic draft'===d.typed?'synthetic draft':d.typed);
});
for(const mutate of [x=>x.schema=99,x=>x.source.forms[0].english='changed',x=>x.drill.queue[0]='missing',x=>x.drill.index=999,x=>x.drill.options.reverse()&&x.drill.options.push('missing'),x=>x.setup.wordIds=['unknown']])test('incompatible saved state rejected without mutation: '+mutate,()=>{
 const raw=snapshot(fresh());mutate(raw);const before=JSON.stringify(raw);assert.throws(()=>hydrateRun(fixture,raw,{allowFixtures:true}));assert.equal(JSON.stringify(raw),before);
});
test('namespace validation and account isolation; atomic competing saves and durable terminal tombstones',async()=>{
 for(const bad of ['',null,'global','wordpress:','wordpress:undefined','native: a'])assert.equal(validOwner(bad),false);
 const db=new IDBFactory(),a=createRunStore('native:a',{indexedDB:db}),b=createRunStore('native:b',{indexedDB:db}),sibling=createRunStore('native:a',{indexedDB:db});
 assert.equal((await b.read()).run,null);
 const results=await Promise.allSettled([a.write(0,snapshot(fresh())),sibling.write(0,snapshot(fresh()))]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(results.find(r=>r.status==='rejected').reason.code,'CONFLICT');
 await a.write(1,null);await assert.rejects(sibling.write(1,snapshot(fresh())),{code:'CONFLICT'});await a.write(2,snapshot(fresh()));await assert.rejects(sibling.write(1,null),{code:'CONFLICT'});
 assert.equal((await a.read()).revision,3);assert.equal((await b.read()).revision,0);
});
test('same-user fresh mount restores exact draft, Nikkud, modes, queue and pause; Back/new Start cannot replace',async()=>{
 const db=new IDBFactory();let x=await ui(db);await x.click('start');await x.click('write');await x.type('exact Hebrew draft א');await x.click('nikkud');
 const store=createRunStore('native:synthetic',{indexedDB:db}),before=(await store.read()).run;x.close();
 x=await ui(db);assert.equal(x.root.querySelector('[data-typed]').value,'exact Hebrew draft א');assert.equal(x.root.querySelector('[data-action=nikkud]').checked,true);assert.deepEqual((await store.read()).run,before);
 await x.click('back');assert(x.root.querySelector('[data-action=resume]'));assert(x.root.querySelector('[data-action=start]').matches(':disabled'));await x.click('start');assert(x.root.querySelector('[data-action=resume]'));
 x.close();x=await ui(db);assert(x.root.querySelector('[data-action=resume]'));await x.click('resume');assert.equal(x.root.querySelector('[data-typed]').value,'exact Hebrew draft א');await x.click('pause');await x.click('end');assert.equal((await store.read()).run,null);x.close();
});
test('different profiles never hydrate another owner; concurrent stale tab input/pause/end cannot resurrect',async()=>{
 const db=new IDBFactory();const a=await ui(db);await a.click('start');await a.click('write');const b=await ui(db);const other=await ui(db,'native:other');assert(other.root.querySelector('[data-action=start]'));
 await a.click('end');await a.click('start');await a.click('write');await a.type('new run');
 await b.type('stale run');assert.match(b.root.textContent,/another tab/);await b.click('end');
 assert.equal((await createRunStore('native:synthetic',{indexedDB:db}).read()).run.drill.typed,'new run');a.close();b.close();other.close();
});
for(const failure of ['QuotaExceededError','AbortError'])test('failed '+failure+' keeps draft mounted; Pause/End never claim saved or navigate, retry works',async()=>{
 const db=new IDBFactory(),real=createRunStore('native:synthetic',{indexedDB:db});let fail=false;
 const x=await ui(db,'native:synthetic',{runStore:{read:()=>real.read(),write:(...args)=>fail?Promise.reject(Error(failure)):real.write(...args)}});
 await x.click('start');await x.click('write');fail=true;await x.type('viable draft');await x.click('pause');assert.equal(x.root.querySelector('[data-typed]').value,'viable draft');assert.match(x.root.textContent,/could not be saved/);await x.click('end');assert(x.root.querySelector('[data-typed]'));
 fail=false;await x.click('pause');assert(x.root.querySelector('[data-action=resume]'));assert.equal((await real.read()).run.drill.typed,'viable draft');x.close();
});
test('storage unavailable and source mismatch keep saved state untouched and block replacement',async()=>{
 const unavailable=await ui(undefined);assert.match(unavailable.root.textContent,/unavailable/);assert.equal(unavailable.root.querySelector('[data-action=start]'),null);unavailable.close();
 const db=new IDBFactory(),store=createRunStore('native:synthetic',{indexedDB:db}),raw=snapshot(fresh());raw.source.forms[0].english='older source';await store.write(0,raw);
 const x=await ui(db);assert.match(x.root.textContent,/incompatible/);assert.equal(x.root.querySelector('[data-action=start]'),null);assert.deepEqual((await store.read()).run,raw);x.close();
});
test('actual completion clears only after missed passes; shown/graded hydrate without regrading',async()=>{
 const db=new IDBFactory();let x=await ui(db);await x.click('start');await x.click('write');await x.click('show');const store=createRunStore('native:synthetic',{indexedDB:db});const shown=(await store.read()).run;x.close();x=await ui(db);assert(x.root.querySelector('[data-action=missed]'));assert.deepEqual((await store.read()).run,shown);await x.click('missed');
 for(let i=0;i<30&&!x.root.textContent.includes('Drill complete');i++){
  if(x.root.querySelector('[data-action=knew]'))await x.click('knew');
  if(x.root.querySelector('[data-action=next]'))await x.click('next');
  else if(x.root.querySelector('[data-action=show]'))await x.click('show');
 }
 assert.match(x.root.textContent,/Drill complete/);assert.equal((await store.read()).run,null);x.close();
});

test('real IndexedDB transaction abort is rejected and preserves committed revision/run',async()=>{
 const db=new IDBFactory(),real=createRunStore('native:abort',{indexedDB:db});await real.write(0,snapshot(fresh()));
 const connection=await new Promise((resolve,reject)=>{const r=db.open('hebleo-conjugation-runs',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 const transaction=connection.transaction.bind(connection);connection.transaction=(...args)=>{const tx=transaction(...args);if(args[1]==='readwrite'){const objectStore=tx.objectStore.bind(tx);tx.objectStore=(name)=>{const store=objectStore(name),put=store.put.bind(store);store.put=(...values)=>{const request=put(...values);tx.abort();return request;};return store;};}return tx;};
 const facade={open(){const request={};queueMicrotask(()=>{request.result=connection;request.onsuccess();});return request;}};
 const broken=createRunStore('native:abort',{indexedDB:facade});await assert.rejects(broken.write(1,null),/aborted/);
 assert.equal((await real.read()).revision,1);assert((await real.read()).run);connection.close();
});
test('two nonterminal writers fence stale save/end; queued writes capture immutable snapshots',async()=>{
 const db=new IDBFactory(),a=createRunStore('wordpress:17',{indexedDB:db}),b=createRunStore('wordpress:17',{indexedDB:db});
 const raw=snapshot(fresh()),write=a.write(0,raw);raw.drill.typed='mutated after request';await write;assert.equal((await a.read()).run.drill.typed,'');
 const changed=snapshot(fresh());changed.drill.typed='newer draft';await b.write(1,changed);await assert.rejects(a.write(1,null),{code:'CONFLICT'});await assert.rejects(a.write(1,snapshot(fresh())),{code:'CONFLICT'});assert.equal((await a.read()).run.drill.typed,'newer draft');
});
test('reverse direction and all setup targets survive paused fresh mount; choice feedback/order survives fresh mount',async()=>{
 const db=new IDBFactory();let x=await ui(db);const el=x.root.querySelector('[data-action=direction]');el.value='en';el.dispatchEvent(new x.dom.window.Event('change',{bubbles:true}));
 const target=x.root.querySelector('[data-word=fixture-want]');target.click();const filter=x.root.querySelector('[data-filter=person]');filter.value='1';filter.dispatchEvent(new x.dom.window.Event('change',{bubbles:true}));
 await x.click('start');const store=createRunStore('native:synthetic',{indexedDB:db}),initial=(await store.read()).run;const wrong=initial.drill.options.findIndex(id=>id!==initial.drill.queue[initial.drill.index]);x.root.querySelector(`[data-action=answer][data-index="${wrong}"]`).click();await x.mount.flush();const before=(await store.read()).run;
 const options=[...x.root.querySelectorAll('[data-action=answer]')].map(b=>b.textContent);x.close();x=await ui(db);assert.deepEqual([...x.root.querySelectorAll('[data-action=answer]')].map(b=>b.textContent),options);assert(x.root.querySelector('[data-action=answer][aria-pressed=true]'));assert(x.root.querySelector('.cp-feedback'));assert.deepEqual((await store.read()).run,before);
 await x.click('pause');x.close();x=await ui(db);assert.equal(x.root.querySelector('[data-action=direction]').value,'en');assert.equal(x.root.querySelector('[data-filter=person]').value,'1');assert.equal(x.root.querySelector('[data-word=fixture-want]').checked,false);await x.click('resume');assert.deepEqual((await store.read()).run.setup,before.setup);x.close();
});
test('failed terminal completion retains last viable saved prompt and blocks replacement until explicit End retry',async()=>{
 const db=new IDBFactory(),real=createRunStore('native:synthetic',{indexedDB:db});let rejectTerminal=true;
 const x=await ui(db,'native:synthetic',{runStore:{read:()=>real.read(),write:(rev,run)=>run===null&&rejectTerminal?Promise.reject(Error('synthetic terminal failure')):real.write(rev,run)}});
 await x.click('start');await x.click('write');
 for(let i=0;i<30&&!x.root.textContent.includes('Drill complete');i++){
  if(x.root.querySelector('[data-action=knew]'))await x.click('knew');
  if(x.root.querySelector('[data-action=next]'))await x.click('next');else if(x.root.querySelector('[data-action=show]'))await x.click('show');
 }
 assert.match(x.root.textContent,/could not be saved/);assert((await real.read()).run);await x.click('back');assert.match(x.root.textContent,/Drill complete/);rejectTerminal=false;await x.click('end');assert.equal((await real.read()).run,null);assert(x.root.querySelector('[data-action=start]'));x.close();
});

test('failed autosave survives native-style destroy/remount; browser leave warns until committed retry',async()=>{
 const db=new IDBFactory(),real=createRunStore('native:navigation',{indexedDB:db});let fail=false;
 const options={runStore:{read:()=>real.read(),write:(...args)=>fail?Promise.reject(Error('synthetic offline storage')):real.write(...args)}};
 let x=await ui(db,'native:navigation',options);await x.click('start');await x.click('write');fail=true;await x.type('unsaved retained answer');
 const leave=new x.dom.window.Event('beforeunload',{cancelable:true});x.dom.window.dispatchEvent(leave);assert(leave.defaultPrevented);x.close();
 x=await ui(db,'native:navigation',options);assert.equal(x.root.querySelector('[data-typed]').value,'unsaved retained answer');assert.match(x.root.textContent,/Unsaved drill recovered/);fail=false;await x.click('pause');
 const savedLeave=new x.dom.window.Event('beforeunload',{cancelable:true});x.dom.window.dispatchEvent(savedLeave);assert(!savedLeave.defaultPrevented);assert.equal((await real.read()).run.drill.typed,'unsaved retained answer');x.close();
});

for(const [kind,mutate] of [
 ['source',raw=>raw.source.forms[0].english='synthetic older source'],
 ['schema',raw=>raw.schema=999],
 ['form',raw=>raw.drill.queue[0]='synthetic-missing-form']
])test('known '+kind+' mismatch stays preserved until explicit CAS End; failed End and other owner remain intact',async()=>{
 const db=new IDBFactory(),owner='native:mismatch-'+kind,store=createRunStore(owner,{indexedDB:db}),other=createRunStore('native:untouched-'+kind,{indexedDB:db});
 const raw=snapshot(fresh());mutate(raw);await store.write(0,raw);await other.write(0,snapshot(fresh()));const otherBefore=await other.read();let fail=true;
 const x=await ui(db,owner,{runStore:{read:()=>store.read(),write:(...args)=>fail?Promise.reject(Error('synthetic quota')):store.write(...args)}});
 assert.match(x.root.textContent,/incompatible.*preserved/s);assert.equal(x.root.querySelector('[data-action=start]'),null);assert.equal(x.root.querySelector('[data-action=resume]'),null);
 assert(x.root.querySelector('[data-action=end]').classList.contains('cp-end'));assert.deepEqual((await store.read()).run,raw);
 await x.click('end');assert.match(x.root.textContent,/could not be saved/);assert.match(x.root.textContent,/Retry End drill/);assert(x.root.querySelector('[data-action=end]'));assert.deepEqual((await store.read()).run,raw);
 fail=false;await x.click('end');assert.equal((await store.read()).run,null);assert.equal((await store.read()).revision,2);assert(x.root.querySelector('[data-action=start]'));assert.deepEqual(await other.read(),otherBefore);x.close();
});
test('incompatible stale End cannot delete newer run and conflict removes End permission',async()=>{
 const db=new IDBFactory(),owner='native:stale-incompatible',store=createRunStore(owner,{indexedDB:db}),raw=snapshot(fresh());raw.schema=999;await store.write(0,raw);
 const x=await ui(db,owner);assert(x.root.querySelector('[data-action=end]'));
 const newer=snapshot(fresh());newer.runId='synthetic-newer-run';await store.write(1,newer);await x.click('end');assert.match(x.root.textContent,/another tab/);assert.equal(x.root.querySelector('[data-action=end]'),null);assert.deepEqual((await store.read()).run,newer);x.close();
});
test('initial storage/read failure makes no existing-run claim and offers no End even when a slot exists',async()=>{
 for(const withSlot of [false,true]){
  const db=new IDBFactory(),owner='native:unread-'+withSlot,store=createRunStore(owner,{indexedDB:db});if(withSlot)await store.write(0,snapshot(fresh()));let writes=0;
  const x=await ui(db,owner,{runStore:{read:()=>Promise.reject(Error('synthetic storage unavailable')),write:()=>{writes++;throw Error('must not write');}}});
  assert.match(x.root.textContent,/could not be read/);assert.doesNotMatch(x.root.textContent,/Your saved drill is retained|Your incompatible saved drill/);assert.equal(x.root.querySelector('[data-action=end]'),null);assert.equal(x.root.querySelector('[data-action=start]'),null);assert.equal(writes,0);assert.equal((await store.read()).revision,withSlot?1:0);x.close();
 }
});
test('newer revision observed while recovering unsaved memory never offers End',async()=>{
 const db=new IDBFactory(),owner='native:newer-observed',real=createRunStore(owner,{indexedDB:db});let fail=false;
 const options={runStore:{read:()=>real.read(),write:(...args)=>fail?Promise.reject(Error('synthetic storage failure')):real.write(...args)}};
 let x=await ui(db,owner,options);await x.click('start');await x.click('write');fail=true;await x.type('old uncommitted answer');x.close();
 const current=await real.read(),newer=snapshot(fresh());newer.runId='synthetic-newer';await real.write(current.revision,newer);
 x=await ui(db,owner,options);assert.match(x.root.textContent,/changed in another tab/);assert.equal(x.root.querySelector('[data-action=end]'),null);assert.deepEqual((await real.read()).run,newer);x.close();
});
for(const [label,learned] of [
 ['queue revocation',[]],
 ['partial queue',fixture.forms.slice(0,1).map(f=>f.id)],
 ['candidate-only revocation',fixture.forms.slice(0,1).map(f=>f.id)]
])test('Learned only hydrate preserves blocked '+label+' until explicit End',async()=>{
 const db=new IDBFactory(),owner='native:eligibility-'+label.replaceAll(' ','-'),store=createRunStore(owner,{indexedDB:db});
 const d=label==='candidate-only revocation'?new Drill(fixture,fixture.forms.slice(0,1),{allowFixtures:true,choiceForms:fixture.forms.slice(0,3)}):fresh();
 const raw=snapshot(d);raw.setup.scope='learned';await store.write(0,raw);
 const x=await ui(db,owner,{learnedIds:learned});assert.match(x.root.textContent,/no longer learned/);assert.equal(x.root.querySelector('[data-action=resume]'),null);assert.equal(x.root.querySelector('[data-action=start]'),null);assert.deepEqual((await store.read()).run,raw);await x.click('end');assert.equal((await store.read()).run,null);x.close();
});
for(const [platform,scope,learned] of [
 ['native','learned',fixture.forms.map(f=>f.id)],
 ['native','all',[]],
 ['wordpress','learned',[]]
])test(platform+' '+scope+' hydrate keeps compatible superset/ahead/WP behavior',async()=>{
 const db=new IDBFactory(),owner=platform==='wordpress'?'wordpress:81':'native:allowed-'+scope,store=createRunStore(owner,{indexedDB:db});
 const raw=snapshot(fresh());raw.setup.scope=scope;raw.setup.learnedIds=fixture.forms.slice(0,3).map(f=>f.id);await store.write(0,raw);
 const x=await ui(db,owner,{platform,learnedIds:learned});assert(x.root.querySelector('[data-action=write]'));assert.deepEqual((await store.read()).run,raw);assert.doesNotMatch(x.root.textContent,/no longer learned/);x.close();
});
