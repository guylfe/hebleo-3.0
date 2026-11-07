# Conjugation implementation — reviewed base integrated into private main

Guy approved implementation of the final 7 November mockup in both platforms. The reviewed base is integrated into private main from `0bbd389` with Feature Engineer commits `1731f793` / `4756771b` and Architect `2d1179b4`, followed by Lead integration fixes. This is an implementation and test delivery; **neither installed learner version has been changed for this feature**. Production grading is blocked on the exact content gate below. User acceptance is unreported.

## What is implemented

The shared engine/view supports the exact 11 verbs and 19 preposition identities, both directions with Choose default, Write, English placeholders, explicit display spellings, Nikkud, compact filters, retained choice/text drafts and attempt-only self-approval. Each selected form occurs once per shuffled pass; missed forms return after all remaining forms and repeat in further passes if needed. A learner correction removes that attempt from pending review. Ambiguous valid readings are accepted and excluded from distractors. Too few choices explain the available Write option. Practice never calls a flashcard/SRS mutation.

Native My Hebrew opens `#conjugation`. Studio saves exact lesson `conjugationUnlocks.formIds` through its existing workspace/CAS/publishing flow; only successful completion of that actual pinned lesson snapshot adds those exact IDs to that learner. Open/preview/practice ahead does not grant anything. Native loading/retry/profile/disposal behavior is integrated. No fixture is enabled in production; injection is confined to an explicit in-memory Store.

WordPress has a separate read-only shortcode plugin package. The package filters held records and refuses fixture records; the runtime independently rejects non-approved records. Authentication and the site's explicitly bound access decision are both required. No SQL, activation migration, new deck, account, payment or curriculum operation is added. The access filter defaults to deny and is not yet bound at the destination; the existing site's access policy must be connected and verified before an eventual installation. No blanket allow was substituted. Release review found the original public JSON catalog bypassed that gate. The corrected package uses guarded PHP data, exposes no public JSON and requires complete directory replacement with deprecated-file refusal; an actual PHP HTTP regression verifies the boundary.

Mounted Browser testing also exposed a typed-field blur rerender that swallowed the first Show/Check click. Setup-change handling now ignores typed-answer blur; a regression test preserves the original action node through that event.

Lead consolidated the two catalog validators into `public/conjugation/catalog-contract.js`, used by native loading and the portable engine/packager. It enforces safe stable IDs, explicit complete displays/answers, semantic targets, reviewed alternatives and provenance. The new module is included in the native served-file list and generated WordPress manifest. Phone typography/spacing was adjusted within the approved 2/3-column grid; native colors inherit the established refinement tokens.

## Concrete content gate

The unchanged course evidence represents 302 semantic cells (115 verb / 187 preposition), not 302 approved drill records. The 308 external proposals remain separate. The production catalog contains the exact 30 lexical identities and **zero grading forms** because the selected evidence lacks independently authored standard-unpointed answers; preposition accepted English answers also need authoring. No marks were stripped to author standard spelling, no contested pointing was repaired and no illustrative exercise became course content.

The smallest nonempty subset would be one explicitly approved record: `verb-proposal-02:past:3sg:m`, pointed `רָצָה`, standard unpointed `רצה`, exact authored English `(he) wanted`, with its course source post25792/table2/row13/cells0–1 and explicit record approval. The raw Curriculum proposal uses dots in its review ID; the runtime-safe colon ID here is the proposed implementation identity. This one-record proposal is **not approved or present in the production key**. It would allow Write/reveal only; meaningful Choose coverage needs enough distinct reviewed answers. Full 11/19 coverage remains additional content work. See `docs/content-provenance/conjugation-20261107/CONTENT_GATE.md` and the exact 509-unit `PROVENANCE_LEDGER.json`.

Next content owner: Leo/Guy selects and approves a complete first subset; Curriculum packages that exact approved key. Leo-Web owns the separate bounded live access investigation and binding branch; Lead reviews the actual returned artifacts, integrates and tests them, regenerates both packages after key approval, then performs preservation installs and independent destination readback. No broader Nikkud/action-noun/paradigm choice must be forced to approve a smaller explicit subset.

## Executed checks and evidence

- `npm ci` and `npm ci --ignore-scripts --prefix schemas` completed. Runtime dependencies audited at zero vulnerabilities; the existing schema dependency tree reports one moderate advisory, unchanged by this feature.
- Final focused command: `node --test test/conjugation-engine.test.js test/conjugation-view.test.js test/conjugation-native.test.js test/conjugation-integration.test.js adapters/wordpress/conjugation/package.test.mjs adapters/wordpress/conjugation/direct-access.test.mjs` — 39 passed, no skips/failures.
- `npm run verify:candidate` — 1,190 passed / 9 existing skips / 0 failures (1,199 total), independently run on d571256. This is the repository's configured candidate/CI command; its existing audio exclusions remain explicit, and it is not an unrestricted full-suite claim.
- `node --test --test-name-pattern='browser module dependency graph' test/new7-corrections.test.js` — the actual HTTP module graph passed, including the new shared catalog module.
- `php -l adapters/wordpress/conjugation/conjugation.php` passed. The package tests execute actual PHP with isolated WordPress API doubles and independently verify generated file hashes. They do not establish an installed WordPress runtime.
- `node qa-tests/verify-conjugation-provenance.mjs` verifies all 12 input hashes and directly compares all 302 represented cells against the unchanged authored draft; the 308 external proposals stay separate.
- The strict premium static audit reports four findings in unchanged existing Studio/vendor files. Their baseline identities are retained in the evidence; none is in the conjugation change. No unrelated UI change was made to clear those findings.
- Mounted Browser evidence includes actual integrated native desktop and a real 360px iframe viewport, plus the shared WordPress fixture adapter at desktop/360px. Exact equal widths/no overflow, draft/mode/Nikkud and self-approval observations are recorded separately. Browser simulation is not physical Android, installed destination verification or Guy acceptance.

Raw Lead logs, static audit, preservation/source receipts, package manifest and screenshots: `evidence/conjugation-integration-20261107/`. Raw `.log` files remain local and ignored. The Feature Engineer's earlier scoped evidence is in `adapters/wordpress/conjugation/evidence/`; it is labeled as isolated fixture evidence rather than installed/native integration.

## Reproduce without touching installed data

Run `node qa-tests/conjugation-rehearsal.mjs` for the in-memory integrated native app at `http://127.0.0.1:63491/#conjugation`, Studio at `http://127.0.0.1:63491/#studio`, and phone wrapper `/__rehearsal_phone`. It uses synthetic content and starts with no learned forms. Same-origin framing is relaxed **only in this disposable rehearsal process**, never in the normal server. Stop that process to discard all fixture author/learner changes.

Run `node adapters/wordpress/conjugation/rehearsal/serve.mjs 33608` for the labeled shared-view fixture adapter at `http://127.0.0.1:33608/`, with `?platform=wordpress&phone=1` for the phone surface. This is not an installed WordPress site. The separate actual PHP shortcode/package checks are automated above.

Build a new output folder with `node adapters/wordpress/conjugation/package.mjs public/conjugation/catalog.json NEW_DIRECTORY`. The current catalog produces a zero-form gated package; it must not be described as a usable learner release. Guarded deployment instructions and remaining access checks are in `adapters/wordpress/conjugation/README.md`.


## Independent review checkpoint

QA received a bounded pass on d571256: 38 focused tests and 200 randomized rounds, mounted native Studio exact three-ID save/reload plus API readback, both final 360px grids, native first-click/typed correction and five served hashes. Its full committed receipt is in evidence/qa-conjugation-independent-20261107/. Lead integrated QA commits35dd5c6/606553f. Release Reviewer independently ran configured candidate checks1,190pass/9skip/0fail and reproduced one blocking WordPress public-catalog bypass (B1). Lead corrected B1 as above; the independent correction clearance and successful feature CI/main integration are recorded below. No content/installation gate is inferred closed.


## B1 independently closed on a69f174

Release Reviewer re-reviewed the exact corrected commit a69f17438f66c8a6a8e1808b5904e808bed078dd, independently reproduced empty404direct PHP and obsoleteJSON404, all anonymous/denied/truthy-string denials, seven-record authorized synthetic embedding, exact seven-file fresh-package equality and staleJSON/extra/modified-asset refusal. Three affected tests and both PHP lints passed. B1 is CLOSED; bounded engineering merge is clear subject to Lead CI verification. Evidence: evidence/release-conjugation-20261107/B1-a69f174/REVIEW.md and independent-b1-results.json. At the original checkpoint, corrected WordPress CI42368683197 passed and Local42368683256 was running. The continuation below establishes their final results and main integration. Content, access policy, installation and user acceptance gates remain open.

## Private main integration — 7 November 2026 continuation

The corrected code `a69f17438f66c8a6a8e1808b5904e808bed078dd` passed [Local demo checks 42368683256](https://github.com/guylfe/hebleo-3.0/actions/runs/42368683256) and [WordPress checks 42368683197](https://github.com/guylfe/hebleo-3.0/actions/runs/42368683197). The documentation/evidence head `8d19d05397337d8695079032ad764ade01308f7a` also passed [Local demo checks 42369045495](https://github.com/guylfe/hebleo-3.0/actions/runs/42369045495). All three were read back as completed/success before integration. The only changes from the corrected code head were documentation and review evidence, including the independent review probe.

Lead fetched current remote main, confirmed `0bbd389f35e8069dd8ca19e447414c40c1b69ee3`, verified the clean isolated checkout, switched its local main, and fast-forwarded the reviewed feature without a conflict. This completion record changes only this report and FEATURE_CHECKLIST. Final remote main identity and resulting main CI are recorded outside the repository in the continuation delivery receipt, so status recording does not create another CI cycle. The private remote and pushed SHA must be independently read back before claiming delivery.

The live access work is a separate active Leo-Web assignment, based on the reviewed candidate. Initial read-only inspection establishes LearnDash course25283 closed checkout and an HTTP200 anonymous custom `/decks/` shell; it does not establish a shared learner entitlement predicate. MemberPress and visibility plugins require inspection. No study handler is called as a read-only probe because it may mutate progress. The actual binding and allowed/denied-account verification remain Leo-Web's bounded work; Lead must review returned source and tests before integration. This continuation neither duplicates that work nor treats a generic policy question as its resolution.

The full proposed answer key remains with Curriculum/Leo for human review; proposal authorship is not publication approval. Production still has 30 lexical identities and zero approved grading forms. Neither version has conjugation installed. Existing native63358 build785ab53, preserved logical database09cec407, and WordPress15a433f remain the installed baseline. The already-recorded before/after preservation receipts are unchanged; this continuation does not restart or write either runtime/database. Synthetic in-memory review demos remain separate from installation. Physical Android and Guy acceptance remain unverified.
