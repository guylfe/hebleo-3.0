import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
export const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export const baselineSha256='96a04404eddd6fa535af66f8d449fedded7e71e34cdd81e8b0fa074ad6546eb3';
export function generate(source){
 if(sha(source)!==baselineSha256)throw Error('Unreviewed archive baseline');
 let s=source.toString();
 const newline=s.includes('\r\n')?'\r\n':'\n';
 function once(from,to){if(s.split(from).length!==2)throw Error('Archive display anchor changed');s=s.replace(from,to);}
 const count='<div class="stat-number">${newLimited}${deck.new_cards > newLimited ? `+${deck.new_cards - newLimited}` : ""}</div>';
 const original='<div class="stat-item">'+newline+'                                        '+count+newline+'                                        <div class="stat-label">New</div>'+newline+'                                    </div>';
 const changed='<div class="new-stat">'+newline+'                                      <div class="stat-item">'+newline+'                                        <div class="stat-number">${newLimited}</div>'+newline+'                                        <div class="stat-label">New</div>'+newline+'                                      </div>'+newline+'                                      <small class="new-total">Total remaining: ${deck.new_cards}</small>'+newline+'                                    </div>';
 once(original,changed);
 once('</style>',readFileSync(resolve(here,'new-count.css'),'utf8').replace(/\r?\n/g,newline)+newline+'</style>');
 return s;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const [input,out]=process.argv.slice(2);if(!input||!out)throw Error('Usage: node generate.mjs INSTALLED_ARCHIVE OUTPUT_DIRECTORY');
 mkdirSync(out,{recursive:true});const before=readFileSync(input),after=generate(before);
 writeFileSync(resolve(out,'archive-decks.php'),after);
 writeFileSync(resolve(out,'manifest.json'),JSON.stringify({before:sha(before),after:sha(after)},null,2)+'\n');
}
