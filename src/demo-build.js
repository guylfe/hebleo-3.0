import {createHash} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
// Every served/executable asset under public and src, at any depth (Studio and preview live in subfolders).
// Paths are '/'-joined and relative to the checkout, so the list is the same on every platform.
async function executableFiles(base,directory){
  const paths=[];
  for(const entry of await readdir(resolve(base,directory),{withFileTypes:true})){
    const path=directory+'/'+entry.name;
    if(entry.isDirectory())paths.push(...await executableFiles(base,path));
    else if(entry.isFile() && (/\.(js|mjs|css|html|svg)$/.test(entry.name) || path==='src/shared-card-adapter/approved-templates.json'))paths.push(path);
  }
  return paths;
}
export async function demoBuildFiles(base=root){
  const paths=['package-lock.json'];
  for(const directory of ['public','src'])paths.push(...await executableFiles(base,directory));
  return paths.sort();
}
// Only executable/demo assets define an update; documentation and mutable data (docs/, data/, uploads/) never reset progress.
export async function demoBuildFingerprint(base=root) {
  const files=await Promise.all((await demoBuildFiles(base)).map(async path=>[path,(await readFile(resolve(base,path),'utf8')).replace(/\r\n/g,'\n')]));
  const hash=createHash('sha256');for(const [path,body] of files)hash.update(path+'\0'+body+'\0');
  return hash.digest('hex');
}
