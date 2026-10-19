# Batch 2 draft / preview wire decisions (Lead, 2026-10-04)

Status: frozen by Lead and implemented. Architect owns the schema/ADR wording;
any change goes through Lead with evidence. Base: 1f67a49.
Implemented at a792f1e on private remote branch `lead/b2-draft-api` (https://github.com/guylfe/hebleo-3.0):
`src/store.js`, `src/server.js`, `src/evaluate.js`; tests in `test/draft-api.test.js`.
Fetch with `git fetch origin lead/b2-draft-api`, or read-only from the Lead clone
`C:\Users\Trans\.openmausbot\workspaces\8c900356-50f6-4d41-bbb9-50c8abe09233\hebleo-lead`.

Content stays `schemaVersion: 1` with `words`/`lessons`/`exercises` arrays. The store
already keeps every field it is given (unknown/source fields, provenance, approval,
formatting runs/themes, media refs); nothing is stripped.

## 1. Draft token

- `draftToken = "dt1-" + sha256hex(canonicalJSON({ v: 1, baseRevisionId, content }))`.
  canonicalJSON = JSON with object keys sorted recursively, arrays in order, no whitespace.
- Opaque to clients: compare for equality only. It covers the entire draft content
  (unknown/source fields, provenance, approval, formatting, source maps, media refs) plus its base.
- Re-staging content whose token equals the current draft token is a no-op: nothing is
  written, `stagedAt` is unchanged, response has `unchanged: true`. Key order alone never changes a token.
- Drafts stored before this change get their token computed on read (deterministic; no migration).
- Restore re-bases a carried draft onto the new revision ID, so its token changes.

## 2. Routes (all author-only; every response already sends `Cache-Control: no-store`)

### GET /api/studio
Unchanged shape `{ revisionId, content, draft, history, preview }`. `draft` is `null` or
`{ baseRevisionId, content, stagedAt, draftToken }`. `preview` is the existing diff
`{ draft, changes, affectedLessons }` (`draft: null, changes: [], affectedLessons: []` when none).

### POST /api/studio/draft  (stage; the route is /draft, not /stage)
Request: `{ baseRevisionId: int, expectedDraftToken: string|null, content?: Content, word?: {id, ...patch} }`
- `expectedDraftToken` key is REQUIRED. `null` = "I believe there is no draft" (create).
- Edit base: `content` if given, else current draft content, else active content; then `word` patch.
Response 200: `{ draft, changes, affectedLessons, draftToken, baseRevisionId, unchanged }`.
Check order: token key present -> base == active (STALE_BASE) -> expected == current token (DRAFT_CONFLICT) -> validate -> no-op check -> write.

### POST /api/studio/publish
Request `{ baseRevisionId: int, draftToken: string }` -> 200 `{ revisionId }`.
Base and token are compared inside the same transaction that creates the revision.

### POST /api/studio/rollback
Request `{ revisionId, baseRevisionId, expectedDraftToken: string|null }` -> 200 `{ revisionId }`.
Rollback clears the draft, so it must name the draft it discards (null when none).

### POST /api/studio/preview/session
Request `{ lessonId, draftToken: string }`
Response 200: `{ mode: "draft-preview", persistent: false, draftToken, baseRevisionId, lessonId, content, steps }`
- `content` = the frozen draft in the SAME public shape learners get from `/api/session`
  (answer keys stripped; recognition `choices`, ordering `tokens`/`prefixTokenIndices` computed by the same code).
- `steps` = `lessonSteps(lesson)` from `public/ux.js` (subset/order of `learn, check, vocabulary, apply, complete`).
- No null/no-draft mode. To rehearse published content, stage a zero-change draft first
  (`content` = current content, `expectedDraftToken` null) and preview that token.

### POST /api/studio/preview/evaluate
Request `{ lessonId, exerciseId, draftToken: string, answer }`
- `answer` = exactly the learner attempt wire answer: string for recognition/typing/cloze/transformation,
  composed sentence string for ordering (composeSentence of chosen tokens), `{wordId: meaning}` object for matching.
- Exercise must exist in the draft and have `lessonId` equal to the request's lessonId (else 404).
Response 200: `{ mode: "draft-preview", persistent: false, draftToken, exerciseId, result }`,
`result = { exerciseId, lessonId, answer, correct: boolean, expected }` - graded by the same pure
evaluator (`src/evaluate.js`) that `/api/attempt` uses. No requestId/revisionId/at.

Preview routes read only: no attempts, completion, cards, resumes, preferences, notes, bookmarks,
questions, reports, events or analytics are written for any profile. Stale token -> 409, never a
fallback to another draft or to published answers.

## 3. Error envelope

Every error: `{ error: string, code: string }`; draft conflicts add
`current: { draftToken: string|null, activeRevisionId: int }` so a client can reload and re-apply.

| status | code | when |
| --- | --- | --- |
| 400 | DRAFT_TOKEN_REQUIRED | `expectedDraftToken` key missing (draft/rollback) or `draftToken` not a non-empty string (publish/preview) |
| 409 | STALE_BASE | `baseRevisionId` != active (draft/publish/rollback); or current draft's base != active (preview) |
| 409 | DRAFT_CONFLICT | supplied token != current draft token, including null-vs-existing and token-vs-no-draft |
| 404 | PREVIEW_TARGET_NOT_FOUND | lesson not in draft, or exercise missing / belongs to another lesson |
| 400 | INVALID_ANSWER | malformed answer |
| other | BAD_REQUEST / FORBIDDEN / NOT_FOUND / CONFLICT / PAYLOAD_TOO_LARGE / UNSUPPORTED_MEDIA_TYPE / SERVER_ERROR | existing DomainErrors by status |

Failed requests write nothing; the previous draft and active revision remain.

## 4. Shared learner renderer adapter (Lead provides; Feature consumes)

`public/preview/learner-renderer.js` exports `createLearnerRenderer()` -> `{ mount(container, props) -> dispose }`,
rendering with the same lesson/exercise HTML code as learner mode (extracted from `public/app.js` by Lead).
Props are exactly what `mountLessonPreview` already passes:
`{ mode, persistent, content, lessonId, step, question, exerciseId, answer, result, preferences, lookupId, busy, actions }`.
- `answer` is the renderer's response draft `{ text: string, matching: {wordId: meaning}, selectedTokens: int[] }`
  (or empty/undefined = blank). Renderer re-renders its own container on local input and calls
  `actions.setAnswer(draft)`; the controller stores it opaquely.
- On Check, the renderer computes the wire answer exactly like learner `submitAnswer` and calls
  `actions.submit(wireAnswer)`. ONE Feature change: `submit(wireAnswer)` sends that argument as `answer`
  to evaluate (the stored draft stays for re-render).
- `result` is the evaluate `result`; feedback uses `correct`, `answer`, `expected`.
- Lookup renders an inline read-only vocabulary card (no notes/bookmarks). Preferences come from
  `props.preferences`; Nikkud/keyboard changes call `actions.setPreference` and never persist.
- Isolation: the renderer never calls fetch/api/localStorage. Lead marks the preview container
  `data-preview-root`; learner root handlers in `app.js` ignore events inside it; entering preview
  flushes and cancels pending learner saves.

## 5. Content contracts (Architect schemas; Lead enforcement after schemas land)

- Per-object `provenance` and `approval` are preserved as-is and covered by the token.
  The pack-level gate is unchanged for now: `source-candidate-unapproved` packs are still rejected
  at stage, so Curriculum's fd7b2a5 candidate cannot be staged, previewed or published.
  Per-object approval enforcement at publish follows Architect's schema in a later commit.
- Media refs: `{ assetId, revisionId, sha256 }` pinned; a legacy URL string is explicitly unpinned.
  Media storage API is not part of this commit.
