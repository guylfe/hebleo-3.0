# Remaining deck Settings wait — bounded investigation

Guy asked on 10 November2026 at13:36Israel to see whether the waiting time could be reduced further, preserving freshness, authorization, account/deck boundaries and Save/Cancel. The installed permanent source was independently verified unchanged from runtime241d7c6 / evidencef05ed9b before adapting earlier measurements.

## Actual measurements

Three normal authenticated page loads, each with a first Settings open and one repeat, were measured at13:49–13:55Israel. Web used the same MutationObserver/rAF/resource probe as before, extended to record scoped Server-Timing entries. Lead copied the actual artifacts, verified all four hashes and independently recalculated every duration from raw timestamps.

| Metric | Measured result |
|---|---:|
| Populated enabled usable Settings, first open median (3) |2914.2ms|
| Populated enabled usable Settings, repeat median (3) |2852.8ms|
| PHP request start→native handler entry |2495.895–3144.683ms|
| That pre-handler interval / first-byte waiting |90.24–92.18%|
| Settings SELECT |0.649–1.219ms|
| Whole handler including SELECT |0.682–1.267ms|
| Remaining first-byte interval |234.753–292.045ms|

The dominant measured interval is before the Settings handler. Query tuning offers at most about a millisecond here. The query already uses the user_deck index as a const lookup with estimated1row; supplementary current-account/deck warm SELECTs were2.497/0.543/0.422ms. No query/index change is justified.

Pre-handler time is request wall time, not CPU time or an identified plugin. Residual time combines uninstrumented transit/queue/response work, not a pure network measure. The sample is slower than the historical1173.1/1275.5ms medians; different load/time conditions and a small uncontrolled sample do not establish a code regression or a guaranteed future result. Feedback and populated controls appeared together. No shell/spinner improvement was counted. Browser timestamps are DOM/frame proxies, not physical paint. No particular startup callback was blamed, skipped or disabled.

## Temporary measurement and restoration

Only the existing authenticated-success path of ajax_get_deck_settings was temporarily instrumented. Native nonce/current-user/deck handling, SQL/results and the normal frontend dispatcher were retained; all plugin/security startup callbacks still ran. PHP lint and16unchanged-handler/dispatcher boundary checks passed with zero synthetic database writes.

The original card_loader.php SHA256a6f6a408a4617ce040d3ecb511b81a1d49b0479d52d9044f5aa0c6d598933314 was backed up outside the web root. Temporary hash0fe74a1db174fb2a304c9c5fc7d8e864a955751e4cff21979c9713df70bb8031 was installed by an explicit function-scoped patch. The initial full-file deployment attempt did not execute; a JSON-only parser lost its explanation. Subsequent calls retain raw results before parsing, and the smaller explicit patch succeeded. No failed attempt is counted as an installation.

At13:56:51Israel the original exact bytes were restored under the release lock. A separate14:03:44Israel read-only snapshot confirms all57protected plugin files equal their before-investigation hashes and current-account/deck settings/progress/sessions/account-streak inventories are unchanged. No all-user query was attempted. All six browser samples retained the found values and Cancel behavior; no preference Save, study, reveal, grading, account or selection writes were used. Native runtime and previously delivered text/NEW/centering assets were not modified. No permanent speed change is installed from this investigation.

## Click-wait alternatives and decision

Source inspection shows that renderDeckSelector already receives settings in the overview response, but opening Settings currently waits for a new authenticated read. Reusing the completed overview/preload snapshot could remove the extra click-time round trip; it can also display preferences changed in another tab/device after that snapshot. Existing ajax_save_deck_settings replaces the row without an expected-version condition. A completed cache plus that unchanged Save can overwrite newer values. The task-folder synthetic counterexample demonstrates this risk without any live writes; it is not an implementation or comprehensive lifecycle test.

Sharing only a still-in-flight pointer/focus request would avoid retaining completed cached values and overlap some user-intent lead time. It would still wait when clicked immediately or after that request completed, add expensive startup requests for abandoned intent, and has no measured useful reduction across the current first/repeat interaction. It has not been deployed or represented as a speed fix.

The smallest proposed fast-open design needs a freshness decision: permit a clearly marked snapshot no older than15seconds to populate the same account/deck form immediately, revalidate in the background, and use conflict-safe saving so newer preferences cannot be overwritten. Missing/expired snapshots and early clicks retain the fresh-read fallback. Approval would be followed by isolated early/repeat-open, successful/failed-save, navigation/deck/account, stale-response, external-change and error-handling tests plus live read-only timing/Cancel verification. No preloading/cache or Save-path change has been implemented before that decision. Allowing temporarily older display is a change to the current fresh-on-open requirement and cannot be silently inferred from a speed request.

A request-cost optimization would instead require identifying a concrete startup component with further request-scoped profiling; this evidence does not justify bypassing WordPress/security bootstrap or changing hosting. No paid infrastructure, plugin disabling, migration, broad hosting/metadata audit or unrelated feature work was undertaken.

## Delivery and limits

Evidence root: Lead task e7336a3b-e32d-42a8-8550-cfc8ed07e838/settings-wait-20261110. LEAD_PROFILE_REVIEW.json records the bounded independent review; PROFILE_RESTORE_RAW.json and FINAL_READBACK_RAW.json prove restoration; profile-evidence contains Web's report/probe/raw samples/hash list. Raw account/settings state remains outside Git. The feature branch documentation/evidence checkpoint contains no runtime change from241d7c6; main publication is not retried. Existing related temporary monitors remain disabled with no next run; no new monitor was created.

No further safe useful speed improvement was established in this bounded assessment. The demonstrated bottleneck, restoration and concrete fresh-display tradeoff are delivered to Leo for Guy's decision. Non-admin performance, startup-component attribution, physical devices/paint, real preference saves, active study, assistive technology and Guy acceptance remain unverified.
