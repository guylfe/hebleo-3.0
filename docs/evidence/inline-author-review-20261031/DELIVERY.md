# FIRST2-F14 owner delivery

Owner: Hebleo Feature Engineer. 31 October 2026. Isolated clone:

`C:\Users\Trans\.openmausbot\task-workspaces\71c71389-5334-4e0c-9ca8-d80dd28223d1\653fb433-7485-48b1-9f7c-cb22711bda02\hebleo-3\feedback14`

Branch `feature/inline-author-review-20261031`, based exactly on `12ca8ff2eaa7d06f34aaca6c7ecc2a92c8ebbf60`. No Lead checkout, installed DB, main, WordPress, audio or canonical source pack was edited. All comments introduced for verification are explicitly synthetic in disposable stores. See [implementation/API/recovery contract](../../INLINE_AUTHOR_REVIEW.md).

## Artifacts and integration

* Backend: `src/author-review.js`, `src/store.js`, `src/server.js`. Private author APIs, projections, immutable anchors, idempotency/status audits, reader-9 migration, complete validation/recovery, restore relinking and retention of newer private review.
* Shared workspace: `public/studio/workspace.js`, `public/studio/unified-studio.js`, `public/app.js`. Single complete workspace/base/token; sibling collection, saved Preview, existing impact/source publication path, pending-save guards, explicit comparison/reconciliation and input retention.
* Author UI: `public/author/inline-author.js`, `public/author/author.css`, `public/index.html`. Same learner layout, source Markdown/HTML adapter, headings/settings/Extra information, keyboard quote selection, persistent private review in learner view and Studio. Existing style tokens and controls retained.
* Regression tests: `test/author-review.test.js` and F14 app tests; existing app/QA harnesses import the new shared dependencies. Older-schema fixtures explicitly omit the new namespace, reader-version assertions include 9, and preservation-startup fixtures use the current schema constant. No existing assertion was removed to make an implementation failure pass.
* Docs: `docs/INLINE_AUTHOR_REVIEW.md`, `DESIGN.md`, `UX-CONTRACT.md`, stable `FIRST2-F14` row in `docs/FEATURE_CHECKLIST.md`, this evidence directory. `package.json` syntax checks include every new module.

**Lead action:** cherry-pick the implementation/evidence commits, reconcile the explicitly owned integration files with items 1–13, then run independent integrated QA/UX review. Reader 9 is additive but the installed reader-8 preservation runtime intentionally refuses migration. Back up/copy that DB and rehearse Store migration + export/restore before any separate installation. This feature deliberately does not alter Lead-owned install/runtime scripts or source-activity/text-contract/course-model files.

## Executed automated verification

The final exact implementation revision, command results and counts are recorded in `VERIFICATION.json` after the final checks. The following were actually executed during implementation:

| Command | Actual result |
|---|---|
| `npm ci --ignore-scripts --no-audit --no-fund` (root and schemas) | Dependencies installed. No dependency/version addition. |
| `npm run check` | Passed; expanded check includes new modules. |
| `npm run verify:candidate` | 921 selected candidate tests passed before the final three additional author tests and focused source-settings/focus refinements. This command uses the repository's existing audio filename/name exclusions. Final exact-revision rerun is in VERIFICATION.json. |
| `node --test test/author-review.test.js` | 11/11 passed: real HTTP permissions/no leaks, exact UTF-16/Nikkud/surrogate checks, idempotency/audit/CAS, disk reload, draft/release/rollback, revision/token relinking, malformed no-mutation/transaction rollback, older-restore retention, reader-8 migration, same-workspace sibling edits, keyboard selection and late-response composer preservation. |
| Focused app risk run | 10 cases: the nine existing Studio policy/save/CAS/queued-publish/departure guards passed; a new fixture was corrected to start its other-tab edit from the saved shared draft, rather than deliberately reverting sibling content from the published copy. The corrected F14 case passed. |
| `node --test --test-name-pattern='F14\|pending unified\|Publishing behind' test/app.test.js` | 4/4 passed. |
| `node --test --test-name-pattern='F14 real app\|Rehearsal keeps keyboard\|G5-01 actual' test/app.test.js` | 3/3 passed, including exact preview-trigger focus return. |
| `node --test test/author-review.test.js test/qa-uxi13-independent.test.js test/preserved-runtime.test.js test/feedback18-store-model.test.js test/feedback8-functional.test.js test/first2-feedback.test.js` | 61/61 passed. Reused independent-authored tests are owner executions, not new independent review. |
| `npm test` (schemas) | 27/27 passed. |
| `node tools/runtime-check.mjs --runtime ..` (schemas) | 9/9 runtime scenarios passed. |
| `npm run verify` (initial unrestricted exploratory run) | **Did not pass**: 982/1004 passed, 22 failures. It included the frozen old-review/live-port test in `qa-tests/independent.test.js`, historical feedback-recovery QA and audio/media tests as well as implementation/harness/version failures corrected in the focused/candidate runs above. No unrestricted/full-suite-green claim is made. The task uses the existing candidate verification boundary; no audio work or attempt to rewrite the frozen historical review was made. |
| Premium skill Python static auditor | **Not executed successfully**: the installed Windows `py` launcher points to an unavailable packaged Python executable. The exact strict-audit command was attempted; no audit pass or full accessibility certification is claimed. |

The app tests exercise real HTTP from the actual app module: capability-gated inline → shared draft → saved rehearsal → existing Studio impact → deliberate disposable Publish; learner state stays unchanged. They also exercise retained unsaved inline/sibling work, external-token conflict, explicit three-way reconciliation and continued saving. The author-specific tests compare every DB table including SQLite sequence on malformed rejection/rollback.

## Mounted Browser evidence

Own Browser tab, disposable **in-memory** candidate at loopback port 63482; original first-two source pack retained, optional illustration file references omitted in this temporary fixture because uploaded media was not copied. Original source files were not changed. This fixture is not a release installation.

Observed actions and readback:

1. Fictional Author profile → How memory works → Edit lesson. Real EasyMDE/source editor and page/component controls mounted inside the learner reading container; a heading was changed to `Welcome to Hebleo — F14 disposable check` and explicitly saved to the shared draft. Published revision remained 2.
2. Keyboard/mouse selection in the labelled read-only source projection → Comment on selected text or block → synthetic private note saved. Server readback recorded an exact **555 UTF-16-unit** selection, original stable page `MEMORY-A2.learn.try-first`, and saved draft context.
3. Resolve → Reopen. Readback: version 3, status open, audit `create:open`, `status:resolved`, `status:open`, anchor current.
4. Browser reload → Author comments. The persisted note was visible again. Author GET returned it; fictional learner GET returned **403** and learner bootstrap contained no note text. The browser's reported failed request was this deliberate 403 test.
5. Preview saved draft rendered the edited heading with the original rich source text. Escape closed it and actual focus returned to the inline Preview button (`previewClosed:true`, `focusReturned:true`).
6. Apply opened existing Studio Changes & history and displayed one unpublished change affecting MEMORY-A2. After scrolling Publish fully into the viewport and explicitly clicking it, readback was **published revision 3**, zero unpublished changes and no pending draft. Earlier partially visible button clicks had produced no release; they are not counted as success.
7. Studio Comments & replies showed the persisted private note separately from public discussion. Final native/API readback: revision 3, privateNoteCount 1, noteVersion 3, anchor current, learnerContainsPrivateNote false, studioPrivateVisible true. The review-only toolbar was actually hidden (`display:none`).
8. The author container was temporarily constrained to 360 CSS px in the 1280×720 Browser viewport; measured container width and scrollWidth were both **360**, and the note/composer/actions wrapped in flow. [Screenshot](narrow-author-container.png). This is a constrained-container inspection, **not** a physical device or full narrow-viewport test. The temporary style was removed by reload.

The candidate also served the page successfully as an ordinary fictional learner with no author edit/comment controls before Author was selected. No native audio, assistive technology, physical device, production identity, external service or Guy acceptance is claimed. Independent integrated QA/UX review remains pending.

Both temporary candidate servers are shut down after collecting the final receipt. Temporary source/server files and raw logs remain ignored; no learner store or uploaded media is committed.
