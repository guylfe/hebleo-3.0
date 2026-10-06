# RR-B2-01/02/03 fixes: owner evidence and recheck handoff (2026-10-06)

Owner (Lead) evidence only. Independent Release recheck, QA and Guy's acceptance are separate and still Pending.
Findings: Release review of 76c2889 (reviewer report RELEASE_REVIEW_76c2889.md, outside this repo).

## What changed
- RR-B2-01, `src/demo-build.js`: the demo build fingerprint hashes every `.js/.css/.html/.svg` under `public/` and `src/` at any depth, plus `package-lock.json`. Paths are relative and `/`-joined, and CRLF is normalized. `demoBuildFiles()` is exported so tests can compare it with the real tree. The reset is still startup-only and runs once per build; docs/, data/ and uploads/ are never hashed.
- RR-B2-02, `src/store.js` `restore()`: `linked()` checks each history record against its exact carried revision. The lesson must exist, the exercise must belong to that lesson, and an optional word must exist. This covers attempts (including history with no resume), questions and reported attempts. Any v2 disagreement is rejected before the transaction. v1 records that disagree keep their grade and become explicit `legacyRevisionId` links; nothing is repaired or regraded. Resumed feedback must also match its own lesson (`validateProgress`).
- RR-B2-03, `src/store.js`: `RESTORABLE_SCHEMA_VERSIONS`. v2 must declare `storeSchemaVersion: 2`. v1 accepts absent (v1 exports never carried the field), 1 or 2. Anything else, including missing on v2, 999, 3, 0, -1, 2.5, "2" and null, is refused with 409 before any write.
- Tests: `test/restore-integrity.test.js` (new) and 3 new tests in `test/demo-build.test.js`. Rejections assert that every table, including `sqlite_sequence`, is unchanged.
- Docs: README (verify count, restore rule), checklist D02/D03/D07/P10/B15, new B19 and a 2026-10-06 log row.

## Results (tested files = HEAD 76c2889 + staged fixes; src dcab6b5e…, public 4b6d746a… unchanged from 76c2889, test 7e858ab7…)
| File | Command | Result |
| --- | --- | --- |
| verify.txt | `npm.cmd run verify` | 129/129, EXIT=0 |
| targeted-tests.txt | `node --test` on demo-build, restore-integrity, store, batch1, refinement, ux, draft-api, publication-diff, preview, server | 79/79, EXIT=0 |
| schemas-contracts.txt | `cd schemas && npm.cmd test` | 15/15, EXIT=0 |
| runtime-contracts.txt | `node schemas/tools/runtime-check.mjs --runtime .` | 8 passed, EXIT=0 (its `runtimeCommit` label prints HEAD; it runs the working tree) |
| metadata-regression.txt | `node schemas/tools/reproduce-metadata-diff.mjs --runtime . --require-fixed` | fixed:true, EXIT=0 |
| diagnosis/baseline-76c2889.txt | new tests on unfixed 76c2889 + probe-only exports | 6 new tests fail, the valid v2 round-trip passes |
| verify-FAILED-0719.txt | earlier verify, same src/test | EXIT=1: 8 whole-file failures with no output, external termination; see diagnosis/README.md |
| fingerprints/final-4291-*.json | read-only fingerprint of the owner 4291 database before/after the tests | identical |

## Focused recheck suggested for Release
1. Re-run the reviewer's own probes for RR-B2-01/02/03 from the reviewer's area against this commit. Expect a nested public/src edit to reset once at startup; invalid lesson/exercise/word links and unsupported schema declarations to be rejected with no table change.
2. Confirm the positive probes still pass: CAS, publication diff, preview write isolation, valid restore.
3. Known limits, unchanged: approval validators are contract tools, not runtime publication enforcement. No browser QA or Guy acceptance is claimed here. NEXT_STEPS.md and UI_REFINEMENT.md still quote older dated test totals.
