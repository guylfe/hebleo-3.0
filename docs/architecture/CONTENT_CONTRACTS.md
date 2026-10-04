# Additive content contracts v1

Status: local schema/validator checkpoint, not an installed runtime gate. Based on
MASTER_SPEC sections 3, 16-19, 21-32, 51 and 57 and the 2026-10-04 next-step plan.
No source lesson is approved or imported here.

## Four separate validation results

| Layer | Artifact | What a pass establishes |
| --- | --- | --- |
| Structure | Six schemas and Ajv | Recognized fields have the required shape; unknown data is retained |
| Semantics | semanticErrors | Checked IDs, selectors, source mappings and media pins resolve |
| Eligibility | publicationEligibility | Metadata meets the selected private-demo/canonical policy; no human authority or bytes verified |
| Enforcement | Lead's runtime | Only implemented stage/publish checks run; this branch installs none |

Run structure before semantic checks; helpers expect valid JSON objects.
Existing validateContent remains an additional runtime gate, including ordering
preparation constraints. No validator assesses Hebrew correctness, real source
fidelity, rendering or complete MASTER_SPEC coverage.

## Content and source ownership

Retain schemaVersion:1 and existing word/lesson/exercise IDs and arrays. Words
require explicit pointed, unpointed, curated and english strings. Validation does
not generate forms, normalize Hebrew or approve supplied derived forms. Lessons
retain the three currently supported blocks: explanation/text,
vocabulary/words/vocabulary-table and exercise-set/exercises/practice. Selectors
reference lesson IDs; core practice references its own lesson. These limits
describe this slice, not a reduction of MASTER_SPEC's component model.

Optional object metadata is provenance, approval, sourceFields, fieldFormatting,
sourceTheme and mediaRefs. Preserve raw rich text runs, original start indices
and theme references. Do not infer semantic meaning from visual conventions.
No_Card/No_Vocab remain raw until their meanings are confirmed. JSON is the
lossless interchange; CSV is values-only and cannot establish formatting capture.
Unknown fields are data, never instructions, executable HTML or fetch authority.

The versioned source sidecar records sources (sourceId, captured snapshot hash,
locator, formatting status) and entries (entryId, object collection/ID, row hash,
locator, fieldMap, ownership, baselineSha256, active/tombstone status).
Assign object and entry IDs once; preserve them through rename/reorder.

resolveSourceIdentity accepts an existing explicit entry ID. Without one, only
an unchanged frozen snapshot plus matching locator and row hash resolves directly.
On a new snapshot, even a unique matching row hash returns review-required.
Duplicate IDs/locators are errors. Importers must validate the sidecar before
resolving identities. These helpers are experiments, not an installed importer.

mergeSourceField is a read-only three-way experiment. Source omissions retain
Studio work. Source-owned unchanged baselines accept source changes; Studio
changes survive unchanged source. Competing edits require resolution. Studio
owns composition and assigned app metadata. A baseline hash cannot reconstruct
old field values: retain immutable snapshots/mapping history. Missing rows never
silently delete objects. Tombstones/replacements require deliberate review;
broken dependencies continue to block publication. Writing IDs into sources
requires separate authorization; no source writes occur here.

## Approval policy

An approved object envelope contains version:1, status:approved, reviewedBy,
reviewedAt, contentSha256, and dependencies:[{collection,id,sha256}].
Other statuses are pending/rejected/not-applicable. Provenance identifies
kind/source/snapshot/location and may record field history and derivations.

Object digests exclude only their own approval envelope to avoid recursive
self-hashing; every other metadata field participates. Dependency digests exclude
their own envelopes, but each dependency's approval status is checked separately.
Dependencies include base words, exercise words, lesson exercises/words/selectors,
and the current/previous two lesson word pools used by ordering preparation.
Content/dependency changes invalidate review; array order matters. Future
renderers/selectors must extend discovery before safely publishing.

Pack labels never approve pending neighbors. Private-demo compatibility permits
legacy synthetic seed objects only without contrary approval records, including
field-level vetoes. Canonical mode rejects synthetic objects and unpinned media.
All objects are checked, including unreferenced ones. Pack envelopes are
supplementary; general pack-metadata approval binding remains future work.

Approval records are not signatures. Trusted authenticated issuance and runtime
enforcement remain outstanding. Eligible means metadata consistency, never human
authorization or launch approval. Simulated approved fixtures exist only inside
tests and are never exported as canonical content. Candidate fd7b2a5 remains
unapproved pending D1-D9; its derived forms remain unchanged.

## Media and privacy boundaries

Pinned media refs contain assetId, revisionId and sha256, all matching the
versioned manifest. Revisions record ID, hash, byteLength, MIME type, URL,
provenance and approval. Approval binds asset ID and all revision metadata
except its own envelope. URL strings are legacy-unpinned and provide no
historical-byte guarantee. Fixture URLs are intentionally unavailable; no native
recordings or bytes were generated.

Future storage must verify bytes/hash/length/type, create new revisions on
replacement, retain all historically referenced bytes and restore content/media
atomically. Hash claims prove neither byte existence nor recording quality.
Media backend, backup/restore and retention are outside this checkpoint.

Source sidecars, raw captures and approval identities belong on the author
boundary. Today's shared learner projection removes exercise answers/distractors
but retains other metadata. The compatibility learner schema is therefore not
a confidentiality filter. Lead needs a learner metadata allowlist before real
private provenance is imported, separate from lossless author round-trip storage.

## Lead integration

1. Integrate docs/schemas only; install the isolated locked dependency using
   npm.cmd --prefix schemas ci --ignore-scripts --no-audit --no-fund.
2. Run the commands in B02_CONTRACT_EVIDENCE.md against an isolated frozen runtime.
   Preserve source-candidate-unapproved staging rejection; do not relabel content
   to bypass it.
3. Repair publication diff with canonical key comparison and meaningful pack
   metadata entries. Use conservative whole-pack lesson impact where dependencies
   cannot be narrowed; run reproduce-metadata-diff.mjs with --require-fixed.
   Retain no-op token/time/write behavior and every unknown field.
4. Add per-object publication enforcement, trusted approval recording and learner
   metadata projection in later bounded Lead work, with atomic failure checks.
   Source import/mapping and media storage/backup remain later work.
5. Integrated app/browser tests, independent QA/release review and Guy acceptance
   remain separate. Contract checks do not satisfy the real-lesson or launch gates.
