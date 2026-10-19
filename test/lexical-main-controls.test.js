import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import Specificity from '@bramus/specificity'; // already locked through JSDOM
import {renderLexicalVocabulary} from '../public/lexical-vocabulary.js';

const css = name => readFileSync(new URL('../public/'+name,import.meta.url),'utf8');
const base={wordKey:'synthetic-control',category:'Nouns',available:true,hebrew:'WORD',english:'Synthetic control'};
// Pseudo-state attributes preserve selector specificity. This exercises the real
// app stylesheet order and renderer; it is cascade evidence, not native pixels.
const states=source=>source.replace(/:(hover|focus-visible|active)\b/g,'[data-test-$1]');
function mount(words,options={}) {
  const dom=new JSDOM('<!doctype html><html><head></head><body>'+renderLexicalVocabulary(words,options)+'</body></html>',{pretendToBeVisual:true});
  for(const name of ['styles.css','refinement.css','lexical-vocabulary.css']) {
    const style=dom.window.document.createElement('style');style.textContent=states(css(name));dom.window.document.head.append(style);
  }
  return dom;
}
function luminance(rgb) {
  const values=rgb.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
  return values[0]*.2126+values[1]*.7152+values[2]*.0722;
}
function contrast(a,b) {const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}

// JSDOM does not reliably cascade competing pseudo selectors. Resolve these
// simple control declarations by real selector specificity and source order.
function controlStyle(dom,control) {
  const rules=[];
  for(const sheet of dom.window.document.styleSheets)for(const rule of sheet.cssRules)if(rule.type===1) {
    for(const specificity of Specificity.calculate(rule.selectorText))if(control.matches(specificity.selectorString()))rules.push({specificity,style:rule.style});
  }
  rules.sort((a,b)=>Specificity.compare(a.specificity,b.specificity));
  const result={},root=dom.window.getComputedStyle(dom.window.document.documentElement);
  const vars=value=>value.replace(/var\((--[\w-]+)(?:,([^()]*))?\)/g,(_,name,fallback)=>root.getPropertyValue(name).trim()||fallback||'');
  for(const {style} of rules) {
    for(const name of ['color','outline'])if(style.getPropertyValue(name))result[name]=vars(style.getPropertyValue(name));
    const background=style.getPropertyValue('background-color')||style.getPropertyValue('background');
    if(background)result.background=vars(background);
  }
  const probe=dom.window.document.createElement('i');
  probe.style.color=result.color;probe.style.background=result.background;
  return {color:probe.style.color,backgroundColor:probe.style.backgroundColor,outline:result.outline};
}

test('VOC-MAIN-01: Note, Examples and both preposition modes retain contrast through shared button states',()=>{
  const dom=mount([{...base,notes:'Synthetic note.\nSecond line.'},{...base,wordKey:'synthetic-examples',notes:undefined,examples:[{english:'EXAMPLE',hebrew:'WORD'}]},{...base,wordKey:'synthetic-preposition',category:'Prepositions',forms:[]}]);
  try {
    const doc=dom.window.document;
    const controls=[doc.querySelector('.lexical-has-note button.lexical-toggle'),doc.querySelector('.lexical-examples-only button.lexical-toggle'),...doc.querySelectorAll('[data-preposition-mode-button]')];
    for(const control of controls) {
      const selectedStates=control.hasAttribute('aria-pressed')?[false,true]:[null];
      for(const selected of selectedStates) {
        if(selected!==null)control.setAttribute('aria-pressed',String(selected));
        for(const state of [[],['hover'],['focus-visible'],['active'],['hover','focus-visible'],['hover','active'],['hover','focus-visible','active']]) {
          for(const name of ['hover','focus-visible','active'])control.toggleAttribute('data-test-'+name,state.includes(name));
          const style=controlStyle(dom,control),description=control.textContent+' selected='+selected+' '+state.join('/');
          assert.ok(contrast(style.color,style.backgroundColor)>=4.5,description+': '+style.color+' on '+style.backgroundColor);
          if(control.closest('.lexical-has-note'))assert.ok(luminance(style.backgroundColor)<.2,description+' retains green action');
          if(selected===true)assert.equal(style.backgroundColor,'rgb(10, 36, 87)',description+' retains selected navy');
          if(state.includes('focus-visible'))assert.match(style.outline,/3px solid/,description+' has focus outline');
        }
      }
    }
  } finally {dom.window.close();}
});

test('VOC-MAIN-02: citation wrapping has bounded flex items and break opportunities without changing authored text',()=>{
  const long='SYNTHETICLONGPART'.repeat(8),short='SHORT',hebrew='הִגְדִּיל';
  for(const parts of [[long,long],[short,short],[hebrew,hebrew]]) {
    const value=text=>({text,formatting:{formattedValue:text,textFormatRuns:[{startIndex:0,format:{foregroundColor:'#008000',bold:true}},{startIndex:3,format:{foregroundColor:'#ff0000',italic:true}}]}});
    const word={...base,category:'Verbs',citation:{past:{status:'eligible',value:value(parts[0])},present:{status:'eligible',value:value(parts[1])}},forms:[]},before=JSON.stringify(word),dom=mount([word]);
    try {
      const heading=dom.window.document.querySelector('.lexical-citation'),style=dom.window.getComputedStyle(heading);
      assert.equal(heading.textContent,parts[0]+' - '+parts[1]);assert.equal(heading.dir,'rtl');assert.equal(heading.lang,'he');
      assert.equal(style.flexWrap,'wrap');assert.equal(style.maxWidth,'100%');assert.equal(parseFloat(style.minWidth),0);assert.notEqual(style.whiteSpace,'nowrap');
      for(const part of heading.querySelectorAll('.lexical-citation-part')) {
        const p=dom.window.getComputedStyle(part);assert.equal(parseFloat(p.minWidth),0);assert.equal(p.maxWidth,'100%');assert.equal(p.overflowWrap,'anywhere');
        assert.notEqual(p.display,'inline-flex');assert.notEqual(p.whiteSpace,'nowrap');
      }
      assert.deepEqual([...heading.querySelectorAll('.lexical-citation-part')].map(p=>p.getAttribute('aria-label')),['Past he citation','Present masculine singular citation']);
      assert.ok([...heading.querySelectorAll('[style]')].every(el=>!el.style.color));
      assert.equal(JSON.stringify(word),before);
    } finally {dom.window.close();}
  }
});
