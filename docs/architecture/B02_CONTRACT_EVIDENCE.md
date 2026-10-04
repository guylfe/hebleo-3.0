# B02 contract checkpoint evidence

Date: 2026-10-04. Scope: additive schemas, validation experiments, synthetic
examples, API documentation and ADR. No application/store/server implementation
is changed. These are owner/coordinator checks, not independent QA, release
review, browser acceptance, source approval or Guy's acceptance.

## Revisions and provenance of evidence

- Contracts checkout: `C:\Users\Trans\.openmausbot\workspaces\db09fd3d-5506-4d39-9e8a-95b458bf2c5d\hebleo-contracts`,
  branch `docs/b02-content-contracts`, base
  `1f67a492c9ae84839d5f765e1a8ba626c0383513`. The delivered commit containing this
  file identifies the saved contract tree; its SHA is supplied in the handoff.
- Fresh seed/candidate checks below use the clean isolated runtime
  `C:\Users\Trans\.openmausbot\workspaces\db09fd3d-5506-4d39-9e8a-95b458bf2c5d\hebleo-contracts-runtime`
  at `5ba7f80f74cded8132dba0463ebc0c1047158e21`.
- Leo's saved check report is
  `C:\Users\Trans\.openmausbot\workspaces\71c71389-5334-4e0c-9ca8-d80dd28223d1\HEBLEO_CHECKPOINT_REVIEW_2026-10-04.md`.
  Architect read that report during finalization. It records checks against Lead's
  clone `C:\Users\Trans\.openmausbot\workspaces\8c900356-50f6-4d41-bbb9-50c8abe09233\hebleo-lead`
  at `83482ea29b7a0e3172f81e77a31f80642d04835a` plus its then-staged tests/comment.
  Do not describe that checked runtime as a clean commit or attribute Leo's runs
  to Architect. Lead's HEAD was subsequently observed clean at
  `a557e5055fedc8cbd512b7b8f489ee3b33e5fd2b`; this observation is not a test run.

## Fresh narrow checks run by Architect

Working directory for each command is the contracts checkout above. In PowerShell:

```powershell
$contractRuntime = 'C:\Users\Trans\.openmausbot\workspaces\db09fd3d-5506-4d39-9e8a-95b458bf2c5d\hebleo-contracts-runtime'
node schemas/tools/validate.mjs --seed --runtime $contractRuntime --summary
node schemas/tools/validate.mjs --candidate-ref fd7b2a52b5d61cf783e86e011ef793e3694d7334 --runtime $contractRuntime --expect-ineligible --summary
node schemas/tools/validate.mjs --file schemas/examples/synthetic-content.json --summary
```

All three commands exited 0. The first two import `Store` from the pinned runtime
and use independent `:memory:` databases, closed on exit; they do not use the
4173 server, its files, learner data or an external service.

| Input | Structural / semantic errors | Canonical eligibility | Private-demo eligibility | Runtime staging |
| --- | --- | --- | --- | --- |
| Synthetic seed from contracts base | 0 / 0 | false, 45 reasons | true, 0 reasons | accepted in memory |
| Pinned fd7b2a5 candidate | 0 / 0 | false, 112 reasons | false, 112 reasons | rejected, no database writes |
| Saved synthetic-content example | 0 / 0 | false, 46 reasons | true, 0 reasons | not attempted |

Every result reports `inputUnchanged:true`. The candidate command reads
`fd7b2a52b5d61cf783e86e011ef793e3694d7334:docs/curriculum/lesson-1.3/candidate-pack.json`
with `git show`; input SHA-256 is
`7fa4412e9ece60e6b81212412392354b5a24704740088f0dfb8449f2247b737a`.
It reports 37 pending objects and 23 words with derived forms. The whole
`source-candidate-unapproved` pack is rejected at staging with
`BAD_REQUEST`, `Content needs explicit provenance.`, and
`failedRequestWroteNothing:true`. This is the current pack gate, not proof of
per-object approval enforcement. Exit 0 means the expected rejection was observed.

The candidate remains unapproved pending D1-D9. Neither structural validity nor
the diagnostic approves those decisions, derived unpointed/curated forms,
pedagogy, source fidelity or publication. No candidate fields were changed or
relabelled, and no candidate was imported. The synthetic example's input SHA-256
is `b070d1725d4dd4739abc5c788f6ca935867e8c20bcd08950b982e19cf9c6ed4c`.

## Existing saved verification, attributed to Leo

These commands/results are recorded in Leo's report above and were not rerun
during this finalization. The finalization changes only documentation.
Commands run from the contracts checkout, with `$leadRuntime` set to the exact
Lead clone path above:

```powershell
node --test schemas/checks/contracts.check.mjs
node schemas/tools/runtime-check.mjs --runtime $leadRuntime
node schemas/tools/reproduce-metadata-diff.mjs --runtime $leadRuntime
```

- Schema checks: **15/15 passed**, including named synthetic wire examples,
  required CAS tokens, source identity/merge ambiguity, unknown-field retention,
  explicit forms, approval dependency/field vetoes, media pins/approval bindings
  and learner response restrictions. The earlier 13-check report is superseded.
- Runtime checks: **8/8 HTTP groups passed**, using ephemeral loopback HTTP and an
  in-memory database, closed on exit. Coverage includes null draft, CAS errors,
  lossless staging, complete token scope, no-op restaging, preview grading,
  authorization, malformed/wrong targets, stale operations, publish and rollback.
  Preview checks compare stored rows for three populated fictional profiles.
- Metadata diagnostic: **`fixed:false`**. Exit 0 confirms the diagnostic ran;
  it does not mean the defects are repaired.

| Diagnostic case | Observed result |
| --- | --- |
| Pack provenance label | Token changes; `changes:[]`, `affectedLessons:[]` |
| Pack approval | Token changes; `changes:[]`, `affectedLessons:[]` |
| Pack source map | Token changes; `changes:[]`, `affectedLessons:[]` |
| Pack media manifest | Token changes; `changes:[]`, `affectedLessons:[]` |
| Unknown pack metadata | Token changes; `changes:[]`, `affectedLessons:[]` |
| First staging with only object key order changed | Token matches published content; 22 false diff entries |
| Repeating equivalent staging | `unchanged:true`; no database writes |

All five metadata cases omit meaningful publication changes and affected lessons.
Lead must repair canonical diff comparison and pack metadata impact. The proposed
`metadata` change kind is reserved in the schema, not emitted by this baseline.
After repair, require a failing exit for regressions:

```powershell
node schemas/tools/reproduce-metadata-diff.mjs --runtime $leadRuntime --require-fixed
```

That repair acceptance command was not run here and has not passed. No runtime
defect is fixed in this checkpoint. Leo's separately recorded 102/102 app tests
do not establish mounted Studio/browser isolation and are not contract tests.

## Integration and remaining limits

1. Integrate this docs/schemas commit into Lead's branch; do not replace the
   frozen `/api/studio/draft` API with the older `/stage` proposal. Install the
   isolated lockfile with
   `npm.cmd --prefix schemas ci --ignore-scripts --no-audit --no-fund`.
   Installation was not repeated during finalization.
2. Run the contract and runtime commands above against the integrated checkout,
   repair both diff defects, then require `--require-fixed` to pass. Preserve
   token/time/no-write behavior for repeated equivalent drafts and all fields.
3. Keep structural validity, semantic validity, eligibility and runtime
   enforcement separate. The validators are not wired into runtime. Preserve
   the candidate block; per-object publish gating and trusted approval issuance
   remain later Lead work. Eligibility verifies metadata, not human authority.
4. Source row locators are evidence, not durable identities. Pinned media requires
   exact asset/revision/hash agreement; URL strings remain explicitly unpinned.
   No media bytes were fetched, stored, verified or backed up. Source import,
   D1-D9 decisions, media storage and learner metadata filtering remain pending.
5. Mount the shared renderer/controller in a later checkpoint and verify queued
   saves, disposable settings, stale responses and all persisted learner rows.
   Browser/touch checks, independent QA/release review and Guy's retest remain
   separate acceptance gates. No original integration checkout, 4173 runtime,
   live service, production data or paid operation was changed here.
