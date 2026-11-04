import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const here=dirname(fileURLToPath(import.meta.url));
export const sha=s=>createHash('sha256').update(s).digest('hex');
export function generate(source,expected){
 if(expected!=='30836c7b498cdd3bb72cab63f0fea3087cfae51de07b593408b137c039a9200f'||sha(source)!==expected)throw Error('Unreviewed archive baseline');
 let s=source.toString();
 function once(from,to){if(s.split(from).length!==2)throw Error('Archive anchor changed: '+from);s=s.replace(from,to);}
 once('</style>',readFileSync(resolve(here,'study.css'),'utf8')+'\n</style>');
 once('<span style="color: #666; font-size: 14px;">Rate your recall:</span>','');
 once('document.getElementById("card-actions").innerHTML = html;',`const counts = document.querySelector('.card-type-indicator');
        document.getElementById("card-actions").innerHTML = html;
        if (counts) document.getElementById("card-actions").append(counts);
        document.querySelector('.rating-btn')?.focus();`);
 const rateStart=s.indexOf('    async rateCard(rating) {'),rateEnd=s.indexOf('    async suspendCard() {');
 if(rateStart<0||rateEnd<=rateStart)throw Error('Rating method anchors changed');
 once(s.slice(rateStart,rateEnd),readFileSync(resolve(here,'rate-method.txt'),'utf8')+'\n');
 once('    async suspendCard() {','    async suspendCard() {\n        if (this.ratingPending || this.ratingFinished?.has(this.currentCard)) return;');
 once('    showDecks() {','    showDecks() {\n        if (this.ratingPending) return;');
 once('    async startStudy(deckId) {','    async startStudy(deckId) {\n        if (this.ratingPending) return;');
 return s;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const [baseline,out,expected]=process.argv.slice(2);if(!baseline||!out||!expected)throw Error('Usage: node generate.mjs BASELINE_DIRECTORY OUTPUT_DIRECTORY REVIEWED_ARCHIVE_SHA256');
 if(resolve(baseline)===resolve(out))throw Error('Output must be isolated');
 const source=readFileSync(resolve(baseline,'archive-decks.php'));const output=generate(source,expected);
 mkdirSync(out,{recursive:true});writeFileSync(resolve(out,'archive-decks.php'),output);
 writeFileSync(resolve(out,'layout-manifest.json'),JSON.stringify({baseline:sha(source),output:sha(output)},null,2)+'\n');
}
