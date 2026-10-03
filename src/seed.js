// Illustrative fixtures only. These are not imported or approved Hebleo lessons.
export const seed = {
  schemaVersion: 1,
  provenance: { kind: 'synthetic-demo', label: 'Illustrative demo content; not approved replacement curriculum.' },
  words: [
    { id: 'w-ani', pointed: 'אֲנִי', unpointed: 'אני', curated: 'אֲנִי', english: 'I', notes: 'The speaker refers to themself.', format: { color: '#137c83' } },
    { id: 'w-mi', pointed: 'מִי', unpointed: 'מי', curated: 'מִי', english: 'who', notes: 'A question word.' },
    { id: 'w-hu', pointed: 'הוּא', unpointed: 'הוא', curated: 'הוּא', english: 'he', notes: 'Third-person masculine singular.' },
    { id: 'w-hi', pointed: 'הִיא', unpointed: 'היא', curated: 'הִיא', english: 'she', notes: 'Third-person feminine singular.' },
    { id: 'w-bayit', pointed: 'בַּיִת', unpointed: 'בית', curated: 'בַּיִת', english: 'house', notes: 'The base form. In the expression בבית, the prefix and pronunciation also change.' },
    { id: 'w-babayit', pointed: 'בַּבַּיִת', unpointed: 'בבית', curated: 'בבית', english: 'at home', notes: 'In this expression: at home / in the house.' },
    { id: 'w-po', pointed: 'פֹּה', unpointed: 'פה', curated: 'פה', english: 'here', notes: 'A location word.' },
    { id: 'w-sham', pointed: 'שָׁם', unpointed: 'שם', curated: 'שם', english: 'there', notes: 'A location word.' },
    { id: 'w-kotev', pointed: 'כּוֹתֵב', unpointed: 'כותב', curated: 'כּוֹתֵב', english: 'writes (masculine singular)', notes: 'Present-tense masculine singular form; also can mean is writing.' },
    { id: 'w-kotevet', pointed: 'כּוֹתֶבֶת', unpointed: 'כותבת', curated: 'כּוֹתֶבֶת', english: 'writes (feminine singular)', notes: 'Present-tense feminine singular form; also can mean is writing.' }
  ],
  lessons: [
    { id: 'lesson-1', title: 'Small words, first connections', chapter: '01 · Getting started', minutes: 4, letters: 'אהוימנ', explanation: 'Begin with a few short words. Notice the same letters returning in different combinations. This demonstration shows how a brief explanation, a small vocabulary set, and a bounded check can fit together.', wordIds: ['w-ani', 'w-mi', 'w-hu', 'w-hi'], exerciseIds: ['ex-1-recognize', 'ex-1-type', 'ex-1-match'], blocks: [{ type: 'explanation', renderer: 'text' }, { type: 'vocabulary', source: 'words', selector: { lessonId: 'lesson-1' }, renderer: 'vocabulary-table', options: { showNotes: true } }, { type: 'exercise-set', source: 'exercises', selector: { lessonId: 'lesson-1' }, renderer: 'practice' }] },
    { id: 'lesson-2', title: 'Say where someone is', chapter: '02 · Build a sentence', minutes: 5, letters: 'אהויבתפשמ', explanation: 'Use the pronouns from the previous lesson to say where someone is. In these simple present-tense examples, Hebrew does not add a separate word for “am” or “is”: אני בבית — I am at home. Earlier words now become the foundation for a new sentence.', wordIds: ['w-ani', 'w-hu', 'w-hi', 'w-bayit', 'w-babayit', 'w-po', 'w-sham'], exerciseIds: ['ex-2-order', 'ex-2-cloze', 'ex-2-transform'], blocks: [{ type: 'explanation', renderer: 'text' }, { type: 'vocabulary', source: 'words', selector: { lessonId: 'lesson-2' }, renderer: 'vocabulary-table', options: { showNotes: true } }, { type: 'exercise-set', source: 'exercises', selector: { lessonId: 'lesson-2' }, renderer: 'practice' }] },
    { id: 'lesson-3', title: 'Make the sentence agree', chapter: '03 · Connect and apply', minutes: 5, letters: 'אהויכבתפשםנ', explanation: 'Return to familiar pronouns and sentence structure while introducing a verb. Compare הוא כותב and היא כותבת. The form of the verb changes with the subject. This is an illustrative spiral: new information connects to a sentence pattern you have already used.', wordIds: ['w-hu', 'w-hi', 'w-kotev', 'w-kotevet', 'w-po', 'w-sham'], exerciseIds: ['ex-3-recognize', 'ex-3-transform', 'ex-3-order'], blocks: [{ type: 'explanation', renderer: 'text' }, { type: 'vocabulary', source: 'words', selector: { lessonId: 'lesson-3' }, renderer: 'vocabulary-table', options: { showNotes: true } }, { type: 'exercise-set', source: 'exercises', selector: { lessonId: 'lesson-3' }, renderer: 'practice' }] }
  ],
  exercises: [
    { id: 'ex-1-recognize', lessonId: 'lesson-1', type: 'recognition', wordId: 'w-mi', prompt: 'Choose the meaning of this word.', distractors: ['I', 'he', 'she'] },
    { id: 'ex-1-type', lessonId: 'lesson-1', type: 'typing', wordId: 'w-ani', prompt: 'Type the Hebrew word for “I”.' },
    { id: 'ex-1-match', lessonId: 'lesson-1', type: 'matching', wordIds: ['w-hu', 'w-hi', 'w-mi'], prompt: 'Match each word to its meaning.' },
    { id: 'ex-2-order', lessonId: 'lesson-2', type: 'ordering', prompt: 'Build: “I am at home.”', tokens: ['בבית', 'אני'], answers: ['אני בבית'] },
    { id: 'ex-2-cloze', lessonId: 'lesson-2', type: 'cloze', prompt: 'Type the missing word: ___ בבית — She is at home.', answers: ['היא'], nikkudOverride: 'none' },
    { id: 'ex-2-transform', lessonId: 'lesson-2', type: 'transformation', prompt: 'Change “He is at home” to “She is at home”.', context: 'הוא בבית', answers: ['היא בבית'] },
    { id: 'ex-3-recognize', lessonId: 'lesson-3', type: 'recognition', wordId: 'w-kotevet', prompt: 'Choose the meaning of this form.', distractors: ['he', 'at home', 'writes (masculine singular)'] },
    { id: 'ex-3-transform', lessonId: 'lesson-3', type: 'transformation', prompt: 'Change the subject and verb to feminine.', context: 'הוא כותב', answers: ['היא כותבת'] },
    { id: 'ex-3-order', lessonId: 'lesson-3', type: 'ordering', prompt: 'Build: “She is writing here.”', tokens: ['פה', 'כותבת', 'היא'], answers: ['היא כותבת פה'] }
  ]
};

// Additive upgrade of synthetic fixtures only. Existing source fields and learner records survive.
function upgradeFoundation(content) {
  if (content.provenance.kind !== 'synthetic-demo' || content.uxVersion === 1) return null;
  const next = structuredClone(content); next.uxVersion = 1;
  const details = {
    'w-ani': { partOfSpeech:'Pronoun', examples:[{hebrew:'אני בבית',english:'I am at home.'}] },
    'w-hu': { partOfSpeech:'Pronoun',gender:'Masculine singular' },
    'w-hi': { partOfSpeech:'Pronoun',gender:'Feminine singular' },
    'w-kotev': { root:'כ־ת־ב',pattern:'קוֹטֵל',partOfSpeech:'Verb',gender:'Masculine singular',feminine:'כּוֹתֶבֶת',infinitive:'לִכְתּוֹב',examples:[{hebrew:'הוא כותב פה',english:'He is writing here.'}] },
    'w-kotevet': { root:'כ־ת־ב',pattern:'קוֹטֶלֶת',partOfSpeech:'Verb',gender:'Feminine singular',examples:[{hebrew:'היא כותבת פה',english:'She is writing here.'}] }
  };
  for (const w of next.words) if (w.pointed === seed.words.find(x=>x.id===w.id)?.pointed) Object.assign(w, { ...details[w.id], ...w });
  const feedback = {
    'ex-1-recognize':['Pronouns and question words','מִי asks “who”. The pronouns refer to the speaker or another person.'],
    'ex-1-type':['Pronouns','אֲנִי means “I”.'],
    'ex-1-match':['Pronouns and question words','הוּא means “he”, הִיא means “she”, and מִי means “who”.'],
    'ex-2-order':['Location sentences','אני בבית means “I am at home”. These present-tense examples have no separate word for “am”.'],
    'ex-2-cloze':['Pronouns in context','היא is the feminine singular pronoun “she”. Enter the missing pronoun, rather than the full sentence.'],
    'ex-2-transform':['Pronouns in context','Replace הוא with היא. The location expression בבית stays the same.'],
    'ex-3-recognize':['Feminine verb forms','כותבת is the feminine singular present form.'],
    'ex-3-transform':['Subject and verb agreement','Use היא with כותבת so both subject and verb are feminine singular.'],
    'ex-3-order':['Subject and verb agreement','היא כותבת פה means “She is writing here”. The subject and verb agree.']
  };
  for (const e of next.exercises) {
    const reference = seed.exercises.find(x=>x.id===e.id);
    if (!reference || (e.prompt !== reference.prompt && !(e.id==='ex-2-cloze' && e.prompt==='Complete: ___ בבית — She is at home.'))) continue;
    const f=feedback[e.id]; if(f){e.concept ||= f[0];e.feedback ||= f[1];}
    if(e.id==='ex-2-cloze')e.prompt='Type the missing word: ___ בבית — She is at home.';
  }
  const first=next.lessons.find(l=>l.id==='lesson-1');
  if(first && first.exerciseIds.includes('ex-1-recognize') && first.checkExerciseIds===undefined)first.checkExerciseIds=['ex-1-recognize'];
  return next;
}
export function upgradeDemo(content) {
  if(content.provenance.kind!=='synthetic-demo'||content.uxVersion===2)return null;
  const next=upgradeFoundation(content)||structuredClone(content);next.uxVersion=2;
  next.reviewPolicy ||= {defaultNikkud:'full'};
  const highlights=[{knownKeys:'',newKeys:'אהוימנ'},{knownKeys:'אהוימנ',newKeys:'בתפש'},{knownKeys:'אהוימנבתפש',newKeys:'כ'}];
  next.lessons.forEach((l,i)=>{l.keyboard ||= {...highlights[i],knownColor:'#164b81',newColor:'#007b89'};});
  const ani=next.words.find(w=>w.id==='w-ani');if(ani?.format?.color==='#137c83')delete ani.format.color;
  const base=next.words.find(w=>w.id==='w-bayit'),form=next.words.find(w=>w.id==='w-babayit');
  if(base && form && form.pointed==='בַּבַּיִת'){
    Object.assign(form,{baseWordId:base.id,prefix:'ב',noVocab:true,noCard:true});
    base.prefixedForms ||= [{hebrew:form.pointed,english:form.english,prefix:'ב',notes:form.notes}];
    const l=next.lessons.find(l=>l.id==='lesson-2');if(l)l.wordIds=[...new Set(l.wordIds.map(id=>id===form.id?base.id:id))];
    const e=next.exercises.find(e=>e.id==='ex-2-order');if(e && JSON.stringify(e.tokens)==='["בבית","אני"]'){e.tokens=['ב','בית','אני'];e.prefixTokenIndices=[0];}
  }
  return next;
}
Object.assign(seed,upgradeDemo(seed));
