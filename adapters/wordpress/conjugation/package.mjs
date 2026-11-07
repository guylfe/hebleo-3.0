import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {validateCatalog} from '../../../public/conjugation/engine.js';
import {privateCatalogPHP} from './private-catalog.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(here,'../../..');
const [catalogPath,output]=process.argv.slice(2);
if(!catalogPath||!output)throw Error('Usage: node package.mjs approved-catalog.json NEW-output-directory');
const catalog=validateCatalog(JSON.parse(await fs.readFile(catalogPath,'utf8')));
if(catalog.forms.some(f=>f.approval==='fixture'))throw Error('Fixture catalog cannot be packaged');
const production={...catalog,forms:catalog.forms.filter(f=>f.approval==='approved')};
const out=path.resolve(output);await fs.mkdir(out);await fs.mkdir(path.join(out,'assets'));
const files=[['conjugation.php',path.join(here,'conjugation.php')],['assets/bootstrap.js',path.join(here,'bootstrap.js')],...['catalog-contract.js','engine.js','view.js','practice.css'].map(f=>['assets/'+f,path.join(repo,'public/conjugation',f)])];
const manifest={schema:2,approvedForms:production.forms.length,forbiddenFiles:['assets/catalog.json'],files:{}};
for(const [dest,src] of files){const bytes=await fs.readFile(src);await fs.writeFile(path.join(out,dest),bytes);manifest.files[dest]=crypto.createHash('sha256').update(bytes).digest('hex');}
const bytes=privateCatalogPHP(production);await fs.writeFile(path.join(out,'catalog-data.php'),bytes);manifest.files['catalog-data.php']=crypto.createHash('sha256').update(bytes).digest('hex');
await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify(manifest,null,2));
