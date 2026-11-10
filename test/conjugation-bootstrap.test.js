import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {JSDOM} from 'jsdom';import {IDBFactory} from 'fake-indexeddb';
import {fixture} from '../adapters/wordpress/conjugation/rehearsal/fixture.js';import {mountConjugation} from '../public/conjugation/view.js';import {createRunStore} from '../public/conjugation/run-store.js';
test('actual WordPress bootstrap retains legacy display preferences while saved runs stay account-isolated',async()=>{
 const dom=new JSDOM('<main></main>',{url:'https://synthetic.invalid'}),db=new IDBFactory();dom.window.indexedDB=db;
 const legacyKey='hebleo-conjugation-preferences-v1';dom.window.localStorage.setItem(legacyKey,JSON.stringify({nikkud:true,direction:'en'}));
 const catalog=structuredClone(fixture);catalog.forms.forEach(f=>f.approval='approved'); // Disposable engineering fixture, never released.
 const source=readFileSync(new URL('../adapters/wordpress/conjugation/bootstrap.js',import.meta.url),'utf8').replace("import {mountConjugation} from './view.js';",'');
 let handle,options;
 const run=new Function('document','mountConjugation',source);
 async function mount(id){
  dom.window.document.body.innerHTML='<div data-conjugation-host><div data-conjugation-root></div><script type="application/json" data-conjugation-catalog></script></div>';
  const host=dom.window.document.querySelector('[data-conjugation-host]');host.dataset.conjugationOwner=id;host.querySelector('script').textContent=JSON.stringify(catalog);
  run(dom.window.document,(root,input)=>{options=input;return handle=mountConjugation(root,input);});await handle.ready;
  const root=host.querySelector('[data-conjugation-root]');assert.equal(options.ownerKey,'wordpress:'+id);assert.equal(options.storageKey,legacyKey);
  assert.equal(root.querySelector('[data-action=nikkud]').checked,true);assert.equal(root.querySelector('[data-action=direction]').value,'en');return root;
 }
 let root=await mount('71');root.querySelector('[data-action=start]').click();await handle.flush();root.querySelector('[data-action=write]').click();
 const i=root.querySelector('[data-typed]');i.value='account 71 answer';i.dispatchEvent(new dom.window.Event('input',{bubbles:true}));await handle.flush();handle.destroy();
 root=await mount('72');assert(root.querySelector('[data-action=start]'));assert.equal(root.querySelector('[data-typed]'),null);
 assert.equal((await createRunStore('wordpress:72',{indexedDB:db}).read()).run,null);assert.equal((await createRunStore('wordpress:71',{indexedDB:db}).read()).run.drill.typed,'account 71 answer');
 assert.deepEqual(JSON.parse(dom.window.localStorage.getItem(legacyKey)),{nikkud:true,direction:'en'});handle.destroy();dom.window.close();
});
