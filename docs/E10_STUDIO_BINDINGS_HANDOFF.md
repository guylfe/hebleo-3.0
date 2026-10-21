# E10 Studio exact occurrence authoring

2026-10-22 · Feature assignment 9dd11d5e-8d29-4b91-8838-c73c79a40a8e / E10 continuation 7b73922a.

Implemented authoring component with disposable JSDOM/Store/HTTP verification. Lead static-route integration and native/Guy acceptance remain pending. This branch alone cannot load the application module graph until Lead registers both new module routes described below.

Repository: `C:\Users\Trans\.openmausbot\task-workspaces\71c71389-5334-4e0c-9ca8-d80dd28223d1\653fb433-7485-48b1-9f7c-cb22711bda02\hebleo-3\e10-studio-bindings`.

Branch: `feature/e10-studio-bindings`. Base: `eba3c496b8a449ded493348066d07f1e2472d84d` from Lead's `lead/e10-all-families` checkout, cloned locally without hard links. Delivery commit is reported with the handoff; no Lead checkout files were written.

## Owned files

- `public/studio/exercise-editor.js`
- `public/studio/exercise-bindings-editor.js` (new)
- `test/studio-exercise-bindings.test.js` (new)
- This handoff.

No shared contract, schema, Store, seed, Masterfile, source mapping, learner renderer, runtime configuration or database changes. No additional CSS or design-token changes. Owner runtime 63358 was neither contacted nor restarted. Test servers use ephemeral loopback ports and in-memory SQLite.

## Behavior and maintained contracts

The existing exercise form has a **Word and phrase links** disclosure. It uses the existing native select/field/button controls, Studio styles and searchable/tagged/lesson-filtered 50-row vocabulary browser. It adds no nested forms and performs no writes on opening, browsing, selection, linking, rebinding or removal. Only explicit existing Save stages a draft; publication remains separate.

The authored-surface selector enumerates the actual `exerciseVocabularySurfaces` export. All six families support prompt/context/short feedback/detailed feedback; ordering includes individual authored token rows; typing/ordering/cloze/transformation include explicitly stored accepted-answer rows. Optional context can be authored on each family. Untouched legacy typing keeps its linked-word answer source: displayed fallback answer forms do not become stored answers or bindable answer surfaces until explicitly edited through the existing answer controls.

Authors select exact text using pointer or native keyboard selection in a labelled read-only textarea, choose an existing runtime ID, inspect the excerpt/target/surface, and click Link. No offsets or JSON are entered. Selection offsets are translated from textarea LF display back to the untouched UTF-16 source snapshot, including CRLF/CR. Nikkud, combining sequences, emoji, bidi characters and whitespace remain exact. Read-only controls have no authored field names and the established Hebrew keyboard rejects them as editing targets.

Existing links show their exact excerpt, target ID/label, field/row, occurrence ID and a read-only saved-surface disclosure. Rebind preserves the occurrence ID and permits deliberate text/surface/target replacement; new links receive UUID-based occurrence IDs. Remove changes only the local binding array. Cancel rebind changes no authored data. `getEdits` clones changed bindings; `snapshot`/`applyExerciseEdits` retain optional bindings, IDs, unknown fields and unbound content.

The component uses `validateExerciseVocabularyBindings` for exact spans, whole graphemes, references, overlap and stale-source guidance. Guided exercise validation attaches `exerciseId` for existing unified first-error focus. The server remains authoritative. A new valid rebind can be applied while other stale links await individual repair; stale data is never silently replaced or dropped.

Surface edits preserve the prior bindings and display repair messages. Removing an answer/token row marks all affected occurrence IDs for explicit rebind/removal, even if equal row text would hide the positional change from the shared snapshot validator. The local guard blocks collection/Save until repair; it writes no extra schema properties. Pending selection on affected rows is cleared. The shared contract's inability to distinguish externally reordered byte-identical rows without row IDs remains as documented in ADR B04; no shared identity model was changed.

Incomplete sibling inputs, guided validation failures, transport failures and CAS rejection retain local edits and pending selection. Successful unified Save collects sibling fields and bindings under one existing CAS request, then remounts from the saved draft. Queued native selection events cannot re-enable Link while Save has locked the controls. Tests verify exact disabled-state restoration, duplicate-submit prevention and explicit retry after failure.

Canonical owners remain `DESIGN.md`, `UX-CONTRACT.md`, `editor-fields.js`, `vocabulary-browser.js`, `unified-studio.js`, `keyboard-owner.js` and ADR B04. This is a bounded extension of their existing controls and Save/recovery paths; no product/pedagogy decision or inferred mapping was introduced.

## Commands and actual results

- `npm ci --ignore-scripts --no-audit --no-fund`: passed (49 packages).
- `npm --prefix schemas ci --ignore-scripts --no-audit --no-fund`: passed (5 packages).
- `npm run check`: passed. No separate build/typecheck/formatter commands exist in this static Node app.
- `node --check public/studio/exercise-bindings-editor.js`, `node --check public/studio/exercise-editor.js`, `node --check test/studio-exercise-bindings.test.js`: passed.
- `node --test test/studio-exercise-bindings.test.js test/studio-authoring.test.js test/feedback18-guided-exercise.test.js test/feedback18-unified-studio.test.js test/exercise-bindings.test.js`: **54 passed, 0 failed**, including 16 new binding tests. Log: local ignored `e10-focused-final.log`.
- `npm --prefix schemas test`: **27 passed, 0 failed**. Log: local ignored `e10-schema.log`.
- `npm run test:candidate`: **744 tests, 741 passed, 3 failed**, exit 1. Failures are the missing static module route (`test/new7-corrections.test.js:81`) and the two older blanket enabled-control assertions described below. Local ignored log: `e10-candidate-complete.log`. Audio filename/name exclusions remain those of the existing candidate runner; no audio-speed tests were reopened. This branch is not reported as a green integrated candidate.
- Strict premium audit: ran with `C:/Users/Trans/.local/bin/python3.12.exe` and the installed skill's `scripts/audit_project.py . --mode strict --no-write`; **exit 1**, three existing `affordance.actionless-button` findings: two at `public/studio/lesson-editor.js:30`, one at `public/studio/media-picker.js:15`. These files are byte-unchanged against base (`git diff eba3c49 -- public/studio/lesson-editor.js public/studio/media-picker.js` empty). No findings in owned files. Local ignored JSON output: `e10-premium-audit.log`. The normal `python` command was unavailable and Windows `py -3` referenced a missing runtime; the explicit installed Python succeeded.
- `git diff --check`: passed.

The new tests cover creation and real draft reload for every family/surface; exact Unicode and CRLF/CR offsets; stable rebind IDs and fresh occurrence IDs; removal; stale-source guidance; split grapheme/empty/overlap rejection; token and accepted-answer row removal including identical strings; bounded browser search/paging; untouched optional data; actual Hebrew keyboard owner rejection; unified real HTTP Save/CAS conflict with all-table preservation; incomplete/guided failure retention; pending/transport-error recovery and explicit retry.

## Required Lead integration and ledger handoff

1. Cherry-pick the delivery commit into Lead's integration branch.
2. Register `/exercise-bindings.js` → `exercise-bindings.js` and `/studio/exercise-bindings-editor.js` → `studio/exercise-bindings-editor.js` in `src/server.js`'s explicit static map. That file is Lead-owned. The current real HTTP module-graph regression correctly fails at the missing Studio module route; shared route registration is also required.
3. Update the broad enabled-control assertions in `test/ordering-tokens.test.js:144` and `test/recognition-distractors.test.js:130`: compare pre-save disabled states with post-failure states, preserving deliberately disabled binding actions and vocabulary paging. The added pending/error regression already verifies exact restoration. Do not enable invalid link actions or out-of-bounds paging to satisfy these old assertions.
4. Re-run focused/schema/candidate/module-graph checks after registration and assertion integration. Resolve the inherited static audit findings under the corresponding ownership if required for the release gate.
5. Update shared ledger feature **E10** with bounded authoring evidence (54 focused / 27 schema; all-six-family authoring implemented) and actual integrated candidate results. Preserve Guy/native acceptance as Pending. The ledger is outside this assignment's explicit file ownership and was left unchanged.
6. Finish the Lead-owned learner/post-answer/rehearsal integration. No claim is made here that those decorators consume this UI's bindings yet.

No mounted-browser, native-profile, headless-browser or screenshot fallback was used because the assignment says native profile consent remains pending. Real rendered layout, pointer/keyboard interaction, native select popup behavior, narrow viewports, zoom, touch, screen-reader experience and Guy acceptance remain unverified. JSDOM/HTTP are automated component and protocol evidence only. No app update was installed or owner demo progress reset; Lead owns restart/API fresh-progress verification after integration.
