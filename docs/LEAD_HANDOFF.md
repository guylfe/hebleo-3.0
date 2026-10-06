# Lead handoff: B2 Studio candidate (2026-10-06)

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
