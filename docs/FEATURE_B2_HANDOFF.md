# Feature modules — frozen Batch 2 contract

Owner checkpoint, 2026-10-04. Branch `feat/s02-draft-lesson-rehearsal` in
`C:\Users\Trans\.openmausbot\workspaces\2b35801f-cca1-4beb-9e70-fd39eb282fa0\feature-authoring`.
Base `1f67a492c9ae84839d5f765e1a8ba626c0383513`; previous module commit
`0e4e4c2082f2d31f07ead43fcf4cd0e926f2a8cb`.
Aligned with the whole Lead-owned `B2_DRAFT_API_DECISIONS.md`, dated 2026-10-04.
Lead owns app.js, renderer extraction, API/store integration and checklist updates.

## Exact exports and integration

- `public/studio/exercise-editor.js`: `exerciseTypes`, `applyExerciseEdits(original, edits)`,
  `renderExerciseEditor(exercise, content)`,
  `mountExerciseEditor(container, {content, exerciseId, baseRevisionId, expectedDraftToken = null, saveDraft, onSaved = () => {}})`.
- `public/studio/lesson-editor.js`: `applyLessonEdits(original, edits)`,
  `renderLessonEditor(lesson, content)`,
  `mountLessonEditor(container, {content, lessonId, baseRevisionId, expectedDraftToken = null, saveDraft, onSaved = () => {}})`.
- Both editor mounts need a dedicated DOM element and full author content from
  GET `/api/studio`: draft content/base/token when present, active content/revision
  and null token otherwise. `saveDraft(input)` posts the exact
  `{baseRevisionId, expectedDraftToken, content}` to POST `/api/studio/draft`.
  It resolves with the JSON response including top-level `draftToken`; on failure
  it throws an Error with `status` (or `statusCode`), `code`, `current`, and `message`.
  Preserve the server error envelope when constructing that Error. Editors retain
  entered values and the previous token on rejection; they never adopt the conflict
  token. `onSaved(result, nextContent)` may reload the author workspace. Mounts
  return disposers; dispose before replacing/remounting the workspace.
- `public/studio/import-review.js`: `inspectImport(previous, candidate)` returns
  `{changes, warnings}`; `renderImportReview(previous, candidate, {renderWord = null, validationMessages = []} = {})`
  returns HTML. No mount or save action. `renderWord` is an optional trusted shared
  card renderer returning sanitized HTML. Show the result in an author DOM element;
  validation, source conflicts and publication authorization remain server-owned.
- `public/studio/media-picker.js`: `renderMediaPicker(assets)` and
  `mountMediaPicker(container, {assets, onSelected})`. Mount returns a disposer;
  `onSelected(reference)` receives a cloned opaque reference and may save it using
  the author CAS adapter. Pins use `{assetId, revisionId, sha256}`; URL is optional.
  Legacy URL strings are labelled unpinned. Unsafe URLs are disabled. No uploads,
  byte storage, approval or playable URL resolution are implemented here.
- `public/studio/editor-fields.js`: shared exports `escapeHTML`, `draftSaveError`,
  `field`, `booleanOptions`, `nikkudOptions`, `wordOptions`, `listField`, `listRow`,
  `bindLists`, `markDirty`, `readFields`, `replaceObject`.
- Load `public/studio/studio.css` alongside the application styles.
- `public/preview/lesson-preview.js`: `mountLessonPreview(container,
  {lessonId, draftToken, loadSession, evaluate, renderer, preferences = {}, onExit = () => {}})`.
  Returns `{ready, go, next, setAnswer, submit, retry, lookup, setPreference, exit, dispose}`.
  `ready` is the handled initialization Promise; inspect rendered status for load
  errors. `exit` disposes and invokes `onExit`; `dispose` cleans up without that callback.
  `loadSession({lessonId, draftToken})` posts to `/api/studio/preview/session`.
  `evaluate({lessonId, exerciseId, draftToken, answer})` posts to
  `/api/studio/preview/evaluate`. Both use the same thrown error shape as stage.
  Supply a real staged token; no null-draft fallback exists.
- Lead's `createLearnerRenderer()` supplies `{mount(body, props) -> dispose}`.
  Props are `{mode, persistent, content, lessonId, step, question, exerciseId,
  answer, result, preferences, lookupId, busy, actions}`; actions are
  `{go, next, setAnswer, submit, retry, lookup, setPreference, exit}`.
  `setAnswer` stores the opaque response draft `{text, matching, selectedTokens}`;
  `submit(wireAnswer)` sends only the wire argument and retains that draft for
  re-render. String answers cover five families including composed ordering;
  matching uses `{wordId: meaning}`. The renderer must compute these exactly as in
  learner mode. The controller does not grade or serialize learner responses.
- Lead must mark the preview root `data-preview-root`, prevent learner handlers
  from handling its events, and flush/cancel learner saves before entering. Inject
  no learner persistence APIs. Renderer must never fetch or use localStorage.
  Any 409 freezes preview; 404 `PREVIEW_TARGET_NOT_FOUND` clears the renderer and
  prevents further preview interactions. Exit remains available. 400
  `INVALID_ANSWER` preserves the response draft for correction. Late load/evaluate
  responses after exit cannot render or call success callbacks.

## Fresh evidence

`npm.cmd run verify`: 81 passed, 0 failed. Includes syntax checks and the whole
Feature clone suite. First run was 80/81: a new transport test put a Check question
in Apply; corrected its synthetic lesson setup and reran successfully. Existing
server/store checks run on the base in this clone; these are not verification of
Lead's new API implementation. Added regressions cover six wire-answer families,
both CAS conflict codes/current info, top-level token carry-forward, target errors,
invalid-answer recovery, pinned URL-free sha256 media, and field retention.
Six exercise save/reload checks retain source/unknown fields, explicit answers,
Nikkud defaults, IDs, provenance, approval and media. Prefix remapping and late
responses are also covered. The unchanged Store sentinel test establishes module
isolation only; it cannot prove integrated HTTP isolation of all three profiles.

Mounted Browser tab at `http://127.0.0.1:4189/`: initially connection refused;
started only own synthetic fixture with `node feature-browser-fixture.mjs` from
the Feature workspace. Script is outside Git and uses in-memory adapters, no DB.
Rejected-save check displayed `Draft changed elsewhere — reload (active revision:
1; draft token: fixture-0)`, retained prompt, left evidence empty and re-enabled
save. Two subsequent saves returned fixture-1 and fixture-2. Ordering token removal
saved `["ב","בית"]`, prefix `[0]`, authored answer `["אני בבית"]` unchanged;
switching to typing and back retained all three. Selected a URL-free pinned
reference and received its asset/revision/sha256/source intact. Apply navigation
showed the synthetic adapter; Exit emptied the preview container.

These control checks are synthetic and the edited token sequence is not canonical
teaching content. Browser fixture has no grader/shared learner renderer. No real
media playback, touch/drag acceptance, live source import, integrated preview API,
three-profile persistence comparison, independent review or Guy acceptance claimed.
Curriculum candidate fd7b2a5 remains unapproved. Leo's 4173 runtime untouched.

## Handoff

Lead can cherry-pick this branch after `0e4e4c2` (or both commits onto the base),
wire the adapters above, then verify actual HTTP grading plus unchanged three-profile
state across preview entry/navigation/retry/lookup/settings/exit and pending saves.
Update checklist S02/S05/P05/M01 with bounded integrated evidence; retain Pending
user acceptance. No app.js, src files, schema, renderer adapter or main edits were
made by Feature.
