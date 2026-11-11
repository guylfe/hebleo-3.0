<?php
namespace HebleoShared;
// Rendering corrections only. Raw source, note IDs and learner state are untouched.
function feedback_document(string $doc,string $source):string {
 $map=json_decode('{"mf-000014":{"pointed":"אַתְ","english":"You (singular female)","url":"https://hebleo.com/wp-content/uploads/2025/10/at.mp3"},"mf-000015":{"pointed":"אַתָּה","english":"You (singular male)","url":"https://hebleo.com/wp-content/uploads/2025/10/ata.mp3"},"mf-000016":{"pointed":"אַתֶּם","english":"You (plural)","url":"https://hebleo.com/wp-content/uploads/2025/10/atem.mp3"},"mf-000017":{"pointed":"אַתֶּן","english":"You (plural, only female)","url":"https://hebleo.com/wp-content/uploads/2025/10/aten.mp3"}}',true);
 if(isset($map[$source])){$m=$map[$source];
  if(str_contains($doc,$m['pointed'])&&str_contains($doc,$m['english'])){
   $button='<button class="hc-play" type="button" data-audio="'.htmlspecialchars($m['url'],ENT_QUOTES,'UTF-8').'" aria-label="Replay base audio" aria-pressed="false"><svg class="playImage" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="29"></circle><path d="M56.502,32.301l-37.502,20.101l0.329,-40.804l37.173,20.703Z"></path></svg></button>';
   $doc=str_replace('<div class="hc-audio"></div>','<div class="hc-audio">'.$button.'</div>',$doc);
  }
 }
 if($source==='mf-000035'&&str_contains($doc,'Garden')&&str_contains($doc,'גן'))$doc=str_replace('This is the word for a single male fish.','This is the word for a garden.',$doc);
 return $doc;
}
function feedback_activity():void {
 if(!is_user_logged_in())wp_send_json_error('Sign in required',403);
 check_ajax_referer('study_nonce','nonce');
 global $wpdb;$today=current_datetime()->setTime(12,0);$start=$today->modify('-364 days')->format('Y-m-d');
 $table=$wpdb->prefix.'flashcard_streaks';
 $rows=$wpdb->get_results($wpdb->prepare("SELECT study_date,SUM(cards_studied) AS n FROM $table WHERE user_id=%d AND study_date BETWEEN %s AND %s GROUP BY study_date",get_current_user_id(),$start,$today->format('Y-m-d')),ARRAY_A);
 if($wpdb->last_error)wp_send_json_error('Review activity unavailable',500);
 $counts=[];foreach($rows as$r)$counts[$r['study_date']]=max(0,(int)$r['n']);
 wp_send_json_success(['today'=>$today->format('Y-m-d'),'counts'=>$counts]);
}
if(function_exists('add_action')){
 add_action('wp_ajax_hebleo_review_activity',__NAMESPACE__.'\\feedback_activity');
 add_action('wp_enqueue_scripts',function(){if(!is_post_type_archive('decks'))return;wp_enqueue_script('hebleo-review-heatmap',plugins_url('feedback-heatmap.js',__FILE__),[],hash_file('sha256',__DIR__.'/feedback-heatmap.js'),true);wp_enqueue_script('hebleo-flashcard-feedback',plugins_url('feedback-client.js',__FILE__),['hebleo-shared-frame','hebleo-review-heatmap'],hash_file('sha256',__DIR__.'/feedback-client.js'),true);});
}

