# Unified Studio implementation handoff

Date: 2026-10-08. Status: local Feature implementation, owner checks complete; Lead integration, finished-candidate independent QA and Guy acceptance pending.

Checkout: C:\Users\Trans\.openmausbot\workspaces\2b35801f-cca1-4beb-9e70-fd39eb282fa0\feedback18-ui
Branch: feature/feedback18-unified
Parent: 95b24b950935c1fc15ee607c5f0c175f8d12b04e. The earlier feature/feedback18-ui commit 3e9bc4818875bc6c8eaef11dac442c654395e577 is preserved.
The handoff commit is the commit containing this file; obtain its exact SHA with git rev-parse HEAD. No push or demo update.

## Delivered behavior and ownership

One selected lesson mounts full-width component instances in authored learner order. Each text instance mounts the established local EasyMDE editor; exercises appear below their owning exercise component. Stable component IDs, selectors, roles, Markdown source/unknown metadata, canonical exercise IDs and inert legacy fields survive saves and reorder. Move buttons and a pointer handler are implemented; actual mounted pointer drag remains unverified.

Lesson/component vocabulary selectors support explicit IDs and typed tags while preserving authored order and unknown selector fields. Vocabulary and exercise word pickers cap result rows at 50 against all 2000 words. One introducedLetters field projects legacy keyboard.newKeys exactly and uses the shared cumulative preview; no known-letter input or letter inference.

Structured optional chapters support create/rename, child and top-level ordering, atomic moves, and explicit removal to ungrouped without deleting lessons. Structural redraw currently collapses its details panel; reopen it before another chapter action. Legacy chapter strings remain source metadata.

Import is at the top. JSON retains the complete pack. CSV exposes recognized/ambiguous/unmapped columns and raw samples, closed explicit mapping/decoders, typed formatting/tag preview and a frozen diff. Review/Discard are read-only. Stage alone writes the captured candidate with CAS inputs; Publish remains separate. Mapping/file/base/token changes invalidate preparation. Failed Stage retains the source/mapping. Mapping columns paginate at 25; diff pages at 10; source bytes are retained, not truncated. CSV has no intrinsic styles; live Sheets/sidecars are not implemented.

Any lesson/exercise/word save collects sibling edits into one content snapshot, derives indices before Stage, retains source extensions, and locks inputs/editors through save/reload. The app refuses import Stage while workspace edits are unsaved. Preview saved draft uses the existing isolated rehearsal callback and makes no learner progress/settings writes. Concept/feedback separation and Nikkud-control removal from the first slice remain.

Only public/app.js Studio state/functions/actions/bindings; public/studio/{unified-studio,selector-editor,curriculum-editor,import-workflow,editor-fields,exercise-editor,import-review,vocabulary-browser}.js; public/studio/studio.css; src/server.js static allowlist; tests; checklist/handoff/evidence changed. No learner renderer/runtime/shared-helper/schema/preview modifications.

## Integration API and routes

- mountUnifiedStudio(host,{content,lessonId,baseRevisionId,expectedDraftToken,saveDraft,onLessonSelect,...}) returns getContent(), save(), isDirty(), dispose(). saveDraft accepts {content,baseRevisionId,expectedDraftToken}; returns the saved draftToken. It gathers every sibling before calling the app save/reload lock. prepareStudioContent uses deriveLessonIndices and validates compositions/curriculum. projectLesson is an editing projection; opening performs no Stage.
- mountExerciseEditor remains a callable disposer; the function additionally exposes snapshot() and getEdits() for sibling collection. It preserves the closed dirty-field registry, including values from controls disabled by the submitting save.
- mountSelectorEditor(host,{content,source,ownerLessonId,selector,allowLesson,onChange}) returns getValue()/dispose(). Exercise references remain owned by the lesson.
- mountCurriculumEditor(host,{getContent,onChange,selectedLessonId,onLessonSelect,newId}) returns refresh()/dispose(). moveLesson, removeChapter and moveCurriculumEntry are pure candidate operations using projectCurriculum.
- prepareImport(raw,{csv,mapping,content,baseRevisionId,expectedDraftToken}) creates the frozen reviewed candidate using shared vocabulary mapping/validation. mountImportWorkflow(host,{session,getSnapshot,saveDraft,onStaged,renderWord}) returns invalidate()/refresh()/dispose(); persistent app state studioImport retains rejected input across remount.
- renderImportReview additionally accepts page/pageSize and preserves the complete inspection result while bounding displayed objects.
- NEW required routes: /studio/unified-studio.js, /studio/selector-editor.js, /studio/curriculum-editor.js, /studio/import-workflow.js. src/server.js adds these four explicit static allowlist entries only. Existing course.js/vocabulary-import.js, Markdown, local EasyMDE JS/CSS and Studio CSS routes must remain.
- No dependency/lockfile changes in this slice. Locked EasyMDE 2.21.0, marked 18.0.14, DOMPurify 3.4.16 and jsdom 30.1.1 and existing license notices remain at the parent. See FEEDBACK18_UI_HANDOFF.md for their integration/license evidence.
- All server model validation/CAS/preview APIs are inherited from the parent, not a shadow implementation.

## Verification and recovered evidence

Saved owner command npm.cmd run verify completed 231 tests, 231 passed, zero failures/cancellations/skips (docs/evidence/feedback18-unified/verify.txt). This recovery read the actual result and confirmed all 14 implementation/test files predate the completed verification; SHA256 bytes and timestamps are in source-checkpoint.json. No app/test source changed during recovery, so the full suite was not repeated. Lead separately reported his own 231/231 rerun; that is integration-owner evidence, not independent QA.

Saved focused output focused-final-pre.txt reports 28/28 checks covering the widget/unified/recognition set. It predates final app expectation updates; the complete final suite covers those updates. No fresh focused rerun is claimed. Prior clean npm ci success is reported in the earlier conversation; this recovery did not reinstall.

Saved exact-parent control command node docs/evidence/feedback18-unified/parent-controls.mjs produced five gaps against actual 95b app/editor modules: 2000 unbounded vocabulary buttons; two lesson selectors; zero repeated Markdown editors; zero mapping columns; sibling title loss. parent-controls.txt records those results. No repeated baseline run during recovery.

Recovery commands actually executed: per-command git -c safe.directory=<checkout> status/branch/rev-parse/diff --stat/diff --numstat/diff --check; node --check docs/evidence/feedback18-unified/browser-fixture.mjs (exit 0); the revised fixture was actually forked with Node IPC, served only 127.0.0.1:57318, and acknowledged every hash capture/conflict. The shell process launcher failed before execution; Node runner completed file/Git/fixture work.

### Mounted Browser evidence and limits

Recovery used the built-in Browser tab of the Computer panel at the owned fictional fixture 57318. browser-recovery-observations.json contains bounded dated observations; browser-recovery-captures.json pairs acknowledged table hashes/counts, never raw rows.

- Accessible move -> Save -> Reload retained legacy-explanation and synthetic-browser-second-text with distinct source, source sentinel and unchanged canonical exercise IDs. Actual move/save/reload clicks used mounted tools; the new source strings were set through the actual CodeMirror editor API, not keystrokes.
- Chapter creation, move into chapter, top-level reorder, nonempty removal to ungrouped and another reorder survived Save/Reload with all lesson IDs. Initial attempts acted after a redraw closed the details panel and did not prove the action; later captures explicitly correct those probes.
- Mounted mapping/Review showed rendered bold/color, typed tags and raw cells; changing mapping removed Stage. Native Stage preserved 2000 source words and exact unknown raw cell. Typed bold lives in word.format.bold; color in fieldFormatting.pointed.userEnteredFormat.textFormat.foregroundColor. Earlier probes used wrong paths and are corrected explicitly.
- Paired table fingerprints show Review, rejected stale Stage after acknowledged synthetic conflict, and Discard wrote zero tables. The stale Stage message retained filename and all nine mapping rows. Every recovery capture reports learnersUnchanged=true and publishedUnchanged=true.
- Actual source browser displayed 50 result rows for 2000 matching words. A prior nonexistent-selector probe is explicitly corrected.
- Previous-turn Browser reports/saved screenshots cover first-click selection, keyboard Markdown-toolbar activation and sibling exercise retention. The screenshot files are historical capture evidence, not a final rendering claim; current screenshots from off-screen selectors were blank and excluded. Store/HTTP tests independently cover sibling retention, tags/derived indices, same-token no-op and all-table CAS rejection.
- Actual pointer drag cannot be confirmed: the mounted MCP profile is core (29 tools); profile discovery lists lower-level mouse tools only under mobile/all, and none are callable in this session. No alternate browser/CDP/automation route was used. Dispatch-based pointer regression is owner automated evidence only. Lead/independent QA must perform actual mounted pointer drag -> save/reload -> ID/order/exercise-count checks. Phone/mobile/touch is deferred until APK.

Raw browser-state.json was moved outside the checkout to the bot workspace feedback18-unified-private-evidence/browser-state.raw.json. The replacement includes only synthetic declaration, source artifact hash, table counts/hashes and observed invariants; it honestly lacks paired historical before/after hashes. The revised reproducible fixture now emits bounded summaries by construction. Synthetic CSV source bytes are retained in browser-recovery-source.csv. Intermediate failed logs and blank image captures are also outside the commit. No learner records, revision/draft table dumps, runtime databases, secrets or uploads are delivered.

## Lead handoff

Inspect/cherry-pick this local commit into the isolated candidate. Reconcile app.js Studio function context and server static allowlist with concurrent Lead changes. Finish learner/library/review/outline/keyboard instance navigation, shared runtime/schema surfaces, and preview component navigation; this slice makes no v2 learner/preview completion claim. Run finished-candidate verification and independent QA/release review, including actual pointer drag and Browser acceptance, before Chief's demo gate and Guy retest. No protected runtime, production, APK or live integration was touched. Only the owned fixture process is stopped after evidence capture.
