# WordPress study scheduler candidate

Candidate only. No live installation, import, publication or source/media edits.

## Pinned reference

Faithful scalar PHP port of the official open-spaced-repetition **py-fsrs 6.3.2**, FSRS-6.
Reference wheel SHA256 `bc55066c821164b1cff6d75b17a3ed8e86cfd45789e3d775cfcb895319ce9ba4`.
Reference sources and MIT copyright/license are under `upstream/`; no Python runtime is needed on WordPress.
Primary references: https://pypi.org/project/fsrs/6.3.2/ and https://github.com/open-spaced-repetition/py-fsrs .
The PHP port implements scalar review/state transitions; optimizer, fuzzing, rescheduling and parameter training are outside this bounded change.

Policy is upstream defaults: retention .9, 21 default FSRS-6 weights, learning steps [60,600] seconds, relearning [600] seconds, maximum interval 36500 days. Fuzz is deliberately disabled so identical state/time/grade yields identical preview/save. These are upstream policy defaults, not copied mockup intervals. New-card previews are Again 1m, Hard 5m30s, Good 10m, Easy 8d. We do not sort grades or manufacture intervals.

## Native integration

`generate.py BASELINE_PLUGIN OUTPUT_PLUGIN` refuses any baseline loader other than SHA256 `803bfbc4c2c1f07f1090c20ef671a6750bbf58f098dd3362a48d7ee04d163a8e`. It emits the patched `templates/card_loader.php`, `study-scheduler/fsrs.php`, `study-scheduler/wordpress.php`, and `study-scheduler/LICENSE-py-fsrs`. It never edits the baseline and never touches archive/shared-card/UI files. Lead combines it with the independent layout patch. Deploy the four files together; do not deploy tests/reference Python.

Existing `prepare_study_card` and `ajax_rate_card` remain the native entry points, nonce/user/parameter checks and shared-card filter remain. Both call the same adapter/core. Native rating success remains `Card rated` for current client compatibility. Failure returns JSON error and does not report success.

UI contract keeps `intervals: {again,hard,good,easy}` server-generated strings. Extra `schedule_previews` has each grade's `interval_seconds`, `due_utc` Unix seconds, `next_review` WordPress-local SQL datetime, `state`, `step`. `scheduler_preview_at` is server UTC Unix seconds; `scheduler_version` pins semantics. The client must display those server intervals, never mock constants. Save recalculates using the current server clock, never trusts a client-supplied interval/time. Exact preview/save equality is defined at identical state and clock; elapsed time between requests can legitimately change the result. Preview creates no metadata or database writes.

## RR-SCHED-01 / RR-SCHED-02 correction

The original four-file candidate passed scalar/native storage checks but failed independent native queue/concurrency probes. Historical fixture/results remain evidence of that original version, not approval of this revision.

RR-SCHED-01: actual rating now writes JSON schema 2 in `_hebleo_fsrs_v2_{progress_id}`. It includes **due_utc** and `next_review_local` in addition to exact memory/step/last-review information. Legacy v1 serialized metadata is read for memory only when no v2 row exists; no rewrite/migration is performed. Canonical 4-decimal **string** shadows allow identical SQL/PHP comparisons without floating-point rounding or DECIMAL casts accepting extra precision.

`due_sql()` supplies the join, validity predicate, eligibility and UTC order key for all native learning/relearning/review counts, study queues, and get_cards_due_for_review. Eligibility and ordering are applied by the database **before LIMIT**. User/deck/state/suspension/global-suspension/new-card/daily-limit/order/nonce/login conditions remain native. New-card queue behavior/custom order is unchanged. The helper selects p.* so joined metadata cannot overwrite progress object fields.

Schema/version/timestamp types and ranges, next > last, exact row state/date/shadow identity, memory numeric types/ranges and step constraints are checked in both SQL and PHP. JSON_EXTRACT always receives JSON_VALID-guarded content. The newest umeta_id alone wins for duplicate metadata keys; malformed/stale newest JSON never falls through to an older valid record and never multiplies rows. PHP reads that same latest raw DB row, bypassing potentially stale usermeta caches. A missing/malformed/stale v2 sidecar uses the **unchanged native local-string eligibility rule**; legacy ordering is projected using the current site offset, preserving legacy-relative ordering and permitting a common numeric key alongside v2 UTC dates. Ambiguous legacy local timestamps retain legacy semantics until actual rating creates schema 2; their lost historical offset is not invented. Changing the WordPress timezone does not invalidate valid v2 UTC dates when native stored shadow strings still match.

RR-SCHED-02: the native handler passes no pre-lock clock value. persist_rating accepts an optional clock callable and evaluates it only after SELECT FOR UPDATE and fresh committed metadata read. Default server clock/injection filter runs at that point. A valid committed last_review_utc later than the resulting clock is refused with transaction rollback and no native or metadata changes, instead of treating concurrent state as corrupt legacy. Same-second ratings remain valid transitions. Native error/success contracts and after-commit streak behavior remain unchanged.

SQL uses functions supported by MySQL 8.4 and MariaDB 11.4 (JSON_VALID/JSON_EXTRACT/JSON_TYPE/JSON_UNQUOTE, CASE, TO_SECONDS, scalar MAX subquery). No schema migration or new index. The default usermeta indexes support the bounded lookup; production query plans/performance are not claimed from the synthetic fixture. Lead reports live MySQL JSON functions and InnoDB capability; this specialist performs no live probe.

## Minimal persistence and preservation

No schema migration, reset, bulk rewrite or rescheduling. Only an actual successful rating changes that card's row. Existing IDs, native local date columns, assignments, membership/settings, suspension and authored fields/media are unchanged.

One JSON usermeta key `_hebleo_fsrs_v2_{progress_id}` per rated card holds schema/version, step, exact UTC due/last review and their native local shadow strings, state, exact float stability/difficulty and canonical decimal-string compatibility shadows. This is needed because integer scheduled_days cannot encode learning steps, local datetimes cannot disambiguate the repeated DST hour, and decimal(10,4) cannot retain upstream precision or all valid stability magnitudes. Native stability is a 4-decimal compatibility shadow limited to 999999.9999 only for the SQL column; the actual scheduler keeps uncapped upstream memory in metadata. Native difficulty remains 4 decimals. Native scheduled_days is whole elapsed 24-hour days (0 for minute learning); exact due is the explicit JSON due_utc, used for native SQL eligibility/order.

Exact memory is used only when version/local timestamp/state/native memory shadows match the row. External memory edits invalidate the exact-memory sidecar. Missing metadata defaults legacy learning/relearning to step 0; existing stored due stays untouched. Invalid/nonpositive/nonfinite stability, difficulty outside 1..10, bad/missing/future last_reviewed or unknown state deliberately initialize fresh learning on the next actual rating, instead of guessing historical memory. Preview uses the same projection without persisting the repair. Historical ambiguous local-only timestamps have no recoverable UTC offset: parse deterministically in WordPress timezone until their next actual rating stores unambiguous UTC.

UTC elapsed seconds use floor(delta/86400), exactly matching upstream. Day schedules are UTC 24-hour durations and may shift local hour across DST. Legacy native datetimes are parsed with wp_timezone(), not PHP process timezone. All newly stored native last_reviewed/next_review are formatted in WordPress timezone. Reps count actual ratings; lapses increment only Again from review, preserving the prior count.

Rating locks the existing row, reads fresh metadata, obtains the current clock, recalculates, updates its native fields and metadata in one transaction, then commits. Any SQL/metadata error rolls back and clears user metadata cache. Progress and usermeta tables must both be InnoDB: Lead must verify this deployment prerequisite against fresh live metadata. Existing streak update remains after successful commit.

## Checks and handoff

`test-upstream.py PHP_EXE OUTPUT_DIR` executes the vendored upstream reference and the PHP port against identical fixed-clock vectors. `adapter-test.php` covers read-only legacy mapping, exact memory, UTC conversion and DST folds. `run-native.py LEAD_ROOT PHP_EXE UNIQUE_FIXTURE_NAME` creates brand-new MariaDB system/application data on loopback 33419, copies approved WordPress/core/plugin files, overlays only scheduler outputs, activates the complete native plugin and exercises actual prepare/rate handlers. It refuses an existing fixture directory, creates no Windows service, sends no mail and shuts down its own DB helper in finally. Never reuse its DB/data directory. A normal existing WordPress theme is copied solely to support native bootstrap; no HTTP server/browser is started.

Native checks include all four native states and grades, minute due persistence, matching server previews, unchanged unrelated rows/content/assignments/settings, lazy repair, SQL-fault rollback, range overflow preservation, cross-timezone elapsed semantics and a separate PHP process reopening schedules/steps.

Results/provenance/hashes are in `wordpress-study-20261104/work/scheduler/`. Initial fixture history is retained with its failed reopen assertion; final pass belongs only to the explicitly named final fixture. Browser/phone/playback, combined layout, production installation/readback and Guy acceptance remain Lead-owned and unverified here. Independent combined-candidate review is still required before rollout.

## Correction regression commands

Run `node run-regressions.mjs LEAD_ROOT PHP_EXE NEW_UNIQUE_FIXTURE_NAME` after generating `work/scheduler/candidate-rr-final`. The runner is adapted from independent review probe/barrier evidence and uses complete native plugin bootstrap, synthetic new MariaDB data and no HTTP service. It executes prior native/reopen coverage, real historical Jerusalem queue/count/helper calls, mixed legacy/v2 UTC ordering before LIMIT, user/deck/suspension/nonce/login limits, malformed/stale/duplicate metadata validity parity, metadata INSERT fault rollback, and actual regressed-clock refusal. Two PHP processes then call actual ajax_rate_card with event barriers; information_schema.INNODB_LOCK_WAITS must prove a real lock wait before release. Second Good must become review for 172800 seconds at 00:30:03Z, with two successful ratings and exactly one post-lock clock call each. Helpers are stopped in finally; every repeat requires new DB data/name. No candidate-v1, baseline, UI or original reviewer evidence is edited.

Final correction evidence: `work/scheduler/native-rr-20261104-3` passed 415 native checks (the prior 414 plus explicit raw cached-JSON rollback assertion), 51 separate-process reopen checks, 120 native DST/validity/pre-limit/filter/fault checks and 5 concurrent-handler assertions. `lock-waits.log` proves an actual blocking InnoDB row lock. Scalar reference rerun: 534 vectors; adapter rerun: 86 checks. Runtime hashes match the passing fixture and deterministic regeneration. All temporary helpers stopped with exit code 0. Earlier candidate-rr-v2 and native-rr-1 are partial/failed history; do not install them.

Remaining limits: no production changes; live MySQL SQL execution/query-plan timing is not established by these MariaDB tests, though Lead supplied read-only JSON/InnoDB capability evidence. External persistent object-cache behavior and lost-connection-at-COMMIT outcomes remain unverified. Historical ambiguous local-only due timestamps deliberately retain legacy semantics until actual rating. Combined UI/browser/device/audio, independent combined recheck, live backup/installation/readback and Guy acceptance stay with Lead.
