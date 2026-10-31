import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {JSDOM} from 'jsdom';
import {Store,validateContent} from '../src/store.js';
import {createServer} from '../src/server.js';
import {replaceFirstTwo,installFirstTwo} from '../scripts/install-first2.mjs';
import {validateTextPages} from '../public/text-contract.js';
import {mountTextReader} from '../public/text-reader.js';
import {validateSchema,semanticErrors} from '../schemas/tools/contracts.mjs';

const pack=JSON.parse(readFileSync(new URL('../content/first2/history/revision5.json',import.meta.url)));
const legacyPack=JSON.parse(readFileSync(new URL('../docs/curriculum/first20-20261025/content.json',import.meta.url)));
const fixture=structuredClone(pack);
// Disposable fixtures omit optional files; source pack is never rewritten.
for(const l of fixture.lessons)for(const p of l.blocks[0].textPages.pages){if(p.activity)delete p.activity.image;for(const i of p.activity?.items||[])delete i.image;}
const activity=(c,kind)=>c.lessons.flatMap(l=>l.blocks[0].textPages?.pages||[]).find(p=>p.activity?.kind===kind).activity;
const pages=c=>c.lessons[0].blocks[0].textPages;
const dump=s=>Object.fromEntries(s.db.prepare("SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name").all().map(({name})=>[name,s.db.prepare('SELECT * FROM "'+name+'" ORDER BY rowid').all()]));
const cases={
 'gallery missing items':c=>delete activity(c,'letter-gallery').items,
 'date missing descriptions':c=>delete activity(c,'date-connection').descriptions,
 'duplicate matching item identities':c=>{const a=activity(c,'letter-matching');a.items[1].id=a.items[0].id;},
 'unsupported reader version':c=>pages(c).activityVersion=2,
 'string reader version':c=>pages(c).activityVersion='1',
 'null reader version':c=>pages(c).activityVersion=null,
 'activity without reader version':c=>delete pages(c).activityVersion,
 'kind and page type disagree':c=>pages(c).pages.find(p=>p.activity?.kind==='memory-first').type='complete',
 'legacy recall in source reader':c=>{const p=pages(c).pages[0];p.type='recall';p.answer='Fixture';p.grading='self-check';},
 'choice without source feedback owner':c=>delete pages(c).pages.find(p=>p.type==='choice').activity,
 'duplicate activity identities':c=>{const aa=pages(c).pages.filter(p=>p.activity);aa[1].activity.id=aa[0].activity.id;},
 'unknown activity kind':c=>activity(c,'memory-first').kind='unknown',
 'null activity':c=>pages(c).pages[0].activity=null,
 'memory missing feedback':c=>delete activity(c,'memory-first').feedback,
 'memory feedback missing branch':c=>delete activity(c,'memory-first').feedback.partial,
 'memory wrong duration':c=>activity(c,'memory-first').durationMs=9999,
 'numeric memory model':c=>activity(c,'memory-first').value=704,
 'comparison missing feedback':c=>delete activity(c,'memory-comparison').feedback,
 'comparison missing combined feedback branch':c=>delete activity(c,'memory-comparison').feedback.zeros,
 'unsupported comparison model':c=>activity(c,'memory-comparison').value='1234567890123456',
 'comparison missing dates':c=>delete activity(c,'memory-comparison').dates,
 'date numeric stage':c=>activity(c,'date-connection').stages[1]=123,
 'date changed digits':c=>activity(c,'date-connection').stages[1]='12345',
 'date missing final description':c=>activity(c,'date-connection').descriptions.pop(),
 'date description object':c=>activity(c,'date-connection').descriptions[1]={text:'bad'},
 'date missing principle text':c=>delete activity(c,'date-connection').principles[1].text,
 'date null principle':c=>activity(c,'date-connection').principles[0]=null,
 'date missing explanation':c=>delete activity(c,'date-connection').after,
 'gallery object items':c=>activity(c,'letter-gallery').items={},
 'gallery empty items':c=>activity(c,'letter-gallery').items=[],
 'gallery null item':c=>activity(c,'letter-gallery').items[0]=null,
 'gallery invalid item identity':c=>activity(c,'letter-gallery').items[0].id='bad/id',
 'gallery duplicate identity':c=>{const a=activity(c,'letter-gallery');a.items[1].id=a.items[0].id;},
 'gallery missing teaching text':c=>delete activity(c,'letter-gallery').items[0].text,
 'gallery image without alternative':c=>{const i=activity(c,'letter-gallery').items[0];i.image='/media/fixture.png';delete i.alt;},
 'input missing model':c=>delete activity(c,'letter-input').answer,
 'input array model':c=>activity(c,'letter-input').answer=['ל'],
 'input missing feedback':c=>delete activity(c,'letter-input').feedback,
 'input contradictory model reference':c=>{const a=activity(c,'letter-input');a.letter='נ';a.answer='ל';},
 'copy string flag':c=>activity(c,'letter-input').copy='false',
 'choice feedback too short':c=>activity(c,'letter-choice').feedback.pop(),
 'choice contradictory model reference':c=>activity(c,'letter-choice').letter='מ',
 'choice duplicate letter options':c=>{const p=c.lessons[1].blocks[0].textPages.pages.find(p=>p.activity?.kind==='letter-choice');p.options[1]=p.options[0];},
 'choice feedback wrong type':c=>activity(c,'letter-choice').feedback[1]=null,
 'application choice missing feedback':c=>delete activity(c,'application-choice').feedback,
 'correct feedback string flag':c=>activity(c,'application-choice').showCorrectFeedback='yes',
 'matching missing options':c=>delete activity(c,'letter-matching').options,
 'matching duplicate options':c=>{const a=activity(c,'letter-matching');a.options[1]=a.options[0];},
 'matching unknown model reference':c=>activity(c,'letter-matching').items[0].letter='א',
 'matching duplicate models':c=>{const a=activity(c,'letter-matching');a.items[1].letter=a.items[0].letter;},
 'matching missing sound':c=>delete activity(c,'letter-matching').items[0].sound,
 'matching missing feedback':c=>delete activity(c,'letter-matching').feedback,
 'self-check missing models':c=>delete activity(c,'self-check').items,
 'self-check missing feedback':c=>delete activity(c,'self-check').feedback,
 'self-check null model':c=>activity(c,'self-check').items[0]=null,
 'unsafe media reference':c=>activity(c,'letter-input').audio='/media/../secret',
 'media reference object':c=>activity(c,'letter-input').audio={url:'/media/fixture.wav'},
 'audio without action identity':c=>{const a=activity(c,'letter-input');a.audio='/media/fixture.wav';delete a.id;}
};
// IDs share one audio-action namespace on the current page, even before clips
// are attached. Test every item family, both parent-audio states and later items.
for(const kind of ['letter-gallery','letter-matching','self-check']){
 for(const mode of ['no clips','child clip','child and parent clips','last item']){
  cases[kind+' parent/item collision '+mode]=c=>{
   const a=activity(c,kind),item=a.items[mode==='last item'?a.items.length-1:0];
   a.id=item.id;
   if(mode.includes('clip'))item.audio='/media/child-fixture.wav';
   if(mode==='child and parent clips')a.audio='/media/parent-fixture.wav';
  };
 }
}

test('RR-FIRST2-01 supported source pack and all versionless legacy pages remain exact',t=>{
 const s=new Store();t.after(()=>s.close());const c=replaceFirstTwo(s.snapshot(),pack).content,before=JSON.stringify(c);
 validateContent(c);assert.deepEqual(validateSchema('content-pack',c),[]);assert.deepEqual(semanticErrors(c),[]);assert.equal(JSON.stringify(c),before);
 for(const l of pack.lessons){const v=l.blocks[0].textPages;validateTextPages(v);assert.deepEqual(validateSchema('text-pages',v),[]);}
 const r=s.importTextDraft({baseRevisionId:s.get('active'),expectedDraftToken:null,pack:legacyPack});assert.equal(r.importReceipt.lessonCount,20);assert.equal(r.importReceipt.pageCount,154);
 const backup=s.backup(),d=new Store();try{d.restore(backup);assert.deepEqual(d.currentDraft().content,s.currentDraft().content);for(const l of d.currentDraft().content.lessons)for(const b of l.blocks)if(b.textPages){assert.equal(b.textPages.activityVersion,undefined);validateTextPages(b.textPages,{wordIds:d.currentDraft().content.words.map(w=>w.id),targetIds:(l.draftTargets||[]).map(x=>x.id)});assert.deepEqual(validateSchema('text-pages',b.textPages),[]);}}finally{d.close();}
});

test('RR-FIRST2-01 malformed shapes, models and references fail runtime and schema semantics without mutation',t=>{
 const s=new Store();t.after(()=>s.close());const c=replaceFirstTwo(s.snapshot(),fixture).content;
 for(const [name,change]of Object.entries(cases)){
  const bad=structuredClone(c);change(bad);const before=JSON.stringify(bad);
  assert.throws(()=>validateContent(bad),undefined,name);
  if(name.includes('parent/item collision'))assert.throws(()=>validateContent(bad),/activity item identity/,name+' identity guard');
  const structural=validateSchema('content-pack',bad);assert.ok(structural.length||semanticErrors(bad).length,name+' rejected by schema/semantic contract');
  assert.equal(JSON.stringify(bad),before,name+' no coercion or mutation');
 }
});

test('RR-FIRST2-01 actual HTTP save, defensive publish and restore reject every malformed activity atomically',async t=>{
 const s=new Store(),dir=mkdtempSync(join(tmpdir(),'hebleo-activity-contract-'));
 const server=createServer(s,{mediaRoot:dir});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 t.after(async()=>{await new Promise(r=>server.close(r));s.close();rmSync(dir,{recursive:true,force:true});});
 // Resolvable synthetic clips ensure ID rejection is not a missing-media error.
 const blob=s.db.prepare("SELECT sha256 FROM media_blobs WHERE mime_type='audio/wav' LIMIT 1").get();assert.ok(blob);
 for(const alias of ['child-fixture.wav','parent-fixture.wav'])s.db.prepare('INSERT INTO media_aliases(path,sha256) VALUES (?,?)').run(alias,blob.sha256);
 installFirstTwo(s,{pack:fixture,build:'activity-contract-synthetic',mediaRoot:dir});
 const current=s.snapshot(),base=s.get('active');
 const p=pages(current).pages.find(p=>p.activity?.kind==='memory-first');
 s.saveTextProgress('learner-demo',{lessonId:'MEMORY-A2',componentId:'MEMORY-A2-interactive',revisionId:base,pageId:p.id,cursorPageId:p.id,response:{text:'saved fictional attempt',checked:true,attempted:true}});
 s.stage({baseRevisionId:base,expectedDraftToken:s.currentDraft()?.draftToken??null,content:current});
 const validDraft=s.get('draft'),validBackup=s.backup();
 const post=async(route,body)=>{const r=await fetch('http://127.0.0.1:'+server.address().port+'/api/'+route,{method:'POST',headers:{'x-demo-user':'author-demo','content-type':'application/json'},body:JSON.stringify(body)});const value=await r.json();return {status:r.status,value};};
 const rejects=async(route,body,name)=>{const before=dump(s),r=await post(route,body);assert.equal(r.status,400,name+': '+JSON.stringify(r));assert.ok(r.value.error);if(name.includes('parent/item collision'))assert.match(r.value.error,/activity item identity/,name+' identity guard');assert.deepEqual(dump(s),before,name+': all tables, history, draft and revision sequence exact');};
 for(const [name,change]of Object.entries(cases)){
  const bad=structuredClone(current);change(bad);
  await rejects('studio/draft',{baseRevisionId:base,expectedDraftToken:s.currentDraft().draftToken,content:bad},name+' save');
  // A persisted draft from an older writer must also fail at the publication
  // boundary. Inject only for test arrangement, then fingerprint before POST.
  s.set('draft',{...validDraft,content:bad});
  await rejects('studio/publish',{baseRevisionId:base,draftToken:s.currentDraft().draftToken},name+' publish');
  s.set('draft',validDraft);
  for(const location of ['active','historical','draft']){
   const backup=structuredClone(validBackup);
   if(location==='active')backup.content=bad;
   if(location==='historical')backup.revisionSnapshots.find(r=>r.revisionId===base).content=bad;
   if(location==='draft')backup.draft.content=bad;
   await rejects('restore',backup,name+' restore '+location);
  }
 }
 assert.deepEqual(s.snapshot(),current);assert.deepEqual(s.get('draft'),validDraft);
 assert.equal(s.learner('learner-demo').textPages[0].responses[p.id].text,'saved fictional attempt');
 // Positive controls prove those same routes work on valid current data.
 assert.equal((await post('studio/draft',{baseRevisionId:base,expectedDraftToken:s.currentDraft().draftToken,content:current})).status,200);
 assert.equal((await post('studio/publish',{baseRevisionId:base,draftToken:s.currentDraft().draftToken})).status,200);
 assert.equal((await post('restore',s.backup())).status,200);
 assert.deepEqual(s.snapshot(),current);
});

test('RR-FIRST2-01 distinct child and scalar parent media dispatch uses the exact requested URL',async t=>{
 const dom=new JSDOM('<main></main>'),host=dom.window.document.querySelector('main');t.after(()=>dom.window.close());
 let played=[],paused=0;
 dom.window.Audio=class{constructor(url){this.url=url;}play(){played.push(this.url);return Promise.resolve();}pause(){paused++;}};
 const sourcePages=fixture.lessons.flatMap(l=>l.blocks[0].textPages.pages);
 for(const kind of ['letter-gallery','letter-matching','self-check','letter-input','letter-choice','application-choice']){
  const p=structuredClone(sourcePages.find(p=>p.activity?.kind===kind)),a=p.activity;
  a.id='parent-'+kind;a.audio='/media/parent-fixture.wav';
  for(const [i,item]of (a.items||[]).entries())item.audio='/media/child-'+i+'.wav';
  const v={version:1,activityVersion:1,pages:[p],order:[p.id]};validateTextPages(v);
  assert.deepEqual(validateSchema('text-pages',v),[]);
  const reader=mountTextReader(host,{textPages:v,dock:false});played=[];
  try{
   if(kind==='self-check')host.querySelector('[data-source-action="model"]').click();
   const requested=a.items||[a];
   for(const item of requested){
    const button=host.querySelector('[data-source-action="audio:'+item.id+'"]');assert.ok(button,kind+' play button');button.click();
   }
   await Promise.resolve();assert.deepEqual(played,requested.map(item=>item.audio),kind+' exact media dispatch');
  }finally{reader.destroy();}
 }
 assert.ok(paused>0,'existing players are stopped');
 // The namespace is page scoped: item IDs can be reused on another page.
 const gallery=structuredClone(sourcePages.find(p=>p.activity?.kind==='letter-gallery'));
 const other=structuredClone(gallery);other.id='another-gallery';other.activity.id='another-parent';
 validateTextPages({version:1,activityVersion:1,pages:[gallery,other],order:[gallery.id,other.id]});
});

test('RR-FIRST2-01 reader rejects unsupported dispatch and retains legacy/source readers',t=>{
 const dom=new JSDOM('<main></main>'),host=dom.window.document.querySelector('main');t.after(()=>dom.window.close());
 for(const version of [2,'1',null]){const v=structuredClone(pack.lessons[0].blocks[0].textPages);v.activityVersion=version;assert.throws(()=>mountTextReader(host,{textPages:v,dock:false}),/version/);assert.equal(host.childNodes.length,0);}
 const source=mountTextReader(host,{textPages:pack.lessons[0].blocks[0].textPages,dock:false});assert.ok(host.querySelector('[data-source-heading]'));source.destroy();
 const v={version:1,pages:[{id:'legacy',type:'reading',title:'Legacy fixture',html:'<p>Legacy</p>'}],order:['legacy']};
 const legacy=mountTextReader(host,{textPages:v,dock:false});assert.ok(host.querySelector('[data-reader-action]'));legacy.destroy();
});
