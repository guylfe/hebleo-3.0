# Native flashcard autoplay — 11 November 2026

Guy explicitly requested a native autoplay setting and authorized uploading the pending changes while guylfe/hebleo-3.0 is public.

Settings now includes **Play flashcard audio automatically**, default off, stored per learner through the existing validated preference API. Shared and native vocabulary cards honor it. Hebrew prompts play their base recording on display; English prompts wait for reveal. Shared cards use their existing managed player, trusted per-mount host context, allowed source media and playback speed. Duplicate readiness messages cannot replay automatically. Leaving a card disposes playback; manual replay remains available. No source-content or scheduling change.

Verification: 31 focused tests passed with no skips, including preference persistence/account isolation/type validation, both directions/faces, context trust, deduplication, speed, manual replay, teardown, legacy review transitions, HTTP asset delivery, previous flashcard corrections and background save lifecycle. Syntax checks passed. Browser verified installed Settings label/default. Installed served asset hashes match source, and complete database receipt matches before/after installation and inspection. Actual listening and physical Android playback remain unverified; browser autoplay restrictions can require interaction.

Seven runtime files were preservation-installed with same-task backups and guarded service restart. Existing runtime identity remains flashcard-feedback-20261111; the installation receipt records the updated hashes. No WordPress installation was needed for this native setting. User acceptance unreported.

This follow-up supersedes the earlier statements that native has no autoplay preference and that GitHub upload lacks public-repository authorization. Source update uses leo/drill-copy-cleanup; main integration remains separately owned by the lead.
