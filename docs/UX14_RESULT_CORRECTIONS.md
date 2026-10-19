# UX14-01/02 bounded result corrections

Reviewed baseline: f9c9490c03c346171ae81c610d501587daf17168, clean lead/oct13-selected-design. Exact corrected SHA/files/commands/protection and artifact hashes are sealed in the task's sibling ux14-result-correction-evidence/FREEZE.json and HANDOFF.md. This is the two-ID correction batch from the actual UX Owner review, not a redesign or a new QA/release assignment.

## UX14-01 — alternatives must describe the grader's actual list

The optional acceptedAnswers value is derived inside the same branch from its local answers list for typing/ordering/cloze/transformation. It keeps unique explicit authored strings verbatim and in first-occurrence order, matching the existing optional wire contract; it does not trim/normalize metadata, compute another key or invent implicit typing alternatives. Recognition grades the word's English value and matching grades its meaning map, so neither emits this string-list metadata. Correctness/expected/Nikkud and matching pair policy stay unchanged. Unknown authored fields, including unrelated answers fields on recognition/matching, remain in author content; no stripping or migration.

The shared result renderer also ignores the string-list metadata for recognition/matching in historical/resumed results. It retains stored result objects and authored explanations without rewriting immutable learner grades or progress. New learner and saved-draft Preview verdicts agree; the Preview evaluator remains write-free.

Actual evidence: the two supplied valid-content recognition/matching probes fail on f9c9490 and pass after correction. Four added real Store/Preview/schema/learner cases check exact mixed Hebrew/English/Nikkud/direction-mark/spacing alternatives and untouched unknown fields. The implicit-typing/legacy-metadata case proves no fabricated alternatives or historical-state mutation. Existing six-family grader, wire, matching-resume and result-recovery checks remain green. All fixtures are synthetic/disposable; no canonical teaching/source or protected data change.

## UX14-02 — explanation stays usable during pointer transit

The existing8px popover offset and conditional meaningful-content gate remain. Leaving starts a180ms cancelable close delay. Entering the visible content or trigger cancels it; leaving both closes after the delay. Focus keeps the content available, blur outside closes, and Escape cancels pending work and dismisses. Pointerdown preserves the pre-focus state for click/tap toggles; touch entry does not masquerade as hover. A WeakSet avoids duplicate binding, and the close callback is scoped to its connected result node so an old detached context cannot affect a new result. No timer opens content.

Actual evidence: supplied hover-gap handler regression fails on f9c9490 and passes unchanged after the delay. Deterministic JSDOM timer cases cover gap/content transit, both-surface leave, reversal, Escape, focus/blur, touch toggle, detached-context timers, repeated binding and no-empty-affordance. The existing result explanation, stable main Check/answer, frozen Preview field and Preview wire assertions pass. These are handler/source state probes, not native pointer geometry.

## Executed checks

- node --test test/ux14-result-regressions.test.js: supplied baseline3FAIL; initial corrected supplied3PASS; expanded correction11PASS. Logs retained separately.
- node --test --test-name-pattern='FB14 item14|matching verdict|wrong answers keep|renderer wire answers|G5-01 freezes|all six exercise families' test/app.test.js test/feedback14-refinements.test.js test/feedback18-learner.test.js test/learner-renderer.test.js test/preview.test.js test/stale-preview.test.js test/store.test.js:10PASS/0FAIL/0skip.
- npm run check; node --check src/evaluate.js; node --check test/ux14-result-regressions.test.js:PASS. git diff --check:PASS.

Exact final private checkpoint/automatic CI evidence is in FREEZE.json; no manual broad suite, detector/audit or new QA/reviewer dispatch. Original supplied probe source/hash and full12883character review identity are in BASELINE.json; review peer artifacts were read, not changed. Counts overlap and are owner evidence, not new named UX acceptance.

## Preservation and next review

Only two production modules change: src/evaluate.js and public/learner-view.js. App routes/layout/source/learner storage, signed canonical approval, source CAS/freshness, media approval/recovery, earlier UXI13/Help guards, synthetic fixture and original navy PNG stay unchanged. The earlier completed Oct14 passes and held colors/general labels/vocabulary architecture/broader motion remain. No coherent frontend+backend working-demo activation occurs before UX Owner's bounded recheck.

Browser/native pause remains: no foreground/headless/substitute/fabricated captures. Pointer transit/RTL/zoom/scroll geometry and Guy acceptance OPEN; audio-speed quality/playback-rate and APK/mobile/physical DEFERRED. After implementation+UX review/corrections, vocabulary must be reopened with Guy BEFORE phase3/broader walkthrough; no option selected, no new phase/public/WordPress action.
