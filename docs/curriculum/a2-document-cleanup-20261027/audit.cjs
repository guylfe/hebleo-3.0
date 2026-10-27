const fs=require('fs'),dir='docs/curriculum/a2-document-cleanup-20261027/';
const p=JSON.parse(fs.readFileSync(dir+'route.json','utf8'));
const base=JSON.parse(fs.readFileSync('docs/curriculum/a2-revision-20261026/route.json','utf8'));
const f=JSON.parse(fs.readFileSync('docs/curriculum/a2-revision-20261026/form-evidence.json','utf8'));
const at=Object.fromEntries(p.lessons.map(l=>[l.key,l]));
const remap=n=>n===9?10:n===10?9:n;
const normalize=s=>s.normalize('NFC').replace(/[\u0591-\u05bd\u05bf-\u05c7]/g,'').replaceAll('׳',"'");
const tok=s=>normalize(s).match(/[א-ת]+(?:['״"][א-ת]+)*/g)||[];
const known=Object.fromEntries(Object.entries(f.known).map(([w,pos])=>[normalize(w),remap(pos)]));
const supplied=fs.existsSync(dir+'supplied-forms.json')?JSON.parse(fs.readFileSync(dir+'supplied-forms.json','utf8')):[];
for(const x of supplied){if(!x.reason)throw Error('No reason for supplied form');known[normalize(x.word)]=Math.min(known[normalize(x.word)]||999,at[x.key].pos);}
const groups=[[2,'מנתל'],[5,'אהי'],[8,'ו'],[11,'שזד'],[14,'ברצ'],[17,'כפג'],[20,'חע'],[23,'קסט']];
const finals={'ך':'כ','ם':'מ','ן':'נ','ף':'פ','ץ':'צ'};
const unknown=[],letters=[],dependencies=[],grammar=[],boilerplate=[];
for(const l of p.lessons){
 const alphabet=new Set(groups.filter(x=>x[0]<=l.pos).map(x=>x[1]).join(''));
 const lines=[...(l.examples||[]).map(b=>({text:b[1],field:'E'})),...l.values[6].split('\n').filter(x=>x.startsWith('→')).map(text=>({text,field:'G'}))];
 for(const line of lines)for(const w of tok(line.text)){
  if(l.pos>=5){const bad=[...w].filter(c=>/[א-ת]/.test(c)&&!alphabet.has(finals[c]||c));if(bad.length)letters.push({pos:l.pos,word:w,bad});}
  let variants=[w];const prefixes=(l.pos>=9?'והמ':'')+(l.pos>=16?'בל':'')+(l.pos>=93?'ש':'');
  for(let n=1;n<Math.min(5,w.length);n++){const pre=w.slice(0,n);if(/^(?:ו)?(?:ש)?(?:[מבל])?(?:ה)?$/.test(pre)&&[...pre].every(c=>prefixes.includes(c)))variants.push(w.slice(n));}
  if(l.pos>=97&&w.startsWith('כש'))variants.push(w.slice(2));
  const analysis=(l.pos<5&&w.length===1)||(line.field==='G'&&l.pos>=23&&w.length===1)||(l.key==='GEMATRIA'&&/״/.test(w));
  if(!analysis&&!variants.some(v=>known[v]&&known[v]<=l.pos))unknown.push({key:l.key,pos:l.pos,word:w,available:known[w],field:line.field,text:line.text});
 }
 for(const ref of l.values[2].match(/[A-Z][A-Z0-9-]*-A2/g)||[]){const target=p.lessons.find(x=>x.id===ref);if(!target||target.pos>=l.pos)dependencies.push({id:l.id,ref});}
 if(l.pos<44)for(const line of lines)if(/(?:רואה|קורא|לומד|לומדת|שם|נותן|רוצה|לקחת|לתת|לקרוא) את /u.test(line.text))grammar.push({id:l.id,text:line.text});
 for(const text of [...l.values,l.reason])for(const phrase of p.boilerplate)if(text.includes(phrase))boilerplate.push({id:l.id,phrase});
}
const before=base.lessons.flatMap(l=>l.targets.map(t=>t.token)).sort(),after=p.lessons.flatMap(l=>l.targets.map(t=>t.token)).sort();
const gaps=[];for(let i=0;i<p.lessons.length;i++)for(let j=i+1;j<Math.min(i+3,p.lessons.length);j++)if(p.lessons[i].family===p.lessons[j].family)gaps.push({from:i+1,to:j+1,family:p.lessons[i].family});
const result={lessons:p.lessons.length,entries:after.length,uniqueIds:new Set(p.lessons.map(l=>l.id)).size,sourceEntriesIdentical:JSON.stringify(before)===JSON.stringify(after),unknown,letters,dependencies,grammar,boilerplate,gaps,combinedExampleCells:p.lessons.filter(l=>l.examples).length,exampleBlocks:p.lessons.reduce((n,l)=>n+(l.examples?.length||0),0),limits:'Executed vocabulary/form availability, letters, prerequisite references, selected grammar traps and preservation checks. Vocabulary recognition/recall is specified for each entry; E combines selected words. This is an authoring plan, not completed exercises, audio approval or learner-performance evidence.'};
fs.writeFileSync(dir+'audit.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
