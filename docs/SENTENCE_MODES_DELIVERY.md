# Sentence answer modes delivery

Request: sentence-building exercise uses Simple pieces and Complex full-sentence typing, with no loss on toggle.

Base: origin/main 44acd85. Feature: feat/sentence-input-modes-20261106.

Implementation: public/learner-view.js, public/app.js, public/preview/learner-renderer.js, src/store.js. sentenceMode is an optional enum in the existing learner resume JSON; absent means Simple. Text and selected token indices remain independent. No migrations or content edits. Preview retains both drafts without persisted learner writes. Submit locks the toggle, grades active mode, and respects existing answer recovery. Retrying/advancing resets as before.

Tests: npm run verify:candidate = 1101 passed, 8 skipped (existing runner exclusions), 0 failed. Focused backend/renderer/token/matching = 31 passed. New actual-app test proves repeated toggles, save/resume, typed grading and post-submit lock. Final styling-only correction followed by 9 renderer/mode tests passing. Logs are one directory above this repository: candidate-tests.log, focused-tests.log, sentence-tests.log, final-focused.log.

The initial unrestricted npm run verify was NOT green: 1118 pass, 24 fail, 10 skipped, including missing separate schemas dependency, old qa-tests review assertions/timeouts and git output-buffer exhaustion. Installed schemas dependencies and used the repository-designated verify:candidate runner successfully. One introduced non-ordering preview draft-shape assertion was corrected by keeping the optional field absent until used.

Browser: synthetic in-memory demo at http://127.0.0.1:63406/#lesson/lesson-2/apply. Tested tiles to Complex, Hebrew text input, back to preserved picks, back to preserved text and navigation reload retaining text. Browser screenshots inspected the actual Hebrew textarea and mode controls. No production or existing demo state touched. Temporary synthetic server PID 79104 can be stopped after installed verification.

Remaining: Lead Engineer owns main integration and existing demo installation per AGENTS.md. Integrate this bounded feature, run meaningful final checks, install using the existing preservation launcher (do not reset the authored demo or learner records), verify exact served files and actual lesson + Studio toggle behavior, then return installed URL and evidence. Do not change WordPress, curriculum, translations, audio, IDs, accepted answers or grading policy.
