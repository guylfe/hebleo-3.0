# WordPress background-saving integration and verification

Current candidate source: `15a433fc17c350167ee80b6a01ece682bd8627a4`, recovered from the existing WordPress branch and integrated into Lead's isolated feature branch. The installed app785ab53 and its data/configuration are unchanged. WordPress production has not yet been installed at this checkpoint; independent corrected-candidate closure and guarded installation/readback remain Lead work.

## Corrections and source identity

Saved8c8e566 fixes the settled-receipt lifecycle without rebuilding the shared core: a receipt can be retired only after a subsequent authoritative observation and matching fresh version ticket, with pending/sibling fences retained across acknowledgement and stale-refresh races. Original failing later-version regression, repeated versions, restart/reload and race checks pass.

15a433f removes literal rotating transport-nonce binding from durable ticket validity while retaining request-level current WordPress nonce validation, authenticated user/site/origin, exact card/version and immutable intent checks. Existing tickets remain usable. It uses millisecond UTC server time, rejects every future answer and does not clamp/replace the captured answer time. FSRS still receives validated whole seconds; its algorithm is unchanged.

The complete32-file candidate was independently regenerated from the approved inner-padding29-file baseline plus original27-file baseline. Manifest SHA256: `849d1d9f29cf72baba50301e965949665ed51e36d50a681b43729d0e12f95a36`; archive `96a04404eddd6fa535af66f8d449fedded7e71e34cdd81e8b0fa074ad6546eb3`; protocol `b4089e8913a7326756fb28098469cf5928b65ed0b08a0fcec5a16724d755cf49`; client `fd39f22ce13af8a610af854fcecf945fcd2ae902e9a1e53dbc4c55bb1eee2754`; shared core `6a69e152548e07005c6526557abcad5924ca94e9b30a40bc37de38a1e8329ad2`. Only two existing runtime files change; three assets are added. The original card templates/content/audio/settings/IDs and16px inner inset remain exact.

## Executed evidence

Lead regenerated the final candidate and passed **13 WordPress event/DOM +15 shared-core tests**,28total,0fail. Earlier native run on74eadd7 passed415scheduler+51reopen+120UTC/DST/locking/fault+27background+2concurrentduplicate+57burial+3reopen+3concurrentsibling checks. Since protocol changed, Leo-Web repeated that native suite on final15a433f and added13 real WordPress handler cases plus the original nine Architect probes, all passing. Those latter executions are peer evidence; independent final closure is recorded separately.

Lead's mounted Browser then exercised the exact final32 files on a disposable copy of the native WordPress7.1.4/MariaDB11.4.13 fixture, with synthetic notes/cards only. This run used normal test-account login, the candidate's compiled archive JavaScript, real WordPress AJAX/nonce/authenticated handlers and real MariaDB scheduling/receipt transactions. The fixture-only page wrapper extracted the candidate style/script; it did not replace study methods, storage or server transport. These are plain synthetic templates, so the run does not establish shared iframe/media latency or production visual acceptance.

- Good on synthetic note191 advanced past its sibling to note192. Next context21.6ms; next context plus two animation frames51.3ms, with Hebrew ב visible and a mounted screenshot showing one pending review. These are browser rendering-readiness marks, not physical display scanout.
- Receipt status HTTP took511.4ms; actual save HTTP took509.4ms. The save response was deliberately withheld for10seconds after it returned. Next card did not wait. The server's accepted-answer-to-lock/commit timestamp delta was1031ms, including ordered lookup/arrival; this is not a server CPU-duration measurement. Screenshot01-native-next-pending.png and01-held-response.json retain evidence.
- A second real save returned in495.4ms, then its response was deliberately lost. The next card appeared; durable state retained the exact original intent and showed a recoverable error. Reload and reopening the same deck recovered the original committed receipt, left pending0 and showed unrated note193. No second scheduling write occurred.
- Independent PHP readback found exactly one repetition for each rated card and zero for its sibling and the unrated third card: `[1,0,1,0]`. Both original request IDs/receipts and captured answer times remain. All32 fixture runtime hashes still match the final manifest after the run.
- Own PHP/MariaDB helpers stopped cleanly; the Browser task page returned to blank. No production requests, data or reviews were used by this run.

Private evidence in this task: `.private/wp-browser-protocol-20261106/` contains PREPARED.json,01-held-response.json,02-lost-response.json,03-backend-readback.json,04-reload-recovered.json, screenshots, process/cleanup receipts and server logs. Lead's generated artifact and tests are `hebleo-background-review-20261106/evidence/candidate-protocol-lead*` and wp-protocol-lead-tests.log. Fixtures and databases are not committed.

## Delivery gates and boundaries

Candidate WordPress reference CI42255574121 passed. Candidate app CI42255574445 was still running at its single read; no result is claimed here. Lead adds syntax guards for the new adapter source to WordPress CI; final integration CI is recorded after push.

Independent Architect corrected-revision review, fresh production backup, guarded file installation and destination/data preservation readback remain pending at this checkpoint. No new decks/features, app reinstall, reset/reseed or database rollback is part of this WordPress release. Native simultaneous-tab/suspension/device/accessibility and authenticated production review timing remain unverified. Existing streak update remains outside the scheduling transaction; exactly-once scheduling does not claim atomic streak recovery. Guy acceptance is unreported.
