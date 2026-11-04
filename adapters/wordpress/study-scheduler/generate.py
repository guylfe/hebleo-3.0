"""python generate.py BASELINE_PLUGIN OUTPUT_PLUGIN -- emits only owned scheduler files."""
from pathlib import Path
import hashlib,sys,shutil,json
here=Path(__file__).resolve().parent
baseline=Path(sys.argv[1]);out=Path(sys.argv[2]);p=baseline/'templates/card_loader.php'
raw=p.read_bytes()
EXPECTED='803bfbc4c2c1f07f1090c20ef671a6750bbf58f098dd3362a48d7ee04d163a8e'
if hashlib.sha256(raw).hexdigest()!=EXPECTED:raise SystemExit('Refusing changed baseline card_loader.php')
s=raw.decode().replace('\r\n','\n')
start=s.index('class FSRSAlgorithm {');end=s.index('// Initialize system',start)
s=s[:start]+"require_once dirname(__DIR__).'/study-scheduler/wordpress.php';\n\n"+s[end:]
start=s.index('    // Calculate FSRS intervals for preview');end=s.index("    return apply_filters('hebleo_shared_study_card'",start)
s=s[:start]+"    $preview = \\HebleoStudy\\preview($progress, \\HebleoStudy\\clock_now());\n    $intervals = $preview['intervals'];\n\n"+s[end:]
s=s.replace("        'intervals' => $intervals\n", "        'intervals' => $intervals,\n        'schedule_previews' => $preview['schedule_previews'],\n        'scheduler_preview_at' => $preview['scheduler_preview_at'],\n        'scheduler_version' => $preview['scheduler_version']\n",1)
start=s.index('    // Calculate elapsed days',s.index('function ajax_rate_card()'));end=s.index('    // Update streak',start)
s=s[:start]+r"""    try {
        \HebleoStudy\persist_rating($user_id, $note_id, $template_id, $rating);
    } catch (\Throwable $error) {
        wp_send_json_error('Unable to save this rating. Please retry.');
        return;
    }

"""+s[end:]
# Every native due predicate/count/order uses the same SQL UTC key before LIMIT.
for name,next_name in [('ajax_get_study_decks','// Enhanced initialization'),('ajax_start_study_session','// Helper functions'),('get_cards_due_for_review','// Check if user has studied today')]:
 start=s.index('function '+name+'(');end=s.index(next_name,start);part=s[start:end]
 part=part.replace("$now = current_time('mysql');", "$due = \\HebleoStudy\\due_sql();")
 # Only queries with next_review predicates need the sidecar join.
 import re
 def query_rewrite(m):
  q=m.group(0)
  if 'next_review <=' not in q:return q
  q=q.replace('FROM $progress_table p','FROM $progress_table p {$due[\'join\']}')
  q=q.replace('p.next_review <= %s',"{$due['where']}")
  q=q.replace('p.next_review ASC',"{$due['epoch']} ASC, p.id ASC")
  return q
 if name!='get_cards_due_for_review':
  part=re.sub(r'"SELECT.*?"',query_rewrite,part,flags=re.S)
  part=part.replace('$user_id, $deck->ID, $now','$user_id, $deck->ID').replace('$user_id, $deck_id, $now,','$user_id, $deck_id,')
 else:
  part=part.replace('p.next_review <= %s',"{$due['where']}")
  part=part.replace('array($user_id, $now)','array($user_id)')
  part=part.replace('SELECT * FROM $progress_table p $where_clause ORDER BY next_review ASC',"SELECT p.* FROM $progress_table p {$due['join']} $where_clause ORDER BY {$due['epoch']} ASC, p.id ASC")
 s=s[:start]+part+s[end:]
if 'p.next_review <= %s' in s:raise SystemExit('Unpatched due eligibility')

(out/'templates').mkdir(parents=True,exist_ok=True);(out/'study-scheduler').mkdir(parents=True,exist_ok=True)
(out/'templates/card_loader.php').write_text(s,encoding='utf8',newline='\n')
for name in ['fsrs.php','wordpress.php']:
 shutil.copyfile(here/name,out/'study-scheduler'/name)
shutil.copyfile(here/'upstream/LICENSE',out/'study-scheduler/LICENSE-py-fsrs')
print(json.dumps({'baseline_sha256':EXPECTED,'outputs':{str(p.relative_to(out)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(out.rglob('*')) if p.is_file()}},indent=2))
