# Content provenance: lesson 1-3 source audit

Status: **evidence only. Nothing here is approved, canonical or importable.** Owner: Hebleo Curriculum Designer. Captured 2026-10-04.

## Source inventory

All sources were read without modifying them, and only curriculum/media sources were accessed. No learner, account or purchase records were read.

| Source | Locator | Captured | Integrity |
|---|---|---|---|
| Ultimate Vocabulary Masterfile (Google Sheet, owner guylfe@gmail.com, modified 2026-08-21T12:51:21Z) | Drive `1d9b3mFnRhubmdq7gJ5VMJBA9dyhwS6GSI6V95M0xSVc`, `Sheet1!A1:AD1059` | CSV export, values only | snapshot sha256 `d0cd29c4bf641841a5a26f494c361cbc6832730434b658de4108b75e22bce0c5`; per-row `rowSha256` in `lesson-1.3-source-rows.json` |
| WordPress lesson "Lesson 1-3: Vowel Letters א,ה,י (6 of 22)" | `sfwd-lessons` 25328 (modified 2025-12-24) | Body = Vimeo `740173416` + Elementor template 44954 | No transcript exists in the post |
| WordPress topic "EXERCISE: 1-3 Pronunciation and Vocabulary" | topic 25717 | blank PDF media 28386, solved PDF media 28389 | sha256 `b125758b…389e` / `4ff61bec…aaec` (full values in evidence JSON) |
| Native audio candidates | WordPress media, `uploads/2025/10/*.mp3` | IDs and URLs only, no bytes downloaded | **Filename match only. None confirmed.** |
| Old plugin `hebleo-vocab-sheets` (PHP) | WordPress plugin source | read to learn formatting semantics | It reads Sheets grid data, including `textFormatRuns` (bold/italic/underline/color). So the sheet's formatting is learner-visible teaching content. |

The snapshots are stored outside the repository, in the Curriculum Designer workspace at `source-snapshots/`. They are not committed: the files are owner-private and some are large.

## What is not captured yet

- **Sheet formatting:** CSV does not carry rich runs, colors, notes or hyperlinks. Faithful formatting requires a read of the Sheets grid data. Until then, `formattingCaptured: false`.
- **`No_Vocab`, `No_Card`, `Audio`, `Pl. Audio`, `Fem. Audio`, `Pl.Fem. Audio`:** these columns are empty in all 1,058 data rows. There is no source evidence for flag semantics, so nothing is mapped or activated.
- **Video transcript or duration:** not available from the lesson post.

## Identity rules (sidecar `lesson-1.3-id-map.json`)

1. IDs (`hw-…` words, `hx-…` exercises, `hl-…` lessons) are minted once and are random. An existing map entry always wins, and the build never regenerates an ID.
2. Row ordinals and PDF positions are recorded as source locators (`rowAtCapture`, `printedPosition`), never as identity.
3. Proposed re-import matching:
   - First, an exact `rowSha256` match keeps the ID.
   - Next, a unique exact Hebrew+English match keeps the ID and is flagged for review.
   - Anything else stops for a human decision.
   - A row that is absent from a new export never deletes content.
4. Source-sheet ID columns are not written. That needs separate authorization.

## Reproduce

```
node docs/content-provenance/tools/extract-source-rows.mjs <masterfile.csv> 1.3,1.3.5,1.4 > rows.json
node docs/content-provenance/tools/build-lesson-1.3.mjs rows.json   # idempotent; refuses other snapshot hashes
node docs/content-provenance/tools/check-lesson-1.3.mjs             # fidelity + validator checks
```

## Files

- `lesson-1.3-source-rows.json`: exact cells for masterfile rows 1–29 (lessons 1.3, 1.3.5, 1.4). It also holds the exercise transcription (roles, bold segment, differing Hebrew forms) and audio candidates.
- `lesson-1.3-id-map.json`: the stable-ID sidecar.
- `../curriculum/lesson-1.3/`: the reviewable lesson candidate and the decisions needed.
