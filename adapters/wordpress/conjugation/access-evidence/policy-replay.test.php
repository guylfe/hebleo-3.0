<?php
// Replay exact captured live gate source with isolated API doubles.
// No WordPress bootstrap, live account, network or database is used.
$e=json_decode(file_get_contents(__DIR__.'/live-policy.json'),true,512,JSON_THROW_ON_ERROR);
$uid=0;$nonce=true;$enrolled=false;$group=false;$bypass=false;$expired=false;
function get_current_user_id(){global $uid;return $uid;}
function wp_verify_nonce($n,$action){global $nonce;return $nonce;}
function wp_send_json_error($message){throw new RuntimeException($message);}
function learndash_get_course_id($id){return 25283;}
function get_post_status($id){return 'publish';}
function learndash_can_user_autoenroll_courses($id){global $bypass;return $bypass;}
function learndash_is_sample($id){return false;}
function learndash_get_setting($id){global $e;return $e['course']['settings'];}
function learndash_use_legacy_course_access_list(){return false;}
function get_user_meta(...$args){global $enrolled;return $enrolled?1:'';}
function learndash_user_group_enrolled_to_course(...$args){global $group;return $group;}
function ld_course_access_expired(...$args){global $expired;return $expired;}
class Product {static function find($id){return null;}}
function check($condition,$message){if(!$condition)throw new RuntimeException($message);echo "PASS $message\n";}
eval($e['course']['functions']['sfwd_lms_has_access_fn']['source']);
check(!sfwd_lms_has_access_fn(25283,0),'captured course source denies anonymous');
$uid=7;
check(!sfwd_lms_has_access_fn(25283,7),'captured course source denies unenrolled signed-in double');
$enrolled=true;
check(sfwd_lms_has_access_fn(25283,7),'captured course source allows enrolled double');
$enrolled=false;$group=true;
check(sfwd_lms_has_access_fn(25283,7),'captured course source allows group-enrolled double');
$group=false;$bypass=true;
check(sfwd_lms_has_access_fn(25283,7),'captured course source allows administrative bypass double');
$bypass=false;
foreach(['decks','start'] as $which){
 $s=$e['flashcards']['handlers'][$which]['source'];
 $prefix=explode('global $wpdb;', $s)[0];
 check(str_contains($prefix,'get_current_user_id()'),'actual study prefix captured');
 // Stop immediately after authorization, before any query or initialization.
 eval($prefix."throw new RuntimeException('REACHED_STATE_BOUNDARY'); }");
 $fn=$which==='decks'?'ajax_get_study_decks':'ajax_start_study_session';
 $_POST=['nonce'=>'isolated','deck_id'=>49480];$uid=0;$nonce=true;
 try{$fn();}catch(RuntimeException $ex){check(str_contains($ex->getMessage(),'log in'),"$which denies anonymous");}
 $uid=7;$nonce=false;
 try{$fn();}catch(RuntimeException $ex){check($ex->getMessage()==='Security check failed',"$which denies invalid nonce");}
 $nonce=true;
 try{$fn();}catch(RuntimeException $ex){check($ex->getMessage()==='REACHED_STATE_BOUNDARY',"$which accepts signed-in unenrolled double at gate");}
}

