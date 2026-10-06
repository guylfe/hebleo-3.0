# Course redesign: engineering plan

Status: Lead Engineer proposal, 2026-10-06. Nothing in this document is implemented. The proposed lesson contract (section 3) still needs Architect review before any code changes. The checklist rows are CR01–CR08 in [FEATURE_CHECKLIST](../FEATURE_CHECKLIST.md).

Source: Guy's 2026-10-06 requests, relayed by the Curriculum Designer: [course redesign plan](../curriculum/COURSE_REDESIGN_PLAN.md) sections 1, 5, 6 and 9 (decisions D-R1 to D-R7). Code references are to `src/store.js` and `public/ux.js` as of `lead/b2-draft-api` `ee9e2f1`.

Content guardrail: the 90 lessons proposed in the Course Progression `New` tab (Order 10–900) are unapproved. They are not seeded into the app, and their IDs are not used as real content IDs. Tests use labelled synthetic fixtures. No Masterfile or Course Progression ID columns are written without Guy's separate authorization.

## 1. Requests and timing

| ID | Request | Guy's timing | Proposed batch |
| --- | --- | --- | --- |
| CR02 | Modular ordered lesson blocks | Implement | B3 |
| CR06 | One media file per video block (D-R3) | Decision; plan §9 Implement | B3 |
| CR07 | Lesson type metadata | Support | B3 |
| CR03 | Remaining MASTER_SPEC §12 exercise types | Soon | B4 |
| CR05 | Course versions plus placement pass (D-R4, departs from MASTER_SPEC §58) | Decision; plan §9 Implement | B3 data model, B5 behavior |
| CR01 | Dynamic keyboard highlighting | Future | After B3, before the first real-lesson import |
| CR04 | Skill tree | Future | After Guy's topic diagram and CR05 |
| CR08 | Sentence bank and gating checker (Studio) | Future | After the Masterfile ID authorization and importer |

## 2. Sequence

0. **Now.** The curriculum plan is on main (`4aa7856`). B2 (`lead/b2-draft-api`, frozen candidate `ee9e2f1`) finishes its Release recheck, QA and merge to main. B3 rewrites the code that B2 just hardened: `validateContent`, the Studio guided lesson editor, the rehearsal renderer and backup/restore integrity. Starting B3 before B2 merges would create a large conflict in exactly the reviewed code.
1. **In parallel with step 0.** The Architect reviews section 3 and adopts it, or amends it, as the v2 content/learner contract and an ADR. This records the departures D-R3, D-R4 and D-R7.
2. **B3: modular lessons.** CR02, CR06 and CR07, plus a `courseVersionId` field (CR05 data model only), ship in one content and learner-store migration, so content is migrated once. This goes ahead of real-content import (NEXT_STEPS step 2), so real lessons are converted once, into the final shape.
3. **B4: exercise types (CR03).** A type registry first, then the types in curriculum priority order (section 5). Listening and dictation need some of Guy's native recordings. If none are available when B4 starts, translation goes first.
4. **B5: course versions and placement (CR05).** This must exist before any real-student migration (U19). Placement items are authored by Curriculum and approved by Guy.
5. **CR01 dynamic keyboard.** This is small: highlights are derived at content load. Guy marked it as later. It should still land before real lessons become reorderable in the app, because hand-typed key lists go stale the moment a lesson moves.
6. **CR04 skill tree.** It needs Guy's topic diagram, populated `buildsOn` data and CR05.
7. **CR08 sentence bank and gating checker.** It needs the Masterfile ID columns (Guy's authorization), the importer (U01) and a form index that includes conjugation rows.

## 3. CR02 modular blocks: proposed contract

MASTER_SPEC §21–23 and §30 already describe ordered, add/remove/reorder components. The three-block rule is a demo-slice limit (ADR-B02 and CONTENT_CONTRACTS say so), so CR02 restores the specification rather than departing from it.

### 3.1 Today

`validateContent` requires exactly three blocks (`explanation`, `vocabulary`, `exercise-set`), a non-empty `lesson.wordIds` and a non-empty `lesson.exerciseIds`. Learner steps are derived from block types: `learn`, an optional `check` (from `checkExerciseIds`), `vocabulary`, `apply` and `complete`. Because step names come from types, two blocks of the same type would collide.

The resume record is `resumes[lessonId] = { revisionId, step, question, ... }`. Completion means every `lesson.exerciseIds` item was answered correctly at least once in one pinned revision. Review cards are created on completion for `lesson.wordIds`. Ordering distractors use the `wordIds` of the current and previous two lessons.

### 3.2 Proposed lesson shape (content v2)

```json
{
  "id": "synthetic-lesson-a",
  "title": "Synthetic lesson A",
  "chapter": "Synthetic chapter",
  "lessonType": "grammar",
  "minutes": 8,
  "buildsOn": [],
  "blocks": [
    { "id": "intro", "type": "video", "mediaId": "synthetic-media-1", "readText": "Optional Markdown shown under Read" },
    { "id": "rule", "type": "text", "markdown": "...", "interactions": [] },
    { "id": "words-1", "type": "vocabulary", "source": "words", "selector": { "wordIds": ["w1", "w2"] }, "renderer": "vocabulary-table", "options": { "showNotes": true } },
    { "id": "check-1", "type": "check", "source": "exercises", "selector": { "exerciseIds": ["e1", "e2"] } },
    { "id": "practice-1", "type": "exercise-set", "source": "exercises", "selector": { "exerciseIds": ["e3"] }, "renderer": "practice" },
    { "id": "words-2", "type": "vocabulary", "source": "words", "selector": { "lessonId": "synthetic-lesson-0", "blockId": "words-1" }, "renderer": "vocabulary-table" },
    { "id": "practice-2", "type": "exercise-set", "source": "exercises", "selector": { "exerciseIds": ["e4"] }, "renderer": "practice", "required": false }
  ]
}
```

- **Block types:**
  - `video`: exactly one media asset (CR06);
  - `text`: Markdown with optional inline interactions;
  - `vocabulary`;
  - `exercise-set`;
  - `check`: graded items. Each item may carry an `afterAnswer` explanation, as text or one short clip, shown after the learner answers. This is the Curriculum Designer's preferred alternative to a second "guided test" video. A narrated video block is still allowed.
- **Any number, any order.** 1–40 blocks per lesson. Zero vocabulary blocks and zero graded blocks are allowed. Vocabulary→exercise→vocabulary→exercise and several video blocks are allowed.
- **Stable block IDs**, assigned once by Studio. IDs are unique within the lesson, use the existing ID character rule, and are never derived from position, so a reorder never orphans progress. `finish` is reserved.
- **One owner per graded item.** An exercise belongs to its lesson (existing rule) and appears in at most one graded block of that lesson. This keeps "one progress slot per question" (L09) and the attempt→block mapping unambiguous. Reuse across lessons comes later, through CR08 templates.
- **`required`** defaults to true for `exercise-set` and `check`. Optional sets, for example extra practice, never gate completion.
- **Derived lists.** `lesson.wordIds` and `lesson.exerciseIds` become derived read-only views: the union of the vocabulary blocks, and the union of the graded blocks. `checkExerciseIds`, `lesson.video` and `lesson.explanation` are removed in v2.
- **The default template is data.** Studio's "New lesson" offers Learn (video or text) → Check → Vocabulary → Apply → Finish. The validator no longer enforces it.

### 3.3 Progress consequences

| Area | v2 behavior |
| --- | --- |
| Portion routes | `/lesson/:lessonId/:blockId`, plus `finish`. Labels come from an optional block title, otherwise the type label. The outline lists blocks. |
| Resume | `resumes[lessonId] = { revisionId, blockId, question, answer, selectedTokens, matching, resultRequestId, seenBlockIds }`. `step` is replaced by `blockId`. `seenBlockIds` marks ungraded blocks as visited in the outline. |
| Attempts | Each attempt adds `blockId`. Grading still uses the exercise in the pinned revision. Restore integrity extends to the new link: the block exists in the carried revision and contains the exercise. |
| Correct-answer bar (L09) | Slots are the distinct exercises in required graded blocks, within the pinned revision. Optional blocks show their own count but do not fill the lesson bar. |
| Lesson completion | Every required graded item answered correctly at least once in one pinned revision (the current rule, generalized). **For a lesson with no required graded items, the proposal is completion on reaching Finish. Guy must decide this.** Completion stays lesson-level and monotonic. |
| Review enrollment | On completion, cards are created for the words in the lesson's vocabulary blocks (excluding `noCard`). A lesson with no vocabulary creates no cards. |
| Ordering distractors | Drawn from derived lesson words. Early lessons with no vocabulary may not supply four taught distractors. The validator reports the exact exercise, as it does today. |
| Reorder and edit | Publishing a reorder creates a new revision. Open sessions stay pinned to their revision (D04), and new sessions use the new order. Moving an exercise between blocks re-keys only future attempts. Completed lessons stay completed. |
| Demo reset (D07) | Unchanged. The first B3 build resets fictional progress once, as with any build. |

### 3.4 Upcasting existing data (v1 → v2)

Every stored v1 snapshot is upcast deterministically when read: pinned sessions, history, imported v1 JSON and v1/v2 backups.

- `lesson.video` becomes a `video` block with ID `learn`. When text also exists, it becomes that block's `readText`, which preserves today's Watch/Read toggle.
- Text-only lessons become a `text` block with ID `learn`.
- `checkExerciseIds` becomes a `check` block with ID `check`, directly after `learn`, where today's Check portion sits.
- The vocabulary block becomes ID `vocabulary`, and the remaining exercises become ID `apply`, in manifest order.

Because the upcast IDs equal today's step names, an existing `resume.step` maps one-to-one to `blockId`, and old portion URLs keep resolving.

Store schema 3 and backup v3 carry v2 snapshots. v1 and v2 backups still restore through the upcast, with the existing all-or-nothing integrity checks.

### 3.5 Studio, preview and tests

- **Studio.** The guided lesson editor becomes a block list. The author can add any of the five types, remove blocks, reorder them (buttons, plus drag where reliable), and edit per-block settings.
- **Publication diff and dependency preview.** They report block additions, removals and reorders.
- **Draft rehearsal.** It renders any block sequence through the shared learner renderer.
- **Tests:**
  - validation: zero vocabulary; zero exercises; vocabulary/exercise interleaving; two videos; duplicate block IDs; an exercise in two graded blocks; unknown types; 41 blocks;
  - completion: several sets, optional sets, no graded items;
  - per-block resume;
  - v1 pinned-session upcast;
  - v1, v2 and v3 backup restore and rejection;
  - reorder diff;
  - actual-app navigation through a mixed sequence;
  - rehearsal of the same sequence.

## 4. CR06 media and CR07 lesson types

**CR06 (D-R3).** A `video` block references exactly one media asset (one file, from the media manifest contract). The schema has no start/end segment fields.

Today's exercise `explanationTime`, a seek into the single lesson video used by X02, becomes `explanationRef: { blockId }`. A v1 upcast keeps its seconds as an optional start point (`at`), with no end point. **Guy should confirm whether any seek is still wanted now that cuts are separate files.** Real Hebleo media remains unlinked (U03).

**CR07.** `lessonType` is one of `letters`, `nikkud`, `grammar`, `vocab-expansion` or `review-reference`. It is metadata only: Studio filters and badges, and later skill-tree styling. It is optional in v2 and gets no inferred default, because assigning it is a curriculum decision.

## 5. CR03 exercise types

Each type is added through a registry entry with:

- a schema;
- a server grader (accepted answers stay explicit, never generated);
- a learner renderer;
- a Studio guided form;
- rehearsal support;
- tests.

MASTER_SPEC §12 asks that new types need no application redesign. The registry is how B4 meets that.

| Curriculum priority | Type | Engineering note |
| --- | --- | --- |
| 1 | Listening (audio → meaning, audio → Hebrew choice) | Choice grader plus native audio. Writing stays hidden until reveal. Needs Guy's native recordings; no synthetic speech. |
| 2 | Dictation (audio → typed Hebrew) | Typed-Hebrew grader (E02/E08), with optional `requireNikkud` (E09). Needs native recordings. |
| 3 | Translation H→E and E→H | E→H reuses typed Hebrew. H→E needs a new typed-English normalizer (case, punctuation, articles) with explicit accepted alternatives. |
| 4 | Root / pattern identification | Choice or typed root letters. Needs reliable `root`/`pattern` word fields from the source mapping. |
| 5 | Conjugation (selection, production) | Choice and typed. Forms come from Masterfile conjugation rows, never generated. |
| 6 | Gender / agreement | Choice. Needs a gender field per noun from the source. |
| 7 | Nikkud add / remove | Add: typed with `requireNikkud`, using the keyboard's Nikkud column. Remove: typed without marks. The default normalizer ignores vowels, so this type needs an exact comparison that rejects any remaining mark. |

## 6. CR05 course versions and placement (D-R4)

**Data model (B3).** A course has versions. Each version has its own lesson order, lessons, exercises and publication history, and each version's status is `enrolling`, `maintenance` (enrolled learners only) or `retired`. A learner's enrollment records `courseVersionId`. Today there is one implicit version of `demo-foundations`.

Words and media stay shared canonical objects. Review cards, bookmarks and notes are keyed by word ID, so they carry across versions.

**Placement (B5).** An authored "see what you know" pass maps to new-version lesson groups. A result records `placedOut` lesson IDs, separate from `completed`. No attempts or completions are fabricated, and placed-out lessons stay open for review. A learner may decline and finish the enrolled version. A learner who switches keeps the old version's history read-only.

**Questions for Guy before B5:**

1. **Scope of the §58 departure.** The proposal is that only lesson-by-lesson completion mapping is dropped. Accounts, purchases and entitlements, SRS cards, bookmarks, notes and Q&A still migrate (U19), so no learner starts over.
2. **Where existing students finish the old version.** One option keeps LearnDash serving the old course until learners finish or switch, with placement as the entry into the app. The other imports the old 37-lesson course into the app as version 1. The Lead recommends the first option, which avoids importing a course that is being retired. This is Guy's decision.
3. **Old-version maintenance.** Should word and typo corrections propagate into a version in maintenance? The proposal is yes for shared words, and lessons in maintenance accept fixes only.

## 7. Future items

- **CR01, dynamic keyboard.** Each lesson declares `introduces: { letters, marks }`. Known keys are the union over all earlier lessons in course order, and new keys are the lesson's own. Reorders therefore update automatically, and the layout stays fixed. The colors become a course-level setting. This replaces `letters`, `keyboard.knownKeys` and `keyboard.newKeys`; a v1 upcast reads `newKeys` as `introduces`. If the skill tree later makes the order non-linear, "earlier" keeps meaning canonical course order, as Guy specified.
- **CR04, skill tree.** Nodes are lessons or Guy's topic groups. Edges come from `buildsOn` and the topic diagram. Unlock and progress state is derived from completion, placed-out and course-version data. Validation rejects cycles and unknown IDs.
- **CR08, sentence bank and gating checker.** Sentences store token word/form IDs and construction tags. Eligibility is recomputed when lessons move, and templates derive exercises. The deterministic checker reports unlearned words, forms or constructions before Guy approves. It needs a form index with prefix stripping, built from Masterfile form rows. Construction detection covers only what is tagged, so Guy's approval remains the authority.
