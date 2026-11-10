import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
export const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
export const archiveBaseline='d469dbe9dfa9a8fda66d7105e8cc6fc2285304738bc431c7fa3e1f15490d2d8b';
export function updateArchive(bytes){
 if(sha(bytes)!==archiveBaseline)throw Error('Deck Settings archive baseline changed');
 let s=bytes.toString('utf8');
 for(const[from,to]of [
  ['["rate_card","hebleo_review_status"].includes(action)','["rate_card","hebleo_review_status","get_deck_settings"].includes(action)'],
  ['Autoplay audio on card appear','Play audio automatically when a card appears']
 ]){if(s.split(from).length!==2)throw Error('Deck Settings anchor changed');s=s.replace(from,to);}
 return s;
}
if(process.argv[1]&&path.basename(process.argv[1])==='generate.mjs'){
 const[input,output]=process.argv.slice(2);if(!input||!output)throw Error('Supply installed archive and new output file');
 fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,updateArchive(fs.readFileSync(input)));
}
