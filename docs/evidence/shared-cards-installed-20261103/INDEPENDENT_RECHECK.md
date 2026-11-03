# Independent RR-SC correction and app security/data recheck

3 November 2026 Israel time. **Bounded code recheck PASS. RR-SC-01, RR-SC-02 and RR-SC-03 CLOSED for the exact candidate below. No additional blocking defect found in the reviewed scope.** This does not approve production or claim installed/device/Guy acceptance. The earlier HOLD report remains the historical record of the reproduced defects.

Reviewed WordPress candidate: `C:\Users\Trans\.openmausbot\task-workspaces\8c900356-50f6-4d41-bbb9-50c8abe09233\d93ac18d-de54-4035-ad88-9628a2b2e5df\wordpress-shared-cards`.

Reviewed app: adjacent `hebleo-shared-cards`, clean tracked branch `feature/shared-cards-20261102`, exact commit **14583746dd507a343e779e1274fb5911fdc55567**. All **158 executable files** match `app-executable-hashes.json`; aggregate runtime SHA256 **3b2d202fd0828b709cb69d9a4d313bc3ad6a00abd108351c8e29c9a75db256b1**. All **36 hashes** in `hashes.json` (11 supplied correction files plus 25 app commit changes) were independently computed and rechecked unchanged at completion. `FINAL_VERIFICATION.json` records this readback and the exact canonical template/CSS comparison.

Output: `C:\Users\Trans\.openmausbot\task-workspaces\71c71389-5334-4e0c-9ca8-d80dd28223d1\653fb433-7485-48b1-9f7c-cb22711bda02\hebleo-3\rr-shared-cards-20261103\recheck-1458374`.

## Closed findings

**RR-SC-01:** `shared-cards.php` now compares each locked native raw value against either its previous imported raw content or the exact newly provisioned package baseline. Independently reran the real WordPress/MariaDB regression: an edited first-import note is refused, its edit and the namespace stay exact, and a missing baseline is also refused. Normal import and rollback still succeed; disposable schedules remain unchanged.

**RR-SC-03:** unchanged receipts now include native snapshot/hash metadata. Native rollback validates the receipt/state/native values and returns an exact no-op without revision movement. Independently reproduced that behavior.

**RR-SC-02:** inspected `release.php` and `release-recovery.php` and executed the corrected real-filesystem tests. A signed private journal exists before original-file mutation. Backups and replacements are staged and verified, original changes are serialized by the plugin-root lock, and recovery accepts only the recorded before/after hashes. Bootstrap is activated last and restored first. Recovery no longer requires the installer to have returned a receipt.

Independent fault coverage went beyond the owner's happy/reconstructed-state checks. `failure-boundaries.php` injects a failed rename or partial-write exception into the actual candidate functions, operating only on owned real filesystem fixtures:

- partial initial journal write;
- first backup rename, partial second backup staging, third backup rename;
- partial original replacement staging and partial candidate asset staging;
- all three original-file install rename boundaries;
- all three original-file rollback rename boundaries.

All **12 cases** recovered to the recorded hashes. Before activation/replacement, staging failures preserved every original hash. Recovery worked without a returned install receipt; after recovery, rollback restored all originals. The initial incomplete journal case safely retried installation because no originals or backups had yet changed. `recovery-guards.php` additionally proved modified-backup refusal and competing-file-lock refusal without original mutation. The owner test's 28 checks independently passed, including every before/after combination of the three originals, newer code/asset rejection and journal tamper rejection.

These are controlled I/O failures, partial-write exceptions and mixed-state simulations, not a power-loss or production-filesystem test. Three renames are still not an atomic multi-file transaction. Lead must keep requests out of a partially applied release and use authenticated recovery before serving it.

## App critical delta

Inspected actual `src/shared-cards.js`, reader-11 additions to `src/store.js`, `src/server.js`, `public/shared-cards.js`, app review/enrollment changes, the import/start scripts, renderer/behavior/template files and supporting tests at the exact commit.

- Approved raw-object and media-manifest digests independently match the supplied source. Bundled templates/CSS deeply equal the approved source templates. Arbitrary runtime HTML is not imported. Fields are sanitized before insertion into the isolated approved renderer.
- Stable SourceId/direction identities use the existing enrollment, scheduling, idempotent review receipts, expected-card conflict, undo and purchased-course checks. The identity model remains the expressly local fictional demo model; it is not production authentication.
- Document/media tickets are random, bounded, expiring and rechecked against current course access. Actual HTTP tests passed for fixed-script CSP, unchanged restrictive host policy, forged tickets, denied access, cross-origin rejection and media ranges. The opaque sandbox retains `allow-scripts` without same-origin permission; host messages validate exact source, keys, settings types and finite bounded heights.
- Five independent malformed restores (missing/null shared namespace, incompatible reader marker, invalid exact-form overlay and orphan shared schedule) were rejected with **identical all-table/sequence logical receipts**. Exact parent reader-10 Store code rejected a reader-11 synthetic DB with HTTP-domain status 409 and no logical data change. Only module import paths were relocated for that compatibility probe; dependencies unaffected by this commit were reused.
- Exact-form audio updates in three representative source entries changed exactly one rendered form audio reference each, retained raw content, and produced CSP hashes matching the HTML parser's actual script text. No phrase content was substituted. The full focused suite also covers base/form overlays, CAS, reimport, backup/restore, both direction schedules and settings.
- Compared the supplied captured `before.sqlite` and `with-shared.sqlite` artifacts read-only through stable owned copies. The original KV values except the explicit schema marker, learner/revision/event/alias/sequence rows, and old media bytes are exact. The reader-11 marker and approved shared namespace are the expected additions. The captured baseline's logical receipt matches its supplied BASELINE.json. This verifies the actual 23-draft before/after artifacts; it is not a fresh full-data migration/restore run on the destination. QA owns the separately assigned full-data/browser coverage.

## Commands and actual results

`SOURCE_MEDIA` is the existing `3608c660-64ac-40bc-bbe1-b8c9dc60e77c/shared-cards-integration/shared-vocabulary/media`. `PHP_EXT` is the installed PHP executable's sibling `ext` directory. No source-package files were modified.

| Actual verification | Result |
|---|---|
| `node setup.mjs` | Exact app HEAD/clean tracked tree; all 11 owner correction hashes match; 36-file manifest saved |
| `php owner-release.test.php` | 28 checks pass; wrapper changes only require/fixture output paths |
| `php -d extension_dir=PHP_EXT -d extension=mysqli -d memory_limit=1G -d error_log=RECHECK/php-errors.log native-recheck.php SOURCE_MEDIA` | Four real WP 7.1.4 / MariaDB 11.4.13 regression checks pass |
| `php failure-boundaries.php > failure-boundaries.log 2>&1` | 12 injected failure/recovery cases pass |
| `php recovery-guards.php` | Corrupt backup and competing lock both refuse without changing originals |
| Candidate `php -d memory_limit=1G test.php verification.wp.json SOURCE_MEDIA` | Original 20 importer checks pass |
| Candidate `node verify-patch.mjs` and `node frame-host.test.mjs` | Both pass; original scheduler/rating/access source hash recovered |
| Isolated native `../test-full.php SOURCE_MEDIA`, same PHP options, output `native-full.log` | Full 1,025-note provision/import/readback/reimport/rollback pass; schedules unchanged; **23.57 seconds, 822,083,584 bytes peak (784 MiB)** |
| App `HEBLEO_SHARED_SOURCE=SOURCE node --test test/shared-cards.test.js test/shared-card-frame.test.js test/shared-card-renderer.test.js test/demo-build.test.js` | **15/15 pass, zero skipped**: 9 shared-card checks plus 6 demo fingerprint/reset checks |
| `node app-probes.mjs > app-probes.log 2>&1` | Pinned digests/158 executable hashes, five atomic restore rejections, three exact-form/CSP checks pass; initial external read-only WAL artifact comparison could not open its sidecar |
| `node continue-app-probes.mjs > artifact-comparison.log 2>&1` | Continued the previously blocked artifact comparison on hash-stable owned copies; old rows/media exact; reader-10 compatibility refusal passes |
| `node final-verification.mjs` | All 36 correction/change and 158 executable hashes unchanged; exact HEAD/clean tracked tree and canonical templates/CSS confirmed |
| `php -l .../release-recovery.php` | Syntax passes |

The first artifact-comparison attempt's exit 1 is retained in `app-probes.log`; it was an environment/WAL-sidecar limitation, not counted as an app success. Its unchanged checks were not silently rerun against another destination. The continuation copied only the already-captured local artifacts, verified their bytes remained stable, and completed the comparison in this writable review directory.

Full app discovery was **not** rerun or declared green. Owner reports 18 failures (17 reproduced with prior app code and one frozen historical build gate); those remain separately reported evidence. This review's bounded 15-test command is fully passing.

Key WordPress SHA256 values:

| File | SHA256 |
|---|---|
| `shared-cards.php` | `cfbf8ecb701204598721bae60634601b0f784858fdc54106e1544eda382ad90b` |
| `release.php` | `91dc38bea86b91b88f6dd9cf099dbad9bccf8a3083d959a1e2347825d5690596` |
| `release-recovery.php` | `7d5489de24ecd2c92a10d34f09799ad0b7bb055b2e47d550a5c7ed1765b59b33` |

## True remaining installation prerequisites

1. **WordPress complete bootstrap/access:** use the already-pending permitted complete 1.2.2 package/hosting clone. Existing scoped modules and CPT shell do not prove complete post-save hooks, memberships, purchase access or authenticated headers. No refused export was retried, reconstructed or requested again.
2. **Actual hosting capacity and deployment recovery:** full-bootstrap import/reimport/rollback must fit the real 1024M limit with adequate headroom; the scoped harness already peaks at 784 MiB. Stage and exercise the exact journal-based file recovery on the destination filesystem before relying on it. Keep matching original executable/plugin and data backups; do not downgrade reader-11 app data with reader-10 code.
3. **Concrete WordPress placement/media:** retain the explicit reviewed additive SourceId+direction/deck attachment and publication-status plan inside existing access controls. Verify actual served media bytes, types/ranges/playback and authenticated CSP. Preserve original notes, memberships and all pre-existing progress/assignments. Incoming live counts 917/68 were not independently refreshed in this local recheck.
4. **Guarded app installation:** capture the current destination immediately before installation, preserve drafts/settings/author review/media and all records, and compare afterward. Follow the existing once-per-build fictional-progress reset rule only at authorized demo startup. Current captured artifact comparison is not a substitute for that final destination check.
5. **Final behavior/acceptance:** complete the separately assigned QA results and actual installed both-direction/reveal/rating/due/reload/access/media/device checks. Native phone, listening/pronunciation and Guy acceptance are not established by this report.

The 97 phrase recordings and their phrase-slot placement are separate from current vocabulary import. They were not imported or approved as noun/form audio replacements in this review, and missing phrase slots do not block this bounded core candidate verdict.

Only this reviewer-owned fixture directory and the reviewer's existing synthetic DB copy were written. Portable MariaDB PID 64120 used loopback 33381 with the reviewer-owned data directory; it was shut down via its verified executable and process absence was checked. No services, destinations, production, original installed app, active candidate code, remote Git or external configuration were modified. No monitor automations exist. No commit/push was made from the unrelated shared dirty checkout.

**Next handoff: Lead can carry these three closures and the exact app commit forward.** Resolve the listed environmental/installation prerequisites and incorporate QA's independent results; no further code correction is requested by this bounded review.
