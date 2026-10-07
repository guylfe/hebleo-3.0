# Frontend feedback 18 integration

Candidate base: f47d2d288956782b1d6631c40a19c1c9585a141c (reviewed executable d42e1cf). Isolated branch lead/feedback18-studio. Current demo at 4173 and other protected runtimes are unchanged. Baseline documentation overlay copied into this candidate deliberately; it is not a new tested executable.

The 18 requested findings are tracked below. Owner implementation checks, independent candidate QA and Guy acceptance stay separate. This is an incremental checkpoint, not a completed Studio or deploy approval. Phone-width/mobile/touch stay Deferred until APK; no APK build or live integration.

| ID | Requested outcome | Implementation / baseline evidence | Independent candidate QA | Guy result |
|---|---|---|---|---|
| FB01 | Start / Continue / Revisit | Implemented; owner app/HTTP regression passed | Pending | Retest pending |
| FB02 | Vocabulary formatting matrix and typed CSV style mapping | QA baseline table/JSON pass; CSV rich mapping pending | Pending | Retest pending |
| FB03 | Keyboard outside click activates first click; pin | Independent baseline bounded pass; candidate recheck pending | Pending | Retest pending |
| FB04 | Individual matching verdict/color/icon/accessible status + ordered summary | Implemented; server, resume, legacy read-only and renderer regressions passed | Pending | Retest pending |
| FB05 | Zero-due diagnosis; testable synthetic review flow | Independent baseline no bug reproduced; improve empty-state/enrollment guidance pending | Pending | Retest pending |
| FB06 | Studio scalable vocabulary search/tag/lesson filters and bounded DOM | Pending implementation | Pending | Retest pending |
| FB07 | Tag/word selectors and repeatable stable component instances | Pending contract and implementation | Pending | Retest pending |
| FB08 | One lesson context with full-width ordered editors and exercises below | Pending implementation | Pending | Retest pending |
| FB09 | Cumulative introduced letters; current new letters only | Legacy authored sets baseline pass; automatic accumulation pending | Pending | Retest pending |
| FB10 | Remove Require Nikkud control and answer requirement | Pending; preserve historical grades/metadata and authored forms | Pending | Retest pending |
| FB11 | Separate concept metadata and short/detailed feedback groups | Pending implementation | Pending | Retest pending |
| FB12 | My Hebrew filters for tag/lesson/learning state | Pending implementation | Pending | Retest pending |
| FB13 | Established local Markdown editor, toolbar, safe RTL preview | Pending official dependency/license verification and implementation | Pending | Retest pending |
| FB14 | Prominent disposable Preview saved draft | Existing isolation baseline pass; label/layout overhaul pending | Pending | Retest pending |
| FB15 | Import at Studio top | Pending implementation | Pending | Retest pending |
| FB16 | Recognized-column mapping + preview before Stage | Pending contract and implementation; unknown/style fields preserved | Pending | Retest pending |
| FB17 | Coherent Studio overhaul | Pending integration | Pending | Retest pending |
| FB18 | Optional structured chapters and chapter/lesson ordering | Pending contract and implementation | Pending | Retest pending |

## Initial executable changes

Home and course use Start for no resume/attempt, Continue for begun lessons and Revisit for completed lessons. Matching evaluation supplies per-word pairResults from the server to both persistent attempts and disposable rehearsal. The shared renderer displays green/red plus check/cross and Correct/Incorrect text. Summaries follow exercise.wordIds order. Legacy saved matching grades gain response-only pair metadata from the exact saved answer/expected pairs; stored history and overall verdict are unchanged. Preview wire schema accepts the additive metadata.

Actual checks: node --test test/feedback18-learner.test.js test/matching-progress.test.js test/learner-renderer.test.js test/preview.test.js test/app.test.js: 44 pass, zero fail. Three new regressions failed on a byte-for-byte Git f47 parent control before passing here. See evidence/feedback18-initial/targeted.txt and parent-control.txt. Full/schema/runtime checks await a coherent integration; no native Browser claim at this checkpoint.

Tool limitation: exec_command failed before process creation with helper_unknown_error / setup refresh. Ordinary Node code/file runner worked. Online npm ci timed out; offline npm ci reported ENOTCACHED for xmlchars 2.2.0. Tests used a copy of the baseline's installed dependency tree (jsdom 30.1.1, matching existing lockfile); clean installation is not claimed. Finish dependency/install verification before final delivery.

## Ownership and compatibility boundaries

Lead owns src/, public/app.js, public/content.js, public/ux.js, public/learner-view.js, public/preview/, integration and shared checklist. Feature work is isolated and owns public/studio/ modules, new Studio CSS/editor assets and dependency changes in its own checkout. Architect consultation defines additive chapter/component/introduced-letter/import-mapping contracts before Lead implements runtime changes. No teammate writes this candidate or user demo directly.

All linguistic bytes, unknown fields, editorial IDs, old revisions, backups and pinned sessions must remain valid. Never silently rewrite stored releases to migrate UI structures. Explicit fresh-progress startup remains once per changed executable build; same-build restart retains progress. Draft CAS, zero-write Review/Discard and disposable preview guarantees must remain. No live Sheets or production claim.
