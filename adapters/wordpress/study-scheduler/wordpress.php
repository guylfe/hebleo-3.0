<?php
/** Native WordPress adapter. Read-only preview; only rating persists state. */
namespace HebleoStudy;
require_once __DIR__.'/fsrs.php';
require_once __DIR__.'/../followup/state.php';
require_once __DIR__.'/../background-review/protocol.php';
function clock_now(): int { return (int)\apply_filters('hebleo_study_scheduler_now',time()); }
function meta_key($p): string { return '_hebleo_fsrs_v2_'.(int)$p->id; }
function local_date(int $utc,\DateTimeZone $tz): string { return (new \DateTimeImmutable('@'.$utc))->setTimezone($tz)->format('Y-m-d H:i:s'); }
function parse_local($s,\DateTimeZone $tz): ?int {
    if(!is_string($s)||$s===''||$s==='0000-00-00 00:00:00')return null;
    $d=\DateTimeImmutable::createFromFormat('!Y-m-d H:i:s',$s,$tz);
    return $d&&$d->format('Y-m-d H:i:s')===$s?$d->getTimestamp():null;
}

/** Versioned SQL-queryable JSON, upgraded only by an actual successful rating. */
function valid_sidecar(array $row,array $m): bool {
    if(($m['storage_schema']??null)!==2||($m['version']??null)!==FSRS::VERSION)return false;
    foreach(['last_review_utc','due_utc'] as $key)if(!isset($m[$key])||!is_int($m[$key])||$m[$key]<=0||$m[$key]>253402300799)return false;
    if($m['due_utc']<=$m['last_review_utc'])return false;
    foreach(['last_reviewed'=>'last_review_local','next_review'=>'next_review_local','state'=>'state'] as $col=>$key)if(!is_string($m[$key]??null)||($m[$key]??null)!==($row[$col]??null))return false;
    $state=$row['state']??null;
    if($state==='review'){if(!array_key_exists('step',$m)||$m['step']!==null)return false;}
    elseif($state==='learning'||$state==='relearning'){if(!isset($m['step'])||!is_int($m['step'])||$m['step']<0||$m['step']>($state==='learning'?1:0))return false;}
    else return false;
    foreach(['stability','difficulty'] as $col){
        $shadow=$m['storage_'.$col]??null;
        // Canonical decimal strings permit exact PHP/SQL comparison without float rounding.
        if(!is_string($shadow)||$shadow!==($row[$col]??null))return false;
        $v=$m[$col]??null;if((!is_int($v)&&!is_float($v))||!is_finite((float)$v)||$v<($col==='stability'?.001:1)||$v>($col==='stability'?1e308:10))return false;
    }
    return true;
}
function read_meta($p): array {
    global $wpdb;
    // SQL and PHP select the identical newest row even if duplicate usermeta keys exist.
    $raw=$wpdb->get_var($wpdb->prepare("SELECT meta_value FROM {$wpdb->usermeta} WHERE user_id=%d AND meta_key=%s ORDER BY umeta_id DESC LIMIT 1",(int)$p->user_id,meta_key($p)));
    if($raw!==null){$m=json_decode($raw,true);return is_array($m)&&valid_sidecar((array)$p,$m)?$m:[];}
    $legacy=\get_user_meta((int)$p->user_id,'_hebleo_fsrs_v1_'.(int)$p->id,true);
    return is_array($legacy)?$legacy:[];
}
/** Eligibility and ordering use the same unambiguous UTC key BEFORE LIMIT.
 * Missing/malformed/stale sidecars retain the exact old local-string due predicate.
 * No schema/data migration. UTC projection of legacy strings is only an order key.
 */
function due_sql(string $alias='p'): array {
    global $wpdb;if($alias!=='p')throw new \InvalidArgumentException('Unsupported progress alias');
    $now=clock_now();$offset=(new \DateTimeImmutable('@'.$now))->setTimezone(\wp_timezone())->getOffset();
    $json="CASE WHEN JSON_VALID(hfsrs.meta_value) THEN hfsrs.meta_value ELSE '{}' END";
    $get=static fn($key)=>"JSON_UNQUOTE(JSON_EXTRACT(($json), '$.$key'))";
    $type=static fn($key)=>"JSON_TYPE(JSON_EXTRACT(($json), '$.$key'))";
    $checks=["JSON_VALID(hfsrs.meta_value)",$type('storage_schema')." = 'INTEGER'",$get('storage_schema')." = '2'","BINARY ".$get('version')." = BINARY '".FSRS::VERSION."'"];
    foreach(['due_utc','last_review_utc'] as $key){$checks[]=$type($key)." = 'INTEGER'";$checks[]=$get($key)." BETWEEN 1 AND 253402300799";}
    $checks[]="CAST(".$get('due_utc')." AS SIGNED) > CAST(".$get('last_review_utc')." AS SIGNED)";
    foreach(['last_reviewed'=>'last_review_local','next_review'=>'next_review_local','state'=>'state','stability'=>'storage_stability','difficulty'=>'storage_difficulty'] as $col=>$key){$checks[]=$type($key)." = 'STRING'";$checks[]="BINARY ".$get($key)." = BINARY CAST(p.$col AS CHAR)";}
    foreach(['stability','difficulty'] as $key){$checks[]=$type($key)." IN ('INTEGER','DOUBLE')";$checks[]=$get($key).($key==='stability'?" BETWEEN 0.001 AND 1e308":" BETWEEN 1 AND 10");}
    $checks[]="((p.state='review' AND ".$type('step')." = 'NULL') OR (p.state IN ('learning','relearning') AND ".$type('step')." = 'INTEGER' AND ".$get('step')." BETWEEN 0 AND (CASE WHEN p.state='learning' THEN 1 ELSE 0 END)))";
    $valid='('.implode(' AND ',$checks).')';$utc="CAST(".$get('due_utc')." AS SIGNED)";
    $legacy="(TO_SECONDS(p.next_review)-TO_SECONDS('1970-01-01 00:00:00')-($offset))";
    $epoch="(CASE WHEN $valid THEN $utc ELSE $legacy END)";
    $local=local_date($now,\wp_timezone());
    $where="(CASE WHEN $valid THEN $utc <= $now ELSE p.next_review <= '$local' END)";
    $join="LEFT JOIN {$wpdb->usermeta} hfsrs ON hfsrs.umeta_id = (SELECT MAX(hm.umeta_id) FROM {$wpdb->usermeta} hm WHERE hm.user_id=p.user_id AND hm.meta_key=CONCAT('_hebleo_fsrs_v2_',p.id))";
    $burial=\HebleoFollowup\sql($now);$join.=' '.$burial['join'];$where='('.$where.' AND '.$burial['where'].')';
    return ['join'=>$join,'epoch'=>$epoch,'where'=>$where,'valid'=>$valid,'now'=>$now];
}

/** No writes: lazily map native new/legacy values for the next actual rating.
 * Historic learning rows have no step: restart at step 0 without touching due.
 * Invalid memory/missing or future last review: treat next rating as fresh learning.
 */
function normalize(array $row,array $meta,int $now,\DateTimeZone $tz): array {
    $state=$row['state']??'new';$step=0;$last=parse_local($row['last_reviewed']??null,$tz);
    $meta_valid=(($meta['storage_schema']??null)===2 ? valid_sidecar($row,$meta) : (($meta['version']??null)===FSRS::VERSION&&($meta['last_review_local']??null)===($row['last_reviewed']??null)&&isset($meta['last_review_utc'])&&is_int($meta['last_review_utc'])&&local_date($meta['last_review_utc'],$tz)===($row['last_reviewed']??null)));
    if($meta_valid){$last=$meta['last_review_utc'];$step=$meta['step']??0;}
    $s=$row['stability']??null;$d=$row['difficulty']??null;
    // Exact upstream memory survives decimal(10,4) storage and large stability.
    // Refuse stale metadata after any external native-row memory/state edit.
    if($meta_valid&&($meta['state']??null)===$state&&isset($meta['storage_stability'],$meta['storage_difficulty'],$meta['stability'],$meta['difficulty'])&&is_numeric($s)&&is_numeric($d)&&(float)$s===(float)$meta['storage_stability']&&(float)$d===(float)$meta['storage_difficulty']){
        $s=$meta['stability'];$d=$meta['difficulty'];
    }
    $invalid=!is_numeric($s)||!is_finite((float)$s)||(float)$s<.001||!is_numeric($d)||!is_finite((float)$d)||(float)$d<1||(float)$d>10;
    $fresh=$state==='new'||!in_array($state,['learning','review','relearning'],true)||$invalid||$last===null||$last>$now;
    if($fresh){$state='learning';$s=null;$d=null;$last=null;$step=0;}
    else{$s=(float)$s;$d=(float)$d;if($state==='review')$step=null;elseif(!is_int($step)||$step<0)$step=0;}
    return ['state'=>$state,'step'=>$step,'stability'=>$s,'difficulty'=>$d,'last_review'=>$last];
}
function schedule($p,int $grade,int $now,?array $meta=null): array {
    $meta=$meta??read_meta($p);
    $meta=is_array($meta)?$meta:[];$tz=\wp_timezone();
    $c=normalize((array)$p,$meta,$now,$tz);$result=FSRS::review($c,$grade,$now);
    $result['reps']=max(0,(int)$p->reps)+1;
    $result['lapses']=max(0,(int)$p->lapses)+($p->state==='review'&&$grade===1?1:0);
    $result['scheduled_days']=(int)floor($result['interval_seconds']/86400);
    $result['next_review']=local_date($result['due'],$tz);
    $result['last_reviewed']=local_date($now,$tz);
    return $result;
}
function interval_label(int $seconds): string {
    if($seconds<60)return $seconds.'s';
    if($seconds<3600)return intdiv($seconds,60).'m'.($seconds%60?($seconds%60).'s':'');
    if($seconds<86400)return intdiv($seconds,3600).'h'.($seconds%3600?intdiv($seconds%3600,60).'m':'');
    $days=intdiv($seconds,86400);
    if($days<30)return $days.'d';
    if($days<365)return (int)round($days/30).'mo';
    return (int)round($days/365).'y';
}
function preview($p,int $now): array {
    $labels=[];$details=[];
    foreach(['again','hard','good','easy'] as $i=>$name){$s=schedule($p,$i+1,$now);$labels[$name]=interval_label($s['interval_seconds']);$details[$name]=['interval_seconds'=>$s['interval_seconds'],'due_utc'=>$s['due'],'next_review'=>$s['next_review'],'state'=>$s['state'],'step'=>$s['step']];}
    return ['intervals'=>$labels,'schedule_previews'=>$details,'scheduler_preview_at'=>$now,'scheduler_version'=>FSRS::VERSION];
}
/** Called only after nonce/user/rating checks in original handler.
 * Both native row + per-card metadata commit atomically. InnoDB required.
 */
function persist_rating(int $user_id,int $note_id,int $template_id,int $rating,?callable $clock=null,?array $request=null): array {
    global $wpdb;$table=$wpdb->prefix.'flashcard_progress';$p=null;$note_lock=null;
    if($wpdb->query('START TRANSACTION')===false)throw new \RuntimeException('Cannot begin rating transaction');
    try {
        $p=$wpdb->get_row($wpdb->prepare("SELECT * FROM $table WHERE user_id = %d AND note_id = %d AND template_id = %d FOR UPDATE",$user_id,$note_id,$template_id));
        if(!$p){$early=$request['background']??null;$known=$early?\HebleoBackground\receipt($user_id,$early):null;if($known!==null){if($wpdb->query('COMMIT')===false)throw new \RuntimeException('Cannot confirm previous review');return ['background_receipt'=>$known,'duplicate'=>true];}throw new \RuntimeException('Card not found');}
        $note_lock=\HebleoFollowup\lock($user_id,$note_id);
        // Drop any metadata cached before the row lock (another request may have rated).
        \wp_cache_delete($user_id,'user_meta');
        $meta=read_meta($p);
        // Resolve time only after the real row lock and fresh committed metadata read.
        $now=(int)($clock??(__NAMESPACE__.'\\clock_now'))();
        $note_state=\HebleoFollowup\load($user_id,$note_id);
        $bg=$request['background']??null;$timing=null;
        if($bg!==null){
            $receipt=\HebleoBackground\receipt($user_id,$bg);
            if($receipt!==null){if($wpdb->query('COMMIT')===false)throw new \RuntimeException('Cannot confirm previous review');return ['background_receipt'=>$receipt,'duplicate'=>true];}
            $timing=\HebleoBackground\validate($user_id,$p,$meta,$note_state,$bg);
            if(isset($timing['reject'])){
                $receipt=\HebleoBackground\reject($user_id,$bg,$timing['reject'],$timing['now']);
                if($wpdb->query('COMMIT')===false||\HebleoBackground\receipt($user_id,$bg)===null)throw new \RuntimeException('Rejection commit unconfirmed');
                return ['background_receipt'=>$receipt];
            }
            $now=$timing['answer'];
        }
        $old=\HebleoFollowup\duplicate($note_state,$request,$template_id,$rating);
        if($old!==null){if($wpdb->query('COMMIT')===false)throw new \RuntimeException('Cannot confirm previous review');return $old;}
        if(\HebleoFollowup\buried($note_state,$template_id,$now))throw new \RuntimeException('Sibling is buried until next study day');
        if($request!==null&&!hash_equals(\HebleoFollowup\version($p,$meta),$request['version']))throw new \RuntimeException('Card state changed; reload');
        if(isset($meta['last_review_utc'])&&$meta['last_review_utc']>$now)throw new \RuntimeException('Scheduling clock precedes committed review');
        $s=schedule($p,$rating,$now,$meta);
        $fields=array_intersect_key($s,array_flip(['stability','difficulty','scheduled_days','state','reps','lapses','elapsed_days','last_reviewed','next_review']));
        // The old decimal fields remain compatibility shadows; scheduling reads exact metadata.
        $fields['stability']=round(min(999999.9999,$s['stability']),4);
        $fields['difficulty']=round($s['difficulty'],4);
        if($wpdb->update($table,$fields,['id'=>(int)$p->id,'user_id'=>$user_id])===false)throw new \RuntimeException('Rating update failed');
        $meta=['storage_schema'=>2,'due_utc'=>$s['due'],'next_review_local'=>$s['next_review'],'version'=>FSRS::VERSION,'step'=>$s['step'],'last_review_utc'=>$now,'last_review_local'=>$s['last_reviewed'],'state'=>$s['state'],'stability'=>$s['stability'],'difficulty'=>$s['difficulty'],'storage_stability'=>number_format($fields['stability'],4,'.',''),'storage_difficulty'=>number_format($fields['difficulty'],4,'.','')];
        if($bg!==null)$meta['last_review_ms']=$timing['accepted'];
        $json=\wp_json_encode($meta,JSON_PRESERVE_ZERO_FRACTION|JSON_THROW_ON_ERROR);
        $saved=\update_user_meta($user_id,meta_key($p),\wp_slash($json));
        if($saved===false&&\get_user_meta($user_id,meta_key($p),true)!==$json)throw new \RuntimeException('Learning step update failed');
        $s=\HebleoFollowup\record($user_id,$p,$s,$rating,$now,$request,$note_state);
        if($bg!==null){$day=\HebleoFollowup\load($user_id,$note_id);$day['reviewed_ms']=$timing['accepted'];$dayJson=\wp_json_encode($day,JSON_THROW_ON_ERROR);if(\update_user_meta($user_id,\HebleoFollowup\key($note_id),\wp_slash($dayJson))===false&&\HebleoFollowup\load($user_id,$note_id)!==$day)throw new \RuntimeException('Note time persistence failed');}
        if($bg!==null)$s['background_receipt']=\HebleoBackground\committed($user_id,$p,$s,$bg,$timing['accepted'],$timing['now']);
        if($wpdb->query('COMMIT')===false)throw new \RuntimeException('Rating commit failed');
        // Positive confirmation comes from a fresh committed record, not in-memory work.
        // This also detects a connection/retry that acknowledged an empty replacement transaction.
        $committed=\HebleoFollowup\load($user_id,$note_id);
        if($bg!==null&&\HebleoBackground\receipt($user_id,$bg)===null)throw new \RuntimeException('Background commit unconfirmed');
        if($request!==null){if(\HebleoFollowup\duplicate($committed,$request,$template_id,$rating)===null)throw new \RuntimeException('Review commit is not confirmed');}
        elseif(($committed['reviewed_utc']??null)!==$now||($committed['allowed_template']??null)!==$template_id)throw new \RuntimeException('Review commit is not confirmed');
        return $s;
    } catch(\Throwable $e){$wpdb->query('ROLLBACK');\wp_cache_delete($user_id,'user_meta');throw $e;} finally { \HebleoFollowup\unlock($note_lock); }
}
