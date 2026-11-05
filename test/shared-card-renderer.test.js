import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {parseFragment} from 'parse5';
import {JSDOM} from 'jsdom';
import {createRenderer} from '../src/shared-card-adapter/index.mjs';
const source=process.env.HEBLEO_SHARED_SOURCE;
const nodes=n=>[n,...(n.childNodes||[]).flatMap(nodes)];
const text=n=>n.nodeName==='#text'?n.value:(n.childNodes||[]).map(text).join('');
const has=(n,c)=>n.attrs?.find(a=>a.name==='class')?.value.split(' ').includes(c);
function fixture(){const json=n=>JSON.parse(readFileSync(join(source,n),'utf8'));return {raw:json('vocabulary.json'),renderer:createRenderer({mediaManifest:json('media-manifest.json'),mediaBaseUrl:'http://127.0.0.1:63592/review-media/'})};}
test('all1025 supplied layouts retain exact visible text, teaching classes, disclosure/infinitive/grid/group/replay counts',{skip:!source},()=>{
 const {raw,renderer}=fixture();
 for(const note of raw.notes){
  const before=parseFragment(note.fields.Forms),after=parseFragment(renderer.sanitize(note.fields.Forms));
  assert.equal(text(after),text(before),note.id);
  for(const c of ['hc-adjective-table','pair-groups','section-toggle','infinitive-row','hc-play','hc-hebrew','hc-pointed','hc-unpointed','teaching-blue','teaching-green','source-stress'])assert.equal(nodes(after).filter(n=>has(n,c)).length,nodes(before).filter(n=>has(n,c)).length,note.id+' '+c);
  for(const direction of ['he-en','en-he'])for(const face of ['front','back'])assert.ok(renderer.renderCard({note,direction,face}).startsWith('<!doctype html>'));
 }
});
function page(note,renderer,fail=false){
 let player,disconnections=0;
 const d=new JSDOM(renderer.renderCard({note,direction:'he-en',face:'back'}),{runScripts:'dangerously',beforeParse(w){
  w.ResizeObserver=class{observe(){}disconnect(){disconnections++}};
  w.Audio=class extends w.EventTarget{constructor(){super();player=this;this.plays=0;}pause(){}removeAttribute(){}load(){}play(){this.plays++;return fail?Promise.reject(Error('Synthetic playback failure')):Promise.resolve();}};
 }});
 return {d,get player(){return player},get disconnections(){return disconnections}};
}
test('approved runtime replay/end/error cleanup, independent disclosures and settings messages execute after rerender',{skip:!source},async()=>{
 const {raw,renderer}=fixture(),note=raw.notes.find(n=>n.fields.Forms.includes('section-toggle')&&n.fields.Audio),r=page(note,renderer);
 try{
  const w=r.d.window,doc=w.document,button=doc.querySelector('.hc-play');button.click();assert.equal(r.player.plays,1);assert.equal(button.getAttribute('aria-pressed'),'true');
  r.player.dispatchEvent(new w.Event('ended'));assert.equal(button.getAttribute('aria-pressed'),'false');
  const sections=[...doc.querySelectorAll('.section-toggle')];sections[0].click();sections[1].click();assert.equal(sections[0].getAttribute('aria-expanded'),'true');assert.equal(sections[1].getAttribute('aria-expanded'),'true');
  const messages=[];w.parent.postMessage=x=>messages.push(x);doc.querySelector('.hc-theme-input').click();doc.querySelector('.hc-nikkud').click();assert.deepEqual(JSON.parse(JSON.stringify(messages.at(-1))),{type:'hebleo-card-settings',mode:'dark',nikkud:true});
  w.eval(doc.scripts[0].textContent);assert.equal(r.disconnections,1);
  const current=r.player;button.click();assert.equal(current.plays,1);
  w.hebleoCard.destroy();button.click();assert.equal(current.plays,1);
 }finally{r.d.window.close();}
 const broken=page(note,renderer,true);
 try{broken.d.window.document.querySelector('.hc-play').click();await new Promise(r=>setImmediate(r));assert.match(broken.d.window.document.querySelector('.hc-audio-status').textContent,/retry/);}finally{broken.d.window.close();}
});

test('shared renderer relays keys only after trusted per-mount context and detaches on destroy',{skip:!source},()=>{
 const {raw,renderer}=fixture(),r=page(raw.notes[0],renderer);try{const w=r.d.window,doc=w.document,messages=[];w.parent.postMessage=m=>messages.push(m);const press=(key,extra={})=>{const event=new w.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true,...extra});doc.body.dispatchEvent(event);return event};press(' ');assert.equal(messages.length,0);
 const context={type:'hebleo-review-context',generation:'fixture-generation-123456'};w.dispatchEvent(new w.MessageEvent('message',{source:null,data:context}));press('1');assert.equal(messages.length,0);
 w.dispatchEvent(new w.MessageEvent('message',{source:w.parent,data:context}));assert(press(' ').defaultPrevented);press('4');assert(press('1',{repeat:true}).defaultPrevented);press('2',{isComposing:true});assert.deepEqual(messages.map(m=>m.key),['reveal','4']);assert(messages.every(m=>m.generation===context.generation));w.hebleoCard.destroy();press('3');assert.equal(messages.length,2);
 }finally{r.d.window.close()}
});
