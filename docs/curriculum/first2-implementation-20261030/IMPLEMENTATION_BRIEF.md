# First two actual lessons in the current local software

Guy requested on 30 October 2026: “Go through the comments I left on the first 2 lessons. Implement both lessons fully into the software as it exists now, so I can test them. Replace the existing placeholder lessons with these actual lessons.”

This authorizes replacing the first two placeholder learner lessons in the local demo. It supersedes the earlier first20 restriction to unpublished drafts for this bounded replacement. It does not authorize live WordPress publication or replacement of the rest of the course. Leo selects the engineering owners; Lead owns integration and installation.

## Canonical source and exact handoff

- Editable master: https://docs.google.com/document/d/1ZC5w2lc89mwGQ1AtwMVQAKwwoaD8GU3PaCNmPPcgtYY/edit
- Verified snapshot revision is recorded in `verification.json`. `MEMORY-A2.md` and `MNTL-A2.md` contain the complete current source; their JSON counterparts retain paragraph styles and source indexes. Read these files in full, including all answer options and feedback.
- The master is authoritative if Guy edits again. Reconcile later changes before installation; never overwrite it from the old October 25 first20 pack or October 29 generator.
- 39 scoped text edits and three bold titles were applied. All 11 comment threads, 119 lesson headings, index links and all content/styles outside lessons 1–2 remain intact. `verify.py` verifies that record.
- The new material is adapted wording authorized for local testing, not a claim of final linguistic acceptance. Guy’s supplied account and personal wording remain intact.

## Six comments resolved

| Comment | Applied resolution |
|---|---|
| `doco.e0kgKI6nYeNHgXMTPfqEAg`: show principles one by one, titles bold | Explicit click-driven reveal with three bold titles; keep prior items visible. |
| `doco.MT-syp-_g1vu-V7LtQGCfg`: catchier connection label | “Memory hooks”, with the complete meaning retained. This label remains reviewable. |
| `doco.-buediyvaLruR72f1Zs0fw`: redundant theory | Removed the optional network paragraph and its control; it repeated the explanation. |
| `doco.gz3XDW4G8X5K65OvB69jsQ`: test understanding, not names | Replaced principle-name matching with one three-option application question about dates whose events are unfamiliar. Exact prompt, answer B and feedback are in the source. |
| `doco.K4KraDCF4pTVBDJN1xJC_w`: optional comparison | Opening, attempting and viewing the second recall/comparison are all optional. Continue without it is a complete valid path. |
| `doco.tDXMGKRjOTzDfiAK494vOQ`: teach all four letters together | All four letters, mnemonic pictures and sound buttons precede the first exercise on one page. The two-pair split is removed; the first recognition question now has all four options. |

## Required installed behavior

Use the current native learner/Studio implementation and normal navigation. A standalone HTML reader, draft-only import, JSON pack or static author instructions do not satisfy this request. Do not display IDs, implementation instructions, answer models, source metadata, unresolved asset markers or internal review language as learner prose.

MEMORY-A2:

1. Full welcome and Adam text, including supplied emphasis on 70 hours. No deleted B1/B2 reference.
2. User-initiated ten-second display of the **string** `0704177609112001`, preserving its leading zero. Hide before input. No dates, clues, answers, compulsory retry or mastery gate. Honor Show me how/skip and interruption paths. Exact correct responses receive honest feedback; do not assume everyone failed.
3. Real staged number-to-dates animation: `0704177609112001` → `07041776 · 09112001` → `07/04/1776 · 09/11/2001`. Preserve every digit. Add event labels only after transformation. Replay is allowed for the explanatory animation, not as an initial memorisation drill. Provide a reduced-motion and nonvisual equivalent.
4. Three principles revealed on successive learner clicks, bold titles, previous items retained, no auto-advance. Keyboard-accessible controls and sensible focus.
5. One application multiple-choice question with all three options, answer B and authored option-specific feedback. No principle-name matching or filler questions.
6. Entire second recall/comparison optional. “Continue without it” must complete normally; opening it must still allow Skip. If used, preserve raw responses and show only attempts actually made. Implement exact, reversed-date, omitted-zero, day/month, partial and empty feedback as specified. No guessing that arbitrary strings are valid dates. No retry/mastery requirement.
7. Empty vocabulary is intentional; do not add dummy terms or empty learner stages to fill the course template.

MNTL-A2:

1. Teach מ, נ, ת and ל together with their four original source mnemonics and individual genuine consonant audio. Teach sounds, not memorisation of letter names. No final forms, vowels or vocabulary quota.
2. Three Learn pages after merging the former third page into the first. Existing page ID `MNTL-A2.learn.mem-nun` remains the stable ID for the expanded four-letter page; `MNTL-A2.learn.tav-lamed` is retired from this unpublished sequence and its teaching is merged there. Other exercise IDs remain stable. The historical internal ID is not a learner title.
3. All seven activities work: four-option /n/ recognition; copying ל with the keyboard; four-option /t/ recognition; four sound/letter matches; /m/ typed recall; /l/ typed recall; optional four-letter read-aloud self-check with individual model buttons. Exact prompts/options/models/feedback are in MNTL-A2.md. Accept appropriate Hebrew input without requiring Nikkud; never accept ם as the printed מ requested here.
4. Correct-key highlighting belongs only to copying, never sound recall. Existing Hebrew keyboard must work with normal page interactions. No handwriting requirement or automatic pronunciation scoring.
5. On completion the normal next-lesson/course navigation works. No duplicate placeholder entries for these two slots.

## Assets and remaining acquisition work

Original presentations and extracted assets are local under `tmp/first2-assets/` in this shared checkout; exact source IDs, hashes and shapes are in `assets.json`. Do not commit uploaded/original media; use the existing local media installation mechanism and preserve its backup/manifest. The small source manifest and extraction recipe can be committed.

- Original Presentation.pptx: Drive `1ImMGqVDWT8BMN63xay1-DT7ug3Z1W9mr`, slides 7–9 are the memory demonstration.
- Hebleo Mnemonics.pptx: Drive `1uiqfsKtxSpSddZgvOSZPtJPtTAK-i8xn`, slides 2 and 6 are the four source mnemonic drawings. Preserve the source composite, crop and orientation: the nose is a cropped/flipped region of a four-nose image, not four different new mnemonics; the mountain/climber combines two source SVGs. White source artwork needs a contrasting background. The recipe records original drawing XML and relationships.
- Original MNT video verified from WordPress lesson 25321: https://vimeo.com/766031355/154e8ccd8a . WordPress remains read-only.
- Standalone /m/, /n/, /t/, /l/ recordings have **not yet been found or verified**. WordPress audio searches for mem, nun, tav, lamed, letter and consonant found no isolated samples. Do not invent source claims, use whole-word recordings as isolated consonants, or silently substitute speech synthesis. Seek the existing source media/recordings and recover exact human clips if available, with provenance and listening verification. Curriculum can review concrete clips when returned. If genuinely unavailable after the targeted search, return that exact limitation while completing all independent implementation; do not claim full completion or expose inert audio buttons.
- Source Drive folder `16EdEF9vxnzClpD9RHI2TUPbe-vjAt34R` contains Original Presentation, All files (`1jWmzVqA55prebq3-mrfpEdgn5cLewFAD`), New files (`1wyfomQ2rAdU972-bpRIRZt04Jdb5IHnK`), Other (`1vZOfU1koseKArLkIK17wlOOjZkeT_R6v`) and New videos (`1nA_gSg38BPQKH2scN5Q-f4LQNIGgSQzk`). All files first 100 results were mostly course docx/PDF materials; coverage was partial. Avoid repeating that broad listing. The isolated /l/ may need the original ג/ד/ל video rather than the MNT video.

## Installation, identity and verification

The live local demo was read this turn at `http://127.0.0.1:63358/api/build`: revision `83abf400467f2206e9a88356bdf8352ff7add2bf`, runtime hash `6f1c7576c8f4345da4cbd3fd92e29f18dd879d44cd169cd8b9875b3c85dd25ec`, preservationMode true. Inspect current state before changing it. The shared checkout itself is older and dirty; do not build or deploy it wholesale. Use Lead’s current integration checkout and scoped branches.

Back up current authored content/media/settings and fictional progress according to existing installation rules. Replace the intended first two active placeholder slots with explicit source identities, retaining revision history; do not silently equate unrelated synthetic IDs or transfer their exercise verdicts onto the new questions. Keep the remaining authored lessons, drafts and unrelated data unchanged. Follow the repo’s startup policy for fictional test progress; do not use a blanket database reset or touch real student records.

Required evidence: exact content mapping and installed lesson/revision IDs; local media hashes and verified playback; learner and Studio parity; normal Continue/completion on optional and empty-response paths; answers hidden until appropriate; timer and animation/reduced-motion behavior; keyboard copy/recall distinction; RTL letters and LTR digits; focused tests plus required repository checks; served build/version readback; actual mounted-browser walkthrough when available. Automated or HTTP verification is separate from native interaction evidence. Give concrete links/instructions for Guy to test and identify anything still unverified.

No software change has been installed by Curriculum at this handoff. The authoring changes and source audit are complete; engineering implementation, installation and installed walkthrough are the next work.
