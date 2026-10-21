# Post-answer vocabulary cards — E10

Guy requested reminders attached to words after an exercise answer. Correct and incorrect feedback now make reliably ID-linked words operable by hover, tap/click and keyboard. The implementation reuses existing authored card content and rich Hebrew rendering. Viewing a card creates no review enrollment, unlock, approval, note encounter, attempt or progress save.

## Scope and identity

Recognition's Hebrew question uses wordId. Matching's word bank and submitted placements use wordIds and the ID-keyed submitted assignment, including wrong placements; a wrong meaning never changes the Hebrew entry's identity. Typing displays its ID-bound target word below the submitted textarea. The submitted text is retained verbatim and is never treated as the target's identity. No answer control is re-enabled.

Current ordering tokens, choices, free-text prompts, cloze and transformation sentences have no authoritative per-occurrence bindings. They remain plain, including punctuation, phrases, ambiguous homographs and unrecognized inflections. This is a content-binding coverage limitation, not an inferred dictionary or a generic vocabulary list. Future human-authored bindings can extend coverage through a separately reviewed contract. No canonical source, curriculum, seed or mapping was changed here.

The response-only exerciseVocabulary v1 projection is scoped to the requested lesson and exercises belonging to it (including reused composition exercises). It uses only direct runtime IDs. Managed runtime IDs are indexed from all lexical words, including denied ones. They require one unique identity and one safe eligible projected row; they can never fall back to raw flat cards. Non-managed IDs require one vocabulary-visible legacy record. A missing projection is inert. Word/form approval, introduction and citation policies are shared with lexical-runtime, independently of the library's 50-row pages. Source-browser rows are never merged. Pinned lesson sessions and saved-draft rehearsal pass their own snapshot; no latest-content lookup occurs when opening cards. Authored content validation rejects this response field.

## Interaction and preservation

Hover or focus previews without moving focus. Click/tap or native Enter/Space activation pins and focuses Close; activating the pinned trigger again closes. The card contains existing read-only content, audio and disclosures, with no flat lookup/enrollment/bookmark/private-note actions. The shared primitive protects pointer movement across its gap, keeps one card open, handles outside/focus departure and Escape, and restores the exact trigger only when focus was in the dismissed card. Inner disclosure Escape consumes that Escape before card dismissal. Card/trigger keys cannot submit or advance the exercise.

Fixed placement flips and clamps against the visual viewport with 12px edges, a 360px maximum width and internal scrolling. The card stays inside the owning Preview dialog. Route/profile/question/retry/rerender/session changes dispose listeners, timers, frame monitoring and card media; modal/drawer or disconnected/inert anchors invalidate it. No new network lookup is needed. Source/learner persistence remains with the existing owners.

Recognition choice selection also keeps the mounted question while saving. This closes a reproduced race where a delayed choice-save completion could replace the grading scope and drop the returned feedback. A delayed HTTP regression preserves one authoritative attempt and its visible result/card access.

## User test guide — Guy acceptance Pending

1. Open lesson 1 Check with an unanswered recognition question. There should be no underlined reminder and no answer revealed by this feature.
2. Submit a correct answer. Hover the underlined Hebrew question word, move slowly onto the card, then click the word to pin it. Read the exact Hebrew, meaning, notes and Full vocabulary entry; play linked audio only when present. Close and confirm focus returns to that word.
3. Repeat with an incorrect answer. Tab to the word, activate it, Tab through card controls and press Escape. Confirm the original answer, incorrect grade and question position stay unchanged.
4. Reload saved feedback and open the same word again. Retry or advance; the old card must disappear, and the next unanswered question must have no reminder. Change route/profile or open another panel while hovering and confirm no stale card appears.
5. In Apply, submit typing: its target word opens the target card while the original typed answer remains disabled and unchanged. Submit wrong matching pairs: each Hebrew word still opens its own entry. A target meaning never changes the word's identity.
6. Test saved-draft rehearsal. Cards use that saved snapshot and close on exit; profile state remains unchanged. For managed lexical fixtures, locked/unapproved forms must never appear, and card controls must offer no enrollment or generic flat entry.
7. Check a narrow and short viewport, RTL/Nikkud, pointer transit, keyboard focus/Close and viewport edges. Physical touch, screen reader, zoom and Guy acceptance require their own observations; automated geometry stubs do not establish them.

## Verification evidence

Regression owners: test/vocabulary-reminder.test.js (shared state/lifecycle), test/post-answer-vocabulary.test.js (identity/projection/read-only cards/state), test/app.test.js POST-VOC (real HTTP integration and reload), and retained learner-renderer/lexical/preservation checks. All synthetic fixtures are disposable and do not approve linguistic content. Exact candidate commands, counts, named UX/QA and installation receipts are recorded in the delivery handoff, separate from this stable requirement. Current native review must be attempted through mounted tools; no foreground fallback is authorized by this feature.

Independent QA of 444b917 passed 717 candidate tests, 23 schema tests, six additional scenarios and 3,962 eligibility assertions. UX Owner reproduced UX-E10-01: legacy Full vocabulary entry Escape dismissed the card instead of closing the disclosure first. The corrected owner handles native details before the outer reminder: first Escape closes the innermost open disclosure and focuses its summary; the next closes the card and returns its trigger. A regression reproduces failure on the prior code and passes for both grading outcomes, summary/body focus and an owning Preview dialog, without storage changes. Named corrected-revision recheck is recorded separately. All native attempts so far were blocked by mounted computer contention; physical/rendered/Guy acceptance remains Pending.
