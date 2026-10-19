import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store, validateContent } from '../src/store.js';
import { seed, upgradeDemo } from '../src/seed.js';
import { createServer } from '../src/server.js';
import { help } from '../src/tutor.js';
import { followingLesson, lessonQuestionProgress, defaultMedium, orderingTokens, lessonSteps, wordFields, searchableWord, audioURL } from '../public/ux.js';
import { importVocabularyCSV } from '../public/content.js';
const user='learner-demo';
function setup(t){const s=new Store();t.after(()=>s.close());return s;}
function attempt(s,exerciseId,answer){return s.attempt(user,{requestId:randomUUID(),exerciseId,answer,revisionId:s.get('active')});}
function position(s,patch={}){return {lessonId:'lesson-1',revisionId:s.get('active'),step:'apply',question:0,answer:'אני',selectedTokens:[],matching:{},resultRequestId:null,practiceIds:[],...patch};}

test('lesson destinations use stable IDs and finish at course end; text-only lessons have no fake Watch option',()=>{
  assert.equal(followingLesson(seed,structuredClone(seed.lessons[0]).id).id,'lesson-2');
  assert.equal(followingLesson(seed,'lesson-3'),null);assert.equal(followingLesson(seed,'missing'),null);
  assert.equal(defaultMedium(seed.lessons[0]),'read');
  assert.equal(defaultMedium({...seed.lessons[0],video:'https://example.com/lesson.mp4'}),'watch');
  assert.deepEqual(lessonSteps(seed.lessons[0]),['learn','check','vocabulary','apply','complete']);
});

test('sentence trays include substantial distractors drawn from current/recent taught vocabulary, without future words',()=>{
  const e=seed.exercises.find(e=>e.id==='ex-2-order'),tray=orderingTokens(e,seed);
  assert.ok(tray.length>=e.tokens.length+4);
  assert.ok(!tray.includes('כותב'));assert.ok(!tray.includes('כותבת'));
  const taught=new Set(seed.lessons.slice(0,2).flatMap(l=>l.wordIds).map(id=>seed.words.find(w=>w.id===id).unpointed));
  tray.forEach(t=>assert.ok(taught.has(t)||t==='ב','Only taught vocabulary and the authored prefix may appear.'));
  const publicTray=new Store();try{assert.deepEqual(publicTray.bootstrap(user).content.exercises.find(x=>x.id===e.id).tokens,tray);}finally{publicTray.close();}
});

test('ordering publication requires enough taught distractors and never treats an unpointed answer as a distractor',()=>{
  const content=structuredClone(seed);content.lessons[0].wordIds=['w-ani'];content.lessons[1].wordIds=['w-ani','w-babayit'];
  assert.throws(()=>validateContent(content),/four distinct taught distractor/);
  const e={...seed.exercises.find(x=>x.id==='ex-2-order'),tokens:['אֲנִי','בבית']};
  assert.ok(!orderingTokens(e,seed).includes('אני'));
});

test('rich CSV fields survive publication and backup with original unknown column labels',t=>{
  const s=setup(t),csv='id,pointed,unpointed,curated,english,root,pattern,Plural Feminine,אתם\nw-mi,מִי,מי,מִי,who,רוט,pattern,form,authored conjugation';
  const content=importVocabularyCSV(csv,seed);s.stage({baseRevisionId:1,expectedDraftToken:null,content});s.publish(1,s.currentDraft().draftToken);
  const w=s.snapshot().words.find(w=>w.id==='w-mi');
  assert.equal(w.root,'רוט');assert.equal(w.sourceFields['אתם'],'authored conjugation');
  assert.ok(wordFields(w).some(([key])=>key==='Plural Feminine'));
  assert.ok(searchableWord(w).includes('pattern'));
  s.restore(s.backup());assert.deepEqual(s.snapshot().words.find(w=>w.id==='w-mi'),w);
  assert.throws(()=>importVocabularyCSV('id,pointed,unpointed,curated,english,__proto__\nw-mi,מִי,מי,מִי,who,unsafe',seed));
});

test('saved positions preserve matching answers and feedback against their pinned revision',t=>{
  const s=setup(t);const result=attempt(s,'ex-1-match',{'w-hu':'he','w-hi':'she','w-mi':'who'});
  s.saveProgress(user,position(s,{question:1,answer:'',matching:result.answer,resultRequestId:result.requestId}));
  s.stage({baseRevisionId:1,expectedDraftToken:null,word:{id:'w-mi',english:'changed'}});s.publish(1,s.currentDraft().draftToken);
  const session=s.session(user,'lesson-1');assert.equal(session.revisionId,1);
  assert.deepEqual(session.progress.matching,result.answer);assert.equal(session.result.requestId,result.requestId);
  assert.equal(session.content.words.find(w=>w.id==='w-mi').english,'who');
  assert.equal(s.learner('learner-core').resumes['lesson-1'],undefined);
});

test('invalid saved feedback, fabricated completion and out-of-range sentence tokens cannot alter grading records',t=>{
  const s=setup(t);assert.throws(()=>s.saveProgress(user,position(s,{resultRequestId:'not-a-result'})));
  assert.throws(()=>s.saveProgress(user,position(s,{selectedTokens:[99]})));
  s.saveProgress(user,position(s,{step:'complete',answer:''}));assert.deepEqual(s.learner(user).completed,[]);
  assert.throws(()=>s.updateLearner(user,{immediateAnswers:'yes'}));
  assert.throws(()=>s.updateLearner(user,{reviewLimit:0}));
});

test('undo restores the exact preceding schedule, is single-use, and replayed rating receipts do not reschedule',t=>{
  const s=setup(t);s.enroll(user,'w-mi');const before=structuredClone(s.learner(user).cards['w-mi']);
  const requestId=randomUUID();s.review(user,{requestId,wordId:'w-mi',rating:4});
  s.undoReview(user,{requestId});assert.deepEqual(s.learner(user).cards['w-mi'],before);
  assert.throws(()=>s.undoReview(user,{requestId}),error=>error.status===409);
  assert.equal(s.review(user,{requestId,wordId:'w-mi',rating:4}).undone,true);
  assert.deepEqual(s.learner(user).cards['w-mi'],before);
});

test('reports retain submitted answer and revision; author review never changes accepted answers',t=>{
  const s=setup(t),result=attempt(s,'ex-1-type','היא'),requestId=randomUUID();
  const input={requestId,attemptId:result.requestId,reason:'answer',note:'Please review this.'};
  s.report(user,input);s.report(user,input);assert.equal(s.reports('author-demo').length,1);
  assert.throws(()=>s.reports(user),error=>error.status===403);
  s.resolveReport('author-demo',{userId:user,requestId,status:'reviewed'});
  const report=s.reports('author-demo')[0];assert.equal(report.attempt.answer,'היא');assert.equal(report.attempt.revisionId,1);
  assert.equal(report.status,'reviewed');assert.equal(attempt(s,'ex-1-type','היא').correct,false);
  assert.throws(()=>s.report(user,{...input,note:'conflicting'}),error=>error.status===409);
});

test('targeted extra practice selects unresolved authored mistakes, then falls back to lesson exercises',t=>{
  const s=setup(t);attempt(s,'ex-1-type','היא');
  assert.deepEqual(s.practice(user,{revisionId:1,lessonId:'lesson-1'}).exerciseIds,['ex-1-type']);
  attempt(s,'ex-1-type','אני');assert.deepEqual(s.practice(user,{revisionId:1,lessonId:'lesson-1'}).exerciseIds,seed.lessons[0].exerciseIds);
});

test('backup restores reports, undo, and pinned session positions; feedback stays linked to the remapped attempt',t=>{
  const s=setup(t);const result=attempt(s,'ex-1-type','אני');
  s.saveProgress(user,position(s,{resultRequestId:result.requestId}));
  s.report(user,{requestId:randomUUID(),attemptId:result.requestId,reason:'unclear',note:''});
  const backup=s.backup();s.restore(backup);
  const session=s.session(user,'lesson-1');assert.equal(session.progress.answer,'אני');
  assert.equal(session.progress.resultRequestId,result.requestId);assert.equal(session.result.revisionId,session.revisionId);assert.equal(s.reports('author-demo').length,1);
  assert.equal(session.content.words[0].pointed,'אֲנִי');s.saveProgress(user,session.progress);
  const invalid=structuredClone(backup);invalid.learners[0].state.resumes['lesson-1'].selectedTokens=[99];
  const before=s.get('active');assert.throws(()=>s.restore(invalid));assert.equal(s.get('active'),before);
});

test('fixture enrichment preserves edited fields and does not touch verified source content',()=>{
  const old=structuredClone(seed);delete old.uxVersion;old.words[0].notes='Owner edit';
  const upgraded=upgradeDemo(old);assert.equal(upgraded.words[0].notes,'Owner edit');
  assert.equal(upgraded.words.find(w=>w.id==='w-kotev').root,'כ־ת־ב');
  assert.equal(upgradeDemo({...old,provenance:{kind:'verified-source'}}),null);
});

test('media schemas reject executable or insecure sources and preserve native HTTPS links',()=>{
  assert.equal(audioURL('javascript:alert(1)'),null);assert.equal(audioURL('http://example.com/a.mp3'),null);
  assert.equal(audioURL('https://user:pass@example.com/a.mp3'),null);assert.equal(audioURL('/media/../secret'),null);
  assert.equal(audioURL('https://example.com/a.mp3'),'https://example.com/a.mp3');
  const content=structuredClone(seed);content.words[0].audio='javascript:alert(1)';assert.throws(()=>validateContent(content));
});

test('authored help works offline; optional AI sends only source context, uses store:false, and requires membership',async t=>{
  const s=setup(t),input={revisionId:1,lessonId:'lesson-1',wordId:'w-ani',question:'Explain this pronoun.'};
  let calls=0;const authored=await help(s,user,input,{fetcher:()=>{calls++;}});
  assert.match(authored.text,/speaker/);assert.equal(calls,0);
  await assert.rejects(help(s,user,{...input,useAI:true},{key:'',model:''}),error=>error.status===503);
  let sent;const answer=await help(s,user,{...input,useAI:true},{key:'test-only',model:'test-model',fetcher:async(url,args)=>{sent=JSON.parse(args.body);return {ok:true,json:async()=>({output:[{type:'message',content:[{type:'output_text',text:'Test explanation.'}]}]})};}});
  assert.equal(answer.source,'ai-generated');assert.equal(sent.store,false);assert.equal(sent.model,'test-model');
  assert.ok(!sent.input.includes('learner-demo'));assert.ok(!sent.input.includes('purchasedCourses'));
  await assert.rejects(help(s,'learner-core',{...input,useAI:true},{key:'test',model:'test'}),error=>error.status===403);
});

test('HTTP author routes and backup exports reject learner profiles while help and progress remain available',async t=>{
  const s=setup(t),server=createServer(s);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base='http://127.0.0.1:'+server.address().port;
  for(const path of ['/api/studio','/api/export','/api/content','/api/reports'])assert.equal((await fetch(base+path)).status,403,path);
  assert.equal((await fetch(base+'/api/studio',{headers:{'x-demo-user':'author-demo'}})).status,200);
  assert.equal((await fetch(base+'/ux.js')).status,200);assert.equal((await fetch(base+'/media.js')).status,200);
  const response=await fetch(base+'/api/progress',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(position(s))});
  assert.equal(response.status,200);assert.equal((await fetch(base+'/api/session?lessonId=lesson-1')).status,200);
});

test('native local media supports seeking and rejects invalid ranges and nonmedia files',async t=>{
  const dir=mkdtempSync(join(tmpdir(),'hebleo-media-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
  writeFileSync(join(dir,'recording.mp3'),'0123456789');writeFileSync(join(dir,'private.txt'),'excluded');
  const s=setup(t),server=createServer(s,{mediaRoot:dir});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base='http://127.0.0.1:'+server.address().port;
  const full=await fetch(base+'/media/recording.mp3');assert.equal(full.status,200);assert.equal(await full.text(),'0123456789');
  const part=await fetch(base+'/media/recording.mp3',{headers:{range:'bytes=2-5'}});assert.equal(part.status,206);assert.equal(part.headers.get('content-range'),'bytes 2-5/10');assert.equal(await part.text(),'2345');
  const tail=await fetch(base+'/media/recording.mp3',{headers:{range:'bytes=-3'}});assert.equal(await tail.text(),'789');
  assert.equal((await fetch(base+'/media/recording.mp3',{headers:{range:'bytes=50-'}})).status,416);
  assert.equal((await fetch(base+'/media/private.txt')).status,404);
  assert.equal((await fetch(base+'/media/missing.mp3')).status,404);
});

test('Question progress counts each correct question once in its own lesson revision and removes corrected misses',()=>{
  const lesson=seed.lessons[0],a=(exerciseId,correct,revisionId=1,lessonId=lesson.id)=>({exerciseId,correct,revisionId,lessonId});
  const attempts=[a('ex-1-type',false),a('ex-1-type',true),a('ex-1-type',true),a('ex-1-match',false),a('ex-1-recognize',true,2),a('ex-2-order',true,1,'lesson-2')];
  assert.deepEqual(lessonQuestionProgress(lesson,attempts,1),{correctIds:['ex-1-type'],missedIds:['ex-1-match']});
  assert.deepEqual(lessonQuestionProgress(lesson,attempts,2),{correctIds:['ex-1-recognize'],missedIds:[]});
});
