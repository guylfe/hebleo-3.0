import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
const run=promisify(execFile), root=process.argv[2], php=process.argv[3], work=path.join(root,'wordpress-study-20261104/work/scheduler');
const fixture=path.join(work,process.argv[4]||'native-rr-20261104-2'), source=path.join(root,'wordpress-shared-cards/native'), candidate=path.join(root,'wordpress-study-20261104/work/scheduler/candidate-rr-final');
const sched=path.join(root,'hebleo-wordpress-study/adapters/wordpress/study-scheduler'), dbbin=path.join(source,'db/mariadb-11.4.13-winx64/bin'), port=33439;
if(fs.existsSync(fixture))throw Error('Refuse fixture reuse');
await new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(port,'127.0.0.1',()=>s.close(resolve));});
fs.mkdirSync(fixture); const wp=path.join(fixture,'wp'), plugin=path.join(wp,'wp-content/plugins/wp-learning-cards');
fs.cpSync(path.join(source,'wp/wordpress'),wp,{recursive:true,filter:(p)=>!['wp-content','wp-config.php'].includes(path.basename(p))});
fs.cpSync(path.join(source,'wp/wordpress/wp-content/themes'),path.join(wp,'wp-content/themes'),{recursive:true});
fs.cpSync(path.join(root,'wordpress-study-20261104/baseline-plugin'),plugin,{recursive:true});
fs.cpSync(candidate,plugin,{recursive:true});
for(const rel of ['runtime','shared-cards/runtime']){const from=path.join(source,'wp/wordpress/wp-content/plugins/wp-learning-cards',rel);if(fs.existsSync(from))fs.cpSync(from,path.join(plugin,rel),{recursive:true});}
const config="<?php\ndefine('DB_NAME','rr_scheduler');define('DB_USER','root');define('DB_PASSWORD','');define('DB_HOST','127.0.0.1:33439');define('DB_CHARSET','utf8mb4');define('DB_COLLATE','');$table_prefix='rr_';define('WP_SITEURL','http://127.0.0.1:33440');define('WP_HOME','http://127.0.0.1:33440');define('DISABLE_WP_CRON',true);define('WP_HTTP_BLOCK_EXTERNAL',true);define('WP_ENVIRONMENT_TYPE','local');define('WP_DEBUG',true);define('WP_DEBUG_DISPLAY',false);define('WP_DEBUG_LOG',true);define('WP_AUTO_UPDATE_CORE',false);define('AUTOMATIC_UPDATER_DISABLED',true);define('AUTH_KEY','rr-synthetic');define('SECURE_AUTH_KEY','rr-synthetic');define('LOGGED_IN_KEY','rr-synthetic');define('NONCE_KEY','rr-synthetic');if(!defined('ABSPATH'))define('ABSPATH',__DIR__.'/');require_once ABSPATH.'wp-settings.php';";
fs.writeFileSync(path.join(wp,'wp-config.php'),config);
const opts={windowsHide:true,timeout:60000,maxBuffer:4*1024*1024};
async function logged(name,exe,args){try{const r=await run(exe,args,opts);fs.writeFileSync(path.join(fixture,name+'.log'),r.stdout+r.stderr);return r;}catch(e){fs.writeFileSync(path.join(fixture,name+'.log'),(e.stdout||'')+(e.stderr||'')+e.message);throw e;}}
await logged('initialize',path.join(dbbin,'mariadb-install-db.exe'),['--datadir='+path.join(fixture,'data'),'--port='+port,'--silent']);
const dbfd=fs.openSync(path.join(fixture,'mariadb.log'),'w');
const db=spawn(path.join(dbbin,'mariadbd.exe'),['--no-defaults','--datadir='+path.join(fixture,'data'),'--port='+port,'--bind-address=127.0.0.1','--console'],{windowsHide:true,stdio:['ignore',dbfd,dbfd]});
fs.writeFileSync(path.join(fixture,'helper.pid'),String(db.pid));
const dbdone=new Promise(resolve=>db.once('exit',(code,signal)=>resolve({code,signal})));
const dbargs=['--skip-ssl','--host=127.0.0.1','--port='+port,'--user=root'];
const phpargs=['-d','extension_dir='+path.join(path.dirname(php),'ext'),'-d','extension=mysqli','-d','extension=mbstring','-d','memory_limit=512M'];
const children=[];
function worker(mode){
 const p=spawn(php,[...phpargs,path.join(sched,'regressions.php'),fixture,mode],{windowsHide:true});children.push(p);
 let stdout='',stderr='';const pending=[];
 p.stdout.on('data',x=>{stdout+=x});p.stderr.on('data',x=>{stderr+=x;for(const f of [...pending])f();});
 const done=new Promise((resolve,reject)=>{p.once('error',reject);p.once('exit',code=>{fs.writeFileSync(path.join(fixture,'worker-'+mode+'.log'),stdout+'\n'+stderr);code===0?resolve({stdout,stderr}):reject(Error(mode+' exit '+code+': '+stderr));});});
 done.catch(()=>{});
 return {p,done,wait(mark){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Handshake timeout '+mode+' '+mark)),15000);const check=()=>{if(stderr.includes(mark)){clearTimeout(timer);pending.splice(pending.indexOf(check),1);resolve();}};pending.push(check);check();});}};
}
try{
 await logged('readiness',path.join(dbbin,'mariadb-admin.exe'),[...dbargs,'--wait=15','ping']);
 await logged('create',path.join(dbbin,'mariadb.exe'),[...dbargs,'-e','CREATE DATABASE rr_scheduler CHARACTER SET utf8mb4']);
 for(const phase of ['setup','test','reopen']){const r=await logged(phase,php,[...phpargs,path.join(sched,'native-test.php'),fixture,phase]);console.log(r.stdout.trim());}
 console.log((await logged('dst',php,[...phpargs,path.join(sched,'regressions.php'),fixture,'dst'])).stdout.trim());
 const b=worker('B');await b.wait('REQUEST_BEFORE_LOCK');
 const a=worker('A');await a.wait('ROW_LOCK_HELD');
 b.p.stdin.write('continue\n');await b.wait('LOCK_ATTEMPT');
 await new Promise(resolve=>setTimeout(resolve,300));
 const locks=await logged('lock-waits',path.join(dbbin,'mariadb.exe'),[...dbargs,'-e','SELECT * FROM information_schema.INNODB_LOCK_WAITS']);
 if(!locks.stdout.includes('requesting_trx_id')||locks.stdout.trim().split('\n').length<2)throw Error('No actual InnoDB lock wait observed');
 a.p.stdin.write('commit\n');await b.wait('CLOCK_AFTER_LOCK');await a.done;b.p.stdin.write('post-lock clock\n');await b.done;
 const inspect=await logged('concurrency-final',php,[...phpargs,path.join(sched,'regressions.php'),fixture,'inspect']);
 const final=JSON.parse(inspect.stdout);fs.writeFileSync(path.join(fixture,'concurrency-results.json'),JSON.stringify(final,null,2));
 console.log(JSON.stringify({concurrency_final_state:final.row.state,step:final.meta.step,last_review_utc:final.meta.last_review_utc,stability:final.meta.stability,reps:final.row.reps}));
 const engine=await logged('engines',path.join(dbbin,'mariadb.exe'),[...dbargs,'-e',"SELECT TABLE_NAME,ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA='rr_scheduler' AND TABLE_NAME IN ('rr_flashcard_progress','rr_usermeta')"]);
 console.log(engine.stdout.trim());
 const hashes={};
 for(const rel of ['study-scheduler/fsrs.php','study-scheduler/wordpress.php','templates/card_loader.php']){
  const h=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
  hashes[rel]={candidate:h(path.join(candidate,rel)),fixture:h(path.join(plugin,rel))};
  if(hashes[rel].candidate!==hashes[rel].fixture)throw Error('Hash mismatch');
 }
 fs.writeFileSync(path.join(fixture,'runtime-hashes.json'),JSON.stringify(hashes,null,2));
}finally{
 for(const c of children)if(c.exitCode===null)c.kill();
 if(db.exitCode===null)await logged('shutdown',path.join(dbbin,'mariadb-admin.exe'),[...dbargs,'shutdown']).catch(()=>db.kill());
 const stopped=await dbdone;fs.closeSync(dbfd);
 fs.writeFileSync(path.join(fixture,'STOPPED.json'),JSON.stringify({pid:db.pid,...stopped,stopped:db.exitCode!==null,service_created:false,port}));
 console.log('Own MariaDB helper stopped');
}
