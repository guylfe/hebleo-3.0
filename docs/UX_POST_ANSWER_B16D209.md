# UX-E10-01 correction recheck

2026-10-22, assignment a12c1bb3-3c5b-4f2a-98af-6a1c938e30e2. Read-only owner review of exact `b16d2091525b3ed44af167dbee6065e66e066ee6`.

**Disposition: UX-E10-01 is fixed in the inspected code and independent executable reproduction. Focused regressions pass. Native confirmation is blocked; physical and Guy acceptance remain Pending.**

Checkout: `C:/Users/Trans/.openmausbot/task-workspaces/8c900356-50f6-4d41-bbb9-50c8abe09233/026a3c11-8a4d-46f8-8421-f680c481f3cc/app`. No shared files were changed. Review output is in this report's directory. Owner demo 63358 was not navigated, graded or requested.

## Candidate verification

HEAD and isolated-copy `GET http://127.0.0.1:63360/api/build` independently report exact b16d2091525b3ed44af167dbee6065e66e066ee6. Runtime SHA256 is `96f37620a319e700e628bb588c05c9024c3efb898b3ec5457427fc794e6c4357`; backend SHA256 remains `e1194b748380d7bb78be6e5a2248aeff62c5161429e13ec397642e992e00e6c1`; preservationMode=true. Five served JS/CSS assets independently match both the checkout and build-manifest hashes (b16-runtime-build.json, b16-served-assets.json). Final checkout status is empty.

Inspected the actual 444b917 to b16d209 diff, including the correction and added regression. In public/post-answer-vocabulary.js bindCard, the new listener ignores already-consumed Escape, finds the closest open native details containing the event target, closes it, prevents the Escape default, stops propagation, and focuses its direct summary. Disposal removes the listener. It is registered before the outer reminder key handler, whose existing defaultPrevented check keeps the reminder open for the first Escape. The existing lexical disclosure owner runs first and remains authoritative for its disclosures. No eligibility/content/API inference is introduced by this handler.

## Original independent reproduction

Reran `node probe-legacy-disclosure.mjs b16d2091525b3ed44af167dbee6065e66e066ee6` against the actual candidate modules, using the same recognition-card and summary-focus setup that reproduced the defect. The probe gained a revision argument and second-Escape/focus readback; its original first-Escape reproduction is retained. Earlier before-fix output remains in legacy-disclosure-probe.json and its report remains unchanged.

| Observation | Before fix, 444b917 | Corrected b16d209 |
|---|---|---|
| First Escape: card open | false | true |
| First Escape: disclosure open | true in detached subtree | false |
| First Escape: focus | exact word trigger | disclosure summary |
| Second Escape | already dismissed | card closes; exact word trigger focused |

Current executable output: b16-original-probe.json; exit 0. This uses jsdom and stub rectangles and does not establish native keyboard behavior or layout.

## Bounded regression and retained guards

Commands ran from this review workspace with absolute read-only checkout test paths.

| Command | Actual result | What it establishes |
|---|---|---|
| node --test [app]/test/vocabulary-reminder.test.js [app]/test/post-answer-vocabulary.test.js | 35/35 pass, exit 0 | Includes UX-E10-01 correct/incorrect results crossed with summary/body focus, first disclosure close, second card close, exact focus, owning open Preview dialog and unchanged serialized tables; retains shared lifecycle/identity/shortcut/projection checks |
| node --test --test-name-pattern=POST-VOC [app]/test/app.test.js | 3/3 pass, exit 0 | Disposable HTTP/app regressions preserve graded state/attempts, feedback reload and retry/next/profile cleanup, including delayed choice-save race |
| node --check [app]/public/post-answer-vocabulary.js | Exit 0 | Corrected file syntax |

Logs: b16-focused-tests.txt and b16-http-tests.txt. The correction regression has four sub-scenarios within one named test; 38 is the total named-test count run here. No broad suite/schema rerun was performed and no Lead/QA result is represented as this review's own execution. These are DOM/HTTP evidence, not a native Preview top-layer walkthrough or physical acceptance.

## Native attempt and remaining limits

Mounted `mcp__computer__list_windows({})` was attempted anew for this correction. It returned isError=true: “Another thread is using this computer. This call was not performed.” No window/tab inspection, screenshot, navigation or native input was performed. No foreground fallback, browser preparation, alternative route or shell browser was attempted. The prior existing-profile consent refusal was not reproduced here. This attempt proves a shared-computer resource blocker only.

Native first/second Escape, actual Tab/summary/body focus, owning Preview dialog behavior, hover/transit, pointer dismissal, playback, RTL/Nikkud and narrow/short rendered geometry remain unverified. Physical touch/mobile acceptance remains deferred to Guy's APK decision; physical/Guy acceptance stays Pending. The generic Python static auditor's previously recorded launcher blocker remains unverified on this correction and is not reported as a pass. No new Guy decision or credential is required for this bounded disposition.
