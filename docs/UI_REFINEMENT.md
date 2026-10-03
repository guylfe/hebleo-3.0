# User-feedback refinement — 2026-10-03

Visual direction confirmed by Guy: **Hebleo branding, leaning clean**. This update refines the course player, spacing, typography and controls while retaining the owner keyboard's blue/cyan styling and lion asset. Content remains synthetic; no live WordPress or Sheets writes occurred.

## Keyboard

The floating launcher and overlay now reuse the actual owner plugin JavaScript/CSS and asset from `C:\Users\Trans\OneDrive\Documents\New project 3\hebleo-modern-hebrew-keyboard\assets`. The copy is adapted for app rendering, dialog placement, pinning, per-lesson highlights, Nikkud keys, composition-event handling, and active-field positioning. Original source files remain untouched. English equivalents are always visible. Pin now keeps an open panel across click-away and between questions; an unpinned panel dismisses on click-away. The simulated caret and native-keyboard suppression have been removed; editable fields retain their normal caret. Pin and physical conversion preferences persist per fictional learner.

Authors use **Studio → Lesson text & keyboard highlights** to specify distinct known/new key groups and one highlight color, rendered dark for known keys and bright for new keys. Legacy knownColor metadata remains importable but is no longer used for the display; newColor supplies the shared hue. Historical content releases are not rewritten. All keys remain usable. This does not implement a complete pedagogical key-restriction progression. Synthetic fixtures use explicit illustrative groups, not an approved reading sequence.

## Lesson content and matching

Text lessons use sanitized Markdown with headings, lists, tables, emphasis, code, links, images and expandable explanations. Studio provides a text editor, formatting insertion controls and a live preview. Optional `lesson.interactions` support authored `reveal` and `choice` widgets. Arbitrary scripts and embedded applications are excluded. This is a Markdown editor, not a complete WYSIWYG authoring system. A Hebrew phrase stays inside one RTL isolate, including when Markdown emphasizes part of the phrase; the earlier word-by-word buttons could reverse its visual order. Full-word lookups remain in vocabulary.

Images accept HTTPS links or `/media/` image files in ignored `uploads/`. PNG, JPEG, WebP and GIF are served locally. External author-linked HTTPS images make external requests; no image-upload UI is included.

Matching uses draggable word tiles and meaning targets. Mouse HTML drag/drop and pointer events are supported; select-word-then-meaning is the keyboard/touch alternative. Each meaning holds one word. Answers and submitted feedback retain the existing server grading and saved-position contract.

## Prefix tiles and versioned sessions

Ordering exercises can set `prefixTokenIndices` against their authored token array. Public trays remap those indices after interleaving taught distractors. Selected prefix tiles attach to the next selected token when composing and submitting the sentence: **אני + ב + בית → אני בבית**. No morphology, vowel changes or prefix boundaries are guessed. The synthetic lesson-2 fixture now uses the separate ב and בית choices. Distractors come from the current lesson and the preceding two.

The old `w-babayit` ID remains as a historical prefixed form (`baseWordId`, `prefix`, `noVocab`, `noCard`). Its original pointed form and meaning are retained within the base entry. It is no longer listed as a separate new vocabulary/review word. Existing card history is retained, and excluded forms do not appear in the current due queue. The artificial color on synthetic אני is removed.

Existing saved sessions remain pinned to their immutable content version. An **Start updated lesson** action explicitly starts the newer source and clears that lesson's current position/answers while keeping graded attempts, completed lessons, notes, bookmarks and review records. It does not silently remap old selected-token indices. Pending drafts prevent automatic fixture upgrades; publish/discard decisions remain deliberate.

## Source formatting contract

Each vocabulary item may retain `fieldFormatting`, keyed by canonical field or original extra-field label. Values use native Sheets CellData: `formattedValue`, `effectiveFormat` (or `userEnteredFormat`) and `textFormatRuns`. `sourceTheme` retains the spreadsheet theme colors. Rendered styles include exact RGB/theme foreground and cell-fill colors, text alignment/direction, bold/italic/underline/strike, and safe font names/sizes. Individual run boundaries use JavaScript/Sheets UTF-16 offsets, preserving vowel marks and explicit `bold:false` overrides. Runs apply only when displayed text matches the original `formattedValue`; editing canonical text never reapplies stale character offsets.

```json
{
  "fieldFormatting": {
    "pointed": {
      "formattedValue": "מִי",
      "effectiveFormat": {"textFormat": {"bold": false}, "backgroundColor": {"red": 1, "green": 0.95, "blue": 0.8}},
      "textFormatRuns": [{"startIndex": 0, "format": {"bold": true}}, {"startIndex": 2, "format": {"bold": false}}]
    }
  }
}
```

A read-only inspection of **Ultimate Vocabulary Masterfile / Sheet1** confirmed cell fills, source text colors and rich runs, including a run starting at index 2 within יַיִן. No real words were imported. JSON publication/export/backup preserves this metadata. **CSV cannot carry rich runs or cell formatting** beyond its explicit plain columns; live native-format synchronization and the approved stable-ID/full-form mapping remain unfinished. Original source formatting and renderer support are distinct from a completed source import.

Reference contracts: [Sheets CellData/text runs](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/cells#textformatrun), [Marked](https://marked.js.org/), [DOMPurify](https://github.com/cure53/DOMPurify).

## Help, questions and repeat practice

**Lesson help & questions** distinguishes authored explanations from questions. A real question form saves a local author inbox item with lesson/revision and optional word/exercise context. Studio can save human replies; learners see only their own questions. The queue is backed up, restored and protected by the existing demo author boundary. It sends no external message. Optional AI accepts actual questions only when a provider is configured; the current demo has no live AI connection.

**Repeat lesson questions** selects authored questions whose latest attempt in that lesson/version was incorrect. If none are incorrect, it repeats that lesson's core questions. It does not generate new exercises or infer a new difficulty level.

2026-10-04: Extra practice is optional. Every finish screen offers Next lesson or a course exit, even with unresolved core answers. Repeat sets include Skip extra practice before or after grading; leaving clears the extra-practice resume while preserving submitted attempts. Advancing does not grant lesson completion or enroll its words in review. Three actual-app/store regressions verify these paths; the full 56-check suite passes. Guy's Lesson 1 report is B12, awaiting retest.

## Flashcard Nikkud

`content.reviewPolicy.defaultNikkud` is the author's default (`full`, `curated`, `none`); initially full. Studio stages this policy through the regular publication preview. Learner `preferences.reviewNikkud` can follow that default or override it. Settings and Review show explicit controls. Recognition fronts use the chosen authored word form. Sentence fronts can remove supplied Nikkud, but do not manufacture missing pointed/partially pointed sentences. Listening-first fronts remain audio; answers retain fully pointed source Hebrew. Final templates and independent schedules per card type remain for pedagogy work.

## Verification

46 automated checks pass, including the prior 30. The new checks cover sanitized rich Markdown, RTL phrases across emphasis, exact source colors/runs and backup retention, prefix composition/grading, author highlights, owner keyboard insertion/pinning, pointer/HTML matching and accessible placement, user/author Nikkud preferences, question isolation/replies/backups, explicit new-version starts, image serving and author HTTP boundaries.

Mounted background browser verified the cleaner player, RTL source order in lesson-2 text, floating keyboard/English equivalents/highlight legend, keyboard clicks entering and saving אני, pin preference display, and typed feedback. Browser drag attempts initially produced no saved match; HTML drag/drop support was subsequently added alongside the tested pointer path. The browser lifecycle then ended, and a new binding was refused. Final visual positioning, final mouse-drag walkthrough, real touch/device behavior, microphone, live AI and native course media remain acceptance checks. Guy's reported defects are retained in the feature checklist; fixes await his retest.

## Compact keyboard follow-up — 2026-10-03

Guy requested removal of the bottom color legend, dark/bright shades of one hue, Nikkud immediately left of A→א, and restoration of the left-arrow/space order. The tool row is Nikkud, A→א, left arrow, space, right arrow, Enter. The Nikkud popover has five full key slots (a/e/i/o/u), opens without changing panel height, and shows alternatives to the left after a 1500ms hover. Leaving before the delay cancels it; the expanded row remains clickable as the pointer enters it. Left-arrow on a focused sound button also opens alternatives for keyboard access; Escape dismisses the picker. Sheva has its own full button slot with no visible text label, outside the auxiliary marks control. That control contains dagesh and the right Shin dot. The left Shin/Sin dot is grouped under o, while retaining its distinct Unicode mark; both dots display on ש. Hataf qamats is grouped under a at Guy’s explicit request. Narrow viewports shift the picker inward so left-opening alternatives stay on screen.

Normal fields remain writable with their native caret; the keyboard no longer changes inputmode, readOnly or virtualkeyboardpolicy. Opening the launcher focuses the actual answer field, and temporary page padding allows the field to scroll above the overlay. Read-only fields are respected. Pin has a visible pressed state and persists through the learner preference API. The existing header layout is retained; suggestions and swipe typing are discussion items, and mobile-native keyboard coordination is deferred.

Validation: 53 automated checks passed, including six focused keyboard tests and one actual-app keyboard/preference test. Mounted background browser confirmed the compact row order, absent legend, Nikkud sound column, native answer-field caret and field visibility. The final hover/alternative and click-away pin visual walkthrough could not complete after driver-owned browser lifecycle/endpoint loss despite one re-preparation. Those manual checks, real mobile behavior and Guy's acceptance remain Pending. QA used an isolated in-memory demo on port 4174, without editing the persistent 4173 learner database.

### Owner Nikkud grouping correction — 2026-10-03

Guy explicitly placed חטף קמץ in a, the left Shin/Sin dot in o, the right Shin dot under …, and clarified that stop means שווא. Sheva is now its own category/button beneath the five sound categories; the visible stop label was subsequently removed at Guy’s request. Canonical Unicode insertion is preserved: right Shin U+05C1, left Sin U+05C2, Holam U+05B9 and Sheva U+05B0 remain distinct even where visual positions resemble one another. This changes keyboard grouping only; no authored content, release IDs or learner records are migrated. Existing keyboard checks verify placement and actual insertion; manual hover/device acceptance remains Pending.
