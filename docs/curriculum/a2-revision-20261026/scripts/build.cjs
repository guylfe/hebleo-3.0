const fs=require('fs');
const dir='.curriculum-a2-revision-20261026/';
const base=JSON.parse(fs.readFileSync('docs/curriculum/a2-20261026/route.json','utf8'));
const source=JSON.parse(fs.readFileSync(dir+'source.json','utf8'));
const live=source.sheets.find(s=>s.properties.sheetId===102626001).data[0].rowData;
for(const l of base.lessons) for(let c=0;c<7;c++)if((live[l.pos+2].values[c].userEnteredValue?.stringValue||'')!==l.values[c])throw Error('Live A2 differs at '+l.id+' col '+c);
const order=`MEMORY MNT WRITING-BASICS VOWELS-AEI AHY NOMINAL QUESTIONS-BASIC VAV VOWELS-OU PREFIXES-MHV LSHZ DEMONSTRATIVES-SG NOUN-GENDER BGD WANTS-SG PREFIXES-BL-SHEL KPTZ COMMANDS-GIVE-SIT-GO EXISTENCE-POSSESSION HET-AYIN-RESH INFINITIVE-WANT NOUN-PLURALS QST PERMISSION-REQUESTS`.split(' ').concat(base.lessons.slice(25).map(l=>l.key));
const byBase=Object.fromEntries(base.lessons.map(l=>[l.key,l]));
const rename={'VOWELS-AEI':'VOWELS-AEIO-A2','VOWELS-OU':'INTRODUCTIONS-INTEGRATION-A2',LSHZ:'SHZD-A2',BGD:'BRTZ-A2','WANTS-SG':'PRESENT-SG-A2'};
const lessons=order.map((key,i)=>({...structuredClone(byBase[key]),pos:i+1,id:rename[key]||byBase[key].id,previousPos:byBase[key].pos,previousId:byBase[key].id}));
const at=Object.fromEntries(lessons.map(l=>[l.key,l]));
const tokens=base.lessons.flatMap(l=>structuredClone(l.targets));
for(const t of tokens){t.originalHe=t.he;t.originalLine=t.line;}
const choose={'שם':'DEMONSTRATIVES-SG','שמן':'VOWELS-OU','ספר':'QST','את':'PRONOUNS','אולם':'COUNTING-MASCULINE-CONSTRUCT'};
function find(he,source){let hits=tokens.filter(t=>t.originalHe===he);if(hits.length>1)hits=hits.filter(t=>t.source===(source||choose[he]));if(hits.length!==1)throw Error('Missing/ambiguous '+he+' '+hits.map(t=>t.token));return hits[0];}
// Allocate the same source entries once. New surfaces are forms of those meanings, not extra entries.
for(const l of lessons)l.targets=l.targets.map(t=>tokens.find(x=>x.token===t.token));
function move(he,key,source){const t=find(he,source);for(const l of lessons)l.targets=l.targets.filter(x=>x.token!==t.token);at[key].targets.push(t);return t;}
function assign(key,words){at[key].targets=[];for(const x of words)Array.isArray(x)?move(x[0],key,x[1]):move(x,key);}
function surface(he,newHe,meaning,forms){const t=find(he);t.he=newHe;t.line=newHe+' — '+meaning;t.learnerForms=forms;return t;}
assign('NOMINAL',['אני','לא','היי','אמן','מנהל']);
assign('QUESTIONS-BASIC',['מי','מה','אתה','את','אתם','אתן','אמת','אי','תה','תאנה','מילה','מילון']);
assign('VAV',['הוא','היא','הם','הן','או','תות','מונית','תו','אות','תמונה']);
assign('VOWELS-OU',['לימון','אימון','מלון','אונייה','תא','תאום / תאומה']);
assign('PREFIXES-MHV',['מ־','ה־','ו־','יום','היום','לילה','הלילה','המון','אולם']);
assign('LSHZ',['שלום','שמאל','זמן','תודה','דלת','יד']);move('שם','LSHZ','IM-WITH');
assign('DEMONSTRATIVES-SG',['זה','זאת','אולי','שם','שמש','מזל','שאלה','זית']);
assign('NOUN-GENDER',['ילד / ילדה','תלמיד / תלמידה','דוד / דודה','יהודי / יהודייה','איש / אישה','שן','לשון']);
assign('BGD',['בית','אבא','מיץ','בצל','ביי','שירותים','אור','שיר','בן / בת','להתראות']);
assign('WANTS-SG',['רוצה','דיבר–מדבר','למד–לומד','בא','מיד','ממש','תמיד','באמת','בננה','אורז','שמן']);
assign('PREFIXES-BL-SHEL',['ב־','ל־','של','לי','ליד','אדם','אבל','מקום','עיר','ימין']);
assign('KPTZ',['כן','כף','כפית','מפה','מפית','כאן','כלב','גם','מלפפון','בגד','לך / לכי / לכו','איפה']);
assign('COMMANDS-GIVE-SIT-GO',['תן / תני / תנו','שב / שבי / שבו','ביצה','פה','בלי','דג','פלפל','לאן']);
assign('EXISTENCE-POSSESSION',['יש','אין','תשלום','עוד','עכשיו','רגע','לבד','דלי']);
assign('HET-AYIN-RESH',['לחם','רחוב','עץ','אח / אחות','על','עין','פרח','רגל','נעים מאוד','עברית','חלב']);
assign('INFINITIVE-WANT',['רד / רדי / רדו','מלח','מחר','אחר כך','חדר','דירה','הביתה']);
assign('NOUN-PLURALS',['אלה','בניין','שכן / שכנה','צל','צד','כיתה','פנים']);
move('שתה–שותה','QST');
assign('PERMISSION-REQUESTS',['אפשר','רשות','בקשה','מפתח','תיק','קפה','קח / קחי / קחו']);
move('מדי','ADJECTIVE-PREDICATES');move('חם','ADJECTIVE-PREDICATES');move('ארוחה','PREP-SUFFIXES-ME-HIM-HER');move('כל','PREP-SUFFIXES-ME-HIM-HER');
move('איך','REPAIR-CONVERSATION');move('מה שלומך','REPAIR-CONVERSATION');
move('כמה','COUNTING-ONE-TEN');move('מתי','COUNTING-ONE-TEN');
move('איזה / איזו','NOUN-ADJECTIVE');move('אדום','NOUN-ADJECTIVE');move('גדול','PRESENT-BA-SAM-OLE-ROTZE');
move('שנה','VAV-YOD-SPELLING'); // preserve lexical timing; no unsupported early tense frame
move('מסעדה','MODALS-CAN-NEED-MUST');move('משרד','MODALS-CAN-NEED-MUST');
move('טעות','EMBEDDED-CLAUSES');move('עניין','IM-WITH');
move('אמנות','ROOTS');
// Rebalance returns after the earlier introductions, using words that fit their existing contexts.
move('מחברת','PAAL');move('מורה','PAAL');
move('מנוחה','PERMISSION-IMMINENCE');move('נסיעה','PERMISSION-IMMINENCE');move('טיול','PERMISSION-IMMINENCE');
move('סעיף','PASSIVE-HUFAL');move('אישור','PASSIVE-HUFAL');
// Follow the actual letter and response prerequisites, including the newly moved groups.
move('תא','QUESTIONS-BASIC');move('מילון','VAV');move('תמונה','VOWELS-OU');
move('מקום','PERMISSION-REQUESTS');move('עיר','HET-AYIN-RESH');
move('אורז','PREFIXES-BL-SHEL');move('שמן','PREFIXES-BL-SHEL');
move('עוד','HET-AYIN-RESH');move('עכשיו','HET-AYIN-RESH');move('רגע','HET-AYIN-RESH');
move('עץ','INFINITIVE-WANT');move('עין','NOUN-PLURALS');move('רגל','PRONUNCIATION-KH-R');
move('כל','EXISTENCE-POSSESSION');move('שנה','EXISTENCE-POSSESSION');move('נו','EXISTENCE-POSSESSION');
move('מתי','PREFIXES-MHV');move('איזה / איזו','NOUN-GENDER');move('עזרה','REPAIR-CONVERSATION');
move('בוקר','PREP-SUFFIXES-ME-HIM-HER');
surface('לך / לכי / לכו','הלך–הולך','go / walk; present masculine/feminine singular now; commands next',['הולך','הולכת']);
surface('רד / רדי / רדו','ירד–יורד','go down; learner form לרדת now; command forms in BEGED-KEFET return',['לרדת']);
surface('קח / קחי / קחו','לקח–לוקח','take; learner form לקחת now; commands in HOME-VISIT return',['לקחת']);
const structural={NOMINAL:['אני','לא'],'QUESTIONS-BASIC':['מי','מה','אתה','את','אתם','אתן'],VAV:['הוא','היא','הם','הן'],'PREFIXES-MHV':['מ־','ה־','ו־'],'DEMONSTRATIVES-SG':['זה','זאת'],'PREFIXES-BL-SHEL':['ב־','ל־','של','לי'],'EXISTENCE-POSSESSION':['יש','אין'],'NOUN-PLURALS':['אלה'],'PERMISSION-REQUESTS':['אפשר'],'DIRECT-OBJECT-ET':['את'],'MODALS-CAN-NEED-MUST':['יכול','צריך','חייב'],'IM-WITH':['עם'],'PREP-SUFFIXES-US-THEM':['אנחנו'],'PERMISSION-IMMINENCE':['מותר','אסור','עומד ל־'],'EMBEDDED-CLAUSES':['ש־'],'COUNTERFACTUAL':['אילו'],'PURPOSE-CLAUSES':['כדי'],'FUTURE-YOU-COMMANDS':['אל']};
for(const l of lessons)for(const t of l.targets)t.kind=structural[l.key]?.includes(t.originalHe)?'structure':'vocabulary';
function teach(key,title,pre,outcome,reason,teaching,examples){Object.assign(at[key],{outcome,reason,edited:true});at[key].values[1]=title;at[key].values[2]=pre;at[key].values[5]=teaching+' Learn → Check → Vocabulary → Apply → Continue. New examples are authored draft wording; final native audio and curated Nikkud require Guy’s review.';if(examples)at[key].values[6]=examples.map(([prompt,answer],i)=>(i+1)+'. '+prompt+'\n→ '+answer).join('\n\n');}
require('./teaching.cjs')({at,teach,move});
const replacements=Object.fromEntries(lessons.filter(l=>l.id!==l.previousId).map(l=>[l.previousId,l.id]));replacements['PRONOUNS-A2']='NOMINAL-A2 / QUESTIONS-BASIC-A2 / VAV-A2';
for(const l of lessons){l.values[0]=l.id;for(const c of [2,5,6])for(const [a,b]of Object.entries(replacements))l.values[c]=l.values[c].split(a).join(b);}
const baseTokens=new Set(tokens.map(t=>t.token));const used=lessons.flatMap(l=>l.targets.map(t=>t.token));
const missing=[...baseTokens].filter(t=>!used.includes(t));if(missing.length)throw Error('Unallocated targets: '+missing.join(', '));
const duplicate=used.filter((t,i)=>used.indexOf(t)!==i);if(duplicate.length)throw Error('Duplicate targets '+duplicate);
const plan={...base,status:'Owner-authorized A2 revision; new wording remains draft',date:'2026-10-26',letterGroups:[[2,'מנתל'],[5,'אהי'],[8,'ו'],[11,'שזד'],[14,'ברצ'],[17,'כפג'],[20,'חע'],[23,'קסט']],lessons,idChanges:replacements,retiredStandaloneLesson:'PRONOUNS-A2',questionLesson:'QUESTIONS-BASIC-A2 at 7 only',countPolicy:'Primary grammatical operators/pronouns and new inflections do not count as extra vocabulary. New noun, action, number and expression meanings do. All source entries remain allocated once.',countExceptions:[{id:'NOMINAL-A2',vocabulary:3,reason:'At the first sentence lesson, the known letters and self-identification frame support three useful new lexical items: היי, אמן and מנהל. Guy’s latest practicability requirement takes priority over padding the six-word floor with unusable nouns. Other nouns move to questions, where short offers and identification questions make them usable.'}]};
fs.writeFileSync(dir+'plan.json',JSON.stringify(plan,null,2));
console.log(JSON.stringify({lessons:lessons.length,targets:used.length,under:lessons.filter(l=>l.pos>4&&l.targets.filter(t=>t.kind==='vocabulary').length<6).map(l=>({pos:l.pos,key:l.key,lexical:l.targets.filter(t=>t.kind==='vocabulary').length,words:l.targets.map(t=>t.he)})),over:lessons.filter(l=>l.targets.filter(t=>t.kind==='vocabulary').length>12).map(l=>({key:l.key,n:l.targets.length}))},null,2));
