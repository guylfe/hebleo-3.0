import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {renderLexicalVocabulary, bindLexicalVocabulary} from '../public/lexical-vocabulary.js';

// Disposable display projections, never canonical linguistic fixtures. Hebrew
// samples are exact supplied prototype strings; placeholder English/form labels
// test rendering, not linguistic correctness or real approval/unlock decisions.
const sample = {wordKey:'fixture-word', category:'Nouns', available:true, hebrew:'יַיִן', english:'Wine', root:'יינ', pattern:'קָיִל'};
const form = (slotId, extra = {}) => ({slotId, status:'eligible', value:'יַיִן', ...extra});
const verb = { ...sample, wordKey:'fixture-verb', category:'Verbs', notes:'Supplied explanation.\n[Optional aside.]', citation:{past:form('Past · he', {value:'הִגְדִּיל'}),present:form('Present · Singular M', {value:'לוֹמֵד'})}, forms:[form('Past · he', {tense:'past',person:'3',number:'singular',gender:'m',base:true})] };
function mount(words, options = {}) {
  const dom = new JSDOM('<!doctype html><div id="host"></div>', {pretendToBeVisual:true});
  const root = dom.window.document.getElementById('host');
  root.innerHTML = renderLexicalVocabulary(words, options);
  return {dom, root, doc:dom.window.document};
}
function geometry(el, key, value) { Object.defineProperty(el, key, {configurable:true, get:() => typeof value === 'function' ? value() : value}); }
function rect(el, value) { el.getBoundingClientRect = () => ({left:0,right:500,top:0,bottom:50,width:500,height:50,...value}); }
function prep(count) {
  const pronouns = ['אני','הוא','היא','אתה','את','אתם','אתן','אנחנו','הם','הן'];
  return {...sample, category:'Prepositions', forms:pronouns.slice(0,count).map((pronoun,i) => form('slot-'+i,{pronoun, number:i < 5 ? 'singular' : 'plural'}))};
}

test('one lexical tbody per key across categories and repeated occurrences; conflicting duplicate projections fail closed', () => {
  const words = [sample, {...sample}, {...verb, wordKey:'second'}, {...sample, wordKey:'third', category:'Other'}, {...sample, wordKey:'hidden',available:false}];
  const before = JSON.stringify(words), {root} = mount(words);
  assert.equal(root.querySelectorAll('[data-word-key]').length, 3);
  assert.equal(root.querySelectorAll('table.lexical-table').length, 3);
  assert.equal(root.querySelectorAll('article').length, 0);
  assert.equal(JSON.stringify(words), before);
  assert.throws(() => renderLexicalVocabulary([sample,{...sample,english:'Conflict'}]), /Conflicting display/);
  assert.throws(() => renderLexicalVocabulary([{...sample,category:'Unknown'}]), /supported category/);
  assert.match(renderLexicalVocabulary([{...sample,available:undefined}]), /No vocabulary available/);
});

test('citation pair stays neutral and unchanged with locked expanded forms; no missing-citation substitution', () => {
  const word = {...verb,forms:verb.forms.map(f => ({...f,status:'locked',value:'NEVER_MOUNT_THIS'}))};
  const {root} = mount([word]);
  const heading = root.querySelector('.lexical-citation');
  assert.equal(heading.textContent, 'הִגְדִּיל - לוֹמֵד');
  assert.equal(root.querySelector('.lexical-paradigm'), null);
  assert.ok(!root.innerHTML.includes('NEVER_MOUNT_THIS'));
  const missing = mount([{...word,citation:{past:word.citation.past,present:{status:'inapplicable',value:'FORBIDDEN'}}}]).root;
  assert.equal(missing.querySelector('.lexical-citation').textContent, 'הִגְדִּיל - —');
  assert.equal(missing.querySelector('.lexical-citation [data-status]').dataset.status, 'inapplicable');
  assert.ok(!missing.innerHTML.includes('FORBIDDEN'));
});

test('all ineligible form states remain distinguishable without exposing hidden draft/source strings', () => {
  const states = ['locked','missing','unresolved','unapproved','inapplicable','unknown'];
  const {root} = mount([{...verb, forms:states.map((status,i) => form('slot-'+i,{status,value:'FORBIDDEN_'+status})).concat(form('empty',{value:''}))}]);
  assert.ok(!root.innerHTML.includes('FORBIDDEN'));
  assert.match(root.querySelector('.lexical-status-summary [data-status=missing]').textContent, /2/);
  assert.match(root.querySelector('.lexical-status-summary [data-status=unresolved]').textContent, /2/);
  for (const status of states.slice(0,-1)) assert.ok(root.querySelector('.lexical-status-summary [data-status='+status+']'));
});

test('verb forms are above Notes and shared metadata merges genders without inferring from equal strings', () => {
  const forms = [
    ...verb.forms,
    form('Past · they',{tense:'past',person:'3',number:'plural',gender:'shared'}),
    form('Present · Singular M',{tense:'present',number:'singular',gender:'m',base:true}),
    form('Present · Singular F',{tense:'present',number:'singular',gender:'f'}),
    form('Future · he',{status:'locked',tense:'future',person:'3',number:'singular',gender:'m'}),
    form('Infinitive',{tense:'infinitive',label:'Infinitive'})
  ];
  const {root} = mount([{...verb, forms}]);
  const body = root.querySelector('[data-word-key]');
  assert.deepEqual([...body.children].map(el => el.className), ['lexical-word-row','lexical-forms-row','lexical-support-row']);
  const bands = [...root.querySelectorAll('.lexical-paradigm > tbody')];
  assert.equal(bands.length, 2);
  assert.equal(bands[0].querySelector('[data-slot-id="Past · they"]').closest('td').colSpan, 2);
  assert.equal(bands[0].querySelector('[data-slot-id="Past · they"]').closest('td').querySelector('.lexical-pronoun').textContent, 'they');
  assert.equal(bands[1].querySelectorAll('td[colspan="2"]').length, 0);
  assert.equal(root.querySelectorAll('.lexical-nominals dd').length, 1);
  assert.equal(root.querySelector('.lexical-forms-row > td').colSpan, 5);
  assert.equal(root.querySelector('.lexical-support-row > td').colSpan, 5);
  assert.equal(root.querySelector('.lexical-support-row').children.length, 1);
  const partial = mount([{...verb,forms:[form('they',{tense:'past',person:'3',number:'plural',gender:'shared',introducedGenders:['m']})]}]).root;
  assert.equal(partial.querySelectorAll('.lexical-paradigm td[colspan="2"]').length, 0);
  assert.equal(partial.querySelectorAll('.lexical-paradigm [data-slot-id=they]').length, 1);
});

test('adjectives use one entry with gender rows and singular/plural under Hebrew, without a duplicate citation column', () => {
  const word = {...sample,category:'Adjectives',forms:['singular','plural'].flatMap(number => ['m','f'].map(gender => form(number+'-'+gender,{number,gender,base:number === 'singular' && gender === 'm'})))};
  const {root} = mount([word]);
  assert.equal(root.querySelectorAll('[data-word-key]').length, 1);
  assert.equal(root.querySelectorAll('.lexical-adjectives .lexical-adjective-row [data-status=eligible]').length, 4);
  assert.deepEqual([...root.querySelectorAll('.lexical-adjectives thead tr:last-child th')].map(e=>e.textContent),['Gender','Singular','Plural']);
  assert.equal(root.querySelector('.lexical-adjectives thead th').colSpan,3);
  assert.equal(root.querySelectorAll('.lexical-adjectives tbody .lexical-frozen-he').length,0);
  assert.equal(root.querySelector('.lexical-base-form').title,'Citation form');
  assert.ok(!root.querySelector('.lexical-base-form').textContent.includes('base'));
  assert.equal(root.querySelectorAll('u,.lexical-forms-row').length, 0);
  const partial = mount([{...word,forms:word.forms.map((f,i) => ({...f,status:i ? 'locked' : 'eligible'}))}]).root;
  assert.equal(partial.querySelectorAll('.lexical-adjectives [data-status=eligible]').length, 1);
});

test('reviewed bilingual constructions suppress bare meaning only with explicit metadata and preserve notes', () => {
  const {root} = mount([{...verb,english:'REDUNDANT',usages:[{hebrew:'הִגְדִּיל',english:'Reviewed construction',notes:'Construction note',coversBareMeaning:true}], examples:[{hebrew:'לוֹמֵד',english:'Supplied example'}]}]);
  assert.ok(!root.innerHTML.includes('REDUNDANT'));
  const pair = root.querySelector('.lexical-frozen-en .lexical-pair');
  assert.deepEqual([...pair.querySelectorAll(':scope > bdi')].map(el => el.lang), ['en','he']);
  assert.equal(pair.querySelector('[lang=he]').dir, 'rtl');
  assert.match(pair.textContent, /Construction note/);
  assert.equal(root.querySelector('.lexical-frozen-en [data-lexical-toggle=notes]'), null);
  const panel = root.querySelector('.lexical-note-content');
  assert.deepEqual([...panel.querySelectorAll('h3')].map(el => el.textContent), ['Note','Examples']);
  assert.deepEqual([...panel.querySelector('.lexical-pair').children].map(el => el.lang), ['en','he']);
});

test('exact source UTF-16 rich runs, note asides, and stale-format rejection use shared safe rich rendering', () => {
  const notes = 'A [aside] B';
  const formatted = {text:notes, formatting:{formattedValue:notes,textFormatRuns:[{startIndex:0,format:{bold:true}},{startIndex:3,format:{foregroundColor:'#ff0000',italic:true}}]}};
  const {root} = mount([{...sample,notes:formatted,hebrew:{text:'יַיִן',formatting:{formattedValue:'יַיִן',textFormatRuns:[{startIndex:0,format:{foregroundColor:'#00aa00'}},{startIndex:2,format:{bold:true}}]}}}]);
  assert.equal(root.querySelector('.lexical-note-body').textContent, notes);
  assert.equal(root.querySelector('.lexical-aside').textContent, '[aside]');
  assert.match(root.querySelector('.lexical-aside').innerHTML, /color:#ff0000/);
  assert.match(root.querySelector('tbody .lexical-frozen-he').innerHTML, /color:#00aa00/);
  assert.match(root.querySelector('tbody .lexical-frozen-he').innerHTML, /font-weight:700/);
  const stale = mount([{...sample,notes:{text:'different',formatting:formatted.formatting},english:'<img src=x onerror=bad()>'}]).root;
  assert.equal(stale.querySelector('img'), null);
  assert.equal(stale.querySelector('.lexical-note-body [style*="ff0000"]'), null);
});

test('binding opens/closes inline forms and Notes without replacing unrelated answers, and Escape restores focus', () => {
  const {root,doc,dom} = mount([verb]);
  const answer = doc.createElement('input'); answer.value = 'retained'; root.append(answer);
  const changes = [], api = bindLexicalVocabulary(root,{onDisclosure:change => changes.push(change)});
  const show = root.querySelector('[data-lexical-toggle=forms]'), panel = doc.getElementById(show.getAttribute('aria-controls'));
  assert.equal(panel.hidden, true); show.click();
  assert.equal(show.getAttribute('aria-expanded'), 'true'); assert.equal(panel.hidden, false);
  const scroller = panel.querySelector('[tabindex]'); scroller.focus();
  scroller.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  assert.equal(panel.hidden, true); assert.equal(doc.activeElement, show);
  assert.equal(answer.value, 'retained'); assert.equal(root.lastChild, answer);
  const note = root.querySelector('[data-note-button]'); note.click();
  assert.equal(note.textContent, 'Collapse'); assert.equal(root.querySelector('.lexical-note-content').hidden, false);
  note.click(); assert.equal(note.textContent, 'Expand'); assert.equal(root.querySelector('[data-note-ellipsis]').hidden, false);
  assert.equal(changes.length, 4); api.destroy(); show.click(); assert.equal(panel.hidden, true);
});

test('measured one-line Notes stay complete; overflow/multiline force ellipsis; examples-only use the same inline location', () => {
  const {root} = mount([{...sample,notes:'Short note.'},{...sample,wordKey:'examples',notes:'',examples:[{hebrew:'יַיִן',english:'Wine'}]}]);
  const api = bindLexicalVocabulary(root), strip = root.querySelector('[data-note-strip]'), line = strip.querySelector('[data-note-line]');
  geometry(strip.querySelector('.lexical-note-top'),'clientWidth',100);
  geometry(line,'clientWidth',100); geometry(line,'scrollWidth',80); api.measure();
  assert.equal(strip.querySelector('[data-note-button]').hidden,true);
  assert.equal(strip.querySelector('[data-note-ellipsis]').hidden,true);
  geometry(line,'scrollWidth',200); api.measure();
  assert.equal(strip.querySelector('[data-note-button]').hidden,false);
  assert.equal(strip.querySelector('[data-note-ellipsis]').hidden,false);
  strip.querySelector('[data-note-button]').click();
  assert.equal(strip.querySelector('[data-full-note]').hidden,false);
  assert.equal(root.querySelector('.lexical-examples-only').closest('tr').className,'lexical-support-row');
  assert.equal(root.querySelector('.lexical-examples-only .lexical-note-marker'),null);
  api.destroy();
});

test('Note and Examples rows span every category column and adjective structure cells end before the note', () => {
  const adjective = {...sample,category:'Adjectives',notes:'Note.',forms:['singular','plural'].flatMap(number => ['m','f'].map(gender => form(number+'-'+gender,{number,gender})))};
  for (const word of [{...sample,notes:'Note.'},verb,adjective,{...adjective,forms:adjective.forms.slice(0,1)}, {...prep(7),notes:'Note.'}, {...sample,category:'Other',examples:[{hebrew:'יַיִן',english:'Wine'}]}]) {
    const {root}=mount([word]), table=root.querySelector('.lexical-table'),support=table.querySelector('.lexical-support-row');
    assert.equal(support.children.length,1,word.category);
    assert.equal(support.firstElementChild.colSpan,table.querySelectorAll(':scope > colgroup > col').length,word.category);
    for(const cell of table.querySelectorAll('tbody .lexical-structure[rowspan]')) assert.equal(cell.rowSpan,table.querySelectorAll('.lexical-adjective-row').length);
  }
});

test('collapsing another note and repeated layout callbacks cannot oscillate an expanded single-line note', () => {
  const {root,doc,dom}=mount([{...sample,wordKey:'paam',notes:'First line.\nSecond line.'},{...sample,wordKey:'yachol',category:'Adjectives',notes:'Long single-line source note.',forms:[form('sg-m',{number:'singular',gender:'m'})]}]);
  const style=doc.createElement('style');style.textContent=readFileSync(new URL('../public/lexical-vocabulary.css',import.meta.url),'utf8');doc.head.append(style);
  const strip=root.querySelector('[data-word-key=yachol] [data-note-strip]'),top=strip.querySelector('.lexical-note-top'),line=strip.querySelector('[data-note-line]'),preview=strip.querySelector('.lexical-note-preview'),button=strip.querySelector('[data-note-button]');
  let width=600,intrinsic=500;
  geometry(top,'clientWidth',()=>width);rect(top.querySelector('strong'),{width:76});
  geometry(line,'clientWidth',()=>dom.window.getComputedStyle(preview).display==='none'?0:width-112-(button.hidden?0:128));
  geometry(line,'scrollWidth',()=>dom.window.getComputedStyle(preview).display==='none'?0:Math.max(intrinsic,line.clientWidth));
  const api=bindLexicalVocabulary(root,{encounters:{has:()=>false,mark:()=>{}}});
  assert.equal(button.getAttribute('aria-expanded'),'true');
  assert.equal(dom.window.getComputedStyle(preview).visibility,'hidden');
  const other=root.querySelector('[data-word-key=paam] [data-note-button]');other.click();
  for(let i=0;i<30;i++) {api.measure();dom.window.dispatchEvent(new dom.window.Event('scroll'));assert.equal(strip.dataset.needsExpand,'true');assert.equal(button.hidden,false);assert.equal(strip.querySelector('[data-full-note]').hidden,false);}
  assert.equal(other.getAttribute('aria-expanded'),'false');
  button.click();for(let i=0;i<10;i++)api.measure();
  assert.equal(button.getAttribute('aria-expanded'),'false');assert.equal(strip.querySelector('[data-note-ellipsis]').hidden,false);
  // A note fitting without an action gets the full line back, even if Expand
  // was visible before the resize. It must also recover when narrowing again.
  intrinsic=450;api.measure();assert.equal(button.hidden,true);assert.equal(strip.dataset.needsExpand,'false');
  width=500;api.measure();assert.equal(button.hidden,false);assert.equal(strip.dataset.needsExpand,'true');
  button.click();width=900;api.measure();assert.equal(button.hidden,true);assert.equal(button.getAttribute('aria-expanded'),'false');
  assert.equal(strip.querySelector('.lexical-note-content').hidden,true);assert.equal(dom.window.getComputedStyle(preview).visibility,'visible');
  width=0;api.measure();assert.equal(strip.dataset.needsExpand,'false');
  api.destroy();
});

test('short notes retain an Examples action, and its width is included without an ellipsis feedback loop', () => {
  const {root}=mount([{...sample,notes:'Short note.',examples:[{hebrew:'יַיִן',english:'Wine'}]}]);
  const strip=root.querySelector('[data-note-strip]'),top=strip.querySelector('.lexical-note-top'),line=strip.querySelector('[data-note-line]'),button=strip.querySelector('[data-note-button]');
  geometry(top,'clientWidth',400);rect(top.querySelector('strong'),{width:60});rect(button,{width:100});geometry(line,'scrollWidth',200);
  const api=bindLexicalVocabulary(root);assert.equal(button.hidden,false);assert.equal(strip.dataset.needsExpand,'false');
  button.click();api.measure();assert.equal(strip.querySelector('[data-full-note]').hidden,true);assert.equal(strip.querySelector('.lexical-note-content').hidden,false);
  geometry(line,'scrollWidth',300);for(let i=0;i<10;i++)api.measure();assert.equal(strip.dataset.needsExpand,'true');assert.equal(strip.querySelector('[data-full-note]').hidden,false);
  api.destroy();
});

test('first-encounter behavior uses caller state, marks visible notes only, and reopens changed revisions without writing browser storage', () => {
  const seen = new Set(), marked = [];
  const encounters = {has:token => seen.has(token),mark:token => {seen.add(token);marked.push(token);}};
  const {root,dom} = mount([verb]);
  let storageReads = 0;
  Object.defineProperty(dom.window,'localStorage',{get() { storageReads++; throw Error('Forbidden state owner'); }});
  const strip = root.querySelector('[data-note-strip]'); rect(strip,{top:2000,bottom:2050});
  const api = bindLexicalVocabulary(root,{encounters});
  assert.equal(strip.querySelector('[data-note-button]').getAttribute('aria-expanded'),'true');
  assert.equal(marked.length,0);
  rect(strip,{top:10,bottom:60}); api.measure(); api.measure();
  assert.equal(marked.length,1);
  strip.querySelector('[data-note-button]').click(); api.measure();
  assert.equal(strip.querySelector('[data-note-button]').getAttribute('aria-expanded'),'false');
  assert.equal(storageReads,0); api.destroy();
  const revisit = mount([verb]).root;
  const revisited = bindLexicalVocabulary(revisit,{encounters});
  assert.equal(revisit.querySelector('[data-note-button]').getAttribute('aria-expanded'),'false'); revisited.destroy();
  const revised = mount([{...verb,noteRevision:'2'}]).root;
  const revisedAPI = bindLexicalVocabulary(revised,{encounters});
  assert.equal(revised.querySelector('[data-note-button]').getAttribute('aria-expanded'),'true'); revisedAPI.destroy();
});

test('seven preposition forms always remain horizontal; ten adapt to measured overflow only in Compact; Full stays horizontal', () => {
  for (const count of [3,7,10]) {
    const {root} = mount([prep(count)]), api = bindLexicalVocabulary(root);
    const forms = root.querySelector('[data-preposition-forms]'), viewport = forms.parentElement;
    geometry(viewport,'clientWidth',600);
    geometry(forms.querySelector('.lexical-preposition-horizontal'),'scrollWidth',500);
    api.measure(); assert.equal(forms.dataset.orientation,'horizontal');
    geometry(viewport,'clientWidth',200); api.measure();
    assert.equal(forms.dataset.orientation,count === 10 ? 'vertical' : 'horizontal');
    if (count === 10) {
      assert.match(root.textContent,/הם/); assert.match(root.textContent,/הן/);
      root.querySelector('[data-preposition-mode-button=full]').click();
      assert.equal(root.querySelector('.lexical-preposition-full').dataset.count,'10');
      assert.equal(root.querySelectorAll('.lexical-preposition-full thead th').length,12);
      assert.equal(root.querySelector('[data-preposition-mode-button=full]').getAttribute('aria-pressed'),'true');
      root.querySelector('[data-preposition-mode-button=compact]').click();
      const returned=root.querySelector('[data-preposition-forms]');
      geometry(returned.parentElement,'clientWidth',200);
      geometry(returned.querySelector('.lexical-preposition-horizontal'),'scrollWidth',500);
      api.measure();assert.equal(returned.dataset.orientation,'vertical');
    }
    api.destroy();
  }
});

test('preposition unlocked count excludes source-rich locked forms', () => {
  const word = prep(10); word.forms = word.forms.map((f,i) => ({...f,status:i < 7 ? 'eligible':'locked',value:i < 7 ? f.value:'FORBIDDEN'}));
  const {root} = mount([word]);
  assert.equal(root.querySelector('[data-preposition-forms]').dataset.count,'7');
  assert.equal(root.querySelector('.lexical-preposition-vertical'),null);
  assert.ok(!root.innerHTML.includes('FORBIDDEN'));
});

test('sticky offsets follow measured Hebrew/English widths and release together when viewport cannot contain both', () => {
  const {root,dom} = mount([verb]), api = bindLexicalVocabulary(root);
  const scroll = root.querySelector('.lexical-table-scroll'), he = root.querySelector('thead .lexical-frozen-he'), en = root.querySelector('thead .lexical-frozen-en');
  rect(he,{width:123}); rect(en,{width:187}); geometry(scroll,'clientWidth',600); geometry(scroll,'scrollWidth',900);
  api.measure();
  assert.equal(scroll.style.getPropertyValue('--lexical-he-width'),'123px');
  assert.equal(scroll.style.getPropertyValue('--lexical-frozen-width'),'310px');
  assert.equal(scroll.dataset.freeze,'true');
  rect(scroll,{left:0,right:600});
  const button = root.querySelector('[data-lexical-toggle=forms]'); rect(button,{left:200,right:280});
  scroll.scrollLeft = 200; button.dispatchEvent(new dom.window.FocusEvent('focusin',{bubbles:true}));
  assert.equal(scroll.scrollLeft,90);
  rect(he,{width:160}); api.measure(); assert.equal(scroll.style.getPropertyValue('--lexical-he-width'),'160px');
  geometry(scroll,'clientWidth',330); api.measure(); assert.equal(scroll.dataset.freeze,'false');
  api.destroy();
});

test('rebind tears down old listeners/observers and destroy prevents resize/scroll callbacks', () => {
  const {root,dom} = mount([verb]);
  const instances = [];
  dom.window.ResizeObserver = class { constructor(fn) {this.fn=fn;this.nodes=[];instances.push(this);} observe(node) {this.nodes.push(node);} disconnect() {this.disconnected=true;} };
  dom.window.IntersectionObserver = dom.window.ResizeObserver;
  const old = bindLexicalVocabulary(root);
  assert.ok(instances[0].nodes.length > 0);
  const changes = [], next = bindLexicalVocabulary(root,{onDisclosure:change => changes.push(change)});
  assert.ok(instances.slice(0,2).every(observer => observer.disconnected));
  const show = root.querySelector('[data-lexical-toggle=forms]'); show.click();
  assert.equal(changes.length,1); assert.equal(show.getAttribute('aria-expanded'),'true');
  old.destroy(); next.destroy(); show.click();
  assert.equal(changes.length,1); assert.ok(instances.every(observer => observer.disconnected));
});

test('IDs stay stable through reorder and punctuation keys cannot inject markup or collide; isolated instances have independent IDs', () => {
  const words = [{...verb,wordKey:'a.b'},{...verb,wordKey:'a-b'},{...verb,wordKey:'<script>"'}];
  const a = mount(words,{idPrefix:'learner'}).root, b = mount([...words].reverse(),{idPrefix:'learner'}).root, c = mount(words,{idPrefix:'rehearsal'}).root;
  const ids = root => [...root.querySelectorAll('[id]')].map(el => el.id).sort();
  assert.deepEqual(ids(a),ids(b)); assert.equal(new Set(ids(a)).size,6);
  assert.ok(ids(a).every(id => !ids(c).includes(id)));
  assert.equal(a.querySelector('script'),null);
  for (const button of a.querySelectorAll('[aria-controls]')) assert.ok(a.querySelector('[id="'+button.getAttribute('aria-controls')+'"]'));
});

test('stylesheet keeps structures, overflow, semantic focus and minimal adjective grid scoped to this component', () => {
  const css = readFileSync(new URL('../public/lexical-vocabulary.css',import.meta.url),'utf8');
  const {root,doc,dom} = mount([verb]); const style = doc.createElement('style'); style.textContent=css; doc.head.append(style);
  assert.equal(dom.window.getComputedStyle(root.querySelector('.lexical-forms-row')).display,'none');
  const api = bindLexicalVocabulary(root); root.querySelector('[data-lexical-toggle=forms]').click();
  assert.notEqual(dom.window.getComputedStyle(root.querySelector('.lexical-forms-row')).display,'none');
  assert.match(css,/left:var\(--lexical-he-width\)/);
  // Root/Pattern must not inherit the dark action-button hover token.
  assert.doesNotMatch(css,/var\(--action-hover/);
  assert.match(css,/:focus-visible/); api.destroy();
});

test('an explicitly paired example is displayed once while source note text and UTF-16 formatting stay unchanged',()=>{
  const raw='Authored introduction.\nExample pair – TEST HEBREW\nAuthored ending.';
  const notes={text:raw,formatting:{formattedValue:raw,textFormatRuns:[{startIndex:0,format:{bold:true}},{startIndex:raw.indexOf('Authored ending.'),format:{italic:true}}]}};
  const word={...sample,notes,examples:[{english:'Example pair',hebrew:'TEST HEBREW'}]},before=JSON.stringify(word);
  const {root}=mount([word]);
  const body=root.querySelector('.lexical-note-body');
  assert.equal(body.textContent.trim(),'Authored introduction.\n\nAuthored ending.');
  assert.ok(!body.textContent.includes('Example pair'));
  assert.equal(root.querySelectorAll('.lexical-note-content .lexical-pair').length,1);
  assert.match(body.innerHTML,/font-style:italic/);
  assert.equal(JSON.stringify(word),before);
});

test('construction Note link opens its own explanation and restores a reachable disclosure focus',()=>{
  const words=[{...verb,wordKey:'first',usages:[{english:'pass through',hebrew:'עָבַר בֶּ',noteLink:true}]},{...verb,wordKey:'second'}];
  const {root,doc}=mount(words),changes=[],api=bindLexicalVocabulary(root,{onDisclosure:x=>changes.push(x)});
  root.querySelector('[data-lexical-open-note]').click();
  const first=root.querySelector('[data-word-key=first]'),second=root.querySelector('[data-word-key=second]');
  assert.equal(first.querySelector('.lexical-note-content').hidden,false);
  assert.equal(second.querySelector('.lexical-note-content').hidden,true);
  assert.equal(doc.activeElement,first.querySelector('[data-note-button]'));
  assert.deepEqual(changes,[{wordKey:'first',kind:'notes',expanded:true}]);
  api.destroy();
});

test('verb labels use Hebrew you forms and one shared they label, while present stays gender/number only',()=>{
  const forms=[form('you',{tense:'past',person:'2',number:'singular',gender:'f'}),form('you-pl',{tense:'future',person:'2',number:'plural',gender:'shared'}),form('present',{tense:'present',number:'singular',gender:'m'})];
  const {root}=mount([{...verb,forms}]);
  assert.deepEqual([...root.querySelectorAll('.lexical-pronoun')].map(n=>n.textContent),['את','אתם / אתן']);
  assert.equal(root.querySelector('[data-slot-id=you]').closest('td').querySelector('.lexical-pronoun').dir,'rtl');
  assert.equal(root.querySelector('[data-slot-id=present]').closest('td').querySelector('.lexical-pronoun'),null);
});
