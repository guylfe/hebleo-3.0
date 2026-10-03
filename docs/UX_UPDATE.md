# UX checkpoint — 2026-10-03

This local update implements Guy's accepted navigation, vocabulary, exercise and interaction clarifications together. The stable-ID [feature checklist](FEATURE_CHECKLIST.md) remains the acceptance ledger; tests never imply Guy's acceptance.

## Contracts

- Watch defaults when video exists. Watch/Read shows both choices when both formats exist. Text-only content shows text directly, without a no-video announcement. Manifest portions have separate routes; optional checks follow explanation. Smaller-screen course outline starts collapsed.
- Introduced vocabulary uses full authored Nikkud. Exercise labels are Lesson-authored Nikkud, With Nikkud and Without Nikkud. Card display follows its purpose, with no generic curated-card setting.
- Cards show notes and expandable complete entries; Table retains all source fields. Unknown imported columns survive publication/backup. Rich fields remain searchable. Raw masterfile data is not silently reduced or given fabricated IDs/forms.
- Immediate single-choice submission is a saved setting; Continue follows feedback. Sounds, animations and keyboard controls are separate preferences.
- Ordering adds four to six distinct taught distractors, prioritizing the current lesson and two prior lessons, then older taught words. No future vocabulary. Publication rejects fewer than four available taught distractors. A differently pointed version of the same answer is not counted as a distractor. Accepted variants remain explicitly authored.
- Cloze says Type the missing word. Its pedagogical value and final card templates remain open for discussion with the pedagogy architect.
- Completion uses stable lesson IDs and a final course destination. Resume saves portion/question/answer/feedback with immutable source revision.
- Help prefers authored explanations; extra practice selects unresolved authored mistakes. Optional AI clarification is labelled and cannot publish or grade. Roleplay/generated practice remain future work.
- Native audio supports playback/replay/slower speed. Local voice comparison is ungraded. Concept text/video overlays preserve question state.
- Learner reports attach actual attempt/source revision. Author review never automatically accepts an answer. Studio is available only to fictional Author; real authentication remains separate.
- Review has bounded sessions, front/back reveal and Again/Hard/Good/Easy. Undo restores the exact previous schedule once. Listening/sentence presentations require source media/examples. Types share one schedule per word; FSRS and final pedagogy remain pending.

## References inspected

- Connected Google masterfile `1d9b3mFnRhubmdq7gJ5VMJBA9dyhwS6GSI6V95M0xSVc`, tab Sheet1: bounded header/example read, no writes/import. Headers include Ordinals, Lesson, Part, Type, No_Vocab, No_Card, Hebrew, English, Notes, Gender, Plural, Root, Pattern, Feminine, Plural Feminine, Audio and form audio, Infinitive, I, he, she, אתה, את, אתם, אתן, הם, הן, אנחנו. Stable editorial IDs and explicit authored-form mapping still need agreement before sync.
- Active WordPress modern keyboard v1.0.6 confirmed read-only. Local README/JavaScript at `C:\Users\Trans\OneDrive\Documents\New project 3\hebleo-modern-hebrew-keyboard` inspected. Layout, English hints, English-to-Hebrew conversion and cursor/space/backspace/touch conventions informed the controls.
- Active SRS flashcards v1.2.2 confirmed read-only. Owner Drive archive wp-learning-cards.zip inspected: templates/card.php, includes/note_types_templates.php, includes/styles.php and includes/card_loader.php. Front/back, reveal, audio and ratings informed the initial cards. Its FSRS implementation was inspected as a reference and has not been ported.
- Official OpenAI Responses API documentation informed the optional adapter; verification uses mocked responses. No live key/model or paid model call is claimed.

WordPress filesystem reads were refused by that server's permissions; local/Drive references supplied the inspected source. Live site, purchases, learner data, sheet cells and external configuration were not changed.

## Data consequences

Preferences/resumes are additive learner fields. Synthetic-only fixture enrichment creates a revision when no draft is pending, retaining learner history. Rich vocabulary survives draft/publish/rollback. Backups include three profiles, reports and pinned sessions; restore remaps revisions and clears feedback pointers for rechecking. Full history/drafts/media remain excluded; legacy backups with both original learners are supported.

The profile/role system is simulated. Production identity, source-media import, live Sheets/WordPress integrations, FSRS and independent release review remain outstanding. See the checklist for actual evidence.
