import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {JSDOM} from 'jsdom';import {legacyWordpressView} from './legacy-view.mjs';import {fixture} from './rehearsal/fixture.js';
test('existing WordPress tutorial owner stays separate while generated shared view supports active-list controls and same-word choices',async()=>{
 const source=legacyWordpressView(readFileSync(new URL('../../../public/conjugation/view.js',import.meta.url),'utf8'));
 assert(!source.includes('./help.js'));assert(!source.includes('helpControl'));assert(!source.includes('bindPracticeHelp'));
 const engine=new URL('../../../public/conjugation/engine.js',import.meta.url).href;
 const {mountConjugation}=await import('data:text/javascript;base64,'+Buffer.from(source.replace("'./engine.js'",JSON.stringify(engine))).toString('base64'));
 const dom=new JSDOM('<main></main>'),root=dom.window.document.querySelector('main');const mount=mountConjugation(root,{catalog:fixture,allowFixtures:true,platform:'wordpress'});
 root.querySelector('[data-action=select-none]').click();assert(root.querySelector('[data-action=start]').disabled);
 root.querySelector('[data-action=select-all]').click();assert(!root.querySelector('[data-action=start]').disabled);
 root.querySelector('[data-word=fixture-want]').click();root.querySelector('[data-action=start]').click();assert(root.querySelectorAll('[data-action=answer]').length>=2);
 mount.destroy();assert.equal(root.children.length,0);dom.window.close();
});
