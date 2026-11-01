# Installed editor correction — 1 November 2026

The correction is installed at http://127.0.0.1:63358/. **Code 3e01c79ebc51c72a8eff11b56e406367b87502a1, PID5504, content revision6, reader10.** The original teaching database remains in use. No lesson was published, no teaching wording changed, and no review database was installed. Guy acceptance remains Pending.

## Delivered behavior

Normal lesson text uses the mature ProseMirror editor; Markdown uses the existing EasyMDE component. Headings, paragraphs, lists, formatting, links, tables, direction and Undo/Redo are available in lesson context. Advanced source starts collapsed. Source patches retain untouched bytes and metadata; unsupported source boundaries remain protected. Small input buffers avoid workspace-scale typing work.

Save, saved Preview and Review & publish remain separate. Save prepares a complete immutable draft through a stateless worker and the same fully validated CAS/transaction path. Later input and unsent private comments survive a pending Save. Publication reviews one selected lesson and explicitly required dependencies, leaves other drafts private and requires a final confirmation. Atomic stale checks, remaining-draft rebase and later-save protection were independently tested on disposable stores. Review loading, normal exits and reconciliation Close now retain usable keyboard focus. Sidebar arrows, titles and aria-expanded describe the next action.

## Timing evidence

Measurements are page-local native observations on matching disposable data:23 lessons /26,632,089 content bytes. They exclude automation overhead and are small, sequential samples with uncontrolled outside workload.

| Native measurement | Before | Corrected independent UX |
| --- | ---: | ---: |
| MEMORY synchronous input p95 |1280.1ms; separate key check1477.4ms|Earlier corrected12/8-input samples1.1/1.9ms; final focused run all18 rich inputs max4ms|
| Save click to first RAF callback |3205.9–3502.8ms|14.2–15.4ms|
| Save feedback |Not separately measured in the old sample|0.2–0.5ms|
| Complete Save |9809.4–10497.2ms; earliest sample37858.8ms|4141.0–4984.4ms across four Saves|

The final UX verdict is bounded PASS. Remaining147–163ms Long Tasks and noticeable guarded Save completion remain explicit. Engineer-native2.87–3.06s samples and HTTP5.60–6.48s measurements are separate evidence, not substituted for independent UX or claimed installed timing. RAF is a callback proxy, not presentation/paint measurement. Installed native verification was read-only for teaching data; no live latency fixture was submitted.

## Verification and independent gates

- Final exact-code private CI [41263657724](https://github.com/guylfe/hebleo-3.0/actions/runs/41263657724) succeeded:1,040 configured candidate tests, zero failures/skips. Existing audio filename and Audio/Speed/Playback-name exclusions remain; this is not an unfiltered audio test claim. Lead also ran the integrated1,036-test precursor,27 schema checks,nine runtime scenarios and vendor build; the last narrow focus delta passed22 publication checks and nine app flows.
- Actual UX Owner: bounded responsive-editor PASS on888ac29; later changes are independently reviewed focus-only deltas. Rich editing, normal toolbar, source preservation, saved Preview, private quote/block comments, sidebar, publication/later-save behavior and pending-input isolation have explicitly scoped native evidence.
- Actual QA Red Team: bounded preinstall PASS on exact3e01c79; QA-EDITOR-FOCUS-02 CLOSED in the native remount/reconciliation path. Original stale-buffer/CAS/own-metadata and malformed-receipt defects pass. The old lifecycle harness remains13/15 with two obsolete implicit-impact orchestration assumptions; the15/15 companion explicitly requests impact and retains original assertions. This is not an unchanged-orchestration15/15 claim.
- Actual Release Reviewer: exact145-file preinstall PASS on3e01c79,22 publication-client/11 app/16 independent focus checks. Scoped earlier96 focused/nine additional worker/seven API/nine full-size groups carry through verified unchanged hashes. Complete worker Blob, submitted owner and saved23D agree. One earlier pooled-connection full-size attempt failed with ECONNRESET and left its draft unchanged; a new disposable copy with fresh connections passed. Its cause is not claimed resolved.
- Accepted93,309,582-byte recovery evidence was reused after exact protected-path comparisons. A new full restore was not run. Its earlier first-restore materialization of absent empty source/media bookkeeping namespaces remains an explicit exception. Draft request and restore limits remain50MB/200MB.

Independent reports are at:
- QA: shared hebleo-3/qa-editor-3e01c79/REPORT.md, with the broader qa-editor-04858b4 report.
- Release: shared hebleo-3/tmp/rr-focus-3e01c79/REPORT.md, with rr-final-04858b4.
- UX: UX Owner task0001a917-f062-45a6-8478-4dacc3733bd8/REVIEW_20261101.md, with the earlier2490bcf and52069ec reports.

Exact report paths and hashes are bound in installed-editor-20261101/PREPARED.json and APPLIED.json. INSTALLED.json contains a curated receipt without database rows.

## Installation and preservation

A fresh SQLite backup and separate reset rehearsal were made immediately before replacement. The original logical receipt was f71259b6ba84e81f24373218a031b7e69a5abbef8936143babea2edfe2cb444f. Apply refused any original-data drift or changed reviewed bytes. Only the verified old63358 process was stopped. The reviewed code now serves the same original database, media and designated credential locations.

All23 saved lesson objects, raw draft metadata, source pack/MNTL, other drafts, prior revision rows, media blobs/aliases, events, sequences, settings, private data and every nonprogress learner field remain exact. Content stays6 and reader10. Saved D still has26,632,089 bytes and SHA256 bcf972cf542eae85622b41f8212a4b98cac1515994b2b4db3f3c5493836c09f2. Raw draft SHA256 stays6743ee5eb0f421c432e9f426f5f4900931ce78fc772ad0abd915cc5987387966.

Standing new-build behavior reset only the three fictional profiles' progress once. All three read back fresh before navigation; original progress remains in the fresh backup. Actual installed author navigation then created a new resume. A same-build restart retained every logical database row, including that new progress: receipt78a6c1ed08f94f042932a6f470494e741c802b158996de923e7ee259541b4976 before/after. Reopening and the same-build reset check wrote no rows.

Installed readback matched145 raw executable files,76 served assets and all nine media URLs (five immutable blobs/four aliases). Eight nonserved public files are license/declaration/Git metadata. Full HTTP published/draft content and calculated saved token matched original Store data. The narrow1280×720 Browser check verified the full toolbar/editable surface, collapsed Advanced source, both sidebar states/opposite arrow paths, selected MEMORY review with22 differences private, hidden reconciliation, Tab/Escape focus return, ordinary saved Preview and return to the editor. It submitted zero teaching Saves and zero publications.

Runtime SHA256:9eba7cc35c92fc001e268fd1e460f4c79b2355d6447467aaa67c98caa0940832
Backend SHA256:2dc8700ffae79c35010ec08ce503a0177ab873544a8cb0957988f012636c3c20

Machine receipts, before.sqlite backup, never-install reset-rehearsal.sqlite, process/startup logs and native screenshot live under this task's installed-editor-20261101. Backup databases and learner rows are not committed or attached. The running checkout stays pinned at exact3e01c79; final ledger/evidence are committed through a separate documentation checkout.

## Remaining limits and handoff

Physical Hebrew IME, populated clipboard paste, successful approved-image insertion, narrow/200% zoom, physical touch/mobile, assistive technology, sustained/burst distributions and native worker/network-failure injection remain unverified. Automated worker/IME-settler/failure checks are separate evidence. No claim of arbitrary mixed-source editing or a jank-free UI. Four-consonant curriculum work remains separately unfinished. No main, WordPress, production, generated audio, actual publication or Guy acceptance change occurred. No related automation exists.

Lead has completed the authorized integration, independent gates, guarded installation and narrow installed checks. Leo owns the Guy handoff; Guy owns acceptance. No further input is required for this installed correction.

