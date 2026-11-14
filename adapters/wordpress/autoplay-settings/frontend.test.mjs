import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {JSDOM} from 'jsdom';

const [archive,fixture,php]=process.argv.slice(2),here=path.dirname(fileURLToPath(import.meta.url));
if(!archive)test('WordPress archive regression requires an external approved snapshot',{skip:'Supply ARCHIVE and optionally FIXTURE PHP to execute installed-source checks.'},()=>{});
const source=archive&&fs.readFileSync(archive,'utf8').match(/class StudyApp \{[\s\S]*?^\}/m)?.[0]?.replace(/<\?php[\s\S]*?\?>/g,code=>code.includes('wp_create_nonce')?'fixture-nonce':JSON.stringify('https://fixture.invalid/endpoint'));
if(archive&&!source)throw Error('Actual StudyApp class missing');
function mount(){
 const dom=new JSDOM('<div id="study-app"></div>',{url:'https://fixture.invalid/decks/',runScripts:'outside-only'}),w=dom.window;
 w.console={log(){},error(){}};w.eval(source+';window.StudyApp=StudyApp;');w.StudyApp.prototype.init=function(){};
 const app=new w.StudyApp();app.loadDecks=()=>{};w.alert=text=>{throw Error(text);};
 return {dom,w,app};
}
for(const value of archive?[0,1,'0','1']:[])test('checkbox renders saved '+JSON.stringify(value),()=>{
 const {dom,w,app}=mount();try{app.renderDeckSettings(8001,{new_cards_per_day:17,max_reviews_per_day:83,card_order:'mixed',autoplay_audio:value});assert.equal(w.document.querySelector('#autoplay-audio').checked,Number(value)===1);}finally{dom.window.close();}
});
for(const value of archive?[0,1,'0','1']:[])test('both card faces honor saved '+JSON.stringify(value),()=>{
 const {dom,w,app}=mount(),sides=[];
 try{w.setTimeout=fn=>{fn();return 1;};app.startAutoplay=side=>sides.push(side);app.currentDeckSettings={autoplay_audio:value};app.currentCard={front:'synthetic front',back:'synthetic back',state:'new',intervals:{again:'1m',hard:'5m',good:'1d',easy:'2d'}};app.renderStudyInterface();app.showAnswer();assert.deepEqual(sides,Number(value)===1?['front','back']:[]);}finally{dom.window.close();}
});
if(fixture&&php)test('actual Settings Save and reopen use independent full WordPress requests',async()=>{
 const {dom,w,app}=mount(),calls=[];
 const bridge=(action,fields)=>JSON.parse(execFileSync(php,['-d','extension_dir='+path.join(path.dirname(php),'ext'),'-d','extension=mysqli','-d','extension=mbstring',path.join(here,'native.test.php'),fixture,'request'],{input:JSON.stringify({action,owner:1,deck:8901,fields}),encoding:'utf8',windowsHide:true,timeout:15000}));
 app.makeRequest=async(action,fields)=>{calls.push(action);return bridge(action,fields);};
 try{
  for(const enabled of [false,true,false]){
   await app.loadDeckSettings(8901);const checkbox=w.document.querySelector('#autoplay-audio');checkbox.checked=enabled;
   await app.saveDeckSettings(8901,w.document.querySelector('.settings-modal'));assert.equal(w.document.querySelector('.settings-modal'),null);
   await app.loadDeckSettings(8901);assert.equal(w.document.querySelector('#autoplay-audio').checked,enabled,'fresh WordPress request and reopened modal');w.document.querySelector('.settings-modal').remove();
  }
  assert.equal(calls.filter(x=>x==='save_deck_settings').length,3);assert(calls.every(x=>['save_deck_settings','get_deck_settings'].includes(x)),'no review requests');
 }finally{dom.window.close();}
});
