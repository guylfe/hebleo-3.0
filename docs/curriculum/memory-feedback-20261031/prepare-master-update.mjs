import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const here=dirname(fileURLToPath(import.meta.url));
const input=resolve(process.argv[2]);
const doc=JSON.parse(readFileSync(input,'utf8'));
const r=JSON.parse(readFileSync(resolve(here,'REVISION.json'),'utf8'));
const ps=doc.tabs[0].body.content.filter(p=>p.paragraph);
const text=p=>p.paragraph.elements.map(e=>e.textRun?.content||'').join('');
const heading=p=>p.paragraph.paragraphStyle?.namedStyleType==='HEADING_1';
const start=ps.findIndex(p=>heading(p)&&text(p).startsWith('001 ·'));
const end=ps.findIndex(p=>heading(p)&&text(p).startsWith('002 ·'));
assert(start>=0&&end>start);
const section=ps.slice(start,end);
const old=JSON.parse(readFileSync(resolve(process.argv[3]),'utf8')).section;
const oldEnd=old.findIndex(p=>heading(p)&&text(p).startsWith('002 ·'));
const differences=section.flatMap((p,i)=>text(p)!==text(old[i])?[{paragraph:i,old:text(old[i]),current:text(p)}]:[]);
assert.equal(oldEnd,section.length);
assert.deepEqual(differences.map(x=>x.paragraph),[1,87],'Reconcile unexpected intervening source changes before writing');
const changes=[];
function replace(prefix,value,options={}){
 const matches=section.filter(p=>text(p).startsWith(prefix));assert.equal(matches.length,1,prefix);
 const p=matches[0];changes.push({startIndex:p.startIndex,endIndex:p.endIndex-1,oldText:text(p).slice(0,-1),text:value,headingId:p.paragraph.paragraphStyle?.headingId,...options});
}
const [p1,p2,p3,p4,p5,p6]=r.pages;
replace('Content: Installed local test draft','Content: Reconciled source adaptation for local testing · Approval: Guy final copy/design acceptance pending · Current installed baseline: 73e242e / content revision 5 (unchanged by this source edit) · Source revision: 5 (31 October 2026)');
replace('SOURCES / ADAPTATION:', 'SOURCES / ADAPTATION: Guy’s original presentation, slides 7–9 (0704177609112001, ten seconds and date associations), with the letter connection on slide 10: https://drive.google.com/file/d/1ImMGqVDWT8BMN63xay1-DT7ug3Z1W9mr/view. Exact concise copy: docs/curriculum/memory-feedback-20261031/LEARNER_COPY.md at 15fc734cc1b0a25492a81ca5e96052de5f1d9e62. Leo reconciled this adaptation against Guy’s fourteen feedback items for local testing on 31 October 2026. Guy’s final copy/design acceptance remains pending. Original prose, retired quiz and prior flow remain in document history and the source baseline. No new associative-network text, vocabulary or audio.');
replace('DESIGN DECISIONS:', 'DESIGN DECISIONS: Six active top-level pages in order: MEMORY-A2.learn.try-first, MEMORY-A2.learn.adam-study, MEMORY-A2.learn.number-round, MEMORY-A2.learn.connection, MEMORY-A2.learn.meaning, MEMORY-A2.continue. Three numbered principle rows with bold titles are directly available; each expands independently and keeps earlier content visible. Continue never requires opening all three. No locked row, completion gate or timed automatic advance. Remove MEMORY-A2.embedded.what-changed from active delivery; its full original question, options, answer and feedback below are inactive source history only. Place the collapsed optional MEMORY-A2.embedded.number-return within MEMORY-A2.learn.meaning; retire MEMORY-A2.learn.return only from active top-level order. No mastery claim or replacement assessment.');
replace('Welcome to Hebleo, the smart way',p1.copy.paragraphs[0]);
replace('Learning languages independently',p1.copy.numberedList[0],{numbered:true});
replace('Teaching Hebrew as a tutor',p1.copy.numberedList[1],{numbered:true});
replace('Getting an M.Sc.',p1.copy.numberedList[2],{numbered:true});
replace('Screen 2: Adam',`Screen 2: ${p2.title} · ${p2.id}`);
replace('This led to a case study',p2.copy.paragraphs.slice(0,2).join('\n'),{bold:['70 hours']});
replace('Let’s briefly demonstrate',p2.copy.paragraphs[2]);
replace('Let’s try a quick experiment.',p3.copy.paragraphs[0]);
replace('Ready? Press Play to begin.','');
replace('[PLACEHOLDER / AUTHOR INSTRUCTION] TIMED DISPLAY', '[AUTHOR INSTRUCTION] TIMED DISPLAY MEMORY-NUMBER: show the exact string 0704177609112001 for 10,000 ms after Play; show a Time remaining timer bar; hide before enabling recall. Preserve leading zero, digit order, interruption handling and Show me how. No dates, event labels, grouping or answer before the initial attempt. Never autoplay. Protect only the visible stimulus against ordinary selection/copy/cut/drag; retain recall-field editing/paste and access. This does not prevent screenshots or system-level extraction.');
replace('[PLACEHOLDER / AUTHOR INSTRUCTION] CONTROL:', '[AUTHOR INSTRUCTION] CONTROL: Play once → ten-second display → one ungraded attempt or Show me how → explanation. No initial replay, hints, compulsory retry, complete/correct answer or mastery gate. Continue remains possible after interruption without restarting the display. Remove Hear the digits once from default controls. Provide a collapsed accessible/untimed study alternative with the exact digits and Hide-and-recall/skip; label study mode explicitly, not equivalent timed performance. No new audio asset or speech synthesis. Verify actual assistive behavior in the software; this source does not claim accessibility acceptance.');
replace('LEARNER PROMPT: How much of the number',`LEARNER PROMPT: ${p3.prompt}`);
replace('Screen 4: Give the number meaning',`Screen 4: ${p4.title} · ${p4.id}`);
replace('That was quite a lot of digits',p4.copy.paragraphs[0]);
replace('[PLACEHOLDER / AUTHOR INSTRUCTION] ANIMATION', '[AUTHOR INSTRUCTION] ANIMATION MEMORY-NUMBER-TO-DATES: Show the connection transforms 0704177609112001 → 07041776 · 09112001 → 07/04/1776 · 09/11/2001. Preserve sixteen persistent digit nodes, reserved frame, stable baseline and keyed horizontal transforms. Only groups, spacing and separators change; event labels follow the final movement. Explanatory replay retains nodes and read state and never restarts initial recall. Reduced-motion explicit steps and one accessible state summary preserve the same meaning. No final duplicate Slashes annotation.');
replace('These dates use American',p4.activity.dateContext.introduction);
replace('The first is the date',p4.activity.dateContext.events.join('\n'));
replace('We haven’t changed any','');
replace('What changed is our interpretation',p4.activity.dateContext.transition);
replace('[AUTHOR INSTRUCTION] REVEAL MEMORY-PRINCIPLES:', '[AUTHOR INSTRUCTION] REVEAL MEMORY-PRINCIPLES: use three numbered expandable rows with bold titles, all directly available. The first may open after the demonstration. Keep earlier opened content visible; retain keyboard focus on the activated row. Continue is available without opening any or all rows; no locked row, all-three requirement or completion gate. No timed auto-advance and no substitute quiz.');
for(const principle of p4.activity.principles)replace(principle.title,`${principle.title} ${principle.text}`,{numberedPrinciple:true,bold:[principle.title]});
replace('Screen 5: What made the difference?',`Screen 5: ${p5.title} · ${p5.id}`);
replace('While we’ll use all 3 principles',p5.copy.paragraphs[0]);
replace('All three principles will come back', '[AUTHOR HISTORY — INACTIVE] The following MEMORY-A2.embedded.what-changed block is retained verbatim for provenance and existing comment anchors. It is excluded from all six active pages, completion and assessment. No replacement quiz is added. Active Screen 5 continues below with its optional comparison.');
replace('MEMORY-A2.embedded.what-changed — multiple choice','MEMORY-A2.embedded.what-changed — historical multiple choice; inactive');
replace('[AUTHOR INSTRUCTION] This is the only comprehension', '[AUTHOR HISTORY — INACTIVE] Former instruction retained for provenance: This is the only comprehension question in the lesson. It checks how the ideas work, not recall of their names. Show the authored feedback for the selected option and the explanation for B after submission. Permit Continue without a compulsory repeat round. This instruction is retired and MUST NOT govern active delivery.');
replace('Screen 6: Notice the difference',`Optional section within Screen 5: ${p5.inlineOptional.label} · ${p5.inlineOptional.historicalPageId} (historical page identity; not a top-level page)`);
replace('If you’d like to try the comparison',p5.inlineOptional.label,{bold:[p5.inlineOptional.label]});
replace('If you try it, compare your attempts',p5.inlineOptional.copy.paragraphs[0]);
replace('LEARNER PROMPT: With the two dates',`LEARNER PROMPT: ${p5.inlineOptional.prompt}`);
replace('[AUTHOR INSTRUCTION] OPTIONAL COMPARISON:', '[AUTHOR INSTRUCTION] OPTIONAL COMPARISON: collapsed inside MEMORY-A2.learn.meaning by default. Show the label Try the comparison (optional) before opening; show its instructions and prompt only after opening. Ordinary Continue works closed, open, empty, attempted and compared, including after reload and local errors. Opening, responding and revealing results are never required. Keep Skip after opening. No second timed display or recall replay. Hide comparison models until Show the comparison/submission. Show original digits/dates and only attempts actually made; never invent an attempt. Preserve MEMORY-A2.embedded.number-return, its raw input, all six existing feedback variants and combined reverse/zero/day-month classification. Historical MEMORY-A2.learn.meaning quiz responses must never be reinterpreted as comparison attempts. Preserve historical responses by content revision and activity identity; Lead owns validated runtime adaptation/migration.');
replace('Continue — learner text',`Screen 6: Continue — learner text · ${p6.id}`);
replace('You’ve seen how grouping',p6.copy.paragraphs[0]);
replace('AUTHOR REVIEW:', 'AUTHOR REVIEW: This exact concise adaptation is reconciled for Guy’s local testing, not final acceptance. Preserve the 500/70-hour personal account with 70 hours bold; it remains supplied author content, not independently validated here. Number the experience vectors, reuse Welcome to Hebleo and How memory works headings, use one date-format explanation, general-first Memory hooks and the familiarity caveat. No active application quiz, separate return page, associative-network supplement or vocabulary. All principle rows are available without a Continue gate; comparison is collapsed and optional inside Screen 5. Existing comments, headings, stable identities and original content/history remain. Source readback is distinct from software implementation, installation and device/accessibility acceptance.');
// Keep the installed baseline record verbatim; add a distinct source-only checkpoint.
const last=section.at(-1);
changes.push({startIndex:last.endIndex-1,endIndex:last.endIndex-1,oldText:'',text:'\nSource adaptation record, 31 October 2026: reconciled MEMORY copy and six-page flow saved for local testing. Source component MEMORY-A2-interactive remains unchanged. Current installed revision-5 record above is historical implementation evidence, not evidence that this new adaptation is installed. Lead owns runtime/schema/editing and installation. Guy final copy/design acceptance pending.',append:true});
const requests=[];
for(const c of changes.toSorted((a,b)=>b.startIndex-a.startIndex)){
 const range={startIndex:c.startIndex,endIndex:c.endIndex,tabId:'t.0'};
 if(c.endIndex>c.startIndex)requests.push({deleteContentRange:{range}});
 if(c.text){
  requests.push({insertText:{location:{index:c.startIndex,tabId:'t.0'},text:c.text}});
  if(!c.headingId&&!c.append)requests.push({updateTextStyle:{range:{...range,endIndex:c.startIndex+c.text.length},textStyle:{bold:false},fields:'bold'}});
  for(const bold of c.bold||[]){const ix=c.text.indexOf(bold);assert(ix>=0);requests.push({updateTextStyle:{range:{startIndex:c.startIndex+ix,endIndex:c.startIndex+ix+bold.length,tabId:'t.0'},textStyle:{bold:true},fields:'bold'}});}
 }
}
// Number each adjacent group in one native list after text indexes have settled.
const finalIndex=c=>c.startIndex+changes.filter(other=>other.startIndex<c.startIndex).reduce((n,other)=>n+other.text.length-(other.endIndex-other.startIndex),0);
for(const property of ['numbered','numberedPrinciple']){
 const group=changes.filter(c=>c[property]).toSorted((a,b)=>a.startIndex-b.startIndex);
 const first=group[0],last=group.at(-1);
 requests.push({createParagraphBullets:{range:{startIndex:finalIndex(first),endIndex:finalIndex(last)+last.text.length,tabId:'t.0'},bulletPreset:'NUMBERED_DECIMAL_ALPHA_ROMAN'}});
}
const sha=v=>createHash('sha256').update(v).digest('hex');
const plan={documentId:doc.documentId,requiredRevisionId:doc.revisionId,tabId:'t.0',sourceCommit:'15fc734cc1b0a25492a81ca5e96052de5f1d9e62',sourceCopySha256:sha(readFileSync(resolve(here,'LEARNER_COPY.md'))),interveningChanges:differences,changes,requests};
writeFileSync(resolve(dirname(input),'plan.json'),JSON.stringify(plan,null,2)+'\n');
writeFileSync(resolve(dirname(input),'memory-before.json'),JSON.stringify({documentId:doc.documentId,revisionId:doc.revisionId,paragraphs:section},null,2)+'\n');
console.log(JSON.stringify({changes:changes.length,requests:requests.length,revision:doc.revisionId,interveningChanges:differences.map(d=>d.paragraph)}));
