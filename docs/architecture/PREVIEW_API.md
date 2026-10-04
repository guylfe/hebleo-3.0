# Private author preview API v1

Status: aligned with Lead's frozen `docs/B2_DRAFT_API_DECISIONS.md` at
`5ba7f80f74cded8132dba0463ebc0c1047158e21`, implementing runtime `a792f1e`.
This branch adds schemas/checks, not runtime enforcement. See
[B02_CONTRACT_EVIDENCE.md](B02_CONTRACT_EVIDENCE.md) for bounded evidence.

## Frozen routes

Content remains `schemaVersion:1` with words/lessons/exercises arrays. All routes
require the existing author gate and return `Cache-Control: no-store`.
Tokens identify content, never authorization. Preview accepts no learner identity.

| Operation | Request | Successful response |
| --- | --- | --- |
| Read | `GET /api/studio` | `{revisionId, content, draft, history, preview}` |
| Stage | `POST /api/studio/draft`: `{baseRevisionId, expectedDraftToken, content?, word?}` | `{draft, changes, affectedLessons, draftToken, baseRevisionId, unchanged}` |
| Session | `POST /api/studio/preview/session`: `{lessonId, draftToken}` | `{mode:"draft-preview", persistent:false, draftToken, baseRevisionId, lessonId, content, steps}` |
| Evaluate | `POST /api/studio/preview/evaluate`: `{lessonId, exerciseId, draftToken, answer}` | `{mode:"draft-preview", persistent:false, draftToken, exerciseId, result}` |
| Publish | `POST /api/studio/publish`: `{baseRevisionId, draftToken}` | `{revisionId}` |
| Rollback | `POST /api/studio/rollback`: `{revisionId, baseRevisionId, expectedDraftToken}` | `{revisionId}` |

Stage is **/draft**, not /stage. Validate each message using its named definition
in `schemas/studio-wire.v1.schema.json`. Schemas describe intended messages;
they do not claim every constraint is already enforced server-side.

`draft` is null or `{baseRevisionId, content, stagedAt, draftToken}`. The diff is
`{draft, changes, affectedLessons}`; without a draft it is exactly
`{draft:null, changes:[], affectedLessons:[]}`. History entries are
`{id, createdAt, reason}`. A change is `{kind,id,action,impact}`; schema kind
`metadata` reserves the required metadata diff repair and is not emitted by the
tested baseline. Whole-pack metadata should conservatively affect every lesson.

## Exact draft identity and CAS

`draftToken = "dt1-" + sha256hex(canonicalJSON({v:1, baseRevisionId, content}))`.
Canonical JSON recursively sorts object keys, preserves arrays in order and
omits whitespace. All provenance, approvals, source maps, themes, media pins and
unknown fields participate. No Unicode normalization or field stripping occurs.
Clients compare opaque tokens; they do not construct or interpret them.

`expectedDraftToken` is required, including null when no draft is expected.
Stage starts from supplied content, otherwise current draft, otherwise published
content; an optional word patch is then applied. Check order is token-key presence,
active base, expected token, validation, no-op detection, write. First staging of
published content creates a draft with `unchanged:false` even if the diff is empty.
Re-staging the identical existing draft returns `unchanged:true` and writes
nothing, preserving its token and stagedAt.

The store retains one draft. Save/publish/rollback compare the expected base and
token in their mutation transaction. Restore rebases carried drafts to a new
revision ID, changing the token. Failures retain the previous draft and revision.
A stale preview receives 409 and must freeze/close until explicitly reopened;
it never falls back to another draft or published answers. To rehearse published
content, stage a zero-change draft first.

## Disposable rendering and grading

Session uses the learner wire shape: exercise answers/distractors are removed;
recognition choices and ordering tokens/prefix indices use the same preparation
as learner mode. Steps are learn, optional check, vocabulary, apply, complete.
The compatibility learner schema is not a confidentiality filter for other
metadata; see [CONTENT_CONTRACTS.md](CONTENT_CONTRACTS.md).

Evaluate uses the shared pure evaluator. Answers are strings for
recognition/typing/cloze/transformation, composed sentence strings for ordering,
and `{wordId:meaning}` for matching. Result is
`{exerciseId,lessonId,answer,correct,expected}`, without request/revision IDs or
timestamp. The exercise must belong to the requested draft lesson.

Lead's renderer is `createLearnerRenderer()->{mount(container,props)->dispose}`.
Props are `{mode,persistent,content,lessonId,step,question,exerciseId,answer,result,
preferences,lookupId,busy,actions}`. The local response draft is
`{text,matching,selectedTokens}`; setAnswer retains it and submit(wireAnswer)
sends the serialized answer. Lookup is read-only. Settings call disposable
setPreference. The renderer must never call fetch, storage or learner APIs.

Mark its root data-preview-root; learner handlers ignore events inside it.
Global keyboard events must route to disposable preview actions. Entry/exit
settles or cancels queued learner saves and prevents late responses from changing
profile state. Dispose every mounted listener. Backend checks do not establish
these UI properties. Integrated acceptance must compare every persisted row for
all three populated fictional profiles across navigation, grading, retry, lookup,
Nikkud/keyboard settings and exit. Browser/touch evidence stays separate.

## Errors and remaining gates

All errors are `{error,code}`. DRAFT_CONFLICT and STALE_BASE also include
`current:{draftToken:string|null,activeRevisionId:int}`.

| Status | Code | Trigger |
| --- | --- | --- |
| 400 | DRAFT_TOKEN_REQUIRED | Missing expected-token key or empty/missing preview/publish token |
| 409 | STALE_BASE | Active revision differs from request/draft base |
| 409 | DRAFT_CONFLICT | Different token, including null/existing and token/no-draft |
| 404 | PREVIEW_TARGET_NOT_FOUND | Missing target or exercise in another lesson |
| 400 | INVALID_ANSWER | Wrong wire answer shape |
| 403 | FORBIDDEN | Existing author gate rejects identity |

Other DomainErrors retain their stable envelope. The current pack-wide gate
rejects source-candidate-unapproved at staging. Per-object eligibility enforcement
and media-byte storage remain deferred.
