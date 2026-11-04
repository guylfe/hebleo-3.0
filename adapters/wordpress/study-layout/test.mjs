import {readFileSync} from 'node:fs';import {createRequire} from 'node:module';import assert from 'node:assert/strict';import vm from 'node:vm';
import {generate,sha} from './generate.mjs';
const [work,adapter,sourceArtifact,dependencyRoot]=process.argv.slice(2);
const require=createRequire(dependencyRoot+'/package.json');const {JSDOM}=require('jsdom');
const fixtures=JSON.parse(readFileSync(work+'/fixtures.json'));const original=JSON.parse(readFileSync(sourceArtifact));const child=readFileSync(adapter+'/shared-cards/frame-child.js','utf8');let checked=0;
for(const n of Object.values(fixtures))for(const dir of ['he-en','en-he'])for(const side of ['front','back']){
 const src=original.notes.find(x=>x.id===n.id);assert.deepEqual(src.fields,n.fields);
 const before=new JSDOM(src.documents[dir][side]),after=new JSDOM(n.documents[dir][side],{runScripts:'outside-only'});
 const root=after.window.document.querySelector('.hc-card');const nodes=[...root.querySelectorAll('*')];
 const text=d=>[...d.window.document.querySelectorAll('.hc-card *')].flatMap(e=>[...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent)).sort();
 const sounds=d=>[...d.window.document.querySelectorAll('[data-audio]')].map(e=>e.getAttribute('data-audio')).sort();
 after.window.Audio=function(){this.preload='';this.pause=()=>{};this.play=()=>Promise.resolve();this.addEventListener=()=>{};this.removeEventListener=()=>{};};
 after.window.ResizeObserver=class{observe(){} disconnect(){}};
 for(const script of after.window.document.querySelectorAll('script'))after.window.eval(script.textContent);
 assert.deepEqual(text(before),text(after));assert.deepEqual(sounds(before),sounds(after));assert(nodes.every(n=>root.contains(n)));
 if(side==='back'){assert(root.querySelector('.hc-study-primary .hc-prompt'));assert(root.querySelector('.hc-study-primary .hc-solution'));}
 for(const toggle of root.querySelectorAll('.section-toggle')){
  const others=[...root.querySelectorAll('.section-toggle')].filter(x=>x!==toggle).map(x=>[x,x.getAttribute('aria-expanded')]);
  const prior=toggle.getAttribute('aria-expanded');toggle.click();assert.notEqual(toggle.getAttribute('aria-expanded'),prior);
  assert.equal(after.window.document.getElementById(toggle.getAttribute('aria-controls')).hidden,toggle.getAttribute('aria-expanded')!=='true');
  for(const [other,value]of others)assert.equal(other.getAttribute('aria-expanded'),value);toggle.click();
 }
 const setting={type:'hebleo-card-settings',mode:'dark',nikkud:true};
 after.window.dispatchEvent(new after.window.MessageEvent('message',{source:{},data:setting}));assert.equal(root.querySelector('.hc-theme-input').checked,false);
 after.window.dispatchEvent(new after.window.MessageEvent('message',{source:after.window.parent,data:setting}));assert.equal(root.querySelector('.hc-theme-input').checked,true);
 assert.equal(after.window.document.documentElement.dataset.hebleoMode,'dark');const nikkud=root.querySelector('.hc-nikkud');if(nikkud)assert.equal(nikkud.checked,true);
 const csp=after.window.document.querySelector('[http-equiv]').content;assert(csp.includes("default-src 'none'"));assert(csp.includes("connect-src 'none'"));assert(!csp.includes("script-src 'unsafe-inline'"));
 before.window.close();after.window.close();checked++;
}
const archive=readFileSync(work+'/archive-decks.php','utf8');assert(!archive.includes('Rate your recall'));for(const k of ['again','hard','good','easy'])assert(archive.includes('this.currentCard.intervals.'+k));
const baseline=readFileSync(work+'/../../baseline-plugin/archive-decks.php');
assert.equal(generate(baseline,sha(baseline)),archive);assert.throws(()=>generate(baseline,'bad'));
const shell=new JSDOM('<div id="study-app"></div>',{runScripts:'outside-only'});
let appScript=archive.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/<\?php[\s\S]*?\?>/g,'fixture-only').replace('let studyApp;','window.studyApp;').replace('studyApp = new StudyApp();','StudyApp.prototype.init=function(){}; studyApp = new StudyApp();');
shell.window.eval(appScript);shell.window.document.dispatchEvent(new shell.window.Event('DOMContentLoaded'));
const app=shell.window.studyApp;app.currentCard={front:'QUESTION SENTINEL',back:'ANSWER SENTINEL',state:'new',intervals:{again:'S1',hard:'S2',good:'S3',easy:'S4'}};app.renderStudyInterface();
const counts=shell.window.document.querySelector('.card-type-indicator').textContent;
app.showAnswer();assert(shell.window.document.querySelector('#card-inner.flipped'));assert.equal(shell.window.document.querySelector('.card-type-indicator').textContent,counts);assert.equal(shell.window.document.activeElement,shell.window.document.querySelector('.rating-btn'));
assert.deepEqual([...shell.window.document.querySelectorAll('.rating-btn small')].map(x=>x.textContent),['S1','S2','S3','S4']);assert(shell.window.document.querySelector('.suspend-btn'));shell.window.close();
let handler;const frame={contentWindow:{postMessage(){}},style:{}};
vm.runInNewContext(readFileSync(adapter+'/shared-cards/frame-host.js','utf8'),{window:{addEventListener(t,f){handler=f}},document:{querySelectorAll:()=>[frame],getElementById:()=>null},localStorage:{getItem:()=>null,setItem(){}}});
handler({source:{},data:{type:'hebleo-card-height',height:10000}});assert.equal(frame.style.height,undefined);
handler({source:frame.contentWindow,data:{type:'hebleo-card-height',height:Infinity}});assert.equal(frame.style.height,undefined);
handler({source:frame.contentWindow,data:{type:'hebleo-card-height',height:10000}});assert.equal(frame.style.height,'10000px');
handler({source:frame.contentWindow,data:{type:'hebleo-card-height',height:120,extra:true}});assert.equal(frame.style.height,'10000px');
console.log('PASS '+checked+' actual documents: exact raw fields/text/media URLs and DOM nodes; independent tense toggles; trusted-only dark/Nikkud settings; CSP; spoofed/nonfinite/extra-key messages rejected; >2400px heights retained; deterministic generator with baseline rejection; actual StudyApp reveal preserves counters/Suspend, focuses ratings and retains all four server interval values.');
