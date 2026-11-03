import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve('docs/curriculum/first2-implementation-20261030');
const source=id=>JSON.parse(readFileSync(resolve(root,id+'.json'),'utf8'));
const m=source('MEMORY-A2'),l=source('MNTL-A2');
const esc=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text=(s,i)=>s.paragraphs[i].paragraph.elements.map(e=>e.textRun?.content||'').join('').trim();
const html=(s,...indices)=>indices.map(i=>'<p>'+s.paragraphs[i].paragraph.elements.map(e=>{const r=e.textRun;if(!r)return '';const v=esc(r.content.replace(/\n$/,''));return r.textStyle?.bold?'<strong>'+v+'</strong>':v;}).join('')+'</p>').join('');
const value=(s,i)=>text(s,i).replace(/^[^:]+:\s*/,'');
const quoted=(s,i)=>text(s,i).match(/“([\s\S]+)”/)?.[1]||value(s,i);
const screen=(s,i)=>{const [title,id]=text(s,i).replace(/^Screen \d+: /,'').split(' · ');return {id,type:'reading',title,gate:'none',stage:'Learn'};};
const activity=(id,kind,extra={})=>({...extra,id,kind});
const memory=[
 {...screen(m,9),html:html(m,12,13,14,15)},
 {...screen(m,17),html:html(m,18,19)},
 {...screen(m,22),html:html(m,24,25),prompt:value(m,29),activity:activity('MEMORY-A2.embedded.number-first','memory-first',{value:'0704177609112001',durationMs:10000,feedback:{partial:quoted(m,31),exact:quoted(m,32)}})},
 {...screen(m,35),html:html(m,37),activity:activity('MEMORY-NUMBER-TO-DATES','date-connection',{stages:['0704177609112001','07041776 · 09112001','07/04/1776 · 09/11/2001'],descriptions:['The original sixteen digits.','The same digits, grouped into two sets of eight.','Slashes show the month, day and year within each group.'],after:html(m,40,41,42,43),principles:[45,46,47].map(i=>{const t=text(m,i),pos=t.indexOf(':');return {title:t.slice(0,pos+1),text:t.slice(pos+1).trim()};})})},
 {...screen(m,49),type:'choice',html:html(m,51,52),prompt:value(m,54),options:[56,57,58].map(i=>text(m,i).slice(3)),answer:1,activity:activity('MEMORY-A2.embedded.what-changed','application-choice',{feedback:[60,61,62].map(i=>quoted(m,i)),showCorrectFeedback:true})},
 {...screen(m,65),html:html(m,67,68),prompt:value(m,70),activity:activity('MEMORY-A2.embedded.number-return','memory-comparison',{value:'0704177609112001',dates:'07/04/1776 · 09/11/2001',feedback:{exact:quoted(m,73),reverse:quoted(m,74),zeros:quoted(m,75),dayMonth:quoted(m,76),partial:quoted(m,77),empty:quoted(m,78)}})},
 {id:'MEMORY-A2.continue',type:'complete',title:'Continue',html:html(m,84),gate:'none',stage:'Continue'}
];
const assetsFile=process.argv[2],assets=assetsFile?JSON.parse(readFileSync(assetsFile,'utf8')):{};
const letters=['מ','נ','ת','ל'],sounds=['/m/','/n/','/t/','/l/'],names=['m','n','t','l'];
const items=letters.map((letter,i)=>({id:names[i],letter,sound:sounds[i],...assets[names[i]]}));
const lettersPages=[
 {...screen(l,9),html:html(l,15),activity:activity('MNTL-A2.teach-four','letter-gallery',{items:items.map((item,i)=>({...item,text:html(l,11+i),alt:['Original mountain and climber mnemonic','Original nose mnemonic','Original tripping mnemonic','Original ladle mnemonic'][i]}))})},
 {...screen(l,19),type:'choice',html:html(l,21),prompt:value(l,23),options:letters,answer:1,activity:activity('MNTL-A2.embedded.nun','letter-choice',{...items[1],feedback:[value(l,31),value(l,32),'ת represents /t/. The sound you heard was /n/.','ל represents /l/. The sound you heard was /n/.']})},
 {...screen(l,35),html:html(l,37,38),prompt:value(l,41),activity:activity('MNTL-A2.embedded.copy-lamed','letter-input',{answer:'ל',copy:true,feedback:value(l,43)})},
 {id:'MNTL-A2.check.tav',type:'choice',title:'Check your understanding',stage:'Check',prompt:value(l,47),options:[49,50,51,52].map(i=>text(l,i).slice(3)),answer:1,activity:activity('MNTL-A2.check.tav','letter-choice',{feedback:[54,55,56,57].map(i=>value(l,i))})},
 {id:'MNTL-A2.apply.four-sounds',type:'reading',title:'Match sounds and letters',stage:'Apply',prompt:value(l,62),activity:activity('MNTL-A2.apply.four-sounds','letter-matching',{items,options:['ת','ל','מ','נ'],feedback:value(l,70)})},
 {id:'MNTL-A2.apply.mem',type:'reading',title:'Recall the printed letter',stage:'Apply',prompt:value(l,73),activity:activity('MNTL-A2.apply.mem','letter-input',{...items[0],answer:'מ',feedback:value(l,76)})},
 {id:'MNTL-A2.apply.lamed',type:'reading',title:'Recall another letter',stage:'Apply',prompt:value(l,79),activity:activity('MNTL-A2.apply.lamed','letter-input',{...items[3],answer:'ל',feedback:value(l,82)})},
 {id:'MNTL-A2.apply.say-four',type:'reading',title:'Read aloud (optional)',stage:'Apply',prompt:value(l,85),activity:activity('MNTL-A2.apply.say-four','self-check',{items:[items[3],items[0],items[2],items[1]],feedback:value(l,87)})},
 {id:'MNTL-A2.continue',type:'complete',title:'Continue',stage:'Continue',html:html(l,89)}
];
const lesson=(id,title,pages,letters)=>({id,contentId:id,title,chapter:'Getting started',minutes:id==='MEMORY-A2'?7:8,letters,introducedLetters:letters,wordIds:[],exerciseIds:[],checkExerciseIds:[],compositionVersion:2,provenance:{kind:'human-authored',label:'Guy’s course material, adapted for local testing',sourceDocument:'1ZC5w2lc89mwGQ1AtwMVQAKwwoaD8GU3PaCNmPPcgtYY',sourceRevision:m.sourceRevision,localTestingAuthorized:'2026-10-30',finalAcceptance:'pending'},blocks:[{id:id+'-interactive',type:'explanation',source:'inline',renderer:'text',text:'',textPages:{version:1,activityVersion:1,pages,order:pages.map(p=>p.id)}}]});
const pack={version:1,sourceRevision:m.sourceRevision,retiredUnpublishedPageIds:['MNTL-A2.learn.tav-lamed'],lessons:[lesson('MEMORY-A2','How memory works',memory,''),lesson('MNTL-A2','Letters 1: מנתל — four consonants',lettersPages,'מנתל')]};
mkdirSync(resolve('content/first2'),{recursive:true});writeFileSync(resolve('content/first2/lessons.json'),JSON.stringify(pack,null,2)+'\n');console.log(JSON.stringify({lessons:pack.lessons.map(l=>l.id),pages:pack.lessons.map(l=>l.blocks[0].textPages.pages.length),sourceRevision:pack.sourceRevision}));
await import('./revise-first2-feedback.mjs');
