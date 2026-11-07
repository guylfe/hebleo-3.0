# Lead correction of B1 — 7 November 2026

The release review reproduced a real access bypass in d571256: the WordPress package's static catalog JSON could be fetched without the account decision. Native API/module serving, practice logic and lesson unlocks were not implicated.

Correction: `private-catalog.mjs` generates `catalog-data.php`. It checks ABSPATH, the installed plugin's permission function and its strict account decision, then returns data to an authorized include without printing it. The shortcode includes it only after its existing access check and retains per-record approval validation. `assets/catalog.json` is no longer distributed. Manifest schema2 declares that path forbidden.

`verify-package.mjs` checks all seven files against their hashes, refuses any extra file and specifically refuses a retained deprecated catalog. Supported installation is a complete atomic directory replacement, never a file overlay. At eventual installation, independently list the destination and verify the deprecated path is absent before considering access verification complete. No installation or deletion at a live destination has happened.

Actual commands/results:

- `node --test test/conjugation-engine.test.js test/conjugation-view.test.js test/conjugation-native.test.js test/conjugation-integration.test.js adapters/wordpress/conjugation/package.test.mjs adapters/wordpress/conjugation/direct-access.test.mjs`: **39 passed**, no skips/failures. Raw local log `evidence/conjugation-integration-20261107/focused-corrected.log`.
- The new HTTP regression launches actual PHP on an ephemeral localhost port, with seven explicitly synthetic records inside a removed temporary directory. Direct `/catalog-data.php`, `/catalog-data.php?authorized=1` and `/assets/catalog.json` return404; PHP-data responses are empty. Anonymous shortcode has no embedded catalog. Explicitly authorized shortcode embeds all seven test records. This is isolated PHP/WordPress-double evidence, not a live WordPress sign-in claim.
- The same regression proves package verification fails when an obsolete public JSON is added to a staged directory, then restores its own temporary fixture before the HTTP check.
- `node adapters/wordpress/conjugation/package.mjs public/conjugation/catalog.json ../wordpress-conjugation-corrected-package`: generated the current zero-form, seven-file review package.
- `node adapters/wordpress/conjugation/verify-package.mjs ../wordpress-conjugation-corrected-package`: **7 hashes verified / zero forms / deprecated public catalog absent**. Receipts `wordpress-corrected-package.json` and `wordpress-corrected-verification.json` under the Lead evidence folder.

Current corrected package is the sibling `wordpress-conjugation-corrected-package`; earlier `wordpress-conjugation-package` and `wordpress-conjugation-review-package` are historical, superseded B1 evidence and must not be deployed.

Independent clearance of B1 is pending at this checkpoint. Content remains zero approved records and destination access policy remains unbound. No production installation is claimed.
