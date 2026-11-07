import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {fixture} from '../adapters/wordpress/conjugation/rehearsal/fixture.js';
import {validateCatalog} from '../public/conjugation/engine.js';
import {validateConjugationCatalog} from '../src/conjugation.js';
import {mountNativeConjugation} from '../public/native-conjugation.js';
import {Store} from '../src/store.js';
import {createServer} from '../src/server.js';

test('native startup, portable grading and packaging share one complete record contract',()=>{
  for(const change of [c=>c.forms[0].provenance=[{}],c=>c.forms[0].tense='preposition',c=>c.forms[0].tense='gerund',c=>c.forms[0].tense='imperative',c=>c.forms[0].id='../bad',c=>c.words[0].pointed={},c=>c.forms[0].acceptedHebrew=['']]){
    const c=structuredClone(fixture);change(c);
    assert.throws(()=>validateCatalog(c));assert.throws(()=>validateConjugationCatalog(c,{allowFixtures:true}));
  }
  assert.equal(validateCatalog(fixture),fixture);
  assert.equal(validateConjugationCatalog(fixture,{allowFixtures:true}),fixture);
  assert.throws(()=>validateConjugationCatalog(fixture),/excluded/);
});

test('production catalogue preserves the exact approved lexical identities and excludes fixture records',()=>{
  const catalog=JSON.parse(readFileSync(new URL('../public/conjugation/catalog.json',import.meta.url),'utf8'));
  validateConjugationCatalog(catalog);
  assert.equal(catalog.words.filter(w=>w.kind==='verb').length,11);
  assert.equal(catalog.words.filter(w=>w.kind==='prep').length,19);
  assert.deepEqual(catalog.words.map(w=>w.id),[...Array.from({length:11},(_,i)=>'verb-proposal-'+String(i+1).padStart(2,'0')),...Array.from({length:19},(_,i)=>'prep-proposal-'+(i+1))]);
  assert.equal(catalog.forms.some(f=>f.approval==='fixture'),false);
  assert.equal(catalog.forms.length,508);
  assert.equal(catalog.forms.every(f=>f.approval==='approved'),true);
  assert.equal(catalog.forms.filter(f=>f.tense==='gerund').length,10);
  assert.equal(catalog.forms.some(f=>f.id==='verb-proposal-02:gerund:lexeme'),false);
  for(const word of catalog.words)assert(catalog.forms.some(f=>f.wordId===word.id));
});

test('actual native HTTP boundary mounts the actual shared view without learner or SRS writes',async t=>{
  const store=new Store(':memory:',{conjugationTestCatalog:fixture});
  const server=createServer(store);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+server.address().port;
  t.after(()=>new Promise(resolve=>server.close(()=>{store.close();resolve();})));
  const dom=new JSDOM('<main></main>',{url:origin}),root=dom.window.document.querySelector('main');
  t.after(()=>dom.window.close());
  const before=store.db.prepare('SELECT id,state FROM learners ORDER BY id').all();
  const mounted=mountNativeConjugation(root,{userId:'learner-demo',api:async path=>{const response=await fetch(origin+'/api/'+path,{headers:{'x-demo-user':'learner-demo'}});assert.equal(response.status,200);return response.json();}});
  t.after(()=>mounted.destroy());await mounted.ready;
  assert.match(root.textContent,/Synthetic fixture rehearsal/);
  assert.equal(root.querySelector('[data-action=start]').disabled,true);
  root.querySelector('[data-action=scope]').click();root.querySelector('[data-action=start]').click();root.querySelector('[data-action=write]').click();
  const input=root.querySelector('[data-typed]');input.value='synthetic wrong draft';input.dispatchEvent(new dom.window.Event('input',{bubbles:true}));
  root.querySelector('[data-action=nikkud]').click();assert.equal(root.querySelector('[data-typed]').value,input.value);
  root.querySelector('[data-action=check]').click();root.querySelector('[data-action=override]').click();
  assert.match(root.querySelector('[role=status]').textContent,/Correct/);
  assert.deepEqual(store.db.prepare('SELECT id,state FROM learners ORDER BY id').all(),before);
});
