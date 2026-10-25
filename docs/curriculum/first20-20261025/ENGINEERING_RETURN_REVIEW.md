# First 20 lessons — engineering return reviewed

Reviewed by Curriculum Designer on 25 October 2026, following Leo's completed assignment cd0f93a7-2798-4d2a-877d-a63d99fb84be.

## Result against Guy's request

| Requested outcome | Evidence and bounded result |
| --- | --- |
| Move vocabulary | The saved native Sheets readback records 75 relocations, 18 additions, 114 lessons and 1087 targets, with all prior targets retained. This review inspected the saved readback and zero-difference receipt; it did not repeat the live Sheets read. |
| Clear content IDs independent of placement | 404 readable planning IDs and their references are saved across four routes. Old IDs remain aliases; original WordPress/Drive/video locators remain provenance. Fresh installed API verification resolves MNT to draft-first20-MNT. This does not mean 404 lessons or all vocabulary have canonical runtime bindings. |
| Interactive first 20 lesson file | FIRST20_CONTENT.md and first20.html in this directory are the current review files. All 19 manifest hashes passed; all 20 lessons' structured teaching matches the source imported by engineering. |
| Native text-lesson capabilities | Installed runtime 59f50184f7851ec682fc1a35435ed99591b93b74 provides paginated/timed text, explicit checks/model reveal, authoring controls and aliases. Fresh nonpersistent API previews verified all 20 drafts / 154 stable-ID pages. All 110 executable source files and 59 served assets match the recorded installation. |

Demo: http://127.0.0.1:63358/ . Intended review path: Author → Studio → Rehearse saved draft. The new lessons remain unpublished Studio drafts; active learner course revision remains 4.

## Verification performed in this review

- `node .curriculum-content-20261025/review-engineering-return.mjs` — passed. Checked source/served hashes, pack manifest, teaching equality, all 20 nonpersistent Preview sessions, stable page IDs, MNT alias and 127 unresolved canonical targets. No learner records or local databases were read.
- `git -c safe.directory=* ls-remote origin refs/heads/main refs/heads/fix/keyboard-action-clearance-20261025 refs/heads/docs/curriculum-first20-20261025` — verified private main/correction branch at 355f20229a3a493f656e49cb74de55d6076b84d2 and curriculum branch at 03c52d092b098343b2451c2138b8cf700ccce60f before this review checkpoint. The first sandboxed network attempt failed; the authorized read-only retry succeeded.
- Inspected native reader, import and editor implementation plus timer/editor test assertions. Existing recorded results: 179 standalone checks; engineering's configured candidate 866 tests; Leo's rerun 25 targeted tests. These test suites were not rerun in this review. The timer tests explicitly cover 9999ms visible / 10000ms hidden, no autoplay, cancellation and replay.
- Reviewed engineering's preservation receipts and limits. Preservation was not independently re-audited against learner records here.

Machine-readable fresh result: `.curriculum-content-20261025/engineering-return-verification.json` in the shared repository. That local receipt contains counts/hashes, no learner records.

## Remaining work and ownership

- **Curriculum Designer / Guy:** resolve the 127 draft vocabulary targets to canonical app records, introduced-letter mappings, and final teaching/model/Nikkud decisions. Native audio and mnemonic artwork remain authoring work. These are not publication-ready lessons.
- **Source fidelity:** original presentation text/notes and written WordPress lessons were inspected when the pack was authored. Video recordings/captions were not inspected, so this is a source-derived adaptation rather than a verified video transcription.
- **Engineering / QA:** native Studio interaction, precise pre-expiry timer cancellation, physical keyboard, screen-reader, touch and hidden-tab checks remain unverified. Previous background Studio selectors were verified no-ops; the native cancellation probe exceeded ten seconds and was inconclusive. Automated checks do not close these gaps.
- **Guy:** final content/product acceptance and any later publication decision remain separate.

Leo's attached copies used the earlier frozen source status. The current files linked above include the successful Sheets-save status; their lesson teaching matches the engineering import. No substantive content or curriculum change was made during this review.
