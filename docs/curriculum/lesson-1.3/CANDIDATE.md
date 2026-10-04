# Lesson 1-3 candidate: "Vowel Letters א,ה,י (6 of 22)"

**UNAPPROVED. For Guy's review.** Built only from Guy's existing materials. No Hebrew, answers, distractors or teaching text were generated. Only the items marked *proposed* are new wording or app settings. Machine-readable files:

- the candidate: `candidate-pack.json`
- the evidence: `../../content-provenance/lesson-1.3-source-rows.json`

The current store rejects this pack on purpose, because its provenance is `source-candidate-unapproved`.

## Lesson shape

| Step | Source | Candidate |
|---|---|---|
| **Learn** | WordPress lesson 25328: Vimeo video `740173416`. No written explanation or transcript. | The video, exactly. No explanation text is invented. |
| **Vocabulary** | Masterfile rows with Lesson `1.3` (12) and `1.3.5` (8), in source order | 20 words with exact Hebrew/English/Notes. Other sheet columns (Gender, Plural, Root, Pattern, Type) are kept in `sourceFields`. |
| **Check** | Exercise 1-3 PDF, Exercise 2 (transliteration → Hebrew letters). Red answer key. | 13 `typing` items in the printed order. The 3 black worked examples (Mi, Hi, Yayin) are not graded. Lookup is off, because the PDF says not to look at the vocab sheet until done. |
| **Apply** | None for 1-3 in the source | **Gap, left empty.** The first sentence material appears in the 1.4 notes (מָתָן נָתַן; אָת תָמִי?). |
| **Continue** | → Lesson 1-4 | Unchanged. |

Exercise 1 (Hebrew → transliteration + meaning) has **no matching app exercise family**. It is listed under D5 and not approximated.

## Vocabulary (exact source strings)

| Row | Lesson | Hebrew | English | In exercise | Audio candidate |
|---|---|---|---|---|---|
| 1 | 1.3 | יָם | Sea | Ex1 example, Ex2 | 41669 yam |
| 2 | 1.3 | יַיִן | Wine | Ex1, Ex2 example | 41653 yayin |
| 3 | 1.3 | מַיִם | Water | Ex1, Ex2 | 41586 mayim |
| 4 | 1.3 | מֶאָה | Hundred | Ex1, Ex2 | 41587 mea |
| 5 | 1.3 | אָמָּן | Artist | — | 41431 aman |
| 6 | 1.3 | מַתָּנָה | Gift, present | Ex1, Ex2 | 41579 matana |
| 7 | 1.3 | אִמָא | Mom, mother | — | 41539 ima |
| 8 | 1.3 | אִי | Island | — | 41537 i |
| 9 | 1.3 | מָנָה | Dish | — | 41575 mana |
| 10 | 1.3 | אֱמֶת | Truth | — | 41480 emet |
| 11 | 1.3 | תֵימָן | Yemen | — | 41640 teiman |
| 12 | 1.3 | נָתַנְיָה | Natanya | — | 41613 natanya |
| 13 | 1.3.5 | אֲנִי | I | Ex1 example, Ex2 | 41442 ani |
| 14 | 1.3.5 | אַתְ | You (singular female) | Ex1, Ex2 | 41445 at |
| 15 | 1.3.5 | אַתָּה | You (singular male) | Ex1, Ex2 | 41446 ata |
| 16 | 1.3.5 | אַתֶּם | You (plural) | Ex1, Ex2 | 41447 atem |
| 17 | 1.3.5 | אַתֶּן | You (plural, only female) | Ex1, Ex2 | 41448 aten |
| 18 | 1.3.5 | הִיא | She | Ex1, Ex2 example | 41528 hi-she |
| 19 | 1.3.5 | הֵם | They | Ex1, Ex2 | 41526 hem |
| 20 | 1.3.5 | הֵן | They (only female) | Ex1, Ex2 | 41527 hen |

Row numbers here are only locators. The stable IDs are listed in `lesson-1.3-id-map.json`. The exercise also uses rows 23 מִי, 24 מָה, 25 מָתַי and 28 נָתַן, which the sheet places in Lesson **1.4** (see D1).

## Source discrepancies (not resolved)

- **S1 Dagesh:** the sheet has מַתָּנָה, אַתָּה, אַתֶּם, אַתֶּן. The exercise answer key has מַתָנָה, אַתָה, אַתֶם, אַתֶן.
- **S2 "you (f.)" has three forms:**
  - sheet row 14: אַתְ (shva)
  - exercise: אַת
  - row 26 note: אָת (qamats)
- **S3 Yemen:** row 11 has תֵימָן (tsere). The row 26 note has מִתֶימָן (segol).
- **S4 English labels differ between sheet and exercise:**

  | Sheet | Exercise |
  |---|---|
  | Hundred | Hundred (100) |
  | You (singular female/male) | You (single female/male) |
  | You (plural, only female) | You (plural all-female) |
  | They | They (plural) |
  | They (only female) | They (all-female) |

- **S5 Truncated note:** the row 16 note ends mid-sentence: "…applies to mixed groups and all-male groups, ".
- **S6 Lesson membership:** the exercise tests four 1.4 words (see D1).
- **S7 Matai missing:** Exercise 2 omits Matai. Exercise 1 has 17 items and Exercise 2 has 16.
- **S8 Two audio candidates for נָתַן:** 41612 `natan-gave` and 43658 `natan-noten`.
- **S9 Bold syllables:** the exercise bolds one syllable per multi-syllable word (e.g. יַיִן → יַ, מָתַי → תַי). This looks like stress marking but is not confirmed. The sheet's own bold runs were not captured (CSV).
- **S10 Exercise transliterations:** these use a backtick (`` `ani ``, `` `ata ``) and an ASCII apostrophe (`Me'a`). The characters are kept exactly as extracted.

## Pedagogy notes

- **Preserve:**
  - The worked-example-first exercise layout.
  - "Learn first, don't look until done" (mapped to lookup off).
  - The pronoun-family note: all four begin with "אַת".
  - Hi "hee, not hai". This connects forward to row 27 הַיי "Hi" in 1.4, a good spiral link.
- **Improve:** these items need a decision before anything is changed.
  - Show the worked examples on screen before the Check (the app's `reveal` interaction could carry them).
  - Attach confirmed native audio to every word.
- **Reconsider:**
  - Testing 1.4 words inside the 1-3 check runs against "new connects to old". Either teach them here or move those items to 1-4 (D1).
  - The lesson has no Apply step. Any sentence work needs Guy's own material.

## Decisions needed from Guy

- **D1:** Does Lesson 1-3 include מִי, מָה, מָתַי, נָתַן?
  - Option a: as the exercise implies.
  - Option b: they stay in 1.4 and their items move.
  - Candidate default: the vocabulary list follows the sheet, and the check follows the exercise.
- **D2:** Which Hebrew is canonical where the sheet and exercise differ (S1–S3)? The learner feedback shows the sheet form.
- **D3:** Curated Nikkud for each word. The candidate copies the sheet form for now.
- **D4:** Should the typing check require Nikkud? The candidate says no. If yes, the answer-key forms in S1/S2 would be marked wrong (verified by the check script).
- **D5:** Exercise 1 (write transliteration + meaning):
  - Option a: a new transliteration exercise family with your accepted spellings.
  - Option b: meaning only, as multiple choice using other lesson meanings.
  - Option c: keep it as the PDF.
- **D6:** Confirm or reject each audio candidate, and pick the נָתַן file.
- **D7:** Is the bold syllable stress, and should the app show it?
- **D8:** Is "1.3.5" its own lesson or part of 1-3? (The candidate merges it, following the exercise and WordPress.)
- **D9:** Which English label is canonical (S4), and what is the full text of the row 16 note (S5)?

Placeholders that need no teaching decision: `minutes: 5` (the video length was not retrieved) and `chapter: "Lesson 1-3"`.
