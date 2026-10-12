# Masterfile immutable-ID importer checkpoint, 2026-10-12

Implemented on `lead/masterfile-id`, based on `77f5cd91edbf71321b80bb740e117844407134eb`. This is a separate backend/Studio patch for integration. It has not been activated on 63357, merged into main, or used to register/import live vocabulary.

## Source evidence and blocking filter range

The Curriculum Designer reported Guy-authorized AE IDs for all 1,058 populated Masterfile rows, including the four rows lacking Hebrew. That report is external source-change evidence. This engineering turn independently read the current native Sheet metadata and A1:AE1 CellData, then requested only filter/filter-view/table range metadata. It did not repeat the full ID or A:AD preservation audit.

The independent reads confirm:

- Spreadsheet `1d9b3mFnRhubmdq7gJ5VMJBA9dyhwS6GSI6V95M0xSVc`, numeric tab `1022865870`, title `Masterfile`, grid 1059 × 31.
- AE1 is exactly the plain-text header `ID`; its note describes immutable `mf-NNNNNN` allocation.
- The 31-header canonical digest is `4c1458511cba79737e668c3f2b02a5dcadea5dc4267876e0af6c4c0fcd1b7014`.
- The existing basic filter is **A1:AD1059** (`endColumnIndex: 30`), excluding AE. No filter views or tables were returned by the scoped metadata request.

**Before sorting or registration, the source owner must extend the existing filter to A1:AE1059 without sorting, then re-read its metadata.** Sorting the current filter can move content independently of its IDs. This patch rejects that configuration as `SOURCE_ID_SORT_RANGE`; it does not edit the Sheet or infer whether earlier sorting already separated an ID from its item.

Evidence: [header-and-filter.json](../evidence/masterfile-id/header-and-filter.json). Missing Vocab remains outside this source contract.

## Implemented identity behavior

The registration template now reads A:AE. Registration for the exact Masterfile file/tab rejects an A:AD extent or missing AE `ID`, preventing silent identity loss. Generic sources can explicitly map a plain-text ID column; sources without an ID header/mapping retain the existing opaque-ID/manual-matching behavior.

In Studio, map `ID` → `id`, owner **Source**, with **Permit authored blank** disabled. A canonical import with an `ID` header must map that exact column. `id` is identity metadata, never a mutable vocabulary field or field-conflict resolution. ID-only/source-form inspection does not create canonical vocabulary.

- Every populated row requires a plain-text string ID. Blank, numeric, formula, unsafe and duplicate IDs block Stage, including duplicates explicitly marked Ignore. The exact Masterfile additionally requires `^mf-[0-9]{6}$`.
- New IDs require explicit create/reuse/ignore review. Creation uses the source ID for both entry and new canonical word identity; it still requires exact human-authored full, unpointed, curated and English forms. No linguistic content is generated.
- A first explicit reuse keeps the selected existing canonical word ID. The separate immutable `sourceRowId` is retained in confirmed identity metadata.
- Subsequent moves/content edits match confirmed `sourceRowId`, independently of row number and cell fingerprint. Three-way field conflicts, exact Lesson+Part membership and source ownership still apply.
- A changed or removed ID requires separate new-row and missing-row review. It cannot rename/rebind the previous entry/object pair. A previously detached/tombstoned ID found in retained source-bundle history cannot be recycled into new vocabulary; use a never-used ID or deliberate historical source rollback.
- Rows without Hebrew remain in raw review. An explicitly mapped blank source form produces `SOURCE_FORM_MISSING`; canonical creation still requires human-authored forms or an explicit Ignore decision.
- Basic filters, filter views and native tables are checked for ID-column coverage. Sort-range metadata participates in capture hashes and freshness checks. Older generic captures without this optional metadata retain their original hash validation, but a fresh transport capture uses the new metadata and may require re-review.
- Confirmed source IDs are validated against frozen captured plain-text cells during startup/restore. Source IDs cannot be forged by recomputing an identity digest. Existing SQLite schema version remains 7; there is no database migration or re-keying of existing canonical/learner records. Prior consultation found no registered/staged Masterfile source, so there is no confirmed pre-ID Masterfile mapping to migrate. A pre-ID Masterfile registration/packet must be replaced with the current AE contract before use.

Changing a review action replaces action-specific identity data, preventing a stale Reuse selection from contaminating a later Create decision.

## Actual verification

All data, forms, transport responses and databases in the executable checks are labeled synthetic/disposable. These checks provide owner automated evidence, not live import, browser acceptance, independent QA/Release review or Guy acceptance.

Commands run from the isolated checkout:

```powershell
node --test test/source-id.test.js test/google-source.test.js test/sources-editor.test.js
node --test --test-name-pattern="AC01|AC18|AC04/05|AC07|AC11/12|AC13|AC14/16|AC17|AC25|raw source-only|first binding|baseline and confirmed row|source-only inspection" test/source-authoring.test.js
node --test --test-name-pattern="QA-SRC-01|RR-SRC-03" test/source-corrections.test.js
git diff --check
```

Results: **51 + 14 + 4 = 69 passed, zero failures**. Nine changed JavaScript files also passed individual `node --check` commands. Logs are in `verification/source-checks.txt`, `legacy-source-checks.txt`, `ownership-checks.txt` and `syntax-checks.json`.

Checks cover AE requests, mandatory/nonblank/source-owned identity mapping, moves/edits, zero-write repeat refresh, duplicate content with distinct IDs, malformed/formula IDs, missing/changed/retired IDs, explicit reuse and learner note/card retention, raw-only inspection, registration/filter blockers, pending-draft backup/tamper rejection, legacy matching and cross-source field/component ownership. The Studio checks use jsdom/callback DTOs; native browser behavior was not exercised.

Dependencies for these focused checks were copied into this isolated checkout from the lead's installed modules. Their required runtime/test versions were checked against the lockfile. This was not a clean install: the unrelated EasyMDE dependency branch is absent here. Package/lock files were not changed; no app was started from this checkout. An initial timed combined test process was interrupted before finishing; the final complete run above exited 0 and supersedes it.

## Integration and source handoff

1. Integrate this commit into the current lead backend/Studio candidate, preserving the separate Oct12 UX work. Review changed files and resolve normal source-editor/doc conflicts there. Do not cherry-pick into or copy over Chief's active checkout without coordinated ownership.
2. Keep 63357's Google auth/config, database, learner state and the 4173/4174 services intact. This patch changes backend logic, so a static-asset-only overlay cannot activate it. Activation needs a coordinated backend restart that explicitly disables the demo fresh-progress reset, or integration into the next planned runtime build with an agreed learner-state policy.
3. Have the source owner correct the filter range and verify it includes AE. Registration remains blocked until that is done. This turn grants no source-write authorization to another bot.
4. Prepare the remaining explicit forms, reuse/ignore choices, ownership/blank policy, media references and exact Lesson+Part bindings before any live draft import. The source handoff identifies Hebrew-missing rows 648/mf-000647, 791/mf-000790, 817/mf-000816 and 879/mf-000878 for human review; no source content has been invented or omitted.
5. When authorized for actual source acquisition, refresh and inspect complete raw cells. Confirm row identity and warnings before Stage; approval and Publish remain separate human actions.

No live Sheet edits, app source registration, canonical staging/approval/publication, running-service restart, database reset or learner-record modification occurred in this turn. Prior acceptance statuses and frozen integrity evidence remain separate from this patch.
