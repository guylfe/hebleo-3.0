const fs=require('fs');const dir='.curriculum-a2-revision-20261026/';const p=JSON.parse(fs.readFileSync(dir+'plan.json','utf8'));
const at=Object.fromEntries(p.lessons.map(l=>[l.key,l]));const strip=s=>s.normalize('NFC').replace(/[\u0591-\u05bd\u05bf-\u05c7]/g,'');const tok=s=>strip(s).match(/[א-ת]+(?:['׳״"][א-ת]+)*/g)||[];
const known={},evidence={};function add(w,pos,why){for(const x of tok(w)){if(!known[x]||known[x]>pos){known[x]=pos;evidence[x]=why;}}}
for(const l of p.lessons)for(const t of l.targets){let words=t.learnerForms||[t.he.includes('–')?(l.pos<at['PAST-HE-SHE-THEY'].pos?t.he.split('–')[1]:t.he):t.he];for(const w of words)add(w,l.pos,'current lexical/structural entry '+t.token);}
function model(key,ws,reason='Explicit supplied forms in current lesson'){for(const w of ws.split(' '))add(w,at[key].pos,reason+' '+at[key].id);}
model('NOMINAL','מתן תמי אמנית מנהלת');model('LSHZ','דנה זיו');
model('PREFIXES-BL-SHEL','שלי לי');
model('WANTS-SG','רוצה מדבר מדברת לומד לומדת בא באה');
model('COMMANDS-GIVE-SIT-GO','בוא בואי בואו שב שבי שבו תן תני תנו לך לכי לכו');
model('INFINITIVE-WANT','ללכת לשבת לרדת');model('QST','לשתות');model('PERMISSION-REQUESTS','לקחת לתת');
model('NOUN-PLURALS','ילדים ילדות תלמידים תלמידות בניינים כלבים שכנים שכנות כיתות');
model('PREP-SUFFIXES-ME-HIM-HER','לו לה שלו שלה ממני ממנו ממנה');
model('REPAIR-CONVERSATION','מבין מבינה לדבר');model('COUNTING-ONE-TEN','מילים');
model('ADJECTIVE-PREDICATES','רעבה עייפה');
model('PRESENT-BA-SAM-OLE-ROTZE','רוצים רוצות באים באות מדברים מדברות לומדים לומדות שם שמה שמים שמות עולה עולים עולות');
model('PREP-SUFFIXES-YOU-SG','לך שלך ממך ללמוד');
model('NOUN-ADJECTIVE','הבא הבאה הבאים הבאות שים שימי שימו קטנה גדולה נמוכים מדפים');
model('COUNTING-ONE-SHOPPING','אחד משלמת');
model('PREP-SUFFIXES-US-THEM','לנו להם להן שלנו שלהם שלהן מאיתנו מהם מהן');
model('BEGED-KEFET','רד רדי רדו הזה');
model('DEMONSTRATIVE-PHRASES','הזאת');
model('PAAL','לכתוב לקרוא');
model('PREP-SUFFIXES-YOU-PL','לכם לכן שלכם שלכן מכם מכן תפוזים');
model('DIRECT-OBJECT-ET','אוהבת');model('ALPHABET-ORDER','לצאת עוזרת');
model('MODALS-CAN-NEED-MUST','יכולה צריכים צריכה צריכות חייבת חייבים חייבות להתחיל');
model('PAST-HE-SHE-THEY','למד למדה למדו באה באו');
model('PAST-I','גמרתי סגרתי ספרתי אספתי באתי למדתי אמרתי ספרים');
model('DUAL','נעליים ביצים');model('HOME-VISIT','קח קחי קחו נחה');
model('PRESENT-FOUR-FORMS','רוחצת');model('OBJECT-AND-RECIPIENT','מקבלת בחרה');
model('PAST-I-WE-YOU','הייתי היינו היית הייתם הייתן היה היתה הייתה היו המגורים המשפחתי');
model('ADJECTIVES-YOD','בעלה');model('HOLLOW-VERBS','רצה טסה');
model('PREPOSITIONS-PLURAL-SUFFIXES','עצים אחריו');
model('FINAL-HE-VERBS','עשרה שקלים');
model('PERMISSION-IMMINENCE','ארוכה');model('FINDING-SOMEONE','מצאתי');
model('FUTURE-I-WE-HE','אלמד נלמד ילמד אבוא אדע');
model('FUTURE-YOU-COMMANDS','תלך');model('FUTURE-SHE-THEY','תלמד תדע תבוא');
model('FORMAL-REGISTER','לבוא להבין');
model('NOUN-PLURALS','בתים');model('PERMISSION-REQUESTS','תיקים');model('QST','כיסאות');
model('ADJECTIVE-PREDICATES','עייפים עייפות');model('NOUN-ADJECTIVE','אדומה אדומים אדומות');
model('PAST-HE-SHE-THEY','עבד');model('FINAL-HE-VERBS','שותה שותים שותות');model('RELATIVE-CLAUSES','עזר');
// These forms are deliberately supplied as examples in the source-derived later lessons.
const old=JSON.parse(fs.readFileSync('docs/curriculum/a2-20261026/form-models.json','utf8'));
const baseline=JSON.parse(fs.readFileSync('docs/curriculum/a2-20261026/route.json','utf8'));
for(const [w,v]of Object.entries(old)){const oldLesson=baseline.lessons.find(l=>l.pos===v.pos);if(oldLesson&&at[oldLesson.key]&&at[oldLesson.key].pos>=30)add(w,at[oldLesson.key].pos,'Historical source-derived supplied form; current lesson must retain its model');}
const finals={'ך':'כ','ם':'מ','ן':'נ','ף':'פ','ץ':'צ'};
const unknown=[],letters=[],dependencies=[],gram=[];
for(const l of p.lessons){
 const alphabet=new Set(p.letterGroups.filter(x=>x[0]<=l.pos).map(x=>x[1]).join(''));
 const lines=[...l.practice.map(x=>({text:x.learnerModel,token:x.token,field:'E'})),...l.values[6].split('\n').filter(x=>x.startsWith('→')).map(text=>({text,field:'G'}))];
 for(const line of lines)for(const w of tok(line.text)){
  const bad=[...w].filter(c=>/[א-ת]/.test(c)&&!alphabet.has(finals[c]||c));if(bad.length&&l.pos>=5)letters.push({lesson:l.id,word:w,bad,field:line.field});
  let variants=[w];const prefixes=(l.pos>=at['PREFIXES-MHV'].pos?'והמ':'')+(l.pos>=at['PREFIXES-BL-SHEL'].pos?'בל':'')+(l.pos>=at['EMBEDDED-CLAUSES'].pos?'ש':'');
  for(let n=1;n<Math.min(5,w.length);n++){const pr=w.slice(0,n);if(/^(?:ו)?(?:ש)?(?:[מבל])?(?:ה)?$/.test(pr)&&[...pr].every(c=>prefixes.includes(c)))variants.push(w.slice(n));}
  if(l.pos>=at['FUTURE-SHE-THEY'].pos&&w.startsWith('כש'))variants.push(w.slice(2));
  const letterAnalysis=(l.pos<5&&w.length===1)||(line.field==='G'&&l.pos>=23&&w.length===1)||(l.key==='GEMATRIA'&&/״/.test(w));
  if(!variants.some(v=>known[v]&&known[v]<=l.pos)&&!letterAnalysis)unknown.push({lesson:l.id,pos:l.pos,word:w,available:known[w],field:line.field,token:line.token,line:line.text});
 }
 const refs=l.values[2].match(/[A-Z][A-Z0-9-]*-A2/g)||[];for(const ref of refs){const t=p.lessons.find(x=>x.id===ref);if(!t||t.pos>=l.pos)dependencies.push({lesson:l.id,ref,refPos:t?.pos});}
 if(l.pos<at['DIRECT-OBJECT-ET'].pos)for(const line of lines)if(/(?:רואה|קורא|לומד|לומדת|שם|נותן|רוצה|לקחת|לתת|לקרוא) את /u.test(line.text))gram.push({lesson:l.id,error:'Definite-object marker before its introduction',line:line.text});
}
const counts=p.lessons.filter(l=>l.pos>4).map(l=>({lesson:l.id,pos:l.pos,n:l.targets.filter(t=>t.kind==='vocabulary').length,struct:l.targets.filter(t=>t.kind==='structure').length}));
const gaps=[];for(let i=0;i<p.lessons.length;i++)for(let j=i+1;j<Math.min(p.lessons.length,i+3);j++)if(p.lessons[i].family===p.lessons[j].family)gaps.push({from:p.lessons[i].pos,to:p.lessons[j].pos,family:p.lessons[i].family});
const all=p.lessons.flatMap(l=>l.targets.map(t=>t.token));const baseTokens=baseline.lessons.flatMap(l=>l.targets.map(t=>t.token));
const audit={lessonCount:p.lessons.length,entryCount:all.length,practiceCount:p.lessons.reduce((s,l)=>s+l.practice.length,0),missing:baseTokens.filter(t=>!all.includes(t)),duplicates:all.filter((t,i)=>all.indexOf(t)!==i),unknown,letters,dependencies,gram,counts,gaps,limits:'Executed letter, token/form, prerequisite-reference and coverage checks plus selected grammar traps. These checks do not establish human linguistic/audio approval or learner mastery. All new wording remains author draft.'};
fs.writeFileSync(dir+'audit.json',JSON.stringify(audit,null,2));fs.writeFileSync(dir+'form-evidence.json',JSON.stringify({known,evidence},null,2));
console.log(JSON.stringify({unknown,letters,dependencies,gram,gaps,under:counts.filter(x=>x.n<6)},null,2));
