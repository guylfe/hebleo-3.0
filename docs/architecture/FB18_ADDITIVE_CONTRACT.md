# FB18 additive authoring contract — proposal for Lead integration

Status: IMPLEMENTABLE CONSULTATION, not implemented, independently tested, deployed, or accepted by Guy. Author: Hebleo Architect, 2026-10-08.

Inspected candidate: C:\Users\Trans\.openmausbot\workspaces\8c900356-50f6-4d41-bbb9-50c8abe09233\feedback18-candidate
HEAD: 8a268176f8d4a4ec700b7971945c501709df5a4a; clean at inspection.
Only this Architect-owned artifact directory was written. No Store instance, database, server, browser, protected demo, source edit, commit or push was used. Lead owns integration; Feature consumes the shared model.

## Decision and evidence

Extend schemaVersion:1 with optional versioned curriculum metadata and compositionVersion:2 on edited lessons. Keep existing words, lessons and exercises canonical, referenced by stable IDs. Use pure shared projections for old content. Do not rewrite revision snapshots, automatically save an editor projection, or infer linguistic content.

This follows MASTER_SPEC sections 17–19, 21–31 and 51: explicit publishing, faithful forms/formatting, source + selector + renderer + options, stable IDs, and preserved progress. Guy's FB10 overrides the old configurable vowel requirement for future answers. FB07/18 require extending the existing slice; the current three-block manifest and free-text chapter are not completed implementations.

Actual baseline constraints:

| Location at inspected HEAD | Finding / implication |
| --- | --- |
| src/store.js:96–118; content-pack.v1.schema.json:162–218 | Exactly three different block families, mandatory chapter string and letters. Must branch validation for legacy and v2, not merely change Studio. |
| public/content.js:2–6 | Every explanation resolves lesson.explanation; only lesson selectors resolve. Repeated text needs per-instance data. |
| public/ux.js:3–12; app.js:118–125 | Portion identity is learn/check/vocabulary/apply. Repeated types collide. Add component identity to navigation and saved position. |
| public/ux.js:21–30; store.js:330–359 | Next lesson and taught distractors depend on raw lesson array order. All must use one effective course order. |
| src/evaluate.js:17 | requireNikkud still changes future grading. Change the shared server evaluator, including old pinned content. |
| public/content.js:25–40 | CSV only recognizes fixed headers and color/bold. fieldFormatting and tags are retained as source strings. |
| public/rich.js:1–42 | Existing table renderer consumes Sheets-shaped cells, theme colors and UTF-16 runs; reuse this shape. |
| store.js:257–272, 412–474 | Saved feedback is tied to revision/exercise; backup restores all referenced snapshots and remaps IDs. Extend, do not bypass. |
| schemas/tools/contracts.mjs:28–76 | Independent semantic/approval dependency helpers assume three blocks and lesson selectors too. Update alongside runtime. |

The adjacent probe-baseline.mjs uses actual candidate modules and existing synthetic seed only. Its assertions passed: the fourth text block is rejected; bypassing validation yields two indistinguishable learn steps and identical explanation text; requireNikkud:true rejects a stripped answer accepted with false; CSV typed-looking formatting/tags remain strings. These establish baseline gaps, not proposed-feature acceptance. inspection.json records file hashes; probe-results.json contains exact results.

## 1. Optional chapters and one course order — FB18

Add this optional pack field (illustrative structural IDs, not new teaching content):

```json
{
  "curriculum": {
    "version": 1,
    "chapters": [
      {"id": "chapter-start", "title": "Getting started", "lessonIds": ["lesson-1", "lesson-2"]}
    ],
    "order": [
      {"chapterId": "chapter-start"},
      {"lessonId": "lesson-3"}
    ]
  }
}
```

chapters stores chapter objects; order alone orders top-level entries; chapter.lessonIds alone orders its children. A lesson entry in order is ungrouped. chapters array order and lessons storage array order have no navigation meaning when curriculum exists. No numeric ranks, chapterId on lessons, second chapter title field, or nested chapters are needed.

Validation: IDs follow the existing ID contract; chapter IDs are unique, titles nonblank; each order entry has exactly one of chapterId/lessonId; each chapter occurs once in order; every lesson occurs exactly once across chapter children and top-level lesson entries. Reject dangling, duplicate or omitted lesson references. Empty chapters may be staged and visibly labelled empty; they add no lesson position. Moving a lesson removes its former placement and inserts it once atomically. Removing a nonempty chapter requires explicit move-to-ungrouped or reassignment in the candidate, never lesson deletion.

Shared helper: courseOutline(content) returns grouped descriptors; orderedLessons(content) flattens that outline. Use it for Home recommendations, course/outline, followingLesson, lesson filters, cumulative letters, ordering distractors and publication impact. The same frozen revision supplies all those calculations.

When curriculum is absent, orderedLessons returns content.lessons unchanged. For the Studio projection, preserve each contiguous run of the exact legacy chapter string as a separate projected chapter. Equal labels in noncontiguous runs must not be merged because that would reorder lessons. Blank/missing chapter projects ungrouped. A projected chapter ID is "legacy-ch-" + SHA256(firstLessonId).slice(0,24); retain title verbatim and detect collisions. Persist that ID only when the author saves the structural edit. New chapters get a generated stable ID at creation; renames/reorders never generate another.

Keep lesson.chapter as inert legacy metadata when present. New lessons need not have it. Read the shared chapter selector from curriculum, never overwrite old labels just to render. This is a mechanical organizational projection, not approval of a changed teaching sequence. Show actual order changes in publication review.

## 2. Repeatable component instances — FB07/08

Use the existing lesson.blocks array as ordered composition. Add lesson.compositionVersion:2 and require block.id on every v2 block. Within a lesson, block IDs are unique and immutable after creation. Identity is (lessonId, block.id); reordering never identifies a block by array index or type.

Supported v2 combinations:

| type | source | renderer | Instance-owned fields |
| --- | --- | --- | --- |
| explanation | inline | text | text (authored Markdown), video, interactions, options.textDirection |
| vocabulary | words | vocabulary-table | selector, options.showNotes and supported display options |
| exercise-set | exercises | practice | selector, role:check or apply, supported display options |

An explanation has its own text and optional existing-safe video/interactions; it does not fall back to lesson.explanation in v2. Require nonblank text or a valid video. Two explanation blocks can carry different texts. Preserve Watch-first within each component when video exists. No inline copies of canonical word or exercise objects.

A check is an ordinary exercise-set block with role:check immediately after the text block when desired. It is no longer a hidden global lesson list. Component controls add/remove/reorder these instances; the selected component exposes its associated exercise editors directly below it. Retain existing exercise.id and exercise.lessonId. New exercises get IDs only on deliberate creation; dragging, duplicating a presentation, or moving the editor never clones the exercise bank.

Allow 1–100 blocks as a documented local resource bound, repeated families, and arbitrary authored order. No exactly-three rule. Keep the current nonempty graded lesson requirement for this candidate: at least one owned exercise must remain reachable. Text-only/non-graded lesson completion requires a separate semantic change, not accidental completion with zero questions.

### Selector grammar and stable membership

One explicit mode only:

```json
{"mode":"ids","ids":["w-ani","w-mi"]}
{"mode":"tags","tags":["qa-format"],"match":"any","includeIds":[],"excludeIds":[]}
{"mode":"lesson","lessonId":"lesson-1"}
```

mode:ids preserves listed order and rejects duplicates/missing IDs. mode:tags requires a nonempty unique tag list and match:any|all; match against the typed item.tags string array, never against raw sourceFields.tags. Resolve matching items in canonical collection order, append explicit includeIds in their authored order if absent, then remove excludeIds. Includes/excludes must reference existing IDs and must not overlap; no result is duplicated. Exact tag comparisons; preserve stored strings. Unmatched tags produce an author warning; an empty exercise result blocks staging because it cannot deliver required practice. No arbitrary queries or executable property paths.

mode:lesson resolves that lesson's wordIds/exerciseIds in order. Word blocks may reference another lesson. Exercise blocks remain restricted to exercises whose lessonId is the owning lesson; cross-lesson grading reuse is outside this change. Filter tag candidates to that owner, and reject explicit foreign exercise IDs. A lesson-mode exercise block in v2 is forbidden: its membership would recurse into the aggregate exerciseIds index. Legacy lesson-mode practice is expanded into explicit IDs during projection.

Add optional lesson.vocabularySelector, restricted to ids/tags modes over words, for the lesson-level tag selection plus specific-word lookup. Missing means the existing lesson.wordIds remains authoritative. Present means wordIds is a generated, read-only membership index equal to its resolved result. Lesson vocabulary blocks commonly select that lesson by ID; additional blocks may use their own selectors. A display-only extra word block does not silently enroll extra review cards: completion still enrolls lesson.wordIds. Show membership changes in the review.

For v2, lesson.exerciseIds is the read-only, ordered unique union of resolved exercise-set blocks; lesson.checkExerciseIds is the check-role subset. Retain these compatibility indices for progress/other consumers, but remove independent author controls. Generate them on the client before review and verify exact equality on the server; never silently normalize the candidate after review. Stale indices after a tag edit are a validation error requiring regenerated review.

Completion remains one successful answer per unique exercise ID within the pinned lesson revision. Rendering one exercise twice earns one slot. Deleting a component that removes the only reference to an exercise changes the required set: show this in publication diff; never modify old completion, attempts, or revision blobs. Owned but unreferenced bank exercises may remain unused.

### Legacy projection

For compositionVersion absent, retain baseline validation and behavior on stored snapshots. projectLesson(content, lesson) creates a separate editor/view object:

- Explanation -> deterministic ID "legacy-explanation"; copy exact explanation/video/interactions/direction; following check block "legacy-check" uses existing checkExerciseIds when nonempty.
- Vocabulary -> "legacy-vocabulary"; preserve its source lesson, options and unknown block fields.
- Exercise set -> "legacy-apply"; explicit IDs from exerciseIds minus checkExerciseIds, preserving order. Omit an empty projected apply block.
- Preserve existing legacy block order; insert a check immediately after its explanation, matching lessonSteps today.
- Retain all unknown lesson/block fields and original top-level explanation/check metadata. They are inactive compatibility data once compositionVersion:2 is deliberately saved.

No automatic startup migration of content. No mutation on GET, editor open, Review, Discard or preview. Persist the projected block IDs only on an explicit draft save. A new block ID is generated once (for example "block-" + UUID), including a duplicate text component.

## 3. Instance-aware learner wire and progress

Add a pure lessonFlow(content, lesson) returning ordered descriptors:
{ key, blockId, kind, exerciseIds }, followed by {key:"complete",blockId:null,kind:"complete",exerciseIds:[]}.
kind remains learn/check/vocabulary/apply/complete; key identifies the block instance, not the kind. Legacy projection has deterministic keys above. Do not use .find(type), duplicate "learn" strings, or question index across the whole lesson to choose a component.

Add componentId to resume writes and renderer/controller props. For new v2 lesson saves, it is required except complete (null). Retain step as the kind and question as the index within that component. Resolve the actual exercise through (pinned revision, lessonId, componentId, question). Reject mismatched step/component, out-of-range question, foreign exercise, or feedback pointing at another exercise/revision. Keep existing matching/token validation and terminal-question convention; a terminal position cannot carry feedback or an answer for another question.

Old resumes lacking componentId use their exact old snapshot and the deterministic legacy kind mapping, without a write. New sessions may return componentId in a response-only projection. Do not bind an old position to the latest blocks or latest array order. Saved answers, tokens and resultRequestId survive reorder/lookup/reload against the pinned revision.

Add flow to session/preview responses and the shared preview adapter. Preserve existing steps for legacy compatibility, but updated clients use flow keys for all navigation, routes, focus and question reset decisions. stepLabels still maps kinds to labels; repeated labels can include the component's author title or ordinal. Update studio-wire and learner schemas. Keep grading server-side and preserve 8a26817 pairResults and response-only legacy enrichment.

An authored-practice list remains its existing separately validated mode, drawn from the lesson's owned exercise IDs. Distinguish it from component membership in the flow resolver; never let practiceIds override a check or a normal component silently. The controller can anchor practice to an apply component and label it as practice, preserving the existing completion rules.

## 4. Introduced letters once — FB09

New/edited lesson field: introducedLetters:string, including an intentional empty string. Store each explicitly authored Hebrew letter once; validate Unicode base letters U+05D0–U+05EA, including final forms as distinct authored keys. Reject duplicates, punctuation and marks rather than changing the supplied field. Preserve authored order. Do not derive letters from vocabulary text, lesson titles, old cumulative letters, or differences between adjacent lists.

keyboardForLesson(content, lessonId) uses orderedLessons from the same pinned revision:
prior = ordered unique union of preceding explicitly declared introductions;
new = current introductions minus prior;
known = prior;
available = union(prior, current introductions).
Only new gets the current-new highlight. Reintroduced letters already in prior remain known; display an author warning for repeated introduction across lessons rather than highlight them as new. This is curriculum order, not inferred learner mastery.

A legacy keyboard.newKeys string is explicit evidence of introduced letters and may supply a read-only introduction projection; do not infer from keyboard.knownKeys or lesson.letters. A legacy lesson itself continues displaying its authored known/new sets while unconverted. On deliberate conversion, show the exact newKeys-to-introducedLetters mapping and persist it; retain legacy keys/letters inert for history. Color preferences remain usable and separate.

If a preceding legacy lesson has no explicit newKeys or introducedLetters, report missing introduction data; do not invent a complete cumulative set. An order/letter edit relying on that cumulative set must be resolved before publication. Ordinary old restore/rollback remains valid and can display the legacy keyboard with its old metadata. In the inspected upgraded synthetic seed, all three lessons already have explicit newKeys, so no linguistic inference is needed for that fixture.

## 5. Remove answer vowel requirement globally — FB10

Remove the author control and stop creating/modifying requireNikkud in ordinary editor patches. Keep the old boolean field accepted and preserved in old objects, JSON, drafts, exports, restore and history.

Every NEW evaluation in the shared evaluateAnswer must ignore Nikkud, regardless of exercise.requireNikkud and regardless of pinned revision. For typing, compare against both stored pointed and stored standard-unpointed forms; for cloze/transformation/ordering, compare against the authored answers. Use the existing ignore-Nikkud normalization policy consistently; do not broaden accepted spellings, generate unpointed display forms, strip stored text, or change matching/recognition semantics. nikkudOverride remains a display option.

Add optional evaluationPolicy:"ignore-nikkud-v1" to new stored grade/preview results so an old failure and a later success are explainable. Missing policy on historical records means legacy/unspecified, not a reason to regrade. Preserve stored answer, expected, correct, pairResults and timestamp. Duplicate requestId replay returns the original result even after the grading policy change; a new requestId is a new submission. Preserve report-attempt copies and existing once-per-revision earned credit.

## 6. Mapped import and typed formatting — FB02/16

Keep whole-pack JSON lossless. CSV has no intrinsic style capture; styles/tags become typed only through an explicit mapping or a verified companion sidecar. No live Sheets claim.

Expose pure helpers in public/content.js (or a shared module it re-exports):
parseVocabularyCSV(raw) -> {headers,rows};
suggestColumnMapping(headers) -> suggestions with recognized/unmapped/ambiguous status;
mapVocabularyRows(parsed, mapping, baseContent, companion?) -> {content, mappingSummary, warnings};
validateFormatting(value, context) -> field-path errors.

A concrete mapping envelope:

```json
{
  "version": 1,
  "columns": [
    {"columnIndex": 0, "target": "id", "decode": "string"},
    {"columnIndex": 1, "target": "pointed", "decode": "string"},
    {"columnIndex": 2, "target": "unpointed", "decode": "string"},
    {"columnIndex": 3, "target": "curated", "decode": "string"},
    {"columnIndex": 4, "target": "english", "decode": "string"},
    {"columnIndex": 5, "target": "fieldFormatting", "decode": "json"},
    {"columnIndex": 6, "target": "sourceTheme", "decode": "json"},
    {"columnIndex": 7, "target": "tags", "decode": "json"}
  ]
}
```

Recognize existing direct fields plus tags:string[], fieldFormatting:object, sourceTheme:array and legacy format.color/format.bold. Offer the five required identity/forms/sense fields explicitly. Header synonyms may suggest targets; ambiguous "Hebrew" must not be copied to three forms. Do not derive stable IDs, transliteration or vowel forms. Keep current required explicit forms for CSV, even updates, unless a later separately specified partial-import mode is added.

Use a closed target registry, never assignment by an arbitrary dotted source header. Optional scalar style targets are explicit descriptors, e.g. {target:"fieldStyle",field:"pointed",property:"bold",decode:"boolean"}. Supported properties: bold, italic, foregroundColor, backgroundColor, horizontalAlignment, textDirection. Show the destination path. Disallow JSON whole-cell mapping and scalar mapping to the same effective property in one import; error rather than hidden precedence.

Preserve unknown column values as strings in sourceFields, and preserve existing unknown word metadata. Keep a raw record of ALL supplied headers/values, mapping and source indices in an author-side entry (e.g. word.importSource:{version:1,headers,values,mappingVersion:1,columns}); sourceFields continues serving legacy extra columns. Do not trim/normalize cell strings. Display-only header matching may trim/case-fold, while the raw header survives. Reject duplicate headers, unknown target names, duplicate target assignment, row-length mismatch and reserved prototype keys. Rows absent from CSV leave words unchanged; IDs update existing objects, never positional rows.

Optional companion format:
{version:1,sourceSha256,entries:[{id,fieldFormatting?,sourceTheme?,tags?}]}.
Bind sourceSha256 to the exact imported CSV bytes; entry IDs must be unique and exist in the CSV; cell formattedValue must match its mapped field. Reject conflicts with metadata already supplied by mapped columns. This is a proposed local sidecar, not a source-map identity service.

### Exact formatting shape and validation

Use the existing Sheets-shaped fieldFormatting[field]:
{formattedValue, userEnteredFormat?, effectiveFormat?, textFormatRuns?}.
Formats support textFormat (bold/italic/underline/strikethrough, allowed colors/font family/size), background colors, horizontalAlignment LEFT|CENTER|RIGHT and textDirection LEFT_TO_RIGHT|RIGHT_TO_LEFT. Preserve raw effective/user formats; effectiveFormat takes precedence exactly as the current renderer does.

Colors are safe #RRGGBB or the supported RGB/color-style/theme objects. Validate numeric channels in [0,1], known color/style shapes and theme references; never treat arbitrary CSS strings or URLs as colors. sourceTheme is an array of unique {colorType,color} entries. Resolve only allowlisted literal color data; detect missing/cyclic theme references. Font sizes/families retain the renderer's current limits. tags is an explicit string array, never inferred from bold/color.

Runs retain UTF-16 indices into the EXACT formattedValue string. Require integer indices in [0,text.length], strictly increasing, bounded count, valid format objects, no surrogate-pair splitting. A run beginning between a Hebrew letter and its vowel mark is valid; do not convert to grapheme indices, Unicode-normalize text, sort runs, or alter source bytes. Preserve combining-mark and RTL positions. For new mapped runs, require formattedValue to equal the mapped string.

Unknown safe JSON metadata remains stored and escaped/inert; unsupported format properties get a warning and no rendering. Malformed values for supported properties, unsafe CSS/URL values in those properties, malformed JSON, reserved keys and invalid run indices reject the candidate atomically. Do not silently delete unsafe supplied values to make a draft pass. Existing renderer escaping/CSS allowlists remain defense in depth.

Historical snapshots may contain values accepted by the old looser formatting validator. Keep the legacy stored-content validation path for restore/rollback; render unsupported data inert. Apply strict typed validation to newly authored/mapped formatting changes and declared new typed structures, not a retroactive rewrite/rejection of unchanged history. A later plain-text edit that makes existing formattedValue stale preserves the original cell/run metadata, warns, and renders plain text until explicitly remapped. Never apply old offsets to new text.

### Review / Stage contract

Read file -> show sample rows, recognized and unknown columns -> author chooses mapping -> validate/compile -> display field/formatting preview and frozen diff -> Stage -> existing separate Publish.

Review, mapping edits and Discard have ZERO persistent writes: no draft, stagedAt, revision, learners, events, filesystem import cache or source-service writes. Keep only a bounded client review object with file identity, mapping, candidate content, baseRevisionId and expectedDraftToken. Existing UI/file-size bounds stay visible. Show typed values AND the actual table rendering; unsupported is distinct from missing/invalid.

Changing file, mapping, sidecar or base invalidates the prepared candidate. Regenerate preview before enabling Stage. Stage sends the frozen candidate with the captured base and token to the existing /api/studio/draft route. Preserve validation order and transaction: token present -> base -> token equality -> full validation -> no-op -> draft write. A conflict retains the user's file/mapping/input for re-review; do not auto-merge, rebase, overwrite, or substitute published content. Server revalidates typed values, refs and derived indices; browser validation never authorizes a write. Identical candidate remains unchanged with the same token/stagedAt.

Current CSV 2,000-row and content 2,000-item ceilings are real. Bounded DOM/pagination helps within these limits; claiming 5,000-row support requires an explicit coordinated bound/body-size change and test. No silent truncation or loss of metadata to meet a limit.

## 7. Shared implementation and data compatibility

Keep helpers pure and shared by Studio, learner, preview, validator and dependency analysis:
courseOutline, orderedLessons, projectLesson, resolveSelector, resolveBlock, lessonFlow, keyboardForLesson, deriveLessonIndices, parseVocabularyCSV/mapVocabularyRows, formatting validation. Pass the exact content snapshot; no fetch, localStorage or latest-content fallback inside helpers.

Lead integrates public/content.js / ux.js (or small shared modules), store/evaluator/server, app and preview adapters, schemas and tests. Feature calls these contracts from its isolated Studio modules. Avoid a second UI-only selector, grader or migration.

Update all six schema-related surfaces where applicable: content-pack, learner-content, common formatting definitions, studio-wire, schemas/tools/contracts.mjs semantic/dependency checks, and their fixtures/checks. Add discriminated legacy/v2 block validation, optional curriculum and typed imports. Unknown fields continue round-tripping. Storage schemaVersion:1 is an envelope, not a promise that an old app can interpret new composition.

Increment STORE_SCHEMA_VERSION to 3 because new persisted cursors and composition semantics require a newer reader even without new SQL tables. Migration from 2 only updates the schema marker in a transaction; it must not change snapshots, drafts/tokens, learners or reset timestamp. Keep existing v1->v2 historical-link migration. Export backup-v2 with storeSchemaVersion:3; new code accepts old supported v1 versions and backup-v2 schema 2 or 3. Older builds then refuse schema 3 via their existing version guard. Preserve the pre-update database copy for executable downgrade. Do not attempt to run the old executable against the upgraded database.

Restoration validates every active/draft/referenced snapshot by its declared legacy/v2 content contract and every cursor against its own snapshot before any write. Remap revision IDs exactly as today; retain block IDs, old flags, raw fields and historical grades. Recompute the carried draft token only because restore rebases revision IDs. If malformed, the entire restore fails with all tables unchanged. Content rollback to an old revision on the new engine remains supported; it does not revert the new grading policy.

Publication diff must include chapter creation/title/move, top-level order, child order, component IDs/order/text/selectors/options, derived membership, introductions, tags and formatting/import metadata. Compare object keys canonically and preserve array order; include dependencies from BOTH old and candidate resolution. Reordering lessons changes subsequent cumulative letters and taught distractors. A tag edit can affect components and membership even without editing their selector. Extend dependenciesFor/approval dependency digests accordingly; invalidate approval metadata when dependency membership changes. Conservative whole-course impact for curriculum changes is acceptable and truthful.

Prepared learner-view comparison must include outline position, resolved block content and words, cumulative keyboard and prepared exercises. No-op token/stagedAt guarantees remain. New raw importSource/mapping records, source locators and approval identities stay author-side. Learner projection carries only required public lesson/component/rendering data, safe word/tag/style fields and sanitized exercise data. Do not leak answers through new blocks; unknown metadata round-trip belongs to the author boundary. Existing broader learner metadata exposure is a pre-existing gap, not permission to expand it.

## 8. Targeted acceptance vectors for Lead / later independent QA

These are required tests, NOT results of this consultation.

| ID | Vector and observable requirement |
| --- | --- |
| AC01 | Old seed/JSON/backups and old resumed matching/ordering sessions load; original snapshot bytes and learner grades unchanged by reads. |
| AC02 | Optional no-chapter course, mixed ungrouped lessons, empty chapter, chapter reorder and lesson move: every lesson appears once; next/previous matches outline and IDs never change. Duplicate/dangling placements fail atomically. |
| AC03 | Legacy same-title noncontiguous chapter runs project without reordering or coalescing. Opening/closing Studio writes nothing. |
| AC04 | Two text components with distinct existing source text render independently, drag/reorder with stable IDs, save/reload, preview and publish in the same order. No .find(type) selection. |
| AC05 | Repeated vocabulary/exercise component instances resolve IDs/tags deterministically. Removed/missing refs fail; tag edits update the displayed membership and diff. No copied word/exercise records. |
| AC06 | One exercise displayed twice earns one completion slot; retry/wrong answer still earns none. Removing its sole component changes only the new revision's requirements. |
| AC07 | Save position in second text component and second exercise component; lookup/reload restores each and its feedback. Publishing a reorder in another tab does not move the pinned cursor. Forged component/result pair fails without writes. |
| AC08 | Old check/apply cursor without componentId maps to old revision exactly; old saved matching pairResults/overall grade and ordered summary are retained. Practice remains bounded and separately scoped. |
| AC09 | Existing explicit synthetic newKeys project to introductions; later lesson known set is preceding union, new highlight is current-minus-prior. Reorder recalculates in preview; no mutation of old keyboard metadata. Missing legacy introduction evidence is visible, not fabricated. |
| AC10 | Fresh attempts and preview on old requireNikkud:true revisions accept pointed/unpointed equivalents, still reject incorrect letters. Old failed verdict survives resume/report/backup. Duplicate request returns its old verdict; fresh ID gets new policy. |
| AC11 | Each bold/italic/foreground/background/alignment/direction style separately and combined with existing Hebrew/Nikkud; exact raw string and UTF-16 indices survive JSON save/publish/export/restore and table rendering. |
| AC12 | CSV custom headers map explicit forms and typed JSON formatting/theme/tags; unknown source columns survive byte-for-byte. Same valid content via whole JSON and CSV+mapping produces equivalent typed fields. |
| AC13 | Duplicate/ambiguous targets, missing forms/IDs, invalid boolean/color/theme/runs, bad JSON, reserved keys and conflicting sidecar data are rejected. Table fingerprints show zero writes. Unknown harmless format property is preserved but labelled unsupported. |
| AC14 | Preview mapping before Stage; change a mapping after review and require rebuilt diff. Review/Discard write zero tables. Two-tab stale Stage gives existing 409 and retains input; same-token restage is a no-op. |
| AC15 | Rehearsal uses same flow/selector/grader/format renderer; all learner/settings/publication tables unchanged; stale draft freezes input and offers explicit reopen; exit restores focus. |
| AC16 | Publication impact includes old/new tag membership, moved chapters/lessons, later cumulative keyboard and ordering trays. Unknown-only metadata changes remain visible. |
| AC17 | Schema-3 backup restores into new runtime; old schema-2 backup and flags remain accepted; every referenced revision and draft is retained. Bad component cursor/grade link fails before writes. Old binary refuses schema-3 restore/open. |
| AC18 | Within current supported collection bounds, vocabulary filters and pagination keep DOM bounded and preserve selected stable IDs across pages; above-limit input fails clearly without partial import. |
| AC19 | Preview/session wire schemas accept the new flow/component/policy fields and still exclude exercise answers. Import author metadata does not appear on learner responses. |
| AC20 | Default update reset remains only the existing explicit once-per-executable-build demo startup. Same-build restart and schema/content read projections do not reset progress or change reset timestamp. |

Lead should add failing-parent controls for repeated components, cumulative order, vowel policy and typed CSV mapping; run meaningful Store/HTTP/renderer coverage plus schema/runtime checks once integrated. Native mapped file Review -> Stage and drag/focus require mounted Browser evidence when tools support those actions. A pure importer test is not a native import pass. Independent candidate QA and Guy's acceptance stay pending; mobile/phone-width/touch stays deferred until APK.

## Handoff and limits

Implement this as a bounded additive contract, not a new generic content framework. The chapter/selector/instance/letter structures above are the recommended exact names; if Lead changes them, update this contract and shared helpers together before Feature integration. No production decision, external import, canonical Hebrew, media, APK, live integration or GitHub export is authorized or claimed by this artifact.

Actual command executed for the probe:
node "<Architect workspace>\feedback18-contract-8a26817\probe-baseline.mjs" "C:\Users\Trans\.openmausbot\workspaces\8c900356-50f6-4d41-bbb9-50c8abe09233\feedback18-candidate"

Read-only rg/Git queries and bounded file reads were also used. An initial rg path lookup failed because scripts/ does not exist; the actual tools are under schemas/tools. The optional private Codex memory lookup was blocked by automatic approval review; this consultation instead used the authorized candidate and current request. No protected service status or UI behavior was independently verified here.
