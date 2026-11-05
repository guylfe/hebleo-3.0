# WordPress four-fix candidate — private, not installed

Scope: Guy's 4 November 22:46 IL four-fix follow-up, WordPress only. Source checkout is hebleo-flashcard-followup at 6a24dff. Lead integrates/reviews/installs; new-app work is another owner's task. No Git mutation, production review, live deployment, source/audio editing or new preferences/decks.

## Exact baseline and generator

`generate.py BASELINE OUTPUT` verifies all 27 installed-v2 file hashes against BASELINE.json before producing anything. It emits exactly six changed/additive files: archive-decks.php, templates/card_loader.php, shared-cards/frame-host.js, shared-cards/frame-child.js, study-scheduler/wordpress.php, and added study-followup/state.php. Combine these with the unchanged baseline, yielding 28 plugin files. Never run the old original-plugin generators over this output. Source module imports ../followup/state.php; generator rewrites only that import to the deployed ../study-followup/state.php. Native runtime bytes are verified against the actual passing fixture.

## Keyboard and controls

Space reveals; 1–4 submit only after reveal. Host capture handlers suppress default Space button activation so it cannot grade or suspend. Modifier combinations, composition, repeats, editables and dialogs do not trigger shortcuts. Pending/uncertain/finished card and generation checks stop double/stale dispatch. Clicks/taps remain supported.

Opaque-frame relay accepts only an exact known live frame window, currently focused iframe, exact message/context shape, current generation/native note/template/visible face. Child accepts context only from parent and applies the same key exclusions. Hidden, detached, unfocused, wrong/stale or extra-field messages cannot dispatch. sandbox remains allow-scripts only; frame-bridge continues calculating the exact script hash for the new trusted child script. No source document, raw field, recording URL or approved template change.

Suspend is in a separate upper secondary aside, outside primary/rating controls. The Show Answer row has one grid-centered primary control spanning the available width. Long secondary labels wrap independently; content/document scrolling remains natural. DOM/CSS contracts passed; actual geometric/zoom and real keyboard execution remain unverified because the mounted Browser failed to retain/navigate to the private preview. BROWSER_STATUS.json records the exact evidence; no alternate browser or host screen was used.

## Save measurements and response safety

Actual HTTP POSTs in separate brand-new full-plugin WordPress 7.1.4 / MariaDB 11.4.13 fixtures, each with 2967 synthetic progress rows, 2118 assignments and 35 settings. Three warmups excluded; n=20 per phase. Timers are transparent instrumentation confined to disposable copies, never deployed. Values are median / p95 milliseconds.

| Stage | Before | Candidate |
| --- | ---: | ---: |
| HTTP end to end | 552.786 / 573.575 | 423.136 / 442.916 |
| WordPress bootstrap | 510.386 / 532.800 | 379.121 / 407.473 |
| Native handler | 20.014 / 22.172 | 19.545 / 22.850 |
| Progress row lock | 0.208 / 0.610 | 0.098 / 0.253 |
| FSRS | 0.106 / 0.137 | 0.090 / 0.149 |
| Transaction + commit verification | 17.839 / 20.347 | 17.755 / 20.851 |
| Streak | 0.996 / 1.450 | 0.887 / 1.480 |
| Other handler | 0.905 / 1.510 | 0.704 / 1.032 |
| HTTP/response/shutdown remainder | 14.021 / 28.351 | 24.219 / 28.221 |

The sequential candidate sample was faster, but this is not attributed to the code: the difference is dominated by variable bootstrap time. No production or causal speedup is claimed. Bootstrap dominates and varied between independent fixture processes. The median transaction difference is small compared with full bootstrap, despite adding atomic burial/receipt persistence. Neither the ~0.1 ms scheduler nor ~1 ms streak operation is a demonstrated bottleneck, so their correctness was retained.

Six anonymous live requests used invalid nonce, no cookies and note/template/rating 0; all returned Security check failed. TLS median 59.8295 ms, total/TTFB median 1502.699 / 1502.146 ms, p95 total 4065.635 ms. A separate read-only authenticated connection spent 3082.78 ms before a trivial 0.03 ms echo, with 340 queries already executed. This supports substantial server/request setup delay, not a diagnosis of a particular plugin, hosting issue or authenticated review endpoint. No real production save was sent. Production save latency/root cause beyond the measured request setup remains an explicit Lead profiling gate.

The implemented save fix bounds an unanswered POST at 12 seconds, then performs a bounded 8-second read-only receipt reconciliation. Success advances exactly once only after an exact matching committed receipt. Unknown/malformed/failed/lost replies leave the current card frozen, counts unchanged, with read-only Check saved state or Return to decks. There is never an automatic second rating POST or optimistic success. A late completion cannot advance another card/generation. The UI cannot remove the underlying WordPress bootstrap delay; it prevents indefinite unconfirmed saving and unsafe recovery.

## Persistence, identity and atomic sibling burial

Native note_id is the stable note identity already shared by both directions and cross-deck assignments. One additive private usermeta JSON record `_hebleo_note_day_v1_{note_id}` per actually reviewed learner/note stores schema/note identity, the one allowed (actually reviewed) template, expiry and a bounded last-32 request receipt map. No progress/due/schema/settings migration; no sibling history/due write; no permanent suspension.

A successful review buries OTHER templates of the note for that learner until next midnight in wp_timezone(). No existing configurable study-day boundary was found in the inspected WordPress baseline. DST days correctly last 23/25 hours; expiry is a comparison, not a reset job. The reviewed template stays eligible for legitimate same-day learning/relearning. Client removes already queued siblings only after confirmation, retaining them privately until expiry. HTTP Date anchors a monotonic server-clock estimate; cached siblings return automatically at the boundary without a network write, and a response crossing midnight does not re-bury an expired sibling. Explicit fresh-deck reopening invalidates old generations and clears uncertain/queued-day state; native new/due queues, deck counters and due helper filter burial in SQL before limits/order, including fresh enrollment/reload/cross-deck directions.

Existing native nonce, login, user/deck/state/access/suspension/limit/order predicates remain. State and expiry SQL are JSON_VALID guarded and choose only the newest matching metadata row. Existing FSRS v2 UTC due/precision/version logic is preserved. Scalar FSRS 6.3.2 and its MIT license remain byte exact.

Within the existing transaction, persist_rating locks the target row, then takes a connection-scoped GET_LOCK for user + native note (including table-prefix scope). Only after both locks does it read fresh memory/note state and obtain the server clock. This serializes opposite directions, while existing row locking and RR-SCHED-02 semantics are retained. It rejects already-buried siblings, stale expected state versions and regressed clocks. Target FSRS/exact metadata, burial and positive receipt commit atomically. A fresh post-COMMIT read must find the committed request before positive confirmation; an acknowledged empty replacement transaction is refused, not presented as success; any fault rolls back all and clears cached metadata; finally releases the note lock. A duplicate known request returns its original receipt and does not repeat FSRS or streak writes.

New client rate_card adds request_id and expected_version (SHA256 of current native scheduling identity/state + exact memory). Known request payloads cannot change grade/template/version. Existing internal/legacy calls without request IDs retain native behavior but still enforce sibling burial. hebleo_review_status requires the same nonce and authenticated learner, reads that learner's note receipt and returns committed or unknown. Unknown never means safe to replay. Receipts are bounded to 32 per note; older missing IDs remain unknown and their old state version cannot replay a changed card. Existing independent app undo behavior is outside WordPress ownership.

## Verification and remaining gates

See RESULTS.json, LATENCY.json, COMMANDS.md and fixture logs. Pure adapter hook registration is a no-op only in the pure CLI test; all native tests use real WordPress hooks/handlers. Prior scheduler scalar/reference/native/UTC/precision/fault/reopen and RR-SCHED-01/02 coverage is retained. New tests use actual native queues/counts/helpers, two learners, cross-deck directions, pre-limit selection, stale queued cards, metadata INSERT/UPDATE rollback/cache, committed/unknown/duplicate receipts, same-day learning, DST midnight and separate-process reopen. Actual opposite-sibling processes contend on a real named lock; one commits and the other is refused without sibling history changes. The old same-card row-lock regression still observes real INNODB_LOCK_WAITS and the second Good graduates correctly.

Browser preview uses private copies of approved original course documents for six directions and actual candidate host/child/control/CSS code, with controlled client responses. It is not a production save/playback test. It was prepared but not successfully reached by the mounted Browser. The helper is stopped at delivery; Lead can start browser-server.mjs again in the background for pending checks. Browser-check.js refuses the wrong host/port. Actual trusted-key presses, rendered narrow/short-landscape/long-label/200% browser zoom, theme interaction and installed destination remain unverified.

Lead retains independent combined review, full authenticated production startup profiling if further server latency improvement is required, fresh private backups, guarded installation/recovery and destination readback. No claim is made about external persistent caches or lost-connection-at-COMMIT outcomes beyond receipt-based recovery. Do not publish/install these private fixtures or source documents.

Final passing evidence: native-four-fix-5 (415 native, 51 scheduler reopen, 120 RR-SCHED tests, 5 real row-lock concurrency assertions, 57 new burial/receipt/day/learner/fault assertions, 3 burial reopen, 3 real note-lock concurrency assertions). Final generated archive passes 116 DOM/client assertions; host/child relay passes 17 boundary assertions. New cached-day expiry, cross-midnight replies, explicit unknown-state reopening and malformed acknowledgements are included. Final archive changed only in client code after native fixture generation; all final server/relay bytes match native-four-fix-5. No real Browser geometry/key result is claimed. Full final hashes are in RESULTS.json and CANDIDATE_MANIFEST.json.
