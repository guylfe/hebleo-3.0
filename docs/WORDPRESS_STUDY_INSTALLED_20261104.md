# WordPress study update installed — 4 November 2026

The approved responsive study layout and corrected scheduler are installed at https://hebleo.com/decks/?deck=49480. Separate fresh-request readback at 04:39 Israel time returned HTTP 200 with the corrected StudyApp save guard, removed recall label and no fixture interval labels. The original broken FSRSAlgorithm class is absent; the loaded scheduler is `py-fsrs-6.3.2/php-port-1`.

The new layout removes the fixed flip-card viewport, uses natural document height, presents answer/support areas beside each other when space permits and stacks them at narrow widths. Four server-valued rating buttons remain below the card. Existing content, forms, independent disclosures, Nikkud/theme and original audio are preserved. Rejected or uncertain rating saves retain the card and counters; concurrent submissions are blocked and reconciliation fetches current deck state before another attempt.

The PHP scalar port follows pinned py-fsrs 6.3.2 with MIT license, deterministic fuzz disabled, minute learning/relearning and elapsed-time memory updates. UTC due values and exact memory are saved in a versioned JSON sidecar only when a real card is rated. Eligibility and ordering are applied before limits; legacy rows retain the old local-date rule until rated. The scheduling clock is evaluated after the progress row lock. Backward clocks refuse without writes. No migration, bulk due-date update or progress reset occurred.

## Verification and preservation

- Reference: 534 upstream comparison vectors; adapter: 86 checks.
- Independent final native review: 415 WordPress/MariaDB checks, 51 separate-process reopen checks, 120 DST/metadata/filter/fault checks and five actual concurrent-handler checks with a real InnoDB lock wait. Both original release blockers are closed for the frozen candidate.
- Client: 21 save scenarios and two independent actual-method reconciliation scenarios; 40 actual-document source/control preservation checks.
- File operator: 37 disposable filesystem checks across nine interrupted replacement positions, retry, rollback, reinstall and newer-edit refusal. Recovery changes files only; it never restores a database over newer learner activity.
- Production MySQL 8.4.11 JSON/due-expression checks passed both repeated-hour cases. Actual native due queries executed successfully; combined compatibility probes took 1.005 seconds and 73.4 MB peak.
- All 27 installed runtime hashes match the reviewed candidate. A fresh request loaded the corrected scheduler and rendered both native directions with sandbox `allow-scripts` only. New-card previews computed 1m / 5m30s / 10m / 8d; these are current reference outputs, not mockup constants.
- All 2,967 progress rows, 2,118 assignments, 35 settings rows, three sessions, 16 streaks, four import logs and empty rule/suspension tables stayed byte exact. No fake live rating or enrollment was performed.
- All 1,025 shared notes, 2,050 direction mappings, 4,100 stored faces, 1,426 original media hashes, 97 phrase clips and 107 bindings matched the approved v2.2 artifact after installation. The media directory also retains its existing manifest file, making 1,427 files in the whole-directory preservation hash.
- After installation/readback, only Test Deck 39575 and new deck 2 39576 were moved to recoverable WordPress Trash. Shared Vocabulary 49480 remains published. Notes/media, all SRS table rows and every other SRS post/metadata entry stayed exact. No new deck was created.

## Exact artifact and recovery references

Frozen `candidate-v2.manifest.json` SHA256: `a9046780eaea8ede3ead5445f9bcf1ad1134be3b74f23df6ac56498a18eb6f82`.

| Runtime file | SHA256 |
| --- | --- |
| archive-decks.php | 4d87069c06b1038c451ed1322048f9e8f13991b7dd4224fc7748680c4b18146b |
| templates/card_loader.php | 01b0b3cd68ffec33477a3480789e899e5b391658078cb546beb47243a8f021c0 |
| study-scheduler/wordpress.php | 4a3413514b649c896e2491513f4ba0a88473123b452484dbc0329c97013259f2 |
| study-scheduler/fsrs.php | f66b9e5373d30302e087f73bae266999e0b9465d6cdf29398219474f8f9a67be |

Private account-root folder `.hebleo-study-20261104-v2` contains the original 23 files, reviewed candidate, file journal, inert operator, private cleanup restore data and fresh full database snapshot. Backup is 248,069,923 bytes, SHA256 `c838ec1ddfb92ceb9216bfbb643bd253c29f9219ff3e8eda62ebfb30cc9185d3`; independent gzip CRC and size verification passed for 1,232,034,705 uncompressed bytes. Backup and learner data remain on the site and are excluded from Git.

Operator recovery uses the private `file-release.php` and `hs_execute(privateRoot, pluginRoot, 'before')`, guarded against newer file edits. Added inert assets remain after file rollback. Recovering the old decks uses `wp_untrash_post(39575)` and `wp_untrash_post(39576)` within the configured Trash retention; no note/progress cascade or blanket database restore is needed.

Exact private evidence is in Lead's task `wordpress-study-20261104/`: candidate manifest; stage/MySQL/backup/install/readback/source/cleanup receipts; `work/release-review/recheck-v2/REVIEW.md`; `work/layout/visual-v2-check`; and local reproducible operator/test files. No full native plugin, source vocabulary/media package, database, credentials or learner records are committed.

## Limits and next human decision

Mounted Browser navigation repeatedly lost the page before screenshot capture, confirmed as about:blank. Actual portrait/short-landscape appearance, manual scrolling, native keyboard/zoom, successful audio playback, physical-device listening and Guy acceptance remain unverified. HTTP/source/DOM checks do not establish these. External persistent-cache races and lost-COMMIT connection outcomes are also untested. LearnDash emitted existing nullable-parameter deprecations during native Trash hooks; target states and preservation readback passed. No unrelated plugin changes were made.

The course-backed verb/preposition selection proposal is prepared separately in Lead's task `selection-proposal/SELECTION_PROPOSAL.md`: 11 explicitly named representatives, 21 additional course variation candidates and 19 prepositions, with sources and held gaps/conflicts. Original linked documents/PDFs and pronunciation remain unverified. Guy must approve the selections before any new conjugation deck/card creation. No disputed forms or paradigms were invented.
