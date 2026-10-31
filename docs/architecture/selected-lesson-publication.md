# Selected lesson publication backend

Status: implemented local backend candidate, 1 November 2026. Base `4433f2e0e8bcd319edd3189ba9016f8d9fa7ff12`. No installation, live publication, frontend adoption or Guy acceptance. Lead owns integration and independent Release/QA/UX review.

## Saved scope and dependencies

The operation starts from active A at R0 and the complete saved draft D at T0. It replaces one existing lesson with its exact saved object. It copies only explicitly included, referenced word/exercise objects. Retained collection positions and all unselected active objects and pack fields remain unchanged; additions append in saved collection order. No draft release candidate is staged.

References include lesson indices, checks, vocabulary selectors, component selectors, page vocabulary, target mappings, exercise word IDs and exact vocabulary bindings. Selector resolution uses both the saved collections and the selected lesson over active collections. This detects tag additions, removals and exclusions. Membership/order must match the saved selected lesson after inclusion. Another lesson's changed membership, prerequisite, new exercise owner, or required derived-index rewrite blocks the scope. Changed dependencies cannot silently resolve to their older published values.

`requiredDependencies` entries identify `kind`, `id`, `action`, `reasonPaths`, and `potentiallyAffectedPublishedLessons`. This last field is the conservative union of published/draft references and ordering distractor windows, filtered to currently published lessons. The ready review's `affectedPublishedLessons` is the complete candidate impact from the existing publication diff, including prepared learner views. Neither field authorizes another lesson-object replacement.

New lessons require an explicit curriculum placement and remain blocked. Source registrations/bindings/author bundles require the exact source approval workflow. Required lexical representation/eligibility or course identity changes block. Unrelated lexical, curriculum, provenance and unknown pack differences remain saved. Opaque unknown metadata is retained; this API does not invent reference semantics for it. Pack-level publication, object deletion, collection reorder and teaching promotion are outside this endpoint.

The complete candidate passes existing content/reference/identity/lexical-transition, text eligibility and strict media checks. Real imported media still requires the existing exact source approval. No permit or approval is fabricated. Invalid candidates return typed blockers; their dependency choices remain reviewable.

## Author HTTP contract

Both endpoints are author-only, JSON, same-origin and no-store under existing server controls. They operate on saved state; neither accepts lesson JSON or an approval flag.

`POST /api/studio/publish-lesson/review`

```json
{
  "baseRevisionId": 6,
  "expectedDraftToken": "dt1-<saved token>",
  "lessonId": "MEMORY-A2",
  "includeDependencies": []
}
```

An inclusion has exactly `{ "kind": "words", "id": "existing-id", "action": "changed" }`. Kinds are `words` and `exercises`; actions are `added` and `changed`. Submit only those three fields from a returned dependency. `includeDependencies` is mandatory even when empty. Unknown fields, duplicate IDs, unrelated/unchanged objects, mismatched actions, and removal operations reject with `400 LESSON_PUBLICATION_SCOPE`. An absent saved lesson returns `404 LESSON_PUBLICATION_TARGET`.

Review returns:

```js
{
  scope: 'lesson', lessonId, baseRevisionId, expectedDraftToken,
  canPublish, noChanges, reviewToken, publishedContentHash,
  blockers: [{code, id, path, reason, action}],
  requiredDependencies, includedDependencies,
  changes, affectedPublishedLessons, remainingSavedChanges
}
```

The deterministic `lp1-` token binds the scope, canonical saved token, candidate hash, dependency choices, impact, blockers, and mutable source/media eligibility (including exact local media bytes). Any changed choice needs a new review. Review uses one coherent transaction without data writes: no revision, draft, media, receipt or sequence writes. Impact lists contain IDs and structural changes, not private comment bodies.

`POST /api/studio/publish-lesson` sends the identical four request fields plus `reviewToken`.

In one `BEGIN IMMEDIATE` transaction, commit rereads R0/T0, replans dependencies, reruns source/eligibility/media checks, and verifies the token. It persists media, appends P at R1, updates active, then changes only the top-level numeric base token in the saved draft's raw JSON. D's full content bytes, whitespace/escaping, `stagedAt`, and unknown draft-record fields survive. Private review contexts are neither relinked nor rewritten. Learners, settings, events and unrelated metadata remain untouched. Exceptions roll back every table and `sqlite_sequence`.

Success:

```js
{
  revisionId: R1, noChanges: false,
  publication: {
    scope: 'lesson', lessonId,
    fromBaseRevisionId: R0, consumedDraftToken: T0,
    reviewToken, publishedContentHash,
    includedDependencies, includedChanges, affectedPublishedLessons
  },
  workspace: {
    revisionId: R1, content: P,
    draft: {baseRevisionId: R1, content: D, stagedAt, draftToken: T1, ...retainedRecordFields}
  },
  remainingSavedChanges
}
```

No-op returns `noChanges:true`, the existing revision/token and a coherent workspace, with **zero writes**. A draft is retained even when its remaining diff is empty. No content-schema or backup-reader change is introduced.

Errors: stale active/base returns `409 STALE_BASE`; stale draft returns `409 DRAFT_CONFLICT`; changed/forged review or changed eligibility returns `409 LESSON_REVIEW_CHANGED`, each with existing current-pin details. An exact still-blocked review returns `409 LESSON_PUBLICATION_BLOCKED` plus its blockers. A bad token's syntax is a scope error. Review can return `200 canPublish:false`; that is a successful explanation, never publication.

## Editor adoption handoff

1. Settle collectors and pending saves on the shared workspace owner. Save all current work, then capture owner identity, version, full baseline D, R0 and T0. Never continue after a failed save.
2. Review the selected saved lesson. Display blockers and required dependencies. After explicit dependency choices, review again; show every included change and affected published lesson in final confirmation. Keep Save, Preview and Publish distinct.
3. Serialize commit with saves. Late input invalidates the displayed review. Send the exact captured scope/token, and retain local input and unsent comments while awaiting the response.
4. Verify the success receipt belongs to the captured owner/request. Adopt `workspace.revisionId` and **`workspace.draft`**, not published P, as the saved baseline. If later local input exists, merge `(captured D, collected local now, returned D)` and retain its dirty buffers. Acknowledge only submitted values. Preserve active lesson context, caret and unsent comment state; do not clear the author owner/inline state.
5. A failed local merge after successful publication must freeze subsequent writes and retain buffers for explicit reconciliation. Do not report publication as rolled back.
6. On lost response, freeze writes, GET Studio, and reconcile using captured D/local buffers and the reviewed candidate hash. Retrying the original immutable R0/T0 cannot append a second revision: it conflicts after success. Do not automatically retry using refreshed pins. There is no durable replay receipt; backups need no new receipt namespace.
7. Existing comments retain their historical base/token/context. New comments use R1/T1. Keep an in-flight old comment's body/selection and request a refreshed projection; never silently retarget it.

The existing whole-workspace publish/rollback endpoints are unchanged. Whole-workspace rollback clears a draft and must not serve as automatic undo for this workflow. The frontend must not send this action to `/api/studio/publish`.

## Verification and limits

See [delivery evidence](../evidence/selected-publication-20261101/DELIVERY.md) for actual commands, counts and aggregate current-size results. Focused file-backed and HTTP checks cover 23 saved lessons, dependencies, CAS/scope, source/media/legacy blockers, every injected write phase, exact raw draft rebase, later saves, immutable private contexts, learner pins, lost responses and stable compact recovery. Current-size checks use read-only `VACUUM INTO` followed by Store access only on disposable copies. Generated test edits/media/private notes are explicitly synthetic.

This is backend evidence. Shared-owner adoption, late input/IME/caret preservation in the actual editor, final confirmation UX, browser behavior, installation and independent review remain Lead-owned. No synthetic/live lesson content, private notes, database or media is committed.
