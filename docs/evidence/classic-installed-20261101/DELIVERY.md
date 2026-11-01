# Classic WYSIWYG editor installed — 1 November 2026

The local lesson editor now uses **Jodit core4.18.12**, its complete supplied classic toolbar and default theme. It replaces the custom toolbar for ordinary HTML and Markdown-origin prose. Source stays under Advanced. Supplied compact icon rows, separators/dropdowns and visual canvas match Guy's reference direction. This is a working local installation; Guy acceptance remains Pending.

## Installed destination and identity

- URL http://127.0.0.1:63358/; final PID **61604**.
- Existing checkout: C:\Users\Trans\.openmausbot\task-workspaces\8c900356-50f6-4d41-bbb9-50c8abe09233\4d4e36bc-67d1-4c07-bcfb-e381d246b0b3\hebleo-editor.
- Exact code: **40864ec3cad885b5d550eb9c9cda9c0addc6bd6d**;151 executable files.
- Runtime: **9554d3804855327e9159947abd6841a1d50a2bce2408afeb46cbdb2bd72460d7**.
- Backend: **4c182a5bae3e6e9569492d7595b4e5529a026d04ad008937e3f15e5943d021d3**.
- Content6 / reader10 / preservationMode=true. Main, WordPress, production and audio unchanged.
- [Exact code CI passed](https://github.com/guylfe/hebleo-3.0/actions/runs/41293860082); private remote source40864ec previously read back exactly. This documentation branch is separate from installed source.

## Implementation and checks

MIT Jodit core is pinned/bundled locally with its supplied JS/CSS and retained notice; no paid account/key or Pro feature. Primary docs: [project](https://github.com/xdan/jodit), [4.18.12 license](https://github.com/xdan/jodit/blob/4.18.12/LICENSE.txt). Package integrity, matching supplied assets/build and notice were independently reviewed. Source files: public/author/standard-editor.js, classic-source.js, source-adapter.js, rendered-source.js, inline-author.js, image-chooser.js, author.css; public/rich.js and safe-format.js; src/media-store.js/server.js; pinned package/build/vendor assets.

Lead combined1093 configured tests,27 schemas,9 runtime scenarios and build passed on40864ec. Existing audio exclusions retained. Actual independent QA, UX and Release reports are copied here, with hashes in INSTALLED.json. Projection blockers and UXNC01–04 are closed. Release165 focused plus6 independent groups pass; two85,483,413-byte formatted-image recoveries preserve private anchors, image approval audits and state. These are bounded disposable tests, not publication of Guy's data.

Independent native QA exercised formatting/24px/colour/highlight/alignment, image approval/required alt/insertion, Save→ordinary Preview→reload, real copy/paste, Enter, Undo/Redo, pending input and an injected failure/retry. UX confirmed supplied two-row reference fit and corrected image/menu/Brush keyboard states. Native typing p95 **1.1ms** on18 trusted inputs; first full23-lesson Save **5.06s**, feedback2.3ms, firstRAF9.9ms. Save Long Tasks184–276ms and an editor-entry1016ms task remain. These matching-data timings are not a fresh installed teaching-mutation benchmark.

## Preservation and installed verification

Fresh read-only original backup before.sqlite exactly matched logical receipt **09d24427a13d3f64418b1d11655ad091f70675a0da35e5db08feb03ff00196e1**. A separate reset/reopen rehearsal passed; neither review nor rehearsal database was installed. Original unchanged since backup was checked immediately before shutdown and again before apply. The exact reviewed code was fast-forwarded into the existing checkout;151 raw executable hashes match. Pinned dependencies installed from local npm cache with scripts disabled.

All **23 saved lessons /26,632,089 content bytes**, raw draft metadata, source/private/settings KV, immutable revisions/history, events/sequences, media blobs/aliases and every nonprogress learner field remain exact. Draft content SHA256 **bcf972cf542eae85622b41f8212a4b98cac1515994b2b4db3f3c5493836c09f2**. Only the existing approved new-build behavior reset three fictional profiles once. Native navigation then created one real fictional Author resume. Same-build restart retained **every database row**, including that new progress: receipt **1b528da6feef286d2985ef303ba0f2d96da0e82ce11dee6bddd6a9b2daccea95**.

Installed HTTP verifies81 served assets against reviewed raw hashes, nine existing media URLs/bytes, complete active/draft content and CAS token, and zero readback writes. Nonexecutable notices/types/internal files intentionally remain unmapped404 and are listed in INSTALLED.json. Installed Browser1280×720 verifies actual Jodit4.18.12/758×65 two-row toolbar, retained prose, unique font menu, sidebar next-action names/states, scoped review1selected lesson/22remainingprivate differences, heading focus/Escape return, ordinary saved Preview and post-restart exact build. No teaching text was edited/saved, no comment/image approval submitted, and no Publish confirmation activated on the original store.

## Recovery restriction and remaining limits

**Never downgrade code alone after private image approvals.** Older code can open the same schema10 database despite rejecting newer format2 backup packets. Supported rollback needs the matching pre-update executable3e01c79 AND its backup database; it must refuse if newer saves, approvals or progress would be lost. The read-only rollback preflight verifies the matching backup and now correctly refuses automatic rollback because new progress exists. No database restore or downgrade was performed.

Physical Hebrew IME, narrow/200% zoom, screen reader and touch/mobile remain unverified. Remaining entry/Save Long Tasks, four inherited static heuristic findings and the historical pooled-connection ECONNRESET cause remain documented. Fresh-connection recovery/integrity passed within the stated size/context bound. Guy acceptance is separate and Pending. No actual teaching publication or legacy-draft promotion occurred.

## Artifacts and actual install commands

Before: before-viewport.png and before-workspace.png (older custom UI; viewport clipping retained honestly). After: native-editor.png (full supplied toolbar/canvas), native-controls.png (Save/Preview/Publish entry). guy-reference.png is the supplied reference. One blank selector screenshot is excluded; no screenshots were edited.

Taskroot helpers actually run: node install-classic-update.mjs (fresh backup/rehearsal), guarded verified Stop-Process, git merge --ff-only40864ec, node sync-reviewed-classic.mjs, npm.cmd ci --offline --ignore-scripts --prefix hebleo-editor, node install-classic-update.mjs --apply, start-classic-installed.ps1, node verify-classic-installed.mjs, node install-classic-update.mjs --verify, node check-classic-restart.mjs --capture, guarded same-build restart, node check-classic-restart.mjs, node check-classic-rollback.mjs. See INSTALLED.json for receipts and gates. Original63358 is left running; disposable63484 was stopped.
