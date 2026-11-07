# Native conjugation integration

7 November 2026. Implements the Native/Architect portion of the Lead's
`CONJUGATION_ENGINEERING_CONTRACT.md` and Guy's `IMPLEMENTATION_APPROVED.md`.
Engineering readiness and content approval are separate. This branch contains no
learner catalog, shared practice engine/view, WordPress changes or installation.

## Learner route and view boundary

`#conjugation` is linked from **My Hebrew → Conjugation practice**. My Hebrew stays
the active main-navigation item. The entry adds no lesson completion, flashcards
or review history. Route departure, rerender, profile change and pagehide dispose
the native mount. A restored browser page remounts it for the current learner.
An asynchronous response after disposal cannot mount a view.
Loading and errors have explicit status text and a retry action.

`GET /api/conjugation` uses the existing fictional identity and purchased-course
access check, including the core purchaser. It returns:

```js
{ catalog, learnedIds: [/* exact stable form IDs for the requesting learner */],
  allowFixtures: false }
```

There is no conjugation write API. `public/native-conjugation.js` calls the shared
`mountConjugation(root,{catalog,learnedIds,platform:'native',storageKey,allowFixtures})`
and calls its returned `destroy()`. The preference key includes the learner ID.
The shared view remains responsible for practice, filters and draft retention;
native integration does not persist rounds or claim cross-device recovery.

The server serves only the fixed shared engine/view/style paths. It does not
serve raw catalog or test files. `public/conjugation/catalog.json` is read once
per Store startup. Missing content yields an empty catalog with an approval
message. Invalid catalog data disables this feature with a 503 response while
other app functions remain available. A catalog update requires a server restart.

## Authoring and exact IDs

Lessons carry the optional field `conjugationUnlocks:{formIds:[]}`. Absent means no
unlocks. IDs use letters, digits, underscores, colons and hyphens, start with a
letter/digit, and are at most 160 characters; reserved object names are refused.
Lists are unique and bounded. Whole-word references and unknown metadata inside
`conjugationUnlocks` are rejected rather than expanded or silently dropped.

Studio receives the read-only catalog on its existing author-only response.
Its lesson editor groups exact form checkboxes by lexical item, shows selected
versus available counts, and reports held forms separately. The preposition
convenience button selects only the currently available IDs. Future catalog
additions never change saved selections. Empty catalogs have an explicit
approval-pending state. Unavailable existing selections remain visible and
retained until deliberately removed; they cannot authorize new publication.

The controls update the same lesson workspace as other editor fields. The
existing coordinator collects them with sibling edits and saves the whole draft
through its base-revision/draft-token comparison. Conflicts retain the inputs.
Reload, selected-lesson publication and rollback use the existing content flow;
no parallel draft store or separate Save button was introduced. `validateContent`
and all Store mutation/publication checks enforce catalog approval independently
of the UI. `source-attested` and `held` forms are not selectable unlocks.

## Completion and preservation

Learner state adds optional `conjugationLearnedFormIds`. Existing records return
an empty list without any write or backfill. No migration rewrites authored
lessons, drafts, learner history, recordings, or cards. These optional fields keep
the existing Store 11/content 1 envelopes; their structural JSON schema is
`schemas/conjugation-native.v1.schema.json`.

Successful existing completion paths union exact IDs from the lesson snapshot
used for that completion: all assessed questions passed (including existing
sentence self-approval behavior), or an explicit validated Finish. Required text
page gates still apply. Attempts, successful completion, unlocks, card enrollment
already performed by lesson completion, and the learner write run within the same
SQLite transaction. Replayed attempts do not add another receipt or duplicate IDs.
Completing one learner's lesson never changes another learner.

Opening, previewing, browsing the catalog, selecting practice-ahead material and
practicing do not grant forms. Mentioning a word grants nothing. Editing a lesson
after a learner started it cannot substitute that newer lesson's unlocks for the
session's pinned snapshot. Completing a genuinely newer revision can add its
explicit new forms. A catalog record must still be approved at completion.

Backups preserve historical learned IDs and lesson snapshots exactly. Restore
validates historical ID structure without demanding that old IDs still be in the
current catalog; retired IDs must not prevent recovery. New saves, publication
and content rollback require current approved references. Historical learned IDs
do not make held/retired catalog entries practiceable. Ordinary reads cannot
erase them. The existing explicit demo reset operation also clears learned form
IDs; this task never invokes that reset or changes the installed demo.

## Disposable tests and integration handoff

`new Store(':memory:',{conjugationTestCatalog})` is the only fixture-injection
boundary. A file-backed Store refuses it before opening a database. No HTTP flag,
environment variable, production catalog or startup script enables fixture mode.
Fixture catalogs are structurally validated; the native wrapper and Studio show
an explicit synthetic-test label. Production catalog loading rejects fixture
records. Test data lives only in `test/conjugation-native.test.js`.

The new executable tests exercise actual Studio controls/coordinator/HTTP draft
save/reload, deliberate scoped publication, safe IDs, partial paradigms, pinned
completion, learner isolation, real text-page gates, rollback after a simulated
write failure, backup/restore, catalog growth, and the actual app hash navigation
and profile switch. Shared view mount tests use a boundary double because its
implementation is owned by Feature Engineer. They do not prove shared grading or
painted UI behavior.

Lead integrates the shared files and approved/held catalog, runs the module-graph
and integrated practice checks, performs mounted phone/desktop inspection and
preservation installation, and updates FEATURE_CHECKLIST. No user acceptance,
installed result, WordPress result or linguistic approval is inferred here.

## Verification commands and evidence

Executed in the isolated `feat/conjugation-native-20261107` checkout based on
`0bbd389f35e8069dd8ca19e447414c40c1b69ee3`:

```text
npm ci --no-audit --no-fund
npm run check
node --check src/conjugation.js
node --check public/conjugation-contract.js
node --check public/native-conjugation.js
node --check public/studio/conjugation-unlocks.js
node --test test/conjugation-native.test.js
node --test test/conjugation-native.test.js test/store.test.js test/studio-authoring.test.js test/feedback18-unified-studio.test.js test/restore-integrity.test.js test/server.test.js test/lesson-publication.test.js test/lesson-publication-client.test.js test/workspace-save-regression.test.js test/sentence-modes.test.js test/sentence-approval.test.js
node --test --test-name-pattern='NAVY|DESIGN13|source/DOM cascade|navigation' test/app.test.js
git diff --check
```

Syntax checks pass. The native suite passes 15 tests; the focused preservation
suite passes 114; the navigation checks pass 16. Logs are local ignored files
`conjugation-native.log`, `conjugation-focused.log`, `conjugation-navigation.log`
and `conjugation-syntax.log` in the isolated checkout. The final lifecycle
test also covers pagehide/pageshow; existing app-wide review-clock maintenance
may create an empty protocol ticket map on pageshow, while teaching/card state
is unchanged.

`npm run verify` was also run here and in a separate untouched base checkout.
The base itself fails 28 checks, including old evidence-dependent WordPress and
text tests and older feedback/audio expectations. This branch additionally needs
Feature Engineer's shared view before the real HTTP module-graph test can pass.
The route must not be delivered alone without those files. Full-suite counts and
the comparison: base has 1,213 tests, 1,174 passed, 28 failed, 11 skipped; final
candidate has 1,228 tests, 1,188 passed, 29 failed, 11 skipped. The only added
failure is `browser module dependency graph serves as JavaScript over real HTTP,
including shared answer policy`, requesting the not-yet-integrated
`/conjugation/view.js`. Logs: `conjugation-final-verify.log` and the sibling
baseline checkout's `baseline-verify.log`. No all-green claim is made from the
focused suite.

Mounted Browser inspection was attempted against a disposable in-memory fixture
instance at port 63487. Local HTTP returned 200, but the Browser connection failed
before rendering. There is no screenshot, phone/desktop rendering acceptance or
browser author-save evidence from that attempt. The fixture process was stopped;
the Browser's last tab was returned to blank. No installed learner database was
opened, reset, restored or seeded by this work.
