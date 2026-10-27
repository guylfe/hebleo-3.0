# A2 document-wide practice cleanup — applied

27 October 2026. Guy requested correction of the document-wide issues in his six new comment threads before continuing his review. The changes were applied through the native Sheets API and read back from [Spiral A2 — early expression](https://docs.google.com/spreadsheets/d/1jlSH8qDBt3nwv90J_2IKkL-pzbRx3USW522KqtXR0Nc/edit#gid=102626001).

This pack supersedes the per-entry sentence-model approach in `../a2-revision-20261026/`. That earlier pack remains a historical record, not the current exercise specification.

## Corrections and rationale

- **Preserve:** all 116 stable lesson IDs, all 1,088 vocabulary entries, source links, original A, and human comments. Letter lessons remain at 2, 5, 8, 11, 14, 17, 20, 23.
- **Improve — concise rows:** removed the repeated lesson-format, provenance and practice boilerplate from F, “Practice for every entry: E” from D, and the equivalent repeated sentence claim from M. Shared guidance now appears once in the footer; F contains the lesson's specific teaching and exercises.
- **Improve — meaningful combinations:** rewrote 112 E cells into 379 labelled blocks of combined examples, exchanges or appropriate vocabulary tasks. `תאנה או תות? — תות.` practises both choice and fruit vocabulary. Removed contrived bare-noun questions such as `תא?`, `שמאל?` and `היד?`. Context labels are author prompts, not additional Hebrew vocabulary.
- **Improve — separate vocabulary practice:** all allocated entries receive audio/meaning recognition and cued recall in the Vocabulary block. E is supplementary sentence application and may combine several entries. Early F cells specify separate tasks for words that do not fit natural sentences, such as picture/audio matching for an island or compartment, a sound for a musical note, and a direction-selection task for left. These are exercise specifications, not implemented media or finished app exercises.
- **Improve — build on known structure:** PREFIXES-MHV-A2 moves from position 10 to 9; INTRODUCTIONS-INTEGRATION-A2 moves from 9 to 10. The integration can now use article, source and conjunction forms. Its prerequisites, examples, checks, outcome and rationale were updated. Example: `התמונה מהמלון או מהאונייה? — מהאונייה.`
- **Improve — usable forms:** replaced premature forms found while checking the new examples. Six later examples explicitly supply a current word's inflection or grammatical transformation in F before using it; each has a reason in `supplied-forms.json`. These do not add vocabulary meanings or reorder grammatical teaching.

The earlier nominal→questions and demonstratives→gender spacing exceptions remain unchanged. Broad topic-color flags in later integration/reuse lessons remain documented; this revision does not claim that broad color families are a complete measure of repeated grammar.

## Evidence

- Native batch: 473 requests, including one row move, 471 changed cells, and row-height auto-resizing.
- Fresh full cell readback: zero differences from the expected values, notes and cell formats. Google Sheets' omitted empty values are normalized as blank.
- Original A unchanged; conditional-format rules unchanged; all 113 source HYPERLINK formulas retained.
- All 44 active comment threads and their replies retained exactly; comment pagination complete. Comments were not resolved or answered on Guy's behalf.
- Executed checks: vocabulary allocations identical; 116 unique IDs; no detected untaught letters, unavailable forms, invalid prerequisite references, early definite-object-marker traps, or repeated row boilerplate.
- Commands run: `node .curriculum-document-fix-20261027/build.cjs`, `audit.cjs`, `make-sheet.cjs`, `verify.cjs`, and `deliver.cjs` (each with the same directory prefix). The runnable retained audit is `node docs/curriculum/a2-document-cleanup-20261027/audit.cjs`.

`APPLIED_VERIFICATION.json` records destination verification. `route.json` contains the revised route and vocabulary allocation, `combined-examples.json` the replacement examples, and `sheet-values.json` the read-back visible values/formulas.

## Limits and next review

These checks establish bounded source preservation and sequence consistency, not linguistic perfection or learner mastery. New wording remains an authored draft; native audio and curated Nikkud are still human authoring. No app import or publication occurred.

The dedicated browser route refused DevTools attachment to the existing profile. Window-targeted background inspection confirmed the correct A2 tab but showed its cached older content. A background Refresh was delivered and the tab was still loading during the subsequent inspection. Current rendered layout is therefore unverified; API readback is verified. No foreground input was used.

Guy can continue reviewing the revised A2 tab. Engineering has no new implementation assignment from this cleanup; any later lesson-pack import should use this revised exercise principle and retain the existing publication boundary.
