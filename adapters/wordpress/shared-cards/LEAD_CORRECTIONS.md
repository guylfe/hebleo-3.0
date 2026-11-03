# Lead corrections after independent review

3 November2026 Israel time. Candidate only; no production change.

- RR-SC-01: first/new-ID import now compares the locked native fields to the exact provisioned package baseline. Existing-ID import retains its prior-source comparison. Missing, edited or ambiguous baselines refuse before writes.
- RR-SC-02: file release now stages all replacements and uses a signed, private `hebleo-shared-release.json` operation journal before original-code mutation. Original-file backups are hash checked and recoverable during staging. Bootstrap activates last and is disabled first during rollback. A plugin-root exclusive file lock serializes operators. `release_recover_files(privateBackupRoot,nonce,'before'|'after')` works without a returned install receipt and accepts only recorded before/after hashes. Later code/asset edits, tampered journals or altered backups refuse. Code recovery never restores a database or deletes notes/progress/media. Initial install needs a fresh private backup directory; no existing stage/backup file is overwritten without a recorded operation.
- RR-SC-03: unchanged receipts carry native hash metadata. Their validated rollback is an exact no-op, without an unnecessary revision change.

Owner checks actually run after corrections:

- `php release-recovery.test.php`:28passed, covering initial staging failure with no original mutation, rollback staging failure/retry, all8possible original/installed three-file combinations in both recovery directions, newer edits, asset changes, journal tampering and retained inert assets. This test uses real local filesystem fixtures and explicit synthetic authorization/DB stubs; it is not production filesystem testing.
- `php ... native/test-lead-regressions.php SOURCE_MEDIA`:4real WordPress7.1.4/MariaDB11.4.13checks passed for the between-provision/import edit, missing baseline, unchanged native receipt, rollback and unchanged disposable schedules.
- `php ... native/test-full.php SOURCE_MEDIA`:all1025notes provision/import/readback/reimport/rollback passed, schedules unchanged,39.1seconds, peak822083584bytes. This remains scoped actual modules/CPT shell, not a complete plugin bootstrap.
- Original20disposable importer tests passed. Syntax checks passed for the changed PHP files. Local portable DB69956 on33379 was shut down and process absence verified.

`release.php` now requires adjacent `release-recovery.php`; keep both operator files together. Production bootstrap includes only shared-cards.php and its existing bridge files. The journal stays outside the web root with private permissions and a server-authenticated MAC. Three renames do not become a multi-file transaction: an interrupted operation must be resumed or rolled back with the authenticated journal before serving the new release. Independent correction recheck and the complete-package/access/media/backup/attachment installation prerequisites remain open.

Latest audio metadata: wording holds77/78are resolved in incoming delivery (`ארוחת ערב גדולה`, `ארוחות ערב גדולות`, mf-000361). Lead verified all97audio hashes unchanged and new ZIPa54238eb09c2c4fa8e7baca07f7a7987a2b794968b2944182456561f2db7f0f2. No phrase was imported as noun/form replacement. The current approved v2.1raw source has no whole-phrase slots; original noun fields and word recordings remain exact. No missing phrase Nikkud/translation was invented. See adjacent audio-binding-review.
