# Hebleo 3.0 local demo

Private build: https://github.com/guylfe/hebleo-3.0. The [master specification](docs/MASTER_SPEC.md) remains the product source. The maintained [feature and acceptance checklist](docs/FEATURE_CHECKLIST.md) records working scope, missing work and Guy's separate results. The [UX checkpoint](docs/UX_UPDATE.md) and [user-feedback refinement](docs/UI_REFINEMENT.md) explain contracts, source references and limits.

Requires Node.js 24.19+. Pinned Marked/DOMPurify provide sanitized lesson Markdown; jsdom is used for regression checks. From this folder on Windows:

```powershell
npm.cmd ci --ignore-scripts
npm.cmd run verify
npm.cmd start
```

Open http://127.0.0.1:4173. Ctrl+C stops a foreground server; `npm.cmd run dev` watches changes. First start creates synthetic content and fictional Alex/Sam/Author profiles in ignored SQLite. Refreshes/restarts of the same app build retain progress. When `npm start` launches a new app build it clears all three fictional profiles’ lesson/review progress once, as requested for testing (`--demo-fresh-progress`, or `HEBLEO_DEMO_FRESH_PROGRESS=1`); settings, authored content/drafts and local questions/reports remain. The check runs only at startup, so editing files while the server runs never wipes new progress; `npm.cmd run dev` never resets. Existing synthetic fixtures receive an additive UX revision if no draft is pending; source content and learner history survive.

## Walkthrough

1. Continue or open Course. Each lesson portion has its own URL and course outline. Text-only lessons show text directly; linked video defaults to Watch, with Watch/Read choices when both exist.
2. Vocabulary always introduces full Nikkud. Switch Cards/Table, read notes and expand rich fields. My Hebrew searches roots, patterns, forms and other retained fields.
3. Complete Check/Apply. Try all six exercise families, drag-and-drop matching, taught sentence distractors, separate plain prefix tiles attached closely to the following word and clear cloze wording. Reload to resume the exact question and answer against the saved content revision.
4. Settings groups immediate multiple-choice submission, sounds/animations and keyboard assistance. Continue remains separate. Exercise Nikkud controls have explicit labels. Flashcard fronts have a separate learner preference and author default; introduced vocabulary stays fully pointed.
5. Try the original owner-plugin floating Hebrew keyboard, Pin/Close, English equivalents and author known/new highlights, physical-key conversion, compact Nikkud sound column (hover 1.5 seconds for alternatives), cursor controls or device keyboard. Known/new keys use dark/bright shades of one hue. Pin stays open on click-away; unpinned dismisses. Numbers select choices/ratings; Enter/Space check/reveal/continue; R replays available audio. Editable fields retain normal shortcuts.
6. Review a concept without leaving the question. After feedback, open vocabulary help or report a problem. Lesson help & questions opens authored help and a real local question form; Author replies in Studio. Repeat lesson questions prioritizes unresolved authored mistakes, otherwise repeats the core set. Finish screens always offer onward navigation; extra practice is optional and includes Skip extra practice. Wrong feedback and the finish screen offer individual question retries. The lesson bar counts distinct questions answered correctly, including corrections; visiting or missing a question does not fill it. Continuing preserves attempts within the current build and does not grant completion for unresolved core questions.
7. Review a bounded session using Hebrew-to-meaning, English-to-Hebrew, listening-first or sentence-context. Listening/sentence cards need linked audio/examples. Reveal, rate and Undo last rating to restore the preceding schedule.
8. Choose fictional Author for Studio. Edit word fields/JSON, lesson Markdown with preview, known/new key groups/colors and default flashcard Nikkud; inspect dependencies and publish locally. Reports attach actual answers and source revisions; marking reviewed never changes grading.
9. Import [the synthetic CSV example](docs/examples/vocabulary-demo.csv). Required headers: `id,pointed,unpointed,curated,english`. Known optional rich fields map directly; other columns keep their original labels in sourceFields. Matching IDs update, new IDs append and absent words/columns survive. Raw Google masterfile needs an approved stable-ID/form mapping.
10. Author Settings exports/restores current content, the pending draft, three profiles, receipts, reports, question/reply inbox and every content revision that history points at (`hebleo-demo-backup-v2`). Restore remaps attempts, resumes, questions and reports to the same new revision IDs, so resumed feedback survives. Every v2 attempt, resume, question and report must agree with its carried revision (the lesson exists, the exercise belongs to that lesson, an optional word exists), and v2 must declare `storeSchemaVersion: 2`, the only schema this build restores; anything else is refused before any write. Older v1 backups (which predate the field; absent, 1 or 2 accepted) still restore; their attempts from uncarried or disagreeing revisions keep their grade and become explicit `legacyRevisionId` links instead of pointing at the wrong revision. Unreferenced history and media are excluded; legacy two-learner backups remain supported.

Saved lessons use their original source revision. To see a newer fixture (including lesson-2 prefix tiles), choose **Start updated lesson**; it resets that lesson’s current position/answers while preserving graded attempts and review history.

## Media and optional AI

Word `audio` accepts an HTTPS URL or `{ "url": "https://..." }`. Related form/example audio is retained. Lesson `video` and exercise `explanationTime` support playback and concept timestamps. Approved files in ignored `uploads/` can use `/media/file.mp3` or `/media/lesson.mp4`; byte-range seeking supports MP3/WAV/OGG/M4A/MP4/WebM and PNG/JPEG/WebP/GIF. No upload UI or automatic media import.

Audio supports play/pause/replay and normal/0.75× with pitch preservation. Optional record/replay comparison requires browser microphone permission, stays in this tab's memory, and clears on leaving the item; no scoring/upload. Native Hebleo recordings are not linked. Missing audio is labelled and disabled.

Authored help needs no provider. An optional server-side [Responses API](https://developers.openai.com/api/docs/guides/migrate-to-responses) adapter is available. Copy `.env.example` to ignored `.env`, set `HEBLEO_AI_KEY` and an explicit `HEBLEO_AI_MODEL`, then restart using npm start. No key/model is bundled. Requests send source context/question with `store:false`, without learner history; output remains optional assistance. Settings reports configuration presence, not verified live connectivity. External AI help requires the fictional membership entitlement.

## Validation and limits

`npm.cmd run verify` passes 140 checks (2026-10-06, branch lead/b2-draft-api): existing grading/import/publish/restore plus Studio draft/preview/rehearsal, blank recognition distractors refused before any write, nested-module demo resets, restore link and schema-version rejection, mandatory reported-attempt identities, report key/identity agreement, stable destinations, single-question retries/correct-answer progress, once-per-build demo resets, optional-practice exits with retained history, taught distractors, rich-field preservation, pinned resumes, exact undo, reports, authored remediation, media seeking, author routes and mocked AI boundaries. The checklist records actual browser evidence separately; this is owner verification, not named independent QA or Guy's acceptance.

All content remains synthetic. Real masterfile/course import, live Sheets/WordPress sync, original media linking, production login/entitlements, FSRS, final card pedagogy, independent schedules per type, roleplay/generated practice, speech scoring, offline/PWA, mobile apps and production deployment remain unfinished. Literal sentences do not rewrite when vocabulary changes. Native source colors and UTF-16 rich text runs render from retained CellData; live formatting sync remains unfinished. CSV cannot carry rich cell formatting.

Demo profiles are freely switchable; author gates are local behavior, not secure authentication. The server binds loopback and rejects external hosts/cross-origin requests. Web payments remain in WordPress. Named specialist execution/reviews remain pending in [project status](docs/PROJECT_STATUS.md).
