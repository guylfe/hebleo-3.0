import {selectableConjugationForms} from '../conjugation-contract.js';

export function mountConjugationUnlocks(root,{lesson,catalog,allowFixtures=false,onChange=()=>{}}) {
  const doc=root.ownerDocument, ctl=new doc.defaultView.AbortController();
  const available=selectableConjugationForms(catalog,{allowFixtures}),selected=new Set(lesson.conjugationUnlocks?.formIds||[]);
  const add=(parent,tag,text)=>{const el=doc.createElement(tag);el.textContent=text;parent.append(el);return el;};
  root.dataset.conjugationUnlocks='';
  add(root,'h3','Conjugation practice unlocks');
  add(root,'p','Select the exact forms introduced in this lesson. Completing the lesson adds them to this learner’s defaults. Learners can practice ahead without completing a lesson.');
  if(allowFixtures)add(root,'p','SYNTHETIC TEST FIXTURE — not approved teaching content.');
  const total=add(root,'p','');total.setAttribute('role','status');
  const counters=[];
  function update(){total.textContent=selected.size+' exact forms selected';for(const {el,forms} of counters)el.textContent=forms.filter(f=>selected.has(f.id)).length+' of '+forms.length+' available forms selected';}
  function changed(){onChange({formIds:[...selected]});update();}
  if(!available.length)add(root,'p','No approved forms are available for lesson unlocks. Content approval is pending. Existing selections are retained.');
  for(const word of catalog?.words||[]){
    const forms=available.filter(f=>f.wordId===word.id), group=doc.createElement('fieldset');root.append(group);
    const legend=add(group,'legend','');add(legend,'bdi',word.unpointed||word.pointed||word.id).dir='rtl';
    const count=add(group,'p','');counters.push({el:count,forms});
    const held=(catalog.forms||[]).filter(f=>f.wordId===word.id).length-forms.length;
    if(!forms.length)add(group,'p','No approved forms available.');
    if(held)add(group,'p',held+' forms awaiting approval.');
    if(word.kind==='prep'&&forms.length){const b=add(group,'button','Select all currently available forms');b.type='button';b.dataset.conjugationWord=word.id;b.addEventListener('click',()=>{forms.forEach(f=>selected.add(f.id));group.querySelectorAll('input').forEach(c=>c.checked=true);changed();},{signal:ctl.signal});}
    for(const form of forms){
      const label=doc.createElement('label');label.className='conjugation-unlock-option';group.append(label);
      const input=doc.createElement('input');input.type='checkbox';input.dataset.conjugationForm=form.id;input.checked=selected.has(form.id);label.append(input);
      add(label,'span',form.tense+' · '+form.pronoun+' · '+form.gender+' · '+form.number+' → ');
      add(label,'bdi',form.unpointed).dir='rtl';
      input.addEventListener('change',()=>{if(input.checked)selected.add(form.id);else selected.delete(form.id);changed();},{signal:ctl.signal});
    }
  }
  const known=new Set(available.map(f=>f.id));
  for(const id of selected)if(!known.has(id)){
    const p=add(root,'p','Unavailable selection retained: '+id+'. Publication needs an approved form or explicit removal. ');
    const b=add(p,'button','Remove this selection');b.type='button';b.addEventListener('click',()=>{selected.delete(id);p.remove();changed();},{signal:ctl.signal});
  }
  update();
  return {dispose(){ctl.abort();root.replaceChildren();}};
}
