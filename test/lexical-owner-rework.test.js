import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {renderLexicalVocabulary} from '../public/lexical-vocabulary.js';
import {mountLexicalSettings} from '../public/studio/lexical-settings.js';
import {Store} from '../src/store.js';
import {lexicalFixture} from '../scripts/lexical-fixture.mjs';

// Disposable nonlinguistic projections/settings. No source approvals are issued.
const reviewed = revision => ({status:'approved', reviewedRevision:revision, reviewedBy:'synthetic-test', reviewedAt:'2026-10-18T00:00:00Z'});
const klass = (classId, category='verb') => ({classId, category, revision:'r', review:reviewed('r')});
const colored = (text, formatting) => ({text, formatting:{formattedValue:text,...formatting}, sourceTheme:[{colorType:'ACCENT1',color:{rgbColor:{green:.5}}}]});
const verb = value => ({wordKey:'synthetic-heading',category:'Verbs',available:true,english:'Synthetic display',runtimeId:'fixture-id',
  citation:{past:{status:'eligible',value},present:{status:'eligible',values:[value,{text:'SECOND'}],value}},
  forms:[{slotId:'synthetic-slot',status:'eligible',value,tense:'past',person:'3',number:'singular',gender:'m'}]});
function settings(t, classes=[klass('class-a'),klass('class-b')]) {
  const store=new Store(':memory:'),content=store.snapshot();content.lexical=lexicalFixture();content.lexical.classes=classes;
  const dom=new JSDOM('<main><input id="sibling"><section id="host"></section></main>',{pretendToBeVisual:true});
  const doc=dom.window.document,host=doc.querySelector('#host');let next=0,changes=0;
  const api=mountLexicalSettings(host,{getContent:()=>content,lessonId:'lesson-2',newId:()=>`synthetic-id-${++next}`,onChange:()=>changes++});
  t.after(()=>{api.dispose();dom.window.close();store.close();});
  const q=selector=>host.querySelector(selector);
  const select=(selector,value)=>{const field=q(selector);field.focus();field.value=value;field.dispatchEvent(new dom.window.Event('change',{bubbles:true}));};
  const click=selector=>{const b=q(selector);b.focus();b.click();};
  return {store,content,dom,doc,host,q,select,click,changes:()=>changes};
}

test('Hebrew word cells and combined citations explicitly use Hebrew/RTL; English actions stay isolated',()=>{
  const words=['Nouns','Adjectives','Verbs','Prepositions','Other'].map(category=>({...verb('PAST'),wordKey:category,category,hebrew:'WORD'}));
  const dom=new JSDOM(renderLexicalVocabulary(words)),doc=dom.window.document;
  try {
    for(const cell of doc.querySelectorAll('.lexical-word-row > .lexical-frozen-he')) {assert.equal(cell.dir,'rtl');assert.equal(cell.lang,'he');}
    const heading=doc.querySelector('.lexical-citation');assert.equal(heading.dir,'rtl');assert.equal(heading.lang,'he');
    assert.equal(heading.textContent,'PAST - PAST / SECOND');
    assert.deepEqual([...heading.querySelectorAll('.lexical-citation-part')].map(el=>el.getAttribute('aria-label')),['Past he citation','Present masculine singular citation']);
    for(const b of doc.querySelectorAll('[data-action="lookup"],[data-action="enroll"]')) {assert.equal(b.closest('[dir]').dir,'ltr');assert.equal(b.closest('[lang]').lang,'en');}
  } finally {dom.window.close();}
});

test('formatted citation foreground is neutral only in headings; exact strings, source runs, emphasis and expanded colours survive',()=>{
  const variants=[
    colored('TEST PAST',{effectiveFormat:{textDirection:'LEFT_TO_RIGHT',textFormat:{foregroundColor:'#008000',bold:true},backgroundColor:'#eeeeee'},textFormatRuns:[{startIndex:5,format:{foregroundColorStyle:{themeColor:'ACCENT1'},italic:true}}]}),
    colored('TEST PAST',{userEnteredFormat:{textFormat:{foregroundColorStyle:{rgbColor:{red:1}}}},textFormatRuns:[{startIndex:0,format:{foregroundColor:{green:.5}}}]}),
    colored('TEST PAST',{textFormatRuns:[{startIndex:0,format:{color:'#008000'}}]})
  ];
  for(const value of variants) {
    const word=verb(value),before=JSON.stringify(word),dom=new JSDOM(renderLexicalVocabulary([word])),doc=dom.window.document;
    try {
      const heading=doc.querySelector('.lexical-citation');assert.equal(heading.textContent,'TEST PAST - TEST PAST / SECOND');
      assert.ok([...heading.querySelectorAll('[style]')].every(el=>!el.style.color),'no authored foreground in heading');
      assert.ok([...heading.querySelectorAll('bdi')].every(el=>el.dir==='rtl'&&el.style.direction==='rtl'),'heading direction stays RTL even with LTR source formatting');
      assert.ok([...doc.querySelectorAll('.lexical-forms-row [style]')].some(el=>el.style.color),'expanded teaching foreground retained');
      if(value.formatting.effectiveFormat) {assert.ok(heading.querySelector('[style*="font-weight:700"]'));assert.ok(heading.querySelector('[style*="font-style:italic"]'));assert.ok(heading.querySelector('[style*="background-color:#eeeeee"]'));}
      assert.equal(JSON.stringify(word),before,'render never mutates source strings/runs/styles');
    } finally {dom.window.close();}
  }
});

test('reviewed class scope defaults correctly and retains an explicitly selected class, focus and status after Add',t=>{
  const pending=klass('pending');pending.review={status:'pending'};
  const {content,doc,q,select,click}=settings(t,[klass('class-a'),klass('class-b'),pending,klass('adjective-class','adjective')]);
  const sourceBefore=JSON.stringify({words:content.lexical.words,classes:content.lexical.classes});
  select('[data-lex-scope]','class');assert.equal(q('[data-lex-target]').value,'class-a');assert.equal(doc.activeElement,q('[data-lex-scope]'));
  assert.deepEqual([...q('[data-lex-target]').options].map(o=>o.value),['class-a','class-b']);
  select('[data-lex-target]','class-b');q('[data-lex-slot]').checked=true;const live=q('[data-lexical-status]');
  click('[data-lex-add]');assert.equal(q('[data-lex-target]').value,'class-b');assert.equal(doc.activeElement,q('[data-lex-add]'));
  assert.equal(content.lexical.unlocks.at(-1).scope.classId,'class-b');assert.equal(q('[data-lexical-status]'),live);assert.equal(live.getAttribute('role'),'status');assert.match(live.textContent,/forms added.*Save/i);
  assert.equal(JSON.stringify({words:content.lexical.words,classes:content.lexical.classes}),sourceBefore);
});

test('category/scope rerenders retain meaningful focus and validate targets against their own option sets',t=>{
  const {doc,q,select}=settings(t,[klass('class-a'),klass('class-b'),klass('adjective-class','adjective')]);
  select('[data-lex-scope]','class');select('[data-lex-target]','class-b');select('[data-lex-scope]','word');
  assert.equal(q('[data-lex-target]').value,'synthetic-verb');assert.equal(doc.activeElement,q('[data-lex-scope]'));
  select('[data-lex-scope]','class');assert.equal(q('[data-lex-target]').value,'class-b');
  select('[data-lex-category]','adjective');assert.equal(q('[data-lex-target]').value,'adjective-class');assert.equal(doc.activeElement,q('[data-lex-category]'));
  select('[data-lex-category]','verb');assert.equal(q('[data-lex-target]').value,'class-b');
  select('[data-lex-scope]','all');assert.equal(q('[data-lex-target-label]').hidden,true);assert.equal(q('[data-lex-add]').disabled,false);
});

test('no reviewed class has a clear unavailable state, no blank usable target, and cannot create additions',t=>{
  const {content,doc,q,select,click,changes}=settings(t,[]),before=JSON.stringify(content.lexical.unlocks);
  select('[data-lex-scope]','class');assert.equal(q('[data-lex-target]').value,'');assert.equal(q('[data-lex-target]').disabled,true);assert.match(q('[data-lex-target]').textContent,/No reviewed classes/);
  assert.match(q('[data-lex-target-label]').textContent,/Review.*class/i);assert.equal(q('[data-lex-add]').disabled,true);assert.equal(doc.activeElement,q('[data-lex-scope]'));
  q('[data-lex-slot]').checked=true;click('[data-lex-add]');assert.equal(changes(),0);assert.equal(JSON.stringify(content.lexical.unlocks),before);
  select('[data-lex-scope]','word');assert.equal(q('[data-lex-add]').disabled,false);assert.equal(q('[data-lex-target]').disabled,false);
});

test('removing additions focuses the adjacent remaining action or Add, with a persistent result announcement',t=>{
  const {content,doc,q,click}=settings(t);content.lexical.unlocks=content.lexical.unlocks.filter(u=>u.lessonId!=='lesson-2');
  for(let i=0;i<2;i++){q('[data-lex-slot]').checked=true;click('[data-lex-add]');}
  const live=q('[data-lexical-status]');click('[data-lex-remove]');assert.equal(doc.activeElement,q('[data-lex-remove]'));assert.match(live.textContent,/addition removed.*Save/i);
  click('[data-lex-remove]');assert.equal(q('[data-lex-remove]'),null);assert.equal(doc.activeElement,q('[data-lex-add]'));assert.equal(q('[data-lexical-status]'),live);
});

test('lesson link Add/Remove retains the open panel, selected word/action, keyboard focus and feedback',t=>{
  const {content,doc,q,select,click}=settings(t);const sourceBefore=JSON.stringify(content.lexical.words);
  q('[data-lex-bind]').closest('details').open=true;select('[data-lex-word]','synthetic-adjective');select('[data-lex-action]','reuse');click('[data-lex-bind]');
  assert.equal(doc.activeElement,q('[data-lex-bind]'));assert.equal(q('[data-lex-bind]').closest('details').open,true);assert.equal(q('[data-lex-word]').value,'synthetic-adjective');assert.equal(q('[data-lex-action]').value,'reuse');assert.match(q('[data-lexical-status]').textContent,/link added.*Save/i);
  const added=content.lexical.introductions.at(-1),remove=q(`[data-lex-unbind="${added.linkId}"]`);assert.ok(remove);remove.focus();remove.click();
  assert.ok(doc.activeElement.matches('[data-lex-unbind],[data-lex-bind]'));assert.ok(doc.activeElement.isConnected);assert.match(q('[data-lexical-status]').textContent,/link removed.*Save/i);assert.equal(JSON.stringify(content.lexical.words),sourceBefore);
});

test('validation failure preserves target, focused action and source model for retry',t=>{
  const {content,doc,q,select,click,changes}=settings(t),before=JSON.stringify(content.lexical);
  select('[data-lex-scope]','class');select('[data-lex-target]','class-b');click('[data-lex-add]');
  assert.equal(doc.activeElement,q('[data-lex-add]'));assert.equal(q('[data-lex-target]').value,'class-b');assert.match(q('[data-lexical-status]').textContent,/Select at least one form/);assert.equal(changes(),0);assert.equal(JSON.stringify(content.lexical),before);
});
