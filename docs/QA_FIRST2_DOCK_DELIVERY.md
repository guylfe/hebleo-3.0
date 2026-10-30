# QA-FIRST2-01 corrected and installed

Installed at http://127.0.0.1:63358/ on 31 October 2026, Israel time. Independent QA of the exact installed pointer paths is the next handoff to Leo. This is a dock correction and truthful missing-stimulus disclosure; consonant listening remains unfinished.

| Identity | Exact value |
|---|---|
| Installed code / private feature branch | `5946342f3221c9c4d842e62ee11dabdbba4b559c` / `feat/first2-actual-lessons-20261030` |
| Runtime SHA-256 | `b8c7a3ddd0136b6d15fcbe9da3436592fe82719d1c41345f1ec2d7dd67f657e6` |
| Backend SHA-256, unchanged | `c5f13d8d3e9190bb620874e9a239a454a96d90074dc711ead64aa7f54a38edc1` |
| Active content revision | **5**, unchanged |
| Listener | **8852**, replacing verified PID68008 on loopback port63358 |
| Private CI | [41140595636](https://github.com/guylfe/hebleo-3.0/actions/runs/41140595636), success on exact installed SHA |
| Post-install database receipt | `383dba1911ecc8c6bc73a0b24dfcbba0a7e9fdf9f8949bb4d9e52d0ebc95432e` |

Runtime checkout: `C:\Users\Trans\.openmausbot\task-workspaces\8c900356-50f6-4d41-bbb9-50c8abe09233\3f5dff25-a1fa-4bda-b947-bd733b040b0a\hebleo-first2`.

All delivery evidence and scripts: `C:\Users\Trans\.openmausbot\task-workspaces\8c900356-50f6-4d41-bbb9-50c8abe09233\51fcf20a-88f7-4274-b802-fc086c85d6d8`.

## Changed files and behavior

- `public/exercise-actions.js`: intentional heading entry still reveals the new page once. Ordinary document/dialog reading scroll no longer centers the focused heading or answer. Actual keyboard/viewport/header boundary changes and control focus entry still recover the active control. Existing measured reserve, textarea constraints, native node/value/caret and exact-priority cleanup are retained.
- `public/source-activities.js`: absent recognition/recall stimuli explicitly say “Sound recording unavailable. This listening activity is unfinished.” No target sound/letter is added as a textual stimulus substitute. Original author prose, prompts, options, feedback and IDs remain exact.
- `test/first2-dock-regression.test.js`: eight learner/Preview heading/textarea/select/button scroll-and-reflow probes, plus three actual source-page missing-stimulus probes.
- `UX-CONTRACT.md` and `docs/FEATURE_CHECKLIST.md`: bounded behavior and pending independent/Guy acceptance recorded.

`content/`, authored source documents, schemas, `src/`, media bytes, WordPress and main were not edited. Runtime checkout is clean and pinned to the installed SHA; only the assigned feature branch was advanced for code.

## Executed checks

- `npm ci --offline --ignore-scripts` and `npm ci --offline --ignore-scripts --prefix schemas`: pass, locked versions retained.
- `npm run verify:candidate`: **895 pass**, zero failures on the final commit. These are the configured candidate checks with the repository's explicit audio/speed/playback exclusions, not a claim of the deferred audio suite.
- `node --test test/first2-dock-regression.test.js test/keyboard-dock-clearance.test.js test/qa-keyboard-clearance-independent.test.js test/qa-keyboard-constraint-lifecycle.test.js test/first2-actual.test.js`: **48 pass** on final source.
- QA's original `qa-first2-c748834/independent.test.mjs`, unedited: baseline **1 pass / 1 fail**, reproducing the **-504.5px** heading pullback; corrected final **2 pass**, including all **128** known-date cases in its date test.
- `npm test --prefix schemas`: **27 pass**. `npm run runtime --prefix schemas -- --runtime <runtime checkout>`: **9 scenarios pass** on the installed code SHA.
- Strict interface static audit: **three existing delegated-button findings**, at lesson-editor.js:30 (two) and media-picker.js:15 (one). Their data-move/data-select-media handlers were inspected; this is the same documented pre-existing auditor limitation, not a clean strict audit result. DESIGN.md/tokens were read and retained; no design-token changes were made.
- `git diff --check`: pass. Private feature push and exact remote SHA readback: pass. Exact-SHA CI: success.
- `prepare-update.mjs` rehearsal/apply and `complete-install.ps1`: pass after refreshed-state rehearsal. `node verify-installed.mjs`: pass; **58 served public assets** plus **four original mnemonic images** hash-match; both active lesson page trees and saved draft lessons match the unchanged source pack. **23 saved draft lessons** remain. All three fictional profiles read back with zero completed lessons, attempts and resumes; readback wrote no stored state.

Logs: `candidate-final.log`, `focused-final.log`, `independent-final.log`, `schemas.log`, `schema-runtime-final.log`, `premium-audit.json`, `installed-readback.log`. Build/process/readback receipts: `preflight/build.json`, `INSTALLED_PROCESS.json`, `INSTALLED_READBACK.json`, `installed/receipt.json`.

## Native pointer evidence and exact limits

Mounted Browser, **1280×720**, Sam, exact corrected runtime on disposable staging port63886:

1. MEMORY page6: a **350px ordinary reading scroll** left the H3 focused and exposed both entry buttons. Both centers hit their own controls, top276.6875/bottom331.078125, dock top648.609375. Pointer **Try the comparison** opened the input; its local action row was visible above the dock. Screenshot `STAGED_MEMORY_COMPARISON.png` records the opened state.
2. MNTL copying page3: with the Hebrew keyboard open, ordinary scrolling exposed **Check answer**; pointer submission returned Correct for ל.
3. MNTL page4: after an ordinary **240px scroll**, pointer **Check answer** returned the authored correct feedback for ת.
4. MNTL page5: the final ל matching select accepted a pointer click, all selections persisted, and pointer **Check answer** returned all four comparisons.
5. MNTL page6: typed ם, opened Hebrew keyboard, then ordinary **160px scroll** exposed Check answer at **top196.109375 / bottom250.5**, above **dock top356.609375 / keyboard top436**. Its center hit the actual button; a pointer click returned **Incorrect**, matching מ. Screenshot `STAGED_MNTL_KEYBOARD_POINTER.png` records the unobstructed pre-submit state.

Some initial clicks before scrolling were covered, as expected when controls fall below the available reading area. Scrolling now recovers them without the focused heading/answer pulling the page back. Excessive scrolling can place a control behind the sticky header; ordinary reverse scrolling recovered it. This is a recovery fix, not a claim that every control is simultaneously visible without scrolling.

The installed runtime on63358 was independently identified in the Browser after installation and its served bytes verified through HTTP. The detailed pointer paths above ran against the identical staged code/runtime, **not against the installed database**. Staged server PID52640 was verified and stopped. No keyboard Tab/Enter fallback was counted as a pointer pass. Browser restarted during initial staging navigation; target/build were re-established before evidence was counted. No numbered provider step IDs were returned or invented.

Independent installed pointer recheck, narrow viewport, physical keyboard/touch, screen-reader,200% zoom and Guy acceptance remain unverified. Studio shares the corrected owner and has simulated Preview regressions plus candidate HTTP coverage; native Studio Preview pointer walkthrough was not repeated.

## Preservation and handoff

The final online backup is `installed/before.sqlite`, retained locally and never committed. A complete application export/restore rehearsal against a trusted copy passed. Schema, every existing revision, active revision5, entire draft (including unrelated authored lessons), media tables, events and every non-progress learner field remained exact. Only the three verified fictional profile progress sets and their build/reset markers/review state were reset once under existing fresh-build policy. No real learner records exist in this bounded store; no real records were reset. Original placeholder history/content was not rewritten.

The first install guard detected a changed learner-state digest and refused before database writes. With the verified old listener already stopped, a fresh backup/rehearsal captured that newer state; the apply path checked the refreshed digest again. No stale backup was restored over it. Configuration/vault/filesystem-media existence and hashes stayed exact; SQLite media bytes were separately preserved and served. No unrelated listeners disappeared.

Leo's next action: commission QA against **63358**, SHA/runtime above, to repeat MEMORY page6 entry choices and MNTL pages4/5/6 pointer checks with the keyboard states described. Alex remains clean for a fresh walkthrough. Audio acquisition was not repeated: the supplied acquisition handoff was read, but zero isolated consonant clips were verified or installed. Whole recordings and synthesis were not attached to sound buttons. Human phonetic isolation/verification remains a separate unfinished handoff through Leo.
