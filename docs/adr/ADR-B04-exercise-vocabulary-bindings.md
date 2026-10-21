# ADR B04: explicit vocabulary occurrences in exercises

Status: implemented backend/shared contract on architect/e10-bindings, based on
15d01035fd9a3988e3b0506a9bdea268249f2ece. Lead integration and native UI acceptance pending.
Scope: E10, all six current exercise families. No curriculum changes or production decision.

## Decision

Use an optional array on the existing exercise object:

```js
vocabularyBindings: [{
  id: "occurrence-1",
  wordId: "runtime-word-id",
  field: "context",
  start: 0,
  end: 9,
  text: "SYNTHETIC",
  sourceText: "SYNTHETIC context"
}]
```

This example is synthetic. Each binding is a human-authored link, not a spelling match.
Unbound exercises and unbound portions of a surface retain their existing behavior.
The record lives inside the exercise's revision; it does not create a separate object registry.

| Field | Contract |
| --- | --- |
| id | Existing stable-ID syntax, unique within the exercise. Keep it for the same occurrence across deliberate edits; allocate a fresh ID for a new occurrence. |
| wordId | Exactly one existing vocabulary runtime ID in this snapshot. Never a wordKey, source alias, row number, or inferred spelling. Multiple occurrences may refer to the same word. |
| field | prompt, context, feedback, feedbackDetails on any of the six families; tokens only on ordering; answers only on typing, ordering, cloze and transformation. |
| index | Required nonnegative integer for tokens/answers; forbidden for scalar fields. Refers to the authored row before learner tray preparation. |
| start/end | Half-open UTF-16 offsets, nonempty and within the exact string. Both ends must be extended grapheme boundaries from Intl.Segmenter. |
| text | Exact sourceText.slice(start, end), without trimming, normalization or inferred Nikkud. |
| sourceText | Exact entire authored surface/array row; at most 12,000 UTF-16 units. Changed text or a different row at that index invalidates the binding. |

At most 500 bindings per exercise. Unknown binding properties, duplicate binding IDs,
missing/ambiguous word IDs, unsupported fields, wrong indices, empty spans, split graphemes,
and overlapping spans on the same field/index are rejected. Adjacent spans are allowed.
The same range cannot identify two words. Different fields/rows may have different bindings.
Absent Intl.Segmenter fails closed for bound content. There is no fallback that splits Nikkud.

The row index plus sourceText catches stale row movement when the text differs. Swapping two
byte-identical strings is indistinguishable in the current array model. This contract does not
claim to establish identity between identical array rows; future distinct row metadata would
need stable row IDs. No heuristic relocates a binding after an edit.

## Public surfaces and grading

Store.publicExercise retains public bindings except field=answers. It still removes answers.
Answer binding text/sourceText must never be placed in the pre-answer exercise payload.

Ordering's public token tray interleaves taught distractors before the authored tokens.
Store supplies the authored-index-to-tray-index map from that exact construction
(i + min(i + 1, extraCount)). Bindings keep their stable IDs/text and receive public tray indices.
This is positional identity from the tray builder, not vocabulary matching. Repeated tokens
and prefix tiles retain distinct indices. Generated distractors receive no occurrence bindings.
If tray construction changes, update this mapping and its tests together.

After grading, Store.attempt, duplicate-attempt replay, saved Store.session feedback and
Store.previewEvaluate add optional result.vocabularyBindings containing only answer bindings.
These refer to original authored answer indices. Their sourceText is available only after the
existing grading response reveals authored expected/accepted answers. No answers array is
added to publicExercise. The strict rehearsal-result schema includes the additive field.

The response derives links from the exact pinned content/draft. It does not persist them in
learner attempt receipts, alter the verdict or replace result.answer. Imported receipt binding
metadata is ignored and recomputed. Raw submitted text, including wrong answers, whitespace,
directional characters and normalization differences, remains unchanged.

Render answer links on the authored expected/accepted surface identified by the binding,
never on arbitrary submitted text. Original answer indices must not be mistaken for indices
in the grader's deduplicated acceptedAnswers array. A renderer may show the exact authored
sourceText, or join it to an exactly equal expected/accepted string and check the slice;
that check establishes surface freshness, not word identity. Word identity comes only from wordId.

## Shared exports

All exports are in public/exercise-bindings.js, with no DOM or Node dependency:

| Export | Use |
| --- | --- |
| exerciseVocabularySurfaces(exercise) | Enumerate available {field, index?, sourceText} records for Studio selection; no inferred word forms. |
| exerciseGraphemeBoundaries(text) | Set of legal UTF-16 offsets for author selection. |
| validateExerciseVocabularyBindings(exercise, words?) | Return original bindings or []; throw on invalid data. Pass the complete snapshot words array at authoring boundaries to check unique references. Without words, checks surface structure/freshness only. Never mutates. |
| exerciseVocabularyReferenceIds(exercise, words?) | Distinct existing-family direct IDs plus valid explicit binding IDs. Invalid binding sets contribute no IDs; validate separately to report author errors. |
| projectExerciseVocabularyBindings(exercise, {tokenIndexMap}?) | Copy public bindings, omit answers, apply supplied authored-token-to-tray indices. |
| withAnswerVocabularyBindings(exercise, result) | Response-only answer bindings from pinned authored exercise; preserves grade and raw answer, discards any receipt-supplied binding metadata. |

Studio must save explicit selected ranges and runtime IDs into the existing draft object.
Validation does not create bindings or pick vocabulary automatically.

## Persistence, impact and card access

The additive field fits content schemaVersion 1 and Store schema 7; no SQL migration.
Normal Stage, import, publication, historical rollback, backup and restore all pass the shared
validator. Draft tokens and revision snapshots include the field automatically. References
participate in Store.dependencies, publication affected lessons (including reused composition
exercises), contract dependency inventories and approval digests. Deleting a referenced word
requires removing/rebinding the occurrence in the same valid draft.

exerciseVocabulary remains response version 1. Its lesson-scoped byWordId includes valid bound
IDs from the full supplied pinned snapshot, in addition to prior recognition/typing/matching IDs.
No new collection or latest-content fetch is needed. Managed-ID denial, Learned eligibility,
locked forms, Source separation, noVocab and unique legacy identity remain in the existing
projection path. noCard alone remains a review restriction. Viewing/rehearsal adds no writes.

## Lead integration

1. Register /exercise-bindings.js in the server's explicit static route map. src/server.js is
   outside this change's ownership; the module is currently usable through direct imports.
2. Wire Studio selection to the shared surfaces/validator and retain the full optional field.
3. Extend learner and preview decoration to explicit bindings on prompt/context/feedback,
   prepared tokens, and graded authored answers. Require a current graded result and a safe
   exerciseVocabulary.byWordId entry. Never bypass denied/missing entries via flat lookup.
4. When checking current-exercise membership, combine its public bindings with trusted current
   result answer bindings. Answer-only IDs will not be listed on the pre-answer public exercise.
   Verify result exercise/lesson/revision or draft context; do not accept stale result metadata.
5. Keep unrelated spans, submitted text, choices/distractors and unbound content plain.
   Complete integrated DOM/HTTP and mounted native interaction checks before changing E10 acceptance.

## Verification boundary

Disposable tests in test/exercise-bindings.test.js and schemas/checks/exercise-bindings.check.mjs
cover every family, exact Unicode, invalid/stale references and atomic rejection, answer withholding,
duplicate/prefix token identity, feedback/replay, source/managed denial, reused-lesson impact,
publish/rollback, pinned resume, backup/restore, and zero-write viewing/rehearsal.
No owner runtime, owner learner data, seed curriculum, real sources or front-end files were changed.
This is working backend/shared behavior; Studio authoring and learner decorations remain Lead/Feature work.

Commands actually run on this branch:

- npm ci --ignore-scripts --no-audit --no-fund and the corresponding npm --prefix schemas ci:
  dependency installation passed in the isolated clone.
- node --check public/exercise-bindings.js and node --check src/store.js: passed.
- node --test test/exercise-bindings.test.js test/post-answer-vocabulary.test.js
  test/publication-diff.test.js test/restore-integrity.test.js test/feedback18-store-model.test.js:
  42 passed, including 10 new binding tests; no skips.
- npm --prefix schemas test: 27 passed, including 4 new binding checks; no skips.
- npm run verify: syntax phase passed; broad discovery ran 745 tests, 742 passed, 3 failed.
- git diff --check: passed.

The three broad-suite failures were reproduced on an unchanged detached baseline worktree at
15d01035fd9a3988e3b0506a9bdea268249f2ece using
node --test qa-tests/independent.test.js test/oct12-audio-layout.test.js (7 passed, 3 failed):
the QA exact-clone assertion hardcodes earlier 444b917; the audio mock lacks addEventListener;
the audio-control count expects 3 but receives 1. These files were not changed in this task.
The broad suite is therefore not reported as green.

Local ignored logs: e10-verification.log, e10-focused-verification.log and
e10-baseline-verification.log. Tests use synthetic data and temporary/in-memory stores;
the existing owner's server at 63358 was not contacted or restarted.
