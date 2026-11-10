# Conjugation run lifecycle checkpoint — 10 November 2026

Isolated branch `feature/persistent-conjugation-run`, based on Lead checkpoint `77e516ad5622ef3593a219284f8f200199b1a325`. No installed runtime, main branch, approved catalog, audio, existing help add-on, lesson unlock behavior or flashcard scheduler was modified.

## Behavior and data boundary

One exact run per `native:<profileId>` / `wordpress:<positive signed-in userId>`, in IndexedDB database `hebleo-conjugation-runs`, object store `slots`, same browser and origin only. Display preferences retain their separate localStorage adapter; WordPress preferences now also have an account suffix. No server or cross-device synchronization. No new learner/SRS API writes. Namespace isolation is a browser application boundary, not encryption against other scripts running on the same origin.

Each snapshot holds schema 1, a source-catalog comparison copy, run identity, setup, Nikkud, direction and paused state; the drill stores canonical form IDs for the exact queue, candidates and shuffled options, total/index/pass, missed IDs, draft/selection, feedback, attempt/override and preferred mode. Hydration validates and maps IDs to current canonical records without constructor/shuffle/grade/next. Compatibility is deliberately conservative: any catalog change, unsupported schema or invalid form/state preserves the slot and blocks new Start with a message. No auto migration or discard is performed.

Input and meaningful transitions enqueue saves immediately, independent of unload. Pause/Change selection commit a paused snapshot before changing the mounted screen. A pending run disables setup replacement until Resume or explicit End. End/completion atomically replace only that owner's slot with a revisioned null tombstone. Atomic owner revision CAS fences older tabs, including stale terminal actions against newer runs. Transient save errors leave viable in-memory input and allow Pause/End retry; initial storage denial blocks Start. Actual completion waits for missed passes; failed terminal clearing retains the previous viable stored prompt and prevents replacement until retry.

Native buttons provide standard keyboard activation/focus. Blue pause (#185c92), red end (#a32121), white text, existing focus ring/minimum 44px controls and wrapping compact row are scoped to practice.css. Painted browser/device acceptance remains unverified.

## Exact files

- `public/conjugation/run-store.js`, `run-state.js` (new), `view.js`, `practice.css`.
- `public/native-conjugation.js` supplies native owner and awaits restore.
- `src/server.js` adds only the two exact new module paths to the existing allowed-assets list. This is a necessary supporting dependency: without it the native browser imports return 404. Access semantics are unchanged.
- `adapters/wordpress/conjugation/{conjugation.php,bootstrap.js}` supply the authenticated stable owner.
- `adapters/wordpress/conjugation/{asset-version.mjs,package.mjs}` package/version both new imports, including serializer-to-engine and view-to-serializer/store-to-bootstrap propagation. The graph rejects missing new-module bytes rather than silently emitting unversioned imports.
- Tests: new `test/conjugation-run.test.js`; adapted actual native integration tests to supply IndexedDB and test exact asset access; WordPress `asset-version.test.mjs`, `package.test.mjs`, `legacy-view.test.mjs`, `adapter.test.php`.
- `DESIGN.md`, `UX-CONTRACT.md`, `docs/FEATURE_CHECKLIST.md` record the bounded contract/status.

## Commands and evidence

From this isolated checkout:

```
npm ci --offline --ignore-scripts
npm run check
node --test test/conjugation-run.test.js test/conjugation-native.test.js test/conjugation-integration.test.js test/conjugation-engine.test.js test/conjugation-view.test.js test/conjugation-lexical-selection.test.js test/practice-help.test.js adapters/wordpress/conjugation/asset-version.test.mjs adapters/wordpress/conjugation/legacy-view.test.mjs adapters/wordpress/conjugation/package.test.mjs
git diff --check
```

Dependency install: 78 packages, zero reported vulnerabilities. Syntax checks pass. Focused suite: 75 passed, zero failures/skips, including 23 new persistence cases. Tests use disposable synthetic catalog/browser/account fixtures. They include real fake-indexeddb concurrent read/write transactions and an actual transaction abort, injected quota/error failures, both terminal/nonterminal stale writers, fresh mounts, reverse direction, chosen/typed/revealed/graded/override/missed snapshots, actual missed-pass completion, failure retry and native read-only learner/SRS readback. Package test generates a fresh disposable package, hashes it, checks module URLs and executes real PHP shortcode/access doubles, including stable owner metadata. Existing lexical/source/help checks remain in the suite.

No repository build command exists beyond the check/test workflow. Full repository suite was not run. Python-based optional skill static audit could not run: `python` was absent and the `py` launcher points to an unavailable Windows Store interpreter. No browser acceptance is claimed or substituted by DOM tests.

## Lead integration/install handoff

Cherry-pick this branch checkpoint into the integration owner checkout. Restart/repackage native with the two new exact module assets. For the existing WordPress legacy installation, keep its separate help add-on and use `legacyWordpressView` (anchors preserved). Deploy both new JS files as well as changed view/bootstrap/CSS/PHP. When calling `versionPracticeGraph`, pass `runStore` bytes and raw `runState` source along with engine/view/bootstrap; write the returned `run-state` output in addition to view/bootstrap. Use returned graph bytes in manifests/hashes. Old seven-file deployment lists must expand for both new modules. Authenticated PHP markup must supply the stable WordPress user ID before enabling persistence; a global owner is rejected.

Lead owns installation, same-account real browser reload/navigation, concurrent-tab/failed-storage browser acceptance, narrow rendering/contrast/focus verification, demo fresh-progress API check after native update, and Guy acceptance. Browser storage clearing/eviction or closing immediately before a pending asynchronous commit finishes can lose the latest uncommitted input; this implementation does not claim browser storage is a backup or synchronize it elsewhere. Successful Pause is explicitly committed before navigation.
