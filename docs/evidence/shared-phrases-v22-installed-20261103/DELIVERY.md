# v2.2 examples installed locally; WordPress candidate uninstalled

The app at <http://127.0.0.1:63358/> actually runs commit `6484ec7ea4d6ecbf2923a7eb7eb62ae95dfed3a9`, runtime SHA256 `49dc760907c59082dad06ae734c54c723b29022d378a5f29f09632800bd3e829`, PID45660 after verified restart. Exact candidate [CI41553234123](https://github.com/guylfe/hebleo-3.0/actions/runs/41553234123) passed. Code is pushed/read back on `feature/shared-phrases-v22-20261103`; main remains `3615807c88beeb3c7090a48e9f3c5520a28bda60`, with no merge or default-branch push attempted.

The installed export exactly equals the approved v2.2 raw/manifest:1025 notes,2050 available directions,1426 media (1424MP3 and two logos),97 phrase recordings with107 bindings on56 existing notes. Only Forms was appended. Original1329 media, base noun/form/Nikkud fields, source IDs, direction IDs and templates/CSS remain unchanged. Examples stay unpointed in both toggle states; no pointing or translation was invented. On mf-000361,077 reads ארוחת ערב גדולה and078 reads ארוחות ערב גדולות.

## Installed verification

- All1426 files were downloaded from the actual authorized destination and matched exact bytes, SHA256 and MIME (16,107,425bytes). All107 bindings on56 actual served card backs matched the exact supplied text/media; range206 works from the opaque frame origin. See `HTTP_READBACK.json` and private full `MEDIA_HTTP_HASHES.json`.
- Trusted Browser clicks on077/078 produced each exact MP3's `206 bytes=0-` request. The screenshot shows both examples. This used an explicitly read-only temporary diagnostic iframe containing the actual signed renderer resource with `sandbox=allow-scripts` under the app's actual headers, so no new enrollment/rating/settings writes were needed. An initial click was covered by the temporary parent shell; removing that shell resolved it, without a product-code change. Normal app reloaded afterward. This verifies display/request behavior; human listening and physical-phone behavior remain unverified. See `BROWSER_REPLAY.json`.
- Fresh original snapshot → upgrade → repeat import → full90,484,269-byte backup/restore against the existing approved lineage passed. All three learner rows, all23drafts/26,632,089draft bytes, review receipts/history, existing media, settings and unrelated KV were preserved. Guy's explicit NO RESET instruction was followed. Only shared content/new media and the acknowledged build marker changed; the prior reset timestamp did not change.
- Reimport at the actual installed destination was an exact all-table logical no-op. Restart retained the same logical receipt `dc81014bdefd4d31d2b11b7dec33441e595e537c958cb4ac6437c34a05664ad4`. The retained v2.1 database remains unchanged at receipt `c3b09dacd9ab813ac5d93967afbf97464d3a40aca649a96e6ffd770c7d41334c`.

## Code checks and source trust

`npm run check`, startup syntax, PHP syntax and converter syntax passed. The actual-source focused command passed13/13 with no skips:

    node --test test/shared-cards.test.js test/shared-card-renderer.test.js test/shared-phrases.test.js adapters/wordpress/shared-cards/frame-host.test.mjs

Set `HEBLEO_SHARED_SOURCE` to Leo's `shared-cards-integration/shared-vocabulary-v2.2`, `HEBLEO_SHARED_PREVIOUS_SOURCE` to the unchanged `shared-vocabulary`, and `HEBLEO_PHRASE_MANIFEST` to `anki-deck/phrase-audio.json` in his3608c660 task folder. Checks verify all107 bindings in both directions/toggle states (428 rendered bindings), every original/new media hash, exact non-Forms fields, progress/settings/overlay preservation, backup, malicious input/access/CAS and Windows CSP script hashing. Normalized behavior line endings prevent HTML parser normalization from invalidating the restrictive script hash; parent CSP was not widened.

The broader configured candidate run before the added CSP regression discovered1104 tests:1096 PASS,8 source-dependent skips,0 failures. Those source checks ran in the focused private-source suite above. Full discovery still has the documented older baseline qualifications; no all-discovery-green claim is made. Prior independent QA/RR applies to baseline1458374; this v2.2 delta was implemented/reviewed/verified by Lead in this thread without claiming a new independent teammate review.

Approved APKG SHA256 `7a91c3d07d493dde5b701ca06a4d748352c8e7f1991a614c1d15814d93c8c1de`; ZIP SHA256 `ae5622a415e37c237a6eb2e68b5051a7cb9d0801873f6791d30468689ee5de23`. Independent raw/manifest object hashes remain in the code allowlist, with v2.1 backup readability and guarded refusal to downgrade an installed v2.2 source. Private raw/media/databases/backups remain outside Git.

## WordPress candidate and precise gate

The same approved raw v2.2 export now feeds the portable candidate in `adapters/wordpress/shared-cards/`. Private artifact `phrase-v22-evidence/wordpress.v22.json` has SHA256 `bac5edfe6d57edc8d7449d649b5990e8bb4b0528b795a8ab5401cc9c449249ba`. It contains1037 explicit bindings (930base plus107phrase) and1426media. The isolated full1025-note native v2.1→v2.2 upgrade/reimport/rollback passed with exact native metadata, stable maps, schedules and deck assignments, using scoped WordPress7.1.4/MariaDB11.4.13. Time84.07s; peak929,038,336bytes/about886MiB. Synthetic DB shut down; no services or live changes.

**UNINSTALLED on WordPress.** Complete `wp-learning-cards`1.2.2 bootstrap/access still requires the permitted complete package/hosting clone already requested by Leo-Web. Automatic review previously refused the recursive private-plugin export; it was not retried or reconstructed. Actual1024M-host full-stack capacity/headroom, served-media/authenticated CSP, approved additive deck placement, private backups and guarded target-filesystem recovery/install remain unverified. Live917progress and68assignment rows remain untouched. `WORDPRESS_CANDIDATE.json` records current source/artifact hashes and this boundary. The historical v2.1 correction-hash receipt is retained as baseline evidence, not relabeled as the new artifact.

## Exact local paths and repeatable startup

Task root: `C:\Users\Trans\.openmausbot\task-workspaces\8c900356-50f6-4d41-bbb9-50c8abe09233\d93ac18d-de54-4035-ad88-9628a2b2e5df`.

- Installed frozen code: `hebleo-phrases`; data/evidence: `installed-shared-phrases-v22`. `PLAN.json` pins exact paths, source/ready receipts and identity; `PROCESS.json` identifies the current PID. Retained baseline: `installed-shared-cards-20261103/installed.sqlite` and `hebleo-shared-cards`.
- `prepare-phrase-v22-install.mjs`, `check-phrase-v22-plan.mjs`, `apply-phrase-v22-install.ps1`, `verify-phrase-v22-installed.mjs`, `check-phrase-v22-restart.mjs` and `restart-phrase-v22-installed.ps1` retain actual guarded commands. Preparation refuses an existing evidence directory; do not rerun into the completed installation.
- Start after a confirmed stop with `powershell -File .\start-phrase-v22-installed.ps1`; it refuses a running63358, pins the exact clean commit, opens preserved data, and refuses startup mutations/reset. Use the guarded restart helper when needed. `npm start` is the general fictional-reset path and is inappropriate for this preserved installation.
- WordPress private runtime/native reproduction: `phrase-v22-evidence/runtime.wp.json`, `wordpress.v22.json`, `native/load.php`, `native/upgrade.php`, `native/RESULTS.log`. The scoped fixture loads prior explicitly inspected modules, not a full-plugin clone. Source paths are in the native loader and existing baseline README.

Physical-device listening and Guy acceptance remain open. Leo-Web owns continuation of the pending full-plugin test once its existing package question is answered; Lead owns subsequent integration/install. No repeated question, merge or refused-export workaround was performed. The earlier one-time evidence-CI monitor is verified paused (`enabled=false`, `nextRunAt=null`); its exactac35464 run41549987574 has since passed.
