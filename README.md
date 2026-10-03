# Hebleo 3.0 local demo

Private build: https://github.com/guylfe/hebleo-3.0. The [master specification](docs/MASTER_SPEC.md) remains the product source. The maintained [feature and acceptance checklist](docs/FEATURE_CHECKLIST.md) records working scope, missing work and Guy's separate results. The [UX checkpoint](docs/UX_UPDATE.md) explains this update and inspected source references.

Requires Node.js 24.19+; no third-party runtime dependencies. From this folder on Windows:

```powershell
npm.cmd ci --ignore-scripts
npm.cmd run verify
npm.cmd start
```

Open http://127.0.0.1:4173. Ctrl+C stops a foreground server; `npm.cmd run dev` watches changes. First start creates synthetic content and fictional Alex/Sam/Author profiles in ignored SQLite. Later starts retain progress. Existing synthetic fixtures receive an additive UX revision if no draft is pending; source content and learner history survive.

## Walkthrough

1. Continue or open Course. Each lesson portion has its own URL and course outline. Text-only lessons show text directly; linked video defaults to Watch, with Watch/Read choices when both exist.
2. Vocabulary always introduces full Nikkud. Switch Cards/Table, read notes and expand rich fields. My Hebrew searches roots, patterns, forms and other retained fields.
3. Complete Check/Apply. Try all six exercise families, taught sentence distractors, clear cloze wording and retained matching feedback. Reload to resume the exact question and answer against the saved content revision.
4. Settings groups immediate multiple-choice submission, sounds/animations and keyboard assistance. Continue remains separate. Exercise Nikkud controls have explicit labels and do not hide vowels from introduced vocabulary.
5. Try the owner-inspired Hebrew keyboard, English hints, physical-key conversion, Nikkud entry, cursor controls or device keyboard. Numbers select choices/ratings; Enter/Space check/reveal/continue; R replays available audio. Editable fields retain normal shortcuts.
6. Review a concept without leaving the question. After feedback, open vocabulary help or report a problem. Ask about a lesson/word opens authored help. Practice more prioritizes unresolved authored mistakes.
7. Review a bounded session using Hebrew-to-meaning, English-to-Hebrew, listening-first or sentence-context. Listening/sentence cards need linked audio/examples. Reveal, rate and Undo last rating to restore the preceding schedule.
8. Choose fictional Author for Studio. Edit core word fields or additional JSON, inspect dependencies and publish locally. Reports attach actual answers and source revisions; marking reviewed never changes grading.
9. Import [the synthetic CSV example](docs/examples/vocabulary-demo.csv). Required headers: `id,pointed,unpointed,curated,english`. Known optional rich fields map directly; other columns keep their original labels in sourceFields. Matching IDs update, new IDs append and absent words/columns survive. Raw Google masterfile needs an approved stable-ID/form mapping.
10. Author Settings exports/restores current content, three profiles, receipts, reports and pinned session snapshots. Restored answers require checking again after revision remapping. History/drafts/media are excluded; legacy two-learner backups remain supported.

## Media and optional AI

Word `audio` accepts an HTTPS URL or `{ "url": "https://..." }`. Related form/example audio is retained. Lesson `video` and exercise `explanationTime` support playback and concept timestamps. Approved files in ignored `uploads/` can use `/media/file.mp3` or `/media/lesson.mp4`; byte-range seeking supports MP3/WAV/OGG/M4A/MP4/WebM. No upload UI or automatic media import.

Audio supports play/pause/replay and normal/0.75× with pitch preservation. Optional record/replay comparison requires browser microphone permission, stays in this tab's memory, and clears on leaving the item; no scoring/upload. Native Hebleo recordings are not linked. Missing audio is labelled and disabled.

Authored help needs no provider. An optional server-side [Responses API](https://developers.openai.com/api/docs/guides/migrate-to-responses) adapter is available. Copy `.env.example` to ignored `.env`, set `HEBLEO_AI_KEY` and an explicit `HEBLEO_AI_MODEL`, then restart using npm start. No key/model is bundled. Requests send source context/question with `store:false`, without learner history; output remains optional assistance. Settings reports configuration presence, not verified live connectivity. External AI help requires the fictional membership entitlement.

## Validation and limits

`npm.cmd run verify` passes 30 checks: existing grading/import/publish/restore plus stable destinations, taught distractors, rich-field preservation, pinned resumes, exact undo, reports, authored remediation, media seeking, author routes and mocked AI boundaries. The checklist records actual browser evidence separately; this is owner verification, not named independent QA or Guy's acceptance.

All content remains synthetic. Real masterfile/course import, live Sheets/WordPress sync, original media linking, production login/entitlements, FSRS, final card pedagogy, independent schedules per type, roleplay/generated practice, speech scoring, offline/PWA, mobile apps and production deployment remain unfinished. Literal sentences do not rewrite when vocabulary changes. Colors are retained but displayed using a shared accent.

Demo profiles are freely switchable; author gates are local behavior, not secure authentication. The server binds loopback and rejects external hosts/cross-origin requests. Web payments remain in WordPress. Named specialist execution/reviews remain pending in [project status](docs/PROJECT_STATUS.md).
