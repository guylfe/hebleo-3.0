import test from 'node:test';
import assert from 'node:assert/strict';
import {seed,upgradeDemo} from '../src/seed.js';
import {parseVocabularyCSV,suggestColumnMapping,defaultColumnMapping,mapVocabularyRows,validateFormatting} from '../public/vocabulary-import.js';
import {richCell,cellCSS} from '../public/rich.js';
const fixture=()=>structuredClone(upgradeDemo(seed)||seed);
const csv=(headers,values)=>[headers,values].map(row=>row.map(value=>'"'+String(value).replaceAll('"','""')+'"').join(',')).join('\r\n');
const row=w=>[w.id,w.pointed,w.unpointed,w.curated,w.english];
const basics=['id','pointed','unpointed','curated','english'];
test('custom header suggestions never infer Hebrew forms or IDs',()=>{
 const s=suggestColumnMapping(['Stable ID','Full vowels','standard unpointed','curated display','English meaning','Hebrew','unknown']);
 assert.deepEqual(s.map(x=>x.target),['id','pointed','unpointed','curated','english',null,null]);
 assert.equal(suggestColumnMapping(['english','meaning'])[0].status,'ambiguous');
});
test('typed formatting, tags and raw unknown source strings survive mapping without changing the base',()=>{
 const c=fixture(),w=c.words[0],before=JSON.stringify(c),format={pointed:{formattedValue:w.pointed,effectiveFormat:{textFormat:{bold:true,italic:true,foregroundColor:'#137c83'},backgroundColor:'#abcdef',horizontalAlignment:'CENTER',textDirection:'RIGHT_TO_LEFT'},textFormatRuns:[{startIndex:0,format:{bold:false}}]}};
 const headers=[...basics,'fieldFormatting','sourceTheme','tags',' Odd Source '],values=[...row(w),JSON.stringify(format),JSON.stringify([{colorType:'ACCENT1',color:'#123456'}]),'["source-tag"]','  preserve\r\nexact  '];
 const parsed=parseVocabularyCSV(csv(headers,values)),mapped=mapVocabularyRows(parsed,defaultColumnMapping(headers),c),newWord=mapped.content.words[0];
 assert.deepEqual(newWord.fieldFormatting,format);assert.deepEqual(newWord.tags,['source-tag']);assert.equal(newWord.sourceFields[' Odd Source '],values.at(-1));assert.deepEqual(newWord.importSource.values,values);assert.deepEqual(newWord.importSource.headers,headers);assert.equal(JSON.stringify(c),before);
 assert.match(richCell(newWord.pointed,newWord.fieldFormatting.pointed),/font-weight:400/);assert.match(cellCSS(newWord.fieldFormatting.pointed),/direction:rtl/);
});
test('each supported scalar style and combined styles uses exact source Hebrew',()=>{
 const c=fixture(),w=c.words[0],properties={bold:['true','boolean'],italic:['true','boolean'],foregroundColor:['#137c83','string'],backgroundColor:['#abcdef','string'],horizontalAlignment:['CENTER','string'],textDirection:['RIGHT_TO_LEFT','string']};
 for(const keys of [...Object.keys(properties).map(k=>[k]),Object.keys(properties)]) {
  const headers=[...basics,...keys],values=[...row(w),...keys.map(k=>properties[k][0])],mapping=defaultColumnMapping(basics);
  keys.forEach((key,i)=>mapping.columns.push({columnIndex:5+i,target:'fieldStyle',field:'pointed',property:key,decode:properties[key][1]}));
  const result=mapVocabularyRows(parseVocabularyCSV(csv(headers,values)),mapping,c),cell=result.content.words[0].fieldFormatting.pointed;
  assert.equal(cell.formattedValue,w.pointed);assert.equal(validateFormatting({pointed:cell},{word:w}).errors.length,0);
  if(keys.includes('bold'))assert.match(richCell(w.pointed,cell),/font-weight:700/);
  if(keys.includes('italic'))assert.match(richCell(w.pointed,cell),/font-style:italic/);
  if(keys.includes('foregroundColor'))assert.match(richCell(w.pointed,cell),/color:#137c83/);
  if(keys.includes('backgroundColor'))assert.match(cellCSS(cell),/background-color:#abcdef/);
  if(keys.includes('horizontalAlignment'))assert.match(cellCSS(cell),/text-align:center/);
  if(keys.includes('textDirection'))assert.match(cellCSS(cell),/direction:rtl/);
 }
});
test('UTF-16 marks are retained; surrogate splits, unsorted and out-of-bounds runs fail',()=>{
 const word={pointed:'אָ😀ב'},cell={formattedValue:word.pointed,textFormatRuns:[{startIndex:0,format:{}},{startIndex:1,format:{bold:true}},{startIndex:4,format:{italic:true}}]};
 assert.deepEqual(validateFormatting({pointed:cell},{word}).errors,[]);
 for(const indices of [[0,3],[2,1],[0,6]]){cell.textFormatRuns=indices.map(startIndex=>({startIndex,format:{}}));assert.ok(validateFormatting({pointed:cell},{word}).errors.length);}
});
test('unsafe colors, malformed supported styles and cyclic themes fail; unknown styles remain inert warnings',()=>{
 const word={pointed:'אב'};
 for(const format of [{backgroundColor:'url(https://bad)'},{textFormat:{bold:'true'}},{textDirection:'rtl'},{textFormat:{foregroundColor:{red:2}}}])assert.ok(validateFormatting({pointed:{formattedValue:word.pointed,effectiveFormat:format}},{word}).errors.length);
 const sourceTheme=[{colorType:'A',color:{themeColor:'B'}},{colorType:'B',color:{themeColor:'A'}}];
 assert.ok(validateFormatting({}, {word,sourceTheme}).errors.some(e=>e.includes('cyclic')));
 const out=validateFormatting({pointed:{effectiveFormat:{unknownSafeProperty:'source'}}},{word});assert.equal(out.errors.length,0);assert.equal(out.warnings.length,1);
});
test('bad mapping/metadata fail atomically and missing rows preserve stable source objects',()=>{
 const c=fixture(),w=c.words[0],before=JSON.stringify(c),parsed=parseVocabularyCSV(csv(basics,row(w))),mapping=defaultColumnMapping(basics);
 for(const bad of [{...mapping,columns:mapping.columns.slice(1)},{...mapping,columns:[...mapping.columns,mapping.columns[0]]},{version:1,columns:[...mapping.columns,{columnIndex:0,target:'arbitrary.path',decode:'string'}]}])assert.throws(()=>mapVocabularyRows(parsed,bad,c));
 assert.equal(JSON.stringify(c),before);assert.deepEqual(mapVocabularyRows(parsed,mapping,c).content.words.slice(1),c.words.slice(1));
 for(const [header,value] of [['tags','not json'],['fieldFormatting','{"__proto__":{}}'],['bold','yes']]){const headers=[...basics,header];assert.throws(()=>mapVocabularyRows(parseVocabularyCSV(csv(headers,[...row(w),value])),defaultColumnMapping(headers),c));}
});
test('formatting cannot silently disagree with a newly mapped text or conflict with scalar mapping',()=>{
 const c=fixture(),w=c.words[0],headers=[...basics,'fieldFormatting'],parsed=parseVocabularyCSV(csv(headers,[...row(w),'{"pointed":{"formattedValue":"other"}}']));
 assert.throws(()=>mapVocabularyRows(parsed,defaultColumnMapping(headers),c),/match/);
 const raw=parseVocabularyCSV(csv([...headers,'bold'],[...row(w),'{}','true'])),mapping=defaultColumnMapping(headers);mapping.columns.push({columnIndex:6,target:'fieldStyle',field:'pointed',property:'bold',decode:'boolean'});assert.throws(()=>mapVocabularyRows(raw,mapping,c),/scalar/);
});
test('CSV shape, quotes, rows and typed metadata are bounded with no truncation',()=>{
 assert.throws(()=>parseVocabularyCSV('id,id\na,b'));assert.throws(()=>parseVocabularyCSV('id,__proto__\na,b'));assert.throws(()=>parseVocabularyCSV('id,pointed\na'));assert.throws(()=>parseVocabularyCSV('id\n"bad'));
 const raw='id\n'+Array.from({length:2001},(_,i)=>'item-'+i).join('\n');assert.throws(()=>parseVocabularyCSV(raw),/2000/);
});
