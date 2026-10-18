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

The source reproduction scripts depend on the explicitly supplied local UX/Curriculum handoff paths. They are deliberately outside `npm test`; a clean remote checkout without those source artifacts cannot reproduce extraction. The checked-in fixture itself is self-contained input for application regression tests. No application dependency install, full-app runtime or browser check is claimed at this checkpoint. The subsequent pure-resolver execution is recorded below.

## Mapping to the sole Architect implementation

The production contract is owned by `architect/oct18-lexical-contract` in the existing `hebleo-3/architect-lexical-20261018` checkout. Architect's consultation supplied a provisional API, verified by reading the actual module. Lead adapted all 34 cases to its `computeEligibility(content, catalogue, context)` export without copying or editing production code. The completed Architect commit has not been delivered to this thread. This is a provisional module-hash checkpoint, not acceptance of a committed integrated application.

| Cases | Resolver behavior covered; UI/persistence obligations remain separate |
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

## Provisional resolver execution

Actual module: `public/lexical-contract.js` in Architect's checkout; SHA-256 `52e48f82c6819b717062f41f431843e20ee0289bb57a37382d374fa00756abf7`. It was uncommitted, based on `d4bcadd3bc522828b06c48789213200305f8fd48`. Runtime versions exercised are `hebleo-lexical-runtime-v1` / `hebleo-lexical-consolidation-v3`. No database migration was applied.

Commands actually executed from this branch's root:

```powershell
$contract = 'C:\Users\Trans\.openmausbot\task-workspaces\71c71389-5334-4e0c-9ca8-d80dd28223d1\653fb433-7485-48b1-9f7c-cb22711bda02\hebleo-3\architect-lexical-20261018\public\lexical-contract.js'
node scripts/verify-eligibility-contract.mjs --contract $contract --report docs/content-provenance/eligibility-acceptance-20261018/PROVISIONAL_RESOLVER_RESULTS.json
node --check scripts/eligibility-fixture-adapter.mjs
node --check scripts/verify-eligibility-contract.mjs
git diff --check
```

Result: 34/34 resolver cases PASS, 3,962 assertions (including repeated evidence-conservation checks, not 3,962 distinct application scenarios). Four deliberately corrupted output controls were rejected: source-presence unlocking, cross-course leakage, reversed citation order and an unapproved form becoming eligible. The two initial executions exposed test-adapter mapping mistakes (the unscoped preposition base and pending citation status); the adapter was corrected, with the supplied fixture and production module unchanged. No application defect was asserted from those adapter failures. `PROVISIONAL_RESOLVER_RESULTS.json` records each case, pending integration expectations, exact module hash and scope.

The command hashes and imports one in-memory snapshot of the actual self-contained module, preventing concurrent file edits from changing the code being tested. The test adapter uses fixture inputs only; it does not read expected outcomes to construct content. No simulated approval or synthetic course context is loaded into the app. After Architect's completed commit is integrated, rerun against the integrated `public/lexical-contract.js` (the default path when `--contract` is omitted), recording its actual commit and hash. This command is separate from default `npm test` while the contract is absent from this fixture-only branch.

| Fixture transport | Provisional production contract |
| --- | --- |
| `contextCatalogue` / `testOnlyCourseOrder` | Synthetic connected catalogue with preserved array order; original real feed remains unconnected. |
| `wordLinks`, scoped `slotIntroductions` | Revision-bound `introductions`, `unlocks`; introduce/reuse/legacy and all/word/class stay distinct. |
| `simulatedReview`, per-word overlays | Explicit TEST-ONLY issuer/date/revision review objects; binding and mapping approvals are independent gates. |
| `semanticSlot`, supplied binding / draft | Full `forms[].slotId` inventory; separate exact source variants and pending generated unpointed draft variants. No absent representation is produced. |
| Source hash, locator, span, tier, original formatting evidence | Complete unchanged binding in a test provenance index, including unapproved/held evidence; opaque `sourceRefs` are not treated as hash verification. |
| `visibleSlots`, source-state expectations | Exact slot set with `state === 'available'`; `sourceState` separately asserted when locked or word-unavailable. |
| Accumulated additions | `introduced`, `inherited`, `addedHere` and course-aware validation; empty additions do not revoke. |
| Citation | Course-aware `computeEligibility().citation`; fixed past/present positions and exact candidates. |

Concrete mapping boundaries:

- Proposed linguistic slot mappings without a simulated mapping review become explicit `status:'unresolved'` forms while retaining candidates. This covers P04 and V05. Pending mapping review alone would yield the API's `unapproved` state; the adapter does not relabel that output.
- `preposition.base` and its three bindings have no semantic unlock ID. They are retained as author evidence, not an invented eleventh slot. Rendering that bare form remains an integration concern.
- Held identities retain their explicit hold in author metadata; resolver suppression is verified through `wordAvailable:false` / `wordState:'unapproved'`. The API has no dedicated held enum, and review-card identity is not tested here.
- The API supplies a neutral `'-'` token; expected presentation spacing is kept as a pending rendering assertion. Missing/inapplicable citations never select a substitute.
- Past-they metadata and a single logical slot are verified; actual merged DOM cells are not. Equal future strings keep independent IDs and gates.
- The exact candidate binding, source tier, source spans, workbook cell and all source-input hashes remain in the provenance index. No arbitrary preferred candidate, source-column correction, spelling transformation, formatting interpretation or native linguistic approval is inferred.

Completed handoff: integrate the test scripts and unchanged fixture pack with the sole Architect/Feature implementation, rerun at its completed SHA, and exercise the separately listed Studio/publish/migration/UI obligations. This branch contains test tooling and evidence only; it does not implement a second resolver or update the user's running demo.
