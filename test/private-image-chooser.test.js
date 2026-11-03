import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {chooseLocalImage} from '../public/author/image-chooser.js';
import {mediaHTTP,imageInput,approveInput,idle,fingerprint} from '../test-support/private-image-fixture.js';
const route='studio/media/approve-private-image-use';
const dom=t=>{const d=new JSDOM('<section></section>',{url:'http://localhost/'});t.after(()=>d.window.close());return {host:d.window.document.querySelector('section'),w:d.window};};
const submit=(host,w)=>host.querySelector('form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));

test('real import → status DTO → explicit private approval → exact selection → required alt → insertion; nothing saves implicitly',async t=>{
 const {store,api}=await mediaHTTP(t),input=imageInput({title:'SYNTHETIC <script>inert title</script>'}),pin=await api('studio/media/import',input),{host,w}=dom(t),calls=[],selected=[],before=fingerprint(store);
 const dispose=chooseLocalImage(host,{api:async(path,body)=>{calls.push({path,body});return api(path,body);},onSelected:p=>selected.push(p)});t.after(dispose);await idle(host);
 assert.equal(host.querySelector('script'),null);assert.match(host.textContent,/SYNTHETIC 1x1/);assert.ok(host.textContent.includes(pin.sha256));assert.equal(host.querySelector('img').getAttribute('src'),pin.url);assert.equal(host.querySelector('[data-select-media]').disabled,true);assert.equal(calls.length,1);assert.deepEqual(fingerprint(store),before);
 submit(host,w);assert.match(host.querySelector('[role=status]').textContent,/approved for private use/);assert.equal(selected.length,0);
 host.querySelector('[data-private-approve]').click();await idle(host);assert.equal(calls.filter(c=>c.path===route).length,1);assert.equal(selected.length,0);assert.equal(host.querySelector('[data-select-media]').disabled,false);assert.match(host.textContent,/Canonical teaching approval remains pending/);
 host.querySelector('[data-select-media]').click();submit(host,w);assert.match(host.querySelector('[role=status]').textContent,/alt text/);assert.equal(selected.length,0);
 host.querySelector('[name=alt]').value='SYNTHETIC description שָׁלוֹם 😀';submit(host,w);await idle(host);assert.equal(selected.length,1);assert.equal(selected[0].url,pin.url);assert.equal(selected[0].sha256,pin.sha256);assert.equal(selected[0].revisionId,pin.revisionId);assert.equal(selected[0].approval.status,'pending');assert.equal(selected[0].privateUseApproval.scope,'private-image-use');assert.equal(selected[0].alt,'SYNTHETIC description שָׁלוֹם 😀');assert.equal(host.hidden,true);assert.equal(store.currentDraft(),null);
 assert.deepEqual(store.media.state().assets[0].revisions[0].approval,{version:1,status:'pending'});
});

test('lost approval response retries the identical operation once; failure retains alt and never inserts',async t=>{
 const {store,api}=await mediaHTTP(t);await api('studio/media/import',imageInput());const {host}=dom(t),requests=[];let lose=true;
 const dispose=chooseLocalImage(host,{api:async(path,body)=>{const dto=await api(path,body);if(path===route){requests.push(body);if(lose){lose=false;throw Error('SYNTHETIC response lost');}}return dto;},onSelected:()=>assert.fail('No insert was requested')});t.after(dispose);await idle(host);host.querySelector('[name=alt]').value='Retain synthetic alt';host.querySelector('[data-private-approve]').click();await idle(host);assert.match(host.querySelector('[role=status]').textContent,/response lost/);assert.equal(host.querySelector('[name=alt]').value,'Retain synthetic alt');assert.equal(host.querySelector('[data-select-media]').disabled,true);
 const before=fingerprint(store);host.querySelector('[data-private-approve]').click();await idle(host);assert.deepEqual(requests[0],requests[1]);assert.deepEqual(fingerprint(store),before);assert.equal(host.querySelector('[data-select-media]').disabled,false);
});

test('stale chooser approval refuses then explicit refresh reviews the new head; previous revision remains exact',async t=>{
 const {api}=await mediaHTTP(t),first=await api('studio/media/import',imageInput()),{host}=dom(t);const dispose=chooseLocalImage(host,{api,onSelected:()=>assert.fail('No insert requested')});t.after(dispose);await idle(host);
 const second=await api('studio/media/import',imageInput({expectedRevisionId:first.revisionId}));host.querySelector('[name=alt]').value='Retain alt';host.querySelector('[data-private-approve]').click();await idle(host);assert.match(host.querySelector('[role=status]').textContent,/history changed/);assert.equal(host.querySelector('[name=alt]').value,'Retain alt');assert.equal(host.querySelectorAll('[data-select-media]').length,1);
 host.querySelector('[data-image-refresh]').click();await idle(host);assert.equal(host.querySelectorAll('[data-select-media]').length,2);host.querySelector('[data-private-approve="0"]').click();await idle(host);const dto=await api('studio/media/status');assert.equal(dto.assets[0].revisions[0].privateUseApproval.pin.revisionId,first.revisionId);assert.equal(dto.assets[0].revisions[1].revisionId,second.revisionId);assert.equal(dto.assets[0].revisions[1].privateUseApproval,null);
});

test('cancel during an explicit pending approval ignores late reply; reopening uses the persisted receipt',async t=>{
 const {api}=await mediaHTTP(t);await api('studio/media/import',imageInput());const {host}=dom(t);let release,started;const began=new Promise(r=>started=r),gate=new Promise(r=>release=r);let selected=0,closed=0;
 const dispose=chooseLocalImage(host,{api:async(path,body)=>{const dto=await api(path,body);if(path===route){started();await gate;}return dto;},onSelected:()=>selected++,onClose:()=>closed++});t.after(dispose);await idle(host);host.querySelector('[data-private-approve]').click();await began;host.querySelector('[data-image-cancel]').click();assert.equal(closed,1);assert.equal(host.hidden,true);release();await new Promise(r=>setTimeout(r,0));assert.equal(selected,0);assert.equal(closed,1);
 const reopened=chooseLocalImage(host,{api,onSelected:()=>selected++});t.after(reopened);await idle(host);assert.equal(host.querySelector('[data-private-approve]'),null);assert.equal(host.querySelector('[data-select-media]').disabled,false);
});

test('missing bytes after selection block Insert on the fresh server check and preserve text/alt',async t=>{
 const {store,api}=await mediaHTTP(t),pin=await api('studio/media/import',imageInput());await api(route,approveInput(pin));const {host,w}=dom(t);let selected=0;const dispose=chooseLocalImage(host,{api,onSelected:()=>selected++});t.after(dispose);await idle(host);host.querySelector('[data-select-media]').click();host.querySelector('[name=alt]').value='Synthetic retained alt';store.db.prepare('DELETE FROM media_blobs WHERE sha256=?').run(pin.sha256);const before=fingerprint(store);submit(host,w);await idle(host);assert.equal(selected,0);assert.equal(host.hidden,false);assert.equal(host.querySelector('[name=alt]').value,'Synthetic retained alt');assert.match(host.querySelector('[role=status]').textContent,/retained/);assert.deepEqual(fingerprint(store),before);
});

test('canonical-approved fake DTO, remote image URL and mismatched private pin do not enable insertion',async t=>{
 const {api}=await mediaHTTP(t),pin=await api('studio/media/import',imageInput());await api(route,approveInput(pin));const dto=await api('studio/media/status');
 for(const mutate of [r=>{r.approval.status='approved';r.privateUseApproval=null;},r=>r.url='https://foreign.invalid/image.png',r=>r.privateUseApproval.pin.sha256='0'.repeat(64)]){
  const bad=structuredClone(dto);mutate(bad.assets[0].revisions[0]);const {host}=dom(t),dispose=chooseLocalImage(host,{api:async()=>bad,onSelected:()=>assert.fail('Forged DTO must not insert')});t.after(dispose);await idle(host);assert.equal(host.querySelector('[data-select-media]:not(:disabled)'),null);assert.equal(host.querySelector('img[src^="https:"]'),null);
 }
});

test('preview failure disables approval/selection until explicit refresh; unavailable API does not fabricate candidates',async t=>{
 const {api}=await mediaHTTP(t);await api('studio/media/import',imageInput());const {host,w}=dom(t);const dispose=chooseLocalImage(host,{api,onSelected:()=>assert.fail('No insert requested')});t.after(dispose);await idle(host);host.querySelector('img').dispatchEvent(new w.Event('error'));assert.equal(host.querySelector('[data-private-approve]').disabled,true);assert.match(host.querySelector('[role=status]').textContent,/preview is unavailable/);host.querySelector('[data-image-refresh]').click();await idle(host);assert.equal(host.querySelector('[data-private-approve]').disabled,false);
 dispose();const missing=chooseLocalImage(host,{onSelected:()=>assert.fail('No API')});t.after(missing);await idle(host);assert.match(host.querySelector('[role=status]').textContent,/unavailable/);assert.equal(host.querySelector('[data-select-media]'),null);
});

test('real image status pagination bounds previews without silently approving imports',async t=>{
 const {store,api}=await mediaHTTP(t);for(let i=0;i<21;i++)await api('studio/media/import',imageInput({assetId:'synthetic-page-'+i}));const before=fingerprint(store),{host}=dom(t);const dispose=chooseLocalImage(host,{api,onSelected:()=>{}});t.after(dispose);await idle(host);assert.equal(host.querySelectorAll('img').length,20);host.querySelector('[data-image-page="1"]').click();assert.equal(host.querySelectorAll('img').length,1);assert.deepEqual(fingerprint(store),before);
});
