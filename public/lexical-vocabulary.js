import {richCell, cellCSS} from './rich.js';
import {audioControls,button as actionButton} from './learner-view.js';

/**
 * Lexical vocabulary display projection v1 (NOT a workbook/import contract).
 * Load lexical-vocabulary.css after the application's shared styles.
 *
 * renderLexicalVocabulary(words, {idPrefix='lexical', prepositionMode='compact'})
 * returns escaped semantic HTML; no DOM, storage, fetch, approval or unlock writes.
 * Callers own paging/filtering (pass their bounded result set), safe projection,
 * authoritative course eligibility, aliases, progress and state persistence.
 * Use a different idPrefix for each simultaneously mounted instance.
 *
 * Word: {wordKey, category, available:true, hebrew, english, root?, pattern?,
 *   gender?, plural?, notes?, examples?:Pair[], usages?:Usage[], forms?:Form[],
 *   citation?:{past:Form,present:Form}, noteRevision?:string}.
 * category is one of Nouns, Adjectives, Verbs, Prepositions, Other.
 * Text fields: string OR {text, formatting?:SheetsCell, sourceTheme?:Theme[]}.
 * Text fields MUST already be approved/safe display text; raw workbook records
 * must never be passed here. Exact UTF-16 runs use shared rich.js; no synthesized
 * spelling, Nikkud, stress, Hebrew, lesson sequence or approval is performed.
 * Pair: {hebrew,english,notes?}; Usage: Pair & {coversBareMeaning?:boolean}.
 * coversBareMeaning is explicit reviewed metadata, never inferred from strings.
 *
 * Form: {slotId, status, value?:Text, label?:string, pronoun?:Text,
 *   tense?:'past'|'present'|'future'|'imperative'|'infinitive'|'verbal-noun',
 *   person?:'1'|'2'|'3', number?:'singular'|'plural', gender?:'m'|'f'|'shared',
 *   introducedGenders?:('m'|'f')[], base?:boolean}.
 * status: eligible | locked | missing | unresolved | unapproved | inapplicable.
 * Only eligible values are emitted, including into hidden DOM/attributes.
 * Unknown/malformed eligibility is unresolved; eligible empty text is missing.
 * Shared gender coverage MUST be explicit metadata, never equal-text inference.
 * An optional introducedGenders restricts a shared cell when only part is learned.
 * Citation past/present are separately safe projected selected citation forms;
 * their status is independent of expanded-form unlocks. No fallback to another
 * form or to word.hebrew is used for verbs. Missing citations remain a dash.
 * Same wordKey repeats deduplicate only if projections are identical; conflicting
 * records throw rather than silently choose content. Unavailable words are omitted.
 *
 * bindLexicalVocabulary(root, {encounters?, onDisclosure?}) binds once per root,
 * returns {measure(), destroy()}; rebinding destroys the preceding binding.
 * encounters = {has(token):boolean, mark(token):void} is optional, synchronous,
 * caller/profile/context-owned. With it, unseen overflowing notes auto-open and
 * are marked only when visible. No storage is read/written here. Tokens include
 * wordKey, noteRevision and exact note text. Without it notes open only on demand.
 * onDisclosure({wordKey,kind:'forms'|'notes',expanded}) is an optional notification.
 * Destroy before replacing the root; observe/resizing never changes app records.
 */

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const textOf = value => typeof value === 'string' ? value : typeof value?.text === 'string' ? value.text : '';
const categories = ['Nouns', 'Adjectives', 'Verbs', 'Prepositions', 'Other'];
const statusLabels = {locked:'Not introduced', missing:'Source missing', unresolved:'Needs review', unapproved:'Awaiting approval', inapplicable:'Not applicable'};
const bindings = new WeakMap();
const safeID = value => Array.from(String(value)).map(c => c.codePointAt(0).toString(16)).join('-');

function rich(value, language = 'he', forceRTL = false) {
  const data = typeof value === 'object' && value ? value : {};
  return '<bdi lang="'+language+'" dir="'+(language === 'he' ? 'rtl' : language === 'en' ? 'ltr' : 'auto')+'" style="'+cellCSS(data.formatting, data.sourceTheme)+(forceRTL ? ';direction:rtl;unicode-bidi:isolate' : '')+'">'+richCell(textOf(value), data.formatting, data.sourceTheme)+'</bdi>';
}
function statusOf(form) {
  if (form?.status === 'eligible') return textOf(form.value).trim() ? 'eligible' : 'missing';
  return Object.hasOwn(statusLabels, form?.status) ? form.status : 'unresolved';
}
function formValue(form) {
  const status = statusOf(form);
  return '<span class="lexical-form'+(form?.base ? ' lexical-base-form' : '')+'" data-slot-id="'+escape(form?.slotId || '')+'" data-status="'+status+'"'+(form?.base ? ' title="Citation form" aria-label="Citation form: '+escape(textOf(form.value))+'"' : '')+'>'+(status === 'eligible' ? (form.values||[form.value]).map(v=>rich(v)).join(' / ') : '<span class="lexical-unavailable">'+statusLabels[status]+'</span>')+'</span>';
}
function pair(item) {
  const english=item.noteLink?'<span class="lexical-pair-english">'+rich(item.english,'en')+' <button type="button" class="lexical-note-link" data-lexical-open-note>(see Note)</button></span>':rich(item.english,'en');
  return '<div class="lexical-pair" dir="ltr">'+english+rich(item.hebrew)+(textOf(item.notes) ? '<div class="lexical-pair-note">'+rich(item.notes, 'auto')+'</div>' : '')+'</div>';
}
function meaning(word) {
  const usages = word.usages || [];
  return (!usages.some(u => u.coversBareMeaning === true) ? rich(word.english, 'en') : '')+usages.map(pair).join('');
}
// Headings have a neutral foreground; retain every authored byte and all other
// formatting in a detached display projection. Expanded forms use the originals.
function citationValue(value) {
  if (!value || typeof value !== 'object' || !value.formatting) return rich(value, 'he', true);
  const formatting = structuredClone(value.formatting);
  const neutral = format => {
    if (!format) return;
    delete format.foregroundColor; delete format.foregroundColorStyle; delete format.color;
  };
  neutral(formatting.effectiveFormat?.textFormat);
  neutral(formatting.userEnteredFormat?.textFormat);
  for (const run of formatting.textFormatRuns || []) neutral(run.format);
  return rich({...value, formatting}, 'he', true);
}
function citation(word) {
  return ['past', 'present'].map(tense => {
    const form = word.citation?.[tense];
    return '<span class="lexical-citation-part" aria-label="'+(tense === 'past' ? 'Past he' : 'Present masculine singular')+' citation">'+(statusOf(form) === 'eligible' ? (form.values||[form.value]).map(citationValue).join(' / ') : '<span class="lexical-unavailable" data-status="'+statusOf(form)+'" title="'+statusLabels[statusOf(form)]+'">—</span>')+'</span>';
  }).join('<span class="lexical-citation-separator" aria-hidden="true"> - </span>');
}
function button(label, kind, id, extra = '') {
  return '<button type="button" class="button small secondary lexical-toggle" data-lexical-toggle="'+kind+'" aria-expanded="false" aria-controls="'+id+'" '+extra+'>'+label+'</button>';
}
function stateSummary(forms) {
  const counts = new Map();
  for (const form of forms) { const status = statusOf(form); if (status !== 'eligible') counts.set(status, (counts.get(status) || 0)+1); }
  return counts.size ? '<p class="lexical-status-summary">'+[...counts].map(([s, n]) => '<span data-status="'+s+'">'+statusLabels[s]+': '+n+'</span>').join(' · ')+'</p>' : '';
}
function verbFormValue(form) {
  if (form.tense === 'present') return formValue(form);
  const labels = form.person === '1' ? [form.number === 'plural' ? 'we' : 'I']
    : form.person === '3' ? [form.number === 'plural' ? 'they' : form.gender === 'f' ? 'she' : 'he']
    : form.person === '2' ? (form.number === 'plural'
      ? (form.gender === 'shared' ? ['אתם', 'אתן'] : [form.gender === 'f' ? 'אתן' : 'אתם'])
      : (form.gender === 'shared' ? ['אתה', 'את'] : [form.gender === 'f' ? 'את' : 'אתה'])) : [];
  return '<div class="lexical-verb-form">'+(labels.length ? '<span class="lexical-pronoun" dir="'+(form.person === '2' ? 'rtl' : 'ltr')+'" lang="'+(form.person === '2' ? 'he' : 'en')+'">'+labels.map(escape).join(' / ')+'</span>' : '')+formValue(form)+'</div>';
}
function genderCells(forms, number) {
  const matching = forms.filter(f => f.number === number);
  const shared = matching.find(f => f.gender === 'shared');
  const coverage = shared?.introducedGenders ?? ['m', 'f'];
  if (shared && coverage.includes('m') && coverage.includes('f')) return '<td colspan="2"'+(number === 'plural' ? ' class="lexical-number-divider"' : '')+'>'+verbFormValue(shared)+'</td>';
  return ['m', 'f'].map(gender => {
    const form = matching.find(f => f.gender === gender) || (shared && coverage.includes(gender) ? shared : null);
    return '<td'+(number === 'plural' && gender === 'm' ? ' class="lexical-number-divider"' : '')+'>'+(form ? verbFormValue(form) : '<span aria-label="No introduced form">—</span>')+'</td>';
  }).join('');
}
function verbForms(forms, sourceBrowse=false) {
  // Locked slots never create a tense band. Other noneligible states have labels
  // only in the summary; their raw text is never mounted, even in hidden panels.
  const eligible = forms.filter(f => statusOf(f) === 'eligible');
  const bands = ['past', 'present', 'future', 'imperative'].map(tense => {
    const current = eligible.filter(f => f.tense === tense);
    if (!current.length) return '';
    const persons = tense === 'present' ? [''] : ['1', '2', '3'].filter(p => current.some(f => f.person === p));
    return '<tbody>'+persons.map((person,i) => {
      const row = person ? current.filter(f => f.person === person) : current;
      const personLabel=person ? ({1:'1st',2:'2nd',3:'3rd'})[person] : '<span class="lexical-sr">Gender and number forms shared across persons</span>';
      return '<tr>'+(i===0?'<th class="lexical-tense" rowspan="'+persons.length+'" scope="rowgroup">'+tense[0].toUpperCase()+tense.slice(1)+'</th>':'')+genderCells(row, 'singular')+genderCells(row, 'plural')+'<th class="lexical-person" scope="row">'+personLabel+'</th></tr>';
    }).join('')+'</tbody>';
  }).join('');
  const nominals = eligible.filter(f => ['infinitive', 'verbal-noun'].includes(f.tense));
  return (bands ? '<div class="lexical-paradigm-scroll" role="region" tabindex="0" aria-label="'+(sourceBrowse?'Source verb forms':'Introduced verb forms')+'"><table class="lexical-paradigm"><caption class="lexical-sr">'+(sourceBrowse?'Source-labelled conjugations':'Introduced conjugations')+' by tense, person, number and gender</caption><colgroup><col class="lexical-tense-col"><col span="4"><col class="lexical-person-col"></colgroup><thead><tr><th rowspan="2" scope="col">Tense</th><th colspan="2" scope="colgroup">Singular</th><th colspan="2" scope="colgroup">Plural</th><th rowspan="2" scope="col">Person</th></tr><tr>'+['Masculine','Feminine','Masculine','Feminine'].map(label => '<th scope="col">'+label+'</th>').join('')+'</tr></thead>'+bands+'</table></div>' : '<p>'+(sourceBrowse?'Forms remain available under their original labels in source details.':'No expanded forms introduced.')+'</p>')+
    (nominals.length ? '<dl class="lexical-nominals">'+nominals.map(f => '<div><dt>'+escape(f.label || (f.tense === 'infinitive' ? 'Infinitive' : 'Verbal noun'))+'</dt><dd>'+formValue(f)+'</dd></div>').join('')+'</dl>' : '')+stateSummary(forms);
}
function prepositionForms(forms, sourceBrowse=false) {
  const eligible = forms.filter(f => statusOf(f) === 'eligible');
  // Native table semantics are retained in both orientations. The narrow compact
  // alternative is a separate singular/plural table, shown only for all ten.
  const horizontal = '<table class="lexical-preposition-horizontal"><caption class="lexical-sr">'+(sourceBrowse?'Source-labelled preposition forms':'Introduced preposition forms')+'</caption><thead><tr>'+eligible.map(f => '<th scope="col">'+rich(f.pronoun || f.label)+'</th>').join('')+'</tr></thead><tbody><tr>'+eligible.map(f => '<td>'+formValue(f)+'</td>').join('')+'</tr></tbody></table>';
  const byNumber = number => eligible.filter(f => f.number === number).map(f => '<div class="lexical-preposition-pair">'+rich(f.pronoun || f.label)+formValue(f)+'</div>').join('');
  const vertical = eligible.length === 10 ? '<table class="lexical-preposition-vertical" hidden><caption class="lexical-sr">'+(sourceBrowse?'Source-labelled preposition forms':'Introduced preposition forms')+'</caption><thead><tr><th scope="col">Singular</th><th scope="col">Plural</th></tr></thead><tbody><tr><td>'+byNumber('singular')+'</td><td>'+byNumber('plural')+'</td></tr></tbody></table>' : '';
  return '<div class="lexical-preposition-viewport" role="region" tabindex="0" aria-label="'+(sourceBrowse?'Source preposition forms':'Introduced preposition forms')+'"><div data-preposition-forms data-count="'+eligible.length+'" data-orientation="horizontal">'+horizontal+vertical+'</div></div>'+stateSummary(forms);
}

// Rebase exact authored UTF-16 runs for a note fragment without guessing colors.
function fragment(value, start, end) {
  const text = textOf(value), cell = value?.formatting;
  if (!cell || (cell.formattedValue !== undefined && cell.formattedValue !== text)) return {text:text.slice(start, end)};
  const runs = [...(cell.textFormatRuns || [])].sort((a,b) => a.startIndex-b.startIndex);
  const active = runs.filter(r => r.startIndex <= start).at(-1);
  return {text:text.slice(start, end), sourceTheme:value.sourceTheme, formatting:{...cell, formattedValue:text.slice(start, end), textFormatRuns:[...(active ? [{...active,startIndex:0}] : []), ...runs.filter(r => r.startIndex > start && r.startIndex < end).map(r => ({...r,startIndex:r.startIndex-start}))]}};
}
function noteText(value) {
  const text = textOf(value); let last = 0, html = '';
  for (const match of text.matchAll(/\[[^\[\]]*\]/g)) {
    html += rich(fragment(value, last, match.index), 'auto')+'<span class="lexical-aside" role="note">'+rich(fragment(value, match.index, match.index+match[0].length), 'auto')+'</span>';
    last = match.index+match[0].length;
  }
  return html+rich(fragment(value, last, text.length), 'auto');
}
// When an explicitly paired example is already present verbatim in the note,
// show the pair once in Examples. Keep source text/runs untouched and rebase
// display-only fragments against exact UTF-16 offsets.
function noteForDisplay(word){
 const original=word.notes,raw=textOf(original),ranges=[];
 for(const example of word.examples||[]){
  const hebrew=textOf(example.hebrew),english=textOf(example.english);
  if(!hebrew||!english)continue;
  const h=raw.indexOf(hebrew),e=raw.indexOf(english);if(h<0||e<0)continue;
  let start=Math.min(h,e);const end=Math.max(h+hebrew.length,e+english.length);
  const between=h<e?raw.slice(h+hebrew.length,e):raw.slice(e+english.length,h);
  if(!/^[\s=\-–—]+$/.test(between)||raw.slice(0,start).lastIndexOf('[')>raw.slice(0,start).lastIndexOf(']'))continue;
  const lead=raw.slice(0,start),label=lead.match(/(?:^|\n)[ \t]*Examples?:[ \t\r\n]*$/);
  if(label)start=label.index;
  if(!ranges.some(r=>start<r[1]&&end>r[0]))ranges.push([start,end]);
 }
 if(!ranges.length)return original;
 const retained=[];let from=0;
 for(const [start,end]of ranges.sort((a,b)=>a[0]-b[0])){retained.push([from,start]);from=end;}retained.push([from,raw.length]);
 let text='',runs=[];
 for(const [start,end]of retained){
  const part=fragment(original,start,end),offset=text.length;
  text+=textOf(part);for(const run of part.formatting?.textFormatRuns||[])runs.push({...run,startIndex:offset+run.startIndex});
 }
 const left=text.length-text.trimStart().length,trimmed=text.trim();
 const active=runs.filter(r=>r.startIndex<=left).at(-1);
 runs=[...(active?[{...active,startIndex:0}]:[]),...runs.filter(r=>r.startIndex>left&&r.startIndex<left+trimmed.length).map(r=>({...r,startIndex:r.startIndex-left}))];
 return {text:trimmed,...(original?.formatting?{sourceTheme:original.sourceTheme,formatting:{...original.formatting,formattedValue:trimmed,textFormatRuns:runs}}:{})};
}
function noteStrip(word, id) {
  const noteValue=noteForDisplay(word),note = textOf(noteValue), examples = word.examples || [];
  if (!note && !examples.length) return '';
  const multiline = /[\r\n]/.test(note);
  const token = JSON.stringify([word.wordKey, word.noteRevision || '', note]);
  return '<div class="lexical-note-strip '+(note ? 'lexical-has-note' : 'lexical-examples-only')+'" data-note-strip data-token="'+escape(token)+'" data-multiline="'+multiline+'" data-needs-expand="'+multiline+'" data-has-examples="'+Boolean(examples.length)+'">'+
    '<div class="lexical-note-top"><strong>'+(note ? '<span class="lexical-note-marker" aria-hidden="true">!</span> Note' : 'Examples')+'</strong>'+
    (note ? '<span class="lexical-note-preview"><span data-note-line>'+noteText(fragment(noteValue, 0, note.search(/[\r\n]/) < 0 ? note.length : note.search(/[\r\n]/)))+'</span><span class="lexical-ellipsis" data-note-ellipsis'+(!multiline ? ' hidden' : '')+' aria-hidden="true">...</span></span>' : '')+
    button('Expand', 'notes', id, 'data-note-button'+(!multiline && note && !examples.length ? ' hidden' : ''))+'</div>'+
    '<div class="lexical-note-content" id="'+id+'" hidden>'+(note ? '<section data-full-note><h3 class="lexical-sr">Note</h3><div class="lexical-note-body">'+noteText(noteValue)+'</div></section>' : '')+
    (examples.length ? '<section><h3>Examples</h3>'+examples.map(pair).join('')+'</section>' : '')+'</div></div>';
}
function sourceDetails(word,cols) {
 if(!word.sourceBrowse)return '';
 return '<tr class="lexical-support-row lexical-source-row"><td colspan="'+cols+'"><details class="lexical-source-details"><summary>Original source · '+word.sourceEntries.map(e=>escape(e.sourceId)+' · Lesson '+escape(e.lesson)+(e.part?' · '+escape(e.part):'')).join('; ')+'</summary>'+word.sourceEntries.map(e=>'<section><h3>'+escape(e.sourceId)+' · Lesson '+escape(e.lesson)+(e.part?' · '+escape(e.part):'')+' · '+escape(e.type)+'</h3>'+(e.catalogueLinks||[]).map(l=>'<p>Original course: '+escape(l.title)+'</p>').join('')+'<dl>'+Object.entries(e.fields).map(([label,value])=>'<div><dt>'+escape(label)+'</dt><dd>'+rich(value,['English','Notes','Gender'].includes(label)?'auto':'he')+'</dd></div>').join('')+'</dl></section>').join('')+'</details></td></tr>';
}
function renderWord(word, prefix) {
  const id = prefix+'-'+safeID(word.wordKey), forms = word.forms || [];
  const expandable = word.category === 'Verbs';
  const notes = noteStrip(word, id+'-notes');
  const other=word.category==='Other',cols=other?2:expandable?5:6;
  const heading=(expandable?'<span class="lexical-citation" dir="rtl" lang="he">'+citation(word)+'</span>':rich(word.hebrew,'he',true))+entryActions(word);
  const specific=word.category==='Nouns'?'<td class="lexical-noun-plural" dir="rtl" lang="he">'+rich(word.plural)+'</td><td class="lexical-noun-gender">'+rich(word.gender,'en')+'</td>':'';
  const structures=other?'':'<td class="lexical-structure">'+rich(word.root)+'</td><td class="lexical-structure lexical-pattern">'+rich(word.pattern)+'</td>';
  return '<tbody data-word-key="'+escape(word.wordKey)+'"><tr class="lexical-word-row"><th scope="row" class="lexical-frozen-he" dir="rtl" lang="he">'+heading+'</th><td class="lexical-frozen-en">'+meaning(word)+'</td>'+specific+structures+(expandable?'<td class="lexical-actions">'+button('Show forms','forms',id+'-forms')+'</td>':'')+'</tr>'+
   (expandable?'<tr id="'+id+'-forms" class="lexical-forms-row" hidden><td colspan="'+cols+'"><div class="lexical-forms-boundary">'+verbForms(forms,word.sourceBrowse)+'</div></td></tr>':'')+
   (notes?'<tr class="lexical-support-row"><td colspan="'+cols+'">'+notes+'</td></tr>':'')+sourceDetails(word,cols)+'</tbody>';
}

function entryActions(word){
 return (word.audio?'<div dir="ltr" lang="en">'+audioControls(word.audio,textOf(word.english))+'</div>':'')+(word.runtimeId?'<div class="button-row lexical-entry-actions" dir="ltr" lang="en">'+actionButton('Open entry','lookup','small secondary',word.runtimeId)+actionButton('Add to review','enroll','small secondary',word.runtimeId)+'</div>':'');
}
function adjectiveTable(words,prefix){
 const numbers=['singular','plural'].filter(n=>words.some(w=>(w.forms||[]).some(f=>f.number===n&&statusOf(f)==='eligible')));
 if(!numbers.length)numbers.push('singular');
 const heCols=1+numbers.length;
 const head='<thead><tr><th scope="colgroup" colspan="'+heCols+'" class="lexical-frozen-he">Hebrew</th><th scope="col" rowspan="2" class="lexical-frozen-en">English</th><th scope="col" rowspan="2" class="lexical-structure">Root</th><th scope="col" rowspan="2" class="lexical-structure">Pattern</th></tr><tr><th scope="col" class="lexical-gender-heading">Gender</th>'+numbers.map(n=>'<th scope="col">'+(n==='singular'?'Singular':'Plural')+'</th>').join('')+'</tr></thead>';
 const body=words.map(word=>{
  const forms=(word.forms||[]).filter(f=>statusOf(f)==='eligible'),genders=['m','f'].filter(g=>forms.some(f=>f.gender===g||f.gender==='shared'));
  if(!genders.length)genders.push('m');
  const notes=noteStrip(word,prefix+'-'+safeID(word.wordKey)+'-notes'),rows=genders.length;
  return '<tbody data-word-key="'+escape(word.wordKey)+'">'+genders.map((g,i)=>'<tr class="lexical-word-row lexical-adjective-row"><th scope="row" class="lexical-gender-value"><abbr title="'+(g==='m'?'Masculine':'Feminine')+'">'+g.toUpperCase()+'</abbr></th>'+numbers.map(n=>{const f=forms.find(f=>f.number===n&&(f.gender===g||f.gender==='shared'));return '<td class="lexical-adjective-value" dir="rtl" lang="he">'+(f?formValue(f):'<span class="lexical-unavailable" aria-label="No introduced form">—</span>')+'</td>';}).join('')+(i===0?'<td rowspan="'+genders.length+'" class="lexical-frozen-en">'+meaning(word)+entryActions(word)+'</td><td rowspan="'+rows+'" class="lexical-structure"><div class="lexical-adjective-structure">'+rich(word.root)+'</div></td><td rowspan="'+rows+'" class="lexical-structure lexical-pattern"><div class="lexical-adjective-structure">'+rich(word.pattern)+'</div></td>':'')+'</tr>').join('')+(notes?'<tr class="lexical-support-row"><td colspan="'+(heCols+3)+'">'+notes+'</td></tr>':'')+sourceDetails(word,(heCols+3))+'</tbody>';
 }).join('');
 return '<table class="lexical-table lexical-adjectives" data-he-columns="'+heCols+'"><caption class="lexical-sr">Adjectives · one entry per word</caption><colgroup><col class="lexical-gender-col">'+numbers.map(()=>'<col class="lexical-adjective-form-col">').join('')+'<col class="lexical-adjective-english-col"><col class="lexical-root-col"><col class="lexical-pattern-col"></colgroup>'+head+body+'</table>';
}
function prepositionTable(words,prefix,mode){
 const fields=[...new Map(words.flatMap(w=>(w.forms||[]).filter(f=>statusOf(f)==='eligible').map(f=>[f.slotId,f]))).values()];
 if(mode==='compact')return '<table class="lexical-table lexical-preposition-compact"><colgroup><col class="lexical-preposition-word-col"><col class="lexical-preposition-meaning-col"><col class="lexical-preposition-action-col"></colgroup><thead><tr><th scope="col" class="lexical-frozen-he">Hebrew</th><th scope="col" class="lexical-frozen-en">English</th><th scope="col">Forms</th></tr></thead>'+words.map(w=>{
  const id=prefix+'-'+safeID(w.wordKey),notes=noteStrip(w,id+'-notes');
  return '<tbody data-word-key="'+escape(w.wordKey)+'"><tr class="lexical-word-row"><th scope="row" class="lexical-frozen-he" dir="rtl" lang="he">'+rich(w.hebrew,'he',true)+entryActions(w)+'</th><td class="lexical-frozen-en">'+meaning(w)+'</td><td>'+button('Show forms','forms',id+'-forms')+'</td></tr><tr class="lexical-forms-row lexical-preposition-forms-row" id="'+id+'-forms" hidden><td colspan="3">'+prepositionForms(w.forms||[],w.sourceBrowse)+'</td></tr>'+(notes?'<tr class="lexical-support-row"><td colspan="3">'+notes+'</td></tr>':'')+sourceDetails(w,3)+'</tbody>';
 }).join('')+'</table>';
 return '<table class="lexical-table lexical-preposition-full" data-count="'+fields.length+'"><colgroup><col class="lexical-preposition-word-col"><col class="lexical-preposition-meaning-col">'+fields.map(()=>'<col>').join('')+'</colgroup><thead><tr><th scope="col" class="lexical-frozen-he">Hebrew</th><th scope="col" class="lexical-frozen-en">English</th>'+fields.map(f=>'<th scope="col">'+rich(f.pronoun||f.label)+'</th>').join('')+'</tr></thead>'+words.map(w=>{
  const notes=noteStrip(w,prefix+'-'+safeID(w.wordKey)+'-notes');
  return '<tbody data-word-key="'+escape(w.wordKey)+'"><tr class="lexical-word-row"><th scope="row" class="lexical-frozen-he" dir="rtl" lang="he">'+rich(w.hebrew,'he',true)+entryActions(w)+'</th><td class="lexical-frozen-en">'+meaning(w)+'</td>'+fields.map(f=>{const form=(w.forms||[]).find(x=>x.slotId===f.slotId&&statusOf(x)==='eligible');return '<td>'+(form?formValue(form):'—')+'</td>';}).join('')+'</tr>'+(notes?'<tr class="lexical-support-row"><td colspan="'+(fields.length+2)+'">'+notes+'</td></tr>':'')+sourceDetails(w,(fields.length+2))+'</tbody>';
 }).join('')+'</table>';
}

export function renderLexicalVocabulary(words, {idPrefix = 'lexical', prepositionMode = 'compact'} = {}) {
  if (!Array.isArray(words)) throw new TypeError('Vocabulary display records must be an array');
  const unique = new Map();
  for (const word of words) {
    if (!word || word.available !== true) continue;
    if (typeof word.wordKey !== 'string' || !word.wordKey || !categories.includes(word.category)) throw new TypeError('A projected word needs a stable wordKey and supported category');
    if (unique.has(word.wordKey) && JSON.stringify(unique.get(word.wordKey)) !== JSON.stringify(word)) throw new TypeError('Conflicting display projections for '+word.wordKey);
    unique.set(word.wordKey, word);
  }
  const prefix = 'lexical-'+safeID(idPrefix);
  if (!unique.size) return '<div class="lexical-vocabulary"><p role="status">No vocabulary available in this context.</p></div>';
  return '<div class="lexical-vocabulary" data-display-version="1">'+categories.map(category => {
    const selected = [...unique.values()].filter(w => w.category === category);
    if (!selected.length) return '';
    const headers = category==='Nouns'?['Hebrew','English','Plural','Gender','Root','Pattern']:category==='Other'?['Hebrew','English']:['Hebrew','English','Root','Pattern','Forms'];
    const mode=prepositionMode==='full'?'full':'compact';
    const regular='<table class="lexical-table lexical-'+category.toLowerCase()+'"><caption class="lexical-sr">'+category+' · one entry per word</caption><colgroup>'+headers.map(h=>'<col class="lexical-col-'+h.toLowerCase()+'">').join('')+'</colgroup><thead><tr>'+headers.map((label,index)=>'<th scope="col"'+(index===0?' class="lexical-frozen-he"':index===1?' class="lexical-frozen-en"':['Root','Pattern'].includes(label)?' class="lexical-structure"':'')+'>'+label+'</th>').join('')+'</tr></thead>'+selected.map(w=>renderWord(w,prefix)).join('')+'</table>';
    let table=category==='Adjectives'?adjectiveTable(selected,prefix):category==='Prepositions'?prepositionTable(selected,prefix,mode):regular;
    return '<section class="lexical-category" data-category="'+category+'" data-preposition-mode="'+(prepositionMode === 'full' ? 'full' : 'compact')+'"><h2>'+category+'</h2>'+
      (category === 'Prepositions' ? '<div class="lexical-mode" role="group" aria-label="Preposition presentation">'+['compact','full'].map(mode => '<button type="button" class="button small secondary" data-preposition-mode-button="'+mode+'" aria-pressed="'+(mode === (prepositionMode === 'full' ? 'full' : 'compact'))+'">'+mode[0].toUpperCase()+mode.slice(1)+'</button>').join('')+'</div>' : '')+
      '<div class="lexical-table-scroll" tabindex="0" role="region" aria-label="'+category+' vocabulary">'+table+'</div>'+(category==='Prepositions'?'<template data-preposition-alternate="'+(mode==='full'?'compact':'full')+'">'+prepositionTable(selected,prefix,mode==='full'?'compact':'full')+'</template>':'')+'</section>';
  }).join('')+'</div>';
}

export function bindLexicalVocabulary(root, {encounters, onDisclosure} = {}) {
  bindings.get(root)?.destroy();
  const win = root.ownerDocument.defaultView;
  let destroyed = false;
  const manualNotes = new WeakSet();
  const all = selector => [...root.querySelectorAll(selector)];
  function target(button) {
    const id = button.getAttribute('aria-controls');
    return all('[id]').find(el => el.id === id);
  }
  function disclose(button, expanded, notify = true) {
    const panel = target(button); if (!panel) return;
    panel.hidden = !expanded;
    button.setAttribute('aria-expanded', String(expanded));
    button.textContent = button.dataset.lexicalToggle === 'forms' ? (expanded ? 'Hide forms' : 'Show forms') : expanded ? 'Collapse' : 'Expand';
    if (button.dataset.lexicalToggle === 'notes') {
      const strip = button.closest('[data-note-strip]');
      strip.dataset.expanded = String(expanded);
      const ellipsis = strip.querySelector('[data-note-ellipsis]');
      if (ellipsis) ellipsis.hidden = expanded || strip.dataset.needsExpand !== 'true';
    }
    if (notify) onDisclosure?.({wordKey:button.closest('[data-word-key]').dataset.wordKey, kind:button.dataset.lexicalToggle, expanded});
  }
  function markVisible(strip) {
    if (!encounters || !strip.classList.contains('lexical-has-note')) return;
    const rect = strip.getBoundingClientRect();
    if (!encounters.has(strip.dataset.token) && rect.height > 0 && rect.bottom > 0 && rect.top < win.innerHeight && (strip.dataset.needsExpand !== 'true' || strip.dataset.expanded === 'true')) encounters.mark(strip.dataset.token);
  }
  function measure() {
    if (destroyed) return;
    for (const scroll of all('.lexical-table-scroll')) {
      const row = scroll.querySelector('thead tr'), he = row?.querySelector('.lexical-frozen-he'), en = row?.querySelector('.lexical-frozen-en');
      const heWidth = he?.getBoundingClientRect().width || 0, enWidth = en?.getBoundingClientRect().width || 0;
      scroll.style.setProperty('--lexical-he-width', heWidth+'px');
      scroll.style.setProperty('--lexical-frozen-width', (heWidth+enWidth)+'px');
      scroll.dataset.overflow = String(scroll.scrollWidth > scroll.clientWidth+1);
      // At extreme widths two frozen columns would cover the entire viewport.
      // Release them together so every cell and focused control stays reachable.
      scroll.dataset.freeze = String(scroll.dataset.overflow === 'true' && heWidth+enWidth < scroll.clientWidth-48);
    }
    for (const forms of all('[data-preposition-forms]')) {
      const horizontal = forms.querySelector('.lexical-preposition-horizontal'), vertical = forms.querySelector('.lexical-preposition-vertical');
      if (!horizontal || !vertical) continue;
      horizontal.hidden = false;
      const width = forms.parentElement.clientWidth;
      const compact = forms.closest('.lexical-category').dataset.prepositionMode === 'compact';
      const useVertical = compact && forms.dataset.count === '10' && width > 0 && horizontal.scrollWidth > width+1;
      horizontal.hidden = useVertical; vertical.hidden = !useVertical;
      forms.dataset.orientation = useVertical ? 'vertical' : 'horizontal';
    }
    for (const strip of all('[data-note-strip]')) {
      const line = strip.querySelector('[data-note-line]'), button = strip.querySelector('[data-note-button]');
      const hasExamples = strip.dataset.hasExamples === 'true';
      const top = strip.querySelector('.lexical-note-top'), label = top.querySelector('strong');
      // Measure against the space available BEFORE adding an overflow action or
      // ellipsis. Otherwise showing Expand shrinks the line and can make its own
      // removal impossible. Expanded previews keep their geometry in CSS.
      if (line && top.clientWidth <= 0 && strip.dataset.multiline !== 'true') continue;
      const style = win.getComputedStyle(top), gap = parseFloat(style.columnGap) || parseFloat(style.gap) || 0;
      const contentWidth = top.clientWidth - (parseFloat(style.paddingLeft) || 0) - (parseFloat(style.paddingRight) || 0);
      const available = contentWidth - label.getBoundingClientRect().width - gap - (hasExamples ? button.getBoundingClientRect().width + gap : 0);
      const needs = strip.dataset.multiline === 'true' || Boolean(line && line.scrollWidth > available+1);
      strip.dataset.needsExpand = String(needs);
      if (!needs && !hasExamples && button.getAttribute('aria-expanded') === 'true') disclose(button, false, false);
      button.hidden = !needs && !hasExamples;
      strip.querySelector('[data-full-note]')?.toggleAttribute('hidden', !needs);
      const ellipsis = strip.querySelector('[data-note-ellipsis]');
      if (ellipsis) ellipsis.hidden = !needs || button.getAttribute('aria-expanded') === 'true';
      if (needs && encounters && !manualNotes.has(strip) && !encounters.has(strip.dataset.token)) disclose(button, true, false);
      markVisible(strip);
    }
  }
  function click(event) {
    const button = event.target.closest?.('button'); if (!button || !root.contains(button) || button.disabled) return;
    if(button.hasAttribute('data-lexical-open-note')){
      const note=button.closest('[data-word-key]')?.querySelector('[data-note-button]');
      if(note){disclose(note,true);manualNotes.add(note.closest('[data-note-strip]'));note.focus({preventScroll:true});measure();}
    }
    if (button.hasAttribute('data-lexical-toggle')) {
      const strip = button.closest('[data-note-strip]'); if (strip) manualNotes.add(strip);
      disclose(button, button.getAttribute('aria-expanded') !== 'true');
      if (strip) markVisible(strip);
      measure();
    }
    if (button.hasAttribute('data-preposition-mode-button')) {
      const category = button.closest('.lexical-category');
      const desired=button.dataset.prepositionModeButton;
      const alternate=category.querySelector('template[data-preposition-alternate="'+desired+'"]');
      if(alternate){
        const scroll=category.querySelector('.lexical-table-scroll');
        const next=alternate.content.cloneNode(true);
        const previousMode=category.dataset.prepositionMode;
        alternate.content.replaceChildren(...scroll.childNodes);
        alternate.dataset.prepositionAlternate=previousMode;
        scroll.replaceChildren(next);
      }
      category.dataset.prepositionMode = button.dataset.prepositionModeButton;
      for (const peer of category.querySelectorAll('[data-preposition-mode-button]')) peer.setAttribute('aria-pressed', String(peer === button));
      measure();
    }
  }
  function keydown(event) {
    if (event.key !== 'Escape') return;
    const word = event.target.closest?.('[data-word-key]'); if (!word) return;
    const button = [...word.querySelectorAll('[data-lexical-toggle][aria-expanded="true"]')].find(b => b === event.target || target(b)?.contains(event.target));
    if (!button) return;
    event.preventDefault();
    const strip = button.closest('[data-note-strip]'); if (strip) manualNotes.add(strip);
    disclose(button, false); button.focus({preventScroll:true});
  }
  function focus(event) {
    const scroll = event.target.closest?.('.lexical-table-scroll');
    if (!scroll || scroll.dataset.freeze !== 'true' || event.target.closest('.lexical-frozen-he,.lexical-frozen-en')) return;
    const rect = event.target.getBoundingClientRect(), viewport = scroll.getBoundingClientRect();
    const left = viewport.left+parseFloat(scroll.style.getPropertyValue('--lexical-frozen-width'));
    if (rect.left < left) scroll.scrollLeft -= left-rect.left;
    else if (rect.right > viewport.right) scroll.scrollLeft += rect.right-viewport.right;
  }
  root.addEventListener('click', click); root.addEventListener('keydown', keydown); root.addEventListener('focusin', focus);
  win.addEventListener('resize', measure); win.addEventListener('scroll', measure, {passive:true, capture:true});
  const resize = win.ResizeObserver ? new win.ResizeObserver(measure) : null;
  for (const node of all('.lexical-table-scroll,.lexical-note-strip,.lexical-preposition-viewport')) resize?.observe(node);
  const intersection = win.IntersectionObserver ? new win.IntersectionObserver(entries => { for (const entry of entries) if (entry.isIntersecting) markVisible(entry.target); }) : null;
  for (const strip of all('[data-note-strip]')) intersection?.observe(strip);
  const api = {measure, destroy() {
    if (destroyed) return; destroyed = true;
    resize?.disconnect(); intersection?.disconnect();
    root.removeEventListener('click', click); root.removeEventListener('keydown', keydown); root.removeEventListener('focusin', focus);
    win.removeEventListener('resize', measure); win.removeEventListener('scroll', measure, true);
    if (bindings.get(root) === api) bindings.delete(root);
  }};
  bindings.set(root, api); measure();
  return api;
}
