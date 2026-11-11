import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {correctNote,correctionMedia,correctionBlob} from '../src/shared-card-adapter/corrections.mjs';
import {createRenderer} from '../src/shared-card-adapter/index.mjs';
import {reviewActivity} from '../src/review-activity.js';
import {heatmapHTML,heatmapClick} from '../public/review-heatmap.js';
import {Store} from '../src/store.js';
const mapping=JSON.parse(readFileSync(new URL('../src/shared-card-adapter/recordings/manifest.json',import.meta.url)));
function note(m){return {id:m.sourceId,fields:{SourceId:m.sourceId,Hebrew:m.hebrew,HebrewNikkud:m.pointed,English:m.english,Audio:'',Forms:'',Notes:'',Grammar:'Pronoun',Source:''}};}
test('four exact pronouns gain intact recordings on both answer directions; raw and unrelated notes stay unchanged',()=>{
 const renderer=createRenderer({mediaManifest:[...correctionMedia,...['blue','white'].map(c=>({file:'_hebleo-logo-'+c+'.png',sha256:'a'.repeat(64),bytes:1}))],mediaBaseUrl:'https://example.test/media/'});
 for(const m of mapping){const raw=note(m),before=structuredClone(raw),derived=correctNote(raw);assert.equal(correctionBlob(m.file).byteLength,m.bytes);
  for(const direction of ['he-en','en-he']){const doc=new JSDOM(renderer.renderCard({note:derived,direction,face:'back'}));assert.equal(doc.window.document.querySelector('.hc-audio .hc-play').dataset.audio,'https://example.test/media/'+m.file);doc.window.close();}
  assert.deepEqual(raw,before);const unrelated=note({...m,sourceId:'mf-000716',english:'Object marker'});assert.deepEqual(correctNote(unrelated),unrelated);
  raw.fields.Audio='[sound:authored-new.mp3]';assert.equal(correctNote(raw).fields.Audio,raw.fields.Audio);
 }
 assert.equal(correctionBlob('../../private'),null);
});
test('garden wording is corrected only for its exact source identity',()=>{const n=note(mapping[0]);Object.assign(n,{id:'mf-000035'});Object.assign(n.fields,{SourceId:n.id,Hebrew:'גן',English:'Garden',Notes:'This is the word for a single male fish.'});assert.equal(correctNote(n).fields.Notes,'This is the word for a garden.');n.id='mf-000034';assert.equal(correctNote(n).fields.Notes,n.fields.Notes);});
test('history uses Israel dates, excludes undone/rejected, handles deterministic legacy receipts',()=>{
 const at=Date.parse('2026-11-10T22:30:00Z'),r={rating:3,acceptedAnswerAt:at};
 assert.deepEqual(reviewActivity([r,{...r,undone:true},{...r,outcome:'rejected'},{rating:1,card:{due:new Date(at+600000).toISOString()}},{rating:3}],at),{today:'2026-11-11',counts:{'2026-11-11':2},undated:1});
});
test('native heatmap reads only this account and reflects undo without changing scheduling',t=>{const s=new Store(':memory:');t.after(()=>s.close());const at=Date.now();s.set('review-learner-demo-first',{rating:3,acceptedAnswerAt:at});s.set('review-author-demo-private',{rating:3,acceptedAnswerAt:at});const before=s.backup();assert.equal(Object.values(s.reviewActivity('learner-demo').counts).reduce((a,b)=>a+b,0),1);assert.deepEqual(s.backup().learners,before.learners);s.set('review-learner-demo-first',{rating:3,acceptedAnswerAt:at,undone:true});assert.deepEqual(s.reviewActivity('learner-demo').counts,{});});
test('heatmap has 365 accessible day counts and works with keyboard-generated clicks',()=>{const dom=new JSDOM(heatmapHTML({today:'2024-03-01',counts:{'2024-02-29':4}}));const buttons=dom.window.document.querySelectorAll('[data-review-day]');assert.equal(buttons.length,365);const b=Array.from(buttons).find(b=>b.title==='2024-02-29: 4 reviews');assert(b);heatmapClick({target:b});assert.equal(dom.window.document.querySelector('[data-review-day-detail]').textContent,b.title);assert.match(dom.window.document.body.textContent,/4 reviews · 1 active day/);dom.window.close();});
test('WordPress autoplay respects face, setting, generation, manual replay, and card changes',()=>{
 const dom=new JSDOM('<div id="study-app" data-study-generation="g1" data-study-note-id="1" data-study-template-id="2" data-study-face="front"><iframe data-hebleo-shared></iframe><div class="card-back"><iframe data-hebleo-shared></iframe></div></div>',{url:'https://hebleo.com/decks/',runScripts:'outside-only',pretendToBeVisual:true});const w=dom.window,plays=[];let pauses=0;
 w.Audio=class{play(){plays.push(this.src);return Promise.resolve();}pause(){pauses++;}};
 w.eval('window.StudyApp=class {startAutoplay(){} pauseAllAudio(){} stopAutoplay(){} renderDeckSelector(){} }; window.studyApp=new StudyApp(); studyApp.currentView="study";studyApp.currentCard={};studyApp.currentDeckSettings={autoplay_audio:1};');
 w.eval(readFileSync(new URL('../adapters/wordpress/shared-cards/feedback-client.js',import.meta.url),'utf8'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 const r=w.document.getElementById('study-app'),f=r.querySelectorAll('iframe'),url='https://hebleo.com/wp-content/uploads/2025/10/at.mp3';
 const send=(index,audio,hebrew,patch={})=>w.dispatchEvent(new w.MessageEvent('message',{source:f[index].contentWindow,data:{type:'hebleo-base-audio',audio,hebrew,context:{generation:r.dataset.studyGeneration,noteId:'1',templateId:'2',face:index?'back':'front',...patch}}}));
 send(0,null,false);send(1,url,false);assert.equal(plays.length,0,'English front must not reveal the answer audio');
 r.dataset.studyFace='back';w.document.dispatchEvent(new w.Event('hebleo-study-context'));assert.equal(plays.length,1);send(1,url,false);assert.equal(plays.length,1,'ready retries cannot repeat');
 w.dispatchEvent(new w.MessageEvent('message',{source:f[1].contentWindow,data:{type:'hebleo-manual-audio'}}));assert(pauses>0);
 r.dataset.studyGeneration='g2';r.dataset.studyFace='front';send(0,null,true);send(1,url,false,{generation:'g1'});assert.equal(plays.length,1,'stale back cannot play');send(1,url,false);assert.equal(plays.length,2);
 w.eval('studyApp.currentDeckSettings.autoplay_audio=0');r.dataset.studyGeneration='g3';send(0,null,true);send(1,url,false);assert.equal(plays.length,2);
 dom.window.close();
});
