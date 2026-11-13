<?php
namespace HebleoNewCardOrderRelease;
/** Independent fresh-request readback. Only aggregate hashes and source IDs leave site. */
function verify(string $backup): array {
    global $wpdb;
    $saved=json_decode(file_get_contents($backup.'/installed.json'),true,512,JSON_THROW_ON_ERROR);
    $root=WP_PLUGIN_DIR.'/wp-learning-cards';$hashes=[];
    foreach($saved['manifest']as$rel=>$hash){$actual=hash_file('sha256',$root.'/'.$rel);if($actual!==$hash['after'])throw new \RuntimeException('Destination hash differs');$hashes[$rel]=$actual;}
    require_once $root.'/new-card-order/order.php';
    $day=\HebleoFollowup\sql(time());$users=$wpdb->get_col("SELECT DISTINCT user_id FROM {$wpdb->prefix}flashcard_progress WHERE deck_id=49480");
    $summary=['accounts_checked'=>0,'eligible_new_cards'=>0,'old_adjacent_lesson_inversions'=>0,'new_adjacent_lesson_inversions'=>0,'unmapped_eligible_cards'=>0];
    $codeFor=static function($p){$raw=\get_post_meta($p->note_id,'_card_field_data',true);return is_array($raw)?\HebleoNewCardOrder\lesson($raw,(string)\get_post_meta($p->note_id,'_hebleo_shared_source_id',true)):null;};
    $inversions=static function($pool)use($codeFor){$previous=null;$n=0;foreach($pool as$p){$code=$codeFor($p);if($code!==null){if($previous!==null&&version_compare($previous,$code)>0)++$n;$previous=$code;}}return $n;};
    foreach($users as$user){
        $pool=$wpdb->get_results($wpdb->prepare("SELECT p.* FROM {$wpdb->prefix}flashcard_progress p {$day['join']} WHERE p.user_id=%d AND p.deck_id=49480 AND p.state='new' AND p.suspended=0 AND {$day['where']} AND NOT EXISTS (SELECT 1 FROM {$wpdb->prefix}flashcard_global_suspensions gs WHERE gs.note_id=p.note_id AND gs.template_id=p.template_id) ORDER BY p.created_at ASC,p.id ASC",$user));
        $ordered=\HebleoNewCardOrder\wordpress($pool,\get_post_meta(49480,'_custom_card_order',true),count($pool));
        ++$summary['accounts_checked'];$summary['eligible_new_cards']+=count($pool);
        $summary['old_adjacent_lesson_inversions']+=$inversions($pool);$summary['new_adjacent_lesson_inversions']+=$inversions($ordered);
        foreach($pool as$p)if($codeFor($p)===null)++$summary['unmapped_eligible_cards'];
    }
    $catalog=$wpdb->get_results("SELECT note_id,template_id FROM {$wpdb->prefix}flashcard_card_decks WHERE deck_id=49480 AND note_id BETWEEN 48500 AND 48581 ORDER BY note_id,template_id");
    $sourceIds=static function($cards){$ids=[];foreach($cards as$p){$id=\get_post_meta($p->note_id,'_hebleo_shared_source_id',true);if(!in_array($id,$ids,true))$ids[]=$id;}return $ids;};
    $beforeCatalog=$sourceIds($catalog);$afterCatalog=$sourceIds(\HebleoNewCardOrder\wordpress($catalog,[],count($catalog)));
    // Exercise the installed native handler as this authenticated administrator; never rate/init.
    $handler=['authenticated'=>(bool)\get_current_user_id()];
    if($handler['authenticated']){
        // wp_send_json otherwise calls die directly in a REST request, bypassing wp_die.
        if(!defined('DOING_AJAX'))define('DOING_AJAX',true);
        $oldPost=$_POST;$die=static function(){return static function(){throw new \RuntimeException('ordering-readback-json');};};
        \add_filter('wp_die_ajax_handler',$die);\add_filter('wp_die_handler',$die);
        $_POST=['nonce'=>\wp_create_nonce('study_nonce'),'deck_id'=>49480];
        ob_start();try{\ajax_start_study_session();}catch(\RuntimeException$e){if($e->getMessage()!=='ordering-readback-json'){ob_end_clean();throw$e;}}
        $r=json_decode(ob_get_clean(),true);$_POST=$oldPost;\remove_filter('wp_die_ajax_handler',$die);\remove_filter('wp_die_handler',$die);
        $handler['success']=$r['success']??null;$handler['card_count']=count($r['data']['cards']??[]);
        $handler['first_note_ids']=array_map(static fn($c)=>(int)$c['note_id'],array_slice($r['data']['cards']??[],0,8));
    }
    $current=metrics($wpdb);$preserved=$saved['protected_before']===$current;$changes=[];
    foreach($current as$group=>$value)if($saved['protected_before'][$group]!==$value)$changes[$group]=['before'=>$saved['protected_before'][$group],'after'=>$value];
    // A site cache purge can remove Elementor's generated post metadata. Report
    // the full mismatch instead of treating that hash as exact preservation.
    $corePreserved=!array_diff(array_keys($changes),['authored_meta']);
    if(!$corePreserved)throw new \RuntimeException('Learner/content/file fingerprints differ from installation');
    $shared=(new \HebleoShared\WordPressStore($wpdb))->read();$rawChecked=0;$rawDifferences=0;
    foreach($shared['map']??[]as$source=>$mapping){++$rawChecked;if(\get_post_meta($mapping['note_id'],'_card_field_data',true)!==($shared['notes'][$source]['raw']??null))++$rawDifferences;}
    if($rawDifferences)throw new \RuntimeException('Native raw fields differ from unchanged imported state');
    $rawReadback=['notes_checked'=>$rawChecked,'differences_from_unchanged_import'=>$rawDifferences];
    return ['destination_hashes'=>$hashes,'all_fingerprints_identical'=>$preserved,'learner_content_media_files_preserved'=>$corePreserved,'fingerprint_changes'=>$changes,'native_raw_readback'=>$rawReadback,'protected_current'=>$current,'live_eligibility'=>$summary,'catalog_transition'=>['before'=>array_slice($beforeCatalog,0,30),'after'=>array_slice($afterCatalog,0,40),'note'=>'Catalog ordering only; includes cards already introduced for some learners.'],'installed_native_handler'=>$handler,'backup_sha256'=>hash_file('sha256',$backup.'/card_loader.php'),'time_utc'=>gmdate('c')];
}
