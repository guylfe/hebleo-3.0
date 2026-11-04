<?php
// Disposable profiling only; never generated or deployed.
$GLOBALS['fp']=['entered'=>$_SERVER['REQUEST_TIME_FLOAT']];
add_action('ff_profile_stage',function($s){$GLOBALS['fp'][$s]=microtime(true);});
add_action('admin_init',function(){$GLOBALS['fp']['admin_init']=true;},PHP_INT_MAX);
function ff_start(){ $GLOBALS['fp']['bootstrap_end']=microtime(true);$GLOBALS['fp']['handler_start']=microtime(true); }
add_action('wp_loaded',function(){if(($_GET['hebleo_review']??'')==='1')ff_start();},PHP_INT_MAX-1);
add_action('wp_ajax_rate_card','ff_start',0);
add_action('shutdown',function(){if(!isset($GLOBALS['fp']['handler_start']))return;global $wpdb;$p=$GLOBALS['fp'];$end=microtime(true);$ms=static fn($a,$b)=>isset($p[$a],$p[$b])?1000*($p[$b]-$p[$a]):null;
file_put_contents(dirname(__DIR__,3).'/last-timing.json',json_encode(['bootstrap_ms'=>$ms('entered','bootstrap_end'),'handler_ms'=>1000*($end-$p['handler_start']),'lock_ms'=>$ms('lock_start','lock_end'),'scheduler_ms'=>$ms('schedule_start','schedule_end'),'transaction_ms'=>$ms('transaction_start','transaction_end'),'streak_ms'=>$ms('streak_start','streak_end'),'server_total_ms'=>1000*($end-$p['entered']),'sql_ms'=>1000*array_sum(array_column($wpdb->queries,1)),'query_count'=>count($wpdb->queries),'admin_init'=>!empty($p['admin_init'])]));},PHP_INT_MAX);

