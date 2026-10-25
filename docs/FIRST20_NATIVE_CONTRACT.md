# Native interactive text implementation contract

Status: implementation contract, 25 October 2026. ENGINEERING_BRIEF.md remains the acceptance source. No curriculum or publication approval is implied.

## Ownership

Lead: `public/text-contract.js`, `public/content-identity.js`, `public/course.js`, server/store/schema/import code, preservation, integration and delivery evidence.

Feature Engineer: shared `public/text-reader.js`, `public/studio/text-pages-editor.js`, learner/Preview wiring in `public/learner-view.js`, `public/app.js`, `public/preview/learner-renderer.js`, `public/ux.js`, Studio wiring in `public/studio/unified-studio.js`, CSS, and dedicated UI tests. Feature work uses a separate checkout and branch. Lead integrates the resulting commit.

## Text data

An existing inline explanation block keeps `renderer: "text"`, `text` and optional video. Add `textPages: {version:1, pages:[page records], order:[page IDs]}`. Page IDs are immutable strings (ASCII letters, digits, dot, underscore, hyphen; maximum 120 characters); order is an independent permutation of all page IDs. New author-created IDs use UUIDs, never array indexes. An explanation with textPages can have empty legacy text.

Page types are `reading`, `choice`, `recall`, `timedRecall`, `vocabulary`, `complete`. `complete` is a reading/reflection page, never a course-completion operation. Import retains source `stage` as `sourceStage` metadata; pages do not create another Learn/Check/Vocabulary/Apply shell.

Common fields: `id`, `type`, `title`, optional `html`, `prompt`, `sourceRefs`, `provenance`, `sourceStage`, `gate` (`none`, `commit`, `reveal`). HTML goes through the existing injected safe lesson renderer, including source imported HTML. No direct trusted-innerHTML exception.

Choice: `options` string array, `answer` integer index, `explanation` text. Explicit radio selection and Check precede feedback. Recall: `answer` illustrative model string, `grading:"self-check"`; a nonblank written attempt precedes reveal. Timed recall: exact string `value`, integer `durationMs` (100–120000), `accessibleAlternative:true`; no autoplay; deadline, cancellation and boundary rules from the engineering brief apply. Replay clears the attempt. Never persist running timer state or a visible timed value.

Vocabulary pages contain `wordIds` referencing existing canonical words and `unresolvedTargetIds` referencing lesson draft target metadata. They never create lexemes from prototype `.word.N` IDs. Resolved words reuse existing word cards/lookup/audio. Unresolved targets remain explicitly pending mapping in Studio/Preview; no fabricated forms or parallel learner vocabulary store. The original 127 target records remain in `lesson.draftTargets` for mapping review.

Lead exports `validateTextPages(textPages, {wordIds, targetIds})` and `orderedTextPages(textPages)` from `public/text-contract.js`. Feature may implement against that seam; Lead supplies the module at integration. Preserve unknown source/adaptation fields when editing.

`portionLesson` projects `textPages` from the selected explanation block. Both actual learner and Preview call the same renderer/binder. Has-text checks include nonempty textPages. Mount disposal and visibility changes cancel timers, hide their contents and require fresh Play. Keep normal reading user-controlled, focus the page heading after navigation, and provide untimed study.

## Progress seam

Lead supplies author-independent `/api/text-progress` GET (query `lessonId`, optional `revisionId`) and POST. POST takes `{lessonId, revisionId, componentId, pageId, response, cursorPageId}`. Response is bounded `{text?, choice?, checked?, revealed?}`. Data is saved separately from completion, attempts, review and existing resume cursors. Stable lesson/component/page IDs key the records. Invalid references are refused. Timer state is never restored as running.

Feature injects load/save callbacks into the shared renderer; Preview retains disposable state and never calls this endpoint. Actual learner may asynchronously load state after session selection, guarding stale lesson/revision responses. Do not block existing lesson navigation on text-page persistence errors; show a retryable save status.

## Import and aliases

Existing lesson primary keys stay unchanged. Readable aliases and historical/planning/source references are metadata independent of order. Planning A IDs never match synthetic fixture IDs by position. New imported lessons use deterministic namespace IDs derived from frozen pack identity, not placement. Unknown or ambiguous aliases and conflicting content produce explicit review results without mutation.

First20 is an unpublished adapted draft, appended to a copy of the current saved draft (or active snapshot when none exists), with a compare-and-swap token. Existing draft/content remain intact. Identical imports are idempotent; modified existing imports produce conflicts. Human approval and unresolved vocabulary mappings block publication. Existing WordPress/Drive/Vimeo locators remain source evidence. Sheets writes are outside this work and must not be retried.
