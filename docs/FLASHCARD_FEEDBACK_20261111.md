# Flashcard feedback — 11 November 2026

Guy requested four second-person pronoun audio fixes, correction of the garden note, working WordPress autoplay, and a review heatmap alongside the existing streak count. WordPress and the installed native app were inspected.

## Changes

- Exact SourceIds mf-000014 through mf-000017 now render the existing at/ata/atem/aten recordings (WordPress attachments 41445–41448). Native serves checksum-verified copies through the existing course-gated media route. Both answer directions retain their original IDs. Imported raw packages, their approval hashes, schedules and source provenance remain unchanged; the corrections are applied only when rendering.
- mf-000035 (גן, Garden) renders “This is the word for a garden.” in place of the incorrect fish sentence. Other notes and already-authored audio remain unchanged.
- WordPress shared-card autoplay uses the active card's base recording through one managed parent player. Exact known iframe/context messages are required; stale generations are ignored. Hebrew fronts can play the base audio; English prompts wait until reveal to avoid giving the answer away. Card transitions and manual replay stop automatic playback. The existing per-deck setting remains authoritative. Native has no equivalent automatic-audio setting, so its existing manual playback was retained.
- A 365-day review heatmap appears on the WordPress deck overview and native review overview. WordPress uses its existing per-account daily streak totals and retains the streak display. Native uses committed per-account review receipts, excluding rejected/undone receipts. Legacy native timestamps are derived only from their saved deterministic due/interval result. Future reviews carry the accepted answer timestamp explicitly. No scheduling change or historical data rewrite.

## Verification

- 33 focused Node tests passed, with 3 existing full-source fixture tests skipped because their optional source input was not configured. Includes account isolation, duplicate/rejected/undone receipts, Israel date boundaries, legacy history, exact content guards, media hashes, autoplay face/setting/generation/manual replay, and existing review-save/background lifecycle regressions.
- Five PHP content-isolation checks passed. PHP lint and `npm run check` passed.
- Installed WordPress render readback confirmed all eight pronoun answer faces have their recording and both garden answer faces have the corrected note. The activity callback is registered. Shared state digest before/after installation matched.
- Native HTTP readback confirmed all eight recording responses match the original attachment byte hashes and both garden faces render correctly. Installed build is `flashcard-feedback-20261111` at localhost:63358. Complete database receipts before installation, after preserved startup, and after verification matched exactly.
- Browser inspected native heatmap and selected 2026-11-03: displayed the existing one-review count. Full-page screenshot captured; the first cropped capture was blank and is not visual evidence.
- WordPress Browser is signed out. Signed-in WordPress end-to-end autoplay/heatmap, listening review, and physical Android remain unverified. Browser autoplay policy may still require a user interaction. No learner ratings were submitted during verification.

## Installation and recovery

WordPress changes are five bounded files under wp-learning-cards/shared-cards, guarded by expected hashes and the existing release lock. Original changed files are backed up outside the web root in hebleo-flashcard-feedback-20261111-7c9af1e5. The installed shared-cards.php had an unrelated difference from this source checkout; only the two exact correction hooks were patched, preserving that difference.

Native source files match the reviewed baseline before replacement; only four existing files and eight added files changed. Existing conjugation view/CSS differences were preserved. The task's `start-native-feedback.ps1` starts the installed runtime with `openPreservedStore`; it refuses reset/schema migration and guards all installed/protected file hashes. This is a scoped installed build over the existing runtime, not a clean integration/main checkout.

Full installation receipts, scoped installers, native file backup, browser capture and readback files are in Leo's task workspace `71c71389-5334-4e0c-9ca8-d80dd28223d1/7c9af1e5-9e34-495b-9e56-41ca45eda284`.

GitHub metadata reported `guylfe/hebleo-3.0` as public on 11 November. The repository rules authorize private backup; no source or recordings were pushed publicly. Source is committed locally on the feature branch. Main remains unchanged. User acceptance is unreported.
