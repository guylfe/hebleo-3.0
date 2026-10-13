import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
// Guy deferred audio-speed work/testing in every phase. Keep all other repo
// checks, and print the exact exclusions so this is never a full-suite claim.
const excludedFile=/audio/i;
const files=readdirSync('test').filter(name=>name.endsWith('.test.js')&&!excludedFile.test(name)).sort().map(name=>'test/'+name);
const skipPattern='[Aa]udio|[Ss]peed|[Pp]layback';
console.log('Candidate tests: '+files.length+' files; audio filenames excluded; skip names '+skipPattern);
const result=spawnSync(process.execPath,['--test','--test-skip-pattern='+skipPattern,...files],{stdio:'inherit'});
if(result.error)throw result.error;
process.exit(result.status??1);
