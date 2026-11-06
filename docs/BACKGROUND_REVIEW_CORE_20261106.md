# Background review core — corrected handoff, 6 November 2026

Repository: `C:\Users\Trans\.openmausbot\task-workspaces\71c71389-5334-4e0c-9ca8-d80dd28223d1\653fb433-7485-48b1-9f7c-cb22711bda02\hebleo-3\background-review-core`.
Base `5924fb54fc78647ecc06b9f2e90b57d29e559e7c`; branch `feature/background-outbox-core-20261106`; corrected code commit `f17e14aa0fc4775582239d031cabd20a6093b426` follows initial candidate `dc0aae1`.

Isolated app/core implementation only. Lead owns WP adaptation, integration, both guarded installations, backups and preservation readback. No main merge, installation, live review/data write, progress reset, content, curriculum, media or settings changes occurred. The app's existing prototype interval scheduler is unchanged and is not FSRS. WP retains its own existing FSRS implementation.

## Shared API and normalized contract

Classic-script or module-side-effect loading of `public/review-outbox.js` sets `globalThis.HebleoReviewOutbox={protocolVersion:1,create}`. App imports it through `public/review-save.js`. One origin-local IndexedDB database `hebleo-review-outbox-v1` stores scope keys `JSON.stringify([siteId,ownerId])`; credentials are never persisted.

```js
const queue = HebleoReviewOutbox.create({
  siteId, ownerId,
  isActive: () => authenticatedOwner === ownerId,
  now: () => trustedServerUtcMsPlusDocumentMonotonicElapsed,
  send: (intent, signal) => postIdenticalIntent(intent, signal),
  lookup: (intent, signal) => lookupReceiptOrNull(intent.requestId, signal),
  maxPending:20, timeoutMs:15000, pollMs:2000
});
await queue.ready;
await queue.capture(intent); // real durable transaction COMPLETE before local advancement
queue.snapshot(); // siteId,ownerId,pending,overlays,error,blocked,paused,disposed
queue.excluded(cardId,siblingGroupId); // uses supplied trusted now(), not browser wall time
const unsubscribe=queue.subscribe(snapshot=>updateUI(snapshot));
await queue.retry(); // status reconciliation, then only identical-intent resend
await queue.reconcile(receipt=>authoritativeRefreshSupersedes(receipt));
const resume=await queue.pauseCapture(); // durable cross-tab Undo capture pause; sender still drains
await resume();
await queue.resolveRejected(requestId,intentHash); // adapter MUST first fetch fresh authoritative state
queue.dispose(); // abort sending and release owned claims; preserve intents
```

Without a finite trusted clock provider, capture fails and confirmed exclusions remain conservative. IndexedDB strict durability is requested. Browser eviction, user-cleared storage and every power failure cannot be prevented.

```text
Intent (strict fields):
 protocolVersion=1, siteId, ownerId, requestId,
 cardId, siblingGroupId, expectedVersion, rating,
 clockTicketId, elapsedMs

Committed / undone receipt:
 protocolVersion=1, requestId, intentHash, outcome='committed'|'undone',
 cardId, expectedVersion, resultingVersion,
 acceptedAnswerAt, committedAt, authoritativeSchedule, siblingsUntil

Rejected receipt (no scheduling fields):
 protocolVersion=1, requestId, intentHash, outcome='rejected',
 cardId, expectedVersion, reasonCode, rejectedAt
```

Times are UTC integer milliseconds. Schedule `due` is ISO UTC; adapters may retain algorithm-specific fields. `intentHash` is SHA-256 over recursively key-sorted canonical JSON, retaining array order and JSON scalar encoding. The core verifies hash, identity and complete outcome-specific fields before durable acknowledgment. App receipts additionally retain legacy wordId/rating/card and resultingGeneration; these are not required WP scheduler fields.

Capture atomically allocates order, claims card and sibling group, and persists the immutable intent. Storage failure never advances. Independent sender reconciles the ordered head, uses a lease and fences acknowledgments against scope/lease generation/head sequence/request identity. An in-flight HTTP mutation cannot be revoked by disposal; server idempotency protects takeover. Confirmed overlays persist in the same acknowledgment transaction before the queued entry is removed. BroadcastChannel plus bounded polling reconciles tabs. Pending overlays survive stale bootstrap; confirmed due/burial exclusions use trusted server-anchored time.

A verified rejected receipt durably marks its original head needs-resolution, retains intent plus receipt, stops resending and blocks later capture/sending. Retry cannot reopen a known rejection. Explicit resolution first fetches authoritative state, then atomically releases only the matching rejection. The app returns the card only if eligible; otherwise it explains removed/suspended/future-due/sibling restriction. A fresh ticket, new request ID and new learner choice are required for any new rating. Unknown commits, malformed responses, authentication failures and transport/storage errors are never silently discarded as rejections.

## App and Store behavior

`createReviewSave({background:true,ownerId,send,isActive,onChange,getCardIds})` wraps this core. Methods: ready, snapshot, excluded, retry/reconcile, dispose, now, clock(cardIds), commit({cardId,rating,requestId}), pauseCapture, drain, observe(bootstrap), resolveRejected(requestId,freshBootstrap), clearOverlays(requestId). The legacy synchronous controller remains exported for existing consumers/tests.

- POST `/api/review/clock {cardIds:[...]}` accepts at most100 needed cards; omission selects first100. It reuses unexpired same-version tickets, preserving issue time and timing reference. Returns `{anchors,serverNow}`. Repeated session/resume refresh does not multiply tickets for unchanged cards.
- POST `/api/review/background <Intent>` checks existing receipt first under SQLite BEGIN IMMEDIATE. Matching committed/undone/rejected outcomes win before expiry/CAS. Different hash for a reused ID fails. Valid definitive CAS/expiry/eligibility failures commit rejected tombstones under the same lock without modifying learner state, schedule, generation, burial, counters or Undo target. Authentication/malformed inputs and server-clock regression remain errors. HTTP200 means known outcome; only committed means rating applied.
- GET `/api/review/status?requestId=...` returns `{receipt:null|Receipt}`. Receipts/tombstones are retained without count eviction. A matching receipt remains recoverable after clock expiry.
- Bootstrap adds reviewVersions. Review and Undo advance generations that Undo cannot restore. Generations, accepted times and clock tickets are additive validated learner metadata included in backup/restore; no destructive migration/format replacement occurs. Rejected receipts also survive backup/restore.

Clock bounds: tickets last24hours, at most10,000 retained per learner; expired tickets prune on issuance. Immutable elapsed input is finite/nonnegative and at most24hours. Candidate answer time is issuedAt plus captured elapsed; more than2minutes ahead is rejected, small future discrepancy clamps to trusted serverNow. Server-clock regression and answers before last committed review are rejected. Card due/eligibility/burial remain authoritative. Tickets bound client input; they cannot prove human answer time.

Document anchors expire after5minutes. Missing/old anchors refresh and require another rating choice. Resume synchronously invalidates anchors and blocks capture until the newest clock response; superseded responses cannot reinstall old anchors. Reused ticket elapsed includes serverNow minus issuedAt plus document-monotonic time since response. Observed version changes invalidate stale anchors; Undo explicitly reacquires its card before enabling rating.

The next already-loaded card renders after durable capture without per-rating bootstrap/questions fetches. Shared cards still request `shared-cards/ticket`, then iframe `/shared-card/<ticket>`; that document/media latency is separate and remains unmeasured natively. No preload/offline-learning feature was added. At authoritative due/burial boundaries, guarded bootstrap restores eligible learning cards and their anchors; Finish also refreshes due state without blocking exit.

Undo acquires a durable scope-wide capture pause (60second lease renewed every10seconds), drains/reconciles pending ratings with a20second bound, then reloads latest authoritative review and uses existing latest-unchanged Undo. Release occurs in finally. Owner/session guards protect callbacks. Finish preserves the queue. Profile changes dispose/park the old owner's sender. pagehide disposes; persisted pageshow recreates it.

## Actual verification

- `npm ci --ignore-scripts --no-audit --no-fund` passed; test-only fake-indexeddb is pinned6.2.4.
- `npm run check`, `node --check public/review-outbox.js`, `node --check public/review-save.js`, `git diff --check` passed.
- `node --test test/background-review.test.js test/flashcard-followup.test.js test/review-save-lifecycle.test.js test/store.test.js test/app.test.js`: **174 passed,0 failed**,43.2seconds. Log `tmp-corrected-focused2.log` is ignored.
- Latest targeted app events: `node --test --test-name-pattern='BACKGROUND|FB8 actual review|FB14 item4 Undo|Flashcard follow-up|RR-APP delayed' test/app.test.js`: **13 passed,0 failed**. Core file independently:13 passed.
- Tests cover storage failure; reload/account scope; ordered head; simultaneous siblings; malformed matching-hash receipts; lost committed response; lease takeover/stale HTTP; learning exclusions; bound/backpressure; immutable conflicts; trusted clock bounds; Undo ABA; expiry/receipt retention; metadata reopen/backup/restore; rejection tombstones/reload/fresh resolution; selective reused anchors with2050 due fixtures; resumed/superseded clock responses; shared Undo pause; actual app Undo→rerate; rejection→fresh choice; timed learning re-entry. Its boundary test uses an explicitly shortened150ms synthetic due date; production scheduler code remains unchanged.
- JSDOM app events plus real isolated Store HTTP held the first save until after second capture and Finish assertions. Capture-to-next-visible measured16–18ms separately from held backend latency. This is simulated event timing, not physical-device timing.
- Corrected-source native Browser at fresh memory-only127.0.0.1:63481: selected fictional Alex; Start→Reveal→Good painted card2 and pending indicator; Undo restored card1; Reveal→Good worked again; Finish showed1card due. Separate API readback confirmed w-ani repetitions1,generation3,due list onlyw-hu. Browser and fixture server closed. Native loss/reload/multi-tab/rejection/shared-document/device/live acceptance remain unverified.
- Initial-candidate native smoke at63479 is historical; screenshot `tmp/native-review.png`. One intermediate correction test run was stopped after diagnosing JSDOM/native AbortSignal realm mismatch. Harness now bridges signals only at native fetch, preserving DOM abort behavior; corrected174-test run is green.
- Broad `npm test` on initial candidate:1182total,1143pass,28fail,11skip. It discovers WP scripts missing external required paths, unchanged QA eval harnesses missing mountReviewKeys, source-hash git ENOBUFS and other harness failures. One Undo-drain timing failure was corrected. Broad suite is **not green** and has not been rerun after corrections; ignored log `tmp-all-tests.log` preserves results.

Source byte hashes: `docs/BACKGROUND_REVIEW_CORE_HASHES_20261106.json`, including prepared-source hashes. `.gitattributes`, vendor/adapter bytes, scheduler source, card-padding CSS and shared renderer remain untouched. Separate Simple/Complex-control owner/branch was unavailable in the assignment; Lead must coordinate installation.

## Review and next handoff

Architect inspected dc0aae1 and demonstrated five gaps plus the necessary rejected-outcome contract and Undo-pause requirement. Corrected code implements all findings with executable regressions. Final architectural recheck is pending at this checkpoint; installation readiness is not claimed yet.

Lead next: review exact corrected patch, implement WP authentication/strict fields/clock/save/status/rejection normalization while preserving locks, FSRS, UTC filtering and calendar burial; run native shared-document timing and cross-tab recovery; then guarded backups, preservation readback and installations. No main merge or installed behavior is claimed here. User acceptance remains unreported.
