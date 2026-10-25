# Independent keyboard QA — 25 October 2026

Exact candidate: `242faf5c5849665a9d6552fb0a60b9415f1fc3ca`. **QA-KBD-08 closed in executable simulated geometry; no new P1/P2 blocker found.** Two P3 constraint-lifecycle defects remain. This is not full native/Guy acceptance or an installation receipt.

Reviewer checkout: `C:\Users\Trans\.openmausbot\task-workspaces\71c71389-5334-4e0c-9ca8-d80dd28223d1\653fb433-7485-48b1-9f7c-cb22711bda02\hebleo-3\qa-keyboard-242faf5`, branch `qa/keyboard-242faf5`. Archived exact committed candidate from the assigned owner repository, then registered against that commit in an isolated local Git repository. No application implementation changes by QA; owner working files and running servers untouched.

## Executed checks

- `git archive --format=zip --output=<reviewer path>/candidate.zip 242faf5c5849665a9d6552fb0a60b9415f1fc3ca`, then `Expand-Archive`: exact committed candidate extracted. Initial archive attempt with incorrect literal output `$null` failed before writing; corrected output stayed in reviewer checkout.
- `npm ci --ignore-scripts --offline --no-audit --no-fund`: success, 49 packages installed; package files unchanged.
- `node --test test/keyboard-dock-clearance.test.js test/qa-keyboard-clearance-independent.test.js test/ux-actions-independent.test.js test/qa-actions-independent.test.js test/keyboard.test.js test/text-reader.test.js`: **73 passed, zero failed/skipped**. Original QA-KBD-08 learner and Preview counterexamples now pass. Existing 17 owner/reviewer clearance probes are included, not an additional result.
- `npm run check`: configured syntax checks passed. That combined shell subsequently returned 1 from a separate raw-byte receipt comparison, explained below; this was not a syntax failure.
- `node --test test/qa-keyboard-constraint-lifecycle.test.js`: **4 passed, 4 failed**, zero skipped. Four failures reproduce two P3 findings (three focus departures plus inline-priority restoration). Ignored log: `.private/qa-keyboard/constraints.log`.

Additional passing probes verify: nearer scroll container receives recovery while document receives none; actual modeled scroll events settle without further recovery; four shrink/restore cycles retain node, focus, Hebrew, selection and authored style values; another in-scope answer restores the old field; detached answer styles restore on destroy. These are deterministic CSSOM simulations, not real browser layout/scroll-loop evidence.

## QA-KBD-12 — P3: focus departure retains temporary sizing

Location: `public/exercise-actions.js`, document focusin handler and restoration loop. The handler returns before revealFocusedAnswer for dock/outside/reminder targets. There is no focusout cleanup for blur; restoration depends on a later measurement or eligible focus.

Reproduce: `node --test --test-name-pattern=QA-KBD-12 test/qa-keyboard-constraint-lifecycle.test.js`.

Fixture: viewport 800, sticky header bottom 220, keyboard top 400, dock height 68, gaps 8, leaving 88px available. Focus constrains the 200px textarea to min-height 0 / max-height 88 / overflow auto. Focus Check, focus Navigation outside scope, or blur without scrolling: all three retain temporary styles rather than restoring min-height 200 / max-height 450 / overflow scroll. Another in-scope answer restores them. Resize/scroll may mask this; ordinary focus changes need not produce either.

No lost value/caret or blocked primary action demonstrated. This is P3 lifecycle cleanup, not recurrence of QA-KBD-08. Lead correction: restore on focus departure/blur without moving the new target, while preserving the answer when custom keyboard interaction legitimately retains it.

## QA-KBD-13 — P3: restoration loses inline CSS priorities

Location: constraint snapshot and restoreAnswer. Values are saved with getPropertyValue and restored using two-argument setProperty; getPropertyPriority is never preserved.

Reproduce: `node --test --test-name-pattern=QA-KBD-13 test/qa-keyboard-constraint-lifecycle.test.js`.

Inline min/max/overflow priorities start important; after destroy they are empty. Normal values restore. No current app lesson using these inline priorities was established; severity P3. Lead correction: save/restore each touched property's priority alongside its value.

Reviewer tests deliberately fail until corrected. Cherry-pick as regressions with fixes, not as an all-green integration change.

## Native evidence and boundaries

Read assigned owner's uncommitted `docs/KEYBOARD_CLEARANCE_NATIVE.md`, `docs/evidence/keyboard-clearance-20261025/BUILD_FINAL.json`, and visually inspected screenshots `02-text-open-narrow.png` and `06-exercise-open-narrow.png`. They show answer, action row and keyboard visibly separated below the sticky header. These are owner-captured native artifacts; reviewer did not operate a fresh mounted browser or inspect Studio natively.

Compared all 110 receipt files with the exact archive: 100 raw hashes match. Ten differ solely by CRLF/LF representation: all ten current owner files match receipt hashes and equal archive contents after newline normalization. No semantic difference found. `public/exercise-actions.js` matches raw receipt SHA-256 `3c13b9e4361e6d6c1ff8c9ba775c98e796107affc14e41497239716525d0facc`. Do not equate the archive's aggregate byte fingerprint with the owner's runtime fingerprint without preserving those line endings.

Studio profile selection, pre-expiry timer cancellation, physical keyboard traversal, screen reader, touch, native scroll-feedback stress and Guy acceptance remain unverified here. Owner's 858 candidate checks were not rerun. No contact with port63358, installation, database reset, publication, Sheets/WordPress write or production action.

Lead handoff: bounded QA-KBD-08 closure is supported; fix or explicitly retain the two P3 findings, then complete preservation startup/install and exact installed-revision evidence. User-result cells remain unchanged.
