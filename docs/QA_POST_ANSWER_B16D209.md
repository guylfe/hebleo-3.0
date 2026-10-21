# Independent corrected-candidate recheck

Bounded automated PASS for exact `b16d2091525b3ed44af167dbee6065e66e066ee6`. No concrete regression found. This is a corrected disclosure/focus/lifecycle recheck, not a renewed broad release or native acceptance claim.

QA checkout: `C:/Users/Trans/.openmausbot/task-workspaces/71c71389-5334-4e0c-9ca8-d80dd28223d1/653fb433-7485-48b1-9f7c-cb22711bda02/hebleo-3/qa-post-answer-b16d209`.

Read-only Lead input: `C:/Users/Trans/.openmausbot/task-workspaces/8c900356-50f6-4d41-bbb9-50c8abe09233/026a3c11-8a4d-46f8-8421-f680c481f3cc/app`. A separate no-hardlinks clone was detached at the exact corrected revision. No source checkout or original persistent state was written; no owner navigation, grading, server restart, migration, reset or publishing occurred. Persistent listeners received build/static GETs only. Behavioral scenarios use disposable in-memory stores and ephemeral HTTP servers.

## Actual executed checks

| Command/check | Result |
| --- | --- |
| `npm ci --ignore-scripts --no-audit --no-fund` | 49 packages installed |
| `npm run check` | All configured syntax checks passed, repeated after served-byte alignment |
| `$env:HEBLEO_QA_REVISION='b16d2091525b3ed44af167dbee6065e66e066ee6'; node --test qa-tests/independent.test.js test/post-answer-vocabulary.test.js test/vocabulary-reminder.test.js` | 41 passed, 0 failed: 6 independent QA + 11 projection/integration + 24 reminder primitive tests |
| `node qa-tests/negative-control.mjs` | Expected UX-E10-01 failure reproduced against the original 444b917 module: disclosure stayed open (`true !== false`, child exit 1); control wrapper passed |
| `node qa-tests/corrected-recheck.mjs <Lead evidence root>` | Both listeners report b16d209; complete build file maps match; current original DB, backup and corrected before/after receipts match; live source digest matches |
| `git diff --quiet HEAD -- public src scripts package.json package-lock.json` | Exit 0, canonical executable contents unchanged |
| Allowlisted static routes on isolated 63360 | 52 passed, exact byte hashes |

UX-E10-01 exercises correct/incorrect feedback and focus on the disclosure summary/body, first Escape closing the disclosure and focusing its summary, second Escape closing the reminder and focusing the exact original trigger, retaining the owning Preview dialog, result object and every DB table. The negative control uses only temporary copied modules/tests under ignored tmp; the executable files under public/src remain the corrected candidate.

Retained checks cover typing's raw Unicode answer, locked input and correct/incorrect grade through real HTTP; wrong matching placement identities; saved rehearsal IDs and disposal; duplicate managed identities; modal, route and stale trigger lifecycle; keyboard isolation; hover/pinning/transit; focus return; suppression and timer/listener disposal. Database equality assertions cover grades, preferences, progress, review and source state during reminder actions. JSDOM geometry and dialog methods are stubs.

The executable delta from 444b917 is only `public/post-answer-vocabulary.js`: the local Escape handler prevents the outer reminder dismissal for an open disclosure, focuses the summary, and unregisters with the card. Backend, APIs, eligibility, schema and data have no executable delta. Remaining changed files are tests and documentation/evidence.

The previous 717 candidate and 23 schema passes belong to baseline 444b917 and were NOT rerun here. They are prior evidence only; this return establishes the bounded corrected results above.

## Exact identity and preservation

Observed at `2026-10-21T22:00:55.625Z` (2026-10-22 Israel time):

- Runtime SHA256: `96f37620a319e700e628bb588c05c9024c3efb898b3ec5457427fc794e6c4357`.
- Backend SHA256: `e1194b748380d7bb78be6e5a2248aeff62c5161429e13ec397642e992e00e6c1` (unchanged).
- Schema/all-table SHA256: `e72ca110485b8d3d67a70477e790c4c7bbcb4902c4bec6890eceaa2e2d16b460` for corrected before, after, backup and current original database, inspected using read-only SQLite consistent snapshots.
- Live source digest: `5be459536124d79296d444f94b049b3bef421ac422f2d3b556efe42e1a003281` (unchanged).

Receipt: `qa-corrected-receipt.json`. Logs: `qa-corrected-final.log`, `qa-corrected-syntax-final.log`, `qa-corrected-negative.log`, `qa-corrected-preservation.log`. No learner rows or database copies were saved in QA output.

Setup detail: cloning with autocrlf disabled initially produced LF bytes where the Windows served build used CRLF, so the first independent run was 5/6 with an exact hash mismatch. Every differing file was checked for equality after newline normalization and against the served hash before copying only its executable bytes from the read-only source into this QA clone. The subsequent Git clean conversion configuration and final byte maps passed. An intermediate identity command exceeded its output buffer on newline-only Git diffs before this configuration was corrected. These were QA clone setup failures, not candidate regressions. Final tests ran against the exact served bytes.

## Mounted native result and handoff

`select_computer({})` selected local / this computer. Mounted `list_windows({})` succeeded. Mounted `get_browser_state({pid:14752,window_id:329500})` refused with `browser_consent_required`: **"this standalone browser profile requires explicit existing-profile approval before Cua can inspect its DevTools endpoint"**. An earlier call without the required pid returned a parameter error. No native page inspection, input or navigation occurred. This is a browser profile consent blocker, not an automatic approval review rejection. No foreground or alternate automation route was attempted.

Rendered layout/RTL, real browser Escape/Tab/Enter/Space defaults, physical pointer/touch, screen reader, zoom and Guy acceptance remain unverified by this QA return. UX Owner's separately running review is not claimed as QA evidence.

Handoff to Lead: bounded corrected checks pass; complete the separate mounted native review when the browser profile is available. This report, corrected receipt and two QA utility scripts are local evidence additions only; no new commit/push was required or made. Shared checkout and other agents' files were preserved.
