# RR-FIRST2-01 corrected and installed

The bounded source-activity contract correction is implemented, privately pushed and installed for local testing. No authored content changed; active content revision remains **5**. Sam's MEMORY comparison branch was left unconsumed for QA's final narrow native learner check. This report records Lead's own checks, not a new independent QA/release sign-off or Guy acceptance.

| Installed identity | Verified value |
|---|---|
| URL | http://127.0.0.1:63358/ |
| Code commit | `abf3cca1d8b9c3380de2e512f8fca665fa475f41` |
| Runtime SHA-256 | `f1db7ba5d565aad47a0a65afb237c6ea5401be9444105315d32f6f46110361c1` |
| Backend SHA-256 | `c5f13d8d3e9190bb620874e9a239a454a96d90074dc711ead64aa7f54a38edc1` |
| Listener | PID **59636**, replacing only PID 8852 |
| Content revision | **5**, retained exactly |
| Readback time | 2026-10-30T23:36:06.460Z |
| Private branch | `feat/first2-actual-lessons-20261030` |
| Main | Unchanged at `3615807c88beeb3c7090a48e9f3c5520a28bda60` |

Code checkout: `C:\Users\Trans\.openmausbot\task-workspaces\8c900356-50f6-4d41-bbb9-50c8abe09233\3f5dff25-a1fa-4bda-b947-bd733b040b0a\hebleo-first2`.

## Exact change

Code commit changes seven files:

- `public/text-contract.js`: supported reader version, per-kind field/type/model/feedback checks, unique stable identities and model/media references.
- `public/text-reader.js`: rejects unsupported authored-reader dispatch before mounting.
- `public/source-activities.js`: shares the existing comparison model constant with validation; display, classifier behavior, prose and layout are unchanged.
- `schemas/text-pages.v1.schema.json`: matching structural contract, combined with the existing shared semantic checks for cross-field cardinality/uniqueness/references.
- `test/source-activity-contract.test.js`: malformed-input/atomicity and valid/legacy controls.
- `docs/SOURCE_ACTIVITY_CONTRACT.md`: supported contract and compatibility boundaries.
- `docs/FEATURE_CHECKLIST.md`: bounded implementation evidence; Guy-result cells remain Pending.

Versionless legacy pages keep their original reader. All 20 first20 drafts/154 pages remain supported, unpublished and unchanged. Missing image/audio references remain optional; supplied references must have the correct type and safe local path. Missing consonant audio remains explicitly unavailable/unfinished in the existing UI. The current date-comparison classifier only supports its exact existing authored example; validation rejects unsupported replacement models rather than returning misleading feedback.

There is no delta to `content/`, `curriculum/`, `src/`, install scripts or dock layout relative to 5946342. Exact source-pack SHA-256 is `1b9df3021485e37c5c01af7a0eb573a482ba7329c797dc1dad55aaa2e9fb9e3a`.

## Commands and results

| Executed check | Result |
|---|---|
| `npm run verify:candidate` | **899 passed, 0 failed**; syntax checks pass; repository audio/speed/playback exclusions retained |
| `node --test test/source-activity-contract.test.js test/first2-actual.test.js test/text-integration.test.js test/text-reader.test.js test/text-release-integrity.test.js test/restore-integrity.test.js test/first2-dock-regression.test.js` | **62 passed, 0 failed** |
| `npm --prefix schemas test` | **27 passed, 0 failed** |
| `node schemas/tools/runtime-check.mjs --runtime .` | **9 scenarios passed**, rerun pinned to `abf3cca1d8b9c3380de2e512f8fca665fa475f41` |
| `node --test <sharedrepo>/qa-first2-c748834/independent.test.mjs` | **2 passed**: prior scroll regression and 128 date permutations; rerun by Lead |
| Original reviewer `tmp/release-first2-20261031/guards.mjs <candidate> <current-output>` | Original **4 malformed accepts now reject**; **5 installer guards reject without writes**; script and old evidence unmodified |
| `node prepare-update.mjs rehearse <live-db> preflight abf3cca1d8b9c3380de2e512f8fca665fa475f41` | Online backup, exact preservation, application export/restore and SQLite integrity pass |
| `install-contract.ps1` | Exact old listener/process verified; guarded apply, preservation startup, configuration/media and unrelated-listener checks pass |
| `node verify-installed.mjs` | Exact live GET readback, **58 served public assets**, **4 original mnemonic PNGs**, exact active/draft source lessons, **23 saved drafts**, and all three fresh fictional profiles pass; reads write nothing |
| `git diff --check`; protected-path diff; private `ls-remote` | Pass; code branch push verified; main retained |
| Private GitHub CI, run 41145196607 | **SUCCESS**, exact installed code SHA verified in `CI_CODE.json` |

The new test matrix contains **58 malformed variants**. Every variant exercises five actual HTTP boundaries: draft save, defensive publication of an older malformed stored draft, and restore corruption in active content, carried revision history, or saved draft. All **290 requests** return controlled rejection, with every database table (including SQLite sequence, content history, draft, learner state, events and media tables) unchanged. Tests also prove valid saves, publication and restore succeed. Publication arrangements inject malformed persisted state only before fingerprinting the request boundary; no such injection was made on the installed database.

Early attempts retained in this conversation's output include one fixture missing its legacy target-ID context and one restricted candidate run unable to create its disposable repository `tmp` directory. The fixture was corrected; the authorized rerun passes all 899 checks. Those failed attempts are not counted as passes.

## Preservation and installed readback

Live baseline digest: `b23c55ce4545b9e8aa6de48960bab60d1104c2585e60ffd330f3c3203ebe67a9`.

Installed post-reset digest: `4955b8caee76aeb6cc68067d6c8ce4d11b714a9af9b20adbd9ec37c36230d79b`.

The installer compares the live digest before applying, uses a current online backup, rehearses application export/restore, and compares every stored table. It retains the schema, all five immutable revision rows, entire saved draft, source state, events, media blobs/aliases and sequence exactly. No new content revision is added. Configuration/vault/filesystem media hashes and every unrelated listener remain unchanged.

Only the three explicitly checked fictional IDs (`author-demo`, `learner-core`, `learner-demo`) had progress cleared once for the new executable fingerprint, under the existing demo policy. Nonprogress fields/settings are exact. Readback verifies zero completions, attempts, resumes or saved text-page responses and null lastReview for all three. It does not submit or skip Sam's comparison branch, and does not use Alex for native testing.

Both active and saved-draft lesson objects match the unchanged source pack: MEMORY-A2 has seven pages and MNTL-A2 nine. All 23 saved drafts remain, including the 20 versionless legacy drafts. Four original mnemonic PNGs retain their supplied hashes. The separate offline restore rehearsal may map recovery revision IDs in its disposable database; the installed database stays on the original revision 5 with its existing rows exact.

Output and backups: `C:\Users\Trans\.openmausbot\task-workspaces\8c900356-50f6-4d41-bbb9-50c8abe09233\822918a9-2c59-475e-81af-ded515c61b2b`. Preflight and apply each retain `before.sqlite`, `reset.sqlite`, `restore.sqlite`, `build.json` and `receipt.json` in `preflight/` and `installed/`. SQLite files, learner rows, uploads and configuration are excluded from Git. The private evidence checkpoint contains only this report, reproducible scripts, nonsecret hashes/receipts and final logs.

## Remaining handoff

QA should perform the final narrow native learner **Try the comparison** check using legitimately fresh **Sam**, then report exact installed identity. This turn deliberately leaves that branch unconsumed. Automated DOM/HTTP tests do not close that native coverage gap, and no new independent review is claimed.

No isolated human /m/, /n/, /t/, /l/ recordings were installed or auditioned. Sound-dependent completion remains unfinished; audio acquisition/isolation and auditory verification stay with Leo's separate audio handoff. No synthesis or whole-source replacement was used. Guy acceptance remains Pending. There was no main change, real learner operation, WordPress action or production publication.

Private code CI: https://github.com/guylfe/hebleo-3.0/actions/runs/41145196607 (final result in CI_CODE.json and the final handoff).
