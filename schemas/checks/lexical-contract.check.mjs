import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import Ajv from 'ajv';
import {LEXICAL_VERSION, SOURCE_SCHEMA_VERSION, SLOT_IDS, slotsForCategory, validateLexicalContent} from '../../public/lexical-contract.js';
const schema = JSON.parse(readFileSync(new URL('../lexical-content.v1.schema.json', import.meta.url)));
const validate = new Ajv({allErrors: true, strict: true}).compile(schema);
const pending = {status: 'pending'};
const fixture = () => ({version: LEXICAL_VERSION, sourceSchemaVersion: SOURCE_SCHEMA_VERSION, words: [{wordKey: 'synthetic-verb', category: 'verb', revision: '1',
  identityReview: pending, fieldConflicts: [], classMemberships: [], forms: slotsForCategory('verb').map(slotId => ({slotId, status: 'missing', variants: []}))}],
  classes: [], introductions: [], unlocks: [], aliases: [], usages: [], examples: []});
test('lexical JSON schema compiles strictly and matches exact runtime slot enumeration', () => {
  assert.deepEqual(schema.definitions.form.properties.slotId.enum, SLOT_IDS);
  const content = fixture(); assert.equal(validate(content), true, JSON.stringify(validate.errors));
  assert.equal(validateLexicalContent(content).ok, true);
});
test('author schema retains metadata while refusing malformed structure and unsupported versions', () => {
  const content = fixture(); content.words[0].rawSource = {exact: 'preserve'};
  assert.equal(validate(content), true);
  content.words[0].forms[0].slotId = 'verb.unknown'; assert.equal(validate(content), false);
  content.words[0].forms[0].slotId = SLOT_IDS[0]; content.version = 'v2'; assert.equal(validate(content), false);
});
test('semantic validator adds complete inventories and scoped references after structure', () => {
  const content = fixture(); content.words[0].forms.pop();
  assert.equal(validate(content), true); assert.equal(validateLexicalContent(content).ok, false);
});
