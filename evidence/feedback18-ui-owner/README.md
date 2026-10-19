# Owner verification: Studio UI slice

Source parent: `8a268176f8d4a4ec700b7971945c501709df5a4a`. Scope: reusable vocabulary/Markdown modules, guided exercise UI. Owner observations only; independent QA and Guy acceptance pending. Full integration belongs to Lead.

| Artifact | Actual evidence |
|---|---|
| clean-install.txt | Clean `npm.cmd ci --ignore-scripts --no-audit --no-fund --fetch-retries=0 --fetch-timeout=20000`: 49 packages installed; no copied dependency tree |
| verify.txt | `npm.cmd run verify`: syntax check and **190 tests pass**, 0 fail |
| focused.txt | Final six-file focused command documented in handoff: **63 tests pass**, subset of 190 |
| parent-guided-controls.txt | Three behavior regressions fail against exact parent: guided vowel control, allowed legacy edit, absent feedback grouping |
| baseline-app-draft.txt | Unmodified parent app/draft-api run: 30 pass, 1 fails on omitted `pairResults` in expected keys; this branch corrects that assertion without touching runtime grading |
| browser-http-receipts.json | First isolated synthetic fixture: all read-only/UI requests preserve fingerprints; intentional native Stage is the sole writer |
| final-browser-http-receipts.json | Fresh final fixture: equal table fingerprints before Stage; native HTTP 200 Stage retains legacy flag and unknown sentinel, only observed write |
| markdown-preview.png | Desktop owner visual observation of local toolbar and RTL presentation |
| exercise-groups.png | Final named Concept metadata and Authored feedback groups, short/detailed inputs and native saved-draft status |

Browser actions used only the mounted built-in Browser tools. Synthetic fixture words clone existing seed words, changing only IDs/tags. The tests additionally use hostile synthetic source strings to verify escaping/sanitizing; no canonical content is changed. Table receipts contain only request metadata and hashes, no learner records or database exports.

Browser testing exposed a first-click loss during search-input blur. The fix skips redundant `change` rendering; a saved automated regression and native first-click retest cover the failure. Desktop-only observations do not imply a full accessibility pass, mobile/phone-width/touch acceptance, preview publication, or production readiness. The two fixture servers were stopped; protected runtimes were untouched.
