/** Portable, read-only catalogue and transient practice state. No learner/SRS writes. */
export const TENSES = ['past','present','future','imperative','infinitive','gerund','preposition'];
export function validateCatalog(c) {
  if (c?.schemaVersion !== 1 || !Array.isArray(c.words) || !Array.isArray(c.forms)) throw Error('Unsupported conjugation catalog');
  const words = new Set(), ids = new Set();
  for (const w of c.words) {
    if (!w.id || words.has(w.id) || !['verb','prep'].includes(w.kind) || typeof w.unpointed !== 'string' || !w.unpointed.trim()) throw Error('Invalid word identity');
    words.add(w.id);
  }
  for (const f of c.forms) {
    if (!f.id || ids.has(f.id) || !words.has(f.wordId) || !TENSES.includes(f.tense)) throw Error('Invalid form identity');
    ids.add(f.id);
    if (!['approved','fixture','held','source-attested'].includes(f.approval)) throw Error('Invalid approval');
    if (['approved','fixture'].includes(f.approval)) {
      for (const k of ['pointed','unpointed','english','pronoun']) if (typeof f[k] !== 'string' || !f[k].trim()) throw Error('Incomplete grading form');
      for (const k of ['acceptedHebrew','acceptedEnglish','provenance']) if (!Array.isArray(f[k]) || f[k].some(x => typeof x !== 'string' || !x.trim())) throw Error('Invalid alternatives/provenance');
      if (!f.provenance.length || !['1','2','3','none'].includes(String(f.person)) || !['common','masculine','feminine','none'].includes(f.gender) || !['singular','plural','none'].includes(f.number)) throw Error('Incomplete grading metadata');
    }
  }
  return c;
}
export function eligibleForms(c, {allowFixtures = false} = {}) {
  validateCatalog(c);
  return c.forms.filter(f => f.approval === 'approved' || (allowFixtures === true && f.approval === 'fixture'));
}
export function selectForms(c, s = {}, options = {}) {
  const learned = new Set(s.learnedIds || []), words = new Map(c.words.map(w => [w.id,w]));
  return eligibleForms(c, options).filter(f => (!s.kind || words.get(f.wordId).kind === s.kind) && (!s.wordIds || s.wordIds.includes(f.wordId)) && (!s.tenses || s.tenses.includes(f.tense)) && (!s.person || s.person === 'all' || String(f.person) === s.person) && (!s.gender || s.gender === 'all' || f.gender === s.gender || f.gender === 'common') && (!s.number || s.number === 'all' || f.number === s.number) && (s.platform === 'wordpress' || s.scope !== 'learned' || learned.has(f.id)));
}
export function normalize(value, direction = 'he') {
  const s = String(value).normalize('NFD').replace(/[\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7]/g,'').trim().replace(/\s+/g,' ');
  return direction === 'en' ? s.toLowerCase().replace(/[.!?]$/,'') : s;
}
export const displayHebrew = (f, pointed) => pointed && f.pointed ? f.pointed : f.unpointed;
function ownAnswers(f, d) { return d === 'he' ? [f.unpointed,f.pointed,...f.acceptedHebrew] : [f.english,...f.acceptedEnglish]; }
/** Reverse ambiguity: all approved readings of an identical displayed Hebrew form are valid. */
export function answers(f, pool, direction = 'he') {
  const related = direction === 'en' ? pool.filter(x => [x.unpointed,x.pointed,...x.acceptedHebrew].some(v => ownAnswers(f,'he').some(a => normalize(a) === normalize(v)))) : [f];
  return [...new Set(related.flatMap(x => ownAnswers(x,direction)).map(v => normalize(v,direction)))];
}
export function shuffle(items, random = Math.random) {
  const a = [...items]; for(let i=a.length-1;i>0;i--){ const j=Math.floor(random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a;
}
export function makeChoices(f, pool, direction = 'he', random = Math.random) {
  const valid = new Set(answers(f,pool,direction)), seen = new Set(), candidates = [];
  for (const x of shuffle(pool,random)) {
    const value = direction === 'he' ? x.unpointed : x.english, n = normalize(value,direction);
    if (valid.has(n) || seen.has(n)) continue;
    seen.add(n); candidates.push(x);
  }
  return shuffle([f,...candidates.slice(0,3)],random);
}
export class Drill {
  constructor(catalog, forms, {allowFixtures=false,direction='he',random=Math.random} = {}) {
    if (!['he','en'].includes(direction)) throw Error('Invalid direction');
    this.pool=eligibleForms(catalog,{allowFixtures}); const byId=new Map(this.pool.map(f=>[f.id,f]));
    if (!forms.length || new Set(forms.map(f=>f.id)).size !== forms.length || forms.some(f=>!byId.has(f.id))) throw Error('No eligible selection');
    this.random=random; this.direction=direction;this.mode='choose'; this.queue=shuffle(forms.map(f=>byId.get(f.id)),random); this.total=this.queue.length; this.index=0; this.pass=1; this.missed=new Set(); this.reset();
  }
  get current(){ return this.queue[this.index]; }
  reset(){ this.typed='';this.choice=null;this.feedback=null;this.attempt=null;this.options=this.current?makeChoices(this.current,this.pool,this.direction,this.random):[]; }
  setMode(mode){ if(['choose','write'].includes(mode)) this.mode=mode; }
  grade(value, mode=this.mode){
    if(!this.current || this.feedback || !String(value).trim()) return false;
    const ok=answers(this.current,this.pool,this.direction).includes(normalize(value,this.direction));
    this.attempt={mode,ok,override:false}; this.settle(ok); return ok;
  }
  settle(ok){ if(!this.current)return; this.feedback=ok?'correct':'incorrect'; if(ok)this.missed.delete(this.current.id);else this.missed.add(this.current.id); }
  show(){ if(this.current&&!this.feedback){this.feedback='shown';this.attempt={mode:'self',ok:null};} }
  selfCheck(ok){ if(this.feedback==='shown'){ this.attempt.ok=!!ok;this.settle(!!ok); } }
  override(){ if(this.feedback==='incorrect'&&this.attempt?.mode==='write'){this.attempt.override=true;this.settle(true);return true;}return false; }
  next(){
    if(!this.current || !['correct','incorrect'].includes(this.feedback)) return false;
    this.index++;
    if(this.index===this.queue.length && this.missed.size){ this.queue=shuffle(this.queue.filter(f=>this.missed.has(f.id)),this.random);this.missed.clear();this.index=0;this.pass++; }
    this.reset();return true;
  }
}
