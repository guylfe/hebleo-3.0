// Read the named live file ONLY through SQLite readOnly + VACUUM INTO a new file.
// All Store construction and publication happens on that disposable copy.
// Outputs aggregate evidence only: never teaching text, private notes or secrets.
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {Store} from '../src/store.js';
import {contextHash} from '../src/immutable-context.js';
import {rebaseDraftJSON} from '../src/lesson-publication.js';

const source=process.argv[2],lessonId=process.argv[3];
if(!source||!lessonId)throw Error('Usage: node scripts/verify-selected-publication-copy.mjs SOURCE_DB LESSON_ID');
const root=resolve('tmp'),{mkdirSync}=await import('node:fs');mkdirSync(root,{recursive:true});
const dir=mkdtempSync(join(root,'selected-publication-copy-')),file=join(dir,'disposable.sqlite');
const live=new DatabaseSync(resolve(source),{readOnly:true});
try { live.prepare('VACUUM INTO ?').run(file); } finally { live.close(); }
const store=new Store(file),evidence={scope:'disposable-copy-only',sourceAccess:'readOnly VACUUM INTO',lessonId};
try {
  const draft=store.currentDraft(),active=store.snapshot(),raw=store.db.prepare("SELECT value FROM kv WHERE key='draft'").get().value;
  const untouched=()=>contextHash({learners:store.db.prepare('SELECT * FROM learners ORDER BY id').all(),events:store.db.prepare('SELECT * FROM events ORDER BY id').all(),kv:store.db.prepare("SELECT * FROM kv WHERE key NOT IN ('active','draft') ORDER BY key").all()});
  const untouchedBefore=untouched(),base=store.get('active');
  Object.assign(evidence,{baseRevisionId:base,draftLessons:draft.content.lessons.length,publishedLessons:active.lessons.length,draftJSONBytes:Buffer.byteLength(JSON.stringify(draft.content)),draftHash:contextHash(draft.content)});
  const input={baseRevisionId:base,expectedDraftToken:draft.draftToken,lessonId,includeDependencies:[]};
  let start=performance.now();const review=store.reviewLessonPublication(input);evidence.reviewMilliseconds=Math.round(performance.now()-start);
  Object.assign(evidence,{canPublish:review.canPublish,noChanges:review.noChanges,blockers:review.blockers.map(({code,id,path})=>({code,id,path})),requiredDependencies:review.requiredDependencies,affectedPublishedLessons:review.affectedPublishedLessons});
  if(review.canPublish&&!review.noChanges) {
    start=performance.now();const result=store.publishLesson({...input,reviewToken:review.reviewToken});evidence.commitMilliseconds=Math.round(performance.now()-start);
    const saved=store.currentDraft();
    Object.assign(evidence,{disposablePublication:true,revisionId:result.revisionId,draftHashPreserved:contextHash(saved.content)===evidence.draftHash,stagedAtPreserved:saved.stagedAt===draft.stagedAt,rawDraftPreserved:store.db.prepare("SELECT value FROM kv WHERE key='draft'").get().value===rebaseDraftJSON(raw,base,result.revisionId),nonpublicationStatePreserved:untouchedBefore===untouched(),historicalSnapshotPreserved:contextHash(store.snapshot(base))===contextHash(active),otherPublishedLessonsPreserved:active.lessons.filter(l=>l.id!==lessonId).every(l=>contextHash(l)===contextHash(store.snapshot().lessons.find(x=>x.id===l.id))),remainingLessonChanges:result.remainingSavedChanges.filter(c=>c.kind==='lessons').length});
    if(!evidence.draftHashPreserved||!evidence.stagedAtPreserved||!evidence.rawDraftPreserved||!evidence.nonpublicationStatePreserved||!evidence.historicalSnapshotPreserved||!evidence.otherPublishedLessonsPreserved)throw Error('Disposable preservation check failed.');
    const count=store.db.prepare('SELECT count(*) AS n FROM revisions').get().n;
    try {store.publishLesson({...input,reviewToken:review.reviewToken});throw Error('Duplicate publication accepted.');}catch(error){if(error.code!=='STALE_BASE')throw error;}
    evidence.duplicateDidNotAppend=store.db.prepare('SELECT count(*) AS n FROM revisions').get().n===count;
  } else { evidence.disposablePublication=false;evidence.nonpublicationStatePreserved=untouchedBefore===untouched(); }
} finally {store.close();}
writeFileSync(join(dir,'evidence.json'),JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify({disposableDirectory:dir,...evidence},null,2));
