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
