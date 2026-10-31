# Bounded UX recheck — rendered editing and saved Preview

31 October 2026. Hebleo UX Owner. **Native acceptance remains blocked by Browser transport failure.** This is a partial recheck of the two findings in the earlier `INSTALLED_UX_VERDICT.md`, not a new fourteen-item audit or an installation approval.

## Identity and scope

- Mounted Browser: `http://127.0.0.1:63472/`, actual viewport **1280 × 720**.
- Live `/api/build`: revision **0e874af56765ce16b929b1aa55974f121a86f8c3**, runtime SHA-256 **524058a51ac9600a294e6642d5eefa1e8e76538287e0a4bb0c5ff859388d190a**, preservationMode **true**. Manifest includes the rendered-source helper. Local `git rev-parse HEAD` matches.
- Inspected checkout: `C:\Users\Trans\.openmausbot\task-workspaces\8c900356-50f6-4d41-bbb9-50c8abe09233\008af79a-cda6-4a4c-bd78-8ad492a6a44e\hebleo-combined`.
- Read `docs/RENDERED_AUTHOR_CORRECTION.md`, `docs/evidence/rendered-author-20261031/DELIVERY.md`, the prior UX verdict and current inline author implementation. Owner screenshots/measurements are supplied evidence, not new independent native evidence.

## Observed native results

| Check | Bounded verdict | Evidence |
|---|---|---|
| Default rendered editing surface | PASS, surface only | Selected Author, opened How memory works and Edit lesson. Accessibility tree and DOM show a contenteditable H3, paragraph and three LI leaves in the existing rendered teaching layout. Save draft, Preview saved draft and Review changes are distinct. Advanced source is collapsed. |
| Contextual formatting | PARTIAL | Focusing the paragraph displays Bold/Italic; leaving it hides those controls. Native keyboard selection produced a nonempty range. Actual Bold/Italic application was not completed. |
| Native heading + sentence save and ordinary saved Preview | NOT VERIFIED | A paragraph entry marked SYNTHETIC UX TEST reached dirty state. Browser fill inserted before existing content rather than replacing it; subsequent replacement typing timed out. No Save draft was clicked. Heading was still original at the last successful readback. Later timed-out operations may have taken effect. |
| Private quote/block note and readable persisted author context | NOT VERIFIED natively | Private author workspace explains author-only visibility and exposes comment controls. Selection was observed, but no comment composer target or submission was completed. Automated checks below cover quote/block persistence and learner exclusion. |
| Dirty/Stay/failure/conflict retention | PARTIAL | Dirty status was observed. New native Stay/error/conflict actions were not completed; focused tests passed. |
| Saved Preview page6 → Back → page5 summary/input clearance and activation | NOT VERIFIED natively | Browser failed before opening Preview. No new independent native geometry, pointer or keyboard activation evidence obtained. Tests passed; owner native measurements remain owner evidence. |
| Narrow viewport / zoom | NOT VERIFIED | No viewport/zoom setting tool is mounted. Browser key zoom was not attempted after the transport failure. |

The earlier duplicate-source-editor defect is visibly corrected at entry. Do not mark #14 fully accepted until actual heading/sentence save, saved Preview and private context checks finish. Do not close the Preview obstruction finding from this recheck alone.

## Exact Browser blocker

An asynchronous readback did not answer; the Browser later reported it answered again and one following action did not run. Paragraph fill then succeeded, with a synthetic insertion and original text both visible. A subsequent read-only DOM inspection succeeded and confirmed the original heading, dirty paragraph and keyboard-selected text. Later native typing, read-only evaluation, and a screenshot attempt each returned:

`Failed to read: A connection attempt failed because the connected party did not properly respond after a period of time, or established connection failed because connected host has failed to respond. (os error 10060)`

Stopped this route after repeated failures. No substitute browser, host desktop, fabricated selection/event, screenshot or geometry evidence was used. The screenshot attempt failed; **there is no new screenshot**. Browser may remain on the dirty author canvas; inspect before any further operation. No successful save or private note submission occurred in this review. Preserve the candidate as disposable and NEVER install its database.

## Independent focused checks actually run

From the exact integrated checkout:

```text
node --test test/rendered-author.test.js test/author-review.test.js test/workspace-save-regression.test.js test/first2-dock-regression.test.js test/keyboard-dock-clearance.test.js
43 passed, 0 failed, 0 skipped; exit 0
```

Coverage includes selected-leaf HTML/Markdown edits, retained attributes/rich formatting/CRLF/sibling source bytes, contextual toolbar stability, real full-draft/CAS HTTP save and saved Preview source, quote and whole-block note persistence/readable source/learner exclusion, 400/403/409/503 retention, newer-pending-input acknowledgment, six-page reader Back transition and simulated dock geometry. These are automated/helper/API checks, **not native Browser task completion**. Native source formatting preservation was not independently proved here.

The tests used their isolated stores. No existing checkout code or installed database was edited. Full-data recovery was not rerun. No production, WordPress, audio, main/source pack, publication or installation action was taken. This bot has no related automations to stop.

## Source and acceptance limits

Verified source leaf ranges are the intended edit scope. Complex/unverified structures, nested Markdown lists and blockquotes use Advanced source; adding and reordering blocks stays in Studio. Do not claim whole-block creation support. Mixed-source preservation has independent automated evidence above, not a completed native edit/save result in this run. Four human consonant recordings remain separate. Physical touch/APK remains deferred. Assistive-device and Guy acceptance remain open.

Lead owns restoring mounted Browser access and arranging the unfinished native recheck, then any guarded install and narrow installed checks. Candidate code passes the focused suite; this report does not authorize installation or close either native acceptance gap.

Structured served identity, Browser failure and test evidence: `BOUNDED_UX_EVIDENCE.json` in this folder.
