import test from 'node:test';
import assert from 'node:assert/strict';
import {Store,validateContent} from '../src/store.js';
import {sourceBrowseDigest} from '../src/source-vocabulary.js';
import {sourceBrowseFixture} from '../scripts/source-browse-fixture.mjs';
import {projectSourceVocabulary} from '../public/source-vocabulary.js';
import {projectLexicalRows} from '../public/lexical-runtime.js';
import {lexicalFixture} from '../scripts/lexical-fixture.mjs';
import {renderLexicalVocabulary} from '../public/lexical-vocabulary.js';
import {createServer} from '../src/server.js';

function setup(t){const store=new Store();t.after(()=>store.close());const content=store.snapshot();content.lexical=lexicalFixture();content.lexical.sourceBrowse=sourceBrowseFixture();validateContent(content);store.set('active',store.addRevision(content,'Synthetic source browse test'));return {store,content};}
test('source paging, category, original Lesson, and rich-source search grant no learned eligibility',t=>{
 const {store,content}=setup(t),before=JSON.stringify(store.learner('learner-demo')),learned=projectLexicalRows(content,'lesson-3');
 assert.equal(projectSourceVocabulary(content).total,61);assert.equal(projectSourceVocabulary(content).rows.length,50);
 assert.equal(projectSourceVocabulary(content,{offset:50}).rows.length,11);
 assert.equal(projectSourceVocabulary(content,{search:'Exact test meaning 60'}).rows[0].wordKey,'test-source-60');
 assert.equal(projectSourceVocabulary(content,{category:'Other'}).total,1);
 assert.equal(projectSourceVocabulary(content,{sourceLesson:'1.3'}).total,30);
 assert.equal(projectSourceVocabulary(content,{offset:1000,search:'no match'}).offset,0);
 assert.deepEqual(projectLexicalRows(content,'lesson-3'),learned);assert.equal(learned.rows.length,3);
 assert.equal(JSON.stringify(store.learner('learner-demo')),before);
 const output=store.publicContent(content);assert.equal(output.lexical,undefined);assert.equal(output.sourceView.mode,'source-browse');
 const html=renderLexicalVocabulary(output.sourceView.rows);assert.match(html,/Original source/);assert.match(html,/Source note introduced unchanged/);assert.doesNotMatch(html,/Add to review/);
});
test('ordinary draft and backup routes cannot forge, replace, remove, or approve source browsing',t=>{
 const {store,content}=setup(t),modified=structuredClone(content);modified.lexical.sourceBrowse.rows[0].english='FORGED';
 assert.throws(()=>validateContent(modified),/exact payload/);
 modified.lexical.sourceBrowse.digest=sourceBrowseDigest(modified.lexical.sourceBrowse);
 assert.throws(()=>store.stage({content:modified,baseRevisionId:store.get('active'),expectedDraftToken:null}),/trusted exact-source review/);
 delete modified.lexical.sourceBrowse;assert.throws(()=>store.stage({content:modified,baseRevisionId:store.get('active'),expectedDraftToken:null}),/trusted exact-source review/);
 const draft=store.stage({content,baseRevisionId:store.get('active'),expectedDraftToken:null});assert.ok(draft.draftToken);
 const backup=store.backup();for(const revision of backup.revisionSnapshots)if(revision.content.lexical?.sourceBrowse){revision.content.lexical.sourceBrowse.rows[0].english='FORGED';revision.content.lexical.sourceBrowse.digest=sourceBrowseDigest(revision.content.lexical.sourceBrowse);}
 backup.content.lexical.sourceBrowse=structuredClone(backup.revisionSnapshots.find(r=>r.revisionId===backup.activeRevisionId).content.lexical.sourceBrowse);
 assert.throws(()=>store.restore(backup),/Unknown source browsing approval/);
});
test('HTTP source display pages exclude internal approval and generated archives; GETs preserve state',async t=>{
 const {store}=setup(t),server=createServer(store);await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const before=store.backup(),base='http://127.0.0.1:'+server.address().port;
 const response=await fetch(base+'/api/source-vocabulary?category=Other');assert.equal(response.status,200);const body=await response.json();assert.equal(body.total,1);assert.equal(body.rows[0].runtimeId,undefined);assert.equal(body.authorization,undefined);assert.equal(body.catalogue,undefined);
 const after=store.backup();delete after.exportedAt;delete before.exportedAt;assert.deepEqual(after,before);
});
