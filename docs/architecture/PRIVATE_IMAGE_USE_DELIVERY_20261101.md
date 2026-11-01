# Private image use correction — 1 November 2026

Implemented candidate for NC-01 on isolated `fix/classic-private-image-use-20261101`, based on `ece6c085bd987a5c3fcb7899da68476c89eefb87`. No main merge, original/live database write, installation, browser run, actual user-image import/approval, remote acquisition or production change.

Repository: `C:/Users/Trans/.openmausbot/task-workspaces/8c900356-50f6-4d41-bbb9-50c8abe09233/4d4e36bc-67d1-4c07-bcfb-e381d246b0b3/hebleo-classic-media`.

## Delivered behavior

- Imported local images stay canonically pending and become reachable through an explicit, separately named private-use approval. Immutable import revision and receipt are unchanged.
- Narrow Author-only API with exact pin/type/size/checksum/CAS checks, server actor/time, idempotent operation receipt, bounded audit and transactional failure.
- Chooser review with local preview/provenance/checksum → explicit private approval → select exact revision → required alt → fresh server verification → insertion. Source changes only through the editor's existing explicit Save.
- Status/reopen/export/restore preserve approval records. Old backups retain newer local records; malformed or conflicting audits reject atomically. Media recovery format 2 protects approval-bearing packages from older readers; old packages without the overlay remain format 1.
- Human/source canonical publication and exact source-bundle approval guards remain unchanged. Tests exercise both refusal and the separately approved synthetic source-bundle path.

Contract and trust boundary: [ADR-B06](../adr/ADR-B06-private-image-use.md).

## Files and integration ownership

Runtime: `src/media-store.js`, `src/server.js` (one new route and its 4096-byte body limit), `public/author/image-chooser.js`.

New tests/support: `test/private-image-use.test.js`, `test/private-image-chooser.test.js`, `test-support/private-image-fixture.js`.

**Shared test integration detail:** `test/classic-editor.test.js` changes only its old image-chooser test and adds one helper import. That prior test invented `approval.status=approved`; the replacement imports a real synthetic PNG through HTTP, approves privately, inserts in actual bundled Jodit under JSDOM, then verifies explicit Save, selected synthetic publication, recovery, reader rendering and editor reopening. Preserve this replacement if Feature's formatting tests require a merge. No Feature-owned runtime, CSS, adapter, DESIGN or UX contract file was edited.

Documents/evidence: this delivery; ADR-B06; `docs/evidence/private-image-use-20261101/check.txt`, `tests.txt`, `manifest.json`.

## Commands and actual evidence

1. Read `AGENTS.md`, `docs/INITIAL_BUILD_BRIEF.md`, relevant product-source sections, full correction contract and UX report; inspected actual importer/validator/server/chooser/publication/recovery code.
2. `npm.cmd ci --offline --ignore-scripts --no-audit --no-fund` — installed 77 locked packages in the isolated worktree. Initial tests before this failed only because this new worktree lacked jsdom. No package or lockfile change.
3. `npm.cmd run check` — pass; final output in `check.txt`.
4. Final focused suite — **148 passed, 0 failed, 0 skipped** (result in `tests.txt`):

```text
node --test --test-reporter=tap test/private-image-use.test.js test/private-image-chooser.test.js test/classic-editor.test.js test/media-recovery.test.js test/media-integrity.test.js test/media-library.test.js test/media-alias-export.test.js test/author-recovery.test.js test/restore-integrity.test.js test/source-authoring.test.js test/lesson-publication.test.js
```

Coverage includes real HTTP actor denial/strict request/body bounds/origin, forged authority fields, every exact pin field, CAS/history growth, same-operation concurrency and no-write replay, missing/corrupt bytes, audit bound, old/new/repeated recovery, file reopen/startup rejection, malformed/missing/forged/mismatched audits, deterministic conflict refusal, rollback on disk failure, unchanged pending import receipts including historical inert extensions, bytes/aliases/unrelated state, canonical and selected-publication guards. Chooser checks cover actual server DTOs, alt validation, lost-response retry, cancellation/late replies, stale history, pre-insert integrity failure, malicious DTO rejection, preview error, bounded paging and no automatic Save.

The earlier focused chooser run exposed hidden-form busy state after disposal; corrected and rerun successfully. PNG audit also caught and corrected the initial fixture's IDAT CRC; the final suite verifies all CRCs and decodes its 1x1 scanline. No failed initial fixture is shipped.

5. `git diff --check` — pass. Exact commit/push/remote verification supplied in the handoff; manifest hashes identify the tested source and logs.

## Limits and next handoff

This is source/API/JSDOM evidence, not native visual acceptance. The production renderer/adapter was not changed here. No full repository suite, combined Feature gates, native browser decoding/selection/caret/accessibility/performance, independent UX/QA/Release review, original-data backup rehearsal or installation is claimed. All transient HTTP servers and synthetic stores are closed by test cleanup; no review server is left running. No related automations existed at completion check.

Lead: integrate this branch with Feature's correction branch, preserve the specific chooser test replacement, run combined gates, then obtain independent native UX/QA/Release checks using a freshly prepared disposable dataset and a clearly synthetic imported image. Only after those pass, perform the fresh original backup/rehearsal/code-only installation. Keep frozen installed `3e01c79` and live 63358 unchanged until then. Shared feature ledger remains Lead-owned as assigned.
