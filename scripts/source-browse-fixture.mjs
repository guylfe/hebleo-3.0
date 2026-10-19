import {sourceBrowseDigest} from '../src/source-vocabulary.js';
// Nonlinguistic synthetic test fixture. Never installed in the authored library.
export function sourceBrowseFixture(){
 const rows=Array.from({length:61},(_,i)=>({wordKey:'test-source-'+i,category:i===60?'Other':'Nouns',available:true,sourceBrowse:true,hebrew:'TEST SOURCE '+i,english:'Exact test meaning '+i,notes:'Source note introduced unchanged '+i,forms:[],sourceEntries:[{sourceId:'test-'+i,row:i+2,lesson:i<30?1.3:'1.3.5',part:i%2?'Part 1':'Part 2',type:i===60?'Other':'Noun',fields:{Hebrew:{text:'TEST SOURCE '+i},English:{text:'Exact test meaning '+i}},catalogueLinks:[]}]}));
 const source={version:1,kind:'authored-source-browse',rows,counts:{rows:61,visibleSourceRecords:61},sourceLessons:['1.3','1.3.5'],authorization:{instruction:'Synthetic test only'}};
 source.digest=sourceBrowseDigest(source);return source;
}
