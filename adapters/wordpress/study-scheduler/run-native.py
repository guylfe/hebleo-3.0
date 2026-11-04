from pathlib import Path
import sys,shutil,subprocess,os,json,time,socket
r=Path(sys.argv[1]);here=Path(__file__).resolve().parent;w=r/'wordpress-study-20261104/work/scheduler';f=w/(sys.argv[3] if len(sys.argv)>3 else 'native-fixture');php=Path(sys.argv[2]);source=r/'wordpress-shared-cards/native';dbbin=source/'db/mariadb-11.4.13-winx64/bin';port=33419
if f.exists():raise SystemExit('Refusing to reuse fixture/data directory')
# Refuse occupied loopback ports before creating or contacting any database.
with socket.socket() as reservation:reservation.bind(('127.0.0.1',port))
f.mkdir();wp=f/'wp'
shutil.copytree(source/'wp/wordpress',wp,ignore=shutil.ignore_patterns('wp-content','wp-config.php'))
themes=source/'wp/wordpress/wp-content/themes'
if themes.exists():shutil.copytree(themes,wp/'wp-content/themes')
plugin=wp/'wp-content/plugins/wp-learning-cards';shutil.copytree(r/'wordpress-study-20261104/baseline-plugin',plugin)
# Runtime files are already approved local dependencies; no live download.
base=r/'wordpress-study-20261104/baseline-plugin'
for candidate in [source/'wp/wordpress/wp-content/plugins/wp-learning-cards/runtime',source/'wp/wordpress/wp-content/plugins/wp-learning-cards/shared-cards/runtime']:
 if candidate.exists():shutil.copytree(candidate,plugin/candidate.relative_to(source/'wp/wordpress/wp-content/plugins/wp-learning-cards'),dirs_exist_ok=True)
subprocess.run([sys.executable,str(here/'generate.py'),str(base),str(plugin)],check=True,capture_output=True,text=True)
config="""<?php
define('DB_NAME','scheduler_fixture');define('DB_USER','root');define('DB_PASSWORD','');define('DB_HOST','127.0.0.1:33419');define('DB_CHARSET','utf8mb4');define('DB_COLLATE','');
$table_prefix='sched_';define('WP_SITEURL','http://127.0.0.1:33420');define('WP_HOME','http://127.0.0.1:33420');define('DISABLE_WP_CRON',true);define('WP_HTTP_BLOCK_EXTERNAL',true);define('WP_ENVIRONMENT_TYPE','local');define('WP_DEBUG',true);define('WP_DEBUG_DISPLAY',false);define('WP_DEBUG_LOG',true);define('WP_AUTO_UPDATE_CORE',false);define('AUTOMATIC_UPDATER_DISABLED',true);
define('AUTH_KEY','synthetic-fixture-auth');define('SECURE_AUTH_KEY','synthetic-fixture-secure');define('LOGGED_IN_KEY','synthetic-fixture-login');define('NONCE_KEY','synthetic-fixture-nonce');
if(!defined('ABSPATH'))define('ABSPATH',__DIR__.'/');require_once ABSPATH.'wp-settings.php';
"""
(wp/'wp-config.php').write_text(config)
# Brand-new system tables, never copied DB state or Windows service.
install=subprocess.run([str(dbbin/'mariadb-install-db.exe'),'--datadir='+str(f/'data'),'--port='+str(port),'--silent'],capture_output=True,text=True,timeout=60)
(f/'initialize.log').write_text(install.stdout+install.stderr);install.check_returncode()
for p in plugin.rglob('*.php'):
 q=subprocess.run([str(php),'-l',str(p)],capture_output=True,text=True);q.check_returncode()
log=open(f/'mariadb.log','w');proc=subprocess.Popen([str(dbbin/'mariadbd.exe'),'--no-defaults','--datadir='+str(f/'data'),'--port='+str(port),'--bind-address=127.0.0.1','--console'],stdout=log,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW)
(f/'helper.pid').write_text(str(proc.pid))
args=[str(php),'-d','extension_dir='+str(php.parent/'ext'),'-d','extension=mysqli','-d','extension=mbstring','-d','memory_limit=512M',str(here/'native-test.php'),str(f)]
try:
 # One bounded readiness check; no CI/deploy polling loop.
 ready=subprocess.run([str(dbbin/'mariadb-admin.exe'),'--skip-ssl','--host=127.0.0.1','--port='+str(port),'--user=root','--wait=15','ping'],capture_output=True,text=True,timeout=20)
 (f/'readiness.log').write_text(ready.stdout+ready.stderr);ready.check_returncode()
 q=subprocess.run([str(dbbin/'mariadb.exe'),'--skip-ssl','--host=127.0.0.1','--port='+str(port),'--user=root','-e','CREATE DATABASE scheduler_fixture CHARACTER SET utf8mb4'],capture_output=True,text=True,check=True)
 for phase in ['setup','test','reopen']:
  q=subprocess.run(args+[phase],capture_output=True,text=True,timeout=60);(f/(phase+'.log')).write_text(q.stdout+q.stderr);print(q.stdout+q.stderr,flush=True);q.check_returncode()
finally:
 shutdown=None
 if proc.poll() is None:shutdown=subprocess.run([str(dbbin/'mariadb-admin.exe'),'--skip-ssl','--host=127.0.0.1','--port='+str(port),'--user=root','shutdown'],capture_output=True,text=True,timeout=15)
 try:proc.wait(timeout=15)
 except subprocess.TimeoutExpired:proc.terminate();proc.wait(timeout=10)
 log.close();(f/'STOPPED.json').write_text(json.dumps({'pid':proc.pid,'exitCode':proc.returncode,'stopped':proc.poll() is not None,'service_created':False,'port':port}))
print('PASS own helper stopped',flush=True)
