// Deterministic adaptation of the reconciled human/editorial source. No live writes.
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {validateTextPages} from '../public/text-contract.js';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const pack=read('content/first2/lessons.json'),originalLetters=structuredClone(pack.lessons[1]);
const revision=read('docs/curriculum/memory-feedback-20261031/REVISION.json');
const receipt=read('docs/curriculum/memory-feedback-20261031/MASTER_UPDATE_VERIFIED.json');assert.equal(receipt.status,'PASS');
const esc=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const html=copy=>(copy.paragraphs||[]).map(s=>'<p>'+esc(s)+'</p>').join('')+(copy.numberedList?'<ol>'+copy.numberedList.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ol>':'');
const lesson=pack.lessons[0],block=lesson.blocks[0],old=block.textPages;
const pages=revision.pages.map(source=>{
 const baseline=old.pages.find(p=>p.id===source.id);assert.ok(baseline);
 const p={...baseline,title:source.title,type:source.id.endsWith('.continue')?'complete':'reading',gate:'none',html:html(source.copy)};
 delete p.activity;delete p.options;delete p.answer;delete p.prompt;delete p.explanation;
 if(source.emphasis)for(const phrase of source.emphasis)p.html=p.html.replace(esc(phrase),'<strong>'+esc(phrase)+'</strong>');
 if(source.prompt)p.prompt=source.prompt;
 if(source.activity){
  p.activity=structuredClone(source.activity);
  if(p.activity.kind==='date-connection'){
   const context=p.activity.dateContext;delete p.activity.dateContext;
   p.activity.after='<p>'+esc(context.introduction)+'</p><ul>'+context.events.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ul><p>'+esc(context.transition)+'</p>';
   p.activity.principleInteraction='expandable';
  }
 }
 if(source.inlineOptional){const o=source.inlineOptional;p.prompt=o.prompt;p.activity={...structuredClone(o.activity),optional:true,intro:html(o.copy),label:o.label};}
 return p;
});
block.textPages={...old,pages,order:revision.order};validateTextPages(block.textPages);
pack.memoryFeedbackTransition={retiredActivityIds:revision.retiredActivityIds,retiredTopLevelPageIds:revision.retiredTopLevelPageIds,movedActivity:revision.movedActivity,progressRemapped:false,history:'content/first2/history/revision5.json',strategy:'Revision-pinned records retained; no historical response rekeying.'};
lesson.provenance={...lesson.provenance,editorialSource:'docs/curriculum/memory-feedback-20261031/REVISION.json',editorialDate:'2026-10-31',finalAcceptance:'pending'};
pack.sourceRevision=receipt.currentGoogleDocRevision;lesson.provenance.sourceRevision=receipt.currentGoogleDocRevision;lesson.provenance.masterReceipt='docs/curriculum/memory-feedback-20261031/MASTER_UPDATE_VERIFIED.json';
assert.deepEqual(pack.lessons[1],originalLetters);
writeFileSync(new URL('../content/first2/lessons.json',import.meta.url),JSON.stringify(pack,null,2)+'\n');
console.log(JSON.stringify({pages:pages.length,order:revision.order,progressRemapped:false,MNTLUnchanged:true}));
