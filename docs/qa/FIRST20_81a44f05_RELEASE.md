**RR-TXT-01 CLOSED on `81a44f05d5a99b437d37a5cb6035342a259c8a37`.** Independent bounded review found no remaining publication/restore blocker in the corrected paths. Valid unpublished recovery, retained source approval trust and preservation migration still pass. This closes the identified local-demo release/data-integrity defect; it does not approve publication of first20 teaching or establish production readiness.

Reviewed checkout: `C:\Users\Trans\.openmausbot\task-workspaces\71c71389-5334-4e0c-9ca8-d80dd28223d1\653fb433-7485-48b1-9f7c-cb22711bda02\hebleo-3\release-first20-81a44f05`.

The reviewer cloned the assigned Lead checkout with `git clone --no-hardlinks --no-checkout`, set local `core.longpaths true`, and checked out the requested detached SHA. Reviewed the actual `git diff d912e746..HEAD`, including public/text-contract.js, public/content-identity.js, src/store.js, completion/gate UI changes and schema eligibility, against the prior independent defect and docs/FIRST20_REVIEW_CORRECTIONS.md. AGENTS.md, INITIAL_BUILD_BRIEF.md and relevant MASTER_SPEC stable-ID/publication/progress requirements were read. No core implementation was edited. Tracked content is unchanged; `git diff --check` and `git diff --quiet HEAD` pass. Reviewer scripts, reports and receipts are local artifacts. No commit, remote/main write, live staging, publication, reset, apply or installation occurred. The private remote branch was not independently reverified.

The original attack now fails through actual author HTTP endpoints. After importing the exact pack and exporting a backup, removing only `draftImport` and `publicationStatus` from all 20 imported lessons produces HTTP 409 / `TEXT_IMPORT_IDENTITY_REQUIRED` on restore into the known installation. All database tables, including the revision sequence, remain unchanged. Subsequent publication still returns HTTP 409 / `TEXT_DRAFT_REVIEW_REQUIRED`; pending teaching never reaches the active snapshot.

| Independently exercised variant | Observed result |
|---|---|
| Marker-stripped active and historical backup activation, both v2 and legacy v1, both known and blank fictional installations | All eight HTTP variants return 409 / TEXT_DRAFT_REVIEW_REQUIRED before any table changes |
| Blank fictional installation restores the explicitly pending, marker-stripped draft | Restore succeeds only as draft; publish returns 409 / TEXT_DRAFT_REVIEW_REQUIRED, active content unchanged |
| Known imported lessons reissued under new primary IDs, with references updated and structural validation passing | HTTP restore returns 409 / TEXT_IMPORT_IDENTITY_REQUIRED; all tables unchanged |
| Deliberately poisoned historical revision activated through HTTP rollback | 409 / TEXT_DRAFT_REVIEW_REQUIRED; all tables unchanged |
| Valid unpublished recovery with draftImport JSON keys reordered, edited teaching, page reorder and lesson reorder | HTTP restore succeeds; exact edited draft preserved; active teaching unchanged; publish remains blocked |
| Original reviewer CAS, conflicting/unknown mapping, source/provenance retention and repeated-import probes | Pass; all 154 page source/provenance records and 127 targets retained; repeated import preserves edited draft with zero writes |
| Known source recovery and unknown-source recovery | Owner-copy recovery preserves retained approvals; empty synthetic installation refuses unknown source approval with LEXICAL_APPROVAL_REQUIRED and zero writes |

The relevant checks are centralized in `public/text-contract.js:49`. Store uses them at publication (`src/store.js:612`), rollback (`:623`), active restore (`:672`) and historical restore (`:677`). The known imported-identity check is at `public/content-identity.js:41`, called before restore writes at `src/store.js:683`. It compares JSON objects without depending on property order. Existing lexical approval checks remain at `src/lexical-trust.js:40` and `:42`. No approval waiver or synthetic relabeling was introduced. Imported teaching still has no human-approval promotion workflow, so immutable imported identity continues to block its publication.

Commands actually run in this checkout and evidence:

| Command | Result / evidence |
|---|---|
| `npm.cmd ci --offline --ignore-scripts` | Pinned root dependencies installed; 49 packages |
| `npm.cmd ci --offline --ignore-scripts --prefix schemas` | Pinned schema dependencies installed; five packages |
| `npm.cmd run check` | Pass; release-syntax.log |
| `node --test test/text-release-integrity.test.js test/qa-first20-independent.test.js` | 15 passed, zero failures/skips; release-focused-tests.log |
| `node --test test/text-import-workflow.test.js test/restore-integrity.test.js test/preserved-runtime.test.js test/lexical-integration.test.js test/text-integration.test.js` | 35 passed, zero failures/skips; release-preservation-tests.log |
| `npm.cmd test --prefix schemas` | 27 passed, zero failures/skips; release-schema-tests.log |
| `node release-http-recheck.mjs` | 13 reviewer-owned HTTP cases passed; release-http-recheck.json and .log |
| `node release-independent-probes.mjs` | All seven original reviewer probes passed with corrected SHA; release-independent-probes.json and .log |
| `node scripts/prepare-text-install.mjs --database <exact original path below> --output .private/release-first20-preflight --pack docs/curriculum/first20-20261025/content.json` | Rehearsal only; protected tables and recovery pass; release-owner-preflight.log and private receipt |
| `node release-final-verification.mjs` | Exact commits, both checkout byte identities, owner original digest and live build checked; release-identity.json and release-final-verification.log |

The 50 focused supplied tests include valid and invalid recovery, imported mapping/identity/CAS, schema-7 to schema-8 rehearsal and synthetic apply, startup migration refusal, separate response history, required completion gates, delayed saves, explicit reset and prerequisite cycles. Applying in the test uses disposable fictional databases only. The entire 831-case candidate run and nine generic runtime scenarios were not repeated in this bounded review; Lead's reported totals are not presented as reviewer-executed evidence. The supplied DOM/HTTP tests are not native-browser acceptance.

An initial reviewer-only primary-ID reissue probe accidentally added an undefined lessonId property to curriculum section entries and failed structural validation before reaching restore. The harness was corrected to update only mapped lesson entries, then all 13 HTTP cases passed. That harness mistake is not a product defect. One exploratory read also referenced a nonexistent test/text-install.test.js; the actual installer checks are in test/text-import-workflow.test.js and were executed successfully.

The owner database was opened read-only for a consistent backup and digest. All migration/import/recovery writes occurred on copies under `.private/release-first20-preflight/`. Exact original:

`C:\Users\Trans\.openmausbot\task-workspaces\8c900356-50f6-4d41-bbb9-50c8abe09233\b1d5e7a0-1d13-4e9e-b544-06d3b889fb9e\hebleo-consolidated\data\lexical-private-demo.sqlite`

The independently checked original before/after logical digest is `ef76d8feadd88612a98476a6f52900fa6a4c96378c903c17cfa24901c3e9945f`. Active revision remains 4. Protected rows in events, kv, learners, media_aliases, media_blobs, revisions and sqlite_sequence are conserved by rehearsal, except the explicitly permitted schema-version and additive draft records on the copy. Prior draft lesson records survive unchanged. Source-trusted recovery passes on a copy retaining the installation's approvals; the blank-store trust refusal also passes. These private databases contain owner state and must not be committed/shared. This run did not supply preserve paths or independently fingerprint the live environment/vault/upload directory; the receipt's files object is empty. Fresh configuration/media fingerprints remain an installation requirement.

| Executable identity | Independently observed value |
|---|---|
| Both checkouts' commit | `81a44f05d5a99b437d37a5cb6035342a259c8a37` |
| Reviewer runtime SHA-256, 110 files | `a611ddd092271600362420d563ba990c9c7245a56ba5e3be882ad525e797c310` |
| Reviewer backend SHA-256 | `bcb7d3d14c03752c8b2792863e5af0eaa16d5f6b8583d8cbd972fdf8e8254bc1` |
| Lead selected runtime SHA-256, 110 files | `072967ca74488193f8fce7803aab2b62ac55e4107d1b90071c36e21636c1529b` |

Direct byte comparison found ten files differing only in CRLF/LF representation and no other differing executable file. The complete manifests and filenames are in release-identity.json. Testing ran against the reviewer bytes. The selected Lead bytes were independently hashed and compared, not executed as a separate second test run. Identical SHA alone is not a byte-identity claim. Read-only `GET http://127.0.0.1:63358/api/build` still reports `ba3ad389a6af9807f8eb90e7c34b8723cb1ffc80` with preservationMode true. The new candidate is not installed.

No new blocker was found within this bounded correction review. The documented single shared draft limitation remains: importing first20 preserves the prior saved draft but makes the whole shared draft publication-ineligible; selective unstage and human-approval promotion are absent. Recovery from an earlier backup must be deliberate and must not overwrite subsequent work. All 127 target-to-canonical mappings and introduced-letter mapping remain human-review work. Native visual/keyboard/focus/RTL/narrow-layout/accessibility inspection, actual installed first20 behavior, wording/Nikkud/audio review and Guy acceptance remain unverified here. No browser attempt or consent bypass occurred. Production release is outside this review.

Next owner: Hebleo Lead Engineer. Carry RR-TXT-01 closure and this exact SHA/evidence into the shared TXT-02/TXT-03 ledger, retaining Guy's Pending cells; combine with QA's independent disposition. For the authorized installation workflow, take fresh backup/configuration/media receipts, verify the intended listener and selected runtime bytes, use explicit preservation apply/startup, then verify served assets and protected state. Do not use fresh-progress startup. Reader-8 rollback must preserve later learner activity and text responses rather than replacing them with an old database. This review does not perform or claim those remaining steps.
