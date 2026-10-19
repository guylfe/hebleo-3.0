# RR-B2-02 follow-up: reported-attempt identities on restore (owner evidence)

Owner: Hebleo Lead Engineer, 2026-10-06, branch `lead/b2-draft-api`, parent `6d957fe8333d0e21cd52bf695c19755c2cfdba87`. This is owner automated evidence. The Release recheck of this commit, browser QA and Guy's acceptance are all still Pending.

## What the recheck found

The Release recheck of `6d957fe` closed RR-B2-01 and RR-B2-03 and kept RR-B2-02 open. A v2 backup whose `reports[].value.attempt.exerciseId` was absent, null or `''` restored with HTTP 200 and 7 SQLite writes. Nonexistent and cross-lesson exercise IDs were already refused. Cause: `restore()` checked a reported attempt only with `linkable()`. Inside that, `linked()` treats a falsy `exerciseId` as an optional target, which is correct for questions but not for attempts. Learner attempts were also checked with `id()` on requestId/exerciseId/lessonId; reported attempts were not.

## Fix (`src/store.js`, `restore()` only)

- A new `savedAttempt(a)` predicate requires an object, a boolean `correct`, a parseable `at`, valid IDs for `requestId`, `exerciseId` and `lessonId`, and then the existing `linkable()` (the exact carried-revision link in v2, or an explicit `revisionId: null` + integer `legacyRevisionId`).
- Learner attempts and reported attempts both use it. A learner attempt with a bad ID is still a 400; the message is now `Invalid saved attempt.` instead of the generic ID message.
- The check runs in the validation phase, before `BEGIN IMMEDIATE`.
- Questions are unchanged: lesson-level questions keep optional `exerciseId`/`wordId`.
- Explicit legacy links still restore as legacy with their grade. v1 still relinks or marks legacy without repair or regrading.
- v1 reports now need the same mandatory attempt IDs as v1 learner attempts, which were already required. Reports written by `report()` always copy a full attempt.

## New tests (`test/restore-integrity.test.js`, +3)

| Test | Coverage |
| --- | --- |
| reported attempts with absent/null/empty identities or grades refused, v2 and v1 | 21 cases per format: exerciseId absent/null/empty on reports of resumed feedback, no-resume history and an explicit legacy record; requestId and lessonId absent/null/empty; `correct` absent or not boolean; `at` absent or not a date; attempt absent or an array. Each asserts the error, `total_changes()` delta 0, and every table including `sqlite_sequence` unchanged on a populated destination with a pending draft. |
| valid reports restore with unchanged grades; lesson-level questions keep optional targets | v2 and v1: all three reports keep identity and grade, resumed/no-resume relink to the restored revision, the legacy report stays `null`/4242, and a lesson-level question with `exerciseId` deleted and `wordId` null still restores. |
| HTTP restore refuses reports without exercise/lesson/request ID; valid report restores | Real `createServer` on an ephemeral loopback port, POST `/api/restore` as the fictional author. 18 cases (2 reports × 3 fields × absent/null/empty) each return 400 `Invalid learner report`, with zero changes and identical tables. The valid backup then returns 200, with `exerciseId` and grade intact. |

On the unfixed `6d957fe` `store.js` (stash of the fix only), both rejection tests fail at the reviewer's first case and the valid-report control passes. See `new-tests-on-6d957fe-store.txt`.

## Commands run (all from the clone; identity header in each log)

| Log | Command | Result |
| --- | --- | --- |
| `targeted-tests.txt` | `node --test` demo-build, restore-integrity, store, batch1, refinement, ux, draft-api, publication-diff, preview, server | 82/82, EXIT=0 |
| `verify.txt` | `npm.cmd run verify` | 132/132, EXIT=0 |
| `schemas-contracts.txt` | `cd schemas && npm.cmd test` | 15/15, EXIT=0 |
| `runtime-contracts.txt` | `node schemas/tools/runtime-check.mjs --runtime .` | 8/8, EXIT=0. Label says `6d957fe` (HEAD at run time); it ran the staged fix |
| `metadata-regression.txt` | `node schemas/tools/reproduce-metadata-diff.mjs --runtime . --require-fixed` | `fixed: true`, EXIT=0 |
| `reviewer-report-http-probe.txt` | owner copy of the reviewer's `resume-report-reference-http.mjs`, import path changed to this clone | 6/6 PASS, EXIT=0 |
| `reviewer-report-http-probe-on-6d957fe.txt` | same probe before the fix, HEAD `6d957fe` | absent/null/empty FAIL (200, delta 7), 3 controls PASS, EXIT=1: reproduces the finding |
| `reviewer-closure-probes.txt` | owner copy of the reviewer's `closure-probes.mjs` (RR-B2-01 reset, RR-B2-02 28-case matrix + omission, RR-B2-03 schema), import path changed | 5/5 PASS, EXIT=0 (reviewer saw 4/5, EXIT=1 on `6d957fe`) |
| `fingerprints/4291-*.json` | `node learner-fingerprint.mjs data/hebleo-demo.sqlite`, read-only, before/after | identical |

Tested tree: staged index `1fae7160`: `src` `2fa0ee1e17d0712a5d6b259cdc8600a5f2abb925`, `test` `a2a7262ae8fede978d1dde3c64a8e13803d1c0d6`. Unchanged from `6d957fe`: `public` `4b6d746a…`, `schemas` `ef10df02…`, `package.json`, `package-lock.json`. After the runs, only README.md, the checklist and this folder changed. The reviewer's originals were read and copied, never modified.

## Limits

- Owner evidence only. Probe copies are not the reviewer's independent execution.
- The two `reviewer-*.mjs` files are saved copies as run from the owner scratch folder `../rr-b2-02-fix` (imports `../hebleo-lead/src` / `../../hebleo-lead/src`). They do not run in place, and `node --test` does not discover them.
- A report's own `userId`/`requestId` still are not cross-checked against its key. The finding did not raise it, so it is left as is.
- No browser rerun (store-only change; `public/` unchanged). Browser/device QA and Guy acceptance Pending.
- Runtime approval enforcement remains documented unfinished.
- The 07:19 interruption cause from the previous fix remains unknown.
- Not merged to main. No change to 4173, 4291 (running process and DB untouched), 4197, live services, real data or production.
