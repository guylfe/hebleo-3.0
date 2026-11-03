# Candidate handoff: rendered editing and Preview clearance

Completed 31 October 2026 by Feature Engineer. This is owner verification, not new independent QA/UX or Guy acceptance. No installation, live teaching draft mutation, production access, publication or push.

## Exact candidate

- Checkout: `C:\Users\Trans\.openmausbot\task-workspaces\71c71389-5334-4e0c-9ca8-d80dd28223d1\653fb433-7485-48b1-9f7c-cb22711bda02\hebleo-3\rendered-author-4104fb3`
- Branch: `fix/rendered-author-preview-20261031`
- Exact integration base: `4104fb35e577b974d76dc9b73bc438e2e28fd734`
- Code commit: `699e9951202e6368647ce77dbba7cfb895579810`
- Executable fingerprint: `f15fce60371c83866c21db8a6c754726a80c180ebf6893148773f9f517f7bb8e` (existing normalized-source fingerprint function).
- A subsequent evidence-only commit contains this receipt, screenshots and test logs; it changes no executable files.

The source integration checkout was only read to clone the exact base; this is a separate Git repository with its own branch. Windows long-path checkout initially failed, then succeeded using repository-local `core.longpaths=true` and restoring the new clone. The private remote was not pushed: Lead explicitly owns integration, push and CI. Local `origin` still points to the supplied integration checkout; **do not push to that local origin**. Lead can fetch/cherry-pick the code commit directly from this candidate repository.

## Delivered files

Runtime: `public/author/inline-author.js`, new `public/author/rendered-source.js`, `public/author/author.css`, `public/exercise-actions.js`, `public/source-activities.js`, and one asset allowlist entry in `src/server.js`.

Verification/startup: new `test/rendered-author.test.js`, `test/app.test.js` (contenteditable heading interaction and readable whole-block expectation), `package.json` syntax-check additions, and new `scripts/start-rendered-author-candidate.mjs`.

Contracts/status: `DESIGN.md`, `UX-CONTRACT.md`, `docs/FEATURE_CHECKLIST.md`, `docs/RENDERED_AUTHOR_CORRECTION.md`, and this evidence directory. The shared stable feature/checklist status is bounded to this candidate; no user Pass was assigned.

Implementation details and source-range limits: [correction contract](../../RENDERED_AUTHOR_CORRECTION.md). Rendered headings/paragraphs/list leaves are the default edit surface. Raw source and technical context are collapsed. Save draft / Preview saved draft / Review changes have distinct purposes. Readable quote/whole-block context precedes private submission. The shared coordinator and exact acknowledgment callback semantics are retained.

## Commands actually run and results

All commands below ran in the isolated checkout; counts overlap and must not be added as unique coverage.

| Command | Actual result |
|---|---|
| `npm run verify:candidate` after code commit | **963 passed, 0 failed**; syntax checks passed. Existing runner excludes audio filenames and audio/speed/playback test names. [Full log](candidate-tests.txt). |
| `node --test test/rendered-author.test.js test/author-review.test.js test/workspace-save-regression.test.js test/first2-dock-regression.test.js test/keyboard-dock-clearance.test.js` | **43 passed, 0 failed**, including 12 new rendered-source/toolbar/dock regressions. [Focused log](focused-tests.txt). |
| `node --test tmp/independent.test.mjs` | **4 passed, 0 failed**. Original QA `independent.test.mjs` rerun by Feature Engineer against this checkout; only candidate import paths were redirected. [Log](original-qa-tests.txt). |
| `npm test --prefix schemas` | **27 passed, 0 failed**. [Schema log](schema-tests.txt). |
| `node schemas/tools/runtime-check.mjs --runtime .` after code commit | **9 passed**, ephemeral loopback HTTP, in-memory database; log names code699e995. [Runtime log](runtime-checks.txt). |
| `node schemas/tools/validate.mjs --seed --runtime .` | No structural/semantic errors, stage accepted, synthetic input unchanged. |
| `node tmp/capture-source-preservation.mjs` | Exact heading/sentence/HTML-list patch; full Store draft and saved Preview source readback passed. [Before/after and hashes](SOURCE_PRESERVATION.json). |
| `git diff --check` | Passed. |
| `git diff --exit-code 4104fb35e577b974d76dc9b73bc438e2e28fd734 -- public/studio/workspace.js content src/author-review.js src/immutable-context.js src/store.js` | Passed: those owners/teaching files are unchanged. |

QA harness preparation reused the actual-app fixture prefix from candidate `test/app.test.js`, exported `app/settled` into ignored `tmp/qa-app-harness.mjs`, and copied the supplied original `qa-first2-final-8f4de67/independent.test.mjs` into ignored `tmp/independent.test.mjs` with only its `./candidate/...` imports redirected to this checkout. The original report/harness directory was not modified.

Initial verification found missing isolated schema dependencies (`ajv`), rather than an application regression. `npm ci --prefix schemas --offline` installed the existing locked dev dependencies; the complete committed-candidate run above then passed. Two initial schema CLI attempts omitted required arguments; corrected seed/runtime commands above passed. Initial new tests exposed both marked and textarea CRLF normalization, which were fixed and rerun. A native pointer measurement exposed toolbar collapse swallowing the first Save click, which was fixed and rerun. These earlier failing attempts are not included as passes.

## Source and private-review evidence

[SOURCE_PRESERVATION.json](SOURCE_PRESERVATION.json) contains synthetic before/after source, exact expected-patch equality, unchanged Markdown/HTML sibling hashes, preserved HTML attributes, bold/Nikkud/list structure, all 11 original CRLF sequences, unknown page metadata, complete Store draft readback and saved Preview source equality. It is a helper/Store receipt; the focused real-HTTP tests separately cover full workspace/CAS save, sibling edits, canonical projections, quote/block notes, learner exclusion, 400/403/409/503 retention and newer-pending-buffer acknowledgment. Original departure-save and reserved JSON metadata regressions also pass.

No whole-projection DOM replacement is used. Only verified source leaf ranges are patched. Complex unverified source structures use Advanced source; adding/reordering blocks stays with Studio. The existing private projection, UTF-16 quote rules, reader10 recovery, immutable context and publishing semantics remain unchanged. Full retained-data recovery was not rerun.

## Native Browser evidence and running candidate

Mounted Browser only, **1280×720**, on disposable `http://127.0.0.1:63471/`. Actual native heading replacement, paragraph typing, Bold formatting, one-click Save after toolbar fix, saved learner Preview, and selected-paragraph private quote submission were exercised. All new edits/notes explicitly say Synthetic; none are Guy feedback or approved teaching.

[Author screenshot](01-native-author.png) shows the final restarted candidate's rendered canvas, primary Save, collapsed source and persisted synthetic note with readable title. [Preview screenshot](02-native-preview-clearance.png) and [measured geometry](NATIVE_PREVIEW.json) cover page6 → Back → page5: collapsed summary bottom436.28125px is above dock top635.609375px, midpoint hit testing reaches SUMMARY, a real click opens it, and Continue remains enabled. Focused input bottom363.453125px also clears that dock and retains `0704`. Normal reading scroll remains free in automated geometry regressions.

The tracked launcher was restarted after the code commit. Current runtime: **PID4940**, port63471, command `node scripts/start-rendered-author-candidate.mjs`, database `tmp/rendered-author-candidate.sqlite`. The draft and private note survived that restart. Browser was left in the clean author canvas. [Served/local source hash comparison](SERVED_ASSET.json) confirms the new helper is served with status200 and exact local SHA-256. An attempted `/api/build` read returned404 because this candidate launcher does not enable developer audit; no successful build-endpoint check is claimed.

To restart, stop only the known disposable candidate process, then run the tracked command from this checkout. `PORT` can override63471. This launcher never opens the installed demo database. The ignored candidate database and synthetic review edits must never be installed. Existing root dependencies are reused through an ignored junction; schema dependencies are local ignored installs. No database/media/credentials were committed.

## Remaining owner and limits

Lead: inspect/cherry-pick code699e995 onto the integration branch, run integrated verification, arrange independent QA/UX, privately push/CI, and decide any guarded installation. The new server asset allowlist entry is required. Existing independent reports were read as inputs; no named teammate performed a new review in this task.

Independent QA/UX on this candidate, narrow viewport/200% zoom/assistive-device checks, physical touch/APK and Guy acceptance remain unverified. Four human consonant recordings remain separate. There are no bot automations to stop. No live teaching draft, other22 drafts/history/media/settings, main, WordPress, external configuration, production purchase/student data or publication was changed.
