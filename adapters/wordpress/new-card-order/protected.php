<?php
namespace HebleoNewCardOrderRelease;
/** Hash inside the site; export no learner records, content, or metadata values. */
function metrics($db): array {
    $hash = static function (string $sql) use ($db): array {
        $ctx=hash_init('sha256');$rows=$db->get_results($sql,ARRAY_A);
        if($db->last_error)throw new \RuntimeException('Protected read failed');
        foreach($rows as $row){$bytes=serialize($row);hash_update($ctx,strlen($bytes).':'.$bytes);}
        return ['count'=>count($rows),'sha256'=>hash_final($ctx)];
    };
    $out=[];
    foreach(['progress','card_decks','deck_settings','deck_rules','sessions','streaks','global_suspensions','import_export_log']as$suffix)$out[$suffix]=$hash('SELECT * FROM '.$db->prefix.'flashcard_'.$suffix.' ORDER BY id');
    $types="'notes','decks','note_types','card_templates','sfwd-courses','sfwd-lessons','sfwd-topic'";
    $out['authored_posts']=$hash("SELECT * FROM {$db->posts} WHERE post_type IN ($types) ORDER BY ID");
    $out['authored_meta']=$hash("SELECT m.* FROM {$db->postmeta} m JOIN {$db->posts} p ON p.ID=m.post_id WHERE p.post_type IN ($types) ORDER BY m.meta_id");
    $out['scheduler_and_burial']=$hash("SELECT * FROM {$db->usermeta} WHERE meta_key LIKE '_hebleo_fsrs_%' OR meta_key LIKE '_hebleo_note_day_v1_%' OR meta_key LIKE '_hebleo_bg_%' ORDER BY umeta_id");
    $out['shared_options']=$hash("SELECT option_name,option_value FROM {$db->options} WHERE option_name LIKE 'hebleo_shared_cards_%' ORDER BY option_name");
    $files=[];$root=WP_PLUGIN_DIR.'/wp-learning-cards';
    foreach(new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($root,\FilesystemIterator::SKIP_DOTS))as$f)if($f->isFile()){
        $rel=substr($f->getPathname(),strlen($root)+1);
        if(in_array($rel,['templates/card_loader.php','new-card-order/order.php','.hebleo-shared-release.lock'],true)||str_ends_with($rel,'.neworder.tmp'))continue;
        $files[$rel]=hash_file('sha256',$f->getPathname());
    }
    ksort($files);$out['other_plugin_files']=['count'=>count($files),'sha256'=>hash('sha256',serialize($files))];
    $media=[];$root=WP_CONTENT_DIR.'/uploads/hebleo-shared-cards/v2.2';
    foreach(new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($root,\FilesystemIterator::SKIP_DOTS))as$f)if($f->isFile())$media[substr($f->getPathname(),strlen($root)+1)]=hash_file('sha256',$f->getPathname());
    ksort($media);$out['media']=['count'=>count($media),'sha256'=>hash('sha256',serialize($media))];
    return $out;
}
