import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {Store} from '../src/store.js';
import {seed} from '../src/seed.js';
import {createServer} from '../src/server.js';
import {projectLesson,deriveLessonIndices,orderedLessons,resolveComponent} from '../public/course.js';
import {mountUnifiedStudio,moveComponent} from '../public/studio/unified-studio.js';
import {moveLesson,removeChapter,moveCurriculumEntry} from '../public/studio/curriculum-editor.js';
import {mountImportWorkflow,prepareImport} from '../public/studio/import-workflow.js';
import {mountSelectorEditor} from '../public/studio/selector-editor.js';
import {defaultColumnMapping,parseVocabularyCSV} from '../public/vocabulary-import.js';
import {vocabularyTable} from '../public/learner-view.js';
const fixture=()=>{const c=structuredClone(seed);c.lessons[0].sentinel={source:'synthetic-only'};c.exercises[0].requireNikkud=true;c.words[0].tags=['synthetic-a'];return c;};
const dom=()=>new JSDOM('<main></main>',{url:'http://127.0.0.1/',pretendToBeVisual:true});
const edit=(d,el,value)=>{el.value=value;el.dispatchEvent(new d.window.Event('input',{bubbles:true}));};
const change=(d,el,value)=>{el.value=value;el.dispatchEvent(new d.window.Event('change',{bubbles:true}));};
const tick=()=>new Promise(r=>setTimeout(r,20));
async function until(predicate){for(let i=0;i<100;i++){if(predicate())return;await tick();}throw new Error('UI/HTTP did not settle.');}
const tables=s=>s.db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(({name})=>[name,s.db.prepare('SELECT * FROM '+name+' ORDER BY rowid').all()]);
async function http(t){const store=new Store(),server=createServer(store);await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(async()=>{await new Promise(r=>server.close(r));store.close();});const origin='http://127.0.0.1:'+server.address().port;const stage=async input=>{const r=await fetch(origin+'/api/studio/draft',{method:'POST',headers:{'content-type':'application/json','x-demo-user':'author-demo'},body:JSON.stringify(input)});const b=await r.json();if(!r.ok)throw Object.assign(new Error(b.error),{status:r.status,...b});return b;};return {store,origin,stage};}
function csv(c){const w=c.words[0];const raw='ID,Full vowels,Standard unpointed,Curated display,Meaning,styles,taglist,raw source\r\n'+[w.id,w.pointed,w.unpointed,w.curated,w.english,JSON.stringify({pointed:{formattedValue:w.pointed,userEnteredFormat:{textFormat:{bold:true,italic:true,foregroundColor:'#123456'},backgroundColor:'#abcdef',horizontalAlignment:'RIGHT',textDirection:'RIGHT_TO_LEFT'}}}),JSON.stringify(['synthetic-a']),'  exact raw cell  '].map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',');const mapping=defaultColumnMapping(parseVocabularyCSV(raw).headers);mapping.columns.push({columnIndex:5,target:'fieldFormatting',decode:'json'},{columnIndex:6,target:'tags',decode:'json'});return {raw,mapping};}

test('two distinct text IDs, source metadata, sibling exercise input and legacy flags survive reorder/HTTP save/reload',async t=>{
 const {store,stage}=await http(t),c=fixture(),l=projectLesson(c,c.lessons[0]);l.blocks.unshift({id:'synthetic-second-text',type:'explanation',source:'inline',renderer:'text',text:'Synthetic fixture text only',sourceLocator:{exact:'retain'},options:{textDirection:'rtl'}});c.lessons[0]=deriveLessonIndices(c,l);
 const d=dom(),host=d.window.document.querySelector('main'),h=mountUnifiedStudio(host,{content:c,lessonId:l.id,baseRevisionId:1,saveDraft:stage});t.after(()=>{h.dispose();d.window.close();});
 const text=host.querySelector('[data-component-id="synthetic-second-text"] textarea');edit(d,text,'  Synthetic changed text  ');
 const form=host.querySelector('[data-owned-exercise="ex-1-recognize"] form');edit(d,form.elements.prompt,'Synthetic edited question');
 host.querySelector('[data-component-move="synthetic-second-text"][data-delta="1"]').click();
 // Native exercise Save must gather both text instances and every sibling form, not its frozen pack.
 host.querySelector('[data-owned-exercise="ex-1-recognize"] form').dispatchEvent(new d.window.Event('submit',{bubbles:true,cancelable:true}));await until(()=>store.currentDraft()||/All entered values retained/.test(host.querySelector('[data-unified-status]').textContent));
 assert.ok(store.currentDraft(),host.querySelector('[data-unified-status]').textContent+' '+host.querySelector('[data-editor-status]').textContent);
 const saved=store.currentDraft().content,lesson=saved.lessons[0];assert.equal(lesson.blocks[1].id,'synthetic-second-text');assert.equal(lesson.blocks[1].text,'  Synthetic changed text  ');assert.deepEqual(lesson.blocks[1].sourceLocator,{exact:'retain'});assert.equal(lesson.blocks.find(b=>b.id==='legacy-explanation').text,l.blocks.find(b=>b.id==='legacy-explanation').text);assert.deepEqual(lesson.sentinel,l.sentinel);assert.equal(saved.exercises[0].requireNikkud,true);assert.equal(saved.exercises[0].prompt,'Synthetic edited question');assert.deepEqual(saved.exercises.map(x=>x.id),c.exercises.map(x=>x.id));assert.deepEqual(saved.words,c.words);
 const re=dom(),mount=mountUnifiedStudio(re.window.document.querySelector('main'),{content:saved,lessonId:l.id,baseRevisionId:1,expectedDraftToken:store.currentDraft().draftToken,saveDraft:stage});assert.equal(re.window.document.querySelector('[data-component-id="synthetic-second-text"] textarea').value,'  Synthetic changed text  ');mount.dispose();re.window.close();
});

test('single lesson context, full-width components, no nested forms/manual indices, no write on mount; legacy newKeys projection is exact',()=>{
 const c=fixture(),s=new Store(),before=tables(s),d=dom(),host=d.window.document.querySelector('main'),h=mountUnifiedStudio(host,{content:c,lessonId:c.lessons[0].id,baseRevisionId:1,saveDraft:i=>s.stage(i)});
 assert.equal(host.querySelectorAll('[data-current-lesson]').length,1);assert.equal(host.querySelector('form form'),null);assert.equal(host.querySelector('[name="knownKeys"]'),null);assert.equal(host.querySelector('[name="checkExerciseIds"]'),null);assert.equal(host.querySelector('[name="introducedLetters"]').value,c.lessons[0].keyboard.newKeys);assert.equal(host.querySelector('[name="requireNikkud"]'),null);assert.deepEqual(tables(s),before);assert.equal(c.lessons[0].compositionVersion,undefined);h.dispose();d.window.close();s.close();
});

test('CAS rejection retains both text inputs, selectors and exercise input; locked pending save cannot accept overlapping save',async t=>{
 const {store,stage}=await http(t),c=fixture(),d=dom(),host=d.window.document.querySelector('main');let release;const h=mountUnifiedStudio(host,{content:c,lessonId:'lesson-1',baseRevisionId:1,saveDraft:input=>new Promise(r=>release=()=>r(stage(input)))});t.after(()=>{h.dispose();d.window.close();});
 edit(d,host.querySelector('[data-component-markdown] textarea'),'Synthetic retained text');edit(d,host.querySelector('[data-owned-exercise="ex-1-type"] [name="prompt"]'),'Synthetic retained prompt');
 const saving=h.save();assert.equal(host.querySelector('[data-current-lesson]').disabled,true);await assert.rejects(h.save(),/still reloading/);
 store.stage({baseRevisionId:1,expectedDraftToken:null,word:{id:c.words[0].id,notes:'Other synthetic tab'}});const other=tables(store);release();await assert.rejects(saving,/draft changed elsewhere/i);assert.deepEqual(tables(store),other);assert.equal(host.querySelector('[data-component-markdown] textarea').value,'Synthetic retained text');assert.equal(host.querySelector('[data-owned-exercise="ex-1-type"] [name="prompt"]').value,'Synthetic retained prompt');assert.equal(host.querySelector('[data-current-lesson]').disabled,false);
});

test('tag membership derives stable indices before save and order-preserving specific word selections do not mutate canonical objects',async()=>{
 const c=fixture(),s=new Store(),d=dom(),host=d.window.document.querySelector('main'),h=mountUnifiedStudio(host,{content:c,lessonId:'lesson-1',baseRevisionId:1,saveDraft:i=>s.stage(i)});
 const selector=host.querySelector('[data-lesson-vocabulary-selector]');change(d,selector.querySelector('[data-selector-mode]'),'tags');selector.querySelector('[data-tag="synthetic-a"]').click();await h.save();const next=s.currentDraft().content;assert.deepEqual(next.lessons[0].wordIds,[c.words[0].id]);assert.deepEqual(next.lessons[0].vocabularySelector,{mode:'tags',tags:['synthetic-a'],match:'any'});assert.deepEqual(next.words,c.words);h.dispose();d.window.close();s.close();
});

test('2000 synthetic clones keep selector result DOM at 50 and filters preserve source and ordered IDs',()=>{
 const c=fixture(),original=c.words[0];c.words=Array.from({length:2000},(_,i)=>({...structuredClone(original),id:'synthetic-'+i,tags:['fixture',i%2?'odd':'even']}));c.lessons=[];const d=dom(),host=d.window.document.querySelector('main'),before=structuredClone(c.words),h=mountSelectorEditor(host,{content:c,selector:{mode:'ids',ids:['synthetic-100','synthetic-1'],sourceUnknown:{keep:true}},onChange:()=>{}});
 assert.equal(host.querySelectorAll('[data-vocab-row]').length,50);change(d,host.querySelector('[data-vocab-tag]'),'even');edit(d,host.querySelector('[data-vocab-search]'),'synthetic-2');const button=host.querySelector('[data-vocab-id]');button.click();assert.deepEqual(h.getValue().ids,['synthetic-100','synthetic-1',button.dataset.vocabId]);assert.deepEqual(h.getValue().sourceUnknown,{keep:true});assert.deepEqual(c.words,before);assert.ok(host.querySelectorAll('[data-vocab-row]').length<=50);h.dispose();d.window.close();
});

test('chapter create/move/order/remove preserves every lesson, IDs and legacy metadata atomically',()=>{
 const c=fixture();c.curriculum={version:1,chapters:[{id:'synthetic-chapter',title:'Synthetic chapter',lessonIds:['lesson-1','lesson-2']},{id:'empty-chapter',title:'Empty',lessonIds:[]}],order:[{chapterId:'synthetic-chapter'},{lessonId:'lesson-3'},{chapterId:'empty-chapter'}]};const before=structuredClone(c);
 const moved=moveLesson(c,'lesson-2','empty-chapter'),reordered=moveCurriculumEntry(moved,{chapterId:'empty-chapter'},-1),child=moveLesson(reordered,'lesson-1','empty-chapter',0),removed=removeChapter(child,'empty-chapter');assert.deepEqual(orderedLessons(removed).map(l=>l.id),['lesson-1','lesson-2','lesson-3']);assert.deepEqual(removed.lessons,c.lessons);assert.deepEqual(c,before);assert.throws(()=>moveLesson(c,'lesson-1','missing'),/Destination/);assert.deepEqual(c,before);
});

test('mapped Review/Discard write zero tables, show actual styles/typed values/raw cells; Stage over HTTP preserves source and same-token no-op',async t=>{
 const {store,stage}=await http(t),c=store.snapshot(),{raw,mapping}=csv(c),d=dom(),host=d.window.document.querySelector('main'),session={raw,mapping,csv:true,name:'synthetic.csv',parsed:parseVocabularyCSV(raw)};const before=tables(store);
 const h=mountImportWorkflow(host,{session,getSnapshot:()=>({content:store.currentDraft()?.content||store.snapshot(),baseRevisionId:store.get('active'),expectedDraftToken:store.currentDraft()?.draftToken??null}),saveDraft:stage,renderWord:w=>vocabularyTable([w])});t.after(()=>{h.dispose();d.window.close();});
 host.querySelector('[data-prepare-import]').click();await tick();assert.deepEqual(tables(store),before);assert.ok(host.querySelector('[data-import-word-preview] [style*="font-weight"]'));assert.match(host.textContent,/fieldFormatting/);assert.match(host.textContent,/exact raw cell/);assert.equal(session.prepared.content.words[0].sourceFields['raw source'],'  exact raw cell  ');
 host.querySelector('[data-stage-import]').click();await until(()=>store.currentDraft());assert.ok(store.currentDraft());const saved=store.currentDraft(),after=tables(store),prepared=prepareImport(raw,{csv:true,mapping,content:saved.content,baseRevisionId:1,expectedDraftToken:saved.draftToken});const result=await stage({content:prepared.content,baseRevisionId:1,expectedDraftToken:saved.draftToken});assert.equal(result.draftToken,saved.draftToken);assert.deepEqual(tables(store),after);assert.deepEqual(store.snapshot(),c);
 const discardSession={raw,mapping,csv:true,name:'synthetic.csv',parsed:parseVocabularyCSV(raw)};h.dispose();const discard=mountImportWorkflow(host,{session:discardSession,getSnapshot:()=>({content:saved.content,baseRevisionId:1,expectedDraftToken:saved.draftToken}),saveDraft:stage});host.querySelector('[data-prepare-import]').click();host.querySelector('[data-discard-import]').click();assert.deepEqual(tables(store),after);assert.equal(discardSession.prepared,null);discard.dispose();
});

test('mapping/file/base changes invalidate frozen candidate; stale HTTP Stage retains source/mapping and every table',async t=>{
 const {store,stage}=await http(t),c=store.snapshot(),{raw,mapping}=csv(c),d=dom(),host=d.window.document.querySelector('main'),snapshot={content:c,baseRevisionId:1,expectedDraftToken:null},session={raw,mapping,csv:true,name:'synthetic.csv',parsed:parseVocabularyCSV(raw)};const h=mountImportWorkflow(host,{session,getSnapshot:()=>snapshot,saveDraft:stage});t.after(()=>{h.dispose();d.window.close();});
 host.querySelector('[data-prepare-import]').click();assert.ok(session.prepared);change(d,host.querySelector('[data-map-target="7"]'),'notes');assert.equal(session.prepared,null);assert.equal(host.querySelector('[data-stage-import]'),null);change(d,host.querySelector('[data-map-target="7"]'),'');host.querySelector('[data-prepare-import]').click();
 store.stage({baseRevisionId:1,expectedDraftToken:null,word:{id:c.words[0].id,notes:'Synthetic other-tab edit'}});const before=tables(store);host.querySelector('[data-stage-import]').click();await until(()=>/Draft changed elsewhere/.test(host.textContent));assert.match(host.textContent,/Draft changed elsewhere/);assert.equal(session.raw,raw);assert.deepEqual(session.mapping,mapping);assert.deepEqual(tables(store),before);snapshot.expectedDraftToken=store.currentDraft().draftToken;h.refresh();assert.equal(host.querySelector('[data-stage-import]').disabled,true);
});

test('malformed typed map and stale v2 indices reject Review atomically; JSON import remains lossless',()=>{
 const c=fixture(),{raw,mapping}=csv(c);assert.throws(()=>prepareImport(raw.replace('#123456','url(bad)'),{csv:true,mapping,content:c,baseRevisionId:1,expectedDraftToken:null}),/hex color/);
 const v=structuredClone(c);v.lessons[0]=projectLesson(v,v.lessons[0]);v.lessons[0].exerciseIds.reverse();assert.throws(()=>prepareImport(JSON.stringify(v),{content:c,baseRevisionId:1,expectedDraftToken:null}),/stale/);
 const json=structuredClone(c);json.unknown={retain:['exact']};const p=prepareImport(JSON.stringify(json),{content:c,baseRevisionId:1,expectedDraftToken:null});assert.deepEqual(p.content,json);assert.deepEqual(c,fixture());
});

test('accessible move and pointer ordering keep stable text IDs, no exercise clones, and disposal removes drag listeners',()=>{
 const c=fixture();c.lessons[0]=projectLesson(c,c.lessons[0]);const d=dom(),host=d.window.document.querySelector('main'),h=mountUnifiedStudio(host,{content:c,lessonId:'lesson-1',baseRevisionId:1,saveDraft:()=>{}});const ids=c.exercises.map(e=>e.id),rows=[...host.querySelectorAll('[data-component-id]')];rows.forEach((row,i)=>row.getBoundingClientRect=()=>({top:i*100,height:100}));
 const button=host.querySelector('[data-component-drag="legacy-explanation"]');const pointer=(type,y)=>{const ev=new d.window.MouseEvent(type,{bubbles:true,clientY:y,button:0});Object.defineProperty(ev,'pointerId',{value:1});return ev;};button.dispatchEvent(pointer('pointerdown',10));d.window.document.dispatchEvent(pointer('pointerup',250));assert.equal(h.getContent().lessons[0].blocks[2].id,'legacy-explanation');assert.deepEqual(h.getContent().exercises.map(e=>e.id),ids);h.dispose();d.window.document.dispatchEvent(pointer('pointerup',0));d.window.close();
});

test('successive text edits bind to the saved workspace; invalid sibling JSON keeps the selected lesson and input intact',async()=>{
 const c=fixture(),s=new Store(),d=dom(),host=d.window.document.querySelector('main'),h=mountUnifiedStudio(host,{content:c,lessonId:'lesson-1',baseRevisionId:1,saveDraft:i=>s.stage(i)});
 edit(d,host.querySelector('[data-component-markdown] textarea'),'Synthetic first save');await h.save();edit(d,host.querySelector('[data-component-markdown] textarea'),'Synthetic second save');await h.save();assert.equal(s.currentDraft().content.lessons[0].blocks.find(b=>b.type==='explanation').text,'Synthetic second save');
 edit(d,host.querySelector('[name="interactions"]'),'[invalid JSON');change(d,host.querySelector('[data-current-lesson]'),'lesson-2');assert.equal(host.querySelector('[data-current-lesson]').value,'lesson-1');assert.equal(host.querySelector('[name="interactions"]').value,'[invalid JSON');assert.equal(s.currentDraft().content.lessons[0].blocks.find(b=>b.type==='explanation').text,'Synthetic second save');h.dispose();d.window.close();s.close();
});

test('native chapter controls rename without swallowing first move click and remove a nonempty chapter by preserving its children',async()=>{
 const c=fixture(),s=new Store(),d=dom(),host=d.window.document.querySelector('main'),h=mountUnifiedStudio(host,{content:c,lessonId:'lesson-1',baseRevisionId:1,newId:p=>p+'-synthetic-new',saveDraft:i=>s.stage(i)});
 edit(d,host.querySelector('[data-new-chapter]'),'Synthetic chapter');host.querySelector('[data-create-chapter]').click();const title=host.querySelector('[data-chapter-title="chapter-synthetic-new"]');change(d,title,'Renamed synthetic chapter');change(d,host.querySelector('[data-move-destination]'),'chapter-synthetic-new');host.querySelector('[data-move-lesson]').click();await h.save();const saved=s.currentDraft().content;assert.deepEqual(saved.curriculum.chapters.find(ch=>ch.id==='chapter-synthetic-new').lessonIds,['lesson-1']);assert.equal(saved.curriculum.chapters.find(ch=>ch.id==='chapter-synthetic-new').title,'Renamed synthetic chapter');host.querySelector('[data-remove-chapter="chapter-synthetic-new"]').click();await h.save();assert.equal(s.currentDraft().content.curriculum.chapters.some(ch=>ch.id==='chapter-synthetic-new'),false);assert.deepEqual(s.currentDraft().content.lessons.map(l=>l.id),c.lessons.map(l=>l.id));h.dispose();d.window.close();s.close();
});

test('guided specific-word selection is an unsaved edit even though hidden values emit no input event; frozen reviewed candidates cannot change',()=>{
 const c=fixture(),d=dom(),host=d.window.document.querySelector('main'),h=mountUnifiedStudio(host,{content:c,lessonId:'lesson-1',baseRevisionId:1,saveDraft:()=>{}});
 assert.equal(h.isDirty(),false);host.querySelector('[data-owned-exercise="ex-1-type"] [data-vocab-id="w-mi"]').click();assert.equal(h.isDirty(),true);assert.equal(h.getContent().exercises.find(e=>e.id==='ex-1-type').wordId,'w-mi');const {raw,mapping}=csv(c),p=prepareImport(raw,{csv:true,mapping,content:c,baseRevisionId:1,expectedDraftToken:null});assert.equal(Object.isFrozen(p.content.words[0]),true);assert.throws(()=>p.content.words[0].pointed='modified',TypeError);h.dispose();d.window.close();
});
