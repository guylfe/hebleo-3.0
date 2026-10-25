# Lead review of Feature dock clearance — 25 October 2026

Candidate: `0c3ccfe8b9d6b3865434ecf093cfdb852027221f`, `fix/dock-keyboard-clearance-20261025`, remotely verified in private `guylfe/hebleo-3.0`. **Geometry correction accepted as a bounded candidate; installation held for the focused-answer visibility gap.** No source code, installed process/database, other active checkout or shared index was changed by this review.

## Checked evidence

Lead independently cloned the supplied Feature checkout with `--no-hardlinks --no-checkout`, checked out the exact candidate on `review/dock-clearance-20261025`, installed pinned49 packages using `npm ci --offline --ignore-scripts`, inspected the actual runtime diff and seven new tests, and ran:

`node --test test/dock-clearance.test.js test/ux-actions-independent.test.js test/text-reader.test.js test/text-release-integrity.test.js test/keyboard.test.js`

Result: **59 passed, zero failed**, recorded in [focused.txt](evidence/dock-lead-review-20261025/focused.txt). This is Lead's own run. Feature's848 distinct candidate passes across its initial820 passes/three dependency load failures and the corrected28-case rerun remain attributed to Feature's retained logs; Lead did not repeat that full suite.

Source inspection confirms the document-scoped launcher reservation uses separate owners, releases suspended/disposed owners, preserves a concurrent Preview reservation, tracks replacement/open keyboard panels and reserves final slide-in panel height. Only exercise-actions.js, keyboard-owner.css and the relevant refinement.css launcher selectors change runtime behavior. No identity, schema, gates, grading, pending Finish, content or import contract changed.

Lead viewed the saved actual narrow closed-keyboard and wide open-keyboard screenshots. They substantiate visible launcher/Continue and launcher/Check separation on this candidate. The original tool snapshots, eight screenshots and trusted-background-click results remain [Feature evidence](DOCK_KEYBOARD_CLEARANCE.md); they were not freshly exercised by Lead in this review. Native Studio, physical keyboard, screen reader, touch and Guy acceptance remain unverified. No blanket native pass is claimed.

## Reproduced focused-answer gap

The returned source retains the old focusin-only `scrollIntoView({block:'center'})` handler and does not recover focused inputs when keyboard/dock geometry changes. Lead reused QA's independent learner/Preview reflow fixture from the active1198948 review, with two disclosed fixture adaptations to this candidate's actual contract:

1. The keyboard panel has the recognized `.hebleo-keyboard--open` class.
2. Final keyboard height grows200→450px as its top moves600→350px in an800px viewport, keeping its bottom anchored at800px.

Executed command: `node --test --test-name-pattern=QA-KBD-08 test/lead-dock-focus-review.test.js`. **Both cases fail.** In learner and Preview, the dock occupies y282..350 while the focused answer remains y280..340 and no recovery scroll occurs. Logs are [focus-reproduction.txt](evidence/dock-lead-review-20261025/focus-reproduction.txt); the exact temporary probe is archived as [focus-probe-source.txt](evidence/dock-lead-review-20261025/focus-probe-source.txt). It originally ran from `test/` with the normal relative imports, then was removed from that directory after archival. These are deterministic supplied-geometry checks, not newly observed native failures. The original59-case run remains a pass; the additional focused checks reveal its coverage limit.

## Integration decision and next owner

The other active Lead task, #@Leo 3.0 · work (thread860f6c51-8c5b-44fe-a6a3-1cdd3edbb329), already owns the overlapping1198948 clearance candidate and QA's focus correction. **That existing integration task remains the sole delivery path.** Feature's0c3ccfe branch and native evidence are preserved as a reviewed alternative; no competing install or direct cherry-pick was performed here. Its native screenshots must not be attributed to1198948 or any subsequent combined build.

The two geometry policies differ: Feature raises the launcher above the dock through an owned CSS property;1198948 moves the dock away from measured keyboard surfaces, including the launcher. They must not be blindly combined: a dock that avoids a launcher which is also repositioned to avoid that same dock can produce a measurement feedback loop. The active Lead implementation should retain one policy, complete focused-answer visibility using the actual visible scrollport, freeze the final candidate, rerun its bounded QA/native checks and then preserve-install. This review does not replace that active work or discard either branch.

At read-only verification during this review, live63358 still reports reviewed2053b8ff / runtime dc9fba405653a629f21306ee6529b3585ded140e45a9ab280d71b9b8311f1102 in preservation mode. This verifies live identity, not a new database conservation audit. No test opened the installed database; all review state was isolated JSDOM/synthetic data. The20 adapted lessons remain subject to the existing unpublished/human-review constraints.

Driver access is already available through the mounted isolated-browser route. The remaining work is integration, focus/geometry verification, supported Studio/keyboard routes and preservation installation; a grant to the existing signed-in Edge profile is not a prerequisite for this review. Lead owns the next correction and delivery step in the active task.
