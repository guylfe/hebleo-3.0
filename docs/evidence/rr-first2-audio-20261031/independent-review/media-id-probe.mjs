import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const [root,out]=process.argv.slice(2),mod=p=>import(pathToFileURL(path.join(root,p)));
const {JSDOM}=await mod('node_modules/jsdom/lib/api.js');
const {validateTextPages}=await mod('public/text-contract.js');
const {validateSchema,semanticErrors}=await mod('schemas/tools/contracts.mjs');
const {mountTextReader}=await mod('public/text-reader.js');
const {Store,validateContent}=await mod('src/store.js');
const {replaceFirstTwo}=await mod('scripts/install-first2.mjs');
const {createServer}=await mod('src/server.js');
const pack=JSON.parse(fs.readFileSync(path.join(root,'content/first2/lessons.json')));
// Adapted from the prior independent probe; all fixtures and stores are disposable.
for(const l of pack.lessons)for(const p of l.blocks[0].textPages.pages){if(p.activity)delete p.activity.image;for(const i of p.activity?.items||[])delete i.image;}
const activity=(c,kind)=>c.lessons.flatMap(l=>l.blocks.flatMap(b=>b.textPages?.pages||[])).find(p=>p.activity?.kind===kind).activity;
const dump=s=>Object.fromEntries(s.db.prepare("SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name").all().map(({name})=>[name,s.db.prepare('SELECT * FROM "'+name+'" ORDER BY rowid').all()]));
const s=new Store(),c=replaceFirstTwo(s.snapshot(),pack).content;
const blob=s.db.prepare("SELECT sha256 FROM media_blobs WHERE mime_type='audio/wav' LIMIT 1").get();assert.ok(blob);
for(const alias of ['child-m.wav','different-parent.wav'])s.db.prepare('INSERT INTO media_aliases(path,sha256) VALUES (?,?)').run(alias,blob.sha256);
const server=createServer(s,{mediaRoot:path.join(out,'disposable-media')});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const report={startedAt:new Date().toISOString(),collisions:[],positiveRoutes:[],dispatch:[],syntheticAudio:true,auditoryVerification:false};
const post=async(route,value)=>{const response=await fetch('http://127.0.0.1:'+server.address().port+'/api/'+route,{method:'POST',headers:{'x-demo-user':'author-demo','content-type':'application/json'},body:JSON.stringify(value)});return {status:response.status,body:await response.json()};};
try{
 // Valid audio-bearing control uses the same local aliases as malformed cases.
 const gallery=activity(c,'letter-gallery');gallery.id='distinct-parent-gallery';gallery.audio='/media/different-parent.wav';gallery.items[0].audio='/media/child-m.wav';
 validateContent(c);assert.deepEqual(validateSchema('content-pack',c),[]);assert.deepEqual(semanticErrors(c),[]);
 for(const route of ['studio/draft','studio/publish','restore']){
  const value=route==='studio/draft'?{baseRevisionId:s.get('active'),expectedDraftToken:s.currentDraft()?.draftToken??null,content:c}:route==='studio/publish'?{baseRevisionId:s.get('active'),draftToken:s.currentDraft().draftToken}:s.backup();
  const r=await post(route,value);assert.equal(r.status,200,JSON.stringify(r));report.positiveRoutes.push({route,status:r.status});
 }
 const base=s.get('active');s.stage({baseRevisionId:base,expectedDraftToken:s.currentDraft()?.draftToken??null,content:c});
 const validDraft=s.get('draft'),backup=s.backup();
 const reject=async(route,body,label)=>{const before=dump(s),r=await post(route,body);assert.equal(r.status,400,label+JSON.stringify(r));assert.match(r.body.error,/activity item identity/);assert.deepEqual(dump(s),before,label+' changed persistent tables');return {route,label,status:r.status,error:r.body.error,allTablesUnchanged:true};};
 for(const kind of ['letter-gallery','letter-matching','self-check'])for(const mode of ['no-clips','child-only','different-parent-and-child','last-child']){
  const bad=structuredClone(c),a=activity(bad,kind);delete a.audio;for(const i of a.items)delete i.audio;
  const item=a.items[mode==='last-child'?a.items.length-1:0];a.id=item.id;
  if(mode!=='no-clips')item.audio='/media/child-m.wav';
  if(mode==='different-parent-and-child')a.audio='/media/different-parent.wav';
  const before=JSON.stringify(bad);assert.throws(()=>validateContent(bad),/activity item identity/);
  const p=bad.lessons.flatMap(l=>l.blocks.flatMap(b=>b.textPages?.pages||[])).find(p=>p.activity===a);
  assert.throws(()=>validateTextPages({version:1,activityVersion:1,pages:[p],order:[p.id]}),/activity item identity/);
  assert.deepEqual(validateSchema('content-pack',bad),[]);assert.ok(semanticErrors(bad).some(e=>JSON.stringify(e).includes('activity item identity')));
  assert.equal(JSON.stringify(bad),before);
  const boundaries=[];
  boundaries.push(await reject('studio/draft',{baseRevisionId:base,expectedDraftToken:s.currentDraft().draftToken,content:bad},'save'));
  s.set('draft',{...validDraft,content:bad});
  boundaries.push(await reject('studio/publish',{baseRevisionId:base,draftToken:s.currentDraft().draftToken},'defensive-publish'));s.set('draft',validDraft);
  for(const location of ['active','history','draft']){const b=structuredClone(backup);if(location==='active')b.content=bad;if(location==='history')b.revisionSnapshots.find(r=>r.revisionId===base).content=bad;if(location==='draft')b.draft.content=bad;boundaries.push(await reject('restore',b,'restore-'+location));}
  report.collisions.push({kind,mode,runtimeRejected:true,semanticRejected:true,validationInputUnchanged:true,boundaries});
 }
 assert.deepEqual(s.snapshot(),c);assert.deepEqual(s.get('draft'),validDraft);
 const dom=new JSDOM('<main></main>'),host=dom.window.document.querySelector('main');let played=[];
 dom.window.Audio=class{constructor(url){this.url=url;}play(){played.push(this.url);return Promise.resolve();}pause(){}};
 try{
  const sourcePages=pack.lessons.flatMap(l=>l.blocks[0].textPages.pages);
  for(const kind of ['letter-gallery','letter-matching','self-check','letter-input','letter-choice','application-choice']){
   const p=structuredClone(sourcePages.find(p=>p.activity?.kind===kind)),a=p.activity;a.id='parent-'+kind;a.audio='/media/parent-'+kind+'.wav';
   for(const [i,item]of (a.items||[]).entries())item.audio='/media/'+kind+'-child-'+i+'.wav';
   const v={version:1,activityVersion:1,pages:[p],order:[p.id]};validateTextPages(v);assert.deepEqual(validateSchema('text-pages',v),[]);
   const reader=mountTextReader(host,{textPages:v,dock:false});played=[];
   try{if(kind==='self-check')host.querySelector('[data-source-action="model"]').click();const requested=a.items||[a];for(const item of requested){const button=host.querySelector('[data-source-action="audio:'+item.id+'"]');assert.ok(button);button.click();}await Promise.resolve();assert.deepEqual(played,requested.map(i=>i.audio));report.dispatch.push({kind,expected:requested.map(i=>i.audio),played:[...played]});}finally{reader.destroy();}
  }
  const p=structuredClone(sourcePages.find(p=>p.activity?.kind==='letter-gallery')),q=structuredClone(p);q.id='second-gallery';q.activity.id='second-parent';
  validateTextPages({version:1,activityVersion:1,pages:[p,q],order:[p.id,q.id]});report.repeatedChildIdsOnDistinctPagesAccepted=true;
 }finally{dom.window.close();}
 report.pass=true;report.atomicHttpRejections=report.collisions.reduce((n,x)=>n+x.boundaries.length,0);report.finishedAt=new Date().toISOString();
 fs.writeFileSync(path.join(out,'media-id-probe.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({pass:report.pass,variants:report.collisions.length,atomicHttpRejections:report.atomicHttpRejections,validRoutes:report.positiveRoutes.length,dispatchFamilies:report.dispatch.length,dispatchUrls:report.dispatch.reduce((n,x)=>n+x.played.length,0),repeatedChildIdsOnDistinctPagesAccepted:true}));
}finally{await new Promise(r=>server.close(r));s.close();}
