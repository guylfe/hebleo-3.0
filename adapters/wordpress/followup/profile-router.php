<?php
$started=microtime(true);$GLOBALS['fp']=['entered'=>$started];define('DOING_AJAX',true);define('SAVEQUERIES',true);$f=__DIR__;
$path=parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH);if($path==='/setup')define('WP_INSTALLING',true);
require $f.'/wp/wp-load.php';require_once ABSPATH.'wp-admin/includes/plugin.php';wp_set_current_user(1);add_filter('pre_wp_mail',fn()=>true);$GLOBALS['fp']['bootstrap_end']=microtime(true);
function mark_stage($s){$GLOBALS['fp'][$s]=microtime(true);}add_action('ff_profile_stage','mark_stage');
add_filter('wp_die_ajax_handler',fn()=>function(){throw new RuntimeException('PROFILE_JSON');});
if($path==='/setup'){require_once ABSPATH.'wp-admin/includes/upgrade.php';if(!is_blog_installed())wp_install('Synthetic HTTP save profile','fixture','fixture@example.invalid',false,'','disposable-only');wp_set_current_user(1);$v=activate_plugin('wp-learning-cards/wp-learning-cards.php');if(is_wp_error($v))throw new RuntimeException($v->get_error_message());echo json_encode(['setup'=>true]);exit;}
if($path==='/seed'){
 $decks=[];for($i=0;$i<35;$i++)$decks[]=wp_insert_post(['post_type'=>'decks','post_status'=>'publish','post_title'=>'Synthetic profile deck '.$i]);$note=wp_insert_post(['post_type'=>'notes','post_status'=>'publish','post_title'=>'Synthetic profile note']);$template=wp_insert_post(['post_type'=>'card_templates','post_status'=>'publish','post_title'=>'Synthetic profile template']);update_post_meta($note,'_card_field_data',['English'=>'Synthetic profiling fixture']);update_post_meta($template,'_front_template','{{English}}');update_post_meta($template,'_back_template','{{English}}');
 $table=$wpdb->prefix.'flashcard_progress';$wpdb->insert($table,['user_id'=>1,'note_id'=>$note,'template_id'=>$template,'deck_id'=>$decks[0],'state'=>'new']);
 $rows=[];for($i=1;$i<2967;$i++)$rows[]='(1,'.(100000+$i).','.$template.','.$decks[$i%35].",'new')";$wpdb->query("INSERT INTO $table (user_id,note_id,template_id,deck_id,state) VALUES ".implode(',',$rows));
 $cd=$wpdb->prefix.'flashcard_card_decks';$rows=[];for($i=0;$i<2118;$i++)$rows[]='('.($i===0?$note:100000+$i).','.$template.','.$decks[$i%35].')';$wpdb->query("INSERT INTO $cd (note_id,template_id,deck_id) VALUES ".implode(',',$rows));
 foreach($decks as $d)$wpdb->insert($wpdb->prefix.'flashcard_deck_settings',['user_id'=>1,'deck_id'=>$d,'new_cards_per_day'=>20,'max_reviews_per_day'=>200,'card_order'=>'new_first']);update_option('timezone_string','Asia/Jerusalem');file_put_contents($f.'/target.json',json_encode(['note_id'=>$note,'template_id'=>$template]));echo json_encode(['progress'=>(int)$wpdb->get_var("SELECT COUNT(*) FROM $table"),'assignments'=>(int)$wpdb->get_var("SELECT COUNT(*) FROM $cd"),'settings'=>35]);exit;
}
$t=json_decode(file_get_contents($f.'/target.json'),true);$p=$wpdb->get_row($wpdb->prepare("SELECT * FROM {$wpdb->prefix}flashcard_progress WHERE user_id=1 AND note_id=%d AND template_id=%d",$t['note_id'],$t['template_id']));
if($path==='/state'){echo json_encode($t+['nonce'=>wp_create_nonce('study_nonce'),'card'=>prepare_study_card($p)]);exit;}
if($path==='/rate'){
 $GLOBALS['fp']['handler_start']=microtime(true);$_POST['nonce']=wp_create_nonce('study_nonce');ob_start();try{ajax_rate_card();}catch(RuntimeException $e){if($e->getMessage()!=='PROFILE_JSON')throw $e;}$body=json_decode(ob_get_clean(),true);$end=microtime(true);$p=$GLOBALS['fp'];$ms=static fn($a,$b)=>isset($p[$a],$p[$b])?1000*($p[$b]-$p[$a]):null;
 echo json_encode(['response'=>$body,'timing'=>['bootstrap_ms'=>$ms('entered','bootstrap_end'),'handler_ms'=>1000*($end-$p['handler_start']),'lock_ms'=>$ms('lock_start','lock_end'),'scheduler_ms'=>$ms('schedule_start','schedule_end'),'transaction_ms'=>$ms('transaction_start','transaction_end'),'streak_ms'=>$ms('streak_start','streak_end'),'server_total_ms'=>1000*($end-$started),'sql_ms'=>1000*array_sum(array_column($wpdb->queries,1)),'query_count'=>count($wpdb->queries)]]);exit;
}
http_response_code(404);
