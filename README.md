# Hebleo 3.0 local demo

A runnable first checkpoint of the human-authored Hebrew learning platform. Private repository: https://github.com/guylfe/hebleo-3.0. Product source: [master specification](docs/MASTER_SPEC.md); broader milestone: [initial build brief](docs/INITIAL_BUILD_BRIEF.md).

Requires Node.js 24.19 or newer. No third-party runtime dependencies. On Windows, from this folder:

```powershell
npm.cmd ci --ignore-scripts
npm.cmd run verify
npm.cmd start
```

Open http://127.0.0.1:4173. Stop a foreground server with Ctrl+C. `npm.cmd run dev` restarts after source changes. Other platforms can use `npm` without `.cmd`.

First startup creates illustrative content and two fictional demo learners in `data/hebleo-demo.sqlite`. Startup is idempotent and retains progress. The database and sidecars are excluded from Git. No live student data or real purchase processing.

## Working features

- Responsive dashboard, course, three illustrative lessons, vocabulary library, Studio, and preferences.
- Recognition, typing, matching, ordering, cloze, and transformation exercises, graded on the server. Hebrew answer normalization, exercise vowel overrides, and an on-screen Hebrew keyboard.
- Full, curated, and unpointed vocabulary modes; saved attempts, completion, bookmarks, personal notes, and per-learner preferences.
- Word enrollment and a persisted simple interval review scheduler. This is explicitly **not FSRS**.
- Canonical vocabulary references and source/selector/renderer lesson manifests. Studio reorders components; the learner renderer follows that order.
- Word editing, dependency preview, validated full-content JSON and vocabulary CSV imports, atomic publishing, version history, and rollback. Learner state is retained. Open lessons pin their original revision.
- Local backup/restore of published content, both learners, and replay receipts. Revision history and unpublished drafts are excluded from export.
- Local WordPress purchase/membership event simulation. Cancelling membership retains the purchased course and basic review. A refund gates practice while preserving learner data.

## Demo walkthrough

1. Choose **Continue learning**. Read, change vowel display, and complete the checks. Refresh to see saved progress.
2. Add a word to review, open **Review**, reveal meaning, and rate recall. In **My Hebrew**, search, bookmark, and save a personal note.
3. In **Studio**, edit a note or meaning and **Save draft**. Inspect affected lessons, then **Publish draft**. Reopen a lesson/review to see the published source. **Restore** an earlier version; progress stays.
4. Import [the synthetic CSV example](docs/examples/vocabulary-demo.csv), preview, and publish. Or export full JSON and import an edited copy. Required CSV columns: `id,pointed,unpointed,curated,english`; optional `notes,color,bold`. CSV updates matching IDs, appends new IDs, and retains words absent from the file.
5. Choose **Move vocabulary first**, publish, and reopen the lesson to see the manifest order.
6. In **Settings**, cancel test membership and verify course/review access remains. Simulate a course refund to test the gate, then a purchase to restore it. These controls never contact WordPress.
7. Export a backup, make changes, then restore. Both demo profiles and replay receipts return to the exported state.

## Validation and limits

`npm.cmd run verify` passes 15 executable checks covering grading, normalization, CSV fidelity, validation failures, publication/rollback, pinned answers, persistence, profile isolation, access, replay protection, restore, and HTTP boundaries. The [GitHub Actions run for the first runnable commit](https://github.com/guylfe/hebleo-3.0/actions/runs/37089995096) also passed. Future changes require their own validation.

Manual background browser checks confirmed dashboard rendering, recognition and Hebrew typing feedback, and Studio draft/preview/publication. This is implementation-owner verification; named QA/release reviewers have not run.

All content is **synthetic demonstration material**, not imported or approved Hebleo curriculum. Native audio/video, real WordPress SSO/verified callbacks, rich-text Sheets sync, FSRS, offline/PWA, native apps, AI tutoring, and speech scoring are not implemented. Literal sentence fixtures are authored independently; word edits do not rewrite them. Bold is shown; authored colors are retained, but the UI uses one accent color.

Demo accounts and Studio have no production authentication. The server binds only to `127.0.0.1` and rejects external hosts and cross-origin requests. Do not expose it publicly or through a tunnel. Production hosting, identity, and migration remain separate decisions; **web payments stay in WordPress**.

See [bootstrap decisions](docs/architecture/BOOTSTRAP_DECISIONS.md) and [project status](docs/PROJECT_STATUS.md). The native team was created; initial assignments failed before execution due to a shared-folder lock. Folder isolation and independent reviews remain pending.
