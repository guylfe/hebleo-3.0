# Selected flashcard audience — isolated implementation

The person's follow-up selected the flashcard audience. This resolves the substantive choice in ACCESS_DECISION.md; that document and live-policy.json preserve the source evidence.

## Change

conjugation.php allowed() now requires is_user_logged_in(), a positive current user ID and a strict true result from hebleo_conjugation_access, defaulting to true. Therefore every authenticated WordPress account is eligible without LearnDash enrollment, membership, purchase or refund queries, matching the inspected flashcard study audience. An existing site filter can restrict access but cannot authorize anonymous users. There is no new product/purchase interpretation.

The study AJAX nonce is not an entitlement: it protects existing stateful study requests. This shortcode reads the private packaged catalog and invokes no study handler; no study nonce is needed or minted.

catalog-data.php protection, anonymous denial, approval checks, no public JSON, no fixtures in the production package and all shared JS/CSS bytes remain intact. The code performs no learner-state writes, course checks, SQL, migrations or external calls.

## Verification executed

1. php -l adapters/wordpress/conjugation/conjugation.php — passed.
2. php adapters/wordpress/conjugation/access-evidence/policy-replay.test.php — all13 assertions passed against captured original live source with API doubles; confirms the distinct original course/flashcard gates.
3. node --test adapters/wordpress/conjugation/package.test.mjs adapters/wordpress/conjugation/direct-access.test.mjs — all3 tests passed. Local actual PHP HTTP tests cover anonymous shortcode denial, signed-in default allowance, optional restriction denial, direct catalog404 including an authorization-shaped query, no public JSON, exact package identity and stale public JSON refusal. All account/API behavior is doubled; no live learner account was used.
4. php adapters/wordpress/conjugation/adapter.test.php ../guarded-package-flashcard-audience/conjugation.php — all14 assertions passed. Covers absent entitlement mapping, positive-ID guard, anonymous cannot be bypassed by true filter, strict boolean restriction, no catalog on denial, module bootstrap and fixture protection. A LearnDash stub throws if called.
5. node adapters/wordpress/conjugation/package.mjs public/conjugation/catalog.json ../guarded-package-flashcard-audience — generated a new package.
6. node adapters/wordpress/conjugation/verify-package.mjs ../guarded-package-flashcard-audience — verified all7 files; schema2,0approvedForms,deprecatedPublicCatalogAbsent=true.
7. git diff --check — passed.

Package absolute path:
C:\Users\Trans\.openmausbot\task-workspaces\87d0667d-8e06-4e26-bc79-5a718991b13c\6f420fe6-680d-4442-9d5a-c702edc80e35\guarded-package-flashcard-audience

New conjugation.php SHA256: 71b10355e268d0ba4be3f0dd6d453bf9cd3433a8a0814da24d6ad1f84bc2f5e5.
Full identity receipt is manifest.json within that directory. Earlier guarded-package is the previous default-deny preparation; use the new directory.

## Lead integration and installation

Cherry-pick the follow-up implementation commit on top of evidence commit61653176aca850608aff36be7ef35640eaa2e5b0. Both are on private branch fix/wordpress-access-evidence-20261107. Root's integration checkout was not edited.

No additional access filter mapping is needed for the selected audience. Do not replace it with course25283 gating. Preserve any existing deliberate site restriction hook.

Parent retains ownership of content integration, installation and destination verification. Rebuild from integrated reviewed content/code; back up exact affected plugin/page/filter and protected state privately; replace the entire plugin directory; independently verify manifest hashes and exact file set, including absence of assets/catalog.json; place shortcode on the intended page. Verify anonymous, signed-in unenrolled, signed-in enrolled and any explicitly restricted account behavior; ensure caches cannot serve authenticated catalog HTML anonymously. Verify protected-state equality and rendered phone/desktop UI.

## Limits

No live runtime, page, plugin, rule, account, enrollment, order or learner state was changed. No key was published. All new execution was local and isolated; real-account destination behavior, installation, protected-state readback, browser/device UI, full integration/CI and user acceptance remain unverified here. The available package has zero approved grading forms; it is guarded install preparation, not a usable full conjugation release.

Automations were checked again. No conjugation/access-related automation exists on this bot; unrelated automations were left unchanged.

