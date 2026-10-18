// Test transport only. Never import this module into runtime content/publication.
import assert from 'node:assert/strict';

const revision = 'TEST-ONLY:r1';
const approved = () => ({status: 'approved', reviewedRevision: revision,
  reviewedBy: 'TEST-ONLY', reviewedAt: '2026-10-18T00:00:00Z'});
const pending = () => ({status: 'pending'});
const review = status => status === 'TEST-ONLY-APPROVED' ? approved() : pending();
const sorted = values => [...values].sort();
const visible = output => output.slots.filter(slot => slot.state === 'available').map(slot => slot.slotId);

export function adaptEligibilityCase(pack, testCase, api) {
  const input = testCase.inputs;
  const provenance = new Map();
  const overlayFor = wordKey => input.simulatedReviewByWord?.[wordKey]
    ?? (wordKey === input.wordKey ? input.simulatedReview : undefined);
  const content = {
    version: api.LEXICAL_VERSION, sourceSchemaVersion: api.SOURCE_SCHEMA_VERSION,
    testOnly: true, sourceApproval: false,
    words: [], classes: [], introductions: [], unlocks: [], aliases: [], usages: [], examples: []
  };
  const catalogue = {
    status: 'connected', // The real canonical feed remains unconnected.
    courses: pack.contextCatalogue.courses.map(course => ({id: course.courseId,
      lessonIds: [...(course.courseId === input.context.courseId && input.testOnlyCourseOrder
        ? input.testOnlyCourseOrder : course.lessonOrder)]})),
    lessons: Object.entries(pack.contextCatalogue.lessonTitles).map(([id, title]) => ({id, title}))
  };
  for (const sourceWord of pack.fixtureWords) {
    const overlay = overlayFor(sourceWord.wordKey);
    const resolved = sourceWord.activeInSuppliedWorkbook && overlay?.identity === 'TEST-ONLY-RESOLVED';
    const bindingReviews = new Set(overlay?.bindingIds ?? []);
    const word = {
      wordKey: sourceWord.wordKey, category: sourceWord.category, revision,
      identityReview: resolved ? approved() : {status: overlay?.identity === 'held' ? 'unresolved' : 'pending'},
      fieldConflicts: [], classMemberships: [], forms: [],
      authorEvidence: {testOnly: true, held: !sourceWord.activeInSuppliedWorkbook,
        sourceIds: [...sourceWord.sourceIds], actualIdentityStatus: sourceWord.actualIdentityStatus},
      // Deliberately identical synthetic labels: these must never confer class membership.
      root: input.testOnlyReviewedClasses?.[0]?.classId ?? 'TEST-ONLY:shared-root',
      pattern: input.testOnlyReviewedClasses?.[0]?.classId ?? 'TEST-ONLY:shared-pattern'
    };
    for (const sourceSlot of sourceWord.slots) {
      if (sourceSlot.semanticSlot === null) {
        // The preposition's bare source form is evidence, not an eleventh unlock.
        const bindings = pack.bindings.filter(binding => binding.groupKey === word.wordKey && binding.slot === sourceSlot.slot);
        (word.authorEvidence.unscopedSlots ??= []).push({slot: structuredClone(sourceSlot), bindings: structuredClone(bindings)});
        for (const binding of bindings) provenance.set(binding.bindingId, {binding: structuredClone(binding),
          sourceInputs: structuredClone(pack.sourceInputs), workbookCell: sourceSlot.workbookCell});
        continue;
      }
      const bindings = pack.bindings.filter(binding => binding.groupKey === word.wordKey
        && binding.semanticSlot === sourceSlot.semanticSlot
        && !input.testOnlyRemoveBindings?.includes(binding.bindingId));
      const variants = bindings.map(binding => {
        provenance.set(binding.bindingId, {binding: structuredClone(binding),
          sourceInputs: structuredClone(pack.sourceInputs), workbookCell: sourceSlot.workbookCell});
        return {
          variantId: binding.bindingId, revision, origin: 'source',
          sourceRefs: [`TEST-ONLY:${binding.bindingId}:${binding.exactSourceLocator}`],
          review: bindingReviews.has(binding.bindingId) ? approved() : pending(),
          mappingReview: bindingReviews.has(binding.bindingId) ? approved() : pending(),
          // These supplied paradigm bindings are pointed text. No alternate spelling is made.
          representations: {pointed: {text: binding.value}}
        };
      });
      for (const draft of sourceWord.draftEvidence.filter(draft => draft.slot === sourceSlot.slot)) {
        assert.equal(draft.eligibleForLearnerDisplay, false);
        assert.equal(draft.spelling, 'independently-proposed-unpointed-full-spelling');
        variants.push({variantId: draft.draftId, revision, origin: 'generated', sourceRefs: [],
          review: pending(), mappingReview: pending(), representations: {unpointed: {text: draft.value}},
          authorEvidence: structuredClone(draft)});
      }
      const unresolved = bindings.some(binding => binding.mappingStatus === 'proposed-linguistic-slot-assignment'
        && !bindingReviews.has(binding.bindingId));
      const status = sourceSlot.status === 'not-applicable-in-source-sense' ? 'inapplicable'
        : unresolved ? 'unresolved' : variants.length ? 'supplied' : 'missing';
      word.forms.push({slotId: sourceSlot.semanticSlot, status, variants,
        authorEvidence: structuredClone(sourceSlot)});
    }
    content.words.push(word);
    for (const sourceId of sourceWord.sourceIds) content.aliases.push({kind: 'source',
      namespace: `TEST-ONLY:inventory:${word.category}`, aliasId: sourceId,
      wordKey: word.wordKey, revision, review: pending()});
  }
  for (const [index, link] of input.wordLinks.entries()) content.introductions.push({
    linkId: `TEST-ONLY:${testCase.id}:link:${index}`, ...link, revision, review: review(link.review)
  });
  for (const [index, sourceId] of (input.legacySourceIds ?? []).entries()) content.introductions.push({
    linkId: `TEST-ONLY:${testCase.id}:legacy:${index}`, wordKey: input.wordKey, action: 'legacy',
    revision, review: pending(), legacySourceId: sourceId
  });
  for (const sourceClass of input.testOnlyReviewedClasses ?? []) {
    content.classes.push({classId: sourceClass.classId, category: sourceClass.category, revision, review: approved()});
    for (const wordKey of sourceClass.memberWordKeys) content.words.find(word => word.wordKey === wordKey)
      .classMemberships.push({classId: sourceClass.classId, review: approved()});
  }
  for (const [index, addition] of input.slotIntroductions.entries()) {
    const sourceScope = addition.scope;
    const category = sourceScope.type === 'word'
      ? content.words.find(word => word.wordKey === sourceScope.wordKey)?.category : sourceScope.category;
    const scope = sourceScope.type === 'word' ? {kind: 'word', category, wordKey: sourceScope.wordKey}
      : sourceScope.type === 'all-relevant-words' ? {kind: 'all', category}
      : sourceScope.type === 'reviewed-class' ? {kind: 'class', category, classId: sourceScope.classId} : null;
    assert.ok(scope, `Unsupported fixture scope ${sourceScope.type}`);
    content.unlocks.push({unlockId: `TEST-ONLY:${testCase.id}:unlock:${index}`,
      courseId: addition.courseId, lessonId: addition.lessonId, revision,
      review: review(addition.review), scope, slotIds: [...addition.addSlots]});
  }
  return {content, catalogue, context: {...input.context, wordKey: input.wordKey, representation: 'pointed'}, provenance};
}

export function assertEligibilityCase(pack, testCase, adapted, api, outputOverride) {
  const {content, catalogue, context, provenance} = adapted;
  const before = JSON.stringify({content, catalogue, context});
  const output = outputOverride ?? api.computeEligibility(content, catalogue, context);
  const expected = testCase.expected;
  let assertions = 0;
  const equal = (actual, value, message) => { assert.deepEqual(actual, value, `${testCase.id}: ${message}`); assertions++; };
  const sameSlots = (actual, value, message) => equal(sorted(actual), sorted(value), message);
  const slot = id => { const found = output.slots.find(slot => slot.slotId === id); assert.ok(found, `${testCase.id}: missing ${id}`); return found; };
  const inspect = wordKey => api.computeEligibility(content, catalogue, {...context, wordKey});
  const pendingIntegration = [];
  const deferred = (field, reason) => pendingIntegration.push({field, reason});
  const removed = new Set(testCase.inputs.testOnlyRemoveBindings ?? []);
  equal(provenance.size, pack.bindings.length - removed.size, 'all supplied evidence retained, including unscoped base forms');
  for (const binding of pack.bindings) if (!removed.has(binding.bindingId))
    equal(provenance.get(binding.bindingId)?.binding, binding, 'lossless author-side binding');
  const validationCodes = {
    'reject-unreviewed-or-unknown-class': 'invalid-class-scope',
    'reject-slot-category-vs-target-mismatch': 'cross-category-slot',
    'unknown-lesson-context': 'unknown-course-or-lesson'
  };
  if (expected.validation) {
    equal(output.ok, false, 'invalid input fails closed');
    equal(output.errors.some(error => error.code === validationCodes[expected.validation]), true, 'specific validation error');
    equal(output.citation, null, 'no invalid citation');
  } else {
    equal(output.errors, [], 'no unexpected validation errors'); equal(output.ok, true, 'valid case');
  }
  for (const [field, value] of Object.entries(expected)) {
    switch (field) {
      case 'visibleSlots': sameSlots(visible(output), value, field); break;
      case 'validation': break;
      case 'unlockedSlotCount': equal(output.slots.filter(slot => slot.introduced).length, value, field); break;
      case 'unapprovedSlotCount': equal(output.slots.filter(slot => slot.sourceState === 'unapproved').length, value, field); break;
      case 'missingSlots': case 'unapprovedSlots': case 'inapplicableSlots': case 'unresolvedSlots':
        for (const id of value) equal(slot(id).sourceState,
          {missingSlots: 'missing', unapprovedSlots: 'unapproved', inapplicableSlots: 'inapplicable', unresolvedSlots: 'unresolved'}[field], `${field}:${id}`);
        break;
      case 'sourcePresentButLocked':
        for (const id of value) { equal(slot(id).state, 'locked', `${field}:${id}`); equal(slot(id).sourceState, 'available', `source:${id}`); }
        break;
      case 'introducedButSourceMissing':
        for (const id of value) { equal(slot(id).introduced, true, `introduced:${id}`); equal(slot(id).sourceState, 'missing', `missing:${id}`); }
        break;
      case 'citation': {
        assert.ok(output.citation, `${testCase.id}: citation is absent`);
        equal(output.citation.slots.map(item => item.slotId), ['verb.past.he', 'verb.present.Singular M'], 'fixed citation pair');
        const [past, present] = output.citation.slots;
        if (value.slots) equal(output.citation.slots.map(item => item.slotId), value.slots, 'citation order');
        if (value.bindingIds) equal(output.citation.slots.flatMap(item => item.variants.map(v => v.variantId)), value.bindingIds, 'citation bindings');
        if (value.pastBindingIds) equal(past.variants.map(v => v.variantId), value.pastBindingIds, 'all past citation variants');
        if (value.presentState) equal(present.sourceState, value.presentState === 'missing-source' ? 'missing' : value.presentState, 'present citation state');
        if (value.separator) {
          equal(output.citation.separator, value.separator.trim(), 'neutral hyphen token');
          deferred('citation.separator', 'API provides the hyphen token; rendered spacing is not exercised.');
        }
        if (value.independentOfExpandedUnlock) for (const item of output.citation.slots)
          equal(item.sourceState, 'available', `citation available independently:${item.slotId}`);
        if (value.noSubstitution) equal(present.variants, [], 'no present citation substitution');
        break;
      }
      case 'citationVisible': equal(output.citation !== null, value, field); break;
      case 'citationPlaceholders':
        equal(output.citation.slots.map(item => item.sourceState), value, 'pending citation source states');
        equal(output.citation.slots.map(item => item.variants), [[], []], 'no unreviewed citation text');
        deferred(field, 'Source states match fixture placeholders; rendered labels are outside this API.');
        break;
      case 'sharedCells':
        for (const cell of value) {
          const definition = api.SLOT_DEFINITIONS.find(item => item.id === cell.semanticSlot);
          equal(definition.shared, true, 'declared shared gender'); equal(definition.gender, 'shared', 'shared gender metadata');
          equal(output.slots.filter(item => item.slotId === cell.semanticSlot).length, cell.cellCount, 'one logical shared slot');
          equal(slot(cell.semanticSlot).variants.some(v => v.variantId === cell.bindingId), true, 'shared binding retained');
          equal(cell.spanGenders, ['masculine', 'feminine'], 'fixture shared span');
        }
        deferred(field, 'Logical shared-slot metadata verified; DOM colspan/rowspan remains untested.');
        break;
      case 'preserveAllCandidateVariants':
        for (const resultSlot of output.slots.filter(item => item.state === 'available')) {
          const sourceForm = content.words.find(word => word.wordKey === context.wordKey).forms.find(item => item.slotId === resultSlot.slotId);
          sameSlots(resultSlot.variants.map(v => v.variantId), sourceForm.variants.filter(v => v.origin === 'source').map(v => v.variantId), 'all candidate variants');
        }
        break;
      case 'draftId':
        equal(content.words.flatMap(w => w.forms.flatMap(f => f.variants)).some(v => v.variantId === value && v.origin === 'generated'), true, 'draft retained only as generated evidence');
        equal(JSON.stringify(output).includes(value), false, 'draft ID absent from projection'); break;
      case 'mustNotUseAsAnswerKey': deferred(field, 'Resolver excludes draft variants; no grader/answer-key integration is exercised.'); break;
      case 'distinctSemanticSlotsDespiteEqualStrings': {
        const bindings = value.map(id => provenance.get(id).binding);
        equal(bindings[0].value, bindings[1].value, 'equal source text preserved');
        equal(new Set(bindings.map(binding => binding.semanticSlot)).size, 2, 'distinct semantic slots');
        for (const binding of bindings) equal(api.SLOT_DEFINITIONS.find(item => item.id === binding.semanticSlot).shared, false, 'no inferred shared cell');
        break;
      }
      case 'unresolvedBindingIds': for (const id of value) {
        equal(provenance.has(id), true, 'unresolved provenance retained');
        equal(output.slots.flatMap(item => item.variants).some(v => v.variantId === id), false, 'unresolved variant not projected');
      } break;
      case 'lexicalRows':
        equal(output.wordAvailable ? content.words.filter(word => word.wordKey === context.wordKey).length : 0, value, 'available model identity count');
        deferred(field, 'Available model identity count verified; actual rendered table rows remain untested.'); break;
      case 'lexicalIdentityCount': equal(content.words.filter(word => word.wordKey === context.wordKey).length, value, field); break;
      case 'legacyOccurrencesRetained': equal(content.introductions.filter(link => link.action === 'legacy').length, value, field); break;
      case 'reviewIdentities': case 'noDuplicateReviewIdentity': deferred(field, 'Review-card persistence is outside the pure resolver.'); break;
      case 'state':
        equal(output.wordState, value === 'word-not-introduced' ? 'not-introduced' : 'unapproved', 'word availability state');
        if (value === 'held-identity') {
          equal(content.words.find(word => word.wordKey === context.wordKey).authorEvidence.held, true, 'held evidence retained');
          equal(output.wordAvailable, false, 'held word suppressed');
          deferred(field, 'API has no held-identity enum; author metadata retains the hold while wordState is unapproved.');
        }
        break;
      case 'otherWordVisibleSlots': {
        const other = testCase.inputs.alsoInspectWord ?? testCase.inputs.wordLinks.find(link => link.wordKey !== context.wordKey)?.wordKey;
        assert.ok(other, 'Missing other-word context'); sameSlots(visible(inspect(other)), value, field); break;
      }
      case 'wordSlotVisibility': for (const [wordKey, slotIds] of Object.entries(value)) sameSlots(visible(inspect(wordKey)), slotIds, `word visibility:${wordKey}`); break;
      case 'requiresEachOtherWordOwnEligibleBinding':
        for (const [wordKey, expectedSlots] of Object.entries(expected.wordSlotVisibility)) {
          if (!expectedSlots.length) continue;
          const altered = structuredClone(content);
          altered.words.find(word => word.wordKey === wordKey).forms.flatMap(form => form.variants).forEach(v => { v.review = pending(); });
          sameSlots(visible(api.computeEligibility(altered, catalogue, {...context, wordKey})), [], `own binding approval required:${wordKey}`);
        }
        break;
      case 'rootPatternMustNotInferMembership': {
        const outsider = content.words.find(word => word.wordKey !== context.wordKey && testCase.inputs.wordLinks.some(link => link.wordKey === word.wordKey));
        equal(outsider.root, content.classes[0].classId, 'outsider root resembles class ID');
        equal(outsider.pattern, content.classes[0].classId, 'outsider pattern resembles class ID');
        equal(outsider.classMemberships, [], 'outsider membership stays absent'); break;
      }
      case 'newlyIntroducedSlots': sameSlots(output.slots.filter(item => item.addedHere).map(item => item.slotId), value, field); break;
      case 'inheritedSlots': sameSlots(output.slots.filter(item => item.inherited).map(item => item.slotId), value, field); break;
      case 'noNumericOrSpreadsheetFallback': equal(output.wordAvailable, false, 'unknown context unavailable'); break;
      case 'layout': case 'localScrollIfNeeded': deferred(field, 'No renderer, viewport measurement or scrolling is exercised.'); break;
      default: throw new Error(`Unmapped fixture expectation: ${field}`);
    }
  }
  const projectedVariants = [...output.slots, ...(output.citation?.slots ?? [])]
    .flatMap(item => item.variants.map(variant => ({slotId: item.slotId, variant})));
  for (const {slotId, variant} of projectedVariants) {
    const evidence = provenance.get(variant.variantId);
    assert.ok(evidence, `${testCase.id}: non-source variant projected`); assertions++;
    equal(variant.text, evidence.binding.value, 'exact supplied text');
    equal(evidence.binding.semanticSlot, slotId, 'binding stays in its semantic slot');
    equal(evidence.binding, pack.bindings.find(binding => binding.bindingId === variant.variantId), 'lossless source provenance');
    equal(evidence.sourceInputs, pack.sourceInputs, 'source input hashes retained');
  }
  for (const item of output.slots) if (item.state !== 'available') equal(item.variants, [], 'ineligible variants suppressed');
  equal(JSON.stringify({content, catalogue, context}), before, 'resolver leaves input unchanged');
  return {id: testCase.id, status: 'PASS', assertions, visibleSlots: visible(output),
    wordState: output.wordState, validationErrors: output.errors,
    sourceStates: Object.fromEntries([...new Set(output.slots.map(item => item.sourceState))]
      .map(state => [state, output.slots.filter(item => item.sourceState === state).map(item => item.slotId)])),
    introducedSlots: output.slots.filter(item => item.introduced).map(item => item.slotId),
    inheritedSlots: output.slots.filter(item => item.inherited).map(item => item.slotId),
    addedHereSlots: output.slots.filter(item => item.addedHere).map(item => item.slotId),
    citation: output.citation?.slots.map(item => ({slotId: item.slotId, sourceState: item.sourceState,
      variantIds: item.variants.map(variant => variant.variantId)})) ?? null,
    pendingIntegration};
}
