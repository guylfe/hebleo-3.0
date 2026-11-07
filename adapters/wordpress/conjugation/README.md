# Portable conjugation drill — Feature Engineer handoff

Based on remote main 0bbd389f35e8069dd8ca19e447414c40c1b69ee3. Ownership follows CONJUGATION_ENGINEERING_CONTRACT.md (Lead task 4b4e2107). No catalog.json, native integration, shared checklist, authored course, learner database or live WordPress modifications.

## Native integration

Cherry-pick the delivered commit. Load public/conjugation/practice.css and import mountConjugation from public/conjugation/view.js. Call:

```js
const mounted = mountConjugation(root, {
  catalog, learnedIds: learner.conjugationLearnedFormIds ?? [],
  platform: 'native', storageKey: `conjugation-display-v1:${learner.id}`
});
// Before route/profile replacement:
mounted.destroy();
```

The exact contracted interface returns {destroy()}. Catalog invalidity throws; the caller owns fetch/load/error states. Only approved forms grade by default; source-attested and held cannot enter a drill. Fixtures require allowFixtures:true and a persistent visible rehearsal banner. Do not pass that option in native production. No native lesson save/completion behavior is implemented here: Architect owns it.

engine.js exports validateCatalog, eligibleForms, selectForms, normalize, displayHebrew, answers, shuffle, makeChoices, Drill and TENSES. selectForms accepts kind, wordIds, tenses, person, gender, number, platform, scope, learnedIds. Drill resolves supplied selection IDs back to the validated catalog, preventing a caller from substituting an unapproved object under an approved ID. No fetch, learner writes, lesson unlocks or SRS APIs exist in this layer.

Display spellings stay explicit; normalization removes Hebrew combining marks only for comparison, not display authoring. Maqaf and punctuation remain meaningful in Hebrew. English comparisons allow case, whitespace and one final sentence punctuation mark. Only explicit answer alternatives plus the approved readings of identical Hebrew forms are accepted. No typo correction is inferred. Reverse ambiguity is computed across all eligible records; valid readings are excluded from distractors. Too few distinct options are shown honestly; a sole choice is disabled and Write remains available.

Preference persistence stores only Nikkud and direction, best-effort under the supplied key. Native Learned only is the initial scope. Word selections default to available words; no interrupted-round or cross-device persistence. Each round starts Choose; Write persists through subsequent questions. Both drafts and original attempt identity survive mode/Nikkud changes. Changing setup abandons the drill. Overrides require the original typed mismatch, even if the current mode has changed. Show answer uses explicit self-check, not a typed mismatch override.

## WordPress package and guarded installation handoff

This is a separate plugin variation with shortcode [hebleo_conjugation], no routes, activation hooks, SQL, profile writes, migration, SRS or external service calls. The selected audience is the existing flashcard study audience: any authenticated WordPress account with a nonzero current user ID. No course enrollment, purchase or refund check is added. PHP emits the catalog only after authentication and a strict true result from hebleo_conjugation_access(user_id), whose default is true. The optional filter may restrict access; it cannot bypass authentication.

Live policy inspection and exact captured source are in access-evidence/ACCESS_DECISION.md and live-policy.json. Flashcard study uses login plus a study-request nonce; course25283 has a different enrollment audience. The person selected the flashcard audience in the follow-up. The nonce protects the existing stateful study requests; this read-only shortcode makes no such request and does not mint or invoke a study nonce. No new entitlement mapping is required. Verify signed-in, logged-out and any locally restricted accounts at the destination. PHP tests use isolated WordPress API doubles, not a live site or full WordPress runtime. Real-account destination behavior remains unverified.

Package from a reviewed catalog:

```text
node adapters/wordpress/conjugation/package.mjs ABSOLUTE_APPROVED_CATALOG_PATH NEW_OUTPUT_DIRECTORY
```

The output directory must not exist. The packager rejects any fixture record, filters held/source-attested forms, copies unchanged relative ES modules/CSS into assets/, adds guarded catalog-data.php and bootstrap.js, and writes manifest.json with SHA256 for every deployed file. An empty approved subset is valid and displays the content gate. No fixture/rehearsal source is copied. The PHP shortcode refuses any package whose catalog still contains non-approved records. Catalog bytes live in catalog-data.php, which returns data only after the existing account decision; direct requests emit no key. No public assets/catalog.json is distributed.

Lead installation sequence: review actual safe content and run package/tests; back up destination files and protected state under the existing guarded deployment workflow; atomically replace the entire plugin directory with the generated directory (never overlay files); verify manifest schema 2 and the complete exact file set, explicitly refusing any retained assets/catalog.json; preserve any existing site restriction filter and place the shortcode within the intended existing page; independently download and compare every deployed file against manifest.json; confirm authenticated/denied behavior and protected state equality; inspect actual destination phone/desktop rendering. Ensure authenticated catalog HTML cannot be served to anonymous visitors by page caching. Run `node adapters/wordpress/conjugation/verify-package.mjs PACKAGE_DIRECTORY` on staged/downloaded files; it checks all hashes and refuses deprecated public catalog files or any extra file. No live install was attempted here. Rollback restores that directory/page/filter from the backup; there are no new database records to migrate.

## Verification and rehearsal

Commands actually run:

- npm ci --ignore-scripts (78 packages; audit reports zero vulnerabilities)
- node --test test/conjugation-engine.test.js test/conjugation-view.test.js adapters/wordpress/conjugation/package.test.mjs (19 passed)
- php -l adapters/wordpress/conjugation/conjugation.php (passed)
- node --check public/conjugation/engine.js and node --check public/conjugation/view.js (passed)
- npm run check (existing app syntax checks passed)
- node adapters/wordpress/conjugation/rehearsal/serve.mjs
- HTTP fetch smoke check of root's surface URL, engine, view and CSS (all 200)

The package test invokes actual PHP against the packaged shortcode with API doubles: anonymous denial even with a true filter, zero-ID denial, authenticated mount without entitlement mapping, explicit restriction denial, truthy non-boolean denial, module script and no fixture flag. A course-access stub throws if consulted. It also independently verifies generated asset hashes and unchanged module bytes, refuses fixtures at build time and verifies runtime rejection of a tampered fixture catalog. Temporary synthetic approval records in that test exist only inside a removed OS temporary directory.

Raw test/syntax output and screenshots are in evidence/. Browser observations are recorded separately in evidence/BROWSER.md. The first rehearsal navigation exposed a relative-path 404; corrected to the absolute surface path and added a regression check.

Run the rehearsal from this clone, then open http://127.0.0.1:33607/. Query platform=native or wordpress, with phone=1 for a real 360px iframe viewport. All fixture forms are visibly synthetic and explicitly opt in. It includes the exact 11/19 labels, seven illustrative grading records, and honest unavailable records; none are supplied as a production catalog.

Still unverified: full integrated test suite/CI, native route/author save/completion (Architect/Lead), reviewed production catalog and its linguistic coverage (Curriculum/Lead), actual WordPress package installation and real-account access, destination protected data readback, actual installed phone/desktop UI, physical Android and user acceptance. The flashcard audience binding is implemented and tested in isolation. No claim of full 11/19 grading coverage or production delivery is made.


Lead B1 correction: run `node --test adapters/wordpress/conjugation/package.test.mjs adapters/wordpress/conjugation/direct-access.test.mjs`. The new actual PHP HTTP regression proves anonymous/direct catalog denial, authorized-only embedding, and rejection of a staged upgrade retaining the deprecated public JSON. Earlier catalog.json package evidence is historical and superseded.


## Live verification boundary after the7November installation

Do not use wp_set_current_user to impersonate other existing users for a supposedly read-only live access test. Installed BuddyBoss hooks persisted a forum role during that operation. Use isolated copies for simulated identities/denials, and existing real authenticated Browser plus anonymous HTTP for live checks. Capture a consistent private per-row ID/key/hash baseline before activation, because activation/authentication hooks can mutate derived cache or account metadata. The known role entry was exactly restored with an audited compare-and-set; broader preservation remains dependent on hosting row-change evidence.
