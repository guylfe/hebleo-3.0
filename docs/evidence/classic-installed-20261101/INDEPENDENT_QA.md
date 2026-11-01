# Combined classic editor: independent correction and native QA

**Bounded preinstall QA PASS on `40864ec3cad885b5d550eb9c9cda9c0addc6bd6d`. QA-CLASSIC-PROJECTION-01 is CLOSED.** The exact three original Center regressions pass unchanged; trusted native Center on the Markdown heading, repeated HTML sibling and Markdown table cell also saves with the complete canonical UTF16 projection unchanged. No new blocking functional defect was reproduced in this bounded review. Performance and platform limits below remain explicit. This is not installation or Guy acceptance.

Reviewed frozen source:
`C:/Users/Trans/.openmausbot/task-workspaces/8c900356-50f6-4d41-bbb9-50c8abe09233/4d4e36bc-67d1-4c07-bcfb-e381d246b0b3/hebleo-classic`.

Own reports/probes/snapshot:
`C:/Users/Trans/.openmausbot/task-workspaces/71c71389-5334-4e0c-9ca8-d80dd28223d1/653fb433-7485-48b1-9f7c-cb22711bda02/hebleo-3/qa-classic-40864ec`.

- Exact HEAD/source manifest: **151/151** files verified before and after; source clean. Own test snapshot is byte-identical. Nine served assets independently match their exact manifest hashes.
- Runtime: `9554d3804855327e9159947abd6841a1d50a2bce2408afeb46cbdb2bd72460d7`.
- Backend: `4c182a5bae3e6e9569492d7595b4e5529a026d04ad008937e3f15e5943d021d3`.
- Actual mounted Browser origin/build verified before actions and after reload: `http://127.0.0.1:63484/`, preservation=true. No alternate/headless browser, own-screen/foreground route, shell browser or production63358 write was used.
- Supplied review server is intentionally left running for Lead/UX. Supplied PID73444 is still a node process; API/build and asset hashes confirm the served identity. QA did not stop/restart it or install any database.

## Native evidence

All described editor commands used mounted Browser click/type/press controls. Page evaluation read state or installed explicitly described passive instrumentation/fault injection; it did not force editor DOM, selection, focus or toolbar commands. API setup is separately labelled below. Native evidence: `NATIVE_EVIDENCE.json`, `NATIVE_UI.json`, `NATIVE_FINAL_BEFORE_RELOAD.json`, `NATIVE_RELOAD.json`, four `native-events-*.json` files, screenshots and checkpoints.

1. Selected the fictional Author through the actual profile control, opened the lesson through Continue and clicked Edit lesson. The source fixture is visibly labelled SYNTHETIC. Actual supplied Jodit toolbar measures **758×65 CSS px**, two rows, in a1280×720 Browser viewport. Advanced source remains secondary.
2. Clicked the Markdown H2, Home/Shift+End selected its text, then activated supplied Center, Bold, Underline and24px. Center also acted on the first of three identical HTML paragraphs and the first table data cell. Only the selected repeated sibling gets center formatting. Font menu is exactly `8,10,12,14,16,18,24,32,48,72,96`px, unique/ascending.
3. Brush pointer selection of Text exposes the related panel and applies blue. Native `Escape → Alt+F10 → Home → ArrowRight×4 → ArrowDown → ArrowRight` focuses Text, sets selected=true/tabindex0, and shows its labelled panel while Background is false/-1/hidden. Home returns to Background; clicking yellow applies highlight. No synthetic key or scripted tab click is presented as native evidence.
4. Trusted Save1 completes on the full23-lesson workspace. Readback's production `authorProjection` is exactly the fixture's original projection, including all newlines, repeated text, Nikkud and surrogate pairs. Both pre-existing synthetic notes—whole block and an exact second repeated quote—remain **current**, with their complete historical namespace unchanged. Raw source retains unknown data attributes/comments and contains no region/selection/retained-boundary scaffolding. `checkpoint-format.json`.
5. Actual Preview saved draft displays centered H2, bold/underline,24px, blue text and yellow background; computed styles are recorded. The repeated HTML paragraphs render center/null/null. It uses the ordinary saved-draft rehearsal, not a hand-built preview. `preview-formatted.png` is a verified native screenshot.
6. Actual approved-image toolbar action opens only the local chooser. Real Browser decoding reports the exact imported PNG as complete/natural1×1. Explicit private approval, separate exact-revision selection, mandatory alt rejection and subsequent insertion all work. See audit section below. Image insertion changes the buffer only; explicit Save and ordinary Preview then show the same checksum URL/alt and successfully decoded image. Projection remains exact even after image insertion; both anchors remain current. `checkpoint-image.json`.
7. Pending Save used a clearly labelled test-only response gate around the actual successful HTTP request. While the acknowledgement was withheld, real trusted typing added `x SYNTHETIC late B` to the first repeated paragraph and a synthetic unsent private note was filled. Releasing the submitted response leaves the same editor node, newer text, unsent note and `Saved the submitted draft. Newer edits remain unsaved.` The server retains the submitted source until explicit later Save. The gate delays only acknowledgement; it does not generate input or substitute the worker/backend write.
8. Native Ctrl+Z removes B; Ctrl+Y restores it, with the same editor/history. Native Enter creates a normal new paragraph. The temporary Enter probe was undone. Selecting all editor content across the retained boundary and Backspace is refused visibly, preserving all text and the boundary. Subsequent ordinary typing in editable prose works. Existing metadata/comment retention is verified on every actual saved readback.
9. A second clearly labelled one-shot transport fixture returns503 before calling the server. Actual Save UI retains newer text, unsent note and editor/history; read-only database receipt is unchanged. An explicit second Save reaches real HTTP200 and persists the new text. `checkpoint-failed-save.json`, `NATIVE_EVIDENCE.json`. This is injected native recovery evidence, not a claim that the actual backend spontaneously failed.
10. Supplied link form inserts only the chosen synthetic `https://example.invalid/synthetic-qa-link`. Actual click on the resulting link opens **Edit link, Unlink, Brush**, with **no File control**. No external navigation was performed. Explicit Save preserves the current projection, source and image. `NATIVE_FINAL_BEFORE_RELOAD.json`.
11. After proof of retention, the unsent synthetic composer text was explicitly cleared before ordinary reload. Reload returns to the unchanged active teaching page; reopening Edit lesson shows the saved private fixture, formatting, link and exact image. Reopened chooser shows the same approval timestamp/actor, zero new approval buttons and enabled exact selection. Cancel closes it without insertion or new approval. `NATIVE_RELOAD.json`, `editor-after-reload.png`, `context-after-reload.png`.
12. Programmatic Browser clipboard preparation was denied. A separate ordinary native Ctrl+C of the selected synthetic heading and Ctrl+V into a paragraph created through native Enter **did** produce trusted copy/paste events and pasted the heading text. Explicit native Save succeeded. `NATIVE_COPY_PASTE.json` and `checkpoint-native-paste.json` retain the actual source/readback. Two native Ctrl+Z operations then removed the temporary paste/Enter, restored the exact pre-paste DOM, and explicit Save restored the exact pre-paste saved source hash. `NATIVE_PASTE_UNDO.json`, `checkpoint-handoff.json`. This closes a bounded normal clipboard sample; malicious external rich-clipboard delivery remains automated-only evidence.

The initial attempt to type after the newly inserted1px image produced trusted beforeinput events but no text/input events. It was not counted as successful input or the performance sample. Recheck with actual caret readback and a trusted character inserted correctly before the image, then was undone; no reproducible image-caret defect was established. The successful pending-input sample uses ordinary paragraph text. Save was initially covered by the sticky header at the tool's click point; actual page scrolling exposed it and the next trusted click succeeded. No foreground or forced-click fallback was used.

## Responsiveness evidence and limits

Passive capture/bubble input timing and next requestAnimationFrame were sampled while the full23-lesson workspace was mounted. All18 sampled input events are trusted. The next-frame measure is not a pixel-paint guarantee or physical-device benchmark.

| Measure | p50 | p95 | max |
| --- | --- | --- | --- |
| synchronous input handling |0.30ms|1.10ms|1.10ms|
| input to next RAF |1.00ms|14.30ms|14.30ms|

Zero full23-lesson `structuredClone` or `JSON.stringify` calls were observed during this input window. Actual source handlers operate on the field-local DOM/model; full preparation remains at Save boundaries. Instrumentation does not claim to intercept every possible browser serialization primitive or worker-internal computation.

First Save: visible feedback **2.3ms**, first RAF **9.9ms**, completion **5056.2ms**, actual HTTP portion **4291.3ms**. Same editor node retained. Other measured real HTTP saves were3752.6ms,3428.6ms (before intentional response holding),4119.7ms and3575.9ms. The synthetic503 has no backend request and is not included in those HTTP durations.

**Performance limitations remain:** Save preparation produced Long Tasks184–276ms in the captured window. Entry into the editor included one1016ms Long Task and additional shorter tasks; this is not a universally smooth entry/Save claim. No native SLA threshold was supplied. Typing improved within the measured sample; physical Hebrew IME, assistive technology, phone/touch, narrow viewport and200% zoom are not verified here. UX owns the next native fidelity/narrow recheck.

## Real private-image pin, consent and recovery

Lead's imported fixture was already present before QA; QA independently compared the pre-action review store with the original. All original KV/learners/revisions/events/aliases were exact. The only initial differences were the declared synthetic media-state import record and one additional blob. No direct DB metadata forging was used to prepare or approve the image.

- Asset: `synthetic-classic-review-image`.
- Revision: `media-3bba137c-d746-4b1a-bea1-b4485740cc0a`.
- SHA256: `5e3d382db4dd83d59aa5742793ad6b7903409e865c83bcbc54835049f043bc15`.
- Exact URL: `/media/blobs/5e3d382db4dd83d59aa5742793ad6b7903409e865c83bcbc54835049f043bc15.png`.
-68bytes, image/png, Browser decode1×1, labelled synthetic-demo/no teaching authority.
- Private approval actor `author-demo`, timestamp `2026-11-01T09:50:35.233Z`, operation `private-image-2f58c4c3-940e-487f-ad8f-7c13b8481d83`.
- Alt: `SYNTHETIC QA 1x1 PNG — approved private use`.

`IMAGE_APPROVAL_RECEIPT.json` contains the complete exact-pin approval plus paired operation request/hash/result. One approval and one operation exist. Removing the new overlay leaves media state **deeply equal** to before approval, preserving the immutable imported revision and original import receipt. Media blob table hash is unchanged. Approval alone leaves saved HTML and active6 unchanged; it does not Save, publish or grant canonical teaching authority. Canonical approval remains pending throughout.

`IMAGE_RECOVERY.json`: own read-only VACUUM source copy plus a separate copy of the matching recognized installation; full backup **85,485,825 UTF8 bytes**, `mediaRecovery.version=2`, one private approval. Actual restore preserves complete23-lesson draft, active content, immutable private contexts/history, approval audit, all media state/bytes and learner state. Entire reexport content except timestamp compares exact; the source copy's table receipt stays unchanged. No human teaching was published in this rehearsal.

The initial attempt to restore the full trusted-source backup into a blank synthetic Store correctly returned409 `LEXICAL_APPROVAL_REQUIRED`. The final rehearsal uses a separate matching known-source copy rather than bypassing source approval. Initial failed log is retained as setup evidence, not an editor defect. Focused tests separately exercise synthetic selected publication, canonical refusal for private-only human/source media, strict pin/CAS/idempotency, failure rollback and media recovery compatibility.

## Full-size preservation

Original database was read only. Before/after receipt remains:
`09d24427a13d3f64418b1d11655ad091f70675a0da35e5db08feb03ff00196e1`.

Original full draft23 lessons /26,632,089 JSON UTF8 bytes, active6. Lead's initial disposable import snapshot receipt is `be86e7d17896bdcb416c584e55b20b66c074c267c4fbefd6681e6d059237674b`.

API fixture setup changes only the first MEMORY page's title and HTML to explicitly synthetic test content, and creates two synthetic private notes. It is not trusted user input. Exact fixture source/projection, stable target IDs and both original private-note anchors are in `NATIVE_FIXTURE.json`; the matching full prepared snapshot is `native-prepared.sqlite`. No original teaching is published or silently replaced in the installed app.

Every checkpoint requires the complete current draft to equal that prepared full draft with **only this one synthetic HTML field changed**. Other22 lessons, all other pages, all metadata/stable identities and legacy inactive lessons remain exact. The first format and image checkpoints both retain canonical projection hash:
`cdea804939eb23c7477e57b2270e6501653909ae7abc6ac100a2c4911a9f2471`.

Later intentional text B changes that projection and correctly marks historical notes changed; the stored historical private namespace remains deeply exact. Link-only formatting retains the same post-B projection. These intentional text changes are not attributed to format-only projection failure.

Every non-KV table and sqlite_sequence remains exact except the fictional Author profile's existing `resumes.MEMORY-A2.updatedAt`, updated by ordinary actual lesson navigation. Its other fields and both other fictional profiles are exact. `AUTHOR_NAVIGATION_DELTA.json` explicitly records the sole changed path; this is not an all-learner-rows-byte-exact claim. Active stays6; six immutable revision rows, existing media bytes/aliases, settings/install markers and all unrelated KV values are preserved. Native changes after preparation are limited to draft and the one private-image overlay. Private historical notes are never rewritten.

Full per-table hashes, source/projection hashes, exact differences and original-source guards are in `BASELINE.json`, `CHECKS.json`, `checkpoint-*.json`. Review databases remain disposable/neverInstall.

Final shared review-store handoff receipt (after undoing/saving the temporary paste probe): `3f1aab0644b1739eb067247e670a83425004eb9c0c80e8c1e76ce99f8c792b29`. Saved draft26,632,796 bytes; synthetic target HTML hash `ca7ebd2243148a36af27bd3d7318d8016c71baa8dce38327202785b340c39cf3`. This equals the saved linked fixture before the temporary paste. The original09d244 receipt above remains unchanged.

## Commands actually executed

Commands are from the owned artifact directory unless specified. Tests import the exact raw-byte snapshot under `candidate/`. No unrestricted full suite was rerun. Lead's reported1093/27/9 combined gates are not represented as QA executions.

| Command | Actual result |
| --- | --- |
| From shared QA workspace: `node qa-classic-40864ec/setup.mjs` |151-byte manifest verification; snapshot; consistent read-only before-copy and receipts. |
| `node --test projection-regressions.test.mjs` | Original unchanged **3/3 PASS**, `projection.log`. |
| `node --test candidate/test/classic-projection-regression.test.js candidate/test/classic-corrections.test.js` | **22/22 PASS**, `correction-focused.log`; actual checked-in RR file has7 color fixtures plus metadata and sanitizer cases. Includes repeated first/middle/last mapping, exact anchors through HTTP/Preview/synthetic publication/recovery, menus/Brush and ambiguous mapping refusal. |
| `node --test classic-state.test.mjs` | Unchanged independent **6/6 PASS**, `state.log`: real Jodit/worker/HTTP, composition settlement, pendingA/newerB, strict immutable receipts,403 restoration,400/403/409/503 failures/retry, selected synthetic publication and historical Unicode anchor. |
| `node --test candidate/test/classic-editor.test.js candidate/test/private-image-use.test.js` | **28/28 PASS**, `image-focused.log`; actual imported-image approval/insertion/Save/synthetic publication/recovery, canonical refusal and backend permission/audit/failure coverage. |
| `node prepare-native.mjs` | Exact served build guard; only declared copied fixture and2 private notes via actual APIs; matching prepared VACUUM. `native-prepare.log`. |
| `node checkpoint.mjs format`, `approval`, `image`, `failed-save`, `final`, `linked-final`, `native-paste`, `handoff` | Executed at native boundaries; full readback/source/history/settings/media/other22 checks. Corresponding JSON and logs retained. |
| Approval comparison Node assertion in transcript | PASS: no draft/active changes, exact import and bytes, one strict approval/operation. `IMAGE_APPROVAL_RECEIPT.json`. |
| `node recover-image.mjs` | PASS on matching isolated copies; exact full-size mediaRecovery2 rehearsal. `image-recovery-complete.log`, `IMAGE_RECOVERY.json`; initial blank-target refusal retained separately. |
| `node final-check.mjs` | PASS: source/snapshot151 hashes, original DB guard, original-vs-initial-review matching except import,9 served hashes and explicit author navigation delta. `final-check.log`, `CHECKS.json`. |
| `py -3 .../frontend-design-premium/scripts/audit_project.py candidate --mode strict` | Executed with expanded read access after sandbox Python launch failed. **4 existing findings**, not a clean static-audit claim; `static-audit-complete.json`. |
| `Get-Process -Id 73444` and actual `/api/build` readback | Supplied node process and exact served build remain available for Lead/UX. |

The static findings are the same documented pre-existing categories: two undetected delegated action buttons in `public/studio/lesson-editor.js:30`, one in `public/studio/media-picker.js:15`, and scrollbar standards properties in supplied minified Jodit CSS. The first three are static heuristic findings, not evidence that the delegated runtime controls fail; no such native failure is claimed. QA did not rewrite source or vendor CSS under this frozen/no-source-edits assignment. Frontend design guidance was applied as a review contract, preserving the maintained DESIGN/UX contract.

One element-only screenshot was blank and is explicitly retained as `discarded-blank-element-capture.png`; it is not visual acceptance evidence. The verified viewport captures are `editor-after-reload.png` and `context-after-reload.png`; `preview-formatted.png` is the ordinary native Preview capture. No screenshot proves physical touch or screen-reader behavior.

## Handoff

Lead can mark QA-CLASSIC-PROJECTION-01 closed on these exact combined bytes and retain bounded native/state/image/preservation evidence for FIRST2-F14/S03/L08. Keep Guy result Pending; shared FEATURE_CHECKLIST remains Lead-owned and was not edited by QA. Native malicious external paste, physical IME/touch, screen reader, narrow/zoom and universal performance remain open limits; UX recheck follows QA with exclusive Browser ownership. No new source correction is requested from this bounded QA result.

QA made only owned ignored reports/probes and declared synthetic disposable data mutations. No frozen source changes, private push, main merge, actual teaching publication, installation, live63358 write or external configuration change. No persistent own server or monitor was created; the supplied63484 server remains running for Lead/UX. This bot has no related automations.
