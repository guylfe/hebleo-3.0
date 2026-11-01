# Classic editor independent-review corrections — 1 November 2026

The feature correction candidate is implemented and privately pushed on `fix/classic-wysiwyg-20261101`. Code commit: **6d074edb7f2efda442cbd56c403a5986b547924e**, based on **ece6c085bd987a5c3fcb7899da68476c89eefb87**. The evidence commit is the commit containing this document and the adjacent evidence directory; the final handoff supplies its exact SHA.

This is an isolated candidate for Lead's combined integration and independent recheck. No installation, original/live teaching write, real-media approval, production write or native publication occurred. The installed editor on 63358 was not changed or stopped. Media approval remains Architect-owned in its separate worktree.

## Corrected behavior

- **RR-CLASSIC-PROJECTION-01 / QA-CLASSIC-PROJECTION-01:** Markdown formatting retains the entire unchanged v1 shared renderer UTF16 projection, including renderer-owned separators and field-ending newline. Full token ranges retain their original source delimiters. Only mapped top-level renderer whitespace is encoded when crossing from Markdown to HTML; existing HTML patches and source gaps retain original bytes. No projection normalization, backend history rewrite or arbitrary text compensation was introduced.
- Temporary field-local region identities disambiguate identical siblings; markers are removed before persisted source. First/middle/last repeated HTML and Markdown formatting, reload and second formatting are covered. Reordered or forged mappings fail visibly and retain the actual input. Ordinary formatting succeeds for the exact independent failures; refusal is reserved for an unprovable mapping. Real text, Enter/new paragraphs, lists and structural table operations retain their existing editing paths.
- **NC-02:** supplied contextual link popup exposes Edit link, Unlink and Brush, excluding inherited File/media actions. The supplied main toolbar/theme remains complete. Image `popup:null/list:null` remains; no Architect-owned chooser/backend file changed.
- **NC-03:** the installed Jodit 4.18.12 documented `atom` option replaces the font-size list, rather than deep-merging residual defaults. Actual runtime/opened menu is exactly `8,10,12,14,16,18,24,32,48,72,96` px, unique and ascending.
- **NC-04:** one scoped adapter wraps the supplied Brush TabsWidget. Actual visible panel classes drive aria-selected, roving tabindex, controls/labelledby and panel hidden state. Pointer and ArrowLeft/Right/Home/End synchronize selection/focus. Escape remains component-owned. Popup replacement and editor disposal release listeners/observers.
- Canonical renderer/sanitizer, v1/private contexts, worker/CAS/receipts, scoped publication, sidebar and IME/history ownership are unchanged. Projection work remains mount/collect work, not a full-workspace per-key operation.

## Owned files

`public/author/classic-source.js`, `public/author/source-adapter.js`, `public/author/standard-editor.js`, scoped `public/author/author.css`, `test-support/classic-dom.js`, `test/classic-corrections.test.js`, `test/classic-projection-regression.test.js`, `UX-CONTRACT.md`, this document and its evidence directory.

No changes to `src/server.js`, `src/media-store.js`, `public/author/image-chooser.js`, media approval tests, shared feature ledger, package pins, supplied vendor bundles, `src/author-review.js`, shared rich renderer or immutable context/history schema.

## Executed checks

| Command / evidence | Actual result |
|---|---|
| `node --test test/classic-projection-regression.test.js` | 9/9 pass; original reviewer assertions/file bytes preserved |
| `node --test test/classic-corrections.test.js` | 13/13 pass, including exact three QA Center cases, six repeated-sibling cases, actual HTTP anchor/publication/recovery, UI options/menus, Brush lifecycle, ambiguous mapping refusal |
| Focused editor/review/recovery/publication/workspace-save command below | 95/95 pass before the final ambiguous-mapping test was added; final configured run includes that additional test |
| `npm run verify:candidate` | **1068/1068 pass**, syntax checks pass, zero failures; configured audio filename/name exclusions remain, so this is not an all-audio/full-suite claim |
| `npm test --prefix schemas` | **27/27 pass** |
| `node schemas/tools/runtime-check.mjs --runtime .` | **9/9 pass**, records exact committed code SHA 6d074edb7f2efda442cbd56c403a5986b547924e |
| `npm run build:editor` | Pass; pinned locally supplied vendor build; no tracked vendor delta |
| `node scripts/verify-classic-copy.mjs --source ../classic-editor-before-20261101/candidate.sqlite` | Pass on fresh copy of original 23-lesson/26,632,089-byte workspace; final HTTP Save **3537.583 ms**; exact projection, saved Preview, HTTP reload, other22 lessons/active/learners/non-KV/private history/media/settings; baseline unchanged |
| `git diff --check` | Pass |
| Premium strict static audit | **4 findings remain**, described below; not a clean static-audit claim |

Focused command actually run:

```text
node --test test/classic-projection-regression.test.js test/classic-corrections.test.js test/classic-editor.test.js test/mature-editor.test.js test/rendered-author.test.js test/author-review.test.js test/author-recovery.test.js test/lesson-publication.test.js test/workspace-save-regression.test.js
```

Reviewer regression file SHA256 (verified equal to the supplied original):
`a0c95122a74dc529801194dccba49ba7d9deffbc4de2b4bd5a0887c318bfca44`.

The persisted regression test creates clearly synthetic whole-block and repeated-second-quote private notes, formats Markdown through actual Jodit, performs actual loopback HTTP Save/Preview and selected-lesson synthetic publication, then restores a backup to a second Store. Both anchors remain current, and original review/context state remains deeply exact. A subsequent real text edit legitimately marks the whole-block note changed without rewriting the historical namespace. No real lesson was published by this test.

## Native Browser evidence

Fresh disposable copy of the untouched before-snapshot, never the prior UX-modified review DB. Helper served only 63483, PID72728, positively identified by its exact command before stop. It is stopped; no listener remained on 63483. No alternate browser or foreground desktop automation was used.

Only the copied first MEMORY page title/html were replaced with clearly labelled SYNTHETIC fixture text: one Markdown heading plus two repeated Hebrew/Nikkud/emoji paragraphs, with trailing newline. A synthetic private whole-block note pinned the prepared context. No real teaching text or media was approved.

Observed through actual supplied UI and trusted input:

1. Open Author → Continue → Edit lesson. Actual font menu contains the exact eleven ascending sizes. Center command formats the selected heading. Brush pointer selection and toolbar keyboard path (`Escape → Alt+F10 → Home → ArrowRight x4 → ArrowDown → ArrowRight`) select Text with focus, aria-selected=true, tabindex=0, correct related visible panel; Background false/-1/hidden.
2. First trusted Save: feedback **0.700 ms**, first RAF **14.900 ms**, completion **4568.100 ms**. One **194 ms Long Task** was observed. The same editor node remained. Private-note HTTP readback showed **current** and exact original projection, including every newline.
3. Saved Preview displayed centered heading. A safe synthetic `https://example.invalid/synthetic-review` link was added through the supplied URL form. Actual contextual popup after final reload contains **Edit link, Unlink, Brush**, no File.
4. Second trusted Save submitted formatting A; 16 trusted beforeinput events for ` SYNTHETIC LATE B` occurred during Saving (3286.8–3438.0 ms). A saved with its anchor current; B remained visible and status read `Saved the submitted draft. Newer edits remain unsaved.` The editor node remained identical.
5. Native Ctrl+Z removed only B and restored clean state; Ctrl+Y restored B and unsaved state. Explicit subsequent Save persisted B. The whole-block note then correctly read **changed**, keeping its original source/context exact.
6. Actual reload and reopening Edit lesson retained Center, link and B with clean status. Final source/hash readback matched committed source bytes; no persisted FEFF or transient region marker. Live Jodit selection scaffolding can contain FEFF, which is removed from saved source.
7. Automation inserted B inside the first repeated word (`repeat SYNTHETIC LATE Bed`), rather than at the intended paragraph end. The exact observed delta is retained in the evidence and verified by removing only the declared inserted string; no claim of an intended caret placement is made.

Evidence: [observations](evidence/classic-corrections-20261101/native-observations.json), [Brush keyboard screenshot](evidence/classic-corrections-20261101/brush-text-keyboard.png), [final link popup](evidence/classic-corrections-20261101/link-context-safe.png), [font menu](evidence/classic-corrections-20261101/font-sizes.png), [saved Preview](evidence/classic-corrections-20261101/saved-preview.png).

The initial Save/pending measurements precede only the final contextual Edit-link tooltip/pencil refinement. The complete final configured run includes that refinement; actual reload, final popup, menu and HTTP hashes were rechecked afterward. Both original and final hashes are explicitly labelled in observations.

## Preservation receipts and reproducibility

Unchanged original logical database receipt:
`8f2dac78cc94520e67fb74336efc8cae8e4df1509a1cd3f6ee3d903851c5e5dc`.

Final native copied-state receipt:
`20385b5988a892038860903249a3a203d9ed61f8ab4ac5af470212b1259d1b17`.
The native verification proves only declared page title/html changes, all other22 lessons and branches exact, other learner rows and retained settings/KV exact, all other non-KV tables exact except fictional Author navigation, immutable synthetic old context/note exact, and no persisted scaffolding. Removing only declared late text restores the exact original canonical projection.

No databases or private learner/context rows are committed. [Native preservation result](evidence/classic-corrections-20261101/native-preservation.json) and [matching-copy result](evidence/classic-corrections-20261101/matching-copy.json) contain receipts and assertion summaries only. Synthetic fixture/verifier source is preserved as text in the evidence directory; to reproduce, copy each to its original `tmp/classic-corrections-serve.mjs` / `tmp/verify-native-corrections.mjs` name. The server deliberately rejects reuse of an existing edited review directory. Start only against the untouched before-snapshot; use an isolated loopback port, never install the fixture, stop its own process afterward.

Final Browser-served SHA256 values (equal to working files and committed code):
- classic-source.js: `8708c9900c1e8a397457684acf2a9401c8b5169a676064f4353314ca6ff31475`
- source-adapter.js: `7a578c9092fd8f0c91cc40853c9c9ddc96c814eb05c08acc3dcfa302a6d27159`
- standard-editor.js: `9ec02dab4fa71428c3c46f09db4c76c6b9f62b5386e7afe986ea452f22d6c89e`
- author.css: `b639324345a14ea0d899bf878fad416fdbba83c11011f4bc696717bfa6da3853`

## Limits and next owner

- Corrected-SHA independent UX/QA/Release acceptance, combined private-image approval integration, fresh combined rehearsal and guarded code-only installation remain **Lead-owned**. Guy acceptance is not claimed.
- No physical IME, narrow/zoom, screen reader, full native fault/retry suite or jank-free claim. Worker/CAS/receipt/IME fault coverage is automated, not equivalent to those physical checks. Native publication was not exercised; synthetic selected publication/recovery was actual HTTP/Store test evidence.
- Strict static scanner reports four inherited findings: two delegated-action buttons at `public/studio/lesson-editor.js:30`, one delegated-action media-picker button at `public/studio/media-picker.js:15`, and a standards-scrollbar finding in unchanged supplied `public/author/vendor/jodit.min.css:1`. These files/actions/theme were outside this bounded correction; no global/theme edits were made to silence the scanner. Full scanner result is included.
- One late native recheck used unsupported `:has-text()` selector syntax and failed to find the button; its dependent wait/click also failed. Inspecting the actual snapshot and using its current reference succeeded in the same mounted Browser. This proves only that selector attempt failed, not an app crash or browser unavailability.
- No related automation exists; trigger inspection returned none. The shared feature ledger remains Lead-owned.
