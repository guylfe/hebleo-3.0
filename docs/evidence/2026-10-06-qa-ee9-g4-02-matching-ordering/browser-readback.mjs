// Owner evidence only: read-only assertions on the fictional scratch browser run, its saved fingerprints and served assets.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const directory=fileURLToPath(new URL('./',import.meta.url)),base='http://127.0.0.1:'+process.argv[2];
const read=name=>JSON.parse(readFileSync(directory+name,'utf8').replace(/^\uFEFF/,''));
const checks=[];
const check=(name,fn)=>{fn();checks.push(name);};
const before=read('browser-ordering-before.json');
for(const name of ['empty','whitespace','invisible'])check(name+' rejection: every table, three learners, published pack and draft unchanged',()=>assert.deepEqual(read('browser-ordering-'+name+'-refused.json'),before));
const after=read('browser-ordering-after-saved.json');
check('filled ordering row: only the draft/kv fingerprint changes',()=>{
  assert.notEqual(after.draft,before.draft);assert.notEqual(after.tables.kv,before.tables.kv);
  assert.deepEqual({...after,draft:null,tables:{...after.tables,kv:null}},{...before,draft:null,tables:{...before.tables,kv:null}});
});
check('protected owner 4291 database unchanged',()=>assert.deepEqual(read('4291-after.json'),read('4291-before.json')));
check('protected listening processes unchanged',()=>assert.equal(readFileSync(directory+'protected-listeners-after.txt','utf8'),readFileSync(directory+'protected-listeners-before.txt','utf8')));
const partial=read('browser-partial-session.json'),graded=read('browser-graded-reloaded-session.json');
check('cross-lesson matching autosave and pinned reload',()=>{
  assert.deepEqual(partial.pairs,['w-ani','w-mi','w-sham']);assert.deepEqual(partial.progress.matching,{'w-sham':'there'});
  assert.equal(partial.revisionId,2);assert.equal(partial.progress.question,1);
});
check('resumed matching grades correctly and feedback points to the stored attempt',()=>{
  assert.deepEqual(graded.progress.matching,{'w-sham':'there','w-ani':'I','w-mi':'who'});
  assert.equal(graded.result.correct,true);assert.equal(graded.result.exerciseId,'ex-1-match');assert.equal(graded.result.revisionId,2);
  assert.equal(graded.progress.resultRequestId,graded.result.requestId);
});
const studio=await (await fetch(base+'/api/studio',{headers:{'x-demo-user':'author-demo'}})).json();
const ex=studio.draft.content.exercises.find(e=>e.id==='ex-2-order');
check('filled row is stored byte-exact with prefixes, answers and unknown metadata retained',()=>{
  assert.deepEqual(ex.tokens,['ב','בית','אני',' \u200fשם ']);assert.deepEqual(ex.prefixTokenIndices,[0]);assert.deepEqual(ex.answers,['אני בבית']);
  assert.equal(ex.prompt,'G4-02 owner ordering check (fixture-only)');assert.deepEqual(ex.extension,{fixture:'owner-browser',unknown:['retain']});
  const reloaded=read('browser-ordering-reloaded-dom.json');assert.deepEqual(reloaded.tokens,ex.tokens);assert.deepEqual(reloaded.prefixes,[true,false,false,false]);assert.equal(reloaded.prompt,ex.prompt);
});
const servedHashes={};
for(const path of ['public/app.js','public/learner-view.js','public/studio/exercise-editor.js']){
  const response=await fetch(base+'/'+path.replace(/^public\//,''));assert.equal(response.status,200);
  const sha=b=>createHash('sha256').update(b).digest('hex'),served=sha(Buffer.from(await response.arrayBuffer()));
  assert.equal(served,sha(readFileSync(path)));servedHashes[path]=served;
}
check('served browser modules match the tested source hashes',()=>{});
writeFileSync(directory+'browser-readback-results.json',JSON.stringify({ownerEvidenceOnly:true,checks,servedHashes,orderingExercise:ex},null,2));
console.log(JSON.stringify({passed:checks.length,checks,servedHashes},null,2));
