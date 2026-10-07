# Current bounded review candidate (2026-10-07)

Owner: Hebleo Lead Engineer. Documentation consolidation only, on private `lead/g5-01-stale-retention` in `C:\Users\Trans\.openmausbot\workspaces\8c900356-50f6-4d41-bbb9-50c8abe09233\hebleo-g401`. Executable baseline: `d42e1cfea9fb1e982651922a2ef2917d6cb5b85a`; parent: `c1b9fb925d0d77d4b7e3d4bf4615d3a55e68e176`. This update adds no behavior. The docs checkpoint SHA and final local/remote identity receipts are recorded in the external `G5_01_DELIVERY.md` beside this checkout.

**Done within the assigned scope:** B20 recognition independent QA PASS at b312cdd; B21/B22 matching/ordering independent QA and focused Release backend PASS at c1b9fb9; B23 G5-01 independent automated recheck 23/23 and separate actual typed two-tab Browser PASS at d42e1cf. Gate 6's learner subset passes at c1b9fb9 for retries, feedback/partial reload, unique progress/completion, settings isolation and old-versus-current revision grading. These are separate frozen artifacts, not a whole-product pass at the branch tip.

**Pending:** actual-Browser pending-autosave overlap and genuine global keyboard-preference event paths (independently automated within the 23 checks, still unobserved in Browser); real touch/device checks; Guy acceptance; three earlier low retry/status/focus/toast findings and B24's low focus-cycle limitation. Feedback/source-payload observation remains unclassified. Full accessibility, production and launch acceptance are not established.

**Blocked:** native import upload and narrow 375/390 CSS-pixel layout gates lack mounted upload/resize capabilities. Gate 6 measured 1280×720 CSS pixels; it remains Partial. The direct-thread lifecycle failures did not negate the later room Browser closure, and no further retry is prescribed here.

**Review recommendation:** accept the listed bounded correction evidence for review; keep main integration and all protected demos on HOLD. No merge, startup, reset, republish, process/DB update, live integration, real-data or production action is part of this handoff. Historical RR01–04 closure remains at ee9e2f1. Release demonstrated that valid parent v1/v2 exports restore; older malformed matching/blank-token exports are intentionally rejected before writes, without repairing or regrading their contents.

## Independent artifact references

QA report root: `C:\Users\Trans\.openmausbot\workspaces\df3d19e5-dedf-4129-9d7a-5b08ffaa6bd9`. Every report below was read; none was edited or rerun for this docs update.

| Gate / frozen revision | Saved report and bounded evidence |
| --- | --- |
| B20 / b312cdd294ace379080235d7b7275d99ca9e8612 | `<QA root>\qa-g401-b312cdd-report\README.md`; artifact sibling `qa-g401-b312cdd`; 200 committed files; 9 saved evidence checks. Actual empty/space/invisible distractor rejection retains input/enabled controls without writes; valid recovery is draft-only. |
| B21/B22 / c1b9fb925d0d77d4b7e3d4bf4615d3a55e68e176 | `<QA root>\qa-g402-c1b9fb9-report\README.md`; artifact sibling `qa-g402-c1b9fb9`; 247 committed files; 14 saved observation checks. Actual cross-lesson matching autosave/reload/grade/feedback and blank ordering rejection/exact valid recovery pass. |
| Historical Gate 5 / c1b9fb9 | `<QA root>\qa-g5-c1b9fb9-report\README.md`; 49 saved evidence assertions include the original P2 G5-01 failure and two unobserved timing/event paths. They are not 49 passing app cases. Retain failing parent evidence. |
| Gate 6 / c1b9fb9 | `<QA root>\qa-g6-c1b9fb9-report\README.md`; 75 saved evidence assertions over 29 checkpoints support the passing learner subset, not 75 application checks. Overall Partial; narrow Blocked. Strict preservation failed for one prior transient `.sqlite-shm`; the other 351 files, including original database/WAL, are byte-identical. Precise cause was not instrumented; diagnostic success does not make all-file preservation Pass. |
| B23 automated / d42e1cfea9fb1e982651922a2ef2917d6cb5b85a | `C:\Users\Trans\.openmausbot\task-workspaces\71c71389-5334-4e0c-9ca8-d80dd28223d1\653fb433-7485-48b1-9f7c-cb22711bda02\hebleo-3\tmp\qa-g501-d42e1cf\README.md`; 260 frozen files; actual independent `node --test --test-name-pattern=G5 test/app.test.js test/stale-preview.test.js`: 23/23. Six-family retention, deferred genuine autosave response/navigation flush and real owner Pin handler event suppression. DOM/HTTP automation, not Browser race/event acceptance. Its earlier pending mounted closure is superseded only by the next report. |
| B23 typed Browser / d42e1cf | `<QA root>\qa-g501-d42e1cf-room\README.md`; 35 saved evidence assertions, 260 frozen files and 4,708 prior files preserved. Actual B Prompt metadata Save200 → A old-token Enter409 retains exact `אני` and original prompt read-only/ungraded, editing/navigation disabled, Exit focused; no further application requests. Escape closes/restores Rehearse. All tables/three learners/publication equal the post-B-save baseline; B's save changed draft only. Tab briefly moves focus to BODY (B24). Button-click Exit and other answer families were not separately exercised in this Browser closure. |

Release report: `C:\Users\Trans\.openmausbot\workspaces\6fce93a9-6bf0-4d8d-ad11-edd2d2a11700\RELEASE_RECHECK_c1b9fb9.md`; exact artifact `release-review-c1b9fb9`, evidence `review-evidence-c1b9fb9`. Independent 140 focused probes, 22 compatibility/HTTP checks and 2 reused positive groups pass, with explicit parent controls. This is a focused synthetic backend gate; prior RR01–04 evidence remains at ee9e2f1. No new Release review of d42e1cf is claimed.

Owner evidence remains separately attributed: 23 focused, 174 application, 15 schema and 8 runtime checks at d42e1cf, plus owner Browser 61916 with 31 saved-observation assertions; [owner report](evidence/2026-10-07-g5-01-stale-retention/README.md). Owner and independent scopes overlap; no totals are added. No fullsuite or CI was rerun for this documentation correction.

## Documentation verification and executable identity

Only README/documentation paths change. Validate `git diff --check`, stable checklist IDs/Guy-result preservation, current status consistency, report-reference existence and non-documentation diff equality. Committed Git tree/blob IDs below must equal d42e1cf; every other tracked non-documentation path must also remain identical. Final receipts are saved beside external `G5_01_DELIVERY.md`.

| Path | Frozen Git object ID |
| --- | --- |
| src | 1af480a8f4437a09e543f94c263ab580f1cf0c0f |
| public | 152785968adb7e2325b6005e4ff4ae7b051f5ea1 |
| test | e1d2c052b3825096f563ceac8bd87ea1b98fa8b4 |
| schemas | ef10df024164d96179947f429fc43985af329541 |
| package.json | 32079f75511a8a379db4633545663816dd9b810d |
| package-lock.json | 76c0d5c11e87be92125e28f0304646187b87b9b0 |

---

# Historical lead handoff: B2 Studio candidate (2026-10-06)

Owner: Hebleo Lead Engineer. This is owner evidence, not independent review.

- Repository: https://github.com/guylfe/hebleo-3.0 (private). Branch `lead/b2-draft-api`; not merged to main.
- Tested executable commit: `6650c607e2e0fd95147a908698055ac7de681d76` (Studio guided authoring, import review and rehearsal modal). The commit that adds this handoff changes only `docs/`; its executable tree is identical to 6650c60.
- Lead clone: `C:\Users\Trans\.openmausbot\workspaces\8c900356-50f6-4d41-bbb9-50c8abe09233\hebleo-lead`
- Disposable owner-check database: `<clone>\data\hebleo-demo.sqlite`. The server always uses `<checkout>\data\hebleo-demo.sqlite`; the file is gitignored and holds fictional profiles only. Never commit it.
- Owner-check runtime: from the clone, PowerShell `$env:PORT=4291; node src/server.js --demo-fresh-progress` (PID 66768 at the time of the checks). Use a port other than 4173, which belongs to Leo's demo checkout `...\653fb433-...\hebleo-3` and must stay untouched.
- Fresh reviewer checkout: `git clone` the private repo, `git checkout lead/b2-draft-api`, `npm.cmd ci --ignore-scripts`, `npm.cmd run verify`, then start on a free port as above. Choose Author in the profile selector to open Studio.
- Evidence: [evidence/2026-10-06-b2-owner-acceptance](evidence/2026-10-06-b2-owner-acceptance/README.md) has gate-by-gate results, DB fingerprints, the read-only fingerprint tool, and the saved test outputs: targeted 65/65 and full `npm.cmd run verify` 122/122, both EXIT=0 on the 6650c60 executable tree. The working log during the checks was `C:\Users\Trans\.openmausbot\workspaces\8c900356-50f6-4d41-bbb9-50c8abe09233\LEAD_RESUME_HANDOFF.md` (outside the repo); WIP patch backups are alongside it.
- WIP safety copy: stash commit `5e671e797c5521c698e47e720c3ba741955a77c6` on `origin/lead/b2-wip-2026-10-06` (pre-checkpoint WIP; superseded by 6650c60).

## Done on this branch

Shared learner view and disposable renderer (83482ea, a557e50); Architect content/preview contracts (b6af62f via 351905b); Feature Studio editors and rehearsal controller (f645d82 via ded19bd), import-review ordering and renderer HTTP tests (1b07f46 via d5f78eb); publication-diff fixes (a29abe8); Studio wiring, rehearsal focus/Retry fixes and regressions (6650c60).

## Pending, in order

1. Independent named QA (Hebleo QA Red Team) on 6650c60: learner and Studio flows, rehearsal keyboard and focus, two-tab conflicts, import edge cases, real touch/narrow devices.
2. Independent release/data review (Hebleo Release Reviewer): draft-token compare-and-swap, publication diff, preview isolation, backup/restore of drafts.
3. Guy's walkthrough and acceptance. Every Guy-test field in FEATURE_CHECKLIST stays Pending until he reports.
4. Merge to main and run CI after reviews. Live AI, masterfile import and approved curriculum remain outside this candidate.

---

# Historical: bootstrap handoff (2026-10-03)


The private remote is https://github.com/guylfe/hebleo-3.0. Clone it in the lead's own private working folder after the native cwd change is confirmed applied. Do not reopen the original shared project cwd: initial architect/curriculum/lead assignments all failed before execution due to its lock. No failed run supplied implementation or reviews. Leo built this bootstrap in the original checkout while blocked.

Starting runnable commit: `0bcd99988a8acce9ee91d8d7d2106e46590d539f`, followed by status-documentation checkpoints. Read AGENTS.md, README.md, docs/MASTER_SPEC.md, docs/INITIAL_BUILD_BRIEF.md, docs/architecture/BOOTSTRAP_DECISIONS.md, and docs/PROJECT_STATUS.md. Setup: Node 24.19+, `npm.cmd ci --ignore-scripts`, `npm.cmd run verify`, `npm.cmd start`. Linux/macOS can use `npm`. Initial verification: 15 local tests and GitHub Actions passed; implementation-owner browser checks confirmed dashboard, recognition/typing, draft/preview/publication. This is not independent QA.

Inspect the actual implementation and preserve working behavior. You own main/integration/private pushes once your assignment starts. The original broad brief remains the objective: this candidate is an initial working foundation. Prioritize maintainable authoring, genuine FSRS, useful remediation/review variants, stable richer selectors, backup/state validation, and justified offline support. Decide whether to refactor the small browser-native UI into React/TypeScript. Import approved course/media only with provenance and actual source access. Word-linked exercises are canonical; sentence fixtures are literal and need deliberate authoring, not automatic morphological guesses.

Web payments MUST remain in WordPress. Production hosting is undecided; app boundary is independent of physical hosting. No live checkout/site/student edits, migration, paid hosting, native store billing, or production deployment in this local milestone. Current identity/events are an explicit local simulator, not a verified WordPress adapter. All content is synthetic and labeled; no native recordings/videos have been imported.

Use actual named specialists through OpenMaus. Feature work must use an isolated clone/branch or an agreed file contract. Architect and curriculum documentation need isolated workspaces too. Leo dispatches QA and release review against your exact integrated commit when viable; those gates must return actual execution evidence. Send concrete defects/corrections, limitations, commands/results, the pushed commit, and a repeatable demo walkthrough. Never attribute tests, imports, or reviews to a bot that could not start.
