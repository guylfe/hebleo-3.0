# Same-word choices and active-list selection checkpoint

Base: abd225452b0194ed5a15a79c88c35aad0a680884. Branch: feature/lexical-choices-selection. No installation or main publication.

## Behavior and contracts

- Choices resolve canonical catalog records and match the prompt's exact wordId in both directions. Up to four distinct choices; never unrelated padding. Both pointed and unpointed displays are checked against accepted answers and other choices.
- Grading retains the existing approved-pool reverse-ambiguity contract. Candidate visibility is separate: the view supplies approved learned forms in native Learned only, all approved forms in native All and WordPress. Tense/person filters constrain the target queue, while same-word distractors may use other forms within that scope. Direct Drill callers default candidates to their target selection, so cannot accidentally expand their supplied scope.
- Fewer than two distinct choices automatically uses existing Write/reveal/self-check. Choose is disabled and no revealing single option is rendered. The user's preferred mode resumes on later prompts with enough choices. Queue, missed passes, target count and flashcard scheduling remain independent.
- Bulk buttons affect only enabled words of the displayed kind. Native words without learned forms are disabled in Learned only; their stored selection survives bulk actions and becomes available in All. Other tab selections, filters, tenses, direction and Nikkud survive. No practice auto-starts; zero matching forms disables Start.
- Buttons reuse shared markup, theme, focus-visible treatment and 44px minimum height. Compact spacing and font sizing only. Existing help and centered Hebrew layout remain.
- No catalog, content IDs, audio, schema, publishing, access adapters, learner records or scheduler changes.

## Actual verification

Passed 49 tests, zero failures/skips:

```powershell
node --test test/conjugation-engine.test.js test/conjugation-view.test.js test/conjugation-lexical-selection.test.js test/conjugation-integration.test.js test/conjugation-native.test.js test/practice-help.test.js adapters/wordpress/conjugation/package.test.mjs adapters/wordpress/conjugation/direct-access.test.mjs
node --check public/conjugation/engine.js
node --check public/conjugation/view.js
git diff --check
```

New source-backed tests enumerate all 508 approved prompts, both directions, two deterministic shuffle orders and both Nikkud displays: exact lexical IDs, unique displayed choices, exactly one accepted displayed choice. Actual catalog contains הסתכן–מסתכן and גרנו; the latter never appears for the former. Synthetic records (test-only) cover duplicates, accepted alternatives, homographs, spoofed records, sparse sources and partial learned scope. DOM tests cover tab isolation, disabled/unlearned preservation, settings, zero count/Start, native button semantics, keyboard-origin click and focus restoration. Existing tests verify actual HTTP/Store unlocks, learner/card preservation, missed passes, help, PHP access and exact packaged assets.

Dependencies were reused through a local ignored node_modules junction to the lead's existing dependencies; no dependency installation. Clone recovery required core.longpaths and rebuilding this isolated clone's index after the initial Windows path-length failure. No lead checkout edits.

## Limits and handoff

No mounted-browser, physical keyboard/assistive-technology, Android, installed native or installed WordPress verification; DOM keyboard-origin activation does not prove real Enter/Space behavior. Full application suite and CI not run. User acceptance unreported. Lead owns cherry-pick/integration, native restart/fresh-progress verification, installation and browser review. Proposed integration should preserve unrelated newer lead changes.

## Lead integration and installation checkpoint

The above is the original Feature Engineer handoff. Lead integrated it on lead/practice-display-fixes, added candidate-to-candidate accepted-equivalent deduplication and a meaningful test, then independently reran the full focused command: 50 passed. An additional generated WordPress legacy-view compatibility test passed. The actual older WordPress view equals the prior shared source with native help bindings removed, verified by normalized full-content comparison on the server returning hashes only. The new deterministic legacy-view adapter retains its separate approved tutorial owner; it installs the exact shared behavior without adding a second helper or missing module imports.

Installed only engine.js, view.js and practice.css in each existing runtime. Native view retains the native tutorial; WordPress view is generated without native bindings, preserving the separate add-on. Exact source/file readbacks are in the task workspace conjugation-fixes-20261110. All 137 native public/src files were inventoried: exactly three changed; the whole existing SQLite database is unchanged. No restart/reset occurred, as this static-only update must preserve the user's existing progress. WordPress's 57 protected custom-plugin files show exactly the three intended asset changes; current account/deck settings/progress/sessions/account-streak inventories are unchanged. No learner, audio, curriculum, catalog, scheduler, PHP access or tutorial files changed.

Actual installed native desktop browser: Select none by Enter gives 0 forms and disables Start; Select all by Space restores 318 verb forms and preserves the Prepositions tab selection independently. The exact lexical example verb-proposal-08 presents only canonical same-verb forms, never גרנו. Installed-component rendering at 360px has 44px selection controls and no horizontal overflow; Hebrew verb and English preposition choices were visually reviewed and checked against their canonical word IDs. This narrow evidence is component replay with installed modules/styles/catalog, not the full native route or a physical Android device. Browser preferences were restored. Five screenshots and rendered/HTTP readbacks are saved. Independent signed-in WordPress desktop/narrow verification remains pending at this checkpoint. End/pause/resume is a separately requested next step, not implemented in this checkpoint.
