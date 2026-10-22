import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Store} from '../src/store.js';
import {publishIllustrativeLinks,linkIllustrativeExercises} from '../scripts/link-illustrative-exercises.mjs';
const withoutNewLinks=pack=>{const copy=structuredClone(pack);for(const e of copy.exercises){if(!e.vocabularyBindings)continue;e.vocabularyBindings=e.vocabularyBindings.filter(b=>!b.id.startsWith('demo-link-'));if(!e.vocabularyBindings.length)delete e.vocabularyBindings;}return copy;};
test('Illustrative word links reach published lessons while conserving old content, draft edits and all learner state',t=>{
 const s=new Store();t.after(()=>s.close());const original=s.snapshot(),revision=s.get('active');
 s.attempt('learner-demo',{requestId:randomUUID(),revisionId:revision,lessonId:'lesson-1',exerciseId:'ex-1-recognize',answer:'who'});
 s.saveProgress('learner-demo',{lessonId:'lesson-2',revisionId:revision,step:'apply',question:0,answer:'',selectedTokens:[],matching:{},practiceIds:[],resultRequestId:null});
 const draft=structuredClone(original);draft.lessons[0].title+=' UNPUBLISHED EDIT';
 s.stage({baseRevisionId:revision,expectedDraftToken:null,content:draft});
 const draftBefore=s.currentDraft(),learners=s.db.prepare('SELECT * FROM learners ORDER BY id').all();
 const result=publishIllustrativeLinks(s);assert.ok(result.added>0);assert.equal(result.revisionId,revision+1);
 assert.deepEqual(withoutNewLinks(s.snapshot()),original);assert.equal(s.snapshot().lessons[0].title,original.lessons[0].title);
 assert.deepEqual(s.snapshot(revision),original);assert.deepEqual(s.db.prepare('SELECT * FROM learners ORDER BY id').all(),learners);
 assert.deepEqual(withoutNewLinks(s.currentDraft().content),draft);assert.equal(s.currentDraft().stagedAt,draftBefore.stagedAt);
 assert.equal(s.currentDraft().baseRevisionId,result.revisionId);
 // Existing sessions stay pinned; only the explicit existing action takes latest.
 assert.equal(s.session('learner-demo','lesson-2').revisionId,revision);
 s.startLatestLesson('learner-demo','lesson-2');const session=s.session('learner-demo','lesson-2');
 assert.equal(session.revisionId,result.revisionId);
 for(const type of ['ordering','cloze','transformation']){
  const e=session.content.exercises.find(e=>e.type===type);assert.ok(e.vocabularyBindings?.length,type);
  for(const b of e.vocabularyBindings)assert.ok(session.content.exerciseVocabulary.byWordId[b.wordId]);
 }
 assert.equal(s.learner('learner-demo').attempts.length,1);
 const before=s.db.prepare('SELECT * FROM revisions ORDER BY id').all(),draftToken=s.currentDraft().draftToken;
 assert.equal(publishIllustrativeLinks(s).unchanged,true);assert.deepEqual(s.db.prepare('SELECT * FROM revisions ORDER BY id').all(),before);assert.equal(s.currentDraft().draftToken,draftToken);
});
test('Illustrative helper refuses real curriculum and source approval bypass and never links prefix forms to a base word',t=>{
 const s=new Store();t.after(()=>s.close());const c=s.snapshot(),linked=linkIllustrativeExercises(c).content;
 assert.ok(!linked.exercises.flatMap(e=>e.vocabularyBindings||[]).some(b=>b.text==='בבית'||b.wordId==='w-babayit'));
 c.provenance.kind='human-authored';assert.throws(()=>linkIllustrativeExercises(c),/illustrative demo/);
 const before=s.active();s.set('source-state',{sources:{s:{}}});assert.throws(()=>publishIllustrativeLinks(s),/human-reviewed/);assert.deepEqual(s.active(),before);
});
