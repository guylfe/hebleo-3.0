# Recovery correction integrated; independent re-review pending

Code checkpoint: `6b90bcfb26045cfa8d8bbe167fbfeffe9b6dbffe`, branch `fix/first2-combined-20261031`. Feature correction `fae1c6111e38cb48eb49f0b41547a5c28055b08c` and evidence `0083b91a2e64aa9a3642345e45c9ba535462ae85` were inspected and integrated as `aac7450` and `f05806f`. Lead added the retained-history media correction in `6b90bcf`; see `docs/F14_RECOVERY_CORRECTION.md` for its reproduction and contract.

Executed against code checkpoint 6b90bcf:

| Check | Result |
|---|---|
| `npm run verify:candidate` | 948 passed, 0 failed; syntax checks passed; established candidate audio exclusions unchanged |
| Focused author/recovery/restore/draft/batch/matching/media seven-file command from Feature delivery | 63 passed, 0 failed |
| `npm test --prefix schemas` | 27 passed, 0 failed |
| `node schemas/tools/runtime-check.mjs --runtime .` | 9 passed; ephemeral HTTP servers closed |
| `node scripts/verify-first2-parity.mjs` | PASS all 30 exact source fields; no new source fetch |
| Private CI | [41211175477](https://github.com/guylfe/hebleo-3.0/actions/runs/41211175477), success on exact 6b90bcf |
| Private push readback | Remote branch exactly 6b90bcf before this evidence-only commit |

Local command logs are in the parent task directory: `lead-recovery-candidate.log`, `lead-recovery-focused.log`, `lead-recovery-schemas.log`, `lead-recovery-runtime.log`, `lead-recovery-parity.log`. No private DB or raw backup is committed.

## Full data evidence and remaining independent gate

Feature's exact correction delivered a complete full-data PASS receipt in `docs/evidence/f14-recovery-20261031/FULL_DATA.json`: six HTTP draft/comment cycles, four exact recovery roundtrips at 85,510,917 bytes without revision/context growth, five atomic malformed rejects, and legacy namespace compaction plus three stable HTTP recoveries. This is Feature evidence, not Lead's independent result.

Lead also started the same full-data command after integration, before adding the media-union correction. Its Node process therefore loaded runtime aac7450/f05806f, not final 6b90bcf. At this evidence checkpoint it has passed the bounded reader-8 updater/preservation rehearsal, six actual HTTP save/comment cycles and the first exact 85,510,917-byte HTTP recovery. The complete run remains in progress and is **not claimed complete**. Read its private receipt at `tmp/lead-recovery-20261031-1636/receipt.json` and parent `lead-full-recovery.log`. Its source baseline and legacy source are read-only; it mutates only its disposable output. Independent review must exercise final 6b90bcf including the retained-media contract, and close RR-FIRST2-F14-01 before installation.

## Mounted Browser after migration

An additional consistent disposable copy of the earlier native-test database was migrated to reader 10 without changing its existing synthetic saved heading/note. It is served at `http://127.0.0.1:63492/`, PID 6392, exact code 6b90bcf, runtime SHA256 `3105779faa90e6ba5f6a51c13387f5c53f35547b3b68cbb7b6956af283727bc4`. This database contains synthetic native-test work and must never be installed.

Using only the mounted Browser, Lead selected Author, opened Memory, opened Edit lesson, inspected the rich editor and six-page selector, opened the saved Preview, observed the saved synthetic heading and original numbered rich source with a real enabled Continue, then exited Preview. The private migrated source-block note was visible as open/current with its original body and stable `MEMORY-A2.learn.try-first` pin; Go to source selected that page. This was a migration read/Preview smoke check, without adding a new edit/comment or restoring from a native downloaded file. Actual app Blob/download/file-selection/confirmed HTTP restore is covered by the executed candidate tests. A guessed preview selector did not match; the subsequent actual page snapshot established the rendered Preview. No native reload, screen-reader, OS clipboard or new device/viewport pass is claimed.

The broader mounted fourteen-item walkthrough and its exact limits remain in `BROWSER.md`; this correction does not replace those observations with a blanket native pass.

## Installation status

No live writes, stop, reset or installation occurred. The installed demo remains `http://127.0.0.1:63358/`, code 73e242e, reader 8/content revision 5. The final update must run against a fresh consistent snapshot of that original database, using exact-SHA guard and the current bounded updater; no synthetic disposable database may be copied into it. Installation, served readback, same-build restart preservation and final QA/UX/Guy acceptance remain pending. The known four isolated consonant recordings remain unchanged. No WordPress, production or main change occurred. No related automations exist on this bot.
