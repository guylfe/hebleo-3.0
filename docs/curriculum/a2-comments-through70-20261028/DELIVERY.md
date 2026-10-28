# A2 comments through lesson 70 — applied

28 October 2026. Guy authorized all changes in the preceding comment review except numbers. Applied to [Spiral A2 — early expression](https://docs.google.com/spreadsheets/d/1jlSH8qDBt3nwv90J_2IKkL-pzbRx3USW522KqtXR0Nc/edit#gid=102626001). This is a curriculum-plan update, not app import or publication.

## Preserve

- All 116 existing stable lesson IDs, 1,088 source vocabulary/structural entries, 113 original-A hyperlinks and 59 comment threads with replies and anchors. No comments resolved. Original A and other-sheet metadata unchanged.
- All 13 numbers-related rows are identical to their pre-write CellData, including values, formulas, notes and cell formatting. Their relative order is unchanged. Position formulas update naturally after the surrounding moves/splits.
- Shared Learn/Check/Vocabulary/Apply/Continue guidance remains once in the footer; historical cell notes remain available.

## Improve

| Revision | Current position | Reason |
| --- | --- | --- |
| Final forms begin in the writing lesson | 3 | Lesson 2 teaches only the four base consonants. |
| Split vowels | 4 and 9 | a/e/i first; Vav supplies o/u word models at 8, followed by sign comparison, sheva and לא. Minimum word-specific sheva guidance remains with earlier examples. |
| Earlier ו/י spelling | 12 | Reuse known יין/היי/אונייה; introduce only three readable meanings. Move השנה beside שנה and tool vocabulary to roots before tool-pattern practice. |
| Commands displayed completely | 20 | Come/go are new forms of known meanings; all four families are visible. |
| Availability and named possession | 21 | Teach יש/אין with ל־ + a named possessor and known לי. Use דלי instead of premature מפתח. |
| Present plurals and Green | 31 | Familiar לומד and מדבר reveal the vowel change; retain the approved בא/שם/עולה/רוצה material in separate stages. |
| Pronunciation production focus | 32 | Listen, produce, compare and retry. Reduce new meanings from twelve to two; ten move to body/outdoors at 35. |
| Consistent topic names | Throughout | Number related topics while preserving stable IDs; leave number-lesson text untouched. |
| Pi’el follows Pa’al | 42 → 45 | Two intervening lessons; first teach present pattern with familiar speak/pay anchors. |
| Past sequence | 52, 56, 62, 65 | He/she/they reuses Green; I/we introduces Blue with דיבר; you endings precede a separate היה/profile lesson by two lessons. |
| Former later four-form introduction | 59 | Clothing and routines now apply established present grammar. |
| Integration cluster | 11, 28, 58, 63, 66, 69, 71 | Retain scenes as vocabulary/application; avoid presenting these as settled chapter-ending integrations. |
| Four-consonant roots | 87 | All five main binyanim precede it; two lessons follow Hif’il before Pi’el/Hitpa’el comparison. |

There are 119 lessons: three new focused splits for vowels, body/outdoors vocabulary and היה/personal details. All 1,088 source entries remain; 24 change allocation. The approved ארגן/התארגן comparison adds one explicitly labelled derived meaning, get ready/get organised, beyond those retained entries. No minimum is imposed on the focused reading or you-ending lesson.

## Reconsider / deferred

Numbers redesign remains entirely for the next discussion. Final chapter boundaries and chapter-ending integrations remain deferred until the full curriculum is settled. These were already deferred in the approved review; this update records the boundary rather than inventing chapter placements.

## Source provenance

Guy’s current comments and explicit apply-except-numbers instruction authorize the pedagogical changes. The live WordPress lesson records 26250 and 32778 were read without edits: [verb summary](https://hebleo.com/courses/hebleo-hebrew-learning-platform/lessons/text-lesson-verbs-deep-dive-summary-2/) and [I did / Blue](https://hebleo.com/courses/hebleo-hebrew-learning-platform/lessons/text-lesson-intro-to-verbs-4-i-did-verb-subgroups/). They substantiate the original Green/Blue scope. The [Academy full-spelling rules](https://hebrew-academy.org.il/wp-content/uploads/Klaley-Ktiv-Male.pdf) provide the spelling reference; early examples are scoped recognition, not a complete spelling-rule derivation. New examples and proposed answers remain draft wording, not human linguistic or audio approval.

## Verification and commands actually run

- Preflight cells, metadata and comments matched the captured version immediately before writing.
- One native batch: 468 requests, three row moves, three row inserts, 245 changed cells, note preservation, topic-rule extension and resizing restricted to changed non-number content rows.
- Fresh readback: zero differences from expected content, formulas, notes and formats. The API normalized one RGB channel to its canonical precision and removed source-link style from the three new plain-text source labels; expected comparison records those intended semantics.
- Executed `node .curriculum-apply70-20261028/build.cjs`, `audit.cjs`, `make-sheet.cjs`, `verify.cjs`, and `deliver.cjs` (same directory prefix for each). The retained runnable check is `node docs/curriculum/a2-comments-through70-20261028/audit.cjs`.
- Audit covers vocabulary identity, letter availability, supplied forms, prerequisite references, selected grammar traps, rule placement, number preservation and letter spacing. It passes; it is not a complete linguistic proof.
- Browser inspection was refused. API formatting, wrap settings, frozen panes and color rules are verified; actual Google-rendered fit is unverified. No foreground escalation occurred.

## Handoff

Files in this folder: route.json, sheet-values.json, before-values.json, id-crosswalk.json, vocabulary-relocations.json, supplied-forms.json, audit.cjs, audit.json, APPLIED_VERIFICATION.json, preservation-evidence.json and this DELIVERY.md. Detailed before/after snapshots and the actual write payload remain in `.curriculum-apply70-20261028/` locally. No app code, learner data, production WordPress or publication settings changed.

Next owner: Guy, for the separate numbers discussion and continuing curriculum review. Leo receives the completed checkpoint and these limits. Engineering has no implementation assignment from this update.
