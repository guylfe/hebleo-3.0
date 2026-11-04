# WordPress layout candidate — 4 November 2026

Candidate corrected after Lead's client-save probe; no live writes, Git mutations, commits, pushes, imports, scheduler edits, app edits or installed-demo changes. Lead owns combination, independent review and installation. Browser verification is partial; do not mark Guy acceptance passed.

Root: `C:\Users\Trans\.openmausbot\task-workspaces\8c900356-50f6-4d41-bbb9-50c8abe09233\d93ac18d-de54-4035-ad88-9628a2b2e5df`.
Code under `hebleo-wordpress-study/adapters/wordpress/`; private outputs under `wordpress-study-20261104/work/layout/`.

## Changed files and runtime contract

- `study-layout/generate.mjs`: deterministic, pinned SHA256 baseline archive generator; fails on unknown baseline or changed/duplicate anchors. Preserves all existing request/scheduler/audio code and four server interval expressions. Removes recall instruction, preserves counters after reveal and focuses first rating.
- `study-layout/study.css`: CSS appended into generated archive. Natural document height, no 300px flip viewport/nested vertical scroller, available width, responsive four-column ratings, secondary Suspend and counters.
- `study-layout/card-layout.css`: WordPress-only sandbox display adapter. Spacious answer/support columns above 560px; stacked below. Tables retain their existing contained horizontal scrolling when content requires it. Authored colors and emphasis remain intact.
- `shared-cards/frame-bridge.php`: inserts the static scoped card CSS at presentation time and hashes the updated bridge script into each sandbox document's existing CSP. Raw saved documents/fields untouched; global parent CSP unchanged.
- `shared-cards/frame-child.js`: moves existing prompt/solution/support DOM nodes, retaining text, attributes and existing listeners; all tense controls remain independent. Existing theme/Nikkud message source and exact-shape checks retained.
- `shared-cards/frame-host.js`: accepts finite heights up to 1,000,000px rather than clipping at 2400px; exact known iframe source and message shape required. Synchronizes outer study theme with the existing stored card theme.
- `study-layout/{fixtures.php,serve.mjs,test.mjs}`: isolated actual-card fixture generation, read-only local fixture server and executable checks. Do not install these test files publicly.

Runtime installation requires generated `archive-decks.php`, the three modified shared-cards files, and `study-layout/card-layout.css` at the plugin root's sibling directory. `study.css` is already inlined into archive; no new enqueue needed. `shared-cards.php` unchanged, including `sandbox="allow-scripts"`, no same-origin permission and no-referrer policy. No schema/identity/API/entitlement changes.

Scheduler integration contract: existing `currentCard.intervals.{again,hard,good,easy}` remain server-supplied display strings, unchanged. No production preview intervals, sorting or hardcoded values added. Fixture labels `SERVER AGAIN/HARD/GOOD/EASY` exist only in serve.mjs. Combine scheduler's generator against its separately owned card_loader.php output; this generator writes only archive-decks.php and its manifest.

## Actual commands and results

Run from repository or another folder with the paths expanded. Set `ROOT` to the above root, `ADAPTER=ROOT/hebleo-wordpress-study/adapters/wordpress`, `WORK=ROOT/wordpress-study-20261104/work/layout`.

```
node ADAPTER/study-layout/generate.mjs ROOT/wordpress-study-20261104/baseline-plugin WORK 30836c7b498cdd3bb72cab63f0fea3087cfae51de07b593408b137c039a9200f
php -d memory_limit=1024M ADAPTER/study-layout/fixtures.php ADAPTER ROOT/wordpress-live-v22-20261103/wordpress.json WORK/fixtures.json
node ADAPTER/study-layout/test.mjs WORK ADAPTER ROOT/wordpress-live-v22-20261103/wordpress.json DEPENDENCY_ROOT
php -l ADAPTER/shared-cards/frame-bridge.php
php -l WORK/archive-decks.php
node --check ADAPTER/shared-cards/frame-child.js
node --check ADAPTER/shared-cards/frame-host.js
```

All passed. DEPENDENCY_ROOT used was this task's hebleo-3 working directory (existing jsdom 30.1.1); no dependencies installed. First PHP fixture attempt hit default 128MiB; rerun with 1024M passed. Tests cover 40 actual documents / ten notes / both directions / both sides, including noun, long notes/examples, verb, adjective, inflected preposition, participle and pronoun. Verify exact raw fields, text-node multiset, original DOM node preservation and recording URLs; execute actual source behavior to check independent tense panels and trusted-only theme/Nikkud settings; reject spoofed/nonfinite/extra-key frame messages; retain heights >2400px; assert deterministic generation/hash refusal and actual StudyApp reveal, counters, Suspend, rating focus and all four supplied interval values. jsdom checks establish no geometry or audible evidence.

Read-only Git status with command-scoped safe.directory showed only the three assigned shared-card changes, new study-layout directory and teammate-owned study-scheduler directory. No global Git config edited. Initial plain Git status refused repository ownership; scoped safe.directory read succeeded.

Generated archive SHA256 (corrected): `4d87069c06b1038c451ed1322048f9e8f13991b7dd4224fc7748680c4b18146b`.
Baseline archive SHA256 remains `30836c7b498cdd3bb72cab63f0fea3087cfae51de07b593408b137c039a9200f`.
Exact per-file corrected source/runtime hashes and before/after deltas are in private `work/layout/hashes-v2.json`. Prior `hashes.json` is retained as historical evidence.

## Mounted Browser evidence and remaining checks

`work/layout/browser-evidence.json` contains actual mounted Browser results. Read-only fixture navigation reported:

| Container | Actual note/direction | Outer horizontal overflow | Ratings same row | Visible frame height |
| --- | --- | --- | --- | --- |
| 360px | mf-000938 verb he-en | 0px | true | 745px |
| 390px | mf-000422 adjective en-he | 0px | true | 877px |
| 740px | mf-000640 long noun notes/examples he-en | 0px | true | 1766px |
| 1120px | mf-000938 verb en-he | 0px | true | 621px |

These are real rendered container-width checks at the Browser's desktop viewport, not device emulation or short-landscape-height checks. Snapshots expose all four ratings, Suspend, Nikkud/theme and actual form/playback controls. Browser repeatedly lost the page between calls (about:blank), so multi-action manual checks could not complete. One screenshot was blank; no successful visual screenshot is claimed. Native keyboard/zoom, light/dark appearance, expanded dense-verb geometry, physical phone, audible playback and installed WordPress behavior remain unverified. Automated interaction checks are separate from those gates. Existing legacy frame-host.test.mjs expects the old 2400px cap and minimal mock document; use the new scoped test for revised height/theme behavior, and Lead may update the older regression under its ownership.

Startup (only loopback, no persistence):

```
node ADAPTER/study-layout/serve.mjs WORK ADAPTER 63443
```

Open `http://127.0.0.1:63443/?width=360&id=mf-000938&dir=he-en` in the mounted Browser. Supported container widths: 360,390,740,1120. `mf-000300` is an inflected preposition. Fixture starts revealed and uses sentinel intervals, not real scheduling. Server responses read actual private fixture documents; do not publish them. No standing automations exist for this task.

Next owner: Lead Engineer. Review actual changes, combine with scheduler, run native visual/keyboard/zoom/expanded-form/audio checks, update shared feature ledger within lead ownership, then apply independent review and guarded install/readback. The candidate is not a completed installed release.


## Lead correction delivered — 4 Nov, follow-up

The earlier checks omitted rejected/uncertain/concurrent save outcomes; Lead's executable probe exposed the existing bug. Prevention is now an executable actual-StudyApp regression suite, not an assertion about source strings.

Only the generated archive changes at runtime in this correction. Generator reads the new owned rate-method.txt; this is build input, not a plugin runtime file. It replaces the actual rateCard method with a strict response.success === true acknowledgement boundary. No counters/currentCard advance while pending or after rejection/transport/JSON failure. A pending guard disables rating, Suspend and Back and prevents programmatic concurrent rating/Suspend/startStudy/showDecks. On an unconfirmed result it keeps the card/counters, displays an accessible alert, enables Back, and keeps rating/Suspend blocked for that card instance. Returning to decks and reopening fetches fresh server state. No automatic or blind manual resubmit is offered. On confirmed success it updates the original state-specific counters once and advances once; a completed-card WeakSet also rejects stale duplicate calls. Existing request IDs/intervals/audio/source markup remain unchanged.

Actual corrected commands (ROOT and ADAPTER/WORK as above):

    node ADAPTER/study-layout/save.test.mjs WORK ROOT/hebleo-phrases
    node ADAPTER/study-layout/test.mjs WORK ADAPTER ROOT/wordpress-live-v22-20261103/wordpress.json ROOT/hebleo-phrases
    php -l WORK/archive-decks.php

All PASS: 5 rejected/uncertain response cases, 16 state/rating combinations, pending and stale duplicate suppression, Back reconciliation path, and all 40 original document preservation/independent tense/settings/security checks. Output: WORK/CLIENT_SAVE_FIXED.json. The absolute dependencyRoot actually rerun for this follow-up is ROOT/hebleo-phrases. The earlier current-task hebleo-3 path was outside ROOT; do not use nonexistent ROOT/hebleo-3.

Archive delta: d2866ff9cec767707816cc8b07927b163785b4835f4de2d41b3a658ab2cabd08 -> 4d87069c06b1038c451ed1322048f9e8f13991b7dd4224fc7748680c4b18146b. Immutable corrected copy: WORK/v2/archive-decks.php; WORK/v2/layout-manifest.json. No candidate-v1 files touched.

Browser follow-up evidence: WORK/browser-followup.json. Navigation loaded the corrected candidate with all server sentinel ratings and verb controls. The next call returned about:blank with viewport1262x568 and zero iframes. A requested resize to740x360 therefore did not verify the candidate at that height; Tab also ran on blank. Screenshot attempt produced a blank image again and is not visual evidence. Core mounted tools provide no viewport/device emulation; no alternate automation route used.

To recover bounded expanded-form evidence despite page loss, serve.mjs supports expanded=1 using fixture-only browser-check.js, separately hashed in a copy's sandbox CSP. This instrumentation never enters runtime plugin outputs, never changes raw saved documents or parent CSP, and invokes the actual original tense/theme/playback controls. Browser navigation snapshots measured:

- mf-000938 he-en at360px container: five panels expanded, frame294px wide, zero horizontal overflow, primary/support stacked, body1985px.
- mf-000938 en-he at1120px container: five panels expanded, frame1054px wide, zero horizontal overflow, primary/support side by side, body1750px.
- mf-000938 en-he at740px container: five panels expanded, actual dark mode attribute dark, frame674px wide, zero horizontal overflow, side by side; body1774px and iframe viewport height1774px (content is not clipped into a fixed inner vertical viewport).
- Sea playback was invoked through the existing original Replay button in the fixture; observed MP3 resource requests remained0 at capture. This proves neither a successful media request nor audible playback. Dark checkbox became checked on Sea, but its captured status was still light; no dark visual pass is inferred from it.

Native short viewport height, keyboard focus/traversal after real keypress, browser zoom, manual scrolling, light/dark visual appearance, physical phone, successful source media requests/audible playback and installed WordPress behavior remain unverified due the repeated page loss. Container-width and expanded geometry evidence are separate from these limits. Reproduce when the Browser remains stable: start serve.mjs with WORK ADAPTER 63444, open /?width=740&id=mf-000938&dir=en-he&expanded=1, use actual740x360 then360x740 viewport controls, Tab/Enter/Space on controls, browser zoom200%, open each tense independently and scroll to ratings. Test mf-000300 preposition, mf-000422 adjective, mf-000640 long notes and mf-000001 playback in both directions/light-dark. expanded=1 is test setup only; it is not a product feature. All fixture servers started for this task are stopped before handoff.

Lead's next step: independently run save.test.mjs and preservation checks, rebuild combined candidate from the corrected archive (not candidate-v1), complete available native checks and independent review, then guarded installation/readback. Shared feature ledger remains within Lead ownership.

