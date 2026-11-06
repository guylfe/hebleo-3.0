# Sentence answer modes delivery

Request: sentence-building exercise uses Build (pieces) and Type (full sentence), with no loss on toggle. Guy's approved amendment allows explicitly marking an incorrect typed sentence correct for a typo or spelling alternative. Internal simple/complex values remain unchanged.

Base: origin/main 44acd85. Feature: feat/sentence-input-modes-20261106.

Implementation: public/learner-view.js, public/app.js, public/preview/learner-renderer.js, src/store.js. sentenceMode is an optional enum in the existing learner resume JSON; absent means Simple. Text and selected token indices remain independent. No migrations or content edits. Preview retains both drafts without persisted learner writes. Submit locks the toggle, grades active mode, and respects existing answer recovery. Retrying/advancing resets as before.

Tests: npm run verify:candidate = 1101 passed, 8 skipped (existing runner exclusions), 0 failed. Focused backend/renderer/token/matching = 31 passed. New actual-app test proves repeated toggles, save/resume, typed grading and post-submit lock. Final styling-only correction followed by 9 renderer/mode tests passing. Logs are one directory above this repository: candidate-tests.log, focused-tests.log, sentence-tests.log, final-focused.log.

The initial unrestricted npm run verify was NOT green: 1118 pass, 24 fail, 10 skipped, including missing separate schemas dependency, old qa-tests review assertions/timeouts and git output-buffer exhaustion. Installed schemas dependencies and used the repository-designated verify:candidate runner successfully. One introduced non-ordering preview draft-shape assertion was corrected by keeping the optional field absent until used.

Browser: synthetic in-memory demo at http://127.0.0.1:63406/#lesson/lesson-2/apply. Tested tiles to Complex, Hebrew text input, back to preserved picks, back to preserved text and navigation reload retaining text. Browser screenshots inspected the actual Hebrew textarea and mode controls. No production or existing demo state touched. Temporary synthetic server PID 79104 can be stopped after installed verification.

## Main integration and self-approval amendment

Integrated feature d290949 (including fcda320) with installed baseline 5924fb5, preserving its review recovery, shortcuts, sibling burial and painted-card inset. Merge fa140a1 resolves shared event-handler and checklist conflicts. The follow-up implements Guy's self-approval amendment only for sentence Type mode.

public/app.js saves independent text/picks/mode and captures submitted mode on the immutable attempt request. POST /api/attempt/self-approve uses the original requestId, lessonId, exerciseId and revisionId. Store validates the learner, entitlement, exact receipt and submitted Type mode. It retains the answer and original automaticGrade, marks selfApproved/selfApprovedAt, and updates completion through existing progress rules. Duplicate approval changes nothing. Reports stay consistent with history; restore validates the original automatic grade and approval metadata. Build and legacy receipts cannot gain approval by changing UI mode.

The shared feedback displays Correct with an explicit Self-approved marker after acknowledgement. Rejected or interrupted responses keep the local incorrect state and offer retry; a lost committed response recovers the same receipt. Studio uses the shared controls with local-only approval and no learner writes. New questions/retry clear drafts as before. Authored answers, curriculum, IDs, audio, WordPress installation and other exercise families are unchanged.

Tests cover draft retention, active-mode grading, actual HTTP app rejection/lost-response/retry/reload, durable SQLite restart, completion, missed-question exclusion, report reconciliation, backup/restore and tampered backup rejection, learner/context isolation, concurrent duplicates, persistence rollback, original pinned revision and preview zero writes. The candidate runner keeps explicit existing audio exclusions. The unrestricted suite is not claimed green. Above feature-branch results are historical; final Lead results appear in the installation handoff.

Preservation installation uses scripts/start-preserved-demo.mjs, never npm start or a fresh-progress flag. A consistent SQLite backup and restored-copy rehearsal precede replacing only the verified port 63358 listener. Lead evidence lives in task folder 81593ed5-4931-416e-9a3b-2e0d185cb8c8; the installation receipt and handoff record exact identities, commands, counts and browser evidence.

The strict static UI audit reports four existing findings in unchanged lesson-editor.js, media-picker.js and vendored Jodit CSS; no changed feature file is flagged. These findings do not broaden this task into an unrelated rewrite. Physical phone, IME, assistive-technology and Guy acceptance remain separate.
