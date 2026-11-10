import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {JSDOM} from 'jsdom';import {mountConjugation} from '../public/conjugation/view.js';
const catalog=JSON.parse(fs.readFileSync(new URL('../public/conjugation/catalog.json',import.meta.url))),marks=/[\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7]/;
for(const platform of ['native','wordpress'])test(platform+': all 30 base labels toggle in selection and prompt without changing source or typed input',()=>{
 assert.equal(catalog.words.length,30);
 for(const word of catalog.words){
  const c={...catalog,forms:catalog.forms.filter(f=>f.wordId===word.id).slice(0,1)},before=JSON.stringify(c),dom=new JSDOM('<main></main>',{url:'https://nikkud-check.invalid'}),root=dom.window.document.querySelector('main');
  const h=mountConjugation(root,{catalog:c,platform,learnedIds:c.forms.map(f=>f.id)});
  if(word.kind==='prep')root.querySelector('[data-action=prep]').click();
  assert.equal(root.querySelector(`[data-word="${word.id}"]`).parentElement.querySelector('bdi').textContent.replaceAll('\u200b',''),word.unpointed);
  root.querySelector('[data-action=nikkud]').click();const pointed=root.querySelector(`[data-word="${word.id}"]`).parentElement.querySelector('bdi').textContent;
  assert(marks.test(pointed),word.unpointed+' selection has Nikkud');if(word.pointed)assert.equal(pointed.replaceAll('\u200b',''),word.pointed);
  root.querySelector('[data-action=start]').click();assert.equal(root.querySelector('.cp-base bdi').textContent,pointed);
  const input=root.querySelector('[data-typed]');input.value='טיוטה';input.dispatchEvent(new dom.window.Event('input',{bubbles:true}));
  root.querySelector('[data-action=nikkud]').click();assert.equal(root.querySelector('.cp-base bdi').textContent.replaceAll('\u200b',''),word.unpointed);assert.equal(root.querySelector('[data-typed]').value,'טיוטה');
  root.querySelector('[data-action=nikkud]').click();assert.equal(root.querySelector('.cp-base bdi').textContent,pointed);assert.equal(root.querySelector('[data-typed]').value,'טיוטה');
  assert.equal(JSON.stringify(c),before);h.destroy();dom.window.close();
 }
});
