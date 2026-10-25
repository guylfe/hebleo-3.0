# Independent release review — first20, 25 October 2026

**Recommendation: BLOCK candidate d912e746d43efc399c1972ce2c7da043e2fc8da0 for installation/release until RR-TXT-01 is corrected and independently rechecked.** The ordinary unpublished-import and preservation paths pass; the author backup/restore path can bypass the new publication gate. This is a local demo review, not production launch approval.

Reviewed checkout: `C:\Users\Trans\.openmausbot\task-workspaces\71c71389-5334-4e0c-9ca8-d80dd28223d1\653fb433-7485-48b1-9f7c-cb22711bda02\hebleo-3\release-first20-d912e746`.

The checkout was cloned with `git clone --no-hardlinks --no-checkout` from the assigned Lead clone, then detached at the exact SHA. Windows initially omitted one unrelated historical evidence file due to path length; `git config core.longpaths true` and `git restore --source HEAD -- docs/evidence/2026-10-06-qa-ee9-g4-01-recognition-distractors/fingerprints/4319-after-whitespace-refused.json` restored it. Tracked files are unchanged; `git diff --check` and `git diff --quiet HEAD` pass. No source fix, main-branch change, remote write, installation, production change or original-database mutation was performed. Private remote publication was not independently reverified.

Executable identity independently computed using `executableIdentity`:

| Identity | Value |
|---|---|
| Commit | `d912e746d43efc399c1972ce2c7da043e2fc8da0` |
| Runtime SHA-256 | `23e33b491701d1d0312352cfbb693c37b3a89e2dd088e17a8300106753430d0f` |
| Backend SHA-256 | `71fbba234f786e2d0fcf4725b4d6ce3e873b8f7e38c7977bfffa3c2a778bd7d6` |
| Tracked executable files | 110 |

## Blocking finding RR-TXT-01 — restored drafts can lose the publication guard

**Severity: P1, release/data-integrity gate.** This is an author-only backup-import defect, not an unauthenticated remote exploit.

Code locations: `src/store.js:64`, `src/store.js:601`, `src/store.js:661`, `src/store.js:666`, `src/store.js:670`; the identity transition guard used by ordinary staging is at `src/store.js:517` and `public/content-identity.js:26`.

Reproduction on an in-memory synthetic demo using actual loopback author HTTP endpoints:

1. POST the exact supplied pack to `/api/studio/text/import`. All 20 lessons are staged as adapted drafts.
2. POST `/api/studio/publish`: correctly returns HTTP 409 / `TEXT_DRAFT_REVIEW_REQUIRED`.
3. Export the backup. In `backup.draft.content.lessons`, remove only `draftImport` and `publicationStatus` from the 20 imported lessons. Leave `provenance.kind: adapted-draft`, `provenance.approval: pending`, all source/adaptation metadata, all teaching and all 127 unresolved targets unchanged. No approval is fabricated.
4. POST the modified backup to `/api/restore`: returns HTTP 200. Draft restore calls structural validation but does not enforce consistency with known import identity or the pending review semantics.
5. Publish the restored draft with its returned base/token: returns HTTP 200. The active snapshot now contains all **20 pending-approval adapted lessons and 127 unresolved targets**.

`validateContent` checks pending object approvals only for a verified-source envelope. The synthetic envelope is deliberately retained by the first20 adapter, so its content still passes validation after the two markers disappear. The publication gate checks only those markers. Ordinary stage prevents removing the immutable import identity, but restoring a draft bypasses that transition check.

Evidence and runnable commands in this checkout:

- `node release-publication-bypass.mjs`: HTTP reproduction, asserts the incorrect 409 → restore 200 → publish 200 behavior; result is `release-publication-bypass.json`. It exits 0 when the defect is reproduced.
- `node release-independent-probes.mjs`: seven independent integrity probes; six pass and the regression that requires publication refusal fails. Results are in `release-independent-probes.json`. It exits 1 for this release blocker.

Practical correction: centralize text publication eligibility and use it for publish, active/historical restore and any release-activation path. Pending adapted provenance, unresolved target/review metadata, and imported identity must remain publication-ineligible independently of two removable flags. Validate restored draft import metadata against retained known identity/provenance; a malformed imported draft must be refused atomically or retained unambiguously as unpublished. Do not create an approval waiver or simply relabel the envelope as synthetic. Add the HTTP reproduction as a regression, including direct active/historical restore with the same marker stripping. Preserve valid unpublished backup recovery and known source approvals.

## Independent evidence that passed

The actual identity/import/store/schema/server/media/reader/editor code was reviewed against AGENTS, INITIAL_BUILD_BRIEF, the relevant MASTER_SPEC requirements, the full first20 ENGINEERING_BRIEF and README, FIRST20_NATIVE_CONTRACT, FIRST20_NATIVE_DELIVERY and OWNER_PREFLIGHT (the latter is at `docs/evidence/first20-20261025/OWNER_PREFLIGHT.json`). Another agent's test summary was not used as proof.

| Check actually run | Result |
|---|---|
| `npm.cmd ci --offline --ignore-scripts` | Passed, pinned root dependencies installed |
| `npm.cmd run verify:candidate` | Syntax check passed; 788 tests passed, three test files initially could not load missing `schemas/node_modules/ajv` |
| `npm.cmd ci --offline --ignore-scripts --prefix schemas` | Passed; corrected review-environment setup |
| `node --test '--test-skip-pattern=[Aa]udio\|[Ss]peed\|[Pp]layback' test/feedback14-refinements.test.js test/text-integration.test.js test/ux14-result-regressions.test.js` | All 28 tests in the three affected files passed after dependency setup. Together with the unchanged 788 this covers 816 candidate test cases; no unresolved supplied-suite failure. The full candidate command was not rerun |
| `npm.cmd test --prefix schemas` | 27 passed |
| `npm.cmd run runtime --prefix schemas -- --runtime ..` | Nine ephemeral loopback HTTP contract scenarios passed |
| `node scripts/prepare-text-install.mjs --database <exact owner database below> --output .private/release-first20-preflight --pack docs/curriculum/first20-20261025/content.json` | Read-only original, online backup, copy migration/import/recovery and protected-table conservation passed |
| Independent probes | CAS stale token/changed mapping/unknown canonical target refuse with every table unchanged; all 154 page source/provenance records and 127 target records retained; as-is active/historical adapted restore refused atomically; exact repeat retains edited teaching/order with zero table writes; owner digest unchanged; blank-store real-source restore refused atomically |

The supplied tests independently executed here cover two lesson/two page reorders, reopening, two response recovery cycles, revision remapping, immutable page references, alias collisions/ambiguity, explicit mapping, malformed references, safe imported HTML, separate response storage, entitlement checks, and actual HTTP projection/persistence. They also cover the exact leading-zero source number, 9999/10000ms boundaries, explicit Play, cancellation, replay, untimed mode, commitment before model reveal, and all 154 pages. These are automated code/DOM results.

The candidate runner retains its documented audio file/name exclusions. Logs are `release-candidate-tests.log`, `release-dependency-rerun.log`, `release-schema-tests.log`, `release-runtime-tests.log`, `release-owner-preflight.log`, and `release-independent-probes.log`. An initial reviewer probe reversed the entire synthetic curriculum and correctly tripped an existing ordering-exercise prerequisite validation; it was narrowed to the requested two imported-lesson reorder before the final seven-probe run. That harness correction is not reported as a product defect.

## Preservation, trust and installation boundary

Exact original database read for backup and hash verification:

`C:\Users\Trans\.openmausbot\task-workspaces\8c900356-50f6-4d41-bbb9-50c8abe09233\b1d5e7a0-1d13-4e9e-b544-06d3b889fb9e\hebleo-consolidated\data\lexical-private-demo.sqlite`

Its independently verified before/after logical digest is `ef76d8feadd88612a98476a6f52900fa6a4c96378c903c17cfa24901c3e9945f`, matching the supplied receipt. Active revision 4 remains unchanged. The rehearsal conserves every protected row in `events`, `kv`, `learners`, `media_aliases`, `media_blobs`, `revisions`, and `sqlite_sequence`. Only the schema marker and additive saved draft change on the rehearsal copy. All prior draft lessons survive exactly. The retained-approval recovery rehearsal passes, while restoring the real-source backup to an empty synthetic Store returns `LEXICAL_APPROVAL_REQUIRED: Unknown source browsing approval in restore` with no writes. No trust waiver was used.

Private copies and full receipt are in `.private/release-first20-preflight/`; do not commit or share those databases. This run supplied no `--preserve` paths and did not independently hash the live environment/vault/upload directory. The receipt's `files` is therefore empty; Lead's four configuration/media fingerprints remain attributed evidence only. Stored media rows were independently conserved. Installation must recheck actual environment/vault/media paths and hashes.

Read-only HTTP verification of `http://127.0.0.1:63358/api/build` still reports `ba3ad389a6af9807f8eb90e7c34b8723cb1ffc80`, runtime `72326559688bfd64c7ade423ce917d192ec4f829f7dcc5c1ba85fe4fb1f2efcf`, preservation mode true. The reviewed candidate is **not installed**.

The migration plan is appropriately split: preservation startup refuses reader-7 → reader-8 migration; explicit prepare/apply performs it, then the preservation launcher verifies the exact executable identity. Installation remains blocked by RR-TXT-01. After correction, Lead must freeze/recheck the new commit, take a fresh rehearsal and configuration/media fingerprints, verify and stop only the intended listener, apply using the fresh digest, and verify all protected state and served assets after startup. Never use `npm start`, reseeding, fresh-progress flags, or silently relabel a reader-8 database for old code. A future rollback must preserve any new reader-8 responses and later learner activity; an old backup cannot simply replace them.

## Nonblocking architecture observation and remaining gates

The single shared draft is deliberately publication-ineligible once first20 is appended. `draftImport` also prevents removing these lessons through ordinary stage. There is currently no human-approval promotion or selective unstage workflow. Document this practical limitation before installation; future removal/promotion must preserve the prior saved draft and identity history. It is not a request to weaken the current publication gate.

All 127 default canonical mappings and introduced-letter source mapping remain human review work. No unknown targets become lexemes; there is no A001-to-synthetic-lesson positional equivalence. The prepared 114-lesson/404-ID planning route and rejected Sheets write are not live source updates. No Sheets/WordPress retry was attempted. Wording, Nikkud, original audio/artwork and pedagogical acceptance are unresolved; recordings/captions were not inspected.

No native browser attempt was made in this review. The supplied Edge refusal (`browser_consent_required`) remains an attributed restriction and was not bypassed. JSDOM/HTTP checks do not establish rendered RTL/Nikkud, native keyboard/focus, narrow geometry, zoom, physical touch, screen-reader behavior, installed first20 learner behavior or Guy acceptance. First20 remains a draft; actual learner integration tests use synthetic published text fixtures, while Preview can exercise unpublished imported content.

**Next owner: Hebleo Lead Engineer.** Fix RR-TXT-01, add regressions, update `docs/FEATURE_CHECKLIST.md` TXT-02/TXT-03 to record this blocker without changing Guy's Pending cells, and return a new exact frozen SHA for bounded independent recheck. The shared ledger and other agents' active work were left untouched. No additional product decision or credential is needed to make that technical correction.
