# Narrow independent recheck: installed 73e242e

**RR-FIRST2-01 CLOSED. Preservation PASS for this local installation. Audio remains unfinished.** Reviewed independently on 31 October 2026, Israel time. This closes the parent/item audio-identity collision remaining in the prior abf3cca review; it does not grant production readiness, auditory verification, a new native walkthrough, or Guy acceptance.

Installed code: `73e242e717c630976fd2d040396d4d8d5fcd3127`; runtime SHA-256: `08e689b369f2129b94e6d6d0016c4a0c6dadc4936b680cd30d26b69a20bb2249`; backend SHA-256: `c5f13d8d3e9190bb620874e9a239a454a96d90074dc711ead64aa7f54a38edc1`. Live URL: http://127.0.0.1:63358/ . Content revision 5. Clean candidate evidence HEAD: `5638368e22c93e47a7cd47be55cc1a3ac5415c55`, with documentation/evidence changes only beyond installed code.

Candidate: `C:\Users\Trans\.openmausbot\task-workspaces\8c900356-50f6-4d41-bbb9-50c8abe09233\489864a5-e240-4cef-a6fc-8cc6d0df25fa\hebleo-audio-contract`.
Installation evidence: `C:\Users\Trans\.openmausbot\task-workspaces\8c900356-50f6-4d41-bbb9-50c8abe09233\489864a5-e240-4cef-a6fc-8cc6d0df25fa`.
Review output: `C:\Users\Trans\.openmausbot\task-workspaces\71c71389-5334-4e0c-9ca8-d80dd28223d1\653fb433-7485-48b1-9f7c-cb22711bda02\hebleo-3\tmp\release-first2-audio-73e242e`.

The prior independent report and probe at `tmp/release-first2-contract-abf3cca` were reused. I inspected the actual validator/test diff and recomputed all 113 executable hashes. Compared with the previously verified abf3cca build, 112 are byte-identical; only `public/text-contract.js` changed. The source pack remains byte-identical at SHA-256 `1b9df3021485e37c5c01af7a0eb573a482ba7329c797dc1dad55aaa2e9fb9e3a`. Live `/api/build` equals the computed identity; served validator, text reader and source activity modules match their computed hashes.

## Independent collision and dispatch checks

`media-id-probe.mjs` adapts the original independent failure reproduction to require rejection. It imports the actual candidate validator, schema semantic checks, server, Store and reader, uses in-memory fictional stores and resolvable synthetic audio aliases, and sends mutation requests only to its own disposable server on an ephemeral loopback port.

- Twelve collision variants passed: gallery, matching and self-check, each with no clips, child-only audio, different parent/child audio and collision on the last child.
- Each failed specifically for activity item identity at runtime and in semantic validation, without changing input. Structural JSON Schema alone permits this cross-field relation; the shared semantic validator rejects it.
- All 60 real HTTP requests returned 400 for that identity error: draft save, defensive publication, active restore, historical restore and draft restore for each variant. Every database table, including revision sequence, was unchanged after every refusal.
- Valid audio-bearing save, publish and restore controls all returned 200.
- The real reader dispatched exactly 15 requested URLs across six families: gallery, matching, self-check, letter input, letter choice and application choice. Child IDs reused on distinct pages remain accepted.

The Audio observer records dispatch only; it is not an audition or native playback check. All synthetic media is confined to disposable fixtures.

## Independent preservation delta

All fourteen intended preservation checks are satisfied: thirteen passed in the initial run; the remaining chain comparison passed its corrected narrow recheck. Database content and integrity were inspected directly through read-only connections and copies of completed offline backups. The comparison covers both initial newline-converted installation and final corrected installation, including preflight/before/reset/restore artifacts, the prior accepted reset and the current live database.

| State | Logical database SHA-256 |
|---|---|
| Original retained baseline | `0e5ade4b664aa6cdce3809b50fe12cf6e358f123efd52aebad54db70d1c914a4` |
| Initial actual after = final before | `72340619fc25b0a829dad5b88501fb7d9e58cd612dc851f4e5c03930be435c8a` |
| Final actual after = current live | `11029b482abea7916d414fc0ef15243fe594412b3ed1d32b7f6b3bece529be33` |

For both installations, the saved reset rehearsal differs from the actual installed state solely in `demo-progress-reset-at`. Substituting that one timestamp reproduces the complete actual snapshot and recorded digest; the initial actual after equals the final before exactly.

Schema, all five immutable revision rows, active revision 5, the entire 23-lesson saved draft including 20 legacy drafts, media tables, events, sequence, source state and all nonprogress learner fields are preserved. Exactly the three known fictional profiles are fresh. The original pre-reset backup retains their earlier test progress. Active and draft MEMORY-A2 and MNTL-A2 exactly match the source pack at seven and nine pages. Live lesson/draft GETs match those contents.

Both preflight and installation restore artifacts retain content, historical snapshots, source state, learner and media rows; restored active revision maps to 10 while the installed active revision remains 5. This checks the saved application-restore results directly; it does not claim a new live restore. Every inspected SQLite integrity check passed. All review GETs and the final chain reread left the live logical database digest unchanged. All review-created SQLite copies and sidecars were removed.

## Commands, artifacts and limits

With CANDIDATE, EVIDENCE and OUTPUT set to the paths above, and PREVIOUS set to `C:\Users\Trans\.openmausbot\task-workspaces\8c900356-50f6-4d41-bbb9-50c8abe09233\822918a9-2c59-475e-81af-ded515c61b2b`, these checks actually ran:

```text
node OUTPUT/media-id-probe.mjs CANDIDATE OUTPUT
node OUTPUT/preservation.mjs CANDIDATE EVIDENCE PREVIOUS OUTPUT
node OUTPUT/chain-recheck.mjs CANDIDATE EVIDENCE OUTPUT
git -c safe.directory=CANDIDATE status --porcelain
git -c safe.directory=CANDIDATE diff --check abf3cca1d8b9c3380de2e512f8fca665fa475f41 73e242e717c630976fd2d040396d4d8d5fcd3127
Get-Process -Id 59284
Get-NetTCPConnection -LocalPort 63358 -State Listen
```

Results are retained in `media-id-probe.json/.log`, `preservation.json/.log` and `chain-recheck.json/.log`. The initial preservation run returned exit 1 solely because its deep comparison distinguished SQLite null-prototype row objects from cloned ordinary objects. The failed output is retained. The assertion was corrected to normalize both object representations without changing any data; only the affected two-stage chain was rerun and passed. The corrected full script is available for reproduction but was not rerun wholesale. Two preliminary reads targeted a nonexistent module name and the wrong Git working directory; subsequent checks used the exact candidate and runtime-state implementation.

Process 59284 exists and is Node. Windows denied the listener lookup, so the PID-to-port association is not independently established. Installed identity is verified by HTTP build and module bytes. Configuration/vault/filesystem-media and unrelated-listener preservation remain supported by Lead's installation receipts, not a new independent reread. No full curriculum audit, full malformed matrix, 900-test suite, CI rerun or native walkthrough was performed here. Lead's broader evidence remains separately attributed.

Zero isolated /m/, /n/, /t/, /l/ clips are verified/installed; no synthesis or raw source recordings were installed by this review. Audio completion, native auditory acceptance and Guy acceptance remain open.

Only ignored review artifacts were created. No application/source code, installed state, progress, main branch, external services, WordPress or content/media was mutated. No commit or push was made under this read-only assignment. **Next owner: Lead** should record this independent closure in the shared feature ledger at its existing RR-FIRST2-01 entry and consolidate the result to Leo, retaining the unfinished audio gate.
