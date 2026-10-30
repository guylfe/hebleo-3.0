// Simulated geometry and real lesson DOM; native pointer evidence is separate.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {mountExerciseDock} from '../public/exercise-actions.js';
import {mountSourceActivities} from '../public/source-activities.js';
const rect=(top,height)=>({left:20,right:780,width:760,top,bottom:top+height,height});
for(const preview of [false,true])for(const target of ['h3','textarea','select','button'])test('QA-FIRST2-01 '+(preview?'Preview':'learner')+' permits reading scroll with focused '+target,t=>{
 const dom=new JSDOM((preview?'<dialog open>':'')+'<main><h3 tabindex="-1">Reading</h3><textarea></textarea><select><option>מ</option></select><button>Check answer</button><nav data-exercise-dock></nav></main>'+(preview?'</dialog>':''),{pretendToBeVisual:true});
 const w=dom.window,d=w.document,scope=d.querySelector('main'),dock=d.querySelector('nav'),el=scope.querySelector(target);let y=250,dockTop=650,frame;const scrolls=[];
 scope.getBoundingClientRect=()=>rect(50,1400);dock.getBoundingClientRect=()=>rect(dockTop,70);el.getBoundingClientRect=()=>rect(y,40);if(preview)d.querySelector('dialog').getBoundingClientRect=()=>rect(0,720);
 const scroll=options=>{scrolls.push(options.top);y-=options.top;};w.scrollBy=scroll;if(preview)d.querySelector('dialog').scrollBy=scroll;
 w.requestAnimationFrame=fn=>{frame=fn;return 1;};w.cancelAnimationFrame=()=>{};
 el.focus();const owner=mountExerciseDock(scope);t.after(()=>{owner.destroy();w.close();});
 y=-200;w.dispatchEvent(new w.Event('scroll'));assert.ok(frame);frame();
 assert.deepEqual(scrolls,[],'ordinary reading scroll must not be undone');
 // A genuine keyboard/reflow boundary still recovers active controls, never headings.
 dockTop=350;y=500;owner.refresh();
 if(target==='h3'){assert.deepEqual(scrolls,[]);el.blur();el.focus();assert.ok(scrolls.length,'intentional page-entry focus reveals heading once');const count=scrolls.length;y=-200;w.dispatchEvent(new w.Event('scroll'));frame();assert.equal(scrolls.length,count,'later reading scroll remains free');}else{assert.ok(scrolls.length);assert.ok(el.getBoundingClientRect().bottom<dockTop);assert.equal(d.activeElement,el);}
});
const pack=JSON.parse(readFileSync(new URL('../content/first2/lessons.json',import.meta.url)));
const letters=pack.lessons[1].blocks[0].textPages;
for(const id of ['MNTL-A2.learn.pair-retrieve','MNTL-A2.apply.mem','MNTL-A2.apply.lamed'])test('FIRST2 missing listening stimulus remains explicit without revealing target: '+id,t=>{
 const page=letters.pages.find(p=>p.id===id),dom=new JSDOM('<main></main>',{pretendToBeVisual:true}),host=dom.window.document.querySelector('main');
 const owner=mountSourceActivities(host,{textPages:{version:1,activityVersion:1,pages:[page],order:[id]},renderLesson:s=>s,dock:false});t.after(()=>{owner.destroy();dom.window.close();});
 const notice=host.querySelector('[data-source-stimulus-unavailable]');assert.ok(notice);assert.match(notice.textContent,/unavailable.*unfinished/);
 assert.ok(!notice.textContent.includes(page.activity.sound));assert.ok(!notice.textContent.includes(page.activity.letter));assert.ok(!host.querySelector('[data-source-action^="audio:"]'));
 assert.equal(host.querySelector('[data-source-input]')?.value||'','');
});
