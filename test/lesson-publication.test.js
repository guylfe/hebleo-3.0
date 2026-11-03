import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Store,validateContent,draftTokenFor} from '../src/store.js';
import {createServer} from '../src/server.js';
import {projectLesson,deriveLessonIndices} from '../public/course.js';
import {rebaseDraftJSON} from '../src/lesson-publication.js';
import {lexicalFixture} from '../scripts/lexical-fixture.mjs';
import {fixture as sourceFixture} from '../test-support/source-fixture.js';

// Every authored edit, private note, media byte and extra lesson here is synthetic.
const author='author-demo',headers={'x-demo-user':author,'content-type':'application/json'};
const dump=s=>JSON.stringify(s.db.prepare("SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name").all().map(({name})=>[name,s.db.prepare('SELECT * FROM "'+name+'" ORDER BY rowid').all()]));
const writes=s=>s.db.prepare('SELECT total_changes() AS n').get().n;
function setup(t) {
  const dir=mkdtempSync(join(tmpdir(),'hebleo-selected-publication-')),file=join(dir,'disposable.sqlite'),s=new Store(file);
  s.media.bindRoot(dir);t.after(()=>{s.close();rmSync(dir,{recursive:true,force:true});});return {s,dir,file};
}
const stage=(s,content)=>s.stage({baseRevisionId:s.get('active'),expectedDraftToken:s.currentDraft()?.draftToken??null,content});
const scope=(s,includeDependencies=[],lessonId=s.snapshot().lessons[0].id)=>({baseRevisionId:s.get('active'),expectedDraftToken:s.currentDraft().draftToken,lessonId,includeDependencies});
const publish=(s,input=scope(s))=>s.publishLesson({...input,reviewToken:s.reviewLessonPublication(input).reviewToken});
function draft23(s) {
  const c=s.snapshot();c.lessons[0].explanation='Synthetic selected saved text 😀 שָׁלוֹם';
  c.lessons[1].explanation='Synthetic other saved text';c.lessons[2].unknown={retained:[1,null,'😀']};
  c.unknownPack={retained:'private draft metadata',nested:[null,false]};
  for(let i=0;i<20;i++)c.lessons.push({id:'synthetic-legacy-'+i,title:'Synthetic unapproved lesson',compositionVersion:2,introducedLetters:'',minutes:1,wordIds:[],exerciseIds:[],checkExerciseIds:[],publicationStatus:'unpublished-adapted-draft',provenance:{kind:'adapted-draft',approval:'pending'},blocks:[{id:'text',type:'explanation',source:'inline',renderer:'text',text:'Synthetic legacy content'}],unknown:{index:i}});
  stage(s,c);return c;
}
function note(s) {
  const d=s.currentDraft(),l=d.content.lessons[0],exact='😀 שָׁלוֹם',start=l.explanation.indexOf(exact);
  return s.authorReview.create(author,{requestId:randomUUID(),lessonId:l.id,baseRevisionId:d.baseRevisionId,draftToken:d.draftToken,componentId:null,pageId:null,activityId:null,fieldPath:'explanation',selection:start<0?null:{start,end:start+exact.length,exact,prefix:l.explanation.slice(0,start),suffix:l.explanation.slice(start+exact.length)},body:'Synthetic private note'});
}
function v2(s) {
  const c=s.snapshot();c.lessons=c.lessons.map(l=>projectLesson(c,l));validateContent(c);s.set('active',s.addRevision(c,'Synthetic v2 publication fixture'));return c;
}
const dependency=(kind,id,action='changed')=>({kind,id,action});
async function http(t,s,mediaRoot) {
  const server=createServer(s,{mediaRoot});await new Promise(r=>server.listen(0,'127.0.0.1',r));
  t.after(()=>{server.closeAllConnections();return new Promise(r=>server.close(r));});
  const origin='http://127.0.0.1:'+server.address().port;
  return {origin,post:async(path,body,user=author)=>{const r=await fetch(origin+path,{method:'POST',headers:{...headers,'x-demo-user':user},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};}};
}

test('disk publication retains all 23 saved lessons, raw draft bytes, old contexts, learner pins and later saves',t=>{
  const {s,file}=setup(t),active=s.snapshot(),base=s.get('active');
  const learner=s.learner('learner-demo');learner.resumes[active.lessons[0].id]={revisionId:base,step:0};learner.preferences.sounds=true;s.saveLearner('learner-demo',learner);
  const c=draft23(s);const oldNote=note(s),oldReview=JSON.stringify(s.authorReview.state()),oldLearners=JSON.stringify(s.db.prepare('SELECT * FROM learners').all());
  // Even whitespace/escaping and unknown record metadata must survive the rebase.
  const raw=JSON.stringify({...s.get('draft'),extra:{value:'baseRevisionId',unknown:true}},null,2);
  s.db.prepare("UPDATE kv SET value=? WHERE key='draft'").run(raw);
  const input=scope(s),before=dump(s),count=writes(s),review=s.reviewLessonPublication(input);
  assert.equal(review.canPublish,true);assert.deepEqual(review.requiredDependencies,[]);assert.equal(review.changes.length,1);
  assert.equal(dump(s),before);assert.equal(writes(s),count);assert.deepEqual(s.reviewLessonPublication(input),review);
  const result=s.publishLesson({...input,reviewToken:review.reviewToken});
  assert.equal(result.revisionId,base+1);assert.equal(s.snapshot().lessons.length,3);
  const expected=structuredClone(active);expected.lessons[0]=c.lessons[0];assert.deepEqual(s.snapshot(),expected);
  assert.deepEqual(s.currentDraft().content,c);assert.equal(s.currentDraft().content.lessons.length,23);
  assert.equal(s.db.prepare("SELECT value FROM kv WHERE key='draft'").get().value,rebaseDraftJSON(raw,base,result.revisionId));
  assert.equal(JSON.stringify(s.db.prepare('SELECT * FROM learners').all()),oldLearners);
  assert.equal(JSON.stringify(s.authorReview.state()),oldReview);assert.deepEqual(s.authorReview.contexts(),[c]);
  assert.deepEqual(s.authorReview.state().comments[0],oldNote);assert.deepEqual(s.snapshot(base),active);
  assert.deepEqual(result.workspace,{revisionId:result.revisionId,content:expected,draft:s.currentDraft()});
  assert.equal(result.remainingSavedChanges.filter(x=>x.kind==='lessons').length,22);
  assert.notEqual(result.workspace.draft.draftToken,input.expectedDraftToken);
  const after=dump(s);assert.throws(()=>s.publishLesson({...input,reviewToken:review.reviewToken}),e=>e.code==='STALE_BASE');assert.equal(dump(s),after);
  assert.throws(()=>s.stage({baseRevisionId:base,expectedDraftToken:input.expectedDraftToken,content:c}),e=>e.code==='STALE_BASE');
  note(s);assert.deepEqual(s.authorReview.contexts(),[c,c]);
  const next=structuredClone(result.workspace.draft.content);next.lessons[1].explanation+=' later save';next.lessons[0].explanation+=' later edit';stage(s,next);
  assert.deepEqual(s.snapshot(),expected);assert.deepEqual(s.currentDraft().content,next);
  const reopened=new Store(file);try{assert.deepEqual(reopened.snapshot(),expected);assert.deepEqual(reopened.currentDraft(),s.currentDraft());assert.deepEqual(reopened.authorReview.contexts(),[c,c]);}finally{reopened.close();}
});

test('no-op creates no revision, media, draft or sequence writes',t=>{
  const {s}=setup(t);const c=s.snapshot();c.lessons[1].explanation+=' synthetic unrelated change';stage(s,c);
  const before=dump(s),count=writes(s),result=publish(s);
  assert.equal(result.noChanges,true);assert.equal(result.revisionId,scope(s).baseRevisionId);assert.equal(dump(s),before);assert.equal(writes(s),count);
});

test('changed referenced words and shared exercises require exact inclusion and show downstream effects',t=>{
  const {s}=setup(t),c=v2(s),shared=c.exercises[0];
  c.lessons[1].blocks.push({id:'shared',type:'exercise-set',source:'exercises',renderer:'practice',role:'apply',selector:{mode:'ids',ids:[shared.id]}});
  c.lessons[1]=deriveLessonIndices(c,c.lessons[1]);s.set('active',s.addRevision(c,'Synthetic shared exercise baseline'));
  shared.prompt='Synthetic changed prompt';const word=c.words.find(w=>w.id===shared.wordId);word.english+=' synthetic changed';stage(s,c);
  const required=[dependency('words',word.id),dependency('exercises',shared.id)];
  const blocked=s.reviewLessonPublication(scope(s));assert.equal(blocked.canPublish,false);assert.equal(blocked.requiredDependencies.length,2);
  assert(blocked.requiredDependencies.every(d=>d.potentiallyAffectedPublishedLessons.includes(c.lessons[1].id)));
  const review=s.reviewLessonPublication(scope(s,required));assert.equal(review.canPublish,true);assert(review.affectedPublishedLessons.includes(c.lessons[1].id));
  const result=publish(s,scope(s,required));assert.deepEqual(s.snapshot().exercises[0],shared);assert.deepEqual(s.snapshot().lessons[1],c.lessons[1]);assert.equal(result.publication.includedChanges.length,2);
});

test('new shared exercise binding closes over a word not listed by the lesson',t=>{
  const {s}=setup(t),c=v2(s),l=c.lessons[0],w={...c.words[0],id:'synthetic-bound-word'};c.words.push(w);
  const e={...c.exercises[0],id:'synthetic-shared-exercise',prompt:'fixture',vocabularyBindings:[{id:'binding',wordId:w.id,field:'prompt',start:0,end:7,text:'fixture',sourceText:'fixture'}]};c.exercises.push(e);
  l.blocks.push({id:'new-exercise',type:'exercise-set',source:'exercises',renderer:'practice',role:'apply',selector:{mode:'ids',ids:[e.id]}});c.lessons[0]=deriveLessonIndices(c,l);stage(s,c);
  const deps=[dependency('exercises',e.id,'added'),dependency('words',w.id,'added')];
  assert.equal(s.reviewLessonPublication(scope(s,[deps[0]])).canPublish,false);
  assert.equal(s.reviewLessonPublication(scope(s,deps)).canPublish,true);publish(s,scope(s,deps));
  assert.deepEqual(s.snapshot().words.at(-1),w);assert.deepEqual(s.snapshot().exercises.at(-1),e);
});

for(const mode of ['addition','removal','exclusion'])test('tag selector '+mode+' requires explicit objects and exact membership',t=>{
  const {s}=setup(t),c=v2(s),l=c.lessons[0],w=c.words.at(-1);
  l.blocks.find(b=>b.type==='vocabulary').selector={mode:'tags',tags:['synthetic'],match:'any'};
  if(mode!=='addition')w.tags=['synthetic'];s.set('active',s.addRevision(c,'Synthetic tags baseline'));
  if(mode==='addition')w.tags=['synthetic'];else if(mode==='removal')w.tags=[];else {l.blocks.find(b=>b.type==='vocabulary').selector.excludeIds=[w.id];w.notes+=' synthetic exact exclusion metadata';}
  stage(s,c);assert.equal(s.reviewLessonPublication(scope(s)).canPublish,false);
  const input=scope(s,[dependency('words',w.id)]);assert.equal(s.reviewLessonPublication(input).canPublish,true);publish(s,input);assert.deepEqual(s.snapshot().words.at(-1),w);
});

test('tag closure includes simultaneous new IDs and removed old matches, including selected-lesson prerequisites',t=>{
  const {s}=setup(t),c=v2(s),l=c.lessons[0],old=c.words.at(-1);old.tags=['synthetic-mixed'];
  l.blocks.find(b=>b.type==='vocabulary').selector={mode:'tags',tags:['synthetic-mixed'],match:'any'};s.set('active',s.addRevision(c,'Synthetic mixed tags baseline'));
  const added={...c.words[0],id:'synthetic-mixed-new',tags:[],prerequisiteIds:[l.id]};c.words.push(added);old.tags=[];
  l.blocks.find(b=>b.type==='vocabulary').selector.includeIds=[added.id];l.blocks[0].text+=' synthetic change';stage(s,c);
  const review=s.reviewLessonPublication(scope(s));assert.deepEqual(new Set(review.requiredDependencies.map(d=>d.id)),new Set([added.id,old.id]));
  const input=scope(s,[dependency('words',old.id),dependency('words',added.id,'added')]);assert.equal(s.reviewLessonPublication(input).canPublish,true);publish(s,input);
});

test('cross-lesson membership and shared derived-index rewrites block instead of broadening scope',t=>{
  const {s}=setup(t),c=v2(s),l=c.lessons[0];
  l.blocks.find(b=>b.type==='vocabulary').selector={mode:'lesson',lessonId:c.lessons[1].id};c.lessons[1].wordIds.push(c.words.find(w=>!c.lessons[1].wordIds.includes(w.id)).id);stage(s,c);
  assert(s.reviewLessonPublication(scope(s)).blockers.some(b=>b.code==='OTHER_LESSON_REQUIRED'));
  const c2=v2(s);c2.lessons[2].vocabularySelector={mode:'tags',tags:['synthetic-index'],match:'any'};
  for(const w of c2.words)if(c2.lessons[2].wordIds.includes(w.id))w.tags=['synthetic-index'];
  c2.lessons[2]=deriveLessonIndices(c2,c2.lessons[2]);s.set('active',s.addRevision(c2,'Synthetic derived baseline'));s.set('draft',null);
  const changed=c2.words.find(w=>c2.lessons[0].wordIds.includes(w.id)&&!c2.lessons[2].wordIds.includes(w.id));
  changed.tags=['synthetic-index'];c2.lessons[2]=deriveLessonIndices(c2,c2.lessons[2]);stage(s,c2);
  assert(s.reviewLessonPublication(scope(s,[dependency('words',changed.id)])).blockers.some(b=>b.code==='OTHER_LESSON_INDEX_REQUIRED'));
});

test('new lesson, prerequisite and text eligibility block with concrete scope reasons',t=>{
  const {s}=setup(t),c=draft23(s),newId=c.lessons.at(-1).id;
  assert(s.reviewLessonPublication(scope(s,[],newId)).blockers.some(b=>b.code==='CURRICULUM_PUBLICATION_REQUIRED'));
  c.lessons[0].prerequisiteIds=[newId];stage(s,c);assert(s.reviewLessonPublication(scope(s)).blockers.some(b=>b.code==='OTHER_LESSON_REQUIRED'));
  delete c.lessons[0].prerequisiteIds;c.lessons[0].publicationStatus='unpublished-adapted-draft';stage(s,c);
  assert(s.reviewLessonPublication(scope(s)).blockers.some(b=>b.code==='TEXT_DRAFT_REVIEW_REQUIRED'));
});

test('required lexical representation changes block; unrelated pack data stays private',t=>{
  const {s}=setup(t),c=s.snapshot();c.lexical=lexicalFixture();validateContent(c);s.set('active',s.addRevision(c,'Synthetic lexical baseline'));
  const d=structuredClone(c);d.lexical.introductions=[];stage(s,d);
  assert(s.reviewLessonPublication(scope(s)).blockers.some(b=>b.code==='LEXICAL_PUBLICATION_REQUIRED'));
});

test('source approval for the full draft cannot authorize a selected candidate; guard reruns inside transaction',async t=>{
  const f=sourceFixture(t);await f.register();await f.stage(await f.resolve(await f.review()));await f.approve();
  const input=scope(f.store),review=f.store.reviewLessonPublication(input);assert.equal(review.canPublish,false);assert(review.blockers.some(b=>b.code==='SOURCE_PUBLICATION_REQUIRED'));
  const before=dump(f.store),count=writes(f.store);assert.throws(()=>f.store.publishLesson({...input,reviewToken:review.reviewToken}),e=>e.code==='LESSON_PUBLICATION_BLOCKED');assert.equal(dump(f.store),before);assert.equal(writes(f.store),count);
  const {s}=setup(t);draft23(s);const pins=scope(s),r=s.reviewLessonPublication(pins),transaction=s.transaction.bind(s);
  s.transaction=fn=>transaction(()=>{s.set('source-state',{draftBinding:{synthetic:true}});const guarded=dump(s);assert.throws(()=>fn(),e=>e.code==='LESSON_REVIEW_CHANGED');assert.equal(dump(s),guarded);throw Error('synthetic outer rollback');});
  const original=dump(s);assert.throws(()=>s.publishLesson({...pins,reviewToken:r.reviewToken}),/synthetic outer rollback/);assert.equal(dump(s),original);
});

test('strict missing media and pending real media never publish',t=>{
  const {s}=setup(t),c=s.snapshot();c.lessons[0].explanation+=' /media/synthetic-missing.pdf';stage(s,c);
  assert(s.reviewLessonPublication(scope(s)).blockers.some(b=>b.code==='MEDIA_MISSING'));
  const asset=s.media.importAsset(author,{operationId:'synthetic-import',assetId:'synthetic-real-media',title:'Synthetic test of human approval',kind:'document',mimeType:'application/pdf',dataBase64:Buffer.from('%PDF-1.4 synthetic').toString('base64'),provenance:{kind:'human-authored',label:'Synthetic fixture marked human to test approval'}});
  c.lessons[0].explanation='Synthetic '+asset.url;stage(s,c);assert(s.reviewLessonPublication(scope(s)).blockers.some(b=>b.code==='MEDIA_APPROVAL_REQUIRED'));
});

test('selector removals never delete shared objects and collection order cannot silently change',t=>{
  const {s}=setup(t),c=v2(s),l=c.lessons[0];
  const w={...c.words[0],id:'synthetic-tag-only',tags:['synthetic-only']};c.words.push(w);
  l.blocks.find(b=>b.type==='vocabulary').selector={mode:'tags',tags:['synthetic-only'],match:'any'};s.set('active',s.addRevision(c,'Synthetic removal baseline'));
  c.words.pop();stage(s,c);const before=dump(s),r=s.reviewLessonPublication(scope(s));assert(r.blockers.some(b=>b.code==='DEPENDENCY_REMOVAL_REQUIRED'));assert.equal(dump(s),before);
  const d=s.snapshot();d.lessons[0].blocks.find(b=>b.type==='vocabulary').selector={mode:'tags',tags:['synthetic-order'],match:'any'};
  d.words[0].tags=['synthetic-order'];d.words[1].tags=['synthetic-order'];d.words.reverse();stage(s,d);
  const reviewed=s.reviewLessonPublication(scope(s,[dependency('words',d.words.at(-1).id),dependency('words',d.words.at(-2).id)]));
  assert(reviewed.blockers.some(b=>b.code==='SELECTOR_SCOPE_REQUIRED'));
});

test('review scope binds dependency choices and external media bytes; later changes cannot commit',t=>{
  const {s,dir}=setup(t),c=s.snapshot();c.words[0].english+=' synthetic';stage(s,c);
  const input=scope(s),r=s.reviewLessonPublication(input),before=dump(s),count=writes(s);
  assert.throws(()=>s.publishLesson({...input,includeDependencies:[dependency('words',c.words[0].id)],reviewToken:r.reviewToken}),e=>e.code==='LESSON_REVIEW_CHANGED');assert.equal(dump(s),before);assert.equal(writes(s),count);
  const d=s.snapshot();d.lessons[0].explanation+=' /media/synthetic-review-pin.pdf';stage(s,d);
  writeFileSync(join(dir,'synthetic-review-pin.pdf'),'%PDF-1.4 synthetic reviewed bytes');const pins=scope(s),review=s.reviewLessonPublication(pins);assert.equal(review.canPublish,true);
  writeFileSync(join(dir,'synthetic-review-pin.pdf'),'%PDF-1.4 synthetic replaced bytes');const exact=dump(s),n=writes(s);
  assert.throws(()=>s.publishLesson({...pins,reviewToken:review.reviewToken}),e=>e.code==='LESSON_REVIEW_CHANGED');assert.equal(dump(s),exact);assert.equal(writes(s),n);
});

test('CAS, forged token, changed scope and unknown or duplicate fields reject with zero writes over HTTP',async t=>{
  const {s,dir}=setup(t);draft23(s);const {post}=await http(t,s,dir),input=scope(s);
  const r=await post('/api/studio/publish-lesson/review',input);assert.equal(r.status,200);
  const commit={...input,reviewToken:r.body.reviewToken},before=dump(s),count=writes(s);
  const bad=[{...commit,baseRevisionId:999},{...commit,expectedDraftToken:'dt1-stale'},{...commit,reviewToken:'lp1-'+'0'.repeat(64)},{...commit,lessonId:'lesson-2'},{...commit,approved:true},{...commit,includeDependencies:[dependency('words','unknown')]},{...commit,includeDependencies:[dependency('words','w-ani'),dependency('words','w-ani')]},{...commit,includeDependencies:[{...dependency('words','w-ani'),extra:true}]}];
  for(const body of bad){const result=await post('/api/studio/publish-lesson',body);assert([400,409].includes(result.status),JSON.stringify(result));assert.equal(dump(s),before);assert.equal(writes(s),count);}
  assert.equal((await post('/api/studio/publish-lesson/review',input,'learner-demo')).status,403);
  assert.equal((await post('/api/studio/publish-lesson',commit,'learner-demo')).status,403);
  const changed=s.currentDraft().content;changed.lessons[1].explanation+=' concurrent';stage(s,changed);
  const after=dump(s);assert.equal((await post('/api/studio/publish-lesson',commit)).status,409);assert.equal(dump(s),after);
});

for(const phase of ['media','revision','active','rebase'])test('injected failure after '+phase+' rolls back every table and sqlite_sequence on disk',t=>{
  const {s,dir,file}=setup(t),c=s.snapshot();c.lessons[0].explanation+=' /media/synthetic-late.pdf';stage(s,c);
  // Bytes appear after stage: publication now really has a new blob+alias to persist.
  writeFileSync(join(dir,'synthetic-late.pdf'),'%PDF-1.4 synthetic late media');
  const input=scope(s),review=s.reviewLessonPublication(input);assert.equal(review.canPublish,true);
  const target=phase==='media'?s.media:s,method={media:'persistPlan',revision:'addRevision',active:'set',rebase:'rebaseSavedDraft'}[phase],original=target[method];
  target[method]=function(...args){const result=original.apply(this,args);if(phase!=='active'||args[0]==='active')throw Error('synthetic injected '+phase);return result;};
  const before=dump(s);assert.throws(()=>s.publishLesson({...input,reviewToken:review.reviewToken}),/synthetic injected/);assert.equal(dump(s),before);target[method]=original;
  const reopened=new Store(file);try{assert.equal(dump(reopened),before);}finally{reopened.close();}
});

test('HTTP dropped-response retry cannot duplicate; compact recovery preserves rebased drafts, contexts, media and pins',async t=>{
  const {s,dir}=setup(t);const c=draft23(s);const asset=s.media.importAsset(author,{operationId:'synthetic-backup',assetId:'synthetic-draft-pdf',title:'Synthetic draft-only media',kind:'document',mimeType:'application/pdf',dataBase64:Buffer.from('%PDF-1.4 synthetic draft media').toString('base64'),provenance:{kind:'synthetic-demo',label:'Synthetic media'}});
  c.lessons.at(-1).blocks[0].text+=' '+asset.url;stage(s,c);note(s);
  const {post,origin}=await http(t,s,dir),input=scope(s),review=await post('/api/studio/publish-lesson/review',input),commit={...input,reviewToken:review.body.reviewToken};
  // Simulate a committed request whose body the client never receives/adopts.
  const response=await fetch(origin+'/api/studio/publish-lesson',{method:'POST',headers,body:JSON.stringify(commit)});assert.equal(response.status,200);await response.body.cancel();
  const after=dump(s);assert.equal((await post('/api/studio/publish-lesson',commit)).status,409);assert.equal(dump(s),after);note(s);
  const refreshed=await (await fetch(origin+'/api/studio',{headers})).json();assert.deepEqual(refreshed.draft.content,c);assert.equal(refreshed.draft.baseRevisionId,refreshed.revisionId);
  const learner=JSON.stringify(await (await fetch(origin+'/api/bootstrap')).json());assert(!learner.includes('Synthetic private note'));assert(!learner.includes('author-review'));
  const exportResponse=await fetch(origin+'/api/export',{headers}),bytes=await exportResponse.text(),backup=JSON.parse(bytes);assert.equal(exportResponse.status,200);assert.equal(bytes.includes('\n  '),false);
  const {s:dest,dir:destDir}=setup(t),{post:restore,origin:destOrigin}=await http(t,dest,destDir);
  const restored=await restore('/api/restore',backup);assert.equal(restored.status,200,JSON.stringify(restored.body));
  const revisionRows=JSON.stringify(dest.db.prepare('SELECT * FROM revisions ORDER BY id').all()),contexts=dest.authorReview.state(),draft=dest.currentDraft();
  for(let i=0;i<3;i++){
    assert.equal((await restore('/api/restore',backup)).status,200);
    const roundtrip=await (await fetch(destOrigin+'/api/export',{headers})).json();assert.equal((await restore('/api/restore',roundtrip)).status,200);
    assert.equal(JSON.stringify(dest.db.prepare('SELECT * FROM revisions ORDER BY id').all()),revisionRows);assert.deepEqual(dest.authorReview.state(),contexts);assert.deepEqual(dest.currentDraft(),draft);assert.deepEqual(dest.authorReview.contexts(),[c,c]);
  }
  assert.deepEqual(Buffer.from(await (await fetch(destOrigin+asset.url)).arrayBuffer()),Buffer.from('%PDF-1.4 synthetic draft media'));
  for(const mutate of [b=>b.authorReview.drafts[Object.keys(b.authorReview.drafts)[0]].baseHash='0'.repeat(64),b=>b.mediaRecovery.blobs=[],b=>b.draft.baseRevisionId=9999]){
    const bad=structuredClone(backup);mutate(bad);const before=dump(dest),count=writes(dest),result=await restore('/api/restore',bad);assert(result.status>=400);assert.equal(dump(dest),before);assert.equal(writes(dest),count);
  }
});
