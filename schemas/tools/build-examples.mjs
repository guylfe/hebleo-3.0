import { mkdirSync, writeFileSync } from 'node:fs';
import { syntheticPack } from './fixtures.mjs';
import { draftTokenFor } from './contracts.mjs';
const folder = new URL('../examples/', import.meta.url);
mkdirSync(folder, { recursive: true });
const pack = syntheticPack(), draftToken = draftTokenFor(1, pack);
const write = (name, value) => writeFileSync(new URL(name + '.json', folder), JSON.stringify(value, null, 2) + '\n');
write('synthetic-content', pack);
write('synthetic-wire', {
  label: 'SYNTHETIC WIRE EXAMPLES ONLY; use each named studio-wire definition',
  stageRequest: { baseRevisionId: 1, expectedDraftToken: null, content: pack },
  noDraftResponse: { draft: null, changes: [], affectedLessons: [] },
  previewSessionRequest: { lessonId: pack.lessons[0].id, draftToken },
  previewEvaluateRequest: { lessonId: pack.lessons[0].id, exerciseId: pack.lessons[0].exerciseIds[0], draftToken, answer: 'Synthetic wrong answer' },
  publishRequest: { baseRevisionId: 1, draftToken },
  rollbackRequest: { revisionId: 1, baseRevisionId: 2, expectedDraftToken: null },
  errorResponse: { error: 'Draft changed elsewhere — reload', code: 'DRAFT_CONFLICT', current: { draftToken, activeRevisionId: 1 } }
});
console.log('Wrote two explicitly synthetic examples; no media or source candidate generated.');
