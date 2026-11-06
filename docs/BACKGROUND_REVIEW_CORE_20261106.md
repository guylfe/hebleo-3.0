# Background review core — candidate checkpoint, 6 November 2026

Base: `5924fb54fc78647ecc06b9f2e90b57d29e559e7c`. Branch: `feature/background-outbox-core-20261106`.
Repository: `C:\Users\Trans\.openmausbot\task-workspaces\71c71389-5334-4e0c-9ca8-d80dd28223d1\653fb433-7485-48b1-9f7c-cb22711bda02\hebleo-3\background-review-core`.

This is an isolated app/core candidate. Lead owns WP adaptation, integration, backups and both installations. No main merge, installed runtime update, progress reset, live review, content, media, settings or production write occurred. The existing prototype app scheduler remains unchanged; it is not FSRS. WP retains its own existing FSRS implementation.

## Shared browser API

Load `/review-outbox.js` as a classic script or as an ES module side effect. It sets `globalThis.HebleoReviewOutbox` with `protocolVersion: 1` and `create(options)`. There is one IndexedDB database `hebleo-review-outbox-v1`, with origin-local scope keys `JSON.stringify([siteId, ownerId])`. Never persist transport credentials.

```js
const queue = HebleoReviewOutbox.create({
  siteId, ownerId,                         // authenticated adapter identity
  isActive: () => currentAuthenticatedOwner === ownerId,
  send: (intent, signal) => postIdenticalIntent(intent, signal),
  lookup: (intent, signal) => lookupReceipt(intent.requestId, signal), // receipt or null
  maxPending: 20, timeoutMs: 15000, pollMs: 2000
});
await queue.ready;
await queue.capture(intent);             // transaction COMPLETE, then local advance
queue.snapshot();                        // {siteId,ownerId,pending,overlays,error,blocked,disposed}
queue.excluded(cardId, siblingGroupId, nowUtcMs);
const unsubscribe = queue.subscribe(snapshot => updatePendingUI(snapshot));
await queue.retry();                     // reconcile exact head before identical resend
await queue.reconcile(receipt => authoritativeRefreshHasSuperseded(receipt));
queue.dispose();                         // abort transport, release owned lease, preserve intents
```

`capture` returns a clone of the accepted immutable intent. It never waits for server save. It rejects unavailable/failed storage, inactive scope, duplicate request/card/group and backlog overflow. Strict durability is requested. Browser eviction, user-cleared storage and every possible power failure cannot be prevented by IndexedDB.

Each scope uses one atomic read/write transaction to allocate sequence order and claim both card and sibling group. Sequential sending first checks status; unknown status causes only identical intent replay. Lease ownership, lease generation, head sequence and request identity fence acknowledgment. Dispose does not revoke an HTTP mutation already running; server idempotency supplies that protection. A receipt overlay is persisted atomically with head removal. BroadcastChannel plus bounded polling reconciles other tabs. A pending group stays excluded even when bootstrap is stale. Confirmed card return follows the receipt's due time; siblings stay excluded until the backend's calendar boundary.

```text
Intent (only these fields):
 protocolVersion=1, siteId, ownerId, requestId,
 cardId, siblingGroupId, expectedVersion, rating,
 clockTicketId, elapsedMs

Receipt (shared minimum):
 protocolVersion=1, requestId, intentHash, outcome='committed'|'undone',
 cardId, expectedVersion, resultingVersion,
 acceptedAnswerAt, committedAt, authoritativeSchedule, siblingsUntil
```

UTC times are milliseconds, except `authoritativeSchedule.due`, which is the existing app ISO UTC schedule. `intentHash` is SHA-256 of canonical JSON: recursively sorted object keys, array order retained, JSON scalar encoding. The shared core verifies this hash. WP must normalize its own schedule into this shape; algorithm-specific fields may accompany `due`. App receipts additionally retain legacy `wordId/rating/card`, and `resultingGeneration` for superseded-overlay reconciliation.

## App/backend integration

`createReviewSave({background:true, ownerId, send, isActive, onChange})` in `public/review-save.js` wraps the shared queue. Its `clock()` obtains anchors; `commit({cardId,rating,requestId})` captures elapsed time once. It also exposes snapshot/excluded/retry/reconcile/dispose, bounded `drain()`, `observe(bootstrap)` and `clearOverlays(requestId)` for Undo. The old synchronous save controller remains exported for existing consumers and its lifecycle tests.

- `POST /api/review/clock {}` persists per-card anchors and returns `{anchors,serverNow}`. Anchor fields: site/owner/card/group, expected version, random ticket ID, issued and expiry times.
- `POST /api/review/background <Intent>` authenticates the existing demo identity, locks via SQLite BEGIN IMMEDIATE, looks up matching immutable receipt first, validates scope/CAS/eligibility/clock, schedules with the existing algorithm and accepted answer time, and commits state, monotonic generation and receipt together.
- `GET /api/review/status?requestId=...` retains the existing `{receipt:null|Receipt}` shape. Receipts are not count-evicted; matching committed/undone receipts recover after ticket expiry.
- Bootstrap adds `reviewVersions`; generations, accepted answer times and clock tickets are additive learner metadata included in backup/restore. Metadata is validated during restore. No destructive migration or format change is required.

Engineering bounds: 24-hour ticket lifetime; elapsed input must be finite, nonnegative and at most 24 hours. Candidate answer time is ticket issue time plus immutable elapsed, floored to UTC milliseconds. More than two minutes ahead is rejected; a small future discrepancy clamps to trusted now. Server clock regression and answer-before-last-review are rejected. Card due and burial checks remain authoritative. Review/Undo both advance a generation that Undo cannot restore. A five-minute document anchor requires refresh and a second rating choice; visibility resume reacquires an anchor. Tickets bound client input; they do not prove actual human answer time. Anchor storage is capped at 10,000 tickets per learner and expired tickets are pruned on anchor issuance.

App capture removes the rated card and siblings locally, then renders the next already-loaded card. No bootstrap/questions request occurs for each rating. Shared cards still request `shared-cards/ticket`, followed by the `/shared-card/<ticket>` iframe document; this is a distinct next-card loading path. No preload was added: ordinary synthetic cards advanced in 16–18 ms under a held save. Native shared document/media latency has not been measured, so no improvement is claimed for that path.

Undo waits for queue drain (20-second bound), then reloads authoritative latest review and calls existing Undo. Owner/session guards prevent its callbacks from acting on a reopened session. Finish exits the view while the queue continues. Profile changes dispose the old sender and create the new owner's scope; old intents remain parked. pagehide disposes; persisted pageshow recreates the sender.

## Actual verification and limits

- `npm ci --ignore-scripts --no-audit --no-fund` passed. `fake-indexeddb@6.2.4` is pinned, test-only.
- `npm run check`, `node --check public/review-outbox.js`, `node --check public/review-save.js` passed.
- `node --test test/background-review.test.js test/flashcard-followup.test.js test/review-save-lifecycle.test.js test/store.test.js test/app.test.js`: 166 passed, 0 failed (40.3 seconds).
- After later owner/session callback guards: `node --test --test-name-pattern='BACKGROUND|FB8 actual review|FB14 item4 Undo|Flashcard follow-up|RR-APP delayed' test/app.test.js`: 10 passed, 0 failed.
- Core tests cover unavailable storage; independent durable capture and ordered send; reload and wrong-account scope; simultaneous sibling capture; mismatched receipt hash; committed response loss; lease takeover with stale unabortable HTTP; learning-return exclusions; bound/backpressure; clock rejection; immutable request conflict; Undo ABA; expired ticket/retained receipt; SQLite reopen and metadata backup/restore. HTTP tests use isolated synthetic learners only.
- Real app events over isolated Store HTTP cover held backend response, two captures before save, Finish retention and drain/Undo, lost committed response/status-only recovery, and storage failure retaining revealed card. Simulated capture-to-next-visible measured 16–18 ms while first HTTP save was deliberately held until after assertions. These are JSDOM event/HTTP measurements, not physical-device timing.
- Native Browser smoke at isolated memory-only `127.0.0.1:63479`: Start → Reveal → Good painted card 2 with `1 review pending`; indicator later cleared; Finish showed one card due and Undo. Screenshot copied to ignored `tmp/native-review.png`. This was an intermediate candidate smoke, not final-build/native reload, multi-tab, shared-card renderer, device or live acceptance.
- Broad `npm test`: 1182 tests, 1143 passed, 28 failed, 11 skipped. It indiscriminately discovers WP fixtures missing required external paths, stale QA eval harnesses missing `mountReviewKeys`, source-hash checks (`git ENOBUFS`) and other existing harness problems. One old app Undo drain timing failure in that run was corrected by bounded drain waiting and the targeted regressions pass. Broad suite is not green; failures are not silently counted as passing. Exact log is ignored `tmp-all-tests.log`.
- `.gitattributes`, vendor/adapter bytes, scheduler source, card padding CSS and shared renderer were not edited. No owner/branch for the separate Simple/Complex-control thread was available in this assignment; Lead must coordinate before installing.

## Remaining protocol review

Candidate is not yet an installation-ready release. Architect must inspect the implementation, especially permanent CAS/expiry rejection recovery. Current conservative behavior retains a rejected head and shows recovery/backpressure; retry never changes its ID, expected version or captured answer time. Transport failure and lost commits recover automatically/on Retry. A permanently rejected head currently needs explicit support reconciliation; there is no silent discard API. Agree the smallest durable rejection/tombstone contract with Lead/WP before final readiness.

Lead next handoff: review exact patch, adapt WP authentication/strict allowlist/status/save protocol, preserve note locks/UTC query semantics/FSRS/calendar burial, run native shared-document timing and cross-tab recovery, then perform guarded backups/preservation readback and installations. User acceptance remains unreported.
