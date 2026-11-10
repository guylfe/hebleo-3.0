import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {Drill,makeChoices,answers,normalize,selectForms} from '../public/conjugation/engine.js';
import {mountConjugation} from '../public/conjugation/view.js';
import {fixture} from '../adapters/wordpress/conjugation/rehearsal/fixture.js';
const catalog=JSON.parse(readFileSync(new URL('../public/conjugation/catalog.json',import.meta.url)));

test('actual approved verbs/prepositions: every prompt has only same lexical ID, unique displays and exactly one accepted choice in both directions',()=>{
  const risk=catalog.words.find(w=>normalize(w.unpointed)==='הסתכן–מסתכן');assert(risk);
  assert(catalog.forms.some(f=>normalize(f.unpointed)==='גרנו'));
  for(const f of catalog.forms)for(const direction of ['he','en'])for(const random of [()=>0,()=>.999]){
    const options=makeChoices(f,catalog.forms,direction,random),valid=answers(f,catalog.forms,direction);
    assert(options.every(o=>o.wordId===f.wordId));assert(options.length<=4);
    for(const pointed of [false,true]){
      const values=options.map(o=>normalize(direction==='en'?o.english:pointed?o.pointed:o.unpointed,direction));
      assert.equal(new Set(values).size,values.length,f.id);
      assert.equal(values.filter(v=>valid.includes(v)).length,1,f.id);
    }
  }
  for(const f of catalog.forms.filter(f=>f.wordId===risk.id))assert(!makeChoices(f,catalog.forms).some(o=>normalize(o.unpointed)==='גרנו'));
});

test('narrow target queue can use same-word learned candidates, never an unlearned distractor; sparse defaults to Write and can reveal',()=>{
  const same=catalog.forms.filter(f=>f.wordId===catalog.forms[0].wordId),f=same[0];
  const learnedIds=same.slice(0,2).map(f=>f.id),choiceForms=selectForms(catalog,{platform:'native',scope:'learned',learnedIds});
  const d=new Drill(catalog,[f],{choiceForms});assert.equal(d.total,1);assert(d.options.every(o=>learnedIds.includes(o.id)));
  const sparse=new Drill(catalog,[f]);assert.equal(sparse.mode,'write');sparse.setMode('choose');assert.equal(sparse.mode,'write');
  sparse.show();assert.equal(sparse.feedback,'shown');sparse.selfCheck(false);sparse.next();assert.equal(sparse.pass,2);sparse.grade(f.unpointed);sparse.next();assert.equal(sparse.current,undefined);
});

test('explicit alternatives, Nikkud-equivalent duplicates and reverse ambiguity cannot be distractors',()=>{
  const cat=structuredClone(fixture),f=cat.forms[0];f.acceptedHebrew=['למדנו'];f.acceptedEnglish=['We studied'];
  cat.forms.push({...f,id:'fixture-duplicate',unpointed:f.pointed}, {...f,id:'fixture-reverse',english:'I learned'});
  for(const direction of ['he','en']){
    const options=makeChoices(f,cat.forms,direction,()=>.999),valid=answers(f,cat.forms,direction);
    assert.equal(options.filter(o=>valid.includes(normalize(direction==='he'?o.unpointed:o.english,direction))).length,1);
    assert(!options.some(o=>o.id==='fixture-study-we'||o.id==='fixture-duplicate'||o.id==='fixture-reverse'));
  }
});

test('reverse accepted readings use the grading pool even when candidates are restricted; supplied records resolve to canonical IDs',()=>{
  const cat=structuredClone(fixture),f=cat.forms[0],other=cat.forms[1];
  cat.forms.push({...f,id:'fixture-homograph',wordId:'fixture-want',english:other.english});
  const d=new Drill(cat,[{...f,wordId:'spoof'}],{allowFixtures:true,direction:'en',choiceForms:[f,other]});
  assert.equal(d.current.wordId,f.wordId);assert.equal(d.options.length,1);assert.equal(d.mode,'write');
  assert.equal(d.grade(other.english),true);
  assert.throws(()=>new Drill(cat,[f],{allowFixtures:true,choiceForms:[{id:'unknown'}]}));
});

test('two distractors sharing an accepted equivalent collapse in either direction',()=>{
  const cat=structuredClone(fixture),f=cat.forms[0];
  const one={...f,id:'fixture-synonym-one',unpointed:'למדתם',pointed:'לְמַדְתֶּם',english:'You studied',acceptedHebrew:['למדתן'],acceptedEnglish:['You learned']};
  const two={...f,id:'fixture-synonym-two',unpointed:'למדתן',pointed:'לְמַדְתֶּן',english:'You learned',acceptedHebrew:[],acceptedEnglish:[]};
  for(const direction of ['he','en']){
    const options=makeChoices(f,[f,one,two],direction,()=>.999);
    assert.equal(options.length,2);assert.equal(options.filter(o=>o.id!==f.id).length,1);
  }
});

test('bulk actions preserve other tab, unlearned/disabled selections and settings, update empty count and return keyboard focus',t=>{
  const dom=new JSDOM('<main></main>',{url:'https://fixture.invalid'}),root=dom.window.document.querySelector('main');
  const h=mountConjugation(root,{catalog:fixture,allowFixtures:true,learnedIds:fixture.forms.filter(f=>f.wordId!=='fixture-want').map(f=>f.id)});
  t.after(()=>{h.destroy();dom.window.close();});
  const click=a=>root.querySelector(`[data-action=${a}]`).click(),change=el=>el.dispatchEvent(new dom.window.Event('change',{bubbles:true}));
  const word=id=>root.querySelector(`[data-word=${id}]`);
  click('nikkud');const direction=root.querySelector('[data-action=direction]');direction.value='en';change(direction);
  const filter=root.querySelector('[data-filter=person]');filter.value='1';change(filter);
  const tense=root.querySelector('[data-tense=present]');tense.click();
  assert(word('fixture-want').disabled);assert(word('fixture-want').checked);
  for(const action of ['select-none','select-all','select-none']){
    const b=root.querySelector(`[data-action=${action}]`);assert.equal(b.type,'button');b.focus();
    b.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true,detail:0}));
    assert.equal(dom.window.document.activeElement.dataset.action,action);
    assert.equal(word('fixture-study').checked,action==='select-all');assert(word('fixture-want').checked);assert(word('fixture-want').disabled);
  }
  assert.match(root.textContent,/0 forms/);assert(root.querySelector('[data-action=start]').disabled);assert.match(root.textContent,/Select available/);
  click('prep');assert(word('fixture-my').checked);click('select-none');click('verb');assert(!word('fixture-study').checked);click('select-all');click('prep');assert(!word('fixture-my').checked);
  assert(root.querySelector('[data-action=nikkud]').checked);assert.equal(root.querySelector('[data-action=direction]').value,'en');assert.equal(root.querySelector('[data-filter=person]').value,'1');
  click('verb');assert(!root.querySelector('[data-tense=present]').checked);click('scope');assert(word('fixture-want').checked);assert(!word('fixture-want').disabled);
  assert.equal(root.querySelector('[data-typed]'),null);
});
