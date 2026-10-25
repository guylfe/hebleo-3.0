import {DatabaseSync,backup} from 'node:sqlite';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {Store,validateContent} from './hebleo-native-verification/src/store.js';
import {projectCurriculum} from './hebleo-native-verification/public/course.js';
import {databaseReceipt,executableIdentity} from './hebleo-native-verification/scripts/runtime-state.mjs';

const root=resolve('hebleo-native-verification');
const privateRoot=resolve(root,'.private/keyboard-clearance');
const evidence=resolve(root,'docs/evidence/keyboard-clearance-20261025');
mkdirSync(privateRoot,{recursive:true});mkdirSync(evidence,{recursive:true});
const live='C:/Users/Trans/.openmausbot/task-workspaces/8c900356-50f6-4d41-bbb9-50c8abe09233/b1d5e7a0-1d13-4e9e-b544-06d3b889fb9e/hebleo-consolidated/data/lexical-private-demo.sqlite';
const before=databaseReceipt(live);

const database=resolve(privateRoot,'disposable.sqlite');
const source=new DatabaseSync(live,{readOnly:true});
try{await backup(source,database);}finally{source.close();}
assert.deepEqual(databaseReceipt(database),before);
const store=new Store(database);
let fixture;
try{
 const draft=store.currentDraft(),content=store.snapshot();
 const memory=draft.content.lessons.find(l=>l.contentId==='MEMORY').blocks[0].textPages.pages.find(p=>p.type==='timedRecall');
 const pages=[
  {id:'native.reading',type:'reading',title:'SYNTHETIC native Hebrew rendering',html:'<p>This is a disposable engineering fixture, not an approved teaching lesson.</p><p dir="rtl" lang="he">אֲנִי · הוּא · הִיא · שָׁלוֹם</p><p>Mixed direction: <bdi dir="rtl">אֲנִי</bdi> / 0704177609112001</p>',gate:'reveal'},
  {id:'native.choice',type:'choice',title:'SYNTHETIC commitment test',prompt:'Select the first pointed string; feedback follows Check.',options:['אֲנִי','הוּא'],answer:0,explanation:'Synthetic engineering feedback only.',gate:'commit'},
  {...structuredClone(memory),id:'native.memory',title:'SYNTHETIC fixture · original MEMORY timer',gate:'reveal'},
  {id:'native.recall',type:'recall',title:'SYNTHETIC self-check',prompt:'Write a sample before revealing the illustrative model.',answer:'<p dir="rtl" lang="he">שָׁלוֹם</p>',grading:'self-check',gate:'reveal'}
 ];
 fixture={id:'native-test-only',title:'SYNTHETIC DISPOSABLE native verification',chapter:'SYNTHETIC engineering fixture',minutes:5,compositionVersion:2,introducedLetters:'',wordIds:[],exerciseIds:[],checkExerciseIds:[],blocks:[{id:'native-text',type:'explanation',source:'inline',renderer:'text',text:'',textPages:{version:1,pages,order:pages.map(p=>p.id)}}]};
 content.lessons.push(fixture);content.curriculum=projectCurriculum(content);validateContent(content);
 // Test-only activation in the disposable DB; never a content approval or live publish.
 const revisionId=store.addRevision(content,'SYNTHETIC DISPOSABLE native test fixture; pending first20 drafts remain unpublished');
 store.set('active',revisionId);
 draft.content.lessons.push(structuredClone(fixture));draft.content.curriculum=projectCurriculum(draft.content);
 store.set('draft',{baseRevisionId:revisionId,content:draft.content,stagedAt:new Date().toISOString()});
 assert.equal(store.snapshot().lessons.some(l=>l.draftImport),false);
 assert.equal(store.currentDraft().content.lessons.filter(l=>l.draftImport).length,20);
 assert.equal(store.db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
}finally{store.close();}
assert.deepEqual(databaseReceipt(live),before);
const report={createdAt:new Date().toISOString(),liveDatabase:live,liveBefore:before,disposableDatabase:database,disposableAfterFixture:databaseReceipt(database),fixture,activation:'Direct test-only revision insertion inside disposable.sqlite; no publication API or approval flags changed; real first20 drafts remain unpublished.',build:executableIdentity(root,'1198948eaefdd404f47d6fe43ebe305556b6bc05'),livePreserved:true};
writeFileSync(resolve(evidence,'SETUP.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({database,liveSha256:before.sha256,fixture:fixture.id,build:report.build.revision,runtimeSha256:report.build.runtimeSha256}));
