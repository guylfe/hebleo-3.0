# Rendered author editing and optional Preview clearance

31 October 2026. Bounded feature candidate on exact integration base `4104fb35e577b974d76dc9b73bc438e2e28fd734`. No installation or live teaching draft changes. Lead owns integration, independent review, push/CI and any guarded installation.

## Behavior and source preservation

Edit lesson now presents the existing rendered heading and verified paragraph/list/heading leaves as the editable canvas. It uses the learner renderer, reading measure, typography and existing refinement tokens. Focus adds a quiet outline and a contextual Bold/Italic toolbar. The toolbar retains its flow space while hidden; otherwise blur could clamp document scroll between pointer-down and pointer-up, swallowing Save. A native single-click save after typing was rechecked after fixing the reader hidden-rule cascade.

Save draft is primary. Preview saved draft stays secondary and requires a clean saved token. Review changes navigates to existing Studio review; publication remains a separate action. Technical component/page context, raw HTML/Markdown, and explicit compare/reconcile controls are inside collapsed Advanced source. Existing `[name=author-source]` remains available to the independent QA harness. Page/section selectors use rendered titles.

`author/rendered-source.js` maps source leaf ranges to exact matches in the same sanitized learner projection. Markdown uses the locally served existing marked lexer; CRLF-to-lexer offsets map back to the original source. Each input patches only its mapped leaf. Ordinary HTML text edits retain the original tag/attribute/entity bytes where representable; structural/formatting changes replace only the edited leaf's inner range. Markdown leaf edits can become equivalent HTML inside that range; adjacent Markdown, list markers, sibling leaves, source comments and whitespace retain their exact original bytes. The original source string is kept independently of the hidden textarea, which normalizes CRLF. **The whole rendered projection is never serialized as replacement teaching source.**

Nested/task Markdown lists, blockquotes and otherwise unverified/complex structures remain readable and use Advanced source; they are not guessed editable ranges. Enter does not create new blocks in the rendered leaf editor. Paste is plain text; IME composition commits at composition end. This is a bounded existing-block editor, not a replacement for Studio's structural authoring tools. New source code requires only the server static-asset allowlist entry; there is no API/schema/ID migration or new dependency.

`studio/workspace.js` is unchanged. Its full-draft/CAS collector receipt and exact-value acknowledgment callbacks from `4104fb3` remain unchanged. Shared/departure saves retire only sent buffers, failures retain buffers and unsent comments, and newer pending inputs remain dirty. The complete saved draft still includes sibling Studio changes and unknown metadata.

Private notes continue to use stable lesson/component/page/field context and the existing server projection/UTF-16 exact-quote validation. Transient editor ranges are not content or comment IDs. The composer shows the selected quote or full block text before submission. Notes remain author/assistant-readable and are excluded from learner responses. A native paragraph selection created a server-validated synthetic quote note in the disposable candidate only.

## Shared dock correction

The existing dock owner now clears focused summaries as well as inputs/buttons. Native detail toggles and pointer entry use the same measured interval. On returning to an optional comparison page, the reader explicitly reveals its genuine summary before hit testing. It does not open the disclosure, create a new page, require comparison, or take Continue's primary slot. Ordinary reading scroll remains unpinned.

Native Browser review at 1280×720 exercised saved Preview pages 1–6, then page 6 → Back → page 5. The collapsed summary's bottom was 436.28125px, above dock top 635.609375px; midpoint hit testing returned SUMMARY. A real click opened it. Continue remained enabled. The focused comparison input occupied 283.453125–363.453125px, above that same dock, retained `0704`, and did not gate Continue. These measurements are native evidence; separate simulated-geometry regressions cover learner and dialog focus/reflow and reading-scroll independence.

## Verification and handoff

Commands and final counts are recorded in `docs/evidence/rendered-author-20261031/DELIVERY.md`. Regressions cover mixed HTML/Markdown heading/sentence/list edits, bold retention, exact untouched bytes/CRLF/unknown source metadata, full HTTP draft saves and saved Preview, quote/block notes and learner exclusion, 400/403/409/503 retention, pending acknowledgment, original independent QA navigation/reconcile cases, and measured dock clearance.

The disposable runtime starts with `node scripts/start-rendered-author-candidate.mjs` (default port 63471; `PORT` may override). It opens only `tmp/rendered-author-candidate.sqlite`; it never opens the installed demo database. The database contains only fictional seed data, a first-two review fixture with unavailable image references omitted, and clearly labeled synthetic author edits/notes from review. It must never be installed. Stop the existing candidate process before restarting that command. Root dependencies and `schemas` dependencies must be installed locally; this checkout reuses the existing root dependencies through an ignored junction, and schema dependencies were installed with `npm ci --prefix schemas --offline`.

No teaching pack, MNTL source, other22 teaching drafts/history/media/settings, reader10 recovery code, main, WordPress, external configuration, manufactured audio or publication changed. Four human consonant recordings remain a separate unfinished item. Full-data recovery was not repeated because those owners and contracts were not modified. Independent QA/UX of this final candidate, narrow viewport/zoom/assistive devices, physical touch/APK and Guy acceptance remain open.
