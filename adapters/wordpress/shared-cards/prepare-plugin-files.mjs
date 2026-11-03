// Build ONLY the already-inspected, hash-pinned targeted plugin changes.
// This never exports a whole plugin or writes the source/deployed directory.
import {readFile,writeFile,mkdir,realpath,copyFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {resolve,relative,isAbsolute,join} from 'node:path';
import {createHash} from 'node:crypto';
const [sourceArg,outputArg]=process.argv.slice(2);if(!sourceArg||!outputArg)throw Error('Usage: node prepare-plugin-files.mjs APPROVED_ORIGINAL_PLUGIN PRIVATE_FRESH_STAGE');
const source=await realpath(sourceArg),output=resolve(outputArg),inside=relative(source,output);if(!inside||(!inside.startsWith('..')&&!isAbsolute(inside))||existsSync(output))throw Error('Use a fresh stage outside the source plugin');
const sha=s=>createHash('sha256').update(s).digest('hex');
const expected={'wp-learning-cards.php':'073f2f8fb9c930c5dcb1b28f418690d6eab91f47d7637d367de8ebd89fb277f9','templates/card_loader.php':'e0d7eb4d6fb25de604cd2a920970d86073177e7f9c26d4e2a9caf97ab32f67ff','includes/cards.php':'c984c9c684d9382569f54568cdae237393966c40949a6685472839f1da86aada'};
const originals={};for(const [file,hash] of Object.entries(expected)){const bytes=await readFile(join(source,file));if(sha(bytes)!==hash)throw Error('Stale original: '+file);originals[file]=bytes.toString('utf8');}
const once=(s,needle,replacement,count)=>{if(s.split(needle).length-1!==count)throw Error('Unexpected targeted hook location');return s.split(needle).join(replacement);};
let loader=once(originals['templates/card_loader.php'],"    return [\n        'note_id' => $progress->note_id,","    return apply_filters('hebleo_shared_study_card', [\n        'note_id' => $progress->note_id,",1);
loader=once(loader,"'intervals' => $intervals\n    ];","'intervals' => $intervals\n    ], $progress);",1);
const anchor="    $back_content = preg_replace('/\\{\\{[^}]+\\}\\}/', '', $back_content);";
const add="\n    $shared_faces = apply_filters('hebleo_shared_study_card', ['front'=>$front_content,'back'=>$back_content], (object)['note_id'=>(int)$note_id,'template_id'=>(int)$template->ID]);\n    $front_content=$shared_faces['front'];$back_content=$shared_faces['back'];";
const cards=once(originals['includes/cards.php'],anchor,anchor+add,2);
if(sha(loader)!=='803bfbc4c2c1f07f1090c20ef671a6750bbf58f098dd3362a48d7ee04d163a8e'||sha(cards)!=='641630e3af745b86bd2d95c93386e1126487d32d08c25e5a7b814d76cfafc922')throw Error('Generated candidate differs from independently reviewed bytes');
await mkdir(output,{recursive:true});await writeFile(join(output,'card_loader.candidate.php'),loader,{flag:'wx'});await writeFile(join(output,'cards.candidate.php'),cards,{flag:'wx'});
for(const file of ['shared-cards.php','release.php','release-recovery.php','frame-bridge.php','frame-child.js','frame-host.js'])await copyFile(new URL('./'+file,import.meta.url),join(output,file));
console.log(JSON.stringify({generated:2,reviewedHashesMatch:true,stage:output,installed:false}));
