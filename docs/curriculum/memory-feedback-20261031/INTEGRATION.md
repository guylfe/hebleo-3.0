# MEMORY revision — integration handoff, 31 October 2026

Ready for Leo’s copy/UX reconciliation. This is a source-faithful editorial proposal with exact wording and complete before/after objects. No authoring-master edit, software implementation, installation or publication occurred.

## Preserve

The inspected Lead checkout’s content/first2/lessons.json hashes to 1b9df3021485e37c5c01af7a0eb573a482ba7329c797dc1dad55aaa2e9fb9e3a, matching the supplied installed revision-5 source identity. This verifies the local pack, not a fresh live-server readback. The live Google Doc was not read or edited. baseline/ preserves the complete MEMORY runtime lesson, the earlier source text, and Guy’s fourteen feedback items; none includes learner responses. Keep those originals and all deployed content revisions.

Preserve Guy’s personal, conversational voice; three experience vectors; M.Sc.; Adam’s similar scientific background and initial lack of Hebrew; the supplied 500/70-hour and over-seven-times account, with 70 hours bold. These are attributed author content, not newly verified scientific or marketing claims. Preserve exactly 0704177609112001, 10,000 ms, original digit order, date associations, all three distinct principles and the familiarity caveat. There is no new theory, vocabulary, audio or success story.

## Improve

The welcome and Adam bodies shorten from 224 to 125 whitespace-delimited words. Use actual numbered-list markup. Reuse Welcome to Hebleo across pages 1–2 and How memory works across pages 4–5; internal IDs remain unchanged. One date-format explanation replaces the duplicated annotation/prose. The English-to-familiar-Hebrew progression remains explicit. Control mechanics, IDs and author notes stay out of learner prose.

## Reconsider — explicit scope changes

- Recommend removing the page-5 application question. This removes an explicit comprehension observation, including its answer and option feedback. It does not establish mastery and adds no substitute quiz. Guy questioned its value and described it as demoralizing; this recommendation is explicit, not an assertion that he approved exact replacement copy.
- Fold the existing optional comparison into page 5; remove its separate obligatory page stop. The comparison itself, its ID and all six feedback variants are preserved. Opening it, responding and viewing results must all remain optional.
- The previous requirement for the exact generic Show the next idea interaction is superseded by current feedback. UX owns the simpler interaction, reveal and motion; these copy blocks do not select an accepted widget or authorize timed automatic progression.
- Remove the long claims about most people recalling half the digits or remembering in a month. This is a concision cut of the source’s generalization, with no replacement statistic or contrary scientific claim.

“Established old knowledge” interprets Guy’s “established all information” in #11 using the prior source’s explicit “established old information.” No open teaching decision is hidden in that correction. No new decision from Guy is required to deliver this bounded handoff; Leo still reconciles copy and UX before the coherent update.

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

Normal Continue must work without opening the optional section, and after open, skip, empty/partial/exact comparison, save/reload and interrupted timed-display paths. Never require a correct number, a repeat attempt, all three principle controls or optional disclosure completion as a mastery condition. Keep deliberate presentation and accessible alternatives; this pack does not settle UX’s sequencing. The timer runs only after Play; input follows hiding the digits. Do not leak dates or models during the first attempt. Hide comparison models until Show the comparison; render only responses actually made. Keep existing combined reverse/zero/day-month classification and no-guessing behavior, along with all unchanged feedback.

No associative-network paragraph is reintroduced. Consequently MEMORY has no Extra information affordance; other lessons may show it only for real authored supplements. Ordinary lesson comments remain separate. #14 requires author-only inline editing and anchored comments integrated with existing drafts/revisions and server-side authorization; this pack does not implement it.

## All fourteen feedback items

| Guy’s item | Label | Scope | Treatment |
|---|---|---|---|
| 1 | Improve | Copy + formatting | Welcome uses an actual ordered list of the three source experience vectors. No new credentials or biographical claims. |
| 2 | Improve | Engineering | No Answers saved. text on reading-only navigation. One clear Continue action must work without an answer/mastery requirement in MEMORY; actual save failures still need actionable feedback. This pack does not fix save/navigation code. |
| 3 | Improve | UX + engineering | Replace Lesson help & comments with Extra information only when authored supplementary content exists. Open that content on request; comments stay below the lesson. MEMORY has no supplementary network paragraph, so no empty control and no new theory. |
| 4 | Improve | Copy | Shorten welcome, Adam account, explanations and transition; reuse Welcome to Hebleo for pages 1–2 and How memory works for pages 4–5. Preserve the 500/70-hour personal account, emphasis and supplied over-seven-times comparison. All rewritten wording is an editorial adaptation for integration. |
| 5 | Reconsider | UX + engineering; prior content requirement superseded | Remove Hear the digits once from default visible controls. Do not require a new audio asset or speech-synthesis feature. Preserve a usable nonvisual route and Show me how; UX must settle and verify accessibility without leaking answers. No audio search. |
| 6 | Improve | UX + engineering | Add a visible timer bar for the original 10,000 ms display with accessible Time remaining label. Preserve learner initiation, expiry before recall, interruption handling and skip. |
| 7 | Improve | Engineering | Prevent ordinary selection, copy/cut and dragging of the timed number while visible. Scope this to the stimulus, preserving recall-field editing/paste and accessibility. This is an interaction requirement, not a claim that screenshots or all extraction are preventable. |
| 8 | Improve | UX + engineering | Keep the sixteen digits in fixed ordered positions while separators/groups are introduced; reserve final layout space. Event labels follow transformation. Preserve reduced-motion/nonvisual equivalents and explanatory replay. Verify actual motion; no UX acceptance claimed here. |
| 9 | Improve | Copy + rendering | Remove visible final annotation Slashes show the month, day and year within each group. Keep a single American month–day–year explanation with the two named events. Empty final description means render no paragraph; present the same meaning accessibly without duplicating it visually. |
| 10 | Improve | UX-owned interaction; copy supplied | Keep three short, separately named principles. Retire the repeated generic Show the next idea control in the proposed integration; UX chooses a simpler reveal consistent with deliberate, readable pacing. Do not add timed automatic advance or require more clicks as an unapproved teaching decision. Final interaction reconciled by Leo. |
| 11 | Improve | Copy; explicit interpretation | Name the third principle Memory hooks, then explain connecting new information to established old knowledge. Interpret Guy’s all information as old information, consistent with his source wording. Preserve the event-familiarity caveat and English-to-known-Hebrew progression. |
| 12 | Reconsider | Assessment removal recommendation | Remove MEMORY-A2.embedded.what-changed and its question, options, answer, feedback and quiz lead-in from the active lesson. Keep its full original object in baseline/history. Adds no replacement quiz. Removes the explicit scored/answered comprehension observation; the demonstration and optional comparison remain, with no mastery claim. Recommendation follows Guy’s concern; Leo reconciles it with UX before integration. |
| 13 | Improve | Sequence + state integration | Move MEMORY-A2.embedded.number-return inside page MEMORY-A2.learn.meaning as collapsed, optional content. Retire MEMORY-A2.learn.return from active order, preserving its historical identity and responses. Continue works without opening, attempting or viewing the comparison; Skip remains after opening. No extra compulsory page. |
| 14 | Improve | Studio / engineering handoff | Author/admin can edit source blocks in the same rendered lesson layout and leave anchored comments assistants can read. Preserve stable block/page/activity IDs and draft/revision history; enforce author permissions. No learner comment controls are moved into empty help. This content pack implements no inline editing. |

## Evidence and limits

Executed: node docs/curriculum/memory-feedback-20261031/prepare.mjs — nineteen structural/source-preservation checks PASS. See VALIDATION.json. The generated copy and exact before/after objects were read back. The baseline hash, digit order, duration, two activity IDs, unchanged comparison/initial feedback, all fourteen feedback mappings and original files’ no-mutation hashes were checked. These checks validate this editorial artifact, not app behavior.

No runtime/build/UI/accessibility test, schema import, state migration, CI, installation, live master readback, WordPress operation or Guy acceptance is claimed. No audio search or repeated six-comment/119-heading audit. No related automation exists for this task. Next owner: Leo reconciles this copy with UX Owner’s interaction design; Lead adapts and tests that coherent revision in the current implementation checkout before any installation.
