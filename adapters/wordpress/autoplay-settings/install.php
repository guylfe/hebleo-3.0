<?php
namespace HebleoAutoplayRelease;
/** Explicit administrator operation. No route, preference migration or review writes. */
function install(string $plugin, string $backup, array $manifest, array $bodies): array {
    $plugin=realpath($plugin); $web=realpath(ABSPATH);
    if (!$plugin || !$web || !is_dir(dirname($backup)) || str_starts_with(realpath(dirname($backup)).'/', $web.'/') || file_exists($backup)) throw new \RuntimeException('Invalid or reused private backup directory');
    if (array_keys($manifest)!==['templates/card_loader.php','archive-decks.php'] || array_keys($bodies)!==array_keys($manifest)) throw new \RuntimeException('Unexpected release scope');
    $lock=fopen($plugin.'/.hebleo-shared-release.lock','c');
    if (!$lock || !flock($lock,LOCK_EX|LOCK_NB)) throw new \RuntimeException('Release lock unavailable');
    $changed=[]; $temporary=[];
    try {
        foreach ($manifest as $rel=>$hash) {
            if (!is_file($plugin.'/'.$rel) || hash_file('sha256',$plugin.'/'.$rel)!==$hash['before'] || hash('sha256',$bodies[$rel])!==$hash['after']) throw new \RuntimeException('Stale source or invalid payload: '.$rel);
            token_get_all($bodies[$rel],TOKEN_PARSE);
        }
        if (!mkdir($backup,0700)) throw new \RuntimeException('Cannot create private backup');
        foreach ($manifest as $rel=>$hash) {
            $dest=$backup.'/'.$rel;
            if (!is_dir(dirname($dest)) && !mkdir(dirname($dest),0700,true)) throw new \RuntimeException('Cannot create backup subdirectory');
            if (!copy($plugin.'/'.$rel,$dest) || !chmod($dest,0600) || hash_file('sha256',$dest)!==$hash['before']) throw new \RuntimeException('Backup readback failed: '.$rel);
        }
        $before=metrics($GLOBALS['wpdb']);
        foreach (['before'=>$before,'manifest'=>$manifest] as $name=>$value) {
            if (file_put_contents($backup.'/'.$name.'.json',json_encode($value,JSON_THROW_ON_ERROR),LOCK_EX)===false) throw new \RuntimeException('Cannot record backup');
            chmod($backup.'/'.$name.'.json',0600);
        }
        try {
            foreach (['archive-decks.php','templates/card_loader.php'] as $rel) {
                $dest=$plugin.'/'.$rel; $tmp=$dest.'.autoplay.tmp'; $temporary[]=$tmp;
                if (file_exists($tmp)) throw new \RuntimeException('Existing staging file');
                if (file_put_contents($tmp,$bodies[$rel],LOCK_EX)!==strlen($bodies[$rel]) || !chmod($tmp,0644) || hash_file('sha256',$tmp)!==$manifest[$rel]['after']) throw new \RuntimeException('Staging failed');
                if (hash_file('sha256',$dest)!==$manifest[$rel]['before']) throw new \RuntimeException('Source changed during release');
                if (!rename($tmp,$dest)) throw new \RuntimeException('Atomic replacement failed');
                $changed[]=$rel;
                if (function_exists('opcache_invalidate')) opcache_invalidate($dest,true);
                if (hash_file('sha256',$dest)!==$manifest[$rel]['after']) throw new \RuntimeException('Destination readback mismatch');
            }
            $after=metrics($GLOBALS['wpdb']);
            if ($before!==$after) throw new \RuntimeException('Protected state changed; rolling back code only');
            $receipt=['installed'=>true,'backup'=>$backup,'manifest'=>$manifest,'protected_before'=>$before,'protected_after'=>$after,'preserved'=>true,'data_writes'=>0,'cache_action'=>'opcache_invalidate for two changed PHP files only','time_utc'=>gmdate('c')];
            file_put_contents($backup.'/installed.json',json_encode($receipt,JSON_THROW_ON_ERROR),LOCK_EX);chmod($backup.'/installed.json',0600);
            return $receipt;
        } catch (\Throwable $error) {
            foreach (array_reverse($changed) as $rel) {
                $dest=$plugin.'/'.$rel;
                if (hash_file('sha256',$dest)!==$manifest[$rel]['after']) throw new \RuntimeException('Rollback refused newer external code',0,$error);
                $tmp=$dest.'.autoplay.tmp';
                if (!copy($backup.'/'.$rel,$tmp) || !chmod($tmp,0644) || !rename($tmp,$dest) || hash_file('sha256',$dest)!==$manifest[$rel]['before']) throw new \RuntimeException('Rollback failed',0,$error);
                if (function_exists('opcache_invalidate')) opcache_invalidate($dest,true);
            }
            throw $error;
        }
    } finally {
        foreach ($temporary as $tmp) if (is_file($tmp) && in_array(hash_file('sha256',$tmp),array_column($manifest,'after'),true)) unlink($tmp);
        flock($lock,LOCK_UN);fclose($lock);
    }
}
