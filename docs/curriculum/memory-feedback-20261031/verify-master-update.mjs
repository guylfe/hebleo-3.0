import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const here=dirname(fileURLToPath(import.meta.url)),evidence=resolve(process.argv[2]);
const read=name=>JSON.parse(readFileSync(resolve(evidence,name),'utf8'));
const before=read('before.json'),after=read('after.json'),plan=read('applied-plan.json');
const r=JSON.parse(readFileSync(resolve(here,'REVISION.json'),'utf8'));
const sha=x=>createHash('sha256').update(typeof x==='string'||Buffer.isBuffer(x)?x:JSON.stringify(x)).digest('hex');
const text=p=>p.paragraph.elements.map(e=>e.textRun?.content||'').join('');
const strip=v=>Array.isArray(v)?v.map(strip):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).filter(([k])=>!['startIndex','endIndex'].includes(k)).map(([k,x])=>[k,strip(x)])):v;
const split=d=>{const all=d.tabs[0].body.content;const s=all.findIndex(p=>p.paragraph?.paragraphStyle?.namedStyleType==='HEADING_1'&&text(p).startsWith('001 ·'));const e=all.findIndex(p=>p.paragraph?.paragraphStyle?.namedStyleType==='HEADING_1'&&text(p).startsWith('002 ·'));return {prefix:all.slice(0,s),memory:all.slice(s,e),suffix:all.slice(e),all};};
const b=split(before),a=split(after),joined=a.memory.map(text).join('');
const checks={};const check=(key,ok)=>{checks[key]=!!ok;};
assert.equal(sha(readFileSync(resolve(here,'LEARNER_COPY.md'))),plan.sourceCopySha256,'Exact learner-copy artifact changed');
assert.equal(after.revisionId,read('write.json').revisionId,'Readback differs from successful guarded write revision');
check('prefix_content_styles_and_index_links_unchanged',sha(strip(b.prefix))===sha(strip(a.prefix)));
check('suffix_all_other_lessons_content_and_styles_unchanged',sha(strip(b.suffix))===sha(strip(a.suffix)));
const headings=all=>all.filter(p=>p.paragraph?.paragraphStyle?.headingId).map(p=>[p.paragraph.paragraphStyle.headingId,p.paragraph.paragraphStyle.namedStyleType]);
check('all_existing_heading_ids_and_levels_preserved',JSON.stringify(headings(b.all))===JSON.stringify(headings(a.all)));
const lessonHeadings=all=>all.filter(p=>p.paragraph?.paragraphStyle?.namedStyleType==='HEADING_1'&&/^\d{3} ·/.test(text(p))).map(p=>[p.paragraph.paragraphStyle.headingId,text(p)]);
check('all_119_lesson_headings_and_titles_unchanged',lessonHeadings(a.all).length===119&&JSON.stringify(lessonHeadings(b.all))===JSON.stringify(lessonHeadings(a.all)));
const cb=read('comments-before.json'),ca=read('comments-after.json');
check('all_comment_threads_quotes_anchors_replies_and_statuses_unchanged',sha(cb.comments)===sha(ca.comments)&&!cb.nextPageToken&&!ca.nextPageToken);
const resourceKeys=Object.keys(before.tabs[0]).filter(k=>!['body','lists'].includes(k));
check('tab_resources_named_ranges_objects_styles_unchanged',resourceKeys.every(k=>sha(before.tabs[0][k])===sha(after.tabs[0][k])));
const oldHeading=b.memory.filter(p=>p.paragraph.paragraphStyle?.headingId);
check('memory_heading_styles_preserved',oldHeading.every(p=>{const q=a.memory.find(q=>q.paragraph.paragraphStyle?.headingId===p.paragraph.paragraphStyle.headingId);return q&&sha(p.paragraph.paragraphStyle)===sha(q.paragraph.paragraphStyle);}));
check('all_40_scoped_edits_read_back_exactly',plan.changes.every(c=>!c.text||joined.includes(c.text)));
const mapped=[];
function locate(field,value){
 const hits=[];
 for(const p of a.memory){const t=text(p);let i=t.indexOf(value);if(i>=0)hits.push({tabId:'t.0',paragraphStart:p.startIndex,paragraphEnd:p.endIndex,startIndex:p.startIndex+i,endIndex:p.startIndex+i+value.length,headingId:p.paragraph.paragraphStyle?.headingId||null});}
 assert(hits.length>0,field+' not found');mapped.push({field,text:value,sha256:sha(value),locations:hits});
}
for(const [i,page]of r.pages.entries()){
 for(const [j,s]of page.copy.paragraphs.entries())locate(`pages[${i}].copy.paragraphs[${j}]`,s);
 for(const [j,s]of (page.copy.numberedList||[]).entries())locate(`pages[${i}].copy.numberedList[${j}]`,s);
 if(page.prompt)locate(`pages[${i}].prompt`,page.prompt);
 if(page.activity?.feedback)for(const [key,value]of Object.entries(page.activity.feedback))locate(`pages[${i}].activity.feedback.${key}`,value);
 if(page.activity?.dateContext){const ctx=page.activity.dateContext;locate(`pages[${i}].activity.dateContext.introduction`,ctx.introduction);ctx.events.forEach((s,j)=>locate(`pages[${i}].activity.dateContext.events[${j}]`,s));locate(`pages[${i}].activity.dateContext.transition`,ctx.transition);}
 if(page.activity?.principles)page.activity.principles.forEach((p,j)=>locate(`pages[${i}].activity.principles[${j}]`,p.title+' '+p.text));
 if(page.inlineOptional){const o=page.inlineOptional;locate(`pages[${i}].inlineOptional.label`,o.label);o.copy.paragraphs.forEach((s,j)=>locate(`pages[${i}].inlineOptional.copy.paragraphs[${j}]`,s));locate(`pages[${i}].inlineOptional.prompt`,o.prompt);for(const [key,value]of Object.entries(o.activity.feedback))locate(`pages[${i}].inlineOptional.activity.feedback.${key}`,value);}
}
check('all_exact_learner_copy_fields_mapped',mapped.length===30);
const find=s=>a.memory.find(p=>text(p).trim()===s);
const vectors=r.pages[0].copy.numberedList.map(find),principles=r.pages[3].activity.principles.map(p=>find(p.title+' '+p.text));
function nativeNumbered(items){const ids=new Set(items.map(p=>p?.paragraph?.bullet?.listId));if(ids.size!==1)return false;const list=after.tabs[0].lists[[...ids][0]];return list?.listProperties?.nestingLevels?.[0]?.glyphType==='DECIMAL'&&list.listProperties.nestingLevels[0].startNumber===1;}
check('three_credentials_one_native_decimal_list',nativeNumbered(vectors));
check('three_principles_one_native_decimal_list',nativeNumbered(principles));
function boldExact(p,target){const t=text(p),i=t.indexOf(target);let index=0,covered=0;for(const e of p.paragraph.elements){const s=e.textRun?.content||'',end=index+s.length,overlap=Math.max(0,Math.min(end,i+target.length)-Math.max(index,i));if(e.textRun?.textStyle?.bold)covered+=overlap;index=end;}return covered===target.length;}
check('70_hours_and_all_three_principle_titles_bold',boldExact(find(r.pages[1].copy.paragraphs[1]),'70 hours')&&principles.every((p,i)=>boldExact(p,r.pages[3].activity.principles[i].title)));
const quizStart=b.memory.findIndex(p=>text(p).startsWith('LEARNER PROMPT: Imagine you recognise'));
const quizEnd=b.memory.findIndex((p,i)=>i>quizStart&&text(p).startsWith('[AUTHOR INSTRUCTION] This is the only'));
check('original_quiz_question_options_answer_feedback_retained_verbatim_as_inactive_history',b.memory.slice(quizStart,quizEnd).every(p=>joined.includes(text(p)))&&joined.includes('[AUTHOR HISTORY — INACTIVE]')&&joined.includes('excluded from all six active pages, completion and assessment'));
check('six_top_level_screen_headings_only',a.memory.filter(p=>/^Screen \d:/.test(text(p))).length===6);
check('principles_directly_available_without_continue_gate',joined.includes('all directly available')&&joined.includes('Continue is available without opening any or all rows'));
check('comparison_collapsed_within_meaning_and_never_required',joined.includes('collapsed inside MEMORY-A2.learn.meaning by default')&&joined.includes('Ordinary Continue works closed, open, empty, attempted and compared'));
check('accessible_alternative_no_audio_or_tts_requirement',joined.includes('collapsed accessible/untimed study alternative')&&joined.includes('No new audio asset or speech synthesis'));
check('installed_baseline_record_retained_verbatim',joined.includes(text(b.memory.at(-1))));
check('guy_acceptance_pending',joined.includes('Guy final copy/design acceptance pending'));
check('all_untargeted_memory_paragraphs_styles_and_content_preserved',b.memory.filter(p=>!plan.changes.some(c=>c.startIndex===p.startIndex||c.append&&c.startIndex===p.endIndex-1)).every(p=>a.memory.some(q=>sha(strip(p))===sha(strip(q)))));
const report={status:Object.values(checks).every(Boolean)?'PASS':'FAIL',dateIsrael:'2026-10-31',sourceDocument:after.documentId,documentUrl:after.document_url,tabId:'t.0',beforeRevision:before.revisionId,currentGoogleDocRevision:after.revisionId,sourceCopyCommit:plan.sourceCommit,sourceCopySha256:plan.sourceCopySha256,revisionJsonSha256:sha(readFileSync(resolve(here,'REVISION.json'))),sourceTextSha256:sha(joined),sourceParagraphsSha256:sha(a.memory),sourceSnapshot:'MASTER_MEMORY_AFTER.json',sourceBeforeSnapshot:'MASTER_MEMORY_BEFORE.json',exactParagraphSourceHashMapping:mapped,scopedPreservation:{scope:'Only MEMORY-A2; complete outside-MEMORY content and styles compared after removing positional startIndex/endIndex offsets only',prefixBeforeSha256:sha(strip(b.prefix)),prefixAfterSha256:sha(strip(a.prefix)),suffixBeforeSha256:sha(strip(b.suffix)),suffixAfterSha256:sha(strip(a.suffix)),existingHeadings:headings(b.all).length,lessonHeadings:lessonHeadings(a.all).length,commentThreads:ca.comments.length,activeCommentThreads:ca.comments.filter(c=>!c.deleted).length,commentsBeforeSha256:sha(cb.comments),commentsAfterSha256:sha(ca.comments),commentPreservation:'Thread IDs, anchor values, quoted content, replies, deletion/resolution state and timestamps are identical by API readback; visual anchor placement not inspected',interveningChanges:plan.interveningChanges},checks,activeOrder:r.order,retiredActivityIds:r.retiredActivityIds,retiredTopLevelPageIds:r.retiredTopLevelPageIds,history:'The prior quiz is explicitly inactive inside the master so its original heading identity/comment anchors survive; complete pre-update MEMORY snapshot and source baseline also retain original text. Historical .learn.return heading remains identified as an optional section, not a top-level screen.',applicationStatus:'Source saved/read back for local testing. No app source, installation, main, WordPress or publication change. Guy final copy/design acceptance pending.',limitations:['Runtime/schema/state migration, editing, installation and assistive behavior remain Lead work.','Rendered Google Docs layout and physical device behavior were not inspected.','Source lists and emphasis verified through native structure/style readback.','Google Docs edit history is additive; no history/comment deletion operations were sent.']};
report.hashConventions={sourceCopySha256:'Exact local LEARNER_COPY.md bytes at preparation; checkout line endings retained',sourceCopyGitBlobSha256:'Exact committed LEARNER_COPY.md bytes from the stated source-copy commit',sourceTextSha256:'Concatenated native paragraph text as returned by Google Docs, encoded UTF-8',sourceParagraphsSha256:'JSON.stringify native MEMORY paragraph array, including UTF-16 indexes',preservation:'JSON.stringify structures with positional startIndex/endIndex removed, all other fields retained'};
report.sourceCopyGitBlobSha256=sha(execFileSync('git',['-c','core.longpaths=true','show',plan.sourceCommit+':docs/curriculum/memory-feedback-20261031/LEARNER_COPY.md'],{cwd:resolve(here,'../../..')}));
report.appliedRequestsSha256=sha(plan.requests);
report.successfulBatchRequests=plan.requests.length;
writeFileSync(resolve(here,'MASTER_UPDATE_VERIFIED.json'),JSON.stringify(report,null,2)+'\n');
for(const [name,d,parts]of [['BEFORE',before,b],['AFTER',after,a]])writeFileSync(resolve(here,`MASTER_MEMORY_${name}.json`),JSON.stringify({documentId:d.documentId,sourceRevision:d.revisionId,tabId:'t.0',paragraphs:parts.memory,lists:d.tabs[0].lists},null,2)+'\n');
console.log(JSON.stringify({status:report.status,checks,fields:mapped.length,revision:after.revisionId},null,2));
assert(Object.values(checks).every(Boolean),'Source verification failed');
