# Private main vocabulary installation — 19 October 2026

The main integration combines current main `7a5951e34df7d1dc135e061c82544e07ecce7bec` with UX `b3355148ddcb1bc7e3ea096de2a8986f89cbc0ca`, including its parent `7b09fab` and Lead baseline `3a531e7`. Main's two unique curriculum-plan commits and CR01–CR08 checklist rows are retained. The lexical model, capture guards, source trust and 42 scoped lesson settings remain the consolidated implementation. This integration grants no source, identity, display or curriculum approvals.

The designated main working demo is the Lead-owned `http://127.0.0.1:63358/`. Its existing `data/lexical-private-demo.sqlite`, media root `tmp/lexical-demo-media`, optional `.env`, uploads and application vault stay in the previous Lead consolidated checkout. The new main executable checkout uses explicit absolute paths to that state. Port 63359 remains UX Owner's disposable visual comparison. No visual fixture is installed into main.

For this installation Guy's current preservation requirement overrides the older fresh-fictional-progress rule. Do not use `npm start`, the lexical fixture launcher, `--demo-fresh-progress` or `HEBLEO_DEMO_FRESH_PROGRESS=1` for this process. Do not reset, restore over, initialize, replay fixtures or publish pending content.

## Reversible owner procedure

1. Fetch current private branches, integrate while retaining newer main changes, install locked dependencies, and run `npm run verify:candidate`, `npm --prefix schemas test` and the supplied-capture validation/resolver checks. The candidate runner's audio filename/name exclusions remain explicit; this is not unrestricted audio acceptance.
2. Verify the existing listener's PID and command against the designated Lead runtime. Save a consistent SQLite backup, raw state-file backups, optional configuration/vault and media copies in a private, untracked installation directory. Record complete database table/schema hashes and state-file inventory hashes without record contents. Retain the old executable checkout for rollback.
3. Stop only the verified port-63358 process. Recheck the offline backup and current state, then launch the exact clean main revision with the preservation launcher:

```powershell
node --env-file-if-exists='<old-state-root>/.env' scripts/start-preserved-demo.mjs --revision '<exact-main-SHA>' --database '<old-state-root>/data/lexical-private-demo.sqlite' --media-root '<old-state-root>/tmp/lexical-demo-media' --vault-path '<old-state-root>/.private/google-auth.bin' --port 63358
```

The launcher requires existing schema/content/profiles, refuses schema migration and fixture replay, and compares every persistent table before/after Store/server startup. It never invokes the fresh-progress reset. Its `/api/build` response pins the startup revision and executable file SHA-256 manifest; the launcher refuses a mismatching revision or dirty tracked executable tree. Existing launch paths omit this optional endpoint.

4. Verify listener ownership, `/api/health`, `/api/build`, all served application module/style bytes against main, and read-only bootstrap/lexical/author APIs. Compare database table/schema hashes, retained file inventories, draft token, revisions, lesson settings and approvals with the backup. Restore the backup into a separate disposable Store to check recoverability; never rehearse restore against the working database.
5. Ordinary-push main, verify remote SHA and record actual commands/results, backup paths and runtime receipts outside Git. If returning to the old executable, stop only this verified process and run the preservation launcher with its old modules and the same explicit state paths. Do not use the old resetting fixture launcher for rollback.

## Acceptance remains open

The working data retain pending captured workbook content and three labelled nonlinguistic lexical fixtures. Pending imported forms remain unavailable to learners. Main therefore supports bounded synthetic interaction review and Studio draft inspection; it does not provide the UX comparison server's 16 source-backed visual examples. Native visual/geometry/keyboard review, Guy acceptance, source review/freshness, production, audio-speed/quality and physical-mobile/APK acceptance remain separate and open. Historical independent integrity QA applies to unchanged guards; no new independent review is claimed.
