# Hebleo Project, Product, Curriculum, and Multi-Agent Development Specification

**Status:** Working master specification  
**Purpose:** Define Hebleo's product vision, pedagogy, curriculum architecture, software architecture, content-management model, development roadmap, and specialized AI-agent team.

This document is intended to serve as the shared high-level source for:
- curriculum redesign,
- architecture decisions,
- implementation planning,
- agent instructions,
- and eventual Codex / Claude / Grok development workflows.

It combines the agreed Hebleo product and curriculum specification with the proposed multi-agent development organization.

---


# 1. Product Vision

Hebleo should not be a generic LMS with Hebrew content inside it.

It should be a purpose-built Hebrew-learning platform whose software is designed around Hebleo's pedagogy.

The central product identity is:

> **Hebleo is a human-authored Hebrew course with software intelligence wrapped around it—not an AI-generated language app.**

The technology should make the teaching:

- more interactive,
- easier to navigate,
- more adaptive,
- more reusable,
- more consistent,
- easier to maintain,
- more effective for long-term retention,
- and capable of taking learners farther toward actual fluency.

The software should not replace the teacher, curriculum, native recordings, explanation videos, or human linguistic judgment.

Hebleo's advantage is that its core material is curated by humans.

Canonical material should therefore remain human-made or human-approved.

This includes:

- lesson explanations,
- explanation videos,
- written explanations,
- vocabulary definitions,
- grammatical notes,
- canonical examples,
- native-speaker audio,
- core exercises,
- course sequencing,
- lesson sequencing,
- answer keys,
- important feedback,
- and judgments about what should be learned and when.

AI should support this material rather than replace it.

---

# 2. Core Product Principle: The Course Is the Spine

Hebleo may eventually contain many features, but the learner should never feel that they have been dropped into a toolbox and left to decide what to do.

The product should always answer:

> **What should I do now?**

The recommended course path should remain the central experience.

A learner should not open the app and immediately see a wall of equally prominent options such as:

- lessons,
- flashcards,
- grammar,
- games,
- AI tutor,
- stories,
- news,
- pronunciation,
- dictionary,
- listening,
- leaderboard,
- community,
- verb trainer,
- writing practice,
- and so on.

That creates the "too many features, no idea what to do" problem.

Instead, Hebleo should distinguish between:

## 2.1 The Path

What Hebleo recommends the learner do next.

Examples:

- Continue Lesson 3.2.
- Complete today's review.
- Finish a weak-area practice set.
- Read the next guided text.
- Do the next conversation activity.

## 2.2 The Library

Everything the learner *can* do if they choose.

Examples:

- extra practice,
- verb drilling,
- pronunciation,
- reading,
- listening,
- AI conversation,
- grammar lookup,
- dictionary,
- saved material,
- achievements,
- optional challenges.

The Path should be visually dominant.

The Library should be available but subordinate.

A formal UX rule should be:

> **No feature should visually compete with the learner's recommended next action unless that feature is itself part of the recommended path.**

---

# 3. Human-Made Canonical Content vs Dynamic Support

Hebleo should explicitly distinguish between types of content.

## 3.1 Canonical Hebleo Content

Human-authored or human-approved material that defines the course.

Examples:

- lesson explanations,
- videos,
- vocabulary,
- native audio,
- example sentences,
- core exercises,
- grammar explanations,
- answer keys,
- instructor feedback,
- curated reading content.

## 3.2 Dynamic / Adaptive Support

Material generated or selected by software based on the learner.

Examples:

- extra practice,
- adaptive review,
- AI conversation,
- generated practice sentences,
- personalized drills,
- weak-area remediation,
- level-appropriate reading recommendations,
- AI explanations grounded in Hebleo material.

The system should always know whether something is:

- Hebleo-authored,
- Hebleo-approved,
- or dynamically generated.

The LLM should never silently become the authoritative source for Hebrew content.

---

# 4. Business Model

The product naturally divides into a one-time course purchase and an optional recurring membership.

## 4.1 One-Time Purchase: The Core Course

The durable, highly curated intellectual product should be purchasable once.

A course purchase should include permanent access to:

- the structured Hebleo course,
- human explanation videos,
- written lesson versions,
- native audio,
- vocabulary,
- core exercises,
- core lesson progress,
- core review functionality,
- purchased course updates and corrections.

The learner should not need to maintain a subscription merely to retain access to the course they bought.

## 4.2 Optional Subscription: Hebleo Membership

Recurring payment should fund features that continue to create ongoing value.

Potential subscription features include:

- AI tutor,
- adaptive practice,
- expanded verb drilling,
- premium review modes,
- AI-assisted contextual practice,
- personalized weak-area practice,
- dynamic sentence practice,
- pronunciation analysis,
- speaking practice,
- level-appropriate ongoing reading content,
- Yanshuf-style simplified news or newsletters,
- advanced listening material,
- continuously expanding content,
- community access,
- questions to the instructor,
- live or asynchronous instructor interaction,
- advanced analytics,
- optional social features.

The subscription should make Hebleo significantly more powerful without making the purchased course incomplete.

## 4.3 Core Review vs Premium Review

A course purchaser should retain basic spaced review permanently.

For example:

### Included with Course

- vocabulary review,
- recognition cards,
- production cards,
- listening cards,
- native audio,
- lesson-linked review,
- standard scheduling,
- basic HebLearn functionality.

### Membership

- adaptive review selection,
- richer exercise forms,
- dynamic sentence review,
- pronunciation review,
- verb drills,
- weak-area practice,
- AI explanations,
- AI-generated contextual practice,
- advanced personalization.

---

# 5. Central Learning Principle

The major curriculum principle is:

> **New information is best learned by connecting it to established old information.**

This is the organizing principle behind:

- the spiral curriculum,
- cumulative exercises,
- sentence-based application,
- reuse of prior vocabulary,
- reuse of previously learned letters,
- reuse of prior grammar,
- increasingly complex production,
- and later review.

The course should not treat each lesson as a sealed unit.

New material should attach to knowledge that has already become familiar.

---

# 6. Spiral Curriculum

Hebleo should use a spiral curriculum.

The learner repeatedly returns to major domains, but each time at a higher level.

A simplified example:

1. letters,
2. a binyan,
3. prepositions,
4. next set of letters,
5. next binyan,
6. next preposition,
7. further development of the earlier letter system,
8. further development of earlier grammar.

This structure need not be mechanically formulaic.

The principle is that previously learned material is continually reused while new material is introduced.

For example:

- a binyan lesson uses letters learned previously,
- a preposition lesson uses both those letters and the binyan,
- a later letter lesson reuses earlier grammatical structures,
- later grammar exercises use increasingly broad accumulated vocabulary.

This means the curriculum itself performs much of the repetition.

The learner does not need to complete an enormous drill immediately after every concept because future lessons naturally reuse it.

A useful rule is:

> **Keep individual lessons thin; let the curriculum carry much of the repetition.**

---

# 7. Lesson Length and Pacing

The application should avoid forcing learners through unnecessary repetition when they understood the concept quickly.

A lesson should be concise by default.

The core lesson structure should be:

1. **Learn**
2. **Check**
3. **Vocabulary**
4. **Apply**
5. **Continue or Practice More**

This is deliberately smaller than a long fixed learning sequence.

A learner who understands the material immediately should be able to move on.

A learner who needs more practice should get it.

The system should distinguish between:

- proving enough understanding to continue now,
- and proving long-term retention later.

Long-term retention is supported through:

- later lessons,
- cumulative reuse,
- spaced review,
- and optional/adaptive practice.

---

# 8. Canonical Lesson Anatomy

## 8.1 Learn

A short bounded explanation of one concept or closely related group of concepts.

The learner should be able to choose:

- **Watch** — human-created video explanation,
- **Read** — human-written explanation.

These should be two presentations of the same lesson, not separate curriculum items.

Progress belongs to the lesson, not to the medium.

Eventually, every substantive lesson should ideally have both a text and video option.

## 8.2 Check

Short bounded questions embedded during or immediately after the explanation.

The student should commit to an answer before seeing the explanation.

The instructor's explanation then appears as:

- recorded explanation,
- written explanation,
- or both.

These checkpoints should be concise.

## 8.3 Vocabulary

A small vocabulary set associated with the lesson.

Vocabulary can provide material with which to use the new concept.

Early vocabulary may be constrained by which letters the learner has been taught.

Later vocabulary can be selected more freely for usefulness, frequency, semantic relevance, and curriculum goals.

## 8.4 Apply

A short core exercise that combines:

- the new concept,
- the lesson's vocabulary,
- and established older knowledge.

Sentence-based work should be preferred wherever appropriate.

## 8.5 Continue or More Practice

After the core exercise:

### Strong performance

Show:

- **Next lesson**
- **More exercises**

The learner can leave immediately or continue voluntarily.

### Weak performance

The system should recommend or automatically continue with additional practice.

The extra practice should continue until the learner demonstrates sufficient improvement or chooses to revisit the explanation.

The adaptive logic should initially remain simple rather than pretending to measure mastery with false precision.

---

# 9. Adaptive and Optional Extra Practice

Extra practice is a core product feature.

The course itself remains human-curated and finite.

Practice depth adapts to the learner.

## 9.1 Example Flow

Core exercise  
→ evaluate performance

### If strong

- Next lesson
- More exercises

### If mixed

- Recommend another short practice set

### If weak

- Continue automatically with additional scaffolded practice

Then reassess.

## 9.2 Principle

> **The curated lesson is fixed; the amount of practice is adaptive.**

This preserves a strong human-designed curriculum while still taking advantage of software.

## 9.3 Practice Sources

Extra practice may eventually come from several tiers:

1. human-authored practice,
2. human-approved reusable templates,
3. parameterized exercise generation,
4. AI-generated practice constrained by approved vocabulary and grammar.

The core exercise should remain more tightly curated than the optional practice pool.

---

# 10. Sentences as the Main Integration Unit

Where possible, sentences should be the main level of integration.

Words alone are often too isolated.

Paragraphs contain many interacting demands.

A sentence is small enough to manipulate but rich enough to combine:

- vocabulary,
- morphology,
- syntax,
- gender,
- number,
- agreement,
- prepositions,
- word order,
- pronunciation,
- meaning,
- and context.

The product should therefore lean toward sentence recognition and sentence creation.

This does not mean every exercise must be a sentence exercise.

Some subskills are better taught at smaller units.

Examples:

- letter recognition,
- keyboard location,
- phoneme discrimination,
- minimal pairs,
- noun gender,
- individual conjugation forms.

The rule should be:

> **Use the smallest unit needed to teach the subskill, then integrate it into sentences as quickly as practical.**

Later, sentence knowledge should scale upward into:

- dialogues,
- reading passages,
- listening passages,
- stories,
- news,
- conversations,
- and open production.

---

# 11. Sentence Practice Progression

Sentence work can vary in difficulty without becoming monotonous.

Possible stages include:

## 11.1 Recognition

Learner identifies the meaning of a sentence.

## 11.2 Listening Recognition

Learner hears a sentence and selects or identifies it.

## 11.3 Reconstruction

Learner arranges sentence parts into the correct order.

## 11.4 Completion

Learner retrieves a missing word or phrase.

## 11.5 Transformation

Learner changes a sentence.

Examples:

- masculine → feminine,
- singular → plural,
- one pronoun → another,
- one verb → another,
- one tense → another.

## 11.6 Constrained Production

Learner translates or creates a specific sentence from a prompt.

## 11.7 Communicative Response

Learner answers a question in Hebrew.

## 11.8 Free Production

Learner creates a sentence under looser constraints.

Not every lesson needs every stage.

These are tools available to the curriculum designer.

---

# 12. Exercise Variety

The pedagogical anchor can remain sentence-centered even if the surface interactions vary.

Possible exercise types include:

- multiple choice,
- multi-select,
- Hebrew → English,
- English → Hebrew,
- typed Hebrew,
- typed English,
- audio → Hebrew,
- audio → meaning,
- dictation,
- matching,
- sentence ordering,
- word ordering,
- fill-in-the-blank,
- dropdown cloze,
- root identification,
- pattern identification,
- root + pattern prediction,
- noun gender,
- conjugation selection,
- conjugation production,
- sentence transformation,
- add/remove Nikkud,
- sound discrimination,
- minimal pairs,
- record yourself,
- repeat sentence,
- translate aloud,
- answer aloud,
- open sentence creation,
- image description,
- dialogue completion.

The system should support new exercise types later without requiring a redesign of the entire application.

---

# 13. Exercise Engine

Exercises should be stored as structured reusable objects rather than as hard-coded screens.

A generic exercise object may contain fields such as:

- ID,
- type,
- prompt,
- instructions,
- target concept,
- content,
- accepted answers,
- answer key,
- feedback,
- explanation,
- audio,
- images,
- Nikkud behavior,
- keyboard behavior,
- difficulty,
- core vs extra practice,
- tags,
- lesson association,
- exercise-set association.

The `type` determines how the app renders the object.

The exercise engine should support both:

- core human-authored exercises,
- and expandable practice pools.

---

# 14. Answer Validation

Hebrew typed-answer validation requires explicit rules.

Potential issues include:

- Nikkud required vs ignored,
- punctuation,
- spaces,
- final letters,
- spelling variants,
- alternate translations,
- masculine/feminine variants,
- alternate valid word order,
- synonyms,
- typo tolerance,
- optional words,
- naturalness vs strict correctness.

Exercises should be able to define whether:

- exact match is required,
- multiple human-approved answers are accepted,
- normalized matching is allowed,
- or an open response requires richer evaluation.

AI may eventually help evaluate open answers, but canonical exercises should have human-defined logic whenever practical.

---

# 15. Vocabulary

Vocabulary should be treated as structured reusable data rather than static text copied into lessons.

The existing vocabulary masterfile already contains rich fields such as:

- lesson,
- part,
- type,
- Hebrew,
- English,
- notes,
- gender,
- plural,
- root,
- pattern,
- feminine,
- plural feminine,
- audio,
- alternate audio forms,
- infinitive,
- conjugations,
- and other morphology.

The application should make use of this richness.

Potential vocabulary-object fields include:

- stable ID,
- Hebrew,
- English sense(s),
- part of speech,
- gender,
- root,
- pattern,
- fully pointed spelling,
- standard unpointed spelling,
- curated display spelling,
- plural,
- feminine,
- plural feminine,
- infinitive,
- conjugations,
- notes,
- native audio,
- alternate-form audio,
- lesson introduced,
- tags,
- status,
- review settings.

---

# 16. Google Sheets as Editorial Source of Truth

Google Sheets can remain the editorial source of truth for vocabulary because it provides:

- easy editing,
- cell formatting,
- fast scanning,
- bulk modification,
- familiar spreadsheet workflows,
- and convenient manual management.

The production application should not query Google Sheets directly for every learner interaction.

Instead:

Google Sheet  
→ validate  
→ transform  
→ preview changes  
→ publish  
→ production database

This creates a distinction between:

## 16.1 Editorial Source of Truth

Where the instructor authors and manages the vocabulary.

## 16.2 Runtime Source

The published representation optimized for the app.

The two should never be independently editable in ways that cause divergence.

---

# 17. Vocabulary Publishing Workflow

Changing a cell in Google Sheets should not necessarily alter the live app immediately.

A deliberate workflow should be supported:

1. edit Sheet,
2. sync/detect changes,
3. validate,
4. show change preview,
5. show warnings/errors,
6. show affected content,
7. publish,
8. create version,
9. propagate changes.

Possible validation warnings:

- missing English definition,
- missing audio,
- invalid lesson reference,
- duplicate ID,
- missing required field,
- invalid morphology,
- broken formatting,
- removed item still referenced elsewhere.

---

# 18. Formatting and Semantic Meaning

Spreadsheet formatting may carry pedagogical value.

The system should preserve useful formatting where possible.

However, if a visual convention carries actual meaning, that meaning should eventually be represented semantically rather than relying only on arbitrary colors or formatting.

For example, if bold text means a root or yellow means "new", the system should ideally understand the semantic role.

This makes later redesigns possible without losing meaning.

The instructor should still be able to author visually in Google Sheets.

---

# 19. Nikkud / Vowel System

Nikkud should be a first-class product feature.

Hebleo already gradually weans learners off vowels.

The app should support this deliberately.

## 19.1 Learner Modes

A simple control:

**Vowels: Curated | Full | None**

### Curated

The Hebleo-opinionated presentation appropriate to the learner's level.

This should be the default.

### Full

Show full Nikkud wherever available.

### None

Show standard unpointed Hebrew.

## 19.2 Tap-to-Reveal

Learners should be able to tap or press a word to temporarily reveal:

- Nikkud,
- and optionally native audio.

This creates support without permanently restoring the training wheels.

## 19.3 Stored Forms

Where relevant, a vocabulary item should support:

- fully pointed form,
- standard unpointed form,
- curated display form.

The curated display form may contain partial Nikkud.

The system should not assume that unpointed Hebrew can always be produced correctly by simply deleting Unicode Nikkud marks.

## 19.4 Exercise Overrides

A learner's global vowel preference should normally apply.

However, an exercise may lock Nikkud behavior when the presence or absence of vowels is itself being tested.

---

# 20. Hebrew Keyboard Assistance

Hebrew typing should be scaffolded.

Possible modes:

- only taught letters prominent,
- relevant letters highlighted,
- all letters visible with subtle highlighting,
- no assistance,
- native device keyboard.

The exercise definition should be able to control keyboard assistance.

Possible setting:

`keyboard_assistance: full | lesson_letters | subtle | none | native`

The system should not highlight the answer when keyboard recall is the skill being tested.

---

# 21. Modular Content Architecture

This is a foundational architectural requirement.

Lessons should not contain duplicated copies of vocabulary, exercises, sentences, media, or other reusable material.

Instead:

> **Lessons contain composition instructions; canonical content lives elsewhere.**

A lesson should be assembled from reusable content components.

The conceptual model is similar to powerful shortcodes.

---

# 22. Component Model

Every dynamic lesson block should conceptually contain:

## 22.1 Source

Where does the canonical content come from?

Examples:

- Ultimate Vocabulary Masterfile,
- Exercise Bank,
- Sentence Bank,
- Media Library,
- Grammar Concepts,
- Reading Library.

## 22.2 Selector

Which items should be included?

Examples:

- lesson = C1-L03,
- exercise_set = C1-L03-core,
- tag = object-pronouns,
- type = verb,
- lesson = 3.2 AND type = noun.

## 22.3 Renderer / Presentation

How should the selected material appear here?

Examples:

- standard vocabulary table,
- compact vocabulary list,
- audio list,
- flashcard view,
- sentence builder,
- matching exercise,
- review deck,
- reading list.

## 22.4 Options / Local Overrides

How should this instance behave?

Examples:

- visible columns,
- column order,
- Nikkud mode,
- collapsed state,
- keyboard behavior,
- number of items,
- shuffle behavior,
- display notes or hide notes.

---

# 23. Example Conceptual Components

A vocabulary component might behave like:

```text
<Vocabulary
  source="Ultimate Vocabulary Masterfile"
  selector="lesson:C1-L03"
  renderer="standard-vocab-table"
  nikkud="curated"
/>
```

An exercise component might behave like:

```text
<ExerciseSet
  source="Exercise Bank"
  selector="exercise_set:C1-L03-core"
  renderer="lesson-practice"
/>
```

The instructor should not need to write this syntax manually.

Hebleo Studio should provide a visual interface over the same structure.

---

# 24. Stable IDs and Tags

Important relationships should use stable IDs.

Tags should supplement stable IDs rather than replace them.

## Stable IDs

Good for:

- lesson identity,
- exercise-set identity,
- vocabulary identity,
- sentence identity,
- media identity,
- concept identity.

IDs should remain stable even if the item is renamed or moved.

## Tags

Good for flexible grouping.

Examples:

- object-pronouns,
- beginner,
- speaking,
- pronunciation,
- chapter-3,
- plural,
- present-tense.

This avoids brittle tag-only architecture.

---

# 25. Reusable Content Objects

Potential canonical object types include:

- Course,
- Chapter,
- Lesson,
- Explanation,
- Grammar Concept,
- Vocabulary Item,
- Vocabulary Set,
- Sentence,
- Exercise,
- Exercise Set,
- Practice Pool,
- Media Asset,
- Dialogue,
- Reading,
- Review Template,
- Announcement,
- Community Answer.

Each object should exist once canonically and be referenced elsewhere.

---

# 26. Automatic Propagation

If the canonical object changes, all dependent surfaces should update after the change is published.

Example:

A vocabulary item appears in:

- Lesson 2.3,
- root practice,
- pattern practice,
- review cards,
- dictionary,
- reading activity.

The item should exist once.

If its audio or note is corrected, all relevant surfaces update.

Similarly, if a vocabulary item is reassigned from one lesson to another, systems that dynamically query by lesson should update accordingly.

---

# 27. Dependency Preview

Propagation is powerful and therefore dangerous.

Before publishing or deleting a reusable object, Hebleo Studio should show impact.

Example:

> This change affects 11 published places.

Possible dependencies:

- Lesson 2.3,
- Lesson 4.1,
- HebLearn Recognition,
- HebLearn Production,
- Exercise 893,
- Reading 12.

Deleting an object that is still required by published content should be blocked or require explicit replacement.

---

# 28. Live References vs Version-Locked References

Most reusable content should use the latest published version.

Example:

`version = latest`

But the architecture should permit a snapshot when needed.

Example:

`version = 17`

This can be useful for assessments, archived courses, or other cases where exact historical content must remain fixed.

---

# 29. Hebleo Studio

Hebleo needs a private admin application so normal curriculum work does not require code changes.

Potential sections:

## Curriculum

- Courses
- Chapters
- Lessons
- Lesson ordering
- Lesson preview
- Draft/published status

## Content

- Vocabulary
- Concepts
- Sentences
- Exercises
- Exercise sets
- Practice pools
- Media
- Readings
- Dialogues

## Students

- Users
- Purchases
- Entitlements
- Progress
- Subscription status

## Community

- Questions
- Lesson Q&A
- Announcements
- Reports
- Moderation

## Analytics

- Lesson performance
- Exercise performance
- drop-off
- review adherence
- subscription usage
- product funnel

---

# 30. Lesson Builder

The lesson editor should be visual.

A lesson could appear as:

- Explanation
- Vocabulary
- Guided Check
- Main Exercise
- Optional Practice

The instructor should be able to:

- add components,
- remove components,
- drag them,
- reorder them,
- edit component settings,
- preview desktop,
- preview mobile,
- switch draft/published state,
- inspect dependencies.

---

# 31. Revision History and Publishing

Content must support:

- draft,
- preview,
- publish,
- revision history,
- editor identity,
- timestamps,
- rollback,
- change history.

Published learner content should not be modified accidentally by experimental edits.

A staging or preview environment should exist separately from production.

---

# 32. Media Management

Media should be reusable assets.

Potential media types:

- lesson videos,
- vocabulary audio,
- sentence audio,
- images,
- diagrams,
- downloadable PDFs,
- future dialogue recordings.

An asset should have one canonical identity.

If an audio file is replaced, every object referencing it should update automatically after publication.

Human native audio should remain canonical.

TTS should not replace the core recordings.

---

# 33. HebLearn / Review System

The existing HebLearn/SRS concept should remain an important part of the platform.

The review system should include:

- learning queue,
- review queue,
- card types,
- multiple cards derived from one note,
- recognition,
- production,
- listening,
- lesson vocabulary review,
- quick review,
- suspension,
- resumption,
- custom collections,
- review progress,
- due counts.

A modern FSRS-style scheduling system is a strong candidate for the scheduler.

The exact reconciliation between the old custom interval behavior and a modern FSRS implementation remains an open technical/design decision.

---

# 34. Review Beyond Flashcards

One knowledge item should be able to appear in several practice manifestations.

For example, a vocabulary item can be reviewed through:

- listen → meaning,
- English → Hebrew,
- Hebrew → English,
- audio → type Hebrew,
- speak the word,
- use the word in a sentence,
- sentence completion.

The underlying knowledge object remains the same.

---

# 35. Natural Curriculum Review vs Scheduled Review

Hebleo should distinguish between:

## Natural Curriculum Review

Previously learned information naturally reappears in later lessons.

## Scheduled Review

The review engine deliberately resurfaces material based on time, performance, and retention.

These systems should complement one another.

The SRS should not be responsible for all retention.

The curriculum should not assume that natural reuse will perfectly space everything.

---

# 36. Concept Mastery

The system may eventually track mastery of concepts such as:

- final letters,
- specific Nikkud patterns,
- definite article,
- masculine/feminine,
- object pronouns,
- direct object marker,
- roots,
- patterns,
- participles,
- infinitive,
- conjugation categories.

This should remain separate from mere lesson completion.

However, this should not be over-engineered before it becomes useful.

The first system can remain relatively simple.

---

# 37. Mistake Bank

Meaningful mistakes can be stored for later practice.

Potential fields:

- question,
- learner answer,
- correct answer,
- vocabulary,
- grammar concept,
- date,
- repeated mistakes,
- resolved status.

This can power a "My Mistakes" practice area and personalized remediation.

---

# 38. Speaking and Pronunciation

Speaking should eventually include two distinct capabilities:

## Speech Recognition

Did the learner say the intended word or sentence?

## Pronunciation Evaluation

How well was it pronounced?

Potential targets:

- ר,
- ח / כ,
- stress,
- vowels,
- minimal pairs,
- word-level pronunciation,
- phrase-level pronunciation.

Existing native human audio should remain the reference material.

---

# 39. AI Tutor

AI should be constrained by Hebleo's curriculum.

The AI tutor should know:

- which lessons the learner completed,
- which vocabulary was learned,
- which concepts were learned,
- what the learner struggles with,
- current target material,
- known mistakes.

Potential AI features:

- roleplay,
- level-appropriate conversation,
- mistake explanation,
- contextual practice,
- sentence generation,
- reading discussion,
- writing feedback.

AI should not invent canonical Hebrew answers when a curated answer exists.

AI should explain and extend the course rather than replace it.

---

# 40. Guided Immersion After the Course

Hebleo should not end with "course complete."

The product should gradually transition from structured acquisition to guided immersion.

## Early Stage

"What should I learn today?"

## Intermediate Stage

"What should I learn and practice today?"

## Advanced Stage

"What should I read, watch, listen to, or discuss in Hebrew today?"

Potential advanced content includes:

- level-appropriate articles,
- Yanshuf-style simplified news,
- reading feeds,
- listening feeds,
- dialogues,
- AI conversations,
- discussion prompts,
- guided media.

The long-term goal is:

> **The learner begins living part of their life in Hebrew.**

---

# 41. Level-Appropriate Reading

Reading content can be matched to the learner's actual learned material.

The system may eventually indicate:

- known words,
- weak learned words,
- new words,
- tap-for-definition,
- tap-for-Nikkud,
- tap-for-audio.

A useful future feature could show approximate coverage such as:

> You know 92% of the vocabulary in this article.

The exact implementation remains open.

---

# 42. Progressive Disclosure

Feature richness should not create interface clutter.

The app may expose more features as they become relevant.

Early learner:

- Home
- Course
- Review

Later:

- Home
- Learn
- Review
- Use Hebrew

Inside "Use Hebrew":

- Read
- Listen
- Speak
- AI conversation
- Stories
- News
- Challenges

Feature unlocking can turn complexity into progression.

---

# 43. Suggested Product Hierarchy

## Layer 1 — The Path

What should I do next?

## Layer 2 — Review

What does Hebleo think I should reinforce?

## Layer 3 — Practice

What do I want to deliberately work on?

## Layer 4 — Immerse

How do I actually use Hebrew?

## Layer 5 — Explore

Dictionary, saved material, statistics, achievements, settings, social features.

---

# 44. Motivation and Gamification

Potential features include:

- streaks,
- daily goals,
- weekly goals,
- streak freezes,
- achievements,
- XP,
- optional leaderboards,
- friend challenges.

Gamification should reward meaningful learning rather than trivial activity.

It should remain subordinate to the course.

Possible Hebrew-specific achievements:

- read 100 unpointed words,
- correctly identify patterns,
- identify roots,
- complete first conversation.

---

# 45. Study Plans

Onboarding may ask:

- Why are you learning Hebrew?
- How many minutes per day?
- Preferred reminder schedule?

Possible goals:

- 5 minutes,
- 10 minutes,
- 15 minutes,
- 20 minutes,
- 30 minutes.

The app can then recommend a realistic pace.

---

# 46. Community and Access to the Instructor

Community may be built into Hebleo rather than depending on Discord.

Possible capabilities:

- general community,
- lesson-specific discussion,
- questions to the instructor,
- announcements,
- subscriber-only areas.

A particularly strong feature is contextual Q&A.

If a learner asks from Lesson 5.2, Exercise 8, the question can automatically include that context.

The instructor can answer privately or publish the answer to a lesson FAQ.

This turns repeated instructor work into reusable human-authored knowledge.

The system should avoid an unbounded private-DM model that becomes impossible to scale.

---

# 47. Search and Dictionary

The product should eventually support search across:

- vocabulary,
- grammar concepts,
- lessons,
- sentences,
- instructor Q&A,
- readings.

Searching a word could show:

- Hebrew,
- English,
- audio,
- root,
- pattern,
- forms,
- lesson introduced,
- example sentences,
- relevant practice.

---

# 48. Learner Notebook

Potential features:

- bookmarks,
- saved words,
- saved sentences,
- learner notes,
- custom collections,
- favorite exercises.

This is useful but not required for the first release.

---

# 49. Accounts and Identity

The platform should support one identity across:

- WordPress,
- web learning app,
- iOS,
- Android.

The learner should not need separate accounts for:

- website,
- course,
- SRS,
- app,
- community.

Exact SSO architecture remains open and should be based on an audit of the current WordPress/WooCommerce setup.

---

# 50. Purchases and Entitlements

The learning app should use an entitlement model.

The app asks:

> What does this user own?

Rather than embedding payment logic throughout the learning system.

Potential entitlement types:

- course purchase,
- membership,
- gifted access,
- manual grant,
- trial,
- subscription feature access.

The system must handle:

- purchase,
- refund,
- cancellation,
- expiration,
- renewal,
- coupons,
- app-store purchases,
- web purchases.

Exact Apple/Google/web payment behavior remains an open implementation decision.

---

# 51. Learner Progress

The system should remember at least:

- current lesson,
- completed lessons,
- lesson attempts,
- exercise performance,
- optional-practice performance,
- video/text preference,
- Nikkud preference,
- vocabulary learned,
- review state,
- suspended items,
- mistakes,
- streak,
- study goal,
- saved content,
- downloads.

Progress must synchronize across devices.

---

# 52. Offline Support

Mobile architecture should account for offline use early even if full offline support ships later.

Potential offline capabilities:

- download chapter,
- cache lesson content,
- cache audio,
- cache exercises,
- review offline,
- save progress locally,
- synchronize when online.

Conflict rules must be defined, particularly for SRS activity performed on multiple devices.

---

# 53. Notifications

Potential notification categories:

- review due,
- streak reminder,
- study-plan reminder,
- instructor response,
- community reply,
- new subscriber content,
- level-appropriate reading.

Learners should have granular notification controls.

---

# 54. Analytics

## Learner-Facing Analytics

Potentially:

- course progress,
- words learned,
- reviews due,
- streak,
- study time,
- skill strengths,
- weak areas.

## Product Analytics

Potentially:

- purchase → activation,
- activation → first lesson,
- lesson starts,
- lesson completion,
- time per lesson,
- drop-off,
- exercise accuracy,
- wrong-answer rate,
- optional-practice usage,
- text vs video usage,
- review adherence,
- D2/D7 retention,
- subscription conversion,
- cancellation.

Analytics should help improve the curriculum, not merely measure engagement.

---

# 55. Accessibility and RTL/LTR

The application should be designed for:

- Hebrew RTL,
- English LTR,
- mixed Hebrew/English lines,
- screen readers,
- keyboard navigation,
- subtitles,
- transcripts,
- adjustable font size,
- color-independent meaning,
- audio transcripts,
- mobile accessibility.

RTL/LTR handling must be a core implementation concern rather than an afterthought.

---

# 56. Localization

Even if Hebleo initially teaches Hebrew through English, the data model should avoid assuming English forever.

Conceptually:

`translation[language]`

is preferable to hard-wiring:

`English`

This keeps the door open to future courses for speakers of other languages.

No translation work is required now.

---

# 57. Security, Backups, and Reliability

The platform should include:

- automated database backups,
- media backups,
- restore procedures,
- restore testing,
- audit logs,
- admin roles,
- secure authentication,
- rate limiting,
- privacy controls,
- account deletion,
- account export,
- staging separate from production.

Codex or other development tools should never experiment directly against the production learner database.

---

# 58. Migration from LearnDash

The migration plan should map existing data into the new platform.

Potential migration targets:

- WordPress users,
- purchases,
- enrollments,
- lesson completion,
- quiz progress,
- SRS progress,
- subscriptions,
- relevant Q&A/comments.

The migration should be tested repeatedly before switching systems.

The ideal learner experience is:

> Hebleo suddenly became much better.

Not:

> Please make a new account and start over.

---

# 59. Feature Flags

The platform should support controlled rollout.

Examples:

- AI Tutor: off
- New Review UI: beta users
- Curated Nikkud: on
- Community: selected users
- New exercise engine: 10% rollout

This makes development and experimentation safer.

---

# 60. Automated Testing

Automated tests should cover at minimum:

- login,
- entitlement checks,
- purchase synchronization,
- saving progress,
- lesson completion,
- exercise scoring,
- answer normalization,
- Nikkud behavior,
- SRS scheduling,
- sync,
- migration logic.

A core reliability principle:

> **Never silently lose learner progress.**

Progress-loss bugs should be treated as catastrophic.

---

# 61. Recommended High-Level Technical Direction

The currently favored direction is:

- WordPress remains primarily the marketing/storefront layer,
- WooCommerce or existing commerce remains the web sales layer unless there is a strong reason to replace it,
- the learning experience becomes a dedicated application,
- web/iOS/Android share a common backend,
- a relational cloud database becomes the runtime data system,
- Google Sheets remains a convenient editorial source for vocabulary,
- a dedicated Hebleo Studio manages curriculum/content.

A TypeScript-heavy stack such as:

- React Native + Expo for iOS/Android,
- web frontend using Expo Web or a related React/Next approach,
- Supabase/Postgres-style backend,

has been discussed as a promising starting direction.

This is **not yet a final technical decision**.

The exact stack should be chosen after auditing:

- current WordPress plugins,
- login,
- WooCommerce,
- video hosting,
- media,
- current SRS implementation,
- user accounts,
- subscriptions,
- custom code,
- progress data.

---

# 62. Systems Classification

The platform can be thought of as approximately ten interacting systems:

1. Curriculum Engine
2. Hebrew Knowledge Database
3. Exercise Engine
4. Mastery / Progress Engine
5. HebLearn Review / SRS
6. Speaking / Pronunciation Engine
7. AI Practice Engine
8. Motivation Layer
9. Learner Platform
10. Hebleo Studio

Additional cross-cutting systems include:

- identity,
- entitlements,
- community,
- analytics,
- publishing,
- migration,
- notifications.

---

# 63. Things the Architecture Should Avoid

Do not:

- use Google Sheets as the production runtime database,
- make WordPress post IDs the canonical course structure,
- store lessons as giant unstructured HTML blobs,
- duplicate vocabulary in multiple lessons,
- duplicate sentences across exercises,
- hard-code every exercise screen separately,
- let an LLM invent canonical course answers,
- replace human native audio with TTS,
- force every learner through the same quantity of repetition,
- make gamification more important than learning,
- migrate learners before parity testing,
- build a database without migrations/backups/tests,
- over-tag content before there is a demonstrated need,
- build a giant prerequisite graph merely because it is technically possible.

A useful project maxim is:

> **The code can be vibe-coded. The architecture cannot be vibe-architected.**

---

# 64. Curriculum Redesign Should Begin Now

The curriculum redesign can and should happen in parallel with application development.

Do not wait for the software.

However, the curriculum work should use a lightweight standard structure so it can later map cleanly into the application.

---

# 65. Curriculum Redesign Workstreams

## 65.1 Re-sequence the Course

Review the existing curriculum and decide:

- what remains one lesson,
- what becomes several shorter lessons,
- what moves earlier,
- what moves later,
- where the spiral can improve,
- where vocabulary enters,
- where older material can be naturally reused.

## 65.2 Rebuild Individual Lessons

Once the lesson position is reasonably stable:

- create short concept,
- create/read text version,
- identify video version/cuts,
- add bounded checks,
- attach vocabulary,
- create concise core exercise,
- create optional practice where useful.

Do not begin by arbitrarily chopping videos into small clips.

The redesigned curriculum should determine the cuts.

---

# 66. Curriculum Design Question

For each new lesson or exercise, ask:

> **What established old information is this new information attaching itself to?**

This does not need to become database metadata.

It is primarily a curriculum-design discipline.

Examples:

- new preposition + known nouns + known letters,
- new verb form + known pronouns + old verbs,
- new letter + previously learned grammar,
- new vocabulary + familiar sentence pattern.

---

# 67. Curriculum Master Sheet

A separate curriculum master sheet is recommended.

This is the map of the course, not necessarily the storage location for every piece of content.

Suggested columns:

| Field | Purpose |
|---|---|
| Lesson ID | Stable identifier |
| Chapter | Chapter |
| Order | Position |
| Title | Learner-facing title |
| Main concept | What is being taught |
| Video | Video reference/status |
| Text | Written explanation reference/status |
| Vocabulary Set | Referenced vocabulary group |
| Core Exercise Set | Required exercise set |
| Extra Practice Set | Optional/remedial practice |
| Nikkud Intent | Curated/full/other |
| Status | Draft/review/published |
| Notes | Curriculum notes |

---

# 68. Lightweight Lesson Redesign Template

## Lesson Identity

- ID:
- Chapter:
- Order:
- Title:

## Learn

- concept:
- text explanation:
- video source:
- expected video cut/re-recording notes:

## Bounded Checks

For each checkpoint:

- prompt:
- answer:
- instructor explanation:

## Vocabulary

- vocabulary-set ID or selector:
- vocabulary notes:

## Core Application

- exercise-set ID:
- primary exercise type(s):
- how it combines new + established knowledge:

## Extra Practice

- optional practice set:
- remediation notes:

## Nikkud

- intended curated presentation:
- exercise-specific overrides:

## Status

- draft:
- reviewed:
- published:

---

# 69. Current Settled Principles

The following ideas are sufficiently settled to treat as working requirements unless later discussion changes them:

1. Hebleo is human-authored at its core.
2. AI supports the curriculum rather than replacing it.
3. The course is the spine of the product.
4. There should always be an obvious next step.
5. New information should connect to established old information.
6. The curriculum should spiral and reuse prior material.
7. Individual lessons should remain relatively thin.
8. Video and text are parallel ways to learn the same lesson.
9. Lessons use short bounded checks.
10. Vocabulary is attached to lessons and reused as structured data.
11. Sentence use should be the default integration level where appropriate.
12. Learners should be able to move on when they understand.
13. Extra practice should be optional when performance is strong.
14. Extra practice should become recommended/automatic when performance is weak.
15. Nikkud should be progressively removed.
16. Learners should have Curated / Full / None vowel modes.
17. Tap-to-reveal Nikkud should be supported.
18. Keyboard assistance should adapt to the lesson.
19. Google Sheets can remain the editorial vocabulary source of truth.
20. The production app should use a published runtime representation.
21. Lessons should be modular compositions of reusable content objects.
22. Reusable content should propagate automatically after publication.
23. Stable IDs should be used for important relationships.
24. Tags should supplement, not replace, stable IDs.
25. Hebleo Studio should provide visual management.
26. Content changes should have preview, versioning, and rollback.
27. The one-time course purchase should remain useful without a subscription.
28. Ongoing tools and services can be part of a subscription.
29. Basic review should remain available to course purchasers.
30. Community/instructor access is a plausible subscription benefit.
31. The product should eventually transition learners into guided immersion.
32. Feature richness should be progressively disclosed rather than dumped on the learner.

---

# 70. Open Decisions

The following are deliberately not finalized yet.

## Technical

- exact frontend stack,
- Expo Web vs separate Next.js web frontend,
- exact backend platform,
- exact SSO method with WordPress,
- app-store billing model,
- web subscription integration,
- exact video provider,
- offline video strategy,
- exact analytics stack,
- exact AI provider,
- exact speech-to-text provider,
- exact pronunciation-scoring provider,
- exact database hosting/security configuration.

## Pedagogical / Product

- exact scoring thresholds for extra practice,
- exact mastery model,
- exact relationship between concept mastery and lesson completion,
- exact FSRS behavior,
- whether all early vocabulary should be memorized,
- whether vocabulary needs explicit categories such as core/instructional/example-only,
- how much dynamic exercise generation should be allowed,
- exact level-appropriate reading model,
- exact community structure,
- exact gamification scope,
- whether leaderboards are useful,
- exact subscription tiers,
- precise instructor-access limits.

These should be resolved based on real course needs rather than theoretical completeness.

---

# 71. Development Phases

A sensible implementation sequence remains:

## Phase 0 — Audit

Inventory:

- WordPress,
- LearnDash,
- lessons,
- topics,
- videos,
- text,
- vocabulary,
- audio,
- PDFs,
- quizzes,
- exercises,
- current SRS,
- users,
- purchases,
- subscriptions,
- access,
- progress,
- custom plugins,
- custom code.

## Phase 1 — Data Layer + Hebleo Studio

Build:

- canonical runtime database,
- content objects,
- vocabulary sync/import,
- media management,
- lesson composition,
- exercise model,
- revisions,
- backups,
- publishing.

## Phase 2 — LearnDash Parity

Build learner web experience with:

- login,
- entitlement,
- navigation,
- lesson rendering,
- video/text,
- vocabulary,
- audio,
- core exercises,
- quizzes,
- progress,
- responsive UI.

At this point the system can potentially replace LearnDash after validation.

## Phase 3 — HebLearn

Build:

- learning queue,
- SRS,
- review modes,
- lesson vocabulary,
- optional practice,
- custom review,
- mistakes.

## Phase 4 — Mobile

Build:

- iOS,
- Android,
- push notifications,
- downloads,
- offline sync,
- recording.

## Phase 5 — Intelligent Learning

Build:

- concept mastery,
- adaptive practice,
- smart next action,
- study plans,
- refined Nikkud fading,
- keyboard progression.

## Phase 6 — Speaking

Build:

- speech recognition,
- pronunciation,
- speaking drills.

## Phase 7 — AI Hebleo

Build:

- curriculum-aware AI tutor,
- roleplay,
- mistake explanation,
- level-constrained generation.

## Phase 8 — Engagement / Social

Build as justified:

- achievements,
- XP,
- streaks,
- challenges,
- leaderboards,
- community.

---

# 72. Immediate Next Steps

The project can now proceed on two tracks.

## Track A — Curriculum

Start rebuilding the course immediately.

Priorities:

1. create the curriculum master sheet,
2. inventory existing lessons,
3. split long lessons into bounded concepts,
4. improve sequencing,
5. maintain the spiral,
6. identify vocabulary per lesson,
7. identify embedded checks,
8. create/refine core exercises,
9. add optional practice where useful,
10. plan video cuts or re-recordings after the curriculum structure is clear.

## Track B — Product/System Specification

Continue defining:

1. exact content schemas,
2. lesson manifest format,
3. exercise schema,
4. vocabulary sync/publish format,
5. learner navigation,
6. account/entitlement model,
7. review model,
8. admin workflows,
9. migration plan,
10. final technical architecture.

Once these are sufficiently concrete, produce the full Codex implementation brief.

---

# 73. Guiding Summary

Hebleo should become a structured, opinionated, human-authored Hebrew-learning system.

Its core learning loop is:

> **Learn a small amount → attach it to what is already known → apply it → continue if ready → practice more if needed → encounter it again naturally and through spaced review.**

The system should be modular enough that:

- vocabulary exists once,
- exercises exist once,
- sentences exist once,
- media exists once,
- lessons reference those objects,
- changes propagate automatically,
- and the instructor can reorganize the entire curriculum without manually editing dozens of pages.

The learner experience should remain simpler than the underlying system.

Behind the scenes, Hebleo can be extremely rich.

From the learner's perspective, it should usually be obvious:

> **Here is what you should do next.**

---

# 74. Multi-Agent Development Team

Hebleo should be developed by a **small, specialized multi-model agent team** rather than by one general-purpose agent trying to own every part of the project.

The purpose of the multi-agent structure is to create:

- clear specialization,
- independent review,
- reduced model-specific blind spots,
- stronger architectural discipline,
- better separation between pedagogy and implementation,
- and safer integration of large changes.

The team should remain small enough that coordination costs do not overwhelm development.

The recommended initial team contains six persistent roles:

1. Hebleo Architect
2. Hebleo Lead Engineer
3. Hebleo Feature Engineer
4. Hebleo Curriculum & Pedagogy Designer
5. Hebleo QA / Red Team
6. Hebleo Release & Safety Reviewer

The human project owner remains above all six agents and retains final authority over:

- product decisions,
- pedagogy,
- curriculum,
- brand,
- scope,
- monetization,
- and any major tradeoff affecting learners.

---

# 75. Agent Team Philosophy

The agents should not all behave like independent senior developers with equal authority.

That creates architectural drift.

Instead, each agent should own a clearly bounded responsibility.

```text
                         PRODUCT OWNER
                   Product + Pedagogy Authority
                              │
                              ▼
                    ┌─────────────────┐
                    │ HEBLEO ARCHITECT│
                    │  GPT-6 Astra    │
                    └────────┬────────┘
                             │
                     Architecture / ADRs
                             │
                             ▼
                    ┌──────────────────┐
                    │  LEAD ENGINEER   │
                    │ Claude Opus 5.5  │
                    └────────┬─────────┘
                             │
            ┌────────────────┼─────────────────┐
            ▼                ▼                 ▼
      Feature Engineer   Curriculum &      QA / Red Team
       GPT-6.1 Sol        Pedagogy           Grok 4.7
                          Designer
                        Claude Opus 5.5
            │                │                 │
            └────────────────┼─────────────────┘
                             ▼
                       Lead integrates
                             │
                             ▼
                  Release / Safety Review
                      GPT-6 Astra
                             │
                             ▼
                        PRODUCT OWNER
```

The important rule is:

> **Agents collaborate through shared artifacts, architecture documents, tests, issues, and ADRs—not through informal assumptions about what another agent probably meant.**

The repository should be the shared memory.

---

# 76. Agent 1 — Hebleo Architect

**Recommended model:** GPT-6 Astra  
**Reasoning level:** XHigh for consequential architecture work

## Mission

The Architect owns the structural integrity of the system.

This agent decides or reviews major technical boundaries before implementation spreads through the repository.

## Primary Responsibilities

- overall system architecture,
- monorepo/repository structure,
- database boundaries,
- canonical content model,
- lesson manifest architecture,
- modular component architecture,
- `source + selector + renderer + options`,
- stable ID strategy,
- content versioning,
- publishing workflow,
- dependency propagation,
- WordPress ↔ Hebleo integration,
- authentication strategy,
- entitlement model,
- mobile/web sharing boundaries,
- offline synchronization architecture,
- review/SRS architecture,
- migration architecture,
- security boundaries,
- API boundaries,
- service boundaries,
- rollback strategy.

## Expected Deliverables

- architecture documents,
- Architecture Decision Records (ADRs),
- schema proposals,
- interface contracts,
- sequence diagrams,
- risk analysis,
- migration plans,
- decision summaries.

## What the Architect Should Not Spend Time On

The Architect should generally not be used for routine work such as:

- simple CRUD screens,
- basic forms,
- ordinary API handlers,
- minor React components,
- straightforward styling,
- repetitive integration work.

Its value is highest where a bad decision would become expensive to reverse.

## Authority

The Architect owns the architecture documents.

A foundational architectural change should normally require an ADR.

---

# 77. Agent 2 — Hebleo Lead Engineer

**Recommended model:** Claude Opus 5.5

## Mission

The Lead Engineer owns the working repository.

Its job is to turn approved architecture into a coherent, maintainable implementation.

It is the main integration agent.

## Primary Responsibilities

- initial project scaffolding,
- large multi-file features,
- repository-wide refactors,
- modular content engine,
- Hebleo Studio foundation,
- exercise engine,
- dependency propagation,
- publish/version system,
- complicated data migrations,
- offline implementation,
- large bug investigations,
- cross-system integration,
- integrating feature-agent work,
- resolving merge conflicts,
- maintaining code quality,
- preserving architectural coherence.

## Key Role

The Lead Engineer should be the agent that says:

> Architecture requires X.  
> Feature work currently implements Y.  
> QA discovered Z.  
> Here is the integrated implementation that satisfies all three.

## Authority

The Lead Engineer may touch any implementation area.

However, it should not silently redefine architectural contracts.

If an architectural change is needed, it should request or draft an ADR.

---

# 78. Agent 3 — Hebleo Feature Engineer

**Recommended model:** GPT-6.1 Sol  
**Reasoning level:** High

## Mission

The Feature Engineer is the everyday implementation workhorse.

Use it when the problem is already well specified.

## Primary Responsibilities

- API routes,
- CRUD interfaces,
- admin forms,
- settings screens,
- React components,
- Google Sheets sync code,
- vocabulary importer,
- analytics instrumentation,
- notification features,
- WordPress adapters,
- ordinary database queries,
- entitlement endpoints,
- UI refinements,
- routine bug fixes,
- unit tests,
- integration tests,
- implementation of scoped tickets.

## Ideal Task Shape

Good Feature Engineer ticket:

> Implement the vocabulary source adapter according to CONTENT_MODEL.md and these tests.

Another:

> Add Curated / Full / None Nikkud controls to the existing HebrewText renderer.

Another:

> Build the media upload screen against the existing Media API contract.

## What It Should Not Do

The Feature Engineer should not independently redesign:

- the database schema,
- the public API,
- the content architecture,
- entitlement logic,
- major state boundaries,
- migration strategy.

If it discovers a conflict, it should report it rather than silently reinterpret the design.

---

# 79. Agent 4 — Hebleo Curriculum & Pedagogy Designer

**Recommended model:** Claude Opus 5.5

This role is broader than a curriculum-to-software translator.

It should be useful **even if no software were being built**.

## Mission

The Curriculum & Pedagogy Designer acts as the product owner's analytical partner for redesigning the Hebleo curriculum.

It should understand both:

- Hebleo's teaching philosophy,
- and the structures the software can support.

It should remain opinionated but not authoritative.

The human project owner retains final pedagogical authority.

## Core Pedagogical Principle

The agent should treat this as a foundational Hebleo principle:

> **New information is best learned by connecting it to established old information.**

It should evaluate lesson design in light of that principle.

## Curriculum Responsibilities

- analyze current lesson sequence,
- identify overly long lessons,
- propose micro-lesson splits,
- identify where the spiral curriculum can be improved,
- identify where lessons introduce too many new burdens at once,
- examine how old knowledge is reused,
- propose sentence-centered application activities,
- propose exercise variety without losing pedagogical coherence,
- suggest optional/remedial practice,
- help plan Nikkud fading,
- help plan vocabulary introduction,
- identify opportunities for cumulative reuse,
- compare alternate lesson sequences,
- analyze cognitive load,
- help bridge structured learning into reading/listening/speaking,
- help design guided immersion,
- help design post-course progression.

## Curriculum-System Responsibilities

Once curriculum decisions are approved, the same agent can help translate them into:

- lesson objects,
- stable IDs,
- vocabulary sets,
- exercise sets,
- sentence banks,
- reusable content,
- modular lesson blocks,
- migration mappings,
- content selectors,
- curriculum master-sheet rows.

## Recommendation Labels

When reviewing curriculum, the agent should classify recommendations as:

### Preserve

The current Hebleo design is already strong.

### Improve

Keep the same pedagogical idea, but improve sequencing, scaffolding, pacing, or presentation.

### Reconsider

There is a substantive pedagogical reason to consider a different approach.

This prevents the agent from casually replacing the existing method with generic language-app conventions.

## Important Restriction

The agent should not assume that "more gamification", "more AI", or "more Duolingo-like interaction" is automatically better.

It should optimize around Hebleo's established teaching logic.

---

# 80. Agent 5 — Hebleo QA / Red Team

**Recommended model:** Grok 4.7  
**Reasoning level:** XHigh when available

## Mission

The QA / Red Team agent exists to distrust the implementation.

Its job is not to make the solution look good.

Its job is to prove where it breaks.

## Primary Responsibilities

- adversarial code review,
- edge-case discovery,
- test generation,
- regression testing,
- data integrity testing,
- API misuse testing,
- synchronization testing,
- RTL/LTR testing,
- Nikkud edge cases,
- entitlement edge cases,
- duplicate webhook testing,
- content-version testing,
- offline conflicts,
- migration failure testing,
- dependency-cycle detection,
- broken-reference testing,
- malformed-import testing.

## Example Questions

- What happens if two vocabulary rows share the same stable ID?
- What happens if Google Sheets publishes while a learner is in the middle of a lesson?
- What happens if Nikkud normalization creates malformed Hebrew?
- What happens if two offline devices review the same SRS card?
- What happens if a refund webhook is delivered twice?
- What happens if an exercise references an object that was removed?
- What happens if a renderer receives incomplete content?
- Can the learner bypass a locked Nikkud exercise?
- Can mixed RTL/LTR punctuation render incorrectly?
- Can learner progress be overwritten by stale state?
- Can dependency references become cyclic?
- Can a failed publish leave the system half-updated?

## Expected Deliverables

- failing tests,
- reproducible bug reports,
- minimal reproduction steps,
- edge-case lists,
- severity classification,
- regression tests.

## Authority

By default, this agent should **not** rewrite large areas of production code.

It should primarily expose defects.

Fixes should normally go back to the responsible implementation agent or Lead Engineer.

---

# 81. Agent 6 — Hebleo Release & Safety Reviewer

**Recommended model:** GPT-6 Astra  
**Reasoning level:** XHigh

## Mission

This agent reviews consequential changes at release gates.

It should not be active on every trivial pull request.

Its value is greatest when failure could affect:

- learner data,
- purchases,
- authentication,
- subscriptions,
- migrations,
- security,
- production availability.

## Review Gates

### Gate A — Initial Data Model

Review:

- schema,
- stable IDs,
- versioning,
- relationships,
- migration strategy.

### Gate B — Authentication

Review:

- identity,
- SSO,
- session handling,
- access controls.

### Gate C — Entitlements / Payments

Review:

- purchase flow,
- refund flow,
- cancellation,
- webhooks,
- subscription state.

### Gate D — Migration

Review:

- LearnDash migration,
- user mapping,
- progress mapping,
- rollback,
- validation.

### Gate E — Offline / Sync

Review:

- merge logic,
- stale state,
- conflict handling,
- failure recovery.

### Gate F — Production Release

Review:

- security,
- backups,
- restore process,
- observability,
- rollback,
- end-to-end learner flows,
- production readiness.

## Default Behavior

This agent should be read-only unless explicitly asked to make a fix.

---

# 82. Optional Future Agents

Do not create these immediately unless the workload justifies them.

## 82.1 Frontend / Design Specialist

Potential responsibilities:

- visual system,
- learner UX implementation,
- mobile responsiveness,
- animations,
- accessibility,
- component library,
- polished onboarding.

## 82.2 DevOps / Infrastructure Engineer

**Possible model:** GPT-6.1 Sol

Potential responsibilities:

- CI/CD,
- observability,
- backups,
- deployments,
- staging,
- production configuration,
- monitoring,
- alerts.

These should be added only when they represent real ongoing work.

---

# 83. Shared Agent Constitution

The repository should contain a short `AGENTS.md`.

It should not contain the entire product specification.

Instead, it should establish operating rules and point to canonical documents.

Suggested content:

```markdown
# Hebleo Agent Rules

1. PRODUCT_SPEC.md defines product requirements.
2. CURRICULUM_PRINCIPLES.md defines pedagogical principles.
3. /docs/architecture defines the current technical architecture.
4. ADRs record deliberate architecture changes.
5. Do not change database schemas, public APIs, stable IDs, or architectural
   boundaries without an approved ADR.
6. Human-authored Hebleo content is canonical.
7. Never duplicate canonical content when a reusable reference exists.
8. Preserve learner data and learner progress.
9. Every behavioral change requires tests.
10. Never modify production directly.
11. When requirements and implementation conflict, report the conflict.
    Do not silently reinterpret the requirement.
12. The product owner has final authority over product and pedagogy.
```

Keep this document short.

The detailed specification belongs in dedicated files.

---

# 84. Recommended Shared Project Documents

```text
/AGENTS.md

/docs/
    PRODUCT_SPEC.md
    CURRICULUM_PRINCIPLES.md
    ARCHITECTURE.md
    CONTENT_MODEL.md
    EXERCISE_MODEL.md
    DATA_MODEL.md
    API_CONTRACTS.md
    MIGRATION.md
    TEST_STRATEGY.md
    RELEASE_CHECKLIST.md

    /adr/
        ADR-001-runtime-stack.md
        ADR-002-stable-content-ids.md
        ADR-003-google-sheets-publishing.md
        ADR-004-lesson-composition.md
        ADR-005-entitlements.md
        ...
```

These files should act as the shared memory of the agent team.

Important decisions should not exist only inside chat history.

---

# 85. Agent Authority Boundaries

## Product Owner

Final authority over:

- product,
- curriculum,
- pedagogy,
- scope,
- pricing,
- subscription model,
- user-experience priorities.

## Architect

Authority over:

- architecture documents,
- major contracts,
- structural decisions.

## Lead Engineer

Authority over:

- repository integration,
- implementation coherence,
- code-level integration.

## Feature Engineer

Authority over:

- assigned feature implementation within existing contracts.

## Curriculum & Pedagogy Designer

Authority to:

- analyze,
- propose,
- critique,
- structure.

No authority to silently redefine the curriculum.

## QA / Red Team

Authority to:

- challenge,
- test,
- block confidence in broken implementation.

No default authority to redesign features.

## Release Reviewer

Authority to:

- identify release blockers,
- require resolution of safety/data-integrity risks.

---

# 86. Branch / Change Ownership

A simple ownership model is recommended.

## Architect

Primarily:

- docs,
- ADRs,
- schemas,
- architecture reviews.

## Lead Engineer

May modify:

- any implementation area,
- cross-cutting systems,
- integration branches.

## Feature Engineer

Should remain within:

- assigned feature branch,
- defined API/schema contracts.

## Curriculum & Pedagogy Designer

Primarily:

- curriculum documents,
- content schemas,
- curriculum tooling,
- import/migration mappings.

Should not independently modify authentication/payment architecture.

## QA / Red Team

Primarily:

- tests,
- bug reports,
- reproduction fixtures,
- validation scripts.

## Release Reviewer

Read-only by default.

---

# 87. Standard Feature Workflow

A major feature should generally move through the following process.

## Step 1 — Product Requirement

The Product Owner defines the desired learner/product behavior.

Example:

> Support Curated / Full / None Nikkud.  
> Tap reveals Nikkud.  
> Exercises may override the learner preference.

## Step 2 — Architectural Contract

The Architect decides how the requirement fits the system.

Example:

```text
HebrewText {
    pointed
    unpointed
    curated
}

UserPreference {
    nikkud_mode
}

Exercise {
    nikkud_override?
}
```

## Step 3 — Core Implementation

The Lead Engineer builds the common model and renderer.

## Step 4 — Scoped Feature Work

The Feature Engineer adds:

- settings,
- vocabulary integration,
- lesson UI,
- preference controls.

## Step 5 — Adversarial QA

The QA / Red Team tests:

- missing forms,
- malformed Unicode,
- RTL punctuation,
- locked-exercise bypass,
- offline state,
- partial Nikkud,
- device sync.

## Step 6 — Integration

The Lead Engineer fixes/integrates the results.

## Step 7 — Release Review

For consequential features, the Release Reviewer checks:

- requirements,
- architecture,
- safety,
- end-to-end behavior.

## Step 8 — Product Owner Approval

The Product Owner decides whether the feature is ready.

---

# 88. Example Workflow — Modular Lesson Content

## Product Requirement

A lesson should be able to say:

> Use items tagged X from source Z with renderer Y.

Changes to canonical source content should propagate automatically.

## Architect

Defines:

- content object interface,
- source adapter interface,
- selectors,
- renderer contract,
- local options,
- stable IDs,
- versioning,
- dependency graph.

## Lead Engineer

Builds:

- content registry,
- source adapter system,
- renderer system,
- dependency engine,
- version-aware references.

## Feature Engineer

Builds:

- Studio selectors,
- drag/drop UI,
- component settings,
- preview UI.

## Curriculum Designer

Tests whether the system is convenient for real lesson construction and proposes improvements to the authoring workflow.

## QA / Red Team

Tests:

- missing sources,
- renamed tags,
- deleted content,
- cyclic dependencies,
- stale versions,
- broken renderers,
- large selectors,
- duplicate IDs.

## Release Reviewer

Checks:

- data integrity,
- rollback,
- publishing safety.

---

# 89. Example Workflow — Curriculum Redesign

Curriculum work does not need to wait for software implementation.

## Input

Existing:

- lesson videos,
- transcripts,
- vocabulary,
- exercises,
- chapter structure,
- teaching notes.

## Curriculum & Pedagogy Designer

Produces candidate analysis:

### Preserve

What already works well.

### Improve

What could be better sequenced or shortened.

### Reconsider

Where there is a substantive reason to change approach.

## Product Owner

Approves, rejects, or modifies the proposal.

## Curriculum Designer

Turns approved decisions into:

- lesson IDs,
- lesson sequence,
- vocab associations,
- exercise sets,
- optional-practice sets,
- text/video mappings,
- Nikkud intentions.

## Software Agents

Later import these structures into the product.

This keeps software architecture subordinate to the curriculum rather than forcing curriculum decisions around implementation convenience.

---

# 90. Model Selection Rule of Thumb

## GPT-6 Astra

Use when the question is:

> **What should the system do?**

or:

> **What architecture minimizes future pain?**

Best fit:

- architecture,
- consequential design decisions,
- release review,
- migration review,
- security review,
- browser/end-to-end evaluation.

## Claude Opus 5.5

Use when the task is:

> **Make this large, complicated thing actually work across the project.**

Best fit:

- large implementation,
- repository integration,
- difficult refactors,
- cross-file debugging,
- curriculum analysis,
- long-context synthesis.

## GPT-6.1 Sol

Use when:

> **We already know what should be built. Build it correctly and efficiently.**

Best fit:

- routine implementation,
- scoped features,
- APIs,
- UI,
- integrations,
- tests.

## Grok 4.7

Use when:

> **Explain why everybody else's solution might fail.**

Best fit:

- adversarial review,
- edge cases,
- test generation,
- fuzzing,
- assumption checking.

---

# 91. Avoiding Multi-Agent Failure Modes

Avoid:

- multiple agents redefining the schema independently,
- agents silently changing public APIs,
- agents changing IDs casually,
- multiple agents editing the same architectural area at once,
- duplicating content because a reference system was inconvenient,
- conflicting curriculum assumptions,
- undocumented architecture changes,
- relying on chat memory rather than repository documents.

The solution is:

- explicit authority boundaries,
- stable shared documents,
- ADRs,
- tests,
- narrow tickets,
- Lead Engineer integration,
- Product Owner final approval.

---

# 92. Recommended Starting Agent Team

1. **HEBLEO ARCHITECT — GPT-6 Astra / XHigh**
2. **HEBLEO LEAD ENGINEER — Claude Opus 5.5**
3. **HEBLEO FEATURE ENGINEER — GPT-6.1 Sol / High**
4. **HEBLEO CURRICULUM & PEDAGOGY DESIGNER — Claude Opus 5.5**
5. **HEBLEO QA / RED TEAM — Grok 4.7 / XHigh**
6. **HEBLEO RELEASE & SAFETY REVIEWER — GPT-6 Astra / XHigh**

---

# 93. Product Owner Role

The Product Owner is not merely the coordinator of the bots.

The Product Owner is the source of:

- Hebleo's teaching philosophy,
- product taste,
- curriculum authority,
- business decisions,
- acceptable tradeoffs,
- learner priorities.

The agents should provide:

- options,
- critiques,
- evidence,
- implementation,
- testing.

They should not gradually redefine Hebleo into a generic AI language product.

A central project principle remains:

> **The intelligence of the software should amplify the human-curated Hebleo system rather than replace it.**

---

# 94. Final Combined Project Summary

Hebleo is being redesigned from a WordPress/LearnDash-centered course into a purpose-built Hebrew-learning platform.

Its defining characteristics are:

- human-authored teaching,
- native audio,
- human explanation videos,
- a strong spiral curriculum,
- deliberate connection of new information to established knowledge,
- concise lessons,
- sentence-centered application,
- optional/adaptive extra practice,
- progressively reduced Nikkud,
- intelligent Hebrew keyboard assistance,
- reusable canonical content,
- Google Sheets as an editorial vocabulary source,
- a proper runtime database,
- modular lesson composition,
- automatic propagation of content changes,
- versioning and rollback,
- HebLearn spaced review,
- eventual guided immersion,
- optional AI tutoring,
- optional community/instructor access,
- one-time course purchase plus recurring premium tools.

The system should be technically rich but experientially simple.

From the learner's point of view, Hebleo should usually answer one question clearly:

> **What should I do next?**

From the instructor's point of view, Hebleo should make it easy to:

- reorganize the curriculum,
- change content once,
- propagate that change everywhere,
- add new exercise types,
- publish safely,
- inspect dependencies,
- and continuously improve the course.

From the development team's point of view, the multi-agent structure should ensure that:

- architecture is deliberate,
- implementation is coherent,
- pedagogy remains human-controlled,
- routine coding is efficient,
- assumptions are challenged,
- and consequential releases receive independent review.

The recommended development model is therefore:

> **Human product/pedagogy authority + specialized AI agents + repository-based shared memory + explicit architecture + adversarial testing.**

That combination should let Hebleo take advantage of modern agentic software development without surrendering the qualities that make the course distinctive in the first place.
