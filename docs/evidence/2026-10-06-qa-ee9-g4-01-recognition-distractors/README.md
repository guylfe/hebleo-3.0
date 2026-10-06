# QA-EE9-G4-01: blank recognition distractors (owner evidence)

Owner: Hebleo Lead Engineer, 2026-10-06, branch `lead/b2-draft-api`, parent `ee9e2f1beb81285a2a4775c0e76ac67584de8bc5`. This is owner evidence only. The independent QA recheck of this commit and Guy's acceptance are still Pending.

## What QA found

On the frozen `ee9e2f1` build, QA used Studio's recognition exercise: Add item, left it empty, then Save exercise draft. The save succeeded, and learner preview choices became `['', 'I', 'he', 'who']`, so learners would see a blank choice. Source: QA Red Team Gate 4 report `QA_CHECKPOINT_ee9e2f1.md`, `gate4/diff-03-04-recognition.txt` and `gate4/preview-recognition-empty-distractor.json` in the QA workspace. Those files were read, not modified.

Root cause: `validateContent` checked only that recognition distractors were a non-empty array of strings. A string containing nothing visible passed.

## Fix (`src/store.js`, `validateContent` only)

- A recognition distractor with nothing visible is refused. "Nothing visible" means the value is empty after removing whitespace (`\s`, including NBSP and U+3000), control characters (`\p{Cc}`) and default-ignorable code points (`\p{Default_Ignorable_Code_Point}`: LRM/RLM, ZWSP, BOM, bidi isolates, soft hyphen, CGJ).
- The value is only examined, never rewritten. Nothing is trimmed, dropped, replaced or invented. Valid strings keep their exact characters, including surrounding spaces, NBSP, a leading RLM and Nikkud.
- Message: `Authored distractor meaning N of <exerciseId> is blank. Enter a meaning or remove that item.` This is a `DomainError` (HTTP 400, `BAD_REQUEST`). N is the 1-based row, matching the Studio field label "Authored distractor meanings".
- `validateContent` is the shared content gate, so the same check runs before any write in:
  - `stage()`: Studio saves and import staging
  - `publish()` and `rollback()`
  - `restore()`: content, draft content and every revision snapshot
  - the demo-upgrade path

  Drafts or revisions that an earlier build saved with a blank cannot be published, rolled back to or restored until an author fixes them.
- No UI code changed. The exercise editor already shows the server's message, keeps the form values and re-enables its controls in `finally`. The tests and the browser check below prove this.

## New tests (`test/recognition-distractors.test.js`, 5 tests)

Fixture: a populated store with:
- revision 2 published, with `sourceRef` and an unknown `extension` field on `ex-1-recognize`;
- a recorded attempt for `learner-demo`;
- a pending draft that changes another exercise.

"Unchanged" means all of these compare equal before and after:
- `total_changes()` delta 0;
- every table in `sqlite_master`, including `sqlite_sequence`;
- the current draft and the published snapshot;
- all three fictional learners.

Blank values tested (11): `''`, three spaces, tab+newline, NBSP, U+3000, RLM, LRM+space+RLM, ZWSP, BOM, an empty bidi isolate pair and a soft hyphen.

| Test | Coverage |
| --- | --- |
| stage refuses empty, whitespace-only and invisible-only distractors | `ex-1-recognize` and `ex-3-recognize`, each blank at positions 0, 1 and 3, plus QA's replacement shape (`distractors[2] = ''`). Each gives 400 `BAD_REQUEST`, the exact row message, and an unchanged store. |
| publish, rollback and restore refuse blanks written by an earlier build | A legacy draft (`''` at row 4) is refused by publish. A legacy revision (RLM at row 1) is refused by rollback. Restore refuses blank content (row 4) and a blank draft (ZWSP at row 2). All leave the store unchanged. Control: the original backup still restores. |
| valid authored distractors round-trip | `[' he ', 'she ', '‏at home', 'הִיא', 'I']` stay byte-exact, in order, through every stage below; neighbouring fields, `sourceRef` and `extension` are kept, and the other learners are unchanged: <ul><li>stage</li><li>preview choices</li><li>preview grading (`who` correct; ` he ` and `הִיא` wrong)</li><li>publish</li><li>a learner session's choices</li><li>graded learner attempts</li></ul> |
| HTTP | Real `createServer` on an ephemeral loopback port. `POST /api/studio/draft` with `''`, three spaces or RLM returns 400 `{error, code: 'BAD_REQUEST'}` and the store is unchanged. `there` returns 200, giving `['I', 'he', 'she', 'there']`. Publishing a legacy draft with `' '` returns 400 and the store is unchanged. |
| Studio editor (jsdom, real `mountExerciseEditor` with `saveDraft` calling `store.stage`; the browser check below covers the HTTP path) | <ol><li>Edit the prompt, then Add item.</li><li>For `''`, `'    '` and RLM, Save shows the exact message. The rows keep the typed value, the prompt edit is kept, no control is left disabled and the store is unchanged.</li><li>Fill the row with `there`: Save stores exactly the expected exercise.</li><li>Add another empty row: Save is refused with the row 5 message.</li><li>Remove that row and edit row 1: Save succeeds and keeps `sourceRef` and `extension`.</li></ol> |

Before the fix: with the committed test file (blob `7e72fe1d`) and `src/store.js` set back to its `ee9e2f1` blob (`8ce83dc2`) in the working tree only, four tests fail and the valid round-trip passes (EXIT=1). See `new-tests-on-ee9e2f1-store.txt`. The index kept the fix, and `store.js` was then restored to the fixed blob `b5b351ce`.

## Owner browser check (port 4319, disposable)

A fresh server ran from this worktree on 127.0.0.1:4319 with its own new `data/hebleo-demo.sqlite` (gitignored, not committed). The page was opened as the Author profile in Studio, on the recognition exercise `ex-1-recognize`.

1. I typed the prompt `G4-01 owner browser check (fixture-only prompt)`, clicked Add item, left the row empty and clicked Save exercise draft.
   - Status: `Authored distractor meaning 4 of ex-1-recognize is blank. Enter a meaning or remove that item.`
   - Rows were `I, he, she, ''` and the prompt was kept; 0 of 19 controls were disabled.
   - The DB fingerprint was identical to the one taken before (`fingerprints/4319-before-ui.json` vs `4319-after-empty-refused.json`).
   - Screenshot: `browser-01-empty-row-refused.png`. It shows the retained rows; the status line is outside that viewport, so the DOM read above is the status evidence.
2. I typed three spaces into the same row and saved again. I got the same message, rows `I, he, she, '   '`, 0 controls disabled, and an identical fingerprint (`4319-after-whitespace-refused.json`).
3. I typed `there` into the same row and saved. Status: `Draft saved. Publish separately when ready.`
   - The stored draft has the typed prompt and distractors `['I', 'he', 'she', 'there']` on base revision 1.
   - The fingerprint (`4319-after-there-saved.json`) differs only in the `kv` draft entry; revisions, the published pack and learners are unchanged.
4. I stopped the 4319 server (PID 57764, `node src/server.js` from this worktree).

## Commands run (from the `hebleo-g401` worktree)

| Log | Command | Result |
| --- | --- | --- |
| `new-tests-on-ee9e2f1-store.txt` | `node --test test/recognition-distractors.test.js`, with `store.js` at the `ee9e2f1` blob | 1 pass, 4 fail, EXIT=1: reproduces the finding |
| `new-tests.txt` | `node --test test/recognition-distractors.test.js` | 5/5, EXIT=0 |
| `verify.txt` | `npm.cmd run verify` | 140/140, EXIT=0 |
| `schemas-contracts.txt` | `cd schemas && npm.cmd test` | 15/15, EXIT=0 |
| `runtime-contracts.txt` | `node schemas/tools/runtime-check.mjs --runtime .` | 8/8, EXIT=0. The JSON label says `ee9e2f1` (HEAD at run time); it ran the staged fix |
| `fingerprints/4319-*.json` | `node learner-fingerprint.mjs data/hebleo-demo.sqlite` (read-only) on the 4319 DB | as described above |
| `fingerprints/4291-*.json` | the same, on the owner 4291 checkout's DB, before and after | identical |

Tested tree: the staged index tree `b77598c2`, recorded in the identity header of `verify.txt`, `schemas-contracts.txt` and `runtime-contracts.txt`:

| Path | Tree |
| --- | --- |
| `src` | `daf5c905…` |
| `test` | `f0dbbf50…` |
| `public` | `4b6d746a…` (unchanged from `ee9e2f1`) |
| `schemas` | `ef10df02…` (unchanged from `ee9e2f1`) |

`package.json` and `package-lock.json` are also unchanged. After the runs, only README.md, the checklist and this folder changed.

## Limits

- Owner evidence only. The independent QA recheck and Guy's acceptance are Pending. One desktop browser; no touch, mobile or screen-reader check.
- Not fixed here, and left for separate classification:
  - the ordering exercise's blank-token variant (same pattern, different field);
  - QA-EE9-G4-02 (matching words outside the lesson);
  - accepted answers made only of invisible marks;
  - the `sourceRef`/feedback learner-payload observation;
  - the three low retry-status/focus/toast issues, which stay in QA's original report.
- A blank saved by an earlier build stays in that draft or revision until an author fixes it. This change blocks it from going further but does not repair it.
- Not merged to main.
- Not touched by this work:
  - QA's `ee9e2f1` copy on 4213 (files, DB, process);
  - 4173 and 4291 (same PIDs before and after; 4291's DB fingerprint identical);
  - 4197 (no listener at the start or the end);
  - live services, real data and production.
