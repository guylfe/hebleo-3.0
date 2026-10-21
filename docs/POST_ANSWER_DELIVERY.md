# E10 delivery and evidence

Guy requested vocabulary cards on words after exercise answers. The implemented direct-ID coverage is recognition question words, matching words and submitted placements, and typing target words, for correct and incorrect outcomes. Check/Apply and saved-draft rehearsal share the implementation. Hover/focus previews; activation pins; disclosures and audio use the current renderers. The first Escape closes an open inner disclosure; a subsequent Escape closes the card and returns the exact trigger. Existing grades, answer text and question position stay intact.

The implementation adds no canonical vocabulary/mappings, curriculum changes, persisted schema migration, approval, unlock or enrollment. The lesson-scoped response-only exerciseVocabulary projection uses the pinned snapshot and complete managed-ID denial set; unavailable managed words cannot fall back to flat entries. Card content keeps existing word/form gates and the separate verb citation policy. No text matching identifies arbitrary inflections, punctuation or phrases. Free prompts, choices, ordering tokens, cloze and transformation sentences remain plain because authoritative occurrence bindings are absent. This is an explicit coverage limitation; Source browsing remains separate from Learned eligibility.

## Reviewed revisions and named participation

| Owner | Actual contribution and evidence |
|---|---|
| Feature Engineer | Shared reminder primitive/CSS and 24 regressions, original feature 3bdb8ce; integrated as 983e977. |
| Architect | Read-only projection consultation; pinned snapshot, denied-managed fallback and read-only renderer requirements. Advice, not candidate test evidence. |
| Lead | Learner/Preview/HTTP integration, safe ID projection, locked-answer decoration, current-state installation, state hashes, and deterministic delayed-choice-save race correction in 444b917. |
| QA Red Team | Independent 444b917 baseline: 717 candidate tests, 23 schema tests, six additional HTTP/identity/lifecycle cases, 34 eligibility cases / 3,962 assertions; all 52 allowlisted static routes. QA test/evidence commit 3c4c983 integrated as e009c6e. |
| UX Owner | Found UX-E10-01 legacy disclosure Escape defect on 444b917; original independent reproduction retained. Corrected b16d209 independently passes original probe and 38 bounded tests. |
| QA Red Team | Corrected b16d209 independently passes 41 bounded tests, syntax, old-code negative control, 52 static routes and read-only state conservation. No new implementation defect found. |

Corrected reviewed implementation: **b16d2091525b3ed44af167dbee6065e66e066ee6**. Its runtime SHA256 is **96f37620a319e700e628bb588c05c9024c3efb898b3ec5457427fc794e6c4357**; backend SHA256 is **e1194b748380d7bb78be6e5a2248aeff62c5161429e13ec397642e992e00e6c1**. The subsequent delivery checkpoint changes documentation only. The final commit is reported by /api/build and the attached external delivery receipt; no self-referential commit identity is embedded in this document.

See [baseline QA](QA_POST_ANSWER_444B917.md), [corrected QA](QA_POST_ANSWER_B16D209.md), [corrected UX](UX_POST_ANSWER_B16D209.md) and [E10 user guide](POST_ANSWER_VOCABULARY.md).

## Commands actually executed by Lead

- npm ci --ignore-scripts; npm ci --ignore-scripts --prefix schemas: installed locked dependencies.
- npm run verify:candidate: syntax plus **717/717** on integrated 444b917. Configured audio filename and audio/speed/playback-name exclusions retained. Initial in-flight grading race failures led to a deterministic delayed-save regression and a fix before this pass.
- npm test --prefix schemas: **23/23**; node --test schemas/checks/contracts.check.mjs: **18/18**; node schemas/tools/validate.mjs --seed --runtime .: valid and input unchanged; node schemas/tools/runtime-check.mjs --runtime .: **9** backend scenarios.
- node --test test/vocabulary-reminder.test.js test/post-answer-vocabulary.test.js test/learner-renderer.test.js: **41/41** after the disclosure fix. The UX-E10-01 negative control failed on the old code as expected. The 717 baseline was not reclassified as a corrected broad-suite rerun.
- HEBLEO_QA_REVISION=b16d209... node --test qa-tests/independent.test.js: **6/6**, including 52 served routes. npm run check and git diff --check passed.
- Python skill audit ran through host py -3 with escalation: **three findings in untouched Studio files**, confirmed identical to parent after newline normalization; no new finding from this feature. DESIGN.md lint: zero errors, one existing unused-border-token warning. No build, formatter or typecheck script exists for this native Node/static application.

## Installation and conservation

Owner demo: **http://127.0.0.1:63358/**. Isolated review copy: **http://127.0.0.1:63360/**. Existing owner database remains at the designated hebleo-consolidated/data/lexical-private-demo.sqlite location; the app checkout is isolated from the older shared checkout and its unrelated planning work.

Use only scripts/start-preserved-demo.mjs with explicit revision/database/media/vault/port arguments and HEBLEO_DEMO_FRESH_PROGRESS=0. Do not use npm start or a fixture/reset launcher for this installation. The preservation launcher refuses missing data, migrations or fixture replay and compares every table/schema before listening. The task folder contains exact restart/rollback scripts and receipts; backups are outside Git.

Before/after/backup/current schema/all-table SHA256: **e72ca110485b8d3d67a70477e790c4c7bbcb4902c4bec6890eceaa2e2d16b460**. Active publication revision 3, existing saved draft, all three fictional profiles and full history are retained. All **791** source rows / **1,055** visible original records remain; source digest **5be459536124d79296d444f94b049b3bef421ac422f2d3b556efe42e1a003281**. No WordPress access, production change, seed import or Masterfile edit occurred. All 45 original listeners remained; only the two verified task-owned demo/review processes were replaced for the correction.

## Remaining verification

The implemented feature is available for private review. Mounted native attempts were made: Lead/UX received “Another thread is using this computer. This call was not performed”; corrected QA subsequently discovered Edge but get_browser_state refused **browser_consent_required**, requiring explicit existing-profile approval before DevTools inspection. No page inspection/input, foreground fallback, substitute browser or native screenshot is claimed. These are mounted-tool blockers, not auto-review rejections.

True browser keyboard defaults, rendered RTL/Nikkud/overflow, slow pointer transit, narrow/short layout, screen reader, zoom, physical touch and Guy acceptance remain **Pending**. Automated DOM geometry uses stubs. Audio playback controls are reused; audio/speed quality retains the existing deferral. The next human-facing handoff is the E10 guide once the mounted browser profile is available. Native review gaps and missing occurrence bindings must remain explicit.
