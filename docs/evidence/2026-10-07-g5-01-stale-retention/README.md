# G5-01 stale rehearsal answer retention — owner correction evidence

2026-10-07. Private branch `lead/g5-01-stale-retention`, exact parent `c1b9fb925d0d77d4b7e3d4bf4615d3a55e68e176`. One coherent correction; no main merge or protected-demo update. The delivered commit is recorded in the external `G5_01_DELIVERY.md` and verified push receipts.

## Change

Only `public/preview/lesson-preview.js` changes product behavior. On stale409 / missing-target404 it copies the actual displayed renderer DOM and live field/selection values before disposing the renderer. That copy has no listeners. Controls, dragging, editable content, links and media become inactive; stale busy state is removed. Typed Hebrew bytes, selected recognition meaning, matching pairs, ordering occurrences/prefix grouping and existing feedback remain displayed. The controller rejects all grading/navigation/answer/preference actions. It neither retries nor refreshes the draft token, repairs the answer or invents a new accepted grade. Exit and modal Escape still dispose the presentation and restore focus to Rehearse.

## Executed automated checks

From the `hebleo-g401` checkout:

- `node --test --test-name-pattern=G5 test/app.test.js test/stale-preview.test.js`: **23/23, exit0**. Eighteen actual-renderer/controller/HTTP cases cover six exercise families after genuine draft saves/publication conflicts and the real missing-target404 route. Exact visible answers and wire payloads, disabled controls, event disposal, unchanged SQL total_changes and every table/sequence/profile/published pack are asserted. A separate controller test retains already displayed feedback and non-default live input/select values. Actual app/HTTP two-window typed reproduction verifies Escape/focus restoration.
- `npm.cmd run verify`: **174/174, exit0**, including matching/ordering/recognition, publication, CAS, restore and rehearsal protections. `node --check public/preview/lesson-preview.js` and Git whitespace verification also pass.
- `npm.cmd --prefix schemas test`: **15/15, exit0**.
- `node schemas/tools/runtime-check.mjs --runtime .`: **8/8, exit0** using a per-process Git safe.directory entry for this owned checkout; no global Git configuration changes. The first invocation failed on Git dubious ownership, before results counted; its diagnostic is retained locally. Runtime receipt shows parent HEAD because checks ran on the corrected working tree before commit; executable-tree identity is verified in delivery receipts.

Control: the committed parent's controller and its two imports are exported to the sibling `g5-01-control` (no application swap). With `HEBLEO_PREVIEW_CONTROLLER` pointing to that controller, the same G5 command exits1: **21 failing retention checks, two passing guard-path checks**. Actual app/window retention, all eighteen family cases and displayed feedback fail on missing content. The two guard tests pass on parent and candidate, so no speculative behavior changes were made.

## Additional automated Gate 5 evidence

The actual app uses an ephemeral real HTTP server and synthetic Store. For the pending-save case, its first genuine autosave HTTP response is held at the app's transport adapter after the server handles it. Studio navigation begins while the save promise is outstanding; navigation waits, then performs its intentional flush. Both payloads retain `אני`; only the Author learner row changes, with the other profiles and nonlearner tables exact. Rehearsal's `הוא` never overwrites that resume and makes no subsequent progress write. This is deterministic automated deferred-response coverage, not a mounted-browser overlap claim.

The real `keyboard-owner.js` Pin button handler emits its legitimate `hebleo-keyboard-preference` event during rehearsal. The app's handler suppresses the write: no preference request/table change. After Exit the same owner handler emits a second event and a real preferences HTTP request writes the expected learner setting. A custom event is not manually fabricated. This is automated DOM/HTTP coverage; mounted global-owner-event coverage remains unverified.

## Actual mounted Browser reproduction

Fresh synthetic SQLite at sibling `g5-01-browser/scratch.sqlite`, served on free61916 by the current checkout without demo-progress reset flags. Existing protected demos and QA artifacts are untouched. The two actual tabs use Author/Studio. Initial valid draft and other-tab changes edit only clearly labeled QA metadata prompts using the existing fixture content.

1. Save typing draft, open rehearsal/Apply, type `אני` ungraded. `03-before-enter-page.png` and `02-before-stale-dom.json` show the input and original draft prompt.
2. The second tab selects ex-1-type, changes only Prompt and clicks Save exercise draft. Actual HTTP200; only draft KV changes. Separate fingerprints capture that deliberate save.
3. First tab Enter sends the old token and exact `אני`, receives409, retains that answer and original prompt with disabled/read-only controls. No accepted feedback appears. `04-frozen-page.png` and `04-frozen-dom.json` show the warning, answer and frozen controls. Focus is on Exit.
4. Digit1 makes no request. Actual Escape closes the dialog and returns focus to Rehearse. All tables remain identical to the post-other-tab baseline, including all three learner rows, published revisions and sqlite_sequence. There are no API calls after the conflict evaluation.

`node g5-01-browser/verify.mjs` from the workspace root passes **31 saved-observation assertions, exit0**; `browser-verification.json` contains only hashes and a compact traffic receipt. The underlying full local table snapshots/DB are retained outside Git. The selector-clipped screenshot returned blank; it is excluded from visual evidence. Full-page screenshots above were inspected and show the answer correctly.

## Attribution, limits and handoff

QA independently passed matching/ordering at `c1b9fb9`; recognition closure stays at `b312cdd`. Release independently passed its focused backend gate at `c1b9fb9` (140 focused,22 compatibility/HTTP,two positive groups), preserving earlier RR01–04 closure at `ee9e2f1`. Those frozen reports remain distinct from review of executable `d42e1cfea9fb1e982651922a2ef2917d6cb5b85a`. Release's valid-backup compatibility pass has an explicit limit: older malformed matching/blank-token exports are rejected before writes; contents are not repaired or regraded.

QA report: `C:\Users\Trans\.openmausbot\workspaces\df3d19e5-dedf-4129-9d7a-5b08ffaa6bd9\qa-g5-c1b9fb9-report\README.md`. Release report: `C:\Users\Trans\.openmausbot\workspaces\6fce93a9-6bf0-4d8d-ad11-edd2d2a11700\RELEASE_RECHECK_c1b9fb9.md`. Both were read; neither was edited.

Subsequent independent G5-01 closure at d42e1cf: 23/23 focused DOM/HTTP checks independently rerun in `C:\Users\Trans\.openmausbot\task-workspaces\71c71389-5334-4e0c-9ca8-d80dd28223d1\653fb433-7485-48b1-9f7c-cb22711bda02\hebleo-3\tmp\qa-g501-d42e1cf\README.md`. Separately, `C:\Users\Trans\.openmausbot\workspaces\df3d19e5-dedf-4129-9d7a-5b08ffaa6bd9\qa-g501-d42e1cf-room\README.md` records actual mounted two-tab B Save200/A old-token Enter409: exact `אני` and original context retained read-only/ungraded, controls disabled, Exit focused, Escape restores Rehearse, no post409 application requests; all tables/learners/publication unchanged after B's draft-only save. Its 35 saved evidence assertions verify captures; 260 frozen and 4,708 prior files preserved. These are independent results, not additional owner cases or additive counts. The Browser closure did not separately exercise button-click Exit or other answer families. Tab moved briefly to BODY; B24 records the low focus-cycle limitation without a full accessibility pass.

Gate 6's bounded learner subset passes at c1b9fb9; overall Partial, with narrow Blocked and one prior transient SHM preservation exception (other 351 files, including database/WAL, unchanged). [Consolidated references and limits](../../LEAD_HANDOFF.md#independent-artifact-references). Actual Browser pending-autosave overlap/global-owner event remain unobserved, although independently automated within the 23 checks. Native import upload and narrow viewport are Blocked by capabilities; touch/Guy acceptance Pending. Three earlier low UX findings/B24 remain open; feedback/source-payload observation stays unclassified. No full suite or CI was rerun for this documentation correction; main/protected demos remain on HOLD.
