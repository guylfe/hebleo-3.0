# First 20 interactive lessons

Open **first20.html** in a browser. It is one self-contained file: pagination, choice checks, vocabulary reveals, written self-checks and the ten-second introduction work without a server. Source links require the connected account/internet. Preview progress stays in that browser and can be exported; this file does not access the Hebleo learner database.

The pack contains 20 lessons, 154 pages and 127 vocabulary targets. On the introduction’s second page, Play displays the original `0704177609112001` for ten seconds before hiding it for recall. Replay/reset and an untimed alternative are included.

## Content and sources

`FIRST20_CONTENT.md` contains all the lesson text and model answers for review. `content.json` is the structured draft. Explanations connect new material to familiar letters, vocabulary and sentence frames. Sources and adaptations are recorded per lesson. The original presentation text/notes and human-written WordPress lessons were read. Videos were located but not watched or transcribed; the draft does not claim recording-level fidelity. Native audio, original mnemonic artwork and final curated Nikkud remain authoring work. Adapted wording and answer models are not final human linguistic approval.

Plural **אלה** is explicitly taught in lesson20, **NOUN-PLURALS**. The later noun-phrase use is lesson34, **DEMONSTRATIVE-PHRASES**.

## Curriculum and IDs

`REDISTRIBUTION.md` records all 75 relocations and 18 additions in the prepared 114-lesson revision. `lesson-catalog.json` contains the resulting route. `lesson-id-map.json` maps 404 lesson records across the four routes to readable IDs such as **MNT**, **NOMINAL** and **PASSIVE-NIFAL**, independently of order. Source-platform IDs remain source references.

The native Sheets update is saved after renewed owner approval. All 114 lessons, 1087 targets, 528 sentences and 404 readable IDs match readback. All 30 active comment threads and conditional-format rules were verified. See SHEET_SAVE_RECEIPT.md. Application migration/installation remains separate engineering work.

`ENGINEERING_BRIEF.md` specifies the requested native Hebleo text-component support and alias-aware import/reordering behavior. The standalone reader is working; native application implementation and installation are separate engineering work.

## Build and checks

From the repository root with its existing Node dependencies:

```powershell
node docs/curriculum/first20-20261025/build-reader.cjs
node docs/curriculum/first20-20261025/test-reader.cjs
```

The build reads `content.json`, `reader.js` and `reader.css`; no remote source request is necessary. All 179 checks passed, including completion through all 154 pages and exact timer boundaries. `browser-review.json` records representative native browser inspection at desktop and narrow widths. These checks do not constitute Guy’s content approval, source-audio verification, or a native Hebleo installation.

`author-content.cjs` and `make-reports.cjs` are authoring utilities tied to private local source snapshots in `.curriculum-content-20261025/`. They are not needed to run or rebuild the reader. Page IDs and draft word-card IDs are frozen for this pack; engineering must map words to canonical lexemes and retain page identities across subsequent reordering.
