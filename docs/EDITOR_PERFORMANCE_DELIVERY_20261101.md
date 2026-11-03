# Mature in-lesson editor candidate — 1 November 2026

Source/automated implementation handoff to Hebleo Lead Engineer. No live edits, installation, publication or Browser use. Baseline: `4433f2e0e8bcd319edd3189ba9016f8d9fa7ff12`. Branch: `feature/mature-lesson-editor-20261101`.

Checkout: `C:\Users\Trans\.openmausbot\task-workspaces\71c71389-5334-4e0c-9ca8-d80dd28223d1\653fb433-7485-48b1-9f7c-cb22711bda02\hebleo-3\.editor-performance`. This is an independent Git clone with its own node_modules, not a junction or modification of the running combined checkout. Commit identities and final command results are recorded in the accompanying receipt.

## Implementation

- `public/author/rendered-source.js`: genuine Markdown uses existing EasyMDE; HTML/mixed prose uses the mature rich editor, without a duplicated lesson display. Same-page context and separate specialized activity controls remain.
- `public/author/standard-editor.js`: locally bundled ProseMirror schema, commands, list/history/keymap/input rules/table support; full visible formatting, real checklists, ordinary Enter/list/soft-break behavior, keyboard selection, safe rich paste, direction, fullscreen, protected opaque boundaries and per-page history snapshots. No custom DOM formatting/history engine.
- `public/author/source-adapter.js`: field-local original source/ranges and editor model. Collection-time alignment retains all untouched source. Text patches retain original wrappers/attributes, rich runs, entities, HTML comments, CRLF and spaces. Undo to the initial model returns the exact original string. Structural changes replace a proven affected region and retain applicable outer wrapper attributes; no source serialization on mount/input/selection.
- `public/author/image-chooser.js`: existing supplied-media picker, approved local image revision filter, explicit alt text, no upload/external image insertion. `studio/markdown-editor.js` gains the optional shared image chooser callback and exact line-ending retention, including no-op/Undo.
- `public/author/inline-author.js`: cached context, small buffers, deferred source compilation, title input, composition settler, submitted-model receipts, safe reconciliation and quote projection. `onReviewPublish` hook is available without changing existing `onApply` behavior/publication.
- `public/studio/workspace.js`: immediate buffer dirty state, coalesced notifications, composition settlers and boundary-only collector/full validation. Native editor state/selection/history stays mounted through status changes. Save failure, newer model, CAS, private comment and sibling collectors retain their protections.
- `public/sidebar-toggle.js` and minimal `app.js` wiring: actual physical rail edge plus next action controls glyph/title/name/aria-expanded. Existing rail persistence, focus/inert/drawer and reduced-motion paths are reused.
- Focused/source/integration tests cover the new editor and existing receipts/private anchors. Existing JSDOM harnesses that strip app imports now inject the new sidebar helpers; this is harness maintenance, not new independent QA participation.

## Required server integration — Lead ownership

`src/server.js` is deliberately unchanged. Add these six static JavaScript routes to its allowlist **together before running this candidate in a browser**:

| URL | public-relative file |
|---|---|
| `/sidebar-toggle.js` | `sidebar-toggle.js` |
| `/author/standard-editor.js` | `author/standard-editor.js` |
| `/author/source-adapter.js` | `author/source-adapter.js` |
| `/author/image-chooser.js` | `author/image-chooser.js` |
| `/author/vendor/prosemirror.js` | `author/vendor/prosemirror.js` |
| `/studio/media-picker.js` | `studio/media-picker.js` |

The license notice is `public/author/vendor/LICENSES.txt`; it can also be served as text/plain if desired. Existing `/vendor/marked.js`, `/vendor/purify.js`, `/studio/markdown-editor.js`, EasyMDE assets and `/api/studio/media/status` are reused. No new API, schema, content ID or server-side publication operation is introduced. The normal browser dependency graph test will report 404 until Lead adds the routes; do not claim this unintegrated checkout loads through the production server.

## Dependencies/build

`npm ci`; `npm ci --prefix schemas` for the separate repository contract checks; `npm run build:editor`; `npm run check`; `npm run test:editor`; `npm run test:candidate`. Node 24.19.0 was used. No production server was started.

Exact root versions: ProseMirror model 1.25.12, view 1.42.9, state 1.4.4, basic schema 1.2.5, list schema 1.6.0, commands 1.7.2, history 1.5.1, keymap 1.2.3, inputrules 1.5.1, tables 1.8.5, Markdown serializer 1.13.9; parse5 8.0.1; esbuild 0.28.2 (dev). EasyMDE remains 2.21.0. Sanitizer patch update: DOMPurify 3.4.16 → 3.4.17; root lock also updates jsdom's compatible undici transitive dependency. Root npm audit reports zero vulnerabilities. The separately pinned existing schema Ajv package reports one moderate advisory; its contract package is unchanged.

ProseMirror, serializer dependencies and the build tool are MIT; parse5 is MIT. The bundle and full dependency notices are checked in. `scripts/build-editor-vendor.mjs` regenerates the local minified ESM bundle and notices; no CDN or remote runtime dependency. The Windows sandbox denied esbuild's parent-directory resolution; the actual successful build used authorized execution outside that sandbox in this same isolated checkout. No generated test data or local database is included in commits.

## Evidence and remaining limits

See `docs/evidence/editor-performance-20261101/` for actual final logs/audits and the receipt. Tests use synthetic sources/disposable Stores, not Guy's current 23 saved drafts. The performance assertion expands a synthetic workspace to 23 lessons with large unrelated padding, then instruments 120 input/selection cycles plus direction: **zero workspace clones, zero workspace reads, zero learner rendering, one dirty notification**. Timings are JSDOM transaction+selection durations, never native input-to-paint. They cannot be compared as an equivalent before/after measurement to the brief's isolated installed-workspace clone benchmark.

The strict frontend static audit flags three existing delegated buttons in unchanged `studio/lesson-editor.js` (two) and `studio/media-picker.js` (one). Their existing listener behavior and supplied-picker action tests are executable evidence; these are pre-existing detector findings, not a claim of a clean repository-wide static audit.

Unsupported containers (for example custom widgets, figure/div wrappers outside the supported schema, embedded scripts, and paragraphs containing external image references) remain protected source boundaries with sanitized display and exact-source escape hatch. Ordinary current first-two paragraphs/headings/lists edit in the rich surface. New rich paste supports the schema; unsupported pasted formatting may be dropped with an explanation, while active content/external images are removed. Table insertion is 2×2 with row/column/delete commands; no bespoke spreadsheet/column-resizing product is introduced. Exact-source manual edits intentionally replace that field's transient editor/history model. In-app history is retained during ordinary page switching, not across closing/reloading the app. EasyMDE automatic direction remains whole-document first-strong behavior; rich direction is paragraph-based.

Native typing/clipboard/IME/caret, exact matching-data p50/p95/max input-to-paint trace, 1280×720/narrow/200% zoom, keyboard toolbar/select popup, reduced-motion physical behavior, screen-reader quality, independent QA/UX review and Guy acceptance remain Lead/UX/QA-owned. No independent review is claimed. Lead must integrate server routes and publication frontend/workspace adoption, build a disposable matching-data candidate, and run native before/after verification. Installation/publication remains outside this assignment.
