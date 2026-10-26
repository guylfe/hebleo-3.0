# Keyboard clearance — current installed delivery

**Historical59f5018 keyboard correction. Current runtime83abf40 adds the Studio lesson picker.** See [current delivery](STUDIO_LESSON_PICKER_DELIVERY.md). All observations and receipts below retain their original build attribution.

Installed at http://127.0.0.1:63358/ on 2026-10-25T14:26:46.9142203Z. Exact runtime commit **59f50184f7851ec682fc1a35435ed99591b93b74**, runtime SHA-256 **d53b093709b4a2f75c9e1a6edd195e8f7c685918f3af5e05186e9b4d706ce583**, PID **50556**, preservation mode. Backend SHA-256 remains 8538730ba39c2f00d6afe8529d06afc9c0f7c0f7131e95757c5bf1146913a89a, identical to2053b8ff. Only public/exercise-actions.js changes executable behavior. The runtime is frozen separately from the documentation/integration checkout.

TXT-NATIVE-01 is corrected: the shared learner/Studio Preview dock measures the actual visible keyboard launcher/panel and its intersection with the dock, follows size and transform changes, and reserves scroll space. The existing keyboard and action controls remain. Focus recovery uses the available interval above actions, including sticky navigation and nearer scrolling containers. Short textareas temporarily fit that interval; authored sizes and inline priorities restore on focus departure, more space or disposal.

## Verification and review boundaries

- Final59f5018: npm run verify:candidate passed **866 tests**, zero failed/skipped, including syntax checks and configured audio exclusions. All25 targeted keyboard/layout/lifecycle probes pass; git diff --check passed. Pinned application/schema dependencies installed offline. [Exact runtime CI40201677225](https://github.com/guylfe/hebleo-3.0/actions/runs/40201677225) succeeded.
- Independent QA on242faf5 closes P2 QA-KBD-08 with73 focused passes, then identifies two P3 lifecycle findings in four of eight new probes. Lead imported474e42f as0a1344a, reproduced the failures, fixed focus-departure cleanup and inline priorities in59f5018, and reran the full configured candidate. See [independent review](QA_KEYBOARD_242faf5.md). No independent review of59f5018 is inferred.
- [Mounted native report and screenshots](KEYBOARD_CLEARANCE_NATIVE.md) retain actual learner text/exercise narrow/desktop open/collapsed observations on242faf5. PNG00 is original2053 overlap; PNG07 is the intermediate378 focus finding; PNG01–06 show242. The last59f5018 cleanup is automated-tested and HTTP-installed, without a fresh native screenshot. Synthetic DOM/UIA delivery and trusted insertion are attributed separately.
- The supported Studio ComboBox ValuePattern set_value and snapshot-bound native popup Author option were both tried in background. Each returned delivery and fresh readback still selected Alex: verified no-ops. Native Studio Preview parity remains unverified. No foreground, injected JS/localStorage or alternate browser was used.
- The bounded Play/read/Back/read timer probe took11267ms against the original10000ms duration and string0704177609112001; expiry may have won. Return showed idle Play. It is **not** a pre-expiry cancellation pass. Exact timer/cancellation/hidden tests pass in automation; native hidden-tab, physical keyboard traversal, screen reader, touch and Guy acceptance remain unverified.

## Preservation and destination

Fresh online backup and restore rehearsal passed. The entire original schema/table logical digest stayed **5627eb01b286a51bcad988c6dae9832c308623690ce5041aa31375f4c5c4d99c** before backup, after restore/startup rehearsal, before switch and after installed HTTP checks. All application rows and settings/history are retained. Active revision4, all three learner profiles, all prior three saved draft lessons and20 unpublished first20 drafts remain. Draft Preview readback covers154 pages/127 unresolved targets; MNT resolves to draft-first20-MNT; the unpublished learner route remains404.

All110 frozen source hashes and59 served asset hashes match the tested bytes; installed checks exercise20 read-only Preview sessions and all three legacy learner lesson sessions. Protected environment/vault/media/uploads/configuration paths retain their before state; recorded absences do not claim files existed. 48 unrelated listeners were preserved through the live process switch. No reset, reseed, schema migration, import, data rollback, publication, Sheets or WordPress write occurred.

Serving checkout: C:\Users\Trans\.openmausbot\task-workspaces\8c900356-50f6-4d41-bbb9-50c8abe09233\860f6c51-8c5b-44fe-a6a3-1cdd3edbb329\hebleo-keyboard-runtime

Original database remains in place: C:\Users\Trans\.openmausbot\task-workspaces\8c900356-50f6-4d41-bbb9-50c8abe09233\b1d5e7a0-1d13-4e9e-b544-06d3b889fb9e\hebleo-consolidated\data\lexical-private-demo.sqlite

Private backup and logs: C:\Users\Trans\.openmausbot\task-workspaces\8c900356-50f6-4d41-bbb9-50c8abe09233\860f6c51-8c5b-44fe-a6a3-1cdd3edbb329\hebleo-native-verification\.private\keyboard-install-59f5018. These SQLite files and learner rows are excluded from Git. Exact final identity, before/after hashes, rehearsal, installed destination and process receipts are versioned in [evidence/keyboard-clearance-20261025](evidence/keyboard-clearance-20261025/INSTALLED_DESTINATION.json). Installer/verifier snapshots use the original task root working-directory assumptions.

## Commands actually executed

1. node --test test/keyboard-dock-clearance.test.js test/qa-keyboard-clearance-independent.test.js test/qa-keyboard-constraint-lifecycle.test.js —25 pass. The imported lifecycle file initially reproduced4 failures; after correction all8 pass.
2. npm run verify:candidate —866 pass, including configured syntax checks; git diff --check passed. Local log .private/keyboard-clearance/candidate-cleanup.log.
3. node verify-keyboard-install.mjs snapshot <frozen runtime> <private receipt folder> <existing DB> —consistent online backup, integrity and unchanged restore rehearsal pass. No live mutation.
4. install-keyboard-preserved.ps1 -Mode rehearse —all HTTP/state checks on restored backup63882 pass. Default-context Get-CimInstance cleanup was denied; elevated context could inspect but failed Stop-Process across the sandbox owner. The original owning context stopped only verified rehearsal PID56220. No live state changed.
5. install-keyboard-preserved.ps1 -Mode apply —fresh old2053 build/PID8300/command/listener assertions, fresh all-table/file assertion, stop only verified old PID, hidden preservation launch, exact-source/destination/listener/command checks pass. No old database restoration is attempted on failure.

## Remaining owners

Guy/Curriculum:127 canonical app targets, introduced letters, human teaching/Nikkud/models and recording/audio approval; Guy acceptance. Native Studio/trusted physical/accessibility coverage and precise pre-expiry cancellation remain bounded tool limitations above, not claimed passes. The separately reported later Sheets update is attributed coordination, not engineering readback or canonical app mapping approval. Documentation/private-main commit and its CI are reported in the final handoff; the installed runtime stays the exact59f5018 code commit.

Current Sheets coordination: Leo reports Curriculum Designer later completed the approved write and full readback:114 lessons,1087 targets,528 sentences,404 readable IDs and30 active comments retained. This engineering task did not access or write Sheets and did not independently verify that report. The pack's rejected-write status is historical creation-time evidence; renewed Sheets approval is not a current engineering blocker. That report does not approve the127 app target mappings.

Cleanup: disposable native PID30232 and restored-backup rehearsal PID56220 are stopped; both63881 and63882 are unreachable. Fresh live readback still serves59f5018 and the entire database digest remains5627eb01. See [CLEANUP.json](evidence/keyboard-clearance-20261025/CLEANUP.json).
