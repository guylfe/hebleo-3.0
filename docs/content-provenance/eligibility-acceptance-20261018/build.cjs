// Read-only source extraction. This creates test artifacts, never runtime content.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const out = __dirname;
const source = path.resolve(out, '../lexeme-consolidation-20261018');
const ux = 'C:/Users/Trans/.openmausbot/task-workspaces/33456e11-6fe6-4081-9ac2-a1a240770492/e4e8f393-022c-4035-933e-19a74771a234';
const schemaFile = path.join(ux, 'vocabulary-source-structure-20261017/VOCABULARY_STRUCTURE_SCHEMA.json');
const planFile = path.join(ux, 'vocabulary-lexeme-rebuild-20261018/CONSOLIDATED_WORKBOOK_PLAN.json');
const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const hash = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const groups = read(path.join(source, 'LEXEME_GROUPS.json'));
const supplied = read(path.join(source, 'SUPPLIED_BINDINGS.json'));
const snapshot = read(path.join(source, 'SOURCE_SNAPSHOT.json'));
const drafts = read(path.join(source, 'LINGUISTIC_DRAFT_ADDITIONS.json')).additions;
const schema = read(schemaFile);
const plan = read(planFile);
const key = (cat, n) => `provisional:lexeme:${cat}:${n}`;
const words = {
  say: key('verb', '000273'), write: key('verb', '000330'), be: key('verb', '000029'),
  low: key('adjective', '000148'), to: key('preposition', '000121'),
  heldDead: key('adjective', '000132'), heldLocated: key('adjective', '000317')
};
const oldVerb = groups.slotDefinitions;
const verb = schema.lessonSettings.slotIds.filter(s => s.startsWith('verb.'));
const adj = schema.lessonSettings.slotIds.filter(s => s.startsWith('adjective.'));
const prep = schema.lessonSettings.slotIds.filter(s => s.startsWith('preposition.'));
const oldPrep = ['preposition.1s','preposition.2ms','preposition.2fs','preposition.3ms','preposition.3fs','preposition.1p','preposition.2mp','preposition.2fp','preposition.3mp','preposition.3fp'];
const slotMap = [...oldVerb.map((s,i) => ({inventorySlot:s, semanticSlot:verb[i]})),
  ...adj.map(s => ({inventorySlot:s,semanticSlot:s})),
  ...oldPrep.map((s,i) => ({inventorySlot:s,semanticSlot:prep[i]}))];
const semantic = s => slotMap.find(m => m.inventorySlot === s)?.semanticSlot ?? null;
const col = n => { let s=''; for(n++;n;n=Math.floor((n-1)/26)) s=String.fromCharCode(65+(n-1)%26)+s; return s; };
const selected = groups.groups.filter(g => Object.values(words).includes(g.groupKey));
const bindings = [...supplied.bindings, ...supplied.documentBindings].filter(b => Object.values(words).includes(b.groupKey)).map(b => ({
  ...b, semanticSlot:semantic(b.slot),
  exactSourceLocator:b.provenanceTier === 'exact-supplied-record'
    ? `Masterfile!${col(snapshot.headers.indexOf(b.sourceField))}${b.sourceRow}`
    : `${b.sourceDocument} :: ${b.sourceField}`,
  actualEligibility:'not-established-by-source-presence'
}));
const chosen = g => bindings.filter(b => b.groupKey===g);
const reviewedBindings = g => chosen(g).map(b => b.bindingId);
const fixtureWords = selected.map(g => {
  const table=plan.tables.find(t=>t.name===({verb:'Verbs',adjective:'Adjectives',preposition:'Prepositions'})[g.category]);
  const tableDef=schema.tables.find(t=>t.name===table.name);
  const row=table.rows.findIndex(r=>r[0]?.userEnteredValue?.stringValue===g.groupKey);
  return {
    wordKey:g.groupKey,category:g.category,sourceIds:g.sourceIds,
    actualApprovalStatus:g.approvalStatus,actualIdentityStatus:g.identityStatus,
    activeInSuppliedWorkbook:row>=0, workbookRow:row<0?null:row+2, workbookTable:table.name,
    sourceIssueIds:g.issueIds,
    slots:g.paradigm.map(p => ({...p,semanticSlot:semantic(p.slot),
      workbookCell:row<0 || !semantic(p.slot)?null:`${table.name}!${col(tableDef.formColumnStart + (g.category==='verb'?verb:g.category==='adjective'?adj:prep).indexOf(semantic(p.slot)))}${row+2}`})),
    candidateBindingIds:chosen(g.groupKey).map(b=>b.bindingId),
    citationSlots:g.category==='verb'?['verb.past.he','verb.present.Singular M']:[],
    draftEvidence:drafts.filter(d=>d.groupKey===g.groupKey)
  };
});
const C='TEST-ONLY:course-A', D='TEST-ONLY:course-B';
const lessons=['TEST-ONLY:L-z','TEST-ONLY:L-a','TEST-ONLY:L-m','TEST-ONLY:L-b'];
const context=(lesson=lessons[0],course=C)=>({courseId:course,lessonId:lesson});
const intro=(w,l=lessons[0],course=C,action='introduce')=>({wordKey:w,lessonId:l,courseId:course,action,review:'TEST-ONLY-APPROVED'});
const unlock=(slots,scope={type:'word',wordKey:words.say},l=lessons[0],course=C)=>({courseId:course,lessonId:l,review:'TEST-ONLY-APPROVED',scope,addSlots:slots});
const wordScope=w=>({type:'word',wordKey:w});
const base=(w)=>({context:context(),wordKey:w,wordLinks:[intro(w)],slotIntroductions:[],
  simulatedReview:{identity:'TEST-ONLY-RESOLVED',bindingIds:reviewedBindings(w)}});
const cases=[];
const add=(id,inputs,expected,note)=>cases.push({id,inputs,expected,note});
const sayPast=['verb.past.I','verb.past.he','verb.past.she','verb.past.they'];
const sayPresent=['verb.present.Singular M','verb.present.Singular F'];
const sayCitation={slots:['verb.past.he','verb.present.Singular M'],bindingIds:['binding-00110','binding-00114'],separator:' - ',independentOfExpandedUnlock:true};
add('V00-citation-with-no-expanded-unlocks',base(words.say),{visibleSlots:[],citation:sayCitation},'Citation is still subject to word availability, identity, reviewed binding and source availability. It bypasses only the expanded-slot unlock mask.');
add('V01-early-one-slot',{...base(words.say),slotIntroductions:[unlock(['verb.past.he'])]},
  {visibleSlots:['verb.past.he'],sourcePresentButLocked:['verb.past.she','verb.present.Singular M'],citation:sayCitation});
add('V02-partial-past-present',{...base(words.say),slotIntroductions:[unlock([...sayPast,...sayPresent])]},
  {visibleSlots:[...sayPast,...sayPresent],sharedCells:[{semanticSlot:'verb.past.they',bindingId:'binding-00112',spanGenders:['masculine','feminine'],cellCount:1}],citation:sayCitation});
add('V03-all-28-unlocked-source-remains-incomplete',{...base(words.say),slotIntroductions:[unlock(verb)]},
  {unlockedSlotCount:28,visibleSlots:[...sayPast,...sayPresent],unapprovedSlotCount:20,missingSlots:['verb.future.אתן','verb.imperative.אתן'],citation:sayCitation},'All 28 unlocked is not 28 supplied or eligible forms. No fully approved 28-form source paradigm is claimed.');
const write24=verb.slice(0,24);
add('V04-full-tense-layers-secondary-evidence',{...base(words.write),slotIntroductions:[unlock(verb,wordScope(words.write))]},
  {unlockedSlotCount:28,visibleSlots:write24,unapprovedSlots:verb.slice(24,27),missingSlots:[verb[27]],preserveAllCandidateVariants:true},'24 supplied/secondary-evidence slots in a hypothetical reviewed test context; original documents were not reopened. Three imperative drafts stay ineligible.');
add('V05-secondary-evidence-without-review',{...base(words.write),simulatedReview:{identity:'TEST-ONLY-RESOLVED',bindingIds:[]},slotIntroductions:[unlock(verb,wordScope(words.write))]},
  {visibleSlots:[],citationPlaceholders:['unresolved','unresolved']},'Source traceability is not approval, including secondary document evidence.');
add('V06-missing-and-inapplicable',{...base(words.be),slotIntroductions:[unlock(verb,wordScope(words.be))]},
  {visibleSlots:['verb.infinitive','verb.past.he'],introducedButSourceMissing:['verb.gerund'],inapplicableSlots:verb.slice(11,15),citation:{pastBindingIds:['binding-00012','binding-00013','binding-00014'],presentState:'inapplicable',keepPairPosition:true,noSubstitution:true}});
add('V07-missing-citation-test-mutation',{...base(words.say),testOnlyRemoveBindings:['binding-00114']},
  {visibleSlots:[],citation:{pastBindingIds:['binding-00110'],presentState:'missing-source',keepPairPosition:true,noSubstitution:true}},'Deletes one binding only inside a disposable fixture; never changes workbook/source.');
add('V08-unapproved-draft-never-eligible',{...base(words.say),slotIntroductions:[unlock(['verb.infinitive'])]},
  {visibleSlots:[],unapprovedSlots:['verb.infinitive'],draftId:'linguistic-draft-00369',mustNotUseAsAnswerKey:true});
add('V09-equal-future-strings-do-not-share-gate',{...base(words.write),slotIntroductions:[unlock(['verb.future.אתם'],wordScope(words.write))]},
  {visibleSlots:['verb.future.אתם'],sourcePresentButLocked:['verb.future.אתן'],distinctSemanticSlotsDespiteEqualStrings:['document-binding-0022','document-binding-0023']},'The secondary export has equal strings here. This does not approve the register or combine slots; review is simulated only.');
for(const [id,slots] of [['A01-early',adj.slice(0,1)],['A02-partial',adj.slice(0,2)],['A03-full',adj]])
  add(id,{...base(words.low),slotIntroductions:[unlock(slots,wordScope(words.low))]}, {visibleSlots:slots,lexicalRows:1});
for(const [id,slots] of [['P01-early',prep.slice(0,1)],['P02-seven',prep.slice(0,7)],['P03-ten',prep]])
  add(id,{...base(words.to),slotIntroductions:[unlock(slots,wordScope(words.to))]},
    {visibleSlots:slots,layout:slots.length===10?'horizontal-if-fit; compact-vertical-permitted-only-for-ten':'horizontal',localScrollIfNeeded:true,lexicalRows:1},
    'Test-only review includes explicit mapping approval for proposed source gender assignments. No canonical review is asserted. The seven-slot subset is a test input, not a course milestone.');
add('P04-ten-with-unreviewed-gender-mappings',{...base(words.to),simulatedReview:{identity:'TEST-ONLY-RESOLVED',bindingIds:chosen(words.to).filter(b=>b.mappingStatus==='source-labeled-slot').map(b=>b.bindingId)},slotIntroductions:[unlock(prep,wordScope(words.to))]},
  {visibleSlots:prep.slice(0,8),unresolvedSlots:prep.slice(8),unresolvedBindingIds:['binding-00936','binding-00937']},'Original הם/הן columns are reversed relative to proposed slots. Neither original column nor inferred correction proves approval.');
for(const w of [words.heldDead,words.heldLocated])
  add('H-'+w.split(':').pop(),{...base(w),simulatedReview:{identity:'held',bindingIds:reviewedBindings(w)},slotIntroductions:[unlock(adj,wordScope(w))]},
    {visibleSlots:[],lexicalRows:0,state:'held-identity',noDuplicateReviewIdentity:true});
add('S01-one-word-no-leak',{...base(words.say),wordLinks:[intro(words.say),intro(words.write)],slotIntroductions:[unlock(['verb.past.he'])],alsoInspectWord:words.write},
  {visibleSlots:['verb.past.he'],otherWordVisibleSlots:[]});
cases.at(-1).inputs.simulatedReviewByWord = Object.fromEntries([words.say,words.write].map(w=>[w,base(w).simulatedReview]));
add('S02-global-with-category-boundary',{...base(words.say),wordLinks:[intro(words.say),intro(words.write),intro(words.low)],slotIntroductions:[unlock(['verb.past.he'],{type:'all-relevant-words',category:'verb'})]},
  {wordSlotVisibility:{[words.say]:['verb.past.he'],[words.write]:['verb.past.he'],[words.low]:[]},requiresEachOtherWordOwnEligibleBinding:true});
cases.at(-1).inputs.simulatedReviewByWord = Object.fromEntries([words.say,words.write,words.low].map(w=>[w,base(w).simulatedReview]));
const cls='TEST-ONLY:reviewed-class-A';
add('S03-reviewed-class-excludes-same-pattern-outsider',{...base(words.say),testOnlyReviewedClasses:[{classId:cls,category:'verb',memberWordKeys:[words.say]}],slotIntroductions:[unlock(['verb.past.he'],{type:'reviewed-class',classId:cls,category:'verb'})],wordLinks:[intro(words.say),intro(words.write)]},
  {visibleSlots:['verb.past.he'],otherWordVisibleSlots:[],rootPatternMustNotInferMembership:true});
cases.at(-1).inputs.simulatedReviewByWord = Object.fromEntries([words.say,words.write].map(w=>[w,base(w).simulatedReview]));
add('S04-unknown-class-rejected',{...base(words.say),slotIntroductions:[unlock(['verb.past.he'],{type:'reviewed-class',classId:'TEST-ONLY:unknown-class',category:'verb'})]},
  {validation:'reject-unreviewed-or-unknown-class',visibleSlots:[]});
add('S05-cross-category-scope-rejected',{...base(words.low),slotIntroductions:[unlock(['verb.past.he'],wordScope(words.low))]},
  {validation:'reject-slot-category-vs-target-mismatch',visibleSlots:[]});
add('S06-global-does-not-introduce-word',{...base(words.say),wordLinks:[],slotIntroductions:[unlock(verb,{type:'all-relevant-words',category:'verb'})]},
  {visibleSlots:[],citationVisible:false,state:'word-not-introduced'});
add('S07-unreviewed-setting-not-effective',{...base(words.say),slotIntroductions:[{...unlock(['verb.past.he']),review:'pending'}]},
  {visibleSlots:[]});
add('T01-additive-reuse-no-revocation',{...base(words.say),context:context(lessons[1]),wordLinks:[intro(words.say),intro(words.say,lessons[1],C,'reuse')],slotIntroductions:[unlock(['verb.past.he']),unlock([],wordScope(words.say),lessons[1])]},
  {visibleSlots:['verb.past.he'],lexicalRows:1,reviewIdentities:1,newlyIntroducedSlots:[],inheritedSlots:['verb.past.he']});
add('T02-reuse-is-not-introduction',{...base(words.say),wordLinks:[intro(words.say,lessons[0],C,'reuse')],slotIntroductions:[unlock(['verb.past.he'])]},
  {visibleSlots:[],citationVisible:false,state:'word-not-introduced'});
add('T03-later-setting-no-earlier-leak',{...base(words.say),slotIntroductions:[unlock(['verb.past.he'],wordScope(words.say),lessons[1])]},
  {visibleSlots:[]});
add('T04-other-course-no-leak',{...base(words.say),context:context(lessons[0],D),wordLinks:[intro(words.say,lessons[0],D)],slotIntroductions:[unlock(['verb.past.he'])]},
  {visibleSlots:[]});
add('T05-reorder-recomputes-prefix',{...base(words.say),context:context(lessons[1]),testOnlyCourseOrder:[lessons[1],lessons[0],lessons[2],lessons[3]],wordLinks:[intro(words.say,lessons[1])],slotIntroductions:[unlock(['verb.past.he'])]},
  {visibleSlots:[]},'The event now follows the preview lesson; historical row order and lexical sorting cannot retain it.');
add('T06-legacy-links-never-imply-introduction',{...base(words.say),wordLinks:[],legacySourceIds:['mf-000273','mf-000274','mf-000275','mf-000276','mf-000277','mf-000278'],slotIntroductions:[unlock(['verb.past.he'])]},
  {visibleSlots:[],lexicalIdentityCount:1,legacyOccurrencesRetained:6});
add('T07-unknown-course-context-fails-explicitly',{...base(words.say),context:context('TEST-ONLY:unknown-lesson')},
  {visibleSlots:[],validation:'unknown-lesson-context',noNumericOrSpreadsheetFallback:true});
add('T08-earlier-global-addition-later-word-introduction',{...base(words.say),context:context(lessons[1]),wordLinks:[intro(words.say,lessons[1])],slotIntroductions:[unlock(['verb.past.he'],{type:'all-relevant-words',category:'verb'})]},
  {visibleSlots:['verb.past.he'],inheritedSlots:['verb.past.he']},'Global slot additions persist in the course prefix; a later word still needs its own introduction and eligible source binding.');
const pack={
  version:'hebleo-eligibility-acceptance-fixture-v1',status:'TEST-ONLY; not publishable; not an importer contract',
  sourceApproval:false,syntheticContext:true,words,slotMap,
  instructions:'Bind each case to the integrated contract. Test-only approvals simulate a gate; they grant no real approval. Never ingest these overlays into published content.',
  sourceInputs:[schemaFile,planFile,...['LEXEME_GROUPS','SUPPLIED_BINDINGS','SOURCE_SNAPSHOT','LINGUISTIC_DRAFT_ADDITIONS'].map(n=>path.join(source,n+'.json'))].map(f=>({path:f,sha256:hash(f)})),
  contextCatalogue:{courses:[{courseId:C,lessonOrder:lessons},{courseId:D,lessonOrder:lessons}],lessonTitles:Object.fromEntries(lessons.map((l,i)=>[l,`Test-only context ${i+1}`])),canonicalLessonFeed:'unconnected; these are not course assignments'},
  bindings,fixtureWords,crossCategoryHolds:groups.crossCategoryIdentityQuestions,cases,
  manualAcceptance:[
    {id:'UI-seven-horizontal',caseId:'P02-seven',check:'At ordinary and narrow width, Compact and Full retain seven horizontal pronoun slots. Scroll locally when needed; Hebrew and English stay frozen, focus remains visible.'},
    {id:'UI-ten-horizontal-or-compact',caseId:'P03-ten',check:'Attempt ten horizontal at ordinary compact width; measure actual width. Only ten may use the compact vertical alternative. Keep both הם and הן headers.'},
    {id:'UI-shared-they',caseId:'V02-partial-past-present',check:'Past they is one shared cell spanning gender, not two independently gated phantom cells. Equal strings alone never imply shared metadata.'},
    {id:'UI-citation',caseId:'V00-citation-with-no-expanded-unlocks',check:'Past-he / present-ms heading remains visible with neutral hyphen. Expanded Forms contains no unlocked forms. Missing citation positions are not replaced.'},
    {id:'UI-forms-above-note',caseId:'V02-partial-past-present',check:'Expanded forms are above Note/Examples and visibly bordered to the word. Adjective eligible forms remain on the same row.'},
    {id:'Studio-roundtrip',check:'Save/reload/stage/preview/publish only in disposable local data; inherited versus new, scope and validation survive. Test restore/old-settings policy explicitly; never default to all unlocked.'},
    {id:'Titles',check:'A lesson rename updates the projected title; unknown IDs and unconnected feed stay explicit. Titles remain authored only in course data.'},
    {id:'Migration',check:'Adding source forms/lesson links/sorting creates no duplicate lexical row or review identity. Preview alias conflicts and preserve progress; do not merge schedules silently.'}
  ]
};
fs.writeFileSync(path.join(out,'FIXTURES.json'),JSON.stringify(pack,null,2)+'\n');
console.log(JSON.stringify({artifact:'FIXTURES.json',cases:cases.length,words:fixtureWords.length,bindings:bindings.length,semanticSlots:slotMap.length,sourceApproval:false}));
