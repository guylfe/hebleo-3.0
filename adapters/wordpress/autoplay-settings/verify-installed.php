<?php
namespace HebleoAutoplayRelease;
/** Execute only through the authenticated administrator channel. No real preference writes. */
function verify_installed(): array {
    global $wpdb;
    $owner=\get_current_user_id();
    if (!$owner || !\current_user_can('manage_options')) throw new \RuntimeException('Administrator required');
    $others=\get_users(['number'=>1,'exclude'=>[$owner],'fields'=>'ID']);
    if (!$others) throw new \RuntimeException('Second account required for isolation probe');
    $other=(int)$others[0];$table=$wpdb->prefix.'flashcard_deck_settings';
    $engine=$wpdb->get_var($wpdb->prepare('SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=%s',$table));
    if ($engine!=='InnoDB') throw new \RuntimeException('Unexpected settings engine');
    $before=metrics($wpdb);$checks=[];$transaction=false;
    $sequenceBefore=$wpdb->get_var($wpdb->prepare('SELECT AUTO_INCREMENT FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=%s',$table));
    if (!defined('DOING_AJAX')) define('DOING_AJAX',true);
    $die=static fn()=>static function(){throw new \RuntimeException('hebleo-autoplay-json-complete');};
    \add_filter('wp_die_ajax_handler',$die);
    $check=static function($value,$name)use(&$checks){if(!$value)throw new \RuntimeException($name);$checks[]=$name;};
    $request=static function($action,$user,$deck,$values=[],$nonce=true) {
        \wp_set_current_user($user);
        $_POST=array_merge(['nonce'=>$nonce?\wp_create_nonce('study_nonce'):'invalid','deck_id'=>$deck],$values);
        ob_start();
        try {\do_action('wp_ajax_'.$action);}
        catch(\RuntimeException $e){if($e->getMessage()!=='hebleo-autoplay-json-complete'){ob_end_clean();throw $e;}}
        return json_decode(ob_get_clean(),true,512,JSON_THROW_ON_ERROR);
    };
    $save=static function($user,$deck,$value,$include=true,$nonce=true)use($request){$v=['new_cards_per_day'=>17,'max_reviews_per_day'=>83,'card_order'=>'mixed'];if($include)$v['autoplay_audio']=$value;return $request('save_deck_settings',$user,$deck,$v,$nonce);};
    try {
        $deck=2147483001;$otherDeck=2147483002;
        // These nonexistent decks are used only inside this rollback transaction.
        // No existing preference row is changed; InnoDB may consume unused sequence IDs.
        if ((int)$wpdb->get_var("SELECT COUNT(*) FROM `$table` WHERE deck_id IN ($deck,$otherDeck)")!==0) throw new \RuntimeException('Synthetic deck collision');
        if ($wpdb->query('START TRANSACTION')===false) throw new \RuntimeException('Verification transaction unavailable');
        $transaction=true;
        $check((int)$request('get_deck_settings',$owner,$deck)['data']['autoplay_audio']===1,'unchanged default');
        $check($save($other,$deck,1)['success']&&$save($owner,$otherDeck,1)['success'],'independent synthetic fixtures');
        foreach ([0,1,'0','1',false,true,'on',0] as $value) {
            $check($save($owner,$deck,$value)['success']===true,'save accepted '.json_encode($value));
            $data=$request('get_deck_settings',$owner,$deck)['data'];
            $check((int)$data['autoplay_audio']===(in_array($value,[1,'1',true,'on'],true)?1:0),'fresh read '.json_encode($value));
            $check((int)$data['new_cards_per_day']===17&&(int)$data['max_reviews_per_day']===83&&$data['card_order']==='mixed','other submitted values '.json_encode($value));
        }
        $check($save($owner,$deck,null,false)['success']&&(int)$request('get_deck_settings',$owner,$deck)['data']['autoplay_audio']===0,'omitted checkbox compatibility');
        foreach (['',2,-1,'false','garbage',[],null] as $value) {
            $rows=$wpdb->get_results("SELECT * FROM `$table` ORDER BY id",ARRAY_A);
            $check($save($owner,$deck,$value)['success']===false,'invalid rejected '.json_encode($value));
            $check($wpdb->get_results("SELECT * FROM `$table` ORDER BY id",ARRAY_A)===$rows,'invalid no writes '.json_encode($value));
        }
        $check((int)$request('get_deck_settings',$other,$deck)['data']['autoplay_audio']===1,'account isolation');
        $check((int)$request('get_deck_settings',$owner,$otherDeck)['data']['autoplay_audio']===1,'deck isolation');
        $check($save($owner,$deck,1,true,false)['success']===false,'nonce rejection');
        $check($save(0,$deck,1)['success']===false,'anonymous rejection');
    } finally {
        if ($transaction && $wpdb->query('ROLLBACK')===false) throw new \RuntimeException('Verification rollback failed');
        \remove_filter('wp_die_ajax_handler',$die);\wp_set_current_user($owner);
    }
    $after=metrics($wpdb);
    $check($before===$after,'all protected real records and plugin/media files unchanged');
    $files=[];foreach(['templates/card_loader.php','archive-decks.php','new-card-order/order.php','shared-cards/feedback-client.js','shared-cards/frame-host.js']as$rel)$files[$rel]=hash_file('sha256',WP_PLUGIN_DIR.'/wp-learning-cards/'.$rel);
    $sequenceAfter=$wpdb->get_var($wpdb->prepare('SELECT AUTO_INCREMENT FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=%s',$table));
    return ['passed'=>true,'checks'=>count($checks),'check_names'=>$checks,'at'=>gmdate('c'),'files'=>$files,'protected_before'=>$before,'protected_after'=>$after,'real_preferences_touched'=>false,'synthetic_rows_rolled_back'=>true,'settings_sequence_before'=>$sequenceBefore,'settings_sequence_after'=>$sequenceAfter,'method'=>'Installed WordPress AJAX hooks and real MySQL; synthetic nonexistent-deck settings inside an always-rolled-back transaction. Existing rows untouched, all protected row hashes identical. Unused auto-increment IDs may be consumed.'];
}
