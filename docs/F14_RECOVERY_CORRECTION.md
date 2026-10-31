# RR-FIRST2-F14-01 correction

31 October 2026. Feature-owned correction based on Lead `43a40ca7181a2dea6ac23c1f6121f29b007f1e06`, isolated branch `fix/f14-lossless-recovery-20261031` in `hebleo-3/f14-recovery`. No live installation, main integration, WordPress, source teaching, audio, learner activity semantics or approval gates changed. Independent re-review and Guy acceptance remain pending.

The independent blocker demonstrated six ordinary saved-draft comments exporting 226,409,423 bytes which the app/server refused to restore. Two prior restores also duplicated revisions/contexts. The correction retains full immutable context through base-bound, content-addressed JSON deltas; reuses revision snapshots one-to-one; and checks the exact compact downloaded/exported UTF-8 representation against one client/server restore bound. See [storage contract](INLINE_AUTHOR_REVIEW.md#storage-recovery-and-integration).

## Reproduction

Only supplied read-only source databases are accepted; every Store mutation occurs under a fresh `--output` directory. The baseline must match receipt `42a61a378a7f68d2d678910513de1fcade8434b926e88ac27f0f81c1ff479072`.

```powershell
node scripts/verify-author-recovery.mjs --baseline '<Lead checkout>/tmp/combined-final-rehearsal/before.sqlite' --legacy '../rr-combined-20261031/comment-growth.sqlite' --output tmp/recovery-full-final
npm run verify:candidate
npm test --prefix schemas
node schemas/tools/runtime-check.mjs --runtime .
node --test test/author-recovery.test.js test/author-review.test.js test/restore-integrity.test.js test/draft-api.test.js test/batch1.test.js test/matching-progress.test.js test/media-recovery.test.js
```

`verify-author-recovery.mjs` applies the actual bounded updater to a copied 23-lesson database, runs six distinct HTTP impact/save/comment cycles with explicitly synthetic headings/notes, then four exact export/restore roundtrips and create retries. It compares whole reconstructed workspace hashes, every comment/request/quote/audit/token, revision rows, learner states, exact serialized byte lengths and all-table/sequence receipts on malformed rejection. It separately compacts the reviewer's reader-9 six-full-context database, checks every original full context, and runs three more HTTP roundtrips. Source receipts are checked again at completion. Local databases and logs remain ignored.

The unit and actual app DOM/HTTP regressions cover general JSON unknown fields, arrays/deletions/nulls/prototype-named properties, large shared draft-only fields, missing/corrupt/unsupported chunk graphs, immutable base/token mismatch, UTF-16/Nikkud/emoji source and quote, original receipts/audits, one-to-one duplicate revision identities, legacy migration atomicity, oversized export refusal before artifacts, and the actual 200 MB restore body boundary. App tests click Export backup, capture its actual Blob, select that file and confirm Restore three times. They do not constitute mounted-Browser, physical-device or Guy acceptance.

## Evidence and limits

Final executed results and exact commits are recorded in `docs/evidence/f14-recovery-20261031/DELIVERY.md` after verification. Initial harness attempts are retained locally: asynchronous SQLite copy stalled and was stopped; a plain delta still repeated draft-only lexical data and failed the real pretty-printed file bound, prompting shared immutable chunks and compact backup JSON. Intermediate test runs exposed duplicate-revision mapping and fixture/timing assumptions, which were corrected before the final run.

Lead owns integration and renewed independent preinstall review on the exact delivered SHA. The full 23-lesson draft still requires human review of the 20 adapted legacy drafts before publication; this gate must not be waived. Apply remains Studio impact/review, and selective publishing is separate work. No live installation or new native UX acceptance is claimed. The four isolated consonant recordings remain outside this correction.
