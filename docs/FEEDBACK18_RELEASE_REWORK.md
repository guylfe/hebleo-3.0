# Release correction candidate — 2026-10-08

Base f150aef45ba4d90babc4a1a1a6469965388cf58d, branch lead/feedback18-studio, isolated Lead checkout C:/Users/Trans/.openmausbot/workspaces/8c900356-50f6-4d41-bbb9-50c8abe09233/feedback18-candidate. The bounded independent QA pass and Release HOLD apply only to that base. The independent closure recorded below now passes at b3445bd; Chief acceptance remains pending. Demo4173, main, protected runtimes and authored user data were not edited or reset. No canonical curriculum, live integration, APK, production or Guy-acceptance claim.

## Corrections

- RR-F18-01: Store.publicWord is the common learner projection for content, session, rehearsal and due-card words. It removes author-only importSource on a cloned word. Author content, Stage and backup retain the raw record. Learner-content schema explicitly forbids the property.
- RR-F18-02/03: Store.validateProgress resolves the question list once after validating canonical practice ownership and component kind. Both check and apply use it for bounds, terminal input, matching, ordering tokens and receipt identity. The same validation runs before restore writes, including legacy check/apply cursors without a component ID. Correct check-only or mixed-role typing/subset/reordered practice receipts survive pinned reload and remapped restore; an unrelated real grade is refused atomically. Exercises are not cloned and completion still counts canonical IDs once.
- RR-F18-04: shared validateColumnMapping and validateImportSource enforce version 1, bounded unique nonblank headers, corresponding exact string values, unique column indices/targets/style destinations, supported destinations and decoders, required identity/form/meaning mapping, decoded tags/formatting/styles, and reserved-key limits. No source string is coerced or repaired. Raw provenance is validated separately from later authored edits. Existing unknown source fields and opaque legacy tags remain preserved. The structural vocabulary-import schema and shared semantic check align the server gate. Stage, Publish, rollback and all carried active/pinned/WIP restore content use validateContent before writes.

## Actual owner verification

Evidence is docs/evidence/feedback18-release-rework. Node process execution ran locally, with windowsHide and no browser automation outside the mounted surface. The default shell runner failed before execution; ordinary node_repl file/process tools worked. The authenticated GitHub privacy check used the normal reviewed shell fallback and returned isPrivate=true; no rejection remains unresolved.

- node --test test/feedback18-release-regression.test.js at unchanged f150aef: 7 checks, 6 failed, 1 positive preservation control passed (parent-regressions.txt). This is an actual pre-fix run, not a proposed control.
- Focused Store/HTTP/mapping/progress command: 29/29 pass (focused.txt).
- Focused RR-F18 real-app + HTTP command: 9/9 pass (app-http-focused.txt). One initial app assertion checked before render finished; awaiting both saved receipt and feedback resolved it. No source change was needed for that timing assertion.
- npm run verify through the installed npm CLI: 246/246 pass, no failures/cancellations/skips (verify.txt). Final source changes are included in this run.
- In schemas: node --test checks/contracts.check.mjs: 18/18 pass (schema-checks.txt).
- In schemas: node tools/runtime-check.mjs --runtime <Leadcandidate>: 9/9 actual HTTP/Store checks pass (schema-runtime.txt).
- In schemas: node tools/validate.mjs --seed --runtime <Leadcandidate> --summary: no structural/semantic errors; input unchanged; synthetic pack private-demo eligible and canonical-ineligible (schema-seed.txt).

No dependency or lockfile change, so prior clean installs remain historical install evidence. Schema-runtime records the base HEAD f150aef because verification preceded the correction commit; the staged source SHA256 inventory binds the actual tested working tree. The new commit records that exact source tree.

Mounted built-in Browser owner fixture: fresh fictional :memory: Store on loopback 53432. Native Practice more opens only ex-1-type under legacy-check; fill the existing seed's unpointed answer, click Check answer, then Control+r. Correct feedback and receipt exercise identity persist. Bounded bootstrap observations show due and content importSource absent; author source is retained. All table counts/hashes match before/after reload. browser-summary.json contains no raw rows; browser-fixture.mjs is reproducible and never opens a user DB. Its child process was stopped with SIGTERM. Initial separate Browser snapshot read about:blank; navigation was re-established and a fresh snapshot verified before actions, so the blank snapshot is not success evidence.

## Independent results and remaining gates

Reviewed actual artifacts:

- QA base report: C:/Users/Trans/.openmausbot/workspaces/df3d19e5-dedf-4129-9d7a-5b08ffaa6bd9/feedback18-qa-evidence/QA_REPORT.md. Independent 235/235 app, 16/16 schema, 9/9 HTTP/Store, bounded Browser findings; FB07 Partial. It did not find the later Release probes.
- Release base report: C:/Users/Trans/.openmausbot/workspaces/6fce93a9-6bf0-4d8d-ad11-edd2d2a11700/feedback18-release-evidence/RELEASE_REVIEW.md. Independent HOLD for RR-F18-01, 02/03 and 04 despite passing suites. Migration, old-binary refusal and historical grading tests passed in that review; those are still base evidence.

Both corrected-candidate assignments completed and their actual reports/transcripts were inspected. Release reran the original probes with corrected HTTP expectations; QA performed the bounded current Browser recheck. The current independent results below close those boundaries. Chief review, pre-update demo backup/guide and actual revised-demo verification remain pending. Guy acceptance stays Retest pending. Native pointer drag remains unverified; accessible move controls and dispatched events do not count. Mobile/touch remains Deferred until APK. The earlier B24 focus-cycle limitation stays open.


## Independent correction closure — 2026-10-08

Executable/source artifact: b3445bd191d1766c42ddaeddccf802022c2467d2. Lead inspected both actual reports and saved transcripts. [Chief gate handoff and revised-demo guide](FEEDBACK18_CHIEF_GATE.md) preserves the evidence paths and exact scope.

Release independently closes RR-F18-01, RR-F18-02/03 and RR-F18-04: 246 application, 18 schema, 9 HTTP/Store, 12 original/compatibility and 8 additional boundary checks. Invalid operations compare every table; good source, pinned content and receipts remain intact. Its 22-file inventory audit records working-file/committed/tested hashes separately and explains LF/CRLF differences.

QA independently passes the corrected practice/save/reload/restore, learner-word filtering and mapped-import Review/Stage/409 retention boundaries: 246 application on unchanged rerun, 18 schema, 9 HTTP/Store, 12 focused and 4 independent HTTP scenarios. The first full run was 245/246; its Start/Continue timing failure and the successful rerun are both retained. The earlier f150aef whole-18 Browser evidence stays historical; this was a changed-boundary recheck. Counts overlap and are not additive.

Lead subsequently tightened only the Start/Continue test wait to require the rendered lesson before navigating and the settled Continue label afterward. Actual owner `node --test test/app.test.js` passes 30/30; the installed npm CLI `run verify` passes 246/246. No application, contract, dependency or runtime source changed from b3445bd. This test-reliability correction has owner verification; independent Chief review of the overlay remains pending. Original QA failure is not erased. Evidence: docs/evidence/feedback18-independent-closure.

Chief acceptance and the backed-up revised-demo update remain pending. Demo4173/main/protected runtimes and user data are untouched. FB07 native pointer drag remains unverified; B24 and existing low status/focus/toast findings remain open; mobile/touch/APK Deferred; Guy cells remain Retest pending. No canonical curriculum, live import, production or launch acceptance.
