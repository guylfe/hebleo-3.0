# RR-B2-04: report envelope/key identity on restore (owner evidence)

Owner: Hebleo Lead Engineer, 2026-10-06, branch `lead/b2-draft-api`, parent `e0cbd5cd564c8fd790ff039f2c0e34ce4d7d73c6`. This is owner automated evidence. The Release recheck of this commit, browser/device QA and Guy's acceptance are all still Pending.

Independent status carried forward, unchanged by this commit: Release closed RR-B2-01 and RR-B2-03 on `6d957fe`, and closed RR-B2-02 on `e0cbd5c` with RR-B2-01/03 closure retained (`RELEASE_RECHECK_e0cbd5c.md` in the Release reviewer's workspace). RR-B2-04 stays open until Release rechecks this commit.

## What the recheck found

Restore accepted a report whose own `value.userId`/`value.requestId` disagreed with its storage key: absent, null, empty, unknown user, another user, another request, or report B's identity under report A's key. Every case returned HTTP 200 with 8 writes. `reports()` returns values without keys, and `resolveReport()` rebuilds the key from the listed identity. Resolving the listed report therefore failed with 400 or 404, or, in the collision case, marked B reviewed and left A pending. Questions already required key agreement; reports only checked the key's shape. The parent `6d957fe` shows the same defect, so it is an existing gap, not a regression.

## Fix (`src/store.js`, `restore()` validation only)

- Each report needs a recognized `value.userId` (one of the three demo users) and a valid `value.requestId` (same `id()` rule as `report()`). Its key must equal exactly `'report-' + userId + '-' + requestId`, the key `report()` writes. Nothing is renamed or repaired; a mismatch is refused with `Invalid learner report in backup.`
- The old key regex is removed because exact equality implies it. One difference: a reserved ID such as `constructor` is now refused, as `report()` already refuses it.
- Duplicate report keys are refused with `Invalid backup reports or lesson sessions.`, using the same check as questions. Before, a duplicate silently dropped one report (2 submitted, 1 kept).
- Both checks run in the validation phase, before `BEGIN IMMEDIATE`. The embedded-attempt check from RR-B2-02 (`savedAttempt`) is unchanged and still applies. Questions, their optional targets and explicit legacy links are unchanged.
- Report values have always carried `userId` and `requestId` since `report()` was added (`445d9d2`), so valid v1 and v2 exports still restore.

## New tests (`test/restore-integrity.test.js`, +3)

17 envelope cases, on the report of resumed feedback (A), with the no-resume report (B) and the legacy report also present:

- userId absent/null/empty/unknown/another user.
- requestId absent/null/empty/another request.
- Unknown userId with a matching key; reserved requestId with a matching key.
- B's identity under A's key.
- Key renamed away from its identity; key absent; value absent.
- A moved onto B's key and identity, so two reports share one key.
- The same report twice.

| Test | Coverage |
| --- | --- |
| report envelopes that disagree with their key and duplicate keys refused, v2 and v1 | 34 store cases. Each asserts the error, `total_changes()` delta 0, and every table including `sqlite_sequence` unchanged on a populated destination with history and a pending draft. |
| valid reports restore under their own identities; resolving one changes only that report, v2 and v1 | All three listed identities equal their keys. Resolving A by its listed identity marks A reviewed; B and the legacy report are byte-for-byte unchanged. |
| HTTP: mismatched or duplicate identities refused; after a valid restore, resolving listed A changes only A | Real `createServer` on an ephemeral loopback port. 17 cases POST `/api/restore` as the fictional author: each returns 400 with zero changes and identical tables. The valid backup then returns 200. `GET /api/reports` lists each report under its own key, and `POST /api/reports/resolve` with A's listed identity marks only A reviewed. |

On the unfixed `e0cbd5c` `store.js` (fix stashed, blob `9f78829f`), both rejection tests fail at their first case, "userId absent". The valid resolve control passes on both versions. See `new-tests-on-e0cbd5c-store.txt`.

## Commands run (all from the clone; identity header in each log)

| Log | Command | Result |
| --- | --- | --- |
| `reviewer-report-envelope-on-e0cbd5c.txt` | owner copy of the reviewer's `report-envelope.mjs` (imports point to this clone), before the fix | 9 FAIL (200, 8 writes; collision marks B reviewed), valid PASS, EXIT=1: reproduces the finding |
| `owner-envelope-matrix-on-e0cbd5c.txt` | `owner-envelope-matrix.mjs` (17 cases + valid control, v2 and v1, real HTTP, fresh store per case), before the fix | 8/36, EXIT=1. The 8 passes are the cases the old checks already caught (key absent, value absent, unknown user with matching key) and the valid controls |
| `targeted-tests.txt` | `node --test` demo-build, restore-integrity, store, batch1, refinement, ux, draft-api, publication-diff, preview, server | 85/85, EXIT=0 |
| `verify.txt` | `npm.cmd run verify` | 135/135, EXIT=0 |
| `schemas-contracts.txt` | `cd schemas && npm.cmd test` | 15/15, EXIT=0 |
| `runtime-contracts.txt` | `node schemas/tools/runtime-check.mjs --runtime .` | 8/8, EXIT=0. Label says `e0cbd5c` (HEAD at run time); it ran the staged fix |
| `metadata-regression.txt` | `node schemas/tools/reproduce-metadata-diff.mjs --runtime . --require-fixed` | `fixed: true`, EXIT=0 |
| `owner-envelope-matrix.txt` | owner matrix, after the fix | 36/36, EXIT=0 |
| `reviewer-report-envelope.txt` | reviewer envelope probe copy, after the fix | 10/10: 9 cases 400 with 0 writes, valid 200 and resolve modifies A only. EXIT=0 |
| `reviewer-attempt-matrix.txt` | copy of the reviewer's `attempt-matrix.mjs` | 232/232 (114 store + 114 HTTP rejections, 4 controls), EXIT=0 |
| `reviewer-resume-report-reference-http.txt` | copy of the reviewer's original RR-B2-02 HTTP probe | 6/6, EXIT=0 |
| `reviewer-closure-probes.txt` | copy of the reviewer's `closure-probes.mjs` (RR-B2-01 reset, RR-B2-02 wrong links, RR-B2-03 schema) | 5/5, EXIT=0 |
| `reviewer-positive-probes.txt` | copy of the reviewer's `positive-probes.mjs` (CAS, stale publish/preview/rollback isolation, publication diff, backup/draft round-trip and replay, injected-failure rollback, cross-revision completion) | 5/5, 0 errors, EXIT=0 |
| `fingerprints/4291-*.json` | `node learner-fingerprint.mjs data/hebleo-demo.sqlite`, read-only, before/after | identical |

Tested tree: staged index `bef9650c`: `src` `3f6967371734f79f5ac25fa55e97f93b08570ccd`, `test` `e10bf8cf9ee6f4f2f187929c23d956c866bbbf70`. Unchanged from `e0cbd5c`: `public` `4b6d746a…`, `schemas` `ef10df02…`, `package.json`, `package-lock.json`. After the runs, only README.md, the checklist and this folder changed.

The `reviewer-*.mjs` files are owner copies of the reviewer's e0cbd5c probes. They were changed only in import paths (`../hebleo-lead/…`) and the commit label (from `COMMIT_LABEL`), and were run from the owner scratch folder `../rr-b2-04-fix`. They do not run in place, and `node --test` does not discover them. Their `*-results.json` files are copied here. The reviewer's originals were read and copied, never modified; SHA-256 of `report-envelope.mjs`, `-results.json` and `.txt` was checked before and after.

## Limits

- Owner evidence only. Probe copies are not the reviewer's independent execution.
- Still not checked on restore, and not raised by the finding: the report's own `at` timestamp, and whether its embedded attempt also exists in that learner's restored history. An `author-demo` report restores even when the backup has only two learner rows, as questions already do.
- No browser rerun (store-only change; `public/` unchanged). Browser/device QA and Guy acceptance Pending.
- Runtime approval enforcement remains documented unfinished.
- The 07:19 interruption cause from the earlier fix remains unknown.
- Not merged to main. No change to 4173, 4291 (running process and DB untouched), 4197, live services, real data or production.
