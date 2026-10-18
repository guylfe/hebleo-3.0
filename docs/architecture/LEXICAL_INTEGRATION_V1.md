# Consolidated lexical integration — 18 October 2026

Private branch `lead/oct18-consolidated-vocabulary`, based on `d4bcadd3bc522828b06c48789213200305f8fd48`. Integrates inspected Architect commit `dd334d1542ac23851ac4e7cbb73e3880c42fbe70`, Feature commit `4022a7d91dc12e02b72b85cfd22c2ca6bf14e502`, and unchanged source-backed fixtures/tooling from Lead checkpoint `924876c70e72e7794d597d330413528f97f25e4e`. The final exact revision is recorded after commit in the task's FINAL_HANDOFF.md / FREEZE.json.

## Implemented path

`src/lexical-adapter.js` consumes `hebleo-consolidated-capture-v1`: supplied v3 native-table plan, original records, exact supplied/document bindings, native UTF-16 formats, child cells and explicit shared-scope evidence. An explicit lossless map covers all 42 semantic IDs. Hidden/legacy snapshots do not become another active paradigm list. One word holds the complete 28/4/10-slot inventory; no absent Hebrew representation is manufactured.

The author model/archive retains notes, audio/exclusion candidates, source runs and document segments, aliases, forms, usages, examples and original occurrences. Conflicting audio/flags are held, not combined or chosen by first-record order. The source-backed shared future אתם/אתן scope is retained pending review; equal text alone cannot merge cells.

`public/lexical-contract.js` owns validation, authoritative course-order eligibility, aliases, citation/title projections and migration preview. `lexical-runtime.js` converts safe output to the category renderer and handles bounded 50-word paging/search/filtering. Locked or unapproved source text is not searchable. `lexical-vocabulary.js/.css` supply the category tables, independent citation, Forms above Note/Examples, measured preposition layouts/sticky Hebrew and English, RTL and source formatting. Existing media and flat-ID entry/review actions remain shared primitives when an approved runtime mapping exists; form slots never create cards.

`public/studio/lexical-settings.js` is mounted alongside existing letter controls in unified Studio. It groups the 42 choices by category/tense, validates all/word/reviewed-class scope, shows inherited/new/source states, and authors introduce/reuse links. Unlocks and lesson links each have one editable collection. Raw legacy references are not placements. Titles derive from the actual app catalogue; the workbook catalogue remains explicitly unconnected. No exploratory curriculum or schedule was adopted.

The complete workspace retains existing impact review → CAS Save → reload → exact-token rehearsal → separate Publish/rollback. The live learner and rehearsal use the same renderer. My Hebrew uses bounded safe server projections, tab-local filters and stale-response suppression. Learner JSON receives only `lexicalView`; raw archives, proposals and review metadata are removed. Persisting `lexicalView` as author input is refused.

## Approval, compatibility and migration

Versions: runtime `hebleo-lexical-runtime-v1`; source `hebleo-lexical-consolidation-v3`; capture `hebleo-consolidated-capture-v1`. The optional lexical envelope is persisted inside immutable revision JSON. Store/backup schema remains **7**; no SQL or learner-state migration is needed.

Identity review is separate from the additional `displayReview`; imported words start with both pending. Variants require independent content/mapping approval. Source/identity/display approvals carry exact `lxa1-` payload digests, and local settings cannot issue or change source approvals. Author choices can approve lesson additions/links only. Reviewed shared scopes require their own revision-bound review.

Older snapshots without the envelope preserve flat vocabulary/letters and add no slots. Unknown/malformed declared envelopes fail. Removing an existing envelope through local staging is refused. Restore checks versions/digests before writes; reviewed source records must already match trusted installation history. Pending captures remain portable; cross-installation adoption of source approvals needs a trusted review bridge, not review strings in a backup.

The author-only exact-token migration-preview endpoint reads actual fictional card IDs/schedules. It reports many-to-one conflicts/reverse mappings and always returns `canApply:false`. No schedules, attempts, bookmarks, existing runtime IDs or historical releases are rewritten. A reviewed migration/conflict policy is still required before merging existing learner identities.

## Conservation and evidence

Actual supplied capture: **792** author words — **93 verbs, 59 adjectives, 19 prepositions, 418 nouns, 203 Other**. All 621 non-paradigm entries remain. אמר / ראה / היה each have one lexical row across contributing source records.

Retained exactly: **1,251** original aliases, **1,172** form references, **437** occurrences, **8** usages, **95** examples, **1,770** proposals, **212** missing slots, **22** inapplicable slots and **2** held identities. Four aliases/two occurrences targeting held identities remain outside active typed collections but stay in retained evidence. Single-slot form references also receive pending typed aliases; ambiguous/unmapped references remain explicit.

The captured file is approximately 11.7 MB and the saved model approximately 18.6 MB; HTTP receipts record exact bytes/hash/counts. Stage/import/restore limits accommodate the actual artifact. No source capture, database, learner record, upload or credential is committed.

Executed commands include dependency installs, `npm run verify:candidate`, `npm --prefix schemas test`, focused lexical tests, actual app HTTP/DOM tests, workbook conservation and real 18-MB HTTP import/stage probes, the 34-case source-backed runner, syntax and whitespace checks. Final counts/logs are recorded with the handoff. Candidate verification retains its printed audio/speed/playback exclusions; it is not an unrestricted npm-test claim.

The source-backed runner checks 34 cases / 3,962 assertions and four deliberate bad-output controls. These are resolver assertions, not 3,962 app scenarios or linguistic approval. Twelve integration cases separately cover persisted paradigms/scopes/order, Stage/Publish/session, source states/promotion rejection, backup/reopen/restore, actual-card conflict preview, dynamic titles, Studio CAS and rehearsal DOM. The actual app test covers disclosure and contextual My Hebrew queries.

An old digest-only schema fixture accidentally inherited deliberately unpinned demo sounds from the evolving seed. That synthetic fixture now removes audio before calculating its simulated approvals; the production media gate is unchanged. The app harness injects the new imports it deliberately strips and uses a five-second condition deadline instead of 400 ms under parallel execution.

Strict Premium audit retains **three pre-existing delegated-button false positives**, not a clean pass: two Move controls in lesson-editor.js:30 are wired through data-move; Select in media-picker.js:15 is wired through data-select-media. No new integration finding was reported.

## Remaining acceptance

Mounted Edge inspection on this computer refused `browser_consent_required` / `consumer_profile_endpoint_requires_grant`. No foreground or alternate-browser bypass occurred. Ordinary/narrow native geometry, seven/ten fit, sticky overlap/focus, selects, 200% zoom and Guy acceptance remain unverified. DOM geometry uses explicit test measurements. UX and independent exact-SHA QA remain separate gates.

The consumed source is the supplied workbook-model capture; this run did not refresh/write the native Sheet. Real-source identity/display/form approvals, native freshness and the workbook-to-authoritative-catalogue connection remain open. The separate nonlinguistic fixture makes the working UI/settings reviewable. No live publication, canonical-source replacement or destructive migration occurred.

## Capture registry preflight — QA-LEX-01 / QA-LEX-02

src/lexical-capture.js validates capture v1 before archive cloning, source-field resolution, variant adaptation or index selection. Every registry checks for duplicates before insertion, including identical duplicates. Supplied and document binding arrays share one binding-ID registry. Referenced Masterfile records and binding IDs must resolve with actionable capture paths and identities in errors. Secondary-document bindings explicitly identify their document and do not require their document source ID to be a Masterfile entry. Held identities and their retained references remain held.

The preflight also validates uniqueness/references in the consumed source map, table names, headers, normalized audit slots, retained aliases/form references/occurrences, draft references and child indexes. Form References keeps its supplied semicolon-separated binding lists; legitimate non-paradigm child targets remain valid. Source value types (including explicit null, blank and boolean) and native formatting are neither normalized nor selected by record order.

Declared captured archives receive the same preflight from validateLexicalSnapshot, covering direct Stage, publication/rollback and restore validation before writes. Legacy/synthetic lexical envelopes without a declared capture retain their prior contract. Capture, runtime and Store versions are unchanged; no SQL migration or approval-promotion path is added. Prior RTL/neutral-citation/class/focus corrections remain unchanged. Independent corrected-revision QA, native rendering and Guy acceptance remain separate.
