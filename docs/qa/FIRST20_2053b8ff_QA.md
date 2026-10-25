# Independent QA-TXT-04 closure — 2053b8ff

**QA-TXT-04 CLOSED on `2053b8ffd3ef26de0781715609806cc7721fa1b8`.** The original cross-profile/lesson race passes, normal delayed Finish still works, and bounded cancellation checks at both awaits pass. No new reproducible application defect was found. This removes the identified QA installation blocker; it does not establish installed/native acceptance, authorize teaching publication, or replace the preservation installation checks.

QA checkout: `C:\Users\Trans\.openmausbot\task-workspaces\71c71389-5334-4e0c-9ca8-d80dd28223d1\653fb433-7485-48b1-9f7c-cb22711bda02\hebleo-3\qa-native-first20-2053b8ff`. Branch: `qa/native-first20-2053b8ff`. Independently cloned from the supplied Lead checkout with `--no-hardlinks --no-checkout`, enabled local `core.longpaths`, checked out the exact candidate, and independently verified the private feature remote at that SHA. Read AGENTS, milestone brief, relevant master-spec human-authoring requirements, review corrections, prior QA reproduction and retained Release closure.

## Executed evidence

| Command | Actual result |
| --- | --- |
| `npm ci --offline --ignore-scripts` | 49 pinned packages installed; exit 0 |
| `node --test test/qa-first20-independent.test.js test/text-release-integrity.test.js` before QA additions | **22 pass, zero fail/skip**; frozen-focused.txt |
| Same command after three independent QA additions | **25 pass, zero fail/skip**; focused-final.txt |
| `npm run check` | Configured syntax checks pass; syntax.txt |
| `node qa-evidence/verify-identity.mjs` | 110 runtime files compared; Lead bytes match its supplied manifest, QA/Lead differ only in ten CRLF/LF representations; identity.json and identity-check.txt |
| `git -C <QA checkout> ls-remote https://github.com/guylfe/hebleo-3.0 refs/heads/feat/native-first20-20261025` | Exact candidate SHA returned |
| Read-only `GET http://127.0.0.1:63358/api/build` within identity check | Still ba3ad389 / runtime 72326559688bfd64c7ade423ce917d192ec4f829f7dcc5c1ba85fe4fb1f2efcf; preservationMode true |
| `git diff --check` | Pass |

Counts overlap; 22 and 25 are not additive. No full 838-case candidate run, schema suite, generic runtime suite or CI run is claimed here. Lead's full-suite count remains owner evidence. Release's independent RR-TXT-01 closure remains attributed to its `81a44f05` review. Its unchanged five focused integrity tests also passed in this run.

The original QA-TXT-04 regression was not weakened. With Alex's revealed-response POST held, Finish waits, Sam switches profile and opens qa-other, then Alex's save is released. The final diagnostic is `terminalWrites: []`, `samCompleted: []`, route `#lesson/qa-other/qa-text`. Actual app code, loopback HTTP projection/persistence and synthetic Store records are exercised through the retained JSDOM harness; this is not a direct mocked completion.

Retained cases pass for later forward portion superseding Finish, history away-and-back invalidating the same route values, and an abandoned response-save failure after profile switching. The normal delayed-save positive completes only after its own required response persists. QA added and executed:

- Same-profile switch to another lesson while a required response is pending: no terminal request/completion, route stays at the new lesson, and DOM focus on its textarea remains after the old save returns.
- Second await boundary with a delayed **successful** terminal position POST: a newer Back request supersedes the older Finish render/focus; exactly one heading focus belongs to Back, the final route/resume is the requested text portion, and no stale error appears. The single already initiated original-context completion remains legitimate.
- Same second-boundary scenario with a delayed **failed** position request: newer Back still saves/resumes, no completion is created, and the abandoned failure produces no toast or extra render/focus.

Prior QA-TXT-01/02/03 closure is retained from `81a44f05` and its existing positive/refusal regressions passed again: learner/Preview unanswered gates and positive unlocking, multi-block HTTP Finish, grades/page writes vs deliberate completion, all-profile text reset with same-build retention, and cyclic/acyclic prerequisites. Import/recovery/profile-response isolation controls also passed.

The first added focus probe initially focused before the new reader's asynchronous GET had finished replacing its DOM. Waiting for the actual load status to settle corrected the harness; final assertions now check focus before and after releasing the old save. The identity helper initially omitted `.mjs` from its text-extension allowlist; correcting that allowlist established line-ending-only equality. Neither exploratory failure is an application defect. Raw exploratory logs/helper remain local under qa-evidence.

## Implementation and runtime review

`git diff 81a44f05..2053b8ff -- public src scripts schemas` changes only `public/app.js`. Both await boundaries were inspected. `settleTextSaves` captures the initiating prefix and binding list before waiting. Accepted portion requests increment the reader generation; disposal invalidates it for profile/lesson/history/render changes. `captureTextDestination` retains owner, page, exact session object, lesson, portion and generation. The step action checks after text settling, rechecks required gates, recaptures after its deliberate transition, and checks after position persistence before render/focus. Abandoned action/position errors are suppressed. No backend, schema, content, teaching, publication, restore or identity contract changed in this correction.

| Runtime identity | Independently verified value |
| --- | --- |
| Exact candidate commit | `2053b8ffd3ef26de0781715609806cc7721fa1b8` |
| QA tested runtime SHA-256, 110 files | `07b81915176f9c57e211b77112ba57ae121a85ad4d7585dd33da7846bee9f94b` |
| QA backend SHA-256 | `bcb7d3d14c03752c8b2792863e5af0eaa16d5f6b8583d8cbd972fdf8e8254bc1` |
| Lead selected runtime SHA-256 | `dc9fba405653a629f21306ee6529b3585ded140e45a9ab280d71b9b8311f1102` |

The Lead's 110 actual file hashes were checked against FIRST20_BUILD_2053b8f.json. Ten files differ from the tested QA checkout only in CRLF/LF; all other bytes match. Executable Git paths in the QA checkout are unchanged from the frozen SHA. Tests ran on QA bytes; no separate execution of the Lead checkout is claimed. Installation must verify the selected bytes, rather than infer raw byte identity from a common commit.

## Limits and next owner

All writes were synthetic test records, transient test databases or QA test/documentation/evidence changes in this isolated clone. No owner database was opened. No shared/demo/production writes, installation, reset, seed replay, publication, WordPress or Sheets action occurred. The only running-demo call was a read-only build check. No browser action or consent bypass was attempted. Automated DOM focus checks do not establish native keyboard, rendered RTL/Nikkud, narrow-layout geometry, touch or accessibility acceptance.

All 127 canonical mappings, introduced-letter mapping and human teaching/Nikkud/audio review remain pending. The first20 pack remains unpublished; the existing shared-workspace publication limitation and absent selective unstage/approval-promotion workflow remain. Prior reports are retained as historical evidence, not rewritten as passes.

**Next owner: Lead Engineer.** Carry this exact-SHA QA closure and retained Release disposition into the preservation installation workflow: fresh backup/configuration/media fingerprints, intended process/listener and runtime identity checks, preservation apply/startup, protected-state comparison, and served-byte/destination verification. Actual installation and native learner/Preview acceptance remain unverified here. No new correction is requested by this bounded review.
