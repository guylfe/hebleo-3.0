<?php
// Actual WordPress hooks and SQL, exclusively in a disposable synthetic database.
define('DOING_AJAX', true);
[$script, $fixture, $phase] = $argv;
if ($phase === 'setup') define('WP_INSTALLING', true);
require $fixture.'/wp/wp-load.php';
add_filter('pre_wp_mail', fn()=>true);
if ($phase === 'setup') {
    require_once ABSPATH.'wp-admin/includes/upgrade.php';
    require_once ABSPATH.'wp-admin/includes/plugin.php';
    wp_install('Synthetic autoplay fixture', 'autoplay', 'autoplay@example.invalid', false, '', 'synthetic-only');
    wp_set_current_user(1);
    $result = activate_plugin('wp-learning-cards/wp-learning-cards.php');
    if (is_wp_error($result)) throw new RuntimeException($result->get_error_message());
    maybe_add_autoplay_audio_column();
    wp_create_user('synthetic-second', 'synthetic-only', 'second@example.invalid');
    echo "PASS synthetic WordPress setup\n";
    exit;
}
global $wpdb;
$table = $wpdb->prefix.'flashcard_deck_settings';
$checks = 0;
function check($value, $why) { global $checks; ++$checks; if (!$value) throw new RuntimeException($why); }
function protected_tables() {
    global $wpdb, $table;
    $out=[];
    foreach ($wpdb->get_col('SHOW TABLES') as $t) {
        if (in_array($t, [$table, $wpdb->options], true)) continue;
        $out[$t]=hash('sha256', serialize($wpdb->get_results("SELECT * FROM `$t`", ARRAY_A)));
    }
    return $out;
}
add_filter('wp_die_ajax_handler', fn()=>function(){ throw new RuntimeException('json-complete'); });
function request($action, $owner, $deck, $fields=[], $nonce=true) {
    wp_set_current_user($owner);
    $_POST=array_merge(['nonce'=>$nonce?wp_create_nonce('study_nonce'):'bad', 'deck_id'=>$deck], $fields);
    ob_start();
    try { do_action('wp_ajax_'.$action); }
    catch (RuntimeException $e) { if ($e->getMessage() !== 'json-complete') throw $e; }
    return json_decode(ob_get_clean(), true, 512, JSON_THROW_ON_ERROR);
}
function save($owner, $deck, $value, $include=true, $nonce=true) {
    $fields=['new_cards_per_day'=>17, 'max_reviews_per_day'=>83, 'card_order'=>'mixed'];
    if ($include) $fields['autoplay_audio']=$value;
    return request('save_deck_settings', $owner, $deck, $fields, $nonce);
}
if ($phase === 'request') {
    $p=json_decode(stream_get_contents(STDIN), true, 512, JSON_THROW_ON_ERROR);
    echo json_encode(request($p['action'], $p['owner'], $p['deck'], $p['fields']??[]));
    exit;
}
if ($phase === 'reopen') {
    check((int)request('get_deck_settings',1,8001)['data']['autoplay_audio']===0, 'off persists after full PHP/WordPress reopen');
    check((int)request('get_deck_settings',2,8001)['data']['autoplay_audio']===1, 'other account persists');
    check((int)request('get_deck_settings',1,8002)['data']['autoplay_audio']===1, 'other deck persists');
    check(protected_tables()===json_decode(file_get_contents($fixture.'/protected.json'),true), 'review/progress/content unchanged after reopen');
} else {
    $before=protected_tables();
    check((int)request('get_deck_settings',1,8001)['data']['autoplay_audio']===1, 'existing no-row default remains enabled');
    check(save(2,8001,1)['success'] && save(1,8002,1)['success'], 'independent account/deck setup');
    foreach ([0,1,'0','1',false,true,'on',0] as $value) {
        check(save(1,8001,$value)['success']===true, 'accepted explicit checkbox value');
        $data=request('get_deck_settings',1,8001)['data'];
        check((int)$data['autoplay_audio']===(in_array($value,[1,'1',true,'on'],true)?1:0), 'save/read/reopen value agrees');
        check((int)$data['new_cards_per_day']===17 && (int)$data['max_reviews_per_day']===83 && $data['card_order']==='mixed', 'other submitted settings preserved');
    }
    check(save(1,8001,null,false)['success'] && (int)request('get_deck_settings',1,8001)['data']['autoplay_audio']===0, 'omitted legacy checkbox remains off');
    foreach (['',2,-1,'false','garbage',[],null] as $bad) {
        $rows=$wpdb->get_results("SELECT * FROM $table ORDER BY id",ARRAY_A);
        check(save(1,8001,$bad)['success']===false, 'invalid flag rejected');
        check($wpdb->get_results("SELECT * FROM $table ORDER BY id",ARRAY_A)===$rows, 'invalid flag makes no settings writes');
    }
    check(save(0,8001,1)['success']===false, 'anonymous save rejected');
    check(save(1,8001,1,true,false)['success']===false, 'invalid nonce rejected');
    check(request('get_deck_settings',0,8001)['success']===false, 'anonymous read rejected');
    check(request('get_deck_settings',1,0)['success']===false, 'invalid deck read rejected');
    check((int)request('get_deck_settings',2,8001)['data']['autoplay_audio']===1, 'account isolation');
    check((int)request('get_deck_settings',1,8002)['data']['autoplay_audio']===1, 'deck isolation');
    check(protected_tables()===$before, 'all non-settings application tables unchanged; zero review writes');
    file_put_contents($fixture.'/protected.json',json_encode($before));
}
echo json_encode(['phase'=>$phase,'checks'=>$checks,'passed'=>true,'wordpress'=>$GLOBALS['wp_version'],'database'=>$wpdb->db_version(),'synthetic_only'=>true])."\n";
