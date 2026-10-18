# Scoped vocabulary eligibility acceptance pack

Date: 18 October 2026. Owner: Curriculum Designer. Recipient: Lead Engineer through UX Owner's authorized implementation handoff.

This is a bounded source/data and requirements review, with executable fixture-integrity checks. It is not application QA, linguistic approval, a curriculum progression, or a publishable content pack. No production code, workbook, lesson settings or learner records were changed.

## Deliverables

- `FIXTURES.json`: 34 declarative acceptance cases; seven source-grounded word inventories; 69 exact supplied bindings, including separately identified secondary document evidence; lossless inventory-to-schema mapping for all 42 semantic slots; eight manual acceptance checks.
- `build.cjs`: reproducible extraction from the supplied inventory and UX handoff. It writes only this directory's fixture file.
- `validate.cjs` and `VALIDATION.json`: verify source hashes, exact strings/spans, distinct semantic slots, workbook-held identities, visible-form source coverage and fixture integrity. They do not call the application eligibility resolver.

The fixture schema is an acceptance transport, not a competing production API. Adapt `inputs` to Architect's integrated contract and assert `expected` against the actual resolver, then test Studio Save/reload and rendered tables. Do not ship the fixture overlays.

## Evidence and methodology

The current UX handoff and `VOCABULARY_STRUCTURE_SCHEMA.json` supply the requirements. The workbook plan supplies row/cell locations and held identities. `lexeme-consolidation-20261018/SUPPLIED_BINDINGS.json`, `LEXEME_GROUPS.json`, `SOURCE_SNAPSHOT.json` and the separate draft inventory supply exact evidence. Every extracted binding retains its original fields, exact value, mapping status and provenance tier. Masterfile locators are derived from the preserved source header and row, with UTF-16 spans retained. Each fixture slot also identifies its consolidated workbook cell where applicable.

The validator compares all four consumed local inventory files to UX's explicitly supplied `linguistic-handoff` copies by SHA-256. The fixture records hashes of every input. Binding IDs are local to these versioned inventories; retain their file hash and group/slot/source locator when consuming them.

No canonical review status was inferred. Positive cases use explicitly `TEST-ONLY` identity, setting and binding review overlays to exercise gates after a hypothetical review. These overlays approve nothing outside a disposable test. The original source strings are unchanged, including questionable pointing and alternatives. Real unapproved linguistic additions remain ineligible in every case. No pointed, curated, unpointed or audio representation was generated.

All course IDs, lesson IDs, titles, class membership and order are synthetic test contexts. The intentionally nonlexical order is L-z → L-a → L-m → L-b; sorting lesson IDs would fail the order cases. The seven-slot preposition subset is a test input rather than a recommended milestone. The authoritative lesson catalogue remains unconnected in the supplied handoff.

## Acceptance matrix

| Cases | Required result |
|---|---|
| V00–V03 | Citation with zero expanded unlocks; early one-slot and partial stages; all 28 verb slots unlocked while only six supplied slots are visible for אמר. Past they is one explicitly shared gender cell. |
| V04–V05 | כתב's full tense-layer test has 24 source/document-backed slots after hypothetical review; three imperative drafts stay unapproved and one imperative stays missing. No review means no eligible secondary forms. |
| V06–V08 | היה has an explicitly inapplicable present citation and missing verbal noun; missing citation mutation keeps its position; an unapproved infinitive draft never becomes a display form or answer key. |
| V09 | Equal secondary-export future strings for אתם/אתן retain independent slot gates; equality alone does not authorize shared-cell metadata. |
| A01–A03 | נמוך has one, two and four eligible adjective forms on one lexical row. |
| P01–P04 | ל has early, seven and ten stages. Seven always stays horizontal. The ten-form positive test explicitly simulates review of proposed gender mapping; without that review, two slots remain unresolved. |
| H-000132 / H-000317 | Both held adjective facets remain outside active rows even if forms and slot additions exist. No duplicate review identity is created. |
| S01–S07 | One word, category-limited global and reviewed class scope; outsiders excluded; unknown class and cross-category scope rejected; global additions never introduce a word; pending setting review is ineffective. |
| T01–T08 | Additive inheritance; reuse never substitutes for introduction; empty additions never revoke; no earlier-lesson or cross-course leakage; authoritative reorder recomputes; six legacy associations do not introduce a word; unknown context fails explicitly; an earlier global addition applies after a later explicit word introduction. |

For citation V00 the exact supplied strings are `אָמַר` (`binding-00110`, Masterfile!G274, mf-000273, span 0:5) and `אוֹמֵר` (`binding-00114`, Masterfile!G278, mf-000277, span 0:6). The JSON is authoritative for all strings and spans; these examples preserve source spelling. The ordinary heading uses the neutral past–present pair and hyphen. Its exception bypasses expanded-slot gating only, while still requiring a contextually available word, resolved identity and eligible source binding. It never licenses generated Hebrew or an unapproved substitute.

## Findings and limits

**Preserve:** the requirements' separation of word availability, accumulated scoped slot introduction, source existence and approval. It implements Guy's connection-to-established-knowledge principle without treating a full source inventory as already learned. Keep original lesson associations as evidence until introduce/reuse mappings are reviewed. Preserve one lexical/review identity and reversible source aliases.

**Improve:** use the cases as direct regression inputs against the integrated resolver, then verify Studio persistence and UI. Display inherited versus new additions. Treat locked, source-missing, unapproved, unresolved, held and inapplicable as distinguishable states; the data contract should retain both source and unlock dimensions even when the UI selects one primary message. Seven-form layout must use the effective unlocked mask, not populated source-column count. A missing/unapproved form must not become visible merely to fill that layout.

**Reconsider before canonical content adoption:** two concrete evidence boundaries need explicit review rather than fallback logic:

1. For ל, `binding-00936` is source column הם at Masterfile!AB990 with `לָהֵן`, proposed as `preposition.הן`; `binding-00937` is source column הן at Masterfile!AC990 with `לָהֶם`, proposed as `preposition.הם`. This pack preserves both original columns and proposed mappings. A source column is not proof of the grammatical slot; a proposed correction is not approved content. The positive full-ten case uses test-only review; P04 keeps both unresolved otherwise.
2. כתב future forms are secondary document-export evidence, not reopened original documents. `document-binding-0022` and `document-binding-0023` preserve equal supplied strings for two distinct slots. Neither a global register decision nor shared-future-cell metadata follows from this. Missing feminine-plural slots elsewhere remain missing.

These are concrete data hazards, not observed application defects: this task did not inspect an integrated implementation. The supplied requirements have no demonstrated internal rule defect within this review. Root/Pattern text must never become a reviewed class ID automatically. The two identity holds, conflicting audio/exclusion ownership, reviewed form mappings, citation candidate selection when variants conflict, authoritative lesson feed, old-settings compatibility and reversible progress migration remain explicit integration/content boundaries. Do not select arbitrary first candidates or silently enable old settings.

Full 28-slot unlock coverage does not claim a complete 28-form approved Hebrew paradigm. V03 exercises all slot controls with honest source limits; V04 exercises future forms only under a simulated secondary-binding review. Native register, pointing, sense and linguistic judgment remain with Guy/human review. This pack does not approve the 1,770 drafts or any canonical schedule.

## Checks and handoff

Commands actually run from the repository root:

```powershell
node docs/content-provenance/eligibility-acceptance-20261018/build.cjs
node docs/content-provenance/eligibility-acceptance-20261018/validate.cjs
```

See `VALIDATION.json` for the executed result and fixture hash. PASS means fixture/source integrity only. Application resolver tests, Studio roundtrip, migrations, native rendering, learner preview and Guy acceptance remain unverified. The workbook's independent data audit is not runtime evidence.

Files added only under `docs/content-provenance/eligibility-acceptance-20261018/`, within Curriculum Designer ownership. The existing dirty shared branch `local/demo-reviewed-e73-20261008` and other agents' changes were preserved. No commit/push or shared feature-ledger edit was made from that checkout. Lead should integrate these artifacts with the actual implementation checkpoint and record its branch/SHA, tests and bounded status in the existing ledger.

Next handoff: Lead maps cases into Architect's contract and runs actual resolver/persistence/UI checks. UX Owner independently checks final interaction and consistency. Neither this fixture PASS nor the earlier 44 workbook data checks establishes application behavior or native linguistic acceptance.
