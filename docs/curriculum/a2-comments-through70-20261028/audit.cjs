const fs = require('fs'), dir = 'docs/curriculum/a2-comments-through70-20261028/';
const read = f => JSON.parse(fs.readFileSync(f,'utf8'));
const p = read(dir+'route.json'), base = read('docs/curriculum/a2-document-cleanup-20261027/route.json');
const formSource = read('docs/curriculum/a2-revision-20261026/form-evidence.json');
const previousSupplied = read('docs/curriculum/a2-document-cleanup-20261027/supplied-forms.json');
const at = Object.fromEntries(p.lessons.map(l=>[l.key,l]));
const idAt = Object.fromEntries(p.lessons.map(l=>[l.id,l]));
const norm = s => s.normalize('NFC').replace(/[\u0591-\u05bd\u05bf-\u05c7]/g,'').replaceAll('׳',"'");
const tok = s => norm(s).match(/[א-ת]+(?:['״"][א-ת]+)*/g)||[];
const remapOld = n => n===9?10:n===10?9:n;
const known = {};
for(const [word,old] of Object.entries(formSource.known)) {
  const l = base.lessons[remapOld(old)-1];
  if(l) known[norm(word)] = at[l.key].pos;
}
for(const x of previousSupplied) known[norm(x.word)] = Math.min(known[norm(x.word)]||999,at[x.key].pos);
for(const r of p.relocations) {
  const t = idAt[r.to].targets.find(t=>t.token===r.token);
  for(const w of tok(t.he)) known[w] = /\s/.test(t.he) ? Math.min(known[w]||999,idAt[r.to].pos) : idAt[r.to].pos;
}
// All forms below are explicitly taught in the revised F/D before their E/G use.
const supplied = [
  ['VOWELS-OU-READING','מו מ','Reading syllables, not lexical entries.'],
  ['VAV-YOD-SPELLING','הווילון','Article + initial vav spelling is explicitly compared.'],
  ['PRESENT-BA-SAM-OLE-ROTZE','לומדים לומדות מדברים מדברות','Green and present plurals explicitly modelled in F/D.'],
  ['PIEL','מלמד מלמדת מלמדים מלמדות מספר מספרת מספרים מספרות מסדר מסדרת מסדרים מסדרות משחק משחקת משחקים משחקות משלמת','Present Pi’el and existing agreement applied; past forms deferred.'],
  ['PAST-HE-SHE-THEY','דיבר דיברה דיברו','F explicitly supplies familiar Pi’el past and Green.'],
  ['PAST-I','כתבתי כתבנו למדתי למדנו דיברתי דיברנו דִּבַּרְתִּי דִּבַּרְנוּ סגרנו','F explicitly models I/we with Blue; E supplies task forms. Fully pointed and ordinary full spelling are separate supplied representations.'],
  ['PAST-I-WE-YOU','למדת למדתם למדתן דיברתן דִּבַּרְתֶּן כתבת כתבתם כתבתן דיברת דיברתם','F teaches full singular/plural you models. Fully pointed representation also supplied.'],
  ['PAST-BE-PROFILE','היה הייתה היו הייתי היינו היית הייתם הייתן','All past היה forms explicitly staged in F.'],
  ['FOUR-ROOT-CONSONANTS','התארגן מתארגן','Approved derived meaning taught explicitly in D/F.']
];
for(const [key,words,reason] of supplied) for(const w of words.split(' ')) known[norm(w)] = Math.min(known[norm(w)]||999,at[key].pos);
// Old Pi’el past forms no longer become available with its moved present-only introduction.
for(const w of ['סיפרתי','סידרתי','סידרנו','שיחקו','לימדתי','לימדנו']) known[w] = at['PAST-I'].pos;
for(const w of ['היה','הייתה','היו','הייתי','היינו','היית','הייתם','הייתן']) known[w] = at['PAST-BE-PROFILE'].pos;
const errors = {preservation:[],numbers:[],letters:[],unknown:[],prerequisites:[],grammar:[],requirements:[],boilerplate:[]};
const entries = p.lessons.flatMap(l=>l.targets.map(t=>t.token)).sort();
const beforeEntries = base.lessons.flatMap(l=>l.targets.map(t=>t.token)).sort();
if(JSON.stringify(entries)!==JSON.stringify(beforeEntries)) errors.preservation.push('Source vocabulary token multiset changed');
if(new Set(entries).size!==1088) errors.preservation.push('Source tokens not unique');
if(new Set(p.lessons.map(l=>l.id)).size!==119) errors.preservation.push('IDs not unique');
for(const l of base.lessons) if(!idAt[l.id]) errors.preservation.push('Missing old ID '+l.id);
const live = read(dir+'before-values.json').map(r=>({values:r.map(v=>({userEnteredValue:v}))}));
for(const l of p.lessons.filter(l=>l.family==='Numbers')) {
  const orig = live[l.beforePos+2].values;
  for(let i=0;i<7;i++) if(l.values[i] !== (orig[i]?.userEnteredValue?.stringValue||'')) errors.numbers.push({id:l.id,col:i});
  for(const [key,col] of [['outcome',11],['reason',12]]) if(l[key] !== orig[col]?.userEnteredValue?.stringValue) errors.numbers.push({id:l.id,col});
}
const numBefore = base.lessons.filter(l=>l.family==='Numbers').map(l=>l.id);
if(JSON.stringify(p.lessons.filter(l=>l.family==='Numbers').map(l=>l.id))!==JSON.stringify(numBefore)) errors.numbers.push('Number order changed');
const groups = [['MNT','מנתל'],['AHY','אהי'],['VAV','ו'],['LSHZ','שזד'],['BGD','ברצ'],['KPTZ','כפג'],['HET-AYIN-RESH','חע'],['QST','קסט']];
const finals = {'ך':'כ','ם':'מ','ן':'נ','ף':'פ','ץ':'צ'};
for(const l of p.lessons) {
  const letters = new Set(groups.filter(([k])=>at[k].pos<=l.pos).map(x=>x[1]).join(''));
  const lines = [{text:l.values[4],field:'E'},...l.values[6].split('\n').filter(x=>x.startsWith('→')).map(text=>({text,field:'G'}))];
  for(const line of lines) for(const w of tok(line.text)) {
    const bad = [...w].filter(c=>/[א-ת]/.test(c)&&!letters.has(finals[c]||c));
    if(bad.length) errors.letters.push({id:l.id,word:w,bad});
    const prefixes = (l.pos>=at['PREFIXES-MHV'].pos?'והמ':'')+(l.pos>=at['PREFIXES-BL-SHEL'].pos?'בל':'')+(l.pos>=at['EMBEDDED-CLAUSES'].pos?'ש':'');
    const variants=[w];
    for(let n=1;n<Math.min(5,w.length);n++) {const pre=w.slice(0,n);if(/^(?:ו)?(?:ש)?(?:[מבל])?(?:ה)?$/.test(pre)&&[...pre].every(c=>prefixes.includes(c)))variants.push(w.slice(n));}
    if(l.pos>=at['FUTURE-SHE-THEY'].pos&&w.startsWith('כש')) variants.push(w.slice(2));
    const analysis=(l.pos<5&&w.length===1)||(line.field==='G'&&l.pos>=at.QST.pos&&w.length===1)||(l.key==='GEMATRIA'&&/״/.test(w));
    if(!analysis&&!variants.some(v=>known[v]&&known[v]<=l.pos)) errors.unknown.push({id:l.id,word:w,available:known[w],pos:l.pos,field:line.field});
  }
  for(const ref of l.values[2].match(/[A-Z][A-Z0-9-]*-A2/g)||[]) if(!idAt[ref]||idAt[ref].pos>=l.pos) errors.prerequisites.push({id:l.id,ref});
  if(l.pos<at['DIRECT-OBJECT-ET'].pos) for(const line of lines) if(/(?:רואה|קורא|לומד|לומדת|שם|נותן|רוצה|לקחת|לתת|מסדר|מסדרת) את /u.test(line.text)) errors.grammar.push({id:l.id,text:line.text});
  if(l.pos<at['VOWELS-OU-READING'].pos && tok(l.values[4]+'\n'+l.values[6]).includes('לא')) errors.grammar.push({id:l.id,reason:'לא before o/u follow-up'});
  if(/1\. Meaning \+ recall:|3\. Produce:|Practice for every entry/.test(l.values[5])) errors.boilerplate.push(l.id);
}
function requireCheck(ok,name){if(!ok)errors.requirements.push(name);}
requireCheck(at.PIEL.pos===at.PAAL.pos+3,'Pi’el must follow Pa’al after two intervening lessons');
requireCheck(at['FOUR-ROOT-CONSONANTS'].pos===at.HIFIL.pos+3,'Quadriliteral roots after five binyanim and two intervening lessons');
requireCheck(at['PAST-BE-PROFILE'].pos===at['PAST-I-WE-YOU'].pos+3,'Separate היה after two intervening lessons');
requireCheck(at['VAV-YOD-SPELLING'].pos<=13,'Spelling in early 10–13 region');
requireCheck(at['PRONUNCIATION-KH-R'].targets.length===2,'Pronunciation vocabulary reduced');
requireCheck(at['PRESENT-BA-SAM-OLE-ROTZE'].values[5].includes('Green')&&at['PAST-I'].values[5].includes('Blue'),'Rule placements');
requireCheck(!at.MNT.values[6].includes('ן'),'No final-letter test in lesson 2');
const gaps=groups.slice(1).map((g,i)=>({from:groups[i][0],to:g[0],intervening:at[g[0]].pos-at[groups[i][0]].pos-1}));
requireCheck(gaps.every(g=>g.intervening>=2),'Letter spacing');
const report={lessons:p.lessons.length,retainedIds:base.lessons.length,sourceVocabularyEntries:entries.length,addedDerivedMeanings:p.addedDerivedMeanings,numberLessons:numBefore.length,relocations:p.relocations.length,errors,letterGaps:gaps,passed:Object.values(errors).every(v=>v.length===0),limits:'Bounded vocabulary/form, letters, selected grammar, prerequisites and preservation checks; not human linguistic/audio approval or a rendered-layout check.'};
fs.writeFileSync(dir+'audit.json',JSON.stringify(report,null,2));
fs.writeFileSync(dir+'supplied-forms.json',JSON.stringify(supplied,null,2));
console.log(JSON.stringify(report,null,2));
if(!report.passed) process.exitCode=1;
