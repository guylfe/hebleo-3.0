<?php
// Disposable synthetic WordPress only. No production records or media.
define('DOING_AJAX',true);
$fixture=$argv[1];$mode=$argv[2];
if($mode==='setup')define('WP_INSTALLING',true);
require $fixture.'/wp/wp-load.php';
add_filter('pre_wp_mail',fn()=>true);
if($mode==='setup'){
 require_once ABSPATH.'wp-admin/includes/upgrade.php';require_once ABSPATH.'wp-admin/includes/plugin.php';
 wp_install('Synthetic ordering fixture','ordering','ordering@example.invalid',false,'','synthetic-only');
 wp_set_current_user(1);$r=activate_plugin('wp-learning-cards/wp-learning-cards.php');if(is_wp_error($r))throw new RuntimeException($r->get_error_message());
 if(function_exists('maybe_add_autoplay_audio_column'))maybe_add_autoplay_audio_column();
 if(function_exists('maybe_add_default_order_column'))maybe_add_default_order_column();
 echo "PASS fresh WordPress/plugin setup\n";exit;
}
wp_set_current_user(1);update_option('timezone_string','Asia/Jerusalem');
add_filter('hebleo_study_scheduler_now',fn()=>1794528000);
$checks=0;function ok($v,$why){global $checks;++$checks;if(!$v)throw new RuntimeException($why);}
global $wpdb;$table=$wpdb->prefix.'flashcard_progress';$settings=$wpdb->prefix.'flashcard_deck_settings';
function snapshot(){global $wpdb;$o=[];foreach($wpdb->get_col('SHOW TABLES')as$t){if($t===$wpdb->options)continue;$o[$t]=hash('sha256',serialize($wpdb->get_results("SELECT * FROM `$t`",ARRAY_A)));}return $o;}
$deck=wp_insert_post(['post_type'=>'decks','post_status'=>'publish','post_title'=>'Synthetic ordered deck']);
$otherDeck=wp_insert_post(['post_type'=>'decks','post_status'=>'publish','post_title'=>'Synthetic other deck']);
$template=wp_insert_post(['post_type'=>'card_templates','post_status'=>'publish','post_title'=>'Synthetic direction']);
$reverse=wp_insert_post(['post_type'=>'card_templates','post_status'=>'publish','post_title'=>'Synthetic reverse']);
foreach([$template,$reverse]as$t){update_post_meta($t,'_front_template','{{Hebrew}}');update_post_meta($t,'_back_template','{{English}}');}
$notes=[];$rows=[];
foreach([46=>'2.1.5',47=>'2.1.5',51=>'2.2.5',52=>'2.4',53=>'2.1.5',60=>'2.1.5',74=>'2.2',87=>'2.3',101=>'2.3.5']as$source=>$lesson){
 $n=wp_insert_post(['post_type'=>'notes','post_status'=>'publish','post_title'=>'Synthetic '.$source]);$notes[$source]=$n;
 update_post_meta($n,'_hebleo_shared_source_id','synthetic-'.$source);
 update_post_meta($n,'_card_field_data',['SourceId'=>'synthetic-'.$source,'Hebrew'=>'Synthetic '.$source,'English'=>'Synthetic fixture','Source'=>'<div class="hc-source">Lessons: '.$lesson.'\\nSource IDs: synthetic-'.$source.'</div>']);
 foreach([$template,$reverse]as$t){assign_card_to_deck($n,$t,$deck);$wpdb->insert($table,['user_id'=>1,'note_id'=>$n,'template_id'=>$t,'deck_id'=>$deck,'state'=>'new','next_review'=>'2020-01-01 00:00:00','created_at'=>'2020-01-01 00:00:00']);$rows[$source][$t]=$wpdb->insert_id;}
}
$wpdb->insert($settings,['user_id'=>1,'deck_id'=>$deck,'new_cards_per_day'=>4,'max_reviews_per_day'=>0,'card_order'=>'new_first']);
add_filter('wp_die_ajax_handler',fn()=>function(){throw new RuntimeException('json-complete');});
function queue($deck,$nonce=true){$_POST=['nonce'=>$nonce?wp_create_nonce('study_nonce'):'wrong','deck_id'=>$deck];ob_start();try{ajax_start_study_session();}catch(RuntimeException$e){if($e->getMessage()!=='json-complete')throw $e;}return json_decode(ob_get_clean(),true);}
$sources=function($r)use($notes){$reverse=array_flip($notes);return array_map(fn($c)=>$reverse[$c['note_id']],$r['data']['cards']??[]);};
$before=snapshot();$q=queue($deck);ok($sources($q)===[46,46,47,47],'real handler earliest group, both directions');ok(snapshot()===$before,'queue read preserves all application tables');
$wpdb->update($table,['state'=>'review','next_review'=>'2030-01-01 00:00:00'],['note_id'=>$notes[46]]);
$wpdb->update($table,['state'=>'review','next_review'=>'2030-01-01 00:00:00'],['note_id'=>$notes[47]]);
$q=queue($deck);ok($sources($q)===[53,53,60,60],'remaining verbs precede future gives before LIMIT');
$wpdb->update($settings,['new_cards_per_day'=>20],['user_id'=>1,'deck_id'=>$deck]);$q=queue($deck);
ok($sources($q)===[53,53,60,60,74,74,51,51,87,87,101,101,52,52],'course sequence across reported transition');
update_post_meta($deck,'_custom_card_order',[$notes[52].'_'.$template,$notes[74].'_'.$reverse]);
$wpdb->update($settings,['new_cards_per_day'=>1],['user_id'=>1,'deck_id'=>$deck]);$q=queue($deck);
ok($sources($q)===[52],'custom selection precedes LIMIT');delete_post_meta($deck,'_custom_card_order');
// All eligibility predicates are still applied before the course-order selector.
$wpdb->update($table,['suspended'=>1],['note_id'=>$notes[53]]);
$wpdb->insert($wpdb->prefix.'flashcard_global_suspensions',['note_id'=>$notes[60],'template_id'=>$template]);
update_user_meta(1,HebleoFollowup\key($notes[60]),wp_slash(json_encode(['schema'=>1,'note_id'=>$notes[60],'allowed_template'=>$template,'expires_utc'=>1794614400])));
$q=queue($deck);ok($sources($q)===[74],'suspension, global suspension and sibling burial before limit');
$wpdb->update($table,['deck_id'=>$otherDeck],['note_id'=>$notes[74]]);$q=queue($deck);ok($sources($q)===[51],'deck isolation');
$wpdb->update($table,['user_id'=>2],['note_id'=>$notes[51]]);$q=queue($deck);ok($sources($q)===[87],'user isolation');
$wpdb->update($settings,['new_cards_per_day'=>0],['user_id'=>1,'deck_id'=>$deck]);ok(queue($deck)['success']===false,'zero new limit');
$wpdb->update($table,['state'=>'review','suspended'=>0,'next_review'=>'2020-01-01 00:00:00'],['id'=>$rows[53][$template]]);
$wpdb->update($settings,['max_reviews_per_day'=>1,'card_order'=>'review_first'],['user_id'=>1,'deck_id'=>$deck]);
$before=snapshot();$q=queue($deck);ok($sources($q)===[53],'review due query and limit retained');ok(snapshot()===$before,'reviews are read only');
$wpdb->update($settings,['new_cards_per_day'=>2,'max_reviews_per_day'=>0,'card_order'=>'mixed'],['user_id'=>1,'deck_id'=>$deck]);
$q=queue($deck);$s=$sources($q);sort($s);ok($s===[87,87],'mixed mode shuffles display after earliest new selection');
$before=snapshot();ok(queue($deck,false)['success']===false,'nonce rejection');wp_set_current_user(0);ok(queue($deck)['success']===false,'anonymous rejection');wp_set_current_user(1);ok(snapshot()===$before,'rejected requests preserve state');
echo json_encode(['checks'=>$checks,'passed'=>true,'wordpress'=>$GLOBALS['wp_version'],'database'=>$wpdb->db_version(),'production_data_used'=>false])."\n";
