# Corrected integrated checkpoint — preinstall

Imported Save code 6499ec6 as d82d314 and evidence c733c694 as cc1cff3 over Lead correction c5c62e7. No new publication algorithm, persisted schema, backup, or recovery format changes. Private Save retains full-content validation, CAS, media/source hooks and atomic persistence; its opt-in compact response omits publication analysis and redundant full draft downloads. Changes & history refreshes lazily against the owner pins. Existing selected publication proofs and strict receipt guard remain.

Lead executed on these combined bytes:

- `npm run verify:candidate`: 1,027 passed, zero failures; 108,356 ms. Existing audio filename and Audio/Speed/Playback name exclusions remain; this is the configured candidate suite.
- `npm test` in schemas: 27 passed, zero failures.
- `npm run runtime -- --runtime ..` in schemas: nine passed. Initial invocation without the required runtime argument rejected before scenarios; corrected invocation passed.
- `npm run build:editor`, `git diff --check`: passed. Vendor rebuild changes only Git-normalized line endings; no tracked source diff. Exact raw hashes must be compared from this worktree, not inferred from Git-normalized blobs.

See REVIEW_CORRECTIONS.md for malformed publication receipts failing-before/passing-after, hidden controls and synchronized Advanced source. See ../save-latency-20261101/DELIVERY.md and raw JSON for measured full-size HTTP Save reductions; those are not native Save latency measurements. Prior native typing and publication evidence is bounded to the earlier matching runtime and requires the focused corrected-byte recheck.

Independent QA, UX and release delta review are pending on this combined checkpoint. No installation, live publication or Guy acceptance is claimed. Fresh review copies and all synthetic data are disposable and must never replace the teaching database.
