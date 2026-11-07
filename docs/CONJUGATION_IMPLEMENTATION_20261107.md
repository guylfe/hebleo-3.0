# Conjugation implementation — integrated review candidate

Guy approved implementation of the final 7 November mockup in both platforms. The implementation is integrated from private main `0bbd389` with Feature Engineer commits `1731f793` / `4756771b` and Architect `2d1179b4`, followed by Lead integration fixes. This is an implementation and test delivery; **neither installed learner version has been changed for this feature**. Production grading is blocked on the exact content gate below. User acceptance is unreported.

## What is implemented

The shared engine/view supports the exact 11 verbs and 19 preposition identities, both directions with Choose default, Write, English placeholders, explicit display spellings, Nikkud, compact filters, retained choice/text drafts and attempt-only self-approval. Each selected form occurs once per shuffled pass; missed forms return after all remaining forms and repeat in further passes if needed. A learner correction removes that attempt from pending review. Ambiguous valid readings are accepted and excluded from distractors. Too few choices explain the available Write option. Practice never calls a flashcard/SRS mutation.

Native My Hebrew opens `#conjugation`. Studio saves exact lesson `conjugationUnlocks.formIds` through its existing workspace/CAS/publishing flow; only successful completion of that actual pinned lesson snapshot adds those exact IDs to that learner. Open/preview/practice ahead does not grant anything. Native loading/retry/profile/disposal behavior is integrated. No fixture is enabled in production; injection is confined to an explicit in-memory Store.

WordPress has a separate read-only shortcode plugin package. The package filters held records and refuses fixture records; the runtime independently rejects non-approved records. Authentication and the site's explicitly bound access decision are both required. No SQL, activation migration, new deck, account, payment or curriculum operation is added. The access filter defaults to deny and is not yet bound at the destination; the existing site's access policy must be connected and verified before an eventual installation. No blanket allow was substituted.

Mounted Browser testing also exposed a typed-field blur rerender that swallowed the first Show/Check click. Setup-change handling now ignores typed-answer blur; a regression test preserves the original action node through that event.

Lead consolidated the two catalog validators into `public/conjugation/catalog-contract.js`, used by native loading and the portable engine/packager. It enforces safe stable IDs, explicit complete displays/answers, semantic targets, reviewed alternatives and provenance. The new module is included in the native served-file list and generated WordPress manifest. Phone typography/spacing was adjusted within the approved 2/3-column grid; native colors inherit the established refinement tokens.

## Concrete content gate

The unchanged course evidence represents 302 semantic cells (115 verb / 187 preposition), not 302 approved drill records. The 308 external proposals remain separate. The production catalog contains the exact 30 lexical identities and **zero grading forms** because the selected evidence lacks independently authored standard-unpointed answers; preposition accepted English answers also need authoring. No marks were stripped to author standard spelling, no contested pointing was repaired and no illustrative exercise became course content.

The smallest nonempty subset would be one explicitly approved record: `verb-proposal-02:past:3sg:m`, pointed `רָצָה`, standard unpointed `רצה`, exact authored English `(he) wanted`, with its course source post25792/table2/row13/cells0–1 and explicit record approval. The raw Curriculum proposal uses dots in its review ID; the runtime-safe colon ID here is the proposed implementation identity. This one-record proposal is **not approved or present in the production key**. It would allow Write/reveal only; meaningful Choose coverage needs enough distinct reviewed answers. Full 11/19 coverage remains additional content work. See `docs/content-provenance/conjugation-20261107/CONTENT_GATE.md` and the exact 509-unit `PROVENANCE_LEDGER.json`.

Next content owner: Leo/Guy selects and approves a complete first subset; Curriculum packages that exact approved key. Lead then binds and verifies WordPress access, regenerates both packages, performs preservation installs and independent destination readback. No broader Nikkud/action-noun/paradigm choice must be forced to approve a smaller explicit subset.

## Executed checks and evidence

- `npm ci` and `npm ci --ignore-scripts --prefix schemas` completed. Runtime dependencies audited at zero vulnerabilities; the existing schema dependency tree reports one moderate advisory, unchanged by this feature.
- Final focused command: `node --test test/conjugation-engine.test.js test/conjugation-view.test.js test/conjugation-native.test.js test/conjugation-integration.test.js adapters/wordpress/conjugation/package.test.mjs` — 38 passed, no skips/failures.
- `npm run verify:candidate` — 1,189 passed / 9 existing skips / 0 failures (1,198 total). This is the repository's configured candidate/CI command; its existing audio exclusions remain explicit, and it is not an unrestricted full-suite claim.
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
