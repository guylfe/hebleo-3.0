// Pure, browser-safe contracts. No source writes, storage, network or implicit approval.
export const LEXICAL_VERSION = 'hebleo-lexical-runtime-v1';
export const SOURCE_SCHEMA_VERSION = 'hebleo-lexical-consolidation-v3';
export const PROGRESS_PREVIEW_VERSION = 'hebleo-lexical-progress-preview-v1';
export const SLOT_IDS = Object.freeze([
  'verb.infinitive', 'verb.gerund',
  'verb.past.I', 'verb.past.אתה', 'verb.past.את', 'verb.past.he', 'verb.past.she',
  'verb.past.אנחנו', 'verb.past.אתם', 'verb.past.אתן', 'verb.past.they',
  'verb.present.Singular M', 'verb.present.Singular F', 'verb.present.Plural M', 'verb.present.Plural F',
  'verb.future.I', 'verb.future.אתה', 'verb.future.את', 'verb.future.he', 'verb.future.she',
  'verb.future.אנחנו', 'verb.future.אתם', 'verb.future.אתן', 'verb.future.they',
  'verb.imperative.אתה', 'verb.imperative.את', 'verb.imperative.אתם', 'verb.imperative.אתן',
  'adjective.ms', 'adjective.fs', 'adjective.mp', 'adjective.fp',
  'preposition.I', 'preposition.אתה', 'preposition.את', 'preposition.he', 'preposition.she',
  'preposition.אנחנו', 'preposition.אתם', 'preposition.אתן', 'preposition.הם', 'preposition.הן'
]);
export const VERB_CITATION_SLOTS = Object.freeze(['verb.past.he', 'verb.present.Singular M']);
export const REPRESENTATIONS = Object.freeze(['pointed', 'unpointed', 'curated']);
const personSlots = {
  I: ['אני', 'singular', 'shared'], אתה: ['אתה', 'singular', 'masculine'], את: ['את', 'singular', 'feminine'],
  he: ['הוא', 'singular', 'masculine'], she: ['היא', 'singular', 'feminine'],
  אנחנו: ['אנחנו', 'plural', 'shared'], אתם: ['אתם', 'plural', 'masculine'], אתן: ['אתן', 'plural', 'feminine'],
  they: ['הם / הן', 'plural', 'shared'], הם: ['הם', 'plural', 'masculine'], הן: ['הן', 'plural', 'feminine']
};
const agreementSlots = {ms: ['singular', 'masculine'], fs: ['singular', 'feminine'], mp: ['plural', 'masculine'], fp: ['plural', 'feminine'],
  'Singular M': ['singular', 'masculine'], 'Singular F': ['singular', 'feminine'], 'Plural M': ['plural', 'masculine'], 'Plural F': ['plural', 'feminine']};
// Explicit schema metadata: equal strings never imply a shared-gender cell.
export const SLOT_DEFINITIONS = Object.freeze(SLOT_IDS.map(id => {
  const [category, section, person] = id.split('.'), token = person ?? section;
  const agreement = agreementSlots[token], pronoun = personSlots[token];
  return Object.freeze({id, category, group: category === 'verb' ? section : category,
    number: agreement?.[0] ?? pronoun?.[1] ?? null, gender: agreement?.[1] ?? pronoun?.[2] ?? null,
    pronoun: pronoun?.[0] ?? null, shared: pronoun?.[2] === 'shared', citation: VERB_CITATION_SLOTS.includes(id)});
}));
const categories = ['verb', 'adjective', 'preposition', 'noun', 'other'];
const reviewStatuses = ['approved', 'pending', 'rejected', 'unresolved'];
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const string = v => typeof v === 'string' && v.trim().length > 0;
const list = v => Array.isArray(v) ? v : [];
const clone = v => structuredClone(v);
const unique = v => [...new Set(v)];
const key = (...v) => JSON.stringify(v);
const canonical = v => JSON.stringify(v, (_k, x) => object(x)
  ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : x);
export const slotsForCategory = category => SLOT_IDS.filter(id => id.startsWith(category + '.'));

// The server owns review issuance and immutable revisions. This checks metadata consistency,
// not human authority or content digests. Revision must change on every reviewed-payload edit.
export function isApproved(review, revision) {
  return object(review) && review.status === 'approved' && string(revision)
    && review.reviewedRevision === revision && string(review.reviewedBy)
    && string(review.reviewedAt) && Number.isFinite(Date.parse(review.reviewedAt));
}

function reviewErrors(review, revision, path, add) {
  if (!object(review) || !reviewStatuses.includes(review.status)) add(path, 'invalid-review');
  else if (review.status === 'approved' && !isApproved(review, revision)) add(path, 'stale-or-incomplete-review');
}

// Unknown author metadata is retained; callers must never spread it into DOM or learner JSON.
export function validateLexicalContent(content, catalogue) {
  const errors = [], add = (path, code) => errors.push({path, code});
  if (!object(content)) return {ok: false, errors: [{path: '', code: 'invalid-content'}]};
  if (content.version !== LEXICAL_VERSION) add('version', 'unsupported-version');
  if (content.sourceSchemaVersion !== SOURCE_SCHEMA_VERSION) add('sourceSchemaVersion', 'unsupported-source-version');
  const collections = ['words', 'classes', 'introductions', 'unlocks', 'aliases', 'usages', 'examples'];
  for (const name of collections) if (!Array.isArray(content[name])) add(name, 'expected-array');
  const registry = (name, idField) => {
    const ids = new Map();
    list(content[name]).forEach((item, i) => {
      const p = `${name}[${i}]`;
      if (!object(item)) { add(p, 'expected-object'); return; }
      if (!string(item[idField]) || ids.has(item[idField])) add(p + '.' + idField, 'missing-or-duplicate-id');
      else ids.set(item[idField], item);
    });
    return ids;
  };
  const words = registry('words', 'wordKey'), classes = registry('classes', 'classId');
  registry('introductions', 'linkId'); registry('unlocks', 'unlockId');
  const usages = registry('usages', 'usageId'); registry('examples', 'exampleId');
  const versioned = (item, p, reviewField = 'review') => {
    if (!string(item.revision)) add(p + '.revision', 'missing-revision');
    reviewErrors(item[reviewField], item.revision, p + '.' + reviewField, add);
  };
  for (const [wordKey, word] of words) {
    const p = `words[${wordKey}]`;
    versioned(word, p, 'identityReview');
    if (!categories.includes(word.category)) add(p + '.category', 'invalid-category');
    if (!Array.isArray(word.fieldConflicts)) add(p + '.fieldConflicts', 'expected-array');
    if (!Array.isArray(word.forms)) add(p + '.forms', 'expected-array');
    if (!Array.isArray(word.classMemberships)) add(p + '.classMemberships', 'expected-array');
    const expected = slotsForCategory(word.category), seen = new Set(), variants = new Set();
    for (const form of list(word.forms)) {
      if (!object(form)) { add(p + '.forms', 'expected-object'); continue; }
      const fp = p + '.forms[' + form.slotId + ']';
      if (!expected.includes(form.slotId) || seen.has(form.slotId)) add(fp, 'unknown-cross-category-or-duplicate-slot');
      seen.add(form.slotId);
      if (!['supplied', 'missing', 'inapplicable', 'unresolved'].includes(form.status)) add(fp, 'invalid-form-status');
      if (!Array.isArray(form.variants)) add(fp + '.variants', 'expected-array');
      if (['missing', 'inapplicable'].includes(form.status) && list(form.variants).length) add(fp, 'status-has-text');
      for (const variant of list(form.variants)) {
        if (!object(variant)) { add(fp, 'invalid-variant'); continue; }
        const vp = fp + '.variants[' + variant.variantId + ']';
        if (!string(variant.variantId) || variants.has(variant.variantId)) add(vp, 'missing-or-duplicate-id');
        variants.add(variant.variantId);
        versioned(variant, vp);
        reviewErrors(variant.mappingReview, variant.revision, vp + '.mappingReview', add);
        if (!['source', 'human-authored', 'generated'].includes(variant.origin)) add(vp + '.origin', 'invalid-origin');
        if (!Array.isArray(variant.sourceRefs) || variant.sourceRefs.some(ref => !string(ref))
          || (variant.origin === 'source' && !variant.sourceRefs.length)) add(vp + '.sourceRefs', 'missing-source-reference');
        if (!object(variant.representations)) { add(vp + '.representations', 'expected-object'); continue; }
        for (const [representation, rich] of Object.entries(variant.representations)) {
          const rp = vp + '.' + representation;
          if (!REPRESENTATIONS.includes(representation)) add(rp, 'unknown-representation');
          if (!object(rich) || typeof rich.text !== 'string') { add(rp, 'invalid-rich-text'); continue; }
          if (rich.format !== undefined && !object(rich.format)) add(rp + '.format', 'invalid-format');
          if (rich.runs !== undefined && !Array.isArray(rich.runs)) add(rp + '.runs', 'expected-array');
          let previous = -1;
          for (const run of list(rich.runs)) {
            const n = run?.startIndex;
            // JS indices are UTF-16; do not split a surrogate pair or reorder source runs.
            if (!Number.isInteger(n) || n < 0 || n >= rich.text.length || n <= previous
              || (n > 0 && /[\uD800-\uDBFF]/.test(rich.text[n - 1]) && /[\uDC00-\uDFFF]/.test(rich.text[n]))
              || !object(run.format)) add(rp + '.runs', 'invalid-utf16-run');
            previous = n;
          }
        }
      }
    }
    if (expected.some(id => !seen.has(id))) add(p + '.forms', 'incomplete-slot-inventory');
    const membershipIds = new Set();
    for (const membership of list(word.classMemberships)) {
      const c = classes.get(membership?.classId);
      if (!c || c.category !== word.category || membershipIds.has(membership.classId)) add(p + '.classMemberships', 'invalid-class-reference');
      membershipIds.add(membership?.classId);
      reviewErrors(membership?.review, word.revision, p + '.classMemberships.review', add);
    }
  }
  for (const c of classes.values()) {
    versioned(c, `classes[${c.classId}]`);
    if (!slotsForCategory(c.category).length) add(`classes[${c.classId}].category`, 'invalid-category');
  }
  for (const [i, link] of list(content.introductions).entries()) {
    if (!object(link)) continue;
    const p = `introductions[${i}]`; versioned(link, p);
    if (!words.has(link.wordKey)) add(p + '.wordKey', 'unknown-word');
    if (!['introduce', 'reuse', 'legacy'].includes(link.action)) add(p + '.action', 'invalid-action');
    if (link.action !== 'legacy' && (!string(link.courseId) || !string(link.lessonId))) add(p, 'missing-course-or-lesson');
    if (link.action === 'legacy' && (link.courseId != null || link.lessonId != null)) add(p, 'legacy-is-not-canonical-binding');
  }
  for (const [i, unlock] of list(content.unlocks).entries()) {
    if (!object(unlock)) continue;
    const p = `unlocks[${i}]`; versioned(unlock, p);
    if (!string(unlock.courseId) || !string(unlock.lessonId)) add(p, 'missing-course-or-lesson');
    if (!Array.isArray(unlock.slotIds) || unique(list(unlock.slotIds)).length !== list(unlock.slotIds).length
      || list(unlock.slotIds).some(id => !SLOT_IDS.includes(id))) add(p + '.slotIds', 'unknown-or-duplicate-slot');
    const scope = unlock.scope;
    if (!object(scope) || !['all', 'word', 'class'].includes(scope.kind)) { add(p + '.scope', 'invalid-scope'); continue; }
    if (!slotsForCategory(scope.category).length) add(p + '.scope.category', 'invalid-category');
    if (list(unlock.slotIds).some(id => !slotsForCategory(scope.category).includes(id))) add(p + '.scope', 'cross-category-slot');
    if (scope.kind === 'all' && (scope.wordKey !== undefined || scope.classId !== undefined)) add(p + '.scope', 'extraneous-scope-reference');
    if (scope.kind === 'word' && (words.get(scope.wordKey)?.category !== scope.category || scope.classId !== undefined)) add(p + '.scope', 'invalid-word-scope');
    if (scope.kind === 'class' && (classes.get(scope.classId)?.category !== scope.category || scope.wordKey !== undefined)) add(p + '.scope', 'invalid-class-scope');
  }
  const aliases = new Set();
  for (const [i, alias] of list(content.aliases).entries()) {
    const p = `aliases[${i}]`;
    if (!object(alias)) { add(p, 'expected-object'); continue; }
    versioned(alias, p);
    const composite = key(alias.kind, alias.namespace, alias.aliasId);
    if (!['source', 'word', 'form'].includes(alias.kind) || !string(alias.namespace) || !string(alias.aliasId)
      || aliases.has(composite)) add(p, 'invalid-or-duplicate-alias');
    aliases.add(composite);
    if (!words.has(alias.wordKey)) add(p + '.wordKey', 'unknown-word');
    if (alias.slotId != null && (alias.kind !== 'form' || !slotsForCategory(words.get(alias.wordKey)?.category).includes(alias.slotId))) add(p + '.slotId', 'invalid-form-reference');
  }
  for (const name of ['usages', 'examples']) for (const [i, child] of list(content[name]).entries()) {
    if (!object(child)) continue;
    if (!words.has(child.wordKey)) add(`${name}[${i}].wordKey`, 'unknown-word');
    if (child.usageId != null && name === 'examples' && usages.get(child.usageId)?.wordKey !== child.wordKey) add(`${name}[${i}].usageId`, 'invalid-usage-reference');
    // Child payload/formatting remains author data until the existing publication gate approves it.
  }
  if (catalogue !== undefined) {
    const cv = validateCatalogue(catalogue); errors.push(...cv.errors);
    if (cv.ok && catalogue.status === 'connected') {
      for (const name of ['introductions', 'unlocks']) for (const [i, item] of list(content[name]).entries()) {
        if (!object(item) || item.action === 'legacy') continue;
        if (!catalogue.courses.find(c => c.id === item.courseId)?.lessonIds.includes(item.lessonId)) add(`${name}[${i}]`, 'lesson-outside-course');
      }
    }
  }
  return {ok: errors.length === 0, errors};
}

export function validateCatalogue(catalogue) {
  const errors = [], add = (path, code) => errors.push({path: 'catalogue.' + path, code});
  if (!object(catalogue) || !['connected', 'unconnected'].includes(catalogue.status)) return {ok: false, errors: [{path: 'catalogue', code: 'invalid-catalogue'}]};
  if (!Array.isArray(catalogue.lessons) || !Array.isArray(catalogue.courses)) add('', 'expected-arrays');
  const lessons = new Set(), courses = new Set();
  for (const lesson of list(catalogue.lessons)) {
    if (!string(lesson?.id) || lessons.has(lesson.id) || !string(lesson.title)) add('lessons', 'invalid-or-duplicate-lesson');
    lessons.add(lesson?.id);
  }
  for (const course of list(catalogue.courses)) {
    if (!string(course?.id) || courses.has(course.id) || !Array.isArray(course.lessonIds)
      || unique(list(course?.lessonIds)).length !== list(course?.lessonIds).length
      || list(course?.lessonIds).some(id => !lessons.has(id))) add('courses', 'invalid-course-order');
    courses.add(course?.id);
  }
  return {ok: !errors.length, errors};
}

export function projectLessonTitles(links, catalogue) {
  const valid = validateCatalogue(catalogue).ok;
  return links.map(link => {
    const lesson = valid && catalogue.status === 'connected' && catalogue.lessons.find(l => l.id === link.lessonId);
    const bound = lesson && catalogue.courses.find(c => c.id === link.courseId)?.lessonIds.includes(link.lessonId);
    return {linkId: link.linkId, lessonId: link.lessonId ?? null, courseId: link.courseId ?? null,
      title: bound ? lesson.title : null,
      status: !valid ? 'invalid-catalogue' : catalogue.status !== 'connected' ? 'unconnected'
        : link.action === 'legacy' || !link.lessonId ? 'unbound' : !lesson ? 'unknown-lesson' : !bound ? 'outside-course' : 'connected'};
  });
}

function sourceProjection(form, representation) {
  if (!form || form.status === 'missing') return {sourceState: 'missing', variants: []};
  if (form.status === 'inapplicable') return {sourceState: 'inapplicable', variants: []};
  if (form.status === 'unresolved') return {sourceState: 'unresolved', variants: []};
  const approved = form.variants.filter(v => isApproved(v.review, v.revision) && isApproved(v.mappingReview, v.revision));
  const variants = approved.filter(v => string(v.representations[representation]?.text)).map(v => {
    const rich = v.representations[representation];
    return {variantId: v.variantId, text: rich.text, ...(rich.runs ? {runs: clone(rich.runs)} : {}),
      ...(rich.format ? {format: clone(rich.format)} : {})};
  });
  return {sourceState: variants.length ? 'available' : form.variants.length && !approved.length ? 'unapproved' : 'missing', variants};
}

export function projectVerbCitation(word, representation = 'pointed') {
  // Requires a validated word. Caller also gates word availability in its course context.
  const allowed = word?.category === 'verb' && REPRESENTATIONS.includes(representation)
    && isApproved(word.identityReview, word.revision) && Array.isArray(word.fieldConflicts) && !word.fieldConflicts.length;
  return {separator: '-', direction: 'rtl', slots: VERB_CITATION_SLOTS.map(slotId => ({slotId,
    ...(allowed ? sourceProjection(word.forms.find(f => f.slotId === slotId), representation) : {sourceState: 'unapproved', variants: []})}))};
}

export function computeEligibility(content, catalogue, context) {
  const validation = validateLexicalContent(content, catalogue);
  const errors = [...validation.errors];
  const representation = context?.representation ?? 'pointed';
  const course = list(catalogue?.courses).find(c => c?.id === context?.courseId);
  const index = list(course?.lessonIds).indexOf(context?.lessonId);
  const word = list(content?.words).find(w => w?.wordKey === context?.wordKey);
  if (catalogue?.status !== 'connected') errors.push({path: 'catalogue', code: 'unconnected'});
  if (index < 0) errors.push({path: 'context', code: 'unknown-course-or-lesson'});
  if (!word) errors.push({path: 'context.wordKey', code: 'unknown-word'});
  if (!REPRESENTATIONS.includes(representation)) errors.push({path: 'context.representation', code: 'invalid-representation'});
  if (errors.length) return {ok: false, errors, wordAvailable: false, wordState: 'invalid', slots: [], citation: null};
  const beforeOrHere = item => item.courseId === course.id && course.lessonIds.indexOf(item.lessonId) >= 0
    && course.lessonIds.indexOf(item.lessonId) <= index;
  const introduced = content.introductions.some(link => link.wordKey === word.wordKey && link.action === 'introduce'
    && beforeOrHere(link) && isApproved(link.review, link.revision));
  const wordState = !isApproved(word.identityReview, word.revision) ? 'unapproved'
    : word.fieldConflicts.length ? 'unresolved' : !introduced ? 'not-introduced' : 'available';
  const wordAvailable = wordState === 'available';
  const applicable = content.unlocks.filter(unlock => {
    if (!beforeOrHere(unlock) || !isApproved(unlock.review, unlock.revision) || unlock.scope.category !== word.category) return false;
    if (unlock.scope.kind === 'all') return true;
    if (unlock.scope.kind === 'word') return unlock.scope.wordKey === word.wordKey;
    const c = content.classes.find(c => c.classId === unlock.scope.classId);
    return isApproved(c?.review, c?.revision) && word.classMemberships.some(m => m.classId === c.classId && isApproved(m.review, word.revision));
  });
  const slots = slotsForCategory(word.category).map(slotId => {
    const additions = applicable.filter(u => u.slotIds.includes(slotId));
    const source = sourceProjection(word.forms.find(f => f.slotId === slotId), representation);
    const state = !wordAvailable ? 'word-unavailable' : !additions.length ? 'locked' : source.sourceState;
    return {slotId, state, sourceState: source.sourceState, introduced: !!additions.length,
      inherited: additions.some(u => u.lessonId !== context.lessonId), addedHere: additions.some(u => u.lessonId === context.lessonId),
      introductions: additions.map(u => ({unlockId: u.unlockId, lessonId: u.lessonId, scope: clone(u.scope)})),
      variants: state === 'available' ? source.variants : []};
  });
  return {ok: true, errors: [], wordAvailable, wordState, slots,
    citation: wordAvailable && word.category === 'verb' ? projectVerbCitation(word, representation) : null};
}

// Alias resolution never guesses by label, spelling, numeric lesson reference or source row.
export function resolveLexicalAlias(content, {kind, namespace, aliasId}) {
  const matches = list(content?.aliases).filter(a => a?.kind === kind && a.namespace === namespace && a.aliasId === aliasId);
  if (!matches.length) return {status: 'unknown', wordKey: null, slotId: null};
  if (matches.length !== 1) return {status: 'conflict', wordKey: null, slotId: null};
  const alias = matches[0], word = list(content?.words).find(w => w?.wordKey === alias.wordKey);
  if (!word || !isApproved(alias.review, alias.revision) || !isApproved(word.identityReview, word.revision)) return {status: 'unapproved', wordKey: null, slotId: null};
  return {status: 'resolved', wordKey: alias.wordKey, slotId: alias.slotId ?? null};
}

// Absence means legacy mode, with no inferred new unlocks. Unknown versions are rejected.
export function readLessonUnlocks(settings) {
  if (settings === undefined) return {ok: true, mode: 'legacy-no-additions', additions: [], errors: []};
  if (!object(settings) || settings.version !== LEXICAL_VERSION || !Array.isArray(settings.additions))
    return {ok: false, mode: 'invalid', additions: [], errors: [{path: 'settings', code: 'unsupported-or-invalid-settings'}]};
  return {ok: true, mode: 'explicit', additions: clone(settings.additions), errors: []};
}

// Exact value agreement is mechanical evidence, not editorial approval. Conflict resolutions
// are bound to the full candidate set, so a new source value invalidates an old resolution.
export function resolveFieldOwnership({candidates, resolution}) {
  const input = clone(candidates), values = unique(input.map(c => canonical(c.value)));
  if (!input.length) return {status: 'missing', candidates: input};
  if (values.length === 1) return {status: 'agreed', value: clone(input[0].value), candidates: input};
  if (resolution && isApproved(resolution.review, resolution.revision)
    && canonical(resolution.candidates) === canonical(input) && Object.hasOwn(resolution, 'value'))
    return {status: 'resolved', value: clone(resolution.value), candidates: input};
  return {status: 'conflict', candidates: input};
}

// Read-only mapping report. There deliberately is no apply operation or schedule merge policy.
export function previewProgressMigration({content, mappings, progress}) {
  const errors = [], proposals = [], conflicts = [], byLegacy = new Map();
  for (const mapping of mappings) {
    const items = byLegacy.get(mapping.legacyWordId) ?? []; items.push(mapping); byLegacy.set(mapping.legacyWordId, items);
  }
  const words = new Map(list(content?.words).map(w => [w.wordKey, w]));
  const accepted = new Map();
  for (const [legacyWordId, items] of byLegacy) {
    const mapping = items[0], word = words.get(mapping.wordKey);
    if (!string(legacyWordId) || items.length !== 1) conflicts.push({code: 'ambiguous-mapping', legacyWordId});
    else if (!word || !isApproved(word.identityReview, word.revision) || !isApproved(mapping.review, mapping.revision)) conflicts.push({code: 'unapproved-mapping', legacyWordId});
    else if (words.has(legacyWordId) && legacyWordId !== mapping.wordKey) conflicts.push({code: 'active-identity-collision', legacyWordId});
    else accepted.set(legacyWordId, mapping.wordKey);
  }
  const groups = new Map(), unchanged = [], seen = new Set();
  for (const [i, record] of progress.entries()) {
    if (![record?.learnerId, record?.wordId, record?.cardId].every(string)) { errors.push({path: `progress[${i}]`, code: 'invalid-card-reference'}); continue; }
    const id = key(record.learnerId, record.cardId);
    if (seen.has(id)) conflicts.push({code: 'duplicate-card-reference', learnerId: record.learnerId, cardId: record.cardId});
    seen.add(id);
    // Existing destination cards participate in collisions even without a legacy mapping.
    const target = accepted.get(record.wordId) ?? (words.has(record.wordId) ? record.wordId : null);
    if (!target) { unchanged.push({learnerId: record.learnerId, cardId: record.cardId, wordId: record.wordId}); continue; }
    const groupId = key(record.learnerId, target), group = groups.get(groupId) ?? {learnerId: record.learnerId, wordKey: target, cards: []};
    group.cards.push({cardId: record.cardId, legacyWordId: record.wordId}); groups.set(groupId, group);
  }
  for (const group of groups.values()) {
    if (group.cards.length > 1) conflicts.push({code: 'multiple-schedules', ...clone(group)});
    else proposals.push({...clone(group), status: 'retain-existing-card-id-and-schedule'});
  }
  return {version: PROGRESS_PREVIEW_VERSION, mode: 'preview-only', canApply: false, errors, conflicts, proposals, unchanged,
    reverseMappings: mappings.map(m => ({legacyWordId: m.legacyWordId, wordKey: m.wordKey}))};
}
