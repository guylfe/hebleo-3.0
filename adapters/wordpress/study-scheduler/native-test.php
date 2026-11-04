<?php
// Synthetic disposable data only; actual WordPress + complete baseline plugin.
define('DOING_AJAX',true);
$fixture=$argv[1];$mode=$argv[2]??'test';
if($mode==='setup')define('WP_INSTALLING',true);
require $fixture.'/wp/wp-load.php';require_once ABSPATH.'wp-admin/includes/plugin.php';
add_filter('pre_wp_mail',fn()=>true);
if($mode==='setup') {
 require_once ABSPATH.'wp-admin/includes/upgrade.php';
 if(!is_blog_installed())wp_install('Synthetic scheduler fixture','scheduler','fixture@example.invalid',false,'','disposable-only');
 wp_set_current_user(1);$r=activate_plugin('wp-learning-cards/wp-learning-cards.php');
 if(is_wp_error($r))throw new RuntimeException($r->get_error_message());
 echo 'PASS full plugin activation '.WP_LEARNING_CARDS_VERSION.' WordPress '.$GLOBALS['wp_version'].' MariaDB '.$wpdb->db_version()."\n";exit;
}
wp_set_current_user(1);
if(!function_exists('prepare_study_card')||!function_exists('ajax_rate_card'))throw new RuntimeException('Native handlers absent');
$count=0;function ok($v,$s){global $count;if(!$v)throw new RuntimeException($s);$count++;}
$table=$wpdb->prefix.'flashcard_progress';
$tables=[$table,$wpdb->posts,$wpdb->postmeta,$wpdb->prefix.'flashcard_card_decks',$wpdb->prefix.'flashcard_deck_settings'];
function snapshot(){global $wpdb,$tables;$r=[];foreach($tables as $t)$r[$t]=$wpdb->get_results("SELECT * FROM $t ORDER BY 1",ARRAY_A);return $r;}
if($mode==='reopen'){
 $expect=json_decode(file_get_contents($fixture.'/reopen.json'),true,512,JSON_THROW_ON_ERROR);
 foreach($expect as $item){$p=$wpdb->get_row($wpdb->prepare("SELECT * FROM $table WHERE id=%d",$item['id']));ok((array)$p===$item['row'],'reopen native row exact');ok(\HebleoStudy\read_meta($p)===$item['meta'],'reopen per-card step metadata');$now=$item['next_now'];$new=\HebleoStudy\schedule($p,3,$now);ok($new===$item['next_result'],'reopen next rating schedule exact '.json_encode(['actual'=>$new,'expected'=>$item['next_result']]));}
 echo json_encode(['reopen_checks'=>$count,'separate_process'=>true])."\n";exit;
}
$now=strtotime('2026-11-04T00:30:00Z');add_filter('hebleo_study_scheduler_now',function()use(&$now){return $now;});
update_option('timezone_string','Asia/Jerusalem');date_default_timezone_set('Pacific/Honolulu');
$deck=wp_insert_post(['post_type'=>'decks','post_status'=>'publish','post_title'=>'Synthetic scheduler fixture']);
$nid=wp_insert_post(['post_type'=>'notes','post_status'=>'publish','post_title'=>'Synthetic test note']);
$tid=wp_insert_post(['post_type'=>'card_templates','post_status'=>'publish','post_title'=>'Synthetic forward']);
$reverse=wp_insert_post(['post_type'=>'card_templates','post_status'=>'publish','post_title'=>'Synthetic reverse']);
$raw=['Hebrew'=>'×‘×“×™×§×”','English'=>'Synthetic fixture','Forms'=>'Synthetic supporting text'];
update_post_meta($nid,'_card_field_data',$raw);update_post_meta($tid,'_front_template','{{Hebrew}}');update_post_meta($tid,'_back_template','{{English}}');
update_post_meta($reverse,'_front_template','{{English}}');update_post_meta($reverse,'_back_template','{{Hebrew}}');
foreach([$tid,$reverse] as $t)assign_card_to_deck($nid,$t,$deck);
function seed($note,$template,$state,$s=2.3065,$d=5.5,$last=null){global $wpdb,$table,$deck,$now;$wpdb->insert($table,['user_id'=>1,'note_id'=>$note,'template_id'=>$template,'deck_id'=>$deck,'stability'=>$s,'difficulty'=>$d,'elapsed_days'=>999,'scheduled_days'=>123,'reps'=>7,'lapses'=>2,'state'=>$state,'last_reviewed'=>$last,'next_review'=>'2030-01-02 03:04:05']);return $wpdb->get_row($wpdb->prepare("SELECT * FROM $table WHERE id=%d",$wpdb->insert_id));}
// Permanently untouched synthetic old row (including legacy invalid memory).
$oldnote=wp_insert_post(['post_type'=>'notes','post_status'=>'draft','post_title'=>'Untouched old synthetic record']);
$old=seed($oldnote,$reverse,'review',-237.8219,5,'2026-10-01 00:00:00');$oldbytes=(array)$old;
$metaBefore=$wpdb->get_results("SELECT * FROM {$wpdb->usermeta} ORDER BY umeta_id",ARRAY_A);
$oldpreview=prepare_study_card($old);ok((array)$wpdb->get_row($wpdb->prepare("SELECT * FROM $table WHERE id=%d",$old->id))===$oldbytes,'invalid preview does not rewrite due/memory');ok($wpdb->get_results("SELECT * FROM {$wpdb->usermeta} ORDER BY umeta_id",ARRAY_A)===$metaBefore,'preview creates no metadata');
$die=fn()=>function(){throw new RuntimeException('native-json-complete');};add_filter('wp_die_ajax_handler',$die);
$reopen=[];
foreach(['new','learning','review','relearning'] as $state)foreach([1,2,3,4] as $grade){
 $note=wp_insert_post(['post_type'=>'notes','post_status'=>'publish','post_title'=>'Synthetic '.$state.' '.$grade]);update_post_meta($note,'_card_field_data',$raw);
 $last=$state==='new'?null:\HebleoStudy\local_date($now-3*86400,wp_timezone());
 $p=seed($note,$tid,$state,2.3065,5.5,$last);
 $before=snapshot();$meta=$wpdb->get_results("SELECT * FROM {$wpdb->usermeta} ORDER BY umeta_id",ARRAY_A);
 $card=prepare_study_card($p);ok(snapshot()===$before,'native preview preserves all old tables');ok($wpdb->get_results("SELECT * FROM {$wpdb->usermeta} ORDER BY umeta_id",ARRAY_A)===$meta,'native preview remains read-only');
 ok(count($card['intervals'])===4&&count($card['schedule_previews'])===4,'four real native previews');
 $name=['again','hard','good','easy'][$grade-1];$expected=\HebleoStudy\schedule($p,$grade,$now);
 ok($card['schedule_previews'][$name]['due_utc']===$expected['due'],'native preview uses shared scheduler');
 $_POST=['nonce'=>wp_create_nonce('study_nonce'),'note_id'=>$note,'template_id'=>$tid,'rating'=>$grade];ob_start();try{ajax_rate_card();}catch(RuntimeException $e){ok($e->getMessage()==='native-json-complete','native handler completed');}$response=json_decode(ob_get_clean(),true);ok(($response['success']??false)===true,'native AJAX rating success');
 $saved=$wpdb->get_row($wpdb->prepare("SELECT * FROM $table WHERE id=%d",$p->id));
 foreach(['state','next_review','last_reviewed'] as $key)ok($saved->$key===$expected[$key],'native persisted '.$key.' agrees with preview');
 foreach(['scheduled_days','elapsed_days','reps','lapses'] as $key)ok((int)$saved->$key===$expected[$key],'native persisted '.$key);
 foreach(['stability','difficulty'] as $key)ok(abs((float)$saved->$key-$expected[$key])<=.000051,'native decimal storage '.$key);
 ok($saved->note_id===$p->note_id&&$saved->template_id===$p->template_id&&$saved->deck_id===$p->deck_id,'stable native IDs');
 $after=snapshot();foreach($before as $t=>$rows){$filtered=$after[$t];if($t===$table){$rows=array_values(array_filter($rows,fn($x)=>$x['id']!==$p->id));$filtered=array_values(array_filter($filtered,fn($x)=>$x['id']!==$p->id));}ok($rows===$filtered,'only rated progress row changes, never content/assignments/settings');}
 ok(get_post_meta($note,'_card_field_data',true)===$raw,'raw authored fields untouched');
 $m=\HebleoStudy\read_meta($saved);ok($m['step']===$expected['step'],'learning step stored');
 $nextNow=$expected['due'];$reopen[]=['id'=>$saved->id,'row'=>(array)$saved,'meta'=>$m,'next_now'=>$nextNow,'next_result'=>\HebleoStudy\schedule($saved,3,$nextNow)];
}
// Preserve every old row until rating: deliberate invalid state repair stays card-local.
$legacy=seed(wp_insert_post(['post_type'=>'notes','post_status'=>'draft','post_title'=>'Synthetic invalid']),$tid,'review',-237.8219,5,'2026-10-01 00:00:00');
$s=\HebleoStudy\persist_rating(1,(int)$legacy->note_id,(int)$tid,3,fn()=>$now);ok($s['state']==='learning'&&$s['interval_seconds']===600&&$s['stability']===2.3065,'invalid legacy row lazy fresh learning repair on actual rating');
// Actual SQL storage range boundary must retain full upstream memory.
$large=seed(wp_insert_post(['post_type'=>'notes','post_status'=>'draft','post_title'=>'Synthetic large stability']),$tid,'review',999999.9999,1.5,'1900-01-01 00:00:00');
$largeResult=\HebleoStudy\persist_rating(1,(int)$large->note_id,(int)$tid,4,fn()=>$now);
$largeSaved=$wpdb->get_row($wpdb->prepare("SELECT * FROM $table WHERE id=%d",$large->id));$largeMeta=\HebleoStudy\read_meta($largeSaved);
ok($largeResult['stability']>999999.9999&&$largeMeta['stability']===$largeResult['stability'],'large exact memory kept outside native decimal limit');
ok((float)$largeSaved->stability===999999.9999,'native compatibility shadow fits decimal');
$norm=\HebleoStudy\normalize((array)$largeSaved,$largeMeta,$now+86400,wp_timezone());ok($norm['stability']===$largeResult['stability'],'large memory restored for next rating');
$reopen[]=['id'=>$largeSaved->id,'row'=>(array)$largeSaved,'meta'=>$largeMeta,'next_now'=>$now+86400,'next_result'=>\HebleoStudy\schedule($largeSaved,3,$now+86400)];
// Failing metadata write rolls back progress and never reports a successful review.
$failure=$wpdb->get_row($wpdb->prepare("SELECT * FROM $table WHERE id=%d",$legacy->id));$failureBefore=(array)$failure;$metaBefore=\HebleoStudy\read_meta($failure);$rawCachedBefore=get_user_meta(1,\HebleoStudy\meta_key($failure),true);
$fault=fn($q)=>str_contains($q,'UPDATE')&&str_contains($q,$wpdb->usermeta)?'UPDATE deliberately_absent_scheduler_fixture SET missing=1':$q;
$wpdb->suppress_errors(true);add_filter('query',$fault);$rejected=false;try{\HebleoStudy\persist_rating(1,(int)$failure->note_id,(int)$tid,4,fn()=>$now+600);}catch(Throwable $e){$rejected=true;}remove_filter('query',$fault);$wpdb->suppress_errors(false);
ok($rejected,'metadata SQL fault refused');ok((array)$wpdb->get_row($wpdb->prepare("SELECT * FROM $table WHERE id=%d",$failure->id))===$failureBefore,'metadata failure rolls back progress');ok(\HebleoStudy\read_meta($failure)===$metaBefore,'metadata rollback clears cache');ok(get_user_meta(1,\HebleoStudy\meta_key($failure),true)===$rawCachedBefore,'raw WordPress cached JSON restored after SQL rollback');
// Native local dates vs actual UTC elapsed, including the repeated fall-back hour.
foreach(['Asia/Jerusalem','America/New_York','UTC'] as $zone){update_option('timezone_string',$zone);foreach(['2026-10-24T22:30:00Z','2026-10-24T23:30:00Z','2026-03-27T00:30:00Z'] as $instant){
 $at=strtotime($instant);$p=(object)['id'=>999,'user_id'=>1,'state'=>'learning','stability'=>'2.3065','difficulty'=>'5.5','last_reviewed'=>\HebleoStudy\local_date($at,wp_timezone()),'reps'=>1,'lapses'=>0];$m=['version'=>\HebleoStudy\FSRS::VERSION,'step'=>1,'last_review_utc'=>$at,'last_review_local'=>$p->last_reviewed];$s=\HebleoStudy\schedule($p,3,$at+86400,$m);ok($s['elapsed_days']===1,'UTC 24-hour elapsed across timezone/DST');ok($s['state']==='review','persisted step 1 survives DST');ok($s['last_reviewed']===\HebleoStudy\local_date($at+86400,wp_timezone()),'WordPress-local DB dates');
 $s=\HebleoStudy\schedule($p,1,$at+23*3600,$m);ok($s['elapsed_days']===0,'23-hour local day does not become elapsed whole UTC day');}}
update_option('timezone_string','Asia/Jerusalem');
ok((array)$wpdb->get_row($wpdb->prepare("SELECT * FROM $table WHERE id=%d",$old->id))===$oldbytes,'untouched old due and invalid memory remain byte exact');
file_put_contents($fixture.'/reopen.json',json_encode($reopen,JSON_THROW_ON_ERROR|JSON_PRESERVE_ZERO_FRACTION));
file_put_contents($fixture.'/native-results.json',json_encode(['native_checks'=>$count,'wordpress'=>$GLOBALS['wp_version'],'mariadb'=>$wpdb->db_version(),'original_plugin'=>WP_LEARNING_CARDS_VERSION,'old_row_exact'=>true,'production_data_used'=>false],JSON_PRETTY_PRINT));
echo file_get_contents($fixture.'/native-results.json')."\n";
