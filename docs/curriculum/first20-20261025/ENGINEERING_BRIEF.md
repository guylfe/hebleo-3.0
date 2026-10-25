# Interactive text lessons and order-independent content IDs

Owner request, 25 October 2026: “generate a file with the lesson content for the first 20 lessons, ideally using the existing video lessons as the base. Make them interactive, with pagination/timed components (such as the 10-second number in the introduction actually appearing for 10 seconds once you play it). Whatever features are needed, tell the engineering team to add them to the text lesson portion of the lesson structure in Hebleo”. He also requested clearer content IDs across sources, for example MNT, so lesson placement can change independently.

Leo 3.0 coordinates assignment. This is a concrete engineering implementation request. The standalone prototype is a reference and review file; these features have not been installed in Hebleo by Curriculum Designer.

## Reviewable artifacts

Repository: `C:\Users\Trans\.openmausbot\task-workspaces\71c71389-5334-4e0c-9ca8-d80dd28223d1\653fb433-7485-48b1-9f7c-cb22711bda02\hebleo-3`.

Files beneath `docs/curriculum/first20-20261025/`:

- `first20.html`: self-contained working reader; open locally in a browser.
- `content.json`: 20 lessons / 154 pages / 127 vocabulary targets. Human-source-derived wording is explicitly an adapted draft.
- `FIRST20_CONTENT.md`: complete text, source notes and model answers for author review.
- `lesson-catalog.json`: prepared 114-lesson route, with vocabulary, examples and prerequisites.
- `lesson-id-map.json`: 404 planning records and aliases across the four routes.
- `REDISTRIBUTION.md`: all 75 vocabulary relocations and 18 added gaps, with old/new placements.
- `reader.js`, `reader.css`, `build-reader.cjs`: reference renderer and bundler.
- `test-reader.cjs`, `reader-test-results.json`, `browser-review.json`: actual verification and limits.

## Required product behavior

1. **Authorable pages inside the existing text explanation.** Preserve the Learn → Check → Vocabulary → Apply → Continue lesson model and the Watch/Read choice. Allow an explanation to contain stable-ID pages/blocks with a separate order. Support prose, Hebrew examples, choice checks, written recall/model reveal, timed reveal/recall, and source/native-media references. Existing plain Markdown/text and video lessons must continue to load. The prototype displays the whole lesson path; it is not a request to duplicate the outer Check/Vocabulary/Apply components inside Learn.
2. **User-controlled pagination.** Back/Continue, clear page position, logical focus after a page change, and author-configurable reveal/check gates. Do not auto-advance normal reading. A learner can revisit material. Opening a page alone must not mark a whole lesson complete. Keep draft/page progress distinct from current application lesson completion rules.
3. **Exact timed demonstration.** MEMORY shows `0704177609112001` only after Play, for `durationMs: 10000`, then removes it from visible and accessible content before recall. Preserve leading zeroes as a string. Use elapsed-time deadlines rather than a decrement counter. Replay/reset works. Navigation and hidden-tab changes cancel the attempt and require a fresh Play; stale callbacks must not update another lesson. Offer an untimed study alternative. No autoplay. Document background behavior and test boundary timing.
4. **Commit before reveal.** Choices need selection, explicit Check and then feedback. Typed recall needs an attempt before a model appears. The free-response models here are illustrative self-check answers, not exhaustive exact-match graders. Keep source-approved answer rules distinct from generated wording. Reuse the approved application exercise action layout where appropriate.
5. **Vocabulary and source continuity.** Use the application's canonical lexeme records and inflection/source references. The prototype’s `.word.N` IDs are draft-local card IDs, not replacement lexeme identities. Reuse existing word interactions rather than building a parallel vocabulary store. Preserve per-page source/adaptation metadata. Native audio and final curated Nikkud are human authoring work; do not fabricate them.
6. **One renderer contract for learner and Studio Preview.** Add Studio controls to create/edit/reorder pages and set timings, choices, reveal rules, and native media. Import this pack only as an unpublished draft for review. Validate bounds and malformed content. Sanitize imported authored HTML/Markdown using the application's existing safe rendering policy; the prototype directly renders its bundled trusted authored data and is not an import-security implementation.
7. **Readable IDs independent of sequence.** Add a stable content identifier/alias distinct from lesson order. For current persisted lessons, preserve immutable primary keys and map readable IDs through aliases unless an explicitly verified migration proves reference and progress preservation. Existing lesson, block, exercise, lexeme, draft, history, source and export references must survive reordering and repeat imports. Do not regenerate block IDs from their current index. The draft page IDs must be frozen at import; future page order changes cannot reissue IDs. The four planning-route suffixes distinguish alternative records rather than teaching positions. An A-route source ID is not evidence that an unrelated synthetic `lesson-1` fixture is the same lesson.
8. **Source platforms remain traceable.** Original WordPress/Vimeo/Drive IDs and original lesson numbers are source locators. Keep them and store content-ID mappings beside them. Historical snapshots are immutable evidence. Do not rewrite production WordPress or learner records to make their IDs look like planning IDs.

## Inspected application surfaces

- `public/course.js`: legacy explanation upgrade and block validation currently support inline text/video with renderer `text`; inspect `projectLessonSteps` and corresponding model/store contracts before extending.
- `public/learner-view.js:36`: `lessonInteractions` currently provides simple reveal/choice interactions; `learnMedia` renders the text explanation and those interactions.
- `public/preview/learner-renderer.js:81`: preview uses `learnMedia` with the outer Continue row.
- `public/studio/lesson-editor.js`: current lesson authoring surface.

These are starting points verified in this checkout, not a mandate to place every change there. Lead owns integration; isolate implementation in its branch/worktree and review current code before editing. Update the shared FEATURE_CHECKLIST with exact scoped evidence during engineering integration; Curriculum Designer did not edit that concurrently modified file.

## Acceptance evidence

- Existing text/video content remains loadable; learner and Studio Preview both exercise paginated and timed content.
- Timing tests cover no autoplay, 9999ms visible / 10000ms hidden, replay, navigation cancellation, hidden tab, and untimed mode. Exact source number is retained.
- Choice and recall do not expose feedback before commitment; keyboard/radio navigation, focus, RTL/Nikkud layout and narrow screens work.
- All 20 draft lessons import without missing blocks/targets; source references and adapted-draft status survive save/reload/export/import.
- Reorder two lessons and two pages, save/reload/export/import twice: IDs, prerequisite references, word associations, responses and progress remain attached to content. Test alias collisions, unknown aliases and conflicting existing content without data loss.
- Preserve settings, authored content, drafts and existing history/progress. Do not reset or reseed a running demo for this content handoff. Installed behavior must be verified at the actual learner destination, separately from prototype and Preview tests.
- Report exact branch/commit, commands actually run, automated results, native checks, remaining human content review, and installed versus proposed status. No production publishing.

## Current verification and saved sheet update

Reference reader: 179 executable checks pass, all 154 pages completable, no jsdom runtime errors. Native isolated Chrome inspection confirmed representative Hebrew layout at desktop and narrow widths, explicit choice feedback, vocabulary reveal, and timer running/expired states. Native clicks used background synthetic DOM delivery and independent readback; physical pointer and screen-reader behavior were not certified.

Prepared planning revision: 114 lessons, 1087 targets (all 1069 prior entries retained), 528 sentences, 404 unique readable IDs, and at least two intervening lessons for all audited topic-family returns. Letter/prerequisite/count/example-token checks pass within their stated bounds; they are not final native linguistic approval.

**Sheets is now saved:** Guy renewed approval through the update card. Fresh prewrite comparison found no content, metadata or active-comment differences. The native batch succeeded, and readback matches all prepared cells, 404 IDs and format rules; all 30 active comments are unchanged. See SHEET_SAVE_RECEIPT.md and sheet-save-verification.json. Native application implementation/installation is still engineering work.

Original presentation: https://drive.google.com/file/d/1ImMGqVDWT8BMN63xay1-DT7ug3Z1W9mr/view . Its slide text/notes and linked human-written WordPress lessons were inspected. Video recordings/captions were not inspected, and no invented timestamps or synthetic audio were supplied.
