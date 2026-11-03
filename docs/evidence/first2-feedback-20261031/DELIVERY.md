# Oct31 first-two feedback: scoped engineering handoff

Status: staged branch for Leo's combined integration. The installed demo on 63358 is unchanged. Source pack, master documents, immutable revisions and main are unchanged. No WordPress calls, learner-record publication, paid operations or audio acquisition occurred.

Branch: `fix/first2-feedback-engineering-20261031`, based on `91403c54da9cab8cfcd7bbc12925415337a9bf70` (the final prior evidence checkpoint; executable baseline remains `73e242e717c630976fd2d040396d4d8d5fcd3127`).

Code checkpoint: **`68c3b022cc9eae5cab2584a79b95e6fb514d9d63`** (following the main implementation commit `17605c1eb118266a05b92c39eb51bbfd6e645653`), pushed and read back from the existing private `guylfe/hebleo-3.0` feature branch. Runtime digest of this checkout: `c726a86bd304db87c2062d1bb4350fd5c42f1988a44b46fdfa02ee6674ad0e58`. No main change. The GitHub run for that exact code is [41196281226](https://github.com/guylfe/hebleo-3.0/actions/runs/41196281226); **completed successfully** for that exact code; `CI_CODE.json` records the readback.

Checkout: `C:\Users\Trans\.openmausbot\task-workspaces\8c900356-50f6-4d41-bbb9-50c8abe09233\ae43248e-4d28-4d56-9030-77ca7e390e85\hebleo-feedback`.

Runtime/contract files: `public/app.js`, `public/course.js`, `public/learner-view.js`, `public/preview/learner-renderer.js`, `public/refinement.css`, `public/source-activities.js`, `public/text-reader.js`, `public/ux.js`, `schemas/course-model.v1.schema.json`. Tests: `test/app.test.js`, `test/first2-feedback.test.js`, `test/qa-uxi13-independent.test.js`. Maintained design/status: `DESIGN.md`, `UX-CONTRACT.md`, `docs/FEATURE_CHECKLIST.md`; remaining files under this evidence directory are receipts/logs and the native timer screenshot. No database migration or backend endpoint was added.

## Implemented scope

- #2: Source reader owns one primary action in learner and Studio Preview. Check/recall commitment uses the shared dock, then Continue advances the page, and final Continue invokes the existing gated portion-navigation owner. No outer duplicate. Forward movement waits for response saves. Failed response writes retain answers and Retry. Failed portion-position writes retain the mounted page, restore its route, and leave Continue retryable. Cursor-only saves never say Answers saved; answer success is server-confirmed, page-scoped and brief. Obsolete completions cannot hide newer pending/failure state.
- #3: The general Lesson help & comments button is removed. A shared Extra information control exists only for explicitly authored nonempty extras. The native modal has an accessible title, Close, Escape and exact-trigger focus return, and is disposed on navigation/Preview teardown. It contains only the safe-rendered extra. Public discussion below the lesson and the supported word-linked discussion remain. Existing removed network prose is not recreated. Optional extra storage is typed `block.options.extraInformation` for v2 explanation components; legacy lessons can use `lesson.extraInformation`. No source content uses it yet.
- #6: The user-started 10-second display and bar use one monotonic deadline. A delayed tick uses actual remaining time. Number/clock disappear before the recall input. The leading zero and all 16 digits remain. Visibility interruption, back navigation and restored state cannot replay the initial round. Reduced motion uses the same determinate bar without CSS motion.
- #7: Only the displayed exposure number has selection/drag prevention. Copy filtering excludes it even when a larger selection includes other prose, while preserving the other selected text. Copy elsewhere and paste into recall remain enabled. This does not prevent screenshots, source inspection or system-wide copying.

No curriculum copy was rewritten. #1/#4/#9/#11/#12 belong to Curriculum's accepted output. #8/#10/#13/#14 and the default placement of #5 await UX/Leo's integration contract. No retry/mastery requirement was introduced. QA-FIRST2-01 dock behavior and RR-FIRST2-01 validation bytes are unchanged. Versionless legacy reader dispatch remains intact.

`source-pack-proof.json` verifies the unchanged Git content object and canonical SHA-256 `1b9df3021485e37c5c01af7a0eb573a482ba7329c797dc1dad55aaa2e9fb9e3a`. Windows clone checkout converted LF to CRLF, so the clone's raw on-disk hash differs from the original checkout; there is no Git content change, and the source pack was not reauthored or installed.

## Verification actually run

| Command | Result |
|---|---|
| `npm ci --ignore-scripts --no-audit --no-fund` | 49 packages installed |
| `npm run check` | Passed |
| `node --test test/first2-actual.test.js test/first2-dock-regression.test.js` | 23 passed |
| `node --test test/first2-feedback.test.js test/first2-actual.test.js test/first2-dock-regression.test.js` | Final combined run: 34 passed |
| `node --test test/first2-feedback.test.js` (included in final combined 34-case run) | 11 passed: deadline/delayed ticks/reduced motion, interruptions/resume, selection/copy/paste scope, cursor saves, failures/retry, stale saves, final gating/duplicate handoff, extras/focus and content validation |
| `node --test --test-name-pattern=FIRST2 test/app.test.js test/first2-feedback.test.js` | Actual app HTTP learner/Studio cases passed; the feedback file's cases were filtered by that command, so the separate focused run above is its evidence |
| `node --test test/qa-uxi13-independent.test.js` | 27 passed after adapting obsolete Help-entry tests to the actual word-linked entry; all delayed-response/draft assertions remain |
| `npm run verify:candidate` | Final run: **911 passed, 0 failed**, 78 test files with the repository's existing audio-filename/name exclusions; not a full audio/speed/playback claim |
| `npm ci --ignore-scripts --no-audit --no-fund` in `schemas` | 5 packages installed |
| `npm test` in `schemas` | 27 passed |
| `npm run runtime -- --runtime ..` in `schemas` | 9 ephemeral HTTP runtime scenarios passed |
| `git diff --check` | Passed |

The first candidate run failed because schema dependencies were still being installed concurrently and tests still clicked the removed general Help control. Dependencies completed, comment tests now use the actual below-lesson form, and delayed-help tests use the supported word entry; the 910-case configured run passed, followed by a final 911-case pass after the primary-slot comparison regression was added. No tests were skipped to conceal those failures. An initial runtime command without its required `--runtime` argument failed; the corrected command above passed.

The optional Python premium static auditor could not start: the installed Windows Python launcher points at a missing/unlaunchable Python 3.13 executable. `premium-audit-attempt.log` records the attempt. No premium-audit PASS is claimed. This repository has no separate production build, formatter or typecheck command; it serves the checked modules directly.

## Mounted Browser evidence and limits

Staging was created from a consistent read-only SQLite backup of the current demo, at `http://127.0.0.1:50312/`, PID 29936. Only the disposable copy's three fictional profiles were reset. Active content revision is 5. The staging server reads the existing local media directory; the live process and data are not replaced.

Live readback retains runtime `73e242e` / `08e689b3…`, all five immutable revisions, the exact `kv` table including active revision/draft/settings/source metadata, media tables, events and sequence. The complete learner-table digest changed between the stage-copy baseline and final inspection. Initial normal Browser inspection and its unload can save fictional lesson position; concurrent activity was not isolated, so no all-table or exact live-progress equality is claimed. No reset or content installation was run on the live database. The full comparison, including `same:false`, is retained in `live-preservation.json` and bounded accurately in `VALIDATION.json`.

All eight changed served public assets match final code bytes (`staged-served-hashes.json`). Observed in the mounted Browser, with actual pointer/key actions:

- Welcome: one enabled Continue, no outer Continue, no empty help/extra control; public discussion still below the lesson.
- Page navigation and blank cursor-save success status, confirmed by mounted page readback.
- Play: exact `0704177609112001`, decreasing bar and `8 seconds remaining` captured in `staged-timer.png`; after expiry only recall input is available, with a single primary Continue.
- Filled all 16 digits, committed through the primary action, and received the authored exact-match feedback.
- Reloaded the final code, followed the existing date/principle/application path, and opened optional comparison. Readback confirms one primary, comparison commitment in the dock, no outer Continue and blank settled save status. Its entry initially overlapped a fixed surface at the automation click point; ordinary upward scrolling made pointer activation succeed. No synthetic activation substituted for that pointer check.
- Nonempty extras: a clearly labeled SYNTHETIC DOM fixture invoked the actual shared extra-information renderer/binder. Native dialog opened with Close focused; Escape removed it and restored its exact trigger. The fixture was removed afterwards; the actual lesson again has no Extra information control. This is a native component check, not a claim of authored extra teaching installed in the course.

One intermediate Browser snapshot attempt returned connection refused; reopening the same staging URL succeeded and subsequent checks ran normally. One early Play attempt did not change state; pointer activation through the current reference was then observed and verified. No action success is inferred from dispatch alone.

Native narrow viewport, physical phone/touch, assistive-technology speech, real OS clipboard behavior and reduced-motion OS setting remain unverified. The narrow app DOM/HTTP checks, synthetic copy events and deterministic reduced-motion timing tests are automated evidence only. No independent teammate review or Guy acceptance is claimed.

## Inline authoring/comment integration constraints for #14

Inspected actual implementation: `public/studio/unified-studio.js`, `curriculum-editor.js`, `text-pages-editor.js`, `public/preview/learner-renderer.js`, `public/app.js`, `public/ux.js`, `src/server.js` and `src/store.js`.

1. The learner uses a pinned session revision, and current Studio works on an entire shared draft. Inline editing must load the current draft, reconcile pinned-vs-current content, and name `baseRevisionId` plus `expectedDraftToken` when posting `/api/studio/draft`. Stale writes return 409; absence of the token is an error. Reuse `mountUnifiedStudio` collection/validation/CAS behavior, source-safe rich rendering and stable component/page/activity identities. Do not save only the viewed lesson over a newer full workspace.
2. Draft Save is not publication. `/api/studio/publish` and rollback are separate guarded operations. Saved-draft Preview uses `/api/studio/preview/session` and `/evaluate`, carries the draft token, and makes no learner writes. Inline preview must preserve that distinction and dispose timers/keyboard/dialogs when changing context.
3. Author enforcement currently lives at the server boundary through `requireAuthor` for `/api/studio/*`, replies, moderation and restore. `canAuthor` controls UI availability. The local `x-demo-user` identity is a fictional demo mechanism, not production authentication.
4. Existing `/api/questions` supports lesson/revision plus optional word or exercise, idempotent request IDs, public/anonymous discussion, author replies and moderation. It has **no component/page/block anchor** and **no author-only editorial annotation type**. Reusing public questions for private editorial comments could expose them to learners. The accepted UX contract needs an explicit author-only annotation shape/API and learner-projection exclusion, anchor validation against the named revision, backup/restore revision relinking and deletion/history policy. Existing historical private questions must stay private. Do not silently treat arbitrary metadata as an authenticated anchor.
5. Component/page source fields, activity models and source provenance already survive Studio collection and full-draft save. The new optional extra field survives the existing options carrier; an author-facing editor for it can be added with #14. This branch supplies display/validation only and deliberately adds no invented content. Browser source editing and anchored author comments are not implemented yet; Leo owns the next accepted UX/integration brief.

## Integration handoff

Cherry-pick the implementation commits `17605c1` then `68c3b02`, or merge this scoped branch into Leo's integration checkout, then merge accepted UX and Curriculum work before any installation. Likely shared-file conflicts are `source-activities.js`, `app.js`, `learner-view.js`, `ux.js`, `preview/learner-renderer.js` and `refinement.css`. Preserve the one primary action slot, `onContinue` handoff, deadline/cancellation ownership, response retry, safe conditional extras and existing page/activity IDs when reconciling #8/#10/#13.

After the full combined revision is verified: use the existing fresh-fictional-progress/preservation installation policy, back up before any installation, preserve all immutable revisions/drafts/media/nonprogress data, and verify the destination/runtime hashes. This branch authorizes no partial live installation. Audio remains the separate previously reported human-recording gate.
