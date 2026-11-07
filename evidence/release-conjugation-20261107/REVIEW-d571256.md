# Independent conjugation integration review — 7 November 2026

**Verdict: HOLD merge of `d57125620f98f0b18630975d1e970d1e11ebaa95` for one bounded engineering correction: the WordPress package publishes its catalog as an unauthenticated static asset.** No additional blocking defect was found in the reviewed native completion, Studio publication, fixture isolation, or practice engine paths.

This verdict concerns implementation readiness with an explicit content gate. It is not production approval. The zero-form catalog makes the bypass dormant today; it does not make the packaged access control correct for the first approved record.

## Revision, scope and ownership

Reviewed repository: `C:\Users\Trans\.openmausbot\task-workspaces\8c900356-50f6-4d41-bbb9-50c8abe09233\4b4e2107-5d42-40d1-b10e-09e753189ff3\conjugation-integration`

Branch: `feat/conjugation-integration-20261107`; base `0bbd389f35e8069dd8ca19e447414c40c1b69ee3`. HEAD was the exact assigned revision and the integration working tree was clean before and after the checks. No implementation, main-branch, installed application, learner database, or live WordPress change was made. The reviewer created only the evidence folder containing this report.

Read the repository rules, initial brief, relevant product specification, original `IMPLEMENTATION_APPROVED.md`, prior PLAN/DECISIONS, parent engineering contract, current implementation/content/native-contract documents, and actual changed code/tests. Memory supplied historical context only; current authorization and artifacts controlled this review.

Independent tests used disposable in-memory learners and explicitly labeled synthetic catalogs. The WordPress reproduction used an isolated local PHP server and a synthetic-only generated package. Existing WordPress source files were inspected read-only through the site's connected access; no learner rows or secrets were read. QA's painted interaction review remains separate.

## Blocking engineering finding B1 — public catalog bypasses WordPress access

**Priority: P1.** Affects `adapters/wordpress/conjugation/package.mjs:11-15` and `adapters/wordpress/conjugation/conjugation.php:10-19`.

The packager writes every approved grading record to `assets/catalog.json` inside the installable public plugin directory. The shortcode calls `allowed()` before embedding the same file, but an HTTP request for the JSON file never calls that PHP function. Its guard therefore protects the shortcode response, not the teaching data. No packaged server rule or executable data-file guard protects the static file.

Independent reproduction used the unmodified assigned packager and seven deliberately synthetic test records:
- Anonymous shortcode request: “Conjugation practice is unavailable for this account.”
- Same anonymous client, direct `/assets/catalog.json`: HTTP **200**, **7/7 synthetic grading records**.
- No WordPress install, production record, login, or paid operation was involved.
- The native counterpart correctly returned **403** for a revoked course API request and **404** for direct catalog access.

Evidence: `independent-probes.mjs`, `independent-probes.json`, and `isolated-synthetic-package/` in this folder. The latter is test evidence only; it must never be deployed. The supplied zero-form review package uses this same public-file layout.

**Smallest resolution:** package the catalog as a PHP-returned data file with a direct-execution guard, load it only after `allowed()`, and stop distributing the public JSON. Preserve the per-record approval check and manifest hashes. An authenticated data handler is another solution but is not necessary for this shortcode design. Ensure an upgrade cannot leave the old JSON behind.

Add a package-level HTTP regression demonstrating that denied/anonymous clients cannot retrieve catalog bytes by a direct file URL, while an explicitly authorized shortcode still mounts reviewed data. Retain the existing fixture rejection, strict-boolean default-deny and generated-file identity checks. Re-run the focused tests and package readback on the corrected revision before requesting clearance.

This is an engineering defect, not a request for linguistic approval or an unavailable destination credential.

## Independently verified engineering evidence

| Check actually run | Result |
| --- | --- |
| `node --test test/conjugation-engine.test.js test/conjugation-view.test.js test/conjugation-native.test.js test/conjugation-integration.test.js adapters/wordpress/conjugation/package.test.mjs` | 38 passed; no failures/skips |
| `npm run verify:candidate` | 1,190 passed; 9 existing skips; 0 failures; 1,199 total; about 85 seconds |
| `node --test --test-name-pattern='browser module dependency graph' test/new7-corrections.test.js` | 1 passed; actual HTTP module graph includes the shared catalog contract |
| `php -l adapters/wordpress/conjugation/conjugation.php` | Syntax passed |
| `node qa-tests/verify-conjugation-provenance.mjs` | 12 input hashes, 302 source cells, 509 held review units, 308 separate external proposals reproduced |
| `node independent-probes.mjs REVIEWED_REPOSITORY EVIDENCE_FOLDER` from this evidence folder, with absolute arguments | Four positive boundary/integrity probes passed; fifth confirmed B1 |
| Independent SHA256/package comparison against `../wordpress-conjugation-review-package` | All 7 manifest files verified; six PHP/JS/CSS source files match the revision; catalog semantically matches filtered source; 11 verbs/19 prepositions/0 forms |

The configured candidate command excludes audio filenames and skips audio/speed/playback names. These totals are not an unrestricted whole-repository claim. Focused and candidate results overlap and must not be added together. Logs: `focused-tests.log`, `candidate.log`, `candidate-error.log`, `module-graph.log`; package receipt: `package-verification.json`.

The original new completion-failure regression was independently run. Additional probes injected failure **after** the learner write in both explicit Finish and sentence self-approval; each rolled back all database tables, then a successful retry granted exactly the intended form. Nested transactions in the sentence path retained this atomic behavior. Initial custom-probe fixture setup was rejected by existing lesson-reference/distractor validators; the probe was corrected to use the existing ordering lesson before recording its successful results.

Actual Studio/coordinator/HTTP tests passed exact partial IDs, sibling edits, save/reload, CAS conflict retention and scoped publication. Completion used the submitted lesson snapshot in pinned-session tests and did not expand prepositions to later catalog additions. Another learner remained unchanged. Reads, preview, practice ahead and practice interactions did not grant completion or mutate cards. These are executable fixture results, not human teaching approval.

Legacy profiles default an absent learned-ID list to empty without writes. Restore retains structurally valid historical IDs even when the current catalog has no matching forms; my additional restore probe preserved lesson IDs, learner IDs and card state without making those forms gradeable. This does not establish restore under an older executable.

The common validator is actually imported by native loading and the portable engine/packager; production Store loading rejects fixture records, fixture injection is limited to `:memory:`, and only the fixed native module list is served. The shared engine/view contains no network or SRS write path. Round ordering, repeated missed passes, both directions, draft retention, attempt-scoped correction and ambiguity exclusion passed the actual implementation tests.

## Separate content and destination gates

**Content:** The source and packaged catalog both contain exactly 30 selected lexical identities and zero grading forms. I independently reproduced the source/hash comparison rather than treating the Lead's result as proof. Source attestation and the 308 external proposals remain separate. Missing independent standard-unpointed forms and authored preposition English answers have not been invented. The proposed first record `verb-proposal-02:past:3sg:m` remains a proposal. One approved record would support Write/reveal, not a meaningful multiple-choice set or full 11/19 coverage. Content approval is a genuine teaching-release gate, not an engineering-merge objection once B1 is fixed.

**Existing WordPress access:** Both the authorized baseline and current `wp-learning-cards` source were inspected. Current `templates/card_loader.php:156-173` and `:335-347` check a request nonce and nonzero current user; they do not expose a reusable course/membership/refund access predicate. The scheduler documents reliance on the original handler's nonce/user checks. A bounded scan of all 23 PHP files within this plugin found no candidate named course-access integration. Exact excerpts and current source hashes are in `wordpress-access-evidence.json`.

This establishes the plugin's login/request checks only. It does not establish site-wide protected-page rules, external membership rules, or intended conjugation eligibility. Calling the existing study AJAX handler is unsuitable: it also initializes/updates study data. The smallest remaining destination step is for Lead to identify the existing protected-page/site access decision and bind the strict-boolean filter to that read-only decision. Do not infer refund policy or replace the gate with unconditional access. If the intended policy is simply all signed-in users, that policy must be established from the authorized destination context rather than guessed from this unrelated handler.

**Installation/acceptance:** No feature installation was performed. I did not independently inspect port 63358, its live database, CI, physical Android, or destination painted behavior. The Lead's installed-build preservation receipt is a reported artifact, not my fresh installed-state verification. Production native identity remains the existing explicitly fictional local-demo boundary.

## Handoff

Lead owns the smallest B1 correction and its focused regression; return the exact corrected commit/package for re-review. Keep content approval and destination access verification explicit. After B1 is resolved, these results support a bounded merge assessment with the empty content gate, not a usable learner release or production launch.

Only this review folder was written:
`C:\Users\Trans\.openmausbot\task-workspaces\71c71389-5334-4e0c-9ca8-d80dd28223d1\653fb433-7485-48b1-9f7c-cb22711bda02\hebleo-3\.release-review-conjugation-20261107`

No commit/push was made because this was a read-only review of Lead-owned artifacts. No automation exists for this review. A delegated request to arrange a process-completion notification was refused; the candidate run had completed before the final evidence readback, so no pending test monitor or follow-up is needed.

