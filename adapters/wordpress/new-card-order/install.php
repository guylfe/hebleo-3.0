<?php
namespace HebleoNewCardOrderRelease;
/** Explicit administrator operation only; no route, hook, schema or data writes. */
function install(string $plugin, string $backup, array $manifest, array $bodies): array {
    $plugin=realpath($plugin);$web=realpath(ABSPATH);
    if(!$plugin||!$web||str_starts_with($backup,$web)||file_exists($backup))throw new \RuntimeException('Invalid or reused backup directory');
    $lock=fopen($plugin.'/.hebleo-shared-release.lock','c');
    if(!$lock||!flock($lock,LOCK_EX|LOCK_NB))throw new \RuntimeException('Release lock unavailable');
    $changed=[];
    try {
        if(array_keys($manifest)!==['templates/card_loader.php','new-card-order/order.php'])throw new \RuntimeException('Unexpected release scope');
        foreach($manifest as$rel=>$hash){
            $actual=is_file($plugin.'/'.$rel)?hash_file('sha256',$plugin.'/'.$rel):null;
            if($actual!==$hash['before']||hash('sha256',$bodies[$rel]??'')!==$hash['after'])throw new \RuntimeException('Stale source or invalid payload: '.$rel);
        }
        if(!mkdir($backup,0700))throw new \RuntimeException('Cannot create private backup');
        if(!copy($plugin.'/templates/card_loader.php',$backup.'/card_loader.php'))throw new \RuntimeException('Cannot back up loader');
        chmod($backup.'/card_loader.php',0600);
        if(hash_file('sha256',$backup.'/card_loader.php')!==$manifest['templates/card_loader.php']['before'])throw new \RuntimeException('Backup readback failed');
        $before=metrics($GLOBALS['wpdb']);
        file_put_contents($backup.'/before.json',json_encode($before,JSON_THROW_ON_ERROR),LOCK_EX);chmod($backup.'/before.json',0600);
        file_put_contents($backup.'/manifest.json',json_encode($manifest,JSON_THROW_ON_ERROR),LOCK_EX);chmod($backup.'/manifest.json',0600);
        try {
            foreach(['new-card-order/order.php','templates/card_loader.php']as$rel){
                $dest=$plugin.'/'.$rel;
                if(!is_dir(dirname($dest))&&!mkdir(dirname($dest),0755))throw new \RuntimeException('Cannot create code directory');
                $tmp=$dest.'.neworder.tmp';
                if(file_put_contents($tmp,$bodies[$rel],LOCK_EX)!==strlen($bodies[$rel]))throw new \RuntimeException('Incomplete staging');
                chmod($tmp,0644);
                if(hash_file('sha256',$tmp)!==$manifest[$rel]['after'])throw new \RuntimeException('Stage hash mismatch');
                $current=is_file($dest)?hash_file('sha256',$dest):null;
                if($current!==$manifest[$rel]['before'])throw new \RuntimeException('Source changed during release');
                if(!rename($tmp,$dest))throw new \RuntimeException('Atomic installation failed');
                $changed[]=$rel;
                if(function_exists('opcache_invalidate'))opcache_invalidate($dest,true);
                if(hash_file('sha256',$dest)!==$manifest[$rel]['after'])throw new \RuntimeException('Installed hash mismatch');
            }
            $after=metrics($GLOBALS['wpdb']);
            if($before!==$after)throw new \RuntimeException('Protected state changed during release; code rollback required');
            $receipt=['installed'=>true,'backup'=>$backup,'manifest'=>$manifest,'protected_before'=>$before,'protected_after'=>$after,'preserved'=>true,'data_writes'=>0,'time_utc'=>gmdate('c')];
            file_put_contents($backup.'/installed.json',json_encode($receipt,JSON_THROW_ON_ERROR),LOCK_EX);chmod($backup.'/installed.json',0600);
            return $receipt;
        } catch(\Throwable$e) {
            foreach(array_reverse($changed)as$rel){
                $dest=$plugin.'/'.$rel;
                if(hash_file('sha256',$dest)!==$manifest[$rel]['after'])throw new \RuntimeException('Rollback refused newer external code: '.$rel,0,$e);
                if($manifest[$rel]['before']!==null){$tmp=$dest.'.neworder.tmp';if(!copy($backup.'/card_loader.php',$tmp)||!rename($tmp,$dest))throw new \RuntimeException('Rollback failed',0,$e);}
                // The added helper remains inert after restoring the original loader.
                if(function_exists('opcache_invalidate'))opcache_invalidate($dest,true);
            }
            throw $e;
        }
    } finally {flock($lock,LOCK_UN);fclose($lock);}
}
