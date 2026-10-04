# ADR B02: additive content, identity and approval contracts

Date: 2026-10-04. Status: contract checkpoint for Lead integration. Production
hosting, source approval and launch are not approved by this ADR.

Retain content schemaVersion:1 and existing arrays. Add separately versioned
contracts:{version:1,sourceMap?,mediaManifest?} and per-object metadata. This
preserves the working runtime while making identity, review and media references
explicit. A broad migration would not supply the missing approved content/bytes.

Assign stable IDs once; row/page locators identify evidence, not enduring objects.
Cross-snapshot hashes suggest review candidates only. Use a private versioned
sidecar until source ID-column writes are separately authorized. Source-owned
vocabulary and Studio-owned composition use reviewed baselines; conflicts stop
and omissions retain work.

Preserve unknown fields, raw flags, formatting runs/themes and explicit Hebrew
forms. Structural validation, reference checks, publication eligibility and
runtime enforcement are distinct. Validators never repair language or grant
approval. Per-object approval binds content/dependency digests; pack labels cannot
approve pending neighbors. Synthetic compatibility is private-demo only and
cannot override explicit vetoes. Trusted issuance/enforcement remains Lead work.

Pin media by asset/revision/hash and retain historical bytes. URL strings are
legacy-unpinned. Metadata validation does not prove bytes exist; storage,
verification and backup/restore remain deferred.

Freeze preview on Lead's full-content draft token and reuse pure grading with
disposable author state. Canonical key comparison must govern both token and
diff. Meaningful pack metadata must appear in diff and conservatively affect all
lessons when narrower dependencies cannot be established.

The three-block/six-exercise slice does not replace MASTER_SPEC sections 21-32.
Candidate fd7b2a5 remains unapproved pending D1-D9. No app/store/server edits,
source imports, media uploads, live/paid services or production changes occur.

See [CONTENT_CONTRACTS.md](../architecture/CONTENT_CONTRACTS.md),
[PREVIEW_API.md](../architecture/PREVIEW_API.md) and
[B02_CONTRACT_EVIDENCE.md](../architecture/B02_CONTRACT_EVIDENCE.md).
