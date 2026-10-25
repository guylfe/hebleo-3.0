import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Store,validateContent,STORE_SCHEMA_VERSION} from '../src/store.js';
import {createServer} from '../src/server.js';
import {prepareTextDraftImport} from '../src/text-import.js';
import {validateTextPages} from '../public/text-contract.js';
import {resolveContentID,validateContentIdentities} from '../public/content-identity.js';
import {projectLesson} from '../public/course.js';
import {validateSchema,semanticErrors,publicationEligibility} from '../schemas/tools/contracts.mjs';
const pack=JSON.parse(readFileSync(new URL('../docs/curriculum/first20-20261025/content.json',import.meta.url)));
const copy=structuredClone,user='learner-demo';
function setup(t,file){const s=new Store(file);t.after(()=>s.close());return s;}
const input=(s,p=pack)=>({baseRevisionId:s.get('active'),expectedDraftToken:s.currentDraft()?.draftToken??null,pack:p});
const dump=s=>JSON.stringify(['kv','revisions','learners','events'].map(table=>s.db.prepare('SELECT * FROM '+table+' ORDER BY 1').all()));
function syntheticPages(s){const content=s.snapshot(),l=projectLesson(content,content.lessons[0]);l.blocks.find(b=>b.type==='explanation').textPages={version:1,pages:[{id:'syn-memory',type:'timedRecall',title:'Synthetic timer integration fixture',value:'0704177609112001',durationMs:10000,accessibleAlternative:true},{id:'syn-choice',type:'choice',title:'Synthetic choice',prompt:'Fixture choice',options:['First','Second'],answer:0,gate:'commit'}],order:['syn-memory','syn-choice']};content.lessons[0]=l;const draft=s.stage({baseRevisionId:s.get('active'),expectedDraftToken:null,content});s.publish(draft.baseRevisionId,draft.draftToken);return l;}

test('all 20 adapted drafts, 154 stable pages and 127 targets import additively and remain unpublished',t=>{
 const s=setup(t),activeBefore=s.snapshot(),published=s.snapshot(),learner=s.learner(user);published.lessons[0].title='An existing saved draft';s.stage({baseRevisionId:s.get('active'),expectedDraftToken:null,content:published});const history=s.active().history;
 const result=s.importTextDraft(input(s));assert.deepEqual([result.importReceipt.lessonCount,result.importReceipt.pageCount,result.importReceipt.targetCount],[20,154,127]);assert.equal(result.importReceipt.unresolvedTargetCount,127);
 const draft=s.currentDraft();assert.equal(draft.content.lessons.length,published.lessons.length+20);assert.deepEqual(draft.content.words,published.words);assert.deepEqual(draft.content.exercises,published.exercises);assert.deepEqual(draft.content.lessons.slice(0,3),published.lessons);assert.deepEqual(s.learner(user),learner);assert.deepEqual(s.active().history,history);assert.deepEqual(s.snapshot(),activeBefore);
 assert.equal(draft.content.lessons.find(l=>l.contentId==='MEMORY').blocks[0].textPages.pages.find(p=>p.type==='timedRecall').value,'0704177609112001');
 assert.equal(resolveContentID(draft.content,'lessons','MNT'),'draft-first20-MNT');assert.equal(resolveContentID(draft.content,'lessons','A002',{namespace:'planning-spiral-a'}),'draft-first20-MNT');assert.equal(draft.content.lessons.find(l=>l.contentId==='WRITING-BASICS').prerequisiteIds[0],'draft-first20-MNT');
 const before=dump(s);assert.throws(()=>s.publish(s.get('active'),draft.draftToken),e=>e.code==='TEXT_DRAFT_REVIEW_REQUIRED');assert.equal(dump(s),before);
 assert.deepEqual(validateSchema('content-pack',draft.content),[]);assert.deepEqual(semanticErrors(draft.content),[]);assert.equal(publicationEligibility(draft.content,{mode:'private-demo'}).eligible,false);
});
test('two lesson/page reorders survive save, reopen, export/import twice with IDs, targets and references intact',t=>{
 const dir=mkdtempSync(join(tmpdir(),'hebleo-text-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));const filename=join(dir,'db.sqlite');let s=new Store(filename);
 try{s.importTextDraft(input(s));const content=s.currentDraft().content;const mnt=content.lessons.find(l=>l.contentId==='MNT');const ids=mnt.blocks[0].textPages.order;[ids[0],ids[1]]=[ids[1],ids[0]];const order=content.curriculum.order;[order.at(-1).lessonId,order.at(-2).lessonId]=[order.at(-2).lessonId,order.at(-1).lessonId];s.stage({baseRevisionId:s.get('active'),expectedDraftToken:s.currentDraft().draftToken,content});}finally{s.close();}
 s=new Store(filename);try{const expected=s.currentDraft().content;for(let i=0;i<2;i++){const token=s.currentDraft().draftToken;s.importTextDraft(input(s));assert.equal(s.currentDraft().draftToken,token);assert.deepEqual(s.currentDraft().content,expected);const backup=s.backup(),dest=new Store();try{dest.restore(backup);assert.deepEqual(dest.currentDraft().content,expected);assert.deepEqual(dest.snapshot(),s.snapshot());}finally{dest.close();}}const permuted=copy(pack);permuted.lessons.reverse();for(const l of permuted.lessons){l.order=200-l.order;l.pages.reverse();}assert.equal(s.reviewTextImport(input(s,permuted)).status,'ready-unpublished');}finally{s.close();}
});
test('alias collisions, unknown and ambiguous mappings fail without writing or equating planning IDs to fixtures',t=>{
 const s=setup(t),c=s.snapshot();c.lessons[0].contentId='MNT';s.stage({baseRevisionId:s.get('active'),expectedDraftToken:null,content:c});let before=dump(s);assert.throws(()=>s.importTextDraft(input(s)),e=>e.code==='TEXT_IMPORT_CONFLICT');assert.equal(dump(s),before);
 const bad=copy(c);bad.lessons[1].contentId='MNT';assert.throws(()=>validateContentIdentities(bad),/collision|collides/);
 const unknown=prepareTextDraftImport(s.snapshot(),pack,{wordMappings:{'AHY.word.1':'unknown-word'}});assert.equal(unknown.status,'review-required');assert.equal(unknown.content,undefined);assert.throws(()=>resolveContentID(c,'lessons','A002'),/Unknown/);
 c.lessons[0].contentAliases=[{value:'SHARED',namespace:'route-a'}];c.lessons[1].contentAliases=[{value:'SHARED',namespace:'route-b'}];validateContentIdentities(c);assert.throws(()=>resolveContentID(c,'lessons','SHARED'),/Ambiguous/);assert.equal(resolveContentID(c,'lessons','SHARED',{namespace:'route-b'}),c.lessons[1].id);
});
test('conflicting existing draft and explicit fixture mapping require review without partial writes',t=>{
 const s=setup(t);s.importTextDraft(input(s));const altered=copy(pack);altered.lessons[0].pages[0].html='Changed teaching';const before=dump(s);assert.throws(()=>s.importTextDraft(input(s,altered)),e=>e.code==='TEXT_IMPORT_CONFLICT');assert.equal(dump(s),before);
 const result=prepareTextDraftImport(s.snapshot(),pack,{lessonMappings:{MNT:'lesson-1'}});assert.equal(result.status,'review-required');assert.equal(result.content,undefined);
});
test('canonical mapping is explicit and draft targets retain source metadata; no lexemes are synthesized',t=>{
 const s=setup(t);const result=s.reviewTextImport({...input(s),wordMappings:{'PRONOUNS.word.1':s.snapshot().words[0].id}});assert.equal(result.status,'ready-unpublished');assert.equal(result.content.words.length,s.snapshot().words.length);assert.equal(result.receipt.unresolvedTargetCount,126);assert.equal(result.content.lessons.find(l=>l.contentId==='PRONOUNS').draftTargets[0].wordId,s.snapshot().words[0].id);
});
test('malformed bounds, missing/duplicate pages, bad references and unsafe imported HTML are handled',t=>{
 const s=setup(t),bad=copy(pack);bad.lessons[0].pages[0].id=bad.lessons[0].pages[1].id;const before=dump(s);assert.throws(()=>s.importTextDraft(input(s,bad)),/Duplicate/);assert.equal(dump(s),before);
 const html=copy(pack);html.lessons[0].pages[0].html='<script>alert(1)</script><p onclick="bad()">Hello <a href="javascript:bad()">link</a></p><img src="https://example.org/a.png" onerror="bad()">';const p=s.reviewTextImport(input(s,html)).content.lessons.find(l=>l.contentId==='MEMORY').blocks[0].textPages.pages[0];assert.doesNotMatch(p.html,/script|onclick|onerror|javascript:/);assert.match(p.html,/Hello/);
 const x={version:1,pages:[{id:'x',type:'timedRecall',title:'x',value:704,durationMs:10000,accessibleAlternative:true}],order:['x']};assert.throws(()=>validateTextPages(x),/timed value/);x.pages[0].value='0704';x.order=[];assert.throws(()=>validateTextPages(x),/exactly once/);x.order=['x'];x.pages[0].durationMs=120001;assert.throws(()=>validateTextPages(x),/timing/);
});
test('response saving never completes a lesson and survives two recovery cycles and order-only publication',t=>{
 const s=setup(t),lesson=syntheticPages(s),componentId=lesson.blocks[0].id,rev=s.get('active'),record={lessonId:lesson.id,componentId,revisionId:rev,pageId:'syn-choice',cursorPageId:'syn-choice',response:{choice:0,checked:true}};const before=s.learner(user);s.saveTextProgress(user,record);assert.deepEqual(s.learner(user).completed,before.completed);assert.deepEqual(s.learner(user).attempts,before.attempts);assert.deepEqual(s.learner(user).resumes,before.resumes);
 const c=s.snapshot();c.lessons[0].blocks[0].textPages.order.reverse();const d=s.stage({baseRevisionId:rev,expectedDraftToken:null,content:c});s.publish(d.baseRevisionId,d.draftToken);assert.deepEqual(s.textProgress(user,{...record,revisionId:s.get('active')}).responses['syn-choice'],record.response);s.saveTextProgress(user,{...record,revisionId:s.get('active')});
 let backup=s.backup();for(let i=0;i<2;i++){const dest=new Store();try{const r=dest.restore(backup);const restored=dest.textProgress(user,{...record,revisionId:r.revisionId});assert.deepEqual(restored.responses['syn-choice'],record.response);assert.equal(restored.cursorPageId,'syn-choice');assert.equal(dest.learner(user).textPages.length,2);backup=dest.backup();}finally{dest.close();}}
});
test('forged reveal, missing pages, timer fields, wrong profile/revision and corrupt backup are atomic refusals',t=>{
 const s=setup(t),lesson=syntheticPages(s),base={lessonId:lesson.id,componentId:lesson.blocks[0].id,revisionId:s.get('active'),pageId:'syn-memory',cursorPageId:'syn-memory'};
 for(const patch of [{response:{revealed:true,text:''}},{response:{running:true}},{pageId:'missing',response:{}},{revisionId:1,response:{}},{response:{choice:1}}]){const before=dump(s);assert.throws(()=>s.saveTextProgress(user,{...base,...patch}));assert.equal(dump(s),before);}
 s.saveTextProgress(user,{...base,response:{text:'0704',revealed:true}});const backup=s.backup();assert.equal(backup.storeSchemaVersion,STORE_SCHEMA_VERSION);backup.learners.find(l=>l.id===user).state.textPages[0].responses['not-a-page']={};const before=dump(s);assert.throws(()=>s.restore(backup));assert.equal(dump(s),before);
});
test('legacy text/video, actual HTTP projection/progress and author-only draft import endpoints integrate',async t=>{
 const s=setup(t),l=syntheticPages(s),server=createServer(s);await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));const base='http://127.0.0.1:'+server.address().port;
 const request=async(path,body,who=user)=>{const r=await fetch(base+'/api/'+path,{method:body?'POST':'GET',headers:{'x-demo-user':who,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,value:await r.json()};};
 const session=await request('session?lessonId='+l.id);assert.equal(session.status,200);assert.equal(session.value.content.lessons.find(x=>x.id===l.id).blocks[0].textPages.pages.length,2);
 const record={lessonId:l.id,componentId:l.blocks[0].id,revisionId:s.get('active'),pageId:'syn-choice',cursorPageId:'syn-choice',response:{choice:1,checked:true}};assert.equal((await request('text-progress',record)).status,200);assert.deepEqual((await request('text-progress?'+new URLSearchParams({lessonId:l.id,componentId:record.componentId,revisionId:record.revisionId}))).value.responses['syn-choice'],record.response);
 assert.equal((await request('studio/text/import',input(s))).status,403);assert.equal((await request('studio/text/import-preview',input(s),'author-demo')).value.receipt.pageCount,154);assert.equal((await request('studio/text/import',input(s),'author-demo')).status,200);
 for(const asset of ['/text-reader.js','/text-contract.js','/content-identity.js','/studio/text-pages-editor.js','/studio/text-import.js'])assert.equal((await fetch(base+asset)).status,200,asset);
 assert.deepEqual(validateContent(s.snapshot()),s.snapshot());
});
