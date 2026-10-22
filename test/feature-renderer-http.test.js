// Owner verification only. External read-only runtime pinned by the handoff.
// Synthetic seed, in-memory SQLite, ephemeral localhost port; no existing app data.
import {test as nodeTest} from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {existsSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {mountExerciseEditor,exerciseTypes} from '../public/studio/exercise-editor.js';
import {mountLessonEditor} from '../public/studio/lesson-editor.js';
import {mountLessonPreview} from '../public/preview/lesson-preview.js';
const lead=process.env.HEBLEO_FEATURE_RUNTIME || resolve('.');
const available=existsSync(resolve(lead,'public/preview/learner-renderer.js'));
if(process.env.HEBLEO_FEATURE_RUNTIME)assert.ok(available,'Explicit runtime must contain the actual shared renderer');
// The saved Feature base predates Lead's API/renderer. These run on the integrated
// checkout by default, or on an explicitly supplied isolated runtime; never mocks.
const test=(name,fn)=>nodeTest(name,{skip:available?false:'Requires Lead shared renderer/runtime or HEBLEO_FEATURE_RUNTIME'},fn);
const {Store}=await import(pathToFileURL(resolve(lead,'src/store.js')));
const {createServer}=await import(pathToFileURL(resolve(lead,'src/server.js')));
const {seed}=await import(pathToFileURL(resolve(lead,'src/seed.js')));
const createLearnerRenderer=available?(await import(pathToFileURL(resolve(lead,'public/preview/learner-renderer.js')))).createLearnerRenderer:null;
const profiles=['learner-demo','learner-core','author-demo'];
const tick=()=>new Promise(r=>setImmediate(r));
const dump=s=>JSON.stringify(s.db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(({name})=>[name,s.db.prepare('SELECT * FROM "'+name+'" ORDER BY 1').all()]));
async function setup(t){
  const store=new Store(),server=createServer(store,{mediaRoot:resolve('nonexistent-fixture-media')});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const origin='http://127.0.0.1:'+server.address().port;
  t.after(async()=>{await new Promise(r=>server.close(r));store.close();});
  async function api(path,input,user='author-demo'){
    const res=await fetch(origin+path,{method:input===undefined?'GET':'POST',headers:{'x-demo-user':user,'content-type':'application/json'},body:input===undefined?undefined:JSON.stringify(input)});
    assert.equal(res.headers.get('cache-control'),'no-store');const value=await res.json();
    if(!res.ok)throw Object.assign(new Error(value.error),{...value,status:res.status});return value;
  }
  return {store,api};
}
function domFor(t){const dom=new JSDOM('<main></main>');t.after(()=>dom.window.close());return {dom,container:dom.window.document.querySelector('main')};}
async function save(dom,form,done){form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));await done;await tick();}
const change=(dom,form,key,value)=>{form.elements.namedItem(key).value=value;form.elements.namedItem(key).dispatchEvent(new dom.window.Event('input',{bubbles:true}));};
function fixture(){
  const c=structuredClone(seed);c.unknownPack={source:'synthetic-fixture',retain:true};
  for(const item of [...c.words,...c.lessons,...c.exercises]){
    item.privateSource={locator:'synthetic-row',unknown:['retain']};item.approval={status:'fixture-only'};
    item.media={assetId:'synthetic-audio',revisionId:'r1',sha256:'a'.repeat(64),unknown:{retain:true}};
    item.fieldFormatting={fixture:{textFormatRuns:[{startIndex:0,format:{bold:true}}]}};
  }
  return c;
}
test('all six editors stage and reload exact opaque fields using the actual HTTP CAS contract',async t=>{
  const {store,api}=await setup(t);let c=fixture(),token=null;
  const learners=profiles.map(p=>store.learner(p)),published=store.snapshot();
  for(const type of exerciseTypes){
    const {dom,container}=domFor(t);let finish;const done=new Promise(r=>finish=r);
    const ex=c.exercises.find(e=>e.type===type);
    const dispose=mountExerciseEditor(container,{content:c,exerciseId:ex.id,baseRevisionId:1,expectedDraftToken:token,
      saveDraft:input=>api('/api/studio/draft',input).finally(finish)});t.after(dispose);
    await save(dom,container.querySelector('form'),done);assert.match(container.textContent,/Draft saved/);
    const state=await api('/api/studio');assert.deepEqual(state.draft.content,c);token=state.draft.draftToken;
    assert.match(token,/^dt1-[a-f0-9]{64}$/);dispose();
  }
  assert.deepEqual(profiles.map(p=>store.learner(p)),learners);assert.deepEqual(store.snapshot(),published);
});
test('both editor kinds keep rejected input/token, recover after validation error and preserve source/media through reload',async t=>{
  for(const kind of ['exercise','lesson']){
    const {api,store}=await setup(t),c=fixture(),{dom,container}=domFor(t);let token=null,finished,requests=[];
    const config={content:c,baseRevisionId:1,expectedDraftToken:null,saveDraft:input=>{requests.push(structuredClone(input));return api('/api/studio/draft',input).finally(()=>finished());},onSaved:result=>token=result.draftToken};
    const dispose=kind==='exercise'?mountExerciseEditor(container,{...config,exerciseId:c.exercises[0].id}):mountLessonEditor(container,{...config,lessonId:c.lessons[0].id});t.after(dispose);
    const form=container.querySelector('form'),key=kind==='exercise'?'prompt':'title';
    async function attempt(value){change(dom,form,key,value);const done=new Promise(r=>finished=r);await save(dom,form,done);}
    await attempt('');assert.equal(form.elements.namedItem(key).value,'');assert.equal(store.currentDraft(),null);
    await attempt('Synthetic authored edit');assert.ok(token);const saved=store.currentDraft();
    await attempt('');assert.deepEqual(store.currentDraft(),saved);assert.equal(form.elements.namedItem(key).value,'');
    await attempt('Synthetic recovered edit');assert.equal(requests.at(-1).expectedDraftToken,saved.draftToken);
    const reloaded=await api('/api/studio');const collection=kind==='exercise'?'exercises':'lessons';
    const expected=structuredClone(c);expected[collection][0][key]='Synthetic recovered edit';assert.deepEqual(reloaded.draft.content,expected);
    const previousToken=token;await api('/api/studio/draft',{baseRevisionId:1,expectedDraftToken:token,word:{id:'w-mi',notes:'Synthetic other editor'}});
    const conflicting=store.currentDraft();await attempt('Synthetic retained conflict');
    assert.match(form.textContent,/Draft changed elsewhere/);assert.equal(token,previousToken);assert.equal(form.elements.namedItem(key).value,'Synthetic retained conflict');assert.deepEqual(store.currentDraft(),conflicting);
  }
});
test('controller uses real read-only HTTP preparation/grading; all profiles and database rows survive every rehearsal action',async t=>{
  const {store,api}=await setup(t),{dom,container}=domFor(t);const staged=await api('/api/studio/draft',{baseRevisionId:1,expectedDraftToken:null,content:fixture()});
  for(const user of profiles)store.attempt(user,{requestId:'fixture-'+user,revisionId:1,exerciseId:'ex-1-type',answer:'אני'});
  const baseline=dump(store),views=[];const preferences={nikkud:'curated',keyboardPinned:false};
  const preview=mountLessonPreview(container,{lessonId:'lesson-1',draftToken:staged.draftToken,preferences,
    loadSession:input=>api('/api/studio/preview/session',input),evaluate:input=>api('/api/studio/preview/evaluate',input),
    renderer:{mount(body,view){views.push(view);body.textContent='Adapter observer';return ()=>body.replaceChildren();}}});t.after(()=>preview.dispose());
  await preview.ready;assert.equal(views.length,1);
  for(const step of ['learn','check','vocabulary','apply','complete'])preview.go(step);
  preview.go('check');assert.equal(views.at(-1).exerciseId,'ex-1-recognize');assert.equal(views.at(-1).content.exercises[0].answers,undefined);assert.equal(views.at(-1).content.exercises[0].distractors,undefined);
  const answer={text:'who',matching:{},selectedTokens:[]};preview.setAnswer(answer);await preview.submit('who');
  assert.equal(views.at(-1).result.correct,true);assert.deepEqual(views.at(-1).answer,answer);
  preview.lookup('w-mi');preview.setPreference('nikkud','none');preview.setPreference('keyboardPinned',true);preview.retry();preview.go('apply');
  preview.setAnswer({text:'אני',matching:{},selectedTokens:[]});await preview.submit('אני');assert.equal(views.at(-1).result.correct,true);
  preview.next();const matching={'w-hu':'he','w-hi':'she','w-mi':'who'};preview.setAnswer({text:'',matching,selectedTokens:[]});await preview.submit(matching);assert.equal(views.at(-1).result.correct,true);
  preview.exit();assert.equal(container.childElementCount,0);assert.deepEqual(preferences,{nikkud:'curated',keyboardPinned:false});assert.equal(dump(store),baseline);
  for(const user of ['learner-demo','learner-core'])await assert.rejects(api('/api/studio/preview/session',{lessonId:'lesson-1',draftToken:staged.draftToken},user),e=>e.status===403);
  assert.equal(dump(store),baseline);
});
test('actual HTTP stale-token conflict freezes controller without discarding answer or writing state',async t=>{
  const {api,store}=await setup(t),{container}=domFor(t),views=[];
  const first=await api('/api/studio/draft',{baseRevisionId:1,expectedDraftToken:null,content:fixture()});
  const preview=mountLessonPreview(container,{lessonId:'lesson-1',draftToken:first.draftToken,loadSession:x=>api('/api/studio/preview/session',x),evaluate:x=>api('/api/studio/preview/evaluate',x),renderer:{mount(body,view){views.push(view);return ()=>body.replaceChildren();}}});t.after(()=>preview.dispose());await preview.ready;preview.go('apply');preview.setAnswer({text:'who',matching:{},selectedTokens:[]});
  await api('/api/studio/draft',{baseRevisionId:1,expectedDraftToken:first.draftToken,word:{id:'w-mi',notes:'Synthetic intervening edit'}});
  const baseline=dump(store);await preview.submit('who');assert.match(container.textContent,/draft changed/);assert.throws(()=>preview.retry(),/unavailable/);assert.equal(container.querySelector('[data-preview-content]').childElementCount,1);preview.exit();assert.equal(dump(store),baseline);
});

async function settled(predicate){for(let i=0;i<100;i++){if(predicate())return;await new Promise(r=>setTimeout(r,5));}throw new Error('UI/HTTP did not settle');}
async function rendererHarness(t,options={}){
  const {store,api}=await setup(t),{dom,container}=domFor(t),content=fixture(),requests=[];
  const staged=await api('/api/studio/draft',{baseRevisionId:1,expectedDraftToken:null,content});
  for(const user of profiles){
    store.attempt(user,{requestId:'renderer-'+user,revisionId:1,exerciseId:'ex-1-type',answer:'אני'});
    store.saveProgress(user,{lessonId:'lesson-2',revisionId:1,step:'apply',question:1,answer:'Saved synthetic response '+user,selectedTokens:[],matching:{}});
  }
  const baseline=dump(store),preferences={nikkud:'curated',keyboardVisible:false},views=[];
  const actual=createLearnerRenderer(),renderer={mount(body,props){views.push(props);const dispose=actual.mount(body,props),update=dispose.update;dispose.update=next=>{const reused=update(next);if(reused)views.push(next);return reused;};return dispose;}};
  Object.defineProperty(dom.window,'localStorage',{get(){throw new Error('Forbidden rehearsal storage');}});
  dom.window.fetch=()=>{throw new Error('Renderer must use injected author APIs');};
  const preview=mountLessonPreview(container,{lessonId:options.lessonId||'lesson-1',draftToken:staged.draftToken,preferences,renderer,
    loadSession:input=>api('/api/studio/preview/session',input),evaluate:async input=>{requests.push(structuredClone(input));return options.evaluate?options.evaluate(input,api):api('/api/studio/preview/evaluate',input);}});
  t.after(()=>preview.dispose());await preview.ready;
  assert.ok(container.querySelector('[data-preview-root]'));
  return {store,api,dom,container,preview,content,staged,baseline,preferences,views,requests,root:()=>container.querySelector('[data-preview-root]')};
}
function input(h,value){const el=h.root().querySelector('#answer');el.value=value;el.dispatchEvent(new h.dom.window.Event('input',{bubbles:true}));return el;}
function choose(h,selector){const el=h.root().querySelector(selector);assert.ok(el,selector);el.click();}
async function check(h){const count=h.requests.length;choose(h,'[data-action="check"]');await settled(()=>h.root()?.querySelector('.feedback'));assert.equal(h.requests.length,count+1);assert.equal(h.views.at(-1).result.correct,true);}

test('actual renderer serializes all six families through author HTTP and preserves every table/profile',async t=>{
  for(const lessonId of ['lesson-1','lesson-2']){
    const h=await rendererHarness(t,{lessonId});
    if(lessonId==='lesson-1'){
      h.preview.go('check');choose(h,'[data-action="choice"][data-value="who"]');await check(h);assert.equal(h.requests.at(-1).answer,'who');
      h.preview.go('apply',0);input(h,'אני');await check(h);assert.equal(h.requests.at(-1).answer,'אני');
      h.preview.go('apply',1);
      const pairs={'w-hu':'he','w-hi':'she','w-mi':'who'};
      for(const [id,meaning]of Object.entries(pairs)){choose(h,'[data-match-word="'+id+'"]');choose(h,'[data-match-target="'+meaning+'"]');}
      await check(h);assert.deepEqual(h.requests.at(-1).answer,pairs);
    }else{
      h.preview.go('apply',0);
      for(const token of ['אני','ב','בית']){
        const el=[...h.root().querySelectorAll('[data-action="token"]')].find(el=>el.textContent===token&&!el.disabled);assert.ok(el,token);el.click();
      }
      assert.equal(h.root().querySelector('.assembled-sentence').textContent,'אני בבית');await check(h);assert.equal(h.requests.at(-1).answer,'אני בבית');
      h.preview.go('apply',1);input(h,'היא');await check(h);assert.equal(h.requests.at(-1).answer,'היא');
      h.preview.go('apply',2);input(h,'היא בבית');await check(h);assert.equal(h.requests.at(-1).answer,'היא בבית');
    }
    for(const step of h.views[0].content.lessons.find(l=>l.id===lessonId).blocks.map(b=>b.type==='explanation'?'learn':b.type==='vocabulary'?'vocabulary':'apply'))h.preview.go(step);
    h.preview.go('vocabulary');choose(h,'.word-card [data-action="lookup"]');assert.ok(h.root().querySelector('.preview-lookup'));
    choose(h,'[data-preview-lookup-close]');choose(h,'[data-preview-pref="vocabularyView"][data-preview-value="table"]');assert.ok(h.root().querySelector('table'));
    h.preview.setPreference('nikkud','none');h.preview.setPreference('keyboardPinned',true);h.preview.go('apply');h.preview.retry();h.preview.next();h.preview.go('complete');choose(h,'[data-action="exit"]');
    assert.equal(h.container.childElementCount,0);assert.deepEqual(h.preferences,{nikkud:'curated',keyboardVisible:false});assert.equal(dump(h.store),h.baseline);
  }
});

test('renderer keeps invalid HTTP answer drafts for correction and stale responses freeze the UI',async t=>{
  let invalid=true;
  const h=await rendererHarness(t,{evaluate:async(input,api)=>{
    if(invalid){invalid=false;return api('/api/studio/preview/evaluate',{...input,answer:{invalid:'matching payload on typing'}});}
    return api('/api/studio/preview/evaluate',input);
  }});
  h.preview.go('apply');input(h,'אנ');choose(h,'[data-action="check"]');await settled(()=>/Invalid|answer/i.test(h.container.querySelector('[data-preview-status]').textContent)&&!h.views.at(-1).busy);
  assert.equal(h.root().querySelector('#answer').value,'אנ');assert.equal(h.views.at(-1).result,null);input(h,'אני');await check(h);
  h.preview.retry();input(h,'אני');await h.api('/api/studio/draft',{baseRevisionId:1,expectedDraftToken:h.staged.draftToken,word:{id:'w-mi',notes:'Synthetic concurrent draft'}});
  const before=dump(h.store);choose(h,'[data-action="check"]');await settled(()=>/draft changed/.test(h.container.textContent));
  assert.equal(h.root().querySelector('#answer').value,'אני');assert.equal(h.root().querySelector('#answer').readOnly,true);assert.throws(()=>h.preview.retry(),/unavailable/);h.preview.exit();assert.equal(dump(h.store),before);
});

test('keyboard events, remounts and retained detached controls produce one HTTP submission and no late UI work',async t=>{
  let release;
  const h=await rendererHarness(t,{evaluate:(input,api)=>new Promise(resolve=>release=()=>resolve(api('/api/studio/preview/evaluate',input)))});
  let learnerEvents=0;
  h.container.addEventListener('keydown',event=>{if(!event.defaultPrevented&&!event.target.closest('[data-preview-root]'))learnerEvents++;});
  h.preview.go('apply');h.preview.setPreference('keyboardVisible',true);h.preview.setPreference('keyboardVisible',false);h.preview.go('vocabulary');h.preview.go('apply');
  const answer=input(h,'אני'),oldRoot=h.root(),oldCheck=oldRoot.querySelector('[data-action="check"]');
  const event=new h.dom.window.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true});answer.dispatchEvent(event);
  assert.equal(event.defaultPrevented,true);assert.equal(learnerEvents,0);assert.equal(h.requests.length,1);assert.equal(h.root().getAttribute('aria-busy'),'true');
  oldCheck.click();oldRoot.dispatchEvent(new h.dom.window.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));choose(h,'[data-action="pending-answer"]');assert.equal(h.requests.length,1);
  h.preview.exit();release();await tick();await tick();assert.equal(h.container.childElementCount,0);assert.equal(dump(h.store),h.baseline);
  const newer=mountLessonPreview(h.container,{lessonId:'lesson-1',draftToken:h.staged.draftToken,renderer:createLearnerRenderer(),loadSession:x=>h.api('/api/studio/preview/session',x),evaluate:x=>h.api('/api/studio/preview/evaluate',x)});
  await newer.ready;assert.equal(h.container.querySelectorAll('[data-preview-root]').length,1);oldCheck.click();assert.equal(h.requests.length,1);newer.dispose();
});
