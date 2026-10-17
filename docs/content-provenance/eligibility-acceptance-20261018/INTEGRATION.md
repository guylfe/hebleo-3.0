# Lead integration checkpoint

18 October 2026. Based on application revision `d4bcadd3bc522828b06c48789213200305f8fd48`; isolated branch `lead/oct18-eligibility-acceptance`.

The five Curriculum artifacts (`README.md`, `FIXTURES.json`, `build.cjs`, `validate.cjs`, `VALIDATION.json`) are imported unchanged. The fixture SHA-256 is `1601f231797714021a9ee11f812d461b415599c74094a3284050509b57520957`. There are 34 cases, seven inventories, 69 supplied/document bindings and 42 semantic slots. All review/context overlays remain explicitly test-only. Nothing in this checkpoint is an adopted course setting, linguistic approval or runtime content import.

## Executed evidence

From the repository root:

```powershell
node scripts/verify-eligibility-pack.mjs docs/content-provenance/eligibility-acceptance-20261018/LEAD_REPRODUCTION.json
node --check scripts/verify-eligibility-pack.mjs
git diff --check
```

All passed. The reproduction command checks the pinned fixture hash and all six original input hashes, copies the scripts and four inventory files to a newly created temporary directory, executes Curriculum's validator (2,075 assertions), rebuilds the fixture, compares it with the supplied fixture, and validates the rebuild. Only relocated `sourceInputs[].path` values are normalized for that comparison. All bindings, strings, spans, source locators, expectations and approval fields must match. The imported fixture stays unchanged. See `LEAD_REPRODUCTION.json`.

The source reproduction scripts depend on the explicitly supplied local UX/Curriculum handoff paths. They are deliberately outside `npm test`; a clean remote checkout without those source artifacts cannot reproduce extraction. The checked-in fixture itself is self-contained input for application regression tests. No application dependency install, runtime test or browser check is claimed at this checkpoint.

## Mapping to the sole Architect implementation

The production contract is owned by `architect/oct18-lexical-contract` in the existing `hebleo-3/architect-lexical-20261018` checkout. Its completed API has not been delivered to this thread at this checkpoint. The fixture transport must be adapted to that contract; it must not become another production eligibility implementation. The following are assertions to map, not a claim that runtime mapping is complete.

| Cases | Actual contract behavior that must be asserted |
| --- | --- |
| V00–V03 | Independent citation versus expanded mask; exact binding candidates; partial/all-28 masks with only six supplied eligible slots; one explicitly shared past-they cell. |
| V04–V05, V09 | Secondary evidence retains provenance and every candidate; unreviewed evidence stays ineligible; equal future strings keep distinct gates. |
| V06–V08 | Distinct inapplicable, missing and unapproved states; fixed citation pair positions; no replacement, generated representation or answer key. |
| A01–A03 | One lexical identity across 1/2/4 eligible adjective slots. |
| P01–P04 | 1/7/10 masks; seven remains horizontal; all-ten alternative depends on effective mask and width; bindings 00936/00937 require explicit mapping review. |
| H-000132, H-000317 | Held identities remain outside active lexical/review rows, despite simulated binding review and unlock additions. |
| S01–S07 | Word/all-category/reviewed-class scopes; reject unknown class and target-category mismatch; no inference from Root/Pattern, source presence or pending settings. |
| T01–T08 | Authoritative course prefix; additive inheritance; introduce differs from reuse/legacy evidence; no earlier/course leakage; reorder recomputes; unknown context fails. |

Preserve both source eligibility and unlock dimensions in the test projection, even when the UI chooses one primary message. Keep exact binding IDs plus inventory hashes and source locators. Do not coalesce slot identities because text is equal. The missing/unapproved source checks apply independently of whether a slot was introduced.

Resolver assertions cannot establish layout, Studio persistence, publish behavior, migration or owner acceptance. The eight `manualAcceptance` items remain separate: seven/ten layout, shared cell, citation, forms above notes, Studio roundtrip, title projection and migration. These require the integrated application and an exact implementation SHA. No live service, source workbook, local learner database, prior checkout or canonical curriculum was changed by this checkpoint.
