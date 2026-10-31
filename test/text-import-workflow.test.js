import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {mountTextImport} from '../public/studio/text-import.js';
import {Store} from '../src/store.js';
import {prepareTextInstall} from '../scripts/prepare-text-install.mjs';
import {databaseReceipt} from '../scripts/runtime-state.mjs';
const packFile=new URL('../docs/curriculum/first20-20261025/content.json',import.meta.url),pack=readFileSync(packFile,'utf8');
const settled=async fn=>{for(let i=0;i<200;i++){if(fn())return;await new Promise(r=>setTimeout(r,5));}throw Error('Text import UI did not settle');};
test('Studio text import review is read-only; input changes invalidate late reviews and staging uses exact CAS workspace save',async t=>{
 const dom=new JSDOM('<main></main>'),host=dom.window.document.querySelector('main'),store=new Store();let release,hold=true,staged=0,saved;
 const mount=mountTextImport(host,{getSnapshot:()=>({baseRevisionId:store.get('active'),expectedDraftToken:store.currentDraft()?.draftToken??null}),api:async(_path,input)=>{const review=store.reviewTextImport(input);if(hold)await new Promise(r=>release=r);return review;},saveDraft:async input=>{saved=input;return store.stage(input);},onStaged:()=>staged++});t.after(()=>{release?.();mount();dom.window.close();store.close();});
 Object.defineProperty(host.querySelector('[data-text-import-file]'),'files',{value:[{size:pack.length,text:async()=>pack}]});host.querySelector('[data-text-review]').click();await settled(()=>release);
 host.querySelector('[data-text-import-mappings]').dispatchEvent(new dom.window.Event('input',{bubbles:true}));release();await new Promise(r=>setTimeout(r,10));assert.equal(host.querySelector('[data-text-stage]').disabled,true);assert.equal(store.currentDraft(),null);
 hold=false;host.querySelector('[data-text-review]').click();await settled(()=>!host.querySelector('[data-text-stage]').disabled);assert.equal(store.currentDraft(),null);host.querySelector('[data-text-stage]').click();await settled(()=>staged===1);assert.equal(saved.expectedDraftToken,null);assert.equal(store.currentDraft().content.lessons.length,23);assert.equal(store.active().history.length,1);assert.equal(store.learner('learner-demo').attempts.length,0);
});
test('preservation rehearsal and explicit application conserve all prior records; old code is not silently migrated by startup',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'hebleo-text-install-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));const database=join(dir,'owner.sqlite'),s=new Store(database);s.updateLearner('learner-demo',{nikkud:'none'});s.stage({baseRevisionId:s.get('active'),expectedDraftToken:null,content:s.snapshot()});s.set('schema-version',7);s.close();
 const before=databaseReceipt(database),options={database,packFile,output:join(dir,'preflight')};const review=await prepareTextInstall(options);assert.equal(review.mode,'rehearsal-only');assert.deepEqual(databaseReceipt(database),before);assert.equal(review.allProtectedTablesPreserved,true);
 const applied=await prepareTextInstall({...options,output:join(dir,'apply'),apply:true,expectedDatabaseSHA256:before.sha256});assert.equal(applied.mode,'applied');const verify=new Store(database);try{assert.equal(verify.get('schema-version'),9);assert.equal(verify.learner('learner-demo').preferences.nikkud,'none');assert.equal(verify.currentDraft().content.lessons.length,23);}finally{verify.close();}
});
