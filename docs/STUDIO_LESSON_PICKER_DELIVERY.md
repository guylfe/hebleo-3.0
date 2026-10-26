# Studio Choose lesson — installed repair

Installed at http://127.0.0.1:63358/ on 2026-10-26T00:05:33.1930809Z. Exact code **83abf400467f2206e9a88356bdf8352ff7add2bf**, runtime SHA-256 **6f1c7576c8f4345da4cbd3fd92e29f18dd879d44cd169cd8b9875b3c85dd25ec**, preservation PID **22424**. This supersedes the prior59f5018 runtime. Backend bytes are identical. Only app.js, refinement.css, studio/curriculum-editor.js and studio/unified-studio.js change executable bytes.

## Where to see the lessons

1. Save any existing workspace edits before refreshing an already-open old build. Open [Studio](http://127.0.0.1:63358/#studio); select **Author · Content author** in Demo profile, then **Studio** if the learner home is shown.
2. Click **Choose lesson** beside Selected lesson. A modal titled **Choose a draft lesson** lists all23 saved workspace lessons with readable IDs, authored titles and the selected state. Search **MEMORY** or **MNT**, then click that lesson.
3. The lesson title receives focus. Expand/use **Interactive text pages** to edit its paginated content. Click **Preview saved draft** above the editor to run that lesson's saved pages. Exit rehearsal, then Choose lesson → MNT to review the other lesson.

Choosing a lesson retains local lesson/page/vocabulary edits, does not save them and does not publish. Preview uses the saved draft, excluding unsaved edits. Cancel/Escape returns focus to Choose lesson. Incomplete/invalid fields or a pending save block switching with a visible error and retain entered values.

## Cause and correction

The installed Choose lesson button called studio-task/lesson. When Edit lesson was already selected, it only reapplied tab visibility. It never opened a chooser. The repaired action calls the existing unified workspace's curriculum owner without rerendering or replacing sibling editors. Its native modal navigation dialog lists workspace.lessons directly, independent of chapter/order filters. Existing collector and CAS guards own selection; the app selected-lesson ID and saved Preview button follow the selected draft. No new auto-save, publication, content mapping or data migration is introduced. Existing native dropdown controls retain their owner; this is an ordinary-button navigation dialog, not a custom listbox.

## Actual verification

- **870 configured candidate tests passed**, zero failures/skips, including syntax checks; four new real-app event-path probes pass. Final focused rerun also passes after making the baseline regression use the actual visible Choose lesson button. Configured audio exclusions remain. [Exact code CI40247261064](https://github.com/guylfe/hebleo-3.0/actions/runs/40247261064) succeeds. No independent reviewer run is claimed.
- The regression boots the actual app.js and mounted unified editor against an actual loopback HTTP server, imports the frozen first20 pack into disposable test data, enters Studio, opens all23 lessons and selects MEMORY/MNT. It verifies each editor's saved title/page count and the exact lesson ID/draft token sent to the shared Preview, with its actual text reader mounted. All database tables remain byte-logically identical across chooser/editor/Preview actions. The same visible-button test fails against installed59f5018 because no dialog opens.
- Additional probes retain an unsaved original lesson title, MEMORY page title and sibling vocabulary note across switches; Preview excludes unsaved page text. Chapter filtering cannot hide drafts from this picker. Search, selected state, focus, Cancel/Escape, invalid sibling JSON and pending-save/CAS refusal are covered. These are JSDOM/real-HTTP checks, not native visual/accessibility certification.
- Exact frozen-source startup rehearsal and installed HTTP verification pass all110 source hashes,59 served asset hashes,20 saved draft Preview sessions/154 pages, all three legacy learner sessions, MNT alias and the unpublished learner404. The served app.js includes the repaired action; imported drafts remain separate from the active three learner lessons.

## Mounted native limit

The mounted driver admitted a new isolated Chrome process3808/window2559564 without foregrounding or modifying an existing profile. Exact native-to-browser binding succeeded. The fresh typed snapshot read the original59f5018 page with Alex selected. An explicitly synthetic background DOM click on Demo profile returned effect unverifiable; fresh readback retained Alex. Windows UIA exposed only14 browser-chrome nodes, no Demo profile element. Native window capture was blank; the typed browser screenshot rendered the Alex home. With no fresh native profile element to target, no ValuePattern action or Studio chooser selection was performed in this run. Previous supported selector no-ops remain historical evidence in KEYBOARD_CLEARANCE_NATIVE.md. The isolated session was ended.

No foreground takeover, raw page JS/localStorage/profile injection, shell browser, headless or substitute computer was used. Actual native Studio picker/Preview, geometry/reflow, physical keyboard traversal, screen reader and touch remain **unverified**. No source-level assertion or simulated probe is a native screenshot. This bounded limitation does not prevent the verified real-app/HTTP repair and usable user review path above. See [exact native evidence](evidence/studio-picker-20261026/NATIVE_LIMITATION.json).

## Preservation and receipts

Fresh online backup, integrity check and restored-copy startup rehearsal passed. Entire original database logical digest remains **5627eb01b286a51bcad988c6dae9832c308623690ce5041aa31375f4c5c4d99c**, equal before/after backup, rehearsal, switch and installed verification. Active revision4, all three learners/settings/history, original three draft lessons and20 unpublished first20 drafts remain;154 pages/127 unresolved targets retain identity. Environment, vault, media, uploads and designated configuration paths retain their before-state, including recorded absences. 47 unrelated listeners survive the switch. No reset, reseed, migration, import, database rollback, Sheets/WordPress write or publication occurred. No user browser tab was refreshed.

Serving checkout: C:\Users\Trans\.openmausbot\task-workspaces\8c900356-50f6-4d41-bbb9-50c8abe09233\860f6c51-8c5b-44fe-a6a3-1cdd3edbb329\hebleo-studio-picker-runtime

Existing database retained: C:\Users\Trans\.openmausbot\task-workspaces\8c900356-50f6-4d41-bbb9-50c8abe09233\b1d5e7a0-1d13-4e9e-b544-06d3b889fb9e\hebleo-consolidated\data\lexical-private-demo.sqlite

Private backup/log directory: C:\Users\Trans\.openmausbot\task-workspaces\8c900356-50f6-4d41-bbb9-50c8abe09233\860f6c51-8c5b-44fe-a6a3-1cdd3edbb329\hebleo-lesson-picker\.private\picker-install-83abf40. SQLite backups, actual learner rows and credential values are excluded from Git. Versioned [build/destination/process/backup hash receipts](evidence/studio-picker-20261026/DESTINATION.json), executed installer/verifier snapshots and test logs are beside this report. Scripts retain their original task-root working-directory assumptions. Rehearsal63884 was stopped after verification.

Executed: npm ci offline for application/schema; npm run verify:candidate; focused four-test command; baseline expected failure; node prepare-picker-runtime.mjs; node verify-picker-install.mjs snapshot; install-picker-preserved.ps1 -Mode rehearse; install-picker-preserved.ps1 -Mode apply; git diff --check; private push and exact-ref/CI readback. Raw full candidate log remains private at .private/picker/candidate.log. Private-main delivery/ref CI is recorded in the final handoff; its documentation commit has identical executable source to83abf40.

Guy/Curriculum still own127 canonical target mappings, letters, teaching/Nikkud/models/audio approval and acceptance. This repair requires no publication or renewed Sheets approval. Native coverage remains bounded as above.
