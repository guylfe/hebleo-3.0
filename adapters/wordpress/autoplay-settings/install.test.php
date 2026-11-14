<?php
namespace HebleoAutoplayRelease;
require __DIR__.'/install.php';
$root=$argv[1];if(file_exists($root))throw new \RuntimeException('Refuse fixture reuse');mkdir($root,0700,true);mkdir($root.'/web');define('ABSPATH',$root.'/web/');
$GLOBALS['wpdb']=null;$metricCalls=0;$changeMetrics=false;
function metrics($db):array{global $metricCalls,$changeMetrics;return ['fixed'=>($changeMetrics&&++$metricCalls>1)?2:1];}
$checks=0;function ok($value,$why){global $checks;++$checks;if(!$value)throw new \RuntimeException($why);}
function fixture($name){global $root;$p=$root.'/'.$name;mkdir($p);mkdir($p.'/templates');file_put_contents($p.'/templates/card_loader.php','original loader');file_put_contents($p.'/archive-decks.php','original archive');file_put_contents($p.'/unrelated.php','preserved');return $p;}
$manifest=['templates/card_loader.php'=>['before'=>hash('sha256','original loader'),'after'=>hash('sha256','changed loader')],'archive-decks.php'=>['before'=>hash('sha256','original archive'),'after'=>hash('sha256','changed archive')]];
$bodies=['templates/card_loader.php'=>'changed loader','archive-decks.php'=>'changed archive'];
$plugin=fixture('normal');$r=install($plugin,$root.'/backup-normal',$manifest,$bodies);
ok($r['preserved']&&$r['data_writes']===0,'success preservation receipt');
foreach($bodies as $rel=>$body){ok(file_get_contents($plugin.'/'.$rel)===$body,'installed readback');ok(hash_file('sha256',$root.'/backup-normal/'.$rel)===$manifest[$rel]['before'],'both original backups verified');}
ok(file_get_contents($plugin.'/unrelated.php')==='preserved','other files unchanged');
$plugin=fixture('stale');file_put_contents($plugin.'/archive-decks.php','external edit');$failed=false;try{install($plugin,$root.'/backup-stale',$manifest,$bodies);}catch(\Throwable $e){$failed=true;}
ok($failed&&!file_exists($root.'/backup-stale'),'stale source refused before backup/write');ok(file_get_contents($plugin.'/archive-decks.php')==='external edit','external edit retained');
$plugin=fixture('payload');$bad=$bodies;$bad['archive-decks.php']='corrupt';$failed=false;try{install($plugin,$root.'/backup-payload',$manifest,$bad);}catch(\Throwable $e){$failed=true;}
ok($failed&&file_get_contents($plugin.'/templates/card_loader.php')==='original loader','bad hash refused');
$plugin=fixture('rollback');$metricCalls=0;$changeMetrics=true;$failed=false;try{install($plugin,$root.'/backup-rollback',$manifest,$bodies);}catch(\Throwable $e){$failed=true;}
ok($failed,'preservation mismatch refused');ok(file_get_contents($plugin.'/templates/card_loader.php')==='original loader'&&file_get_contents($plugin.'/archive-decks.php')==='original archive','both files rolled back');
$changeMetrics=false;$plugin=fixture('webbackup');$failed=false;try{install($plugin,ABSPATH.'unsafe',$manifest,$bodies);}catch(\Throwable $e){$failed=true;}ok($failed,'backup inside web root refused');
$plugin=fixture('scope');$wrong=$manifest;$wrong['unexpected.php']=$manifest['archive-decks.php'];$failed=false;try{install($plugin,$root.'/backup-scope',$wrong,$bodies);}catch(\Throwable $e){$failed=true;}ok($failed,'scope expansion refused');
$plugin=fixture('syntax');$bad=$bodies;$bad['archive-decks.php']='<?php function {';$wrong=$manifest;$wrong['archive-decks.php']['after']=hash('sha256',$bad['archive-decks.php']);$failed=false;try{install($plugin,$root.'/backup-syntax',$wrong,$bad);}catch(\Throwable $e){$failed=true;}ok($failed&&!file_exists($root.'/backup-syntax'),'PHP syntax failure refused before write');
$plugin=fixture('locked');$lock=fopen($plugin.'/.hebleo-shared-release.lock','c');flock($lock,LOCK_EX);$failed=false;try{install($plugin,$root.'/backup-locked',$manifest,$bodies);}catch(\Throwable $e){$failed=true;}flock($lock,LOCK_UN);fclose($lock);ok($failed,'concurrent release lock refused');
echo json_encode(['checks'=>$checks,'passed'=>true])."\n";
