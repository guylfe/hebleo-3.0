import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import Ajv from 'ajv';
import {validateCurriculum,validateLessonComposition,resolveComponent,orderedLessons} from '../../public/course.js';
import {validateFormatting,validateImportSource} from '../../public/vocabulary-import.js';
import { audioURL } from '../../public/ux.js';
import {hasGradingContent} from '../../public/answer-policy.js';

// Validation never coerces, strips fields, adds defaults or normalizes Hebrew.
const directory = new URL('../', import.meta.url);
const ajv = new Ajv({ allErrors: true, strict: false, validateSchema: true });
for (const file of readdirSync(directory).filter(f => f.endsWith('.schema.json'))) {
  ajv.addSchema(JSON.parse(readFileSync(new URL(file, directory), 'utf8')));
}
for (const file of readdirSync(directory).filter(f => f.endsWith('.schema.json'))) {
  ajv.getSchema('https://hebleo.invalid/contracts/' + file);
}
export function validateSchema(name, value, definition) {
  const validate = ajv.getSchema(`https://hebleo.invalid/contracts/${name}.v1.schema.json${definition ? '#/definitions/' + definition : ''}`);
  if (!validate) throw new Error(`Unknown schema: ${name}/${definition || ''}`);
  return validate(value) ? [] : validate.errors.map(e => `${e.instancePath || '/'} ${e.message}`);
}
export const canonicalJSON = value => Array.isArray(value) ? '[' + value.map(canonicalJSON).join(',') + ']' : value && typeof value === 'object' ? '{' + Object.keys(value).sort().filter(k => value[k] !== undefined).map(k => JSON.stringify(k) + ':' + canonicalJSON(value[k])).join(',') + '}' : JSON.stringify(value);
export const sha256 = value => createHash('sha256').update(typeof value === 'string' ? value : canonicalJSON(value)).digest('hex');
export const draftTokenFor = (baseRevisionId, content) => 'dt1-' + sha256({ v: 1, baseRevisionId, content });
export const collections = ['words', 'lessons', 'exercises'];
// Only the object's own approval envelope is excluded, avoiding a self-hash.
export const objectDigest = object => { const { approval, ...body } = object; return sha256(body); };
export const mediaDigest = (assetId, revision) => objectDigest({ ...revision, assetId });

export function dependenciesFor(collection, object, pack) {
  const references = new Map();
  const add = (kind, id) => { if (id) references.set(`${kind}/${id}`, { collection: kind, id }); };
  if (collection === 'words') add('words', object.baseWordId);
  if (collection === 'exercises') {
    add('words', object.wordId);
    for (const id of object.wordIds || []) add('words', id);
    // Ordering prepares distractors from the current and previous two lessons.
    if (object.type === 'ordering') {
      const index = orderedLessons(pack).findIndex(l => l.id === object.lessonId);
      for (const lesson of orderedLessons(pack).slice(Math.max(0, index - 2), index + 1)) {
        add('lessons', lesson.id);
        for (const id of lesson.wordIds) add('words', id);
      }
    }
  }
  if (collection === 'lessons') {
    for (const id of object.wordIds) add('words', id);
    for (const id of object.exerciseIds) add('exercises', id);
    for (const block of object.blocks) {
      if(object.compositionVersion===2&&block.source!=='inline'){try{for(const selected of resolveComponent(pack,object,block))add(block.source,selected.id);}catch{/* Semantic validation reports invalid selectors separately. */}}
      const selected = pack.lessons.find(l => l.id === block.selector?.lessonId);
      if (selected && selected.id !== object.id) {
        add('lessons', selected.id);
        for (const id of selected.wordIds) add('words', id);
      }
    }
  }
  return [...references.values()].sort((a, b) => `${a.collection}/${a.id}`.localeCompare(`${b.collection}/${b.id}`, 'en'));
}

export function semanticErrors(pack) {
  const errors = [], seen = new Set();
  try{validateCurriculum(pack);}catch(error){errors.push(error.message);}
  for(const lesson of pack.lessons)try{validateLessonComposition(pack,lesson);}catch(error){errors.push(error.message);}
  for(const word of pack.words)if(word.formattingVersion===1)errors.push(...validateFormatting(word.fieldFormatting,{word,sourceTheme:word.sourceTheme}).errors);
  for(const word of pack.words)if(word.importSource!==undefined)try{validateImportSource(word.importSource);}catch(error){errors.push(word.id+': '+error.message);}
  const has = (kind, id) => pack[kind].some(o => o.id === id);
  for (const kind of collections) for (const object of pack[kind]) {
    if (seen.has(`${kind}/${object.id}`)) errors.push(`duplicate ID ${kind}/${object.id}`);
    seen.add(`${kind}/${object.id}`);
    for (const dependency of dependenciesFor(kind, object, pack)) if (!has(dependency.collection, dependency.id)) errors.push(`missing dependency ${object.id} -> ${dependency.id}`);
    if (kind === 'exercises') {
      if (!has('lessons', object.lessonId)) errors.push(`missing lesson ${object.id}`);
      if (['typing','ordering','cloze','transformation'].includes(object.type)) {
        const word = pack.words.find(w => w.id === object.wordId);
        const answers = object.type === 'typing' && !Object.hasOwn(object,'answers') ? [word?.pointed,word?.unpointed] : object.answers;
        if (!Array.isArray(answers) || !answers.length || answers.some(a => !hasGradingContent(a))) errors.push(`accepted answers need grading content ${object.id}`);
      }
      if (object.prefixTokenIndices?.some(i => object.type !== 'ordering' || i >= (object.tokens?.length ?? 0))) errors.push(`invalid prefix index ${object.id}`);
    }
    if (kind === 'lessons') {
      for (const id of object.exerciseIds) if (!pack.exercises.some(e => e.id === id && (object.compositionVersion===2 || e.lessonId === object.id))) errors.push(`exercise belongs to another lesson ${id}`);
      if (object.checkExerciseIds?.some(id => !object.exerciseIds.includes(id))) errors.push(`invalid check reference ${object.id}`);
      if (object.compositionVersion!==2&&new Set(object.blocks.map(b => b.type)).size !== 3) errors.push(`invalid block families ${object.id}`);
      for (const b of object.blocks.filter(()=>object.compositionVersion!==2)) {
        if (b.type === 'explanation' && b.renderer !== 'text') errors.push(`invalid explanation renderer ${object.id}`);
        if (b.type !== 'explanation' && (!has('lessons', b.selector?.lessonId) || b.source !== (b.type === 'vocabulary' ? 'words' : 'exercises') || b.renderer !== (b.type === 'vocabulary' ? 'vocabulary-table' : 'practice'))) errors.push(`invalid selector or renderer ${object.id}`);
        if (b.type === 'exercise-set' && b.selector?.lessonId !== object.id) errors.push(`cross-lesson core practice ${object.id}`);
      }
    }
    for (const url of [object.audio, object.video].filter(Boolean)) if (!audioURL(url)) errors.push(`invalid legacy media URL ${object.id}`);
    for (const media of Object.values(object.mediaRefs || {})) {
      if (typeof media === 'string') { if (!audioURL(media)) errors.push(`invalid legacy media URL ${object.id}`); continue; }
      const asset = pack.contracts?.mediaManifest?.assets.find(a => a.assetId === media.assetId);
      const revision = asset?.revisions.find(r => r.revisionId === media.revisionId);
      if (!revision || revision.sha256 !== media.sha256) errors.push(`unresolved media pin ${object.id}/${media.assetId}/${media.revisionId}`);
    }
  }
  const sourceMap = pack.contracts?.sourceMap;
  if (sourceMap) {
    const sourceIds = new Set(), entries = new Set(), objects = new Set(), locators = new Set();
    for (const source of sourceMap.sources) {
      if (sourceIds.has(source.sourceId)) errors.push(`duplicate source ${source.sourceId}`);
      sourceIds.add(source.sourceId);
    }
    for (const entry of sourceMap.entries) {
      if (entries.has(entry.entryId)) errors.push(`duplicate entry ${entry.entryId}`);
      entries.add(entry.entryId);
      if (!sourceIds.has(entry.sourceId)) errors.push(`missing source ${entry.sourceId}`);
      if (entry.status === 'active') {
        const locatorKey = `${entry.sourceId}/${canonicalJSON(entry.locator)}`;
        if (locators.has(locatorKey)) errors.push(`ambiguous frozen locator ${entry.entryId}`);
        locators.add(locatorKey);
        if (!has(entry.object.collection, entry.object.id)) errors.push(`missing mapped object ${entry.object.id}`);
        const key = `${entry.sourceId}/${entry.object.collection}/${entry.object.id}`;
        if (objects.has(key)) errors.push(`ambiguous source mapping ${key}`);
        objects.add(key);
      }
    }
  }
  const assets = new Set();
  for (const asset of pack.contracts?.mediaManifest?.assets || []) {
    if (assets.has(asset.assetId)) errors.push(`duplicate asset ${asset.assetId}`);
    assets.add(asset.assetId);
    const revisions = new Set();
    for (const revision of asset.revisions) {
      if (revisions.has(revision.revisionId)) errors.push(`duplicate media revision ${asset.assetId}/${revision.revisionId}`);
      revisions.add(revision.revisionId);
      if (!audioURL(revision.url)) errors.push(`invalid media URL ${asset.assetId}`);
    }
  }
  return errors;
}

// A review aid for Lead's future runtime gate. This result is never authorization.
export function publicationEligibility(pack, { mode = 'canonical' } = {}) {
  const structural = validateSchema('content-pack', pack);
  if (structural.length) return { eligible: false, mode, reasons: structural };
  const reasons = semanticErrors(pack);
  if (!['canonical', 'private-demo'].includes(mode)) throw new Error('Unknown publication mode');
  const syntheticPack = pack.provenance.kind === 'synthetic-demo';
  if (!['synthetic-demo', 'verified-source'].includes(pack.provenance.kind)) reasons.push('pack provenance is publication-ineligible');
  if (mode === 'canonical' && syntheticPack) reasons.push('synthetic pack is not canonical');
  if (pack.provenance.approval && pack.provenance.approval !== 'approved') reasons.push('pack approval is not approved');
  if (pack.approval && pack.approval.status !== 'approved' && !(mode === 'private-demo' && syntheticPack && pack.approval.status === 'not-applicable')) reasons.push('pack approval is not approved');
  for (const kind of collections) for (const object of pack[kind]) {
    const key = `${kind}/${object.id}`, provenance = object.provenance, approval = object.approval;
    // A synthetic object's explicit field veto must not be bypassed.
    for (const [field, record] of Object.entries(provenance?.fields || {})) {
      if (record.approval && record.approval !== 'approved' || record.status && ['pending', 'rejected'].includes(record.status)) reasons.push(`${key}/${field}: field approval is pending or rejected`);
    }
    // Backward compatibility is bounded to synthetic data with no contrary record.
    if (mode === 'private-demo' && syntheticPack && (!provenance || provenance.kind === 'synthetic-demo') && !provenance?.approval && (!approval || approval.status === 'not-applicable')) continue;
    if (!provenance || !['verified-source', 'human-authored'].includes(provenance.kind)) reasons.push(`${key}: missing canonical provenance`);
    if (provenance?.approval && provenance.approval !== 'approved') reasons.push(`${key}: provenance approval is ${provenance.approval}`);
    if (approval?.status !== 'approved' || validateSchema('common', approval, 'approval').length) { reasons.push(`${key}: complete object approval required`); continue; }
    if (approval.contentSha256 !== objectDigest(object)) reasons.push(`${key}: approval digest changed`);
    if (!Number.isFinite(Date.parse(approval.reviewedAt))) reasons.push(`${key}: invalid review date`);
    const expected = dependenciesFor(kind, object, pack), listed = new Map(approval.dependencies.map(d => [`${d.collection}/${d.id}`, d]));
    if (listed.size !== approval.dependencies.length || listed.size !== expected.length) reasons.push(`${key}: approval dependency set differs`);
    for (const reference of expected) {
      const target = pack[reference.collection].find(o => o.id === reference.id);
      if (!target || listed.get(`${reference.collection}/${reference.id}`)?.sha256 !== objectDigest(target)) reasons.push(`${key}: dependency approval changed ${reference.id}`);
    }
    if (mode === 'canonical' && ([object.audio, object.video, ...Object.values(object.mediaRefs || {})].some(ref => typeof ref === 'string' && ref || ref?.url && !ref.assetId))) reasons.push(`${key}: legacy media is unpinned`);
  }
  // Media approval binds immutable revision bytes and metadata, excluding itself.
  for (const asset of pack.contracts?.mediaManifest?.assets || []) for (const revision of asset.revisions) {
    if (mode === 'private-demo' && syntheticPack && revision.provenance.kind === 'synthetic-demo' && revision.approval.status === 'not-applicable') continue;
    if (!['verified-source', 'human-authored'].includes(revision.provenance.kind) || revision.approval.status !== 'approved' || revision.approval.contentSha256 !== mediaDigest(asset.assetId, revision) || !Number.isFinite(Date.parse(revision.approval.reviewedAt)) || validateSchema('common', revision.approval, 'approval').length || revision.provenance.approval && revision.provenance.approval !== 'approved' || revision.approval.dependencies?.length) reasons.push(`media/${asset.assetId}/${revision.revisionId}: approval required or changed`);
  }
  return { eligible: reasons.length === 0, mode, reasons };
}

// A locator is sufficient only inside the unchanged, frozen source snapshot.
// On another snapshot even an exact unique row hash is only a review candidate.
export function resolveSourceIdentity(map, row) {
  const source = map.sources.find(s => s.sourceId === row.sourceId);
  if (!source) return { status: 'unresolved', candidates: [] };
  const entries = map.entries.filter(e => e.sourceId === row.sourceId && e.status === 'active');
  if (row.entryId) {
    const matches = entries.filter(e => e.entryId === row.entryId);
    return matches.length === 1 ? { status: 'explicit-id', object: matches[0].object } : { status: 'conflict', candidates: [] };
  }
  const candidates = entries.filter(e => e.rowSha256 === row.rowSha256);
  if (source.snapshotSha256 === row.snapshotSha256) {
    const exact = candidates.filter(e => canonicalJSON(e.locator) === canonicalJSON(row.locator));
    if (exact.length === 1) return { status: 'frozen-snapshot', object: exact[0].object };
  }
  return { status: 'review-required', candidates: candidates.map(e => e.entryId) };
}

// Read-only three-way merge experiment; no importer uses this helper yet.
export function mergeSourceField({ base, source, studio, owner }) {
  if (source === undefined) return { status: 'omitted-retained', value: studio };
  const equal = (a, b) => canonicalJSON(a) === canonicalJSON(b);
  if (equal(source, studio)) return { status: 'unchanged', value: studio };
  if (owner === 'studio') return { status: 'studio-owned', value: studio };
  if (owner !== 'source') return { status: 'conflict' };
  if (equal(source, base)) return { status: 'studio-edit-retained', value: studio };
  if (!equal(studio, base)) return { status: 'conflict' };
  return { status: 'source-change', value: source };
}
