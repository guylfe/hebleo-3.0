import {readFileSync,writeFileSync} from 'node:fs';import {createRequire} from 'node:module';import assert from 'node:assert/strict';
const [work,dependencyRoot]=process.argv.slice(2);const require=createRequire(dependencyRoot+'/package.json'),{JSDOM}=require('jsdom');
const source=readFileSync(work+'/archive-decks.php','utf8');const report={};
function fixture(state='new'){
 const dom=new JSDOM('<div id="study-app"></div>',{runScripts:'outside-only'});
 const script=source.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/<\?php[\s\S]*?\?>/g,'fixture').replace('let studyApp;','window.studyApp;').replace('studyApp = new StudyApp();','StudyApp.prototype.init=function(){}; studyApp = new StudyApp();');
 dom.window.eval(script);dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
 const app=dom.window.studyApp;app.currentCard={state,note_id:10,template_id:20,front:'front',back:'back',intervals:{again:'1',hard:'2',good:'3',easy:'4'}};app.renderStudyInterface();app.showAnswer();
 let next=0,requests=0;app.nextCard=()=>next++;const stats=()=>JSON.parse(JSON.stringify(app.stats));
 return {dom,app,stats,next:()=>next,requests:()=>requests,respond(fn){app.makeRequest=async(...args)=>{requests++;return fn(...args)}}};
}
for(const [name,response] of [['serverRejected',()=>({success:false})],['malformed',()=>({success:'true'})],['empty',()=>null],['transportLost',()=>{throw Error('response lost after possible commit')}],['parseFailure',()=>{throw SyntaxError('invalid JSON')}]] ){
 const f=fixture(),card=f.app.currentCard,before=f.stats();f.respond(response);await f.app.rateCard(3);
 assert.equal(f.app.currentCard,card);assert.deepEqual(f.stats(),before);assert.equal(f.next(),0);assert.equal(f.requests(),1);
 assert(f.dom.window.document.querySelector('[role=alert]').textContent.includes('Return to decks'));
 await f.app.rateCard(3);await f.app.suspendCard();assert.equal(f.requests(),1);
 assert.equal(f.dom.window.document.querySelector('.back-btn').disabled,false);
 assert([...f.dom.window.document.querySelectorAll('.rating-btn,.suspend-btn')].every(x=>x.disabled));
 let decks=0;f.app.loadDecks=()=>decks++;f.app.showDecks();assert.equal(decks,1);
 report[name]={requests:f.requests(),next:f.next(),stats:f.stats(),blockedResubmit:true};f.dom.window.close();
}
for(const state of ['new','review','learning','relearning'])for(const rating of [1,2,3,4]){
 const f=fixture(state);let resolve;f.respond(()=>new Promise(r=>resolve=r));const first=f.app.rateCard(rating);
 assert.equal(f.requests(),1);assert.equal(f.stats().studied,0);assert.equal(f.next(),0);
 assert([...f.dom.window.document.querySelectorAll('.rating-btn,.suspend-btn,.back-btn')].every(x=>x.disabled));
 await f.app.rateCard(rating);await f.app.suspendCard();await f.app.startStudy(99);f.app.showDecks();assert.equal(f.requests(),1);
 resolve({success:true});await first;assert.equal(f.next(),1);assert.equal(f.stats().studied,1);assert.equal(f.stats().correct,rating>=3?1:0);assert.equal(f.stats().new_studied,state==='new'?1:0);assert.equal(f.stats().reviews_studied,state==='new'?0:1);
 await f.app.rateCard(rating);assert.equal(f.requests(),1);assert.equal(f.next(),1);
 report[state+'-'+rating]={requests:f.requests(),next:f.next(),stats:f.stats()};f.dom.window.close();
}
writeFileSync(work+'/CLIENT_SAVE_FIXED.json',JSON.stringify(report,null,2)+'\n');console.log('PASS actual StudyApp: 5 rejection/uncertain cases and 16 state/rating successes; pending counters unchanged, concurrent rating/Suspend/navigation suppressed, one confirmed advancement, no blind retry, visible reconciliation guidance.');
