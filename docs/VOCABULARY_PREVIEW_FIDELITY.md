# Vocabulary preview fidelity correction — 18 October 2026

Guy rejected the integrated UI because it did not match the approved interactive preview. UX Owner implemented this correction directly on an isolated branch based on `3a531e72dfdfac1cea5ce7675318e364d6e4f52f`. The reference is `vocabulary-discussion/vocabulary-popover.html`, SHA-256 `02eef4adb45748cf836b016e66557dd629b396622f4a1e7841d57168d4d759ee` in UX Owner's task workspace.

## Resulting behavior

- Adjectives have one lexical entry with M/F rows and singular/plural under the Hebrew group, a shared English cell, and no duplicated citation or separate Forms table. Only introduced forms appear. Citation emphasis is subtle and has no underline.
- Verbs retain neutral RTL past–present citations. Their form table spans the vocabulary table above Note, separated by a border. Tense groups contain singular/plural and person rows; explicit shared forms occupy a combined cell. Source teaching colours remain in expanded forms. Pronouns identify individual forms without another grammar column.
- Prepositions have Compact and Full presentations. Compact expands below the word, with Hebrew pronouns; seven stay horizontal with local overflow when necessary. Only all ten can use the narrow two-column alternative. Full has horizontal separators between entries. Hebrew and English sticky offsets remain measured.
- Root and Pattern use pale shared surfaces rather than the action-hover blue. Normal Hebrew is 25px, expanded verb forms 23px, and inherited application heading typography cannot enlarge them.
- The green Note band and grey examples-only band share a position. Examples stay paired, English left and Hebrew right. An exact example pair already explicitly structured in Examples is removed only from the displayed note fragment; source text and UTF-16 runs remain untouched. The compact construction reference `(see Note)` opens that entry's explanation.
- Studio uses readable category, tense and conjugation labels. Its preview follows the selected category. Unified Save, CAS, scope selection, focus restoration, approval and cumulative eligibility remain the existing paths.

## Local application comparison

`scripts/build-visual-vocabulary.mjs` reads the approved prototype and its grammar model, preserving the supplied source strings and teaching segments. It builds 16 comparison entries with 108 supplied forms. Its explicit disposable review metadata and demonstration lesson additions belong only to the visual-review database; they do not approve canonical workbook content or curriculum. The original illustrative Sea examples remain demonstration content.

Run the builder with the reference HTML and model paths, then run `scripts/start-visual-vocabulary.mjs` with its generated JSON path. The comparison uses its own ignored SQLite database and serves the actual app on port 63359. Lead's port 63358 and database are not replaced by this script. No source capture or database is committed.

## Evidence and limits

- `npm run verify:candidate`: 666 passed, zero failures after installing both locked root and schema dependencies. Existing deferred audio exclusions remain.
- `cd schemas; npm test`: 23 passed.
- Final focused renderer/owner/integration run after the lesson-label cleanup: 39 passed. `git diff --check` passed. Design Markdown lint could not run because its package was absent from the offline npm cache (`ENOTCACHED`).
- `test/lexical-vocabulary.test.js` covers disclosure, shared they, pronouns, paired examples, source-run conservation, and category structures. Existing integration tests retain Save/reopen, scoped progression, learner/rehearsal and trust coverage.
- Strict Premium static audit retains the same three findings in unchanged delegated-button code in `studio/lesson-editor.js` and `studio/media-picker.js`; it is not a clean audit.
- Mounted built-in browser opened the actual corrected application and produced a rendered adjective screenshot during iteration. That screenshot exposed Gender wrapping, a duplicated note example and Root alignment, which were subsequently corrected. Later opens confirmed the updated content and structure. Final screenshot and interaction calls failed with `os error 10060`. Final visual comparison, native disclosure/switching, geometry and keyboard acceptance remain open. DOM and HTTP checks do not replace these.

Guy's acceptance remains open. Previous bounded import-integrity evidence is preserved; this change does not claim new source approval, learner migration, publication, audio-speed or physical/mobile acceptance.

## Guy's Note-width and flicker follow-up

Guy reported that Note stopped before Root/Pattern and that collapsing פעם made the יכול note flicker. Every category's support row now spans its whole table. Adjective Root/Pattern rowspans end before that support row and center against the form rows.

The shared note measurement previously compared an expanded preview after CSS removed it from layout (`display:none`). Its measured width became zero, which could hide the full note, reveal the preview and reverse the decision on the next resize callback. Showing/hiding Expand could also change the available width used by that same decision. Expanded previews now use `visibility:hidden` to retain geometry; measurement uses the header's capacity before overflow controls, with explicit allowance for an always-present Examples action. Zero-width hidden containers do not reclassify single-line notes. Narrow-width cell padding and collapsed bracketed-aside wrapping were also corrected during the follow-up source review.

Executed follow-up evidence:

- `node --test test/lexical-vocabulary.test.js`: 22 passed. New checks cover support-row spans, partial adjective rowspans, repeated collapse/scroll/layout cycles, width thresholds, hide/reveal, and short notes with examples. Geometry in these checks is simulated; it is not native rendering evidence.
- `npm run verify:candidate`: 669 passed; zero failures. Existing audio exclusions retained.
- `node ../verify-served.mjs`: actual HTTP module bytes match, 16 source-backed comparison entries retained, citation invariance and 3/7/10 eligibility progression pass.
- `py -3 <premium-skill>/scripts/audit_project.py . --mode strict --output ../note-layout-premium-audit.json`: same three pre-existing findings in unchanged Studio delegated-button code. No new static finding; the whole-project audit is not clean.
- `git diff --check`: passed. No build/formatter exists in this project. No schema or data contract changed; the earlier 23 schema passes are retained evidence rather than a new run. Design Markdown lint remains unavailable in the offline cache from the earlier checkpoint.
- Restarted only the owner visual-review server on port 63359, with the existing fictional-progress startup rule. Lead's preview and canonical source remain unchanged.

Native follow-up: app navigation returned accessibility content, but screenshot, evaluation and a real Continue click each failed with `os error 10060`. Available-target inspection reports Browser ready, Local VM unavailable (no supported container runtime), and cloud unavailable (no configured provider key). No substitute browser or foreground desktop path was used. The required final visual/interaction pass with no gaps has NOT occurred. Work remains incomplete under Guy's criterion.
