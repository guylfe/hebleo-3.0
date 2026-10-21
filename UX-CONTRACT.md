# Hebleo application UX contract

## Post-answer vocabulary — E10

The shared vocabulary-reminder primitive owns nonmodal hover/focus preview, activation pinning, pointer transit, viewport placement, exact-trigger focus return and disposal. post-answer-vocabulary.js decorates only existing runtime-ID-backed occurrences after either grading outcome; it never identifies words by text. Recognition shows the original question word, matching uses explicit ID-backed words/placements, and typing shows its target entry independently of arbitrary learner input. Unbound choices, prompts, cloze/transformation text and ordering tokens remain plain. Answer actions stay locked.

Store publicContent emits response-only exerciseVocabulary for the pinned lesson snapshot; absence means no card and no fallback. Managed identities include denied words and can use only the shared eligible lexical projection, independently of library paging. Safe lexical/legacy renderers suppress lookup/enrollment actions; reminder disclosure/playback writes no learner/source/encounter state. Both full reload and in-place learner grading consume this owner; disposable rehearsal destroys it on replacement. Native/Guy acceptance remains separate. See docs/POST_ANSWER_VOCABULARY.md.

Source-browse absence labels describe source mapping, independently of learned introduction labels. Paging moves reading position/focus to the result status below the measured sticky header. The selected source/learned collection has a visible pressed treatment. Wide category tables keep Note and Original source text in a viewport-width sticky reading area while form columns scroll; their support rows still span all columns. These extend the existing lexical renderer/measurement owner without source or learner writes.

Oct20: when exact-source adoption exists, `#library` defaults to Source vocabulary with category/original-Lesson filters and 50-row pages. Learned vocabulary remains a separate collection. Source browsing preserves exact source fields, original Lesson/Part and IDs and grants no learned/review eligibility. Original source is a native disclosure inside existing category tables; notes/examples, shared controls, global scrollbars and natural page height retain their canonical owners. Search/filter state stays tab-local. See docs/AUTHORED_SOURCE_BROWSING.md. This task's installed real-row UX review supersedes the historical pause within its authorized scope; automated checks remain separate from native acceptance.

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


## Oct14 bounded refinement contract

OCT14_REFINEMENTS.md records the authorized feedback and API/fixture boundaries. Shared learner-view owns example, reference-control, toolbar and conditional result-explanation rendering across app and disposable Preview. media.js owns reference state/lifecycle; the app and Preview subscribe to hebleo-reference-state and preserve preference ownership. Recording stays local and optional, tied to initiating profile/context/word, with departure cleanup. No new canonical audio or grading model.

Main Check retains the mounted question/answer nodes, disables the existing control after grading and focuses the stable result region with preventScroll. A failed grade request preserves inputs for retry. A successful grade followed by progress failure shows the authoritative result, disables Next and offers a progress-only retry. Preview remains a disposable controller and suppresses result auto-scrolling. Optional explicit authored acceptedAnswers is returned by the same grader and permitted in Preview wire schema.

Ordinary Author/learner comments omit soft-removed rows. Counts/page clamping use the visible filtered set, preserve drafts and show the centered pager only beyond20. Audit rows stay in storage; --developer-audit is an explicit off-default existing-Author-only read route, outside ordinary UI. The synthetic sound is actual immutable managed blob bytes, not a nominal URL, and only upgrades eligible synthetic demo content with no saved draft.

Current-task verification overrides the historical initial-checkpoint full-audit requirements above: focused changed-risk and retained-guard checks plus repository syntax, no repeated manual broad audit/suite or browser route under the binding pause. Existing automatic private CI retains its configured exclusions. Audio controls/fixture functionality is authorized; speed quality/rate testing remains DEFERRED. UX Owner reviews the finished candidate before activation. Vocabulary discussion with Guy must resume after review and before phase3/broader walkthrough; colors/general labels/vocabulary/blanket motion remain held.


## UX14 result metadata and pointer transit correction

The evaluator derives optional string alternatives inside the branch using that same explicit authored answers list; recognition/matching do not emit it, and the renderer does not display this inapplicable metadata from historical records. Raw source fields/immutable grades/progress remain untouched. The shared result-explanation binding retains the existing8px geometry and uses180ms cancelable close for hover transit, content entry, focus/blur and Escape/tap; close timers affect only their connected result node. See docs/UX14_RESULT_CORRECTIONS.md for focused evidence and open native limits. No other approved design/data behavior or held choice changes. UX Owner's corrected-SHA bounded recheck remains required before activation.

## Oct18 lexical capability

Category rendering belongs to lexical-vocabulary.js/.css; scoped additions and lexical lesson links belong to Studio lexical-settings.js. Save/reload and exact-token Preview keep unified Studio ownership. Source/data authority remains ADR B03 and docs/architecture/LEXICAL_INTEGRATION_V1.md. Identity approval cannot silently become display approval. Library lexical queries use bounded safe projections and stale-response suppression; existing flat records keep their established path. Workbook catalogue status remains distinct from the app catalogue. Opening, importing, saving or previewing never applies a learner migration.

### Oct18 owner correction: scoped targets and keyboard continuity

Studio lexical settings validate targets against the selected category and scope: word keys for word scope; current reviewed class IDs for class scope. Each category/scope retains its valid choice and otherwise defaults to its first valid option. No reviewed class presents an explanatory unavailable target and disables Add for that scope. It never silently switches to a word scope.

The existing lexical status region remains mounted during settings-body rerenders. Successful additions/removals/links announce their workspace result and remind the author to Save. Scope/category changes restore focus to the recreated select; Add/Link restore their action; removing a focused row uses the adjacent remaining action, falling back to Add/Link. Link panel openness and chosen word/action survive those rerenders. Source approvals, unified Save/CAS/rehearsal and production boundaries are unchanged. Source/JSDOM checks do not establish native focus, screen-reader announcement or geometry acceptance.

## Oct18 approved-preview fidelity repair

Guy's current built-in-browser authorization supersedes the historical person-control pause for this task. UX Owner directly repaired the application component against the approved prototype. The reference layout, source-backed disposable application comparison and executed evidence are recorded in docs/VOCABULARY_PREVIEW_FIDELITY.md. Native opens and an intermediate adjective screenshot succeeded; later screenshots and interaction calls failed with os error 10060. Final rendered/interactive acceptance remains open and must not be inferred from the automated checks.

The repair changes display structure and scoped styling, readable Studio labels/category preview, and an explicit usage-to-Note display link. It does not change lexical identities, canonical source approvals, cumulative eligibility, Save/CAS ownership, publishing or learner state. The visual fixture is isolated and explicitly provisional. Approval metadata used only in that fixture never establishes canonical content approval.

### Oct18 Note review follow-up

Notes/Examples occupy all table columns, including below Root/Pattern. Overflow classification is independent of whether its action/ellipsis currently occupies space and remains measurable while the note is expanded. Short notes without examples reclaim the full header line; short notes with examples keep their Examples disclosure. Resizing can return a fitting single-line note to its complete inline preview. Explicit manual collapse survives unrelated note actions and repeated layout callbacks. Source text, rich runs and profile encounter ownership are unchanged.

Guy requires another review after corrections and a pass with no remaining gaps before work is called complete. Current candidate/source/HTTP checks are bounded implementation evidence. Built-in-browser navigation works; screenshot, evaluation and click calls failed with os error 10060 in this follow-up. Final native visual and interaction review remains OPEN.
