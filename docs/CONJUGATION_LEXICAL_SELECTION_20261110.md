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
