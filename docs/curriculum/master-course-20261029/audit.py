from pathlib import Path
import json,re,collections,hashlib
B=Path(__file__).parent
d=json.loads((B/'lesson-specifications.json').read_text(encoding='utf-8'))
plan=json.loads((B/'plan-snapshot.json').read_text(encoding='utf-8'))['rows'][3:]
strip=lambda s: re.sub('[\u0591-\u05c7]','',s)
errors=[];notes=[];ids=[];coverage=[]
known=set();letters=set()
introduced=[set('מנתל'),set('םן'),set('אהי'),set('ו')]
allhebrew=[]
for l in d['lessons']:
    n=l['position'];ids.append(l['id'])
    if n==2:letters.update('מנתל')
    if n==3:letters.update('םן')
    if n==5:letters.update('אהי')
    if n==8:letters.add('ו')
    targets=[]
    for line in plan[n-1][3].splitlines():
        if ' — ' in line and re.match(r'^[\u0590-\u05ff]',line):targets.append(line.split(' — ')[0])
    actual=[v['standard'] for v in l['vocabulary']]
    if set(targets)!=set(actual):errors.append({'lesson':n,'vocabMissing':sorted(set(targets)-set(actual)),'vocabExtra':sorted(set(actual)-set(targets))})
    known.update(actual)
    for v in l['vocabulary']:
        ids.append(v['id']);known.update(f[1] for f in v['forms'])
    if n>=6:known.update(['מתן','תמי'])
    exercises=list(l['check'])+list(l['apply'])
    for s in l['screens']:
        ids.append(s['id'])
        if 'interaction' in s:exercises.append(s['interaction'])
    touched=set()
    for e in exercises:
        ids.append(e['id']);touched.update(e['targets'])
        if not e['prompt'] or not e['answer'] or not e['feedback']:errors.append({'emptyExercise':e['id']})
        if e['kind']=='multiple choice':
            if e['answer'] not in e['options']:errors.append({'badChoiceAnswer':e['id']})
            if set(e['options'])!=set(e['feedback']):errors.append({'missingOptionFeedback':e['id']})
        if e['kind']=='matching' and collections.Counter(e['options'])!=collections.Counter(a[1] for a in e['answer']):errors.append({'matchingPool':e['id']})
        if e['kind']=='ordering' and collections.Counter(e['options'])!=collections.Counter(e['answer']):errors.append({'orderingPool':e['id']})
    if set(actual)-touched:errors.append({'lesson':n,'vocabNotPractised':sorted(set(actual)-touched)})
    # Inspect learner prose and authored prompts/options/answers; exclude source-only future morphology.
    learner='\n'.join(s['text'] for s in l['screens'])+'\n'+l['ending']
    learner+='\n'+'\n'.join(json.dumps({k:e[k] for k in ['prompt','stimulus','options','answer','feedback']},ensure_ascii=False) for e in exercises)
    for v in l['vocabulary']:learner+='\n'+v['full']+' '+v['standard']+' '+v['note']+' '+v['context']+' '+json.dumps(v['forms'],ensure_ascii=False)
    found=set(re.findall('[א-ת]',learner))
    if found-letters:errors.append({'lesson':n,'untaughtLetters':sorted(found-letters)})
    tokens=sorted(set(strip(x) for x in re.findall('[\u05d0-\u05ea\u0591-\u05c7]+',learner)))
    allhebrew.append({'lesson':n,'tokens':tokens})
    coverage.append({'lesson':n,'id':l['id'],'screens':len(l['screens']),'vocabulary':len(actual),'exercises':len(exercises),'vocabCoverage':sorted(touched&set(actual))})
if len(ids)!=len(set(ids)):errors.append({'duplicateIds':[x for x,c in collections.Counter(ids).items() if c>1]})
if len(plan)!=119 or len(d['planned'])!=119:errors.append('Course index is incomplete.')
if [r[0] for r in plan]!=[r['id'] for r in d['planned']]:errors.append('Index order differs from live plan.')
if [r[0] for r in plan[:10]]!=[r['id'] for r in d['lessons']]:errors.append('Detailed lessons differ from plan.')
result={'status':'PASS' if not errors else 'FAIL','errors':errors,'coverage':coverage,'uniqueContentIds':len(ids),'planSha256':hashlib.sha256((B/'plan-snapshot.json').read_bytes()).hexdigest(),'scope':'Structural, coverage and bounded learner-letter checks. Hebrew word/form inventory requires manual review; no claim of human linguistic approval or native course testing.'}
(B/'audit.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(B/'learner-word-inventory.json').write_text(json.dumps(allhebrew,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(result,ensure_ascii=False,indent=2))
print('WORD INVENTORY: '+json.dumps(allhebrew,ensure_ascii=False))
raise SystemExit(bool(errors))
