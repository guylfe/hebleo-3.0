# F14 recovery correction delivery

Owner implementation/verification evidence, 31 October 2026. **No live installation.** Independent re-review of RR-FIRST2-F14-01 and Guy acceptance remain Lead-owned.

## Exact implementation

- Base: `43a40ca7181a2dea6ac23c1f6121f29b007f1e06` (Lead's combined candidate).
- Code: `fae1c6111e38cb48eb49f0b41547a5c28055b08c`.
- Branch: `fix/f14-lossless-recovery-20261031`, pushed to verified private `guylfe/hebleo-3.0`.
- Checkout: `C:\Users\Trans\.openmausbot\task-workspaces\71c71389-5334-4e0c-9ca8-d80dd28223d1\653fb433-7485-48b1-9f7c-cb22711bda02\hebleo-3\f14-recovery`.
- Runtime SHA-256: `b26fa7737e1856390f63e4bdfe57aaace84118728333af57c6a5083309aedec2`.
- Backend SHA-256: `cead9f1a35bcd8de8927b5cb5eee9801e954717036a989475cc6378e79b5c22c`.
- Build fingerprint: `9df7a87b506d50ea14848091cd506ec9f9fd883a216b45ab7b8c5f33f1817b69`.
- [BUILD.json](BUILD.json) contains every executable file hash. This is candidate identity evidence, not an installed-server claim.

The implementation changes `src/author-review.js`, new `src/immutable-context.js`, `src/store.js`, `src/server.js`, new `public/backup-contract.js`, backup serialization/selection in `public/app.js`, `scripts/update-first2-feedback.mjs`, and new repeatable `scripts/verify-author-recovery.mjs`. Regression changes are in `test/author-recovery.test.js`, `test/app.test.js`, `test/author-review.test.js`, `test/draft-api.test.js`, and reader/legacy fixture expectations in `batch1`, `matching-progress`, `media-recovery`, `restore-integrity`, `source-authoring`, and `text-import-workflow` tests. `package.json` checks the new modules/script. The feature ledger and storage contract are updated. No learner activity, curriculum/source copy, source schema, entitlement or publishing-gate implementation changed.

## Results

| Actual command | Result |
|---|---|
| `npm run verify:candidate` | **946 passed, 0 failed**. Repository-authorized audio filename/name exclusions remain explicit; this is not an unrestricted full-suite claim. |
| `npm test --prefix schemas` | **27 passed, 0 failed**. |
| `node schemas/tools/runtime-check.mjs --runtime .` | **9 passed**, including a rerun identifying exact code commit `fae1c61`. |
| `node --test test/author-recovery.test.js test/author-review.test.js test/restore-integrity.test.js test/draft-api.test.js test/batch1.test.js test/matching-progress.test.js test/media-recovery.test.js` | **61 passed, 0 failed**, unrestricted focused names. |
| `node --test --test-name-pattern='F14 actual app backup' test/app.test.js` | **1 passed**: actual app action handlers capture the downloaded Blob, select its exact bytes, confirm restore over HTTP three times, retain notes/token/revisions, and refuse an oversized selected file before a request. DOM/HTTP evidence, not mounted-Browser inspection. |
| `git diff --check` | Passed. |
| Exact reader-9 archive probe (`git archive 43a40ca src public`, then import its Store) | Reader-10 database and backup both reject with status 409; every table and sequence remains unchanged. [OLDER_READER.json](OLDER_READER.json). |
| Private GitHub CI [41208854174](https://github.com/guylfe/hebleo-3.0/actions/runs/41208854174) | **Success** on exact code commit `fae1c6111e38cb48eb49f0b41547a5c28055b08c`, including clean Ubuntu dependency installation and candidate verification. [CI.json](CI.json). |

All required owner checks passed. [CHECKS.json](CHECKS.json) records totals and SHA-256 values of the actual local logs (`candidate-delivery.log`, `schema-delivery.log`, `runtime-code-commit.log`, `focused-delivery.log`, `app-recovery2.log`, `recovery-full-3.log`). The implementation's runtime bytes were unchanged during full-data verification. [FULL_DATA.json](FULL_DATA.json) retains the complete source table/sequence receipts and all full-data results; no learner rows, database or comment bodies are committed.

## Actual full-data recovery

Executed from the isolated checkout; clean exit 0, five PASS groups:

```powershell
node scripts/verify-author-recovery.mjs --baseline 'C:/Users/Trans/.openmausbot/task-workspaces/8c900356-50f6-4d41-bbb9-50c8abe09233/008af79a-cda6-4a4c-bd78-8ad492a6a44e/hebleo-combined/tmp/combined-final-rehearsal/before.sqlite' --legacy '../rr-combined-20261031/comment-growth.sqlite' --output tmp/recovery-full-3
```

| Scenario | Verified result |
|---|---|
| Bounded updater on copied actual 23-lesson baseline | Reader 8 migration changes only marker; one revision appended; all five prior revisions, other 22 draft lessons, source/learner nonprogress state, events/media and private review retained; two restore rehearsals pass. Fictional progress reset remains the existing authorized updater behavior; original progress is retained in the before-backup. |
| Six distinct HTTP Impact → Save draft → private comment/status cycles | Export byte series: **85,479,582; 85,485,849; 85,492,116; 85,498,383; 85,504,650; 85,510,917**. Six distinct complete workspace hashes/tokens verified against retained immutable contexts. |
| Exact HTTP export/restore, four passes | **85,510,917 bytes on every pass**, six revisions, six contexts and six notes throughout. Every original request/quote/audit/note/token and learner state is exact; all six original creates retry idempotently after every restore. |
| Five malformed full-data restore inputs | Base hash, delta, quote, audit and media failures reject with complete all-table/sequence receipts unchanged. Separate focused HTTP tests exercise malformed delta/chunk/receipt/quote/audit/reader boundaries and actual oversized export/restore refusal. |
| Legacy reader-9 six-full-context database | Review namespace **159,802,669 → 18,900,647 bytes**, retaining all original complete contexts, notes, quotes, audits, request receipts and tokens. Three exact HTTP recovery passes remain **85,507,402 bytes**, six revisions, six contexts and six notes. |
| Both original supplied databases | All table/schema/sequence receipts unchanged at completion. No Store opened either supplied source for mutation. |

Only explicitly synthetic test headings/comments were added to disposable copies. All test servers closed. This remains owner executable, app DOM/HTTP and CI evidence; no fresh mounted-Browser, device, screen-reader, independent release or Guy acceptance is claimed.

## Updater and reader handoff

Reader is now **10**, private review namespace **2**. Reader-9 full-context namespace 1 and earlier supported backups remain readable. Reader 8 with no review namespace changes only `schema-version`; no empty namespace is injected. Reader 9 with legacy comments atomically changes only its reader marker and losslessly compacted review encoding. Original receipts/quotes/audits/tokens are retained; no base snapshot or content ID changes. Older readers reject the new marker.

`scripts/update-first2-feedback.mjs` exact changes:

1. Import the shared legacy/current review validator and `draftTokenFor`.
2. Permit `author-review` encoding to change during migration only when that row already existed, and compare its complete normalized meaning before/after. Compare it again in updater preservation assertions. Other row/history/media/learner checks remain.
3. Copy databases with consistent read-only SQLite `VACUUM INTO`; the asynchronous SQLite backup worker stalled on the first disposable attempt and was stopped. Use a fresh output directory: `VACUUM INTO` refuses preexisting nonempty output files. Original source databases remain read-only and their complete receipts are checked unchanged.
4. Replace the receipt field `reader8To9MigrationOnlyMarker` with `reader8To10MigrationOnlyMarker`, and identify lossless legacy review migration explicitly.

The full-workspace publication boundary remains `TEXT_DRAFT_REVIEW_REQUIRED` while the 20 adapted legacy drafts await human review. Apply still opens Studio review; selective publishing and approval waiver are outside this correction. The four isolated consonant recordings and native/Guy acceptance are unchanged outstanding work. All comments/headings introduced by regression are explicitly synthetic; none is attributed to Guy.

## Next action

Lead: integrate the exact code and evidence commits into the combined candidate, identify that resulting SHA, then request renewed independent preinstall review before installing. Keep the installed database/server untouched until that separate integration/review step.
