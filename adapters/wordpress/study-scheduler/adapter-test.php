<?php
// Pure adapter fixture only: ignore hook registration; native suites use real WordPress.
if(!function_exists('add_action')){function add_action(...$args){}}
require __DIR__.'/wordpress.php';
use function HebleoStudy\{normalize,local_date};
use HebleoStudy\FSRS;
$n=0;function check($ok,$why){global $n;if(!$ok)throw new RuntimeException($why);$n++;}
$now=strtotime('2026-11-04T00:30:00Z');$tz=new DateTimeZone('Asia/Jerusalem');
$base=['state'=>'review','stability'=>'2.3065','difficulty'=>'5.5000','last_reviewed'=>local_date($now-86400,$tz)];
foreach(['new','corrupt'] as $state){$row=$base;$row['state']=$state;$copy=$row;$c=normalize($row,[],$now,$tz);check($row===$copy&&$c['stability']===null&&$c['step']===0,'fresh mapping stays read-only');}
foreach([0,-237.8,'NAN','INF',null] as $s){$row=$base;$row['stability']=$s;$c=normalize($row,[],$now,$tz);check($c['state']==='learning'&&$c['stability']===null,'invalid memory restarts only pending rating');}
foreach([null,'0000-00-00 00:00:00','bad-date','2026-02-30 01:00:00',local_date($now+100,$tz)] as $last){$row=$base;$row['last_reviewed']=$last;check(normalize($row,[],$now,$tz)['last_review']===null,'missing/bad/future review deliberately fresh');}
foreach(['Asia/Jerusalem','America/New_York','UTC'] as $zone){$tz=new DateTimeZone($zone);foreach(['2026-10-24T22:30:00Z','2026-10-24T23:30:00Z','2026-11-01T05:30:00Z','2026-11-01T06:30:00Z','2026-03-27T00:30:00Z','2026-03-08T06:30:00Z'] as $iso){$at=strtotime($iso);$row=$base;$row['state']='learning';$row['last_reviewed']=local_date($at,$tz);$meta=['version'=>FSRS::VERSION,'step'=>1,'last_review_utc'=>$at,'last_review_local'=>$row['last_reviewed']];$c=normalize($row,$meta,$at+3600,$tz);check($c['last_review']===$at&&$c['step']===1,'exact UTC fold/step resolution');foreach([23*3600,86400,25*3600] as $elapsed){$result=FSRS::review($c,3,$at+$elapsed);check($result['elapsed_days']===(int)floor($elapsed/86400),'DST actual elapsed reference semantics');}}}
// Precision and range survive reopen; external row changes invalidate exact memory.
$tz=new DateTimeZone('UTC');$row=['state'=>'review','stability'=>'999999.9999','difficulty'=>'5.5000','last_reviewed'=>local_date($now-86400,$tz)];$m=['version'=>FSRS::VERSION,'step'=>null,'last_review_utc'=>$now-86400,'last_review_local'=>$row['last_reviewed'],'state'=>'review','stability'=>1234567.891234,'difficulty'=>5.5000123456,'storage_stability'=>999999.9999,'storage_difficulty'=>5.5];$c=normalize($row,$m,$now,$tz);check($c['stability']===$m['stability']&&$c['difficulty']===$m['difficulty'],'exact memory preserved beyond native decimal range');$row['stability']='10.0000';check(normalize($row,$m,$now,$tz)['stability']===10.,'external native edit invalidates stale exact memory');
echo json_encode(['adapter_checks'=>$n,'timezone_DST_legacy_precision'=>true])."\n";
