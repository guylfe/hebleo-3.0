# Independent QA: post-answer word cards

Frozen implementation: `444b9177f556e103f48f548db5d700d6cddf29e8`, Lead branch `lead/post-answer-word-cards`. QA branch: `qa/post-answer-444b917`. Bounded automated pass; no concrete implementation regression found in the checks below. Native review and Guy acceptance remain OPEN.

## Isolation and identity

QA cloned the supplied read-only Lead checkout with `git clone --no-hardlinks --branch lead/post-answer-word-cards <supplied-path> qa-post-answer-444b917`. Source checkout was not edited. Tests use disposable in-memory Stores and ephemeral HTTP servers. The review listener `http://127.0.0.1:63360/` received only build/static GETs; original owner listener 63358 received only `/api/build`. No learner navigation, submission, source edit, draft publication, migration, reset or production access occurred on either persistent listener.

Both build endpoints reported the frozen SHA, runtime SHA256 `98e6edb89084f8875a5d3f63d9e3240cf04838ea38455ddb83b98857de850be9` and backend SHA256 `e1194b748380d7bb78be6e5a2248aeff62c5161429e13ec397642e992e00e6c1`. All build-file hashes and all 52 allowlisted static routes (including dependency assets) on 63360 matched the isolated checkout. Windows clone conversion initially changed three files' line endings; QA aligned only package.json, public/post-answer-vocabulary.js and src/exercise-vocabulary.js to the served bytes, verifying their complete hashes. There is no canonical executable diff from the candidate.

## Executed verification

| Command | Actual result |
| --- | --- |
| `npm ci --ignore-scripts --no-audit --no-fund` | 49 root packages installed |
| `npm ci --ignore-scripts --no-audit --no-fund` in schemas | 5 schema packages installed |
| `npm test` in schemas | 23 passed, 0 failed |
| `npm run verify:candidate` | Syntax checks and 717 passed, 0 failed; 59 test files, configured audio filename/name exclusions; not a full audio/speed suite |
| `node scripts/verify-eligibility-contract.mjs --revision 444b9177f556e103f48f548db5d700d6cddf29e8 --report qa-eligibility.json` | 34 cases, 3,962 assertions and all 4 negative controls passed |
| `node --test qa-tests/independent.test.js` | 6 passed, 0 failed; exact build/static routes, real HTTP Apply typing correct/incorrect, wrong matching identities, duplicate managed IDs, saved rehearsal matching/disposal |
| `node qa-tests/preservation.mjs <Lead evidence root>` | Receipt before/after, original live DB and backup all equal using read-only SQLite snapshots |

Root candidate logs: qa-candidate-final.log. Schema log: qa-schema.log. Independent log: qa-independent-final.log. Machine receipts: qa-eligibility.json and qa-preservation.json. Logs are local ignored artifacts. Independent app harness is explicitly copied from the frozen test/app.test.js setup; the six new scenarios/assertions are QA additions, not a separate native browser implementation.

Tests exercise recognition gating/correct/incorrect and saved feedback, Check/Apply, typing's exact raw Unicode answer and disabled textarea, wrong matching placements retaining the submitted word ID, no extra attempts/preferences/progress/review/source rows during card operations, Escape/focus return, global keyboard isolation, report modal cleanup, route/profile/retry/next lifecycle and detached old trigger disposal. Shared primitive tests additionally cover hover transit, click pin/touch-equivalent activation, one-card ownership, suppression, viewport stubs, timer/listener disposal and stale/hidden/inert anchors. Projection checks cover denied managed forms, duplicate identities, missing/unintroduced/pending/conflicted entries, beyond-page-50 entries, citation/locked-form separation, pinned sessions and saved drafts. Free sentence text remains deliberately unbound.

The owner database was inspected read-only with DatabaseSync/readOnly, without opening Store or copying records into artifacts. Its current schema/all-table digest, backup digest and saved before/after digests all equal `e72ca110485b8d3d67a70477e790c4c7bbcb4902c4bec6890eceaa2e2d16b460`. Source digest is `5be459536124d79296d444f94b049b3bef421ac422f2d3b556efe42e1a003281`. This establishes conservation at the recorded observation, not a guarantee against later changes.

Initial local QA harness/setup failures were corrected before the final runs: schema dependency was installed after an early candidate invocation; the added tests now wait for the pre-existing 400ms answer autosave, unwrap previewEvaluate.result, and enumerate actual static allowlist routes rather than assuming every tracked public file has a URL. These failures are not product defects. Final candidate verification was rerun after byte alignment.

## Native blocker and handoff

Mounted target discovery (`select_computer`) reported current target local / this computer. `mcp__computer__list_windows({})` returned isError true: **"Another thread is using this computer. This call was not performed."** No native inspection or input happened, and no foreground, shell/browser automation or alternate computer fallback was attempted. This is a mounted-tool resource refusal, not an auto-review rejection.

Native viewport/RTL appearance, pointer movement, actual Enter/Space and Tab defaults, physical touch, screen reader, zoom and Guy acceptance remain unverified. JSDOM geometry is stubbed and cannot establish these. Audio/speed quality remains deferred. Named UX final review is outside this QA return.

Lead handoff: retain the frozen implementation; review this QA evidence and complete mounted native interaction review when the resource is available. No implementation correction is requested from the bounded passing checks. The E10 ledger records automated QA separately from native/Guy acceptance. QA evidence commit adds only tests/reports/ledger documentation; it does not supersede the frozen implementation SHA.
