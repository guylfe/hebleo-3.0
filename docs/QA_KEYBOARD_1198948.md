# Independent keyboard/action clearance QA, 25 October 2026

Reviewed exact candidate `1198948eaefdd404f47d6fe43ebe305556b6bc05`, parent `4eabe901`. Disposition: **hold bounded TXT-NATIVE-01 closure for QA-KBD-08 (P2)**. The launcher/action clearance and measured lifecycle checks pass; the new focused-answer recovery does not guarantee visibility above the keyboard/action boundary.

Reviewer checkout: `C:\Users\Trans\.openmausbot\task-workspaces\71c71389-5334-4e0c-9ca8-d80dd28223d1\653fb433-7485-48b1-9f7c-cb22711bda02\hebleo-3\qa-keyboard-1198948`, branch `qa/keyboard-clearance-1198948`. Local clone from the assigned owner checkout, checked out by exact SHA; its unrelated working-tree edits were excluded. No application source changes by reviewer.

## QA-KBD-08: viewport centering can leave the focused answer obscured

Location: `public/exercise-actions.js`, `measure()` focus-recovery branch, lines 46–51. The corresponding `focusin` handler also uses scrollport centering.

Reproduction command: `node --test --test-name-pattern=QA-KBD-08 test/qa-keyboard-clearance-independent.test.js`.

The deterministic fixture models an 800px viewport and a 60px-high answer. With keyboard top at 600, answer y280–340 is visible. A keyboard ResizeObserver update moves its top to 350. The dock correctly moves to y274–342 (68px height, 8px keyboard gap). The new recovery calls `scrollIntoView({block:'center'})`. Centering in the learner document puts the answer at y370–430, behind the keyboard. Centering in the Preview dialog scrollport (y20–760, including its existing 100px fallback end scroll-padding) puts it at y310–370, overlapping both action and keyboard regions. Both visibility assertions fail; the answer stays focused with its value and selection intact.

The reserve is assigned to the exercise scope, which is not the document/dialog scrolling element. `public/refinement.css` places the Preview scroll-padding on the ancestor dialog with a 100px fallback; the scope's measured custom property does not inherit upward. A larger document padding reserve creates scrollable space but does not change scrollport center alignment. The supplied candidate test instead stubs `scrollIntoView` by assigning `fieldTop=100`, so it assumes recovery success.

This is executable simulated geometry and a source-level algorithm counterexample, **not a native rendering result**. It demonstrates an unfulfilled correction path, not evidence that the ordinary launcher clearance still fails. Proposed engineering direction: recover relative to the actual available interval above `dock.top`, in the owning document/dialog scroll container; retain focus/selection/value and avoid repeated-scroll feedback. Lead owns the correction and exact-candidate native verification.

## Executed checks

- `npm ci --ignore-scripts --offline --no-audit --no-fund`: 49 packages installed from local cache, success; no package changes.
- `node --test test/keyboard-dock-clearance.test.js test/ux-actions-independent.test.js test/qa-actions-independent.test.js test/keyboard.test.js test/text-reader.test.js`: **61 passed, 0 failed**, including original 5 clearance checks, action gating/recovery, real keyboard target lifecycle, and reader/timer behavior.
- `node --test test/qa-keyboard-clearance-independent.test.js`: **8 passed, 2 failed**, both failures QA-KBD-08 learner/Preview. Local output: `.private/qa-keyboard/independent.log` (ignored, synthetic geometry only).

Additional passing reviewer coverage: missing/zero-size/hidden/transparent/nonintersecting keyboard, late mount/replacement/removal, multiple obstacle minimum, panel and action-height reflow, viewport offsets and host width, dialog bounds, unrelated modal/inert suspension without changing primary gating, transition following/deadline when end event is missing, target removal, idempotent destroy with queued transition, observer/listener release, answer focus/value/caret preservation, and settled frame queues. These are bounded simulated/DOM lifecycle checks; native scroll loops remain unverified.

## Boundaries and handoff

No mounted computer/browser was used by this review, as requested; owner remains responsible for native after screenshots, Studio UIA `set_value`, exact 10-second timer cancellation, and eventual preservation installation. No full-suite repeat; owner-reported 846 candidate result was not independently rerun here. No contact with port 63358, owner database, production, WordPress, Sheets, purchases, learner records or external configuration. Existing focused integration tests use disposable stores and loopback ephemeral ports.

Reviewer deliverable contains only `test/qa-keyboard-clearance-independent.test.js`, this report, and the bounded TXT-01 checklist note. Cherry-pick the reviewer commit if useful, resolve QA-KBD-08, then rerun this regression and existing focused checks before exact-new-SHA review/native acceptance. Guy acceptance remains Pending.
