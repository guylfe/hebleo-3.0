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

This native timing run predates only the completion-count correction; final runtime readback is separate. Automated tests cover cross-tab fencing, persistence failure, receipt identity, version conflict, learning return, clock/resume and Undo races. Native concurrent-tab/suspension, physical keyboard/touch, accessibility technology, and authenticated WordPress latency have not been exercised by this run. WordPress installation and Guy acceptance remain separate gates. No source-level check is presented as a screenshot or a production review.
