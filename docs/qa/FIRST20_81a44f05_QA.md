# Independent corrected first20 QA — 81a44f05

Reviewed executable: `81a44f05d5a99b437d37a5cb6035342a259c8a37`, independently cloned from the supplied Lead checkout. The private remote branch `feat/native-first20-20261025` was independently verified at that SHA using `git ls-remote`. QA branch: `qa/native-first20-81a44f05`. This handoff changes tests, evidence and the checklist only; all application bytes remain at the reviewed SHA.

**Verdict: QA-TXT-01/02/03 closed for the bounded automated checks; hold installation for new QA-TXT-04 (P2 progress-integrity blocker).** No native UI/Guy acceptance is assigned. Release's five focused tests also passed in this run; Release retains its own independent disposition.

Checkout: `C:\Users\Trans\.openmausbot\task-workspaces\71c71389-5334-4e0c-9ca8-d80dd28223d1\653fb433-7485-48b1-9f7c-cb22711bda02\hebleo-3\qa-native-first20-81a44f05`.

## Disposition

| Finding | Independently observed result |
| --- | --- |
| QA-TXT-01 | Fixed for unanswered inner/outer learner and Preview gates, positive choice/recall unlocking, HTTP terminal refusal, grade-driven completion guard and normal delayed-save Finish. Added HTTP coverage confirms both explanation blocks must pass, refusals change no table, page writes alone do not complete, and explicit Finish succeeds after commitments. A committed wrong choice remains permitted by the authored commitment contract. |
| QA-TXT-02 | Fixed. Added checks cover all three fictional profiles: same-build reset is a complete no-op, a new fingerprint clears text answers/reveals, and notes, preferences and authored draft remain intact. The preservation installer does not call this reset. |
| QA-TXT-03 | Fixed. Mutual and three-node cycles refuse without table changes. Review exposes `Cyclic prerequisite references: draft-first20-...`; the corresponding acyclic chain successfully imports. |
| QA-TXT-04 | **New P2 blocker:** an awaiting outer Finish continues against a newly selected profile and lesson, producing an actual terminal progress write and completion for that other context. |

The change to the historical learner reproduction is legitimate: d912e746's failing logs/report remain unchanged, the corrected regression asserts disabled Continue and no writes instead of waiting for the invalid write, then actually commits choice/recall and verifies completion. Preview separately verifies refusal and positive disposable continuation. This is supported by the shared predicate in `public/text-contract.js`, use by both readers, and independent Store guards for Finish and grade-driven completion. It does not weaken the original required-answer assertion.

## QA-TXT-04 reproduction

Run:

```powershell
node --test --test-name-pattern=QA-TXT-04 test/qa-first20-independent.test.js
```

The regression uses actual `public/app.js` in the existing JSDOM harness, actual ephemeral loopback HTTP endpoints and synthetic Store persistence. Device media and browser vendor imports use the documented harness adapters. It does not use the shared demo database or simulate a Store completion directly.

1. Alex opens synthetic `qa-text-only`, writes a required recall answer and reveals the model. Hold its revealed-response POST before it reaches the server.
2. Click the now-enabled outer Finish. It waits for that save, as intended.
3. While it waits, select Sam (`learner-core`), then open another synthetic text-only lesson `qa-other`, whose page has no required gate. Do not click Finish there.
4. Release Alex's pending save.
5. Observe actual POST `/api/progress` with `x-demo-user: learner-core`, `lessonId: qa-other`, `revisionId: 3`, `step: complete`, `componentId: null`. Sam's persisted `completed` becomes `["qa-other"]`, and the route changes to `#lesson/qa-other/complete`.

The assertion fails: `Alex pending Finish completed Sam other lesson` (`true !== false`). The same result occurred in the initial added-case run, the combined final run and the isolated repeat; final logs include the synthetic terminal-write diagnostic. The existing profile-switch GET/POST response-isolation positive still passes: this is the newly awaited navigation continuation, not reassignment of Alex's saved answer.

Cause: `public/app.js` step handler (around lines 514–518) checks the current context, awaits `settleTextSaves()`, then reads/writes mutable global state without checking that user, lesson, revision, route/portion and navigation generation are still the initiating context. `settleTextSaves()` also derives its queue prefix from mutable state after its first await. The server accepts the new context's otherwise valid request; server gate enforcement alone cannot infer that the click belonged to Alex's old route.

Lead owns a bounded correction: capture the initiating context and pending queues before waiting, abandon stale continuation after each await when that context changed, and retain successful same-context Finish and navigation behavior. Also check switching lessons/portions and leaving the lesson while saves are pending. No core fix was made in QA's branch.

## Commands actually run

| Command | Actual result |
| --- | --- |
| `npm ci --offline --ignore-scripts` | 49 packages installed; exit 0 |
| `npm ci --offline --ignore-scripts --prefix schemas` | 5 packages installed; exit 0 |
| `npm run check` | All configured syntax checks pass; exit 0 |
| `node --test test/qa-first20-independent.test.js test/text-release-integrity.test.js` before additions | 15 pass, 0 fail on frozen tests |
| Same command after four QA additions | **19 tests: 18 pass, 1 fail**, solely QA-TXT-04; exit 1 |
| `node --test --test-name-pattern=QA-TXT-04 test/qa-first20-independent.test.js` | Same reproducible failure, actual Sam terminal POST; exit 1 |
| `node --test test/text-reader.test.js test/text-integration.test.js test/text-import-workflow.test.js test/demo-build.test.js` | **27 pass, 0 fail**; exit 0 |
| `git diff --check` | Pass; exit 0 |
| `git -C <QA checkout> ls-remote https://github.com/guylfe/hebleo-3.0 refs/heads/feat/native-first20-20261025` | Exact `81a44f05d5a99b437d37a5cb6035342a259c8a37` |
| Read-only `GET http://127.0.0.1:63358/api/build` | Still `ba3ad389a6af9807f8eb90e7c34b8723cb1ffc80`; candidate not installed |

Counts overlap and must not be added. No full candidate/schema/runtime rerun is claimed in this bounded recheck. The retained tests exercise exact timing/cancellation, Hebrew responses, save retry, legacy paths, import/refusal/reordering/recovery and a synthetic preservation rehearsal/application. They do not establish owner-data installation preservation.

Setup limitations corrected before final evidence: Git initially omitted one historical evidence path under Windows path-length limits; enabling local `core.longpaths` and restoring that exact file produced a clean checkout before testing. The first retained run could not load `ajv`; installing the frozen schema dependencies resolved it, then all 27 tests passed. Two new fixtures initially omitted terminal `componentId:null` / another lesson's curriculum placement; corrected fixtures produced three positives and the reproducible application race. These setup/fixture errors are not product defects. Initial non-escalated remote access was network-restricted; explicit absolute-path Git remote verification succeeded through the approved tool route.

## Preservation, native and handoff limits

All writes were isolated tests with synthetic records, transient SQLite files, or QA documentation/test changes. Test servers bind loopback ephemeral ports and close. No shared/live state was seeded, reset, imported, published, installed or restarted. The only demo63358 request was the read-only build endpoint. No WordPress or Sheets access occurred. No core/main/demo files in Lead's checkout were edited.

The previously reported native browser consent refusal remains a limit; no new browser inspection was attempted and no alternate/foreground path was used. Native learner/Preview RTL/Nikkud geometry, keyboard/focus, narrow rendering, assistive technology and Guy acceptance remain unverified. JSDOM interaction is not native UI acceptance.

All 127 canonical mappings and introduced-letter review remain pending. The pack remains unpublished. No all-source live ID migration or teaching approval is inferred. Single-workspace publication ineligibility, absent selective unstage/promotion workflow, and the need for a fresh backup plus configuration/media fingerprints before any installation remain as documented in `FIRST20_REVIEW_CORRECTIONS.md`.

**Next owner: Lead Engineer.** Correct QA-TXT-04, freeze a new executable and request bounded recheck of the retained positive unlock/delayed-save tests plus the failing race. Installation, exact served-byte/process verification, real data comparisons and native destination checks remain subsequent Lead work. Evidence is committed under `docs/evidence/qa-first20-81a44f05/`; raw local logs remain in `qa-evidence/`.
