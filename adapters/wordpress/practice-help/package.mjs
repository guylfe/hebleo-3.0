import fs from 'node:fs/promises';import path from 'node:path';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),out=process.argv[2];if(!out)throw Error('Supply a NEW output directory');await fs.mkdir(out);await fs.mkdir(path.join(out,'assets'));
const manifest={files:{}};
for(const [dest,src] of [['practice-help.php',path.join(here,'practice-help.php')],['assets/bootstrap.js',path.resolve(here,'../../../public/conjugation/wordpress-help.js')],...['help.js','help.css','read-only-dialog.js'].map(f=>['assets/'+f,path.resolve(here,'../../../public/conjugation',f)])]){const bytes=await fs.readFile(src);await fs.writeFile(path.join(out,dest),bytes);manifest.files[dest]=crypto.createHash('sha256').update(bytes).digest('hex');}
await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
