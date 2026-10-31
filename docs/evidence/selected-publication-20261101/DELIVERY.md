# Selected publication backend delivery

1 November 2026. Local implementation candidate on `architect/selected-lesson-publication-20261101`, based on `4433f2e0e8bcd319edd3189ba9016f8d9fa7ff12`. Exact delivery SHA is the commit containing this record (reported in the handoff). No live publication, installation, main change, WordPress action or canonical teaching edit.

Checkout:
`C:\Users\Trans\.openmausbot\task-workspaces\71c71389-5334-4e0c-9ca8-d80dd28223d1\653fb433-7485-48b1-9f7c-cb22711bda02\hebleo-3\architect-selected-publication`

## Implemented files

- `src/lesson-publication.js`: bounded dependency planner, strict request scope, deterministic review digest, structural remaining-work summary and byte-preserving base-token replacement.
- `src/store.js`: transactional review and commit, eligibility and CAS recomputation, exact full-draft rebase, coherent workspace result. Existing whole-workspace publish, rollback and preview behavior remains unchanged.
- `src/server.js`: two author-only endpoints, `/api/studio/publish-lesson/review` and `/api/studio/publish-lesson`.
- `test/lesson-publication.test.js`: 21 focused file-backed/HTTP regression tests.
- `scripts/verify-selected-publication-copy.mjs` and `scripts/verify-selected-recovery-copy.mjs`: bounded current-size disposable checks; no human content/private notes are emitted.
- `docs/architecture/selected-lesson-publication.md`, ADR B05 and the S03 feature ledger entry: scope, API, adoption, decisions and limitations.

No `public/` file is edited. There is no database schema/reader migration.

## Commands and results

| Command actually run | Result |
|---|---|
| `npm.cmd ci --offline --ignore-scripts --no-audit --no-fund --logs-max=0` in root and `schemas` | Both passed using local cache. Initial broad checks before these installs failed on absent local packages/assets; those setup failures are resolved. |
| `node --test test/lesson-publication.test.js` | 21 passed. |
| `npm.cmd run verify:candidate` | Syntax gate and 984 configured candidate tests passed. The repository's existing audio-file/name exclusions apply; this is not an unfiltered full-suite claim. |
| `node --test schemas/checks/*.check.mjs` | 27 passed. |
| `node schemas/tools/runtime-check.mjs --runtime .` | Nine existing runtime/HTTP scenarios passed. The script labels the current committed base while testing the modified working tree; this does not imply those endpoints already existed in the base commit. |
| `node --check` for the new planner and both new verifier scripts; `git diff --check` | Passed. |
| `node scripts/verify-selected-publication-copy.mjs <named-current-db> MEMORY-A2` | Current-size eligibility and disposable publication/preservation passed, twice. Read-only SQLite connection performs `VACUUM INTO`; Store only opens the new copy. |
| `node scripts/verify-selected-recovery-copy.mjs tmp/selected-publication-copy-p7UPoh/disposable.sqlite` | Four full-size HTTP restores across two original/exported-backup cycles; exact state and stable size. Three malformed restores rejected atomically. |

Focused tests cover full 23-lesson synthetic D preservation (all 22 other objects exact), unknown metadata and raw draft whitespace/escaping, unchanged `stagedAt`, shared exercise/word effects, exercise binding closure, simultaneous tag add/remove/exclusion and new IDs, changed cross-lesson membership, derived-index blockers, prerequisite/new-lesson/lexical/source/text/media boundaries, unknown/duplicate/tampered scopes, stale base/draft, no-op zero writes, changed external media bytes, transaction source guard, and failures after media/revision/active/rebase. All-table comparisons include `sqlite_sequence`; reopening disk verifies rollback durability. Later saves, stale tabs, old/new immutable private contexts, learner pins, dropped-response retries, author permissions and private-note exclusion from learner bootstrap are exercised.

## Current-size copy results

Source opened read-only:
`C:\Users\Trans\.openmausbot\task-workspaces\8c900356-50f6-4d41-bbb9-50c8abe09233\b1d5e7a0-1d13-4e9e-b544-06d3b889fb9e\hebleo-consolidated\data\lexical-private-demo.sqlite`

- Published base: 6; three published lessons. Saved draft: 23 lessons, **26,632,089 UTF-8 JSON bytes**.
- MEMORY-A2 review: eligible, no required reusable dependencies; affected published lesson is MEMORY-A2 alone.
- Disposable commit: revision 7; original full D hash/raw JSON content/save timestamp retained. Both other published lesson objects, historical snapshot, learner/event/settings/private namespaces remain exact. Duplicate original request cannot append again.
- The actual draft has **20 remaining lesson differences** after this selected change. All other 22 saved lesson objects remain; the difference count is not a preservation count.
- Latest observed backend review/commit times were **7,174 / 8,906 ms** while other checks ran. These are deliberate-boundary backend measurements, not native input latency or a benchmark of the integrated editor. Response includes the full remaining workspace once; no new operation runs on keystrokes.
- Recovery export: **93,309,447 bytes**, unchanged across two cycles (each restores original backup and a fresh export). Seven historical revision rows remain stable. Rebased draft and learner rows remain exact.
- This captured current DB had zero historical private comments/contexts. The recovery probe added one explicitly synthetic post-publication context only on its disposable copy. Old/new private contexts are separately covered by the synthetic 23-lesson disk/HTTP test; no claim of historical contexts existing in this current copy is made.
- Corrupt immutable-context hash, missing media and stale draft base each reject with every table and sequence unchanged.

Aggregate receipts are `current-size.json` and `recovery.json`. Disposable databases, backup bodies, media, test notes and ignored logs remain under this checkout's `tmp/` or ignored log paths and are **not committed**.

## Concrete next owner

Lead integrates this branch with Feature's editor changes and adopts the [exact API/workspace contract](../../architecture/selected-lesson-publication.md). On success the owner must adopt **returned remaining D and R1/T1**, preserve later input by three-way merge, retain unsent comments/caret/context and never clear the workspace. Lost responses require reconciliation; original-pin retries safely conflict. Scope changes require another review.

Independent Release Reviewer, QA and UX have not reviewed this implementation in this task. Browser confirmation, late editor input/IME behavior, frontend integration, local installation and Guy acceptance remain unverified. No automation was created; this bot's automation list was empty at handoff preparation.
