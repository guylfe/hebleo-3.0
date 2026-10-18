import fs from 'node:fs';
import path from 'node:path';
import {WORKBOOK_CAPTURE_VERSION,adaptConsolidatedWorkbook} from '../src/lexical-adapter.js';
// Repackage explicitly supplied immutable source artifacts. No online access or
// writeback. The filename says capture; native freshness still needs verification.
const [sourceRoot,destination]=process.argv.slice(2);
if(!sourceRoot||!destination)throw new Error('Usage: node scripts/capture-lexical-workbook.mjs <supplied UX root> <output.json>');
const base=path.join(sourceRoot,'vocabulary-lexeme-rebuild-20261018'),read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const capture={version:WORKBOOK_CAPTURE_VERSION,spreadsheetId:'1cjOThnbD3j0D7YmFr9c7zqLK8AFfd2rL_e_NHeyhnAw',plan:read(path.join(base,'CONSOLIDATED_WORKBOOK_PLAN.json')),bindings:read(path.join(base,'linguistic-handoff/SUPPLIED_BINDINGS.json')),sourceRecords:read(path.join(sourceRoot,'vocabulary-source-structure-20261017/SOURCE_RECORD_VALUES.json')),styles:read(path.join(base,'SOURCE_FORM_STYLES.json')),related:read(path.join(base,'EXISTING_RELATED_CELLS.json'))};
const old=read(path.join(sourceRoot,'vocabulary-source-structure-20261017/WIDE_PARADIGMS_MODEL.json'));
capture.sharedScopes=old.sheets.flatMap(s=>s.rows).flatMap(row=>(row.shared||[]).map(evidence=>{const m=/^(.+) = (.+) \(same authored form\)$/.exec(evidence);if(!m)throw new Error('Unknown explicit shared scope: '+evidence);return {wordKey:capture.plan.retiredAliases.find(a=>a.key===row.key)?.target,slotIds:[m[1],m[2]].map(slot=>'verb.'+slot),evidence,sourceKey:row.key};}));
const result=adaptConsolidatedWorkbook(capture);
if(fs.existsSync(destination))throw new Error('Refusing to overwrite an existing capture.');
fs.writeFileSync(destination,JSON.stringify(capture));console.log(JSON.stringify(result.preview,null,2));
