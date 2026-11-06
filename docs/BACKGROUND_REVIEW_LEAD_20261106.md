# Background review integration — Lead evidence

This change implements Guy's approved next-card-after-durable-capture behavior. The app's existing prototype interval scheduler and WordPress's existing FSRS remain separate algorithms. This report supplements the core and epoch reports; their earlier broad-suite and native limitations are historical findings on their named revisions.

## Integrated scope

Lead merged reviewed core `24e792c`, current installed sentence controls `7dcafe13`, and reset/restore correction `f4e2bc9` plus its review record. Build/Type and Type self-approval are retained. No existing live data has been reset or seeded. WordPress adaptation remains separately owned and is not installed by this app checkpoint.

The app advances only after IndexedDB transaction completion. Sending and receipt reconciliation remain ordered and scoped to site and fictional demo learner, with atomic sibling capture exclusion, immutable IDs, CAS, trusted clock tickets, retained outcomes, settled overlays and fenced Undo. This local app still uses its explicitly fictional demo authentication. It is not production authentication.

Lead's native run found a completion counter that counted skipped siblings. Completion now counts distinct captured request IDs; Undo and explicit rejected-outcome resolution remove their own request ID. The Undo queue snapshot now records the captured request ID so it can restore the matching queue. It does not derive review totals from a navigation index.

## Executed checks

- Before epoch integration: 182 focused tests passed.
- Integrated epoch candidate: `npm run verify:candidate` passed, 1,153 tests passed, nine existing audio skips, zero failures.
- A new actual-app/HTTP regression reproduced the counter bug (reported three instead of two), then passed after correction, including Undo and rerating. Eleven focused background/sibling event tests passed after the change.
- Logs are retained locally in `tmp/background-lead`. Final candidate and installed receipts are recorded separately after the runtime checkpoint.

## Mounted Browser evidence on 8534b08

All ratings below use a disposable copy of the live database with three existing shared directions substituted into fictional Alex's queue. The original database remained exactly `09cec407e1f619058d2a64dec5eb0aafb398484d65c79af9efb9096d199cee9b` throughout. These are real app events and browser IndexedDB, with test-only transport delays/failures; they are not reviews on Guy's progress.

- Good on wine immediately excluded its opposite-direction sibling. Water appeared next: iframe replaced at 26.3 ms, document loaded at 224.9 ms, child ready/height plus next animation frame at 466–478.4 ms. A mounted screenshot visibly shows water. These marks bound render readiness, not physical display scanout.
- The real isolated HTTP save returned in 110.7 ms; its response was deliberately held until 10,117.8 ms. The next card did not wait for that response. Server accepted-answer-to-commit delta was 63 ms; HTTP round trip and scheduling timestamp delta are separate measurements, not a server CPU-duration claim.
- A second rating was captured while an initial status read was intentionally unavailable, then retried with the same immutable intent. It committed once; the response was deliberately lost. Its accepted answer time stayed frozen: commit followed answer by 23,180 ms, and due time was exactly two days from the answer rather than arrival.
- Account switching parked Alex's pending entry while Sam's scope stayed empty. After returning to Alex and reloading, normal receipt lookup removed the pending entry and retained the exact original committed receipt. Backend readback showed exactly two receipts, repetitions one for both rated cards, and zero for the hidden sibling.
- Finish retained the pending recovery notice; it did not claim that all saves were complete.

Local evidence: task root `.private/background-native-20261106/evidence/01-delayed-measure.json`, `02-lost-before-reload.json`, `03-account-parked.json`, `04-reload-drained.json`, `05-backend-preservation.json`, and screenshots `01-next-card-held-response.png` / `02-response-loss-finish.png`.

## Remaining boundaries

The earlier native timing run predates only the completion-count correction; the final run below exercises its exact replacement. Automated tests cover cross-tab fencing, persistence failure, receipt identity, version conflict, learning return, clock/resume and Undo races. Native concurrent-tab/suspension, physical keyboard/touch, accessibility technology, and authenticated WordPress latency have not been exercised by these runs. WordPress installation and Guy acceptance remain separate gates. No source-level check is presented as a screenshot or a production review.

## Final app runtime and installed readback

Exact tested/installed app runtime: `785ab53c718625a06e35fad15c78608af13d9ef5`. This was pushed and remote-verified on private `main` and `feature/background-review-20261106`. The current delivery documentation can advance separately from that frozen executable revision.

- Final `npm run verify:candidate`: 1,163 tests, **1,154 passed, nine existing audio skips, zero failed**, 61.5 seconds. Only the bounded counter/Undo correction changed runtime after the earlier full pass.
- A fresh final Browser fixture used the exact frozen build. Next-frame replacement took 27.2 ms, document load 217.4 ms, child ready/height plus next frame 409.6–426.7 ms. Real save HTTP took 120.5 ms, while its response was deliberately held to 10,132.7 ms. Accepted-answer-to-commit delta was 66 ms. The screenshot visibly shows water with one pending review. These are local fixture measurements, not production timing or physical display measurements.
- Completion visibly reported two rated cards with the sibling skipped. Native Undo restored water; rerating again finished with two. Backend readback retained three unique receipts (two committed, one undone), one repetition for each rated card and zero for the sibling.
- Consistent backup, integrity check, preservation-open rehearsal, all-table receipt and config/media/vault/request-log checks passed. Installed app PID30220 serves port63358 from frozen `hebleo-bg-runtime-20261106`. It uses the original database and exact prior environment/media/vault/log paths, with fresh-progress disabled. Old source remains available for rollback; no database replacement or rollback was performed.
- Runtime SHA256 `ab611aea67967ba5dc19479dff01b83ac217a8ed403ec0067c05d68ab214c8de`; backend `0433ec70d00a1a5a1c118a909740375212b97cb0e212565181ad395d55023481`. All **163 disk files and 83 served assets** match. Three learner bootstrap reads and Studio draft readback retain active6, all23 drafts including20 unpublished first20. Entire DB/schema remains `09cec407e1f619058d2a64dec5eb0aafb398484d65c79af9efb9096d199cee9b`; source content, history, settings, IDs and uploads are unchanged.
- Final native evidence: task `.private/background-native-final-20261106/evidence/`. Installation: `.private/background-install-20261106/PREPARED.json`, `FROZEN.json`, `installed-PROCESS.json`, `installed-READBACK.json`, `rehearsal-READBACK.json`, `CLEANUP.json` and consistent pre-install SQLite backup. These private files are not committed learner records. Disposable servers63482/63483/63484 are stopped.
- Mounted installed Browser readback loads the real Review overview, without rating live cards. This verifies installed access/assets; latency and recovery ratings were confined to disposable copies.

Remote Local demo CI [42150463769](https://github.com/guylfe/hebleo-3.0/actions/runs/42150463769) was still running at its one check. A one-time follow-up is scheduled; **remote CI is unverified at this checkpoint**. The app-only paths do not trigger the WordPress workflow. WordPress adaptation has not returned an artifact: its owner is waiting on Guy's existing private branch push approval. No WordPress installation/reviews occurred in this task. A read-only destination check confirmed existing followup state hash `39e9ee3e65860262ed91f9dcd59d37e1e05ab43f49200c09cf24497b13994b2a` remains unchanged. The BOTH-platform assignment is incomplete until the WordPress work is returned, reviewed, tested and preservation-installed.
