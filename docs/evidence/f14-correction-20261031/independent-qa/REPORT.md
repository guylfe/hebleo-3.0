# Independent preinstall recheck — PASS within the two-regression gate

31 October 2026. **QA-F14-STATE-01 CLOSED; QA-F14-META-02 CLOSED** on integrated `0e874af56765ce16b929b1aa55974f121a86f8c3`. No new blocking defect found in this bounded review. Lead may proceed through the separate UX/install gates. No installation or user acceptance is claimed.

Target: `C:\Users\Trans\.openmausbot\task-workspaces\8c900356-50f6-4d41-bbb9-50c8abe09233\008af79a-cda6-4a4c-bd78-8ad492a6a44e\hebleo-combined`, branch `fix/first2-combined-20261031`. Inspected correction `4104fb35e577b974d76dc9b73bc438e2e28fd734` plus integrated rendered/dock correction `699e9951202e6368647ce77dbba7cfb895579810`.

All new artifacts are under `C:\Users\Trans\.openmausbot\task-workspaces\71c71389-5334-4e0c-9ca8-d80dd28223d1\653fb433-7485-48b1-9f7c-cb22711bda02\hebleo-3\qa-first2-recheck-0e874af`. Product source, original harness/report, shared checklist and installed state were not edited. No commit/push was made from the shared checkout; Lead owns integration of this evidence.

## Exact identity

Archived the exact integrated commit with `git archive --format=zip --output=<review>/candidate.zip 0e874af56765ce16b929b1aa55974f121a86f8c3`, then `Expand-Archive` into disposable `candidate/`. Dependencies are junctions to existing dependency trees; no network install. The extracted archive initially differed only in line endings for four executable files; copied those four from the clean exact checkout before the final runs below. **All 125 executable files now match the runtime manifest byte-for-byte.** The actual app harness helper is the only extra test helper added inside the snapshot.

`node identity.mjs` fetched only `GET http://127.0.0.1:63472/api/build`, verified revision, all manifest hashes against the original checkout and isolated snapshot, and recomputed the manifest digest. Runtime SHA-256: `524058a51ac9600a294e6642d5eefa1e8e76538287e0a4bb0c5ff859388d190a`. Receipt: `IDENTITY.json`; final `identity.log` has zero archive differences. Shared 63472 was never mutated; no Browser was used. Installed 63358 was not contacted or mutated.

Original `independent.test.mjs` is unchanged, including every assertion and import path: SHA-256 `ff2e212f41cc4792cc4dc7cfd4f5f96b458121fceefc4323bb3b116939e45a5e`, identical to the prior review's file. `node prepare-harness.mjs` exports only the existing actual-app boot fixture from candidate `test/app.test.js`. This executes actual app modules in JSDOM with actual loopback HTTP, not native Browser/visual evidence.

## Commands actually run on the final byte-exact snapshot

| Working directory / command | Result / log |
| --- | --- |
| Review: `node --test independent.test.mjs durable-http.test.mjs` | **5 passed, 0 failed**, `final-independent.log`: all four unchanged original cases plus new durable HTTP/Store probe. |
| candidate: `node --test test/workspace-save-regression.test.js test/rendered-author.test.js test/author-review.test.js test/draft-api.test.js` | **33 passed, 0 failed**, `final-focused.log`. |
| candidate: `node --test --test-name-pattern='F14\|FIRST2\|UXI13-0[1234]\|departure' test/app.test.js` | **20 passed, 0 failed**, `final-app.log`. |
| Review: `node identity.mjs` | PASS, 125/125 exact manifest entries and expected runtime. |
| Lead checkout: `git diff --exit-code 021dc19ae0e9f7cb3b5cfb4afcc6984a5c7600b3 0e874af56765ce16b929b1aa55974f121a86f8c3 -- src/store.js src/author-review.js src/immutable-context.js content` | Exit 0; accepted recovery owners/content unchanged. |
| Lead checkout: `git diff --exit-code 4104fb35e577b974d76dc9b73bc438e2e28fd734 0e874af56765ce16b929b1aa55974f121a86f8c3 -- public/studio/workspace.js src/store.js src/author-review.js src/immutable-context.js content` | Exit 0. Clean checkout confirmed, final HEAD unchanged. |

Counts are separate suites, with some overlapping behavior; do not present them as unique coverage. Earlier passing runs on the archive with normalized-equivalent line endings remain in `independent.log`, `focused.log`, `app-focused.log`.

## Closure and preservation evidence

**QA-F14-STATE-01:** original departure Save → Studio edit B → departure Save → inline reentry → unchanged inline Save passes. Inline displays B and persisted draft remains B; original published revision stays unchanged and raw buffer count is zero. `stale-buffer-repro.json` contains actual before/after strings. Collector receipts capture the submitted key/value pairs and remove only equal current raw values after successful save. Reads do not acknowledge inputs. Newer pending edits, detached collectors, unsent comments and rejected saves retain state.

**QA-F14-META-02:** unchanged original own-`__proto__` merge/Store case passes. Merge reads own fields and uses `Object.defineProperty` for own output fields; direct result retains the normal prototype. Nested `__proto__`/`constructor`, deletion, null and arrays pass permanent tests and independent on-disk readback. `metadata-repro.json` and `DURABLE_HTTP.json` capture results.

Independent durable probe uses a synthetic file-backed Store and real loopback HTTP. Save A completes after the collector detaches while newer raw B remains dirty. A competing HTTP save then causes stale B to return **409**, with **every table unchanged**, raw B retained and no extra acknowledgment. Explicit disjoint reconciliation saves B and the competing source change; acknowledgments are exactly `[A,B]`. Closing/reopening the database retains the full saved draft/token and all unaffected table rows. Before/after unaffected-table hash is `3ca588e6219f5b3028e67cf2752487093528ae8d51a22492bc89f7aa8aca8948` (all tables, excluding only the deliberately changed `kv.draft` row). Active revision, learners, events, historical revisions, review/media/settings rows are preserved.

Permanent rendered tests additionally exercise retained source/comment buffers on injected **400/403/409/503** save failures, pending newer edits, private quote/block notes, learner exclusion and unchanged learner state. Those four error responses are injected transport failures, not evidence that four real services failed. Real HTTP stale-CAS/overlap checks are independent and assert no silent overwrite/atomic rejection.

## Explicit boundary and unresolved limits

**Reserved keys are preserved by merge/Store, but HTTP rejects them.** `parseStrictJSON` in unchanged `src/source-utils.js` rejects `__proto__`, `constructor` and `prototype` anywhere in a request. The first new durable probe incorrectly combined HTTP acceptance with the Store regression and received 400 `Malformed JSON`; retained in `durable-http-initial.log`. Corrected the probe to verify that refusal atomically, then independently exercised reserved-key persistence through Store. Final durable test explicitly asserts **400 with every table unchanged**. Closure does not promise end-to-end HTTP authoring/import of such reserved-key metadata; if an existing draft contains those fields, its whole-workspace HTTP save remains blocked by that earlier contract. No claim current human-authored data contains those fields; no parser policy changed.

Reused the accepted full-data recovery report at `candidate/docs/evidence/first2-combined-20261031/independent-review/REPORT.md`: six complete HTTP comment/save cycles, stable 85,510,917-byte recoveries, legacy migration, preserved private contexts/media/learner state and atomic malformed/conflicting restore rejection. Read the report and verified recovery-owner/content diffs above. **The approximately 25-minute full-data recovery harness was not rerun.** No complete candidate/schema/runtime/CI run was repeated; those remain separate supplied evidence, not this review's execution.

No new mounted-Browser, narrow viewport/200% zoom, physical-device, OS clipboard, screen-reader or Guy acceptance evidence. UX owns native review. Four isolated human consonant recordings remain separate. No production, WordPress, purchases, publication, source-pack/curriculum/audio, main branch or installed learner data was changed. This bot has no automations (read back during review).

Lead owns the next action: use a fresh consistent installed-state snapshot and the reviewed executable; never install any QA/UX disposable database. Verify final served manifest including the rendered-source helper, expected reader/content/draft identity, complete before/after preservation receipts and same-build restart. Apply the existing authorized preservation/install policy; these tests neither restart nor reset the installed demo. Preserve matching before-update executable/database for recovery; a reader-9 downgrade over reader-10 data is not a recovery path. Keep installation/readback, native UX and Guy acceptance separate from this bounded preinstall PASS.
