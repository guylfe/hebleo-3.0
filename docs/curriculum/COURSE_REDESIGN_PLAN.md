# Course redesign plan

Status: working document, 2026-10-06. Owner: Hebleo Curriculum Designer, working with Guy Landau.
Nothing here is approved curriculum. Product decisions are attributed to Guy; everything else is a **proposal**.

Sources read (read-only): Course Progression sheet (tabs `Old`, `New`), Masterfile (`Masterfile` and
`Missing Vocab` tabs), `docs/MASTER_SPEC.md`, and the current app code (`src/store.js`, `src/tutor.js`,
`public/ux.js`, the `lead/b2-draft-api` branch).

## 1. Guy's decisions (2026-10-06)

| # | Decision | Consequence |
|---|---|---|
| D-R1 | Revamp the course into smaller lessons with more topics and less vocabulary per lesson. All existing vocabulary plus the suggested Missing Vocab are included. | Conservative split first (see section 2); reordering is discussed afterwards. |
| D-R2 | Existing videos are re-edited: no lesson numbers, no before/after references, no intro or outro. A video that explicitly builds on an earlier lesson may keep that reference. New material gets new videos. | Any remaining cross-reference must point to a stable lesson ID, never to a number. |
| D-R3 | Video cuts become separate files, not start/end times inside a longer video. | One media asset per video block. No segment model is needed. |
| D-R4 | **Departure from MASTER_SPEC §58.** The new course version is not frozen to protect existing students. They either finish the course version they are enrolled in, or are offered a quick "see what you know" pass into the new version. | Course versioning plus a placement/review pass. Progress is not migrated lesson by lesson. |
| D-R5 | Vocabulary-expansion / story lessons are wanted between grammar lessons, so learners apply what they know. Pacing is to be decided. | The `vx-` lessons in the New tab. |
| D-R6 | The new sheet layout and an initial conservative order are approved for drafting in the `New` tab. Discussion follows, and Guy will add further topics. | The New tab is drafted; every row has Status = Proposed. |
| D-R7 | Lesson composition must be modular, not opinionated. | See section 5. |

## 2. Conservative structure (drafted in the `New` tab)

- Old order is kept. Each of the 37 old lessons is split by concept, using the Masterfile's existing `Part` column where it exists. The result is 90 proposed lessons, `Order` 10–900.
- Each row has:
  - a proposed stable Lesson ID (a slug, e.g. `binyan-nifal`);
  - a Type: Letters / Nikkud / Grammar / Vocab expansion / Review-reference;
  - Builds on (lesson IDs);
  - old-lesson provenance;
  - an approximate headword count;
  - the Missing Vocab already suggested for that lesson.
- Vocabulary is assigned to lessons as a whole. Assigning individual words is step 3, after Guy reviews the structure.
- 278 Missing Vocab rows have Suggested lesson = TBD and are not placed yet.
- Rows marked "Over 15: may split" are still heavy.
- 5.5 has Masterfile vocabulary but no old lesson or video. Its rows are new vocabulary-expansion lessons.

## 3. Vocabulary load (correction to an earlier estimate)

The Masterfile stores each conjugated verb form as its own row, so its row counts overstate the load.

| Measure | Count |
|---|---|
| Masterfile headwords (one per lexeme; conjugation rows counted once) | ≈ 843 |
| Missing Vocab rows | 343 |
| Total | ≈ 1,190 |

The jump in load at unit 5 is milder than first reported. 5.1, 5.2, 5.25 and 5.5 are still the heaviest old lessons.

Method: a verb row counts as a headword when its English starts with "(he)", "he ", "to " or a present participle. The other form rows of the same verb are folded into it. These are approximate counts, not a linguistic judgement.

## 4. Known sequencing issues (Reconsider)

- Nikkud is used before it is taught:
  - shva and hataf appear in 1.3, 1.35 and 2.15, but shva is taught in 2.3;
  - holam appears in 2.25, before 2.3.
- Present-tense forms appear from 2.25, but "present tense" is taught in 4.3.
- **שלום** cannot be spelled until ש arrives in old 3.2. Guy may want to move letters earlier. Moving letters changes which words every early lesson can use, so it also affects grammar order. The gating checker (section 6) measures that impact before anything is moved.

## 5. Modular lesson composition (requested from engineering)

Today the engine requires exactly 3 blocks per lesson (explanation / vocabulary / exercise-set; `src/store.js`), and both word and exercise lists must be non-empty.

Guy's requirement is an ordered list of blocks of any type and count, including:

- no vocabulary;
- no exercise;
- several exercise sets;
- vocabulary, exercise, vocabulary, exercise;
- more than one video.

Learn / Check / Vocabulary / Apply / Continue then becomes the default template, not a rule.

**Curriculum view on a second "guided test" video (Improve):**
- Prefer interactive on-screen check items: the learner answers first, then sees Guy's explanation as a short clip or text for that item.
- This keeps the immediate-answer teaching of a guided-test video, but the items are graded, retried, reordered and reused.
- A narrated guided-test video is still allowed as a second video block where Guy wants one.

## 6. Making exercises cheaper: sentence bank and gating checker (proposal)

**Principle:** don't regenerate sentences when a lesson moves; re-check them.

1. **Sentence bank.** Each human-approved sentence records:
   - its tokens' word or form IDs;
   - the grammar-construction tags it needs (e.g. `past-1sg`, `smikhut`, `relative-she`);
   - native audio, when it exists.
2. **Eligibility is computed.** A sentence's earliest eligible lesson is the latest lesson among everything it needs. Moving a lesson recomputes eligibility and flags only the sentences that now come too early.
3. **Exercises come from sentences through templates** (cloze, ordering, translation, listening, and so on). No new Hebrew is written for each exercise. One approved sentence feeds several exercise types and lessons, so spiral review comes for free.
4. **New sentences:**
   - an AI drafts them from the allowed words and constructions;
   - a deterministic checker rejects any unlearned word, form or construction;
   - Guy approves.

**Risk assessment for Guy's question 8:**
- Vocabulary leaks can be caught reliably. The checker needs a form index built from the Masterfile, including its conjugation rows, with ו/ה/ב/ל/מ/ש/כ prefixes stripped.
- Grammar leaks are the weaker point. They are caught only as well as constructions are tagged. A short list of construction detectors plus Guy's approval covers this.
- The remaining real cost is native audio for new sentences.

## 7. Masterfile conversion timing (proposal)

- **Now**, with Guy's explicit authorization: add stable Lesson ID and word ID columns to the sheets. This is cheap, and it makes every later step safe. Writing IDs into the source sheets requires that separate authorization (see CONTENT_CONTRACTS).
- **Later:** convert to the app format after the importer and the modular lesson model exist, so the content is converted once, not twice.

## 8. Grammar topics not yet in the progression

These topics have no named lesson in the `Old` tab. Some may be partly taught inside existing videos or texts, and **Guy should confirm** before any are added.

Evidence key:
- **absent** = the word is not in the Masterfile or Missing Vocab;
- **MV only** = it appears only in Missing Vocab;
- a lesson code = where the word appears in the Masterfile.

**Verbs**
- Full past paradigm: you (m/f/pl), we, he. Only she/they (2.325) and I (2.35) are named.
- Future tense of פעל and נפעל. Only the future derived from present for פיעל/הפעיל/התפעל is named (5.35).
- Imperative and negative imperative (אל + future).
- Pi'el as its own lesson. It appears in 2.15 forms and in 3.15 meanings only.
- Passive binyanim פועל / הופעל.
- Weak-root classes in their own right (ל"ה, ע"ו, פ"נ, פ"י). Old 2.35 introduces גזרות and 5.25 covers gutturals.
- "To be" in past and future: היה is in 1.4, 2.15 and 5.3; **יהיה is absent**.
- Habitual past: היה + participle.
- Passive participle (כתוב, סגור).
- Verbal nouns (שם פעולה).
- Verb + required preposition (מחכה ל, מפחד מ, מדבר עם).
- Impersonal plural (אומרים ש…).

**Modality and clauses**
- Modals + infinitive as one lesson:
  - צריך (3.25, 5.3), יכול (5.3), רוצה (3.2), חייב (5.2, 5.3), אפשר (5.5);
  - **אסור, מותר, כדאי are absent**.
- Conditionals: אם (**MV only**); unreal לו / אילו.
- Purpose כדי ל (**absent**); concession למרות / אף על פי (**absent**).
- Clause connectors: כש (4.15, MV), לפני ש / אחרי ש (partly in `time-clauses`), כי (4.2).
- Relative clauses with a returning pronoun (הבית שגרתי בו).
- Reported speech and tense (אמר ש…).

**Nouns, pronouns and prepositions**
- Possessive suffixes on nouns: partly in old 5.4 / 5.45 vocabulary; no lesson is named.
- אצל (**absent**).
- Reflexive and reciprocal: עצמי (**absent**), זה את זה.
- Dual ־ַיִם: ידיים (**absent**), פעמיים (**absent**).
- Irregular plurals: Missing Vocab groups G1–G10.
- Definiteness agreement (הבית הגדול).

**Quantity, comparison and time**
- Comparatives and superlatives as a lesson: יותר (3.2, 3.25), הכי (3.1), פחות, מ־ / מאשר.
- Negative quantifiers: שום (**absent**), אף אחד; never/nobody/nothing are in 4.35.
- Numbers:
  - number–gender agreement (שלושה / שלוש);
  - counted nouns;
  - ordinals beyond first/last/second (4.3);
  - days, months and dates.

**Spelling and sound**
- Prefix vowel changes: וּ before בומ"פ / shva; בַּ / לַ / כַּ absorbing ה; מֵ before gutturals.
- Locative ה (הביתה is in 3.1 as vocabulary).
- Stress and its effect on meaning.
- Reading unvowelled text (כתיב מלא), the bridge from Nikkud to normal text.

## 9. Engineering to-do requested by Guy (handed to the Lead and Architect)

| Timing | Item |
|---|---|
| Future | **Dynamic keyboard highlighting.** Each lesson declares the letters it introduces. Highlighted keys are derived from all lessons before it in course order, so a reorder updates highlighting automatically. The keyboard layout stays fixed. This replaces the hand-typed `letters` / `keyboard.knownKeys` / `newKeys` fields. |
| Implement | Modular ordered lesson blocks (section 5). Progress is keyed by block ID. This is a schema change and must be documented. |
| Soon | Remaining MASTER_SPEC §12 exercise types. Curriculum priority: listening, dictation, translation in both directions, root/pattern identification, conjugation, gender/agreement, Nikkud add/remove. |
| Future | **Skill tree.** A visual, gradually unlocking "video-game" map built from Guy's topic diagram and the `Builds on` data, showing the learner's progress. |
| Implement | Course versions with a placement / "see what you know" pass (D-R4). |
| Implement | One media file per video block (D-R3). |
| Future | Sentence bank plus gating checker (section 6), as Studio tooling. |

## 10. Open items for Guy

1. Review the New tab structure: splits, titles, and which `vx-` lessons to keep.
2. Send the topic diagram, for the skill tree and the `Builds on` column.
3. List the other topics to add.
4. Confirm which section 8 topics are already taught somewhere.
5. Decide whether to move letters earlier (e.g. ש for שלום). The checker can measure the impact first.
6. Authorize, or decline, adding ID columns to the Masterfile and Course Progression sheets.
