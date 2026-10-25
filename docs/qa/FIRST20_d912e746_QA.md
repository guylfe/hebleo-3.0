# Independent first20 QA — frozen d912e746

Reviewed executable: `d912e746d43efc399c1972ce2c7da043e2fc8da0`, `feat/native-first20-20261025`, 25 October 2026. QA branch: `qa/native-first20-d912e746`. The QA commit adds tests and evidence only; no application implementation changed.

**Verdict: hold installation for QA-TXT-01 correction or an explicit documented gate-scope decision.** Two P2 findings are nonblocking for the specifically preservation-only, unpublished-draft installation. Native/Guy acceptance remains pending. No P0/P1 data-loss defect was reproduced in these bounded checks.

Checkout: `C:\Users\Trans\.openmausbot\task-workspaces\71c71389-5334-4e0c-9ca8-d80dd28223d1\653fb433-7485-48b1-9f7c-cb22711bda02\hebleo-3\qa-native-first20-d912e746`.

## Reproducible findings

| ID | Severity / disposition | Actual result and implication | Implementation / regression |
| --- | --- | --- | --- |
| QA-TXT-01 | P2; blocking requested end-to-end gates | On a synthetic published text-only lesson containing a required choice and required written recall, inner Continue is disabled. Clicking the simultaneously enabled outer Continue sends real HTTP progress with `step: complete`; the learner is marked complete without any page response. Preview's outer Continue also calls `next` before commitment. Page gates therefore constrain only inner pagination. | `public/app.js:222`, `public/app.js:495`, `src/store.js:353`; `public/preview/learner-renderer.js:142`, `:235`. Two regressions at `test/qa-first20-independent.test.js:124` and `:131`. |
| QA-TXT-02 | P2; nonblocking for preservation-only installation | Save a self-check response with `revealed:true`, then call the normal fresh-build reset on the synthetic Store. Completion/attempt/card/resume state resets, but text-page responses and revealed models remain. This contradicts AGENTS' normal fresh-progress startup rule. The intended installation explicitly avoids that reset, so this is not a request to reset the live demo. | `src/store.js:223`–`:227`; regression at `test/qa-first20-independent.test.js:137`. |
| QA-TXT-03 | P2; nonblocking draft-import integrity gap | Change only incoming prerequisite prose so MEMORY requires MNT and MNT requires MEMORY. The adapter creates both immutable prerequisite links, accepts `ready-unpublished`, and stages the cycle. Existing validation rejects missing/self/duplicate references but does not detect multi-lesson cycles. No traversal hang was observed; these references currently serve as metadata. | `src/text-import.js:65`–`:67`, `public/content-identity.js:12`; regression at `test/qa-first20-independent.test.js:142`. |

Minimal commands from the QA checkout:

```powershell
node --test --test-name-pattern=QA-TXT-01 test/qa-first20-independent.test.js
node --test --test-name-pattern=QA-TXT-02 test/qa-first20-independent.test.js
node --test --test-name-pattern=QA-TXT-03 test/qa-first20-independent.test.js
```

The first command has two failing regressions; each remaining command has one. The combined independent file reports **5 pass / 4 fail**, with exactly these four assertions failing. These are desired-behavior regressions, deliberately failing on the frozen candidate, not proposed tests. The gate finding uses actual application code with actual ephemeral HTTP projection/persistence; Preview is separately mounted. JSDOM events establish DOM/callback behavior, not native rendered interaction.

The product contract explicitly keeps page progress separate from outer completion. QA-TXT-01 identifies the resulting gate bypass; it does not propose converting self-checks to exact-match grades or locking arbitrary course navigation. Lead should align the outer Continue/Finish behavior with the author-selected gates, or record an explicit decision that the gates apply only inside the reader. The imported pack remains unpublished, so no real first20 teaching was released to demonstrate this defect.

## Checks actually run

| Command / action | Result | Evidence scope |
| --- | --- | --- |
| `npm ci --offline --ignore-scripts` | 49 packages installed; exit 0 | Frozen lockfile, no dependency changes |
| `npm ci --offline --ignore-scripts --prefix schemas` | 5 packages installed; exit 0 | Existing schema toolchain |
| `npm run verify:candidate` before adding QA tests | **816 pass, 0 fail**, exit 0; includes syntax checks | Existing runner's audio filename and audio/speed/playback test-name exclusions retained. No excluded audio-quality claim. |
| `npm test --prefix schemas` | **27 pass**, exit 0 | Structural/semantic schemas |
| `npm run runtime --prefix schemas -- --runtime ..` | **9 pass**, exit 0 | Real ephemeral HTTP contracts, exact candidate SHA printed |
| `node --test test/qa-first20-independent.test.js` | **9 tests: 5 pass / 4 fail**, exit 1 | Independent positives plus three findings above |
| `node --test --test-name-pattern='QA positive' test/qa-first20-independent.test.js` | **5 pass / 0 fail**, exit 0 | Independently authored positive controls |
| `node --test --test-name-pattern='delayed GET' test/qa-first20-independent.test.js` | **1 pass**, exit 0 | Overlaps the five positives; not additive |
| `git -c core.longpaths=true diff --check` | Exit 0 | QA whitespace check |
| Mounted `list_apps`, `list_windows`, then `get_browser_state` for Edge PID 14752/window 918606 | `refused (browser_consent_required)` | No navigation/input, foreground escalation, alternate profile, or browser automation bypass |
| Read-only `GET http://127.0.0.1:63358/api/build` | `ba3ad389a6af9807f8eb90e7c34b8723cb1ffc80`, preservation mode true | Existing demo is old code, not an installed first20 candidate |

The existing full candidate run includes the integrated reader/editor/import-workflow, real HTTP app reload, legacy flow and preservation tests. It is our run, not a reuse of Lead's count. The independent tests add:

- Production import adapter traversal of all **154** pages, explicit choice commitment, written model gating, exact string `0704177609112001`, 9999ms visibility / 10000ms removal, stale callback refusal after hidden-tab cancellation, and the untimed path. The existing candidate tests separately cover replay, navigation/unmount and Studio editing. No prototype-only adapter was used for our traversal.
- Exact HTTP projection and separately keyed responses; two fictional profiles; changed page/model under a new revision drops the old response; stale unresumed revisions and refunded access refuse writes. Forged reveal, timer fields and incompatible response types leave every SQLite table unchanged.
- Actual learner delayed GET and POST while switching Alex to Sam. A late Alex save updates Alex only; Sam's DOM/response remains intact; a fresh app reload restores Alex's Hebrew response. Device media and browser vendor imports are explicitly adapted in the JSDOM harness.
- An additive real pack import: **20 lessons / 154 pages / 127 retained draft targets / 127 unresolved mappings**, no canonical words added, sources/stages and exact target records retained, pre-existing synthetic state retained. Two lesson and two page reorders, SQLite close/reopen, idempotent import, and two successive backup/restore cycles retain draft content and learner state, allowing the documented restore revision remapping.
- Unknown/ambiguous canonical aliases, explicit existing mapping, readable-ID collision, stale draft CAS and duplicate page IDs refuse or require review without changing any table. Publication and changed-source reimport refuse atomically. The baseline integration tests also exercise imported HTML sanitation.

Counts overlap and must not be added into a claim of total independent coverage. Initial test-harness failures (invalid assignment syntax, omitted required synthetic duration, expected restore revision remapping, and JSDOM history event delivery) were corrected before the final results. Earlier logs remain in local `qa-evidence/`; they are not product findings.

## Preservation and acceptance limits

All writes were to this QA clone, in-memory synthetic Stores or uniquely named temporary synthetic SQLite files. All listening test servers bound `127.0.0.1` on an OS-selected port and were closed. No live demo reset, seed, stage, publish, source update, entitlement change, installation or production request was made. The only request to 63358 was read-only build identity. No WordPress/Sheets action was attempted.

`docs/evidence/first20-20261025/OWNER_PREFLIGHT.json` was read. Its claimed preservation of owner data, configuration and media is owner evidence, not an independent run against the owner's database. Our synthetic recovery/import checks passed; the actual installation backup/apply/restart and post-install data comparison remain Lead's work. No private owner backup or learner record is committed here.

All **127** default canonical mappings are deliberately unresolved. The current native reader shows pending-mapping notices rather than those target vocabulary cards; no learned-form eligibility, native audio or vocabulary completeness is inferred. Human wording, Nikkud, introduced-letter mapping and recording-level fidelity remain open. The 404-ID/114-lesson planning route and rejected Sheets update are not evidence of all-source live ID migration. This candidate adds aliases for the imported native draft identities while preserving persisted keys/source locators.

Native RTL/Nikkud geometry, narrow-screen rendering, 200% zoom, actual keyboard/radio behavior, touch, screen-reader output and Guy's teaching/UX acceptance were not verified. No native/Guy Pass/Fail was assigned. Original feature evidence and a passing JSDOM test do not close these gates.

## Handoff

Lead owns QA-TXT-01 correction or explicit disposition, QA-TXT-02/03 triage, the shared ledger update for TXT-01/TXT-02/ID-01, then a newly frozen executable for exact-candidate recheck. The QA branch is a cherry-pickable regression/report commit, not an implementation fix. Run the regression file after correction and preserve the four previously passing controls plus the profile-switch control. Lead retains responsibility for preservation installation and actual learner/Preview destination verification. Browser-profile consent and Guy acceptance remain pending.

Machine-readable run evidence and committed final logs are beside this report under `../evidence/qa-first20-d912e746/`. Local raw logs are under `qa-evidence/` in the QA checkout.
