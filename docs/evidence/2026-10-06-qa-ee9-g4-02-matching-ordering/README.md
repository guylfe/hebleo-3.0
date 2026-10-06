# QA-EE9-G4-02 matching progress and ordering-token correction

Owner: Hebleo Lead Engineer, 2026-10-06. Local worktree `C:\Users\Trans\.openmausbot\workspaces\8c900356-50f6-4d41-bbb9-50c8abe09233\hebleo-g401`, local branch `lead/b2-g401`, delivery branch `lead/b2-draft-api`. Parent: `b312cdd294ace379080235d7b7275d99ca9e8612`. This is owner evidence only; independent correction closure and Guy's acceptance remain Pending. Nothing was merged to main.

## Behavior and scope

- `src/store.js`: saved matching keys belong to the exercise at the saved revision, portion and question, resolved using `stepExercises` (Check, Core and `practiceIds`). A matching question may use any word in the authored pack, including `w-sham` outside lesson 1's vocabulary. Nonmatching questions, non-exercise portions and other-question/revision keys are refused before writes. Empty maps still allow normal transitions. Values keep their existing string/length validation; no authored meaning is changed.
- `src/store.js`: shared `blankEntry` examines recognition distractors and ordering tokens for visible content. Empty strings, whitespace, controls and default-ignorable marks are refused. The ordering error names the exercise and 1-based row. Nothing is trimmed, dropped, shifted, repaired or invented. The content gate applies to stage/import stage, publish, rollback and restore, including drafts and carried snapshots saved by older builds.
- No UI, payload, schema or migration change. Existing recognition, RR-B2-01–04, draft CAS, publication and preview protections remain covered by the full suite.
- Saved WIP was inspected and preserved. `saved-wip-at-resume.patch` and `focused-at-resume.txt` record the initial tracked changes and hashes of both new test files. The earlier quota text is historical; no current model/quota failure occurred.

## Meaningful regression coverage

`test/matching-progress.test.js` (5 tests) covers cross-lesson partial/full matches, session resume, wrong/right grading and completion, Check/Core/reordered repeat sets, exact pinned revisions, empty-map transitions, v1/v2 restore and revision remapping, and real HTTP 200/400. Rejections compare `total_changes()` and all tables, including `sqlite_sequence`, plus all three fictional profiles. A mixed owned/unowned map is rejected atomically.

`test/app.test.js` adds a real `app.js` jsdom autosave regression with Store-backed requests: move from typing to the cross-lesson matching question, place `w-sham → there`, await persisted progress, mount the app again, inspect retained placement, fill remaining pairs and grade correctly against revision 2.

`test/ordering-tokens.test.js` (5 tests) covers 11 blank forms at three positions in two exercises; a blank prefix tile; stage, legacy publish/rollback and v2 restore atomicity; exact strings, duplicates and prefix occurrences through stage/preview/publish/session/progress/grading; real HTTP; and editor error/input/tick/control retention with recovery by filling or removing a row. Valid source/unknown fields are retained.

The expanded matching tests exposed a WIP gap: `stepExercises` can return the Core array for a non-exercise portion. The final check explicitly limits nonempty maps to Check/Apply. `step-gap-before-correction.txt` also includes a test-harness assertion failure caused by the server's expected `updatedAt`; that assertion was corrected to compare the authored progress fields. This log is preserved, not counted as a final pass.

## Actual commands and results

All commands ran from this worktree. `run-check.mjs` records UTC time, HEAD, branch, staged index tree, command and SHA-256 hashes of all tracked executable/test/contract files; stdout/stderr and exit status follow. Logs saying HEAD `b312cdd` ran the staged correction, whose source hashes are in the same header. Terminal padding at the ends of blank lines was removed from `parent-store-focused.txt` and `step-gap-before-correction.txt` for Git whitespace hygiene; their raw copies remain in the task workspace's `g402-raw-logs` folder. Assertion text, values, hashes and results are unchanged.

| Log | Command | Result |
| --- | --- | --- |
| `focused-at-resume.txt` | `node --test test/matching-progress.test.js test/ordering-tokens.test.js` before the expanded step checks | 9/9, EXIT=0 |
| `focused-final.txt` | Same command with expanded Check/Core/legacy coverage and the final correction | 10/10, EXIT=0 |
| `app-matching.txt` | `node --test --test-name-pattern=QA-EE9-G4-02 test/app.test.js` | 1/1, EXIT=0 |
| `parent-store-focused.txt` | Final focused files with `store.js` temporarily set to the committed parent blob | 1 pass, 9 fail, EXIT=1; reproduces both defects; valid ordering round-trip passes |
| `parent-store-app.txt` | App regression with the parent store | 0 pass, 1 fail, EXIT=1; cross-lesson autosave does not settle |
| `verify.txt` | `npm.cmd run verify` (executed via Node and the installed npm CLI) | 151/151, EXIT=0; syntax checks pass |
| `schemas-contracts.txt` | `npm.cmd --prefix schemas test` (same npm CLI method) | 15/15, EXIT=0 |
| `runtime-contracts.txt` | `node schemas/tools/runtime-check.mjs --runtime .` | 8/8, EXIT=0, ephemeral in-memory HTTP store |
| `browser-readback-results.json` | `node docs/evidence/2026-10-06-qa-ee9-g4-02-matching-ordering/browser-readback.mjs 61890` | 10/10 read-only evidence assertions |

The parent control swapped `store.js` only within this isolated worktree, before starting the scratch browser server; `finally` restored the fixed bytes exactly (SHA-256 `b01f805c49c0c8c967723d2d3acba2252b7126f58ab36a8c4dbc9d1a4d14078b`). The exact driver is preserved in `parent-control-used.mjs.txt`.

`verify-command-path-error.txt` is a command-launch failure from a wrongly quoted npm CLI path (`MODULE_NOT_FOUND`), before application checks ran. The path was resolved from `Get-Command npm.cmd`; the resulting full verification passed. This is not a test or provider failure. Initial sandboxed GitHub access failed to connect; the authorized network escalation then verified private repository access.

Tested staged index tree before documentation/evidence: `f5ac0b7c0a10f6ae2d110ea4cde678b1c9d6b0f2`.

| Path | Git tree/blob |
| --- | --- |
| src | `1af480a8f4437a09e543f94c263ab580f1cf0c0f` |
| test | `5fbe7eb49a7bcb9288b07c981b49e3cf92e1b28f` |
| public | `4b6d746a4d9f424601d2a9618107ed1a56ab9459` (unchanged) |
| schemas | `ef10df024164d96179947f429fc43985af329541` (unchanged) |
| package.json | `32079f75511a8a379db4633545663816dd9b810d` (unchanged) |
| package-lock.json | `76c0d5c11e87be92125e28f0304646187b87b9b0` (unchanged) |

## Mounted Browser owner check

Fresh fictional database outside the repo: `C:\Users\Trans\.openmausbot\workspaces\8c900356-50f6-4d41-bbb9-50c8abe09233\g402-browser-scratch\fictional-only.sqlite`. Server PID 70256, randomly assigned free port 61890. Fixture bootstrap is preserved in `browser-fixture-used.mjs.txt`; identity and source hashes are in `browser-runtime-identity.json`. Database files are not committed. The fixture publishes only synthetic pair changes and an unknown ordering extension, producing revision 2.

1. Alex: typed `אני` and graded the typing question, then used actual browser clicks to select `w-sham` and `there`. The matching save persisted `{w-sham:'there'}` at revision 2, Apply question 1 (`browser-partial-session.json`). A full reload showed `שם / Placed: there` and the filled target.
2. Selected the remaining `w-ani → I` and `w-mi → who` pairs with actual clicks, then Check. Feedback said “That’s right.” Full reload retained all pairs and the same graded feedback/request ID (`browser-graded-reloaded-session.json`, `browser-04-graded.png`). This is select-then-target behavior, not a drag/touch claim.
3. Author: opened Studio, selected lesson 2 / `ex-2-order`, edited the prompt to `G4-02 owner ordering check (fixture-only)`, Add item, Save. Empty row 4 showed the exact row error, kept `['ב','בית','אני','']`, prefix ticks `[true,false,false,false]` and the prompt; disabled-control count was 0. Every table, three learner fingerprints, published revision/pack and draft matched the before fingerprint.
4. Three spaces and then RLM (`U+200F`) in that row were each submitted by actual clicks. Passive fetch-response recording confirms separate `POST /api/studio/draft` responses 400/BAD_REQUEST. DOM values/prefixes/prompt remained exact and controls were enabled (`browser-ordering-whitespace-dom.json`, `browser-ordering-invisible-dom.json`). Both fingerprints equal the before snapshot. The passive recorder only observed responses; it did not submit or replace the authoring interaction.
5. Filled the row with ` \u200fשם ` (leading space + RLM + שם + trailing space), Save returned 200. After full reload and reselecting lesson 2 / ordering, the exact string, prompt, accepted answers, prefix index `[0]` and unknown extension remained. Only draft/kv changed; published content/revisions and all three learners stayed equal (`browser-ordering-saved-dom.json`, `browser-ordering-reloaded-dom.json`, `browser-readback-results.json`). No publication was performed.

Browser artifacts have bounded limits: screenshots 01/02 captured only part of offscreen controls; they are not grading evidence. The first Check click failed with connection-refused OS 10061, then tab inspection showed a replacement blank target. The server stayed healthy (HTTP 200). One supported browser reopen recovered the run and the typed answer. Later clicks on offscreen matching controls failed to place the last pair; native page scrolling, visible-controls screenshot 03 and inspecting `aria-pressed` established the actual placement before the successful Check. A noninteger scroll argument was rejected and corrected to an integer. Studio reload defaults to lesson 1; lesson 2 was reselected before asserting the ordering fields. None of these intermediate attempts are counted as passes.

## Preservation and handoff

`4291-before.json` equals `4291-after.json`; all tables and the three fictional learner hashes match. Protected listener files match: 4173 PID 40324, QA 4213 PID 79776, owner 4291 PID 66768; no 4197/4319 listener. No files, databases or processes in those checkouts were changed. Only the disposable 61890 process created for this task is stopped at closeout. Main, live services, real data and production are untouched.

The deliverable is one correction commit on private `lead/b2-draft-api`, retaining the recognition parent and RR protections. Independent QA should use the exact returned SHA in its own isolated runtime and new fictional DB, recheck cross-lesson learner autosave/reload/grading and ordering empty/whitespace/invisible rejection with unchanged state, then valid byte-exact draft recovery. Do not update QA's frozen ee9e2f1/4213 environment to the moving branch. Recognition independent closure at b312cdd is a separate gate. Native import upload, low retry/focus/toast issues, other pending browser regressions, touch and Guy acceptance remain separate.
