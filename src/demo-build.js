import {createHash} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
// Only executable/demo assets define an update; documentation edits do not reset progress.
export async function demoBuildFingerprint(base=root) {
  const paths=['package-lock.json'];
  for(const directory of ['public','src']){
    for(const entry of await readdir(resolve(base,directory),{withFileTypes:true})){
      if(entry.isFile() && /\.(js|css|html|svg)$/.test(entry.name))paths.push(directory+'/'+entry.name);
    }
  }
  const files=await Promise.all(paths.sort().map(async path=>[path,(await readFile(resolve(base,path),'utf8')).replace(/\r\n/g,'\n')]));
  const hash=createHash('sha256');for(const [path,body] of files)hash.update(path+'\0'+body+'\0');
  return hash.digest('hex');
}
