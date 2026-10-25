# TXT-NATIVE-01 correction — 25 October 2026

Candidate branch: `fix/dock-keyboard-clearance-20261025`, based on private main `8e94c7d18972d716524c17c95995dcb29008c36e`. **installed=false**. Lead owns review, integration and any preservation installation. Guy acceptance remains Pending.

Repository: `C:\Users\Trans\.openmausbot\task-workspaces\71c71389-5334-4e0c-9ca8-d80dd28223d1\653fb433-7485-48b1-9f7c-cb22711bda02\hebleo-3\dock-clearance-feature`. This is an independent clone and index; the shared checkout and Lead's active checkout were not edited.

## Change

`public/exercise-actions.js` remains the canonical learner/Preview dock owner. It reserves the measured dock top plus 12 CSS px for the floating keyboard launcher. The existing CSS owner consumes one shared property, preserving its normal responsive edge when there is no active dock. Open keyboard height is reserved immediately during the slide-in and tracked with ResizeObserver, including replacement panels. Modal/drawer suspension releases only that dock's launcher contribution; concurrent Preview ownership survives learner disposal. Explicit disposal and removed-host navigation clear reservation, observers and listeners. Grading, authored gates, pending saves, Finish, identity and content are unchanged.

Runtime edits are limited to `public/exercise-actions.js`, `public/keyboard-owner.css` and the launcher selectors in `public/refinement.css`. `test/dock-clearance.test.js` adds seven regression tests. The fixture script and evidence are engineering-only; no application route or profile selector was added.

## Actual native evidence

Mounted Cua Driver, driver-owned `isolated_new` Chrome, exact native-window binding, background delivery only. No existing signed-in profile, raw CDP, JavaScript injection, shell/headless browser, foreground action or driver configuration change. The application fixture is a normal in-memory server at63891, started with `node scripts/dock-clearance-fixture.mjs`; it imports all20 first20 lessons as unpublished drafts and activates only a clearly labelled synthetic engineering lesson. It creates no lexemes and never opens the installed database.

| Evidence | Observed result |
| --- | --- |
| [01 before narrow](evidence/dock-clearance-20261025/01-before-narrow.png) | Reproduced baseline: launcher covers the right side of Continue. Native frame627×980; actual viewport484.8000183×697.6000366 CSS px, PNG605×871. |
| [02 after narrow](evidence/dock-clearance-20261025/02-after-narrow.png) | Same viewport, closed launcher clears the complete Continue action. Screenshot-derived separation is approximately12 CSS px (about15 PNG px); this is image measurement, not a browser DOMRect claim. |
| [03 gate](evidence/dock-clearance-20261025/03-after-gate.png) | Trusted background click at CSS(450,663), the previously obstructed right side, advanced to page2. Fresh snapshot shows required activity, disabled Continue/model reveal and disabled outer Finish. |
| [04 open keyboard](evidence/dock-clearance-20261025/04-after-keyboard-open.png) | Trusted launcher click opened the real keyboard; dock sits above panel, launcher above dock, all three action buttons remain visible. Close control was available. |
| [05 wide exercise](evidence/dock-clearance-20261025/05-wide-exercise.png), [06 open](evidence/dock-clearance-20261025/06-wide-exercise-keyboard.png) | Actual learner typing exercise, native frame1500×980, viewport1184×697.6000366 CSS px. Check remains above the keyboard and clear of launcher. Open screenshot gives approximately12 CSS px between launcher and dock. |
| [07 modal](evidence/dock-clearance-20261025/07-modal.png), [08 closed](evidence/dock-clearance-20261025/08-modal-closed.png) | Trusted Lesson help click opens the real modal; underlying dock is absent and launcher returns to normal edge. Trusted Close restores dock and raised launcher. No comment was posted. |

Each screenshot has a sibling mounted-tool JSON snapshot with viewport metrics and current refs. Trusted clicks are browser input delivered in the background, not physical mouse/keyboard input. Application effects are established by fresh snapshots, not the click tool's `effect:unverifiable` receipt. No synthetic DOM click was used in this task's native pass. The fixture's markup/content and unit-test rectangles are synthetic and separately labelled.

The first browser lifecycle ended after the keyboard-close dispatch; subsequent readback returned `authorization_host_failed` and prescribed prepare/bind recovery. That close's immediate effect is not claimed. A new isolated process5352/window5180740 was prepared and exactly bound for wide/modal checks. The first process was18220/window6231474. No refused route was retried as foreground. An attempted legacy read-only DOM class query reported Windows UIA does not support class selectors; no JavaScript fallback was used. Native geometry here is viewport/window metrics plus screenshot-derived clearance, not injected coordinate instrumentation.

## Executed verification

- `npm ci --offline --ignore-scripts`:49 packages; zero reported vulnerabilities.
- `npm run check`:passed.
- `node --test test/dock-clearance.test.js test/ux-actions-independent.test.js test/text-reader.test.js test/text-release-integrity.test.js test/keyboard.test.js`:59 passed, zero failed/skipped. [Log](evidence/dock-clearance-20261025/focused.log.txt).
- `npm run test:candidate`:initially820 passed and3 test-file load failures because schema `ajv` was absent. [Unedited initial log](evidence/dock-clearance-20261025/candidate-initial.log.txt).
- `npm ci --offline --ignore-scripts --prefix schemas`:5 packages, zero reported vulnerabilities. Then `node --test --test-skip-pattern='[Aa]udio|[Ss]peed|[Pp]layback' test/feedback14-refinements.test.js test/text-integration.test.js test/ux14-result-regressions.test.js`:28 passed, zero failed/skipped. [Log](evidence/dock-clearance-20261025/dependency-recheck.log.txt). These resolve all three load failures:848 distinct passing candidate tests across the two runs, not a claim that the initial command passed. Configured audio exclusions retained.
- Candidate log includes the original QA-TXT-04 delayed Finish race, normal gate/save tests, later-portion/history/profile departure and successful/failed delayed position-save cancellation passes.
- Seven new tests cover360/484.8/760/1280 supplied widths, changing dock/panel heights, slide-in geometry, visual viewport offset, learner/Preview modal ownership, drawer, removed-host navigation, explicit disposal, observer disconnection, replacement panel and prior inline property restoration. These use supplied geometry in JSDOM and do not establish native Preview layout.
- `git diff --check`:passed (existing LF/CRLF conversion notice only).
- Premium static-audit command attempted: `python C:/Users/Trans/.codex/plugins/cache/openai-curated-remote/frontend-design-premium/1.4.0/skills/frontend-design-premium/scripts/audit_project.py . --mode strict --output docs/evidence/dock-clearance-20261025/premium-audit.json`. PowerShell could not resolve `python`; no audit result or static-audit pass is claimed. Existing DESIGN.md/UX-CONTRACT.md and shared owners were inspected; no design-system change.

## Preservation and remaining limits

No install, reset, publication, WordPress/Sheets request, production change, paid operation, credential access or real draft/learner write. A final read-only63358 `/api/build` readback still reports2053b8ffd3ef26de0781715609806cc7721fa1b8 and runtime dc9fba405653a629f21306ee6529b3585ded140e45a9ab280d71b9b8311f1102 in preservation mode; [receipt](evidence/dock-clearance-20261025/installed-unchanged.json). This verifies installed identity, not a new whole-database digest audit. All test state lives in memory; fixture process43060 is stopped at handoff.

Native Studio Preview was not established: Lead's prior mounted Author-option no-layout-box limitation remains, and no profile injection/selector redesign was used. Automated shared-renderer/Preview modal checks passed. Physical keyboard, screen reader, touch,200% zoom, arbitrary short viewports and Guy acceptance remain unverified. Narrow modal-specific screenshot is not claimed. Lead should review this branch, integrate if accepted, preserve-install, and recheck the corrected native destination; supported native Studio access remains a separate route requirement.
