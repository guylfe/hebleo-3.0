# Master course authoring document — first ten drafts

Editable master: https://docs.google.com/document/d/1ZC5w2lc89mwGQ1AtwMVQAKwwoaD8GU3PaCNmPPcgtYY/edit

Guy approved the course-wide document format on 29 October 2026 and asked Curriculum Designer to begin. One expandable master document now contains 119 linked lesson sections following the live A2 route: the first ten are detailed drafts and the remaining 109 are planned entries. Format approval is not linguistic approval of the new content.

## Delivered

- 49 teaching screens with exact learner text, meaningful breaks and specified interactions/media placeholders.
- 71 authored exercises with full prompts, choice/token pools, correct or accepted answers, feedback and explicit shared behavior. Matching response pools do not mirror prompt order.
- 43 planned vocabulary/structural entries plus two current feminine role forms. All entries have practice coverage. Current display, source fields, learner notes and future morphology are distinguished.
- Stable IDs, source references, approval/build/verification fields and per-lesson review notes. Shared instructions appear once; condensation retained all 119 lesson heading identities and index destinations.

## Authority and limits

The live A2 route and vocabulary workbook were read; neither was edited. Original presentation text/notes and mnemonic text were read from earlier captured sources. Videos were not watched or transcribed in this task. Earlier first20 generated material was explicitly used as an adaptation reference, not an independent human source or the current sequence.

The Google Doc is the editable authoring master. Local files are a dated snapshot and evidence, not a second independently maintained master. Read and reconcile live document edits before regenerating anything. `author.py` writes local files only; it cannot publish or update the document.

Native recordings and original mnemonic artwork remain specified placeholders. New prose, exercises, feedback and display pointing are drafts for Guy. Seven entries (תאנה, תא, תו, אות, מילון, המון, אולם) lack canonical bindings here. Written-letter אות must not be silently bound to sign/signal. Source manager spelling and the proposed sheva display are explicitly distinguished. No course implementation, import, publication or learner-data change occurred.

## Verification actually performed

- `python3.12.exe -X utf8 docs/curriculum/master-course-20261029/author.py`: generated the local snapshot.
- `python3.12.exe -X utf8 docs/curriculum/master-course-20261029/audit.py`: PASS. IDs/order match the 119-row plan; all 43 planned entries covered; answer pools valid; 173 authored IDs unique; no untaught consonant letters in bounded learner material.
- Manually reviewed the learner-word inventory and removed a premature לא preview from lesson 8. Supplied names, feminine forms, practice syllables and full/standard variants are accounted for.
- Google Docs readback: exact 198,164-character authored text, 2,319 paragraphs, correct named styles, 119 correct internal index links. All 119 lesson heading IDs survived condensation.
- Native PDF export: no text outside any of the 116 page bounds; representative index, lesson text, vocabulary and prefix pages visually inspected. This does not certify every page or the actual course UI.

Evidence: `audit.json`, `learner-word-inventory.json`, `DOCUMENT_VERIFICATION.json`. Readable mirror: `MASTER_COURSE_DRAFT.md`; structured snapshot: `lesson-specifications.json`. `asset-requirements.json` supplements the full asset and exercise-stimulus specifications in the document.

## Handoff

Guy reviews the first ten Draft sections. Specific linguistic/source questions appear in each lesson's author notes. Further authoring expands the existing planned sections in place. Leo receives the document pointer and private checkpoint; no teammate review is implied.
