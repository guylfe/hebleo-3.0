# Studio UI first slice: integration handoff

Owner: Hebleo Feature Engineer. Branch `feature/feedback18-ui`, exact parent `8a268176f8d4a4ec700b7971945c501709df5a4a`. Isolated checkout: `C:\Users\Trans\.openmausbot\workspaces\2b35801f-cca1-4beb-9e70-fd39eb282fa0\feedback18-ui`.

This slice implements reusable UI modules and guided exercise controls. Lead still owns the unified Studio, component/chapter schemas, server grading, static-route integration and the shared acceptance ledger. No changes to `src/`, schemas, `public/app.js`, `content.js`, `ux.js`, learner/preview modules, lesson composition, the running demo or other teammates' files. No private push attempted; the Lead's pending export approval was not bypassed.

| Finding | Delivered scope | Remaining integration / acceptance |
|---|---|---|
| FB06 | Searchable vocabulary browser, available tag/lesson filters, source-aware search, paging with at most 50 word rows | Lead mounts in unified Studio; independent QA and Guy retest pending |
| FB07 | Specific-word selection and searchable tag references; stable IDs, existing order and unknown legacy references retained | Stable component instances and composition belong to Lead; no new manifest claim |
| FB10 | Guided vowel-requirement control removed; attempted `requireNikkud` edits rejected; legacy flag retained on save | Lead removes future grading requirement, including pinned old revisions; historical verdicts unaffected here |
| FB11 | Named visual/accessibility groups for concept metadata, settings, short and detailed feedback | Integrated Studio and independent QA pending |
| FB13 | EasyMDE 2.21.0, local JS/CSS, text toolbar, Hebrew direction, sanitized preview, disposal and fallback | Lead adds static routes and mounts for each text instance; independent QA pending |

All other findings remain with Lead. No source Hebrew, vocabulary meanings, accepted answers, teaching text, stable IDs or schemas were changed. Fixture copies are clearly synthetic, cloned from existing demo words with only fixture IDs/tags changed. Desktop owner checks do not constitute independent QA, Guy acceptance, mobile/phone-width/touch acceptance or a production release.

## Editor selection and assets

Verified official [EasyMDE repository](https://github.com/Ionaru/easy-markdown-editor), [README/API](https://github.com/Ionaru/easy-markdown-editor/blob/master/README.md), [changelog](https://github.com/Ionaru/easy-markdown-editor/blob/master/CHANGELOG.md) (2.21.0, 2026-05-03), and [MIT license](https://github.com/Ionaru/easy-markdown-editor/blob/master/LICENSE). Pinned `easymde: 2.21.0` in package/lock. `public/studio/vendor/easymde.min.js` and `.css` are exact installed distribution bytes, tested by SHA-256 comparison. No runtime CDN is needed.

Upstream's prebuilt bundle includes CodeMirror **5.65.15**, even though the npm dependency resolution installs 5.65.21. We use the upstream distribution without modifying its executable contents; do not equate the bundled and resolved versions. The bundle includes its own older Marked parser, but preview always uses the application's **Marked 18.0.14 + DOMPurify 3.4.16** through `createLessonRenderer`. MIT notices for EasyMDE, CodeMirror, bundled Marked and CodeMirror SpellChecker, plus upstream [Typo.js BSD notice](https://github.com/cfinke/Typo.js/blob/master/license.txt), accompany the assets. Spellchecking is disabled and no dictionary assets are shipped.

FontAwesome download, spellchecking, image upload, editor image previews, autofocus and autosave are disabled. Toolbar buttons have visible text, accessible names and tab stops. The existing sanitizer removes executable/form/style content; an inert template removes external images before active-document insertion. Author source bytes remain unchanged by preview. Images under `/media/` remain usable; hyperlinks retain the existing learner renderer's allowlist. Direction is a presentation setting; it never strips Nikkud or transforms source strings.

## Integration APIs

Import from `public/studio/markdown-editor.js`:

```js
const handle = mountMarkdownEditor(host, {
  value: instanceText,
  name: 'explanation', // hidden synchronized textarea; caller may use a per-instance name
  label: 'Lesson text',
  direction: 'auto', // auto | rtl | ltr
  onChange(value) { /* update this instance's unsaved text and dirty state */ },
  onDirectionChange(direction) { /* update unsaved presentation metadata */ }
});
await handle.ready; // EasyMDE instance on success, null with editable textarea fallback
handle.getValue();
handle.setValue(exactSource); // silent programmatic update
handle.setDirection('rtl');
handle.focus();
handle.dispose();
```

`handle.editor` exposes the established editor after `ready`. Always dispose before replacing a host or changing lessons. Late dependency completion after disposal mounts nothing. Disposal removes owned listeners, CodeMirror change/update hooks and EasyMDE's document listener, restores fullscreen overflow and detaches the UI. `dependencies` is a trusted test/embedding seam supplying `{EasyMDE, marked, purifier}`; never populate it from imported content. Default dependency loading is deduplicated per document and uses local routes.

Import from `public/studio/vocabulary-browser.js`:

```js
const browse = mountVocabularyBrowser(host, {
  words: content.words, lessons: content.lessons,
  pageSize: 50, // clamped to 1..50
  onSelect(id, originalWord) { /* open the selected entry's editor */ }
});
const choose = mountWordSelector(otherHost, {
  words: content.words, lessons: content.lessons,
  selectedIds: existingOrderedIds,
  onSelectionChange(ids) { /* retain this exact ordered reference list */ }
});
choose.getSelectedIds(); choose.setSelectedIds(ids);
const tags = mountTagSelector(tagHost, {
  tags: createVocabularyIndex({words: content.words}).tags,
  selectedTags: existingTags,
  onChange(tags) { /* update explicit tag selector references */ }
});
browse.dispose(); choose.dispose(); tags.dispose();
```

`onSelect(id, originalWord)` receives the original source object for lookup; the widget itself never mutates it. Caller must use normal explicit patches/CAS to edit content. Word labels show all stored pointed/unpointed/curated forms, meaning and ID, escaped for HTML. Search indexes the whole original object, including unknown nested source fields. Nikkud is ignored **only in the transient search key**, never in source content. Filters intersect. Lesson membership uses explicit `lesson.wordIds` plus a word's `lessonId` if present. For new manifest selectors, Lead can provide resolved lesson membership; this module does not redefine schema semantics.

Word results page in original source order. Selected IDs preserve their original order and unresolved legacy IDs; newly chosen IDs append in click order. No checkbox wall. The tag selector stores tag strings directly and never expands them into copied vocabulary IDs. Available and selected tag result lists each show at most 50 matches and invite refining the search. Multiple mounted selectors/editors retain independent state.

Guided exercise groups use `section role="group"` with an accessible name. Unlike new fieldsets, these do not add extra form-associated elements and therefore preserve existing app save/reload locking. Exact data keys remain `concept`, `explanationTime`, `feedback`, `feedbackDetails`, `nikkudOverride`, `allowLookup`. `requireNikkud` remains opaque legacy metadata and is no longer in the patch allowlist.

### Required static routes

Lead must allow these new routes in `src/server.js` and serve matching content types:

- `/studio/markdown-editor.js`
- `/studio/vocabulary-browser.js`
- `/studio/vendor/easymde.min.js`
- `/studio/vendor/easymde.min.css` (**text/css**, do not force all vendor assets to JS)

Existing `/rich.js`, `/vendor/marked.js`, `/vendor/purify.js`, `/studio/editor-fields.js`, and `/studio/studio.css` are reused. Widgets are deliberately unmounted in baseline `app.js`/`lesson-editor.js`; no claim that FB06/FB07/FB13 are complete in the ordinary Studio yet.

## Verification and limits

Final commands/results: `npm.cmd ci --ignore-scripts --no-audit --no-fund --fetch-retries=0 --fetch-timeout=20000` passed from the isolated lockfile, with no dependency-tree copy. `npm.cmd run verify` passed **190/190** checks. `node --test test/feedback18-guided-exercise.test.js test/feedback18-studio-ui.test.js test/studio-authoring.test.js test/feature-renderer-http.test.js test/app.test.js test/draft-api.test.js` passed **63/63** (a subset of the full run, not an additional total). The three guided-edit controls failed against the exact unchanged parent. Syntax checks for both new UI modules and the fixture server, and `git diff --check`, passed.

Mounted Browser checks used two newly started loopback fixtures at 57232 and 55760 (PIDs 87340 and 85780), both stopped after command-line identity verification. Native controls verified first-click selection after search, combined tag/lesson filters, keyboard Enter on Bold, two independent editor instances, safe preview and native HTTP 200 Stage. No external resource requests were observed. Whole-table fingerprints remained equal before intentional synthetic Stage; Stage was the sole observed writer and retained `requireNikkud: true`, the exact feedback and the unknown source sentinel. Final exercise-group screenshot and receipts reflect the final section-based markup.

Owner evidence lives in `evidence/feedback18-ui-owner/`. It contains test commands/output, failing parent controls, an exact unmodified baseline API control, synthetic Browser HTTP/table receipts and screenshots. The full test run exposed an inherited `draft-api.test.js` expectation missing Lead's existing `pairResults` field; the unchanged parent reproduces it. This branch updates only that expectation and asserts the actual per-word verdicts. No grading code changed.

Meaningful tests cover the exact bundled editor, toolbar changes, preview attacks, direction, source-byte preservation, load failure/disposal, 2,000-word search/filter/paging, selection order/remount, source-rich labels and unknown fields, native HTTP stage, zero-write conflict rejection, legacy metadata, and existing app lock/reload protection. Three new guided UI regressions fail against exact parent 8a26817. Browser testing found and fixed a search-blur first-click issue; its regression now proves the pointer target is not replaced by a redundant blur change.

For a fresh owner fixture, run `node docs/feedback18-ui-fixture/feedback18-ui-server.mjs`; it prints an ephemeral loopback URL. Its database is in memory, and `/fixture-receipts` records requests with before/after whole-table fingerprints. It does not start the ordinary demo or use its persisted data. Only the newly launched owner fixture process was stopped after verification. Screenshots cover desktop observations only. Independent candidate QA, final unified Studio wiring and Guy acceptance remain pending.
