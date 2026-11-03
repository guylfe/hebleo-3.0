import {build} from 'esbuild';
import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
await build({absWorkingDir:process.cwd(),tsconfigRaw:{},entryPoints:['scripts/editor-vendor-entry.js'],bundle:true,format:'esm',platform:'browser',target:['es2022'],outfile:'public/author/vendor/prosemirror.js',minify:true,legalComments:'eof'});
const names=['prosemirror-model','prosemirror-transform','prosemirror-state','prosemirror-view','prosemirror-commands','prosemirror-history','prosemirror-keymap','prosemirror-inputrules','prosemirror-schema-basic','prosemirror-schema-list','prosemirror-tables','prosemirror-markdown','parse5','orderedmap','rope-sequence','w3c-keyname','markdown-it','entities','linkify-it','mdurl','punycode.js','uc.micro','jodit'];
let notice='Locally bundled editor dependencies. Exact versions are pinned in package-lock.json.\n\n';
for(const name of names){const dir=new URL('node_modules/'+name+'/',root),pkg=JSON.parse(await readFile(new URL('package.json',dir),'utf8'));let license='';for(const file of ['LICENSE','LICENSE.md','LICENSE.txt','LICENSE-MIT.txt']){try{license=await readFile(new URL(file,dir),'utf8');break;}catch{}}if(!license)throw Error('Missing license: '+name);notice+=`${name} ${pkg.version} (${pkg.license})\n${license}\n\n`;}
await writeFile(new URL('public/author/vendor/LICENSES.txt',root),notice);

for(const file of ['jodit.min.js','jodit.min.css'])await writeFile(new URL('public/author/vendor/'+file,root),await readFile(new URL('node_modules/jodit/es2021/'+file,root)));
