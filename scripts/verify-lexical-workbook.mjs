import fs from 'node:fs';
import assert from 'node:assert/strict';
import {adaptConsolidatedWorkbook} from '../src/lexical-adapter.js';
import {Store} from '../src/store.js';
import {computeEligibility} from '../public/lexical-contract.js';
import {lexicalCatalogue} from '../public/lexical-runtime.js';
const capture=JSON.parse(fs.readFileSync(process.argv[2],'utf8')),result=adaptConsolidatedWorkbook(capture),{lexical,preview}=result;
assert.deepEqual(preview.counts.categories,{verb:93,adjective:59,preposition:19,noun:418,other:203});
for(const [field,count] of Object.entries({words:792,aliases:1251,formReferences:1172,legacyOccurrences:437,usages:8,examples:95,held:2,unapprovedDrafts:1770}))assert.equal(preview.counts[field],count,field);
for(const id of ['000273','000279','000029'])assert.equal(lexical.words.filter(w=>w.wordKey==='provisional:lexeme:verb:'+id).length,1);
assert.equal(new Set(lexical.words.map(w=>w.wordKey)).size,lexical.words.length);
assert.deepEqual(lexical.archive,capture);
assert.deepEqual(lexical.retainedReferences.formReferences,capture.plan.tables.find(t=>t.name==='Form References').rows);
assert.equal(lexical.words.flatMap(w=>w.forms).filter(f=>f.status==='inapplicable').length,22);
assert.equal(lexical.words.flatMap(w=>w.forms).filter(f=>f.status==='missing').length,212);
const s=new Store(':memory:');try{
 const c=s.snapshot(),learners=JSON.stringify(s.db.prepare('SELECT * FROM learners ORDER BY id').all());c.lexical=lexical;
 const staged=s.stage({baseRevisionId:s.get('active'),expectedDraftToken:null,content:c});
 assert.deepEqual(s.currentDraft().content.lexical,lexical);
 const pack=s.previewSession({draftToken:staged.draftToken,lessonId:'lesson-1'}).content;
 assert.equal(pack.lexical,undefined);assert.equal(pack.lexicalView.rows.length,0);
 assert.equal(JSON.stringify(s.db.prepare('SELECT * FROM learners ORDER BY id').all()),learners);
 const eligibility=computeEligibility(lexical,lexicalCatalogue(c),{courseId:'demo-foundations',lessonId:'lesson-1',wordKey:lexical.words[0].wordKey});assert.equal(eligibility.wordState,'unapproved');
 const migration=s.lexicalMigrationPreview({draftToken:staged.draftToken,mappings:[]});assert.equal(migration.canApply,false);
 console.log(JSON.stringify({status:'passed',...preview,sourceStateCounts:{missing:212,inapplicable:22},checks:['one row each for אמר/ראה/היה','exact archive retention','all original references and held identities retained','stage and exact reload','pending source excluded from learner response','no learner or card writes','preview-only migration'],draftToken:staged.draftToken},null,2));
}finally{s.close();}
