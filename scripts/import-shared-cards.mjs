// Explicit operator-only import into a named candidate database. Never starts or resets the demo.
import {readFileSync,lstatSync,mkdirSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {Store} from '../src/store.js';
const [directory,database]=process.argv.slice(2);if(!directory||!database)throw Error('Usage: node scripts/import-shared-cards.mjs SOURCE_DIRECTORY CANDIDATE_DATABASE');
const json=name=>JSON.parse(readFileSync(join(directory,name),'utf8'));
const raw=json('vocabulary.json'),manifest=json('media-manifest.json');
const blobs=manifest.map(item=>{
 if(!/^[a-zA-Z0-9_-]+\.(mp3|png)$/.test(item.file))throw Error('Unsafe media path');
 const path=join(directory,'media',item.file);if(!lstatSync(path).isFile())throw Error('Media must be a regular file');
 const bytes=readFileSync(path),sha256=createHash('sha256').update(bytes).digest('hex');
 if(bytes.length!==item.bytes||sha256!==item.sha256)throw Error('Media hash mismatch: '+item.file);
 return {sha256,mimeType:item.file.endsWith('.mp3')?'audio/mpeg':'image/png',byteLength:bytes.length,dataBase64:bytes.toString('base64')};
});
mkdirSync(dirname(database),{recursive:true});
const store=new Store(database);
try{console.log(JSON.stringify(store.shared.importPackage('author-demo',{raw,manifest,blobs,expectedRevision:store.shared.state()?.revision??null})));}finally{store.close();}
