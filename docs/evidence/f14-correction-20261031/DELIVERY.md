# Author correction installed — 31 October 2026

The four assigned corrections are installed at **http://127.0.0.1:63358/**. Running executable **0e874af56765ce16b929b1aa55974f121a86f8c3**, runtime SHA-256 **524058a51ac9600a294e6642d5eefa1e8e76538287e0a4bb0c5ff859388d190a**, backend **1a2c09e61d8c5c2c5dae553655b800a5ab2ed8f330f81c7d196721716ce583c2**, current PID **74716**, content revision **6**, Store reader **10**. Branch: `fix/first2-combined-20261031`. Subsequent evidence commits change documentation only; they do not change the reviewed executable bytes. No main merge or publication occurred.

This closes the four bounded correction gates. It does not turn the earlier fourteen-item report into general native/device or Guy acceptance.

## Corrections and independent verdicts

| Finding | Delivered behavior | Independent evidence |
|---|---|---|
| QA-F14-STATE-01 | Every successful shared save acknowledges exactly its submitted collector buffers. Departure/Studio saves retire stale inline values; newer pending edits, failed/conflicting saves and unsent comments remain. Full-workspace CAS stays authoritative. | QA CLOSED on exact0e874af. Original departure Save A → Studio Save B → inline reentry → unchanged Save retains B. Durable HTTP/on-disk conflict and reopening passed. |
| QA-F14-META-02 | Reconciliation reads and defines own JSON properties safely, retaining nested reserved names, deletion/null/array semantics and normal object prototypes. | QA CLOSED through actual merge/Store persistence and reopening. Existing strict HTTP parser still rejects reserved keys with400 atomically; this is not a promise of HTTP import acceptance. |
| Rendered editing / #14 | Heading, paragraph and verified list leaves edit in their displayed layout. Contextual Bold/Italic; primary Save; secondary saved Preview; Review changes opens separate review. Raw source/technical context is collapsed under Advanced source. Only edited source ranges change; untouched mixed HTML/Markdown and CRLF remain. | Independent UX bounded desktop PASS1280×720: heading, paragraph and list insertion → Save → ordinary Preview; bold and three list items retained. Private persisted quote/block context readable, AuthorGET200 and learner403. Lead separately created native quote/block notes on disposable data and verified exact full-draft readback. |
| Preview dock / #13 | Returning page6 → Back →5 reveals the optional summary above the fixed dock; focused summary/input clear it, while comparison remains on the same page and Continue stays independent. | Independent UX and narrow installed native PASS: pointer, Tab/Shift+Tab, Space and retained input0704. Summary bottom436.28125px and input bottom363.453125px both above dock top635.609375px. |

Implementation commits: **4104fb35e577b974d76dc9b73bc438e2e28fd734** (shared acknowledgment/metadata), **699e9951202e6368647ce77dbba7cfb895579810** (rendered source/dock), **0e874af56765ce16b929b1aa55974f121a86f8c3** (reviewed executable checkout plus owner evidence).

Runtime files: `public/studio/workspace.js`; `public/author/inline-author.js`, `rendered-source.js`, `author.css`; `public/exercise-actions.js`, `source-activities.js`; static helper allowlist in `src/server.js`. Permanent meaningful regressions are in `test/app.test.js`, `test/workspace-save-regression.test.js`, `test/rendered-author.test.js`, with existing author/dock/server suites retained. Source pack, Store/recovery, author-review and immutable-context owners remain unchanged from the accepted recovery candidate.

## Verification actually performed

- Original independent harness on baseline: **2 pass /2 fail**. Same assertions after corrections: **4/4 pass**. Lead added the original departure roundtrip permanently.
- Feature configured candidate: **963 passed**. Lead integrated `npm run verify:candidate`: **962 passed +1 sandbox EPERM before a disposable-file test could run**; that exact `test/nav2333-persistence.test.js` rerun with filesystem access passed **1/1**. Candidate runner retains existing audio filename/name exclusions; no unrestricted full-suite claim.
- Lead `npm test --prefix schemas`: **27 passed**; `node schemas/tools/runtime-check.mjs --runtime .`: **9 passed** on integrated0e874af; `node schemas/tools/validate.mjs --seed --runtime .`: structure/semantics/stage accepted and input unchanged.
- Independent QA unchanged original harness plus durable disk/HTTP probe **5/5**, focused **33/33**, actual-app focused **20/20**; all125 executable files byte-exact. Suites overlap and are not unique-count totals.
- Independent UX **43 focused passed**, then completed the missing native workflow after initial Browser transport failures. The earlier partial report remains retained separately. Native source edits/comments were labelled synthetic and confined to disposable copies.
- Private remote was verified as `guylfe/hebleo-3.0`, PRIVATE, ADMIN access. Remote branch readback matched0e874af. CI **41223297142 SUCCESS**: https://github.com/guylfe/hebleo-3.0/actions/runs/41223297142 . Final evidence-only checkpoint CI is recorded separately after push.
- Strict UI audit executed: three findings identical to baseline in untouched legacy lesson-editor/media-picker files. Actual delegated handlers are present. No new changed-file finding; **no clean strict-audit claim**. No separate production build/typecheck/formatter is configured. Installed skill contains no standalone DESIGN lint script.
- `git diff --check` passed. No source/draft publication, WordPress, production, curriculum rewrite or fabricated audio.

The accepted full-data recovery evidence was reused because those paths were unchanged: six complete full-workspace save/comment cycles, stable85,510,917-byte recoveries, legacy compaction, private historical contexts/media/learner preservation, atomic malformed/conflict rejection. The approximately25-minute harness was not rerun. See the prior `first2-combined-20261031/independent-review/` receipt.

## Preservation and installation

This was a **code-only replacement on the original demo database**, not a copied candidate installation. A fresh consistent read-only snapshot was rehearsed first; the original still matched its expected receipt immediately before applying. Both actual QA and bounded native UX reports were checked. Exact previous PID27368 and port63358 were verified before stopping it. The original database then received only the existing authorized fictional-progress reset/build marker. No active revision, teaching field, draft, private comment or source metadata was rewritten.

- Before database SHA: `02193ef66d2bc559bce3023b1f982aad4c912ed21a92ebd5f24035d1094b7af8`.
- Installed before native use: `3508a80770f511a73b167669b8712d4d0511d21016bdb4df4282c9667584d8dc`.
- All **23 draft lessons**, all **six revision rows**, SQLite sequence, MNTL, other teaching/source metadata, **20 legacy drafts/154 pages**, **five media blobs/four aliases**, events, settings, private review/context and all nonprogress learner fields remain exact.
- Three fictional profiles reset once under the standing update policy. Original raw progress is retained in the private before-backup. No reset of subsequent same-build progress occurred.
- Readback verified all **125 manifest entries**, **18 served assets** including the new rendered helper, **four image hashes**, exact canonical first-two lessons, full saved draft, reader10/content6, AuthorGET200/learner403 and **zero synthetic private comments** installed. Startup and GET readback changed no row.
- Narrow installed Browser check confirmed original unsynthetic heading/prose/list, editable surfaces, collapsed source, saved Preview and page6Back5 dock/input/keyboard behavior. No live teaching save/comment was submitted. Rehearsal responses were temporary.
- Genuine normal Sam navigation advanced to page2; Alex remained fresh. Same-build restart **74200 →74716** retained **every table and SQLite sequence exactly**, including Sam's nonempty native position. Before/after SHA: `4b7b39c070a8902b77b76a5b1b7af20c9b76f02d670c45e6cd26d066beeadfcb`.

Original database:
`C:\Users\Trans\.openmausbot\task-workspaces\8c900356-50f6-4d41-bbb9-50c8abe09233\b1d5e7a0-1d13-4e9e-b544-06d3b889fb9e\hebleo-consolidated\data\lexical-private-demo.sqlite`

Private backup and exact compatible old executable:
`C:\Users\Trans\.openmausbot\task-workspaces\8c900356-50f6-4d41-bbb9-50c8abe09233\4d4e36bc-67d1-4c07-bcfb-e381d246b0b3\installed-code-correction-20261031\before.sqlite`
and sibling `rollback-runtime-8f4`. All123 old manifest files were reconstructed and verified against runtime3105779f…/revision8f4de67, paired with reader10 data. Retain both; do not downgrade a reader10 database to older reader8/9 code or overwrite newer work with an old backup. No database, credentials or learner rows are committed.

Repeatable restart adapter: sibling `start-installed.ps1` in this task folder, after stopping only the verified installed process. It checks port ownership and all reviewed executable hashes, then uses the current documentation-compatible checkout revision with the existing environment/media/sign-in storage paths. It refuses changed executable bytes and duplicate listeners. The prior optional `.env` path remains absent, as before; no new credential/configuration integration is claimed. Server startup remains preservation mode.

Executed installation/readback helpers in this task folder: `node install-code-correction.mjs` (rehearsal), `node verify-rollback.mjs`, verified-process stop, `node install-code-correction.mjs --apply`, `start-installed.ps1`, `node verify-installed.mjs`, native walkthrough, `node verify-restart.mjs`, same-build restart, `node verify-restart.mjs --after`. Initial rollback reconstruction exposed mixed Windows line endings; exact unchanged checkout bytes matched the old manifest. An initial postrestart probe preceded server readiness and returned connection refused; startup log and subsequent complete readback passed. Neither attempt is counted as a pass.

## Remaining limits and next handoff

- Nonblocking **comment-state freshness**: after a source save, existing labels can remain current until Reload comments refreshes them to changed. Historical source context stays intact. Tracked separately; no silent reanchoring established.
- Verified leaf editing covers existing headings/paragraphs/simple lists. Complex/unverified structures, nested Markdown/task lists and blockquotes use Advanced source; structural add/reorder remains Studio. This is not whole-block creation support.
- Reserved JSON names preserve through merge/Store but remain rejected by the unchanged strict HTTP parser with400 and no writes.
- Independent UX inspected persisted quote/block context; fresh native quote creation was Lead/Feature evidence plus independent automated server tests, not that UX run's fresh-create pass.
- Narrow layouts,200%zoom, physical touch/APK, screen reader, OS clipboard, and broader native/device acceptance remain unverified. Four human isolated consonant recordings remain missing. Guy acceptance is pending.

Leo owns consolidation and Guy's next acceptance pass on the installed demo. No further permission or human input is needed for this completed correction. No related automations exist. Synthetic review copies must never be installed.
