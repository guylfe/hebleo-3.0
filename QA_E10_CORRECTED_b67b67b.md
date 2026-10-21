# Independent corrected E10 QA — 2026-10-22

**Bounded automated recheck passes. QA-E10-02 is corrected on the exact supplied executable bytes.** No new product defect found. Native/rendered/physical and Guy acceptance remain Pending.

Candidate: `b67b67b3838fa37f38798946ec24ccb16522a7bd`.

QA checkout: `C:\Users\Trans\.openmausbot\task-workspaces\71c71389-5334-4e0c-9ca8-d80dd28223d1\653fb433-7485-48b1-9f7c-cb22711bda02\hebleo-3\qa-e10-corrected-b67b67b`.

QA branch: `qa/e10-corrected-b67b67b`. Local independent clone made with `--no-local --no-checkout`; `core.autocrlf=true` set before checkout. A Windows filename-length error affected one historical evidence JSON; `core.longpaths=true` and targeted `git restore --source=HEAD --worktree` recovered it. Clean status was confirmed before installing dependencies. Lead's byte-authority checkout and receipt were read only.

## Byte identity

`executableIdentity(process.cwd(), candidate)` exactly equals the supplied `CORRECTED_BUILD.json`, including all **101 file hashes**, revision, and both aggregate hashes. No newline-normalized substitute was used.

| Hash | SHA256 |
| --- | --- |
| Runtime | `7a36d01f9aff186f1fafdb752d3e4bd5e10820eddde2f016d40b1c91a09989ed` |
| Backend | `f94b21150dcf6d91efd06ceffd30f67647fdbcbaf2cf941ff29a1cc20c8f96e4` |

Full receipt retained as `QA_CORRECTED_IDENTITY.json`. The previous two-file delivery discrepancy is absent in this corrected clone. `git diff --exit-code HEAD -- public src scripts package.json package-lock.json` passes. The evidence commit changes no executable files.

## Commands actually run

Windows PowerShell; Node `v24.19.0`, npm `11.17.0`.

| Command | Actual result |
| --- | --- |
| `npm ci --ignore-scripts --no-audit --no-fund --offline` | Installed 49 packages |
| `node qa-tests/verify-corrected-identity.mjs` | Exact revision and all 101 receipt hashes match |
| `npm run check` | Syntax passes; `qa-syntax.log` |
| `git diff --no-index --ignore-space-at-eol ../qa-e10-all-065197a/qa-tests/e10-independent.test.js qa-tests/e10-independent.test.js` | Exit 0: original 24 probes unchanged apart from line endings |
| `node --test qa-tests/e10-independent.test.js qa-tests/ux-feedback-transit.test.mjs qa-tests/ux-learner-feedback-transit.test.mjs test/vocabulary-reminder.test.js test/answered-bindings.test.js test/post-answer-vocabulary.test.js test/feature-renderer-http.test.js` | **84/84 pass**, zero failures/skips; 11.2 seconds; `qa-focused.log` |
| `node --check qa-tests/e10-corrected-lifecycle.test.js` | Pass |
| `node --test qa-tests/e10-corrected-lifecycle.test.js` | **18/18 pass**, zero failures/skips; 17.0 seconds; `qa-lifecycle.log` |
| `git diff --exit-code HEAD -- public src scripts package.json package-lock.json` | Pass |
| `git diff --check` | Pass |

Total: **102 passing tests across the two runs**. This is a bounded recheck; the broad 760-test candidate suite and schema/contract/runtime tools were not rerun here. Lead's broader results remain Lead-reported evidence.

Two setup iterations are retained in local logs: an initial identity invocation ran before the supplied receipt was copied and failed ENOENT; after copying, equality passed. The first new lifecycle run was 16/18 because its synthetic MouseEvent lacked `pointerType=mouse`, so unpinned hover never opened. Correcting only the test harness produced 18/18; `qa-lifecycle-harness-error.log` preserves that setup failure. No production fix was made.

## Defect disposition and retained guards

The original **24/24** QA probes now pass, including correct and incorrect QA-E10-02 pinned-feedback transit cases. Historical failure report `QA_E10_ALL_FAMILIES_065197a.md` remains unchanged, as do the original test logic and old checkout/logs. The eight retained UX probes also pass: feedback/details, pinned/unpinned saved rehearsal, and correct/incorrect pinned/unpinned learner-controller interaction over actual ephemeral HTTP. These are executable component/protocol checks, not a new native UX review.

The added 18 probes cross both authored feedback fields with nine release paths: unpinned pointer departure, outside pointer, outside focus, stale context, hidden anchor, inert anchor, removed anchor, externally removed panel, and binder destruction. Each checks survival beyond the old parent timeout first, then card disposal and parent explanation dismissal. Outside action/default/focus survives; destroy returns focus to the exact available trigger before outside departure; stale-context activation cannot resurrect the card. Every probe verifies equality of every persisted table after grading and interaction.

Shared tests retain hidden/inert/offscreen/clipped/occluded and modal availability guards, delayed-callback disposal, reentrant/error cleanup, status-region placement, exact IDs, managed eligibility denial, raw wrong answers, stable/reloaded feedback, and disclosure Escape then card Escape with exact feedback-trigger return. The actual HTTP tests cover six authoring families, rejection/CAS/stale-response behavior, actual renderer rehearsal, retained detached controls, learner grading, and zero-write rehearsals. Legitimate fixture preparation, draft Save and learner attempts occur only in disposable in-memory Stores; no-write assertions surround the relevant evaluation/viewing/rehearsal windows rather than claiming those authored/attempt operations never write.

Code inspection confirms the bounded correction is the parent explanation's child-panel open/close tracking plus descendant focus handling, with close notification delivered even on disconnected panels after focus restoration. It does not loosen the existing reminder availability predicate. No backend change is in the correction.

## Preservation and limits

- Owner demo at 63358 was not contacted, installed, restarted or reset. No owner DB, backups, learner records, source state, curriculum, Masterfile, approvals or media were modified. Lead source checkout was not edited.
- All new fixtures are explicitly synthetic and disposable. No canonical vocabulary mapping was added.
- JSDOM geometry is stubbed and pointer events are synthesized. Native layout/RTL/Nikkud, browser pointer defaults, physical keyboard/touch, screen reader, zoom, profile consent and Guy acceptance remain unverified. No browser or foreground automation route was attempted.
- Existing external byte-identical-row identity limitation and inherited source/visual findings were outside this correction and were not re-audited.

Changed evidence: this report, `QA_CORRECTED_IDENTITY.json`, `qa-tests/e10-corrected-lifecycle.test.js`, `qa-tests/verify-corrected-identity.mjs`, and E10 evidence in `docs/FEATURE_CHECKLIST.md`. Logs remain ignored/local. For an exact-SHA rerun, use a fresh checkout of the candidate with `core.autocrlf=true` set before checkout, install offline dependencies, copy the new evidence probes from the QA commit, and run the commands above; the identity helper deliberately requires the candidate as HEAD before the QA-only commit.

Next handoff: Lead can integrate this evidence-only commit. This bounded automated correction gate passes; Release review and native/Guy acceptance remain separate gates. The historical failed SHA must retain its failed disposition.
