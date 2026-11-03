# Classic Jodit editor: isolated candidate handoff — 1 November 2026

Status: implemented, automated/JSDOM/HTTP checked, privately pushed. **Native implementation review is blocked; not installed or independently accepted.** This handoff returns to Lead; no final installation or Guy acceptance claim.

## Exact implementation

- Checkout: C:/Users/Trans/.openmausbot/task-workspaces/8c900356-50f6-4d41-bbb9-50c8abe09233/4d4e36bc-67d1-4c07-bcfb-e381d246b0b3/hebleo-classic
- Branch: fix/classic-wysiwyg-20261101
- Base: 72a3b6f4b5392e6c3ed12a95bc0e3eaf4eef3cd5
- Code: **8a8f6606d16835a18f96689669067ef00cbbbcc7**; private origin branch read back at this exact SHA before evidence-only followup.
- Repository guylfe/hebleo-3.0 independently read back as isPrivate=true.
- Jodit core **4.18.12**, MIT; package-lock exact integrity sha512-//jljicUy78WlbhrbBvMXqM0lOIHuJJf272IviYuYL2jlP2fVMVb7s6tV6Hb5LnfO2uS0v7K8U4e1+oJy0A3+Q==. Full notice is bundled in public/author/vendor/LICENSES.txt.
- Complete supplied es2021 Jodit distribution (792,340 JS bytes, 165,760 CSS bytes), supplied default theme/icons/groups/dropdowns. .gitattributes pins the supplied files to LF on Windows. No paid component/key/account.

## Behavior and scope

All ordinary in-lesson HTML and Markdown now uses the classic visual editor; Advanced exact source stays secondary. Studio's other Markdown surfaces remain EasyMDE. The supplied small icon toolbar has two configured rows, with real bold/italic/underline/strike, brush text/background color, bounded font sizes, paragraph formats, alignment, list/indent/outdent, links, table picker/editing, rule, Undo/Redo/fullsize. Approved local image insertion uses the existing provenance/pinned-URL chooser and requires alt text. The paragraph direction dropdown uses Jodit's component dropdown/supplied paragraph icon. No manually rebuilt toolbar.

The generic DOM source adapter reuses original range offsets and minimal patchHTML edits. It never sends new formatting through a hidden PM schema. The legacy PM schema/state exports remain solely for compatibility/source-adapter tests. Exact untouched source, CRLF, entities, comments and unknown attributes are preserved; descendant metadata loss refuses compilation and retains current input. Unsupported markup/activities, checklists, and regions with authored FEFF remain explicit noneditable retained boundaries. Crossing selections and boundary-adjacent Backspace/Delete are refused. Generated Jodit FEFF caret scaffolding/selection markers cannot enter persisted source. New FEFF input/paste is visibly refused in the visual canvas; Advanced source remains available for exact invisible-character authoring.

safe-format.js is shared by author collection and learner/Preview. It accepts explicit color/background/border-color grammar, bounded px/pt/em/rem/% font sizes, alignment/direction, font emphasis/decoration, 0–300px left/right indentation, supported list styles, bounded table dimensions/borders/vertical alignment. It rejects active/URL/expression/import/position/display/variable CSS. Remote/unsafe images, embeds, handlers, new editor CSS classes, raw-source controls and automatic video expansion are excluded. Pasted markup is filtered in an inert template before insertion. Existing source attributes survive via patches.

Small field buffers, field-patch, worker preparation, complete validation/CAS and submitted-model receipt pipeline remain. AcceptSaved only changes the saved immutable model; it does not remount the editor or clear newer text. Page reuse retains the actual Jodit instance/history; stale sessions dispose safely. Composition settlers and pending unsent comments remain. Canvas quotes map only when unique in the canonical UTF16 projection; repeated quotes use the existing exact text selection surface. Historical/private contexts are never rewritten. Scoped publication/sidebar logic is unchanged.

No live63358, installed hebleo-editor, main, WordPress, external configuration, actual teaching publication, audio or curriculum changes.

## Actual checks

| Command | Result |
| --- | --- |
| npm install --save-exact jodit@4.18.12 --ignore-scripts --no-audit --no-fund | Pinned complete component installed |
| npm ci --ignore-scripts --prefix schemas --no-audit --no-fund | Locked schema test dependencies installed |
| npm run build:editor | Passed; supplied assets copied locally, full notices generated |
| npm run verify:candidate | Final **1046/1046 passed**, 0 failed; configured audio-file/name exclusions retained |
| npm test --prefix schemas | **27/27 passed** |
| node schemas/tools/runtime-check.mjs --runtime . | **9/9 passed**, exact code SHA8a8f660 recorded |
| node --test test/classic-editor.test.js (plus final configured run) | Actual bundled Jodit tests, 11 cases in final suite |
| node --test test/classic-editor.test.js test/mature-editor.test.js test/rendered-author.test.js | Source/state migration checks; included in final configured run |
| node --test test/author-review.test.js test/feedback18-studio-ui.test.js test/refinement.test.js | Private/CAS/sanitizer/source checks; included in final configured run |
| node scripts/verify-classic-copy.mjs --source ../classic-editor-before-20261101/candidate.sqlite | Actual-size copied-store Jodit+HTTP Save/Preview/reload/assets/preservation passed |
| git diff --check; git diff --cached --check | Passed |
| gh repo view guylfe/hebleo-3.0 --json isPrivate,url,nameWithOwner | isPrivate=true |
| git push -u origin fix/classic-wysiwyg-20261101; git ls-remote --heads origin refs/heads/fix/classic-wysiwyg-20261101 | Code push succeeded and exact8a8f660 read back |

The final configured suite covers actual Jodit supplied toolbar activation, font/color/highlight persistence, unchanged UTF16 authorProjection including Nikkud/emoji/whitespace, tables via supplied picker and row-edit command, lists/indent/direction/Enter, approved images and alt text, malformed paste/styles/forged boundaries, original bytes/comments/attributes, composition wait, page-history reuse, failure400/403/409/503, CAS/private comments, saved Preview, later-input receipts and synthetic scoped publication/recovery. JSDOM geometry/default-edit APIs are explicitly limited: the helper supplies missing layout no-ops and adapts config objects to the window realm; native execCommand is not emulated. Formatting/list/table behavior checked is the component's actual DOM logic.

Initial verification caught missing schemas dependencies, historical sanitizer assertions requiring all styles/remote images, a consumed dependency-promise issue, and generated FEFF caret artifacts. These were corrected before the final passing run. This is not a full audio-suite claim.

Evidence files:
- docs/evidence/classic-editor-20261101/candidate-checks.txt
- docs/evidence/classic-editor-20261101/schema-checks.txt
- docs/evidence/classic-editor-20261101/runtime-checks.txt
- docs/evidence/classic-editor-20261101/matching-copy-http.json

## Matching workspace and timings

The source baseline was never mutated. Original entire database receipt remains **8f2dac78cc94520e67fb74336efc8cae8e4df1509a1cd3f6ee3d903851c5e5dc**, matching Lead's supplied receipt.

On a newly copied store, complete saved workspace: **23 lessons / 26,632,089 original UTF8 content bytes**. The actual bundled component applied only a disposable color-format change; authorProjection stayed exact. Full minimal-receipt HTTP Save:
- 3,496.94ms during concurrent candidate checks (exploratory).
- **3,729.04ms without concurrent candidate checks** (final).

Both are HTTP/JSDOM measurements, not native Save/input-to-paint. Final readback verifies exact submitted complete draft, saved Preview and GET studio reload, other22 lessons, active content, learners, every non-KV table, and retained KV data excluding the changed draft/source-state binding. Existing source-authoring may update its ordinary draft binding through the unchanged Save API; no schema/identity semantics were changed. Private/history/media/settings retain exact data. All six new/changed routes checked return exact local file bytes; hashes are in matching-copy-http.json.

Synthetic scoped publication/recovery was tested separately on in-memory fixtures. No copied human teaching data was published or installed.

## Native blocker, cleanup and limits

The sole mounted Browser open attempt to http://127.0.0.1:63481/ returned: “another thread is using this browser — pause browser work until that thread finishes”. No page opened or candidate mutation occurred through Browser. No alternate browser, foreground computer or shell browser was used. No candidate screenshot exists. Lead's provided reference/before screenshots were read as files only; they are not after-evidence.

Therefore actual rendered toolbar fidelity, tooltips/active states, trusted native commands, Save/Preview/reload, native input/paint/Long Tasks, caret/Undo during trusted pending input, clipboard paste, actual Hebrew IME, narrow widths/200% zoom, keyboard-only popup behavior and assistive-device checks remain unverified. Automated/JSDOM evidence does not close those gates. Independent UX/QA/Release and Guy acceptance remain pending.

The disposable Browser server was started with node tmp/classic-serve.mjs at63481/PID71592, then stopped after matching its executable/command line and owning port. No listener on63481 verified after shutdown. Its unmutated tmp/classic-review.sqlite was read back exactly equal to the original receipt after cleanup. The HTTP verifier closes every ephemeral server/Store itself; copied databases remain ignored under tmp for review and must never be installed.

No related automation exists for this bot. No monitor was left running.

## Exact changed files and routes

Code commit changes27files:

.gitattributes; DESIGN.md; UX-CONTRACT.md; docs/FEATURE_CHECKLIST.md; package.json; package-lock.json;
public/author/{author.css,classic-source.js,inline-author.js,legacy-editor.js,rendered-source.js,source-adapter.js,standard-editor.js};
public/author/vendor/{LICENSES.txt,jodit.min.css,jodit.min.js};
public/{rich.js,safe-format.js};
scripts/{build-editor-vendor.mjs,verify-classic-copy.mjs}; src/server.js;
test-support/classic-dom.js;
test/{classic-editor.test.js,feedback18-studio-ui.test.js,mature-editor.test.js,refinement.test.js,rendered-author.test.js}.

New static routes: /safe-format.js, /author/classic-source.js, /author/legacy-editor.js, /author/vendor/jodit.min.js, /author/vendor/jodit.min.css. Existing standard-editor/rendered-source/rich routes serve the replacement implementation. No API or persistence schema change.

## Lead's next handoff

Review the exact candidate, release the mounted Browser for trusted candidate checks, and obtain actual UX/QA/Release review on exact reviewed bytes. Resolve native findings before integration/guarded code-only installation. Preserve fresh live teaching/user state under Lead's existing rehearsal/backup guards; never install any tmp review database. This candidate is not an installed update or a completed native acceptance result.

## Lead integration delta: image dropdown, 1 November 2026

Actual mounted Browser on the matching 23-lesson copy confirmed Jodit4.18.12 mounts in MEMORY with the supplied two-row toolbar and visual canvas. The toolbar measured758x65px at1280x720. Native opening of the image split-button trigger revealed an inherited URL-image popup despite the approved chooser main action and disabled image plugin. No URL was submitted and no teaching edit, Save or publication was made. The review server was stopped before changing source.

The image control now explicitly clears both inherited popup/list values. Actual bundled-component regression verifies the URL popup and split trigger are absent while approved local chooser insertion/alt checks still pass. All11classic-editor tests pass. Before this narrow delta, Lead independently ran40focused author/source/worker/anchor checks, all passed; copied npm JS/CSS match the pinned package exactly and full MIT notice is included. Native recheck and independent UX/QA/Release remain pending. The installed63358 source/data were untouched.
