# Independent Release verdict — corrected E10

2026-10-22. Assignment cba94c4d-6372-44aa-be60-b35faa467fac.

**PASS for the bounded E10 contract/data-integrity gate on the exact candidate below. No blocking contract defect found. Native interaction, Guy acceptance and production readiness are not passed by this report.**

This completes the previously unfinished Release review. The earlier partial inspection supplied no executed Release verdict. Current results below were executed independently; Lead's 760/760 narrative is not counted as this review's evidence.

## Candidate and isolation

- Reviewed commit: `b67b67b3838fa37f38798946ec24ccb16522a7bd` (lead/e10-all-families candidate).
- Runtime SHA256: `7a36d01f9aff186f1fafdb752d3e4bd5e10820eddde2f016d40b1c91a09989ed`.
- Backend SHA256: `f94b21150dcf6d91efd06ceffd30f67647fdbcbaf2cf941ff29a1cc20c8f96e4`.
- Source byte authority, read only: `C:\Users\Trans\.openmausbot\task-workspaces\8c900356-50f6-4d41-bbb9-50c8abe09233\81ef9333-a70f-4499-a9b5-ceff786de852\runtime-app`.
- Independent checkout: `C:\Users\Trans\.openmausbot\task-workspaces\71c71389-5334-4e0c-9ca8-d80dd28223d1\653fb433-7485-48b1-9f7c-cb22711bda02\hebleo-3\release-e10-b67b67b`.
- Created by local `git clone --no-checkout --no-hardlinks`, configured `git config core.autocrlf true`, then `git checkout --detach b67b67b3838fa37f38798946ec24ccb16522a7bd`.
- Node `v24.19.0`. Both package installs used `npm ci --offline --ignore-scripts` (application and schemas).
- `executableIdentity(process.cwd(), expected.revision)` was deep-compared with CORRECTED_BUILD.json before and after tests: all **101 executable file hashes**, aggregate runtime hash and backend hash matched. The verified copy is `release-e10-b67b67b-verified-build.json` beside this report. No normalized hashes substituted for bytes.
- `git diff --exit-code 065197a74194eb8b5149bcf3d79b8f312cf26acd HEAD -- src schemas public/exercise-bindings.js public/post-answer-vocabulary.js public/studio/exercise-bindings-editor.js`: passed, no changes. Correction runtime changes are learner-view.js and vocabulary-reminder.js.

No owner runtime or database was contacted, restarted, installed, or inspected. All stores were synthetic/in-memory; HTTP servers used disposable loopback ports. No canonical vocabulary/mappings, source curriculum, learner records, production services or configuration changed. GitHub branch tip was not independently queried in this review; commit and byte identity were verified locally.

## Commands actually executed

Commands below ran from the independent checkout unless specified. Logs are in its parent directory alongside this report.

| Command | Actual result | Log suffix (prefix `release-e10-b67b67b-`) |
| --- | --- | --- |
| `npm run check` | Syntax passed | `syntax.log` |
| `node --test test/exercise-bindings.test.js test/studio-exercise-bindings.test.js test/answered-bindings.test.js qa-tests/e10-independent.test.js qa-tests/ux-feedback-transit.test.mjs qa-tests/ux-learner-feedback-transit.test.mjs` | **68/68**, no failures/skips; includes 482 exhaustive Unicode span cases within one QA test | `focused.log` |
| `node --test --test-name-pattern=E10 test/app.test.js` | **6/6** actual HTTP app scenarios, correct/incorrect ordering/cloze/transformation, in-place/restored cards | `app.log` |
| `node --test release-probes/contract.test.mjs` | **7/7** new independent Release probes | `independent.log` |
| `npm test --prefix schemas` | **27/27**, no failures/skips | `schemas.log` |
| `node --test schemas/checks/contracts.check.mjs` | **18/18**; these are also included in the 27 above | `contracts.log` |
| `node schemas/tools/validate.mjs --seed --runtime .` | Accepted; inputUnchanged true | `seed.log` |
| `node schemas/tools/runtime-check.mjs --runtime .` | **9/9**, including HTTP, stale Stage/preview/publish/rollback CAS, no-write rejection | `runtime.log` |
| `git diff --check` | Passed | Terminal evidence |

Total distinct test cases across the focused, app, added Release and schema runs: **108 passed**, plus **9 runtime scenarios**. The 18-contract rerun is not additional unique coverage. The full 760-test candidate suite was not rerun; this was a focused contract gate.

One initial added-probe run was **6/7** because my synthetic 12,000-character prompt hit the pre-existing prompt-length limit before reaching the intended binding boundary. The fixture was corrected to use the context surface; candidate implementation did not change. The first transcript is retained as `independent-fixture-error.log`; the corrected 7/7 transcript is separate.

## Findings and evidence

| Boundary | Verdict and actual evidence |
| --- | --- |
| Optional occurrence records | PASS. All six supported families retain unbound behavior. Per-exercise IDs, exact runtime word ID, allowed fields and array-only indices are validated. Unknown properties, unsupported surfaces, ambiguous/missing targets, duplicate occurrence IDs, stale snapshots and overlapping ranges reject. References are never inferred from spelling. `public/exercise-bindings.js:32`; focused contract/Studio/schema tests. |
| Unicode and bounds | PASS. UTF-16 slices must equal the authored source exactly and begin/end at grapheme boundaries. QA exercises 482 ranges including Hebrew marks, emoji/ZWJ, flags, combining marks, bidi and CRLF. Added Release probe accepts 500 adjacent occurrences and a 12,000-unit source; rejects 501, 12,001, scalar index null, unknown keys and absent Intl.Segmenter with unchanged tables. Existing per-field content limits continue to apply. |
| Answer withholding and pinning | PASS. Public exercise answers and answer-binding bytes are withheld; result projections derive from the exact grading revision or saved draft. Session/replay after later publication and backup/restore retain original bindings, vocabulary notes, verdict and raw answer. Learner mounting checks revision/exercise/lesson and route/result lifetime; rehearsal owns the exact draft token and generation. `src/store.js:255`, `:276`, `:317`; `public/post-answer-vocabulary.js:96`. |
| Authored answers versus deduplicated grading | PASS. Added probe uses authored answers `[alpha, alpha, beta]`, binds original indices 1 and 2, and confirms grading reduces acceptedAnswers to `[alpha, beta]` while rendered links retain indices 1 and 2, correct IDs and exact sourceText. No lookup into the deduplicated array by authored index. Raw submitted text remains plain. `public/post-answer-vocabulary.js:8`, `:66`. |
| Prepared duplicate/prefix tokens | PASS. Added probe links two identical original tokens to different word IDs, checks distinct prepared positions and prefix index against actual tray positions, and rejects movement of a differing row. Existing tests cover pre-answer withholding, distractor separation and rendered token identity. |
| Managed, Source and form denial | PASS. Bound IDs go through lesson-scoped Learned eligibility; pending identity/display, conflicts, missing introduction, duplicate managed identity and noVocab cannot fall back to the legacy entry. Source records are excluded. Added probe confirms locked forms contain neither value nor values while eligible forms remain available. `src/exercise-vocabulary.js`, `public/lexical-runtime.js`. noCard alone keeps its existing review-only meaning. |
| Imported receipt authority | PASS with explicit scope. Added probes forge answer links inside a backup receipt, then restore after a newer publication. Resumed feedback and idempotent replay regenerate original pinned links, or no links for an unbound exercise. Grade/raw answer remain intact and viewing/replay changes no table. Imported extension bytes can remain in archived learner receipts; they are ignored as card authority, not globally scrubbed. Future consumers must retain this response-projection boundary. `public/exercise-bindings.js:99`. |
| Dependencies, deletion and propagation | PASS. Binding-only targets enter dependencies, affected lessons and reused lesson composition. Published edits reach current sessions; pinned sessions retain prior content. Deleting a referenced word rejects atomically; removing/rebinding the occurrence in the same valid draft permits deliberate deletion. Rollback restores bindings and vocabulary. `src/store.js:232`, `:497`; focused suite and added CAS/delete probe. |
| Stage/CAS/publish/rollback/restore | PASS. Binding edits change draft tokens. Stale Stage, publish and rollback reject with 409 and all-table equality. Current and historical malformed binding snapshots reject restore without writes. Valid restore remaps pinned revisions coherently. HTTP checks cover author boundaries, malformed input and newer drafts. `src/store.js:442`, `:528`, `:538`, `:588`. |
| Viewing/rehearsal writes and corrected feedback lifetime | PASS within executed scope. Store/table equality checks cover grading rehearsal, card views, saved feedback and replay. Corrected independent QA/UX transit cases pass; feedback owner remains visible while its card is open, disclosure Escape precedes card Escape, exact trigger focus returns, and subsequent outside focus dismisses. These are DOM/HTTP checks with geometry stubs, not native acceptance. |

## Nonblocking limitation: external identical row swaps

**Acceptable for this local milestone under the documented array semantics; no blocker.** The exercise row identity is field/index inside a revision. A binding separately has its stable occurrence ID and exact source snapshot. Swapping two identical strings in an external edit produces the same serialized content; there is no distinct row object to follow. My probe verifies that this operation is byte-identical and preserves index semantics; swapping differing strings rejects.

Studio row-removal protection was executed for both tokens and answers: removing an earlier row marks affected bindings stale even when the replacement text is identical, prevents saving, and requires explicit rebind/removal. Rebind retains occurrence IDs. See `public/studio/exercise-bindings-editor.js:148` and the two row-removal tests in `test/studio-exercise-bindings.test.js:140`.

This does not guarantee semantic identity through external duplicate deletion/reordering. External editors/importers must preserve or deliberately rebind positional occurrence references. If rows later gain distinct metadata, automatic reorder/merge behavior or cross-source identity, add stable row IDs and an explicit migration before promising identity preservation. No silent heuristic relocation is acceptable.

## Remaining gates and handoff

- Native browser profile consent/connection is still pending per the supplied handoff; it was not attempted or bypassed here. Native pointer/keyboard defaults, RTL/Nikkud rendering, viewport/scroll positioning, screen reader, zoom and physical touch remain unverified. DOM geometry stubs do not close these gates.
- Guy's product/pedagogical acceptance remains Pending. This implements link infrastructure; it neither supplies/approves vocabulary mappings nor verifies the six-new-words curriculum requirement. Synthetic test labels do not imply canonical approval.
- Owner installation and preservation/rollback receipts at the actual destination remain Lead work. I did not verify the reported owner demo revision at port 63358, so that status remains the Lead's handoff statement. No production release, live WordPress/payment/authentication readiness or broad security audit is approved by this bounded verdict.
- This report, new `release-e10-b67b67b/release-probes/contract.test.mjs`, verified build receipt and named logs are the only review outputs. No tracked candidate file changed; no commit/push was made. The shared root has pre-existing other-agent changes and was preserved.
- Lead next step: integrate this independent report/probe and append bounded Release evidence to E10 in the shared feature ledger under integration ownership, retaining historical QA failures. Suggested status: **Release contract/data gate PASS at b67b67b; 108 distinct scoped tests plus 9 runtime scenarios; native/Guy acceptance Pending.** Combine with separately returned corrected QA/UX verdicts before the owner-install decision; retain the exact 101-file byte receipt for any later installation.

Report path: `C:\Users\Trans\.openmausbot\task-workspaces\71c71389-5334-4e0c-9ca8-d80dd28223d1\653fb433-7485-48b1-9f7c-cb22711bda02\hebleo-3\RELEASE_E10_b67b67b.md`.
