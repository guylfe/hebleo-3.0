import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {Store} from '../src/store.js';
import {audioControls,wordCard,richFields,syncAudioControls} from '../public/learner-view.js';
import {playAudio,setPlaybackSpeed,stopMedia} from '../public/media.js';
import {createLearnerRenderer} from '../public/preview/learner-renderer.js';

test('OCT12 speed changes preserve the active player position and pause state',async t=>{
 const old=globalThis.Audio,players=[];globalThis.Audio=class{constructor(url){this.url=url;this.currentTime=0;this.paused=true;players.push(this);}play(){this.paused=false;return Promise.resolve();}pause(){this.paused=true;}};t.after(()=>{stopMedia();globalThis.Audio=old;});
 await playAudio('/media/SYNTHETIC-audio.wav',1);const p=players[0];p.currentTime=17.5;setPlaybackSpeed(.75);assert.equal(p.currentTime,17.5);assert.equal(p.paused,false);assert.equal(p.playbackRate,.75);assert.equal(p.preservesPitch,true);stopMedia();setPlaybackSpeed(1);assert.equal(p.currentTime,17.5);assert.equal(p.paused,true);assert.equal(players.length,1);
});

test('OCT12 shared and native audio controls show the saved speed without replacing source data',t=>{
 const d=new JSDOM('<main>'+audioControls('/media/SYNTHETIC.wav','Synthetic')+'<video controls></video><audio controls></audio></main>');t.after(()=>d.window.close());const root=d.window.document.querySelector('main'),video=root.querySelector('video');video.currentTime=22;syncAudioControls(root,.75);assert.equal(root.querySelectorAll('[data-audio-speed]').length,3);assert.ok([...root.querySelectorAll('[data-audio-speed]')].every(el=>el.value==='0.75'));assert.equal(video.currentTime,22);syncAudioControls(root,1);assert.equal(root.querySelectorAll('[data-native-speed]').length,2);assert.equal(video.currentTime,22);
 const w={id:'SYNTHETIC-word',pointed:'אֲנִי',english:'SYNTHETIC meaning',audio:'/media/SYNTHETIC.wav',notes:'Exact  notes',examples:[{hebrew:'אֲנִי בַּבַּיִת',english:'SYNTHETIC sentence'}],fieldFormatting:{pointed:{userEnteredFormat:{textFormat:{bold:true,foregroundColor:{red:1,green:0,blue:0}}}}}};const copy=structuredClone(w);root.innerHTML=wordCard(w)+richFields(w);assert.ok(root.querySelector('.hebrew[style*="font-weight"],.hebrew b,.hebrew [style*="font-weight"]'));assert.ok(root.textContent.includes('אֲנִי בַּבַּיִת'));assert.deepEqual(w,copy);
});

test('OCT12 saved-preview speed is local and survives a subsequent remount',t=>{
 const d=new JSDOM('<div id="host"></div>');t.after(()=>d.window.close());const s=new Store();t.after(()=>s.close());const pack=s.snapshot();pack.words[0].audio='/media/SYNTHETIC-preview.wav';const prefs={audioSpeed:1},calls=[];const renderer=createLearnerRenderer({playAudio:async(...args)=>calls.push(args),stopMedia(){}}),host=d.window.document.querySelector('#host');let unmount;
 const props={content:pack,lessonId:'lesson-1',step:'vocabulary',question:0,answer:{},preferences:prefs,actions:{setPreference:(key,value)=>{prefs[key]=value;}}};unmount=renderer.mount(host,props);t.after(()=>unmount?.());const input=host.querySelector('[data-audio-speed]:not(:disabled)');input.value='0.75';input.dispatchEvent(new d.window.Event('change',{bubbles:true}));assert.equal(prefs.audioSpeed,.75);host.querySelector('[data-action=audio]:not(:disabled)').click();assert.equal(calls[0][1],.75);assert.equal(s.learner('author-demo').preferences.audioSpeed,1);unmount();unmount=renderer.mount(host,props);assert.equal(host.querySelector('[data-audio-speed]:not(:disabled)').value,'0.75');
});

test('OCT12 desktop rules place open outline left and reclaim its column when collapsed',t=>{
 const d=new JSDOM('<style>'+readFileSync(new URL('../public/refinement.css',import.meta.url),'utf8')+'</style><div class="lesson-layout"><details class="lesson-toc" open><summary>Course outline</summary></details><div class="lesson-content"><bdi dir="rtl">אֲנִי</bdi></div></div>');t.after(()=>d.window.close());const layout=d.window.document.querySelector('.lesson-layout');assert.equal(d.window.getComputedStyle(layout).gridTemplateColumns,'210px minmax(0,1fr)');assert.equal(d.window.getComputedStyle(layout).direction,'ltr');layout.querySelector('details').open=false;assert.equal(d.window.getComputedStyle(layout).display,'block');assert.equal(layout.querySelector('bdi').dir,'rtl');
});
