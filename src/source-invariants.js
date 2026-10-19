import {fail, safeID, sha256} from './source-utils.js';
import {validateMapping} from './source-mapping.js';
import {projectLesson} from '../public/course.js';

const strings = new Set(['pointed','unpointed','curated','english','notes','root','pattern','gender','plural','feminine','pluralFeminine','infinitive','partOfSpeech','audio','introducedLesson','part']);
const hashPattern = /^[a-f0-9]{64}$/;

// Each source has independent baselines, but a canonical field and an actual
// lesson/component pair can have only one source owner at a time.
export function validateSourceOwnership(sources) {
  const entries = new Set(), fields = new Map(), components = new Map();
  const claim = (owners, key, sourceId, message) => {
    const previous = owners.get(key);
    if (previous && previous !== sourceId) fail('SOURCE_OWNERSHIP_CONFLICT', message, {
      sourceId, conflictingSourceId: previous,
      nextAction: 'Explicitly release the previous source mapping or identity, Stage that change, then review the new owner.'
    });
    owners.set(key, sourceId);
  };
  for (const [sourceId, source] of Object.entries(sources)) {
    if (!Array.isArray(source.identity) || !Array.isArray(source.mapping?.columns) || !Array.isArray(source.mapping?.membership?.sets)) fail('SOURCE_IDENTITY_INVALID', 'Malformed source mapping or identity history.');
    const objects = new Set(), rows = new Set();
    for (const entry of source.identity) {
      if (!entry || !safeID(entry.entryId) || entries.has(entry.entryId) || !Number.isInteger(entry.rowIndex) || entry.rowIndex < 1 || rows.has(entry.rowIndex) || !hashPattern.test(entry.rowSha256) || (entry.ignored === true ? entry.objectId !== undefined : !safeID(entry.objectId)) || entry.objectId !== undefined && objects.has(entry.objectId)) fail('SOURCE_IDENTITY_INVALID', 'Source entries, row locators and canonical objects must have unique stable identities.', {sourceId});
      entries.add(entry.entryId); rows.add(entry.rowIndex);
      if (!entry.objectId) continue;
      objects.add(entry.objectId);
      const owned = new Set(source.mapping.columns.filter(c => c.owner === 'source' && c.target !== 'sourceForm').map(c => c.target));
      // The installed vocabulary renderer stores formatting/theme per word.
      // These automatically mapped fields also require a single explicit owner.
      if (source.mapping.columns.some(c => c.owner === 'source' && strings.has(c.target))) {
        if (!source.mapping.columns.some(c => c.target === 'fieldFormatting')) owned.add('fieldFormatting');
        if (!source.mapping.columns.some(c => c.target === 'sourceTheme')) owned.add('sourceTheme');
      }
      for (const target of owned) claim(fields, sha256([entry.objectId, target]), sourceId, 'Competing sources own ' + entry.objectId + '.' + target + '.');
    }
    for (const set of source.mapping.membership.sets) for (const id of set.componentIds || []) claim(components, sha256([set.lessonId, id]), sourceId, 'Competing sources own vocabulary component ' + set.lessonId + '/' + id + '.');
  }
}

export function registrationForCapture(registration, capture) {
  return {...registration, extent: capture.extent, gridExtent: capture.gridExtent, headers: capture.headers, headerSha256: sha256(capture.headers)};
}

export function validateSourceTargets(sources, content, captures = {}) {
  if (!content) fail('SOURCE_TARGETS_INVALID', 'Source state requires its actual carried author content.');
  for (const source of Object.values(sources)) {
    let registration = source.registration;
    // Re-registering a changed schema preserves the earlier mapping/baseline
    // until a new explicit Review replaces it. Its old header anchor travels.
    if (source.mapping.columns.some(c => c.header !== registration.headers[c.columnIndex])) {
      const capture = captures[source.baseline?.captureSha256];
      if (!capture) fail('MAPPING_INVALID', 'The prior mapping schema has no retained capture.');
      registration = registrationForCapture(registration, capture);
    }
    validateMapping(source.mapping, registration, content);
    for (const entry of source.identity) if (entry.objectId && !content.words.some(w => w.id === entry.objectId)) fail('SOURCE_TARGETS_INVALID', 'Source identity points to an absent canonical word.');
    for (const set of source.mapping.membership.sets) {
      const lesson = content.lessons.find(l => l.id === set.lessonId);
      for (const id of set.componentIds) {
        const block = projectLesson(content, lesson).blocks.find(b => b.id === id);
        if (block.sourceMembership && (block.sourceMembership.sourceId !== source.registration.sourceId || block.sourceMembership.membershipSetId !== set.membershipSetId)) fail('SOURCE_OWNERSHIP_CONFLICT', 'Vocabulary component binding contradicts its source membership owner.');
      }
    }
  }
  validateSourceOwnership(sources);
}
