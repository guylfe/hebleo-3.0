<?php
namespace HebleoShared;
/** Explicit journaled recovery; no routes, services, activation hooks or DB restore. */
function release_verify_seal(array $sealed):array {
 demand(isset($sealed['receipt'],$sealed['mac'])&&is_array($sealed['receipt'])&&is_string($sealed['mac'])&&hash_equals(hash_hmac('sha256',digest($sealed['receipt']),wp_salt('auth')),$sealed['mac']),'Untrusted release receipt');return $sealed['receipt'];
}
function release_with_lock(string $pluginRoot,callable $fn){
 $root=realpath($pluginRoot);demand($root!==false,'Missing plugin root');$path=$root.'/.hebleo-shared-release.lock';demand(!is_link($path)&&!is_dir($path),'Unsafe release lock');
 $handle=fopen($path,'c');demand($handle!==false,'Cannot open release lock');
 try{demand(flock($handle,LOCK_EX|LOCK_NB),'File release busy');return $fn();}finally{flock($handle,LOCK_UN);fclose($handle);}
}
function release_write_journal(array $receipt,string $target):void {
 $path=$receipt['before']['backup'].'/hebleo-shared-release.json';$tmp=$path.'.tmp';
 demand(!is_link($path)&&!is_link($tmp)&&!is_dir($path)&&!is_dir($tmp),'Unsafe recovery journal');
 $bytes=json_encode(seal_receipt(['version'=>1,'target'=>$target,'release'=>$receipt]),JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);
 $f=fopen($tmp,'wb');demand($f!==false,'Cannot stage recovery journal');
 try{demand(fwrite($f,$bytes)===strlen($bytes)&&fflush($f),'Cannot persist recovery journal');if(function_exists('fsync'))demand(fsync($f),'Cannot sync recovery journal');}finally{fclose($f);}
 @chmod($tmp,0600);demand(rename($tmp,$path),'Cannot commit recovery journal');
}
function release_read_journal(string $backupRoot):array {
 $backup=realpath($backupRoot);demand($backup!==false,'Missing backup directory');$path=$backup.'/hebleo-shared-release.json';
 demand(is_file($path)&&!is_link($path),'Missing authenticated recovery journal');$journal=release_verify_seal(json_decode(file_get_contents($path),true,512,JSON_THROW_ON_ERROR));
 demand(($journal['version']??null)===1&&in_array($journal['target']??null,['before','after'],true)&&realpath($journal['release']['before']['backup']??'')===$backup,'Invalid recovery journal');return $journal;
}
function release_guard_files(array $r):void {
 $root=$r['before']['root'];demand(realpath($root)===$root&&realpath($r['before']['backup'])===$r['before']['backup'],'Release path changed');
 foreach($r['before']['originalHashes'] as $file=>$before){$path=$root.'/'.$file;demand(is_file($path)&&!is_link($path)&&in_array(hash_file('sha256',$path),[$before,$r['installed'][$file]],true),'Newer file edit: recovery refused');$original=$r['before']['backup'].'/'.str_replace('/','--',$file).'.before';demand(is_file($original)&&!is_link($original)&&hash_equals($before,hash_file('sha256',$original)),'Backup changed');}
 $folder=$root.'/shared-cards';demand(!is_link($folder)&&(!file_exists($folder)||is_dir($folder)),'Candidate directory changed');
 foreach($r['assets'] as $file=>$hash){$path=$folder.'/'.$file;if(file_exists($path)||is_link($path))demand(is_file($path)&&!is_link($path)&&hash_equals($hash,hash_file('sha256',$path)),'Newer candidate asset: recovery refused');}
}
function release_ensure_backups(array $r):void {
 foreach($r['before']['originalHashes'] as $file=>$hash){
  $dest=$r['before']['backup'].'/'.str_replace('/','--',$file).'.before';
  if(is_file($dest)&&!is_link($dest)){demand(hash_equals($hash,hash_file('sha256',$dest)),'Backup changed');continue;}
  demand(!file_exists($dest)&&!is_link($dest),'Backup path changed');
  $source=$r['before']['root'].'/'.$file;demand(is_file($source)&&!is_link($source)&&hash_equals($hash,hash_file('sha256',$source)),'Missing original recovery bytes');
  release_stage($dest.'.stage',file_get_contents($source));demand(rename($dest.'.stage',$dest),'Cannot commit original backup');@chmod($dest,0600);
 }
}
/** Stage every replacement BEFORE any original-file rename. */
function release_stage(string $dest,string $bytes):void {
 demand(!is_link($dest)&&!is_dir($dest),'Cannot stage reviewed file');$f=fopen($dest,'wb');demand($f!==false,'Cannot stage reviewed file');
 try{demand(fwrite($f,$bytes)===strlen($bytes)&&fflush($f),'Cannot write reviewed stage');if(function_exists('fsync'))demand(fsync($f),'Cannot sync reviewed stage');}finally{fclose($f);}
 demand(hash_equals(hash('sha256',$bytes),hash_file('sha256',$dest)),'Stage checksum mismatch');
}
function release_after_bytes(array $r):array {
 $bytes=['templates/card_loader.php'=>file_get_contents(__DIR__.'/card_loader.candidate.php'),'includes/cards.php'=>file_get_contents(__DIR__.'/cards.candidate.php')];
 $main=file_get_contents($r['before']['backup'].'/wp-learning-cards.php.before');$bytes['wp-learning-cards.php']=$main."\nrequire_once __DIR__ . '/shared-cards/shared-cards.php';\n";
 foreach($bytes as $file=>$value)demand(hash_equals($r['installed'][$file],hash('sha256',$value)),'Reviewed candidate source changed');return $bytes;
}
function release_execute_files(array $r,string $target):void {
 demand(in_array($target,['before','after'],true),'Invalid recovery target');release_ensure_backups($r);release_guard_files($r);
 if($target==='after'){$db=$r['databaseBackup']['databaseFile'];demand(is_file($db)&&!is_link($db)&&dirname(realpath($db))===$r['before']['backup']&&hash_equals($r['databaseBackup']['databaseSha256'],hash_file('sha256',$db)),'Database backup missing/changed');}
 $bytes=$target==='after'?release_after_bytes($r):array_map(fn($file)=>file_get_contents($r['before']['backup'].'/'.str_replace('/','--',$file).'.before'),array_combine(array_keys($r['before']['originalHashes']),array_keys($r['before']['originalHashes'])));
 $suffix=$target==='after'?'.hebleo-candidate':'.hebleo-rollback';
 foreach($bytes as $file=>$value)release_stage($r['before']['root'].'/'.$file.$suffix,$value);
 // The sealed operation is recoverable without a returned receipt if the
 // process stops between any two original-file renames.
 release_write_journal($r,$target);
 if($target==='after'){
  $folder=$r['before']['root'].'/shared-cards';if(!is_dir($folder))demand(mkdir($folder,0755),'Cannot create candidate directory');
  foreach($r['assets'] as $file=>$hash){$source=__DIR__.'/'.$file;demand(hash_equals($hash,hash_file('sha256',$source)),'Reviewed asset changed');$dest=$folder.'/'.$file;if(!is_file($dest)){release_stage($dest.'.hebleo-asset',file_get_contents($source));demand(rename($dest.'.hebleo-asset',$dest),'Cannot commit reviewed asset');}}
 }
 release_guard_files($r);
 $order=$target==='after'?['templates/card_loader.php','includes/cards.php','wp-learning-cards.php']:['wp-learning-cards.php','templates/card_loader.php','includes/cards.php'];
 foreach($order as $file){$dest=$r['before']['root'].'/'.$file;$wanted=$target==='after'?$r['installed'][$file]:$r['before']['originalHashes'][$file];
  demand(in_array(hash_file('sha256',$dest),[$r['before']['originalHashes'][$file],$r['installed'][$file]],true),'Newer file edit: recovery refused');
  if(hash_file('sha256',$dest)===$wanted)continue;
  demand(!is_link($dest.$suffix)&&is_file($dest.$suffix)&&hash_equals($wanted,hash_file('sha256',$dest.$suffix))&&rename($dest.$suffix,$dest),'Cannot replace reviewed file; use recovery journal');
  demand(hash_equals($wanted,hash_file('sha256',$dest)),'File replacement checksum mismatch');
 }
 release_write_journal($r,$target);
}
function release_install_files(array $plan,array $serverBackup,string $nonce):array {
 authorize($nonce);return release_with_lock($plan['root'],fn()=>release_install_locked($plan,$serverBackup));
}
function release_install_locked(array $plan,array $serverBackup):array {
 $journal=$plan['backup'].'/hebleo-shared-release.json';
 if(is_file($journal)){$r=release_read_journal($plan['backup'])['release'];demand($r['before']===$plan&&$r['databaseBackup']===$serverBackup,'Different release: reconcile recorded operation');release_execute_files($r,'after');return seal_receipt($r);}
 $fresh=release_preflight($plan['root'],$plan['backup']);demand($fresh===$plan,'Stale release plan');
 demand(isset($serverBackup['databaseFile'],$serverBackup['databaseSha256']),'Verified server database backup required');
 $db=realpath($serverBackup['databaseFile']);demand($db!==false&&dirname($db)===$plan['backup']&&!is_link($serverBackup['databaseFile'])&&hash_equals($serverBackup['databaseSha256'],hash_file('sha256',$db)),'Database backup missing/changed');
 demand(!file_exists($plan['root'].'/shared-cards')&&!is_link($plan['root'].'/shared-cards'),'Existing candidate directory: reconcile before installing');
 foreach(array_keys($plan['originalHashes']) as $file)foreach(['.hebleo-candidate','.hebleo-rollback'] as $suffix)demand(!file_exists($plan['root'].'/'.$file.$suffix)&&!is_link($plan['root'].'/'.$file.$suffix),'Existing stage: reconcile before installing');
 foreach($plan['originalHashes'] as $file=>$hash){$dest=$plan['backup'].'/'.str_replace('/','--',$file).'.before';demand(!file_exists($dest)&&!is_link($dest)&&!file_exists($dest.'.stage')&&!is_link($dest.'.stage'),'Existing backup: reconcile before installing');}
 $r=['before'=>$plan,'installed'=>[],'assets'=>[],'databaseBackup'=>$serverBackup];
 $main=file_get_contents($plan['root'].'/wp-learning-cards.php')."\nrequire_once __DIR__ . '/shared-cards/shared-cards.php';\n";
 $r['installed']=['templates/card_loader.php'=>hash_file('sha256',__DIR__.'/card_loader.candidate.php'),'includes/cards.php'=>hash_file('sha256',__DIR__.'/cards.candidate.php'),'wp-learning-cards.php'=>hash('sha256',$main)];
 foreach(['shared-cards.php','frame-bridge.php','frame-child.js','frame-host.js'] as $file)$r['assets'][$file]=hash_file('sha256',__DIR__.'/'.$file);
 release_write_journal($r,'after');release_execute_files($r,'after');return seal_receipt($r);
}
/** Recovery works even when the interrupted installer returned no receipt. */
function release_recover_files(string $backupRoot,string $nonce,string $target='before'):array {
 authorize($nonce);$r=release_read_journal($backupRoot)['release'];return release_with_lock($r['before']['root'],function()use($backupRoot,$target){$r=release_read_journal($backupRoot)['release'];release_execute_files($r,$target);return seal_receipt($r);});
}
function release_rollback_files(array $sealed,string $nonce):void {
 authorize($nonce);$r=release_verify_seal($sealed);release_with_lock($r['before']['root'],function()use($r){$recorded=release_read_journal($r['before']['backup'])['release'];demand($recorded===$r,'Release receipt differs from recovery journal');release_execute_files($r,'before');});
 // Inert candidate assets, additive notes, media, schedules and DB are retained.
}
