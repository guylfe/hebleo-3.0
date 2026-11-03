<?php
namespace HebleoShared;
/** Server-side release helper. Not a route, not an activation hook; never auto-runs. */
function release_preflight(string $pluginRoot,string $backupRoot):array {
 $root=realpath($pluginRoot);$backup=realpath($backupRoot);demand($root!==false&&$backup!==false,'Missing release/backup directory');
 $web=realpath(ABSPATH);demand(!str_starts_with(strtolower($backup),strtolower($web)),'Backup must be outside web root');
 $expected=['wp-learning-cards.php'=>'073f2f8fb9c930c5dcb1b28f418690d6eab91f47d7637d367de8ebd89fb277f9','templates/card_loader.php'=>'e0d7eb4d6fb25de604cd2a920970d86073177e7f9c26d4e2a9caf97ab32f67ff','includes/cards.php'=>'c984c9c684d9382569f54568cdae237393966c40949a6685472839f1da86aada'];
 foreach($expected as $file=>$hash)demand(hash_equals($hash,hash_file('sha256',$root.'/'.$file)),'Stale plugin source: '.$file);
 global $wpdb;return ['root'=>$root,'backup'=>$backup,'originalHashes'=>$expected,'stateHash'=>digest((new WordPressStore($wpdb))->read()),'progressCount'=>(int)$wpdb->get_var('SELECT COUNT(*) FROM '.$wpdb->prefix.'flashcard_progress')];
}
require_once __DIR__.'/release-recovery.php';
