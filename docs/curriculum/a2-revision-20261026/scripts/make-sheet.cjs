const fs=require('fs');const dir='.curriculum-a2-revision-20261026/';
const read=n=>JSON.parse(fs.readFileSync(dir+n+'.json','utf8'));
const plan=read('plan'),audit=read('audit'),source=read('source'),meta=read('metadata');
for(const k of ['missing','duplicates','unknown','letters','dependencies','gram'])if(audit[k].length)throw Error(k);
if(audit.lessonCount!==116||audit.entryCount!==1088||audit.practiceCount!==1088)throw Error('Coverage');
const sheetId=102626001,spreadsheet_id='1jlSH8qDBt3nwv90J_2IKkL-pzbRx3USW522KqtXR0Nc';
const base=JSON.parse(fs.readFileSync('docs/curriculum/a2-20261026/route.json','utf8'));
const snapshot=source.sheets.find(s=>s.properties.sheetId===sheetId).data[0].rowData;
const current=base.lessons.map(l=>l.id),requests=[],rowMoves=[];
// Park the absorbed pronoun row once, avoiding a separate upward move for every later lesson.
const retired=current.indexOf('PRONOUNS-A2');
requests.push({moveDimension:{source:{sheetId,dimension:'ROWS',startIndex:retired+3,endIndex:retired+4},destinationIndex:current.length+3}});
rowMoves.push({id:'PRONOUNS-A2',from:retired+4,to:current.length+3});current.push(current.splice(retired,1)[0]);
for(let i=0;i<plan.lessons.length;i++){
 const id=plan.lessons[i].previousId,j=current.indexOf(id);if(j<i)throw Error('Invalid permutation');
 if(j!==i){const r={moveDimension:{source:{sheetId,dimension:'ROWS',startIndex:j+3,endIndex:j+4},destinationIndex:i+3}};requests.push(r);rowMoves.push({id,from:j+4,to:i+4});current.splice(i,0,current.splice(j,1)[0]);}
}
if(current.at(-1)!=='PRONOUNS-A2')throw Error('Wrong retired row');
requests.push({deleteDimension:{range:{sheetId,dimension:'ROWS',startIndex:119,endIndex:120}}});
const rgb=h=>({red:parseInt(h.slice(1,3),16)/255,green:parseInt(h.slice(3,5),16)/255,blue:parseInt(h.slice(5,7),16)/255});
const amber=rgb('#fff0c2');
const allRows=structuredClone(snapshot.slice(0,3));const changed=[];
function change(cell,value,note,highlight=false){const x=structuredClone(cell||{});x.userEnteredValue=typeof value==='number'?{numberValue:value}:{stringValue:value};delete x.textFormatRuns;if(note)x.note=note+(x.note?'\n\nHistorical note retained (earlier timing may be superseded):\n'+x.note:'');if(highlight){x.userEnteredFormat??={};x.userEnteredFormat.backgroundColor=amber;x.userEnteredFormat.backgroundColorStyle={rgbColor:amber};}return x;}
for(const l of plan.lessons){
 const old=snapshot[l.previousPos+2].values,cells=structuredClone(old);while(cells.length<13)cells.push({});
 for(let c=0;c<7;c++)if(l.values[c]!==old[c]?.userEnteredValue?.stringValue){cells[c]=change(cells[c],l.values[c],`Owner-authorized A2 revision, 26 October 2026. Current lesson ${l.id}, position ${l.pos}. ${c===0?'Previous A2 ID: '+l.previousId+'. Source A identity remains unchanged.':c===4?'One introduction-practice model per allocated entry. Models are proposed wording, not final linguistic/audio approval.':l.reason||'Vocabulary practicability and cumulative prerequisite revision.'}`,c>=2);changed.push({id:l.id,column:c+1});}
 cells[7].userEnteredValue={formulaValue:'=ROW()-3'};
 const revised=changed.some(x=>x.id===l.id);const oldStatus=old[10]?.userEnteredValue?.stringValue||'RETAINED';
 if(revised)cells[10]=change(cells[10],oldStatus==='NEW LESSON'?'NEW LESSON · REVISED':'REVISED',null,true);
 cells[11]=change(cells[11],l.outcome);
 cells[12]=change(cells[12],l.reason+(l.pos>4?' Every allocated entry has an introduction model in E; grammatical targets are excluded from the additional-vocabulary count.':''));
 if(l.oldPos){cells[9].userEnteredFormat??={};cells[9].userEnteredFormat.textFormat??={};cells[9].userEnteredFormat.textFormat.link={uri:`https://docs.google.com/spreadsheets/d/${spreadsheet_id}/edit#gid=102617001&range=A${l.oldPos+3}:G${l.oldPos+3}`};}
 allRows.push({values:cells});
}
allRows[0].values[0]=change(allRows[0].values[0],'A2 REVISED');
allRows[0].values[1]=change(allRows[0].values[1],'Spiral A2 — early expression · owner-authorized revision · 26 October 2026');
allRows[1].values[0]=change(allRows[1].values[0],'116 lessons');
allRows[1].values[1]=change(allRows[1].values[1],'116 lessons · 1,088 source entries retained · 1,088 introduction-practice models · 22 letters completed at lesson 23. Additional vocabulary excludes structural targets. Lesson 6 has a documented three-word exception. Final wording/Nikkud/audio remain for human review.');
allRows[1].values[7]=change(allRows[1].values[7],'Legend: amber C–G = revised content or practice; green = lesson added to A; A–B retain topic-family colors. H–M show position, source, change and rationale. Earlier source text is retained in notes.');
allRows[2].values[3]=change(allRows[2].values[3],'Additional vocabulary + structural targets');
allRows[2].values[4]=change(allRows[2].values[4],'Practice for every introduced item · draft models');
const footers=[
 ['Reading the comparison','A–B keep the same topic-family palette. Amber C–G marks changes from source A, including revised introduction practice. Green denotes an A2 addition. Original source text and prior notes are retained. H gives position, while stable content IDs remain independent of order.'],
 ['Preserve','Integrated literacy, familiar-to-new connections, Learn/Check/Vocabulary/Apply/Continue, native audio, human Nikkud review and every source vocabulary entry. Original A remains intact.'],
 ['Improve','Identify and correct at 6; questions at 7 only; greetings/thanks/names at 11; gender at 12–13; singular present at 15; ל before לי at 16; commands at 18; availability at 19; wanted actions at 21; permission at 24; repair at 26.'],
 ['Question vocabulary','The existing QUESTIONS-BASIC lesson moved to 7. There is no later question-word grammar unit. מתי 10; איזה/איזו 13; איפה 17; לאן 18; איך 26; כמה 27; למה/האם 31. Every first use has an available reply or task.'],
 ['Spacing check','Letter lessons remain at 2,5,8,11,14,17,20,23: exactly two intervening lessons. Opening exceptions: nominal→questions 6→7; questions→integration 7→9 adds vocabulary only; demonstratives→gender 12→13 is the explicitly connected two-part introduction.'],
 ...audit.gaps.filter(g=>g.from>30).map(g=>['Inherited broad-color flag',`${g.from} ${plan.lessons[g.from-1].id} → ${g.to} ${plan.lessons[g.to-1].id}: both ${g.family}. These are retained integration/reuse relationships, not new repeated grammar introductions.`]),
 ['Vocabulary audit','All 1,088 source entries occur once; E supplies one practicable model each. Extra vocabulary counts exclude primary grammatical operators, pronouns and reused inflections. Lesson 6 has three new lexical items (היי, אמן, מנהל); usable content takes priority over padding the six-word floor. Other lessons from 5 have 6–12 additional lexical meanings.'],
 ['Provenance','Guy authorized the sequence and vocabulary revision. New practice wording remains an authored proposal for editorial/Nikkud/audio review. Existing video recordings were not re-inspected for this revision. The source-entry identity and original lesson allocation remain in the vocabulary crosswalk.'],
 ['Imperatives','Four familiar actions, staged before mixed practice: בוא/בואי/בואו, שב/שבי/שבו, תן/תני/תנו, לך/לכי/לכו. הולך/הולכת precedes the go commands; ללכת follows. Model tone, relationship and context; do not invent a לא + imperative rule.'],
 ['Settled choices','Pronouns by person, including available plural forms; first present lesson masculine/feminine singular, plurals later; /o/ in first vowel lesson; Kubutz when pointed text uses it; no later general question lesson. כ/פ/ג load and total early workload remain candidates for learner testing.'],
 ['Publication boundary','Updated only this alternative tab and curriculum artifacts. No source-A replacement, app import/publication, learner-progress migration or live WordPress edit is part of this revision.']
];
if(footers.length!==15)throw Error('Footer layout');
for(let i=0;i<footers.length;i++){const cells=structuredClone(snapshot[120+i].values);cells[0]=change(cells[0],footers[i][0]);cells[1]=change(cells[1],footers[i][1]);allRows.push({values:cells});}
requests.push({updateCells:{start:{sheetId,rowIndex:0,columnIndex:0},rows:allRows,fields:'userEnteredValue,note,textFormatRuns,userEnteredFormat'}});
const originalRules=meta.sheets.find(s=>s.properties.sheetId===sheetId).conditionalFormats;
const rules=[];
for(const r of originalRules){const match=r.booleanRule.condition.values[0].userEnteredValue.match(/\$A4="([^"]+)"/);const family=base.lessons.find(l=>l.id===match[1]).family;const ids=plan.lessons.filter(l=>l.family===family).map(l=>l.id);if(!ids.length)continue;const copy=structuredClone(r);copy.ranges[0].endRowIndex=119;copy.booleanRule.condition.values[0].userEnteredValue='=OR('+ids.map(id=>`$A4="${id}"`).join(',')+')';rules.push(copy);}
for(let i=originalRules.length-1;i>=0;i--)requests.push({deleteConditionalFormatRule:{sheetId,index:i}});
rules.forEach((rule,index)=>requests.push({addConditionalFormatRule:{index,rule}}));
requests.push({setBasicFilter:{filter:{range:{sheetId,startRowIndex:2,endRowIndex:119,startColumnIndex:0,endColumnIndex:13}}}});
requests.push({updateDimensionProperties:{range:{sheetId,dimension:'COLUMNS',startIndex:4,endIndex:5},properties:{pixelSize:430},fields:'pixelSize'}});
requests.push({autoResizeDimensions:{dimensions:{sheetId,dimension:'ROWS',startIndex:3,endIndex:119}}});
fs.writeFileSync(dir+'write-request.json',JSON.stringify({spreadsheet_id,requests,include_spreadsheet_in_response:false}));
fs.writeFileSync(dir+'expected.json',JSON.stringify({rows:allRows,rules,rowMoves,changed,removed:'PRONOUNS-A2',footerStart:119},null,2));
console.log(JSON.stringify({requests:requests.length,rowMoves,changedCells:changed.length,rows:allRows.length,bytes:fs.statSync(dir+'write-request.json').size}));
