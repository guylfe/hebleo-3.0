// Scoped corrections requested by Guy, 2026-11-11. Imported source stays intact.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const mapping=JSON.parse(readFileSync(new URL('./recordings/manifest.json',import.meta.url)));
export const correctionMedia=mapping.map(({file,sha256,bytes})=>({file,sha256,bytes}));
export function correctNote(note){
 const result=structuredClone(note),f=result.fields;
 const m=mapping.find(m=>m.sourceId===note.id&&m.hebrew===f.Hebrew&&m.pointed===f.HebrewNikkud&&m.english===f.English);
 if(m&&f.Audio==='')f.Audio='[sound:'+m.file+']';
 if(note.id==='mf-000035'&&f.Hebrew==='גן'&&f.English==='Garden')f.Notes=f.Notes.replace('This is the word for a single male fish.','This is the word for a garden.');
 return result;
}
export function correctionBlob(file){
 const m=mapping.find(m=>m.file===file);if(!m)return null;
 const bytes=readFileSync(new URL('./recordings/'+file,import.meta.url));
 if(bytes.length!==m.bytes||createHash('sha256').update(bytes).digest('hex')!==m.sha256)throw Error('Pronoun recording checksum mismatch');
 return {bytes,byteLength:bytes.length,mimeType:'audio/mpeg',sha256:m.sha256};
}
