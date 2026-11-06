<?php
// Actual generated WordPress handler, real nonce functions and MariaDB storage.
// Each process owns new synthetic rows; shutdown records the state after wp_die.
define('DOING_AJAX',true);require $argv[1].'/wp/wp-load.php';wp_set_current_user(1);
$case=$argv[2];$ms=1793926200000;add_filter('hebleo_background_now_ms',function()use(&$ms){return $ms;});
$table=$wpdb->prefix.'flashcard_progress';
$note=wp_insert_post(['post_type'=>'notes','post_status'=>'publish','post_title'=>'Synthetic protocol '.$case]);
$template=wp_insert_post(['post_type'=>'card_templates','post_status'=>'publish','post_title'=>'Synthetic protocol '.$case]);
$deck=wp_insert_post(['post_type'=>'decks','post_status'=>'publish','post_title'=>'Synthetic protocol '.$case]);
$wpdb->insert($table,['user_id'=>1,'note_id'=>$note,'template_id'=>$template,'deck_id'=>$deck,'state'=>'new','next_review'=>'2020-01-01 00:00:00']);$rowId=(int)$wpdb->insert_id;
$tick=wp_nonce_tick('study_nonce');$old=substr(wp_hash(($tick-1).'|study_nonce|1|'.wp_get_session_token(),'nonce'),-12,10);$fresh=wp_create_nonce('study_nonce');
if(wp_verify_nonce($old,'study_nonce')!==2||wp_verify_nonce($fresh,'study_nonce')!==1)throw new RuntimeException('Real nonce rollover precondition failed');
$_POST=['nonce'=>$old];$anchor=\HebleoBackground\issue(1,[$note.':'.$template])['anchors'][0];
$i=['protocolVersion'=>1,'siteId'=>\HebleoBackground\site(),'ownerId'=>'1','requestId'=>wp_generate_uuid4(),'cardId'=>$note.':'.$template,'siblingGroupId'=>(string)$note,'expectedVersion'=>$anchor['expectedVersion'],'rating'=>3,'clockTicketId'=>$anchor['clockTicketId'],'elapsedMs'=>1234];
$ms+=10000;$_POST=['nonce'=>$fresh];$new=\HebleoBackground\issue(1,[$i['cardId']])['anchors'][0];
if($anchor!==$new)throw new RuntimeException('Nonce refresh changed original anchor');
// Existing persisted tickets with nonceHash remain valid without rewriting intent.
if($case==='legacy-rollover'){$t=\HebleoBackground\load(1,'ticket',$i['clockTicketId']);$t['nonceHash']=hash('sha256',$old);\HebleoBackground\put(1,'ticket',$i['clockTicketId'],$t);}
if($case==='at-now')$i['elapsedMs']=10000;
if(str_starts_with($case,'future-'))$i['elapsedMs']=10000+(int)substr($case,7);
$nonce=$case==='invalid-nonce'?'not-valid':$fresh;
if($case==='wrong-owner'){wp_set_current_user(wp_create_user('bg-other-'.wp_generate_uuid4(),'synthetic-only',''));$nonce=wp_create_nonce('study_nonce');}
if($case==='wrong-site')$i['siteId']='https://other.invalid';
if($case==='retry-rollover'){
 $_POST=['nonce'=>$old];\HebleoStudy\persist_rating(1,$note,$template,3,null,['id'=>$i['requestId'],'version'=>$i['expectedVersion'],'background'=>$i]);
 $ms=$anchor['expiresAt']+1; // Same durable payload after expiry and a new transport nonce.
}
$_GET=['hebleo_review'=>'1'];$_SERVER['REQUEST_METHOD']='POST';$_SERVER['HTTP_ORIGIN']=$case==='cross-origin'?'https://other.invalid':\HebleoBackground\site();
$_POST=['action'=>'hebleo_bg_save','nonce'=>$nonce,'intent'=>wp_slash(wp_json_encode($i))];$_SERVER['CONTENT_LENGTH']=(string)strlen(http_build_query($_POST));
$before=$wpdb->get_row($wpdb->prepare("SELECT * FROM $table WHERE id=%d",$rowId),ARRAY_A);
register_shutdown_function(function()use($argv,$case,$table,$rowId,$before,$i,$old,$fresh,$anchor){global $wpdb;
 wp_cache_delete(1,'user_meta');$after=$wpdb->get_row($wpdb->prepare("SELECT * FROM $table WHERE id=%d",$rowId),ARRAY_A);$receipt=\HebleoBackground\receipt(1,$i);
 file_put_contents($argv[1].'/transport-'.$case.'.json',wp_json_encode(['case'=>$case,'oldNonceValid'=>wp_verify_nonce($old,'study_nonce'),'freshNonceValid'=>wp_verify_nonce($fresh,'study_nonce'),'unchanged'=>$before===$after,'reps'=>(int)$after['reps'],'receipt'=>$receipt,'requestId'=>$i['requestId'],'intentHash'=>\HebleoBackground\hash_intent($i),'capturedAnswer'=>$anchor['issuedAt']+$i['elapsedMs'],'lastReviewMs'=>\HebleoStudy\read_meta((object)$after)['last_review_ms']??null],JSON_PRETTY_PRINT));
});
\HebleoBackground\dispatch();throw new RuntimeException('Handler did not terminate');
