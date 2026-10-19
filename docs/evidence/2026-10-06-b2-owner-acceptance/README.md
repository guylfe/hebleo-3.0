# B2 owner acceptance, 2026-10-06 (Lead, not independent review)

Owner: Hebleo Lead Engineer. Implementation-owner browser checks only. Independent QA, release review, real touch/device checks and Guy's acceptance are separate and **pending**.

## What was tested

- Executable code: commit `6650c607e2e0fd95147a908698055ac7de681d76` on `lead/b2-draft-api`, committed 06:18:17 (Israel time). No file under `public/` or `src/` changed after that commit. Before the browser work, all 20 statically served `public/*` files fetched from the runtime were SHA-256 identical to the clean clone. Server sources were last edited at 02:34, before the server started.
- Runtime: `node src/server.js --demo-fresh-progress` from the clone `C:\Users\Trans\.openmausbot\workspaces\8c900356-50f6-4d41-bbb9-50c8abe09233\hebleo-lead`, on `http://127.0.0.1:4291` (PID 66768, started 02:53). Started with `PORT=4291`.
- Disposable database: `hebleo-lead\data\hebleo-demo.sqlite` (gitignored; three fictional profiles; synthetic and labelled demo content only).
- Not touched: Leo's demo checkout `...\653fb433-...\hebleo-3` and port 4173 (PID 40324, running since 2026-10-04).
- Browser: OpenMausBot agent browser (background Chrome, desktop viewport). Clicks and key presses were sent as browser input through `agent_browser_click` and `agent_browser_press`. Page scripts were used only to read state, scroll targets into view, install a fetch logger that records without changing requests, and attach synthetic import files, because the browser has no file-chooser tool.
- Fingerprints: `node learner-fingerprint.mjs data/hebleo-demo.sqlite` opens the database read-only. For every table it records the row count and a SHA-256 prefix. It also records each of the three fictional learner rows, the active revision, the published pack row and the draft. Files are in `fingerprints/`, named by the local time they were written (HHMMSS).

## Gate results (all on 6650c60 and port 4291)

| Gate | Observed result | Fingerprints |
| --- | --- | --- |
| Rehearsal: navigation, grading, Retry, lookup, preferences, keyboard, exit | Real click Continue → focus on the renderer root inside the dialog. Real `1` + Enter → graded wrong through `/api/studio/preview/evaluate`. Retry was inside the dialog's visible area (659–697, dialog bottom 708) and hit-tested as Retry; a real click cleared the feedback and selection, restored Check and kept focus in the dialog. Pointer choice "who" + real Enter → correct, no Retry. Enter → Vocabulary. Lookup for w-hu opened inside the dialog and closed. Nikkud preference set to none; Table view. Apply: keypad clicks א נ י → "אני", Enter → correct. Exit button removed the dialog and returned focus to Rehearse. Reopening started with fresh preferences. Keypad Show and Hide worked; Escape exited. Requests: `preview/session` ×2 and `preview/evaluate` ×3 only. | `061852-before-rehearsal` = `062201-after-rehearsal` (identical) |
| Guided exercise and lesson save and reload | Reload saved draft discarded the unsaved edit. A labelled synthetic exercise prompt was saved and survived a full reload. Lesson duration 4 → 6 saved and survived a full reload. Published version stayed 1. | `062233` → `062326`: only the kv table and draft changed (intended draft write) |
| Stale-token rejection (save and publish) | Tab B saved a newer draft. Tab A's stale lesson save was rejected with "Draft changed elsewhere — reload" and the entered value stayed in the form. Tab A's stale Publish was rejected, so published stayed v1. | `062326` → `062356`: tab B's draft write only. `062356` = `062421` (identical) |
| Current-token publication | Tab A reloaded and picked up tab B's draft. Real Publish → local published version 2, draft cleared. | `062421` → `062442`: kv, revisions (1→2 rows), sqlite_sequence, active revision 1→2, published pack and draft cleared (intended). Learners unchanged. |
| Import review, discard and stage | Synthetic import A review listed exactly `exercises · ex-1-type · changed` plus the supplied synthetic provenance. Review wrote nothing. Discard → "Import discarded; nothing was staged". Reviewed again and staged → draft only. | `062517` = `062532` = `062551` (identical). `062551` → `062607`: draft only |
| Stale import Stage | Tab B saved a newer draft while tab A's review of import B stayed open. Real Stage in tab A → `POST /api/studio/draft` 409, toast "The draft changed elsewhere. Reload before saving again.", review kept open, tab B's draft preserved. | `062607` → `062628`: tab B's draft only. `062931` = `062955` (identical) |
| Current-token import Stage | Real reload of tab A showed SAVED DRAFT with 2 changes. Import B was rebuilt from the current draft, changing only the labelled ex-1-type feedback. Review → 1 change, no stale alert, nothing written. Real Stage → 200, "Reviewed import validated and staged as the draft", review closed; published v2 and all learners unchanged. | `063043` = `063053` (identical). `063053` → `063111`: draft only |
| Queued learner save and handler isolation | As author-demo: Course → Open lesson 1 → Check → choice "he" → navigation. Choice save and navigation flush were both `POST /api/progress` 200 (intended learner write). Then Studio → Rehearse → Continue: focus in dialog, real `2` + Enter graded through preview only, and the Studio page outside the dialog was unchanged. Escape → focus back on Rehearse. A stray real `1` after exit did nothing. Requests during rehearsal: `preview/session` and `preview/evaluate` only. | `063158` → `063233`: learners table and the author-demo row only (intended). `063233` = `063306` (identical) |

Across the whole sequence, `learner-demo` and `learner-core` never changed. The `events` table stayed at 0 rows.

## Automated checks on the final tree

- `targeted-tests.txt` (06:42:37): `node --test` for app, studio-authoring, learner-renderer, preview, draft-api, publication-diff, import and feature-renderer-http. **65 tests, 65 pass, 0 fail**, `EXIT=0`.
- `verify.txt` (06:42:48): `npm.cmd run verify`, the syntax check plus the full suite. **122 tests, 122 pass, 0 fail**, `EXIT=0`.

Both ran on HEAD 6650c60 with only `docs/` modified. Each file header records the clone, branch, HEAD, Node/npm versions, and git tree objects for `src`, `public`, `test`, `schemas` and the package files. It also records an empty non-docs diff and no untracked files outside `docs/`. No executable file changed after 6650c60. After the runs, `docs/` was edited only to record these results. The commit that adds this directory changes only `docs/`, so its executable tree is the tested tree.

Test isolation: tests use an in-memory `Store()` or `mkdtemp` temp paths, and their servers listen on port 0 at 127.0.0.1. No test spawns processes or reads `docs/`. The disposable 4291 database was byte-identical before and after the runs (`064211-before-tests` = `064311-after-tests` = `063306-after-rehearsal2`). Port 4173 and Leo's checkout were not used.

Earlier runs on the same executable tree are outside the repo and are earlier evidence only. In the Lead workspace `C:\Users\Trans\.openmausbot\workspaces\8c900356-50f6-4d41-bbb9-50c8abe09233\` (next to `LEAD_RESUME_HANDOFF.md`) they are `targeted-tests-final.txt` and `verify-final-docs.txt` (06:37, 65/65 and 122/122), and `verify-0628.log` (06:10, 122/122, after the last source edit, before commit). The run that produced the 06:37 files ended before it copied them here. The cause is unknown: no error text was returned.

## Limits

- These are owner checks on one desktop browser. There is no touch, mobile, screen-reader, zoom or cross-browser acceptance.
- Import files were attached through DataTransfer, not the native file chooser.
- Synthetic `pagehide` and keyboard-preference events during rehearsal are covered only by the jsdom regression in `test/app.test.js`, not the real browser.
- No screenshots were saved. The evidence is the observed DOM and network state recorded at the time, these fingerprints, and the incremental handoff log.
- The 06:22–06:27 steps (guided, stale, publish, import A) were recorded as they ran, but the handoff text for them was written at 06:29, after the interrupted run. Their fingerprints were written at the times shown.
- Draft conflicts are rejected (compare-and-swap on the draft token); there is no merge.
