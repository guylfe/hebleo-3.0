# Installed conjugation delivery — 10 November 2026

The requested same-word choices, active-list Select all/Select none, End drill, Save & pause drill and automatic browser-local recovery are installed in both existing versions. Lead reviewed Feature Engineer's actual implementation and Web's returned artifacts, integrated the corrections, installed with guarded readbacks, and completed native checks. Guy acceptance remains unreported.

Use [website practice](https://hebleo.com/conjugation-practice/) or the running [local app](http://127.0.0.1:63358/#conjugation). Blue **Save & pause drill** commits the current run before returning to setup; **Resume drill** restores it. Red **End drill** clears only the current account's run. New Start is blocked while a run is retained. Completed missed-form passes or explicit End clear the slot; a normal tab close, reload or navigation retains committed state.

## Source and installation

Installed executable source: `7ed50050ca5db9ecc08e00dc7b1b6b6e8f759d23`, native runtime SHA256 `01940bb8787e1cb9033e347cebfa9d1c6765b9421e1a7d1782059fa004e84be3`. Native preservation process uses port63358 and the original database/media/vault paths. Git checkpoint is on private `lead/practice-display-fixes`; main remains `008b47a1efa0d402bbb465bb044121a14ae80ad0`. No main publication or merge occurred.

WordPress uses the separate existing tutorial owner. Its content-versioned graph was independently read back, and normal signed-in browser reload delivered matching bytes. Hash prefixes are versions, not source revisions:

| Asset | Installed SHA256 prefix |
| --- | --- |
| bootstrap.js | ea3a230a27dcaf3b |
| view.js | 8426d62db8e4d031 |
| run-state.js | 307fb204483b36fb |
| run-store.js | 80170219e83e8622 |
| engine.js | 093a64d94d2910bb |
| practice.css | 8957977b6439c60e |

Full hashes, guarded backup/install/independent readbacks and screenshots remain in the task folder listed below. The final CI correction changes only `qa-tests/verify-approved-conjugation-release.mjs`; this document and checklist are evidence changes. Neither alters the installed executable bytes.

## Behavior and exact files

Choices use the prompt's stable lexical `wordId`, canonical source forms and current eligibility. They exclude duplicate displays and accepted equivalents in both directions. A narrow target selection can use other eligible conjugations of that same word; a sparse source uses fewer options, and a singleton opens Write/reveal. Select all/none affect only eligible/selectable words in the active Verbs or Prepositions list, retain the other list and settings, update the count and disable Start when empty.

The persistence snapshot retains run/form IDs, queue and option order, index, missed passes, prompt, typed draft/chosen answer, feedback, mode, Nikkud and setup. Atomic revision comparisons fence stale saves and stale terminal actions; terminal tombstones prevent resurrection. Source mismatches or revoked native Learned-only eligibility preserve the run and require explicit End after a successful owner/revision read. Failed reads/conflicts cannot authorize deletion. Save failures retain viable in-memory input, show an error and do not claim a successful Pause.

Implementation files:

- `public/conjugation/{engine.js,view.js,practice.css,run-store.js,run-state.js}` and `public/native-conjugation.js`.
- `src/server.js`: whitelist the two exact new module paths, preserving access behavior.
- `adapters/wordpress/conjugation/{conjugation.php,bootstrap.js,asset-version.mjs,package.mjs}`: authenticated owner and complete versioned graph.
- Final pointer correction: `view.js`, native retry delegation and existing `help.js` tolerate text-node click targets; no tutorial copy changes.
- Tests: conjugation engine/view/lexical-selection/run/bootstrap/native/integration, WordPress graph/package/access, existing help tests and the source-release verifier.

## Actual verification

| Evidence | Result and boundary |
| --- | --- |
| Source/DOM/HTTP tests | 91 focused tests pass; 43 persistence/help checks pass after the final Help delegation change. Disposable fixtures, including atomic IndexedDB tests, are labeled synthetic. |
| Candidate suite | `npm run check` and `npm run test:candidate`: 1,242 pass, nine existing skips, zero failures. Audio/speed/playback exclusions remain the existing candidate policy. |
| Release verifier correction | Old CI required four choices even with a one-form source. Corrected verifier keeps the approved catalog hash/count gates and checks 1,016 accepted answers, 3,048 same-word distractors and 1,016 singleton Write cases. Five package/direct-access/graph tests and PHP cache/policy checks pass locally. |
| Native actual browser | Exact saved-run hash and Hebrew draft survive reload and task-tab closure/new-tab reopen. Author/profile isolation, pointer Start/Resume/End and keyboard Pause pass. Original QA runs ended; original display preference restored. |
| Website actual browser | Normal signed-in pointer Start → Write draft → Pause → Resume → End passes. Independent tab listing proves the exact old task target absent before reopening; saved run/queue/setup/draft signatures match. Final revision23/null and fresh navigation has no Resume. Original preferences and pre-existing dashboard retained. |
| Native isolated installed view | Actual installed modules and real browser IndexedDB, source-backed two-form subset: draft/revealed/incorrect/missed-pass recovery, completion cleanup, failure/retry and stale-save/End/resurrection fencing pass. These are isolated QA runs, not learner grading. |
| Responsive/keyboard | Native installed-component and website canonical-frame 360px screenshots inspected; blue/red controls have white text, 44px minimum targets and fit without horizontal overflow. Keyboard activation and selection isolation pass. This is not physical-phone acceptance. |
| Static UI audit | Four unchanged findings in Studio/vendor code; no drill finding. No unrelated redesign/fixes undertaken. |

Website final recheck artifacts are a bounded transcription of observed tool results plus two screenshots, independently checksum-verified by Lead. Complete raw transcript was not saved as a file; do not describe this as full raw-trace review. Earlier website core evidence retains actual raw result artifacts. A separate existing inline audio-hover listener can still log a target.closest error; recorded stacks locate it outside the drill handler. Successful drill state transitions were independently observed. That unrelated listener was not modified.

## Preservation and persistence limits

Browser-local IndexedDB is scoped by `wordpress:<positive signed-in userId>` or `native:<profileId>`, one run per account/profile on the same origin/browser. WordPress's existing display-preference key is retained; display preferences are separate from account-scoped runs. There is no server/cross-device synchronization. Browser storage clearing/eviction can remove saved runs. A full document reload after a failed/uncommitted write cannot restore memory-only input; successful Pause waits for the durable commit. Pending/failed saves provide the browser leave warning.

Native restart's complete database receipt matches its pre-restart receipt and verified private backup. Compared with the initial pre-browser backup, only the existing bootstrap-generated `author-demo.reviewClockTickets` operational field changed. All progress, preferences, content, unlocks and scheduler fields match. No database rollback/reset occurred. WordPress current-account/deck inventories and unrelated protected plugin hashes match; this is not an all-user or historical-metadata audit. Curriculum/source catalog, audio, stable IDs and flashcard scheduling were preserved.

## Settings investigation

The narrow startup investigation is complete; no additional safe speed improvement was established. Six phase samples locate 86.88–88.39% of pre-handler PHP time in plugin loading, `plugins_loaded` and `init`. Plugin-loading/inter-plugin work takes727–949ms, `plugins_loaded`582–775ms, and `init`793–911ms. Six further callback samples identify LearnDash include initialization121–177ms, Elementor init109–169ms and BuddyBoss/BuddyPress init103–155ms, among other distributed work. Final usable medians are2,987/2,992ms; these are diagnostic samples, not an improvement/regression comparison. No WordPress HTTP API calls were observed; raw sockets/cURL remain unobserved.

All temporary phase/callback instrumentation was removed. Independent readback confirms the original Settings handler SHA256 `a6f6a408a4617ce040d3ecb511b81a1d49b0479d52d9044f5aa0c6d598933314`, profiler absence, 57 protected source hashes and scoped data preservation. Settings values20/200/new_first/audio on and all12 Cancels remained correct. No15-second snapshot/conflict-save, cache/save-policy, plugin disabling, authentication or hosting change was made.

Smallest proposed next option: review dependencies for this request and evaluate lazy initialization of rendering-only Elementor components/WooCommerce block registration, with access/entitlement/freshness regressions. It requires a separate scope decision; no useful savings are guaranteed. See `SETTINGS_STARTUP_ATTRIBUTION_20261110.md` for timing caveats and restoration details.

## Evidence and handoff

Task evidence root: `C:\Users\Trans\.openmausbot\task-workspaces\8c900356-50f6-4d41-bbb9-50c8abe09233\e7336a3b-e32d-42a8-8550-cfc8ed07e838`.

- `CURRENT_FIXES_COMPLETE.md`, `settings-startup-20261110/LEAD_REVIEW.json`, `conjugation-fixes-20261110/FINAL_REVIEW.json` cover the earlier completed work.
- `drill-resume-20261110/FINAL_READBACK.json`, `LEAD_RECHECK_REVIEW.json`, `LEAD_WEB_REVIEW.json`, `NATIVE_REOPEN_FINAL_RAW.json`, `NATIVE_ISOLATED_FINAL_RAW.json`, install receipts, final test logs and screenshots cover resume delivery.
- `drill-resume-20261110/web-recheck/` contains reviewed final website observations/report/screenshots; `web-evidence/` retains prior raw checks.
- Final remote/CI receipt is saved outside Git beside the delivery report, to avoid status-only commits or changing runtime identity.

Physical Android, screen-reader operation, cross-device behavior and Guy acceptance remain unverified. Leo owns consolidated delivery and any separate main-publication decision; no further implementation is assigned by this report.
