// Verifies fixture evidence and expectations' source coverage; does not run the app.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const root=__dirname;
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const pack=read(path.join(root,'FIXTURES.json'));
const source=path.resolve(root,'../lexeme-consolidation-20261018');
const original=read(path.join(source,'SUPPLIED_BINDINGS.json'));
const snapshot=read(path.join(source,'SOURCE_SNAPSHOT.json'));
const rawBindings=[...original.bindings,...original.documentBindings];
let checks=0;
const check=(fn)=>{fn();checks++;};
check(()=>assert.equal(pack.sourceApproval,false));
check(()=>assert.equal(pack.syntheticContext,true));
check(()=>assert.equal(pack.slotMap.length,42));
check(()=>assert.equal(new Set(pack.slotMap.map(m=>m.semanticSlot)).size,42));
check(()=>assert.equal(new Set(pack.slotMap.map(m=>m.inventorySlot)).size,42));
const schema=read(pack.sourceInputs[0].path);
check(()=>assert.deepEqual(pack.slotMap.map(m=>m.semanticSlot),schema.lessonSettings.slotIds));
for(const input of pack.sourceInputs) check(()=>assert.equal(hash(input.path),input.sha256));
// Verify the local inventory really matches the inventory explicitly supplied by UX.
const suppliedDir=path.join(path.dirname(pack.sourceInputs[1].path),'linguistic-handoff');
for(const name of ['LEXEME_GROUPS','SUPPLIED_BINDINGS','SOURCE_SNAPSHOT','LINGUISTIC_DRAFT_ADDITIONS'])
  check(()=>assert.equal(hash(path.join(source,name+'.json')),hash(path.join(suppliedDir,name+'.json'))));
for(const b of pack.bindings){
  const src=rawBindings.find(x=>x.bindingId===b.bindingId);
  check(()=>assert.ok(src,b.bindingId));
  for(const k of Object.keys(src))check(()=>assert.deepEqual(b[k],src[k],`${b.bindingId}:${k}`));
  if(b.provenanceTier==='exact-supplied-record'){
    const row=snapshot.records.find(r=>r.row===b.sourceRow);
    const index=snapshot.headers.indexOf(b.sourceField);
    check(()=>assert.ok(index>=0));
    check(()=>assert.equal(row.values[index],b.rawCell));
    check(()=>assert.equal(b.rawCell.slice(...b.sourceSpan),b.value));
    check(()=>assert.equal(row.values[30],b.sourceId));
  } else check(()=>assert.equal(b.provenanceTier,'supplied-secondary-document-binding-original-not-reopened'));
}
check(()=>assert.equal(new Set(pack.cases.map(c=>c.id)).size,pack.cases.length));
const semanticSlots=new Set(pack.slotMap.map(m=>m.semanticSlot));
for(const w of pack.fixtureWords){
  const slots=w.slots.filter(s=>s.semanticSlot);
  check(()=>assert.equal(slots.length,{verb:28,adjective:4,preposition:10}[w.category]));
  for(const s of slots)check(()=>w.activeInSuppliedWorkbook?assert.match(s.workbookCell,/^[A-Za-z]+![A-Z]+[0-9]+$/):assert.equal(s.workbookCell,null));
  for(const d of w.draftEvidence)check(()=>assert.equal(d.eligibleForLearnerDisplay,false));
  if(w.wordKey.includes(':adjective:000132')||w.wordKey.includes(':adjective:000317'))check(()=>assert.equal(w.activeInSuppliedWorkbook,false));
}
for(const c of pack.cases){
  check(()=>assert.ok(c.inputs.context.courseId.startsWith('TEST-ONLY:')));
  check(()=>assert.ok(c.inputs.context.lessonId.startsWith('TEST-ONLY:')));
  for(const event of c.inputs.slotIntroductions)
    for(const s of event.addSlots)check(()=>assert.ok(semanticSlots.has(s),`${c.id}:${s}`));
  for(const s of c.expected.visibleSlots??[]){
    check(()=>assert.ok(semanticSlots.has(s)));
    check(()=>assert.ok(pack.bindings.some(b=>b.groupKey===c.inputs.wordKey&&b.semanticSlot===s),`${c.id}:missing supplied binding ${s}`));
  }
  const reviewed=[...(c.inputs.simulatedReview?.bindingIds??[]),...Object.values(c.inputs.simulatedReviewByWord??{}).flatMap(r=>r.bindingIds)];
  for(const id of reviewed)check(()=>assert.ok(pack.bindings.some(b=>b.bindingId===id),`${c.id}:unknown reviewed binding ${id}`));
}
const get=id=>pack.cases.find(c=>c.id===id);
check(()=>assert.equal(get('P02-seven').expected.visibleSlots.length,7));
check(()=>assert.equal(get('P02-seven').expected.layout,'horizontal'));
check(()=>assert.equal(get('P03-ten').expected.visibleSlots.length,10));
check(()=>assert.equal(get('V03-all-28-unlocked-source-remains-incomplete').inputs.slotIntroductions[0].addSlots.length,28));
check(()=>assert.equal(get('V03-all-28-unlocked-source-remains-incomplete').expected.visibleSlots.length,6));
check(()=>assert.equal(get('V04-full-tense-layers-secondary-evidence').expected.visibleSlots.length,24));
const say=pack.fixtureWords.find(w=>w.wordKey===pack.words.say);
check(()=>assert.equal(say.slots.filter(s=>s.status==='draft-only').length,get('V03-all-28-unlocked-source-remains-incomplete').expected.unapprovedSlotCount));
check(()=>assert.deepEqual(say.slots.filter(s=>s.status==='missing').map(s=>s.semanticSlot),get('V03-all-28-unlocked-source-remains-incomplete').expected.missingSlots));
for(const c of pack.cases){
  const word=pack.fixtureWords.find(w=>w.wordKey===c.inputs.wordKey);
  for(const s of [...(c.expected.missingSlots??[]),...(c.expected.introducedButSourceMissing??[])])
    check(()=>assert.equal(word.slots.find(p=>p.semanticSlot===s)?.status,'missing',`${c.id}:${s}`));
  for(const s of c.expected.unapprovedSlots??[])
    check(()=>assert.equal(word.slots.find(p=>p.semanticSlot===s)?.status,'draft-only',`${c.id}:${s}`));
  for(const s of c.expected.inapplicableSlots??[])
    check(()=>assert.equal(word.slots.find(p=>p.semanticSlot===s)?.status,'not-applicable-in-source-sense',`${c.id}:${s}`));
}
check(()=>assert.equal(get('V02-partial-past-present').expected.sharedCells[0].cellCount,1));
check(()=>assert.equal(pack.bindings.find(b=>b.bindingId==='binding-00112').semanticSlot,'verb.past.they'));
for(const id of ['binding-00936','binding-00937'])check(()=>assert.equal(pack.bindings.find(b=>b.bindingId===id).mappingStatus,'proposed-linguistic-slot-assignment'));
const result={status:'PASS',scope:'Fixture integrity and exact source conservation only; no application behavior executed',checks,cases:pack.cases.length,words:pack.fixtureWords.length,exactBindings:pack.bindings.length,semanticSlots:42,linguisticApproval:false,applicationRuntimeTested:false,nativeRenderingTested:false,fixtureSha256:hash(path.join(root,'FIXTURES.json'))};
fs.writeFileSync(path.join(root,'VALIDATION.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
