from pathlib import Path
import sys,subprocess,shutil,socket,json,time,urllib.request,urllib.parse,statistics,math
r=Path(sys.argv[1]);phase=sys.argv[2];php=Path(sys.argv[3]);a=r/'hebleo-flashcard-followup/adapters/wordpress/followup';w=r/'flashcard-followup-20261104/work/wordpress';f=w/('profile-'+phase+('-'+sys.argv[4] if len(sys.argv)>4 else ''));source=r/'wordpress-shared-cards/native';dbbin=source/'db/mariadb-11.4.13-winx64/bin';dbport=33519;httpport=33520
if f.exists():raise SystemExit('Refuse reused profile fixture')
for port in [dbport,httpport]:
 with socket.socket() as s:s.bind(('127.0.0.1',port))
f.mkdir();wp=f/'wp';shutil.copytree(source/'wp/wordpress',wp,ignore=shutil.ignore_patterns('wp-content','wp-config.php'));shutil.copytree(source/'wp/wordpress/wp-content/themes',wp/'wp-content/themes')
plugin=wp/'wp-content/plugins/wp-learning-cards';shutil.copytree(r/'flashcard-followup-20261104/wordpress-baseline',plugin)
if phase!='before':subprocess.run([sys.executable,str(a/'generate.py'),str(r/'flashcard-followup-20261104/wordpress-baseline'),str(plugin)],check=True,capture_output=True,text=True)
# Transparent timing probes confined to the disposable copies.
p=plugin/'study-scheduler/wordpress.php';s=p.read_text(encoding='utf8');s=s.replace("if($wpdb->query('START TRANSACTION')", "\\do_action('ff_profile_stage','transaction_start');if($wpdb->query('START TRANSACTION')")
s=s.replace('$p=$wpdb->get_row($wpdb->prepare("SELECT * FROM $table',"\\do_action('ff_profile_stage','lock_start');$p=$wpdb->get_row($wpdb->prepare(\"SELECT * FROM $table")
s=s.replace("if(!$p)throw", "\\do_action('ff_profile_stage','lock_end');if(!$p)throw")
s=s.replace('$s=schedule($p,$rating,$now,$meta);',"\\do_action('ff_profile_stage','schedule_start');$s=schedule($p,$rating,$now,$meta);\\do_action('ff_profile_stage','schedule_end');")
s=s.replace('return $s;',"\\do_action('ff_profile_stage','transaction_end');return $s;");p.write_text(s,encoding='utf8')
p=plugin/'templates/card_loader.php';s=p.read_text(encoding='utf8').replace("if(empty($saved['duplicate'])) update_user_streak($user_id);","if(empty($saved['duplicate'])){do_action('ff_profile_stage','streak_start');update_user_streak($user_id);do_action('ff_profile_stage','streak_end');}").replace('    update_user_streak($user_id);',"    do_action('ff_profile_stage','streak_start');update_user_streak($user_id);do_action('ff_profile_stage','streak_end');");p.write_text(s,encoding='utf8')
shutil.copyfile(a/'profile-router.php',f/'router.php')
(wp/'wp-config.php').write_text("<?php\ndefine('DB_NAME','ff_profile');define('DB_USER','root');define('DB_PASSWORD','');define('DB_HOST','127.0.0.1:33519');define('DB_CHARSET','utf8mb4');define('DB_COLLATE','');$table_prefix='fp_';define('WP_SITEURL','http://127.0.0.1:33520');define('WP_HOME','http://127.0.0.1:33520');define('DISABLE_WP_CRON',true);define('WP_HTTP_BLOCK_EXTERNAL',true);define('WP_ENVIRONMENT_TYPE','local');define('WP_DEBUG',true);define('WP_DEBUG_DISPLAY',false);define('WP_DEBUG_LOG',true);define('AUTOMATIC_UPDATER_DISABLED',true);define('AUTH_KEY','synthetic');define('SECURE_AUTH_KEY','synthetic');define('LOGGED_IN_KEY','synthetic');define('NONCE_KEY','synthetic');if(!defined('ABSPATH'))define('ABSPATH',__DIR__.'/');require_once ABSPATH.'wp-settings.php';")
q=subprocess.run([str(dbbin/'mariadb-install-db.exe'),'--datadir='+str(f/'data'),'--port='+str(dbport),'--silent'],capture_output=True,text=True,timeout=60);(f/'initialize.log').write_text(q.stdout+q.stderr);q.check_returncode()
log=open(f/'db.log','w');db=subprocess.Popen([str(dbbin/'mariadbd.exe'),'--no-defaults','--datadir='+str(f/'data'),'--port='+str(dbport),'--bind-address=127.0.0.1','--console'],stdout=log,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW)
dbargs=['--skip-ssl','--host=127.0.0.1','--port='+str(dbport),'--user=root'];http=None;httplog=open(f/'http.log','w')
def request(path,data=None):
 start=time.perf_counter();raw=urllib.request.urlopen('http://127.0.0.1:33520'+path,data=urllib.parse.urlencode(data).encode() if data is not None else None,timeout=20).read();return json.loads(raw),(time.perf_counter()-start)*1000
try:
 subprocess.run([str(dbbin/'mariadb-admin.exe'),*dbargs,'--wait=15','ping'],capture_output=True,check=True,timeout=20);subprocess.run([str(dbbin/'mariadb.exe'),*dbargs,'-e','CREATE DATABASE ff_profile CHARACTER SET utf8mb4'],check=True,capture_output=True,timeout=15)
 subprocess.run([str(php),'-d','extension_dir='+str(php.parent/'ext'),'-d','extension=mysqli','-d','extension=mbstring',str(r/'hebleo-flashcard-followup/adapters/wordpress/study-scheduler/native-test.php'),str(f),'setup'],check=True,capture_output=True,text=True,timeout=90)
 http=subprocess.Popen([str(php),'-d','extension_dir='+str(php.parent/'ext'),'-d','extension=mysqli','-d','extension=mbstring','-d','memory_limit=512M','-S','127.0.0.1:33520',str(f/'router.php')],cwd=str(f),stdout=httplog,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW)
 # One bounded connection readiness; server is just created, no CI/deploy polling.
 try:socket.create_connection(('127.0.0.1',33520),timeout=2).close()
 except OSError:time.sleep(.3)
 print('SEED',request('/seed')[0],flush=True);rows=[]
 for i in range(23):
  state,_=request('/state');data={k:state[k] for k in ['note_id','template_id']};data.update(rating=3)
  if phase!='before':
   data.update(request_id='profile-'+str(i).zfill(24),expected_version=state['card']['review_version'])
  result,total=request('/rate',data);assert result['response']['success'],result;result['timing']['http_total_ms']=total
  if i>=3:rows.append(result['timing'])
 summary={k:{'n':len(rows),'median':statistics.median(x[k] for x in rows),'p95':sorted(x[k] for x in rows)[math.ceil(.95*len(rows))-1]} for k in rows[0] if all(x[k] is not None for x in rows)}
 (f/'TIMINGS.json').write_text(json.dumps({'phase':phase,'data_size':{'progress':2967,'assignments':2118,'settings':35},'rows':rows,'summary':summary},indent=2));print(json.dumps(summary),flush=True)
finally:
 if http is not None:http.terminate();http.wait(timeout=10)
 if db.poll() is None:subprocess.run([str(dbbin/'mariadb-admin.exe'),*dbargs,'shutdown'],capture_output=True,timeout=15)
 db.wait(timeout=15);log.close();httplog.close();(f/'STOPPED.json').write_text(json.dumps({'db_pid':db.pid,'db_exit':db.returncode,'http_pid':http.pid if http else None,'http_stopped':http is None or http.poll() is not None,'db_stopped':db.poll() is not None,'service':False}))
