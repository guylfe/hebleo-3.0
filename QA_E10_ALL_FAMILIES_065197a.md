# Independent E10 all-six-family QA — 2026-10-22

**Disposition: correction required.** Candidate checks pass, but independent probes reproduce one medium-severity interaction defect in both grading outcomes. Native/rendered/physical and Guy acceptance remain Pending.

Reviewed candidate: `065197a74194eb8b5149bcf3d79b8f312cf26acd`.

QA repository: `C:\Users\Trans\.openmausbot\task-workspaces\71c71389-5334-4e0c-9ca8-d80dd28223d1\653fb433-7485-48b1-9f7c-cb22711bda02\hebleo-3\qa-e10-all-065197a`.

QA branch: `qa/e10-all-065197a`. This is an independent local clone without hard links. Lead's checkout was only read. No implementation fixes are included.

## Executable identity and byte discrepancy

The clone was configured with `core.autocrlf=true` **before** checkout, matching Lead's Git configuration. `git diff --exit-code HEAD -- public src scripts package.json package-lock.json` passes. Runtime hashes below are actual checkout-byte hashes, not hashes substituted after LF conversion.

| Evidence | SHA256 |
| --- | --- |
| Tested Git-normalized checkout runtime | `466f2771a4225f13edde985ff94155afb18cf30a1e23391af8639d44b3ffd47c` |
| Supplied candidate / Lead checkout runtime | `d99edda8a1f0d70d61ffc23d4d3350aff368518da1afb33b1acc0f1b1c45446d` |
| Backend, identical in both | `f94b21150dcf6d91efd06ceffd30f67647fdbcbaf2cf941ff29a1cc20c8f96e4` |

Exactly two tracked files differ from the supplied receipt: `package.json` and `scripts/exercise-bindings-fixture.mjs`. The fresh Git checkout uses CRLF; Lead has LF in these two files despite `core.autocrlf=true`. For each file, diagnostic LF conversion produces the supplied file hash. No other executable file hash differs. The tested bytes were left unchanged. A read-only `executableIdentity` call on Lead's checkout independently matches the supplied aggregate/backend hashes.

This is a delivery-identity discrepancy, not a demonstrated behavior regression. Lead should normalize/reissue its build receipt or explicitly retain both byte identities. The broad results here must not be described as an aggregate-byte-exact `d99ed...` run. Full tested identity is saved in `QA_IDENTITY.json`.

## Commands actually executed

Environment: Node `v24.19.0`, npm `11.17.0`, Git `2.54.0.windows.1`, Windows PowerShell.

| Command | Actual result | Local log |
| --- | --- | --- |
| `npm ci --ignore-scripts --no-audit --no-fund --offline` | 49 packages installed | tool output |
| `npm --prefix schemas ci --ignore-scripts --no-audit --no-fund --offline` | 5 packages installed | tool output |
| `npm run verify:candidate` | Syntax passes; **759 passed, 0 failed**, 87.2 seconds | `qa-candidate.log` |
| `npm --prefix schemas test` | **27 passed** | `qa-schemas.log` |
| `node --test schemas/checks/contracts.check.mjs` | **18 passed** | `qa-contracts.log` |
| `node schemas/tools/validate.mjs --seed --runtime .` | Accepted; `inputUnchanged: true` | `qa-seed.log` |
| `node schemas/tools/runtime-check.mjs --runtime .` | **9 scenarios pass**, memory-only DB and ephemeral HTTP | `qa-runtime.log` |
| `node --test qa-tests/e10-independent.test.js` | **24 tests: 22 pass, 2 fail**, both QA-E10-02 | `qa-independent.log` |
| `node --test --test-name-pattern=QA-E10-02 qa-tests/e10-independent.test.js` | Repeated three times: both outcomes fail each run, exit 1 | `qa-regression-repeat-{1,2,3}.log` |
| `node --check qa-tests/e10-independent.test.js` | Pass | tool output |
| `git diff --check` | Pass | tool output |

Candidate runner excludes filenames matching `/audio/i` and test names matching `[Aa]udio|[Ss]peed|[Pp]layback`, exactly as supplied. These results are not audio-quality/speed acceptance. The runner discovers `test/` only; the new independent probes in `qa-tests/` were run separately and their failures are not hidden in the 759-pass result.

## QA-E10-02 — medium: feedback card collapses on pointer transit

Exact candidate: `065197a74194eb8b5149bcf3d79b8f312cf26acd`.

The focused reproduction uses real Store draft/preview methods, `exerciseFeedback`, `bindResultExplanations`, `mountAnsweredVocabulary` and `bindVocabularyReminders`. The separate all-family workflows additionally exercise `mountExerciseEditor` and real HTTP draft/evaluation endpoints. Every new probe database is in-memory. DOM geometry is stubbed; this establishes event/timer behavior, not native layout.

1. In a synthetic cloze exercise, link the `feedback` surface to existing synthetic vocabulary ID `qa-only-word`.
2. Save the draft and grade either a correct or an incorrect answer.
3. Enter the explanation popover, then click its linked feedback word to pin the card. The card opens and its Close control receives focus.
4. Move the pointer from the explanation onto the card (`pointerleave` with the card as `relatedTarget`, followed by card `pointerover`).
5. After 260 ms, the explanation is hidden and the pinned card is gone. Expected: the pinned card remains usable while its owner surface stays available.

The two regressions fail at `assert.ok(root.querySelector('.vocabulary-reminder'))` with `actual: null`, for `correct=true` and `correct=false`. Three further focused runs reproduce the same two failures. All database tables remain equal through the failed interaction.

Relevant implementation:

- `public/learner-view.js`, `bindResultExplanations`: its 180 ms `leave()` timer only recognizes descendants of `.result-explanation` and focus inside that box.
- `public/vocabulary-reminder.js`, `open()`: a feedback anchor is inside `role=status`, so the reminder deliberately mounts **after** the status region. It is outside `.result-explanation`.
- The reminder's card pointer handler cancels its own transit timer, but cannot cancel the explanation's independent timer. Once the explanation hides the anchor, the reminder's availability monitor closes the pinned card.

The shared owners imply the same lifecycle risk for links in `feedbackDetails` and other exercise families; those additional combinations were not separately reproduced. Lead owns the correction. Preserve the existing role/status placement and focus semantics while coordinating both owners' transit/visibility lifecycle. Do not fix this by accepting unavailable anchors globally.

## Additional independent coverage that passed

For **each of all six families**, new probes execute local create/rebind/remove with stable/new occurrence-ID assertions, exact CRLF/pointed/emoji snapshots, real HTTP draft Save and evaluation for both grading outcomes, pre-answer withholding, card opening on revealed authored surfaces, no nested or disabled-button triggers, unchanged raw result answers, and equality of every persisted table around rehearsal/card viewing.

They also execute publish, bound-only dependency impact, newer word publication, saved feedback pinned to the old revision, fresh Store backup restore, atomic rejection of a malformed bound backup, and rollback. Separate fresh-remount Studio probes save a rebind, reopen it with the same occurrence ID and changed target, save removal, and verify rehearsal has no residual explicit triggers, across all six families.

Independent negative probes cover unsupported/reserved/missing IDs and fields, NaN/Infinity/invalid indices, stale source, normalization changes, unknown fields, duplicate occurrence IDs, overlaps and missing targets, with atomic Stage rejection and all-table equality. An independent exhaustive range oracle checks **482 UTF-16 ranges** across Hebrew marks, CRLF/CR/LF, emoji ZWJ/family sequences, regional flags, skin tones, combining text, HTML-like text and bidi isolation. Split graphemes fail; complete graphemes pass. Missing Intl.Segmenter fails closed.

Additional probes verify wrong revision/lesson/exercise guards, missing projection and forged unrelated ID denial, managed bound-only word denial without flat fallback, and distinct authored identity for identical token/accepted-answer rows. The candidate suite independently reruns the supplied controller, actual app over HTTP, current managed-form gates, pinned/reloaded feedback, import/restore, stale row, and zero-write regressions. Their passing evidence is automated component/protocol evidence.

## Preservation, limitations and handoff

- No owner DB, learner backup, source state, Masterfile, seed content or curriculum was opened for modification. No owner runtime endpoint was contacted. No install, restart, fixture replay or fresh-progress reset was performed on the owner demo at 63358.
- New fixtures are authored inside disposable test snapshots only. No canonical linguistic mapping was created.
- No browser/profile/foreground/headless route was attempted; the assignment's existing profile-consent blocker remains. Native pointer defaults, rendered Hebrew/RTL/Nikkud, screen readers, zoom, touch and Guy acceptance remain unverified.
- The strict visual/source audit was not independently rerun; its three inherited findings remain Lead-reported evidence. This report does not claim to resolve or confirm their rendered impact.
- Shared array identity still cannot distinguish external swaps of byte-identical rows without row IDs, as ADR B04 states.
- `docs/FEATURE_CHECKLIST.md` E10 is updated only in this QA branch to record the independent failure and preserve pending human acceptance. Lead should integrate the bounded ledger update with its correction.

Changed files: `qa-tests/e10-independent.test.js`, this report, `QA_IDENTITY.json`, and the E10 row in `docs/FEATURE_CHECKLIST.md`. Logs are ignored and remain local. No public/src/scripts/package/schema implementation file changed.

Next handoff: Lead should correct QA-E10-02, reconcile the byte receipt, and rerun the focused regression plus relevant integrated checks on a new frozen candidate. Recheck that the pinned card survives transit for correct/incorrect feedback and detailed feedback in learner and saved rehearsal, without adding writes or altering focus/grade/raw-answer behavior. Native and Guy acceptance remain separate gates.
