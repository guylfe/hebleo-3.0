# Shared contract checkpoint for Studio integration

This is a working runtime/model checkpoint, not the completed 18-finding candidate. Lead integrated Feature's UI slice as 70f2cea and implemented the shared additive contracts. Unchanged parent controls at 70f2cea reproduce the repeated-text, vowel-grading, opaque CSV metadata and dropped-component-cursor gaps. The parent binary refuses a schema-3 database. Current protected demos and main were not touched.

## Exact callable APIs

public/course.js exports:
- projectCurriculum(content) returns a separate version:1 chapters/order structure; no writes. courseOutline(content) returns [{kind:'chapter',id,title,lessons}, {kind:'lesson',lesson}]; orderedLessons(content) returns effective navigation order.
- validateCurriculum(content), validateLessonComposition(content,lesson) throw on malformed models without normalizing them.
- projectLesson(content,lesson) returns a separate compositionVersion:2 editing projection. Legacy text/check/vocabulary/apply IDs are deterministic. Existing unknown/source fields, IDs and explanation/keyboard metadata survive. Conversion saves only on explicit Stage.
- resolveSelector(content,source,selector,ownerLessonId?) returns original canonical objects in deterministic order. Mode ids/tags/lesson follows Architect contract; exercise IDs remain owned. Tag mode matches typed arrays only; legacy opaque tag scalars remain inert and are never inferred.
- resolveComponent(content,lesson,block) returns exact instance Markdown or resolved vocabulary/exercises. public/content.js re-exports it as resolveBlock.
- deriveLessonIndices(content,editedLesson) returns a clone with generated wordIds (when vocabularySelector exists), ordered unique exerciseIds and checkExerciseIds. REQUIRED after component reorder/add/remove/selector edits and before Review/Stage. Store rejects stale indices rather than silently altering a reviewed candidate.
- lessonFlow(content,lesson) returns [{key,blockId,kind,exerciseIds},...,{key:'complete',blockId:null,kind:'complete',exerciseIds:[]}].
- keyboardForLesson(content,lessonId), introductionWarnings(content). New/converted lessons explicitly set introducedLetters once (intentional empty string supported). Missing legacy data is exposed; no letter inference from vocabulary or known letters.

New text block: {id,type:'explanation',source:'inline',renderer:'text',text,options:{textDirection:'auto'}}. Optional existing-safe video/interactions are per instance. New exercise block: {id,type:'exercise-set',source:'exercises',renderer:'practice',role:'check'|'apply',selector:{mode:'ids',ids:[...]}}. New vocabulary block: {id,type:'vocabulary',source:'words',renderer:'vocabulary-table',selector:{mode:'lesson',lessonId}}. IDs are created once; moving/reordering never changes them or creates canonical exercises.

public/vocabulary-import.js exports:
- vocabularyTextFields, vocabularyRequiredFields, vocabularyMappingTargets (closed registry).
- parseVocabularyCSV(raw) -> {headers,rows}, exact cell/header strings, <=2000 rows and local file bound.
- suggestColumnMapping(headers) -> [{columnIndex,header,target,decode,status:'recognized'|'ambiguous'|'unmapped'}]; an ambiguous Hebrew header is unmapped, never guessed into forms.
- defaultColumnMapping(headers) -> {version:1,columns:[{columnIndex,target,decode}]}, recognized unique suggestions only; author must see/choose mapping before Review.
- mapVocabularyRows(parsed,mapping,baseContent) -> {content,warnings,mappingSummary}. Throws atomically for bad/duplicate mapping, missing explicit forms/IDs, malformed typed values, unsafe supported styles or invalid runs. Unknown columns remain sourceFields; importSource preserves ALL raw cells and the mapping, author side only.
- validateFormatting(fieldFormatting,{word,sourceTheme}) -> {errors,warnings}. Typed Sheets-shaped cells, hex/RGB/theme colors, UTF-16 runs, fonts, alignment, direction. Unknown harmless formatting survives as an unsupported warning. Stale cells after a later text edit warn and retain exact source data.

Formatting scalar mapping descriptor: {columnIndex,target:'fieldStyle',field:'pointed',property:'bold'|'italic'|'foregroundColor'|'backgroundColor'|'horizontalAlignment'|'textDirection',decode:'boolean'|'string'}. Full fieldFormatting/sourceTheme/tags use decode:'json'. Direct text uses decode:'string'; bold/noVocab/noCard use decode:'boolean'. No arbitrary assignment paths. Metadata supplied by whole formatting and scalar styles in one file is rejected. A local sidecar is not implemented in this slice; explicit mapped JSON style columns support the requested CSV pathway.

## Server / persistence

Store validates legacy snapshots by their legacy composition path and new v2 compositions by the shared model. Future typing/cloze/transformation/ordering evaluations ignore vowels even on old pinned revisions, returning optional evaluationPolicy:'ignore-nikkud-v1'. Old requireNikkud booleans, pointed text, recorded grades and duplicate-request receipts remain unchanged.

STORE_SCHEMA_VERSION is 3; migration from 2 changes only the marker. Backup-v2 restores declared schema 2 or 3, retaining every pinned revision and component cursor. Historical v1 markers remain their older supported versions. ComponentId is required for v2 progress except complete(null); step remains kind, question is local to the component. Legacy records without componentId retain old behavior. Session/preview additionally return flow and keyboard; learner responses omit new raw importSource records and inline component extension metadata. No migration/read projection resets progress.

Routes for course.js, vocabulary-import.js, Markdown module, vocabulary browser and local EasyMDE JS/CSS are live. CSS uses text/css. New UI module routes must be added explicitly by Lead. Existing draft CAS/token/base validation order, no-op timestamps and zero-write preview remain intact.

Publication diff conservatively marks curriculum changes as whole-course impact. Prepared views include effective order, resolved word membership, component flow and cumulative keyboard. Old/new word dependencies are unioned.

## Deliberate bounded choices / pending work

The Architect recommended SHA256-based projected chapter IDs. This pure browser/Node helper instead combines the first lesson's stable source ID (bounded prefix) with a deterministic identity suffix, and explicitly rejects collisions. It does not use chapter titles or positions. New author-created chapters/blocks use stable generated IDs. Source IDs/titles/order remain unchanged.

Legacy opaque tags are preserved but not used as typed selectors; newly mapped tags declare taggingVersion:1. New formatting declares formattingVersion:1; Stage checks newly changed supported formatting, while untouched old history stays restorable. Typed schema surfaces still need Lead updates.

Learner app/preview controller still need instance-key navigation, cumulative keyboard and optional chapter outline wiring. Studio still needs one selected lesson context, full-width instance editors with exercises below, selectors, optional chapter/order controls, Import at top and native mapping Review -> Stage. My Hebrew filters/zero-due guidance also remain. The reusable Feature widgets are not mounted yet. Independent QA, final private checkpoint verification and revised demo are pending; mobile/touch deferred until APK.

## Actual checks

Clean npm ci succeeded through normal exec require_escalated after the default sandbox registry fetch returned EACCES. Pinned distribution/license byte checks pass. Official EasyMDE changelog (https://github.com/Ionaru/easy-markdown-editor/blob/master/CHANGELOG.md) confirms 2.21.0 on 2026-05-03; upstream MIT license is https://github.com/Ionaru/easy-markdown-editor/blob/master/LICENSE.

npm.cmd run verify passed 217/217 with no skips before this handoff's final compatibility-only metadata changes; final verification is saved alongside this handoff checkpoint. 27 new model/mapping/Store/HTTP tests cover repeated instances, pinned cursors, chapters, styles, source bytes, forged position rejection, old backup/grade preservation and static routes. Evidence: docs/evidence/feedback18-contracts/. These are owner checks, not independent QA or Guy acceptance.
