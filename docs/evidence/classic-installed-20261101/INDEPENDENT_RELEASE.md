**BOUNDED PREINSTALL PASS — RR-CLASSIC-PROJECTION-01 CLOSED**

Independent verdict on exact combined commit `40864ec3cad885b5d550eb9c9cda9c0addc6bd6d`, 1 November 2026. No blocking finding in the reviewed forward-install, private-use approval, publication-isolation and recovery scope. The direct code-downgrade restriction below is material and must remain in the installation/rollback handoff. This is not an installation, production launch, native UX acceptance or Guy acceptance.

Candidate P: `C:\Users\Trans\.openmausbot\task-workspaces\8c900356-50f6-4d41-bbb9-50c8abe09233\4d4e36bc-67d1-4c07-bcfb-e381d246b0b3\hebleo-classic`.

Reviewer R: `C:\Users\Trans\.openmausbot\task-workspaces\71c71389-5334-4e0c-9ca8-d80dd28223d1\653fb433-7485-48b1-9f7c-cb22711bda02\hebleo-3\tmp\rr-combined-40864ec`.

Original S: `C:\Users\Trans\.openmausbot\task-workspaces\8c900356-50f6-4d41-bbb9-50c8abe09233\b1d5e7a0-1d13-4e9e-b544-06d3b889fb9e\hebleo-consolidated\data\lexical-private-demo.sqlite`.

**Exact identity and review scope**

All **151 executable hashes** match the supplied combined manifest, and every copied executable matches P. Runtime SHA256 is `9554d3804855327e9159947abd6841a1d50a2bce2408afeb46cbdb2bd72460d7`; backend SHA256 is `4c182a5bae3e6e9569492d7595b4e5529a026d04ad008937e3f15e5943d021d3`. P is clean at the exact requested commit.

Exactly **144 runtime paths match the previous independently reviewed ece6c085**. The seven changed paths are:

- `public/author/author.css`
- `public/author/classic-source.js`
- `public/author/image-chooser.js`
- `public/author/source-adapter.js`
- `public/author/standard-editor.js`
- `src/media-store.js`
- `src/server.js`

Actual changed source, combined handoff, correction delivery, ADR-B06, media delivery and tests were inspected. All 128 supplied support/test/content/schema files were copied and hash-checked. All 4,977 installed dependency-file hashes match the preceding reviewed package and remain stable. Prior evidence-artifact hashes were verified before carry-forward. No dependency installation or source edit was needed.

**Projection blocker closure**

The exact nine-test reviewer file from the blocked revision was copied unchanged into this isolated candidate. Its six formerly failing Markdown cases now pass: two paragraphs, heading/paragraph, list/paragraph, paragraph without trailing newline, blockquote, and table. HTML/entity preservation and adversarial retained-metadata/paste checks also pass.

The adapter now retains full Markdown token boundaries, encodes mapped top-level separator text, distinguishes repeated regions with transient identity and rejects unprovable ordering. Formatting-only collection checks the complete original projection. The shared projection-v1 renderer and stored anchor algorithms are unchanged.

An additional independent actual-component/HTTP test repeats my original color-only Save reproduction and adds a repeated second quote. Whole-block and repeated-quote anchors remain `current`, retain exact original offsets, and require no relocation after Save, Preview, selected synthetic publication and restore. Historical comment state stays exact. The focused candidate cases also exercise each repeated HTML/Markdown sibling across reload and subsequent formatting, Center on tables/headings, and refusal of forged/reordered regions.

This closes RR-CLASSIC-PROJECTION-01 on the exact combined revision. JSDOM uses the supplied component's real DOM commands, with its documented layout shims; it is not native keyboard/IME/clipboard or visual evidence.

**Private image audit and recovery assessment**

The separately named private-use overlay is a reasonable bounded addition for this local demo. It does not claim human teaching approval. Exact import revisions and import-operation receipts remain canonically pending and unchanged. Approval requires Author identity, strict server-owned authority fields, an exact imported raster pin and current-head CAS. Stored pairs bind approval records to their operation requests/results and validate against immutable revisions and bytes. Merge rejects a conflicting shared record and retains compatible records from both sides. The existing canonical publication guard remains separate.

Fresh focused tests pass for permissions, request fields/pins, foreign origins, CAS/history growth, concurrent/idempotent operations, missing/corrupt bytes, invalid stored audits, startup/reopen, restore conflicts, missing incoming dependencies, transaction rollback, canonical/selected publication refusal, exact source-bundle approval invalidation and chooser retry/cancel/pre-insert validation. The old fabricated canonically-approved image fixture has been replaced by actual HTTP import/private approval in the configured editor test.

Additional independent probes establish:

- The **4096-byte limit is exact UTF-8**: a valid request padded to 4096 bytes succeeds; 4097 bytes and an oversized Hebrew body reject without writes. A learner cannot replay even a previously approved operation.
- Two independently approved branches merge both audit sets; older version1 and version2 packets and repeated restores retain their exact import/approval receipts and bytes.
- A version2 packet is rejected atomically by the actual previous ece6c085 reader. The new reader rejects version1-with-overlay, version2-without-overlay, unknown version3 and string version values.
- Extra request keys and missing import receipts cannot be repaired by existing local data during incoming restore.
- Importing the same bytes under a synthetic second asset cannot bypass the human-media publication guard after private approval.
- A fixture containing **5,000 valid approvals and 5,001 imported revisions** passes persistent validation. Attempting approval5001 or restoring a packet with 5,001 approvals rejects with every row and total write count unchanged. This tests the real configured bound; the constant was not reduced.

The 5,000-record bound fixture is directly constructed synthetic audit data for validator stress testing, not a claim of 5,000 human consent actions. All other image lifecycle probes use actual imported synthetic PNGs. No human image or original workspace was approved or published.

**Nonblocking compatibility restriction: direct code downgrade is not guarded**

The approval-bearing backup format marker works: the old reader refuses version2. It does **not** prevent the old executable opening the same schema10 database directly. An independent file-backed probe confirms that the old code opens an approval-bearing database and exports its preserved overlay labelled as media version1; the new reader then rejects that mislabelled packet. No audit was erased in this probe, but backward operation is not a supported recovery path.

ADR-B06 already forbids code-only downgrade. Retain and restore the matching **pre-update database plus old executable** for rollback; do not run the old executable against a database that acquired private-image approvals. Lead must carry this restriction into the guarded installation/rollback procedure. A future requirement for automatic downgrade refusal would require an old-reader-visible compatibility marker or Store schema change. This review does not claim such a guard exists.

**Current-size preservation and formatted-image recovery**

A fresh read-only VACUUM snapshot of S was made before testing; the shared native-review database was not used. The ordinary current-size component/HTTP verifier passes Save, saved Preview, full Studio reload, exact submitted content, other22 lessons, active revision, all non-KV tables, settings and retained KV data. Its six static route responses match local bytes. That HTML-format Save measured 4097.53ms.

A second independent full-size path starts from the same original snapshot and performs actual HTTP import and private approval of one labelled synthetic PNG. It inserts the pinned image through the real component's field adapter and saves a color-format edit plus that image. All **23 lessons / 26,632,089 original content bytes** remain represented; only the intended disposable field differs. Saved full content is exactly 26,632,287 bytes, and the other22 lessons are exact. Saved Preview and reload agree. HTTP Save measured 4342.35ms; this is not native input-to-paint or performance acceptance.

One synthetic private comment captures a full immutable draft context. Its approval-bearing **mediaRecovery.version2 backup is 85,483,413 bytes**. Two actual HTTP restore/re-export cycles retain exactly that size and the entire exported content except the export timestamp. Draft, revision rows, learner progress/settings, events, SQLite sequence, private comment/context, media state/import and approval audits, blobs and aliases retain their protected hashes. The exact image approval and comment requests replay without a new record. Reopening the file preserves the same state.

A missing private-operation audit in this full packet returns HTTP409 with the complete schema/table/sequence receipt unchanged. Final comparison with the original baseline confirms unchanged revisions, learners, events, SQLite sequence and media aliases. Only the intended draft, media-state and author-review change, plus the previously absent `source-state` becoming null. The new empty source-state is explicitly checked. Existing author-review/media-state were populated by this fixture before recovery, so there is no unexamined empty-namespace exception for those entries in this run.

**Commands actually run**

| Directory / command | Result |
| --- | --- |
| P: `git -c safe.directory=<P> status --short`; `rev-parse HEAD`; `diff --stat ece6c085 40864ec`; full focused source diffs/reads | Clean exact revision and seven runtime changes. |
| R: `node prepare.mjs <P>` | Exact manifest, prior evidence/dependencies, isolated copy and fresh original snapshot pass. |
| R/candidate: `node --test test/rr-original-projection.test.js test/classic-corrections.test.js test/classic-editor.test.js test/private-image-use.test.js test/private-image-chooser.test.js test/media-recovery.test.js test/media-integrity.test.js test/media-alias-export.test.js test/author-recovery.test.js test/lesson-publication.test.js test/source-authoring.test.js test/rendered-author.test.js` | **165/165 pass**, 0 skipped. |
| R/candidate: `node --test test/rr-combined-independent.test.js` | **6/6 additional independent groups pass**. |
| R/candidate: `node scripts/verify-classic-copy.mjs --source ../baseline.sqlite` | Current-size Save/Preview/reload/preservation and six assets pass. |
| R: `node fullsize.mjs` | Actual-size formatted-image/private context and two version2 HTTP recoveries, malformed rejection, replay and reopen pass. |
| R: `node audit-bound.mjs` | Actual5000 limit probes pass; direct old-code reopening limitation reproduced. |
| R: `node verify-identity.mjs <P>`; `node finalize.mjs` | Final code/dependency/evidence and original-data checks pass. |

All tests ran in R or synthetic temporary stores. HTTP servers, component windows and stores were closed. No relevant automation exists and no waiting monitor was created.

**Carry-forward limits and next owner**

The original logical schema/all-table/sequence receipt remains `09d24427a13d3f64418b1d11655ad091f70675a0da35e5db08feb03ff00196e1`, from 09:40:35 UTC through the final 09:47:56 UTC read. Active revision6; 23 drafts; 26,632,089 content bytes; draft SHA256 `bcf972cf542eae85622b41f8212a4b98cac1515994b2b4db3f3c5493836c09f2`.

Previous package pin/license/reproducible vendor-build evidence carries through exact package/vendor/build-script/dependency hashes. Previous370-field old/new-renderer parity carries because rich.js, safe-format.js and author-review.js are exact. Store, immutable contexts, source authoring, workspace/worker/CAS, publication backend/client and backup contract also match. Media backend and adapter behavior were tested freshly; they do not inherit a blanket previous pass. No new full configured suite, schema suite, generic runtime suite, private remote or CI completion was independently claimed.

This recovery packet has one synthetic full-size private context. It does not reproduce every previous multi-context 93MB packet, all old-reader histories, every media format or unlimited data sizes. The 50MB retained-media and 200MB complete-backup limits remain. The historical pooled-connection ECONNRESET cause remains unresolved; current-size recovery used fresh connections. Native network-failure UX is not closed by these checks.

No source edits, original/shared database writes, main changes, commit, push, Browser work or installation. Review databases are disposable and must never be installed. QA/UX retain native command, image decoding, layout, caret/history, real IME/clipboard, accessibility/device and performance gates. Guy acceptance remains separate.

Lead owns exact combined CI, recording this verdict in the shared ledger, fresh original backup/rehearsal and concurrent-save guards, the paired executable/database rollback restriction, guarded code-only forward installation, and installed identity/preservation/native checks. Machine evidence and full artifact hashes are in `VERDICT.json`.
