# UX01 private Save performance candidate

Isolated clone `save-latency-20261101`, branch `fix/save-latency-20261101`, exact base `c5c62e76efbf167f8a155d888623f8dd8749190a`. Lead integrates; no main change, live Save/publication, installation, WordPress, curriculum or audio work. Independent QA/UX/release delta and Guy acceptance remain pending.

## Behavior and compatibility

Private Save still sends the entire collected workspace through full validation, identity/lexical transitions, media planning, source hooks, CAS and one transaction. It no longer calculates publication impact first. Selected lesson review/commit/recovery and the c5 publication receipt guard are unchanged. Review still checks dependency scope, human approval, eligibility and exact tokens; publication remains an explicit separate operation.

`POST /api/studio/draft` optionally accepts `Prefer: return=minimal` and replies with `Preference-Applied: return=minimal`. Its JSON contains the same `baseRevisionId`, `draftToken`, `unchanged`, `mediaWarnings` fields. It omits the expensive publication preview. Without the header both Store/API response shape and source-authoring callers retain the existing full response. The internal opt-in is `Store.stage(input, sourcePermit, {returnMinimal:true})`; the source permit remains the second parameter. The complete D is validated identically in both modes; there is no partial-save authority or new schema/identity.

The app requests this receipt, adopts a detached copy of its submitted full D, and invalidates history/impact summaries. It does not GET Studio or silently refresh a stale token after Save. Changes & history loads current saved summaries when opened and refuses to adopt a response with different current owner pins or an operation pending. Counts from a prior Save are cleared. Inline editor/model/history and private comment state remain mounted. Studio preserves its import lock; import-specific reload remains unchanged. Collector receipt callbacks still acknowledge only submitted values/models; late/newer edits, IME settlers, unsent comments and failure buffers retain their existing semantics.

Collection avoids a redundant full clone before preparation, an unused Studio collection clone, duplicate unified/coordinator impact and duplicate preparation. Inline patches already receive a detached snapshot and no longer clone it again. Stage reads its current draft once inside the transaction for both CAS and comparison, with no returned mutable Store cache.

## Actual-size HTTP measurement

`scripts/profile-workspace-save.mjs` opens the original database read-only, obtains a consistent receipt, VACUUMs into its own new ignored `tmp/` file, and only opens that copy with Store. Each run uses a new copy. It records another live receipt afterward and requires equality. Reports contain counts/hashes, never lesson/private bodies or learner rows. All runs used 23 draft lessons / 26,632,089 content JSON bytes and changed one title character. Full draft JSON readback equaled exactly that one-character change; active content remained exact.

| Run | Full owner Save ms | Impact HTTP+parse ms | Draft HTTP+parse ms | Studio GET+parse ms |
|---|---:|---:|---:|---:|
| Original base before change | 25,455.72 | 6,809.47 | 11,639.56 | 4,628.66 |
| First compact run, other tests concurrent | 10,630.00 | none | 9,416.58 | none |
| Compact run without another local suite running | 5,599.30 | none | 4,721.65 | none |

The uncontended after run is 78.0% lower than the before run and under the practical 10-second target. The first after run exceeded it; this is not a latency guarantee. The before and after are separate process runs, not randomized statistical distributions. Other machine workload is uncontrolled. Initial HTTP results exclude native editor/DOM/render time, network outside localhost and automation-tool wall time. UX's previous native 37,858.8ms measurement remains separate evidence.

Before phase details: request serialization impact202.23ms + draft217.90ms; Store impact4,712.20ms and stage8,942.00ms. Three publication previews cost5,146.15ms inclusive. After uncontended: request serialization153.02ms, Store stage3,180.77ms, no impact/preview/Studio GET. Remaining owner time724.63ms covers collection/preparation/receipt acknowledgment. Store method timings are inclusive and must not be summed; their counters also include final verification readback, which is outside the reported Save interval.

Reproduction from the isolated clone (the before run used the original c5 modules before edits):

```
node scripts/profile-workspace-save.mjs <original-read-only.sqlite> before default
node scripts/profile-workspace-save.mjs <original-read-only.sqlite> after minimal
node scripts/profile-workspace-save.mjs <original-read-only.sqlite> after2 minimal
```

Never use or install any generated profiling database: each deliberately contains a synthetic title marker. Native measurement and final required-check receipts are recorded in the follow-up evidence checkpoint.

## Regression scope

New executable coverage: compact/default equivalence and no-op write preservation; 26MB/23-lesson exact complete HTTP save/readback; atomic stale base/token, missing token, unauthorized, identity/composition and reviewed-token refusals; source/media hook failures; 403/409/503/lost response retaining exact buffers and original pins without automatic impact/reload. Real pending/offline source header tests run both response modes, before and after restore. Existing selected-publication client tests now save with compact receipts, including malformed publication receipts, late buffers and later Save on adopted publication pins.

App tests hold the actual POST receipt after server commit instead of the removed GET Studio. The earlier independent post-save-reload failure regression is adapted to a lost post-commit receipt, preserving its no-publication/no-discard assertions. The NEW7 Save test now proves one full CAS write without mandatory publication impact, while keeping stale-CAS sibling retention. Publication-impact/dependency tests themselves remain. Original QA-F14 state/metadata and malformed-publication matrix remain intact. These are implementation-maintained checks, not a new independent reviewer verdict.

## Limits and handoff

The default full Studio GET/history/impact path remains expensive; this change removes it from private Save. Full D upload/parse/hash/validation is still proportional to workspace size. No backend content validation is skipped. No physical IME/mobile/paint acceptance, fresh independent QA/UX/release verdict or installation is claimed here. Lead owns integration and fresh independent deltas before a guarded code-only install against the latest original data.

## Required checks at code checkpoint

Executed on the changed candidate: 
- npm ci --offline --no-audit --no-fund; npm ci --prefix schemas --offline --no-audit --no-fund.
- npm run verify:candidate: syntax check PASS; 1,027 candidate tests PASS (88 files; configured audio/speed/playback exclusions remain, zero skipped matching tests in this run).
- npm test --prefix schemas: 27 PASS.
- npm run runtime --prefix schemas -- --runtime ..: nine PASS, ephemeral HTTP/memory Store.
- npm run build:editor: PASS; regenerated vendor artifacts have no semantic Git diff.
- git diff --check: PASS.
- Focused adapted NEW7/QA checks:42 PASS. Focused app receipt/import/queued-publication checks:4 PASS. New compact tests:9 PASS.

The first candidate run started before the schema dependency installation completed and hit missing AJV imports, plus two old reload/impact assumptions. Dependencies and the described regressions were corrected; the full required candidate run then passed1,027. Runtime commands initially omitted --runtime and then used the schemas directory; the final command above passed. The editor build initially hit sandbox parent-directory read limits; the authorized local build passed outside that sandbox. No compiler/package behavior was changed to bypass those errors.

## Final evidence checkpoint

Code commit6499ec6d70738563d2a73554cbad5211ce4db406 was privately pushed and exact remote branch head read back. A second uncontended fresh-copy run completed in6,477.77ms (draft HTTP+parse5,432.97ms; request serialization218.63ms; Store stage3,572.86ms). The two uncontended full owner Save samples are5.60s and6.48s versus25.46s before:74.6–78.0% reduction. Both are under the practical10s target; these small HTTP samples do not guarantee native latency. Every run passes complete draft/active/source-receipt preservation.

Mounted Browser navigation to the fresh disposable63476 candidate was refused because another thread was using that Browser. There were zero browser actions, zero native Saves, and no fallback onto the host browser. The unused disposable copy was verified logically identical at graceful server shutdown; source remained unchanged. Native click-to-saved timing on the final candidate remains unverified and is the UX handoff. Exact candidate runtime54bf97567139a43529643f0e47abba877c56b9eac776593652ab85e49795dd8e / backend74dc64579a1c5cf5ac5bdf1f03ba10d9b91bdd8c5102489b46ae9c2c4d1a48cb. These are prepared candidate identities, not installed identities.

Raw safe HTTP measurements/receipts are the four http-*.json artifacts beside this file; verification.json records exact successful commands/counts and local raw-log paths. native-availability.json records the browser limitation. No related automations exist. No independent QA/UX/release verdict, CI verdict, live installation or Guy acceptance is claimed. Lead next: integrate the exact code commit, request focused native UX and QA/release deltas (Save failure/late model/source integrity), then apply its normal guarded installation process against fresh original-data receipts.
