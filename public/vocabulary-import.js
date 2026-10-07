// Explicit file interchange. CSV has no intrinsic cell formatting.
// All parsing/mapping is pure and reviewable before the existing CAS Stage API.
export const vocabularyTextFields=['id','pointed','unpointed','curated','english','notes','root','pattern','gender','plural','feminine','pluralFeminine','infinitive','partOfSpeech','audio','introducedLesson','part'];
export const vocabularyRequiredFields=['id','pointed','unpointed','curated','english'];
export const vocabularyMappingTargets=[...vocabularyTextFields,'tags','fieldFormatting','sourceTheme','color','bold','noVocab','noCard','fieldStyle'];
const typed={tags:'json',fieldFormatting:'json',sourceTheme:'json',bold:'boolean',noVocab:'boolean',noCard:'boolean',fieldStyle:null};
const reserved=['__proto__','constructor','prototype'];
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const fail=message=>{throw new Error(message);};
const comparable=value=>JSON.stringify(value,(_k,v)=>object(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
function safeMetadata(value,depth=0) {
 if(depth>8)fail('Source metadata nesting exceeds the limit.');
 if(typeof value==='string'&&value.length>12000)fail('Source metadata string exceeds the limit.');
 if(value&&typeof value==='object')for(const [key,child] of Object.entries(value)){if(reserved.includes(key))fail('Reserved source metadata key.');safeMetadata(child,depth+1);}
}
export function parseVocabularyCSV(csv) {
 if(typeof csv!=='string'||csv.length>750000)fail('CSV exceeds the local file limit.');
 const rows=[];let row=[],field='',quoted=false,closed=false;
 const endField=()=>{row.push(field);field='';closed=false;};
 const endRow=()=>{endField();if(row.some(v=>v!==''))rows.push(row);row=[];};
 const input=csv.replace(/^\uFEFF/,'');
 for(let i=0;i<input.length;i++){
  const c=input[i];
  if(quoted){if(c==='"'){if(input[i+1]==='"'){field+='"';i++;}else{quoted=false;closed=true;}}else field+=c;}
  else if(c===',')endField();
  else if(c==='\r'||c==='\n'){if(c==='\r'&&input[i+1]==='\n')i++;endRow();}
  else if(c==='"'&&!field&&!closed)quoted=true;
  else{if(closed||c==='"')fail('Malformed CSV quoting.');field+=c;}
 }
 if(quoted)fail('Unclosed quoted CSV field.');endRow();
 const headers=rows.shift();
 if(!headers||headers.some(h=>!h.trim()||h.length>100||reserved.includes(h.trim()))||new Set(headers).size!==headers.length)fail('CSV needs unique nonempty headers without reserved names.');
 if(!rows.length||rows.length>2000)fail('CSV needs 1–2000 vocabulary rows.');
 if(rows.some(values=>values.length!==headers.length))fail('CSV row has a different number of columns.');
 return {headers,rows};
}
const aliases={meaning:'english','english meaning':'english','stable id':'id','full vowels':'pointed','standard unpointed':'unpointed','curated display':'curated','part of speech':'partOfSpeech'};
export function suggestColumnMapping(headers) {
 const matches=headers.map((header,columnIndex)=>{
  const key=header.trim().toLowerCase(),target=vocabularyMappingTargets.find(t=>t.toLowerCase()===key)||aliases[key]||null;
  return {columnIndex,header,target:target==='fieldStyle'?null:target,decode:typed[target]||'string'};
 });
 return matches.map(item=>({...item,status:!item.target?'unmapped':matches.filter(x=>x.target===item.target).length>1?'ambiguous':'recognized'}));
}
export function defaultColumnMapping(headers) {
 const suggestions=suggestColumnMapping(headers);
 return {version:1,columns:suggestions.filter(s=>s.status==='recognized').map(({columnIndex,target,decode})=>({columnIndex,target,decode}))};
}
export function validateFormatting(fieldFormatting, {word={},sourceTheme=[]}={}) {
 const errors=[],warnings=[],err=(p,m)=>errors.push(p+': '+m);
 const checkColor=(value,p,stack=[])=>{
  if(typeof value==='string'){if(!/^#[0-9a-f]{6}$/i.test(value))err(p,'use a six-digit hex color.');return;}
  if(!object(value)){err(p,'invalid color.');return;}
  if(value.themeColor!==undefined){
   if(typeof value.themeColor!=='string'||Object.keys(value).some(k=>k!=='themeColor')){err(p,'invalid theme reference.');return;}
   if(stack.includes(value.themeColor)){err(p,'cyclic theme reference.');return;}
   const entry=(Array.isArray(sourceTheme)?sourceTheme:[]).find(e=>e?.colorType===value.themeColor);
   if(!entry){err(p,'missing theme color '+value.themeColor);return;}checkColor(entry.color,p,[...stack,value.themeColor]);return;
  }
  if(value.rgbColor!==undefined){if(Object.keys(value).some(k=>k!=='rgbColor'))err(p,'invalid RGB color style.');checkColor(value.rgbColor,p,stack);return;}
  if(Object.keys(value).some(k=>!['red','green','blue','alpha'].includes(k)))err(p,'invalid RGB channels.');
  for(const [key,channel] of Object.entries(value))if(!Number.isFinite(channel)||channel<0||channel>1)err(p+'.'+key,'channel must be 0–1.');
 };
 const font=(value,p)=>{
  if(!object(value)){err(p,'text format must be an object.');return;}
  for(const [key,v] of Object.entries(value)){
   if(['bold','italic','underline','strikethrough'].includes(key)){if(typeof v!=='boolean')err(p+'.'+key,'must be boolean.');}
   else if(['foregroundColorStyle','foregroundColor','color'].includes(key))checkColor(v,p+'.'+key);
   else if(key==='fontSize'){if(!Number.isFinite(v)||v<6||v>72)err(p+'.'+key,'font size must be 6–72.');}
   else if(key==='fontFamily'){if(typeof v!=='string'||!/^[A-Za-z0-9 -]{1,80}$/.test(v))err(p+'.'+key,'unsupported font family.');}
   else warnings.push(p+'.'+key+': unsupported; retained without rendering.');
  }
 };
 const format=(value,p)=>{
  if(!object(value)){err(p,'format must be an object.');return;}
  for(const [key,v] of Object.entries(value)){
   if(key==='textFormat')font(v,p+'.textFormat');
   else if(['backgroundColor','backgroundColorStyle'].includes(key))checkColor(v,p+'.'+key);
   else if(key==='horizontalAlignment'){if(!['LEFT','CENTER','RIGHT'].includes(v))err(p+'.'+key,'use LEFT, CENTER or RIGHT.');}
   else if(key==='textDirection'){if(!['LEFT_TO_RIGHT','RIGHT_TO_LEFT'].includes(v))err(p+'.'+key,'unsupported direction.');}
   else warnings.push(p+'.'+key+': unsupported; retained without rendering.');
  }
 };
 if(!Array.isArray(sourceTheme)||sourceTheme.length>100)err('sourceTheme','must be a bounded array.');
 else{
  const themes=new Set();
  for(const [i,entry] of sourceTheme.entries()){
   if(!object(entry)||typeof entry.colorType!=='string'||!entry.colorType||themes.has(entry.colorType))err('sourceTheme['+i+']','unique colorType required.');
   else{themes.add(entry.colorType);checkColor(entry.color,'sourceTheme['+i+'].color',[entry.colorType]);}
  }
 }
 if(fieldFormatting===undefined)return {errors,warnings};
 if(!object(fieldFormatting)){err('fieldFormatting','must be an object.');return {errors,warnings};}
 for(const [field,cell] of Object.entries(fieldFormatting)){
  const p='fieldFormatting.'+field;
  if(!object(cell)){err(p,'cell must be an object.');continue;}
  if(cell.formattedValue!==undefined&&typeof cell.formattedValue!=='string')err(p+'.formattedValue','must be exact source text.');
  const source=typeof cell.formattedValue==='string'?cell.formattedValue:typeof word[field]==='string'?word[field]:'';
  if(cell.formattedValue!==undefined&&(word[field]??word.sourceFields?.[field])!==undefined&&cell.formattedValue!==(word[field]??word.sourceFields?.[field]))warnings.push(p+': source text changed; old formatting is retained and rendered as plain text.');
  if(cell.userEnteredFormat!==undefined)format(cell.userEnteredFormat,p+'.userEnteredFormat');
  if(cell.effectiveFormat!==undefined)format(cell.effectiveFormat,p+'.effectiveFormat');
  if(cell.textFormatRuns!==undefined){
   if(!Array.isArray(cell.textFormatRuns)||cell.textFormatRuns.length>1000){err(p+'.textFormatRuns','must be a bounded array.');continue;}
   let previous=-1;
   for(const [i,run] of cell.textFormatRuns.entries()){
    const index=run?.startIndex??0,rp=p+'.textFormatRuns['+i+']';
    if(!object(run)||!Number.isInteger(index)||index<0||index>source.length||index<=previous)err(rp,'UTF-16 indices must be increasing and within source text.');
    else if(index>0&&index<source.length&&/[\uD800-\uDBFF]/.test(source[index-1])&&/[\uDC00-\uDFFF]/.test(source[index]))err(rp,'index splits a surrogate pair.');
    previous=index;if(run?.format!==undefined)font(run.format,rp+'.format');
   }
  }
  for(const key of Object.keys(cell))if(!['formattedValue','userEnteredFormat','effectiveFormat','textFormatRuns'].includes(key))warnings.push(p+'.'+key+': unsupported; retained without rendering.');
 }
 return {errors,warnings};
}
export function mapVocabularyRows(parsed,mapping,baseContent) {
 if(!mapping||mapping.version!==1||!Array.isArray(mapping.columns))fail('Mapping version 1 and explicit columns are required.');
 const {headers,rows}=parsed;if(!Array.isArray(headers)||!Array.isArray(rows))fail('Parse the CSV before mapping.');
 const columns=new Set(),targets=new Set(),styleTargets=new Set(),styles=[];
 for(const column of mapping.columns){
  if(!object(column)||!Number.isInteger(column.columnIndex)||column.columnIndex<0||column.columnIndex>=headers.length||columns.has(column.columnIndex)||!vocabularyMappingTargets.includes(column.target))fail('Invalid or duplicate mapping column.');
  columns.add(column.columnIndex);
  if(column.target==='fieldStyle'){
   if(!vocabularyTextFields.includes(column.field)||column.field==='id'||!['bold','italic','foregroundColor','backgroundColor','horizontalAlignment','textDirection'].includes(column.property))fail('Unsupported field style destination.');
   const destination=column.field+'.'+column.property;
   if(styleTargets.has(destination))fail('Duplicate style destination.');styleTargets.add(destination);styles.push(column);
   if(column.decode!==(['bold','italic'].includes(column.property)?'boolean':'string'))fail('Invalid style decoder.');
  } else{
   if(targets.has(column.target))fail('Duplicate mapping target: '+column.target);targets.add(column.target);
   if(column.decode!==(typed[column.target]||'string'))fail('Invalid decoder for '+column.target);
  }
 }
 if(vocabularyRequiredFields.some(field=>!targets.has(field)))fail('Map id, pointed, unpointed, curated and english explicitly; no forms are generated.');
 if(targets.has('fieldFormatting')&&styles.length)fail('Whole formatting and scalar styles cannot target the same import.');
 const next=structuredClone(baseContent),seen=new Set(),warnings=[];
 const decode=(raw,column)=>{
  if(column.decode==='string')return raw;
  if(column.decode==='boolean'){if(!['true','false'].includes(raw))fail('Column '+headers[column.columnIndex]+' must contain true or false.');return raw==='true';}
  try{const value=JSON.parse(raw);safeMetadata(value);return value;}catch(error){fail('Column '+headers[column.columnIndex]+': '+error.message);}
 };
 for(const [rowIndex,values] of rows.entries()){
  if(values.length!==headers.length)fail('CSV row has a different number of columns.');
  const fields={};for(const column of mapping.columns)if(column.target!=='fieldStyle')fields[column.target]=decode(values[column.columnIndex],column);
  if(vocabularyRequiredFields.some(field=>typeof fields[field]!=='string'||!fields[field].trim()))fail('Row '+(rowIndex+2)+' needs all explicit identity/forms/meaning.');
  if(seen.has(fields.id))fail('Duplicate CSV vocabulary ID: '+fields.id);seen.add(fields.id);
  const old=next.words.find(w=>w.id===fields.id),word={...old,...Object.fromEntries(Object.entries(fields).filter(([key])=>vocabularyTextFields.includes(key)||['tags','fieldFormatting','sourceTheme','noVocab','noCard'].includes(key)))};
  if(fields.tags!==undefined&&(!Array.isArray(word.tags)||new Set(word.tags).size!==word.tags.length||word.tags.some(t=>typeof t!=='string'||!t.trim())))fail('Tags need a unique explicit string array.');
  word.sourceFields={...old?.sourceFields,...Object.fromEntries(headers.map((h,i)=>[h,values[i]]).filter((_entry,i)=>!columns.has(i)))};
  if('tags' in fields)word.taggingVersion=1;
  word.importSource={version:1,headers:[...headers],values:[...values],columns:structuredClone(mapping.columns)};
  if('color' in fields||'bold' in fields){
   word.format={...old?.format};if('color' in fields){if(fields.color&&!/^#[0-9a-f]{6}$/i.test(fields.color))fail('Color must be a six-digit hex value.');if(fields.color)word.format.color=fields.color;else delete word.format.color;}if('bold' in fields)word.format.bold=fields.bold;
  }
  for(const column of styles){
   const value=decode(values[column.columnIndex],column);
   if(typeof word[column.field]!=='string')fail('Map the styled text field explicitly.');
   const cell=word.fieldFormatting??={};const target=cell[column.field]??={formattedValue:word[column.field],userEnteredFormat:{}};
   if(target.formattedValue!==word[column.field])fail('Existing formatted source differs; remap whole formatting explicitly.');
   const format=target.effectiveFormat || (target.userEnteredFormat??={});
   if(['bold','italic','foregroundColor'].includes(column.property))(format.textFormat??={})[column.property]=value;
   else format[column.property]=value;
  }
  safeMetadata(word);
  const checked=validateFormatting(word.fieldFormatting,{word,sourceTheme:word.sourceTheme||[]});
  if(targets.has('fieldFormatting'))for(const [field,cell] of Object.entries(fields.fieldFormatting||{}))if(cell.formattedValue!==undefined&&cell.formattedValue!==(word[field]??word.sourceFields?.[field]))fail('Mapped formattedValue must match its exact text field.');
  if(checked.errors.length)fail('Row '+(rowIndex+2)+': '+checked.errors.join('; '));warnings.push(...checked.warnings.map(w=>word.id+': '+w));
  // New typed metadata identifies the strict validation policy without rewriting history.
  if(targets.has('fieldFormatting')||targets.has('sourceTheme')||styles.length)word.formattingVersion=1;
  if(old)next.words[next.words.indexOf(old)]=word;else next.words.push(word);
 }
 if(next.words.length>2000)fail('Mapped content exceeds the 2000-word local bound.');
 return {content:next,warnings,mappingSummary:{columns:structuredClone(mapping.columns),unmapped:headers.flatMap((header,index)=>columns.has(index)?[]:[{columnIndex:index,header}]),rows:rows.length}};
}
