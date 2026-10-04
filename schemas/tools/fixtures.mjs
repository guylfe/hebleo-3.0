import { seed } from '../../src/seed.js';
import { objectDigest, sha256 } from './contracts.mjs';

// Existing synthetic seed only. No source candidate or canonical forms are edited.
export function syntheticPack() {
  const pack = structuredClone(seed);
  pack.provenance = { kind: 'synthetic-demo', label: 'CONTRACT TEST ONLY; no approved teaching or recorded media' };
  const word = pack.words[0];
  word.provenance = { kind: 'synthetic-demo', sourceId: 'fixture-source' };
  word.approval = { version: 1, status: 'not-applicable', reason: 'Synthetic contract example' };
  word.sourceFields = { No_Card: 'UNMAPPED', No_Vocab: 'UNMAPPED', unknownColumn: 'preserve verbatim' };
  word.fieldFormatting = { pointed: { formattedValue: word.pointed, textFormatRuns: [{ startIndex: 0, format: { bold: true, foregroundColorStyle: { themeColor: 'ACCENT1' } } }] } };
  word.sourceTheme = [{ colorType: 'ACCENT1', color: { rgbColor: { red: 0, green: 0.5, blue: 0.5 } } }];
  word.unknownNested = { retained: ['raw', { noInterpretation: true }] };
  const bytes = 'Synthetic media metadata fixture; NO AUDIO BYTES PROVIDED';
  word.mediaRefs = { nativeAudio: { assetId: 'fixture-audio', revisionId: 'rev-1', sha256: sha256(bytes) }, legacy: 'https://example.invalid/unpinned.mp3' };
  pack.contracts = {
    version: 1,
    sourceMap: {
      version: 1,
      sources: [{ sourceId: 'fixture-source', kind: 'fixture', snapshotSha256: sha256('frozen fixture'), locator: { file: 'synthetic only' }, formatting: 'captured' }],
      entries: [{ entryId: 'entry-fixed-1', sourceId: 'fixture-source', object: { collection: 'words', id: word.id }, locator: { rowAtCapture: 1 }, rowSha256: sha256('synthetic row'), fieldMap: { Hebrew: 'pointed', No_Card: 'sourceFields.No_Card' }, ownership: { pointed: 'source', No_Card: 'unresolved' }, baselineSha256: objectDigest(word), status: 'active' }]
    },
    mediaManifest: { version: 1, assets: [{ assetId: 'fixture-audio', kind: 'audio', revisions: [{ revisionId: 'rev-1', sha256: sha256(bytes), byteLength: Buffer.byteLength(bytes), mimeType: 'audio/mpeg', url: '/media/fixture-unavailable.mp3', provenance: { kind: 'synthetic-demo', label: 'Metadata fixture; recording absent' }, approval: { version: 1, status: 'not-applicable', reason: 'Synthetic fixture only' } }] }] }
  };
  return pack;
}
