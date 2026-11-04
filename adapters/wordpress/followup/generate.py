from pathlib import Path
import sys,json,hashlib,shutil
here=Path(__file__).resolve().parent;base=Path(sys.argv[1]);out=Path(sys.argv[2]);source=here.parent
PIN={'archive-decks.php':'4d87069c06b1038c451ed1322048f9e8f13991b7dd4224fc7748680c4b18146b','templates/card_loader.php':'01b0b3cd68ffec33477a3480789e899e5b391658078cb546beb47243a8f021c0','study-scheduler/wordpress.php':'4a3413514b649c896e2491513f4ba0a88473123b452484dbc0329c97013259f2'}
for name,digest in json.loads((here/'BASELINE.json').read_text(encoding='utf8')).items():
 if hashlib.sha256((base/name).read_bytes()).hexdigest()!=digest:raise SystemExit('Changed installed-v2 baseline '+name)
out.mkdir(parents=True,exist_ok=True)
for name in ['shared-cards/frame-host.js','shared-cards/frame-child.js','study-scheduler/wordpress.php']:
 (out/name).parent.mkdir(parents=True,exist_ok=True)
 if name=='study-scheduler/wordpress.php':
  (out/name).write_text((source/name).read_text(encoding='utf8').replace("__DIR__.'/../followup/state.php'","__DIR__.'/../study-followup/state.php'"),encoding='utf8',newline='\n')
 else:shutil.copyfile(source/name,out/name)
(out/'study-followup').mkdir(exist_ok=True);shutil.copyfile(here/'state.php',out/'study-followup/state.php');shutil.copyfile(here/'frontend.php',out/'study-followup/frontend.php')
s=(base/'templates/card_loader.php').read_text(encoding='utf8')
s=s.replace("'scheduler_version' => $preview['scheduler_version']", "'scheduler_version' => $preview['scheduler_version'],\n        'review_version' => \\HebleoFollowup\\version($progress)")
s=s.replace('\\HebleoStudy\\persist_rating($user_id, $note_id, $template_id, $rating);',"$request=\\HebleoFollowup\\request_from_post();\n        $saved=\\HebleoStudy\\persist_rating($user_id, $note_id, $template_id, $rating, null, $request);")
s=s.replace('Unable to save this rating. Please retry.','Unable to confirm this review. Check saved state before continuing.')
s=s.replace("    // Update streak\n    update_user_streak($user_id);\n    \n    wp_send_json_success('Card rated');", "    // Duplicate confirmed requests never repeat a streak/history write.\n    if(empty($saved['duplicate'])) update_user_streak($user_id);\n    wp_send_json_success($request!==null?['receipt'=>$saved['review_receipt']]:'Card rated');")
# New-card counts and new-card queue also exclude buried siblings before LIMIT.
for func,endmark in [('ajax_get_study_decks','// Enhanced initialization'),('ajax_start_study_session','// Helper functions')]:
 start=s.index('function '+func+'(');end=s.index(endmark,start);part=s[start:end]
 part=part.replace('$due = \\HebleoStudy\\due_sql();',"$due = \\HebleoStudy\\due_sql();$day = \\HebleoFollowup\\sql($due['now']);")
 import re
 def newquery(m):
  q=m.group(0)
  if "p.state = 'new'" not in q:return q
  return q.replace('FROM $progress_table p','FROM $progress_table p {$day[\'join\']}').replace('WHERE p.user_id',"WHERE {$day['where']} AND p.user_id")
 part=re.sub(r'"SELECT.*?"',newquery,part,flags=re.S);s=s[:start]+part+s[end:]
(out/'templates').mkdir(exist_ok=True);(out/'templates/card_loader.php').write_text(s,encoding='utf8',newline='\n')
s=(base/'archive-decks.php').read_text(encoding='utf8')
button='<button class="suspend-btn" onclick="studyApp.suspendCard()">Suspend Card</button>'
assert s.count(button)==2;s=s.replace(button,'')
anchor='                <div class="study-card">';assert s.count(anchor)==1
s=s.replace(anchor,'                <aside class="study-secondary-actions">'+button+'</aside>\n'+anchor)
s=s.replace('async makeRequest(action, data = {})','async makeRequest(action, data = {}, options = {})').replace('body: formData\n','body: formData,\n            signal: options.signal\n')
s=s.replace('const response = await fetch("<?php echo admin_url(\'admin-ajax.php\'); ?>", {', 'const endpoint = ["rate_card","hebleo_review_status"].includes(action) ? <?php echo wp_json_encode(add_query_arg("hebleo_review","1",home_url("/"))); ?> : <?php echo wp_json_encode(admin_url("admin-ajax.php")); ?>;\n        const response = await fetch(endpoint, {')
s=s.replace('return await response.json();',"const result=await response.json();const date=Date.parse(response.headers.get('date')||'');if(result&&typeof result==='object'&&Number.isFinite(date))result.server_now_utc=date/1000;return result;")
s=s.replace('// Initialize app and handle audio clicks',(here/'client.js').read_text(encoding='utf8')+'\n// Initialize app and handle audio clicks')
s=s.replace('</style>',(here/'controls.css').read_text(encoding='utf8')+'\n</style>',1)
(out/'archive-decks.php').write_text(s,encoding='utf8',newline='\n')
print(json.dumps({str(p.relative_to(out)).replace('\\','/'):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(out.rglob('*')) if p.is_file()},indent=2))
