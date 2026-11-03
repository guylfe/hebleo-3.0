# WordPress shared-card candidate

Uninstalled. New importer/bridge/release source is committed here; no learner data, vocabulary/media packages, credentials, complete private plugin source or local databases are included. Existing original notes,917progress rows and68assignments remain unchanged on WordPress.

The three independent findings are corrected and rechecked. See `LEAD_CORRECTIONS.md` and the shared-card installed evidence directory. First imports refuse edits made since provisioning; unchanged imports have a validated no-op rollback; file release has stage-all writes, a private signed recovery journal, per-plugin lock and before/after hash guards. Recovery never restores an entire database or deletes notes/progress.

Prepare the two targeted hook files with:

    node prepare-plugin-files.mjs APPROVED_ORIGINAL_PLUGIN_DIRECTORY FRESH_PRIVATE_STAGE

This uses only the existing three inspected files, requires their exact original hashes, and reproduces both independently reviewed candidate hashes. It never fetches a plugin or reconstructs a refused export. The supplied local native fixture can reproduce those scoped hooks; full plugin bootstrap/access still requires the already-pending permitted complete package/hosting clone. Keep the source plugin untouched and the generated stage outside the web root. `release.php` and `release-recovery.php` remain operator-only; they expose no routes and do not install automatically.

`convert-runtime.mjs` takes the trusted shared renderer's generated runtime JSON and writes the WordPress import artifact. Its exact digest must be independently reviewed before `admin_import`; the artifact's own provenance label is not approval. Validate immutable media hashes in their real directory. Raw fields, derived documents and stable SourceId/direction mappings remain separate. Draft provisioning does not attach/publish the content or enroll learners. Later audio must have the exact existing source/form/value binding; phrases cannot replace noun/form audio.

The v2.2 delta accepts the independently verified approved APKG alongside the original v2.1 backup source. The converter retains all 97 exact unpointed example texts in Forms and adds 107 explicit Phrase:N audio bindings on 56 existing notes, separately from 930 original bindings. Both dinner phrases on mf-000361 use the supplied גדולה/גדולות recordings; original noun fields/media remain exact. No phrase pointing or translation is generated. The app and this candidate use the same v2.2 raw export and immutable media.

Before installation: complete native full-bootstrap/access and capacity testing, real served media/authenticated CSP, explicit additive deck placement/publication status, private server backups/preservation hashes, and guarded journal recovery on that filesystem. The v2.2 scoped full-size upgrade/reimport/rollback harness peaks at929,038,336 bytes (about886MiB) under a1024M host limit; full-stack headroom remains unverified. Do not call this adapter installed or production-ready from the passing scoped tests. Prior correction hashes describe the reviewed v2.1 baseline; v2.2 changes only the source allowlist and exact phrase conversion.

Local source/runtime/native fixtures and exact commands remain in Lead's task `wordpress-shared-cards` folder. `release-recovery.test.php` requires its explicitly synthetic `native/plugin-fixture` with the three original files (or a reviewed equivalent test-only copy); it must not run against production. `node frame-host.test.mjs` is a standalone executable bridge test. Full native import, failure-injection and CSV tests were independently run against disposable WordPress7.1.4/MariaDB11.4.13, not a complete production plugin clone.
