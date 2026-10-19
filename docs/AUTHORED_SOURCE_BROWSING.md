# Authored vocabulary source browsing

Guy's “Do it” instruction is implemented as exact original Masterfile browsing, separately from curriculum eligibility. `#library` defaults to Source vocabulary when an adopted source exists. Category tables, source search, original Lesson filtering and 50-row paging use the existing lexical renderer. Learned vocabulary remains a separate collection. Each lesson vocabulary section links to the source library.

The Oct20 capture displays 791 grouped rows containing 1,055 original records: 418 Nouns, 59 Adjectives, 93 Verbs, 19 Prepositions, 202 Other. Grouping retains existing provisional lexical keys; it does not approve identity or introduce/reuse associations. Every contributing source ID, typed Lesson/Part and exact original field is accessible under Original source. Notes retain authored text, formatting and bracketed asides; examples embedded in notes remain intact. Consolidated assistant-written meanings and candidate extracted Usage/Examples are not promoted.

Only exact original Masterfile cells supply display text. Source-labelled bindings populate the source conjugation layout; uncertain semantic slots remain under original field labels in source details. All 397 proposed slot assignments, including reversed הם/הן bindings, remain unapproved. The 1,770 generated drafts, 50 secondary-document bindings and held identity records mf-000317 / mf-000132 are excluded. Empty mf-000647 is omitted. Source rows have no runtime review ID, lesson eligibility or Add to review action.

The original 49-lesson / 64-topic catalogue is namespaced wp-course / wp-lesson / wp-topic metadata, preserving stored arrays/order. It is not installed as implemented app lessons. The mapping ledger uses exact original numbered titles, exact decoded Hebrew/English pairs, and explicit original-form fingerprints within unchanged Lesson/Part groups. It never sorts decimal references or merges Parts. It records 1,048 source-record catalogue associations (including two held records); nine records in original 4.1.5 Part 3 retain unresolved original context. Their exact text remains browseable. New-course introduction actions and learned-form additions remain unset.

`src/source-vocabulary.js` builds/seals the source projection. `public/source-vocabulary.js` provides bounded safe paging/filtering. Ordinary Stage cannot add, replace or remove trusted adoption; restore rejects unknown adoption digests. Bootstrap and `/api/source-vocabulary` expose safe display pages without archived captures/approval data. `/api/lexical` retains its cumulative eligibility contract.

## Private preparation and application

Captures, full mapping ledger, backups and runtime receipts remain private outside Git. No Sheet writeback, WordPress edit, learner reset or production publication occurs.

After source freshness and task authorization are verified, run:

```
node scripts/prepare-source-browse.mjs --capture <capture.json> --native <native-master-cells.json> --catalogue <ORIGINAL_COURSE_CATALOGUE.json> --published <original-course-live.json> --output <private-output>
```

The sole main/data writer runs `scripts/adopt-source-browse.mjs` with an exact current database receipt, source file, new backup directory and output receipt. It refuses drift, takes a fresh consistent SQLite backup, appends one active revision and adds the same browse model to the existing draft while rebasing its base revision. Previous content/draft fields remain identical after removing the explicitly allowed addition/rebase. Learner/media/event tables and old revisions remain exact. Start through `scripts/start-preserved-demo.mjs` with existing database/media/vault paths and the exact committed revision. Fresh-progress startup is forbidden for this update.

## Verification

677 candidate tests pass, including source projection/trust/HTTP tests and actual-app library search/filter/paging/focus/collection switching. Audio exclusions remain explicit. Schema tests, seed validation and runtime checks pass. A real-data rehearsal checks all 791 rows and 1,055 records with 11,987 assertions; source text survives rich rendering/disclosures, only source-labelled bindings reach source conjugation slots, and three synthetic lesson eligibility results remain unchanged. GETs preserve persistent state. After the final search-field restriction, 104 affected app/source tests pass again.

Strict premium static audit reports the same three baseline actionless-button findings in existing lesson-editor/media-picker code. Delegated `data-move` / `data-select-media` handlers exist; these are existing static detection limits. There are no new findings. DOM/HTTP checks do not establish native visual acceptance. UX Owner's installed exact-build real-row review remains a separate required gate; Guy acceptance remains separate.
