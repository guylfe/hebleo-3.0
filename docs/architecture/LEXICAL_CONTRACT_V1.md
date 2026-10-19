# Lexical contract v1: integration handoff

Date: 2026-10-18. Branch: `architect/oct18-lexical-contract`. Base: `d4bcadd3bc522828b06c48789213200305f8fd48`.

This delivers working pure validators/projections and a preview-only progress mapper. It does not install the workbook adapter, lesson settings, renderer, persistence or publication gates. Those remain Lead/Feature integration work. All executable fixtures are synthetic; their review records are not approvals of workbook content.

## Files and versions

| File | Contract |
| --- | --- |
| `public/lexical-contract.js` | Dependency-free ES module, usable in browser and Node |
| `public/lexical-contract.d.ts` | Exact exported types, including all 42 literal slot IDs |
| `schemas/lexical-content.v1.schema.json` | Draft-07 author-envelope structural schema |
| `schemas/lexical-slots.v1.json` | Exact source slot IDs/header order and SHA256 of the supplied schema |
| `test/lexical-contract.test.js` | Eligibility, source/identity and migration regressions |
| `schemas/checks/lexical-contract.check.mjs` | Strict Ajv schema compilation and semantic boundary checks |
| `docs/adr/ADR-B03-lexical-identity-and-unlocks.md` | Decision, authority and migration limits |

Runtime envelope: `hebleo-lexical-runtime-v1`. Source schema: `hebleo-lexical-consolidation-v3`. Progress report: `hebleo-lexical-progress-preview-v1`. These do not increment the existing store/backup schema; Lead decides and documents persistence changes when integrating.

Source read: UX workspace `vocabulary-source-structure-20261017/VOCABULARY_STRUCTURE_SCHEMA.json`, supplied with `vocabulary-lexeme-rebuild-20261018/IMPLEMENTATION_HANDOFF.md`. This implementation compared all 42 IDs directly against that file. No online workbook/source writes occurred.

## Author envelope and exact shapes

```js
{
  version: 'hebleo-lexical-runtime-v1',
  sourceSchemaVersion: 'hebleo-lexical-consolidation-v3',
  words: [], classes: [], introductions: [], unlocks: [],
  aliases: [], usages: [], examples: []
}
```

Use the declaration file as the complete field/type reference. The main records are:

| Record | Required fields and meaning |
| --- | --- |
| Word | `wordKey, category, revision, identityReview, fieldConflicts, classMemberships, forms`; category is `verb/adjective/preposition/noun/other` |
| Form | `slotId, status, variants`; status is `supplied/missing/inapplicable/unresolved`; exactly 28/4/10 inventory entries for the three paradigm categories, even when blank |
| Variant | `variantId, revision, origin, review, mappingReview, sourceRefs, representations`; independent content and slot-mapping review |
| Representation | Optional `pointed/unpointed/curated` properties, each `{text, runs?:[{startIndex,format}], format?}`; no fallback between representations |
| Review | `{status:'pending'/'rejected'/'unresolved'}` or `{status:'approved', reviewedRevision, reviewedBy, reviewedAt}` matching its owning revision |
| Class | `{classId, category, revision, review}`; word membership `{classId,review}` pins the word revision |
| Introduction | `{linkId,wordKey,action,revision,review,courseId?,lessonId?,...raw evidence}`; `action` is `introduce/reuse/legacy` |
| Unlock | `{unlockId,revision,review,courseId,lessonId,scope,slotIds}`; empty slot IDs mean no additions |
| Scope | `{kind:'all',category}`, `{kind:'word',category,wordKey}`, or `{kind:'class',category,classId}` |
| Alias | `{kind:'source'/'word'/'form',namespace,aliasId,wordKey,revision,review,slotId?}`; namespaced exact resolution; never alias by Hebrew label |
| Usage / Example | Separate `usageId` / `exampleId`, each with `wordKey`; Example may have `usageId` belonging to that same word |

`wordKey` is an identity, not a display label or source-row number. A provisional key can be retained after review; changing its spelling is not required. Existing flat `words[].id` and review cards must not be rewritten just to match it. Lead supplies an explicit mapping between identities and existing runtime IDs.

Noun/Other words have an empty new slot inventory and retain their original category data. Two held cross-category facets belong in retained review/source metadata until approved, not as additional active vocabulary objects. Unknown author metadata is retained by the schema and untouched by the module; it is never automatically a learner field.

## APIs for Lead and Feature

| Export | Input → result |
| --- | --- |
| `SLOT_IDS`, `SLOT_DEFINITIONS`, `slotsForCategory(category)` | Exact IDs and immutable grouping/number/gender/pronoun/shared/citation metadata. Shared cells are explicit, never inferred from equal strings. |
| `validateLexicalContent(content, catalogue?)` | `{ok,errors:[{path,code}]}`; validates version, identities, full inventories, source references, review metadata, UTF-16 runs, scopes, child/alias references and optional course context |
| `validateCatalogue(catalogue)` | Same validation result; rejects duplicate/unknown lesson placements |
| `isApproved(review,revision)` | Metadata consistency only; returns false for missing, stale, pending or incomplete records |
| `computeEligibility(content,catalogue,context)` | `{ok,errors,wordAvailable,wordState,slots,citation}`; full validation occurs first, with empty output on invalid/unconnected context |
| `projectVerbCitation(word,representation='pointed')` | `{separator:'-',direction:'rtl',slots:[{slotId,sourceState,variants}]}` in fixed past-he/present-ms order; use a validated word and gate its contextual availability |
| `projectLessonTitles(links,catalogue)` | `{linkId,lessonId,courseId,title,status}[]`; statuses distinguish connected/unconnected/unbound/unknown-lesson/outside-course/invalid-catalogue |
| `resolveLexicalAlias(content,{kind,namespace,aliasId})` | `{status,wordKey,slotId}`; unknown/conflict/unapproved returns null references |
| `readLessonUnlocks(settings)` | Parses a settings view `{version,additions}`; absence returns `legacy-no-additions`; unknown versions/null fail. Validate additions in the complete envelope before saving. |
| `resolveFieldOwnership({candidates,resolution?})` | `{status,value?,candidates}`; exact agreement, missing, reviewed resolution or conflict |
| `previewProgressMigration({content,mappings,progress})` | Always `{version,mode:'preview-only',canApply:false,errors,conflicts,proposals,unchanged,reverseMappings}` |

```js
const catalogue = {
  status: 'connected',
  courses: [{id: authoritativeCourseId, lessonIds: orderedLessons(snapshot).map(l => l.id)}],
  lessons: snapshot.lessons.map(({id, title}) => ({id, title}))
};
const result = computeEligibility(lexical, catalogue, {
  courseId: authoritativeCourseId, lessonId, wordKey, representation: 'curated'
});
```

Lead must supply the actual course identity and `orderedLessons` from `public/course.js` after existing course validation. Do not infer course identity or order from workbook decimal lesson references, source array order, completion state or the fullest paradigm. An unconnected author catalogue is `{status:'unconnected',courses:[],lessons:[]}` and yields no eligibility. The current workbook's title feed is still unconnected; no exploratory curriculum is selected here.

Each eligibility slot contains:

```js
{
  slotId, state, sourceState, introduced, inherited, addedHere,
  introductions: [{unlockId, lessonId, scope}],
  variants: [{variantId, text, runs?, format?}]
}
```

`state` is `word-unavailable`, `locked`, or the source state `available/missing/inapplicable/unresolved/unapproved`. `sourceState` remains separately available for Studio diagnostics. `variants` is empty unless state is `available`. Missing means the selected representation has no approved text; it may exist in another representation. An introduced but missing slot is not a locked slot. When pending and approved variants coexist, only approved variants are projected; all eligible alternatives survive without arbitrary preference.

Feature can use `inherited/addedHere` in Studio and group by `SLOT_DEFINITIONS`. Render eligible expanded forms above notes. Use `citation` separately from expanded-form eligibility. Keep citation positions when unavailable, with an explicit placeholder based on source state. Multiple approved variants remain alternatives. Hebrew direction and `lang=he`, overflow measurement, sticky cells and accessible disclosure remain renderer responsibilities. Never insert `text` as HTML or pass arbitrary formatting into styles; use the existing formatting/sanitization allowlist. Author metadata and raw source data are not a learner payload.

## Single authoring homes and compatibility

Persist the lexical envelope once per draft/release. `unlocks` is the single canonical collection of additions; lesson settings filter it by exact course and lesson IDs. A UI settings view may use `{version:LEXICAL_VERSION,additions:[...matching unlocks]}` and `readLessonUnlocks`; saving replaces only that lesson/context's additions through existing CAS. Do not independently persist a second editable `lesson.conjugationUnlocks` copy. `introductions` is the single editable home for introduce/reuse links and retained legacy occurrences. Titles are computed from the authoritative catalogue every time.

Older snapshots without the lexical envelope keep the existing flat vocabulary/letters behavior and have no new conjugation additions. Do not treat absence as full access, infer additions from available forms, or synthesize introduce bindings. A declared unknown/malformed new version must be refused during restore/stage, not treated as legacy. The module's parser returns no implied changes; Lead must enforce this in persistence and restore.

All review metadata must be created at the trusted author boundary. Changing any reviewed payload increments its immutable revision and invalidates review. The module does not calculate cryptographic digests or authenticate reviewers; enforce the existing content/dependency digest gate on the server as well. Importing a string saying `approved`, or receiving Guy's authorization to implement, is not permission to issue source approval records.

## Source fidelity and ownership

The adapter retains original cells, locators, raw audio/flags, source namespaces/snapshots, retired aliases, original form references and legacy occurrences. Preserve Usage/Example IDs independently and keep the 621 other-category source entries. The supplied handoff counts (1,058 scoped aliases, 193 retired keys, 1,172 original form references, 437 occurrences, eight Usage, 95 Examples) are reconciliation targets, not verified adapter outputs in this commit.

Source owns exact text, native rich formatting, representations and source asset references; Studio owns approved lesson bindings, scoped additions and composition. `resolveFieldOwnership` takes `candidates:[{sourceRef,value}]`. It preserves exact values and candidate provenance. Identical values return `agreed`, which establishes no approval. Distinct values return `conflict` with no effective value. An explicit resolution includes `{revision,review,candidates,value}` and must bind the exact candidate set; any changed/new source candidate makes the old resolution inapplicable. Do not select the first record's audio, convert blank flags to false, concatenate competing audio or silently OR exclusions. Missing/empty strings/false are distinct source values; source omission is not deletion. Put unresolved learner-affecting fields into `word.fieldConflicts` to hold eligibility until reviewed.

Validate rich runs against each exact representation string using JavaScript UTF-16 indices. Do not transfer runs between different spellings, strip nikkud, shift offsets after concatenation, or infer teaching colours by glyph positions. Source previews may retain unsupported metadata; rendering uses an explicit allowlist.

## Non-destructive migration boundary

Input mapping: `{legacyWordId,wordKey,revision,review}[]`. Input progress: `{learnerId,wordId,cardId,...existingState}[]`. The caller adapts the current store's card representation without altering it. The preview does not copy, combine, recalculate or return schedules. It reports existing card references and a full reverse identity map.

Multiple approved old word IDs may map to one lexical word. If a learner has multiple schedules for that destination, the report emits `multiple-schedules`, including an existing destination card. Ambiguous/unapproved mappings and collisions with another active word identity are held. A single-card proposal says to retain its card ID and schedule; it is not permission to execute a migration. No `apply` API exists, and `canApply` is always false.

Lead's future migration must back up exact old IDs/content revision/cards/history and map exercise/lesson/bookmark/review references together. Keep historical attempts pinned to their original revision. Do not create cards per form slot, delete superseded schedules, sum review history, or rewrite learner data during import/preview/stage. Content rollback must preserve subsequent learner progress. Conflict handling requires a concrete reviewed policy and restore test before any migration writes.

## Integration and acceptance remaining

Lead: integrate adapter and envelope validation into authoritative preview/stage/publish/restore, map current runtime identities, persist lesson additions with CAS, project authoritative titles, filter learner metadata, and verify Save → reload → lesson preview at exact revision. Keep current letter settings independent. Restart the demo after integration and verify the fresh fictional progress through the API per AGENTS.md.

Feature: consume the projected slots/citation and category metadata in `public/lexical-vocabulary.js` and CSS. Contract tests establish no rendered layout, overflow, sticky positioning or accessibility acceptance.

QA/UX: review the integrated exact SHA. Real source grouping (including אמר/ראה/היה), conservation counts, source content approval, browser checks and owner acceptance remain unverified here. No live/canonical workbook, production site, learner database, release or curriculum was changed.

Stable feature-ledger associations: `S01/S05/S06/S09` (typed content/source/settings projection), `R01/R04` (identity and preview-only progress boundaries), `D03/D04/D05` (compatibility, immutable revision and integration obligations). Existing user acceptance stays Pending; pure checks are not a user Pass.
