# Review data epoch correction — 6 November 2026

Bounded follow-up after `24e792cad706575b271e432a3d3b6b2c8e06cec5`, on branch `feature/background-outbox-core-20261106` in:
`C:\Users\Trans\.openmausbot\task-workspaces\71c71389-5334-4e0c-9ca8-d80dd28223d1\653fb433-7485-48b1-9f7c-cb22711bda02\hebleo-3\background-review-core`.

Lead integrated the earlier delivery with sentence controls in its separate checkout (`6f1ec28`). This correction modifies only Store epoch handling, backend tests, related evidence and the feature ledger. It does not import or overwrite Lead's sentence changes, modify Lead's checkout, deploy, start/reset an installed app or touch live data.

## Reproduced failure and correction

On unchanged24e792c, an isolated synthetic Store reproduced Lead's probe: enroll w-ani → capture intent/clock → backup before commit → commit → restore pre-commit backup → replay identical intent. Both initial and replay outcomes were committed; restored repetitions became1. This incorrectly replayed an old action into deliberately restored state.

Store now uses one server-owned database review namespace, `kv.reviewDataEpoch`, because deliberate reset/restore affects the database namespace. The key is outside the `review-` receipt prefix. On successful deliberate reset or restore, a fresh random UUID is written atomically with the state operation; it participates in every opaque `reviewVersion` hash. Randomness prevents same-timestamp and repeated-backup ABA. Restore/reset remove restored/reset profiles' volatile clock tickets. A legacy two-profile restore retains the untouched author's record, while global version invalidation still rejects its old ticket.

No epoch is added to request fields or supplied by the client. Shared browser core, app, transport routes and normalized intent/receipt API are unchanged. Receipt lookup stays before ticket, expiry and CAS checks: retained committed/undone/rejected outcomes reconcile without scheduling. Existing deliberate reset receipt cleanup and restore-from-backup receipt selection remain unchanged; a receipt absent from the restored backup is not invented or re-created as a historical commit.

Ordinary constructor/reopen/restart and clock issuance do not rotate an epoch or mutate records. For databases with no epoch, the exact legacy version hash is retained; installing this code alone does not invalidate existing queued recovery. After the first deliberate operation, ordinary reopen preserves the persisted epoch and valid tickets. Same-build reset no-op retains both epoch and pending intents.

## Metadata and preservation

Backup adds optional top-level `reviewDataEpoch` only when one exists. Restore validates it as a UUIDv4 before writes, but treats it solely as provenance: a supplied valid value is never selected as the active namespace. Legacy backups without the field remain valid. No Store schema-version or backup-format change, historical timestamp fabrication, content identity rewrite or browser database migration occurs.

Schedules, attempts, generations, last-answer times, notes/settings, content, drafts, source/media and retained receipts preserve their existing restore semantics. Only volatile authorization tickets and the namespace change at deliberate reset/restore. A failed restore rolls back epoch/ticket changes along with all other rows. This is explicit local reset/restore protection, not general external database-file restore monitoring.

## Actual checks

- Before correction, `node --input-type=module -` against the actual Store reproduced `{first:'committed',replayAfterPrecommitRestore:'committed',repetitions:1}` on an in-memory synthetic fixture.
- `node --test test/review-data-epoch.test.js test/background-review.test.js test/store.test.js`:33 passed (initial six new epoch cases).
- `node --test test/review-data-epoch.test.js test/background-review.test.js test/flashcard-followup.test.js test/review-save-lifecycle.test.js test/store.test.js test/app.test.js test/restore-integrity.test.js test/author-recovery.test.js test/media-recovery.test.js`:214 passed,0 failed,47seconds (`tmp-epoch-regressions.log`).
- After adding atomic rollback and legacy two-profile cases: `node --test test/review-data-epoch.test.js test/demo-build.test.js`:14 passed,0 failed,2.1seconds (`tmp-epoch-reset.log`). All eight epoch regressions pass.
- `npm run check`, `node --check src/store.js`, `git diff --check`:passed.
- Meaningful cases: pre-commit-backup replay rejected with repetitions0; fresh ticket and new choice commits once; reset at a frozen identical timestamp; same-build reset no-op; ordinary reopen recovery in both legacy and explicit epochs; retained committed/undone/rejected recovery with cleared tickets; source-supplied epoch ignored; invalid metadata refuses atomically; late restore failure rolls back namespace; two-profile restore invalidates an untouched author's ticket without changing its record; actual HTTP rejection/status path; content/draft/media/author metadata readback.

One existing assertion in background-review.test.js now expects deliberate restore to invalidate tickets. All other preservation assertions remain. Raw candidate hashes are updated in `BACKGROUND_REVIEW_CORE_HASHES_20261106.json`; no browser/app/server-route/sentence files changed.

Architect's bounded epoch recheck is pending at this checkpoint. Lead owns cherry-pick into its integrated sentence source, integration verification and any later installation. Native/installed epoch behavior and CI are not claimed verified by these local tests.
