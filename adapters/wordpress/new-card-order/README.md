# WordPress new-card course order

The native study queue used progress-row creation time, which followed the imported row order rather than the lesson sequence. Deck 49480 had no `_custom_card_order`. Its settings' `card_order` chooses the mixture of new cards and reviews; it does not establish curriculum order. A second defect applied SQL LIMIT before an administrator's custom order.

`generate.mjs BASELINE_PLUGIN NEW_OUTPUT` patches only the new-card selection block of `templates/card_loader.php` and adds `new-card-order/order.php`. Exact anchors and a two-file SHA256 manifest guard the output. Eligibility is still enforced by the original SQL, including account, deck, new state, individual/global suspension and per-note sibling burial. The complete eligible new pool is ordered using the existing SourceId-owned `Source` field's lesson tags, then limited. Repeated tags use the earliest explicit occurrence. Saved custom card keys take precedence; invalid/duplicate keys cannot duplicate cards. Within a lesson, creation time and progress ID provide stable order. Unmapped legacy cards retain their relative order after mapped cards. Reviews use the unchanged due/scheduler query. Mixed mode shuffles the selected cards for display after selecting the earliest eligible new group.

No schema, source mapping, authored text, ID, setting, schedule, progress row, media or native 3.0 application is changed. The helper reads metadata once per note with bulk cache priming. Lesson codes come from the existing import provenance; Hebrew words are never used to infer or rewrite a mapping.

## Verified reported transition

Read from LearnDash course 25283 on 13 November 2026:

| Order | Existing code | Course step |
| --- | --- | --- |
| 1 | 2.1 | 25461, Lesson 2-1; vocabulary topic 25739 |
| 2 | 2.1.5 | Roots & Patterns 47314, then Intro to verbs #1 32673; vocabulary topic 32675 |
| 3 | 2.2 | 25464, Lesson 2-2; vocabulary topic 25749 |
| 4 | 2.2.5 | 32723, Intro to verbs #2 |
| 5 | 2.3 | 25466, Lesson 2-3 |
| 6 | 2.3.5 | Existing shared group for Intro to verbs #3/#4, steps 32743/32778 |
| 7 | 2.4 | 25470, Lesson 2-4 |

The imported catalog placed mf-000051 (note 48503, נותן, 2.2.5) and mf-000052 (48504, נותנת, 2.4) immediately after mf-000048. Earlier verbs such as mf-000053 (48505, למד, 2.1.5) and mf-000060 (48512, מלמד, 2.1.5), and Lesson 2-2 mf-000074 onward, followed them in storage. Both directions use existing templates 48453/48454.

Before, ignoring account eligibility: `046,047,048,051,052,053,054,055,...060,...074...`.

After: `046,047,048,053,060,062,063,064,065,066,067,068,069,070,071,073` (2.1.5), then `074..086` (2.2), then `051,054,056,057,100,059` (2.2.5); 052 remains with 2.4. Numbers abbreviate the unchanged `mf-000` SourceIds. Already-introduced/suspended/buried cards are skipped normally.

Exact existing provenance also explains apparent source gaps: mf-000049 is included in existing mf-000029 / note 48483 (היה); mf-000050 and 108 in mf-000028 / 48482 (נתן); mf-000058 in mf-000100 / 48510 (גדל). These are prior import coalescences, not new linguistic remappings. All 1,025 notes / 2,050 assignments in the affected deck have existing published notes and field data. Fresh eligible queues have no unmapped cards.

The affected learner was not identified in the request. Aggregate live checks cannot attribute their exact history; mf-000048 already has an introduction on one account. One new direction of 052 is individually suspended. No global suspension or active burial was present in the inspected reported region. These exclusions remain authoritative.

## Tests and delivery

- `php order.test.php`: 18 checks passed, including the reported transition, limit-before-sort, explicit custom order, duplicate/invalid keys, repeated tags, stable directions and read-only input.
- `php install.test.php NEW_FIXTURE`: 12 checks passed: backup/readback, stale-source refusal, bad-payload refusal, unrelated-file preservation and rollback on fingerprint mismatch.
- `node run-native.mjs WP_SOURCE DB_BIN PHP CANDIDATE NEW_FIXTURE`: 15 checks passed with fresh WordPress 7.1.4 / MariaDB 11.4.13, actual native handler/SQL/nonce, account/deck/suspension/burial/review limits and unchanged application tables. Synthetic records only. Its own database helper stopped with exit 0; no service was created.
- Candidate loader/helper and release/readback scripts passed PHP lint; both Node scripts passed syntax checks. The generator's reviewed diff changes only the new-card block.

Guarded installation completed at 2026-11-13 00:04:37 UTC (02:04:37 Israel time). Original loader SHA256 `a6f6a408a4617ce040d3ecb511b81a1d49b0479d52d9044f5aa0c6d598933314`; installed loader `6752fc3cde95ae8bda229638fffaee428ee1f62cf0eabe80ccb8552495a8e685`; helper `cae48431a38c03563b156c473753539acb7c82c2b491042f1c20b20f3ca0f536`.

`install.php` is an explicit release function, never an endpoint or hook. It checks the exact two-file scope and original bytes under the existing shared-release file lock, verifies a private backup, installs helper before loader using atomic renames, invalidates opcode caches, checks destination bytes and compares protected state. Failure restores only the old loader, without restoring a database or overwriting a newer external file. Backup leaf: `.hebleo-new-card-order-20261113-a18762c7`, outside the web root. Source and learner data are never exported by the metrics helper.

The immediate install receipt matched every fingerprint. Separate fresh readback confirmed both destination hashes, working signed-in native handler (23 returned cards), 3 existing accounts / 6,057 eligible new cards with 15 old adjacent lesson inversions reduced to 0, and 0 missing lesson mappings. Exact fingerprints remain unchanged for 7,067 progress rows, 2,118 total assignments, 37 settings, sessions, streaks, all scheduling/burial/protocol metadata, 1,879 authored/course posts, 1,251 shared options, 34 other plugin files and 1,427 source media files. All 1,025 native raw vocabulary records match the unchanged imported state. No rating or initialization was submitted on the live site.

The subsequent standard site-cache purge clears Elementor's `_elementor_css`, `_elementor_element_cache` and `_elementor_page_assets`. The broad post-metadata count changed from 23,305 to 23,258, so the final receipt explicitly reports `all_fingerprints_identical: false`. The installed clear-cache method was inspected; this difference is consistent with generated-cache removal. Individual before-images of those 47 rows were not retained, so full post-metadata equality is not certified. Progress/source/media fingerprints and native raw comparison above are independent of that broad metadata limitation. Existing Site Health performance findings remain; no plugin-path errors appeared in the inspected log.

Private task evidence is outside Git in the Lead task `a18762c7-07e3-46b0-9e7f-0ecf53ddb445`: installation/destination receipts, bounded source trace, disposable test logs and the concrete installer. Repository baseline is `c5724cc5` from `leo/drill-copy-cleanup`, preserving its pronoun/garden/heatmap/autoplay fixes. The new branch is `lead/wp-new-card-order`; main integration is reported separately. Public-repository upload was explicitly authorized in the task. No databases, learner rows, credentials, recordings or raw source packages are included in this change.

Physical Android, an affected-learner browser replay, listening and Guy acceptance remain unverified. A signed-in browser may retain an already-loaded queue until the study session is reopened.
