# Independent F14 recovery re-review — 31 October 2026

**Preinstall PASS. RR-FIRST2-F14-01 CLOSED on exact commit `021dc19ae0e9f7cb3b5cfb4afcc6984a5c7600b3`, runtime code `6b90bcfb26045cfa8d8bbe167fbfeffe9b6dbffe`.** The full retained-workspace and original legacy reproduction both pass. No blocking integrity finding remains within this bounded correction. This document records independent observations on the exact candidate; no installed/production database, source content, publication gate, or running demo was changed.

## Reviewed identity and isolation

- Commit: `021dc19ae0e9f7cb3b5cfb4afcc6984a5c7600b3`; runtime implementation commit: `6b90bcfb26045cfa8d8bbe167fbfeffe9b6dbffe`.
- Lead checkout: `C:\Users\Trans\.openmausbot\task-workspaces\8c900356-50f6-4d41-bbb9-50c8abe09233\008af79a-cda6-4a4c-bd78-8ad492a6a44e\hebleo-combined`.
- Reviewer checkout: `C:\Users\Trans\.openmausbot\task-workspaces\71c71389-5334-4e0c-9ca8-d80dd28223d1\653fb433-7485-48b1-9f7c-cb22711bda02\hebleo-3\tmp\rr-f14-021dc19\candidate`.
- Created a separate local clone and detached exact HEAD. Dependencies are junctions to the supplied installed dependency trees; no package installation or change to Lead's checkout.
- Independently confirmed Lead runtime SHA-256 `3105779faa90e6ba5f6a51c13387f5c53f35547b3b68cbb7b6956af283727bc4`. Reviewer checkout fingerprint `4ac6c267b9c393aac27b42a71d2a81c0725e391df207099870159c8c3f99cbbd` differs only in checkout line endings in `public/refinement.css`, `scripts/revise-first2-feedback.mjs`, and `scripts/verify-first2-parity.mjs`. All other executable files, including every backend module and the recovery/updater scripts, match byte-for-byte. `IDENTITY_COMPARISON.json`, `BUILD.json`, and `LEAD_BUILD.json` retain exact manifests. No substantive executable differences.
- Read the actual Store restore/export implementation, immutable-context encoding, author review migration/relink/merge, media validation/union, client backup serializer, updater, full-data verification script, tests and supplied contracts. Feature/Lead evidence was read as context and independently rerun where reported below.

## Commands and results

All commands below ran from reviewer `candidate` unless otherwise stated. Logs and scripts are in its parent review directory.

| Command | Independent result |
|---|---|
| `node --test test/author-recovery.test.js test/author-review.test.js test/restore-integrity.test.js test/draft-api.test.js test/batch1.test.js test/matching-progress.test.js test/media-recovery.test.js` | 63 passed, 0 failed. `focused.log`. |
| `npm run verify:candidate` | 948 passed, 0 failed; syntax checks passed. Existing candidate audio filename/name exclusions remain in effect. Includes actual app backup Blob/download/file-selection/confirmed HTTP restore test with three roundtrips. `candidate-retry.log`. |
| `npm test --prefix schemas` | 27 passed, 0 failed. `schemas-retry.log`. |
| `node schemas/tools/runtime-check.mjs --runtime .` | 9 passed; exact commit 021dc19 reported; ephemeral servers closed. `runtime-retry.log`. |
| `node scripts/verify-first2-parity.mjs` | PASS all 30 source fields. Saved generated report as `RUNTIME_PARITY.json`, then restored the generated tracked evidence file to HEAD. No source fetch. `parity.log`. |
| `node independent-media.mjs` (review directory) | Six independent groups passed; details below and `independent-media.json`. |
| `node independent-identity.mjs` (review directory) | Distinct duplicate-content revision identities, cross-database ID remapping, full context/Unicode/receipt/audit preservation and original create/status retries passed through initial restore plus eight subsequent restores. `independent-identity.json`. |
| `git archive --format=tar --output=../reader9.tar 03a3e9e613a4c92d1cf683627a1394c0e75c616c src public`, extraction, then `node older-reader.mjs` | Actual reader-9 implementation rejects reader-10 database and backup with 409; complete tables/SQLite sequence unchanged. `older-reader.json`. |
| `node scripts/verify-author-recovery.mjs --baseline '<Lead>/tmp/combined-final-rehearsal/before.sqlite' --legacy '../../../rr-combined-20261031/comment-growth.sqlite' --output ../full-data` | Exit 0; all five groups PASS, including both complete source-preservation receipts. `full-data.log`, `full-data/receipt.json`. |

Initial setup limitations were resolved: the new clone initially lacked the separate schema dependency tree (`ajv`), causing the first schema/runtime and five candidate test files to fail with module-not-found. Linking that tree and rerunning produced the passing results above. Two historical evidence filenames required command-scoped `core.longpaths=true`. No product-code correction was made. These initial logs remain for audit.

## Full retained-workspace result

The exact final runtime independently completed the full-data command. This is the reviewer's own result, not Feature's or Lead's earlier run.

- Copied 23-lesson baseline: reader-8 marker-only migration, one new revision, exact prior revision rows, MNTL and the other 22 draft lessons, events/media, all nonprogress learner fields and private review preserved. The existing authorized fictional-progress reset is explicit, with original progress retained in the before-backup. Both updater restore rehearsals passed.
- Six actual HTTP Impact/Save/comment/status cycles: compact export bytes `85,479,582; 85,485,849; 85,492,116; 85,498,383; 85,504,650; 85,510,917`. Full reconstructed workspace hashes and original draft tokens verified.
- Four exact HTTP export/restore cycles: **85,510,917 bytes on every cycle**; six revision rows, six contexts and six notes throughout. Complete contexts, original requests, Unicode quotes, audit histories, tokens, learner state and original create retries remained exact. No revision/context growth.
- Five malformed full-data context/base/quote/audit/media inputs rejected with complete table and SQLite sequence receipts unchanged.
- Original reader-9 six-comment database: review namespace **159,802,669 → 18,900,647 bytes** with all original complete contexts, comments, quotes, audits, request receipts and tokens preserved. Three exact HTTP recoveries remain **85,507,402 bytes**, six revisions, six contexts and six notes; original create retries pass.
- Both supplied source databases have identical final schema/table/sequence receipts to their starting receipts. No source Store was opened for mutation.

Runtime cost is material: the full harness ran from approximately 16:49:45 to 17:14:42 Israel time, **24 minutes 57 seconds**. Observed successive full-data roundtrip completion intervals were about 146 seconds, including export/restore, complete comparisons and original-request retries. Sampled process working set reached approximately 3.8 GB. These are harness observations, not isolated API latency, a controlled performance benchmark or native UI responsiveness evidence; see `PERFORMANCE_OBSERVATIONS.json`.

## Independent retained-media adversarial cases

The reviewer-created fixture deliberately uses separate bytes for a historical-only reference and a private-context-only reference, neither present in the media asset library. Its current draft later removes the private reference. It also has an alias-only blob plus an asset with two append-only revisions and immutable operation receipts.

Three actual HTTP restores (first an older backup, then the new exports) preserve all those blobs, exact historical revision rows, private reconstructed context, original note receipt, alias URL and both asset-import retries. HTTP reads return the exact expected byte hashes for the historical, private and alias URLs.

Five adversarial HTTP restores reject with every table, `sqlite_sequence`, and `total_changes()` unchanged:

1. Incoming package omits a private-context blob which already exists locally: 409 `MEDIA_MISSING`. Local union cannot hide an incomplete incoming package.
2. Structurally valid conflicting operation receipt: 409 `MEDIA_RESTORE_CONFLICT`.
3. Independently valid divergent history under the same asset ID: 409 `MEDIA_RESTORE_CONFLICT`.
4. Independently valid alias pointing at different bytes: 409 `MEDIA_RESTORE_CONFLICT`.
5. Two individually valid 26 MB media packages would combine to 52 MB: 409 `MEDIA_BACKUP_LIMIT`, before writes.

The independent identity fixture forces a source/destination revision-ID collision with two identical-content source revisions. Mapping is `{1:1,2:3,3:4}`; four destination revision rows remain stable. Only navigable anchor/context pins change. The original request (including original revision/token), exact emoji/Nikkud quote, status audit and request IDs remain intact and both original create and status retries work.

## Findings and limits

- Nonblocking documentation correction: `docs/INLINE_AUTHOR_REVIEW.md:55` still says an older backup missing media required by retained private contexts refuses restoration. The new verified contract independently validates incoming references, then preserves valid locally retained context media. Update that sentence to match `docs/F14_RECOVERY_CORRECTION.md` and the tested implementation.
- Recovery remains bounded to compact 200,000,000-byte JSON and 50 MB retained media. The correction does not promise unlimited distinct authoring history. Oversized legacy JSON files still cannot be uploaded directly; the supplied legacy database is migrated losslessly before export.
- Do not downgrade only the executable over the migrated database. Actual reader 9 rejects reader-10 data atomically; retain the original before-update database with its matching executable. Preserving changes made after an update requires a compatible recovery path.
- This is a local preinstall integrity review, not production readiness or new mounted-Browser/physical-device/OS clipboard/screen-reader/Guy acceptance. No fresh native UI pass was performed. The existing publication review gate and missing four isolated consonant recordings remain outside this correction.
- No remote CI/push was repeated by this reviewer; the exact local commit and actual files were inspected. No source/product code, shared feature ledger, main branch, installed demo, WordPress, purchases or learner records were written. Only disposable test fixtures/copies and reviewer evidence were created. No related automation exists.

Next handoff: Lead may proceed with the guarded local installation of this exact reviewed candidate, update the feature ledger with this bounded independent PASS, and correct the stale media-contract sentence. Installation must use a fresh consistent snapshot of the original installed database and the exact reviewed executable; never install these synthetic test databases. Served identity/readback, post-install preservation, and same-build restart evidence remain separate required installation checks. No new commit or push was made by this read-only reviewer; the listed review artifacts and disposable tests are the only new files.
