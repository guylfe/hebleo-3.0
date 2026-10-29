# Opening lesson revision — 30 October 2026

Editable master: https://docs.google.com/document/d/1ZC5w2lc89mwGQ1AtwMVQAKwwoaD8GU3PaCNmPPcgtYY/edit

Guy asked for his suggestions to be accepted, their writing style remembered, and the remainder of the affected lesson revised accordingly. All three tracked suggestion IDs were accepted through Google Docs’ native `acceptSuggestion` requests. Readback confirms no pending insertion/deletion suggestions. His six prose paragraphs remain verbatim, including the new introduction and Adam account.

## Changed

Only MEMORY-A2 was edited. Its six teaching screens now contain the welcome, Adam account, original timed number experiment, date explanation, method check, and second recall attempt. The five exercises include two ungraded recall attempts, two multiple-choice checks with every answer and feedback option, and personal application. Timer, leading zero, hidden-answer, replay, untimed and nonvisual behavior are specified as placeholders for implementation.

The original presentation’s slides 7–9 supply the number `0704177609112001`, ten seconds, two date associations and connection principle. Slide 10 connects that principle to letter mnemonics. The captured original source was read; the earlier first20 adaptation was consulted and explicitly distinguished from the human source. New connective prose and exercises remain adapted draft content for Guy’s review.

The three remembered preferences cover personal explanatory voice, reusing established source demonstrations, and presenting phrasing alternatives in chat. `WRITING_STYLE.md` gives the concrete reference for further authoring.

## Verification

Command actually run:

`C:/Users/Trans/.local/bin/python3.12.exe -X utf8 docs/curriculum/master-course-revisions-20261030/verify.py`

PASS: exact reviewed replacements; all three suggestions accepted; all six Guy paragraphs verbatim; both comment threads preserved; all 119 lesson headings/links preserved; existing in-lesson heading identities preserved; every paragraph and style outside MEMORY-A2 unchanged; six screens numbered correctly; five exercise answers; complete choice feedback; old object/shape tasks removed; number and timer conditions present.

The first verification run counted all H1 headings as lesson headings and included front matter. The assertion was corrected to count the 119 numbered lesson headings while comparing the complete H1 identity list for preservation; no document change was required.

Evidence files retain the affected lesson and hashes of the surrounding document, rather than duplicating the whole master. `edits.json` records the exact 51 paragraph replacements. `MEMORY-A2_REVISED.md` is a dated readable readback with trailing spaces removed for Git; the exact native text remains in `after.json`. Neither is a second master. The 29 October generation scripts and snapshots remain historical; they must not be run to overwrite live edits.

## Limits and next review

Native document content and structural readback were verified. This turn did not perform a rendered PDF or browser layout review, implement interactions, update A2, alter the deferred numbers sequence, or publish to the course.

Guy’s new B2 wording differs from B1 in original slide 4. His wording is preserved and the discrepancy is raised in chat. His 500/70-hour account remains attributed author content, not an independently verified result or learner guarantee. Next review belongs to Guy: phrasing alternatives and this level label. The adapted remainder is also available for his review.

Draft component IDs describing replaced tasks were retired: `learn.picture-round` → `learn.number-round`, `learn.intervening-task` → `learn.meaning`, `embedded.objects-first` → `embedded.number-first`, `embedded.shape-break` → `embedded.what-changed`, and `embedded.objects-return` → `embedded.number-return`, all under `MEMORY-A2`. This is an unpublished document draft; no app IDs or learner progress were migrated. Lesson and native heading identities remain unchanged.
