# Independent bounded native UX completion

Verdict: PASS for the requested rendered edit → Save → ordinary saved Preview, persisted private readable context, and page 6 → Back → 5 pointer/keyboard/input-dock checks. This is a bounded desktop verdict, not general release or Guy acceptance.

Candidate: http://127.0.0.1:63472/; revision 0e874af56765ce16b929b1aa55974f121a86f8c3; runtime 524058a51ac9600a294e6642d5eefa1e8e76538287e0a4bb0c5ff859388d190a; preservationMode true. Independently read before and after. Viewport 1280×720. Date: 31 October 2026, Israel time.

## Native checks completed

| Check | Observed result |
|---|---|
| Rendered editing | Through Your path → Continue → Edit lesson, inserted clearly labelled synthetic text in heading, paragraph and first list item. Advanced source stayed collapsed. No source editor used for these edits. |
| Save | Click saved once. Status progressed from Saving complete workspace draft to Draft saved. Preview it, then Review changes separately. No save repeat. |
| Ordinary saved Preview | Preview saved draft opened normal rehearsal. All three new insertions present. Existing strong experience markup and three ordered list items preserved. Final saved draft HTTP readback matches native edits. |
| Natural page route | Continue to page 2 → page 3 Play → natural ten-second expiry → Show me how → Continue to 4 → 5 → 6 → Back to 5. No state/DOM mutation used to reach these states. |
| Pointer after Back | Collapsed optional comparison summary rect y=400.28125–436.28125; dock top=635.609375. Hit test returned SUMMARY. Native pointer click opened it. |
| Input | Native Tab moved from summary to TEXTAREA. Native fill 0704 read back unchanged. Input y=283.453125–363.453125 stayed above dock top=635.609375; Continue enabled. |
| Keyboard disclosure | Shift+Tab focused SUMMARY. Space closed, Space reopened. SUMMARY retained focus; 0704 retained. Screenshot shows focus ring, readable input and dock. |
| Persisted private context | Independently opened both existing quote and whole-block Original source context disclosures. Quote experience and full original teaching block are readable. Go to source returned to teaching canvas and focused it. Visibility copy says comments are visible only to authors. |
| Privacy readback | Same-origin GET with actual fictional profile header: author-demo 200 (2 author-visible comments), learner-core 403. An earlier fetch without any profile header returned 403 and is excluded from this comparison. |
| Final readback | Exact build/runtime unchanged; 23 lessons; saved page MEMORY-A2.learn.try-first has intentional title/html edits. |

## Observations and limits

- Comment state freshness: immediately after Save, existing notes still displayed current, although new source text had changed. Explicit Reload comments refreshed both to changed, with original version 6 context retained. This is a nonblocking freshness issue for the requested readable-context check; Lead should track it separately. No silent reanchoring was inferred.
- Fresh quote creation was not established in this run. Native Home / Shift+ArrowRight and Control+Home / Control+Shift+ArrowRight reported success, but textarea selection readback stayed collapsed at index 293. No synthetic selection or DOM event was substituted. Persisted quote/block context was the completed independent branch expressly allowed by the brief.
- One initial Save click was refused because sticky navigation covered its click point at scrollY 362. Native scrolling up 350 px exposed the control, then the click worked. No foreground/computer fallback was used.
- Two waits for the wrong completion phrase Saved workspace timed out. Direct status readback and screenshot then proved actual completion text Draft saved. This was not a failed Save; no claim about total save latency is supported by those waits.
- Browser was reopened after idle, then the candidate loaded normally. Some navigation clicks initially returned no text change; subsequent state reads confirmed navigation.
- Narrow width, zoom, physical touch/phone/APK, screen reader, audible media and Guy acceptance remain unverified. No broad audit or tests rerun.

## Scope / handoff

Only isolated 63472 candidate draft was edited, with synthetic labels. No live 63358 database, production code, sourcepack, audio, publication or installation changes. This candidate database MUST NEVER install. No private note was added or resolved. Lead owns integration/install decisions and freshness follow-up.

Screenshots: saved-preview.png, back5-dock.png, private-context.png. Raw relevant readings: NATIVE_UX_EVIDENCE.json. No related automations exist.
