# Independent shared cards QA, 3 November 2026

Bounded preservation/integrated-flow PASS at exact `14583746dd507a343e779e1274fb5911fdc55567`. No new shared-card defect reproduced. This is not a full-suite green or installation approval. Lead owns integration/install and ledger reconciliation.

Source inspected: `C:/Users/Trans/.openmausbot/task-workspaces/8c900356-50f6-4d41-bbb9-50c8abe09233/d93ac18d-de54-4035-ad88-9628a2b2e5df/hebleo-shared-cards`, clean at start and final check. Read AGENTS, initial build brief, delivery, adjacent integration contract and Leo SC01–SC06 feature delta. No application source edits or commits; outputs only in this QA directory. No production, WordPress, original63358 reset or installed database writes.

## Full-data evidence

Run `node qa-shared-cards/preserve.mjs` from the QA checkout. Supplied before/with-shared main database files were first staged byte-for-byte here to avoid SQLite sidecar creation in the protected supplied directory. Then read-only VACUUM INTO created separate QA mutation targets. Supplied main files remain byte-identical to those staged copies at final hash comparison. The initial direct read-only attempt against with-shared failed to open because of protected WAL-sidecar access; no escalation or write retry there.

`PRESERVATION.json`: original logical checksum `054a63a167b772f14e34d4dabf1167ec95e45c5bfdbd9cfdf8b34c2851181c67`; every old learner, revision, event, alias, sequence, KV value (except reader marker) and blob exactly retained. 23 lessons / 26,632,089 draft-content bytes. Independent pinned raw/manifest digests matched; all 1,329 imported media bytes hash-match and byte-match the original package; 1,025 notes / 2,050 available directions. No automatic enrollment. Full 88,159,805-byte backup restored into a copy of the approved original lineage; content, draft, all learner fields (explicit resume revision remapping), shared package and every media object matched. Reopen was an exact logical no-op.

`node qa-shared-cards/adversarial.mjs` PASS, `ADVERSARIAL.json`: independent direction scheduling, duplicate rating exact DB no-op, stale expected-card rejection, exact undo; membership=false retains purchased review; course removal denies collection/enrollment/rating. Malformed settings and missing namespace/tampered raw/missing manifest restores reject with exact database no-op. Unapproved phrase form binding rejects without writes. These probes use a separate QA copy, never the Browser database or supplied originals.

## Browser under real app headers

Own `server.mjs` served copied full dataset at63593 with executableIdentity pinned to14583746; no progress-reset function invoked. Browser-only inspection; no host-screen route. Actual collection showed1025 entries, pagination1–25→26–50→1–25, exact-ID search mf-000721 and retained one-entry filter after enrollment. mf-000001 directions enrolled separately; actual review front/reveal/Good traversed each direction. API readback showed one direction repetitions1 while the other remained0. Native Undo returned the schedule; both rated directions persisted across reload. Only these explicit directions plus mf-000721-he-en were added to the Browser copy.

Actual sandbox is `allow-scripts` with regular document resource. Keyboard Tab/Space toggled Nikkud and dark mode; reveal/rating/reload retained dark/true, verified through actual bootstrap and checkbox/switch state. Keyboard replay produced206, range bytes=0-, original14ed89409750e41c60e81569bd5fea6c9284c10fbc4ce1eb63b7f09717a3d7ba.mp3; see `media-requests.jsonl`. This proves request/response, not audible output or pronunciation.

Actual mf-000721 Past opened by keyboard; Present opened independently while Past stayed open and Future/Imperative/Gerund stayed closed. Missing supplied Present forms honestly show “No forms supplied for this entry.” Later keyboard operation also opened Imperative independently. No generated forms were inserted. Desktop light noun screenshot and390px child-frame light/dark verb screenshots saved here. Narrow geometry was simulated by setting the actual iframe width to390px in the mounted Browser, not changing the whole viewport or testing a phone. Table retains horizontal scrolling. The iframe-only screenshot operation returned a blank capture; full-page captures show the real card. Full-page sticky-header position is capture/scroll context, not a new app-layout assertion.

Pointer automation on hidden styled checkbox/switch refs did not reliably change state, and one reported a covering answer section. Keyboard successfully exercised both controls. No pointer defect is asserted without a reliable real-label reproduction.

## Commands/results and failures

- With HEBLEO_SHARED_SOURCE set to Leo's exact shared-vocabulary package: `node --test test/shared-cards.test.js test/shared-card-frame.test.js test/shared-card-renderer.test.js test/demo-build.test.js`:15/15 PASS, no skips. This includes all1025 layouts, malicious fields/settings, import/reimport, overlay CAS, persistence and HTTP ticket/media rejection.
- `node --test` from exact candidate:1186 discovered,1159 pass,20 fail,7 skipped. Shared source env was intentionally not set for this full discovery; focused run above supplies it. See `full-tests.log`. Never report this run as green.
- Failure classification:15 older reminder/feedback cases (3+8+4) reproduce with unchanged40864ec public/app.js supplied through HEBLEO_APP_SOURCE. Two deferred OCT12 audio-speed cases also reproduce; public/media.js has zero diff40864ec→candidate. `baseline-failures.log`:19 selected,2 pass,17 fail. This compares baseline app text with current harness/backend, not a complete baseline checkout.
- One stale served-build test compares against444b9177 and expects63360; actual failure is git diff ENOBUFS due the huge revision delta. It is a frozen harness/build gate, not a shared-card regression.
- Two additional environment failures: curriculum reader-test-results.json write EPERM and nav2333 tmp/navnotes mkdtemp EPERM. No request for broader writes was made; no permission workaround modified supplied checkout.
- Final `npm run check` and combined app/shared/demo focused repeat recorded in syntax.log / focused-tests.log; final terminal receipt records completion counts.

## Limits and next owner

SC01/03/04/05 have bounded automated/full-data-copy evidence; SC02 combines automated all-note parity and selected actual-browser evidence; SC06 source fidelity is retained, with linguistic source issues unchanged. No WordPress acceptance claim. No native phone, whole-app390px viewport, audible listening, pronunciation, installed63358 behavior, CI/main or Guy acceptance verified. No97 phrase recordings or77/78 content correction applied. Lead should carry this evidence into the shared feature ledger and decide integration alongside independent Release Reviewer results. Keep private DBs/media/screenshots/log artifacts out of Git.

Final combined repeat:142/142 PASS,0 fail,0 skipped,38.53s. Final syntax exit0; source checkout remains clean. OS command-line inspection was denied; server shutdown result is reported in the final handoff.
Own QA server session terminated with Ctrl+C; subsequent health request refused (ECONNREFUSED). Only own63593 stopped; original63358 untouched.
