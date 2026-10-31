# MEMORY revision — integration handoff, 31 October 2026

Reconciled by Leo for Guy’s local testing. The exact learner wording from commit 15fc734cc1b0a25492a81ca5e96052de5f1d9e62 is now saved and read back in the canonical authoring master. Guy’s final copy/design acceptance remains pending. No software implementation, installation or publication occurred in this source task.

## Preserve

The initial inspected Lead checkout’s content/first2/lessons.json hash was 1b9df3021485e37c5c01af7a0eb573a482ba7329c797dc1dad55aaa2e9fb9e3a, matching the supplied installed revision-5 source identity. This remains baseline evidence, not a fresh live-server readback. The current Google Doc was read before editing: the only intervening MEMORY changes were its installation status and implementation record, retained as historical evidence. baseline/ preserves the original runtime/source and Guy’s feedback; MASTER_MEMORY_BEFORE.json preserves the current pre-update MEMORY section. No learner responses are included.

Preserve Guy’s personal, conversational voice; three experience vectors; M.Sc.; Adam’s similar scientific background and initial lack of Hebrew; the supplied 500/70-hour and over-seven-times account, with 70 hours bold. These are attributed author content, not newly verified scientific or marketing claims. Preserve exactly 0704177609112001, 10,000 ms, original digit order, date associations, all three distinct principles and the familiarity caveat. There is no new theory, vocabulary, audio or success story.

## Improve

The welcome and Adam bodies shorten from 224 to 125 whitespace-delimited words. Use actual numbered-list markup. Reuse Welcome to Hebleo across pages 1–2 and How memory works across pages 4–5; internal IDs remain unchanged. One date-format explanation replaces the duplicated annotation/prose. The English-to-familiar-Hebrew progression remains explicit. Control mechanics, IDs and author notes stay out of learner prose.

## Reconsider — explicit scope changes

- Leo reconciled removal of the page-5 application question for local testing. This removes an explicit comprehension observation from active delivery and adds no substitute quiz or mastery claim. Its original question, options, answer and feedback remain verbatim in an explicitly inactive master history block, preserving its heading/comment identities, and in baseline/history. Guy’s exact replacement-copy acceptance remains pending.
- Fold the existing optional comparison into page 5; remove its separate obligatory page stop. The comparison itself, its ID and all six feedback variants are preserved. Opening it, responding and viewing results must all remain optional.
- Leo reconciled three numbered expandable principle rows with bold titles, all directly available. The first may be open after the demonstration; opening another keeps earlier content visible and focus stays on the activated row. Continue never requires opening all three. No locked row, completion gate or timed automatic progression. This explicitly supersedes the earlier locked-row/all-three UX proposal.
- Remove the long claims about most people recalling half the digits or remembering in a month. This is a concision cut of the source’s generalization, with no replacement statistic or contrary scientific claim.

“Established old knowledge” interprets Guy’s “established all information” in #11 using the prior source’s explicit “established old information.” No open teaching decision is hidden in that correction. Leo’s reconciliation is recorded in FIRST2_INTEGRATION_DECISIONS_20261031.json; no final acceptance by Guy is inferred.

## Page/activity mapping

| New page | Stable page ID | Disposition |
|---|---|---|
| 1 | MEMORY-A2.learn.try-first | Short welcome; three numbered experience vectors |
| 2 | MEMORY-A2.learn.adam-study | Short personal account; heading Welcome to Hebleo |
| 3 | MEMORY-A2.learn.number-round | Keep MEMORY-A2.embedded.number-first; same ungraded attempt or skip |
| 4 | MEMORY-A2.learn.connection | Keep MEMORY-NUMBER-TO-DATES and all three principles; exact shortened copy |
| 5 | MEMORY-A2.learn.meaning | Reading explanation; no choice question; optional MEMORY-A2.embedded.number-return inside this page |
| 6 | MEMORY-A2.continue | Short transition to first four letters; normal completion/next lesson |

Retire MEMORY-A2.learn.return only from active top-level order; retain its identity in history and mapping. Retire MEMORY-A2.embedded.what-changed only from active delivery; retain the full question/options/answer/feedback in baseline and deployed revision history. Do not recycle either ID for new content. The path has six top-level pages instead of seven.

## Runtime and preservation notes for Lead

REVISION.json is an editorial format, not a runtime activityVersion:1 import. It intentionally represents optional placement separately. Do not import its new fields without adaptation/validation. The existing renderer supports one activity per page: a practical mapping is page 5 as reading with the existing memory-comparison activity ID/kind, explanation visible before the collapsed comparison, and optional instructions visible only after opening. This requires deliberate renderer/copy mapping, not a silent new nested-activity schema. Preserve source-block identity MEMORY-A2-interactive and all unrelated MNTL content.

Existing progress is keyed by page ID. Moving the comparison from learn.return to learn.meaning means the old learn.meaning choice response MUST NOT become a comparison response. Use the new content revision and an explicit identity-aware migration: retain historical quiz responses; map only matching comparison responses from the former page to the retained comparison activity; preserve raw text and whether an attempt really occurred. A saved cursor at the retired page can resolve to the new containing page. Completed-lesson state and unrelated records remain intact. Verify migration or an explicitly approved versioned-state strategy before release. The normal fresh-fictional-progress startup policy does not justify deleting historical content, settings or other learner records.

Normal Continue must work without opening the optional section, and after open, skip, empty/partial/exact comparison, save/reload and interrupted timed-display paths. Never require a correct number, a repeat attempt, all three principle controls or optional disclosure completion as a mastery condition. All principle rows are directly available. Remove the default Hear the digits once control; provide a collapsed accessible/untimed study alternative with the exact digits and Hide-and-recall/skip. Label study mode explicitly, not equivalent timed performance. No new audio/TTS asset. Lead verifies actual assistive behavior. The timer runs only after Play; input follows hiding the digits. Do not leak dates or models during the first attempt. Hide comparison models until Show the comparison; render only responses actually made. Keep existing combined reverse/zero/day-month classification and no-guessing behavior, along with all unchanged feedback.

No associative-network paragraph is reintroduced. Consequently MEMORY has no Extra information affordance; other lessons may show it only for real authored supplements. Ordinary lesson comments remain separate. #14 requires author-only inline editing and anchored comments integrated with existing drafts/revisions and server-side authorization; this pack does not implement it.

## All fourteen feedback items

| Guy’s item | Label | Scope | Treatment |
|---|---|---|---|
| 1 | Improve | Copy + formatting | Welcome uses an actual ordered list of the three source experience vectors. No new credentials or biographical claims. |
| 2 | Improve | Engineering | No Answers saved. text on reading-only navigation. One clear Continue action must work without an answer/mastery requirement in MEMORY; actual save failures still need actionable feedback. This pack does not fix save/navigation code. |
| 3 | Improve | UX + engineering | Replace Lesson help & comments with Extra information only when authored supplementary content exists. Open that content on request; comments stay below the lesson. MEMORY has no supplementary network paragraph, so no empty control and no new theory. |
| 4 | Improve | Copy | Shorten welcome, Adam account, explanations and transition; reuse Welcome to Hebleo for pages 1–2 and How memory works for pages 4–5. Preserve the 500/70-hour personal account, emphasis and supplied over-seven-times comparison. All rewritten wording is an editorial adaptation for integration. |
| 5 | Reconsider | Reconciled UX + engineering | Remove Hear the digits once from default controls. Use the collapsed accessible/untimed study alternative with exact digits and Hide-and-recall/skip, labelled as study mode. No equivalent timed-performance claim or new audio/TTS asset. Lead verifies actual accessibility. |
| 6 | Improve | UX + engineering | Add a visible timer bar for the original 10,000 ms display with accessible Time remaining label. Preserve learner initiation, expiry before recall, interruption handling and skip. |
| 7 | Improve | Engineering | Prevent ordinary selection, copy/cut and dragging of the timed number while visible. Scope this to the stimulus, preserving recall-field editing/paste and accessibility. This is an interaction requirement, not a claim that screenshots or all extraction are preventable. |
| 8 | Improve | UX + engineering | Keep the sixteen digits in fixed ordered positions while separators/groups are introduced; reserve final layout space. Event labels follow transformation. Preserve reduced-motion/nonvisual equivalents and explanatory replay. Verify actual motion; no UX acceptance claimed here. |
| 9 | Improve | Copy + rendering | Remove visible final annotation Slashes show the month, day and year within each group. Keep a single American month–day–year explanation with the two named events. Empty final description means render no paragraph; present the same meaning accessibly without duplicating it visually. |
| 10 | Improve | Reconciled interaction; Lead implements | Three numbered expandable rows with bold titles, all directly available; keep earlier opened content and focus. Continue never requires opening all three. No locked row, completion gate or timed automatic advance. |
| 11 | Improve | Copy; explicit interpretation | Name the third principle Memory hooks, then explain connecting new information to established old knowledge. Interpret Guy’s all information as old information, consistent with his source wording. Preserve the event-familiarity caveat and English-to-known-Hebrew progression. |
| 12 | Reconsider | Reconciled assessment removal for local testing | Remove MEMORY-A2.embedded.what-changed and all active quiz dependencies. Keep question/options/answer/feedback in inactive master history, baseline and historical revisions. No replacement quiz or mastery claim. |
| 13 | Improve | Sequence + state integration | Move MEMORY-A2.embedded.number-return inside page MEMORY-A2.learn.meaning as collapsed, optional content. Retire MEMORY-A2.learn.return from active order, preserving its historical identity and responses. Continue works without opening, attempting or viewing the comparison; Skip remains after opening. No extra compulsory page. |
| 14 | Improve | Studio / engineering handoff | Author/admin can edit source blocks in the same rendered lesson layout and leave anchored comments assistants can read. Preserve stable block/page/activity IDs and draft/revision history; enforce author permissions. No learner comment controls are moved into empty help. This content pack implements no inline editing. |

## Evidence and limits

Executed: node docs/curriculum/memory-feedback-20261031/prepare.mjs — nineteen structural/source-preservation checks PASS. See VALIDATION.json. The generated copy and exact before/after objects were read back. The baseline hash, digit order, duration, two activity IDs, unchanged comparison/initial feedback, all fourteen feedback mappings and original files’ no-mutation hashes were checked. These checks validate this editorial artifact, not app behavior.

MASTER_UPDATE_VERIFIED.json records PASS for 40 scoped source changes and 30 exact learner-field mappings. Complete content/styles before and after MEMORY match after ignoring positional index offsets only; all 119 lesson headings, all existing heading identities/levels, all 13 comment records (11 active), quotes, anchor values, replies and statuses are preserved. Native decimal lists and bold 70 hours/principle titles pass structure/style readback. Historical source/installation evidence is retained. This is a bounded preservation comparison, not a repeated curriculum audit.

Exact Google Doc revision: AHj4eMRxQhMluC04Gm0-aMjeII8LLcqZjsm8oJk1OkkA5amjOLeQAnPd9EsQCsqwb-g8t4yM7BkmHezGXxsy5iGHeaOFaR4xNRtcd0d6RQ. MASTER_MEMORY_AFTER.json is the source paragraph snapshot; the receipt maps each learner field to its SHA-256 and current UTF-16 ranges. LEARNER_COPY.md is unchanged from the reconciled source commit. REVISION.json remains editorial data, not an importable runtime pack.

Commands run from the shared repository:

```powershell
node tmp/memory-feedback-20261031-worktree/docs/curriculum/memory-feedback-20261031/prepare-master-update.mjs tmp/memory-master-update-20261031/before.json docs/curriculum/first2-implementation-20261030/after-final.json
node tmp/memory-feedback-20261031-worktree/docs/curriculum/memory-feedback-20261031/reconcile-handoff.mjs
node tmp/memory-feedback-20261031-worktree/docs/curriculum/memory-feedback-20261031/verify-master-update.mjs tmp/memory-master-update-20261031
```

The first batch attempt was atomically rejected for an invalid numbering enum; the corrected 115-request revision-guarded batch succeeded. The verifier initially had an incorrect expected field count (29 rather than 30); corrected, all 20 checks pass. Full outside-scope readbacks and comments remain local under tmp/memory-master-update-20261031; only scoped MEMORY snapshots and hashes are committed.

No runtime/build/UI/accessibility test, schema import, state migration, CI, software installation, WordPress operation or Guy acceptance is claimed. Rendered document layout and visual comment-anchor placement were not inspected. No audio search. No related automation exists. Next owner: Lead reads MASTER_UPDATE_VERIFIED.json before adapting/testing/installing the runtime; Leo consolidates the delivery.
