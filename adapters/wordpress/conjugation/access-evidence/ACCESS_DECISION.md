# WordPress conjugation access decision — 7 November 2026

**Historical investigation checkpoint.** The source evidence below is retained. Its pending audience choice and old default-deny package are superseded by CURRENT_BINDING.md and the implemented flashcard audience; destination verification remains pending installation.

Follow-up resolved the choice below in favor of the flashcard audience. See CURRENT_BINDING.md for the implemented isolated binding and fresh verification. This investigation remains the historical evidence for the two audiences; its earlier pending/default-deny statements describe the pre-selection checkpoint.

Base: 8d19d05397337d8695079032ad764ade01308f7a. Isolated branch fix/wordpress-access-evidence.
This is the substantive-audience-choice outcome permitted by the assignment. No production binding was selected or changed.

## Established live difference

| Surface | Existing decision | Signed-in account without course enrollment |
| --- | --- | --- |
| /decks/?deck=49480 | Public archive shell; study handlers require valid study_nonce and nonzero current user, then a nonzero deck ID for start. No enrollment, membership, purchase or refund check in either handler. | Passes the authorization prefix. |
| Main course 25283 | sfwd_lms_has_access(25283,userId), using closed course enrollment/group enrollment and administrative auto-enroll bypass; applicable LearnDash filters retained. | Denied by captured course decision. |

Actual anonymous cookie-free HTTP returned 200 with study-app for /decks/?deck=49480. Course landing also returned 200; its HTTP status alone does not establish lesson access. Full LearnDash settings have course_price_type=closed and no course_join key (a single-key lookup returns empty string for absent keys; this must NOT be interpreted as an explicitly empty course_join bypass).

Exact source: wp-learning-cards/wp-learning-cards.php:81-97 maps the decks CPT archive to archive-decks.php. card_loader.php:156-173 checks nonce/current user then queries all published decks; it initializes progress and settings afterward. card_loader.php:335-347 checks nonce/current user/nonzero deck. Full captured functions are in live-policy.json. No study AJAX handler was invoked live.

Course predicate: sfwd-lms/includes/course/ld-course-user-functions.php:61-72 wraps sfwd_lms_has_access_fn; function body starts line85. It permits auto-enroll privilege, open/sample exceptions, enrollment or enrolled group; this closed course does not carry the open/course_join bypass. Theme course templates call that predicate. IMPORTANT: ld_course_access_expired at line224 can update user metadata, remove course access and potentially progress; do not casually invoke sfwd_lms_has_access as a read-only live denied/expired account probe.

## Site-wide restriction inspection

- Determined actual MemberPress rule CPT from MeprRule::$cpt: memberpressrule.
- Direct SQL count grouped by all post statuses returned zero rows, independently MeprCptModel::all('MeprRule') returned zero.
- MeprRule::get_rules returned no matches for /decks/, /decks/?deck=49480, deck49480 or course25283. This covers URI/global/post rules using the actual rule model, not the earlier guessed CPT.
- Inspected live registered init/wp_loaded/parse_request/pre_get_posts/template_redirect/template_include/admin_init and AJAX hooks, plus both LearnDash access filters. Captured inventory is included. MemberPress's actual rule_redirection exists but has no configured rules.
- Searched PHP in flashcard plugin, active theme, mu-plugins if present and Dynamic Learndash plugin for gate/redirect/entitlement references. File hashes are included. Dynamic visibility calls course predicates; no matching flashcard entitlement was found. MerPress is Mermaid diagram rendering, unrelated to membership.
- Inspected all14 published WPCode snippets for access/route references. Snippet45179 redirects only the front page;45253 only redirects /dashboard;31021 gates a course-progress shortcode on login. No decks entitlement restriction found.
- No custom site-wide flashcard membership predicate was established. The effective flashcard study authorization in inspected source is login plus nonce, materially broader than course enrollment.
- Hook lists are from the authenticated connected request; front-end conditional registrations may differ. Anonymous actual HTTP corroborates public shell. No full signed-in real learner study request, denied/refunded account or physical device was exercised. No learner data was downloaded.

## Exact remaining choice and smallest implementation

Should WordPress conjugation use:
A. the current flashcard study audience: every signed-in account; or
B. the main course25283 audience: currently entitled LearnDash users, including group/admin bypass?

These differ for a registered unenrolled account and for a former purchaser whose course enrollment has been removed. A refund is not independently consulted by the flashcard gate; do not invent refund rules or infer what WooCommerce has done to enrollment.

Recommended default for Lead to resolve: A, because WordPress conjugation is independent practice alongside flashcards and intentionally has no lesson-unlock integration. This is a recommendation only, not an applied authorization choice. The assignment explicitly requires escalation when the two audiences differ, so no filter was silently widened.
If A is confirmed, bind hebleo_conjugation_access to a strict boolean current-account login decision; retain anonymous denial, guarded catalog-data.php and no public JSON. Test new binding with anonymous/signed-in unenrolled/signed-in enrolled doubles and actual approved destination accounts.
If B is confirmed, design the binding around the actual LearnDash decision and its expiry side effects; do not copy purchase/product IDs into new semantics or claim sfwd_lms_has_access is universally read-only.

## Executed checks and install preparation

- php adapters/wordpress/conjugation/access-evidence/policy-replay.test.php: 13 assertions pass. Replays the exact captured course function with explicitly isolated API doubles and the exact two study authorization prefixes, stopping before database access. Anonymous denied; signed-in unenrolled course denied; enrolled/group/admin doubles allowed; both study gates deny invalid nonce and accept signed-in unenrolled doubles. These are source-replay tests, NOT authenticated live-account proof.
- node --test adapters/wordpress/conjugation/package.test.mjs adapters/wordpress/conjugation/direct-access.test.mjs: 3 tests pass. Actual local PHP HTTP direct catalog denial, authorized-only embedding, fixture/held handling and stale public JSON upgrade refusal.
- Built ../guarded-package from current public/conjugation/catalog.json. Manifest schema2, 0 approved forms, 7 deployed files. verify-package.mjs passed all hashes and absence of deprecated assets/catalog.json.
- Runtime code and package behavior remain unchanged; default-deny stays in effect.
- No live plugin/page/rule/settings/enrollment/order/learner state changed, no live install, no key published. Anonymous GETs and read-only source/rule inspection only.

Installation after audience/content resolution: rerun package tests and package generation with the approved binding/content; obtain private server-side backup of exact affected plugin/page/filter and protected-state checks; replace entire plugin directory rather than overlay; verify exact manifest file set and independent destination hashes; confirm catalog direct denial, anonymous/denied/allowed behavior and protected-state equality; inspect destination phone/desktop rendering. Parent owns installation. Current zero-form package is guarded preparation, not delivery of usable conjugation teaching.

Automations inspected: no conjugation/access monitor exists on this bot; unrelated standing email continuation left unchanged.

