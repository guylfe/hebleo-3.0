import { test } from 'node:test';
import assert from 'node:assert/strict';
import { importVocabularyCSV } from '../public/content.js';
import { validateContent } from '../src/store.js';
import { seed } from '../src/seed.js';

test('CSV updates stable IDs while preserving explicit Hebrew, quoting, newlines and formatting', () => {
  const csv = '\uFEFFid,pointed,unpointed,curated,english,notes,color,bold\r\nw-mi,מִי,מי,מִי,who,"Question, word\nwith ""quotes""",#137c83,true\r\n';
  const content = importVocabularyCSV(csv, seed); validateContent(content);
  assert.equal(content.words.length, seed.words.length);
  assert.equal(content.words[1].notes, 'Question, word\nwith "quotes"');
  assert.equal(content.words[1].pointed, 'מִי');
  assert.deepEqual(content.words[1].format, { color: '#137c83', bold: true });
  assert.equal(seed.words[1].notes, 'A question word.');
});
test('CSV rejects duplicate IDs, column errors and malformed quoting; no forms are guessed', () => {
  const header = 'id,pointed,unpointed,curated,english\n';
  for (const csv of [header+'w-mi,מִי,מי,מִי,who\nw-mi,מִי,מי,מִי,who', header+'w-mi,מי,מי,who', header+'w-mi,"מִי,מי,מִי,who', 'id,pointed,english\nw-mi,מי,who']) assert.throws(() => importVocabularyCSV(csv, seed));
  const missingForm = importVocabularyCSV(header+'w-mi,מִי,מי,,who', seed);
  assert.throws(() => validateContent(missingForm), /curated/);
});
