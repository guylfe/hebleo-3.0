import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const out=dirname(fileURLToPath(import.meta.url));
const repo=resolve(out,'../../..');
const lead='C:/Users/Trans/.openmausbot/task-workspaces/8c900356-50f6-4d41-bbb9-50c8abe09233/489864a5-e240-4cef-a6fc-8cc6d0df25fa/hebleo-audio-contract';
const feedbackPath='C:/Users/Trans/.openmausbot/task-workspaces/71c71389-5334-4e0c-9ca8-d80dd28223d1/fa5b73cd-180c-40ed-bf11-469defe4a57f/FIRST2_FEEDBACK_20261031.json';
const packPath=resolve(lead,'content/first2/lessons.json');
const sourcePath=resolve(repo,'docs/curriculum/first2-implementation-20261030/MEMORY-A2.md');
const sha=b=>createHash('sha256').update(b).digest('hex');
const packBytes=readFileSync(packPath), sourceBytes=readFileSync(sourcePath), feedbackBytes=readFileSync(feedbackPath);
assert.equal(sha(packBytes),'1b9df3021485e37c5c01af7a0eb573a482ba7329c797dc1dad55aaa2e9fb9e3a','Baseline changed: reconcile before generating.');
const baseline=JSON.parse(packBytes).lessons.find(l=>l.id==='MEMORY-A2');
const old=baseline.blocks[0].textPages.pages;
const feedback=JSON.parse(feedbackBytes);
const get=id=>structuredClone(old.find(p=>p.id===id));
const value='0704177609112001';
const pages=[
 {id:old[0].id,title:'Welcome to Hebleo',stage:'Learn',copy:{
   paragraphs:['Welcome to Hebleo, the smart way to learn Hebrew. I’ve spent over ten years bringing together three kinds of experience:'],
   numberedList:[
     'Learning languages independently and seeing what works first-hand.',
     'Teaching Hebrew and refining my materials with each student.',
     'My M.Sc. in Cognitive Science, which helped me understand how to improve learning, especially languages.'
   ]}, controls:['Continue']},
 {id:old[1].id,title:'Welcome to Hebleo',stage:'Learn',copy:{paragraphs:[
   'One of my students, Adam, started with no Hebrew and a similar scientific background. We tested how long it would take him to hold conversations with me in Hebrew.',
   'For an English speaker, this usually takes around 500 hours. Using the method at the core of Hebleo, Adam took around 70 hours—over seven times faster.',
   'Let’s try a short demonstration. These ideas can help you learn beyond this course, too.'
 ]},emphasis:['70 hours'],controls:['Continue']},
 {id:old[2].id,title:'A quick memory experiment',stage:'Learn',copy:{paragraphs:[
   'Press Play to see a number for ten seconds. Remember as much as you can without writing it down. When it disappears, type what you remember.'
 ]},prompt:'What do you remember? Enter an attempt, or select Show me how.',activity:{
   ...get(old[2].id).activity,value,durationMs:10000
 },controls:{before:['Play','Show me how'],during:['Show me how'],after:['Continue','Show me how']},
 progressLabel:'Time remaining'},
 {id:old[3].id,title:'How memory works',stage:'Learn',copy:{paragraphs:[
   'Let’s give the same digits some meaning.'
 ]},activity:{...get(old[3].id).activity,
   descriptions:['The original sixteen digits.','The same digits, grouped into two sets of eight.',''],
   after:undefined,
   dateContext:{introduction:'American month–day–year order:',events:[
     'July 4, 1776 — the American Declaration of Independence.',
     'September 11, 2001 — the September 11 attacks.'
   ],transition:'Same digits, different meaning. Three ideas help:'},
   principles:[
     {title:'Chunking:',text:'Think of two meaningful dates instead of sixteen separate digits.'},
     {title:'Logical constraints:',text:'A date limits the possibilities: months run from 01 to 12, and a day cannot be 47.'},
     {title:'Memory hooks:',text:'Connect new information to established old knowledge. If you know these events and their dates, they give the digits something familiar to connect to. If not, grouping and date structure can still help.'}
   ]},controls:['Show the connection','Replay connection','Continue']},
 {id:old[4].id,title:'How memory works',stage:'Learn',copy:{paragraphs:[
   'We’ll use all three principles, starting with memory hooks: connecting new information to established old knowledge. First, we’ll build on things you know from English. Later, we’ll connect new Hebrew concepts to Hebrew you’ve already learned.'
 ]},inlineOptional:{
   historicalPageId:old[5].id,label:'Try the comparison (optional)',collapsedByDefault:true,
   copy:{paragraphs:[
     'Think of the two dates and type what you remember, without looking back. Then compare your attempts and notice what helped.'
   ]},prompt:'With the two dates in mind, what do you remember?',
   activity:get(old[5].id).activity,
   controls:['Show the comparison','Skip'],
   resultLabels:['Original number','The two dates','Your first attempt','Your later attempt'],
   partialComparisonLabel:'Compare the digit groups:',
   differingGroupAccessibleLabel:'Different digit group',
   emptyGroupLabel:'(empty)'
 },controls:['Continue']},
 {id:old[6].id,title:'Continue',stage:'Continue',copy:{paragraphs:[
   'Next, we’ll use familiar concepts from English to learn your first four Hebrew letters. See you in the next lesson!'
 ]},controls:['Next lesson']}
];

const treatments=[
 {id:1,label:'Improve',scope:'Copy + formatting',resolution:'Welcome uses an actual ordered list of the three source experience vectors. No new credentials or biographical claims.'},
 {id:2,label:'Improve',scope:'Engineering',resolution:'No Answers saved. text on reading-only navigation. One clear Continue action must work without an answer/mastery requirement in MEMORY; actual save failures still need actionable feedback. This pack does not fix save/navigation code.'},
 {id:3,label:'Improve',scope:'UX + engineering',resolution:'Replace Lesson help & comments with Extra information only when authored supplementary content exists. Open that content on request; comments stay below the lesson. MEMORY has no supplementary network paragraph, so no empty control and no new theory.'},
 {id:4,label:'Improve',scope:'Copy',resolution:'Shorten welcome, Adam account, explanations and transition; reuse Welcome to Hebleo for pages 1–2 and How memory works for pages 4–5. Preserve the 500/70-hour personal account, emphasis and supplied over-seven-times comparison. All rewritten wording is an editorial adaptation for integration.'},
 {id:5,label:'Reconsider',scope:'UX + engineering; prior content requirement superseded',resolution:'Remove Hear the digits once from default visible controls. Do not require a new audio asset or speech-synthesis feature. Preserve a usable nonvisual route and Show me how; UX must settle and verify accessibility without leaking answers. No audio search.'},
 {id:6,label:'Improve',scope:'UX + engineering',resolution:'Add a visible timer bar for the original 10,000 ms display with accessible Time remaining label. Preserve learner initiation, expiry before recall, interruption handling and skip.'},
 {id:7,label:'Improve',scope:'Engineering',resolution:'Prevent ordinary selection, copy/cut and dragging of the timed number while visible. Scope this to the stimulus, preserving recall-field editing/paste and accessibility. This is an interaction requirement, not a claim that screenshots or all extraction are preventable.'},
 {id:8,label:'Improve',scope:'UX + engineering',resolution:'Keep the sixteen digits in fixed ordered positions while separators/groups are introduced; reserve final layout space. Event labels follow transformation. Preserve reduced-motion/nonvisual equivalents and explanatory replay. Verify actual motion; no UX acceptance claimed here.'},
 {id:9,label:'Improve',scope:'Copy + rendering',resolution:'Remove visible final annotation Slashes show the month, day and year within each group. Keep a single American month–day–year explanation with the two named events. Empty final description means render no paragraph; present the same meaning accessibly without duplicating it visually.'},
 {id:10,label:'Improve',scope:'UX-owned interaction; copy supplied',resolution:'Keep three short, separately named principles. Retire the repeated generic Show the next idea control in the proposed integration; UX chooses a simpler reveal consistent with deliberate, readable pacing. Do not add timed automatic advance or require more clicks as an unapproved teaching decision. Final interaction reconciled by Leo.'},
 {id:11,label:'Improve',scope:'Copy; explicit interpretation',resolution:'Name the third principle Memory hooks, then explain connecting new information to established old knowledge. Interpret Guy’s all information as old information, consistent with his source wording. Preserve the event-familiarity caveat and English-to-known-Hebrew progression.'},
 {id:12,label:'Reconsider',scope:'Assessment removal recommendation',resolution:'Remove MEMORY-A2.embedded.what-changed and its question, options, answer, feedback and quiz lead-in from the active lesson. Keep its full original object in baseline/history. Adds no replacement quiz. Removes the explicit scored/answered comprehension observation; the demonstration and optional comparison remain, with no mastery claim. Recommendation follows Guy’s concern; Leo reconciles it with UX before integration.'},
 {id:13,label:'Improve',scope:'Sequence + state integration',resolution:'Move MEMORY-A2.embedded.number-return inside page MEMORY-A2.learn.meaning as collapsed, optional content. Retire MEMORY-A2.learn.return from active order, preserving its historical identity and responses. Continue works without opening, attempting or viewing the comparison; Skip remains after opening. No extra compulsory page.'},
 {id:14,label:'Improve',scope:'Studio / engineering handoff',resolution:'Author/admin can edit source blocks in the same rendered lesson layout and leave anchored comments assistants can read. Preserve stable block/page/activity IDs and draft/revision history; enforce author permissions. No learner comment controls are moved into empty help. This content pack implements no inline editing.'}
];

const revision={
 deliveryKind:'Editorial integration specification; NOT an importable runtime lesson pack',
 status:'Ready for Leo to reconcile with UX; not installed, published or written to the authoring master',
 date:'2026-10-31',lessonId:baseline.id,componentId:baseline.blocks[0].id,
 authorship:'Guy-authored source with proposed concise editorial adaptations by Curriculum. New wording is not a quotation or a claim of final acceptance.',
 baseline:{contentPackPath:packPath,contentPackSha256:sha(packBytes),sourcePath,sourceSha256:sha(sourceBytes),sourceRevision:baseline.provenance.sourceRevision,reportedInstalledRevision:5,reportedCode:'73e242e717c630976fd2d040396d4d8d5fcd3127',liveRechecked:false},
 feedbackSource:{path:feedbackPath,sha256:sha(feedbackBytes)},
 order:pages.map(p=>p.id),pages,
 retiredActivityIds:['MEMORY-A2.embedded.what-changed'],
 retiredTopLevelPageIds:['MEMORY-A2.learn.return'],
 movedActivity:{id:'MEMORY-A2.embedded.number-return',fromPageId:'MEMORY-A2.learn.return',toPageId:'MEMORY-A2.learn.meaning',placement:'inline optional section'},
 feedbackTreatments:treatments,
 vocabulary:[],
 teachingDecisionBoundary:{
  preserve:['Human account is supplied, not independently validated.','Original number, ten seconds, date/event associations, three distinct principles.','Knowledge-familiarity caveat; English then established Hebrew.','One ungraded first attempt or skip; optional later comparison; no retry/mastery threshold.','No associative-network paragraph; no added theory or vocabulary.'],
  explicitScopeChanges:['Recommend removing the application assessment (#12), with loss of its explicit comprehension observation.','Move optional comparison off the obligatory page path (#13).','Replace the previous exact prose/headings and generic reveal-button requirement in accordance with current feedback; UX interaction remains to be reconciled.'],
  newTeachingClaims:[],
  noNewGuyDecisionRequiredForThisEditorialHandoff:true
 }
};
// These fields intentionally describe an editorial plan rather than silently extending activityVersion:1.
delete revision.pages[3].activity.after;
mkdirSync(resolve(out,'baseline'),{recursive:true});
const write=(name,text)=>writeFileSync(resolve(out,name),text,'utf8');
const json=(name,obj)=>write(name,JSON.stringify(obj,null,2)+'\n');
write('baseline/MEMORY-A2-source.md',sourceBytes);
json('baseline/MEMORY-A2-runtime.json',baseline);
write('baseline/FIRST2_FEEDBACK_20261031.json',feedbackBytes);
json('REVISION.json',revision);

const renderCopy=copy=>[
 ...(copy.paragraphs||[]),
 ...(copy.numberedList||[]).map((s,i)=>`${i+1}. ${s}`)
].join('\n\n');
let learner='# MEMORY-A2 — proposed concise learner copy\n\nEditorial adaptation for integration. Labels in brackets describe placement and are not learner text. Original source/history is preserved in baseline/.\n';
for(const [i,p] of pages.entries()){
 learner+=`\n## Page ${i+1}: ${p.title}\n\n[Stable page: ${p.id}]\n\n${renderCopy(p.copy)}\n`;
 if(p.emphasis)learner+=`\n[Retain bold emphasis on: ${p.emphasis.join(', ')}.]\n`;
 if(p.activity?.kind==='memory-first')learner+=`\n[Play: ${value}; ten seconds, then hide before input. Show a timer bar. Show me how stays available.]\n\n${p.prompt}\n\n[After an exact response]\n\n${p.activity.feedback.exact}\n\n[After a partial or empty submitted response]\n\n${p.activity.feedback.partial}\n`;
 if(p.activity?.kind==='date-connection'){
  learner+='\n[Number transformation; reveal dates/events only after first attempt or skip]\n\n'+p.activity.stages.map(s=>'`'+s+'`').join(' → ')+'\n\n'+p.activity.dateContext.introduction+'\n\n'+p.activity.dateContext.events.map(s=>'- '+s).join('\n')+'\n\n'+p.activity.dateContext.transition+'\n\n';
  learner+=p.activity.principles.map((q,i)=>`${i+1}. **${q.title}** ${q.text}`).join('\n\n')+'\n';
 }
 if(p.inlineOptional){const a=p.inlineOptional;learner+=`\n[Collapsed optional section on THIS page; ordinary Continue remains available]\n\n**${a.label}**\n\n[Only after opening]\n\n${renderCopy(a.copy)}\n\n${a.prompt}\n\n[Actions: ${a.controls.join(' / ')}. Result shows original number/dates and only attempts actually made.]\n\n[Conditional comparison feedback, unchanged from source]\n\n`+Object.entries(a.activity.feedback).map(([k,v])=>`- ${k}: “${v}”`).join('\n')+'\n';}
 learner+='\n[Page actions: '+(Array.isArray(p.controls)?p.controls.join(' / '):'Play / Show me how / Continue as applicable')+']\n';
}
write('LEARNER_COPY.md',learner);

const changes=old.map(before=>{
 const after=pages.find(p=>p.id===before.id);
 return {pageId:before.id,before,after:after||null,disposition:after?(before.id===old[4].id?'Keep page; remove quiz; insert optional section': 'Keep identity; revise copy/presentation'):'Retire from top-level order; move intact activity into preceding page',movedTo:after?null:old[4].id};
});
json('BEFORE_AFTER.json',{note:'Exact complete objects, including deleted question/options/feedback. after uses the editorial specification format, not runtime schema.',pages:changes,rendererCopy:[
 {before:'Adam',after:'Welcome to Hebleo',reason:4},
 {before:'Slashes show the month, day and year within each group.',after:null,reason:9},
 {before:'Hear the digits once',after:null,reason:5},
 {before:'Show the next idea',after:null,reason:10,replacement:'UX reconciliation; three principle copy blocks supplied'},
 {before:'Lesson help & comments',after:'Extra information',reason:3,condition:'Only for actual authored supplementary content; none in MEMORY'},
 {before:'Answers saved.',after:null,reason:2,condition:'No persistent confirmation on reading/cursor-only saves; retain meaningful failure handling'}
]});

const plain=html=>html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
let diff='# Exact before / after text\n\nBefore is the inspected source pack matching the previously installed revision-5 pack hash. After is an editorial integration specification; it has not been installed or written into the authoring master. Complete exact fields, including the removed quiz, are in BEFORE_AFTER.json.\n';
for(const c of changes){diff+=`\n## ${c.pageId}\n\n${c.disposition}.\n\nBefore heading: ${c.before.title}\n\nBefore body:\n\n> ${plain(c.before.html||'')}\n\nAfter heading: ${c.after?.title||'(no separate page)'}\n\nAfter body:\n\n${c.after?renderCopy(c.after.copy):'Moved as the collapsed optional section of MEMORY-A2.learn.meaning. Exact prompt and feedback are in LEARNER_COPY.md.'}\n`;
 if(c.before.activity?.principles){diff+='\nBefore date explanation:\n\n> '+plain(c.before.activity.after)+'\n\nAfter date explanation:\n\n'+c.after.activity.dateContext.introduction+'\n\n'+c.after.activity.dateContext.events.join('\n\n')+'\n\n'+c.after.activity.dateContext.transition+'\n';for(let i=0;i<3;i++)diff+=`\nBefore: **${c.before.activity.principles[i].title}** ${c.before.activity.principles[i].text}\n\nAfter: **${c.after.activity.principles[i].title}** ${c.after.activity.principles[i].text}\n`;}
 if(c.before.prompt)diff+=`\nBefore prompt: ${c.before.prompt}\n\nAfter prompt: ${c.before.activity?.kind==='application-choice'?'(removed; no replacement quiz)':c.after?.prompt||'(relocated; see optional section)'}\n`;
 if(c.before.activity?.kind==='application-choice')diff+='\nThe original quiz prompt above, all three options, answer B and all feedback are removed, not replaced by the optional-comparison prompt. The comparison retains its separate existing activity identity. See baseline/MEMORY-A2-runtime.json for the full removed object.\n';
}
write('BEFORE_AFTER.md',diff);

const words=s=>(s.match(/\S+/g)||[]).length;
const concision={beforeWelcomeAndAdamWords:words(plain(old[0].html)+' '+plain(old[1].html)),afterWelcomeAndAdamWords:words(renderCopy(pages[0].copy)+' '+renderCopy(pages[1].copy)),countScope:'Body text only, excluding headings and controls; whitespace token count.'};

const integration=`# MEMORY revision — integration handoff, 31 October 2026

Ready for Leo’s copy/UX reconciliation. This is a source-faithful editorial proposal with exact wording and complete before/after objects. No authoring-master edit, software implementation, installation or publication occurred.

## Preserve

The inspected Lead checkout’s content/first2/lessons.json hashes to ${sha(packBytes)}, matching the supplied installed revision-5 source identity. This verifies the local pack, not a fresh live-server readback. The live Google Doc was not read or edited. baseline/ preserves the complete MEMORY runtime lesson, the earlier source text, and Guy’s fourteen feedback items; none includes learner responses. Keep those originals and all deployed content revisions.

Preserve Guy’s personal, conversational voice; three experience vectors; M.Sc.; Adam’s similar scientific background and initial lack of Hebrew; the supplied 500/70-hour and over-seven-times account, with 70 hours bold. These are attributed author content, not newly verified scientific or marketing claims. Preserve exactly ${value}, 10,000 ms, original digit order, date associations, all three distinct principles and the familiarity caveat. There is no new theory, vocabulary, audio or success story.

## Improve

The welcome and Adam bodies shorten from ${concision.beforeWelcomeAndAdamWords} to ${concision.afterWelcomeAndAdamWords} whitespace-delimited words. Use actual numbered-list markup. Reuse Welcome to Hebleo across pages 1–2 and How memory works across pages 4–5; internal IDs remain unchanged. One date-format explanation replaces the duplicated annotation/prose. The English-to-familiar-Hebrew progression remains explicit. Control mechanics, IDs and author notes stay out of learner prose.

## Reconsider — explicit scope changes

- Recommend removing the page-5 application question. This removes an explicit comprehension observation, including its answer and option feedback. It does not establish mastery and adds no substitute quiz. Guy questioned its value and described it as demoralizing; this recommendation is explicit, not an assertion that he approved exact replacement copy.
- Fold the existing optional comparison into page 5; remove its separate obligatory page stop. The comparison itself, its ID and all six feedback variants are preserved. Opening it, responding and viewing results must all remain optional.
- The previous requirement for the exact generic Show the next idea interaction is superseded by current feedback. UX owns the simpler interaction, reveal and motion; these copy blocks do not select an accepted widget or authorize timed automatic progression.
- Remove the long claims about most people recalling half the digits or remembering in a month. This is a concision cut of the source’s generalization, with no replacement statistic or contrary scientific claim.

“Established old knowledge” interprets Guy’s “established all information” in #11 using the prior source’s explicit “established old information.” No open teaching decision is hidden in that correction. No new decision from Guy is required to deliver this bounded handoff; Leo still reconciles copy and UX before the coherent update.

## Page/activity mapping

| New page | Stable page ID | Disposition |
|---|---|---|
| 1 | MEMORY-A2.learn.try-first | Short welcome; three numbered experience vectors |
| 2 | MEMORY-A2.learn.adam-study | Short personal account; heading Welcome to Hebleo |
| 3 | MEMORY-A2.learn.number-round | Keep MEMORY-A2.embedded.number-first; same ungraded attempt or skip |
| 4 | MEMORY-A2.learn.connection | Keep MEMORY-NUMBER-TO-DATES and all three principles; exact shortened copy |
| 5 | MEMORY-A2.learn.meaning | Reading explanation; no choice question; optional MEMORY-A2.embedded.number-return inside this page |
| 6 | MEMORY-A2.continue | Short transition to first four letters; normal completion/next lesson |

Retire MEMORY-A2.learn.return only from active top-level order; retain its identity in history and mapping. Retire MEMORY-A2.embedded.what-changed only from active delivery; retain the full question/options/answer/feedback in baseline and deployed revision history. Do not recycle either ID for new content. The path has six top-level pages instead of seven.

## Runtime and preservation notes for Lead

REVISION.json is an editorial format, not a runtime activityVersion:1 import. It intentionally represents optional placement separately. Do not import its new fields without adaptation/validation. The existing renderer supports one activity per page: a practical mapping is page 5 as reading with the existing memory-comparison activity ID/kind, explanation visible before the collapsed comparison, and optional instructions visible only after opening. This requires deliberate renderer/copy mapping, not a silent new nested-activity schema. Preserve source-block identity MEMORY-A2-interactive and all unrelated MNTL content.

Existing progress is keyed by page ID. Moving the comparison from learn.return to learn.meaning means the old learn.meaning choice response MUST NOT become a comparison response. Use the new content revision and an explicit identity-aware migration: retain historical quiz responses; map only matching comparison responses from the former page to the retained comparison activity; preserve raw text and whether an attempt really occurred. A saved cursor at the retired page can resolve to the new containing page. Completed-lesson state and unrelated records remain intact. Verify migration or an explicitly approved versioned-state strategy before release. The normal fresh-fictional-progress startup policy does not justify deleting historical content, settings or other learner records.

Normal Continue must work without opening the optional section, and after open, skip, empty/partial/exact comparison, save/reload and interrupted timed-display paths. Never require a correct number, a repeat attempt, all three principle controls or optional disclosure completion as a mastery condition. Keep deliberate presentation and accessible alternatives; this pack does not settle UX’s sequencing. The timer runs only after Play; input follows hiding the digits. Do not leak dates or models during the first attempt. Hide comparison models until Show the comparison; render only responses actually made. Keep existing combined reverse/zero/day-month classification and no-guessing behavior, along with all unchanged feedback.

No associative-network paragraph is reintroduced. Consequently MEMORY has no Extra information affordance; other lessons may show it only for real authored supplements. Ordinary lesson comments remain separate. #14 requires author-only inline editing and anchored comments integrated with existing drafts/revisions and server-side authorization; this pack does not implement it.

## All fourteen feedback items

| Guy’s item | Label | Scope | Treatment |
|---|---|---|---|
${treatments.map(t=>'| '+t.id+' | '+t.label+' | '+t.scope+' | '+t.resolution+' |').join('\n')}

## Evidence and limits

Executed: node docs/curriculum/memory-feedback-20261031/prepare.mjs — nineteen structural/source-preservation checks PASS. See VALIDATION.json. The generated copy and exact before/after objects were read back. The baseline hash, digit order, duration, two activity IDs, unchanged comparison/initial feedback, all fourteen feedback mappings and original files’ no-mutation hashes were checked. These checks validate this editorial artifact, not app behavior.

No runtime/build/UI/accessibility test, schema import, state migration, CI, installation, live master readback, WordPress operation or Guy acceptance is claimed. No audio search or repeated six-comment/119-heading audit. No related automation exists for this task. Next owner: Leo reconciles this copy with UX Owner’s interaction design; Lead adapts and tests that coherent revision in the current implementation checkout before any installation.
`;
write('INTEGRATION.md',integration);

const required={
 baselinePackMatchesPreviouslyInstalledHash:sha(packBytes)==='1b9df3021485e37c5c01af7a0eb573a482ba7329c797dc1dad55aaa2e9fb9e3a',
 allFourteenFeedbackItemsMapped:treatments.length===14&&treatments.every((t,i)=>t.id===i+1),
 sixUniqueTopLevelPageIds:pages.length===6&&new Set(revision.order).size===6,
 optionalPageRemovedFromTopLevelOrder:!revision.order.includes('MEMORY-A2.learn.return'),
 originalComparisonActivityIdRetained:pages[4].inlineOptional.activity.id==='MEMORY-A2.embedded.number-return',
 comparisonFeedbackUnchanged:JSON.stringify(pages[4].inlineOptional.activity.feedback)===JSON.stringify(old[5].activity.feedback),
 initialAttemptFeedbackUnchanged:JSON.stringify(pages[2].activity.feedback)===JSON.stringify(old[2].activity.feedback),
 initialStringAndDurationExact:pages[2].activity.value===value&&pages[2].activity.durationMs===10000,
 allAnimationStagesPreserveExactDigits:pages[3].activity.stages.every(s=>s.replace(/\D/g,'')===value),
 thirdPrincipleNamed:pages[3].activity.principles[2].title==='Memory hooks:',
 thirdPrincipleExplainsEstablishedKnowledge:pages[3].activity.principles[2].text.startsWith('Connect new information to established old knowledge.'),
 sourceHistoryIncludesCompleteRemovedQuiz:old[4].activity.id==='MEMORY-A2.embedded.what-changed'&&old[4].options.length===3,
 noNewQuizInActiveCopy:!pages.some(p=>p.options||p.activity?.kind==='application-choice'),
 personalAccountPreserved:pages[1].copy.paragraphs.join(' ').includes('500 hours')&&pages[1].copy.paragraphs.join(' ').includes('70 hours')&&pages[1].copy.paragraphs.join(' ').includes('over seven times faster')&&pages[1].emphasis.includes('70 hours'),
 threeExperienceVectorsNumbered:pages[0].copy.numberedList.length===3,
 noNetworkParagraphReintroduced:!JSON.stringify(pages).toLowerCase().includes('associative network'),
 oldSourceFileUnchanged:sha(readFileSync(sourcePath))===sha(sourceBytes),
 leadContentPackUnchanged:sha(readFileSync(packPath))===sha(packBytes),
 feedbackFileUnchanged:sha(readFileSync(feedbackPath))===sha(feedbackBytes)
};
for(const [name,pass] of Object.entries(required))assert.ok(pass,name);
json('VALIDATION.json',{status:'PASS',checks:required,concision,notVerified:['Rendered UI, actual timer/animation/copy prevention/navigation and accessibility','Authoring master current live state (not read or changed)','Runtime schema adaptation, state migration, install, CI and Guy acceptance']});
console.log(JSON.stringify({output:out,checks:Object.keys(required).length,status:'PASS',concision},null,2));
