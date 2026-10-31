import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Store,draftTokenFor} from '../src/store.js';
import {reconstructContext} from '../src/immutable-context.js';
import {authorProjection} from '../src/author-review.js';
import {createServer} from '../src/server.js';
import {replaceFirstTwo} from '../scripts/install-first2.mjs';
import {JSDOM} from 'jsdom';
import {mountInlineAuthor,patchAuthorField} from '../public/author/inline-author.js';
import {createStudioWorkspace} from '../public/studio/workspace.js';
import {mountUnifiedStudio} from '../public/studio/unified-studio.js';

const author='author-demo',body='SYNTHETIC PRIVATE REVIEW — never a Guy comment';
const pack=JSON.parse(readFileSync(new URL('../content/first2/lessons.json',import.meta.url)));
const dump=s=>JSON.stringify(s.db.prepare("SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name").all().map(({name})=>[name,s.db.prepare('SELECT * FROM "'+name+'" ORDER BY rowid').all()]));
const tick=()=>new Promise(r=>setTimeout(r,10));
async function until(fn){for(let i=0;i<200;i++){if(fn())return;await tick();}throw new Error('Author workflow did not settle.');}
function fixture(s){
 const clean=structuredClone(pack);for(const l of clean.lessons)for(const p of l.blocks[0].textPages.pages){if(p.activity)delete p.activity.image;for(const i of p.activity?.items||[])delete i.image;}
 const c=replaceFirstTwo(s.snapshot(),clean).content;
 const page=c.lessons[0].blocks[0].textPages.pages[0];page.html='<p><strong>Fixture 😀 שָׁלוֹם</strong> exact &amp; retained.</p>';page.privateMetadata={unknown:['retain',3]};
 s.set('active',s.addRevision(c,'Synthetic disposable author review test'));return c;
}
function input(s,overrides={}){const l=s.snapshot().lessons.find(l=>l.id==='MEMORY-A2'),b=l.blocks[0],p=b.textPages.pages[0];return {requestId:randomUUID(),lessonId:l.id,baseRevisionId:s.get('active'),draftToken:null,componentId:b.id,pageId:p.id,activityId:null,fieldPath:'html',selection:null,body,...overrides};}
function setup(t){const s=new Store();fixture(s);t.after(()=>s.close());return s;}
async function http(t,s){const server=createServer(s);await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));const origin='http://127.0.0.1:'+server.address().port;
 const api=async(path,body,user=author)=>{const r=await fetch(origin+'/api/'+path,{method:body===undefined?'GET':'POST',headers:{'x-demo-user':user,...(body===undefined?{}:{'content-type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});const result=await r.json();if(!r.ok)throw Object.assign(new Error(result.error),{status:r.status,...result});return result;};return {api,origin};}

test('author HTTP create/list/status is persistent, idempotent, versioned and completely absent from learner APIs',async t=>{
 const s=setup(t),{api}=await http(t,s),req=input(s),before=s.snapshot(),learners=s.backup().learners;
 for(const user of ['learner-demo','learner-core']){
  const db=dump(s);for(const [path,b]of [['studio/author-comments?lessonId=MEMORY-A2',undefined],['studio/author-comments',req],['studio/author-comments/projection?lessonId=MEMORY-A2',undefined]])await assert.rejects(api(path,b,user),e=>e.status===403);assert.equal(dump(s),db);
 }
 const note=await api('studio/author-comments',req);assert.equal(note.createdBy,author);assert.equal(note.body,body);assert.equal(note.anchor.contentHash.length,64);
 assert.deepEqual(await api('studio/author-comments',req),note);
 let db=dump(s);await assert.rejects(api('studio/author-comments',{...req,body:'different'}),e=>e.status===409);assert.equal(dump(s),db);
 const resolved={requestId:randomUUID(),expectedVersion:1,status:'resolved'},closed=await api('studio/author-comments/'+note.id+'/status',resolved);assert.equal(closed.version,2);assert.equal(closed.audit.length,2);
 assert.deepEqual(await api('studio/author-comments/'+note.id+'/status',resolved),closed);
 db=dump(s);await assert.rejects(api('studio/author-comments/'+note.id+'/status',{...resolved,requestId:randomUUID()}),e=>e.status===409);assert.equal(dump(s),db);
 const reopened=await api('studio/author-comments/'+note.id+'/status',{requestId:randomUUID(),expectedVersion:2,status:'open'});assert.equal(reopened.audit.length,3);
 const listed=await api('studio/author-comments?lessonId=MEMORY-A2&status=open');assert.equal(listed.comments[0].id,note.id);assert.equal(listed.comments[0].anchorState,'current');
 for(const user of ['learner-demo','learner-core']){
  for(const path of ['bootstrap','questions','session?lessonId=MEMORY-A2','source-vocabulary','lexical'])assert.equal(JSON.stringify(await api(path,undefined,user)).includes(body),false,path);
  await assert.rejects(api('export',undefined,user),e=>e.status===403);
  await assert.rejects(api('studio/author-comments/'+note.id+'/status',{requestId:randomUUID(),expectedVersion:3,status:'resolved'},user),e=>e.status===403);
 }
 assert.deepEqual(s.snapshot(),before);assert.deepEqual(s.backup().learners,learners);assert.equal(JSON.stringify(await api('content')).includes(body),false);
});

test('server canonical rich projection checks exact UTF-16/Nikkud and rejects forged paths, actors, offsets or draft tokens without writes',t=>{
 const s=setup(t),req=input(s),source=authorProjection(s.snapshot().lessons[0].blocks[0].textPages.pages[0].html),exact='😀 שָׁלוֹם',start=source.indexOf(exact),selection={start,end:start+exact.length,exact,prefix:source.slice(0,start),suffix:source.slice(start+exact.length)};
 assert.match(source,/Fixture 😀 שָׁלוֹם exact & retained\./);
 const note=s.authorReview.create(author,{...req,selection});assert.deepEqual(note.anchor.selection,selection);
 for(const patch of [{createdBy:'learner-demo'},{visibility:'public'},{fieldPath:'__proto__.html'},{pageId:'missing'},{activityId:'wrong'}, {draftToken:'dt1-stale'}, {selection:{...selection,exact:exact.normalize('NFD')}},{selection:{...selection,start:start+1}},{selection:{...selection,prefix:'forged'}}]){
  if(patch.selection?.exact===exact&&Object.keys(patch.selection).length===5&&patch.selection.start===start&&patch.selection.prefix===selection.prefix)continue;
  const before=dump(s);assert.throws(()=>s.authorReview.create(author,{...req,...patch,requestId:randomUUID()}));assert.equal(dump(s),before);
 }
 const stale=s.stage({baseRevisionId:s.get('active'),expectedDraftToken:null,content:s.snapshot()});const c=s.currentDraft().content;c.lessons[0].title+=' fixture edit';s.stage({baseRevisionId:s.get('active'),expectedDraftToken:stale.draftToken,content:c});
 assert.throws(()=>s.authorReview.create(author,{...req,draftToken:stale.draftToken,requestId:randomUUID()}),e=>e.status===409);
});

test('exact draft anchors survive save/publish/rollback, author backup relinks all revisions/drafts and retains audit, learners and metadata',t=>{
 const s=setup(t),c=s.snapshot(),first=s.get('active'),target=input(s);c.lessons[0].blocks[0].textPages.pages[0].html+='<p>Draft only text.</p>';
 const saved=s.stage({baseRevisionId:first,expectedDraftToken:null,content:c}),req={...target,draftToken:saved.draftToken},note=s.authorReview.create(author,req);
 const pub=s.publish(first,saved.draftToken);assert.equal(s.authorReview.list(author,{lessonId:req.lessonId}).comments[0].anchorState,'current');
 const second=s.snapshot();second.lessons[0].blocks[0].textPages.pages[0].html='<p>Entirely changed fixture.</p>';const staged=s.stage({baseRevisionId:pub.revisionId,expectedDraftToken:null,content:second});
 assert.equal(s.authorReview.list(author,{lessonId:req.lessonId}).comments[0].anchorState,'changed');
 const backup=s.backup(),d=new Store();t.after(()=>d.close());d.set('active',d.addRevision(d.snapshot(),'Offset destination revision IDs'));
 const restored=d.restore(backup),carried=d.authorReview.state().comments[0];
 assert.equal(carried.id,note.id);assert.deepEqual(carried.audit,note.audit);assert.equal(carried.anchor.revisionId,restored.revisions[first]);assert.notEqual(carried.anchor.draftToken,note.anchor.draftToken);
 assert.equal(carried.anchor.draftToken,draftTokenFor(carried.anchor.revisionId,reconstructContext(d.authorReview.state().drafts[carried.anchor.draftToken],d.snapshot(carried.anchor.revisionId))));
 assert.deepEqual(d.currentDraft().content,second);assert.deepEqual(d.backup().learners,backup.learners);
 d.rollback(restored.revisions[first],d.get('active'),d.currentDraft().draftToken);assert.equal(d.authorReview.list(author,{lessonId:req.lessonId}).comments[0].anchorState,'changed');assert.equal(d.authorReview.state().comments[0].id,note.id);
 const roundtrip=new Store();t.after(()=>roundtrip.close());roundtrip.restore(d.backup());assert.equal(roundtrip.authorReview.state().comments[0].body,body);
 assert.equal(staged.draftToken,s.currentDraft().draftToken);
});

test('unique exact quote can relocate, repeated or absent quotes change, missing and retired identities never attach by position',t=>{
 const s=setup(t),req=input(s),text=authorProjection(s.snapshot().lessons[0].blocks[0].textPages.pages[0].html),exact='שָׁלוֹם',start=text.indexOf(exact),note=s.authorReview.create(author,{...req,selection:{start,end:start+exact.length,exact,prefix:'',suffix:''}});
 const mutate=fn=>{const c=s.snapshot();fn(c.lessons[0].blocks[0]);s.set('active',s.addRevision(c,'Synthetic anchor state fixture'));return s.authorReview.list(author,{lessonId:req.lessonId}).comments[0];};
 let result=mutate(b=>b.textPages.pages[0].html='<p>new prefix '+exact+'</p>');assert.equal(result.anchorState,'current');assert.equal(result.relocated,true);
 result=mutate(b=>b.textPages.pages[0].html='<p>'+exact+' '+exact+'</p>');assert.equal(result.anchorState,'changed');
 result=mutate(b=>b.textPages.order=b.textPages.order.slice(1));assert.equal(result.anchorState,'historical');
 result=mutate(b=>b.textPages.pages.shift());assert.equal(result.anchorState,'missing');assert.equal(result.id,note.id);
});

test('malformed private namespace, anchors, hashes, audit or retained draft backup rejects atomically including sqlite_sequence',t=>{
 const s=setup(t),saved=s.stage({baseRevisionId:s.get('active'),expectedDraftToken:null,content:s.snapshot()});s.authorReview.create(author,input(s,{draftToken:saved.draftToken}));const backup=s.backup();
 const cases=[b=>delete b.authorReview,b=>b.authorReview.schemaVersion=3,b=>b.authorReview.comments.push(structuredClone(b.authorReview.comments[0])),b=>b.authorReview.comments[0].createdBy='learner-demo',b=>b.authorReview.comments[0].anchor.contentHash='0'.repeat(64),b=>b.authorReview.comments[0].anchor.pageId='missing',b=>b.authorReview.comments[0].audit[0].by='learner-demo',b=>b.authorReview.comments[0].version=2,b=>b.authorReview.comments[0].body='modified',b=>b.authorReview.drafts={},b=>b.authorReview.comments[0].request.fieldPath='not-allowed'];
 for(const mutate of cases){const candidate=structuredClone(backup);mutate(candidate);const before=dump(s);assert.throws(()=>s.restore(candidate));assert.equal(dump(s),before);}
 const before=dump(s),restoreMedia=s.media.restore;s.media.restore=()=>{throw new Error('Synthetic transaction failure');};assert.throws(()=>s.restore(backup),/Synthetic transaction failure/);assert.equal(dump(s),before);s.media.restore=restoreMedia;
});

test('actual on-disk reload retains author-readable private note',t=>{
 const dir=mkdtempSync(join(tmpdir(),'hebleo-author-review-')),path=join(dir,'test.db');t.after(()=>rmSync(dir,{recursive:true,force:true}));let s=new Store(path);fixture(s);const note=s.authorReview.create(author,input(s));s.close();s=new Store(path);try{assert.equal(s.authorReview.list(author,{lessonId:'MEMORY-A2'}).comments[0].id,note.id);assert.equal(JSON.stringify(s.bootstrap('learner-demo')).includes(body),false);}finally{s.close();}
});

test('shared coordinator includes Studio sibling edits in inline draft; errors retain rich source, JSON and comment body; saved preview and deliberate release are separate',async t=>{
 const s=setup(t),{api}=await http(t,s),c=s.snapshot(),revision=s.get('active'),learners=s.backup().learners;
 const workspace=createStudioWorkspace({content:c,baseRevisionId:revision,saveDraft:input=>api('studio/draft',input),getWorkspaceImpact:input=>api('studio/impact',input)});
 const d=new JSDOM('<main><section id="studio"></section><section id="inline"></section></main>',{url:'http://127.0.0.1',pretendToBeVisual:true}),doc=d.window.document;d.window.HTMLElement.prototype.scrollIntoView=()=>{};t.after(()=>d.window.close());
 const unified=mountUnifiedStudio(doc.querySelector('#studio'),{content:c,coordinator:workspace,lessonId:'MEMORY-A2',baseRevisionId:revision,saveDraft:input=>api('studio/draft',input),markdownDependencies:Promise.reject(new Error('Fixture uses the supported source textarea fallback'))});
 const edit=(el,value)=>{el.value=value;el.dispatchEvent(new d.window.Event('input',{bubbles:true}));};
 edit(doc.querySelector('[data-canonical-word] [name=notes]'),'Synthetic sibling vocabulary edit');workspace.getContent();unified.dispose();
 const state={editing:true},target=input(s),calls=[];
 const mount=()=>mountInlineAuthor(doc.querySelector('#inline'),{workspace,lessonId:'MEMORY-A2',componentId:target.componentId,pageId:target.pageId,state,api,renderLesson:v=>v,markdownDependencies:Promise.reject(new Error('Fixture fallback')),onPreview:id=>{calls.push(id);return api('studio/preview/session',{lessonId:id,draftToken:workspace.expectedDraftToken});},onApply:()=>calls.push('Apply review')});
 let ui=mount();await until(()=>doc.querySelector('[name=author-source]'));const html=c.lessons[0].blocks[0].textPages.pages[0].html+'<p><em>Fixture revision</em></p>';
 edit(doc.querySelector('[name=author-source]'),html);edit(doc.querySelector('[data-author-field="options.extraInformation"]'),'<strong>Authored fixture extra</strong>');
 assert.equal(doc.querySelector('[data-author-action=preview]').disabled,true);assert.equal(s.get('active'),revision);
 await ui.save();assert.equal(s.currentDraft().content.words[0].notes,'Synthetic sibling vocabulary edit');assert.equal(s.currentDraft().content.lessons[0].blocks[0].textPages.pages[0].html,html);assert.deepEqual(s.currentDraft().content.lessons[0].blocks[0].textPages.pages[0].privateMetadata,{unknown:['retain',3]});
 doc.querySelector('[data-author-action=preview]').click();await until(()=>calls.length===1);assert.equal(s.get('active'),revision);
 doc.querySelector('[data-author-action=comment]').click();await until(()=>state.commentTarget);edit(doc.querySelector('[data-author-body]'),body);doc.querySelector('[data-author-composer]').dispatchEvent(new d.window.Event('submit',{bubbles:true,cancelable:true}));await until(()=>s.authorReview.state().comments.length===1);
 ui.dispose();ui=mount();await until(()=>doc.querySelector('[data-author-note]'));assert.match(doc.querySelector('[data-author-comments]').textContent,/SYNTHETIC PRIVATE/);
 doc.querySelector('[data-author-action=apply]').click();await until(()=>calls.includes('Apply review'));assert.equal(s.get('active'),revision);
 const published=await api('studio/publish',{baseRevisionId:revision,draftToken:workspace.expectedDraftToken});assert.notEqual(published.revisionId,revision);assert.equal(s.snapshot().lessons[0].blocks[0].textPages.pages[0].html,html);assert.deepEqual(s.backup().learners,learners);ui.dispose();
});

test('coordinator CAS/network/403/validation failures retain full local values and never auto-retry using another token',async t=>{
 const s=setup(t),c=s.snapshot();for(const status of [409,503,403,400]){let attempts=0;const workspace=createStudioWorkspace({content:c,baseRevisionId:s.get('active'),saveDraft:async()=>{attempts++;throw Object.assign(new Error('Fixture failure'),{status});}});const next=structuredClone(c);next.lessons[0].title='Retain '+status;workspace.replace(next);await assert.rejects(workspace.save());assert.equal(workspace.dirty,true);assert.equal(workspace.getContent().lessons[0].title,'Retain '+status);assert.equal(workspace.expectedDraftToken,null);assert.equal(attempts,1);if(status===403)assert.equal(workspace.revoked,true);}
 const req=input(s),activity=c.lessons[0].blocks[0].textPages.pages.find(p=>p.activity)?.activity;
 if(activity)assert.throws(()=>patchAuthorField(c,{...req,pageId:c.lessons[0].blocks[0].textPages.pages.find(p=>p.activity).id},'activity',JSON.stringify({...activity,id:'forged'})),/ID/);
 const synchronous=createStudioWorkspace({content:c,baseRevisionId:s.get('active'),saveDraft:()=>{throw new Error('Synchronous validation fixture');}});synchronous.touch();await assert.rejects(synchronous.save(),/Synchronous validation/);assert.equal(synchronous.pending,null);assert.equal(synchronous.dirty,true);
});

test('activity anchors pin existing IDs and all settings; malformed settings retain the local JSON and current source',t=>{
 const s=setup(t),req=input(s),c=s.snapshot(),p=c.lessons[1].blocks[0].textPages.pages.find(p=>p.activity?.kind==='letter-choice'),b=c.lessons[1].blocks[0];
 const target={...req,lessonId:c.lessons[1].id,componentId:b.id,pageId:p.id,activityId:p.activity.id,fieldPath:'activity'};
 const note=s.authorReview.create(author,target);assert.match(note.anchor.sourceText,/feedback/);assert.match(note.anchor.sourceText,/options/);
 const changed=patchAuthorField(c,target,'pageSettings',JSON.stringify({prompt:p.prompt+' (synthetic test edit)'}));assert.deepEqual(changed.lessons[1].blocks[0].textPages.pages.find(x=>x.id===p.id).activity,p.activity);
 const staged=s.stage({baseRevisionId:s.get('active'),expectedDraftToken:null,content:changed});assert.equal(s.authorReview.list(author,{lessonId:target.lessonId}).comments[0].anchorState,'changed');
 assert.throws(()=>patchAuthorField(c,target,'pageSettings','{"id":"forged"}'),/page IDs/);assert.throws(()=>patchAuthorField(c,target,'pageSettings','{"prompt":'),SyntaxError);assert.equal(s.currentDraft().draftToken,staged.draftToken);
});

test('restore retains newer notes/status history and immutable create receipts, and schema-8 migration changes no authored or learner state',t=>{
 const s=setup(t),old=s.backup(),req=input(s),note=s.authorReview.create(author,req);
 const status={requestId:randomUUID(),expectedVersion:1,status:'resolved'};s.authorReview.status(author,note.id,status);
 s.restore(old);assert.equal(s.authorReview.state().comments[0].status,'resolved');assert.equal(s.authorReview.state().comments[0].audit.length,2);
 assert.equal(s.authorReview.create(author,req).id,note.id);
 const d=new Store();t.after(()=>d.close());d.set('active',d.addRevision(d.snapshot(),'Synthetic offset'));d.restore(s.backup());assert.equal(d.authorReview.create(author,req).id,note.id);
 const dir=mkdtempSync(join(tmpdir(),'hebleo-reader9-')),file=join(dir,'migration.db');t.after(()=>rmSync(dir,{recursive:true,force:true}));let m=new Store(file);fixture(m);m.stage({baseRevisionId:m.get('active'),expectedDraftToken:null,content:m.snapshot()});m.updateLearner('learner-core',{note:{wordId:m.snapshot().words[0].id,text:'Synthetic saved learner note'}});const before=m.backup();m.set('schema-version',8);m.close();m=new Store(file);try{assert.equal(m.get('schema-version'),10);assert.deepEqual(m.snapshot(),before.content);assert.deepEqual(m.currentDraft().content,before.draft.content);assert.deepEqual(m.backup().learners,before.learners);}finally{m.close();}
});

test('keyboard quote selection creates a server-validated Hebrew/emoji anchor; interrupted comment response cannot clear a newer composer',async t=>{
 const s=setup(t),{api}=await http(t,s),c=s.snapshot(),workspace=createStudioWorkspace({content:c,baseRevisionId:s.get('active'),saveDraft:i=>api('studio/draft',i)}),target=input(s),state={editing:true};
 const d=new JSDOM('<main></main>',{url:'http://127.0.0.1',pretendToBeVisual:true}),host=d.window.document.querySelector('main');t.after(()=>d.window.close());let release;
 const transport=async(path,input)=>{if(path==='studio/author-comments'&&input){const receipt=await api(path,input);return new Promise(resolve=>release=()=>resolve(receipt));}return api(path,input);};
 const mount=()=>mountInlineAuthor(host,{workspace,lessonId:target.lessonId,componentId:target.componentId,pageId:target.pageId,state,api:transport,renderLesson:v=>v,markdownDependencies:Promise.resolve({}),onPreview:()=>{},onApply:()=>{}});
 let ui=mount();const field=host.querySelector('[data-author-quote]'),exact='😀 שָׁלוֹם',start=field.value.indexOf(exact);field.setSelectionRange(start,start+exact.length);field.dispatchEvent(new d.window.Event('select',{bubbles:true}));host.querySelector('[data-author-action=comment]').click();await until(()=>state.commentTarget);
 assert.equal(state.pendingSelection.exact,exact);state.commentBody='Synthetic first note';host.querySelector('[data-author-body]').value=state.commentBody;host.querySelector('[data-author-composer]').dispatchEvent(new d.window.Event('submit',{bubbles:true,cancelable:true}));await until(()=>release);
 ui.dispose();ui=mount();const next=host.querySelector('[data-author-body]');next.value='Synthetic newer unsent note';next.dispatchEvent(new d.window.Event('input',{bubbles:true}));release();await tick();assert.equal(next.value,'Synthetic newer unsent note');assert.equal(state.commentBody,'Synthetic newer unsent note');assert.equal(s.authorReview.state().comments[0].anchor.selection.exact,exact);ui.dispose();
});
