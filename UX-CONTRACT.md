# Hebleo application UX contract

Visual values and selected layout live in [DESIGN.md](DESIGN.md); public/refinement.css is their runtime owner. This contract consolidates existing behavior and the selected Oct13 integration. It does not change pedagogy, permissions or the publishing model.

English UI with exact authored Hebrew/RTL content. Core references: docs/MASTER_SPEC.md, docs/INITIAL_BUILD_BRIEF.md, docs/UX_UPDATE.md, docs/architecture/CONTENT_CONTRACTS.md, docs/architecture/FB18_ADDITIVE_CONTRACT.md and docs/FEATURE_CHECKLIST.md. Human-authored content remains canonical; fictional local profiles/events and synthetic fixtures remain labelled.

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Select/Listbox | Existing native select controls and editor-fields.js | Current native app controls; DESIGN.md | native platform popup, no authored popup geometry | source/DOM tests; native popup review open |
| Form | Studio editor-fields/unified-studio; app comment/reply handlers; source/media editors | Store/schema/API validation and existing dirty/pending guards | local workspace, saved draft, disposable Preview | test/app.test.js; test/studio-authoring.test.js; test/source-local-save.test.js |
| Scrollbar | public/refinement.css global baseline | DESIGN.md runtime Model B | table/rail/dialog geometry only | source audit; actual rendered review open |
| Toast | app.js toast and existing pane status regions | Existing error/retry flow | status, inline error, success | test/app.test.js pending/rejection retention |
| CRUD | Store/API and unified Studio/source coordinator | Existing stable-ID/revision/CAS contracts | private notes, published content, staged draft, soft-hide comment | app/Store/HTTP and restore-integrity tests |

Table selection/bulk and date-picker capabilities are not introduced. Tables remain native read-oriented tables with full fields and independent horizontal overflow. Native dropdowns remain intentionally platform-owned.

## Navigation and data

Real routes remain #home, #course, #lesson/:id/:portion, #review, #library, #studio and #settings; /google-setup remains the separate author connection route. Existing Reports and History remain within Studio tasks. Main navigation marks the current destination and stays in the header. One left course toggle controls the separate course rail only. Folding changes CSS/state without rendering or learner/source writes; drawer dismissal preserves the current lesson/portion and returns toggle focus. Per-profile local rail preference stays separate from learner records. Each application route sets its document title.

Watch is first when actual video exists. Text-only lessons show real text. No nominal media record is installed. Lesson progress and medium share the same underlying lesson/session. Check remains in-question; Continue follows feedback. Concept help is inline, penalty-free, and preserves the mounted answer/caret. Full keyboard keys, final forms, punctuation, English hints and context highlights remain present.

My Hebrew uses50-row pages, clamps pages when local filters change, and renders one result set through Cards or Table. Filters use actual multi-lesson membership, actual source tags and source-rich search. Search/filters are intentionally tab-local as before; the selected design does not introduce URL serialization of learner/private filters. Clear returns focus immediately. Complete source fields and expandable/open full entries remain available. Private notes remain profile/word records; public word-linked comments remain lesson discussion.

## Authoring and feedback

Studio's six existing tasks stay mounted. Tab/arrow/Home/End selection exposes the corresponding pane and preserves unsaved title, EasyMDE, exercise and sibling edits. One selected-lesson title editor is distinct from a separate chapter-title control. Add/Edit/Reuse maintain canonical IDs and show shared impact. Explicit alternatives are local exercise-authored answers, never global word changes. Typing/cloze remain distinct. Save stages the complete workspace; Preview uses the saved draft in a disposable modal; Publish is a separate deliberate action. CAS/dirty/conflict/error recovery retains inputs according to existing contracts.

Comments remain immediately visible to entitled learners; anonymous projection hides identity from learners while Author can identify/moderate. Reply opens from a disclosure and keeps dirty/pending/error state. Keep/soft Remove retains the existing policy. Reporting attaches actual attempt/revision context. Settings, entitlements, review reveal/rating/undo, scheduled review and source/media/import/backup routes remain available. The existing interval scheduler is not represented as FSRS.

## Keyboard, dialogs and field lifecycle

Shared close clears target/caret, reserved dock space and expanded state. Route/non-typing changes close even Keep open; valid consecutive typing contexts can retain it. Unrelated modal entry clears background targets; saved-draft Preview remains a valid keyboard context. Insertion rejects detached, hidden, inert, closed-details or background-modal fields. Physical conversion additionally requires focus in the active editable target and rejects modifier/IME events. These are source/DOM checks, not physical-device acceptance.

The actual dialog primitive remains native dialog.showModal with app-owned content/cancel handling; background editing cannot become a keyboard target. Backup restore uses an app-owned confirmation, initially focused on Cancel. Drawer header controls remain reachable. Focus indicators and reduced-motion/high-contrast fallbacks are shared. Textareas have sufficient minimum height and content growth; actual long-content/native geometry still needs review.

## Verification and limits

Required candidate checks: npm ci --ignore-scripts; npm run verify:candidate; schema contract/runtime checks; skill strict static audit; designmd lint; git diff --check. verify:candidate executes the repository syntax checks and tests with explicit audio file/name exclusions. No build or formatter command exists in this native Node/static app. Existing full verify remains unchanged for later reopening of audio; candidate CI uses verify:candidate to respect the current deferral.

Browser person-control pause is binding: no new browser/native/headless/synthetic captures. Source/JSDOM/HTTP do not certify rendered logo/header wrapping, true geometry,200% zoom, physical keyboard/touch, or Guy acceptance. Mobile/physical acceptance is deferred to the APK decision. Audio-speed work/tests are DEFERRED until Guy reopens them in every phase. The supplied original navy-wide logo is integrated unchanged; rendered logo/header review remains open. All human acceptance and previous independent review cells remain unchanged. One consolidated QA milestone follows integration plus UX corrections.

## UXI13 workflow correction checkpoint

The author session retains mounted workspace hosts across full status renders, including malformed/incomplete sibling inputs. Main/lesson/profile/history/connection departure and deliberate Reload/Publish/rollback use a shared dirty-only Save draft / Discard / Stay gate. Saving succeeds before leaving and never publishes by itself. Pending saves retain their own CAS token. Discussion drafts/submissions bind initiating profile and lesson/revision/word/exercise context. Private note drafts bind profile/word and retain text/selection across adjacent actions, errors and deliberate replacement. Drawer/unrelated-modal learner shortcuts and destinations are inactive; header/drawer dismissal remains available. Inline Watch/Read changes only the explanation region, retaining answer and valid Keep open. See docs/UXI13_CORRECTIONS.md for exact source/check scope and open native limits. The earlier full initial-checkpoint verification above is historical; this bounded rework runs changed-risk checks, syntax checks and the existing automatic CI, without a new audit or reviewer/QA dispatch.


## Help entry lifecycle — QA-UXI13-09

An authored Help read binds the initiating profile, route/history generation, lesson session/portion/question and current panel to a monotonic request identity. Dismissal, panel replacement or a newer Help request consumes the old identity. Obsolete success/error completions do not mount a composer, replace a panel, show stale feedback or alter a newer draft, even when the same profile/route/word reopens. A valid current request still opens the existing authored Help/comment context; current failures retain existing feedback and draft recovery. Owner tests use the original independent QA regression plus disposable delayed HTTP responses; corrected-SHA independent QA and native/Guy acceptance remain separate.
