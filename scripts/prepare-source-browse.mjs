import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {JSDOM} from 'jsdom';
import {parseArgs} from 'node:util';
import path from 'node:path';
import {buildSourceVocabulary,validateSourceBrowse} from '../src/source-vocabulary.js';
const {values}=parseArgs({options:{capture:{type:'string'},native:{type:'string'},catalogue:{type:'string'},published:{type:'string'},output:{type:'string'}}});
for(const key of ['capture','native','catalogue','published','output'])assert.ok(values[key],'Supply --'+key);
fs.mkdirSync(values.output,{recursive:true});
const output=name=>path.join(values.output,name);
const read=f=>JSON.parse(fs.readFileSync(f,'utf8').replace(/^\uFEFF/,''));
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const capture=read(values.capture),native=read(values.native),catalogue=read(values.catalogue),original=read(values.published);
const exact=s=>s.replace(/\s+/gu,' ').trim();
const posts=original.lessons.flatMap(l=>[{...l,parent:l.id,kind:'lesson'},...l.topics.map(t=>({...t,parent:l.id,kind:'topic'}))]);
const pairIndex=new Map();
for(const post of posts){const dom=new JSDOM(post.content);for(const tr of dom.window.document.querySelectorAll('tr')){const cells=[...tr.querySelectorAll(':scope > td')],he=cells.find(c=>/^Hebrew$/i.test(c.dataset.label||'')),en=cells.find(c=>/^English$/i.test(c.dataset.label||''));if(!he||!en)continue;const pair=JSON.stringify([exact(he.textContent),exact(en.textContent)]);if(!pairIndex.has(pair))pairIndex.set(pair,[]);pairIndex.get(pair).push({postId:post.id,parent:post.parent,kind:post.kind,title:post.title,contentSha256:hash(post.content)});}dom.window.close();}
const sourceCatalogue={kind:'original-source-catalogue-metadata',id:'wp-course-'+catalogue.courseId,externalId:catalogue.courseId,title:catalogue.title,evidenceSha256:hash(catalogue),lessons:catalogue.lessons.map(l=>({...l,externalId:l.id,id:'wp-lesson-'+l.id,topics:l.topics.map(t=>({...t,externalId:t.id,id:'wp-topic-'+t.id}))}))};
const records=capture.sourceRecords.records.map(r=>{
 const [_,lesson,part,,,,he,en]=r.values,ref=String(lesson),pairs=pairIndex.get(JSON.stringify([exact(String(he)),exact(String(en))]))||[];
 const titleMatches=catalogue.lessons.filter(l=>{const m=l.title.match(/^Lesson (\d+)-(\d+):/);return m&&m[1]+'.'+m[2]===ref;});
 const uniqueParents=[...new Set(pairs.map(p=>p.parent))];
 let links=[],evidence=[];
 if(titleMatches.length===1){const l=titleMatches[0];links=[{id:'wp-lesson-'+l.id,externalId:l.id,title:l.title}];evidence=[{method:'exact-original-lesson-title-label',sourceLesson:lesson,sourcePart:part,originalTitle:l.title,originalId:l.id}];}
 else if(uniqueParents.length===1){const l=catalogue.lessons.find(l=>l.id===uniqueParents[0]);links=[{id:'wp-lesson-'+l.id,externalId:l.id,title:l.title}];evidence=pairs.map(p=>({method:'html-decoded-exact-hebrew-english-pair',sourceHebrew:he,sourceEnglish:en,postId:p.postId,parentId:p.parent,contentSha256:p.contentSha256}));}
 return {sourceId:r.values[30],sourceRow:r.row,sourceLesson:lesson,sourcePart:part,links,evidence,status:links.length?'source-catalogue-linked':'unresolved-source-association',gatedLessonId:null,introductionAction:null,learnedFormAdditions:[]};
});
const groups=[...new Set(records.map(r=>JSON.stringify([r.sourceLesson,r.sourcePart])))].map(key=>{const group=records.filter(r=>JSON.stringify([r.sourceLesson,r.sourcePart])===key);return {sourceLesson:group[0].sourceLesson,sourcePart:group[0].sourcePart,sourceIds:group.map(r=>r.sourceId),linked:group.filter(r=>r.links.length).length,unresolved:group.filter(r=>!r.links.length).length};});
// Exact original form fingerprints reconcile text-lesson references without
// interpreting decimal order or mapping them to the synthetic application course.
const originalTexts=original.lessons.map(l=>({id:l.id,title:l.title,text:[l,...l.topics].map(p=>{const d=new JSDOM(p.content),text=exact(d.window.document.body.textContent);d.window.close();return text;}).join(' ')}));
for(const group of groups){
 if(!String(group.sourceLesson).includes('.')||String(group.sourceLesson).split('.').length===2&&group.sourceLesson!==5.5)continue;
 const originals=capture.sourceRecords.records.filter(r=>group.sourceIds.includes(r.values[30]));
 const tokens=[...new Set(originals.flatMap(r=>[6,10,13,14,19,20,21,22,23,24,25,26,27,28,29].map(i=>String(r.values[i]))).filter(t=>t.length>=4))];
 const ranked=originalTexts.map(p=>({...p,hits:tokens.filter(t=>p.text.includes(t))})).sort((a,b)=>b.hits.length-a.hits.length);
 const best=ranked[0],second=ranked[1];
 group.fingerprintCandidates=ranked.slice(0,2).map(p=>({externalId:p.id,title:p.title,matched:p.hits.length,total:tokens.length}));
 const anchors=records.filter(r=>group.sourceIds.includes(r.sourceId)&&r.links.length),anchorParents=[...new Set(anchors.flatMap(r=>r.links.map(l=>l.externalId)))];
 const anchored=anchors.length>=4&&anchorParents.length===1;
 const fingerprint=tokens.length>=4&&best.hits.length/tokens.length>=.75&&best.hits.length>=second.hits.length*2||tokens.length>=20&&best.hits.length/tokens.length>=.9&&second.hits.length/best.hits.length<.8;
 if(fingerprint||anchored){
  const target=fingerprint?best:originalTexts.find(p=>p.id===anchorParents[0]);
  group.association={id:'wp-lesson-'+target.id,externalId:target.id,title:target.title};
  group.evidence=fingerprint?{method:'exact-original-form-fingerprint-within-unchanged-Lesson-Part-group',matchedSourceText:best.hits,matched:best.hits.length,total:tokens.length,nextCandidateMatches:second.hits.length,originalPostIds:[best.id,...catalogue.lessons.find(l=>l.id===best.id).topics.map(t=>t.id)],catalogueDigest:hash(catalogue)}:{method:'unchanged-source-Lesson-Part-group-with-four-or-more-exact-unique-pair-anchors',anchors:anchors.map(r=>({sourceId:r.sourceId,evidence:r.evidence})),catalogueDigest:hash(catalogue)};
  for(const r of records.filter(r=>group.sourceIds.includes(r.sourceId))){r.links=[group.association];r.evidence=[group.evidence];r.status='source-catalogue-linked';}
 }
 group.linked=records.filter(r=>group.sourceIds.includes(r.sourceId)&&r.links.length).length;group.unresolved=group.sourceIds.length-group.linked;
}
const mappingLedger={version:1,catalogueDigest:hash(catalogue),method:'Exact original lesson labels or unique original post containing exact decoded Hebrew/English pair; no numeric sorting, Part merge or introduction inference.',records,groups};
const source=buildSourceVocabulary(capture,native,{catalogue:sourceCatalogue,mappingLedger,authorization:{instruction:'Do it',assignmentId:'e152460c-105a-4c75-8950-185a624bb89c',scope:'Exact human-authored Masterfile source browsing only; no lesson eligibility, identity hold, generated text or proposed slot approval.',authorizedAt:'2026-10-20'}});
validateSourceBrowse(source);
assert.equal(source.counts.visibleSourceRecords+source.counts.heldIdentityRecords+source.counts.emptyRecords,1058);
fs.writeFileSync(output('source-browse-private.json'),JSON.stringify(source));
fs.writeFileSync(output('MAPPING_LEDGER.json'),JSON.stringify(mappingLedger,null,2));
const receipt={digest:source.digest,counts:source.counts,catalogue:{lessons:sourceCatalogue.lessons.length,topics:sourceCatalogue.lessons.reduce((n,l)=>n+l.topics.length,0)},mapping:{linked:records.filter(r=>r.links.length).length,unresolved:records.filter(r=>!r.links.length&&r.sourceId!=='mf-000647').length,groups:groups.length},categories:Object.fromEntries(Object.keys(source.counts.categories).map(c=>[c,source.rows.filter(r=>r.category===c).slice(0,2).map(r=>({wordKey:r.wordKey,hebrew:r.hebrew.text,english:r.english.text,sourceIds:r.sourceEntries.map(e=>e.sourceId)}))]))};
fs.writeFileSync(output('SOURCE_ADOPTION_PREVIEW.json'),JSON.stringify(receipt,null,2));
console.log(JSON.stringify(receipt,null,2));
