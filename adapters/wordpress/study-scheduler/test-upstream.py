from pathlib import Path
import sys,json,subprocess,math,random
from datetime import datetime,timedelta,timezone
here=Path(__file__).resolve().parent
sys.path.insert(0,str(here/'upstream'))
from fsrs import Scheduler,Card,Rating,State
php=sys.argv[1];out=Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
scheduler=Scheduler(enable_fuzzing=False)
now=int(datetime(2026,11,4,0,30,tzinfo=timezone.utc).timestamp())
cases=[];expected=[]
def add(c,g,at):
 cases.append({'card':c,'rating':g,'now':at})
 card=Card(card_id=1,state={'learning':State.Learning,'review':State.Review,'relearning':State.Relearning}[c['state']],step=c['step'],stability=c['stability'],difficulty=c['difficulty'],last_review=datetime.fromtimestamp(c['last_review'],timezone.utc) if c['last_review'] is not None else None)
 result,_=scheduler.review_card(card,Rating(g),datetime.fromtimestamp(at,timezone.utc))
 expected.append({'state':result.state.name.lower(),'step':result.step,'stability':result.stability,'difficulty':result.difficulty,'last_review':int(result.last_review.timestamp()),'due':int(result.due.timestamp()),'interval_seconds':int(result.due.timestamp())-at,'elapsed_days':0 if c['last_review'] is None else (at-c['last_review'])//86400})
for state in ['learning','review','relearning']:
 for seconds in [0,59,60,330,600,86399,86400,86401,172800,2592000,31536000]:
  for g in [1,2,3,4]:
   for step in ([0,1,2] if state=='learning' else [None] if state=='review' else [0,1]):
    add({'state':state,'step':step,'stability':2.3065,'difficulty':5.5,'last_review':now-seconds},g,now)
for g in [1,2,3,4]:add({'state':'learning','step':0,'stability':None,'difficulty':None,'last_review':None},g,now)
for stability in [2.5,3.5]:add({'state':'learning','step':1,'stability':stability,'difficulty':5.5,'last_review':now},3,now)
# Seeded range checks against upstream, including minimum/tiny/large stability.
rng=random.Random(20261104)
for _ in range(240):
 state=rng.choice(['learning','review','relearning']);s=10**rng.uniform(-3,5);d=rng.uniform(1,10)
 add({'state':state,'step':None if state=='review' else 0,'stability':s,'difficulty':d,'last_review':now-rng.randrange(0,18000*86400)},rng.randrange(1,5),now)
# Cross-language sequences with storage quantization after each review.
for seq in [[1,2,3,3,1,2,3,4],[4,3,2,1,3,3,4,1],[3,3,3,3,2,1,3,4]]:
 c={'state':'learning','step':0,'stability':None,'difficulty':None,'last_review':None};at=now
 for g in seq:
  add(c,g,at);e=expected[-1];c={k:e[k] for k in ['state','step','stability','difficulty','last_review']};c['stability']=round(c['stability'],4);c['difficulty']=round(c['difficulty'],4);at=e['due']
p=subprocess.run([php,str(here/'cross-runner.php')],input=json.dumps(cases),capture_output=True,text=True,check=True)
actual=json.loads(p.stdout)
assert len(actual)==len(expected)
for i,(a,e) in enumerate(zip(actual,expected)):
 for k in e:
  if k in ['stability','difficulty']:assert math.isclose(a[k],e[k],rel_tol=1e-11,abs_tol=1e-10),(i,k,a[k],e[k],cases[i])
  else:assert a[k]==e[k],(i,k,a[k],e[k],cases[i])
(out/'upstream-vectors.json').write_text(json.dumps({'cases':cases,'expected':expected},indent=2))
summary={'upstream':'fsrs 6.3.2','cases':len(cases),'all_fields_match':True,'precision':'S/D rel 1e-11 abs 1e-10; state/step/due/elapsed exact','config':scheduler.to_dict()}
(out/'upstream-results.json').write_text(json.dumps(summary,indent=2));print(json.dumps(summary))

