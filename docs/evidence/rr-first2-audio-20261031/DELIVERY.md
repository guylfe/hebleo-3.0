# RR-FIRST2-01 final parent/item collision correction

Installed and owner-verified at http://127.0.0.1:63358/ on 31 October 2026. Independent installed closure is pending Release Reviewer. Audio remains unfinished; no isolated consonant clips have been verified or installed. Guy acceptance remains Pending.

## Exact identity

- Installed code: 73e242e717c630976fd2d040396d4d8d5fcd3127, branch fix/rr-first2-audio-namespace-20261031.
- Candidate checkout: C:\Users\Trans\.openmausbot\task-workspaces\8c900356-50f6-4d41-bbb9-50c8abe09233\489864a5-e240-4cef-a6fc-8cc6d0df25fa\hebleo-audio-contract.
- Runtime SHA-256: 08e689b369f2129b94e6d6d0016c4a0c6dadc4936b680cd30d26b69a20bb2249.
- Backend SHA-256: c5f13d8d3e9190bb620874e9a239a454a96d90074dc711ead64aa7f54a38edc1, unchanged from abf3cca.
- PID 59284; content revision 5; five immutable content revisions and 23 saved drafts retained.
- External evidence and SQLite backups: C:\Users\Trans\.openmausbot\task-workspaces\8c900356-50f6-4d41-bbb9-50c8abe09233\489864a5-e240-4cef-a6fc-8cc6d0df25fa. Final receipts are preflight/ and installed/. The initial-checkout-install/ folder retains the earlier newline-converted installation receipts and original current baseline, including Sam's prior native-test progress. No SQLite files or learner rows are committed.
- Source pack SHA-256: 1b9df3021485e37c5c01af7a0eb573a482ba7329c797dc1dad55aaa2e9fb9e3a.
- All 113 executable hashes compared: only public/text-contract.js differs from abf3cca; 112 executable files are byte-identical. Reader, backend, source content, schemas and installer implementation are unchanged.

## Correction and regression evidence

The shared source validator reserves the parent activity ID in each gallery/matching/self-check item namespace. Every parent/item collision is rejected, even with no clips attached. Separate pages may reuse item IDs. No content identity, source teaching or UI changes are made.

The added tests fail on prior code (runtime accepts the collision; real draft save returns 200), then pass on the fix. The 70-case malformed matrix includes twelve collision variants: all three item families, no clips, child-only clip, distinct child/parent clips and collision on the last item. Synthetic aliases resolve to existing disposable test media, so the five HTTP boundaries reject for the exact identity error. All 350 rejection requests return 400 with every database table and sequence unchanged. Valid save/publish/restore controls succeed. The exact source pack and all 20 legacy drafts / 154 pages remain supported and unchanged.

Positive dispatch controls mount the real reader, activate all child Play buttons in gallery/matching/self-check and scalar parent Play buttons in letter-input/letter-choice/application-choice, and observe exactly the requested URLs. This verifies dispatch, not auditory playback. Synthetic clips exist only in disposable tests.

## Commands actually run

| Command | Result |
|---|---|
| npm ci --ignore-scripts; npm --prefix schemas ci --ignore-scripts | 49 and 5 locked packages installed |
| node --test test/source-activity-contract.test.js, before validator fix | 3 pass / 2 fail; original acceptance reproduced |
| npm run verify:candidate | Syntax passes; 900 pass, zero failures; repository audio/speed/playback exclusions remain |
| node --test test/source-activity-contract.test.js, fixed and final bytes | 5 pass; 70 malformed variants / 350 atomic HTTP refusals plus positive dispatch |
| npm --prefix schemas test | 27 pass |
| node schemas/tools/runtime-check.mjs --runtime . | 9 runtime scenarios pass, rerun pinned to code SHA |
| Original reviewer tmp/release-first2-20261031/guards.mjs . .. | Four original malformed cases reject; five install guards reject without writes; original script unchanged |
| node prepare-update.mjs rehearse LIVE_DB preflight CODE_SHA | Consistent backup, fresh-progress rehearsal, every protected table and application export/restore pass |
| install-contract.ps1 | Exact previous process/runtime guarded, current-digest check, final preservation apply/start pass |
| node verify-installed.mjs | Live build, 58 public assets, four source images, both active/draft lessons, all 23 drafts, fresh fictional profiles and read-only GET proof pass |
| git diff --check; protected-path diff; private push and ls-remote | Pass; only assigned branch updated; main remains 3615807c88beeb3c7090a48e9f3c5520a28bda60 |

Private code CI is SUCCESS for the exact code SHA: https://github.com/guylfe/hebleo-3.0/actions/runs/41147779569 .

## Preservation readback

The first fresh baseline was 0e5ade4b664aa6cdce3809b50fe12cf6e358f123efd52aebad54db70d1c914a4. Its backup precedes any reset and preserves Sam's latest native-test progress. The first checkout unexpectedly converted line endings in seven unchanged executable files and the source pack. Original bytes were restored before the final freeze. Both installation receipts are retained. The final normalized build differs in exactly the intended validator file, and its focused suite was rerun. This did not change lesson content or nonprogress data.

Final before digest: 72340619fc25b0a829dad5b88501fb7d9e58cd612dc851f4e5c03930be435c8a.
Final after digest: 11029b482abea7916d414fc0ef15243fe594412b3ed1d32b7f6b3bece529be33.

Schema, all five immutable revisions, active revision 5, entire saved draft, media tables, events, sequence, source state and every nonprogress learner field are exact. Configuration/vault/filesystem media hashes and every unrelated listener were checked unchanged at both installations. Only the three explicitly checked fictional identities were reset for each executable fingerprint under the existing policy. No real learner rows exist. Final GETs verify zero completions, attempts, resumes and saved page responses, null lastReview and unchanged database digest. SQLite integrity and actual application export/restore rehearsal pass.

Active and saved-draft MEMORY-A2 (seven pages) and MNTL-A2 (nine pages) exactly equal the source pack. Twenty legacy drafts are preserved within the entire 23-draft set. All 58 public served assets match build hashes; all four original mnemonic images match their source receipts.

## Independent and native scope

Release Reviewer's prior actual audit at the shared repository tmp/release-first2-contract-abf3cca/REVIEW.md is reused for unchanged paths. Request only the installed collision correction and preservation delta, with an explicit RR-FIRST2-01 CLOSED/OPEN verdict. No new native walkthrough is claimed. Leo's abf3cca Sam comparison/normal finish/next-lesson native evidence remains separately attributed; the final delta changes only validation and leaves those UI bytes exact.

Audio remains explicitly unfinished: zero verified isolated /m/, /n/, /t/, /l/ clips. No raw whole-source recordings or synthesis were installed. No WordPress, production, main, external source or curriculum change was made.
