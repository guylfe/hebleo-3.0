# Hebleo implementation and acceptance checklist

Baseline: 2026-10-03; inspected application commit `0bcd99988a8acce9ee91d8d7d2106e46590d539f` and documentation commit `c0bb85d9370b4f1c4b4222b574f6fa6d1121801e`. This inventory covers the initial-build brief and feature families in the supplied master specification. Future/optional features listed here are not a promise that all belong in the first release.

This file is the shared feature-status and user-testing record. README is the quick walkthrough; PROJECT_STATUS records milestones; MASTER_SPEC remains the product source. App features have not changed as part of creating this inventory.

## Status and evidence

- **Implemented locally:** working code in the demo; no production readiness or user acceptance implied.
- **Partial:** a working subset, with its missing portion stated explicitly.
- **Simulated:** fictional local accounts/events only; no live service integration.
- **Not implemented:** absent from this build, even if proposed in planning documents.
- Evidence **A** = existing automated test coverage; **M** = prior owner-operated browser check; **C** = code inspection. Evidence describes scope, not a blanket guarantee.
- **Guy test** starts as **Pending** for every available feature. Only Guy's reported result changes it to Pass/Fail/Blocked. Automated success and independent QA are recorded separately.

Test URL when the local server is running: http://127.0.0.1:4173. Startup and the synthetic CSV example are linked from README. Use fictional Alex/Sam profiles. Published edits affect both profiles' shared content; their learner records remain separate. Backups include both profiles.

## Implemented locally: ready for user testing

| ID | Feature | What to test / expected result | Evidence | Guy test |
| --- | --- | --- | --- | --- |
| L01 | Home dashboard and navigation | Open Your path, Course, Review, My Hebrew, Studio, Settings; each opens its own screen. | C, M (home) | Pending |
| L02 | Recommended next unfinished lesson | Home Continue learning selects the first incomplete lesson; after all are complete it offers revisiting the first. This differs from the end-of-lesson bug below. | C | Pending |
| L03 | Three illustrative lessons | Open all three: pronouns/reading, location sentences, and verb agreement. Each has explanation, vocabulary, and three checks; ten canonical words and nine exercises total. | C, A (grading) | Pending |
| L04 | Text explanations and lesson vocabulary | Read explanation and vocabulary notes. Reused words resolve from canonical vocabulary rather than copied lesson rows. | C, A (references) | Pending |
| L05 | Correct/incorrect feedback | Submit both a valid and invalid answer; receive feedback and an accepted answer, then advance through questions. | A, M (recognition/typing) | Pending |
| L06 | Completion and attempts | Answer every core question correctly at least once, across attempts if needed; lesson becomes complete and its words join review. Wrong attempts remain saved. | A | Pending |
| L07 | Lesson recap and repeat practice | Finish a set to see session accuracy; More exercises repeats that same authored set. Weak results offer a link back to the explanation. | C | Pending |
| E01 | Multiple-choice recognition | Lesson 1 question 1 and lesson 3 question 1: select the word's English meaning. | A, M (lesson 1) | Pending |
| E02 | Typed Hebrew | Lesson 1 question 2: type the Hebrew for I, with or without vowels under default rules. | A, M | Pending |
| E03 | Matching | Lesson 1 question 3: match he/she/who to meanings using dropdowns. See feedback-display issue B02. | A (grading), C (UI) | Pending |
| E04 | Sentence ordering | Lesson 2 question 1 and lesson 3 question 3: select tokens in sentence order; remove a chosen token and rebuild. | A (grading), C (UI) | Pending |
| E05 | Typed cloze | Lesson 2 question 2: complete the missing pronoun. | A (grading), C (UI) | Pending |
| E06 | Sentence transformation | Lesson 2 question 3 and lesson 3 question 2: change the subject/form as instructed. | A (grading), C (UI) | Pending |
| E07 | Server-side grading and explicit accepted alternatives | Edit a full JSON exercise's accepted answers, stage/publish it, and test alternatives. Answers are not automatically generated. | A (all six grading families), C (alternative list) | Pending |
| E08 | Hebrew normalization | Default typed checks ignore vowel marks, direction controls, selected punctuation, and extra spaces. Wrong spelling/final-letter substitutions stay wrong. | A | Pending |
| E09 | Exact-vowel requirement | Available through full JSON import: set typing exercise requireNikkud=true; unpointed answer fails and authored pointed form passes. No Studio toggle yet. | A | Pending |
| H01 | Curated / Full / None modes | Switch modes in lessons, library, review, and Settings; vocabulary uses explicit authored forms and preference survives reload. Curated can equal Full for some demo words. | C, A (preference storage) | Pending |
| H02 | Tap-to-reveal vowels | Tap a vocabulary word in None/Curated mode to reveal Full, then tap again to restore the selected mode. This temporary reveal is not saved. | C | Pending |
| H03 | Hebrew keyboard assistance | In typed exercises, click Hebrew letters, Space, and backspace; try replacing a selected range. Lesson letters are highlighted; all letters remain available. | C | Pending |
| R01 | Manual and completion-based review enrollment | Add a word from a lesson/library, or complete a lesson; cards are created once. | A | Pending |
| R02 | Due queue and recognition cards | Open Review: due count, Hebrew front, revealed English/teaching note, and empty state when no words are due. One recognition card per word. | A (queue), C (UI) | Pending |
| R03 | Again / Hard / Good / Easy ratings | Rate recall and reload; due dates, interval, and repetition count persist. Again schedules ten minutes; Hard one day; Good/Easy expand a simple interval. This is not FSRS. | A | Pending |
| R04 | Published vocabulary in review | Enroll a word, publish a meaning/note correction, then reopen Review; the card resolves the new canonical word. | A | Pending |
| N01 | Vocabulary search | In My Hebrew, search English, exact Hebrew forms, or a teaching-note substring; no matches shows an empty state. Search does not normalize vowels. | C | Pending |
| N02 | Word bookmarks | Star/unstar words and reload; bookmark state remains with the selected learner. | C, A (preservation across publish/rollback) | Pending |
| N03 | Personal word notes | Bookmark a word to expose its note box; save a note and reload/switch users. Notes belong to that learner. | C, A (storage/preservation) | Pending |
| S01 | Vocabulary editor | In Studio, edit full vowels, unpointed form, curated form, English meaning, or teaching note; save a draft without changing published learner content. | A, M (note edit) | Pending |
| S02 | Change and dependency preview | Draft preview lists changed objects and affected lesson IDs; confirm a shared-word edit affects the appropriate lessons. It is a change report, not a rendered draft lesson. | A, M | Pending |
| S03 | Deliberate atomic publication | Publish a draft; latest word-linked lesson/practice/library/review views use the new source. Existing open lesson remains pinned to its version. | A, M (publication) | Pending |
| S04 | History and content rollback | Inspect numbered revisions/timestamps/reasons; restore an earlier revision. A new revision is created and learner attempts/notes/bookmarks/cards remain. | A | Pending |
| S05 | Full content JSON import/export | Export content, edit a copy, choose it in Studio, Validate & stage, inspect impact, publish. Lessons/exercises can currently be edited only this way. | A (validation), C (UI/file wiring) | Pending |
| S06 | Vocabulary CSV import | Import docs/examples/vocabulary-demo.csv or your exported CSV with required authored forms. Matching IDs update; new IDs append; absent words remain. Quoted notes/newlines and explicit forms are preserved. | A (parser/fidelity), C (UI/file wiring) | Pending |
| S07 | Invalid content rejection | Try duplicate IDs, missing forms, broken references, unsupported types/renderers, or malformed CSV. Import must fail without replacing active content or an existing valid draft. | A | Pending |
| S08 | Reusable component order | In Studio, Move vocabulary first, publish, reopen lesson; vocabulary precedes explanation. Exactly three component types are supported. | A (manifest resolution), C (UI) | Pending |
| S09 | Basic source/selector/renderer/options contract | Full JSON can select words by another lesson ID and hide vocabulary notes; validated renderer resolves canonical rows. Broader selectors are absent. | A (selector), C (option rendering) | Pending |
| D01 | Persistent local learner records | Restart server/reload browser; completed lessons, attempts, preferences, cards, bookmarks, notes, and saved daily goal remain. Exact active question is not saved. | A | Pending |
| D02 | Local backup export/restore | In Settings export, change both profiles/content, restore; active content, both profiles, and review/event replay receipts return to the snapshot. No revision-history/draft/media backup. | A (store restore), C (file controls) | Pending |
| D03 | Invalid restore rejection | Invalid content/learner/card backup must fail without partially replacing data. This is basic schema validation, not a completed security audit. | A | Pending |
| D04 | Content-version-safe grading | Keep a lesson open, publish a word change in another window/profile, then answer the old lesson; it grades against the displayed revision. | A (backend), C (session pinning) | Pending |
| D05 | Stale publish/rollback protection | API/JSON-level test: a request with an old active revision must fail rather than overwrite a newer publication. No multi-editor draft merge. | A | Pending |
| D06 | Duplicate operation protection | API-level test: repeat an attempt/rating/event request ID with identical data; no second attempt/rating/event applied. Conflicting ID payload is rejected. | A | Pending |
| O01 | Repeatable startup and demo seeding | Node 24.19+; npm.cmd ci --ignore-scripts, npm.cmd start. First run seeds SQLite; later starts retain data. No one-click reset. | A (SQLite reopening), prior HTTP health check | Pending |
| O02 | Local service boundaries | Server binds loopback; HTTP checks reject unknown demo users, external hosts, cross-origin requests, non-JSON/malformed bodies, and unknown files. Basic validation/size caps/CSP are present; not production auth. | A (selected HTTP cases), C (other guards) | Pending |
| O03 | Private GitHub checkpoints and CI | Repo guylfe/hebleo-3.0 is private; source/docs/tests are pushed, local DB/logs are excluded, GitHub Actions runs checks. | Prior remote privacy/push/CI evidence | Pending |

## Simulated: test the local rules, not a live integration

| ID | Feature | What to test / expected result | Evidence | Guy test |
| I01 | Fictional Alex/Sam profile switch | Select each demo learner; attempts, preferences, notes, and cards remain separate. Both can open Studio; this is not a login or role system. | A (isolation), C (UI) | Pending |
| I02 | Membership start/cancellation | In Settings cancel/start test membership. Cancellation retains purchased course and basic review. No premium tool changes because none exists. | A | Pending |
| I03 | Course purchase/refund | Simulate refund: lesson attempts/enrollment/review are gated; stored progress remains. Simulate purchase: access returns. Vocabulary/content are still exposed in this demo, so this is not production content protection. | A | Pending |

## Partial implementations: available portion and missing portion

| ID | Area | Available now | Still missing | Evidence | Guy test |
| P01 | Continue / remediation | End-of-set score, repeat same set, revisit explanation; next-lesson button appears for strong performance. | Next-lesson destination has B01 bug; targeted/new extra sets, hints, concept-based recommendations, and adaptive practice. | C | Pending |
| P02 | Watch / Read | Read text and a Watch tab displaying an explicit media-unavailable message. | Actual player, mapped native videos, transcript sync/subtitles, saved Watch/Read preference, separate checks embedded in explanation. | C | Pending |
| P03 | Vowel overrides | Exercise-specific mode overrides word-linked recognition/matching display; locked-mode badge and optional pointed-answer requirement. | Global override behavior for literal sentence tokens/context; visual authoring toggles, deliberate course-wide vowel fading. The cloze fixture alone does not prove all override behavior. | C, A (pointed requirement) | Pending |
| P04 | Review / HebLearn | Due cards, simple intervals, recognition, persistence, course access rule. | FSRS, production/listening cards, multiple cards per note, learning steps, suspension/resumption controls, custom decks/collections, premium review modes, reviewed-activity history/UI. | A, C | Pending |
| P05 | Lesson Studio | Visual vocabulary editing, impact report, limited manifest composition/order, full JSON editing path. | Visual course/chapter/lesson/sentence/exercise editors, add/remove/drag arbitrary blocks, richer settings, tag/filter/compound selectors, draft desktop/mobile lesson preview, multi-editor conflicts, editor identity/audit. | A, C, M (subset) | Pending |
| P06 | Source formatting | Stores bold/color; CSV supports both; bold appears and an accent class is rendered. | Exact arbitrary authored colors, span-level rich text/highlighting, semantic formatting, and native Sheets formatting sync. | A (CSV), C | Pending |
| P07 | Automatic propagation | Word-linked recognition/typing/matching, vocabulary/library/review use canonical words. | Sentence bank and canonical tokens; editing a word does not rewrite literal sentence prompts, ordering tokens, cloze/transformation answers, or media. Already open views refresh on action/navigation; no live push subscription. | A, C | Pending |
| P08 | Progress / mistakes / stats | Attempts store answer/correct/expected/date; dashboard shows completion, aggregate accuracy, attempts, enrolled words, due count; goal minutes are saved. | Exact question resume, visible attempt/mistake bank, mastery model, time tracking, goal attainment/streaks, video preference, product/admin analytics. Enrolled count is not a mastery estimate. | A (storage), C | Pending |
| P09 | Responsive/accessibility foundations | Responsive CSS, RTL inputs/bdi, labels, focus styles, Enter submission, status announcements. | Full mobile/tablet, screen-reader, keyboard-only, zoom/contrast and RTL punctuation acceptance testing; adjustable text, audio transcripts/subtitles, progression-driven feature disclosure. | C, M (one desktop viewport) | Pending |
| P10 | Content objects and backup | Stable word/lesson/exercise IDs; immutable content history; current-content/learner snapshot export. | General course/chapter/concept/sentence/media/reading models, restore of revision history/drafts, automatic database/media backups and full disaster recovery. | A, C | Pending |

## Not implemented: remaining specification inventory

| ID | Missing feature / work | Scope note |
| --- | --- | --- |
| U01 | Import real Hebleo curriculum/masterfile | Demo uses synthetic fixtures; no verified source content or approved replacement sequence. |
| U02 | Curriculum redesign and master sheet | Real-course audit, approved micro-lesson splitting/resequencing, Preserve/Improve/Reconsider proposals, deliberate spiral/scaffolding/extra-practice mapping. |
| U03 | Original video and native word/sentence audio | Includes canonical playback, reusable media IDs, storage/upload/replacement, images/diagrams/PDFs, media provenance. |
| U04 | Full LearnDash course parity | Existing course/chapter coverage, quizzes, enrollments, progress, teaching/media behavior have not been reproduced. |
| U05 | Additional exercise interactions | Multi-select, typed English, dropdown cloze, audio-to-Hebrew/meaning, dictation, sound discrimination/minimal pairs. |
| U06 | Specialized Hebrew exercises | Root/pattern identification/prediction, noun-gender/conjugation exercises, add/remove Nikkud as distinct exercise types. Existing generic typing/transformation is not a morphology engine. |
| U07 | Open and spoken exercise types | Recording/repeat/translate/answer aloud, open sentence/image description, communicative response, dialogue completion. |
| U08 | Practice pools and targeted adaptation | Human-authored extra sets, adaptive selection/hints, weak-area remediation, standalone practice area, concept mastery and mistake-resolution tracking. |
| U09 | Configurable keyboard modes | Per-exercise full/lesson-letter/subtle/none/native settings, progression, keyboard-recall safeguards; no vowel-entry buttons currently. |
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
| U24 | AI tutor | Curriculum-constrained roleplay/conversation, explanations, generated optional practice, reading discussion/writing feedback and real model connection. |
| U25 | Guided immersion / reading library | Stories/articles/news/listening/dialogues/media feeds; known/weak/new-word coverage, tap dictionary/audio, learner-level matching. |
| U26 | Community and instructor access | General/lesson discussion, contextual Q&A, private/public instructor answers and FAQ reuse, announcements, subscriber areas, moderation/reports. |
| U27 | Expanded search/dictionary | Concepts/lessons/sentences/Q&A/readings, root/pattern/forms/examples/audio and relevant practice. Current search is vocabulary/teaching notes only. |
| U28 | Expanded notebook | Saved sentences/exercises/readings, custom collections/decks, favorite exercises and dedicated saved-only views. Current word bookmarks/notes work. |
| U29 | Motivation features | Streaks/freezes, XP, achievements, leaderboards, friend challenges and meaningful attainment. Saved goal value alone is not a tracked goal. |
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
| B01 | Confirmed by code inspection; not fixed | Finish lesson 1/2 with strong score and click Next lesson. The UI compares a cloned lesson object by object identity; indexOf returns -1 and chooses lesson 1. Expected: lookup next lesson by stable ID. This was not part of prior automated coverage. | public/app.js exercisePanel/openLesson |
| B02 | Confirmed by code inspection; not fixed | Submit matching answers. Re-rendered dropdowns return to the empty option instead of displaying submitted selections. Backend retains the answer and shows expected meanings. Expected: retain submitted selections in feedback. | public/app.js exercisePanel matching branch |

These are implementation defects, not a claim that a user or independent reviewer reproduced them in the browser. Keep the rows after fixes and attach regression/acceptance evidence.

## Verification ledger

| Date | Artifact | Evidence | Limit |
| --- | --- | --- | --- |
| 2026-10-03 | 0bcd999 application | npm.cmd run verify: 15 tests passed, 0 failed; Node 24.19.0. Store/import/HTTP tests in test/. | Backend/shared-helper coverage; not a complete browser suite. No rerun needed for this documentation-only inventory. |
| 2026-10-03 | 0bcd999 application | GitHub Actions run 37089995096 completed success. | CI success does not imply product acceptance or production readiness. |
| 2026-10-03 | Owner manual browser pass | Dashboard; lesson-1 recognition and typed Hebrew feedback; Studio word-note draft, affected-lesson report, publication. | No completed manual CSV, rollback, backup, mobile, matching, or ordering walkthrough is claimed. Later driver-owned browser lifecycle ended. |
| 2026-10-03 | Current code inventory | Read source, README, build brief and master specification; recorded bounded implementation and B01/B02. | Not independent QA. User test results: none reported yet. |

## Maintaining this checklist

Keep IDs stable. A change moves the existing row's status or extends its limits; it does not create a second competing checklist. Every behavioral checkpoint updates this file's baseline, feature status, actual evidence and relevant known-issue rows. Retain closed issue history. Split a row into new IDs only when its scope truly splits, retaining a cross-reference.

User reports map to these IDs: record Pass/Fail/Blocked with date, tested application commit and brief observation/reproduction. Never treat silence or automated tests as Guy's acceptance. If a report is ambiguous, preserve it as an observation pending mapping instead of silently marking several rows passed.

New requirements go in an added row and remain distinct from current implementation. Production decisions, proposed curriculum, third-party integrations and reviewer sign-offs move status only after concrete evidence. README and PROJECT_STATUS link here rather than maintaining separate exhaustive lists.
