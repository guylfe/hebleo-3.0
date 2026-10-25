const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),{JSDOM,VirtualConsole}=require('jsdom');
const html=fs.readFileSync(path.join(__dirname,'first20.html'),'utf8'),errors=[];let now=0,seq=0;const timers=new Map();
const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
const dom=new JSDOM(html,{url:'https://preview.invalid/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.structuredClone=structuredClone;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};Object.defineProperty(w.performance,'now',{value:()=>now});w.setTimeout=(fn,ms)=>{const id=++seq;timers.set(id,{fn,at:now+(ms||0)});return id;};w.clearTimeout=id=>timers.delete(id);}}),w=dom.window,d=w.document,api=w.HebleoPreview;
let checks=0;function ok(value,message){assert.ok(value,message);checks++;}
function tick(ms){const end=now+ms;for(;;){const next=[...timers].filter(([,x])=>x.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;timers.delete(next[0]);now=next[1].at;next[1].fn();}now=end;}
const clickText=text=>{const b=[...d.querySelectorAll('button')].find(b=>b.textContent===text);assert.ok(b,'Button '+text);b.click();};
const goId=(id,index)=>api.go(api.pack.lessons.findIndex(l=>l.id===id),index);
ok(api.pack.lessons.length===20,'Exactly twenty lessons');
goId('MEMORY',1);ok(d.querySelector('#timed-value').hidden,'Timer never autoplays');tick(20000);ok(d.querySelector('#timed-value').hidden,'Waiting without Play does not show number');d.querySelector('#play-timer').click();ok(d.querySelector('#timed-value').textContent==='0704177609112001','Exact source number, with leading zero');tick(9999);ok(!d.querySelector('#timed-value').hidden,'Number remains visible at 9999ms');tick(1);ok(d.querySelector('#timed-value').hidden,'Number hides at 10000ms');ok(!d.querySelector('#timed-value').textContent,'Number is removed from accessible text');ok(!!d.querySelector('textarea'),'Recall follows expiry');
goId('MEMORY',1);d.querySelector('#play-timer').click();tick(5000);goId('MNT',0);tick(10000);ok(api.getPosition().lesson==='MNT','Navigation cancels timer and stale callbacks');ok(!d.querySelector('#timed-value'),'Stale timer does not recreate number elsewhere');
goId('MEMORY',1);d.querySelector('#play-timer').click();tick(2000);Object.defineProperty(d,'hidden',{configurable:true,get:()=>true});d.dispatchEvent(new w.Event('visibilitychange'));Object.defineProperty(d,'hidden',{configurable:true,get:()=>false});ok(d.querySelector('#timed-value').hidden,'Backgrounding cancels attempt');tick(10000);ok(!d.querySelector('textarea'),'Cancelled attempt does not expire into recall');
d.querySelector('#study-untimed').click();tick(15000);ok(!d.querySelector('#timed-value').hidden,'Untimed accessibility mode remains visible');clickText('Hide and recall');ok(d.querySelector('#timed-value').hidden,'Untimed mode hides on user request');
goId('MNT',3);ok(d.querySelector('#next').disabled,'Check blocks Continue before answer');ok(!d.querySelector('.feedback'),'No model feedback before commitment');d.querySelectorAll('.choice')[0].click();ok(d.querySelector('#next').disabled,'Selecting alone does not reveal/advance');clickText('Check answer');ok(!!d.querySelector('.feedback'),'Explicit Check reveals feedback');ok(!d.querySelector('#next').disabled,'Answered check allows learning to continue');
goId('MNT',4);const radios=d.querySelectorAll('.choice');radios[0].focus();radios[0].dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));ok(d.activeElement===radios[1]&&radios[1].getAttribute('aria-checked')==='true','Arrow navigation selects and focuses the next radio');ok(d.querySelector('#next').disabled&&!d.querySelector('.feedback'),'Keyboard selection still requires explicit Check');
// Visit and complete every authored page through its actual controls.
for(let li=0;li<api.pack.lessons.length;li++)for(let pi=0;pi<api.pack.lessons[li].pages.length;pi++){
api.go(li,pi);const p=api.pack.lessons[li].pages[pi];
if(p.type==='timedRecall'){d.querySelector('#play-timer').click();tick(10000);}
if(p.type==='choice'&&!d.querySelector('.feedback')){d.querySelectorAll('.choice')[p.answer].click();clickText('Check answer');}
if(p.type==='vocabulary')for(const b of d.querySelectorAll('.word-card'))if(b.getAttribute('aria-expanded')!=='true')b.click();
if(p.type==='recall'||p.type==='timedRecall'){const t=d.querySelector('textarea');if(!t.readOnly){t.value=p.answer||p.value;t.dispatchEvent(new w.Event('input'));clickText('Commit and reveal a model');}}
ok(!d.querySelector('#next').disabled,'Page is completable: '+p.id);if(p.type!=='complete')d.querySelector('#next').click();
}
ok(Object.keys(api.getState().lessons).length===20,'All twenty lessons complete through controls');
const saved=JSON.parse(w.localStorage.getItem('hebleo-first20-preview-v1'));ok(saved.pages['MNT.learn.1'],'Progress keyed by stable lesson/page ID');
const ids=api.pack.lessons.flatMap(l=>l.pages.map(p=>p.id));ok(new Set(ids).size===ids.length,'No page-ID collision');ok(errors.length===0,'No runtime errors: '+errors.join('; '));
fs.writeFileSync(path.join(__dirname,'reader-test-results.json'),JSON.stringify({checks,lessons:20,pages:ids.length,errors,timer:{sourceNumber:'0704177609112001',visibleAtMs:9999,hiddenAtMs:10000,autoplay:false,background:'cancel-and-restart',untimedAlternative:true},limits:'jsdom functional tests; not browser visual verification, audio verification, native/Guy acceptance, or an installed Hebleo feature.'},null,2));
console.log(JSON.stringify({checks,lessons:20,pages:ids.length,errors}));dom.window.close();
