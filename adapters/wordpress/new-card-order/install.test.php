<?php
namespace HebleoNewCardOrderRelease;
require __DIR__.'/install.php';
$root=$argv[1];if(file_exists($root))throw new \RuntimeException('Refuse fixture reuse');mkdir($root,0700,true);mkdir($root.'/web');define('ABSPATH',$root.'/web/');
$GLOBALS['wpdb']=null;$metricCalls=0;$changeMetrics=false;
function metrics($db):array{global$metricCalls,$changeMetrics;return ['fixed'=>($changeMetrics&&++$metricCalls>1)?2:1];}
$checks=0;function ok($v,$why){global$checks;++$checks;if(!$v)throw new \RuntimeException($why);}
function fixture($name){global$root;mkdir($root.'/'.$name);mkdir($root.'/'.$name.'/templates');file_put_contents($root.'/'.$name.'/templates/card_loader.php','original');file_put_contents($root.'/'.$name.'/unrelated.php','preserved');return $root.'/'.$name;}
$manifest=['templates/card_loader.php'=>['before'=>hash('sha256','original'),'after'=>hash('sha256','changed')],'new-card-order/order.php'=>['before'=>null,'after'=>hash('sha256','helper')]];
$bodies=['templates/card_loader.php'=>'changed','new-card-order/order.php'=>'helper'];
$plugin=fixture('normal');$r=install($plugin,$root.'/backup-normal',$manifest,$bodies);
ok($r['preserved']===true,'success receipt');ok(file_get_contents($plugin.'/templates/card_loader.php')==='changed','new loader');ok(file_get_contents($plugin.'/new-card-order/order.php')==='helper','helper first');ok(file_get_contents($root.'/backup-normal/card_loader.php')==='original','private backup readback');ok(file_get_contents($plugin.'/unrelated.php')==='preserved','unrelated files preserved');
$plugin=fixture('stale');file_put_contents($plugin.'/templates/card_loader.php','newer external edit');$failed=false;try{install($plugin,$root.'/backup-stale',$manifest,$bodies);}catch(\Throwable$e){$failed=true;}
ok($failed,'stale source refused');ok(file_get_contents($plugin.'/templates/card_loader.php')==='newer external edit','external edit retained');ok(!file_exists($plugin.'/new-card-order/order.php'),'no partial stale install');
$plugin=fixture('payload');$bad=$bodies;$bad['new-card-order/order.php']='bad';$failed=false;try{install($plugin,$root.'/backup-payload',$manifest,$bad);}catch(\Throwable$e){$failed=true;}
ok($failed&&!file_exists($plugin.'/new-card-order/order.php'),'bad hash refused before install');
$plugin=fixture('rollback');$metricCalls=0;$changeMetrics=true;$failed=false;try{install($plugin,$root.'/backup-rollback',$manifest,$bodies);}catch(\Throwable$e){$failed=true;}
ok($failed,'preservation mismatch refused');ok(file_get_contents($plugin.'/templates/card_loader.php')==='original','code rolled back');ok(file_get_contents($plugin.'/unrelated.php')==='preserved','rollback preserves unrelated files');
echo json_encode(['checks'=>$checks,'passed'=>true,'data_restored'=>false])."\n";
