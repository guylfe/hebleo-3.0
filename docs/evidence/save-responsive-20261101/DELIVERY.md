# UX01 Save responsiveness candidate — 1 November 2026

Isolated checkout: save-responsive-20261101 under Feature Engineer's assigned repository. Branch fix/save-responsive-20261101, exact base2490bcfd866a513451c9d80f7a815f609519e465. No edits to Lead's checkout, main, curriculum, live63358, source-auth configuration or media. Lead owns integration, independent deltas and installation. No Guy acceptance or independent review is claimed.

## Implementation

workspace.js is the single full D/base/CAS owner. Owned immutable snapshots protect submitted, baseline, published and app draft aliases. Public full reads remain detached. field-patch.js copies only existing lesson/block/page paths; inline collectors and post-Save refresh read only the current lesson. Unknown JSON keys, metadata, exact source and all other23D branches survive. Full publication algorithms/transaction/recovery and backend content validation are unchanged. Server delta adds only four static JavaScript assets; no API route, schema, runtime identity or entitlement semantics change.

Save immediately announces pending, yields through a paint opportunity, waits for all settlers, captures collector/model receipts and the serial, and passes the frozen complete input to a one-shot module worker. The same complete client index derivation and identity/curriculum/composition validators run there. Exact publication-status comparisons and JSON encoding also run there. Immutable Blob bytes reach Fetch without re-encoding or copying a26MB typed array on the UI thread. The worker has no retained dataset, cache, network operation or write authority. Only the existing full-D POST commits. Worker failures retain original pins/buffers with no automatic write/retry. Node/non-Worker harness fallback still runs all validators.

Inline prose, title, Advanced source and unsent comments remain editable during private Save. Navigation/Preview/review and duplicate Save remain guarded. Acknowledgement retires only submitted entries/models; newer edits remain dirty. Current model, caret and Undo are not remounted. Full publication locking and deliberate Save/Preview/Publish separation remain.

## Phase profile: tool/client and HTTP, not native

Fresh read-only VACUUM copies each contain23 lessons /26,632,089 JSON bytes, same original draftbcf972cf542eae85622b41f8212a4b98cac1515994b2b4db3f3c5493836c09f2 and logical sourcef71259b6ba84e81f24373218a031b7e69a5abbef8936143babea2edfe2cb444f. Full inline controller in JSDOM, real loopback HTTP and (after) actual worker thread. Before imports exact Lead base source, verified against Git blobs after normalizing checkout CRLF. App adoption mirrors each implementation. No artificial corpus padding, trimming or editor-final-review DB is used here.

| Phase ms | Before | After |
|---|---:|---:|
| Save start to submit callback |958.23|565.43|
| Main request encoding |79.86|0.0006|
| HTTP + receipt parse |2392.53|2230.70|
| App snapshot adoption |364.76|0.0004|
| Complete inline Save |4238.61|2806.81|

Before records five full UI workspace copies:318.43,327.82,298.95,364.75,427.11ms, plus main JSON encoding79.85ms. After records zero full UI workspace copies/serializations. Worker validation5.16ms, encoding108.30ms, exact status comparison1.00ms and Blob construction3.72ms. Callback preparation includes worker startup/snapshot transfer and small collection work; it is not a pure CPU duration. Main thread still performs a structured worker snapshot transfer. No mutable Store cache or server validation removal accounts for these differences. HTTP times vary with machine workload and are not native timings. Raw profiles are client-http-before.json and client-http-after.json; each asserts complete expected D, active content and original source receipts exact.

## Native measurement

The FULL UX review supplied by Lead reports original-size trusted Saves9809.4/10497.2ms; firstRAF3205.9/3502.8ms; draft request start2479.2/2727.1ms and resource6062.6/6592.6ms. Those are independent prior measurements on the same original corpus, not fresh randomized before samples.

Exploratory mounted Browser, own disposable63482: a native15-character synthetic prefix then one character retained the full corpus. Typed-array transport Save3817.8ms, feedback1.3ms, firstRAF11.3ms; adjacent long tasks314/495ms produced800ms maximum frame gap. Switching transport to immutable Blob yielded3116.4ms, feedback0.5ms, firstRAF11.9ms, max frame gap249.9ms and one272ms Long Task. Draft resource start917.7ms/duration2195.8ms. Same rich DOM and editable state retained. These early runs precede the code commit; final exact committed run is recorded in the evidence follow-up.

Timings use passive trusted-click capture, status MutationObserver, requestAnimationFrame, Long Task observation and Resource Timing; no forced click/input or function wrappers. FirstRAF is a callback proxy, not a presentation/paint measurement. Small localhost samples, uncontrolled external workload and sub-second snapshot-transfer jank remain. No Guy-approved threshold is inferred.

## Verification and limitations

Required candidate syntax +1035 configured candidate tests PASS after binary-body test shims were adapted; assertions are unchanged. Eight new tests execute the actual browser worker entry in a real worker thread, including26MB/23 lessons, exact wire/body and detached/frozen alias protection, atomic source patch refusal, late preparation/HTTP input and400/403/409/503/worker failures. An additional real inline-controller test verifies editable source during Save, submitted exact content, newer rich text and unsent comment retention. Existing settlers/IME, submitted collector receipts, newer StudioB, Undo exact source, reserved JSON keys, lost receipts, reconciliation, publication receipt/visibility and recovery tests remain in the complete candidate suite. These are engineer-run checks, not a fresh independent reviewer verdict.

Schema27 and runtime9 PASS; local editor rebuild PASS with no semantic vendor diff. Initial build's sandbox parent-directory read failed; the authorized unrestricted local build passed. Static premium audit reports the same three pre-existing delegated-button detector findings: lesson-editor.js:30 handlers at41 and media-picker.js:15 handler at23. They are outside the changed files and have real handlers; strict static audit is not labelled PASS. No new static finding in the touched implementation.

Exploratory read-only DB verification equals the explicit expected entire23D with only the two native insertions. All non-draft KV/private data, full revisions, media blobs/aliases, events, schema and sequence are exact. Only author-demo navigation/progress differs; the original source is exact. Never install these disposable synthetic profiling stores.

Native physical Hebrew composition/IME, clipboard, assistive technology, narrow/200% zoom, mobile, burst-input distributions and failure injection remain unverified. Initial Browser click used an unsupported argument and did nothing; another click was rejected because its stored reference could not be verified. Refreshed snapshot and verified semantic selector succeeded; no desktop fallback or bypass was used. No production/publication/install, audio work, source curriculum edits or real learner operations occurred.

Reproduce phase measurements with node scripts/profile-inline-save.mjs <original.sqlite> before <exact-Lead-checkout> and after. Each source is opened read-only and copied into a fresh ignored tmp file. serve-save-responsive.mjs starts an equally fresh preservation-only candidate, without startup reset; verify-save-responsive.mjs checks expected whole-D insertion and all non-progress state read-only. Lead's next handoff: integrate exact code, obtain fresh independent UX/QA/RR on the integrated build and source copy, then decide guarded installation. Guy acceptance remains Pending.
