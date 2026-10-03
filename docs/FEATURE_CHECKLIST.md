# Hebleo implementation and acceptance checklist

Initial inventory baseline: 2026-10-03; inspected application commit `0bcd99988a8acce9ee91d8d7d2106e46590d539f` and documentation commit `c0bb85d9370b4f1c4b4222b574f6fa6d1121801e`. This inventory covers the initial-build brief and feature families in the supplied master specification. Future/optional features listed here are not a promise that all belong in the first release.

This file is the shared feature-status and user-testing record. README is the quick walkthrough; PROJECT_STATUS records milestones; MASTER_SPEC remains the product source. The 2026-10-03 UX update implements the accepted discussion decisions; see [UX checkpoint](UX_UPDATE.md) for contracts and source references.

Current verified refinement application checkpoint: `5220a59ab6549d3343b29e15e48df2a2233664e2`. See [UI refinement](UI_REFINEMENT.md). Guy's feedback below refers to the preceding application `445d9d2` (documentation HEAD `9a35879`); the new fixes await his retest. Documentation-only commits do not imply extra behavior.

## Status and evidence

- **Implemented locally:** working code in the demo; no production readiness or user acceptance implied.
- **Partial:** a working subset, with its missing portion stated explicitly.
- **Simulated:** fictional local accounts/events only; no live service integration.
- **Not implemented:** absent from this build, even if proposed in planning documents.
- Evidence **A** = automated test coverage; **M** = owner-operated browser check; **C** = code inspection. Evidence describes scope, not a blanket guarantee.
- **Guy test** starts as **Pending** for every available feature. Only Guy's reported result changes it to Pass/Fail/Blocked. Automated success and independent QA are recorded separately.

Test URL when the local server is running: http://127.0.0.1:4173. Startup and the synthetic CSV example are linked from README. Use fictional Alex/Sam learner profiles and Author for Studio. Published content is shared; learner records remain separate. New backups include all three profiles.

## Implemented locally: ready for user testing

| ID | Feature | What to test / expected result | Evidence | Guy test |
| --- | --- | --- | --- | --- |
| L01 | Home dashboard and navigation | Open Your path, Course, Review, My Hebrew, Settings. Choose the fictional Author profile to expose Studio. | C, M (learner navigation) | Pending |
| L02 | Resume or next unfinished lesson | Home offers the saved portion of the last unfinished lesson, otherwise the next unfinished lesson. When all are complete, it offers review and revisiting through the course. | A, C, M (course completion destination) | Pending |
| L03 | Three illustrative lessons | Nine base words plus one retained historical prefixed-form ID, and nine core exercises; explanation, vocabulary and practice on separate portion routes. Lesson 1 has a separate Check portion. | A, M (portion navigation) | Pending |
| L04 | Text explanations and rich lesson vocabulary | Introduced vocabulary has full Nikkud. Markdown lesson text supports images, tables, formatting and authored interactions. Cards and Table retain complete source fields. | A (Markdown/RTL/field retention), C; M (earlier rich entries) | Fail reported 2026-10-03: Hebrew phrase order and synthetic אני highlight on prior UX build; fixed, retest Pending |
| L05 | Correct/incorrect feedback | Feedback retains the actual submitted answer and accepted answer; authored explanation/details appear when supplied. Continue is separate from feedback. | A, M (recognition/typing) | Pending |
| L06 | Completion and attempts | Answer every core question correctly at least once, across attempts if needed; lesson becomes complete and its words join review. Wrong attempts remain saved. | A | Pending |
| L07 | Lesson recap and targeted repeat practice | Finish a set, then Practice more prioritizes unresolved wrong answers in that lesson/revision; otherwise repeats authored core exercises. Generated/new practice sets are absent. | A, C | Pending |
| E01 | Multiple-choice recognition | Lesson 1 Check and lesson 3 Apply: select the meaning. Enable immediate submission in Settings; selection grades immediately but Continue remains separate. | A (grading/preferences), M (immediate recognition) | Pending |
| E02 | Typed Hebrew | Lesson 1 Apply question 1: type Hebrew for I, with or without vowels under default rules. | A, M | Pending |
| E03 | Drag-and-drop matching | Lesson 1 Apply question 2: drag words onto meanings; keyboard/touch users can select a word then its meaning. One word per meaning; submitted selections and saved feedback persist. | A (pointer/HTML events, placement, grading/resume), C; final browser drag/touch Pending | Change requested 2026-10-03 from dropdowns; retest Pending |
| E04 | Sentence building with separate prefixes | Ordering trays contain at least four taught distractors from the current/prior two lessons. Authored prefix tiles attach to the next chosen word (אני + ב + בית → אני בבית); variants remain explicitly accepted. | A (tray/prefix composition/grading), C | Change requested 2026-10-03: separate prefix buttons; retest Pending |
| E05 | Typed cloze | Lesson 2 Apply question 2 says Type the missing word. Enter the missing pronoun. Its pedagogical value remains under review. | A, C | Pending |
| E06 | Sentence transformation | Lesson 2 question 3 and lesson 3 question 2: change the subject/form as instructed. | A (grading), C (UI) | Pending |
| E07 | Server-side grading and explicit accepted alternatives | Edit a full JSON exercise's accepted answers, stage/publish it, and test alternatives. Answers are not automatically generated. | A (all six grading families), C (alternative list) | Pending |
| E08 | Hebrew normalization | Default typed checks ignore vowel marks, direction controls, selected punctuation, and extra spaces. Wrong spelling/final-letter substitutions stay wrong. | A | Pending |
| E09 | Exact-vowel requirement | Available through full JSON import: set typing exercise requireNikkud=true; unpointed answer fails and authored pointed form passes. No Studio toggle yet. | A | Pending |
| H01 | Explicit Nikkud settings | Exercise modes: Lesson-authored / With / Without Nikkud. Vocabulary stays full. Separate flashcard control follows an author default or learner override. | A (preferences/policy), C; M (earlier Settings) | Correction 2026-10-03: admin/user flashcard choice; retest Pending |
| H02 | Contextual full-word entry | Open a vocabulary entry to inspect fully pointed Hebrew, meaning, notes, all retained fields and native audio. Rich lesson phrases are RTL units rather than automatic per-word buttons. Closing preserves the lesson position. | C, M (earlier word dialog) | Pending |
| H03 | Floating Hebrew keyboard and author highlights | Original owner-plugin overlay with launcher, Pin/Close, always-visible English equivalents, conversion/caret/backspace/Nikkud. Studio specifies separate known/new keys and colors per lesson. | A (owner code insertion/pinning/highlights), M (floating overlay, English hints, typed אני, pin display); final positioning/touch Pending | Fail reported 2026-10-03: inline keyboard too far from fields; revised, retest Pending |
| R01 | Manual and completion-based review enrollment | Add a word from a lesson/library, or complete a lesson; cards are created once. | A | Pending |
| R02 | Initial card presentations and configurable front Nikkud | Recognition, translation, listening-first and sentence fronts need appropriate authored sources. Studio sets a Nikkud default; learner Settings/Review can follow or override it. Revealed word answers stay fully pointed with available audio. Types share one schedule per word. | A (policy preview/persistence/override), C; M (earlier recognition/reveal) | Correction 2026-10-03: no automatic unpointed-front assumption; retest Pending |
| R03 | Again / Hard / Good / Easy ratings | Rate recall and reload; due dates, interval, and repetition count persist. Again schedules ten minutes; Hard one day; Good/Easy expand a simple interval. This is not FSRS. | A | Pending |
| R04 | Published vocabulary in review | Enroll a word, publish a meaning/note correction, then reopen Review; the card resolves the new canonical word. | A | Pending |
| N01 | Rich vocabulary search | My Hebrew searches pointed/unpointed Hebrew, English, notes, root, pattern, forms and other retained fields. Search normalizes Nikkud. | A (helper), M (rich entry/search) | Pending |
| N02 | Word bookmarks | Star/unstar words and reload; bookmark state remains with the selected learner. | C, A (preservation across publish/rollback) | Pending |
| N03 | Personal word notes | Bookmark a word to expose its note box; save a note and reload/switch users. Notes belong to that learner. | C, A (storage/preservation) | Pending |
| S01 | Vocabulary editor | Author profile only: edit core forms/meaning/notes and additional JSON fields without discarding rich source data. Save a draft before publication. | A, C; earlier M (core editor) | Pending |
| S02 | Change and dependency preview | Draft preview lists changed objects/affected lessons, including default flashcard Nikkud policy. Separate Markdown preview shows edited lesson text; full draft lesson execution is absent. | A, C; M (earlier dependency preview) | Pending |
| S03 | Deliberate atomic publication | Publish a draft; latest word-linked lesson/practice/library/review views use the new source. Existing open lesson remains pinned to its version. | A, M (publication) | Pending |
| S04 | History and content rollback | Inspect numbered revisions/timestamps/reasons; restore an earlier revision. A new revision is created and learner attempts/notes/bookmarks/cards remain. | A | Pending |
| S05 | Full content JSON import/export | Export/edit/import a full content copy, stage, inspect impact and publish. JSON retains source cell/rich-run formatting, lesson Markdown/interactions, highlights and prefix metadata. Studio also edits lesson text/highlights/default card Nikkud directly. | A (schema/fidelity), C | Pending |
| S06 | Vocabulary CSV import with rich fields | Required explicit IDs/forms remain; known rich columns map to fields and other columns retain their original names in sourceFields. Quoted notes/newlines and omitted existing columns survive. Raw masterfile needs an approved ID/form mapping. | A (parser/fidelity/publish/backup), C (file wiring) | Pending |
| S07 | Invalid content rejection | Try duplicate IDs, missing forms, broken references, unsupported types/renderers, or malformed CSV. Import must fail without replacing active content or an existing valid draft. | A | Pending |
| S08 | Reusable component order and portion routes | Move vocabulary first, publish, reopen a fresh session; manifest order determines portion order. Exactly three manifest block types remain; optional checkExerciseIds add a separate Check portion. | A, C | Pending |
| S09 | Basic source/selector/renderer/options contract | Full JSON can select words by another lesson ID and hide vocabulary notes; validated renderer resolves canonical rows. Broader selectors are absent. | A (selector), C (option rendering) | Pending |
| D01 | Persistent records and exact lesson resume | Reload/restart: learner data plus lesson revision, portion, question, typed/matching answer, tray selections and submitted feedback persist. Navigation flushes pending saves. | A, M (reload/typing) | Pending |
| D02 | Local backup export/restore | Author exports all three profiles, current content, replay receipts, reports, question/reply inbox and pinned session snapshots. Restore remaps sessions and requires feedback recheck. History/drafts/media excluded; legacy two-profile backups supported. | A (atomic restore/retention), C | Pending |
| D03 | Invalid restore rejection | Invalid content/learner/card backup must fail without partially replacing data. This is basic schema validation, not a completed security audit. | A | Pending |
| D04 | Content-version-safe resumed grading | Open/resume a lesson across publication: answers grade against its saved immutable revision. Restored sessions retain their source snapshot. | A, C | Pending |
| D05 | Stale publish/rollback protection | API/JSON-level test: a request with an old active revision must fail rather than overwrite a newer publication. No multi-editor draft merge. | A | Pending |
| D06 | Duplicate operation protection | API-level test: repeat an attempt/rating/event request ID with identical data; no second attempt/rating/event applied. Conflicting ID payload is rejected. | A | Pending |
| O01 | Repeatable startup and demo seeding | Node 24.19+; npm.cmd ci --ignore-scripts, npm.cmd start. First run seeds SQLite; later starts retain data. No one-click reset. | A (SQLite reopening), prior HTTP health check | Pending |
| O02 | Local service boundaries | Server binds loopback; HTTP checks reject unknown demo users, external hosts, cross-origin requests, non-JSON/malformed bodies, and unknown files. Basic validation/size caps/CSP are present; not production auth. | A (selected HTTP cases), C (other guards) | Pending |
| O03 | Private GitHub checkpoints and CI | Repo guylfe/hebleo-3.0 is private; source/docs/tests are pushed, local DB/logs are excluded, GitHub Actions runs checks. | Prior remote privacy/push/CI evidence | Pending |
| L08 | Separate lesson portions and course outline | Learn, optional Check, Vocabulary, Apply, Finish have distinct URLs. Chapter/lesson navigation shows completion; outline collapses on smaller screens. | A, M | Pending |
| R05 | Undo latest review rating | Rate, then Undo last rating. The exact preceding schedule returns once; replaying the old rating cannot apply it again. | A, M | Pending |
| R06 | Short review session | Choose 1–100 due cards and an initial presentation; clear completion and return-to-course actions. | A (preferences), C, M (start/reveal) | Pending |
| M01 | Native recording playback controls | Linked native recordings: play/pause, replay and normal/slower speed with pitch preservation. Audio available for words/forms/examples; listening front hides writing until reveal. No synthetic speech. | A (safe URL/range serving), C; real-media playback acceptance pending | Pending |
| M02 | Local voice comparison | Record yourself after browser microphone permission, stop and replay; maximum 60 seconds. Tab-local recording clears on leaving item; no upload/scoring. | C; microphone walkthrough pending | Pending |
| X01 | Immediate interaction and optional feedback | Settings groups immediate single-choice submission, separate Continue, sounds/animations and keyboard assistance. Reduced motion respected. | A (preference validation), M (immediate submission) | Pending |
| X02 | Review concept without losing question | Exercise opens authored text/video/timestamp in dialog; closing restores the current answer/question. | C, M | Pending |
| X03 | Learner error report and author queue | Report after feedback attaches actual answer/exercise/revision. Author marks reviewed; reports never alter grades or accepted answers. | A, C, M (report submission) | Pending |

## Simulated: test the local rules, not a live integration

| ID | Feature | What to test / expected result | Evidence | Guy test |
| I01 | Fictional learner/author profile switch | Alex and Sam keep separate learner data and cannot use Studio APIs. Author can edit content and inspect reports. This selector/header is a local demo role boundary, not secure login. | A (isolation/routes), C | Pending |
| I02 | Membership start/cancellation | Settings test cancellation retains course/basic review. Optional external AI help requires membership; authored help remains available. No WordPress calls. | A | Pending |
| I03 | Course purchase/refund | Simulate refund: lesson attempts/enrollment/review are gated; stored progress remains. Simulate purchase: access returns. Vocabulary/content are still exposed in this demo, so this is not production content protection. | A | Pending |

## Partial implementations: available portion and missing portion

| ID | Area | Available now | Still missing | Evidence | Guy test |
| P01 | Continue / remediation | Stable next lesson ID, final course destination, authored explanation panel and unresolved-mistake practice selection. | New authored extra pools, adaptive hints/concept mastery and generated practice. | A, M (lesson 1 to 2) | Pending |
| P02 | Watch / Read | Native HTML video when linked; default Watch with a visible Watch/Read selector when text also exists. Text-only lessons show text directly. Optional concept timestamp. | Real course media mapping, transcript/subtitle sync and persisted format choice. | A (defaults/URL validation/range serving), C | Pending |
| P03 | Vowel overrides | Exercise-specific mode overrides word-linked recognition/matching display; locked-mode badge and optional pointed-answer requirement. | Global override behavior for literal sentence tokens/context; visual authoring toggles, deliberate course-wide vowel fading. The cloze fixture alone does not prove all override behavior. | C, A (pointed requirement) | Pending |
| P04 | Review / HebLearn | Due queue, simple intervals, four initial presentations, source audio controls and exact latest-rating undo. | FSRS migration/configuration, independent cards per type, learning steps, suspension UI, decks and final pedagogy/templates. | A, C, M (recognition/undo) | Pending |
| P05 | Lesson Studio | Author word/extra-field editor, Markdown lesson editor with insertion tools/live text preview, authored inline widget JSON, key highlights/colors, card Nikkud default, report and question/reply inbox. | Full WYSIWYG and visual exercise/curriculum editing, arbitrary blocks, complete draft execution preview, production roles and multi-editor handling. | A, C | Pending |
| P06 | Source formatting | Native CellData foreground/fill/theme colors, UTF-16 text runs, explicit bold resets and safe font/emphasis/alignment/direction render in vocabulary. Metadata survives JSON publication/export/backup. | Live native Sheets-format synchronization and approved real-data ID/form mapping; CSV does not carry rich runs. No pixel-identical spreadsheet claim. | A (exact colors/runs and retention), source inspected read-only | Fail reported 2026-10-03: source formatting missing; renderer fixed, source sync/retest Pending |
| P07 | Automatic propagation | Word-linked recognition/typing/matching, vocabulary/library/review use canonical words. | Sentence bank and canonical tokens; editing a word does not rewrite literal sentence prompts, ordering tokens, cloze/transformation answers, or media. Already open views refresh on action/navigation; no live push subscription. | A, C | Pending |
| P08 | Progress / mistakes / stats | Exact saved position, actual attempts/answers, aggregates and targeted authored repeat practice. | Dedicated mistake bank, mastery/time tracking, attained goals/streaks, persistent video preference and analytics. | A, C, M (resume) | Pending |
| P09 | Responsive/accessibility foundations | RTL/bdi, labels, feedback announcements, numbered choice/rating shortcuts, answer/reveal/continue and replay shortcuts, reduced motion, labelled small-screen navigation and collapsible course outline. | Full real-device, screen-reader, keyboard-only, zoom/contrast/RTL punctuation acceptance; adjustable text and transcripts. | C, M (desktop and narrow window) | Pending |
| P10 | Content objects and backup | Stable word/lesson/exercise IDs; rich vocabulary; immutable source snapshots; current learner/content/reports and pinned-session export. | General registry, full history/draft/media restore, automatic backups and disaster recovery. | A, C | Pending |
| P11 | Authored help, real questions and optional AI | Lesson help & questions shows authored context plus an actual local author-question form; author replies and learner isolation persist/back up. Optional provider adapter accepts actual questions when configured. | Live AI connection/verification, remote instructor notifications, roleplay/generated practice. Local inbox sends no external message. | A (queue/reply/access/backup and mocked AI), C; earlier M (authored help) | Fail reported 2026-10-03: Ask only expanded explanation; revised, retest Pending |

## Not implemented: remaining specification inventory

| ID | Missing feature / work | Scope note |
| --- | --- | --- |
| U01 | Import real Hebleo curriculum/masterfile | Demo uses synthetic fixtures; no verified source content or approved replacement sequence. |
| U02 | Curriculum redesign and master sheet | Real-course audit, approved micro-lesson splitting/resequencing, Preserve/Improve/Reconsider proposals, deliberate spiral/scaffolding/extra-practice mapping. |
| U03 | Original course media import and general media registry | Playback and local /media streaming exist (P02/M01); native Hebleo files are not linked. Upload/replacement/provenance, images/PDFs and reusable media IDs remain. |
| U04 | Full LearnDash course parity | Existing course/chapter coverage, quizzes, enrollments, progress, teaching/media behavior have not been reproduced. |
| U05 | Additional exercise interactions | Multi-select, typed English, dropdown cloze, audio-to-Hebrew/meaning, dictation, sound discrimination/minimal pairs. |
| U06 | Specialized Hebrew exercises | Root/pattern identification/prediction, noun-gender/conjugation exercises, add/remove Nikkud as distinct exercise types. Existing generic typing/transformation is not a morphology engine. |
| U07 | Graded open and spoken exercises | Local record/replay comparison exists (M02), without scoring. Open descriptions, communicative responses and dialogue completion remain absent. |
| U08 | New practice pools and full adaptive learning | Existing authored mistakes can be selected (L07/P01). Additional human-authored pools, adaptive hints, concept mastery and standalone practice remain absent. |
| U09 | Pedagogy-driven keyboard progression | Per-lesson known/new highlights and author colors now exist (H03). Per-exercise restricted/subtle/none progression and recall safeguards remain absent. |
| U10 | Genuine FSRS and richer review | Algorithm/configuration decision, migration from old custom SRS, card templates/multiple modes/decks; see P04 for working subset. |
| U11 | Live Google Sheets integration | Authentication/configured source, remote fetch/diff/publish/sync and formatting; CSV export/import is the only spreadsheet route. |
| U12 | General reusable content registry | Canonical sentences/concepts/explanations/media/readings/dialogues/practice pools/review templates and cross-object propagation; current explanations live in lesson records. |
| U13 | Full visual curriculum/content builder | Rich object CRUD, course/chapter ordering, component editor/settings/selectors/drag-drop, visual draft preview; see P05. |
| U14 | Student/admin operations | Real users, grants/purchases/subscriptions/progress administration, instructor roles, audit history. |
| U15 | Production accounts | Signup/login/logout/password recovery, secure sessions, production admin permissions, learner identity verification. |
| U16 | WordPress identity and entitlement bridge | Real SSO, signed verified purchase/refund/subscription events, source audit, initial entitlement reconciliation. Existing web checkout stays in WordPress; a replacement checkout is not requested. |
| U17 | Broader entitlement cases | Trials, gifts, manual grants, expiration/renewal logic, coupons, premium feature gates, multi-course products, Apple/Google billing or restore-purchase behavior. |
| U18 | Hosted backend and deployment | Final hosting/server choice, domain setup, deployment/staging environments, hosted database/media storage, production operation. |
| U19 | Existing learner migration | WordPress/LearnDash accounts, purchases, enrollments, lesson/quiz/SRS progress, subscriptions and Q&A mapping, rehearsals, rollback, reconciliation. |
| U20 | iOS/Android apps | Native packaging, shared production identity/backend, app-store distribution and mobile billing decision. |
| U21 | PWA and offline downloads | Installable app, chapter/media cache, offline exercises/review, reconnect queue/conflicts. Local SQLite on the server is not browser offline support. |
| U22 | Cross-device synchronization | Device sessions, concurrent progress/review merging, conflict policies and tested recovery. |
| U23 | Speech recognition / pronunciation evaluation | Recording pipeline, native reference comparison, stress/sound scoring, speaking feedback. |
| U24 | Advanced AI tutor and live configuration | Authored contextual help plus optional server adapter exist (P11); no live model verified. Roleplay/conversation, generated practice, reading discussion and writing feedback remain absent. |
| U25 | Guided immersion / reading library | Stories/articles/news/listening/dialogues/media feeds; known/weak/new-word coverage, tap dictionary/audio, learner-level matching. |
| U26 | Community and instructor access | General/lesson discussion, contextual Q&A, private/public instructor answers and FAQ reuse, announcements, subscriber areas, moderation/reports. |
| U27 | Search beyond vocabulary | Word fields including root/pattern/forms are searchable (N01). Concepts/lessons/sentences/Q&A/readings and relevant practice search remain absent. |
| U28 | Expanded notebook | Saved sentences/exercises/readings, custom collections/decks, favorite exercises and dedicated saved-only views. Current word bookmarks/notes work. |
| U29 | Broader motivation features | Brief optional completion animation and feedback sounds exist (X01). Streaks/freezes, XP, achievements, leaderboards/challenges and attained goals remain absent. |
| U30 | Onboarding and study plans | Goals/motivation questionnaire, placement, recommended pace, weekly plans and actual daily time/goal attainment. |
| U31 | Notifications | Due/streak/study reminders, instructor/community replies and new-content notifications with granular controls. |
| U32 | Full analytics | Time/weak skills/mastery, exercise/lesson reporting, drop-off, review adherence, D2/D7 retention, activation/conversion/cancellation. |
| U33 | Localization architecture/UI | Additional instruction languages and localized translation fields; prototype hardcodes English. |
| U34 | Production security/privacy | Secure auth/admin roles, rate limiting, privacy controls, learner account deletion/export, security review and hardened input handling. Demo-wide backup is not privacy-compliant account export. |
| U35 | Reliability/operations | Automated database/media backups, migration engine, full restore procedures/history export, monitoring/alerts, structured audit logs, production recovery. |
| U36 | Feature flags and staged rollout | Beta cohorts, percent rollout and controlled new-feature exposure. |
| U37 | Full acceptance automation | Browser end-to-end/mobile/accessibility suites; real login/WordPress sync/migration/offline tests cannot exist as passing feature evidence before those features are built. |
| U38 | Named independent QA and release checks | Neither named reviewer has checked the application. Earlier owner tests/CI do not count as teammate verification. |
| U39 | Viable agent execution folders | Six bots exist; initial architect/curriculum/lead runs failed on the folder lock. Isolation proposal lacks an applied receipt in this conversation; execution is unresolved. |
| U40 | One-click reset/demo administration | First-start seed exists; no reset UI/command, arbitrary demo-user creation, or safe real-data administration. |

## Known issues requiring fixes or targeted checks

| ID | Status | Reproduction / expected correction | Evidence |
| --- | --- | --- | --- |
| B01 | Fixed locally, 2026-10-03 | Next lesson resolves by stable ID. Final lesson routes to course completion. | A (copied-object destination regression), M (lesson 1 completion opens lesson 2) |
| B02 | Fixed locally, 2026-10-03 | Matching options use saved state in feedback and restored sessions. | A (matching grading/resume), M (restored he/she/who selections visible); full native dropdown walkthrough remains pending |

B01/B02 originated in code inspection. The additional rows below record Guy’s reported observations on the prior UX build. Keep the history; automated fixes do not change his results to Pass.

| ID | Status | User report / correction | Evidence |
| --- | --- | --- | --- |
| B03 | Fixed; Guy retest Pending | Learn Hebrew words reversed. Complete phrases now remain together in RTL isolates, including emphasis. | A (plain/emphasized phrase order), M (lesson-2 source order) |
| B04 | Revised; Guy retest Pending | Inline keyboard too far from answer field; needs floating/pinned overlay and English equivalents. | Owner source reused; A/M (insertion, overlay, hints); final positioning/touch Pending |
| B05 | Fixed; Guy retest Pending | Synthetic אני constantly colored. The artificial fixture accent was removed; real source styling remains supported. | C (bounded fixture upgrade), A (source format preservation) |
| B06 | Revised; Guy retest Pending | Ask label did not accept a question. Authored help and a real local author inbox form are now explicit. | A (question/reply isolation, HTTP and backup); live AI absent |
| B07 | Revised; Guy retest Pending | Prefix attached to a separate vocabulary choice. Authored prefix tiles compose with base words; historical IDs retained. | A (composition/grading/version safety) |
| B08 | Renderer fixed; live import/retest Pending | Rich letter/cell/text formatting missing. Native metadata renders and survives JSON; no real masterfile imported. | Read-only Sheet1 reference + A (rich runs/colors/backup) |

## Verification ledger

| Date | Artifact | Evidence | Limit |
| --- | --- | --- | --- |
| 2026-10-03 | 0bcd999 application | npm.cmd run verify: 15 tests passed, 0 failed; Node 24.19.0. Store/import/HTTP tests in test/. | Backend/shared-helper coverage; not a complete browser suite. No rerun needed for this documentation-only inventory. |
| 2026-10-03 | 0bcd999 application | GitHub Actions run 37089995096 completed success. | CI success does not imply product acceptance or production readiness. |
| 2026-10-03 | Owner manual browser pass | Dashboard; lesson-1 recognition and typed Hebrew feedback; Studio word-note draft, affected-lesson report, publication. | No completed manual CSV, rollback, backup, mobile, matching, or ordering walkthrough is claimed. Later driver-owned browser lifecycle ended. |
| 2026-10-03 | Current code inventory | Read source, README, build brief and master specification; recorded bounded implementation and B01/B02. | Not independent QA. Historical inventory; later user results are recorded above. |
| 2026-10-03 | UX update, this checkpoint | npm.cmd run verify: 30 passed, 0 failed; separate syntax checks for media/UX/tutor modules; git diff --check passed. Includes rich-field preservation, pinned resumes/backups, taught distractors, undo, reports, role gates, media ranges and mocked AI. | No live AI, production login, source-media or FSRS claim. |
| 2026-10-03 | 445d9d2 application | Remote main matched the local full commit; [GitHub Actions run 37133489029](https://github.com/guylfe/hebleo-3.0/actions/runs/37133489029) completed success. | Private checkpoint, not deployment or user acceptance. |
| 2026-10-03 | UX owner browser pass | Local 4173: separate portions, typed-answer feedback, immediate recognition, lesson 1 completion opens lesson 2, labelled narrow navigation. Isolated in-memory 4174: review/reveal/rate/undo with exact prior schedule readback; restored matching selections; concept dialog preserves question; report attaches actual revision/answer; rich cards/table/root search/full entry; authored help. | Background mounted browser; synthetic data. Trusted clicks or explicit DOM clicks followed by state/API readback. Narrow-window visual check, not real-device acceptance. Native dropdown selection, microphone recording, real media playback and independent QA remain pending. |

| 2026-10-03 | User-feedback refinement | npm.cmd run verify: 46 passed, 0 failed; syntax and whitespace checks. Mounted browser: cleaner player, RTL text, owner floating keyboard/hints, clicks entering and saving אני, pin display, typed feedback. | Final drag/positioning visual walkthrough stopped after browser lifecycle/binding failure. Pointer/HTML placement and active-field logic have automated checks; real touch, live AI/media and independent QA remain Pending. |

| 2026-10-03 | 5220a59 application | Remote main matched the full application commit; [GitHub Actions run 37147722285](https://github.com/guylfe/hebleo-3.0/actions/runs/37147722285) completed success. Final restarted 4173 returned healthy with refinement fixtures and three fictional profiles. | Private checkpoint, not production deployment, Guy acceptance or independent review. |

## Maintaining this checklist

Keep IDs stable. A change moves the existing row's status or extends its limits; it does not create a second competing checklist. Every behavioral checkpoint updates this file's baseline, feature status, actual evidence and relevant known-issue rows. Retain closed issue history. Split a row into new IDs only when its scope truly splits, retaining a cross-reference.

User reports map to these IDs: record Pass/Fail/Blocked with date, tested application commit and brief observation/reproduction. Never treat silence or automated tests as Guy's acceptance. If a report is ambiguous, preserve it as an observation pending mapping instead of silently marking several rows passed.

New requirements go in an added row and remain distinct from current implementation. Production decisions, proposed curriculum, third-party integrations and reviewer sign-offs move status only after concrete evidence. README and PROJECT_STATUS link here rather than maintaining separate exhaustive lists.
